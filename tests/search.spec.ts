import { expect, test } from "@playwright/test";

test("sidebar search input and browse links remain usable", async ({ page }) => {
  await page.goto("/en/docs/latest/");

  await expect(page.locator("[data-sidebar-search]")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse all pages" })).toBeVisible();
});

test("search page publishes a per-language index", async ({ request }) => {
  const response = await request.get("/en/search-index.json");
  expect(response.ok()).toBeTruthy();

  const entries = await response.json();
  expect(entries.length).toBeGreaterThan(5);
  const sample = entries.find((entry) => entry.url === "/en/docs/latest/getting-started/");
  expect(sample.title).toBe("Getting Started");
  expect(sample.version).toBe("latest");
  expect(sample.content.length).toBeGreaterThan(50);
});

test("search page offers interactive results with filters", async ({ page }) => {
  await page.goto("/en/docs/latest/search/");

  const root = page.locator("[data-docs-search]");
  await expect(root).toBeVisible();
  await expect(root.locator("[data-search-input]")).toBeVisible();

  await root.locator("[data-search-input]").fill("version");
  const results = root.locator("[data-search-results] .docs-search-result");
  await expect(results.first()).toBeVisible();

  const versionFilter = root.locator("[data-search-filter-version]");
  await expect(versionFilter).toBeVisible();
  await versionFilter.selectOption("v1.0");
  await expect(results).toHaveCount(1);
  await expect(root.locator("[data-search-results] .docs-search-result-meta")).toContainText("v1.0");
});

test("search page replaces the catalog with results when JavaScript runs", async ({ page }) => {
  await page.goto("/en/docs/latest/search/?q=getting");

  const root = page.locator("[data-docs-search]");
  await expect(root.locator("[data-search-results] .docs-search-result").first()).toBeVisible();
  await expect(root.locator("[data-search-fallback]")).toBeHidden();
});
