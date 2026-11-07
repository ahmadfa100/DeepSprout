/**
 * Institution-owned Outdoor Activities (trips, hikes, camps, outdoor events).
 *
 * The storage collections keep their historical names (`experiences`,
 * `experienceSessions`, `bookings`, `offers`, `providerCompletions`) so every
 * existing booking, attendance, completion and Garden source record keeps its
 * identity. Ownership changed: `ownerId` is now a verified Institution.
 */
import {requireThat,occupied,nowMs,id,now} from './domain.js';
import {checkInWindow} from './initiative-rules.js';

/** Bumped when the legacy Provider-owned records were re-homed under Institutions. */
export const ACTIVITY_DATA_VERSION = 2;
/** Kinds of real-world experience an Institution can organize. `structure` drives booking/completion rules. */
export const ACTIVITY_KINDS = [
  ['Trip','Trip or excursion','A day out to a place, with a meeting point and a return plan.'],
  ['Hike','Nature walk or hike','A guided walk outdoors at a gentle, stated pace.'],
  ['Youth event','Youth outdoor event','A one-off gathering outdoors for young people.'],
  ['Camp','Camp or multi-session experience','Several sessions, booked once, completed by published criteria.'],
  ['Community','Community outdoor activity','Cleanups, planting days and neighbourhood outdoor projects.'],
  ['Other','Other organized experience','Any other legitimate, supervised real-world experience.']
];
export const kindLabel = key => ACTIVITY_KINDS.find(k => k[0] === key)?.[1] || key || 'Outdoor Activity';

export function normalizeExperience(e,sessions=[]){
  e.version||=1;e.history||=[];e.versions||=[];e.cost||={type:'Free',price:0,currency:'JOD'};
  e.timezone||='Asia/Amman';e.format||='In-person';e.audience||=e.eligibility||'Eligible participants';
  e.kind||=(e.type==='Camp'?'Camp':'Hike');
  e.participantForm||={version:1,questions:[]};e.cancellationPolicy||={mode:'before-start'};
  e.completionRule||={kind:'all-required',version:1,requiredSessionIds:sessions.map(ss=>ss.id),conditions:''};
  for(const ss of sessions){ss.format||=e.format;ss.timezone||=e.timezone;ss.checkInPolicy||={mode:'window',before:30,after:30};}
  return e;
}

/**
 * Legacy Provider records → Institution ownership. A Provider resource moves
 * to an Institution only through an explicit, attributable mapping:
 *  1. the documented fictional seed pair (`prov-trails` → `org-horizon`), or
 *  2. the same verified person represents both the Provider and an approved Institution.
 * Anything else is archived (never deleted) with the original owner recorded,
 * so bookings, attendance and completion history stay readable.
 */
const DOCUMENTED_MAPPING = {'prov-trails':'org-horizon'};
export function rehomeProviderRecords(s){
  const providers = s.providers || [];
  const report = {mapped:[], archived:[]};
  const institutionFor = providerId => {
    const explicit = DOCUMENTED_MAPPING[providerId];
    if (explicit && s.organizations?.some(o => o.id === explicit)) return explicit;
    const provider = providers.find(p => p.id === providerId);
    return s.organizations?.find(o => o.status === 'Approved' && (provider?.memberIds || []).some(pid => o.memberIds.includes(pid)))?.id || null;
  };
  for (const e of s.experiences || []) {
    if (s.organizations?.some(o => o.id === e.ownerId)) continue;
    const provider = providers.find(p => p.id === e.ownerId);
    const target = institutionFor(e.ownerId);
    const legacy = {type:'Outdoor Provider', id:e.ownerId, name:provider?.name || 'Former Outdoor Provider'};
    if (target) {
      e.legacyOwner = legacy; e.ownerId = target;
      (e.history ||= []).push({at:now(), actorId:'system', change:'Ownership moved to Institution', reason:`Outdoor Provider retired. Mapped from ${legacy.name} to the Institution that organizes it.`});
      report.mapped.push(e.id);
    } else {
      e.legacyOwner = legacy;
      if (!['Archived','Cancelled','Completed'].includes(e.status)) { e.previousStatus = e.status; e.status = 'Archived'; }
      e.archivedReason = 'Outdoor Provider ownership was retired and no verified Institution could be mapped. History is kept read-only.';
      (e.history ||= []).push({at:now(), actorId:'system', change:'Archived during ownership migration', reason:e.archivedReason});
      for (const o of (s.offers || []).filter(o => o.experienceId === e.id && o.status === 'Offered')) { o.status = 'Cancelled'; o.reason = e.archivedReason; }
      report.archived.push(e.id);
    }
  }
  // Provider-only collaboration requests have no owner on the other side any more.
  for (const part of s.partnerships || []) {
    if (['Requested','Accepted','Active'].includes(part.status)) { (part.history ||= []).push({at:now(), actorId:'system', from:part.status, to:'Retired', reason:'Outdoor Provider partnerships were retired; Institutions organize Outdoor Activities directly.'}); part.status = 'Retired'; }
  }
  for (const p of providers) if (p.status !== 'Retired') { p.previousStatus = p.status; p.status = 'Retired'; }
  // A former Provider workspace is not an active product. Supervisor duty stays (it is appointment-scoped).
  for (const person of s.people || []) if (person.workspaces?.includes('provider')) { person.workspaces = person.workspaces.filter(w => w !== 'provider'); (person.retiredWorkspaces ||= []).push('provider'); }
  for (const a of s.applications || []) if (a.type === 'provider' && !a.retired) { a.retired = true; a.retiredNote = 'Outdoor Provider applications are retired. Institutions organize Outdoor Activities.'; }
  if (report.mapped.length || report.archived.length) (s.migrations ||= []).push({id:id('migration'), at:now(), kind:'outdoor-provider-retired', ...report});
  return report;
}

export function normalizeActivityData(s){
  let changed = false;
  if (s.providerDataVersion !== 1) {
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
    s.providerDataVersion=1;changed=true;
  }
  if (s.activityDataVersion !== ACTIVITY_DATA_VERSION) {
    for(const e of s.experiences||[])normalizeExperience(e,s.experienceSessions.filter(ss=>ss.experienceId===e.id));
    rehomeProviderRecords(s);
    s.activityDataVersion = ACTIVITY_DATA_VERSION; changed = true;
  }
  return changed;
}

export const experienceTerms=(e,sessions)=>({version:e.version||1,title:e.title,kind:e.kind,cost:structuredClone(e.cost),consent:e.consent,participantForm:structuredClone(e.participantForm),eligibility:e.eligibility,minAge:e.minAge,maxAge:e.maxAge,cancellation:e.cancellation,cancellationPolicy:structuredClone(e.cancellationPolicy),completion:e.completion,completionRule:structuredClone(e.completionRule),timezone:e.timezone,gardenPolicy:{version:1,attendance:'Verified Present or Late',camp:'Published criteria and authorized evaluation'},sessions:structuredClone(sessions)});

/** Builder stages; blockers name the stage that fixes them. */
export const ACTIVITY_STEPS = ['Basic information','Location & logistics','Eligibility & safety','Dates & seats','Booking policies','Staffing & schedule','Review & publish'];
const FIELD_STEP = {title:0,kind:0,type:0,description:0,objective:0,venue:1,address:1,city:1,timezone:1,audience:2,eligibility:2,safety:2,contact:2,consent:2,minAge:2,start:3,end:3,registrationOpen:3,registrationClose:3,capacity:3,cost:3,cancellation:4,participantForm:4,sessions:5,completion:5,completionRule:5};
const FIELD_LABEL = {title:'Add a title',description:'Write a description participants will read',objective:'State what participants will experience',audience:'Describe who this is for',venue:'Name the venue or meeting point',address:'Add the address',city:'Add the city',start:'Set the start date',end:'Set the end date',registrationOpen:'Set when bookings open',registrationClose:'Set when bookings close',timezone:'Choose a time zone',safety:'Write safety instructions',contact:'Add an on-the-day safety contact',consent:'State the participation consent',eligibility:'Describe eligibility',cancellation:'Explain the cancellation policy',completion:'Explain how completion works'};

export function activityBlockers(s,e,sessions){
  const validDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
  const validTime=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'');
  const out=[];const check=(ok,field,message)=>{if(!ok)out.push({step:FIELD_STEP[field]??6,field,message});};
  for(const field of ['title','description','objective','venue','address','city','audience','safety','contact','consent','eligibility','start','end','registrationOpen','registrationClose','timezone','cancellation','completion'])check(Boolean(String(e[field]||'').trim()),field,FIELD_LABEL[field]||`Add ${field}`);
  check(['Experience','Camp'].includes(e.type),'type','Choose a single-day experience or a multi-session camp.');
  check(!e.start||!e.end||validDay(e.start)&&validDay(e.end)&&e.end>=e.start,'end','The end date must be on or after the start date.');
  check(!e.registrationOpen||!e.registrationClose||validDay(e.registrationOpen)&&validDay(e.registrationClose)&&e.registrationOpen<=e.registrationClose&&(!e.start||e.registrationClose<=e.start),'registrationClose','Bookings must open before they close, and close no later than the start date.');
  try{new Intl.DateTimeFormat('en',{timeZone:e.timezone||'UTC'}).format();}catch{out.push({step:1,field:'timezone',message:'Choose a valid time zone.'});}
  check(Number.isInteger(Number(e.capacity))&&e.capacity>=Math.max(1,e.id?occupied(s,e.id):0)&&e.capacity<=1000,'capacity','Seats must be 1–1000 and cannot be below confirmed plus held places.');
  check(Number.isFinite(Number(e.minAge))&&e.minAge>=0&&e.minAge<=120&&(!e.maxAge||e.maxAge>=e.minAge&&e.maxAge<=120),'minAge','Check the age range.');
  check(['Free','Paid'].includes(e.cost?.type),'cost','Choose Free or Paid.');
  if(e.cost?.type==='Paid')check(Number.isFinite(Number(e.cost.price))&&Number(e.cost.price)>0&&/^[A-Z]{3}$/.test(e.cost.currency||''),'cost','A paid activity needs a positive price and a three-letter currency.');
  check(sessions.length>=(e.type==='Camp'?2:1),'sessions',e.type==='Camp'?'A camp needs at least two scheduled sessions.':'Schedule at least one session.');
  check(new Set(sessions.map(ss=>ss.id)).size===sessions.length,'sessions','Session IDs must be unique.');
  sessions.forEach((ss,i)=>{
    check(ss.title&&validDay(ss.date)&&(!e.start||ss.date>=e.start)&&(!e.end||ss.date<=e.end)&&validTime(ss.time)&&validTime(ss.endTime)&&ss.endTime>ss.time&&ss.criteria,'sessions',`Session ${i+1}: add a title, a date within the activity, start/end times in order and its completion criterion.`);
    check(['In-person','Online','Hybrid'].includes(ss.format),'sessions',`Session ${i+1}: choose how participants attend.`);
    check(ss.format==='Online'||ss.venue||e.venue,'sessions',`Session ${i+1}: in-person sessions need a venue.`);
    check(['window','anytime'].includes(ss.checkInPolicy?.mode)&&Number(ss.checkInPolicy.before)>=0&&Number(ss.checkInPolicy.before)<=240&&Number(ss.checkInPolicy.after)>=0&&Number(ss.checkInPolicy.after)<=720,'sessions',`Session ${i+1}: check the check-in window.`);
  });
  const rule=e.completionRule;check(['all-required','minimum','review'].includes(rule?.kind),'completionRule','Choose how completion is decided.');
  if(rule?.kind==='all-required')check(rule.requiredSessionIds?.length&&rule.requiredSessionIds.every(key=>sessions.some(ss=>ss.id===key)),'completionRule','Mark which sessions are required for completion.');
  if(rule?.kind==='minimum')check(Number.isInteger(Number(rule.minimum))&&rule.minimum>=1&&rule.minimum<=sessions.length,'completionRule','The minimum number of sessions must fit the schedule.');
  if(rule?.kind==='review')check(Boolean(rule.conditions?.trim()),'completionRule','Describe the conditions an authorized reviewer checks.');
  check(Number.isInteger(Number(e.participantForm?.version))&&e.participantForm.version>0,'participantForm','The booking form needs a positive version.');
  check(new Set((e.participantForm?.questions||[]).map(q=>q.id)).size===(e.participantForm?.questions||[]).length,'participantForm','Booking questions must be unique.');
  for(const q of e.participantForm?.questions||[])check(q.id&&q.label&&['text','choice'].includes(q.type)&&(q.type!=='choice'||Array.isArray(q.options)&&q.options.length>0),'participantForm','Each booking question needs a label; choices need options.');
  return out;
}
/** Plain-message form used by commands. */
export const activityPublishBlockers=(s,e,sessions)=>activityBlockers(s,e,sessions).map(b=>b.message);

export function validateRevision(s,old,next,sessions){
  requireThat(next.revisionReason?.trim(),'A published revision needs a reason.');
  const before=s.experienceSessions.filter(ss=>ss.experienceId===old.id);
  for(const ss of before){const replacement=sessions.find(x=>x.id===ss.id);requireThat(replacement,'Keep original session IDs; cancel the activity with a reason rather than deleting booked history.');
    if(s.attendance.some(a=>a.sessionId===ss.id)||checkInWindow(s,ss,old.timezone).end<=nowMs(s))requireThat(['title','date','time','endTime','venue','format','criteria'].every(k=>(replacement[k]||'')===(ss[k]||'')),'Past or recorded sessions are immutable; use an attributed correction.');}
}
