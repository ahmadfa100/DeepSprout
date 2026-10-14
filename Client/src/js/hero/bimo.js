// The approved V2 rig, signed by Rive; no rebuilt SVG character or pointer input.
export async function mountBimo({ reducedMotion, signal }) {
 const container=document.querySelector('#bimo'), canvas=document.querySelector('#bimo-canvas');
 if (!window.rive) return {pause(){},resume(){},destroy(){},status:'fallback'};
 rive.RuntimeLoader.setWasmUrl(new URL('../../../assets/vendor/rive/rive.wasm',import.meta.url).href);
 let instance, observer, timer, ready=false;
 const src=new URL('../../../assets/hero/bimo-hero-v2.riv',import.meta.url).href;
 const state={pause(){instance?.pause()},resume(){if(ready&&!reducedMotion()) instance.play()},destroy(){clearTimeout(timer);observer?.disconnect();instance?.cleanup()},get status(){return ready?'live':'fallback'},get inputs(){const v=instance?.viewModelInstance; return v?{emotionStage:v.number('emotionStage')?.value,pointerLookEnabled:v.boolean('pointerLookEnabled')?.value,useExternalLook:v.boolean('useExternalLook')?.value}:null}};
 await new Promise(resolve=>{
  let settled=false;
  const done=()=>{if(!settled){settled=true;resolve()}};
  timer=setTimeout(done,7000);
  instance=new rive.Rive({src,canvas,artboard:'Bimo V2',stateMachine:'Bimo V2 narrative states',autoplay:true,autoBind:true,layout:new rive.Layout({fit:rive.Fit.Contain,alignment:rive.Alignment.Center}),onLoad:()=>{
   const vm=instance.viewModelInstance;
   if(!vm){container.dataset.error='Missing V2 view model';done();return}
   vm.boolean('pointerLookEnabled').value=false;vm.boolean('useExternalLook').value=true;
   vm.number('lookX').value=0;vm.number('lookY').value=0;vm.number('emotionStage').value=1;
   const resize=()=>instance.resizeDrawingSurfaceToCanvas(Math.min(devicePixelRatio,2));
   resize();observer=new ResizeObserver(resize);observer.observe(container);
   // Let the approved pose blend finish behind its matching still frame.
   setTimeout(()=>{if(signal.aborted)return;ready=true;container.classList.add('is-ready');container.dataset.runtime='rive-v2';if(reducedMotion())instance.pause();clearTimeout(timer);done()},750);
  },onLoadError:()=>{container.dataset.error='Rive unavailable; approved V2 still displayed';clearTimeout(timer);done()}});
  signal.addEventListener('abort',()=>{state.destroy();done()},{once:true});
 });
 return state;
}
