import { expect, test } from "@playwright/test";

test("front page header shows nav and social links", async ({ page }) => {
  await page.goto("/en/");
  const nav = page.locator(".docs-site-header nav");
  await expect(nav).toBeVisible();
  await expect(nav.locator(".docs-header-links").getByRole("link", { name: "Docs" })).toBeVisible();
  await expect(nav.locator(".docs-header-links").getByRole("link", { name: "GitHub" })).toBeVisible();
  await expect(page.locator(".docs-header-menu")).toBeHidden();
});

test("header docs link navigates into the latest docs", async ({ page }) => {
  await page.goto("/en/");
  await page.locator(".docs-header-links").getByRole("link", { name: "Docs" }).click();
  await expect(page).toHaveURL(/\/en\/docs\/latest\//);
});

test("header collapses to the pie menu on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/");
  await expect(page.locator(".docs-header-links")).toBeHidden();
  const toggle = page.locator(".docs-header-menu summary");
  await expect(toggle).toBeVisible();
  await toggle.click();
  const items = page.locator(".docs-header-menu__items li");
  await expect(items.first()).toBeVisible();
  const transform = await items.first().evaluate((el) => getComputedStyle(el).transform);
  expect(transform).not.toBe("none");
});

test("pie menu opens without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/en/");
  await page.locator(".docs-header-menu summary").click();
  await expect(page.locator(".docs-header-menu__items a").first()).toBeVisible();
  await expect(page.locator(".docs-header-links").first()).toBeHidden();
  await context.close();
});

test("pie menu closes on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/");
  const menu = page.locator(".docs-header-menu");
  await menu.locator("summary").click();
  await expect(menu).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open");
});
