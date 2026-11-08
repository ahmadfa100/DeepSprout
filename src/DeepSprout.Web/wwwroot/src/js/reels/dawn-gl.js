import * as ART from './dawn-art.js';

// One-canvas renderer for the opening (experimental, opt-in with ?render=gl; the DOM layers are the default).
//
// The scene (dawn.js) still builds its SVG/HTML pieces and poses them every frame, exactly as before.
// Composited by the browser, those pieces are ~60 layers, most of them screen-sized and mostly empty,
// plus off-screen passes for the grain's multiply blend and each glowing reel. On a laptop's
// integrated GPU at 165 Hz that blending is the bottleneck. This draws the same pieces into one
// WebGL canvas instead:
//  · pieces that only move or fade (sun, land, tree, clouds, grass, reels…) are rasterised once at
//    load, at the screen's resolution and only as large as their drawn content, from their own SVG
//    markup; each frame they are drawn as textured quads with the transform and opacity the scene set;
//  · the character and butterfly are drawn shape by shape the same way, through the transforms the
//    scene sets on their groups; the limbs, recomputed every frame, are stroked on the GPU;
//  · the threads the scene strokes are recorded and stroked on the GPU from the same points;
//  · the grain multiplies every layer as it is drawn, which equals CSS mix-blend-mode: multiply
//    over the finished picture, without a separate full-screen pass.
// Text, buttons and the seam's thread bridge stay in the DOM.
const VS=`#version 300 es
in vec2 a;uniform mat4 m;uniform vec2 view;out vec2 uv;
void main(){vec4 p=m*vec4(a,0.,1.);gl_Position=vec4(p.x*2./view.x-p.w,p.w-p.y*2./view.y,0.,p.w);uv=a;}`;
const FS=`#version 300 es
precision highp float;in vec2 uv;uniform sampler2D t,grain;uniform float alpha;uniform vec4 color;uniform int mode;uniform vec2 tile;uniform float viewH;uniform bool grained;out vec4 o;
void main(){
 vec4 c=mode==1?color*alpha:texture(t,uv)*alpha;
 if(c.a<.0015)discard;
 // CSS mix-blend-mode:multiply of the grain tile g (premultiplied): result × (1 − g.a + g.rgb).
 if(grained){vec4 g=texture(grain,vec2(gl_FragCoord.x,viewH-gl_FragCoord.y)/tile);c.rgb*=1.-g.a+g.rgb;}
 o=c;}`;
// Threads: anti-aliased strokes with round caps, built as triangles around the same points the
// canvas would stroke. d is the distance from the centre line (CSS px); coverage is a 1-px ramp at the edge.
const LVS=`#version 300 es
in vec2 a;in float d;uniform vec2 view;out float dist;
void main(){gl_Position=vec4(a.x*2./view.x-1.,1.-a.y*2./view.y,0.,1.);dist=d;}`;
const LFS=`#version 300 es
precision highp float;in float dist;uniform vec4 color;uniform float halfW,dpr,viewH;uniform vec2 tile;uniform sampler2D grain;uniform bool grained;out vec4 o;
void main(){float cov=clamp(halfW*dpr+.5-abs(dist)*dpr,0.,1.)*color.a;if(cov<.0015)discard;vec3 c=color.rgb*cov;
 if(grained){vec4 g=texture(grain,vec2(gl_FragCoord.x,viewH-gl_FragCoord.y)/tile);c*=1.-g.a+g.rgb;}o=vec4(c,cov);}`;
const RAD=Math.PI/180;
// Diagnostics only (?glskip=pieces,dynamic,reels,threads,grain,night,all): leave parts out to measure their cost.
const SKIP=new Set((new URLSearchParams(location.search).get('glskip')||'').split(',').filter(Boolean));
if(new URLSearchParams(location.search).has('reelsDebug'))window.glSkip=SKIP;
const SVGNS='http://www.w3.org/2000/svg';

export function createDawnGL(root,{scale:getScale}){
 const canvas=document.createElement('canvas');canvas.className='dawn-gl-canvas';canvas.setAttribute('aria-hidden','true');
 const gl=canvas.getContext('webgl2',{alpha:false,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'default'});
 if(!gl)return null;
 const $=s=>root.querySelector(s);
 const stageA=$('.dawn-stage-a'),stageB=$('.dawn-stage-b'),sky=$('.dawn-sky'),night=$('.dawn-night');
 const back=$('.dawn-reels-back'),front=$('.dawn-reels-front');

 // ── GL plumbing ──
 const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
 const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);gl.useProgram(prog);
 const U=n=>gl.getUniformLocation(prog,n),uM=U('m'),uView=U('view'),uAlpha=U('alpha'),uColor=U('color'),uMode=U('mode'),uTile=U('tile'),uViewH=U('viewH'),uGrained=U('grained');gl.uniform1i(U('t'),0);gl.uniform1i(U('grain'),1);
 const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);
 const loc=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 // Two samplers: plain bilinear (what the compositor uses) and trilinear for strongly shrunk pieces.
 const bil=gl.createSampler(),tri=gl.createSampler();
 for(const [s,min] of [[bil,gl.LINEAR],[tri,gl.LINEAR_MIPMAP_LINEAR]]){gl.samplerParameteri(s,gl.TEXTURE_MIN_FILTER,min);gl.samplerParameteri(s,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.samplerParameteri(s,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.samplerParameteri(s,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)}
 const rep=gl.createSampler();gl.samplerParameteri(rep,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.samplerParameteri(rep,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.samplerParameteri(rep,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.samplerParameteri(rep,gl.TEXTURE_WRAP_T,gl.REPEAT);
 let texBytes=0;
 const texFrom=(src,mip=true)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);if(mip)gl.generateMipmap(gl.TEXTURE_2D);texBytes+=src.width*src.height*4*(mip?4/3:1);return t};

 // ── Geometry read once from the laid-out DOM (before it is hidden) ──
 let W=1,H=1,dpr=1;
 const px=v=>parseFloat(v)||0;
 function boxOf(node){
  const cs=getComputedStyle(node),[ox,oy]=cs.transformOrigin.split(' ').map(px);
  return{left:px(cs.left),top:px(cs.top),w:px(cs.width),h:px(cs.height),ox,oy};
 }
 // The pieces of stage A in paint order (all z-index:auto, so document order), then the reels.
 const pieceNodes=()=>[...stageA.children].flatMap(n=>n.classList.contains('dawn-reels')?[]:n.classList.contains('dawn-leaves')?[...n.children]:[n]);
 let stats=null,lost=false,pieces=[],reels=[],grainTex=null,fbo=null,fboTex=null,fbo2=null,fbo2Tex=null,ready=false,version=0;

 // An SVG piece's drawn extent, in its CSS box: the viewBox, grown to everything that overflows it.
 function svgExtent(svg,pad=6){
  const vb=svg.viewBox.baseVal,box=boxOf(svg),k=Math.min(box.w/vb.width,box.h/vb.height),tx=(box.w-vb.width*k)/2-vb.x*k,ty=(box.h-vb.height*k)/2-vb.y*k;
  let b;try{b=svg.getBBox({stroke:true})}catch{b=null}
  if(!b||!b.width)b=svg.getBBox();
  // Only the drawn content (most pieces are small shapes on a full 1600×900 canvas): every texel
  // drawn is read from memory each frame, and on a laptop GPU that bandwidth is the limit.
  let x0=b.x-pad,y0=b.y-pad,x1=b.x+b.width+pad,y1=b.y+b.height+pad;
  // Pieces without overflow:visible are clipped to their viewport.
  const vis=svg.getAttribute('overflow')==='visible'||getComputedStyle(svg).overflow==='visible';
  if(!vis){x0=Math.max(x0,-tx/k);y0=Math.max(y0,-ty/k);x1=Math.min(x1,(box.w-tx)/k);y1=Math.min(y1,(box.h-ty)/k)}
  const ux0=x0,uy0=y0,ux1=x1,uy1=y1;
  return{box,k,tx,ty,user:{x:ux0,y:uy0,w:ux1-ux0,h:uy1-uy0},rect:{x:ux0*k+tx,y:uy0*k+ty,w:(ux1-ux0)*k,h:(uy1-uy0)*k}};
 }
 const loadSvg=(markup,w,h)=>new Promise((res,rej)=>{const img=new Image(w,h);img.onload=()=>res(img);img.onerror=rej;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(markup)});
 async function rasterSvg(svg,e,rs){
  const w=Math.max(1,Math.ceil(e.rect.w*rs)),h=Math.max(1,Math.ceil(e.rect.h*rs));
  const markup=`<svg xmlns="${SVGNS}" viewBox="${e.user.x} ${e.user.y} ${e.rect.w/e.k} ${e.rect.h/e.k}" width="${w}" height="${h}" preserveAspectRatio="none">${svg.innerHTML}</svg>`;
  const img=await loadSvg(markup,w,h),c=new OffscreenCanvas(w,h),g=c.getContext('2d');g.drawImage(img,0,0,w,h);
  return{tex:texFrom(c),rect:e.rect,box:e.box,scale:rs};
 }
 // CSS radial-gradient(closest-side, …) on an ellipse, interpolated premultiplied, as the browser does.
 function gradientCanvas(w,h,stops,cw,ch){
  const c=new OffscreenCanvas(cw,ch),g=c.getContext('2d'),img=g.createImageData(cw,ch),d=img.data;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
   const dx=((x+.5)/cw-.5)*2,dy=((y+.5)/ch-.5)*2,t=Math.hypot(dx,dy);let r=0,gg=0,b=0,a=0;
   if(t<1){let i=0;while(i<stops.length-2&&t>stops[i+1][0])i++;const [p0,c0]=stops[i],[p1,c1]=stops[i+1],u=Math.min(1,Math.max(0,(t-p0)/(p1-p0)));
    a=c0[3]+(c1[3]-c0[3])*u;const pm=k=>c0[k]*c0[3]+(c1[k]*c1[3]-c0[k]*c0[3])*u;if(a>0){r=pm(0)/a;gg=pm(1)/a;b=pm(2)/a}}
   const o=(y*cw+x)*4;d[o]=r;d[o+1]=gg;d[o+2]=b;d[o+3]=Math.round(a*255);
  }
  g.putImageData(img,0,0);return c;
 }
 const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];

 async function build(){
  const v=++version,t0=performance.now();ready=false;
  const rect=root.getBoundingClientRect();W=Math.max(1,rect.width);H=Math.max(1,rect.height);dpr=Math.min(2,devicePixelRatio||1);
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  // Sharp at the camera's closest framing (1.22× the stage scale).
  const rs=getScale()*1.22*dpr;
  // Everything that needs layout is read now, synchronously, while the DOM pieces are still shown.
  const shown=root.dataset.render;delete root.dataset.render;
  const plan=pieceNodes().map(node=>{const cls=node.classList,dyn=cls.contains('dawn-character')||cls.contains('dawn-butterfly');
   return{node,cls,dyn,box:boxOf(node),extent:node instanceof SVGSVGElement?svgExtent(node,cls.contains('dawn-character')?130:dyn?30:6):null,leaves:dyn?collectLeaves(node):null}});
  const reelPlan=[...root.querySelectorAll('.dawn-reel')].sort((a,b)=>a.dataset.i-b.dataset.i).map(node=>({node,box:boxOf(node)}));
  const grainCss=getComputedStyle($('.dawn-grain')).backgroundImage,grainUrl=grainCss.startsWith('url("')?grainCss.slice(5,-2):null;
  if(shown)root.dataset.render=shown;
  const next=[];
  for(const {node,cls,dyn,box,extent,leaves} of plan){
   if(dyn){next.push({node,dynamic:true,box,extent,leaves:await rasterLeaves(leaves,rs*1.1)});if(v!==version)return;continue}
   if(cls.contains('dawn-glow')){
    const cw=Math.ceil(box.w*rs/2),ch=Math.ceil(box.h*rs/2);
    const c=gradientCanvas(box.w,box.h,[[0,[250,214,122,.58]],[.55,[251,226,160,.26]],[1,[251,240,214,0]]],cw,ch);
    next.push({node,tex:texFrom(c),rect:{x:0,y:0,w:box.w,h:box.h},box,scale:rs/2});continue;
   }
   const extra=cls.contains('dawn-leaf')?1.4:1;
   next.push({node,...await rasterSvg(node,extent,rs*extra)});
   if(v!==version)return;
  }
  // Reels: the face (border, colour, doodle, chrome) and its glow, masked where the face covers it,
  // so drawing glow then face at the reel's opacity matches the browser fading them as one group.
  const rr=rs*1.1,glowTex={},next2=[];
  for(const {node,box} of reelPlan){
   const color=node.style.getPropertyValue('--reel').trim(),inner=node.querySelector('.dawn-reel-face svg').innerHTML;
   const fw=Math.ceil((ART.REEL_W+4)*rr),fh=Math.ceil((ART.REEL_H+10)*rr);
   const k=Math.min(98/100,178/178),cy=3+(178-178*k)/2;
   const markup=`<svg xmlns="${SVGNS}" viewBox="-2 -2 ${ART.REEL_W+4} ${ART.REEL_H+10}" width="${fw}" height="${fh}">
    <rect x="0" y="5" width="104" height="184" rx="17" fill="rgba(29,33,31,.07)"/>
    <rect x="0" y="0" width="104" height="184" rx="17" fill="#1d211f"/>
    <clipPath id="c"><rect x="3" y="3" width="98" height="178" rx="14"/></clipPath>
    <g clip-path="url(#c)"><rect x="3" y="3" width="98" height="178" fill="${color}"/><g transform="translate(3 ${cy}) scale(${k})">${inner}</g></g></svg>`;
   const img=await loadSvg(markup,fw,fh),c=new OffscreenCanvas(fw,fh);c.getContext('2d').drawImage(img,0,0,fw,fh);
   if(!glowTex[color]){
    const gw=ART.REEL_W*1.84,gh=ART.REEL_H*1.84,cw=Math.ceil(gw*rr/2),ch=Math.ceil(gh*rr/2),rgb=hex(color);
    const g=gradientCanvas(gw,gh,[[0,[...rgb,1]],[1,[...rgb,0]]],cw,ch),gc=g.getContext('2d');
    // Cut out the face (its border box) so the glow never sits beneath it.
    gc.globalCompositeOperation='destination-out';gc.beginPath();gc.roundRect(.42*ART.REEL_W*cw/gw,.42*ART.REEL_H*ch/gh,ART.REEL_W*cw/gw,ART.REEL_H*ch/gh,17*cw/gw);gc.fill();
    glowTex[color]={tex:texFrom(g),rect:{x:-.42*ART.REEL_W,y:-.42*ART.REEL_H,w:gw,h:gh}};
   }
   next2.push({node,glow:node.firstElementChild,box,face:{tex:texFrom(c),rect:{x:-2,y:-2,w:ART.REEL_W+4,h:ART.REEL_H+10}},glowT:glowTex[color]});
   if(v!==version)return;
  }
  // Grain tile: the same 160px tile, repeated at its CSS size.
  if(grainUrl&&!grainTex){const img=new Image();img.src=grainUrl;await img.decode();grainTex=texFrom(img,false)}
  if(v!==version)return;
  texBytes=0;
  for(const p of pieces){if(p.tex)gl.deleteTexture(p.tex);for(const l of p.leaves||[])if(l.tex)gl.deleteTexture(l.tex)}for(const r of reels)gl.deleteTexture(r.face.tex);
  pieces=next;reels=next2;
  if(fboTex)gl.deleteTexture(fboTex);fboTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,fboTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,canvas.width,canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  fbo=fbo||gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,fboTex,0);
  // A second off-screen picture, for a posed piece fading as one group (the character leaving).
  if(fbo2Tex)gl.deleteTexture(fbo2Tex);fbo2Tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,fbo2Tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,canvas.width,canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  fbo2=fbo2||gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo2);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,fbo2Tex,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  stats={buildMs:Math.round(performance.now()-t0),textureMB:+((texBytes+canvas.width*canvas.height*4*3)/1048576).toFixed(1),pieces:pieces.length,reels:reels.length};
  ready=true;
 }

 // ── Per-frame state, read from what the scene wrote ──
 const matrixOf=str=>!str||str==='none'?new DOMMatrix():new DOMMatrix(str);
 const cssOf=(node,prop)=>node.__css?.[prop]??node.style[prop];
 const opacityOf=node=>{const v=cssOf(node,'opacity');return v===''||v==null?1:+v};
 // A piece's CSS-pixel → screen matrix: stage transform, then the piece's box, origin and transform.
 function pieceMatrix(stageM,p,transform){
  const b=p.box;let m=stageM.translate(b.left,b.top);
  if(transform&&transform!=='none'){m=m.translate(b.ox,b.oy).multiply(new DOMMatrix(transform)).translate(-b.ox,-b.oy)}
  return m;
 }
 const tmp=new Float32Array(16);
 function quad(m,rect,tex,alpha,sampler,grained=true){
  if(alpha<=.002)return;gl.uniform1i(uGrained,grained&&grainTex&&!SKIP.has('grain')?1:0);
  const q=m.translate(rect.x,rect.y).scale(rect.w,rect.h,1);
  tmp.set([q.m11,q.m12,q.m13,q.m14,q.m21,q.m22,q.m23,q.m24,q.m31,q.m32,q.m33,q.m34,q.m41,q.m42,q.m43,q.m44]);
  gl.uniformMatrix4fv(uM,false,tmp);gl.uniform1f(uAlpha,alpha);gl.uniform1i(uMode,0);
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.bindSampler(0,sampler||bil);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 }
 // ── Threads ──
 const lprog=gl.createProgram();gl.attachShader(lprog,sh(gl.VERTEX_SHADER,LVS));gl.attachShader(lprog,sh(gl.FRAGMENT_SHADER,LFS));gl.linkProgram(lprog);
 const LU=n=>gl.getUniformLocation(lprog,n),lView=LU('view'),lColor=LU('color'),lHalf=LU('halfW'),lDpr=LU('dpr'),lViewH=LU('viewH'),lTile=LU('tile'),lGrained=LU('grained');
 gl.useProgram(lprog);gl.uniform1i(LU('grain'),1);gl.useProgram(prog);
 const lvao=gl.createVertexArray(),lbuf=gl.createBuffer();gl.bindVertexArray(lvao);gl.bindBuffer(gl.ARRAY_BUFFER,lbuf);
 const la=gl.getAttribLocation(lprog,'a'),ld=gl.getAttribLocation(lprog,'d');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,12,0);gl.enableVertexAttribArray(ld);gl.vertexAttribPointer(ld,1,gl.FLOAT,false,12,8);
 gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
 const strokes=[];let path=[],cur=[0,0];
 const recorder={lineCap:'round',lineJoin:'round',strokeStyle:'#000',globalAlpha:1,lineWidth:1,
  setTransform(){},clearRect(){strokes.length=0},beginPath(){path=[]},
  moveTo(x,y){path.push(x,y);cur=[x,y]},lineTo(x,y){path.push(x,y);cur=[x,y]},
  quadraticCurveTo(cx,cy,x,y){const [x0,y0]=cur;for(let i=1;i<=6;i++){const t=i/6,u=1-t;path.push(u*u*x0+2*u*t*cx+t*t*x,u*u*y0+2*u*t*cy+t*t*y)}cur=[x,y]},
  stroke(){strokes.push({pts:path.slice(),halfW:this.lineWidth/2,alpha:this.globalAlpha,color:parseRgb(String(this.strokeStyle))})}};
 let verts=new Float32Array(4096);
 function strokeMesh(pts,R){
  const out=[],n=pts.length/2;if(n<2)return out;
  const P=i=>[pts[i*2],pts[i*2+1]];
  const norm=(x,y)=>{const l=Math.hypot(x,y)||1;return[-y/l,x/l]};
  const L=[],Rr=[];
  for(let i=0;i<n;i++){
   const [x,y]=P(i),a=P(Math.max(0,i-1)),b=P(Math.min(n-1,i+1));let [nx,ny]=norm(b[0]-a[0],b[1]-a[1]);
   // Miter at interior points, so the band keeps its width through bends.
   if(i>0&&i<n-1){const [sx,sy]=norm(x-a[0],y-a[1]),c=Math.max(.5,nx*sx+ny*sy);nx/=c;ny/=c}
   L.push([x+nx*R,y+ny*R]);Rr.push([x-nx*R,y-ny*R]);
  }
  for(let i=0;i<n-1;i++){out.push(...L[i],R,...Rr[i],-R,...L[i+1],R, ...Rr[i],-R,...Rr[i+1],-R,...L[i+1],R)}
  // Round caps: half-discs beyond each end.
  const cap=(i,j)=>{const [x,y]=P(i),[px,py]=P(j),dx=x-px,dy=y-py,l=Math.hypot(dx,dy)||1,tx=dx/l,ty=dy/l,base=Math.atan2(ty,tx);
   for(let k=0;k<10;k++){const a0=base-Math.PI/2+Math.PI*k/10,a1=base-Math.PI/2+Math.PI*(k+1)/10,c=1/Math.cos(Math.PI/20);
    out.push(x,y,0, x+Math.cos(a0)*R*c,y+Math.sin(a0)*R*c,R*c, x+Math.cos(a1)*R*c,y+Math.sin(a1)*R*c,R*c)}};
  cap(0,1);cap(n-1,n-2);
  return out;
 }
 function drawStrokes(){
  if(!strokes.length)return;
  gl.useProgram(lprog);gl.bindVertexArray(lvao);gl.bindBuffer(gl.ARRAY_BUFFER,lbuf);
  gl.uniform2f(lView,W,H);gl.uniform1f(lDpr,dpr);gl.uniform1f(lViewH,canvas.height);gl.uniform2f(lTile,160*dpr,160*dpr);gl.uniform1i(lGrained,grainTex&&!SKIP.has('grain')?1:0);
  const ranges=[];let all=[];
  for(const st of strokes){const R=st.halfW+1/dpr,m=strokeMesh(st.pts,R);ranges.push([all.length/3,m.length/3,st]);all=all.concat(m)}
  if(verts.length<all.length)verts=new Float32Array(all.length*1.5|0);verts.set(all);
  gl.bufferData(gl.ARRAY_BUFFER,verts.subarray(0,all.length),gl.STREAM_DRAW);
  for(const [first,count,st] of ranges){const c=st.color,a=st.alpha;gl.uniform4f(lColor,c[0]/255*a,c[1]/255*a,c[2]/255*a,a);gl.uniform1f(lHalf,st.halfW);gl.drawArrays(gl.TRIANGLES,first,count)}
  gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.useProgram(prog);
 }
 const shrink=(m,scale)=>Math.sqrt(Math.abs(m.a*m.d-m.b*m.c))/scale;
 function fill(color,alpha){gl.uniform1i(uGrained,grainTex?1:0);tmp.set([W,0,0,0,0,H,0,0,0,0,1,0,0,0,0,1]);gl.uniformMatrix4fv(uM,false,tmp);gl.uniform1i(uMode,1);gl.uniform4f(uColor,color[0]/255,color[1]/255,color[2]/255,1);gl.uniform1f(uAlpha,alpha);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
 const parseRgb=s=>{const m=s.match(/[\d.]+/g);return m?m.slice(0,3).map(Number):[251,246,234]};

 // ── The character and butterfly ──
 // Their shapes never change, only where they are: each shape (torso, head, backpack, rock, hands, shoe,
 // wings…) is rasterised once on its own and drawn every frame through the transforms the scene sets
 // on it and its groups. The limbs are recomputed as two-segment lines each frame (dawn.js), so they
 // are stroked on the GPU: an ink outline, then the sleeve or trouser colour, with round caps and joints.
 const LIMBS='.dawn-arm-far-o,.dawn-arm-far-f,.dawn-arm-near-o,.dawn-arm-near-f,.dawn-leg-o,.dawn-leg-f';
 const PRESENT=['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','fill-rule'];
 function collectLeaves(svg){
  const out=[];
  const walk=(node,chain,inh)=>{
   const st={...inh};for(const k of PRESENT){const v=node.getAttribute(k);if(v!=null)st[k]=v}
   if(node.tagName==='g'){for(const c of node.children)walk(c,[...chain,node],st);return}
   const tag=node.tagName;if(!['path','circle','ellipse','rect'].includes(tag))return;
   if(node.matches(LIMBS)){out.push({kind:'limb',node,chain,color:parseColor(st.stroke),width:+st['stroke-width']});return}
   // Geometry with no transform and, for circles and ellipses, centred on the origin.
   const clone=node.cloneNode(false);for(const k of ['transform','opacity','class','style','cx','cy'])clone.removeAttribute(k);
   const centred=tag==='circle'||tag==='ellipse';
   let b;if(centred){const rx=+(node.getAttribute('rx')??node.getAttribute('r')),ry=+(node.getAttribute('ry')??node.getAttribute('r'));b={x:-rx,y:-ry,width:rx*2,height:ry*2}}else b=node.getBBox();
   const sw=st.stroke&&st.stroke!=='none'?+(st['stroke-width']??1):0,pad=sw*2+2;
   const rect={x:b.x-pad,y:b.y-pad,w:b.width+pad*2,h:b.height+pad*2};
   const attrs=PRESENT.filter(k=>st[k]!=null&&!clone.hasAttribute(k)).map(k=>`${k}="${st[k]}"`).join(' ');
   out.push({kind:'shape',node,chain,centred,rect,markup:`<g ${attrs}>${new XMLSerializer().serializeToString(clone)}</g>`});
  };
  for(const c of svg.children)walk(c,[],{});
  return out;
 }
 async function rasterLeaves(leaves,rs){
  for(const l of leaves){if(l.kind!=='shape')continue;
   const w=Math.max(1,Math.ceil(l.rect.w*rs)),h=Math.max(1,Math.ceil(l.rect.h*rs));
   const img=await loadSvg(`<svg xmlns="${SVGNS}" viewBox="${l.rect.x} ${l.rect.y} ${l.rect.w} ${l.rect.h}" width="${w}" height="${h}">${l.markup}</svg>`,w,h);
   const c=new OffscreenCanvas(w,h);c.getContext('2d').drawImage(img,0,0,w,h);l.tex=texFrom(c);
  }
  return leaves;
 }
 const parseColor=v=>{if(!v||v==='none')return[0,0,0];if(v[0]==='#'){const h=v.length===4?[...v.slice(1)].map(c=>c+c).join(''):v.slice(1);return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}return parseRgb(v)};
 // SVG transform attribute → matrix.
 const TRANSFORM=/(translate|rotate|scale)\(([^)]*)\)/g,SEP=/[\s,]+/,NUM=/-?\d*\.?\d+(?:e-?\d+)?/g;
 function svgMatrix(str,m){
  if(!str)return m;TRANSFORM.lastIndex=0;let r;
  while((r=TRANSFORM.exec(str))){const a=r[2].trim().split(SEP).map(Number);
   if(r[1]==='translate')m=m.translate(a[0],a[1]||0);
   else if(r[1]==='scale')m=m.scale(a[0],a.length>1?a[1]:a[0]);
   else m=a.length>2?m.translate(a[1],a[2]).rotate(a[0]).translate(-a[1],-a[2]):m.rotate(a[0])}
  return m;
 }
 const alphaOf=n=>{let a=n.hasAttribute('opacity')?+n.getAttribute('opacity'):1;const so=n.style?.opacity;if(so!==''&&so!=null)a*=+so;return a};
 function drawLimb(l,m,alpha){
  const nums=(l.node.getAttribute('d')||'').match(NUM);if(!nums||nums.length<4||alpha<=.002)return;
  const pts=[];for(let i=0;i+1<nums.length;i+=2){const q=m.transformPoint({x:+nums[i],y:+nums[i+1]});pts.push(q.x,q.y)}
  const halfW=l.width/2*Math.sqrt(Math.abs(m.a*m.d-m.b*m.c)),R=halfW+1/dpr,mesh=[];
  // Each segment as a capsule; the colour is opaque, so where two meet they simply overlap, like a round join.
  for(let i=0;i+3<pts.length;i+=2)mesh.push(...strokeMesh(pts.slice(i,i+4),R));
  gl.useProgram(lprog);gl.bindVertexArray(lvao);gl.bindBuffer(gl.ARRAY_BUFFER,lbuf);
  gl.uniform2f(lView,W,H);gl.uniform1f(lDpr,dpr);gl.uniform1f(lViewH,canvas.height);gl.uniform2f(lTile,160*dpr,160*dpr);gl.uniform1i(lGrained,grainTex&&!SKIP.has('grain')?1:0);
  if(verts.length<mesh.length)verts=new Float32Array(mesh.length*1.5|0);verts.set(mesh);
  gl.bufferData(gl.ARRAY_BUFFER,verts.subarray(0,mesh.length),gl.STREAM_DRAW);
  const c=l.color;gl.uniform4f(lColor,c[0]/255*alpha,c[1]/255*alpha,c[2]/255*alpha,alpha);gl.uniform1f(lHalf,halfW);gl.drawArrays(gl.TRIANGLES,0,mesh.length/3);
  gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.useProgram(prog);
 }
 function drawDynamic(p,stageM,inGroup){
  const node=p.node,op=opacityOf(node);if(op<=.002||cssOf(node,'visibility')==='hidden')return;
  const e=p.extent,base=pieceMatrix(stageM,p,cssOf(node,'transform')).translate(e.tx,e.ty).scale(e.k);
  // Fading as one picture: draw it apart, then lay it down at its opacity.
  const group=op<.999&&!inGroup;
  if(group){gl.bindFramebuffer(gl.FRAMEBUFFER,fbo2);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}
  const mats=new Map(),alphas=new Map();
  const chainOf=chain=>{let m=base,a=1;for(const g of chain){if(!mats.has(g)){mats.set(g,svgMatrix(g.getAttribute('transform'),m));alphas.set(g,a*alphaOf(g))}m=mats.get(g);a=alphas.get(g)}return[m,a]};
  const each=group?1:op;
  for(const l of p.leaves){
   let [m,a]=chainOf(l.chain);a*=alphaOf(l.node)*each;if(a<=.002)continue;
   if(l.kind==='limb'){drawLimb(l,m,a);continue}
   m=svgMatrix(l.node.getAttribute('transform'),m);
   if(l.centred)m=m.translate(+(l.node.getAttribute('cx')||0),+(l.node.getAttribute('cy')||0));
   quad(m,l.rect,l.tex,a,bil);
  }
  if(group){gl.bindFramebuffer(gl.FRAMEBUFFER,null);quad(new DOMMatrix().scale(W,H).translate(0,1).scale(1,-1),{x:0,y:0,w:1,h:1},fbo2Tex,op,bil,false)}
 }

 function drawReels(list,stageM){
  const items=[];
  list.forEach((r,dom)=>{if(cssOf(r.node,'visibility')!=='visible')return;const op=opacityOf(r.node);if(op<=.002)return;items.push({r,z:+(cssOf(r.node,'zIndex')||0),dom,op})});
  items.sort((a,b)=>a.z-b.z||a.dom-b.dom);
  for(const {r,op} of items){
   const m=pieceMatrix(stageM,r,cssOf(r.node,'transform'));
   const sampler=shrink(m,1)*dpr<.6*1.1?tri:bil;
   quad(m,r.glowT.rect,r.glowT.tex,op*opacityOf(r.glow),sampler);
   quad(m,r.face.rect,r.face.tex,op,sampler);
  }
 }
 let reelIndex=new Map();

 function frame(){
  if(!ready||lost)return false;
  gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uView,W,H);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,grainTex);gl.bindSampler(1,rep);gl.uniform2f(uTile,160*dpr,160*dpr);gl.uniform1f(uViewH,canvas.height);
  gl.activeTexture(gl.TEXTURE0);
  const skyC=parseRgb(cssOf(sky,'backgroundColor')||'rgb(251,246,234)');
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);fill(skyC,1);
  const stageM=matrixOf(cssOf(stageA,'transform')),stageOp=opacityOf(stageA);
  // The arrival fades stage A in as one picture: draw it apart, then lay it down at that opacity.
  const group=stageOp<.999;
  if(group){gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}
  if(SKIP.has('all'))return true;
  for(const p of pieces){
   if(p.dynamic){if(!SKIP.has('dynamic'))drawDynamic(p,stageM,group);continue}
   if(SKIP.has('pieces'))continue;
   const n=p.node;if(cssOf(n,'visibility')==='hidden'||cssOf(n,'display')==='none')continue;
   const m=pieceMatrix(stageM,p,cssOf(n,'transform'));
   quad(m,p.rect,p.tex,opacityOf(n),shrink(m,1)*dpr<.6*p.scale?tri:bil);
  }
  if(reelIndex.size!==reels.length){reelIndex=new Map();reels.forEach(r=>reelIndex.set(r.node,r))}
  const ordered=c=>[...c.children].map(n=>reelIndex.get(n)).filter(Boolean);
  if(!SKIP.has('reels'))drawReels(ordered(back),stageM);
  if(group){gl.bindFramebuffer(gl.FRAMEBUFFER,null);quad(new DOMMatrix().scale(W,H).translate(0,1).scale(1,-1),{x:0,y:0,w:1,h:1},fboTex,stageOp,bil,false)}
  // Night, threads, front reels, grain.
  const nightOp=opacityOf(night);if(nightOp>.002&&!SKIP.has('night'))fill([5,4,10],nightOp);
  if(!SKIP.has('threads'))drawStrokes();
  if(!SKIP.has('reels'))drawReels(ordered(front),matrixOf(cssOf(stageB,'transform')));
  return true;
 }

 root.querySelector('.dawn-sky').after(canvas);
 let onLost=null;
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;ready=false;onLost?.()});
 return{canvas,build,frame,recorder,get ready(){return ready&&!lost},get lost(){return lost},get stats(){return stats},set onLost(fn){onLost=fn},destroy(){canvas.remove();const l=gl.getExtension('WEBGL_lose_context');l?.loseContext()}};
}
