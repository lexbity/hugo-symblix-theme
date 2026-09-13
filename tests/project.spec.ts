import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function withPlatform(page: Page, override: Record<string, unknown>, ua = "") {
  await page.addInitScript(([o, userAgent]) => {
    Object.defineProperty(navigator, "userAgentData", { value: undefined, configurable: true });
    for (const [k, v] of Object.entries(o!)) {
      Object.defineProperty(navigator, k, { value: v, configurable: true });
    }
    if (userAgent) {
      Object.defineProperty(navigator, "userAgent", { value: userAgent, configurable: true });
    }
  }, [override, ua] as [Record<string, unknown>, string]);
}

test("release badge renders version and changelog link", async ({ page }) => {
  await page.goto("/en/");
  const badge = page.locator(".docs-release");
  await expect(badge).toBeVisible();
  await expect(badge.locator(".docs-release__version")).toHaveText("v0.1.0");
  await expect(badge.getByRole("link", { name: "Changelog" })).toHaveAttribute("href",
    "https://github.com/lex/hugo-theme-docworkbench/releases");
});

test("install renders the command byte-exact with the copy contract", async ({ page }) => {
  await page.goto("/en/docs/latest/components/project/");
  const install = page.locator(".docs-install").first();
  const code = install.locator(".docs-install-method__pre code");
  expect(await code.textContent()).toBe("brew install docworkbench");
  const block = install.locator("[data-codeblock]");
  await expect(block).toHaveAttribute("data-copy-label", "Copy code");
  await expect(block).toHaveAttribute("data-copied-label", "Copied");
  await expect(block).toHaveAttribute("data-copy-failed-label", "Copy failed");
});

test("install preserves multi-line command fidelity", async ({ page }) => {
  await page.goto("/en/docs/latest/components/project/");
  const code = page.locator(".docs-install").nth(1).locator(".docs-install-method__pre code");
  expect(await code.textContent()).toBe(
    "curl -fsSL https://example.com/install.sh | sh\n  && docworkbench --version",
  );
});

test("install command renders HTML-lookalike characters as literal text", async ({ page }) => {
  await page.goto("/en/docs/latest/components/project/");
  const code = page.locator(".docs-install").filter({ hasText: "Redirects and comparisons" }).locator("code");
  expect(await code.textContent()).toBe(
    "docworkbench render < input.md > output.html && diff <(docworkbench check < input.md) output.html",
  );
  // If the command were interpolated unescaped, <input.md> would parse as an element.
  expect(await code.evaluate((el) => el.children.length)).toBe(0);
});

test("install methods render a switcher and switch panels", async ({ page }) => {
  await page.goto("/en/docs/latest/components/project/");
  const group = page.locator('[data-choice-group="tabs"].docs-choice-group--install');
  await expect(group).toBeVisible();
  const brew = group.getByRole("tab", { name: "Homebrew", exact: true });
  await brew.click();
  await expect(brew).toHaveAttribute("aria-selected", "true");
  await expect(group.locator('[data-choice-title="Homebrew"]')).toBeVisible();
  await group.getByRole("tab", { name: "Script", exact: true }).click();
  await expect(group.locator('[data-choice-title="Homebrew"]')).toHaveAttribute("hidden", "");
  await expect(group.getByRole("tab", { name: "Script", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("install switcher supports arrow-key navigation", async ({ page }) => {
  await page.goto("/en/docs/latest/components/project/");
  const group = page.locator('[data-choice-group="tabs"].docs-choice-group--install');
  const brew = group.getByRole("tab", { name: "Homebrew", exact: true });
  await brew.focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("tab", { name: "Script", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(group.getByRole("tab", { name: "Script", exact: true })).toBeFocused();
  await expect(group.locator('[data-choice-title="Homebrew"]')).toHaveAttribute("hidden", "");
});

test("install methods stack without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/en/docs/latest/components/project/");
  await expect(page.locator('[data-choice-title="Homebrew"]')).toBeVisible();
  await expect(page.locator('[data-choice-title="Script"]')).toBeVisible();
  await expect(page.locator(".docs-choice-switcher")).toHaveCount(0);
  await expect(page.locator(".docs-copy-button")).toHaveCount(0);
  await expect(page.locator(".docs-download__suggested")).toHaveCount(0);
  await expect(page.locator(".docs-downloads .docs-download")).toHaveCount(3);
  await expect(page.locator(".docs-downloads .docs-download").first()).toBeVisible();
  await context.close();
});

test("downloads grid renders all rows with platform metadata", async ({ page }) => {
  await page.goto("/en/docs/latest/components/project/");
  const rows = page.locator(".docs-downloads .docs-download");
  await expect(rows).toHaveCount(3);
  for (const platform of ["linux", "macos", "windows"]) {
    await expect(page.locator(`[data-platform="${platform}"]`)).toHaveCount(1);
  }
  const linux = page.locator('[data-platform="linux"]');
  await expect(linux.locator(".docs-download__link")).toHaveAttribute("href", /releases\/latest\/download/);
  await expect(linux.locator(".docs-download__checksum")).toHaveAttribute("href", /\.sha256$/);
  await expect(linux.locator(".docs-download__size")).toHaveText("4.2 MB");
  await expect(linux).toHaveClass(/docs-download--primary/);
});

test("linux rows are suggested on linux platforms", async ({ page }) => {
  await withPlatform(page, { platform: "Linux x86_64" });
  await page.goto("/en/docs/latest/components/project/");
  await expect(page.locator('[data-platform="linux"]')).toHaveAttribute("data-suggested", "true");
  await expect(page.locator('[data-platform="linux"] .docs-download__suggested')).toHaveText("Suggested for your system");
  await expect(page.locator('[data-suggested="true"]')).toHaveCount(1);
});

test("windows rows are suggested on windows", async ({ page }) => {
  await withPlatform(page, { platform: "Win32" });
  await page.goto("/en/docs/latest/components/project/");
  await expect(page.locator('[data-platform="windows"]')).toHaveAttribute("data-suggested", "true");
  await expect(page.locator('[data-suggested="true"]')).toHaveCount(1);
});

test("macOS rows are suggested when userAgentData takes precedence", async ({ page }) => {
  await withPlatform(page, { userAgentData: { platform: "macOS" }, platform: "Intel" });
  await page.goto("/en/docs/latest/components/project/");
  await expect(page.locator('[data-platform="macos"]')).toHaveAttribute("data-suggested", "true");
});

test("unknown platforms annotate nothing", async ({ page }) => {
  await withPlatform(page, { platform: "FreeBSD" });
  await page.goto("/en/docs/latest/components/project/");
  await expect(page.locator("[data-suggested]")).toHaveCount(0);
});

test("iPadOS (MacIntel with touch) is excluded from the macOS suggestion", async ({ page }) => {
  await withPlatform(page, { platform: "MacIntel", maxTouchPoints: 2 });
  await page.goto("/en/docs/latest/components/project/");
  await expect(page.locator("[data-suggested]")).toHaveCount(0);
});

test("ARM Linux user agents are excluded from the linux suggestion", async ({ page }) => {
  await withPlatform(
    page,
    { platform: "Linux armv7l" },
    "Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  );
  await page.goto("/en/docs/latest/components/project/");
  await expect(page.locator("[data-suggested]")).toHaveCount(0);
});

test("hero shortcode output is unchanged by the partial extraction", async ({ page }) => {
  await page.goto("/en/docs/latest/components/landing/");
  const hero = page.locator("section.docs-hero").first();
  await expect(hero.locator(".docs-hero__eyebrow")).toBeVisible();
  await expect(hero.locator(".docs-hero__actions .docs-button--primary")).toBeVisible();
});

test("install command blocks stay LTR inside the RTL shell", async ({ page }) => {
  await page.goto("/en/docs/latest/components/project/");
  const pre = page.locator(".docs-install-method__pre").first();
  await expect(pre).toHaveCSS("direction", "ltr");
  await expect(pre).toHaveCSS("unicode-bidi", "isolate");
  await page.goto("/ar/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("install commands and download rows print visibly", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.emulateMedia({ media: "print" });
  await page.goto("/en/docs/latest/components/project/");
  await expect(page.locator(".docs-install-method__pre").first()).toBeVisible();
  await expect(page.locator(".docs-downloads .docs-download")).toHaveCount(3);
  await expect(page.locator(".docs-downloads .docs-download").first()).toBeVisible();
  await expect(page.locator(".docs-copy-button")).toHaveCount(0);
  await context.close();
});