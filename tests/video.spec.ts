import { expect, test } from "@playwright/test";

const videoPage = "/en/docs/latest/components/video/";

test("self-hosted video renders a native player with controls", async ({ page }) => {
  await page.goto(videoPage);
  const video = page.locator(".docs-video video").first();
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("controls", "");
  await expect(video).toHaveAttribute("playsinline", "");
  const poster = await video.getAttribute("poster");
  expect(poster).toBeTruthy();
  const response = await page.request.get(poster!);
  expect(response.ok()).toBeTruthy();
});

test("youtube facade ships no iframe and makes no third-party request on load", async ({ page }) => {
  const thirdParty: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!url.hostname.startsWith("127.0.0.1") && url.hostname !== "localhost") {
      thirdParty.push(request.url());
    }
  });
  await page.goto(videoPage);
  const facade = page.locator("[data-video-facade]").first();
  await expect(facade).toBeVisible();
  await expect(page.locator(".docs-video iframe")).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(thirdParty).toEqual([]);
});

test("clicking the facade swaps in the nocookie player", async ({ page }) => {
  await page.goto(videoPage);
  const facade = page.locator("[data-video-facade]").first();
  await facade.click();
  const iframe = page.locator(".docs-video__embed").first();
  await expect(iframe).toBeVisible();
  const src = await iframe.getAttribute("src");
  expect(src).toContain("youtube-nocookie.com/embed/");
  expect(src).toContain("autoplay=1");
  await expect(iframe).toHaveAttribute("title", /.+/);
});

test("facade keeps the video reachable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(videoPage);
  const fallback = page.locator(".docs-video__fallback").first();
  await expect(fallback).toBeVisible();
  const href = await fallback.getAttribute("href");
  expect(href).toContain("youtube-nocookie.com/watch?v=");
  await expect(fallback.locator(".docs-video__fallback-label")).toContainText(/watch on youtube/i);
  await expect(page.locator(".docs-video video").first()).toBeVisible();
  await context.close();
});
