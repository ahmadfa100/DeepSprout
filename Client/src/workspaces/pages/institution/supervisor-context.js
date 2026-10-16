/**
 * Supervisor contexts. One person may hold Initiative grants (from an
 * Institution Representative) and Provider appointments (from an Outdoor
 * Provider). Every page acts under exactly one selected context; the two
 * kinds of authority are never merged. Counts come from the records.
 */
import * as u from '../../ui.js';
import {esc,nameOf,pill,head,stats,stat,card,attention,emptyState,summary,fmtDate,personCell} from './common.js';
import {checkInWindow,windowMessage,today} from '../../initiative-rules.js';
import {nowMs} from '../../domain.js';

/* -------------------------------------------------------- contexts */

export function supervisorContexts(ctx) {
  const {s, person:p} = ctx;
  const initiatives = s.initiatives.filter(i => !['Cancelled','Archived'].includes(i.status) && (s.grants || []).some(g => g.personId === p.id && g.role === 'supervisor' && g.scopeId === i.id && g.status === 'Active'))
    .map(i => ({key:`initiative:${i.id}`, type:'initiative', id:i.id, title:i.title, owner:s.organizations.find(o => o.id === i.ownerId)?.name || 'Institution', status:i.status}));
  const provider = (s.appointments || []).filter(a => a.personId === p.id && a.status === 'Accepted').map(a => {
    const e = s.experiences.find(x => x.id === a.experienceId);
    return e && {key:`provider:${e.id}`, type:'provider', id:e.id, title:e.title, owner:s.providers.find(x => x.id === e.ownerId)?.name || 'Provider', status:e.status, appointment:a};
  }).filter(Boolean);
  return [...initiatives, ...provider];
}
/** The selected context: ?ctx=type:id, an explicit ?initiative= / ?resource=, the last choice, or the first available. */
export function currentContext(ctx) {
  const list = supervisorContexts(ctx), q = ctx.route.query;
  // A link to a specific session carries its own context (e.g. a duty notification).
  const sid = q.get('session') || (ctx.route.page === 'schedule' ? ctx.route.id : null);
  const owned = sid && (ctx.s.sessions.find(x => x.id === sid) ? `initiative:${ctx.s.sessions.find(x => x.id === sid).initiativeId}` : ctx.s.experienceSessions.find(x => x.id === sid) ? `provider:${ctx.s.experienceSessions.find(x => x.id === sid).experienceId}` : null);
  if (owned?.startsWith('provider:') && !q.get('resource')) q.set('resource', owned.split(':')[1]);
  const wanted = q.get('ctx') || (owned && list.some(c => c.key === owned) && owned) || (q.get('initiative') && `initiative:${q.get('initiative')}`) || (q.get('mode') === 'provider' && q.get('resource') && `provider:${q.get('resource')}`) || ctx.localUI.supCtx;
  const found = list.find(c => c.key === wanted) || (q.get('mode') === 'provider' && list.find(c => c.type === 'provider')) || list[0] || null;
  if (found) {
    ctx.localUI.supCtx = found.key;
    if (found.type === 'initiative') ctx.localUI.initiativeId = found.id;
    else if (!q.get('resource')) q.set('resource', found.id);
  }
  return found;
}
export function contextBar(ctx, current) {
  const list = supervisorContexts(ctx);
  if (list.length < 2) return current ? `<div class="iw-contexts is-single" aria-label="Current assignment">${chip(current, true, ctx.route.page)}</div>` : '';
  return `<nav class="iw-contexts" aria-label="Choose an assignment">${list.map(c => chip(c, c.key === current?.key, ctx.route.page)).join('')}</nav>`;
}
function chip(c, active, page) {
  const tag = c.type === 'initiative' ? 'Initiative Supervisor' : 'Provider appointment';
  return `<button type="button" class="iw-context ${active ? 'is-active' : ''} is-${c.type}" data-action="sup-context" data-ctx="${esc(c.key)}" data-page="${esc(page || 'dashboard')}" ${active ? 'aria-current="true"' : ''}><span class="iw-context-tag">${u.icon(c.type === 'initiative' ? 'nodes' : 'mountain')}${tag}</span><strong>${esc(c.title)}</strong><small>${esc(c.owner)}</small></button>`;
}
export const INSTITUTION_PAGES = ['applications','students','coaches','excuses'];
export const PROVIDER_PAGES = ['experiences','cohorts','participants','evaluations'];
export function notInContext(ctx, current, page) {
  const want = INSTITUTION_PAGES.includes(page) ? 'initiative' : 'provider';
  const other = supervisorContexts(ctx).find(c => c.type === want);
  const titles = {applications:'Applications', students:'Students & Groups', coaches:'Coaches', excuses:'Notes & excuses', experiences:'Assigned Experiences', cohorts:'My Cohorts', participants:'Participants', evaluations:'Completion evaluations'};
  return head({eyebrow:`NOT PART OF ${current.title.toUpperCase()}`, title:titles[page] || 'Not available here'}) + emptyState(want === 'initiative' ? 'This page belongs to an Initiative assignment.' : 'This page belongs to a Provider appointment.',
    want === 'initiative' ? 'Applications, groups, Coaches and excuses are Institution Initiative duties. Provider appointments never include them.' : 'Experiences, cohorts and evaluations come from a Provider appointment. Initiative grants never include Provider operations.',
    other ? u.button(`Switch to ${other.title}`, 'sup-context', {ctx:other.key, page}, 'button primary') : '');
}
export function contextAction(action, target, ctx) {
  if (action !== 'sup-context') return false;
  ctx.localUI.supCtx = target.dataset.ctx;
  const [type, id] = target.dataset.ctx.split(':');
  if (type === 'initiative') ctx.localUI.initiativeId = id;
  const page = target.dataset.page || 'dashboard';
  ctx.go(`supervisor/${page}?${type === 'initiative' ? `initiative=${id}` : `mode=provider&resource=${id}`}`);
  return true;
}

/* ------------------------------------------------------- dashboard */

function providerSessions(s, c) { return s.experienceSessions.filter(x => x.experienceId === c.id && c.appointment.sessionIds.includes(x.id)); }
export function renderUnifiedDashboard(ctx) {
  const {s, person:p} = ctx, list = supervisorContexts(ctx), current = currentContext(ctx), day = today(s);
  const invites = (s.staffInvites || []).filter(x => x.role === 'supervisor' && x.status === 'Pending' && x.email === p.email.toLowerCase() && Date.parse(x.expires) > nowMs(s));
  const appointmentsInvited = (s.appointments || []).filter(a => a.status === 'Invited' && (a.personId === p.id || (!a.personId && a.email === p.email.toLowerCase())));
  const ended = [...(s.grants || []).filter(g => g.personId === p.id && g.role === 'supervisor' && g.status !== 'Active').map(g => ({title:s.initiatives.find(i => i.id === g.scopeId)?.title, kind:'Initiative', at:g.revokedAt, reason:g.reason, status:g.status})),
    ...(s.appointments || []).filter(a => a.personId === p.id && ['Revoked','Declined'].includes(a.status)).map(a => ({title:s.experiences.find(e => e.id === a.experienceId)?.title, kind:'Provider', at:a.revokedAt, reason:a.reason, status:a.status}))];
  const pendingCards = [...invites.map(x => `<li class="is-attention"><span class="iw-dot"></span><div><strong>${esc(s.initiatives.find(i => i.id === x.initiativeId)?.title)}</strong><p>Initiative Supervisor invitation · expires ${esc(fmtDate(x.expires))}</p></div>${u.link('Open invitation', `auth/staff-invitation/${x.token}`, 'button primary small')}</li>`),
    ...appointmentsInvited.map(a => { const e = s.experiences.find(x => x.id === a.experienceId); return `<li class="is-attention"><span class="iw-dot"></span><div><strong>${esc(e?.title)}</strong><p>Provider appointment · ${a.sessionIds.length} session(s) · ${esc(a.scope)}</p></div><div class="actions">${a.personId === p.id ? u.button('Accept', 'appointment-accept', {id:a.id}, 'button primary small') + u.button('Decline', 'appointment-decline', {id:a.id}, 'button quiet small') : u.link('Open appointment', `auth/appointment/${a.token}`, 'button primary small')}</div></li>`; })];
  // Records-derived duties across both contexts.
  const agenda = [], alerts = [];
  let excuses = 0, evaluations = 0, reports = 0, attendanceDue = 0;
  for (const c of list) {
    if (c.type === 'initiative') {
      const i = s.initiatives.find(x => x.id === c.id), sum = summary(s, i);
      for (const ss of sum.sessions.filter(x => x.status === 'Published' && (x.supervisorIds || []).includes(p.id))) {
        const w = checkInWindow(s, ss);
        if (ss.date >= day) agenda.push({c, title:ss.title, date:ss.date, time:ss.time, href:`supervisor/attendance?initiative=${i.id}&session=${ss.id}`});
        if (w.started && !ss.closedOut) { attendanceDue++; alerts.push({title:`${w.state === "open" ? "Attendance open" : "Attendance to close"} · ${ss.title}`, text:`${c.title} · ${windowMessage(w)}`, href:`supervisor/attendance?initiative=${i.id}&session=${ss.id}`, action:'Open desk'}); }
      }
      for (const ss of sum.needsSupervisor) alerts.push({tone:'critical', title:`Needs Supervisor · ${ss.title}`, text:c.title, href:`supervisor/schedule/${ss.id}?initiative=${i.id}`, action:'Take duty'});
      if (sum.pending) alerts.push({title:`${sum.pending} application(s) pending`, text:c.title, href:`supervisor/applications?initiative=${i.id}&status=pending`, action:'Review'});
      if (sum.excusesForSup.length) alerts.push({title:`${sum.excusesForSup.length} excuse(s) need your recommendation`, text:c.title, href:`supervisor/excuses?initiative=${i.id}`, action:'Recommend'});
      if (sum.unallocated.length) alerts.push({title:`${sum.unallocated.length} accepted student(s) without a group`, text:c.title, href:`supervisor/students?initiative=${i.id}`, action:'Allocate'});
      excuses += sum.excusesForSup.length; reports += sum.coachReports.length;
    } else {
      const e = s.experiences.find(x => x.id === c.id);
      for (const ss of providerSessions(s, c)) {
        const w = checkInWindow(s, ss, e.timezone), closed = (ss.closedBy || []).some(x => x.actorId === p.id);
        if (ss.date >= day) agenda.push({c, title:ss.title, date:ss.date, time:ss.time, href:`supervisor/attendance?mode=provider&resource=${e.id}&session=${ss.id}`});
        if (w.started && !closed && !['Completed','Cancelled','Archived'].includes(e.status)) { attendanceDue++; alerts.push({title:`${w.state === "open" ? "Attendance open" : "Attendance to close"} · ${ss.title}`, text:`${c.title} · ${windowMessage(w)}`, href:`supervisor/attendance?mode=provider&resource=${e.id}&session=${ss.id}`, action:'Open desk'}); }
        const due = s.attendance.filter(a => a.sessionId === ss.id && ['Present','Late'].includes(a.status) && !s.evaluations.some(v => v.sessionId === ss.id && v.personId === a.personId));
        if (due.length) { evaluations += due.length; alerts.push({title:`${due.length} completion evaluation(s) due · ${ss.title}`, text:`${c.title} · criteria: ${ss.criteria}`, href:`supervisor/evaluations?mode=provider&resource=${e.id}`, action:'Evaluate'}); }
      }
      if (e.status === 'Completed' && !s.closingReports.some(r => r.experienceId === e.id && r.supervisorId === p.id)) alerts.push({title:`Closing report due · ${e.title}`, text:'The Provider sees it in Reports.', href:`supervisor/reports?mode=provider&resource=${e.id}`, action:'Write report'});
    }
  }
  agenda.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const notices = (s.notifications || []).filter(n => n.recipientId === p.id).slice(0, 5);
  const greet = `<section class="iw-hero is-supervisor iw-reveal"><div class="iw-hero-copy"><p class="eyebrow">SUPERVISOR · ${list.length} ACTIVE ASSIGNMENT${list.length === 1 ? '' : 'S'}</p><h1>${list.length ? `Steady hands, ${esc(p.name.split(' ')[0])}.` : `Welcome, ${esc(p.name.split(' ')[0])}.`}</h1><p class="iw-lead">${list.length ? 'Each assignment keeps its own authority: Initiative duty comes from an Institution Representative, Provider duty from an Outdoor Provider. Choose one to work in.' : 'Your Institution invitations and Provider appointments appear here. This workspace never grants itself an appointment.'}</p>${list.length ? `<div class="actions">${u.link('Attendance desk', current?.type === 'provider' ? `supervisor/attendance?mode=provider&resource=${current.id}` : 'supervisor/attendance', 'button primary')}${u.link('Insights & reports', current?.type === 'provider' ? `supervisor/reports?mode=provider&resource=${current.id}` : 'supervisor/reports', 'button quiet')}</div>` : ''}</div><div class="iw-hero-badge"><span class="iw-verified">${u.icon('shield')}${list.length ? 'Active appointment' + (list.length > 1 ? 's' : '') : 'No active appointment'}</span><dl><div><dt>Initiatives</dt><dd>${list.filter(c => c.type === 'initiative').length}</dd></div><div><dt>Provider</dt><dd>${list.filter(c => c.type === 'provider').length}</dd></div></dl></div></section>`;
  if (!list.length) return greet + (pendingCards.length ? card('Waiting for your answer', `<ul class="iw-attention">${pendingCards.join('')}</ul>`, {eyebrow:'NEW'}) : emptyState('No assignments yet.', 'An Institution Representative or an Outdoor Provider assigns you to specific work. Your invitations will appear here.')) + endedCard(ended);
  return greet + contextBar(ctx, current)
    + (pendingCards.length ? card('Waiting for your answer', `<ul class="iw-attention">${pendingCards.join('')}</ul>`, {eyebrow:'NEW'}) : '')
    + stats([stat(list.length, 'Active assignments'), stat(agenda.length, 'Upcoming sessions on duty'), stat(attendanceDue, 'Attendance needing action', {tone:attendanceDue ? 'attention' : ''}), stat(excuses, 'Excuse recommendations', {tone:excuses ? 'attention' : ''}), stat(evaluations, 'Completion evaluations due', {tone:evaluations ? 'attention' : ''}), stat(reports, 'Coach reports received')])
    + `<div class="iw-split is-wide">${card('Needs your attention', attention(alerts), {eyebrow:'ACROSS YOUR ASSIGNMENTS'})}${card('Your next duty', agenda.length ? `<ol class="iw-agenda">${agenda.slice(0, 6).map(x => `<li><time><b>${esc(new Date(x.date + 'T12:00').getDate())}</b><span>${esc(new Date(x.date + 'T12:00').toLocaleDateString('en-GB', {month:'short'}))}</span></time><div><strong>${esc(x.title)}</strong><small>${esc(x.time)} · ${x.c.type === 'initiative' ? 'Initiative' : 'Provider'} · ${esc(x.c.title)}</small></div>${u.link('Desk', x.href, 'button quiet small')}</li>`).join('')}</ol>` : '<p class="iw-muted">No upcoming sessions assigned to you.</p>')}</div>`
    + `<div class="iw-split">${card('Your assignments', `<ul class="iw-assignments">${list.map(c => assignmentRow(ctx, c)).join('')}</ul>`, {eyebrow:'SCOPE'})}${card('Recent notices', notices.length ? `<ul class="iw-mini-list">${notices.map(n => `<li><span>${esc(n.text)}</span><small>${esc(fmtDate(n.created))}</small></li>`).join('')}</ul>` : '<p class="iw-muted">No notices yet.</p>', {extra:'<small class="iw-muted">Shown in DeepSprout only · no email</small>'})}</div>`
    + endedCard(ended);
}
function assignmentRow(ctx, c) {
  const {s, person:p} = ctx;
  if (c.type === 'initiative') { const i = s.initiatives.find(x => x.id === c.id), sum = summary(s, i); return `<li><span class="iw-context-tag">${u.icon('nodes')}Initiative</span><div><strong>${esc(c.title)}</strong><small>${esc(c.owner)} · ${sum.accepted}/${sum.cap} students · ${sum.groups.length} groups · ${sum.sessions.filter(x => (x.supervisorIds || []).includes(p.id)).length} session duty</small></div>${pill(i.status)}</li>`; }
  const e = s.experiences.find(x => x.id === c.id), cohorts = s.cohorts.filter(x => x.supervisorId === p.id && x.experienceId === e.id && x.status === 'Active');
  return `<li><span class="iw-context-tag">${u.icon('mountain')}Provider</span><div><strong>${esc(c.title)}</strong><small>${esc(c.owner)} · ${c.appointment.sessionIds.length} assigned session(s) · ${cohorts.length} cohort(s) · ${esc(c.appointment.scope)}</small></div>${pill(e.status)}</li>`;
}
function endedCard(ended) {
  return ended.length ? card('Ended appointments', `<ul class="iw-mini-list">${ended.map(x => `<li><span>${esc(x.kind)} · ${esc(x.title || '')}</span><small>${esc(x.status)}${x.at ? ` ${esc(fmtDate(x.at))}` : ''}${x.reason ? ` · ${esc(x.reason)}` : ''}</small></li>`).join('')}</ul><p class="iw-muted">Access to these rosters has ended. Records you authored remain attributed to you.</p>`) : '';
}

/* ------------------------------------------- Provider attendance desk */

export function renderProviderDesk(ctx, current) {
  const {s, person:p, route:r} = ctx;
  const e = s.experiences.find(x => x.id === current.id), sessions = providerSessions(s, current).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const ss = sessions.find(x => x.id === r.query.get('session')) || sessions.find(x => x.date >= today(s)) || sessions[0];
  if (!ss) return emptyState('No assigned session.', 'Your appointment does not include a session yet.');
  const cohorts = s.cohorts.filter(c => c.supervisorId === p.id && c.experienceId === e.id && c.status === 'Active');
  const roster = s.bookings.filter(b => b.experienceId === e.id && ['Confirmed','Checked In','Completed'].includes(b.status) && (!cohorts.length || cohorts.some(c => c.memberIds.includes(b.personId))));
  const rows = roster.map(b => ({b, a:s.attendance.find(x => x.sessionId === ss.id && x.personId === b.personId && x.status !== 'Corrected')}));
  const present = rows.filter(x => x.a && x.a.status !== 'Absent').length, absent = rows.filter(x => x.a?.status === 'Absent').length;
  const w = checkInWindow(s, ss, e.timezone), open = w.state === 'open', readOnly = ['Completed','Cancelled','Archived'].includes(e.status), closed = (ss.closedBy || []).some(x => x.actorId === p.id);
  const picker = `<label class="iw-scope is-select">${u.icon('calendar')}<span class="sr-only">Session</span><select data-action="pdesk-session">${sessions.map(x => `<option value="${esc(x.id)}" ${x.id === ss.id ? 'selected' : ''}>${esc(x.title)} · ${esc(fmtDate(x.date))}</option>`).join('')}</select></label>`;
  const row = ({b, a}) => `<li class="iw-roster-row ${a ? `is-${a.status.toLowerCase()}` : ''}">${personCell(s, b.personId, `In person · <code class="iw-code">${esc(b.credential || '—')}</code>`)}<div class="actions">${a ? `${pill(a.status)}<small>${esc(a.method)}</small>${readOnly ? '' : u.button('Correct', 'pdesk-correct', {id:a.id}, 'button quiet small')}` : readOnly ? pill('Not Recorded', 'Not recorded') : `${u.button('Manual check-in', 'pdesk-manual', {person:b.personId, session:ss.id}, 'button quiet small')}${u.button('Late', 'pdesk-late', {person:b.personId, session:ss.id}, 'button quiet small')}${u.button('Absent', 'pdesk-absent', {person:b.personId, session:ss.id}, 'button quiet small')}`}</div></li>`;
  return head({eyebrow:`PROVIDER APPOINTMENT · ${current.owner.toUpperCase()}`, title:'Attendance desk', lead:`${e.title}: record factual attendance for your assigned session only. Bookings stay with the Provider, and check-in is never completion — evaluate completion separately against the published criteria.`, meta:picker})
    + `<div class="iw-banner ${open ? 'is-positive' : 'is-warning'} iw-reveal" role="status">${u.icon('clock')}<div><strong>${readOnly ? 'Experience closed · read only' : open ? 'Check-in window open' : w.state === 'early' ? 'Check-in not open yet' : 'Check-in window closed'}</strong><p>${esc(windowMessage(w))}</p></div></div>`
    + stats([stat(roster.length, cohorts.length ? 'Your cohort roster' : 'Confirmed roster'), stat(present, 'Checked in', {of:roster.length}), stat(absent, 'Absent'), stat(roster.length - present - absent, 'Not recorded yet', {tone:roster.length - present - absent ? 'attention' : ''})])
    + `<div class="iw-split">${card('QR or booking code', `<form class="iw-checkin" data-form="provider-checkin" data-session="${esc(ss.id)}" data-scan-target><label class="field"><span>Scan the participant’s booking QR or type / paste its code</span><input name="code" autocomplete="off" autocapitalize="characters" placeholder="DS-XXXX-00" required ${open && !readOnly ? '' : 'disabled'}></label><div class="actions"><button class="button primary" ${open && !readOnly ? '' : 'disabled'}>Verify &amp; check in</button>${'BarcodeDetector' in window && open && !readOnly ? u.button('Scan with camera', 'att-scan', {session:ss.id}, 'button quiet') : ''}</div><p class="form-error" role="alert"></p></form><video class="iw-scanner" hidden playsinline muted></video><p class="iw-muted">A code identifies one Provider booking. Repeated scans never create a second record.</p>`, {eyebrow:'IN PERSON'})}
      ${card('Close attendance', `<p class="iw-muted">After the session starts, close attendance to record everyone still unrecorded on your roster as Absent. Completion is evaluated separately.</p>${readOnly ? pill('Closed', 'Read only') : closed ? pill('Closed', 'Attendance closed') : w.started ? u.button('Close attendance & mark the rest Absent', 'pdesk-closeout', {session:ss.id}, 'button secondary') : '<p class="iw-muted">Available once the session has started.</p>'}${u.link('Completion evaluations', `supervisor/evaluations?mode=provider&resource=${e.id}`, 'text-link')}`, {eyebrow:'END OF SESSION'})}</div>`
    + card(`Roster · ${ss.title}`, rows.length ? `<ul class="iw-roster">${rows.map(row).join('')}</ul>` : '<p class="iw-muted">No confirmed bookings in your scope.</p>', {extra:`<small class="iw-muted">${esc(fmtDate(ss.date))} · ${esc(ss.time)}–${esc(ss.endTime)} · ${esc(ss.venue)}</small>`})
    + (rows.some(x => x.a?.history?.length) ? card('Correction history', `<ol class="iw-history">${rows.filter(x => x.a?.history?.length).flatMap(x => x.a.history.map(h => `<li><time>${esc(fmtDate(h.at))}</time><span>${esc(nameOf(s, x.b.personId))}: ${esc(h.from)} → <strong>${esc(h.to)}</strong> · ${esc(h.reason)}</span><small>${esc(nameOf(s, h.actorId))}</small></li>`)).join('')}</ol>`) : '');
}
export function providerDeskAction(action, target, ctx) {
  const d = target.dataset;
  const record = (payload, msg) => { const status = ctx.run('supervisor.attendance', payload, msg); u.toast(`${msg} (${status})`); ctx.render(); };
  if (action === 'pdesk-manual' || action === 'pdesk-late') { u.modal(action === 'pdesk-late' ? 'Record a late arrival' : 'Manual check-in exception', `<p>Use when the QR or booking code cannot be verified. Your name, the time and this reason are recorded.</p>${u.area('reason', 'Reason', '', true)}`, v => record({sessionId:d.session, personId:d.person, method:'manual', status:action === 'pdesk-late' ? 'Late' : 'Present', reason:v.reason}, action === 'pdesk-late' ? 'Late arrival recorded' : 'Manual check-in recorded'), 'Record'); return true; }
  if (action === 'pdesk-absent') { record({sessionId:d.session, personId:d.person, method:'absent'}, 'Absence recorded'); return true; }
  if (action === 'pdesk-closeout') { u.confirm('Close attendance for this session?', 'Everyone on your roster without a record will be recorded Absent.', () => { const n = ctx.run('supervisor.attendance.closeout', {sessionId:d.session}, 'Attendance closed.'); u.toast(`Attendance closed · ${n} recorded Absent.`); ctx.render(); }); return true; }
  if (action === 'pdesk-correct') { const a = ctx.s.attendance.find(x => x.id === d.id); u.modal('Correct factual attendance', `<p>Current: <strong>${esc(a.status)}</strong>. The original record, your name and the reason are kept; a completion that depended on it is set back for review.</p>${u.select('status', 'Correct to', ['Present','Late','Absent'].filter(x => x !== a.status))}${u.area('reason', 'Reason', '', true)}`, v => { ctx.run('supervisor.attendance.correct', {id:a.id, ...v}, 'Attendance corrected with history.'); ctx.render(); }, 'Save correction'); return true; }
  return false;
}
export function providerDeskSubmit(form, ctx) {
  if (form.dataset.form !== 'provider-checkin') return false;
  const status = ctx.run('supervisor.attendance', {sessionId:form.dataset.session, method:'code', credential:form.elements.code.value}, 'Checked in.');
  u.toast(`Booking verified · ${status}`); ctx.render(); return true;
}
