// SYM-MOT-002: one mount, one owned lifetime, one current GPU generation.
import { SCENE_API, motionAllowed, sameOriginOrThrow, logWarn } from "./util.js";
import { readPalette } from "./palette.js";
import { ResourceScope } from "./scope.js";

const INTERACTIVE = "a,button,input,select,textarea,summary,[data-scene-interactive]";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class Host {
  constructor(mount, { THREE, scheduler, remove }) {
    this.mount = mount;
    this.id = mount.dataset.sceneId || "scene";
    this.load = mount.dataset.sceneLoad || "visible";
    this.THREE = THREE;
    this.scheduler = scheduler;
    this.remove = remove;
    this.state = "idle";
    this.stage = null;
    this.errorCode = null;
    this.instance = null;
    this.callbacks = null;
    this.instanceReady = false;
    this.canvas = null;
    this.gl = null;
    this.modulePromise = null;
    this.intersecting = false;
    this.initVisible = false;
    this.activated = mount.dataset.sceneActivated === "true";
    this.hasRendered = false;
    this.losses = 0;
    this.generation = 0;
    this.controller = null;
    this.frameCount = 0;
    this.lastFrameTime = null;
    this.lastProgress = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.resizeDirty = true;
    this.paletteDirty = false;
    this.palette = readPalette();
    this.pointerArmed = false;
    this.pointer = { x: 0, y: 0, active: false };
    this.signals = Object.freeze({
      scroll: Object.freeze({ progress: 0, velocity: 0 }),
      pointer: Object.freeze({ ...this.pointer }),
    });
    this.lifetime = this.scope();
    this.canvasScope = null;
    this.gpuScope = null;
  }

  scope() {
    return new ResourceScope((error) => logWarn(this.id, "cleanup-error", error));
  }

  get terminal() { return this.state === "error" || this.state === "disposed"; }

  setState(next, stage = null) {
    this.state = next;
    this.stage = stage;
    this.mount.dataset.sceneState = next;
  }

  register() {
    this.setState("idle");
    this.mount.dataset.scenePreset = this.palette.preset;
    // Admission is rechecked before requests/construction, not just here.
    if (!motionAllowed() || typeof IntersectionObserver !== "function" ||
        typeof ResizeObserver !== "function") return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      this.intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
      this.initVisible = this.intersecting && entry.intersectionRatio >= 0.15;
      this.reconcile();
      this.tryStart();
    }, { threshold: [0, 0.15] });
    this.lifetime.own(() => io.disconnect());
    io.observe(this.mount);
    this.armPointer();
    this.armActivate();
    this.tryStart();
  }

  armPointer() {
    this.pointerArmed = this.mount.dataset.scenePointer === "on" &&
      window.matchMedia("(pointer: fine)").matches;
    if (!this.pointerArmed) return;
    this.mount.dataset.scenePointerActive = "false";
    this.lifetime.listen(this.mount, "pointermove", (event) => {
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) {
        this.clearPointer();
        return;
      }
      const rect = this.mount.getBoundingClientRect();
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY) || !rect.width || !rect.height) return this.clearPointer();
      this.pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      this.pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      this.pointer.active = true;
      this.mount.dataset.scenePointerActive = "true";
    }, { passive: true });
    this.lifetime.listen(this.mount, "pointerleave", () => this.clearPointer(), { passive: true });
    this.lifetime.listen(this.mount, "pointercancel", () => this.clearPointer(), { passive: true });
  }

  clearPointer() {
    this.pointer.active = false;
    if (this.pointerArmed) this.mount.dataset.scenePointerActive = "false";
  }

  armActivate() {
    if (this.load !== "click") return;
    const button = this.mount.querySelector("[data-scene-activate]");
    if (!button) return;
    this.lifetime.listen(button, "click", () => {
      if (this.state !== "idle" || !motionAllowed()) return;
      this.activated = true;
      button.disabled = true;
      this.tryStart();
    });
    this.mount.dataset.sceneActivatable = "true";
  }

  ensureModule() {
    if (this.modulePromise || this.terminal || !motionAllowed()) return this.modulePromise;
    let url;
    try { url = sameOriginOrThrow(this.mount.dataset.sceneSrc || "").href; }
    catch (error) {
      this.fail("scene-url", error);
      return null;
    }
    // The page bootstrap already owns load/idle admission. This exact URL
    // was checked before import, and cannot change across the async boundary.
    this.modulePromise = import(url);
    // Rejection is observed immediately, including retirement during import.
    this.modulePromise.catch((error) => this.fail("scene-import", error));
    return this.modulePromise;
  }

  tryStart() {
    if (this.terminal || this.instance || this.state === "loading" ||
        this.state === "recovering" || document.hidden || !motionAllowed()) return;
    if (this.load === "click" ? !this.activated : !this.initVisible) return;
    const promise = this.ensureModule();
    if (promise && !this.terminal) this.start(promise);
  }

  async start(modulePromise) {
    const generation = ++this.generation;
    this.setState("loading", "module");
    let mod;
    try { mod = await modulePromise; }
    catch (error) { this.fail("scene-import", error); return; }
    if (generation !== this.generation || this.terminal || !motionAllowed()) return;
    // Do not allocate GPU resources for a visible-strategy mount that left
    // the viewport while its module was on the network.
    if (document.hidden || (this.load === "visible" && !this.intersecting)) {
      this.setState("idle");
      return;
    }
    try {
      if (typeof mod.default !== "function") throw new TypeError("default export must be a function");
      if (mod.default.api !== undefined && mod.default.api !== SCENE_API) {
        this.fail("api-mismatch", new Error(`scene API ${mod.default.api} != ${SCENE_API}`));
        return;
      }
      this.setState("loading", "create");
      this.prepareCanvas();
      const authorScope = this.gpuScope;
      const ctx = Object.freeze({
        api: SCENE_API, THREE: this.THREE, gl: this.gl, canvas: this.canvas,
        width: this.width, height: this.height, dpr: this.dpr, mount: this.mount,
        palette: this.palette, signal: this.controller.signal,
        onDispose: (cleanup) => authorScope.own(cleanup),
      });
      const instance = mod.default(ctx);
      if (generation !== this.generation || this.terminal) {
        if (instance && typeof instance.dispose === "function") instance.dispose();
        return;
      }
      this.instance = instance;
      if (!instance || typeof instance.then === "function") {
        throw new TypeError("a synchronous scene instance is required");
      }
      const callbacks = {};
      for (const key of ["frame", "onResize", "onPaletteChange", "dispose"]) {
        const callback = instance[key];
        if ((key === "frame" || callback !== undefined) && typeof callback !== "function") {
          throw new TypeError(`${key} must be a function`);
        }
        callbacks[key] = callback;
      }
      // Capture validated references once. Later author mutation/getters cannot
      // move callback lookup outside the guarded invocation boundary.
      this.callbacks = callbacks;
      this.instanceReady = true;
      this.hasRendered = false;
      this.resizeDirty = true;
      this.paletteDirty = true;
      this.reconcile();
    } catch (error) { this.fail("scene-create", error); }
  }

  prepareCanvas() {
    if (this.canvasScope) this.canvasScope.close();
    this.canvasScope = this.scope();
    this.gpuScope = this.scope();
    this.controller = new AbortController();
    const canvas = document.createElement("canvas");
    canvas.className = "docs-scene__canvas";
    canvas.setAttribute("aria-hidden", "true");
    this.canvas = canvas;
    this.canvasScope.own(() => {
      canvas.remove();
      this.canvas = null;
      this.gl = null;
    });
    const gl = canvas.getContext("webgl2", {
      antialias: true, alpha: true, powerPreference: "low-power",
    });
    if (!gl) {
      this.fail("webgl-unavailable", new Error("WebGL2 unavailable"));
      throw new Error("WebGL2 unavailable");
    }
    this.gl = gl;
    // Remove context handlers before voluntarily retiring the context.
    this.canvasScope.own(() => {
      if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
    });
    this.canvasScope.listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      if (this.terminal) return;
      this.losses++;
      if (this.losses > 1) {
        this.fail("context-loss-exhausted", new Error("second WebGL context loss"));
        return;
      }
      this.setState("recovering");
      this.releaseInstance();
      this.scheduler.reconcile();
    });
    this.canvasScope.listen(canvas, "webglcontextrestored", () => {
      if (this.state !== "recovering" || this.losses !== 1) return;
      this.setState("idle");
      this.tryStart();
    });
    this.mount.appendChild(canvas);
    this.measure();
    const ro = new ResizeObserver(() => this.onResize());
    this.gpuScope.own(() => ro.disconnect());
    ro.observe(this.mount);
  }

  canFrame() {
    return !!this.instance && this.instanceReady && !this.terminal &&
      this.state !== "recovering" && this.intersecting && !document.hidden &&
      document.documentElement.dataset.motionSuppressed !== "true";
  }

  reconcile() {
    if (this.terminal || this.state === "recovering" || !this.instanceReady) return;
    if (!this.canFrame()) {
      this.setState("paused");
      this.lastFrameTime = null;
      this.lastProgress = null;
    } else {
      this.flushChanges();
      if (!this.terminal) this.setState(this.hasRendered ? "live" : "loading", this.hasRendered ? null : "first-frame");
    }
    this.scheduler.reconcile();
  }

  measure() {
    const rect = this.mount.getBoundingClientRect();
    this.width = Math.max(this.mount.clientWidth || rect.width, 1);
    this.height = Math.max(this.mount.clientHeight || rect.height, 1);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.width * this.dpr), h = Math.round(this.height * this.dpr);
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  onResize() {
    this.resizeDirty = true;
    if (this.canFrame()) this.flushChanges();
  }

  onPalette(snapshot) {
    this.palette = snapshot;
    this.mount.dataset.scenePreset = snapshot.preset;
    this.paletteDirty = true;
    if (this.canFrame()) this.flushChanges();
  }

  flushChanges() {
    if (this.resizeDirty) {
      this.resizeDirty = false;
      this.measure();
      if (this.callbacks.onResize && !this.guard("scene-resize", () =>
        this.callbacks.onResize.call(this.instance, this.width, this.height, this.dpr))) return;
      if (this.terminal || !this.instance) return;
    }
    if (this.paletteDirty) {
      this.paletteDirty = false;
      if (this.callbacks.onPaletteChange) this.guard("scene-palette", () =>
        this.callbacks.onPaletteChange.call(this.instance, this.palette));
    }
  }

  frame(t, dt) {
    this.flushChanges();
    if (!this.canFrame()) return;
    const rect = this.mount.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const progress = clamp((vh - rect.top) / Math.max(vh + rect.height, 1), 0, 1);
    const velocity = this.lastProgress === null || dt <= 0 ? 0 : (progress - this.lastProgress) / dt;
    this.signals = Object.freeze({
      scroll: Object.freeze({ progress, velocity }),
      pointer: Object.freeze({ ...this.pointer }),
    });
    const previous = Number(this.mount.dataset.sceneScroll || 0);
    if (Math.abs(progress - previous) > 0.001) this.mount.dataset.sceneScroll = progress.toFixed(3);
    const generation = this.generation;
    if (!this.guard("scene-frame", () => this.callbacks.frame.call(this.instance, t, dt, this.signals)) ||
        this.terminal || generation !== this.generation) return;
    this.frameCount++;
    this.lastFrameTime = t;
    this.lastProgress = progress;
    this.hasRendered = true;
    this.setState("live");
  }

  guard(code, fn) {
    try { fn(); return true; }
    catch (error) { this.fail(code, error); return false; }
  }

  releaseInstance() {
    this.generation++;
    this.instanceReady = false;
    this.lastFrameTime = null;
    this.lastProgress = null;
    if (this.controller) this.controller.abort();
    this.controller = null;
    const instance = this.instance;
    const callbacks = this.callbacks;
    this.instance = null;
    this.callbacks = null;
    if (instance) {
      try {
        // Invalid factory results may throw even while reading dispose.
        const dispose = callbacks ? callbacks.dispose : instance.dispose;
        if (typeof dispose === "function") dispose.call(instance);
      } catch (error) { logWarn(this.id, "scene-dispose", error); }
    }
    if (this.gpuScope) this.gpuScope.close();
    this.gpuScope = null;
  }

  fail(code, error) {
    if (this.terminal) return;
    this.errorCode = code;
    this.setState("error");
    logWarn(this.id, code, error);
    this.releaseInstance();
    this.lifetime.close();
    if (this.canvasScope) this.canvasScope.close();
    this.clearPointer();
    this.scheduler.reconcile();
  }

  destroy() {
    if (this.state === "disposed") return;
    this.setState("disposed");
    this.releaseInstance();
    this.lifetime.close();
    if (this.canvasScope) this.canvasScope.close();
    this.clearPointer();
    delete this.mount.dataset.sceneBound;
    this.remove(this.mount);
    this.scheduler.reconcile();
  }
}
