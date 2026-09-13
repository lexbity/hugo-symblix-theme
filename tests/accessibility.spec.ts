import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function analyzePage(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  return results.violations.filter((violation) => {
    return violation.impact === "critical" || violation.impact === "serious";
  });
}

test("accessibility smoke passes on representative pages", async ({ page }) => {
  await page.goto("/en/");
  expect(await analyzePage(page)).toEqual([]);

  await page.goto("/en/docs/latest/");
  expect(await analyzePage(page)).toEqual([]);

  await page.goto("/en/docs/latest/components/project/");
  expect(await analyzePage(page)).toEqual([]);

  await page.goto("/ar/docs/latest/");
  expect(await analyzePage(page)).toEqual([]);
});
