/**
 * Platform Admin console — the owner's view of DeepSprout.
 *
 * Seven places, each answering one question:
 *   Dashboard     what needs me, and how is the platform doing?
 *   Requests      which institutions want to join, and do I accept them?
 *   Institutions  who is on the platform, and what are they running?
 *   People        who uses DeepSprout, in which role?
 *   Initiatives   what is running, coming, finished or cancelled?
 *   Community     which posts wait for approval, which were reported?
 *   Assessments   the four Lab tests and their wording.
 * Data and decisions reuse the existing commands and the community store.
 */
import * as u from '../../ui.js';
import {nameOf} from '../../shared.js';
import {clockDay} from '../../domain.js';
import {head,stats,stat,card,pill,tabs} from '../institution/common.js';
import {communityRecords,decideCommunity} from '../../admin-community.js';

const e = u.esc;
const WAITING = ['Submitted', 'Pending Verification', 'Needs More Info'];
const KIND = {organization:'Institution', provider:'Outdoor provider', mentor:'Coach'};
const PATH = {organization:'organizations', provider:'providers', mentor:'mentor-applications'};
const HIDDEN = ['activity-catalog', 'policies', 'cms', 'entitlements', 'programs', 'experiences', 'system'];
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ago = (s, v) => { if (!v) return '—'; const d = Math.round((Date.parse(`${clockDay(s)}T12:00`) - Date.parse(String(v).slice(0, 10) + 'T12:00')) / 864e5); return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 14 ? `${d} days ago` : u.date(v); };
const orgAvatar = name => `<span class="ad-org-mark" style="--h:${u.hueOf(name)}">${e(u.initials(name))}</span>`;
const calm = (title, text) => `<div class="iw-calm">${u.icon('check')}<div><strong>${e(title)}</strong><p>${e(text)}</p></div></div>`;
const danger = on => document.getElementById('dialog-save')?.classList.toggle('is-danger', !!on);
const facts = rows => `<dl class="ad-facts">${rows.filter(([, v]) => v).map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl>`;

/* ------------------------------------------------------------ numbers */

function numbers(s) {
  const day = clockDay(s), grants = (s.grants || []).filter(g => g.status === 'Active');
  const coaches = new Set(grants.filter(g => g.role === 'coach').map(g => g.personId));
  const supervisors = new Set([...grants.filter(g => g.role === 'supervisor').map(g => g.personId), ...(s.appointments || []).filter(a => a.status === 'Accepted').map(a => a.personId)]);
  const reps = new Set(s.organizations.filter(o => o.status === 'Approved').flatMap(o => o.memberIds || []));
  const students = new Set([...(s.admissions || []).filter(a => ['Accepted', 'Completed'].includes(a.status)).map(a => a.personId), ...s.groups.filter(g => g.parentType === 'initiative').flatMap(g => g.memberIds)]);
  const completed = new Set((s.completions || []).filter(c => c.status === 'Completed').map(c => c.personId));
  const phase = i => i.status === 'Cancelled' ? 'cancelled' : i.status === 'Completed' || (i.status === 'Published' && i.end && i.end < day) ? 'completed' : i.status === 'Published' && i.start > day ? 'upcoming' : i.status === 'Published' ? 'active' : i.status === 'Suspended' ? 'suspended' : 'draft';
  return {coaches, supervisors, reps, students, completed, phase, day};
}
const PHASE = {active:['Active now', 'Active'], upcoming:['Upcoming', 'Upcoming'], completed:['Completed', 'Completed'], cancelled:['Cancelled', 'Cancelled'], suspended:['Suspended', 'Suspended'], draft:['Draft', 'Draft']};

/* ------------------------------------------------------------ dashboard */

function dashboard(ctx) {
  const {s, person:p} = ctx, n = numbers(s), comm = communityRecords();
  const requests = s.applications.filter(a => a.type !== 'mentor' && WAITING.includes(a.status)).sort((a, b) => String(a.submitted).localeCompare(String(b.submitted)));
  const toApprove = comm.posts.filter(x => x.status === 'pending'), reports = comm.reports.filter(r => r.status === 'pending');
  const total = requests.length + toApprove.length + reports.length;
  const hour = Number(new Intl.DateTimeFormat('en-GB', {hour:'numeric', hour12:false, timeZone:'Asia/Amman'}).format(new Date()));
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const todo = (icon, count, title, sub, href, action) => `<a class="ad-todo ${count ? 'is-open' : 'is-clear'}" href="${u.href(href)}"><span class="ad-todo-icon">${u.icon(icon)}</span><b>${count}</b><strong>${e(title)}</strong><small>${e(count ? sub : 'All clear')}</small><span class="ad-todo-go">${e(count ? action : 'Open')}${u.icon('arrow')}</span></a>`;
  const inits = s.initiatives.map(i => n.phase(i)), count = k => inits.filter(x => x === k).length;
  const seg = (k, cls) => count(k) ? `<i class="${cls}" style="--w:${count(k) / Math.max(1, inits.length) * 100}%" title="${count(k)} ${PHASE[k][0]}"></i>` : '';
  const orgs = s.organizations.filter(o => o.status === 'Approved');
  const posts = comm.posts.filter(x => x.status === 'visible').length;

  const metrics = `<div class="ad-metrics iw-reveal">
    <a class="ad-metric" href="${u.href('institutions')}"><span class="ad-metric-label">${u.icon('nodes')}Institutions</span><b>${orgs.length}</b><small>${requests.length ? `${plural(requests.length, 'request')} waiting` : 'No requests waiting'}</small><span class="ad-chips">${orgs.slice(0, 3).map(o => `<span>${e(o.name)}</span>`).join('')}</span></a>
    <a class="ad-metric" href="${u.href('users')}"><span class="ad-metric-label">${u.icon('people')}People</span><b>${s.people.length}</b><small>registered users</small><span class="ad-split4">${[[n.reps.size, 'Representatives'], [n.coaches.size, 'Coaches'], [n.supervisors.size, 'Supervisors'], [n.students.size, 'Students']].map(([v, l]) => `<span><b>${v}</b>${l}</span>`).join('')}</span></a>
    <a class="ad-metric" href="${u.href('moderation')}"><span class="ad-metric-label">${u.icon('form')}Community</span><b>${comm.loaded ? posts : '…'}</b><small>published posts</small><span class="ad-inline-flag ${reports.length ? 'is-alert' : ''}">${reports.length ? `${plural(reports.length, 'open report')}` : 'No open reports'}</span></a>
    <a class="ad-metric is-wide" href="${u.href('initiatives')}"><span class="ad-metric-label">${u.icon('calendar')}Initiatives</span><b>${s.initiatives.length}</b><small>across ${plural(orgs.length, 'institution')}</small><span class="iw-stack-bar ad-phase-bar">${seg('active', 'is-present')}${seg('upcoming', 'is-excused')}${seg('completed', 'is-done')}${seg('cancelled', 'is-absent')}</span><span class="ad-legend">${['active', 'upcoming', 'completed', 'cancelled'].map(k => `<span class="is-${k}"><i></i>${PHASE[k][0]} <b>${count(k)}</b></span>`).join('')}</span></a>
    <a class="ad-metric" href="${u.href('initiatives?tab=completed')}"><span class="ad-metric-label">${u.icon('check')}Completed</span><b>${n.completed.size}</b><small>students finished an initiative</small></a>
  </div>`;

  const reqList = requests.length ? `<ul class="ad-rows">${requests.slice(0, 4).map(a => `<li>${orgAvatar(a.name)}<div><strong>${e(a.name)}</strong><small>${e(nameOf(s, a.personId))} · ${e(ago(s, a.submitted))}</small></div>${pill(a.status === 'Needs More Info' ? 'Info Requested' : 'Pending', a.status === 'Needs More Info' ? 'Info requested' : 'New')}${u.link('View', `admin/${PATH[a.type]}/${a.id}`, 'button quiet small')}</li>`).join('')}</ul>` : calm('No requests waiting.', 'New institution requests appear here.');
  const repList = reports.length ? `<ul class="ad-rows">${reports.slice(0, 4).map(r => { const post = comm.posts.find(x => x.id === r.postId); return `<li><span class="ad-flag-icon">${u.icon('shield')}</span><div><strong>${e(post?.title || 'Community post')}</strong><small>${e(String(r.reason).split(':')[0])} · ${e(ago(s, r.created))}</small></div>${u.link('Review', 'admin/moderation', 'button quiet small')}</li>`; }).join('')}</ul>` : calm('No open reports.', 'Reports from members appear here.');

  return `<header class="iw-dash-head iw-reveal"><div class="iw-dash-copy"><p class="iw-org"><span>DeepSprout</span><span class="cw-role-mark">${u.icon('shield')}Platform owner</span></p><h1>${hello}, ${e(p.name.split(' ')[0])}.</h1><p class="iw-lead">${total ? `<strong>${plural(total, 'thing')}</strong> ${total === 1 ? 'needs' : 'need'} your decision today.` : 'Nothing needs your decision today.'}</p></div><div class="iw-dash-actions">${u.link('Decision history', 'admin/audit', 'button quiet')}</div></header>`
    + `<section class="ad-todos iw-reveal" aria-label="Needs your decision">${todo('mail', requests.length, 'Institution requests', requests[0] ? `Oldest: ${requests[0].name}` : '', 'admin/organizations', 'Review')}${todo('form', toApprove.length, 'Posts to approve', toApprove[0] ? `“${toApprove[0].title}”` : '', 'admin/moderation?tab=posts', 'Approve')}${todo('shield', reports.length, 'Open reports', reports[0] ? String(reports[0].reason).split(':')[0] : '', 'admin/moderation', 'Review')}</section>`
    + `<h2 class="ad-section-title">Your platform</h2>` + metrics
    + `<div class="iw-split">${card('Latest requests', reqList, {extra:u.link('All requests', 'admin/organizations', 'text-link')})}${card('Latest reports', repList, {extra:u.link('Community', 'admin/moderation', 'text-link')})}</div>`;
}

/* ------------------------------------------------------------ requests */

function requests(ctx) {
  const {s, route:r} = ctx, tab = r.query.get('tab') || 'waiting';
  const apps = s.applications.filter(a => a.type !== 'mentor' && a.status !== 'Draft');
  const waiting = apps.filter(a => WAITING.includes(a.status)).sort((a, b) => String(a.submitted).localeCompare(String(b.submitted)));
  const decided = apps.filter(a => !WAITING.includes(a.status)).sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
  const list = tab === 'decided' ? decided : waiting;
  const row = a => `<article class="ad-request iw-reveal">
    <div class="ad-request-who">${orgAvatar(a.name)}<div><h3>${u.link(a.name, `admin/${PATH[a.type]}/${a.id}`, 'ad-title-link')}</h3><p>${e([KIND[a.type], a.details?.institutionType, a.details?.city].filter(Boolean).join(' · '))}</p></div></div>
    <p class="ad-request-aim">${e(a.details?.description || a.details?.goals || 'No description provided.')}</p>
    <div class="ad-request-rep">${u.avatar(nameOf(s, a.personId))}<div><strong>${e(nameOf(s, a.personId))}</strong><small>${e(a.details?.position || 'Representative')}</small></div></div>
    <div class="ad-request-meta">${statusPill(a)}<small>${e(tab === 'decided' ? `Decided ${u.date(a.updated)}` : `Sent ${ago(s, a.submitted)}`)}</small></div>
    <div class="ad-request-actions">${u.link('View details', `admin/${PATH[a.type]}/${a.id}`, `button ${tab === 'decided' ? 'quiet' : 'primary'} small`)}</div>
  </article>`;
  return head({eyebrow:'REQUESTS', title:'Institution requests', lead:'Institutions ask to join DeepSprout. See who they are and what they want to do, then approve or reject with a reason.'})
    + tabs([['Waiting for you', 'admin/organizations', 'waiting', waiting.length], ['Decided', 'admin/organizations?tab=decided', 'decided', decided.length]], tab)
    + (list.length ? `<div class="ad-requests">${list.map(row).join('')}</div>` : card('', tab === 'decided' ? calm('No decisions yet.', 'Approved and rejected requests appear here.') : calm('No requests waiting.', 'When an institution applies, its request appears here.')))
    + `<p class="iw-footnote">${u.icon('shield')}Approved institutions publish initiatives directly — they don’t need your approval for each one.</p>`;
}
function statusPill(a) {
  return {Submitted:pill('Pending', 'New request'), 'Pending Verification':pill('Pending', 'Answered — review again'), 'Needs More Info':pill('Info Requested', 'Waiting for their answer'), Approved:pill('Approved'), Rejected:pill('Rejected'), Suspended:pill('Suspended')}[a.status] || pill(a.status);
}

function requestDetail(ctx) {
  const {s, route:r} = ctx, a = s.applications.find(x => x.id === r.id && PATH[x.type] === r.page);
  if (!a) return u.missing('request');
  const d = a.details || {}, rep = s.people.find(x => x.id === a.personId), open = WAITING.includes(a.status);
  const decide = open ? `<div class="ad-decide">${u.button('Approve', 'application-decide', {id:a.id, status:'Approved'}, 'button primary')}${u.button('Ask for more information', 'application-decide', {id:a.id, status:'Needs More Info'}, 'button quiet')}${u.button('Reject', 'application-decide', {id:a.id, status:'Rejected'}, 'button danger')}</div><p class="cw-fine">${u.icon('shield')}Approving opens the Institution workspace for ${e(rep?.name || 'the representative')}. They can publish initiatives right away.</p>`
    : `<div class="cw-decided">${statusPill(a)}${a.messages?.length ? `<p class="cw-quote">“${e(a.messages.at(-1).text)}”</p>` : ''}</div>${a.status === 'Approved' ? `<div class="ad-decide is-secondary">${u.button('Suspend institution', 'application-decide', {id:a.id, status:'Suspended'}, 'button danger small')}</div>` : a.status === 'Suspended' ? `<div class="ad-decide is-secondary">${u.button('Restore institution', 'application-decide', {id:a.id, status:'Approved'}, 'button quiet small')}</div>` : ''}`;
  const history = [{at:a.submitted, who:rep?.name || a.name, text:'Sent the request'}, ...(a.messages || []).map(m => ({at:m.created, who:nameOf(s, m.actorId), text:m.text}))];
  return `<p class="breadcrumbs">${u.link('Requests', 'admin/organizations', 'text-link')} / ${e(a.name)}</p>`
    + `<header class="ad-hero iw-reveal">${orgAvatar(a.name)}<div><p class="eyebrow">${e(KIND[a.type].toUpperCase())} REQUEST</p><h1>${e(a.name)}</h1><p class="iw-lead">${e([d.institutionType, d.city && `${d.city}, ${d.country || 'Jordan'}`, d.founded && `since ${d.founded}`].filter(Boolean).join(' · '))}</p></div><div class="ad-hero-status">${statusPill(a)}<small>Sent ${e(u.date(a.submitted))}</small></div></header>`
    + `<div class="ad-detail-layout"><div class="ad-detail-main">
        ${card('What they want to do', `<blockquote class="ad-aim">${e(d.description || 'No description provided.')}</blockquote>${d.goals ? `<p class="ad-goal"><b>Their goal</b>${e(d.goals)}</p>` : ''}`, {eyebrow:'PURPOSE'})}
        ${card('About the institution', facts([['Type', d.institutionType || d.type], ['Location', [d.city, d.country].filter(Boolean).join(', ')], ['Reach', d.size], ['Founded', d.founded], ['Website', d.website], ['Phone', d.phone], ['Official email', a.email]]), {eyebrow:'DETAILS'})}
        ${card('Documents', (a.files || []).length ? `<ul class="ad-files">${a.files.map(f => `<li>${u.icon('form')}<span>${e(f)}</span><small>PDF</small></li>`).join('')}</ul>` : '<p class="iw-muted">No documents attached.</p>', {eyebrow:'ATTACHED'})}
        ${card('History', `<ol class="ad-timeline">${history.map(h => `<li><time>${e(u.date(h.at))}</time><div><strong>${e(h.who)}</strong><p>${e(h.text)}</p></div></li>`).join('')}</ol>`, {eyebrow:'CONVERSATION'})}
      </div><aside class="ad-detail-side">
        ${card('Representative', `<div class="ad-rep">${u.avatar(rep?.name || d.representative || a.name)}<div><strong>${e(rep?.name || d.representative || '—')}</strong><small>${e(d.position || 'Representative')}</small></div></div>${facts([['Email', rep?.email], ['Phone', d.phone], ['Email verified', rep?.verified ? 'Yes' : 'Not yet'], ['Account', rep?.status]])}`, {eyebrow:'WHO APPLIED'})}
        ${card(open ? 'Your decision' : 'Decision', decide, {cls:open ? 'cw-decision' : ''})}
      </aside></div>`;
}

/* ------------------------------------------------------------ institutions */

function orgStats(s, o, n) {
  const inits = s.initiatives.filter(i => i.ownerId === o.id), ids = new Set(inits.map(i => i.id));
  const students = new Set((s.admissions || []).filter(a => ids.has(a.initiativeId) && ['Accepted', 'Completed'].includes(a.status)).map(a => a.personId));
  const g = (s.grants || []).filter(x => x.institutionId === o.id && x.status === 'Active');
  return {inits, active:inits.filter(i => n.phase(i) === 'active').length, students:students.size, coaches:new Set(g.filter(x => x.role === 'coach').map(x => x.personId)).size, supervisors:new Set(g.filter(x => x.role === 'supervisor').map(x => x.personId)).size};
}
const orgApp = (s, o) => s.applications.find(a => a.type === 'organization' && (o.memberIds || []).includes(a.personId));

function institutions(ctx) {
  const {s} = ctx, n = numbers(s), orgs = s.organizations;
  if (ctx.route.id) return institutionDetail(ctx, n);
  const cardOf = o => { const x = orgStats(s, o, n), app = orgApp(s, o); return `<article class="ad-inst iw-reveal" style="--h:${u.hueOf(o.name)}" data-search="${e(o.name + ' ' + (o.city || ''))}" data-status="${e(o.status)}">
    <header>${orgAvatar(o.name)}<div><h3>${u.link(o.name, `admin/institutions/${o.id}`, 'ad-title-link')}</h3><p>${e([o.type, o.city].filter(Boolean).join(' · '))}</p></div>${pill(o.status)}</header>
    <div class="ad-inst-rep">${u.avatar(o.representative || nameOf(s, o.memberIds?.[0]))}<span><b>${e(o.representative || nameOf(s, o.memberIds?.[0]))}</b><small>${e(o.position || 'Representative')}</small></span></div>
    <dl class="ad-mini">${[[x.inits.length, 'Initiatives'], [x.active, 'Active'], [x.students, 'Students'], [x.coaches + x.supervisors, 'Staff']].map(([v, l]) => `<div><dd>${v}</dd><dt>${l}</dt></div>`).join('')}</dl>
    <footer>${u.link('View details', `admin/institutions/${o.id}`, 'button quiet small')}${app ? (o.status === 'Suspended' ? u.button('Restore', 'application-decide', {id:app.id, status:'Approved'}, 'button quiet small') : u.button('Suspend', 'application-decide', {id:app.id, status:'Suspended'}, 'button danger small')) : ''}</footer>
  </article>`; };
  const reached = new Set(orgs.flatMap(o => { const ids = new Set(s.initiatives.filter(i => i.ownerId === o.id).map(i => i.id)); return (s.admissions || []).filter(a => ids.has(a.initiativeId) && ['Accepted', 'Completed'].includes(a.status)).map(a => a.personId); })).size;
  return head({eyebrow:'INSTITUTIONS', title:'Institutions', lead:'Every institution on DeepSprout, its representative, and what it is running.', actions:u.link('Requests', 'admin/organizations', 'button quiet')})
    + stats([stat(orgs.filter(o => o.status === 'Approved').length, 'Active institutions'), stat(s.initiatives.filter(i => n.phase(i) === 'active').length, 'Initiatives running now'), stat(reached, 'Students reached'), stat(n.coaches.size + n.supervisors.size, 'Coaches & Supervisors')])
    + `<div class="ad-insts">${orgs.map(cardOf).join('')}</div>`;
}
function institutionDetail(ctx, n) {
  const {s, route:r} = ctx, o = s.organizations.find(x => x.id === r.id);
  if (!o) return u.missing('institution');
  const x = orgStats(s, o, n), app = orgApp(s, o), staff = (s.grants || []).filter(g => g.institutionId === o.id && g.status === 'Active');
  const initRows = x.inits.length ? `<ul class="ad-rows">${x.inits.map(i => { const ph = n.phase(i); return `<li><span class="ad-phase-dot is-${ph}"></span><div><strong>${e(i.title)}</strong><small>${e(u.date(i.start))} – ${e(u.date(i.end))}</small></div>${pill(PHASE[ph][1] === 'Active' ? 'Active' : PHASE[ph][1], PHASE[ph][0])}<span class="ad-when">${(s.admissions || []).filter(a => a.initiativeId === i.id && ['Accepted', 'Completed'].includes(a.status)).length} students</span></li>`; }).join('')}</ul>` : '<p class="iw-muted">No initiatives yet.</p>';
  const staffRows = staff.length ? `<ul class="ad-rows">${staff.map(g => `<li>${u.avatar(nameOf(s, g.personId))}<div><strong>${e(nameOf(s, g.personId))}</strong><small>${e(g.role === 'coach' ? 'Coach' : 'Supervisor')} · ${e(s.initiatives.find(i => i.id === g.scopeId)?.title || '')}</small></div></li>`).join('')}</ul>` : '<p class="iw-muted">No staff invited yet.</p>';
  return `<p class="breadcrumbs">${u.link('Institutions', 'admin/institutions', 'text-link')} / ${e(o.name)}</p>`
    + `<header class="ad-hero iw-reveal">${orgAvatar(o.name)}<div><p class="eyebrow">INSTITUTION</p><h1>${e(o.name)}</h1><p class="iw-lead">${e(o.description || '')}</p></div><div class="ad-hero-status">${pill(o.status)}${app ? (o.status === 'Suspended' ? u.button('Restore', 'application-decide', {id:app.id, status:'Approved'}, 'button quiet small') : u.button('Suspend institution', 'application-decide', {id:app.id, status:'Suspended'}, 'button danger small')) : ''}</div></header>`
    + stats([stat(x.inits.length, 'Initiatives'), stat(x.active, 'Running now'), stat(x.students, 'Students'), stat(x.coaches + x.supervisors, 'Staff')])
    + `<div class="ad-detail-layout"><div class="ad-detail-main">${card('Initiatives', initRows, {eyebrow:'WHAT THEY RUN'})}${card('Staff', staffRows, {eyebrow:'INVITED BY THE REPRESENTATIVE'})}</div>
      <aside class="ad-detail-side">${card('Representative', `<div class="ad-rep">${u.avatar(o.representative || '')}<div><strong>${e(o.representative || '—')}</strong><small>${e(o.position || 'Representative')}</small></div></div>`, {eyebrow:'CONTACT PERSON'})}${card('Details', facts([['Type', o.type], ['Location', [o.city, o.country].filter(Boolean).join(', ')], ['Email', o.email], ['Phone', o.phone], ['Approved', app ? u.date(app.updated) : '']]))}</aside></div>`;
}

/* ------------------------------------------------------------ people */

function people(ctx) {
  const {s, route:r, person:me} = ctx, n = numbers(s), tab = r.query.get('tab') || 'all';
  const rolesOf = pp => [n.reps.has(pp.id) && 'Representative', n.coaches.has(pp.id) && 'Coach', n.supervisors.has(pp.id) && 'Supervisor', n.students.has(pp.id) && 'Student', pp.workspaces.includes('provider') && 'Outdoor provider', pp.workspaces.includes('admin') && 'Admin', s.applications.some(x => x.personId === pp.id && WAITING.includes(x.status)) && 'Applicant'].filter(Boolean);
  const groups = {all:() => true, reps:pp => n.reps.has(pp.id), coaches:pp => n.coaches.has(pp.id), supervisors:pp => n.supervisors.has(pp.id), students:pp => n.students.has(pp.id), blocked:pp => pp.status !== 'Active'};
  const list = s.people.filter(groups[tab] || groups.all);
  const orgOf = pp => s.organizations.find(o => (o.memberIds || []).includes(pp.id))?.name || s.organizations.find(o => (s.grants || []).some(g => g.personId === pp.id && g.institutionId === o.id && g.status === 'Active'))?.name || '';
  const t = (key, label, set) => [label, `admin/users${key === 'all' ? '' : `?tab=${key}`}`, key, set];
  return head({eyebrow:'PEOPLE', title:'People', lead:'Everyone registered on DeepSprout. One person can hold more than one role.'})
    + tabs([t('all', 'Everyone', s.people.length), t('reps', 'Representatives', n.reps.size), t('coaches', 'Coaches', n.coaches.size), t('supervisors', 'Supervisors', n.supervisors.size), t('students', 'Students', n.students.size), t('blocked', 'Blocked', s.people.filter(p => p.status !== 'Active').length || '')], tab)
    + `<div class="iw-card iw-reveal">${u.filterBar()}${u.table(['Person', 'Role', 'Institution', 'Status', ''], list.map(pp => ({search:`${pp.name} ${pp.email} ${rolesOf(pp).join(' ')}`, cells:[`<div class="iw-person">${u.avatar(pp.name)}<div><strong>${e(pp.name)}</strong><small>${e(pp.email)}</small></div></div>`, `<span class="ad-role-chips">${(rolesOf(pp).length ? rolesOf(pp) : ['Member']).map(x => `<span class="is-${x.toLowerCase().replace(/\s+/g, '-')}">${e(x)}</span>`).join('')}</span>`, e(orgOf(pp) || '—'), pp.status === 'Active' ? pill('Active') : pill('Blocked', 'Blocked'), `<div class="ad-row-actions">${u.button('View', 'person-detail', {id:pp.id}, 'button quiet small')}${pp.id !== me.id ? (pp.status === 'Active' ? u.button('Block', 'person-status', {id:pp.id, status:'Suspended'}, 'button danger small') : u.button('Unblock', 'person-status', {id:pp.id, status:'Active'}, 'button quiet small')) : ''}</div>`]})))}<p class="no-results" hidden>No matching people.</p></div>`;
}

/* ------------------------------------------------------------ initiatives */

function initiatives(ctx) {
  const {s, route:r} = ctx, n = numbers(s), tab = r.query.get('tab') || 'active';
  const by = k => s.initiatives.filter(i => k === 'all' || n.phase(i) === k);
  const list = by(tab);
  const students = i => (s.admissions || []).filter(a => a.initiativeId === i.id && ['Accepted', 'Completed'].includes(a.status)).length;
  const done = i => (s.completions || []).filter(c => c.initiativeId === i.id && c.status === 'Completed').length;
  const row = i => { const ph = n.phase(i), org = s.organizations.find(o => o.id === i.ownerId); return `<article class="ad-init is-${ph} iw-reveal">
    <div class="ad-init-main"><h3>${e(i.title)}</h3><p>${e(i.objective || i.summary || '')}</p></div>
    <div class="ad-init-org">${orgAvatar(org?.name || '?')}<span><b>${e(org?.name || '—')}</b><small>${e(i.topic || '')}</small></span></div>
    <div class="ad-init-when"><b>${e(u.date(i.start))}</b><small>to ${e(u.date(i.end))}</small></div>
    <div class="ad-init-num"><b>${students(i)}</b><small>${ph === 'completed' ? `${done(i)} completed` : 'students'}</small></div>
    <div class="ad-init-status">${pill(ph === 'active' ? 'Active' : PHASE[ph][1], PHASE[ph][0])}</div>
    <div class="ad-row-actions">${u.button('View', 'ad-initiative', {id:i.id}, 'button quiet small')}${['Published', 'Suspended'].includes(i.status) ? u.button(i.status === 'Suspended' ? 'Restore' : 'Suspend', 'resource-status', {collection:'initiatives', id:i.id, status:i.status === 'Suspended' ? 'Published' : 'Suspended'}, `button ${i.status === 'Suspended' ? 'quiet' : 'danger'} small`) : ''}</div>
  </article>`; };
  return head({eyebrow:'INITIATIVES', title:'Initiatives', lead:'What institutions are running on DeepSprout. They publish directly; you step in only when something is wrong.'})
    + tabs([['Active now', 'admin/initiatives', 'active', by('active').length], ['Upcoming', 'admin/initiatives?tab=upcoming', 'upcoming', by('upcoming').length], ['Completed', 'admin/initiatives?tab=completed', 'completed', by('completed').length], ['Cancelled', 'admin/initiatives?tab=cancelled', 'cancelled', by('cancelled').length], ['All', 'admin/initiatives?tab=all', 'all', s.initiatives.length]], tab)
    + (list.length ? `<div class="ad-inits">${list.map(row).join('')}</div>` : card('', calm(`No ${PHASE[tab]?.[0].toLowerCase() || ''} initiatives.`, 'They appear here as institutions publish them.')));
}

/* ------------------------------------------------------------ community */

function community(ctx) {
  const {s, route:r} = ctx, comm = communityRecords();
  if (r.id) return communityDetail(ctx, comm);
  const tab = r.page === 'posts' ? (r.query.get('tab') || 'posts') : (r.query.get('tab') || 'reports');
  const open = comm.reports.filter(x => x.status === 'pending'), pending = comm.posts.filter(x => x.status === 'pending'), live = comm.posts.filter(x => x.status === 'visible'), gone = comm.posts.filter(x => ['removed', 'hidden', 'rejected'].includes(x.status));
  const lastReason = id => comm.history.filter(h => h.postId === id).at(-1);
  const postBody = (post, full = true) => `<div class="ad-post"><div class="ad-post-head">${u.avatar(post.author || 'Member')}<div><strong>${e(post.author || 'Member')}</strong><small>${e(post.category || 'Community')}${post.created ? ` · ${e(ago(s, post.created))}` : ''}</small></div></div><h3>${e(post.title || 'Untitled post')}</h3><p class="${full ? '' : 'is-clamped'}">${e(post.body || '')}</p></div>`;
  let body = '';
  if (!comm.loaded) body = card('', '<p class="iw-muted">Loading community posts…</p>');
  else if (tab === 'reports') body = open.length ? `<div class="ad-cards">${open.map(rep => { const post = comm.posts.find(x => x.id === rep.postId) || rep.post || {}; const [kind, ...more] = String(rep.reason).split(':'); return `<article class="ad-report iw-reveal"><header><span class="ad-report-kind">${u.icon('shield')}${e(kind)}</span><small>Reported ${e(ago(s, rep.created))}${rep.reporter ? ` by ${e(rep.reporter)}` : ''}</small></header>${more.length ? `<p class="ad-report-why">“${e(more.join(':').trim())}”</p>` : ''}${postBody(post, false)}<footer>${u.button('Keep post', 'ad-community', {post:rep.postId, report:rep.id, status:'dismissed'}, 'button quiet')}${u.button('Remove post', 'ad-community', {post:rep.postId, report:rep.id, status:'removed'}, 'button danger')}${u.link('Details', `admin/moderation/${rep.id}`, 'text-link')}</footer></article>`; }).join('')}</div>` : card('', calm('No open reports.', 'When a member reports a post, it appears here with their reason.'));
  else if (tab === 'posts') body = pending.length ? `<div class="ad-cards">${pending.map(post => `<article class="ad-report is-pending iw-reveal"><header><span class="ad-report-kind is-new">${u.icon('clock')}Waiting for approval</span></header>${postBody(post)}<footer>${u.button('Approve', 'ad-community', {post:post.id, status:'visible'}, 'button primary')}${u.button('Reject', 'ad-community', {post:post.id, status:'rejected'}, 'button danger')}</footer></article>`).join('')}</div>` : card('', calm('No posts waiting.', 'New member posts wait here until you approve them.'));
  else if (tab === 'live') body = `<div class="ad-cards is-grid">${live.map(post => `<article class="ad-report is-live iw-reveal">${postBody(post, false)}<footer>${u.button('Delete post', 'ad-community', {post:post.id, status:'removed'}, 'button danger small')}</footer></article>`).join('')}</div>`;
  else body = gone.length ? `<div class="iw-card iw-reveal"><ul class="ad-rows">${gone.map(post => { const h = lastReason(post.id); return `<li><span class="ad-flag-icon is-muted">${u.icon('close')}</span><div><strong>${e(post.title)}</strong><small>${e(post.author || 'Member')} · ${e(h?.reason || '')}</small></div>${pill(post.status === 'rejected' ? 'Rejected' : 'Removed', post.status === 'rejected' ? 'Rejected' : post.status === 'hidden' ? 'Hidden' : 'Deleted')}${u.button('Restore', 'ad-community', {post:post.id, status:'visible'}, 'button quiet small')}</li>`; }).join('')}</ul></div>` : card('', calm('Nothing removed.', 'Deleted and rejected posts are kept here with the reason.'));
  return head({eyebrow:'COMMUNITY', title:'Community', lead:'Approve new posts before members see them, and decide on posts that members report.'})
    + tabs([['Reports', 'admin/moderation', 'reports', open.length], ['Waiting for approval', 'admin/moderation?tab=posts', 'posts', pending.length], ['Published', 'admin/moderation?tab=live', 'live', live.length], ['Deleted', 'admin/moderation?tab=removed', 'removed', gone.length]], tab)
    + body;
}
function communityDetail(ctx, comm) {
  const {s, route:r} = ctx, isReport = r.page === 'moderation', rep = isReport ? comm.reports.find(x => x.id === r.id) : null, post = comm.posts.find(x => x.id === (rep?.postId || r.id));
  if (!post) return u.missing('post');
  const history = comm.history.filter(h => h.postId === post.id);
  const actions = isReport ? (rep?.status === 'pending' ? `${u.button('Keep post', 'ad-community', {post:post.id, report:rep.id, status:'dismissed'}, 'button quiet')}${u.button('Remove post', 'ad-community', {post:post.id, report:rep.id, status:'removed'}, 'button danger')}` : `<p class="iw-muted">This report was reviewed.</p>`)
    : post.status === 'pending' ? `${u.button('Approve', 'ad-community', {post:post.id, status:'visible'}, 'button primary')}${u.button('Reject', 'ad-community', {post:post.id, status:'rejected'}, 'button danger')}` : post.status === 'visible' ? u.button('Delete post', 'ad-community', {post:post.id, status:'removed'}, 'button danger') : u.button('Restore', 'ad-community', {post:post.id, status:'visible'}, 'button quiet');
  return `<p class="breadcrumbs">${u.link('Community', `admin/moderation${isReport ? '' : '?tab=posts'}`, 'text-link')} / ${e(post.title || 'Post')}</p>`
    + head({eyebrow:isReport ? 'REPORTED POST' : 'COMMUNITY POST', title:post.title || 'Community post', lead:`By ${post.author || 'a member'} · ${post.category || 'Community'}`})
    + `<div class="ad-detail-layout"><div class="ad-detail-main">${rep ? card('Why it was reported', `<blockquote class="ad-aim">${e(rep.reason)}</blockquote><p class="iw-muted">${e(rep.reporter ? `Reported by ${rep.reporter}` : 'Reported by a member')} · ${e(u.date(rep.created))}</p>`, {eyebrow:'REPORT'}) : ''}${card('The post', `<p class="ad-post-full">${e(post.body || '')}</p>`, {eyebrow:'CONTENT'})}${card('History', history.length ? `<ol class="ad-timeline">${history.map(h => `<li><time>${e(u.date(h.created))}</time><div><strong>${e(h.status)} · ${e(nameOf(s, h.actorId))}</strong><p>${e(h.reason)}</p></div></li>`).join('')}</ol>` : '<p class="iw-muted">No decisions yet.</p>')}</div>
      <aside class="ad-detail-side">${card('Your decision', `<div class="ad-decide">${actions}</div>`, {cls:'cw-decision'})}</aside></div>`;
}

/* ------------------------------------------------------------ assessments */

const INSTRUMENTS = ['digital-habits', 'sustained-attention', 'inhibitory-control', 'depth-challenge'];
const TEST_ICON = ['form', 'clock', 'shield', 'book'];
function assessments(ctx) {
  const {s, route:r} = ctx, defs = window.DeepSproutAssessments || {};
  if (r.id) return assessmentEditor(ctx, defs);
  return head({eyebrow:'ASSESSMENTS', title:'The four Lab tests', lead:'Every member takes these four tests in the Lab. Open one to edit its instructions and questions.'})
    + `<div class="ad-tests">${s.assessments.map((a, i) => { const d = defs[INSTRUMENTS[i]] || {}, qs = (a.contentDraft || d).items || (a.contentDraft || d).questions; return `<article class="ad-test iw-reveal" style="--h:${[150, 200, 25, 265][i]}"><header><span class="ad-test-icon">${u.icon(TEST_ICON[i])}</span><div><h3>${e(a.title)}</h3><p>${e(d.kind || '')}</p></div></header><p class="ad-test-blurb">${e(d.blurb || a.description)}</p><dl class="ad-mini">${[[qs ? qs.length : d.trials || '—', qs ? (d.questions ? 'Questions' : 'Statements') : 'Trials'], [`${d.minutes || '—'} min`, 'Duration'], [d.version || '—', 'Live version']].map(([v, l]) => `<div><dd>${e(v)}</dd><dt>${e(l)}</dt></div>`).join('')}</dl><footer>${a.contentDraft ? pill('Pending', `Draft v${a.version} saved`) : pill('Approved', 'Same as live')}${u.link('Edit test', `admin/assessments/${a.id}`, 'button primary small')}</footer></article>`; }).join('')}</div>`
    + `<p class="iw-footnote">${u.icon('shield')}Edits are saved as a new draft version. Members keep taking the live version until the draft is checked and published by the team.</p>`;
}
function assessmentEditor(ctx, defs) {
  const {s, route:r} = ctx, a = s.assessments.find(x => x.id === r.id);
  if (!a) return u.missing('assessment');
  const i = s.assessments.indexOf(a), base = defs[INSTRUMENTS[i]], d = a.contentDraft || base;
  if (!d) return u.missing('assessment content');
  const qs = d.items || d.questions || [], choice = !!d.questions;
  const section = (n, title, hint, body) => `<section class="ad-edit-section iw-reveal"><header><b>${n}</b><div><h2>${e(title)}</h2><p>${e(hint)}</p></div></header>${body}</section>`;
  return `<p class="breadcrumbs">${u.link('Back to assessment library', 'admin/assessments', 'text-link')}</p>`
    + `<header class="ad-hero is-test iw-reveal" style="--h:${[150, 200, 25, 265][i]}"><span class="ad-test-icon is-big">${u.icon(TEST_ICON[i])}</span><div><p class="eyebrow">${e((d.kind || 'Assessment').toUpperCase())}</p><h1>${e(a.title)}</h1><p class="iw-lead">${e(d.blurb || '')}</p></div><div class="ad-hero-status">${pill('Approved', `Live ${base.version}`)}${a.contentDraft ? pill('Pending', `Draft v${a.version}`) : ''}</div></header>`
    + `<form data-form="owner-assessment" data-id="${e(a.id)}" class="ad-editor"><div class="ad-editor-main">
      ${section(1, 'Before the test', 'What members read before they start.', u.field('heading', 'Heading', d.intro.heading, 'text', true) + u.area('body', 'Instructions', d.intro.body, true) + u.area('blurb', 'What it measures (short)', d.blurb, true) + u.area('points', 'Before you begin — one point per line', d.intro.points.join('\n'), true))}
      ${d.passage ? section(2, 'Reading passage', 'The text members read before the questions.', u.field('passageTitle', 'Passage title', d.passageTitle, 'text', true) + u.area('passage', 'Passage — leave a blank line between paragraphs', d.passage.join('\n\n'), true)) : ''}
      ${section(d.passage ? 3 : 2, qs.length ? (choice ? 'Questions' : 'Statements') : 'How the task runs', qs.length ? (choice ? 'Each question has four options and one correct answer.' : `Members answer each statement on this scale: ${(d.scale || []).join(' · ')}.`) : 'This is a timed task. Timing and scoring are fixed by the test protocol.',
        qs.length ? `${!choice && d.scale ? `<div class="ad-scale">${d.scale.map((x, k) => `<span><b>${k + 1}</b>${e(x)}</span>`).join('')}</div>` : ''}<div id="ao-questions" class="ad-questions">${qs.map((q, k) => questionCard(q, k, choice)).join('')}</div>${u.button('Add question', 'owner-question-add', {kind:choice ? 'choice' : 'statement'}, 'button quiet')}`
          : `<dl class="ad-mini is-protocol">${[[d.trials, 'Trials'], [d.minGap && `${d.minGap} ms`, 'Shortest gap'], [d.maxGap && `${d.maxGap} ms`, 'Longest gap'], [d.stimulusMs && `${d.stimulusMs} ms`, 'Response window']].filter(([v]) => v).map(([v, l]) => `<div><dd>${e(v)}</dd><dt>${e(l)}</dt></div>`).join('')}</dl><p class="cw-fine">${u.icon('shield')}${e(d.records || 'The task records reaction times and accuracy.')}</p>`)}
    </div><aside class="ad-editor-side">
      <section class="iw-card ad-save"><h2>Save changes</h2><p>Saving creates draft v${a.version + (a.contentDraft ? 1 : 0)}. Members keep the live version (${e(base.version)}) until it is published.</p><p class="form-error" role="alert"></p><button class="button primary" type="submit">Save content draft</button>${u.link('Cancel', 'admin/assessments', 'button quiet')}<a class="text-link" href="src/pages/member/lab/assessment.html?test=${INSTRUMENTS[i]}" target="_blank" rel="noopener">Try the live test ↗</a></section>
      ${card('Versions', `<ol class="ad-timeline">${[...(a.contentHistory || []).slice().reverse().map(h => `<li><time>${e(u.date(h.created))}</time><div><strong>Draft v${h.version}</strong>${u.button('View saved version', 'owner-assessment-history', {id:a.id, version:h.version}, 'text-link')}</div></li>`), `<li><time>Live</time><div><strong>${e(base.version)}</strong><p>What members take today.</p></div></li>`].join('')}</ol>`)}
    </aside></form>`;
}
export function questionCard(q, k, choice) {
  return `<div class="ao-question ad-question" data-question="${k}" data-kind="${choice ? 'choice' : 'statement'}"><span class="ad-q-num">${k + 1}</span><div class="ad-q-body">${u.area(`question-${k}`, choice ? 'Question' : 'Statement', q.text, true)}${choice ? `<fieldset class="ad-q-options"><legend>Answers <small>— tick the correct one</small></legend>${q.options.map((o, j) => `<div class="ad-opt"><label class="ad-opt-key" title="Mark as the correct answer"><input type="radio" name="answer-${k}" value="${j}" ${Number(q.answer) === j ? 'checked' : ''}><span>${String.fromCharCode(65 + j)}</span></label><input type="text" name="option-${k}-${j}" value="${e(o)}" required aria-label="Answer ${String.fromCharCode(65 + j)}" placeholder="Answer ${String.fromCharCode(65 + j)}"><em>Correct</em></div>`).join('')}</fieldset>` : ''}</div>${u.button('Remove', 'owner-question-remove', {}, 'button quiet small ad-q-remove')}</div>`;
}

/* ------------------------------------------------------------ decision history */

function history(ctx) {
  const {s} = ctx, comm = communityRecords();
  const rows = [...s.audit.map(x => ({at:x.created, who:x.actorId, what:x.action, on:x.resource, why:x.reason, kind:'Platform'})), ...comm.history.map(x => ({at:x.created, who:x.actorId, what:`Post ${x.status}`, on:comm.posts.find(p => p.id === x.postId)?.title || 'Community post', why:x.reason, kind:'Community'}))].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return `<p class="breadcrumbs">${u.link('Dashboard', 'admin/overview', 'text-link')} / Decision history</p>`
    + head({eyebrow:'DECISION HISTORY', title:'Every decision, with its reason', lead:'Approvals, rejections, blocks and community decisions — who made them, when, and why.', actions:u.button('Export history', 'owner-audit-export', {}, 'button quiet')})
    + `<div class="iw-card iw-reveal">${rows.length ? `${u.filterBar(['Platform', 'Community'])}<ol class="ad-timeline is-log">${rows.map(x => `<li data-search="${e(`${x.what} ${x.on} ${x.why} ${nameOf(s, x.who)}`)}" data-status="${x.kind}"><time>${e(u.date(x.at))} · ${e(x.kind)}</time><div><strong>${e(x.what)} — ${e(x.on)}</strong><p>${e(x.why || 'No reason recorded')}</p><small>${e(nameOf(s, x.who))}</small></div></li>`).join('')}</ol><p class="no-results" hidden>No matching decisions.</p>` : calm('No decisions yet.', 'Your approvals, rejections and community decisions will be listed here.')}</div>`;
}

/* ------------------------------------------------------------ router & actions */

export function renderConsole(ctx) {
  const page = ctx.route.page;
  if (HIDDEN.includes(page)) return head({eyebrow:'ADMIN', title:'This page is not part of the admin workspace.', lead:'Page-editing and configuration tools are hidden so the workspace stays focused on requests, people and community.'}) + u.link('Back to dashboard', 'admin/overview', 'button primary');
  if (page === 'overview' || page === 'reports') return dashboard(ctx);
  if (['organizations', 'providers', 'mentor-applications'].includes(page)) return ctx.route.id ? requestDetail(ctx) : requests(ctx);
  if (page === 'institutions') return institutions(ctx);
  if (page === 'users') return people(ctx);
  if (page === 'initiatives') return ctx.route.id ? null : initiatives(ctx);
  if (page === 'moderation' || page === 'posts') return community(ctx);
  if (page === 'assessments') return assessments(ctx);
  if (page === 'audit') return history(ctx);
  return null;
}

export function consoleAction(action, target, ctx) {
  const d = target.dataset, s = ctx.s;
  if (action === 'application-decide') {
    const a = s.applications.find(x => x.id === d.id), first = nameOf(s, a.personId).split(' ')[0];
    const copy = {Approved:[`Approve ${a.name}?`, `${first} gets the Institution workspace and can publish initiatives right away.`, 'Note to the institution (optional)', 'Approve'], 'Needs More Info':['Ask for more information', `${first} sees your question on their request and can answer it.`, 'What do you need from them?', 'Send question'], Rejected:[`Reject ${a.name}?`, `${first} will see this reason. They can apply again later.`, 'Reason for rejecting', 'Reject request'], Suspended:[`Suspend ${a.name}?`, 'Their workspace closes and their initiatives stop accepting students. Their records are kept.', 'Reason for suspending', 'Suspend'], 'Approved-restore':[`Restore ${a.name}?`, 'Their workspace opens again.', 'Note (optional)', 'Restore']}[a.status === 'Suspended' && d.status === 'Approved' ? 'Approved-restore' : d.status];
    u.modal(copy[0], `<p class="cw-sub">${e(copy[1])}</p>${u.area('reason', copy[2], '', d.status !== 'Approved')}`, v => { ctx.run('admin.application.decide', {id:d.id, status:d.status, reason:v.reason}, {Approved:`${a.name} is approved.`, 'Needs More Info':`Question sent to ${first}.`, Rejected:`${a.name} was rejected.`, Suspended:`${a.name} is suspended.`}[d.status]); ctx.render(); }, copy[3]);
    danger(['Rejected', 'Suspended'].includes(d.status));
    return true;
  }
  if (action === 'person-status') {
    const pp = s.people.find(x => x.id === d.id), block = d.status !== 'Active';
    u.modal(block ? `Block ${pp.name}?` : `Unblock ${pp.name}?`, `<p class="cw-sub">${e(block ? 'They can’t sign in or use any workspace until you unblock them. Their records are kept.' : 'They can sign in and use their workspaces again.')}</p>${u.area('reason', 'Reason', '', true)}`, v => { ctx.run('admin.person.status', {id:d.id, status:d.status, reason:v.reason}, block ? `${pp.name} is blocked.` : `${pp.name} is unblocked.`); ctx.render(); }, block ? 'Block' : 'Unblock');
    danger(block);
    return true;
  }
  if (action === 'person-detail') {
    const pp = s.people.find(x => x.id === d.id), n = numbers(s);
    const inits = (s.admissions || []).filter(a => a.personId === pp.id).map(a => s.initiatives.find(i => i.id === a.initiativeId)?.title).filter(Boolean);
    const roles = [n.reps.has(pp.id) && 'Representative', n.coaches.has(pp.id) && 'Coach', n.supervisors.has(pp.id) && 'Supervisor', n.students.has(pp.id) && 'Student', pp.workspaces.includes('admin') && 'Admin'].filter(Boolean);
    u.modal(pp.name, `<div class="ad-rep is-big">${u.avatar(pp.name)}<div><strong>${e(pp.name)}</strong><small>${e(pp.email)}</small></div>${pp.status === 'Active' ? pill('Active') : pill('Blocked')}</div>${facts([['Roles', roles.join(', ') || 'Member'], ['Institution', s.organizations.find(o => (o.memberIds || []).includes(pp.id))?.name], ['Initiatives', inits.join(', ')], ['Email verified', pp.verified ? 'Yes' : 'Not yet']])}<p class="cw-fine">${u.icon('shield')}Personal Lab, Shield and Recovery data are private and never shown here.</p>`, () => {}, 'Close', {readonly:true});
    return true;
  }
  if (action === 'ad-initiative') {
    const i = s.initiatives.find(x => x.id === d.id), n = numbers(s), ph = n.phase(i), org = s.organizations.find(o => o.id === i.ownerId);
    u.modal(i.title, `<p class="cw-sub">${e(i.objective || i.summary || '')}</p>${facts([['Institution', org?.name], ['Status', PHASE[ph][0]], ['Dates', `${u.date(i.start)} – ${u.date(i.end)}`], ['Topic', i.topic], ['Audience', i.audience], ['Places', i.capacity], ['Students', (s.admissions || []).filter(a => a.initiativeId === i.id && ['Accepted', 'Completed'].includes(a.status)).length], ['Completed', (s.completions || []).filter(c => c.initiativeId === i.id && c.status === 'Completed').length || '']])}`, () => {}, 'Close', {readonly:true, wide:true});
    return true;
  }
  if (action === 'resource-status') {
    const i = s[d.collection].find(x => x.id === d.id), stop = d.status === 'Suspended';
    u.modal(stop ? `Suspend ${i.title}?` : `Restore ${i.title}?`, `<p class="cw-sub">${e(stop ? 'It disappears from Explore and stops accepting students. The institution is told why.' : 'It becomes visible in Explore again.')}</p>${u.area('reason', 'Reason', '', true)}`, v => { ctx.run('admin.resource.status', {...v, id:d.id, collection:d.collection, status:d.status}, stop ? `${i.title} is suspended.` : `${i.title} is restored.`); ctx.render(); }, stop ? 'Suspend' : 'Restore');
    danger(stop);
    return true;
  }
  if (action === 'ad-community') {
    const post = communityRecords().posts.find(x => x.id === d.post), title = post?.title || 'this post';
    const copy = {visible:[d.report ? 'Restore this post?' : `Approve “${title}”?`, 'Members will see it in the community feed.', 'Note (optional)', 'Approve', `“${title}” is published.`], rejected:[`Reject “${title}”?`, 'The member’s post will not appear in the feed.', 'Reason', 'Reject', 'Post rejected.'], removed:[`Delete “${title}”?`, 'It disappears from the feed for everyone. It stays in your history with the reason.', 'Reason for deleting', 'Delete post', 'Post deleted.'], dismissed:['Keep this post?', 'The report is closed and the post stays in the feed.', 'Why it can stay', 'Keep post', 'Report closed. The post stays.']}[d.status];
    u.modal(copy[0], `<p class="cw-sub">${e(copy[1])}</p>${u.area('reason', copy[2], '', !['visible'].includes(d.status))}`, v => { decideCommunity({postId:d.post, reportId:d.report || null, status:d.status, reason:v.reason || 'Approved by the Admin.'}); u.toast(copy[4]); if (ctx.route.id) ctx.go(`admin/moderation${ctx.route.page === 'posts' ? '?tab=posts' : ''}`); else ctx.render(); }, copy[3]);
    danger(['removed', 'rejected'].includes(d.status));
    return true;
  }
  if (action === 'owner-question-add') {
    const list = document.getElementById('ao-questions'), k = Math.max(-1, ...[...list.children].map(x => Number(x.dataset.question))) + 1;
    list.insertAdjacentHTML('beforeend', questionCard({text:'', options:['', '', '', ''], answer:0}, k, d.kind === 'choice'));
    list.lastElementChild.querySelector('textarea').focus(); list.closest('form').dispatchEvent(new Event('input', {bubbles:true}));
    return true;
  }
  return false;
}
