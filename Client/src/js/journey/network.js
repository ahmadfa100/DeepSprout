import {anchors,communityLayout,cubic,ease,clamp} from './choreography.js';
const NS='http://www.w3.org/2000/svg';
const element=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);return e};
export function linkCurve(a,b,bend=.18){
 const dx=b.x-a.x,dy=b.y-a.y;
 return [a,{x:a.x+dx*.33-dy*bend,y:a.y+dy*.33+dx*bend},{x:a.x+dx*.67-dy*bend,y:a.y+dy*.67+dx*bend},b];
}
export const curvePoint=(points,p)=>cubic(...points,p);
export function createNetwork(svg,mobile=false){
 svg.setAttribute('viewBox','-2000 -1600 4000 3200');svg.replaceChildren();
 const a=anchors(mobile),nodes=[],edges=[],events=[],byId=new Map();
 const back=element('g',{class:'network-back'}),front=element('g',{class:'network-front'}),pulseLayer=element('g');svg.append(back,front,pulseLayer);
 function node(id,point,start,depth=0){const record={id,...point,start,depth};nodes.push(record);byId.set(id,record);return record}
 function edge(id,from,to,start,depth=0,bend=.12){
  const points=linkCurve(byId.get(from),byId.get(to),bend),[p,c1,c2,q]=points;
  const d=`M${p.x} ${p.y}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${q.x} ${q.y}`;
  const base=element('path',{d,class:'network-base'}),active=element('path',{d,class:'network-active',pathLength:1,'data-link':id});
  (depth?back:front).append(base,active);const record={id,from,to,start,depth,points,base,active};edges.push(record);return record;
 }
 node('research',{x:a.assessment.x-500,y:a.assessment.y-150},-.4);
 node('arrival',{x:a.assessment.x-320,y:a.assessment.y+60},0);
 node('assessment',a.assessment,.45);
 edge('thread','research','arrival',-.2,0,.18);edge('begin','arrival','assessment',.10,0,-.12);
 for(const [i,dx,dy,start]of [[0,-420,-265,.92],[1,-220,315,1.02],[2,410,-290,1.32],[3,450,280,1.42],[4,-15,-380,1.72],[5,480,65,1.82]]){
  node(`answer-${i}`,{x:a.assessment.x+dx,y:a.assessment.y+dy},start);
  edge(`answer-link-${i}`,'assessment',`answer-${i}`,start-.09,i%2,.14*(i%2?-1:1));
 }
 node('plan',a.plan,2.06);edge('answers-to-plan','answer-4','plan',1.80,0,-.13);edge('answers-to-plan-b','answer-2','plan',2.0,1,.11);
 for(const [id,dx,dy,start]of [['plan-a',-320,50,2.30],['plan-b',270,150,2.45],['plan-c',-80,-220,2.6]]){
  node(id,{x:a.plan.x+dx,y:a.plan.y+dy},start);edge(id+'-link','plan',id,start-.1,1,.14);
 }
 node('activities',a.activities,3.55);edge('plan-to-week','plan-b','activities',3.20,0,-.1);
 node('activity-a',{x:a.activities.x+330,y:a.activities.y-150},3.96);node('activity-b',{x:a.activities.x+270,y:a.activities.y+195},4.25);
 edge('complete-a','activities','activity-a',3.88,0,-.18);edge('complete-b','activities','activity-b',4.19,0,.15);
 node('focus',a.focus,5.02);edge('week-to-focus','activity-b','focus',4.56,0,.18);
 node('focus-a',{x:a.focus.x+300,y:a.focus.y+200},5.68);node('focus-b',{x:a.focus.x-230,y:a.focus.y+230},5.95);
 edge('session-a','focus','focus-a',5.42,1,.12);edge('session-b','focus','focus-b',5.82,0,-.16);
 node('garden',{x:a.garden.x,y:a.garden.y+80},6.90);edge('focus-to-seed','focus-b','garden',6.55,0,-.2);
 node('garden-feed',{x:a.garden.x-300,y:a.garden.y+240},6.70);edge('seed-feed','plan-a','garden-feed',6.38,1,.12);edge('garden-growth','garden-feed','garden',6.65,0,-.16);
 const plots=communityLayout(mobile);let connected=[byId.get('garden')];
 plots.forEach((plot,i)=>{
  const point={x:plot.x,y:plot.y+a.garden.y+80},start=8.30+i*.022;
  const n=node(plot.id,point,start),parent=connected.reduce((best,p)=>Math.hypot(p.x-point.x,p.y-point.y)<Math.hypot(best.x-point.x,best.y-point.y)?p:best,connected[0]);
  edge(plot.id+'-connection',parent.id,n.id,start-.07,0,(i%2?1:-1)*.065);connected.push(n);
  if(i>8&&i%3===0){const other=connected[Math.max(0,i-6)];edge(plot.id+'-branch',other.id,n.id,start+.09,1,-.045)}
 });
 // The same paths carry the answer, completion, growth and community pulses.
 const pulse=(id,start,duration=.36)=>events.push({id,start,duration});
 for(const [id,start]of [['answer-link-0',.84],['answer-link-1',.94],['answer-link-2',1.24],['answer-link-3',1.34],['answer-link-4',1.64],['answer-link-5',1.74],['answers-to-plan',1.86],['plan-to-week',3.22],['complete-a',3.90],['complete-b',4.20],['week-to-focus',4.67],['session-a',5.48],['session-b',5.87]])pulse(id,start);
 for(const t of [6.69,7.03,7.28,7.55])pulse('garden-growth',t,.27);
 plots.forEach((plot,i)=>pulse(plot.id+'-connection',8.36+i*.025,.32));
 for(const [i,n]of nodes.entries()){
  const group=element('g'),halo=element('circle',{cx:n.x,cy:n.y,r:15,class:'network-halo'}),base=element('circle',{cx:n.x,cy:n.y,r:i<3?5:4,class:'network-node'}),active=element('circle',{cx:n.x,cy:n.y,r:0,class:'network-node-active'});
  group.append(halo,base,active);(n.depth?back:front).append(group);Object.assign(n,{group,halo,base,active});
 }
 const pulseDots=Array.from({length:8},()=>{const e=element('circle',{r:4,class:'network-pulse',visibility:'hidden'});pulseLayer.append(e);return e});
 const edgeMap=new Map(edges.map(e=>[e.id,e]));let lastT=-99;
 function render(t,camera,staticView=false){
  if(t===lastT&&!staticView)return;lastT=t;
  for(const edge of edges){const draw=staticView?1:ease(edge.start,edge.start+.30,t);edge.active.style.strokeDashoffset=String(1-draw);edge.base.style.opacity=String(staticView?.5:ease(edge.start-.23,edge.start,t)*.50);edge.active.style.opacity=edge.depth?'.60':'.75'}
  for(const n of nodes){const p=staticView?1:ease(n.start,n.start+.20,t);n.group.style.opacity=String(ease(n.start-.15,n.start+.10,t));n.active.setAttribute('r',String((n.id==='garden'?6:3.2)*p));n.halo.style.opacity=String(p*.10)}
  // Only the rear branch layer gets parallax. Foreground pulse paths stay exactly on their links.
  back.setAttribute('transform',`translate(${camera.roll*1.2} ${camera.pitch*1.5})`);
  const live=staticView?[]:events.filter(e=>t>=e.start&&t<=e.start+e.duration).slice(0,pulseDots.length);
  pulseDots.forEach((dot,i)=>{const event=live[i];if(!event){dot.setAttribute('visibility','hidden');return}const link=edgeMap.get(event.id),p=clamp((t-event.start)/event.duration),point=curvePoint(link.points,p);dot.setAttribute('visibility','visible');dot.setAttribute('cx',point.x+(link.depth?camera.roll*1.2:0));dot.setAttribute('cy',point.y+(link.depth?camera.pitch*1.5:0));dot.style.opacity=String(Math.sin(Math.PI*p)*.95)});
 }
 return {render,get state(){return {nodes:nodes.length,links:edges.length,activated:nodes.filter(n=>lastT>=n.start+.2).length,pulses:events.filter(e=>lastT>=e.start&&lastT<=e.start+e.duration).map(e=>e.id),time:lastT}},destroy(){svg.replaceChildren()}};
}
