import {bookingEvidence,reconcileCompletion,decideCompletion} from '../activity-completion.js';
import {normalizeExperience,experienceTerms,activityPublishBlockers,validateRevision} from '../activity-rules.js';
import {assertWindow,checkInWindow} from '../initiative-rules.js';
import {activityOwnerApproved,bookingNotice,requireBookingEligibility,id,now,nowMs,notify,requireThat,find,textRequired,numberIn,dates,assigned,supervisedPerson,occupied,seats,audit,offerNext} from '../domain.js';
/**
 * Institution-owned Outdoor Activities. Owner commands use the `activity.*`
 * prefix and are authorized in store.js against the Representative's own
 * Institution (`p.ownerId`). Supervisor commands stay appointment-scoped.
 */
export function outdoorCommand(s,action,p,actor) {
  const memberActions={'member.experience.book':'participant.book','member.booking.cancel':'participant.booking.cancel','member.booking.offer.accept':'participant.offer.accept','member.booking.offer.decline':'participant.offer.decline','member.booking.reconfirm':'participant.booking.reconfirm'};
  if(memberActions[action]){requireThat(find(s.people,actor).individual,'A full Individual account is required.');action=memberActions[action];}
  if(action==='activity.experience.save'){
    const old=p.id?find(s.experiences,p.id):null;
    requireThat(!old||['Draft','Published','Active'].includes(old.status),'This Outdoor Activity cannot be edited.');
    const sessions=(p.sessions||[]).map(ss=>({...ss,id:ss.id||id('session')}));
    requireThat(sessions.every(ss=>!s.experienceSessions.some(other=>other.id===ss.id&&other.experienceId!==old?.id)),'A session ID belongs to another resource.');
    const record=normalizeExperience({...p,id:old?.id||id('experience'),ownerId:p.ownerId,status:old?.status||'Draft',version:old?.version||1,cover:p.cover||'assets/home-redesign/forest-hike.jpg'},sessions);
    record.title=textRequired(p.title,'Activity title');record.capacity=numberIn(p.capacity||1,1,1000,'Capacity');
    if(old&&old.status!=='Draft'){record.baseVersion=old.version;old.revisionDraft={...record,sessions};return old.id;}
    delete record.sessions;
    if(old)Object.assign(old,record);else s.experiences.push(record);
    s.experienceSessions=s.experienceSessions.filter(ss=>ss.experienceId!==record.id);for(const ss of sessions)s.experienceSessions.push({...ss,experienceId:record.id});
    return record.id;
  }
  if(action==='activity.experience.publish'){
    const e=find(s.experiences,p.id),revision=e.status!=='Draft',next=revision?e.revisionDraft:e;
    requireThat(next&&(!revision||['Published','Active'].includes(e.status)),'Only a draft or saved published revision can be published.');
    const sessions=revision?next.sessions:s.experienceSessions.filter(ss=>ss.experienceId===e.id);
    const blockers=activityPublishBlockers(s,next,sessions);requireThat(!blockers.length,`Fix before publishing: ${blockers.join(' ')}`);
    if(revision){requireThat(next.baseVersion===e.version,'The original changed. Reload before revising.');validateRevision(s,e,next,sessions);const before=experienceTerms(e,s.experienceSessions.filter(ss=>ss.experienceId===e.id));e.versions.push({at:now(),actorId:actor,reason:next.revisionReason,terms:before});const oldHistory=e.history,oldVersions=e.versions;Object.assign(e,next,{version:e.version+1,status:e.status,history:oldHistory,versions:oldVersions});delete e.sessions;delete e.revisionDraft;delete e.baseVersion;
      s.experienceSessions=s.experienceSessions.filter(ss=>ss.experienceId!==e.id);sessions.forEach(ss=>s.experienceSessions.push({...ss,experienceId:e.id}));
      for(const b of s.bookings.filter(b=>b.experienceId===e.id&&!['Cancelled','Declined','Rejected','Offer Expired'].includes(b.status)))bookingNotice(s,b,`${e.title} published version ${e.version}: ${next.revisionReason}. Review dates, venue and terms. Existing booking terms remain in history.`,'activity-change',{actorId:actor});
    }else{e.status='Published';e.publishedAt=now();}
    for(const pid of new Set(sessions.map(ss=>ss.supervisorId).filter(Boolean))){const selected=sessions.filter(ss=>ss.supervisorId===pid).map(ss=>ss.id);if(!s.appointments.some(ap=>ap.experienceId===e.id&&ap.personId===pid&&['Invited','Accepted'].includes(ap.status)))outdoorCommand(s,'activity.appoint',{experienceId:e.id,personId:pid,sessionIds:selected},actor);}
    (e.history||=[]).push({at:now(),actorId:actor,change:revision?'Published revision':'Published',version:e.version,reason:next.revisionReason||'Initial publication'});offerNext(s,e.id);return e.id;
  }
  if(action==='activity.experience.duplicate'){
    const source=find(s.experiences,p.id),copy=structuredClone(source),sid=new Map();copy.id=id('experience');copy.title+=' · copy';copy.version=1;copy.status='Draft';copy.copiedFrom=source.id;copy.history=[{at:now(),actorId:actor,change:'Separate copy',sourceId:source.id}];copy.versions=[];delete copy.revisionDraft;s.experiences.push(copy);
    for(const ss of s.experienceSessions.filter(ss=>ss.experienceId===source.id)){const newId=id('session');sid.set(ss.id,newId);s.experienceSessions.push({...structuredClone(ss),id:newId,experienceId:copy.id,closedBy:[]});}copy.completionRule.requiredSessionIds=(copy.completionRule.requiredSessionIds||[]).map(key=>sid.get(key));return copy.id;
  }
  if(['activity.experience.cancel','activity.experience.archive','activity.experience.close'].includes(action)){
    const e=find(s.experiences,p.id),closing=action.endsWith('close'),archiving=action.endsWith('archive');
    requireThat(!['Cancelled','Archived'].includes(e.status)&&(!archiving||e.status==='Completed'),'This lifecycle transition is unavailable.');
    if(closing)requireThat(s.closingReports.some(x=>x.experienceId===e.id&&x.status==='Submitted'),'Ask the assigned Supervisor to submit a closing report first.');
    const reason=closing?(p.reason||'Closed after the submitted Supervisor report'):textRequired(p.reason,'Lifecycle reason');
    e.status=closing?'Completed':archiving?'Archived':'Cancelled';(e.history||=[]).push({at:now(),actorId:actor,change:e.status,reason});
    for(const o of s.offers.filter(o=>o.experienceId===e.id&&o.status==='Offered')){o.status='Cancelled';o.reason=reason;o.closedAt=now();}
    for(const b of s.bookings.filter(b=>b.experienceId===e.id)){
      if(!['Completed','Cancelled','Declined','Rejected','Offer Expired'].includes(b.status)){(b.history||=[]).push({at:now(),actorId:actor,from:b.status,to:'Cancelled',reason});b.previousStatus=b.status;b.status='Cancelled';b.queueState='Cancelled';}
      bookingNotice(s,b,`${e.title} is ${e.status.toLowerCase()}. ${reason} Earlier attendance and completion evidence remains available.`,'activity-resource-ended',{actorId:actor});
    }
    s.cohorts.filter(c=>c.experienceId===e.id).forEach(c=>c.status='Archived');for(const ap of s.appointments.filter(ap=>ap.experienceId===e.id&&['Invited','Accepted'].includes(ap.status))){ap.status='Ended';(ap.history||=[]).push({at:now(),actorId:actor,change:'Resource ended',reason});}
    return;
  }
  if(action==='activity.offer.policy'){
    const e=find(s.experiences,p.experienceId);e.offerHours=numberIn(p.hours,1/60,168,'Offer duration (hours)');(e.history||=[]).push({at:now(),actorId:actor,change:'Future offer policy',hours:e.offerHours,reason:p.reason||'Institution offer policy'});return;
  }
  if(action==='participant.book'){
    const e=find(s.experiences,p.experienceId);requireThat(p.version===undefined||Number(p.version)===(e.version||1),'This Outdoor Activity changed. Reload its published terms before booking.');
    const eligibility=bookingEligibility(s,e,p,actor);requireBookingEligibility(s,e,{personId:actor,eligible:true,eligibility});
    const available=seats(s,e.id)>0;requireThat(available||e.waitlist,'This Outdoor Activity is full and has no waiting list.');const status=available?(e.approval?'Pending Approval':'Confirmed'):'Waitlisted';
    const sessions=s.experienceSessions.filter(ss=>ss.experienceId===e.id),sessionModes=Object.fromEntries(sessions.map(ss=>[ss.id,ss.format==='Hybrid'?(p.sessionModes?.[ss.id]||p.mode||'In-person'):ss.format||'In-person']));
    requireThat(Object.values(sessionModes).every(mode=>['In-person','Online'].includes(mode)),'Choose an available session participation mode.');
    const b={id:id('booking'),experienceId:e.id,personId:actor,status,queueState:status==='Waitlisted'?'Queued':null,created:now(),credential:status==='Confirmed'?id('DS'):'',eligible:true,eligibility,mode:new Set(Object.values(sessionModes)).size>1?'Mixed':Object.values(sessionModes)[0],sessionModes,terms:experienceTerms(e,sessions),answers:structuredClone(p.answers||{}),payment:e.cost?.type==='Paid'?{status:'Simulated',amount:Number(e.cost.price),currency:e.cost.currency,at:now()}:null,history:[{at:now(),actorId:actor,change:status,resourceVersion:e.version}]};s.bookings.push(b);
    bookingNotice(s,b,`${e.title}: ${status==='Waitlisted'?'you joined the queue; this is not a confirmed place':status==='Confirmed'?'your booking is confirmed':'your booking awaits approval'}. No payment was charged.`,'activity-booking',{actorId:actor});ownerNotice(s,e,`${find(s.people,actor).name}: ${status} booking for ${e.title}.`,b.id);return b.id;
  }
  if(action==='participant.booking.reconfirm'){
    const b=find(s.bookings,p.id),e=find(s.experiences,b.experienceId);requireThat(b.personId===actor,'This booking belongs to another participant.');requireThat(['Waitlisted','Seat Offered','Pending Approval'].includes(b.status),'Only unresolved bookings need new consent.');
    requireThat(p.version===undefined||Number(p.version)===(e.version||1),'This Outdoor Activity changed. Reload before reconfirming.');const eligibility=bookingEligibility(s,e,p,actor);requireBookingEligibility(s,e,{...b,eligibility});const sessions=s.experienceSessions.filter(ss=>ss.experienceId===e.id),modes=Object.fromEntries(sessions.map(ss=>[ss.id,ss.format==='Hybrid'?(p.sessionModes?.[ss.id]||p.mode||b.sessionModes?.[ss.id]||'In-person'):ss.format||'In-person']));requireThat(Object.values(modes).every(mode=>['In-person','Online'].includes(mode)),'Choose an available session participation mode.');(b.termsHistory||=[]).push(b.terms);(b.reconfirmationHistory||=[]).push({at:now(),actorId:actor,answers:b.answers,payment:b.payment,sessionModes:b.sessionModes,eligibility:b.eligibility});b.terms=experienceTerms(e,sessions);b.eligibility=eligibility;b.answers=structuredClone(p.answers||{});b.sessionModes=modes;b.mode=new Set(Object.values(modes)).size>1?'Mixed':Object.values(modes)[0];b.payment=e.cost?.type==='Paid'?{status:'Simulated',amount:Number(e.cost.price),currency:e.cost.currency,at:now()}:null;bookingNotice(s,b,`${e.title}: updated terms version ${e.version} acknowledged on your original booking.`,'activity-reconfirmed',{actorId:actor});offerNext(s,e.id);return b.id;
  }
  if(action==='activity.booking.approve'){
    const b=find(s.bookings,p.id),e=find(s.experiences,b.experienceId);requireBookingEligibility(s,e,b);requireThat(b.status==='Pending Approval'&&seats(s,e.id)>0,'No available seat, or the booking is already processed.');b.status='Confirmed';b.credential=id('DS');(b.history||=[]).push({at:now(),actorId:actor,change:'Confirmed'});bookingNotice(s,b,`${e.title}: your booking is confirmed.`,'activity-confirmed',{actorId:actor});return;
  }
  if(action==='activity.booking.cancel'||action==='participant.booking.cancel'){
    const b=find(s.bookings,p.id),e=find(s.experiences,b.experienceId);if(action.startsWith('participant')){requireThat(b.personId===actor,'This booking belongs to another participant.');const first=(b.terms?.sessions||s.experienceSessions.filter(ss=>ss.experienceId===e.id)).slice().sort((a,b)=>a.date.localeCompare(b.date))[0];requireThat((b.terms?.cancellationPolicy||e.cancellationPolicy)?.mode==='anytime'||!first||!checkInWindow(s,first,b.terms?.timezone||e.timezone).started,'The published cancellation cutoff has passed. Contact the organizing Institution.');}
    requireThat(!['Cancelled','Completed','Declined','Offer Expired'].includes(b.status),'This booking can no longer be cancelled.');const reason=p.reason||`Cancelled by ${action.startsWith('activity')?'the Institution':'participant'}`;(b.history||=[]).push({at:now(),actorId:actor,from:b.status,to:'Cancelled',reason});b.status='Cancelled';b.queueState='Cancelled';s.offers.filter(o=>o.bookingId===b.id&&o.status==='Offered').forEach(o=>{o.status='Cancelled';o.reason=reason;});
    s.cohorts.forEach(c=>{if(c.experienceId===e.id)c.memberIds=c.memberIds.filter(pid=>pid!==b.personId);});bookingNotice(s,b,`${e.title}: booking cancelled. ${reason}`,'activity-cancelled',{actorId:actor});ownerNotice(s,e,`Booking ${b.id} cancelled. ${reason}`,b.id);offerNext(s,e.id);return;
  }
  if(action==='activity.offer.issue'){const count=offerNext(s,p.experienceId);requireThat(count>0,'No available seat or eligible waiting participant.');return count;}
  if(['participant.offer.accept','participant.offer.decline','activity.offer.expire'].includes(action)){
    const o=find(s.offers,p.id),b=find(s.bookings,o.bookingId),e=find(s.experiences,o.experienceId);if(!action.startsWith('activity'))requireThat(o.personId===actor,'This offer belongs to another participant.');requireThat(o.status==='Offered','This offer has already been processed.');
    requireThat(o.experienceId===b.experienceId&&o.personId===b.personId&&b.status==='Seat Offered','This offer has no matching active booking hold.');
    if(action.endsWith('accept')){requireBookingEligibility(s,e,b);requireThat(Date.parse(o.expires)>nowMs(s),'This offer has expired.');requireThat(occupied(s,e.id)<=e.capacity,'This seat is no longer available.');o.status='Accepted';b.status='Confirmed';b.queueState='Accepted';b.credential=id('DS');}
    else{if(action.endsWith('expire'))requireThat(Date.parse(o.expires)<=nowMs(s),'This offer has not expired. Advance the demo clock to exercise expiry.');o.status=action.endsWith('expire')?'Expired':'Declined';b.status=o.status==='Expired'?'Offer Expired':'Declined';b.queueState=o.status;}
    (b.history||=[]).push({at:now(),actorId:actor,change:`Offer ${o.status.toLowerCase()}`,offerId:o.id});bookingNotice(s,b,`${e.title}: seat offer ${o.status.toLowerCase()}.`,'activity-offer-'+o.status.toLowerCase(),{actorId:actor,offerId:o.id});ownerNotice(s,e,`Booking ${b.id}: offer ${o.status.toLowerCase()}.`,b.id);if(o.status!=='Accepted')offerNext(s,e.id);return;
  }
  if(action==='activity.appointment.resend'){
    const old=find(s.appointments,p.id);requireThat(old.status==='Invited'||old.status==='Expired','Only an unaccepted or expired appointment can be replaced.');
    const e=find(s.experiences,old.experienceId);requireThat(activityOwnerApproved(s,e.ownerId)&&['Published','Active'].includes(e.status),'This Outdoor Activity is not active for a new appointment.');
    old.status='Replaced';(old.history||=[]).push({at:now(),actorId:actor,change:'Replaced by a new invitation'});
    const token=outdoorCommand(s,'activity.appoint',{experienceId:old.experienceId,email:old.email,personId:old.personId,sessionIds:old.sessionIds,cohortPermission:old.cohortPermission},actor);const fresh=s.appointments.at(-1);fresh.replaces=old.id;old.replacedBy=fresh.id;return token;
  }
  if(action==='activity.appoint'){requireThat(['Published','Active'].includes(find(s.experiences,p.experienceId).status),'Publish the Outdoor Activity before appointing a Supervisor.');
    const email=String(p.email||'').trim().toLowerCase();let person=p.personId?find(s.people,p.personId):email?s.people.find(x=>x.email.toLowerCase()===email):null;
    requireThat(person||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Enter the Supervisor’s email address.');
    requireThat(p.sessionIds?.length,'Select at least one session.');requireThat(p.sessionIds.every(sid=>s.experienceSessions.some(x=>x.id===sid&&x.experienceId===p.experienceId)),'Choose sessions from this Outdoor Activity.');
    requireThat(!s.appointments.some(x=>x.experienceId===p.experienceId&&((person&&x.personId===person.id)||(email&&x.email===email))&&(x.status==='Accepted'||x.status==='Invited'&&(!x.expires||Date.parse(x.expires)>nowMs(s)))),'This person already has an appointment.');
    const ap={experienceId:p.experienceId,sessionIds:p.sessionIds,cohortPermission:Boolean(p.cohortPermission),id:id('appointment'),personId:person?.id||null,email:person?.email.toLowerCase()||email,token:id('appointment-link'),expires:new Date(nowMs(s)+7*24*3600000).toISOString(),status:'Invited',scope:'Assigned sessions only; attendance, evaluations'+(p.cohortPermission?' and cohorts':''),invitedBy:actor,created:now(),history:[{at:now(),actorId:actor,change:'Appointment issued · simulated delivery'}]};
    s.appointments.push(ap);if(person){if(!person.workspaces.includes('supervisor'))person.workspaces.push('supervisor');notify(s,person.id,`You have a Supervisor appointment for ${find(s.experiences,p.experienceId).title}.`,`workspaces.html#/auth/appointment/${ap.token}`,'invite');}return ap.token;}
  if(action==='activity.appointment.revoke'){const ap=find(s.appointments,p.id);requireThat(['Invited','Accepted'].includes(ap.status),'This appointment is not active.');const reason=String(p.reason||'Revoked by the Institution Representative');ap.status='Revoked';ap.revokedAt=now();ap.reason=reason;(ap.history||=[]).push({at:now(),actorId:actor,change:'Revoked',reason});if(ap.personId)notify(s,ap.personId,`Your Supervisor appointment for ${find(s.experiences,ap.experienceId).title} ended. Your recorded attendance and evaluations stay attributed to you.`,'','access');return;}
  if(action==='participant.cohort.join'){const c=find(s.cohorts,p.id);requireThat(c.status==='Active','This activity group is no longer open.');requireThat(s.appointments.some(a=>a.personId===c.supervisorId&&a.experienceId===c.experienceId&&a.status==='Accepted'),'This activity group has no active Supervisor appointment.');requireThat(s.bookings.some(b=>b.experienceId===c.experienceId&&b.personId===actor&&['Confirmed','Checked In','Completed'].includes(b.status)),'A confirmed Outdoor Activity booking is required.');requireThat(!c.memberIds.includes(actor),'You have already joined this activity group.');requireThat(c.memberIds.length<c.capacity,'This activity group is full.');requireThat(!s.cohorts.some(x=>x.experienceId===c.experienceId&&x.status==='Active'&&x.memberIds.includes(actor)),'You already belong to a group for this Outdoor Activity.');c.memberIds.push(actor);return;}
  if(['supervisor.appointment.accept','supervisor.appointment.decline','auth.appointment.accept','auth.appointment.decline'].includes(action)){const ap=p.token?s.appointments.find(x=>x.token===p.token):find(s.appointments,p.id);requireThat(ap,'No appointment matches this link.');const me=find(s.people,actor),resource=find(s.experiences,ap.experienceId);requireThat(activityOwnerApproved(s,resource.ownerId)&&['Published','Active'].includes(resource.status),'The Institution or Outdoor Activity is not active.');
    requireThat(ap.status==='Invited',`This appointment is ${String(ap.status).toLowerCase()} and grants nothing.`);requireThat(!ap.expires||Date.parse(ap.expires)>nowMs(s),'This appointment link has expired. Ask the Institution Representative to issue it again.');
    requireThat(ap.personId?ap.personId===actor:me.email.toLowerCase()===ap.email,ap.email?`This appointment was issued to ${ap.email}. Sign in with that email — a different account cannot accept it.`:'This appointment is no longer available to you.');
    requireThat(me.verified,'Verify your email before accepting an appointment.');
    ap.personId=actor;ap.status=action.endsWith('accept')?'Accepted':'Declined';ap.acceptedAt=action.endsWith('accept')?now():null;(ap.history||=[]).push({at:now(),actorId:actor,change:ap.status});if(ap.status==='Accepted'&&!me.workspaces.includes('supervisor'))me.workspaces.push('supervisor');
    const org=s.organizations.find(x=>x.id===find(s.experiences,ap.experienceId).ownerId);for(const pid of org?.memberIds||[])notify(s,pid,`${me.name} ${ap.status.toLowerCase()} the Supervisor appointment for ${find(s.experiences,ap.experienceId).title}.`,`workspaces.html#/organization/activities/${ap.experienceId}?tab=staff`,'activity-staff',{experienceId:ap.experienceId});return;}
  if(action==='supervisor.cohort.save'){const ap=assigned(s,actor,p.experienceId);requireThat(ap.cohortPermission,'Your appointment does not include activity-group management.');const e=find(s.experiences,p.experienceId);requireThat(e.status!=='Completed','This Outdoor Activity is closed.');const old=p.id?find(s.cohorts,p.id):null;requireThat(!old||old.supervisorId===actor,'This activity group belongs to another Supervisor.');requireThat(!old||old.experienceId===p.experienceId,'An activity group stays attached to its original Outdoor Activity.');const memberIds=p.memberIds||[],capacity=numberIn(p.capacity,1,e.capacity,'Group capacity');requireThat(memberIds.length<=capacity,'Too many participants for this group.');for(const pid of memberIds){requireThat(s.bookings.some(x=>x.experienceId===e.id&&x.personId===pid&&['Confirmed','Checked In','Completed'].includes(x.status)),'Activity groups only accept confirmed participants.');requireThat(!s.cohorts.some(x=>x.experienceId===e.id&&x.id!==old?.id&&x.status==='Active'&&x.memberIds.includes(pid)),'A participant is already allocated to another group.');}const record={...p,name:textRequired(p.name,'Group name'),capacity,memberIds,supervisorId:actor};if(old)Object.assign(old,record);else s.cohorts.push({...record,id:id('cohort'),token:id('cohort-join'),status:'Active'});return;}
  // Field facts (check-in, close-out, corrections) come from the assigned Supervisor; the Representative reads them.
  if(action.endsWith('.attendance')||action.endsWith('.attendance.closeout')||action.endsWith('.attendance.correct'))requireThat(action.startsWith('supervisor'),'Attendance is confirmed by the assigned Supervisor. Appoint a Supervisor for this session; until then it shows Needs Supervisor.');
  if(action.endsWith('.attendance')){const session=find(s.experienceSessions,p.sessionId);if(action.startsWith('supervisor'))assigned(s,actor,session.experienceId,session.id);const e=find(s.experiences,session.experienceId);requireThat(!['Completed','Cancelled','Archived'].includes(e.status),'Attendance is read only for a closed Outdoor Activity.');
    requireThat(activityOwnerApproved(s,e.ownerId)&&['Published','Active'].includes(e.status),'The Institution or Outdoor Activity is not active.');
    const method=p.method||(p.credential?'code':'manual');assertWindow(s,session,method,e.timezone);
    const parts=String(p.credential||'').trim().split('|');requireThat(!parts[1]||parts[1]===session.id,'This QR belongs to another session.');const code=parts[0].toUpperCase();const booking=code?s.bookings.find(x=>x.experienceId===e.id&&String(x.credential||'').toUpperCase()===code):s.bookings.find(x=>x.experienceId===e.id&&x.personId===p.personId);
    requireThat(booking&&['Confirmed','Checked In','Completed'].includes(booking.status),code&&!s.bookings.some(x=>String(x.credential||'').toUpperCase()===code)?'This code does not match any booking.':code?'This booking is for a different Outdoor Activity or is not confirmed.':'No eligible confirmed booking matches this credential or participant.');
    if(action.startsWith('supervisor'))supervisedPerson(s,actor,session.experienceId,booking.personId);
    const mode=booking.sessionModes?.[session.id]||booking.mode||'In-person';requireThat(!['code','qr'].includes(method)||mode!=='Online','Online participants require roster verification.');requireThat(method!=='online'||mode==='Online','This booking is not in Online mode.');
    const existing=s.attendance.find(x=>x.sessionId===session.id&&x.personId===booking.personId&&x.status!=='Corrected');
    requireThat(!existing,existing?.status==='Absent'?'This participant is already recorded Absent. Use a correction with a reason.':'Already checked in for this session. No duplicate attendance was recorded.');
    if(['manual','online'].includes(method))textRequired(p.reason,method==='online'?'Online verification evidence':'Manual check-in reason');
    const status=method==='absent'?'Absent':p.status==='Late'?'Late':'Present';
    const label={qr:'QR scan',code:'Booking code',manual:'Manual check-in',online:'online-verified',absent:'Marked absent','close-out':'Not checked in at close'}[method]||'Booking code';
    s.attendance.push({id:id('attendance'),experienceId:e.id,bookingId:booking.id,sessionId:session.id,personId:booking.personId,status,method:label,gardenPolicyVersion:1,reason:p.reason||'',actorId:actor,created:now(),history:[]});
    if(status!=='Absent'&&booking.status!=='Completed')booking.status='Checked In';audit(s,actor,'Attendance recorded',session.title,p.reason||label);return status;}
  if(action.endsWith('.attendance.correct')){
    const a=find(s.attendance,p.id),e=find(s.experiences,a.experienceId);if(action.startsWith('supervisor')){assigned(s,actor,a.experienceId,a.sessionId);supervisedPerson(s,actor,a.experienceId,a.personId);}
    requireThat(activityOwnerApproved(s,e.ownerId),'The Institution is not active.');const reason=textRequired(p.reason,'Correction reason');const to=p.status||'Corrected';requireThat(['Present','Late','Absent','Corrected'].includes(to)&&to!==a.status,'Choose a different factual status.');
    (a.history||=[]).push({at:now(),actorId:actor,from:a.status,to,reason,gardenBefore:['Present','Late'].includes(a.status)?'Eligible':'Ineligible',gardenAfter:['Present','Late'].includes(to)?'Eligible':'Ineligible',policyVersion:1});a.status=to;a.correctedAt=now();a.correction={reason,actorId:actor,created:now()};
    const candidates=s.bookings.filter(b=>b.personId===a.personId&&b.experienceId===a.experienceId);const b=a.bookingId?s.bookings.find(b=>b.id===a.bookingId):candidates.length===1?candidates[0]:null;requireThat(b,'No original booking matches this attendance.');
    const ev=bookingEvidence(s,b).evaluations.find(ev=>ev.sessionId===a.sessionId);if(ev&&!['Present','Late'].includes(to)){(ev.history||=[]).push({status:ev.status,notes:ev.notes,created:ev.created,actorId:ev.actorId,at:now(),reason});ev.status='Needs review';ev.correctedAt=now();}
    if(['Present','Late'].includes(to)&&b.status==='Confirmed')b.status='Checked In';reconcileCompletion(s,b,actor,reason);bookingNotice(s,b,`${e.title}: attendance corrected to ${to}. ${reason}`,'activity-attendance-corrected',{actorId:actor,attendanceId:a.id});return;
  }
  if(action.endsWith('.evaluate')){
    const session=find(s.experienceSessions,p.sessionId),e=find(s.experiences,session.experienceId);if(action.startsWith('supervisor')){assigned(s,actor,e.id,session.id);supervisedPerson(s,actor,e.id,p.personId);}
    requireThat(activityOwnerApproved(s,e.ownerId)&&['Published','Active'].includes(e.status),'Evaluations are read only after the Outdoor Activity closes or is suspended.');
    const b=s.bookings.find(b=>b.experienceId===e.id&&b.personId===p.personId&&['Confirmed','Checked In','Completed'].includes(b.status));requireThat(b,'An eligible original booking is required.');
    const evidence=bookingEvidence(s,b);requireThat(evidence.attendance.some(a=>a.sessionId===session.id&&['Present','Late'].includes(a.status)),'Record attendance (Present or Late) before evaluating completion.');
    const notes=textRequired(p.notes,'Evaluation notes');requireThat(['Completed','Needs follow-up','Not completed'].includes(p.status),'Choose an outcome.');const old=evidence.evaluations.find(ev=>ev.sessionId===session.id);
    if(old&&old.status===p.status&&old.notes===notes)return reconcileCompletion(s,b,actor,'Repeated evaluation; original evidence retained').id;
    const history=old?[...(old.history||[]),{status:old.status,notes:old.notes,created:old.created,actorId:old.actorId,at:now(),reason:p.reason||notes}]:[];
    const record={id:old?.id||id('evaluation'),bookingId:b.id,experienceId:e.id,sessionId:session.id,personId:b.personId,status:p.status,notes,actorId:actor,created:now(),history,resourceVersion:b.terms?.version||e.version,criterion:(b.terms?.sessions||[]).find(ss=>ss.id===session.id)?.criteria||session.criteria};
    if(old)Object.assign(old,record);else s.evaluations.push(record);return reconcileCompletion(s,b,actor,p.reason||notes).id;
  }
  if(action==='supervisor.report.submit'){assigned(s,actor,p.experienceId);textRequired(p.summary,'Closing summary');const old=s.closingReports.find(x=>x.experienceId===p.experienceId&&x.supervisorId===actor);const record={...p,supervisorId:actor,status:'Submitted',created:now()};if(old)Object.assign(old,record);else s.closingReports.push({...record,id:id('report')});return;}
  if(action==='participant.feedback'){const b=find(s.bookings,p.bookingId);requireThat(b.personId===actor&&['Checked In','Completed'].includes(b.status),'Feedback is available after attendance.');requireThat(!s.feedback.some(x=>x.bookingId===b.id),'Feedback was already submitted.');s.feedback.push({...p,id:id('feedback'),personId:actor,experienceId:b.experienceId,rating:numberIn(p.rating,1,5,'Rating'),created:now()});return;}
  if(action==='activity.completion.decide'||action==='supervisor.completion.decide'){
    const b=find(s.bookings,p.bookingId),e=find(s.experiences,b.experienceId);requireThat(activityOwnerApproved(s,e.ownerId)&&['Published','Active'].includes(e.status),'The Institution or Outdoor Activity is not active.');
    if(action.startsWith('supervisor')){const ap=assigned(s,actor,e.id);const sessions=b.terms?.sessions||s.experienceSessions.filter(ss=>ss.experienceId===e.id);requireThat(sessions.every(ss=>ap.sessionIds.includes(ss.id)),'A Camp completion decision needs scope over all its sessions.');}
    requireThat(!['Cancelled','Rejected','Declined','Offer Expired'].includes(b.status),'This booking cannot receive new completion approval.');return decideCompletion(s,b,p,actor).id;
  }
  if(action==='activity.staff.evaluate'){const ap=find(s.appointments,p.appointmentId);textRequired(p.notes,'Operational notes');s.staffEvaluations.push({...p,id:id('staff-evaluation'),experienceId:ap.experienceId,actorId:actor,created:now()});return;}
  return false;
}

/** Booking changes reach the owning Institution's Representatives as local notices. */
function ownerNotice(s,e,message,bookingId){for(const pid of s.organizations.find(o=>o.id===e.ownerId)?.memberIds||[])notify(s,pid,message,`workspaces.html#/organization/activities/${e.id}?tab=bookings`,'activity-owner',{experienceId:e.id,bookingId});}
function bookingEligibility(s,e,p,actor){
  const age=Number(p.age);requireThat(Number.isFinite(age)&&age>0&&age<=120&&p.consent===true&&age>=Number(e.minAge||0)&&(!e.maxAge||age<=Number(e.maxAge)),'Confirm your eligibility and read the safety notes.');
  if(e.cost?.type==='Paid')requireThat(p.paymentConfirmed===true,'Confirm the published price and simulated payment. No money is charged.');
  for(const q of e.participantForm?.questions||[]){const answer=p.answers?.[q.id];requireThat(!q.required||String(answer||'').trim(),`Answer: ${q.label}`);if(q.type==='choice'&&answer)requireThat(q.options.includes(answer),'Choose a published form option.');}
  return {age,consent:true,version:e.version||1,formVersion:e.participantForm?.version||1,at:now(),actorId:actor};
}
