function detectPlatform() {
  const raw = String(
    (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "",
  ).toLowerCase();
  const ua = navigator.userAgent || "";

  if (raw.includes("mac")) {
    if (navigator.maxTouchPoints > 1) {
      return null;
    }
    return "macos";
  }
  if (raw.includes("win")) {
    return "windows";
  }
  if (raw.includes("linux") || raw.includes("cros")) {
    if (/\b(arm(v7l|v8l|64|hf)?|aarch64|android)\b/i.test(ua)) {
      return null;
    }
    return "linux";
  }
  return null;
}

export function initDownloads() {
  const rows = document.querySelectorAll("[data-downloads] [data-platform]");
  if (rows.length === 0) {
    return;
  }
  const platform = detectPlatform();
  if (!platform) {
    return;
  }
  rows.forEach((row) => {
    if (row.dataset.platform === platform && !row.hasAttribute("data-suggested")) {
      row.setAttribute("data-suggested", "true");
      const badge = document.createElement("span");
      badge.className = "docs-download__suggested";
      badge.textContent = row.dataset.suggestedLabel || "";
      row.prepend(badge);
    }
  });
}