export const planeVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const vortexVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
// Continuous polar turbulence, with logarithmic arms converging into a dark throat.
// No background image replacement: alpha brings this atmosphere into the same world.
export const vortexFragment=`
precision highp float;
varying vec2 vUv;
uniform float uProgress,uTime,uAspect;
uniform vec2 uCenter;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(.8,-.6,.6,.8);for(int i=0;i<3;i++){v+=a*noise(p);p=m*p*2.04+3.71;a*=.5;}return v;}
void main(){
 float birth=smoothstep(.50,.78,uProgress),capture=smoothstep(.76,.98,uProgress);
 vec2 q=vUv-uCenter;q.x*=uAspect;float r=length(q);float a=atan(q.y,q.x);
 float phase=uProgress*8.+uTime*.10;
 float spiral=a+log(r+.032)*2.35-phase;
 vec2 flow=vec2(cos(spiral),sin(spiral))*(2.+r*5.);
 float cloud=fbm(flow+vec2(r*12.,phase*.5));
 float folds=fbm(flow*3.4+cloud*2.);
 float detail=fbm(flow*11.+cloud*7.);
 float ribbon=pow(.5+.5*sin(spiral*5.+cloud*6.+detail*.5),16.);
 float thread=pow(.5+.5*sin(spiral*5.+cloud*6.+detail*.5+folds*.55),110.);
 float thread2=pow(.5+.5*sin(spiral*9.+folds*3.+r*15.),85.);
 float core=smoothstep(.035,.145,r);
 float rim=exp(-abs(r-(.08+.014*sin(a*3.+phase)))*55.);
 float aperture=1.-smoothstep(.11,.34,r);
 vec3 ink=vec3(.022,.012,.09);
 vec3 cloudColor=mix(vec3(.07,.025,.22),vec3(.30,.09,.53),cloud);
 vec3 color=cloudColor*(.35+cloud*1.2);
 color+=vec3(.32,.06,.75)*ribbon*(.35+folds);
 color+=vec3(.40,.19,.70)*pow(folds,2.)*2.2;
 color+=vec3(.46,.14,.84)*smoothstep(.48,.72,detail)*cloud*1.1;
 color+=vec3(1.,.23,.77)*thread*1.15;
 color+=vec3(.35,.25,1.)*thread2*.85;
 color+=vec3(1.,.62,.22)*pow(thread2,2.)*smoothstep(.56,.75,cloud)*1.7;
 color+=vec3(.53,.16,1.)*rim*.6;
 color=mix(ink,color,core);
 color*=.8+smoothstep(.7,.83,uProgress)*.35;
 float edge=smoothstep(.12,.9,r);
 float alpha=birth*(mix(.32,.995,capture)+ribbon*.38+thread*.35+aperture*.48);
 alpha=clamp(alpha,0.,.98);
 // Premultiplied-like dark edge shaping keeps the eye on the character and throat.
 color*=1.-edge*.26;
 gl_FragColor=vec4(color,alpha);
}`;
export const cardFragment=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap,uChrome;
uniform float uOpacity,uGlow,uBlur,uCrop;
float roundedBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
void main(){
 vec2 q=(vUv-.5)*vec2(1.,1.72);float d=roundedBox(q,vec2(.442,.79),.052);
 float body=1.-smoothstep(-.007,.002,d);
 float halo=exp(-max(d,0.)*37.)*uGlow*.65*(1.-body);
 vec2 uv=(vUv-.5)*vec2(1.12,1.09)+.5;uv=(uv-.5)*uCrop+.5;
 vec4 media=texture2D(uMap,clamp(uv,.002,.998));
 if(uBlur>.001){vec2 b=vec2(.018,.012)*uBlur;media=(media*2.+texture2D(uMap,uv+b)+texture2D(uMap,uv-b)+texture2D(uMap,uv+vec2(b.x,-b.y))+texture2D(uMap,uv+vec2(-b.x,b.y)))/6.;}
 vec4 ui=texture2D(uChrome,vUv);
 vec3 color=mix(media.rgb,ui.rgb,ui.a);
 float border=1.-smoothstep(.0,.012,abs(d+.008));
 color+=border*mix(vec3(.9,.98,.88),vec3(.9,.4,1.0),uGlow)*1.15;
 vec3 glow=vec3(.7,.15,1.)*halo;
 gl_FragColor=vec4(mix(glow,color,body),max(body,halo)*uOpacity);
}`;
