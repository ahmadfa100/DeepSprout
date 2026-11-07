/**
 * Representative command centre: one view over the Institution's
 * Initiatives and Outdoor Activities. Scope (all / one resource) and range
 * (14 / 30 / 90 days) are URL state, so every chart, list and queue on the
 * page answers the same question. All values come from original records.
 */
import * as u from '../../ui.js';
import * as ds from '../../ds.js';
import {summary, withInitiative, sessionWhen} from './common.js';
import {representativeOrg, seatCap} from '../../initiative-rules.js';
import {activityFacts} from './activities.js';
import {deliveryLabel} from '../../commands/institution.js';
import {kindLabel} from '../../activity-rules.js';
import {clockDay, nowMs} from '../../domain.js';
import {timelineEvents, renderTimeline, scopeFor} from '../../timeline.js';
import {scene} from './create.js';

const esc = u.esc;
const RANGES = [['14', '14 days'], ['30', '30 days'], ['90', '90 days']];

export function attentionFor(s, i) {
  const sum = summary(s, i), items = [], tag = i.title;
  for (const ss of sum.needsSupervisor) items.push({tone:'critical', title:`Needs Supervisor · ${ss.title}`, text:`${tag} · ${sessionWhen(ss)} — check-in is disabled until an active Supervisor covers it.`, href:withInitiative(sum.supervisors.length ? `organization/sessions/${ss.id}` : 'organization/team', i), action:sum.supervisors.length ? 'Assign duty' : 'Invite Supervisor'});
  if (sum.pending) items.push({title:`${sum.pending} application${sum.pending === 1 ? '' : 's'} to review`, text:`${tag} · you or an active Supervisor can approve; only you can reject.`, href:withInitiative('organization/participants?status=pending', i), action:'Review'});
  if (sum.excusesForRep.length) items.push({title:`${sum.excusesForRep.length} excuse${sum.excusesForRep.length === 1 ? '' : 's'} awaiting your decision`, text:`${tag} · each has a Supervisor recommendation.`, href:withInitiative('organization/attendance', i), action:'Decide'});
  if (sum.unallocated.length) items.push({title:`${sum.unallocated.length} accepted student${sum.unallocated.length === 1 ? '' : 's'} without a group`, text:tag, href:withInitiative('organization/team?tab=groups', i), action:'Allocate'});
  const noCoach = sum.groups.filter(g => !g.coachId);
  if (noCoach.length) items.push({title:`${noCoach.length} group${noCoach.length === 1 ? '' : 's'} without a Coach`, text:`${tag} · ${noCoach.map(g => g.name).join(', ')}`, href:withInitiative('organization/team?tab=groups', i), action:'Assign'});
  if (sum.seatsUsed >= sum.cap && i.status === 'Published') items.push({tone:'attention', title:'All seats are taken', text:`${tag} · ${sum.queued} on the waiting list.`, href:`organization/initiatives/${i.id}`, action:'Manage'});
  const requests = (s.staffRequests || []).filter(x => x.initiativeId === i.id && x.status === 'Open');
  if (requests.length) items.push({title:`${requests.length} staffing request${requests.length === 1 ? '' : 's'} from Supervisors`, text:tag, href:withInitiative('organization/team', i), action:'Open'});
  if (i.status === 'Draft') items.push({tone:'neutral', title:`Draft · ${i.title}`, text:'Drafts never appear in Explore.', href:`organization/initiatives/${i.id}/edit`, action:'Continue'});
  return items;
}
function activityAttention(s, e) {
  const f = activityFacts(s, e), items = [];
  if (e.status === 'Draft') return [{tone:'neutral', title:`Draft · ${e.title}`, text:'Not visible in Explore yet.', href:`organization/activities/${e.id}/edit`, action:'Continue'}];
  if (!['Published','Active'].includes(e.status)) return items;
  for (const ss of f.needsSupervisor) items.push({tone:'critical', title:`Needs Supervisor · ${ss.title}`, text:`${e.title} · ${u.date(ss.date)} ${ss.time} — check-in is disabled until an appointment is accepted.`, href:`organization/activities/${e.id}?tab=staff`, action:'Appoint'});
  if (f.pending) items.push({title:`${f.pending} booking${f.pending === 1 ? '' : 's'} awaiting approval`, text:e.title, href:`organization/activities/${e.id}?tab=bookings`, action:'Review'});
  if (f.remaining > 0 && f.waiting > 0 && !f.held) items.push({tone:'attention', title:`A place is free and ${f.waiting} ${f.waiting === 1 ? 'person is' : 'people are'} waiting`, text:e.title, href:`organization/activities/${e.id}?tab=waitlist`, action:'Offer'});
  return items;
}
const attentionList = items => !items.length ? `<div class="iw-calm">${u.icon('check')}<div><strong>Nothing needs you right now.</strong><p>New applications, bookings, staffing gaps and excuses will appear here.</p></div></div>` : `<ul class="iw-attention">${items.map(item => `<li class="is-${item.tone || 'attention'}"><span class="iw-dot" aria-hidden="true"></span><div><strong>${esc(item.title)}</strong>${item.text ? `<p>${esc(item.text)}</p>` : ''}</div>${item.href ? u.link(item.action || 'Open', item.href, 'button quiet small') : ''}</li>`).join('')}</ul>`;

/** The resource scope selected in the URL. */
function readScope(ctx, initiatives, activities) {
  const key = ctx.route.query.get('scope') || 'all';
  const [type, id] = key.split(':');
  if (type === 'initiative' && initiatives.some(i => i.id === id)) return {key, initiatives:initiatives.filter(i => i.id === id), activities:[], label:initiatives.find(i => i.id === id).title};
  if (type === 'activity' && activities.some(e => e.id === id)) return {key, initiatives:[], activities:activities.filter(e => e.id === id), label:activities.find(e => e.id === id).title};
  return {key:'all', initiatives, activities, label:'All initiatives and activities'};
}
const greeting = s => { const h = Number(new Intl.DateTimeFormat('en-GB', {hour:'numeric', hour12:false, timeZone:'Asia/Amman'}).format(new Date(nowMs(s)))); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export function renderRepDashboard(ctx, allInitiatives) {
  const {s, person:p} = ctx, org = representativeOrg(s, p.id), today = clockDay(s);
  const allActivities = s.experiences.filter(e => e.ownerId === org?.id && !['Archived'].includes(e.status));
  const scope = readScope(ctx, allInitiatives.filter(i => i.status !== 'Archived'), allActivities);
  const range = Number(RANGES.some(r => r[0] === ctx.route.query.get('range')) ? ctx.route.query.get('range') : 30);
  const liveI = scope.initiatives.filter(i => i.status === 'Published'), liveA = scope.activities.filter(e => ['Published','Active'].includes(e.status));
  const sums = scope.initiatives.map(i => [i, summary(s, i)]), facts = scope.activities.map(e => [e, activityFacts(s, e)]);
  const attention = [...scope.initiatives.flatMap(i => attentionFor(s, i)), ...scope.activities.flatMap(e => activityAttention(s, e))].sort((a, b) => (b.tone === 'critical') - (a.tone === 'critical') || (a.tone === 'neutral') - (b.tone === 'neutral'));
  const pendingTotal = sums.reduce((n, [, x]) => n + x.pending, 0), gaps = sums.reduce((n, [, x]) => n + x.needsSupervisor.length, 0) + facts.reduce((n, [, f]) => n + f.needsSupervisor.length, 0);
  const lead = !allInitiatives.length && !allActivities.length ? 'Create your first Initiative or Outdoor Activity — it appears in the regular Explore page as soon as you publish.' : `${liveI.length} initiative${liveI.length === 1 ? '' : 's'} and ${liveA.length} Outdoor Activit${liveA.length === 1 ? 'y' : 'ies'} are live${scope.key === 'all' ? '' : ' in this view'}. ${attention.filter(a => a.tone !== 'neutral').length ? `<strong>${attention.filter(a => a.tone !== 'neutral').length} thing${attention.filter(a => a.tone !== 'neutral').length === 1 ? '' : 's'} need${attention.filter(a => a.tone !== 'neutral').length === 1 ? 's' : ''} you.</strong>` : 'Nothing is waiting on you.'}`;
  const hero = `<header class="dash-hero iw-reveal"><div><p class="dash-org"><span class="ws-identity-mark" aria-hidden="true">${esc((org?.name || '').split(' ').map(w => w[0]).slice(0, 2).join(''))}</span><strong>${esc(org?.name || '')}</strong>${ds.chip(org?.status === 'Approved' ? 'Verified' : 'Pending', org?.status === 'Approved' ? 'Verified institution' : org?.status || '')}</p><h1>${greeting(s)}, ${esc(p.name.split(' ')[0])}.</h1><p class="ds-lead">${lead}</p></div><div class="dash-hero-actions"><a class="button quiet" href="src/pages/member/explore/explore.html">See it in Explore${u.icon('arrow')}</a>${u.link('Create new', 'organization/create', 'button primary')}</div></header>`;
  if (!allInitiatives.length && !allActivities.length) return hero + createBand();
  const scopeOptions = [['all', 'All initiatives & activities'], ...allInitiatives.filter(i => i.status !== 'Archived').map(i => [`initiative:${i.id}`, `Initiative · ${i.title}`]), ...allActivities.map(e => [`activity:${e.id}`, `Outdoor · ${e.title}`])];
  const filters = `<div class="dash-switch iw-reveal"><label class="ds-select"><span class="sr-only">Dashboard scope</span><select data-action="dash-scope">${scopeOptions.map(([v, l]) => `<option value="${esc(v)}" ${v === scope.key ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>${ds.segmented({name:'dash-range', options:RANGES, value:String(range), label:'Date range', action:'dash-range', size:'sm'})}</div>`;
  // Trend: applications submitted (Initiatives) and bookings made (Outdoor Activities), counted per period.
  const appDates = s.admissions.filter(a => scope.initiatives.some(i => i.id === a.initiativeId)).map(a => (a.history || []).find(h => h.to === 'Pending' || h.from === null)?.at || a.created);
  const bookDates = s.bookings.filter(b => scope.activities.some(e => e.id === b.experienceId)).map(b => b.created);
  const series = range > 30 ? [ds.weeklySeries(appDates, today, 13), ds.weeklySeries(bookDates, today, 13)] : [ds.dailySeries(appDates, today, range), ds.dailySeries(bookDates, today, range)];
  const trendSeries = [...(scope.initiatives.length ? [{label:'Initiative applications', values:series[0].values}] : []), ...(scope.activities.length ? [{label:'Outdoor Activity bookings', values:series[1].values}] : [])];
  const totalApps = series[0].values.reduce((a, b) => a + b, 0), totalBooks = series[1].values.reduce((a, b) => a + b, 0);
  const trend = ds.trendChart({title:`Participation over the last ${range} days`, periods:series[0].periods, series:trendSeries, summary:`${scope.initiatives.length ? `${totalApps} application${totalApps === 1 ? '' : 's'}` : ''}${scope.initiatives.length && scope.activities.length ? ' and ' : ''}${scope.activities.length ? `${totalBooks} booking${totalBooks === 1 ? '' : 's'}` : ''} received in the last ${range} days${range > 30 ? ' (weekly)' : ' (daily)'}.`, showTable:false, empty:`No applications or bookings in the last ${range} days.`});
  // Admission status of everyone who applied in scope.
  const adm = s.admissions.filter(a => scope.initiatives.some(i => i.id === a.initiativeId));
  const statusDonut = ds.donut({title:'Application outcomes', parts:[{label:'Accepted', value:adm.filter(a => ['Accepted','Completed'].includes(a.status)).length, tone:'good'}, {label:'Pending review', value:adm.filter(a => a.status === 'Pending').length, tone:'warning'}, {label:'Waiting list / offered', value:adm.filter(a => ['Queued','Offered'].includes(a.status)).length, tone:'s2'}, {label:'Closed', value:adm.filter(a => ['Rejected','Withdrawn','Declined','Expired','Removed','Suspended','Blocked'].includes(a.status)).length, tone:'muted'}], center:{value:adm.length, label:'applications'}, summary:'Every application in this scope, by its current state.'});
  const bookingDonut = ds.donut({title:'Outdoor Activity bookings', parts:[{label:'Confirmed', value:facts.reduce((n, [, f]) => n + f.bookings.filter(b => ['Confirmed','Checked In'].includes(b.status)).length, 0), tone:'good'}, {label:'Completed', value:facts.reduce((n, [, f]) => n + f.bookings.filter(b => b.status === 'Completed').length, 0), tone:'s1'}, {label:'Waiting / offered', value:facts.reduce((n, [, f]) => n + f.waiting + f.held, 0), tone:'s2'}, {label:'Cancelled or expired', value:facts.reduce((n, [, f]) => n + f.bookings.filter(b => ['Cancelled','Offer Expired','Declined'].includes(b.status)).length, 0), tone:'muted'}], center:{value:facts.reduce((n, [, f]) => n + f.bookings.length, 0), label:'bookings'}, summary:'Bookings are separate from attendance and completion.'});
  const kpis = ds.kpis([
    ...(scope.initiatives.length ? [ds.kpi({label:'Accepted students', value:sums.reduce((n, [, x]) => n + x.accepted, 0), of:sums.reduce((n, [, x]) => n + x.cap, 0), hint:`across ${liveI.length} live initiative${liveI.length === 1 ? '' : 's'}`, href:'organization/participants?status=accepted'}), ds.kpi({label:'Applications to review', value:pendingTotal, href:'organization/participants?status=pending', tone:pendingTotal ? 'attention' : '', trend:totalApps ? series[0].values.slice(-10) : null})] : []),
    ...(scope.activities.length ? [ds.kpi({label:'Outdoor places confirmed', value:facts.reduce((n, [, f]) => n + f.confirmed, 0), of:liveA.reduce((n, e) => n + Number(e.capacity || 0), 0), hint:`${facts.reduce((n, [, f]) => n + f.waiting, 0)} on waiting lists`, href:'organization/bookings'})] : []),
    ds.kpi({label:'Staffing gaps', value:gaps, hint:gaps ? 'Sessions without an active Supervisor' : 'Every upcoming session is covered', tone:gaps ? 'critical' : '', href:gaps ? 'organization/team' : ''})
  ]);
  const resources = `<div class="ds-grid is-2">${scope.initiatives.length ? ds.panel({title:'Initiatives', eyebrow:'ADMISSION & SEATS', actions:u.link('All initiatives', 'organization/initiatives', 'text-link'), body:`<ul class="dash-res-list">${sums.slice(0, 5).map(([i, x]) => `<li><a href="${u.href(`organization/initiatives/${i.id}`)}">${i.cover?.image ? `<img src="${esc(i.cover.image)}" alt="">` : `<span class="dash-res-mark">${u.icon('nodes')}</span>`}<span><strong>${esc(i.title)}</strong><small>${esc(deliveryLabel(i.deliveryMode || i.primaryMode))} · ${x.pending} pending · ${x.supervisors.length}/3 Supervisors</small></span><span class="dash-res-right">${ds.chip(i.status === 'Published' ? (x.phase === 'Running' ? 'Running' : x.phase) : i.status)}<span class="ds-meter" role="img" aria-label="${esc(`${x.accepted} of ${x.cap} seats`)}"><i style="--w:${Math.min(100, x.accepted / Math.max(1, x.cap) * 100)}%"></i></span><small>${x.accepted}/${x.cap} seats</small></span></a></li>`).join('')}</ul>`}) : ''}
    ${scope.activities.length ? ds.panel({title:'Outdoor Activities', eyebrow:'BOOKINGS & PLACES', actions:u.link('All activities', 'organization/activities', 'text-link'), body:`<ul class="dash-res-list">${facts.slice(0, 5).map(([e, f]) => `<li><a href="${u.href(`organization/activities/${e.id}`)}"><img src="${esc(e.cover || 'assets/home-redesign/forest-hike.jpg')}" alt=""><span><strong>${esc(e.title)}</strong><small>${esc(kindLabel(e.kind))} · ${esc(u.date(e.start))} · ${f.waiting} waiting</small></span><span class="dash-res-right">${ds.chip(f.window === 'Open' ? 'Open' : f.window === 'Draft' ? 'Draft' : 'Closed', f.window === 'Open' ? 'Bookings open' : f.window)}<span class="ds-meter" role="img" aria-label="${esc(`${f.occupied} of ${e.capacity} places`)}"><i style="--w:${Math.min(100, f.occupied / Math.max(1, e.capacity) * 100)}%"></i></span><small>${f.occupied}/${esc(e.capacity)} places</small></span></a></li>`).join('')}</ul>`}) : ''}</div>`;
  const tscope = {...scopeFor(s, 'organization', p.id), initiativeIds:scope.initiatives.map(i => i.id), activityIds:scope.activities.map(e => e.id)};
  tscope.groupIds = s.groups.filter(g => g.parentType === 'initiative' && tscope.initiativeIds.includes(g.initiativeId)).map(g => g.id);
  const events = timelineEvents(s, tscope);
  return hero + filters + kpis
    + `<div class="dash-overview"><div class="dash-overview-main">${ds.panel({title:'Participation', eyebrow:`${scope.key === 'all' ? 'ALL PROGRAMS' : 'THIS RESOURCE'} · LAST ${range} DAYS`, body:trend})}<div class="dash-outcomes">${scope.initiatives.length ? ds.panel({title:'Application outcomes', eyebrow:'INITIATIVES', body:statusDonut}) : ''}${scope.activities.length ? ds.panel({title:'Booking states', eyebrow:'OUTDOOR ACTIVITIES', body:bookingDonut}) : ''}</div></div>${ds.panel({title:'Needs your attention', eyebrow:'ACTION QUEUE', body:attentionList(attention.slice(0, 7)) + (attention.length > 7 ? `<p class="iw-muted">${attention.length - 7} more in their queues.</p>` : '')})}</div>`
    + ds.panel({title:'Coming up', eyebrow:'SCHEDULED · NOT YET HAPPENED', actions:u.link('Sessions', 'organization/sessions', 'text-link'), body:renderTimeline(s, {pending:[], past:[], upcoming:events.upcoming}, {lanes:['upcoming'], compact:true, headers:false, emptyText:'No sessions or deadlines scheduled in this scope.'})})
    + resources
    + createBand()
    + ds.panel({title:'Recent operational history', eyebrow:'SHARED OPERATIONAL TIMELINE', actions:u.link('Reports', 'organization/reports', 'text-link'), body:renderTimeline(s, {pending:[], upcoming:[], past:events.past}, {lanes:['past'], limit:8})});
}
function createBand() {
  return `<section class="dash-create iw-reveal"><div><p class="eyebrow">CREATE NEW</p><h2>Start something people can join.</h2><p>An Initiative (online, hybrid or face-to-face) or an Outdoor Activity your institution organizes. Both publish straight to Explore.</p><div class="actions">${u.link('Create an Initiative', 'organization/create?type=initiative', 'button primary small')}${u.link('Create an Outdoor Activity', 'organization/create?type=activity', 'button quiet small')}</div></div>${scene('hybrid', {size:'band'})}</section>`;
}
export function dashChange(target, ctx) {
  if (target.dataset.action === 'dash-scope' || target.name === 'dash-range') {
    const q = new URLSearchParams(ctx.route.query); q.set(target.dataset.action === 'dash-scope' ? 'scope' : 'range', target.value); ctx.go(`organization/dashboard?${q}`); return true;
  }
  return false;
}

/* ------------------------------------------------------------ list */

export function renderInitiativeCards(ctx, initiatives) {
  const {s} = ctx;
  const head = ds.pageHead({eyebrow:'IDEAS WITH A PLACE TO GROW', title:'Initiatives', lead:'Drafts stay private. Published initiatives appear in the regular Explore page immediately — no per-initiative Admin approval.', actions:u.link('Create Initiative', 'organization/create?type=initiative', 'button primary')});
  if (!initiatives.length) return head + ds.empty('Launch your first initiative.', 'Choose online, hybrid or face-to-face, then six guided stages: purpose, audience, components, team, rules and a preview of exactly what Individuals will see.', u.link('Create Initiative', 'organization/create?type=initiative', 'button primary'));
  const list = initiatives.slice().sort((a, b) => (a.status === 'Archived') - (b.status === 'Archived') || String(b.start).localeCompare(String(a.start)));
  return head + ds.filterRow({statuses:['Draft','Published','Completed','Cancelled','Archived','Suspended'], placeholder:'Search initiatives or topics…'})
    + `<div class="in-grid">${list.map((i, n) => { const x = summary(s, i), mode = i.deliveryMode || (i.modes?.length > 1 ? 'Hybrid' : i.modes?.[0]) || 'Online'; return `<article class="in-card iw-reveal" style="--i:${n}" data-search="${esc(`${i.title} ${i.topic} ${deliveryLabel(mode)}`)}" data-status="${esc(i.status)}"><a class="in-card-media" href="${u.href(`organization/initiatives/${i.id}`)}" tabindex="-1" aria-hidden="true">${i.cover?.image ? `<img src="${esc(i.cover.image)}" alt="" loading="lazy">` : scene(mode === 'Online' ? 'online' : mode === 'In-person' ? 'inperson' : 'hybrid', {size:'band'})}<span class="oa-kind">${u.icon(mode === 'Online' ? 'globe' : mode === 'Hybrid' ? 'hybrid' : 'people')}${esc(deliveryLabel(mode))}</span></a><div class="oa-card-body"><div class="oa-card-top">${ds.chip(i.status === 'Published' ? (x.phase === 'Running' ? 'Running' : x.phase) : i.status)}<span class="iw-status-note">${esc(i.topic || '')}</span></div><h2><a href="${u.href(`organization/initiatives/${i.id}`)}">${esc(i.title)}</a></h2><p class="in-summary">${esc(i.summary || i.objective || '')}</p><ul class="oa-meta"><li>${u.icon('calendar')}${esc(u.date(i.start))} – ${esc(u.date(i.end))}</li><li>${u.icon('people')}${x.supervisors.length}/3 Supervisors · ${x.coaches.length} Coach${x.coaches.length === 1 ? '' : 'es'} · ${x.groups.length} group${x.groups.length === 1 ? '' : 's'}</li></ul><div class="oa-capacity"><div><b>${x.accepted}</b><small>/ ${seatCap(i)} students</small></div><span class="ds-meter" role="img" aria-label="${esc(`${x.accepted} of ${seatCap(i)} seats`)}"><i style="--w:${Math.min(100, x.accepted / Math.max(1, seatCap(i)) * 100)}%"></i></span><small>${x.pending} pending · ${x.queued + x.offered} waiting · applications ${esc(x.registration.toLowerCase())}</small></div><div class="oa-actions">${u.link('Open', `organization/initiatives/${i.id}`, 'button quiet small')}${i.status === 'Draft' ? u.link('Continue editing', `organization/initiatives/${i.id}/edit`, 'button primary small') : x.pending ? u.link(`Review ${x.pending}`, withInitiative('organization/participants?status=pending', i), 'button primary small') : ''}</div></div></article>`; }).join('')}</div><p class="no-results" hidden>No initiatives match.</p>`;
}
