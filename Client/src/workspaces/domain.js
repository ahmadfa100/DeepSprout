export const id = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
export const now = () => new Date().toISOString();
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function requireThat(condition, message) { if (!condition) throw new Error(message); }
export function find(list, key) { const item=list.find(x=>x.id===key); requireThat(item,'This record is no longer available.'); return item; }
export function textRequired(value,label) { requireThat(typeof value==='string' && value.trim().length>0,`${label} is required.`); return value.trim(); }
export function numberIn(value,min,max,label) { const n=Number(value);requireThat(Number.isFinite(n)&&n>=min&&n<=max,`${label} must be between ${min} and ${max}.`);return n; }
export function dates(start,end) { requireThat(start&&end&&end>=start,'Choose valid start and end dates in order.'); }
export function ownGroup(s,personId,key) { const g=find(s.groups,key);requireThat(g.ownerId===personId,'This group belongs to a different Mentor.');return g; }
export function ownProgram(s,personId,key) { const p=find(s.programs,key);requireThat(p.ownerId===personId,'This program belongs to a different Mentor.');return p; }
export function assigned(s,personId,experienceId,sessionId) { const a=s.appointments.find(x=>x.personId===personId&&x.experienceId===experienceId&&x.status==='Accepted');requireThat(a&&(!sessionId||a.sessionIds.includes(sessionId)),'An accepted appointment for this experience and session is required.');return a; }
export function supervisedPerson(s,actorId,experienceId,personId){const cohorts=s.cohorts.filter(c=>c.supervisorId===actorId&&c.experienceId===experienceId&&c.status==='Active');requireThat(!cohorts.length||cohorts.some(c=>c.memberIds.includes(personId)),'This participant is outside your active cohorts.');}
export const occupied = (s,eid) => s.bookings.filter(x=>x.experienceId===eid&&['Confirmed','Checked In','Completed'].includes(x.status)).length + s.offers.filter(x=>x.experienceId===eid&&x.status==='Offered').length;
export const seats = (s,eid) => Math.max(0,find(s.experiences,eid).capacity-occupied(s,eid));
export function reward(s,sourceId,personId,groupId,label,source) { if(!s.rewards.some(x=>x.sourceId===sourceId&&x.personId===personId))s.rewards.push({id:id('reward'),sourceId,personId,groupId,label,source,created:now()}); }
export function audit(s,actorId,action,resource,reason='') { s.audit.unshift({id:id('audit'),actorId,action,resource,reason,result:'Saved locally',created:now()}); if(s.settings.emailNotices&&s.profileNotes[actorId]?.notices!==false)s.notifications.unshift({id:id('notice'),actorId,text:`${action}: ${resource}`,created:now(),read:false}); }
export function offerNext(s,eid) {
  const e=find(s.experiences,eid);
  if(!['Published','Active'].includes(e.status)||!e.waitlist||seats(s,eid)<1)return;
  const b=s.bookings.filter(x=>x.experienceId===eid&&x.status==='Waitlisted').sort((a,b)=>a.created.localeCompare(b.created))[0];
  if(b){b.status='Seat Offered';s.offers.push({id:id('offer'),bookingId:b.id,experienceId:eid,personId:b.personId,status:'Offered',created:now(),expires:new Date(Date.now()+s.settings.offerMinutes*60000).toISOString()});}
}
export function expireOffers(s) { let changed=false; for(const o of s.offers.filter(x=>x.status==='Offered'&&Date.parse(x.expires)<=Date.now())) {o.status='Expired';find(s.bookings,o.bookingId).status='Offer Expired';offerNext(s,o.experienceId);changed=true;}return changed; }
