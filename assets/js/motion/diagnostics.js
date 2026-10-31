// Read-only diagnostics facade (SYM-MOT-002 S6, Q13). No mutation of hosts/instances/GL.

function freezeSignals(signals) {
  if (!signals) return null;
  return Object.freeze({
    scroll: Object.freeze({ progress: signals.scroll?.progress ?? 0, velocity: signals.scroll?.velocity ?? 0 }),
    pointer: Object.freeze({ x: signals.pointer?.x ?? 0, y: signals.pointer?.y ?? 0, active: !!signals.pointer?.active }),
  });
}

function freezePalette(palette) {
  if (!palette) return null;
  const freezeColor = (c) => c ? Object.freeze({ css: c.css, r: c.r ?? null, g: c.g ?? null, b: c.b ?? null }) : null;
  return Object.freeze({
    preset: palette.preset,
    mode: palette.mode,
    accent: freezeColor(palette.accent),
    bg: freezeColor(palette.bg),
    surface: freezeColor(palette.surface),
    surface2: freezeColor(palette.surface2),
    text: freezeColor(palette.text),
    muted: freezeColor(palette.muted),
    border: freezeColor(palette.border),
  });
}

function snapshotHost(host) {
  return Object.freeze({
    id: host.id,
    state: host.state,
    stage: host.stage,
    errorCode: host.errorCode ?? null,
    frameCount: host.frameCount ?? 0,
    pointerArmed: !!host.pointerArmed,
    dimensions: Object.freeze({ width: host.width ?? 0, height: host.height ?? 0, dpr: host.dpr ?? 1 }),
    palette: freezePalette(host.palette),
    signals: freezeSignals(host.signals),
    recoveryCount: host.losses ?? 0,
    timings: Object.freeze({ ...(host.timings || {}) }),
  });
}

export function createDiagnostics(hostMap, { getRecords } = {}) {
  const facade = {
    get size() {
      return hostMap.size;
    },
    get(idOrMount) {
      if (typeof idOrMount === "string") {
        for (const host of hostMap.values()) {
          if (host.id === idOrMount) return snapshotHost(host);
        }
        return undefined;
      }
      const host = hostMap.get(idOrMount);
      return host ? snapshotHost(host) : undefined;
    },
    *values() {
      for (const host of hostMap.values()) {
        yield snapshotHost(host);
      }
    },
    *entries() {
      for (const [mount, host] of hostMap.entries()) {
        yield [mount, snapshotHost(host)];
      }
    },
    [Symbol.iterator]() {
      return this.entries();
    },
    records() {
      return getRecords ? getRecords() : [];
    },
  };
  return Object.freeze(facade);
}
