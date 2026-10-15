/**
 * Applications & Students — one queue over the original Application records.
 * The Representative and an active Supervisor see the same IDs. Buttons
 * reflect authority, but every command re-checks it.
 */
import * as u from '../../ui.js';
import {esc,nameOf,emailOf,pill,head,stats,stat,card,personCell,tabs,emptyState,summary,initiativeSwitcher,withInitiative,fmtDate} from './common.js';
import {seatCap,seatsUsed} from '../../initiative-rules.js';

const GROUPS = {
  pending:['Pending'], accepted:['Accepted'], waitlist:['Queued','Offered'], suspended:['Suspended'], ended:['Rejected','Removed','Blocked','Withdrawn','Declined','Expired','Closed','Completed']
};
const LABEL = {pending:'Pending', accepted:'Accepted', waitlist:'Waiting list', suspended:'Suspended', ended:'Closed & history'};

function attendanceSummary(s, initiativeId, pid) {
  const rows = (s.sessionAttendance || []).filter(a => a.initiativeId === initiativeId && a.personId === pid);
  if (!rows.length) return '<small>No attendance yet</small>';
  const excused = rows.filter(a => a.status === 'Absent' && (s.excuses || []).some(e => e.attendanceId === a.id && e.status === 'Accepted')).length;
  return `<small>${rows.filter(a => a.status !== 'Absent').length} attended · ${rows.filter(a => a.status === 'Absent').length} absent${excused ? ` (${excused} excused)` : ''}</small>`;
}
function taskSummary(s, initiativeId, pid) {
  const groups = s.groups.filter(g => g.initiativeId === initiativeId && g.parentType === 'initiative');
  const assignments = s.assignments.filter(a => groups.some(g => g.id === a.groupId && (g.memberIds.includes(pid))) && a.status !== 'Cancelled' && (!a.studentId || a.studentId === pid));
  const approved = s.submissions.filter(x => x.studentId === pid && x.status === 'Approved' && assignments.some(a => a.id === x.assignmentId)).length;
  return assignments.length ? `<small>${approved}/${assignments.length} tasks approved</small>` : '<small>No tasks yet</small>';
}

export function renderParticipants(ctx, {role, initiatives, base}) {
  const {s, route:r} = ctx;
  const i = initiatives.find(x => x.id === (r.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives.find(x => x.status === 'Published') || initiatives[0];
  if (!i) return head({eyebrow:'APPLICATIONS & STUDENTS', title:'Applications & Students'}) + emptyState('No initiative in your scope yet.', role === 'rep' ? 'Create and publish an initiative to start receiving applications.' : 'Accept a Supervisor invitation to see its applications.', role === 'rep' ? u.link('Create an initiative', 'organization/initiatives/new', 'button primary') : '');
  ctx.localUI.initiativeId = i.id;
  const tab = r.query.get('status') || (s.admissions.some(a => a.initiativeId === i.id && a.status === 'Pending') ? 'pending' : 'accepted');
  const all = s.admissions.filter(a => a.initiativeId === i.id);
  const list = all.filter(a => GROUPS[tab]?.includes(a.status)).sort((a, b) => String(a.queuedAt || a.created).localeCompare(String(b.queuedAt || b.created)));
  const sum = summary(s, i);
  const groups = sum.groups;
  const rows = list.map(a => {
    const group = groups.find(g => g.memberIds.includes(a.personId));
    const acts = [];
    if (a.status === 'Pending') acts.push(u.button(seatsUsed(s, i.id) >= seatCap(i) ? 'Approve → waiting list' : 'Approve', 'app-approve', {id:a.id}, 'button primary small'));
    if (role === 'rep') {
      if (['Pending','Queued'].includes(a.status)) acts.push(u.button('Reject', 'app-decide', {id:a.id, kind:'reject'}, 'button quiet small'));
      if (a.status === 'Accepted') acts.push(u.button('Suspend', 'app-decide', {id:a.id, kind:'suspend'}, 'button quiet small'));
      if (a.status === 'Suspended') acts.push(u.button('Restore', 'app-decide', {id:a.id, kind:'restore'}, 'button quiet small'));
      if (['Accepted','Suspended'].includes(a.status)) acts.push(u.button('Remove', 'app-decide', {id:a.id, kind:'remove'}, 'button quiet small'));
    }
    acts.push(u.button('Details', 'app-detail', {id:a.id}, 'button quiet small'));
    return {search:`${nameOf(s, a.personId)} ${emailOf(s, a.personId)} ${a.code}`, status:a.status, cells:[
      personCell(s, a.personId, esc(emailOf(s, a.personId))),
      `<code class="iw-code">${esc(a.code)}</code><small>${esc(fmtDate(a.created))}</small>`,
      `<small>Age ${esc(a.answers?.age ?? '—')} · ${esc(a.mode || '—')}</small>`,
      group ? `${esc(group.name)}<small>${group.coachId ? `Coach ${esc(nameOf(s, group.coachId))}` : 'No Coach yet'}</small>` : (a.status === 'Accepted' ? pill('Unallocated', 'Unallocated') : '<small>—</small>'),
      `${attendanceSummary(s, i.id, a.personId)}${taskSummary(s, i.id, a.personId)}`,
      `${pill(a.status)}${a.status === 'Offered' ? `<small>until ${esc(fmtDate(a.offer?.expires))}</small>` : ''}${a.status === 'Queued' ? `<small>#${all.filter(x => x.status === 'Queued').sort((x, y) => String(x.queuedAt).localeCompare(String(y.queuedAt))).findIndex(x => x.id === a.id) + 1} in queue</small>` : ''}`,
      `<div class="actions">${acts.join('')}</div>`
    ]};
  });
  const counts = Object.fromEntries(Object.entries(GROUPS).map(([k, v]) => [k, all.filter(a => v.includes(a.status)).length]));
  return head({eyebrow:role === 'rep' ? 'ADMISSIONS · ONE SHARED QUEUE' : 'SUPERVISOR · SHARED APPLICATION QUEUE', title:'Applications & Students', lead:role === 'rep' ? 'The same Application records your Supervisors and the applicants see. One approval gives one seat.' : 'You can approve eligible applications. Rejection and discipline stay with the Representative.', meta:initiativeSwitcher(ctx, initiatives, i)})
    + stats([stat(sum.accepted, 'Accepted students', {of:sum.cap, hint:`${sum.seatsUsed} seats in use incl. suspended & held offers`}), stat(sum.pending, 'Pending applications', {tone:sum.pending ? 'attention' : ''}), stat(sum.queued + sum.offered, 'Waiting list', {hint:sum.offered ? `${sum.offered} seat offer(s) open` : 'Offers hold a seat for 24 h'}), stat(sum.unallocated.length, 'Accepted, no group', {href:withInitiative(base, i), tone:sum.unallocated.length ? 'attention' : ''})])
    + tabs(Object.keys(GROUPS).map(k => [LABEL[k], withInitiative(`${r.area}/${r.page}?status=${k}`, i), k, counts[k]]), tab)
    + `<div class="iw-card iw-reveal">${u.filterBar()}${list.length ? u.table(['Student','Application ID','Eligibility','Group','Participation','Status','Actions'], rows) : `<p class="iw-muted">No ${LABEL[tab].toLowerCase()} records for ${esc(i.title)}.</p>`}</div>`
    + `<p class="iw-footnote">${u.icon('shield')}Staff see participation for this initiative only. Personal Lab, Shield and Recovery data are never shown here. ${role === 'rep' ? 'Only Platform Admin can ban a whole account.' : ''}</p>`;
}

export function applicationDetail(ctx, id, role) {
  const {s} = ctx, a = s.admissions.find(x => x.id === id), i = s.initiatives.find(x => x.id === a.initiativeId);
  const group = s.groups.find(g => g.initiativeId === i.id && g.memberIds.includes(a.personId));
  const att = (s.sessionAttendance || []).filter(x => x.initiativeId === i.id && x.personId === a.personId);
  const body = `<div class="iw-detail">
    <div class="iw-detail-head">${personCell(s, a.personId, esc(emailOf(s, a.personId)))}${pill(a.status)}</div>
    <dl class="iw-facts"><div><dt>Application ID</dt><dd><code class="iw-code">${esc(a.code)}</code></dd></div><div><dt>Initiative</dt><dd>${esc(i.title)}</dd></div><div><dt>Age (eligibility ${esc(i.minAge || 0)}–${esc(i.maxAge || 'any')})</dt><dd>${esc(a.answers?.age ?? '—')}</dd></div><div><dt>Preferred mode</dt><dd>${esc(a.mode || '—')}</dd></div><div><dt>Consent</dt><dd>${esc(a.consent?.text || '—')} <small>v${esc(a.consent?.version || 1)} · ${esc(fmtDate(a.consent?.at))}</small></dd></div><div><dt>Motivation</dt><dd>${esc(a.answers?.motivation || '—')}</dd></div><div><dt>Group & Coach</dt><dd>${group ? `${esc(group.name)} · ${group.coachId ? esc(nameOf(s, group.coachId)) : 'Coach not assigned'}` : 'Not allocated'}</dd></div></dl>
    <h3>Attendance (factual)</h3>${att.length ? `<ul class="iw-mini-list">${att.map(x => { const ss = s.sessions.find(y => y.id === x.sessionId); const ex = (s.excuses || []).find(e => e.attendanceId === x.id); return `<li><span>${esc(ss?.title || 'Session')}</span>${pill(x.status)}${ex ? pill(ex.status === 'Accepted' ? 'Excused' : ex.status, ex.status === 'Accepted' ? 'Excused absence' : `Excuse ${ex.status.toLowerCase()}`) : ''}</li>`; }).join('')}</ul>` : '<p class="iw-muted">No attendance recorded.</p>'}
    <h3>Decision history</h3><ol class="iw-history">${(a.history || []).map(h => `<li><time>${esc(fmtDate(h.at))}</time><span>${esc(h.from || 'New')} → <strong>${esc(h.to)}</strong>${h.reason ? ` · ${esc(h.reason)}` : ''}</span><small>${esc(h.actorId === 'system' ? 'System' : nameOf(s, h.actorId))}</small></li>`).join('')}</ol>
    ${role === 'rep' && !['Blocked'].includes(a.status) ? `<p class="iw-muted">Blocking prevents this person from re-applying to this initiative only. ${u.button('Block from this initiative', 'app-decide', {id:a.id, kind:'block'}, 'button danger small')}</p>` : ''}
  </div>`;
  u.modal('Application details', body, () => {}, 'Done');
}

const VERB = {reject:['Reject this application?','Rejected applicants are notified with your reason and may re-apply unless blocked.','Reject application'], suspend:['Suspend participation?','The student keeps their seat (interim default) and history, but new actions are paused.','Suspend'], restore:['Restore participation?','The student returns to Accepted with their group and history.','Restore'], remove:['Remove from this initiative?','The seat is released and offered to the waiting list. Their submitted work and attendance stay in history.','Remove student'], block:['Block from this initiative?','Removes any active participation and prevents re-applying here. It is not a platform ban.','Block']};
export function participantAction(action, target, ctx) {
  const d = target.dataset;
  if (action === 'app-approve') { const result = ctx.run('initiative.application.approve', {id:d.id}, 'Application approved.'); u.toast(result === 'Queued' ? 'Eligible — all seats are taken, so the applicant joined the waiting list.' : 'Approved. One seat is now in use.'); ctx.render(); return true; }
  if (action === 'app-detail') { applicationDetail(ctx, d.id, ctx.route.area === 'organization' ? 'rep' : 'supervisor'); return true; }
  if (action === 'app-decide') {
    const [title, text, submit] = VERB[d.kind];
    const a = ctx.s.admissions.find(x => x.id === d.id);
    u.modal(title, `<p>${esc(text)}</p><p><strong>${esc(nameOf(ctx.s, a.personId))}</strong> · <code class="iw-code">${esc(a.code)}</code></p>${u.area('reason', 'Reason (shared with the student)', '', true)}`, v => { ctx.run(`initiative.${d.kind === 'reject' ? 'application' : 'participant'}.${d.kind}`, {id:d.id, reason:v.reason}, 'Decision recorded and the student was notified.'); ctx.render(); }, submit);
    return true;
  }
  return false;
}

/* ------------------------------------------------------------- groups */

export function renderGroups(ctx, {role, initiatives}) {
  const {s} = ctx;
  const i = initiatives.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives.find(x => x.status === 'Published') || initiatives[0];
  if (!i) return head({eyebrow:'STUDENTS & GROUPS', title:'Students & Groups'}) + emptyState('No initiative in your scope.', 'Groups belong to an initiative.');
  ctx.localUI.initiativeId = i.id;
  const sum = summary(s, i);
  const coaches = sum.coaches;
  const groupOptions = [['', 'Not allocated'], ...sum.groups.map(g => [g.id, g.name])];
  const allocSelect = (pid, value) => `<label class="iw-inline"><span class="sr-only">Group for ${esc(nameOf(s, pid))}</span><select data-action="allocate" data-person="${esc(pid)}" data-initiative="${esc(i.id)}">${groupOptions.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const groupCard = g => {
    const subs = s.submissions.filter(x => s.assignments.some(a => a.id === x.assignmentId && a.groupId === g.id));
    const tasks = s.assignments.filter(a => a.groupId === g.id && a.status !== 'Cancelled').length;
    return `<article class="iw-group iw-reveal"><header><div><p class="eyebrow">INITIATIVE GROUP</p><h3>${esc(g.name)}</h3><small>${esc(g.purpose || '')}</small></div>${u.button('Rename', 'group-edit', {id:g.id}, 'button quiet small')}</header>
      <label class="iw-inline is-wide"><span>Coach</span><select data-action="group-coach" data-group="${esc(g.id)}"><option value="">No Coach</option>${coaches.map(c => `<option value="${esc(c.personId)}" ${c.personId === g.coachId ? 'selected' : ''}>${esc(nameOf(s, c.personId))}</option>`).join('')}</select></label>
      <div class="iw-group-stats"><span><b>${g.memberIds.length}</b> students</span><span><b>${tasks}</b> tasks</span><span><b>${subs.filter(x => x.status === 'Approved').length}</b> approved</span><span><b>${subs.filter(x => x.status === 'Submitted').length}</b> to review</span></div>
      ${g.memberIds.length ? `<ul class="iw-members">${g.memberIds.map(pid => `<li>${u.avatar(nameOf(s, pid))}<span>${esc(nameOf(s, pid))}</span>${allocSelect(pid, g.id)}</li>`).join('')}</ul>` : '<p class="iw-muted">No students yet.</p>'}
      ${(g.coachHistory || []).length > 1 ? `<details class="iw-more"><summary>Coach handover history</summary><ol class="iw-history">${g.coachHistory.map(h => `<li><time>${esc(fmtDate(h.from))}</time><span>${esc(nameOf(s, h.coachId))}${h.to ? ` until ${esc(fmtDate(h.to))}` : ' · current'}</span></li>`).join('')}</ol></details>` : ''}
    </article>`;
  };
  return head({eyebrow:role === 'rep' ? 'ORGANISE THE INITIATIVE' : 'SUPERVISOR · STUDENTS & GROUPS', title:'Students & Groups', lead:'Groups belong to this initiative. Allocating or transferring a student never uses a second seat, and history stays with each group.', meta:initiativeSwitcher(ctx, initiatives, i), actions:u.button('Create group', 'group-create', {initiative:i.id})})
    + stats([stat(sum.accepted, 'Accepted students', {of:sum.cap}), stat(sum.groups.length, 'Groups'), stat(coaches.length, 'Active Coaches', {hint:coaches.length ? coaches.map(c => nameOf(s, c.personId)).join(', ') : 'Invite Coaches from Team'}), stat(sum.unallocated.length, 'Waiting for a group', {tone:sum.unallocated.length ? 'attention' : ''})])
    + `<div class="iw-split">${card('Unallocated accepted students', sum.unallocated.length ? `<ul class="iw-members">${sum.unallocated.map(a => `<li>${u.avatar(nameOf(s, a.personId))}<span>${esc(nameOf(s, a.personId))}<small>${esc(a.code)}</small></span>${allocSelect(a.personId, '')}</li>`).join('')}</ul>` : '<p class="iw-muted">Every accepted student is in a group.</p>', {eyebrow:'POOL'})}
      <div class="iw-groups">${sum.groups.length ? sum.groups.map(groupCard).join('') : emptyState('No groups yet.', 'Create a first group, then allocate accepted students and an active Coach.', u.button('Create group', 'group-create', {initiative:i.id}))}</div></div>`;
}
export function groupAction(action, target, ctx) {
  const d = target.dataset;
  if (action === 'group-create' || action === 'group-edit') {
    const g = ctx.s.groups.find(x => x.id === d.id) || {};
    const initiativeId = g.initiativeId || d.initiative || ctx.localUI.initiativeId;
    u.modal(g.id ? 'Rename group' : 'Create a group', u.field('name', 'Group name', g.name || '', 'text', true) + u.area('purpose', 'Purpose (visible to staff)', g.purpose || ''), v => { ctx.run('initiative.group.save', {initiativeId, id:g.id, ...v}, g.id ? 'Group renamed.' : 'Group created.'); ctx.render(); }, g.id ? 'Save' : 'Create group');
    return true;
  }
  return false;
}
export function groupChange(target, ctx) {
  if (target.dataset.action === 'allocate') { try { ctx.run('initiative.group.allocate', {initiativeId:target.dataset.initiative, personId:target.dataset.person, groupId:target.value || null}, target.value ? 'Student allocated. History recorded.' : 'Student moved to the unallocated pool.'); } catch (e) { u.toast(e.message, true); } ctx.render(); return true; }
  if (target.dataset.action === 'group-coach') { try { ctx.run('initiative.group.coach', {groupId:target.dataset.group, coachId:target.value || null}, target.value ? 'Coach allocated. Handover recorded.' : 'Coach removed from the group.'); } catch (e) { u.toast(e.message, true); } ctx.render(); return true; }
  return false;
}
