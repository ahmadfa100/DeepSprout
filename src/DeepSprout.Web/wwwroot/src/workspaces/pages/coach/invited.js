/**
 * Coach workspace (institution-invited Coach).
 *
 * A Coach joins DeepSprout only through an institution's invitation: the
 * Representative invites them to an initiative, then gives them a group. Every
 * page here answers the Coach's real questions: whose work is waiting for me,
 * who is falling behind, what did I give the group, and what do I tell the
 * Supervisors. Counts are selectors over the original records.
 */
import * as u from '../../ui.js';
import {esc,head,stats,stat,card,emptyState,pill,nameOf,fmtDate,picker,tabs,coachInitiatives} from '../institution/common.js';
import {activeGrantsFor,today,practiceTypeOf} from '../../initiative-rules.js';
import {groupMetrics} from '../../commands/initiative.js';
import {taskState,tasksFor,taskAudience,audienceLabel} from '../../coach-rules.js';
import * as kit from '../../../shared/task-kit.js';
import '../../task-composer.js';
import {institutionGroups} from './independent.js';
import {coachInsights} from './insights.js';

/* ------------------------------------------------------------ records */

const initiativeOf = (s, g) => s.initiatives.find(i => i.id === g.initiativeId);
const orgOf = (s, i) => s.organizations.find(o => o.id === i?.ownerId);
const liveTasks = (s, g) => s.assignments.filter(a => a.groupId === g.id && a.status !== 'Cancelled');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const dayMonth = v => new Date(`${String(v).slice(0, 10)}T12:00`);

/** Who brought this Coach in, and who they work with, for one initiative. */
export function appointment(s, personId, i) {
  const grant = (s.grants || []).find(x => x.personId === personId && x.scopeId === i.id && x.role === 'coach' && x.status === 'Active');
  const invite = (s.staffInvites || []).find(x => x.id === grant?.inviteId);
  return {grant, invite, inviter:invite?.invitedBy || null, since:grant?.acceptedAt || invite?.created || null, supervisors:activeGrantsFor(s, i.id, 'supervisor').map(x => x.personId), org:orgOf(s, i)};
}

/** One student's standing in one group: tasks, reviews, attendance. */
export function standing(s, g, pid) {
  const tasks = tasksFor(s, g, pid).filter(a => a.status !== 'Cancelled').map(a => ({a, ...taskState(s, a, pid)}));
  const att = (s.sessionAttendance || []).filter(x => x.initiativeId === g.initiativeId && x.personId === pid);
  const excused = att.filter(x => x.status === 'Absent' && (s.excuses || []).some(e => e.attendanceId === x.id && e.status === 'Accepted')).length;
  return {
    pid, tasks,
    approved:tasks.filter(t => t.status === 'Approved').length,
    waiting:tasks.filter(t => t.status === 'Submitted').length,
    revising:tasks.filter(t => t.status === 'Needs Revision').length,
    overdue:tasks.filter(t => t.overdue).length,
    sessions:att.length, attended:att.filter(x => x.status !== 'Absent').length, excused
  };
}
/** The one label that best sums a student up for the Coach. */
function standingPill(x) {
  if (x.overdue) return pill('Overdue', `${plural(x.overdue, 'task')} overdue`);
  if (x.waiting) return pill('Pending', 'Waiting for your review');
  if (x.revising) return pill('Pending', 'Revising');
  if (x.tasks.length && x.approved === x.tasks.length) return pill('Approved', 'All done');
  return x.tasks.length ? pill('neutral', 'In progress') : pill('neutral', 'No tasks yet');
}
const attendanceText = x => x.sessions ? `${x.attended} of ${x.sessions} sessions${x.excused ? ` · ${x.excused} excused` : ''}` : 'No sessions recorded';
const meter = (n, d) => `<span class="cw-meter" aria-hidden="true"><i style="--w:${d ? Math.round(n / d * 100) : 0}%"></i></span>`;

/** Per-state counts for one task across the people it applies to. */
function taskProgress(s, g, a) {
  const people = taskAudience(a, g);
  const states = people.map(pid => ({pid, ...taskState(s, a, pid)}));
  const n = st => states.filter(x => x.status === st).length;
  return {people, states, approved:n('Approved'), waiting:n('Submitted'), revising:n('Needs Revision'), overdue:states.filter(x => x.overdue).length, open:states.filter(x => !['Approved', 'Submitted', 'Needs Revision', 'Rejected'].includes(x.status)).length};
}

/* ------------------------------------------------------------ shared blocks */

function calm(title, text) { return `<div class="iw-calm">${u.icon('check')}<div><strong>${esc(title)}</strong><p>${esc(text)}</p></div></div>`; }

/** For a person with no active coaching role: explain the single way in. */
export function notInvited(ctx) {
  const steps = [['mail', 'You receive an invitation', 'An institution’s Representative invites you by email to coach one of its initiatives.'], ['check', 'You accept it', 'Open the invitation link and accept. Your Coach workspace opens with the same account.'], ['people', 'They give you a group', 'Your group, its students and their work appear here, ready for your first task.']];
  return head({eyebrow:'COACH', title:'No coaching role yet.', lead:'Coaches on DeepSprout work inside an institution’s initiative, by invitation only.'})
    + `<ol class="cw-howto iw-reveal">${steps.map(([icon, title, text], n) => `<li><span class="cw-howto-icon">${u.icon(icon)}</span><b>${n + 1}</b><strong>${esc(title)}</strong><p>${esc(text)}</p></li>`).join('')}</ol>`
    + `<p class="iw-footnote">${u.icon('shield')}Invitations arrive in your Notifications and by email.</p>`;
}

/** A compact “how you got here” strip: who invited you, since when, with whom. */
function appointmentStrip(s, personId, i, groups) {
  const a = appointment(s, personId, i);
  const person = (pid, role) => `<span class="cw-who">${u.avatar(nameOf(s, pid))}<span><b>${esc(nameOf(s, pid))}</b><small>${esc(role)}</small></span></span>`;
  return `<section class="cw-appoint iw-reveal" aria-label="Your coaching role">
    <div><span class="cw-appoint-label">Invited by</span>${a.inviter ? person(a.inviter, 'Representative') : `<b>${esc(a.org?.name || 'The institution')}</b>`}</div>
    <div><span class="cw-appoint-label">Coach since</span><b>${a.since ? esc(fmtDate(a.since)) : '—'}</b><small>${esc(i.title)} · ${esc(fmtDate(i.start))} – ${esc(fmtDate(i.end))}</small></div>
    <div><span class="cw-appoint-label">Your ${groups.length === 1 ? 'group' : 'groups'}</span>${groups.map(g => `<a class="cw-chip" style="--h:${u.hueOf(g.id)}" href="${u.href(`mentor/groups/${g.id}`)}"><span class="iw-gdot"></span>${esc(g.name)}</a>`).join('') || '<small>Not given yet</small>'}</div>
    <div><span class="cw-appoint-label">${a.supervisors.length === 1 ? 'Supervisor' : 'Supervisors'}</span>${a.supervisors.length ? a.supervisors.map(pid => person(pid, 'Reads your reports')).join('') : '<small>None yet</small>'}</div>
  </section>`;
}

/* ------------------------------------------------------------ dashboard */

export function dashboard(ctx) {
  const {s, person:p} = ctx, groups = institutionGroups(ctx), inits = coachInitiatives(s, p.id), first = p.name.split(' ')[0];
  if (!inits.length && !groups.length) return notInvited(ctx);
  const i = inits[0] || initiativeOf(s, groups[0]), org = orgOf(s, i), day = today(s);
  const hero = (lead, actions = '') => `<header class="iw-dash-head iw-reveal"><div class="iw-dash-copy"><p class="iw-org"><span>${esc(org?.name || '')}</span><span class="cw-role-mark">${u.icon('people')}Coach · ${esc(i.title)}</span></p><h1>Good to see you, ${esc(first)}.</h1><p class="iw-lead">${lead}</p></div>${actions ? `<div class="iw-dash-actions">${actions}</div>` : ''}</header>`;
  if (!groups.length) return hero(`You joined <strong>${esc(i.title)}</strong> as a Coach. The Representative will give you a group next.`) + appointmentStrip(s, p.id, i, []) + emptyState('Your group is on its way.', 'When the Representative gives you a group, its students and tasks appear here.');

  const rows = groups.flatMap(g => g.memberIds.map(pid => ({g, ...standing(s, g, pid)})));
  const waiting = rows.flatMap(r => r.tasks.filter(t => t.status === 'Submitted').map(t => ({r, t}))).sort((x, y) => String(x.t.sub.submitted).localeCompare(String(y.t.sub.submitted)));
  const late = rows.flatMap(r => r.tasks.filter(t => t.overdue).map(t => ({r, t})));
  const expected = groups.reduce((n, g) => n + liveTasks(s, g).reduce((m, a) => m + taskAudience(a, g).length, 0), 0);
  const approved = rows.reduce((n, r) => n + r.approved, 0);

  const todo = [
    ...waiting.map(({r, t}) => ({tone:'attention', title:`Review ${nameOf(s, r.pid).split(' ')[0]}’s work`, text:`${t.a.title} · sent ${fmtDate(t.sub.submitted)}`, href:`mentor/reviews/${t.sub.id}`, action:'Review'})),
    ...late.map(({r, t}) => ({tone:'critical', title:`${nameOf(s, r.pid)} hasn’t submitted`, text:`${t.a.title} · was due ${fmtDate(t.a.due)}`, href:`mentor/students/${r.pid}`, action:'Open'})),
    ...groups.filter(g => !liveTasks(s, g).some(a => a.due >= day)).map(g => ({tone:'neutral', title:`Give ${g.name} a next step`, text:'No open task right now.', button:u.button('Assign a task', 'assignment-create', {group:g.id}, 'button quiet small')})),
    ...groups.map(g => { const last = (s.coachReports || []).filter(r => r.groupId === g.id && r.authorId === p.id && r.status === 'Submitted').sort((a, b) => String(b.submitted).localeCompare(String(a.submitted)))[0]; return last && (Date.parse(`${day}T12:00`) - Date.parse(last.submitted)) / 864e5 < 7 ? null : {tone:'neutral', title:`Send a report on ${g.name}`, text:last ? `Last sent ${fmtDate(last.submitted)}` : 'The Supervisors haven’t had a report yet.', href:`mentor/reports?group=${g.id}`, action:'Write report'}; }).filter(Boolean)
  ];
  const attentionRow = x => `<li class="is-${x.tone}"><span class="iw-dot" aria-hidden="true"></span><div><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p></div>${x.button || u.link(x.action, x.href, 'button quiet small')}</li>`;
  const todoList = todo.length
    ? `<ul class="iw-attention">${todo.slice(0, 3).map(attentionRow).join('')}</ul>${todo.length > 3 ? `<details class="cw-dashboard-more"><summary>Show ${plural(todo.length - 3, 'more item')}</summary><ul class="iw-attention">${todo.slice(3).map(attentionRow).join('')}</ul></details>` : ''}`
    : calm('You’re all caught up.', 'New submissions and late work will appear here.');

  const roster = groups.slice(0, 2).map(g => {
    const groupRows = rows.filter(r => r.g.id === g.id);
    return `<div class="cw-roster-group" style="--h:${u.hueOf(g.id)}"><p class="cw-roster-title"><span class="iw-gdot"></span><a class="text-link" href="${u.href(`mentor/groups/${g.id}`)}">${esc(g.name)}</a><small>${plural(g.memberIds.length, 'student')}</small></p><ul class="cw-roster">${groupRows.slice(0, 3).map(r => `<li><a href="${u.href(`mentor/students/${r.pid}`)}">${u.avatar(nameOf(s, r.pid))}<span><b>${esc(nameOf(s, r.pid))}</b><small>${esc(attendanceText(r))}</small></span></a>${standingPill(r)}</li>`).join('') || '<li class="iw-muted">No students yet.</li>'}</ul>${groupRows.length > 3 ? `<a class="cw-dashboard-inline-link" href="${u.href(`mentor/groups/${g.id}?tab=members`)}">View all ${plural(groupRows.length, 'student')} in this group <span aria-hidden="true">→</span></a>` : ''}</div>`;
  }).join('');
  const rosterFooter = groups.length > 2 ? `<div class="cw-dashboard-footer"><span>${plural(groups.length - 2, 'more group')} in your workspace</span>${u.link('View all groups', 'mentor/groups', 'text-link')}</div>` : '';

  const sessions = s.sessions.filter(x => inits.some(ii => ii.id === x.initiativeId) && x.status !== 'Cancelled');
  const upcoming = sessions.filter(x => x.date >= day).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3);
  const recent = sessions.filter(x => x.date < day).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, Math.max(0, 3 - upcoming.length));
  const mine = new Set(groups.flatMap(g => g.memberIds));
  // Meetings the Supervisor scheduled with this Coach (alone, with all Coaches, or with everyone).
  const meetings = (s.supervisorMeetings || []).filter(m => m.status !== 'Cancelled' && m.date >= day && inits.some(ii => ii.id === m.initiativeId) && (m.audience !== 'coach' || m.coachId === p.id)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 2);
  const meetingRows = meetings.map(m => { const d = dayMonth(m.date); return `<li class="is-meeting"><time><b>${d.getDate()}</b><span>${esc(d.toLocaleDateString('en-GB', {month:'short'}))}</span></time><div><strong>${esc(m.title)}</strong><small>${esc(m.time)} · ${esc(m.format)} · with ${esc(nameOf(s, m.organizerId))}</small></div>${pill('Upcoming', 'Meeting')}</li>`; }).join('');
  const agenda = meetingRows + [...upcoming, ...recent].map(x => { const att = (s.sessionAttendance || []).filter(a => a.sessionId === x.id && mine.has(a.personId)); const d = dayMonth(x.date); return `<li class="${x.date < day ? 'is-past' : ''}"><time><b>${d.getDate()}</b><span>${esc(d.toLocaleDateString('en-GB', {month:'short'}))}</span></time><div><strong>${esc(x.title)}</strong><small>${esc(x.time)} · ${esc(x.format)}</small></div>${x.date >= day ? pill('Upcoming') : att.length ? `<span class="cw-att">${att.filter(a => a.status !== 'Absent').length} of ${att.length} of your students came</span>` : '<span class="cw-att">Not recorded</span>'}</li>`; }).join('');

  return hero(`You coach ${groups.map(g => `<strong>${esc(g.name)}</strong>`).join(' and ')}. ${waiting.length ? `${plural(waiting.length, 'piece')} of work ${waiting.length === 1 ? 'is' : 'are'} waiting for your review.` : 'Nothing is waiting for your review.'}`,
      `${u.button('Assign a task', 'assignment-create', {group:groups[0].id}, 'button quiet')}${u.link(waiting.length ? `Review work (${waiting.length})` : 'Reviews', 'mentor/reviews', 'button primary')}`)
    + appointmentStrip(s, p.id, i, groups)
    + stats([stat(rows.length, 'Students', {href:'mentor/students'}), stat(waiting.length, 'Waiting for your review', {href:'mentor/reviews', tone:waiting.length ? 'attention' : ''}), stat(late.length, 'Overdue tasks', {tone:late.length ? 'critical' : '', hint:late.length ? 'Not submitted after the due date' : 'Nobody is behind'}), stat(approved, 'Tasks approved', {of:expected || 0})])
    + `<div class="iw-split is-wide cw-dashboard-preview">${card('What needs you', todoList, {eyebrow:todo.length ? `${todo.length} TO DO` : 'ALL CLEAR'})}${card(groups.length === 1 ? 'Your students' : 'Your students by group', roster + rosterFooter, {extra:u.link('All students', 'mentor/students', 'text-link')})}</div>`
    + (agenda ? card('Sessions', `<ol class="iw-agenda cw-agenda">${agenda}</ol>`, {eyebrow:i.title.toUpperCase(), extra:'<small class="iw-muted">Run by the institution</small>'}) : '')
    + coachInsights(ctx, groups);
}

/* ------------------------------------------------------------ groups */

function groupCard(s, g) {
  const i = initiativeOf(s, g), m = groupMetrics(s, g), tasks = liveTasks(s, g);
  const st = g.memberIds.map(pid => standing(s, g, pid)), waiting = st.reduce((n, x) => n + x.waiting, 0), overdue = st.reduce((n, x) => n + x.overdue, 0);
  return `<article class="cw-group iw-reveal" style="--h:${u.hueOf(g.id)}" data-search="${esc(`${g.name} ${i?.title || ''}`)}" data-status="${esc(g.status)}">
    <header><span class="iw-gdot"></span><div><h2><a href="${u.href(`mentor/groups/${g.id}`)}">${esc(g.name)}</a></h2><p>${esc(i?.title || '')} · ${esc(orgOf(s, i)?.name || '')}</p></div></header>
    <p class="cw-group-purpose">${esc(g.purpose || '')}</p>
    <div class="cw-group-people"><span class="iw-avatar-stack">${g.memberIds.slice(0, 5).map(pid => u.avatar(nameOf(s, pid))).join('')}</span><span>${plural(g.memberIds.length, 'student')}</span></div>
    <div class="cw-group-progress"><span>Tasks approved</span><b>${m.approved} / ${m.expectedSubmissions}</b>${meter(m.approved, m.expectedSubmissions)}</div>
    <footer><span class="cw-group-flags">${waiting ? pill('Pending', `${waiting} to review`) : ''}${overdue ? pill('Overdue', `${overdue} overdue`) : ''}${!waiting && !overdue ? `<small>${plural(tasks.length, 'task')}</small>` : ''}</span>${u.link('Open group', `mentor/groups/${g.id}`, 'button quiet small')}</footer>
  </article>`;
}
export function groupsPage(ctx) {
  const {s} = ctx, groups = institutionGroups(ctx);
  if (!groups.length) return coachInitiatives(s, ctx.person.id).length ? head({eyebrow:'MY GROUPS', title:'My groups'}) + emptyState('No group yet.', 'The Representative will give you a group. It appears here with its students.') : notInvited(ctx);
  return head({eyebrow:'MY GROUPS', title:'My groups', lead:'The groups an institution has given you to coach. The institution manages who is in each one.'})
    + u.filterBar(['Open', 'Archived']) + `<div class="cw-groups">${groups.map(g => groupCard(s, g)).join('')}</div><p class="no-results" hidden>No matching groups.</p>`;
}

function rosterTable(s, g, rows) {
  return u.table(['Student', 'Tasks done', 'Attendance', 'Status', ''], rows.map(r => ({search:nameOf(s, r.pid), cells:[`<div class="iw-person">${u.avatar(nameOf(s, r.pid))}<div><strong>${esc(nameOf(s, r.pid))}</strong>${g ? '' : `<small>${esc(r.g.name)}</small>`}</div></div>`, `<span class="cw-num">${r.approved} of ${r.tasks.length}</span>${meter(r.approved, r.tasks.length)}`, `<span class="cw-num">${esc(attendanceText(r))}</span>`, standingPill(r), u.link('Open', `mentor/students/${r.pid}`, 'button quiet small')]})));
}

const STATE = x => x.status === 'Approved' ? ['is-done', 'Approved'] : x.status === 'Submitted' ? ['is-sent', 'Waiting for your review'] : x.status === 'Needs Revision' ? ['is-revise', 'Revising'] : x.status === 'Rejected' ? ['is-rejected', 'Not accepted'] : x.overdue ? ['is-late', 'Late · not sent'] : ['is-open', 'Not sent yet'];

/** One task as the Coach sees it: who it is for, each person's state at a glance, files and actions. */
function taskCard(s, a, g, {showGroup = true} = {}) {
  const pr = taskProgress(s, g, a), total = Math.max(1, pr.people.length), day = today(s), cancelled = a.status === 'Cancelled';
  const seg = (n, cls, label) => n ? `<i class="${cls}" style="--w:${n / total * 100}%" title="${n} ${label}"></i>` : '';
  const parts = [pr.approved && `${pr.approved} approved`, pr.waiting && `${pr.waiting} to review`, pr.revising && `${pr.revising} revising`, pr.open && `${pr.open} not sent`].filter(Boolean).join(' · ') || 'No one yet';
  const faces = pr.states.slice(0, 9).map(x => { const [tone, word] = STATE(x); return `<span class="tcard-face ${tone}" title="${esc(`${nameOf(s, x.pid)} · ${word}`)}">${u.avatar(nameOf(s, x.pid))}<i aria-hidden="true"></i></span>`; }).join('') + (pr.states.length > 9 ? `<span class="tcard-more">+${pr.states.length - 9}</span>` : '');
  const due = cancelled ? '<span class="tk-due is-muted">Cancelled</span>'
    : !pr.open && !pr.revising && !pr.waiting ? kit.dueChip(a.due, day, 'Approved')
    : !pr.open && !pr.revising ? `<span class="tk-due is-sent">${kit.icon('send')}${pr.waiting} to review</span>` : kit.dueChip(a.due, day);
  return `<article class="tcard${cancelled ? ' is-cancelled' : ''}" style="--h:${u.hueOf(g?.id || a.id)}" data-search="${esc(`${a.title} ${g?.name || ''} ${a.activity}`)}" data-status="${esc(a.status)}">
    <header class="tcard-head">
      <span class="tcard-type">${kit.icon(kit.practiceIcon(a.practiceType || practiceTypeOf(a.activity)))}</span>
      <div class="tcard-title"><h3>${esc(a.title)}</h3><p><span>${esc(a.activity)}</span>${showGroup && g ? `<span class="cw-chip is-flat" style="--h:${u.hueOf(g.id)}"><span class="iw-gdot"></span>${esc(g.name)}</span>` : ''}<span class="tcard-aud">${kit.icon(a.studentId ? 'person' : a.batch?.kind === 'all-groups' ? 'layers' : 'people')}${esc(audienceLabel(s, a, g))}</span>${a.required ? '' : '<span>Optional</span>'}</p></div>
      ${due}
    </header>
    <p class="tcard-brief">${esc(a.instructions)}</p>
    ${(a.attachments || []).length ? kit.fileTiles(a.attachments, {cls:'is-compact'}) : ''}
    <div class="tcard-foot">
      <div class="tcard-faces" aria-label="${esc(parts)}">${faces || '<small class="iw-muted">No students yet</small>'}</div>
      <div class="tcard-progress"><div class="iw-stack-bar" aria-hidden="true">${seg(pr.approved, 'is-present', 'approved')}${seg(pr.waiting, 'is-excused', 'to review')}${seg(pr.revising, 'is-late', 'revising')}${seg(pr.open, a.due < day ? 'is-absent' : 'is-open', 'not sent')}</div><small>${esc(parts)}</small></div>
      <div class="tcard-actions">${pr.waiting ? u.link(`Review (${pr.waiting})`, `mentor/reviews?task=${a.id}`, 'button primary small') : ''}${!cancelled ? u.button('Reschedule', 'assignment-reschedule', {id:a.id}, 'button quiet small') + u.button('Cancel', 'assignment-cancel', {id:a.id}, 'button quiet small') : ''}</div>
    </div>
    ${cancelled && a.cancelReason ? `<p class="tcard-note">${esc(a.cancelReason)}</p>` : ''}
  </article>`;
}

export function groupDetail(ctx, g) {
  const {s, person:p, route:r} = ctx, i = initiativeOf(s, g), a = appointment(s, p.id, i), tab = r.query.get('tab') || 'overview';
  const rows = g.memberIds.map(pid => ({g, ...standing(s, g, pid)})), tasks = s.assignments.filter(x => x.groupId === g.id);
  const waiting = rows.reduce((n, x) => n + x.waiting, 0), overdue = rows.reduce((n, x) => n + x.overdue, 0);
  let body = '';
  if (tab === 'overview') {
    const roster = `<ul class="cw-roster is-wide">${rows.map(x => `<li><a href="${u.href(`mentor/students/${x.pid}`)}">${u.avatar(nameOf(s, x.pid))}<span><b>${esc(nameOf(s, x.pid))}</b><small>${x.approved} of ${x.tasks.length} tasks done · ${esc(attendanceText(x))}</small></span></a>${standingPill(x)}</li>`).join('') || '<li class="iw-muted">No students yet. The Representative adds them.</li>'}</ul>`;
    const facts = `<dl class="iw-facts cw-facts"><div><dt>Initiative</dt><dd>${esc(i?.title || '')}<small>${esc(fmtDate(i?.start))} – ${esc(fmtDate(i?.end))}</small></dd></div><div><dt>Institution</dt><dd>${esc(a.org?.name || '')}</dd></div><div><dt>Your role</dt><dd>Coach${a.since ? `<small>since ${esc(fmtDate(a.since))}</small>` : ''}</dd></div>${a.inviter ? `<div><dt>Representative</dt><dd>${esc(nameOf(s, a.inviter))}</dd></div>` : ''}<div><dt>${a.supervisors.length === 1 ? 'Supervisor' : 'Supervisors'}</dt><dd>${esc(a.supervisors.map(pid => nameOf(s, pid)).join(', ') || 'None yet')}</dd></div></dl><p class="cw-fine">${u.icon('shield')}The institution decides who is in this group. You see only this group’s work — never anyone’s personal Lab, Shield or Recovery data.</p>`;
    const current = tasks.filter(x => x.status === 'Active').sort((x, y) => String(y.due).localeCompare(String(x.due)))[0];
    body = stats([stat(rows.length, 'Students'), stat(tasks.filter(x => x.status === 'Active').length, 'Active tasks'), stat(waiting, 'Waiting for your review', {tone:waiting ? 'attention' : '', href:'mentor/reviews'}), stat(overdue, 'Overdue', {tone:overdue ? 'critical' : ''})])
      + (current ? card('Latest task', taskCard(s, current, g, {showGroup:false}), {extra:u.link('All tasks', `mentor/groups/${g.id}?tab=activity`, 'text-link')}) : '')
      + `<div class="iw-split is-wide">${card('Students', roster, {extra:u.link('Details', `mentor/groups/${g.id}?tab=members`, 'text-link')})}${card('About this group', facts)}</div>`;
  }
  if (tab === 'members') body = card('', rosterTable(s, g, rows) + `<p class="cw-fine">${u.icon('shield')}To add, move or remove a student, ask the Representative or a Supervisor.</p>`);
  if (tab === 'activity') body = tasks.length ? `<div class="tcards">${tasks.slice().sort((x, y) => String(y.due).localeCompare(String(x.due))).map(x => taskCard(s, x, g, {showGroup:false})).join('')}</div>` : emptyState('No tasks yet.', 'Give the group one small, clear next step.', u.button('Assign a task', 'assignment-create', {group:g.id}, 'button primary'));
  return `<p class="breadcrumbs">${u.link('My groups', 'mentor/groups', 'text-link')} / ${esc(g.name)}</p>`
    + head({eyebrow:`${i?.title || ''} · ${a.org?.name || ''}`.toUpperCase(), title:g.name, lead:g.purpose || '', actions:`${u.link('Write report', `mentor/reports?group=${g.id}`, 'button quiet')}${u.button('Assign a task', 'assignment-create', {group:g.id}, 'button primary')}`})
    + tabs([['Overview', `mentor/groups/${g.id}`, 'overview'], ['Students', `mentor/groups/${g.id}?tab=members`, 'members', rows.length], ['Tasks', `mentor/groups/${g.id}?tab=activity`, 'activity', tasks.length]], tab)
    + body;
}

/* ------------------------------------------------------------ students */

export function studentsPage(ctx) {
  const {s, route:r} = ctx, groups = institutionGroups(ctx);
  if (!groups.length) return groupsPage(ctx);
  const selectedGroup = groups.find(g => g.id === r.query.get('group'));
  const visibleGroups = selectedGroup ? [selectedGroup] : groups;
  const rows = visibleGroups.flatMap(g => g.memberIds.map(pid => ({g, ...standing(s, g, pid)})));
  const groupFilter = `<form class="iw-filters" data-form="coach-students-filter"><label class="field"><span>Group</span><select name="group"><option value="">All groups</option>${groups.map(g => `<option value="${esc(g.id)}" ${g === selectedGroup ? 'selected' : ''}>${esc(g.name)} · ${esc(initiativeOf(s, g)?.title || 'Initiative')}</option>`).join('')}</select></label><button class="button quiet small" type="submit">Apply</button></form>`;
  return head({eyebrow:'MY STUDENTS', title:'Students', lead:'Everyone in the groups you coach, and how each of them is doing.'})
    + groupFilter
    + (rows.length ? `<div class="iw-card iw-reveal">${u.filterBar()}${rosterTable(s, visibleGroups.length === 1 ? visibleGroups[0] : null, rows)}</div>`
      : emptyState('No students in this group yet.', 'The institution adds students to its groups. Choose another group or show all groups.'));
}

export function studentDetail(ctx, pid) {
  const {s} = ctx, g = institutionGroups(ctx).find(x => x.memberIds.includes(pid)), person = s.people.find(x => x.id === pid);
  if (!g || !person) return null;
  const i = initiativeOf(s, g), x = standing(s, g, pid), day = today(s);
  const stateOf = t => t.status === 'Approved' ? pill('Approved') : t.status === 'Submitted' ? pill('Pending', 'Waiting for your review') : t.status === 'Needs Revision' ? pill('Pending', 'Revising') : t.status === 'Rejected' ? pill('Rejected', 'Not accepted') : t.overdue ? pill('Overdue', 'Not submitted · overdue') : pill('neutral', t.a.due >= day ? 'Not submitted yet' : 'Not submitted');
  const tasks = x.tasks.length ? `<ul class="cw-list">${x.tasks.slice().sort((a, b) => String(b.a.due).localeCompare(String(a.a.due))).map(t => `<li><div><strong>${esc(t.a.title)}</strong><small>Due ${esc(fmtDate(t.a.due))}${t.sub ? ` · sent ${esc(fmtDate(t.sub.submitted))}${t.sub.attempt > 1 ? ` · attempt ${t.sub.attempt}` : ''}` : ''}</small>${t.sub?.feedback ? `<p class="cw-quote">“${esc(t.sub.feedback)}”</p>` : ''}</div>${stateOf(t)}${t.sub ? u.link(t.status === 'Submitted' ? 'Review' : 'Open', `mentor/reviews/${t.sub.id}`, `button ${t.status === 'Submitted' ? 'primary' : 'quiet'} small`) : ''}</li>`).join('')}</ul>` : '<p class="iw-muted">No tasks for this group yet.</p>';
  const att = (s.sessionAttendance || []).filter(a => a.initiativeId === g.initiativeId && a.personId === pid).map(a => ({a, ss:s.sessions.find(z => z.id === a.sessionId), excused:a.status === 'Absent' && (s.excuses || []).some(e => e.attendanceId === a.id && e.status === 'Accepted')})).filter(z => z.ss).sort((a, b) => String(b.ss.date).localeCompare(String(a.ss.date)));
  const sessions = att.length ? `<ul class="cw-list">${att.map(z => `<li><div><strong>${esc(z.ss.title)}</strong><small>${esc(fmtDate(z.ss.date))} · ${esc(z.ss.time)}</small></div>${z.excused ? '<span class="iw-att is-excused">Excused</span>' : `<span class="iw-att is-${z.a.status.toLowerCase()}">${esc(z.a.status)}</span>`}</li>`).join('')}</ul>` : '<p class="iw-muted">No attendance recorded yet.</p>';
  return `<p class="breadcrumbs">${u.link('Students', 'mentor/students', 'text-link')} / ${esc(person.name)}</p>`
    + `<header class="cw-person-head iw-reveal">${u.avatar(person.name)}<div><p class="eyebrow">${esc(g.name)} · ${esc(i?.title || '')}</p><h1>${esc(person.name)}</h1><p class="iw-lead">${x.approved} of ${x.tasks.length} tasks done · ${esc(attendanceText(x))}</p></div>${standingPill(x)}</header>`
    + `<div class="iw-split is-wide">${card('Tasks', tasks, {eyebrow:'WORK IN THIS GROUP'})}${card('Sessions', sessions, {eyebrow:'ATTENDANCE', extra:'<small class="iw-muted">Recorded by the institution</small>'})}</div>`
    + `<p class="iw-footnote">${u.icon('shield')}You see only this student’s work and attendance in ${esc(i?.title || 'this initiative')}. Their personal Lab, Shield and Recovery data stay private.</p>`;
}

/* ------------------------------------------------------------ tasks */

export function tasksPage(ctx) {
  const {s} = ctx, groups = institutionGroups(ctx);
  if (!groups.length) return groupsPage(ctx);
  const list = s.assignments.filter(a => groups.some(g => g.id === a.groupId)).sort((x, y) => (x.status === 'Cancelled') - (y.status === 'Cancelled') || String(y.due).localeCompare(String(x.due)));
  const live = list.filter(a => a.status === 'Active'), day = today(s);
  const progress = live.map(a => taskProgress(s, groups.find(g => g.id === a.groupId), a));
  const waiting = progress.reduce((n, x) => n + x.waiting, 0), late = live.filter((a, i) => a.due < day && progress[i].open).length;
  return head({eyebrow:'TASKS', title:'Tasks', lead:'Give your students one clear next step, then see who has done it.', actions:u.button('Assign a task', 'assignment-create', {group:groups[0].id}, 'button primary')})
    + (list.length ? `<div class="tk-strip iw-reveal"><span><b>${live.length}</b> active</span><span class="${waiting ? 'is-attention' : ''}"><b>${waiting}</b> waiting for your review</span><span class="${late ? 'is-critical' : ''}"><b>${late}</b> past due with work missing</span><span><b>${list.filter(a => (a.attachments || []).length).length}</b> with files</span></div>
      <div class="iw-card iw-reveal tcards-card">${u.filterBar(['Active', 'Cancelled'])}<div class="tcards">${list.map((a, i) => taskCard(s, a, groups.find(g => g.id === a.groupId), {showGroup:groups.length > 1}).replace('<article class="tcard', `<article style="--i:${Math.min(i, 8)}" class="tcard`)).join('')}</div><p class="no-results" hidden>No matching tasks.</p></div>`
      : emptyState('No tasks yet.', 'A good first task is small and concrete: one step a student can try this week.', u.button('Assign a task', 'assignment-create', {group:groups[0].id}, 'button primary')))
    + `<p class="iw-footnote">${u.icon('shield')}Rescheduling keeps the earlier version. Cancelling keeps every submission. Files stay in this browser in the demo.</p>`;
}

const addDays = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const ACTIVITY_HINT = {depth:'Read or study one thing with full attention', listening:'Listen, then recall what stayed with you', practical:'A small challenge in real life', 'protected-work':'A timed, phone-free work block'};
export const EVIDENCE_CHOICES = [['A short written reflection', 'pencil', 'Reflection'], ['A document or PDF', 'doc', 'Document'], ['A photo or image', 'image', 'Photo'], ['A reflection, a file or both', 'layers', 'Any of these']];

/** The “Assign a task” composer: audience, activity, brief, files and timing, with a live summary. */
export function taskForm(s, groups, groupId, labelOf) {
  const day = today(s), people = [...new Set(groups.flatMap(g => g.memberIds))];
  const first = groups.find(g => g.id === groupId) || groups[0];
  const activities = s.activityCatalog.filter(a => a.status === 'Published');
  const data = {groups:Object.fromEntries(groups.map(g => [g.id, {name:g.name, count:g.memberIds.length}]))};
  const aud = (value, ic, title, text, checked) => `<label class="tc-aud-card"><input type="radio" name="audience" value="${value}" ${checked ? 'checked' : ''}><span class="tc-aud-icon">${kit.icon(ic)}</span><span class="tc-aud-copy"><b>${esc(title)}</b><small>${esc(text)}</small></span><span class="tc-aud-tick" aria-hidden="true">${kit.icon('check')}</span></label>`;
  const memberOf = pid => groups.filter(g => g.memberIds.includes(pid));
  return `<div class="tc" data-composer="${esc(JSON.stringify(data))}">
    <label class="tc-title" for="tc-title"><span class="sr-only">Task title</span><input id="tc-title" name="title" type="text" required maxlength="120" autocomplete="off" placeholder="Name the task — e.g. Map your scroll triggers"></label>

    <section class="tc-block" aria-labelledby="tc-who"><div class="tc-block-head"><h3 id="tc-who">${kit.icon('people')}Who is it for?</h3></div>
      <div class="tc-aud" role="radiogroup" aria-labelledby="tc-who">${aud('group', 'people', 'One group', 'Everyone in it', true)}${aud('students', 'person', 'Chosen students', 'One or a few people', false)}${groups.length > 1 ? aud('all-groups', 'layers', 'All my groups', `${plural(groups.length, 'group')} · ${plural(people.length, 'student')}`, false) : ''}</div>
      <div class="tc-panel" data-for="group">${picker({attrs:'name="groupId"', value:first.id, label:'Group', placeholder:'Choose a group', options:groups.map(g => ({value:g.id, label:g.name, sub:labelOf(g), hue:u.hueOf(g.id)})), inline:true})}</div>
      <div class="tc-panel" data-for="students">${picker({attrs:'name="studentIds"', multiple:true, value:[], label:'Students', placeholder:'Choose one or more students', one:'student chosen', many:'students chosen', options:people.map(pid => ({value:pid, label:nameOf(s, pid), sub:memberOf(pid).map(g => g.name).join(', '), person:true, tags:memberOf(pid).map(g => g.id)})), search:people.length > 4, searchLabel:'Search students', filters:groups.length > 1 ? groups.map(g => [g.id, g.name]) : [], empty:'No students in your groups yet.', inline:true})}</div>
      ${groups.length > 1 ? `<div class="tc-panel" data-for="all-groups"><ul class="tc-groups">${groups.map(g => `<li style="--h:${u.hueOf(g.id)}"><label><input type="checkbox" name="groupIds" value="${esc(g.id)}" checked><span class="tc-check" aria-hidden="true">${kit.icon('check')}</span><span class="iw-gdot"></span><b>${esc(g.name)}</b><small>${plural(g.memberIds.length, 'student')}</small></label></li>`).join('')}</ul><p class="tc-fine">Each group gets its own copy, so you can follow and review them separately.</p></div>` : ''}
    </section>

    <section class="tc-block" aria-labelledby="tc-what"><div class="tc-block-head"><h3 id="tc-what">${kit.icon('pencil')}What should they do?</h3></div>
      <div class="tc-row"><div class="field tc-activity"><span>Activity type</span>${picker({attrs:'name="activity"', value:activities[0]?.title || '', label:'Activity type', placeholder:'Choose an activity', options:activities.map(a => ({value:a.title, label:a.title, sub:ACTIVITY_HINT[a.practiceType || practiceTypeOf(a.title)] || '', icon:kit.icon(kit.practiceIcon(a.practiceType || practiceTypeOf(a.title)))})), inline:true})}</div></div>
      <label class="field tc-field" for="tc-instructions"><span>Instructions <span class="required">*</span></span><textarea id="tc-instructions" name="instructions" rows="4" required placeholder="One small, clear step. What should they try, for how long, and what should they notice?"></textarea></label>
      <fieldset class="tc-evidence"><legend>What should they send back?</legend><div class="tc-chips">${EVIDENCE_CHOICES.map(([value, ic, label], n) => `<label><input type="radio" name="evidence" value="${esc(value)}" ${n === 0 ? 'checked' : ''}><span>${kit.icon(ic)}${esc(label)}</span></label>`).join('')}</div></fieldset>
    </section>

    <section class="tc-block" aria-labelledby="tc-files"><div class="tc-block-head"><h3 id="tc-files">${kit.icon('clip')}Files for students <small>Optional</small></h3></div>
      ${kit.dropzone({name:'attachments', title:'Attach a worksheet, guide or image', id:'tc-attachments'})}
    </section>

    <section class="tc-block tc-when" aria-labelledby="tc-time"><div class="tc-block-head"><h3 id="tc-time">${kit.icon('clock')}When</h3></div>
      <div class="tc-dates"><label class="field" for="tc-start"><span>Starts</span><input id="tc-start" name="start" type="date" value="${esc(day)}"></label><label class="field" for="tc-due"><span>Due <span class="required">*</span></span><input id="tc-due" name="due" type="date" required value="${esc(addDays(day, 7))}"></label>
        <div class="tc-quick" role="group" aria-label="Quick due dates">${[[3, '3 days'], [7, '1 week'], [14, '2 weeks']].map(([n, l]) => `<button type="button" data-tk-due="${n}" data-today="${esc(day)}" aria-pressed="${n === 7}">${l}</button>`).join('')}</div></div>
      <label class="tc-switch"><input type="checkbox" name="required" checked><span class="tc-switch-track" aria-hidden="true"></span><span class="tc-switch-copy"><b>Required</b><small>Counts toward completing the initiative</small></span></label>
    </section>

    <p class="tc-summary" data-tc-summary aria-live="polite">${kit.icon('send')}<span>Goes to <b>${plural(first.memberIds.length, 'student')}</b> in ${esc(first.name)} · due ${esc(kit.fmtDay(addDays(day, 7)))}</span></p>
  </div>`;
}

/* ------------------------------------------------------------ reviews */

export function reviewQueue(ctx) {
  const {s, route:r} = ctx, groups = institutionGroups(ctx);
  if (!groups.length) return groupsPage(ctx);
  const tasks = s.assignments.filter(a => groups.some(g => g.id === a.groupId)), task = r.query.get('task'), day = today(s);
  const subs = s.submissions.filter(x => tasks.some(a => a.id === x.assignmentId) && (!task || x.assignmentId === task));
  const tab = r.query.get('tab') || 'waiting', waiting = subs.filter(x => x.status === 'Submitted').sort((a, b) => String(a.submitted).localeCompare(String(b.submitted))), done = subs.filter(x => x.status !== 'Submitted').sort((a, b) => String(b.reviewedAt || b.submitted).localeCompare(String(a.reviewedAt || a.submitted)));
  const shown = tab === 'done' ? done : waiting, q = task ? `&task=${task}` : '';
  const ago = v => { const n = kit.daysBetween(v, day); return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`; };
  const row = (x, i) => {
    const a = tasks.find(t => t.id === x.assignmentId), g = groups.find(z => z.id === a.groupId), open = x.status === 'Submitted', files = (x.files || []).length;
    const result = open ? pill('Pending', 'Waiting') : x.evaluation?.rating ? `<span class="rq-result">${kit.starRow(x.evaluation.rating)}${pill(x.status, x.status === 'Rejected' ? 'Not accepted' : x.status)}</span>` : pill(x.status, x.status === 'Rejected' ? 'Not accepted' : x.status);
    return `<li class="rq-item${open ? ' is-waiting' : ''}" style="--i:${Math.min(i, 8)};--h:${u.hueOf(g?.id || '')}"><a class="rq-link" href="${u.href(`mentor/reviews/${x.id}`)}">
      ${u.avatar(nameOf(s, x.studentId))}
      <span class="rq-main"><span class="rq-top"><strong>${esc(nameOf(s, x.studentId))}</strong><span class="cw-chip is-flat" style="--h:${u.hueOf(g?.id || '')}"><span class="iw-gdot"></span>${esc(g?.name || '')}</span>${(x.attempt || 1) > 1 ? `<span class="rq-attempt">${kit.icon('redo')}Attempt ${x.attempt}</span>` : ''}</span>
        <b class="rq-task">${esc(a.title)}</b>${x.text ? `<span class="rq-snippet">${esc(x.text.length > 150 ? `${x.text.slice(0, 150)}…` : x.text)}</span>` : ''}</span>
      <span class="rq-side"><span class="rq-when">${esc(open ? `Sent ${ago(x.submitted).toLowerCase()}` : `Reviewed ${ago(x.reviewedAt || x.submitted).toLowerCase()}`)}</span>${files ? `<span class="tk-tag is-files" title="${plural(files, 'file')} attached">${kit.icon('clip')}<span>${files}</span></span>` : ''}${result}</span>
      <span class="rq-go">${open ? 'Review' : 'Open'}${u.icon('arrow')}</span>
    </a></li>`;
  };
  return head({eyebrow:'REVIEWS', title:'Reviews', lead:'Read what each student tried, then help them take the next step.'})
    + (task ? `<p class="cw-filter-note">Showing one task: <strong>${esc(tasks.find(a => a.id === task)?.title || '')}</strong> ${u.link('Show all', 'mentor/reviews', 'text-link')}</p>` : '')
    + tabs([['Waiting for you', `mentor/reviews?tab=waiting${q}`, 'waiting', waiting.length], ['Reviewed', `mentor/reviews?tab=done${q}`, 'done', done.length]], tab)
    + (shown.length ? `<ul class="rq-list">${shown.map(row).join('')}</ul>` : card('', tab === 'done' ? '<p class="iw-muted">Nothing reviewed yet.</p>' : calm('Nothing is waiting for you.', 'When a student sends their work, it appears here.')));
}

/* ------------------------------------------------------------ reports */

export function reportPage(ctx) {
  const {s, person:p, route:r} = ctx, groups = institutionGroups(ctx);
  if (!groups.length) return head({eyebrow:'COACH REPORT', title:'Reports'}) + emptyState('No group to report on yet.', 'Reports are about the group an institution gives you.');
  const g = groups.find(x => x.id === r.query.get('group')) || groups[0], i = initiativeOf(s, g), a = appointment(s, p.id, i);
  const day = today(s);
  const from = r.query.get('from') || [i?.start, i?.registrationOpen, day].filter(Boolean).sort()[0];
  const to = r.query.get('to') || [i?.end, day].filter(Boolean).sort().at(-1);
  const m = groupMetrics(s, g, from, to);
  const mine = (s.coachReports || []).filter(x => x.groupId === g.id && x.authorId === p.id), draft = mine.find(x => x.status === 'Draft');
  const sent = mine.filter(x => x.status === 'Submitted').sort((x, y) => String(y.submitted).localeCompare(String(x.submitted)))[0];
  const rows = g.memberIds.map(pid => standing(s, g, pid));
  const supervisors = a.supervisors.map(pid => nameOf(s, pid));

  const metric = (value, label, tone = '') => `<div class="coach-report-metric${tone ? ` is-${tone}` : ''}" role="group" aria-label="${esc(`${value} ${label}`)}"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
  const numbers = [metric(m.members, 'Students'), metric(m.submitted, 'Sent in period'), metric(m.approved, 'Approved', 'sage'), metric(m.awaitingReview, 'Waiting for review'), metric(m.needsRevision, 'Revising', m.needsRevision ? 'amber' : ''), metric(m.overdue, 'Overdue', m.overdue ? 'rose' : '')].join('');
  const studentTable = rows.length ? `<table class="cw-mini-table"><thead><tr><th scope="col">Student</th><th scope="col">Tasks done</th><th scope="col">Attendance</th><th scope="col">Status</th></tr></thead><tbody>${rows.map(x => `<tr><td><span class="iw-person">${u.avatar(nameOf(s, x.pid))}<strong>${esc(nameOf(s, x.pid))}</strong></span></td><td>${x.approved} of ${x.tasks.length}</td><td>${x.sessions ? `${x.attended} of ${x.sessions}` : '—'}</td><td>${standingPill(x)}</td></tr>`).join('')}</tbody></table>` : '<p class="iw-muted">No students in this group yet.</p>';
  const field = (name, label, hint, required, placeholder) => `<label class="field coach-report-field" for="coach-report-${name}"><span>${esc(label)}${required ? ' <span class="required">*</span>' : ' <small>(optional)</small>'}</span><small class="cw-hint">${esc(hint)}</small><textarea id="coach-report-${name}" name="${name}" rows="${required ? 4 : 3}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}>${esc(draft?.[name] || '')}</textarea></label>`;

  const history = mine.length ? u.table(['Period', 'Status', 'Sent', 'What you wrote'], mine.slice().reverse().map(x => ({cells:[`${esc(fmtDate(x.period.from))} – ${esc(fmtDate(x.period.to))}`, u.badge(x.status), x.submitted ? esc(fmtDate(x.submitted)) : '—', `<span class="cw-excerpt">${esc(x.observations || '')}</span>`]}))) : '<p class="coach-report-history-empty">No reports yet. Drafts and sent reports appear here.</p>';

  return `<div class="coach-report-page">`
    + head({eyebrow:'COACH REPORT', title:'Report to your Supervisors', lead:`A short update on ${g.name}. The numbers are filled in from the group’s records — you add what the numbers can’t show.`, meta:sent ? `<span class="cw-status-note">${u.icon('check')}Last report sent ${esc(fmtDate(sent.submitted))}</span>` : `<span class="cw-status-note is-due">${u.icon('clock')}No report sent yet</span>`})
    + `<form data-form="coach-report-scope" class="coach-report-scope iw-reveal" aria-label="Group and period">
        ${groups.length > 1 ? u.select('group', 'Group', groups.map(x => [x.id, x.name]), g.id) : `<input type="hidden" name="group" value="${esc(g.id)}"><div class="cw-scope-group"><span>Group</span><b><span class="iw-gdot" style="--h:${u.hueOf(g.id)}"></span>${esc(g.name)}</b></div>`}
        ${u.field('from', 'From', from, 'date', true)}${u.field('to', 'To', to, 'date', true)}
        <button class="button quiet coach-report-update" type="submit">Update numbers</button>
      </form>`
    + `<div class="coach-report-layout">
        <section class="panel coach-report-data iw-reveal" aria-labelledby="cr-records"><p class="eyebrow">STEP 1 · FILLED IN FOR YOU</p><h2 id="cr-records">What the records show</h2><p class="cw-sub">${esc(fmtDate(from))} – ${esc(fmtDate(to))}</p>
          <div class="coach-report-metrics">${numbers}</div>
          <h3 class="cw-h3">Student by student</h3>${studentTable}
          <div class="coach-report-source-note">${u.icon('shield')}<p>No personal Lab, Shield or Recovery data is included. These numbers come from tasks, reviews and attendance, so you never type them.</p></div>
        </section>
        <section class="panel coach-report-notes iw-reveal" aria-labelledby="cr-words"><p class="eyebrow">STEP 2 · IN YOUR WORDS</p><h2 id="cr-words">Your update</h2><p class="cw-sub">Goes to ${esc(supervisors.join(', ') || 'the initiative’s Supervisors')}, then the Representative.</p>
          <form data-form="coach-report" data-group="${esc(g.id)}" data-from="${esc(from)}" data-to="${esc(to)}" data-id="${esc(draft?.id || '')}" class="coach-report-writing">
            ${field('observations', 'How is the group doing?', 'Progress, energy, what worked.', true, 'e.g. Noor finished the first task early and helped others start…')}
            ${field('concerns', 'Anything worrying?', 'Someone falling behind, a problem in the group.', false, 'e.g. Dana has not sent the first task yet…')}
            ${field('recommendations', 'What should happen next?', 'Support you suggest from the institution.', false, 'e.g. Pair Dana with Noor for the next task…')}
            <p class="form-error" role="alert"></p>
            <div class="coach-report-actions"><button class="button quiet" type="submit" name="intent" value="draft">Save draft</button><button class="button primary" type="submit" name="intent" value="submit">Submit to Supervisors</button></div>
          </form>
        </section>
      </div>`
    + `<section class="panel coach-report-history iw-reveal" aria-labelledby="cr-history"><h2 id="cr-history">Your earlier reports</h2>${history}</section>`
    + `</div>`;
}
