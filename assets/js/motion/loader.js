// Small classic deferred entry. THREE and per-scene machinery stay behind
// load + idle + preference + foreground + visible/click intent (SYM-MOT-002).
import { motionAllowed, sameOriginOrThrow, logWarn } from "./util.js";
import { ResourceScope } from "./scope.js";

const config = document.currentScript;
const mounts = [...document.querySelectorAll("[data-scene]")];
const admission = new ResourceScope();
const policy = new ResourceScope();
const visible = new Set();
let state = "waiting";
let idle = false;
let loaded = document.readyState === "complete";

function suppress() {
  state = "suppressed";
  document.documentElement.dataset.motionSuppressed = "true";
  admission.close();
  policy.close();
  for (const mount of mounts) delete mount.dataset.sceneActivatable;
  window.SymblixMotion?.suppress();
}

function fail(error) {
  if (state === "suppressed") return;
  state = "error";
  admission.close();
  policy.close();
  for (const mount of mounts) {
    mount.dataset.sceneState = "error";
    delete mount.dataset.sceneActivatable;
  }
  logWarn("page", "runtime-load", error);
}

function wanted() {
  return visible.size > 0 || mounts.some((mount) => mount.dataset.sceneActivated === "true");
}

function loadRuntime() {
  idle = false;
  if (!motionAllowed()) return suppress();
  if (state !== "waiting" || document.hidden || !wanted()) return;
  try {
    const url = sameOriginOrThrow(config.dataset.motionRuntime).href;
    const integrity = config.dataset.motionIntegrity;
    if (!integrity) throw new Error("missing runtime integrity");
    state = "loading";
    const script = document.createElement("script");
    script.type = "module";
    script.src = url;
    script.integrity = integrity;
    script.crossOrigin = "anonymous";
    admission.listen(script, "error", () => fail(new Error("runtime blocked or unavailable")), { once: true });
    admission.listen(script, "load", () => {
      if (state === "suppressed") return;
      state = "live";
      admission.close();
    }, { once: true });
    document.body.appendChild(script);
  } catch (error) { fail(error); }
}

function schedule() {
  if (state !== "waiting" || idle || !loaded || document.hidden || !wanted()) return;
  if (!motionAllowed()) return suppress();
  idle = true;
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(loadRuntime, { timeout: 2000 });
    admission.own(() => cancelIdleCallback(id));
  } else {
    const id = setTimeout(loadRuntime, 1);
    admission.own(() => clearTimeout(id));
  }
}

function boot() {
  if (!motionAllowed() || document.documentElement.dataset.motionSuppressed) return suppress();
  if (!config || !mounts.length || typeof IntersectionObserver !== "function" ||
      typeof ResizeObserver !== "function" || typeof MutationObserver !== "function" ||
      typeof AbortController !== "function") return;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  policy.listen(preference, "change", () => { if (!motionAllowed()) suppress(); });
  admission.listen(document, "visibilitychange", schedule);
  if (!loaded) admission.listen(window, "load", () => { loaded = true; schedule(); }, { once: true });
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.15) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    schedule();
  }, { threshold: [0, 0.15] });
  admission.own(() => io.disconnect());
  for (const mount of mounts) {
    if (mount.dataset.sceneLoad !== "click") { io.observe(mount); continue; }
    const button = mount.querySelector("[data-scene-activate]");
    if (!button) continue;
    admission.listen(button, "click", () => {
      if (state === "suppressed" || state === "error" || !motionAllowed()) return;
      mount.dataset.sceneActivated = "true";
      mount.dataset.sceneState = "loading";
      button.disabled = true;
      schedule();
    });
    mount.dataset.sceneActivatable = "true";
  }
  schedule();
}

boot();
