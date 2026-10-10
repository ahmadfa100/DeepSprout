import * as THREE from '../../../assets/vendor/three/three.module.min.js';
import {clamp,mix,smooth} from './story-math.js';
import {planeVertex,vortexVertex,vortexFragment,cardFragment} from './shaders.js';
import {createMedia} from './media.js';
const TAU=Math.PI*2;
function chromeTexture(){
 const c=document.createElement('canvas');c.width=384;c.height=660;const x=c.getContext('2d');
 const gradient=x.createLinearGradient(0,430,0,640);gradient.addColorStop(0,'#05031500');gradient.addColorStop(1,'#050315cc');x.fillStyle=gradient;x.fillRect(20,420,344,210);
 x.fillStyle='#ffffffdd';x.font='500 19px Arial';x.fillText('SPROUT / PLAY',37,56);x.fillText('00:22',39,600);
 x.lineWidth=2;x.strokeStyle='#ffffff88';x.beginPath();x.moveTo(38,620);x.lineTo(344,620);x.stroke();x.strokeStyle='#fdb4ff';x.beginPath();x.moveTo(38,620);x.lineTo(180,620);x.stroke();
 x.fillStyle='#fff';x.beginPath();x.moveTo(168,282);x.lineTo(168,342);x.lineTo(220,312);x.closePath();x.fill();
 x.font='25px Arial';x.fillText('♡',315,526);x.font='15px Arial';x.fillText('1.2K',310,548);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function chipTexture(text){const c=document.createElement('canvas');c.width=512;c.height=112;const x=c.getContext('2d');x.shadowColor='#b847ff';x.shadowBlur=13;x.fillStyle='#1d0c39ee';x.strokeStyle='#ecb7ff';x.lineWidth=2;x.beginPath();x.roundRect(10,10,492,92,28);x.fill();x.stroke();x.shadowBlur=0;x.fillStyle='#fff0ff';x.font='500 35px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,59);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
export function createVortex(root){
 const backCanvas=root.querySelector('.vortex-back'),frontCanvas=root.querySelector('.vortex-front');
 const media=createMedia(),back=new THREE.Scene(),front=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,120);
 let backRenderer,frontRenderer,failed=false;
 try{backRenderer=new THREE.WebGLRenderer({canvas:backCanvas,alpha:true,antialias:false,powerPreference:'high-performance'});frontRenderer=new THREE.WebGLRenderer({canvas:frontCanvas,alpha:true,antialias:false,powerPreference:'high-performance'})}catch{root.dataset.webgl='unavailable';failed=true}
 const fallback=document.createElement('div');fallback.className='vortex-fallback';fallback.setAttribute('aria-hidden','true');
 ['2026-10-09_09-38-43.png','2026-10-09_09-40-26.png','2026-10-09_09-38-29.png','image.png'].forEach((name,i)=>{const image=new Image();image.src=new URL('../../../reels/posters/'+name,import.meta.url).href;image.style.setProperty('--i',i);fallback.append(image)});root.querySelector('.world').append(fallback);
 let width=1440,height=900,quality=innerWidth<700?1:Math.min(devicePixelRatio,1.5),slow=0,verySlow=0,frames=0,disposed=false;
 if(!failed){for(const r of [backRenderer,frontRenderer]){r.setClearColor(0,0);r.outputColorSpace=THREE.SRGBColorSpace}root.dataset.webgl='ready'}
 const uniforms={uProgress:{value:0},uTime:{value:0},uAspect:{value:1.6},uCenter:{value:new THREE.Vector2(.625,.58)}};
 const atmosphere=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({vertexShader:vortexVertex,fragmentShader:vortexFragment,uniforms,transparent:true,depthTest:false,depthWrite:false}));atmosphere.frustumCulled=false;atmosphere.renderOrder=-100;back.add(atmosphere);
 const geometry=new THREE.PlaneGeometry(1,1.72),chrome=chromeTexture();
 const cards=Array.from({length:46},(_,i)=>{
  const uniforms={uMap:{value:media.texture(i,false)},uChrome:{value:chrome},uOpacity:{value:0},uGlow:{value:0},uBlur:{value:0},uCrop:{value:i<5?1:.78+(i%3)*.09}};
  const material=new THREE.ShaderMaterial({uniforms,vertexShader:planeVertex,fragmentShader:cardFragment,transparent:true,side:THREE.DoubleSide,depthWrite:false});
  const mesh=new THREE.Mesh(geometry,material);back.add(mesh);return{mesh,uniforms};
 });
 const texts=['1 new reel','♡ 24','00:22','9:12','Read','Walk','10:46','Rest','Finish work','12:18','2:54','F O C U S'];
 const chipGeo=new THREE.PlaneGeometry(1,.219),chips=texts.map(text=>{const material=new THREE.MeshBasicMaterial({map:chipTexture(text),transparent:true,depthWrite:false,side:THREE.DoubleSide});const mesh=new THREE.Mesh(chipGeo,material);front.add(mesh);return mesh});
 // Shared faceted debris geometry, instanced separately either side of the Rive layer.
 const rockGeo=new THREE.IcosahedronGeometry(1,0),leafGeo=new THREE.OctahedronGeometry(1,0);
 const rubble=[back,front].map((scene,j)=>{const mesh=new THREE.InstancedMesh(rockGeo,new THREE.MeshBasicMaterial({color:j?0x35213e:0x614456,transparent:true}),130);scene.add(mesh);return mesh});
 const leaves=new THREE.InstancedMesh(leafGeo,new THREE.MeshBasicMaterial({color:0x839735,transparent:true}),48);front.add(leaves);
 const dummy=new THREE.Object3D();
 // Perspective ribbon strips follow the same throat as cards. Sparse at first, then wrap the camera.
 const trailGeo=new THREE.BufferGeometry(),trailPositions=new Float32Array(180*6*3);trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));
 const trails=Array.from({length:7},(_,i)=>{const mat=new THREE.MeshBasicMaterial({color:[0xc270ff,0xff92f2,0x8376ff,0xffba7a][i%4],transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});const mesh=new THREE.Mesh(trailGeo.clone(),mat);(i%2?front:back).add(mesh);return mesh});
 function resize(){const box=root.querySelector('.world').getBoundingClientRect();width=box.width;height=box.height;camera.aspect=width/height;camera.updateProjectionMatrix();uniforms.uAspect.value=camera.aspect;if(!failed)for(const r of [backRenderer,frontRenderer]){r.setPixelRatio(quality);r.setSize(width,height,false)}}
 const observer=new ResizeObserver(resize);observer.observe(root.querySelector('.world'));resize();
 let visibleCards=0,lastP=0,cpu=0;
 function screenPoint(x,y,z=0){const distance=18-z,h=2*Math.tan(42*Math.PI/360)*distance;return new THREE.Vector3((x-.5)*h*camera.aspect,(.5-y)*h,z)}
 function moveToLayer(mesh,z){const parent=z>0?front:back;if(mesh.parent!==parent)parent.add(mesh)}
 function render(p,time,reduced,stopped,dt=.016){
  if(disposed)return;const stamp=performance.now();lastP=p;media.update(p,stopped||failed,reduced);if(failed){fallback.style.opacity=smooth(.245,.34,p);return;}
  const burst=smooth(.67,.85,p),trap=smooth(.86,1,p),spiral=smooth(.40,.69,p),travel=p*8+(reduced?0:time*.07);
  atmosphere.visible=p>.50;uniforms.uProgress.value=p;uniforms.uTime.value=reduced?0:time;
  uniforms.uCenter.value.set(mix(.632,.568,trap),mix(.59,.54,trap));
  camera.position.set(0,0,18-burst*.8);camera.rotation.z=burst*.025-trap*.05;
  const centerX=mix(.632,.568,trap),centerY=mix(.43,.47,trap);
  visibleCards=0;
  cards.forEach(({mesh,uniforms:u},i)=>{
   const appear=i===0?.245:i<3?.275+(i-1)*.025:i<7?.38+(i-3)*.019:i<16?.52+(i-7)*.015:i<32?.70+(i-16)*.006:.87+(i-32)*.006;
   const opacity=smooth(appear,appear+.035,p);mesh.visible=opacity>.001;if(!mesh.visible)return;visibleCards++;
   let x,y,z,size,rotation;
   if(i<3){
    const a=(i/3)*TAU+2.4+(p-.2)*7.5+(reduced?0:time*.075)*smooth(.2,.32,p);
    const orbit=smooth(.245,.36,p);x=mix(.91,centerX+Math.cos(a)*.16,orbit);y=mix(.33,.48+Math.sin(a)*.17,orbit);z=Math.sin(a)*2;size=mix(.45,1.45,orbit);rotation=Math.sin(a)*.19;
   }else{const a=i*2.399+p*6; x=centerX+Math.cos(a)*(.20+(i%3)*.06);y=centerY+Math.sin(a)*(.21+(i%4)*.055);z=Math.sin(a)*3.2;size=1.45+(i%4)*.15;rotation=Math.sin(a)*.3}
   // The late structure is a funnel, with apparent radius, depth, and angular phase coupled.
   const depth=((i*.41421356237)%1),a=i*2.399963+travel*1.65;
   const radius=.055+depth*depth*.66;
   const hx=centerX+Math.cos(a)*radius,hy=centerY+Math.sin(a)*radius*1.38;
   const hz=-20+depth*28;
   const blend=spiral*(i<3?smooth(.4,.59,p):1);
   x=mix(x,hx,blend);y=mix(y,hy,blend);z=mix(z,hz,blend);size=mix(size,1.0+depth*2.8,blend);rotation=mix(rotation,Math.sin(a)*.4+Math.cos(a)*.18,blend);
   // Keep the face readable; occlusion remains across hands/boots and the periphery.
   if(z>0&&Math.abs(x-centerX)<.085&&Math.abs(y-.52)<.16)x+=x<centerX?-.105:.105;
   mesh.position.copy(screenPoint(x,y,z));mesh.rotation.set(Math.sin(a*.7)*.18*spiral,Math.cos(a)*.26*spiral,rotation);mesh.scale.setScalar(size*(i===0&&p<.2?1:1));moveToLayer(mesh,z);
   u.uMap.value=media.texture(i,i<5&&p>.205);u.uOpacity.value=opacity;u.uGlow.value=mix(.10,1,smooth(.3,.75,p));u.uBlur.value=smooth(5,9,z)*burst*.9;
   mesh.renderOrder=Math.round(z*10);
  });
  chips.forEach((mesh,i)=>{
   const start=i===0?.10:i<3?.30+i*.045:.69+(i-3)*.022,alpha=smooth(start,start+.04,p);mesh.visible=alpha>.001;mesh.material.opacity=alpha;
   if(!mesh.visible)return;
   let x,y,z,s;
   const a=i*2.4+travel*1.3,rad=.22+(i%3)*.10;
   x=centerX+Math.cos(a)*rad;y=centerY+Math.sin(a)*rad*1.4;z=i%3===0?3:-3;s=2.3+(i%2)*.25;
   if(i===0&&p<.3){const drift=smooth(.10,.23,p),join=smooth(.23,.30,p);x=mix(mix(.95,.927,drift),x,join);y=mix(mix(.265,.276,drift),y,join);z=mix(1,z,join);s=mix(.72,s,join)}
   mesh.position.copy(screenPoint(x,y,z));mesh.scale.setScalar(s);mesh.rotation.z=Math.sin(i+travel)*.21*(i===0?smooth(.23,.30,p):1);moveToLayer(mesh,z);
  });
  const debris=smooth(.38,.78,p);
  rubble.forEach((mesh,layer)=>{mesh.visible=p>.38;mesh.material.opacity=debris*.92;mesh.count=Math.round(130*debris);
   for(let i=0;i<mesh.count;i++){const d=((i*.754877+layer*.23)%1),a=i*2.399+travel*1.9,r=.13+d*.72,z=layer?1+d*6:-4-d*19;const position=screenPoint(centerX+Math.cos(a)*r,centerY+Math.sin(a)*r*1.45,z);dummy.position.copy(position);dummy.rotation.set(a,i*.8,a*1.3);const s=.04+d*d*.34;dummy.scale.set(s,s*.8,s*.65);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)}mesh.instanceMatrix.needsUpdate=true;
  });
  leaves.visible=p>.29;leaves.material.opacity=smooth(.29,.52,p)*.7;leaves.count=Math.round(48*smooth(.28,.7,p));
  for(let i=0;i<leaves.count;i++){const a=i*2.399+travel*1.7,r=.17+(i%7)*.063;dummy.position.copy(screenPoint(centerX+Math.cos(a)*r,centerY+Math.sin(a)*r*1.5,(i%5)-2));dummy.rotation.set(a*.8,i,a);dummy.scale.set(.07,.19,.014);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix)}leaves.instanceMatrix.needsUpdate=true;
  trails.forEach((mesh,k)=>{
   mesh.visible=p>.26;mesh.material.opacity=smooth(.26,.34,p)*mix(.19,.75,burst)*(k>2?smooth(.49,.74,p):1);
   const arr=mesh.geometry.attributes.position.array;
   for(let j=0;j<180;j++){
    const points=[];
    for(const t of [j/180,(j+1)/180]){
     const a=t*TAU*(1.05+spiral*1.25)+k*TAU/7+travel*.8;
     const r=mix(.19,mix(.055,.72,t),spiral),z=mix(Math.sin(a)*2,-19+t*26,spiral);
     const x=centerX+Math.cos(a)*r,y=mix(.48,centerY,spiral)+Math.sin(a)*r*mix(.48,1.3,spiral);
     const v=screenPoint(x,y,z),w=(.014+burst*.013)*(1+k%2);points.push(v.clone().add(new THREE.Vector3(0,w,0)),v.clone().add(new THREE.Vector3(0,-w,0)));
    }
    [points[0],points[1],points[2],points[2],points[1],points[3]].forEach((v,n)=>{const o=(j*6+n)*3;arr[o]=v.x;arr[o+1]=v.y;arr[o+2]=v.z});
   }
   mesh.geometry.attributes.position.needsUpdate=true;mesh.frustumCulled=false;
  });
  backRenderer.render(back,camera);frontRenderer.render(front,camera);cpu=performance.now()-stamp;
  if(!stopped&&dt>.027)slow++;if(!stopped&&dt>.041)verySlow++;frames++;
  if(frames===90){if(slow>60&&quality>.8){quality=Math.max(.8,quality-.25);resize()}if(verySlow>40)media.limit(3);frames=0;slow=0;verySlow=0}
 }
 for(const c of [backCanvas,frontCanvas]){c.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;root.dataset.webgl='unavailable';media.update(0,true,true)});c.addEventListener('webglcontextrestored',()=>{failed=false;root.dataset.webgl='ready';resize()})}
 return{render,resize,prepareMedia:p=>media.update(p,false,false),quality(value){quality=value;resize()},maxVideos:value=>media.limit(value),get state(){return{cpu,cards:visibleCards,media:media.state,quality,webgl:!failed,progress:lastP}},destroy(){disposed=true;observer.disconnect();media.destroy();for(const scene of [front,back])scene.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose()}});chrome.dispose();backRenderer?.dispose();frontRenderer?.dispose()}};
}
