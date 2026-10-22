const initHeaderMenu = () => {
  document.querySelectorAll("[data-header-menu]").forEach((menu) => {
    document.addEventListener("click", (event) => {
      if (menu.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    });
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.open) {
        menu.open = false;
        const toggle = menu.querySelector("summary");
        if (toggle) toggle.focus();
      }
    });
  });
};

export function initSiteHeader() {
  try {
    initHeaderMenu();
  } catch (error) {
    console.warn("Header menu bootstrap failed", error);
  }
}
