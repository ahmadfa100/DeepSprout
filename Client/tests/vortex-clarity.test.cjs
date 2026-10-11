const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {PNG}=require('pngjs');
const base=process.env.REELS_URL||'http://127.0.0.1:8792';
const out=path.resolve(__dirname,'../references/vortex-clarity-validation');
const report={cases:[],errors:[],screenshots:[]};let browser;
function pixel(buffer,x,y){const png=PNG.sync.read(buffer),i=(Math.floor(y)*png.width+Math.floor(x))*4;return[...png.data.slice(i,i+3)]}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const {spiralIn,collapseFrame}=await import(pathToFileURL(path.resolve(__dirname,'../src/js/reels/collapse.js')));
 assert.deepEqual(spiralIn(.9,.2,4,2,0,.02,.45),{x:.9,y:.2,z:4,size:2,turn:0,swallowed:false});
 let previous=Infinity;for(let q=0;q<=.45;q+=.001){const a=spiralIn(.9,.2,4,2,q,.02,.45),radius=Math.hypot(a.x-.568,(a.y-.46)/1.38);assert.ok(radius<=previous+1e-9);previous=radius;assert.deepEqual(a,spiralIn(.9,.2,4,2,q,.02,.45))}
 assert.equal(collapseFrame(.72).phase,'void');assert.equal(collapseFrame(.72).light,0);
 report.cases.push('Curved inward paths have decreasing radius/depth/scale; pure scroll evaluation is deterministic and reversible.');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 async function open(options={}){const context=await browser.newContext({viewport:{width:1440,height:900},...options}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'/hero-reels-lab.html?reelsDebug');if(options.javaScriptEnabled!==false)await page.waitForFunction(()=>window.reelsLab?.state.character==='live');return page}
 async function capture(page,name){const buffer=await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');return buffer}
 async function exit(page,q){await page.evaluate(q=>reelsLab.seekExit(q),q);await page.waitForTimeout(450)}
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const p=await open({viewport}),prefix=String(viewport.width);
  await p.evaluate(()=>{window.originalBimo=document.querySelector('.bimo canvas');window.originalStones=[...document.querySelectorAll('.stone')]});
  await p.evaluate(()=>reelsLab.seek(.97));await p.waitForTimeout(600);await capture(p,prefix+'-trap');
  for(const [name,q]of [['gravity',.16],['collapse',.33],['bimo',.42],['consumption',.64],['void',.72],['spark',.75],['light',.82],['heading',.96],['clarity',1]]){
   await exit(p,q);const buffer=await capture(p,prefix+'-'+name);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(name==='void')for(const [x,y]of [[5,5],[viewport.width-5,5],[5,viewport.height-5],[viewport.width-5,viewport.height-5],[viewport.width/2,viewport.height/2]])assert.deepEqual(pixel(buffer,x,y),[5,4,10],'The void must fill the viewport, with no early cream strip or pause button');
   if(name==='light'){const rgb=pixel(buffer,viewport.width-5,viewport.height-5);assert.ok(Math.max(...rgb)<180,'The cream page must not enter before the circular opening reaches it')}
   if(q>=.53)assert.equal(await p.evaluate(()=>reelsLab.state.renderer.media.playing),0);
  }
  const before=await p.locator('.clarity-copy').boundingBox();
  await p.evaluate(()=>{reelsLab.play();scrollBy(0,2)});await p.waitForTimeout(150);
  const after=await p.locator('.clarity-copy').boundingBox();assert.ok(Math.abs(after.y-before.y+2)<1,'Single heading has no handoff jump');
  for(const q of [.80,.35,.67,.92,.20,1]){await p.evaluate(q=>{reelsLab.play();const d=reelsLab.state.distances;scrollTo(0,d.story+q*d.exit)},q);await p.waitForTimeout(140);const state=await p.evaluate(()=>reelsLab.state);assert.ok(Math.abs(state.exitProgress-q)<.002);assert.equal(await p.evaluate(()=>document.querySelector('.bimo canvas')===originalBimo&&originalStones.every((s,i)=>document.querySelectorAll('.stone')[i]===s)),true)}
  await p.evaluate(()=>scrollTo(0,document.querySelector('.clarity-facts').getBoundingClientRect().top+scrollY-60));await p.waitForTimeout(200);await capture(p,prefix+'-stats');
  if(viewport.width>700){assert.deepEqual(await p.locator('[data-count]').allTextContents(),['2h 21m','46%','38%']);const tops=await p.locator('.clarity-stat').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert.ok(Math.max(...tops)-Math.min(...tops)<1)}
  else{await p.evaluate(()=>scrollTo(0,document.querySelectorAll('.clarity-stat')[2].getBoundingClientRect().top+scrollY-100));await p.waitForTimeout(150);assert.equal(await p.locator('[data-count]').nth(2).textContent(),'38%');await capture(p,prefix+'-stats-lower')}
  for(const selector of ['.brain-rot','.clarity-research']){await p.evaluate(selector=>scrollTo(0,document.querySelector(selector).getBoundingClientRect().top+scrollY-80),selector);await p.waitForTimeout(160);await capture(p,prefix+selector);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
  const state=await p.evaluate(()=>reelsLab.state);assert.equal(state.offscreen,true);assert.equal(state.renderer.media.playing,0);const time=state.clock;await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>reelsLab.state.clock),time);
  await p.evaluate(()=>{reelsLab.play();scrollTo(0,0)});await p.waitForTimeout(160);assert.equal(await p.evaluate(()=>reelsLab.state.exitProgress),0);assert.equal(await p.locator('.bimo-gravity').evaluate(e=>getComputedStyle(e).visibility),'visible');
  report.cases.push(`${viewport.width}×${viewport.height}: collapse phases, pixel-tested dark hold, circular light without rectangular ingress, forward/reverse/rapid native scroll, continuous heading handoff, editorial content, zero overflow, same Bimo/stones, offscreen pause.`);
  await p.context().close();
 }
 // Real end-key jump lands on readable content; reversing cannot leave a stale light mask.
 const fast=await open();await fast.keyboard.press('End');await fast.waitForTimeout(250);assert.equal(await fast.evaluate(()=>reelsLab.state.exitProgress),1);assert.equal(await fast.evaluate(()=>reelsLab.state.unlocked),true,'Skipping past the entire story must not leave the offscreen intro gate permanently paused');assert.equal(await fast.evaluate(()=>reelsLab.state.renderer.media.playing),0);await fast.keyboard.press('Home');await fast.waitForTimeout(200);assert.equal(await fast.evaluate(()=>reelsLab.state.exitProgress),0);await fast.context().close();
 const reduced=await open({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.evaluate(()=>scrollTo(0,document.querySelector('.clarity-facts').getBoundingClientRect().top+scrollY));await reduced.waitForTimeout(200);assert.deepEqual(await reduced.locator('[data-count]').allTextContents(),['2h 21m','46%','38%']);assert.equal(await reduced.evaluate(()=>reelsLab.state.renderer.media.loaded),0);assert.equal(await reduced.locator('.vortex-transition').evaluate(e=>getComputedStyle(e).display),'none');await capture(reduced,'reduced-motion');await reduced.context().close();
 const plain=await open({viewport:{width:390,height:844},javaScriptEnabled:false});assert.equal(await plain.locator('.hero-track').evaluate(e=>e.offsetHeight),844);assert.deepEqual(await plain.locator('[data-count]').allTextContents(),['2h 21m','46%','38%']);assert.equal(await plain.locator('.clarity-section a').count(),7);await plain.locator('#not-alone').scrollIntoViewIfNeeded();await capture(plain,'no-javascript');assert.equal(await plain.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await plain.context().close();
 const fallback=await browser.newPage({viewport:{width:390,height:844}});await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args)}});fallback.on('pageerror',e=>report.errors.push(e.message));await fallback.goto(base+'/hero-reels-lab.html?reelsDebug');await fallback.waitForFunction(()=>window.reelsLab);await exit(fallback,.72);const buffer=await capture(fallback,'webgl-fallback-void');assert.deepEqual(pixel(buffer,10,10),[5,4,10]);await exit(fallback,1);await capture(fallback,'webgl-fallback-clarity');await fallback.close();
 report.cases.push('End/Home native jumps; reduced motion retains final figures with no live media; no-JS readable content/source links; WebGL failure still completes the CSS portal.');
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(async error=>{report.failure=error.stack;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.error(error);await browser?.close();process.exit(1)});
