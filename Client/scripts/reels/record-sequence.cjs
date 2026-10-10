// Capture actual Chromium compositor frames, then encode locally with MediaRecorder.
// No screen permission, external encoder, or server upload is required.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 await page.goto((process.env.REELS_URL||'http://127.0.0.1:8794')+'/hero-reels-lab.html?reelsDebug');await page.waitForFunction(()=>window.reelsLab?.state.unlocked);
 const session=await page.context().newCDPSession(page),frames=[];
 session.on('Page.screencastFrame',frame=>{frames.push({data:frame.data,t:frame.metadata.timestamp});session.send('Page.screencastFrameAck',{sessionId:frame.sessionId}).catch(()=>{})});
 await session.send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:1280,maxHeight:800,everyNthFrame:2});
 await page.waitForTimeout(700);
 for(let i=0;i<=90;i++){await page.evaluate(n=>scrollTo(0,(document.querySelector('.hero-track').offsetHeight-innerHeight)*n),i/90);await page.waitForTimeout(85)}
 await page.waitForFunction(()=>reelsLab.state.visualProgress>.997);await page.waitForTimeout(1000);await session.send('Page.stopScreencast');await page.close();
 const encoder=await browser.newPage({viewport:{width:1280,height:800}});await encoder.setContent('<canvas width="1280" height="800"></canvas>');
 await encoder.evaluate(()=>{const canvas=document.querySelector('canvas');window.parts=[];window.recorder=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:5000000});recorder.ondataavailable=e=>parts.push(e.data);recorder.start()});
 for(let i=0;i<frames.length;i++){
  await encoder.evaluate(async data=>{const image=new Image();image.src='data:image/jpeg;base64,'+data;await image.decode();document.querySelector('canvas').getContext('2d').drawImage(image,0,0,1280,800)},frames[i].data);
  await encoder.waitForTimeout(Math.max(10,Math.min(200,((frames[i+1]?.t||frames[i].t+.066)-frames[i].t)*1000)));
 }
 const data=await encoder.evaluate(()=>new Promise(resolve=>{recorder.onstop=()=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(parts,{type:'video/webm'}))};recorder.stop()}));
 const file=path.resolve(__dirname,'../../references/reels-validation/scroll-sequence.webm');fs.writeFileSync(file,Buffer.from(data,'base64'));console.log(JSON.stringify({file,frames:frames.length,bytes:fs.statSync(file).size}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
