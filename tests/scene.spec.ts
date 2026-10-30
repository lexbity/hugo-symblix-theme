// Scene mount contract (SYM-MOT-001 P1): the {{< scene >}} shortcode renders
// complete static markup — sized figure, poster, overlay — with zero
// JavaScript involvement, and invalid configurations fail the build.
// Runtime behavior (lifecycle, palette, signals) lives in scene-runtime.spec.ts.
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..");
const SCENES_PAGE = "/en/docs/latest/components/scenes/";
const FIXTURE_PAGE = "/en/docs/latest/components/scene-fixture/";
const DEMO_TITLE = "Orbit — the reference demo scene";

test.describe("scene mount contract", () => {
  test("renders the full static attribute contract", async ({ page }) => {
    await page.goto(SCENES_PAGE);
    const mount = page.locator("[data-scene]");
    await expect(mount).toHaveCount(1);

    const attrs = await mount.evaluate((el) => ({
      scene: el.hasAttribute("data-scene"),
      runtime: el.getAttribute("data-scene-runtime"),
      state: el.getAttribute("data-scene-state"),
      load: el.getAttribute("data-scene-load"),
      pointer: el.getAttribute("data-scene-pointer"),
      src: el.getAttribute("data-scene-src"),
      id: el.getAttribute("data-scene-id"),
      label: el.getAttribute("aria-label"),
      style: el.getAttribute("style") || "",
    }));
    expect(attrs.scene).toBe(true);
    expect(attrs.runtime).toBe("three");
    expect(attrs.state).toBe("idle");
    expect(attrs.load).toBe("visible");
    expect(attrs.pointer).toBe("off");
    // Fingerprinted site asset, same origin by construction.
    expect(attrs.src).toMatch(/^\/js\/scenes\/orbit\.min\.[a-f0-9]+\.js$/);
    expect(attrs.id).toBe("scene-0");
    expect(attrs.label).toBe(DEMO_TITLE);
    expect(attrs.style).toContain("--docs-scene-aspect: 16 / 9");
  });

  test("overlay is real HTML and the poster is named", async ({ page }) => {
    await page.goto(SCENES_PAGE);
    const mount = page.locator("[data-scene]");
    await expect(mount.locator(".docs-scene__overlay")).toContainText("Real text above the scene");
    const poster = mount.locator(".docs-scene__poster");
    await expect(poster).toHaveAttribute("alt", DEMO_TITLE);
    await expect(poster).toHaveAttribute("src", /scene-orbit-poster\.svg$/);
  });

  test("geometry is CSS-owned before any script exists", async ({ page }) => {
    await page.goto(SCENES_PAGE);
    const box = await page.locator("[data-scene]").evaluate((el) => {
      const s = getComputedStyle(el);
      return { aspectRatio: s.aspectRatio, height: el.getBoundingClientRect().height };
    });
    expect(box.aspectRatio).toMatch(/16\s*\/\s*9/);
    expect(box.height).toBeGreaterThan(50);
  });

  test("mounts on one page get unique stable ids", async ({ page }) => {
    await page.goto(FIXTURE_PAGE);
    const mounts = page.locator("[data-scene]");
    await expect(mounts).toHaveCount(3);
    const ids = await mounts.evaluateAll((els) => els.map((el) => el.getAttribute("data-scene-id")));
    expect(new Set(ids).size).toBe(3);
    expect(ids).toEqual(["scene-0", "scene-1", "scene-2"]);
  });

  // FR-6 emission contract (P2): the runtime chunk is emitted exactly once
  // on pages that contain a scene, and never on pages that do not. The
  // emission keys on the shortcode's Page.Store flag and depends on every
  // template calling scripts.html after .Content — this test holds that
  // invariant across page kinds.
  test("runtime script is emitted once on scene pages, never elsewhere", async ({ page }) => {
    await page.goto(SCENES_PAGE);
    expect(await page.locator('script[type="module"][src*="motion.min."]').count()).toBe(1);

    await page.goto("/en/docs/latest/getting-started/");
    expect(await page.locator('script[type="module"][src*="motion.min."]').count()).toBe(0);

    await page.goto("/en/docs/latest/search/");
    expect(await page.locator('script[type="module"][src*="motion.min."]').count()).toBe(0);
  });
});

test.describe("scene degradation", () => {
  test.describe("no JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("poster and overlay remain the complete content", async ({ page }) => {
      const requested: string[] = [];
      page.on("request", (req) => requested.push(req.url()));
      await page.goto(SCENES_PAGE);

      await expect(page.locator("[data-scene] .docs-scene__poster")).toBeVisible();
      await expect(page.locator("[data-scene] .docs-scene__overlay")).toContainText(
        "Real text above the scene",
      );
      // Nothing may fetch the scene module or runtime without JS.
      expect(requested.filter((u) => /motion\.min|orbit\.min/.test(u))).toEqual([]);
    });
  });

  test("print keeps the poster face", async ({ page }) => {
    await page.emulateMedia({ media: "print" });
    await page.goto(SCENES_PAGE);
    await expect(page.locator("[data-scene] .docs-scene__poster")).toBeVisible();
    await expect(page.locator("[data-scene] .docs-scene__overlay")).toBeVisible();
  });

  test("scene page holds CLS at zero", async ({ page }) => {
    await page.goto(SCENES_PAGE);
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let value = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) value += (entry as any).value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(value), 2500);
      });
    });
    expect(cls).toBeLessThan(0.01);
  });
});

test.describe("build-time validation", () => {
  // Hugo errorf fails the build without halting template execution, so these
  // run in throwaway mini-sites (theme linked via absolute themesDir) and
  // assert the exit code plus the *clean* scene shortcode error — never the
  // secondary nil-resource crash the gate exists to prevent.
  interface BuildResult {
    code: number;
    stderr: string;
    html?: string;
  }

  function buildMiniSite(body: string): BuildResult {
    const dir = mkdtempSync(join(tmpdir(), "scene-validation-"));
    try {
      mkdirSync(join(dir, "content"), { recursive: true });
      mkdirSync(join(dir, "assets", "js", "scenes"), { recursive: true });
      mkdirSync(join(dir, "assets", "images"), { recursive: true });
      writeFileSync(
        join(dir, "hugo.toml"),
        [
          "title = \"scene-validation\"",
          "baseURL = \"http://localhost/\"",
          "theme = \"hugo-theme-symblix\"",
          `themesDir = ${JSON.stringify(join(REPO_ROOT, "exampleSite", "themes"))}`,
          "defaultContentLanguage = \"en\"",
          "disableKinds = [\"taxonomy\", \"term\", \"RSS\", \"sitemap\"]",
          "",
        ].join("\n"),
      );
      cpSync(join(REPO_ROOT, "exampleSite", "assets", "js", "scenes", "orbit.js"), join(dir, "assets", "js", "scenes", "orbit.js"));
      cpSync(join(REPO_ROOT, "exampleSite", "assets", "images", "scene-orbit-poster.svg"), join(dir, "assets", "images", "scene-orbit-poster.svg"));
      writeFileSync(
        join(dir, "content", "note.md"),
        `+++\ntitle = "Note"\n+++\n\n${body}\n`,
      );

      let code = 0;
      let stderr = "";
      try {
        execFileSync("hugo", ["--source", dir, "--destination", join(dir, "public")], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (error: any) {
        code = error.status ?? 1;
        stderr = `${error.stdout || ""}\n${error.stderr || ""}`;
      }

      let html: string | undefined;
      const built = join(dir, "public", "note", "index.html");
      try {
        html = readFileSync(built, "utf8");
      } catch {
        /* failed builds render nothing */
      }
      return { code, stderr, html };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  test("a valid minimal scene builds and renders the contract", () => {
    const result = buildMiniSite(
      '{{< scene src="js/scenes/orbit.js" poster="images/scene-orbit-poster.svg" title="T" >}}Overlay.{{< /scene >}}',
    );
    expect(result.code).toBe(0);
    expect(result.html).toContain("data-scene");
    expect(result.html).toMatch(/data-scene-src="\/js\/scenes\/orbit\.min\.[a-f0-9]+\.js"/);
  });

  const invalid: Array<[string, string, RegExp]> = [
    ["missing title", '{{< scene src="js/scenes/orbit.js" poster="images/scene-orbit-poster.svg" >}}{{< /scene >}}', /title is required/],
    ["absolute URL src", '{{< scene src="https://cdn.example.com/evil.js" poster="images/scene-orbit-poster.svg" title="T" >}}{{< /scene >}}', /must be a site-relative asset path/],
    ["protocol-relative poster", '{{< scene src="js/scenes/orbit.js" poster="//evil.example.com/p.svg" title="T" >}}{{< /scene >}}', /must not be protocol-relative/],
    ["ratio and height together", '{{< scene src="js/scenes/orbit.js" poster="images/scene-orbit-poster.svg" title="T" ratio="16/9" height="20rem" >}}{{< /scene >}}', /mutually exclusive/],
    ["unknown load strategy", '{{< scene src="js/scenes/orbit.js" poster="images/scene-orbit-poster.svg" title="T" load="eager" >}}{{< /scene >}}', /unknown load/],
    ["unresolvable src", '{{< scene src="js/scenes/missing.js" poster="images/scene-orbit-poster.svg" title="T" >}}{{< /scene >}}', /not found in assets/],
  ];

  for (const [name, body, message] of invalid) {
    test(`build fails on ${name} with the clean scene error`, () => {
      const result = buildMiniSite(body);
      expect(result.code, `expected build failure for ${name}`).not.toBe(0);
      expect(result.stderr).toMatch(/ERROR scene shortcode/);
      expect(result.stderr).toMatch(message);
      // The validation gate must prevent the nil-resource secondary crash.
      expect(result.stderr).not.toMatch(/no Resource provided/);
    });
  }
});
