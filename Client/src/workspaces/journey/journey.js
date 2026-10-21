/**
 * Admin → System Journey: an illustrative, viewer-paced walkthrough of how
 * DeepSprout's workspaces connect. Nothing here dispatches a store command;
 * every event is a simulated explanation drawn from journey-data.js. Controls
 * bind their own listeners (no data-action), so the workspace app never
 * re-renders mid-animation. The current step lives in localUI and the URL
 * query (replaceState, no hashchange).
 */
import { esc } from '../ui.js';
import { labels as workspaceLabels, navigation } from '../navigation.js';
import { createScene, GLYPHS } from './journey-scene.js';
import { buildJourney } from './journey-data.js';

const MODES = { overview: 'Overview', detailed: 'Detailed journey' };
const PAGE_FILES = {
  'index.html': 'Individual Home', 'explore.html': 'Individual Explore', 'garden.html': 'Personal Garden', 'training.html': 'Activities',
  'lab.html': 'Lab', 'insights.html': 'Insights', 'recovery-plan.html': 'Recovery Plan', 'weekly-review.html': 'Weekly Review',
  'shield.html': 'Digital Shield', 'community.html': 'Community', 'profile.html': 'Profile', 'register.html': 'Register',
  'login.html': 'Login', 'onboarding.html': 'Onboarding', 'join.html': 'Invitation', 'partners.html': 'Partner entry', 'pricing.html': 'Pricing',
  'src/pages/member/onboarding/starting-point.html': 'Your Starting Point'
};
const NOTE_ICON = { event: '!', info: 'i', caution: '!', exception: '×' };
const NOTE_LABEL = { event: 'Event', info: 'Information', caution: 'Rule', exception: 'Exception' };

let controller = null;

const journeyState = ctx => (ctx.localUI.journey ??= { mode: 'overview', stepId: null, visited: [] });

export function render(ctx) {
  const journey = buildJourney(ctx.s);
  const state = journeyState(ctx);
  const query = ctx.route.query;
  if (MODES[query.get('mode')]) state.mode = query.get('mode');
  if (journey.byId.has(query.get('step'))) state.stepId = query.get('step');
  return `<section class="jn" id="journey" aria-labelledby="jn-title" data-journey>
  <header class="jn-head">
    <div class="jn-head-copy">
      <p class="eyebrow">System journey · illustrative walkthrough</p>
      <h1 id="jn-title">How DeepSprout Works</h1>
      <p class="jn-subtitle">Explore how people, institutions, coaches, supervisors, and experiences connect across DeepSprout.</p>
    </div>
    <div class="jn-head-controls">
      <div class="jn-mode" role="group" aria-label="Presentation mode">
        ${Object.entries(MODES).map(([key, label]) => `<button type="button" class="jn-mode-option" data-jn-mode="${key}" aria-pressed="${state.mode === key}">${esc(label)}</button>`).join('')}
      </div>
      <button type="button" class="jn-restart" data-jn-restart><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5"/></svg>Restart journey</button>
    </div>
  </header>
  <nav class="jn-chapters" aria-label="Journey chapters"><ol>${journey.chapters.map(c => `<li><button type="button" data-jn-chapter="${esc(c.id)}"><span class="jn-chapter-n">${c.n}</span><span>${esc(c.short)}</span></button></li>`).join('')}</ol></nav>
  <div class="jn-stage">
    <div class="jn-canvas">
      <p class="jn-where"><span class="jn-where-chapter"></span><span class="jn-where-step"></span></p>
      <svg class="jn-svg" role="img" aria-labelledby="jn-svg-title" focusable="false"><title id="jn-svg-title">Journey illustration</title></svg>
    </div>
    <aside class="jn-rail" aria-label="Event note">
      <div class="jn-note" hidden></div>
      <button type="button" class="jn-note-reopen" hidden>Show note</button>
    </aside>
  </div>
  <div class="jn-explain">
    <div class="jn-copy">
      <p class="jn-count"></p>
      <h2 class="jn-step-title" tabindex="-1"></h2>
      <p class="jn-summary"></p>
      <div class="jn-copy-foot"><span class="jn-tags"></span><button type="button" class="jn-details-open" aria-haspopup="dialog">View details<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>
    </div>
    <div class="jn-nav">
      <button type="button" class="jn-arrow" data-jn-step="-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
      <ol class="jn-dots" aria-label="Steps in this chapter"></ol>
      <button type="button" class="jn-arrow is-next" data-jn-step="1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
    </div>
  </div>
  <p class="jn-boundary"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${GLYPHS.shield}"/></svg><span>Illustrative walkthrough of the approved target system. Nothing on this page sends invitations, approves people, books seats or changes any record. Email, OTP, payment, QR security and the demo clock are simulated in Phase 1.</span></p>
  <p class="sr-only" aria-live="polite" data-jn-live></p>
  <p class="sr-only" aria-live="polite" data-jn-live-note></p>
  <dialog class="jn-drawer" aria-labelledby="jn-drawer-title"><div class="jn-drawer-body"></div></dialog>
</section>`;
}

export function mount(ctx) {
  unmount();
  const root = document.querySelector('[data-journey]');
  if (!root) return;
  const journey = buildJourney(ctx.s);
  const state = journeyState(ctx);
  const $ = selector => root.querySelector(selector);
  const svg = $('.jn-svg'), note = $('.jn-note'), reopen = $('.jn-note-reopen'), drawer = $('.jn-drawer'), live = $('[data-jn-live]'), liveNote = $('[data-jn-live-note]');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const listFor = mode => journey.steps.filter(step => mode === 'detailed' || step.overview);
  let list = listFor(state.mode);
  let index = Math.max(0, list.findIndex(step => step.id === state.stepId));
  let noteDismissed = false, viewKey = '';

  const scene = createScene(svg, {
    reducedMotion: reduced,
    onEvent: shown => { if (shown.id === list[index]?.id) showNote(list[index]); }
  });

  /* ---------------------------------------------------------- view box */

  // Desktop keeps one fixed stage; narrow screens fit each chapter's cast so figures stay legible.
  function fitView() {
    const step = list[index], width = svg.clientWidth || 1;
    const narrow = width < 640;
    const box = narrow ? journey.bounds(step.chapter) : { x: 0, w: 1000 };
    const key = `${box.x}:${box.w}`;
    // Narrow screens get a little headroom for the larger status chips.
    if (key !== viewKey) { viewKey = key; svg.setAttribute('viewBox', narrow ? `${box.x} -64 ${box.w} 690` : `${box.x} 0 ${box.w} 560`); }
    scene.setScale(box.w / width);
  }

  /* --------------------------------------------------------------- note */

  function showNote(step) {
    if (!step.note) { note.hidden = true; reopen.hidden = true; return; }
    if (noteDismissed) { note.hidden = true; reopen.hidden = false; return; }
    const kind = step.note.kind || 'info';
    note.className = `jn-note is-${kind}`;
    note.innerHTML = `<p class="jn-note-kind"><span class="jn-note-icon" aria-hidden="true">${NOTE_ICON[kind]}</span>${esc(NOTE_LABEL[kind])}</p>
      <h3>${esc(step.note.title)}</h3><p>${esc(step.note.text)}</p>
      <p class="jn-note-foot">${step.simulated ? 'Simulated event' : 'Illustrative event'} · not a real record</p>
      <button type="button" class="jn-note-close" aria-label="Dismiss note: ${esc(step.note.title)}">×</button>`;
    note.hidden = false;
    reopen.hidden = true;
    note.classList.toggle('is-static', reduced());
    // The event itself is announced once it happens, after the step title.
    liveNote.textContent = `${NOTE_LABEL[kind]}: ${step.note.title}. ${step.note.text}`;
  }

  /* ---------------------------------------------------------- step view */

  function paint() {
    const step = list[index], chapter = journey.chapterOf(step), inChapter = list.filter(s => s.chapter === step.chapter), position = inChapter.indexOf(step);
    $('.jn-where-chapter').textContent = `Chapter ${chapter.n} · ${chapter.title}`;
    $('.jn-where-step').textContent = `Step ${position + 1} of ${inChapter.length}`;
    $('.jn-count').textContent = `${MODES[state.mode]} · step ${index + 1} of ${list.length}`;
    $('.jn-step-title').textContent = step.title;
    $('.jn-summary').textContent = state.mode === 'overview' && step.brief ? step.brief : step.summary;
    $('.jn-tags').innerHTML = `<span class="jn-tag">Target workflow</span>${step.simulated ? '<span class="jn-tag is-sim">Simulated in Phase 1</span>' : ''}`;
    $('#jn-svg-title').textContent = `${step.title}. ${step.alt}`;
    root.querySelectorAll('[data-jn-chapter]').forEach(button => {
      const here = button.dataset.jnChapter === step.chapter;
      button.toggleAttribute('aria-current', here);
      if (here) button.setAttribute('aria-current', 'step');
      button.classList.toggle('is-seen', journey.steps.some(s => s.chapter === button.dataset.jnChapter && state.visited.includes(s.id)));
    });
    root.querySelectorAll('[data-jn-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.jnMode === state.mode)));
    $('.jn-dots').innerHTML = inChapter.map((s, i) => `<li><button type="button" data-jn-goto="${esc(s.id)}" class="${s === step ? 'is-current' : state.visited.includes(s.id) ? 'is-seen' : ''}" aria-label="Step ${i + 1}: ${esc(s.title)}${state.visited.includes(s.id) ? ' (explored)' : ''}" ${s === step ? 'aria-current="step"' : ''}></button></li>`).join('');
    const prev = $('[data-jn-step="-1"]'), next = $('[data-jn-step="1"]');
    const focused = document.activeElement;
    prev.disabled = index === 0;
    next.disabled = index === list.length - 1;
    // A disabled button drops focus to <body>; hand it to the other arrow so arrow keys keep working.
    if (focused === next && next.disabled) prev.focus();
    else if (focused === prev && prev.disabled) next.focus();
    prev.setAttribute('aria-label', index ? `Previous step: ${list[index - 1].title}` : 'Previous step');
    next.setAttribute('aria-label', index < list.length - 1 ? `Next step: ${list[index + 1].title}` : 'End of the journey');
  }

  function persist() {
    const step = list[index];
    state.stepId = step.id;
    if (!state.visited.includes(step.id)) state.visited.push(step.id);
    const url = `#/admin/system-journey?mode=${state.mode}&step=${encodeURIComponent(step.id)}`;
    if (location.hash !== url) history.replaceState(history.state, '', url);
  }

  function go(nextIndex, { animate = true, announce = true } = {}) {
    if (nextIndex < 0 || nextIndex >= list.length) return;
    const direction = Math.sign(nextIndex - index) || 1;
    const chapterChanged = list[nextIndex].chapter !== list[index]?.chapter;
    index = nextIndex;
    noteDismissed = false;
    note.hidden = true;
    reopen.hidden = true;
    liveNote.textContent = '';
    persist();
    paint();
    if (chapterChanged) fitView();
    scene.show(list[index].scene, { animate, flows: direction > 0 });
    if (announce) live.textContent = `${list[index].title}. ${$('.jn-summary').textContent}`;
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    const current = list[index];
    state.mode = mode;
    list = listFor(mode);
    let target = list.indexOf(current);
    if (target < 0) {
      // Nearest earlier overview step in the same chapter, else the chapter's first.
      const before = journey.steps.slice(0, journey.steps.indexOf(current)).reverse().find(s => s.chapter === current.chapter && list.includes(s));
      target = list.indexOf(before || list.find(s => s.chapter === current.chapter) || list[0]);
    }
    index = -1;
    go(target, { animate: false });
  }

  /* ------------------------------------------------------------- drawer */

  function where(path) {
    if (PAGE_FILES[path]) return `<li><span class="jn-where-label">${esc(PAGE_FILES[path])}</span><code>${esc(path)}</code></li>`;
    const [area, page] = path.split('/');
    const label = `${workspaceLabels[area] || area} workspace · ${(navigation[area] || []).find(item => item[0] === page)?.[2] || page}`;
    // Only Admin destinations are links: this viewer is authorized there and nowhere else.
    if (area === 'admin') return `<li><a class="jn-where-label" href="#/${esc(path)}">${esc(label)}</a><code>#/${esc(path)}</code></li>`;
    return `<li><span class="jn-where-label">${esc(label)}</span><code>#/${esc(path)}</code></li>`;
  }

  function openDetails() {
    const step = list[index], chapter = journey.chapterOf(step), d = step.details;
    const list_ = items => `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
    const block = (title, body) => body ? `<section><h3>${esc(title)}</h3>${body}</section>` : '';
    $('.jn-drawer-body').innerHTML = `<header class="jn-drawer-head">
        <div><p class="eyebrow">Chapter ${chapter.n} · ${esc(chapter.title)}</p><h2 id="jn-drawer-title">${esc(step.title)}</h2>
        <p class="jn-drawer-tags"><span class="jn-tag">Target workflow</span>${step.simulated ? '<span class="jn-tag is-sim">Simulated in Phase 1</span>' : ''}</p></div>
        <button type="button" class="jn-drawer-close" aria-label="Close details and return to the illustration">×</button>
      </header>
      ${block('What happened?', `<p>${esc(d.what)}</p>`)}
      ${block('Who performed it?', d.who && `<p>${esc(d.who)}</p>`)}
      ${block('What changed?', d.changed && `<p>${esc(d.changed)}</p>`)}
      ${block('Who can see the result?', d.visible && `<p>${esc(d.visible)}</p>`)}
      ${block('What are the rules?', d.rules?.length && list_(d.rules))}
      ${block('What if it fails?', d.fails?.length && list_(d.fails))}
      ${step.simulated ? block('In this static demo', `<p>${esc(step.simulated)}</p>`) : ''}
      ${block('Where does this appear?', d.where?.length && `<ul class="jn-where-list">${d.where.map(where).join('')}</ul><p class="jn-small">Only Admin destinations are linked; the others belong to workspaces this identity is not authorized to open.</p>`)}
      <section class="jn-refs"><h3>Specification</h3><p>${step.spec.map(esc).join(' · ')}${step.scenarios.length ? ` · Acceptance scenario${step.scenarios.length > 1 ? 's' : ''} ${step.scenarios.map(esc).join(', ')} (§25)` : ''}</p></section>`;
    drawer.showModal();
    drawer.querySelector('.jn-drawer-close').focus();
  }

  /* ------------------------------------------------------------ binding */

  const onClick = event => {
    const target = event.target.closest('button, a');
    if (!target || !root.contains(target)) return;
    if (target.matches('[data-jn-step]')) { scene.finish(); go(index + Number(target.dataset.jnStep)); }
    else if (target.matches('[data-jn-goto]')) { const i = list.findIndex(s => s.id === target.dataset.jnGoto); if (i !== index) go(i, { animate: i > index }); }
    else if (target.matches('[data-jn-chapter]')) { const i = list.findIndex(s => s.chapter === target.dataset.jnChapter); if (i >= 0 && i !== index) go(i); }
    else if (target.matches('[data-jn-mode]')) setMode(target.dataset.jnMode);
    else if (target.matches('[data-jn-restart]')) { state.visited = []; index = -1; go(0); $('.jn-step-title').focus(); }
    else if (target.matches('.jn-details-open')) openDetails();
    else if (target.matches('.jn-note-close')) { noteDismissed = true; note.hidden = true; reopen.hidden = false; reopen.focus(); }
    else if (target.matches('.jn-note-reopen')) { noteDismissed = false; showNote(list[index]); note.querySelector('.jn-note-close')?.focus(); }
    else if (target.matches('.jn-drawer-close')) drawer.close();
  };
  const onKey = event => {
    if (drawer.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, select, textarea, [contenteditable]')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); scene.finish(); go(index + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
  };
  const onDrawerClose = () => $('.jn-details-open').focus();
  const onDrawerClick = event => { if (event.target === drawer) drawer.close(); };
  const resize = new ResizeObserver(() => fitView());

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  drawer.addEventListener('close', onDrawerClose);
  drawer.addEventListener('click', onDrawerClick);
  resize.observe(svg);

  // Restore the current step's final state; nothing replays on a re-render.
  persist();
  paint();
  fitView();
  scene.show(list[index].scene, { animate: false });

  controller = () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKey);
    drawer.removeEventListener('close', onDrawerClose);
    drawer.removeEventListener('click', onDrawerClick);
    resize.disconnect();
    scene.destroy();
    if (drawer.open) drawer.close();
  };
}

export function unmount() {
  if (!controller) return;
  const stop = controller;
  controller = null;
  stop();
}
