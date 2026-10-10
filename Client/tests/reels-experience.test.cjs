const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.REELS_URL||'http://127.0.0.1:8794',out=path.resolve(__dirname,'../references/reels-validation');
fs.mkdirSync(out,{recursive:true});
const results={cases:[],errors:[],screenshots:[],metrics:{}};let browser;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const executablePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 browser=await chromium.launch({headless:true,executablePath});
 async function page(options={}){const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,...options});const p=await context.newPage();p.on('pageerror',e=>results.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')results.errors.push(m.text())});await p.addInitScript(()=>{window.visited=[];window.raf=[];let last=0;function tick(t){if(last)raf.push(t-last);last=t;requestAnimationFrame(tick)}requestAnimationFrame(tick);document.addEventListener('reels:stage',e=>visited.push(e.detail.stage),true)});return p}
 async function ready(p){await p.goto(base+'/hero-reels-lab.html?reelsDebug');await p.waitForFunction(()=>window.reelsLab?.state.character==='live',{},{timeout:15000})}
 async function scroll(p,progress){await p.evaluate(v=>{const t=document.querySelector('.hero-track'),h=document.querySelector('.hero').offsetHeight;window.scrollTo(0,(t.offsetHeight-h)*v)},progress)}
 const normal=await page();await ready(normal);await normal.evaluate(()=>{window.sameBimo=document.querySelector('.bimo canvas');window.sameStones=[...document.querySelectorAll('.stone')]});await normal.waitForFunction(()=>reelsLab.state.unlocked,{},{timeout:16000});
 assert.equal(await normal.evaluate(()=>reelsLab.state.renderer.media.loaded),0);assert.equal(await normal.evaluate(()=>reelsLab.state.inputs.emotionStage),1);
 // Fast native scroll: each narrative phase must remain perceptible and the bitmap never changes.
 await normal.evaluate(()=>{window.samples=[];window.sampling=true;function check(){const s=reelsLab.state,c=document.querySelector('.bimo canvas');samples.push({p:s.visualProgress,stage:s.stage,cards:s.renderer.cards,active:s.renderer.media.playing,same:c===sameBimo,canvas:[c.width,c.height]});if(sampling)requestAnimationFrame(check)}check()});
 await normal.mouse.wheel(0,18000);await normal.waitForTimeout(180);assert.ok(await normal.evaluate(()=>reelsLab.state.visualProgress)<.12);
 await normal.waitForFunction(()=>reelsLab.state.visualProgress>.995,{},{timeout:16000});
 const sequence=await normal.evaluate(()=>{sampling=false;return{visited,samples,state:reelsLab.state}});
 assert.deepEqual([...new Set(sequence.visited)],[0,1,2,3,4,5,6]);assert.ok(sequence.samples.every(s=>s.same&&s.active<=5&&s.canvas[0]===700&&s.canvas[1]===860));
 for(let i=1;i<sequence.samples.length;i++)assert.ok(sequence.samples[i].p-sequence.samples[i-1].p<=.0073);
 assert.equal(sequence.state.inputs.emotionStage,4);assert.equal(sequence.state.inputs.pointerLookEnabled,false);assert.equal(sequence.state.renderer.media.created,5);
 results.cases.push('Natural intro → fast wheel: seven stages visited; progress capped; persistent 700×860 canvas; ≤5 decoders; scripted gaze');results.metrics.fastSwipe=sequence.samples.filter((_,i)=>i%15===0);
 // Reverse and repeated direction changes use native page position.
 await scroll(normal,0);await normal.waitForFunction(()=>reelsLab.state.visualProgress<.003,{},{timeout:12000});
 assert.equal(await normal.evaluate(()=>reelsLab.state.renderer.cards),0);assert.equal(await normal.evaluate(()=>reelsLab.state.renderer.media.playing),0);
 assert.equal(await normal.evaluate(()=>sameStones.every((s,i)=>document.querySelectorAll('.stone')[i]===s)),true);
 const centers=await normal.locator('.stone').evaluateAll(es=>es.map(e=>parseFloat(e.style.getPropertyValue('--x'))));assert.ok(Math.max(...centers)-Math.min(...centers)<.1);
 for(const target of [.68,.23,.83,.42]){await scroll(normal,target);await normal.waitForTimeout(520);assert.equal(await normal.evaluate(()=>document.querySelector('.bimo canvas')===sameBimo),true)}
 results.cases.push('Backward scroll restores calm, same stones, stopped videos; repeated direction changes preserve character');
 // Slow controlled scroll and live peak timing.
 await normal.evaluate(()=>reelsLab.seek(.74));await scroll(normal,.74);await normal.evaluate(()=>reelsLab.play());
 for(let i=0;i<24;i++){await scroll(normal,.74+i*.0045);await normal.waitForTimeout(65)}
 await normal.waitForTimeout(900);await normal.evaluate(()=>raf.length=0);await normal.waitForTimeout(1600);
 const perf=await normal.evaluate(()=>raf);perf.sort((a,b)=>a-b);results.metrics.peakRAF={median:perf[Math.floor(perf.length*.5)],p95:perf[Math.floor(perf.length*.95)],samples:perf.length};
 const activePeak=await normal.evaluate(()=>reelsLab.state.renderer.media.playing);assert.ok(activePeak>=3&&activePeak<=5);results.metrics.peakVideos=activePeak;results.cases.push('Controlled scroll through burst; adaptive 3–5 live sources at peak');
 // Pause and viewport resize must never replace or clear the Bimo bitmap.
 await normal.locator('#motion-control').click();const paused=await normal.evaluate(()=>reelsLab.state.visualProgress);await normal.waitForTimeout(250);assert.equal(await normal.evaluate(()=>reelsLab.state.visualProgress),paused);assert.equal(await normal.evaluate(()=>reelsLab.state.renderer.media.playing),0);
 await normal.setViewportSize({width:1280,height:800});assert.equal(await normal.evaluate(()=>document.querySelector('.bimo canvas')===sameBimo),true);await normal.locator('#motion-control').click();results.cases.push('Pause/resume and viewport resize preserve Bimo; pause stops media');await normal.context().close();
 // Gold comparison captures use review seeks but load the real media before sampling.
 for(const size of [{width:1440,height:900},{width:1280,height:800}]){
  const p=await page({viewport:size});await ready(p);
  const frames=[['00-post-hero-calm',.025],['01-tiny-distraction',.15],['02-temptation-orbit',.29],['03-first-collapse',.48],['04-swarm-spiral',.635],['05-black-hole-burst',.84],['06-the-trap',.97]];
  for(const [name,value]of frames){await p.evaluate(v=>reelsLab.seek(v),value);await p.waitForTimeout(800);const file=`${size.width}x${size.height}-${name}.png`;await p.screenshot({path:path.join(out,file)});results.screenshots.push(file);const occupied=await p.locator('.bimo canvas').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=128)if(a[i]>100)n++;return n});assert.ok(occupied>100,'Bimo must remain painted at every state')}
  await p.context().close();
 }
 results.cases.push('Seven captured states at both 1440×900 and 1280×800; actual painted Bimo pixels in all states');
 // Delayed media plus one failed video must retain posters throughout.
 const delayed=await page();await delayed.route('**/reel3.mp4',route=>route.fulfill({status:200,contentType:'video/mp4',body:''}));await delayed.route('**/reel1.mp4',async route=>{await sleep(1600);await route.continue()});await ready(delayed);await delayed.evaluate(()=>reelsLab.seek(.84));await scroll(delayed,.84);await delayed.evaluate(()=>reelsLab.play());await delayed.waitForTimeout(2300);const d=await delayed.evaluate(()=>reelsLab.state);assert.equal(d.renderer.media.failed,1);assert.ok(d.renderer.media.playing<=4);assert.ok(d.renderer.cards>=30);await delayed.screenshot({path:path.join(out,'delayed-and-failed-media.png')});results.cases.push('Delayed reel + failed reel: poster fallback, dense cards retained, remaining sources play');await delayed.context().close();
 const rm=await page({reducedMotion:'reduce'});await ready(rm);await scroll(rm,1);await rm.waitForFunction(()=>reelsLab.state.visualProgress>.98);assert.equal(await rm.evaluate(()=>reelsLab.state.clock),0);assert.equal(await rm.evaluate(()=>reelsLab.state.renderer.media.loaded),0);await rm.screenshot({path:path.join(out,'reduced-motion.png')});results.cases.push('Reduced motion: static representative scenes, no ambient clock or video requests');await rm.context().close();
 const mobile=await page({viewport:{width:390,height:844}});await ready(mobile);await mobile.evaluate(()=>reelsLab.seek(.84));await mobile.waitForTimeout(700);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.screenshot({path:path.join(out,'mobile-burst.png')});await mobile.context().close();results.cases.push('390×844 fallback composition: no horizontal overflow');
 assert.deepEqual(results.errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(async e=>{results.failure=String(e.stack);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(results,null,2));console.error(e);await browser?.close();process.exit(1)});
