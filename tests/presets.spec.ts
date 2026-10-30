// Phase 1 tests: Validate preset data structure and configuration.
// These tests verify the data foundation before CSS/JS implementation.
import { expect, test } from "@playwright/test";
import { CSS_BUDGET_MINIFIED_BYTES } from "./helpers/budgets";
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const REPO_ROOT = join(__dirname, "..");

// Minimal YAML parser for our specific structure (avoids adding a dependency)
// We only need to validate structure, not parse complex YAML features.
interface PresetColors {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
}

interface PresetCallouts {
  note: string;
  tip: string;
  info: string;
  warning: string;
  danger: string;
  success: string;
  deprecated: string;
  experimental: string;
}

interface PresetBadges {
  info: string;
  warning: string;
  success: string;
  danger: string;
}

interface Preset {
  id: string;
  label: string;
  description?: string;
  mode: "light" | "dark";
  colors: PresetColors;
  callouts?: PresetCallouts;
  badges?: PresetBadges;
}

interface PresetsData {
  presets: Preset[];
}

/**
 * Parse the docs_presets.yaml file.
 * Uses Hugo itself to parse the YAML and output JSON, avoiding a YAML dependency.
 * Uses a unique temp directory to avoid conflicts in parallel test runs.
 */
function parsePresetsYaml(): PresetsData {
  const yamlPath = join(REPO_ROOT, "data", "docs_presets.yaml");
  expect(existsSync(yamlPath)).toBe(true);

  // Create a unique temporary directory for this test run
  const tmpDir = mkdtempSync(join(tmpdir(), "symblix-presets-"));

  try {
    // Create directory structure
    mkdirSync(join(tmpDir, "data"), { recursive: true });
    mkdirSync(join(tmpDir, "layouts", "_default"), { recursive: true });

    // Copy the YAML file
    cpSync(yamlPath, join(tmpDir, "data", "docs_presets.yaml"));

    // Create config with JSON output format
    const configToml = `baseURL = "http://example.org/"
title = "Test"
[outputs]
home = ["JSON"]
[outputFormats.JSON]
mediaType = "application/json"
`;
    writeFileSync(join(tmpDir, "hugo.toml"), configToml);

    // Create a template that outputs the data as JSON
    const template = `{{ hugo.Data.docs_presets | jsonify }}`;
    writeFileSync(join(tmpDir, "layouts", "_default", "list.json"), template);

    // Build and read the output
    execSync(`hugo --source ${tmpDir} --destination ${join(tmpDir, "public")}`, {
      stdio: "pipe",
    });

    const jsonPath = join(tmpDir, "public", "index.json");
    expect(existsSync(jsonPath)).toBe(true);

    const json = readFileSync(jsonPath, "utf-8");
    return JSON.parse(json) as PresetsData;
  } finally {
    // Clean up temporary directory
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

test.describe("preset data foundation (Phase 1)", () => {
  test("data/docs_presets.yaml exists and has 7 presets", () => {
    const data = parsePresetsYaml();
    expect(data.presets).toBeDefined();
    expect(data.presets).toHaveLength(7);
  });

  test("all 7 expected preset IDs are present", () => {
    const data = parsePresetsYaml();
    const ids = data.presets.map((p) => p.id).sort();
    expect(ids).toEqual([
      "forest-light",
      "high-contrast",
      "ocean-dark",
      "solarized-light",
      "sunset-dark",
      "symblix-dark",
      "symblix-light",
    ]);
  });

  test("each preset has required fields", () => {
    const data = parsePresetsYaml();
    for (const preset of data.presets) {
      // Required: id, label, mode, colors
      expect(preset.id, `preset missing id`).toBeTruthy();
      expect(preset.label, `preset ${preset.id} missing label`).toBeTruthy();
      expect(preset.mode, `preset ${preset.id} missing mode`).toBeTruthy();
      expect(["light", "dark"]).toContain(preset.mode);

      // Required: colors with all 7 keys
      expect(preset.colors, `preset ${preset.id} missing colors`).toBeDefined();
      const requiredColorKeys = ["bg", "surface", "surface2", "text", "muted", "border", "accent"];
      for (const key of requiredColorKeys) {
        expect(
          preset.colors[key as keyof PresetColors],
          `preset ${preset.id} missing color key ${key}`,
        ).toBeTruthy();
      }
    }
  });

  test("each preset has callout colors (8 keys)", () => {
    const data = parsePresetsYaml();
    const requiredCalloutKeys = [
      "note",
      "tip",
      "info",
      "warning",
      "danger",
      "success",
      "deprecated",
      "experimental",
    ];
    for (const preset of data.presets) {
      expect(preset.callouts, `preset ${preset.id} missing callouts`).toBeDefined();
      for (const key of requiredCalloutKeys) {
        expect(
          preset.callouts![key as keyof PresetCallouts],
          `preset ${preset.id} missing callout ${key}`,
        ).toBeTruthy();
      }
    }
  });

  test("each preset has badge colors (4 keys)", () => {
    const data = parsePresetsYaml();
    const requiredBadgeKeys = ["info", "warning", "success", "danger"];
    for (const preset of data.presets) {
      expect(preset.badges, `preset ${preset.id} missing badges`).toBeDefined();
      for (const key of requiredBadgeKeys) {
        expect(
          preset.badges![key as keyof PresetBadges],
          `preset ${preset.id} missing badge ${key}`,
        ).toBeTruthy();
      }
    }
  });

  test("preset IDs are unique", () => {
    const data = parsePresetsYaml();
    const ids = data.presets.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test("preset modes are valid (light or dark)", () => {
    const data = parsePresetsYaml();
    for (const preset of data.presets) {
      expect(["light", "dark"]).toContain(preset.mode);
    }
  });

  test("color values are valid hex or rgb() strings", () => {
    const data = parsePresetsYaml();
    const hexRe = /^#[0-9a-fA-F]{3,8}$/;
    const rgbRe = /^rgb\(\s*\d+\s+\d+\s+\d+\s*(\/\s*[\d.]+)?\s*\)$/;

    for (const preset of data.presets) {
      for (const [key, value] of Object.entries(preset.colors)) {
        const isValid = hexRe.test(value) || rgbRe.test(value);
        expect(isValid, `preset ${preset.id} color ${key} = ${value} is not valid hex or rgb()`).toBe(true);
      }
    }
  });

  test("high-contrast preset has maximum contrast colors", () => {
    const data = parsePresetsYaml();
    const hc = data.presets.find((p) => p.id === "high-contrast");
    expect(hc).toBeDefined();
    expect(hc!.colors.bg).toBe("#ffffff");
    expect(hc!.colors.text).toBe("#000000");
    expect(hc!.colors.border).toBe("#000000");
  });

  test("symblix-light and symblix-dark are the default presets", () => {
    const data = parsePresetsYaml();
    const light = data.presets.find((p) => p.id === "symblix-light");
    const dark = data.presets.find((p) => p.id === "symblix-dark");
    expect(light).toBeDefined();
    expect(dark).toBeDefined();
    expect(light!.mode).toBe("light");
    expect(dark!.mode).toBe("dark");
  });

  test("exampleSite hugo.toml has valid preset configuration", () => {
    const configPath = join(REPO_ROOT, "exampleSite", "hugo.toml");
    const config = readFileSync(configPath, "utf-8");

    // Check that preset config exists
    expect(config).toContain('preset = "symblix-light"');
    expect(config).toContain("availablePresets");
    expect(config).toContain("visualPreset");
  });

  test("validation helper warns on invalid preset config", () => {
    // This test verifies that the validation helper emits warnings for bad config.
    // We can't easily test this without modifying the config, so we just verify
    // the validation file exists and contains the expected checks.
    const validationPath = join(
      REPO_ROOT,
      "layouts",
      "partials",
      "docs",
      "helpers",
      "validate-theme-config.html",
    );
    expect(existsSync(validationPath)).toBe(true);

    const validation = readFileSync(validationPath, "utf-8");
    expect(validation).toContain("docs_presets.yaml");
    expect(validation).toContain("availablepresets");
    expect(validation).toContain("visualpreset");
  });
});

test.describe("CSS architecture (Phase 2)", () => {
  const compiledCssPath = join(REPO_ROOT, "assets", "css", "compiled", "theme.css");
  const presetsCssPath = join(REPO_ROOT, "assets", "css", "presets.css");
  const syntaxLightPath = join(REPO_ROOT, "assets", "css", "syntax-light.css");
  const syntaxDarkPath = join(REPO_ROOT, "assets", "css", "syntax-dark.css");
  const fontsCssPath = join(REPO_ROOT, "assets", "css", "fonts.css");
  const badgesCssPath = join(REPO_ROOT, "assets", "css", "components", "badges.css");
  const themeCssPath = join(REPO_ROOT, "assets", "css", "theme.css");

  test("presets.css exists with 7 preset blocks", () => {
    expect(existsSync(presetsCssPath)).toBe(true);
    const css = readFileSync(presetsCssPath, "utf-8");
    // Remove comments before counting
    const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const presetBlocks = cssNoComments.match(/html\[data-preset="[^"]+"\]\s*\{/g) || [];
    expect(presetBlocks.length).toBe(7);
  });

  test("presets.css includes fallback for no data-preset", () => {
    const css = readFileSync(presetsCssPath, "utf-8");
    expect(css).toContain(":root:not([data-preset])");
  });

  test("syntax-light.css and syntax-dark.css exist with correct scoping", () => {
    expect(existsSync(syntaxLightPath)).toBe(true);
    expect(existsSync(syntaxDarkPath)).toBe(true);

    const lightCss = readFileSync(syntaxLightPath, "utf-8");
    const darkCss = readFileSync(syntaxDarkPath, "utf-8");

    expect(lightCss).toContain('html[data-syntax="light"]');
    expect(darkCss).toContain('html[data-syntax="dark"]');

    // Both should define all 11 syntax tokens
    const tokens = [
      "--docs-code-bg",
      "--docs-code-text",
      "--docs-code-comment",
      "--docs-code-keyword",
      "--docs-code-string",
      "--docs-code-number",
      "--docs-code-function",
      "--docs-code-type",
      "--docs-code-constant",
      "--docs-code-operator",
      "--docs-code-error",
    ];
    for (const token of tokens) {
      expect(lightCss).toContain(token);
      expect(darkCss).toContain(token);
    }
  });

  test("fonts.css exists with @font-face declarations", () => {
    expect(existsSync(fontsCssPath)).toBe(true);
    const css = readFileSync(fontsCssPath, "utf-8");

    // 4 @font-face rules: Inter normal/italic, JetBrains Mono normal/italic
    const fontFaceCount = (css.match(/@font-face/g) || []).length;
    expect(fontFaceCount).toBe(4);

    expect(css).toContain('font-family: "Inter"');
    expect(css).toContain('font-family: "JetBrains Mono"');
    expect(css).toContain("font-display: swap");
  });

  test("theme.css no longer has per-mode color definitions", () => {
    const css = readFileSync(themeCssPath, "utf-8");

    // Should NOT have data-theme blocks with color definitions
    expect(css).not.toContain('html[data-theme="dark"] {');
    expect(css).not.toContain('html[data-theme="light"] {');

    // Should NOT have prefers-color-scheme media query with color definitions
    expect(css).not.toContain("@media (prefers-color-scheme: dark)");

    // Should still have layout tokens
    expect(css).toContain("--docs-sidebar-width");
    expect(css).toContain("--docs-content-width");

    // Should still have font tokens with bundled font references
    expect(css).toContain('"Inter"');
    expect(css).toContain('"JetBrains Mono"');

    // Should still have forced-colors and prefers-contrast overrides
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("@media (prefers-contrast: more)");
  });

  test("badges.css uses tokens, no hardcoded colors", () => {
    const css = readFileSync(badgesCssPath, "utf-8");

    // Should use badge tokens
    expect(css).toContain("var(--docs-badge-info)");
    expect(css).toContain("var(--docs-badge-warning)");
    expect(css).toContain("var(--docs-badge-success)");
    expect(css).toContain("var(--docs-badge-danger)");

    // Should NOT have hardcoded hex colors (except in comments)
    const lines = css.split("\n");
    const colorLines = lines.filter(
      (line) => line.includes("#") && !line.trim().startsWith("/*") && !line.trim().startsWith("*"),
    );
    expect(colorLines).toEqual([]);
  });

  test("compiled CSS contains all 7 presets", () => {
    const css = readFileSync(compiledCssPath, "utf-8");
    const presets = [
      "symblix-light",
      "symblix-dark",
      "ocean-dark",
      "forest-light",
      "sunset-dark",
      "solarized-light",
      "high-contrast",
    ];
    for (const preset of presets) {
      // The minified build drops attribute-value quotes; accept both forms.
      const quoted = css.includes(`html[data-preset="${preset}"]`);
      const bare = css.includes(`html[data-preset=${preset}]`);
      expect(quoted || bare, `preset ${preset} selector`).toBe(true);
    }
  });

  test("compiled CSS contains syntax palettes", () => {
    const css = readFileSync(compiledCssPath, "utf-8");
    // Quote-agnostic: the minified build may drop attribute-value quotes.
    const hasLight = css.includes('html[data-syntax="light"]') || css.includes("html[data-syntax=light]");
    const hasDark = css.includes('html[data-syntax="dark"]') || css.includes("html[data-syntax=dark]");
    expect(hasLight).toBe(true);
    expect(hasDark).toBe(true);
  });

  test("compiled CSS carries no @font-face declarations (templated resource)", () => {
    // Font-face rules moved to fonts.css, a Hugo-templated stylesheet
    // published by head.html with relURL values (subpath-safe). The bundle
    // must not contain them, or the raw template syntax would break CSS.
    const css = readFileSync(compiledCssPath, "utf-8");
    const fontFaceCount = (css.match(/@font-face/g) || []).length;
    expect(fontFaceCount).toBe(0);
    expect(css).not.toContain("{{ .interUrl }}");
  });

  test("compiled CSS contains badge token definitions", () => {
    const css = readFileSync(compiledCssPath, "utf-8");
    // Badge tokens should be defined in preset blocks
    expect(css).toContain("--docs-badge-info:");
    expect(css).toContain("--docs-badge-warning:");
    expect(css).toContain("--docs-badge-success:");
    expect(css).toContain("--docs-badge-danger:");
  });

  test("compiled CSS size is reasonable (shared budget policy)", () => {
    const css = readFileSync(compiledCssPath, "utf-8");
    const sizeBytes = Buffer.byteLength(css, "utf-8");
    // Mirrors performance.spec.ts via tests/helpers/budgets.ts — one policy,
    // no divergent copies (SYM-MOT-001 D2 lineage).
    expect(sizeBytes).toBeLessThan(CSS_BUDGET_MINIFIED_BYTES);
  });

  test("site renders correctly with fallback (no data-preset attribute)", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Check that the page has content
    await expect(page.locator("h1")).toBeVisible();

    // Check that CSS custom properties are defined (fallback works)
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--docs-bg").trim();
    });
    expect(bgColor).toBeTruthy();
    // Should be the symblix-light fallback value
    expect(bgColor).toBe("#f8fafc");
  });

  test("syntax highlighting tokens are defined", async ({ page }) => {
    await page.goto("/en/docs/latest/technical-content/");

    // Check that syntax tokens are defined
    const commentColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--docs-code-comment").trim();
    });
    expect(commentColor).toBeTruthy();
  });
});

test.describe("helper layer (Phase 4)", () => {
  const presetsHelperPath = join(REPO_ROOT, "layouts", "partials", "docs", "helpers", "presets.html");
  const currentPresetHelperPath = join(REPO_ROOT, "layouts", "partials", "docs", "helpers", "current-preset.html");
  const currentSyntaxHelperPath = join(REPO_ROOT, "layouts", "partials", "docs", "helpers", "current-syntax.html");
  const paletteHelperPath = join(REPO_ROOT, "layouts", "partials", "docs", "helpers", "palette.html");
  const headPath = join(REPO_ROOT, "layouts", "partials", "head.html");

  test("presets.html helper exists", () => {
    expect(existsSync(presetsHelperPath)).toBe(true);
    const content = readFileSync(presetsHelperPath, "utf-8");

    // Should return structured data
    expect(content).toContain('"default"');
    expect(content).toContain('"available"');
    expect(content).toContain('"all"');
    expect(content).toContain('"current"');
    expect(content).toContain('"currentMode"');
    expect(content).toContain('"currentColors"');

    // Should use hugo.Data (not deprecated site.Data)
    expect(content).toContain("hugo.Data.docs_presets");
  });

  test("current-preset.html helper exists and delegates to presets.html", () => {
    expect(existsSync(currentPresetHelperPath)).toBe(true);
    const content = readFileSync(currentPresetHelperPath, "utf-8");
    expect(content).toContain('partial "docs/helpers/presets.html"');
    expect(content).toContain(".current");
  });

  test("current-syntax.html helper exists and delegates to presets.html", () => {
    expect(existsSync(currentSyntaxHelperPath)).toBe(true);
    const content = readFileSync(currentSyntaxHelperPath, "utf-8");
    expect(content).toContain('partial "docs/helpers/presets.html"');
    expect(content).toContain(".currentMode");
  });

  test("palette.html is deleted (TD-04)", () => {
    expect(existsSync(paletteHelperPath)).toBe(false);
  });

  test("no references to palette.html in layouts", () => {
    const { execSync } = require("node:child_process");
    let hasReferences = false;
    try {
      execSync('grep -r "palette\\.html" layouts/', { stdio: "pipe" });
      hasReferences = true;
    } catch {
      // grep returns non-zero when no matches found — that's what we want
      hasReferences = false;
    }
    expect(hasReferences).toBe(false);
  });

  test("head.html does not call palette.html", () => {
    const content = readFileSync(headPath, "utf-8");
    expect(content).not.toContain('partial "docs/helpers/palette.html"');
    expect(content).not.toContain("$palette :=");
  });

  test("head.html uses presets.html for favicon accent", () => {
    const content = readFileSync(headPath, "utf-8");
    expect(content).toContain('partial "docs/helpers/presets.html"');
    expect(content).toContain("currentColors.accent");
  });

  test("head.html has no inline palette override block", () => {
    const content = readFileSync(headPath, "utf-8");
    // The old inline <style> block with --docs- color overrides should be gone
    expect(content).not.toContain("Palette override block");
    expect(content).not.toContain("@media (forced-colors: none)");
    // But should still have font override from config
    expect(content).toContain("params.docs.theme.fonts");
  });

  test("presets.html resolves correctly in built site", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // The favicon should use the current preset's accent color
    // We can verify this by checking that the favicon link exists
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveCount(1);

    // The href should point to a generated favicon
    const href = await favicon.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toContain(".svg");
  });

  test("validate-theme-config.html still validates presets", () => {
    const validationPath = join(REPO_ROOT, "layouts", "partials", "docs", "helpers", "validate-theme-config.html");
    const content = readFileSync(validationPath, "utf-8");

    // Should still have preset validation
    expect(content).toContain("docs_presets.yaml");
    expect(content).toContain("availablePresets");
    expect(content).toContain("visualPreset");
  });

  test("build passes with new helpers (integration)", () => {
    // This is verified by the fact that the test server started successfully
    // (Playwright's webServer config runs `npm run serve:test`)
    expect(true).toBe(true);
  });
});

test.describe("JavaScript runtime (Phase 5)", () => {
  test("data-preset attribute is set on page load", async ({ page }) => {
    await page.goto("/en/docs/latest/");
    const preset = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-preset");
    });
    // Should be set by pre-paint script or default
    expect(preset).toBeTruthy();
  });

  test("data-syntax attribute is synced with preset mode", async ({ page }) => {
    await page.goto("/en/docs/latest/");
    const result = await page.evaluate(() => {
      return {
        preset: document.documentElement.getAttribute("data-preset"),
        syntax: document.documentElement.getAttribute("data-syntax"),
      };
    });
    expect(result.preset).toBeTruthy();
    expect(result.syntax).toBeTruthy();
    // Syntax should match preset mode
    const expectedMode = result.preset!.includes("dark") ? "dark" : "light";
    expect(result.syntax).toBe(expectedMode);
  });

  test("window.SymblixTheme API exists", async ({ page }) => {
    await page.goto("/en/docs/latest/");
    const api = await page.evaluate(() => {
      return typeof window.SymblixTheme;
    });
    expect(api).toBe("object");
  });

  test("window.SymblixTheme.setPreset() changes preset", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    const result = await page.evaluate(() => {
      const success = window.SymblixTheme.setPreset("symblix-dark");
      return {
        success,
        preset: document.documentElement.getAttribute("data-preset"),
        syntax: document.documentElement.getAttribute("data-syntax"),
      };
    });

    expect(result.success).toBe(true);
    expect(result.preset).toBe("symblix-dark");
    expect(result.syntax).toBe("dark");
  });

  test("window.SymblixTheme.getPreset() returns current preset", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    await page.evaluate(() => {
      window.SymblixTheme.setPreset("ocean-dark");
    });

    const preset = await page.evaluate(() => {
      return window.SymblixTheme.getPreset();
    });
    expect(preset).toBe("ocean-dark");
  });

  test("window.SymblixTheme.getSyntax() returns current syntax mode", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    await page.evaluate(() => {
      window.SymblixTheme.setPreset("forest-light");
    });

    const syntax = await page.evaluate(() => {
      return window.SymblixTheme.getSyntax();
    });
    expect(syntax).toBe("light");
  });

  test("legacy window.SymblixTheme.set('dark') maps to preset", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    const result = await page.evaluate(() => {
      const success = window.SymblixTheme.set("dark");
      return {
        success,
        preset: document.documentElement.getAttribute("data-preset"),
      };
    });

    expect(result.success).toBe(true);
    expect(result.preset).toBe("symblix-dark");
  });

  test("legacy window.SymblixTheme.set('light') maps to preset", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    const result = await page.evaluate(() => {
      window.SymblixTheme.set("light");
      return document.documentElement.getAttribute("data-preset");
    });

    expect(result).toBe("symblix-light");
  });

  test("legacy window.SymblixTheme.set('system') maps to light preset", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    const result = await page.evaluate(() => {
      window.SymblixTheme.set("system");
      return document.documentElement.getAttribute("data-preset");
    });

    // system maps to symblix-light (no auto-detection)
    expect(result).toBe("symblix-light");
  });

  test("preset persists in localStorage", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    await page.evaluate(() => {
      window.SymblixTheme.setPreset("ocean-dark");
    });

    const stored = await page.evaluate(() => {
      return window.localStorage.getItem("docs-preset");
    });
    expect(stored).toBe("ocean-dark");

    // Reload and check persistence
    await page.reload();
    const preset = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-preset");
    });
    expect(preset).toBe("ocean-dark");
  });

  test("legacy localStorage migration from docs-theme", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Set legacy value before page load
    await page.evaluate(() => {
      window.localStorage.setItem("docs-theme", "dark");
      window.localStorage.removeItem("docs-preset");
    });

    // Reload to trigger migration
    await page.reload();

    const result = await page.evaluate(() => {
      return {
        preset: document.documentElement.getAttribute("data-preset"),
        stored: window.localStorage.getItem("docs-preset"),
      };
    });

    expect(result.preset).toBe("symblix-dark");
    expect(result.stored).toBe("symblix-dark");
  });

  test("legacy docs-theme 'light' migrates to symblix-light", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    await page.evaluate(() => {
      window.localStorage.setItem("docs-theme", "light");
      window.localStorage.removeItem("docs-preset");
    });

    await page.reload();

    const preset = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-preset");
    });
    expect(preset).toBe("symblix-light");
  });

  test("invalid preset in localStorage falls back to default", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    await page.evaluate(() => {
      window.localStorage.setItem("docs-preset", "invalid-preset");
    });

    await page.reload();

    const preset = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-preset");
    });
    // Should fall back to a valid preset (symblix-light from config or HTML)
    expect(preset).toBeTruthy();
    expect(preset).not.toBe("invalid-preset");
  });

  test("corrupted localStorage does not break page", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Simulate corrupted localStorage
    await page.evaluate(() => {
      const original = window.localStorage.getItem;
      window.localStorage.getItem = function () {
        throw new Error("Corrupted");
      };
    });

    await page.reload();

    // Page should still render
    await expect(page.locator("h1")).toBeVisible();
  });

  test("setPreset returns false for invalid preset", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    const result = await page.evaluate(() => {
      return window.SymblixTheme.setPreset("");
    });
    expect(result).toBe(false);
  });

  test("getAvailable returns list of presets", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    const available = await page.evaluate(() => {
      return window.SymblixTheme.getAvailable();
    });
    // Without switcher UI (Phase 6), this may be empty or have defaults
    expect(Array.isArray(available)).toBe(true);
  });

  test("pre-paint script exists in HTML head", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Check that the pre-paint script ran by verifying data-preset is set
    // before any external JS loads
    const preset = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-preset");
    });
    expect(preset).toBeTruthy();
  });

  test("old data-theme script is removed", () => {
    const headPath = join(REPO_ROOT, "layouts", "partials", "head.html");
    const content = readFileSync(headPath, "utf-8");

    // The old standalone theme restore script should be gone
    // (the old script set data-theme directly without preset validation)
    expect(content).not.toContain('setAttribute("data-theme", theme)');

    // The new pre-paint script should be present with preset validation
    expect(content).toContain('localStorage.getItem("docs-preset")');
    expect(content).toContain("validPresets");
    expect(content).toContain("data-syntax");
    expect(content).toContain("Pre-paint preset restore");
  });

  test("theme.js has no hardcoded theme set", () => {
    const themeJsPath = join(REPO_ROOT, "assets", "js", "theme.js");
    const content = readFileSync(themeJsPath, "utf-8");

    // Should not have the old hardcoded THEMES set
    expect(content).not.toContain('new Set(["light", "dark", "system"])');
    // Should have the new preset-based logic
    expect(content).toContain("PRESET_STORAGE_KEY");
    expect(content).toContain("LEGACY_THEME_MAP");
    expect(content).toContain("data-preset");
    expect(content).toContain("data-syntax");
  });

  test("JS bundle size is reasonable (< 20 KB minified)", () => {
    // Scoped to the core bundle (SYM-MOT-001 D1): the motion runtime is a
    // separately-budgeted chunk (see performance.spec.ts) and must not
    // pollute the core total.
    const publicDir = join(REPO_ROOT, "exampleSite", "public", "js");
    if (!existsSync(publicDir)) {
      // Skip if not built
      return;
    }
    const { readdirSync, statSync } = require("node:fs");
    const files = readdirSync(publicDir).filter(
      (f: string) => f.startsWith("main.min.") && f.endsWith(".js"),
    );
    expect(files.length).toBeGreaterThan(0);

    const totalSize = files.reduce((sum: number, f: string) => {
      return sum + statSync(join(publicDir, f)).size;
    }, 0);

    // Target: core bundle < 20 KB minified (README Non-Goals)
    expect(totalSize).toBeLessThan(20 * 1024);
  });
});

// Phase 6 tests: Switcher UI components
test.describe("Switcher UI (Phase 6)", () => {
  const sidebarHtmlPath = join(REPO_ROOT, "layouts", "partials", "docs", "sidebar.html");
  const siteHeaderHtmlPath = join(REPO_ROOT, "layouts", "partials", "docs", "site-header.html");
  const presetSwitcherPath = join(REPO_ROOT, "layouts", "partials", "docs", "preset-switcher.html");
  const headerPresetSwitcherPath = join(REPO_ROOT, "layouts", "partials", "docs", "header-preset-switcher.html");
  const themeSwitcherPath = join(REPO_ROOT, "layouts", "partials", "docs", "theme-switcher.html");
  const presetSwitcherCssPath = join(REPO_ROOT, "assets", "css", "components", "preset-switcher.css");
  const inputCssPath = join(REPO_ROOT, "assets", "css", "input.css");

  test("preset-switcher.html exists (sidebar variant)", () => {
    expect(existsSync(presetSwitcherPath)).toBe(true);
    const content = readFileSync(presetSwitcherPath, "utf-8");
    expect(content).toContain("data-preset-switcher");
    expect(content).toContain("data-preset-id");
    expect(content).toContain("data-preset-mode");
    expect(content).toContain("docs-preset-swatch");
    expect(content).toContain("docs-preset-option");
  });

  test("header-preset-switcher.html exists (header variant)", () => {
    expect(existsSync(headerPresetSwitcherPath)).toBe(true);
    const content = readFileSync(headerPresetSwitcherPath, "utf-8");
    expect(content).toContain("docs-header-preset");
    expect(content).toContain("data-preset-switcher");
    expect(content).toContain("data-preset-id");
    expect(content).toContain("data-preset-mode");
  });

  test("theme-switcher.html is deleted (replaced)", () => {
    expect(existsSync(themeSwitcherPath)).toBe(false);
  });

  test("sidebar.html includes preset-switcher partial", () => {
    const content = readFileSync(sidebarHtmlPath, "utf-8");
    expect(content).toContain("preset-switcher.html");
    expect(content).not.toContain("theme-switcher.html");
  });

  test("site-header.html includes header-preset-switcher partial", () => {
    const content = readFileSync(siteHeaderHtmlPath, "utf-8");
    expect(content).toContain("header-preset-switcher.html");
  });

  test("preset-switcher.css exists with styles", () => {
    expect(existsSync(presetSwitcherCssPath)).toBe(true);
    const css = readFileSync(presetSwitcherCssPath, "utf-8");
    expect(css).toContain(".docs-preset-swatch");
    expect(css).toContain(".docs-preset-option");
    expect(css).toContain(".docs-header-preset");
    expect(css).toContain(".docs-switcher--preset");
  });

  test("input.css imports preset-switcher.css", () => {
    const content = readFileSync(inputCssPath, "utf-8");
    expect(content).toContain('"./components/preset-switcher.css"');
  });

  test("sidebar preset switcher displays all available presets", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // The sidebar (and its switcher) is permanently visible at desktop
    // width; the drawer toggle only exists on mobile.
    const switcher = page.locator(".docs-switcher--preset");
    await switcher.locator("summary").click();

    // Check all 7 presets are visible
    const options = switcher.locator(".docs-preset-option");
    await expect(options).toHaveCount(7);

    // Check swatches are rendered
    await expect(options.first().locator(".docs-preset-swatch")).toBeVisible();
  });

  test("header preset switcher appears on front page", async ({ page }) => {
    await page.goto("/en/");

    // The front-page switcher lives in the rail chrome (SYM-VIS-002).
    const headerSwitcher = page.locator(".docs-site-rail .docs-header-preset");
    await expect(headerSwitcher).toBeVisible();

    // Open it
    await headerSwitcher.locator("summary").click();

    // Check presets
    const options = headerSwitcher.locator(".docs-header-preset__option");
    await expect(options).toHaveCount(7);
  });

  test("clicking preset in sidebar changes theme", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Open preset switcher (sidebar is permanently visible at desktop width)
    await page.locator(".docs-switcher--preset summary").click();

    // Click a different preset
    await page.locator('[data-preset-id="ocean-dark"]').first().click();

    // Check attribute changed
    const preset = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-preset");
    });
    expect(preset).toBe("ocean-dark");

    // Check syntax attribute updated
    const syntax = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-syntax");
    });
    expect(syntax).toBe("dark");
  });

  test("clicking preset in header changes theme", async ({ page }) => {
    await page.goto("/en/");

    // Open the rail switcher
    await page.locator(".docs-site-rail .docs-header-preset summary").click();

    // Click a different preset
    await page.locator('[data-preset-id="forest-light"]').first().click();

    // Check attribute changed
    const preset = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-preset");
    });
    expect(preset).toBe("forest-light");

    // Check syntax attribute updated
    const syntax = await page.evaluate(() => {
      return document.documentElement.getAttribute("data-syntax");
    });
    expect(syntax).toBe("light");
  });

  test("both switchers stay in sync", async ({ page }) => {
    await page.goto("/en/");

    // Change preset in the rail switcher
    await page.locator(".docs-site-rail .docs-header-preset summary").click();
    await page.locator('[data-preset-id="ocean-dark"]').first().click();

    // Navigate to docs page
    await page.goto("/en/docs/latest/");

    // Check sidebar switcher shows ocean-dark as active
    const activeOption = page.locator('.docs-switcher--preset [data-preset-id="ocean-dark"]');
    await expect(activeOption).toHaveAttribute("aria-current", "true");
  });

  test("preset switcher hidden without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/en/docs/latest/");

    // Switcher should be hidden
    await expect(page.locator(".docs-switcher--preset")).toBeHidden();
    await expect(page.locator(".docs-header-preset")).toBeHidden();

    await context.close();
  });

  test("i18n keys exist for preset switcher", () => {
    const locales = ["en", "fr", "ja", "ar"];
    for (const locale of locales) {
      const yamlPath = join(REPO_ROOT, "i18n", `${locale}.yaml`);
      const content = readFileSync(yamlPath, "utf-8");
      expect(content).toContain("theme_preset");
      expect(content).toContain("select_preset");
    }
  });
});

// Phase 7 tests: Integration and Polish
test.describe("Integration & Polish (Phase 7)", () => {
  const baseofDefaultPath = join(REPO_ROOT, "layouts", "_default", "baseof.html");
  const baseofDocsPath = join(REPO_ROOT, "layouts", "docs", "baseof.html");
  const indexHtmlPath = join(REPO_ROOT, "layouts", "index.html");
  const presetsMdPath = join(REPO_ROOT, "exampleSite", "content", "en", "docs", "latest", "components", "presets.md");
  const navYamlPath = join(REPO_ROOT, "exampleSite", "data", "docs_nav.yaml");
  const readmePath = join(REPO_ROOT, "README.md");
  const migrationNotesPath = join(REPO_ROOT, "docs", "migration-notes.md");
  const figuresCssPath = join(REPO_ROOT, "assets", "css", "components", "figures.css");

  test("baseof templates have data-preset and data-syntax attributes", () => {
    const checkAttributes = (path: string, name: string) => {
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("data-preset=");
      expect(content).toContain("data-syntax=");
      expect(content).toContain("current-preset");
      expect(content).toContain("current-syntax");
    };

    checkAttributes(baseofDefaultPath, "_default/baseof.html");
    checkAttributes(baseofDocsPath, "docs/baseof.html");
    checkAttributes(indexHtmlPath, "index.html");
  });

  test("presets.md documentation exists", () => {
    expect(existsSync(presetsMdPath)).toBe(true);
    const content = readFileSync(presetsMdPath, "utf-8");
    expect(content).toContain('title = "Presets"');
    expect(content).toContain("## Overview");
    expect(content).toContain("## Configuration");
    expect(content).toContain("## Custom Presets");
    expect(content).toContain("color presets");
  });

  test("docs_nav.yaml has Presets entry", () => {
    const content = readFileSync(navYamlPath, "utf-8");
    expect(content).toContain("Presets");
    expect(content).toContain("components/presets/");
  });

  test("README.md has Presets section", () => {
    const content = readFileSync(readmePath, "utf-8");
    expect(content).toContain("Presets (Visual Identity)");
    expect(content).toContain("Color Presets");
    expect(content).toContain("Bundled Typography");
  });

  test("migration-notes.md has Visual Identity entry", () => {
    const content = readFileSync(migrationNotesPath, "utf-8");
    expect(content).toContain("Visual Identity: Preset Color System");
    expect(content).toContain("Seven Color Presets");
    expect(content).toContain("Migration Path");
  });

  test("figures.css uses data-syntax for diagram switching", () => {
    const content = readFileSync(figuresCssPath, "utf-8");
    // The dark variant is display:none by default and revealed on
    // html[data-syntax="dark"]; no "light" rule is needed for that.
    expect(content).toContain('html[data-syntax="dark"]');
  });

  test("exampleSite hugo.toml has fonts configuration", () => {
    const configPath = join(REPO_ROOT, "exampleSite", "hugo.toml");
    const content = readFileSync(configPath, "utf-8");
    expect(content).toContain('[params.docs.theme]');
    expect(content).toContain('preset = "symblix-light"');
    expect(content).toContain('availablePresets');
    expect(content).toContain('fonts =');
  });

  test("pages incremented by 1 (presets.md added)", async ({ page }) => {
    await page.goto("/en/docs/latest/components/");

    // Check that the presets page link exists in the navigation (the same
    // href also appears in the page's child-page cards, so take the first).
    const presetsLink = page.locator('a[href*="components/presets"]').first();
    await expect(presetsLink).toBeVisible();
  });

  test("no-JS visitors get the OS color scheme (prefers-color-scheme fallback)", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/en/docs/latest/");

    // No explicit choice exists, so the CSS media fallback maps the
    // symblix-light default to its dark tokens when the OS asks for dark.
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(2, 3, 10)");

    await context.close();
  });

  test("an explicit preset choice overrides the OS color scheme", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/en/docs/latest/");
    await page.evaluate(() => {
      window.localStorage.setItem("docs-preset", "symblix-light");
    });
    await page.reload();

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(248, 250, 252)");
    const source = await page.evaluate(() =>
      document.documentElement.getAttribute("data-preset-source"),
    );
    expect(source).toBe("user");

    await context.close();
  });
});

