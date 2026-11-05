/**
 * Independent Coach rules (master §§13–14). Pure functions over the one
 * operational graph: authority, Program ↔ Group parentage, invitation
 * states, completion eligibility, the bounded per-group Group Garden and
 * source-computed metrics. Commands and pages both read these, so a screen
 * never disagrees with the command that guards it.
 *
 * Two Coach contexts never merge:
 *  - Independent Coach: Platform Admin approved `mentor` application; owns
 *    invite-only Programs and their Groups.
 *  - Institution-invited Coach: an active Initiative grant; teaches only the
 *    Initiative groups allocated to them (see initiative-rules.js).
 */
import {nowMs, clockDay, requireThat} from './domain.js';
import {practiceTypeOf} from './initiative-rules.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = value => EMAIL.test(String(value || ''));

/* ------------------------------------------------------------ authority */

/** The person's independent Coach application, preferring an approved one. */
export function coachApplication(s, personId) {
  const apps = (s.applications || []).filter(a => a.personId === personId && a.type === 'mentor');
  return apps.find(a => a.status === 'Approved') || apps.slice().sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')))[0] || null;
}
/** Approved | Submitted | Pending Verification | Needs More Info | Rejected | Suspended | Draft | None */
export function independentStatus(s, personId) {
  const person = s.people.find(p => p.id === personId);
  if (!person) return 'None';
  if (person.status !== 'Active') return 'Suspended';
  return coachApplication(s, personId)?.status || 'None';
}
export const isIndependentCoach = (s, personId) => independentStatus(s, personId) === 'Approved';
export const INDEPENDENT_REQUIRED = 'Independent Coach approval is required to manage your own Programs, Groups and invitations. Teaching an Institution Initiative you were invited to is not affected.';
export function requireIndependentCoach(s, personId) { requireThat(isIndependentCoach(s, personId), INDEPENDENT_REQUIRED); }

/* ------------------------------------------------------ programs, groups */

export const PROGRAM_STATUSES = ['Draft', 'Published', 'Paused', 'Completed', 'Cancelled', 'Archived'];
/** Statuses in which groups may be created under the Program. */
export const PROGRAM_BUILDABLE = ['Draft', 'Published', 'Paused'];
/** Statuses in which the Program has ended; no new work, joins or submissions. */
export const PROGRAM_ENDED = ['Completed', 'Cancelled', 'Archived'];
export const DEFAULT_COMPLETION = {rule:'all-required', percent:100};
export const COMPLETION_RULES = [['all-required', 'Every required task approved'], ['percent-required', 'A share of required tasks approved']];
export const DEFAULT_CONSENT = 'I accept this private invitation and agree that my Coach can see the work I submit for this Program. My personal Lab, Shield and Recovery data stay private.';

export const isProgramGroup = g => Boolean(g) && g.parentType !== 'initiative';
export const programOf = (s, g) => isProgramGroup(g) && g.programId ? s.programs.find(p => p.id === g.programId) || null : null;
export const programGroups = (s, pr) => s.groups.filter(g => isProgramGroup(g) && g.programId === pr.id);
/** Keep the historical `program.groupIds` mirror equal to the groups' own parent link. */
export function syncProgramGroups(s) {
  for (const pr of s.programs) pr.groupIds = programGroups(s, pr).map(g => g.id);
}
/** Defaults for fields added by the Independent Coach cycle; never overwrites a value. */
export function normalizeProgram(pr) {
  if (pr.status === 'Active') pr.status = 'Published';
  pr.audience ??= '';
  pr.eligibility ??= '';
  pr.consentPolicy ||= DEFAULT_CONSENT;
  pr.invitationPolicy ||= {expiryDays:14};
  pr.completion ||= {...DEFAULT_COMPLETION};
  if (!pr.review || pr.review === 'Mentor review') pr.review = 'Coach review';
  pr.history ||= [];
  pr.stages ||= [];
  pr.activities ||= [];
  pr.version ||= 1;
  return pr;
}
export function completionPolicyText(pr) {
  const c = pr.completion || DEFAULT_COMPLETION;
  return c.rule === 'percent-required' ? `At least ${c.percent}% of required tasks approved` : 'Every required task approved';
}

/* ---------------------------------------------------------- invitations */

/** Effective status: Active | Accepted | Declined | Revoked | Replaced | Expired | Exhausted */
export function invitationStatus(s, inv) {
  if (['Revoked', 'Replaced', 'Declined', 'Accepted'].includes(inv.status)) return inv.status;
  if (Date.parse(inv.expires) < nowMs(s)) return 'Expired';
  if (inv.uses >= inv.limit) return 'Exhausted';
  return 'Active';
}

/* ------------------------------------------------------- tasks & states */

/** One student's state for one assignment, with derived Overdue / Cancelled. */
export function taskState(s, a, personId) {
  const sub = s.submissions.find(x => x.assignmentId === a.id && x.studentId === personId) || null;
  const draft = s.taskDrafts?.[`${personId}:${a.id}`];
  const base = sub ? sub.status : draft ? 'In Progress' : 'Assigned';
  if (a.status === 'Cancelled' && !['Approved', 'Rejected'].includes(base)) return {status:'Cancelled', sub, overdue:false};
  const overdue = ['Assigned', 'In Progress', 'Needs Revision'].includes(base) && String(a.due) < clockDay(s);
  return {status:base, sub, overdue};
}
/** Assignments that apply to one member of a group (whole-group or addressed to them). */
export const tasksFor = (s, g, personId) => s.assignments.filter(a => a.groupId === g.id && (!a.studentId || a.studentId === personId));

/* ------------------------------------------------------------ completion */

/** Completion eligibility of one member under the Program's declared rule. */
export function completionStatus(s, pr, g, personId) {
  const required = tasksFor(s, g, personId).filter(a => a.required && a.status !== 'Cancelled');
  const approved = required.filter(a => s.submissions.some(x => x.assignmentId === a.id && x.studentId === personId && x.status === 'Approved'));
  const c = pr.completion || DEFAULT_COMPLETION;
  const needed = c.rule === 'percent-required' ? Math.ceil(required.length * (Number(c.percent) || 0) / 100) : required.length;
  const eligible = required.length > 0 && approved.length >= needed;
  const reason = !required.length ? 'No required task has been assigned yet.' : eligible ? 'Meets the declared completion rule.' : `${needed - approved.length} more required task${needed - approved.length === 1 ? '' : 's'} to approve.`;
  return {required:required.length, approved:approved.length, needed, eligible, reason};
}
export function completionRoster(s, pr) {
  return programGroups(s, pr).flatMap(g => g.memberIds.map(pid => ({group:g, personId:pid, ...completionStatus(s, pr, g, pid), record:(s.programCompletions || []).find(c => c.programId === pr.id && c.groupId === g.id && c.personId === pid) || null})));
}

/* ----------------------------------------------------------- Group Garden */

/** Configurable demo policy (open owner decision, master §26.2). */
export const PROGRAM_GARDEN_POLICY = {stageQuorum:0.6};
/**
 * One collective Group Garden per independent Coach group. Growth is a set of
 * bounded milestones — first root, every member contributing, each Program
 * stage reaching quorum, Program completion — so extra assignments, retries or
 * repeated review clicks can never grow it further. Each approved submission
 * counts once (its ID is the key).
 */
export function programGroupGarden(s, groupId) {
  const g = s.groups.find(x => x.id === groupId);
  if (!isProgramGroup(g)) return null;
  const pr = programOf(s, g);
  const assignments = s.assignments.filter(a => a.groupId === g.id && a.status !== 'Cancelled');
  const approved = s.submissions.filter(x => x.status === 'Approved' && assignments.some(a => a.id === x.assignmentId));
  const members = g.memberIds;
  const contributors = new Set(approved.map(x => x.studentId));
  const quorum = PROGRAM_GARDEN_POLICY.stageQuorum;
  const milestones = [
    {key:'first-root', title:'First root', note:'The first approved task in this group.', done:approved.length > 0},
    {key:'everyone', title:'Every member contributed', note:'Each current member has at least one approved task.', done:members.length > 0 && members.every(pid => contributors.has(pid))}
  ];
  for (const stage of pr?.stages || []) {
    const stageTasks = assignments.filter(a => a.stageId === stage.id);
    const reached = members.filter(pid => approved.some(x => x.studentId === pid && stageTasks.some(a => a.id === x.assignmentId))).length;
    milestones.push({key:`stage:${stage.id}`, title:stage.title, note:`${Math.round(quorum * 100)}% of members have approved work for this stage · ${reached}/${members.length}`, done:stageTasks.length > 0 && members.length > 0 && reached / members.length >= quorum});
  }
  const completedRecords = (s.programCompletions || []).filter(c => c.groupId === g.id && c.status === 'Completed');
  const completed = Boolean(pr && ['Completed', 'Archived'].includes(pr.status) && pr.completedAt);
  milestones.push({key:'completed', title:'Program completed', note:completed ? `${completedRecords.length} of ${members.length} member(s) completed` : 'Recognised once when the Coach finalizes Program completion.', done:completed});
  const reached = milestones.filter(m => m.done).length;
  const stage = reached ? Math.max(1, Math.round(reached / milestones.length * 5)) : 0;
  const recent = approved.map(x => ({key:`submission:${x.id}`, on:String(x.reviewedAt || x.submitted).slice(0, 10), title:assignments.find(a => a.id === x.assignmentId)?.title || 'Task'})).sort((a, b) => b.on.localeCompare(a.on));
  return {group:{id:g.id, name:g.name, members:members.length, status:g.status}, program:pr ? {id:pr.id, title:pr.title, status:pr.status} : null,
    count:approved.length, contributors:contributors.size, milestones, reached, total:milestones.length, stage, completed, recent:recent.slice(0, 8)};
}

/* -------------------------------------------------------------- metrics */

const inPeriod = (value, from, to) => { const day = String(value || '').slice(0, 10); return (!from || day >= from) && (!to || day <= to); };
/**
 * Source-computed work metrics for one group. Overdue is judged at the
 * earlier of the period end and today, so future-due work is never overdue.
 */
export function groupWorkMetrics(s, g, from, to) {
  const assignments = s.assignments.filter(a => a.groupId === g.id && a.status !== 'Cancelled');
  const subs = s.submissions.filter(x => assignments.some(a => a.id === x.assignmentId));
  const periodSubs = subs.filter(x => inPeriod(x.submitted, from, to));
  const cut = [to, clockDay(s)].filter(Boolean).sort()[0];
  let expected = 0, overdue = 0;
  for (const a of assignments) for (const pid of a.studentId ? [a.studentId] : g.memberIds) {
    expected++;
    const sub = subs.find(x => x.assignmentId === a.id && x.studentId === pid);
    if (String(a.due) < cut && (!sub || ['Needs Revision'].includes(sub.status))) overdue++;
  }
  return {members:g.memberIds.length, assignments:assignments.length, expected, submitted:periodSubs.length,
    approved:periodSubs.filter(x => x.status === 'Approved').length, needsRevision:periodSubs.filter(x => x.status === 'Needs Revision').length,
    rejected:periodSubs.filter(x => x.status === 'Rejected').length, awaitingReview:subs.filter(x => x.status === 'Submitted').length, overdue,
    cancelled:s.assignments.filter(a => a.groupId === g.id && a.status === 'Cancelled').length};
}
/** Program (or one of its groups) metrics, approvals trend by week and completion measures. */
export function programMetrics(s, pr, {groupId = '', from = '', to = ''} = {}) {
  const groups = programGroups(s, pr).filter(g => !groupId || g.id === groupId);
  const sum = {members:0, assignments:0, expected:0, submitted:0, approved:0, needsRevision:0, rejected:0, awaitingReview:0, overdue:0, cancelled:0};
  for (const g of groups) { const m = groupWorkMetrics(s, g, from, to); for (const key of Object.keys(sum)) sum[key] += m[key]; }
  sum.students = new Set(groups.flatMap(g => g.memberIds)).size;
  sum.groups = groups.length;
  const assignmentIds = new Set(s.assignments.filter(a => groups.some(g => g.id === a.groupId)).map(a => a.id));
  const approvals = s.submissions.filter(x => x.status === 'Approved' && assignmentIds.has(x.assignmentId) && inPeriod(x.reviewedAt || x.submitted, from, to));
  const weeks = new Map();
  for (const x of approvals) { const d = new Date(String(x.reviewedAt || x.submitted).slice(0, 10) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); const key = d.toISOString().slice(0, 10); weeks.set(key, (weeks.get(key) || 0) + 1); }
  sum.trend = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, value]) => ({week, value}));
  const roster = completionRoster(s, pr).filter(r => !groupId || r.group.id === groupId);
  sum.eligible = roster.filter(r => r.eligible).length;
  sum.completed = roster.filter(r => r.record?.status === 'Completed').length;
  return sum;
}

/* --------------------------------------------- student & Individual views */

/** Independent Program participation history for one person (shared records, never copied). */
export function programHistoryFor(s, personId) {
  const groups = s.groups.filter(g => isProgramGroup(g) && (g.memberIds.includes(personId) || (s.memberships || []).some(m => m.groupId === g.id && m.personId === personId && m.status !== 'Pending') || (s.programCompletions || []).some(c => c.groupId === g.id && c.personId === personId)));
  return groups.map(g => {
    const pr = programOf(s, g);
    const tasks = tasksFor(s, g, personId);
    const states = tasks.map(a => taskState(s, a, personId));
    const record = (s.programCompletions || []).find(c => c.groupId === g.id && c.personId === personId) || null;
    return {program:pr ? {id:pr.id, title:pr.title, status:pr.status, coach:s.people.find(p => p.id === pr.ownerId)?.name || 'Coach', start:pr.start, end:pr.end} : null,
      group:{id:g.id, name:g.name, status:g.status}, member:g.memberIds.includes(personId),
      tasks:tasks.length, approved:states.filter(x => x.status === 'Approved').length, revisions:states.reduce((n, x) => n + (x.sub?.history || []).filter(h => h.decision === 'Needs Revision').length, 0),
      completion:record ? {status:record.status, at:record.at, approved:record.approved, required:record.required} : null};
  }).filter(x => x.program);
}

/** Bounded, practice-type label for an activity title. */
export const practiceOf = activity => practiceTypeOf(activity);
