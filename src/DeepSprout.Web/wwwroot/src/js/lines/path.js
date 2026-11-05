import {clamp,mix,smooth} from '../reels/story-math.js';
import {handoffLength,LINES,lineCount} from './field.js';
import {ROOT,rootShape,tailPath,rootletPath} from './root.js';

// Section 4: the way back. The horizontal line that ends section 3 becomes this SVG path.
// It draws itself ahead of a camera (one transform on a wrapper group) as the page scrolls.
// Everything is a pure function of scroll time t (in viewport heights), so it reverses exactly.

const NS='http://www.w3.org/2000/svg';
export const END=17.6;
export const STATIONS=[
 {name:'handoff',from:0,to:.7,key:.1},
 {name:'assess',from:.7,to:2.6,key:2.4},
 {name:'plan',from:2.6,to:4.4,key:3.9},
 {name:'activities',from:4.4,to:7.6,key:6.6},
 {name:'protect',from:7.6,to:10.6,key:8.95},
 {name:'beyond',from:10.6,to:13.4,key:12.9},
 {name:'together',from:13.4,to:15.9,key:15.1},
 {name:'growth',from:15.9,to:END+1,key:END},
];
// Station 5 is the page's one large camera move: a zoom out to this, and nothing after zooms back.
export const WIDE=()=>.3;
export function stationAt(t){let s=STATIONS[0];for(let i=1;i<STATIONS.length;i++)if(t>=STATIONS[i].from)s=STATIONS[i];return s}
// Copy fades [in-start, in-end, out-start, out-end], and how far below the path each label sits.
const COPY={assess:[.75,1.05,2.45,2.65],plan:[2.95,3.25,4.15,4.4],activities:[4.75,5.05,6.75,7.0],protect:[7.95,8.25,9.9,10.15],beyond:[11.75,12.05,13.0,13.3],together:[14.5,14.8,15.55,15.85]};
export const W1_DAYS=7,UNFILLED=[2,5],GATES=4,BAR_HEIGHTS=[.55,.85,.4,.7];
const WALL=34,DRIFTERS=18,FIELD_NODES=16,LEVELS=24,BUCKETS=4;
// Each line's brightness: its section 3 alpha (.10–.22) mapped onto ink at .24–.54, in 24 steps (±.006).
export const crowdOpacity=alpha=>.24+clamp((alpha-.10)/.12)*.3;
const OPACITY=Array.from({length:101},(_,i)=>String(i/100)),DASH=Array.from({length:1001},(_,i)=>String(i));
// Stroke compensation for the zoomed-out stations, so lines keep their on-screen weight (1.00–4.00).
const STROKE=Array.from({length:301},(_,i)=>String(1+i/100));

// Station 4's subjects: three supported websites, as quiet tiles. Each has a colour face and a
// line-art face; the station crossfades them, so no filter is recomputed per frame.
// Drawn on a 48 × 48 box centred on 0,0 (px; never scaled with the layout).
const SITES=[
 {id:'instagram',label:'instagram.com',
  color:`<rect x="-24" y="-24" width="48" height="48" rx="13" fill="url(#ig-face)"/><rect x="-13.5" y="-13.5" width="27" height="27" rx="8" fill="none" stroke="#fff" stroke-width="3.2"/><circle r="6.6" fill="none" stroke="#fff" stroke-width="3.2"/><circle cx="8.6" cy="-8.6" r="2" fill="#fff"/>`,
  mono:`<rect x="-13.5" y="-13.5" width="27" height="27" rx="8"/><circle r="6.6"/><circle cx="8.6" cy="-8.6" r="1.2"/>`},
 {id:'tiktok',label:'tiktok.com',
  color:`<rect x="-24" y="-24" width="48" height="48" rx="13" fill="#121214"/><path d="M3-14v18.5a6 6 0 1 1-6-6" transform="translate(-1.4 -1.2)" fill="none" stroke="#25f4ee" stroke-width="4.4" stroke-linecap="round"/><path d="M3-14c1 5.2 4.4 8 9 8.4" transform="translate(-1.4 -1.2)" fill="none" stroke="#25f4ee" stroke-width="4.4" stroke-linecap="round"/><path d="M3-14v18.5a6 6 0 1 1-6-6" transform="translate(1.4 1.2)" fill="none" stroke="#fe2c55" stroke-width="4.4" stroke-linecap="round"/><path d="M3-14c1 5.2 4.4 8 9 8.4" transform="translate(1.4 1.2)" fill="none" stroke="#fe2c55" stroke-width="4.4" stroke-linecap="round"/><path d="M3-14v18.5a6 6 0 1 1-6-6M3-14c1 5.2 4.4 8 9 8.4" fill="none" stroke="#fff" stroke-width="4.4" stroke-linecap="round"/>`,
  mono:`<path d="M3-14v18.5a6 6 0 1 1-6-6M3-14c1 5.2 4.4 8 9 8.4"/>`},
 {id:'youtube',label:'youtube.com',
  color:`<rect x="-24" y="-24" width="48" height="48" rx="13" fill="#fff"/><rect x="-16" y="-11" width="32" height="22" rx="7" fill="#ff0033"/><path d="M-4.4-5.6 6.2 0-4.4 5.6Z" fill="#fff"/>`,
  mono:`<rect x="-16" y="-11" width="32" height="22" rx="7"/><path d="M-4.4-5.6 6.2 0-4.4 5.6Z"/>`},
];
// Station 4's story, as positions of the camera across the corridor (pure, so it reverses):
// the sites arrive in colour, the boundary activates, they lose their colour, then rest protected.
export function shieldState(camX,g){
 const z0=g.zone[0],k=g.k;
 return{arrive:smooth(z0-k*440,z0-k*170,camX),pulse:smooth(z0-k*90,z0+k*190,camX),quiet:smooth(z0+k*90,z0+k*420,camX),settled:smooth(z0+k*330,z0+k*520,camX)};
}

export function layout(width,mobile){
 // Station spacing compresses on narrow screens; element sizes do not. Weeks compress the most,
 // so the four-week overview still fits at a readable zoom on a phone.
 const k=mobile?.45:1,x=v=>v*k,L=handoffLength(width);
 const gates=[0,1,2,3].map(i=>x(640+i*140)),w1=x(1400),w1Len=mobile?280:840,day=mobile?40:120,futureLen=mobile?110:450;
 const weeks=[[w1,w1+w1Len]];for(let i=0;i<3;i++){const a=weeks[i][1];weeks.push([a,a+futureLen])}
 const zone=[weeks[3][1]+x(360),weeks[3][1]+x(360)+(mobile?360:800)];
 const g={k,L,x,mobile,start:-L/2,gates,gatesMid:(gates[0]+gates[3])/2,nodes:Array.from({length:W1_DAYS},(_,i)=>w1+(w1Len-day*(W1_DAYS-1))/2+i*day),weeks,zone};
 // Station 5: a wide field of larger nodes off the path; one of them sits by a branch.
 const wide=WIDE(mobile),field=zone[1]+x(1000),focus5=field+x(1700);
 g.wide=wide;g.field=Array.from({length:FIELD_NODES},(_,j)=>({x:field+(j+.5)/FIELD_NODES*x(4200),y:(j%2?1:-1)*(260+((j*.618)%1)*1000)*k,r:34+((j*.381)%1)*26}));
 g.branchNode={x:focus5+x(300),y:-460*k,r:48};g.branch=[g.branchNode.x-x(560),g.branchNode.x+x(560)];
 g.field=g.field.filter(n=>Math.hypot(n.x-g.branchNode.x,n.y-g.branchNode.y)>x(420));
 // Station 6: the section 3 lines, laid out again horizontally beside the path.
 const focus6=focus5+x(2600);g.focus6=focus6;g.rowGap=mobile?26:36;
 // Station 7: past the far edge of station 6, the path turns down and becomes a root.
 g.turn=focus6+x(2700);g.radius=160*k;
 // Camera keys [t, x, y, zoom], flattened once per layout so the frame loop never builds them.
 const w1End=weeks[0][1],w4End=weeks[3][1],fit=Math.min(1,width*.9/(w4End-w1+x(160))),mid=(w1+w4End)/2;
 g.keys=Float64Array.from([0,0,0,1, .35,0,0,1, 1.9,g.gatesMid,0,1, 2.5,g.gatesMid+x(50),0,1, 3.3,mid,0,fit, 4.1,mid,0,fit, 4.7,mix(w1,w1End,.24),0,1, 6.4,mix(w1,w1End,.6),0,1, 7.5,w4End+x(110),0,mobile?1:.85, 7.9,zone[0]-x(50),0,1, 9.6,zone[1]+x(100),0,1, 10.4,zone[1]+x(250),0,1, 10.7,zone[1]+x(400),0,1, 11.9,focus5,0,wide, 13.3,focus5+x(700),0,wide, 15.8,focus6,0,wide, 17.2,0,0,wide, END,0,0,wide]);
 return g;
}

// Station 7's end is fixed by the garden: the root's tip must land on the garden's entry point.
// Called once the garden stage has measured that point (in screen pixels).
export function settleRoot(g,width,height,entry){
 const wide=g.wide,pathY=height*.46,shape=rootShape(entry,height);
 const rootX=g.turn+g.radius,cy=g.radius+(pathY+120)/wide,cx=rootX-(shape.x0-width/2)/wide;
 const k=g.keys.length-8;g.keys[k+1]=g.keys[k+5]=cx;g.keys[k+2]=g.keys[k+6]=cy;
 const toWorld=(x,y)=>[cx+(x-width/2)/wide,cy+(y-pathY)/wide];
 g.root={shape,toWorld,x:rootX,soil:toWorld(0,shape.soil)[1],entry};
 return g;
}

// Writes into `out` (reused by the frame loop); allocates only when called without one.
export function cameraAt(t,g,width,out={x:0,y:0,zoom:1}){
 const keys=g.keys,n=keys.length/4;let i=0;while(i<n-2&&t>keys[(i+1)*4])i++;
 const a=i*4,b=a+4,p=smooth(keys[a],keys[b],t);
 out.x=mix(keys[a+1],keys[b+1],p);out.y=mix(keys[a+2],keys[b+2],p);out.zoom=mix(keys[a+3],keys[b+3],p);return out;
}
// The path's drawn end: just ahead of the camera, and racing ahead to show all four weeks at the plan.
// From station 5 on, the drawn end runs further ahead as the camera widens.
export const headAt=(t,cam,g,width=1440)=>Math.max(cam.x+mix(g.L/2,width*.42/cam.zoom,smooth(10.6,11.9,t)),g.weeks[3][1]*smooth(2.6,3.3,t));
// Station 3: a cursor sweeps week 1 while the camera keeps all seven days in view.
export const fillCursor=(t,g)=>t<4.7?-Infinity:mix(g.weeks[0][0],g.weeks[0][1]+g.x(20),smooth(4.8,6.3,t));

export function createPath(section,reducedQuery,gardenEntry=()=>null){
 const stage=section.querySelector('.path-stage'),svg=section.querySelector('.path-svg');
 const handoff=section.querySelector('.path-handoff'),weekLabels=[...section.querySelectorAll('.path-weeks span')];
 const stations=[...section.querySelectorAll('[data-station]')].map(node=>({node,name:node.dataset.station,window:COPY[node.dataset.station],shown:-1}));
 const isReduced=()=>Boolean(reducedQuery?.matches);
 let g,width=0,height=0,top=0,travel=1,target=0,time=0,visible=false,engaged=null,destroyed=false,dirty=true,frames=0,sizeKey='';
 const view={x:0,y:0,zoom:1};let camera,matrix,clipRect,sweepRect,solid=[],gates=[],bars=[],nodes=[],drifters=[],wall={},px=[],pxOffset=0,shownY=-1,handoffShown=-1,shownStroke=-1;
 let lane,fieldGroup,branch,touch,crowd=[],threads,soil,tail,rootlets,entryKey='',shield=null;
 const weekShown=weekLabels.map(()=>({o:-1,x:null}));

 const el=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);parent?.append(n);return n};

 function build(){
  // Built once per real size change. Per frame, only numbers and pre-built strings are written.
  svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const defs=el('defs',{},svg),clip=el('clipPath',{id:'path-head'},defs);
  clipRect=el('rect',{x:-1e5,y:-1e5,width:1e5,height:2e5},clip);
  camera=el('g',{class:'path-camera'},svg);matrix=svg.createSVGMatrix();camera.transform.baseVal.initialize(svg.createSVGTransformFromMatrix(matrix));
  // Station 4's corridor sits under everything else.
  wall.band=el('rect',{x:g.zone[0],y:-WALL,width:g.zone[1]-g.zone[0],height:WALL*2,class:'path-wall-band'},camera);
  wall.top=el('line',{x1:g.zone[0],x2:g.zone[1],y1:-WALL,y2:-WALL,class:'path-wall'},camera);
  wall.bottom=el('line',{x1:g.zone[0],x2:g.zone[1],y1:WALL,y2:WALL,class:'path-wall'},camera);
  drifters=Array.from({length:DRIFTERS},(_,i)=>{const r=((i*.618)%1),x=g.zone[0]+(i+.5)/DRIFTERS*(g.zone[1]-g.zone[0])+(r-.5)*14;return{x,side:i%2?1:-1,len:38+r*30,lag:r*.25,node:el('line',{x1:x,x2:x,y1:0,y2:0,class:'path-drifter'},camera)}});
  // Station 4's subjects: three supported websites above the corridor, each a colour tile and a
  // line-art twin that are crossfaded. Sizes are in px, never scaled with the layout.
  {const ig=el('linearGradient',{id:'ig-face',x1:'0',y1:'1',x2:'1',y2:'0'},defs);[['0','#feda75'],['.28','#fa7e1e'],['.55','#d62976'],['.8','#962fbf'],['1','#4f5bd5']].forEach(([o,c])=>el('stop',{offset:o,'stop-color':c},ig));
   const sheen=el('linearGradient',{id:'tile-sheen',x1:'0',y1:'0',x2:'0',y2:'1'},defs);el('stop',{offset:'0','stop-color':'#fff','stop-opacity':'.34'},sheen);el('stop',{offset:'.5','stop-color':'#fff','stop-opacity':'0'},sheen);
   const span=g.zone[1]-g.zone[0],group=el('g',{class:'path-shield'},camera);
   const field=el('rect',{x:g.zone[0],y:-WALL,width:span,height:WALL*2,rx:WALL,class:'path-shield-field'},group);
   const status=el('g',{class:'path-shield-status',transform:`translate(${g.zone[0]+span/2} -226)`},group);
   // The specification's own state name, marked as a preview: this is an illustration, not live extension state.
   el('path',{d:'M-88.5-1.5v-3a3.5 3.5 0 0 1 7 0v3M-90-1.5h10v7.5h-10Z',class:'path-shield-lock'},status);
   const word=el('text',{x:8,y:5,class:'path-shield-word'},status);word.textContent='Protection active · preview';
   const sites=SITES.map((site,i)=>{
    const x=g.zone[0]+span*(.2+i*.3),y=-152,node=el('g',{class:'path-site',transform:`translate(${x} ${y})`},group);
    const color=el('g',{class:'path-site-color'},node);el('rect',{x:-23,y:-20,width:46,height:46,rx:13,class:'path-site-shadow'},color);color.insertAdjacentHTML('beforeend',site.color+'<rect x="-24" y="-24" width="48" height="48" rx="13" fill="url(#tile-sheen)"/>');
    const mono=el('g',{class:'path-site-mono'},node);el('rect',{x:-24,y:-24,width:48,height:48,rx:13,class:'path-site-plate'},mono);const glyph=el('g',{class:'path-site-glyph'},mono);glyph.insertAdjacentHTML('beforeend',site.mono);
    const badge=el('g',{class:'path-site-badge',transform:'translate(19 19)'},node);el('circle',{r:9},badge);el('path',{d:'M-2.6-1v-1.6a2.6 2.6 0 0 1 5.2 0V-1M-3.6-1h7.2v5.2h-7.2Z'},badge);
    const label=el('text',{x:0,y:-36,class:'path-site-label'},node);label.textContent=site.label;
    // Fragments of the feed that drift off and dissolve as the colour drains.
    const bits=[0,1,2].map(j=>el('rect',{x:-2,y:-2,width:4,height:4,rx:1,class:'path-site-bit'},node));
    return{x,y,node,color,mono,badge,bits,i,shown:''};
   });
   shield={group,field,status,sites,shown:''};}
  // The path: solid where it is yours and detailed, faint dashes for the weeks that will adapt.
  solid=[{a:g.start,b:g.weeks[0][1],node:el('path',{d:`M${g.start} 0H${g.weeks[0][1]}`,pathLength:1000,class:'path-line'},camera)}];
  // After the weeks: on through stations 4–6 to the turn, then down to the soil (station 7).
  const R=g.radius,w4=g.weeks[3][1],{x:rx,soil:soilY}=g.root;
  lane={a:w4,flat:rx-R-w4,down:Math.PI*R/2+(soilY-R),node:el('path',{d:`M${w4} 0H${rx-R}A${R} ${R} 0 0 1 ${rx} ${R}V${soilY}`,pathLength:1000,class:'path-line'},camera)};
  // Station 5: the wider field, and a branch that leaves the path, touches one node and rejoins it.
  fieldGroup=el('g',{class:'path-field-group'},camera);
  for(const n of g.field)el('circle',{cx:n.x,cy:n.y,r:n.r,class:'path-field'},fieldGroup);
  const N=g.branchNode,[b0,b1]=g.branch,apex=N.y+N.r,x=g.x;
  el('circle',{cx:N.x,cy:N.y,r:N.r,class:'path-field'},fieldGroup);touch=el('circle',{cx:N.x,cy:N.y,r:0,class:'path-field-touch'},fieldGroup);
  branch=el('path',{d:`M${b0} 0C${b0+x(260)} 0 ${N.x-x(220)} ${apex} ${N.x} ${apex}C${N.x+x(220)} ${apex} ${b1-x(260)} 0 ${b1} 0`,pathLength:1000,class:'path-branch'},camera);
  // Station 6: the same lines as section 3 — their order, lengths and alphas — now horizontal, beside yours.
  const sweep=el('clipPath',{id:'path-sweep'},defs);sweepRect=el('rect',{x:-1e5,y:-1e5,width:0,height:2e5},sweep);
  const crowdGroup=el('g',{'clip-path':'url(#path-sweep)'},camera),count=lineCount(g.mobile),rows=[],longest=Math.max(...LINES.len.subarray(1,count));
  const span=g.x(2600),reach=g.mobile?1300:2600,d=Array.from({length:BUCKETS*LEVELS},()=>'');
  for(let i=1;i<count;i++){
   const row=Math.ceil(i/2)*(i%2?-1:1),y=row*g.rowGap,x0=g.focus6-span+LINES.hx[i]*span,x1=x0+LINES.len[i]/longest*reach;
   const bucket=Math.min(BUCKETS-1,Math.floor((i-1)/(count-1)*BUCKETS)),level=Math.min(LEVELS-1,Math.floor((LINES.alpha[i]-.10)/.12*LEVELS));
   d[bucket*LEVELS+level]+=`M${x0.toFixed(1)} ${y}H${x1.toFixed(1)}`;rows[i]={row,y,x0,x1};
  }
  crowd=d.map((path,j)=>({bucket:Math.floor(j/LEVELS),alpha:crowdOpacity(.10+(j%LEVELS+.5)/LEVELS*.12),node:path?el('path',{d:path,class:'path-crowd'},crowdGroup):null,shown:-1})).filter(c=>c.node);
  // Thin threads between each line and its neighbour one row nearer the path (row 0 is yours).
  let td='';
  for(let i=1;i<count;i++){
   const r=rows[i],inner=Math.abs(r.row)===1?{y:0,x0:-Infinity,x1:Infinity}:rows[i-2],a=Math.max(r.x0,inner.x0),b=Math.min(r.x1,inner.x1);
   if(b-a>40){const tx=a+(b-a)*(.3+((i*.618)%1)*.4);td+=`M${tx.toFixed(1)} ${inner.y}V${r.y}`}
  }
  threads=el('path',{d:td,class:'path-thread'},crowdGroup);
  // Station 7: the root below the soil, in exactly the screen shape the garden starts from.
  const shape=g.root.shape,toWorld=g.root.toWorld,[s0x,s0y]=toWorld(shape.soilLine[0],shape.soil),[s1x]=toWorld(shape.soilLine[1],shape.soil);
  soil=el('path',{d:`M${s0x} ${s0y}H${s1x}`,class:'path-soil'},camera);
  tail=el('path',{d:tailPath(shape,toWorld),pathLength:1000,class:'path-root-tail'},camera);
  rootlets=el('path',{d:rootletPath(shape,toWorld),pathLength:1000,class:'path-root-lets'},camera);
  el('path',{d:`M${g.weeks[1][0]} 0H${g.weeks[3][1]}`,class:'path-future','clip-path':'url(#path-head)'},camera);
  g.weeks.forEach(([a],i)=>{if(i)el('line',{x1:a,x2:a,y1:-7,y2:7,class:'path-week-tick','clip-path':'url(#path-head)'},camera)});
  el('line',{x1:g.weeks[0][0],x2:g.weeks[0][0],y1:-7,y2:7,class:'path-week-tick','clip-path':'url(#path-head)'},camera);
  // Station 1: four narrow gates, a tick at each, and four bars below that build a profile. No numbers.
  gates=g.gates.map((x,i)=>{
   const group=el('g',{class:'path-gate'},camera);
   el('line',{x1:x,x2:x,y1:-22,y2:-8},group);el('line',{x1:x,x2:x,y1:8,y2:22},group);
   const tick=el('path',{d:`M${x-5} -38L${x-1} -34L${x+6} -43`,pathLength:1,class:'path-tick'},group);
   const bar=el('rect',{x:x-6,y:76,width:12,height:0,rx:2,class:'path-bar'},camera);
   bars.push({node:bar,max:42*BAR_HEIGHTS[i]});
   return{x,group,tick};
  });
  el('line',{x1:g.gates[0]-24,x2:g.gates[3]+24,y1:76.5,y2:76.5,class:'path-baseline','clip-path':'url(#path-head)'},camera);
  // Stations 2–3: seven day nodes on week 1 only; two stay unfilled and the line runs through them.
  nodes=g.nodes.map((x,i)=>({x,skip:UNFILLED.includes(i),fill:el('circle',{cx:x,cy:0,r:0,class:'path-node-fill'},camera),ring:el('circle',{cx:x,cy:0,r:6,class:'path-node'},camera)}));
  // Pre-built pixel strings for the DOM layer, so positions never allocate per frame.
  pxOffset=600;px=Array.from({length:Math.ceil(width+height)+1200},(_,i)=>`${i-pxOffset}px`);
 }

 function resize(){
  if(destroyed)return;
  const rect=stage.getBoundingClientRect(),key=`${rect.width}x${rect.height}`;
  top=section.getBoundingClientRect().top+scrollY;travel=Math.max(1,section.offsetHeight-rect.height);
  const entry=gardenEntry(),settledKey=entry&&entry.x?`${entry.x.toFixed(2)},${entry.y.toFixed(2)}`:'fallback';
  if(key!==sizeKey||settledKey!==entryKey){
   sizeKey=key;entryKey=settledKey;width=rect.width;height=rect.height;
   g=settleRoot(layout(width,innerWidth<=700),width,height,entry&&entry.x?entry:{x:width*.62,y:height*.62});
   build();shownY=-1;handoffShown=-1;shownStroke=-1;weekShown.forEach(w=>{w.o=-1;w.x=null});stations.forEach(s=>s.shown=-1);crowd.forEach(c=>c.shown=-1);
  }
  scroll();time=target;dirty=true;
 }

 function scroll(){
  if(!height)return;
  const offset=scrollY-top;target=clamp(offset/travel)*END;
  // The stage shows only once it is pinned: before that, section 3 is still finishing its turn underneath.
  const pinned=offset>=0;if(pinned!==engaged){engaged=pinned;stage.style.visibility=pinned?'visible':'hidden'}
  const next=offset>-innerHeight&&offset<section.offsetHeight;if(next!==visible){visible=next;section.dataset.visible=String(next);dirty=true}
 }

 const pxAt=v=>px[clamp(Math.round(v)+pxOffset,0,px.length-1)];
 const shownTime=t=>isReduced()?stationAt(t).key:t;

 function render(){
  const t=shownTime(time),cam=cameraAt(t,g,width,view),head=headAt(t,cam,g,width),zoom=cam.zoom;
  const pathY=height*mix(.5,.46,smooth(.35,1,t));
  matrix.a=matrix.d=zoom;matrix.e=width/2-cam.x*zoom;matrix.f=pathY-cam.y*zoom;camera.transform.baseVal.getItem(0).setMatrix(matrix);
  const stroke=Math.round(clamp((1/zoom-1)*smooth(10.6,11.9,t),0,3)*100);if(stroke!==shownStroke){shownStroke=stroke;camera.style.setProperty('--sw',STROKE[stroke])}
  clipRect.width.baseVal.value=head+1e5;
  for(let i=0;i<solid.length;i++){const s=solid[i],drawn=clamp((head-s.a)/(s.b-s.a));s.node.style.strokeDashoffset=DASH[1000-Math.round(drawn*1000)]}
  {const drawn=clamp((clamp(head-lane.a,0,lane.flat)+lane.down*smooth(16.1,17.0,t))/(lane.flat+lane.down));lane.node.style.strokeDashoffset=DASH[1000-Math.round(drawn*1000)]}
  // Station 5: the field appears with the zoom; the branch loops out to one node and back.
  const away=1-smooth(15.9,16.4,t);
  fieldGroup.style.opacity=OPACITY[Math.round(smooth(10.9,11.7,t)*away*100)];
  branch.style.strokeDashoffset=DASH[1000-Math.round(smooth(12.0,12.8,t)*1000)];
  touch.r.baseVal.value=g.branchNode.r*.62*smooth(12.36,12.56,t);
  // Station 6: the crowd sweeps in, in its own order; threads join neighbours; all leave before the descent.
  sweepRect.width.baseVal.value=1e5+mix(g.focus6-g.x(2700),g.focus6+g.x(2700),smooth(13.5,14.5,t));
  const leave=1-smooth(15.9,16.5,t);
  for(let i=0;i<crowd.length;i++){const c=crowd[i],o=Math.round(c.alpha*smooth(13.6+c.bucket*.22,14.1+c.bucket*.22,t)*leave*100);if(o!==c.shown){c.shown=o;c.node.style.opacity=OPACITY[o]}}
  threads.style.opacity=OPACITY[Math.round(.5*smooth(14.4,15.0,t)*leave*100)];
  // Station 7: soil, then the root grows down to the garden's entry point.
  soil.style.opacity=OPACITY[Math.round(ROOT.soilOpacity*smooth(16.5,16.9,t)*100)];
  tail.style.strokeDashoffset=DASH[1000-Math.round(smooth(16.85,17.25,t)*1000)];
  rootlets.style.strokeDashoffset=DASH[1000-Math.round(smooth(17.1,17.4,t)*1000)];
  for(let i=0;i<gates.length;i++){
   const gate=gates[i],bar=bars[i],h=bar.max*smooth(gate.x+g.k*10,gate.x+g.k*120,head);
   gate.group.style.opacity=OPACITY[Math.round(smooth(gate.x-g.k*60,gate.x-4,head)*100)];
   gate.tick.style.strokeDashoffset=OPACITY[100-Math.round(smooth(gate.x+4,gate.x+g.k*46,head)*100)];
   bar.node.y.baseVal.value=76-h;bar.node.height.baseVal.value=h;
  }
  // Days fill as the camera passes them in station 3 only; the plan overview shows them empty.
  const cursor=fillCursor(t,g);
  for(let i=0;i<nodes.length;i++){const n=nodes[i];n.ring.style.opacity=OPACITY[Math.round(smooth(n.x-8,n.x+4,head)*100)];n.fill.r.baseVal.value=n.skip?0:5*smooth(n.x-g.k*30,n.x+g.k*10,cursor)}
  // Station 4: the wall rises ahead, the drifting feed lines stop at it, and it dissolves once passed.
  const z0=g.zone[0],z1=g.zone[1],k=g.k,rise=smooth(z0-k*320,z0-k*80,cam.x),dissolve=smooth(z1+k*40,z1+k*170,cam.x);
  const wy=WALL*rise,wallOpacity=OPACITY[Math.round(rise*(1-dissolve)*100)];
  wall.band.y.baseVal.value=-wy;wall.band.height.baseVal.value=wy*2;wall.band.style.opacity=wallOpacity;
  wall.top.y1.baseVal.value=wall.top.y2.baseVal.value=-wy;wall.bottom.y1.baseVal.value=wall.bottom.y2.baseVal.value=wy;
  wall.top.style.opacity=wall.bottom.style.opacity=wallOpacity;
  const far=height*.62/zoom;
  for(let i=0;i<drifters.length;i++){
   const d=drifters[i],drift=smooth(z0-k*240+d.lag*k*200,z0+k*260+d.lag*k*200,cam.x),stop=WALL+5+d.len/2;
   const y=mix(mix(far+d.len,stop,drift),d.len*.2,dissolve);
   d.node.y1.baseVal.value=d.side*(y-d.len/2);d.node.y2.baseVal.value=d.side*(y+d.len/2);
   d.node.style.opacity=OPACITY[Math.round(drift*(1-dissolve)*100)];
  }
  renderShield(cam.x,rise,dissolve);
  renderCopy(t,cam,head,pathY,zoom);frames++;
 }

 function renderShield(camX,rise,dissolve){
  const st=shieldState(camX,g),gone=1-dissolve,key=[st.arrive,st.pulse,st.quiet,st.settled,dissolve].map(v=>Math.round(v*100)).join();
  if(key===shield.shown)return;shield.shown=key;
  shield.group.style.opacity=OPACITY[Math.round(st.arrive*gone*100)];
  // The activation pulse leaves the existing wall and settles as a faint field.
  const reach=WALL+mix(0,64,st.pulse);shield.field.y.baseVal.value=-reach;shield.field.height.baseVal.value=reach*2;
  shield.field.style.opacity=OPACITY[Math.round(Math.sin(Math.PI*st.pulse)*.6*rise*100)];
  shield.status.style.opacity=OPACITY[Math.round(st.settled*100)];
  for(const site of shield.sites){
   const bob=(1-st.quiet)*Math.sin(st.arrive*Math.PI*2+site.i*1.7)*3,scale=1-st.quiet*.08;
   site.node.setAttribute('transform',`translate(${site.x} ${(site.y+(1-st.arrive)*-14+bob).toFixed(1)}) scale(${scale.toFixed(3)})`);
   site.color.style.opacity=OPACITY[Math.round((1-st.quiet)*100)];site.mono.style.opacity=OPACITY[Math.round(st.quiet*100)];
   site.badge.style.opacity=OPACITY[Math.round(st.settled*100)];
   const drift=Math.sin(Math.PI*st.quiet);
   site.bits.forEach((bit,j)=>{const a=-1.1-j*.55+site.i*.4;bit.x.baseVal.value=-2+Math.cos(a)*(18+st.quiet*20);bit.y.baseVal.value=-2+Math.sin(a)*(18+st.quiet*24);bit.style.opacity=OPACITY[Math.round(drift*.75*100)]});
  }
 }

 function renderCopy(t,cam,head,pathY,zoom){
  const reduced=isReduced(),owner=stationAt(t).name;
  const y=Math.round(pathY);if(y!==shownY){shownY=y;stage.style.setProperty('--path-y',pxAt(y))}
  const h=reduced?(owner==='handoff'?100:0):Math.round((1-smooth(.35,.7,t))*100);if(h!==handoffShown){handoffShown=h;handoff.style.opacity=OPACITY[h]}
  for(let i=0;i<stations.length;i++){const s=stations[i],o=Math.round((reduced?(s.name===owner?1:0):smooth(s.window[0],s.window[1],t)*(1-smooth(s.window[2],s.window[3],t)))*100);if(o!==s.shown){s.shown=o;s.node.style.opacity=OPACITY[o]}}
  for(let i=0;i<weekLabels.length;i++){
   const label=weekLabels[i],middle=(g.weeks[i][0]+g.weeks[i][1])/2,shown=weekShown[i],o=Math.round(smooth(middle,middle+g.k*80,head)*(1-smooth(6.8,7.2,t))*100);
   if(o!==shown.o){shown.o=o;label.style.opacity=OPACITY[o]}
   if(o>0){const x=Math.round(width/2+(middle-cam.x)*zoom);if(x!==shown.x){shown.x=x;label.style.left=pxAt(x)}}
  }
 }

 function frame(now,dt){
  if(destroyed||!visible||document.hidden||!height)return;
  const reduced=isReduced(),settled=Math.abs(target-time)<.0005;
  if(!settled||dirty){time=reduced||settled?target:time+(target-time)*(1-Math.exp(-dt*11));dirty=false;render()}
 }

 const debug={
  seek(t){scrollTo({top:top+clamp(t/END)*travel,behavior:'instant'});scroll();time=target;dirty=false;render()},
  get state(){const t=shownTime(time),cam=cameraAt(t,g,width),head=headAt(t,cam,g,width),filled=nodes.map(n=>n.fill.r.baseVal.value>4.9);
   return{time:t,station:stationAt(t).name,camera:cam,head,engaged,visible,frames,reduced:isReduced(),layout:{start:g.start,L:g.L,weeks:g.weeks,nodes:g.nodes,gates:g.gates,zone:g.zone},
    filled,unfilled:filled.map((f,i)=>f?-1:i).filter(i=>i>=0),ticks:gates.map(gate=>gate.tick.style.strokeDashoffset==='0'),bars:bars.map(b=>b.node.height.baseVal.value),
    wall:{height:wall.band.height.baseVal.value,opacity:Number(wall.band.style.opacity)},shield:{...shieldState(cam.x,g),sites:shield.sites.map(s=>({color:Number(s.color.style.opacity||0),mono:Number(s.mono.style.opacity||0)}))},
    branch:{d:branch.getAttribute('d'),drawn:1-Number(branch.style.strokeDashoffset)/1000,node:g.branchNode,touched:touch.r.baseVal.value>g.branchNode.r*.6,ends:g.branch},
    crowd:{groups:crowd.length,lines:lineCount(g.mobile)-1,opacity:crowd.map(c=>Number(c.node.style.opacity||0))},entry:g.root.entry,stroke:Number(camera.style.getPropertyValue('--sw')||1),drifters:drifters.map(d=>({top:Math.min(Math.abs(d.node.y1.baseVal.value),Math.abs(d.node.y2.baseVal.value)),opacity:Number(d.node.style.opacity||0)}))}},
 };
 return{scroll,resize,frame,debug,destroy(){destroyed=true}};
}
