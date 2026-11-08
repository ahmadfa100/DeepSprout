import {clamp,mix,smooth} from './story-math.js';
import * as ART from './dawn-art.js';

// The opening, as one function of story progress p (0–1, from scroll). Scroll picks every
// position, so scrubbing back replays the story in reverse; the clock only adds small idle
// life (breathing, grass, drifting clouds) whose strength the scroll also sets.
//
//   calm .00  ·  first reel .12  ·  losing the moment .28  ·  storm .48  ·  fade .68  ·  thread .86
export const SCENES=[
 {name:'calm',from:0,key:.03},{name:'first-reel',from:.12,key:.215},{name:'losing',from:.28,key:.43},
 {name:'storm',from:.48,key:.62},{name:'fade',from:.68,key:.80},{name:'thread',from:.86,key:1}];
export const sceneAt=p=>SCENES.reduce((s,scene)=>p>=scene.from?scene:s,SCENES[0]);
// The thread's last frame: the vertical line section 3 draws for the user (centre, 22% of the stage).
export const THREAD={length:.22,width:1.6,alpha:.85,color:[250,248,243]};
export const POINTS=12;

const RAD=Math.PI/180,REELS=26,{HIP,HEAD,NECK,HEAD_R}=ART;
const ease=t=>1-Math.pow(1-clamp(t),3);
const lerp3=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];
const rgb=c=>`rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
const rot=(x,y,a)=>{const c=Math.cos(a),s=Math.sin(a);return[x*c-y*s,x*s+y*c]};

// Cumulative orbit angle: the current gathers speed through the storm, then everything slows.
// 1.45 turns by the end of the fade: enough to read as a storm, slow enough that each card can be
// followed by eye at normal scrolling speed. The speed curve rises and falls without corners.
const OMEGA=(()=>{const n=1000,out=new Float32Array(n+1);let acc=0;
 for(let i=0;i<=n;i++){const p=i/n,v=smooth(.46,.62,p)+.55*smooth(.58,.74,p),slow=1-.97*smooth(.74,.90,p);acc+=v*slow/n;out[i]=acc}
 const k=1.45*Math.PI*2/out[860];for(let i=0;i<=n;i++)out[i]*=k;return out})();
const omega=p=>{const x=clamp(p)*1000,i=Math.min(999,Math.floor(x));return mix(OMEGA[i],OMEGA[i+1],x-i)};

// Ten reels arrive one at a time and wait near the character; sixteen more arrive with the storm.
// [angle°, distance] from the head: they settle around the person, then spill out over the landscape, clear of the captions.
const PARK=[[-40,230],[-5,300],[-78,300],[20,300],[-112,290],[-20,450],[-6,600],[-6,750],[8,520],[-150,300]];
const HEAD0={x:HIP.x+HEAD.x,y:HIP.y+HEAD.y};
const REEL=Array.from({length:REELS},(_,i)=>{
 const park=i<10,enter=i===0?.13:i===1?.205:park?.30+(i-2)*.02:.49+(i-10)*.0105;
 const r={i,park,enter,size:i<2?1.02:park?.8:.5+((i*37)%10)/10*.26,fade:.775+((i*5)%9)*.009,trace:[2,8,14,19,23].includes(i),spin:((i*47)%30)-15};
 if(park){const [a,d]=PARK[i];r.P={x:HEAD0.x+Math.cos(a*RAD)*d,y:HEAD0.y+Math.sin(a*RAD)*d};
  r.S={x:i===4||i===9?r.P.x-260:1780,y:i===4||i===9?-260:r.P.y-220+((i*61)%300)};
  const mx=(r.S.x+r.P.x)/2,my=(r.S.y+r.P.y)/2,dx=r.P.x-r.S.x,dy=r.P.y-r.S.y,len=Math.hypot(dx,dy)||1;
  r.K={x:mx-dy/len*160,y:my+dx/len*160};r.tilt=-9+((i*29)%18);r.join=.485+i*.009;
  // A waiting reel joins the current where it already is: its orbit angle starts at its own resting
  // place and only drifts toward an even spacing as the storm turns, so nothing lunges across.
  r.R=300+(i%4)*70;const [qx,qy]=rot(r.P.x-HEAD0.x-20,r.P.y-HEAD0.y-44,10*RAD);
  r.thetaJ=Math.atan2(qy/(r.R*.31),qx/r.R);r.spread=Math.atan2(Math.sin(i*.628+.4-r.thetaJ),Math.cos(i*.628+.4-r.thetaJ))*.7}
 else{r.R=270+((i*53)%6)*58;r.theta0=i*2.399}
 r.spd=1.3-(r.R-270)/290*.55;return r});

// Attention threads: first to things that matter, then each one hooked away by a reel.
const THREADS=[
 {anchor:0,reel:2,born:.285,hook:.345},{anchor:1,reel:4,born:.297,hook:.38},{anchor:2,reel:6,born:.309,hook:.41},{anchor:3,reel:8,born:.321,hook:.44},
 ...[10,13,16,19,22].map(reel=>({anchor:-1,reel,born:REEL[reel].enter+.012,hook:0}))];

export function createDawn(root,{reduced}){
 const $=s=>root.querySelector(s),isReduced=()=>Boolean(reduced?.matches);
 const sky=$('.dawn-sky'),stageA=$('.dawn-stage-a'),stageB=$('.dawn-stage-b'),canvas=$('.dawn-threads'),ctx2d=canvas.getContext('2d');
 // Threads are stroked on this 2D context, or on a stand-in given by the one-canvas renderer (dawn-gl.js).
 let ctx=ctx2d;
 stageA.innerHTML=ART.glow+ART.sun+ART.CLOUDS.map((_,i)=>ART.cloud(i)).join('')+ART.birds+ART.land+ART.tree+'<div class="dawn-reels dawn-reels-back"></div>'+ART.character+ART.butterfly+ART.foreground+`<div class="dawn-leaves">${Array.from({length:8},()=>ART.leaf).join('')}</div>`;
 // Night falls as one screen-sized veil just above the world (and the back reels), below the threads and front reels.
 stageA.insertAdjacentHTML('afterend','<div class="dawn-night" aria-hidden="true"></div>');
 // Pieces that move every frame get their own layers, so the GPU moves a finished picture instead of
 // repainting a whole scene: the sun's rays, the tree's crown, and each tuft and flower. Same artwork,
 // same stacking order; only where it is drawn changes.
 const layerSvg=(cls,box,extra='')=>`<svg class="${cls}" viewBox="${box}" aria-hidden="true" focusable="false" overflow="visible" ${extra}></svg>`;
 const sunSvg=$('.dawn-sun'),treeSvg=$('.dawn-tree'),foreSvg=$('.dawn-fore');
 sunSvg.insertAdjacentHTML('beforebegin',layerSvg('dawn-rays-layer',`0 0 ${ART.W} ${ART.H}`));$('.dawn-rays-layer').append($('.dawn-sun-rays'));
 treeSvg.insertAdjacentHTML('afterend',layerSvg('dawn-crown-layer',`0 0 ${ART.W} ${ART.H}`));$('.dawn-crown-layer').append($('.dawn-crown'));
 let sprigAt=foreSvg;
 const sprig=(g,box,left,top,origin)=>{sprigAt.insertAdjacentHTML('afterend',layerSvg('dawn-sprig',box,`style="left:${left}px;top:${top}px;width:${box.split(' ')[2]}px;height:${box.split(' ')[3]}px;transform-origin:${origin}"`));const svg=sprigAt.nextElementSibling;g.removeAttribute('transform');svg.append(g);sprigAt=svg;return svg};
 const at=g=>g.getAttribute('transform').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/).slice(1).map(Number);
 const sprigs={tufts:[...stageA.querySelectorAll('.dawn-tuft')].map(g=>{const [x,y]=at(g);return sprig(g,'-30 -50 64 56',x-30,y-50,'30px 50px')}),
  flowers:[...stageA.querySelectorAll('.dawn-flower')].map(g=>{const [x,y]=at(g);return sprig(g,'-40 -60 84 104',x-40,y-60,'40px 94px')})};
 stageB.innerHTML='<div class="dawn-reels dawn-reels-front"></div>';
 $('.dawn-grain').style.backgroundImage=`url(${ART.grainTile()})`;
 const back=$('.dawn-reels-back'),front=$('.dawn-reels-front');
 // Write-if-changed DOM helpers: unchanged values (paused, settled or idle frames) cost nothing.
 const A=(node,name,value)=>{const c=node.__attrs||(node.__attrs={});if(c[name]!==value){c[name]=value;node.setAttribute(name,value)}};
 const styler=node=>new Proxy({},{set(_,prop,value){const c=node.__css||(node.__css={});if(c[prop]!==value){c[prop]=value;node.style[prop]=value}return true}});
 front.innerHTML=REEL.map(r=>ART.reel(r.i)).join('');
 const reels=[...front.children].map((node,i)=>({node,glow:node.firstElementChild,layer:front,shown:null}));
 for(const node of [root,...root.querySelectorAll('*')])node._st=styler(node);
 const el={night:$('.dawn-night'),glow:$('.dawn-glow'),sun:$('.dawn-sun'),rays:$('.dawn-rays-layer'),clouds:[...root.querySelectorAll('.dawn-cloud')],birds:$('.dawn-birds'),land:$('.dawn-land'),tree:$('.dawn-tree'),crown:$('.dawn-crown-layer'),
  character:$('.dawn-character'),body:$('.dawn-body'),torso:$('.dawn-torso'),upper:$('.dawn-upper'),head:$('.dawn-head'),legs:$('.dawn-legs'),pack:$('.dawn-pack'),notice:$('.dawn-notice'),
  legO:$('.dawn-leg-o'),legF:$('.dawn-leg-f'),shoe:$('.dawn-shoe'),armNO:$('.dawn-arm-near-o'),armNF:$('.dawn-arm-near-f'),handN:$('.dawn-hand-near'),armFO:$('.dawn-arm-far-o'),armFF:$('.dawn-arm-far-f'),handF:$('.dawn-hand-far'),
  armFar:$('.dawn-arm-far'),fore:$('.dawn-fore'),tufts:sprigs.tufts,flowers:sprigs.flowers,butterfly:$('.dawn-butterfly'),wings:$('.dawn-wings'),leaves:[...root.querySelectorAll('.dawn-leaf')]};
 let W=1,H=1,dpr=1,s=1,O={x:0,y:0},mobile=false,cloudX=ART.CLOUDS.map(c=>c.x),introAt=performance.now(),lastP=-1,thread=null;
 const cam={F:{x:HEAD0.x,y:HEAD0.y},S:{x:0,y:0},k:1,r:0};

 function resize(){
  const rect=root.getBoundingClientRect();W=Math.max(1,rect.width);H=Math.max(1,rect.height);mobile=W/H<1;
  if(mobile){s=Math.max(W/860,H*.58/900);O={x:-70*s,y:H-900*s}}
  else{s=Math.max(W/1600,H/900);O={x:(W-1600*s)*.18,y:H-900*s}}
  dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);lastP=-1;
 }
 // Design space → screen, through the stage scale and the camera.
 const toScreen=(x,y)=>{const [a,b]=rot((x-cam.F.x)*s*cam.k,(y-cam.F.y)*s*cam.k,cam.r);return[cam.S.x+a,cam.S.y+b]};

 function camera(p,t,w,still){
  const a=smooth(.44,.72,p),home={x:O.x+s*HEAD0.x,y:O.y+s*HEAD0.y},goal={x:W*.5,y:H*(mobile?.55:.5)};
  cam.S={x:mix(home.x,goal.x,a*(mobile?.85:.48)),y:mix(home.y,goal.y,a*.5)};
  cam.k=1+.14*smooth(.40,.68,p)+.08*smooth(.68,.86,p);
  cam.r=(-1.6*smooth(.5,.7,p)+(still?0:Math.sin(t*.7)*1.1*w*(1-smooth(.74,.84,p))))*RAD;
  const css=`translate(${cam.S.x.toFixed(2)}px,${cam.S.y.toFixed(2)}px) rotate(${(cam.r/RAD).toFixed(3)}deg) scale(${(s*cam.k).toFixed(5)}) translate(${-cam.F.x}px,${-cam.F.y}px)`;
  stageA._st.transform=css;stageB._st.transform=css;
 }

 // The character's pose, posed from scroll with breath and wind on top.
 function pose(p,t,w,still,intro){
  const notice=smooth(.13,.19,p),drawn=smooth(.19,.30,p),lost=smooth(.30,.48,p),storm=smooth(.50,.68,p),curl=smooth(.68,.82,p);
  const sway=still?0:Math.sin(t*1.3)*w*4*(1-curl);
  const lean=-5+5*notice+9*drawn+8*lost+6*storm+12*curl+sway;
  const lift=-46*storm-22*curl,dx=10*storm;
  const headTilt=-8+(-10*notice)+16*drawn+10*lost+(still?0:Math.sin(t*2.1)*3*w)+14*curl;
  const breath=still?1:1+.014*Math.sin(t*1.45)*(1-w*.7);
  const torso=`translate(${dx} ${lift}) rotate(${lean.toFixed(2)}) scale(1 ${breath.toFixed(4)})`;
  A(el.body,'transform',torso);A(el.upper,'transform',torso);
  A(el.head,'transform',`rotate(${headTilt.toFixed(2)} ${NECK.x} ${NECK.y}) translate(0 ${(-3*notice+4*lost).toFixed(2)})`);
  // Arms: around the knees at rest, loosening as the reels arrive, reaching out in the storm.
  const arm=(sx,sy,a1,a2,o,f,h)=>{const ex=sx+Math.cos(a1*RAD)*58,ey=sy+Math.sin(a1*RAD)*58,hx=ex+Math.cos(a2*RAD)*52,hy=ey+Math.sin(a2*RAD)*52,d=`M${sx} ${sy}L${ex.toFixed(1)} ${ey.toFixed(1)}L${hx.toFixed(1)} ${hy.toFixed(1)}`;A(o,'d',d);A(f,'d',d);A(h,'cx',hx.toFixed(1));A(h,'cy',hy.toFixed(1))};
  const reach=storm*(1-curl);
  arm(34,-112,mix(mix(63,40,drawn),-18,reach)+30*curl,mix(mix(-29,-48,drawn),-34,reach)+60*curl,el.armNO,el.armNF,el.handN);
  arm(4,-114,mix(70,8,reach)+40*curl,mix(-20,-55,reach)+70*curl,el.armFO,el.armFF,el.handF);
  // Legs: knees up on the rock; they lose the ground as the body lifts.
  const t1=mix(-42,-14,storm)+20*curl,t2=mix(72,96,storm)-30*curl,kx=18+Math.cos(t1*RAD)*104,ky=-6+Math.sin(t1*RAD)*104,ax=kx+Math.cos(t2*RAD)*96,ay=ky+Math.sin(t2*RAD)*96;
  const legs=`M18 -6L${kx.toFixed(1)} ${ky.toFixed(1)}L${ax.toFixed(1)} ${ay.toFixed(1)}`;A(el.legO,'d',legs);A(el.legF,'d',legs);
  A(el.shoe,'transform',`translate(${(ax+10).toFixed(1)} ${(ay+6).toFixed(1)}) rotate(${(t2-80).toFixed(1)})`);
  A(el.legs,'transform',`translate(${dx} ${lift}) rotate(${(lean*.25).toFixed(2)} 18 -6)`);
  A(el.pack,'transform',`translate(${(w*8*storm).toFixed(1)} 0) rotate(${(-w*6*storm+(still?0:Math.sin(t*2)*w*2)).toFixed(2)} -140 64)`);
  const n=notice*(1-smooth(.24,.28,p));A(el.notice,'transform',`translate(${HEAD.x+56} ${HEAD.y-30}) scale(${(.6+.4*ease(notice*2)).toFixed(3)})`);el.notice._st.opacity=n.toFixed(3);
  el.character._st.opacity=(intro*(1-smooth(.76,.86,p))).toFixed(3);
  // Where the head is now, in design space (for threads and the orbit centre).
  const [hx,hy]=rot(HEAD.x-NECK.x,HEAD.y-NECK.y,headTilt*RAD),[nx,ny]=rot(NECK.x+hx,NECK.y+hy,lean*RAD);
  return{x:HIP.x+dx+nx,y:HIP.y+lift+ny};
 }

 function world(p,t,dt,w,still,intro,rise){
  // Sky: warm ivory, greying through the storm. Night falls over the whole world from above it
  // (one dark veil, so colours dim together instead of turning translucent) to the exact void
  // section 3 begins from. Back reels sit under the veil; threads and front reels stay lit.
  const c1=[251,246,234],c2=[228,225,216],c4=[5,4,10];
  sky._st.backgroundColor=rgb(p<.62?lerp3(c1,c2,smooth(.28,.62,p)):lerp3(c2,c4,smooth(.62,.86,p)));
  el.night._st.opacity=Math.pow(smooth(.56,.86,p),1.25).toFixed(3);
  const sunY=118*(1-rise)+230*smooth(.30,.80,p);
  const sunOpacity=intro*(1-smooth(.62,.78,p));
  el.sun._st.transform=`translate3d(0,${sunY.toFixed(1)}px,0)`;el.sun._st.opacity=sunOpacity.toFixed(3);
  el.rays._st.transform=`translate3d(0,${sunY.toFixed(1)}px,0) rotate(${still?0:(t*2.2%360).toFixed(2)}deg)`;el.rays._st.opacity=(sunOpacity*(1-smooth(.28,.46,p))).toFixed(3);
  el.glow._st.transform=`translate3d(0,${sunY.toFixed(1)}px,0)`;el.glow._st.opacity=(rise*(1-smooth(.34,.74,p))*(still?1:.9+.1*Math.sin(t*.6))).toFixed(3);
  const fadeLand=1-.12*smooth(.50,.70,p);
  el.land._st.opacity=(intro*fadeLand).toFixed(3);el.land._st.transform=`translate3d(${(-16*smooth(.3,.7,p)).toFixed(1)}px,${(14*(1-intro)).toFixed(1)}px,0)`;
  el.tree._st.opacity=(intro*fadeLand).toFixed(3);el.crown._st.opacity=(intro*fadeLand).toFixed(3);
  el.crown._st.transform=`rotate(${(w*3.5+(still?0:Math.sin(t*.8)*(.35+2.6*w))).toFixed(3)}deg)`;
  el.fore._st.opacity=intro.toFixed(3);
  // Clouds drift, faster as the wind rises. Their phase accumulates, so a direction change never jumps.
  el.clouds.forEach((node,i)=>{if(!still)cloudX[i]+=dt*(4+90*w)*(1+i*.35);if(cloudX[i]>1900)cloudX[i]-=2300;const c=ART.CLOUDS[i];
   node._st.transform=`translate3d(${(cloudX[i]-150).toFixed(1)}px,${(c.y-90+(still?0:Math.sin(t*.3+i)*4)).toFixed(1)}px,0)`;node._st.opacity=(intro*(1-smooth(.62,.78,p))).toFixed(3)});
  const bird=1-smooth(.26,.40,p);el.birds._st.opacity=(intro*bird).toFixed(3);el.birds._st.transform=`translate3d(${(880+(still?0:(t*9)%260)+300*smooth(.3,.42,p)).toFixed(1)}px,${(470+(still?0:Math.sin(t*.9)*6)-120*smooth(.3,.42,p)).toFixed(1)}px,0)`;
  // Grass and flowers sway; the wind bends them all one way as the storm builds.
  const amp=3+16*w,freq=1+2.4*w,lean=w*16;
  el.tufts.forEach((g,i)=>{g._st.transform=`rotate(${(lean+(still?0:Math.sin(t*freq+i*1.7)*amp)).toFixed(2)}deg)`});
  el.flowers.forEach((g,i)=>{g._st.transform=`rotate(${(lean*.8+(still?0:Math.sin(t*freq*.8+i*2.3)*amp*.6)).toFixed(2)}deg)`});
  // A butterfly, until the first gusts carry it off.
  const gone=smooth(.34,.50,p),bx=600+(still?0:Math.sin(t*.5)*70)+900*gone,by=740+(still?0:Math.sin(t*.9)*26)-260*gone;
  el.butterfly._st.transform=`translate3d(${(bx-30).toFixed(1)}px,${(by-24).toFixed(1)}px,0) rotate(${(gone*40).toFixed(1)}deg)`;el.butterfly._st.opacity=(intro*(1-smooth(.42,.50,p))).toFixed(3);
  A(el.wings,'transform',`scale(${still?1:(.35+.65*Math.abs(Math.sin(t*9))).toFixed(3)} 1)`);
  // Leaves torn from the crown cross the storm.
  const gust=smooth(.44,.56,p)*(1-smooth(.72,.80,p));
  el.leaves.forEach((node,i)=>{if(gust<=.001){node._st.opacity='0';return}const u=((still?0:t*.16)+i/8)%1,x=120+u*1800,y=140+i*38+Math.sin(u*9+i)*70+u*260;
   node._st.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(u*900+i*40).toFixed(1)}deg) scale(${(.9+i%3*.25).toFixed(2)})`;node._st.opacity=(gust*Math.sin(u*Math.PI)).toFixed(3)});
 }

 // One reel's position in design space, and how it should face, for this progress.
 function reelPose(r,p,t,still,center){
  if(p<r.enter)return null;
  const ellipse=mix(.3,.42,smooth(.50,.72,p)),tilt=mix(-10,-4,smooth(.55,.80,p))*RAD,tight=1-.14*smooth(.68,.80,p)+(r.trace?.8*smooth(.80,.92,p):0);
  const orbit=(theta,R)=>{const lx=R*Math.cos(theta),ly=R*ellipse*Math.sin(theta),[x,y]=rot(lx,ly,tilt);return[center.x+x,center.y+y,Math.sin(theta)]};
  let x,y,depth=1,ry=0,rz,sc=r.size,op;
  if(r.park){
   const u=ease((p-r.enter)/.07),q=1-u;
   x=q*q*r.S.x+2*q*u*r.K.x+u*u*r.P.x;y=q*q*r.S.y+2*q*u*r.K.y+u*u*r.P.y+(still?0:Math.sin(t*1.1+r.i)*5*u);
   rz=mix(r.spin*2,r.tilt+(still?0:Math.sin(t*.9+r.i)*2),u);op=smooth(r.enter,r.enter+.015,p);
   const j=smooth(r.join,r.join+.1,p);
   if(j>0){const theta=r.thetaJ+(omega(p)-omega(r.join))*r.spd+r.spread*smooth(r.join,r.join+.2,p),[ox,oy,d]=orbit(theta,r.R*tight);x=mix(x,ox,j);y=mix(y,oy,j);depth=mix(1,d,j);ry=Math.cos(theta)*46*j;rz=mix(rz,-6+Math.sin(theta)*12,j);sc*=mix(1,.8*(.86+.2*d),j)}
  }else{
   const u=smooth(r.enter,r.enter+.08,p),theta=r.theta0+omega(p)*r.spd-1.3*(1-u),[ox,oy,d]=orbit(theta,r.R*tight*(1+1.4*(1-u)));
   x=ox;y=oy;depth=d;ry=Math.cos(theta)*46;rz=-6+Math.sin(theta)*12;sc*=.86+.2*d;op=u;
  }
  const f=smooth(r.fade,r.fade+.05,p);
  if(r.trace){sc*=mix(1,.34,f);op*=(1-.5*f)*(1-smooth(.88,.95,p))}else op*=1-f;
  return{x,y,depth,ry,rz,sc,op};
 }

 function paintReels(p,t,still,center,poses){
  const lit=smooth(.62,.80,p);
  for(let i=0;i<REELS;i++){
   const r=REEL[i],state=reels[i],q=poses[i];
   if(!q||q.op<.004){if(state.shown!==false){state.node._st.visibility='hidden';state.shown=false}continue}
   if(state.shown!==true){state.node._st.visibility='visible';state.shown=true}
   const layer=q.depth<-.05?back:front;if(state.layer!==layer){layer.append(state.node);state.layer=layer}
   state.node._st.zIndex=String(Math.round(q.depth*8)+20);
   state.node._st.transform=`translate3d(${(q.x-ART.REEL_W/2).toFixed(1)}px,${(q.y-ART.REEL_H/2).toFixed(1)}px,0) perspective(800px) rotateY(${q.ry.toFixed(1)}deg) rotate(${q.rz.toFixed(2)}deg) scale(${q.sc.toFixed(3)})`;
   state.node._st.opacity=q.op.toFixed(3);state.glow._st.opacity=(lit*(r.trace?1:.85)).toFixed(3);
  }
 }

 // Threads are drawn on the screen-space canvas as twelve points, smoothed exactly as section 3 strokes its lines.
 const pts=new Float32Array(POINTS*2);
 function curve(out,ax,ay,bx,by,cx,cy,from,to,wobble,phase,wave,waveT){
  const nx=-(by-ay),ny=bx-ax,len=Math.hypot(nx,ny)||1;
  for(let k=0;k<POINTS;k++){const u=mix(from,to,k/(POINTS-1)),q=1-u;let x=q*q*ax+2*q*u*cx+u*u*bx,y=q*q*ay+2*q*u*cy+u*u*by;
   const off=wobble*Math.sin(u*Math.PI*3+phase)*Math.sin(u*Math.PI)+wave*Math.sin(u*Math.PI*2.2-waveT)*Math.sin(u*Math.PI);
   out[k*2]=x+nx/len*off;out[k*2+1]=y+ny/len*off}
  return out;
 }
 const threadStyle=p=>({color:lerp3([146,100,38],THREAD.color,smooth(.62,.78,p)),glow:smooth(.70,.82,p)*(1-smooth(.90,.97,p)),width:mix(2.3,THREAD.width,smooth(.74,.97,p))});
 function headEnd(head,tx,ty){const [hx,hy]=toScreen(head.x,head.y),dx=tx-hx,dy=ty-hy,d=Math.hypot(dx,dy)||1,r=HEAD_R*s*cam.k;return[hx+dx/d*r,hy+dy/d*r]}

 function paintThreads(p,t,still,w,head,poses){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.lineCap='round';ctx.lineJoin='round';
  const style=threadStyle(p),reelAt=(i,pp)=>{const q=reelPose(REEL[i],pp,t,true,orbitCenter(head,pp));return q&&toScreen(q.x,q.y)};
  thread=null;
  THREADS.forEach((th,k)=>{
   if(p<th.born)return;
   const grow=smooth(th.born,th.born+.03,p),detach=k?smooth(.73+k*.008,.77+k*.008,p):0;
   if(detach>=1)return;
   const q=poses[th.reel];let target;
   const anchor=th.anchor>=0?toScreen(ART.ANCHORS[th.anchor].x,ART.ANCHORS[th.anchor].y):null;
   const hooked=th.anchor<0?1:smooth(th.hook,th.hook+.035,p);
   const onReel=q?toScreen(q.x,q.y):anchor;
   target=anchor&&onReel?[mix(anchor[0],onReel[0],hooked),mix(anchor[1],onReel[1],hooked)]:onReel||anchor;if(!target)return;
   let [ax,ay]=headEnd(head,target[0],target[1]),[bx,by]=target;
   // Drag: a thread trails behind the reel that pulls it. Gravity gives the calm ones a gentle sag.
   let lagx=0,lagy=0;if(q&&hooked>0){const prev=reelAt(th.reel,Math.max(0,p-.01));if(prev){lagx=clamp(-(bx-prev[0])*.9,-160,160)*hooked;lagy=clamp(-(by-prev[1])*.9,-160,160)*hooked}}
   const len=Math.hypot(bx-ax,by-ay),gust=still?0:Math.sin(t*3+k)*6*w;
   let cx=(ax+bx)/2+lagx,cy=(ay+by)/2+len*.08*(1-w)+lagy+gust;
   let alpha=.82*(th.anchor<0?smooth(th.born,th.born+.02,p):1)*(1-detach),wave=0,from=detach,to=grow;
   if(k===0&&p>=.76){
    // The thread that remains lets go of its reel, hangs where the person was, and becomes the line section 3 begins with.
    const free=smooth(.76,.84,p),hang=[ax+30*s,ay+170*s*cam.k];bx=mix(bx,hang[0],free);by=mix(by,hang[1],free);
    const m=smooth(.86,.97,p),top=[W*.5,H*(.5-THREAD.length/2)],bottom=[W*.5,H*(.5+THREAD.length/2)];
    ax=mix(ax,top[0],m);ay=mix(ay,top[1],m);bx=mix(bx,bottom[0],m);by=mix(by,bottom[1],m);
    cx=mix(mix(cx,(ax+bx)/2+40*s,free),(ax+bx)/2,m);cy=mix(mix(cy,(ay+by)/2,free),(ay+by)/2,m);
    wave=(still?0:14)*smooth(.76,.82,p)*(1-smooth(.88,.97,p));alpha=mix(.82,THREAD.alpha,m);
    thread={points:curve(new Float32Array(POINTS*2),ax,ay,bx,by,cx,cy,0,1,1.2*(1-m),k,wave,still?0:t*1.6),alpha,width:style.width,color:style.color,glow:style.glow,final:m>=1};
    // With reduced motion there is no overlap with section 3 and no bridge: the opening draws it.
    if(still)drawThread(ctx,thread.points,thread);
    return;
   }
   curve(pts,ax,ay,bx,by,cx,cy,from,to,1.2,k*1.7,0,0);
   drawThread(ctx,pts,{alpha,width:style.width,color:style.color,glow:style.glow});
  });
 }
 const orbitCenter=(head,p)=>({x:head.x+20,y:head.y+44+20*smooth(.5,.7,p)});

 function paint(p,t,dt,{intro=1,rise=1,force=false}={}){
  const still=isReduced();if(!force&&still&&p===lastP)return thread;lastP=p;
  const w=.12+.38*smooth(.28,.48,p)+.5*smooth(.48,.66,p)-.88*smooth(.80,.86,p);
  // The arrival fades the world in as one picture, so no layer shows through another.
  stageA._st.opacity=intro>=1?'':intro.toFixed(3);
  camera(p,t,w,still);world(p,t,dt,w,still,1,rise);
  const head=pose(p,t,w,still,1),center=orbitCenter(head,p),poses=REEL.map(r=>reelPose(r,p,t,still,center));
  paintReels(p,t,still,center,poses);paintThreads(p,t,still,w,head,poses);
  root.dataset.scene=sceneAt(p).name;
  return thread;
 }
 resize();
 return{resize,paint,threadContext(c){ctx=c||ctx2d;lastP=-1},get thread(){return thread},toScreen,state:()=>({W,H,s,cam:{...cam},mobile,introAt})};
}

// Shared by the scene and the bridge, so the thread looks the same on either canvas.
export function drawThread(ctx,points,{alpha,width,color,glow=0}){
 const stroke=()=>{ctx.beginPath();ctx.moveTo(points[0],points[1]);for(let k=1;k<POINTS-1;k++)ctx.quadraticCurveTo(points[k*2],points[k*2+1],(points[k*2]+points[k*2+2])/2,(points[k*2+1]+points[k*2+3])/2);ctx.lineTo(points[POINTS*2-2],points[POINTS*2-1]);ctx.stroke()};
 ctx.strokeStyle=rgb(color);
 if(glow>.003){ctx.globalAlpha=alpha*.16*glow;ctx.lineWidth=width*5;stroke();ctx.globalAlpha=alpha*.3*glow;ctx.lineWidth=width*2.4;stroke()}
 ctx.globalAlpha=alpha;ctx.lineWidth=width;stroke();ctx.globalAlpha=1;
}
