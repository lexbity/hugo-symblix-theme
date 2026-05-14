import { expect, test } from "@playwright/test";

test("manual navigation marks the current page and keeps ancestors open", async ({ page }) => {
  await page.goto("/en/docs/latest/user-guide/configuration/");

  const ancestor = page.locator('details[data-nav-path="/en/docs/latest/user-guide/"]');
  await expect(ancestor).toHaveAttribute("open", "");
  await expect(page.getByRole("link", { name: "Configuration" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("External Project")).toBeVisible();
  await expect(page.getByText("Hidden Example")).toHaveCount(0);
});

test("rtl navigation stays localized", async ({ page }) => {
  await page.goto("/ar/docs/latest/user-guide/configuration/");

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("link", { name: "التهيئة" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator('details[data-nav-path="/ar/docs/latest/components/"] .docs-nav-summary-label')).toBeVisible();
});
