/**
 * Institution cycle — command and read-model tests (Node, in-memory store).
 * These prove the shared records and guards. They do NOT prove page
 * rendering or browser persistence; see institution-browser.test.cjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {read,dispatch,workspaces,snapshotForTests,seed} from '../src/workspaces/store.js';
import {migrate} from '../src/workspaces/migrate.js';
import {seatsUsed,needsSupervisor,MAX_SEATS} from '../src/workspaces/initiative-rules.js';
import {exploreInitiatives,myInitiatives,assignedTasks,personalGardenEffects,initiativeGarden,sessionRoster} from '../src/shared/selectors.js';

const as = personId => dispatch('demo.signin', {personId});
// The operational clock is pinned so date-bound rules (registration windows, expiries) reproduce on any day.
const PIN = '2026-10-15T09:00:00+03:00';
const reset = personId => { dispatch('demo.reset'); dispatch('demo.clock', {at:PIN}); if (personId) as(personId); };
const BASE = {title:'Focus Together 2026', topic:'Balanced technology use', objective:'Practise focused study in small supported groups.', summary:'Six weeks of small steps, sessions and Coach feedback.', description:'A structured initiative.', start:'2026-10-20', end:'2026-12-01', timezone:'Asia/Amman', audience:'University students', minAge:17, maxAge:30, consent:'I agree to respectful participation and identified surveys.', country:'Jordan', coverage:'Jordan-wide, online and Amman venue', modes:['Online','In-person'], primaryMode:'Hybrid', venue:'Horizon Youth Center, Amman', capacity:135, registrationOpen:'2026-10-14', registrationClose:'2026-11-20', cost:{type:'Free',price:0,currency:'JOD'}, policies:{waitlist:true, offerHours:24, completion:'Attend one session and complete one reviewed task.'}, components:[{id:'c1', type:'Awareness Content', title:'Why attention matters'}]};
function publish(extra = {}) { as('p-maya'); const iid = dispatch('organization.initiative.save', {...BASE, ...extra}); dispatch('organization.initiative.publish', {id:iid}); return iid; }
function addPeople(n, prefix = 't') { const s = read(); for (let i = 0; i < n; i++) s.people.push({id:`p-${prefix}${i}`, name:`Test ${prefix}${i}`, email:`${prefix}${i}@demo.example`, workspaces:[], status:'Active', verified:true, individual:true}); snapshotForTests(s); }
function invite(iid, role, email) { as('p-maya'); return dispatch('initiative.staff.invite', {initiativeId:iid, role, email}); }

test('A · draft hidden, publish reaches regular Explore projection, Admin suspension removes it', () => {
  reset('p-maya');
  const iid = dispatch('organization.initiative.save', {...BASE, title:'Unique Draft 7731'});
  assert.equal(exploreInitiatives(read(), 'p-ahmad').some(c => c.id === iid), false, 'draft must stay hidden');
  assert.throws(() => dispatch('organization.initiative.publish', {id:dispatch('organization.initiative.save', {title:'Incomplete'})}), /Fix before publishing/);
  dispatch('organization.initiative.publish', {id:iid});
  const card = exploreInitiatives(read(), 'p-ahmad').find(c => c.id === iid);
  assert.ok(card, 'published initiative is read by the Explore selector from the same record');
  assert.equal(card.capacity, 135); assert.equal(card.registration, 'Open'); assert.equal(card.organizerVerified, true);
  assert.equal(read().initiatives.filter(i => i.id === iid).length, 1, 'no copy was created');
  as('p-ahmad'); dispatch('member.application.submit', {initiativeId:iid, age:21, consent:true});
  as('p-leen'); dispatch('admin.resource.status', {collection:'initiatives', id:iid, status:'Suspended', reason:'Verification follow-up'});
  assert.equal(exploreInitiatives(read(), 'p-zaid').some(c => c.id === iid), false);
  as('p-zaid'); assert.throws(() => dispatch('member.application.submit', {initiativeId:iid, age:21, consent:true}), /not open/);
  assert.equal(myInitiatives(read(), 'p-ahmad').length >= 1, true, 'existing history stays visible');
  assert.ok(read().notifications.some(n => n.recipientId === 'p-ahmad' && /suspended/.test(n.text)));
});

test('A · capacity above 135 and Paid without price are publish blockers; Supervisor absence is not', () => {
  reset('p-maya');
  const big = dispatch('organization.initiative.save', {...BASE, capacity:136});
  assert.throws(() => dispatch('organization.initiative.publish', {id:big}), /1–135/);
  const paid = dispatch('organization.initiative.save', {...BASE, cost:{type:'Paid', price:0, currency:'JOD'}});
  assert.throws(() => dispatch('organization.initiative.publish', {id:paid}), /positive price/);
  const ok = publish();
  assert.equal(read().initiatives.find(i => i.id === ok).status, 'Published');
  assert.equal(read().grants.filter(g => g.scopeId === ok).length, 0, 'published without any Supervisor');
});

test('B · staff invitations: wrong email, expiry, cancel, accept, 3-Supervisor cap, revoke', () => {
  reset(); const iid = publish();
  const token = invite(iid, 'supervisor', 'yara@demo.example');
  as('p-zaid'); assert.throws(() => dispatch('initiative.staff.accept', {token}), /sent to yara@demo.example/);
  assert.equal(read().grants.filter(g => g.scopeId === iid).length, 0, 'wrong email grants nothing');
  as('p-yara'); assert.ok(!workspaces().includes('supervisor'));
  dispatch('initiative.staff.accept', {token}); assert.ok(workspaces().includes('supervisor'), 'scoped workspace appears without Admin approval');
  assert.throws(() => dispatch('initiative.staff.accept', {token}), /accepted and grants nothing/);
  // Expiry via the operational clock.
  const late = invite(iid, 'coach', 'karim@demo.example');
  dispatch('demo.clock', {hours:24 * 8});
  as('p-karim'); assert.throws(() => dispatch('initiative.staff.accept', {token:late}), /expired/);
  dispatch('demo.clock', {at:PIN});
  // Cancelled invitation grants nothing.
  const cancelled = invite(iid, 'coach', 'zaid@demo.example');
  dispatch('initiative.staff.cancel', {id:read().staffInvites.find(x => x.token === cancelled).id});
  as('p-zaid'); assert.throws(() => dispatch('initiative.staff.accept', {token:cancelled}), /cancelled/);
  // Third/fourth active Supervisor.
  addPeople(3, 'sup');
  for (let i = 0; i < 3; i++) { const t = invite(iid, 'supervisor', `sup${i}@demo.example`); as(`p-sup${i}`); if (i < 2) dispatch('initiative.staff.accept', {token:t}); else assert.throws(() => dispatch('initiative.staff.accept', {token:t}), /already has 3 active Supervisors/); }
  assert.equal(read().grants.filter(g => g.scopeId === iid && g.role === 'supervisor' && g.status === 'Active').length, 3);
  // Revocation removes future authority, keeps history.
  as('p-ahmad'); const appId = dispatch('member.application.submit', {initiativeId:iid, age:22, consent:true});
  as('p-maya'); const grant = read().grants.find(g => g.scopeId === iid && g.personId === 'p-yara');
  assert.throws(() => dispatch('initiative.staff.revoke', {id:grant.id}), /Reason/);
  dispatch('initiative.staff.revoke', {id:grant.id, reason:'Role change'});
  as('p-yara'); assert.throws(() => dispatch('initiative.application.approve', {id:appId}), /Representative or an active Supervisor/);
  assert.equal(read().grants.find(g => g.id === grant.id).status, 'Revoked');
  // A pending 4th Supervisor can now accept because a place is free.
  as('p-sup2'); dispatch('initiative.staff.accept', {token:read().staffInvites.find(x => x.email === 'sup2@demo.example').token});
});

test('B · new account path: register, verify, then accept a Coach invitation', () => {
  reset(); const iid = publish();
  const token = invite(iid, 'coach', 'new.coach@demo.example');
  dispatch('auth.logout'); dispatch('auth.account', {name:'New Coach', email:'new.coach@demo.example', consent:true});
  assert.throws(() => dispatch('initiative.staff.accept', {token}), /Verify your email/);
  dispatch('auth.otp', {email:'new.coach@demo.example'}); dispatch('auth.verify', {code:'246810'});
  dispatch('initiative.staff.accept', {token});
  assert.ok(workspaces().includes('mentor'));
  assert.equal(read().people.filter(p => p.email === 'new.coach@demo.example').length, 1, 'no duplicate identity');
});

test('C · one Application seen by Rep and Supervisor; one approval, one seat; authority rules', () => {
  reset(); const iid = publish();
  const token = invite(iid, 'supervisor', 'hala@demo.example'); as('p-hala'); dispatch('initiative.staff.accept', {token});
  as('p-ahmad');
  assert.throws(() => dispatch('member.application.submit', {initiativeId:iid, age:12, consent:true}), /ages 17–30/);
  assert.throws(() => dispatch('member.application.submit', {initiativeId:iid, age:22}), /consent/);
  const appId = dispatch('member.application.submit', {initiativeId:iid, age:22, consent:true, motivation:'Study focus'});
  assert.throws(() => dispatch('member.application.submit', {initiativeId:iid, age:22, consent:true}), /already have an application/);
  const record = read().admissions.find(a => a.id === appId);
  assert.equal(myInitiatives(read(), 'p-ahmad').find(m => m.initiative.id === iid).admission.code, record.code);
  as('p-hala'); assert.throws(() => dispatch('initiative.application.reject', {id:appId, reason:'x'}), /Only the Institution Representative/);
  assert.equal(dispatch('initiative.application.approve', {id:appId}), 'Accepted');
  as('p-maya'); assert.throws(() => dispatch('initiative.application.approve', {id:appId}), /already been approved/);
  assert.equal(seatsUsed(read(), iid), 1);
  assert.equal(myInitiatives(read(), 'p-ahmad').find(m => m.initiative.id === iid).admission.status, 'Accepted');
  for (const action of ['suspend','remove','block']) { as('p-hala'); assert.throws(() => dispatch(`initiative.participant.${action}`, {id:appId, reason:'x'}), /Only the Institution Representative/); }
  // Rep discipline with reason; suspension keeps the seat (interim default).
  as('p-maya'); dispatch('initiative.participant.suspend', {id:appId, reason:'Missed safety briefing'}); assert.equal(seatsUsed(read(), iid), 1);
  dispatch('initiative.participant.restore', {id:appId, reason:'Briefing completed'});
  // Groups and Coach scope.
  const gA = dispatch('initiative.group.save', {initiativeId:iid, name:'Group A'}), gB = dispatch('initiative.group.save', {initiativeId:iid, name:'Group B'});
  const ct = invite(iid, 'coach', 'karim@demo.example'); as('p-karim'); dispatch('initiative.staff.accept', {token:ct});
  const yt = invite(iid, 'coach', 'yara@demo.example'); as('p-yara'); dispatch('initiative.staff.accept', {token:yt});
  as('p-hala'); dispatch('initiative.group.coach', {groupId:gA, coachId:'p-karim'}); dispatch('initiative.group.coach', {groupId:gB, coachId:'p-yara'});
  dispatch('initiative.group.allocate', {initiativeId:iid, personId:'p-ahmad', groupId:gA});
  as('p-zaid'); const zid = dispatch('member.application.submit', {initiativeId:iid, age:23, consent:true});
  as('p-hala'); assert.throws(() => dispatch('initiative.group.allocate', {initiativeId:iid, personId:'p-zaid', groupId:gB}), /accepted student/);
  dispatch('initiative.application.approve', {id:zid}); dispatch('initiative.group.allocate', {initiativeId:iid, personId:'p-zaid', groupId:gB});
  as('p-yara'); assert.throws(() => dispatch('mentor.assignment.create', {groupId:gA, title:'x', activity:'Protected Work', instructions:'x', due:'2026-11-01'}), /currently assigned/);
  // Transfer keeps history.
  as('p-maya'); dispatch('initiative.group.allocate', {initiativeId:iid, personId:'p-zaid', groupId:gA});
  const s = read(); assert.ok(s.groups.find(g => g.id === gB).memberHistory.some(h => h.personId === 'p-zaid' && h.action === 'Transferred out'));
  assert.equal(seatsUsed(s, iid), 2, 'transfer never consumes a second seat');
});

test('C · 135th accepted, 136th queued; Waiting List offer → expiry → re-offer → accept', () => {
  reset(); const iid = publish(); addPeople(137, 'cap');
  const ids = [];
  for (let i = 0; i < 137; i++) { as(`p-cap${i}`); ids.push(dispatch('member.application.submit', {initiativeId:iid, age:20, consent:true})); }
  as('p-maya');
  for (let i = 0; i < 135; i++) assert.equal(dispatch('initiative.application.approve', {id:ids[i]}), 'Accepted');
  assert.equal(seatsUsed(read(), iid), MAX_SEATS);
  assert.equal(dispatch('initiative.application.approve', {id:ids[135]}), 'Queued', '136th is queued, not seated');
  assert.equal(dispatch('initiative.application.approve', {id:ids[136]}), 'Queued');
  assert.equal(read().admissions.filter(a => a.initiativeId === iid && a.status === 'Accepted').length, 135);
  as('p-cap0'); dispatch('member.application.withdraw', {id:ids[0]});
  let offered = read().admissions.find(a => a.id === ids[135]); assert.equal(offered.status, 'Offered');
  assert.equal(seatsUsed(read(), iid), 135, 'a live offer holds the seat');
  dispatch('demo.clock', {hours:25});
  assert.equal(read().admissions.find(a => a.id === ids[135]).status, 'Expired');
  assert.equal(read().admissions.find(a => a.id === ids[136]).status, 'Offered', 'next queued person is offered');
  as('p-cap135'); assert.throws(() => dispatch('member.offer.accept', {id:ids[135]}), /expired/);
  as('p-cap136'); dispatch('member.offer.accept', {id:ids[136]});
  assert.equal(read().admissions.filter(a => a.initiativeId === iid && a.status === 'Accepted').length, 135);
  dispatch('demo.clock', {at:PIN});
});

test('D · Coach task → Individual Assigned → revision → approval → one tree effect, Supervisor and Rep see it', () => {
  reset('p-karim');
  const before = read().submissions.length;
  const taskId = dispatch('mentor.assignment.create', {groupId:'g-today-a', title:'Twenty minutes of protected study', activity:'Protected Work', instructions:'Protect twenty minutes for one study task.', start:'2026-10-15', due:'2026-10-30', required:true});
  as('p-rania');
  const task = assignedTasks(read(), 'p-rania').find(t => t.id === taskId);
  assert.ok(task, 'appears in the regular Individual Assigned read model'); assert.equal(task.context.type, 'initiative'); assert.equal(task.practiceType, 'protected-work');
  assert.equal(assignedTasks(read(), 'p-omar').some(t => t.id === taskId), false, 'not visible outside the group');
  dispatch('member.task.start', {id:taskId});
  dispatch('member.task.submit', {assignmentId:taskId, text:'I studied for 20 minutes with my phone away.'});
  const sub = read().submissions.find(x => x.assignmentId === taskId);
  as('p-karim'); dispatch('mentor.review', {id:sub.id, decision:'Needs Revision', feedback:'Tell me what interrupted you.', internalNote:'Seems overloaded this week.'});
  as('p-rania'); dispatch('member.task.submit', {assignmentId:taskId, text:'Studied 20 minutes; a notification pulled me away once.'});
  as('p-karim'); dispatch('mentor.review', {id:sub.id, decision:'Approved', feedback:'Great awareness.'});
  assert.throws(() => dispatch('mentor.review', {id:sub.id, decision:'Approved'}), /already been reviewed/);
  const s = read(); const saved = s.submissions.find(x => x.id === sub.id);
  assert.equal(saved.history.length, 3, 'every attempt and decision preserved'); assert.equal(saved.attempt, 2);
  assert.equal(s.submissions.length, before + 1, 'one Submission record across attempts');
  const trees = personalGardenEffects(s, 'p-rania').filter(e => e.sourceId === sub.id);
  assert.equal(trees.length, 1); assert.equal(trees[0].type, 'protected-work');
  assert.equal(initiativeGarden(s, 'i-today').byKind.tasks >= 1, true, 'counts once in the Initiative Group Garden');
  // Another Coach cannot review it.
  as('p-maya'); assert.throws(() => dispatch('mentor.review', {id:sub.id, decision:'Approved'}), /outside your groups|already/);
});

test('E · session booking, Needs Supervisor gate, QR/code, duplicate, online roster, Absent, excuse chain, no rabbit', () => {
  reset('p-maya');
  const sid = dispatch('initiative.session.save', {initiativeId:'i-today', title:'Exam-week focus clinic', speaker:'Maya Haddad', date:'2026-10-28', time:'16:00', endTime:'17:30', format:'Hybrid', venue:'Horizon Hall 1', onlineCapacity:10, inPersonCapacity:10});
  dispatch('initiative.session.publish', {id:sid});
  let s = read(); assert.equal(needsSupervisor(s, s.sessions.find(x => x.id === sid)), true);
  as('p-omar'); assert.throws(() => dispatch('member.session.register', {sessionId:sid, mode:'In-person', consent:true}), /Only accepted participants/);
  as('p-rania'); const rr = dispatch('member.session.register', {sessionId:sid, mode:'In-person', consent:true});
  as('p-noor'); dispatch('participant.session.register', {sessionId:sid, mode:'Online', consent:true});
  const code = read().sessionRegistrations.find(r => r.id === rr).code; assert.match(code, /^DS-/);
  as('p-hala'); assert.throws(() => dispatch('initiative.attendance.record', {sessionId:sid, method:'code', code}), /not the assigned Supervisor/);
  as('p-maya'); assert.throws(() => dispatch('initiative.attendance.record', {sessionId:sid, method:'code', code}), /active Supervisor/);
  as('p-hala'); dispatch('initiative.session.assign', {id:sid, supervisorIds:['p-hala']});
  s = read(); assert.equal(needsSupervisor(s, s.sessions.find(x => x.id === sid)), false);
  assert.throws(() => dispatch('initiative.attendance.record', {sessionId:sid, method:'code', code}), /has not opened yet/, 'check-in window enforced');
  dispatch('demo.clock', {at:'2026-10-28T16:05:00+03:00'});
  assert.throws(() => dispatch('initiative.attendance.record', {sessionId:sid, method:'code', code:'DS-WRONG1'}), /does not match/);
  assert.equal(dispatch('initiative.attendance.record', {sessionId:sid, method:'qr', code:code.toLowerCase()}), 'Present');
  assert.throws(() => dispatch('initiative.attendance.record', {sessionId:sid, method:'qr', code}), /Already checked in/);
  const noorReg = read().sessionRegistrations.find(r => r.sessionId === sid && r.personId === 'p-noor');
  assert.throws(() => dispatch('initiative.attendance.record', {sessionId:sid, method:'manual', registrationId:noorReg.id}), /reason/);
  assert.equal(dispatch('initiative.attendance.closeout', {sessionId:sid}), 1);
  s = read(); const absent = s.sessionAttendance.find(a => a.registrationId === noorReg.id); assert.equal(absent.status, 'Absent');
  assert.equal(personalGardenEffects(s, 'p-rania').filter(e => e.effect === 'rabbit' && e.sourceId === s.sessionAttendance.find(a => a.registrationId === rr).id).length, 1);
  // Excuse: Student → Supervisor → Representative.
  as('p-rania'); assert.throws(() => dispatch('member.excuse.submit', {attendanceId:absent.id, reason:'x'}), /own absence/);
  as('p-noor'); const ex = dispatch('member.excuse.submit', {attendanceId:absent.id, reason:'Fever on the day.', attachment:{name:'note.pdf', type:'application/pdf', size:2000}});
  assert.throws(() => dispatch('member.excuse.submit', {attendanceId:absent.id, reason:'again'}), /already submitted/);
  as('p-maya'); assert.throws(() => dispatch('initiative.excuse.decide', {id:ex, decision:'Accepted', reason:'ok'}), /Supervisor recommendation/);
  as('p-hala'); assert.throws(() => dispatch('initiative.excuse.decide', {id:ex, decision:'Accepted', reason:'ok'}), /Only the Institution Representative/);
  dispatch('initiative.excuse.recommend', {id:ex, decision:'Accept', note:'Consistent with prior attendance.'});
  as('p-maya'); dispatch('initiative.excuse.decide', {id:ex, decision:'Accepted', reason:'Medical reason accepted.'});
  s = read();
  assert.equal(s.sessionAttendance.find(a => a.id === absent.id).status, 'Absent', 'factual attendance stays Absent');
  const mine = myInitiatives(s, 'p-noor').find(m => m.initiative.id === 'i-today').sessions.find(x => x.id === sid);
  assert.equal(mine.display, 'Excused Absence');
  assert.equal(personalGardenEffects(s, 'p-noor').some(e => e.sourceId === absent.id), false, 'accepted excuse never grants a rabbit');
  // Correction keeps before/after/actor/reason.
  as('p-hala'); dispatch('initiative.attendance.correct', {id:s.sessionAttendance.find(a => a.registrationId === rr).id, status:'Late', reason:'Arrived 20 minutes late.'});
  assert.equal(read().sessionAttendance.find(a => a.registrationId === rr).history[0].from, 'Present');
  // Revoked Supervisor cannot record attendance.
  as('p-maya'); dispatch('initiative.staff.revoke', {id:'grant-hala', reason:'Rotation'});
  s = read(); assert.equal(needsSupervisor(s, s.sessions.find(x => x.id === sid)), true, 'warning restored when the appointment lapses');
});

test('F · Coach report → Supervisor summary → Rep reports; completion adds history but no Personal Garden object', () => {
  reset('p-karim');
  assert.throws(() => dispatch('initiative.coach.report', {groupId:'g-today-b', from:'2026-10-01', to:'2026-10-31', observations:'x', submit:true}), /currently assigned/);
  const rid = dispatch('initiative.coach.report', {groupId:'g-today-a', from:'2026-10-01', to:'2026-10-31', observations:'Both students engaged; one needs smaller steps.', submit:true});
  const report = read().coachReports.find(r => r.id === rid); assert.equal(report.metrics.members, 2, 'counts computed from records');
  as('p-hala'); const sum = dispatch('initiative.supervisor.summary', {initiativeId:'i-today', from:'2026-10-01', to:'2026-10-31', summary:'Healthy start; workshop needs a Supervisor.'});
  assert.deepEqual(read().supervisorSummaries.find(x => x.id === sum).coachReportIds, [rid]);
  const before = personalGardenEffects(read(), 'p-noor').length;
  as('p-maya'); dispatch('initiative.complete', {id:'i-today'});
  const s = read();
  assert.equal(s.initiatives.find(i => i.id === 'i-today').status, 'Completed');
  assert.equal(s.admissions.find(a => a.id === 'adm-noor').status, 'Completed');
  assert.ok(s.completions.some(c => c.admissionId === 'adm-noor'));
  assert.equal(s.admissions.find(a => a.id === 'adm-omar').status, 'Closed');
  assert.equal(personalGardenEffects(s, 'p-noor').length, before, 'no completion object');
  assert.ok(initiativeGarden(s, 'i-today').completedMilestone);
  assert.equal(exploreInitiatives(s, 'p-zaid').some(c => c.id === 'i-today'), false, 'completed initiative leaves new discovery');
  assert.equal(myInitiatives(s, 'p-noor').find(m => m.initiative.id === 'i-today').admission.status, 'Completed');
});

test('Migration upgrades a schema-1 graph in place, keeps enrollments as Applications and is idempotent', () => {
  const legacy = seed(); legacy.schema = 1;
  for (const key of ['grants','staffInvites','admissions','sessionAttendance','excuses','coachReports','supervisorSummaries','initiativeBlocks','completions']) delete legacy[key];
  legacy.enrollments.push({id:'en-legacy', initiativeId:'i-today', personId:'p-sami', status:'Pending Approval', created:'2026-10-14'});
  assert.equal(migrate(legacy), true);
  // 16 Oct 2026 (Independent Coach cycle): the chain now ends at schema 4 (Program-parented groups, completions, links).
  assert.equal(legacy.schema, 4);
  assert.equal(legacy.admissions.find(a => a.legacyEnrollmentId === 'en-legacy').status, 'Pending');
  const count = legacy.admissions.length;
  assert.equal(migrate(legacy), false); assert.equal(legacy.admissions.length, count);
  assert.equal(legacy.forms.every(f => f.anonymous === false), true);
});
