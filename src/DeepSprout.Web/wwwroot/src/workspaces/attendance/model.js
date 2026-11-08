/**
 * Attendance read model shared by commands (writes) and the Attendance
 * Center (reads), so a screen and a guard can never disagree.
 *
 * One adapter over the two stores the demo keeps today:
 *   Initiative sessions  → s.sessions / s.sessionRegistrations / s.sessionAttendance
 *   Outdoor Activities   → s.experienceSessions / s.bookings / s.attendance
 * The approved database has one session.Attendance table for both.
 *
 * Stored attendance facts stay Present / Late / Absent. "Needs Review" is an
 * open review item (s.attendanceReviews); "Not Recorded" is no record yet.
 * Missing evidence is never an absence by itself.
 */
import {checkInWindow, isActiveSupervisor, isRepresentative} from '../initiative-rules.js';
import {nowMs} from '../domain.js';

export const RULE_DEFAULTS = {lateAfterMinutes:10, minimumPercent:75};
export const BOOKED = ['Confirmed', 'Checked In', 'Completed'];
export const STATUSES = ['Present', 'Late', 'Absent', 'Needs Review', 'Not Recorded'];
const CLOSED_PARENT = ['Cancelled', 'Archived', 'Suspended'];

export const rulesFor = ss => ({...RULE_DEFAULTS, ...(ss?.attendanceRules || {})});
export const methodFor = format => format === 'Online' ? 'Report import' : format === 'Hybrid' ? 'QR check-in · report import' : 'QR check-in';
export const usesQR = format => format !== 'Online';
export const usesImport = format => format !== 'In-person';

/** Resolve a session id from either store. */
export function sessionRef(s, sessionId) {
  const ss = (s.sessions || []).find(x => x.id === sessionId);
  if (ss) { const parent = (s.initiatives || []).find(i => i.id === ss.initiativeId); return parent ? {kind:'initiative', ss, parent, tz:ss.timezone || parent.timezone || 'Asia/Amman', format:ss.format || 'Online'} : null; }
  const es = (s.experienceSessions || []).find(x => x.id === sessionId);
  if (!es) return null;
  const parent = (s.experiences || []).find(e => e.id === es.experienceId);
  return parent ? {kind:'activity', ss:es, parent, tz:es.timezone || parent.timezone || 'Asia/Amman', format:es.format || parent.format || 'In-person'} : null;
}
export const windowOf = (s, ref) => checkInWindow(s, ref.ss, ref.tz);
export const isLive = ref => ref.kind === 'initiative' ? ref.ss.status === 'Published' && !CLOSED_PARENT.includes(ref.parent.status) : ['Published', 'Active'].includes(ref.parent.status);

/** Who may run attendance for this session: its assigned Supervisor or the owning Institution's Representative. */
export function roleFor(s, ref, personId) {
  if (!ref || !personId) return null;
  if (ref.kind === 'initiative' && isActiveSupervisor(s, ref.parent.id, personId) && (ref.ss.supervisorIds || []).includes(personId)) return 'supervisor';
  if (ref.kind === 'activity' && (s.appointments || []).some(a => a.personId === personId && a.experienceId === ref.parent.id && a.status === 'Accepted' && a.sessionIds.includes(ref.ss.id))) return 'supervisor';
  if (isRepresentative(s, {ownerId:ref.parent.ownerId}, personId)) return 'representative';
  return null;
}

/** Sessions a Supervisor is assigned to, across Initiative grants and Outdoor Activity appointments. */
export function assignedSessions(s, personId) {
  const out = [];
  for (const ss of s.sessions || []) {
    if (ss.status !== 'Published' || !(ss.supervisorIds || []).includes(personId)) continue;
    const ref = sessionRef(s, ss.id);
    if (ref && !['Cancelled', 'Archived'].includes(ref.parent.status) && isActiveSupervisor(s, ref.parent.id, personId)) out.push(ref);
  }
  for (const a of (s.appointments || []).filter(x => x.personId === personId && x.status === 'Accepted')) {
    for (const sid of a.sessionIds) { const ref = sessionRef(s, sid); if (ref && !['Cancelled', 'Archived'].includes(ref.parent.status)) out.push(ref); }
  }
  return out;
}

/* ------------------------------------------------------------- roster */

const recordOf = (s, ref, entry) => ref.kind === 'initiative'
  ? (s.sessionAttendance || []).find(a => a.registrationId === entry.registrationId) || null
  : (s.attendance || []).find(a => a.sessionId === ref.ss.id && a.personId === entry.personId && a.status !== 'Corrected') || null;
export const openReviews = (s, sessionId) => (s.attendanceReviews || []).filter(r => r.sessionId === sessionId && r.status === 'Open');

/**
 * Confirmed participants of a session. Outdoor Activity rosters follow the
 * viewing Supervisor's active cohorts, plus anyone added to this session.
 */
export function roster(s, ref, viewerId) {
  const reviews = openReviews(s, ref.ss.id);
  const withState = entry => {
    const record = recordOf(s, ref, entry), review = reviews.find(r => r.personId === entry.personId || (!r.personId && r.suggestedPersonId === entry.personId)) || null;
    return {...entry, record, review, status:record ? record.status : review ? 'Needs Review' : 'Not Recorded'};
  };
  if (ref.kind === 'initiative') {
    return (s.sessionRegistrations || []).filter(r => r.sessionId === ref.ss.id && r.status === 'Confirmed').map(r => withState({key:r.id, registrationId:r.id, personId:r.personId, mode:ref.format === 'Hybrid' ? r.mode : ref.format, code:r.code, addedBy:r.addedBy || null, addedReason:r.addedReason || '', registeredAt:r.created}));
  }
  const added = ref.ss.rosterAdditions || [];
  const cohorts = (s.cohorts || []).filter(c => c.supervisorId === viewerId && c.experienceId === ref.parent.id && c.status === 'Active');
  return (s.bookings || []).filter(b => b.experienceId === ref.parent.id && BOOKED.includes(b.status) && (!cohorts.length || cohorts.some(c => c.memberIds.includes(b.personId)) || added.some(a => a.personId === b.personId))).map(b => {
    const add = added.find(a => a.personId === b.personId);
    const mode = ref.format === 'Hybrid' ? add?.mode || b.sessionModes?.[ref.ss.id] || b.mode || 'In-person' : ref.format;
    return withState({key:b.id, bookingId:b.id, personId:b.personId, mode, code:b.credential || '', addedBy:add?.actorId || null, addedReason:add?.reason || '', registeredAt:b.created});
  });
}

export function counts(entries) {
  const c = {total:entries.length, present:0, late:0, absent:0, review:0, notRecorded:0};
  for (const e of entries) {
    if (e.status === 'Present') c.present++; else if (e.status === 'Late') c.late++; else if (e.status === 'Absent') c.absent++; else if (e.status === 'Needs Review') c.review++; else c.notRecorded++;
  }
  c.verified = c.present + c.late;
  return c;
}

/**
 * People a Supervisor might add to this session, with the reason when they
 * cannot be added. Admission (Initiative) or a confirmed booking (Outdoor
 * Activity) is required; nobody is created or admitted here.
 */
export function addCandidates(s, ref, viewerId) {
  const onRoster = new Set(roster(s, ref, viewerId).map(e => e.personId)), person = pid => (s.people || []).find(p => p.id === pid);
  const out = [];
  if (ref.kind === 'initiative') {
    const why = {Pending:'Application not decided yet', Queued:'On the waiting list', Offered:'Seat offered, not yet accepted', Suspended:'Participation suspended'};
    for (const a of (s.admissions || []).filter(x => x.initiativeId === ref.parent.id)) {
      const p = person(a.personId);
      if (!p || onRoster.has(p.id) || !(a.status === 'Accepted' || why[a.status])) continue;
      out.push({personId:p.id, name:p.name, email:p.email, eligible:a.status === 'Accepted', why:a.status === 'Accepted' ? 'Accepted participant' : why[a.status]});
    }
  } else {
    for (const b of (s.bookings || []).filter(x => x.experienceId === ref.parent.id)) {
      const p = person(b.personId);
      if (!p || onRoster.has(p.id) || out.some(x => x.personId === p.id)) continue;
      out.push({personId:p.id, name:p.name, email:p.email, eligible:BOOKED.includes(b.status), why:BOOKED.includes(b.status) ? 'Confirmed booking' : `Booking ${String(b.status).toLowerCase()}`});
    }
  }
  return out.sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------ evidence */

const minutesBetween = (a, b) => Math.round((b - a) / 60000);
export function requiredMinutes(s, ref) {
  const w = windowOf(s, ref), scheduled = Math.max(1, minutesBetween(w.start, w.end)), rules = rulesFor(ref.ss);
  return {scheduled, required:Math.ceil(scheduled * rules.minimumPercent / 100), rules};
}
/** QR / code check-in: Late once the configured grace period after the start has passed. */
export function checkInOutcome(s, ref, atMs = nowMs(s)) {
  const w = windowOf(s, ref), late = rulesFor(ref.ss).lateAfterMinutes;
  return atMs > w.start + late * 60000 ? 'Late' : 'Present';
}
/** Report evidence → Present / Late, or Needs Review when it is not conclusive. Never Absent. */
export function reportOutcome(s, ref, {joinedAt, minutes}) {
  const w = windowOf(s, ref), {scheduled, required, rules} = requiredMinutes(s, ref);
  if (minutes == null) return {outcome:'Needs Review', reason:'The report has no attendance duration for this participant.'};
  const m = Math.round(minutes);
  if (m < required) return {outcome:'Needs Review', reason:`Attended ${m} min; ${required} of ${scheduled} min required (${rules.minimumPercent}%).`};
  if (joinedAt != null && joinedAt > w.start + rules.lateAfterMinutes * 60000) return {outcome:'Late', reason:`Joined ${minutesBetween(w.start, joinedAt)} min after the start · ${m} min attended.`};
  return {outcome:'Present', reason:`${m} min attended.`};
}

/** Merge a person's report rows: interval union when join/leave exist, otherwise the sum of durations. */
function mergeRows(rows) {
  const spans = rows.filter(r => r.joinedAt != null && r.leftAt != null && r.leftAt >= r.joinedAt).map(r => [r.joinedAt, r.leftAt]).sort((a, b) => a[0] - b[0]);
  let minutes = null;
  if (spans.length === rows.length && spans.length) {
    let total = 0, [cs, ce] = spans[0];
    for (const [a, b] of spans.slice(1)) { if (a <= ce) ce = Math.max(ce, b); else { total += ce - cs; [cs, ce] = [a, b]; } }
    minutes = (total + ce - cs) / 60000;
  } else if (rows.some(r => r.minutes != null)) minutes = rows.reduce((n, r) => n + (r.minutes || 0), 0);
  const joins = rows.map(r => r.joinedAt).filter(v => v != null), leaves = rows.map(r => r.leftAt).filter(v => v != null);
  return {minutes, joinedAt:joins.length ? Math.min(...joins) : null, leftAt:leaves.length ? Math.max(...leaves) : null};
}
export const normName = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9؀-ۿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const nameVariants = name => { const raw = String(name || ''), inner = raw.match(/\(([^)]+)\)/)?.[1]; return [...new Set([normName(raw.replace(/\([^)]*\)/g, '')), normName(inner), normName(raw)].filter(Boolean))]; };

/**
 * Report records → an import preview. Pure: the same function runs in the
 * browser preview and again inside the import command, so a forged preview
 * cannot change what is recorded. No participant identity is ever created.
 *
 * Row statuses: ready (will be recorded) · review (kept for a person to
 * decide) · conflict (disagrees with an existing record; kept for review) ·
 * duplicate (already recorded the same way) · unmatched (no roster match;
 * kept for review) · ignored (session staff).
 */
export function buildPreview(s, ref, records, viewerId) {
  const entries = roster(s, ref, viewerId), errors = [], warnings = [];
  const people = s.people || [], staff = new Set([...(ref.ss.supervisorIds || []), ...(s.organizations || []).filter(o => o.id === ref.parent.ownerId).flatMap(o => o.memberIds)]);
  const byEmail = new Map(people.map(p => [String(p.email || '').toLowerCase(), p]));
  const groups = new Map();
  for (const r of records) {
    const person = r.email ? byEmail.get(r.email) : null;
    const key = person ? `person:${person.id}` : r.email ? `email:${r.email}` : `name:${normName(r.name)}`;
    if (!groups.has(key)) groups.set(key, {key, person, rows:[]});
    groups.get(key).rows.push(r);
  }
  const w = windowOf(s, ref), stamps = records.flatMap(r => [r.joinedAt, r.leftAt]).filter(v => v != null);
  if (stamps.length && !stamps.some(t => t >= w.start - 6 * 3600000 && t <= w.end + 6 * 3600000)) {
    const day = new Date(Math.min(...stamps)).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric', timeZone:ref.tz});
    errors.push(`This report is from ${day}, not from this session (${new Date(w.start).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric', timeZone:ref.tz})}). Check that you exported the right meeting.`);
  }
  if (!stamps.length) warnings.push('The report has no join or leave times, so Late cannot be determined from it.');
  const rows = [];
  for (const g of groups.values()) {
    const merged = mergeRows(g.rows), first = g.rows[0], base = {key:g.key, lines:g.rows.map(r => r.line), name:first.name || g.person?.name || '', email:first.email || '', rowsMerged:g.rows.length, ...merged};
    const evidence = reportOutcome(s, ref, merged);
    let entry = g.person ? entries.find(e => e.personId === g.person.id) : null, matchType = entry ? 'email' : 'none';
    if (!entry && !first.email && !g.person) {
      const variants = g.rows.flatMap(r => nameVariants(r.name)), hits = entries.filter(e => variants.includes(normName(people.find(p => p.id === e.personId)?.name)));
      if (hits.length === 1) { entry = hits[0]; matchType = 'name'; }
    }
    const row = {...base, personId:entry?.personId || null, reportPersonId:g.person?.id || null, matchType, outcome:evidence.outcome, reason:evidence.reason};
    if (!entry) {
      const sameRow = rv => rv.type === 'unmatched' && (first.email ? rv.email === first.email : !rv.email && normName(rv.name) === normName(first.name));
      if (g.person && staff.has(g.person.id)) rows.push({...row, status:'ignored', reason:'Session staff · not a participant.'});
      else if (openReviews(s, ref.ss.id).some(sameRow)) rows.push({...row, status:'duplicate', reason:'Already waiting in review from an earlier import.'});
      else rows.push({...row, status:'unmatched', reason:g.person ? `${g.person.name} is not on this session's roster. Add them first if they are eligible.` : 'No registered participant matches this row.'});
      continue;
    }
    if (entry.record) {
      rows.push(entry.record.status === evidence.outcome || (['Present', 'Late'].includes(entry.record.status) && evidence.outcome === 'Needs Review')
        ? {...row, status:'duplicate', reason:`Already recorded ${entry.record.status} (${methodLabel(entry.record.method)}). No change.`}
        : {...row, status:'conflict', reason:`Recorded ${entry.record.status} (${methodLabel(entry.record.method)}); this report suggests ${evidence.outcome}. Kept for review.`});
      continue;
    }
    if (entry.review) { rows.push({...row, status:'duplicate', reason:'Already waiting in review from an earlier import.'}); continue; }
    if (matchType === 'name') { rows.push({...row, status:'review', reason:`Matched by name only to ${people.find(p => p.id === entry.personId)?.name}. Confirm before recording.`}); continue; }
    if (entry.mode === 'In-person') { rows.push({...row, status:'review', reason:'Registered to attend in person, but appears in the online report.'}); continue; }
    rows.push({...row, status:evidence.outcome === 'Needs Review' ? 'review' : 'ready'});
  }
  const reported = new Set(rows.map(r => r.personId).filter(Boolean));
  const missing = entries.filter(e => e.mode === 'Online' && !reported.has(e.personId) && !e.record).map(e => e.personId);
  if (rows.some(r => r.matchType === 'name')) warnings.push('Some rows have no email address and were matched by name only. They need your confirmation.');
  const order = {ready:0, review:1, conflict:2, unmatched:3, duplicate:4, ignored:5};
  rows.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  const tally = st => rows.filter(r => r.status === st).length;
  return {rows, errors, warnings, missing, counts:{rows:records.length, ready:tally('ready'), present:rows.filter(r => r.status === 'ready' && r.outcome === 'Present').length, late:rows.filter(r => r.status === 'ready' && r.outcome === 'Late').length, review:tally('review'), conflict:tally('conflict'), unmatched:tally('unmatched'), duplicate:tally('duplicate'), ignored:tally('ignored'), missing:missing.length}};
}

/* ------------------------------------------------------ session status */

const METHOD_LABELS = {
  'qr':'QR scan', 'booking-code':'Booking code', 'online-verified':'Online roster (earlier record)', 'manual-exception':'Manual exception', 'roster':'Marked absent (earlier record)',
  'close-out':'Not checked in at close', 'report-import':'Report import', 'review-resolved':'Reviewed import', 'finalized':'Finalized · no check-in', 'finalized-report':'Finalized · not in the complete report'
};
export const methodLabel = m => { const base = String(m || '').split(' ·')[0]; return METHOD_LABELS[base] ? METHOD_LABELS[base] + (String(m).includes('corrected') ? ' · corrected' : '') : String(m || 'Recorded'); };
export const importsFor = (s, sessionId) => (s.attendanceImports || []).filter(x => x.sessionId === sessionId).sort((a, b) => String(b.at).localeCompare(String(a.at)));
const finalizedOf = (ref, viewerId) => ref.kind === 'initiative' ? ref.ss.attendanceFinalized || (ref.ss.closedOut ? {at:null, legacy:true} : null) : (ref.ss.closedBy || []).find(x => x.actorId === viewerId) || null;
export function pendingExcuses(s, ref, role = 'supervisor') {
  if (ref.kind !== 'initiative') return [];
  return (s.excuses || []).filter(e => e.sessionId === ref.ss.id && (role === 'representative' ? e.status === 'Recommended' : e.status === 'Submitted'));
}

/** Everything the overview row and the details header show for one session. */
export function sessionSummary(s, ref, viewerId) {
  const entries = roster(s, ref, viewerId), c = counts(entries), w = windowOf(s, ref), imports = importsFor(s, ref.ss.id);
  const reviews = openReviews(s, ref.ss.id), excuses = pendingExcuses(s, ref, roleFor(s, ref, viewerId) || 'supervisor');
  const finalized = finalizedOf(ref, viewerId), clock = ms => new Date(ms).toLocaleString('en-GB', {timeZone:ref.tz, day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
  const parts = [];
  if (usesQR(ref.format)) {
    const inPerson = entries.filter(e => e.mode === 'In-person'), checked = inPerson.filter(e => e.record && e.record.status !== 'Absent').length;
    parts.push(!inPerson.length ? {label:'No in-person registrations', tone:'neutral'} : w.state === 'early' ? {label:`Check-in opens ${clock(w.opens)}`, tone:'neutral'} : w.state === 'open' ? {label:`Check-in open · ${checked}/${inPerson.length} checked in`, tone:'positive'} : {label:`Check-in closed · ${checked}/${inPerson.length} checked in`, tone:'neutral'});
  }
  if (usesImport(ref.format)) {
    parts.push(imports.length ? {label:`Report imported ${new Date(imports[0].at).toLocaleDateString('en-GB', {day:'numeric', month:'short', timeZone:ref.tz})}${imports[0].complete ? ' · complete' : ''}`, tone:'positive'}
      : !w.started ? {label:'Report after the session', tone:'neutral'}
      : entries.some(e => e.mode === 'Online' && !e.record) ? {label:'Awaiting attendance report', tone:'attention'} : {label:'Online attendance recorded', tone:'positive'});
  }
  const ended = w.state === 'closed', live = isLive(ref), exceptions = reviews.length + excuses.length;
  const awaitingReport = usesImport(ref.format) && !imports.length && entries.some(e => e.mode === 'Online' && !e.record);
  const completed = ended && (!live || (!exceptions && !awaitingReport && (Boolean(finalized) || c.notRecorded === 0)));
  const needsAttention = live && !completed && (w.started || exceptions > 0);
  return {ref, entries, counts:c, window:w, imports, reviews, excuses, exceptions, finalized, awaitingReport, sources:parts, method:methodFor(ref.format), completed, needsAttention, live, upcoming:w.state === 'early'};
}
