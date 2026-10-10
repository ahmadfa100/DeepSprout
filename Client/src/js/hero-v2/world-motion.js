// Independent ambient loops begin with the opening, not after the intro finishes.
// Each group has its own duration; soft masks reuse the existing illustration.
export function createWorldMotion(root){
 const gs=window.gsap,tweens=[];let started=false;
 function loop(selector,values,duration){for(const target of root.querySelectorAll(selector))tweens.push(gs.to(target,{...values,duration,ease:'sine.inOut',repeat:-1,yoyo:true,paused:true}))}
 loop('.cloud-far',{x:16},40);
 loop('.cloud-mid',{x:-24},27);
 loop('.cloud-near',{x:18},20);
 loop('.foreground-left',{rotation:.24,x:.8,transformOrigin:'bottom left'},8.7);
 loop('.foreground-right',{rotation:-.29,x:-1,transformOrigin:'bottom right'},11.3);
 root.querySelectorAll('.idle-leaf').forEach((leaf,i)=>tweens.push(gs.to(leaf,{y:[-4,-6,-3,-5][i],x:[2,-3,2.5,-2][i],rotation:[5,-7,6,-4][i],duration:[7.7,11.1,9.3,13.7][i],ease:'sine.inOut',repeat:-1,yoyo:true,paused:true})));
 loop('.lake-band-far',{x:13,opacity:.15},13);
 loop('.lake-band-mid',{x:-19,opacity:.21},9.7);
 loop('.lake-band-near',{x:23,opacity:.13},16.1);
 return{
  start(){if(!started){started=true;tweens.forEach(t=>t.play())}else this.resume()},
  pause(){tweens.forEach(t=>t.pause())},resume(){if(started)tweens.forEach(t=>t.resume())},
  freeze(){tweens.forEach(t=>t.pause(0))},destroy(){tweens.forEach(t=>t.kill())},
 };
}
