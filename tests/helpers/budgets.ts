// Budget policy of record (SYM-MOT-001 §4.13 / D1–D2 lineage).
//
// Single source of truth for bundle ceilings. performance.spec.ts enforces
// them; other suites that reference sizes import these numbers instead of
// carrying their own — divergent copies of the policy are what let the CSS
// ceiling silently drift 88 → 92 → 96 → 100 across reworks.

/** Compiled (minified) theme.css target / hard-fail, in bytes. */
export const CSS_BUDGET_MINIFIED_BYTES = 112 * 1024;
export const CSS_BUDGET_HARD_BYTES = 120 * 1024;

/** Core JS bundle (main.min.*) budget, in bytes. */
export const JS_CORE_BUDGET_BYTES = 20 * 1024;

/** Motion runtime chunk (motion.min.*, runtime + vendored three), in bytes. */
export const MOTION_BUDGET_RAW_BYTES = 780 * 1024;
export const MOTION_BUDGET_GZIP_BYTES = 220 * 1024;

/** Small policy bootstrap; downloaded even when reduced motion suppresses WebGL. */
export const MOTION_LOADER_BUDGET_BYTES = 4 * 1024;
