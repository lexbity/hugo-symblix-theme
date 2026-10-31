import { expect, type Page } from '@playwright/test';
import { SCENES_PAGE } from './motion';

export interface SceneProbe {
  creates: number; frames: number; disposes: number; cleanups: number;
  resizes: number; width: number; height: number; dpr: number;
  frameWidth: number; frameHeight: number; dt: number; velocity: number;
}
declare global { interface Window { __motionProbe: Record<string, SceneProbe>; } }

export const PROBE_MODULE = `
export default function createScene(ctx) {
  const p = window.__motionProbe[ctx.mount.id] ||= {
    creates:0, frames:0, disposes:0, cleanups:0, resizes:0,
    width:0, height:0, dpr:0, frameWidth:0, frameHeight:0, dt:0, velocity:0
  };
  p.creates++;
  ctx.onDispose(() => { p.cleanups++; });
  if (ctx.mount.dataset.createThrow) throw new Error('partial-create-probe');
  return {
    frame(t,dt,s) {
      if (ctx.mount.dataset.frameThrow) throw new Error('frame-probe');
      ctx.gl.clearColor(0.1, 0.3, 0.7, 1); ctx.gl.clear(ctx.gl.COLOR_BUFFER_BIT);
      p.frames++; p.dt=dt; p.velocity=s.scroll.velocity;
      p.frameWidth=ctx.canvas.width; p.frameHeight=ctx.canvas.height;
    },
    onResize(w,h,d) { p.resizes++; p.width=w; p.height=h; p.dpr=d; },
    dispose() { p.disposes++; },
  };
}
createScene.api=1;
`;

/** Test-only author modules/markup, using the actual Hugo-built entry and CSS.
 * No production runtime function is replaced by this harness. */
export async function fixture(page: Page, body: string, moduleBody = PROBE_MODULE, beforeNavigate?: () => Promise<void>, waitUntil: "load" | "domcontentloaded" = "load") {
  const source = await page.request.get(SCENES_PAGE);
  expect(source.ok()).toBe(true);
  const html = await source.text();
  const script = html.match(/<script\b[^>]*src="[^"]*\/(?:motion|motion-loader)\.min\.[^"]+"[^>]*><\/script>/)?.[0];
  expect(script, 'built motion entry exists').toBeTruthy();
  const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m => m[0]).join('\n');
  await page.addInitScript(() => { window.__motionProbe = {}; });
  await page.route('**/__motion_probe__*.js', route => route.fulfill({
    contentType: 'text/javascript', body: moduleBody,
  }));
  await page.route('**/__motion_fixture__/', route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html lang="en" data-preset="symblix-light" data-syntax="light"><head>
      <title>Motion contract fixture</title>${styles}
      <style>body{margin:0}main{padding:20px}.row{display:flex;gap:20px}
      [data-scene]{width:min(360px,100%);--docs-scene-height:260px;flex:none}.spacer{height:1800px}</style>
      </head><body><main>${body}</main>${script}</body></html>`,
  }));
  await beforeNavigate?.();
  await page.goto('/__motion_fixture__/', {waitUntil});
}

export function mount(id: string, options = '') {
  const load = options.includes("data-scene-load=") ? "" : 'data-scene-load="visible"';
  const button = options.includes('data-scene-load="click"') ? '<button class="docs-scene__activate" data-scene-activate type="button">Load interactive scene</button>' : "";
  return `<figure id="${id}" class="docs-scene docs-scene--fixed-height" data-scene data-scene-id="${id}"
    ${load} data-scene-state="idle" data-scene-pointer="off"
    data-scene-src="/__motion_probe__${id}.js" aria-label="${id}" ${options}>
    <img class="docs-scene__poster" alt="${id}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='260'%3E%3Crect width='360' height='260' fill='%23eee'/%3E%3C/svg%3E">
    <div class="docs-scene__overlay"><p>${id} static content</p></div>${button}
  </figure>`;
}

export const probe = (page: Page, id: string) => page.evaluate(id => window.__motionProbe[id], id);
export const live = (page: Page, id: string) => expect(page.locator(`#${id}`)).toHaveAttribute('data-scene-state', 'live');
