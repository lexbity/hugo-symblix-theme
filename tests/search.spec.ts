import { expect, test } from "@playwright/test";

test("sidebar search input and browse links remain usable", async ({ page }) => {
  await page.goto("/en/docs/latest/");

  await expect(page.locator("[data-sidebar-search]")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse all pages" })).toBeVisible();
});
