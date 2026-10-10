// Motion sampled from the APPROVED native V2 controller; no character redraw or new poses.
// Playback binds the samples to the original Rive view model and state machine.
export function createNativeMotion(instance,clips,{sceneTime,isStopped,storyProgress}){
 const windows=clips.keys.map(k=>{
  if(['eyeX','eyeY'].includes(k))return [3.8,4.08];
  if(['openEyeOpacity','closedEyeOpacity','blinkScale'].includes(k))return [4.15,4.85];
  if(/head|neck|face|Pod/i.test(k))return [3.8,4.25];
  if(/Shoulder|Elbow|Hand|Palm|Arm/.test(k))return [4.02,4.85];
  if(k==='sproutTilt')return [4.1,5.3];
  return [3.85,5.25];
 });
 const stage=instance.viewModelInstance.number('emotionStage');
 const properties=clips.keys.map(name=>instance.viewModelInstance.number(name));
 const indices=Object.fromEntries(clips.keys.map((name,i)=>[name,i]));
 const last=Array(properties.length).fill(NaN);let frame=0,lastTime=0,clock=0,running=false;
 function value(track,index,t){
  const rows=clips.tracks[track],duration=clips.duration;
  const local=((t%duration)+duration)%duration,at=Math.min(Math.floor(local/clips.sampleInterval),rows.length-2);
  const a=rows[at],b=rows[at+1],mix=(local-a[0])/(b[0]-a[0]);
  let v=a[index+1]+(b[index+1]-a[index+1])*mix;
  // Quietly close a captured breathing cycle during its last second.
  const seam=Math.max(0,local-(duration-1));
  if(seam>0){const eased=seam*seam*(3-2*seam);v+=(rows[0][index+1]-v)*eased}
  return v;
 }
 function render(){
  const intro=sceneTime(), progress=storyProgress();stage.value=progress>.72?4:progress>.37?3:progress>.115?2:intro>=4.1?1:0;
  const values=[];
  for(let i=0;i<properties.length;i++){
   const [start,end]=windows[i],raw=Math.max(0,Math.min(1,(intro-start)/(end-start))),blend=raw*raw*(3-2*raw);
   const a=value('awake',i,clock),b=value('focus',i,clock),v=a+(b-a)*blend;
   values[i]=v;
  }
  // Continuous blends between native pose captures: same bindings, same canvas.
  const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
  if(clips.narrative&&progress>.09){
   const data=clips.narrative;
   const gaze=progress<.2?.8:progress<.36?Math.cos(2.4+(progress-.2)*7.5)*.8:progress<.52?.7:Math.sin(progress*37)*.8;
   const direction=gaze<0?'left':'right',gazeMix=Math.abs(gaze)/.8;
   const sample=(name,i)=>{
    const rows=data.tracks[name],t=(clock%5),at=Math.min(Math.floor(t/.1),rows.length-2);
    const f=(t-rows[at][0])/.1;
    return rows[at][i+1]+(rows[at+1][i+1]-rows[at][i+1])*f;
   };
   const pose=(n,i)=>sample(n+'-center',i)+(sample(n+'-'+direction,i)-sample(n+'-center',i))*gazeMix;
   const notice=smooth(.09,.17,progress),concern=smooth(.35,.43,progress),overwhelm=smooth(.66,.78,progress);
   for(let i=0;i<values.length;i++){
    let v=pose(2,i);v+=(pose(3,i)-v)*concern;v+=(pose(4,i)-v)*overwhelm;
    values[i]+=(v-values[i])*notice;
   }
   instance.viewModelInstance.number('lookX').value=gaze;
   instance.viewModelInstance.number('lookY').value=-.45;
  }
  // Reapply the approved controller's planted-leg solve AFTER blending.
  // Interpolating two solved leg chains alone does not preserve their anchor.
  const get=name=>values[indices[name]],put=(name,v)=>{values[indices[name]]=v};
  const pelvis=get('pelvisRotation'),c=Math.cos(pelvis),s=Math.sin(pelvis);
  for(const [prefix,side] of [['left',-1],['right',1]]){
   const hx=get(prefix+'HipX'),hy=get(prefix+'HipY');
   const hipX=get('bodyRootX')+get('pelvisX')+c*hx-s*hy;
   const hipY=get('bodyRootY')+get('pelvisY')+s*hx+c*hy;
   const angle=pelvis+get(prefix+'ThighRotation');
   const dx=350+side*63-(hipX-Math.sin(angle)*127);
   const dy=798-(hipY+Math.cos(angle)*127);
   const shin=Math.atan2(dy,dx)-Math.atan2(85,side*7);
   const travel=Math.hypot(dx,dy)/Math.hypot(85,7);
   put(prefix+'KneeRotation',shin-angle);put(prefix+'AnkleX',side*7*travel);
   put(prefix+'AnkleY',85*travel);put(prefix+'FootRotation',-shin);
  }
  for(let i=0;i<properties.length;i++){
   const v=values[i];if(properties[i]&&(!Number.isFinite(last[i])||Math.abs(v-last[i])>1e-6)){properties[i].value=v;last[i]=v}
  }
 }
 function tick(now){
  const dt=lastTime?Math.min((now-lastTime)/1000,.04):0;lastTime=now;
  if(!isStopped())clock+=dt;render();if(running)frame=requestAnimationFrame(tick);
 }
 render();
 return{render,pause(){running=false;cancelAnimationFrame(frame);lastTime=0},resume(){if(running)return;running=true;lastTime=0;frame=requestAnimationFrame(tick)},destroy(){running=false;cancelAnimationFrame(frame)}};
}
