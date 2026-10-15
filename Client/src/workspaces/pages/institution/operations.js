/**
 * Sessions, factual attendance and the excuse chain.
 * Representative: schedules sessions, assigns Supervisor duty, sees rosters
 * and makes the final excuse decision. Supervisor: records attendance for
 * sessions assigned to them and recommends on excuses.
 */
import * as u from '../../ui.js';
import {esc,nameOf,pill,head,stats,stat,card,personCell,emptyState,summary,initiativeSwitcher,withInitiative,fmtDate,sessionWhen,tabs} from './common.js';
import {needsSupervisor,assignedActiveSupervisors,activeGrantsFor,isActiveSupervisor,confirmedInMode,modeCapacity,today} from '../../initiative-rules.js';

const pickInitiative = (ctx, initiatives) => { const i = initiatives.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives.find(x => x.status === 'Published') || initiatives[0]; if (i) ctx.localUI.initiativeId = i.id; return i; };
const roster = (s, ss) => s.sessionRegistrations.filter(r => r.sessionId === ss.id && r.status === 'Confirmed');
const attendanceFor = (s, r) => (s.sessionAttendance || []).find(a => a.registrationId === r.id);
const METHOD = {'qr':'QR scan', 'booking-code':'Booking code', 'online-verified':'Online roster', 'manual-exception':'Manual exception', 'roster':'Marked absent', 'close-out':'Not checked in at close'};

function supervisorChip(s, ss) {
  if (!ss.attendanceRequired) return pill('Open', 'No attendance');
  const names = assignedActiveSupervisors(s, ss).map(pid => nameOf(s, pid));
  return names.length ? `<span class="iw-duty">${u.icon('shield')}${esc(names.join(', '))}</span>` : pill('Needs Supervisor');
}
function seatsText(s, ss) {
  const parts = [];
  if (ss.format !== 'In-person') parts.push(`${confirmedInMode(s, ss, 'Online')}/${modeCapacity(ss, 'Online')} online`);
  if (ss.format !== 'Online') parts.push(`${confirmedInMode(s, ss, 'In-person')}/${modeCapacity(ss, 'In-person')} in person`);
  return parts.join(' · ');
}

/* ------------------------------------------------------- Representative */

export function renderSessions(ctx, {role, initiatives}) {
  const {s, route:r} = ctx;
  if (r.id) return renderSessionDetail(ctx, r.id, role, initiatives);
  const i = pickInitiative(ctx, initiatives);
  if (!i) return head({eyebrow:'SESSIONS & WORKSHOPS', title:'Sessions & workshops'}) + emptyState('No initiative yet.', 'Sessions belong to an initiative.', role === 'rep' ? u.link('Create an initiative', 'organization/initiatives/new', 'button primary') : '');
  const sessions = s.sessions.filter(x => x.initiativeId === i.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const calendar = r.query.get('view') === 'calendar';
  const sum = summary(s, i);
  const actionsFor = ss => {
    const out = [u.link('Open', `${r.area}/${r.page}/${ss.id}`, 'button quiet small')];
    if (role === 'rep' && ss.status === 'Draft') out.unshift(u.button('Publish', 'session-publish', {id:ss.id}, 'button primary small'));
    if (role === 'rep' && ss.status !== 'Cancelled') out.push(u.button('Edit', 'session-edit', {id:ss.id}, 'button quiet small'));
    if (ss.status !== 'Cancelled' && ss.attendanceRequired) out.push(u.button('Supervisor duty', 'session-assign', {id:ss.id}, 'button quiet small'));
    return `<div class="actions">${out.join('')}</div>`;
  };
  const list = calendar
    ? `<div class="iw-calendar">${sessions.map(ss => `<article class="iw-day ${needsSupervisor(s, ss) ? 'is-warning' : ''} iw-reveal"><time><b>${esc(new Date(ss.date + 'T12:00').getDate())}</b><span>${esc(new Date(ss.date + 'T12:00').toLocaleDateString('en-GB', {month:'short', weekday:'short'}))}</span></time><div><h3>${esc(ss.title)}</h3><p>${esc(ss.time)}–${esc(ss.endTime)} · ${esc(ss.format)}${ss.venue ? ` · ${esc(ss.venue)}` : ''}</p><div class="actions">${pill(ss.status)}${supervisorChip(s, ss)}</div>${actionsFor(ss)}</div></article>`).join('') || '<p class="iw-muted">No sessions yet.</p>'}</div>`
    : `<div class="iw-card iw-reveal">${sessions.length ? u.table(['Session','When','Mode & seats','Supervisor duty','Status','Actions'], sessions.map(ss => ({search:ss.title, status:ss.status, cells:[`<strong>${esc(ss.title)}</strong><small>${esc(ss.speaker || '')}</small>`, `${esc(sessionWhen(ss))}<small>${esc(ss.timezone || 'Asia/Amman')}</small>`, `${esc(ss.format)}<small>${esc(seatsText(s, ss))}</small>`, supervisorChip(s, ss), `${pill(ss.status)}${ss.closedOut ? '<small>Attendance closed</small>' : ''}`, actionsFor(ss)]}))) : emptyState('No sessions yet.', 'Add an online, in-person or hybrid session. Session registration is separate from initiative membership.', role === 'rep' ? u.button('Create session', 'session-create', {initiative:i.id}) : '')}</div>`;
  return head({eyebrow:role === 'rep' ? 'TIME TOGETHER' : 'SUPERVISOR · SCHEDULE', title:role === 'rep' ? 'Sessions & workshops' : 'Schedule', lead:'Each session has its own registration, seats by mode and a responsible Supervisor. Attendance cannot be confirmed until an active Supervisor is assigned.', meta:initiativeSwitcher(ctx, initiatives, i), actions:role === 'rep' ? u.button('Create session', 'session-create', {initiative:i.id}) : ''})
    + (sum.needsSupervisor.length ? `<div class="iw-banner is-warning iw-reveal">${u.icon('shield')}<div><strong>${sum.needsSupervisor.length} session${sum.needsSupervisor.length === 1 ? '' : 's'} need${sum.needsSupervisor.length === 1 ? 's' : ''} a Supervisor.</strong><p>Attendance confirmation is disabled until an active Supervisor is assigned. ${sum.supervisors.length ? 'Assign duty from the session row.' : 'Invite a Supervisor from Team & Groups first.'}</p></div>${role === 'rep' && !sum.supervisors.length ? u.link('Invite a Supervisor', withInitiative('organization/team', i), 'button quiet small') : ''}</div>` : '')
    + tabs([['List', withInitiative(`${r.area}/${r.page}`, i), 'list'], ['Calendar', withInitiative(`${r.area}/${r.page}?view=calendar`, i), 'calendar']], calendar ? 'calendar' : 'list') + list;
}

export function renderSessionDetail(ctx, id, role, initiatives) {
  const {s, route:r} = ctx;
  const ss = s.sessions.find(x => x.id === id && initiatives.some(i => i.id === x.initiativeId));
  if (!ss) return u.missing('session');
  const i = s.initiatives.find(x => x.id === ss.initiativeId);
  const regs = roster(s, ss);
  const rows = regs.map(reg => { const a = attendanceFor(s, reg); const ex = a ? (s.excuses || []).find(e => e.attendanceId === a.id) : null; return {search:nameOf(s, reg.personId), cells:[personCell(s, reg.personId), esc(reg.mode), `<code class="iw-code">${esc(reg.code)}</code>`, a ? `${pill(a.status)}<small>${esc(METHOD[a.method.split(' ·')[0]] || a.method)} · ${esc(nameOf(s, a.actorId))}</small>` : pill('Not Recorded', 'Not recorded'), ex ? pill(ex.status === 'Accepted' ? 'Excused' : ex.status, ex.status === 'Accepted' ? 'Excused absence' : `Excuse: ${ex.status}`) : '<small>—</small>']}; });
  return `<p class="breadcrumbs">${u.link(role === 'rep' ? 'Sessions & workshops' : 'Schedule', withInitiative(`${r.area}/${r.page}`, i), 'text-link')} / ${esc(ss.title)}</p>`
    + head({eyebrow:`${i.title.toUpperCase()} · SESSION`, title:ss.title, lead:ss.description || '', meta:`${pill(ss.status)} ${supervisorChip(s, ss)}`, actions:[role === 'rep' && ss.status === 'Draft' ? u.button('Publish', 'session-publish', {id:ss.id}) : '', role === 'rep' && ss.status !== 'Cancelled' ? u.button('Edit / reschedule', 'session-edit', {id:ss.id}, 'button quiet') : '', ss.status !== 'Cancelled' && ss.attendanceRequired ? u.button('Supervisor duty', 'session-assign', {id:ss.id}, 'button quiet') : '', role === 'rep' && ['Draft','Published'].includes(ss.status) ? u.button('Cancel session', 'session-cancel', {id:ss.id}, 'button danger') : '', role === 'supervisor' && (ss.supervisorIds || []).includes(ctx.person.id) && ss.status === 'Published' ? u.link('Open attendance', `supervisor/attendance?session=${ss.id}`, 'button primary') : ''].join('')})
    + (needsSupervisor(s, ss) ? `<div class="iw-banner is-warning iw-reveal">${u.icon('shield')}<div><strong>Needs Supervisor</strong><p>Attendance confirmation is disabled for this session until an active Supervisor is assigned.</p></div></div>` : '')
    + `<div class="iw-split">${card('Details', `<dl class="iw-facts"><div><dt>When</dt><dd>${esc(sessionWhen(ss))} · ${esc(ss.timezone || 'Asia/Amman')}</dd></div><div><dt>Mode</dt><dd>${esc(ss.format)}</dd></div>${ss.venue ? `<div><dt>Venue</dt><dd>${esc(ss.venue)}</dd></div>` : ''}${ss.format !== 'In-person' ? `<div><dt>Online access</dt><dd>${esc(ss.meeting || 'Shared with confirmed registrants')}</dd></div>` : ''}<div><dt>Seats</dt><dd>${esc(seatsText(s, ss))}</dd></div><div><dt>Registration window</dt><dd>${esc(ss.registrationOpen ? fmtDate(ss.registrationOpen) : 'Now')} – ${esc(fmtDate(ss.registrationClose || ss.date))}</dd></div><div><dt>Agenda</dt><dd>${esc(ss.agenda || '—')}</dd></div><div><dt>Completion rule</dt><dd>${esc(ss.completionRule || 'Attendance only')}</dd></div></dl>${ss.cancelReason ? `<p class="iw-muted">Cancelled: ${esc(ss.cancelReason)}</p>` : ''}`)}
      ${card('Change history', `<ol class="iw-history">${(ss.history || []).map(h => `<li><time>${esc(fmtDate(h.at))}</time><span>${esc(h.change)}${h.reason ? ` · ${esc(h.reason)}` : ''}</span><small>${esc(nameOf(s, h.actorId))}</small></li>`).join('') || '<li><span>No changes recorded.</span></li>'}</ol>`)}</div>`
    + card(`Confirmed roster · ${regs.length}`, regs.length ? u.table(['Participant','Mode','Booking code','Factual attendance','Excuse'], rows) : '<p class="iw-muted">No confirmed registrations yet. Accepted students register from My Initiatives.</p>', {extra:role === 'rep' ? '<small class="iw-muted">Read-only: attendance is recorded by the assigned Supervisor.</small>' : ''});
}

function sessionForm(ctx, ss, initiativeId) {
  const i = ctx.s.initiatives.find(x => x.id === initiativeId);
  const supervisors = activeGrantsFor(ctx.s, initiativeId, 'supervisor');
  return `${u.field('title', 'Session title', ss.title || '', 'text', true)}${u.field('speaker', 'Host / facilitator', ss.speaker || ctx.person.name, 'text', true)}${u.area('description', 'Short description', ss.description || '')}${u.area('agenda', 'Agenda', ss.agenda || '')}
    <div class="form-grid">${u.field('date', 'Date', ss.date || i.start, 'date', true)}${u.select('format', 'Mode', ['Online','In-person','Hybrid'], ss.format || 'Online')}${u.field('time', 'Start', ss.time || '17:00', 'time', true)}${u.field('endTime', 'End', ss.endTime || '18:00', 'time', true)}${u.field('onlineCapacity', 'Online seats', ss.onlineCapacity || 30, 'number', false, 'min="0"')}${u.field('inPersonCapacity', 'In-person seats', ss.inPersonCapacity || 20, 'number', false, 'min="0"')}${u.field('registrationOpen', 'Registration opens', ss.registrationOpen || i.registrationOpen || '', 'date')}${u.field('registrationClose', 'Registration closes', ss.registrationClose || '', 'date')}</div>
    ${u.field('venue', 'Venue (in-person or hybrid)', ss.venue || i.venue || '')}${u.field('meeting', 'Online access note (protected link shared later)', ss.meeting || 'Protected meeting link shared with confirmed registrants')}${u.field('completionRule', 'Completion rule', ss.completionRule || 'Attendance only')}
    ${u.checkbox('attendanceRequired', 'This session records attendance (needs an active Supervisor)', ss.attendanceRequired !== false)}
    ${supervisors.length ? `<fieldset class="iw-fieldset"><legend>Responsible Supervisor(s)</legend>${supervisors.map(g => u.checkbox('supervisorIds', nameOf(ctx.s, g.personId), (ss.supervisorIds || []).includes(g.personId), g.personId)).join('')}</fieldset>` : '<p class="iw-muted">No active Supervisor yet — the session will show “Needs Supervisor” until one is assigned.</p>'}
    ${ss.status === 'Published' ? u.area('reason', 'Reason for the change (sent to registrants if the time or place moves)', '') : ''}`;
}
export function sessionAction(action, target, ctx) {
  const d = target.dataset, s = ctx.s;
  if (action === 'session-create' || action === 'session-edit') {
    const ss = s.sessions.find(x => x.id === d.id) || {};
    const initiativeId = ss.initiativeId || d.initiative || ctx.localUI.initiativeId;
    u.modal(ss.id ? 'Edit or reschedule session' : 'Create a session', sessionForm(ctx, ss, initiativeId), (v, f) => {
      const id = ctx.run('initiative.session.save', {...v, id:ss.id, initiativeId, attendanceRequired:f.elements.attendanceRequired.checked, supervisorIds:[...f.querySelectorAll('input[name="supervisorIds"]:checked')].map(x => x.value)}, ss.id ? 'Session updated. Registrants are notified of time or place changes.' : 'Session saved as a draft.');
      ctx.go(`${ctx.route.area}/sessions/${id}`);
    }, ss.id ? 'Save changes' : 'Save draft');
    return true;
  }
  if (action === 'session-publish') { ctx.run('initiative.session.publish', {id:d.id}, 'Session published. Accepted students can register.'); ctx.render(); return true; }
  if (action === 'session-cancel') { u.modal('Cancel this session?', `<p>Registrants are notified. Existing registrations and attendance stay in history.</p>${u.area('reason', 'Reason', '', true)}`, v => { ctx.run('initiative.session.cancel', {id:d.id, reason:v.reason}, 'Session cancelled and registrants notified.'); ctx.render(); }, 'Cancel session'); return true; }
  if (action === 'session-assign') {
    const ss = s.sessions.find(x => x.id === d.id), sups = activeGrantsFor(s, ss.initiativeId, 'supervisor');
    u.modal('Responsible Supervisor', sups.length ? `<p>Only active Supervisors of this initiative can confirm attendance.</p><fieldset class="iw-fieldset">${sups.map(g => u.checkbox('supervisorIds', nameOf(s, g.personId), (ss.supervisorIds || []).includes(g.personId), g.personId)).join('')}</fieldset>` : '<p>No active Supervisor has accepted an invitation for this initiative yet. Invite one from Team & Groups.</p>', (v, f) => { ctx.run('initiative.session.assign', {id:ss.id, supervisorIds:[...f.querySelectorAll('input[name="supervisorIds"]:checked')].map(x => x.value)}, 'Supervisor duty updated.'); ctx.render(); }, 'Save duty');
    return true;
  }
  return false;
}

/* ------------------------------------------------------ Supervisor desk */

export function renderAttendanceDesk(ctx, {initiatives}) {
  const {s, person:p, route:r} = ctx;
  const mine = s.sessions.filter(ss => initiatives.some(i => i.id === ss.initiativeId) && ss.status === 'Published').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const assigned = mine.filter(ss => (ss.supervisorIds || []).includes(p.id));
  const ss = assigned.find(x => x.id === r.query.get('session')) || assigned.find(x => x.date >= today(s)) || assigned[0];
  if (!ss) return head({eyebrow:'SUPERVISOR · ATTENDANCE', title:'Attendance'}) + emptyState('No session duty assigned to you.', 'The Representative (or another active Supervisor) assigns duty per session. Unassigned sessions show “Needs Supervisor”.', u.link('View schedule', 'supervisor/schedule', 'button quiet'));
  const regs = roster(s, ss), i = s.initiatives.find(x => x.id === ss.initiativeId);
  const recorded = regs.map(reg => ({reg, a:attendanceFor(s, reg)}));
  const present = recorded.filter(x => x.a && x.a.status !== 'Absent').length, absent = recorded.filter(x => x.a?.status === 'Absent').length;
  const inPerson = ss.format !== 'Online', online = ss.format !== 'In-person';
  const sessionPicker = `<label class="iw-scope is-select">${u.icon('calendar')}<span class="sr-only">Session</span><select data-action="desk-session">${assigned.map(x => `<option value="${esc(x.id)}" ${x.id === ss.id ? 'selected' : ''}>${esc(x.title)} · ${esc(fmtDate(x.date))}</option>`).join('')}</select></label>`;
  const rowFor = ({reg, a}) => {
    let actions = '';
    if (a) actions = `${pill(a.status)}<small>${esc(METHOD[a.method.split(' ·')[0]] || a.method)}</small>${u.button('Correct', 'att-correct', {id:a.id}, 'button quiet small')}`;
    else if (!ss.closedOut) actions = `${reg.mode === 'Online' ? u.button('Confirm online', 'att-online', {reg:reg.id, session:ss.id}, 'button primary small') : u.button('Manual check-in', 'att-manual', {reg:reg.id, session:ss.id}, 'button quiet small')}${u.button('Late', 'att-late', {reg:reg.id, session:ss.id, mode:reg.mode}, 'button quiet small')}${u.button('Absent', 'att-absent', {reg:reg.id, session:ss.id}, 'button quiet small')}`;
    else actions = pill('Not Recorded', 'Not recorded');
    return `<li class="iw-roster-row ${a ? `is-${a.status.toLowerCase()}` : ''}">${personCell(s, reg.personId, `${esc(reg.mode)} · <code class="iw-code">${esc(reg.code)}</code>`)}<div class="actions">${actions}</div></li>`;
  };
  return head({eyebrow:`SUPERVISOR · ${i.title.toUpperCase()}`, title:'Attendance desk', lead:'Record factual attendance only: Present, Late, Absent or Not recorded. Check-in is not completion, and an excuse never changes it.', meta:sessionPicker})
    + stats([stat(regs.length, 'Confirmed roster'), stat(present, 'Checked in', {of:regs.length}), stat(absent, 'Absent'), stat(regs.length - present - absent, 'Not recorded yet', {tone:regs.length - present - absent ? 'attention' : ''})])
    + `<div class="iw-split">${inPerson ? card('In-person check-in', `<form class="iw-checkin" data-form="checkin" data-session="${esc(ss.id)}"><label class="field"><span>Scan the QR or type / paste the booking code</span><input name="code" autocomplete="off" autocapitalize="characters" placeholder="DS-XXXXXX" required></label><div class="actions"><button class="button primary">Verify &amp; check in</button>${'BarcodeDetector' in window ? u.button('Scan with camera', 'att-scan', {session:ss.id}, 'button quiet') : ''}</div><p class="form-error" role="alert"></p></form><video class="iw-scanner" hidden playsinline muted></video><p class="iw-muted">The code identifies one booking for this session. A repeated scan never creates a second record. If the code can’t be read, use a manual check-in with a reason.</p>`, {eyebrow:'QR · BOOKING CODE'}) : ''}
      ${card(online ? 'Online roster' : 'Close attendance', `<p class="iw-muted">${online ? 'Confirm online participants you can actually see in the session — opening the link alone is not attendance.' : ''} When the session ends, close attendance: anyone still unrecorded is marked Absent and can submit an excuse.</p>${ss.closedOut ? pill('Closed', 'Attendance closed') : u.button('Close attendance & mark the rest Absent', 'att-closeout', {session:ss.id}, 'button secondary')}`, {eyebrow:'END OF SESSION'})}</div>`
    + card(`Roster · ${ss.title}`, regs.length ? `<ul class="iw-roster">${recorded.map(rowFor).join('')}</ul>` : '<p class="iw-muted">No confirmed registrations for this session.</p>', {extra:`<small class="iw-muted">${esc(sessionWhen(ss))} · ${esc(ss.format)}${ss.venue ? ` · ${esc(ss.venue)}` : ''}</small>`})
    + (recorded.some(x => x.a?.history?.length) ? card('Correction history', `<ol class="iw-history">${recorded.filter(x => x.a?.history?.length).flatMap(x => x.a.history.map(h => `<li><time>${esc(fmtDate(h.at))}</time><span>${esc(nameOf(s, x.reg.personId))}: ${esc(h.from)} → <strong>${esc(h.to)}</strong> · ${esc(h.reason)}</span><small>${esc(nameOf(s, h.actorId))}</small></li>`)).join('')}</ol>`) : '');
}
let scanStream = null;
export function attendanceAction(action, target, ctx) {
  const d = target.dataset;
  const record = (payload, msg) => { const status = ctx.run('initiative.attendance.record', payload, msg); u.toast(`${msg} (${status})`); ctx.render(); };
  if (action === 'att-online') { record({sessionId:d.session, method:'online', registrationId:d.reg}, 'Online attendance confirmed'); return true; }
  if (action === 'att-late') { u.modal('Record as Late', d.mode === 'Online' ? '<p>Confirm this online participant joined late.</p>' : u.area('reason', 'How was presence verified? (manual exception)', '', true), v => { record({sessionId:d.session, method:d.mode === 'Online' ? 'online' : 'manual', registrationId:d.reg, status:'Late', reason:v.reason}, 'Late arrival recorded'); }, 'Record Late'); return true; }
  if (action === 'att-manual') { u.modal('Manual check-in exception', `<p>Use only when the QR or booking code cannot be verified. Your name, the time and this reason are recorded.</p>${u.area('reason', 'Reason', '', true)}`, v => record({sessionId:d.session, method:'manual', registrationId:d.reg, reason:v.reason}, 'Manual check-in recorded'), 'Record presence'); return true; }
  if (action === 'att-absent') { record({sessionId:d.session, method:'absent', registrationId:d.reg}, 'Absence recorded'); return true; }
  if (action === 'att-closeout') { u.confirm('Close attendance for this session?', 'Everyone on the confirmed roster without a record will be marked Absent and notified that they can explain the absence.', () => { const n = ctx.run('initiative.attendance.closeout', {sessionId:d.session}, 'Attendance closed.'); u.toast(`Attendance closed · ${n} marked Absent.`); ctx.render(); }); return true; }
  if (action === 'att-correct') { const a = ctx.s.sessionAttendance.find(x => x.id === d.id); u.modal('Correct factual attendance', `<p>Current: <strong>${esc(a.status)}</strong>. The original record, your name and the reason are kept.</p>${u.select('status', 'Correct to', ['Present','Late','Absent'].filter(x => x !== a.status))}${u.area('reason', 'Reason', '', true)}`, v => { ctx.run('initiative.attendance.correct', {id:a.id, ...v}, 'Attendance corrected with history.'); ctx.render(); }, 'Save correction'); return true; }
  if (action === 'att-scan') {
    const video = document.querySelector('.iw-scanner');
    if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; video.hidden = true; return true; }
    navigator.mediaDevices?.getUserMedia({video:{facingMode:'environment'}}).then(stream => {
      scanStream = stream; video.srcObject = stream; video.hidden = false; video.play();
      const detector = new window.BarcodeDetector({formats:['qr_code']});
      const tick = async () => { if (!scanStream) return; try { const codes = await detector.detect(video); if (codes[0]) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; video.hidden = true; const input = document.querySelector('[data-form="checkin"] [name=code]'); input.value = codes[0].rawValue; input.form.requestSubmit(); return; } } catch {} requestAnimationFrame(tick); };
      tick();
    }).catch(() => u.toast('Camera unavailable. Type or paste the booking code instead.', true));
    return true;
  }
  return false;
}
export function attendanceSubmit(form, ctx) {
  if (form.dataset.form !== 'checkin') return false;
  const status = ctx.run('initiative.attendance.record', {sessionId:form.dataset.session, method:'code', code:form.elements.code.value}, 'Checked in.');
  u.toast(`Booking verified · ${status}`); ctx.render(); return true;
}

/* ---------------------------------------------------------- Excuses */

export function renderExcuses(ctx, {role, initiatives}) {
  const {s, route:r} = ctx;
  const i = pickInitiative(ctx, initiatives);
  if (!i) return head({eyebrow:'EXCUSES', title:role === 'rep' ? 'Attendance & excuses' : 'Notes & excuses'}) + emptyState('No initiative in your scope.', 'Excuses belong to a specific missed session.');
  const all = (s.excuses || []).filter(e => e.initiativeId === i.id).sort((a, b) => String(b.created).localeCompare(String(a.created)));
  const waiting = role === 'rep' ? all.filter(e => e.status === 'Recommended' || (e.status === 'Submitted' && !activeGrantsFor(s, i.id, 'supervisor').length)) : all.filter(e => e.status === 'Submitted');
  const sum = summary(s, i);
  const item = e => {
    const ss = s.sessions.find(x => x.id === e.sessionId), a = s.sessionAttendance.find(x => x.id === e.attendanceId);
    const canRecommend = role === 'supervisor' && ['Submitted','Info Requested','Recommended'].includes(e.status) && isActiveSupervisor(s, i.id, ctx.person.id);
    const canDecide = role === 'rep' && !['Accepted','Rejected'].includes(e.status) && (e.status === 'Recommended' || !activeGrantsFor(s, i.id, 'supervisor').length);
    return `<article class="iw-excuse iw-reveal"><header>${personCell(s, e.personId, `${esc(ss?.title || 'Session')} · ${esc(fmtDate(ss?.date))}`)}<div class="actions">${pill(a?.status || 'Absent', `Attendance: ${a?.status || 'Absent'}`)}${pill(e.status === 'Recommended' ? 'Recommended' : e.status, e.status === 'Recommended' ? 'Awaiting final decision' : e.status)}</div></header>
      <blockquote>${esc(e.reason)}</blockquote>${e.attachment ? `<p class="iw-muted">${u.icon('form')} ${esc(e.attachment.name)} · restricted · ${esc(e.attachment.note)}</p>` : ''}
      <ol class="iw-chain"><li class="is-done"><span>Student</span><small>${esc(fmtDate(e.created))}</small></li><li class="${e.recommendation ? 'is-done' : 'is-now'}"><span>Supervisor</span><small>${e.recommendation ? `${esc(e.recommendation.decision)} · ${esc(nameOf(s, e.recommendation.actorId))}` : 'Recommendation pending'}</small></li><li class="${e.decision ? 'is-done' : e.recommendation ? 'is-now' : ''}"><span>Representative</span><small>${e.decision ? `${esc(e.decision.decision)} · ${esc(nameOf(s, e.decision.actorId))}` : 'Final decision pending'}</small></li></ol>
      ${e.recommendation ? `<p><strong>Supervisor note:</strong> ${esc(e.recommendation.note)}</p>` : ''}${e.decision ? `<p><strong>Decision:</strong> ${esc(e.decision.reason)}</p>` : ''}
      <div class="actions">${canRecommend ? u.button(e.recommendation ? 'Update recommendation' : 'Recommend', 'excuse-recommend', {id:e.id}, 'button primary small') : ''}${canDecide ? u.button('Accept excuse', 'excuse-decide', {id:e.id, decision:'Accepted'}, 'button primary small') + u.button('Reject excuse', 'excuse-decide', {id:e.id, decision:'Rejected'}, 'button quiet small') : ''}</div></article>`;
  };
  const tab = r.query.get('tab') || 'queue';
  const shown = tab === 'queue' ? waiting : all;
  const absences = sum.attendance.filter(x => x.status === 'Absent').length;
  return head({eyebrow:role === 'rep' ? 'FINAL DECISIONS' : 'SUPERVISOR · NOTES & EXCUSES', title:role === 'rep' ? 'Attendance & excuses' : 'Notes & excuses', lead:'Student explains → Supervisor recommends → Representative decides. Factual attendance stays “Absent”; an accepted excuse shows as an excused absence and never earns an attendance reward.', meta:initiativeSwitcher(ctx, initiatives, i)})
    + stats([stat(sum.attendance.filter(x => x.status !== 'Absent').length, 'Attended (Present/Late)'), stat(absences, 'Absent (factual)'), stat(all.filter(e => e.status === 'Accepted').length, 'Excuses accepted'), stat(waiting.length, role === 'rep' ? 'Awaiting your decision' : 'Awaiting your recommendation', {tone:waiting.length ? 'attention' : ''})])
    + tabs([['Needs action', withInitiative(`${r.area}/${r.page}?tab=queue`, i), 'queue', waiting.length], ['All excuses', withInitiative(`${r.area}/${r.page}?tab=all`, i), 'all', all.length]], tab)
    + (shown.length ? `<div class="iw-excuses">${shown.map(item).join('')}</div>` : emptyState(tab === 'queue' ? 'Nothing waiting.' : 'No excuses yet.', 'When a student explains a recorded absence, it appears here with its session and attendance context.'));
}
export function excuseAction(action, target, ctx) {
  const d = target.dataset;
  if (action === 'excuse-recommend') { u.modal('Your recommendation', `${u.select('decision', 'Recommendation', ['Accept','Reject','More information'])}${u.area('note', 'Supervisor note (seen by the Representative; a “More information” note is sent to the student)', '', true)}`, v => { ctx.run('initiative.excuse.recommend', {id:d.id, ...v}, 'Recommendation sent to the Representative.'); ctx.render(); }, 'Send recommendation'); return true; }
  if (action === 'excuse-decide') { u.modal(`${d.decision === 'Accepted' ? 'Accept' : 'Reject'} this excuse?`, `<p>${d.decision === 'Accepted' ? 'The student will see “Excused Absence”. Factual attendance stays Absent and no attendance reward is created.' : 'The absence stays unexcused. The student sees your reason.'}</p>${u.area('reason', 'Reason (shared with the student)', '', true)}`, v => { ctx.run('initiative.excuse.decide', {id:d.id, decision:d.decision, reason:v.reason}, 'Final decision recorded and the student notified.'); ctx.render(); }, d.decision === 'Accepted' ? 'Accept excuse' : 'Reject excuse'); return true; }
  return false;
}
