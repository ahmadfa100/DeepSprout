import {clamp,smooth} from './story-math.js';
import {drawThread,THREAD} from './dawn.js';

// The seam between the opening and section 3 ("You're not alone"), owned from outside section 3.
// One fixed canvas carries the last thread across it: it draws the opening's thread while the
// opening is on screen, keeps drawing it once section 3's stage pins over the opening (whose own
// first frames are only the void), and fades out exactly as section 3 strokes the same line itself.
// Section 3 draws that line at alpha .85·a, a = smooth(.06,.085,p). Stacked over it in the same
// colour, the bridge at (.85 − .85a)/(1 − .85a) keeps the composite at a constant .85.
export function createThreadBridge({section,field,reduced}){
 const stage=section.querySelector('.lines-stage'),canvas=document.createElement('canvas');
 canvas.className='thread-bridge';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
 const ctx=canvas.getContext('2d');
 let width=1,height=1,dpr=1,painted=false,hero=null;
 function resize(){
  const rect=stage.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(2,devicePixelRatio||1);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;painted=true;
 }
 // A blank canvas is hidden, so the compositor has no screen-sized layer to blend while the bridge is idle.
 let shown=true;const show=on=>{if(on!==shown){shown=on;canvas.style.visibility=on?'visible':'hidden'}};
 function clear(){if(painted){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);painted=false}show(false)}
 // `engaged`: section 3's stage has pinned (the same test it makes itself), from the driver's cached geometry.
 function frame(engaged){
  if(reduced?.matches||!hero){clear();return}
  let alpha=1;
  if(engaged){const p=field.debug.state.progress,a=.85*smooth(.06,.085,p);if(p>=.085){clear();return}alpha=clamp((.85-a)/(1-a)/.85)}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.lineCap='round';
  drawThread(ctx,hero.points,{alpha:hero.alpha*alpha,width:hero.width,color:hero.color,glow:hero.glow});painted=true;show(true);
 }
 resize();
 return{resize,frame,set(thread){hero=thread},destroy(){canvas.remove()},get state(){return{width,height,hero:Boolean(hero),painted}},THREAD};
}
