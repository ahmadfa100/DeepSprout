import {END,CHAPTERS,anchors,roadmapPoints,panelScale,copyFrame,ease,mix,clamp,lerpPoint,chartPoints,focusStroke,communityLayout,cubic} from './choreography.js';
import {createCamera} from './camera.js';
import {createNetwork,linkCurve} from './network.js';
import {createGarden,gardenDefinitions} from './garden.js';

const root=document.querySelector('#product-journey');
if(root)boot(root);
function boot(root){
 const abort=new AbortController(),{signal}=abort,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const stage=root.querySelector('.journey-stage'),viewport=root.querySelector('.journey-viewport'),world=root.querySelector('.journey-camera'),sets=root.querySelector('.journey-sets');
 const articles=[...root.querySelectorAll('.journey-scene')],panels=[...root.querySelectorAll('.journey-panel')],homes=new Map(panels.map(panel=>[panel,panel.parentNode]));
 const chapterLinks=[...root.querySelectorAll('[data-chapter]')],staticControl=root.querySelector('.journey-static-control'),thread=document.querySelector('.research-thread');
 const object=root.querySelector('.journey-object'),seed=root.querySelector('.journey-seed'),community=root.querySelector('.journey-community-gardens');
 root.insertAdjacentHTML('afterbegin',gardenDefinitions());
 const gardenPanel=root.querySelector('.garden-panel'),garden=createGarden(gardenPanel),camera=createCamera(viewport,world);
 const assessment=root.querySelector('.assessment-panel'),plan=root.querySelector('.plan-panel'),activities=root.querySelector('.activities-panel'),focus=root.querySelector('.focus-panel');
 const questionPages=[...assessment.querySelectorAll('.question-page')],answerChoices=questionPages.map(page=>page.querySelector('.selected-answer'));
 const milestoneEls=[...plan.querySelectorAll('.milestone')],activityRows=[...activities.querySelectorAll('[data-activity]')];
 const week=activities.querySelector('.week-current'),weekProgress=activities.querySelector('.week-progress'),weekBar=activities.querySelector('.week-footer i'),weekPercent=activities.querySelector('.week-footer strong'),activityLine=activities.querySelector('.activity-timeline span');
 const morph=focus.querySelector('.focus-morph'),timerTrack=focus.querySelector('.timer-track'),timerFace=focus.querySelector('.timer-face'),timerNumber=timerFace.querySelector('strong'),timerCaption=focus.querySelector('.timer-caption'),analytics=focus.querySelector('.analytics-frame'),finalPoint=focus.querySelector('.chart-final-point'),chartDots=focus.querySelector('.chart-points');
 chartDots.innerHTML=chartPoints.slice(0,-1).map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4"/>`).join('');
 const memory=document.createElement('div');memory.className='assessment-memory';memory.innerHTML='<i></i><i></i><i></i>';assessment.append(memory);
 const beads=Array.from({length:3},()=>{const node=document.createElement('div');node.className='journey-answer-bead';world.append(node);return node});
 let plots=communityLayout(innerWidth<=700);
 const plotElements=plots.map(plot=>{
  const el=document.createElement('div');el.className='community-garden';el.dataset.plot=plot.id;
  el.innerHTML=`<svg viewBox="0 0 600 480"><use href="#${['jg-mature','jg-floral','jg-leafy'][plot.variant]}"/></svg>`;community.append(el);return el;
 });
 let network,enhanced=false,userStatic=false,mobile=innerWidth<=700,destroyed=false,frame=0,start=0,travel=0,viewHeight=0,threadStart=0,active=false,lastT=-1,renderCount=0,current=0,geometry={},staticStarts=[];
 const geometryForSVG=(width,height,x,y)=>{const scale=Math.min(width/600,height/480);return{x:(width-600*scale)/2+x*scale-width/2,y:(height-480*scale)/2+y*scale-height/2}};
 function measure(){
  if(destroyed)return;
  mobile=innerWidth<=700;
  start=root.getBoundingClientRect().top+scrollY;viewHeight=enhanced?stage.clientHeight:innerHeight;
  travel=viewHeight*(mobile?11.8:END);root.style.setProperty('--journey-travel',mobile?'11.8':String(END));
  if(thread)threadStart=thread.getBoundingClientRect().top+scrollY;
  if(!enhanced)staticStarts=articles.map(el=>el.getBoundingClientRect().top+scrollY);
  if(enhanced){
   plots=communityLayout(mobile);
   camera.resize();network?.destroy();network=createNetwork(root.querySelector('.journey-network'),mobile);
   const a=anchors(mobile);
   panels.forEach(panel=>{const name=homes.get(panel).dataset.scene;panel.parentNode.dataset.scene=name;panel.parentNode.style.left=`${a[name].x}px`;panel.parentNode.style.top=`${a[name].y}px`});
   const roadmap=roadmapPoints(mobile),height=plan.clientHeight,width=plan.clientWidth,top=mobile?0:35;
   geometry={a,roadmap:roadmap.map(p=>({x:a.plan.x+p.x-width/2,y:a.plan.y+p.y-height/2})),assessment:{w:assessment.clientWidth,h:assessment.clientHeight},week:{w:activities.clientWidth,h:activities.clientHeight},focus:{w:focus.clientWidth,h:focus.clientHeight}};
   const focusRing=geometryForSVG(focus.clientWidth,focus.clientHeight,300,215),endPoint=geometryForSVG(focus.clientWidth,focus.clientHeight,chartPoints.at(-1).x,chartPoints.at(-1).y);
   geometry.ring={x:a.focus.x+focusRing.x,y:a.focus.y+focusRing.y,diameter:Math.min(focus.clientWidth/600,focus.clientHeight/480)*270};geometry.chartEnd={x:a.focus.x+endPoint.x,y:a.focus.y+endPoint.y};
   const art=gardenPanel.querySelector('.garden-art'),artScale=Math.min(art.clientWidth/600,art.clientHeight/480);
   geometry.plant={x:a.garden.x+(286-300)*artScale,y:a.garden.y+art.offsetTop+(art.clientHeight-480*artScale)/2+337*artScale-gardenPanel.clientHeight/2};
   const row=activityRows[0],ring=row.querySelector('.activity-ring'),padding=parseFloat(getComputedStyle(week).paddingRight);
   geometry.activityRing={x:a.activities.x+activities.clientWidth/2-padding-ring.clientWidth/2+(mobile?13:23),y:a.activities.y+row.offsetTop+row.clientHeight/2-activities.clientHeight/2-8,diameter:ring.clientWidth*.77};
   const path=roadmap.map(p=>({x:p.x,y:p.y-top}));let d=`M${path[0].x} ${path[0].y}`;
   for(let i=1;i<path.length;i++){const [from,c1,c2,to]=linkCurve(path[i-1],path[i],i%2?.26:-.28);d+=`C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`}
   plan.querySelector('.roadmap-lines').setAttribute('viewBox',mobile?'0 0 360 450':'0 0 600 440');plan.querySelectorAll('.roadmap-lines path').forEach(el=>el.setAttribute('d',d));
   plotElements.forEach((el,i)=>{el.style.width='480px';el.style.height='384px';el.style.left=`${plots[i].x-240}px`;el.style.top=`${plots[i].y+a.garden.y+80-280}px`});
  }
  lastT=-1;queue();
 }
 function staticPanels(){
  // The exact same semantic scenes are returned to normal document flow.
  panels.forEach(panel=>{homes.get(panel).append(panel);panel.style.cssText=''});sets.replaceChildren();
  articles.forEach(el=>{el.style.cssText='';el.inert=false});
  questionPages.forEach((el,i)=>{el.style.cssText=i?'display:none':'';answerChoices[i].style.setProperty('--answer','1')});
  assessment.querySelector('.question-count').textContent='01 / 03';assessment.querySelector('.assessment-meter i').style.transform='scaleX(.33)';
  memory.style.display='none';milestoneEls.forEach(el=>el.style.cssText='');
  const points=roadmapPoints(mobile),top=mobile?0:35;plan.querySelector('.roadmap-lines').setAttribute('viewBox',mobile?'0 0 360 450':'0 0 600 440');
  let d=`M${points[0].x} ${points[0].y-top}`;points.slice(1).forEach(p=>d+=`L${p.x} ${p.y-top}`);plan.querySelectorAll('.roadmap-lines path').forEach(el=>{el.setAttribute('d',d);el.style.strokeDashoffset='0'});
  week.style.transform='';activityRows.forEach(row=>{const check=row.querySelector('.activity-check');check.style.setProperty('--done','1');check.style.setProperty('--completion-halo','0')});activities.querySelector('.activity-ring').style.opacity='1';weekProgress.textContent='2 / 5';weekPercent.textContent='40%';weekBar.style.transform='scaleX(.4)';activityLine.style.transform='scaleY(.4)';
  analytics.style.clipPath='none';morph.setAttribute('d',focusStroke(1));morph.style.strokeDashoffset='0';timerTrack.style.opacity='0';timerFace.style.display='none';timerCaption.style.display='none';chartDots.style.opacity='1';finalPoint.setAttribute('cx',chartPoints.at(-1).x);finalPoint.setAttribute('cy',chartPoints.at(-1).y);finalPoint.style.opacity='1';
  garden.render(END,mobile,true);gardenPanel.querySelectorAll('.garden-heading,.garden-details,.garden-reward').forEach(el=>el.style.cssText='');chapterLinks.forEach(el=>el.removeAttribute('aria-current'));articles[6].querySelector('a').tabIndex=0;
 }
 function mode(){
  const want=!reduced.matches&&!userStatic&&innerHeight>=600;
  if(want===enhanced)return;
  enhanced=want;root.classList.toggle('is-cinematic',want);root.classList.toggle('is-static',!want);
  if(want){
   panels.forEach(panel=>{const set=document.createElement('div');set.className='journey-set';sets.append(set);set.append(panel)});
   memory.style.display='';timerFace.style.display='';timerCaption.style.display='';
   root.querySelector('.journey-motion').textContent='Skip to the invitation ↗';
  }else{cancelAnimationFrame(frame);frame=0;network?.destroy();staticPanels()}
  staticControl.textContent=want?'View without motion':'Play the scroll journey';staticControl.hidden=reduced.matches||innerHeight<600;
  measure();
 }
 function shape(point,w,h,radius,text='',border=1){
  object.style.display='grid';object.style.left=`${point.x-w/2}px`;object.style.top=`${point.y-h/2}px`;object.style.width=`${w}px`;object.style.height=`${h}px`;object.style.borderRadius=`${radius}px`;object.style.borderWidth=`${border}px`;object.querySelector('span').textContent=text;
 }
 function renderObjects(t){
  const {a}=geometry;
  object.style.display='none';
  if(t<.55){const p=ease(.08,.55,t);shape(a.assessment,mix(18,geometry.assessment.w,p),mix(18,geometry.assessment.h,p),mix(100,26,p));object.style.background=p<.2?'#e7efdc':'transparent'}
  if(t>=3.20&&t<3.73){const p=ease(3.20,3.73,t),point=cubic(geometry.roadmap[0],{x:geometry.roadmap[0].x+250,y:geometry.roadmap[0].y-80},{x:a.activities.x-260,y:a.activities.y-100},a.activities,p);shape(point,mix(mobile?48:56,geometry.week.w,p),mix(mobile?48:56,geometry.week.h,p),mix(100,23,p),p<.30?'01':'');object.style.background='transparent'}
  if(t>=4.59&&t<5.13){const p=ease(4.59,5.13,t),r=geometry.activityRing,point=cubic(r,{x:r.x+100,y:r.y+180},{x:geometry.ring.x+180,y:geometry.ring.y-200},geometry.ring,p),diameter=mix(r.diameter,geometry.ring.diameter,p);shape(point,diameter,diameter,999,'',3);object.style.background='transparent'}
  beads.forEach((bead,i)=>{
   const detachment=ease(1.77+i*.035,2.25+i*.03,t),source={x:a.assessment.x+geometry.assessment.w/2-104+i*15,y:a.assessment.y-geometry.assessment.h/2+36};
   const point=cubic(source,{x:source.x+200,y:source.y-50},{x:geometry.roadmap[i].x-150,y:geometry.roadmap[i].y-70},geometry.roadmap[i],detachment);
   bead.style.display=t>=1.77&&t<=2.40?'block':'none';bead.style.transform=`translate(${point.x}px,${point.y}px) scale(${mix(1,mobile?3.1:3.6,detachment)})`;
  });
  // The chart endpoint is the seed carrier: it never teleports or spawns a second final point.
  const depart=ease(6.32,6.70,t),land=ease(6.70,6.96,t),point=cubic(geometry.chartEnd,{x:geometry.chartEnd.x-90,y:geometry.chartEnd.y-160},{x:a.garden.x+130,y:a.garden.y-155},{x:geometry.plant.x,y:geometry.plant.y-115},depart);
  point.y=mix(point.y,geometry.plant.y,land);
  const sprouted=ease(6.99,7.15,t),size=mix(.28,.78,ease(6.28,6.64,t))*(1-sprouted);
  seed.style.display=t>=6.28&&t<7.16?'block':'none';seed.style.transform=`translate(${point.x-16}px,${point.y-21}px) rotate(${mix(-15,25,land)}deg) scale(${size})`;
  seed.querySelector('.seed-body').style.fill=t<6.40?'#88b283':'#c4ac88';seed.querySelector('.seed-seam').style.opacity=ease(6.40,6.66,t);
 }
 function renderPanels(t){
  panels.forEach(panel=>{const name=homes.get(panel).dataset.scene,s=panelScale(name,t);panel.parentNode.style.transform=`scale(${s})`;panel.parentNode.style.visibility=s<=.026?'hidden':'visible';panel.style.clipPath=name==='assessment'?`circle(${ease(.12,.54,t)*100}% at 50% 50%)`:name==='activities'?`circle(${ease(3.34,3.73,t)*100}% at 50% 50%)`:'none'});
  const times=[.55,.98,1.40];let qi=0;
  questionPages.forEach((page,i)=>{const entered=i===0?1:ease(times[i]-.09,times[i]+.06,t),left=i===2?0:ease(times[i+1]-.09,times[i+1]+.06,t);page.style.transform=`translateY(${(1-entered)*110-left*110}%)`;if(t>=times[i])qi=i;answerChoices[i].style.setProperty('--answer',String(ease(times[i]+.16,times[i]+.28,t)))});
  assessment.querySelector('.question-count').textContent=`0${qi+1} / 03`;assessment.querySelector('.assessment-meter i').style.transform=`scaleX(${mix(1/3,1,ease(.85,1.66,t))})`;
  [...memory.children].forEach((el,i)=>el.style.transform=`scale(${ease(times[i]+.17,times[i]+.29,t)})`);
  memory.style.opacity=1-ease(1.77,1.83,t);
  plan.querySelector('.roadmap-light').style.strokeDashoffset=String(1-ease(2.0,2.87,t));
  milestoneEls.forEach((el,i)=>{const reveal=ease(2.04+i*.14,2.25+i*.14,t);el.style.transform=`scale(${mix(.04,1,reveal)})`;el.style.opacity=i===0?String(1-ease(3.21,3.44,t)):'1'});
  const complete=[ease(3.90,4.08,t),ease(4.20,4.38,t)];
  activityRows.forEach((row,i)=>{const check=row.querySelector('.activity-check'),p=complete[i];check.style.setProperty('--done',String(p));check.style.setProperty('--completion-halo',String(Math.sin(p*Math.PI)*.60));check.style.setProperty('--halo-size',String(1+p*.5))});
  const total=complete[0]+complete[1];weekProgress.textContent=`${Math.round(total)} / 5`;weekPercent.textContent=`${Math.round(total/5*100)}%`;weekBar.style.transform=`scaleX(${total/5})`;activityLine.style.transform=`scaleY(${total/5})`;
  const activityRing=activities.querySelector('.activity-ring');activityRing.style.opacity=String(1-ease(4.59,4.62,t));activityRing.querySelector('.activity-ring-progress').style.strokeDashoffset=String(1-complete[0]);
  const peek=ease(4.31,4.50,t);week.style.transform=`translate(${peek*(mobile?13:23)}px,${peek*-8}px) rotateY(${peek*-5}deg)`;
  const graph=ease(5.74,6.14,t),session=ease(5.17,5.70,t);
  morph.setAttribute('d',focusStroke(graph));morph.style.strokeDashoffset=String(1-session);const timerAway=1-ease(0,.40,graph);timerTrack.style.opacity=String(timerAway);
  const seconds=Math.round(1500*(1-session)),mins=Math.floor(seconds/60),secs=seconds%60;timerNumber.textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  timerFace.querySelector('.timer-status').textContent=session>=.999?'Session complete':'Focus session';timerFace.style.transform=`translateY(${-graph*40}px) scale(${1-graph*.25})`;timerFace.style.opacity=String(timerAway);timerCaption.style.opacity=String(timerAway);
  analytics.style.clipPath=`inset(${49.5*(1-ease(5.77,6.14,t))}% round 25px)`;
  chartDots.style.opacity=String(ease(5.94,6.14,t));const point=chartPoints.at(-1);finalPoint.setAttribute('cx',point.x);finalPoint.setAttribute('cy',point.y);finalPoint.style.opacity=String(ease(6.00,6.20,t)*(1-ease(6.28,6.34,t)));
  garden.render(t,mobile);
  const gardenUI=1-ease(8.18,8.62,t);gardenPanel.querySelectorAll('.garden-heading,.garden-details,.garden-reward').forEach(el=>{el.style.opacity=String(gardenUI);el.style.transform=`translateY(${(1-gardenUI)*12}px)`});
  plotElements.forEach((el,i)=>{const p=ease(8.22+i*.022,8.54+i*.022,t);el.style.transform=`scale(${Math.max(.001,p)})`;el.style.visibility=p===0?'hidden':'visible'});
 }
 function paint(){
  frame=0;if(destroyed||document.hidden||!enhanced)return;
  const t=clamp((scrollY-start)/travel)*END;
  active=scrollY>=start-viewHeight&&scrollY<=start+travel+viewHeight;root.dataset.offscreen=String(!active);
  if(t===lastT)return;lastT=t;renderCount++;
  const pose=camera.render(t);renderPanels(t);renderObjects(t);network.render(t,pose);
  current=CHAPTERS.findIndex(c=>t<c.end);if(current<0)current=6;
  articles.forEach((article,i)=>{const f=copyFrame(i,t);article.style.opacity=String(f.opacity);article.style.transform=`translateY(${f.y}px)`;article.style.clipPath=`inset(0 0 ${f.clip}% 0)`;article.inert=i===6&&current!==6;article.dataset.current=String(i===current)});
  chapterLinks.forEach((el,i)=>{if(i===Math.min(current,5))el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});
  root.dataset.scene=CHAPTERS[current].name;root.dataset.progress=(t/END).toFixed(5);
  const finish=articles[6];finish.querySelector('a').tabIndex=current===6?0:-1;
 }
 function queue(){if(frame||destroyed||document.hidden||!enhanced)return;frame=requestAnimationFrame(paint)}
 function readScroll(){
  if(thread)thread.style.setProperty('--thread-draw',String(1-ease(threadStart-innerHeight*.85,threadStart-innerHeight*.25,scrollY)));
  if(!enhanced){current=Math.max(0,staticStarts.findLastIndex(top=>top<=scrollY+innerHeight*.35));return}
  const visible=scrollY>=start-viewHeight&&scrollY<=start+travel+viewHeight;
  if(visible||active)queue();root.dataset.offscreen=String(!visible);
 }
 function go(index,behavior='smooth'){
  if(!enhanced){articles[index].scrollIntoView({behavior,block:'start'});return}
  scrollTo({top:start+CHAPTERS[index].read/END*travel,behavior});queue();
 }
 for(const [i,link]of chapterLinks.entries())link.addEventListener('click',event=>{if(enhanced){event.preventDefault();go(i)}},{signal});
 root.querySelector('.journey-motion').addEventListener('click',event=>{if(enhanced){event.preventDefault();go(6)}},{signal});
 root.querySelector('.journey-wordmark').addEventListener('click',event=>{if(enhanced){event.preventDefault();go(0)}},{signal});
 staticControl.addEventListener('click',event=>{event.preventDefault();const index=current;userStatic=!userStatic;mode();requestAnimationFrame(()=>go(index,'instant'))},{signal});
 window.addEventListener('scroll',readScroll,{passive:true,signal});window.addEventListener('resize',()=>{const oldMode=enhanced,index=current;mode();measure();if(oldMode!==enhanced)requestAnimationFrame(()=>go(index,'instant'))},{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else{measure();queue()}},{signal});
 reduced.addEventListener('change',()=>{mode();if(!enhanced)staticPanels()},{signal});
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;observer?.observe(document.querySelector('#not-alone')); // Re-cache when fonts or preceding editorial content change height.
 mode();if(!enhanced){root.classList.add('is-static');staticPanels();staticControl.hidden=true;measure()}
 document.fonts.ready.then(measure);readScroll();root.dataset.ready='true';
 window.addEventListener('pagehide',event=>{cancelAnimationFrame(frame);frame=0;if(!event.persisted){destroyed=true;abort.abort();observer?.disconnect();network?.destroy()}},{signal});
 window.addEventListener('pageshow',event=>{if(event.persisted){measure();queue()}},{signal});
 // Local review API is opt-in; production visitors only get normal links and native scrolling.
 if(new URLSearchParams(location.search).has('journeyDebug'))window.productJourney={
  seek(t){scrollTo({top:start+clamp(t/END)*travel,behavior:'instant'});paint()},
  chapter:index=>go(index,'instant'),
  get state(){return {enhanced,reduced:reduced.matches,userStatic,scene:CHAPTERS[current].name,time:lastT,progress:lastT/END,start,travel,active,renderCount,pendingFrame:Boolean(frame),camera:camera.state,network:network?.state,gardens:plotElements.length+1,geometry}},
 };
}
