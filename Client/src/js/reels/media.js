import * as THREE from '../../../assets/vendor/three/three.module.min.js';
const posters=['2026-10-09_09-38-43.png','2026-10-09_09-40-26.png','2026-10-09_09-38-29.png','image.png'];
export function createMedia(){
 const loader=new THREE.TextureLoader(),fallbackCanvas=document.createElement('canvas');fallbackCanvas.width=256;fallbackCanvas.height=448;
 const ctx=fallbackCanvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,256,448);gradient.addColorStop(0,'#244859');gradient.addColorStop(.6,'#886681');gradient.addColorStop(1,'#192532');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,448);ctx.fillStyle='#eeeecc';ctx.beginPath();ctx.arc(167,105,38,0,7);ctx.fill();
 const fallback=new THREE.CanvasTexture(fallbackCanvas);fallback.colorSpace=THREE.SRGBColorSpace;
 const images=posters.map(name=>{const entry={texture:fallback,ready:false};loader.load(new URL('../../../reels/posters/'+name,import.meta.url).href,t=>{t.colorSpace=THREE.SRGBColorSpace;entry.texture=t;entry.ready=true},undefined,()=>{});return entry});
 const videos=Array.from({length:5},(_,i)=>{
  const el=document.createElement('video');el.muted=true;el.loop=true;el.playsInline=true;el.preload='none';el.setAttribute('playsinline','');
  const entry={el,texture:null,started:false,failed:false,index:i};el.addEventListener('error',()=>{entry.failed=true;el.pause()});
  el.addEventListener('loadeddata',()=>{if(!entry.texture){entry.texture=new THREE.VideoTexture(el);entry.texture.colorSpace=THREE.SRGBColorSpace}});
  return entry;
 });
 let active=0,limit=5;
 return{
  limit(value){limit=value},
  update(progress,stopped,reduced){
   const count=Math.min(limit,stopped||reduced?0:progress<.205?0:progress<.38?1:progress<.54?2:5);active=0;
   videos.forEach((entry,i)=>{const on=i<count&&!entry.failed;
    if(on){if(!entry.started){entry.started=true;entry.el.src=new URL(`../../../reels/active/reel${i+1}.mp4`,import.meta.url).href;entry.el.load()}if(entry.el.paused)entry.el.play().catch(()=>{});active++}else if(!entry.el.paused)entry.el.pause();
   });
  },
  texture(index,live){const video=videos[index%5];return live&&video.texture&&video.el.readyState>=2&&!video.failed?video.texture:images[index%4].texture},
  get state(){return{active,created:videos.length,loaded:videos.filter(v=>v.started).length,playing:videos.filter(v=>!v.el.paused).length,failed:videos.filter(v=>v.failed).length,posters:images.filter(i=>i.ready).length}},
  destroy(){videos.forEach(v=>{v.el.pause();v.el.removeAttribute('src');v.el.load();v.texture?.dispose()});images.forEach(i=>{if(i.ready)i.texture.dispose()});fallback.dispose()}
 };
}
