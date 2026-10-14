// Section 4 ("the way back"): the handoff from section 3, the path, the camera and stations 1–4.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {PNG}=require('pngjs');
const base=process.env.REELS_URL||'http://127.0.0.1:8792';
const out=path.resolve(__dirname,'../docs/validation/way-back');
const decode=buffer=>PNG.sync.read(buffer);
const at=(png,x,y)=>{const i=(Math.round(y)*png.width+Math.round(x))*4;return[png.data[i],png.data[i+1],png.data[i+2]]};
const lum=([r,g,b])=>(r+g+b)/3;
const COPY={
 assess:['Quick assessments','Four short checks. No score — just a starting point.'],
 plan:['Your plan','A 4-week cycle. Only this week is detailed — the rest adapts to you.'],
 activities:['Daily & weekly activities','A missed day doesn’t break the line.'],
 protect:['Protection','Block the sites you choose, for as long as you choose.'],
 beyond:['Beyond the screen','Initiatives, workshops and real-world experiences — optional, always.'],
 together:['You’re not alone.'],
};
const report={cases:[],screenshots:[],errors:[],seam:{}};let browser;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const P=await import(pathToFileURL(path.resolve(__dirname,'../src/js/lines/path.js')));
 const {handoffLength,LINES,lineCount}=await import(pathToFileURL(path.resolve(__dirname,'../src/js/lines/field.js')));
 const recorded=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/validation/vortex-clarity/validation.json'),'utf8')).headline;
 // Pure geometry: the four weeks are contiguous (the line is never broken), week 1 alone has days.
 for(const [width,mobile]of [[1440,false],[390,true]]){
  const g=P.layout(width,mobile);
  assert.equal(g.L,handoffLength(width));assert.equal(g.start,-handoffLength(width)/2,'The path starts as section 3’s handoff line');
  assert.equal(g.weeks.length,4);for(let i=1;i<4;i++)assert.equal(g.weeks[i][0],g.weeks[i-1][1],'Weeks join end to end');
  assert.equal(g.nodes.length,7);assert.ok(g.nodes.every(n=>n>g.weeks[0][0]&&n<g.weeks[0][1]),'Day nodes sit on week 1 only');
  P.settleRoot(g,width,mobile?844:900,{x:width*.8,y:(mobile?844:900)*.55});
  assert.deepEqual(P.cameraAt(0,g,width),{x:0,y:0,zoom:1},'Camera starts exactly on the handoff');
  for(let t=0,last=-Infinity;t<=P.END;t+=.01){const cam=P.cameraAt(t,g,width),head=P.headAt(t,cam,g,width);assert.deepEqual(cam,P.cameraAt(t,g,width));assert.ok(head>=last-1e-6||(t>4&&t<10.6),'The path only draws forward');last=head}
  // Station 5 owns the page's one large camera move: its zoom range dwarfs every other station's, and nothing zooms back.
  const range=(a,b)=>{let lo=Infinity,hi=-Infinity;for(let t=a;t<=b;t+=.01){const z=P.cameraAt(t,g,width).zoom;lo=Math.min(lo,z);hi=Math.max(hi,z)}return hi/lo};
  const beyond=range(10.6,13.4),others=Math.max(range(0,10.6),range(13.4,P.END));
  assert.ok(beyond>=3&&beyond>others*1.6,`Station 5 zoom ×${beyond.toFixed(2)} vs ×${others.toFixed(2)} elsewhere`);
  assert.equal(range(13.4,P.END),1,'No zoom after station 5');
  // The branch leaves the path, touches one node, and rejoins it: both ends on the path, beyond the node on either side.
  const [b0,b1]=g.branch,N=g.branchNode;assert.ok(b0<N.x&&N.x<b1);
  // Station 7: the root's screen shape is the garden's entry, reached by the camera's last pose.
  const end=P.cameraAt(P.END,g,width),[,tipY]=g.root.toWorld(0,g.root.entry.y);
  assert.ok(Math.abs((g.root.x-end.x)*end.zoom+width/2-(g.root.shape.x0))<1e-6,'Root lands on the entry column');assert.ok(tipY>g.root.soil,'Root goes below the soil');
 }
 assert.deepEqual(P.UNFILLED,[2,5]);
 P.STATIONS.forEach((s,i)=>{if(i)assert.equal(s.from,P.STATIONS[i-1].to);assert.equal(P.stationAt(s.key).name,s.name)});
 const sources=['../src/js/lines/path.js','../src/js/lines/field.js','../src/styles/lines/path.css','../src/styles/lines/lines.css'].map(f=>fs.readFileSync(path.resolve(__dirname,f),'utf8')).join('\n');
 assert.ok(!/ScrollTrigger|animation-timeline|scroll-timeline|addEventListener\(['"]scroll/.test(sources),'One scroll driver: no ScrollTrigger, no CSS scroll timelines, no second scroll listener');
 report.cases.push('Geometry: handoff-length start, contiguous weeks, days on week 1 only, deterministic camera, forward-only drawing, one scroll driver.');

 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 async function open(options={}){const context=await browser.newContext({viewport:{width:1440,height:900},...options}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'/hero-reels-lab.html?reelsDebug');if(options.javaScriptEnabled!==false)await page.waitForFunction(()=>window.pathLab&&document.querySelector('#hero-v2').dataset.ready==='true');return page}
 async function capture(page,name){const buffer=await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');return buffer}
 async function seek(page,t,wait=350){await page.evaluate(t=>pathLab.seek(t),t);await page.waitForTimeout(wait);return page.evaluate(()=>pathLab.state)}
 const copyOf=(page,name)=>page.locator(`[data-station="${name}"]`).evaluate(e=>({opacity:Number(getComputedStyle(e).opacity),text:[...e.querySelectorAll('p')].map(p=>p.textContent.trim())}));
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const p=await open({viewport}),prefix=String(viewport.width),{width:w,height:h}=viewport;
  // The seam: the last frame of section 3 and the first of section 4 are the same picture.
  const top=await p.evaluate(()=>document.querySelector('#way-back').offsetTop);
  await p.evaluate(top=>scrollTo(0,top-3),top);await p.waitForTimeout(1200);
  assert.equal(await p.locator('.path-stage').evaluate(e=>getComputedStyle(e).visibility),'hidden','Section 4 stays hidden until it pins');
  const before=decode(await capture(p,prefix+'-seam-before'));
  await p.evaluate(top=>scrollTo(0,top+2),top);await p.waitForTimeout(800);
  assert.equal(await p.locator('.path-stage').evaluate(e=>getComputedStyle(e).visibility),'visible');
  const after=decode(await capture(p,prefix+'-seam-after'));
  let differing=0,worst=0;for(let i=0;i<before.data.length;i+=4){const d=Math.max(Math.abs(before.data[i]-after.data[i]),Math.abs(before.data[i+1]-after.data[i+1]),Math.abs(before.data[i+2]-after.data[i+2]));if(d>40)differing++;worst=Math.max(worst,d)}
  report.seam[prefix]={differing,worst};
  assert.ok(differing<w*.6,`Seam: ${differing} pixels differ by more than 40 levels`);
  assert.ok(lum(at(after,w/2,h/2))<140&&lum(at(after,w/2+handoffLength(w)/2-6,h/2))<170&&lum(at(after,w/2+handoffLength(w)/2+12,h/2))>240,'Same line, same length, same place');
  // Station 1: four gates, four ticks, four bars of different heights — and no score anywhere.
  let s=await seek(p,2.4);await capture(p,prefix+'-1-assess');
  assert.equal(s.station,'assess');assert.deepEqual(s.ticks,[true,true,true,true]);
  assert.ok(s.bars.every(b=>b>0)&&new Set(s.bars.map(Math.round)).size===4,'Four bars build a profile');
  assert.equal(await p.locator('.path-svg text').count(),0);
  assert.ok(!/\d|%/.test((await copyOf(p,'assess')).text.join(' ')),'No score, no percentage, no number');
  // Station 2: week 1 solid with seven day nodes; weeks 2–4 faint dashes with none.
  s=await seek(p,3.9);const plan=decode(await capture(p,prefix+'-2-plan'));assert.equal(s.station,'plan');
  assert.equal(await p.locator('.path-node').count(),7);
  assert.equal(await p.locator('.path-future').evaluate(e=>getComputedStyle(e).strokeDasharray!=='none'&&Number(getComputedStyle(e).strokeOpacity)<.6),true,'Future weeks are faint dashes');
  const screenX=x=>w/2+(x-s.camera.x)*s.camera.zoom,y=Math.round(h*.46);
  const runs=(x0,x1)=>{let changes=0,last=null,dark=0,n=0;for(let x=Math.ceil(x0);x<x1;x++){const on=lum(at(plan,x,y))<215;if(last!==null&&on!==last)changes++;last=on;n++;if(on)dark++}return{changes,coverage:dark/n}};
  const [w1,w2,,w4]=s.layout.weeks,solid=runs(screenX(w1[0])+4,screenX(w1[1])-4),dashed=runs(screenX(w2[0])+6,screenX(w4[1])-6);
  report.seam['weeks'+prefix]={solid,dashed};
  assert.ok(solid.coverage>.98,'Week 1 is one unbroken stroke');assert.ok(dashed.changes>12&&dashed.coverage<.8,'Weeks 2–4 are dashed');
  assert.ok((await p.locator('.path-node').evaluateAll(es=>es.map(e=>Number(e.getAttribute('cx'))))).every(x=>x>w1[0]&&x<w1[1]),'No nodes on weeks 2–4');
  // Station 3: exactly two days stay unfilled, and the line runs unbroken through them.
  s=await seek(p,6.6);const act=decode(await capture(p,prefix+'-3-activities'));assert.equal(s.station,'activities');
  assert.deepEqual(s.unfilled,[2,5]);assert.equal(s.filled.filter(Boolean).length,5);
  for(const i of [2,5]){const x=w/2+(s.layout.nodes[i]-s.camera.x)*s.camera.zoom;assert.ok(lum(at(act,x,h*.46))<150,'The line is visible through an unfilled day')}
  {const x=w/2+(s.layout.nodes[0]-s.camera.x)*s.camera.zoom,[r,g,b]=at(act,x,h*.46);assert.ok(g>r&&g>b,'Filled days are sage')}
  {const x0=w/2+(s.layout.nodes[0]-s.camera.x)*s.camera.zoom,x1=w/2+(s.layout.nodes[6]-s.camera.x)*s.camera.zoom;let gaps=0;for(let x=Math.ceil(x0);x<x1;x++)if(lum(at(act,x,h*.46))>215)gaps++;assert.equal(gaps,0,'No gap anywhere along week 1')}
  // Station 4: the wall rises, the feed lines stop at it, and it dissolves once the camera is past.
  s=await seek(p,7.7);assert.ok(s.wall.height<68);
  s=await seek(p,8.95);await capture(p,prefix+'-4-protect');assert.equal(s.station,'protect');assert.equal(s.wall.height,68);assert.equal(s.wall.opacity,1);
  const arrived=s.drifters.filter(d=>d.opacity>.5);assert.ok(arrived.length>=12);assert.ok(arrived.every(d=>d.top>=34+5-.5),'Feed lines stop at the wall');
  s=await seek(p,10.4);await capture(p,prefix+'-4-cleared');assert.ok(s.wall.opacity<.05,'The wall dissolves once the camera clears the zone');assert.ok(s.drifters.every(d=>d.opacity<.05));
  // Copy: verbatim, visible in its own station.
  for(const [name,t]of [['assess',2.4],['plan',3.9],['activities',6.6],['protect',8.95],['beyond',12.9],['together',15.1]]){await seek(p,t,250);const c=await copyOf(p,name);assert.equal(c.opacity,1,name);assert.deepEqual(c.text,COPY[name])}
  // Reversible: scrubbing around returns the identical state.
  for(const at of [6.6,15.1]){const ref=await seek(p,at);for(const t of [9.5,1,16.8,4,12,8.2,.2,6])await seek(p,t,80);const back=await seek(p,at);
   for(const k of ['filled','ticks','bars','wall','camera','branch','crowd'])assert.deepEqual(back[k],ref[k],`${k} at ${at}`)}
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await p.locator('#way-back svg').count(),1);
  // Station 5: the branch touches its node (tangent to the circle) and both ends sit on the path.
  s=await seek(p,12.9);await capture(p,prefix+'-5-beyond');assert.equal(s.station,'beyond');assert.equal(s.branch.touched,true);assert.ok(s.branch.drawn>.999);
  const touch=await p.evaluate(()=>{const b=document.querySelector('.path-branch'),n=pathLab.state.branch.node,len=b.getTotalLength();let min=Infinity,start=b.getPointAtLength(0),end=b.getPointAtLength(len);
   for(let i=0;i<=600;i++){const q=b.getPointAtLength(len*i/600);min=Math.min(min,Math.hypot(q.x-n.x,q.y-n.y)-n.r)}return{gap:min,start:[start.x,start.y],end:[end.x,end.y]}});
  assert.ok(Math.abs(touch.gap)<1.5,`Branch touches the node (gap ${touch.gap.toFixed(2)})`);assert.ok(touch.gap>-1.5,'…without entering it');
  assert.equal(Math.abs(touch.start[1])+Math.abs(touch.end[1]),0,'The branch leaves from and rejoins the path');assert.ok(touch.end[0]>s.branch.node.x+s.branch.node.r,'It rejoins after the node: never a dead end');
  // Station 6: the crowd is section 3's own lines — order, lengths and alphas — now horizontal; plus the echo.
  s=await seek(p,15.1);await capture(p,prefix+'-6-together');assert.equal(s.station,'together');
  const crowd=await p.evaluate(()=>[...document.querySelectorAll('.path-crowd')].map(e=>e.getAttribute('d')));
  const segments=crowd.join('').match(/M[-\d.]+ [-\d.]+H[-\d.]+/g).map(m=>m.slice(1).split(/[ H]/).map(Number));
  const count=lineCount(w<=700);assert.equal(segments.length,count-1,'Every section 3 line but yours is here');
  const longest=Math.max(...LINES.len.subarray(1,count)),reach=w<=700?1300:2600,gap=s.layout.rowGap??(w<=700?26:36);
  for(let i=1;i<count;i++){const row=Math.ceil(i/2)*(i%2?-1:1),seg=segments.find(q=>Math.abs(q[1]-row*(w<=700?26:36))<.01&&Math.abs((q[2]-q[0])-LINES.len[i]/longest*reach)<.2);assert.ok(seg,`Line ${i} keeps its row (its order) and its length`)}
  assert.ok(s.crowd.opacity.every(o=>o>0),'All visible at station 6');
  // …and each line's own brightness: the path holding line i is drawn at that line's mapped alpha.
  const groups=await p.evaluate(()=>[...document.querySelectorAll('.path-crowd')].map(e=>({d:e.getAttribute('d'),opacity:Number(e.style.opacity)})));
  for(let i=1;i<count;i++){const row=Math.ceil(i/2)*(i%2?-1:1),y=row*(w<=700?26:36),x0=s.layout.weeks?null:null;
   const holder=groups.find(gr=>gr.d.match(/M[-\d.]+ [-\d.]+H[-\d.]+/g).some(m=>{const [a,b,c]=m.slice(1).split(/[ H]/).map(Number);return Math.abs(b-y)<.01&&Math.abs((c-a)-LINES.len[i]/longest*reach)<.2}));
   assert.ok(holder&&Math.abs(holder.opacity-P.crowdOpacity(LINES.alpha[i]))<=.016,`Line ${i} brightness ${holder?.opacity} vs ${P.crowdOpacity(LINES.alpha[i]).toFixed(3)}`)}
  const echo=await p.locator('.path-echo').evaluate(e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return{fontFamily:c.fontFamily,fontSize:c.fontSize,fontWeight:c.fontWeight,letterSpacing:c.letterSpacing,lineHeight:c.lineHeight,x:r.x,y:r.y,width:r.width,height:r.height,color:c.color,opacity:Number(getComputedStyle(e.parentElement).opacity)}});
  const ref=recorded[String(w)];report.seam['echo'+prefix]={echo,recorded:ref};
  for(const k of ['fontFamily','fontSize','fontWeight','letterSpacing','lineHeight'])assert.equal(echo[k],ref[k],`Echo ${k}`);
  for(const k of ['x','y','width','height'])assert.ok(Math.abs(echo[k]-ref[k])<.5,`Echo ${k}: ${echo[k]} vs ${ref[k]}`);
  assert.equal(echo.color,'rgb(41, 45, 42)','Only the colour differs: ink on cream');assert.equal(echo.opacity,1);
  // Station 7: soil, then the root reaching the garden's entry point.
  s=await seek(p,P.END-.01);await capture(p,prefix+'-7-growth');assert.equal(s.station,'growth');
  // Frame pacing through the big move and the crowd (stations 5–6).
  const wide=await p.evaluate(async end=>{const el=document.querySelector('#way-back'),top=el.offsetTop,travel=el.offsetHeight-innerHeight,deltas=[];let last=0,run=true;
   const tick=t=>{if(last)deltas.push(t-last);last=t;if(run)requestAnimationFrame(tick)};requestAnimationFrame(tick);
   for(let i=0;i<=60;i++){scrollTo(0,top+travel*(10.6+i*.08)/end);await new Promise(r=>setTimeout(r,33))}run=false;deltas.sort((a,b)=>a-b);
   return{median:deltas[Math.floor(deltas.length/2)],p95:deltas[Math.floor(deltas.length*.95)],samples:deltas.length}},P.END);
  report.seam['framesWide'+prefix]=wide;assert.ok(wide.median<25,`Stations 5–6 frame median ${wide.median}ms`);
  // Frame pacing while scrolling natively from the plan overview into week 1 (the largest camera move so far).
  const timing=await p.evaluate(async()=>{const el=document.querySelector('#way-back'),top=el.offsetTop,travel=el.offsetHeight-innerHeight,deltas=[];let last=0,run=true;
   const tick=t=>{if(last)deltas.push(t-last);last=t;if(run)requestAnimationFrame(tick)};requestAnimationFrame(tick);
   for(let i=0;i<=60;i++){scrollTo(0,top+travel*(3.0+i*.06)/17.6);await new Promise(r=>setTimeout(r,33))}run=false;deltas.sort((a,b)=>a-b);
   return{median:deltas[Math.floor(deltas.length/2)],p95:deltas[Math.floor(deltas.length*.95)],samples:deltas.length}});
  report.seam['frames'+prefix]=timing;assert.ok(timing.median<25,`Path frame median ${timing.median}ms`);
  // One scroll driver: offscreen, it does no work.
  await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(300);const idle=await p.evaluate(()=>pathLab.state.frames);await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>pathLab.state.frames),idle);
  report.cases.push(`${w}×${h}: seamless handoff from section 3, four gates/ticks/bars with no score, week 1 solid with seven days vs weeks 2–4 dashed with none, exactly two unfilled days with an unbroken line, wall rise/stop/dissolve, verbatim copy, exact reversal, no overflow, idle offscreen.`);
  await p.context().close();
 }
 // Reduced motion: each station is a still key frame; scrubbing back restores it exactly.
 const r=await open({viewport:{width:390,height:844},reducedMotion:'reduce'});
 for(const [t,name]of [[1.2,'assess'],[3,'plan'],[5,'activities'],[9,'protect'],[12,'beyond'],[14,'together']]){const s=await seek(r,t,300);assert.equal(s.station,name);const a=await r.screenshot();await r.waitForTimeout(400);assert.ok(a.equals(await r.screenshot()),`${name} is still`);assert.equal((await copyOf(r,name)).opacity,1)}
 // Same frame after scrubbing back. Anti-aliasing may move by a level after the layer was drawn zoomed out, so allow ±2/255.
 const same=(a,b)=>{const x=decode(a),y=decode(b);for(let i=0;i<x.data.length;i++)if(Math.abs(x.data[i]-y.data[i])>2)return false;return true};
 await seek(r,5,300);await seek(r,9,100);const first=(await seek(r,5,600),await r.screenshot());
 for(const [a,b]of [[9,1],[12.5,3],[16,2]]){await seek(r,a,100);await seek(r,b,100);assert.ok(same(first,(await seek(r,5,600),await r.screenshot())),`Scrub ${a}→${b}→back`)}
 await capture(r,'reduced-motion');await r.context().close();
 // No JavaScript: every station reads in normal flow.
 const plain=await open({viewport:{width:390,height:844},javaScriptEnabled:false});
 for(const name of Object.keys(COPY)){const c=await copyOf(plain,name);assert.equal(c.opacity,1);assert.deepEqual(c.text,COPY[name])}
 assert.equal(await plain.locator('.path-svg').evaluate(e=>getComputedStyle(e).display),'none');await plain.locator('#way-back').scrollIntoViewIfNeeded();await capture(plain,'no-javascript');await plain.context().close();
 report.cases.push('Reduced motion: still key frames per station, identical after scrubbing back. No JS: all station copy in normal flow.');
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(async error=>{report.failure=error.stack;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.error(error);await browser?.close();process.exit(1)});
