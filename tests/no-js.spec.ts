import { expect, test } from "@playwright/test";

test.describe("no-JS", () => {
  test.use({ javaScriptEnabled: false });

  test("navigation and fallback links remain usable", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Sidebar is closed by default on no-JS desktop; toggle should be visible
    const sidebarToggle = page.locator(".docs-sidebar-toggle");
    await expect(sidebarToggle).toBeVisible();

    // Open sidebar to access navigation
    await sidebarToggle.click();
    await expect(page.locator(".docs-sidebar[open]")).toBeVisible();

    await expect(page.getByRole("link", { name: "Browse all pages" })).toBeVisible();

    await page.locator("#docs-sidebar-nav").getByRole("link", { name: "Getting Started" }).click();
    await expect(page).toHaveURL(/\/en\/docs\/latest\/getting-started\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Getting Started" })).toBeVisible();
  });

  test("version and language switchers are plain links", async ({ page }) => {
    await page.goto("/en/docs/latest/getting-started/");

    // Sidebar is closed by default on no-JS desktop; open it first
    const sidebarToggle = page.locator(".docs-sidebar-toggle");
    await expect(sidebarToggle).toBeVisible();
    await sidebarToggle.click();
    await expect(page.locator(".docs-sidebar[open]")).toBeVisible();

    const versionSwitcher = page.locator(".docs-switcher--version");
    await expect(versionSwitcher).toBeVisible();
    await expect(versionSwitcher.locator(".docs-switcher-select")).toHaveCount(0);

    // On latest version, language switcher should be visible (all 4 languages have latest)
    const languageSwitcher = page.locator(".docs-switcher--language");
    await expect(languageSwitcher).toBeVisible();

    // Navigate to v1.0 (archived, EN-only)
    await versionSwitcher.locator(".docs-switcher-summary").click();
    await versionSwitcher.getByRole("link", { name: /v1\.0/ }).click();
    await expect(page).toHaveURL(/\/en\/docs\/v1\.0\/getting-started\/?$/);

    // On v1.0, language switcher should NOT be visible (only EN has v1.0)
    // Per D-10: "If no other language qualifies, the entire switcher is omitted."
    await expect(page.locator(".docs-switcher--language")).toHaveCount(0);
  });

  test("search page shows the static catalog and fallback links", async ({ page }) => {
    await page.goto("/en/docs/latest/search/");

    const fallback = page.locator("[data-search-fallback]");
    await expect(fallback).toBeVisible();
    await expect(fallback.locator(".docs-search-fallback-note")).toBeVisible();
    await expect(fallback.getByRole("link", { name: "Getting Started" }).first()).toBeVisible();
  });

  test("search filters stay hidden without JavaScript", async ({ page }) => {
    await page.goto("/en/docs/latest/search/");

    await expect(page.locator("[data-search-filters]")).toBeHidden();
    await expect(page.locator("[data-search-fallback]")).toBeVisible();
  });

  test("front-page rail renders as plain links and the video facade stays a link", async ({ page }) => {
    await page.goto("/en/");
    const rail = page.locator(".docs-site-rail");
    await expect(rail).toBeVisible();
    await expect(rail.getByRole("link", { name: "Docs" })).toBeVisible();

    await page.goto("/en/docs/latest/components/video/");
    const fallback = page.locator(".docs-video__fallback").first();
    await expect(fallback).toBeVisible();
    const href = await fallback.getAttribute("href");
    expect(href).toContain("youtube-nocookie.com/watch?v=");
  });
});
