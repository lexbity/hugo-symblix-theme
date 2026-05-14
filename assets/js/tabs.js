function initChoiceGroup(group) {
  const panels = Array.from(group.querySelectorAll("[data-choice-panel]"));
  if (panels.length === 0) {
    return;
  }

  const switcher = document.createElement("div");
  switcher.className = "docs-choice-switcher";
  switcher.setAttribute("role", "tablist");

  const selectPanel = (index) => {
    panels.forEach((panel, panelIndex) => {
      const isActive = panelIndex === index;
      panel.hidden = !isActive;
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      panel.setAttribute("tabindex", isActive ? "0" : "-1");
      const button = switcher.querySelectorAll("[role='tab']")[panelIndex];
      if (button) {
        button.setAttribute("aria-selected", isActive ? "true" : "false");
        button.tabIndex = isActive ? 0 : -1;
      }
    });
  };

  panels.forEach((panel, index) => {
    const title = panel.dataset.choiceTitle || `Panel ${index + 1}`;
    const id = panel.dataset.choiceId || `${group.dataset.choiceGroup || "choice"}-${index + 1}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "docs-choice-switcher__button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", id);
    button.setAttribute("aria-selected", "false");
    button.id = `${id}-tab`;
    button.textContent = title;
    button.addEventListener("click", () => selectPanel(index));
    button.addEventListener("keydown", (event) => {
      const buttons = Array.from(switcher.querySelectorAll("[role='tab']"));
      const currentIndex = buttons.indexOf(button);
      if (currentIndex < 0) {
        return;
      }

      let nextIndex = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % buttons.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = buttons.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        buttons[nextIndex].focus();
        selectPanel(nextIndex);
      }
    });
    switcher.appendChild(button);

    panel.id = id;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", button.id);
  });

  group.prepend(switcher);
  selectPanel(0);
}

export function initTabs() {
  document.querySelectorAll('[data-choice-group="tabs"], [data-choice-group="methods"]').forEach((group) => {
    initChoiceGroup(group);
  });
}
