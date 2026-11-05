/**
 * Institution Initiative Supervisor — a first-class operational context
 * alongside the existing Provider appointment pages. Scope = active
 * Initiative grants only; a revoked grant shows access-ended, never a stale
 * roster.
 */
import * as u from '../../ui.js';
import {esc,nameOf,pill,head,stats,stat,card,attention,emptyState,summary,initiativeSwitcher,withInitiative,fmtDate,sessionWhen,personCell} from './common.js';
import {today} from '../../initiative-rules.js';

export function supervisorScope(ctx) {
  const {s, person:p} = ctx;
  return {active:s.initiatives.filter(i => (s.grants || []).some(g => g.personId === p.id && g.role === 'supervisor' && g.scopeId === i.id && g.status === 'Active') && !['Cancelled','Archived'].includes(i.status)),
    ended:(s.grants || []).filter(g => g.personId === p.id && g.role === 'supervisor' && g.status !== 'Active')};
}

export function renderSupervisorDashboard(ctx, providerBlock) {
  const {s, person:p} = ctx, {active, ended} = supervisorScope(ctx);
  const pendingInvites = (s.staffInvites || []).filter(x => x.role === 'supervisor' && x.status === 'Pending' && x.email === p.email.toLowerCase());
  const invites = pendingInvites.length ? card('Invitations waiting for you', `<ul class="iw-attention">${pendingInvites.map(x => `<li class="is-attention"><span class="iw-dot"></span><div><strong>${esc(s.initiatives.find(i => i.id === x.initiativeId)?.title)}</strong><p>Supervisor invitation · expires ${esc(fmtDate(x.expires))}</p></div>${u.link('Open invitation', `auth/staff-invitation/${x.token}`, 'button primary small')}</li>`).join('')}</ul>`, {eyebrow:'NEW'}) : '';
  const endedBlock = ended.length ? card('Ended appointments', `<ul class="iw-mini-list">${ended.map(g => `<li><span>${esc(s.initiatives.find(i => i.id === g.scopeId)?.title || 'Initiative')}</span><small>${esc(g.status)} ${esc(fmtDate(g.revokedAt))}${g.reason ? ` · ${esc(g.reason)}` : ''}</small></li>`).join('')}</ul><p class="iw-muted">Access to these rosters has ended. Records you authored remain attributed to you.</p>`) : '';
  // Provider-only Supervisors keep the original Provider dashboard (its own heading).
  if (!active.length) return invites + endedBlock + providerBlock;
  const i = active.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || active[0];
  ctx.localUI.initiativeId = i.id;
  const sum = summary(s, i), day = today(s);
  const duty = sum.sessions.filter(ss => (ss.supervisorIds || []).includes(p.id) && ss.status === 'Published').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const openDuty = duty.filter(ss => !ss.closedOut && ss.date <= day);
  const alerts = [
    ...sum.needsSupervisor.map(ss => ({tone:'critical', title:`Needs Supervisor · ${ss.title}`, text:`${sessionWhen(ss)}. You can take the duty yourself.`, href:`supervisor/schedule/${ss.id}?initiative=${i.id}`, action:'Assign'})),
    ...(sum.pending ? [{title:`${sum.pending} application(s) pending`, text:'You can approve eligible applicants.', href:withInitiative('supervisor/applications', i), action:'Review'}] : []),
    ...openDuty.map(ss => ({title:`Attendance open · ${ss.title}`, text:'Record attendance and close the session when it ends.', href:`supervisor/attendance?session=${ss.id}`, action:'Open desk'})),
    ...(sum.excusesForSup.length ? [{title:`${sum.excusesForSup.length} excuse(s) need your recommendation`, href:withInitiative('supervisor/excuses', i), action:'Recommend'}] : []),
    ...(sum.unallocated.length ? [{title:`${sum.unallocated.length} accepted student(s) without a group`, href:withInitiative('supervisor/students', i), action:'Allocate'}] : []),
    ...sum.groups.filter(g => !g.coachId).map(g => ({title:`${g.name} has no Coach`, href:withInitiative('supervisor/students', i), action:'Allocate Coach'}))
  ];
  return `<section class="iw-hero is-supervisor iw-reveal"><div class="iw-hero-copy"><p class="eyebrow">INITIATIVE SUPERVISOR · ${esc(s.organizations.find(o => o.id === i.ownerId)?.name || '')}</p><h1>Steady hands for ${esc(i.title)}.</h1><p class="iw-lead">You can approve applications, organise groups and Coaches, record factual attendance and recommend on excuses. Discipline and final decisions stay with the Representative.</p><div class="actions">${u.link('Attendance desk', 'supervisor/attendance', 'button primary')}${u.link('Insights', withInitiative('supervisor/reports', i), 'button quiet')}</div></div><div class="iw-hero-badge"><span class="iw-verified">${u.icon('shield')}Active appointment</span>${initiativeSwitcher(ctx, active, i)}</div></section>`
    + invites
    + stats([stat(sum.accepted, 'Accepted students', {of:sum.cap}), stat(sum.pending, 'Pending applications', {href:withInitiative('supervisor/applications', i), tone:sum.pending ? 'attention' : ''}), stat(sum.groups.length, 'Groups', {hint:`${sum.coaches.length} active Coach(es)`, href:withInitiative('supervisor/students', i)}), stat(duty.length, 'Your session duty', {href:'supervisor/schedule'}), stat(sum.excusesForSup.length, 'Excuses to recommend', {href:withInitiative('supervisor/excuses', i), tone:sum.excusesForSup.length ? 'attention' : ''})])
    + `<div class="iw-split is-wide">${card('Operational alerts', attention(alerts), {eyebrow:'NOW'})}${card('Your next duty', duty.length ? `<ol class="iw-agenda">${duty.slice(0, 4).map(ss => `<li><time><b>${esc(new Date(ss.date + 'T12:00').getDate())}</b><span>${esc(new Date(ss.date + 'T12:00').toLocaleDateString('en-GB', {month:'short'}))}</span></time><div><strong>${esc(ss.title)}</strong><small>${esc(ss.time)} · ${esc(ss.format)}</small></div>${u.link(ss.closedOut ? 'Review' : 'Desk', `supervisor/attendance?session=${ss.id}`, 'button quiet small')}</li>`).join('')}</ol>` : '<p class="iw-muted">No sessions assigned to you yet.</p>', {extra:u.link('Schedule', 'supervisor/schedule', 'text-link')})}</div>`
    + card('Coach reports', sum.coachReports.length ? `<ul class="iw-mini-list">${sum.coachReports.slice(-4).reverse().map(r => `<li><span>${esc(s.groups.find(g => g.id === r.groupId)?.name)} · ${esc(nameOf(s, r.authorId))}</span><small>${esc(fmtDate(r.submitted))}</small></li>`).join('')}</ul>` : '<p class="iw-muted">No Coach reports submitted yet.</p>', {extra:u.link('Insights', withInitiative('supervisor/reports', i), 'text-link')})
    + endedBlock + providerBlock;
}

export function renderCoaches(ctx) {
  const {s} = ctx, {active} = supervisorScope(ctx);
  const i = active.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || active[0];
  if (!i) return head({eyebrow:'SUPERVISOR · COACHES', title:'Coaches'}) + emptyState('No active Initiative appointment.', 'Coaches are visible for initiatives where you are an active Supervisor.');
  ctx.localUI.initiativeId = i.id;
  const sum = summary(s, i);
  const rows = sum.coaches.map(g => {
    const groups = sum.groups.filter(x => x.coachId === g.personId);
    const subs = s.submissions.filter(x => s.assignments.some(a => a.id === x.assignmentId && groups.some(gr => gr.id === a.groupId)));
    const reports = sum.coachReports.filter(r => r.authorId === g.personId);
    return {search:nameOf(s, g.personId), cells:[personCell(s, g.personId), groups.length ? esc(groups.map(x => `${x.name} (${x.memberIds.length})`).join(', ')) : pill('Pending', 'No group yet'), String(s.assignments.filter(a => groups.some(x => x.id === a.groupId) && a.status !== 'Cancelled').length), `${subs.filter(x => x.status === 'Submitted').length}<small>awaiting review</small>`, reports.length ? `${reports.length}<small>last ${esc(fmtDate(reports.at(-1).submitted))}</small>` : '<small>None yet</small>']};
  });
  return head({eyebrow:'SUPERVISOR · COACHES', title:'Coaches', lead:'Allocate Coaches who already accepted an invitation to this initiative. Only the Representative can invite or revoke staff.', meta:initiativeSwitcher(ctx, active, i), actions:u.button('Request additional staff', 'staff-request', {initiative:i.id}, 'button quiet')})
    + stats([stat(sum.coaches.length, 'Active Coaches'), stat(sum.groups.filter(g => g.coachId).length, 'Groups with a Coach', {of:sum.groups.length}), stat(sum.submissions.filter(x => x.status === 'Submitted').length, 'Submissions awaiting review'), stat(sum.coachReports.length, 'Coach reports')])
    + card('Workload', rows.length ? u.table(['Coach','Groups','Tasks set','Reviews','Reports'], rows) : '<p class="iw-muted">No Coach has accepted an invitation yet.</p>')
    + card('Allocate Coaches to groups', sum.groups.length ? `<ul class="iw-mini-list">${sum.groups.map(g => `<li><span>${esc(g.name)} · ${g.memberIds.length} students</span><label class="iw-inline"><span class="sr-only">Coach for ${esc(g.name)}</span><select data-action="group-coach" data-group="${esc(g.id)}"><option value="">No Coach</option>${sum.coaches.map(c => `<option value="${esc(c.personId)}" ${c.personId === g.coachId ? 'selected' : ''}>${esc(nameOf(s, c.personId))}</option>`).join('')}</select></label></li>`).join('')}</ul>` : '<p class="iw-muted">Create groups in Students & Groups first.</p>', {eyebrow:'HANDOVER IS RECORDED'});
}
