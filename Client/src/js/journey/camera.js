import {cameraAt,ease} from './choreography.js';
export function createCamera(viewport,world){
 let width=0,height=0,mobile=false,base=1,lastPose;
 function resize(){width=viewport.clientWidth;height=viewport.clientHeight;mobile=innerWidth<=700;base=mobile?Math.min(width/420,height/480):Math.min(width/800,(height-180)/570)}
 function render(t){
  const p=cameraAt(t,mobile),scale=base*p.scale;
  // Transform order keeps the camera focal point at a stable viewport position, even during roll.
  const settle=mobile?ease(9.87,10.22,t)*80:0;
  world.style.transform=`translate(${width*.50}px,${height*(mobile?.48:.52)+settle}px) scale(${scale}) rotate(${p.roll}deg) rotateX(${p.pitch}deg) translate(${-p.x}px,${-p.y}px)`;
  lastPose={...p,baseScale:base,scale,width,height,mobile};return lastPose;
 }
 resize();return {resize,render,get state(){return lastPose}};
}
