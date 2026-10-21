/**
 * Representative Dashboard and Initiatives (list, detail, lifecycle).
 * Publication, registration availability and execution phase are shown as
 * three distinct facts.
 */
import * as u from '../../ui.js';
import {esc,nameOf,pill,head,stats,stat,card,attention,emptyState,ring,feed,tabs,summary,initiativeSwitcher,withInitiative,fmtDate,sessionWhen} from './common.js';
import {seatCap,MAX_SUPERVISORS,representativeOrg} from '../../initiative-rules.js';
import {initiativeGarden} from '../../../shared/selectors.js';
import {collectiveScene} from './garden.js';

const cover = i => i.cover?.image ? `<img class="iw-cover" src="${esc(i.cover.image)}" alt="${esc(i.cover.alt || '')}">` : `<div class="iw-cover is-blank" aria-hidden="true">${u.icon('nodes')}</div>`;
const statusLine = (s, i) => { const sum = summary(s, i); return `${pill(i.status)}${i.status === 'Published' ? pill(sum.registration === 'Open' ? 'Open' : sum.registration, `Applications ${sum.registration.toLowerCase()}`) : ''}${['Published','Completed'].includes(i.status) ? pill(sum.phase === 'Running' ? 'Running' : sum.phase, sum.phase) : ''}`; };

function attentionFor(s, i) {
  const sum = summary(s, i), items = [];
  for (const ss of sum.needsSupervisor) items.push({tone:'critical', title:`Needs Supervisor · ${ss.title}`, text:`${sessionWhen(ss)} — attendance confirmation is disabled until an active Supervisor is assigned.`, href:withInitiative(sum.supervisors.length ? `organization/sessions/${ss.id}` : 'organization/team', i), action:sum.supervisors.length ? 'Assign duty' : 'Invite Supervisor'});
  if (sum.pending) items.push({title:`${sum.pending} application${sum.pending === 1 ? '' : 's'} waiting`, text:'You or an active Supervisor can approve; only you can reject.', href:withInitiative('organization/participants?status=pending', i), action:'Review'});
  if (sum.excusesForRep.length) items.push({title:`${sum.excusesForRep.length} excuse${sum.excusesForRep.length === 1 ? '' : 's'} awaiting your final decision`, text:'Each has a Supervisor recommendation.', href:withInitiative('organization/attendance', i), action:'Decide'});
  if (sum.unallocated.length) items.push({title:`${sum.unallocated.length} accepted student${sum.unallocated.length === 1 ? '' : 's'} without a group`, href:withInitiative('organization/team?tab=groups', i), action:'Allocate'});
  const noCoach = sum.groups.filter(g => !g.coachId);
  if (noCoach.length) items.push({title:`${noCoach.length} group${noCoach.length === 1 ? '' : 's'} without a Coach`, text:noCoach.map(g => g.name).join(', '), href:withInitiative('organization/team?tab=groups', i), action:'Assign'});
  if (sum.seatsUsed >= sum.cap && i.status === 'Published') items.push({tone:'attention', title:'All seats are taken', text:`${sum.queued} on the waiting list. Raising capacity (max 135) offers seats in order.`, href:`organization/initiatives/${i.id}`, action:'Manage'});
  const requests = (s.staffRequests || []).filter(x => x.initiativeId === i.id && x.status === 'Open');
  if (requests.length) items.push({title:`${requests.length} staffing request${requests.length === 1 ? '' : 's'} from Supervisors`, href:withInitiative('organization/team', i), action:'Open'});
  if (i.status === 'Draft') items.push({tone:'attention', title:'This initiative is still a draft', text:'Drafts never appear in Explore.', href:`organization/initiatives/${i.id}/edit`, action:'Continue'});
  return items;
}
function recentActivity(s, initiativeIds) {
  const items = [];
  for (const a of s.admissions.filter(x => initiativeIds.includes(x.initiativeId))) for (const h of a.history || []) items.push({at:h.at, title:`${nameOf(s, a.personId)} · ${h.to}`, text:`${a.code}${h.reason ? ` · ${h.reason}` : ''}`});
  for (const g of (s.grants || []).filter(x => initiativeIds.includes(x.scopeId))) for (const h of g.history || []) items.push({at:h.at, title:`${nameOf(s, g.personId)} · ${g.role} ${h.change.toLowerCase()}`, text:h.reason || ''});
  for (const e of (s.excuses || []).filter(x => initiativeIds.includes(x.initiativeId))) for (const h of e.history || []) items.push({at:h.at, title:`Excuse · ${h.change}`, text:nameOf(s, e.personId)});
  for (const a of (s.sessionAttendance || []).filter(x => initiativeIds.includes(x.initiativeId))) items.push({at:a.at, title:`Attendance · ${nameOf(s, a.personId)} ${a.status}`, text:s.sessions.find(x => x.id === a.sessionId)?.title || ''});
  return items.filter(x => x.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);
}

export function renderDashboard(ctx, initiatives) {
  const {s, person:p} = ctx, org = representativeOrg(s, p.id);
  const counts = ['Draft','Published','Completed','Cancelled','Archived','Suspended'].map(st => [st, initiatives.filter(i => i.status === st).length]);
  const hero = `<section class="iw-hero iw-reveal"><div class="iw-hero-copy"><p class="eyebrow">${esc(org.name)} · ${esc(org.type || 'Institution')}</p><h1>Good to see you, ${esc(p.name.split(' ')[0])}.</h1><p class="iw-lead">Your institution is verified by DeepSprout, so every initiative you publish goes straight to the regular Explore page — no per-initiative approval.</p><div class="actions">${u.link('Create Initiative', 'organization/initiatives/new', 'button primary')}${initiatives.length ? u.link('All initiatives', 'organization/initiatives', 'button quiet') : ''}</div></div><div class="iw-hero-badge"><span class="iw-verified">${u.icon('shield')}Verified institution</span><dl>${counts.filter(([, n]) => n).map(([st, n]) => `<div><dt>${esc(st)}</dt><dd>${n}</dd></div>`).join('') || '<div><dt>Initiatives</dt><dd>0</dd></div>'}</dl></div></section>`;
  if (!initiatives.length) return hero + emptyState('Launch your first initiative.', 'Six guided steps: purpose, audience and cost, components, team, rules, then a preview of exactly what Individuals will see in Explore.', u.link('Create Initiative', 'organization/initiatives/new', 'button primary'));
  const i = initiatives.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives.find(x => x.status === 'Published') || initiatives[0];
  ctx.localUI.initiativeId = i.id;
  const sum = summary(s, i), garden = initiativeGarden(s, i.id);
  const approvedTasks = sum.submissions.filter(x => x.status === 'Approved').length, toReview = sum.submissions.filter(x => x.status === 'Submitted').length;
  const att = sum.attendance;
  return hero
    + `<div class="iw-scope-bar iw-reveal"><span>Showing</span>${initiativeSwitcher(ctx, initiatives, i)}${statusLine(s, i).replace(pill(i.status), '')}${u.link('Open initiative', `organization/initiatives/${i.id}`, 'text-link')}</div>`
    + stats([stat(sum.accepted, 'Accepted students', {of:sum.cap, href:withInitiative('organization/participants?status=accepted', i)}), stat(sum.supervisors.length, 'Active Supervisors', {of:MAX_SUPERVISORS, href:withInitiative('organization/team', i), tone:sum.needsSupervisor.length ? 'attention' : ''}), stat(sum.pending, 'Pending applications', {href:withInitiative('organization/participants?status=pending', i), tone:sum.pending ? 'attention' : ''}), stat(sum.groups.length, 'Active groups', {hint:`${sum.coaches.length} Coach${sum.coaches.length === 1 ? '' : 'es'} allocated`, href:withInitiative('organization/team?tab=groups', i)}), stat(sum.upcoming.length, 'Upcoming sessions', {href:withInitiative('organization/sessions', i)})])
    + `<div class="iw-split is-wide">${card('Needs your attention', attention(attentionFor(s, i)), {eyebrow:'ACTION QUEUE'})}
      ${card('Progress', `<div class="iw-ring-row">${ring(approvedTasks, Math.max(sum.submissions.length, approvedTasks, 1), 'Tasks approved')}${ring(att.filter(a => a.status !== 'Absent').length, Math.max(att.length, 1), 'Attendance records present')}</div><dl class="iw-facts is-compact"><div><dt>Awaiting Coach review</dt><dd>${toReview}</dd></div><div><dt>Absences (factual)</dt><dd>${att.filter(a => a.status === 'Absent').length}</dd></div><div><dt>Excuses to decide</dt><dd>${sum.excusesForRep.length}</dd></div><div><dt>Coach reports · Supervisor summaries</dt><dd>${sum.coachReports.length} · ${sum.summaries.length}</dd></div></dl>${u.link('Open reports', withInitiative('organization/reports', i), 'text-link')}`, {eyebrow:'FROM THE RECORDS'})}</div>`
    + `<div class="iw-split">${card('Upcoming sessions', sum.upcoming.length ? `<ol class="iw-agenda">${sum.upcoming.slice(0, 4).map(ss => `<li><time><b>${esc(new Date(ss.date + 'T12:00').getDate())}</b><span>${esc(new Date(ss.date + 'T12:00').toLocaleDateString('en-GB', {month:'short'}))}</span></time><div><strong>${esc(ss.title)}</strong><small>${esc(ss.time)} · ${esc(ss.format)}</small></div>${summary(s, i).needsSupervisor.some(x => x.id === ss.id) ? pill('Needs Supervisor') : pill('Active', 'Supervised')}</li>`).join('')}</ol>` : '<p class="iw-muted">No upcoming published sessions.</p>', {extra:u.link('Schedule', withInitiative('organization/sessions', i), 'text-link')})}
      ${card('Group Garden', `<div class="iw-garden is-mini">${collectiveScene(garden.stage, Boolean(garden.completedMilestone))}</div><p class="iw-muted">${garden.count} qualifying contribution(s) · stage ${garden.stage}/5</p>`, {extra:u.link('Open', withInitiative('organization/group-garden', i), 'text-link')})}</div>`
    + card('Recent activity', feed(recentActivity(s, [i.id])), {eyebrow:'DERIVED FROM RECORDS'});
}

export function renderInitiativeList(ctx, initiatives) {
  const {s} = ctx;
  return head({eyebrow:'IDEAS WITH A PLACE TO GROW', title:'Initiatives', lead:'Drafts stay private. Published initiatives appear in the regular Explore page immediately.', actions:u.link('Create Initiative', 'organization/initiatives/new', 'button primary')})
    + `<div class="iw-card iw-reveal">${u.filterBar(['Draft','Published','Completed','Cancelled','Archived','Suspended'])}</div>`
    + (initiatives.length ? `<div class="iw-initiatives">${initiatives.slice().sort((a, b) => String(b.start).localeCompare(String(a.start))).map((i, n) => { const sum = summary(s, i); return `<article class="iw-initiative iw-reveal" style="--i:${n}" data-search="${esc(`${i.title} ${i.topic}`)}" data-status="${esc(i.status)}">${cover(i)}<div class="iw-initiative-body"><div class="actions">${statusLine(s, i)}</div><h2>${esc(i.title)}</h2><p>${esc(i.summary || i.objective || '')}</p><dl class="iw-facts is-inline"><div><dt>Dates</dt><dd>${esc(fmtDate(i.start))} – ${esc(fmtDate(i.end))}</dd></div><div><dt>Students</dt><dd>${sum.accepted}/${seatCap(i)}</dd></div><div><dt>Pending</dt><dd>${sum.pending}</dd></div><div><dt>Staff</dt><dd>${sum.supervisors.length} Sup · ${sum.coaches.length} Coach</dd></div><div><dt>Cost</dt><dd>${esc(i.cost?.type === 'Paid' ? `${i.cost.price} ${i.cost.currency}` : 'Free')}</dd></div></dl><div class="actions">${u.link('Open', `organization/initiatives/${i.id}`, 'button quiet small')}${i.status === 'Draft' ? u.link('Continue editing', `organization/initiatives/${i.id}/edit`, 'button primary small') : ''}</div></div></article>`; }).join('')}</div><p class="no-results" hidden>No initiatives match.</p>`
      : emptyState('Launch your first initiative.', 'Begin with a purpose and an audience.', u.link('Create Initiative', 'organization/initiatives/new', 'button primary')));
}

export function renderInitiativeDetail(ctx, i) {
  const {s, route:r} = ctx;
  const sum = summary(s, i), tab = r.query.get('tab') || 'overview';
  const manage = [];
  if (i.status === 'Draft') manage.push(u.link('Continue editing', `organization/initiatives/${i.id}/edit`, 'button primary'), u.button('Publish', 'initiative-publish', {id:i.id}, 'button secondary'));
  if (i.status === 'Published') {
    manage.push(u.button('Update details', 'initiative-update', {id:i.id}, 'button secondary'));
    manage.push(u.button(i.registrationState === 'Closed' ? 'Reopen applications' : 'Close applications', i.registrationState === 'Closed' ? 'initiative-reg-open' : 'initiative-reg-close', {id:i.id}, 'button quiet'));
    manage.push(u.button('Complete initiative', 'initiative-complete', {id:i.id}, 'button quiet'));
  }
  if (!['Cancelled','Archived','Completed'].includes(i.status)) manage.push(u.button('Cancel…', 'initiative-cancel', {id:i.id}, 'button danger'));
  if (['Completed','Cancelled','Draft','Published'].includes(i.status)) manage.push(u.button('Archive', 'initiative-archive', {id:i.id}, 'button quiet'));
  manage.push(u.button('Duplicate as draft', 'initiative-duplicate', {id:i.id}, 'button quiet'));
  const tabsBar = tabs([['Overview', `organization/initiatives/${i.id}`, 'overview'], ['Applications', withInitiative('organization/participants', i), 'x', sum.pending], ['Staff', withInitiative('organization/team', i), 'x'], ['Groups', withInitiative('organization/team?tab=groups', i), 'x'], ['Agenda', withInitiative('organization/sessions', i), 'x'], ['Attendance & excuses', withInitiative('organization/attendance', i), 'x', sum.excusesForRep.length], ['Reports', withInitiative('organization/reports', i), 'x'], ['Group Garden', withInitiative('organization/group-garden', i), 'x'], ['History', `organization/initiatives/${i.id}?tab=history`, 'history']], tab);
  const heroBlock = `<p class="breadcrumbs">${u.link('Initiatives', 'organization/initiatives', 'text-link')} / ${esc(i.title)}</p><section class="iw-detail-hero iw-reveal">${cover(i)}<div><div class="actions">${statusLine(s, i)}<span class="iw-version">v${esc(i.version || 1)}</span></div><h1>${esc(i.title)}</h1><p class="iw-lead">${esc(i.summary || '')}</p><div class="actions">${manage.join('')}</div>${i.status === 'Published' ? `<p class="iw-muted">${u.icon('mountain')} Visible now in the regular Individual Explore page.</p>` : i.status === 'Draft' ? `<p class="iw-muted">Draft — not visible in Explore.</p>` : ''}${i.cancelReason ? `<p class="iw-muted">Cancelled: ${esc(i.cancelReason)}</p>` : ''}</div></section>`;
  if (tab === 'history') return heroBlock + tabsBar + card('Version & decision history', `<ol class="iw-history">${(i.history || []).slice().reverse().map(h => `<li><time>${esc(fmtDate(h.at))}</time><span><strong>v${esc(h.version || i.version)}</strong> · ${esc(h.change)}${h.reason ? ` · ${esc(h.reason)}` : ''}${h.before ? `<small>${esc(Object.entries(h.before).map(([k, v]) => `${k}: ${v} → ${h.after[k]}`).join(' · '))}</small>` : ''}</span><small>${esc(h.actorId === 'system' ? 'System' : nameOf(s, h.actorId))}</small></li>`).join('')}</ol>`);
  const comp = (i.components || []).map(c => `<li><span class="iw-comp-type">${esc(c.type)}</span><strong>${esc(c.title)}</strong>${c.resourceId ? `<small>${esc(c.type === 'Session' ? 'Session record' : c.type === 'Survey or Quiz' ? 'Form record' : 'Linked record')} · ${esc(c.resourceId)}</small>` : '<small>Created on publication</small>'}</li>`).join('');
  return heroBlock + tabsBar
    + stats([stat(sum.accepted, 'Accepted students', {of:sum.cap}), stat(sum.pending, 'Pending'), stat(sum.queued + sum.offered, 'Waiting list'), stat(sum.supervisors.length, 'Active Supervisors', {of:MAX_SUPERVISORS}), stat(sum.coaches.length, 'Coaches'), stat(sum.sessions.filter(x => x.status === 'Published').length, 'Published sessions')])
    + `<div class="iw-split">${card('The invitation', `<p>${esc(i.objective || '')}</p>${i.description ? `<p>${esc(i.description)}</p>` : ''}<dl class="iw-facts"><div><dt>Topic</dt><dd>${esc(i.topic)}</dd></div><div><dt>Dates</dt><dd>${esc(fmtDate(i.start))} – ${esc(fmtDate(i.end))} · ${esc(i.timezone)}</dd></div><div><dt>Audience</dt><dd>${esc(i.audience)} · ages ${esc(i.minAge || 0)}–${esc(i.maxAge || 'any')}</dd></div><div><dt>Eligible area</dt><dd>${esc(i.coverage || '')} (${esc(i.country || '')})</dd></div><div><dt>Modes</dt><dd>${esc((i.modes || []).join(' · '))}${i.venue ? ` · ${esc(i.venue)}` : ''}</dd></div><div><dt>Applications</dt><dd>${esc(fmtDate(i.registrationOpen))} – ${esc(fmtDate(i.registrationClose))} · ${esc(sum.registration)}</dd></div><div><dt>Cost</dt><dd>${esc(i.cost?.type === 'Paid' ? `${i.cost.price} ${i.cost.currency} (simulated payment)` : 'Free')}</dd></div></dl>`, {eyebrow:'PUBLIC DETAILS'})}
      ${card('Components', `<ul class="iw-components">${comp || '<li>No components.</li>'}</ul><p class="iw-muted">Joining the initiative never books its sessions; each component keeps its own lifecycle.</p>`, {eyebrow:'WHAT IT CONTAINS'})}</div>`
    + linkedResources(s, i)
    + card('Participation rules', `<dl class="iw-facts">${Object.entries({Admission:i.policies?.admission, 'Waiting list':i.policies?.waitlist ? `On · offers held ${i.policies.offerHours || 24} h (configurable)` : 'Off', Withdrawal:i.withdrawal, Discipline:i.policies?.discipline, Attendance:i.policies?.attendance, Excuses:i.policies?.excuse, 'Make-up / waiver':i.policies?.makeup, Completion:i.policies?.completion, Privacy:i.policies?.privacy, Notifications:i.policies?.notifications, Consent:i.consent}).filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`, {eyebrow:'PUBLISHED RULES'});
}

export function lifecycleAction(action, target, ctx) {
  const d = target.dataset, s = ctx.s, i = s.initiatives.find(x => x.id === d.id);
  if (action === 'initiative-publish') { ctx.run('organization.initiative.publish', {id:i.id}, 'Published. It is now visible in the regular Explore page.'); ctx.render(); return true; }
  if (action === 'initiative-reg-close' || action === 'initiative-reg-open') { ctx.run(action.endsWith('close') ? 'initiative.registration.close' : 'initiative.registration.open', {id:i.id}, action.endsWith('close') ? 'Applications closed. Existing records are unchanged.' : 'Applications reopened.'); ctx.render(); return true; }
  if (action === 'initiative-update') {
    u.modal('Update published details', `<p>Changes create version ${(i.version || 1) + 1} and notify current applicants and students. Ownership and earlier records do not change.</p><div class="form-grid">${u.field('start', 'Start date', i.start, 'date', true)}${u.field('end', 'Expected end date', i.end, 'date', true)}${u.field('registrationOpen', 'Applications open', i.registrationOpen || '', 'date')}${u.field('registrationClose', 'Applications close', i.registrationClose || '', 'date')}${u.field('capacity', 'Accepted-student capacity (max 135)', i.capacity, 'number', true, 'min="1" max="135"')}${u.field('minAge', 'Minimum age', i.minAge ?? '', 'number')}${u.field('maxAge', 'Maximum age', i.maxAge ?? '', 'number')}</div>${u.field('venue', 'Venue', i.venue || '')}${u.area('summary', 'Short public summary', i.summary || '')}${u.area('reason', 'Reason for the change (sent with the notice)', '', true)}`, v => { const {reason, ...changes} = v; ctx.run('initiative.update', {id:i.id, changes:{...changes, capacity:Number(changes.capacity), minAge:changes.minAge === '' ? undefined : Number(changes.minAge), maxAge:changes.maxAge === '' ? undefined : Number(changes.maxAge)}, reason}, 'Update published and participants notified.'); ctx.render(); }, 'Publish update');
    return true;
  }
  if (action === 'initiative-complete') {
    const accepted = s.admissions.filter(a => a.initiativeId === i.id && a.status === 'Accepted');
    u.modal('Complete this initiative', `<p>Completion criteria: <strong>${esc(i.policies?.completion || 'not stated')}</strong>. Uncheck anyone who did not meet them. Completion is recorded in each student’s history and the Group Garden; it adds no Personal Garden object.</p>${accepted.length ? `<fieldset class="iw-fieldset"><legend>Met the completion criteria</legend>${accepted.map(a => u.checkbox('met', `${nameOf(s, a.personId)} · ${a.code}`, true, a.id)).join('')}</fieldset>` : '<p class="iw-muted">No accepted students.</p>'}<p class="iw-muted">Pending and waiting-list applications will close. All records stay available.</p>`, (v, f) => { const met = new Set([...f.querySelectorAll('input[name="met"]:checked')].map(x => x.value)); ctx.run('initiative.complete', {id:i.id, notCompletedIds:accepted.filter(a => !met.has(a.id)).map(a => a.id)}, 'Initiative completed.'); ctx.render(); }, 'Complete initiative');
    return true;
  }
  if (action === 'initiative-cancel') { u.modal('Cancel this initiative?', '<p>New applications and actions stop. Everyone with an open application or seat is notified. All history, attendance and submitted work are kept.</p>' + u.area('reason', 'Cancellation reason (shared)', '', true), v => { ctx.run('initiative.cancel', {id:i.id, reason:v.reason}, 'Initiative cancelled and participants notified.'); ctx.render(); }, 'Cancel initiative'); return true; }
  if (action === 'initiative-archive') { u.confirm('Archive this initiative?', 'It leaves your active list and Explore. Records remain for reports and history.', () => { ctx.run('initiative.archive', {id:i.id}, 'Archived.'); ctx.render(); }); return true; }
  if (action === 'initiative-duplicate') { const id = ctx.run('organization.initiative.duplicate', {id:i.id}, 'Draft copy created.'); ctx.go(`organization/initiatives/${id}/edit`); return true; }
  return false;
}

/** Linked independently owned resources (master §18): the owner keeps bookings and records; the Institution sees agreed aggregates only. */
function linkedResources(s, i) {
  const parts = s.partnerships.filter(p => p.initiativeId === i.id && ['Active','Accepted','Requested'].includes(p.status));
  const programs = (i.components || []).filter(c => c.type === 'Mentor Program' && c.resourceId).map(c => s.programs.find(p => p.id === c.resourceId)).filter(Boolean);
  if (!parts.length && !programs.length) return '';
  const items = [
    ...parts.map(p => { const e = s.experiences.find(x => x.id === p.experienceId), provider = s.providers.find(x => x.id === p.providerId); if (!e) return `<li><span class="iw-comp-type">Provider partnership</span><strong>${esc(provider?.name || 'Provider')}</strong><small>${esc(p.status)} · not yet linked to an experience — pending links never appear publicly</small></li>`; const b = s.bookings.filter(x => x.experienceId === e.id); return `<li><span class="iw-comp-type">Provider-owned experience</span><h3>${esc(e.title)}</h3><small>Bookings and safety stay with ${esc(provider?.name || 'the Provider')} · aggregate only: ${b.filter(x => ['Confirmed','Checked In','Completed'].includes(x.status)).length} confirmed, ${b.filter(x => ['Checked In','Completed'].includes(x.status)).length} checked in, ${b.filter(x => x.status === 'Completed').length} completed</small></li>`; }),
    ...programs.map(pr => `<li><span class="iw-comp-type">Coach-owned program</span><h3>${esc(pr.title)}</h3><small>Groups, tasks and reviews stay with the Coach · ${pr.groupIds.length} group(s)</small></li>`)
  ];
  return card('Linked partner resources', `<ul class="iw-components">${items.join('')}</ul>`, {eyebrow:'INDEPENDENT OWNERS'});
}
