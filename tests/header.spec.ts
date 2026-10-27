import { expect, test } from "@playwright/test";

test("front page shows the icon rail with nav, social, and theme controls", async ({ page }) => {
  await page.goto("/en/");
  const rail = page.locator(".docs-site-rail");
  await expect(rail).toBeVisible();
  const nav = rail.locator("nav");
  await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Docs" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Components" })).toBeVisible();
  const github = rail.locator(".docs-rail__iconlink");
  await expect(github).toBeVisible();
  await expect(github.locator("svg")).toBeVisible();
  await expect(rail.locator(".docs-header-preset__toggle")).toBeVisible();
  // Home is the current page on the front page.
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
});

test("rail docs link navigates into the latest docs", async ({ page }) => {
  await page.goto("/en/");
  await page.locator(".docs-site-rail nav").getByRole("link", { name: "Docs" }).click();
  await expect(page).toHaveURL(/\/en\/docs\/latest\//);
});

test("rail chrome swaps back to the header on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/");
  await expect(page.locator(".docs-site-rail")).toBeHidden();
  await expect(page.locator(".docs-site-header")).toBeVisible();
  await expect(page.locator(".docs-header-links")).toBeHidden();
  await expect(page.locator(".docs-header-icons")).toBeHidden();
});

test("header collapses to a dropdown on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/");
  const toggle = page.locator(".docs-header-menu > summary");
  await expect(toggle).toBeVisible();
  await toggle.click();
  const panel = page.locator(".docs-header-menu__panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Docs" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "GitHub" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "GitHub" }).locator("svg")).toBeVisible();
  // The theme switcher stays reachable from the mobile menu.
  await expect(panel.locator(".docs-header-preset__toggle")).toBeVisible();
});

test("dropdown opens without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/en/");
  await page.locator(".docs-header-menu > summary").click();
  const panel = page.locator(".docs-header-menu__panel");
  await expect(panel.getByRole("link", { name: "Docs" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "GitHub" })).toBeVisible();
  await expect(page.locator(".docs-header-links").first()).toBeHidden();
  await context.close();
});

test("dropdown closes on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/");
  const menu = page.locator(".docs-header-menu");
  await menu.locator("> summary").click();
  await expect(menu).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open");
});
