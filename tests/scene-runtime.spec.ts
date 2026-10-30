// Scene runtime battery (SYM-MOT-001 P2): lifecycle to live, fetch gating,
// error isolation, reduced-motion contract, same-origin delivery.
//
// Contract-of-record assertions read the observable surface only:
// data-scene-state, request URLs, DOM presence, window.SymblixMotion.
// WebGL tests run on SwiftShader in CI; they assert the contract, never
// pixels, and carry the no-WebGL degradation path as a first-class branch.
import { expect, test } from "@playwright/test";

const SCENES_PAGE = "/en/docs/latest/components/scenes/";
const FIXTURE_PAGE = "/en/docs/latest/components/scene-failures/";

test.describe("lifecycle", () => {
  test("demo scene reaches live with a sized canvas and the poster cross-fades", async ({
    page,
  }) => {
    const hasWebGL2 = await page.evaluate(() => {
      try {
        return !!document.createElement("canvas").getContext("webgl2");
      } catch {
        return false;
      }
    });
    test.skip(!hasWebGL2, "no WebGL2 on this runner — covered by the degradation-path test");

    await page.goto(SCENES_PAGE);
    // The demo mount sits below the fold; the visible init strategy (Q3)
    // correctly holds the scene in idle until it scrolls into view.
    await page.locator("[data-scene]").evaluate((el) => el.scrollIntoView({ block: "center" }));
    const mount = page.locator("[data-scene]");

    // NFR-6: conditions-met → live ≤ 3s in the test environment.
    await expect
      .poll(() => mount.getAttribute("data-scene-state"), { timeout: 3000 })
      .toBe("live");

    const canvas = mount.locator(".docs-scene__canvas");
    await expect(canvas).toHaveCount(1);
    const sizing = await canvas.evaluate((el) => ({
      width: el.width,
      height: el.height,
      hidden: el.getAttribute("aria-hidden"),
    }));
    expect(sizing.width).toBeGreaterThan(0);
    expect(sizing.height).toBeGreaterThan(0);
    expect(sizing.hidden).toBe("true");

    // Poster cross-fades out once the first frame rendered.
    await expect
      .poll(() =>
        mount.locator(".docs-scene__poster").evaluate((el) => getComputedStyle(el).opacity),
      )
      .toBe("0");
  });

  test("lifecycle is honest when WebGL2 is unavailable (dual-path contract)", async ({
    page,
  }) => {
    const hasWebGL2 = await page.evaluate(() => {
      try {
        return !!document.createElement("canvas").getContext("webgl2");
      } catch {
        return false;
      }
    });
    test.skip(hasWebGL2, "covered by the live-path test on this runner");
    // On a runner without WebGL2 the graceful path IS the contract.
    await page.goto(SCENES_PAGE);
    await expect
      .poll(() => page.locator("[data-scene]").getAttribute("data-scene-state"), {
        timeout: 3000,
      })
      .toBe("error");
    await expect(page.locator("[data-scene] .docs-scene__poster")).toBeVisible();
  });
});

test.describe("fetch gating", () => {
  test("runtime chunk only on scene pages; scene module only when started", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (req) => requested.push(req.url()));

    await page.goto("/en/docs/latest/getting-started/");
    await page.waitForLoadState("load");
    expect(requested.filter((u) => /motion\.min|orbit\.min/.test(u))).toEqual([]);

    requested.length = 0;
    await page.goto(SCENES_PAGE);
    await page.waitForLoadState("load");
    // The runtime chunk is a build-emitted module script; the scene module
    // is fetched by the runtime after load+idle (FR-13).
    expect(requested.filter((u) => /motion\.min/.test(u)).length).toBe(1);
    await expect
      .poll(() => requested.filter((u) => /orbit\.min/.test(u)).length, { timeout: 3000 })
      .toBe(1);
  });
});

test.describe("error isolation", () => {
  test("broken scenes land in error with the poster intact; live scene unaffected", async ({
    page,
  }) => {
    await page.goto(FIXTURE_PAGE);
    const mounts = page.locator("[data-scene]");
    await expect(mounts).toHaveCount(3);

    // Scroll each mount through the viewport sequentially (instant jumps
    // can skip IntersectionObserver detection): broken scenes fail at
    // createScene (tryStart), the orbit scene starts.
    for (let i = 0; i < 3; i++) {
      await mounts.nth(i).evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(250);
    }

    await expect
      .poll(async () => {
        const errors = await page.locator('[data-scene-state="error"]').count();
        const live = await page.locator('[data-scene-state="live"]').count();
        return errors + live;
      }, { timeout: 3000 })
      .toBe(3);

    expect(await page.locator('[data-scene-state="error"]').count()).toBe(2);
    expect(await page.locator('[data-scene-state="live"]').count()).toBe(1);

    // Failed scenes keep the poster standing.
    const postersVisible = await page
      .locator('[data-scene-state="error"] .docs-scene__poster')
      .evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === "1"));
    expect(postersVisible).toBe(true);

    // One Host per mount, all registered.
    const hostCount = await page.evaluate(() => window.SymblixMotion.hosts.size);
    expect(hostCount).toBe(3);
  });
});

test.describe("reduced motion", () => {
  test("runtime registers but never starts: no scene fetch, no canvas, no context", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requested: string[] = [];
    page.on("request", (req) => requested.push(req.url()));

    await page.goto(SCENES_PAGE);
    await page.waitForLoadState("load");
    await page.waitForTimeout(1200); // idle-callback window in which a fetch would fire

    expect(await page.locator("[data-scene] .docs-scene__canvas").count()).toBe(0);
    expect(await page.locator("[data-scene]").getAttribute("data-scene-state")).toBe("idle");
    expect(requested.filter((u) => /orbit\.min/.test(u))).toEqual([]);

    // Host registered (observable), never scheduled.
    const registered = await page.evaluate(() => ({
      hosts: window.SymblixMotion.hosts.size,
      api: window.SymblixMotion.SCENE_API,
    }));
    expect(registered.hosts).toBe(1);
    expect(registered.api).toBe(1);

    // The poster is the reduced-motion face, fully visible.
    await expect(page.locator("[data-scene] .docs-scene__poster")).toBeVisible();
  });
});

test.describe("same-origin delivery", () => {
  test("zero off-origin requests on a scene page (NFR-5)", async ({ page }) => {
    await page.goto(SCENES_PAGE);
    const origin = new URL(page.url()).origin;

    // Attached after navigation so the origin is real; the runtime's own
    // fetches (scene module) happen after load and are all captured.
    const offOrigin: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).origin !== origin) offOrigin.push(req.url());
    });

    await page.locator("[data-scene]").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);

    expect(offOrigin).toEqual([]);
  });
});

test.describe("registration idempotency", () => {
  test("hosts map stays stable across reflows and repeated checks", async ({ page }) => {
    await page.goto(SCENES_PAGE);
    await page.locator("[data-scene]").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect
      .poll(() => page.locator("[data-scene]").getAttribute("data-scene-state"), {
        timeout: 3000,
      })
      .toBe("live");

    const before = await page.evaluate(() => window.SymblixMotion.hosts.size);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("load"));
    });
    const after = await page.evaluate(() => window.SymblixMotion.hosts.size);
    expect(after).toBe(before);
    expect(after).toBe(1);
  });
});

test.describe("palette bridge", () => {
  // Preset tokens from data/docs_presets.yaml — the bridge must deliver
  // exactly these values as frozen snapshots.
  const PRESET_ACCENTS = {
    "symblix-light": { css: "#2563eb", mode: "light" },
    "symblix-dark": { css: "#4aa3ff", mode: "dark" },
    "ocean-dark": { css: "#38bdf8", mode: "dark" },
    "forest-light": { css: "#166534", mode: "light" },
    "sunset-dark": { css: "#f59e0b", mode: "dark" },
    "solarized-light": { css: "#16678f", mode: "light" },
    "high-contrast": { css: "#0000ff", mode: "light" },
  };

  // Chromium normalizes custom-property colors to minimal hex (#0000ff →
  // #00f); the bridge delivers the browser's computed string, so compare
  // both sides in expanded form.
  function expandHex(h) {
    const m = /^#([0-9a-f]{3})$/i.exec(h.trim());
    if (!m) return h.trim().toLowerCase();
    const [r, g, b] = m[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  async function sceneLive(page) {
    await page.goto(SCENES_PAGE);
    await page.locator("[data-scene]").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect
      .poll(() => page.locator("[data-scene]").getAttribute("data-scene-state"), {
        timeout: 3000,
      })
      .toBe("live");
  }

  test("preset switch re-themes the live scene and flips the mirror", async ({ page }) => {
    await sceneLive(page);

    const initial = await page.evaluate(() => {
      const host = [...window.SymblixMotion.hosts.values()][0];
      return {
        mirror: document.querySelector("[data-scene]").dataset.scenePreset,
        accent: host.palette && host.palette.accent && host.palette.accent.css,
      };
    });
    expect(initial.mirror).toBe("symblix-light");
    expect(initial.accent).toBe("#2563eb");

    await page.evaluate(() => window.SymblixTheme.setPreset("ocean-dark"));
    await expect
      .poll(() => page.locator("[data-scene]").getAttribute("data-scene-preset"))
      .toBe("ocean-dark");

    const after = await page.evaluate(() => {
      const host = [...window.SymblixMotion.hosts.values()][0];
      return {
        accent: host.palette.accent.css,
        mode: host.palette.mode,
        frozen: Object.isFrozen(host.palette),
      };
    });
    expect(after.accent).toBe("#38bdf8");
    expect(after.mode).toBe("dark");
    // The snapshot the scene received is immutable (Q6).
    expect(after.frozen).toBe(true);
  });

  test("all seven presets deliver their accent token and mode", async ({ page }) => {
    await sceneLive(page);

    for (const [preset, expected] of Object.entries(PRESET_ACCENTS)) {
      await page.evaluate((p) => window.SymblixTheme.setPreset(p), preset);
      await expect
        .poll(() => page.locator("[data-scene]").getAttribute("data-scene-preset"), {
          timeout: 2000,
        })
        .toBe(preset);
      const got = await page.evaluate(() => {
        const host = [...window.SymblixMotion.hosts.values()][0];
        return { css: host.palette.accent.css, mode: host.palette.mode };
      });
      expect(expandHex(got.css), `${preset} accent`).toBe(expandHex(expected.css));
      expect(got.mode, `${preset} mode`).toBe(expected.mode);
    }
  });

  test("reduced motion: mirror still tracks presets though the scene never starts", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(SCENES_PAGE);
    await page.waitForLoadState("load");

    // The mirror is a page-wide observability signal, independent of scene
    // lifecycle (P3 decision): the host registers, never starts, but the
    // mount still reports the live preset truthfully.
    await page.evaluate(() => window.SymblixTheme.setPreset("sunset-dark"));
    await expect
      .poll(() => page.locator("[data-scene]").getAttribute("data-scene-preset"))
      .toBe("sunset-dark");

    expect(await page.locator("[data-scene]").getAttribute("data-scene-state")).toBe("idle");
    expect(await page.locator("[data-scene] .docs-scene__canvas").count()).toBe(0);
  });
});
