const browserGlobals = [
  "window", "document", "console", "URL", "Map", "Set", "Object", "Math",
  "Number", "String", "Element", "Array", "Promise", "Error", "TypeError", "JSON",
  "performance", "getComputedStyle", "IntersectionObserver", "ResizeObserver",
  "MutationObserver", "AbortController", "requestAnimationFrame", "cancelAnimationFrame",
  "requestIdleCallback", "cancelIdleCallback", "setTimeout", "clearTimeout",
  "fetch", "AbortSignal", "DOMException",
  "__MOTION_DEBUG__",
];
export default [{
  files: ["assets/js/motion.js", "assets/js/motion/**/*.js", "exampleSite/assets/js/scenes/*.js"],
  ignores: ["assets/js/vendor/**"],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    globals: Object.fromEntries(browserGlobals.map((name) => [name, "readonly"])),
  },
  rules: {
    "no-undef": "error", "no-unused-vars": ["error", { args: "after-used", argsIgnorePattern: "^_" }],
    "no-unreachable": "error", "valid-typeof": "error", "constructor-super": "error",
    "no-dupe-args": "error", "no-constant-condition": "error",
  },
}];
