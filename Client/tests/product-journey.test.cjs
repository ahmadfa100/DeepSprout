const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const base=process.env.REELS_URL||'http://127.0.0.1:8792',out=path.resolve(__dirname,'../references/product-journey-validation');
const report={cases:[],errors:[],screenshots:[]};let browser;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const math=await import(pathToFileURL(path.resolve(__dirname,'../src/js/journey/choreography.js')));
 for(const mobile of [false,true])for(let t=0;t<=10.5;t+=.007){const a=math.cameraAt(t,mobile),b=math.cameraAt(t+.0001,mobile);assert.deepEqual(a,math.cameraAt(t,mobile));for(const key of Object.keys(a)){assert.ok(Number.isFinite(a[key]));assert.ok(Math.abs(a[key]-b[key])<2,'Camera path continuity')}}
 assert.equal(math.chartValues.reduce((a,b)=>a+b),125);assert.equal(math.communityLayout().length,34);assert.equal(math.focusStroke(0).match(/L/g).length,96);assert.equal(math.focusStroke(1).match(/L/g).length,96);assert.deepEqual(math.chartSample(1),math.chartPoints.at(-1));
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(let u=.01;u<1;u+=.02){const pts=[...math.focusStroke(u).matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);for(let i=0;i<pts.length-1;i++)for(let j=i+2;j<pts.length-1;j++)assert.ok(!(cross(pts[i],pts[i+1],pts[j])*cross(pts[i],pts[i+1],pts[j+1])<0&&cross(pts[j],pts[j+1],pts[i])*cross(pts[j],pts[j+1],pts[i+1])<0),'Unwrapping stroke must not cross itself')}
 report.cases.push('Pure camera/pose evaluation, continuous piecewise camera path, equal-point ring-to-chart morph, coherent sample data, fixed community lattice.');
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+'/hero-reels-lab.html?reelsDebug&journeyDebug');await page.waitForFunction(()=>window.productJourney&&document.querySelector('#product-journey').dataset.ready==='true');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
  await page.evaluate(()=>{window.originalJourney={bimo:document.querySelector('.bimo canvas'),network:document.querySelector('.journey-network'),stroke:document.querySelector('.focus-morph'),garden:document.querySelector('.garden-art svg'),panels:[...document.querySelectorAll('.journey-panel')]}});
  for(const [name,t]of [['arrival',.15],['assessment',.85],['assessment-2',1.27],['assessment-3',1.70],['answers-to-plan',2.02],['plan',2.75],['week-portal',3.47],['activities',4.40],['timer-portal',4.93],['timer',5.38],['stroke-morph',5.95],['analytics',6.22],['seed',6.73],['sprout',7.22],['garden',8.13],['pullback',8.82],['community',9.48],['invitation',10.20]]){
   await page.evaluate(t=>productJourney.seek(t),t);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name}: horizontal overflow`);
   const file=`${viewport.width}-${name}.png`;await page.screenshot({path:path.join(out,file)});report.screenshots.push(file);
   const state=await page.evaluate(()=>productJourney.state);assert.ok(Math.abs(state.time-t)<.012,`${name}: actual progress ${state.time}`);
  }
  report.cases.push(`${viewport.width}×${viewport.height}: all scene holds and connecting transformations rendered without horizontal overflow.`);
  let previous=0;for(const t of [.1,.9,1.5,2.6,4.4,6.2,7.7,9.5]){await page.evaluate(t=>productJourney.seek(t),t);const n=await page.evaluate(()=>productJourney.state.network.activated);assert.ok(n>=previous);previous=n}
  for(const t of [1.10,4.31,6.82,7.17,8.63]){await page.evaluate(t=>productJourney.seek(t),t);const distances=await page.evaluate(()=>{const ids=productJourney.state.network.pulses;return [...document.querySelectorAll('.network-pulse[visibility="visible"]')].map((dot,i)=>{const actual=new DOMPoint(+dot.getAttribute('cx'),+dot.getAttribute('cy')).matrixTransform(dot.getScreenCTM()),line=document.querySelector(`[data-link="${ids[i]}"]`),matrix=line.getScreenCTM(),length=line.getTotalLength();let best=Infinity;for(let j=0;j<=600;j++){const local=line.getPointAtLength(length*j/600),p=new DOMPoint(local.x,local.y).matrixTransform(matrix);best=Math.min(best,Math.hypot(p.x-actual.x,p.y-actual.y))}return best})});assert.ok(distances.length>0);distances.forEach(d=>assert.ok(d<2,'Pulse follows its actual connecting path'))}
  // Revisit the same native scroll offset after reversing through every later scene.
  async function pose(){return page.evaluate(()=>({time:productJourney.state.time,camera:document.querySelector('.journey-camera').style.transform,stroke:document.querySelector('.focus-morph').getAttribute('d'),checks:[...document.querySelectorAll('[data-activity] .activity-check')].map(e=>e.style.cssText),growth:document.querySelector('.garden-panel').dataset.growth,network:productJourney.state.network}))}
  await page.evaluate(()=>productJourney.seek(4.32));const before=await pose();for(const t of [8.1,2.7,9.6,6.2,0,10.2,4.32]){await page.evaluate(t=>{const s=productJourney.state;scrollTo(0,s.start+t/10.5*s.travel)},t);await page.waitForTimeout(70)}assert.deepEqual(await pose(),before,'Reversing restores the exact pose and network');
  assert.equal(await page.evaluate(()=>originalJourney.bimo===document.querySelector('.bimo canvas')&&originalJourney.network===document.querySelector('.journey-network')&&originalJourney.stroke===document.querySelector('.focus-morph')&&originalJourney.garden===document.querySelector('.garden-art svg')&&originalJourney.panels.every(e=>e.isConnected)),true,'Persistent objects survive every transition');
  await page.evaluate(()=>productJourney.seek(7.2));let count=await page.evaluate(()=>productJourney.state.renderCount);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>productJourney.state.renderCount),count,'No perpetual RAF or clock-based idle motion');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);count=await page.evaluate(()=>productJourney.state.renderCount);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>productJourney.state.renderCount),count);assert.equal(await page.evaluate(()=>productJourney.state.pendingFrame),false);
  await page.evaluate(()=>productJourney.seek(.85));await page.locator('[data-chapter="1"]').click();await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>productJourney.state.scene),'plan','Chapter navigation uses native scrolling');
  await page.locator('.journey-motion').click();await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>productJourney.state.scene),'finish');const cta=page.locator('.journey-cta');assert.equal(await cta.getAttribute('href'),'https://tally.so/r/QKgA0G');assert.equal(await cta.evaluate(e=>e.tabIndex),0);
  await page.locator('.journey-static-control').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>productJourney.state.enhanced),false);assert.equal(await page.locator('.journey-scene>.journey-panel').count(),5);assert.equal(await page.locator('.garden-details').evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await cta.evaluate(e=>e.tabIndex),0);
  await page.locator('.journey-static-control').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>productJourney.state.enhanced),true);await page.evaluate(()=>productJourney.seek(10.2));
  report.cases.push(`${viewport.width}: persistent Bimo/network/stroke/garden identity, accumulated connection memory, exact reverse/rapid scroll, zero idle/offscreen frames, chapter links, skip, CTA, static-view toggle and restoration.`);
  report[viewport.width]=await page.evaluate(()=>productJourney.state);
  await context.close();
 }
 for(const viewport of [{width:1024,height:768},{width:360,height:640},{width:844,height:390},{width:662,height:501}]){
  const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'/hero-reels-lab.html?journeyDebug');await page.waitForFunction(()=>window.productJourney);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>productJourney.state.enhanced),viewport.height>=600,'Short viewports use the readable document-flow layout');
  for(const [name,t,index]of [['assessment',.85,0],['activities',4.4,2],['garden',8.13,4],['community',9.48,5]]){await page.evaluate(([t,i])=>{if(productJourney.state.enhanced)productJourney.seek(t);else productJourney.chapter(i)},[t,index]);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(out,`${viewport.width}x${viewport.height}-${name}.png`)})}
  await page.close();
 }
 for(const options of [{reducedMotion:'reduce'},{javaScriptEnabled:false}]){
  const page=await browser.newPage({viewport:{width:390,height:844},...options});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'/hero-reels-lab.html?journeyDebug');
  if(options.reducedMotion)await page.waitForFunction(()=>window.productJourney);
  assert.equal(await page.locator('#product-journey').evaluate(e=>e.classList.contains('is-cinematic')),false);assert.equal(await page.locator('.journey-scene>.journey-panel').count(),5);assert.equal(await page.locator('.journey-scene').count(),7);
  await page.locator('#journey-garden').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(out,options.reducedMotion?'reduced-motion.png':'no-javascript.png')});await page.locator('.journey-cta').scrollIntoViewIfNeeded();assert.equal(await page.locator('.journey-cta').evaluate(e=>getComputedStyle(e).display),'inline-flex');await page.close();
 }
 report.cases.push('Tablet, narrow/short phone, landscape; readable seven-part normal-flow fallback for reduced motion and disabled JS, with the invitation accessible.');
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({cases:report.cases,errors:report.errors},null,2));
})().catch(async error=>{report.failure=error.stack;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(report,null,2));console.error(error);await browser?.close();process.exit(1)});
