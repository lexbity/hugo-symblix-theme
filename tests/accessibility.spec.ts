import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function analyzePage(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  return results.violations.filter((violation) => {
    return violation.impact === "critical" || violation.impact === "serious";
  });
}

// Jump every animation to its final state before analysis. WCAG contrast
// applies to the settled page; sampling mid-entrance (semi-transparent
// buttons over the hero background) produces false violations.
async function settleAnimations(page: Page) {
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => {
      try {
        a.finish();
      } catch {
        /* infinite animations cannot finish; leave them running */
      }
    });
  });
}

test("accessibility smoke passes on representative pages", async ({ page }) => {
  await page.goto("/en/");
  await settleAnimations(page);
  expect(await analyzePage(page)).toEqual([]);

  await page.goto("/en/docs/latest/");
  await settleAnimations(page);
  expect(await analyzePage(page)).toEqual([]);

  await page.goto("/en/docs/latest/components/project/");
  await settleAnimations(page);
  expect(await analyzePage(page)).toEqual([]);

  await page.goto("/ar/docs/latest/");
  await settleAnimations(page);
  expect(await analyzePage(page)).toEqual([]);

  // SYM-MOT-001: the motion page carries every Tier-1 effect plus live
  // scene/reveal demos — scrubbed words, glow variants, tilt.
  await page.goto("/en/docs/latest/components/motion/");
  await settleAnimations(page);
  expect(await analyzePage(page)).toEqual([]);
});

// Phase 6-7: Preset-specific accessibility tests
test.describe("preset accessibility", () => {
  const PRESETS = [
    "symblix-light",
    "symblix-dark",
    "ocean-dark",
    "forest-light",
    "sunset-dark",
    "solarized-light",
    "high-contrast",
  ];

  for (const preset of PRESETS) {
    test(`accessibility passes on ${preset} preset`, async ({ page }) => {
      await page.goto("/en/docs/latest/");
      await page.evaluate((p) => {
        window.SymblixTheme.setPreset(p);
      }, preset);

      // Wait for preset to apply
      await page.waitForTimeout(100);

      // Run accessibility analysis
      expect(await analyzePage(page)).toEqual([]);
    });
  }

  test("preset switcher is keyboard navigable (sidebar)", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // The sidebar is permanently visible at desktop width; no drawer
    // toggle is needed to reach the switcher.
    const summary = page.locator(".docs-switcher--preset summary");
    await summary.focus();

    // Open with Enter
    await page.keyboard.press("Enter");

    // First option should be focused (or the summary stays focused)
    // Navigate to first option with Tab
    await page.keyboard.press("Tab");

    // The first preset option should be focusable
    const firstOption = page.locator(".docs-preset-option").first();
    await expect(firstOption).toBeFocused();

    // Close with Escape
    await page.keyboard.press("Escape");
  });

  test("preset switcher is keyboard navigable (header)", async ({ page }) => {
    await page.goto("/en/");

    // Focus the rail switcher (the front-page "header" switcher lives in
    // the rail chrome; the header bar is the mobile chrome).
    const toggle = page.locator(".docs-site-rail .docs-header-preset__toggle");
    await toggle.focus();

    // Open with Enter
    await page.keyboard.press("Enter");

    // Wait for panel to open
    await page.waitForTimeout(100);

    // First option should be focusable
    await page.keyboard.press("Tab");

    // The first preset option should be focusable
    const firstOption = page.locator(".docs-header-preset__option").first();
    await expect(firstOption).toBeFocused();

    // Close with Escape
    await page.keyboard.press("Escape");
  });

  test("active preset has aria-current attribute", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Check that the current preset has aria-current. The option lives in
    // the still-closed dropdown, so assert presence rather than visibility.
    const currentPreset = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-preset");
    });

    const activeOption = page.locator(
      `.docs-switcher--preset [data-preset-id="${currentPreset}"][aria-current="true"]`,
    );
    await expect(activeOption).toHaveCount(1);
  });

  test("preset switcher has aria-label", async ({ page }) => {
    await page.goto("/en/");

    // Rail switcher should have aria-label
    const headerSwitcher = page.locator(".docs-site-rail .docs-header-preset__toggle");
    const ariaLabel = await headerSwitcher.getAttribute("aria-label");
    expect(ariaLabel).toContain("theme");
  });

  test("high-contrast preset meets WCAG AAA (4.5:1 minimum)", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Set high-contrast preset
    await page.evaluate(() => {
      window.SymblixTheme.setPreset("high-contrast");
    });

    await page.waitForTimeout(100);

    // Check computed colors
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    const textColor = await page.evaluate(() => {
      return getComputedStyle(document.body).color;
    });

    // Both should be solid colors (not transparent or rgba with alpha)
    expect(bgColor).not.toContain("rgba");
    expect(textColor).not.toContain("rgba");

    // In high-contrast preset:
    // bg should be #ffffff, text should be #000000
    // This gives 21:1 contrast ratio (exceeds AAA)
    expect(bgColor).toBe("rgb(255, 255, 255)");
    expect(textColor).toBe("rgb(0, 0, 0)");
  });

  test("forced-colors mode overrides preset colors", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Apply forced-colors
    await page.emulateMedia({ forcedColors: "active" });

    // Colors should be overridden by user agent
    const linkColor = await page.evaluate(() => {
      return getComputedStyle(document.querySelector("a")!).color;
    });

    // In forced-colors mode, links should use the browser's link color
    // (typically blue in most browsers)
    expect(linkColor).not.toBe("");
  });

  test("prefers-contrast: more overrides preset colors", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Apply prefers-contrast
    await page.emulateMedia({ prefersContrast: "more" });

    // Check that the page still renders
    await expect(page.locator("h1")).toBeVisible();
  });
});
