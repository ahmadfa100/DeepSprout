import {requireThat,occupied,nowMs} from './domain.js';
import {checkInWindow} from './initiative-rules.js';
export const PROVIDER_DATA_VERSION=1;
export function normalizeExperience(e,sessions=[]){
  e.version||=1;e.history||=[];e.versions||=[];e.cost||={type:'Free',price:0,currency:'JOD'};
  e.timezone||='Asia/Amman';e.format||='In-person';e.audience||=e.eligibility||'Eligible participants';
  e.participantForm||={version:1,questions:[]};e.cancellationPolicy||={mode:'before-start'};
  e.completionRule||={kind:'all-required',version:1,requiredSessionIds:sessions.map(ss=>ss.id),conditions:''};
  for(const ss of sessions){ss.format||=e.format;ss.timezone||=e.timezone;ss.checkInPolicy||={mode:'window',before:30,after:30};}
  return e;
}
export function normalizeProviderData(s){
  if(s.providerDataVersion===PROVIDER_DATA_VERSION)return false;
  s.settings||={};s.settings.legacyProviderOfferMinutes??=s.settings.offerMinutes??15;
  s.settings.providerOfferHours??=s.settings.offerMinutes&&s.settings.offerMinutes!==15?s.settings.offerMinutes/60:24;
  s.settings.offerMinutes=s.settings.providerOfferHours*60;
  s.providerCompletions||=[];
  for(const e of s.experiences||[])normalizeExperience(e,s.experienceSessions.filter(ss=>ss.experienceId===e.id));
  // Backfill only attributable legacy all-session completion; never infer rules from free text.
  for(const b of s.bookings||[]){
    if(b.status!=='Completed'||s.providerCompletions.some(c=>c.bookingId===b.id))continue;
    const e=s.experiences.find(e=>e.id===b.experienceId),sessions=s.experienceSessions.filter(ss=>ss.experienceId===e?.id);
    if(!e||e.completionRule.kind!=='all-required'||e.completionRule.conditions||!sessions.length||s.bookings.filter(x=>x.experienceId===e.id&&x.personId===b.personId).length!==1)continue;
    const rows=sessions.map(ss=>({a:s.attendance.find(a=>a.experienceId===e.id&&a.sessionId===ss.id&&a.personId===b.personId&&['Present','Late'].includes(a.status)),v:s.evaluations.find(v=>v.experienceId===e.id&&v.sessionId===ss.id&&v.personId===b.personId&&v.status==='Completed')}));
    if(rows.some(row=>!row.a||!row.v))continue;
    s.providerCompletions.push({id:`legacy-provider-completion:${b.id}`,bookingId:b.id,experienceId:e.id,personId:b.personId,status:'Completed',resourceVersion:e.version,policyVersion:1,rule:structuredClone(e.completionRule),attendanceIds:rows.map(row=>row.a.id),evaluationIds:rows.map(row=>row.v.id),qualifyingSessionIds:sessions.map(ss=>ss.id),actorId:rows.at(-1).v.actorId,created:b.completedAt||rows.at(-1).v.created,updated:b.completedAt||rows.at(-1).v.created,legacy:true,history:[{change:'Mapped original all-session completion evidence',source:'Legacy operational records'}]});
  }
  s.providerDataVersion=PROVIDER_DATA_VERSION;return true;
}
export const experienceTerms=(e,sessions)=>({version:e.version||1,title:e.title,cost:structuredClone(e.cost),consent:e.consent,participantForm:structuredClone(e.participantForm),eligibility:e.eligibility,minAge:e.minAge,maxAge:e.maxAge,cancellation:e.cancellation,cancellationPolicy:structuredClone(e.cancellationPolicy),completion:e.completion,completionRule:structuredClone(e.completionRule),timezone:e.timezone,gardenPolicy:{version:1,attendance:'Verified Present or Late',camp:'Published criteria and authorized evaluation'},sessions:structuredClone(sessions)});
export function providerPublishBlockers(s,e,sessions){
  const validDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
  const validTime=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'');
  const errors=[];const check=(ok,msg)=>{if(!ok)errors.push(msg);};
  for(const field of ['title','description','objective','audience','venue','address','city','start','end','registrationOpen','registrationClose','timezone','safety','contact','consent','eligibility','cancellation','completion'])check(Boolean(String(e[field]||'').trim()),`Add ${field}.`);
  check(['Experience','Camp'].includes(e.type),'Choose Experience or Camp.');
  check(validDay(e.start)&&validDay(e.end)&&e.end>=e.start,'Choose valid experience dates in order.');
  check(validDay(e.registrationOpen)&&validDay(e.registrationClose)&&e.registrationOpen<=e.registrationClose&&e.registrationClose<=e.start,'Booking opening/closing dates must be ordered and close no later than the start date.');
  try{new Intl.DateTimeFormat('en',{timeZone:e.timezone}).format();}catch{errors.push('Choose a valid IANA timezone.');}
  check(Number.isInteger(Number(e.capacity))&&e.capacity>=Math.max(1,e.id?occupied(s,e.id):0)&&e.capacity<=1000,'Capacity must be 1–1000 and cannot be below confirmed plus held seats.');
  check(Number.isFinite(Number(e.minAge))&&e.minAge>=0&&e.minAge<=120&&(!e.maxAge||e.maxAge>=e.minAge&&e.maxAge<=120),'Check age eligibility bounds.');
  check(['Free','Paid'].includes(e.cost?.type),'Choose Free or Paid.');
  if(e.cost?.type==='Paid')check(Number.isFinite(Number(e.cost.price))&&Number(e.cost.price)>0&&/^[A-Z]{3}$/.test(e.cost.currency||''),'Paid experiences need a positive price and a three-letter currency.');
  check(sessions.length>=(e.type==='Camp'?2:1),'A Camp needs at least two sessions; an Experience needs one.');
  check(new Set(sessions.map(ss=>ss.id)).size===sessions.length,'Session IDs must be unique.');
  for(const ss of sessions){check(ss.title&&validDay(ss.date)&&ss.date>=e.start&&ss.date<=e.end&&validTime(ss.time)&&validTime(ss.endTime)&&ss.endTime>ss.time&&ss.criteria,'Each session needs a title, date/time within the experience and completion criteria.');check(['In-person','Online','Hybrid'].includes(ss.format),'Choose each session participation mode.');check(ss.format==='Online'||ss.venue||e.venue,'In-person sessions need a venue.');check(['window','anytime'].includes(ss.checkInPolicy?.mode)&&Number(ss.checkInPolicy.before)>=0&&Number(ss.checkInPolicy.before)<=240&&Number(ss.checkInPolicy.after)>=0&&Number(ss.checkInPolicy.after)<=720,'Check the session check-in policy.');}
  const rule=e.completionRule;check(['all-required','minimum','review'].includes(rule?.kind),'Choose a structured completion rule.');
  if(rule?.kind==='all-required')check(rule.requiredSessionIds?.length&&rule.requiredSessionIds.every(id=>sessions.some(ss=>ss.id===id)),'Select the required completion sessions.');
  if(rule?.kind==='minimum')check(Number.isInteger(Number(rule.minimum))&&rule.minimum>=1&&rule.minimum<=sessions.length,'Minimum completion sessions must fit the schedule.');
  if(rule?.kind==='review')check(Boolean(rule.conditions?.trim()),'Describe the conditions requiring an authorized review.');
  check(Number.isInteger(Number(e.participantForm?.version))&&e.participantForm.version>0,'Participant form needs a positive version.');
  check(new Set((e.participantForm?.questions||[]).map(q=>q.id)).size===(e.participantForm?.questions||[]).length,'Participant question IDs must be unique.');
  for(const q of e.participantForm?.questions||[])check(q.id&&q.label&&['text','choice'].includes(q.type)&&(q.type!=='choice'||Array.isArray(q.options)&&q.options.length>0),'Check participant form questions.');
  return errors;
}
export function validateRevision(s,old,next,sessions){
  requireThat(next.revisionReason?.trim(),'A published revision needs a reason.');
  const before=s.experienceSessions.filter(ss=>ss.experienceId===old.id);
  for(const ss of before){const replacement=sessions.find(x=>x.id===ss.id);requireThat(replacement,'Keep original session IDs; cancel the resource with a reason rather than deleting booked history.');
    if(s.attendance.some(a=>a.sessionId===ss.id)||checkInWindow(s,ss,old.timezone).end<=nowMs(s))requireThat(['title','date','time','endTime','venue','format','criteria'].every(k=>(replacement[k]||'')===(ss[k]||'')),'Past or recorded sessions are immutable; use an attributed correction.');}
}
