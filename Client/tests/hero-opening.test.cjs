/* Run with Client served locally. Optional: BASE_URL, CHROME_PATH, HERO_OUTPUT, NODE_PATH. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=process.env.HERO_OUTPUT||path.resolve(__dirname,'../docs/hero-validation');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const errors=[],warnings=[],responses=[];
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});
 page.on('response',r=>{if(r.status()>=400)responses.push([r.status(),r.url()])});
 const url=(process.env.BASE_URL||'http://127.0.0.1:8791')+'/hero-lab.html?heroDebug';
 const state=()=>page.evaluate(()=>window.heroDebug.state);
 const report={};
 try{
  await page.goto(url);await page.waitForFunction(()=>window.heroDebug);
  assert.equal((await state()).character,'live');assert.equal((await state()).stones,7);
  assert.deepEqual((await state()).inputs,{emotionStage:1,pointerLookEnabled:false,useExternalLook:true});
  assert.equal(await page.locator('nav').count(),0);
  // Inspect real playback: clocks and transforms advance without scroll, then intro ends once.
  await page.evaluate(()=>window.heroDebug.replay());
  report.live=[];
  for(const wait of [750,1000,850,1400,2200,600]){
   await page.waitForTimeout(wait);
   report.live.push(await page.evaluate(()=>({state:window.heroDebug.state,stone:document.querySelector('.stone').getAttribute('style'),root:getComputedStyle(document.querySelector('.root-path')).strokeDashoffset,scrollY})));
  }
  assert.equal(report.live.at(-1).state.phase,'LIVING_IDLE');
  assert.ok(report.live.every(v=>v.scrollY===0));
  assert.notEqual(report.live[0].stone,report.live[2].stone);
  assert.equal(report.live.at(-1).state.time,report.live.at(-2).state.time,'intro does not loop');
  for(const [name,time] of [['A-arrival',.85],['B-align',2.6],['C-balanced',3.33],['D-grow',4.95],['E-idle',6]]){
   await page.evaluate(t=>window.heroDebug.seek(t),time);await page.screenshot({path:path.join(output,name+'-1440.png')});
  }
  const collision=await page.locator('.stone-idle').evaluateAll(nodes=>{const b=nodes.map(n=>n.getBoundingClientRect());return b.some((a,i)=>b.some((c,j)=>i!==j&&a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top))});
  assert.equal(collision,false,'balanced stones do not collide');
  const copy=await page.locator('.hero-copy').boundingBox();const stones=await page.locator('.stone-idle').evaluateAll(nodes=>nodes.map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom})));
  assert.ok(stones.every(s=>s.bottom<copy.y||s.left>copy.x+copy.width),'stones clear copy');
  // Pause freezes an actively running scene and resumes from its current clock.
  await page.locator('#replay').click();await page.waitForTimeout(700);await page.locator('#motion-control').click();
  const paused=(await state()).time;await page.waitForTimeout(250);assert.equal((await state()).time,paused);
  await page.locator('#motion-control').click();await page.waitForTimeout(200);assert.ok((await state()).time>paused);
  // Established quick check remains keyboard-accessible, modal, and returns focus.
  await page.locator('#focus-check').click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);
  await page.getByRole('button',{name:'Most days'}).click();assert.match(await page.locator('#check-result').textContent(),/10 minutes/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'focus-check');
  report.sizes=[];
  for(const [width,height] of [[1280,800],[390,844],[700,900],[768,1024],[1920,1080]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>window.heroDebug.seek(6));await page.waitForTimeout(160);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const title=await page.locator('h1').boundingBox();assert.ok(title.x>=0&&title.x+title.width<=width);
   await page.screenshot({path:path.join(output,`idle-${width}x${height}.png`),fullPage:true});
   report.sizes.push({width,height,overflow:false});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert.equal((await state()).phase,'LIVING_IDLE');const reduced=(await state()).time;
  await page.waitForTimeout(250);assert.equal((await state()).time,reduced);
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:path.join(output,'reduced-motion.png')});
  await page.reload();await page.waitForFunction(()=>window.heroDebug);assert.equal((await state()).phase,'LIVING_IDLE');
  // Cold reduced-motion load is already balanced rather than a hidden/scattered composition.
  await page.screenshot({path:path.join(output,'reduced-motion-cold.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
  report.errors=errors;report.warnings=warnings;report.httpFailures=responses;report.result='PASS';
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS: live signed V2, focus lock, seven balanced stones, real timed playback, no looping, five phase captures, responsive layouts, pause/resume, modal keyboard behavior, reduced motion, no console/HTTP errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
