import {createNativeMotion} from './native-motion.js';
// One persistent canvas, with a decoded poster above it until actual painted pixels exist.
export function createBimo({root,signal,isStopped,sceneTime}){
 const canvas=root.querySelector('canvas'),focusImage=root.querySelector('.focus-still');
 let instance,motion,requested=0,ready=false,disposed=false,focusDecoded=false;
 const focusReady=focusImage.decode().then(()=>{focusDecoded=true;root.dataset.pose=requested===1?'focus':'awake'}).catch(()=>{});
 // The HTML allocates the full 700 × 860 artboard once. Every pose fits this
 // same surface; neither the bitmap nor its CSS stage depends on pose bounds.
 function painted(){
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let occupied=0;for(let i=3;i<pixels.length;i+=128)if(pixels[i]>100)occupied++;
  return occupied>50;
 }
 const api={
  focus(stage){requested=stage;if(stage===0||focusDecoded)root.dataset.pose=stage===1?'focus':'awake';if(instance?.viewModelInstance)instance.viewModelInstance.number('emotionStage').value=stage;motion?.render()},
  pause(){motion?.pause();instance?.pause()},resume(){if(ready&&!isStopped()){instance.play();motion?.resume()}},
  destroy(){disposed=true;motion?.destroy();instance?.cleanup()},
  get status(){return ready?'live':'poster'},
  get inputs(){const vm=instance?.viewModelInstance;return vm?{emotionStage:vm.number('emotionStage')?.value,pointerLookEnabled:vm.boolean('pointerLookEnabled')?.value,useExternalLook:vm.boolean('useExternalLook')?.value}:null},
  async load(){
   if(!window.rive)return;
   rive.RuntimeLoader.setWasmUrl(new URL('../../../assets/vendor/rive/rive.wasm',import.meta.url).href);
   const response=await fetch(new URL('../../../assets/hero-v2/motion-clips.json',import.meta.url));if(!response.ok)throw Error('Bimo motion asset unavailable');const clips=await response.json();
   if(disposed)return;
   await new Promise(resolve=>{
    instance=new rive.Rive({canvas,src:new URL('../../../assets/hero-v2/bimo.riv',import.meta.url).href,artboard:'Bimo V2',stateMachine:'Bimo V2 narrative states',autoBind:true,autoplay:true,layout:new rive.Layout({fit:rive.Fit.Contain,alignment:rive.Alignment.Center}),onLoad:()=>{
     const vm=instance.viewModelInstance;if(!vm){resolve();return}
     vm.boolean('pointerLookEnabled').value=false;vm.boolean('useExternalLook').value=true;vm.number('lookX').value=0;vm.number('lookY').value=0;
     motion=createNativeMotion(instance,clips,{sceneTime,isStopped});api.focus(requested);motion.resume();
     let completeFrames=0,attempts=0;const settleUntil=performance.now()+(sceneTime()>=4.1?700:0);
     const reveal=()=>{if(disposed){resolve();return}motion.render();setTimeout(()=>{
      if(disposed){resolve();return}
      completeFrames=painted()?completeFrames+1:0;attempts++;
      if(completeFrames>=2&&performance.now()>=settleUntil){ready=true;root.dataset.runtime='live';if(isStopped())api.pause();resolve()}
      else if(attempts<120)requestAnimationFrame(reveal);
      else{root.dataset.runtime='fallback';api.pause();resolve()}
     },0)};
     requestAnimationFrame(reveal);
    },onLoadError:()=>{root.dataset.runtime='fallback';resolve()}});
   });
  },
 };
 signal.addEventListener('abort',()=>api.destroy(),{once:true});
 return api;
}
