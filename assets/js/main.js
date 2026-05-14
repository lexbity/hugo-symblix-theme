import { initTheme } from "./theme.js";
import { initSidebar } from "./sidebar.js";
import { initTabs } from "./tabs.js";

try {
  initTheme();
} catch (error) {
  console.warn("Theme bootstrap failed", error);
}

try {
  initSidebar();
} catch (error) {
  console.warn("Sidebar bootstrap failed", error);
}

try {
  initTabs();
} catch (error) {
  console.warn("Tabs bootstrap failed", error);
}
