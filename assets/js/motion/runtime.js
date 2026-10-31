// Page-scoped registry and global observation. Host and Scheduler own their
// distinct lifetimes; see SYM-MOT-002 for the active behavioral contract.
import { Host } from "./host.js";
import { createScheduler } from "./scheduler.js";
import { ResourceScope } from "./scope.js";
import { observePalette, readPalette } from "./palette.js";
import { logWarn, onceBound, motionAllowed } from "./util.js";

// Compatibility read surface. S6 replaces raw hosts with a read-only facade.
export const hosts = new Map();
const scheduler = createScheduler(() => hosts.values());
let pageScope = null;

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
