import vm from 'node:vm';
import fs from 'node:fs';
import {seed,snapshotForTests,dispatch} from '../../src/workspaces/store.js';
export function fixture(){
 const values=new Map();let failing='';const storage={getItem:k=>values.get(k)||null,setItem(k,v){if(failing==='*'||failing===k)throw new Error('QuotaExceededError');values.set(k,String(v));},removeItem:k=>values.delete(k)};globalThis.localStorage=storage;snapshotForTests(seed());
 return {values,storage,fail:k=>{failing=k;},register:(name='Personal A')=>dispatch('member.register',{name,email:name.replaceAll(' ','').toLowerCase()+'@round2a.test',consent:true})};
}
export function page(storage){
 const context=vm.createContext({console,URL,URLSearchParams,Date,Math,JSON,Promise,localStorage:storage,sessionStorage:{getItem:()=>null,setItem(){}},location:{search:'',pathname:'/src/pages/member/lab/lab.html',href:'http://localhost/src/pages/member/lab/lab.html',hostname:'localhost'},document:{getElementById:()=>null,readyState:'loading',currentScript:{src:'http://localhost/src/js/data/account.js'},body:null,addEventListener(){},querySelectorAll:()=>[]},CustomEvent:class{constructor(type){this.type=type;}},addEventListener(){},dispatchEvent(){},fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../../'+new URL(url).pathname.replace(/^\//,''),import.meta.url),'utf8'))})});context.window=context;
 for(const file of ['js/data/personal-access.js','js/utils/storage.js','js/data/account.js'])vm.runInContext(fs.readFileSync(new URL('../../src/'+file,import.meta.url),'utf8'),context);return context;
}
export function result(account,id,overrides={}){
 const run=account.beginAssessment(id,{context:{presentation:'simulated-fixture'}});const raw=id==='digital-habits'?{answers:Object.fromEntries(Array.from({length:8},(_,i)=>['q'+(i+1),2]))}:id==='depth-challenge'?{answers:[0,1,2,2,0],readingSeconds:100,correct:5,total:5}:{hits:Array(id==='sustained-attention'?24:30).fill(300),goTotal:id==='sustained-attention'?24:30,noGoTotal:id==='sustained-attention'?0:10,omissions:0,commissions:0,falseAlarms:0,inputMethods:['simulated-fixture']};
 return account.mutate({type:'assessment.add',attempt:{id:run.id,definitionId:id,official:true,version:run.version,valid:true,score:id==='digital-habits'?16:id==='depth-challenge'?5:100,details:[{label:'Original demo evidence',value:'Complete'}],raw,...overrides}}).attempt;
}
export function baselines(account){if(!account.profile().goal)account.mutate({type:'setup.save',goal:{id:'reduce-scrolling',label:'Spend less time on short-video feeds'},setup:{availableDays:'3',offlineInterests:['walking']}});return ['digital-habits','sustained-attention','inhibitory-control','depth-challenge'].map(id=>result(account,id));}
