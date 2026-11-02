import {read,person} from './store.js';
export const COMMUNITY_KEY='deepsprout-community-demo-v1';
let originals=null;
export async function loadCommunity(){
 if(originals)return;
 const response=await fetch(new URL('../pages/member/community/community.html',import.meta.url));
 if(!response.ok)throw new Error('Community posts could not be loaded. Refresh to try again.');
 const doc=new DOMParser().parseFromString(await response.text(),'text/html');
 originals=[...doc.querySelectorAll('.post-card[data-id]')].map(card=>({id:card.dataset.id,title:card.querySelector('h2')?.textContent,body:card.querySelector('.post-body > p')?.textContent,author:card.querySelector('.post-author strong')?.textContent,category:card.dataset.category,source:'Existing community post'}));
}
export function communityRecords(){
 const data=JSON.parse(localStorage.getItem(COMMUNITY_KEY)||'{}');
 const posts=new Map((originals||[]).map(p=>[p.id,p]));
 for(const r of data.reports||[])if(r.post&&!posts.has(r.postId))posts.set(r.postId,{...r.post,id:r.postId});
 for(const p of data.posts||[])posts.set(p.id,{...p,body:p.message,author:p.author||'Member on this device'});
 return {loaded:!!originals,posts:[...posts.values()].map(p=>({...p,status:data.moderation?.[p.id]||'visible'})),reports:data.reports||[],history:data.moderationHistory||[]};
}
export function decideCommunity({postId,reportId,status,reason}){
 const actor=person(read());if(actor?.status!=='Active'||!actor?.workspaces.includes('admin'))throw new Error('Administrator access is required.');
 if(!reason?.trim())throw new Error('Add a reason for this decision.');
 if(!['visible','hidden','removed','dismissed','rejected'].includes(status))throw new Error('Choose a valid decision.');
 const data=JSON.parse(localStorage.getItem(COMMUNITY_KEY)||'{}');
 if(!communityRecords().posts.some(p=>p.id===postId))throw new Error('This post is no longer available.');
 if(reportId){const report=(data.reports||[]).find(r=>r.id===reportId);if(!report||report.status!=='pending')throw new Error('This report has already been reviewed.');report.status=status==='dismissed'?'dismissed':'reviewed';report.notes=reason.trim();report.reviewedAt=new Date().toISOString();report.reviewerId=actor.id;}
 if(status!=='dismissed'){data.moderation||={};data.moderation[postId]=status;}
 (data.moderationHistory||=[]).push({postId,reportId:reportId||null,status,reason:reason.trim(),actorId:actor.id,created:new Date().toISOString()});
 try{localStorage.setItem(COMMUNITY_KEY,JSON.stringify(data));}catch{throw new Error('The decision could not be saved. Allow browser storage and try again.');}
}
