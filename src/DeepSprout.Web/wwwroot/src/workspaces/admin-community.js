import {read,person} from './store.js';
import {communityRequest} from '../js/data/community-api.js';
export const COMMUNITY_KEY='deepsprout-community-demo-v1';
let originals=null;
export async function loadCommunity(){
 if(originals)return;
 const response=await fetch(new URL('../pages/member/community/community.html',import.meta.url));
 if(!response.ok)throw new Error('Community posts could not be loaded. Refresh to try again.');
 const doc=new DOMParser().parseFromString(await response.text(),'text/html');
 originals=[...(doc.querySelector('#demo-posts')?.content || doc).querySelectorAll('.post-card[data-id]')].map(card=>({id:card.dataset.id,title:card.querySelector('h2')?.textContent,body:card.querySelector('.post-body > p')?.textContent,author:card.querySelector('.post-author strong')?.textContent,category:card.dataset.category,source:'Existing community post'}));
}

const serverStates = {Draft:'pending', Published:'visible', Hidden:'hidden', Removed:'removed'};
const mapPost = post => ({...post, body:post.message, created:post.createdAt, status:serverStates[post.status]});
const blank = {loaded:true, posts:[], reports:[], history:[]};

export async function loadServerCommunity(route) {
 const tab=route.query.get('tab') || (route.page==='posts' ? 'posts' : 'reports');
 const page=Math.max(1, Number.parseInt(route.query.get('page'),10) || 1);
 const id=encodeURIComponent(route.id || '');
 const path=route.page==='audit' ? '/history?page='+page
   : id ? (route.page==='posts' ? '/posts/' : '/reports/')+id
   : '?'+new URLSearchParams({view:tab,page});
 try {
   const data=await communityRequest('/moderation'+path);
   return {...blank, page, counts:data.counts, hasMore:data.hasMore,
     posts:(data.posts || []).map(mapPost),
     reports:(data.reports || []).map(report=>({...report,id:String(report.id),created:report.createdAt,
       status:report.status==='Resolved'?'reviewed':'pending',post:report.post?mapPost(report.post):null})),
     history:(data.history || []).map(row=>({...row,created:row.createdAt}))};
 } catch (error) {
   return {...blank, error:error.message};
 }
}

export async function decideServerCommunity({post, report, status, reason}) {
 const next={visible:'Published',hidden:'Hidden',removed:'Removed',rejected:'Removed',dismissed:'Unchanged'}[status];
 const target=report?.commentId ? '/comments/'+report.commentId : '/posts/'+post.id;
 await communityRequest('/moderation'+target,'PATCH',{status:next,reason,
   reportId:report?Number(report.id):null,expectedRevision:report?.commentId?null:post.revision});
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
