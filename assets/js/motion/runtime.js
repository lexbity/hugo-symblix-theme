// Page-scoped registry and global observation. Host and Scheduler own their
// distinct lifetimes; see SYM-MOT-002 for the active behavioral contract.
import { Host } from "./host.js";
import { createScheduler } from "./scheduler.js";
import { ResourceScope } from "./scope.js";
import { observePalette, readPalette } from "./palette.js";
import { logWarn, onceBound, motionAllowed } from "./util.js";
import { createDiagnostics } from "./diagnostics.js";

// Read-only facade (SYM-MOT-002 S6). Mutation of hosts/instances/GL is unsupported.
export const hosts = new Map();
const scheduler = createScheduler(() => hosts.values());
let pageScope = null;
const lifecycleRecords = [];
const maxRecords = 64;

export function record(event, host, extra = {}) {
  const debug = typeof document !== "undefined" && document.documentElement && document.documentElement.dataset.motionDebug === "true";
  if (debug && typeof console !== "undefined" && console.info) {
    try { console.info("[symblix-motion]", event, host?.id, extra); } catch {}
  }
  lifecycleRecords.push(Object.freeze({ t: typeof performance !== "undefined" && performance.now ? performance.now() : Date.now(), event, id: host?.id || null, state: host?.state || null, errorCode: host?.errorCode || null, ...extra }));
  if (lifecycleRecords.length > maxRecords) lifecycleRecords.shift();
}

function getRecords() {
  return Object.freeze(lifecycleRecords.slice());
}

export const diagnostics = createDiagnostics(hosts, { getRecords });


function observePage() {
  if (pageScope) return;
  pageScope = new ResourceScope((error) => logWarn("page", "cleanup-error", error));
  pageScope.own(observePalette(() => {
    const snapshot = readPalette();
    for (const host of hosts.values()) host.onPalette(snapshot);
  }));
  pageScope.listen(document, "visibilitychange", () => {
    for (const host of hosts.values()) {
      host.reconcile();
      host.tryStart();
    }
    scheduler.reconcile();
  });
  pageScope.listen(window, "resize", () => {
    for (const host of hosts.values()) host.onResize();
  }, { passive: true });
}

function remove(mount) {
  hosts.delete(mount);
  if (hosts.size === 0 && pageScope) {
    pageScope.close();
    pageScope = null;
    scheduler.stop();
  }
}

export function registerAll(THREE) {
  if (!motionAllowed() || document.documentElement.dataset.motionSuppressed) return;
  for (const mount of document.querySelectorAll("[data-scene]")) {
    if (!onceBound(mount)) continue;
    let host;
    try {
      host = new Host(mount, { THREE, scheduler, remove });
      hosts.set(mount, host);
      observePage();
      record("register", host);
      host.register();
    } catch (error) {
      if (host) host.fail("scene-register", error);
      else {
        mount.dataset.sceneState = "error";
        logWarn(mount.dataset.sceneId, "scene-register", error);
      }
    }
  }
}

export function destroyHost(mount) {
  hosts.get(mount)?.destroy();
}

export function suppressAll() {
  document.documentElement.dataset.motionSuppressed = "true";
  for (const host of [...hosts.values()]) host.destroy();
}
