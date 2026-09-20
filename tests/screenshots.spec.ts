import { expect, test } from "@playwright/test";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SCREENSHOT_DIR = join(__dirname, "..", "docs", "screenshots");
if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe("Curated screenshots for README", () => {
  test("home page desktop", async ({ page }) => {
    await page.goto("/en/");
    await page.waitForLoadState("networkidle");
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
});