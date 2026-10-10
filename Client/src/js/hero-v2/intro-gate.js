// Scroll remains native. Intent changes only intro speed until the gate is open.
export function createIntroGate({timeline,onUnlock,signal,isStopped}){
 let open=false,intent=Math.min(2400,scrollY*5),rate=1,frame=0,last=0,touchY=null;
 function accept(amount,kind){
  if(!Number.isFinite(amount)||Math.abs(amount)<1)return;
  if(open){window.dispatchEvent(new CustomEvent('hero:story-intent',{detail:{amount,kind}}));return}
  // Saturating accumulation: an aggressive fling can never seek past a milestone.
  intent=Math.min(2400,intent+Math.abs(amount));
 }
 function update(now){
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  if(!open&&!isStopped()){
   const target=timeline.time<1.2?1:1+Math.min(intent/700,1.45);
   rate+=(target-rate)*(1-Math.exp(-dt*3));
   timeline.speed(rate);intent*=Math.exp(-dt*.28);
  }
  if(!open)frame=requestAnimationFrame(update);
 }
 frame=requestAnimationFrame(update);
 window.addEventListener('wheel',e=>accept(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1),'wheel'),{passive:true,signal});
 window.addEventListener('touchstart',e=>{touchY=e.touches[0]?.clientY??null},{passive:true,signal});
 window.addEventListener('touchmove',e=>{const y=e.touches[0]?.clientY;if(y!=null&&touchY!=null)accept(touchY-y,'touch');touchY=y},{passive:true,signal});
 window.addEventListener('keydown',e=>{
  if(e.target.closest('button,a,input,textarea,select,dialog')||e.metaKey||e.ctrlKey||e.altKey)return;
  if(['ArrowDown','PageDown','End',' '].includes(e.key))accept(e.key==='ArrowDown'?120:innerHeight,'keyboard');
 },{signal});
 signal.addEventListener('abort',()=>cancelAnimationFrame(frame),{once:true});
 return {
  unlock(){if(open)return;open=true;cancelAnimationFrame(frame);timeline.speed(1);const detail={progress:1,absorbedIntent:intent};window.dispatchEvent(new CustomEvent('hero:intro-complete',{detail}));onUnlock(detail)},
  reset(){open=false;intent=0;rate=1;last=0;cancelAnimationFrame(frame);frame=requestAnimationFrame(update)},
  get state(){return {open,intent,rate,progress:timeline.progress}},
 };
}
