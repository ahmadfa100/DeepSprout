// The opening cue, the procedural black hole and station 4's protected websites.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {PNG}=require('pngjs');
const base=process.env.REELS_URL||'http://127.0.0.1:8792';
const out=path.resolve(__dirname,'../docs/validation/black-hole');
const report={cases:[],screenshots:[],errors:[]};let browser;
const px=(buffer,x,y)=>{const png=PNG.sync.read(buffer),i=(Math.round(y)*png.width+Math.round(x))*4;return[...png.data.slice(i,i+3)]};
const lum=([r,g,b])=>.2126*r+.7152*g+.0722*b;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const {holeFrame}=await import(pathToFileURL(path.resolve(__dirname,'../src/js/reels/black-hole.js')));
 const math=await import(pathToFileURL(path.resolve(__dirname,'../src/js/reels/story-math.js')));
 const {CORE,EXIT_END}=await import(pathToFileURL(path.resolve(__dirname,'../src/js/reels/collapse.js')));
 assert.equal(CORE,math.CORE,'One gravitational centre for the storm trap, the hole, the spirals and the void');
 // Pure scroll functions: nothing before the burst, growth only with gravity, identical on reversal.
 assert.equal(holeFrame(.6,0).radius,0);assert.equal(holeFrame(.6,0).disk,0);assert.equal(holeFrame(.6,0).phase,'storm');
 let last=-1;for(let p=.6;p<=1;p+=.002){const f=holeFrame(p,0);assert.ok(f.radius>=last-1e-12);last=f.radius;assert.deepEqual(f,holeFrame(p,0))}
 for(let q=0;q<=EXIT_END;q+=.002){const f=holeFrame(1,q);assert.ok(f.radius>=last-1e-12);last=f.radius}
 assert.ok(holeFrame(1,EXIT_END).radius>1.3,'The shadow outgrows the frame: darkness is the horizon itself');
 assert.equal(holeFrame(1,.68).disk,0,'Matter is gone before the void closes');
 assert.deepEqual(['emergence','attraction','capture','horizon','darkness','void'],[[.75,0],[.9,0],[1,.2],[1,.45],[1,.6],[1,.7]].map(([p,q])=>holeFrame(p,q).phase));
 // Every stone keeps its pre-collapse pose (the CORE refactor is value-preserving).
 for(let p=0;p<.38;p+=.01)assert.equal(math.stonePose({balance:[990,30,100,0]},0,p).y,30);
 report.cases.push('holeFrame: zero before the burst, monotonic radius through story and exit, deterministic, disk gone before the void, shadow larger than the frame at EXIT_END; one CORE.');

 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport}),w=viewport.width;page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+'/hero-reels-lab.html?reelsDebug');
  // Opening: exact copy, no promotional buttons, cue only after LIVING_IDLE.
  await page.waitForFunction(()=>window.reelsLab);
  assert.equal(await page.locator('#hero-title').innerText(),'Less scrolling.\nMore living.');
  assert.equal((await page.locator('.hero .lead').innerText()).replace(/\s+/g,' ').trim(),'Reclaim your attention. Make room for real life.');
  assert.equal(await page.locator('#focus-check,#replay,.hero .actions,#focus-dialog').count(),0);
  const cue=()=>page.locator('.scroll-cue').evaluate(e=>({show:e.dataset.show,opacity:Number(getComputedStyle(e).opacity)}));
  if(!(await page.evaluate(()=>reelsLab.state.unlocked)))assert.deepEqual(await cue(),{show:'false',opacity:0},'No cue during the autonomous intro');
  await page.waitForFunction(()=>reelsLab.state.unlocked,null,{timeout:25000});
  assert.equal(await page.locator('#hero-v2').getAttribute('data-phase'),'LIVING_IDLE');
  await page.waitForTimeout(1300);let c=await cue();assert.equal(c.show,'true');assert.ok(c.opacity>.95);
  await page.screenshot({path:path.join(out,w+'-cue.png')});report.screenshots.push(w+'-cue.png');
  await page.mouse.wheel(0,260);await page.waitForTimeout(700);c=await cue();assert.equal(c.show,'false');assert.ok(c.opacity<.05,'Cue leaves on the first meaningful scroll');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1300);assert.equal((await cue()).show,'true','Cue returns at the completed opening');
  // Black hole: a #05040a shadow at CORE inside a bright, asymmetric disk, under real WebGL.
  assert.equal(await page.locator('#hero-v2').getAttribute('data-webgl'),'ready');
  for(const q of [.3,.6]){
   await page.evaluate(q=>reelsLab.seekExit(q),q);await page.waitForTimeout(600);
   const s=await page.evaluate(()=>({core:reelsLab.state.core,hole:reelsLab.state.renderer.hole}));
   const buffer=await page.screenshot({path:path.join(out,`${w}-exit-${q}.png`)});report.screenshots.push(`${w}-exit-${q}.png`);
   const R=s.hole.radius*s.core.unit;
   const inside=px(buffer,s.core.x,s.core.y-R*.7);assert.ok(inside.every((v,i)=>Math.abs(v-[5,4,10][i])<=2),`Event horizon is the void colour: ${inside}`);
   if(q===.3&&w>700){const left=px(buffer,s.core.x-R*3,s.core.y),right=px(buffer,s.core.x+R*3,s.core.y);assert.ok(lum(left)>120,'Approaching side glows');assert.ok(lum(left)>lum(right)*1.3,'Doppler asymmetry')}
   assert.equal(s.hole.phase,q===.3?'capture':'darkness');
  }
  // Protection: colour → protected monochrome, reversibly, inside the existing path.
  await page.evaluate(()=>reelsLab.play());
  const shield=async t=>{await page.evaluate(t=>pathLab.seek(t),t);await page.waitForTimeout(300);return page.evaluate(()=>pathLab.state.shield)};
  let sh=await shield(8.05);assert.ok(sh.arrive>.9&&sh.quiet<.05&&sh.sites.every(s=>s.color>.9&&s.mono<.1),'Sites arrive in colour');
  sh=await shield(9.4);assert.ok(sh.settled>.99&&sh.sites.every(s=>s.color===0&&s.mono===1),'Protected quiet');
  await page.screenshot({path:path.join(out,w+'-protected.png')});report.screenshots.push(w+'-protected.png');
  sh=await shield(8.05);assert.ok(sh.sites.every(s=>s.color>.9),'Scrolling back restores the colour');
  assert.deepEqual(await page.locator('.path-site-label').allTextContents(),['instagram.com','tiktok.com','youtube.com']);
  assert.equal(await page.locator('.path-shield-word').textContent(),'Protection active · preview','The spec’s state name, labelled as a preview');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.close();
 }
 report.cases.push('1440 and 390: exact hero copy, no hero buttons, cue after LIVING_IDLE only, leaves on scroll and returns; void-coloured horizon at CORE with bright, asymmetric disk; Protection colour→mono and back; no overflow.');
 assert.deepEqual(report.errors,[]);
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.cases,null,1));await browser.close();
})().catch(async e=>{report.failure=e.stack;fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.error(e);await browser?.close();process.exit(1)});
