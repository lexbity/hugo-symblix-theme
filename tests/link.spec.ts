import { expect, test } from "@playwright/test";

test("external and internal markdown links render with the expected attributes", async ({ page }) => {
  await page.goto("/en/docs/latest/technical-content/");

  const externalLink = page.getByRole("link", { name: "Hugo multilingual docs" });
  await expect(externalLink).toHaveAttribute("href", "https://gohugo.io/content-management/multilingual/");
  await expect(externalLink).toHaveAttribute("rel", /noreferrer/);
  await expect(page.locator(".docs-external-link__icon")).toHaveCount(1);

  const internalLink = page.getByRole("link", { name: "components index" });
  await expect(internalLink).toHaveAttribute("href", "/en/docs/latest/components/");
  await expect(internalLink).not.toHaveAttribute("rel");
});
