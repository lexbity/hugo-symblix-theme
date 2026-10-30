import { expect, test } from "@playwright/test";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { settleAnimations } from "./helpers/motion";

const SCREENSHOT_DIR = join(__dirname, "..", "docs", "screenshots");
if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe("Curated screenshots for README", () => {
  test("home page desktop", async ({ page }) => {
    await page.goto("/en/");
    await page.waitForLoadState("networkidle");
    await settleAnimations(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: join(SCREENSHOT_DIR, "home-desktop.png"),
      fullPage: true,
    });
  });

  test("docs page desktop dark", async ({ page }) => {
    await page.goto("/en/docs/latest/");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.screenshot({
      path: join(SCREENSHOT_DIR, "docs-desktop-dark.png"),
      fullPage: true,
    });
  });

  test("search results page", async ({ page }) => {
    await page.goto("/en/docs/latest/search/");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.fill("[data-search-input]", "configuration");
    await page.waitForTimeout(300); // debounce
    await page.screenshot({
      path: join(SCREENSHOT_DIR, "search-results.png"),
      fullPage: true,
    });
  });

  test("mobile menu", async ({ page }) => {
    await page.goto("/en/docs/latest/");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: join(SCREENSHOT_DIR, "mobile-menu.png"),
      fullPage: true,
    });
  });

  // Phase 6-7: Per-preset visual regression screenshots
  test.describe("preset visual regression (Phase 6-7)", () => {
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
      test(`docs page with ${preset} preset - desktop`, async ({ page }) => {
        await page.goto("/en/docs/latest/");
        await page.waitForLoadState("networkidle");
        await page.setViewportSize({ width: 1440, height: 900 });

        // Set the preset
        await page.evaluate((p) => {
          window.SymblixTheme.setPreset(p);
        }, preset);

        // Wait for preset to apply
        await page.waitForTimeout(200);

        await page.screenshot({
          path: join(SCREENSHOT_DIR, `preset-${preset}-desktop.png`),
          fullPage: true,
        });
      });

      test(`docs page with ${preset} preset - mobile`, async ({ page }) => {
        await page.goto("/en/docs/latest/");
        await page.waitForLoadState("networkidle");
        await page.setViewportSize({ width: 375, height: 667 });

        // Set the preset
        await page.evaluate((p) => {
          window.SymblixTheme.setPreset(p);
        }, preset);

        // Open sidebar for mobile
        await page.locator(".docs-sidebar-toggle").click();

        // Wait for preset to apply
        await page.waitForTimeout(200);

        await page.screenshot({
          path: join(SCREENSHOT_DIR, `preset-${preset}-mobile.png`),
          fullPage: true,
        });
      });
    }

    // Test switcher UI in different presets
    test("sidebar preset switcher open - symblix-light", async ({ page }) => {
      await page.goto("/en/docs/latest/");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1440, height: 900 });

      // The sidebar is permanently visible at desktop width; open the
      // switcher dropdown directly.
      await page.locator(".docs-switcher--preset summary").click();

      await page.waitForTimeout(100);

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "sidebar-preset-switcher-open.png"),
        fullPage: false,
      });
    });

    test("header preset switcher open - symblix-light", async ({ page }) => {
      await page.goto("/en/");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1440, height: 900 });

      // Open header switcher
      await page.locator(".docs-site-rail .docs-header-preset summary").click();

      await page.waitForTimeout(100);

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "header-preset-switcher-open.png"),
        fullPage: false,
      });
    });
  });
});