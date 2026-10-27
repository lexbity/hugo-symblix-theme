// Click-to-load facade for YouTube embeds (SYM-VIS-002).
//
// The shortcode ships static facade markup only — no iframe, no third-party
// request exists on page load. This enhancement swaps the facade for the
// privacy-enhanced nocookie player after the visitor opts in. Without
// JavaScript the facade degrades to an outbound link rendered by <noscript>.

export function initVideo() {
  const facades = document.querySelectorAll("[data-video-facade]");
  if (facades.length === 0) return;

  facades.forEach((facade) => {
    if (facade.dataset.videoBound) return;
    facade.dataset.videoBound = "true";
    facade.addEventListener("click", () => {
      const id = facade.getAttribute("data-video-id");
      const frame = facade.closest(".docs-video__frame");
      if (!id || !frame) return;
      const iframe = document.createElement("iframe");
      iframe.className = "docs-video__embed";
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      iframe.title = facade.getAttribute("data-video-title") || "Video player";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
    });
  });
}
