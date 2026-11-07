/**
 * Platform Admin governance views on the shared design system:
 * the dashboard (what needs a decision, how the platform is doing) and
 * Outdoor Activity governance. Admin governs published resources and
 * Institution verification; it never sees participants' private work.
 */
import * as u from '../../ui.js';
import * as ds from '../../ds.js';
import {clockDay, nowMs} from '../../domain.js';
import {nameOf} from '../../shared.js';
import {kindLabel} from '../../activity-rules.js';
import {activityFacts} from '../institution/activities.js';
import {timelineEvents, renderTimeline, scopeFor} from '../../timeline.js';
import {communityRecords} from '../../admin-community.js';

const esc = u.esc;
const WAITING = ['Submitted', 'Pending Verification', 'Needs More Info'];
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const phaseOf = (s, i) => { const day = clockDay(s); return i.status === 'Cancelled' ? 'Cancelled' : i.status === 'Completed' || (i.status === 'Published' && i.end && i.end < day) ? 'Completed' : i.status === 'Published' && i.start > day ? 'Upcoming' : i.status === 'Published' ? 'Active' : i.status === 'Suspended' ? 'Suspended' : i.status === 'Archived' ? 'Archived' : 'Draft'; };
const publishedAt = r => r.publishedAt || (r.history || []).find(h => /^Published/.test(h.change || ''))?.at || '';

export function adminDashboard(ctx) {
  const {s, person:p} = ctx, today = clockDay(s), comm = communityRecords();
  const range = Number(['8', '13', '26'].includes(ctx.route.query.get('weeks')) ? ctx.route.query.get('weeks') : 13);
  const requests = s.applications.filter(a => a.type === 'organization' && WAITING.includes(a.status)).sort((a, b) => String(a.submitted).localeCompare(String(b.submitted)));
  const posts = comm.posts.filter(x => x.status === 'pending'), reports = comm.reports.filter(r => r.status === 'pending');
  const orgs = s.organizations.filter(o => o.status === 'Approved'), suspendedOrgs = s.organizations.filter(o => o.status === 'Suspended');
  const liveInitiatives = s.initiatives.filter(i => i.status === 'Published'), liveActivities = s.experiences.filter(e => ['Published','Active'].includes(e.status));
  const grants = (s.grants || []).filter(g => g.status === 'Active');
  const roles = [
    ['Representatives', new Set(orgs.flatMap(o => o.memberIds || [])).size],
    ['Supervisors', new Set([...grants.filter(g => g.role === 'supervisor').map(g => g.personId), ...(s.appointments || []).filter(a => a.status === 'Accepted').map(a => a.personId)]).size],
    ['Coaches', new Set(grants.filter(g => g.role === 'coach').map(g => g.personId)).size],
    ['Initiative students', new Set((s.admissions || []).filter(a => ['Accepted', 'Completed'].includes(a.status)).map(a => a.personId)).size],
    ['Individuals', s.people.filter(x => x.individual).length]
  ];
  const decisions = requests.length + posts.length + reports.length;
  const hour = Number(new Intl.DateTimeFormat('en-GB', {hour:'numeric', hour12:false, timeZone:'Asia/Amman'}).format(new Date(nowMs(s))));
  const hero = `<header class="dash-hero iw-reveal"><div><p class="dash-org"><span class="ws-identity-mark" aria-hidden="true">${u.icon('shield')}</span><strong>DeepSprout</strong>${ds.chip('Verified', 'Platform governance')}</p><h1>${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, ${esc(p.name.split(' ')[0])}.</h1><p class="ds-lead">${decisions ? `<strong>${plural(decisions, 'decision')} ${decisions === 1 ? 'is' : 'are'} waiting.</strong> ` : 'Nothing is waiting for a decision. '}${plural(orgs.length, 'verified institution')} run ${plural(liveInitiatives.length, 'published initiative')} and ${plural(liveActivities.length, 'Outdoor Activity', 'Outdoor Activities')}.</p></div><div class="dash-hero-actions">${u.link('Decision history', 'admin/audit', 'button quiet')}${u.link('Review requests', 'admin/organizations', 'button primary')}</div></header>`;
  const todo = (icon, count, title, sub, href, action) => `<a class="ad-todo ${count ? 'is-open' : 'is-clear'}" href="${u.href(href)}"><span class="ad-todo-icon">${u.icon(icon)}</span><b>${count}</b><strong>${esc(title)}</strong><small>${esc(count ? sub : 'All clear')}</small><span class="ad-todo-go">${esc(count ? action : 'Open')}${u.icon('arrow')}</span></a>`;
  const todos = `<section class="ad-todos iw-reveal" aria-label="Needs your decision">${todo('mail', requests.length, 'Institution verifications', requests[0] ? `Oldest: ${requests[0].name}` : '', 'admin/organizations', 'Verify')}${todo('form', posts.length, 'Posts to approve', posts[0] ? `“${posts[0].title}”` : '', 'admin/moderation?tab=posts', 'Approve')}${todo('shield', reports.length, 'Open reports', reports[0] ? String(reports[0].reason).split(':')[0] : '', 'admin/moderation', 'Review')}</section>`;
  const kpis = ds.kpis([
    ds.kpi({label:'Verified institutions', value:orgs.length, hint:suspendedOrgs.length ? `${suspendedOrgs.length} suspended` : 'None suspended', href:'admin/institutions'}),
    ds.kpi({label:'Pending verifications', value:requests.length, tone:requests.length ? 'attention' : '', href:'admin/organizations'}),
    ds.kpi({label:'Published initiatives', value:liveInitiatives.length, hint:`${s.initiatives.filter(i => i.status === 'Suspended').length} suspended`, href:'admin/initiatives'}),
    ds.kpi({label:'Published Outdoor Activities', value:liveActivities.length, hint:`${s.experiences.filter(e => e.status === 'Suspended').length} suspended`, href:'admin/activities'}),
    ds.kpi({label:'Accounts', value:s.people.length, hint:`${s.people.filter(x => x.status !== 'Active').length} blocked`, href:'admin/users'})
  ]);
  // Governance-relevant flow per week: requests received and resources published (real dated records only).
  const reqDates = s.applications.filter(a => a.type === 'organization' && a.submitted).map(a => a.submitted);
  const pubDates = [...s.initiatives, ...s.experiences].map(publishedAt).filter(Boolean);
  const r1 = ds.weeklySeries(reqDates, today, range), r2 = ds.weeklySeries(pubDates, today, range);
  const trend = ds.trendChart({title:`Platform activity, last ${range} weeks`, periods:r1.periods, series:[{label:'Resources published', values:r2.values}, {label:'Institution requests', values:r1.values}], summary:`${r2.values.reduce((a, b) => a + b, 0)} initiatives or Outdoor Activities published and ${r1.values.reduce((a, b) => a + b, 0)} institution requests received in ${range} weeks (weekly counts).`, empty:'No requests or publications in this range.'});
  const phases = ['Active','Upcoming','Completed','Suspended','Cancelled','Draft'].map(ph => ({label:ph, value:s.initiatives.filter(i => phaseOf(s, i) === ph).length})).filter(x => x.value);
  const actStates = ['Published','Draft','Suspended','Completed','Cancelled','Archived'].map(st => ({label:st, value:s.experiences.filter(e => (e.status === 'Active' ? 'Published' : e.status) === st).length})).filter(x => x.value);
  const events = timelineEvents(s, scopeFor(s, 'admin', p.id));
  return hero + todos
    + `<div class="dash-switch iw-reveal"><h2>Your platform</h2>${ds.segmented({name:'admin-weeks', options:[['8', '8 weeks'], ['13', '13 weeks'], ['26', '26 weeks']], value:String(range), label:'Trend range', action:'admin-weeks', size:'sm'})}</div>`
    + kpis
    + `<div class="ds-grid is-2-1">${ds.panel({title:'Platform activity', eyebrow:`WEEKLY · LAST ${range} WEEKS`, body:trend})}${ds.panel({title:'People by role', eyebrow:'ONE PERSON, SEVERAL ROLES', body:ds.bars({title:'People by role', items:roles.map(([label, value]) => ({label, value})), summary:'Roles overlap: one person can be a Representative and an Individual. Role grants are scoped to a resource.'}), actions:u.link('People', 'admin/users', 'text-link')})}</div>`
    + `<div class="ds-grid is-2">${ds.panel({title:'Initiatives by phase', eyebrow:'RESOURCE GOVERNANCE', actions:u.link('Initiatives', 'admin/initiatives', 'text-link'), body:ds.bars({title:'Initiatives by phase', items:phases, empty:'No initiatives yet.'})})}${ds.panel({title:'Outdoor Activities by state', eyebrow:'RESOURCE GOVERNANCE', actions:u.link('Outdoor Activities', 'admin/activities', 'text-link'), body:ds.bars({title:'Outdoor Activities by state', items:actStates, empty:'No Outdoor Activities yet.'})})}</div>`
    + ds.panel({title:'Governance timeline', eyebrow:'SHARED OPERATIONAL TIMELINE · GOVERNANCE RECORDS ONLY', actions:u.link('Full history', 'admin/audit', 'text-link'), body:renderTimeline(s, events, {lanes:['pending','past'], limit:10, emptyText:'Verification, publication and moderation decisions will appear here.'})});
}

/** Outdoor Activities across every Institution, with explained governance actions. */
export function activitiesGovernance(ctx) {
  const {s, route:r} = ctx, tab = r.query.get('tab') || 'live';
  const groups = {live:e => ['Published','Active'].includes(e.status), suspended:e => e.status === 'Suspended', drafts:e => e.status === 'Draft', ended:e => ['Completed','Cancelled','Archived'].includes(e.status), all:() => true};
  const list = s.experiences.filter(groups[tab] || groups.live);
  const head = ds.pageHead({eyebrow:'RESOURCE GOVERNANCE', title:'Outdoor Activities', lead:'Trips, hikes, camps and outdoor events organized by verified institutions. They publish directly; you step in when something is wrong. Suspending hides an activity from Explore without deleting bookings or history.'});
  const tabsBar = ds.tabs([['Live', 'admin/activities', 'live', s.experiences.filter(groups.live).length], ['Suspended', 'admin/activities?tab=suspended', 'suspended', s.experiences.filter(groups.suspended).length], ['Drafts', 'admin/activities?tab=drafts', 'drafts', s.experiences.filter(groups.drafts).length], ['Ended', 'admin/activities?tab=ended', 'ended', s.experiences.filter(groups.ended).length], ['All', 'admin/activities?tab=all', 'all', s.experiences.length]], tab, 'Outdoor Activity states');
  const rows = list.map(e => { const f = activityFacts(s, e), org = s.organizations.find(o => o.id === e.ownerId); return `<tr data-search="${esc(`${e.title} ${org?.name || ''} ${e.city || ''}`)}" data-status="${esc(e.status)}"><td><span class="oa-person"><strong>${esc(e.title)}</strong><small>${esc(kindLabel(e.kind))} · ${esc(u.date(e.start))}${e.city ? ` · ${esc(e.city)}` : ''}</small></span></td><td>${esc(org?.name || (e.legacyOwner ? `${e.legacyOwner.name} (retired Provider)` : 'Unknown owner'))}<small class="oa-sub">${org?.status === 'Approved' ? 'Verified institution' : esc(org?.status || 'No verified owner')}</small></td><td>${f.occupied}/${esc(e.capacity)}<small class="oa-sub">${f.waiting} waiting</small></td><td>${f.needsSupervisor.length ? ds.chip('Needs Supervisor', `${f.needsSupervisor.length} uncovered`) : ds.chip('Supervised', 'Covered')}</td><td>${ds.chip(e.status === 'Active' ? 'Published' : e.status)}</td><td><div class="actions">${u.button('View', 'ad-activity', {id:e.id}, 'button quiet small')}${['Published','Active','Suspended'].includes(e.status) ? u.button(e.status === 'Suspended' ? 'Restore' : 'Suspend', 'activity-governance', {id:e.id, status:e.status === 'Suspended' ? 'Published' : 'Suspended'}, `button ${e.status === 'Suspended' ? 'quiet' : 'danger'} small`) : ''}</div></td></tr>`; });
  return head + tabsBar + ds.filterRow({placeholder:'Search activity, institution or city…'})
    + (rows.length ? `<div class="table-scroll ds-table" tabindex="0" role="region" aria-label="Outdoor Activities"><table><thead><tr><th scope="col">Activity</th><th scope="col">Organized by</th><th scope="col">Places</th><th scope="col">Staffing</th><th scope="col">State</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows.join('')}</tbody></table></div><p class="no-results" hidden>No activities match.</p>` : ds.empty('Nothing here.', 'Outdoor Activities appear as verified institutions publish them.', '', {art:false}))
    + u.note('Governance changes notify the organizing Institution and booked participants. Bookings, attendance, completion and Garden history are never deleted. Admin does not see booking answers or personal Lab, Shield or Recovery data.');
}

export function governanceAction(action, target, ctx) {
  const d = target.dataset, {s} = ctx;
  if (action === 'activity-governance') {
    const e = s.experiences.find(x => x.id === d.id), suspend = d.status === 'Suspended', f = activityFacts(s, e);
    u.modal(suspend ? `Suspend ${e.title}?` : `Restore ${e.title}?`, `<p class="cw-sub">${suspend ? `It disappears from Explore and stops taking bookings. ${f.confirmed} confirmed and ${f.waiting} waiting participant${f.confirmed + f.waiting === 1 ? '' : 's'} keep their records and are notified. The organizing Institution is notified.` : 'It returns to its previous published state and Explore listing. Everyone affected is notified.'}</p>${u.area('reason', 'Governance reason (shared)', '', true)}`, v => { ctx.run('admin.resource.status', {collection:'experiences', id:e.id, status:d.status, reason:v.reason}, suspend ? `${e.title} is suspended.` : `${e.title} is restored.`); ctx.render(); }, suspend ? 'Suspend activity' : 'Restore');
    document.getElementById('dialog-save')?.classList.toggle('is-danger', suspend);
    return true;
  }
  if (action === 'ad-activity') {
    const e = s.experiences.find(x => x.id === d.id), org = s.organizations.find(o => o.id === e.ownerId), f = activityFacts(s, e);
    u.modal(e.title, `<div class="oa-detail"><img src="${esc(e.cover || 'assets/home-redesign/forest-hike.jpg')}" alt="" style="width:96px;height:72px;object-fit:cover;border-radius:12px"><div><p>${esc(kindLabel(e.kind))} · ${esc(u.date(e.start))}${e.end && e.end !== e.start ? ` – ${esc(u.date(e.end))}` : ''}</p>${ds.chip(e.status)}</div></div><dl class="iw-facts is-compact"><div><dt>Organized by</dt><dd>${esc(org?.name || '—')}</dd></div><div><dt>Venue</dt><dd>${esc([e.venue, e.city].filter(Boolean).join(', '))}</dd></div><div><dt>Places</dt><dd>${f.occupied} of ${esc(e.capacity)} confirmed or held · ${f.waiting} waiting</dd></div><div><dt>Sessions</dt><dd>${f.sessions.length} · ${f.needsSupervisor.length} without an active Supervisor</dd></div><div><dt>Safety notes</dt><dd>${esc(e.safety || '—')}</dd></div><div><dt>Version</dt><dd>${esc(e.version || 1)}</dd></div></dl><ol class="iw-history">${(e.history || []).slice().reverse().slice(0, 6).map(h => `<li><time>${esc(u.date(h.at))}</time><span>${esc(h.change)}${h.reason ? ` · ${esc(h.reason)}` : ''}</span><small>${esc(h.actorId === 'system' ? 'System' : nameOf(s, h.actorId))}</small></li>`).join('')}</ol><p class="cw-fine">${u.icon('shield')}Governance preview: the resource definition and aggregate counts only — no participant answers or personal data.</p>`, () => {}, 'Close', {readonly:true, wide:true});
    return true;
  }
  return false;
}
export function governanceChange(target, ctx) {
  if (target.name !== 'admin-weeks') return false;
  ctx.go(`admin/overview?weeks=${target.value}`); return true;
}
