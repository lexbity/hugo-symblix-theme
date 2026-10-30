// Motion runtime entry (SYM-MOT-001).
//
// Loaded as a deferred module, only on pages containing {{< scene >}}
// mounts (scripts.html keys the emission on the shortcode's Page.Store
// flag). Static import of the vendored three keeps exactly one copy of
// three per site (Q1): scene modules receive it via ctx, they never
// bundle their own. Lives at assets/js/motion.js so the emitted chunk is
// js/motion.min.<hash>.js — the name the motion budget test pins.

import * as THREE from "./vendor/three/three.module.min.js";
import { SCENE_API, setDebug } from "./motion/util.js";
import { destroyHost, hosts, registerAll } from "./motion/runtime.js";

// Site config flag (params.docs.motion.debug), injected at build time via
// esbuild define (§4.11). The typeof guard keeps the module loadable if a
// build path ever omits the define.
setDebug(typeof __MOTION_DEBUG__ !== "undefined" && __MOTION_DEBUG__ === true);

try {
  registerAll(THREE);
} catch (error) {
  console.warn("[symblix-motion] registration failed", error);
}

// Read-only support/debug surface (§4.11). Tests and live debugging use
// this instead of reaching into internals.
window.SymblixMotion = Object.freeze({
  SCENE_API,
  hosts,
  destroyHost,
});
