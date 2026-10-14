import {END,CHAPTERS,anchors,panelScale,copyFrame,ease,mix,clamp,cubic,chartPoints} from './choreography.js';
import {createCamera} from './camera.js';
import {createGarden,gardenDefinitions} from './garden.js';
import {ROOT,rootShape,tailPath,rootletPath} from '../lines/root.js';

// The garden beat of the original product journey, driven by the page's single scroll reader.
// choreography.js, camera.js and garden.js are the original modules, unchanged; the seed and garden
// logic below is carried over from the original journey.js. The beat starts at T0 on the original
// timeline, when only the seed's origin is left on screen; that origin is now the root from section 4.

export const T0=6.22;
const GARDEN=4,FINISH=6,CAMERA_HOLD=8.15;
// The old community chapter (its time on the original timeline) is skipped: the invitation follows the garden.
const SKIP_FROM=CHAPTERS[5].start,SKIP=CHAPTERS[6].start-SKIP_FROM;
export const SPAN=END-SKIP-T0;
export const timeAt=s=>s<=SKIP_FROM?s:s+SKIP;
export const scrollAt=t=>t<=SKIP_FROM?t:t-SKIP;
const units=mobile=>mobile?11.8/END:1;

// Where the seed used to leave from: the last point of the focus chart, in the focus panel's place.
// The panel is gone; its size (600×480, or 380×400 on phones) and anchor are what fixed that point.
export function entryWorld(mobile){
 const a=anchors(mobile),[w,h]=mobile?[380,400]:[600,480],scale=Math.min(w/600,h/480),p=chartPoints.at(-1);
 return{x:a.focus.x+(w-600*scale)/2+p.x*scale-w/2,y:a.focus.y+(h-480*scale)/2+p.y*scale-h/2};
}

export function createGardenStage(root,reducedQuery){
 const stage=root.querySelector('.journey-stage'),viewport=root.querySelector('.journey-viewport'),world=root.querySelector('.journey-camera'),sets=root.querySelector('.journey-sets');
 const articles=[...root.querySelectorAll('.journey-scene')],seed=root.querySelector('.journey-seed'),seedBody=seed.querySelector('.seed-body'),seedSeam=seed.querySelector('.seed-seam');
 root.insertAdjacentHTML('afterbegin',gardenDefinitions());
 const gardenPanel=root.querySelector('.garden-panel'),home=gardenPanel.parentNode,garden=createGarden(gardenPanel),camera=createCamera(viewport,world);
 const gardenUI=[...gardenPanel.querySelectorAll('.garden-heading,.garden-details,.garden-reward')],cta=root.querySelector('.journey-cta');
 const chapterOf=articles.map(article=>CHAPTERS.findIndex(c=>c.name===article.dataset.scene));
 // The root's layer sits over the viewport with the camera's own transform, so it is the same world.
 const layer=document.createElement('div');layer.className='garden-root-layer';layer.setAttribute('aria-hidden','true');
 layer.innerHTML='<svg class="garden-root"><path class="garden-root-soil"/><path class="garden-root-trunk"/><path class="garden-root-tail"/><path class="garden-root-lets"/></svg>';
 stage.append(layer);
 const [soilPath,trunkPath,tailEl,letsEl]=layer.querySelectorAll('path');
 let enhanced=false,mobile=false,destroyed=false,start=0,travel=1,viewHeight=0,target=T0,time=T0,visible=false,engaged=null,dirty=true,frames=0,geometry={},entry={x:0,y:0},offset={x:0,y:0},set=null;

 function mode(){
  const want=!reducedQuery?.matches&&innerHeight>=600;
  if(want===enhanced&&set!==null)return;
  enhanced=want;root.classList.toggle('is-cinematic',want);root.classList.toggle('is-static',!want);
  if(want){set=set||document.createElement('div');set.className='journey-set';sets.append(set);set.append(gardenPanel)}
  else{
   // The same semantic scenes return to normal document flow.
   home.append(gardenPanel);gardenPanel.style.cssText='';if(set)set.remove();set=set||false;
   articles.forEach(el=>{el.style.cssText='';el.inert=false});garden.render(END,innerWidth<=700,true);gardenUI.forEach(el=>el.style.cssText='');cta.tabIndex=0;
   stage.style.visibility='';layer.hidden=true;
  }
 }

 function measure(){
  if(destroyed)return;
  mode();mobile=innerWidth<=700;
  start=root.getBoundingClientRect().top+scrollY;viewHeight=enhanced?stage.clientHeight:innerHeight;
  travel=viewHeight*units(mobile)*SPAN;root.style.setProperty('--journey-travel',String(units(mobile)*SPAN));
  if(!enhanced){scroll();return}
  layer.hidden=false;
  const a=anchors(mobile);set.dataset.scene='garden';set.style.left=`${a.garden.x}px`;set.style.top=`${a.garden.y}px`;
  camera.resize();
  const art=gardenPanel.querySelector('.garden-art'),artScale=Math.min(art.clientWidth/600,art.clientHeight/480);
  geometry={a,plant:{x:a.garden.x+(286-300)*artScale,y:a.garden.y+art.offsetTop+(art.clientHeight-480*artScale)/2+337*artScale-gardenPanel.clientHeight/2},chartEnd:entryWorld(mobile)};
  // The entry point on screen at T0, and the root drawn there in world coordinates.
  const sr=stage.getBoundingClientRect(),vr=viewport.getBoundingClientRect();offset={x:vr.left-sr.left,y:vr.top-sr.top};
  layer.style.left=`${offset.x}px`;layer.style.top=`${offset.y}px`;
  camera.render(T0);const m=new DOMMatrix(world.style.transform),inverse=m.inverse(),p=m.transformPoint(new DOMPoint(geometry.chartEnd.x,geometry.chartEnd.y));
  entry={x:p.x+offset.x,y:p.y+offset.y};
  const shape=rootShape(entry,viewHeight),scale=Math.hypot(m.a,m.b);
  const toWorld=(x,y)=>{const q=inverse.transformPoint(new DOMPoint(x-offset.x,y-offset.y));return[q.x,q.y]};
  const line=(x0,y0,x1,y1)=>{const [a,b]=toWorld(x0,y0),[c,d]=toWorld(x1,y1);return`M${a.toFixed(2)} ${b.toFixed(2)}L${c.toFixed(2)} ${d.toFixed(2)}`};
  soilPath.setAttribute('d',line(shape.soilLine[0],shape.soil,shape.soilLine[1],shape.soil));
  trunkPath.setAttribute('d',line(shape.x0,shape.top,shape.x0,shape.soil));
  tailEl.setAttribute('d',tailPath(shape,toWorld));letsEl.setAttribute('d',rootletPath(shape,toWorld));
  layer.style.setProperty('--root-scale',String(scale));
  scroll();time=target;dirty=true;
 }

 function scroll(){
  if(!viewHeight)return;
  const off=scrollY-start;target=T0+clamp(off/travel)*SPAN;
  if(enhanced){const pinned=off>=0;if(pinned!==engaged){engaged=pinned;stage.style.visibility=pinned?'visible':'hidden'}}
  const next=off>-innerHeight&&off<root.offsetHeight;if(next!==visible){visible=next;root.dataset.offscreen=String(!next);dirty=true}
 }

 function render(){
  const t=timeAt(time),{a}=geometry;
  camera.render(Math.min(t,CAMERA_HOLD));layer.style.transform=world.style.transform;
  // Garden panel, as in the original renderPanels.
  const s=panelScale('garden',t);set.style.transform=`scale(${s})`;set.style.visibility=s<=.026?'hidden':'visible';gardenPanel.style.clipPath='none';
  garden.render(t,mobile);
  const ui=1-ease(8.18,8.62,t);for(let i=0;i<gardenUI.length;i++){gardenUI[i].style.opacity=String(ui);gardenUI[i].style.transform=`translateY(${(1-ui)*12}px)`}
  // The seed, as in the original renderObjects: the chart endpoint (now the root's tip) is the seed carrier.
  const depart=ease(6.32,6.70,t),land=ease(6.70,6.96,t),point=cubic(geometry.chartEnd,{x:geometry.chartEnd.x-90,y:geometry.chartEnd.y-160},{x:a.garden.x+130,y:a.garden.y-155},{x:geometry.plant.x,y:geometry.plant.y-115},depart);
  point.y=mix(point.y,geometry.plant.y,land);
  const sprouted=ease(6.99,7.15,t),size=mix(.28,.78,ease(6.28,6.64,t))*(1-sprouted);
  seed.style.display=t>=6.28&&t<7.16?'block':'none';seed.style.transform=`translate(${point.x-16}px,${point.y-21}px) rotate(${mix(-15,25,land)}deg) scale(${size})`;
  seedBody.style.fill=t<6.40?'#88b283':'#c4ac88';seedSeam.style.opacity=ease(6.40,6.66,t);
  // Copy, as in the original paint.
  let current=FINISH;for(let c=0;c<CHAPTERS.length;c++)if(t<CHAPTERS[c].end){current=c;break}
  for(let a=0;a<articles.length;a++){const article=articles[a],i=chapterOf[a],f=copyFrame(i,t);article.style.opacity=String(f.opacity);article.style.transform=`translateY(${f.y}px)`;article.style.clipPath=`inset(0 0 ${f.clip}% 0)`;article.inert=i===FINISH&&current!==FINISH;article.dataset.current=String(i===current)}
  cta.tabIndex=current===FINISH?0:-1;
  root.dataset.scene=CHAPTERS[current].name;root.dataset.progress=(t/END).toFixed(5);frames++;
 }

 function frame(now,dt){
  if(destroyed||!enhanced||!visible||document.hidden)return;
  const settled=Math.abs(target-time)<.0005;
  if(!settled||dirty){time=settled?target:time+(target-time)*(1-Math.exp(-dt*11));dirty=false;render()}
 }

 const debug={
  // t is on the original journey timeline (T0…END), so frames can be compared with HEAD's productJourney.seek(t).
  seek(t){scrollTo({top:Math.ceil(start+clamp((scrollAt(t)-T0)/SPAN)*travel),behavior:'instant'});scroll();time=target;dirty=false;if(enhanced)render()},
  // Renders an exact t (no scroll rounding), for frame-by-frame comparison with HEAD's productJourney.state.time.
  renderAt(t){time=target=scrollAt(t);dirty=false;if(enhanced)render()},
  get state(){return{enhanced,time:timeAt(time),scrollTime:time,start,travel,engaged,visible,frames,entry,growth:gardenPanel.dataset.growth,scene:root.dataset.scene,seed:seed.style.display}},
 };
 return{scroll,resize:measure,frame,debug,entry:()=>entry,destroy(){destroyed=true}};
}
