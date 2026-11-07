import {clamp} from './story-math.js';

// How scroll becomes story time for the opening.
//
// 1. Allocation. Each beat gets the scroll distance its motion needs (in scroll units, where the whole
//    opening is 1300). The storm and the fade carry the most movement, so they get the most room.
//    The breakpoints are joined by a monotone cubic (Fritsch–Carlson), so story speed changes
//    gradually across a scene boundary instead of switching abruptly.
// 2. Following. The story follows the scroll position through a critically damped spring: velocity
//    is continuous, so a wheel notch starts and settles the motion smoothly instead of kicking it,
//    and reversing direction decelerates rather than snaps. A ceiling on *story* speed keeps a fling
//    readable; slow and normal scrolling never reach it.
export const BEATS=[ // [story progress at the end of the beat, scroll units]
 [.12,100],   // calm
 [.28,170],   // first reel
 [.48,250],   // losing the moment
 [.68,360],   // the storm
 [.86,260],   // the world fades
 [1,160]      // one thread
];

const N=2048;
export const STORY=(()=>{
 const total=BEATS.reduce((s,[,w])=>s+w,0),xs=[0],ys=[0];let acc=0;
 for(const [p,w] of BEATS){acc+=w;xs.push(acc/total);ys.push(p)}
 const n=xs.length,d=[],m=new Array(n).fill(0);
 for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
 m[0]=d[0];m[n-1]=d[n-2];
 for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
 for(let i=0;i<n-1;i++){const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i]}}
 const lut=new Float32Array(N+1);let k=0;
 for(let j=0;j<=N;j++){const u=j/N;while(k<n-2&&u>xs[k+1])k++;const h=xs[k+1]-xs[k],t=(u-xs[k])/h,t2=t*t,t3=t2*t;
  lut[j]=(2*t3-3*t2+1)*ys[k]+(t3-2*t2+t)*h*m[k]+(-2*t3+3*t2)*ys[k+1]+(t3-t2)*h*m[k+1]}
 lut[N]=1;return lut;
})();
export function storyAt(u){const x=clamp(u)*N,i=Math.min(N-1,Math.floor(x));return STORY[i]+(STORY[i+1]-STORY[i])*(x-i)}
export function scrollFor(p){let lo=0,hi=N;while(hi-lo>1){const mid=(lo+hi)>>1;if(STORY[mid]<p)lo=mid;else hi=mid}return hi/N}
// Story speed per unit of scroll, for the speed ceiling.
const slope=u=>{const a=Math.max(0,u-.002),b=Math.min(1,u+.002);return Math.max(1e-4,(storyAt(b)-storyAt(a))/(b-a))};

export function createFollower({omega=15,maxStorySpeed=.3}={}){
 let x=0,v=0;
 return{
  get value(){return x},get velocity(){return v},
  set(value){x=clamp(value);v=0},
  step(target,dt){
   if(dt<=0)return x;
   // Sub-steps keep the spring stable after a slow frame.
   const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
   for(let s=0;s<steps;s++){
    const a=omega*omega*(target-x)-2*omega*v;v+=a*h;
    const cap=maxStorySpeed/slope(x);if(v>cap)v=cap;else if(v<-cap)v=-cap;
    x+=v*h;
   }
   if(Math.abs(target-x)<1e-5&&Math.abs(v)<1e-4){x=target;v=0}
   x=clamp(x);return x;
  }
 };
}
