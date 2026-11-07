import {clamp,mix,smooth} from './story-math.js';
import {createField} from '../lines/field.js';
import {createPath} from '../lines/path.js';
import {createGardenStage} from '../journey/garden-stage.js';
import {createDawn,SCENES,sceneAt} from './dawn.js';
import {storyAt,scrollFor,createFollower} from './story-time.js';
import {createThreadBridge} from './thread-bridge.js';

// One scroll reader and one animation frame for the whole page: the new opening, then the
// unchanged sections 3–5. Sections 3–5 are created, measured, scrolled and framed exactly as
// before; only the opening and the seam adapter are new.
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController(),signal=abort.signal;
const root=document.querySelector('#dawn'),track=document.querySelector('.hero-track');
document.documentElement.classList.add('reels-enhanced');
const notAlone=document.querySelector('#not-alone');
const field=createField(notAlone,reduced),garden=createGardenStage(document.querySelector('#product-journey'),reduced),path=createPath(document.querySelector('#way-back'),reduced,garden.entry);
const dawn=createDawn(root,{reduced}),bridge=createThreadBridge({section:notAlone,field,reduced});
const params=new URLSearchParams(location.search),onboarding=params.get('flow')==='onboarding';
root.dataset.flow=onboarding?'onboarding':'public';

const copy=root.querySelector('.dawn-copy'),cue=root.querySelector('.dawn-cue'),captions=[...root.querySelectorAll('[data-caption]')].map(node=>({node,window:node.dataset.caption.split(',').map(Number),shown:-1}));
const motion=root.querySelector('.dawn-motion'),skip=root.querySelector('.dawn-skip'),chromeNodes=[root.querySelector('.dawn-brand'),skip,motion].filter(Boolean);
let chromeShown=-1;
// `target` and `visual` are positions along the opening's scroll (0–1); the story time shown is
// storyAt(visual), which gives each beat its own share of the scroll (see story-time.js).
let target=0,visual=0,clock=0,last=0,frame=0,paused=false,destroyed=false,heroVisible=true,introStart=0,cueShown=false,debugHold=false;
const follower=createFollower();
let engaged=false,lastY=0;
// Geometry is measured on resize only; scroll handling and frames never read layout.
const geo={top:0,travel:1,hero:1,fieldTop:0};
function measure(){geo.top=track.offsetTop;geo.hero=root.offsetHeight;geo.travel=Math.max(1,track.offsetHeight-geo.hero);geo.fieldTop=notAlone.getBoundingClientRect().top+scrollY}
const travel=()=>geo.travel;
// Reduced motion: each scene is shown as its finished key frame.
const shown=u=>{const p=storyAt(u);return reduced.matches?sceneAt(p).key:p};

function readScroll(){
 field.scroll();path.scroll();garden.scroll();
 if(debugHold)return;
 lastY=scrollY;const offset=lastY-geo.top;target=clamp(offset/geo.travel);
 // A jump far past the opening (a restored position, an End key) lands on its finished frame.
 if(offset>geo.travel+geo.hero){visual=1;follower.set(1)}
 heroVisible=offset<geo.travel+geo.hero&&offset>-geo.hero;
}

function intro(now){
 if(reduced.matches)return{intro:1,rise:1};
 const t=(now-introStart)/1000;
 return{intro:smooth(0,1.1,t),rise:1-Math.pow(1-clamp(t/4.2),3)};
}

function paintCopy(p){
 const out=smooth(.035,.11,p);copy.style.opacity=(1-out).toFixed(3);copy.style.transform=`translate3d(0,${(-26*out).toFixed(1)}px,0)`;
 const hidden=out>.95;if(copy.inert!==hidden){copy.inert=hidden;copy.setAttribute('aria-hidden',String(hidden))}
 for(const c of captions){const [a,b,d,e]=c.window,o=reduced.matches?(p>=a&&p<e?1:0):smooth(a,b,p)*(1-smooth(d,e,p)),q=Math.round(o*100);if(q!==c.shown){c.shown=q;c.node.style.opacity=String(q/100);c.node.style.transform=`translate3d(0,${((1-o)*14).toFixed(1)}px,0)`}}
 // Page chrome leaves before the seam: section 3's first frames are only the void and the thread.
 const chrome=1-smooth(.84,.92,p),q=Math.round(chrome*100);
 if(q!==chromeShown){chromeShown=q;for(const node of chromeNodes){node.style.opacity=String(q/100);node.style.visibility=q?'visible':'hidden'}}
 const on=target<(cueShown?.02:.008)&&(reduced.matches||performance.now()-introStart>1800);if(on!==cueShown){cueShown=on;cue.dataset.show=String(on)}
}

function paint(now,dt){
 const p=shown(visual),thread=dawn.paint(p,clock,dt,intro(now));
 paintCopy(p);bridge.set(reduced.matches?null:thread);
 root.dataset.progress=p.toFixed(4);
}

function tick(now){
 if(destroyed)return;
 const dt=last?Math.min((now-last)/1000,.05):0;last=now;
 field.frame(now,dt);path.frame(now,dt);garden.frame(now,dt);
 if(!document.hidden&&!debugHold){
  if(!paused&&!reduced.matches)clock+=dt;
  if(reduced.matches){visual=target;follower.set(target)}else visual=follower.step(target,dt);
  // Paint the opening while it is on screen, and while section 3 has just pinned over it (the thread is still crossing).
  engaged=lastY>=geo.fieldTop;
  const crossing=engaged&&field.debug.state.progress<.1;
  if(heroVisible||crossing)paint(now,paused?0:dt);else bridge.set(null);
 }
 bridge.frame(engaged);
 frame=requestAnimationFrame(tick);
}

function resize(){field.resize();garden.resize();path.resize();dawn.resize();bridge.resize();measure();readScroll();paint(performance.now(),0)}
function syncMotion(){motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume animation':'Pause animation');root.dataset.paused=String(paused)}

window.addEventListener('scroll',readScroll,{passive:true,signal});
window.addEventListener('resize',resize,{signal});
motion.addEventListener('click',()=>{paused=!paused;syncMotion()},{signal});
reduced.addEventListener('change',()=>{field.resize();garden.resize();path.resize();dawn.resize();bridge.resize();measure();readScroll();paint(performance.now(),0)},{signal});
// Leaving the story for Home: the same destination as the story's own final invitation.
skip?.addEventListener('click',()=>{try{sessionStorage.setItem('deepsprout-story-seen','skipped')}catch{}},{signal});
document.querySelector('.journey-cta')?.addEventListener('click',()=>{try{sessionStorage.setItem('deepsprout-story-seen','finished')}catch{}},{signal});

// Section 3 draws "brain rot" from Inter 800 into a mask, so its fonts must be loaded before it is measured.
await Promise.race([Promise.allSettled(['800 100px Inter','500 20px Inter','400 20px Inter'].map(f=>document.fonts.load(f))).then(()=>document.fonts.ready),new Promise(r=>setTimeout(r,2500))]);
field.resize();garden.resize();path.resize();dawn.resize();bridge.resize();measure();
introStart=performance.now();root.dataset.intro=reduced.matches?'done':'play';root.dataset.ready='true';
readScroll();visual=target>.02?target:0;follower.set(visual);paint(performance.now(),0);frame=requestAnimationFrame(tick);
syncMotion();

if(params.has('reelsDebug')){
 window.linesLab=field.debug;window.pathLab=path.debug;window.gardenLab=garden.debug;
 window.storyLab={
  // p is story time (0–1), as in the scene tables; it is converted to the scroll position that shows it.
  seek(p){debugHold=true;visual=target=scrollFor(clamp(p));follower.set(visual);introStart=-1e9;paint(performance.now(),0)},
  at(p,t){debugHold=true;visual=target=scrollFor(clamp(p));follower.set(visual);clock=t;introStart=-1e9;paint(performance.now(),0)},
  play(){debugHold=false;readScroll()},
  scrollTo(p){scrollTo({top:geo.top+scrollFor(clamp(p))*travel(),behavior:'instant'})},
  get state(){return{target,visual,story:storyAt(visual),speed:follower.velocity,clock,scene:sceneAt(shown(visual)).name,travel:travel(),bridge:bridge.state,scenes:SCENES.map(s=>s.name),...dawn.state()}}
 };
}
window.addEventListener('pagehide',e=>{if(!e.persisted){field.destroy();path.destroy();garden.destroy();destroyed=true;cancelAnimationFrame(frame);abort.abort();bridge.destroy()}},{signal});
window.addEventListener('pageshow',e=>{if(e.persisted){measure();readScroll();last=0}},{signal});
