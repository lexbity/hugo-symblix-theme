// Phase 3 tests: Validate bundled font infrastructure (SYM-VIS-001).
// Verifies fonts load correctly, no external requests, system fallbacks work.
import { expect, test } from "@playwright/test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..");
const FONTS_DIR = join(REPO_ROOT, "static", "fonts");

test.describe("bundled fonts (Phase 3)", () => {
  test("font directory structure exists with all required files", () => {
    expect(existsSync(FONTS_DIR)).toBe(true);

    const interDir = join(FONTS_DIR, "inter");
    const jbMonoDir = join(FONTS_DIR, "jetbrains-mono");

    expect(existsSync(interDir)).toBe(true);
    expect(existsSync(jbMonoDir)).toBe(true);

    // Inter files
    expect(existsSync(join(interDir, "Inter-Variable.woff2"))).toBe(true);
    expect(existsSync(join(interDir, "Inter-Variable-Italic.woff2"))).toBe(true);
    expect(existsSync(join(interDir, "LICENSE.txt"))).toBe(true);

    // JetBrains Mono files
    expect(existsSync(join(jbMonoDir, "JetBrainsMono[wght].woff2"))).toBe(true);
    expect(existsSync(join(jbMonoDir, "JetBrainsMono-Italic[wght].woff2"))).toBe(true);
    expect(existsSync(join(jbMonoDir, "LICENSE.txt"))).toBe(true);
  });

  test("total font payload is under 1.2 MB (NFR-1.4)", () => {
    let totalSize = 0;
    const woff2Files: string[] = [];

    function walk(dir: string) {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith(".woff2")) {
          const size = statSync(full).size;
          totalSize += size;
          woff2Files.push(full);
        }
      }
    }

    walk(FONTS_DIR);

    // Should have exactly 4 WOFF2 files
    expect(woff2Files.length).toBe(4);

    // Total WOFF2 payload < 1.2 MB
    const maxSize = 1.2 * 1024 * 1024;
    expect(totalSize).toBeLessThan(maxSize);

    // Log sizes for visibility
    console.log(`Font payload: ${(totalSize / 1024).toFixed(1)} KB (${totalSize} bytes)`);
    console.log(`Target: < ${(maxSize / 1024 / 1024).toFixed(1)} MB`);
  });

  test("license files are OFL (SIL Open Font License)", () => {
    const interLicense = join(FONTS_DIR, "inter", "LICENSE.txt");
    const jbLicense = join(FONTS_DIR, "jetbrains-mono", "LICENSE.txt");

    const interText = require("node:fs").readFileSync(interLicense, "utf-8");
    const jbText = require("node:fs").readFileSync(jbLicense, "utf-8");

    // Both should mention SIL Open Font License
    expect(interText).toContain("SIL OPEN FONT LICENSE");
    expect(jbText).toContain("SIL OPEN FONT LICENSE");
  });

  test("fonts.css has @font-face with font-display: swap", () => {
    const fontsCssPath = join(REPO_ROOT, "assets", "css", "fonts.css");
    expect(existsSync(fontsCssPath)).toBe(true);

    const css = require("node:fs").readFileSync(fontsCssPath, "utf-8");

    // Strip comments before counting
    const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

    // 4 @font-face rules
    const fontFaceCount = (cssNoComments.match(/@font-face/g) || []).length;
    expect(fontFaceCount).toBe(4);

    // All should have font-display: swap
    const swapCount = (cssNoComments.match(/font-display:\s*swap/g) || []).length;
    expect(swapCount).toBe(4);

    // Font families
    expect(css).toContain('font-family: "Inter"');
    expect(css).toContain('font-family: "JetBrains Mono"');

    // WOFF2 format
    expect(css).toContain("woff2-variations");
  });

  test("compiled CSS carries no @font-face rules (they are a templated resource)", () => {
    const compiledCssPath = join(REPO_ROOT, "assets", "css", "compiled", "theme.css");
    const css = require("node:fs").readFileSync(compiledCssPath, "utf-8");

    // @font-face lives in fonts.css, rendered by head.html with relURL
    // values so font requests survive subpath deployments. The compiled
    // bundle must not re-import it (the template syntax would break CSS).
    const fontFaceCount = (css.match(/@font-face/g) || []).length;
    expect(fontFaceCount).toBe(0);
  });

  test("built pages link the templated font stylesheet", async ({ page }) => {
    await page.goto("/en/docs/latest/");
    const fontCss = page.locator('link[rel="stylesheet"][href*="fonts"]');
    await expect(fontCss).toHaveCount(1);
  });

  test("theme.css font tokens reference bundled fonts with system fallbacks", () => {
    const themeCssPath = join(REPO_ROOT, "assets", "css", "theme.css");
    const css = require("node:fs").readFileSync(themeCssPath, "utf-8");

    // Body font should reference Inter with system fallbacks
    expect(css).toContain('--docs-font-body:');
    expect(css).toContain('"Inter"');
    expect(css).toContain('ui-sans-serif');
    expect(css).toContain('system-ui');

    // Mono font should reference JetBrains Mono with system fallbacks
    expect(css).toContain('--docs-font-mono:');
    expect(css).toContain('"JetBrains Mono"');
    expect(css).toContain('ui-monospace');
  });

  test("font preload links exist in built HTML", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    const preloads = await page.locator('link[rel="preload"][as="font"]').all();
    expect(preloads.length).toBeGreaterThanOrEqual(2);

    // Check Inter preload
    const interPreload = page.locator('link[rel="preload"][href*="Inter-Variable.woff2"]');
    await expect(interPreload).toHaveAttribute("type", "font/woff2");
    await expect(interPreload).toHaveAttribute("crossorigin", "");

    // Check JetBrains Mono preload (URL-encoded brackets)
    const jbPreload = page.locator('link[rel="preload"][href*="JetBrainsMono"]');
    await expect(jbPreload).toHaveAttribute("type", "font/woff2");
    await expect(jbPreload).toHaveAttribute("crossorigin", "");
  });

  test("bundled fonts load and are available via document.fonts", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Explicitly load fonts and wait for them
    const loaded = await page.evaluate(async () => {
      const results: Record<string, boolean> = {};
      try {
        // Load Inter normal
        const interFaces = await document.fonts.load('16px "Inter"');
        results.inter = interFaces.length > 0;

        // Load JetBrains Mono normal
        const jbFaces = await document.fonts.load('16px "JetBrains Mono"');
        results.jbMono = jbFaces.length > 0;

        // Also check with document.fonts.check after loading
        results.interCheck = document.fonts.check('16px "Inter"');
        results.jbMonoCheck = document.fonts.check('16px "JetBrains Mono"');
      } catch (e) {
        results.error = String(e);
      }
      return results;
    });

    expect(loaded.inter).toBe(true);
    expect(loaded.jbMono).toBe(true);
    expect(loaded.interCheck).toBe(true);
    expect(loaded.jbMonoCheck).toBe(true);
  });

  test("Inter font is actually used for body text", async ({ page }) => {
    await page.goto("/en/docs/latest/");
    await page.evaluate(() => document.fonts.ready);

    // Get the computed font-family for body
    const fontFamily = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });

    // Should include Inter (with fallbacks)
    expect(fontFamily).toContain("Inter");
  });

  test("JetBrains Mono font is actually used for code", async ({ page }) => {
    await page.goto("/en/docs/latest/technical-content/");
    await page.evaluate(() => document.fonts.ready);

    // Get the computed font-family for code elements
    const fontFamily = await page.evaluate(() => {
      const code = document.querySelector("code");
      if (!code) return "";
      return getComputedStyle(code).fontFamily;
    });

    // Should include JetBrains Mono (with fallbacks)
    expect(fontFamily).toContain("JetBrains Mono");
  });

  test("no external font requests (privacy: NFR-3.1)", async ({ page }) => {
    const externalRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      // Check for common external font providers
      if (
        url.includes("fonts.googleapis.com") ||
        url.includes("fonts.gstatic.com") ||
        url.includes("use.typekit.net") ||
        url.includes("fast.fonts.net") ||
        url.includes("cloud.typography.com")
      ) {
        externalRequests.push(url);
      }
    });

    await page.goto("/en/docs/latest/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    expect(externalRequests).toEqual([]);
  });

  test("all font requests are same-origin", async ({ page }) => {
    const fontRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes(".woff2") || url.includes(".woff") || url.includes(".ttf")) {
        fontRequests.push(url);
      }
    });

    await page.goto("/en/docs/latest/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    // Should have font requests
    expect(fontRequests.length).toBeGreaterThan(0);

    // All should be same-origin (start with the page's origin)
    const origin = new URL(page.url()).origin;
    for (const url of fontRequests) {
      expect(url.startsWith(origin)).toBe(true);
    }
  });

  test("system fonts render when bundled fonts fail to load", async ({ page, context }) => {
    // Block all font requests to simulate font loading failure
    await context.route("**/*.woff2", (route) => route.abort());
    await context.route("**/*.woff", (route) => route.abort());
    await context.route("**/*.ttf", (route) => route.abort());

    await page.goto("/en/docs/latest/");

    // Page should still render with system fonts
    await expect(page.locator("h1")).toBeVisible();

    // Body should still have a font-family (fallback)
    const fontFamily = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });
    expect(fontFamily).toBeTruthy();
    // Should include system font fallbacks
    expect(fontFamily).toMatch(/system-ui|sans-serif/);
  });

  test("font files are served with correct MIME type", async ({ page, request }) => {
    // Use request API instead of page.goto to avoid download behavior
    const response = await request.get("/fonts/inter/Inter-Variable.woff2");
    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("font/woff2");

    // Check JetBrains Mono (URL-encoded brackets)
    const jbResponse = await request.get("/fonts/jetbrains-mono/JetBrainsMono%5Bwght%5D.woff2");
    expect(jbResponse.status()).toBe(200);
    expect(jbResponse.headers()["content-type"]).toContain("font/woff2");
  });

  test("variable font weight range is supported", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Load and check variable weights
    const weights = await page.evaluate(async () => {
      const results: Record<string, boolean> = {};
      for (const weight of ["100", "400", "700", "900"]) {
        try {
          const faces = await document.fonts.load(`${weight} 16px "Inter"`);
          results[weight] = faces.length > 0;
        } catch {
          results[weight] = false;
        }
      }
      return results;
    });

    // All weights should be available (variable font)
    expect(weights["100"]).toBe(true);
    expect(weights["400"]).toBe(true);
    expect(weights["700"]).toBe(true);
    expect(weights["900"]).toBe(true);
  });

  test("italic fonts are available", async ({ page }) => {
    await page.goto("/en/docs/latest/");

    // Load and check italic fonts
    const italic = await page.evaluate(async () => {
      const results: Record<string, boolean> = {};
      try {
        const interItalic = await document.fonts.load('italic 16px "Inter"');
        results.inter = interItalic.length > 0;

        const jbItalic = await document.fonts.load('italic 16px "JetBrains Mono"');
        results.jbMono = jbItalic.length > 0;
      } catch (e) {
        results.error = String(e);
      }
      return results;
    });

    expect(italic.inter).toBe(true);
    expect(italic.jbMono).toBe(true);
  });

  test("font loading does not cause significant layout shift (CLS)", async ({ page }) => {
    // Measure CLS during page load
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        observer.observe({ type: "layout-shift", buffered: true });

        // Wait for fonts to load and any shifts to settle
        document.fonts.ready.then(() => {
          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 500);
        });
      });
    });

    // CLS should be minimal (< 0.1 is good, < 0.25 is acceptable)
    expect(cls).toBeLessThan(0.1);
  });
});
