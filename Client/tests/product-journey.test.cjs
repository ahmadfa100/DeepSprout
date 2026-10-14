// The garden beat (the kept part of the original product journey): unchanged sources, the seam from
// section 4's root, frame-for-frame identity with HEAD, the invitation, and the static fallbacks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {PNG}=require('pngjs');
const base=process.env.REELS_URL||'http://127.0.0.1:8792',client=path.resolve(__dirname,'..');
const out=path.resolve(__dirname,'../references/product-journey-validation'),refs=path.resolve(__dirname,'../references/garden-handoff');
const decode=buffer=>PNG.sync.read(buffer);
const head=file=>execFileSync('git',['-C',client,'show',`HEAD:Client/${file}`],{maxBuffer:1<<26});
const report={cases:[],screenshots:[],errors:[],frames:{},seam:{}};let browser;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 // 1. Unchanged sources: the garden module, its choreography and camera, the art, and the garden/invitation markup.
 for(const file of ['src/js/journey/garden.js','src/js/journey/choreography.js','src/js/journey/camera.js','assets/journey/garden.svg'])assert.ok(head(file).equals(fs.readFileSync(path.join(client,file))),`${file} is byte-identical to HEAD`);
 const article=(html,id)=>html.match(new RegExp(`<article class="journey-scene[^"]*" id="${id}"[\\s\\S]*?</article>`))[0];
 const before=String(head('hero-reels-lab.html')),now=fs.readFileSync(path.join(client,'hero-reels-lab.html'),'utf8');
 for(const id of ['journey-garden','journey-finish'])assert.equal(article(now,id),article(before,id),`#${id} markup is byte-identical to HEAD`);
 // 2. garden.css is the original rules, verbatim, in their original order and @media context; no chapter 1–4 rules survive.
 const parse=css=>{const rules=[];let media=null,i=0;css=css.replace(/\/\*[\s\S]*?\*\//g,'');
  while(i<css.length){if(/\s/.test(css[i])){i++;continue}
   if(css.startsWith('@media',i)){const o=css.indexOf('{',i);media=css.slice(i,o);i=o+1;continue}
   if(css[i]==='}'){media=null;i++;continue}
   const o=css.indexOf('{',i),c=css.indexOf('}',o);rules.push({media,rule:css.slice(i,c+1)});i=c+1}return rules};
 const original=parse(String(head('src/styles/journey/journey.css'))),copied=parse(fs.readFileSync(path.join(client,'src/styles/journey/garden.css'),'utf8'));
 let cursor=0;for(const r of copied){const at=original.findIndex((o,j)=>j>=cursor&&o.media===r.media&&o.rule===r.rule);assert.ok(at>=0,`Verbatim, in order: ${r.media||''} ${r.rule.slice(0,60)}`);cursor=at+1}
 report.frames.copiedRules=copied.length;
 assert.equal(fs.existsSync(path.join(client,'src/styles/journey/journey.css')),false);
 const allCss=['src/styles/journey/garden.css','src/styles/lines/garden-stage.css','src/styles/lines/path.css','src/styles/lines/lines.css'].map(f=>fs.readFileSync(path.join(client,f),'utf8')).join('\n');
 assert.ok(!/assessment|roadmap|milestone|activity-|timer-|analytics|focus-panel|chart-|network-|journey-chapters|journey-chrome|community-|research-thread/.test(allCss),'No dead chapter 1–4 rules');
 // 3. One scroll driver: only experience.js listens to scroll; no ScrollTrigger or CSS scroll timelines; the old driver is gone.
 for(const file of ['src/js/journey/journey.js','src/js/journey/network.js'])assert.equal(fs.existsSync(path.join(client,file)),false,`${file} removed`);
 const scripts=['src/js/reels','src/js/lines','src/js/journey'].flatMap(d=>fs.readdirSync(path.join(client,d)).map(f=>path.join(d,f)));
 for(const file of scripts){const text=fs.readFileSync(path.join(client,file),'utf8');if(!file.endsWith('experience.js'))assert.ok(!/addEventListener\(['"]scroll/.test(text),`${file} has no scroll listener`);assert.ok(!/ScrollTrigger|scroll-timeline|animation-timeline/.test(text),file)}
 assert.ok(!now.includes('journey.js'),'The old journey driver is not loaded');
 report.cases.push('Byte-identical garden.js, choreography.js, camera.js, garden.svg and garden/invitation markup; garden.css verbatim from HEAD with no dead rules; one scroll driver.');

 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 async function open(options={}){const context=await browser.newContext({viewport:{width:1440,height:900},...options}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'/hero-reels-lab.html?reelsDebug');if(options.javaScriptEnabled!==false)await page.waitForFunction(()=>window.gardenLab&&document.querySelector('#hero-v2').dataset.ready==='true');return page}
 async function capture(page,name){const buffer=await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');return buffer}
 const differing=(a,b)=>{let n=0;for(let i=0;i<a.data.length;i+=4)if(Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2]))>24)n++;return n};
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const p=await open({viewport}),prefix=String(viewport.width),w=viewport.width;
  await p.evaluate(()=>{window.originalGarden=document.querySelector('.garden-art svg')});
  // The seam: section 4's last frame (the root) and the garden's first frame are one picture.
  const start=await p.evaluate(()=>gardenLab.state.start);
  await p.evaluate(s=>scrollTo(0,Math.floor(s)-3),start);await p.waitForTimeout(900);
  assert.equal(await p.locator('#product-journey .journey-stage').evaluate(e=>getComputedStyle(e).visibility),'hidden','The garden stays hidden until it pins');
  const a=decode(await capture(p,prefix+'-seam-root'));
  await p.evaluate(s=>scrollTo(0,Math.ceil(s)),start);await p.waitForTimeout(900);
  assert.equal(await p.locator('#product-journey .journey-stage').evaluate(e=>getComputedStyle(e).visibility),'visible');
  // The garden's first frame (t0 exactly). Past it the camera is already moving, as it was on HEAD.
  await p.evaluate(t=>gardenLab.renderAt(t),6.22);await p.waitForTimeout(200);
  const b=decode(await capture(p,prefix+'-seam-garden'));
  // Only anti-aliasing may differ: the root's geometry matches on both sides to within 0.004px, but the garden draws it
  // under the camera's rotated 3D transform, which Chrome rasterises differently from section 4's flat SVG matrix.
  // Strong differences are near zero, and every difference lies on the root drawing.
  const diffs=(thr)=>{let n=0,x0=Infinity,x1=-Infinity,y1=-Infinity;for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){const i=(y*a.width+x)*4;if(Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2]))>thr){n++;x0=Math.min(x0,x);x1=Math.max(x1,x);y1=Math.max(y1,y)}}return{n,x0,x1,y1}};
  const soft=diffs(24),strong=diffs(60),tipAt=await p.evaluate(()=>gardenLab.state.entry);report.seam[prefix]={soft,strong,entry:tipAt};
  const onRoot=d=>d.n===0||(d.x0>=tipAt.x-130&&d.x1<=tipAt.x+130&&d.y1<=tipAt.y+20);
  assert.ok(strong.n<=40,`Seam: ${strong.n} pixels differ strongly`);
  assert.ok(onRoot(soft)&&onRoot(strong),`Seam differences stay on the root (soil line ±120px, trunk, tail): ${JSON.stringify({soft,strong})}`);
  const entry=await p.evaluate(()=>[gardenLab.state.entry,pathLab.state.entry]);assert.deepEqual(entry[0],entry[1],'Section 4 aims the root at the garden’s own entry point');
  // The seed arrives from the root: it appears at the root's tip.
  await p.evaluate(()=>gardenLab.seek(6.3));await p.waitForTimeout(250);await p.evaluate(()=>gardenLab.renderAt(6.3));
  const seed=await p.locator('.journey-seed').boundingBox(),tip=await p.evaluate(()=>{const e=document.querySelector('.garden-root-tail'),q=e.getPointAtLength(e.getTotalLength()),m=e.getScreenCTM();return{x:q.x*m.a+q.y*m.c+m.e,y:q.x*m.b+q.y*m.d+m.f}});
  report.seam['seedTip'+prefix]={seed:[seed.x+seed.width/2,seed.y+seed.height/2],tip:[tip.x,tip.y]};
  assert.ok(Math.hypot(seed.x+seed.width/2-tip.x,seed.y+seed.height/2-tip.y)<3,'The seed appears at the root’s tip');
  // Frame-for-frame with HEAD. The references are HEAD's own frames at the exact t HEAD drew. Chrome reuses the
  // garden panel's raster between scales, so the beat is walked in order on a fresh page, as the references were.
  const index=JSON.parse(fs.readFileSync(path.join(refs,`head-${w}`,'index.json'),'utf8')).frames,targets=Object.entries(index);report.frames[prefix]={};
  {const fresh=await open({viewport});await fresh.waitForFunction(()=>gardenLab.state.enhanced);await fresh.waitForTimeout(400);
   for(let step=0;step<=77;step++){const nominal=+(6.22+step*.025).toFixed(3),hit=targets.find(([f])=>Math.abs(parseFloat(f.slice(1))-nominal)<1e-6),t=hit?hit[1]:nominal;
    await fresh.evaluate(t=>gardenLab.seek(t),t);await fresh.waitForTimeout(150);await fresh.evaluate(t=>gardenLab.renderAt(t),t);await fresh.waitForTimeout(120);
    if(!hit)continue;const n=differing(decode(fs.readFileSync(path.join(refs,`head-${w}`,hit[0]))),decode(await fresh.screenshot()));report.frames[prefix][hit[0]]=n;
    assert.equal(n,0,`${w}px ${hit[0]}: ${n} pixels differ from HEAD`)}
   await fresh.context().close()}
  // The invitation follows the garden directly; its link is reachable only when it is on screen.
  await p.evaluate(()=>gardenLab.seek(10.3));await p.waitForTimeout(500);await capture(p,prefix+'-invitation');
  const finish=await p.locator('#journey-finish').evaluate(e=>({opacity:Number(getComputedStyle(e).opacity),inert:e.inert}));assert.equal(finish.opacity,1);assert.equal(finish.inert,false);
  assert.equal(await p.locator('.journey-cta').evaluate(e=>e.tabIndex),0);assert.equal(await p.locator('.journey-cta').getAttribute('href'),'https://tally.so/r/QKgA0G');
  await p.evaluate(()=>gardenLab.seek(7.5));await p.waitForTimeout(300);assert.equal(await p.locator('.journey-cta').evaluate(e=>e.tabIndex),-1);
  // Reversible, and the garden illustration is the same element throughout.
  await p.evaluate(()=>gardenLab.seek(7.6));await p.waitForTimeout(300);const ref=await p.evaluate(()=>({camera:document.querySelector('.journey-camera').style.transform,growth:gardenLab.state.growth}));
  for(const t of [9.9,6.3,8.6,6.9,10.4])await p.evaluate(t=>gardenLab.seek(t),t);
  await p.evaluate(()=>gardenLab.seek(7.6));await p.waitForTimeout(300);assert.deepEqual(await p.evaluate(()=>({camera:document.querySelector('.journey-camera').style.transform,growth:gardenLab.state.growth})),ref);
  assert.equal(await p.evaluate(()=>originalGarden===document.querySelector('.garden-art svg')),true);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // Frame pacing scrolling natively through the root's descent into the garden.
  const timing=await p.evaluate(async()=>{const s=pathLab.state,el=document.querySelector('#way-back'),from=el.offsetTop+(el.offsetHeight-innerHeight)*(15.8/17.6),to=gardenLab.state.start+gardenLab.state.travel*.6,deltas=[];let last=0,run=true;
   const tick=t=>{if(last)deltas.push(t-last);last=t;if(run)requestAnimationFrame(tick)};requestAnimationFrame(tick);
   for(let i=0;i<=60;i++){scrollTo(0,from+(to-from)*i/60);await new Promise(r=>setTimeout(r,33))}run=false;deltas.sort((a,b)=>a-b);
   return{median:deltas[Math.floor(deltas.length/2)],p95:deltas[Math.floor(deltas.length*.95)],samples:deltas.length}});
  report.frames['timing'+prefix]=timing;assert.ok(timing.median<25,`Garden frame median ${timing.median}ms`);
  report.cases.push(`${w}: pixel seam from section 4's root into the garden; seed at the root's tip; ${Object.keys(index).length} frames pixel-identical to HEAD; invitation and link focus; reversible; same garden element; no overflow; frame pacing.`);
  await p.context().close();
 }
 // Static fallbacks: reduced motion and no JavaScript keep the garden and the invitation readable in normal flow.
 for(const options of [{reducedMotion:'reduce'},{javaScriptEnabled:false}]){
  const p=await open({viewport:{width:390,height:844},...options});
  if(options.reducedMotion)assert.equal(await p.locator('#product-journey').evaluate(e=>e.classList.contains('is-static')),true);
  assert.equal(await p.locator('#journey-garden .garden-panel').count(),1,'The garden panel is in its article');
  for(const id of ['#journey-garden','#journey-finish'])assert.equal(await p.locator(id).evaluate(e=>getComputedStyle(e).opacity),'1');
  await p.locator('.journey-cta').scrollIntoViewIfNeeded();assert.equal(await p.locator('.journey-cta').evaluate(e=>getComputedStyle(e).display),'inline-flex');
  await capture(p,options.reducedMotion?'reduced-motion':'no-javascript');await p.context().close();
 }
 report.cases.push('Reduced motion and no-JS: garden panel in its article, garden and invitation readable, link visible.');
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(async error=>{report.failure=error.stack;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.error(error);await browser?.close();process.exit(1)});
