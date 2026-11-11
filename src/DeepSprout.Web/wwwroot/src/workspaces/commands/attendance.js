/**
 * Attendance Management Center commands (browser-local demo).
 *
 * Valid evidence records attendance directly: a QR / booking-code scan, or a
 * matched row of an imported meeting report. People handle only exceptions:
 * reviews, reasoned manual exceptions, eligible roster additions and
 * corrections. Absent is written only by finalize, after the check-in window
 * has closed and only where the evidence source is known to be complete.
 *
 * Authority: the session's assigned Supervisor or the owning Institution's
 * Representative (see roleFor). Corrections reuse the existing Supervisor
 * correction commands so their completion side effects stay in one place.
 */
import {id, now, nowMs, requireThat, find, textRequired, notify, audit, institutionApproved, activityOwnerApproved} from '../domain.js';
import {bookingCode} from '../migrate.js';
import {confirmedInMode, modeCapacity, windowMessage} from '../initiative-rules.js';
import {sessionRef, roleFor, roster, windowOf, isLive, buildPreview, checkInOutcome, usesImport, usesQR, importsFor, openReviews, venueCodeValid, BOOKED} from '../attendance/model.js';
import {initiativeCommand} from './initiative.js';
import {outdoorCommand} from './outdoor.js';

const memberLink = 'src/pages/member/explore/explore.html#my-initiatives';
const ACTIVITY_METHOD = {'qr':'QR scan', 'venue-qr':'Venue QR', 'booking-code':'Booking code', 'manual-exception':'Manual check-in', 'report-import':'Report import', 'review-resolved':'Reviewed import', 'finalized':'Finalized · no check-in', 'finalized-report':'Finalized · not in the complete report'};
const personName = (s, pid) => s.people.find(p => p.id === pid)?.name || 'Participant';
const when = (s, at) => new Date(at).toLocaleString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Amman'});

function context(s, sessionId, actor, {needLive = true} = {}) {
  const ref = sessionRef(s, sessionId);
  requireThat(ref, 'This session no longer exists.');
  const role = roleFor(s, ref, actor);
  requireThat(role, 'Only the assigned Supervisor or the Institution Representative can manage attendance for this session.');
  requireThat(ref.kind === 'initiative' ? institutionApproved(s, ref.parent.ownerId) : activityOwnerApproved(s, ref.parent.ownerId), 'The Institution is not active.');
  if (needLive) requireThat(isLive(ref), ref.kind === 'initiative' ? 'Attendance is read only: this session or initiative is not active.' : 'Attendance is read only for a closed Outdoor Activity.');
  for (const key of ['attendanceImports', 'attendanceReviews', 'attendanceLog']) s[key] ||= [];
  return {ref, role};
}
function log(s, ref, actor, type, text, extra = {}) {
  s.attendanceLog.push({id:id('att-log'), sessionId:ref.ss.id, kind:ref.kind, type, actorId:actor, at:now(), text, ...extra});
}
function writeRecord(s, ref, entry, {status, method, reason = '', actor, evidence = null, importId = null}) {
  const extra = {...(evidence ? {evidence} : {}), ...(importId ? {importId} : {})};
  if (ref.kind === 'initiative') {
    const reg = find(s.sessionRegistrations, entry.registrationId);
    const rec = {id:id('att'), sessionId:ref.ss.id, registrationId:reg.id, initiativeId:ref.parent.id, personId:entry.personId, status, method, reason, actorId:actor, at:now(), history:[], ...extra};
    s.sessionAttendance.push(rec); reg.attendance = 'Recorded';
    return rec;
  }
  const booking = find(s.bookings, entry.bookingId);
  const rec = {id:id('attendance'), experienceId:ref.parent.id, bookingId:booking.id, sessionId:ref.ss.id, personId:entry.personId, status, method:ACTIVITY_METHOD[method] || method, gardenPolicyVersion:1, reason, actorId:actor, created:now(), history:[], ...extra};
  s.attendance.push(rec);
  if (status !== 'Absent' && booking.status !== 'Completed') booking.status = 'Checked In';
  return rec;
}
function closeReviewsFor(s, ref, personId, actor, note) {
  for (const rv of openReviews(s, ref.ss.id).filter(r => r.personId === personId || r.suggestedPersonId === personId)) { rv.status = 'Resolved'; rv.resolution = {decision:'Superseded', personId, reason:note, actorId:actor, at:now()}; }
}
function entryFor(s, ref, actor, personId) {
  const entry = roster(s, ref, actor).find(e => e.personId === personId);
  requireThat(entry, 'Choose a participant on this session’s roster.');
  return entry;
}
function correct(s, ref, record, status, reason, actor) {
  const action = ref.kind === 'initiative' ? 'initiative.attendance.correct' : 'supervisor.attendance.correct';
  requireThat(roleFor(s, ref, actor) === 'supervisor', 'Corrections are made by the assigned Supervisor, with a reason.');
  return (ref.kind === 'initiative' ? initiativeCommand : outdoorCommand)(s, action, {id:record.id, status, reason}, actor);
}

/** Write Absent only where it is proven; everything else stays Not Recorded or in review. */
export function finalizeAttendance(s, sessionId, actor, {inPersonCheckInRan = false, requireSupervisor = false} = {}) {
  const {ref, role} = context(s, sessionId, actor);
  if (requireSupervisor) requireThat(role === 'supervisor', 'Only the assigned active Supervisor can close attendance.');
  const w = windowOf(s, ref);
  requireThat(w.state === 'closed' || (w.policy.mode === 'anytime' && nowMs(s) > w.end), `Attendance can be finalized only after the check-in window closes (${windowMessage(w, ref.tz)}). Until then, missing check-ins stay Not Recorded.`);
  const complete = importsFor(s, ref.ss.id).some(x => x.complete);
  let absent = 0, left = 0;
  for (const e of roster(s, ref, actor).filter(x => !x.record && !x.review)) {
    const proven = e.mode === 'In-person' ? Boolean(inPersonCheckInRan) : complete;
    if (!proven) { left++; continue; }
    writeRecord(s, ref, e, {status:'Absent', method:e.mode === 'In-person' ? 'finalized' : 'finalized-report', reason:e.mode === 'In-person' ? 'Not checked in during the check-in window' : 'Not in the complete attendance report', actor});
    absent++;
    if (ref.kind === 'initiative') notify(s, e.personId, `You were recorded absent from ${ref.ss.title}. You can submit an excuse from My Initiatives.`, memberLink, 'attendance');
  }
  const review = openReviews(s, ref.ss.id).length, summary = `${absent} recorded Absent · ${left} left Not Recorded · ${review} in review`;
  if (ref.kind === 'initiative') { ref.ss.attendanceFinalized = {at:now(), actorId:actor, absent, notRecorded:left, review}; ref.ss.closedOut = true; (ref.ss.history ||= []).push({at:now(), actorId:actor, change:`Attendance finalized · ${summary}`}); }
  else (ref.ss.closedBy ||= []).push({actorId:actor, at:now(), absent, notRecorded:left});
  log(s, ref, actor, 'finalize', `Attendance finalized · ${summary}`, {inPersonCheckInRan:Boolean(inPersonCheckInRan), completeReport:complete});
  audit(s, actor, 'Attendance finalized', ref.ss.title, summary);
  return {absent, notRecorded:left, review};
}

export function attendanceCommand(s, action, p, actor) {
  // Earlier "close attendance" actions now follow the same evidence rule.
  if (action === 'initiative.attendance.closeout' || action === 'supervisor.attendance.closeout') return finalizeAttendance(s, p.sessionId, actor, {inPersonCheckInRan:true, requireSupervisor:true}).absent;
  if (!action.startsWith('attendance.')) return false;

  if (action === 'attendance.checkin') {
    const {ref} = context(s, p.sessionId, actor);
    requireThat(usesQR(ref.format), 'QR check-in is for in-person participation. Online attendance comes from the meeting report.');
    const w = windowOf(s, ref);
    requireThat(w.state === 'open', windowMessage(w, ref.tz));
    const [codePart, sessionPart] = textRequired(p.code, 'Booking code').trim().split('|');
    requireThat(!sessionPart || sessionPart === ref.ss.id, 'This QR code belongs to another session.');
    const code = codePart.toUpperCase().replace(/\s+/g, '');
    const entry = roster(s, ref, actor).find(e => String(e.code || '').toUpperCase() === code);
    if (!entry) {
      const known = ref.kind === 'initiative' ? s.sessionRegistrations.some(r => String(r.code).toUpperCase() === code) : s.bookings.some(b => String(b.credential || '').toUpperCase() === code);
      throw new Error(known ? 'This booking is not on this session’s confirmed roster.' : 'This code does not match any booking.');
    }
    requireThat(entry.mode === 'In-person', 'This participant registered to join online. Their attendance comes from the meeting report.');
    requireThat(!entry.record, entry.record?.status === 'Absent' ? 'This participant is already recorded Absent. Use a correction with a reason.' : `Already checked in (${entry.record?.status}). No duplicate attendance was recorded.`);
    const status = checkInOutcome(s, ref);
    writeRecord(s, ref, entry, {status, method:p.method === 'qr' ? 'qr' : 'booking-code', actor});
    closeReviewsFor(s, ref, entry.personId, actor, 'Checked in at the venue.');
    audit(s, actor, 'Attendance check-in', ref.ss.title, `${personName(s, entry.personId)} · ${status}`);
    return status;
  }

  if (action === 'attendance.screen.open') {
    const {ref} = context(s, p.sessionId, actor);
    requireThat(usesQR(ref.format), 'The check-in screen is for in-person participants. Online attendance comes from the meeting report.');
    if (!ref.ss.checkinScreen?.secret) {
      const bytes = new Uint8Array(16); globalThis.crypto.getRandomValues(bytes);
      ref.ss.checkinScreen = {secret:Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''), openedBy:actor, at:now()};
      log(s, ref, actor, 'screen', 'Check-in screen opened');
    }
    return true;
  }

  // The participant checks in from their own phone by scanning the venue screen.
  if (action === 'attendance.self.checkin') {
    const ref = sessionRef(s, p.sessionId);
    requireThat(ref, 'This session no longer exists.');
    requireThat(isLive(ref), 'Check-in is closed: this session is not active.');
    requireThat(ref.kind === 'initiative' ? institutionApproved(s, ref.parent.ownerId) : activityOwnerApproved(s, ref.parent.ownerId), 'The Institution is not active.');
    for (const key of ['attendanceImports', 'attendanceReviews', 'attendanceLog']) s[key] ||= [];
    const entry = roster(s, ref, null).find(e => e.personId === actor);
    requireThat(entry, 'You are not on the confirmed list for this session. Please speak to the Supervisor at the venue.');
    requireThat(entry.mode === 'In-person', 'You registered to join online. Your attendance comes from the meeting report.');
    if (entry.record) return {status:entry.record.status, at:entry.record.at || entry.record.created, already:true};
    const w = windowOf(s, ref);
    requireThat(w.state === 'open', windowMessage(w, ref.tz));
    requireThat(ref.ss.checkinScreen?.secret, 'The check-in screen for this session is not open yet.');
    requireThat(venueCodeValid(s, ref.ss, p.code), 'This code has expired. Scan the screen again; it changes every 20 seconds.');
    const status = checkInOutcome(s, ref);
    const rec = writeRecord(s, ref, entry, {status, method:'venue-qr', actor});
    closeReviewsFor(s, ref, actor, actor, 'Checked in at the venue.');
    log(s, ref, actor, 'record', `${personName(s, actor)} checked in at the venue · ${status}`);
    audit(s, actor, 'Attendance self check-in', ref.ss.title, status);
    return {status, at:rec.at || rec.created, already:false};
  }

  if (action === 'attendance.exception') {
    const {ref} = context(s, p.sessionId, actor);
    requireThat(windowOf(s, ref).state !== 'early', 'Exceptions can be recorded once check-in opens.');
    requireThat(['Present', 'Late'].includes(p.status), 'Choose Present or Late.');
    const entry = entryFor(s, ref, actor, p.personId), reason = textRequired(p.reason, 'Exception reason');
    requireThat(!entry.record, 'This participant already has an attendance record. Use a correction with a reason.');
    writeRecord(s, ref, entry, {status:p.status, method:'manual-exception', reason, actor});
    closeReviewsFor(s, ref, entry.personId, actor, `Manual exception: ${reason}`);
    audit(s, actor, 'Attendance manual exception', ref.ss.title, `${personName(s, entry.personId)} · ${p.status} · ${reason}`);
    return p.status;
  }

  if (action === 'attendance.correct') {
    const {ref} = context(s, p.sessionId, actor);
    const entry = entryFor(s, ref, actor, p.personId);
    requireThat(entry.record, 'There is no attendance record to correct yet.');
    requireThat(['Present', 'Late', 'Absent'].includes(p.status) && p.status !== entry.record.status, 'Choose a different attendance status.');
    const reason = textRequired(p.reason, 'Correction reason');
    correct(s, ref, entry.record, p.status, reason, actor);
    return p.status;
  }

  if (action === 'attendance.participant.add') {
    const {ref} = context(s, p.sessionId, actor);
    const person = s.people.find(x => x.id === p.personId);
    requireThat(person, 'Choose a participant.');
    const reason = textRequired(p.reason, 'Reason for adding this participant');
    requireThat(!roster(s, ref, actor).some(e => e.personId === person.id), `${person.name} is already on this session’s roster.`);
    const mode = ref.format === 'Hybrid' ? p.mode : ref.format;
    requireThat(['Online', 'In-person'].includes(mode), 'Choose how this participant will attend.');
    const mark = ['Present', 'Late'].includes(p.status) ? p.status : null;
    if (mark) requireThat(windowOf(s, ref).state !== 'early', 'Attendance can be marked once check-in opens. Add them now and mark them at the session.');
    if (ref.kind === 'initiative') {
      const admission = s.admissions.find(a => a.initiativeId === ref.parent.id && a.personId === person.id);
      requireThat(admission?.status === 'Accepted', `${person.name} is not an accepted participant of ${ref.parent.title}. Only admitted participants can be added.`);
      requireThat(confirmedInMode(s, ref.ss, mode) < modeCapacity(ref.ss, mode), `The ${mode === 'Online' ? 'online' : 'in-person'} places for this session are full.`);
      const reg = {id:id('session-registration'), sessionId:ref.ss.id, personId:person.id, mode, status:'Confirmed', attendance:'Not attended', completion:'Pending', created:now(), addedBy:actor, addedReason:reason, source:'staff-added'};
      reg.code = bookingCode(reg.id);
      s.sessionRegistrations.push(reg);
      notify(s, person.id, `${personName(s, actor)} added you to ${ref.ss.title} (${mode === 'Online' ? 'online' : 'in person'}).`, memberLink, 'session');
    } else {
      const booking = s.bookings.find(b => b.experienceId === ref.parent.id && b.personId === person.id && BOOKED.includes(b.status));
      requireThat(booking, `${person.name} has no confirmed booking for ${ref.parent.title}. Only booked participants can be added.`);
      (ref.ss.rosterAdditions ||= []).push({personId:person.id, mode, reason, actorId:actor, at:now()});
    }
    if (mark) writeRecord(s, ref, roster(s, ref, actor).find(e => e.personId === person.id), {status:mark, method:'manual-exception', reason:`Added at the session: ${reason}`, actor});
    log(s, ref, actor, 'roster-add', `${person.name} added to the roster (${mode}) · ${mark || 'attendance Not Recorded'}`, {reason, personId:person.id});
    audit(s, actor, 'Session roster addition', ref.ss.title, `${person.name} · ${reason}`);
    return person.id;
  }

  if (action === 'attendance.import.apply') {
    const {ref} = context(s, p.sessionId, actor);
    requireThat(usesImport(ref.format), 'Report import is for online participation. This session is in person only.');
    requireThat(windowOf(s, ref).started, 'Import the attendance report after the session has started.');
    const fingerprint = textRequired(p.fingerprint, 'File fingerprint');
    const prior = s.attendanceImports.find(x => x.sessionId === ref.ss.id && x.fingerprint === fingerprint);
    requireThat(!prior, prior && `This report was already imported on ${when(s, prior.at)} by ${personName(s, prior.actorId)}. No records were changed.`);
    requireThat(Array.isArray(p.records) && p.records.length, 'The report has no participant rows.');
    requireThat(p.records.length <= 5000, 'This report has more than 5,000 rows. Export only this session’s participants.');
    const num = v => v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
    const records = p.records.map(r => ({line:Number(r.line) || 0, name:String(r.name || '').slice(0, 200), email:String(r.email || '').trim().toLowerCase().slice(0, 254), joinedAt:num(r.joinedAt), leftAt:num(r.leftAt), minutes:num(r.minutes), role:String(r.role || '').slice(0, 60), guest:Boolean(r.guest)}));
    const preview = buildPreview(s, ref, records, actor);
    requireThat(!preview.errors.length, preview.errors[0]);
    const source = String(p.source || 'Meeting report').slice(0, 60), fileName = textRequired(p.fileName, 'File name').slice(0, 200);
    const imp = {id:id('att-import'), sessionId:ref.ss.id, kind:ref.kind, fileName, fileSize:Number(p.fileSize) || 0, fileKind:p.fileKind === 'xlsx' ? 'xlsx' : 'csv', fingerprint, source, complete:Boolean(p.complete), actorId:actor, at:now(), counts:preview.counts, recordIds:[], reviewIds:[]};
    const entries = roster(s, ref, actor);
    for (const row of preview.rows) {
      const evidence = {source, fileName, importId:imp.id, joinedAt:row.joinedAt, leftAt:row.leftAt, minutes:row.minutes == null ? null : Math.round(row.minutes), lines:row.lines};
      if (row.status === 'ready') imp.recordIds.push(writeRecord(s, ref, entries.find(e => e.personId === row.personId), {status:row.outcome, method:'report-import', reason:row.reason, actor, evidence, importId:imp.id}).id);
      else if (['review', 'conflict', 'unmatched'].includes(row.status)) {
        const rv = {id:id('att-review'), sessionId:ref.ss.id, kind:ref.kind, importId:imp.id, type:row.status, personId:row.matchType === 'email' ? row.personId : null, suggestedPersonId:row.matchType === 'name' ? row.personId : null, reportPersonId:row.reportPersonId || null, name:row.name, email:row.email, joinedAt:row.joinedAt, leftAt:row.leftAt, minutes:evidence.minutes, proposed:row.outcome, reason:row.reason, lines:row.lines, status:'Open', created:now()};
        s.attendanceReviews.push(rv); imp.reviewIds.push(rv.id);
      }
    }
    s.attendanceImports.push(imp);
    const c = preview.counts, summary = `${c.ready} recorded (${c.present} Present, ${c.late} Late) · ${imp.reviewIds.length} to review · ${c.duplicate} already recorded`;
    log(s, ref, actor, 'import', `${source} report imported · ${fileName}`, {importId:imp.id, summary, complete:imp.complete});
    audit(s, actor, 'Attendance report imported', ref.ss.title, `${fileName} · ${summary}`);
    return {importId:imp.id, recorded:imp.recordIds.length, reviews:imp.reviewIds.length, counts:c};
  }

  if (action === 'attendance.review.resolve') {
    s.attendanceReviews ||= [];
    const rv = find(s.attendanceReviews, p.id);
    requireThat(rv.status === 'Open', 'This item has already been resolved.');
    const {ref} = context(s, rv.sessionId, actor);
    requireThat(['Present', 'Late', 'Not Recorded'].includes(p.decision), 'Choose an outcome.');
    const reason = textRequired(p.reason, 'Review note');
    if (p.decision === 'Not Recorded') {
      rv.status = 'Dismissed'; rv.resolution = {decision:'Not Recorded', personId:null, reason, actorId:actor, at:now()};
      log(s, ref, actor, 'review', `Report row “${rv.name || rv.email}” kept as Not Recorded`, {reason, reviewId:rv.id});
      return 'Not Recorded';
    }
    const entry = entryFor(s, ref, actor, p.personId || rv.personId || rv.suggestedPersonId);
    if (entry.record) { if (entry.record.status !== p.decision) correct(s, ref, entry.record, p.decision, `Import review: ${reason}`, actor); }
    else writeRecord(s, ref, entry, {status:p.decision, method:'review-resolved', reason, actor, evidence:{source:'Reviewed report row', name:rv.name, email:rv.email, joinedAt:rv.joinedAt, leftAt:rv.leftAt, minutes:rv.minutes, importId:rv.importId, lines:rv.lines}, importId:rv.importId});
    rv.status = 'Resolved'; rv.resolution = {decision:p.decision, personId:entry.personId, reason, actorId:actor, at:now()};
    closeReviewsFor(s, ref, entry.personId, actor, 'Resolved with another report row.');
    log(s, ref, actor, 'review', `Report row “${rv.name || rv.email}” → ${personName(s, entry.personId)} · ${p.decision}`, {reason, reviewId:rv.id});
    audit(s, actor, 'Attendance review resolved', ref.ss.title, `${personName(s, entry.personId)} · ${p.decision} · ${reason}`);
    return p.decision;
  }

  if (action === 'attendance.finalize') return finalizeAttendance(s, p.sessionId, actor, {inPersonCheckInRan:Boolean(p.inPersonCheckInRan)});
  return false;
}
