import {clamp,mix,smooth} from '../reels/story-math.js';

// Section 3: one field of lines, each line one person's feed. Every scene is a
// state of the same arrays; scroll progress picks the state, so scrubbing back
// replays it in reverse. Only the feed jitter and the flies run on the clock.

export const SCENES=[
 {name:'void',from:0,to:.06,key:.03},
 {name:'line',from:.06,to:.14,key:.13},
 {name:'alone',from:.14,to:.30,key:.285},
 {name:'scale',from:.30,to:.40,key:.39},
 {name:'trend',from:.40,to:.48,key:.46},
 {name:'rot',from:.48,to:.70,key:.69},
 {name:'research',from:.70,to:.82,key:.79},
 {name:'turn',from:.82,to:1,key:1},
];
export function sceneAt(p){let scene=SCENES[0];for(let i=1;i<SCENES.length;i++)if(p>=SCENES[i].from)scene=SCENES[i];return scene}
// Copy fades, as [in-start, in-end, out-start, out-end] in scene progress. Module constants: nothing is built per frame.
const COPY_WINDOWS={alone:[.17,.20,.29,.30],scale:[.31,.33,.465,.48],rot:[.62,.65,.69,.705],research:[.72,.74,.80,.82],turn:[.93,.96,2,3]};
const STEP_WINDOWS={tiktok:[.32,.335,.395,.405],online:[.405,.42,2,3]};
const COPY_OWNER={void:'',line:'',alone:'alone',scale:'scale',trend:'scale',rot:'rot',research:'research',turn:'turn'};
const fadeIn=(w,p)=>smooth(w[0],w[1],p)*(1-smooth(w[2],w[3],p));
const OPACITY=Array.from({length:101},(_,i)=>String(i/100));
export const ROW=100,POINTS=12;
// The turn ends on one horizontal line of this length, centred; section 4 starts from it.
export const handoffLength=width=>Math.min(width*.56,760);
const MAX_LINES=280,MOBILE_LINES=120,SPOTS=72,FLIES=3,BINS=72;
const CREAM=[250,248,243],INK=[41,45,42],SAGE=[130,171,128],VOID=[5,4,10],DARK=[14,23,19];
const ROT='#6B7260',FLY='#292d2a',SHADES=16;
// Every lit row line is one of these slots; the user's own line (slot 51) never lights.
const USER_SLOT=51;
const litOrder=(()=>{
 const order=[];for(let i=0;i<ROW;i+=5)order.push(i);
 const spread=k=>[...Array(10).keys()].map(j=>k+j*10);
 for(const j of [0,5,2,7,4,9,1,6,3,8])order.push(spread(2)[j],spread(7)[j]);
 return order.slice(0,40);
})();

const rgb=(a,b,t)=>`rgb(${Math.round(mix(a[0],b[0],t))},${Math.round(mix(a[1],b[1],t))},${Math.round(mix(a[2],b[2],t))})`;
// Small deterministic generator: the field looks the same on every visit.
function generator(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}

// The lines themselves: one deterministic set, generated once. Section 3 draws them; station 6
// in section 4 lays the same lines out again, horizontal, carrying these lengths, alphas and order.
export const LINES=(()=>{
 const random=generator(1854),n=MAX_LINES,d={hx:new Float32Array(n),hy:new Float32Array(n),len:new Float32Array(n),alpha:new Float32Array(n),speed:new Float32Array(n),phase:new Float32Array(n),stagger:new Float32Array(n),knot:new Float32Array(n*8),kickAt:new Float32Array(n)};
 for(let i=0;i<n;i++){
  // Jittered grid so the full field reads as evenly crowded, not clumped.
  const cols=20,rows=14,c=i%cols,r=Math.floor(i/cols)%rows;
  d.hx[i]=(c+.15+random()*.7)/cols;d.hy[i]=(r+.15+random()*.7)/rows;
  d.len[i]=.06+random()*.14;d.alpha[i]=.10+random()*.12;d.speed[i]=.6+random()*.9;d.phase[i]=random()*Math.PI*2;d.stagger[i]=random();
  for(let k=0;k<4;k++){d.knot[i*8+k]=.35+random()*1.05;d.knot[i*8+4+k]=random()*Math.PI*2}
  d.kickAt[i]=random()*1.2;
 }
 d.hx[0]=.5;d.hy[0]=.5;d.len[0]=.22;d.alpha[0]=.85;
 return d;
})();
export const lineCount=mobile=>mobile?MOBILE_LINES:MAX_LINES;

export function litCount(p){
 if(p<.40)return 20*smooth(.33,.39,p);
 return mix(20,24,smooth(.40,.41,p))+16*smooth(.41,.455,p);
}
export const yearAt=p=>Math.round(mix(2015,2025,smooth(.41,.455,p)));

export function createField(section,reducedQuery){
 const stage=section.querySelector('.lines-stage'),canvas=section.querySelector('.lines-canvas'),ctx=canvas.getContext('2d');
 // Copy blocks fade by opacity only, so every statement stays in the accessibility tree.
 const blocks=[...section.querySelectorAll('[data-lines-scene]')].map(node=>({node,name:node.dataset.linesScene,window:COPY_WINDOWS[node.dataset.linesScene],shown:-1}));
 const steps=[...section.querySelectorAll('[data-lines-step]')].map(node=>({node,name:node.dataset.linesStep,window:STEP_WINDOWS[node.dataset.linesStep],shown:-1}));
 const counter=section.querySelector('[data-lines-count]'),year=section.querySelector('[data-lines-year]');
 const isReduced=()=>Boolean(reducedQuery?.matches);
 // Struct-of-arrays. Allocated once, at the largest size; never resized or recreated.
 // Positions and the jitter clock are this field's own; lengths, alphas and order are the shared lines.
 const {len,alpha,speed,phase,stagger,knot}=LINES,hx=LINES.hx.slice(),hy=LINES.hy.slice(),kickAt=LINES.kickAt.slice();
 const appear=new Float32Array(MAX_LINES),slot=new Int16Array(MAX_LINES),litRank=new Int16Array(MAX_LINES);
 const jitterY=new Float32Array(MAX_LINES),jitterV=new Float32Array(MAX_LINES);
 const px=new Float32Array(POINTS),py=new Float32Array(POINTS);
 const spots=new Float32Array(SPOTS*4),flies=new Float32Array(FLIES*10),dense=new Uint8Array(BINS);
 const shades=Array.from({length:SHADES+1},(_,lit)=>Array.from({length:SHADES+1},(_,light)=>rgb(rgb3(CREAM,SAGE,lit/SHADES),INK,light/SHADES)));
 const backgrounds=Array.from({length:65},(_,i)=>i<=16?rgb(VOID,DARK,i/16):rgb(DARK,CREAM,(i-16)/48));
 function rgb3(a,b,t){return[mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)]}

 const mask=document.createElement('canvas'),maskCtx=mask.getContext('2d');
 let shownCount=-1,shownYear=-1,frames=0,sizeKey='',lastKey=-1,count=0,width=0,height=0,dpr=1,top=0,travel=1,target=0,progress=0,visible=false,dirty=true,clock=0,lastBackground='',destroyed=false;
 let loops=1,cx=0,cy=0,rx=0,ry=0,word={x0:0,y0:0,x1:0,y1:0},crossY=0,crossStop=0,spotCount=0,mobile=false;


 function assign(){
  // The first ROW lines become the Pew row. The user keeps slot 51, the rest fill in order.
  count=lineCount(mobile);
  for(let i=0,next=0;i<MAX_LINES;i++){
   if(i===0)slot[i]=USER_SLOT;else if(i<ROW){if(next===USER_SLOT)next++;slot[i]=next++}else slot[i]=-1;
   litRank[i]=slot[i]<0?-1:litOrder.indexOf(slot[i]);
  }
  // Appearance: the user's line, then 2, then 6, then waves outward from the centre.
  for(let i=1;i<count;i++){
   const d=Math.hypot(hx[i]-.5,(hy[i]-.5)*.8)/.64;
   appear[i]=i<=2?.15:i<=8?.175:.195+clamp(d)*.055+stagger[i]*.01;
  }
  // On mobile, the reduced field is the first 120 lines spread across the same viewport.
  if(mobile)for(let i=1;i<count;i++){const c=i%10,r=Math.floor(i/10)%12;hx[i]=(c+.2+stagger[i]*.6)/10;hy[i]=(r+.2+((i*.618)%1)*.6)/12}
  else for(let i=1;i<MAX_LINES;i++){const c=i%20,r=Math.floor(i/20)%14;hx[i]=(c+.15+stagger[i]*.7)/20;hy[i]=(r+.15+((i*.618)%1)*.7)/14}
 }

 function buildMask(){
  mask.width=canvas.width;mask.height=canvas.height;
  maskCtx.setTransform(dpr,0,0,dpr,0,0);maskCtx.clearRect(0,0,width,height);
  const lines=mobile?['brain','rot']:['brain rot'];
  let size=mobile?Math.min(width*.30,130):Math.min(width*.15,190);
  maskCtx.font=`800 ${size}px Inter, Arial, sans-serif`;
  const widest=Math.max(...lines.map(t=>maskCtx.measureText(t).width)),limit=width*(mobile?.74:.62);
  if(widest>limit){size*=limit/widest;maskCtx.font=`800 ${size}px Inter, Arial, sans-serif`}
  maskCtx.textAlign='center';maskCtx.textBaseline='middle';maskCtx.fillStyle='#000';
  const lead=size*.92,first=cy-(lines.length-1)*lead/2;
  lines.forEach((t,i)=>maskCtx.fillText(t,cx,first+i*lead));
  const w=Math.max(...lines.map(t=>maskCtx.measureText(t).width));
  word={x0:cx-w/2,x1:cx+w/2,y0:first-size*.42,y1:first+(lines.length-1)*lead+size*.42,rows:lines.map((_,i)=>first+i*lead),size};
  // Edges, sampled once. They carry the bites, the rot spots and the flies' range.
  const image=maskCtx.getImageData(0,0,mask.width,mask.height).data,step=Math.max(2,Math.round(2*dpr)),edges=[];
  const at=(x,y)=>x<0||y<0||x>=mask.width||y>=mask.height?0:image[(y*mask.width+x)*4+3];
  for(let y=step;y<mask.height-step;y+=step)for(let x=step;x<mask.width-step;x+=step){
   if(at(x,y)<128)continue;
   if(at(x+step,y)<128||at(x-step,y)<128||at(x,y+step)<128||at(x,y-step)<128)edges.push(x/dpr,y/dpr);
  }
  const edgeCount=edges.length/2,bite=generator(37);
  // The eaten edge: small irregular bites out of the glyph outline, then a few frayed specks.
  maskCtx.globalCompositeOperation='destination-out';
  for(let i=0;i<Math.min(170,edgeCount);i++){const e=Math.floor(bite()*edgeCount);maskCtx.beginPath();maskCtx.arc(edges[e*2]+(bite()-.5)*2,edges[e*2+1]+(bite()-.5)*2,.7+bite()*bite()*2.6,0,Math.PI*2);maskCtx.fill()}
  maskCtx.globalCompositeOperation='source-over';
  for(let i=0;i<Math.min(90,edgeCount);i++){const e=Math.floor(bite()*edgeCount);maskCtx.beginPath();maskCtx.arc(edges[e*2]+(bite()-.5)*5,edges[e*2+1]+(bite()-.5)*5,.5+bite()*1.1,0,Math.PI*2);maskCtx.fill()}
  spotCount=Math.min(SPOTS,edgeCount);
  for(let i=0;i<spotCount;i++){const e=Math.floor((i+bite()*.8)*edgeCount/spotCount);spots[i*4]=edges[e*2];spots[i*4+1]=edges[e*2+1];spots[i*4+2]=1.1+bite()*bite()*2.2;spots[i*4+3]=bite()}
 }

 function tanglePoint(i,u,time,out){
  // Two summed sines per axis: long looping strokes that knot inside the region.
  const o=i*8,drift=time*.035*speed[i];u*=loops;
  const x=cx+rx*(.62*Math.sin(Math.PI*2*knot[o]*u+knot[o+4]+drift)+.38*Math.sin(Math.PI*2*knot[o+1]*u+knot[o+5]-drift*.7));
  const y=cy+ry*(.62*Math.sin(Math.PI*2*knot[o+2]*u+knot[o+6]-drift*.8)+.38*Math.cos(Math.PI*2*knot[o+3]*u+knot[o+7]+drift));
  out[0]=x;out[1]=y;
 }
 const tmp=new Float32Array(2);

 function buildDensity(){
  // Where the crossing line meets dense knotting it breaks; measured from the resting tangle.
  const counts=new Float32Array(BINS);
  for(let i=0;i<count;i++){
   tanglePoint(i,0,0,tmp);let ax=tmp[0],ay=tmp[1];
   for(let k=1;k<=40;k++){tanglePoint(i,k/40,0,tmp);const bx=tmp[0],by=tmp[1];
    if((ay-crossY)*(by-crossY)<=0&&ay!==by){const x=ax+(bx-ax)*(crossY-ay)/(by-ay),b=Math.floor(x/width*BINS);if(b>=0&&b<BINS)counts[b]++}
    ax=bx;ay=by}
  }
  const inside=[...counts].filter(c=>c>0).sort((a,b)=>a-b),threshold=inside[Math.floor(inside.length*.62)]??1;
  for(let b=0;b<BINS;b++)dense[b]=counts[b]>=threshold&&counts[b]>0?1:0;
 }

 function resize(){
  if(destroyed)return;
  mobile=innerWidth<=700;
  // Mobile toolbars fire resize while scrolling: only a real size change rebuilds the mask and density.
  const rect=stage.getBoundingClientRect(),key=`${rect.width}x${rect.height}@${devicePixelRatio}`;
  top=section.getBoundingClientRect().top+scrollY;travel=Math.max(1,section.offsetHeight-rect.height);
  if(key===sizeKey){scroll();dirty=true;return}
  sizeKey=key;width=Math.max(1,rect.width);height=Math.max(1,rect.height);
  dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  cx=width*.5;cy=height*(mobile?.44:.46);
  assign();buildMask();
  rx=Math.max((word.x1-word.x0)/2*(mobile?1.22:1.38)+(mobile?14:24),width*(mobile?.42:.30));ry=Math.max((word.y1-word.y0)/2*(mobile?1.45:2.1),height*(mobile?.19:.21));loops=mobile?1.7:1;
  crossY=word.y1+(cy+ry-word.y1)*.42;crossStop=cx+rx*.34;
  buildDensity();
  for(let f=0;f<FLIES;f++)newLoop(f,true);
  scroll();progress=target;dirty=true;
 }

 function newLoop(f,first=false){
  const o=f*10,pad=18,x0=word.x0-pad,x1=word.x1+pad,y0=word.y0-pad,y1=word.y1+pad,r=Math.random;
  if(first){flies[o]=mix(x0,x1,r());flies[o+1]=mix(y0,y1,r());flies[o+2]=flies[o]+(r()-.5)*90;flies[o+3]=flies[o+1]+(r()-.5)*60}
  else{const ex=flies[o+6],ey=flies[o+7];flies[o+2]=ex+(ex-flies[o+4]);flies[o+3]=ey+(ey-flies[o+5]);flies[o]=ex;flies[o+1]=ey}
  flies[o+4]=mix(x0,x1,r());flies[o+5]=mix(y0,y1,r());flies[o+6]=mix(x0,x1,r());flies[o+7]=mix(y0,y1,r());
  flies[o+8]=0;flies[o+9]=2.4+r()*2.6;
 }

 function scroll(){
  if(!height)return;
  const offset=scrollY-top;target=clamp(offset/travel);
  const next=offset>-innerHeight&&offset<section.offsetHeight;
  if(next!==visible){visible=next;section.dataset.visible=String(next);dirty=true}
 }

 // Reduced motion: each scene is shown as its finished key frame.
 const shownAt=p=>isReduced()?sceneAt(p).key:p;

 function updateJitter(dt){
  for(let i=0;i<count;i++){
   if(clock>=kickAt[i]){
    // A burst of flicks, then a pause: thumbs on a feed, not a metronome.
    const burst=Math.random()<.68;
    jitterV[i]+=(Math.random()<.78?-1:1)*(140+Math.random()*420)*(i?.75:1);
    kickAt[i]=clock+(burst?.07+Math.random()*.16:.45+Math.random()*1.3);
   }
   jitterV[i]*=Math.exp(-dt*9);jitterY[i]+=jitterV[i]*dt;jitterY[i]-=jitterY[i]*(1-Math.exp(-dt*2.6));
   const limit=height*.045;if(jitterY[i]>limit)jitterY[i]=limit;else if(jitterY[i]<-limit)jitterY[i]=-limit;
  }
 }

 function linePoints(i,p,still){
  const rowSpan=Math.min(width*(mobile?.86:.70),1040),rowX=cx-rowSpan/2,rowY=height*(mobile?.56:.55),rowL=height*(mobile?.12:.15);
  const s=slot[i],sr=s<0?0:smooth(.30+stagger[i]*.025,.335+stagger[i]*.025,p);
  const jit=still?0:jitterY[i]*(1-smooth(.30,.35,p));
  const sx=hx[i]*width,sy=hy[i]*height+jit,sh=len[i]*height/2;
  const x=s<0?sx:mix(sx,rowX+s*rowSpan/(ROW-1),sr),y=s<0?sy:mix(sy,rowY,sr),half=s<0?sh:mix(sh,rowL/2,sr);
  const tangle=smooth(.52+stagger[i]*.05,.60+stagger[i]*.04,p);
  const wobble=(s<0?0:smooth(.48,.52,p))*(1-tangle)*(still?0:1);
  for(let k=0;k<POINTS;k++){
   const u=k/(POINTS-1);let ax=x,ay=y-half+u*half*2;
   if(wobble)ax+=wobble*7*Math.sin(u*Math.PI*3+phase[i]+clock*2.2*speed[i]);
   if(tangle){tanglePoint(i,u,still?0:clock,tmp);ax=mix(ax,tmp[0],tangle);ay=mix(ay,tmp[1],tangle)}
   px[k]=ax;py[k]=ay;
  }
  if(i===0&&p>.82){
   // The turn: the user's line pulls free, straightens, then rotates to horizontal.
   const free=smooth(.82,.87,p),turn=smooth(.87,.94,p)*Math.PI/2,length=mix(height*.22,handoffLength(width),smooth(.90,.99,p));
   const dx=Math.sin(turn),dy=Math.cos(turn),lx=width*.5,ly=height*.5;
   for(let k=0;k<POINTS;k++){const u=k/(POINTS-1)-.5;px[k]=mix(px[k],lx+dx*u*length,free);py[k]=mix(py[k],ly+dy*u*length,free)}
  }
 }

 function stroke(){
  ctx.beginPath();ctx.moveTo(px[0],py[0]);
  for(let k=1;k<POINTS-1;k++)ctx.quadraticCurveTo(px[k],py[k],(px[k]+px[k+1])/2,(py[k]+py[k+1])/2);
  ctx.lineTo(px[POINTS-1],py[POINTS-1]);ctx.stroke();
 }

 function drawLine(i,p,light,still){
  const appeared=i===0?smooth(.06,.085,p):smooth(appear[i],appear[i]+.025,p);if(appeared<=0)return;
  const s=slot[i],sr=smooth(.30,.36,p),tangle=smooth(.52,.60,p);
  let a=alpha[i],lit=0;
  if(!i)a=mix(.85,.34,smooth(.52,.60,p)*(1-smooth(.82,.85,p)));
  if(i){
   a=s<0?mix(a,.035,smooth(.30,.35,p)):mix(a,.24,sr);
   if(litRank[i]>=0)lit=clamp(litCount(p)-litRank[i])*(1-smooth(.50,.56,p));
   a=mix(a,1,lit);a=mix(a,(mobile?.24:.16)+alpha[i]*.6,tangle);
   a*=1-smooth(.83,.97,p);
  }
  a*=appeared;if(a<.004)return;
  linePoints(i,p,still);
  ctx.globalAlpha=a;ctx.strokeStyle=shades[Math.round(lit*SHADES)][Math.round(smooth(.38,.62,light)*SHADES)];
  ctx.lineWidth=i===0?mix(1.6,2,smooth(.88,1,p)):s>=0&&tangle<.5?1.2+lit*.5:.9;
  stroke();
 }

 function render(){
  const p=shownAt(progress),still=isReduced(),light=smooth(.88,.95,p);
  const bg=p<.06?Math.round(smooth(0,.06,p)*16):16+Math.round(light*48);
  if(backgrounds[bg]!==lastBackground){lastBackground=backgrounds[bg];stage.style.backgroundColor=lastBackground}
  section.dataset.scene=sceneAt(p).name;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.lineCap='round';
  const escaping=p>.82;
  for(let i=escaping?1:0;i<count;i++)drawLine(i,p,light,still);
  // "brain rot" is negative space: the glyph region is cut out of the tangle.
  const reveal=smooth(.57,.65,p)*(1-smooth(.84,.95,p));
  if(reveal>0){ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=reveal;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(mask,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalCompositeOperation='source-over'}
  const rot=smooth(.60,.64,p)*(1-smooth(.82,.88,p));
  if(rot>0){
   ctx.fillStyle=ROT;
   for(let i=0;i<spotCount;i++){const bloom=smooth(.60+spots[i*4+3]*.07,.64+spots[i*4+3]*.07,p);if(!bloom)continue;ctx.globalAlpha=.85*rot;ctx.beginPath();ctx.arc(spots[i*4],spots[i*4+1],spots[i*4+2]*bloom,0,Math.PI*2);ctx.fill()}
   if(!still){ctx.fillStyle=FLY;ctx.strokeStyle=shades[0][0];ctx.lineWidth=.8;for(let f=0;f<FLIES;f++){const o=f*10,t=flies[o+8],q=1-t;ctx.beginPath();ctx.arc(q*q*q*flies[o]+3*q*q*t*flies[o+2]+3*q*t*t*flies[o+4]+t*t*t*flies[o+6],q*q*q*flies[o+1]+3*q*q*t*flies[o+3]+3*q*t*t*flies[o+5]+t*t*t*flies[o+7],1.6,0,Math.PI*2);ctx.globalAlpha=rot;ctx.fill();ctx.globalAlpha=rot*.35;ctx.stroke()}}
  }
  // The crossing: a thin line that never makes it through the knotted middle.
  const cross=smooth(.70,.72,p)*(1-smooth(.81,.84,p));
  if(cross>0){
   const head=mix(0,crossStop,smooth(.71,.79,p)),bin=width/BINS;
   ctx.globalAlpha=.9*cross;ctx.strokeStyle=shades[0][0];ctx.lineWidth=1.6;ctx.beginPath();
   for(let b=0;b<BINS&&b*bin<head;b++){if(dense[b])continue;ctx.moveTo(b*bin+(b&&dense[b-1]?3:0),crossY);ctx.lineTo(Math.min(head,(b+1)*bin-(dense[b+1]?3:0)),crossY)}
   ctx.stroke();
  }
  if(escaping)drawLine(0,p,light,still);
  ctx.globalAlpha=1;
  renderCopy(p);frames++;
 }

 function renderCopy(p){
  const reduced=isReduced(),scene=sceneAt(p).name,owner=COPY_OWNER[scene];
  for(let i=0;i<blocks.length;i++){const b=blocks[i],o=reduced?(b.name===owner?1:0):fadeIn(b.window,p);const q=Math.round(o*100);if(q!==b.shown){b.shown=q;b.node.style.opacity=OPACITY[q]}}
  for(let i=0;i<steps.length;i++){const s=steps[i],o=reduced?((s.name==='online')===(scene==='trend')?1:0):fadeIn(s.window,p);const q=Math.round(o*100);if(q!==s.shown){s.shown=q;s.node.style.opacity=OPACITY[q]}}
  const n=Math.round(litCount(p));if(counter&&n!==shownCount){shownCount=n;counter.textContent=String(n)}
  const y=yearAt(p);if(year&&y!==shownYear){shownYear=y;year.textContent=String(y)}
 }

 function frame(now,dt){
  if(destroyed||!visible||document.hidden||!height)return;
  const reduced=isReduced();
  if(!reduced){clock+=dt;updateJitter(dt);
   for(let f=0;f<FLIES;f++){const o=f*10;flies[o+8]+=dt/flies[o+9];if(flies[o+8]>=1)newLoop(f)}}
  const settled=Math.abs(target-progress)<.0002;
  progress=reduced||settled?target:progress+(target-progress)*(1-Math.exp(-dt*11));
  // Static frames only repaint when the scene changes; live ones paint every frame.
  const key=shownAt(progress);
  if(reduced&&!dirty&&settled&&key===lastKey)return;
  lastKey=key;dirty=false;
  render();
 }

 const debug={
  // Test hook: points the mask marks as inside the glyphs, and points around them inside the word's box.
  samples(){
   const data=maskCtx.getImageData(0,0,mask.width,mask.height).data,inside=[],outside=[],step=Math.round(5*dpr);
   for(let y=Math.round(word.y0*dpr);y<word.y1*dpr;y+=step)for(let x=Math.round(word.x0*dpr);x<word.x1*dpr;x+=step){const a=data[(y*mask.width+x)*4+3];if(a===255)inside.push([x/dpr,y/dpr]);else if(a===0)outside.push([x/dpr,y/dpr])}
   return{inside,outside};
  },
  seek(p){scrollTo({top:top+clamp(p)*travel,behavior:'instant'});scroll();progress=target;dirty=true;render()},
  get state(){return{progress,target,scene:sceneAt(shownAt(progress)).name,lines:count,row:ROW,lit:Math.round(litCount(shownAt(progress))),year:yearAt(shownAt(progress)),visible,frames,reduced:isReduced(),word,crossY,handoff:{y:height*.5,x0:width*.5-handoffLength(width)/2,x1:width*.5+handoffLength(width)/2},dense:[...dense].join('')}},
 };
 return{scroll,resize,frame,render,debug,destroy(){destroyed=true}};
}
