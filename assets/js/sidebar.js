const MOBILE_QUERY = window.matchMedia("(max-width: 72rem)");

function setBodyState(sidebar) {
  document.body.classList.toggle("docs-sidebar-open", sidebar.open && MOBILE_QUERY.matches);
}

function filterSidebar(sidebar, query) {
  const normalized = query.trim().toLowerCase();
  const items = sidebar.querySelectorAll(".docs-nav-item, .docs-sidebar-links-list li");

  items.forEach((item) => {
    if (!normalized) {
      item.hidden = false;
      return;
    }

    const text = item.textContent || "";
    item.hidden = !text.toLowerCase().includes(normalized);
  });
}

function syncSidebar(sidebar) {
  if (MOBILE_QUERY.matches) {
    sidebar.removeAttribute("open");
  } else {
    sidebar.setAttribute("open", "");
  }
  setBodyState(sidebar);
}

export function initSidebar() {
  const sidebar = document.querySelector("[data-sidebar]");
  if (!sidebar) {
    return;
  }

  const search = sidebar.querySelector("[data-sidebar-search]");
  syncSidebar(sidebar);
  if (search) {
    filterSidebar(sidebar, search.value);
  }

  sidebar.addEventListener("toggle", () => {
    setBodyState(sidebar);
  });

  MOBILE_QUERY.addEventListener("change", () => {
    syncSidebar(sidebar);
  });

  if (search) {
    search.addEventListener("input", () => {
      filterSidebar(sidebar, search.value);
    });
  }
}
