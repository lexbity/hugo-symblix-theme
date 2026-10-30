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
  // Every row of the degradation matrix, live (see the fixtures page):
  // per-mount outcomes must match exactly, siblings unaffected.
  const EXPECTED = {
    "Fixture — createScene throws": "error",
    "Healthy control": "live",
    "Fixture — module throws at import": "error",
    "Fixture — bad export shape": "error",
    "Fixture — scene API mismatch": "error",
    "Fixture — click-gated createScene throw": "idle",
    "Click-to-load control": "idle",
  };

  async function statesByTitle(page) {
    // paused normalizes to live: pause means "was live, currently offscreen"
    // (FR-14) — after the scroll sequence ends, earlier mounts are paused
    // and that IS their designed outcome.
    return page.locator("[data-scene]").evaluateAll((els) =>
      Object.fromEntries(
        els.map((el) => {
          const state = el.dataset.sceneState === "paused" ? "live" : el.dataset.sceneState;
          return [el.getAttribute("aria-label"), state];
        }),
      ),
    );
  }

  test("every degradation-matrix row lands in its designed state", async ({ page }) => {
    await page.goto(FIXTURE_PAGE);
    const mounts = page.locator("[data-scene]");
    await expect(mounts).toHaveCount(7);

    // Scroll each mount through the viewport sequentially (instant jumps
    // can skip IntersectionObserver detection).
    for (let i = 0; i < 7; i++) {
      await mounts.nth(i).evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(200);
    }

    await expect
      .poll(() => statesByTitle(page), { timeout: 3000 })
      .toEqual(EXPECTED);

    // Failed scenes keep the poster standing.
    const postersVisible = await page
      .locator('[data-scene-state="error"] .docs-scene__poster')
      .evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === "1"));
    expect(postersVisible).toBe(true);

    // One Host per mount, all registered.
    const hostCount = await page.evaluate(() => window.SymblixMotion.hosts.size);
    expect(hostCount).toBe(7);
  });

  test("click-gated fixtures resolve on activation: one to error, one to live", async ({
    page,
  }) => {
    await page.goto(FIXTURE_PAGE);
    const mounts = page.locator("[data-scene]");
    await expect(mounts).toHaveCount(7);
    for (let i = 0; i < 7; i++) {
      await mounts.nth(i).evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(150);
    }

    // Buttons are real, keyboard-focusable, and localized (en).
    const buttons = page.locator("[data-scene-activate]");
    await expect(buttons).toHaveCount(2);
    await expect(buttons.first()).toHaveText("Load interactive scene");

    // Keyboard activation of the working control (last mount).
    const control = mounts.nth(6);
    await control.scrollIntoViewIfNeeded();
    const controlButton = control.locator("[data-scene-activate]");
    await controlButton.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => control.getAttribute("data-scene-state"), { timeout: 3000 })
      .toBe("live");

    // Keyboard activation of the broken click-gated fixture: one strike,
    // then the button is gone (no retry) and the poster stands.
    const gated = mounts.nth(5);
    await gated.scrollIntoViewIfNeeded();
    await gated.locator("[data-scene-activate]").focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => gated.getAttribute("data-scene-state"), { timeout: 3000 })
      .toBe("error");
    // display:none — the node remains in the DOM, hidden (no retry).
    await expect(gated.locator("[data-scene-activate]")).toBeHidden();

    const states = await statesByTitle(page);
    expect(states["Click-to-load control"]).toBe("live");
    expect(states["Fixture — click-gated createScene throw"]).toBe("error");
  });
});

test.describe("click degradation (P6)", () => {
  test.use({ javaScriptEnabled: false });

  test("activate button is absent without JavaScript (noscript rule)", async ({ page }) => {
    await page.goto(FIXTURE_PAGE);
    // The markup exists (the server cannot know JS is off); the noscript
    // stylesheet hides the dead controls — assert hidden, not absent.
    await expect(page.locator("[data-scene-activate]")).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(page.locator("[data-scene-activate]").nth(i)).toBeHidden();
    }
    // Posters remain the whole content.
    await expect(page.locator("[data-scene] .docs-scene__poster").first()).toBeVisible();
  });
});

test.describe("chaos (P6)", () => {
  test("context loss recovers exactly once; the second loss is terminal", async ({ page }) => {
    test.skip(!(await hasWebGL2(page)), "context-loss choreography needs WebGL2");
    await page.goto(FIXTURE_PAGE);
    const control = page.locator('[data-scene][aria-label="Healthy control"]');
    await control.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect
      .poll(() => control.getAttribute("data-scene-state"), { timeout: 3000 })
      .toBe("live");

    // Retain the extension on window at live state: after loss, Chromium
    // returns null for a fresh getExtension lookup on the lost context,
    // but the retained object stays callable (that is its purpose).
    // Functions do not survive evaluate serialization — lose/restore run
    // page-side.
    async function loseAndRestore() {
      await control.locator(".docs-scene__canvas").evaluate((el) => {
        const ext = el.getContext("webgl2").getExtension("WEBGL_lose_context");
        if (!ext) throw new Error("WEBGL_lose_context unavailable");
        window.__loseExt = ext;
        ext.loseContext();
      });
      await expect
        .poll(() => control.getAttribute("data-scene-state"), { timeout: 3000 })
        .toBe("error");
      await control.locator(".docs-scene__canvas").evaluate((el) => {
        window.__loseExt.restoreContext();
      });
    }

    // First loss: exactly one automatic re-init back to live.
    await loseAndRestore();
    await expect
      .poll(() => control.getAttribute("data-scene-state"), { timeout: 4000 })
      .toBe("live");

    // Second loss: terminal — restore fires but the host stays error.
    await loseAndRestore();
    await control.locator(".docs-scene__canvas").evaluate((el) => {
      el.getContext("webgl2").getExtension("WEBGL_lose_context").restoreContext();
    });
    await page.waitForTimeout(800);
    expect(await control.getAttribute("data-scene-state")).toBe("error");
    // Poster stands after the terminal loss.
    await expect(control.locator(".docs-scene__poster")).toBeVisible();
  });

  test("failure cycles do not leak canvases or listeners; destroy() releases a host", async ({
    page,
  }) => {
    test.skip(!(await hasWebGL2(page)), "listener accounting needs a live host");
    // Count addEventListener calls per element from the very first script.
    await page.addInitScript(() => {
      window.__listenerAdds = new Map();
      const orig = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, fn, opts) {
        const map = window.__listenerAdds;
        map.set(this, (map.get(this) || 0) + 1);
        return orig.call(this, type, fn, opts);
      };
    });

    await page.goto(FIXTURE_PAGE);
    const control = page.locator('[data-scene][aria-label="Healthy control"]');
    await control.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect
      .poll(() => control.getAttribute("data-scene-state"), { timeout: 3000 })
      .toBe("live");

    const canvasesBefore = await page.locator("[data-scene] canvas").count();

    // Cycle 1: loss → the single designed re-init (Q5) → live on a fresh
    // canvas — no accumulation, bounded listeners. The extension is
    // retained at live state (post-loss getExtension lookups return null).
    await control.locator(".docs-scene__canvas").evaluate((el) => {
      const e = el.getContext("webgl2").getExtension("WEBGL_lose_context");
      if (!e) throw new Error("WEBGL_lose_context unavailable");
      window.__loseExt = e;
      e.loseContext();
    });
    await expect
      .poll(() => control.getAttribute("data-scene-state"), { timeout: 3000 })
      .toBe("error");
    await control.locator(".docs-scene__canvas").evaluate((el) => {
      window.__loseExt.restoreContext();
    });
    await expect
      .poll(() => control.getAttribute("data-scene-state"), { timeout: 4000 })
      .toBe("live");

    // Cycle 2: terminal by design — restore fires, the host stays error.
    await control.locator(".docs-scene__canvas").evaluate((el) => {
      const e = el.getContext("webgl2").getExtension("WEBGL_lose_context");
      if (!e) throw new Error("WEBGL_lose_context unavailable");
      window.__loseExt = e;
      e.loseContext();
    });
    await expect
      .poll(() => control.getAttribute("data-scene-state"), { timeout: 3000 })
      .toBe("error");
    await control.locator(".docs-scene__canvas").evaluate((el) => {
      window.__loseExt.restoreContext();
    });
    await page.waitForTimeout(800);
    expect(await control.getAttribute("data-scene-state")).toBe("error");

    // Canvas replaced wholesale on re-init, never accumulated.
    expect(await page.locator("[data-scene] canvas").count()).toBe(canvasesBefore);

    // The canvas carries exactly its bounded listener set: 2 runtime
    // (contextlost/restored) + 3 three.js WebGLRenderer context handlers —
    // the same count a fresh canvas gets, so re-init added nothing.
    const canvasListeners = await control.locator(".docs-scene__canvas").evaluate((el) => {
      const map = window.__listenerAdds;
      let total = 0;
      map.forEach((v, k) => {
        if (k === el) total = v;
      });
      return total;
    });
    expect(canvasListeners).toBe(5);

    // destroy() releases the host completely: map entry gone, listeners
    // removed (a later pointermove adds nothing), poster stays standing.
    const hostsBefore = await page.evaluate(() => window.SymblixMotion.hosts.size);
    await page.evaluate(() => {
      const mount = document.querySelector('[aria-label="Fixture — createScene throws"]');
      window.SymblixMotion.destroyHost(mount);
    });
    expect(await page.evaluate(() => window.SymblixMotion.hosts.size)).toBe(hostsBefore - 1);
    // Count adds scoped to the destroyed mount element (a page-wide sum
    // would race with injected tooling like livereload).
    const addsOnDestroyed = () =>
      page.evaluate(() => {
        const map = window.__listenerAdds;
        return map.get(document.querySelector('[aria-label="Fixture — createScene throws"]')) || 0;
      });
    const addsBefore = await addsOnDestroyed();
    await page
      .locator('[aria-label="Fixture — createScene throws"]')
      .evaluate((el) => el.dispatchEvent(new PointerEvent("pointermove", { bubbles: true })));
    const addsAfter = await addsOnDestroyed();
    expect(addsAfter).toBe(addsBefore);
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
    await expect(mounts).toHaveCount(7);
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
