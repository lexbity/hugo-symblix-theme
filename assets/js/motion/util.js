// Shared helpers for the motion runtime (SYM-MOT-001).

export const TAG = "[symblix-motion]";

/** Scene API version handed to scenes as ctx.api. Scenes may declare
    `createScene.api`; a declared mismatch is a build-side-of-runtime error
    (state=error + warn). Bump only with a documented migration note. */
export const SCENE_API = 1;

/** Motion is allowed unless the visitor prefers reduced motion. Under
    reduced motion the runtime never fetches, never creates a canvas, and
    never attaches listeners — the poster is the contract. */
export function motionAllowed() {
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Idempotency guard (house pattern, cf. video.js): returns true exactly
    once per element per key. */
export function onceBound(el, key = "sceneBound") {
  if (el.dataset[key]) return false;
  el.dataset[key] = "true";
  return true;
}

/** Defense in depth for the zero-external-request contract: the shortcode
    rejects off-origin src at build time; the runtime re-checks before
    import()ing in case an attribute was hand-edited after build. */
export function sameOriginOrThrow(url) {
  let resolved;
  try {
    resolved = new URL(url, window.location.href);
  } catch {
    throw new Error(`invalid scene src: ${JSON.stringify(url)}`);
  }
  if (!/^https?:$/.test(resolved.protocol) || resolved.username || resolved.password ||
      resolved.origin !== window.location.origin) {
    throw new Error(`refusing cross-origin scene src: ${url}`);
  }
  return resolved;
}

export function logWarn(...args) {
  console.warn(TAG, ...args);
}
