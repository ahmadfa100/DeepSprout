import { STONES } from './stones.js';
// One clock owns the opening. Scene nodes persist for later disruption choreography.
export function createChoreography(root,{onPhase=()=>{}}={}) {
 const g=window.gsap;
 if(!g)return {play(){},pause(){},resume(){},finish(){},destroy(){},seek(){},get time(){return 5.6}};
 const q=s=>root.querySelectorAll(s);
 let idle;
 const setPhase=phase=>{root.dataset.phase=phase;onPhase(phase)};
 const intro=g.timeline({paused:true,onComplete:()=>{setPhase('LIVING_IDLE');idle?.play()}});
 function buildIdle(){
  idle=g.timeline({paused:true,repeat:-1,yoyo:true,defaults:{ease:'sine.inOut',duration:7}});
  idle.to(q('.stone-idle'),{y:i=>i%2?1.4:-1.4,rotation:i=>i%2?.2:-.2,transformOrigin:'center',stagger:.12},0)
   .to(q('.cloud-far'),{x:9,duration:14},0).to(q('.cloud-near'),{x:-6,duration:14},0)
   .to(q('.canopy-left'),{rotation:.6},0).to(q('.canopy-right'),{rotation:-.5},0)
   .to(q('.foliage-left'),{rotation:.35},0).to(q('.foliage-right'),{rotation:-.35},0)
   .to(q('.lake-ripples'),{x:7,opacity:.4,duration:10},0)
   .to(q('.root-glow'),{opacity:.45,duration:5},0).to(q('.growth-halo'),{opacity:.18,duration:6},0);
 }
 buildIdle();
 intro.addLabel('arrival',0).call(()=>setPhase('ARRIVAL'),[],0);
 intro.fromTo(q('.line-first .text-reveal'),{y:20,opacity:0,filter:'blur(5px)'},{y:0,opacity:1,filter:'blur(0px)',duration:1.4,ease:'power3.out'},.1)
 .fromTo(q('.line-living .text-reveal'),{y:22,opacity:0,filter:'blur(5px)'},{y:0,opacity:1,filter:'blur(0px)',duration:1.55,ease:'power3.out'},.3)
 .fromTo(q('.hero-body'),{y:11,opacity:0},{y:0,opacity:1,duration:1.1,ease:'power2.out'},.66)
 .fromTo(q('.cta'),{y:10,opacity:0},{y:0,opacity:1,duration:.85,stagger:.14,ease:'power2.out'},.96);
 STONES.forEach((s,i)=>{
  const node=q('.stone')[i];
  intro.fromTo(node,{x:s.dx,y:s.dy,rotation:s.r,scale:.96,opacity:0,transformOrigin:'center'},{x:-s.dx*.035,y:-2,rotation:-s.r*.025,scale:1,opacity:1,duration:2.22-s.delay,ease:'power2.inOut'},s.delay)
  .to(node,{x:0,y:0,rotation:0,duration:.78+i*.045,ease:'sine.inOut'},2.22+i*.025);
 });
 intro.addLabel('align',2.2).call(()=>setPhase('ALIGN'),[],2.2)
 .addLabel('balanced',3.32).call(()=>setPhase('BALANCED'),[],3.32)
 .addLabel('grow',3.4).call(()=>setPhase('GROW'),[],3.4)
 .fromTo(q('.stone-aura'),{opacity:0},{opacity:.85,duration:.33,stagger:.065,ease:'sine.inOut'},3.4)
 .to(q('.stone-aura'),{opacity:.13,duration:.8,stagger:.045},3.96)
 .fromTo(q('.energy-stem'),{strokeDasharray:1,strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:.55,duration:.83,ease:'power1.inOut'},3.66)
 .fromTo(q('.energy-seed'),{y:0,opacity:0},{y:718,opacity:.9,duration:.85,ease:'power1.inOut'},3.66)
 .to(q('.energy-seed'),{opacity:0,duration:.25},4.43)
 .to(q('.energy-stem'),{opacity:0,duration:.8},4.5)
 .fromTo(q('.growth-halo'),{opacity:0},{opacity:.68,duration:.7},3.9)
 .fromTo(q('.root-path'),{strokeDashoffset:1},{strokeDashoffset:0,duration:1.02,stagger:.016,ease:'power2.out'},4.36)
 .fromTo(q('.root-leaf'),{opacity:0,scale:.15},{opacity:1,scale:1,duration:.7,stagger:.065,ease:'power2.out'},4.65)
 .fromTo(q('.mote'),{opacity:0,y:8},{opacity:.65,y:-10,duration:.65,stagger:.04},4.08)
 .to(q('.mote'),{opacity:0,y:-28,duration:.9,stagger:.025},4.8)
 .fromTo(q('.line-living .text-reveal'),{backgroundPosition:'100% 50%'},{backgroundPosition:'0% 50%',duration:1.7,ease:'sine.inOut'},3.6)
 .to(q('.growth-halo'),{opacity:.3,duration:1},4.8);
 function reset(){idle.pause(0);intro.restart();}
 return {play:reset,pause(){intro.pause();idle.pause()},resume(){if(intro.progress()<1)intro.resume();else idle.resume()},finish(){intro.progress(1);idle.pause(0);setPhase('LIVING_IDLE')},seek(t){idle.pause(0);intro.pause().time(t,false);if(t>=intro.duration())idle.pause(0)},destroy(){intro.kill();idle.kill();g.set(q('.text-reveal'),{clearProps:'willChange'})},get time(){return intro.time()},get duration(){return intro.duration()}};
}
