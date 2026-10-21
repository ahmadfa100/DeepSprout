import {glyphSvg} from './glyphs.js';

const steps = active => `<span class="entry-steps" aria-hidden="true">${[1, 2, 3].map(i => `<i${i === active ? ' class="is-on"' : ''}></i>`).join('')}</span>`;
export const kicker = (number, label) => `<div class="entry-kicker"><span class="entry-number">${number}</span><span class="entry-label">${label}</span>${steps(Number(number))}</div>`;
const notes = {individual: 'Your beginning. Your pace.', partner: 'Next, choose Mentor, Institution or Outdoor Provider.'};

export function choiceMarkup(partnerBase) {
 return `<div class="register-choice-content">
 ${kicker('01', 'Your next chapter')}
 <h1 class="entry-title" tabindex="-1">Where would you<br>like to grow?</h1>
 <p class="entry-intro">A personal journey or a shared purpose. <br>There’s a place for you here.</p>
 <div class="path-options" role="group" aria-label="Choose your registration path">
 ${[['individual', 'Join as Individual', 'Personal journey, activities, community and experiences.'], ['partner', 'Join as a Partner', 'Lead programs, represent an institution or organize experiences.']].map(([key, title, desc]) => `<button type="button" class="path-card" data-path="${key}" aria-pressed="${key === 'individual'}"><span class="path-icon">${glyphSvg(key)}</span><span class="path-copy"><strong>${title}</strong><span>${desc}</span></span><span class="path-check" aria-hidden="true">${glyphSvg('check')}</span></button>`).join('')}
 </div><button type="button" class="entry-continue" data-entry-continue><span data-entry-label>Continue as Individual</span>${glyphSvg('arrow', 'entry-arrow')}</button>
 <p class="entry-note" data-entry-note aria-live="polite">${notes.individual}</p></div>
 <div class="register-partner-content" hidden><button type="button" class="entry-back" data-entry-back>${glyphSvg('arrow', 'entry-back-arrow')}Change your path</button>${kicker('02', 'Growing together')}<h1 class="entry-title" tabindex="-1">Good things grow<br>through connection.</h1><p class="entry-intro">How would you like to contribute?</p><div class="partner-paths">
 ${[['mentor', 'Mentor / Coach', 'Guide people. Encourage possibility.'], ['organization', 'Institution Representative', 'Bring your community together.'], ['provider', 'Outdoor Provider', 'Create experiences beyond the screen.']].map(([key, title, desc]) => `<a class="path-card partner-path" href="${partnerBase}${key}" data-partner-path="${key}"><span class="path-icon">${glyphSvg(key)}</span><span class="path-copy"><strong>${title}</strong><span>${desc}</span></span>${glyphSvg('arrow', 'path-go')}</a>`).join('')}
 </div><p class="entry-note">Already invited? <a href="${partnerBase.replace('account/', 'institution-invitation')}">Use your institution invitation</a></p></div>`;
}

export function bindChoices(root, world, {individual, partner, back, initial = 'individual'} = {}) {
 const abort = new AbortController(), opts = {signal: abort.signal};
 let selected = initial;
 const centre = el => {const r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2};};
 const select = (mode, card) => {
  selected = mode;
  root.querySelectorAll('[data-path]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.path === mode)));
  root.querySelector('[data-entry-label]').textContent = `Continue as ${mode === 'partner' ? 'Partner' : 'Individual'}`;
  root.querySelector('[data-entry-note]').textContent = notes[mode];
  const changed = world.setMode(mode, card ? {origin: centre(card)} : {});
  // Re-choosing the current path still answers, with a small local impulse.
  if (card && changed === false) world.signal('selection', 0, centre(card));
 };
 root.addEventListener('click', e => {
  const card = e.target.closest('[data-path]');
  if (card) select(card.dataset.path, card);
  if (e.target.closest('[data-entry-continue]')) {world.signal('advance', 0, centre(e.target.closest('[data-entry-continue]'))); (selected === 'individual' ? individual : partner)?.();}
  if (e.target.closest('[data-entry-back]')) back?.();
 }, opts);
 root.addEventListener('focusin', e => {const card = e.target.closest('.path-card'); if (card) world.signal('card-focus', 2, centre(card));}, opts);
 root.querySelectorAll('.path-card').forEach(card => card.addEventListener('pointerenter', e => {if (e.pointerType === 'mouse') world.signal('card-hover', 2, centre(card));}, opts));
 select(selected);
 return () => abort.abort();
}
