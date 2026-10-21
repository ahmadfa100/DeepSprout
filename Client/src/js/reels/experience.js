import {createStoneSystem} from '../hero-v2/stones.js';
import {createEffects} from '../hero-v2/effects.js';
import {createTimeline} from '../hero-v2/timeline.js';
import {createIntroGate} from '../hero-v2/intro-gate.js';
import {createBimo} from './bimo.js';
import {createVortex} from './vortex.js';
import {clamp,smooth,follow,stageAt,STAGES,BOUNDS,CAPTURES,stonePose,CORE} from './story-math.js';
import {createCollapse,spiralIn,EXIT_TRAVEL,EXIT_END,originalTravel} from './collapse.js';
import {holeFrame} from './black-hole.js';
import {createField} from '../lines/field.js';
import {createPath} from '../lines/path.js';
import {createGardenStage} from '../journey/garden-stage.js';
const root=document.querySelector('#hero-v2'),track=document.querySelector('.hero-track'),abort=new AbortController(),signal=abort.signal;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),world=root.querySelector('.world'),character=root.querySelector('.bimo');
let paused=false,gate,timeline,unlocked=false,targetProgress=0,visualProgress=0,exitProgress=0,last=0,frame=0,clock=0,debugHold=false,destroyed=false,holdUntil=0,offscreen=false;
const stopped=()=>paused||document.hidden||offscreen;
createEffects(root.querySelector('#effects'));
const stones=createStoneSystem(root);stones.nodes.forEach(({node},i)=>node.id=`stone_${String(i+1).padStart(2,'0')}`);
const bimo=createBimo({root:character,signal,isStopped:()=>stopped()||reduced.matches||exitProgress>=.58,sceneTime:()=>timeline?.time??0,storyProgress:()=>visualProgress});
const vortex=createVortex(root);
document.documentElement.classList.add('reels-enhanced');
// The line field shares this page's single scroll reader and animation frame.
const collapse=createCollapse({root,world,character}),field=createField(document.querySelector('#not-alone'),reduced),garden=createGardenStage(document.querySelector('#product-journey'),reduced),path=createPath(document.querySelector('#way-back'),reduced,garden.entry);
timeline=createTimeline({root,stones,bimo,onPhase:phase=>root.dispatchEvent(new CustomEvent('hero:phase',{detail:{phase}})),onComplete:()=>gate?.unlock()});
gate=createIntroGate({timeline,signal,isStopped:()=>stopped()||reduced.matches,onUnlock:()=>{unlocked=true;holdUntil=performance.now()+300;root.dataset.introComplete='true';root.dataset.storyUnlocked='true'}});
const motion=root.querySelector('#motion-control'),originalCopy=root.querySelector('.copy'),copy=root.querySelector('.story-copy'),heading=copy.querySelector('h2'),support=copy.querySelector('.story-support'),cue=root.querySelector('.scroll-cue'),bar=root.querySelector('.story-progress span');
const atmosphere=root.querySelector('.atmosphere'),effects=root.querySelector('#effects');
const copyStates=[['',''],['It only takes a moment.','One notification. One video. One quick check.'],['Just one more.','And suddenly your attention is somewhere else.'],['One minute becomes another.',''],['And another.',''],['',''],['Where did the day go?','A few minutes became hours.']];
let lastStage=-1,lastStaticStage=-1,ambientHeld=false,bimoSwallowed=false,cueShown=false,reframed=0,worldWidth=world.offsetWidth;
function paint(p,dt=0){
 if(reduced.matches)p=unlocked?CAPTURES[stageAt(p)]:0;
 const stage=stageAt(p),violet=smooth(.25,.8,p),burst=smooth(.69,.85,p),trap=smooth(.86,1,p);

 if(unlocked&&!reduced.matches&&!debugHold){const hold=p>.10;if(hold!==ambientHeld){ambientHeld=hold;if(hold)timeline.pause();else if(!stopped())timeline.resume()}}
 root.dataset.reelStage=String(stage);root.dataset.reelProgress=p.toFixed(5);if(unlocked&&bimo.status!=='live')character.dataset.pose=p>.195?'awake':'focus';
 if(stage!==lastStage){lastStage=stage;heading.textContent=copyStates[stage][0];support.textContent=copyStates[stage][1];copy.querySelector('.story-kicker').textContent=stage===6?'JUST ONE MORE…':'THE ATTENTION COLLAPSE';if(reduced.matches)bimo.renderPose();root.dispatchEvent(new CustomEvent('reels:stage',{detail:{stage,name:STAGES[stage],progress:p}}))}
 // The opening copy answers the first scroll at once, and is gone before the first story line.
 const heroOut=smooth(.03,.13,p),heroFade=1-heroOut;originalCopy.style.opacity=heroFade;originalCopy.style.transform=`translateY(${-heroOut*22}px)`;originalCopy.inert=heroFade<.05;originalCopy.setAttribute('aria-hidden',String(heroFade<.05));
 const start=BOUNDS[stage],end=BOUNDS[stage+1]??1.1;
 let opacity=smooth(start+.008,start+.037,p)*(1-smooth(end-.035,end-.006,p));if(stage===1)opacity=smooth(.18,.205,p)*(1-smooth(.22,.23,p));if(stage===0||stage===5)opacity=0;if(stage===4)opacity*=1-smooth(.55,.61,p);if(stage===6)opacity=smooth(.905,.96,p);
 opacity*=1-smooth(.035,.15,exitProgress);copy.style.opacity=opacity;copy.style.transform=`translateY(${(1-opacity)*13}px)`;
 // The cue belongs to completed focus: it appears only once the intro has reached LIVING_IDLE,
 // leaves on the first meaningful scroll, and returns at the top. CSS owns the fade.
 const cueOn=unlocked&&targetProgress<(cueShown?.03:.012);if(cueOn!==cueShown){cueShown=cueOn;cue.dataset.show=String(cueOn)}
 bar.style.transform=`scaleX(${p})`;bar.parentElement.style.visibility=exitProgress>.59?'hidden':'visible';
 if(unlocked){stones.nodes.forEach(({config,node},i)=>{const pose=stonePose(config,i,p),pulled=spiralIn(pose.x/1672,pose.y/941,0,pose.width,exitProgress,.035+i*.012,.32+i*.025,.8);node.style.visibility=pulled.swallowed?'hidden':'visible';stones.apply({...pose,id:config.id,x:pulled.x*1672,y:pulled.y*941,width:pulled.size,rotation:pose.rotation+pulled.turn*180/Math.PI})});}
 for(const el of root.querySelectorAll('.foreground-left,.foreground-right'))el.style.opacity=1-trap*.9;

 atmosphere.style.opacity=violet*.83;root.style.setProperty('--sky-dim',violet.toFixed(2));
 const hole=holeFrame(p,exitProgress);root.style.setProperty('--hole-dark',clamp(hole.form*.55+hole.dark*.45).toFixed(3));
 const tint=Math.round(burst*16)/16;
 root.querySelector('.root-core').setAttribute('stroke',`rgb(${Math.round(245+tint*7)},${Math.round(255-tint*114)},${Math.round(196+tint*59)})`);
 // The garden's glow is the first light the hole takes: it is gone before the dark takes over.
 effects.style.opacity=((1-smooth(.38,.76,p)*.66+(p>.38&&p<.72?Math.sin(p*550)*.10:0))*(1-smooth(.80,.97,p))).toFixed(2);
 root.querySelector('.ambient-svg').style.opacity=1-burst*.75;
 if(p>.10&&!reduced.matches){root.querySelector('.cloud-layers').style.transform=`translateX(${(Math.sin(clock*.08)*3).toFixed(1)}px)`;root.querySelector('.lake-motion').style.transform=`translateX(${(Math.sin(clock*.13)*2).toFixed(1)}px)`}
 else{root.querySelector('.cloud-layers').style.transform='';root.querySelector('.lake-motion').style.transform=''}
 const mobile=innerWidth<=700;
 // On a phone the world is a cropped band; as the hole forms it slides so the core is centred,
 // and the void's geometry is re-measured from the moved world.
 const reframe=mobile?(.633-CORE.x)*worldWidth*smooth(.84,1,p):0;
 world.style.transform=mobile?`translateX(calc(-63.3% + ${reframe.toFixed(1)}px))`:'none';
 if(Math.abs(reframe-reframed)>.05){reframed=reframe;collapse.resize()}
 character.style.transform=`translate(${-trap*30}%,${-burst*3-trap*12}%) rotate(${-burst*3-trap*9}deg) scale(${1-trap*.12})`;
 character.style.setProperty('--reel-glow',burst.toFixed(2));
 collapse.render(exitProgress,reduced.matches);
 const swallowed=exitProgress>=.58;if(swallowed!==bimoSwallowed){bimoSwallowed=swallowed;if(swallowed)bimo.pause();else{bimo.renderPose();bimo.resume()}}
 if(!reduced.matches||lastStaticStage!==stage){vortex.render(p,clock,reduced.matches,stopped()||debugHold,dt,exitProgress);lastStaticStage=stage}
}
function sync(){
 if(stopped()||reduced.matches){timeline.pause();bimo.pause()}else{if(visualProgress>.10){timeline.pause();ambientHeld=true}else{timeline.resume();ambientHeld=false}bimo.resume()}
 motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume animation':'Pause animation');
 vortex.render(visualProgress,clock,reduced.matches,true,.016,exitProgress);last=0;
}
function reset(){debugHold=false;paused=false;unlocked=false;targetProgress=visualProgress=exitProgress=0;lastStage=-1;scrollTo({top:0,behavior:'instant'});gate.reset();root.dataset.introComplete='false';root.dataset.storyUnlocked='false';if(reduced.matches){timeline.finish();gate.unlock()}else timeline.play();paint(0);sync()}
function distances(){const h=root.offsetHeight;return{story:originalTravel(innerWidth<=700)*h,exit:EXIT_TRAVEL*h}}
function readScroll(){
 field.scroll();path.scroll();garden.scroll();
 if(debugHold)return;
 const d=distances(),offset=scrollY-track.offsetTop;
 targetProgress=clamp(offset/d.story);exitProgress=reduced.matches?0:clamp((offset-d.story)/d.exit,0,EXIT_END);
 // A native jump past the trap must land in a coherent exit, not wait behind an offscreen scene.
 if(exitProgress>0){
  if(!unlocked&&timeline){timeline.finish();gate?.unlock();timeline.pause()}
  visualProgress=1;
 }
 const hidden=offset>track.offsetHeight||offset<-root.offsetHeight;
 if(hidden!==offscreen){offscreen=hidden;sync()}
 collapse.render(exitProgress,reduced.matches);
 if(paused&&!document.hidden)paint(visualProgress);
}
window.addEventListener('scroll',readScroll,{passive:true,signal});window.addEventListener('resize',()=>{worldWidth=world.offsetWidth;collapse.resize();field.resize();garden.resize();path.resize();readScroll();paint(visualProgress)},{signal});
function tick(now){
 if(destroyed)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
 field.frame(now,dt);path.frame(now,dt);garden.frame(now,dt);
 if(!stopped()&&!debugHold){if(!reduced.matches&&exitProgress<.70)clock+=dt;if(unlocked&&now>=holdUntil)visualProgress=follow(visualProgress,targetProgress,dt,reduced.matches);paint(visualProgress,dt)}
 frame=requestAnimationFrame(tick);
}
motion.addEventListener('click',()=>{paused=!paused;sync()},{signal});
document.addEventListener('visibilitychange',sync,{signal});
reduced.addEventListener('change',()=>{timeline.finish();gate.unlock();sync();paint(visualProgress);field.resize();garden.resize();path.resize()},{signal});
await Promise.race([Promise.allSettled([...root.querySelectorAll('.stone img,.awake-still')].map(i=>i.decode()).concat(document.fonts.ready)),new Promise(r=>setTimeout(r,1800))]);
collapse.resize();field.resize();garden.resize();path.resize();
root.dataset.layersReady='true';
// A restored scroll position past the trap may already have finished the intro; never restart it then.
if(reduced.matches){timeline.finish();gate.unlock()}else if(!unlocked)timeline.play();sync();readScroll();paint(visualProgress);frame=requestAnimationFrame(tick);
bimo.load().then(()=>{root.dataset.character=bimo.status;sync()}).catch(()=>{root.dataset.character='fallback'});root.dataset.ready='true';
// Explicit review controls, absent on the public experience unless requested.
if(new URLSearchParams(location.search).has('reelsDebug')){window.linesLab=field.debug;window.pathLab=path.debug;window.gardenLab=garden.debug}
if(new URLSearchParams(location.search).has('reelsDebug'))window.reelsLab={
 seek(p){timeline.finish();gate.unlock();timeline.pause();debugHold=true;exitProgress=0;offscreen=false;targetProgress=visualProgress=clamp(p);clock=0;ambientHeld=true;paint(visualProgress);if(!reduced.matches)vortex.prepareMedia(visualProgress);bimo.resume();setTimeout(()=>{bimo.pause();paint(visualProgress)},400)},
 seekExit(q){timeline.finish();gate.unlock();timeline.pause();debugHold=true;offscreen=false;targetProgress=visualProgress=1;exitProgress=clamp(q);clock=0;const d=distances();scrollTo({top:track.offsetTop+d.story+exitProgress*d.exit,behavior:'instant'});paint(1);bimo.renderPose();setTimeout(()=>bimo.pause(),400)},
 quality:value=>vortex.quality(value),maxVideos:value=>vortex.maxVideos(value),pauseCharacter:()=>bimo.pause(),pauseAmbient:()=>timeline.pause(),
 play(){debugHold=false;readScroll();sync()},replay:reset,
 get state(){return{targetProgress,visualProgress,exitProgress,exitPhase:root.dataset.exitPhase,distances:distances(),core:collapse.geometry,offscreen,stage:STAGES[stageAt(visualProgress)],unlocked,paused,reduced:reduced.matches,hidden:document.hidden,character:bimo.status,inputs:bimo.inputs,renderer:vortex.state,stoneCount:stones.nodes.length,clock}}
};
window.addEventListener('pagehide',e=>{if(!e.persisted){field.destroy();path.destroy();garden.destroy()}timeline.pause();bimo.pause();vortex.render(visualProgress,clock,reduced.matches,true,.016,exitProgress);if(!e.persisted){destroyed=true;cancelAnimationFrame(frame);abort.abort();timeline.destroy();vortex.destroy()}},{signal});window.addEventListener('pageshow',e=>{if(e.persisted){readScroll();sync()}},{signal});
