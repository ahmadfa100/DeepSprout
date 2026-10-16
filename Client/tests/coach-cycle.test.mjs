/**
 * Independent Coach cycle — command and read-model tests (master §§13–14).
 * Pinned operational clock (15 Oct 2026 09:00 Asia/Amman), like the other
 * cycle suites, so date windows reproduce on any day.
 *
 *   node --test Client/tests/coach-cycle.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {read,dispatch,workspaces,inviteState,snapshotForTests} from '../src/workspaces/store.js';
import {migrate,upgradeTo4} from '../src/workspaces/migrate.js';
import {programGroupGarden,completionStatus,programMetrics,programHistoryFor,independentStatus,taskState} from '../src/workspaces/coach-rules.js';
import {assignedTasks,personalGardenEffects,hasPersonalGarden} from '../src/shared/selectors.js';

const as=personId=>dispatch('demo.signin',{personId});
const reset=personId=>{dispatch('demo.reset');dispatch('demo.clock',{at:'2026-10-15T09:00:00+03:00'});if(personId)as(personId);};
const me=()=>read().session.personId;
const PROGRAM={title:'Small Steps Lab',description:'Two weeks of small deliberate starts.',purpose:'Practise starting meaningful work.',focus:'Balanced technology use',duration:14,start:'2026-10-15',end:'2026-10-30',stages:[{id:'st-a',title:'Notice',objective:'Name one distraction.',date:'2026-10-18'},{id:'st-b',title:'Begin',objective:'Try ten focused minutes.',date:'2026-10-24'}],activities:['Practical Micro-Challenge'],required:true,completion:{rule:'all-required',percent:100}};
/** A NEW person completes Partner → Coach application and is approved by the Platform Admin. */
function approvedCoach(email='coach.new@demo.example',name='Lina Farah'){
  dispatch('auth.logout');
  dispatch('auth.account',{name,email,consent:true});dispatch('auth.otp',{email});dispatch('auth.verify',{email,code:'246810'});
  const app=dispatch('auth.application.submit',{type:'mentor',details:{title:'Youth coach',specialization:'Focus',years:'4',focus:'Study habits',bio:'Coaching small groups.',experience:'Four years.',topics:'Focus',phone:'0790000000'}});
  const pid=me();as('p-leen');dispatch('admin.application.decide',{id:app,status:'Approved'});as(pid);return {pid,app};
}
/** A new Invited Student joins through the simulated OTP. */
function joinNew(token,email,name){dispatch('auth.logout');dispatch('auth.otp',{email,token});dispatch('auth.join',{email,name,token,code:'246810'});return me();}

test('Registration → pending (no workspace, cannot operate) → info request → approval → notice → workspace', () => {
  reset();
  dispatch('auth.account',{name:'Rami Aziz',email:'rami@demo.example',consent:true});dispatch('auth.otp',{email:'rami@demo.example'});dispatch('auth.verify',{email:'rami@demo.example',code:'246810'});
  const pid=me();const app=dispatch('auth.application.submit',{type:'mentor',details:{title:'Coach',specialization:'Focus',years:'2',focus:'x',bio:'x',experience:'x',topics:'x',phone:'1'}});
  assert.equal(independentStatus(read(),pid),'Submitted');assert.ok(!workspaces().includes('mentor'));
  assert.throws(()=>dispatch('mentor.program.save',PROGRAM),/no active mentor workspace/);
  as('p-leen');dispatch('admin.application.decide',{id:app,status:'Needs More Info',reason:'Please describe your group experience.'});
  as(pid);dispatch('auth.application.respond',{id:app,text:'I ran two school study circles.'});
  as('p-leen');dispatch('admin.application.decide',{id:app,status:'Approved'});
  as(pid);assert.ok(workspaces().includes('mentor'));assert.equal(independentStatus(read(),pid),'Approved');
  const notices=read().notifications.filter(n=>n.recipientId===pid);
  assert.ok(notices.some(n=>/Independent Coach application was approved/.test(n.text)),'approval notice');
  assert.ok(notices.some(n=>/Needs More Info/.test(n.text)),'info-request notice');
  assert.equal(read().applications.find(a=>a.id===app).messages.length,3,'application history kept');
  assert.equal(read().people.filter(p=>p.email==='rami@demo.example').length,1,'one identity');
  const programId=dispatch('mentor.program.save',PROGRAM);assert.ok(programId);
  // Suspension stops independent operation; records stay.
  as('p-leen');dispatch('admin.application.decide',{id:app,status:'Suspended',reason:'Review'});as(pid);
  assert.throws(()=>dispatch('mentor.program.publish',{id:programId}),/no active mentor workspace|Independent Coach approval/);
  assert.ok(read().programs.some(p=>p.id===programId),'Program preserved');
});

test('Institution-invited Coach teaches the Initiative group but cannot operate independent Programs', () => {
  reset('p-karim');
  assert.ok(workspaces().includes('mentor'),'Coach workspace through the Initiative grant');
  assert.throws(()=>dispatch('mentor.program.save',PROGRAM),/Independent Coach approval/);
  assert.throws(()=>dispatch('mentor.group.save',{programId:'pr-start',name:'x',purpose:'y'}),/Independent Coach approval/);
  assert.throws(()=>dispatch('mentor.invite.create',{groupId:'g-fresh',email:'a@b.example'}),/Independent Coach approval/);
  assert.throws(()=>dispatch('mentor.assignment.create',{groupId:'g-fresh',title:'t',activity:'Protected Work',instructions:'i',due:'2026-10-28'}),/Independent Coach approval/);
  const id=dispatch('mentor.assignment.create',{groupId:'g-today-a',title:'Initiative task',activity:'Protected Work',instructions:'Protect twenty minutes.',due:'2026-11-01'});
  assert.equal(read().assignments.find(a=>a.id===id).initiativeId,'i-today','Initiative teaching unaffected');
});

test('Program-first: Group has exactly one Program parent; publish materializes stage tasks once; edits never rewrite', () => {
  reset();const {pid}=approvedCoach();
  assert.throws(()=>dispatch('mentor.group.save',{name:'Orphan',purpose:'x'}),/Parent Program is required/);
  const programId=dispatch('mentor.program.save',{...PROGRAM,newGroups:[{name:'Circle A',purpose:'Begin together',capacity:8},{name:'Circle B',purpose:'Begin together'}]});
  let s=read();const groups=s.groups.filter(g=>g.programId===programId);
  assert.equal(groups.length,2);assert.ok(groups.every(g=>g.parentType==='program'&&g.ownerId===pid&&!g.initiativeId),'one parent: Program, never Initiative');
  assert.deepEqual(s.programs.find(p=>p.id===programId).groupIds.sort(),groups.map(g=>g.id).sort());
  assert.throws(()=>dispatch('mentor.invite.create',{groupId:groups[0].id,email:'x@demo.example'}),/Publish the Program before inviting/);
  dispatch('mentor.program.publish',{id:programId});
  s=read();assert.equal(s.assignments.filter(a=>a.programId===programId).length,4,'2 stages × 1 activity × 2 groups');
  assert.throws(()=>dispatch('mentor.program.publish',{id:programId}),/Only a draft/);
  const c=dispatch('mentor.group.save',{programId,name:'Circle C',purpose:'Late group'});
  assert.equal(read().assignments.filter(a=>a.groupId===c).length,2,'new group under a published Program gets its stage tasks once');
  dispatch('mentor.group.save',{id:c,programId,name:'Circle C (renamed)',purpose:'Late group',capacity:10});
  assert.equal(read().assignments.filter(a=>a.groupId===c).length,2,'editing a group does not duplicate tasks');
  const before=structuredClone(read().assignments.filter(a=>a.programId===programId));
  const v=dispatch('mentor.program.update',{id:programId,description:'Updated description.',newStages:[{title:'Share',objective:'Share one next step.',date:'2026-10-29'}]});
  s=read();const pr=s.programs.find(p=>p.id===programId);
  assert.equal(v,2);assert.equal(pr.version,2);assert.equal(pr.stages.length,3);assert.equal(pr.history.at(-1).change,'Future details updated');
  for(const a of before)assert.deepEqual(s.assignments.find(x=>x.id===a.id),a,'existing tasks unchanged');
  assert.equal(s.assignments.filter(a=>a.programId===programId).length,before.length+3,'one new task per group for the new stage');
  assert.throws(()=>dispatch('mentor.program.update',{id:programId,end:'2026-10-20'}),/only move later/);
  const rev=dispatch('mentor.program.duplicate',{id:programId});
  assert.equal(read().programs.find(p=>p.id===rev).groupIds.length,0,'a revision never re-parents existing groups');
  assert.equal(read().groups.filter(g=>g.programId===programId).length,3);
});

test('Invitations: email required, new + existing identity, wrong email, expired, revoked, resend, decline, duplicates', () => {
  reset();approvedCoach();
  const programId=dispatch('mentor.program.save',{...PROGRAM,newGroups:[{name:'Circle',purpose:'Begin'}]});dispatch('mentor.program.publish',{id:programId});
  const gid=read().groups.find(g=>g.programId===programId).id,coach=me();
  assert.throws(()=>dispatch('mentor.invite.create',{groupId:gid}),/Recipient email is required/);
  // New Invited Student
  const t1=dispatch('mentor.invite.create',{groupId:gid,email:'new.student@demo.example'});
  assert.throws(()=>dispatch('mentor.invite.create',{groupId:gid,email:'new.student@demo.example'}),/active invitation already exists/);
  dispatch('auth.logout');dispatch('auth.otp',{email:'intruder@demo.example',token:t1});
  assert.throws(()=>dispatch('auth.join',{email:'intruder@demo.example',name:'X',token:t1,code:'246810'}),/email named in this invitation/);
  assert.equal(read().people.filter(p=>p.email==='intruder@demo.example').length,0,'wrong email grants and creates nothing');
  const student=joinNew(t1,'new.student@demo.example','Sara Nasser');
  let s=read();assert.ok(s.groups.find(g=>g.id===gid).memberIds.includes(student));assert.equal(s.invitations.find(i=>i.token===t1).status,'Accepted');
  assert.equal(inviteState(s,t1),'Already joined');assert.ok(workspaces().includes('student'));
  assert.equal(s.people.find(p=>p.id===student).individual,undefined,'Invited Student is not a full Individual');
  assert.equal(hasPersonalGarden(s,student),false,'Group Garden only until upgrade');
  dispatch('auth.logout');assert.equal(inviteState(read(),t1),'Accepted','a used link grants nothing again');
  // Existing full Individual, signed in, accepts with the same identity (no OTP, no new person)
  as(coach);const t2=dispatch('mentor.invite.create',{groupId:gid,email:'ahmad@demo.example'});
  as('p-maya');assert.throws(()=>dispatch('auth.invite.accept',{token:t2}),/different email/);
  const people=read().people.length;as('p-ahmad');dispatch('auth.invite.accept',{token:t2});
  s=read();assert.equal(s.people.length,people,'no second identity');assert.ok(s.groups.find(g=>g.id===gid).memberIds.includes('p-ahmad'));
  assert.throws(()=>dispatch('auth.invite.accept',{token:t2}),/no longer available|already joined/);
  // Expired, revoked, resend and decline
  as(coach);const t3=dispatch('mentor.invite.create',{groupId:gid,email:'late@demo.example',expires:'2026-10-16'});
  dispatch('demo.clock',{at:'2026-10-18T09:00:00+03:00'});assert.equal(inviteState(read(),t3),'Expired');
  const old=read().invitations.find(i=>i.token===t3);const t4=dispatch('mentor.invite.resend',{id:old.id});
  assert.equal(read().invitations.find(i=>i.id===old.id).status,'Replaced');assert.equal(inviteState(read(),t3),'Revoked');assert.equal(inviteState(read(),t4),'Valid');
  dispatch('mentor.invite.revoke',{id:read().invitations.find(i=>i.token===t4).id});dispatch('auth.logout');
  dispatch('auth.otp',{email:'late@demo.example',token:t4});assert.throws(()=>dispatch('auth.join',{email:'late@demo.example',name:'L',token:t4,code:'246810'}),/no longer available/);
  as(coach);const t5=dispatch('mentor.invite.create',{groupId:gid,email:'omar@demo.example'});as('p-omar');dispatch('auth.invite.decline',{token:t5});
  assert.equal(inviteState(read(),t5),'Declined');assert.ok(read().notifications.some(n=>n.recipientId===coach&&/declined/.test(n.text)));
});

test('Shared engine: submit → revision → resubmit → approve; one reward; bounded Garden; reschedule/cancel; foreign Coach refused', () => {
  reset();const {pid:coach}=approvedCoach();
  const programId=dispatch('mentor.program.save',{...PROGRAM,newGroups:[{name:'Circle',purpose:'Begin'}]});dispatch('mentor.program.publish',{id:programId});
  const gid=read().groups.find(g=>g.programId===programId).id;
  const token=dispatch('mentor.invite.create',{groupId:gid,email:'sara@demo.example'});const student=joinNew(token,'sara@demo.example','Sara');
  as(coach);const aid=dispatch('mentor.assignment.create',{groupId:gid,title:'One small start',activity:'Practical Micro-Challenge',instructions:'Try one small step.',due:'2026-10-25'});
  assert.ok(read().notifications.some(n=>n.recipientId===student&&n.link.includes(`#/student/tasks/${aid}`)),'limited Student notice links to My Tasks');
  as(student);dispatch('student.task.start',{id:aid});assert.equal(taskState(read(),read().assignments.find(a=>a.id===aid),student).status,'In Progress');
  dispatch('student.submit',{assignmentId:aid,text:'I wrote one line.'});
  const sub=read().submissions.find(x=>x.assignmentId===aid);assert.equal(sub.attempt,1);assert.equal(sub.assignmentVersion,1);
  // Another approved Coach cannot review or reach this group
  const other=approvedCoach('other.coach@demo.example','Other Coach').pid;
  assert.throws(()=>dispatch('mentor.review',{id:sub.id,decision:'Approved'}),/outside your groups/);
  assert.throws(()=>dispatch('mentor.invite.create',{groupId:gid,email:'z@demo.example'}),/different Mentor/);
  assert.throws(()=>dispatch('mentor.assignment.create',{groupId:gid,title:'x',activity:'Protected Work',instructions:'y',due:'2026-10-28'}),/different Mentor/);
  as(coach);dispatch('mentor.review',{id:sub.id,decision:'Needs Revision',feedback:'Tell me what helped.',internalNote:'Private note'});
  as(student);dispatch('student.submit',{assignmentId:aid,text:'Phone away; one line became a page.'});
  as(coach);dispatch('mentor.review',{id:sub.id,decision:'Approved'});
  assert.throws(()=>dispatch('mentor.review',{id:sub.id,decision:'Approved'}),/already been reviewed/);
  let s=read();const final=s.submissions.find(x=>x.id===sub.id);
  assert.equal(final.history.length,3,'attempt 1, decision, attempt snapshot… preserved');assert.equal(final.attempt,2);
  assert.equal(s.rewards.filter(r=>r.sourceId===sub.id).length,1,'one source-linked reward');
  const g1=programGroupGarden(s,gid);assert.equal(g1.count,1);assert.ok(g1.milestones.find(m=>m.key==='first-root').done);assert.ok(g1.milestones.find(m=>m.key==='everyone').done);
  // Many extra approved tasks never exceed the bounded milestone set
  for(let i=0;i<6;i++){as(coach);const extra=dispatch('mentor.assignment.create',{groupId:gid,title:`Extra ${i}`,activity:'Depth Practice',instructions:'x',due:'2026-10-26'});as(student);dispatch('student.submit',{assignmentId:extra,text:'done'});as(coach);dispatch('mentor.review',{id:read().submissions.find(x=>x.assignmentId===extra).id,decision:'Approved'});}
  const g2=programGroupGarden(read(),gid);assert.equal(g2.count,7);assert.equal(g2.total,g1.total,'same milestone set');assert.equal(g2.reached,g1.reached,'direct extra tasks add no milestone');
  // Reschedule keeps history; cancel keeps submissions
  const later=dispatch('mentor.assignment.create',{groupId:gid,title:'Later',activity:'Protected Work',instructions:'x',due:'2026-10-27'});
  dispatch('mentor.assignment.reschedule',{id:later,due:'2026-10-29',reason:'Exam week'});
  s=read();const la=s.assignments.find(a=>a.id===later);assert.equal(la.version,2);assert.equal(la.history[0].due,'2026-10-27');
  assert.throws(()=>dispatch('mentor.assignment.reschedule',{id:later,due:'2026-10-01',reason:'x'}),/from today onward/);
  dispatch('mentor.assignment.cancel',{id:later,reason:'Replaced by a simpler task'});
  assert.equal(taskState(read(),read().assignments.find(a=>a.id===later),student).status,'Cancelled');
  assert.equal(assignedTasks(read(),student).some(t=>t.id===later&&t.actionable),false,'cancelled work leaves the to-do list');
  void other;
});

test('Reports from source records; completion records + collective milestone; no Personal Garden object; same-identity upgrade', () => {
  reset();const {pid:coach}=approvedCoach();
  const programId=dispatch('mentor.program.save',{...PROGRAM,newGroups:[{name:'Circle',purpose:'Begin'}]});dispatch('mentor.program.publish',{id:programId});
  const gid=read().groups.find(g=>g.programId===programId).id;
  const sara=joinNew(dispatch('mentor.invite.create',{groupId:gid,email:'sara@demo.example'}),'sara@demo.example','Sara');
  as(coach);const omar=(()=>{const t=dispatch('mentor.invite.create',{groupId:gid,email:'omar@demo.example'});as('p-omar');dispatch('auth.invite.accept',{token:t});return 'p-omar';})();
  const stageTasks=read().assignments.filter(a=>a.groupId===gid);assert.equal(stageTasks.length,2);
  for(const a of stageTasks){as(sara);dispatch('student.submit',{assignmentId:a.id,text:`Did ${a.title}`});}
  as(omar);dispatch('student.submit',{assignmentId:stageTasks[0].id,text:'Did one'});
  as(coach);
  for(const x of read().submissions.filter(x=>x.studentId===sara))dispatch('mentor.review',{id:x.id,decision:'Approved'});
  assert.throws(()=>dispatch('mentor.program.complete',{id:programId}),/awaiting review/);
  const omarSub=read().submissions.find(x=>x.studentId===omar);dispatch('mentor.review',{id:omarSub.id,decision:'Needs Revision',feedback:'Add detail.'});
  const pr=read().programs.find(p=>p.id===programId),g=read().groups.find(x=>x.id===gid);
  assert.deepEqual([completionStatus(read(),pr,g,sara).eligible,completionStatus(read(),pr,g,omar).eligible],[true,false]);
  const m=programMetrics(read(),pr,{from:'2026-10-01',to:'2026-10-31'});
  assert.equal(m.students,2);assert.equal(m.approved,2);assert.equal(m.needsRevision,1);assert.equal(m.eligible,1);assert.equal(m.overdue,0,'nothing is overdue before its due date');
  assert.throws(()=>dispatch('mentor.report.save',{programId,from:'2026-10-01',to:'2026-10-31',submit:true}),/Observations is required/);
  const rid=dispatch('mentor.report.save',{programId,from:'2026-10-01',to:'2026-10-31',observations:'Sara steady; Omar revising.',submit:true});
  const report=read().coachReports.find(r=>r.id===rid);assert.equal(report.metrics.approved,2);assert.equal(report.status,'Submitted');assert.equal(report.parentType,'program');
  assert.throws(()=>dispatch('mentor.report.save',{id:rid,programId,from:'2026-10-01',to:'2026-10-31',observations:'edit'}),/read-only/);
  assert.equal(read().notifications.filter(n=>/Supervisor/.test(n.text)&&n.recipientId!==coach).length,0,'no Supervisor step for an independent report');
  const effectsBefore=personalGardenEffects(read(),'p-omar').length;
  const result=dispatch('mentor.program.complete',{id:programId});assert.deepEqual(result,{completed:1,total:2});
  let s=read();const recs=s.programCompletions.filter(c=>c.programId===programId);
  assert.deepEqual(recs.map(c=>[c.personId,c.status]).sort(),[[omar,'Not completed'],[sara,'Completed']].sort());
  assert.equal(s.programs.find(p=>p.id===programId).status,'Completed');assert.equal(s.groups.find(x=>x.id===gid).status,'Completed');
  assert.ok(programGroupGarden(s,gid).milestones.find(x=>x.key==='completed').done,'collective completion milestone');
  assert.equal(personalGardenEffects(s,'p-omar').length,effectsBefore,'completion adds no Personal Garden object');
  assert.throws(()=>dispatch('mentor.program.complete',{id:programId}),/Only a published or paused/);
  assert.equal(s.invitations.filter(i=>i.programId===programId&&i.status==='Active').length,0,'open invitations close with the Program');
  as(omar);assert.throws(()=>dispatch('student.submit',{assignmentId:stageTasks[0].id,text:'late'}),/not running|ended/);
  // Same-identity upgrade of the limited Student
  as(sara);const before=structuredClone(read().submissions.filter(x=>x.studentId===sara));
  const upgraded=dispatch('account.upgrade',{consent:true});s=read();
  assert.equal(upgraded,sara);assert.equal(s.people.filter(p=>p.email==='sara@demo.example').length,1);assert.equal(s.people.find(p=>p.id===sara).individual,true);
  assert.deepEqual(s.submissions.filter(x=>x.studentId===sara),before,'every attempt and review preserved');
  assert.ok(s.groups.find(x=>x.id===gid).memberIds.includes(sara),'membership preserved');
  const hist=programHistoryFor(s,sara);assert.equal(hist[0].completion.status,'Completed');assert.equal(hist[0].approved,2);
  assert.equal(assignedTasks(s,sara).length,2,'same Assignment records in Activities → Assigned');
  assert.equal(hasPersonalGarden(s,sara),true,'Personal Garden starts after upgrade');
  assert.throws(()=>dispatch('account.upgrade',{consent:true}),/already has a full Individual/);
});

test('Lifecycle guards: pause blocks new work and joins; cancel needs a reason and keeps history; archive', () => {
  reset();approvedCoach();
  const programId=dispatch('mentor.program.save',{...PROGRAM,newGroups:[{name:'Circle',purpose:'Begin'}]});dispatch('mentor.program.publish',{id:programId});
  const gid=read().groups.find(g=>g.programId===programId).id,coach=me();
  const token=dispatch('mentor.invite.create',{groupId:gid,email:'p1@demo.example'});
  assert.throws(()=>dispatch('mentor.program.pause',{id:programId}),/Pause reason is required/);
  dispatch('mentor.program.pause',{id:programId,reason:'Holiday'});
  assert.equal(inviteState(read(),token),'Closed');
  assert.throws(()=>dispatch('mentor.assignment.create',{groupId:gid,title:'x',activity:'Protected Work',instructions:'y',due:'2026-10-28'}),/only while the Program is published/);
  assert.throws(()=>dispatch('mentor.invite.create',{groupId:gid,email:'p2@demo.example'}),/Publish the Program/);
  dispatch('mentor.program.resume',{id:programId});assert.equal(inviteState(read(),token),'Valid');
  assert.throws(()=>dispatch('mentor.program.archive',{id:programId}),/Complete or cancel/);
  assert.throws(()=>dispatch('mentor.program.cancel',{id:programId}),/Cancellation reason is required/);
  dispatch('mentor.program.cancel',{id:programId,reason:'Venue closed'});
  const s=read();assert.equal(s.programs.find(p=>p.id===programId).status,'Cancelled');
  assert.ok(s.assignments.filter(a=>a.programId===programId).every(a=>a.status==='Cancelled'&&/Venue closed/.test(a.cancelReason)));
  assert.equal(inviteState(s,token),'Revoked');
  dispatch('mentor.program.archive',{id:programId});assert.equal(read().programs.find(p=>p.id===programId).status,'Archived');
  assert.ok(read().programs.find(p=>p.id===programId).history.length>=4,'history preserved');
  void coach;
});

test('Optional Initiative link keeps Coach ownership, IDs and records; Institution sees aggregates only', () => {
  reset();const {pid:coach}=approvedCoach();
  const programId=dispatch('mentor.program.save',{...PROGRAM,newGroups:[{name:'Circle',purpose:'Begin'}]});dispatch('mentor.program.publish',{id:programId});
  const before=structuredClone({program:read().programs.find(p=>p.id===programId),groups:read().groups.filter(g=>g.programId===programId),assignments:read().assignments.filter(a=>a.programId===programId)});
  const link=dispatch('mentor.program.link.propose',{programId,initiativeId:'i-today',note:'Joint study month.'});
  assert.throws(()=>dispatch('mentor.program.link.propose',{programId,initiativeId:'i-today'}),/already has a proposed or active link/);
  as('p-maya');dispatch('organization.program.link.decide',{id:link,decision:'Active'});
  const s=read();assert.equal(s.programLinks.find(l=>l.id===link).status,'Active');
  const pr=s.programs.find(p=>p.id===programId);assert.equal(pr.ownerId,coach);assert.equal(pr.id,before.program.id);
  assert.deepEqual(s.groups.filter(g=>g.programId===programId).map(g=>[g.id,g.parentType,g.ownerId]),before.groups.map(g=>[g.id,'program',coach]),'groups stay Program-parented and Coach-owned');
  assert.equal(s.assignments.filter(a=>a.programId===programId).length,before.assignments.length,'nothing duplicated into the Initiative');
  assert.equal(s.groups.filter(g=>g.initiativeId==='i-today').length,2,'Initiative groups unchanged');
  as('p-sami');assert.throws(()=>dispatch('organization.program.link.decide',{id:link,decision:'End'}),/no active organization workspace|another Institution/);
});

test('Schema 3 → 4 migration: legacy groups attach only to a listing Program; parentless groups are not given an invented Program; idempotent', () => {
  reset();const s=read();
  s.schema=3;s.groups.push({id:'g-legacy',ownerId:'p-maya',name:'Legacy',purpose:'x',capacity:5,memberIds:[],status:'Open'},{id:'g-listed',ownerId:'p-maya',name:'Listed',purpose:'x',capacity:5,memberIds:[],status:'Open'});
  s.programs[0].groupIds.push('g-listed');for(const g of s.groups)if(g.parentType==='program'){delete g.parentType;}
  delete s.programCompletions;delete s.programLinks;const programs=s.programs.length;
  assert.equal(migrate(s),true);assert.equal(s.schema,4);
  assert.equal(s.groups.find(g=>g.id==='g-listed').programId,s.programs[0].id);
  assert.equal(s.groups.find(g=>g.id==='g-legacy').programId,null);assert.equal(s.groups.find(g=>g.id==='g-legacy').parentType,'program');
  assert.equal(s.programs.length,programs,'no Program invented');assert.deepEqual(s.programCompletions,[]);
  const snapshot=JSON.stringify(s);upgradeTo4(s);assert.equal(JSON.stringify(s),snapshot,'idempotent');
  snapshotForTests(s);as('p-maya');assert.throws(()=>dispatch('mentor.invite.create',{groupId:'g-legacy',email:'a@demo.example'}),/Attach this group/);
});

test('One person, two Coach contexts: independent Programs and an Institution grant stay separate', () => {
  reset();const {pid:lina}=approvedCoach();
  const programId=dispatch('mentor.program.save',{...PROGRAM,newGroups:[{name:'Own circle',purpose:'Begin'}]});dispatch('mentor.program.publish',{id:programId});
  as('p-maya');const token=dispatch('initiative.staff.invite',{initiativeId:'i-today',role:'coach',email:'coach.new@demo.example'});
  as(lina);dispatch('initiative.staff.accept',{token});
  as('p-maya');dispatch('initiative.group.coach',{groupId:'g-today-b',coachId:lina});
  as(lina);assert.ok(workspaces().includes('mentor'));
  const people=read().people.filter(p=>p.email==='coach.new@demo.example');assert.equal(people.length,1,'one Person ID for both contexts');
  const task=dispatch('mentor.assignment.create',{groupId:'g-today-b',title:'Initiative task',activity:'Protected Work',instructions:'x',due:'2026-11-01'});
  assert.equal(read().assignments.find(a=>a.id===task).initiativeId,'i-today','teaches the Initiative group through the grant');
  assert.throws(()=>dispatch('mentor.invite.create',{groupId:'g-today-b',email:'x@demo.example'}),/different Mentor|Attach this group/,'no private invitations into an Institution group');
  assert.throws(()=>dispatch('mentor.group.save',{id:'g-today-b',programId,name:'Steal',purpose:'x'}),/different Mentor|managed by the Institution/,'cannot re-parent an Institution group');
  assert.throws(()=>dispatch('mentor.assignment.create',{groupId:'g-today-a',title:'x',activity:'Protected Work',instructions:'y',due:'2026-11-01'}),/currently assigned/,'only allocated Initiative groups');
  const s=read();assert.equal(s.groups.find(g=>g.id==='g-today-b').parentType,'initiative');assert.equal(s.programs.find(p=>p.id===programId).ownerId,lina);
  assert.ok(s.groups.filter(g=>g.programId===programId).every(g=>g.parentType==='program'),'independent groups unaffected');
});
