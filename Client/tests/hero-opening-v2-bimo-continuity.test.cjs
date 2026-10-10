const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.argv[2]||process.env.HERO_URL||'http://127.0.0.1:8792',label=process.argv[3]||'after',out=path.resolve(__dirname,'../references/hero-v2-bimo-continuity',label);
fs.mkdirSync(out,{recursive:true});
const keys=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/hero-v2/motion-clips.json'))).keys;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
 const page=await browser.newPage({viewport:process.argv[4]==='mobile'?{width:662,height:502}:{width:1440,height:900},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({keys})=>{
  let library;Object.defineProperty(window,'rive',{configurable:true,get(){return library},set(v){const wrapped=new Proxy(v.Rive,{construct(T,args,N){const instance=Reflect.construct(T,args,N);window.auditRive=instance;return instance}});library=new Proxy(v,{get(obj,k){return k==='Rive'?wrapped:Reflect.get(obj,k)}})}});
  window.bimoAudit={samples:[],frames:[],writes:[],swaps:0,canvas:null,stopped:false};const audit=window.bimoAudit;
  for(const key of ['width','height']){const d=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key);Object.defineProperty(HTMLCanvasElement.prototype,key,{...d,set(v){if(this.closest('.bimo'))audit.writes.push({key,value:v,at:performance.now()});d.set.call(this,v)}})}
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
  const style=e=>{const s=getComputedStyle(e);return {width:s.width,height:s.height,transform:s.transform,origin:s.transformOrigin,opacity:s.opacity,visibility:s.visibility,display:s.display}};
  function anchors(values){
   const p=values,rotation=p.pelvisRotation,c=Math.cos(rotation),s=Math.sin(rotation);
   return ['left','right'].map((prefix,i)=>{
    const hx=p[prefix+'HipX'],hy=p[prefix+'HipY'],angle=rotation+p[prefix+'ThighRotation'],shin=angle+p[prefix+'KneeRotation'];
    const hipX=p.bodyRootX+p.pelvisX+c*hx-s*hy,hipY=p.bodyRootY+p.pelvisY+s*hx+c*hy;
    const x=hipX-Math.sin(angle)*127+Math.cos(shin)*p[prefix+'AnkleX']-Math.sin(shin)*p[prefix+'AnkleY'];
    const y=hipY+Math.cos(angle)*127+Math.sin(shin)*p[prefix+'AnkleX']+Math.cos(shin)*p[prefix+'AnkleY'];
    return {x,y,angle:shin+p[prefix+'FootRotation']};
   });
  }
  function pixelBounds(canvas){
   const w=canvas.width,h=canvas.height,d=canvas.getContext('2d').getImageData(0,0,w,h).data;
   let minX=w,maxX=-1,minY=h,maxY=-1,count=0,solePixels=0;const soles=[{x:w,y:h,right:-1,bottom:-1},{x:w,y:h,right:-1,bottom:-1}];
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=d[(y*w+x)*4+3];if(a>100){count++;if(y<h*849/860){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY)}if(y>h*825/860&&y<h*849/860)solePixels++;if(y>=h*830/860&&y<=h*851/860){const foot=x<w/2?0:1;soles[foot].x=Math.min(soles[foot].x,x);soles[foot].y=Math.min(soles[foot].y,y);soles[foot].right=Math.max(soles[foot].right,x);soles[foot].bottom=Math.max(soles[foot].bottom,y)}}}
   return {count,solePixels,soles,bounds:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}};
  }
  function sample(){
   const root=document.querySelector('.bimo'),hero=window.heroV2;if(!root||!hero)return;
   const canvas=root.querySelector('canvas');if(!audit.canvas)audit.canvas=canvas;else if(audit.canvas!==canvas){audit.swaps++;audit.canvas=canvas}
   const vm=window.auditRive?.viewModelInstance,values=vm?Object.fromEntries(keys.map(k=>[k,vm.number(k)?.value])):null;
   const bounds=rect(root),surface=pixelBounds(canvas),scale=Math.min(bounds.width/700,bounds.height/860);
   const offsetX=bounds.x+(bounds.width-700*scale)/2,offsetY=bounds.y+(bounds.height-860*scale)/2;
   const feet=values?anchors(values).map(p=>({...p,screenX:offsetX+p.x*scale,screenY:offsetY+p.y*scale})):null;
   const composite=document.createElement('canvas');composite.width=700;composite.height=860;const ctx=composite.getContext('2d');ctx.drawImage(canvas,0,0,700,860);const group=Number(getComputedStyle(root.querySelector('.bimo-stills')).opacity);for(const im of root.querySelectorAll('img')){if(im.complete&&im.naturalWidth){ctx.globalAlpha=group*Number(getComputedStyle(im).opacity);ctx.drawImage(im,0,0,700,860)}}const visiblePixels=pixelBounds(composite);
   const row={visiblePixels,wall:performance.now(),time:hero.state.time,phase:hero.state.phase,runtime:root.dataset.runtime,stage:bounds,stageStyle:style(root),canvas:rect(canvas),canvasStyle:style(canvas),bitmap:{width:canvas.width,height:canvas.height},parent:rect(root.parentElement),parentStyle:style(root.parentElement),feet,values,inputs:hero.state.inputs,pixels:surface,apparentHeight:surface.bounds.height/canvas.height*860*scale};
   audit.samples.push(row);
  }
  const timer=setInterval(()=>{if(audit.stopped){clearInterval(timer);return}sample()},100);
  function tick(){const root=document.querySelector('.bimo'),hero=window.heroV2;if(root&&hero){const c=root.querySelector('canvas'),s=getComputedStyle(c);if(!audit.canvas)audit.canvas=c;if(root.dataset.runtime==='live'){const ctx=c.getContext('2d'),d=ctx.getImageData(c.width>>1,c.height>>2,1,1).data;audit.frames.push({time:hero.state.time,alpha:d[3],opacity:s.opacity,display:s.display,visibility:s.visibility,identity:c===audit.canvas})}}if(!audit.stopped)requestAnimationFrame(tick)}requestAnimationFrame(tick);
 },{keys});
 if(process.argv[4]==='delayed')await page.route('**/bimo.riv',async route=>{await new Promise(resolve=>setTimeout(resolve,5600));await route.continue()});
 await page.goto(base+'/hero-lab-v2.html?heroDebug');await page.waitForFunction(()=>window.heroV2);
 const captures=[.8,3.6,3.9,4.1,4.3,4.5,4.7,4.9,5.1,5.4,6,8.2];
 for(let i=0;i<captures.length;i++){
  await page.waitForFunction(t=>heroV2.state.time>=t,captures[i]);
  await page.screenshot({path:path.join(out,String(i).padStart(2,'0')+'-screen.png')});
  fs.writeFileSync(path.join(out,String(i).padStart(2,'0')+'-canvas.png'),Buffer.from((await page.locator('.bimo canvas').evaluate(c=>c.toDataURL())).split(',')[1],'base64'));
 }
 await page.evaluate(()=>bimoAudit.stopped=true);
 const result=await page.evaluate(()=>({samples:bimoAudit.samples,frames:bimoAudit.frames,writes:bimoAudit.writes,swaps:bimoAudit.swaps,surfaceConnected:bimoAudit.canvas?.isConnected,canvasCount:document.querySelectorAll('.bimo canvas').length}));result.errors=errors;
 fs.writeFileSync(path.join(out,'raw.json'),JSON.stringify(result,null,2)); const live=result.samples.filter(r=>r.runtime==='live');
 const bounds=live.map(r=>JSON.stringify(r.stage));
 result.summary={visibleEvery100ms:result.samples.every(r=>r.visiblePixels.count>10000),visibleEveryLiveFrame:result.frames.every(r=>r.alpha>100&&r.opacity==='1'),liveFrames:result.frames.length,solePixelBounds:live.length?live[0].pixels.soles:[],uniqueSolePixelBounds:new Set(live.map(r=>JSON.stringify(r.pixels.soles))).size,sampleCount:result.samples.length,liveSampleCount:live.length,uniqueStageBounds:new Set(bounds).size,firstStage:result.samples[0].stage,lastStage:result.samples.at(-1).stage,bitmapWrites:result.writes.length,swaps:result.swaps,apparentHeightRange:[Math.min(...live.map(r=>r.apparentHeight)),Math.max(...live.map(r=>r.apparentHeight))],minPaintedPixels:Math.min(...live.map(r=>r.pixels.count)),feetRanges:[0,1].map(i=>({x:[Math.min(...live.map(r=>r.feet[i].screenX)),Math.max(...live.map(r=>r.feet[i].screenX))],y:[Math.min(...live.map(r=>r.feet[i].screenY)),Math.max(...live.map(r=>r.feet[i].screenY))]}))};
 fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result.summary,null,2));
 if(label.startsWith('after')){
  assert.equal(new Set(result.samples.map(r=>JSON.stringify(r.stage))).size,1,'Fixed stage from first sample onward');
  assert.equal(result.writes.length,0,'Immutable bitmap dimensions');assert.equal(result.swaps,0);assert.equal(result.canvasCount,1);assert.equal(result.surfaceConnected,true);
  assert.ok(live.length>(process.argv[4]==='delayed'?5:50));assert.ok(result.samples.every(r=>r.visiblePixels.count>10000),'Bimo visible in every 100 ms sample, including loading');assert.ok(live.every(r=>r.pixels.count>10000&&r.pixels.solePixels>500),'Bimo including soles stays painted');
  assert.ok(result.frames.every(r=>r.opacity==='1'&&r.visibility==='visible'&&r.display!=='none'&&r.identity&&r.alpha>100),'Persistent visible painted surface');
  assert.ok(live.every(r=>r.stageStyle.transform==='none'));assert.ok(result.summary.apparentHeightRange[1]/result.summary.apparentHeightRange[0]<1.03,'No large apparent size change');
  assert.equal(result.summary.uniqueSolePixelBounds,1,'Rendered sole pixel bounds stay fixed');
  for(const foot of result.summary.feetRanges){assert.ok(foot.x[1]-foot.x[0]<.001);assert.ok(foot.y[1]-foot.y[0]<.001)}assert.deepEqual(errors,[]);
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
