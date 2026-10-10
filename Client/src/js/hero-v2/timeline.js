import {createWorldMotion} from './world-motion.js';
import {STONES,PHASES} from './scene-config.js';
export function createTimeline({root,stones,bimo,onPhase,onComplete}){
 const gs=window.gsap;const q=s=>root.querySelectorAll(s);
 let idle,master,lastPhase;const poses=STONES.map(s=>({id:s.id,x:s.ground[0],y:s.ground[1],width:s.ground[2],rotation:s.ground[3],depth:4}));
 const setPhase=p=>{if(lastPhase===p)return;lastPhase=p;root.dataset.phase=p;onPhase(p)};
 if(!gs)return {play(){},pause(){},resume(){},finish(){stones.settle();bimo.focus(1);setPhase('LIVING_IDLE');onComplete()},seek(){},speed(){},destroy(){},get time(){return 8.2},get progress(){return 1}};
 const ambient=createWorldMotion(root);
 idle=gs.timeline({paused:true,repeat:-1,yoyo:true,defaults:{ease:'sine.inOut'}});
 idle.to(q('.stone-idle'),{y:1,duration:5.8,stagger:.08},0)
  .to(q('.root-shadow'),{opacity:.42,duration:6},0)
  .to(q('.ground-bloom'),{opacity:.13,duration:7},0)
  .to(q('.growth-ribbon'),{opacity:.13,duration:8},0)
  .to(q('.stone-glow'),{opacity:.15,duration:6,stagger:.09},0)
;
 master=gs.timeline({paused:true,onComplete:()=>{setPhase('LIVING_IDLE');idle.play(0);onComplete()}});
 PHASES.forEach(p=>master.addLabel(p.name.toLowerCase(),p.at).call(()=>setPhase(p.name),[],p.at));
 poses.forEach((p,i)=>{
  const config=STONES[i];const paint=()=>stones.apply(p);
  // Individual lift arcs lead through shallow depth before the storyboard's suspended pose.
  const lifted={x:config.lift[0],y:config.lift[1],width:config.lift[2],rotation:config.lift[3]};
  const lead={x:p.x+(lifted.x-p.x)*.3+(i%2?35:-24),y:p.y-90-i*8,width:p.width*.98,rotation:p.rotation+(i%2?10:-8)};
  master.to(p,{...lead,duration:.8,delay:0,onUpdate:paint,ease:'power2.in'},1.2+i*.035)
   .to(p,{...lifted,duration:1.8-i*.035,onUpdate:paint,ease:'power2.out'},2+i*.035)
   .to(p,{x:config.align[0],y:config.align[1],width:config.align[2],rotation:config.align[3],duration:1.6,onUpdate:paint,ease:'power2.inOut'},3.8);
  // The top two exchange shallow depth to reconcile the alignment and balance frames.
  if(i<2){master.to(p,{x:1058+(i===0?36:-36),y:(config.align[1]+config.balance[1])/2,rotation:0,duration:.42,onUpdate:paint,ease:'sine.inOut'},5.4)
    .to(p,{x:config.balance[0],y:config.balance[1],width:config.balance[2],rotation:config.balance[3],duration:.58,onUpdate:paint,ease:'sine.inOut'},5.82)}
  else master.to(p,{x:config.balance[0],y:config.balance[1],width:config.balance[2],rotation:config.balance[3],duration:1,onUpdate:paint,ease:'sine.inOut'},5.4);
 });
 master.call(()=>bimo.focus(1),[],3.8)
 .fromTo(q('.lift-trail'),{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:.45,duration:1.3,stagger:.1,ease:'sine.inOut'},1.65)
 .to(q('.lift-trail'),{opacity:0,duration:.7},3.15)
 .fromTo(q('.root'),{strokeDashoffset:1},{strokeDashoffset:0,duration:1.08,stagger:.003,ease:'power2.out'},7.05)
 .fromTo(q('.root-leaf'),{opacity:0},{opacity:1,duration:.55,stagger:.03},7.42)
 .fromTo(q('.stone-glow'),{opacity:0},{opacity:.86,duration:.28,stagger:.095},6.4)
 .to(q('.stone-glow'),{opacity:.22,duration:.6,stagger:.04},7.35)
 .fromTo(q('.stone img'),{filter:'drop-shadow(0 0 0px rgba(245,255,164,0))'},{filter:'drop-shadow(0 0 9px rgba(245,255,164,.85))',duration:.35,stagger:.095},6.4)
 .to(q('.stone img'),{filter:'drop-shadow(0 0 5px rgba(245,255,164,.6))',duration:.65},7.55)
 .fromTo(q('.growth-ribbon'),{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:.65,duration:1.1,ease:'sine.inOut'},6.4)
 .to(q('.growth-ribbon'),{opacity:.22,duration:.4},7.8)
 .fromTo(q('.energy-thread'),{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:.55,duration:.72,ease:'sine.inOut'},6.6)
 .fromTo(q('.flow-seed'),{y:0,opacity:0},{y:705,opacity:.9,duration:.83,ease:'sine.inOut'},6.55)
 .to(q('.flow-seed'),{opacity:0,duration:.28},7.35)
 .to(q('.energy-thread'),{opacity:0,duration:.65},7.45)
 .fromTo(q('.bimo-bloom'),{opacity:0},{opacity:.43,duration:.6},6.95)
 .to(q('.bimo-bloom'),{opacity:.12,duration:.5},7.65)
 .fromTo(q('.ground-bloom'),{opacity:0},{opacity:.6,duration:.62},7.08)
 .to(q('.ground-bloom'),{opacity:.2,duration:.45},7.75)
 .fromTo(q('.growth-leaf'),{opacity:0,y:14},{opacity:.8,y:-5,duration:.9,stagger:.018},6.72)
 .to(q('.growth-leaf'),{opacity:.25,duration:.65},7.55)
 .fromTo(q('.sparkle'),{opacity:0},{opacity:.72,duration:.45,stagger:.019},6.5)
 .to(q('.sparkle'),{opacity:.16,duration:.7},7.5)
 .to(q('.lake-grow'),{opacity:.16,duration:.4},7.05)
 .to(q('.lake-grow'),{opacity:0,duration:.75},7.45)
 .fromTo(q('.headline-living'),{backgroundPosition:'100% 50%'},{backgroundPosition:'0% 50%',duration:1.65,ease:'sine.inOut'},6.4);
 // Static first paint is the authored arrival; the intro only moves physical scene objects.
 return {
  play(){ambient.start();idle.pause(0);bimo.focus(0);master.restart()},pause(){master.pause();idle.pause();ambient.pause()},
  resume(){ambient.resume();if(master.progress()<1)master.resume();else idle.resume()},
  finish(){ambient.freeze();master.progress(1);idle.pause(0);stones.settle();bimo.focus(1);setPhase('LIVING_IDLE')},
  seek(time){ambient.pause();idle.pause(0);master.pause().time(Math.min(time,8.2),false);bimo.focus(time>=3.8?1:0);if(time>=8.2)idle.time(time-8.2).pause()},
  speed(value){master.timeScale(value)},destroy(){master.kill();idle.kill();ambient.destroy()},
  get time(){return master.time()},get progress(){return master.progress()},get phase(){return root.dataset.phase},
 };
}
