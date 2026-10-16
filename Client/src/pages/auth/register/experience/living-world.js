/** One persistent geometry: botanical roots unfold into a community.
 * Interaction handlers only consume event kind/position, never field values.
 * Bounded envelopes and signals replace per-keystroke animation timelines.
 */
export function createLivingWorld(host, initialMode = 'individual') {
  host.innerHTML = `<div class="world-heading"><span class="world-eyebrow">A PLACE TO BECOME</span><h2>A little intention.<br>A new beginning.</h2><p>Grow at your own pace.<br>Find connection along the way.</p></div><div class="world-art"><canvas aria-hidden="true"></canvas><span class="world-label label-one">YOUR OWN PACE</span><span class="world-label label-two">ROOM TO GROW</span></div><div class="world-caption"><span></span><p>Small beginnings. Meaningful connections.</p></div>`;
  host.setAttribute('aria-hidden', 'true');
  const canvas = host.querySelector('canvas'), ctx = canvas.getContext('2d');
  const media = matchMedia('(prefers-reduced-motion: reduce)'), coarse = matchMedia('(pointer: coarse)');
  const abort = new AbortController(), options = {signal: abort.signal};
  let mode = initialMode, blend = mode === 'partner' ? 1 : 0, target = blend;
  let raf = 0, last = 0, clock = 0, intensity = 0, focus = false, disposed = false;
  let pointer = {x: 320, y: 270}, smooth = {...pointer}, waves = [], signals = [], lastSignal = -Infinity;
  let activeUntil = 0, quality = 1, slowFrames = 0, width = 640, height = 520;
  // Stable topology, no random objects or continually growing per-node history.
  const roots = [[320,290],[282,332],[359,337],[244,362],[298,383],[379,389],[413,348],[204,394],[253,428],[322,437],[398,436],[457,385],[171,424]];
  const network = [[320,268],[222,205],[407,198],[160,290],[250,347],[394,348],[480,268],[102,206],[162,410],[320,425],[465,411],[538,355],[82,352]];
  const edges = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7],[3,8],[4,9],[5,10],[6,11],[7,12],[4,5]];
  const mix = (a,b,t) => a + (b-a)*t;
  const point = (i,t) => {
    const a=roots[i], b=network[i], depth=(i%3+1)*.22;
    const breathing=media.matches?0:Math.sin(clock*.00065+i*.7)*(focus?1:2.5);
    return {x:mix(a[0],b[0],blend)+(smooth.x-320)*.024*depth+breathing,
      y:mix(a[1],b[1],blend)+(smooth.y-270)*.018*depth+breathing*.6};
  };
  const curve = (a,b) => [a.x, a.y+(b.y-a.y)*.6, b.x, b.y-(b.y-a.y)*.35];
  const bezier = (a,b,t) => {const c=curve(a,b),u=1-t;return {x:u*u*u*a.x+3*u*u*t*c[0]+3*u*t*t*c[2]+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c[1]+3*u*t*t*c[3]+t*t*t*b.y};};
  function path(a,b) {const c=curve(a,b);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(...c,b.x,b.y);ctx.stroke();}
  function circle(x,y,r,fill,stroke) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function leaf(x,y,angle,size,opacity=1) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=opacity;
    const g=ctx.createLinearGradient(0,0,size,-size);g.addColorStop(0,'#6f996e');g.addColorStop(1,'#d4dfb8');
    ctx.fillStyle=g;ctx.strokeStyle='#72946c';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-8,-size*.65,size*.45,-size,size,-size);ctx.bezierCurveTo(size*.95,-size*.2,size*.35,5,0,0);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#f0f4deaa';ctx.beginPath();ctx.moveTo(2,-2);ctx.quadraticCurveTo(size*.45,-size*.5,size*.88,-size*.87);ctx.stroke();ctx.restore();
  }
  function glyph(p,i,alpha) {
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);ctx.strokeStyle='#4c7460';ctx.lineWidth=1.5;ctx.lineCap='round';
    if(i===1){circle(0,-5,4,null,'#4c7460');ctx.beginPath();ctx.arc(0,7,8,Math.PI,0);ctx.stroke();}
    if(i===2){ctx.strokeRect(-9,-4,18,13);ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(0,-12);ctx.lineTo(12,-5);ctx.moveTo(-3,9);ctx.lineTo(-3,0);ctx.lineTo(3,0);ctx.lineTo(3,9);ctx.stroke();}
    if(i===5){ctx.beginPath();ctx.moveTo(-12,8);ctx.lineTo(-3,-9);ctx.lineTo(4,2);ctx.lineTo(8,-4);ctx.lineTo(14,8);ctx.closePath();ctx.stroke();}
    ctx.restore();
  }
  function draw(now) {
    ctx.clearRect(0,0,width,height);ctx.save();
    const scale=Math.min(width/640,height/520);ctx.translate((width-640*scale)/2,(height-520*scale)/2);ctx.scale(scale,scale);
    const glow=ctx.createRadialGradient(320,275,15,320,275,240);glow.addColorStop(0,`rgba(211,226,181,${.38+intensity*.12})`);glow.addColorStop(1,'rgba(211,226,181,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,640,520);
    // Fine orbit contours situate both identities in the same world.
    ctx.strokeStyle='#718a6430';ctx.lineWidth=.75;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(320,294,183+i*36,146+i*29,-.26,0,Math.PI*2);ctx.stroke();}
    ctx.setLineDash([2,9]);ctx.beginPath();ctx.ellipse(320,294,271,218,-.26,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    const pts=roots.map((_,i)=>point(i,now));
    edges.forEach(([a,b],i)=>{if(width<500&&(a>9||b>9))return;ctx.lineWidth=i<2?1.8:1;ctx.strokeStyle=`rgba(103,137,103,${.28+blend*.15+intensity*.14})`;path(pts[a],pts[b]);});
    // The stem remains the shared center; leaves gently fold as relationships open.
    ctx.save();ctx.globalAlpha=1-blend*.87;ctx.strokeStyle='#63865c';ctx.lineWidth=2.4;
    const sway=media.matches?0:Math.sin(clock*.0011)*2+intensity*2;
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);ctx.bezierCurveTo(310,245,340+sway,218,320+sway,156);ctx.stroke();
    leaf(325+sway,213,-.12,63);leaf(325+sway,232,-1.55,52);leaf(324+sway,180,-.32,38);
    ctx.restore();
    pts.forEach((p,i)=>{
      if(width<500&&i>9)return;
      let pulse=intensity*(i%3===0?.7:.25);
      waves.forEach(w=>{const age=(now-w.time)/1300,dist=Math.hypot(p.x-w.x,p.y-w.y);pulse=Math.max(pulse,Math.max(0,1-Math.abs(dist-age*480)/42)*(1-age));});
      if(pulse>.02)circle(p.x,p.y,12+pulse*14,`rgba(154,187,124,${pulse*.18})`);
      const big=[1,2,5].includes(i),r=mix(i===0?4:2.3,big?24:i===0?12:5,blend);
      ctx.lineWidth=1;circle(p.x,p.y,r,'#f9faee',`rgba(103,137,103,${.45+blend*.25})`);
      if(big)glyph(p,i,blend);else circle(p.x,p.y,Math.max(1.3,r*.32),`rgba(103,137,103,${.5+pulse*.4})`);
      if(i===7||i===10)leaf(p.x,p.y,i===7?-1.7:.1,15,(1-blend)*.65);
    });
    if(!media.matches){
      signals.forEach(s=>{const progress=(now-s.time)/1050;if(progress<0||progress>1)return;const [a,b]=edges[s.edge];if(width<500&&(a>9||b>9))return;const p=bezier(pts[a],pts[b],progress);circle(p.x,p.y,8,'#b7d49622');circle(p.x,p.y,2.6,'#7c9b61');});
      waves.forEach(w=>{const age=(now-w.time)/1300;ctx.lineWidth=1;ctx.strokeStyle=`rgba(123,153,102,${(1-age)*.3})`;ctx.beginPath();ctx.ellipse(w.x,w.y,age*240,age*(mode==='partner'?240:130),-.2,0,Math.PI*2);ctx.stroke();});
    }
    ctx.restore();
  }
  function tick(now) {
    raf=0;if(disposed||document.hidden)return;
    const delta=Math.min(64,now-last||16);if(last&&delta< (now<activeUntil?16:33)*quality-1){raf=requestAnimationFrame(tick);return;}
    if(delta>48&&++slowFrames>20)quality=1.5;
    last=now;clock+=delta;
    const ease=1-Math.exp(-delta/220);blend=media.matches?target:mix(blend,target,ease);
    smooth.x=mix(smooth.x,pointer.x,ease);smooth.y=mix(smooth.y,pointer.y,ease);
    intensity*=Math.exp(-delta/420);waves=waves.filter(w=>now-w.time<1300);signals=signals.filter(s=>now-s.time<1050);
    draw(now);
    if(!media.matches)raf=requestAnimationFrame(tick);
  }
  function wake(){if(ctx&&!raf&&!disposed&&!document.hidden)raf=requestAnimationFrame(tick);}
  function signal(kind='typing',index=0){
    host.dataset.activity=kind;const now=performance.now();intensity=Math.min(1,intensity+.24);activeUntil=now+1300;
    if(now-lastSignal>110){signals.push({time:now,edge:Math.abs(index)%edges.length});signals=signals.slice(-4);lastSignal=now;}
    wake();
  }
  function setMode(next){focus=false;host.dataset.attentive='false';mode=next==='partner'?'partner':'individual';target=mode==='partner'?1:0;host.dataset.mode=mode;
    host.querySelector('.label-one').textContent=target?'SHARED PURPOSE':'YOUR OWN PACE';
    host.querySelector('.label-two').textContent=target?'GROWING TOGETHER':'ROOM TO GROW';signal('selection',target?2:0);}
  function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);wake();}
  function position(event){const r=canvas.getBoundingClientRect(),s=Math.min(r.width/640,r.height/520);return {x:(event.clientX-r.left-(r.width-640*s)/2)/s,y:(event.clientY-r.top-(r.height-520*s)/2)/s};}
  const listen=(el,event,fn,extra={})=>el.addEventListener(event,fn,{...options,...extra});
  listen(document,'pointermove',e=>{if(coarse.matches||media.matches)return;const p=position(e);pointer={x:Math.max(0,Math.min(640,p.x)),y:Math.max(0,Math.min(520,p.y))};},{passive:true});
  listen(document,'pointerdown',e=>{if(e.target.closest('a,button,input,textarea,select,label,summary,dialog,.register-card,.auth-form,.demo-panel'))return;const p=position(e);waves.push({...p,time:performance.now()});waves=waves.slice(-5);const nearest=roots.reduce((best,_,i)=>Math.hypot(point(i).x-p.x,point(i).y-p.y)<best.d?{i,d:Math.hypot(point(i).x-p.x,point(i).y-p.y)}:best,{i:0,d:Infinity});signal('background',nearest.i);},{passive:true});
  listen(document,'focusin',e=>{if(e.target.matches('input,textarea,select')){focus=true;host.dataset.attentive='true';signal('focus',Array.from(e.target.form?.elements||[]).indexOf(e.target));}});
  listen(document,'focusout',()=>{focus=false;host.dataset.attentive='false';});
  listen(document,'input',e=>{if(e.target.matches('input,textarea,select'))signal('typing',Array.from(e.target.form?.elements||[]).indexOf(e.target));});
  listen(document,'invalid',()=>signal('invalid'),{capture:true});
  listen(document,'visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;last=0;if(!document.hidden)wake();});
  listen(media,'change',()=>{cancelAnimationFrame(raf);raf=0;intensity=0;waves=[];signals=[];wake();});
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  function destroy(){disposed=true;abort.abort();observer.disconnect();cancelAnimationFrame(raf);raf=0;waves=[];signals=[];host.remove();}
  if(!ctx){host.classList.add('world-unavailable');return {setMode:()=>{},signal:()=>{},destroy};}
  setMode(mode);resize();
  return {setMode,signal,destroy};
}
