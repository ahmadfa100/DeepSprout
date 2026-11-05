// Pure scroll choreography. Nothing depends on elapsed time, previous frames or randomness.
export const END = 10.5;
export const CHAPTERS = [
 {name:'assessment',start:0,read:.58,end:1.88},
 {name:'plan',start:1.88,read:2.35,end:3.40},
 {name:'activities',start:3.40,read:3.82,end:4.78},
 {name:'focus',start:4.78,read:5.22,end:6.45},
 {name:'garden',start:6.45,read:7.45,end:9.18},
 {name:'community',start:9.18,read:9.42,end:9.87},
 {name:'finish',start:9.87,read:10.18,end:END+.2},
];
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const mix=(a,b,p)=>a+(b-a)*p;
export function ease(a,b,v){const p=clamp((v-a)/(b-a));return p*p*(3-2*p)}
export const lerpPoint=(a,b,p)=>({x:mix(a.x,b.x,p),y:mix(a.y,b.y,p)});
export function anchors(mobile=false){
 return mobile ? {assessment:{x:-560,y:-260},plan:{x:0,y:-620},activities:{x:560,y:-260},focus:{x:560,y:410},garden:{x:0,y:190}} :
 {assessment:{x:-840,y:-280},plan:{x:0,y:-580},activities:{x:840,y:-260},focus:{x:800,y:500},garden:{x:0,y:240}};
}
export function roadmapPoints(mobile){return mobile?[{x:60,y:84},{x:89,y:181},{x:59,y:279},{x:90,y:374}]:[{x:70,y:153},{x:333,y:233},{x:90,y:343},{x:358,y:408}]}
function pose(point,scale=1,roll=0,pitch=0){return {...point,scale,roll,pitch}}
export function cameraAt(t,mobile=false){
 const a=anchors(mobile),p0=roadmapPoints(mobile)[0],pw=mobile?360:600,ph=mobile?450:480;
 const milestone={x:a.plan.x+p0.x-pw/2,y:a.plan.y+p0.y-ph/2};
 const activity={x:a.activities.x+(mobile?144:217),y:a.activities.y+(mobile?-113:-117)};
 // Mobile has a shorter, flatter path and a portrait roadmap, rather than a scaled desktop camera.
 const keys=[
 [0,pose({x:a.assessment.x-200,y:a.assessment.y+55},.62)],
 [.55,pose(a.assessment,1)], [1.65,pose(a.assessment,1)],
 [1.94,pose(lerpPoint(a.assessment,a.plan,.35),.78,mobile?-1:-3,2)],
 [2.30,pose(a.plan,mobile?1:.94,mobile?0:-2,2)],
 [2.85,pose({x:a.plan.x,y:a.plan.y+18},1.02,mobile?0:1,1)],
 [3.22,pose(milestone,mobile?1.3:1.48,mobile?0:2)],
 [3.45,pose(lerpPoint(milestone,a.activities,.55),.84,mobile?0:1)],
 [3.72,pose(a.activities,1)], [4.42,pose(a.activities,1)],
 [4.72,pose(activity,mobile?1.25:1.5,mobile?0:-1)],
 [4.95,pose(lerpPoint(activity,a.focus,.7),.82,mobile?0:-2)],
 [5.13,pose(a.focus,1)], [5.73,pose(a.focus,1)],
 [6.20,pose({x:a.focus.x+(mobile?0:20),y:a.focus.y},1,mobile?0:1)],
 [6.44,pose({x:a.focus.x+(mobile?155:240),y:a.focus.y-20},1.4,mobile?0:1)],
 [6.70,pose({x:a.garden.x,y:a.garden.y+15},mobile?1.35:1.75,mobile?0:-3)],
 [7.08,pose({x:a.garden.x,y:a.garden.y+30},mobile?1.2:1.35,mobile?-1:-5,3)],
 [7.55,pose({x:a.garden.x-18,y:a.garden.y+15},1.05,mobile?1:4,-3)],
 [8.15,pose(a.garden,1,mobile?0:1,1)],
 [8.43,pose({x:0,y:a.garden.y+60},.76,mobile?0:2,2)],
 [8.88,pose({x:0,y:a.garden.y+80},mobile?.34:.43,mobile?0:1,1)],
 [9.23,pose({x:60,y:a.garden.y+80},mobile?.145:.21)],
 [END,pose({x:60,y:a.garden.y+80},mobile?.145:.21)],
 ];
 let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;
 const [start,from]=keys[i],[end,to]=keys[i+1],p=ease(start,end,t);
 return Object.fromEntries(Object.keys(from).map(k=>[k,mix(from[k],to[k],p)]));
}
export function panelScale(name,t){
 const windows={assessment:[0,.55,1.80,2.25],plan:[1.85,2.28,3.25,3.72],activities:[3.26,3.72,4.68,5.14],focus:[4.70,5.12,6.38,6.82],garden:[6.38,6.86,99,100]};
 const [enter,arrived,exit,gone]=windows[name];
 return mix(.025,1,ease(enter,arrived,t)) * mix(1,.025,ease(exit,gone,t));
}
export function copyFrame(index,t){
 const c=CHAPTERS[index],reveal=ease(c.start,c.start+(index===0?.50:.22),t),leave=ease(c.end-.13,c.end,t);
 return {opacity:reveal*(1-leave),y:(1-reveal)*25-leave*20,clip:(1-reveal)*100};
}
export const chartValues=[15,25,30,20,35];
export const chartPoints=chartValues.map((value,i)=>({x:60+i*120,y:324-value/40*148}));
export function cubic(a,b,c,d,p){const q=1-p;return{x:q*q*q*a.x+3*q*q*p*b.x+3*q*p*p*c.x+p*p*p*d.x,y:q*q*q*a.y+3*q*q*p*b.y+3*q*p*p*c.y+p*p*p*d.y}}
export function chartSample(p){
 const n=chartPoints.length-1,u=clamp(p)*n,i=Math.min(n-1,Math.floor(u)),f=u-i;
 const a=chartPoints[i],d=chartPoints[i+1],before=chartPoints[Math.max(0,i-1)],after=chartPoints[Math.min(n,i+2)];
 return cubic(a,{x:a.x+(d.x-before.x)/6,y:a.y+(d.y-before.y)/6},{x:d.x-(after.x-a.x)/6,y:d.y-(after.y-a.y)/6},d,f);
}
export function focusStroke(morph){
 // Unwrap an open circular arc before introducing the chart's waves. A direct
 // circle-to-graph coordinate lerp forms a knot halfway through the transition.
 const unroll=ease(0,.72,morph),span=Math.max(.0001,(1-unroll)*Math.PI*2);
 const radius=mix(Math.PI*270,480,unroll)/span,baseline=mix(350,260,unroll),graph=ease(.52,1,morph);
 const points=Array.from({length:97},(_,i)=>{const p=i/96,angle=(p-.5)*span,arc={x:300+Math.sin(angle)*radius,y:baseline+(Math.cos(angle)-1)*radius};return lerpPoint(arc,chartSample(p),graph)});
 return points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}
export function communityLayout(mobile=false){
 // A fixed lattice: variants, emergence order and links are all reproducible in either scroll direction.
 const plots=[];for(let row=-2;row<=2;row++)for(let col=-3;col<=3;col++){
  if(row===0&&col===0)continue;
  const distance=Math.abs(row)+Math.abs(col);
  const spacing=mobile?340:470;
  plots.push({id:`garden-${row+2}-${col+3}`,row,col,x:col*spacing+(Math.abs(row)%2)*spacing/2,y:row*310,variant:(row+col+10)%3,distance});
 }
 return plots.sort((a,b)=>a.distance-b.distance||a.row-b.row||a.col-b.col);
}
