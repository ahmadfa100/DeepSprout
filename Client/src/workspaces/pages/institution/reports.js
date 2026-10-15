/**
 * Representative Reports and Supervisor Insights. Every number is counted
 * from original records in the chosen scope; people add interpretation.
 * Chain: Coach Reports → Supervisor Insights / Summary → Representative Reports.
 */
import * as u from '../../ui.js';
import {esc,nameOf,pill,head,stats,stat,card,bars,funnel,ring,emptyState,initiativeSwitcher,fmtDate,summary} from './common.js';
import {seatCap} from '../../initiative-rules.js';
import {groupMetrics} from '../../commands/initiative.js';
import {initiativeGarden} from '../../../shared/selectors.js';

const inRange = (value, from, to) => { const day = String(value || '').slice(0, 10); return (!from || day >= from) && (!to || day <= to); };

export function initiativeReport(s, i, {from = '', to = '', groupId = ''} = {}) {
  const groups = s.groups.filter(g => g.parentType === 'initiative' && g.initiativeId === i.id && (!groupId || g.id === groupId));
  const inGroup = pid => !groupId || groups.some(g => g.memberIds.includes(pid));
  const admissions = s.admissions.filter(a => a.initiativeId === i.id && inGroup(a.personId));
  const applied = admissions.filter(a => inRange(a.created, from, to));
  const everAccepted = admissions.filter(a => (a.history || []).some(h => h.to === 'Accepted'));
  const sessions = s.sessions.filter(x => x.initiativeId === i.id && x.status !== 'Draft');
  const att = (s.sessionAttendance || []).filter(a => a.initiativeId === i.id && inRange(a.at, from, to) && inGroup(a.personId));
  const excuses = (s.excuses || []).filter(e => e.initiativeId === i.id && inRange(e.created, from, to) && inGroup(e.personId));
  const assignments = s.assignments.filter(a => groups.some(g => g.id === a.groupId) && a.status !== 'Cancelled');
  const subs = s.submissions.filter(x => assignments.some(a => a.id === x.assignmentId) && inRange(x.submitted, from, to));
  const expected = assignments.reduce((n, a) => n + (a.studentId ? 1 : (groups.find(g => g.id === a.groupId)?.memberIds.length || 0)), 0);
  const forms = s.forms.filter(f => f.initiativeId === i.id || (i.components || []).some(c => c.resourceId === f.id));
  const competitions = s.competitions.filter(c => (i.components || []).some(x => x.resourceId === c.id));
  const completions = (s.completions || []).filter(c => c.initiativeId === i.id && inGroup(c.personId));
  return {
    groups, admissions, applied:applied.length,
    funnel:[{label:'Applications', value:applied.length}, {label:'Decided', value:applied.filter(a => a.status !== 'Pending').length}, {label:'Accepted (ever)', value:applied.filter(a => (a.history || []).some(h => h.to === 'Accepted')).length}, {label:'Still active or completed', value:applied.filter(a => ['Accepted','Suspended','Completed'].includes(a.status)).length}],
    accepted:admissions.filter(a => a.status === 'Accepted').length, everAccepted:everAccepted.length, pending:admissions.filter(a => a.status === 'Pending').length, waitlist:admissions.filter(a => ['Queued','Offered'].includes(a.status)).length,
    statusCounts:['Pending','Accepted','Queued','Offered','Suspended','Rejected','Removed','Blocked','Withdrawn','Completed'].map(k => ({label:k, value:admissions.filter(a => a.status === k).length})).filter(x => x.value),
    sessions:sessions.map(ss => { const rows = att.filter(a => a.sessionId === ss.id); return {session:ss, registered:s.sessionRegistrations.filter(r => r.sessionId === ss.id && r.status === 'Confirmed' && inGroup(r.personId)).length, present:rows.filter(a => a.status === 'Present').length, late:rows.filter(a => a.status === 'Late').length, absent:rows.filter(a => a.status === 'Absent').length, excused:rows.filter(a => a.status === 'Absent' && excuses.some(e => e.attendanceId === a.id && e.status === 'Accepted')).length}; }),
    attendance:{present:att.filter(a => a.status === 'Present').length, late:att.filter(a => a.status === 'Late').length, absent:att.filter(a => a.status === 'Absent').length, total:att.length},
    excuses:{accepted:excuses.filter(e => e.status === 'Accepted').length, rejected:excuses.filter(e => e.status === 'Rejected').length, open:excuses.filter(e => !['Accepted','Rejected'].includes(e.status)).length, total:excuses.length},
    tasks:{assignments:assignments.length, expected, submitted:subs.length, approved:subs.filter(x => x.status === 'Approved').length, revision:subs.filter(x => x.status === 'Needs Revision').length, rejected:subs.filter(x => x.status === 'Rejected').length, awaiting:subs.filter(x => x.status === 'Submitted').length},
    byGroup:groups.map(g => ({group:g, metrics:groupMetrics(s, g, from, to)})),
    coachReports:(s.coachReports || []).filter(r => r.initiativeId === i.id && r.status === 'Submitted' && (!groupId || r.groupId === groupId) && r.period.to >= (from || '0000') && r.period.from <= (to || '9999')),
    summaries:(s.supervisorSummaries || []).filter(r => r.initiativeId === i.id && r.period.to >= (from || '0000') && r.period.from <= (to || '9999')),
    forms:forms.map(f => ({form:f, responses:s.responses.filter(x => x.formId === f.id && inRange(x.submitted, from, to)).length})),
    competitions:competitions.map(c => ({competition:c, entries:s.entries.filter(x => x.competitionId === c.id).length, reviewed:s.entries.filter(x => x.competitionId === c.id && x.status === 'Reviewed').length})),
    completions:{completed:completions.filter(c => c.status === 'Completed').length, notCompleted:completions.filter(c => c.status !== 'Completed').length}
  };
}

function filters(ctx, i, initiatives) {
  const q = ctx.route.query, groups = ctx.s.groups.filter(g => g.parentType === 'initiative' && g.initiativeId === i.id);
  return `<form class="iw-filters iw-reveal" data-form="report-filters"><div>${initiativeSwitcher(ctx, initiatives, i)}</div>${u.field('from', 'From', q.get('from') || '', 'date')}${u.field('to', 'Through', q.get('to') || '', 'date')}<label class="field"><span>Group</span><select name="group"><option value="">All groups</option>${groups.map(g => `<option value="${esc(g.id)}" ${q.get('group') === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label><button class="button quiet small">Apply</button></form>`;
}
const provenance = text => `<p class="iw-source">${u.icon('form')}<span>${esc(text)}</span></p>`;

function sharedSections(ctx, i, data) {
  const t = data.tasks;
  return `<div class="iw-split">${card('Admission funnel', funnel(data.funnel) + provenance('Source: Application records created in range. A seat is used only by Accepted or Suspended students and live offers.'), {eyebrow:'ADMISSIONS'})}
    ${card('Seats & status', `<div class="iw-ring-row">${ring(data.accepted, seatCap(i), 'Accepted seats')}${ring(data.waitlist, Math.max(data.waitlist, 1), 'Waiting list')}</div>${bars(data.statusCounts)}`, {eyebrow:'NOW'})}</div>
    ${card('Attendance by session', data.sessions.length ? u.table(['Session','Date','Registered','Present','Late','Absent','Excused absence'], data.sessions.map(x => ({search:x.session.title, cells:[esc(x.session.title), esc(fmtDate(x.session.date)), String(x.registered), String(x.present), String(x.late), String(x.absent), String(x.excused)]}))) + provenance('Factual attendance recorded by assigned Supervisors. “Excused absence” is a separate decision counted inside Absent; it is never attendance.') : '<p class="iw-muted">No published sessions.</p>', {eyebrow:'SESSIONS'})}
    <div class="iw-split">${card('Coach-reviewed tasks', bars([{label:'Expected submissions', value:t.expected}, {label:'Submitted', value:t.submitted}, {label:'Approved', value:t.approved, tone:'positive'}, {label:'Needs revision', value:t.revision, tone:'attention'}, {label:'Rejected', value:t.rejected, tone:'critical'}, {label:'Awaiting review', value:t.awaiting}]) + provenance(`${t.assignments} assignment(s) across ${data.groups.length} group(s). Denominator: one expected submission per assigned student per task.`), {eyebrow:'ASSIGNMENTS'})}
    ${card('Excuses', bars([{label:'Accepted', value:data.excuses.accepted, tone:'positive'}, {label:'Rejected', value:data.excuses.rejected, tone:'critical'}, {label:'In review', value:data.excuses.open, tone:'attention'}]) + provenance(`${data.attendance.absent} factual absences in range; ${data.excuses.total} explained.`), {eyebrow:'EXCUSES'})}</div>
    ${card('Groups', data.byGroup.length ? u.table(['Group','Coach','Students','Tasks','Submitted','Approved','Awaiting review','Overdue'], data.byGroup.map(({group:g, metrics:m}) => ({search:g.name, cells:[esc(g.name), esc(g.coachId ? nameOf(ctx.s, g.coachId) : '—'), String(m.members), String(m.assignments), String(m.submitted), String(m.approved), String(m.awaitingReview), String(m.overdue)]}))) : '<p class="iw-muted">No groups yet.</p>', {eyebrow:'BY GROUP'})}`;
}
function reportList(ctx, list, kind) {
  if (!list.length) return `<p class="iw-muted">No ${kind === 'coach' ? 'Coach reports' : 'Supervisor summaries'} in this period yet.</p>`;
  return `<ul class="iw-reports">${list.map(r => `<li><div><strong>${esc(kind === 'coach' ? ctx.s.groups.find(g => g.id === r.groupId)?.name || 'Group' : 'Operational summary')}</strong><small>${esc(nameOf(ctx.s, r.authorId))} · ${esc(fmtDate(r.period.from))} – ${esc(fmtDate(r.period.to))} · submitted ${esc(fmtDate(r.submitted))}</small></div>${u.button('Open original', 'report-open', {id:r.id, kind}, 'button quiet small')}</li>`).join('')}</ul>`;
}

export function renderRepReports(ctx, initiatives) {
  const {s} = ctx;
  const i = initiatives.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives[0];
  if (!i) return head({eyebrow:'REPORTS', title:'Reports'}) + emptyState('No initiative to report on yet.', 'Reports are counted from the records of your initiatives.', u.link('Create an initiative', 'organization/initiatives/new', 'button primary'));
  ctx.localUI.initiativeId = i.id;
  const q = ctx.route.query, data = initiativeReport(s, i, {from:q.get('from') || '', to:q.get('to') || '', groupId:q.get('group') || ''});
  ctx.localUI.reportExport = {i, data};
  const garden = initiativeGarden(s, i.id);
  return head({eyebrow:'INSIGHTS FOR THE REPRESENTATIVE', title:'Reports', lead:'Counted from Applications, attendance, excuses and Coach-reviewed work. Coach reports and Supervisor summaries add the human interpretation.', actions:u.button('Export participants CSV', 'report-export-csv', {}, 'button secondary')})
    + filters(ctx, i, initiatives)
    + stats([stat(data.accepted, 'Accepted now', {of:seatCap(i)}), stat(data.applied, 'Applications in range'), stat(data.attendance.present + data.attendance.late, 'Attended records', {hint:`${data.attendance.absent} absent`}), stat(data.tasks.approved, 'Tasks approved', {of:data.tasks.expected || 0}), stat(data.completions.completed, 'Completed students', {hint:i.status === 'Completed' ? 'Initiative completed' : 'Recorded on completion'})])
    + sharedSections(ctx, i, data)
    + `<div class="iw-split">${card('Supervisor summaries', reportList(ctx, data.summaries, 'summary'), {eyebrow:'SUPERVISOR → YOU'})}${card('Coach reports', reportList(ctx, data.coachReports, 'coach'), {eyebrow:'COACHES → SUPERVISORS → YOU'})}</div>`
    + `<div class="iw-split">${card('Forms & surveys', data.forms.length ? `<ul class="iw-mini-list">${data.forms.map(f => `<li><span>${esc(f.form.title)} · v${esc(f.form.version)}</span><b>${f.responses} identified response(s)</b>${u.link('Responses', `organization/forms/${f.form.id}/responses`, 'text-link')}</li>`).join('')}</ul>` : '<p class="iw-muted">No linked forms.</p>', {eyebrow:'IDENTIFIED RESPONSES'})}
      ${card('Competitions & collective garden', `${data.competitions.length ? `<ul class="iw-mini-list">${data.competitions.map(c => `<li><span>${esc(c.competition.title)}</span><b>${c.entries} entries · ${c.reviewed} reviewed</b></li>`).join('')}</ul>` : '<p class="iw-muted">No linked competitions.</p>'}<p class="iw-muted">Group Garden: ${garden.count} qualifying contribution(s) from ${garden.contributors} student(s) · stage ${garden.stage}/5.</p>${u.link('Open Group Garden', `organization/group-garden?initiative=${i.id}`, 'text-link')}`, {eyebrow:'OUTCOMES'})}</div>`
    + `<p class="iw-footnote">${u.icon('shield')}Reports never include personal Lab, Shield or Recovery data. Initiative participation does not change anyone’s personal scores.</p>`;
}

export function renderSupervisorInsights(ctx, initiatives) {
  const {s, person:p} = ctx;
  const i = initiatives.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives[0];
  if (!i) return head({eyebrow:'INSIGHTS', title:'Insights & reports'}) + emptyState('No active Initiative appointment.', 'Insights appear for initiatives where you are an active Supervisor.');
  ctx.localUI.initiativeId = i.id;
  const q = ctx.route.query, data = initiativeReport(s, i, {from:q.get('from') || '', to:q.get('to') || '', groupId:q.get('group') || ''});
  const sum = summary(s, i);
  const mine = data.summaries.filter(x => x.authorId === p.id);
  const issues = [...sum.needsSupervisor.map(x => `“${x.title}” needs a Supervisor`), ...(sum.unallocated.length ? [`${sum.unallocated.length} accepted student(s) without a group`] : []), ...(sum.excusesForSup.length ? [`${sum.excusesForSup.length} excuse(s) waiting for your recommendation`] : []), ...data.byGroup.filter(x => x.metrics.overdue).map(x => `${x.group.name}: ${x.metrics.overdue} overdue task submission(s)`), ...data.byGroup.filter(x => !x.group.coachId).map(x => `${x.group.name} has no Coach`)];
  return head({eyebrow:'SUPERVISOR · INSIGHTS', title:'Insights & reports', lead:'Operational picture of the initiative, computed from records. Read Coach reports, then send your summary to the Representative.', actions:u.button('Request staffing', 'staff-request', {initiative:i.id}, 'button quiet')})
    + filters(ctx, i, initiatives)
    + stats([stat(data.accepted, 'Accepted students', {of:seatCap(i)}), stat(data.pending, 'Pending applications', {href:`supervisor/applications?initiative=${i.id}`, tone:data.pending ? 'attention' : ''}), stat(data.attendance.present + data.attendance.late, 'Attended records'), stat(data.tasks.awaiting, 'Tasks awaiting Coach review'), stat(data.coachReports.length, 'Coach reports')])
    + card('Pending issues', issues.length ? `<ul class="iw-attention">${issues.map(x => `<li class="is-attention"><span class="iw-dot"></span><div><strong>${esc(x)}</strong></div></li>`).join('')}</ul>` : '<p class="iw-muted">No open operational issues.</p>', {eyebrow:'ATTENTION'})
    + sharedSections(ctx, i, data)
    + `<div class="iw-split">${card('Coach reports', reportList(ctx, data.coachReports, 'coach'), {eyebrow:'FROM COACHES'})}
      ${card('Send a summary to the Representative', `<form data-form="supervisor-summary" data-initiative="${esc(i.id)}"><div class="form-grid">${u.field('from', 'Period from', q.get('from') || [i.start, i.registrationOpen].filter(Boolean).sort()[0], 'date', true)}${u.field('to', 'Period to', q.get('to') || i.end, 'date', true)}</div>${u.area('summary', 'Summary — what is going well and what is not', '', true)}${u.area('issues', 'Issues needing the Representative', '')}${u.area('recommendations', 'Recommendations', '')}<p class="iw-muted">Counts and the Coach reports in this period are attached automatically from the records.</p><p class="form-error" role="alert"></p><button class="button primary">Submit summary</button></form>${mine.length ? `<h3>Your summaries</h3>${reportList(ctx, mine, 'summary')}` : ''}`, {eyebrow:'SUPERVISOR → REPRESENTATIVE'})}</div>`;
}

export function reportAction(action, target, ctx) {
  const d = target.dataset, s = ctx.s;
  if (action === 'report-open') {
    const r = (d.kind === 'coach' ? s.coachReports : s.supervisorSummaries).find(x => x.id === d.id);
    const m = r.metrics || {};
    const metricRows = Object.entries(m).map(([k, v]) => `<div><dt>${esc(k.replace(/([A-Z])/g, ' $1').toLowerCase())}</dt><dd>${esc(v)}</dd></div>`).join('');
    u.modal(d.kind === 'coach' ? 'Coach report (original)' : 'Supervisor summary (original)', `<p class="iw-muted">${esc(nameOf(s, r.authorId))} · ${esc(fmtDate(r.period.from))} – ${esc(fmtDate(r.period.to))} · submitted ${esc(fmtDate(r.submitted))}</p><h3>Counted from records at submission</h3><dl class="iw-facts is-compact">${metricRows}</dl>${d.kind === 'coach' ? `<h3>Observations</h3><p>${esc(r.observations)}</p>${r.concerns ? `<h3>Concerns</h3><p>${esc(r.concerns)}</p>` : ''}` : `<h3>Summary</h3><p>${esc(r.summary)}</p>${r.issues ? `<h3>Issues</h3><p>${esc(r.issues)}</p>` : ''}${r.coachReportIds?.length ? `<p class="iw-muted">Includes ${r.coachReportIds.length} Coach report(s).</p>` : ''}`}${r.recommendations ? `<h3>Recommendations</h3><p>${esc(r.recommendations)}</p>` : ''}`, () => {}, 'Done');
    return true;
  }
  if (action === 'report-export-csv') {
    const {i} = ctx.localUI.reportExport;
    const rows = s.admissions.filter(a => a.initiativeId === i.id).map(a => { const g = s.groups.find(x => x.initiativeId === i.id && x.memberIds.includes(a.personId)); const att = (s.sessionAttendance || []).filter(x => x.initiativeId === i.id && x.personId === a.personId); const subs = s.submissions.filter(x => x.studentId === a.personId && s.assignments.some(y => y.id === x.assignmentId && y.groupId === g?.id)); return [nameOf(s, a.personId), a.code, a.status, g?.name || '', att.filter(x => x.status !== 'Absent').length, att.filter(x => x.status === 'Absent').length, att.filter(x => x.status === 'Absent' && (s.excuses || []).some(e => e.attendanceId === x.id && e.status === 'Accepted')).length, subs.filter(x => x.status === 'Approved').length]; });
    u.exportCSV(`deepsprout-${i.id}-participants.csv`, ['Student','Application ID','Status','Group','Attended','Absent (factual)','Excused absences','Tasks approved'], rows);
    return true;
  }
  if (action === 'staff-request') { u.modal('Request additional staffing', `${u.select('role', 'Role', [['coach','Coach'],['supervisor','Supervisor']])}${u.area('note', 'What is needed and why', '', true)}`, v => { ctx.run('initiative.staff.request', {initiativeId:d.initiative, ...v}, 'Request sent to the Representative.'); }, 'Send request'); return true; }
  return false;
}
export function reportSubmit(form, ctx) {
  if (form.dataset.form === 'report-filters') { const v = u.formValues(form); if (v.from && v.to && v.to < v.from) throw new Error('The end date must follow the start date.'); const q = new URLSearchParams(ctx.route.query); ['from','to','group'].forEach(k => v[k] ? q.set(k, v[k]) : q.delete(k)); ctx.go(`${ctx.route.path}?${q}`); return true; }
  if (form.dataset.form === 'supervisor-summary') { ctx.run('initiative.supervisor.summary', {initiativeId:form.dataset.initiative, ...u.formValues(form)}, 'Summary submitted to the Representative.'); ctx.render(); return true; }
  return false;
}
