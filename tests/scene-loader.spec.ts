import { expect, test, type Page } from '@playwright/test';
import { fixture, live, mount, probe, PROBE_MODULE } from './helpers/scene-fixture';

const motionRequests = (urls:string[]) => urls.filter(u => /\/(?:motion\.min|__motion_probe__)/.test(u));
async function holdIdle(page:Page) {
  await page.addInitScript(()=>{
    const callbacks=new Map<number,IdleRequestCallback>(); let id=0;
    window.requestIdleCallback=(fn)=>{callbacks.set(++id,fn);return id};
    window.cancelIdleCallback=(id)=>{callbacks.delete(id)};
    (window as any).__releaseIdle=()=>{for(const [id,fn] of callbacks){callbacks.delete(id);fn({didTimeout:false,timeRemaining:()=>20})}};
    (window as any).__idleCount=()=>callbacks.size;
  });
}

test('heavy requests wait for the actual document load event',async({page})=>{
  const urls:string[]=[];page.on('request',r=>urls.push(r.url()));
  let release!:()=>void;const held=new Promise<void>(r=>{release=r});
  await fixture(page,`${mount('loaded')}<img alt="load gate" src="/__hold_load__.svg">`,PROBE_MODULE,async()=>{
    await page.route('**/__hold_load__.svg',async route=>{await held;await route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'})});
  },'domcontentloaded');
  try{
    await page.waitForTimeout(150);
    expect(await page.evaluate(()=>document.readyState)).not.toBe('complete');
    expect(motionRequests(urls)).toEqual([]);
    release();await live(page,'loaded');
    expect(urls.filter(u=>/\/motion\.min/.test(u))).toHaveLength(1);
  }finally{release()}
});

test('heavy requests wait for idle and offscreen mounts do not admit the runtime',async({page})=>{
  const urls:string[]=[];page.on('request',r=>urls.push(r.url()));
  await holdIdle(page);
  await fixture(page,`<div class="spacer"></div>${mount('visible')}`);
  expect(motionRequests(urls)).toEqual([]);
  expect(await page.evaluate(()=>(window as any).__idleCount())).toBe(0);
  await page.locator('#visible').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await page.waitForFunction(()=>(window as any).__idleCount()>0);
  expect(motionRequests(urls)).toEqual([]);
  await page.evaluate(()=>(window as any).__releaseIdle());
  await live(page,'visible');
});

test('click-only pages transfer the first keyboard activation across loading',async({page})=>{
  const urls:string[]=[];page.on('request',r=>urls.push(r.url()));
  await fixture(page,mount('clicked','data-scene-load="click"'));
  const button=page.locator('[data-scene-activate]');await expect(button).toBeVisible();
  await page.waitForTimeout(100);expect(motionRequests(urls)).toEqual([]);
  await button.focus();await page.keyboard.press('Enter');
  await live(page,'clicked');
  expect((await probe(page,'clicked')).creates).toBe(1);
  expect(urls.filter(u=>/\/motion\.min/.test(u))).toHaveLength(1);
  expect(urls.filter(u=>/__motion_probe__clicked/.test(u))).toHaveLength(1);
});

test('mixed pages do not import an unactivated click scene',async({page})=>{
  const urls:string[]=[];page.on('request',r=>urls.push(r.url()));
  await fixture(page,`<div class="row">${mount('auto')}${mount('gated','data-scene-load="click"')}</div>`);
  await live(page,'auto');
  expect(urls.filter(u=>/__motion_probe__gated/.test(u))).toEqual([]);
  await page.locator('#gated button').click();await live(page,'gated');
  expect(urls.filter(u=>/\/motion\.min/.test(u))).toHaveLength(1);
});

test('initial reduced motion blocks even programmatic clicks and WebGL construction',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{
    (window as any).__contexts=0;const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2')(window as any).__contexts++;return original.call(this,type,...args)};
  });
  const urls:string[]=[];page.on('request',r=>urls.push(r.url()));
  await fixture(page,`<div class="row">${mount('auto')}${mount('click','data-scene-load="click"')}</div>`);
  await expect(page.locator('button')).toBeHidden();
  await page.locator('button').evaluate((el:HTMLButtonElement)=>el.click());
  await page.waitForTimeout(200);
  expect(motionRequests(urls)).toEqual([]);
  expect(await page.evaluate(()=>(window as any).__contexts)).toBe(0);
  expect(await page.evaluate(()=>typeof window.SymblixMotion)).toBe('undefined');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('revoking motion retires live and pending scenes and latches suppression',async({page})=>{
  let release!:()=>void;const held=new Promise<void>(r=>{release=r});
  const requested=page.waitForRequest('**/__motion_probe__pending.js');
  await fixture(page,`<div class="row">${mount('active')}${mount('pending')}</div>`,PROBE_MODULE,async()=>{
    await page.route('**/__motion_probe__pending.js',async route=>{await held;await route.fulfill({contentType:'text/javascript',body:PROBE_MODULE})});
  });
  try{
    await requested;await live(page,'active');
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect(page.locator('#active')).toHaveAttribute('data-scene-state','disposed');
    const count=(await probe(page,'active')).frames;
    release();await page.waitForTimeout(150);
    expect((await probe(page,'active')).frames).toBe(count);
    expect((await probe(page,'active')).disposes).toBe(1);
    expect(await probe(page,'pending')).toBeUndefined();
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>window.SymblixMotion.register());
    expect(await page.evaluate(()=>window.SymblixMotion.hosts.size)).toBe(0);
  }finally{release()}
});

test('revocation while the runtime response is held prevents late scene construction',async({page})=>{
  let release!:()=>void;const held=new Promise<void>(r=>{release=r});
  const requested=page.waitForRequest(/\/motion\.min\./);
  await fixture(page,mount('late'),PROBE_MODULE,async()=>{
    await page.route(/\/motion\.min\./,async route=>{const response=await route.fetch();await held;await route.fulfill({response})});
  });
  try{
    await requested;await page.emulateMedia({reducedMotion:'reduce'});
    release();await page.waitForTimeout(200);
    expect(await probe(page,'late')).toBeUndefined();
    await expect(page.locator('canvas')).toHaveCount(0);
  }finally{release()}
});

test('origin validation prevents both heavy and scene module execution before requests',async({page})=>{
  await holdIdle(page);
  let requests=0;await page.route('https://motion-trap.invalid/**',async route=>{requests++;await route.fulfill({headers:{'access-control-allow-origin':'*'},contentType:'text/javascript',body:'window.__externalExecuted=true;export default()=>({frame(){}})'})});
  await fixture(page,mount('trap'));
  await page.waitForFunction(()=>(window as any).__idleCount()>0);
  await page.locator('script[data-motion-runtime]').evaluate(el=>{(el as HTMLElement).dataset.motionRuntime='https://motion-trap.invalid/runtime.js'});
  await page.evaluate(()=>(window as any).__releaseIdle());
  await expect(page.locator('#trap')).toHaveAttribute('data-scene-state','error');
  expect(requests).toBe(0);expect(await page.evaluate(()=>(window as any).__externalExecuted)).toBeUndefined();

  await fixture(page,`<div class="row">${mount('safe')}${mount('trapScene','data-scene-load="click"')}</div>`);
  await page.waitForFunction(()=>(window as any).__idleCount()>0);await page.evaluate(()=>(window as any).__releaseIdle());
  await live(page,'safe');
  await page.locator('#trapScene').evaluate(el=>{(el as HTMLElement).dataset.sceneSrc='https://motion-trap.invalid/scene.js'});
  await page.locator('#trapScene button').click();
  await expect(page.locator('#trapScene')).toHaveAttribute('data-scene-state','error');
  expect(requests).toBe(0);expect(await page.evaluate(()=>(window as any).__externalExecuted)).toBeUndefined();
});

for(const failure of ['404','integrity'])test(`runtime ${failure} failure leaves posters and no dead controls`,async({page})=>{
  await holdIdle(page);
  await fixture(page,mount('broken','data-scene-load="click"'),PROBE_MODULE,async()=>{
    if(failure==='404')await page.route(/\/motion\.min\./,route=>route.fulfill({status:404,body:'missing'}));
  });
  if(failure==='integrity')await page.locator('script[data-motion-runtime]').evaluate(el=>{(el as HTMLElement).dataset.motionIntegrity='sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='});
  await page.locator('button').click();
  await page.waitForFunction(()=>(window as any).__idleCount()>0);await page.evaluate(()=>(window as any).__releaseIdle());
  await expect(page.locator('#broken')).toHaveAttribute('data-scene-state','error');
  await expect(page.locator('button')).toBeHidden();
  expect(await page.locator('img').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('idle scheduling has a timer fallback',async({page})=>{
  await page.addInitScript(()=>{delete (window as any).requestIdleCallback});
  await fixture(page,mount('fallback'));await live(page,'fallback');
});

test('foreground admission and tab visibility pause actual callbacks',async({page})=>{
  await page.addInitScript(()=>{
    (window as any).__testHidden=true;
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>(window as any).__testHidden});
  });
  const urls:string[]=[];page.on('request',r=>urls.push(r.url()));
  await fixture(page,mount('foreground'));
  await page.waitForTimeout(100);expect(motionRequests(urls)).toEqual([]);
  await page.evaluate(()=>{(window as any).__testHidden=false;document.dispatchEvent(new Event('visibilitychange'))});
  await live(page,'foreground');
  await page.evaluate(()=>{(window as any).__testHidden=true;document.dispatchEvent(new Event('visibilitychange'))});
  await expect(page.locator('#foreground')).toHaveAttribute('data-scene-state','paused');
  const paused=(await probe(page,'foreground')).frames;
  await page.waitForTimeout(150);expect((await probe(page,'foreground')).frames).toBe(paused);
  await page.evaluate(()=>{(window as any).__testHidden=false;document.dispatchEvent(new Event('visibilitychange'))});
  await expect.poll(async()=>(await probe(page,'foreground')).frames).toBeGreaterThan(paused+2);
});

test('missing enhancement capabilities leave static content without heavy download',async({page})=>{
  await page.addInitScript(()=>{delete (window as any).ResizeObserver});
  const urls:string[]=[];page.on('request',r=>urls.push(r.url()));
  await fixture(page,mount('unsupported','data-scene-load="click"'));
  await page.locator('button').evaluate((el:HTMLButtonElement)=>el.click());
  await page.waitForTimeout(100);
  expect(motionRequests(urls)).toEqual([]);
  await expect(page.locator('button')).toBeHidden();
  await expect(page.locator('canvas')).toHaveCount(0);
});
