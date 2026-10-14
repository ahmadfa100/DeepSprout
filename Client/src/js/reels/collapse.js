import {clamp,mix,smooth} from './story-math.js';

// The existing trap's shader core, in world coordinates. All exit layers share it.
export const CORE={x:.568,y:.46};
export const EXIT_TRAVEL=5;
// Section 2 ends on the full dark void; the line field (section 3) starts from it.
export const EXIT_END=.70;
export const originalTravel=mobile=>mobile?7.5:8;

export function collapseFrame(progress){
 const q=clamp(progress);
 return {
  progress:q,
  bimo:smooth(.36,.58,q),
  void:smooth(.59,.70,q),
  phase:q<.12?'gravity':q<.36?'collapse':q<.59?'bimo':q<.70?'consumption':'void',
 };
}

// Authored polar paths, not accumulated physics: reversing scroll restores every object.
// Z recedes as apparent radius and scale fall; objects disappear only inside the throat.
export function spiralIn(x,y,z,size,q,start,end,turns=1,core=CORE){
 const t=clamp((q-start)/(end-start)),pull=t*t;
 if(t===0)return{x,y,z,size,turn:0,swallowed:false};
 const dx=x-core.x,dy=(y-core.y)/1.38;
 const radius=Math.hypot(dx,dy)*Math.pow(1-pull,1.65);
 const turn=pull*turns*Math.PI*2,angle=Math.atan2(dy,dx)+turn;
 return {
  x:core.x+Math.cos(angle)*radius,y:core.y+Math.sin(angle)*radius*1.38,
  z:mix(z,-34,pull),size:size*Math.pow(1-pull,1.8),turn,
  swallowed:t>=.998,
 };
}

export function createCollapse({root,world,character}){
 const wrapper=document.createElement('div');wrapper.className='bimo-gravity';
 character.before(wrapper);wrapper.append(character);
 const voidLayer=root.querySelector('.transition-void');
 const decorations=[...root.querySelectorAll('.ambient-svg,.foreground-left,.foreground-right')];
 let geometry,decorationStyles=null;
 function resize(){
  const w=world.getBoundingClientRect(),r=root.getBoundingClientRect();
  const x=w.left-r.left+w.width*CORE.x,y=w.top-r.top+w.height*CORE.y;
  const radius=Math.max(...[[0,0],[r.width,0],[0,r.height],[r.width,r.height]].map(([a,b])=>Math.hypot(a-x,b-y)))+24;
  geometry={x,y,radius,seed:w.height*.048};
  wrapper.style.transformOrigin=`${CORE.x*100}% ${CORE.y*100}%`;
 }
 function render(progress,reduced=false){
  const f=collapseFrame(progress),{x,y,radius,seed}=geometry;
  root.dataset.exitPhase=progress>0?f.phase:'trap';
  // A short deterministic arc around the hole; the original Rive pose/canvas stays intact.
  wrapper.style.transform=`rotate(${f.bimo*f.bimo*-126}deg) scale(${Math.pow(1-f.bimo,1.65)})`;
  wrapper.style.visibility=f.bimo>=1?'hidden':'visible';
  if(progress>0){
   if(!decorationStyles)decorationStyles=decorations.map(el=>({transform:el.style.transform,origin:el.style.transformOrigin}));
   decorations.forEach((el,i)=>{const pull=smooth(.025+i*.01,.40+i*.015,progress);el.style.transformOrigin='56.8% 46%';el.style.transform=`rotate(${pull*110}deg) scale(${Math.pow(1-pull,2)})`});
  }else if(decorationStyles){decorations.forEach((el,i)=>{el.style.transform=decorationStyles[i].transform;el.style.transformOrigin=decorationStyles[i].origin});decorationStyles=null}
  voidLayer.style.clipPath=`circle(${progress>0?mix(seed*smooth(.55,.59,progress),radius,f.void):0}px at ${x}px ${y}px)`;
  return f;
 }
 resize();
 return{render,resize,get geometry(){return geometry}};
}
