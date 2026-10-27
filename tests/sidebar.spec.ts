import { expect, test } from "@playwright/test";

test("mobile sidebar opens from a fixed menu button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/docs/latest/");

  const sidebar = page.locator("[data-sidebar]");
  await expect(sidebar).not.toHaveAttribute("open", "");
  await expect(page.locator(".docs-sidebar-toggle")).toBeVisible();

  await page.locator(".docs-sidebar-toggle").click();
  await expect(sidebar).toHaveAttribute("open", "");
  await expect(page.locator(".docs-sidebar-panel")).toBeVisible();

  await page.locator(".docs-sidebar-toggle").click();
  await expect(sidebar).not.toHaveAttribute("open", "");
});

test("theme switcher updates the active theme", async ({ page }) => {
  await page.goto("/en/docs/latest/");

  // Use the SymblixTheme API (the preset switcher UI will use this internally)
  await page.evaluate(() => {
    window.SymblixTheme.setPreset("symblix-dark");
  });

  await expect(page.locator("html")).toHaveAttribute("data-preset", "symblix-dark");
  await expect(page.locator("html")).toHaveAttribute("data-syntax", "dark");
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem("docs-preset"))).toBe("symblix-dark");
});

test("archived version pages use their own sidebar navigation", async ({ page }) => {
  await page.goto("/en/docs/v1.0/getting-started/");

  const nav = page.locator("#docs-sidebar-nav");
  await expect(nav.getByRole("link", { name: "Getting Started" })).toBeVisible();
  // docs_nav_v1.0.yaml has no Components entry; the latest tree must not leak in.
  await expect(nav.getByRole("link", { name: "Components" })).toHaveCount(0);
});
