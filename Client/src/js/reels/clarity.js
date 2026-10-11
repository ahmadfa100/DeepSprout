import {clamp,smooth} from './story-math.js';

// The semantic HTML is the content/data source. No JS-only copies of claims or links.
export function createClarity(section){
 const facts=section.querySelector('.clarity-facts'),brain=section.querySelector('.brain-rot'),research=section.querySelector('.clarity-research');
 const stats=[...section.querySelectorAll('.clarity-stat')].map(node=>({node,value:node.querySelector('[data-count]'),count:Number(node.querySelector('[data-count]').dataset.count),format:node.querySelector('[data-count]').dataset.format}));
 const sources=[...section.querySelectorAll('.research-source')];
 let metrics,lastKey='';
 function resize(){metrics=[facts,brain,research,...stats.map(s=>s.node)].map(el=>({top:el.getBoundingClientRect().top+scrollY,height:el.offsetHeight}));lastKey=''}
 function render(reduced=false){
  const key=`${scrollY}:${innerHeight}:${reduced}`;if(key===lastKey)return;lastKey=key;
  const progress=({top,height},distance=1)=>clamp((scrollY+innerHeight*.86-top)/Math.min(height,innerHeight*distance));
  const p=reduced?1:progress(metrics[0],.72);
  facts.style.setProperty('--section-reveal',smooth(0,.20,p));
  facts.style.setProperty('--rule-reveal',smooth(.08,.42,p));
  stats.forEach(({node,value,count,format},i)=>{
   const mobile=innerWidth<=700,start=mobile?.05:.15+i*.17,local=reduced?1:mobile?progress(metrics[i+3],.5):p;
   const n=smooth(start,start+.26,local),label=smooth(start+.09,start+.33,local),source=smooth(start+.16,start+.40,local);
   node.style.setProperty('--number-reveal',n);node.style.setProperty('--label-reveal',label);node.style.setProperty('--source-reveal',source);
   const v=Math.round(count*n),text=format==='minutes'?`${Math.floor(v/60)}h ${String(v%60).padStart(2,'0')}m`:`${v}%`;
   if(value.textContent!==text)value.textContent=text;
  });
  const b=reduced?1:progress(metrics[1],.7);
  brain.style.setProperty('--section-reveal',smooth(0,.32,b));
  // A single small disturbance resolves into sharp type; no flickering or random jitter.
  brain.style.setProperty('--disturbance',Math.sin(clamp(b/.7)*Math.PI)*(1-smooth(.45,.7,b)));
  const r=reduced?1:progress(metrics[2],.6);
  research.style.setProperty('--section-reveal',smooth(0,.30,r));
  sources.forEach((el,i)=>el.style.setProperty('--source-reveal',smooth(.12+i*.15,.48+i*.15,r)));
 }
 resize();return{render,resize};
}
