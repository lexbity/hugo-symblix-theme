import { initTheme } from "./theme.js";
import { initSidebar } from "./sidebar.js";
import { initTabs } from "./tabs.js";
import { initCopyCode } from "./copy-code.js";
import { initSearchPage } from "./search/index.js";

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

try {
  initCopyCode();
} catch (error) {
  console.warn("Copy-code bootstrap failed", error);
}

try {
  initSearchPage();
} catch (error) {
  console.warn("Search bootstrap failed", error);
}
