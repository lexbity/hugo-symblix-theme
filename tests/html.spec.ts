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
  await expect(page.locator("figure.docs-codeblock .highlight pre.chroma code.language-toml")).toHaveCount(1);
});

test("code blocks are syntax highlighted server-side", async ({ page }) => {
  await page.goto("/en/docs/latest/technical-content/");

  await expect(page.locator("figure.docs-codeblock .highlight .chroma span[class]:not(.line):not(.cl)").first()).toBeVisible();
});

test("code blocks expose copy metadata for the JS enhancement", async ({ page }) => {
  await page.goto("/en/docs/latest/getting-started/");

  const block = page.locator("[data-codeblock]").first();
  await expect(block).toHaveAttribute("data-copy-label", "Copy code");
  await expect(block).toHaveAttribute("data-copied-label", "Copied");

  await expect(page.locator(".docs-copy-button").first()).toBeVisible();
  await expect(page.locator(".docs-copy-button").first()).toHaveText("Copy code");
});

test("404 page keeps the docs shell", async ({ page }) => {
  await page.goto("/en/404.html");

  await expect(page.locator(".docs-shell")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.locator("#docs-sidebar-nav")).toBeVisible();
});

test("site footer carries project links and license", async ({ page }) => {
  await page.goto("/en/");

  const footer = page.locator(".site-footer");
  await expect(footer.locator(".docs-social-link")).toHaveCount(1);
  await expect(footer.locator('a[rel~="license"]')).toHaveText("MIT");
  await expect(footer.locator(".site-footer__copyright")).toContainText("Symblix authors");
});
