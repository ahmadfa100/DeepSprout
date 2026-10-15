/**
 * Non-destructive, idempotent upgrade of the operational browser graph.
 *
 * schema 1 → 2 adds the connected Institution records (grants, staff
 * invitations, Applications, Initiative groups, factual session attendance,
 * excuses and reports) without rewriting existing records. Existing
 * Initiative enrollments are converted into Applications that keep the old
 * ID as `legacyEnrollmentId`. Records are added only when their parents still
 * exist, so a person's edited or deleted demo data is never resurrected.
 */
import * as ops from './data/initiative-ops.js';

const COLLECTIONS = ['grants','staffInvites','admissions','sessionAttendance','excuses','coachReports','supervisorSummaries','initiativeBlocks','completions','notifications','rewards'];
const clone = value => JSON.parse(JSON.stringify(value));
const has = (list, key) => list.some(item => item.id === key);

export const DEFAULT_POLICIES = {
  admission:'Every application is reviewed once by the Representative or an active Supervisor.',
  waitlist:true, offerHours:24,
  discipline:'The Representative may suspend, remove or block participation with a recorded reason and notice.',
  attendance:'Factual attendance is recorded by an active Supervisor for each attendance-bearing session.',
  excuse:'Student explains a missed session → Supervisor recommends → Representative decides. Attendance stays factual.',
  makeup:'Not configured.',
  completion:'',
  privacy:'Staff see participation records for this initiative only. Personal Lab, Shield and Recovery data are never shared.',
  notifications:'Status changes appear in DeepSprout notifications. No email or SMS is sent in this demo.'
};

/** Fill fields the schema-2 Initiative contract expects, never overwriting a value. */
export function normalizeInitiative(i) {
  i.timezone ||= 'Asia/Amman';
  i.cost ||= {type:'Free',price:0,currency:'JOD'};
  i.policies = {...DEFAULT_POLICIES, completion:i.completion||'', ...(i.policies||{})};
  i.history ||= [];
  i.version ||= 1;
  i.operatingMode ||= 'structured';
  i.registrationState ||= 'Open';
  i.cover ||= {image:'',alt:''};
  i.components ||= [];
  i.teamIds ||= [];
  i.modes ||= ['Online'];
  i.primaryMode ||= i.modes.includes('Hybrid') ? 'Hybrid' : i.modes[0] || 'Online';
  if (i.status === 'Closed') { i.status = 'Published'; i.registrationState = 'Closed'; }
  return i;
}

export function migrate(s) {
  if (s.schema === ops.SCHEMA) { for (const key of COLLECTIONS) s[key] ||= []; s.clock ||= {offsetMs:0}; return false; }
  if (s.schema !== 1) return false;
  for (const key of COLLECTIONS) s[key] ||= [];
  s.clock ||= {offsetMs:0};
  s.settings ||= {};
  s.settings.initiativeOfferHours ??= 24;
  s.settings.enforceCheckInWindow ??= false;

  const person = key => s.people.find(p => p.id === key);
  for (const p of ops.people) {
    if (!person(p.id) && !s.people.some(x => x.email.toLowerCase() === p.email)) s.people.push(clone(p));
  }
  for (const key of ops.individualIds) { const p = person(key); if (p) p.individual = true; }

  const today = s.initiatives.find(i => i.id === 'i-today');
  if (today) for (const [key, value] of Object.entries(ops.startTodayPatch)) if (today[key] === undefined) today[key] = clone(value);
  s.initiatives.forEach(normalizeInitiative);
  const initiative = key => s.initiatives.find(i => i.id === key);

  for (const ss of ops.sessions) if (initiative(ss.initiativeId) && !has(s.sessions, ss.id)) s.sessions.push(clone(ss));
  for (const [key, patch] of Object.entries(ops.sessionPatches)) {
    const ss = s.sessions.find(x => x.id === key);
    if (ss) for (const [field, value] of Object.entries(patch)) if (ss[field] === undefined) ss[field] = clone(value);
  }
  s.sessions.forEach(ss => { ss.supervisorIds ||= []; ss.history ||= []; ss.attendanceRequired ??= Boolean(ss.initiativeId); ss.timezone ||= 'Asia/Amman'; });
  s.sessionRegistrations.forEach(r => { r.code ||= bookingCode(r.id); });

  const peopleExist = list => list.every(key => !key || person(key));
  for (const g of ops.groups) if (initiative(g.initiativeId) && !has(s.groups, g.id) && peopleExist([...g.memberIds, g.coachId])) s.groups.push(clone(g));
  for (const g of ops.grants) if (initiative(g.scopeId) && person(g.personId) && !has(s.grants, g.id)) s.grants.push(clone(g));
  for (const inv of ops.staffInvites) if (initiative(inv.initiativeId) && !has(s.staffInvites, inv.id)) s.staffInvites.push(clone(inv));
  for (const a of ops.assignments) if (s.groups.some(g => g.id === a.groupId) && !has(s.assignments, a.id)) s.assignments.push(clone(a));
  for (const r of ops.sessionRegistrations) if (s.sessions.some(x => x.id === r.sessionId) && person(r.personId) && !has(s.sessionRegistrations, r.id)) s.sessionRegistrations.push(clone(r));
  for (const a of ops.sessionAttendance) if (s.sessionRegistrations.some(r => r.id === a.registrationId) && !has(s.sessionAttendance, a.id)) s.sessionAttendance.push(clone(a));
  for (const a of ops.admissions) {
    if (!initiative(a.initiativeId) || !person(a.personId) || has(s.admissions, a.id)) continue;
    if (s.admissions.some(x => x.initiativeId === a.initiativeId && x.personId === a.personId)) continue;
    s.admissions.push(clone(a));
  }
  // Earlier enrollments become Applications; the original enrollment stays as history.
  for (const en of s.enrollments || []) {
    if (s.admissions.some(a => a.legacyEnrollmentId === en.id || (a.initiativeId === en.initiativeId && a.personId === en.personId))) continue;
    const status = en.status === 'Cancelled' ? 'Withdrawn' : en.status === 'Pending Approval' ? 'Pending' : 'Accepted';
    s.admissions.push({id:`adm-${en.id}`, code:displayCode('APP', en.id), initiativeId:en.initiativeId, personId:en.personId, status, answers:{}, consent:{text:'Recorded with the earlier enrollment', version:1, at:en.created}, mode:'', groupId:null, created:en.created, updated:en.created, legacyEnrollmentId:en.id, history:[{at:en.created, actorId:'system', from:null, to:status, reason:'Migrated from an earlier enrollment record'}]});
  }
  // D41: Phase-1 forms are identified. Earlier anonymous answers stay as labelled history.
  for (const f of s.forms) if (f.anonymous) { f.anonymous = false; f.legacyAnonymous = true; }
  s.schema = ops.SCHEMA;
  return true;
}

/** Stable, readable display codes derived from an opaque ID. */
export function displayCode(prefix, key) {
  let hash = 7;
  for (const char of String(key)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `${prefix}-${hash.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
}
export const bookingCode = key => displayCode('DS', key);
