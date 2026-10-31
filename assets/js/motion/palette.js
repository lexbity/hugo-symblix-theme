// Palette bridge (SYM-MOT-001 Q6): the preset system expresses theme changes
// as html[data-preset] / html[data-syntax] attribute writes (theme.js), so
// the runtime reads the seven preset tokens, parses hex into sRGB floats,
// and hands scenes a frozen snapshot. Preset tokens are authored as hex in
// data/docs_presets.yaml; unparseable formats degrade to css-only with null
// floats (scenes must null-check — documented contract).

const TOKENS = {
  accent: "--docs-accent", bg: "--docs-bg", surface: "--docs-surface",
  surface2: "--docs-surface-2", text: "--docs-text", muted: "--docs-muted",
  border: "--docs-border",
};

const HEX3 = /^#([0-9a-f]{3})$/i;
const HEX6 = /^#([0-9a-f]{6})$/i;

/** Parse a CSS color string into { css, r, g, b } with sRGB floats 0..1.
    Non-hex values (or empty strings) keep css and carry null floats. */
export function parseColor(css) {
  const color = { css, r: null, g: null, b: null };
  const hex6 = HEX6.exec(css);
  if (hex6) {
    const int = parseInt(hex6[1], 16);
    color.r = ((int >> 16) & 255) / 255;
    color.g = ((int >> 8) & 255) / 255;
    color.b = (int & 255) / 255;
    return color;
  }
  const hex3 = HEX3.exec(css);
  if (hex3) {
    color.r = parseInt(hex3[1][0] + hex3[1][0], 16) / 255;
    color.g = parseInt(hex3[1][1] + hex3[1][1], 16) / 255;
    color.b = parseInt(hex3[1][2] + hex3[1][2], 16) / 255;
  }
  return color;
}

/** Read the live token set into a frozen PaletteSnapshot. */
export function readPalette() {
  const documentElement = document.documentElement;
  const styles = getComputedStyle(documentElement);
  const snapshot = {
    preset: documentElement.getAttribute("data-preset") || "",
    mode: documentElement.getAttribute("data-syntax") === "dark" ? "dark" : "light",
  };
  for (const [key, token] of Object.entries(TOKENS)) {
    snapshot[key] = parseColor(styles.getPropertyValue(token).trim());
  }
  return freezePalette(snapshot);
}

/** Shallow-freeze every color sub-object so a scene cannot mutate the
    snapshot other scenes (and later re-computations) share. */
export function freezePalette(snapshot) {
  for (const key of Object.keys(snapshot)) {
    const value = snapshot[key];
    if (value && typeof value === "object") Object.freeze(value);
  }
  return Object.freeze(snapshot);
}

// Explicit subscription ownership: the final coordinator unsubscribe releases
// the singleton observer, including on pages whose scenes all failed.
let observer = null;
const subscribers = new Set();
export function observePalette(onChange) {
  subscribers.add(onChange);
  if (!observer && typeof MutationObserver === "function") {
    observer = new MutationObserver(() => {
      for (const subscriber of subscribers) subscriber();
    });
    observer.observe(document.documentElement, {
      attributes: true, attributeFilter: ["data-preset", "data-syntax"],
    });
  }
  return () => {
    subscribers.delete(onChange);
    if (subscribers.size === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}
