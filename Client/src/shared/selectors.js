/**
 * Read models over the one operational graph. Pure functions: they never
 * write, never copy a record into another store, and every value names the
 * original record it came from. Regular Individual pages, partner
 * workspaces and tests all read through these.
 */
import {initiativeForms,initiativeCompetitions,seatCap,seatsUsed,seatsLeft,registrationState,executionPhase,needsSupervisor,assignedActiveSupervisors,sessionRegistrationOpen,modeCapacity,confirmedInMode,practiceTypeOf,PRACTICE_TYPES,activeGrantsFor,today,queue} from '../workspaces/initiative-rules.js';
import {nowMs} from '../workspaces/domain.js';

const nameOf = (s, pid) => s.people.find(p => p.id === pid)?.name || 'Unknown participant';
const orgOf = (s, orgId) => s.organizations.find(o => o.id === orgId);
export const PUBLIC_STATES = ['Published'];

/* ------------------------------------------------------------ Explore */

export function initiativeCard(s, initiative, personId) {
  const org = orgOf(s, initiative.ownerId);
  const mine = personId ? latestApplication(s, initiative.id, personId) : null;
  const sessions = s.sessions.filter(ss => ss.initiativeId === initiative.id && ['Published','Cancelled'].includes(ss.status));
  const primary = initiative.primaryMode || initiative.modes?.[0] || 'Online';
  return {
    id:initiative.id, source:'live', kind:'initiative', kindLabel:'Initiative', version:initiative.version || 1,
    title:initiative.title, topic:initiative.topic, summary:initiative.summary || '', description:initiative.description || '', objective:initiative.objective || '',
    organizer:org?.name || 'Institution', organizerVerified:org?.status === 'Approved', organizerCity:org?.city || '',
    image:initiative.cover?.image || '', imageAlt:initiative.cover?.alt || '',
    start:initiative.start, end:initiative.end, timezone:initiative.timezone || 'Asia/Amman',
    mode:primary.toLowerCase(), modes:initiative.modes || [primary], venue:initiative.venue || '', onlineDetails:initiative.onlineDetails || '',
    coverage:initiative.coverage || '', country:initiative.country || '', audience:initiative.audience || '', requirements:initiative.requirements || '',
    minAge:initiative.minAge, maxAge:initiative.maxAge, consent:initiative.consent || '', withdrawal:initiative.withdrawal || '',
    capacity:seatCap(initiative), seatsUsed:seatsUsed(s, initiative.id), seatsLeft:seatsLeft(s, initiative), full:seatsLeft(s, initiative) === 0,
    waitlist:Boolean(initiative.policies?.waitlist), offerHours:Number(initiative.policies?.offerHours || 24),
    registration:registrationState(s, initiative), registrationOpen:initiative.registrationOpen || '', registrationClose:initiative.registrationClose || '',
    phase:executionPhase(s, initiative), status:initiative.status,
    cost:initiative.cost || {type:'Free'}, policies:initiative.policies || {},
    components:(initiative.components || []).map(c => ({type:c.type, title:c.title, description:c.description || '', resourceId:c.resourceId || null})),
    sessions:sessions.map(ss => ({id:ss.id, title:ss.title, date:ss.date, time:ss.time, endTime:ss.endTime, format:ss.format, venue:ss.venue, status:ss.status})),
    mine
  };
}
/** Published Initiatives for regular Explore. Drafts, suspended, cancelled and archived ones never appear. */
export function exploreInitiatives(s, personId) {
  return s.initiatives.filter(i => PUBLIC_STATES.includes(i.status)).map(i => initiativeCard(s, i, personId));
}

/* ------------------------------------------------------- Participation */

export function latestApplication(s, initiativeId, personId) {
  const list = (s.admissions || []).filter(a => a.initiativeId === initiativeId && a.personId === personId);
  const a = list.sort((x, y) => String(y.created).localeCompare(String(x.created)))[0];
  if (!a) return null;
  const position = a.status === 'Queued' ? queue(s, initiativeId).findIndex(x => x.id === a.id) + 1 : null;
  return {id:a.id, code:a.code, status:a.status, created:a.created, updated:a.updated, groupId:a.groupId, position, offer:a.offer || null, completion:a.completion || null, history:a.history || []};
}

/** Everything the Individual sees under My Initiatives, from the original records. */
export function myInitiatives(s, personId) {
  return (s.admissions || []).filter(a => a.personId === personId).sort((a, b) => String(b.created).localeCompare(String(a.created))).map(a => {
    const initiative = s.initiatives.find(i => i.id === a.initiativeId);
    if (!initiative) return null;
    const group = s.groups.find(g => g.id === a.groupId) || s.groups.find(g => g.parentType === 'initiative' && g.initiativeId === initiative.id && g.memberIds.includes(personId));
    const sessions = s.sessions.filter(ss => ss.initiativeId === initiative.id && ss.status !== 'Draft').map(ss => {
      const registration = s.sessionRegistrations.find(r => r.sessionId === ss.id && r.personId === personId && r.status === 'Confirmed') || s.sessionRegistrations.filter(r => r.sessionId === ss.id && r.personId === personId).at(-1) || null;
      const attendance = registration ? (s.sessionAttendance || []).find(x => x.registrationId === registration.id) || null : null;
      const excuse = attendance ? (s.excuses || []).find(e => e.attendanceId === attendance.id) || null : null;
      return {id:ss.id, title:ss.title, agenda:ss.agenda || '', date:ss.date, time:ss.time, endTime:ss.endTime, timezone:ss.timezone, format:ss.format, venue:ss.venue, meeting:ss.meeting, status:ss.status, cancelReason:ss.cancelReason || '',
        open:sessionRegistrationOpen(s, ss) && initiative.status === 'Published', seats:{online:Math.max(0, modeCapacity(ss, 'Online') - confirmedInMode(s, ss, 'Online')), inPerson:Math.max(0, modeCapacity(ss, 'In-person') - confirmedInMode(s, ss, 'In-person'))},
        registration:registration ? {id:registration.id, mode:registration.mode, status:registration.status, code:registration.code} : null,
        attendance:attendance ? {id:attendance.id, status:attendance.status, method:attendance.method, at:attendance.at} : null,
        excuse:excuse ? {id:excuse.id, status:excuse.status, reason:excuse.reason, attachment:excuse.attachment || null, recommendation:excuse.recommendation?.decision || null, recommendationNote:excuse.recommendation?.decision === 'More information' ? excuse.recommendation.note : '', decision:excuse.decision || null, created:excuse.created} : null,
        display:attendance ? (attendance.status === 'Absent' && excuse?.status === 'Accepted' ? 'Excused Absence' : attendance.status) : registration?.status === 'Confirmed' ? 'Registered' : 'Not registered'};
    });
    const tasks = assignedTasks(s, personId).filter(t => t.initiativeId === initiative.id);
    const day = today(s);
    const memberOk = ['Accepted','Completed'].includes(a.status);
    const forms = initiativeForms(s, initiative).filter(f => f.status !== 'Draft').map(f => {
      const response = (s.responses || []).filter(r => r.formId === f.id && r.personId === personId).pop() || null;
      const registration = /registration/i.test(f.purpose || '');
      const permitted = memberOk || (registration && ['Pending','Queued','Offered'].includes(a.status));
      return {id:f.id, title:f.title, purpose:f.purpose, version:f.version, status:f.status, questions:f.questions, permitted, canRespond:permitted && f.status === 'Published' && !response && ['Published','Completed'].includes(initiative.status), response:response ? {id:response.id, version:response.version, submitted:response.submitted, answers:response.answers} : null};
    });
    const competitions = initiativeCompetitions(s, initiative).filter(c => c.status !== 'Draft').map(c => {
      const entry = (s.entries || []).find(x => x.competitionId === c.id && x.personId === personId) || null;
      const windowOpen = (!c.open || day >= c.open) && (!c.deadline || day <= c.deadline);
      return {id:c.id, title:c.title, topic:c.topic, rules:c.rules, eligibility:c.eligibility, open:c.open, deadline:c.deadline, criteria:c.criteria || [], status:c.status, resultsPublished:Boolean(c.resultsPublished), windowOpen,
        canEnter:a.status === 'Accepted' && c.status === 'Published' && windowOpen && !entry && initiative.status === 'Published',
        entry:entry ? {id:entry.id, text:entry.text, status:entry.status, created:entry.created, scores:c.resultsPublished ? entry.scores : null, feedback:c.resultsPublished ? entry.feedback : null} : null};
    });
    return {admission:{id:a.id, code:a.code, status:a.status, created:a.created, history:a.history || [], offer:a.offer || null, completion:a.completion || null, position:a.status === 'Queued' ? queue(s, initiative.id).findIndex(x => x.id === a.id) + 1 : null},
      initiative:initiativeCard(s, initiative, personId), group:group ? {id:group.id, name:group.name, coach:group.coachId ? nameOf(s, group.coachId) : null} : null,
      sessions, tasks, forms, competitions, completion:(s.completions || []).find(c => c.admissionId === a.id) || null};
  }).filter(Boolean);
}

/* -------------------------------------------- Assigned tasks (one engine) */

export function assignedTasks(s, personId) {
  const groups = s.groups.filter(g => g.memberIds.includes(personId));
  return s.assignments.filter(a => groups.some(g => g.id === a.groupId) && (!a.studentId || a.studentId === personId) && a.status !== 'Cancelled').map(a => {
    const g = groups.find(x => x.id === a.groupId);
    const submission = s.submissions.find(x => x.assignmentId === a.id && x.studentId === personId) || null;
    const draft = s.taskDrafts?.[`${personId}:${a.id}`];
    const status = submission ? submission.status : draft ? 'In Progress' : 'Assigned';
    const initiative = g.parentType === 'initiative' ? s.initiatives.find(i => i.id === g.initiativeId) : null;
    const program = g.programId ? s.programs.find(p => p.id === g.programId) : null;
    const overdue = !['Approved','Rejected'].includes(status) && status !== 'Submitted' && a.due < today(s);
    return {id:a.id, title:a.title, activity:a.activity, practiceType:a.practiceType || practiceTypeOf(a.activity), instructions:a.instructions, evidence:a.evidence || '', start:a.start || '', due:a.due, required:a.required, review:a.review,
      status, overdue, groupId:g.id, groupName:g.name, coach:nameOf(s, g.parentType === 'initiative' ? g.coachId : a.ownerId), authorName:nameOf(s, a.ownerId),
      context:initiative ? {type:'initiative', id:initiative.id, title:initiative.title} : {type:'program', id:program?.id || g.id, title:program?.title || g.name},
      initiativeId:initiative?.id || null,
      submission:submission ? {id:submission.id, text:submission.text, status:submission.status, feedback:submission.feedback, submitted:submission.submitted, attempt:submission.attempt || 1, history:submission.history || []} : null,
      locked:initiative ? s.admissions.find(x => x.initiativeId === initiative.id && x.personId === personId)?.status !== 'Accepted' : false};
  }).sort((a, b) => String(a.due).localeCompare(String(b.due)));
}

/* -------------------------------------------------------------- Gardens */

/**
 * Personal Garden source effects from the operational graph (master §9.2).
 * Each source event yields at most one effect; registrations, accepted
 * excuses and Initiative/Program completion yield none.
 */
export function personalGardenEffects(s, personId) {
  const effects = [];
  for (const sub of s.submissions.filter(x => x.studentId === personId && x.status === 'Approved')) {
    const a = s.assignments.find(x => x.id === sub.assignmentId);
    const type = a?.practiceType || practiceTypeOf(a?.activity);
    if (!type) continue;
    effects.push({key:`submission:${sub.id}`, effect:'tree', type, sourceType:'reviewed-assignment', sourceId:sub.id, on:String(sub.reviewedAt || sub.submitted).slice(0, 10), title:a.title, detail:`Approved by ${nameOf(s, sub.reviewedBy || a.ownerId)}`});
  }
  for (const att of (s.sessionAttendance || []).filter(x => x.personId === personId && ['Present','Late'].includes(x.status))) {
    const ss = s.sessions.find(x => x.id === att.sessionId);
    effects.push({key:`attendance:${att.id}`, effect:'rabbit', sourceType:'session-attendance', sourceId:att.id, on:String(att.at).slice(0, 10), title:ss?.title || 'Session', detail:`${att.status} · ${att.method} · confirmed by ${nameOf(s, att.actorId)}`});
  }
  for (const b of (s.bookings || []).filter(x => x.personId === personId && x.status === 'Completed')) {
    const e = s.experiences.find(x => x.id === b.experienceId);
    if (e?.type !== 'Camp') continue;
    effects.push({key:`camp:${b.id}`, effect:'birdhouse', sourceType:'camp-completion', sourceId:b.id, on:String(b.completedAt || b.created).slice(0, 10), title:e.title, detail:'Provider-verified camp completion'});
  }
  const seen = new Set();
  return effects.filter(x => !seen.has(x.key) && seen.add(x.key)).sort((a, b) => a.on.localeCompare(b.on));
}

/** Configurable demo defaults; real thresholds are an open policy (master §26.2). */
export const GROUP_MILESTONES = [
  {at:1, title:'First root', note:'The first qualifying contribution.'},
  {at:5, title:'First leaves', note:'Five qualifying contributions.'},
  {at:15, title:'Young canopy', note:'Fifteen qualifying contributions.'},
  {at:35, title:'Shared shade', note:'Thirty-five qualifying contributions.'},
  {at:70, title:'Full grove', note:'Seventy qualifying contributions.'}
];
/** One Group Garden per Institution Initiative, aggregated across its internal groups. */
export function initiativeGarden(s, initiativeId) {
  const initiative = s.initiatives.find(i => i.id === initiativeId);
  if (!initiative) return null;
  const groups = s.groups.filter(g => g.parentType === 'initiative' && g.initiativeId === initiativeId);
  const contributions = [];
  for (const sub of s.submissions.filter(x => x.status === 'Approved')) {
    const a = s.assignments.find(x => x.id === sub.assignmentId);
    if (!a || !groups.some(g => g.id === a.groupId)) continue;
    contributions.push({key:`submission:${sub.id}`, kind:'Approved task', on:String(sub.reviewedAt || sub.submitted).slice(0, 10), group:groups.find(g => g.id === a.groupId)?.name});
  }
  for (const att of (s.sessionAttendance || []).filter(x => x.initiativeId === initiativeId && ['Present','Late'].includes(x.status))) contributions.push({key:`attendance:${att.id}`, kind:'Session attendance', on:String(att.at).slice(0, 10)});
  const completed = (s.completions || []).filter(c => c.initiativeId === initiativeId && c.status === 'Completed');
  const count = contributions.length;
  const reached = GROUP_MILESTONES.filter(m => count >= m.at);
  const next = GROUP_MILESTONES.find(m => count < m.at) || null;
  const contributors = new Set([...s.submissions.filter(x => x.status === 'Approved' && contributions.some(c => c.key === `submission:${x.id}`)).map(x => x.studentId), ...(s.sessionAttendance || []).filter(x => x.initiativeId === initiativeId && ['Present','Late'].includes(x.status)).map(x => x.personId)]).size;
  return {initiative:{id:initiative.id, title:initiative.title, status:initiative.status}, owner:orgOf(s, initiative.ownerId)?.name || '', groups:groups.map(g => ({id:g.id, name:g.name, members:g.memberIds.length})),
    count, contributors, stage:reached.length, reached, next, completedMilestone:initiative.status === 'Completed' ? {title:'Initiative completed', on:String(initiative.completedAt || '').slice(0, 10), completedStudents:completed.length} : null,
    byKind:{tasks:contributions.filter(c => c.kind === 'Approved task').length, attendance:contributions.filter(c => c.kind === 'Session attendance').length},
    recent:contributions.sort((a, b) => b.on.localeCompare(a.on)).slice(0, 8)};
}

/* ------------------------------------------------------- Staff & sessions */

export function sessionRoster(s, session) {
  return s.sessionRegistrations.filter(r => r.sessionId === session.id && r.status === 'Confirmed').map(r => {
    const attendance = (s.sessionAttendance || []).find(a => a.registrationId === r.id) || null;
    const excuse = attendance ? (s.excuses || []).find(e => e.attendanceId === attendance.id) || null : null;
    return {registration:r, person:{id:r.personId, name:nameOf(s, r.personId)}, attendance, excuse};
  });
}
export function sessionStatus(s, session) {
  return {needsSupervisor:needsSupervisor(s, session), supervisors:assignedActiveSupervisors(s, session).map(pid => ({id:pid, name:nameOf(s, pid)}))};
}
export function staffFor(s, initiativeId) {
  return {supervisors:activeGrantsFor(s, initiativeId, 'supervisor').map(g => ({...g, name:nameOf(s, g.personId)})), coaches:activeGrantsFor(s, initiativeId, 'coach').map(g => ({...g, name:nameOf(s, g.personId)})),
    invites:(s.staffInvites || []).filter(x => x.initiativeId === initiativeId).map(x => ({...x, effectiveStatus:x.status === 'Pending' && Date.parse(x.expires) <= nowMs(s) ? 'Expired' : x.status}))};
}
export {PRACTICE_TYPES, seatCap, seatsUsed, seatsLeft, registrationState, executionPhase, needsSupervisor};
