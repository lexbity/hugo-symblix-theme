// Shared helpers for the scene spec files (SYM-MOT-001). Not a test file:
// Playwright only collects *.spec.ts.
import { expect, type Page } from "@playwright/test";

export const SCENES_PAGE = "/en/docs/latest/components/scenes/";
export const FIXTURE_PAGE = "/en/docs/latest/components/scene-failures/";
// scenes.md carries two mounts: orbit (scene-0) and the asset-backed
// readiness demo (scene-1). SCENES_PAGE-scoped tests name their mount
// explicitly instead of relying on the old single-mount strictness.
export const ORBIT = '[data-scene-id="scene-0"]';
export const ASSET_MOUNT = '[data-scene-id="scene-1"]';

export async function hasWebGL2(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  });
}

/** Navigate to the demo page and drive the orbit mount to state=live: the
    demo sits below the fold, and the visible init strategy (Q3) correctly
    holds the scene in idle until it scrolls into view. */
export async function sceneLive(page: Page, selector = ORBIT): Promise<void> {
  await page.goto(SCENES_PAGE);
  await page.locator(selector).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect
    .poll(() => page.locator(selector).getAttribute("data-scene-state"), {
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

/** Jump every animation to its final state so captures and analysis see the
    settled page, never a mid-entrance frame or a pre-reveal word. Infinite
    animations cannot finish and are left running. Shared by the a11y and
    screenshot suites (P7 dedup: one implementation, two former copies). */
export async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => {
      try {
        a.finish();
      } catch {
        /* infinite */
      }
    });
  });
  // Cross-document view transitions (P7) run after load as pseudo-element
  // animations that finish() cannot settle — analysis or capture mid-fade
  // samples semi-transparent content. Wait them out; tolerate absence.
  await page
    .waitForFunction(
      () =>
        !document
          .getAnimations()
          .some((a) =>
            String(
              (a as unknown as { effect?: { pseudoElement?: string } }).effect
                ?.pseudoElement || "",
            ).startsWith("::view-transition"),
          ),
      null,
      { timeout: 3000 },
    )
    .catch(() => {
      /* no VT ran, or it already ended */
    });
}
