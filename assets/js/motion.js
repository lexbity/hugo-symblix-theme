// Motion runtime entry (SYM-MOT-001).
//
// Admitted by the small policy bootstrap, only on pages containing {{< scene >}}
// mounts (scripts.html keys the emission on the shortcode's Page.Store
// flag). Static import of the vendored three keeps exactly one copy of
// three per site (Q1): scene modules receive it via ctx, they never
// bundle their own. Lives at assets/js/motion.js so the emitted chunk is
// js/motion.min.<hash>.js — the name the motion budget test pins.

import * as THREE from "./vendor/three/three.module.min.js";
import { SCENE_API } from "./motion/util.js";
import { destroyHost, hosts, registerAll, suppressAll } from "./motion/runtime.js";

export function register() { registerAll(THREE); }

try {
  register();
} catch (error) {
  console.warn("[symblix-motion] registration failed", error);
}

// Diagnostics facade (SYM-MOT-002 S6). Mutation is unsupported.
import { diagnostics } from "./motion/runtime.js";

window.SymblixMotion = Object.freeze({
  SCENE_API,
  register,
  hosts,
  diagnostics,
  destroyHost,
  suppress: suppressAll,
});
