import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixture, live, mount, PROBE_MODULE } from './helpers/scene-fixture';
import { ORBIT, sceneLive, settleAnimations } from './helpers/motion';

const presets = ['symblix-light','symblix-dark','ocean-dark','forest-light','sunset-dark','solarized-light','high-contrast'];
function channels(css:string) {
  const c=css.match(/[\d.]+/g)?.map(Number);
  if(!css.startsWith('rgb') || !c || c.length<3)throw new Error(`unsupported computed color ${css}`);
  return {rgb:c.slice(0,3).map(x=>x/255),alpha:c[3]??1};
}
function luminance(c:number[]) {
  return c.reduce((sum,x,i)=>sum+[.2126,.7152,.0722][i]*(x<=.04045?x/12.92:((x+.055)/1.055)**2.4),0);
}

test('printing a live scene forces its poster opaque and hides all controls',async({page})=>{
  await fixture(page,mount('printed','data-scene-load="click"'));
  await page.locator('button').click();await live(page,'printed');
  await expect.poll(()=>page.locator('img').evaluate(el=>getComputedStyle(el).opacity)).toBe('0');
  const sizing=await page.locator('canvas').evaluate((el:HTMLCanvasElement)=>({
    height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width,
    parentHeight:el.parentElement!.clientHeight,parentWidth:el.parentElement!.clientWidth,
  }));
  expect(sizing.height).toBeCloseTo(sizing.parentHeight,0);
  expect(sizing.width).toBeCloseTo(sizing.parentWidth,0);
  await page.emulateMedia({media:'print'});
  await expect.poll(()=>page.locator('img').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  expect(await page.locator('canvas').evaluate(el=>getComputedStyle(el).display)).toBe('none');
  await expect(page.locator('button')).toBeHidden();
  await expect(page.locator('.docs-scene__overlay')).toContainText('printed static content');
});

test('seven presets retain AA text contrast over black, gray and white live art',async({page},testInfo)=>{
  const art=PROBE_MODULE.replace('ctx.gl.clearColor(0.1, 0.3, 0.7, 1);',
    'const c=Number(ctx.mount.dataset.backdrop||0);ctx.gl.clearColor(c,c,c,1);');
  await fixture(page,mount('contrast'),art);await live(page,'contrast');
  for(const preset of presets){
    await page.evaluate(p=>{
      const root=document.documentElement;root.dataset.preset=p;root.dataset.presetSource='user';
      root.dataset.syntax=p.endsWith('-dark')?'dark':'light';
    },preset);
    for(const backdrop of [0,.5,1]){
      await page.locator('#contrast').evaluate((el,b)=>{(el as HTMLElement).dataset.backdrop=String(b)},backdrop);
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const colors=await page.locator('.docs-scene__overlay').evaluate(el=>{
        const s=getComputedStyle(el);return {fg:s.color,bg:s.backgroundColor};
      });
      const fg=channels(colors.fg),bg=channels(colors.bg);
      expect(bg.alpha,`${preset} default panel is opaque`).toBe(1);
      const a=luminance(fg.rgb),b=luminance(bg.rgb),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      expect(ratio,`${preset} over ${backdrop} artwork`).toBeGreaterThanOrEqual(4.5);
      if((preset==='solarized-light' && backdrop===0)||(preset==='ocean-dark' && backdrop===1)){
        const path=testInfo.outputPath(`${preset}-${backdrop}.png`);
        await page.locator('#contrast').screenshot({path});
        await testInfo.attach(`${preset}-art`,{path,contentType:'image/png'});
      }
    }
  }
});

test('overlay text is selectable and DOM controls do not drive decorative pointer signals',async({page})=>{
  const markup=mount('selected','data-scene-pointer="on"').replace('</p>','</p><a id="action" href="#specs">Read specifications</a>');
  await fixture(page,`${markup}<section id="specs"><h2>Specifications</h2><p>Static specifications.</p></section>`);
  await live(page,'selected');
  const text=page.locator('.docs-scene__overlay p');const box=(await text.boundingBox())!;
  await page.mouse.move(box.x+2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width-2,box.y+box.height/2,{steps:10});await page.mouse.up();
  expect(await page.evaluate(()=>window.getSelection()?.toString())).toContain('selected');
  await page.locator('#action').hover();
  await expect.poll(()=>page.evaluate(()=>[...window.SymblixMotion.hosts.values()][0].signals.pointer.active)).toBe(false);
  await page.locator('#action').focus();await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#specs$/);
});

test.describe('no-JavaScript geometry',()=>{
test.use({javaScriptEnabled:false});
test('long static text is not clipped by preferred scene geometry on narrow screens',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const markup=mount('long').replace('long static content',('Readable static content with useful facts. ').repeat(18));
  await fixture(page,markup);
  const geometry=await page.locator('#long').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight,overlay:el.querySelector('.docs-scene__overlay')!.getBoundingClientRect().height}));
  expect(geometry.overlay).toBeLessThanOrEqual(geometry.height+1);
  expect(geometry.content).toBeLessThanOrEqual(geometry.height+1);
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
  const zoomed=await page.locator('#long').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight}));
  expect(zoomed.content).toBeLessThanOrEqual(zoomed.height+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
});

test('every palette field reads the real CSS token, including surface2',async({page})=>{
  await sceneLive(page);
  for(const preset of presets){
    await page.evaluate(p=>window.SymblixTheme.setPreset(p),preset);
    await expect.poll(()=>page.evaluate(()=>[...window.SymblixMotion.hosts.values()][0].palette.preset)).toBe(preset);
    const values=await page.evaluate(()=>{
      const p=[...window.SymblixMotion.hosts.values()][0].palette;
      const s=getComputedStyle(document.documentElement);
      return Object.entries({accent:'--docs-accent',bg:'--docs-bg',surface:'--docs-surface',surface2:'--docs-surface-2',text:'--docs-text',muted:'--docs-muted',border:'--docs-border'})
        .map(([key,token])=>({key,value:p[key].css,expected:s.getPropertyValue(token).trim()}));
    });
    for(const item of values){expect(item.value,`${preset}/${item.key}`).not.toBe('');expect(item.value).toBe(item.expected)}
  }
});

test('real scene documentation has no serious accessibility failures live or static',async({page},testInfo)=>{
  await sceneLive(page);await settleAnimations(page);
  for(const width of [1440,390]){
    const before=await page.evaluate(()=>[...window.SymblixMotion.hosts.values()][0].frameCount);
    await page.setViewportSize({width,height:900});
    const stage = page.locator(ORBIT);
    await stage.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    await expect(stage).toHaveAttribute('data-scene-state','live');
    await expect.poll(()=>page.evaluate(()=>[...window.SymblixMotion.hosts.values()][0].frameCount)).toBeGreaterThan(before+2);
    const path=testInfo.outputPath(`scene-${width}.png`);
    await stage.screenshot({path});
    await testInfo.attach(`scene-${width}`,{path,contentType:'image/png'});
  }
  const table=page.locator('.table-wrap').first();
  await table.focus();await page.keyboard.press('ArrowRight');
  await expect.poll(()=>table.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  for(const mode of ['no-preference','reduce'] as const){
    await page.emulateMedia({reducedMotion:mode});
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
    expect(result.violations.filter(v=>v.impact==='critical'||v.impact==='serious')).toEqual([]);
  }
});
