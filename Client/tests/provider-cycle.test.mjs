import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatch,read,snapshotForTests} from '../src/workspaces/store.js';
import {exploreProviderExperiences,myProviderBookings} from '../src/shared/selectors.js';
import {seats,occupied,providerOpen} from '../src/workspaces/domain.js';
import {sessionTimestamp} from '../src/workspaces/initiative-rules.js';
const as=personId=>dispatch('demo.signin',{personId});
const reset=()=>{dispatch('demo.reset');dispatch('demo.clock',{at:'2026-10-15T09:00:00+03:00'});as('p-sami');};
export const CAMP={title:'Original Provider Camp',type:'Camp',description:'Two deliberate days outside.',objective:'Make room for nature.',venue:'Ajloun woodland',address:'Meeting point',city:'Ajloun',country:'Jordan',timezone:'Asia/Amman',start:'2026-10-24',end:'2026-10-25',capacity:1,minAge:18,eligibility:'Adults',conditions:'Read safety instructions',registrationOpen:'2026-10-14',registrationClose:'2026-10-23',waitlist:true,safety:'Stay together.',contact:'Operator contact',consent:'I agree to the safety terms.',cancellation:'Cancel before the first session.',completion:'Complete both sessions.',sessions:[{id:'pc-s1',title:'Walk',date:'2026-10-24',time:'09:00',endTime:'10:00',criteria:'Take part',venue:'Meeting point'},{id:'pc-s2',title:'Reflect',date:'2026-10-25',time:'09:00',endTime:'10:00',criteria:'Share a reflection',venue:'Meeting point'}]};
test('1A original draft/publication/Individual booking/Provider and Supervisor share IDs; private bookings stay scoped',()=>{
 reset();const eid=dispatch('provider.experience.save',CAMP);assert.ok(!exploreProviderExperiences(read(),'p-ahmad').some(e=>e.id===eid));dispatch('provider.experience.publish',{id:eid});
 const e=exploreProviderExperiences(read(),'p-ahmad').find(e=>e.id===eid);assert.equal(e.organizer,'Green Trails Collective');assert.equal(e.sessions[0].id,'pc-s1');
 const token=dispatch('provider.appoint',{experienceId:eid,personId:'p-leen',sessionIds:['pc-s1','pc-s2']});as('p-leen');dispatch('auth.appointment.accept',{token});
 dispatch('member.register',{name:'Regular Individual',email:'provider.member@test.example',consent:true});const pid=read().session.personId;assert.ok(!read().people.find(p=>p.id===pid).workspaces.includes('participant'));
 const bid=dispatch('member.experience.book',{experienceId:eid,age:22,consent:true,version:1});assert.equal(myProviderBookings(read(),pid).find(b=>b.id===bid).experience.id,eid);assert.equal(myProviderBookings(read(),'p-rania').some(b=>b.id===bid),false);
 as('p-sami');assert.equal(read().bookings.find(b=>b.id===bid).personId,pid);as('p-leen');dispatch('demo.clock',{at:'2026-10-24T09:05:00+03:00'});const credential=read().bookings.find(b=>b.id===bid).credential;
 dispatch('supervisor.attendance',{sessionId:'pc-s1',credential:`${credential}|pc-s1`,method:'code'});dispatch('demo.clock',{at:'2026-10-25T09:05:00+03:00'});assert.throws(()=>dispatch('supervisor.attendance',{sessionId:'pc-s2',credential:`${credential}|pc-s1`,method:'code'}),/another session/);
 assert.ok(myProviderBookings(read(),pid).find(b=>b.id===bid).attendance.some(a=>a.sessionId==='pc-s1'));
});
const publish=(overrides={})=>{as('p-sami');const eid=dispatch('provider.experience.save',{...CAMP,...overrides});dispatch('provider.experience.publish',{id:eid});return eid;};
const individual=n=>{dispatch('member.register',{name:`Person ${n}`,email:`provider-${n}@test.example`,consent:true});return read().session.personId;};
const book=eid=>dispatch('member.experience.book',{experienceId:eid,age:22,consent:true,version:read().experiences.find(e=>e.id===eid).version});
test('1B configurable 24-hour offers preserve issued expiry and reconcile decline/expiry/reoffer without overbooking',()=>{
 reset();const eid=publish(),a=individual('a'),ba=book(eid),b=individual('b'),bb=book(eid),c=individual('c'),bc=book(eid);
 assert.equal(read().bookings.find(x=>x.id===bb).queueState,'Queued');as(a);dispatch('member.booking.cancel',{id:ba});let offer=read().offers.find(o=>o.bookingId===bb);
 assert.equal(Date.parse(offer.expires)-Date.parse(offer.created),24*3600000);assert.equal(occupied(read(),eid),1);const expires=offer.expires;
 as('p-sami');dispatch('provider.offer.policy',{experienceId:eid,hours:12});assert.equal(read().offers.find(o=>o.id===offer.id).expires,expires);
 as(b);dispatch('member.booking.offer.decline',{id:offer.id});offer=read().offers.find(o=>o.bookingId===bc);assert.equal(offer.hours,12);assert.equal(occupied(read(),eid),1);
 as(c);assert.throws(()=>dispatch('member.experience.book',{experienceId:eid,age:22,consent:true}),/already have/);dispatch('member.booking.offer.accept',{id:offer.id});assert.equal(read().bookings.find(x=>x.id===bc).status,'Confirmed');assert.throws(()=>dispatch('member.booking.offer.accept',{id:offer.id}),/processed/);
 const notices=read().notifications.filter(n=>n.bookingId===bb);assert.ok(notices.some(n=>n.recipientId===b&&n.kind==='provider-offer'));assert.ok(notices.some(n=>n.kind==='provider-offer-declined'));assert.ok(notices.every(n=>n.experienceId===eid));
 // A fresh independent expiry chain uses the demo clock rather than wall-clock sleeps.
 reset();const eid2=publish(),p1=individual('d'),b1=book(eid2),p2=individual('e'),b2=book(eid2),p3=individual('f'),b3=book(eid2);as(p1);dispatch('member.booking.cancel',{id:b1});const old=read().offers.find(o=>o.bookingId===b2);dispatch('demo.clock',{hours:25});as(p2);assert.throws(()=>dispatch('member.booking.offer.accept',{id:old.id}),/processed/);assert.equal(read().offers.find(o=>o.id===old.id).status,'Expired');assert.ok(read().offers.some(o=>o.bookingId===b3&&o.status==='Offered'));assert.equal(occupied(read(),eid2),1);assert.ok(read().notifications.some(n=>n.bookingId===b2&&n.kind==='provider-offer-expired'));
});
test('1B publication blockers validate cost, windows, session policy, structured rules and resource scope',()=>{
 for(const [override,pattern] of [[{cost:{type:'Paid',price:0,currency:'JOD'}},/positive price/],[{registrationClose:'2026-10-01'},/opening\/closing/],[{timezone:'Not/AZone'},/timezone/],[{completionRule:{kind:'minimum',minimum:3}},/Minimum completion/]]){
  reset();const eid=dispatch('provider.experience.save',{...CAMP,...override});assert.throws(()=>dispatch('provider.experience.publish',{id:eid}),pattern);assert.equal(read().experiences.find(e=>e.id===eid).status,'Draft');
 }
 reset();assert.throws(()=>dispatch('provider.experience.save',{...CAMP,sessions:[{...CAMP.sessions[0],id:'es-walk'}]}),/belongs to another/);
});
test('1B revisions retain resource/session/booking identity, versioned terms, attribution and current consent recheck',()=>{
 reset();const eid=publish(),a=individual('revision-a'),ba=book(eid),b=individual('revision-b'),bb=book(eid);as('p-sami');let s=read(),e=s.experiences.find(e=>e.id===eid);
 const update={...e,sessions:s.experienceSessions.filter(ss=>ss.experienceId===eid),venue:'New future meeting point',revisionReason:'Safer meeting point',cost:{type:'Paid',price:12,currency:'JOD'}};
 assert.equal(dispatch('provider.experience.save',update),eid);assert.equal(read().experiences.find(e=>e.id===eid).version,1,'saved revision does not change public terms');dispatch('provider.experience.publish',{id:eid});
 s=read();e=s.experiences.find(e=>e.id===eid);assert.equal(e.version,2);assert.equal(e.versions[0].terms.version,1);assert.equal(s.bookings.find(b=>b.id===ba).terms.version,1);assert.equal(s.bookings.find(b=>b.id===bb).id,bb);assert.deepEqual(s.experienceSessions.filter(ss=>ss.experienceId===eid).map(ss=>ss.id),['pc-s1','pc-s2']);
 assert.ok(s.notifications.some(n=>n.bookingId===ba&&n.kind==='provider-change'));
 dispatch('provider.booking.cancel',{id:ba});assert.equal(read().offers.some(o=>o.bookingId===bb),false,'outdated consent does not receive a new hold');as(b);assert.throws(()=>dispatch('member.booking.reconfirm',{id:bb,age:22,consent:true}),/payment/);dispatch('member.booking.reconfirm',{id:bb,age:22,consent:true,paymentConfirmed:true});assert.ok(read().offers.some(o=>o.bookingId===bb&&o.status==='Offered'));assert.equal(read().bookings.find(b=>b.id===bb).termsHistory[0].version,1);
});
test('1B paid consent/form validation and own-booking authorization use the original record',()=>{
 reset();const eid=publish({cost:{type:'Paid',price:8,currency:'JOD'},participantForm:{version:3,questions:[{id:'access',label:'Access arrangements',type:'choice',options:['None','Contact operator'],required:true}]}}),pid=individual('paid');
 assert.throws(()=>book(eid),/payment/);assert.throws(()=>dispatch('member.experience.book',{experienceId:eid,age:22,consent:true,paymentConfirmed:true}),/Answer/);
 const bid=dispatch('member.experience.book',{experienceId:eid,age:22,consent:true,paymentConfirmed:true,answers:{access:'None'}});assert.equal(read().bookings.find(b=>b.id===bid).eligibility.formVersion,3);assert.equal(read().bookings.find(b=>b.id===bid).payment.status,'Simulated');individual('foreign');assert.throws(()=>dispatch('member.booking.cancel',{id:bid}),/another participant/);assert.equal(myProviderBookings(read(),read().session.personId).length,0);
});
test('1B cancellation and appointment replacement keep original evidence and invalidate old tokens',()=>{
 reset();const eid=publish();const oldToken=dispatch('provider.appoint',{experienceId:eid,email:'leen@demo.example',sessionIds:['pc-s1']});const old=read().appointments.find(a=>a.token===oldToken);dispatch('demo.clock',{hours:24*8});const token=dispatch('provider.appointment.resend',{id:old.id});assert.notEqual(token,oldToken);as('p-leen');assert.throws(()=>dispatch('auth.appointment.accept',{token:oldToken}),/replaced/);dispatch('auth.appointment.accept',{token});as('p-sami');assert.throws(()=>dispatch('provider.experience.cancel',{id:eid}),/reason/);dispatch('provider.experience.cancel',{id:eid,reason:'Unsafe trail conditions'});assert.ok(read().experiences.find(e=>e.id===eid).history.some(h=>h.reason==='Unsafe trail conditions'));assert.equal(read().appointments.find(a=>a.token===token).status,'Ended');
});
test('1B shared timezone conversion observes the London daylight-saving boundary',()=>{
 assert.equal(new Date(sessionTimestamp('2026-10-24','09:00','Europe/London')).toISOString(),'2026-10-24T08:00:00.000Z');
 assert.equal(new Date(sessionTimestamp('2026-10-25','09:00','Europe/London')).toISOString(),'2026-10-25T09:00:00.000Z');
});

const edit=fn=>{const s=read();fn(s);snapshotForTests(s);};
const attend=(eid,pid,sid,{method='manual',status='Present'}={})=>{as('p-sami');dispatch('demo.clock',{at:sid==='pc-s1'?'2026-10-24T09:05:00+03:00':'2026-10-25T09:05:00+03:00'});return dispatch('provider.attendance',{sessionId:sid,personId:pid,method,status,reason:'Verified on original roster'});};
const evaluate=(pid,sid)=>{as('p-sami');return dispatch('provider.evaluate',{sessionId:sid,personId:pid,status:'Completed',notes:'Observed the published session criterion'});};
const {personalGardenEffects,initiativeCard,providerReport}=await import('../src/shared/selectors.js');
const {normalizeProviderData}=await import('../src/workspaces/provider-rules.js');
test('1C all-two versus minimum-one rules use attendance AND evaluation, original completion IDs and booked policy',()=>{
 for(const kind of ['all-required','minimum']){
  reset();const eid=publish({completionRule:{kind,version:1,minimum:1,requiredSessionIds:['pc-s1','pc-s2'],conditions:''}}),pid=individual(kind),bid=book(eid);
  assert.equal(personalGardenEffects(read(),pid).length,0);attend(eid,pid,'pc-s1');assert.equal(read().bookings.find(b=>b.id===bid).status,'Checked In');assert.equal(personalGardenEffects(read(),pid).filter(x=>x.effect==='birdhouse').length,0);
  evaluate(pid,'pc-s1');const c=read().providerCompletions.find(c=>c.bookingId===bid);assert.equal(c.status,kind==='minimum'?'Completed':'Pending');assert.equal(c.attendanceIds.length,1);assert.equal(c.evaluationIds.length,1);assert.equal(c.resourceVersion,1);assert.equal(c.policyVersion,1);
  assert.equal(personalGardenEffects(read(),pid).filter(x=>x.effect==='birdhouse').length,kind==='minimum'?1:0);
  if(kind==='all-required'){attend(eid,pid,'pc-s2');evaluate(pid,'pc-s2');assert.equal(read().providerCompletions.find(c=>c.bookingId===bid).id,c.id);assert.equal(read().providerCompletions.find(x=>x.id===c.id).status,'Completed');}
 }
});
test('1C declared conditions require an attributed authorized decision, never an automatic excuse waiver',()=>{
 reset();const eid=publish({completionRule:{kind:'review',version:1,conditions:'Operator checks the participant’s final reflection'}}),pid=individual('review'),bid=book(eid);
 as('p-sami');assert.throws(()=>dispatch('provider.completion.decide',{bookingId:bid,status:'Completed',reason:'Excuse accepted'}),/minimum published/);
 attend(eid,pid,'pc-s1');evaluate(pid,'pc-s1');assert.equal(read().providerCompletions.find(c=>c.bookingId===bid).status,'Needs Review');assert.equal(read().rewards.filter(r=>r.personId===pid).length,0);
 as(pid);assert.throws(()=>dispatch('provider.completion.decide',{bookingId:bid,status:'Completed',reason:'My decision'}));as('p-sami');dispatch('provider.completion.decide',{bookingId:bid,status:'Completed',reason:'Final reflection reviewed directly'});const c=read().providerCompletions.find(c=>c.bookingId===bid);assert.equal(c.status,'Completed');assert.equal(c.decision.actorId,'p-sami');assert.ok(c.history.length);assert.ok(read().notifications.some(n=>n.completionId===c.id&&n.recipientId===pid));
});
test('1C correction and restoration preserve attendance/evaluation/completion/reward IDs with compensation histories and no duplicates',()=>{
 reset();const eid=publish({completionRule:{kind:'minimum',version:1,minimum:1}}),pid=individual('correction'),bid=book(eid);attend(eid,pid,'pc-s1');evaluate(pid,'pc-s1');let s=read(),a=s.attendance.find(a=>a.bookingId===bid),ev=s.evaluations.find(ev=>ev.bookingId===bid),c=s.providerCompletions.find(c=>c.bookingId===bid),r=s.rewards.find(r=>r.personId===pid);assert.ok(r);
 evaluate(pid,'pc-s1');assert.equal(read().rewards.filter(r=>r.personId===pid).length,1);
 dispatch('provider.attendance.correct',{id:a.id,status:'Absent',reason:'Roster transcription corrected'});s=read();assert.equal(s.attendance.find(x=>x.id===a.id).status,'Absent');assert.equal(s.evaluations.find(x=>x.id===ev.id).status,'Needs review');assert.equal(s.providerCompletions.find(x=>x.id===c.id).status,'Pending');assert.equal(s.rewards.find(x=>x.id===r.id).status,'Revoked');assert.equal(personalGardenEffects(s,pid).length,0);assert.ok(s.rewards.find(x=>x.id===r.id).history.some(h=>h.to==='Revoked'&&h.actorId==='p-sami'));
 dispatch('provider.attendance.correct',{id:a.id,status:'Present',reason:'Original attendance sheet verified'});evaluate(pid,'pc-s1');s=read();assert.equal(s.evaluations.find(x=>x.id===ev.id).status,'Completed');assert.equal(s.rewards.find(x=>x.id===r.id).status,'Active');assert.equal(s.rewards.filter(x=>x.personId===pid).length,1);assert.equal(s.attendance.find(x=>x.id===a.id).history.length,2);assert.deepEqual(personalGardenEffects(s,pid).map(x=>x.effect).sort(),['birdhouse','rabbit']);const d=providerReport(s,eid);assert.equal(d.present,1);assert.equal(d.absent,0);assert.equal(d.notRecorded,1);assert.equal(d.completed,1);assert.equal(d.rows.find(x=>x.bookingId===bid).completionId,c.id);
});
test('1C frozen completion criteria survive revision; online verification, duplicate and revoked scope guards apply',()=>{
 reset();const eid=publish({completionRule:{kind:'minimum',minimum:1,version:1},sessions:CAMP.sessions.map(ss=>({...ss,format:'Online'}))}),pid=individual('online');const bid=dispatch('member.experience.book',{experienceId:eid,age:22,consent:true,mode:'Online'});as('p-sami');const e=read().experiences.find(e=>e.id===eid);dispatch('provider.experience.save',{...e,sessions:read().experienceSessions.filter(ss=>ss.experienceId===eid),completionRule:{kind:'all-required',requiredSessionIds:['pc-s1','pc-s2'],version:2},revisionReason:'Future booking rule now requires both sessions'});dispatch('provider.experience.publish',{id:eid});
 const token=dispatch('provider.appoint',{experienceId:eid,personId:'p-leen',sessionIds:['pc-s1']});as('p-leen');dispatch('auth.appointment.accept',{token});dispatch('demo.clock',{at:'2026-10-24T09:05:00+03:00'});assert.throws(()=>dispatch('supervisor.attendance',{sessionId:'pc-s1',credential:read().bookings.find(b=>b.id===bid).credential}),/Online/);dispatch('supervisor.attendance',{sessionId:'pc-s1',personId:pid,method:'online',reason:'Observed live participation'});assert.throws(()=>dispatch('supervisor.attendance',{sessionId:'pc-s1',personId:pid,method:'online',reason:'Replay'}),/Already/);assert.throws(()=>dispatch('supervisor.attendance',{sessionId:'pc-s2',personId:pid,method:'online',reason:'Outside scope'}),/appointment/);
 as('p-sami');evaluate(pid,'pc-s1');assert.equal(read().providerCompletions.find(c=>c.bookingId===bid).status,'Completed');assert.equal(read().providerCompletions.find(c=>c.bookingId===bid).resourceVersion,1);const ap=read().appointments.find(a=>a.token===token);dispatch('provider.appointment.revoke',{id:ap.id});as('p-leen');assert.throws(()=>dispatch('supervisor.attendance.correct',{id:read().attendance.find(a=>a.bookingId===bid).id,status:'Absent',reason:'Revoked actor'}),/appointment|active supervisor workspace/);
});
test('1C accepted partnership projects the original resource, hides pending/declined/ended links, preserves inventory and attribution',()=>{
 reset();const eid=publish();edit(s=>s.partnerships=[]);as('p-maya');const part=dispatch('organization.partnership.request',{initiativeId:'i-today',providerId:'prov-trails',purpose:'Separate outdoor participation'});const id=part||read().partnerships.at(-1).id;
 assert.equal(initiativeCard(read(),read().initiatives.find(i=>i.id==='i-today'),'p-noor').linkedExperiences.some(e=>e.id===eid),false);as('p-sami');assert.throws(()=>dispatch('provider.partnership.link',{id,experienceId:eid}),/Accept/);dispatch('provider.partnership.accept',{id});dispatch('provider.partnership.link',{id,experienceId:eid});const before=read(),linked=initiativeCard(before,before.initiatives.find(i=>i.id==='i-today'),'p-noor').linkedExperiences.find(e=>e.id===eid);assert.equal(linked.ownerId,'prov-trails');assert.deepEqual(before.bookings,read().bookings);dispatch('provider.partnership.end',{id});assert.ok(read().partnerships.find(p=>p.id===id).history.some(h=>h.to==='Ended'&&h.actorId==='p-sami'&&h.experienceId===eid));assert.equal(initiativeCard(read(),read().initiatives.find(i=>i.id==='i-today'),'p-noor').linkedExperiences.some(e=>e.id===eid),false);assert.deepEqual(before.bookings,read().bookings);assert.equal(read().experiences.find(e=>e.id===eid).ownerId,before.experiences.find(e=>e.id===eid).ownerId);
});
test('1C legacy completion migration maps only unambiguous source facts, is idempotent and does not invent evidence',()=>{
 reset();const eid=publish(),pid=individual('legacy'),bid=book(eid);attend(eid,pid,'pc-s1');evaluate(pid,'pc-s1');attend(eid,pid,'pc-s2');evaluate(pid,'pc-s2');let s=read();delete s.providerDataVersion;s.providerCompletions=[];assert.equal(normalizeProviderData(s),true);assert.equal(s.providerCompletions.find(c=>c.bookingId===bid).status,'Completed');const snapshot=structuredClone(s);assert.equal(normalizeProviderData(s),false);assert.deepEqual(s,snapshot);
 delete s.providerDataVersion;s.providerCompletions=[];s.bookings.push({...s.bookings.find(b=>b.id===bid),id:'ambiguous-legacy-booking'});normalizeProviderData(s);assert.equal(s.providerCompletions.some(c=>c.bookingId===bid),false);
});

test('1B registration dates follow the resource timezone and Admin hours preserve legacy-minute units',()=>{
 reset();as('p-leen');dispatch('admin.system.save',{providerOfferHours:24,template:'Local notice',emailNotices:true});assert.equal(read().settings.offerMinutes,1440);dispatch('admin.system.save',{offerMinutes:120,template:'Local notice'});assert.equal(read().settings.providerOfferHours,2);assert.throws(()=>dispatch('admin.system.save',{providerOfferHours:0,template:'Local notice'}),/duration/);const eid=publish({timezone:'America/Los_Angeles'});dispatch('demo.clock',{at:'2026-10-24T01:00:00Z'});assert.equal(providerOpen(read(),read().experiences.find(e=>e.id===eid)),true,'still 23 October in the published timezone');dispatch('demo.clock',{at:'2026-10-24T09:00:00Z'});assert.equal(providerOpen(read(),read().experiences.find(e=>e.id===eid)),false);
});
