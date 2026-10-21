/**
 * Independent Coach workspace pages (master §13): invite-only Programs owned
 * by an approved Coach, each with its own Groups, private invitations, shared
 * assignment/review engine, one collective Group Garden per Group, source-
 * computed reports and Program completion. Every number on these pages is a
 * selector over the original records in the one operational graph.
 *
 * Institution-invited Coach pages (Initiative groups) stay in ../mentor.js;
 * the scope bar switches between the two contexts without merging authority.
 */
import * as u from '../../ui.js';
import {esc,head,stats,stat,card,emptyState,attention,bars,ring,feed,pill,nameOf,fmtDate,coachInitiatives} from '../institution/common.js';
import {collectiveScene} from '../institution/garden.js';
import {clockDay} from '../../domain.js';
import {isActiveCoach} from '../../initiative-rules.js';
import {independentStatus,coachApplication,programGroups,invitationStatus,taskState,tasksFor,completionRoster,completionPolicyText,programGroupGarden,programMetrics,groupWorkMetrics,PROGRAM_GARDEN_POLICY,COMPLETION_RULES,INDEPENDENT_REQUIRED,isProgramGroup,PROGRAM_BUILDABLE} from '../../coach-rules.js';

const stats4 = items => stats(items).replace('class="iw-stats', 'class="iw-stats is-4');

/* ------------------------------------------------------------ scope */

export const ownPrograms = ctx => ctx.s.programs.filter(p => p.ownerId === ctx.person.id);
export const ownProgramGroups = ctx => ctx.s.groups.filter(g => isProgramGroup(g) && g.ownerId === ctx.person.id);
export const institutionGroups = ctx => ctx.s.groups.filter(g => g.parentType === 'initiative' && g.coachId === ctx.person.id && isActiveCoach(ctx.s, g.initiativeId, ctx.person.id));
const groupSubs = (s, groups) => { const ids = new Set(s.assignments.filter(a => groups.some(g => g.id === a.groupId)).map(a => a.id)); return s.submissions.filter(x => ids.has(x.assignmentId)); };
const programName = (s, g) => s.programs.find(p => p.id === g.programId)?.title || 'No parent Program';

/** Which Coach contexts this person has: independent (any application or owned Program) and/or Institution grants. */
export function coachContexts(ctx) {
  const {s, person:p} = ctx;
  const status = independentStatus(s, p.id);
  return {status, independent:status !== 'None' || ownPrograms(ctx).length > 0, institution:coachInitiatives(s, p.id).length > 0 || institutionGroups(ctx).length > 0};
}
/** 'own' (independent) or 'initiative' (Institution); follows ?scope=, then the last choice, then the only context. */
export function coachScope(ctx) {
  const q = ctx.route.query.get('scope'), c = coachContexts(ctx);
  if (q === 'own' || q === 'initiative') { ctx.localUI.coachScope = q; return q; }
  if (ctx.route.query.get('initiative')) return 'initiative';
  const remembered = ctx.localUI.coachScope;
  if (remembered === 'own' && c.independent) return 'own';
  if (remembered === 'initiative' && c.institution) return 'initiative';
  return c.independent || !c.institution ? 'own' : 'initiative';
}
/** Context selector shown only to a person with both Coach contexts. */
export function scopeBar(ctx, scope) {
  const c = coachContexts(ctx);
  if (!(c.independent && c.institution)) return '';
  const chip = (key, title, small, icon) => `<button type="button" class="iw-context ${scope === key ? 'is-active' : ''} is-${key === 'own' ? 'provider' : 'initiative'}" data-action="coach-scope" data-scope="${key}" ${scope === key ? 'aria-current="true"' : ''}><span class="iw-context-tag">${u.icon(icon)}${key === 'own' ? 'Independent' : 'Institution'}</span><strong>${esc(title)}</strong><small>${esc(small)}</small></button>`;
  const inits = coachInitiatives(ctx.s, ctx.person.id);
  return `<nav class="iw-contexts" aria-label="Choose a Coach context">${chip('own', 'My Programs', `Independent Coach · ${c.status}`, 'book')}${chip('initiative', inits.map(i => i.title).join(', ') || 'Initiative groups', `Institution-invited Coach · ${institutionGroups(ctx).length} group(s)`, 'nodes')}</nav>`;
}

/* ----------------------------------------------------- approval states */

const APPROVAL_COPY = {
  None:['Become an Independent Coach', 'Apply through Join as Partner → Coach/Mentor. After Platform Admin approval you can build invite-only Programs and Groups.'],
  Draft:['Your Coach application is a draft', 'Finish and submit it when you are ready. Nothing is reviewed until you submit.'],
  Submitted:['Your Coach application is waiting for review', 'A Platform Admin will review it. You will see the decision here and in your notifications.'],
  'Pending Verification':['Your Coach application is under review', 'Identity and professional details are being checked (simulated verification in this demo).'],
  'Needs More Info':['A little more detail is needed', 'The Platform Admin asked for more information. Respond from your application page.'],
  Rejected:['Your Coach application was not approved', 'You can revise and resubmit it. Your earlier decisions stay in the application history.'],
  Suspended:['Independent Coach access is suspended', 'Your Programs, Groups and every submitted record are preserved, but you cannot operate them until access is restored.']
};
export function approvalPanel(ctx) {
  const status = independentStatus(ctx.s, ctx.person.id), app = coachApplication(ctx.s, ctx.person.id);
  if (status === 'Approved') return '';
  const [title, text] = APPROVAL_COPY[status] || APPROVAL_COPY.None;
  const action = !app ? u.link('Apply as an Independent Coach', 'auth/account/mentor', 'button primary') : ['Draft', 'Needs More Info', 'Rejected'].includes(status) ? u.link('Open my application', `auth/application/mentor`, 'button primary') : u.link('View application status', `auth/application-status/${app.id}`, 'button quiet');
  return `<section class="iw-banner is-${status === 'Suspended' || status === 'Rejected' ? 'critical' : 'warning'} iw-reveal" role="status">${u.icon('shield')}<div><strong>${esc(title)}</strong><p>${esc(text)}</p><small>${esc(INDEPENDENT_REQUIRED)}</small></div>${action}</section>`;
}

/* --------------------------------------------------------- dashboard */

export function dashboard(ctx) {
  const {s, person:p} = ctx, status = independentStatus(s, p.id), programs = ownPrograms(ctx), groups = ownProgramGroups(ctx), today = clockDay(s);
  const first = p.name.split(' ')[0];
  if (status !== 'Approved' && !programs.length) return head({eyebrow:'INDEPENDENT COACH', title:`Welcome, ${first}.`, lead:'Your independent Coach workspace opens once your application is approved.'}) + approvalPanel(ctx) + (coachContexts(ctx).institution ? card('Your Institution teaching', `<p>You also coach Initiative groups. That work does not need independent approval.</p>${u.link('Open Initiative groups', 'mentor/dashboard?scope=initiative', 'button quiet')}`) : '');
  if (!programs.length) return head({eyebrow:'INDEPENDENT COACH · APPROVED', title:`Good to see you, ${first}.`, lead:'Start with a Program: its purpose, a few stages and approved activities. Groups belong to a Program, and students join only through your private invitations.', actions:u.link('Build your first Program', 'mentor/programs/new', 'button primary')})
    + `<ol class="iw-chain is-steps iw-reveal" aria-label="How an independent Program works">${['Build a Program', 'Create a Group under it', 'Publish, then invite privately', 'Assign and review work', 'Report and finalize'].map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol>`
    + emptyState('No Programs yet', 'Independent Programs are invitation-only and never appear in public Explore.', u.link('Build a Program', 'mentor/programs/new', 'button primary'));
  const live = programs.filter(x => ['Published', 'Paused'].includes(x.status)), drafts = programs.filter(x => x.status === 'Draft'), done = programs.filter(x => x.completedAt);
  const students = new Set(groups.flatMap(g => g.memberIds)), subs = groupSubs(s, groups), waiting = subs.filter(x => x.status === 'Submitted');
  const invites = s.invitations.filter(i => groups.some(g => g.id === i.groupId)), pendingInv = invites.filter(i => invitationStatus(s, i) === 'Active');
  const active = s.assignments.filter(a => a.status === 'Active' && groups.some(g => g.id === a.groupId));
  const upcoming = active.filter(a => a.due >= today).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const attentionStudents = [...students].map(pid => { const states = groups.filter(g => g.memberIds.includes(pid)).flatMap(g => tasksFor(s, g, pid).map(a => taskState(s, a, pid))); return {pid, overdue:states.filter(x => x.overdue).length, revision:states.filter(x => x.status === 'Needs Revision').length}; }).filter(x => x.overdue || x.revision);
  const pendingMembers = s.memberships.filter(m => m.status === 'Pending' && groups.some(g => g.id === m.groupId));
  const items = [
    waiting.length && {title:`${waiting.length} submission(s) awaiting your review`, text:'Approve, request a revision or reject with a reason.', href:'mentor/reviews', action:'Review work'},
    pendingMembers.length && {title:`${pendingMembers.length} membership request(s)`, text:'Approval-only groups wait for you after invitation verification.', href:`mentor/groups/${pendingMembers[0].groupId}?tab=members`, action:'Decide'},
    attentionStudents.length && {title:`${attentionStudents.length} student(s) need attention`, text:'Overdue tasks or revisions not yet resubmitted.', href:'mentor/students?attention=1', action:'See students', tone:'critical'},
    drafts.length && {title:`${drafts.length} Program draft(s) unfinished`, text:'Continue the builder, then publish.', href:`mentor/programs/${drafts[0].id}`, action:'Continue'},
    ...live.filter(x => x.end < today).map(x => ({title:`${x.title} has passed its end date`, text:'Review completion eligibility and finalize.', href:`mentor/programs/${x.id}?tab=completion`, action:'Completion'})),
    ...invites.filter(i => invitationStatus(s, i) === 'Expired').slice(0, 2).map(i => ({title:`Invitation to ${i.email} expired`, text:'Resend it for a fresh link, or leave it.', href:`mentor/groups/${i.groupId}?tab=invitations`, action:'Invitations', tone:'critical'}))
  ].filter(Boolean);
  const reviews = subs.filter(x => x.reviewedAt).sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)).slice(0, 5).map(x => ({at:x.reviewedAt, title:`${x.status} · ${s.assignments.find(a => a.id === x.assignmentId)?.title || ''}`, text:nameOf(s, x.studentId)}));
  const notices = (s.notifications || []).filter(n => n.recipientId === p.id && !n.read).slice(0, 4);
  return head({eyebrow:`INDEPENDENT COACH · ${status.toUpperCase()}`, title:`Good to see you, ${first}.`, lead:'Your Programs, groups and the work waiting for a thoughtful response.', actions:`${u.link('Build Program', 'mentor/programs/new', 'button primary')}${u.link('Manage Groups', 'mentor/groups', 'button quiet')}${u.link('Review work', 'mentor/reviews', 'button quiet')}`})
    + approvalPanel(ctx)
    + stats([stat(live.length, 'Active Programs', {href:'mentor/programs', hint:`${drafts.length} draft · ${done.length} completed`}), stat(groups.filter(g => !['Archived'].includes(g.status)).length, 'Groups', {href:'mentor/groups'}), stat(students.size, 'Students', {href:'mentor/students', hint:`${attentionStudents.reduce((n, x) => n + x.overdue, 0)} overdue task(s)`, tone:attentionStudents.length ? 'critical' : ''}), stat(pendingInv.length, 'Pending invitations'), stat(waiting.length, 'Awaiting review', {href:'mentor/reviews', tone:waiting.length ? 'attention' : ''})])
    + `<div class="iw-split">${card('Needs your attention', attention(items), {eyebrow:'FROM YOUR RECORDS'})}${card('Upcoming deadlines', upcoming.length ? `<ul class="iw-mini-list">${upcoming.map(a => `<li><span>${esc(a.title)} · ${esc(s.groups.find(g => g.id === a.groupId)?.name || '')}</span><time>${esc(fmtDate(a.due))}</time></li>`).join('')}</ul>` : '<p class="iw-muted">No task is due in your groups.</p>', {eyebrow:'NEXT 5'})}</div>`
    + `<div class="iw-split">${card('Program completion', live.length ? `<div class="iw-ring-row">${live.slice(0, 3).map(pr => { const roster = completionRoster(s, pr); return ring(roster.filter(r => r.eligible).length, Math.max(1, roster.length), pr.title); }).join('')}</div><p class="iw-muted">Students who currently meet each Program's declared completion rule.</p>` : '<p class="iw-muted">No running Program.</p>', {eyebrow:'ELIGIBILITY'})}${card('Group Garden milestones', groups.length ? `<ul class="iw-mini-list">${groups.filter(g => g.status !== 'Archived').map(g => { const gg = programGroupGarden(s, g.id); return `<li><span>${esc(g.name)}</span><span>${pill(gg.reached ? 'Active' : 'Pending', `${gg.reached}/${gg.total} milestones`)}</span></li>`; }).join('')}</ul>${u.link('Open Group Gardens', 'mentor/group-garden', 'text-link')}` : '<p class="iw-muted">Create a group to start its garden.</p>', {eyebrow:'ONE PER GROUP'})}</div>`
    + `<div class="iw-split">${card('Recent reviews', feed(reviews), {eyebrow:'YOUR DECISIONS'})}${card('Notices', notices.length ? `<ul class="iw-mini-list">${notices.map(n => `<li><span>${esc(n.text)}</span><time>${esc(fmtDate(n.created))}</time></li>`).join('')}</ul>` : '<p class="iw-muted">No unread notices.</p>', {extra:u.link('All notifications', 'mentor/notifications', 'text-link')})}</div>`
    + `<p class="iw-footnote">${u.icon('shield')} Counts come from your Programs' records. Personal Lab, Shield, Recovery and browsing data are never shared with Coaches.</p>`;
}

/* ------------------------------------------------------------ groups */

function groupCard(ctx, g) {
  const {s} = ctx, m = groupWorkMetrics(s, g), gg = programGroupGarden(s, g.id), invites = s.invitations.filter(i => i.groupId === g.id && invitationStatus(s, i) === 'Active').length;
  return `<article class="resource-card iw-reveal" data-search="${esc(`${g.name} ${programName(s, g)} ${g.purpose}`)}" data-status="${esc(g.status)}"><div class="card-top"><span class="card-symbol">${u.icon('people')}</span>${u.badge(g.status)}</div><h2>${esc(g.name)}</h2><p>${esc(g.purpose)}</p><div class="card-meta"><span>${g.memberIds.length} / ${g.capacity} members</span><span>${invites} pending invite(s)</span><span>${m.awaitingReview} to review</span></div><div class="meter" aria-label="${g.memberIds.length} of ${g.capacity} places filled"><span style="width:${Math.min(100, g.memberIds.length / g.capacity * 100)}%"></span></div><small>${u.icon('book')} ${esc(programName(s, g))} · Garden ${gg.reached}/${gg.total}</small><div class="actions" style="margin-top:18px">${u.link('Open circle', `mentor/groups/${g.id}`)}${g.status !== 'Archived' ? u.button('Edit', 'group-edit', {id:g.id}, 'button quiet small') : ''}</div></article>`;
}
export function groupsPage(ctx) {
  const {s} = ctx, groups = ownProgramGroups(ctx), programs = ownPrograms(ctx);
  const canCreate = independentStatus(s, ctx.person.id) === 'Approved';
  const orphan = groups.filter(g => !g.programId);
  return head({eyebrow:'ONE PARENT PROGRAM PER GROUP', title:'Your circles.', lead:'Every independent group belongs to exactly one of your Programs. Students join only through private invitations.', actions:canCreate ? u.button('Create Group', 'group-create') : ''}) + approvalPanel(ctx)
    + u.filterBar(['Open', 'Completed', 'Closed', 'Archived'])
    + (groups.length ? programs.filter(pr => groups.some(g => g.programId === pr.id)).map(pr => `<section class="iw-program-groups"><div class="iw-card-head"><div><p class="eyebrow">PROGRAM · ${esc(pr.status.toUpperCase())}</p><h2>${u.link(pr.title, `mentor/programs/${pr.id}`, 'text-link')}</h2></div>${canCreate && PROGRAM_BUILDABLE.includes(pr.status) ? u.button('Add a group', 'group-create', {program:pr.id}, 'button quiet small') : ''}</div><div class="grid">${groups.filter(g => g.programId === pr.id).map(g => groupCard(ctx, g)).join('')}</div></section>`).join('')
      + (orphan.length ? `<section class="iw-program-groups"><div class="iw-card-head"><div><p class="eyebrow">NEEDS A PARENT PROGRAM</p><h2>Earlier groups</h2></div></div>${u.note('These groups were created before every group needed a Program. Attach each to one of your Programs before inviting or assigning.')}<div class="grid">${orphan.map(g => groupCard(ctx, g)).join('')}</div></section>` : '')
      + '<p class="no-results" hidden>No matching groups.</p>'
      : emptyState(programs.length ? 'Create your first group' : 'Build a Program first', programs.length ? 'Choose the Program it belongs to, a purpose and an optional capacity.' : 'A group always belongs to one Program, so start with the Program.', programs.length ? (canCreate ? u.button('Create a group', 'group-create') : '') : u.link('Build a Program', 'mentor/programs/new', 'button primary')));
}
export function groupForm(ctx, g = {}) {
  const programs = ownPrograms(ctx).filter(pr => PROGRAM_BUILDABLE.includes(pr.status) || pr.id === g.programId);
  return u.select('programId', 'Parent Program', programs.map(pr => [pr.id, `${pr.title} · ${pr.status}`]), g.programId || ctx.localUI.groupProgram || programs[0]?.id, true)
    + u.field('name', 'Group name', g.name || '', 'text', true) + u.area('purpose', 'Purpose', g.purpose || '', true) + u.area('description', 'Description', g.description || '')
    + `<div class="form-grid">${u.field('capacity', 'Participant capacity (your choice)', g.capacity || 12, 'number', true, 'min="1" max="500"')}${u.select('enrollment', 'Enrollment policy', ['Invitation', 'Approval required'], g.enrollment || 'Invitation')}</div>`
    + u.checkbox('approval', 'Require my approval after a student verifies the invitation', g.approval)
    + u.note('A group belongs to exactly one Program. It moves to another Program only before any work has been submitted.');
}
export function groupDetail(ctx, g) {
  const {s} = ctx, tab = ctx.route.query.get('tab') || 'overview', pr = s.programs.find(x => x.id === g.programId), m = groupWorkMetrics(s, g);
  const canOperate = independentStatus(s, ctx.person.id) === 'Approved' && g.status !== 'Archived';
  const canInvite = canOperate && pr?.status === 'Published' && g.status === 'Open';
  let content = '';
  if (tab === 'overview') {
    const gg = programGroupGarden(s, g.id);
    content = stats([stat(g.memberIds.length, 'Members', {of:g.capacity}), stat(m.assignments, 'Tasks', {hint:`${m.approved} approved`}), stat(m.awaitingReview, 'To review', {href:'mentor/reviews'}), stat(m.overdue, 'Overdue', {tone:m.overdue ? 'critical' : ''}), stat(`${gg.reached}/${gg.total}`, 'Garden milestones', {href:`mentor/group-garden?group=${g.id}`})])
      + `<div class="iw-split">${card('Parent Program', pr ? `<h3>${esc(pr.title)} ${pill(pr.status)}</h3><p>${esc(pr.purpose || '')}</p><p class="iw-muted">${esc(fmtDate(pr.start))} – ${esc(fmtDate(pr.end))} · ${pr.stages.length} stage(s) · ${esc(completionPolicyText(pr))}</p>${u.link('Open Program', `mentor/programs/${pr.id}`, 'button quiet small')}` : `${u.note('This earlier group has no parent Program yet. Attach it before inviting or assigning.')}${canOperate ? u.button('Attach to a Program', 'group-edit', {id:g.id}) : ''}`, {eyebrow:'ONE PARENT'})}${card('A shared intention', `<p>${esc(g.purpose)}</p><p>${esc(g.description || '')}</p>${u.note(g.approval ? 'Invited students wait for your approval after verifying.' : 'A verified invited student joins directly.')}<div class="actions">${canInvite ? u.link('Invite students', `mentor/groups/${g.id}?tab=invitations`, 'button quiet small') : ''}${canOperate && pr?.status === 'Published' ? u.button('Assign a task', 'assignment-create', {group:g.id}, 'button quiet small') : ''}${u.link('Group Garden', `mentor/group-garden?group=${g.id}`, 'button quiet small')}${u.link('Report', `mentor/reports?program=${g.programId || ''}&group=${g.id}`, 'button quiet small')}</div>`)}</div>`;
  }
  if (tab === 'members') {
    const rows = g.memberIds.map(pid => { const states = tasksFor(s, g, pid).map(a => taskState(s, a, pid)); return {search:nameOf(s, pid), cells:[u.link(nameOf(s, pid), `mentor/students/${pid}`, 'text-link'), pill('Active'), `${states.filter(x => x.status === 'Approved').length} / ${states.filter(x => x.status !== 'Cancelled').length}`, String(states.filter(x => x.status === 'Needs Revision').length), states.some(x => x.overdue) ? pill('Overdue', `${states.filter(x => x.overdue).length} overdue`) : '—', canOperate ? u.button('Remove from group', 'member-remove', {group:g.id, person:pid}, 'button quiet small') : '']}; });
    const pending = s.memberships.filter(x => x.groupId === g.id && x.status === 'Pending');
    content = u.table(['Student', 'Membership', 'Approved / assigned', 'Needs revision', 'Overdue', 'Action'], rows)
      + card('Pending admission', pending.length ? pending.map(mm => `<div class="attendance-person"><div><strong>${esc(nameOf(s, mm.personId))}</strong><p>${esc(fmtDate(mm.created))} · verified invitation</p></div><div class="actions">${canOperate ? u.button('Approve membership', 'member-approve', {id:mm.id}, 'button primary small') + u.button('Decline', 'member-decline', {id:mm.id}, 'button quiet small') : ''}</div></div>`).join('') : '<p class="iw-muted">No memberships await approval.</p>')
      + u.note('You see only work assigned in this group. Personal Lab, Shield, Recovery and browsing data stay private.');
  }
  if (tab === 'invitations') {
    const list = s.invitations.filter(x => x.groupId === g.id).slice().reverse();
    content = card('Private invitations', `${list.length ? u.table(['Recipient', 'Created · expires', 'Status', 'Actions'], list.map(i => { const st = invitationStatus(s, i); return {search:i.email || i.token, status:st, cells:[`<strong>${esc(i.email || 'Open group link (earlier)')}</strong><p class="iw-muted">${esc(i.token)}</p>`, `${esc(i.created ? fmtDate(i.created) : '—')}<p>expires ${esc(fmtDate(i.expires))}</p>`, `${pill(st)}${i.acceptedBy ? `<p class="iw-muted">by ${esc(nameOf(s, i.acceptedBy))}</p>` : ''}`, `<div class="actions">${st === 'Active' ? u.button('Copy link', 'invite-copy', {token:i.token}, 'button quiet small') + u.link('Preview', `join/${i.token}`, 'button quiet small') : ''}${canInvite && ['Active', 'Expired'].includes(st) && i.email ? u.button('Resend', 'invite-resend', {id:i.id}, 'button quiet small') : ''}${canOperate && ['Active', 'Expired', 'Exhausted'].includes(st) ? u.button('Revoke', 'invite-revoke', {id:i.id}, 'button quiet small') : ''}</div>`]}; })) : '<p class="iw-muted">No invitations yet.</p>'}${canInvite ? u.button('Create invitation', 'invite-create', {group:g.id}, 'button secondary') : u.note(pr?.status === 'Published' ? 'This group is not open for invitations.' : 'Publish the parent Program before inviting. Publishing never admits anyone by itself.')}`, {eyebrow:'NO EMAIL IS SENT · COPY THE DEMO LINK'})
      + u.note('Each invitation is for one email and one use. A wrong email, expired, revoked, replaced or declined link grants nothing.');
  }
  if (tab === 'programs') content = pr ? card(pr.title, `${u.timeline(pr.stages)}${u.link('Open Program', `mentor/programs/${pr.id}`)}`, {eyebrow:`PARENT PROGRAM · VERSION ${pr.version}`}) : emptyState('No parent Program', 'Attach this earlier group to one of your Programs.', canOperate ? u.button('Attach to a Program', 'group-edit', {id:g.id}) : '');
  if (tab === 'activity') {
    const list = s.assignments.filter(a => a.groupId === g.id);
    content = u.table(['Task', 'Due', 'Approved', 'Submitted · revision', 'Overdue', 'Status'], list.map(a => { const people = a.studentId ? [a.studentId] : g.memberIds, states = people.map(pid => taskState(s, a, pid)); return {search:a.title, status:a.status, cells:[`${esc(a.title)}<p class="iw-muted">${esc(a.activity)} · v${a.version || 1}</p>`, esc(fmtDate(a.due)), `${states.filter(x => x.status === 'Approved').length} / ${people.length}`, `${states.filter(x => x.status === 'Submitted').length} · ${states.filter(x => x.status === 'Needs Revision').length}`, String(states.filter(x => x.overdue).length), pill(a.status)]}; }));
  }
  if (tab === 'settings') content = card('Group settings', `<p>Parent Program: <strong>${esc(programName(s, g))}</strong>. Enrollment: ${esc(g.enrollment)}. Capacity: ${g.capacity}. Archiving keeps every submission, review and membership record.</p><ol class="iw-history">${(g.history || []).slice().reverse().map(h => `<li><time>${esc(fmtDate(h.at))}</time><span>${esc(h.change)}${h.reason ? ` · ${esc(h.reason)}` : ''}</span></li>`).join('')}</ol><div class="actions">${canOperate ? u.button('Edit group', 'group-edit', {id:g.id}) + u.button('Archive group', 'group-archive', {id:g.id}, 'button quiet') : ''}</div>`);
  return `<p class="breadcrumbs">${u.link('My Groups', 'mentor/groups', 'text-link')} / ${esc(programName(s, g))}</p>` + head({eyebrow:`GROUP · ${esc(programName(s, g)).toUpperCase()}`, title:g.name, lead:g.purpose, actions:pill(g.status)}) + approvalPanel(ctx)
    + u.tabs(['Overview', 'Members', 'Invitations', 'Programs', 'Activity', 'Settings'].map(x => [x === 'Programs' ? 'Program' : x, `mentor/groups/${g.id}?tab=${x.toLowerCase()}`, x.toLowerCase()]), tab) + content;
}

/* ---------------------------------------------------------- students */

export function studentsPage(ctx) {
  const {s, route:r} = ctx, groups = ownProgramGroups(ctx), programs = ownPrograms(ctx);
  const programId = r.query.get('program') || '', groupId = r.query.get('group') || '', onlyAttention = r.query.get('attention') === '1';
  const scoped = groups.filter(g => (!programId || g.programId === programId) && (!groupId || g.id === groupId));
  const rows = scoped.flatMap(g => g.memberIds.map(pid => { const states = tasksFor(s, g, pid).map(a => taskState(s, a, pid)); return {pid, g, states}; })).filter(x => !onlyAttention || x.states.some(y => y.overdue || y.status === 'Needs Revision'));
  const filter = `<form class="iw-filters" data-form="coach-filter"><label class="field"><span>Program</span><select name="program"><option value="">All Programs</option>${programs.map(pr => `<option value="${esc(pr.id)}" ${pr.id === programId ? 'selected' : ''}>${esc(pr.title)}</option>`).join('')}</select></label><label class="field"><span>Group</span><select name="group"><option value="">All groups</option>${groups.filter(g => !programId || g.programId === programId).map(g => `<option value="${esc(g.id)}" ${g.id === groupId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>${u.checkbox('attention', 'Needs attention only', onlyAttention, '1')}<button class="button quiet small">Apply</button></form>`;
  return head({eyebrow:'GUIDANCE, WITH BOUNDARIES', title:'My Students', lead:'Only current members of your own Program groups. No personal Lab, Shield, Recovery or browsing data.'}) + filter
    + (rows.length ? u.table(['Student', 'Program · group', 'Assigned', 'Submitted', 'Needs revision', 'Approved', 'Overdue', 'Action'], rows.map(({pid, g, states}) => ({search:nameOf(s, pid), cells:[`<div class="person-line">${u.avatar(nameOf(s, pid))}${esc(nameOf(s, pid))}</div>`, `${esc(programName(s, g))}<p class="iw-muted">${esc(g.name)}</p>`, String(states.filter(x => x.status !== 'Cancelled').length), String(states.filter(x => x.status === 'Submitted').length), String(states.filter(x => x.status === 'Needs Revision').length), String(states.filter(x => x.status === 'Approved').length), states.some(x => x.overdue) ? pill('Overdue', String(states.filter(x => x.overdue).length)) : '0', u.link('View participation', `mentor/students/${pid}`, 'button quiet small')]}))) : emptyState('No students in this view', groups.length ? 'Invite students from a group’s Invitations tab.' : 'Create a group under a Program, publish, then invite.', u.link('My Groups', 'mentor/groups', 'button quiet')));
}
export function studentDetail(ctx, pid) {
  const {s} = ctx, groups = ownProgramGroups(ctx).filter(g => g.memberIds.includes(pid) || s.submissions.some(x => x.studentId === pid && s.assignments.some(a => a.id === x.assignmentId && a.groupId === g.id)));
  const pp = s.people.find(x => x.id === pid);
  if (!pp || !groups.length) return null;
  return `<p class="breadcrumbs">${u.link('My Students', 'mentor/students', 'text-link')} / Details</p>` + head({eyebrow:'PROGRAM-RELEVANT PARTICIPATION', title:pp.name, lead:'Only your groups, their tasks and the reviews you gave. Nothing from personal Lab, Shield, Recovery or browsing.'})
    + groups.map(g => { const gg = programGroupGarden(s, g.id), list = tasksFor(s, g, pid); return card(`${g.name} · ${programName(s, g)}`, u.table(['Task', 'Due', 'State', 'Attempts', 'Latest feedback'], list.map(a => { const st = taskState(s, a, pid); return {search:a.title, cells:[`${esc(a.title)}<p class="iw-muted">${esc(a.activity)} · v${a.version || 1}</p>`, esc(fmtDate(a.due)), `${pill(st.status)}${st.overdue ? pill('Overdue') : ''}`, String(st.sub?.attempt || (st.sub ? 1 : 0)), `${esc(st.sub?.feedback || '—')}${st.sub ? ` ${u.link('Open', `mentor/reviews/${st.sub.id}`, 'text-link')}` : ''}`]}; })) + `<p class="iw-muted">Group milestones: ${gg.milestones.filter(m => m.done).map(m => esc(m.title)).join(', ') || 'none yet'}${g.memberIds.includes(pid) ? '' : ' · no longer a member; history kept'}</p>`, {eyebrow:`GROUP · ${esc(g.status).toUpperCase()}`}); }).join('')
    + u.note('Personal Lab results, browsing activity and private Recovery Plans are outside this workspace.');
}

/* ---------------------------------------------------------- programs */

export function programsPage(ctx) {
  const {s} = ctx, programs = ownPrograms(ctx), approved = independentStatus(s, ctx.person.id) === 'Approved';
  return head({eyebrow:'INVITE-ONLY · NEVER IN PUBLIC EXPLORE', title:'Programs', lead:'A clear purpose, a few stages, approved activities and an honest completion rule.', actions:approved ? u.link('Build Program', 'mentor/programs/new', 'button primary') : ''}) + approvalPanel(ctx)
    + u.filterBar(['Draft', 'Published', 'Paused', 'Completed', 'Cancelled', 'Archived'])
    + (programs.length ? `<div class="grid">${programs.map(pr => { const gs = programGroups(s, pr), roster = completionRoster(s, pr), students = new Set(gs.flatMap(g => g.memberIds)).size; return `<article class="resource-card iw-reveal" data-search="${esc(pr.title)}" data-status="${esc(pr.status)}"><div class="card-top"><span class="card-symbol">${u.icon('book')}</span>${pill(pr.status)}</div><h2>${esc(pr.title)}</h2><p>${esc(pr.description || '')}</p><div class="card-meta"><span>${pr.stages.length} stages</span><span>${gs.length} group(s)</span><span>${students} student(s)</span><span>v${pr.version}</span></div><div class="meter" aria-label="${roster.filter(x => x.eligible).length} of ${roster.length} eligible for completion"><span style="width:${roster.length ? roster.filter(x => x.eligible).length / roster.length * 100 : 0}%"></span></div><small>${esc(fmtDate(pr.start))} – ${esc(fmtDate(pr.end))}</small><div class="actions" style="margin-top:18px">${u.link('Open journey', `mentor/programs/${pr.id}`)}</div></article>`; }).join('')}</div><p class="no-results" hidden>No matching programs.</p>`
      : emptyState('Give your future group a direction.', 'Create a Program with meaningful stages and approved activities. Groups are created under it.', approved ? u.link('Build a program', 'mentor/programs/new', 'button primary') : ''));
}
function programActions(ctx, pr) {
  if (independentStatus(ctx.s, ctx.person.id) !== 'Approved') return '';
  const b = (label, action, style = 'button quiet') => u.button(label, action, {id:pr.id}, style);
  if (pr.status === 'Draft') return u.link('Continue builder', `mentor/programs/${pr.id}/edit`, 'button primary') + b('Publish', 'program-publish', 'button secondary') + b('Cancel', 'program-cancel') + b('Archive', 'program-archive');
  if (pr.status === 'Published') return b('Edit future details', 'program-update', 'button secondary') + b('Pause', 'program-pause') + u.link('Finalize completion', `mentor/programs/${pr.id}?tab=completion`, 'button quiet') + b('Cancel', 'program-cancel') + b('Create new revision', 'program-duplicate');
  if (pr.status === 'Paused') return b('Resume', 'program-resume', 'button primary') + b('Edit future details', 'program-update') + u.link('Finalize completion', `mentor/programs/${pr.id}?tab=completion`, 'button quiet') + b('Cancel', 'program-cancel');
  if (['Completed', 'Cancelled'].includes(pr.status)) return b('Archive', 'program-archive') + b('Create new revision', 'program-duplicate');
  return b('Create new revision', 'program-duplicate');
}
export function programDetail(ctx, pr) {
  const {s} = ctx, tab = ctx.route.query.get('tab') || 'overview', groups = programGroups(s, pr);
  const approved = independentStatus(s, ctx.person.id) === 'Approved';
  let content = '';
  if (tab === 'overview') {
    const m = programMetrics(s, pr);
    content = stats([stat(groups.length, 'Groups'), stat(m.students, 'Students'), stat(m.assignments, 'Tasks'), stat(m.awaitingReview, 'Awaiting review'), stat(m.eligible, 'Eligible to complete', {of:Math.max(m.students, m.eligible), hint:`${m.completed} completion record(s)`})])
      + `<div class="iw-split">${card('Program details', `<dl class="preview-facts"><div><dt>Objective</dt><dd>${esc(pr.purpose || '—')}</dd></div><div><dt>Audience</dt><dd>${esc(pr.audience || 'Not specified')}</dd></div><div><dt>Eligibility</dt><dd>${esc(pr.eligibility || 'Invitation by the Coach')}</dd></div><div><dt>Focus</dt><dd>${esc(pr.focus || '—')}</dd></div><div><dt>Dates</dt><dd>${esc(fmtDate(pr.start))} – ${esc(fmtDate(pr.end))}</dd></div><div><dt>Activities</dt><dd>${esc(pr.activities.join(', ') || '—')} · ${pr.required !== false ? 'required' : 'optional'}</dd></div><div><dt>Review</dt><dd>${esc(pr.review || 'Coach review')}</dd></div><div><dt>Invitations</dt><dd>Private, one email per link · expire after ${esc(pr.invitationPolicy?.expiryDays || 14)} days</dd></div><div><dt>Student consent</dt><dd>${esc(pr.consentPolicy || '')}</dd></div><div><dt>Completion</dt><dd>${esc(completionPolicyText(pr))} <small class="iw-muted">(configurable demo policy)</small></dd></div></dl>${pr.cancelReason ? u.note(`Cancelled: ${pr.cancelReason}`) : ''}`, {eyebrow:`VERSION ${pr.version} · ${pr.status.toUpperCase()}`})}${card('One stage at a time', u.timeline(pr.stages.map(st => ({...st, description:st.objective})) ))}</div>`
      + card('Groups in this Program', groups.length ? `<div class="grid">${groups.map(g => groupCard(ctx, g)).join('')}</div>` : '<p class="iw-muted">No group yet. A Program can be published without one; add groups any time it is running.</p>', {extra:approved && PROGRAM_BUILDABLE.includes(pr.status) ? u.button('Add a group', 'group-create', {program:pr.id}, 'button quiet small') : ''});
  }
  if (tab === 'assignments') {
    const list = s.assignments.filter(a => groups.some(g => g.id === a.groupId));
    content = u.table(['Task', 'Stage', 'Group', 'Due', 'Version', 'Status'], list.map(a => ({search:a.title, status:a.status, cells:[`${esc(a.title)}<p class="iw-muted">${esc(a.activity)}</p>`, esc(pr.stages.find(st => st.id === a.stageId)?.title || 'Direct task'), esc(s.groups.find(g => g.id === a.groupId)?.name || ''), esc(fmtDate(a.due)), `v${a.version || 1}`, `${pill(a.status)}${a.cancelReason ? `<p class="iw-muted">${esc(a.cancelReason)}</p>` : ''}`]})))
      + u.note('Editing a Program never rewrites submitted work: new stages add future tasks, and rescheduling keeps the earlier version in each task’s history.');
  }
  if (tab === 'completion') {
    const roster = completionRoster(s, pr), waiting = groupSubs(s, groups).filter(x => x.status === 'Submitted').length;
    const canFinalize = approved && ['Published', 'Paused'].includes(pr.status);
    content = stats([stat(roster.length, 'Students'), stat(roster.filter(r => r.eligible).length, 'Currently eligible', {of:Math.max(1, roster.length)}), stat(waiting, 'Awaiting review', {tone:waiting ? 'attention' : ''}), stat(roster.filter(r => r.record?.status === 'Completed').length, 'Completed records')])
      + card('Declared completion criteria', `<p><strong>${esc(completionPolicyText(pr))}</strong> — counted per student from the required tasks of their group. Cancelled tasks never count.</p>${u.note('Configurable demo policy, not a permanent requirement. Completion adds history and one collective Group Garden milestone. It never adds a Personal Garden object and never changes Lab or Recovery results.')}`, {eyebrow:'RULE'})
      + u.table(['Student', 'Group', 'Required approved', 'Eligibility', 'Recorded outcome'], roster.map(r => ({search:nameOf(s, r.personId), cells:[esc(nameOf(s, r.personId)), esc(r.group.name), `${r.approved} / ${r.needed}${r.needed !== r.required ? ` (of ${r.required})` : ''}`, `${pill(r.eligible ? 'Approved' : 'Pending', r.eligible ? 'Eligible' : 'Not yet')}<p class="iw-muted">${esc(r.reason)}</p>`, r.record ? pill(r.record.status === 'Completed' ? 'Completed' : 'Declined', r.record.status) : '—']})))
      + (canFinalize ? `<div class="actions">${u.button('Finalize Program completion', 'program-complete', {id:pr.id}, 'button primary')}</div>${waiting ? u.note(`Review the ${waiting} waiting submission(s) first.`) : ''}` : pr.completedAt ? u.note(`Completed ${fmtDate(pr.completedAt)}. The records above are final; the Program stays readable in reports and history.`) : '');
  }
  if (tab === 'link') content = linkTab(ctx, pr);
  if (tab === 'history') content = card('Program history', `<ol class="iw-history">${(pr.history || []).slice().reverse().map(h => `<li><time>${esc(fmtDate(h.at || h.published))}</time><span>${esc(h.change || `Published version ${h.version}`)}${h.version ? ` · v${h.version}` : ''}${h.reason ? ` · ${esc(h.reason)}` : ''}${h.summary ? ` · ${esc(h.summary)}` : ''}${h.fields?.length ? ` · ${esc(h.fields.join(', '))}` : ''}${h.stagesAdded?.length ? ` · new stage(s): ${esc(h.stagesAdded.join(', '))}` : ''}</span></li>`).join('')}</ol>`, {eyebrow:'NEVER REWRITTEN'});
  return `<p class="breadcrumbs">${u.link('Programs', 'mentor/programs', 'text-link')} / Details</p>` + head({eyebrow:'INDEPENDENT PROGRAM · INVITE-ONLY', title:pr.title, lead:pr.description, actions:pill(pr.status)}) + approvalPanel(ctx)
    + `<div class="actions iw-program-actions">${programActions(ctx, pr)}</div>`
    + u.tabs([['Overview', 'overview'], ['Tasks', 'assignments'], ['Completion', 'completion'], ['Institution link', 'link'], ['History', 'history']].map(([label, key]) => [label, `mentor/programs/${pr.id}?tab=${key}`, key]), tab) + content;
}
function linkTab(ctx, pr) {
  const {s} = ctx, links = (s.programLinks || []).filter(l => l.programId === pr.id);
  const options = s.initiatives.filter(i => ['Published', 'Active'].includes(i.status));
  const canPropose = independentStatus(s, ctx.person.id) === 'Approved' && ['Published', 'Paused'].includes(pr.status) && options.length;
  return card('Optional link to an Institution Initiative', `<p>A link lets an Institution see agreed <strong>aggregate</strong> participation for this Program. Your Program, its groups, memberships, tasks, submissions, reviews and reports stay yours; nothing is copied and the Program never appears in public Explore.</p>${links.length ? u.table(['Initiative', 'Status', 'Shares', 'Actions'], links.map(l => ({cells:[esc(s.initiatives.find(i => i.id === l.initiativeId)?.title || ''), pill(l.status === 'Active' ? 'Active' : l.status), esc(l.shares), ['Proposed', 'Active'].includes(l.status) ? u.button('End link', 'link-end', {id:l.id}, 'button quiet small') : '']}))) : '<p class="iw-muted">No link proposed.</p>'}${canPropose ? u.button('Propose a link', 'link-propose', {id:pr.id}, 'button secondary') : ''}`, {eyebrow:'OWNERSHIP STAYS WITH YOU'});
}

/* ------------------------------------------------------- Group Garden */

export function gardenPage(ctx) {
  const {s, route:r} = ctx, groups = ownProgramGroups(ctx).filter(g => g.programId);
  if (!groups.length) return head({eyebrow:'GROUP GARDEN · ONE PER GROUP', title:'Group Gardens'}) + emptyState('No group garden yet', 'Each of your Program groups has its own collective garden.', u.link('My Groups', 'mentor/groups', 'button quiet'));
  const g = groups.find(x => x.id === r.query.get('group')) || groups[0], gg = programGroupGarden(s, g.id);
  return gardenView(gg, `<label class="iw-scope is-select">${u.icon('people')}<span class="sr-only">Group</span><select data-action="coach-garden-group">${groups.map(x => `<option value="${esc(x.id)}" ${x.id === g.id ? 'selected' : ''}>${esc(x.name)} · ${esc(programName(s, x))}</option>`).join('')}</select></label>`, 'coach');
}
/** Shared by the Coach page and the Invited Student's Group Garden. */
export function gardenView(gg, meta, role) {
  return head({eyebrow:`GROUP GARDEN · ${esc(gg.program?.title || '').toUpperCase()}`, title:gg.group.name, lead:'One collective garden for this group. It grows only through bounded milestones from approved, Coach-reviewed work — never from joining, clicking, retries or repeated reviews.', meta})
    + stats([stat(gg.count, 'Approved tasks'), stat(gg.contributors, 'Contributing members', {of:Math.max(1, gg.group.members)}), stat(`${gg.reached}/${gg.total}`, 'Milestones reached'), stat(`${gg.stage}/5`, 'Collective stage')])
    + `<div class="iw-split is-garden"><div class="iw-garden iw-reveal" data-stage="${gg.stage}">${collectiveScene(gg.stage, gg.completed).replace('Initiative completed', 'Program completed').replace(', initiative completed', ', program completed')}<p class="iw-garden-caption">${gg.reached === gg.total ? 'Every collective milestone reached.' : `Next: “${esc(gg.milestones.find(m => !m.done)?.title || '')}”.`}</p></div>
      ${card('Collective milestones', `<ol class="iw-milestones">${gg.milestones.map((m, i) => `<li class="${m.done ? 'is-done' : ''}${m.done && m.key === 'completed' ? ' is-final' : ''}"><span>${m.done ? '✓' : i + 1}</span><div><strong>${esc(m.title)}</strong><small>${esc(m.note)}</small></div></li>`).join('')}</ol><p class="iw-muted">Stage quorum ${Math.round(PROGRAM_GARDEN_POLICY.stageQuorum * 100)}% is a configurable demo policy. Each approved submission counts once.</p>`, {eyebrow:'SOURCE-BACKED'})}</div>`
    + card('Recent contributions', gg.recent.length ? `<ul class="iw-mini-list">${gg.recent.map(c => `<li><span>Approved task · ${esc(c.title)}</span><time>${esc(fmtDate(c.on))}</time></li>`).join('')}</ul>` : '<p class="iw-muted">The first contribution is still ahead.</p>', {extra:`<small class="iw-muted">${role === 'coach' ? 'A Coach cannot grow the garden by hand' : 'Contributor names are not shown here'}</small>`});
}

/* ------------------------------------------------------------ reports */

export function reportsPage(ctx) {
  const {s, person:p, route:r} = ctx, programs = ownPrograms(ctx);
  if (!programs.length) return head({eyebrow:'COACH REPORTS', title:'Reports'}) + emptyState('No Program to report on yet', 'Reports are computed from a Program’s tasks, submissions and reviews.', u.link('Build a Program', 'mentor/programs/new', 'button quiet'));
  const pr = programs.find(x => x.id === r.query.get('program')) || programs.find(x => ['Published', 'Paused'].includes(x.status)) || programs[0];
  const groups = programGroups(s, pr), groupId = groups.some(g => g.id === r.query.get('group')) ? r.query.get('group') : '';
  const from = r.query.get('from') || pr.start, to = r.query.get('to') || [pr.end, clockDay(s)].sort()[0];
  const m = programMetrics(s, pr, {groupId, from, to});
  const mine = (s.coachReports || []).filter(x => x.programId === pr.id && x.authorId === p.id), draft = mine.find(x => x.status === 'Draft' && (x.groupId || '') === groupId);
  const approved = independentStatus(s, p.id) === 'Approved';
  return head({eyebrow:'COACH REPORT · NO SUPERVISOR STEP', title:pr.title, lead:'Counts are computed from this Program’s records. Your observations stay with the Program and its history.', actions:u.button('Export CSV', 'report-export', {program:pr.id, group:groupId, from, to}, 'button secondary')})
    + `<form class="iw-filters" data-form="coach-preport-scope"><label class="field"><span>Program</span><select name="program">${programs.map(x => `<option value="${esc(x.id)}" ${x.id === pr.id ? 'selected' : ''}>${esc(x.title)} · ${esc(x.status)}</option>`).join('')}</select></label><label class="field"><span>Group</span><select name="group"><option value="">All groups</option>${groups.map(g => `<option value="${esc(g.id)}" ${g.id === groupId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>${u.field('from', 'Period from', from, 'date', true)}${u.field('to', 'Period to', to, 'date', true)}<button class="button quiet small">Update</button></form>`
    + stats4([stat(m.students, 'Students'), stat(m.assignments, 'Tasks assigned'), stat(m.submitted, 'Submitted in period'), stat(m.approved, 'Approved'), stat(m.needsRevision, 'Needs revision'), stat(m.rejected, 'Rejected'), stat(m.overdue, 'Overdue', {tone:m.overdue ? 'critical' : ''}), stat(m.eligible, 'Eligible to complete', {of:Math.max(1, m.students)})])
    + `<div class="iw-split">${card('Review outcomes in period', bars([{label:'Approved', value:m.approved}, {label:'Needs revision', value:m.needsRevision, tone:'attention'}, {label:'Rejected', value:m.rejected, tone:'critical'}, {label:'Awaiting review', value:m.awaitingReview}, {label:'Overdue', value:m.overdue, tone:'critical'}]), {eyebrow:'FROM SUBMISSIONS & REVIEWS'})}${card('Approvals by week', bars(m.trend.map(t => ({label:`Week of ${fmtDate(t.week)}`, value:t.value}))), {eyebrow:'TREND'})}</div>`
    + `<div class="iw-split">${card('Completion measures', `<div class="iw-ring-row">${ring(m.eligible, Math.max(1, m.students), 'Currently eligible')}${ring(m.completed, Math.max(1, m.students), 'Completion recorded')}</div><p class="iw-muted">${esc(completionPolicyText(pr))} (configurable demo policy).</p>`, {eyebrow:'SOURCE-BACKED'})}
      ${card('Your observations', approved ? `<form data-form="coach-preport" data-program="${esc(pr.id)}" data-group="${esc(groupId)}" data-from="${esc(from)}" data-to="${esc(to)}" data-id="${esc(draft?.id || '')}">${u.area('observations', 'Observations', draft?.observations || '', true)}${u.area('concerns', 'Concerns (optional)', draft?.concerns || '')}${u.area('recommendations', 'Next steps (optional)', draft?.recommendations || '')}<p class="form-error" role="alert"></p><div class="actions"><button class="button quiet" name="intent" value="draft">Save draft</button><button class="button primary" name="intent" value="submit">Finalize report</button></div></form>` : approvalPanel(ctx), {eyebrow:'YOUR WORDS · COUNTS ARE AUTOMATIC'})}</div>`
    + card('Report history', mine.length ? u.table(['Scope', 'Period', 'Status', 'Approved', 'Overdue', 'Finalized'], mine.slice().reverse().map(x => ({cells:[esc(x.groupId ? s.groups.find(g => g.id === x.groupId)?.name || 'Group' : 'All groups'), `${esc(fmtDate(x.period.from))} – ${esc(fmtDate(x.period.to))}`, pill(x.status), String(x.metrics.approved), String(x.metrics.overdue), x.submitted ? esc(fmtDate(x.submitted)) : '—']}))) : '<p class="iw-muted">No reports yet.</p>');
}
/** Per-student CSV rows for the selected Program scope. */
export function reportRows(s, pr, groupId) {
  return programGroups(s, pr).filter(g => !groupId || g.id === groupId).flatMap(g => g.memberIds.flatMap(pid => tasksFor(s, g, pid).map(a => { const st = taskState(s, a, pid); return [nameOf(s, pid), g.name, a.title, a.due, st.status + (st.overdue ? ' (overdue)' : ''), st.sub?.attempt || 0, st.sub?.reviewedAt ? String(st.sub.reviewedAt).slice(0, 10) : '']; })));
}
export {COMPLETION_RULES};
