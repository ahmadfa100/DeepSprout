// One full-screen pass. Curved ray integration approximates Schwarzschild light
// deflection; disk-plane crossings reveal the near disk and its lensed far side.
// This is an artistic approximation, not a scientific ray tracer.
const vertex = `attribute vec2 position; varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 uv;
uniform vec2 resolution;
uniform float progress;
uniform float mobile;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
vec3 disk(vec3 pos){
 float r=length(pos.xz),a=atan(pos.z,pos.x),flow=a+progress*1.7;
 float cloud=noise(vec2(r*13.,flow*9.));
 float fine=noise(vec2(r*62.,flow*24.));
 float striation=.5+.5*sin(r*163.+cloud*7.+sin(flow*5.)*1.8);
 float mask=smoothstep(2.55,2.8,r)*(1.-smoothstep(4.8,6.8,r));
 float heat=pow(2.7/max(r,2.7),2.7);
 float doppler=clamp(1.-pos.x/r*.46,.5,1.5);
 vec3 warm=mix(vec3(.72,.25,.058),vec3(1.,.83,.56),pow(heat,.65));
 warm=mix(warm,vec3(1.,.94,.78),pow(heat,3.)*.6);
 return warm*mask*(.28+cloud*.72+fine*.45+striation*.35)*heat*doppler*2.4;
}
void main(){
 float approach=smoothstep(.12,.76,progress);
 vec2 center=mix(vec2(.68,.50),vec2(.50,.43),mobile);
 vec2 q=(uv-center)*vec2(resolution.x/resolution.y,1.)*2.;
 float roll=mix(-.22,-.16,approach);
 q=mat2(cos(roll),-sin(roll),sin(roll),cos(roll))*q;
 float distance=mix(13.6,9.4,approach);
 vec3 origin=vec3(0.,distance*.105,distance);
 vec3 forward=normalize(-origin),right=vec3(1.,0.,0.),up=normalize(cross(right,forward));
 float fov=mix(.73,.93,mobile);
 vec3 velocity=normalize(forward+(q.x*right+q.y*up)*fov);
 vec3 pos=origin,light=vec3(0.);
 float angular=dot(cross(pos,velocity),cross(pos,velocity));
 float transmission=1.,captured=0.;
 for(int i=0;i<112;i++){
  float r=length(pos);
  if(r<1.02){captured=1.;break;}
  if(r>19.)break;
  float stepSize=clamp(r*.09,.055,.38);
  vec3 acceleration=-1.5*angular*pos/pow(r,5.);
  vec3 next=pos+velocity*stepSize+.5*acceleration*stepSize*stepSize;
  if(pos.y*next.y<0.){
   vec3 crossing=mix(pos,next,pos.y/(pos.y-next.y));
   float radius=length(crossing.xz);
   if(radius>2.55&&radius<6.8){light+=disk(crossing)*transmission;transmission*=.36;}
  }
  float nextR=length(next);
  velocity+=.5*(acceleration-1.5*angular*next/pow(max(nextR,.8),5.))*stepSize;
  pos=next;
 }
 // Sparse background light follows the deflected ray. No animated noise clock.
 vec2 sky=normalize(velocity).xy*180.;
 vec2 cell=floor(sky),local=fract(sky)-.5;
 float star=step(.997,hash(cell))*exp(-dot(local,local)*180.)*.2;
 vec3 background=vec3(.004,.007,.008)+vec3(.61,.71,.73)*star;
 light+=background*(1.-captured)*transmission;
 // Soft optical scattering confined to the disk; the central void stays black.
 float halo=exp(-abs(length(q*vec2(1.,2.8))-.59)*8.)*.012;
 light+=vec3(.65,.27,.08)*halo*(1.-captured);
 light*=mix(.38,1.,smoothstep(-.32,.10,q.y));
 light=vec3(1.)-exp(-light*1.5);
 light=pow(light,vec3(.92));
 gl_FragColor=vec4(light,1.);
}`;

export function createEventHorizon(canvas, {onState, invalidate}) {
 const listeners = new AbortController();
 let gl, program, buffer, uniforms, disposed = false, lost = false;
 let quality = Math.min(devicePixelRatio || 1, innerWidth <= 700 ? 1 : 1.25);
 let width = 0, height = 0, frames = 0, totalCost = 0, lastProgress = 0;
 const objects = [];
 function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
   gl.deleteShader(shader); throw new Error('Event horizon shader unavailable');
  }
  objects.push(shader); return shader;
 }
 try {
  gl = canvas.getContext('webgl', {alpha:false, antialias:false, depth:false, stencil:false, powerPreference:'low-power'});
  if (!gl) throw new Error('WebGL unavailable');
  program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Event horizon program unavailable');
  gl.useProgram(program);
  buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  uniforms = Object.fromEntries(['resolution','progress','mobile'].map(key => [key,gl.getUniformLocation(program,key)]));
 } catch {
  dispose(); onState('unavailable'); return {render(){},resize(){},destroy(){},get state(){return {available:false,frames:0};}};
 }
 function resize() {
  if (disposed || lost) return;
  const rect = canvas.getBoundingClientRect();
  width = Math.max(1, Math.round(rect.width * quality)); height = Math.max(1, Math.round(rect.height * quality));
  canvas.width = width; canvas.height = height; gl.viewport(0,0,width,height);
 }
 function render(progress) {
  if (disposed || lost) return;
  const start = performance.now(); lastProgress = progress;
  gl.uniform2f(uniforms.resolution,width,height);
  gl.uniform1f(uniforms.progress,progress); gl.uniform1f(uniforms.mobile,innerWidth<=700||(innerWidth<=1000&&innerHeight>innerWidth)?1:0);
  gl.drawArrays(gl.TRIANGLES,0,3); frames++; totalCost += performance.now()-start;
  // CPU submission pressure is a conservative signal; cap pixel count regardless.
  if (frames%30===0 && totalCost/30>12 && quality>.7) {quality=Math.max(.7,quality-.2);resize();}
  if (frames%30===0) totalCost=0;
 }
 function dispose() {
  if (disposed) return;
  disposed = true; listeners.abort();
  if (gl) {if(buffer)gl.deleteBuffer(buffer); if(program)gl.deleteProgram(program); objects.forEach(shader=>gl.deleteShader(shader));}
 }
 canvas.addEventListener('webglcontextlost', event => {event.preventDefault();lost=true;onState('unavailable');}, {signal:listeners.signal});
 // Recreate rather than using invalidated handles after context restoration.
 canvas.addEventListener('webglcontextrestored', () => {onState('restore');invalidate();}, {signal:listeners.signal});
 resize(); render(0); onState('ready');
 return {render,resize,destroy:dispose,get state(){return {available:!lost&&!disposed,frames,quality,width,height,progress:lastProgress};}};
}
