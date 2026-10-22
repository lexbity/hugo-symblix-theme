import { expect, test } from "@playwright/test";

test("mermaid blocks render the pre-generated diagram", async ({ page }) => {
  await page.goto("/en/docs/latest/components/diagrams/");
  const diagram = page.locator(".docs-diagram").first();
  await expect(diagram).toBeVisible();
  const img = diagram.locator("img.docs-diagram__image--light");
  await expect(img).toHaveCount(1);
  const response = await page.request.get(await img.getAttribute("src"));
  expect(response.ok()).toBeTruthy();
});

test("diagrams ship a hidden dark variant", async ({ page }) => {
  await page.goto("/en/docs/latest/components/diagrams/");
  const dark = page.locator(".docs-diagram img.docs-diagram__image--dark");
  expect(await dark.count()).toBeGreaterThan(0);
  await expect(dark.first()).toBeHidden();
});

test("diagram images carry an accessible name and render without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/en/docs/latest/components/diagrams/");
  const img = page.locator(".docs-diagram img.docs-diagram__image--light").first();
  await expect(img).toBeVisible();
  expect((await img.getAttribute("alt"))?.length ?? 0).toBeGreaterThan(0);
  await context.close();
});
