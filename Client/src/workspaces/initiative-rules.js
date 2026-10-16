/**
 * Pure Institution Initiative rules shared by commands (writes) and
 * selectors (reads), so a count on a screen and a guard in a command can
 * never disagree. Approved values: master §15.3 (135 accepted students and
 * three active Supervisors per Initiative). Offer expiry is the interim
 * configurable 24-hour default.
 */
import {nowMs,clockDay} from './domain.js';

export const MAX_SEATS = 135;
export const MAX_SUPERVISORS = 3;
export const SEATED = ['Accepted','Suspended'];
export const OPEN_APPLICATION = ['Pending','Queued','Offered'];
export const ACTIVE_PARTICIPATION = ['Pending','Queued','Offered','Accepted','Suspended'];
export const REAPPLY_BLOCKED = ['Pending','Queued','Offered','Accepted','Suspended','Completed','Blocked'];

export const seatCap = initiative => Math.min(MAX_SEATS, Math.max(1, Number(initiative?.capacity) || MAX_SEATS));
const liveOffer = (s, a) => a.status === 'Offered' && Date.parse(a.offer?.expires || 0) > nowMs(s);
export const seatsUsed = (s, initiativeId) => (s.admissions || []).filter(a => a.initiativeId === initiativeId && (SEATED.includes(a.status) || liveOffer(s, a))).length;
export const seatsLeft = (s, initiative) => Math.max(0, seatCap(initiative) - seatsUsed(s, initiative.id));
export const acceptedCount = (s, initiativeId) => (s.admissions || []).filter(a => a.initiativeId === initiativeId && a.status === 'Accepted').length;
export const queue = (s, initiativeId) => (s.admissions || []).filter(a => a.initiativeId === initiativeId && a.status === 'Queued').sort((a, b) => String(a.queuedAt || a.created).localeCompare(String(b.queuedAt || b.created)));

export const activeGrantsFor = (s, initiativeId, role) => (s.grants || []).filter(g => g.scopeId === initiativeId && g.status === 'Active' && (!role || g.role === role));
export const isActiveSupervisor = (s, initiativeId, personId) => activeGrantsFor(s, initiativeId, 'supervisor').some(g => g.personId === personId);
export const isActiveCoach = (s, initiativeId, personId) => activeGrantsFor(s, initiativeId, 'coach').some(g => g.personId === personId);
/** The Representative is the person whose approved Institution application owns the Initiative's institution. */
export const representativeOrg = (s, personId) => (s.organizations || []).find(o => o.status === 'Approved' && o.memberIds.includes(personId)
  && (s.applications || []).some(a => a.personId === personId && a.type === 'organization' && a.status === 'Approved'));
export const isRepresentative = (s, initiative, personId) => Boolean(initiative && representativeOrg(s, personId)?.id === initiative.ownerId);
export const representativesOf = (s, initiative) => (s.organizations || []).filter(o => o.id === initiative?.ownerId).flatMap(o => o.memberIds)
  .filter(pid => (s.applications || []).some(a => a.personId === pid && a.type === 'organization' && a.status === 'Approved'));

/** `Needs Supervisor`: an attendance-bearing, live session without an active assigned Supervisor. */
export const assignedActiveSupervisors = (s, session) => (session.supervisorIds || []).filter(pid => isActiveSupervisor(s, session.initiativeId, pid));
export const needsSupervisor = (s, session) => Boolean(session?.initiativeId && session.attendanceRequired !== false && ['Draft','Published'].includes(session.status) && !assignedActiveSupervisors(s, session).length);

export const today = s => clockDay(s);
/** Publication, registration availability and execution are three distinct facts. */
export function registrationState(s, initiative) {
  if (!initiative) return 'Unavailable';
  if (initiative.status !== 'Published') return initiative.status === 'Draft' ? 'Not published' : 'Closed';
  if (initiative.registrationState === 'Closed') return 'Closed';
  const day = today(s);
  if (initiative.registrationOpen && day < initiative.registrationOpen) return 'Opens soon';
  if (initiative.registrationClose && day > initiative.registrationClose) return 'Closed';
  return 'Open';
}
export function executionPhase(s, initiative) {
  const day = today(s);
  if (initiative.status === 'Completed') return 'Completed';
  if (['Cancelled','Archived','Suspended'].includes(initiative.status)) return initiative.status;
  if (initiative.start && day < initiative.start) return 'Upcoming';
  if (initiative.end && day > initiative.end) return 'Ended';
  return 'Running';
}
export function sessionRegistrationOpen(s, session) {
  if (session.status !== 'Published') return false;
  const day = today(s);
  if (session.registrationOpen && day < session.registrationOpen) return false;
  if (session.registrationClose && day > session.registrationClose) return false;
  return true;
}
export const modeCapacity = (session, mode) => mode === 'Online' ? Number(session.onlineCapacity || session.capacity || 0) : Number(session.inPersonCapacity || session.capacity || 0);
export const confirmedInMode = (s, session, mode) => (s.sessionRegistrations || []).filter(r => r.sessionId === session.id && r.mode === mode && r.status === 'Confirmed').length;

/** Activity catalogue title → Personal Garden practice-type tree (master §9.1). */
export const PRACTICE_TYPES = [
  {id:'depth', title:'Depth Practice', match:/depth/i},
  {id:'listening', title:'Listening & Recall', match:/listening/i},
  {id:'practical', title:'Practical Micro-Challenge', match:/practical|micro/i},
  {id:'protected-work', title:'Protected Work', match:/protected/i}
];
export const practiceTypeOf = activity => PRACTICE_TYPES.find(t => t.match.test(String(activity || '')))?.id || null;

/* ------------------------------------------------- check-in window policy
 * One explicit, configurable policy for every attendance-bearing session
 * (Institution sessions and Provider experience sessions). Default: check-in
 * opens 30 minutes before the start and closes 30 minutes after the end.
 * `mode:'anytime'` is an explicit per-session choice, never a silent default.
 */
export const TZ_OFFSET = {'Asia/Amman':'+03:00', 'Asia/Riyadh':'+03:00', 'Asia/Dubai':'+04:00', 'Europe/London':'+01:00', 'UTC':'+00:00'};
export const DEFAULT_CHECKIN = {mode:'window', before:30, after:30};
const at = (date, time, tz) => Date.parse(`${date}T${time || '00:00'}:00${TZ_OFFSET[tz] || '+03:00'}`);
export function checkInWindow(s, session, timezone) {
  const policy = {...DEFAULT_CHECKIN, ...(session.checkInPolicy || {})};
  const tz = session.timezone || timezone || 'Asia/Amman';
  const start = at(session.date, session.time, tz), end = at(session.date, session.endTime || session.time, tz);
  const opens = start - Number(policy.before) * 60000, closes = end + Number(policy.after) * 60000, t = nowMs(s);
  const state = policy.mode === 'anytime' ? 'open' : t < opens ? 'early' : t > closes ? 'closed' : 'open';
  return {state, policy, start, end, opens, closes, started:t >= start};
}
const clock = ms => new Date(ms).toLocaleString('en-GB', {timeZone:'Asia/Amman', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
export function windowMessage(w) {
  if (w.policy.mode === 'anytime') return 'Check-in is open at any time for this session (explicit session policy).';
  if (w.state === 'early') return `Check-in has not opened yet. It opens ${clock(w.opens)} (${w.policy.before} min before the start).`;
  if (w.state === 'closed') return `Check-in closed ${clock(w.closes)} (${w.policy.after} min after the end). Use a reasoned manual exception or a correction.`;
  return `Check-in open until ${clock(w.closes)}.`;
}
/** Throws an understandable error unless the method is allowed in the current window state. */
export function assertWindow(s, session, method, timezone) {
  const w = checkInWindow(s, session, timezone);
  if (w.state === 'early') throw new Error(windowMessage(w));
  if (w.state === 'closed' && !['manual','manual-exception','absent','roster'].includes(method)) throw new Error(windowMessage(w));
  return w;
}

/* --------------------------------------------- forms & competitions links */
export const initiativeOfResource = (s, resourceId, initiativeId) => (s.initiatives || []).find(i => i.id === initiativeId || (i.components || []).some(c => c.resourceId === resourceId));
export const initiativeForms = (s, initiative) => (s.forms || []).filter(f => f.initiativeId === initiative.id || (initiative.components || []).some(c => c.resourceId === f.id));
export const initiativeCompetitions = (s, initiative) => (s.competitions || []).filter(c => c.initiativeId === initiative.id || (initiative.components || []).some(x => x.resourceId === c.id));

/* ----------------------------------------------- restricted attachments */
/** Excuse evidence: the student, the Representative and active Supervisors of that Initiative only. */
export function canViewExcuseEvidence(s, excuse, personId) {
  const initiative = (s.initiatives || []).find(i => i.id === excuse.initiativeId);
  return excuse.personId === personId || isRepresentative(s, initiative, personId) || isActiveSupervisor(s, excuse.initiativeId, personId);
}
export const ATTACHMENT_RULES = {types:['application/pdf','image/jpeg','image/png'], extensions:['pdf','jpg','jpeg','png'], maxBytes:2 * 1024 * 1024};
