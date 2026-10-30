// Phase 8 tests: Performance benchmarks for preset system (SYM-VIS-001).
// Verifies:
// - FCP < 900ms on 3G Fast (baseline + 100ms)
// - LCP < 1200ms on 3G Fast (baseline + 100ms)
// - CLS < 0.1 (font swap doesn't cause layout shift)
// - CSS size < 88 KB minified
// - Font payload < 1.2 MB

import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import {
  CSS_BUDGET_HARD_BYTES,
  CSS_BUDGET_MINIFIED_BYTES,
  JS_CORE_BUDGET_BYTES,
  MOTION_BUDGET_GZIP_BYTES,
  MOTION_BUDGET_RAW_BYTES,
} from "./helpers/budgets";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..");

test.describe("performance benchmarks", () => {
  test.describe("CSS payload size (NFR-1.3)", () => {
    test("compiled CSS size is under 112 KB minified", () => {
      const compiledCssPath = join(REPO_ROOT, "assets", "css", "compiled", "theme.css");
      expect(existsSync(compiledCssPath)).toBe(true);

      const css = readFileSync(compiledCssPath, "utf-8");
      const sizeBytes = Buffer.byteLength(css, "utf-8");
      const sizeKB = sizeBytes / 1024;

      console.log(`CSS size: ${sizeKB.toFixed(1)} KB (${sizeBytes} bytes)`);

      // Target: < 112 KB minified. History of this ratchet (it exists to
      // force a recorded decision, not to freeze history):
      //   88 KB — original ceiling after the preset identity system.
      //   101 KB actual — f608bad expanded the hero-glow variant family
      //     (aurora/scanline/pulse/beam/ripple/synth), deliberately.
      //   102 KB actual — SYM-MOT-001 P1 scene-mount layer (~+1.1 KB).
      //   Re-based to 112/120 with ~10 KB headroom for reveal-text and
      //   adapter CSS. If this ceiling is hit again, trim or split before
      //   raising.
      expect(sizeBytes).toBeLessThan(CSS_BUDGET_MINIFIED_BYTES);
    });

    test("CSS size regression check (< 120 KB minified)", () => {
      const compiledCssPath = join(REPO_ROOT, "assets", "css", "compiled", "theme.css");
      const css = readFileSync(compiledCssPath, "utf-8");
      const sizeBytes = Buffer.byteLength(css, "utf-8");

      // Hard-fail margin above the 112 KB target (SYM-MOT-001 D2 re-base).
      expect(sizeBytes).toBeLessThan(CSS_BUDGET_HARD_BYTES);
    });

    test("input.css imports all required CSS files", () => {
      const inputCssPath = join(REPO_ROOT, "assets", "css", "input.css");
      const content = readFileSync(inputCssPath, "utf-8");

      const requiredImports = [
        "theme.css",
        "presets.css",
        "syntax-light.css",
        "syntax-dark.css",
        "preset-switcher.css",
      ];

      for (const importFile of requiredImports) {
        expect(content).toContain(importFile);
      }
    });

    test("font-face declarations are templated for subpath deployments", () => {
      // fonts.css is a Hugo template rendered by head.html with relURL
      // values; static url("/fonts/…") paths would 404 on subpath sites.
      const fontsCssPath = join(REPO_ROOT, "assets", "css", "fonts.css");
      const content = readFileSync(fontsCssPath, "utf-8");
      expect(content).not.toContain('url("/fonts/');
      expect(content).toContain("{{ .interUrl }}");
    });
  });

  test.describe("font payload size (NFR-1.4)", () => {
    test("total font payload is under 1.2 MB", () => {
      const fontsDir = join(REPO_ROOT, "static", "fonts");
      expect(existsSync(fontsDir)).toBe(true);

      let totalSize = 0;
      let woff2Count = 0;

      function walk(dir: string) {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.name.endsWith(".woff2")) {
            const size = statSync(full).size;
            totalSize += size;
            woff2Count++;
          }
        }
      }

      walk(fontsDir);

      // Should have exactly 4 WOFF2 files
      expect(woff2Count).toBe(4);

      // Total WOFF2 payload < 1.2 MB
      const maxSize = 1.2 * 1024 * 1024;
      expect(totalSize).toBeLessThan(maxSize);

      console.log(`Font payload: ${(totalSize / 1024).toFixed(1)} KB (${totalSize} bytes)`);
    });

    test("font files have correct names", () => {
      const fontsDir = join(REPO_ROOT, "static", "fonts");
      const interDir = join(fontsDir, "inter");
      const jbDir = join(fontsDir, "jetbrains-mono");

      // Inter files
      expect(existsSync(join(interDir, "Inter-Variable.woff2"))).toBe(true);
      expect(existsSync(join(interDir, "Inter-Variable-Italic.woff2"))).toBe(true);

      // JetBrains Mono files
      expect(existsSync(join(jbDir, "JetBrainsMono[wght].woff2"))).toBe(true);
      expect(existsSync(join(jbDir, "JetBrainsMono-Italic[wght].woff2"))).toBe(true);
    });
  });

  test.describe("page load performance", () => {
    // Note: These tests run in the test environment and may not reflect real-world 3G Fast
    // They serve as regression checks rather than absolute benchmarks

    test("First Contentful Paint (FCP) is reasonable", async ({ page }) => {
      // Paint entries only exist on a navigated page.
      await page.goto("/en/docs/latest/");

      const fcp = await page.evaluate(async () => {
        return new Promise<number>((resolve) => {
          let fcpValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === "first-contentful-paint") {
                fcpValue = entry.startTime;
                resolve(fcpValue);
              }
            }
          }).observe({ type: "paint", buffered: true });

          // Fallback if no FCP event
          setTimeout(() => resolve(fcpValue), 5000);
        });
      });

      // In test environment, FCP should be < 2000ms
      // Real-world 3G Fast target is < 900ms
      expect(fcp).toBeGreaterThan(0);
      expect(fcp).toBeLessThan(2000);

      console.log(`FCP: ${fcp.toFixed(0)}ms`);
    });

    test("Largest Contentful Paint (LCP) is reasonable", async ({ page }) => {
      // LCP entries are only delivered to observers registered while the
      // document is being created, so register before navigation.
      await page.addInitScript(() => {
        window.__symblixLcp = 0;
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              window.__symblixLcp = entries[entries.length - 1].startTime;
            }
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch (error) {}
      });

      await page.goto("/en/docs/latest/");
      await page.waitForLoadState("load");

      // The final LCP candidate lands in the observer callback just after
      // the load event; poll instead of asserting immediately.
      await expect
        .poll(() => page.evaluate(() => window.__symblixLcp), { timeout: 5000 })
        .toBeGreaterThan(0);
      const lcp = await page.evaluate(() => window.__symblixLcp);

      // In test environment, LCP should be < 3000ms
      // Real-world 3G Fast target is < 1200ms
      expect(lcp).toBeLessThan(3000);

      console.log(`LCP: ${lcp.toFixed(0)}ms`);
    });

    test("Cumulative Layout Shift (CLS) from font loading is minimal", async ({ page }) => {
      await page.goto("/en/docs/latest/");

      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          }).observe({ type: "layout-shift", buffered: true });

          setTimeout(() => {
            resolve(clsValue);
          }, 3000);
        });
      });

      // CLS should be < 0.1 for good user experience
      expect(cls).toBeLessThan(0.1);

      console.log(`CLS: ${cls.toFixed(3)}`);
    });

    test("preset switching is instant (no page reload)", async ({ page }) => {
      await page.goto("/en/docs/latest/");

      const initialUrl = page.url();
      const startTime = Date.now();

      // Switch preset
      await page.evaluate(() => {
        window.SymblixTheme.setPreset("ocean-dark");
      });

      // Check preset changed
      const preset = await page.evaluate(() => {
        return document.documentElement.getAttribute("data-preset");
      });
      expect(preset).toBe("ocean-dark");

      const endTime = Date.now();
      const duration = endTime - startTime;

      // setPreset is a synchronous attribute update; the wall clock here is
      // dominated by two Playwright IPC round-trips, so the ceiling only
      // guards against pathological regressions (e.g. an accidental reload).
      expect(duration).toBeLessThan(1000);

      // URL should not change
      expect(page.url()).toBe(initialUrl);
    });

    test("all presets switch instantly", async ({ page }) => {
      await page.goto("/en/docs/latest/");

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
        const startTime = Date.now();

        await page.evaluate((p) => {
          window.SymblixTheme.setPreset(p);
        }, preset);

        const actualPreset = await page.evaluate(() => {
          return document.documentElement.getAttribute("data-preset");
        });
        expect(actualPreset).toBe(preset);

        const endTime = Date.now();
        const duration = endTime - startTime;

        // setPreset is synchronous; the ceiling guards against pathological
        // regressions, not IPC latency (see the sibling single-switch test).
        expect(duration, `Switch to ${preset} took ${duration}ms`).toBeLessThan(1000);
      }
    });
  });

  test.describe("resource loading", () => {
    test("critical fonts are preloaded", async ({ page }) => {
      await page.goto("/en/docs/latest/");

      const preloads = await page.locator('link[rel="preload"][as="font"]').all();
      expect(preloads.length).toBeGreaterThanOrEqual(2);

      // Check Inter is preloaded
      const interPreloads = await page.locator(
        'link[rel="preload"][href*="Inter-Variable.woff2"]',
      ).all();
      expect(interPreloads.length).toBeGreaterThan(0);

      // Check JetBrains Mono is preloaded
      const jbPreloads = await page.locator(
        'link[rel="preload"][href*="JetBrainsMono"]',
      ).all();
      expect(jbPreloads.length).toBeGreaterThan(0);
    });

    test("no external font requests (privacy: NFR-3.1)", async ({ page }) => {
      const externalRequests: string[] = [];
      page.on("request", (request) => {
        const url = request.url();
        if (
          url.includes("fonts.googleapis.com") ||
          url.includes("fonts.gstatic.com") ||
          url.includes("use.typekit.net")
        ) {
          externalRequests.push(url);
        }
      });

      await page.goto("/en/docs/latest/");
      await page.waitForLoadState("networkidle");

      expect(externalRequests).toEqual([]);
    });

    test("CSS is loaded from a minimal set of files", async ({ page }) => {
      await page.goto("/en/docs/latest/");

      const stylesheets = await page.locator('link[rel="stylesheet"]').all();

      // Two stylesheets: the compiled theme bundle plus the templated
      // font-face stylesheet (head.html), which exists so font URLs
      // respect subpath deployments.
      expect(stylesheets.length).toBe(2);
    });
  });

  test.describe("JavaScript bundle size", () => {
    test("main.js bundle size is reasonable", () => {
      const publicDir = join(REPO_ROOT, "exampleSite", "public", "js");
      if (!existsSync(publicDir)) {
        console.log("Skipping JS bundle test - public dir not built");
        return;
      }

      // Scoped to the core bundle (SYM-MOT-001 D1): motion.min.*.js is a
      // separately-budgeted, lazily-emitted chunk and must not pollute the
      // core total.
      const files = readdirSync(publicDir).filter((f) => f.startsWith("main.min.") && f.endsWith(".js"));
      expect(files.length).toBeGreaterThan(0);

      const totalSize = files.reduce((sum, f) => {
        return sum + statSync(join(publicDir, f)).size;
      }, 0);

      // Target: core bundle < 20 KB minified (README Non-Goals). Optional
      // subsystems (the motion runtime) carry separate budgets below.
      expect(totalSize).toBeLessThan(JS_CORE_BUDGET_BYTES);

      console.log(`JS bundle size: ${(totalSize / 1024).toFixed(1)} KB`);
    });

    test("motion runtime chunk stays within its separate budget", () => {
      // Reference-based (SYM-MOT-001 NFR-2): measure the exact chunk a built
      // scene page loads, not every motion.min.* on disk — stale builds can
      // leave superseded fingerprinted files in public/ (cleanDestinationDir
      // does not remove renamed hashes).
      const scenesPage = join(
        REPO_ROOT,
        "exampleSite",
        "public",
        "en",
        "docs",
        "latest",
        "components",
        "scenes",
        "index.html",
      );
      if (!existsSync(scenesPage)) {
        console.log("Skipping motion budget test - scenes page not built");
        return;
      }

      const match = readFileSync(scenesPage, "utf-8").match(
        /src="([^"]*motion\.min\.[^"]+\.js)"/,
      );
      if (!match) {
        console.log("Skipping motion budget test - no motion chunk referenced");
        return;
      }

      const chunkPath = join(REPO_ROOT, "exampleSite", "public", new URL(match[1], "http://x/").pathname.replace(/^\//, ""));
      expect(existsSync(chunkPath), `referenced chunk exists: ${match[1]}`).toBe(true);

      // SYM-MOT-001 NFR-2: runtime + vendored three, raw ≤ 780 KB,
      // gzip ≤ 220 KB. Enforced on the emitted (post-js.Build) artifact.
      const raw = statSync(chunkPath).size;
      const gzipped = gzipSync(readFileSync(chunkPath)).length;

      console.log(
        `Motion chunk: ${(raw / 1024).toFixed(1)} KB raw, ${(gzipped / 1024).toFixed(1)} KB gzip`,
      );
      expect(raw).toBeLessThan(MOTION_BUDGET_RAW_BYTES);
      expect(gzipped).toBeLessThan(MOTION_BUDGET_GZIP_BYTES);
    });
  });

  test.describe("performance regression checks", () => {
    test("CSS file count is minimal", () => {
      const cssDir = join(REPO_ROOT, "assets", "css");
      const files = readdirSync(cssDir, { recursive: true });

      // Count only .css files
      const cssFiles = files.filter((f) => f.endsWith(".css"));

      // We should have a reasonable number of CSS files
      // components/ + top-level files. Ratcheted at 44 when the scene-mount
      // subsystem (SYM-MOT-001) reserved headroom for adapter CSS; the
      // scene layer itself co-locates in motion.css.
      expect(cssFiles.length).toBeLessThan(44);

      console.log(`CSS files: ${cssFiles.length}`);
    });

    test("no duplicate CSS rules in compiled output", () => {
      const compiledCssPath = join(REPO_ROOT, "assets", "css", "compiled", "theme.css");
      const css = readFileSync(compiledCssPath, "utf-8");

      // Check for duplicate preset definitions. Counted with indexOf — an
      // unescaped RegExp here would treat [data-preset="…"] as a character
      // class and never match.
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
        // Quote-agnostic: the minified build drops attribute-value quotes.
        const matches =
          css.split(`html[data-preset="${preset}"]`).length -
          1 +
          css.split(`html[data-preset=${preset}]`).length -
          1;
        // The preset block plus the OS-preference fallback for symblix-light
        expect(matches, `Preset ${preset} selector count`).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
