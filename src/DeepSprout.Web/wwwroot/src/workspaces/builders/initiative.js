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
import {publishBlockers,DELIVERY_MODES,sessionFormats,deliveryLabel,modesFor} from '../commands/institution.js';
import {scene,sceneKey} from '../pages/institution/create.js';
import {MAX_SEATS,activeGrantsFor} from '../initiative-rules.js';
import {DEFAULT_POLICIES} from '../migrate.js';
import {staffFor} from '../../shared/selectors.js';
import {builderChoice} from './controls.js';

const COMPONENTS = [
  ['Session','A scheduled online, in-person or hybrid session with its own registration.'],
  ['Survey or Quiz','An identified form (no anonymous mode) with its own versions.'],
  ['Competition','Rules, deadline, criteria and reviewed entries.'],
  ['Structured Group Activity','Coach-assigned practice tasks inside your internal groups.'],
  ['Mentor Program','Link an approved, independently owned Coach Program.'],
  ['Outdoor Activity','Link one of your own Outdoor Activities. It keeps its own bookings and capacity.']
];
const TOPICS = ['Procrastination awareness','Balanced technology use','Digital literacy','Youth wellbeing','Study focus','Smoking prevention awareness','Creative expression','Other'];
const COVERS = [['','No cover image'],['assets/home-redesign/forest-hike.jpg','Woodland walk'],['assets/home-redesign/sunset-overlook.jpg','Sunset overlook'],['assets/home-redesign/pottery-workshop.jpg','Pottery workshop']];
const ZONES = ['Asia/Amman','Asia/Riyadh','Asia/Dubai','Europe/London','UTC'];
const STEPS = ['Basic information','Audience, mode & capacity','Initiative components','Staff & groups','Policies & participation rules','Preview & publish'];
const NOTES = ['Purpose & dates','Who, where, how many','What it contains','Who runs it','The rules','Check & go live'];

const blank = () => ({title:'', topic:TOPICS[0], objective:'', summary:'', description:'', cover:{image:'', alt:''}, start:'', end:'', timezone:'Asia/Amman',
  audience:'', minAge:16, maxAge:30, requirements:'', consent:'I agree to take part respectfully and to identified forms for this initiative.', country:'', coverage:'', deliveryMode:'Hybrid', modes:modesFor('Hybrid'), primaryMode:'Hybrid', venue:'', address:'', city:'', platform:'', onlineDetails:'', attendanceMethod:'Booking code or roster check by the assigned Supervisor', hybridChoice:true,
  capacity:60, registrationOpen:'', registrationClose:'', cost:{type:'Free', price:0, currency:'JOD'}, withdrawal:'You can withdraw at any time from My Initiatives. Your submitted work stays in your history.',
  operatingMode:'structured', components:[], enrollment:true, policies:{...DEFAULT_POLICIES}, teamIds:[]});

function field(name, label, value, {type = 'text', required = false, extra = '', hint = '', errors = []} = {}) {
  const error = errors.find(e => e.field === name);
  return `<label class="field ${error ? 'has-error' : ''}"><span>${u.esc(label)}${required ? ' <span class="required">*</span>' : ''}</span><input name="${u.esc(name)}" type="${type}" value="${u.esc(value ?? '')}" ${required ? 'required' : ''} ${extra} ${error ? 'aria-invalid="true"' : ''}>${hint ? `<small>${u.esc(hint)}</small>` : ''}${error ? `<small class="field-error">${u.esc(error.message)}</small>` : ''}</label>`;
}
function area(name, label, value, {required = false, hint = '', errors = [], rows = 3, placeholder = ''} = {}) {
  const error = errors.find(e => e.field === name);
  return `<label class="field ${error ? 'has-error' : ''}"><span>${u.esc(label)}${required ? ' <span class="required">*</span>' : ''}</span><textarea name="${u.esc(name)}" rows="${rows}" ${required ? 'required' : ''} ${placeholder ? `placeholder="${u.esc(placeholder)}"` : ''} ${error ? 'aria-invalid="true"' : ''}>${u.esc(value ?? '')}</textarea>${hint ? `<small>${u.esc(hint)}</small>` : ''}${error ? `<small class="field-error">${u.esc(error.message)}</small>` : ''}</label>`;
}
const choice = (name, label, options, value, extra = '') => builderChoice(name, label, options, value, {required:/\brequired\b/.test(extra)});
const section = (title, body, note = '') => `<fieldset class="builder-section"><legend>${u.esc(title)}</legend>${note ? `<p class="iw-muted">${u.esc(note)}</p>` : ''}${body}</fieldset>`;
// The twelve governorate seats provide useful starting points; users can pan to any place.
const MAP_CENTERS = [['Amman',31.9539,35.9106],['Irbid',32.5568,35.8469],['Zarqa',32.0728,36.088],['As-Salt',32.0392,35.7272],['Mafraq',32.3429,36.208],['Jerash',32.2819,35.8993],['Ajloun',32.3326,35.7517],['Madaba',31.7167,35.7939],['Karak',31.1853,35.7047],['Tafilah',30.8338,35.6161],['Ma’an',30.194,35.734],['Aqaba',29.5267,35.0078]];
function mapPicker(name, venue, address, centerName) {
  const center = MAP_CENTERS.find(x => x[0] === centerName) || MAP_CENTERS[0];
  const zoom = 11, scale = 256 * 2 ** zoom;
  const world = (lat, lon) => [(lon + 180) / 360 * scale, (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * scale];
  const [cx, cy] = world(center[1], center[2]);
  const tiles = [];
  for (let y = Math.floor(cy / 256) - 1; y <= Math.floor(cy / 256) + 1; y++) for (let x = Math.floor(cx / 256) - 2; x <= Math.floor(cx / 256) + 2; x++)
    tiles.push(`<img loading="lazy" alt="" src="https://tile.openstreetmap.org/${zoom}/${x}/${y}.png" style="left:calc(50% + ${Math.round(x * 256 - cx)}px);top:calc(50% + ${Math.round(y * 256 - cy)}px)">`);
  const point = String(address || '').match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  const [px, py] = point ? world(Number(point[1]), Number(point[2])) : [cx, cy];
  const pin = venue ? `<span class="builder-map-pin" style="left:calc(50% + ${Math.round(px-cx)}px);top:calc(50% + ${Math.round(py-cy)}px)" aria-hidden="true">${u.icon('pin')}</span>` : '';
  const suffix = name.slice('venue'.length);
  return `<div class="builder-place">${choice(`mapCenter${suffix}`, 'City', MAP_CENTERS.map(x=>x[0]), center[0])}<div class="builder-map-shell"><div class="builder-map" data-action="builder-map-select" data-lat="${center[1]}" data-lon="${center[2]}" data-zoom="${zoom}" role="button" tabindex="0" aria-label="Map. Drag to explore, or click to place a pin"><div class="builder-map-tiles">${tiles.join('')}</div><span class="builder-map-crosshair" aria-hidden="true">+</span>${pin}</div><div class="builder-map-tools"><span class="builder-map-instruction">Drag map · click to pin</span><div class="builder-map-zoom"><button type="button" data-action="builder-map-zoom" data-delta="-1" aria-label="Zoom out">−</button><button type="button" data-action="builder-map-zoom" data-delta="1" aria-label="Zoom in">+</button></div></div></div><div class="builder-place-footer"><p class="builder-place-selected">${venue ? `<strong>Place selected</strong><span>${u.esc(center[0])} · ${u.esc(address || '')}</span>` : '<strong>No place selected</strong><span>Move the map or choose a city, then place a pin.</span>'}</p><button type="button" class="button secondary small" data-action="builder-map-use-center">${venue ? 'Move pin here' : 'Use map center'}</button></div><small class="builder-map-credit">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a></small><input type="hidden" name="${name}" value="${u.esc(venue || '')}"><input type="hidden" name="address${suffix}" value="${u.esc(address || '')}"></div>`;
}
function componentEditor(c, i, d, ctx, org, errors) {
  const expanded = !!c.expanded;
  const head = `<div class="builder-component-head"><div><span class="eyebrow">${u.esc(c.type)} · ${c.planned ? 'PLANNED' : 'READY'}</span><h3>${u.esc(c.title || `New ${c.type}`)}</h3><p>${c.planned ? 'Publish this card now; add its details later.' : 'This component will go live with the initiative.'}</p></div><div class="actions"><button type="button" class="button secondary small" data-action="builder-component-toggle" data-index="${i}" aria-expanded="${expanded}">${expanded ? 'Hide info' : '+ Add info'}</button>${itemControls(i, d.components.length)}</div></div>`;
  if (!expanded) return `<section class="item-editor builder-component-card">${head}</section>`;
  const isSession = ['Session','Workshop'].includes(c.type), format = sessionFormats(d.deliveryMode).includes(c.format) ? c.format : sessionFormats(d.deliveryMode)[0];
  let details = `${field(`title-${i}`, 'Component title', c.title, {errors})}${area(`description-${i}`, 'Description', c.description || '')}`;
  if (isSession) details += `<div class="form-grid">${field(`date-${i}`, 'Date', c.date || '', {type:'date', errors})}${choice(`format-${i}`, 'Session format', sessionFormats(d.deliveryMode), format)}${field(`time-${i}`, 'Start', c.time || '', {type:'time'})}${field(`endTime-${i}`, 'End', c.endTime || '', {type:'time'})}</div>${format === 'Online' ? `<div class="form-grid">${choice(`platform-${i}`, 'Meeting platform', [['','Use initiative platform'],['Zoom','Zoom'],['Google Meet','Google Meet'],['Microsoft Teams','Microsoft Teams'],['Webex','Webex'],['Other','Other']], c.platform || '')}${field(`meeting-${i}`, 'Meeting link (optional until publishing)', c.meeting || '', {type:'url', hint:'Shared only with confirmed registrants.'})}</div>` : mapPicker(`venue-${i}`, c.venue || '', c.address || '', c.mapCenter || d.mapCenter || 'Amman')}${field(`capacity-${i}`, 'Seats', c.capacity || 30, {type:'number', extra:'min="1"'})}${u.checkbox(`attendance-${i}`, 'Record attendance', c.attendanceRequired !== false)}${u.checkbox(`publish-${i}`, 'Publish this session with the initiative', c.publish !== false)}`;
  if (c.type === 'Survey or Quiz') details += choice(`purpose-${i}`, 'Form purpose', ['Survey','Quiz','Feedback','Registration form'], c.purpose || 'Survey') + u.note('Created as a draft identified form. Add its questions in Forms & surveys.');
  if (c.type === 'Mentor Program') details += choice(`resource-${i}`, 'Approved Coach Program', [['', 'Choose a published program'], ...ctx.s.programs.filter(x => ['Published','Paused'].includes(x.status) && (ctx.s.programLinks || []).some(l => l.programId === x.id && l.institutionId === org.id && l.status === 'Active')).map(x => [x.id, x.title])], c.resourceId || '');
  if (c.type === 'Competition') details += choice(`resource-${i}`, 'Competition', [['', 'Choose a competition'], ...ctx.s.competitions.filter(x => x.ownerId === org.id).map(x => [x.id, x.title])], c.resourceId || '');
  if (c.type === 'Outdoor Activity') details += choice(`resource-${i}`, 'Your Outdoor Activity', [['', 'Choose one of your activities'], ...ctx.s.experiences.filter(x => x.ownerId === org.id && !['Cancelled','Archived'].includes(x.status)).map(x => [x.id, `${x.title} · ${x.status}`])], c.resourceId || '') + u.note('Linked, not copied: the activity keeps its own bookings and capacity. Students book it separately.');
  if (c.type === 'Structured Group Activity') details += u.note('Coaches assign approved Meaningful Practices to your internal groups.');
  return `<section class="item-editor builder-component-card">${head}<div class="builder-component-details">${details}<label class="builder-activation"><input type="checkbox" name="ready-${i}" ${c.planned ? '' : 'checked'}><span><strong>Publish this component now</strong><small>Leave off to keep the card planned and complete its details later.</small></span></label></div></section>`;
}

/** Public card + detail preview — the same facts the Explore projection shows. */
export function publicPreview(org, d) {
  const modes = d.deliveryMode ? `${d.deliveryMode === 'In-person' ? 'Face-to-Face' : d.deliveryMode}` : (d.modes || []).join(' · ');
  return `<div class="iw-preview-pair"><article class="iw-explore-card">${d.cover?.image ? `<img src="${u.esc(d.cover.image)}" alt="${u.esc(d.cover.alt || '')}">` : '<div class="iw-explore-card-blank"></div>'}<div><p class="eyebrow">INITIATIVE · ${u.esc(d.topic)}</p><span class="iw-pill is-positive">Verified institution</span><h3>${u.esc(d.title || 'Untitled initiative')}</h3><small>Run by ${u.esc(org.name)}</small><ul><li>${u.esc(u.date(d.start))} – ${u.esc(u.date(d.end))}</li><li>${u.esc(modes || 'Mode not set')}${d.venue ? ` · ${u.esc(d.venue)}` : ''}</li><li>${u.esc(d.capacity)} student seats · ${u.esc(d.cost?.type === 'Paid' ? `${d.cost.price} ${d.cost.currency}` : 'Free')}</li></ul></div></article>
    <article class="iw-explore-detail"><p class="eyebrow">PUBLIC DETAILS</p><h3>${u.esc(d.title || 'Untitled initiative')}</h3><p>${u.esc(d.summary || 'Short summary not written yet.')}</p><dl class="iw-facts is-compact"><div><dt>Who can join</dt><dd>${u.esc(d.audience || '—')} · ages ${u.esc(d.minAge || 0)}–${u.esc(d.maxAge || 'any')}</dd></div><div><dt>Audience country</dt><dd>${u.esc(d.country === 'Other' ? d.countryOther || 'Not specified' : d.country || 'Any country')}</dd></div><div><dt>Applications</dt><dd>${u.esc(u.date(d.registrationOpen))} – ${u.esc(u.date(d.registrationClose))}</dd></div><div><dt>Consent</dt><dd>${u.esc(d.consent || '—')}</dd></div><div><dt>Completion</dt><dd>${u.esc(d.policies?.completion || '—')}</dd></div></dl><p class="iw-muted">${(d.components || []).length} component(s), each joined separately.</p></article></div>`;
}

export function initiativeBuilder(ctx, existing) {
  const org = orgFor(ctx.s);
  const d = draftFor(ctx, 'initiative', existing ? structuredClone(existing) : blank());
  delete d.registrationForm;
  d.components = (d.components || []).map(c => {
    if(c.planned !== undefined)return c;
    const validOutdoor=c.type!=='Outdoor Activity'||ctx.s.experiences.some(e=>e.id===c.resourceId&&e.ownerId===org.id&&!['Cancelled','Archived'].includes(e.status));
    return {...c,planned:!validOutdoor||(!c.resourceId&&['Outdoor Activity','Mentor Program','Competition'].includes(c.type))||!String(c.title||'').trim()||(c.type==='Session'&&(!c.date||!c.time||!c.endTime))};
  });
  d.ownerId ||= org.id;
  d.cost ||= {type:'Free', price:0, currency:'JOD'}; d.cover ||= {image:'', alt:''}; d.policies = {...DEFAULT_POLICIES, ...(d.policies || {})};
  // Overall delivery mode: chosen on Create New (?mode=…) for a fresh draft; older drafts derive it from their modes.
  const asked = ctx.route.query.get('mode');
  if (!existing && asked && DELIVERY_MODES.some(m => m[0] === asked) && !d.title) d.deliveryMode = asked;
  d.deliveryMode ||= (d.modes || []).length > 1 || d.primaryMode === 'Hybrid' ? 'Hybrid' : (d.modes || [])[0] || 'Online';
  const online = ['Online','Hybrid'].includes(d.deliveryMode), physical = ['In-person','Hybrid'].includes(d.deliveryMode);
  const errors = publishBlockers(ctx.s, {...d, status:'Draft'}).filter(e => e.step === d.step && (d.errors || []).length);
  let body = '';
  if (d.step === 0) body = section('Identity', `${field('title', 'Initiative title', d.title, {required:true, errors})}<div class="form-grid">${choice('topic', 'Category / topic', TOPICS, TOPICS.includes(d.topic) ? d.topic : 'Other')}${choice('timezone', 'Time zone', ZONES, d.timezone)}</div>${d.topic === 'Other' || !TOPICS.includes(d.topic) ? field('topicOther', 'Your topic', d.topic === 'Other' ? '' : d.topic, {required:true}) : ''}${area('objective', 'Primary objective', d.objective, {required:true, errors, hint:'What participants will be able to do. Avoid medical or treatment claims.'})}${area('summary', 'Short public summary', d.summary, {required:true, errors, hint:'Shown on the Explore card. One or two sentences.'})}${area('description', 'Full description (optional)', d.description, {rows:4})}`)
    + section('Dates', `<div class="form-grid">${field('start', 'Start date', d.start, {type:'date', required:true, errors})}${field('end', 'Expected end date', d.end, {type:'date', required:true, errors})}</div>`)
    + section('Cover image', `${builderChoice('coverImage', 'Image (optional)', COVERS, d.cover.image, {images:true})}${d.cover.image ? field('coverAlt', 'Alternative text', d.cover.alt, {hint:'Describe the image for screen-reader users.'}) : ''}`)
    + `<p class="static-info">${u.icon('shield')} Owned by <strong>${u.esc(org.name)}</strong> (verified) · Representative ${u.esc(ctx.person.name)}. Ownership resolves automatically.</p>`;
  if (d.step === 1) body = section('Audience & eligibility', `${field('audience', 'Intended audience', d.audience, {required:true, errors})}<div class="form-grid">${field('minAge', 'Minimum age', d.minAge, {type:'number', extra:'min="0" max="120"'})}${field('maxAge', 'Maximum age', d.maxAge, {type:'number', extra:'min="0" max="120"', errors})}</div>${choice('country', 'Audience country (optional)', [['','Any country'],['Jordan','Jordan'],['Saudi Arabia','Saudi Arabia'],['United Arab Emirates','United Arab Emirates'],['Other','Other']], d.country || '')}${d.country === 'Other' ? field('countryOther', 'Country', d.countryOther || '') : ''}${area('requirements', 'Participant requirements (optional)', d.requirements)}${area('consent', 'Consent participants agree to', d.consent, {required:true, errors})}`)
    + section('Delivery mode', `<div class="builder-mode" role="radiogroup" aria-label="Initiative delivery mode">${DELIVERY_MODES.map(([v, l, t]) => `<label class="builder-mode-option"><input type="radio" name="deliveryMode" value="${v}" ${d.deliveryMode === v ? 'checked' : ''}><span>${u.icon(v === 'Online' ? 'globe' : v === 'Hybrid' ? 'hybrid' : 'people')}<strong>${u.esc(l)}</strong><small>${u.esc(t)}</small></span></label>`).join('')}</div><p class="iw-muted">The overall mode decides what you publish below. Each session keeps its own format: ${u.esc(sessionFormats(d.deliveryMode).join(' / '))} sessions fit a ${u.esc(deliveryLabel(d.deliveryMode))} initiative.</p>`)
    + (online ? section('Online access', `<div class="form-grid">${choice('platform', 'Meeting platform', [['','Choose a platform'],['Zoom','Zoom'],['Google Meet','Google Meet'],['Microsoft Teams','Microsoft Teams'],['Webex','Webex'],['Other','Other']], d.platform || '', 'required')}${choice('linkPolicy', 'When participants receive the link (optional)', [['','Not specified yet'],['24h','24 hours before each session'],['confirmed','As soon as their session place is confirmed'],['day','On the morning of each session']], d.linkPolicy || '')}</div>${d.platform === 'Other' ? field('platformOther', 'Platform name', d.platformOther || '', {required:true}) : ''}${area('onlineDetails', 'How online participants join (optional)', d.onlineDetails, {hint:'Never paste a private meeting link here — links go only to confirmed registrants.', placeholder:'A protected meeting link is shared with confirmed registrants before each session.'})}${field('captions', 'Accessibility online (optional)', d.captions || '', {hint:'Captions, recordings, low-bandwidth options.'})}`, 'Shown publicly without the private link.') : '')
    + (physical ? section('Place on the map', `${mapPicker('venue', d.venue, d.address, d.mapCenter || org.city || 'Amman')}${choice('attendanceMethod', 'On-site check-in method', ['Booking code or roster check by the assigned Supervisor','QR booking code at the door','Paper roster confirmed by the Supervisor'], d.attendanceMethod)}`, 'Select the meeting place on the map. Attendance needs an active Supervisor.') : '')
    + section('Capacity & applications', `<div class="form-grid">${field('capacity', `Accepted-student capacity (1–${MAX_SEATS})`, d.capacity, {type:'number', required:true, extra:`min="1" max="${MAX_SEATS}"`, errors, hint:'Pending and waiting-list applicants never use a seat.'})}${field('registrationOpen', 'Applications open', d.registrationOpen, {type:'date'})}${field('registrationClose', 'Applications close', d.registrationClose, {type:'date', errors})}</div>`)
    + section('Withdrawal information', area('withdrawal', 'Cancellation & withdrawal information', d.withdrawal));
  if (d.step === 2) body = `<p>Add the components this initiative needs. Start with a simple card, then add details when ready.</p><div class="component-gallery is-rich">${COMPONENTS.map(([type, text]) => `<button type="button" data-action="builder-component-add" data-type="${u.esc(type)}"><strong>${u.esc(type)}</strong><small>${u.esc(text)}</small><span aria-hidden="true">+</span></button>`).join('')}</div>`
    + (d.components.length ? d.components.map((c, i) => componentEditor(c, i, d, ctx, org, errors)).join('') : '<div class="builder-empty">No components yet. Choose one above.</div>');
  if (d.step === 3) {
    if (!d.id) body = `<div class="builder-team-start">${u.icon('people')}<div><h3>Invite your team when ready</h3><p>Save this private draft to invite staff and create groups.</p>${u.button('Save draft to invite', 'initiative-ensure', {}, 'button secondary small')}</div></div>`;
    else {
      const staff = staffFor(ctx.s, d.id), groups = ctx.s.groups.filter(g => g.parentType === 'initiative' && g.initiativeId === d.id);
      const teamCard = (title, count, icon, role) => `<section class="builder-team-card">${u.icon(icon)}<div><h3>${title}</h3><p>${count} active</p></div>${u.button(`Invite ${role === 'coach' ? 'Coach' : 'Supervisor'}`, 'staff-invite', {role, initiative:d.id}, 'button quiet small')}</section>`;
      body = `<div class="builder-team-grid">${teamCard('Supervisors', staff.supervisors.length, 'shield', 'supervisor')}${teamCard('Coaches', staff.coaches.length, 'people', 'coach')}</div>`
        + (staff.invites.length ? section('Invitations', `<ul class="iw-mini-list">${staff.invites.map(x => `<li><span>${u.esc(x.email)} · ${x.role === 'coach' ? 'Coach' : 'Supervisor'}</span><span class="iw-pill is-${x.effectiveStatus === 'Accepted' ? 'positive' : x.effectiveStatus === 'Pending' ? 'attention' : 'critical'}">${u.esc(x.effectiveStatus)}</span><span class="actions">${x.effectiveStatus === 'Pending' ? u.button('Copy link', 'staff-copy', {token:x.token}, 'button quiet small') + u.button('Cancel', 'staff-cancel', {id:x.id}, 'button quiet small') : x.effectiveStatus === 'Expired' ? u.button('Resend', 'staff-resend', {id:x.id}, 'button quiet small') : ''}</span></li>`).join('')}</ul>`) : '')
        + (staff.supervisors.length && d.components.some(c => c.type === 'Session' && c.resourceId) ? section('Session duty', d.components.map((c,i)=>({c,i})).filter(({c})=>c.type==='Session'&&c.resourceId).map(({c,i})=>`<div class="builder-duty"><strong>${u.esc(c.title)}</strong><div class="builder-chips">${staff.supervisors.map(g=>u.checkbox(`duty-${i}`,g.name,(c.supervisorIds||[]).includes(g.personId),g.personId)).join('')}</div></div>`).join('')) : '')
        + section('Groups', `${groups.length ? `<ul class="iw-mini-list">${groups.map(g => `<li><span>${u.esc(g.name)}</span><label class="iw-inline"><span class="sr-only">Coach</span><select data-action="group-coach" data-group="${u.esc(g.id)}"><option value="">No Coach yet</option>${activeGrantsFor(ctx.s, d.id, 'coach').map(c => `<option value="${u.esc(c.personId)}" ${c.personId === g.coachId ? 'selected' : ''}>${u.esc(ctx.s.people.find(p => p.id === c.personId)?.name)}</option>`).join('')}</select></label></li>`).join('')}</ul>` : '<p class="iw-muted">Create groups after students are admitted.</p>'}${u.button('Add group', 'group-create', {initiative:d.id}, 'button quiet small')}`);
    }
  }
  if (d.step === 4) body = section('Admission & seats', `<p class="static-info">${u.esc(d.policies.admission)}</p>${u.checkbox('waitlist', 'Waiting list when seats are full', d.policies.waitlist !== false)}<div class="builder-offer"><div class="builder-offer-title"><strong>Offer hold time</strong><details class="builder-help"><summary aria-label="How seat offers work">?</summary><p>When a student leaves, the next person on the waiting list receives the available seat offer immediately. The hold time is how long they have to accept before it moves to the next person.</p></details></div><div class="builder-offer-controls">${field('offerHours', 'Hours to accept', d.policies.offerHours || 24, {type:'number', extra:`min="1" max="168" ${d.policies.offerManual ? 'disabled' : ''}`})}<label class="builder-offer-manual"><input type="checkbox" name="offerManual" ${d.policies.offerManual ? 'checked' : ''}><span>I’ll decide when an offer ends</span></label></div></div>`)
    + section('Conduct & attendance', `${area('discipline', 'Participant disciplinary policy', d.policies.discipline)}${area('attendance', 'Attendance rule', d.policies.attendance)}${area('excuse', 'Absence & excuse rule', d.policies.excuse)}${area('makeup', 'Make-up / waiver rule', d.policies.makeup, {hint:'Leave “Not configured” unless you publish an explicit rule. An accepted excuse never counts as attendance.'})}`)
    + section('Completion, privacy & notices', `${area('completion', 'Completion criteria', d.policies.completion, {required:true, errors, hint:'Published before enrollment. Check-in or an accepted excuse alone never implies completion.'})}${area('privacy', 'Privacy & safety', d.policies.privacy)}${area('notifications', 'Participant notifications', d.policies.notifications)}`);
  if (d.step === 5) {
    const blockers = publishBlockers(ctx.s, {...d, status:'Draft'});
    const warnings = [];
    if (!d.id || !activeGrantsFor(ctx.s, d.id, 'supervisor').length) warnings.push('No active Supervisor yet — publishing is fine; attendance-bearing sessions will show “Needs Supervisor”.');
    if (!d.id || !activeGrantsFor(ctx.s, d.id, 'coach').length) warnings.push('No active Coach yet — structured group tasks start once a Coach accepts.');
    if (d.cost?.type === 'Paid') warnings.push('Paid: participants see a simulated-payment disclosure. No payment is processed.');
    body = `${blockers.length ? `<div class="iw-banner is-critical">${u.icon('shield')}<div><strong>${blockers.length} thing${blockers.length === 1 ? '' : 's'} to fix before publishing</strong><ul class="builder-blockers">${blockers.map(b => `<li><button type="button" data-action="builder-goto" data-step="${b.step}">${u.esc(STEPS[b.step])}</button> ${u.esc(b.message)}</li>`).join('')}</ul></div></div>` : `<div class="iw-banner is-positive">${u.icon('check')}<div><strong>Ready to publish.</strong><p>It will appear in the regular Explore page immediately — no per-initiative Admin approval.</p></div></div>`}
      ${warnings.length ? `<div class="iw-banner is-warning">${u.icon('shield')}<div><strong>Operational warnings (not blockers)</strong><ul>${warnings.map(w => `<li>${u.esc(w)}</li>`).join('')}</ul></div></div>` : ''}
      <h3>Exactly what Individuals will see</h3>${publicPreview(org, d)}
      <h3>Components</h3><ol class="iw-components">${d.components.map(c => `<li><span class="iw-comp-type">${u.esc(c.type)}</span><strong>${u.esc(c.title || `New ${c.type}`)}</strong>${c.planned ? '<small>Planned · details can be added after publishing</small>' : ['Session','Workshop'].includes(c.type) ? `<small>${u.esc(u.date(c.date))} · ${u.esc(c.time)}–${u.esc(c.endTime)} · ${u.esc(c.format || 'Online')}</small>` : ''}</li>`).join('') || '<li>None</li>'}</ol>`;
  }
  const config = {
    kind:'initiative', command:'organization.initiative', title:existing ? `Continue: ${existing.title}` : 'Create an initiative.', eyebrow:`INITIATIVE BUILDER · ${deliveryLabel(d.deliveryMode).toUpperCase()}`, description:'Draft saves at every stage. The last stage previews exactly what Individuals will see in Explore.', listPath:'organization/initiatives', steps:STEPS, stepNotes:NOTES, jump:true, layoutClass:'is-initiative',
    stepIntro:['Name the initiative, its purpose and its dates.', 'Who it is for, how people take part and how many seats.', 'Add component cards now; complete their details when ready.', 'Invite Supervisors and Coaches by email, then shape internal groups.', 'The published rules every applicant agrees to.', 'Check what Individuals will see, fix any blockers, then publish.'],
    banner:draft => `<div class="builder-banner">${scene(sceneKey('initiative', draft.deliveryMode), {size:'band'})}<div><span class="ds-chip is-neutral"><i aria-hidden="true"></i>${u.esc(deliveryLabel(draft.deliveryMode))} initiative</span><p>${u.esc(DELIVERY_MODES.find(m => m[0] === draft.deliveryMode)?.[2] || '')}</p></div></div>`,
    preview:draft => publicPreview(org, draft),
    publishedMessage:'Published. It is now visible in the regular Explore page.',
    validate(draft, step) { return step === 2 ? [] : publishBlockers(ctx.s, {...draft, status:'Draft'}).filter(e => e.step === step).map(e => e.message); },
    publishDisabled:draft => publishBlockers(ctx.s, {...draft, status:'Draft'}).length > 0,
    capture(d, v, f) {
      if (d.step === 0) { for (const k of ['title','objective','summary','description','start','end','timezone']) d[k] = v[k] ?? d[k]; if (v.topic !== undefined) d.topic = v.topic === 'Other' ? (v.topicOther?.trim() || 'Other') : v.topic; d.cover = {image:v.coverImage || '', alt:v.coverAlt || ''}; }
      if (d.step === 1) { for (const k of ['audience','requirements','consent','country','venue','address','mapCenter','platform','platformOther','linkPolicy','onlineDetails','captions','attendanceMethod','registrationOpen','registrationClose','withdrawal']) if (v[k] !== undefined) d[k] = v[k]; if (v.country === 'Other') d.countryOther = v.countryOther || ''; d.minAge = v.minAge === '' ? '' : Number(v.minAge); d.maxAge = v.maxAge === '' ? '' : Number(v.maxAge); d.capacity = Number(v.capacity); if (DELIVERY_MODES.some(m => m[0] === v.deliveryMode)) d.deliveryMode = v.deliveryMode; d.modes = modesFor(d.deliveryMode); d.primaryMode = d.deliveryMode; d.cost = {type:'Free', price:0, currency:'JOD'}; }
      if (d.step === 2) d.components = d.components.map((c, i) => { if (!c.expanded) return c; const next = {...c, planned:!f.elements[`ready-${i}`]?.checked, title:v[`title-${i}`] ?? c.title, description:v[`description-${i}`] ?? c.description}; if (['Session','Workshop'].includes(c.type)) Object.assign(next, {date:v[`date-${i}`] ?? c.date, format:v[`format-${i}`] ?? c.format, time:v[`time-${i}`] ?? c.time, endTime:v[`endTime-${i}`] ?? c.endTime, venue:v[`venue-${i}`] ?? c.venue, address:v[`address-${i}`] ?? c.address, mapCenter:v[`mapCenter-${i}`] ?? c.mapCenter, meeting:v[`meeting-${i}`] ?? c.meeting, platform:v[`platform-${i}`] ?? c.platform, capacity:Number(v[`capacity-${i}`] || c.capacity || 30), attendanceRequired:f.elements[`attendance-${i}`]?.checked !== false, publish:f.elements[`publish-${i}`]?.checked !== false}); if (['Mentor Program','Competition','Outdoor Activity'].includes(c.type)) {next.resourceId = v[`resource-${i}`] ?? c.resourceId ?? ''; const source = c.type === 'Mentor Program' ? ctx.s.programs : c.type === 'Competition' ? ctx.s.competitions : ctx.s.experiences; if (!next.title?.trim()) next.title = source.find(x => x.id === next.resourceId)?.title || ''; } if(c.type === 'Survey or Quiz') next.purpose = v[`purpose-${i}`] ?? c.purpose; return next; });
      if (d.step === 3) d.components = d.components.map((c, i) => c.type === 'Session' && f.querySelector(`[name="duty-${i}"]`) ? {...c, supervisorIds:parseChecks(f, `duty-${i}`)} : c);
      if (d.step === 4) { d.policies = {...d.policies, waitlist:f.elements.waitlist?.checked, offerManual:f.elements.offerManual?.checked || false, offerHours:Number(v.offerHours || 24), discipline:v.discipline, attendance:v.attendance, excuse:v.excuse, makeup:v.makeup, completion:v.completion, privacy:v.privacy, notifications:v.notifications}; d.completion = v.completion; }
    },
    itemAction(a, t, d, ctx) {
      if (a === 'builder-component-add') { const type = t.dataset.type; if (!COMPONENTS.some(([value]) => value === type)) return true; d.components.push({id:id('component'), type, kind:type, title:'', description:'', format:sessionFormats(d.deliveryMode)[0], planned:true, publish:true, attendanceRequired:true, expanded:false}); return true; }
      if (a === 'builder-component-toggle') { const c=d.components[Number(t.dataset.index)]; if(c)c.expanded=!c.expanded; return true; }
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
