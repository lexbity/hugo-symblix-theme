import { expect, test } from "@playwright/test";
import { SCENES_PAGE } from "./helpers/motion";

test("capture what the RAF loop actually draws", async ({ page }) => {
  test.setTimeout(40_000);
  const mount = page.locator('[data-scene-id="scene-1"]');
  await page.goto(SCENES_PAGE, { waitUntil: "load" });
  await mount.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(mount).toHaveAttribute("data-scene-state", "live", { timeout: 10_000 });
  const dataUrl = await mount.evaluate((el: any) => new Promise<string>((resolve) => {
    const canvas = el.querySelector("canvas");
    requestAnimationFrame(() => {
      // Runs AFTER the runtime's RAF render for this tick? No — registration
      // order unknown; poll several frames and keep one where mid-buffer is non-empty.
      const grab = () => { try { return canvas.toDataURL(); } catch { return ""; } };
      const a = grab();
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(grab())));
    });
  }));
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  require("fs").writeFileSync("/tmp/opencode/s6-raf-canvas.png", buf);
  console.log("SNAP bytes", buf.length, dataUrl.slice(0, 30));
});
