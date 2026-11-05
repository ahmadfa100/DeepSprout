/**
 * Initiative Supervisor desk.
 *
 * The Supervisor mostly reads: every Coach, every student, every session.
 * What they act on: Coach reports (note, correct, choose, send one summary to
 * the Representative), meetings with everyone or one Coach, attendance on
 * their duty and excuse recommendations (shared pages).
 */
import * as u from '../../ui.js';
import {esc,head,stats,stat,card,pill,tabs,emptyState,nameOf,fmtDate,picker,summary} from '../institution/common.js';
import {activeGrantsFor,today} from '../../initiative-rules.js';
import {groupMetrics} from '../../commands/initiative.js';
import {standing} from '../coach/invited.js';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const day = v => new Date(`${String(v).slice(0, 10)}T12:00`);
const diff = (a, b) => Math.round((day(b) - day(a)) / 864e5);
const calm = (title, text) => `<div class="iw-calm">${u.icon('check')}<div><strong>${esc(title)}</strong><p>${esc(text)}</p></div></div>`;
const AUDIENCE = {everyone:'Everyone', coaches:'All coaches', coach:'One coach'};

/* ------------------------------------------------------------ records */

function world(ctx, i) {
  const {s} = ctx, sum = summary(s, i), d = today(s);
  const coaches = activeGrantsFor(s, i.id, 'coach').map(g => g.personId);
  const groups = sum.groups;
  const students = groups.flatMap(g => g.memberIds.map(pid => ({g, ...standing(s, g, pid)})));
  const reports = (s.coachReports || []).filter(r => r.initiativeId === i.id && r.status === 'Submitted').sort((a, b) => String(b.submitted).localeCompare(String(a.submitted)));
  const state = r => r.review?.sentIn ? 'sent' : r.review?.reviewedAt ? 'reviewed' : 'new';
  const meetings = (s.supervisorMeetings || []).filter(m => m.initiativeId === i.id && m.status !== 'Cancelled');
  const sessions = sum.sessions.filter(x => x.status !== 'Cancelled');
  return {sum, d, coaches, groups, students, reports, state, meetings, sessions};
}
const meetingWho = (s, m) => m.audience === 'coach' ? nameOf(s, m.coachId) : AUDIENCE[m.audience];

/* ------------------------------------------------------------ timeline */

/** First day of every month between start and end (for tick labels). */
function months(start, end) {
  const out = [], d = day(start); d.setDate(1);
  while (d <= day(end)) { const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; if (iso > start) out.push({at:iso, label:d.toLocaleDateString('en-GB', {month:'long'})}); d.setMonth(d.getMonth() + 1); }
  return out;
}

function timeline(s, i, w) {
  const start = i.start, end = i.end, total = Math.max(1, diff(start, end)), passed = Math.min(total, Math.max(0, diff(start, w.d)));
  const left = diff(w.d, end), pos = v => `${Math.min(100, Math.max(0, diff(start, v) / total * 100))}%`;
  const headline = w.d < start ? `Starts in ${plural(diff(w.d, start), 'day')}` : left > 0 ? `${plural(left, 'day')} left` : left === 0 ? 'Ends today' : 'Finished';
  const sub = w.d < start ? `Starts ${fmtDate(start)}` : left >= 0 ? `Day ${passed + 1} of ${total + 1} · ends ${fmtDate(end)}` : `Ended ${fmtDate(end)}`;
  const events = [...w.sessions.map(x => ({at:x.date, title:x.title, kind:'session'})), ...w.meetings.map(m => ({at:m.date, title:m.title, kind:'meeting'}))].filter(e => e.at >= start && e.at <= end).sort((a, b) => a.at.localeCompare(b.at));
  return `<section class="sv-timeline iw-reveal" aria-label="Initiative timeline">
    <div class="sv-tl-head"><div><p class="eyebrow">${esc(i.title.toUpperCase())} · TIMELINE</p><h2>${esc(headline)}</h2><p>${esc(sub)}</p></div>
      <div class="sv-tl-legend"><span><i class="is-session"></i>Session</span><span><i class="is-meeting"></i>Your meeting</span></div></div>
    <div class="sv-tl-track"><span class="sv-tl-fill" style="--w:${passed / total * 100}%"></span>
      ${months(start, end).map(m => `<span class="sv-tl-month" style="--x:${pos(m.at)}">${esc(m.label)}</span>`).join('')}
      ${events.map(e => `<span class="sv-tl-event is-${e.kind} ${e.at < w.d ? 'is-past' : ''}" style="--x:${pos(e.at)}" tabindex="0" aria-label="${esc(`${fmtDate(e.at)} · ${e.title}`)}"><i></i><span><b>${esc(day(e.at).getDate())} ${esc(day(e.at).toLocaleDateString('en-GB', {month:'short'}))}</b>${esc(e.title)}</span></span>`).join('')}
      ${w.d >= start && w.d <= end ? `<span class="sv-tl-today" style="--x:${pos(w.d)}"><b>Today</b></span>` : ''}
    </div>
    <div class="sv-tl-ends"><span>${esc(fmtDate(start))}<small>Start</small></span><span>${esc(fmtDate(end))}<small>End</small></span></div>
  </section>`;
}

/* ------------------------------------------------------------ dashboard */

export function dashboard(ctx, i) {
  const {s, person:p} = ctx, w = world(ctx, i), org = s.organizations.find(o => o.id === i.ownerId);
  const fresh = w.reports.filter(r => w.state(r) === 'new'), excuses = w.sum.excusesForSup, open = w.sessions.filter(x => (x.supervisorIds || []).includes(p.id) && !x.closedOut && x.date <= w.d && x.date >= i.start);
  const hour = Number(new Intl.DateTimeFormat('en-GB', {hour:'numeric', hour12:false, timeZone:'Asia/Amman'}).format(new Date()));
  const todo = [
    ...fresh.map(r => ({tone:'attention', title:`New report from ${nameOf(s, r.authorId)}`, text:`${s.groups.find(g => g.id === r.groupId)?.name || ''} · ${fmtDate(r.submitted)}`, href:'supervisor/reports', action:'Read'})),
    ...(excuses.length ? [{tone:'attention', title:`${plural(excuses.length, 'excuse')} need your recommendation`, text:'The Representative decides after you.', href:`supervisor/excuses?initiative=${i.id}`, action:'Recommend'}] : []),
    ...open.map(x => ({tone:'critical', title:`Attendance to close · ${x.title}`, text:fmtDate(x.date), href:`supervisor/attendance?session=${x.id}`, action:'Open'})),
    ...(w.sum.unallocated.length ? [{tone:'neutral', title:`${plural(w.sum.unallocated.length, 'student')} without a group`, text:'Place them so a Coach can follow them.', href:`supervisor/students?initiative=${i.id}`, action:'Place'}] : []),
    ...w.groups.filter(g => !g.coachId).map(g => ({tone:'neutral', title:`${g.name} has no Coach`, text:'Ask the Representative, or move an existing Coach.', href:`supervisor/students?initiative=${i.id}`, action:'Open'}))
  ];
  const coming = [...w.sessions.filter(x => x.date >= w.d).map(x => ({at:x.date, time:x.time, title:x.title, sub:`${x.format}${(x.supervisorIds || []).includes(p.id) ? ' · your duty' : ''}`, kind:'session'})), ...w.meetings.filter(m => m.date >= w.d).map(m => ({at:m.date, time:m.time, title:m.title, sub:`With ${meetingWho(s, m)} · ${m.format}`, kind:'meeting'}))].sort((a, b) => (a.at + a.time).localeCompare(b.at + b.time)).slice(0, 4);
  const coachCards = w.coaches.map(pid => { const gs = w.groups.filter(g => g.coachId === pid), studs = w.students.filter(x => gs.some(g => g.id === x.g.id)), last = w.reports.find(r => r.authorId === pid), review = s.submissions.filter(x => x.status === 'Submitted' && s.assignments.some(a => a.id === x.assignmentId && gs.some(g => g.id === a.groupId))).length;
    return `<article class="sv-coach iw-reveal" style="--h:${u.hueOf(pid)}"><header>${u.avatar(nameOf(s, pid))}<div><strong>${esc(nameOf(s, pid))}</strong><small>${esc(gs.map(g => g.name).join(', ') || 'No group yet')}</small></div></header><div class="sv-coach-people"><span class="iw-avatar-stack">${studs.slice(0, 5).map(x => u.avatar(nameOf(s, x.pid))).join('')}</span><span>${plural(studs.length, 'student')}</span></div><dl class="ad-mini"><div><dd>${studs.reduce((n, x) => n + x.overdue, 0)}</dd><dt>Overdue</dt></div><div><dd>${review}</dd><dt>To review</dt></div><div><dd>${last ? esc(fmtDate(last.submitted).replace(/ \d{4}$/, '')) : '—'}</dd><dt>Last report</dt></div></dl></article>`; }).join('');
  return `<header class="iw-dash-head iw-reveal"><div class="iw-dash-copy"><p class="iw-org"><span>${esc(org?.name || '')}</span><span class="cw-role-mark">${u.icon('shield')}Supervisor · ${esc(i.title)}</span></p><h1>${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, ${esc(p.name.split(' ')[0])}.</h1><p class="iw-lead">${todo.length ? `<strong>${plural(todo.length, 'thing')}</strong> ${todo.length === 1 ? 'needs' : 'need'} you today.` : 'Everything is on track today.'}</p></div><div class="iw-dash-actions">${u.link(fresh.length ? `Coach reports (${fresh.length})` : 'Coach reports', 'supervisor/reports', 'button quiet')}${u.button('New meeting', 'sv-meeting', {initiative:i.id}, 'button primary')}</div></header>`
    + timeline(s, i, w)
    + stats([stat(w.sum.accepted, 'Students', {href:'supervisor/coaches?tab=students', hint:`${w.students.length} in ${plural(w.groups.length, 'group')}`}), stat(w.coaches.length, 'Coaches', {href:'supervisor/coaches'}), stat(fresh.length, 'New coach reports', {href:'supervisor/reports', tone:fresh.length ? 'attention' : ''}), stat(w.sessions.filter(x => x.date >= w.d).length + w.meetings.filter(m => m.date >= w.d).length, 'Coming up', {hint:'Sessions & meetings', href:'supervisor/schedule'})])
    + `<div class="iw-split is-wide">${card('What needs you', todo.length ? `<ul class="iw-attention">${todo.map(x => `<li class="is-${x.tone}"><span class="iw-dot" aria-hidden="true"></span><div><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p></div>${u.link(x.action, x.href, 'button quiet small')}</li>`).join('')}</ul>` : calm('All caught up.', 'New coach reports and excuses appear here.'), {eyebrow:todo.length ? `${todo.length} TO DO` : 'ALL CLEAR'})}
      ${card('Coming up', coming.length ? `<ol class="iw-agenda">${coming.map(x => `<li class="is-${x.kind}"><time><b>${day(x.at).getDate()}</b><span>${esc(day(x.at).toLocaleDateString('en-GB', {month:'short'}))}</span></time><div><strong>${esc(x.title)}</strong><small>${esc(x.time)} · ${esc(x.sub)}</small></div>${x.kind === 'meeting' ? pill('Upcoming', 'Meeting') : pill('Active', 'Session')}</li>`).join('')}</ol>` : '<p class="iw-muted">Nothing scheduled yet.</p>', {extra:u.link('All', 'supervisor/schedule', 'text-link')})}</div>`
    + card('Coaches', coachCards ? `<div class="sv-coaches">${coachCards}</div>` : '<p class="iw-muted">No Coach has joined yet. The Representative invites Coaches.</p>', {extra:u.link('Coaches & students', 'supervisor/coaches', 'text-link')});
}

/* ------------------------------------------------------------ coaches & students */

export function team(ctx, i) {
  const {s, route:r} = ctx, w = world(ctx, i), tab = r.query.get('tab') || 'coaches';
  const status = x => x.overdue ? pill('Overdue', `${plural(x.overdue, 'task')} overdue`) : x.waiting ? pill('Pending', 'Waiting for review') : x.tasks.length && x.approved === x.tasks.length ? pill('Approved', 'All done') : pill('neutral', 'On track');
  const row = x => `<li><span class="iw-person">${u.avatar(nameOf(s, x.pid))}<span><strong>${esc(nameOf(s, x.pid))}</strong><small>${x.sessions ? `${x.attended} of ${x.sessions} sessions` : 'No sessions recorded'}</small></span></span><span class="sv-num">${x.approved}/${x.tasks.length}<small>tasks</small></span>${status(x)}</li>`;
  let body;
  if (tab === 'students') body = `<div class="iw-card iw-reveal">${u.filterBar()}${u.table(['Student', 'Group', 'Coach', 'Attendance', 'Tasks', 'Status'], w.students.map(x => ({search:`${nameOf(s, x.pid)} ${x.g.name}`, cells:[`<div class="iw-person">${u.avatar(nameOf(s, x.pid))}<div><strong>${esc(nameOf(s, x.pid))}</strong></div></div>`, `<span class="cw-chip is-flat" style="--h:${u.hueOf(x.g.id)}"><span class="iw-gdot"></span>${esc(x.g.name)}</span>`, x.g.coachId ? esc(nameOf(s, x.g.coachId)) : '<span class="iw-warn-text">No Coach</span>', x.sessions ? `${x.attended} of ${x.sessions}` : '—', `${x.approved} of ${x.tasks.length}`, status(x)]})))}<p class="no-results" hidden>No matching students.</p></div>`
    + (w.sum.unallocated.length ? `<p class="iw-footnote">${u.icon('shield')}${plural(w.sum.unallocated.length, 'accepted student')} ${w.sum.unallocated.length === 1 ? 'is' : 'are'} not in a group yet. ${u.link('Place them', `supervisor/students?initiative=${i.id}`, 'text-link')}</p>` : '');
  else body = `<div class="sv-teams">${w.groups.map(g => { const studs = w.students.filter(x => x.g.id === g.id), m = groupMetrics(s, g), last = w.reports.find(r => r.groupId === g.id);
      return `<article class="sv-team iw-reveal" style="--h:${u.hueOf(g.id)}"><header>${g.coachId ? u.avatar(nameOf(s, g.coachId)) : `<span class="sv-nocoach">${u.icon('people')}</span>`}<div><p class="eyebrow">${g.coachId ? 'COACH' : 'NO COACH YET'}</p><h2>${esc(g.coachId ? nameOf(s, g.coachId) : 'Waiting for a Coach')}</h2><p><span class="cw-chip is-flat" style="--h:${u.hueOf(g.id)}"><span class="iw-gdot"></span>${esc(g.name)}</span></p></div><dl class="ad-mini"><div><dd>${studs.length}</dd><dt>Students</dt></div><div><dd>${m.approved}/${m.expectedSubmissions}</dd><dt>Tasks done</dt></div><div><dd>${m.awaitingReview}</dd><dt>To review</dt></div><div><dd>${last ? esc(fmtDate(last.submitted).replace(/ \d{4}$/, '')) : '—'}</dd><dt>Last report</dt></div></dl></header><ul class="sv-roster">${studs.map(row).join('') || '<li class="iw-muted">No students in this group yet.</li>'}</ul></article>`; }).join('') || emptyState('No groups yet.', 'Groups appear when the Representative creates them.')}</div>`;
  return head({eyebrow:'TEAM', title:'Coaches & students', lead:'Every Coach of the initiative, the students they follow, and how each student is doing.', actions:u.link('Groups & placement', `supervisor/students?initiative=${i.id}`, 'button quiet')})
    + stats([stat(w.coaches.length, 'Coaches'), stat(w.groups.length, 'Groups', {hint:`${w.groups.filter(g => g.coachId).length} with a Coach`}), stat(w.students.length, 'Students'), stat(w.students.filter(x => x.overdue).length, 'Behind on tasks', {tone:w.students.some(x => x.overdue) ? 'attention' : ''})])
    + tabs([['By coach', 'supervisor/coaches', 'coaches', w.groups.length], ['All students', 'supervisor/coaches?tab=students', 'students', w.students.length]], tab)
    + body + `<p class="iw-footnote">${u.icon('shield')}You see the initiative’s work and attendance. Personal Lab, Shield and Recovery data stay private.</p>`;
}

/* ------------------------------------------------------------ coach reports */

export function reports(ctx, i) {
  const {s, route:r} = ctx, w = world(ctx, i), tab = r.query.get('tab') || 'new';
  const by = k => w.reports.filter(x => w.state(x) === k), list = by(tab);
  const reportCard = x => { const g = s.groups.find(z => z.id === x.groupId), m = x.metrics || {}, rv = x.review || {};
    return `<article class="sv-report iw-reveal ${rv.included === false ? 'is-excluded' : ''}" style="--h:${u.hueOf(x.groupId)}">
      <header>${u.avatar(nameOf(s, x.authorId))}<div><strong>${esc(nameOf(s, x.authorId))}</strong><small><span class="cw-chip is-flat" style="--h:${u.hueOf(x.groupId)}"><span class="iw-gdot"></span>${esc(g?.name || '')}</span> · ${esc(fmtDate(x.period.from))} – ${esc(fmtDate(x.period.to))}</small></div>${w.state(x) === 'sent' ? pill('Approved', 'Sent') : w.state(x) === 'reviewed' ? pill('Active', 'Reviewed') : pill('Pending', 'New')}</header>
      <div class="sv-report-nums">${[[m.members, 'students'], [m.approved, 'approved'], [m.awaitingReview, 'to review'], [m.overdue, 'overdue']].map(([v, l]) => `<span><b>${esc(v ?? 0)}</b>${l}</span>`).join('')}</div>
      <dl class="sv-report-text"><div><dt>How the group is doing</dt><dd>${esc(x.observations)}</dd></div>${x.concerns ? `<div><dt>Concerns</dt><dd>${esc(x.concerns)}</dd></div>` : ''}${x.recommendations ? `<div><dt>Next steps</dt><dd>${esc(x.recommendations)}</dd></div>` : ''}</dl>
      ${rv.note || rv.correction ? `<div class="sv-note">${u.icon('edit')}<div><strong>Your note</strong>${rv.note ? `<p>${esc(rv.note)}</p>` : ''}${rv.correction ? `<p class="sv-correction"><b>Correction:</b> ${esc(rv.correction)}</p>` : ''}</div></div>` : ''}
      <footer>${w.state(x) === 'sent' ? `<small>Sent to the Representative ${esc(fmtDate(rv.sentAt))}</small>` : `${u.button(rv.note || rv.correction ? 'Edit note' : 'Add note or correction', 'sv-review', {id:x.id}, 'button quiet small')}${u.button(rv.included === false ? 'Include in summary' : 'Leave out of summary', 'sv-include', {id:x.id, on:rv.included === false ? '1' : ''}, 'button quiet small')}${rv.reviewedAt ? '' : u.button('Mark as reviewed', 'sv-reviewed', {id:x.id}, 'button primary small')}`}</footer>
    </article>`; };
  const ready = w.reports.filter(x => w.state(x) !== 'sent' && x.review?.included !== false);
  const sent = (s.supervisorSummaries || []).filter(x => x.initiativeId === i.id).sort((a, b) => String(b.submitted).localeCompare(String(a.submitted)));
  const compose = `<section class="iw-card sv-compose iw-reveal"><p class="eyebrow">TO ${esc((s.people.find(p => p.id === (s.organizations.find(o => o.id === i.ownerId)?.memberIds || [])[0])?.name || 'THE REPRESENTATIVE').toUpperCase())}</p><h2>Send a summary</h2><p class="cw-sub">One message for the Representative, with the Coach reports you choose.</p>
    <form data-form="supervisor-summary" data-initiative="${esc(i.id)}">
      <fieldset class="sv-pick"><legend>Coach reports to attach</legend>${ready.length ? ready.map(x => `<label><input type="checkbox" name="coachReportIds" value="${esc(x.id)}" checked><span>${u.avatar(nameOf(s, x.authorId))}<span><b>${esc(nameOf(s, x.authorId))}</b><small>${esc(s.groups.find(g => g.id === x.groupId)?.name || '')} · ${esc(fmtDate(x.period.to))}</small></span></span></label>`).join('') : '<p class="iw-muted">No new reports to attach. Counts are attached automatically.</p>'}</fieldset>
      <div class="form-grid">${u.field('from', 'From', r.query.get('from') || [i.start, i.registrationOpen].filter(Boolean).sort()[0], 'date', true)}${u.field('to', 'To', r.query.get('to') || [i.end, w.d].sort()[0], 'date', true)}</div>
      ${u.area('summary', 'Summary — what is going well, what is not', '', true)}${u.area('issues', 'Needs the Representative’s decision (optional)', '')}${u.area('recommendations', 'Your recommendations (optional)', '')}
      <p class="form-error" role="alert"></p><button class="button primary" type="submit">Send to Representative</button>
    </form></section>`;
  return head({eyebrow:'COACH REPORTS', title:'Coach reports', lead:'Read what each Coach sent, add your notes or corrections, then send one summary to the Representative.'})
    + tabs([['New', 'supervisor/reports', 'new', by('new').length], ['Reviewed', 'supervisor/reports?tab=reviewed', 'reviewed', by('reviewed').length], ['Sent', 'supervisor/reports?tab=sent', 'sent', by('sent').length]], tab)
    + `<div class="sv-reports-layout"><div class="sv-reports">${list.length ? list.map(reportCard).join('') : card('', calm(tab === 'new' ? 'No new reports.' : tab === 'reviewed' ? 'Nothing reviewed yet.' : 'Nothing sent yet.', tab === 'new' ? 'When a Coach submits a report, it appears here.' : 'Reports move here as you work through them.'))}
      ${sent.length ? card('Your summaries', `<ol class="ad-timeline">${sent.map(x => `<li><time>${esc(fmtDate(x.submitted))}</time><div><strong>Operational summary · ${plural(x.coachReportIds.length, 'coach report')}</strong><p>${esc(x.summary)}</p></div></li>`).join('')}</ol>`, {eyebrow:'SENT TO THE REPRESENTATIVE'}) : ''}</div>
      <aside class="sv-reports-side">${compose}</aside></div>`;
}

/* ------------------------------------------------------------ sessions & meetings */

export function schedule(ctx, i) {
  const {s, person:p} = ctx, w = world(ctx, i);
  const items = [...w.sessions.map(x => ({at:x.date, time:`${x.time}–${x.endTime}`, title:x.title, kind:'session', x})), ...w.meetings.map(m => ({at:m.date, time:`${m.time} · ${m.minutes} min`, title:m.title, kind:'meeting', m}))].sort((a, b) => (a.at + a.time).localeCompare(b.at + b.time));
  const up = items.filter(x => x.at >= w.d), past = items.filter(x => x.at < w.d).reverse();
  const who = m => { const ids = m.audience === 'coach' ? [m.coachId] : m.audience === 'coaches' ? w.coaches : [...w.coaches, ...w.students.map(x => x.pid)]; return `<span class="iw-avatar-stack">${ids.slice(0, 6).map(pid => u.avatar(nameOf(s, pid))).join('')}</span><small>${esc(meetingWho(s, m))}${ids.length > 1 ? ` · ${plural(ids.length, 'person', 'people')}` : ''}</small>`; };
  const row = it => it.kind === 'meeting' ? `<li class="sv-item is-meeting"><time><b>${day(it.at).getDate()}</b><span>${esc(day(it.at).toLocaleDateString('en-GB', {month:'short'}))}</span></time><div class="sv-item-main"><strong>${esc(it.title)}</strong><small>${esc(it.time)} · ${esc(it.m.format)}${it.m.place ? ` · ${esc(it.m.place)}` : ''}</small>${it.m.note ? `<p>${esc(it.m.note)}</p>` : ''}</div><div class="sv-item-who">${who(it.m)}</div>${pill('Upcoming', 'Your meeting')}<div class="ad-row-actions">${it.at >= w.d ? u.button('Cancel', 'sv-meeting-cancel', {id:it.m.id}, 'button quiet small') : ''}</div></li>`
    : `<li class="sv-item is-session"><time><b>${day(it.at).getDate()}</b><span>${esc(day(it.at).toLocaleDateString('en-GB', {month:'short'}))}</span></time><div class="sv-item-main"><strong>${u.link(it.title, `supervisor/schedule/${it.x.id}`, 'ad-title-link')}</strong><small>${esc(it.time)} · ${esc(it.x.format)}${it.x.venue ? ` · ${esc(it.x.venue)}` : ''}</small></div><div class="sv-item-who"><small>${(it.x.supervisorIds || []).length ? `Supervisor: ${esc((it.x.supervisorIds || []).map(pid => nameOf(s, pid)).join(', '))}` : '<span class="iw-warn-text">Needs a Supervisor</span>'}</small></div>${(it.x.supervisorIds || []).includes(p.id) ? pill('Active', 'Your duty') : pill('neutral', 'Session')}<div class="ad-row-actions">${(it.x.supervisorIds || []).includes(p.id) && it.at <= w.d ? u.link('Attendance', `supervisor/attendance?session=${it.x.id}`, 'button quiet small') : ''}</div></li>`;
  return head({eyebrow:'SCHEDULE', title:'Sessions & meetings', lead:'The initiative’s sessions, and the meetings you hold with everyone or with one Coach.', actions:u.button('New meeting', 'sv-meeting', {initiative:i.id}, 'button primary')})
    + card('Coming up', up.length ? `<ol class="sv-list">${up.map(row).join('')}</ol>` : calm('Nothing scheduled.', 'Create a meeting with your Coaches or with everyone.'), {eyebrow:`${up.length} AHEAD`, extra:'<span class="sv-key"><i class="is-meeting"></i>Meeting <i class="is-session"></i>Session</span>'})
    + (past.length ? `<details class="iw-more-section iw-reveal"><summary>Earlier (${past.length})</summary><div class="iw-more-body"><ol class="sv-list is-past">${past.map(row).join('')}</ol></div></details>` : '');
}

/* ------------------------------------------------------------ actions */

export function deskAction(action, target, ctx) {
  const d = target.dataset, s = ctx.s;
  if (action === 'sv-meeting') {
    const i = s.initiatives.find(x => x.id === (d.initiative || ctx.localUI.initiativeId)), coaches = activeGrantsFor(s, i.id, 'coach').map(g => g.personId);
    const audience = `<fieldset class="sv-audience"><legend>Who is it with?</legend>${[['everyone', 'Everyone', 'All students and all Coaches', 'people'], ['coaches', 'All coaches', plural(coaches.length, 'Coach', 'Coaches'), 'nodes'], ['coach', 'One coach', 'Choose below', 'people']].map(([v, l, sub, ic], n) => `<label><input type="radio" name="audience" value="${v}" ${n === 1 ? 'checked' : ''}><span>${u.icon(ic)}<b>${l}</b><small>${esc(sub)}</small></span></label>`).join('')}</fieldset>`;
    const coachPick = `<div class="sv-coach-pick">${picker({attrs:'name="coachId"', label:'Coach', placeholder:'Choose a coach', options:coaches.map(pid => ({value:pid, label:nameOf(s, pid), sub:s.groups.filter(g => g.coachId === pid).map(g => g.name).join(', ') || 'No group yet', person:true})), inline:true})}</div>`;
    u.modal('New meeting', u.field('title', 'Title', '', 'text', true, 'placeholder="e.g. Coaches check-in"') + audience + coachPick + `<div class="form-grid">${u.field('date', 'Date', today(s), 'date', true)}${u.field('time', 'Time', '10:00', 'time', true)}</div><div class="form-grid">${u.select('minutes', 'Length', [['20', '20 minutes'], ['30', '30 minutes'], ['45', '45 minutes'], ['60', '1 hour']], '30')}${u.select('format', 'Where', [['Online', 'Online'], ['In-person', 'In person']], 'Online')}</div>${u.field('place', 'Link or room (optional)', '')}${u.area('note', 'Agenda (optional)', '')}`,
      v => { ctx.run('initiative.supervisor.meeting', {...v, initiativeId:i.id}, v.audience === 'coach' ? `Meeting scheduled with ${nameOf(s, v.coachId)}.` : v.audience === 'coaches' ? 'Meeting scheduled with all Coaches.' : 'Meeting scheduled with everyone.'); ctx.render(); }, 'Schedule meeting');
    const dlg = document.getElementById('workspace-dialog'), sync = () => dlg.querySelector('.sv-coach-pick')?.toggleAttribute('hidden', dlg.querySelector('[name=audience]:checked')?.value !== 'coach');
    dlg.querySelectorAll('[name=audience]').forEach(x => x.addEventListener('change', sync)); sync();
    return true;
  }
  if (action === 'sv-meeting-cancel') {
    const m = (s.supervisorMeetings || []).find(x => x.id === d.id);
    u.modal(`Cancel “${m.title}”?`, `<p class="cw-sub">Everyone invited is told it is cancelled.</p>${u.area('reason', 'Reason (optional)', '')}`, v => { ctx.run('initiative.supervisor.meeting.cancel', {id:d.id, reason:v.reason}, 'Meeting cancelled.'); ctx.render(); }, 'Cancel meeting');
    document.getElementById('dialog-save')?.classList.add('is-danger');
    return true;
  }
  if (action === 'sv-review') {
    const r = s.coachReports.find(x => x.id === d.id);
    u.modal(`Your note on ${nameOf(s, r.authorId)}’s report`, `<p class="cw-sub">The Coach’s words stay as written. Your note and correction travel with the report to the Representative.</p>${u.area('note', 'Note', r.review?.note || '')}${u.area('correction', 'Correction (optional)', r.review?.correction || '')}`, v => { ctx.run('initiative.coach.report.review', {id:d.id, note:v.note, correction:v.correction}, 'Note saved on the report.'); ctx.render(); }, 'Save note');
    return true;
  }
  if (action === 'sv-include') { ctx.run('initiative.coach.report.review', {id:d.id, included:d.on === '1'}, d.on === '1' ? 'Report will go with your summary.' : 'Report left out of your summary.'); ctx.render(); return true; }
  if (action === 'sv-reviewed') { ctx.run('initiative.coach.report.review', {id:d.id}, 'Marked as reviewed.'); ctx.render(); return true; }
  return false;
}
export function deskSubmit(form, ctx) {
  if (form.dataset.form !== 'supervisor-summary') return false;
  const ids = [...form.querySelectorAll('[name=coachReportIds]:checked')].map(x => x.value);
  ctx.run('initiative.supervisor.summary', {initiativeId:form.dataset.initiative, ...u.formValues(form), coachReportIds:ids}, ids.length ? `Summary sent with ${plural(ids.length, 'coach report')}.` : 'Summary sent to the Representative.');
  ctx.render();
  return true;
}
