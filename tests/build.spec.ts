import { expect, test } from "@playwright/test";

test("project front page composes install and downloads", async ({ page }) => {
  await page.goto("/en/");
  await expect(page.locator(".docs-release")).toBeVisible();
  await expect(page.locator('.docs-choice-group--install')).toBeVisible();
  await expect(page.locator(".docs-downloads .docs-download")).toHaveCount(3);
});

test("example site renders representative pages", async ({ page }) => {
  await page.goto("/en/docs/latest/");
  await expect(page).toHaveTitle(/Latest/);
  await expect(page.getByRole("heading", { level: 1, name: "Latest" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page.locator('details.docs-switcher--preset[data-preset-switcher]')).toBeVisible();
  await expect(page.locator('.docs-switcher--language')).toBeVisible();
  await expect(page.locator('.docs-switcher--version')).toBeVisible();
  await expect(page.locator('details.docs-nav-group[open]')).toHaveCount(2);

  await page.goto("/en/docs/latest/configuration/");
  await expect(page).toHaveTitle(/Configuration/);

  await page.goto("/en/docs/latest/navigation/");
  await expect(page).toHaveTitle(/Navigation/);

  await page.goto("/en/docs/latest/versioning/");
  await expect(page).toHaveTitle(/Versioning/);

  await page.goto("/en/docs/latest/multilingual/");
  await expect(page).toHaveTitle(/Multilingual/);

  await page.goto("/en/docs/latest/search/");
  await expect(page).toHaveTitle(/Search/);

  await page.goto("/en/docs/latest/customization/");
  await expect(page).toHaveTitle(/Customization/);

  await page.goto("/en/docs/latest/components/code-blocks/");
  await expect(page).toHaveTitle(/Code Blocks/);

  await page.goto("/en/docs/v1.0/");
  await expect(page).toHaveTitle(/v1\.0/);

  await page.goto("/fr/docs/latest/");
  await expect(page).toHaveTitle(/Dernière version/);

  await page.goto("/ar/docs/latest/");
  await expect(page).toHaveTitle(/أحدث إصدار/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
