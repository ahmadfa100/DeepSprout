/**
 * Shared Institution-cycle UI vocabulary (Representative, Supervisor, Coach).
 * Presentation only: every number passed in comes from a selector over the
 * original records. Components share one motion language (`iw-reveal`) that
 * is disabled under prefers-reduced-motion.
 */
import * as u from '../../ui.js';
import {seatCap,seatsUsed,acceptedCount,activeGrantsFor,isActiveSupervisor,isActiveCoach,representativeOrg,registrationState,executionPhase,needsSupervisor,MAX_SUPERVISORS,today} from '../../initiative-rules.js';

export const esc = u.esc;
export const nameOf = (s, pid) => s.people.find(p => p.id === pid)?.name || 'Unknown participant';
export const emailOf = (s, pid) => s.people.find(p => p.id === pid)?.email || '';

const TONES = {
  positive:['Accepted','Published','Active','Present','Approved','Completed','Confirmed','Open','Running','Recommended','Submitted report'],
  attention:['Pending','Queued','Offered','Submitted','Needs Revision','Info Requested','Draft','Late','Opens soon','Upcoming','Invited','In Progress','Assigned'],
  critical:['Rejected','Removed','Blocked','Suspended','Revoked','Cancelled','Absent','Expired','Declined','Needs Supervisor','Closed','Withdrawn','Overdue'],
};
export function pill(status, label = status) {
  const tone = TONES.positive.includes(status) ? 'positive' : TONES.attention.includes(status) ? 'attention' : TONES.critical.includes(status) ? 'critical' : 'neutral';
  return `<span class="iw-pill is-${tone}">${esc(label)}</span>`;
}
export function head({eyebrow, title, lead = '', actions = '', meta = ''}) {
  return `<header class="iw-head iw-reveal"><div class="iw-head-copy"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1>${lead ? `<p class="iw-lead">${esc(lead)}</p>` : ''}${meta ? `<div class="iw-head-meta">${meta}</div>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</header>`;
}
/** A stat tile. `of` adds a quiet denominator and an animated meter. */
export function stat(value, label, {of = null, hint = '', href = '', tone = ''} = {}) {
  const pct = of ? Math.min(100, Math.round(Number(value) / Number(of) * 100)) : null;
  const inner = `<span class="iw-stat-label">${esc(label)}</span><span class="iw-stat-value"><b data-count="${esc(value)}">${esc(value)}</b>${of !== null ? `<small> / ${esc(of)}</small>` : ''}</span>${pct !== null ? `<span class="iw-meter" aria-hidden="true"><i style="--w:${pct}%"></i></span>` : ''}${hint ? `<span class="iw-stat-hint">${esc(hint)}</span>` : ''}`;
  return href ? `<a class="iw-stat ${tone ? `is-${tone}` : ''}" href="${u.href(href)}">${inner}</a>` : `<div class="iw-stat ${tone ? `is-${tone}` : ''}">${inner}</div>`;
}
export const stats = items => `<div class="iw-stats iw-reveal">${items.join('')}</div>`;
export function card(title, body, {extra = '', eyebrow = '', cls = ''} = {}) {
  return `<section class="iw-card ${cls} iw-reveal">${title || extra ? `<div class="iw-card-head"><div>${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}${title ? `<h2>${esc(title)}</h2>` : ''}</div>${extra}</div>` : ''}${body}</section>`;
}
/** Needs-attention list. Each item opens the exact queue that resolves it. */
export function attention(items) {
  if (!items.length) return `<div class="iw-calm">${u.icon('check')}<div><strong>Nothing needs you right now.</strong><p>New applications, staffing gaps and excuses will appear here.</p></div></div>`;
  return `<ul class="iw-attention">${items.map(item => `<li class="is-${item.tone || 'attention'}"><span class="iw-dot" aria-hidden="true"></span><div><strong>${esc(item.title)}</strong>${item.text ? `<p>${esc(item.text)}</p>` : ''}</div>${item.href ? u.link(item.action || 'Open', item.href, 'button quiet small') : ''}</li>`).join('')}</ul>`;
}
export function emptyState(title, text, action = '') {
  return `<div class="iw-empty iw-reveal"><img src="assets/onboarding/bimo-calm.png" alt="" width="96" height="120"><h2>${esc(title)}</h2><p>${esc(text)}</p>${action}</div>`;
}
/** Accessible horizontal bars; widths animate in once (CSS), values are the source counts. */
export function bars(series, {unit = ''} = {}) {
  const max = Math.max(1, ...series.map(x => Number(x.value) || 0));
  if (!series.length) return '<p class="iw-muted">No records in this scope yet.</p>';
  return `<div class="iw-bars" role="list">${series.map(x => `<div class="iw-bar" role="listitem"><span class="iw-bar-label">${esc(x.label)}</span><span class="iw-bar-track" aria-hidden="true"><i class="${x.tone ? `is-${x.tone}` : ''}" style="--w:${(Number(x.value) || 0) / max * 100}%"></i></span><b>${esc(x.value)}${unit}</b></div>`).join('')}</div>`;
}
export function funnel(steps) {
  const max = Math.max(1, ...steps.map(s => s.value));
  return `<ol class="iw-funnel">${steps.map((s, i) => `<li style="--w:${Math.max(8, s.value / max * 100)}%;--i:${i}"><span>${esc(s.label)}</span><b>${esc(s.value)}</b></li>`).join('')}</ol>`;
}
export function ring(value, max, label) {
  const pct = max ? Math.min(1, value / max) : 0, r = 34, c = 2 * Math.PI * r;
  return `<figure class="iw-ring" aria-label="${esc(`${label}: ${value} of ${max}`)}"><svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${r}" class="track"/><circle cx="42" cy="42" r="${r}" class="value${pct ? '' : ' is-zero'}" style="--dash:${(pct * c).toFixed(1)};--gap:${c.toFixed(1)}"/></svg><figcaption><b>${esc(value)}</b><small>of ${esc(max)}</small><span>${esc(label)}</span></figcaption></figure>`;
}
export function feed(items) {
  if (!items.length) return '<p class="iw-muted">Activity will appear here as records change.</p>';
  return `<ol class="iw-feed">${items.map(x => `<li><time>${esc(u.date(x.at))}</time><div><strong>${esc(x.title)}</strong>${x.text ? `<p>${esc(x.text)}</p>` : ''}</div></li>`).join('')}</ol>`;
}
export function personCell(s, pid, sub = '') { return `<div class="iw-person">${u.avatar(nameOf(s, pid))}<div><strong>${esc(nameOf(s, pid))}</strong>${sub ? `<small>${sub}</small>` : ''}</div></div>`; }
export function tabs(items, current) {
  return `<nav class="iw-tabs" aria-label="Sections">${items.map(([label, path, key, count]) => `<a href="${u.href(path)}" ${key === current ? 'aria-current="page"' : ''}>${esc(label)}${count ? `<span>${esc(count)}</span>` : ''}</a>`).join('')}</nav>`;
}
export function select(name, label, options, value, attrs = '') {
  return `<label class="iw-select"><span>${esc(label)}</span><select name="${esc(name)}" ${attrs}>${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
}

/* ------------------------------------------------------------ scope */

export function repInitiatives(s, personId) { const org = representativeOrg(s, personId); return org ? s.initiatives.filter(i => i.ownerId === org.id) : []; }
export function supervisorInitiatives(s, personId) { return s.initiatives.filter(i => isActiveSupervisor(s, i.id, personId)); }
export function coachInitiatives(s, personId) { return s.initiatives.filter(i => isActiveCoach(s, i.id, personId)); }
/** Current Initiative from ?initiative=… (or the most relevant one). */
export function currentInitiative(ctx, list) {
  const wanted = ctx.route.query.get('initiative') || ctx.localUI.initiativeId;
  const found = list.find(i => i.id === wanted) || list.find(i => i.status === 'Published') || list[0] || null;
  if (found) ctx.localUI.initiativeId = found.id;
  return found;
}
export function initiativeSwitcher(ctx, list, current) {
  if (list.length < 2) return current ? `<span class="iw-scope">${u.icon('nodes')}<span>${esc(current.title)}</span>${pill(current.status)}</span>` : '';
  return `<label class="iw-scope is-select">${u.icon('nodes')}<span class="sr-only">Initiative</span><select data-action="initiative-scope">${list.map(i => `<option value="${esc(i.id)}" ${i.id === current?.id ? 'selected' : ''}>${esc(i.title)} · ${esc(i.status)}</option>`).join('')}</select></label>`;
}
export function withInitiative(path, initiative) { const [base, q = ''] = path.split('?'); const params = new URLSearchParams(q); if (initiative) params.set('initiative', initiative.id); return `${base}?${params}`; }
export function changeScope(target, ctx) {
  if (target.dataset.action !== 'initiative-scope') return false;
  const q = new URLSearchParams(ctx.route.query); q.set('initiative', target.value); ctx.localUI.initiativeId = target.value; ctx.go(`${ctx.route.path}?${q}`); return true;
}

/* -------------------------------------------------- initiative summary */

export function summary(s, i) {
  const admissions = s.admissions.filter(a => a.initiativeId === i.id);
  const sessions = s.sessions.filter(x => x.initiativeId === i.id);
  const groups = s.groups.filter(g => g.parentType === 'initiative' && g.initiativeId === i.id);
  const day = today(s);
  return {
    accepted:acceptedCount(s, i.id), seatsUsed:seatsUsed(s, i.id), cap:seatCap(i),
    pending:admissions.filter(a => a.status === 'Pending').length, queued:admissions.filter(a => a.status === 'Queued').length, offered:admissions.filter(a => a.status === 'Offered').length,
    suspended:admissions.filter(a => a.status === 'Suspended').length,
    supervisors:activeGrantsFor(s, i.id, 'supervisor'), coaches:activeGrantsFor(s, i.id, 'coach'), maxSupervisors:MAX_SUPERVISORS,
    pendingInvites:(s.staffInvites || []).filter(x => x.initiativeId === i.id && x.status === 'Pending'),
    groups, unallocated:admissions.filter(a => a.status === 'Accepted' && !groups.some(g => g.memberIds.includes(a.personId))),
    sessions, upcoming:sessions.filter(x => x.status === 'Published' && x.date >= day).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    needsSupervisor:sessions.filter(x => needsSupervisor(s, x)),
    excusesForRep:(s.excuses || []).filter(e => e.initiativeId === i.id && e.status === 'Recommended'),
    excusesForSup:(s.excuses || []).filter(e => e.initiativeId === i.id && e.status === 'Submitted'),
    attendance:(s.sessionAttendance || []).filter(a => a.initiativeId === i.id),
    submissions:s.submissions.filter(x => s.assignments.some(a => a.id === x.assignmentId && groups.some(g => g.id === a.groupId))),
    assignments:s.assignments.filter(a => groups.some(g => g.id === a.groupId) && a.status !== 'Cancelled'),
    coachReports:(s.coachReports || []).filter(r => r.initiativeId === i.id && r.status === 'Submitted'),
    summaries:(s.supervisorSummaries || []).filter(r => r.initiativeId === i.id),
    registration:registrationState(s, i), phase:executionPhase(s, i)
  };
}
export const fmtDate = u.date;
export const sessionWhen = ss => `${u.date(ss.date)} · ${ss.time}–${ss.endTime}`;
