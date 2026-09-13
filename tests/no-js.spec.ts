import { expect, test } from "@playwright/test";

test.describe("no-JS", () => {
  test.use({ javaScriptEnabled: false });

  test("navigation and fallback links remain usable", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    await expect(page.getByRole("link", { name: "Browse all pages" })).toBeVisible();

    await page.locator("#docs-sidebar-nav").getByRole("link", { name: "Getting Started" }).click();
    await expect(page).toHaveURL(/\/en\/docs\/latest\/getting-started\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Getting Started" })).toBeVisible();
  });

  test("version and language switchers are plain links", async ({ page }) => {
    await page.goto("/en/docs/latest/getting-started/");

    const versionSwitcher = page.locator(".docs-switcher--version");
    await expect(versionSwitcher).toBeVisible();
    await expect(versionSwitcher.locator(".docs-switcher-select")).toHaveCount(0);

    await versionSwitcher.locator(".docs-switcher-summary").click();
    await versionSwitcher.getByRole("link", { name: /v1\.0/ }).click();
    await expect(page).toHaveURL(/\/en\/docs\/v1\.0\/getting-started\/?$/);

    const languageSwitcher = page.locator(".docs-switcher--language");
    await expect(languageSwitcher).toBeVisible();
  });

  test("search page shows the static catalog and fallback links", async ({ page }) => {
    await page.goto("/en/docs/latest/search/");

    const fallback = page.locator("[data-search-fallback]");
    await expect(fallback).toBeVisible();
    await expect(fallback.locator(".docs-search-fallback-note")).toBeVisible();
    await expect(fallback.getByRole("link", { name: "Getting Started" }).first()).toBeVisible();
  });
});
