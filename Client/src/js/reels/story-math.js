export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
export const STAGES=['POST HERO CALM','TINY DISTRACTION','TEMPTATION ORBIT','FIRST COLLAPSE','SWARM / SPIRAL','BLACK-HOLE BURST','THE TRAP'];
export const BOUNDS=[0,.10,.23,.38,.52,.70,.88];
export const CAPTURES=[.025,.215,.32,.455,.61,.82,.97];
export const stageAt=p=>BOUNDS.reduce((stage,start,i)=>p>=start?i:stage,0);
// A rate ceiling gives every narrative beat time to read even after an End-key fling.
// This controls the artwork, never wheel events or native scrolling.
export function follow(current,target,dt,reduced=false){
 if(Math.abs(target-current)<.0001)return target;
 const delta=(target-current)*(1-Math.exp(-dt*(reduced?8:5)));
 // Early-only speed ramp: cue → attention → eyes → NOTICE cannot be skipped by a fling.
 const release=smooth(.25,.38,current);
 return clamp(current+clamp(delta,-dt*(reduced?2:mix(.08,.19,release)),dt*(reduced?2:mix(.06,.145,release))));
}
// Stagger existing native channels; all blends are complete before orbit arrives.
export function noticeBlend(key,p){
 if(/^(openEyeOpacity|closedEyeOpacity|blinkScale|eyeX|eyeY)$/.test(key))return smooth(.18,.21,p);
 if(/head|neck|face|Pod|sproutTilt/i.test(key))return smooth(.155,.205,p);
 return smooth(.19,.22,p);
}
export function stonePose(config,index,p){
 const [bx,by,width,rotation]=config.balance;
 const start=[.38,.53,.59,.70,.735,.775,.81][index];
 const early=.035*smooth(.175,.195,p)*(1-smooth(.20,.215,p))+smooth(.24,.38,p);
 const wobble=(index?smooth(start-.1,start,p):early)*(1-smooth(start+.03,start+.08,p));
 let x=bx+Math.sin(p*155+index*1.7)*wobble*(index?6:12),y=by,r=rotation+Math.sin(p*185+index)*wobble*(index?7:13),scale=1;
 const slip=smooth(start,start+.035,p);x+=(index%2?-1:1)*slip*23;y+=slip*8;r+=(index%2?-1:1)*slip*17;
 // Ballistic acceleration after a short suspended hesitation, with a squash at impact.
 const fall=clamp((p-start-.043)/.095),impact=smooth(.84,1,fall);
 x+=(index%2?-1:1)*fall*(130+index*12);y+=fall*fall*(640-by);r+=fall*fall*(index%2?-125:115);scale-=Math.sin(impact*Math.PI)*.1;
 const capture=smooth(start+.14,start+.26,p),angle=-(p-start)*13+index*1.83;
 const radius=150+index*42;
 x=mix(x,990+Math.cos(angle)*radius,capture);y=mix(y,410+Math.sin(angle)*radius*.76,capture);r+=capture*(p-start)*440;
 const swallowed=smooth(.88,1,p);x=mix(x,955,swallowed*.75);y=mix(y,360,swallowed*.75);scale*=1-swallowed*.74;
 return{x,y,width:width*scale,rotation:r,depth:fall>.1&&index%2&&swallowed<.1?7:4};
}
