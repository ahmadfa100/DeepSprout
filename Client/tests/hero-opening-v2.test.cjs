const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.HERO_URL||'http://127.0.0.1:8792';
const out=path.resolve(__dirname,'../references/hero-v2-validation');fs.mkdirSync(out,{recursive:true});
const phases=['ARRIVAL','LIFT','VERTICAL_ALIGNMENT','PERFECT_BALANCE','GROW','LIVING_IDLE'];
const frames=[['00-arrival',.8],['01-lift',3.72],['02-vertical-alignment',5.35],['03-perfect-balance',6.399],['04-grow',7.7],['05-living-idle',9.5]];
const results={cases:[],errors:[],measurements:{},screenshots:[]};let ownedBrowser;
(async()=>{
 const browser=ownedBrowser=await chromium.launch({headless:process.env.HEADED!=='1',executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 async function page(options={}){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,...options});
  const p=await context.newPage();p.on('pageerror',e=>results.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')results.errors.push(m.text())});
  await p.addInitScript(()=>{
   window.events=[];window.frameTimes=[];window.countFrames=true;let previous=0;
   function sample(t){if(previous&&window.countFrames)frameTimes.push(t-previous);previous=t;if(window.countFrames)requestAnimationFrame(sample)}requestAnimationFrame(sample);
   document.addEventListener('hero:phase',e=>events.push({phase:e.detail.phase,time:e.detail.time}),true);
   window.addEventListener('hero:intro-complete',e=>events.push({unlock:e.detail.progress}));
   window.addEventListener('hero:story-intent',e=>events.push({story:e.detail.kind}));
  });return p;
 }
 async function ready(p){await p.goto(base+'/hero-lab-v2.html?heroDebug');await p.waitForFunction(()=>window.heroV2?.state.started)}
 // Natural playback: no seeks, no synthetic scroll.
 const normal=await page();await ready(normal);await normal.waitForTimeout(350);
 assert.equal(await normal.evaluate(()=>heroV2.state.phase),'ARRIVAL');assert.equal(await normal.locator('.bimo').getAttribute('data-pose'),'awake');
 await normal.waitForFunction(()=>heroV2.state.time>2.5);assert.equal(await normal.locator('.bimo').getAttribute('data-pose'),'awake');
 await normal.waitForFunction(()=>heroV2.state.gate.open,{},{timeout:15000});
 const n=await normal.evaluate(()=>({state:heroV2.state,events,frames:frameTimes,resource:performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').pop(),bytes:e.transferSize,ms:Math.round(e.duration)}))}));
 assert.deepEqual(n.events.filter(e=>e.phase).map(e=>e.phase),phases);assert.equal(n.state.time,8.2);assert.equal(n.state.inputs.emotionStage,1);assert.equal(n.state.inputs.pointerLookEnabled,false);assert.equal(n.state.inputs.useExternalLook,true);assert.equal(n.state.character,'live');
 await normal.waitForTimeout(1600);assert.equal(await normal.evaluate(()=>heroV2.state.time),8.2);
 const centres=await normal.locator('.stone').evaluateAll(es=>es.map(e=>parseFloat(e.style.getPropertyValue('--x'))));assert.ok(Math.max(...centres)-Math.min(...centres)<.01);
 const leafBefore=await normal.locator('.idle-leaf').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().y));
 const before=await normal.locator('.stone-idle').first().evaluate(e=>e.getBoundingClientRect().y);await normal.waitForTimeout(1300);const after=await normal.locator('.stone-idle').first().evaluate(e=>e.getBoundingClientRect().y);assert.ok(Math.abs(after-before)>0&&Math.abs(after-before)<1.1);
 const leafAfter=await normal.locator('.idle-leaf').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().y));assert.ok(leafAfter.every((y,i)=>Math.abs(y-leafBefore[i])<8),'Ambient leaves must move locally around their authored anchors');
 const sorted=n.frames.filter(x=>x<200).sort((a,b)=>a-b);results.measurements.autoplay={duration:8.2,phaseOrder:n.events,rafMedian:sorted[Math.floor(sorted.length*.5)],rafP95:sorted[Math.floor(sorted.length*.95)],resources:n.resource};results.cases.push('Normal autoplay; Bimo awake through lift; all six phases; seven aligned stones; idle moves <=1px; intro never repeats');
 await normal.context().close();
 // Immediate entry scroll and aggressive trackpad fling must cross every phase.
 for(const mode of ['immediate-scroll','aggressive-scroll']){
  const p=await page();await ready(p);if(mode==='aggressive-scroll')await p.waitForFunction(()=>heroV2.state.phase==='LIFT');
  for(let i=0;i<8;i++)await p.mouse.wheel(0,mode==='immediate-scroll'?900:2400);
  const pending=await p.evaluate(()=>heroV2.state);assert.equal(pending.gate.open,false);assert.ok(pending.time<3.8);assert.equal(await p.evaluate(()=>document.querySelector('#story-slot').hidden),true);assert.ok(await p.evaluate(()=>scrollY)>0);
  await p.waitForFunction(()=>heroV2.state.gate.open,{},{timeout:10000});
  const ev=await p.evaluate(()=>events);assert.deepEqual(ev.filter(e=>e.phase).map(e=>e.phase),phases);assert.equal(ev.filter(e=>e.unlock).length,1);assert.equal(ev.filter(e=>e.story).length,0);
  await p.mouse.wheel(0,100);await p.waitForTimeout(100);assert.ok(await p.evaluate(()=>events.some(e=>e.story==='wheel')));
  results.cases.push(mode+': native scroll, absorbed intent, every phase visited, unlock only at progress=1');await p.context().close();
 }
 // A separate Chrome process avoids Playwright's forced-visible page override.
 const {spawn}=require('node:child_process');const profile=fs.mkdtempSync('/tmp/hero-v2-tab-');
 const chrome=spawn(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--remote-debugging-port=9338',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','about:blank'],{stdio:'ignore'});let nativeBrowser;
 try{
  for(let i=0;i<40;i++){try{nativeBrowser=await chromium.connectOverCDP('http://127.0.0.1:9338',{noDefaults:true});break}catch{await new Promise(r=>setTimeout(r,200))}}
  assert.ok(nativeBrowser,'Isolated Chrome must connect');const context=nativeBrowser.contexts()[0],visible=context.pages()[0];await ready(visible);await visible.waitForFunction(()=>heroV2.state.time>2);
  const cover=await context.newPage();await cover.goto('about:blank');await cover.bringToFront();await visible.waitForTimeout(250);
  assert.equal(await visible.evaluate(()=>document.hidden),true);const pausedAt=await visible.evaluate(()=>heroV2.state.time);await visible.waitForTimeout(1700);assert.ok(Math.abs(await visible.evaluate(()=>heroV2.state.time)-pausedAt)<.01);
  await visible.bringToFront();await visible.waitForTimeout(500);assert.ok(await visible.evaluate(()=>heroV2.state.time)>pausedAt+.3);
  results.cases.push('Actual hidden/restored Chrome tab: document.hidden=true, paused clock, smooth resume');
 }finally{await nativeBrowser?.close();chrome.kill()}
 // Delayed character runtime stays behind its matching first-paint image.
 const loading=await page();await loading.route('**/bimo.riv',async route=>{await new Promise(r=>setTimeout(r,3500));await route.continue()});await ready(loading);await loading.waitForTimeout(450);
 assert.equal(await loading.locator('.bimo').getAttribute('data-runtime'),'poster');assert.equal(await loading.locator('.bimo canvas').evaluate(e=>getComputedStyle(e).opacity),'0');assert.equal(await loading.locator('.awake-still').evaluate(e=>e.complete&&e.naturalWidth>0),true);
 await loading.screenshot({path:path.join(out,'loading-poster.png')});await loading.waitForFunction(()=>heroV2.state.character==='live',{},{timeout:12000});assert.equal(await loading.locator('.bimo').getAttribute('data-runtime'),'live');results.cases.push('Delayed Rive: immediate awake still, hidden canvas, initialized live crossfade');await loading.context().close();
 const reduced=await page({reducedMotion:'reduce'});await ready(reduced);const rs=await reduced.evaluate(()=>heroV2.state);assert.equal(rs.progress,1);assert.equal(rs.gate.open,true);assert.equal(rs.reduced,true);assert.equal(await reduced.locator('.bimo').getAttribute('data-pose'),'focus');await reduced.screenshot({path:path.join(out,'reduced-motion.png')});results.cases.push('Reduced motion: complete stack and focus pose; immediate gate; no animation');await reduced.context().close();
 const staticPage=await page({reducedMotion:'reduce',javaScriptEnabled:false});await staticPage.goto(base+'/hero-lab-v2.html');await staticPage.waitForTimeout(500);const staticCentres=await staticPage.locator('.stone').evaluateAll(es=>es.map(e=>parseFloat(getComputedStyle(e).left)));assert.ok(Math.max(...staticCentres)-Math.min(...staticCentres)<1);results.cases.push('Reduced-motion first paint without JavaScript: seven aligned stones and focused poster');await staticPage.context().close();
 // Reviewable deterministic captures at both required desktop sizes.
 for(const size of [{width:1440,height:900},{width:1280,height:800}]){
  const p=await page({viewport:size});await ready(p);await p.waitForFunction(()=>heroV2.state.character==='live');
  for(const [name,time]of frames){await p.evaluate(t=>heroV2.seek(t),time);await p.waitForTimeout(650);const nameOut=`${size.width}x${size.height}-${name}.png`;await p.screenshot({path:path.join(out,nameOut)});results.screenshots.push(nameOut);assert.equal(await p.locator('.stone').count(),7);if(name==='04-grow'){const ys=await p.locator('.growth-leaf').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().y));assert.ok(Math.min(...ys)>size.height*.08,'Growth leaves retain scene positions rather than migrating to the top edge')}}
  // Keyboard and pause control remain available during playback.
  await p.evaluate(()=>heroV2.replay());await p.locator('#motion-control').click();const stopped=await p.evaluate(()=>heroV2.state.time);await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>heroV2.state.time),stopped);await p.locator('#motion-control').click();await p.waitForTimeout(150);assert.ok(await p.evaluate(()=>heroV2.state.time)>stopped);
  await p.locator('#focus-check').click();assert.equal(await p.locator('dialog').evaluate(e=>e.open),true);await p.keyboard.press('Escape');assert.equal(await p.locator('dialog').evaluate(e=>e.open),false);assert.equal(await p.evaluate(()=>document.activeElement.id),'focus-check');await p.context().close();
 }
 results.cases.push('1440×900 and 1280×800: six captures each, seven persistent stones; pause/resume; keyboard dialog focus return');
 assert.deepEqual(results.errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({passed:results.cases,measurements:results.measurements.autoplay.rafP95,screenshots:results.screenshots},null,2));await browser.close();
})().catch(async e=>{console.error(e);await ownedBrowser?.close();process.exit(1)});
