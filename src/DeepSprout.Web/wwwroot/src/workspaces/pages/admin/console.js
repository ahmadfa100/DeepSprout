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
 *   Quick Setup   the six questions members answer during onboarding.
 * Data and decisions reuse the existing commands and the community store.
 */
import * as u from '../../ui.js';
import {nameOf} from '../../shared.js';
import {clockDay} from '../../domain.js';
import {head,stats,stat,card,pill,tabs} from '../institution/common.js';
import {communityRecords,decideCommunity} from '../../admin-community.js';
import {adminDashboard,activitiesGovernance,governanceAction,governanceChange} from './governance.js';
import * as ds from '../../ds.js';
import {kindLabel} from '../../activity-rules.js';
import * as inst from '../../institution-application.js';
export {governanceChange};

const e = u.esc;
const WAITING = ['Submitted', 'Pending Verification', 'Needs More Info'];
const KIND = {organization:'Institution', provider:'Outdoor Provider (retired path)', mentor:'Coach'};
const PATH = {organization:'organizations', provider:'providers', mentor:'mentor-applications'};
const HIDDEN = ['activity-catalog', 'policies', 'cms', 'entitlements', 'programs', 'system'];
// Only these seeded, fictional records have real PDF fixtures. Applicant-selected
// files elsewhere in this browser demo are names only and must not look downloadable.
const DEMO_DOCUMENTS = {
  'app-bright': ['registration-certificate.pdf', 'board-letter.pdf'],
  'app-reads': ['library-license.pdf'],
  'app-irbid': ['hub-registration.pdf'],
  'app-horizon': ['organization-profile.pdf'],
  'app-maya': ['mentor-profile.pdf']
};
const documentRow = (a, filename) => {
  const sample = DEMO_DOCUMENTS[a.id]?.includes(filename);
  const label = sample
    ? `<a href="assets/demo/application-documents/${a.id}/${filename}" download="${e(filename)}" aria-label="Download sample PDF ${e(filename)}">${e(filename)}</a>`
    : `<span>${e(filename)}</span>`;
  return `<li>${u.icon('form')}${label}<small>${sample ? 'SAMPLE PDF' : 'NAME ONLY'}</small></li>`;
};
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

/* The dashboard lives in governance.js (shared design system). */

/* ------------------------------------------------------------ requests */

function requests(ctx) {
  const {s, route:r} = ctx, tab = r.query.get('tab') || 'waiting';
  const apps = s.applications.filter(a => a.type !== 'mentor' && a.status !== 'Draft');
  const waiting = apps.filter(a => WAITING.includes(a.status)).sort((a, b) => String(a.submitted).localeCompare(String(b.submitted)));
  const decided = apps.filter(a => !WAITING.includes(a.status)).sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
  const list = tab === 'decided' ? decided : waiting;
  const row = a => `<article class="ad-request iw-reveal">
    <div class="ad-request-who">${orgAvatar(a.name)}<div><h3>${u.link(a.name, `admin/${PATH[a.type]}/${a.id}`, 'ad-title-link')}</h3><p>${e([KIND[a.type], a.details?.institutionType, a.details?.sector, a.details?.city].filter(Boolean).join(' · '))}</p></div></div>
    <p class="ad-request-aim">${e(a.details?.description || a.details?.goals || 'No description provided.')}</p>
    <div class="ad-request-rep">${u.avatar(nameOf(s, a.personId))}<div><strong>${e(nameOf(s, a.personId))}</strong><small>${e(a.details?.position || 'Representative')}</small></div></div>
    <div class="ad-request-meta">${statusPill(a)}${a.type === 'organization' ? (c => `<small class="ar-mini-check">${u.icon(c.ok === c.all ? 'check' : 'alert')}${c.ok}/${c.all} checks</small>`)({ok:inst.readiness(a, s.people.find(x => x.id === a.personId)).filter(x => x[1]).length, all:6}) : ''}<small>${e(tab === 'decided' ? `Decided ${u.date(a.updated)}` : `Sent ${ago(s, a.submitted)}`)}</small></div>
    <div class="ad-request-actions">${u.link('View details', `admin/${PATH[a.type]}/${a.id}`, `button ${tab === 'decided' ? 'quiet' : 'primary'} small`)}</div>
  </article>`;
  return head({eyebrow:'REQUESTS', title:'Institution requests', lead:'Institutions ask to join DeepSprout. See who they are and what they want to do, then approve or reject with a reason.'})
    + tabs([['Waiting for you', 'admin/organizations', 'waiting', waiting.length], ['Decided', 'admin/organizations?tab=decided', 'decided', decided.length]], tab)
    + (list.length ? `<div class="ad-requests">${list.map(row).join('')}</div>` : card('', tab === 'decided' ? calm('No decisions yet.', 'Approved and rejected requests appear here.') : calm('No requests waiting.', 'When an institution applies, its request appears here.')))
    + `<p class="iw-footnote">${u.icon('shield')}You verify the Institution and its Representative’s authority. Verified institutions then publish Initiatives and Outdoor Activities directly — no per-resource approval.</p>`;
}
function statusPill(a) {
  return {Submitted:pill('Pending', 'New request'), 'Pending Verification':pill('Pending', 'Answered — review again'), 'Needs More Info':pill('Info Requested', 'Waiting for their answer'), Approved:pill('Approved'), Rejected:pill('Rejected'), Suspended:pill('Suspended')}[a.status] || pill(a.status);
}

/* Institution request: everything the Admin needs to verify, in reading order —
   who the institution is, what it wants to do, how to reach it, the evidence,
   and finally the person who will manage it. Decision and checklist stay beside. */
const notGiven = '<span class="ar-none">Not provided</span>';
const allFacts = rows => `<dl class="ad-facts ar-facts">${rows.map(([k, v, wide]) => `<div${wide ? ' class="is-wide"' : ''}><dt>${e(k)}</dt><dd>${v ? e(v) : notGiven}</dd></div>`).join('')}</dl>`;
const yearsSince = (s, y) => { const n = Number(clockDay(s).slice(0, 4)) - Number(y); return Number.isFinite(n) && n >= 0 && y ? `${y} · ${plural(n, 'year')}` : y; };

function decisionPanel(a, rep, open) {
  if (open) return `<div class="ad-decide">${u.button('Approve', 'application-decide', {id:a.id, status:'Approved'}, 'button primary')}${u.button('Ask for more information', 'application-decide', {id:a.id, status:'Needs More Info'}, 'button quiet')}${u.button('Reject', 'application-decide', {id:a.id, status:'Rejected'}, 'button danger')}</div><p class="cw-fine">${u.icon('shield')}Approving opens the Institution workspace for ${e(rep?.name || 'the representative')}. They can publish initiatives right away.</p>`;
  return `<div class="cw-decided">${statusPill(a)}${a.messages?.length ? `<p class="cw-quote">“${e(a.messages.at(-1).text)}”</p>` : ''}</div>${a.status === 'Approved' ? `<div class="ad-decide is-secondary">${u.button('Suspend institution', 'application-decide', {id:a.id, status:'Suspended'}, 'button danger small')}</div>` : a.status === 'Suspended' ? `<div class="ad-decide is-secondary">${u.button('Restore institution', 'application-decide', {id:a.id, status:'Approved'}, 'button quiet small')}</div>` : ''}`;
}

function institutionRequest(ctx, a) {
  const {s} = ctx, d = a.details || {}, rep = s.people.find(x => x.id === a.personId), open = WAITING.includes(a.status);
  const kinds = a.fileKinds || {}, files = a.files || [], ages = inst.ages(d.audienceAges), checks = inst.readiness(a, rep), ready = checks.filter(c => c[1]).length;
  const others = s.applications.filter(x => x.personId === a.personId && x.id !== a.id && x.status !== 'Draft');
  const waited = ago(s, a.submitted);
  const chip = (icon, text) => text ? `<span class="ar-chip">${u.icon(icon)}${e(text)}</span>` : '';
  // Documents: one row per expected slot; unslotted older files fall under "Other".
  const slotOf = f => kinds[f] || 'other';
  const docs = inst.DOCS.map(([slot, label, hint, important]) => {
    const list = files.filter(f => slotOf(f) === slot), waived = slot === 'authorization' && d.authority === 'head';
    const state = list.length ? '<span class="ar-doc-state is-ok">Attached</span>' : waived ? '<span class="ar-doc-state">Not needed · leads the institution</span>' : slot === 'other' ? '<span class="ar-doc-state">None</span>' : `<span class="ar-doc-state ${important ? 'is-missing' : ''}">Not attached</span>`;
    return `<li class="ar-doc ${list.length ? 'has-files' : ''}"><div class="ar-doc-head"><div><strong>${e(label)}</strong><small>${e(hint)}</small></div>${state}</div>${list.length ? `<ul class="ad-files">${list.map(f => documentRow(a, f)).join('')}</ul>` : ''}</li>`;
  }).join('');
  const sample = files.some(f => DEMO_DOCUMENTS[a.id]?.includes(f)), nameOnly = files.some(f => !DEMO_DOCUMENTS[a.id]?.includes(f));
  const history = [{at:a.submitted, who:rep?.name || a.name, text:'Sent the request'}, ...(a.messages || []).map(m => ({at:m.created, who:nameOf(s, m.actorId), text:m.text}))];
  const address = [d.address, d.city, d.governorate !== d.city && d.governorate, d.country].filter(Boolean).join(', ');

  return `<p class="breadcrumbs">${u.link('Requests', 'admin/organizations', 'text-link')} / ${e(a.name)}</p>`
    + `<header class="ad-hero ar-hero iw-reveal">${orgAvatar(a.name)}<div><p class="eyebrow">INSTITUTION REQUEST · REF ${e(String(a.id).toUpperCase())}</p><h1>${e(a.name)}</h1><p class="iw-lead">${e([d.institutionType || d.type, d.sector, [d.city, d.country].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</p>`
    + `<div class="ar-chips">${chip('calendar', d.founded && `Founded ${yearsSince(s, d.founded)}`)}${chip('nodes', d.parentBody)}${chip('people', ages.length && `Serves ${ages.join(', ')}`)}</div></div>`
    + `<div class="ad-hero-status">${statusPill(a)}<small>Sent ${e(u.date(a.submitted))}</small>${open && waited !== 'Today' ? `<small class="ar-wait">${u.icon('clock')}Waiting since ${e(waited.toLowerCase())}</small>` : ''}</div></header>`
    + `<div class="ad-detail-layout"><div class="ad-detail-main">`
    + card('Who they are', allFacts([['Official name', a.name, true], ['Institution type', d.institutionType || d.type], ['Sector', d.sector], ['Affiliated to', d.parentBody], ['Founded', d.founded && yearsSince(s, d.founded)], ['Registration number', d.registrationNumber], ['Issued by', d.issuingAuthority]]), {eyebrow:'1 · IDENTITY'})
    + card('What they want to do', `<blockquote class="ad-aim">${e(d.description || 'No description provided.')}</blockquote>${d.goals ? `<p class="ad-goal"><b>The change they hope to see</b>${e(d.goals)}</p>` : ''}<div class="ar-audience"><b>Who they serve</b>${ages.length ? `<div class="ar-ages">${ages.map(x => `<span>${e(x)}</span>`).join('')}</div>` : `<p>${notGiven}</p>`}</div>${allFacts([['Reach', d.size], ['Areas served', d.areasServed]])}`, {eyebrow:'2 · PURPOSE & AUDIENCE'})
    + card('Location and contact', allFacts([['Address', address, true], ['Official email', d.officialEmail || a.email], ['Official phone', d.phone], ['Website', d.website], ['Social media', d.social]]), {eyebrow:'3 · CONTACT'})
    + card('Supporting documents', `<ul class="ar-docs">${docs}</ul>${sample ? '<p class="iw-muted">Sample PDFs are fictional and contain no verification evidence.</p>' : ''}${nameOnly ? '<p class="iw-muted">Name-only entries have no file content stored in this browser demo.</p>' : ''}`, {eyebrow:'4 · EVIDENCE', extra:`<span class="ar-count">${plural(files.length, 'file')}</span>`})
    + card('Representative', `<div class="ar-rep">${u.avatar(rep?.name || d.representative || a.name)}<div><strong>${e(rep?.name || d.representative || '—')}</strong><small>${e(d.position || 'Representative')} · ${e(a.name)}</small></div>${rep ? (rep.status === 'Active' ? pill('Active', 'Account active') : pill('Blocked', 'Account blocked')) : ''}</div>`
      + allFacts([['Authority to represent', inst.authorityLabel(d.authority), true], ['Direct phone', d.repPhone], ['Account email', rep?.email], ['Email verified', rep ? (rep.verified ? 'Yes' : 'Not yet') : ''], ...(d.representative && rep?.name && d.representative !== rep.name ? [['Name typed on the form', d.representative]] : []), ['Other requests', others.length ? others.map(x => `${x.name} (${x.status})`).join(', ') : 'None']])
      + (a.declaration ? `<figure class="ar-declaration"><blockquote>“${e(a.declaration.text)}”</blockquote><figcaption>${u.icon('check')}Signed by ${e(rep?.name || d.representative || 'the representative')} · ${e(u.date(a.declaration.at))}</figcaption></figure>` : `<p class="ar-declaration is-missing">${u.icon('alert')}No accuracy declaration on this request. It was sent before the declaration was required.</p>`), {eyebrow:'5 · WHO WILL MANAGE IT'})
    + card('History', `<ol class="ad-timeline">${history.map(h => `<li><time>${e(u.date(h.at))}</time><div><strong>${e(h.who)}</strong><p>${e(h.text)}</p></div></li>`).join('')}</ol>`, {eyebrow:'CONVERSATION'})
    + `</div><aside class="ad-detail-side">`
    + card('Verification checklist', `<div class="ar-meter" style="--w:${Math.round(ready / checks.length * 100)}%"><span><b>${ready}</b> of ${checks.length} in place</span><i aria-hidden="true"></i></div><ul class="ar-checks">${checks.map(([label, ok, note]) => `<li class="${ok ? 'is-ok' : 'is-gap'}">${u.icon(ok ? 'check' : 'alert')}<div><strong>${e(label)}</strong><small>${e(note)}</small></div></li>`).join('')}</ul><p class="cw-fine">${u.icon('shield')}These only show what was sent. Open the documents and confirm the registration with the issuing authority before approving.</p>`, {eyebrow:'BEFORE YOU DECIDE'})
    + card(open ? 'Your decision' : 'Decision', decisionPanel(a, rep, open), {cls:open ? 'cw-decision' : ''})
    + `</aside></div>`;
}

function requestDetail(ctx) {
  const {s, route:r} = ctx, a = s.applications.find(x => x.id === r.id && PATH[x.type] === r.page);
  if (!a) return u.missing('request');
  if (a.type === 'organization') return institutionRequest(ctx, a);
  const d = a.details || {}, rep = s.people.find(x => x.id === a.personId), open = WAITING.includes(a.status);
  const decide = open ? `<div class="ad-decide">${u.button('Approve', 'application-decide', {id:a.id, status:'Approved'}, 'button primary')}${u.button('Ask for more information', 'application-decide', {id:a.id, status:'Needs More Info'}, 'button quiet')}${u.button('Reject', 'application-decide', {id:a.id, status:'Rejected'}, 'button danger')}</div><p class="cw-fine">${u.icon('shield')}Approving opens the Institution workspace for ${e(rep?.name || 'the representative')}. They can publish initiatives right away.</p>`
    : `<div class="cw-decided">${statusPill(a)}${a.messages?.length ? `<p class="cw-quote">“${e(a.messages.at(-1).text)}”</p>` : ''}</div>${a.status === 'Approved' ? `<div class="ad-decide is-secondary">${u.button('Suspend institution', 'application-decide', {id:a.id, status:'Suspended'}, 'button danger small')}</div>` : a.status === 'Suspended' ? `<div class="ad-decide is-secondary">${u.button('Restore institution', 'application-decide', {id:a.id, status:'Approved'}, 'button quiet small')}</div>` : ''}`;
  const history = [{at:a.submitted, who:rep?.name || a.name, text:'Sent the request'}, ...(a.messages || []).map(m => ({at:m.created, who:nameOf(s, m.actorId), text:m.text}))];
  return `<p class="breadcrumbs">${u.link('Requests', 'admin/organizations', 'text-link')} / ${e(a.name)}</p>`
    + `<header class="ad-hero iw-reveal">${orgAvatar(a.name)}<div><p class="eyebrow">${e(KIND[a.type].toUpperCase())} REQUEST</p><h1>${e(a.name)}</h1><p class="iw-lead">${e([d.institutionType, d.city && `${d.city}, ${d.country || 'Jordan'}`, d.founded && `since ${d.founded}`].filter(Boolean).join(' · '))}</p></div><div class="ad-hero-status">${statusPill(a)}<small>Sent ${e(u.date(a.submitted))}</small></div></header>`
    + `<div class="ad-detail-layout"><div class="ad-detail-main">
        ${card('What they want to do', `<blockquote class="ad-aim">${e(d.description || 'No description provided.')}</blockquote>${d.goals ? `<p class="ad-goal"><b>Their goal</b>${e(d.goals)}</p>` : ''}`, {eyebrow:'PURPOSE'})}
        ${card('About the institution', facts([['Type', d.institutionType || d.type], ['Location', [d.city, d.country].filter(Boolean).join(', ')], ['Reach', d.size], ['Founded', d.founded], ['Website', d.website], ['Phone', d.phone], ['Official email', a.email]]), {eyebrow:'DETAILS'})}
        ${card('Documents', (a.files || []).length ? `<ul class="ad-files">${a.files.map(f => documentRow(a, f)).join('')}</ul>${a.files.some(f => DEMO_DOCUMENTS[a.id]?.includes(f)) ? '<p class="iw-muted">Sample PDFs are fictional and contain no verification evidence.</p>' : ''}${a.files.some(f => !DEMO_DOCUMENTS[a.id]?.includes(f)) ? '<p class="iw-muted">Name-only entries have no file content stored in this browser demo.</p>' : ''}` : '<p class="iw-muted">No documents attached.</p>', {eyebrow:'ATTACHED'})}
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
  const acts = s.experiences.filter(x => x.ownerId === o.id);
  const actRows = acts.length ? `<ul class="ad-rows">${acts.map(x => `<li><span class="ad-phase-dot is-${['Published','Active'].includes(x.status) ? 'active' : x.status === 'Draft' ? 'draft' : 'completed'}"></span><div><strong>${e(x.title)}</strong><small>${e(kindLabel(x.kind))} · ${e(u.date(x.start))}</small></div>${pill(x.status === 'Active' ? 'Published' : x.status)}<span class="ad-when">${s.bookings.filter(b => b.experienceId === x.id && ['Confirmed','Checked In','Completed'].includes(b.status)).length}/${e(x.capacity)} places</span></li>`).join('')}</ul>` : '<p class="iw-muted">No Outdoor Activities yet.</p>';
  const staffRows = staff.length ? `<ul class="ad-rows">${staff.map(g => `<li>${u.avatar(nameOf(s, g.personId))}<div><strong>${e(nameOf(s, g.personId))}</strong><small>${e(g.role === 'coach' ? 'Coach' : 'Supervisor')} · ${e(s.initiatives.find(i => i.id === g.scopeId)?.title || '')}</small></div></li>`).join('')}</ul>` : '<p class="iw-muted">No staff invited yet.</p>';
  return `<p class="breadcrumbs">${u.link('Institutions', 'admin/institutions', 'text-link')} / ${e(o.name)}</p>`
    + `<header class="ad-hero iw-reveal">${orgAvatar(o.name)}<div><p class="eyebrow">INSTITUTION</p><h1>${e(o.name)}</h1><p class="iw-lead">${e(o.description || '')}</p></div><div class="ad-hero-status">${pill(o.status)}${app ? (o.status === 'Suspended' ? u.button('Restore', 'application-decide', {id:app.id, status:'Approved'}, 'button quiet small') : u.button('Suspend institution', 'application-decide', {id:app.id, status:'Suspended'}, 'button danger small')) : ''}</div></header>`
    + stats([stat(x.inits.length, 'Initiatives'), stat(x.active, 'Running now'), stat(x.students, 'Students'), stat(x.coaches + x.supervisors, 'Staff')])
    + `<div class="ad-detail-layout"><div class="ad-detail-main">${card('Initiatives', initRows, {eyebrow:'WHAT THEY RUN'})}${card('Outdoor Activities', actRows, {eyebrow:'ORGANIZED BY THIS INSTITUTION', extra:u.link('Govern', 'admin/activities?tab=all', 'text-link')})}${card('Staff', staffRows, {eyebrow:'INVITED BY THE REPRESENTATIVE'})}</div>
      <aside class="ad-detail-side">${card('Representative', `<div class="ad-rep">${u.avatar(o.representative || '')}<div><strong>${e(o.representative || '—')}</strong><small>${e(o.position || 'Representative')}</small></div></div>`, {eyebrow:'CONTACT PERSON'})}${card('Details', facts([['Type', o.type], ['Sector', o.sector], ['Affiliated to', o.parentBody], ['Founded', o.founded], ['Registration', [o.registrationNumber, o.issuingAuthority].filter(Boolean).join(' · ')], ['Serves', inst.ages(o.audienceAges).join(', ')], ['Location', [o.city, o.country].filter(Boolean).join(', ')], ['Email', o.email], ['Phone', o.phone], ['Website', o.website], ['Approved', app ? u.date(app.updated) : '']]))}${app ? `<p class="cw-fine">${u.link('Open the original request', `admin/organizations/${app.id}`, 'text-link')}</p>` : ''}</aside></div>`;
}

/* ------------------------------------------------------------ people */

/** Every scoped grant a person holds: what it covers, who granted it, and its state. Choosing a workspace never adds one. */
function scopedGrants(s, pp) {
  const rows = [
    ...s.organizations.filter(o => (o.memberIds || []).includes(pp.id)).map(o => ['Institution Representative', o.name, 'Platform verification', o.status === 'Approved' ? 'Active' : o.status]),
    ...(s.grants || []).filter(g => g.personId === pp.id).map(g => [g.role === 'coach' ? 'Initiative Coach' : 'Initiative Supervisor', s.initiatives.find(i => i.id === g.scopeId)?.title || g.scopeId, s.organizations.find(o => o.id === g.institutionId)?.name || 'Institution', g.status]),
    ...(s.appointments || []).filter(a => a.personId === pp.id).map(a => ['Outdoor Activity Supervisor', `${s.experiences.find(x => x.id === a.experienceId)?.title || ''} · ${a.sessionIds.length} session(s)`, s.organizations.find(o => o.id === s.experiences.find(x => x.id === a.experienceId)?.ownerId)?.name || 'Institution', a.status === 'Accepted' ? 'Active' : a.status])
  ];
  return `<h3 class="ad-subhead">Scoped grants</h3>${rows.length ? `<ul class="ad-rows">${rows.map(([role, scope, by, st]) => `<li><div><strong>${e(role)}</strong><small>${e(scope)} · granted by ${e(by)}</small></div>${pill(st)}</li>`).join('')}</ul>` : '<p class="iw-muted">No partner grants. Individual access only.</p>'}`;
}

function people(ctx) {
  const {s, route:r, person:me} = ctx, n = numbers(s), tab = r.query.get('tab') || 'all';
  const rolesOf = pp => [n.reps.has(pp.id) && 'Representative', n.coaches.has(pp.id) && 'Coach', n.supervisors.has(pp.id) && 'Supervisor', n.students.has(pp.id) && 'Student', pp.individual && 'Individual', pp.workspaces.includes('admin') && 'Admin', s.applications.some(x => x.personId === pp.id && WAITING.includes(x.status)) && 'Applicant'].filter(Boolean);
  const groups = {all:() => true, reps:pp => n.reps.has(pp.id), coaches:pp => n.coaches.has(pp.id), supervisors:pp => n.supervisors.has(pp.id), students:pp => n.students.has(pp.id), blocked:pp => pp.status !== 'Active'};
  const list = s.people.filter(groups[tab] || groups.all);
  const orgOf = pp => s.organizations.find(o => (o.memberIds || []).includes(pp.id))?.name || s.organizations.find(o => (s.grants || []).some(g => g.personId === pp.id && g.institutionId === o.id && g.status === 'Active'))?.name || '';
  const t = (key, label, set) => [label, `admin/users${key === 'all' ? '' : `?tab=${key}`}`, key, set];
  return head({eyebrow:'PEOPLE', title:'People', lead:'Everyone registered on DeepSprout. One person can hold more than one role; each role comes from a scoped grant, never from choosing a workspace.'})
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

function assessments(ctx) {
  // Mirror the six prompts in pages/member/onboarding/quick-setup.js. This is a
  // read-only product reference: the old Lab editor and its drafts are history.
  const questions = [
    ['What would you like to change?', 'Choose one', ['Spend less time on Reels and Shorts', 'Use my phone more intentionally', 'Make more time for real-life activities', 'Improve focus on things that matter to me']],
    ['Which apps pull you in the most?', 'Choose all that apply', ['Instagram', 'TikTok', 'YouTube / Shorts', 'Facebook', 'Other']],
    ['Roughly how much time do you spend scrolling each day?', 'Choose one · self-reported estimate', ['Less than 1 hour', '1–2 hours', '2–4 hours', 'More than 4 hours', 'I’m not sure']],
    ['When does scrolling usually take over?', 'Choose one', ['Before bed', 'In the morning', 'During study or work', 'When I’m bored', 'It varies / I’m not sure']],
    ['What would you love to make more time for?', 'Choose all that apply', ['Walking / sports', 'Reading / learning', 'Drawing / creativity', 'Friends / family', 'Personal hobbies', 'Other']],
    ['How much time feels realistic for a small daily activity?', 'Choose one', ['5 minutes', '10 minutes', '15 minutes', '20 minutes']]
  ];
  return `<div class="ad-setup-page">`
    + `<header class="ad-setup-hero iw-reveal"><div><p class="eyebrow">MEMBER ONBOARDING · QUICK SETUP</p><h1>Six questions. One gentle start.</h1><p>Members answer these during onboarding, one at a time, to shape a preliminary Week 1 plan. There is no test, score, or required Lab assessment.</p><div class="ad-setup-hero-actions"><span class="ad-setup-current">${u.icon('check')}Current member flow</span><span>Six questions · one at a time</span></div></div><div class="ad-setup-count" aria-hidden="true"><strong>06</strong><span>questions<br>in order</span></div></header>`
    + `<div class="ad-setup-intro"><div><p class="eyebrow">THE QUESTION FLOW</p><h2>What members are asked</h2></div><p>Answers are personal setup inputs. They inform a plan proposal; they are not an assessment result.</p></div>`
    + `<ol class="ad-setup-list">${questions.map(([title, type, options], i) => `<li class="ad-setup-question iw-reveal"><div class="ad-setup-index"><span>${String(i + 1).padStart(2, '0')}</span><i aria-hidden="true"></i></div><div class="ad-setup-content"><div class="ad-setup-question-head"><h3>${e(title)}</h3><span class="ad-setup-type">${e(type)}</span></div><ul class="ad-setup-options">${options.map(option => `<li>${e(option)}</li>`).join('')}</ul></div></li>`).join('')}</ol>`
    + `<p class="ad-setup-note">${u.icon('shield')}This page reflects the current member flow. Previous Lab definitions and attempts remain historical records; no new test is required for onboarding or plan activation.</p></div>`;
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
  if (page === 'overview' || page === 'reports') return adminDashboard(ctx);
  if (page === 'activities' || page === 'experiences') return activitiesGovernance(ctx);
  if (page === 'providers' && !ctx.route.id) return head({eyebrow:'RETIRED QUEUE', title:'Outdoor Provider requests are retired.', lead:'Institutions now organize Outdoor Activities directly, so there is no separate Provider verification. Earlier Provider applications stay readable under Requests → Decided.'}) + u.link('Institution requests', 'admin/organizations', 'button primary') + u.link('Outdoor Activities', 'admin/activities', 'button quiet');
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
  if (governanceAction(action, target, ctx)) return true;
  if (action === 'application-decide') {
    const a = s.applications.find(x => x.id === d.id), first = nameOf(s, a.personId).split(' ')[0];
    const copy = {Approved:[`Approve ${a.name}?`, `${first} gets the Institution workspace and can publish initiatives right away.`, 'Note to the institution (optional)', 'Approve'], 'Needs More Info':['Ask for more information', `${first} sees your question on their request and can answer it.`, 'What do you need from them?', 'Send question'], Rejected:[`Reject ${a.name}?`, `${first} will see this reason. They can apply again later.`, 'Reason for rejecting', 'Reject request'], Suspended:[`Suspend ${a.name}?`, 'Their workspace closes and their initiatives stop accepting students. Their records are kept.', 'Reason for suspending', 'Suspend'], 'Approved-restore':[`Restore ${a.name}?`, 'Their workspace opens again.', 'Note (optional)', 'Restore']}[a.status === 'Suspended' && d.status === 'Approved' ? 'Approved-restore' : d.status];
    u.modal(copy[0], `<p class="cw-sub">${e(copy[1])}</p>${u.area('reason', copy[2], d.status === 'Needs More Info' && a.type === 'organization' ? inst.missingAsk(a, s.people.find(x => x.id === a.personId)) : '', d.status !== 'Approved')}${d.status === 'Needs More Info' && a.type === 'organization' && inst.missingAsk(a, s.people.find(x => x.id === a.personId)) ? '<p class="cw-fine">Pre-filled from the gaps in the verification checklist. Edit it freely.</p>' : ''}`, v => { ctx.run('admin.application.decide', {id:d.id, status:d.status, reason:v.reason}, {Approved:`${a.name} is approved.`, 'Needs More Info':`Question sent to ${first}.`, Rejected:`${a.name} was rejected.`, Suspended:`${a.name} is suspended.`}[d.status]); ctx.render(); }, copy[3]);
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
    u.modal(pp.name, `<div class="ad-rep is-big">${u.avatar(pp.name)}<div><strong>${e(pp.name)}</strong><small>${e(pp.email)}</small></div>${pp.status === 'Active' ? pill('Active') : pill('Blocked')}</div>${facts([['Roles', roles.join(', ') || 'Member'], ['Institution', s.organizations.find(o => (o.memberIds || []).includes(pp.id))?.name], ['Initiatives', inits.join(', ')], ['Email verified', pp.verified ? 'Yes' : 'Not yet']])}${scopedGrants(s, pp)}<p class="cw-fine">${u.icon('shield')}Personal Lab, Shield and Recovery data are private and never shown here.</p>`, () => {}, 'Close', {readonly:true});
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
  return false;
}
