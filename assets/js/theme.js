/* Symblix Theme Runtime (SYM-VIS-001 Phase 5)
 *
 * Manages color preset switching via the data-preset attribute on <html>.
 * Syncs data-syntax attribute for syntax highlighting based on preset mode.
 * Persists selection to localStorage with migration from legacy docs-theme key.
 *
 * Backward compatible: window.SymblixTheme.set("dark") maps to preset IDs.
 */

const PRESET_STORAGE_KEY = "docs-preset";
const LEGACY_THEME_STORAGE_KEY = "docs-theme";

/* Map legacy theme values to preset IDs (D-03 backward compatibility) */
const LEGACY_THEME_MAP = {
  light: "symblix-light",
  dark: "symblix-dark",
  system: "symblix-light", /* No auto-detection; default to light */
};

/* Fallback mode detection from preset ID (used when DOM doesn't have mode info) */
function guessModeFromId(presetId) {
  return presetId.indexOf("dark") !== -1 ? "dark" : "light";
}

/* Get available presets from the DOM (rendered by preset-switcher partials).
 * Returns a Map of presetId → { mode, label }.
 * If no switchers are present (e.g., no-JS or Phase 5 before Phase 6),
 * returns an empty Map and we fall back to HTML attributes. */
function getAvailablePresets() {
  const presets = new Map();
  document.querySelectorAll("[data-preset-switcher]").forEach((switcher) => {
    switcher.querySelectorAll("[data-preset-id]").forEach((el) => {
      const id = el.getAttribute("data-preset-id");
      if (id && !presets.has(id)) {
        presets.set(id, {
          mode: el.getAttribute("data-preset-mode") || guessModeFromId(id),
          label: el.getAttribute("data-preset-label") || id,
        });
      }
    });
  });
  return presets;
}

/* Get the mode for a preset ID, from DOM or fallback guess */
function getPresetMode(presetId) {
  const available = getAvailablePresets();
  if (available.has(presetId)) {
    return available.get(presetId).mode;
  }
  return guessModeFromId(presetId);
}

/* Get stored preset from localStorage, with legacy migration.
   Returns null when the visitor has made no explicit choice. */
function getStoredPreset() {
  try {
    /* Try new key first */
    const preset = window.localStorage.getItem(PRESET_STORAGE_KEY);
    if (preset) {
      return preset;
    }

    /* Migrate from legacy key */
    const legacyTheme = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacyTheme && LEGACY_THEME_MAP[legacyTheme]) {
      const preset = LEGACY_THEME_MAP[legacyTheme];
      try {
        window.localStorage.setItem(PRESET_STORAGE_KEY, preset);
      } catch (e) {
        /* Ignore write errors */
      }
      return preset;
    }
  } catch (error) {
    /* localStorage unavailable (private mode, quota, etc.) */
  }

  return null;
}

/* Fallback list of default preset IDs for validation when DOM has no switcher info.
 * This matches the 7 default presets in data/docs_presets.yaml. */
const DEFAULT_PRESET_IDS = new Set([
  "symblix-light",
  "symblix-dark",
  "ocean-dark",
  "forest-light",
  "sunset-dark",
  "solarized-light",
  "high-contrast",
]);

/* Validate preset is available (if switchers exist) or is a known default */
function isPresetAvailable(presetId) {
  const available = getAvailablePresets();
  /* If switchers exist in DOM, validate against them */
  if (available.size > 0) {
    return available.has(presetId);
  }
  /* No switchers in DOM: validate against default preset list */
  return DEFAULT_PRESET_IDS.has(presetId);
}

/* Set the active preset: updates DOM attributes, localStorage, and switchers */
function setPreset(presetId) {
  if (!presetId || typeof presetId !== "string") {
    return false;
  }

  /* Validate against available presets (if switchers exist) */
  if (!isPresetAvailable(presetId)) {
    return false;
  }

  /* Set preset attribute. An explicit choice disables the CSS
     prefers-color-scheme fallback (see presets.css). */
  document.documentElement.setAttribute("data-preset", presetId);
  document.documentElement.setAttribute("data-preset-source", "user");

  /* Sync syntax attribute based on preset mode */
  const mode = getPresetMode(presetId);
  document.documentElement.setAttribute("data-syntax", mode);

  /* Persist to localStorage */
  try {
    window.localStorage.setItem(PRESET_STORAGE_KEY, presetId);
  } catch (error) {
    /* Ignore write errors */
  }

  /* Update all switcher instances */
  document.querySelectorAll("[data-preset-switcher]").forEach((switcher) => {
    updateSwitcher(switcher, presetId);
  });

  return true;
}

/* Update a single switcher instance to reflect the active preset */
function updateSwitcher(switcher, activePreset) {
  /* Update preset option elements (buttons, links, radio inputs) */
  switcher.querySelectorAll("[data-preset-id]").forEach((el) => {
    const isActive = el.getAttribute("data-preset-id") === activePreset;

    /* Handle different element types */
    if (el.tagName === "INPUT") {
      el.checked = isActive;
    }

    /* ARIA current state */
    if (isActive) {
      el.setAttribute("aria-current", "true");
    } else {
      el.removeAttribute("aria-current");
    }
  });

  /* Update summary/current label if present. Scoped to [data-preset-current]
     so option buttons (which carry data-preset-label) can never be matched. */
  const currentLabel = switcher.querySelector("[data-preset-current]");
  const activeEl = switcher.querySelector(
    '[data-preset-id="' + activePreset + '"]'
  );
  if (currentLabel && activeEl) {
    currentLabel.textContent =
      activeEl.getAttribute("data-preset-label") || activePreset;
  }

  /* Keep a summary swatch (header switcher) in sync with the active option */
  const swatchBg = switcher.querySelector("[data-preset-swatch-bg]");
  const swatchAccent = switcher.querySelector("[data-preset-swatch-accent]");
  if (swatchBg && swatchAccent && activeEl) {
    const optionBg = activeEl.querySelector(
      ".docs-preset-swatch__bg"
    );
    const optionAccent = activeEl.querySelector(
      ".docs-preset-swatch__accent"
    );
    if (optionBg) {
      swatchBg.style.backgroundColor = optionBg.style.backgroundColor;
    }
    if (optionAccent) {
      swatchAccent.style.backgroundColor = optionAccent.style.backgroundColor;
    }
  }
}

/* Initialize a single switcher with click/keyboard handlers */
function initSwitcher(switcher) {
  /* Handle click on preset options (buttons, links) */
  switcher.querySelectorAll("[data-preset-id]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      const presetId = el.getAttribute("data-preset-id");
      if (presetId) {
        setPreset(presetId);
      }
    });
  });

  /* Handle radio button changes (no-JS fallback form) */
  const radios = switcher.querySelectorAll('input[type="radio"][name^="preset"]');
  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      const presetId = radio.value;
      if (presetId) {
        setPreset(presetId);
      }
    });
  });
}

/* Initialize the theme system */
export function initTheme() {
  const storedPreset = getStoredPreset();

  if (storedPreset && setPreset(storedPreset)) {
    /* Explicit (or migrated) choice applied above. */
  } else {
    /* No explicit choice: leave the server-rendered default preset in place
       so the CSS prefers-color-scheme fallback (presets.css) can adjust it
       for visitors who have not picked a preset. Sync switcher UI only. */
    const current =
      document.documentElement.getAttribute("data-preset") || "symblix-light";
    document.querySelectorAll("[data-preset-switcher]").forEach((switcher) => {
      updateSwitcher(switcher, current);
    });
  }

  /* Initialize all switchers */
  document.querySelectorAll("[data-preset-switcher]").forEach(initSwitcher);

  /* Expose backward-compatible API */
  window.SymblixTheme = {
    /* Legacy API: set("dark") maps to preset ID */
    set(themeOrPreset) {
      const preset = LEGACY_THEME_MAP[themeOrPreset] || themeOrPreset;
      return setPreset(preset);
    },
    /* Legacy API: get() returns preset ID */
    get() {
      return document.documentElement.getAttribute("data-preset") || "symblix-light";
    },
    /* New API: explicit preset methods */
    setPreset: setPreset,
    getPreset() {
      return document.documentElement.getAttribute("data-preset");
    },
    getSyntax() {
      return document.documentElement.getAttribute("data-syntax");
    },
    /* List available presets */
    getAvailable() {
      return Array.from(getAvailablePresets().keys());
    },
  };
}
