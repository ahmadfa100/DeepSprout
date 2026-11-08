/**
 * Supervisor contexts. One person may hold Initiative grants (from an
 * Institution Representative) and Outdoor Activity appointments (from the
 * organizing Institution). Every page acts under exactly one selected context; the two
 * kinds of authority are never merged. Counts come from the records.
 */
import * as u from '../../ui.js';
import {esc,nameOf,pill,head,stats,stat,card,attention,emptyState,summary,fmtDate,personCell} from './common.js';
import {checkInWindow,windowMessage,today} from '../../initiative-rules.js';
import {nowMs} from '../../domain.js';
import * as ds from '../../ds.js';
import {supervisorTimeline} from '../supervisor/insights.js';

/* -------------------------------------------------------- contexts */

export function supervisorContexts(ctx) {
  const {s, person:p} = ctx;
  const initiatives = s.initiatives.filter(i => !['Cancelled','Archived'].includes(i.status) && (s.grants || []).some(g => g.personId === p.id && g.role === 'supervisor' && g.scopeId === i.id && g.status === 'Active'))
    .map(i => ({key:`initiative:${i.id}`, type:'initiative', id:i.id, title:i.title, owner:s.organizations.find(o => o.id === i.ownerId)?.name || 'Institution', status:i.status}));
  const outdoor = (s.appointments || []).filter(a => a.personId === p.id && a.status === 'Accepted').map(a => {
    const e = s.experiences.find(x => x.id === a.experienceId);
    return e && {key:`activity:${e.id}`, type:'activity', id:e.id, title:e.title, owner:s.organizations.find(x => x.id === e.ownerId)?.name || 'Institution', status:e.status, appointment:a};
  }).filter(Boolean);
  return [...initiatives, ...outdoor];
}
/** The selected context: ?ctx=type:id, an explicit ?initiative= / ?resource=, the last choice, or the first available. */
export function currentContext(ctx) {
  const list = supervisorContexts(ctx), q = ctx.route.query;
  // A link to a specific session carries its own context (e.g. a duty notification).
  const sid = q.get('session') || (ctx.route.page === 'schedule' ? ctx.route.id : null);
  const owned = sid && (ctx.s.sessions.find(x => x.id === sid) ? `initiative:${ctx.s.sessions.find(x => x.id === sid).initiativeId}` : ctx.s.experienceSessions.find(x => x.id === sid) ? `activity:${ctx.s.experienceSessions.find(x => x.id === sid).experienceId}` : null);
  if (owned?.startsWith('activity:') && !q.get('resource')) q.set('resource', owned.split(':')[1]);
  const wanted = q.get('ctx') || (owned && list.some(c => c.key === owned) && owned) || (q.get('initiative') && `initiative:${q.get('initiative')}`) || (['provider','activity'].includes(q.get('mode')) && q.get('resource') && `activity:${q.get('resource')}`) || ctx.localUI.supCtx;
  const found = list.find(c => c.key === wanted) || (['provider','activity'].includes(q.get('mode')) && list.find(c => c.type === 'activity')) || list[0] || null;
  if (found) {
    ctx.localUI.supCtx = found.key;
    if (found.type === 'initiative') ctx.localUI.initiativeId = found.id;
    else if (!q.get('resource')) q.set('resource', found.id);
  }
  return found;
}
export function contextBar(ctx, current) {
  const list = supervisorContexts(ctx);
  if (list.length < 2) return ''; // one assignment: the page itself names it
  return `<nav class="iw-contexts" aria-label="Choose an assignment">${list.map(c => chip(c, c.key === current?.key, ctx.route.page)).join('')}</nav>`;
}
function chip(c, active, page) {
  const tag = c.type === 'initiative' ? 'Initiative Supervisor' : 'Outdoor Activity appointment';
  return `<button type="button" class="iw-context ${active ? 'is-active' : ''} is-${c.type}" data-action="sup-context" data-ctx="${esc(c.key)}" data-page="${esc(page || 'dashboard')}" ${active ? 'aria-current="true"' : ''}><span class="iw-context-tag">${u.icon(c.type === 'initiative' ? 'nodes' : 'mountain')}${tag}</span><strong>${esc(c.title)}</strong><small>${esc(c.owner)}</small></button>`;
}
export const INSTITUTION_PAGES = ['applications','students','coaches','excuses'];
export const ACTIVITY_PAGES = ['experiences','cohorts','participants','evaluations'];
export function notInContext(ctx, current, page) {
  const want = INSTITUTION_PAGES.includes(page) ? 'initiative' : 'activity';
  const other = supervisorContexts(ctx).find(c => c.type === want);
  const titles = {applications:'Applications', students:'Students & Groups', coaches:'Coaches', excuses:'Notes & excuses', experiences:'Assigned Experiences', cohorts:'My Cohorts', participants:'Participants', evaluations:'Completion evaluations'};
  return head({eyebrow:`NOT PART OF ${current.title.toUpperCase()}`, title:titles[page] || 'Not available here'}) + emptyState(want === 'initiative' ? 'This page belongs to an Initiative assignment.' : 'This page belongs to an Outdoor Activity appointment.',
    want === 'initiative' ? 'Applications, groups, Coaches and excuses are Institution Initiative duties. Outdoor Activity appointments never include them.' : 'Outdoor activities, activity groups and completion come from an Outdoor Activity appointment. Initiative grants never include Outdoor Activity operations.',
    other ? u.button(`Switch to ${other.title}`, 'sup-context', {ctx:other.key, page}, 'button primary') : '');
}
export function contextAction(action, target, ctx) {
  if (action !== 'sup-context') return false;
  ctx.localUI.supCtx = target.dataset.ctx;
  const [type, id] = target.dataset.ctx.split(':');
  if (type === 'initiative') ctx.localUI.initiativeId = id;
  const page = target.dataset.page || 'dashboard';
  ctx.go(`supervisor/${page}?${type === 'initiative' ? `initiative=${id}` : `mode=activity&resource=${id}`}`);
  return true;
}

/* ------------------------------------------------------- dashboard */

function activitySessions(s, c) { return s.experienceSessions.filter(x => x.experienceId === c.id && c.appointment.sessionIds.includes(x.id)); }
export function renderUnifiedDashboard(ctx) {
  const {s, person:p} = ctx, list = supervisorContexts(ctx), current = currentContext(ctx), day = today(s);
  const invites = (s.staffInvites || []).filter(x => x.role === 'supervisor' && x.status === 'Pending' && x.email === p.email.toLowerCase() && Date.parse(x.expires) > nowMs(s));
  const appointmentsInvited = (s.appointments || []).filter(a => a.status === 'Invited' && (a.personId === p.id || (!a.personId && a.email === p.email.toLowerCase())));
  const ended = [...(s.grants || []).filter(g => g.personId === p.id && g.role === 'supervisor' && g.status !== 'Active').map(g => ({title:s.initiatives.find(i => i.id === g.scopeId)?.title, kind:'Initiative', at:g.revokedAt, reason:g.reason, status:g.status})),
    ...(s.appointments || []).filter(a => a.personId === p.id && ['Revoked','Declined'].includes(a.status)).map(a => ({title:s.experiences.find(e => e.id === a.experienceId)?.title, kind:'Outdoor', at:a.revokedAt, reason:a.reason, status:a.status}))];
  const pendingCards = [...invites.map(x => `<li class="is-attention"><span class="iw-dot"></span><div><strong>${esc(s.initiatives.find(i => i.id === x.initiativeId)?.title)}</strong><p>Initiative Supervisor invitation · expires ${esc(fmtDate(x.expires))}</p></div>${u.link('Open invitation', `auth/staff-invitation/${x.token}`, 'button primary small')}</li>`),
    ...appointmentsInvited.map(a => { const e = s.experiences.find(x => x.id === a.experienceId); return `<li class="is-attention"><span class="iw-dot"></span><div><strong>${esc(e?.title)}</strong><p>Outdoor Activity appointment · ${a.sessionIds.length} session(s) · ${esc(a.scope)}</p></div><div class="actions">${a.personId === p.id ? u.button('Accept', 'appointment-accept', {id:a.id}, 'button primary small') + u.button('Decline', 'appointment-decline', {id:a.id}, 'button quiet small') : u.link('Open appointment', `auth/appointment/${a.token}`, 'button primary small')}</div></li>`; })];
  // Records-derived duties across both contexts.
  const agenda = [], alerts = [];
  let excuses = 0, evaluations = 0, reports = 0, attendanceDue = 0;
  for (const c of list) {
    if (c.type === 'initiative') {
      const i = s.initiatives.find(x => x.id === c.id), sum = summary(s, i);
      for (const ss of sum.sessions.filter(x => x.status === 'Published' && (x.supervisorIds || []).includes(p.id))) {
        const w = checkInWindow(s, ss);
        if (ss.date >= day) agenda.push({c, title:ss.title, date:ss.date, time:ss.time, href:`supervisor/attendance?initiative=${i.id}&session=${ss.id}`});
        if (w.started && !ss.closedOut) { attendanceDue++; alerts.push({title:`${w.state === "open" ? "Attendance open" : "Attendance to finalize"} · ${ss.title}`, text:`${c.title} · ${windowMessage(w)}`, href:`supervisor/attendance/${ss.id}`, action:'Open session'}); }
      }
      for (const ss of sum.needsSupervisor) alerts.push({tone:'critical', title:`Needs Supervisor · ${ss.title}`, text:c.title, href:`supervisor/schedule/${ss.id}?initiative=${i.id}`, action:'Take duty'});
      if (sum.pending) alerts.push({title:`${sum.pending} application(s) pending`, text:c.title, href:`supervisor/applications?initiative=${i.id}&status=pending`, action:'Review'});
      if (sum.excusesForSup.length) alerts.push({title:`${sum.excusesForSup.length} excuse(s) need your recommendation`, text:c.title, href:`supervisor/excuses?initiative=${i.id}`, action:'Recommend'});
      if (sum.unallocated.length) alerts.push({title:`${sum.unallocated.length} accepted student(s) without a group`, text:c.title, href:`supervisor/students?initiative=${i.id}`, action:'Allocate'});
      excuses += sum.excusesForSup.length; reports += sum.coachReports.length;
    } else {
      const e = s.experiences.find(x => x.id === c.id);
      for (const ss of activitySessions(s, c)) {
        const w = checkInWindow(s, ss, e.timezone), closed = (ss.closedBy || []).some(x => x.actorId === p.id);
        if (ss.date >= day) agenda.push({c, title:ss.title, date:ss.date, time:ss.time, href:`supervisor/attendance?mode=activity&resource=${e.id}&session=${ss.id}`});
        if (w.started && !closed && !['Completed','Cancelled','Archived'].includes(e.status)) { attendanceDue++; alerts.push({title:`${w.state === "open" ? "Attendance open" : "Attendance to finalize"} · ${ss.title}`, text:`${c.title} · ${windowMessage(w)}`, href:`supervisor/attendance/${ss.id}`, action:'Open session'}); }
        const due = s.attendance.filter(a => a.sessionId === ss.id && ['Present','Late'].includes(a.status) && !s.evaluations.some(v => v.sessionId === ss.id && v.personId === a.personId));
        if (due.length) { evaluations += due.length; alerts.push({title:`${due.length} completion evaluation(s) due · ${ss.title}`, text:`${c.title} · criteria: ${ss.criteria}`, href:`supervisor/evaluations?mode=activity&resource=${e.id}`, action:'Evaluate'}); }
      }
      if (e.status === 'Completed' && !s.closingReports.some(r => r.experienceId === e.id && r.supervisorId === p.id)) alerts.push({title:`Closing report due · ${e.title}`, text:'The Representative sees it in the activity’s Reports.', href:`supervisor/reports?mode=activity&resource=${e.id}`, action:'Write report'});
    }
  }
  agenda.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const notices = (s.notifications || []).filter(n => n.recipientId === p.id).slice(0, 5);
  const greet = `<section class="iw-hero is-supervisor iw-reveal"><div class="iw-hero-copy"><p class="eyebrow">SUPERVISOR · ${list.length} ACTIVE ASSIGNMENT${list.length === 1 ? '' : 'S'}</p><h1>${list.length ? `Steady hands, ${esc(p.name.split(' ')[0])}.` : `Welcome, ${esc(p.name.split(' ')[0])}.`}</h1><p class="iw-lead">${list.length ? 'Each assignment keeps its own authority: Initiative duty and Outdoor Activity duty are separate appointments from the Institution. Choose one to work in.' : 'Your Initiative invitations and Outdoor Activity appointments appear here. This workspace never grants itself an appointment.'}</p>${list.length ? `<div class="actions">${u.link('Attendance', 'supervisor/attendance', 'button primary')}${u.link('Insights & reports', current?.type === 'activity' ? `supervisor/reports?mode=activity&resource=${current.id}` : 'supervisor/reports', 'button quiet')}</div>` : ''}</div><div class="iw-hero-badge"><span class="iw-verified">${u.icon('shield')}${list.length ? 'Active appointment' + (list.length > 1 ? 's' : '') : 'No active appointment'}</span><dl><div><dt>Initiatives</dt><dd>${list.filter(c => c.type === 'initiative').length}</dd></div><div><dt>Outdoor</dt><dd>${list.filter(c => c.type === 'activity').length}</dd></div></dl></div></section>`;
  if (!list.length) return greet + (pendingCards.length ? card('Waiting for your answer', `<ul class="iw-attention">${pendingCards.join('')}</ul>`, {eyebrow:'NEW'}) : emptyState('No assignments yet.', 'An Institution Representative assigns you to a specific Initiative or Outdoor Activity. Your invitations will appear here.')) + endedCard(ended);
  return greet + contextBar(ctx, current)
    + (pendingCards.length ? card('Waiting for your answer', `<ul class="iw-attention">${pendingCards.join('')}</ul>`, {eyebrow:'NEW'}) : '')
    + stats([stat(list.length, 'Active assignments'), stat(agenda.length, 'Upcoming sessions on duty'), stat(attendanceDue, 'Attendance needing action', {tone:attendanceDue ? 'attention' : ''}), stat(excuses, 'Excuse recommendations', {tone:excuses ? 'attention' : ''}), stat(evaluations, 'Completion evaluations due', {tone:evaluations ? 'attention' : ''}), stat(reports, 'Coach reports received')])
    + `<div class="iw-split is-wide">${card('Needs your attention', attention(alerts), {eyebrow:'ACROSS YOUR ASSIGNMENTS'})}${card('Your next duty', agenda.length ? `<ol class="iw-agenda">${agenda.slice(0, 6).map(x => `<li><time><b>${esc(new Date(x.date + 'T12:00').getDate())}</b><span>${esc(new Date(x.date + 'T12:00').toLocaleDateString('en-GB', {month:'short'}))}</span></time><div><strong>${esc(x.title)}</strong><small>${esc(x.time)} · ${x.c.type === 'initiative' ? 'Initiative' : 'Outdoor'} · ${esc(x.c.title)}</small></div>${u.link('Open', x.href, 'button quiet small')}</li>`).join('')}</ol>` : '<p class="iw-muted">No upcoming sessions assigned to you.</p>')}</div>`
    + `<div class="iw-split">${card('Your assignments', `<ul class="iw-assignments">${list.map(c => assignmentRow(ctx, c)).join('')}</ul>`, {eyebrow:'SCOPE'})}${card('Recent notices', notices.length ? `<ul class="iw-mini-list">${notices.map(n => `<li><span>${esc(n.text)}</span><small>${esc(fmtDate(n.created))}</small></li>`).join('')}</ul>` : '<p class="iw-muted">No notices yet.</p>', {extra:'<small class="iw-muted">Shown in DeepSprout only · no email</small>'})}</div>`
    + activityInsights(ctx, list.filter(c => c.type === 'activity'))
    + supervisorTimeline(ctx)
    + endedCard(ended);
}
/** Field facts for the Supervisor's accepted Outdoor Activity sessions (their sessions only). */
function activityInsights(ctx, contexts) {
  if (!contexts.length) return '';
  const {s} = ctx, rows = [], day = today(s);
  for (const c of contexts) for (const ss of activitySessions(s, c).filter(x => x.date <= day)) {
    const booked = s.bookings.filter(b => b.experienceId === c.id && ['Confirmed','Checked In','Completed'].includes(b.status));
    const recs = s.attendance.filter(a => a.sessionId === ss.id && a.status !== 'Corrected' && booked.some(b => b.personId === a.personId));
    rows.push({label:ss.title, sub:`${c.title} · ${fmtDate(ss.date)}`, values:{present:recs.filter(a => a.status === 'Present').length, late:recs.filter(a => a.status === 'Late').length, absent:recs.filter(a => a.status === 'Absent').length, none:Math.max(0, booked.length - recs.length)}});
  }
  return ds.panel({title:'Outdoor sessions on your duty', eyebrow:'FACTUAL ATTENDANCE · BOOKED PARTICIPANTS', body:ds.stackBars({title:'Attendance on your Outdoor Activity sessions', rows, parts:[{key:'present', label:'Present', tone:'good'}, {key:'late', label:'Late', tone:'warning'}, {key:'absent', label:'Absent', tone:'critical'}, {key:'none', label:'Not recorded', tone:'muted'}], summary:rows.length ? 'Started sessions only. Check-in is attendance only; completion needs the published criteria and an evaluation.' : '', empty:'None of your Outdoor sessions has started yet. Facts appear here once check-in opens.'})});
}
function assignmentRow(ctx, c) {
  const {s, person:p} = ctx;
  if (c.type === 'initiative') { const i = s.initiatives.find(x => x.id === c.id), sum = summary(s, i); return `<li><span class="iw-context-tag">${u.icon('nodes')}Initiative</span><div><strong>${esc(c.title)}</strong><small>${esc(c.owner)} · ${sum.accepted}/${sum.cap} students · ${sum.groups.length} groups · ${sum.sessions.filter(x => (x.supervisorIds || []).includes(p.id)).length} session duty</small></div>${pill(i.status)}</li>`; }
  const e = s.experiences.find(x => x.id === c.id), cohorts = s.cohorts.filter(x => x.supervisorId === p.id && x.experienceId === e.id && x.status === 'Active');
  return `<li><span class="iw-context-tag">${u.icon('mountain')}Outdoor</span><div><strong>${esc(c.title)}</strong><small>${esc(c.owner)} · ${c.appointment.sessionIds.length} assigned session(s) · ${cohorts.length} cohort(s) · ${esc(c.appointment.scope)}</small></div>${pill(e.status)}</li>`;
}
function endedCard(ended) {
  return ended.length ? card('Ended appointments', `<ul class="iw-mini-list">${ended.map(x => `<li><span>${esc(x.kind)} · ${esc(x.title || '')}</span><small>${esc(x.status)}${x.at ? ` ${esc(fmtDate(x.at))}` : ''}${x.reason ? ` · ${esc(x.reason)}` : ''}</small></li>`).join('')}</ul><p class="iw-muted">Access to these rosters has ended. Records you authored remain attributed to you.</p>`) : '';
}
