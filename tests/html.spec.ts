import { expect, test } from "@playwright/test";

test("render hooks emit the expected HTML structure", async ({ page }) => {
  await page.goto("/en/docs/latest/technical-content/");

  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page.locator("h2#hooked-headings")).toHaveCount(1);
  await expect(page.locator("h2#hooked-headings .docs-heading-anchor")).toHaveCount(1);

  await expect(page.locator("figure.docs-markdown-figure")).toHaveCount(1);
  await expect(page.locator("figure.docs-markdown-figure img.docs-markdown-image")).toHaveAttribute(
    "alt",
    "A simple docs layout diagram",
  );

  await expect(page.locator("figure.docs-figure")).toHaveCount(1);
  await expect(page.locator("figure.docs-figure img.docs-figure__image")).toHaveAttribute("loading", "lazy");
  await expect(page.locator("figure.docs-figure img.docs-figure__image")).toHaveAttribute("decoding", "async");

  await expect(page.locator("figure.docs-codeblock")).toHaveCount(1);
  await expect(page.locator("figure.docs-codeblock pre code.language-toml")).toHaveCount(1);
});
