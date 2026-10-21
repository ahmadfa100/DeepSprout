export const id = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
/**
 * Operational clock. The demo offset (set from the workspace demo panel or a
 * test) moves record timestamps, eligibility windows and every expiry check
 * together, so screens never disagree about "today". `read()` keeps the
 * module offset in step with the stored graph.
 */
let clockOffset = 0;
export const setClockOffset = ms => { clockOffset = Number(ms) || 0; };
export const now = () => new Date(Date.now() + clockOffset).toISOString();
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now() + clockOffset));
export const nowMs = s => Date.now() + Number(s?.clock?.offsetMs ?? clockOffset);
export const clockISO = s => new Date(nowMs(s)).toISOString();
export const clockDay = (s,timezone='Asia/Amman') => new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(nowMs(s)));
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
/**
 * One reward per (source, beneficiary, effect). `effect` defaults to the historical
 * 'group-contribution' so earlier records and tests keep their meaning.
 */
export function reward(s,sourceId,personId,groupId,label,source,extra={}) {
  const effect=extra.effect||'group-contribution';
  if(s.rewards.some(x=>x.sourceId===sourceId&&x.personId===personId&&(x.effect||'group-contribution')===effect))return false;
  s.rewards.push({id:id('reward'),sourceId,personId,groupId,label,source,effect,created:now(),...extra});
  return true;
}
/** Local, visible notice for one recipient. It is never claimed as a delivered email. */
export function notify(s,recipientId,text,link='',kind='update',metadata={}) {
  if(!recipientId)return;
  (s.notifications||=[]).unshift({id:id('notice'),recipientId,actorId:recipientId,text,link,kind,created:now(),read:false,...metadata});
}
export function audit(s,actorId,action,resource,reason='') { s.audit.unshift({id:id('audit'),actorId,action,resource,reason,result:'Saved locally',created:now()}); if(s.settings.emailNotices&&s.profileNotes[actorId]?.notices!==false)s.notifications.unshift({id:id('notice'),actorId,text:`${action}: ${resource}`,created:now(),read:false}); }
export const bookingDestination=(s,b)=>s.people.find(p=>p.id===b.personId)?.individual?`src/pages/member/explore/explore.html#experience=${encodeURIComponent(b.experienceId)}`:`workspaces.html#/participant/bookings/${b.id}`;
export function bookingNotice(s,b,text,kind,extra={}){notify(s,b.personId,text,bookingDestination(s,b),kind,{experienceId:b.experienceId,bookingId:b.id,...extra});}
export const offerHours=(s,e)=>Number(e?.offerHours||s.settings.providerOfferHours||24);
export function offerNext(s,eid) {
  const e=find(s.experiences,eid);let count=0;
  if(!providerOpen(s,e)||!e.waitlist)return count;
  while(seats(s,eid)>0){
    const b=s.bookings.filter(x=>x.experienceId===eid&&x.status==='Waitlisted'&&s.people.some(p=>p.id===x.personId&&p.status==='Active'&&p.verified)&&x.eligible===true&&(!x.eligibility||(x.eligibility.consent&&x.eligibility.version===(e.version||1)&&x.eligibility.age>=Number(e.minAge||0)&&(!e.maxAge||x.eligibility.age<=Number(e.maxAge))))).sort((a,b)=>a.created.localeCompare(b.created))[0];
    if(!b)break;
    const hours=offerHours(s,e),o={id:id('offer'),bookingId:b.id,experienceId:eid,personId:b.personId,status:'Offered',created:now(),expires:new Date(nowMs(s)+hours*3600000).toISOString(),hours,resourceVersion:e.version||1};
    b.status='Seat Offered';b.queueState='Offered';(b.history||=[]).push({at:now(),actorId:'system',change:'Seat offered',offerId:o.id,expires:o.expires});s.offers.push(o);count++;
    bookingNotice(s,b,`A seat is offered for ${e.title}. Accept within ${hours} hours. This is a local notice; no email was sent.`,'provider-offer',{offerId:o.id,actorId:'system'});
  }
  return count;
}
export function expireOffers(s) { let changed=false; for(const o of s.offers.filter(x=>x.status==='Offered'&&Date.parse(x.expires)<=nowMs(s))) {const b=find(s.bookings,o.bookingId);o.status='Expired';o.expiredAt=now();b.status='Offer Expired';b.queueState='Expired';(b.history||=[]).push({at:now(),actorId:'system',change:'Offer expired',offerId:o.id});bookingNotice(s,b,'Your held seat expired. You have no confirmed booking from this offer.','provider-offer-expired',{offerId:o.id,actorId:'system'});offerNext(s,o.experienceId);changed=true;}return changed; }

/** Effective ownership and windows are checked at transitions, never inferred from publication alone. */
export const institutionApproved = (s, ownerId) => Boolean(s.organizations?.some(o=>o.id===ownerId&&o.status==='Approved'&&o.memberIds.some(pid=>s.people.some(p=>p.id===pid&&p.status==='Active')&&s.applications.some(a=>a.personId===pid&&a.type==='organization'&&a.status==='Approved'))));
export const providerApproved = (s, ownerId) => Boolean(s.providers?.some(o=>o.id===ownerId&&o.status==='Approved'&&o.memberIds.some(pid=>s.people.some(p=>p.id===pid&&p.status==='Active')&&s.applications.some(a=>a.personId===pid&&a.type==='provider'&&a.status==='Approved'))));
export function providerOpen(s,e) {
  const day=clockDay(s,e?.timezone||'Asia/Amman');
  return Boolean(e&&providerApproved(s,e.ownerId)&&['Published','Active'].includes(e.status)&&(!e.registrationOpen||day>=e.registrationOpen)&&(!e.registrationClose||day<=e.registrationClose)&&(!e.end||day<=e.end));
}
export function requireBookingEligibility(s,e,b) {
  requireThat(providerOpen(s,e),'The Provider or experience is unavailable, or its booking window is closed.');
  const person=find(s.people,b.personId);
  requireThat(person.status==='Active'&&person.verified,'An active verified participant is required.');
  // Older accepted eligibility records remain evidence; newly created bookings keep their exact consent/version/age.
  requireThat(b.eligible===true,'Confirm your eligibility and read the safety notes.');
  if(b.eligibility){requireThat(b.eligibility.consent&&b.eligibility.version===(e.version||1)&&b.eligibility.age>=Number(e.minAge||0)&&(!e.maxAge||b.eligibility.age<=Number(e.maxAge)),'Eligibility or consent changed. Cancel and submit a new booking.');}
  requireThat(!s.bookings.some(x=>x.id!==b.id&&x.experienceId===e.id&&x.personId===b.personId&&!['Cancelled','Rejected','Offer Expired','Declined'].includes(x.status)),'You already have a registration for this experience.');
}
/** Shared task state for both Student and Individual reads and writes. Date-only deadlines include the entire Amman day. */
export function taskBlockReason(s,a,g,personId,{window=true}={}) {
  if(a.status!=='Active')return 'This assignment is cancelled or inactive. Earlier work stays in your history.';
  if(!g||!g.memberIds.includes(personId)||a.studentId&&a.studentId!==personId)return 'This task is outside your current membership.';
  if(['Archived','Completed','Closed','Cancelled','Suspended'].includes(g.status))return 'This group is not active.';
  if(g.parentType==='initiative'){
    const i=s.initiatives.find(i=>i.id===g.initiativeId);
    if(!i||i.status!=='Published'||!institutionApproved(s,i.ownerId))return 'This Initiative or Institution is not active.';
    if(!s.grants.some(x=>x.personId===g.coachId&&x.scopeId===i.id&&x.role==='coach'&&x.status==='Active')||!s.people.some(x=>x.id===g.coachId&&x.status==='Active'))return 'This group needs a current assigned Coach.';
    if(!s.admissions.some(x=>x.personId===personId&&x.initiativeId===i.id&&x.status==='Accepted'))return 'Your Initiative participation is not active.';
  }else{
    const pr=s.programs.find(p=>p.id===g.programId);
    if(!pr||!['Published','Paused'].includes(pr.status)||!s.people.some(x=>x.id===g.ownerId&&x.status==='Active')||!s.applications.some(x=>x.personId===g.ownerId&&x.type==='mentor'&&x.status==='Approved'))return 'This Coach Program is not running.';
  }
  const day=clockDay(s), stamp=value=>String(value).length>10;
  if(window&&a.start&&(stamp(a.start)?nowMs(s)<Date.parse(a.start):day<a.start))return 'This task has not started yet.';
  if(window&&a.due&&a.allowLate!==true&&(stamp(a.due)?nowMs(s)>Date.parse(a.due):day>a.due))return 'This task deadline has passed. Ask your Coach to reschedule it.';
  return '';
}
