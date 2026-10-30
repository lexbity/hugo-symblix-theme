// Scene runtime (SYM-MOT-001 §4.3–4.5): lifecycle state machine, shared RAF
// loop, signals, error isolation.
//
// Contract of record: devdocs/plans/motion-scene-scaffolding-spec-and-plan.md.
// Observability surface: data-scene-state / data-scene-preset /
// data-scene-scroll / data-scene-pointer-active on the mount, plus
// window.SymblixMotion.hosts. A scene misbehaving is a scene problem —
// one strike disposes it, the poster returns, and the page never notices.

import {
  SCENE_API,
  motionAllowed,
  onceBound,
  sameOriginOrThrow,
  logWarn,
  logInfo,
} from "./util.js";
import { observePalette, readPalette } from "./palette.js";

/** mount element → Host, exposed via window.SymblixMotion for tests and
    support debugging. Not a public mutation API. */
export const hosts = new Map();

/** The vendored three namespace, injected by index.js via registerAll. */
let THREE = null;

let loopRunning = false;
let lastTime = 0;

export function registerAll(three) {
  THREE = three;
  document.querySelectorAll("[data-scene]").forEach((mount) => {
    if (!onceBound(mount)) return;
    const host = new Host(mount);
    hosts.set(mount, host);
    host.register();
  });
  observePalette(broadcastPalette);
}

/** Palette bridge (Q6, P3): one recompute per mutation batch, then every
    host with a live instance re-tints and every registered mount mirrors
    the preset for observability — including hosts that never started
    (reduced motion), which keeps the mirror a truthful page-wide signal. */
function broadcastPalette() {
  const snapshot = readPalette();
  hosts.forEach((host) => host.onPalette(snapshot));
}

/** Remove a host entirely (listeners, observers, map entry). See
    Host.destroy — exposed for embedders and the chaos battery. */
export function destroyHost(mount) {
  const host = hosts.get(mount);
  if (host) host.destroy();
}

function scheduleIdle(fn) {
  if (typeof window.requestIdleCallback === "function") {
    // timeout guarantees the callback fires even in throttled/hidden
    // contexts (embedded webviews starve idle callbacks otherwise, leaving
    // scenes stuck between idle and error).
    window.requestIdleCallback(fn, { timeout: 2000 });
  } else {
    setTimeout(fn, 1);
  }
}

export class Host {
  constructor(mount) {
    this.mount = mount;
    this.id = mount.dataset.sceneId || "scene";
    this.load = mount.dataset.sceneLoad || "visible";
    this.state = "idle";
    this.instance = null;
    this.canvas = null;
    this.gl = null;
    this.modulePromise = null;
    this.intersecting = false;
    this.firstFrame = true;
    this.restoreAttempts = 0;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.lastProgress = 0;
    this.palette = null;
    this.signals = {
      scroll: { progress: 0, velocity: 0 },
      pointer: { x: 0, y: 0, active: false },
    };
    this.io = null;
    this.ro = null;
    this.boundListeners = [];
  }

  setState(next) {
    this.state = next;
    this.mount.dataset.sceneState = next;
  }

  src() {
    return this.mount.dataset.sceneSrc || "";
  }

  addListen(target, type, fn, options) {
    target.addEventListener(type, fn, options);
    this.boundListeners.push([target, type, fn]);
  }

  register() {
    this.io = new IntersectionObserver(
      (entries) => {
        this.intersecting = entries.some((entry) => entry.isIntersecting);
        if (this.intersecting) {
          if (this.state === "paused") this.setState("live");
          this.tryStart();
        } else if (this.state === "live") {
          this.setState("paused");
        }
      },
      { threshold: 0.15 },
    );
    this.io.observe(this.mount);

    // Observability mirror (Q6): every registered mount reports the live
    // preset, updated by broadcastPalette on theme changes.
    this.mount.dataset.scenePreset =
      document.documentElement.getAttribute("data-preset") || "";

    this.armPointer();
    this.armActivate();

    if (this.load === "click") {
      // Q3: click defers BOTH fetch and init until the visitor opts in.
      return;
    }
    if (motionAllowed()) {
      this.ensureModule();
    } else {
      logInfo(this.id, "prefers-reduced-motion: staying on the poster");
    }
  }

  /** Pointer signal (P4/Q7): opt-in attribute AND fine pointer. The
      decision is cached at init; a pointer attached mid-session does not
      re-arm. */
  armPointer() {
    this.pointerArmed =
      this.mount.dataset.scenePointer === "on" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: fine)").matches;
    if (!this.pointerArmed) return;
    this.mount.dataset.scenePointerActive = "false";
    this.addListen(
      this.mount,
      "pointermove",
      (event) => {
        const rect = this.mount.getBoundingClientRect();
        this.signals.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.signals.pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        this.signals.pointer.active = true;
        this.mount.dataset.scenePointerActive = "true";
      },
      { passive: true },
    );
    this.addListen(this.mount, "pointerleave", () => {
      this.signals.pointer.active = false;
      this.mount.dataset.scenePointerActive = "false";
    });
  }

  /** Click strategy (P6/Q3): arm the activate button. Fetching starts only
      on press; tryStart's visible-strategy intersection gate does not
      apply (the visitor is looking at the mount by definition). */
  armActivate() {
    if (this.load !== "click") return;
    const button = this.mount.querySelector("[data-scene-activate]");
    if (!button) return;
    this.addListen(button, "click", () => {
      if (this.state !== "idle") return;
      button.disabled = true;
      this.setState("loading");
      this.ensureModule().then(
        () => this.start(),
        () => {
          /* rejection already routed to fail() by ensureModule */
        },
      );
    });
  }

  /** Full teardown (P6): every listener, observer, and the host map entry.
      Not part of the MPA page lifecycle (NG-6) — exposed for embedders and
      for the leak/chaos battery to hold the runtime to. */
  destroy() {
    this.fail(new Error("destroyed"), { silent: true });
    if (this.io) {
      this.io.disconnect();
      this.io = null;
    }
    this.boundListeners.forEach(([target, type, fn, options]) => {
      target.removeEventListener(type, fn, options);
    });
    this.boundListeners = [];
    hosts.delete(this.mount);
  }

  /** Schedule the one-time scene-module fetch after load + idle (FR-13).
      Rejection is surfaced here so an idle, never-started host still lands
      in error state honestly instead of hanging an unhandled rejection. */
  ensureModule() {
    if (this.modulePromise) return this.modulePromise;
    this.modulePromise = new Promise((resolve, reject) => {
      const go = () => {
        import(this.src())
          .then(resolve, reject)
          .catch(reject);
      };
      if (document.readyState === "complete") {
        scheduleIdle(go);
      } else {
        this.addListen(window, "load", () => scheduleIdle(go), { once: true });
      }
    });
    this.modulePromise.catch((error) => {
      if (this.state === "idle" || this.state === "loading") this.fail(error);
    });
    return this.modulePromise;
  }

  /** Init gate (Q3): visible strategy requires intersection; the click
      strategy (P6) calls this directly after arming. */
  tryStart() {
    if (this.state !== "idle" || !this.modulePromise) return;
    if (this.load === "visible" && !this.intersecting) return;
    this.setState("loading");
    this.start();
  }

  async start() {
    let mod;
    try {
      sameOriginOrThrow(this.src());
      mod = await this.modulePromise;
    } catch (error) {
      this.fail(error);
      return;
    }
    if (this.state !== "loading") return; // retired while awaiting the module

    try {
      if (typeof mod.default !== "function") {
        throw new Error("scene module default export is not a function");
      }
      if (mod.default.api !== undefined && mod.default.api !== SCENE_API) {
        throw new Error(`scene api ${mod.default.api} does not match runtime api ${SCENE_API}`);
      }
      this.prepareCanvas();
      const ctx = Object.freeze({
        api: SCENE_API,
        THREE,
        gl: this.gl,
        canvas: this.canvas,
        width: this.width,
        height: this.height,
        dpr: this.dpr,
        mount: this.mount,
        palette: readPalette(),
      });
      this.palette = ctx.palette;
      this.instance = mod.default(ctx);
      if (!this.instance || typeof this.instance.frame !== "function") {
        throw new Error("scene instance shape invalid: frame() is required");
      }
      this.firstFrame = true;
      ensureLoop();
    } catch (error) {
      this.fail(error);
    }
  }

  prepareCanvas() {
    // Re-init (context restore) path: drop the dead canvas first.
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.gl = null;
    }
    const canvas = document.createElement("canvas");
    canvas.className = "docs-scene__canvas";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    if (!gl) throw new Error("webgl2 unavailable");
    this.gl = gl;
    this.canvas = canvas;
    this.mount.appendChild(canvas);
    this.measure();
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(this.mount);
    this.addListen(
      canvas,
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        this.fail(new Error("webglcontextlost"));
      },
    );
    this.addListen(canvas, "webglcontextrestored", () => this.onContextRestored());
  }

  measure() {
    const rect = this.mount.getBoundingClientRect();
    this.width = Math.max(rect.width, 1);
    this.height = Math.max(rect.height, 1);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas) {
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
    }
  }

  /** Guarded scene-callback invocation (Q5): the one-strike rule applies
      uniformly to every author callback (frame, onResize, onPaletteChange)
      — a throw disposes the scene exactly once, here. */
  guard(fn) {
    try {
      fn();
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  onResize() {
    if (this.state !== "live") return;
    this.measure();
    if (this.instance && typeof this.instance.onResize === "function") {
      this.guard(() => this.instance.onResize(this.width, this.height, this.dpr));
    }
  }

  /** Palette broadcast receiver (Q6): refresh the mirror, then hand the new
      frozen snapshot to the scene. A throwing onPaletteChange follows the
      same one-strike rule as frame (Q5) — it is author code in the hot path
      of the page, and a broken re-tint must not retry forever. */
  onPalette(snapshot) {
    this.palette = snapshot;
    this.mount.dataset.scenePreset = snapshot.preset;
    if (this.instance && typeof this.instance.onPaletteChange === "function") {
      this.guard(() => this.instance.onPaletteChange(snapshot));
    }
  }

  onContextRestored() {
    // Exactly one automatic re-init; the only failure that is not the
    // scene's fault (Q5). A second loss is terminal.
    if (this.state === "error" && this.restoreAttempts === 0) {
      this.restoreAttempts = 1;
      this.setState("idle");
      this.tryStart();
    }
  }

  frame(t, dt) {
    this.updateSignals(t, dt);
    const framed = this.guard(() => this.instance.frame(t, dt, this.signals));
    if (framed && this.firstFrame) {
      this.firstFrame = false;
      this.setState("live");
    }
  }

  updateSignals(t, dt) {
    const rect = this.mount.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const progress = Math.min(
      1,
      Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height)),
    );
    // First frame reports zero velocity (Q7): there is no prior sample.
    const velocity = this.firstFrame || dt <= 0 ? 0 : (progress - this.lastProgress) / dt;
    this.signals.scroll.progress = progress;
    this.signals.scroll.velocity = velocity;
    this.lastProgress = progress;
    const next = progress.toFixed(3);
    if (this.mount.dataset.sceneScroll !== next) {
      this.mount.dataset.sceneScroll = next;
    }
  }

  fail(error, { silent = false } = {}) {
    if (this.state === "error") return;
    this.setState("error");
    if (!silent) logWarn(this.id, error && error.message ? error.message : error);
    if (this.instance) {
      try {
        if (typeof this.instance.dispose === "function") this.instance.dispose();
      } catch (disposeError) {
        logWarn(this.id, "dispose threw during error teardown", disposeError);
      }
      this.instance = null;
    }
    if (this.ro) {
      this.ro.disconnect();
      this.ro = null;
    }
  }
}

function ensureLoop() {
  if (loopRunning) return;
  loopRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

function tick(t) {
  // Clamp huge deltas (tab return, breakpoint) so scenes never teleport.
  const dt = Math.min(Math.max((t - lastTime) / 1000, 0), 0.1);
  lastTime = t;
  let anyFramed = false;
  hosts.forEach((host) => {
    // "loading" hosts have a created instance awaiting their first frame —
    // reaching live REQUIRES being framed (state flips after frame()).
    if (host.state === "live" || host.state === "loading") {
      anyFramed = true;
      host.frame(t, dt);
    }
  });
  if (anyFramed && !document.hidden) {
    requestAnimationFrame(tick);
  } else {
    loopRunning = false;
  }
}

/** Whether any host currently needs the loop (live or awaiting first frame).
    tick() keeps its own fused pass (it frames while checking — a host may
    fail mid-frame); this predicate serves the re-arm path only. */
function hasFramableHost() {
  for (const host of hosts.values()) {
    if (host.state === "live" || host.state === "loading") return true;
  }
  return false;
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && hasFramableHost()) ensureLoop();
});
