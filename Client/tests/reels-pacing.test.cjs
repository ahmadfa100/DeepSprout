const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.env.REELS_CLIENT||path.resolve(__dirname,'..');
const out=path.join(root,'references/reels-pacing-validation');
const result={cases:[],runs:{},errors:[]};let browser;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const math=await import(pathToFileURL(path.join(root,'src/js/reels/story-math.js')));
 const {createNativeMotion}=await import(pathToFileURL(path.join(root,'src/js/reels/native-motion.js')));
 const clips=JSON.parse(fs.readFileSync(path.join(root,'assets/hero-v2/motion-clips.json')));clips.narrative=JSON.parse(fs.readFileSync(path.join(root,'assets/reels/bimo-narrative.json')));
 const properties=new Map(),number=name=>{if(!properties.has(name))properties.set(name,{value:0});return properties.get(name)};
 let progress=0;const motion=createNativeMotion({viewModelInstance:{number}},clips,{sceneTime:()=>10,isStopped:()=>true,storyProgress:()=>progress});
 const pose=p=>{progress=p;motion.render();return Object.fromEntries([...properties].map(([k,v])=>[k,v.value]))};
 const calm=pose(0),cue=pose(.14),attention=pose(.17),eyes=pose(.195),notice=pose(.22);
 assert.equal(cue.openEyeOpacity,calm.openEyeOpacity);assert.equal(cue.headTilt,calm.headTilt);
 assert.equal(attention.openEyeOpacity,calm.openEyeOpacity);assert.notEqual(attention.headTilt,calm.headTilt);
 assert.ok(eyes.openEyeOpacity>calm.openEyeOpacity);assert.ok(notice.openEyeOpacity>eyes.openEyeOpacity);assert.equal(notice.emotionStage,2);
 assert.deepEqual(pose(.14),cue); // Scrubbing backwards restores channels, not just a stage label.
 const config={balance:[990,30,100,0]},base=math.stonePose(config,0,0);
 assert.deepEqual(math.stonePose(config,0,.17),base);assert.deepEqual(math.stonePose(config,0,.225),base);
 assert.ok(Math.abs(math.stonePose(config,0,.195).rotation)<.5);
 assert.ok(Math.abs(math.stonePose(config,0,.32).rotation)>.5);
 for(let p=0;p<.38;p+=.001)assert.equal(math.stonePose(config,0,p).y,30);
 result.cases.push('Native pose channels: peripheral cue retains deep focus; head precedes eyes; NOTICE completes at .22; reverse restores pose. Top stone: stable, micro-vibration <0.5°, settle, growing wobble, no early fall.');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto((process.env.REELS_URL||'http://127.0.0.1:8792')+'/hero-reels-lab.html?reelsDebug');
 await page.waitForFunction(()=>window.reelsLab?.state.character==='live',null,{timeout:20000});
 await page.waitForFunction(()=>reelsLab.state.unlocked,null,{timeout:18000});
 await page.evaluate(()=>{window.originalCanvas=document.querySelector('.bimo canvas');window.originalStones=[...document.querySelectorAll('.stone')];});
 async function scroll(p){await page.evaluate(p=>{const t=document.querySelector('.hero-track'),h=document.querySelector('.hero').offsetHeight;scrollTo(0,(t.offsetHeight-h)*p)},p)}
 async function reset(p=0){await page.evaluate(p=>reelsLab.seek(p),p);await page.waitForTimeout(500);await scroll(p);await page.evaluate(()=>reelsLab.play())}
 async function sample(){await page.evaluate(()=>{window.samples=[];window.sampling=true;function collect(t){const s=reelsLab.state;samples.push({t,p:s.visualProgress,target:s.targetProgress,emotion:s.inputs.emotionStage,cards:s.renderer.cards});if(sampling)requestAnimationFrame(collect)}requestAnimationFrame(collect)})}
 async function finish(name){const data=await page.evaluate(()=>{sampling=false;return samples});assert.ok(data.every(s=>s.p>=.245||s.cards===0),'No card before NOTICE hold ends');assert.ok(data.every(s=>s.p>=.22||s.emotion===1),'Focus state retained until NOTICE');result.runs[name]=data.filter((_,i)=>i%5===0);return data}
 await reset();await sample();
 for(let i=1;i<=38;i++){await scroll(i*.01);await page.waitForTimeout(180)}
 await page.waitForTimeout(1000);await finish('verySlow');
 await reset();await sample();
 for(let i=1;i<=10;i++){await page.mouse.wheel(0,280);await page.waitForTimeout(180)}
 await page.waitForFunction(()=>reelsLab.state.visualProgress>.37,null,{timeout:12000});await finish('normal');
 await reset();await sample();await page.mouse.wheel(0,18000);await page.waitForTimeout(200);
 assert.ok(await page.evaluate(()=>reelsLab.state.targetProgress)>.9,'Native scroll is not locked');
 await page.waitForFunction(()=>reelsLab.state.visualProgress>.995,null,{timeout:20000});
 const fast=await finish('aggressive');
 const timeAt=p=>fast.find(s=>s.p>=p).t;
 result.fastDurationsMs={calm:timeAt(.10)-fast[0].t,tiny:timeAt(.23)-timeAt(.10),cueBeforeHead:timeAt(.155)-timeAt(.10),noticeBeforeCards:timeAt(.245)-timeAt(.22)};
 assert.ok(result.fastDurationsMs.tiny>=2000);assert.ok(result.fastDurationsMs.noticeBeforeCards>=380);
 await reset(.34);await sample();await scroll(0);await page.waitForFunction(()=>reelsLab.state.visualProgress<.0001,null,{timeout:12000});await finish('reverse');
 assert.equal(await page.evaluate(()=>reelsLab.state.inputs.emotionStage),1);
 await reset();await sample();
 for(const target of [.27,.12,.30,.16,.25,0]){await scroll(target);await page.waitForFunction(t=>Math.abs(reelsLab.state.visualProgress-t)<.002,target,{timeout:8000})}
 await finish('repeatedForwardBack');
 assert.equal(await page.evaluate(()=>document.querySelector('.bimo canvas')===originalCanvas&&originalStones.every((s,i)=>document.querySelectorAll('.stone')[i]===s)),true);
 for(const [name,p]of [['calm',.09],['cue',.14],['attention',.17],['eyes',.195],['notice',.225],['first-card',.26],['orbit',.34],['burst',.82],['trap',.97]]){await page.evaluate(p=>reelsLab.seek(p),p);await page.waitForTimeout(650);await page.screenshot({path:path.join(out,name+'.png')})}
 result.cases.push('Real Chrome native scrolling: very slow, normal wheel, aggressive swipe, reverse Stage 1, repeated forward/back. Original canvas and stones persist.');
 assert.deepEqual(result.errors,[]);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({cases:result.cases,fastDurationsMs:result.fastDurationsMs,errors:result.errors},null,2));await browser.close();
})().catch(async e=>{result.failure=e.stack;fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(result,null,2));console.error(e);await browser?.close();process.exit(1)});
