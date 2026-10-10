const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.HERO_URL||'http://127.0.0.1:8793',out=path.resolve(__dirname,'../references/hero-v2-patch-validation');fs.mkdirSync(out,{recursive:true});
let browser;const report={cases:[],errors:[],sequences:{}};
(async()=>{browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 async function create(options={}){
  const p=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,...options});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
  await p.addInitScript(()=>{
   window.transitionFrames=[];window.visibilityAudit=[];window.surfaceWrites=[];window.surfaceIds=new Set();window.phaseEvents=[];let previousBucket=-1;
   document.addEventListener('hero:phase',e=>phaseEvents.push(e.detail.phase),true);
   for(const key of ['width','height']){const d=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key);Object.defineProperty(HTMLCanvasElement.prototype,key,{...d,set(v){d.set.call(this,v);if(this.closest('.bimo'))surfaceWrites.push({key,value:v,time:performance.now()})}})}
   function sample(){
    const hero=window.heroV2,root=document.querySelector('.bimo');if(!hero||!root)return;
    const time=hero.state.time,c=root.querySelector('canvas');surfaceIds.add(c);const runtime=root.dataset.runtime;
    const image=document.createElement('canvas');image.width=350;image.height=430;const ctx=image.getContext('2d');
    // Same containment and layer order as the visible persistent renderer.
    if(getComputedStyle(c).opacity!=='0')ctx.drawImage(c,0,0,350,430);
    const group=parseFloat(getComputedStyle(root.querySelector('.bimo-stills')).opacity);
    for(const selector of ['.awake-still','.focus-still']){const im=root.querySelector(selector);if(im.complete&&im.naturalWidth){ctx.globalAlpha=group*parseFloat(getComputedStyle(im).opacity);ctx.drawImage(im,0,0,350,430)}}ctx.globalAlpha=1;
    const data=ctx.getImageData(0,0,350,430).data;let pixels=0;for(let i=3;i<data.length;i+=16)if(data[i]>80)pixels++;
    const r=root.getBoundingClientRect();const row={time,runtime,pixels,rect:{x:r.x,y:r.y,width:r.width,height:r.height},writes:surfaceWrites.length};visibilityAudit.push(row);
    const bucket=Math.floor((time-3.5)/.125);if(time>=3.5&&time<6.625&&bucket>=0&&bucket<=24&&bucket!==previousBucket){previousBucket=bucket;transitionFrames.push({...row,png:image.toDataURL()})}
   }
   function tick(){setTimeout(sample,0);if(!window.auditStop)requestAnimationFrame(tick)}requestAnimationFrame(tick);
  });return p;
 }
 async function start(p){await p.goto(base+'/hero-lab-v2.html?heroDebug');await p.waitForFunction(()=>window.heroV2)}
 async function finish(p,name){
  await p.waitForFunction(()=>heroV2.state.gate.open,{},{timeout:18000});await p.waitForTimeout(200);await p.evaluate(()=>window.auditStop=true);
  const result=await p.evaluate(()=>({frames:transitionFrames,audit:visibilityAudit,writes:surfaceWrites,surfaces:surfaceIds.size,state:heroV2.state,phases:phaseEvents}));
  assert.equal(result.surfaces,1);assert.ok(result.audit.length>80);assert.ok(result.audit.every(f=>f.pixels>1000),name+': Bimo must have painted pixels on every audited frame');
  assert.equal(result.frames.length,25,name+': exactly 25 transition samples');
  const sizes=result.frames.map(f=>f.writes);assert.equal(Math.max(...sizes)-Math.min(...sizes),0,'No bitmap resize during pose choreography');
  assert.deepEqual(result.phases,['ARRIVAL','LIFT','VERTICAL_ALIGNMENT','PERFECT_BALANCE','GROW','LIVING_IDLE']);assert.equal(result.state.stones,7);assert.equal(result.state.inputs.emotionStage,1);
  const folder=path.join(out,name);fs.mkdirSync(folder,{recursive:true});
  for(let i=0;i<result.frames.length;i++){const f=result.frames[i];fs.writeFileSync(path.join(folder,String(i).padStart(2,'0')+'.png'),Buffer.from(f.png.split(',')[1],'base64'));delete f.png}
  fs.writeFileSync(path.join(folder,'metrics.json'),JSON.stringify(result,null,2));report.sequences[name]={samples:result.frames.length,auditedFrames:result.audit.length,minPaintedPixels:Math.min(...result.audit.map(f=>f.pixels)),surfaceWrites:result.writes.length};return result;
 }
 const normal=await create();await start(normal);await finish(normal,'normal-transition');report.cases.push('Normal autoplay: one persistent canvas; no empty character frame; 25 samples at ~125ms master-clock intervals');
 await normal.screenshot({path:path.join(out,'idle-09s.png')});
 const cloudA=await normal.locator('.cloud-layers g').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,matrix:e.getAttribute('transform')})));await normal.waitForTimeout(6000);
 await normal.screenshot({path:path.join(out,'idle-15s.png')});const cloudB=await normal.locator('.cloud-layers g').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,matrix:e.getAttribute('transform')})));
 const delta=cloudB.map((x,i)=>x.x-cloudA[i].x);assert.ok(delta.every(d=>Math.abs(d)>.5));assert.ok(Math.max(...delta)-Math.min(...delta)>1);report.cloudDisplacement6s=delta;
 await normal.waitForTimeout(4500);await normal.screenshot({path:path.join(out,'idle-20s.png')});assert.equal(await normal.evaluate(()=>heroV2.state.time),8.2);report.cases.push('All three cloud groups visibly displace at different rates; living idle remains active after 20 seconds without replay');await normal.close();
 const delayed=await create();await delayed.route('**/bimo.riv',async r=>{await new Promise(resolve=>setTimeout(resolve,5600));await r.continue()});await start(delayed);await finish(delayed,'delayed-rive-transition');report.cases.push('Rive delayed 5.6 seconds: decoded posters stay visible, initialized canvas takes over without empty frames');await delayed.close();
 const focusDelay=await create();await focusDelay.route('**/bimo-focus.png',async r=>{await new Promise(resolve=>setTimeout(resolve,5000));await r.continue()});await start(focusDelay);await finish(focusDelay,'delayed-focus-image');report.cases.push('Focus image delayed: outgoing poster retained until incoming image is decoded');await focusDelay.close();
 const aggressive=await create();await start(aggressive);for(let i=0;i<8;i++)await aggressive.mouse.wheel(0,2400);await finish(aggressive,'aggressive-transition');report.cases.push('Immediate aggressive scroll: all phases visited, persistent painted Bimo and gate unlock only on completion');await aggressive.close();
 const reduced=await create({reducedMotion:'reduce'});await start(reduced);await reduced.waitForFunction(()=>heroV2.state.character==='live');assert.equal(await reduced.evaluate(()=>heroV2.state.progress),1);await reduced.screenshot({path:path.join(out,'reduced-motion.png')});const ca=await reduced.locator('.cloud-layers').evaluate(e=>e.innerHTML);await reduced.waitForTimeout(800);assert.equal(await reduced.locator('.cloud-layers').evaluate(e=>e.innerHTML),ca);report.cases.push('Reduced motion: complete focused/balanced scene; cloud groups remain static');await reduced.close();
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exit(1)});
