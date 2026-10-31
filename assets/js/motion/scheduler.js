// One demand-driven RAF per coordinator. Hosts own eligibility and their clock.
export function createScheduler(getHosts, {
  request = (fn) => requestAnimationFrame(fn),
  cancel = (id) => cancelAnimationFrame(id),
} = {}) {
  let pending = null;

  function hasWork() {
    for (const host of getHosts()) if (host.canFrame()) return true;
    return false;
  }
  function wake() {
    if (pending === null && hasWork()) pending = request(tick);
  }
  function reconcile() {
    if (!hasWork() && pending !== null) {
      cancel(pending);
      pending = null;
    }
    wake();
  }
  function tick(now) {
    pending = null;
    // Map/Set iteration tolerates a callback removing its own host.
    for (const host of getHosts()) {
      if (!host.canFrame()) continue;
      const dt = host.lastFrameTime === null ? 0 :
        Math.min(Math.max((now - host.lastFrameTime) / 1000, 0), 0.1);
      host.frame(now, dt);
    }
    wake();
  }
  function stop() {
    if (pending !== null) cancel(pending);
    pending = null;
  }
  return Object.freeze({ wake, reconcile, stop, get pending() { return pending !== null; } });
}
