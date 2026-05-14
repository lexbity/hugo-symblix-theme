import { expect, test } from "@playwright/test";

test("tabs and methods switch visible panels", async ({ page }) => {
  await page.goto("/en/docs/latest/components/tabs/");

  const tabs = page.locator('[data-choice-group="tabs"]');
  await expect(tabs.getByRole("tab", { name: "Install", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(tabs.getByRole("tabpanel", { name: "Install", exact: true })).toBeVisible();
  await tabs.getByRole("tab", { name: "Configure", exact: true }).click();
  await expect(tabs.getByRole("tab", { name: "Configure", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(tabs.getByRole("tabpanel", { name: "Configure", exact: true })).toBeVisible();
  await expect(tabs.locator('[data-choice-title="Install"]')).toHaveAttribute("hidden", "");

  await page.goto("/en/docs/latest/components/methods/");
  const methods = page.locator('[data-choice-group="methods"]');
  await expect(methods.getByRole("tab", { name: "npm", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(methods.getByRole("tabpanel", { name: "npm", exact: true })).toBeVisible();
  await methods.getByRole("tab", { name: "pnpm", exact: true }).click();
  await expect(methods.getByRole("tab", { name: "pnpm", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(methods.getByRole("tabpanel", { name: "pnpm", exact: true })).toBeVisible();
  await expect(methods.locator('[data-choice-title="npm"]')).toHaveAttribute("hidden", "");
});
