/**
 * Applications & Students — one queue over the original Application records.
 * The Representative and an active Supervisor see the same IDs. Buttons
 * reflect authority, but every command re-checks it.
 */
import * as u from '../../ui.js';
import {esc,nameOf,emailOf,pill,head,stats,stat,card,personCell,tabs,emptyState,summary,initiativeSwitcher,withInitiative,fmtDate,picker} from './common.js';
import {seatCap,seatsUsed} from '../../initiative-rules.js';

const GROUPS = {
  flagged:['Pending','Queued'],
  pending:['Pending'], accepted:['Accepted'], waitlist:['Queued','Offered'], suspended:['Suspended'], ended:['Rejected','Removed','Blocked','Withdrawn','Declined','Expired','Closed','Completed']
};
const LABEL = {flagged:'Flagged by Supervisor', pending:'Pending', accepted:'Accepted', waitlist:'Waiting list', suspended:'Suspended', ended:'Closed & history'};

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
  const isFlagged = a => (a.flags || []).some(f => !f.resolved);
  const list = all.filter(a => GROUPS[tab]?.includes(a.status) && (tab !== 'flagged' || isFlagged(a))).sort((a, b) => String(a.queuedAt || a.created).localeCompare(String(b.queuedAt || b.created)));
  const sum = summary(s, i);
  const groups = sum.groups;
  const rows = list.map(a => {
    const group = groups.find(g => g.memberIds.includes(a.personId));
    const acts = [];
    if (a.status === 'Pending') acts.push(u.button(seatsUsed(s, i.id) >= seatCap(i) ? 'Approve → waiting list' : 'Approve', 'app-approve', {id:a.id}, 'button primary small'));
    if (role === 'rep') {
      if (a.status === 'Offered' && !a.offer?.expires) acts.push(u.button('End offer', 'app-offer-release', {id:a.id}, 'button quiet small'));
      if (['Pending','Queued'].includes(a.status)) acts.push(u.button('Reject', 'app-decide', {id:a.id, kind:'reject'}, 'button quiet small'));
      if (a.status === 'Accepted') acts.push(u.button('Suspend', 'app-decide', {id:a.id, kind:'suspend'}, 'button quiet small'));
      if (a.status === 'Suspended') acts.push(u.button('Restore', 'app-decide', {id:a.id, kind:'restore'}, 'button quiet small'));
      if (['Accepted','Suspended'].includes(a.status)) acts.push(u.button('Remove', 'app-decide', {id:a.id, kind:'remove'}, 'button quiet small'));
    }
    if (role === 'supervisor' && ['Pending','Queued'].includes(a.status) && !isFlagged(a)) acts.push(u.button('Flag for Representative', 'app-flag', {id:a.id}, 'button quiet small'));
    if (role === 'rep' && isFlagged(a)) acts.push(u.button('Resolve flag', 'app-flag-resolve', {id:a.id}, 'button quiet small'));
    acts.push(u.button('Details', 'app-detail', {id:a.id}, 'button quiet small'));
    return {search:`${nameOf(s, a.personId)} ${emailOf(s, a.personId)} ${a.code}`, status:a.status, cells:[
      personCell(s, a.personId, esc(emailOf(s, a.personId))),
      `<code class="iw-code">${esc(a.code)}</code><small>${esc(fmtDate(a.created))} · Age ${esc(a.answers?.age ?? '—')} · ${esc(a.mode || '—')}</small>`,
      group ? `${esc(group.name)}<small>${group.coachId ? `Coach ${esc(nameOf(s, group.coachId))}` : 'No Coach yet'}</small>` : (a.status === 'Accepted' ? pill('Unallocated', 'Unallocated') : '<small>—</small>'),
      `${attendanceSummary(s, i.id, a.personId)}${taskSummary(s, i.id, a.personId)}`,
      `${pill(a.status)}${isFlagged(a) ? `<span class="iw-flag" title="${esc((a.flags || []).filter(f => !f.resolved).map(f => `${nameOf(s, f.actorId)}: ${f.note}`).join(' · '))}">${u.icon('shield')}Flagged</span>` : ''}${a.status === 'Offered' ? `<small>${a.offer?.expires ? `until ${esc(fmtDate(a.offer.expires))}` : 'No automatic expiry'}</small>` : ''}${a.status === 'Queued' ? `<small>#${all.filter(x => x.status === 'Queued').sort((x, y) => String(x.queuedAt).localeCompare(String(y.queuedAt))).findIndex(x => x.id === a.id) + 1} in queue</small>` : ''}`,
      `<div class="actions">${acts.join('')}</div>`
    ]};
  });
  const counts = Object.fromEntries(Object.entries(GROUPS).map(([k, v]) => [k, all.filter(a => v.includes(a.status) && (k !== 'flagged' || isFlagged(a))).length]));
  return head({eyebrow:role === 'rep' ? 'ADMISSIONS · ONE SHARED QUEUE' : 'SUPERVISOR · SHARED APPLICATION QUEUE', title:'Applications & Students', lead:role === 'rep' ? 'Review new applications and manage accepted students. Each approval uses one seat.' : 'You can approve eligible applications. Rejection and discipline stay with the Representative.', meta:initiativeSwitcher(ctx, initiatives, i)})
    + stats([stat(sum.accepted, 'Accepted students', {of:sum.cap, hint:`${sum.seatsUsed} seats in use incl. suspended & held offers`}), stat(sum.pending, 'Pending applications', {tone:sum.pending ? 'attention' : ''}), stat(sum.queued + sum.offered, 'Waiting list', {hint:sum.offered ? `${sum.offered} seat offer(s) open` : i.policies?.offerManual ? 'Offers end when you release them' : `Offers last ${i.policies?.offerHours || 24} h`}), stat(sum.unallocated.length, 'Accepted, no group', {href:withInitiative(base, i), tone:sum.unallocated.length ? 'attention' : ''})])
    + tabs(Object.keys(GROUPS).filter(k => k !== 'flagged' || counts.flagged || tab === 'flagged').map(k => [LABEL[k], withInitiative(`${r.area}/${r.page}?status=${k}`, i), k, counts[k]]), tab)
    + `<div class="iw-card iw-reveal">${u.filterBar()}${list.length ? u.table(['Student','Application','Group','Participation','Status',''], rows) : `<p class="iw-muted">No ${LABEL[tab].toLowerCase()} records for ${esc(i.title)}.</p>`}</div>`
    + `<p class="iw-footnote">${u.icon('shield')}Staff see participation for this initiative only. Personal Lab, Shield and Recovery data are never shown here. ${role === 'rep' ? 'Only Platform Admin can ban a whole account.' : ''}</p>`;
}

export function applicationDetail(ctx, id, role) {
  const {s} = ctx, a = s.admissions.find(x => x.id === id), i = s.initiatives.find(x => x.id === a.initiativeId);
  const org = (s.organizations || []).find(o => o.id === i.ownerId);
  const sum = summary(s, i);
  const group = s.groups.find(g => g.initiativeId === i.id && g.memberIds.includes(a.personId));
  const att = (s.sessionAttendance || []).filter(x => x.initiativeId === i.id && x.personId === a.personId);
  const age = Number(a.answers?.age), min = Number(i.minAge || 0), max = Number(i.maxAge || 0);
  const eligible = Number.isFinite(age) && age >= min && (!max || age <= max);
  const fact = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  const body = `<div class="iw-app">
    <header class="iw-app-person">${u.avatar(nameOf(s, a.personId))}<div><h3>${esc(nameOf(s, a.personId))}</h3><p>${esc(emailOf(s, a.personId))}</p></div><div class="iw-app-status">${pill(a.status)}<code class="iw-code">${esc(a.code)}</code></div></header>
    <section class="iw-app-applied" aria-label="Initiative applied to"><p class="eyebrow">Applied to</p><h4>${esc(i.title)}</h4><p>${esc(i.topic || i.summary || '')}${org ? ` · ${esc(org.name)}` : ''}</p>
      <dl class="iw-app-chips"><div><dt>Dates</dt><dd>${esc(fmtDate(i.start))} – ${esc(fmtDate(i.end))}</dd></div><div><dt>Seats</dt><dd>${sum.accepted} of ${sum.cap} taken</dd></div><div><dt>Modes</dt><dd>${esc((i.modes || []).join(' · ') || '—')}</dd></div><div><dt>Initiative</dt><dd>${pill(i.status)}</dd></div></dl></section>
    <div class="iw-app-grid">
      <section><h5>Application</h5><dl class="iw-app-facts">
        ${fact('Applied on', esc(fmtDate(a.created)))}
        ${fact('Age', `${esc(a.answers?.age ?? '—')} ${Number.isFinite(age) ? pill(eligible ? 'Accepted' : 'Rejected', eligible ? `Eligible · ${min}–${max || 'any'}` : `Outside ${min}–${max || 'any'}`) : ''}`)}
        ${fact('Preferred mode', esc(a.mode || '—'))}
        ${fact('Consent', `${esc(a.consent?.text || '—')}<small>Version ${esc(a.consent?.version || 1)} · ${esc(fmtDate(a.consent?.at))}</small>`)}
      </dl></section>
      <section><h5>Placement</h5><dl class="iw-app-facts">
        ${fact('Group', group ? esc(group.name) : '<span class="iw-muted">Not in a group yet</span>')}
        ${fact('Coach', group?.coachId ? esc(nameOf(s, group.coachId)) : '<span class="iw-muted">Not assigned</span>')}
        ${fact('Attendance', att.length ? `${att.filter(x => x.status !== 'Absent').length} attended · ${att.filter(x => x.status === 'Absent').length} absent` : '<span class="iw-muted">No sessions recorded yet</span>')}
      </dl></section>
    </div>
    <section><h5>Why they applied</h5><blockquote class="iw-app-quote">${esc(a.answers?.motivation || 'No motivation shared.')}</blockquote></section>
    ${att.length ? `<section><h5>Sessions</h5><ul class="iw-mini-list">${att.map(x => { const ss = s.sessions.find(y => y.id === x.sessionId); const ex = (s.excuses || []).find(e => e.attendanceId === x.id); return `<li><span>${esc(ss?.title || 'Session')}</span>${pill(x.status)}${ex ? pill(ex.status === 'Accepted' ? 'Excused' : ex.status, ex.status === 'Accepted' ? 'Excused absence' : `Excuse ${ex.status.toLowerCase()}`) : ''}</li>`; }).join('')}</ul></section>` : ''}
    ${(a.flags || []).length ? `<section><h5>Supervisor flags</h5><ul class="iw-mini-list">${a.flags.map(f => `<li><span>${esc(nameOf(s, f.actorId))}: ${esc(f.note)}</span><small>${esc(fmtDate(f.at))} · ${f.resolved ? `resolved${f.resolution ? ` — ${esc(f.resolution)}` : ''}` : 'open'}</small></li>`).join('')}</ul></section>` : ''}
    <section><h5>History</h5><ol class="iw-app-timeline">${(a.history || []).slice().reverse().map(h => `<li><time>${esc(fmtDate(h.at))}</time><div><strong>${esc(h.to)}</strong>${h.reason ? `<span>${esc(h.reason)}</span>` : ''}<small>${esc(h.from || 'New')} → ${esc(h.to)} · by ${esc(h.actorId === 'system' ? 'System' : nameOf(s, h.actorId))}</small></div></li>`).join('')}</ol></section>
    ${role === 'rep' && !['Blocked'].includes(a.status) ? `<section class="iw-app-danger"><div><strong>Block from this initiative</strong><p>Stops ${esc(nameOf(s, a.personId).split(' ')[0])} from applying to ${esc(i.title)} again. It is not a platform ban.</p></div>${u.button('Block…', 'app-decide', {id:a.id, kind:'block'}, 'button danger small')}</section>` : ''}
  </div>`;
  u.modal('Application details', body, () => {}, 'Close', {readonly:true, wide:true});
}

const VERB = {reject:['Reject this application?','Rejected applicants are notified with your reason and may re-apply unless blocked.','Reject application'], suspend:['Suspend participation?','The student keeps their seat (interim default) and history, but new actions are paused.','Suspend'], restore:['Restore participation?','The student returns to Accepted with their group and history.','Restore'], remove:['Remove from this initiative?','The seat is released and offered to the waiting list. Their submitted work and attendance stay in history.','Remove student'], block:['Block from this initiative?','Removes any active participation and prevents re-applying here. It is not a platform ban.','Block']};
export function participantAction(action, target, ctx) {
  const d = target.dataset;
  if (action === 'app-offer-release') { const a=ctx.s.admissions.find(x=>x.id===d.id); u.modal('End this seat offer?', `<p>The offer to <strong>${esc(nameOf(ctx.s,a.personId))}</strong> ends now. The next eligible person on the waiting list receives an offer immediately.</p>`, () => { ctx.run('initiative.offer.release', {id:d.id}, 'Offer ended. The waiting list was updated.'); ctx.render(); }, 'End offer'); return true; }
  if (action === 'app-approve') { const result = ctx.run('initiative.application.approve', {id:d.id}, 'Application approved.'); u.toast(result === 'Queued' ? 'Eligible — all seats are taken, so the applicant joined the waiting list.' : 'Approved. One seat is now in use.'); ctx.render(); return true; }
  if (action === 'app-flag') { u.modal('Flag for the Representative', '<p>Use this when an application needs a decision only the Representative can make (for example, a possible rejection or an eligibility question). The Representative is notified.</p>' + u.area('note', 'What needs attention', '', true), v => { ctx.run('initiative.application.flag', {id:target.dataset.id, note:v.note}, 'Flagged. The Representative was notified.'); ctx.render(); }, 'Send flag'); return true; }
  if (action === 'app-flag-resolve') { u.modal('Resolve the Supervisor’s flag', u.area('note', 'Resolution note (optional)', ''), v => { ctx.run('initiative.application.flag.resolve', {id:target.dataset.id, note:v.note}, 'Flag resolved.'); ctx.render(); }, 'Resolve'); return true; }
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

const modeOf = (s, i, pid) => s.admissions.find(a => a.initiativeId === i.id && a.personId === pid)?.mode || '';
/** Allocation control for one student: a compact “Move” menu over the real allocation select. */
function moveMenu(s, i, groups, pid, current) {
  const options = [...groups.filter(g => g.id !== current).map(g => ({value:g.id, label:`${current ? 'Move to' : 'Add to'} ${g.name}`, sub:`${g.memberIds.length} ${g.memberIds.length === 1 ? 'student' : 'students'}${g.coachId ? ` · Coach ${nameOf(s, g.coachId).split(' ')[0]}` : ''}`, hue:u.hueOf(g.id)})), ...(current ? [{value:'', label:'Take out of this group', sub:'Back to “Needs a group”'}] : [])];
  return picker({attrs:`data-action="allocate" data-person="${esc(pid)}" data-initiative="${esc(i.id)}"`, value:current || '', label:`${current ? 'Move' : 'Add'} ${nameOf(s, pid)}`, placeholder:'Not in a group', options, trigger:current ? `<span class="iw-move-btn" title="Move ${esc(nameOf(s, pid))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg></span>` : `<span class="iw-add-btn">Add to group<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></span>`});
}
function studentChip(s, i, groups, pid, current) {
  const mode = modeOf(s, i, pid);
  return `<li class="iw-student" draggable="true" data-drag-person="${esc(pid)}">${u.avatar(nameOf(s, pid))}<span class="iw-student-text"><b>${esc(nameOf(s, pid))}</b>${mode ? `<small>${esc(mode)}</small>` : ''}</span>${moveMenu(s, i, groups, pid, current)}</li>`;
}
/** Coach choice for a group or the create dialog: avatars, current load, and “No Coach”. */
export function coachOptions(s, coaches, groupId = '') {
  return [{value:'', label:'No Coach yet', sub:'Choose later'}, ...coaches.map(c => { const load = s.groups.filter(g => g.coachId === c.personId && g.parentType === 'initiative' && g.id !== groupId); return {value:c.personId, label:nameOf(s, c.personId), sub:load.length ? `Also coaching ${load.map(g => g.name).join(', ')}` : 'Available', person:true}; })];
}

export function renderGroups(ctx, {role, initiatives}) {
  const {s} = ctx;
  const i = initiatives.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives.find(x => x.status === 'Published') || initiatives[0];
  if (!i) return head({eyebrow:'STUDENTS & GROUPS', title:'Students & Groups'}) + emptyState('No initiative in your scope.', 'Groups belong to an initiative.');
  ctx.localUI.initiativeId = i.id;
  const sum = summary(s, i), coaches = sum.coaches, groups = sum.groups;
  const groupCard = g => {
    const subs = s.submissions.filter(x => s.assignments.some(a => a.id === x.assignmentId && a.groupId === g.id));
    const tasks = s.assignments.filter(a => a.groupId === g.id && a.status !== 'Cancelled').length;
    const review = subs.filter(x => x.status === 'Submitted').length, approved = subs.filter(x => x.status === 'Approved').length;
    return `<article class="iw-gcard iw-reveal" data-drop-group="${esc(g.id)}" style="--h:${u.hueOf(g.id)}">
      <header><span class="iw-gdot" aria-hidden="true"></span><div class="iw-gtitle"><h3>${esc(g.name)}</h3>${g.purpose ? `<p>${esc(g.purpose)}</p>` : ''}</div><span class="iw-gcount" title="Students in this group">${g.memberIds.length}</span>${u.button('Edit', 'group-edit', {id:g.id}, 'button quiet small')}</header>
      <div class="iw-gcoach${g.coachId ? '' : ' is-missing'}"><span class="iw-gcoach-label">Coach</span>${picker({attrs:`data-action="group-coach" data-group="${esc(g.id)}"`, value:g.coachId || '', label:`Coach for ${g.name}`, placeholder:coaches.length ? 'Assign a Coach' : 'No Coaches invited yet', options:coachOptions(s, coaches, g.id), empty:'Invite a Coach from Staff first.'})}${!g.coachId && role === 'rep' ? u.button('Invite a Coach', 'staff-invite', {role:'coach', initiative:i.id}, 'button quiet small iw-gcoach-invite') : ''}</div>
      ${g.memberIds.length ? `<ul class="iw-students">${g.memberIds.map(pid => studentChip(s, i, groups, pid, g.id)).join('')}</ul>` : `<div class="iw-gdrop">${u.icon('people')}<span>No students yet.<br><small>Drag a student here, or use “Add to group”.</small></span></div>`}
      <footer><span><b>${tasks}</b> ${tasks === 1 ? 'task' : 'tasks'}</span><span><b>${approved}</b> approved</span><span class="${review ? 'is-attention' : ''}"><b>${review}</b> to review</span></footer>
      ${(g.coachHistory || []).length > 1 ? `<details class="iw-more"><summary>Coach handover history</summary><ol class="iw-history">${g.coachHistory.map(h => `<li><time>${esc(fmtDate(h.from))}</time><span>${esc(nameOf(s, h.coachId))}${h.to ? ` until ${esc(fmtDate(h.to))}` : ' · current'}</span></li>`).join('')}</ol></details>` : ''}
    </article>`;
  };
  const waiting = sum.unallocated.length ? `<section class="iw-unplaced iw-reveal" data-drop-group="" aria-labelledby="unplaced-title"><div class="iw-unplaced-head"><span class="iw-unplaced-icon">${u.icon('people')}</span><div><h2 id="unplaced-title">${sum.unallocated.length} ${sum.unallocated.length === 1 ? 'student needs' : 'students need'} a group</h2><p>Accepted, but not placed yet. ${groups.length ? 'Drag them onto a group or use “Add to group”.' : 'Create a group to place them.'}</p></div></div><ul class="iw-students is-row">${sum.unallocated.map(a => groups.length ? studentChip(s, i, groups, a.personId, '') : `<li class="iw-student">${u.avatar(nameOf(s, a.personId))}<span class="iw-student-text"><b>${esc(nameOf(s, a.personId))}</b><small>${esc(a.mode || '')}</small></span></li>`).join('')}</ul></section>` : '';
  return head({eyebrow:role === 'rep' ? 'ORGANISE THE INITIATIVE' : 'SUPERVISOR · STUDENTS & GROUPS', title:'Students & Groups', lead:'Each group has one Coach and its students. Drag a student to move them — it never uses a second seat.', meta:initiativeSwitcher(ctx, initiatives, i), actions:u.button('Create group', 'group-create', {initiative:i.id})})
    + stats([stat(sum.accepted, 'Accepted students', {of:sum.cap}), stat(groups.length, 'Groups', {hint:`${groups.filter(g => g.coachId).length} with a Coach`}), stat(coaches.length, 'Active Coaches', {hint:coaches.length ? coaches.map(c => nameOf(s, c.personId)).join(', ') : 'Invite Coaches from Staff'}), stat(sum.unallocated.length, 'Need a group', {tone:sum.unallocated.length ? 'attention' : ''})])
    + waiting
    + (groups.length ? `<div class="iw-board">${groups.map(groupCard).join('')}</div>` : emptyState('No groups yet.', 'Create a group, choose its Coach and add students in one step.', u.button('Create group', 'group-create', {initiative:i.id})));
}
const first = name => String(name).split(' ')[0];
export function groupAction(action, target, ctx) {
  const d = target.dataset, {s} = ctx;
  if (action === 'group-edit') {
    const g = s.groups.find(x => x.id === d.id);
    u.modal('Edit group', u.field('name', 'Group name', g.name || '', 'text', true) + u.area('purpose', 'Note for staff (optional)', g.purpose || ''), v => { ctx.run('initiative.group.save', {initiativeId:g.initiativeId, id:g.id, ...v}, `Saved “${v.name}”.`); ctx.render(); }, 'Save changes');
    return true;
  }
  if (action === 'group-create') {
    const initiativeId = d.initiative || ctx.localUI.initiativeId, i = s.initiatives.find(x => x.id === initiativeId);
    const sum = summary(s, i), coaches = sum.coaches, waiting = sum.unallocated;
    const body = u.field('name', 'Group name', '', 'text', true, `placeholder="e.g. Circle C · Evenings"`)
      + `<div class="iw-dsection"><div class="iw-dsection-head"><h3>Coach</h3><small>${coaches.length ? 'Optional — you can choose later.' : 'No Coaches have joined this initiative yet.'}</small></div>${picker({attrs:'name="coachId"', label:'Coach', placeholder:'No Coach yet', options:coachOptions(s, coaches), inline:true, empty:'Invite a Coach from Staff first.'})}</div>`
      + `<div class="iw-dsection"><div class="iw-dsection-head"><h3>Students</h3><small>${waiting.length ? `${waiting.length} accepted ${waiting.length === 1 ? 'student is' : 'students are'} waiting for a group.` : 'Everyone accepted is already in a group.'}</small></div>${picker({attrs:'name="students"', multiple:true, label:'Students', placeholder:'Choose students', options:waiting.map(a => ({value:a.personId, label:nameOf(s, a.personId), sub:`${a.mode || 'Any mode'} · Age ${a.answers?.age ?? '—'} · ${a.code}`, tags:[a.mode || ''], person:true})), search:waiting.length > 3, searchLabel:'Search by name or application ID', filters:[...new Set(waiting.map(a => a.mode).filter(Boolean))].map(m => [m, m]), inline:true, one:'student selected', many:'students selected', none:'No student matches this search.', empty:'No accepted students are waiting.'})}</div>`
      + u.area('purpose', 'Note for staff (optional)', '');
    u.modal('Create a group', body, (v, form) => {
      const students = [...(form.querySelector('select[name=students]')?.selectedOptions || [])].map(x => x.value).filter(Boolean);
      const groupId = ctx.run('initiative.group.save', {initiativeId, name:v.name, purpose:v.purpose}, 'Group created.');
      // The group exists now; a later step failing must not leave the dialog open (a resubmit would duplicate it).
      try {
        if (v.coachId) ctx.run('initiative.group.coach', {groupId, coachId:v.coachId}, 'Coach assigned.');
        for (const personId of students) ctx.run('initiative.group.allocate', {initiativeId, personId, groupId}, 'Student added.');
      } catch (error) { u.toast(`“${v.name}” was created, but ${error.message}`, true); ctx.render(); return; }
      const parts = [students.length ? `${students.length} ${students.length === 1 ? 'student' : 'students'}` : '', v.coachId ? `Coach ${first(nameOf(s, v.coachId))}` : ''].filter(Boolean);
      u.toast(`“${v.name}” created${parts.length ? ` with ${parts.join(' and ')}` : ''}.`);
      ctx.render();
    }, 'Create group');
    return true;
  }
  return false;
}
export function groupChange(target, ctx) {
  const {s} = ctx;
  if (target.dataset.action === 'allocate') {
    const g = s.groups.find(x => x.id === target.value), who = first(nameOf(s, target.dataset.person));
    try { ctx.run('initiative.group.allocate', {initiativeId:target.dataset.initiative, personId:target.dataset.person, groupId:target.value || null}, g ? `${who} is now in ${g.name}.` : `${who} moved back to “Waiting for a group”.`); } catch (e) { u.toast(e.message, true); }
    ctx.render(); return true;
  }
  if (target.dataset.action === 'group-coach') {
    const g = s.groups.find(x => x.id === target.dataset.group);
    try { ctx.run('initiative.group.coach', {groupId:target.dataset.group, coachId:target.value || null}, target.value ? `${nameOf(s, target.value)} now coaches ${g?.name || 'this group'}.` : `${g?.name || 'The group'} has no Coach now.`); } catch (e) { u.toast(e.message, true); }
    ctx.render(); return true;
  }
  return false;
}
