// Write-only capture: produces full-page PNGs under tests/tests/artifacts/ for human
// review and diffing. These are NOT regression baselines and are not compared; see
// devdocs/plans D14 before converting this to toHaveScreenshot.
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

test("visual baselines are captured for desktop and mobile layouts", async ({ page }, testInfo) => {
  const outputDir = path.join(testInfo.config.rootDir, "tests", "artifacts", "visual");
  ensureDir(outputDir);

  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/en/docs/latest/");
  const desktopPath = path.join(outputDir, "en-home-desktop.png");
  await page.screenshot({ path: desktopPath, fullPage: true });
  expect(fs.statSync(desktopPath).size).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/docs/latest/");
  const mobilePath = path.join(outputDir, "en-home-mobile.png");
  await page.screenshot({ path: mobilePath, fullPage: true });
  expect(fs.statSync(mobilePath).size).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/docs/latest/");
  const rtlPath = path.join(outputDir, "ar-home-mobile.png");
  await page.screenshot({ path: rtlPath, fullPage: true });
  expect(fs.statSync(rtlPath).size).toBeGreaterThan(0);
});
