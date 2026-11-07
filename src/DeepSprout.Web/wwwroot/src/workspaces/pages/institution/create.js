/**
 * “Create New” — the start of an Institution's creation journey.
 *
 * Two top-level choices: an Initiative (then Online / Hybrid / Face-to-Face)
 * or an Outdoor Activity (then the kind of experience). A layered SVG scene
 * crossfades between four compositions that echo the choice; it sits above
 * the controls, never behind form text, and is still under reduced motion.
 * Selection updates the DOM in place (no re-render) so the transition is
 * continuous; the chosen path is remembered for this visit.
 */
import * as u from '../../ui.js';
import {DELIVERY_MODES} from '../../commands/institution.js';
import {ACTIVITY_KINDS} from '../../activity-rules.js';
import {representativeOrg} from '../../initiative-rules.js';

const esc = u.esc;
export const sceneKey = (type, mode) => !type ? 'neutral' : type === 'activity' ? 'outdoor' : mode === 'Online' ? 'online' : mode === 'In-person' ? 'inperson' : mode === 'Hybrid' ? 'hybrid' : 'neutral';

/** One SVG, four compositions. `data-scene` on the wrapper chooses which layer is visible. */
export function scene(key = 'neutral', {size = 'hero', label = ''} = {}) {
  const people = (cx, cy, r, n, cls) => Array.from({length:n}, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .55; return `<g class="${cls}" style="--d:${i * .35}s"><circle cx="${x.toFixed(1)}" cy="${(y - 11).toFixed(1)}" r="6.5"/><path d="M${(x - 10).toFixed(1)} ${(y + 9).toFixed(1)}c0-8 4.5-12 10-12s10 4 10 12Z"/></g>`; }).join('');
  const nodes = [[468,70],[540,46],[612,92],[560,134],[650,150],[700,76],[498,150]];
  const links = [[0,1],[1,2],[2,3],[3,0],[2,4],[2,5],[3,6],[0,6],[4,5]];
  return `<div class="ds-scene is-${size}" data-scene="${esc(key)}" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}><svg viewBox="0 0 800 240" preserveAspectRatio="xMidYMid slice" focusable="false">
    <defs><linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sc-sky-top"/><stop offset="1" class="sc-sky-bottom"/></linearGradient><radialGradient id="sc-glow" cx=".72" cy=".38" r=".5"><stop offset="0" stop-color="#fff9e6" stop-opacity=".95"/><stop offset="1" stop-color="#fff9e6" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="240" fill="url(#sc-sky)"/><rect width="800" height="240" fill="url(#sc-glow)" class="sc-glow"/>
    <g class="sc-base"><path class="sc-blob a" d="M-20 196c88-46 176-58 266-30s158 22 238-14 164-28 336 12v90H-20Z"/><path class="sc-blob b" d="M-20 214c120-26 228-22 330 4s206 18 300-10 140-6 210 8v40H-20Z"/></g>
    <g class="sc-layer sc-neutral"><g class="sc-sprout"><path d="M560 196V118"/><path class="leaf" d="M560 150c-34 0-52-20-46-44 28 2 46 18 46 44Z"/><path class="leaf r" d="M561 134c32-4 48-26 40-48-26 6-40 22-40 48Z"/></g></g>
    <g class="sc-layer sc-online">
      <g class="sc-links">${links.map(([a, b], i) => `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" style="--d:${i * .4}s"/>`).join('')}</g>
      <g class="sc-nodes">${nodes.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 2 ? 9 : 5.5}" style="--d:${i * .5}s"/>`).join('')}</g>
      <g class="sc-screens"><g class="sc-float" style="--d:0s"><rect x="372" y="88" width="64" height="44" rx="7"/><circle cx="404" cy="104" r="6"/><path d="M392 124c3-7 7-9 12-9s9 2 12 9"/></g><g class="sc-float" style="--d:1.6s"><rect x="676" y="118" width="58" height="40" rx="7"/><circle cx="705" cy="133" r="5.5"/><path d="M694 151c2-6 6-8 11-8s9 2 11 8"/></g></g>
      <g class="sc-pulse"><circle cx="612" cy="92" r="9"/></g>
    </g>
    <g class="sc-layer sc-inperson">
      <g class="sc-branch"><path d="M342 210c22-58 66-96 128-108"/><path class="leaf" d="M392 150c-18-12-20-30-8-42 14 10 16 26 8 42Z"/><path class="leaf" d="M430 122c-4-20 6-34 22-38 4 16-6 32-22 38Z"/><path class="leaf" d="M370 182c-20-4-30-18-26-34 16 4 26 18 26 34Z"/></g>
      <ellipse class="sc-table" cx="590" cy="164" rx="92" ry="22"/>
      ${people(590, 150, 96, 7, 'sc-person')}
      <g class="sc-lamp"><circle cx="590" cy="74" r="22"/></g>
    </g>
    <g class="sc-layer sc-hybrid">
      <g class="sc-links is-hybrid"><path d="M430 96C480 96 500 120 552 122"/><path d="M430 150c46 0 70-18 122-22"/><path d="M628 124c42 0 62-26 104-30"/><path d="M628 128c40 4 64 26 108 26"/></g>
      <g class="sc-screens"><g class="sc-float" style="--d:.4s"><rect x="372" y="74" width="58" height="40" rx="7"/><circle cx="401" cy="89" r="5.5"/><path d="M390 107c2-6 6-8 11-8s9 2 11 8"/></g><g class="sc-float" style="--d:1.8s"><rect x="372" y="132" width="58" height="40" rx="7"/><circle cx="401" cy="147" r="5.5"/><path d="M390 165c2-6 6-8 11-8s9 2 11 8"/></g></g>
      <g class="sc-seed"><circle cx="590" cy="125" r="38"/><path class="leaf" d="M590 140c-16 0-24-10-21-22 13 1 21 9 21 22Z"/><path class="leaf r" d="M591 132c15-2 22-12 18-23-12 3-18 11-18 23Z"/><path d="M590 152v-22"/></g>
      ${people(752, 124, 30, 3, 'sc-person')}
    </g>
    <g class="sc-layer sc-outdoor">
      <circle class="sc-sun" cx="640" cy="70" r="26"/>
      <path class="sc-hill far" d="M300 196c60-62 120-92 190-84s114 44 170 40 98-34 160-28v76H300Z"/>
      <path class="sc-hill mid" d="M280 214c70-40 150-56 230-36s150 28 214 6 76-14 96-10v66H280Z"/>
      <path class="sc-path" d="M520 240c10-24 44-34 40-52s-40-22-26-38 52-12 70-22"/>
      <g class="sc-trees">${[[380,176,1],[408,170,1.25],[436,180,.9],[700,166,1.15],[730,174,.95]].map(([x, y, k], i) => `<g style="--d:${i * .6}s" transform="translate(${x} ${y}) scale(${k})"><path d="M0 0v18"/><path class="crown" d="M0-34c14 10 20 24 14 34H-14c-6-10 0-24 14-34Z"/></g>`).join('')}</g>
      <path class="sc-bird" d="M520 64c6-5 11-5 15 0 4-5 9-5 15 0"/><path class="sc-bird b" d="M566 50c4-4 8-4 11 0 3-4 7-4 11 0"/>
    </g>
  </svg></div>`;
}

const typeCard = (value, title, text, points, glyph, checked) => `<label class="cr-type"><input type="radio" name="create-type" value="${value}" ${checked ? 'checked' : ''}><span class="cr-type-card"><span class="cr-type-mark">${u.icon(glyph)}</span><span class="cr-type-copy"><strong>${esc(title)}</strong><span>${esc(text)}</span></span><ul>${points.map(p => `<li>${u.icon('check')}${esc(p)}</li>`).join('')}</ul><span class="cr-type-check" aria-hidden="true">${u.icon('check')}</span></span></label>`;

export function renderCreate(ctx) {
  const {s, person:p} = ctx, org = representativeOrg(s, p.id), state = ctx.localUI.create ||= {};
  const preset = ctx.route.query.get('type'); if (preset === 'activity' || preset === 'initiative') state.type = preset;
  const type = state.type || '', mode = state.mode || 'Hybrid', kind = state.kind || 'Hike';
  const drafts = [...s.initiatives.filter(i => i.ownerId === org?.id && i.status === 'Draft').map(i => ({title:i.title, sub:`Initiative · ${i.deliveryMode ? DELIVERY_MODES.find(m => m[0] === i.deliveryMode)?.[1] : (i.modes || []).join(' · ')}`, path:`organization/initiatives/${i.id}/edit`, at:i.history?.at(-1)?.at})), ...s.experiences.filter(e => e.ownerId === org?.id && e.status === 'Draft').map(e => ({title:e.title, sub:'Outdoor Activity', path:`organization/activities/${e.id}/edit`, at:e.history?.at(-1)?.at}))];
  const unsaved = Object.entries(s.builderDrafts || {}).filter(([key, d]) => key.startsWith(`${p.id}:`) && /:(initiative|experience):new$/.test(key) && d && (d.title || d.step)).map(([key, d]) => ({title:d.title || 'Untitled draft', sub:`${key.includes(':initiative:') ? 'Initiative' : 'Outdoor Activity'} · unsaved, step ${(d.step || 0) + 1}`, path:key.includes(':initiative:') ? 'organization/initiatives/new' : 'organization/activities/new'}));
  const resume = [...unsaved, ...drafts];
  return `<div class="cr" data-create>
    <p class="breadcrumbs">${u.link('Dashboard', 'organization/dashboard', 'text-link')} / Create new</p>
    <section class="cr-hero iw-reveal">${scene(sceneKey(type, mode), {label:'Illustration that changes with your choice'})}<div class="cr-hero-copy"><p class="eyebrow">${esc(org?.name || 'Your institution')} · CREATE NEW</p><h1>What would you like to bring to life?</h1><p class="ds-lead">Both are published by your verified institution, appear in the regular Explore page, and keep their own applications or bookings.</p></div></section>
    <fieldset class="cr-types iw-reveal"><legend class="sr-only">Choose what to create</legend>
      ${typeCard('initiative', 'Create an Initiative', 'Awareness, education and structured group work — online, hybrid or face-to-face.', ['Applications & admission (max 135 students)','Sessions, forms, competitions & Coach-led groups','Up to three active Supervisors'], 'nodes', type === 'initiative')}
      ${typeCard('activity', 'Create an Outdoor Activity', 'Trips, hikes, camps and outdoor events your institution organizes and supervises.', ['Bookings with capacity & waiting list','Safety, consent and meeting logistics','Supervised check-in and completion'], 'mountain', type === 'activity')}
    </fieldset>
    <section class="cr-next ${type === 'initiative' ? 'is-open' : ''}" data-cr-panel="initiative" ${type === 'initiative' ? '' : 'hidden'}>
      <div class="cr-next-head"><p class="eyebrow">STEP 2 · DELIVERY MODE</p><h2>How will people take part?</h2><p>This sets the initiative’s overall mode. Each session still has its own format inside it.</p></div>
      <div class="cr-modes" role="radiogroup" aria-label="Initiative delivery mode">${DELIVERY_MODES.map(([value, label, text]) => `<label class="cr-mode"><input type="radio" name="create-mode" value="${value}" ${mode === value ? 'checked' : ''}><span><span class="cr-mode-icon">${u.icon(value === 'Online' ? 'globe' : value === 'Hybrid' ? 'hybrid' : 'people')}</span><strong>${esc(label)}</strong><small>${esc(text)}</small><em>${esc(value === 'Online' ? 'You will add: platform and access-link policy' : value === 'Hybrid' ? 'You will add: venue, online access, and which sessions are online or on-site' : 'You will add: venue, address and check-in method')}</em></span></label>`).join('')}</div>
      <div class="cr-go">${u.button('Start the initiative builder', 'create-start', {kind:'initiative'}, 'button primary')}<small>Six stages · saves a private draft at every step</small></div>
    </section>
    <section class="cr-next ${type === 'activity' ? 'is-open' : ''}" data-cr-panel="activity" ${type === 'activity' ? '' : 'hidden'}>
      <div class="cr-next-head"><p class="eyebrow">STEP 2 · KIND OF EXPERIENCE</p><h2>What kind of outdoor experience?</h2><p>Camps have several sessions and are completed by published criteria; the others are single-day experiences.</p></div>
      <div class="cr-kinds" role="radiogroup" aria-label="Kind of Outdoor Activity">${ACTIVITY_KINDS.map(([value, label, text]) => `<label class="cr-kind"><input type="radio" name="create-kind" value="${value}" ${kind === value ? 'checked' : ''}><span><strong>${esc(label)}</strong><small>${esc(text)}</small></span></label>`).join('')}</div>
      <div class="cr-go">${u.button('Start the Outdoor Activity builder', 'create-start', {kind:'activity'}, 'button primary')}<small>Seven stages · location, safety, seats, booking rules and staffing</small></div>
    </section>
    ${resume.length ? `<section class="cr-resume iw-reveal"><h2>Continue where you left off</h2><ul>${resume.slice(0, 6).map(r => `<li><a href="${u.href(r.path)}"><span>${u.icon('edit')}</span><span><strong>${esc(r.title || 'Untitled draft')}</strong><small>${esc(r.sub)}${r.at ? ` · saved ${esc(u.date(r.at))}` : ''}</small></span>${u.icon('arrow')}</a></li>`).join('')}</ul></section>` : ''}
  </div>`;
}

/** In-place updates: scene crossfade and progressive disclosure without re-rendering. */
export function createChange(target, ctx) {
  if (!['create-type', 'create-mode', 'create-kind'].includes(target.name)) return false;
  const state = ctx.localUI.create ||= {}, root = document.querySelector('[data-create]');
  const position = state.beforeChoiceScroll ?? window.scrollY;
  delete state.beforeChoiceScroll;
  if (target.name === 'create-type') state.type = target.value;
  if (target.name === 'create-mode') state.mode = target.value;
  if (target.name === 'create-kind') state.kind = target.value;
  const key = sceneKey(state.type, state.mode || 'Hybrid');
  root.querySelector('.ds-scene')?.setAttribute('data-scene', key);
  for (const panel of root.querySelectorAll('[data-cr-panel]')) {
    const open = panel.dataset.crPanel === state.type;
    if (open && panel.hidden) { panel.hidden = false; requestAnimationFrame(() => panel.classList.add('is-open')); }
    if (!open) { panel.classList.remove('is-open'); panel.hidden = true; }
  }
  requestAnimationFrame(() => window.scrollTo({top:position, behavior:'instant'}));
  setTimeout(() => window.scrollTo({top:position, behavior:'instant'}), 0);
  return true;
}
export function createAction(action, target, ctx) {
  if (action !== 'create-start') return false;
  const state = ctx.localUI.create || {};
  if (target.dataset.kind === 'initiative') ctx.go(`organization/initiatives/new?mode=${encodeURIComponent(state.mode || 'Hybrid')}`);
  else ctx.go(`organization/activities/new?kind=${encodeURIComponent(state.kind || 'Hike')}`);
  return true;
}
