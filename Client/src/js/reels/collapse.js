import {clamp,mix,smooth} from './story-math.js';

// The existing trap's shader core, in world coordinates. All exit layers share it.
export const CORE={x:.568,y:.46};
export const EXIT_TRAVEL=5;
export const originalTravel=mobile=>mobile?7.5:8;

export function collapseFrame(progress){
 const q=clamp(progress);
 return {
  progress:q,
  bimo:smooth(.36,.58,q),
  void:smooth(.59,.70,q),
  spark:smooth(.735,.765,q),
  light:smooth(.765,.89,q),
  title:smooth(.875,.965,q),
  accent:smooth(.905,.985,q),
  support:smooth(.945,1,q),
  phase:q<.12?'gravity':q<.36?'collapse':q<.59?'bimo':q<.70?'consumption':q<.735?'void':q<.89?'light':'clarity',
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

export function createCollapse({root,world,character,track,section}){
 const wrapper=document.createElement('div');wrapper.className='bimo-gravity';
 character.before(wrapper);wrapper.append(character);
 const voidLayer=root.querySelector('.transition-void'),light=root.querySelector('.transition-light'),glow=root.querySelector('.transition-glow');
 const intro=section.querySelector('.clarity-copy');
 const decorations=[...root.querySelectorAll('.ambient-svg,.foreground-left,.foreground-right')];
 let geometry,sectionTop=0,decorationStyles=null;
 function resize(){
  const w=world.getBoundingClientRect(),r=root.getBoundingClientRect();
  const x=w.left-r.left+w.width*CORE.x,y=w.top-r.top+w.height*CORE.y;
  const radius=Math.max(...[[0,0],[r.width,0],[0,r.height],[r.width,r.height]].map(([a,b])=>Math.hypot(a-x,b-y)))+24;
  geometry={x,y,radius,seed:w.height*.048};
  sectionTop=track.offsetTop+track.offsetHeight-root.offsetHeight;
  for(const el of [voidLayer,light,glow]){el.style.setProperty('--core-x',`${x}px`);el.style.setProperty('--core-y',`${y}px`)}
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
  const opening=mix(2,radius,Math.pow(f.light,1.45));
  light.style.clipPath=`circle(${f.spark?opening:0}px at ${x}px ${y}px)`;
  glow.style.width=glow.style.height=`${Math.max(12,opening*2)}px`;
  glow.style.opacity=String(f.spark*(1-smooth(.88,.925,progress)));
  section.style.backgroundColor=progress>=.89||reduced?'#faf8f3':'transparent';
  // One semantic heading travels from the sticky scene into normal document flow.
  // At the pin's end this translation is zero: no duplicate heading or handoff jump.
  intro.style.transform=reduced?'none':`translateY(${-Math.max(0,sectionTop-scrollY)}px)`;
  intro.style.visibility=progress>=.865||scrollY>=sectionTop?'visible':'hidden';
  intro.style.setProperty('--title-reveal',f.title);
  intro.style.setProperty('--accent-reveal',f.accent);
  intro.style.setProperty('--support-reveal',f.support);
  return f;
 }
 resize();
 return{render,resize,get geometry(){return geometry}};
}
