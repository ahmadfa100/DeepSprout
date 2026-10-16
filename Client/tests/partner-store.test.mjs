import test from 'node:test';
import assert from 'node:assert/strict';
import {read,seed,dispatch,workspaces,inviteState,snapshotForTests,STORAGE_KEY} from '../src/workspaces/store.js';
import {seats,occupied} from '../src/workspaces/domain.js';
const as=personId=>dispatch('demo.signin',{personId});
// Pinned operational clock (16 Oct 2026 update) so seeded windows reproduce on any day.
const reset=personId=>{dispatch('demo.reset');dispatch('demo.clock',{at:'2026-10-15T09:00:00+03:00'});if(personId)as(personId);};

test('Mentor creation → invitation → OTP → program → submission → review → one Garden contribution',()=>{
 reset('p-maya');const gid=dispatch('mentor.group.save',{name:'A new beginning',purpose:'Practice starting meaningful work.',capacity:4});
 const token=dispatch('mentor.invite.create',{groupId:gid,expires:'2026-12-31',limit:2,email:'new-student@demo.example'});
 dispatch('auth.logout');dispatch('auth.otp',{email:'new-student@demo.example',token});
 assert.throws(()=>dispatch('auth.join',{email:'new-student@demo.example',name:'New Student',token,code:'000000'}),/demonstrated code/);
 dispatch('auth.join',{email:'new-student@demo.example',name:'New Student',token,code:'246810'});
 const studentId=read().session.personId;assert.equal(read().groups.find(g=>g.id===gid).memberIds.length,1);
 assert.equal(inviteState(read(),token),'Already joined');assert(workspaces().includes('student'));
 as('p-maya');const programId=dispatch('mentor.program.save',{title:'Begin with a small step',description:'A short group program.',purpose:'Intentional work',focus:'Digital balance',duration:14,groupIds:[gid],start:'2026-10-14',end:'2026-10-28',stages:[{id:'new-stage',title:'Try a first step',objective:'Name and try a small first step.',date:'2026-10-20'}],activities:['Practical Micro-Challenge'],required:true});
 dispatch('mentor.program.publish',{id:programId});const assignment=read().assignments.find(a=>a.programId===programId);
 assert.throws(()=>dispatch('mentor.program.publish',{id:programId}),/Only a draft/);
 as(studentId);dispatch('student.submit',{assignmentId:assignment.id,text:'I started by writing one sentence.'});
 const submission=read().submissions.find(x=>x.studentId===studentId);
 as('p-maya');dispatch('mentor.review',{id:submission.id,decision:'Needs Revision',feedback:'Describe what you tried.'});
 as(studentId);assert.equal(read().submissions.find(x=>x.id===submission.id).status,'Needs Revision');dispatch('student.submit',{assignmentId:assignment.id,text:'I wrote one sentence and continued for five minutes.'});
 as('p-maya');dispatch('mentor.review',{id:submission.id,decision:'Approved'});assert.equal(read().rewards.filter(r=>r.sourceId===submission.id).length,1);
 assert.throws(()=>dispatch('mentor.review',{id:submission.id,decision:'Approved'}),/already been reviewed/);
 const revision=dispatch('mentor.program.duplicate',{id:programId});assert.equal(read().programs.find(x=>x.id===revision).version,2);assert.equal(read().programs.find(x=>x.id===programId).status,'Published');
});

test('Invitation invalid, revoked, exhausted, full, expiry, admission approval and identity reuse',()=>{
 reset('p-maya');assert.equal(inviteState(read(),'forged'),'Invalid');const s=read();s.invitations[0].status='Revoked';snapshotForTests(s);assert.equal(inviteState(read(),'fresh-start'),'Revoked');
 s.invitations[0].status='Active';s.invitations[0].expires='2020-01-01';snapshotForTests(s);assert.equal(inviteState(read(),'fresh-start'),'Expired');
 s.invitations[0].expires='2026-12-31';s.invitations[0].uses=10;snapshotForTests(s);assert.equal(inviteState(read(),'fresh-start'),'Exhausted');
 s.invitations[0].uses=0;s.groups[0].capacity=2;snapshotForTests(s);assert.equal(inviteState(read(),'fresh-start'),'Group full');
 s.groups[0].capacity=12;s.groups[0].approval=true;snapshotForTests(s);dispatch('auth.logout');dispatch('auth.otp',{email:'rania@demo.example',token:'fresh-start'});dispatch('auth.join',{email:'rania@demo.example',name:'Rania Yasin',token:'fresh-start',code:'246810'});assert.equal(read().people.filter(p=>p.email==='rania@demo.example').length,1);assert.equal(inviteState(read(),'fresh-start'),'Pending approval');
 as('p-maya');dispatch('mentor.member.approve',{id:read().memberships[0].id});assert(read().groups[0].memberIds.includes('p-rania'));
 dispatch('auth.otp',{email:'expired@demo.example',token:'fresh-start'});const exp=read();exp.otpChallenges.at(-1).expires=0;snapshotForTests(exp);assert.throws(()=>dispatch('auth.join',{email:'expired@demo.example',name:'Expired',token:'fresh-start',code:'246810'}),/expired/);
});

// Updated 15 Oct 2026 for the approved v4.0 contract: publication now requires a public summary and
// consent text (master §15.2), and Phase-1 forms are identified (D41), so a response keeps its personId.
test('Institution publication, independent enrollment, hybrid capacity and identified versioned answers',()=>{
 reset('p-maya');const fid=dispatch('organization.form.save',{title:'New question',purpose:'Survey',anonymous:true,version:1,questions:[{id:'q-new',label:'Your first step?',type:'Single choice',required:true,options:['Write','Walk']}]});dispatch('organization.form.publish',{id:fid});
 const iid=dispatch('organization.initiative.save',{title:'A new community invitation',topic:'Youth wellbeing',objective:'Create room to take part.',summary:'A short invitation to take part.',consent:'I agree to respectful participation.',audience:'Adults',coverage:'Nationwide',start:'2026-10-14',end:'2026-11-02',minAge:18,maxAge:30,conditions:'Adults in Jordan',completion:'Per component',capacity:5,enrollment:true,teamIds:['team-maya'],components:[{id:'cmp-new',type:'Survey or Quiz',title:'A purposeful question',resourceId:fid}]});dispatch('organization.initiative.publish',{id:iid});
 as('p-rania');const before=read().sessionRegistrations.length;dispatch('participant.enroll',{initiativeId:iid,age:22,consent:true});assert.equal(read().sessionRegistrations.length,before);
 assert.throws(()=>dispatch('participant.form.respond',{formId:fid,answers:{}}),/Answer/);dispatch('participant.form.respond',{formId:fid,answers:{'q-new':'Write'}});const response=read().responses.find(x=>x.formId===fid);assert.equal(response.personId,'p-rania');assert.equal(response.version,1);
 dispatch('participant.session.register',{sessionId:'s-intro',mode:'In-person',consent:true});assert.throws(()=>dispatch('participant.session.register',{sessionId:'s-intro',mode:'Online',consent:true}),/already registered/);
 as('p-maya');const revision=dispatch('organization.form.revise',{id:fid});assert.equal(read().forms.find(x=>x.id===revision).version,2);assert.equal(read().responses.find(x=>x.id===response.id).version,1);
});

test('Cancellation → held offer → decline → next offer → acceptance cannot overbook',()=>{
 reset('p-sami');const s=read();s.bookings.push({id:'b-next',experienceId:'e-reset',personId:'p-maya',status:'Waitlisted',created:'2026-10-15',eligible:true,credential:''});snapshotForTests(s);
 assert.equal(seats(read(),'e-reset'),0);dispatch('provider.booking.cancel',{id:'b-omar'});let offer=read().offers.find(x=>x.status==='Offered');assert.equal(offer.personId,'p-rania');assert.equal(seats(read(),'e-reset'),0);
 as('p-rania');dispatch('participant.offer.decline',{id:offer.id});offer=read().offers.find(x=>x.status==='Offered');assert.equal(offer.personId,'p-maya');
 as('p-maya');dispatch('participant.offer.accept',{id:offer.id});assert.equal(read().bookings.find(x=>x.id==='b-next').status,'Confirmed');assert.equal(occupied(read(),'e-reset'),2);assert.throws(()=>dispatch('participant.offer.accept',{id:offer.id}),/processed/);assert.throws(()=>dispatch('participant.book',{experienceId:'e-reset',age:22,consent:true}),/already have/);
});

test('Offer expiry is reconciled on read and a stale acceptance cannot claim the seat',()=>{
 reset('p-sami');dispatch('provider.booking.cancel',{id:'b-omar'});const state=read(),offer=state.offers[0];offer.expires='2000-01-01T00:00:00Z';snapshotForTests(state);as('p-rania');assert.throws(()=>dispatch('participant.offer.accept',{id:offer.id}),/processed/);assert.equal(read().offers[0].status,'Expired');assert.equal(seats(read(),'e-reset'),1);
});

test('Appointment acceptance, cohort eligibility, session attendance, duplicate credential and completion',()=>{
 reset('p-sami');dispatch('provider.appoint',{personId:'p-maya',experienceId:'e-reset',sessionIds:['es-walk','es-circle'],cohortPermission:true});const ap=read().appointments.at(-1);as('p-maya');assert(workspaces().includes('supervisor'));assert.throws(()=>dispatch('supervisor.attendance',{sessionId:'es-walk',credential:'DS-NOOR-24'}),/accepted appointment/);dispatch('supervisor.appointment.accept',{id:ap.id});
 assert.throws(()=>dispatch('supervisor.cohort.save',{name:'Not eligible',experienceId:'e-reset',capacity:2,memberIds:['p-rania']}),/confirmed participants/);
 as('p-sami');assert.throws(()=>dispatch('supervisor.evaluate',{sessionId:'es-walk',personId:'p-noor',status:'Completed',notes:'Participated.'}),/attendance/);
 // v4 check-in window (16 Oct 2026): move the demo clock into each session's window before recording.
 assert.throws(()=>dispatch('supervisor.attendance',{sessionId:'es-walk',credential:'DS-NOOR-24'}),/has not opened yet/);dispatch('demo.clock',{at:'2026-10-24T09:05:00+03:00'});
 dispatch('supervisor.attendance',{sessionId:'es-walk',credential:'DS-NOOR-24'});assert.throws(()=>dispatch('supervisor.attendance',{sessionId:'es-walk',credential:'DS-NOOR-24'}),/Already checked in/);
 dispatch('demo.clock',{at:'2026-10-25T10:05:00+03:00'});assert.throws(()=>dispatch('supervisor.attendance',{sessionId:'es-circle',personId:'p-noor',reason:''}),/reason/);dispatch('demo.clock',{at:'2026-10-24T09:20:00+03:00'});
 dispatch('supervisor.evaluate',{sessionId:'es-walk',personId:'p-noor',status:'Completed',notes:'Participated in the walk.'});assert.equal(read().bookings[0].status,'Checked In');assert.equal(read().rewards.length,0);
 dispatch('demo.clock',{at:'2026-10-25T10:05:00+03:00'});dispatch('supervisor.attendance',{sessionId:'es-circle',personId:'p-noor',reason:'Demo paper roster confirmation.'});dispatch('supervisor.evaluate',{sessionId:'es-circle',personId:'p-noor',status:'Completed',notes:'Shared an intention.'});assert.equal(read().bookings[0].status,'Completed');assert.equal(read().rewards.length,1);
 dispatch('supervisor.evaluate',{sessionId:'es-circle',personId:'p-noor',status:'Completed',notes:'Reviewed without a change.'});assert.equal(read().rewards.length,1);
 dispatch('supervisor.report.submit',{experienceId:'e-reset',summary:'Both sessions completed. Attendance and criteria reviewed.',exceptions:'None.'});dispatch('provider.experience.close',{id:'e-reset'});assert.equal(read().experiences[0].status,'Completed');assert.equal(read().cohorts[0].status,'Archived');
});

test('Partnership acceptance and resource link preserve provider ownership and aggregate scope',()=>{
 reset('p-sami');dispatch('provider.partnership.accept',{id:'part-trails'});dispatch('provider.partnership.link',{id:'part-trails',experienceId:'e-reset'});const state=read();assert.equal(state.partnerships[0].status,'Active');assert.equal(state.experiences[0].ownerId,'prov-trails');assert.equal(state.partnerships[0].scope,'Aggregate attendance and completion only');as('p-maya');assert.throws(()=>dispatch('provider.experience.cancel',{id:'e-reset'}),/no active provider/);
});

test('Application info request → response → approval yields one identity and a new empty entity scope',()=>{
 reset();dispatch('auth.account',{name:'New Representative',email:'new-rep@demo.example',consent:true});const applicant=read().session.personId;dispatch('auth.otp',{email:'new-rep@demo.example'});dispatch('auth.verify',{code:'246810'});
 const aid=dispatch('auth.application.submit',{type:'organization',name:'New Youth Center',details:{entityName:'New Youth Center',city:'Zarqa',description:'A fictional community center.'},files:[]});assert(!workspaces().includes('organization'));
 as('p-leen');dispatch('admin.application.decide',{id:aid,status:'Needs More Info',reason:'Explain the representative position.'});as(applicant);dispatch('auth.application.respond',{id:aid,text:'Program coordinator for the center.'});assert.equal(read().applications.find(a=>a.id===aid).status,'Pending Verification');
 as('p-leen');dispatch('admin.application.decide',{id:aid,status:'Approved'});as(applicant);assert(workspaces().includes('organization'));const org=read().organizations.find(o=>o.memberIds.includes(applicant));assert.equal(org.name,'New Youth Center');assert.equal(read().initiatives.filter(i=>i.ownerId===org.id).length,0);assert(!JSON.stringify(read()).includes('password'));
});

test('Scoped commands deny another Mentor group and another Provider booking',()=>{
 reset('p-maya');const state=read();state.groups.push({...state.groups[0],id:'g-other',ownerId:'p-omar'});state.experiences.push({...state.experiences[0],id:'e-other',ownerId:'provider-other'});state.bookings.push({...state.bookings[0],id:'b-other',experienceId:'e-other'});snapshotForTests(state);assert.throws(()=>dispatch('mentor.group.archive',{id:'g-other'}),/different Mentor/);as('p-sami');assert.throws(()=>dispatch('provider.booking.cancel',{id:'b-other'}),/another provider/);as('p-noor');assert.throws(()=>dispatch('participant.booking.cancel',{id:'b-omar'}),/another participant/);
});

test('CMS constrained publishing and rollback, moderation audit and isolated reset',()=>{
 reset('p-leen');const d={heading:'A new invitation',text:'Fictional opportunities.',color:'forest',font:'serif',size:'large',image:'assets/home-redesign/forest-hike.jpg',alt:'Woodland trail'};assert.throws(()=>dispatch('admin.cms.save',{draft:{...d,image:'https://unknown.example/x'}}),/approved local asset/);dispatch('admin.cms.save',{draft:d});dispatch('admin.cms.publish');dispatch('admin.cms.save',{draft:{...d,heading:'A second invitation'}});dispatch('admin.cms.publish');const v=read().cms.versions[0];dispatch('admin.cms.rollback',{id:v.id});assert.equal(read().cms.published.heading,'A new invitation');dispatch('admin.moderate',{id:'mod-one',status:'Hidden',notes:'Repeated unsolicited advertisements.'});assert(read().audit.some(a=>a.action==='admin.moderate'));assert.equal(STORAGE_KEY,'deepsprout-ecosystem-demo-v1');dispatch('demo.reset');assert.equal(read().session.personId,null);assert.equal(read().audit.length,0);
});
