import {createStoneSystem} from './stones.js';
import {createEffects} from './effects.js';
import {createBimo} from './bimo.js';
import {createTimeline} from './timeline.js';
import {createIntroGate} from './intro-gate.js';
const root=document.querySelector('#hero-v2'),abort=new AbortController(),signal=abort.signal,media=matchMedia('(prefers-reduced-motion: reduce)');
let paused=false,gate,started=false;
const stopped=()=>paused||document.hidden||media.matches;
createEffects(root.querySelector('#effects'));
const stones=createStoneSystem(root),bimo=createBimo({root:root.querySelector('.bimo'),signal,isStopped:stopped,sceneTime:()=>timeline.time});
const timeline=createTimeline({root,stones,bimo,onPhase:phase=>root.dispatchEvent(new CustomEvent('hero:phase',{detail:{phase,time:timeline?.time??0}})),onComplete:()=>gate?.unlock()});
gate=createIntroGate({timeline,signal,isStopped:stopped,onUnlock:()=>{root.dataset.introComplete='true';root.dataset.storyUnlocked='true'}});
const motion=root.querySelector('#motion-control');
function sync(){if(stopped()){timeline.pause();bimo.pause()}else{timeline.resume();bimo.resume()}motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume animation':'Pause animation')}
function replay(){root.dataset.introComplete='false';root.dataset.storyUnlocked='false';gate.reset();paused=false;if(media.matches){timeline.finish();gate.unlock()}else timeline.play();sync()}
motion.addEventListener('click',()=>{paused=!paused;sync()},{signal});
root.querySelector('#replay').addEventListener('click',replay,{signal});
document.addEventListener('visibilitychange',sync,{signal});
media.addEventListener('change',()=>{timeline.finish();gate.unlock();sync()},{signal});
const dialog=document.querySelector('#focus-dialog');
root.querySelector('#focus-check').addEventListener('click',()=>dialog.showModal(),{signal});
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()},{signal});
for(const choice of dialog.querySelectorAll('[data-result]'))choice.addEventListener('click',()=>{dialog.querySelectorAll('[data-result]').forEach(b=>b.setAttribute('aria-pressed',String(b===choice)));document.querySelector('#check-result').textContent=choice.dataset.result},{signal});
// All physical arrival layers are HTML/CSS, available even before this module initializes.
// The master clock waits only for critical imagery, never for the async character runtime.
const critical=[...root.querySelectorAll('.stone img,.awake-still')];
const loadImages=Promise.allSettled([...critical.map(im=>im.decode()),document.fonts.ready]);
await Promise.race([loadImages,new Promise(resolve=>setTimeout(resolve,1800))]);
root.dataset.layersReady='true';started=true;
if(media.matches){timeline.finish();gate.unlock()}else timeline.play();sync();
bimo.load().then(()=>{root.dataset.character=bimo.status;sync()}).catch(()=>{root.dataset.character='fallback'});
root.dataset.ready='true';
if(new URLSearchParams(location.search).has('heroDebug'))window.heroV2={
 seek:t=>{timeline.seek(t);bimo.resume();setTimeout(()=>bimo.pause(),180)},replay,
 get state(){return{time:timeline.time,phase:timeline.phase,progress:timeline.progress,gate:gate.state,character:bimo.status,inputs:bimo.inputs,paused,reduced:media.matches,stones:stones.nodes.length,started}},
};
window.addEventListener('pagehide',e=>{if(e.persisted){timeline.pause();bimo.pause()}else{abort.abort();timeline.destroy()}},{signal});
window.addEventListener('pageshow',e=>{if(e.persisted)sync()},{signal});
