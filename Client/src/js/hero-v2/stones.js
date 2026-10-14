import {STONES} from './scene-config.js';
export function createStoneSystem(root){
 const nodes=STONES.map(config=>({config,node:root.querySelector(`[data-stone="${config.id}"]`)}));
 return {
  nodes,
  apply({id,x,y,width,rotation=0,depth=4}){
   const node=nodes.find(s=>s.config.id===id)?.node;if(!node)return;
   node.style.setProperty('--x',`${x/1672*100}%`);node.style.setProperty('--y',`${y/941*100}%`);
   node.style.setProperty('--w',`${width/1672*100}%`);node.style.setProperty('--rotation',`${rotation}deg`);node.style.zIndex=depth;
  },
  settle(){nodes.forEach(({config})=>this.apply({id:config.id,x:config.balance[0],y:config.balance[1],width:config.balance[2],rotation:config.balance[3]}))},
 };
}
