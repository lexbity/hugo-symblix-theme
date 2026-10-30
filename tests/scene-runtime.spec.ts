// Scene runtime battery (SYM-MOT-001 P2–P4): lifecycle to live, fetch
// gating, error isolation, reduced-motion contract, same-origin delivery,
// palette bridge, and scroll/pointer signals.
//
// Contract-of-record assertions read the observable surface only:
// data-scene-state, request URLs, DOM presence, window.SymblixMotion.
// WebGL tests run on SwiftShader in CI; they assert the contract, never
// pixels, and carry the no-WebGL degradation path as a first-class branch.
import { expect, test } from "@playwright/test";
import {
  FIXTURE_PAGE,
  SCENES_PAGE,
  firstHost,
  hasWebGL2,
  sceneLive,
} from "./helpers/motion";

test.describe("lifecycle", () => {
  test("demo scene reaches live with a sized canvas and the poster cross-fades", async ({
    page,
  }) => {
    test.skip(!(await hasWebGL2(page)), "no WebGL2 on this runner — covered by the degradation-path test");
    await sceneLive(page);
    const mount = page.locator("[data-scene]");

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
    test.skip(await hasWebGL2(page), "covered by the live-path test on this runner");
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
    await sceneLive(page);
    const origin = new URL(page.url()).origin;

    // Attached after navigation so the origin is real; the runtime's own
    // fetches (scene module) happen after load and are all captured.
    const offOrigin: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).origin !== origin) offOrigin.push(req.url());
    });
    await page.waitForTimeout(1500);

    expect(offOrigin).toEqual([]);
  });
});

test.describe("registration idempotency", () => {
  test("hosts map stays stable across reflows and repeated checks", async ({ page }) => {
    await sceneLive(page);

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

test.describe("signals (P4)", () => {
  test("pointer signal arms, normalizes, and deactivates on leave", async ({ page }) => {
    await sceneLive(page);

    const box = await page.locator("[data-scene]").boundingBox();
    expect(box).not.toBeNull();

    // Center of the mount → ~(0, 0).
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect
      .poll(() => firstHost(page).then((h) => h.pointer.active))
      .toBe(true);
    const centered = await firstHost(page);
    expect(Math.abs(centered.pointer.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(centered.pointer.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(centered.pointer.x)).toBeLessThan(0.35);
    expect(Math.abs(centered.pointer.y)).toBeLessThan(0.35);

    // Off the mount (top-left page corner) → pointerleave → inactive.
    await page.mouse.move(2, 2);
    await expect
      .poll(() => firstHost(page).then((h) => h.pointer.active))
      .toBe(false);

    // Mirror attribute tracks the armed state.
    const mirror = await page
      .locator("[data-scene]")
      .getAttribute("data-scene-pointer-active");
    expect(mirror).toBe("false");
  });

  test("pointer signal is never armed without pointer=on", async ({ page }) => {
    // The failures page's healthy control mounts pointer="off" (default):
    // host registers, pointer listeners are never attached (Q7).
    await page.goto(FIXTURE_PAGE);
    const mounts = page.locator("[data-scene]");
    await expect(mounts).toHaveCount(3);
    const control = mounts.nth(1); // orbit, pointer="off"
    await control.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect
      .poll(() => control.getAttribute("data-scene-state"), { timeout: 3000 })
      .toBe("live");

    const box = await control.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    const host = await page.evaluate(() => {
      const hosts = [...window.SymblixMotion.hosts.values()];
      const controlHost = hosts.find((h) => h.mount.dataset.scenePointer === "off");
      return {
        armed: controlHost.pointerArmed,
        active: controlHost.signals.pointer.active,
        mirror: controlHost.mount.hasAttribute("data-scene-pointer-active"),
      };
    });
    expect(host.armed).toBe(false);
    expect(host.active).toBe(false);
    expect(host.mirror).toBe(false);
  });

  test("scroll progress clamps to [0,1] and velocity stays finite", async ({ page }) => {
    await sceneLive(page);

    // Scroll to the mount's own transit midpoint (progress ≈ 0.5 there —
    // a page fraction is wrong because the mount sits below a long page).
    const target = await page.locator("[data-scene]").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return Math.max(0, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2);
    });
    await page.evaluate((y) => window.scrollTo(0, y), Math.floor(target));
    await expect
      .poll(() => firstHost(page).then((h) => h.scroll.progress), { timeout: 2000 })
      .toBeGreaterThan(0.2);

    const mid = await firstHost(page);
    expect(mid.scroll.progress).toBeLessThan(0.8);
    expect(Number.isFinite(mid.scroll.velocity)).toBe(true);

    const mount = page.locator("[data-scene]");
    const mirror = parseFloat(await mount.getAttribute("data-scene-scroll"));
    expect(Math.abs(mirror - mid.scroll.progress)).toBeLessThan(0.002);

    // At rest (still live at the midpoint), velocity decays to zero.
    await page.waitForTimeout(300);
    const rest = await firstHost(page);
    expect(Math.abs(rest.scroll.velocity)).toBeLessThan(0.001);

    // Scrolling to the top exits the mount through the bottom of the
    // viewport: the last computed progress is 0.000 (exit boundary).
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect
      .poll(() => mount.getAttribute("data-scene-scroll"), { timeout: 2000 })
      .toBe("0.000");

    // Scrolling far past the mount pauses it (FR-14, battery design): the
    // host leaves the loop and signals freeze — progress 1 exists only at
    // the exact pause boundary, so the honest assertion is the pause.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => mount.getAttribute("data-scene-state"), { timeout: 2000 })
      .toBe("paused");
    const frozen = await firstHost(page);
    expect(Number.isFinite(frozen.scroll.progress)).toBe(true);
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
