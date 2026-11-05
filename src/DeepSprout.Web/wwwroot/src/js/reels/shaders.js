export const planeVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const vortexVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
// Continuous polar turbulence, with logarithmic arms converging into a dark throat.
// No background image replacement: alpha brings this atmosphere into the same world.
// From the burst on, the same storm is seen through a gravitational lens around a procedural
// black hole: a #05040a shadow, a photon ring, and a tilted accretion disk whose far side is bent
// over the top of the shadow. All of it is a function of the scroll-driven uniforms.
export const vortexFragment=`
precision highp float;
varying vec2 vUv;
uniform float uProgress,uTime,uAspect,uExit,uDisk,uDark,uTilt,uSpin;
uniform vec2 uCenter;
uniform vec4 uHole;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(.8,-.6,.6,.8);for(int i=0;i<3;i++){v+=a*noise(p);p=m*p*2.04+3.71;a*=.5;}return v;}
// The original storm, unchanged, evaluated at any (possibly lensed) screen point.
vec4 storm(vec2 uv){
 float birth=smoothstep(.50,.78,uProgress),capture=smoothstep(.76,.98,uProgress);
 vec2 q=uv-uCenter;q.x*=uAspect;float r=length(q);float a=atan(q.y,q.x);
 float phase=uProgress*8.+uTime*.10+uExit*uExit*32.;
 float warpedRadius=r*(1.+uExit*uExit*7.);
 float spiral=a+log(warpedRadius+.032)*2.35-phase;
 vec2 flow=vec2(cos(spiral),sin(spiral))*(2.+r*5.);
 float cloud=fbm(flow+vec2(r*12.,phase*.5));
 float folds=fbm(flow*3.4+cloud*2.);
 float detail=fbm(flow*11.+cloud*7.);
 float ribbon=pow(.5+.5*sin(spiral*5.+cloud*6.+detail*.5),16.);
 float thread=pow(.5+.5*sin(spiral*5.+cloud*6.+detail*.5+folds*.55),110.);
 float thread2=pow(.5+.5*sin(spiral*9.+folds*3.+r*15.),85.);
 float core=smoothstep(.035+uExit*.045,.145+uExit*.075,r);
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
 color=mix(mix(ink,vec3(.004,.002,.012),uExit),color,core);
 color*=.8+smoothstep(.7,.83,uProgress)*.35;
 float edge=smoothstep(.12,.9,r);
 float alpha=birth*(mix(.32,.995,capture)+ribbon*.38+thread*.35+aperture*.48);
 alpha=clamp(alpha,0.,.98);
 alpha=mix(alpha,1.,smoothstep(0.,.12,uExit));
 color*=1.-edge*.26;
 return vec4(color,alpha);
}
// Blackbody-like ramp: deep ember, amber, gold, white-hot.
vec3 heat(float t){
 vec3 c=mix(vec3(.09,.022,.012),vec3(.55,.17,.045),smoothstep(0.,.32,t));
 c=mix(c,vec3(.96,.52,.16),smoothstep(.22,.66,t));
 c=mix(c,vec3(1.,.80,.50),smoothstep(.58,1.05,t));
 return mix(c,vec3(1.,.96,.88),smoothstep(.98,1.6,t));
}
// A thin disk in its own plane, in units of the shadow radius. Keplerian shear: inner gas laps
// the outer gas, so the filaments wind as gravity (uSpin) grows. Approaching side (left) is beamed.
vec4 disk(vec2 d){
 float rho=length(d);
 float inner=2.05,outer=6.4;
 float body=smoothstep(inner-.2,inner+.45,rho)*(1.-smoothstep(outer*.5,outer,rho));
 if(body<.001)return vec4(0.);
 float a=atan(d.y,d.x)+(uSpin+uTime*.06)*pow(inner/rho,1.5);
 vec2 c=vec2(cos(a),sin(a));
 float bands=fbm(vec2(rho*4.2,1.7)+c*1.35);
 float fil=fbm(vec2(rho*15.,-2.3)+c*2.6+bands*1.6);
 float clumps=smoothstep(.35,.85,fbm(c*3.1+vec2(rho*1.3,4.1)));
 float beam=pow(max(1.-.3*d.x/rho,.05),2.)/1.1;
 float temp=pow(inner/rho,1.25)*body;
 float I=temp*beam*(.42+.95*bands)*(.55+.95*fil*fil+.35*clumps);
 return vec4(heat(I*1.3)*I*1.6,clamp(I*2.1,0.,1.)*body);
}
void main(){
 vec2 h=vUv-uHole.xy;h.x*=uAspect;float r=length(h);
 float R=max(uHole.z,1e-4),lens=uHole.w,E=R*1.75;
 // A softened point lens: maps each pixel back to where its light left the source plane.
 // It never inverts, so the storm, the stars and the far disk bend continuously.
 vec2 beta=h*(1.-lens*E*E/(r*r+E*E));
 vec4 s=storm(uHole.xy+vec2(beta.x/uAspect,beta.y));
 vec3 color=s.rgb;float alpha=s.a;
 // The purple storm cools into deep charcoal as the hole takes over; its light piles up near the
 // Einstein radius, where the lens magnifies it.
 float lum=dot(color,vec3(.3,.5,.2));
 color=mix(color,vec3(lum)*vec3(.64,.60,.74),uDark*.85)*mix(1.,.2,uDark);
 color*=1.+lens*.55*exp(-pow((r-E)/(R*.9),2.));
 // Sparse distant matter, in lensed coordinates, so it visibly curves around the shadow.
 vec2 sp=(uHole.xy+vec2(beta.x/uAspect,beta.y))*vec2(uAspect,1.)*190.;vec2 id=floor(sp);
 float st=step(.9935,hash(id))*smoothstep(.42,.0,length(fract(sp)-.5-.3*(vec2(hash(id+3.1),hash(id+7.7))-.5)));
 color+=vec3(1.,.9,.78)*st*lens*.55*(.4+.6*hash(id+1.3));
 // Disk: far half through the lens (it arcs over the top of the shadow), near half almost direct.
 float tilt=uTilt;
 vec2 far=vec2(beta.x,beta.y/tilt)/R;
 float w=smoothstep(R*.9,R*2.8,r)*lens;
 vec2 nb=mix(h,beta,w);vec2 near=vec2(nb.x,nb.y/tilt)/R;
 float outside=smoothstep(R*.985,R*1.025,r);
 vec4 back=disk(far)*step(0.,far.y)*outside*uDisk;
 vec4 front=disk(near)*step(near.y,0.)*uDisk;
 color=color*(1.-back.a*.8)+back.rgb;
 // Photon ring and a restrained inner glow, beamed like the disk.
 float side=pow(max(1.-.5*h.x/max(r,1e-4),.1),2.);
 float ring=exp(-pow((r-R*1.022)/(R*.011),2.))*.75+.16*exp(-max(r-R,0.)/(R*.12))*outside;
 color+=mix(vec3(1.,.84,.62),vec3(.8,.88,1.),.15)*ring*side*uDisk;
 color+=vec3(.95,.5,.18)*exp(-pow(abs(h.y)/(R*.55*tilt*5.),2.))*exp(-r/(R*4.5))*uDisk*.16;
 // The event horizon: an absence of light, in exactly the void's colour.
 vec3 voidInk=vec3(5.,4.,10.)/255.;
 float shadow=(1.-outside)*smoothstep(0.,.02,R)*step(.0005,uHole.z);
 color=mix(color,voidInk,shadow);
 // The near side of the disk crosses in front of the shadow.
 color=color*(1.-front.a*.85)+front.rgb;
 alpha=max(max(alpha,shadow),max(front.a,back.a));
 gl_FragColor=vec4(color,clamp(alpha,0.,1.));
}`;
export const cardFragment=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap,uChrome;
uniform float uOpacity,uGlow,uBlur,uCrop,uWarm,uShade;
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
 // Near the hole, cards are lit by the disk: exposure follows depth, the rim turns warm, the halo tightens.
 color*=mix(1.,uShade,uWarm);
 float rim=smoothstep(.25,-.79,q.y)*.55+.45;
 float border=1.-smoothstep(.0,.012,abs(d+.008));
 color+=border*mix(mix(vec3(.9,.98,.88),vec3(.9,.4,1.0),uGlow),vec3(1.,.66,.32)*rim,uWarm)*mix(1.15,.95,uWarm);
 vec3 glow=mix(vec3(.7,.15,1.),vec3(1.,.48,.16)*.7,uWarm)*halo*mix(1.,.55,uWarm);
 gl_FragColor=vec4(mix(glow,color,body),max(body,halo)*uOpacity);
}`;
