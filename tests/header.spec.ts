import { expect, test } from "@playwright/test";

test("front page header shows nav links and social icons", async ({ page }) => {
  await page.goto("/en/");
  const nav = page.locator(".docs-site-header nav");
  await expect(nav).toBeVisible();
  await expect(nav.locator(".docs-header-links").getByRole("link", { name: "Docs" })).toBeVisible();
  const github = nav.locator(".docs-header-icons").getByRole("link", { name: "GitHub" });
  await expect(github).toBeVisible();
  await expect(github.locator("svg")).toBeVisible();
  await expect(page.locator(".docs-header-menu")).toBeHidden();
});

test("header docs link navigates into the latest docs", async ({ page }) => {
  await page.goto("/en/");
  await page.locator(".docs-header-links").getByRole("link", { name: "Docs" }).click();
  await expect(page).toHaveURL(/\/en\/docs\/latest\//);
});

test("header collapses to a dropdown on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/");
  await expect(page.locator(".docs-header-links")).toBeHidden();
  await expect(page.locator(".docs-header-icons")).toBeHidden();
  const toggle = page.locator(".docs-header-menu summary");
  await expect(toggle).toBeVisible();
  await toggle.click();
  const panel = page.locator(".docs-header-menu__panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Docs" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "GitHub" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "GitHub" }).locator("svg")).toBeVisible();
});

test("dropdown opens without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/en/");
  await page.locator(".docs-header-menu summary").click();
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
  await menu.locator("summary").click();
  await expect(menu).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open");
});
