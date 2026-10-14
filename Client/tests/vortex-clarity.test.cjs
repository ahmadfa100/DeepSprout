// Section 2 exit (black hole → dark void) and section 3 (the line field, "You're not alone").
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {PNG}=require('pngjs');
const base=process.env.REELS_URL||'http://127.0.0.1:8792';
const out=path.resolve(__dirname,'../references/vortex-clarity-validation');
const decode=buffer=>PNG.sync.read(buffer);
const e2num=text=>/^\d+$/.test(text);
function pixel(buffer,x,y){const png=decode(buffer),i=(Math.floor(y)*png.width+Math.floor(x))*4;return[...png.data.slice(i,i+3)]}
const report={cases:[],screenshots:[],errors:[],headline:{}};let browser;
// Copy is checked verbatim: statistics and their sources must never drift.
const COPY={
 alone:['You’re not alone.','Millions of people are scrolling the same feed, right now.'],
 scale:['1 in 5 teens is on TikTok almost constantly.','4 in 10 teens are online almost constantly — up from 24% a decade ago.','Pew Research Center, 2025 · survey of 1,458 US teens aged 13–17'],
 rot:['brain rot','Oxford Word of the Year 2024 · usage +230% (2023→2024) · first recorded 1854','Oxford University Press · public vote, 37,000+ participants'],
 research:['Research links heavy short-form use with lower sustained attention.','Association, not proof.','peer-reviewed studies, 2024–2025'],
 turn:['The way back'],
};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const {spiralIn,collapseFrame,EXIT_END}=await import(pathToFileURL(path.resolve(__dirname,'../src/js/reels/collapse.js')));
 const {SCENES,sceneAt,litCount,yearAt,ROW}=await import(pathToFileURL(path.resolve(__dirname,'../src/js/lines/field.js')));
 assert.deepEqual(spiralIn(.9,.2,4,2,0,.02,.45),{x:.9,y:.2,z:4,size:2,turn:0,swallowed:false});
 let previous=Infinity;for(let q=0;q<=.45;q+=.001){const a=spiralIn(.9,.2,4,2,q,.02,.45),radius=Math.hypot(a.x-.568,(a.y-.46)/1.38);assert.ok(radius<=previous+1e-9);previous=radius;assert.deepEqual(a,spiralIn(.9,.2,4,2,q,.02,.45))}
 assert.equal(EXIT_END,.70);assert.equal(collapseFrame(EXIT_END).phase,'void');assert.equal(collapseFrame(EXIT_END).void,1);
 assert.equal('light' in collapseFrame(.9),false,'Section 2 ends on the void; the old cream opening is gone');
 report.cases.push('Curved inward paths have decreasing radius/depth/scale; pure scroll evaluation is deterministic and reversible; the exit ends on the full void.');
 SCENES.forEach((s,i)=>{if(i)assert.equal(s.from,SCENES[i-1].to,'Scenes tile the section with no gaps');assert.ok(s.key>=s.from&&s.key<=s.to);assert.equal(sceneAt(s.key).name,s.name)});
 assert.equal(SCENES.at(-1).to,1);assert.equal(ROW,100);
 assert.equal(Math.round(litCount(.39)),20);assert.equal(Math.round(litCount(.33)),0);assert.equal(Math.round(litCount(.41)),24);assert.equal(Math.round(litCount(.47)),40);
 assert.equal(yearAt(.41),2015);assert.equal(yearAt(.47),2025);
 for(let p=0,last=-1;p<=1;p+=.002){const n=litCount(p);assert.ok(n>=last-1e-9,'Lit count only grows with scroll, so reversing replays it backwards');last=n}
 report.cases.push('Line-field scenes tile 0–1; the Pew row is exactly 100 lines; lit count 0→20, then 24→40 with 2015→2025, monotonic in scroll.');

 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 async function open(options={}){const context=await browser.newContext({viewport:{width:1440,height:900},...options}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'/hero-reels-lab.html?reelsDebug');if(options.javaScriptEnabled!==false)await page.waitForFunction(()=>window.reelsLab?.state.character==='live'&&window.linesLab);return page}
 async function capture(page,name){const buffer=await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');return buffer}
 async function exit(page,q){await page.evaluate(q=>reelsLab.seekExit(q),q);await page.waitForTimeout(450)}
 async function lines(page,p,wait=700){await page.evaluate(p=>linesLab.seek(p),p);await page.waitForTimeout(wait);return page.evaluate(()=>linesLab.state)}
 const visibleText=(page,scene)=>page.locator(`[data-lines-scene="${scene}"]`).evaluate(e=>({opacity:Number(getComputedStyle(e).opacity),text:[...e.querySelectorAll('h2,h3,p:not([aria-hidden])')].map(n=>{const c=n.cloneNode(true);c.querySelectorAll('[aria-hidden]').forEach(x=>x.remove());return c.textContent.trim()})}));
 const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const p=await open({viewport}),prefix=String(viewport.width),{width:w,height:h}=viewport;
  await p.evaluate(()=>{window.originalBimo=document.querySelector('.bimo canvas');window.originalStones=[...document.querySelectorAll('.stone')];window.originalCanvas=document.querySelector('.lines-canvas')});
  await p.evaluate(()=>reelsLab.seek(.97));await p.waitForTimeout(600);await capture(p,prefix+'-trap');
  for(const [name,q]of [['gravity',.16],['collapse',.33],['bimo',.42],['consumption',.64],['void',EXIT_END]]){
   await exit(p,q);const buffer=await capture(p,prefix+'-'+name);
   assert.equal(await noOverflow(p),true);
   if(name==='void')for(const [x,y]of [[5,5],[w-5,5],[5,h-5],[w-5,h-5],[w/2,h/2]])assert.deepEqual(pixel(buffer,x,y),[5,4,10],'The void must fill the viewport, with no pause button');
   if(q>=.53)assert.equal(await p.evaluate(()=>reelsLab.state.renderer.media.playing),0);
  }
  // Native scroll, forward, back and fast: the exit is capped at the void and the same Bimo/stones survive.
  for(const q of [.80,.35,.67,.92,.20,1]){await p.evaluate(q=>{reelsLab.play();const d=reelsLab.state.distances;scrollTo(0,d.story+q*d.exit)},q);await p.waitForTimeout(140);const state=await p.evaluate(()=>reelsLab.state);assert.ok(Math.abs(state.exitProgress-Math.min(q,EXIT_END))<.002);assert.equal(await p.evaluate(()=>document.querySelector('.bimo canvas')===originalBimo&&originalStones.every((s,i)=>document.querySelectorAll('.stone')[i]===s)),true)}
  // The seam: half void, half line field, both the same dark — no cut, no cream, no gap.
  await p.evaluate(()=>{reelsLab.play();scrollTo(0,document.querySelector('#not-alone').offsetTop-innerHeight/2)});await p.waitForTimeout(500);
  const seam=await capture(p,prefix+'-seam');
  for(const [x,y]of [[5,5],[w-5,h*.25],[w/2,h/2-2],[w/2,h/2+2],[5,h*.75],[w-5,h-5]])assert.deepEqual(pixel(seam,x,y),[5,4,10],'Section 2 hands over to section 3 on the same dark');
  const scenes={};
  for(const s of [['void',.03],['line',.13],['alone',.285],['scale',.39],['trend',.46],['rot',.69],['research',.79],['turn',1]]){
   const state=await lines(p,s[1]);scenes[s[0]]={state,buffer:await capture(p,`${prefix}-lines-${s[0]}`)};
   assert.equal(state.scene,s[0]);assert.equal(await noOverflow(p),true);
  }
  const dark=([r,g,b])=>Math.max(r,g,b)<40,lum=([r,g,b])=>(r+g+b)/3;
  assert.ok([[w/2,h/2],[w*.2,h*.3],[w*.8,h*.7]].every(([x,y])=>dark(pixel(scenes.void.buffer,x,y))),'Scene 0 is silent: nothing drawn');
  assert.ok(lum(pixel(scenes.line.buffer,w/2,h/2))>110,'Scene 1: one bright line at the centre');
  assert.equal(scenes.alone.state.lines,w<=700?120:280,'Line count degrades on narrow viewports');
  for(const [scene,copy]of Object.entries(COPY)){const t=await visibleText(p,scene);for(const line of copy)assert.ok(t.text.includes(line),`${scene}: "${line}"`)}
  for(const [scene,state]of [['alone','alone'],['scale','scale'],['rot','rot'],['research','research'],['turn','turn']]){await lines(p,scenes[state].state.progress,500);assert.equal((await visibleText(p,scene)).opacity,1,`${scene} copy is visible in its own scene`)}
  await lines(p,.39,500);assert.equal(await p.locator('[data-lines-count]').textContent(),'20');assert.equal(scenes.scale.state.lit,20);
  await lines(p,.46,500);assert.equal(await p.locator('[data-lines-count]').textContent(),'40');assert.equal(await p.locator('[data-lines-year]').textContent(),'2025');
  {
   // Exactly 100 lines in the Pew row, counted from pixels along the row (at 2× pixels on narrow screens).
   let png=decode(scenes.scale.buffer),scale=1;
   if(w<=700){const sharp=await browser.newContext({viewport,deviceScaleFactor:2}),q=await sharp.newPage();await q.goto(base+'/hero-reels-lab.html?reelsDebug');await q.waitForFunction(()=>window.linesLab&&document.querySelector('#hero-v2').dataset.ready==='true');await lines(q,.39,700);png=decode(await q.screenshot());scale=2;await sharp.close()}
   const y=Math.round(h*(w<=700?.56:.55)*scale);let runs=0,inside=false;
   for(let x=0;x<png.width;x++){const i=(y*png.width+x)*4,on=Math.max(png.data[i],png.data[i+1],png.data[i+2])>40;if(on&&!inside)runs++;inside=on}
   assert.equal(runs,100,`The row is exactly 100 lines at ${w}px`);
  }
  // "brain rot" is negative space inside the tangle, never a visible DOM headline.
  // Pixels inside the glyphs show the background; pixels around them, inside the word's box, show tangle.
  await lines(p,.69,600);const rotShot=decode(await p.screenshot()),{inside,outside}=await p.evaluate(()=>linesLab.samples());
  const mean=points=>points.reduce((sum,[x,y])=>{const i=(Math.floor(y)*rotShot.width+Math.floor(x))*4;return sum+(rotShot.data[i]+rotShot.data[i+1]+rotShot.data[i+2])/3},0)/points.length;
  const inWord=mean(inside),aroundWord=mean(outside);report.headline['brainRot'+prefix]={inWord,aroundWord,samples:[inside.length,outside.length]};
  assert.ok(inside.length>50&&outside.length>50);
  assert.ok(inWord<30&&aroundWord>inWord*1.8,`Glyphs read as cut-outs of the tangle (${inWord.toFixed(1)} inside vs ${aroundWord.toFixed(1)} around)`);
  assert.equal(await p.evaluate(()=>[...document.querySelectorAll('#not-alone *')].filter(e=>e.children.length===0&&/brain rot/i.test(e.textContent)).every(e=>e.classList.contains('sr-only'))),true);
  // The turn: cream page, one ink line horizontal through the centre.
  const turn=scenes.turn.buffer;assert.deepEqual(pixel(turn,5,5),[250,248,243]);
  {const png=decode(turn);let stray=0;for(let y=0;y<png.height;y+=4)for(let x=0;x<png.width;x+=4){if(Math.abs(y-h/2)<40)continue;const i=(y*png.width+x)*4;if(png.data[i]!==250||png.data[i+1]!==248||png.data[i+2]!==243)stray++}assert.equal(stray,0,'Nothing but cream away from the handoff line')}assert.ok(lum(pixel(turn,w/2,h/2))<120,'The handoff line crosses the centre');
  assert.ok(lum(pixel(turn,w/2-Math.min(w*.56,760)/2+20,h/2))<160&&lum(pixel(turn,w/2,h/2-30))>230,'It is horizontal');
  const headline=await p.locator('#not-alone-title').evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,letterSpacing:s.letterSpacing,x:r.x,y:r.y,width:r.width,height:r.height}});
  // The Scene 2 headline is anchored: its box never depends on the paragraph below it. Station 6 matches these numbers.
  const measure=()=>p.locator('#not-alone-title').evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,letterSpacing:s.letterSpacing,lineHeight:s.lineHeight,x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,stageHeight:e.closest('.lines-stage').getBoundingClientRect().height}});
  await lines(p,.285,500);report.headline[prefix]=await measure();
  const anchored=report.headline[prefix];assert.equal(anchored.fontWeight,'500');assert.ok(headline);
  assert.equal(anchored.fontSize,w>700?'38px':'26px','clamp(26px,3vw,38px)');
  assert.ok(Math.abs(anchored.bottom-(anchored.stageHeight*.39-20))<1,'Headline bottom is 20px above the top of the user line');
  const body=p.locator('.lines-alone .lines-body'),original=await body.textContent();
  for(const text of ['x','Millions of people are scrolling the same feed, right now. '.repeat(6)]){await body.evaluate((e,t)=>e.textContent=t,text);const moved=await measure();assert.deepEqual([moved.x,moved.y,moved.width,moved.height],[anchored.x,anchored.y,anchored.width,anchored.height],'The headline does not move with the paragraph')}
  await body.evaluate((e,t)=>e.textContent=t,original);
  // Type scale: only numerals are large; everything else stays within its token.
  const sizes=await p.evaluate(()=>[...document.querySelectorAll('#not-alone .lines-copy *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>({cls:e.className,size:parseFloat(getComputedStyle(e).fontSize),text:e.textContent.trim()})));
  for(const {cls,size,text}of sizes){if(/lines-numeral/.test(cls)||e2num(text))assert.ok(/^\d+$/.test(text),`Only numbers are large: ${text}`);else assert.ok(size<=38,`${cls} "${text.slice(0,30)}" is ${size}px`)}
  for(const [sel,expected]of [['.lines-eyebrow',13],['.lines-caption',12]])assert.ok((await p.locator(`#not-alone ${sel}`).evaluateAll(es=>es.map(e=>parseFloat(getComputedStyle(e).fontSize)))).every(v=>v===expected),sel);
  assert.ok((await p.locator('#not-alone .lines-body').evaluateAll(es=>es.map(e=>parseFloat(getComputedStyle(e).fontSize)))).every(v=>v>=16&&v<=17),'Body 16–17px');
  // One canvas, no DOM per line, same canvas after every scene; reversing restores the earlier state.
  assert.equal(await p.locator('#not-alone canvas').count(),1);assert.ok(await p.locator('#not-alone *').count()<40);
  for(const q of [.9,.2,.6,.38,1,.46])await lines(p,q,120);
  const back=await lines(p,.46,500);assert.equal(back.scene,'trend');assert.equal(back.lit,40);assert.equal(back.year,2025);
  assert.equal(await p.evaluate(()=>document.querySelector('.lines-canvas')===originalCanvas),true);
  // Offscreen: the hero pauses, and the field stops once it leaves the viewport.
  const state=await p.evaluate(()=>reelsLab.state);assert.equal(state.offscreen,true);assert.equal(state.renderer.media.playing,0);const time=state.clock;await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>reelsLab.state.clock),time);
  await p.evaluate(()=>{reelsLab.play();scrollTo(0,0)});await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>reelsLab.state.exitProgress),0);assert.equal(await p.evaluate(()=>linesLab.state.visible),false);assert.equal(await p.locator('.bimo-gravity').evaluate(e=>getComputedStyle(e).visibility),'visible');
  // Every statement stays in the accessibility tree while other scenes play.
  await lines(p,.39,400);const tree=JSON.stringify(await p.accessibility.snapshot({root:await p.$('#not-alone'),interestingOnly:false}));
  for(const copy of Object.values(COPY))for(const line of copy)assert.ok(tree.toLowerCase().includes(line.toLowerCase()),`Accessible while off-scene: "${line}"`);
  // A hidden tab draws nothing; it resumes when visible again.
  await lines(p,.6,300);await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
  const hiddenFrames=await p.evaluate(()=>linesLab.state.frames);await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>linesLab.state.frames),hiddenFrames,'No frames while hidden');
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});await p.waitForTimeout(300);assert.ok(await p.evaluate(()=>linesLab.state.frames)>hiddenFrames,'Frames resume when visible');
  // Frame pacing while scrolling natively through the tangle (one rAF loop, one canvas).
  const timing=await p.evaluate(async()=>{const top=document.querySelector('#not-alone').offsetTop,travel=document.querySelector('#not-alone').offsetHeight-innerHeight,deltas=[];let last=0,run=true;
   const tick=t=>{if(last)deltas.push(t-last);last=t;if(run)requestAnimationFrame(tick)};requestAnimationFrame(tick);
   for(let i=0;i<=60;i++){scrollTo(0,top+travel*(.48+i*.0037));await new Promise(r=>setTimeout(r,33))}run=false;deltas.sort((a,b)=>a-b);
   return{median:deltas[Math.floor(deltas.length/2)],p95:deltas[Math.floor(deltas.length*.95)],samples:deltas.length}});
  report.headline['frames'+prefix]=timing;assert.ok(timing.median<25,`Tangle frame median ${timing.median}ms`);
  report.cases.push(`${viewport.width}×${viewport.height}: collapse phases, pixel-tested void, exit capped at the void under forward/reverse/rapid native scroll, same-dark seam into section 3, all eight line-field scenes, verbatim copy and sources, 100-line row, negative-space "brain rot", horizontal handoff line on cream, reversible state, one canvas, zero overflow, same Bimo/stones, offscreen pause.`);
  await p.context().close();
 }
 // Real end-key jump lands past the field; Home restores the start.
 const fast=await open();await fast.keyboard.press('End');await fast.waitForFunction(end=>reelsLab.state.exitProgress===end,EXIT_END,{timeout:8000});assert.equal(await fast.evaluate(()=>reelsLab.state.unlocked),true,'Skipping past the entire story must not leave the offscreen intro gate permanently paused');assert.equal(await fast.evaluate(()=>reelsLab.state.renderer.media.playing),0);await fast.keyboard.press('Home');await fast.waitForFunction(()=>reelsLab.state.exitProgress===0,null,{timeout:8000});await fast.context().close();
 // Reduced motion: each scene is its finished key frame, nothing moves between frames, scroll still advances scenes.
 const reduced=await open({viewport:{width:390,height:844},reducedMotion:'reduce'});
 assert.equal(await reduced.evaluate(()=>reelsLab.state.renderer.media.loaded),0);assert.equal(await reduced.locator('.vortex-transition').evaluate(e=>getComputedStyle(e).display),'none');
 for(const [q,scene]of [[.2,'alone'],[.35,'scale'],[.44,'trend'],[.6,'rot'],[.75,'research'],[.95,'turn']]){
  const state=await lines(reduced,q,400);assert.equal(state.scene,scene);const a=await reduced.screenshot(),b=(await reduced.waitForTimeout(500),await reduced.screenshot());assert.ok(a.equals(b),`${scene} is a still frame`);
  const owner=scene==='trend'?'scale':scene;assert.equal((await visibleText(reduced,owner)).opacity,1);
 }
 const first=(await lines(reduced,.6,400),await reduced.screenshot());await lines(reduced,1,200);await lines(reduced,.2,200);const again=(await lines(reduced,.6,400),await reduced.screenshot());assert.ok(first.equals(again),'Scrubbing back restores the identical frame');
 await capture(reduced,'reduced-motion');await reduced.context().close();
 // No JavaScript: every statement and source is readable in normal flow.
 const plain=await open({viewport:{width:390,height:844},javaScriptEnabled:false});assert.equal(await plain.locator('.hero-track').evaluate(e=>e.offsetHeight),844);
 for(const [scene,copy]of Object.entries(COPY)){const t=await visibleText(plain,scene);assert.equal(t.opacity,1);for(const line of copy)assert.ok(t.text.includes(line),`no-JS ${scene}: "${line}"`)}
 assert.equal(await plain.locator('.lines-canvas').evaluate(e=>getComputedStyle(e).display),'none');
 await plain.locator('#not-alone').scrollIntoViewIfNeeded();await capture(plain,'no-javascript');assert.equal(await noOverflow(plain),true);await plain.context().close();
 // WebGL failure still ends on the void and hands over to the field.
 const fallback=await browser.newPage({viewport:{width:390,height:844}});await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args)}});fallback.on('pageerror',e=>report.errors.push(e.message));await fallback.goto(base+'/hero-reels-lab.html?reelsDebug');await fallback.waitForFunction(()=>window.reelsLab&&window.linesLab);await exit(fallback,EXIT_END);const buffer=await capture(fallback,'webgl-fallback-void');assert.deepEqual(pixel(buffer,10,10),[5,4,10]);assert.equal((await lines(fallback,.29)).scene,'alone');await capture(fallback,'webgl-fallback-lines');await fallback.close();
 report.cases.push('End/Home native jumps; reduced motion shows still key frames per scene with identical frames after scrubbing back and no live media; no-JS readable copy and sources; WebGL failure still reaches the void and the field.');
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(async error=>{report.failure=error.stack;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.error(error);await browser?.close();process.exit(1)});
