import { expect, test } from "@playwright/test";

test("print styles hide docs chrome and preserve readable content", async ({ page }) => {
  await page.emulateMedia({ media: "print" });
  await page.goto("/en/docs/latest/components/print/");

  await expect(page.locator(".docs-sidebar")).toHaveCSS("display", "none");
  await expect(page.locator(".docs-toc-desktop")).toHaveCount(1);
  await expect(page.locator(".docs-toc-desktop")).toHaveCSS("display", "none");
  await expect(page.locator(".docs-toc-mobile")).toHaveCount(1);
  await expect(page.locator(".docs-toc-mobile")).toHaveCSS("display", "none");
  await expect(page.locator(".docs-search")).toHaveCount(0);
  await expect(page.locator(".docs-page-nav")).toHaveCSS("display", "none");

  await expect(page.getByText("This page compiles the major theme components into a single print-friendly document.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Tabs" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Methods" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Code groups" })).toBeVisible();
  await expect(page.locator(".docs-code-group__pre")).toHaveCount(3);
  await expect(page.locator("table")).toBeVisible();
  await expect(page.locator("figure.docs-figure")).toBeVisible();
  await expect(page.getByText("All panels visible")).toBeVisible();
  await expect(page.getByText("All methods visible")).toBeVisible();
  await expect(page.getByText("All snippets visible")).toBeVisible();
});
