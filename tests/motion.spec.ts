// Motion system contract (Phase 0 + Tier 1, CSS-only):
// - prefers-reduced-motion: reduce collapses every animation/transition to
//   its final state; scroll-driven choreography is not applied at all.
// - Front-page choreography (hero entrance, scroll reveals) is CSS-only —
//   it runs with JavaScript disabled.
// - The hero glow variants (pixel, aurora, scanline, pulse, beam, ripple,
//   ripplebounce, synth) are decorative pseudo-elements animated with
//   transform/opacity only.
// - Print output freezes motion entirely.
// - Glyph stroke-draw rides on pathLength="100" normalization.
import { expect, test } from "@playwright/test";

const MOTION_PAGE = "/en/docs/latest/components/motion/";

test.describe("motion: reduced-motion contract", () => {
  test("guard collapses transitions and skips choreography", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/");

    const button = page.locator(".docs-hero .docs-button").first();
    await expect(button).toBeVisible();
    const styles = await button.evaluate((el) => {
      const s = getComputedStyle(el);
      return { transitionDuration: s.transitionDuration, animationName: s.animationName };
    });
    // Guard forces near-zero durations (0.01ms); the default button
    // transition is 120ms.
    expect(parseFloat(styles.transitionDuration)).toBeLessThanOrEqual(0.02);

    // Entrance choreography lives behind prefers-reduced-motion:
    // no-preference, so under reduce it is not applied at all.
    const heroChild = page.locator(".docs-hero > *").first();
    expect(await heroChild.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

    const tile = page.locator(".docs-home .docs-feature").first();
    expect(await tile.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });

  test("pixel glow shimmer does not run under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(MOTION_PAGE);

    const glow = page.locator(".docs-hero--pixel").first();
    await expect(glow).toBeVisible();
    const before = await glow.evaluate((el) => {
      const s = getComputedStyle(el, "::before");
      return { animationName: s.animationName, maskImage: s.maskImage };
    });
    expect(before.animationName).toBe("none");
    // The static dither layer itself still renders — only the shimmer stops.
    expect(before.maskImage).toContain("repeating-conic-gradient");
  });
});

test.describe("motion: front-page choreography", () => {
  test("hero entrance and scroll reveals apply when motion is allowed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en/");

    const heroChild = page.locator(".docs-hero > *").first();
    expect(await heroChild.evaluate((el) => getComputedStyle(el).animationName)).toContain(
      "docs-rise",
    );

    const tile = page.locator(".docs-home .docs-feature").first();
    const tileStyle = await tile.evaluate((el) => {
      const s = getComputedStyle(el);
      return { name: s.animationName, timeline: s.animationTimeline };
    });
    expect(tileStyle.name).toContain("docs-rise");
    // Below-fold reveals are scrubbed by scroll position, not time.
    expect(tileStyle.timeline).toContain("view()");
  });

  test.describe("no JavaScript", () => {
    // test.use must live at describe scope, not inside a running test.
    test.use({ javaScriptEnabled: false });

    test("choreography runs without JavaScript (CSS-only baseline)", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("/en/");

      const heroChild = page.locator(".docs-hero > *").first();
      expect(await heroChild.evaluate((el) => getComputedStyle(el).animationName)).toContain(
        "docs-rise",
      );
    });
  });
});

test.describe("motion: pixel-dither glow", () => {
  test("variant renders two masked dither layers", async ({ page }) => {
    await page.goto(MOTION_PAGE);

    const glow = page.locator(".docs-hero--pixel").first();
    await expect(glow).toBeVisible();

    const layers = await glow.evaluate((el) => {
      const before = getComputedStyle(el, "::before");
      const after = getComputedStyle(el, "::after");
      return {
        beforeContent: before.content,
        beforeMask: before.maskImage,
        beforeZ: before.zIndex,
        afterMaskPosition: after.maskPosition,
      };
    });
    expect(layers.beforeContent).toBe('""');
    expect(layers.beforeZ).toBe("-1");
    expect(layers.beforeMask).toContain("repeating-conic-gradient");
    // Phase B is the checkerboard shifted by half a cell.
    expect(layers.afterMaskPosition).toContain("3px");
  });

  test("glow layer stays clear of content and clipped by the hero", async ({ page }) => {
    await page.goto(MOTION_PAGE);
    const hero = page.locator(".docs-hero--pixel").first();
    const styles = await hero.evaluate((el) => {
      const s = getComputedStyle(el);
      return { position: s.position, overflow: s.overflow };
    });
    // Stacking context + clipping keep the decorative layer inside the card.
    expect(styles.position).toBe("relative");
    expect(styles.overflow).toBe("hidden");
  });
});

test.describe("motion: aurora glow", () => {
  test("variant renders one rotated lobed layer behind content", async ({ page }) => {
    await page.goto(MOTION_PAGE);

    const glow = page.locator(".docs-hero--aurora").first();
    await expect(glow).toBeVisible();

    const styles = await glow.evaluate((el) => {
      const s = getComputedStyle(el, "::before");
      const hero = getComputedStyle(el);
      return {
        content: s.content,
        z: s.zIndex,
        origin: s.transformOrigin,
        background: s.backgroundImage,
        isolation: hero.isolation,
        overflow: hero.overflow,
      };
    });
    expect(styles.content).toBe('""');
    expect(styles.z).toBe("-1");
    // The layer pivots at the hero's top-right corner (Chromium resolves
    // "top right" to absolute pixels: "<full width>px 0px").
    expect(styles.origin).toMatch(/^[\d.]+px 0px$/);
    expect(styles.background).toContain("radial-gradient");
    // Stacking context + clipping keep the decorative layer inside the card.
    expect(styles.isolation).toBe("isolate");
    expect(styles.overflow).toBe("hidden");
  });

  test("aurora sway runs when motion is allowed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(MOTION_PAGE);

    const glow = page.locator(".docs-hero--aurora").first();
    const styles = await glow.evaluate((el) => {
      const s = getComputedStyle(el, "::before");
      return { name: s.animationName, duration: s.animationDuration, fill: s.animationFillMode };
    });
    expect(styles.name).toBe("docs-glow-aurora");
    expect(parseFloat(styles.duration)).toBeGreaterThan(0);
  });

  test("aurora sway does not run under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(MOTION_PAGE);

    const glow = page.locator(".docs-hero--aurora").first();
    await expect(glow).toBeVisible();
    const before = await glow.evaluate((el) => {
      const s = getComputedStyle(el, "::before");
      return { animationName: s.animationName, backgroundImage: s.backgroundImage };
    });
    expect(before.animationName).toBe("none");
    // The static lobed layer itself still renders — only the sway stops.
    expect(before.backgroundImage).toContain("radial-gradient");
  });
});

test.describe("motion: glow variants", () => {
  // The moving layer is ::before everywhere except ripple (calm dot grid
  // is the static ::before, the wave ring is ::after) and synth (trace A
  // is ::before, trace B is ::after). The bounce variant animates both
  // layers with the same keyframes, so ::before stands in for the check.
  const variants: Array<[string, "::before" | "::after", string]> = [
    ["scanline", "::before", "docs-glow-scanline"],
    ["pulse", "::before", "docs-glow-pulse"],
    ["beam", "::before", "docs-glow-beam"],
    ["ripple", "::after", "docs-glow-ripple"],
    ["ripplebounce", "::before", "docs-glow-ripplebounce"],
    ["synth", "::before", "docs-glow-synth-a"],
  ];

  test("each variant renders a decorative layer behind content", async ({ page }) => {
    await page.goto(MOTION_PAGE);
    for (const [v] of variants) {
      const glow = page.locator(`.docs-hero--${v}`).first();
      await expect(glow, v).toBeVisible();
      const z = await glow.evaluate((el, pseudo) => getComputedStyle(el, pseudo).zIndex, "::before");
      expect(z, v).toBe("-1");
    }
  });

  test("each variant animates when motion is allowed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(MOTION_PAGE);
    for (const [v, pseudo, keyframes] of variants) {
      const glow = page.locator(`.docs-hero--${v}`).first();
      const name = await glow.evaluate((el, p) => getComputedStyle(el, p).animationName, pseudo);
      expect(name, v).toBe(keyframes);
    }
  });

  test("each variant freezes under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(MOTION_PAGE);
    for (const [v, pseudo] of variants) {
      const glow = page.locator(`.docs-hero--${v}`).first();
      const name = await glow.evaluate((el, p) => getComputedStyle(el, p).animationName, pseudo);
      expect(name, v).toBe("none");
    }
  });
});

test.describe("motion: glyph stroke-draw", () => {
  test("glyph shapes carry pathLength normalization", async ({ page }) => {
    await page.goto(MOTION_PAGE);
    const shape = page.locator(".docs-feature__media--glyph .docs-icon-glyph > *").first();
    expect(await shape.getAttribute("pathLength")).toBe("100");
  });

  test("draw animation drives dash offset when motion is allowed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(MOTION_PAGE);

    const shape = page.locator(".docs-feature__media--glyph .docs-icon-glyph > *").first();
    const styles = await shape.evaluate((el) => {
      const s = getComputedStyle(el);
      return { dashArray: s.strokeDasharray, timeline: s.animationTimeline };
    });
    expect(styles.dashArray).not.toBe("none");
    expect(styles.timeline).toContain("view()");
  });
});

test.describe("motion: print", () => {
  test("print output freezes motion", async ({ page }) => {
    await page.emulateMedia({ media: "print" });
    await page.goto("/en/");

    const button = page.locator(".docs-button").first();
    const styles = await button.evaluate((el) => {
      const s = getComputedStyle(el);
      return { animationName: s.animationName, transitionDuration: s.transitionDuration };
    });
    expect(styles.animationName).toBe("none");
    expect(parseFloat(styles.transitionDuration)).toBe(0);
  });
});
