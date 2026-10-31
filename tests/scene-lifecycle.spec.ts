import { expect, test } from '@playwright/test';
import { fixture, live, mount, probe, PROBE_MODULE } from './helpers/scene-fixture';
import { sceneLive } from './helpers/motion';

test('last scene pauses and resumes real callbacks three times', async ({ page }) => {
  await fixture(page, `${mount('control')}<div class="spacer"></div>`);
  await live(page, 'control');
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
    await expect(page.locator('#control')).toHaveAttribute('data-scene-state', 'paused');
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const paused = (await probe(page, 'control')).frames;
    await page.waitForTimeout(250);
    expect((await probe(page, 'control')).frames).toBe(paused);
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await live(page, 'control');
    await expect.poll(async () => (await probe(page, 'control')).frames, {timeout:1000}).toBeGreaterThan(paused + 2);
    expect(Number.isFinite((await probe(page, 'control')).velocity)).toBe(true);
  }
});

test('a delayed import is not framed while its sibling runs', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const response = page.waitForRequest('**/__motion_probe__slow.js');
  await fixture(page, `<div class="row">${mount('fast')}${mount('slow')}</div>`, PROBE_MODULE,
    async () => { await page.route('**/__motion_probe__slow.js', async route => {
      await held; await route.fulfill({contentType:'text/javascript',body:PROBE_MODULE});
    }); });
  try {
    await response;
    await live(page, 'fast');
    await expect.poll(async () => (await probe(page, 'fast')).frames).toBeGreaterThan(3);
    await expect(page.locator('#slow')).toHaveAttribute('data-scene-state', 'loading');
    expect(await probe(page, 'slow')).toBeUndefined();
    release();
    await live(page, 'slow'); await live(page, 'fast');
  } finally { release(); }
});

test('offscreen resize and palette changes are reconciled before resumed frames', async ({ page }) => {
  await fixture(page, `${mount('resized')}<div class="spacer"></div>`);
  await live(page, 'resized');
  await page.evaluate(() => window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  await expect(page.locator('#resized')).toHaveAttribute('data-scene-state', 'paused');
  const before = (await probe(page, 'resized')).resizes;
  await page.locator('#resized').evaluate(el => { el.style.width='240px'; el.style.setProperty('--docs-scene-height','190px'); });
  await page.waitForTimeout(100); // allow a real ResizeObserver delivery while paused
  expect((await probe(page, 'resized')).resizes).toBe(before);
  await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
  await live(page, 'resized');
  await expect.poll(async () => (await probe(page, 'resized')).resizes).toBeGreaterThan(before);
  await expect.poll(async () => {
    const p = await probe(page, 'resized');
    return p.frameWidth === Math.round(p.width*p.dpr) && p.frameHeight === Math.round(p.height*p.dpr);
  }).toBe(true);
  const after = await probe(page, 'resized');
  expect(after.frameWidth).toBe(Math.round(after.width*after.dpr));
  expect(after.frameHeight).toBe(Math.round(after.height*after.dpr));
  expect(after.width).toBeLessThan(250);
});

test('partial factory failure and frame failure dispose once without stopping siblings', async ({ page }) => {
  await fixture(page, `<div class="row">${mount('partial','data-create-throw="true"')}${mount('healthy')}${mount('survivor')}</div>`);
  await expect(page.locator('#partial')).toHaveAttribute('data-scene-state','error');
  expect((await probe(page,'partial')).cleanups).toBe(1);
  expect((await probe(page,'partial')).disposes).toBe(0);
  await live(page,'healthy');
  await live(page,'survivor');
  const survivingBefore=(await probe(page,'survivor')).frames;
  const before=(await probe(page,'healthy')).frames;
  await page.locator('#healthy').evaluate(el=>{el.dataset.frameThrow='true'});
  await expect(page.locator('#healthy')).toHaveAttribute('data-scene-state','error');
  const result=await probe(page,'healthy');
  expect(result.frames).toBeGreaterThanOrEqual(before);
  expect(result.disposes).toBe(1);expect(result.cleanups).toBe(1);
  await page.evaluate(()=>{
    document.querySelector('#healthy')?.dispatchEvent(new Event('webglcontextrestored'));
    window.SymblixMotion.destroyHost(document.querySelector('#healthy'));
    window.SymblixMotion.destroyHost(document.querySelector('#healthy'));
  });
  expect((await probe(page,'healthy')).disposes).toBe(1);
  await expect.poll(async ()=>(await probe(page,'survivor')).frames).toBeGreaterThan(survivingBefore+2);
});

test('destroy while import is pending prevents late construction', async ({ page }) => {
  let release!: () => void;
  const held=new Promise<void>(r=>{release=r});
  await fixture(page, `${mount('starter')}<div class="spacer"></div>${mount('pending')}`);
  await live(page, 'starter');
  await page.route('**/__motion_probe__late.js',async route=>{await held;await route.fulfill({contentType:'text/javascript',body:PROBE_MODULE})});
  // Fresh click mount reuses the real registration operation.
  await page.evaluate(()=>{
    const el=document.querySelector('#pending');
    window.SymblixMotion.destroyHost(el);
    el.removeAttribute('data-scene-bound');el.dataset.sceneState='idle';
    el.dataset.sceneSrc='/__motion_probe__late.js';
  });
  const requested=page.waitForRequest('**/__motion_probe__late.js');
  await page.evaluate(async()=>{
    window.SymblixMotion.register();
    document.querySelector('#pending').scrollIntoView({block:'center',behavior:'instant'});
  });
  try {
    await requested;
    await page.evaluate(()=>window.SymblixMotion.destroyHost(document.querySelector('#pending')));
    release();await page.waitForTimeout(200);
    expect(await probe(page,'pending')).toBeUndefined();
    await expect(page.locator('#pending canvas')).toHaveCount(0);
    await expect(page.locator('#pending')).toHaveAttribute('data-scene-state','disposed');
  } finally {release()}
});

test('context loss reconstructs once; second loss is terminal and cleanup balanced', async ({ page }) => {
  await fixture(page,mount('recover'));
  await live(page,'recover');
  async function lose() {
    await page.locator('#recover canvas').evaluate((canvas:HTMLCanvasElement)=>{
      const ext=canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context');
      if(!ext)throw new Error('required context-loss extension missing');
      (window as any).__retainedLoss=ext;ext.loseContext();
    });
  }
  await lose();
  await expect(page.locator('#recover')).toHaveAttribute('data-scene-state','recovering');
  expect((await probe(page,'recover')).disposes).toBe(1);
  await page.evaluate(()=>(window as any).__retainedLoss.restoreContext());
  await live(page,'recover');
  expect((await probe(page,'recover')).creates).toBe(2);
  await lose();
  await expect(page.locator('#recover')).toHaveAttribute('data-scene-state','error');
  await expect(page.locator('#recover canvas')).toHaveCount(0);
  expect((await probe(page,'recover')).cleanups).toBe(2);
  expect((await probe(page,'recover')).disposes).toBe(2);
  await page.evaluate(()=>document.querySelector('#recover')!.dispatchEvent(new Event('webglcontextrestored')));
  expect((await probe(page,'recover')).creates).toBe(2);
});

test('50 actual generations release canvas listeners, global listeners, and observers', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const listeners = new WeakMap<EventTarget, Map<string, Set<EventListener>>>();
    const add=EventTarget.prototype.addEventListener, remove=EventTarget.prototype.removeEventListener;
    const key=(type:string,opts:any)=>`${type}:${typeof opts==='boolean'?opts:!!opts?.capture}`;
    EventTarget.prototype.addEventListener=function(type,fn,opts){
      if(fn){let map=listeners.get(this);if(!map){map=new Map();listeners.set(this,map)}
        const k=key(type,opts);if(!map.has(k))map.set(k,new Set());map.get(k)!.add(fn as EventListener);}
      return add.call(this,type,fn,opts);
    };
    EventTarget.prototype.removeEventListener=function(type,fn,opts){
      if(fn)listeners.get(this)?.get(key(type,opts))?.delete(fn as EventListener);
      return remove.call(this,type,fn,opts);
    };
    (window as any).__activeListeners=(target:EventTarget)=>[...(listeners.get(target)?.values()||[])].reduce((n,s)=>n+s.size,0);
    const observed=new Set<object>();
    for(const name of ['IntersectionObserver','ResizeObserver','MutationObserver'] as const){
      const Original=window[name];
      (window as any)[name]=class extends Original {
        observe(...args:any[]){observed.add(this);return Original.prototype.observe.apply(this,args)}
        disconnect(){observed.delete(this);return Original.prototype.disconnect.call(this)}
      };
    }
    (window as any).__observerCount=()=>observed.size;
  });
  await fixture(page,mount('cycled'));
  for(let i=0;i<50;i++){
    if(i)await page.evaluate(()=>window.SymblixMotion.register());
    await live(page,'cycled');
    const result=await page.evaluate(()=>{
      const canvas=document.querySelector('#cycled canvas')!;
      window.SymblixMotion.destroyHost(document.querySelector('#cycled'));
      window.SymblixMotion.destroyHost(document.querySelector('#cycled'));
      return {
        canvasListeners:(window as any).__activeListeners(canvas),
        mountListeners:(window as any).__activeListeners(document.querySelector('#cycled')),
        observers:(window as any).__observerCount(),hosts:window.SymblixMotion.hosts.size,
      };
    });
    expect(result).toEqual({canvasListeners:0,mountListeners:0,observers:0,hosts:0});
  }
  const result=await probe(page,'cycled');
  expect(result.creates).toBe(50);expect(result.disposes).toBe(50);expect(result.cleanups).toBe(50);
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('a throwing dispose getter cannot interrupt cleanup or sibling frames',async({page})=>{
  const module=PROBE_MODULE.replace('dispose() { p.disposes++; },',
    "get dispose() { if(ctx.mount.id==='getter')throw new Error('dispose getter');return ()=>{p.disposes++}; },");
  await fixture(page,`<div class="row">${mount('getter')}${mount('neighbor')}</div>`,module);
  await expect(page.locator('#getter')).toHaveAttribute('data-scene-state','error');
  await expect(page.locator('#getter canvas')).toHaveCount(0);
  expect((await probe(page,'getter')).cleanups).toBe(1);
  await live(page,'neighbor');
  const before=(await probe(page,'neighbor')).frames;
  await expect.poll(async()=>(await probe(page,'neighbor')).frames).toBeGreaterThan(before+2);
});

test('the real vendored THREE renderer recovers once on a fresh canvas',async({page})=>{
  await sceneLive(page);
  const stage=page.locator('[data-scene]');
  const oldCanvas=await stage.locator('canvas').elementHandle();
  async function lose(){
    await stage.locator('canvas').evaluate((el:HTMLCanvasElement)=>{
      const ext=el.getContext('webgl2')!.getExtension('WEBGL_lose_context');
      if(!ext)throw new Error('required loss extension missing');
      (window as any).__realLoss=ext;ext.loseContext();
    });
  }
  await lose();
  await expect(stage).toHaveAttribute('data-scene-state','recovering');
  await expect.poll(()=>stage.locator('img').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  await page.evaluate(()=>(window as any).__realLoss.restoreContext());
  await expect(stage).toHaveAttribute('data-scene-state','live');
  expect(await oldCanvas!.evaluate(el=>el.isConnected)).toBe(false);
  await expect(stage.locator('canvas')).toHaveCount(1);
  const before=await page.evaluate(()=>[...window.SymblixMotion.hosts.values()][0].frameCount);
  await expect.poll(()=>page.evaluate(()=>[...window.SymblixMotion.hosts.values()][0].frameCount)).toBeGreaterThan(before+2);
  await lose();
  await expect(stage).toHaveAttribute('data-scene-state','error');
  await expect(stage.locator('canvas')).toHaveCount(0);
});
