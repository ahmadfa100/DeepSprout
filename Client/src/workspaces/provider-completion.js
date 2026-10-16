import {id,now,requireThat,find,reward,bookingNotice} from './domain.js';
/** Original evidence remains addressable through corrections and re-evaluations. */
export const GARDEN_PROVIDER_POLICY=1;
export function bookingEvidence(s,b){
 const unambiguous=s.bookings.filter(x=>x.experienceId===b.experienceId&&x.personId===b.personId).length===1;
 const belongs=record=>record.experienceId===b.experienceId&&record.personId===b.personId&&(record.bookingId===b.id||!record.bookingId&&unambiguous);
 return {attendance:s.attendance.filter(belongs),evaluations:s.evaluations.filter(belongs)};
}
export function completionEvidence(s,b){
 const e=find(s.experiences,b.experienceId),terms=b.terms||e,sessions=b.terms?.sessions||s.experienceSessions.filter(ss=>ss.experienceId===e.id),rule=terms.completionRule||{kind:'all-required',version:1,requiredSessionIds:sessions.map(ss=>ss.id)};
 const {attendance,evaluations}=bookingEvidence(s,b),qualifying=sessions.map(ss=>({sessionId:ss.id,attendance:attendance.find(a=>a.sessionId===ss.id&&['Present','Late'].includes(a.status)),evaluation:evaluations.find(ev=>ev.sessionId===ss.id&&ev.status==='Completed')})).filter(x=>x.attendance&&x.evaluation);
 const eligible=rule.kind==='all-required'?(rule.requiredSessionIds||sessions.map(ss=>ss.id)).length>0&&(rule.requiredSessionIds||sessions.map(ss=>ss.id)).every(key=>qualifying.some(q=>q.sessionId===key)):qualifying.length>=Number(rule.kind==='minimum'?rule.minimum:1);
 const fingerprint=JSON.stringify(qualifying.map(q=>[q.attendance.id,q.attendance.status,q.attendance.correctedAt||q.attendance.created,q.evaluation.id,q.evaluation.status,q.evaluation.created]));
 return {e,terms,sessions,rule,qualifying,eligible,fingerprint,needsDecision:rule.kind==='review'||Boolean(rule.conditions?.trim())};
}
export function reconcileCompletion(s,b,actor,reason='Session evidence reviewed'){
 const evidence=completionEvidence(s,b);let record=(s.providerCompletions||=[]).find(c=>c.bookingId===b.id);
 if(!record){record={id:id('provider-completion'),bookingId:b.id,experienceId:b.experienceId,personId:b.personId,resourceVersion:b.terms?.version||evidence.e.version||1,rule:structuredClone(evidence.rule),policyVersion:GARDEN_PROVIDER_POLICY,status:'Pending',created:now(),history:[]};s.providerCompletions.push(record);}
 const previous=record.status;
 const manualOK=record.decision?.status==='Completed'&&record.decision.fingerprint===evidence.fingerprint;
 let status=evidence.eligible&&(!evidence.needsDecision||manualOK)?'Completed':evidence.eligible&&evidence.needsDecision?'Needs Review':'Pending';
 if(record.decision?.status==='Not completed')status='Not completed';
 if(['Cancelled','Rejected','Declined','Offer Expired'].includes(b.status)&&status==='Completed')status='Pending';
 record.status=status;record.attendanceIds=evidence.qualifying.map(q=>q.attendance.id);record.evaluationIds=evidence.qualifying.map(q=>q.evaluation.id);record.qualifyingSessionIds=evidence.qualifying.map(q=>q.sessionId);record.updated=now();record.actorId=actor;
 if(previous!==status){record.history.push({at:now(),actorId:actor,from:previous,to:status,reason,attendanceIds:[...record.attendanceIds],evaluationIds:[...record.evaluationIds]});bookingNotice(s,b,`${evidence.e.title}: completion ${status.toLowerCase()}. ${reason}`,'provider-completion',{actorId:actor,completionId:record.id});}
 const completed=status==='Completed';
 if(completed){if(!['Cancelled','Rejected','Declined','Offer Expired'].includes(b.status))b.status='Completed';b.completedAt||=now();}
 else if(b.status==='Completed'){b.status='Checked In';b.completionReviewRequired=true;}
 const existing=s.rewards.find(r=>r.sourceId===`experience:${b.experienceId}`&&r.personId===b.personId);
 if(completed&&evidence.e.type==='Camp'&&!existing)reward(s,`experience:${b.experienceId}`,b.personId,null,evidence.e.title,'Published Provider Camp completion',{effect:'birdhouse',sourceRecordId:record.id,experienceId:b.experienceId,bookingId:b.id,policyVersion:GARDEN_PROVIDER_POLICY,status:'Active',history:[{at:now(),actorId:actor,from:null,to:'Active',reason}]});
 if(existing){const eligibleSource=s.providerCompletions.find(c=>c.personId===b.personId&&c.experienceId===b.experienceId&&c.status==='Completed');const next=eligibleSource?'Active':'Revoked';if((existing.status||'Active')!==next){(existing.history||=[]).push({at:now(),actorId:actor,from:existing.status||'Active',to:next,reason,completionId:record.id});existing.status=next;}existing.sourceRecordId=eligibleSource?.id||existing.sourceRecordId||record.id;existing.policyVersion=GARDEN_PROVIDER_POLICY;}
 return record;
}
export function decideCompletion(s,b,p,actor){
 const evidence=completionEvidence(s,b);requireThat(evidence.needsDecision,'This published rule uses its session evidence without a manual completion override.');
 requireThat(['Completed','Not completed'].includes(p.status),'Choose an explicit completion outcome.');requireThat(p.reason?.trim(),'Record the conditions checked and the reason for the completion decision.');
 requireThat(p.status!=='Completed'||evidence.eligible,'The minimum published attendance/evaluation evidence is not met. No automatic waiver is available.');
 const record=reconcileCompletion(s,b,actor,'Before explicit review');const decision={status:p.status,reason:p.reason,actorId:actor,at:now(),fingerprint:evidence.fingerprint};
 (record.decisionHistory||=[]).push(decision);record.decision=decision;return reconcileCompletion(s,b,actor,p.reason);
}
