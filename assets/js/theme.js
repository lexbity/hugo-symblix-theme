const STORAGE_KEY = "docs-theme";
const THEMES = new Set(["light", "dark", "system"]);

function getStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.has(value) ? value : "system";
  } catch (error) {
    return "system";
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {}
}

function updateSwitcher(root, activeTheme) {
  const select = root.querySelector("[data-theme-select]");
  if (select && select.value !== activeTheme) {
    select.value = activeTheme;
  }
}

function applyTheme(theme) {
  if (!THEMES.has(theme)) {
    return false;
  }

  setTheme(theme);

  document.querySelectorAll("[data-theme-switcher]").forEach((switcherRoot) => {
    updateSwitcher(switcherRoot, theme);
  });

  return true;
}

export function initTheme() {
  const currentTheme = getStoredTheme();
  setTheme(currentTheme);

  document.querySelectorAll("[data-theme-switcher]").forEach((root) => {
    updateSwitcher(root, currentTheme);

    const select = root.querySelector("[data-theme-select]");
    if (select) {
      select.addEventListener("change", () => {
        const choice = select.value;
        if (!choice || !THEMES.has(choice)) {
          return;
        }
        applyTheme(choice);
      });
    }
  });

  window.DocworkbenchTheme = {
    set(theme) {
      if (!THEMES.has(theme)) {
        return false;
      }

      return applyTheme(theme);
    },
    get: getStoredTheme,
  };
}
