// Shared helpers for the scene spec files (SYM-MOT-001). Not a test file:
// Playwright only collects *.spec.ts.
import { expect, type Page } from "@playwright/test";

export const SCENES_PAGE = "/en/docs/latest/components/scenes/";
export const FIXTURE_PAGE = "/en/docs/latest/components/scene-failures/";

export async function hasWebGL2(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  });
}

/** Navigate to the demo page and drive the mount to state=live: the demo
    sits below the fold, and the visible init strategy (Q3) correctly holds
    the scene in idle until it scrolls into view. */
export async function sceneLive(page: Page): Promise<void> {
  await page.goto(SCENES_PAGE);
  await page.locator("[data-scene]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect
    .poll(() => page.locator("[data-scene]").getAttribute("data-scene-state"), {
      timeout: 3000,
    })
    .toBe("live");
}

/** Snapshot of the first host's observable state via window.SymblixMotion. */
export function firstHost(page: Page) {
  return page.evaluate(() => {
    const host = [...window.SymblixMotion.hosts.values()][0];
    return {
      state: host.state,
      pointerArmed: host.pointerArmed,
      pointer: { ...host.signals.pointer },
      scroll: { ...host.signals.scroll },
    };
  });
}
