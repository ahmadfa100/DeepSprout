/**
 * Representative Dashboard and Initiatives (list, detail, lifecycle).
 * Publication, registration availability and execution phase are shown as
 * three distinct facts.
 */
import * as u from '../../ui.js';
import {esc,nameOf,pill,head,stats,stat,card,attention,emptyState,ring,tabs,summary,initiativeSwitcher,withInitiative,fmtDate,sessionWhen} from './common.js';
import {seatCap,MAX_SUPERVISORS,representativeOrg} from '../../initiative-rules.js';
import {renderRepDashboard,renderInitiativeCards} from './rep-dashboard.js';
import {deliveryLabel} from '../../commands/institution.js';
import * as ds from '../../ds.js';
import {builderChoice} from '../../builders/controls.js';

const cover = i => i.cover?.image ? `<img class="iw-cover" src="${esc(i.cover.image)}" alt="${esc(i.cover.alt || '')}">` : `<div class="iw-cover is-blank" aria-hidden="true">${u.icon('nodes')}</div>`;
// One status pill (the state that matters now) plus a quiet line of detail — not three competing pills.
const statusLine = (s, i) => { const sum = summary(s, i); if (i.status !== 'Published') return pill(i.status); return `${pill(sum.phase === 'Running' ? 'Running' : sum.phase, sum.phase)}<span class="iw-status-note">Published · applications ${esc(sum.registration.toLowerCase())}</span>`; };

/** Dashboard and listing live in rep-dashboard.js (shared design system); detail and lifecycle stay here. */
export function renderDashboard(ctx, initiatives) { return renderRepDashboard(ctx, initiatives); }
export function renderInitiativeList(ctx, initiatives) { return renderInitiativeCards(ctx, initiatives); }

const componentHref = c => { const path = c.type === 'Session' ? `organization/sessions/${c.resourceId}` : c.type === 'Survey or Quiz' ? `organization/forms/${c.resourceId}` : c.type === 'Competition' ? `organization/competitions/${c.resourceId}` : c.type === 'Outdoor Activity' ? `organization/activities/${c.resourceId}` : ''; return path ? u.link('Open', path, 'text-link') : '<small>Linked</small>'; };
export function renderInitiativeDetail(ctx, i) {
  const {s, route:r} = ctx;
  const sum = summary(s, i), tab = r.query.get('tab') || 'overview';
  // One clear primary action; everything else lives in a “More” menu (Cancel stays visibly destructive).
  const primary = [], more = [];
  if (i.status === 'Draft') { primary.push(u.link('Continue editing', `organization/initiatives/${i.id}/edit`, 'button primary'), u.button('Publish', 'initiative-publish', {id:i.id}, 'button secondary')); }
  if (i.status === 'Published') {
    primary.push(u.button('Update details', 'initiative-update', {id:i.id}, 'button primary'));
    primary.push(u.button(i.registrationState === 'Closed' ? 'Reopen applications' : 'Close applications', i.registrationState === 'Closed' ? 'initiative-reg-open' : 'initiative-reg-close', {id:i.id}, 'button quiet'));
    more.push(u.button('Mark as completed', 'initiative-complete', {id:i.id}, 'iw-menu-item'));
  }
  more.push(u.button('Duplicate as draft', 'initiative-duplicate', {id:i.id}, 'iw-menu-item'));
  if (['Completed','Cancelled','Draft','Published'].includes(i.status)) more.push(u.button('Archive', 'initiative-archive', {id:i.id}, 'iw-menu-item'));
  if (!['Cancelled','Archived','Completed'].includes(i.status)) more.push(u.button('Cancel initiative…', 'initiative-cancel', {id:i.id}, 'iw-menu-item is-danger'));
  const manage = [...primary, more.length ? `<details class="iw-menu"><summary class="button quiet">More<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></summary><div class="iw-menu-panel">${more.join('')}</div></details>` : ''];
  const tabsBar = tabs([['Overview', `organization/initiatives/${i.id}`, 'overview'], ['Applications', withInitiative('organization/participants', i), 'x', sum.pending], ['Staff', withInitiative('organization/team', i), 'x'], ['Groups', withInitiative('organization/team?tab=groups', i), 'x'], ['Agenda', withInitiative('organization/sessions', i), 'x'], ['Attendance & excuses', withInitiative('organization/attendance', i), 'x', sum.excusesForRep.length], ['Reports', withInitiative('organization/reports', i), 'x'], ['History', `organization/initiatives/${i.id}?tab=history`, 'history']], tab);
  const mode = i.deliveryMode || (i.modes?.length > 1 ? 'Hybrid' : i.modes?.[0]) || 'Online';
  const justPublished = r.query.get('published') === '1' && i.status === 'Published' ? ds.banner('positive', 'Published to Explore.', `Individuals can now discover and apply to <strong>${esc(i.title)}</strong> in the regular Explore page. ${sum.supervisors.length ? '' : 'Invite a Supervisor so attendance-bearing sessions can open check-in.'}`, `<a class="button primary small" href="src/pages/member/explore/explore.html">Open Explore</a>${u.link('Invite staff', withInitiative('organization/team', i), 'button quiet small')}${u.link('Create another', 'organization/create', 'button quiet small')}`) : '';
  const heroBlock = `<p class="breadcrumbs">${u.link('Initiatives', 'organization/initiatives', 'text-link')} / ${esc(i.title)}</p>${justPublished}<section class="iw-detail-hero iw-reveal">${cover(i)}<div><div class="actions">${statusLine(s, i)}${ds.chip('Mode', deliveryLabel(mode))}</div><h1>${esc(i.title)}</h1><p class="iw-lead">${esc(i.summary || '')}</p><div class="actions">${manage.join('')}</div>${i.status === 'Published' ? `<p class="iw-muted">${u.icon('mountain')} Visible now in the regular Individual Explore page.</p>` : i.status === 'Draft' ? `<p class="iw-muted">Draft — not visible in Explore.</p>` : ''}${i.cancelReason ? `<p class="iw-muted">Cancelled: ${esc(i.cancelReason)}</p>` : ''}</div></section>`;
  if (tab === 'history') return heroBlock + tabsBar + card('Version & decision history', `<ol class="iw-history">${(i.history || []).slice().reverse().map(h => `<li><time>${esc(fmtDate(h.at))}</time><span><strong>v${esc(h.version || i.version)}</strong> · ${esc(h.change)}${h.reason ? ` · ${esc(h.reason)}` : ''}${h.before ? `<small>${esc(Object.entries(h.before).map(([k, v]) => `${k}: ${v} → ${h.after[k]}`).join(' · '))}</small>` : ''}</span><small>${esc(h.actorId === 'system' ? 'System' : nameOf(s, h.actorId))}</small></li>`).join('')}</ol>`);
  const comp = (i.components || []).map(c => `<li><span class="iw-comp-type">${esc(c.type)}</span><strong>${esc(c.title || `New ${c.type}`)}</strong>${c.planned ? `<small>Planned · details can be added later</small>${i.status === 'Published' ? u.button('Add details', 'initiative-component-edit', {id:i.id, component:c.id}, 'button quiet small') : ''}` : c.resourceId ? componentHref(c) : '<small>Part of this initiative</small>'}</li>`).join('');
  return heroBlock + tabsBar
    + stats([stat(sum.accepted, 'Accepted students', {of:sum.cap}), stat(sum.pending, 'Pending'), stat(sum.queued + sum.offered, 'Waiting list'), stat(sum.supervisors.length, 'Active Supervisors', {of:MAX_SUPERVISORS}), stat(sum.coaches.length, 'Coaches'), stat(sum.sessions.filter(x => x.status === 'Published').length, 'Published sessions')])
    + invitationCard(i, sum)
    + card('Components', `<ul class="iw-components">${comp || '<li>No components.</li>'}</ul><p class="iw-muted">Joining the initiative never books its sessions; each component keeps its own lifecycle.</p>`, {eyebrow:'WHAT IT CONTAINS'})
    + linkedResources(s, i)
    + rulesCard(i);
}

function invitationCard(i, sum) {
  const fact = (icon, label, value, secondary = '') => `<div class="inv-fact"><span class="inv-icon" aria-hidden="true">${u.icon(icon)}</span><div><dt>${esc(label)}</dt><dd>${esc(value)}${secondary ? `<small>${esc(secondary)}</small>` : ''}</dd></div></div>`;
  const area = [i.coverage, i.country].filter(Boolean).join(' · ') || 'Not restricted';
  const mode = (i.modes || []).join(' · ') || i.deliveryMode || 'Not specified';
  return card('The invitation', `<div class="invitation-copy"><p>${esc(i.objective || i.summary || '')}</p>${i.description ? `<p>${esc(i.description)}</p>` : ''}</div><dl class="inv-facts">${fact('nodes','Topic',i.topic || 'Not specified')}${fact('calendar','Dates',`${fmtDate(i.start)} – ${fmtDate(i.end)}`,i.timezone || '')}${fact('people','Audience',i.audience || 'Not specified',`Ages ${i.minAge ?? 0}–${i.maxAge || 'any'}`)}${fact('mountain','Modes',mode,i.venue || '')}${fact('globe','Eligible area',area)}${fact('form','Applications',`${fmtDate(i.registrationOpen)} – ${fmtDate(i.registrationClose)}`,sum.registration)}${fact('ticket','Cost',i.cost?.type === 'Paid' ? `${i.cost.price} ${i.cost.currency} · simulated` : 'Free')}</dl>`, {eyebrow:'PUBLIC DETAILS'});
}

function rulesCard(i) {
  const rules = [
    ['people','Admission',i.policies?.admission],['calendar','Withdrawal',i.withdrawal],['calendar','Attendance',i.policies?.attendance],
    ['hybrid','Make-up / waiver',i.policies?.makeup],['shield','Privacy',i.policies?.privacy],
    ['calendar','Waiting list',i.policies?.waitlist ? i.policies.offerManual ? 'On · offers end when you release them' : `On · offers held ${i.policies.offerHours || 24} h` : 'Off'],
    ['shield','Discipline',i.policies?.discipline],['form','Excuses',i.policies?.excuse],['check','Completion',i.policies?.completion],['mail','Notifications',i.policies?.notifications]
  ].filter(([, , value]) => value);
  return card('Participation rules', `<p class="rules-intro">The key rules for joining and taking part in this initiative.</p><dl class="rules-grid">${rules.map(([icon, label, value]) => `<div class="rule-item"><span class="inv-icon" aria-hidden="true">${u.icon(icon)}</span><div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div></div>`).join('')}</dl>${i.consent ? `<div class="rule-consent"><span class="inv-icon" aria-hidden="true">${u.icon('check')}</span><strong>Consent</strong><p>${esc(i.consent)}</p></div>` : ''}`, {eyebrow:'PUBLISHED RULES'});
}

export function lifecycleAction(action, target, ctx) {
  const d = target.dataset, s = ctx.s, i = s.initiatives.find(x => x.id === d.id);
  if (action === 'initiative-component-edit') {
    const c=i.components.find(x=>x.id===d.component),orgId=i.ownerId;
    const resources=c.type==='Session'?s.sessions.filter(x=>x.ownerId===orgId&&(!x.initiativeId||x.initiativeId===i.id)):c.type==='Survey or Quiz'?s.forms.filter(x=>x.ownerId===orgId&&(!x.initiativeId||x.initiativeId===i.id)):c.type==='Outdoor Activity'?s.experiences.filter(x=>x.ownerId===orgId&&!['Cancelled','Archived'].includes(x.status)):c.type==='Competition'?s.competitions.filter(x=>x.ownerId===orgId):c.type==='Mentor Program'?s.programs.filter(x=>(s.programLinks||[]).some(l=>l.programId===x.id&&l.institutionId===orgId&&l.status==='Active')):null;
    const picker=resources?builderChoice('resourceId',`Link ${c.type}`, [['','Choose later'],...resources.map(x=>[x.id,`${x.title} · ${x.status}`])],c.resourceId||''):'';
    u.modal(`Add details · ${c.type}`, `${u.field('title','Component title',c.title||'')}${u.area('description','Description',c.description||'')}${picker}<label class="builder-activation"><input type="checkbox" name="activate" value="yes"><span><strong>Make this component active</strong><small>${resources?'Choose a linked resource first.':'Its title and description will appear in the initiative.'}</small></span></label>`, (v,f)=>{ctx.run('organization.initiative.component.update',{id:i.id,componentId:c.id,title:v.title,description:v.description,resourceId:v.resourceId||'',activate:f.elements.activate?.checked||false},'Component details saved.');ctx.render();},'Save details');
    return true;
  }
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
  const activities = (i.components || []).filter(c => !c.planned && c.type === 'Outdoor Activity' && c.resourceId).map(c => s.experiences.find(e => e.id === c.resourceId && e.ownerId === i.ownerId)).filter(Boolean);
  const programs = (i.components || []).filter(c => !c.planned && c.type === 'Mentor Program' && c.resourceId).map(c => s.programs.find(p => p.id === c.resourceId)).filter(Boolean);
  if (!activities.length && !programs.length) return '';
  const items = [
    ...activities.map(e => { const b = s.bookings.filter(x => x.experienceId === e.id); return `<li><span class="iw-comp-type">Your Outdoor Activity</span><h3>${esc(e.title)}</h3><small>Booked separately · ${b.filter(x => ['Confirmed','Checked In','Completed'].includes(x.status)).length} confirmed, ${b.filter(x => ['Checked In','Completed'].includes(x.status)).length} checked in, ${b.filter(x => x.status === 'Completed').length} completed</small>${u.link('Open activity', `organization/activities/${e.id}`, 'text-link')}</li>`; }),
    ...programs.map(pr => `<li><span class="iw-comp-type">Coach-owned program</span><h3>${esc(pr.title)}</h3><small>Groups, tasks and reviews stay with the Coach · ${pr.groupIds.length} group(s)</small></li>`)
  ];
  return card('Linked resources', `<ul class="iw-components">${items.join('')}</ul>`, {eyebrow:'BOOKED OR RUN SEPARATELY'});
}
