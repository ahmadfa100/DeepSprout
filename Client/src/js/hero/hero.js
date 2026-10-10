import {createEnvironment} from './environment.js';
import {createStones} from './stones.js';
import {createEffects} from './effects.js';
import {mountBimo} from './bimo.js';
import {createChoreography} from './timeline.js';
const root=document.querySelector('#hero'),abort=new AbortController(),signal=abort.signal;
const media=matchMedia('(prefers-reduced-motion: reduce)');
createEnvironment(document.querySelector('#environment'));
createEffects(document.querySelector('#effects'));
createStones(document.querySelector('#stones'));
const timeline=createChoreography(root,{onPhase:phase=>root.dispatchEvent(new CustomEvent('hero:phase',{detail:{phase}}))});
let paused=false,character;
const button=document.querySelector('#motion-control');
function synchronize(){
 const stopped=paused||document.hidden||media.matches;
 if(stopped){timeline.pause();character?.pause()}else{timeline.resume();character?.resume()}
 button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?'Resume animation':'Pause animation');
}
function replay(){if(media.matches){timeline.finish();return}paused=false;timeline.play();synchronize()}
button.addEventListener('click',()=>{paused=!paused;synchronize()},{signal});
document.querySelector('#replay').addEventListener('click',replay,{signal});
document.addEventListener('visibilitychange',synchronize,{signal});
media.addEventListener('change',()=>{timeline.finish();synchronize()},{signal});
// Reuse the established homepage quick-check interaction without bringing in its layout.
const dialog=document.querySelector('#focus-dialog');
document.querySelector('#focus-check').addEventListener('click',()=>dialog.showModal(),{signal});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}},{signal});
for(const option of dialog.querySelectorAll('[data-result]'))option.addEventListener('click',()=>{dialog.querySelectorAll('[data-result]').forEach(b=>b.setAttribute('aria-pressed',String(b===option)));document.querySelector('#check-result').textContent=option.dataset.result},{signal});
// Text and scene are available immediately; animation starts once the matching rig is ready.
if(media.matches)timeline.finish();
character=await mountBimo({reducedMotion:()=>media.matches,signal});
root.dataset.character=character.status;
if(media.matches)timeline.finish();else timeline.play();
synchronize();root.dataset.ready='true';
// Deliberate, opt-in review seam: no debug controls appear in the actual experience.
if(new URLSearchParams(location.search).has('heroDebug'))window.heroDebug={
 seek:t=>{timeline.seek(t);character.pause()},replay,
 get state(){return{phase:root.dataset.phase,time:timeline.time,duration:timeline.duration,character:character.status,inputs:character.inputs,stones:root.querySelectorAll('.stone').length,paused, reducedMotion:media.matches}},
};
window.addEventListener('pagehide',event=>{if(event.persisted){timeline.pause();character.pause()}else{abort.abort();timeline.destroy()}},{signal});
window.addEventListener('pageshow',event=>{if(event.persisted)synchronize()},{signal});
