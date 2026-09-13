const HIDE_DELAY_MS = 2000;

export function initCopyCode() {
  document.querySelectorAll("[data-codeblock]").forEach((block) => {
    if (block.querySelector(".docs-copy-button")) {
      return;
    }

    const code = block.querySelector("pre code") || block.querySelector("code");
    if (!code) {
      return;
    }

    const defaultLabel = block.dataset.copyLabel || "Copy code";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "docs-copy-button";
    button.textContent = defaultLabel;

    let resetTimer = null;
    button.addEventListener("click", async () => {
      let copied = false;
      try {
        await navigator.clipboard.writeText(code.innerText);
        copied = true;
      } catch (error) {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(code);
          selection.removeAllRanges();
          selection.addRange(range);
          try {
            copied = document.execCommand("copy");
          } catch (fallbackError) {}
          selection.removeAllRanges();
        }
      }

      if (copied) {
        button.textContent = block.dataset.copiedLabel || "Copied";
        button.dataset.copied = "true";
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          button.textContent = defaultLabel;
          button.dataset.copied = "false";
        }, HIDE_DELAY_MS);
      } else {
        button.textContent = block.dataset.copyFailedLabel || "Copy failed";
        button.dataset.copied = "false";
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          button.textContent = defaultLabel;
        }, HIDE_DELAY_MS);
      }
    });

    block.appendChild(button);
  });
}
