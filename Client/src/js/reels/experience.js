import {STONES} from '../hero-v2/scene-config.js';
import {clamp,mix,ease,storyState,cardPose,CARD_LAYOUT} from './cinematic-math.js';

const html=document.documentElement,root=document.querySelector('#hero-v2');
const track=document.querySelector('.hero-track'),world=root.querySelector('.world');
const original=root.querySelector('.copy'),story=root.querySelector('.story-copy'),release=root.querySelector('.release-copy');
const gravity=root.querySelector('.gravity-scene'),cardLayer=root.querySelector('.gravity-cards');
const character=root.querySelector('.bimo'),cue=root.querySelector('.scroll-cue'),meta=root.querySelector('.scene-meta');
const protection=document.querySelector('#protection'),protectionStage=protection.querySelector('.protection-stage');
const tiles=[...protection.querySelectorAll('.platform-tile')],boundary=protection.querySelector('.protection-boundary');
const pulse=protection.querySelector('.protection-pulse'),lock=protection.querySelector('.silence-lock');
const status=protection.querySelector('.demo-status span'),growth=document.querySelector('.growth'),garden=growth.querySelector('img');
const motion=document.querySelector('#motion-control'),media=matchMedia('(prefers-reduced-motion: reduce)');
const abort=new AbortController(),signal=abort.signal;
let frame=0,disposed=false,still=false,userStill=false,horizon=null,loading=false,metrics={},state={},renderCount=0;
let rendererFactory=null,lastProtection=-1,lastMode=null;

// Reuse approved poster frames. No decoders or unrelated social content are introduced.
const cards=CARD_LAYOUT.map((_,index)=>{
 const card=document.createElement('div');card.className='reel-card';
 const image=new Image();image.src=`assets/reels/posters/poster-0${index%4+1}.png`;image.alt='';image.decoding='async';
 image.width=270;image.height=480;image.loading='lazy';
 const mark=document.createElement('span');mark.className='reel-mark';mark.textContent='ONE MORE';
 card.append(image,mark);cardLayer.append(card);return card;
});
const dust=Array.from({length:27},(_,index)=>{
 const el=document.createElement('i');protection.querySelector('.silence-dust').append(el);return {el,index};
});
const starLayer=document.createElement('div');starLayer.className='gravity-dust';cardLayer.append(starLayer);
const stars=Array.from({length:24},(_,i)=>{const el=document.createElement('i');starLayer.append(el);return el;});
const stones=STONES.map(config=>({config,el:root.querySelector(`[data-stone="${config.id}"]`)}));

function schedule(){if(!disposed&&!document.hidden&&!frame)frame=requestAnimationFrame(render);}
function mode(){
 still=media.matches||userStill||innerHeight<480;
 html.classList.toggle('is-still',still);
 motion.setAttribute('aria-pressed',String(still));motion.textContent=still?'Enable motion':'Reduce motion';
 motion.hidden=media.matches||innerHeight<480;
 if(still&&horizon){horizon.destroy();horizon=null;root.dataset.webgl='static';}
}
function measure(){
 if(disposed)return;
 mode();
 const bounds=el=>{const r=el.getBoundingClientRect();return {start:r.top+scrollY,height:r.height};};
 metrics={hero:bounds(track),protection:bounds(protection),growth:bounds(growth),height:root.clientHeight,width:root.clientWidth};
 metrics.hero.travel=Math.max(1,metrics.hero.height-(still?0:root.clientHeight));
 metrics.protection.travel=Math.max(1,metrics.protection.height-protectionStage.clientHeight);
 horizon?.resize();schedule();
}
function createRenderer(){
 if(disposed||still||!rendererFactory)return;
 horizon?.destroy();
 horizon=rendererFactory(root.querySelector('.horizon-canvas'),{
  invalidate:schedule,
  onState(value){
   if(value==='restore'){createRenderer();return;}
   root.dataset.webgl=value;
  },
 });
 schedule();
}
function requestRenderer(){
 if(horizon||loading||still||disposed)return;
 if(rendererFactory){createRenderer();return;}
 loading=true;
 import('./event-horizon.js?v=cinematic-2').then(module=>{
  loading=false;rendererFactory=module.createEventHorizon;createRenderer();
 }).catch(()=>{loading=false;root.dataset.webgl='unavailable';});
}
function paintHero(p){
 state=storyState(p);root.dataset.phase=state.phase;root.dataset.progress=p.toFixed(5);
 const mobile=innerWidth<=700||(innerWidth<=1000&&innerHeight>innerWidth);
 if(!still){
  world.style.opacity=state.world;
  world.style.transform=`${mobile?'translateX(-63.3%) ':''}scale(${1+ease(0,.24,p)*.045})`;
  original.style.opacity=1-ease(.055,.15,p);original.style.transform=`translateY(${-ease(.055,.15,p)*20}px)`;
  gravity.style.opacity=state.dark;
  story.style.opacity=state.message;story.style.transform=`translateY(${(1-state.message)*12}px)`;
  release.style.opacity=state.release;
  release.querySelector('h2').style.transform=`translateY(${(1-state.release)*22}px)`;
  release.querySelector('.release-sprout').style.transform=`scale(${mix(.75,1,state.release)})`;
 }
 // The original Bimo is retained as an image with its original proportions.
 // Its calm pose and the physical stones respond to the same scroll coordinate.
 character.dataset.pose=still||p<.055?'awake':'focus';
 character.style.transform=still?'none':`translateY(${-ease(.04,.22,p)*6}%) rotate(${ease(.08,.23,p)*-3}deg)`;
 const lift=still?0:ease(0,.13,p);
 stones.forEach(({config,el})=>{
  const from=config.ground,to=config.lift;
  el.style.setProperty('--x',`${mix(from[0],to[0],lift)/1672*100}%`);
  el.style.setProperty('--y',`${mix(from[1],to[1],lift)/941*100}%`);
  el.style.setProperty('--w',`${from[2]/1672*100}%`);
  el.style.setProperty('--rotation',`${mix(from[3],to[3],lift)}deg`);
 });
 const cueOpacity=1-ease(.005,.055,p);cue.style.opacity=still?0:cueOpacity;
 cue.querySelector('i').style.animationPlayState=cueOpacity<.01||still?'paused':'running';
 const isDark=state.dark>.6&&state.release<.55;meta.style.color=isDark?'#c5b9a3':'#38553f';
 meta.querySelector('.scene-number').textContent=p<.18?'01 — A little more living':state.gravity<.75?'02 — The pull of one more':'03 — The way back';
 meta.querySelector('.scene-progress i').style.transform=`scaleX(${p})`;
 const hidden=scrollY>metrics.hero.start+metrics.hero.height||scrollY+innerHeight<metrics.hero.start;
 root.dataset.offscreen=String(hidden);
 if(still||hidden)return;
 if(p>.10&&state.release<.999){requestRenderer();horizon?.render(state.gravity);}
 cards.forEach((card,index)=>{
  if(mobile&&index>3){card.style.display='none';return;}
  const pose=cardPose(index,state.gravity,mobile);
  card.style.display=pose.opacity>.001?'block':'none';
  if(pose.opacity<=.001)return;
  card.style.opacity=pose.opacity;
  card.style.transform=`translate3d(${pose.x*metrics.width}px,${pose.y*metrics.height}px,${pose.z}px) translate(-50%,-50%) rotateZ(${pose.rotate}deg) rotateY(${pose.tilt}deg) scale(${pose.scale*pose.stretch},${pose.scale})`;
  card.style.filter=index>4?'blur(1px)':'none';
 });
 stars.forEach((el,i)=>{
  const g=state.gravity,turn=i*2.399+g*g*2.8,r=(.17+(i%7)*.045)*(1-ease(.2,.85,g));
  const x=(mobile?.5:.68)+Math.cos(turn)*r,y=(mobile?.57:.5)+Math.sin(turn)*r*.75;
  el.style.transform=`translate(${x*metrics.width}px,${y*metrics.height}px) rotate(${turn*180/Math.PI+90}deg) scaleX(${1+ease(.3,.7,g)*8})`;
  el.style.opacity=ease(.12,.3,g)*(1-ease(.7,.88,g))*(.12+(i%4)*.08);
 });
}
function paintProtection(p){
 if(p===lastProtection&&lastMode===still)return;
 lastProtection=p;lastMode=still;
 const activation=still?1:ease(.12,.77,p),field=still?1:ease(.03,.5,p);
 protection.dataset.progress=p.toFixed(5);protection.dataset.phase=activation>.92?'quiet':activation>.05?'protecting':'noise';
 boundary.style.opacity=mix(.15,.8,field);boundary.style.transform=`translate(-50%,-50%) scale(${mix(.65,1,field)})`;
 pulse.style.transform=`translate(-50%,-50%) scale(${mix(.55,1.2,field)})`;pulse.style.opacity=still?0:Math.sin(field*Math.PI)*.45;
 lock.style.opacity=mix(.15,1,activation);lock.style.transform=`translate(-50%,-50%) scale(${mix(.8,1.15,activation)})`;
 const positions=[[-175,-100,-12],[65,-85,13],[-50,15,-6]];
 const final=[[-170,-100,-5],[70,-90,5],[-50,22,0]];
 tiles.forEach((tile,i)=>{
  const t=still?1:ease(.14+i*.09,.58+i*.09,p),a=positions[i],b=final[i];
  tile.style.transform=`translate(${mix(a[0],b[0],t)}%,${mix(a[1],b[1],t)}%) rotate(${mix(a[2],b[2],t)}deg) scale(${mix(1,.83,t)})`;
  tile.style.filter=`saturate(${1-t})`;
  tile.style.color=`rgb(${mix([182,189,82][i],182,t)},${mix([109,107,103][i],188,t)},${mix([137,89,102][i],177,t)})`;
  tile.style.opacity=mix(1,.73,t);
  tile.querySelector('span').style.opacity=mix(.9,.65,t);
 });
 dust.forEach(({el,index:i})=>{
  const group=i%3,t=still?1:ease(.21+group*.09,.65+group*.09,p),angle=i*2.399;
  const width=protection.querySelector('.silence-field').clientWidth;
  const originX=[-.23,.23,0][group]*width,originY=[-.12,-.09,.10][group]*width;
  el.style.transform=`translate(${originX+Math.cos(angle)*t*55}px,${originY-t*65+Math.sin(angle)*t*30}px) scale(${1-t*.7})`;
  el.style.opacity=still?0:Math.sin(t*Math.PI)*.65;
 });
 status.textContent=activation>.92?'Selected sites, silenced':activation>.05?'Your boundary is taking shape':'Choose your websites';
}
function render(){
 frame=0;if(disposed||document.hidden)return;
 const p=still?0:clamp((scrollY-metrics.hero.start)/metrics.hero.travel);
 paintHero(p);
 const pp=still?1:clamp((scrollY-metrics.protection.start)/metrics.protection.travel);
 paintProtection(pp);
 const gp=clamp((scrollY+innerHeight-metrics.growth.start)/(innerHeight*.85));
 garden.style.transform=still?'none':`translateY(${(1-ease(0,1,gp))*18}px) scale(${mix(.9,1,ease(0,1,gp))})`;
 renderCount++;
}
html.classList.add('cinematic-enhanced');
window.addEventListener('scroll',schedule,{passive:true,signal});
window.addEventListener('resize',measure,{signal});
media.addEventListener('change',measure,{signal});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();},{signal});
motion.addEventListener('click',()=>{
 // Preserve the current section when replacing pins with ordinary document flow.
 const sections=[track,protection,document.querySelector('#way-back'),growth,document.querySelector('.invitation')];
 const anchor=sections.find(el=>el.getBoundingClientRect().bottom>innerHeight*.3)||track;
 const top=anchor.getBoundingClientRect().top;
 userStill=!still;measure();scrollBy(0,anchor.getBoundingClientRect().top-top);schedule();
},{signal});
window.addEventListener('pagehide',event=>{
 cancelAnimationFrame(frame);frame=0;
 if(!event.persisted){disposed=true;abort.abort();horizon?.destroy();}
},{signal});
window.addEventListener('pageshow',()=>{measure();schedule();},{signal});
document.fonts.ready.then(()=>{if(!disposed)measure();});
measure();root.dataset.ready='true';
// Read-only diagnostics: no alternate timelines or test-only animation states.
if(new URLSearchParams(location.search).has('reelsDebug'))Object.defineProperty(window,'cinematicLab',{value:{
 get state(){return {...state,still,renderCount,metrics,renderer:horizon?.state??{available:false,frames:0},cards:cards.length,particles:stars.length,dust:dust.length,disposed};},
}});
