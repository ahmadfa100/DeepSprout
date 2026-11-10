/**
 * Supervisor cycle + Institution priority gaps — command and read-model tests
 * (Node, in-memory store, operational clock pinned). Browser proof lives in
 * supervisor-browser.test.cjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {read, dispatch, workspaces} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {myInitiatives, personalGardenEffects} from '../../src/DeepSprout.Web/wwwroot/src/shared/selectors.js';
import {checkInWindow} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/initiative-rules.js';

const PIN = '2026-10-15T09:00:00+03:00';
const as = personId => dispatch('demo.signin', {personId});
const reset = personId => { dispatch('demo.reset'); dispatch('demo.clock', {at:PIN}); if (personId) as(personId); };
const at = iso => dispatch('demo.clock', {at:iso});
const err = fn => { try { fn(); return 'allowed'; } catch (e) { return e.message; } };

test('A1 · regular Individual answers an identified Initiative form; Representative sees the original response', () => {
  reset('p-noor');
  const entry = myInitiatives(read(), 'p-noor').find(m => m.initiative.id === 'i-today');
  const form = entry.forms.find(f => f.id === 'f-start'); assert.ok(form.canRespond);
  assert.match(err(() => dispatch('member.form.respond', {formId:'f-start', answers:{'q-start':'Not an option', 'q-confidence':'3'}})), /listed option/);
  assert.match(err(() => dispatch('member.form.respond', {formId:'f-start', answers:{'q-confidence':'3'}})), /Answer: What most often/);
  const rid = dispatch('member.form.respond', {formId:'f-start', answers:{'q-start':'Distractions', 'q-confidence':'4'}});
  const response = read().responses.find(r => r.id === rid);
  assert.equal(response.personId, 'p-noor', 'identified (D41)'); assert.equal(response.version, read().forms.find(f => f.id === 'f-start').version);
  assert.match(err(() => dispatch('member.form.respond', {formId:'f-start', answers:{'q-start':'Distractions', 'q-confidence':'4'}})), /already responded/);
  assert.equal(myInitiatives(read(), 'p-noor').find(m => m.initiative.id === 'i-today').forms[0].response.id, rid, 'shown back from the same record');
  as('p-omar'); assert.match(err(() => dispatch('member.form.respond', {formId:'f-start', answers:{'q-start':'Distractions', 'q-confidence':'2'}})), /accepted participants/, 'pending applicant cannot answer a survey');
  as('p-zaid'); assert.match(err(() => dispatch('member.form.respond', {formId:'f-start', answers:{'q-start':'Distractions', 'q-confidence':'2'}})), /accepted participants/);
});

test('A1 · Supervisor runs a live quiz; regular Individual joins and plays; results show in My Initiatives', () => {
  reset('p-hala');
  const id = dispatch('supervisor.quiz.save', {title:'Group check-in quiz', initiativeId:'i-today', startAt:'2026-10-15T10:00:00+03:00',
    questions:[{text:'First step?', options:['Plan it all', 'One small action'], answer:1, seconds:10}]});
  assert.equal(read().competitions.find(c => c.id === id).createdRole, 'Supervisor');
  assert.ok(read().notifications.some(n => n.recipientId === 'p-noor' && /Group check-in quiz/.test(n.text)), 'accepted participants are told');
  as('p-noor'); const eid = dispatch('member.quiz.join', {competitionId:id, consent:true});
  assert.match(err(() => dispatch('member.quiz.join', {competitionId:id, consent:true})), /already joined/);
  as('p-omar'); assert.match(err(() => dispatch('member.quiz.join', {competitionId:id, consent:true})), /accepted participants/);
  at('2026-10-15T10:00:11+03:00'); as('p-noor'); dispatch('member.quiz.answer', {competitionId:id, question:0, choice:1});
  at('2026-10-15T10:05:00+03:00');
  const c = myInitiatives(read(), 'p-noor').find(m => m.initiative.id === 'i-today').competitions.find(x => x.id === id);
  assert.equal(c.label, 'Finished'); assert.equal(c.myRank, 1); assert.equal(c.winner.name, 'Noor Khalil');
  as('p-rania'); assert.match(err(() => dispatch('member.quiz.join', {competitionId:id, consent:true})), /finished/);
  assert.equal(personalGardenEffects(read(), 'p-noor').some(e => e.sourceId === eid), false, 'playing never grows the Personal Garden');
});

function absentNoor() {
  reset('p-maya');
  const sid = dispatch('initiative.session.save', {initiativeId:'i-today', title:'Window test', speaker:'Maya', date:'2026-10-20', time:'16:00', endTime:'17:00', format:'In-person', venue:'Hall', address:'2 Demo Street, Amman', inPersonCapacity:10, supervisorIds:['p-hala']});
  dispatch('initiative.session.publish', {id:sid});
  as('p-noor'); dispatch('member.session.register', {sessionId:sid, mode:'Online', consent:true});
  as('p-rania'); const rr = dispatch('member.session.register', {sessionId:sid, mode:'In-person', consent:true});
  return {sid, code:read().sessionRegistrations.find(r => r.id === rr).code, rr};
}
test('A3 · check-in window: early, open, closed; manual exception and corrections stay possible', () => {
  const {sid, code} = absentNoor();
  as('p-hala');
  assert.match(err(() => dispatch('initiative.attendance.record', {sessionId:sid, method:'code', code})), /has not opened yet/);
  assert.match(err(() => dispatch('initiative.attendance.closeout', {sessionId:sid})), /after the check-in window closes/, 'no Absent before the window closes');
  at('2026-10-20T17:25:00+03:00'); assert.equal(checkInWindow(read(), read().sessions.find(x => x.id === sid)).state, 'open', 'still open 25 min after the end');
  at('2026-10-20T18:31:00+03:00');
  assert.match(err(() => dispatch('initiative.attendance.record', {sessionId:sid, method:'code', code})), /Check-in closed/);
  assert.equal(dispatch('initiative.attendance.record', {sessionId:sid, method:'manual', registrationId:read().sessionRegistrations.find(r => r.code === code).id, status:'Late', reason:'Signed the paper sheet; scanner offline.'}), 'Late');
  const id = read().sessionAttendance.find(a => a.sessionId === sid).id;
  dispatch('initiative.attendance.correct', {id, status:'Present', reason:'Arrived on time per sheet.'});
  assert.equal(read().sessionAttendance.find(a => a.id === id).history.length, 1);
  // Explicit "anytime" policy is a per-session choice.
  as('p-maya'); const any = dispatch('initiative.session.save', {initiativeId:'i-today', title:'Drop-in', speaker:'Maya', date:'2026-12-01', time:'10:00', endTime:'11:00', format:'Online', meeting:'https://meet.google.com/abc-defg-hij', onlineCapacity:5, checkInMode:'anytime', supervisorIds:['p-hala']});
  assert.equal(read().sessions.find(x => x.id === any).checkInPolicy.mode, 'anytime');
});

test('A2 · excuse attachments: type/size validation, restricted readers, revoked Supervisor denied, access logged', () => {
  const {sid} = absentNoor();
  at('2026-10-20T18:31:00+03:00'); as('p-hala'); dispatch('initiative.attendance.closeout', {sessionId:sid});
  const att = read().sessionAttendance.find(a => a.sessionId === sid && a.personId === 'p-noor');
  as('p-noor');
  assert.match(err(() => dispatch('member.excuse.submit', {attendanceId:att.id, reason:'Ill', attachment:{id:'att-x', name:'note.exe', type:'application/x-msdownload', size:100}})), /PDF, JPG or PNG/);
  assert.match(err(() => dispatch('member.excuse.submit', {attendanceId:att.id, reason:'Ill', attachment:{id:'att-x', name:'scan.png', type:'image/png', size:3 * 1024 * 1024}})), /smaller than 2 MB/);
  const ex = dispatch('member.excuse.submit', {attendanceId:att.id, reason:'Ill', attachment:{id:'att-ok', name:'note.pdf', type:'application/pdf', size:120000}});
  assert.equal(read().excuses.find(e => e.id === ex).attachment.storage, 'browser-indexeddb');
  for (const [pid, ok] of [['p-noor', true], ['p-hala', true], ['p-maya', true], ['p-karim', false], ['p-rania', false], ['p-sami', false]]) {
    as(pid); const r = err(() => dispatch('initiative.excuse.evidence', {id:ex}));
    assert.equal(r === 'allowed', ok, `${pid} evidence access`);
  }
  assert.equal(read().excuses.find(e => e.id === ex).evidenceLog.length, 3, 'each opening is logged');
  as('p-maya'); dispatch('initiative.staff.revoke', {id:'grant-hala', reason:'Rotation'});
  as('p-hala'); assert.match(err(() => dispatch('initiative.excuse.evidence', {id:ex})), /restricted/);
  assert.match(err(() => dispatch('initiative.excuse.recommend', {id:ex, decision:'Accept', note:'x'})), /active Supervisor/);
});

test('A4 · Supervisor Flag/Escalate; Representative resolves; builder session duty lands on the one session record', () => {
  reset('p-hala');
  dispatch('initiative.application.flag', {id:'adm-omar', note:'Age proof looks inconsistent — please decide.'});
  as('p-karim'); assert.match(err(() => dispatch('initiative.application.flag', {id:'adm-omar', note:'x'})), /active Supervisor/);
  assert.ok(read().notifications.some(n => n.recipientId === 'p-maya' && /flagged/.test(n.text)));
  as('p-maya'); dispatch('initiative.application.flag.resolve', {id:'adm-omar', note:'Checked with the student.'});
  assert.equal(read().admissions.find(a => a.id === 'adm-omar').flags[0].resolved, true);
  const iid = dispatch('organization.initiative.save', {title:'Duty demo', topic:'Study focus', objective:'o', summary:'s', start:'2026-10-20', end:'2026-11-30', audience:'Students', consent:'c', coverage:'Jordan', modes:['Online'], capacity:30, policies:{completion:'Attend'}, components:[{id:'c1', type:'Session', title:'Opening', date:'2026-10-21', time:'10:00', endTime:'11:00', format:'Online', capacity:10, supervisorIds:['p-hala','p-zaid']}]});
  const token = dispatch('initiative.staff.invite', {initiativeId:iid, role:'supervisor', email:'hala@demo.example'}); as('p-hala'); dispatch('initiative.staff.accept', {token});
  as('p-maya'); dispatch('organization.initiative.publish', {id:iid});
  const sessions = read().sessions.filter(x => x.initiativeId === iid);
  assert.equal(sessions.length, 1, 'no duplicate session'); assert.deepEqual(sessions[0].supervisorIds, ['p-hala'], 'only active Supervisors are kept');
});

test('B · Outdoor Activity Supervisor: email appointment → new account → accept → scoped attendance → evaluation → closing report → revoke', () => {
  reset('p-maya');
  const token = dispatch('activity.appoint', {experienceId:'e-reset', email:'field.lead@demo.example', sessionIds:['es-walk'], cohortPermission:false});
  // Wrong identity cannot accept.
  as('p-zaid'); assert.match(err(() => dispatch('auth.appointment.accept', {token})), /issued to field.lead@demo.example/);
  // Expired link grants nothing.
  at('2026-10-16T09:00:00+03:00'); dispatch('auth.logout'); dispatch('auth.account', {name:'Field Lead', email:'field.lead@demo.example', consent:true});
  assert.match(err(() => dispatch('auth.appointment.accept', {token})), /Verify your email/);
  dispatch('auth.otp', {email:'field.lead@demo.example'}); dispatch('auth.verify', {code:'246810'});
  const lead = read().session.personId;
  at('2026-10-23T09:00:00+03:00'); assert.match(err(() => dispatch('auth.appointment.accept', {token})), /expired/); at('2026-10-20T09:00:00+03:00');
  dispatch('auth.appointment.accept', {token});
  assert.ok(workspaces().includes('supervisor')); assert.equal(read().people.filter(p => p.email === 'field.lead@demo.example').length, 1);
  // Scope: only the assigned session; no Institution authority.
  at('2026-10-25T10:05:00+03:00'); assert.match(err(() => dispatch('supervisor.attendance', {sessionId:'es-circle', credential:'DS-NOOR-24'})), /accepted appointment/);
  assert.match(err(() => dispatch('initiative.application.approve', {id:'adm-omar'})), /Representative or an active Supervisor/);
  at('2026-10-24T08:00:00+03:00'); assert.match(err(() => dispatch('supervisor.attendance', {sessionId:'es-walk', credential:'DS-NOOR-24'})), /has not opened yet/);
  at('2026-10-24T09:05:00+03:00');
  assert.equal(dispatch('supervisor.attendance', {sessionId:'es-walk', method:'code', credential:'ds-noor-24'}), 'Present', 'QR/code is case-insensitive');
  assert.match(err(() => dispatch('supervisor.attendance', {sessionId:'es-walk', credential:'DS-NOOR-24'})), /Already checked in/);
  assert.match(err(() => dispatch('supervisor.attendance', {sessionId:'es-walk', method:'manual', personId:'p-omar', status:'Late'})), /reason/);
  assert.equal(dispatch('supervisor.attendance', {sessionId:'es-walk', method:'manual', personId:'p-omar', status:'Late', reason:'Ticket on a dead phone; ID checked.'}), 'Late');
  assert.match(err(() => dispatch('supervisor.attendance.closeout', {sessionId:'es-walk'})), /after the check-in window closes/);
  at('2026-10-24T11:31:00+03:00'); assert.equal(dispatch('supervisor.attendance.closeout', {sessionId:'es-walk'}), 0);
  const omar = read().attendance.find(a => a.sessionId === 'es-walk' && a.personId === 'p-omar');
  dispatch('supervisor.attendance.correct', {id:omar.id, status:'Absent', reason:'Left before the walk began.'});
  assert.equal(read().attendance.find(a => a.id === omar.id).history[0].from, 'Late');
  assert.match(err(() => dispatch('supervisor.evaluate', {sessionId:'es-walk', personId:'p-omar', status:'Completed', notes:'x'})), /Present or Late/);
  dispatch('supervisor.evaluate', {sessionId:'es-walk', personId:'p-noor', status:'Completed', notes:'Took part in the full walk.'});
  dispatch('supervisor.report.submit', {experienceId:'e-reset', summary:'Walk completed; one participant left early.', exceptions:'Omar left early.'});
  as('p-maya'); assert.ok(read().closingReports.some(r => r.supervisorId === lead), 'closing report visible to the owning Institution');
  // Camp completion needs every session completed; only then a birdhouse.
  assert.equal(personalGardenEffects(read(), 'p-noor').some(e => e.effect === 'birdhouse'), false);
  at('2026-10-25T10:05:00+03:00'); as('p-sami'); dispatch('supervisor.attendance', {sessionId:'es-circle', credential:'DS-NOOR-24'}); dispatch('supervisor.evaluate', {sessionId:'es-circle', personId:'p-noor', status:'Completed', notes:'Shared an intention.'}); as('p-maya');
  assert.equal(personalGardenEffects(read(), 'p-noor').filter(e => e.effect === 'birdhouse').length, 1, 'qualifying completion → one birdhouse');
  // Revocation stops operations; authored records stay.
  dispatch('activity.appointment.revoke', {id:read().appointments.find(a => a.personId === lead).id, reason:'Season ended'});
  as(lead); assert.match(err(() => dispatch('supervisor.attendance', {sessionId:'es-walk', personId:'p-omar', method:'manual', reason:'x'})), /accepted appointment|no active supervisor workspace/);
  assert.ok(read().attendance.some(a => a.actorId === lead), 'history remains attributed');
});

test('Supervisor extras · More-information loop, Coach allocation, staffing request, cohort-scoped Outdoor roster', async () => {
  const {sid} = absentNoor();
  at('2026-10-20T18:31:00+03:00'); as('p-hala'); dispatch('initiative.attendance.closeout', {sessionId:sid});
  const att = read().sessionAttendance.find(a => a.sessionId === sid && a.personId === 'p-noor');
  as('p-noor'); const ex = dispatch('member.excuse.submit', {attendanceId:att.id, reason:'Bus strike.'});
  as('p-hala'); dispatch('initiative.excuse.recommend', {id:ex, decision:'More information', note:'Which line were you waiting for?'});
  assert.equal(read().excuses.find(e => e.id === ex).status, 'Info Requested');
  assert.ok(read().notifications.some(n => n.recipientId === 'p-noor' && /more information/i.test(n.text)));
  as('p-rania'); assert.match(err(() => dispatch('member.excuse.respond', {id:ex, text:'x'})), /no open information request/);
  as('p-noor'); dispatch('member.excuse.respond', {id:ex, text:'Line 27 — the strike notice is on the city site.'});
  assert.equal(read().excuses.find(e => e.id === ex).status, 'Submitted');
  as('p-hala'); dispatch('initiative.excuse.recommend', {id:ex, decision:'Accept', note:'Confirmed by the city notice.'});
  as('p-maya'); dispatch('initiative.excuse.decide', {id:ex, decision:'Accepted', reason:'Transport strike.'});
  // Supervisor allocates an already-authorized Coach; an unauthorized one is refused.
  as('p-hala'); dispatch('initiative.group.coach', {groupId:'g-today-b', coachId:'p-karim'});
  assert.equal(read().groups.find(g => g.id === 'g-today-b').coachId, 'p-karim');
  assert.match(err(() => dispatch('initiative.group.coach', {groupId:'g-today-b', coachId:'p-yara'})), /accepted an invitation/);
  dispatch('initiative.staff.request', {initiativeId:'i-today', role:'coach', note:'Circle B needs a second Coach.'});
  assert.ok(read().notifications.some(n => n.recipientId === 'p-maya' && /second Coach/.test(n.text)));
  assert.match(err(() => dispatch('initiative.staff.invite', {initiativeId:'i-today', role:'coach', email:'x@demo.example'})), /Only the Institution Representative/, 'Supervisors cannot invite staff');
  // An Outdoor Activity Supervisor with an active activity group operates only on its members.
  const s = read(); s.cohorts.find(c => c.id === 'co-forest').memberIds = ['p-noor']; (await import('../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js')).snapshotForTests(s);
  at('2026-10-24T09:05:00+03:00'); as('p-sami');
  assert.match(err(() => dispatch('supervisor.attendance', {sessionId:'es-walk', personId:'p-omar', method:'manual', reason:'Seen at the start.'})), /outside your active cohorts/);
  assert.equal(dispatch('supervisor.attendance', {sessionId:'es-walk', personId:'p-noor', method:'manual', reason:'Signed the sheet.'}), 'Present');
});
