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

  await page.locator('select[data-theme-select]').selectOption("dark");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem("docs-theme"))).toBe("dark");
});
