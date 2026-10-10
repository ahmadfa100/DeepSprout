import {createStoneSystem} from '../hero-v2/stones.js';
import {createEffects} from '../hero-v2/effects.js';
import {createTimeline} from '../hero-v2/timeline.js';
import {createIntroGate} from '../hero-v2/intro-gate.js';
import {createBimo} from './bimo.js';
import {createVortex} from './vortex.js';
import {clamp,smooth,follow,stageAt,STAGES,BOUNDS,CAPTURES,stonePose} from './story-math.js';
const root=document.querySelector('#hero-v2'),track=document.querySelector('.hero-track'),abort=new AbortController(),signal=abort.signal;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),world=root.querySelector('.world'),character=root.querySelector('.bimo');
let paused=false,gate,timeline,unlocked=false,targetProgress=0,visualProgress=0,last=0,frame=0,clock=0,debugHold=false,destroyed=false,holdUntil=0;
const stopped=()=>paused||document.hidden;
createEffects(root.querySelector('#effects'));
const stones=createStoneSystem(root);stones.nodes.forEach(({node},i)=>node.id=`stone_${String(i+1).padStart(2,'0')}`);
const bimo=createBimo({root:character,signal,isStopped:()=>stopped()||reduced.matches,sceneTime:()=>timeline?.time??0,storyProgress:()=>visualProgress});
const vortex=createVortex(root);
timeline=createTimeline({root,stones,bimo,onPhase:phase=>root.dispatchEvent(new CustomEvent('hero:phase',{detail:{phase}})),onComplete:()=>gate?.unlock()});
gate=createIntroGate({timeline,signal,isStopped:()=>stopped()||reduced.matches,onUnlock:()=>{unlocked=true;holdUntil=performance.now()+500;root.dataset.introComplete='true';root.dataset.storyUnlocked='true'}});
const motion=root.querySelector('#motion-control'),originalCopy=root.querySelector('.copy'),copy=root.querySelector('.story-copy'),heading=copy.querySelector('h2'),support=copy.querySelector('.story-support'),cue=root.querySelector('.scroll-cue'),bar=root.querySelector('.story-progress span');
const atmosphere=root.querySelector('.atmosphere'),effects=root.querySelector('#effects');
const copyStates=[['',''],['It only takes a moment.','One notification. One video. One quick check.'],['Just one more.','And suddenly your attention is somewhere else.'],['One minute becomes another.',''],['And another.',''],['',''],['Where did the day go?','A few minutes became hours.']];
let lastStage=-1,lastStaticStage=-1,ambientHeld=false;
function paint(p,dt=0){
 if(reduced.matches)p=unlocked?CAPTURES[stageAt(p)]:0;
 const stage=stageAt(p),violet=smooth(.25,.8,p),burst=smooth(.69,.85,p),trap=smooth(.86,1,p);

 if(unlocked&&!reduced.matches&&!debugHold){const hold=p>.08;if(hold!==ambientHeld){ambientHeld=hold;if(hold)timeline.pause();else if(!stopped())timeline.resume()}}
 root.dataset.reelStage=String(stage);root.dataset.reelProgress=p.toFixed(5);if(unlocked&&bimo.status!=='live')character.dataset.pose=p>.12?'awake':'focus';
 if(stage!==lastStage){lastStage=stage;heading.textContent=copyStates[stage][0];support.textContent=copyStates[stage][1];copy.querySelector('.story-kicker').textContent=stage===6?'JUST ONE MORE…':'THE ATTENTION COLLAPSE';if(reduced.matches)bimo.renderPose();root.dispatchEvent(new CustomEvent('reels:stage',{detail:{stage,name:STAGES[stage],progress:p}}))}
 const heroFade=1-smooth(.08,.14,p);originalCopy.style.opacity=heroFade;originalCopy.style.transform=`translateY(${-smooth(.08,.15,p)*18}px)`;originalCopy.inert=heroFade<.05;originalCopy.setAttribute('aria-hidden',String(heroFade<.05));
 const start=BOUNDS[stage],end=BOUNDS[stage+1]??1.1;
 let opacity=smooth(start+.008,start+.037,p)*(1-smooth(end-.035,end-.006,p));if(stage===0||stage===5)opacity=0;if(stage===4)opacity*=1-smooth(.55,.61,p);if(stage===6)opacity=smooth(.905,.96,p);
 copy.style.opacity=opacity;copy.style.transform=`translateY(${(1-opacity)*13}px)`;
 cue.style.opacity=unlocked?(1-smooth(.035,.10,p))*.9:0;
 bar.style.transform=`scaleX(${p})`;
 if(unlocked){stones.nodes.forEach(({config},i)=>stones.apply({...stonePose(config,i,p),id:config.id}));}
 for(const el of root.querySelectorAll(".foreground-left,.foreground-right"))el.style.opacity=1-trap*.9;

 atmosphere.style.opacity=violet*.83;root.style.setProperty('--sky-dim',violet.toFixed(2));
 const tint=Math.round(burst*16)/16;
 root.querySelector('.root-core').setAttribute('stroke',`rgb(${Math.round(245+tint*7)},${Math.round(255-tint*114)},${Math.round(196+tint*59)})`);
 effects.style.opacity=(1-smooth(.38,.76,p)*.66+(p>.38&&p<.72?Math.sin(p*550)*.10:0)).toFixed(2);
 root.querySelector('.ambient-svg').style.opacity=1-burst*.75;
 if(p>.08&&!reduced.matches){root.querySelector('.cloud-layers').style.transform=`translateX(${(Math.sin(clock*.08)*3).toFixed(1)}px)`;root.querySelector('.lake-motion').style.transform=`translateX(${(Math.sin(clock*.13)*2).toFixed(1)}px)`}
 else{root.querySelector('.cloud-layers').style.transform='';root.querySelector('.lake-motion').style.transform=''}
 const mobile=innerWidth<=700;
 world.style.transform=mobile?'translateX(-63.3%)':'none';
 character.style.transform=`translate(${-trap*30}%,${-burst*3-trap*12}%) rotate(${-burst*3-trap*9}deg) scale(${1-trap*.12})`;
 character.style.setProperty('--reel-glow',burst.toFixed(2));
 if(!reduced.matches||lastStaticStage!==stage){vortex.render(p,clock,reduced.matches,stopped()||debugHold,dt);lastStaticStage=stage}
}
function sync(){
 if(stopped()||reduced.matches){timeline.pause();bimo.pause()}else{if(visualProgress>.08){timeline.pause();ambientHeld=true}else{timeline.resume();ambientHeld=false}bimo.resume()}
 motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume animation':'Pause animation');
 vortex.render(visualProgress,clock,reduced.matches,true);last=0;
}
function reset(){debugHold=false;paused=false;unlocked=false;targetProgress=visualProgress=0;lastStage=-1;scrollTo({top:0,behavior:'instant'});gate.reset();root.dataset.introComplete='false';root.dataset.storyUnlocked='false';if(reduced.matches){timeline.finish();gate.unlock()}else timeline.play();paint(0);sync()}
function readScroll(){if(debugHold)return;const distance=Math.max(1,track.offsetHeight-root.offsetHeight);targetProgress=clamp((scrollY-track.offsetTop)/distance)}
window.addEventListener('scroll',readScroll,{passive:true,signal});window.addEventListener('resize',()=>{readScroll();paint(visualProgress)},{signal});
function tick(now){
 if(destroyed)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
 if(!stopped()&&!debugHold){if(!reduced.matches)clock+=dt;if(unlocked&&now>=holdUntil)visualProgress=follow(visualProgress,targetProgress,dt,reduced.matches);paint(visualProgress,dt)}
 frame=requestAnimationFrame(tick);
}
motion.addEventListener('click',()=>{paused=!paused;sync()},{signal});root.querySelector('#replay').addEventListener('click',reset,{signal});
document.addEventListener('visibilitychange',sync,{signal});
reduced.addEventListener('change',()=>{timeline.finish();gate.unlock();sync();paint(visualProgress)},{signal});
const dialog=document.querySelector('#focus-dialog');root.querySelector('#focus-check').addEventListener('click',()=>dialog.showModal(),{signal});
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()},{signal});
for(const choice of dialog.querySelectorAll('[data-result]'))choice.addEventListener('click',()=>{dialog.querySelectorAll('[data-result]').forEach(b=>b.setAttribute('aria-pressed',String(b===choice)));document.querySelector('#check-result').textContent=choice.dataset.result},{signal});
await Promise.race([Promise.allSettled([...root.querySelectorAll('.stone img,.awake-still')].map(i=>i.decode()).concat(document.fonts.ready)),new Promise(r=>setTimeout(r,1800))]);
root.dataset.layersReady='true';if(reduced.matches){timeline.finish();gate.unlock()}else timeline.play();sync();readScroll();paint(0);frame=requestAnimationFrame(tick);
bimo.load().then(()=>{root.dataset.character=bimo.status;sync()}).catch(()=>{root.dataset.character='fallback'});root.dataset.ready='true';
// Explicit review controls, absent on the public experience unless requested.
if(new URLSearchParams(location.search).has('reelsDebug'))window.reelsLab={
 seek(p){timeline.finish();gate.unlock();timeline.pause();debugHold=true;targetProgress=visualProgress=clamp(p);clock=0;ambientHeld=true;paint(visualProgress);if(!reduced.matches)vortex.prepareMedia(visualProgress);bimo.resume();setTimeout(()=>{bimo.pause();paint(visualProgress)},400)},
 quality:value=>vortex.quality(value),maxVideos:value=>vortex.maxVideos(value),pauseCharacter:()=>bimo.pause(),pauseAmbient:()=>timeline.pause(),
 play(){debugHold=false;readScroll();sync()},replay:reset,
 get state(){return{targetProgress,visualProgress,stage:STAGES[stageAt(visualProgress)],unlocked,paused,reduced:reduced.matches,hidden:document.hidden,character:bimo.status,inputs:bimo.inputs,renderer:vortex.state,stoneCount:stones.nodes.length,clock}}
};
window.addEventListener('pagehide',e=>{timeline.pause();bimo.pause();vortex.render(visualProgress,clock,reduced.matches,true);if(!e.persisted){destroyed=true;cancelAnimationFrame(frame);abort.abort();timeline.destroy();vortex.destroy()}},{signal});window.addEventListener('pageshow',e=>{if(e.persisted)sync()},{signal});
