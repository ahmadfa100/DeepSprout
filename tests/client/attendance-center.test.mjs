/**
 * Attendance Management Center — command and read-model tests (Node,
 * in-memory store, demo clock pinned). Browser proof lives in
 * attendance-center-browser.test.cjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {read, dispatch, snapshotForTests} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {assignedSessions, sessionRef, roster, buildPreview, sessionSummary, roleFor, addCandidates} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/attendance/model.js';
import {parseCSV, extractRecords, readXlsx, fingerprint, fileKind, parseWhen, parseMinutes} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/attendance/report.js';
import {myInitiatives, personalGardenEffects} from '../../src/DeepSprout.Web/wwwroot/src/shared/selectors.js';
import {summary} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/pages/institution/common.js';
import {buildXlsx} from './helpers/xlsx-fixture.mjs';

const PIN = '2026-10-15T09:00:00+03:00';
const as = personId => dispatch('demo.signin', {personId});
const at = iso => dispatch('demo.clock', {at:iso});
const err = fn => { try { fn(); return 'allowed'; } catch (e) { return e.message; } };
const busy = () => { dispatch('demo.scenario', {name:'busy-initiative'}); at(PIN); as('p-maya'); };
const T = (time, date = '2026-10-20') => `${date}T${time}:00+03:00`;

function session(fields) {
  as('p-maya');
  const base = {initiativeId:'i-today', title:'Attendance test', speaker:'Maya Haddad', date:'2026-10-20', time:'18:00', endTime:'19:00', supervisorIds:['p-hala']};
  const format = fields.format || 'Online';
  const access = format === 'Online' ? {meeting:'https://zoom.us/j/123456789', onlineCapacity:20} : format === 'In-person' ? {venue:'Hall 2', address:'2 Demo Street, Amman', inPersonCapacity:20} : {meeting:'https://zoom.us/j/123456789', venue:'Hall 2', address:'2 Demo Street, Amman', onlineCapacity:20, inPersonCapacity:20};
  const sid = dispatch('initiative.session.save', {...base, ...access, ...fields, format});
  dispatch('initiative.session.publish', {id:sid});
  return sid;
}
function register(sid, people) {
  for (const [pid, mode] of people) { as(pid); dispatch('member.session.register', {sessionId:sid, mode, consent:true}); }
}
const ZOOM = (rows) => [
  ['Meeting ID', 'Topic', 'Start Time', 'End Time', 'User Email', 'Duration (Minutes)', 'Participants'],
  ['123 4567 8901', 'Attendance test', '10/20/2026 05:55:00 PM', '10/20/2026 07:02:00 PM', 'hala@demo.example', '67', String(rows.length)],
  [],
  ['Name (Original Name)', 'User Email', 'Join Time', 'Leave Time', 'Duration (Minutes)', 'Guest'],
  ...rows
];
const csv = rows => rows.map(r => r.map(v => /[",]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\r\n');
const records = rows => extractRecords(parseCSV(csv(ZOOM(rows))), 'Asia/Amman', '2026-10-20').records;
const ROWS = [
  ['Noor Khalil', 'noor@demo.example', '10/20/2026 05:58:00 PM', '10/20/2026 06:30:00 PM', '32', 'No'],
  ['Noor Khalil', 'noor@demo.example', '10/20/2026 06:33:00 PM', '10/20/2026 07:00:00 PM', '27', 'No'],
  ['Rania Yasin', 'rania@demo.example', '10/20/2026 06:15:00 PM', '10/20/2026 07:00:00 PM', '45', 'No'],
  ['Dana Qasem', 'dana@demo.example', '10/20/2026 06:05:00 PM', '10/20/2026 06:25:00 PM', '20', 'No'],
  ['Tariq (Tariq Nabil)', '', '10/20/2026 06:01:00 PM', '10/20/2026 06:59:00 PM', '58', 'Yes'],
  ['Phone guest', 'guest.caller@example.com', '10/20/2026 06:06:00 PM', '10/20/2026 06:50:00 PM', '44', 'Yes'],
  ['Hala Mansour', 'hala@demo.example', '10/20/2026 05:50:00 PM', '10/20/2026 07:02:00 PM', '72', 'No']
];
function onlineSession() {
  busy();
  const sid = session({format:'Online'});
  register(sid, [['p-noor', 'Online'], ['p-rania', 'Online'], ['p-dana', 'Online'], ['p-tariq', 'Online'], ['p-hiba', 'Online']]);
  at(T('19:10')); as('p-hala');
  return sid;
}
const importPayload = (sid, recs, fp, extra = {}) => ({sessionId:sid, fileName:'zoom-participants.csv', fileSize:2048, fileKind:'csv', fingerprint:fp, source:'Zoom', records:recs, ...extra});
const statusOf = (sid, pid) => roster(read(), sessionRef(read(), sid), 'p-hala').find(e => e.personId === pid)?.status;

test('Report parsing · Zoom CSV with a meeting summary, the same rows in .xlsx, dates, durations and file types', async () => {
  const rows = ZOOM(ROWS.slice(0, 3));
  const fromCsv = extractRecords(parseCSV('﻿' + csv(rows)), 'Asia/Amman', '2026-10-20');
  assert.equal(fromCsv.source, 'Zoom');
  assert.equal(fromCsv.records.length, 3, 'meeting summary rows are skipped');
  assert.equal(fromCsv.records[0].email, 'noor@demo.example');
  assert.equal(fromCsv.records[0].joinedAt, Date.parse('2026-10-20T17:58:00+03:00'), 'US Zoom time read in the session time zone');
  const xlsx = buildXlsx(rows), fromXlsx = extractRecords(await readXlsx(xlsx.buffer.slice(xlsx.byteOffset, xlsx.byteOffset + xlsx.byteLength)), 'Asia/Amman', '2026-10-20');
  assert.deepEqual(fromXlsx.records.map(r => [r.email, r.joinedAt, r.leftAt, r.minutes]), fromCsv.records.map(r => [r.email, r.joinedAt, r.leftAt, r.minutes]), '.xlsx and .csv read identically');
  assert.equal(parseWhen('20/10/2026 18:05', 'Asia/Amman', '2026-10-20'), Date.parse('2026-10-20T18:05:00+03:00'), 'day-first dates');
  assert.equal(parseWhen('18:05:30', 'Asia/Amman', '2026-10-20'), Date.parse('2026-10-20T18:05:30+03:00'), 'time-only values use the session date');
  assert.equal(parseMinutes('1 hr 5 min'), 65); assert.equal(parseMinutes('00:45:30'), 45.5); assert.equal(parseMinutes('3600', 'seconds'), 60);
  const meet = extractRecords(parseCSV('First name,Last name,Email,Duration,Time joined,Time exited\nNoor,Khalil,noor@demo.example,58 min,6:01 PM,6:59 PM'), 'Asia/Amman', '2026-10-20');
  assert.equal(meet.source, 'Google Meet'); assert.equal(meet.records[0].name, 'Noor Khalil'); assert.equal(meet.records[0].minutes, 58);
  assert.throws(() => extractRecords(parseCSV('Topic,Notes\nA,B'), 'Asia/Amman', '2026-10-20'), /No participant columns/);
  assert.throws(() => fileKind('report.xls'), /\.xlsx or \.csv/); assert.throws(() => fileKind('report.pdf'), /\.xlsx or \.csv/);
  assert.equal((await fingerprint(new TextEncoder().encode('a'))).length, 64, 'SHA-256 fingerprint');
});

test('1 · Overview lists only the Supervisor’s authorized, assigned sessions', () => {
  busy();
  const hala = assignedSessions(read(), 'p-hala').map(r => r.ss.id);
  assert.ok(hala.includes('s-kickoff') && hala.includes('s-intro'));
  assert.ok(!hala.some(id => id.startsWith('es-')), 'no Outdoor Activity sessions without an appointment');
  assert.deepEqual(assignedSessions(read(), 'p-sami').map(r => r.ss.id).sort(), ['es-circle', 'es-walk'], 'appointment sessions only');
  assert.deepEqual(assignedSessions(read(), 'p-karim'), [], 'a Coach has no attendance sessions');
  const unassigned = session({title:'No Supervisor', supervisorIds:[]});
  assert.ok(!assignedSessions(read(), 'p-hala').some(r => r.ss.id === unassigned), 'not assigned → not listed');
  assert.equal(roleFor(read(), sessionRef(read(), unassigned), 'p-maya'), 'representative', 'an unsupervised session stays manageable by the Representative');
  dispatch('initiative.staff.revoke', {id:'grant-hala', reason:'Rotation'});
  assert.deepEqual(assignedSessions(read(), 'p-hala'), [], 'revoked grant → nothing listed');
  as('p-hala'); assert.match(err(() => dispatch('attendance.finalize', {sessionId:'s-kickoff'})), /assigned Supervisor or the Institution Representative/);
});

test('2–5 · Online import: real preview, one confirmation, evidence-based outcomes, reviews kept, no duplicates', () => {
  const sid = onlineSession(), ref = sessionRef(read(), sid);
  const recs = records(ROWS);
  const pv = buildPreview(read(), ref, recs, 'p-hala');
  const by = name => pv.rows.find(r => r.name.startsWith(name));
  assert.equal(by('Noor').status, 'ready'); assert.equal(by('Noor').outcome, 'Present'); assert.equal(by('Noor').rowsMerged, 2); assert.equal(Math.round(by('Noor').minutes), 59, 'rejoin rows are merged, not double-counted');
  assert.equal(by('Rania').outcome, 'Late', 'joined 15 min after the start');
  assert.equal(by('Dana').status, 'review', 'partial attendance is reviewed, not Absent');
  assert.equal(by('Tariq').status, 'review'); assert.equal(by('Tariq').matchType, 'name');
  assert.equal(by('Phone').status, 'unmatched'); assert.equal(by('Hala').status, 'ignored');
  assert.deepEqual(pv.missing, ['p-hiba']);
  assert.ok(!read().people.some(p => p.email === 'guest.caller@example.com'), 'preview creates no identity');
  assert.equal(read().sessionAttendance.filter(a => a.sessionId === sid).length, 0, 'preview changes nothing');

  const res = dispatch('attendance.import.apply', importPayload(sid, recs, 'fp-1'));
  assert.equal(res.recorded, 2); assert.equal(res.reviews, 3);
  const s = read(), noor = s.sessionAttendance.find(a => a.sessionId === sid && a.personId === 'p-noor');
  assert.equal(noor.method, 'report-import'); assert.equal(noor.evidence.minutes, 59); assert.equal(noor.evidence.source, 'Zoom'); assert.equal(noor.actorId, 'p-hala');
  assert.equal(statusOf(sid, 'p-rania'), 'Late'); assert.equal(statusOf(sid, 'p-dana'), 'Needs Review'); assert.equal(statusOf(sid, 'p-tariq'), 'Needs Review'); assert.equal(statusOf(sid, 'p-hiba'), 'Not Recorded');
  assert.equal(s.attendanceImports.length, 1); assert.equal(s.attendanceImports[0].fingerprint, 'fp-1');
  assert.ok(s.audit.some(a => a.action === 'Attendance report imported'));

  assert.match(err(() => dispatch('attendance.import.apply', importPayload(sid, recs, 'fp-1'))), /already imported/, 'the same file twice is refused');
  const before = read().sessionAttendance.length, reviews = read().attendanceReviews.length;
  const again = dispatch('attendance.import.apply', importPayload(sid, recs, 'fp-2'));
  assert.equal(again.recorded, 0); assert.equal(again.reviews, 0);
  assert.equal(read().sessionAttendance.length, before, 're-exported report adds no attendance records');
  assert.equal(read().attendanceReviews.length, reviews, 'and no duplicate review items');
  assert.equal(new Set(read().sessionAttendance.filter(a => a.sessionId === sid).map(a => a.personId)).size, read().sessionAttendance.filter(a => a.sessionId === sid).length, 'one record per person');
});

test('Import guards · wrong date, before the session, in-person session, unauthorized actors', () => {
  const sid = onlineSession();
  const other = ROWS.map(r => r.map(v => String(v).replace('10/20/2026', '10/27/2026')));
  assert.match(err(() => dispatch('attendance.import.apply', importPayload(sid, records(other), 'fp-x'))), /not from this session/);
  as('p-karim'); assert.match(err(() => dispatch('attendance.import.apply', importPayload(sid, records(ROWS), 'fp-y'))), /assigned Supervisor or the Institution Representative/);
  as('p-maya'); assert.equal(dispatch('attendance.import.apply', importPayload(sid, records(ROWS), 'fp-rep')).recorded, 2, 'the Representative can import for any session of the Institution');
  const room = session({format:'In-person', date:'2026-10-22'}); at(T('18:30', '2026-10-22')); as('p-hala');
  assert.match(err(() => dispatch('attendance.import.apply', importPayload(room, records(ROWS), 'fp-z'))), /in person only/);
  const later = session({format:'Online', date:'2026-11-20'}); as('p-hala');
  assert.match(err(() => dispatch('attendance.import.apply', importPayload(later, records(ROWS), 'fp-w'))), /after the session has started/);
});

test('9 · Missing verification never becomes Absent on its own; a complete report and a closed window are required', () => {
  const sid = onlineSession();
  dispatch('attendance.import.apply', importPayload(sid, records(ROWS), 'fp-1'));
  assert.match(err(() => dispatch('attendance.finalize', {sessionId:sid})), /after the check-in window closes/, 'no closure while the window is open');
  at(T('19:31'));
  let res = dispatch('attendance.finalize', {sessionId:sid});
  assert.equal(res.absent, 0, 'partial report → nobody Absent'); assert.equal(statusOf(sid, 'p-hiba'), 'Not Recorded'); assert.equal(statusOf(sid, 'p-dana'), 'Needs Review');
  dispatch('attendance.import.apply', importPayload(sid, records(ROWS), 'fp-complete', {complete:true}));
  res = dispatch('attendance.finalize', {sessionId:sid});
  assert.equal(res.absent, 1); assert.equal(statusOf(sid, 'p-hiba'), 'Absent'); assert.equal(statusOf(sid, 'p-dana'), 'Needs Review', 'open reviews are never turned into Absent');
  assert.ok(read().notifications.some(n => n.recipientId === 'p-hiba' && /excuse/.test(n.text)));
  // 10 · Excuse: Student → Supervisor recommends → Representative decides; attendance stays Absent, no reward.
  const absent = read().sessionAttendance.find(a => a.sessionId === sid && a.personId === 'p-hiba');
  as('p-hiba'); const ex = dispatch('member.excuse.submit', {attendanceId:absent.id, reason:'Power cut in my area.'});
  as('p-hala'); assert.match(err(() => dispatch('initiative.excuse.decide', {id:ex, decision:'Accepted', reason:'ok'})), /Only the Institution Representative/);
  dispatch('initiative.excuse.recommend', {id:ex, decision:'Accept', note:'Area outage confirmed.'});
  as('p-maya'); dispatch('initiative.excuse.decide', {id:ex, decision:'Accepted', reason:'Outage.'});
  assert.equal(read().sessionAttendance.find(a => a.id === absent.id).status, 'Absent');
  assert.equal(personalGardenEffects(read(), 'p-hiba').some(e => e.sourceId === absent.id), false);
});

test('Reviews · link a name-only row with a note, dismiss a guest, reasons required, no double resolution', () => {
  const sid = onlineSession();
  dispatch('attendance.import.apply', importPayload(sid, records(ROWS), 'fp-1'));
  const open = read().attendanceReviews.filter(r => r.sessionId === sid);
  const tariq = open.find(r => r.suggestedPersonId === 'p-tariq'), guest = open.find(r => r.type === 'unmatched'), dana = open.find(r => r.personId === 'p-dana');
  assert.match(err(() => dispatch('attendance.review.resolve', {id:tariq.id, decision:'Present', personId:'p-tariq'})), /Review note/);
  assert.equal(dispatch('attendance.review.resolve', {id:tariq.id, decision:'Present', personId:'p-tariq', reason:'Camera name matches his registration.'}), 'Present');
  assert.equal(read().sessionAttendance.find(a => a.sessionId === sid && a.personId === 'p-tariq').method, 'review-resolved');
  assert.match(err(() => dispatch('attendance.review.resolve', {id:tariq.id, decision:'Late', personId:'p-tariq', reason:'x'})), /already been resolved/);
  dispatch('attendance.review.resolve', {id:guest.id, decision:'Not Recorded', reason:'Phone guest, not registered.'});
  assert.equal(read().attendanceReviews.find(r => r.id === guest.id).status, 'Dismissed');
  dispatch('attendance.review.resolve', {id:dana.id, decision:'Not Recorded', reason:'Left after 20 minutes.'});
  assert.equal(statusOf(sid, 'p-dana'), 'Not Recorded', 'dismissed partial row stays Not Recorded, not Absent');
  assert.ok(read().attendanceLog.filter(l => l.sessionId === sid && l.type === 'review').length >= 3, 'each resolution is in the audit trail');
});

test('6 · Add Participant respects admission, roster, capacity and permission; never marks Present', () => {
  busy();
  const sid = session({format:'In-person', date:'2026-10-22', inPersonCapacity:2});
  register(sid, [['p-rania', 'In-person']]);
  as('p-hala');
  const ref = sessionRef(read(), sid), cands = addCandidates(read(), ref, 'p-hala');
  assert.ok(cands.find(c => c.personId === 'p-noor').eligible); assert.equal(cands.find(c => c.personId === 'p-lama')?.eligible ?? false, false);
  assert.ok(!cands.some(c => c.personId === 'p-rania'), 'already on the roster');
  assert.match(err(() => dispatch('attendance.participant.add', {sessionId:sid, personId:'p-lama', reason:'Asked to join'})), /not an accepted participant/);
  assert.match(err(() => dispatch('attendance.participant.add', {sessionId:sid, personId:'p-noor'})), /Reason/);
  dispatch('attendance.participant.add', {sessionId:sid, personId:'p-noor', reason:'Registered by phone with the front desk.'});
  const reg = read().sessionRegistrations.find(r => r.sessionId === sid && r.personId === 'p-noor');
  assert.equal(reg.addedBy, 'p-hala'); assert.equal(reg.status, 'Confirmed'); assert.match(reg.code, /^DS-/);
  assert.equal(statusOf(sid, 'p-noor'), 'Not Recorded', 'added ≠ present');
  assert.equal(read().sessionAttendance.some(a => a.sessionId === sid && a.personId === 'p-noor'), false);
  assert.match(err(() => dispatch('attendance.participant.add', {sessionId:sid, personId:'p-noor', reason:'again'})), /already on this session/);
  assert.match(err(() => dispatch('attendance.participant.add', {sessionId:sid, personId:'p-dana', reason:'Extra seat'})), /places for this session are full/);
  as('p-karim'); assert.match(err(() => dispatch('attendance.participant.add', {sessionId:sid, personId:'p-dana', reason:'x'})), /assigned Supervisor or the Institution Representative/);
  assert.ok(read().notifications.some(n => n.recipientId === 'p-noor' && /added you/.test(n.text)));
});

test('7 · In-person QR check-in records automatically: window, Late rule, duplicates, wrong session, online participants', () => {
  busy();
  // Representatives create Online or In-person sessions; Hybrid comes from the seeded “Start with one small step”.
  const s0 = read(), intro = s0.sessions.find(x => x.id === 's-intro'), sid = 's-hybrid-test';
  s0.sessions.push({...structuredClone(intro), id:sid, title:'Hybrid test', date:'2026-10-22', time:'18:00', endTime:'19:00', supervisorIds:['p-hala'], status:'Published', registrationOpen:'', registrationClose:'', closedOut:false, history:[]});
  snapshotForTests(s0);
  register(sid, [['p-rania', 'In-person'], ['p-tariq', 'In-person'], ['p-noor', 'Online']]);
  const code = pid => read().sessionRegistrations.find(r => r.sessionId === sid && r.personId === pid).code;
  as('p-hala');
  assert.match(err(() => dispatch('attendance.checkin', {sessionId:sid, code:code('p-rania')})), /has not opened yet/);
  at(T('18:05', '2026-10-22'));
  assert.equal(dispatch('attendance.checkin', {sessionId:sid, code:code('p-rania').toLowerCase(), method:'qr'}), 'Present');
  assert.match(err(() => dispatch('attendance.checkin', {sessionId:sid, code:code('p-rania')})), /Already checked in/);
  assert.match(err(() => dispatch('attendance.checkin', {sessionId:sid, code:`${code('p-tariq')}|s-other`})), /another session/);
  assert.match(err(() => dispatch('attendance.checkin', {sessionId:sid, code:code('p-noor')})), /join online/);
  assert.match(err(() => dispatch('attendance.checkin', {sessionId:sid, code:'DS-NOPE-00'})), /does not match/);
  at(T('18:12', '2026-10-22'));
  assert.equal(dispatch('attendance.checkin', {sessionId:sid, code:code('p-tariq')}), 'Late', 'after the 10-minute grace period');
  assert.equal(read().sessionAttendance.find(a => a.sessionId === sid && a.personId === 'p-rania').method, 'qr');
  // 8 · Hybrid: report rows for in-person participants never create a second record.
  at(T('19:10', '2026-10-22'));
  const recs = records([
    ['Noor Khalil', 'noor@demo.example', '10/22/2026 05:59:00 PM', '10/22/2026 07:00:00 PM', '61', 'No'],
    ['Rania Yasin', 'rania@demo.example', '10/22/2026 06:00:00 PM', '10/22/2026 07:00:00 PM', '60', 'No']
  ]);
  const pv = buildPreview(read(), sessionRef(read(), sid), recs, 'p-hala');
  assert.equal(pv.rows.find(r => r.personId === 'p-noor').status, 'ready');
  assert.equal(pv.rows.find(r => r.personId === 'p-rania').status, 'duplicate', 'already checked in by QR');
  dispatch('attendance.import.apply', importPayload(sid, recs, 'fp-h'));
  const mine = read().sessionAttendance.filter(a => a.sessionId === sid);
  assert.equal(mine.length, 3); assert.equal(new Set(mine.map(a => a.personId)).size, 3, 'one record per participant across both modes');
  const m = sessionSummary(read(), sessionRef(read(), sid), 'p-hala');
  assert.deepEqual(m.entries.map(e => `${e.personId}:${e.mode}:${e.status}`).sort(), ['p-noor:Online:Present', 'p-rania:In-person:Present', 'p-tariq:In-person:Late']);
});

test('Manual exceptions and corrections need reasons and keep history', () => {
  busy();
  const sid = session({format:'In-person', date:'2026-10-22'});
  register(sid, [['p-rania', 'In-person'], ['p-noor', 'In-person']]);
  at(T('18:20', '2026-10-22')); as('p-hala');
  assert.match(err(() => dispatch('attendance.exception', {sessionId:sid, personId:'p-rania', status:'Present'})), /Exception reason/);
  assert.equal(dispatch('attendance.exception', {sessionId:sid, personId:'p-rania', status:'Late', reason:'Phone battery dead; ID checked at the door.'}), 'Late');
  assert.equal(read().sessionAttendance.find(a => a.sessionId === sid && a.personId === 'p-rania').method, 'manual-exception');
  dispatch('attendance.correct', {sessionId:sid, personId:'p-rania', status:'Present', reason:'Arrived on time per the paper sheet.'});
  const rec = read().sessionAttendance.find(a => a.sessionId === sid && a.personId === 'p-rania');
  assert.equal(rec.status, 'Present'); assert.equal(rec.history[0].from, 'Late'); assert.equal(rec.history[0].actorId, 'p-hala');
  at(T('19:31', '2026-10-22'));
  assert.equal(dispatch('attendance.finalize', {sessionId:sid}).absent, 0, 'unconfirmed check-in desk → Noor stays Not Recorded');
  assert.equal(statusOf(sid, 'p-noor'), 'Not Recorded');
  assert.equal(dispatch('attendance.finalize', {sessionId:sid, inPersonCheckInRan:true}).absent, 1);
  assert.equal(statusOf(sid, 'p-noor'), 'Absent');
  assert.ok(sessionSummary(read(), sessionRef(read(), sid), 'p-hala').completed, 'finalized with nothing open → Completed filter');
});

test('11 · Attendance reaches participant, Institution and reward views from the same records', () => {
  const sid = onlineSession();
  dispatch('attendance.import.apply', importPayload(sid, records(ROWS), 'fp-1'));
  const s = read(), mine = myInitiatives(s, 'p-noor').find(m => m.initiative.id === 'i-today').sessions.find(x => x.id === sid);
  assert.equal(mine.attendance.status, 'Present'); assert.equal(mine.attendance.method, 'report-import');
  assert.ok(summary(s, s.initiatives.find(i => i.id === 'i-today')).attendance.some(a => a.sessionId === sid && a.personId === 'p-rania' && a.status === 'Late'), 'Institution summary');
  assert.ok(personalGardenEffects(s, 'p-noor').some(e => e.sourceId === s.sessionAttendance.find(a => a.sessionId === sid && a.personId === 'p-noor').id), 'verified attendance earns its reward once');
  assert.equal(myInitiatives(s, 'p-dana').find(m => m.initiative.id === 'i-today').sessions.find(x => x.id === sid).attendance, null, 'a row in review shows nothing to the participant yet');
});

test('Outdoor Activity sessions use the same center: cohort scope, check-in, roster additions, finalize', () => {
  dispatch('demo.reset'); at(PIN); as('p-sami');
  const ref = () => sessionRef(read(), 'es-walk');
  assert.equal(ref().kind, 'activity'); assert.equal(ref().format, 'In-person');
  assert.deepEqual(roster(read(), ref(), 'p-sami').map(e => e.personId).sort(), ['p-noor', 'p-omar'], 'the Supervisor’s cohort');
  at('2026-10-24T09:05:00+03:00');
  assert.equal(dispatch('attendance.checkin', {sessionId:'es-walk', code:'ds-noor-24'}), 'Present');
  assert.match(err(() => dispatch('attendance.checkin', {sessionId:'es-walk', code:'DS-NOOR-24'})), /Already checked in/);
  assert.match(err(() => dispatch('attendance.participant.add', {sessionId:'es-walk', personId:'p-rania', reason:'Asked at the gate'})), /no confirmed booking/, 'waitlisted booking is not eligible');
  assert.equal(read().bookings.find(b => b.id === 'b-noor').status, 'Checked In');
  at('2026-10-24T11:31:00+03:00');
  assert.equal(dispatch('attendance.finalize', {sessionId:'es-walk'}).absent, 0, 'Omar stays Not Recorded without a confirmed desk');
  assert.equal(roster(read(), ref(), 'p-sami').find(e => e.personId === 'p-omar').status, 'Not Recorded');
  as('p-hala'); assert.match(err(() => dispatch('attendance.checkin', {sessionId:'es-walk', code:'DS-OMAR-24'})), /assigned Supervisor or the Institution Representative/);
});
