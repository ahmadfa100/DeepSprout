// Member posts/reports remain in their existing store. Admin sample data stays separate.
const KEY='deepsprout-community-demo-v1';
const readLocal=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}};
export function communityRecords(data){
  const local=readLocal();
  const reports=Array.isArray(local.reports)?local.reports:[];
  const posts=new Map();
  for(const p of Array.isArray(local.posts)?local.posts:[])posts.set(p.id,{id:p.id,title:p.title,body:p.message,author:'Member on this device',status:local.moderation?.[p.id]||'visible',source:'member'});
  for(const r of reports)if(!posts.has(r.postId)&&r.post)posts.set(r.postId,{...r.post,status:local.moderation?.[r.postId]||'visible',source:'member'});
  return {posts:[...data.community.posts,...posts.values()],reports:[...data.community.reports,...reports.map(r=>({...r,source:'member'}))],jointGoals:data.community.jointGoals};
}
export function saveMemberModeration(reportId,action){
  const local=readLocal(),report=local.reports?.find(r=>r.id===reportId);if(!report)return false;
  report.status=action==='report-dismiss'?'dismissed':'reviewed';
  if(action!=='report-dismiss'){
    local.moderation||={};
    local.moderation[report.postId]=action==='report-hide'?'hidden':'visible';
  }
  localStorage.setItem(KEY,JSON.stringify(local));
  return true;
}
