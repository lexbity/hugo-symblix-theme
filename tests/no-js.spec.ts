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
});
