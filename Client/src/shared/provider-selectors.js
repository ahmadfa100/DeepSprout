import {bookingEvidence} from '../workspaces/provider-completion.js';
import {checkInWindow} from '../workspaces/initiative-rules.js';
/** Public and participant-owned projections over original Provider records. */
import {providerApproved,providerOpen,seats,occupied,clockDay,nowMs} from '../workspaces/domain.js';
export const providerBookingLink = experienceId => `src/pages/member/explore/explore.html#experience=${encodeURIComponent(experienceId)}`;
export function providerExperience(s,e,personId){
  const owner=s.providers.find(p=>p.id===e.ownerId);
  const sessions=s.experienceSessions.filter(ss=>ss.experienceId===e.id).map(ss=>({id:ss.id,title:ss.title,date:ss.date,time:ss.time,endTime:ss.endTime,venue:ss.venue||e.venue,format:ss.format||e.format||'In-person',criteria:ss.criteria,checkInPolicy:ss.checkInPolicy||{mode:'window',before:30,after:30},needsSupervisor:!s.appointments.some(a=>a.experienceId===e.id&&a.status==='Accepted'&&a.sessionIds.includes(ss.id)&&s.people.some(p=>p.id===a.personId&&p.status==='Active'))}));
  return {...Object.fromEntries(['id','ownerId','title','type','category','description','objective','venue','address','city','country','start','end','timezone','capacity','minAge','maxAge','audience','eligibility','conditions','accessibility','registrationOpen','registrationClose','approval','waitlist','cancellation','safety','contact','consent','version','status','completion','completionRule','participantForm','cost'].map(k=>[k,e[k]])),
    organizer:owner?.name||'Provider',organizerCity:owner?.city||'',kind:'experience',kindLabel:e.type||'Experience',summary:e.description||'',image:e.cover||'assets/home-redesign/forest-hike.jpg',imageAlt:'Published Provider experience',
    modes:[...new Set(sessions.map(ss=>ss.format))],sessions,remaining:seats(s,e.id),occupied:occupied(s,e.id),canBook:providerOpen(s,e),canAttend:providerApproved(s,e.ownerId)&&['Published','Active'].includes(e.status)&&(!e.end||e.end>=clockDay(s,e.timezone)),ownerActive:providerApproved(s,e.ownerId),
    mine:s.bookings.filter(b=>b.experienceId===e.id&&b.personId===personId).map(b=>({id:b.id,status:b.status})).at(-1)||null};
}
export function exploreProviderExperiences(s,personId){
  return s.experiences.filter(e=>['Published','Active'].includes(e.status)&&providerApproved(s,e.ownerId)&&(!e.end||e.end>=clockDay(s,e.timezone))).map(e=>providerExperience(s,e,personId));
}
export function myProviderBookings(s,personId){
  return s.bookings.filter(b=>b.personId===personId).map(b=>{
    const e=s.experiences.find(e=>e.id===b.experienceId);if(!e)return null;
    const offer=s.offers.filter(o=>o.bookingId===b.id).at(-1);
    const first=(b.terms?.sessions||s.experienceSessions.filter(ss=>ss.experienceId===e.id)).slice().sort((a,b)=>a.date.localeCompare(b.date))[0];
    const canCancel=!['Cancelled','Completed','Declined','Rejected','Offer Expired'].includes(b.status)&&((b.terms?.cancellationPolicy||e.cancellationPolicy)?.mode==='anytime'||!first||!checkInWindow(s,first,b.terms?.timezone||e.timezone).started);
    return {id:b.id,canCancel,experienceId:e.id,personId:b.personId,status:b.status,created:b.created,credential:b.credential||'',eligibility:b.eligibility||null,mode:b.mode||'In-person',sessionModes:b.sessionModes||{},payment:b.payment||null,termsHistory:b.termsHistory||[],history:b.history||[],terms:b.terms||null,
      experience:providerExperience(s,e,personId),offer:offer?{id:offer.id,status:offer.status,expires:offer.expires,remainingMs:Math.max(0,Date.parse(offer.expires)-nowMs(s))}:null,
      attendance:bookingEvidence(s,b).attendance.map(a=>({id:a.id,sessionId:a.sessionId,status:a.status,created:a.created,method:a.method,history:a.history||[]})),
      evaluations:bookingEvidence(s,b).evaluations.map(a=>({id:a.id,sessionId:a.sessionId,status:a.status,created:a.created})),
      completion:(s.providerCompletions||[]).find(c=>c.bookingId===b.id)||null};
  }).filter(Boolean);
}

export function providerReport(s,experienceId,{from='',to='',personIds=null,sessionIds=null}={}){
 const e=s.experiences.find(e=>e.id===experienceId);if(!e)return null;
 const inRange=value=>(!from||String(value).slice(0,10)>=from)&&(!to||String(value).slice(0,10)<=to);
 const bookings=s.bookings.filter(b=>b.experienceId===e.id&&inRange(b.created)&&(!personIds||personIds.includes(b.personId)));
 const sessions=s.experienceSessions.filter(ss=>ss.experienceId===e.id&&(!sessionIds||sessionIds.includes(ss.id)));
 const rows=bookings.map(b=>{const facts=bookingEvidence(s,b),attendance=facts.attendance.filter(a=>sessions.some(ss=>ss.id===a.sessionId)&&a.status!=='Corrected'),completion=(s.providerCompletions||[]).find(c=>c.bookingId===b.id);return {bookingId:b.id,personId:b.personId,status:b.status,present:attendance.filter(a=>a.status==='Present').length,late:attendance.filter(a=>a.status==='Late').length,absent:attendance.filter(a=>a.status==='Absent').length,notRecorded:['Confirmed','Checked In','Completed'].includes(b.status)?Math.max(0,sessions.length-attendance.length):0,qualifying:(completion?.qualifyingSessionIds||[]).filter(id=>sessions.some(ss=>ss.id===id)).length,completion:completion?.status||'Pending',completionId:completion?.id||null};});
 const offers=s.offers.filter(o=>o.experienceId===e.id&&bookings.some(b=>b.id===o.bookingId));
 return {experienceId:e.id,capacity:e.capacity,bookingCount:bookings.length,confirmed:bookings.filter(b=>['Confirmed','Checked In','Completed'].includes(b.status)).length,held:offers.filter(o=>o.status==='Offered'&&Date.parse(o.expires)>nowMs(s)).length,queued:bookings.filter(b=>b.status==='Waitlisted').length,completed:rows.filter(r=>r.completion==='Completed').length,present:rows.reduce((n,r)=>n+r.present,0),late:rows.reduce((n,r)=>n+r.late,0),absent:rows.reduce((n,r)=>n+r.absent,0),notRecorded:rows.reduce((n,r)=>n+r.notRecorded,0),rows,offerOutcomes:offers.map(o=>({id:o.id,status:o.status,bookingId:o.bookingId}))};
}
