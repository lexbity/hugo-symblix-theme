// Coarse-pointer exclusion for the pointer signal (SYM-MOT-001 P4, Q7).
//
// Own file because the device fixture must live at file top level
// (Playwright forbids browser-level test.use inside describe groups).
//
// Touch-primary devices: the arming decision is made once at init from
// (pointer: fine) — the demo requests pointer=on but a coarse device never
// arms it (Q7 tradeoff: no mid-session re-arm).
import { devices, expect, test } from "@playwright/test";
import { sceneLive } from "./helpers/motion";

test.use({ ...devices["Pixel 5"] });

test("pointer=on is not armed on touch-primary devices", async ({ page }) => {
  await sceneLive(page);

  const host = await page.evaluate(() => {
    const h = [...window.SymblixMotion.hosts.values()][0];
    return {
      armed: h.pointerArmed,
      active: h.signals.pointer.active,
      mirror: document
        .querySelector("[data-scene]")
        .hasAttribute("data-scene-pointer-active"),
    };
  });
  expect(host.armed).toBe(false);
  expect(host.active).toBe(false);
  expect(host.mirror).toBe(false);
});
