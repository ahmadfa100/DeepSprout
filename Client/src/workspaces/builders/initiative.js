/**
 * Six-stage Initiative Builder (master §15.2). Draft saves at every stage;
 * Review shows the same card and detail the regular Individual sees in
 * Explore. Blockers name the field and the stage that fixes it. A missing
 * Supervisor is a warning, never a publication blocker.
 */
import * as u from '../ui.js';
import {id} from '../domain.js';
import {orgFor} from '../store.js';
import {draftFor,frame,parseChecks,itemControls,reorder} from './engine.js';
import {publishBlockers} from '../commands/institution.js';
import {MAX_SEATS,activeGrantsFor} from '../initiative-rules.js';
import {DEFAULT_POLICIES} from '../migrate.js';
import {staffFor} from '../../shared/selectors.js';

const COMPONENTS = [
  ['Awareness Content','Short articles, videos or guidance students can read at their own pace.'],
  ['Session','A scheduled online, in-person or hybrid session with its own registration.'],
  ['Workshop','A hands-on session. Same registration and attendance rules as a session.'],
  ['Survey or Quiz','An identified form (no anonymous mode) with its own versions.'],
  ['Competition','Rules, deadline, criteria and reviewed entries.'],
  ['Structured Group Activity','Coach-assigned practice tasks inside your internal groups.'],
  ['Mentor Program','Link an approved, independently owned Coach Program.'],
  ['Linked Outdoor Experience','Link a Provider-owned experience after the Provider accepts.']
];
const TOPICS = ['Procrastination awareness','Balanced technology use','Digital literacy','Youth wellbeing','Study focus','Smoking prevention awareness','Creative expression'];
const COVERS = [['','No cover image'],['assets/home-redesign/forest-hike.jpg','Woodland walk'],['assets/home-redesign/sunset-overlook.jpg','Sunset overlook'],['assets/home-redesign/pottery-workshop.jpg','Pottery workshop']];
const ZONES = ['Asia/Amman','Asia/Riyadh','Asia/Dubai','Europe/London','UTC'];
const STEPS = ['Basic information','Audience, mode, capacity & cost','Initiative components','Staff & groups','Policies & participation rules','Preview & publish'];
const NOTES = ['Purpose & dates','Who, where, how many','What it contains','Who runs it','The rules','Check & go live'];

const blank = () => ({title:'', topic:TOPICS[0], objective:'', summary:'', description:'', cover:{image:'', alt:''}, start:'', end:'', timezone:'Asia/Amman',
  audience:'', minAge:16, maxAge:30, requirements:'', consent:'I agree to take part respectfully and to identified forms for this initiative.', country:'Jordan', coverage:'', modes:['Online'], primaryMode:'Online', venue:'', onlineDetails:'A protected meeting link is shared with confirmed session registrants.',
  capacity:60, registrationOpen:'', registrationClose:'', cost:{type:'Free', price:0, currency:'JOD'}, withdrawal:'You can withdraw at any time from My Initiatives. Your submitted work stays in your history.',
  operatingMode:'structured', components:[], enrollment:true, policies:{...DEFAULT_POLICIES}, teamIds:[]});

function field(name, label, value, {type = 'text', required = false, extra = '', hint = '', errors = []} = {}) {
  const error = errors.find(e => e.field === name);
  return `<label class="field ${error ? 'has-error' : ''}"><span>${u.esc(label)}${required ? ' <span class="required">*</span>' : ''}</span><input name="${u.esc(name)}" type="${type}" value="${u.esc(value ?? '')}" ${required ? 'required' : ''} ${extra} ${error ? 'aria-invalid="true"' : ''}>${hint ? `<small>${u.esc(hint)}</small>` : ''}${error ? `<small class="field-error">${u.esc(error.message)}</small>` : ''}</label>`;
}
function area(name, label, value, {required = false, hint = '', errors = [], rows = 3} = {}) {
  const error = errors.find(e => e.field === name);
  return `<label class="field ${error ? 'has-error' : ''}"><span>${u.esc(label)}${required ? ' <span class="required">*</span>' : ''}</span><textarea name="${u.esc(name)}" rows="${rows}" ${required ? 'required' : ''} ${error ? 'aria-invalid="true"' : ''}>${u.esc(value ?? '')}</textarea>${hint ? `<small>${u.esc(hint)}</small>` : ''}${error ? `<small class="field-error">${u.esc(error.message)}</small>` : ''}</label>`;
}
const choice = (name, label, options, value, extra = '') => `<label class="field"><span>${u.esc(label)}</span><select name="${u.esc(name)}" ${extra}>${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${u.esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${u.esc(l)}</option>`; }).join('')}</select></label>`;
const section = (title, body, note = '') => `<fieldset class="builder-section"><legend>${u.esc(title)}</legend>${note ? `<p class="iw-muted">${u.esc(note)}</p>` : ''}${body}</fieldset>`;

/** Public card + detail preview — the same facts the Explore projection shows. */
export function publicPreview(org, d) {
  const modes = (d.modes || []).join(' · ');
  return `<div class="iw-preview-pair"><article class="iw-explore-card">${d.cover?.image ? `<img src="${u.esc(d.cover.image)}" alt="${u.esc(d.cover.alt || '')}">` : '<div class="iw-explore-card-blank"></div>'}<div><p class="eyebrow">INITIATIVE · ${u.esc(d.topic)}</p><span class="iw-pill is-positive">Verified institution</span><h3>${u.esc(d.title || 'Untitled initiative')}</h3><small>Run by ${u.esc(org.name)}</small><ul><li>${u.esc(u.date(d.start))} – ${u.esc(u.date(d.end))}</li><li>${u.esc(modes || 'Mode not set')}${d.venue ? ` · ${u.esc(d.venue)}` : ''}</li><li>${u.esc(d.capacity)} student seats · ${u.esc(d.cost?.type === 'Paid' ? `${d.cost.price} ${d.cost.currency}` : 'Free')}</li></ul></div></article>
    <article class="iw-explore-detail"><p class="eyebrow">PUBLIC DETAILS</p><h3>${u.esc(d.title || 'Untitled initiative')}</h3><p>${u.esc(d.summary || 'Short summary not written yet.')}</p><dl class="iw-facts is-compact"><div><dt>Who can join</dt><dd>${u.esc(d.audience || '—')} · ages ${u.esc(d.minAge || 0)}–${u.esc(d.maxAge || 'any')}</dd></div><div><dt>Eligible area</dt><dd>${u.esc(d.coverage || '—')}</dd></div><div><dt>Applications</dt><dd>${u.esc(u.date(d.registrationOpen))} – ${u.esc(u.date(d.registrationClose))}</dd></div><div><dt>Consent</dt><dd>${u.esc(d.consent || '—')}</dd></div><div><dt>Completion</dt><dd>${u.esc(d.policies?.completion || '—')}</dd></div></dl><p class="iw-muted">${(d.components || []).length} component(s), each joined separately.</p></article></div>`;
}

export function initiativeBuilder(ctx, existing) {
  const org = orgFor(ctx.s);
  const d = draftFor(ctx, 'initiative', existing ? structuredClone(existing) : blank());
  d.cost ||= {type:'Free', price:0, currency:'JOD'}; d.cover ||= {image:'', alt:''}; d.policies = {...DEFAULT_POLICIES, ...(d.policies || {})};
  const errors = publishBlockers(ctx.s, {...d, status:'Draft'}).filter(e => e.step === d.step && (d.errors || []).length);
  let body = '';
  if (d.step === 0) body = section('Identity', `${field('title', 'Initiative title', d.title, {required:true, errors})}<div class="form-grid">${choice('topic', 'Category / topic', TOPICS, d.topic)}${choice('timezone', 'Time zone', ZONES, d.timezone)}</div>${area('objective', 'Primary objective', d.objective, {required:true, errors, hint:'What participants will be able to do. Avoid medical or treatment claims.'})}${area('summary', 'Short public summary', d.summary, {required:true, errors, hint:'Shown on the Explore card. One or two sentences.'})}${area('description', 'Full description (optional)', d.description, {rows:4})}`)
    + section('Dates', `<div class="form-grid">${field('start', 'Start date', d.start, {type:'date', required:true, errors})}${field('end', 'Expected end date', d.end, {type:'date', required:true, errors})}</div>`)
    + section('Cover', `<div class="form-grid">${choice('coverImage', 'Approved local cover image', COVERS, d.cover.image)}${field('coverAlt', 'Alternative text', d.cover.alt, {hint:'Describe the image for screen-reader users.'})}</div>${d.cover.image ? `<img class="builder-cover-preview" src="${u.esc(d.cover.image)}" alt="">` : ''}`)
    + `<p class="static-info">${u.icon('shield')} Owned by <strong>${u.esc(org.name)}</strong> (verified) · Representative ${u.esc(ctx.person.name)}. Ownership resolves automatically.</p>`;
  if (d.step === 1) body = section('Audience & eligibility', `${field('audience', 'Intended audience', d.audience, {required:true, errors})}<div class="form-grid">${field('minAge', 'Minimum age', d.minAge, {type:'number', extra:'min="0" max="120"'})}${field('maxAge', 'Maximum age', d.maxAge, {type:'number', extra:'min="0" max="120"', errors})}</div>${area('requirements', 'Participant requirements (optional)', d.requirements)}${area('consent', 'Consent participants agree to', d.consent, {required:true, errors})}`)
    + section('Coverage', `<div class="form-grid">${field('country', 'Country', d.country, {required:true})}${field('coverage', 'Geographic eligibility', d.coverage, {required:true, errors, hint:'Who may join from where — separate from your headquarters and from session venues.'})}</div>`, `Institution headquarters: ${org.city || '—'}, ${org.country || ''}. This is not the eligibility area.`)
    + section('Participation mode', `<div class="builder-chips">${['Online','In-person','Hybrid'].map(m => u.checkbox('modes', m, (d.modes || []).includes(m), m)).join('')}</div>${errors.find(e => e.field === 'modes') ? `<small class="field-error">${u.esc(errors.find(e => e.field === 'modes').message)}</small>` : ''}<div class="form-grid">${choice('primaryMode', 'Main mode shown on the card', ['Online','In-person','Hybrid'], d.primaryMode)}${field('venue', 'Venue / address (in-person or hybrid)', d.venue, {errors})}</div>${field('onlineDetails', 'Online participation details', d.onlineDetails, {hint:'Never paste a private meeting link here; it is shared with confirmed registrants.'})}`)
    + section('Capacity & applications', `<div class="form-grid">${field('capacity', `Accepted-student capacity (1–${MAX_SEATS})`, d.capacity, {type:'number', required:true, extra:`min="1" max="${MAX_SEATS}"`, errors, hint:'Pending and waiting-list applicants never use a seat.'})}${field('registrationOpen', 'Applications open', d.registrationOpen, {type:'date'})}${field('registrationClose', 'Applications close', d.registrationClose, {type:'date', errors})}</div>`)
    + section('Cost', `<div class="builder-chips">${['Free','Paid'].map(t => `<label class="check-field"><input type="radio" name="costType" value="${t}" ${d.cost.type === t ? 'checked' : ''}> <span>${t}</span></label>`).join('')}</div><div class="form-grid">${field('price', 'Price', d.cost.price, {type:'number', extra:'min="0" step="0.5"', errors})}${choice('currency', 'Currency', ['JOD','USD','EUR','SAR'], d.cost.currency)}</div>${u.note('Payment is simulated in this Phase-1 demo: participants see the price and a clear “no charge is made” disclosure. No card data is collected.')}${area('withdrawal', 'Cancellation & withdrawal information', d.withdrawal)}`);
  if (d.step === 2) body = `<p>Add only what this initiative needs. Joining never registers a student for every session — each component keeps its own lifecycle.</p><div class="component-gallery is-rich">${COMPONENTS.map(([type, text]) => `<button type="button" data-action="builder-component-add" data-type="${u.esc(type)}"><strong>${u.esc(type)}</strong><small>${u.esc(text)}</small><span aria-hidden="true">+</span></button>`).join('')}</div>`
    + (d.components.length ? d.components.map((c, i) => `<section class="item-editor"><h3><span>${u.esc(c.type)}</span>${itemControls(i, d.components.length)}</h3>${field(`title-${i}`, 'Component title', c.title, {required:true, errors})}${area(`description-${i}`, 'Description', c.description || '')}${['Session','Workshop'].includes(c.type) ? `<div class="form-grid">${field(`date-${i}`, 'Date', c.date || d.start, {type:'date', required:true, errors})}${choice(`format-${i}`, 'Mode', ['Online','In-person','Hybrid'], c.format || 'Online')}${field(`time-${i}`, 'Start', c.time || '17:00', {type:'time', required:true})}${field(`endTime-${i}`, 'End', c.endTime || '18:00', {type:'time', required:true})}${field(`venue-${i}`, 'Venue (in-person / hybrid)', c.venue || '', {errors})}${field(`capacity-${i}`, 'Seats per mode', c.capacity || 30, {type:'number', extra:'min="1"'})}</div>${u.checkbox(`attendance-${i}`, 'Records attendance (needs an active Supervisor before check-in)', c.attendanceRequired !== false)}${u.checkbox(`publish-${i}`, 'Publish this session together with the initiative', c.publish !== false)}` : ''}${c.type === 'Survey or Quiz' ? choice(`purpose-${i}`, 'Form purpose', ['Survey','Quiz','Feedback','Registration form'], c.purpose || 'Survey') + u.note('Created as a draft identified form. Add its questions in Forms & surveys.') : ''}${c.type === 'Mentor Program' ? choice(`resource-${i}`, 'Approved Coach Program', [['', 'Choose a published program'], ...ctx.s.programs.filter(x => x.status === 'Published').map(x => [x.id, x.title])], c.resourceId || '') + u.note('The Coach keeps ownership of the program, its groups and reviews. Your initiative presents it.') : ''}${c.type === 'Competition' ? choice(`resource-${i}`, 'Competition', [['', 'Choose a competition'], ...ctx.s.competitions.filter(x => x.ownerId === org.id).map(x => [x.id, x.title])], c.resourceId || '') + u.note('Create competitions in the Competitions page; link them here.') : ''}${c.type === 'Linked Outdoor Experience' ? u.note('Request a Provider partnership from Partners after saving. Pending links never appear publicly.') : ''}${c.type === 'Structured Group Activity' ? u.note('Coaches assign approved Meaningful Practices to your internal groups. No separate Program is created.') : ''}</section>`).join('') : '<div class="builder-empty">No components yet. Choose one above.</div>');
  if (d.step === 3) {
    if (!d.id) body = `<div class="builder-empty"><h3>Save the draft to invite staff</h3><p>Invitations are scoped to a saved initiative. Saving keeps it private — drafts never appear in Explore.</p>${u.button('Save draft and continue here', 'initiative-ensure', {}, 'button primary')}</div>`;
    else {
      const staff = staffFor(ctx.s, d.id), groups = ctx.s.groups.filter(g => g.parentType === 'initiative' && g.initiativeId === d.id);
      body = section('Supervisors', `<p class="iw-muted">${staff.supervisors.length} of 3 active. You can publish and receive applications without one; sessions that record attendance show “Needs Supervisor” until one is assigned.</p>${u.button('Invite Supervisor by email', 'staff-invite', {role:'supervisor', initiative:d.id}, 'button secondary small')}`)
        + section('Coaches', `<p class="iw-muted">${staff.coaches.length} active. Coaches see only the groups you allocate.</p>${u.button('Invite Coach by email', 'staff-invite', {role:'coach', initiative:d.id}, 'button secondary small')}`)
        + section('Invitation status', staff.invites.length ? `<ul class="iw-mini-list">${staff.invites.map(x => `<li><span>${u.esc(x.email)} · ${x.role === 'coach' ? 'Coach' : 'Supervisor'}</span><span class="iw-pill is-${x.effectiveStatus === 'Accepted' ? 'positive' : x.effectiveStatus === 'Pending' ? 'attention' : 'critical'}">${u.esc(x.effectiveStatus)}</span><span class="actions">${x.effectiveStatus === 'Pending' ? u.button('Copy link', 'staff-copy', {token:x.token}, 'button quiet small') + u.button('Cancel', 'staff-cancel', {id:x.id}, 'button quiet small') : x.effectiveStatus === 'Expired' ? u.button('Resend', 'staff-resend', {id:x.id}, 'button quiet small') : ''}</span></li>`).join('')}</ul>` : '<p class="iw-muted">No invitations yet.</p>')
        + section('Preliminary groups', `${groups.length ? `<ul class="iw-mini-list">${groups.map(g => `<li><span>${u.esc(g.name)}</span><label class="iw-inline"><span class="sr-only">Coach</span><select data-action="group-coach" data-group="${u.esc(g.id)}"><option value="">No Coach yet</option>${activeGrantsFor(ctx.s, d.id, 'coach').map(c => `<option value="${u.esc(c.personId)}" ${c.personId === g.coachId ? 'selected' : ''}>${u.esc(ctx.s.people.find(p => p.id === c.personId)?.name)}</option>`).join('')}</select></label></li>`).join('')}</ul>` : '<p class="iw-muted">No groups yet. Groups belong to this initiative — they are not separate Coach Programs.</p>'}${u.button('Add group', 'group-create', {initiative:d.id}, 'button quiet small')}`, 'Students are allocated after acceptance. Only already-active Coaches can be allocated.');
    }
  }
  if (d.step === 4) body = section('Admission & seats', `<p class="static-info">${u.esc(d.policies.admission)}</p>${u.checkbox('waitlist', 'Waiting list when seats are full', d.policies.waitlist !== false)}<div class="form-grid">${field('offerHours', 'Offer hold time (hours)', d.policies.offerHours || 24, {type:'number', extra:'min="1" max="168"', hint:'24 h is the interim configurable default.'})}</div>`)
    + section('Conduct & attendance', `${area('discipline', 'Participant disciplinary policy', d.policies.discipline)}${area('attendance', 'Attendance rule', d.policies.attendance)}${area('excuse', 'Absence & excuse rule', d.policies.excuse)}${area('makeup', 'Make-up / waiver rule', d.policies.makeup, {hint:'Leave “Not configured” unless you publish an explicit rule. An accepted excuse never counts as attendance.'})}`)
    + section('Completion, privacy & notices', `${area('completion', 'Completion criteria', d.policies.completion, {required:true, errors, hint:'Published before enrollment. Check-in or an accepted excuse alone never implies completion.'})}${area('privacy', 'Privacy & safety', d.policies.privacy)}${area('notifications', 'Participant notifications', d.policies.notifications)}${choice('registrationForm', 'Identified registration form (optional)', [['', 'None'], ...ctx.s.forms.filter(f => f.ownerId === org.id && f.status === 'Published').map(f => [f.id, `${f.title} · v${f.version}`])], d.registrationForm || '')}`);
  if (d.step === 5) {
    const blockers = publishBlockers(ctx.s, {...d, status:'Draft'});
    const warnings = [];
    if (!d.id || !activeGrantsFor(ctx.s, d.id, 'supervisor').length) warnings.push('No active Supervisor yet — publishing is fine; attendance-bearing sessions will show “Needs Supervisor”.');
    if (!d.id || !activeGrantsFor(ctx.s, d.id, 'coach').length) warnings.push('No active Coach yet — structured group tasks start once a Coach accepts.');
    if (d.cost?.type === 'Paid') warnings.push('Paid: participants see a simulated-payment disclosure. No payment is processed.');
    body = `${blockers.length ? `<div class="iw-banner is-critical">${u.icon('shield')}<div><strong>${blockers.length} thing${blockers.length === 1 ? '' : 's'} to fix before publishing</strong><ul class="builder-blockers">${blockers.map(b => `<li><button type="button" data-action="builder-goto" data-step="${b.step}">${u.esc(STEPS[b.step])}</button> ${u.esc(b.message)}</li>`).join('')}</ul></div></div>` : `<div class="iw-banner is-positive">${u.icon('check')}<div><strong>Ready to publish.</strong><p>It will appear in the regular Explore page immediately — no per-initiative Admin approval.</p></div></div>`}
      ${warnings.length ? `<div class="iw-banner is-warning">${u.icon('shield')}<div><strong>Operational warnings (not blockers)</strong><ul>${warnings.map(w => `<li>${u.esc(w)}</li>`).join('')}</ul></div></div>` : ''}
      <h3>Exactly what Individuals will see</h3>${publicPreview(org, d)}
      <h3>Components</h3><ol class="iw-components">${d.components.map(c => `<li><span class="iw-comp-type">${u.esc(c.type)}</span><strong>${u.esc(c.title || 'Untitled')}</strong>${['Session','Workshop'].includes(c.type) ? `<small>${u.esc(u.date(c.date))} · ${u.esc(c.time)}–${u.esc(c.endTime)} · ${u.esc(c.format || 'Online')}</small>` : ''}</li>`).join('') || '<li>None</li>'}</ol>`;
  }
  const config = {
    kind:'initiative', command:'organization.initiative', title:existing ? `Continue: ${existing.title}` : 'Create an initiative.', eyebrow:'INITIATIVE BUILDER · SIX STAGES', description:'Draft saves at every stage. The last stage previews exactly what Individuals will see in Explore.', listPath:'organization/initiatives', steps:STEPS, stepNotes:NOTES, jump:true, layoutClass:'is-initiative',
    validate(draft, step) { return publishBlockers(ctx.s, {...draft, status:'Draft'}).filter(e => e.step === step).map(e => e.message); },
    publishDisabled:draft => publishBlockers(ctx.s, {...draft, status:'Draft'}).length > 0,
    capture(d, v, f) {
      if (d.step === 0) { for (const k of ['title','topic','objective','summary','description','start','end','timezone']) d[k] = v[k] ?? d[k]; d.cover = {image:v.coverImage || '', alt:v.coverAlt || ''}; }
      if (d.step === 1) { for (const k of ['audience','requirements','consent','country','coverage','primaryMode','venue','onlineDetails','registrationOpen','registrationClose','withdrawal']) d[k] = v[k] ?? d[k]; d.minAge = v.minAge === '' ? '' : Number(v.minAge); d.maxAge = v.maxAge === '' ? '' : Number(v.maxAge); d.capacity = Number(v.capacity); d.modes = parseChecks(f, 'modes'); if (!d.modes.includes(d.primaryMode) && d.modes.length) d.primaryMode = d.modes.includes('Hybrid') ? 'Hybrid' : d.modes[0]; d.cost = {type:v.costType || 'Free', price:Number(v.price || 0), currency:v.currency || 'JOD'}; }
      if (d.step === 2) d.components = d.components.map((c, i) => ({...c, title:v[`title-${i}`] ?? c.title, description:v[`description-${i}`] ?? c.description, ...(['Session','Workshop'].includes(c.type) ? {date:v[`date-${i}`], format:v[`format-${i}`], time:v[`time-${i}`], endTime:v[`endTime-${i}`], venue:v[`venue-${i}`], capacity:Number(v[`capacity-${i}`] || 30), attendanceRequired:f.elements[`attendance-${i}`]?.checked !== false, publish:f.elements[`publish-${i}`]?.checked !== false} : {}), ...(['Mentor Program','Competition'].includes(c.type) ? {resourceId:v[`resource-${i}`] || ''} : {}), ...(c.type === 'Survey or Quiz' ? {purpose:v[`purpose-${i}`]} : {})}));
      if (d.step === 4) { d.policies = {...d.policies, waitlist:f.elements.waitlist?.checked, offerHours:Number(v.offerHours || 24), discipline:v.discipline, attendance:v.attendance, excuse:v.excuse, makeup:v.makeup, completion:v.completion, privacy:v.privacy, notifications:v.notifications}; d.completion = v.completion; d.registrationForm = v.registrationForm || ''; }
    },
    itemAction(a, t, d, ctx) {
      if (a === 'builder-component-add') { const type = t.dataset.type; d.components.push({id:id('component'), type:type === 'Workshop' ? 'Session' : type, kind:type, title:type === 'Workshop' ? 'Workshop' : '', description:'', format:'Online', publish:true, attendanceRequired:true}); return true; }
      return reorder(a, t, d.components);
    },
    payload(d) { const {step, maxStep, errors, ...record} = d; return record; }
  };
  return frame(ctx, config, d, body);
}

/** Save a new draft without leaving the builder (stage 4 needs an initiative ID for scoped invitations). */
export function ensureSaved(ctx) {
  const active = ctx.localUI.activeBuilder;
  if (!active || active.config.kind !== 'initiative') return false;
  const d = active.draft, {step, maxStep, errors, ...record} = d;
  const recordId = ctx.run('organization.initiative.save', record, 'Draft saved privately. You can invite staff now.');
  d.id = recordId;
  ctx.localUI.builders[`${ctx.person.id}:initiative:${recordId}`] = d;
  delete ctx.localUI.builders[`${ctx.person.id}:initiative:new`];
  ctx.run('builder.clear', {kind:'initiative', id:'new'}, 'Draft saved privately. You can invite staff now.');
  ctx.run('builder.save', {kind:'initiative', id:recordId, draft:structuredClone(d)}, 'Draft saved privately. You can invite staff now.');
  ctx.go(`organization/initiatives/${recordId}/edit`);
  return true;
}
