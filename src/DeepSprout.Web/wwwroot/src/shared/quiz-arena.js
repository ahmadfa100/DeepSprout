/**
 * Live quiz arena — the full-screen, Kahoot-style game screen.
 *
 * mode 'player': join the room, answer on the colored tiles, see your
 * verdict, rank and the podium. mode 'host': the projector view for the
 * Representative or Supervisor — live room, answer meter, answer
 * distribution, leaderboard and podium.
 *
 * The screen never decides timing or points. It reads `getView()` (see
 * competition-view.js), sends `join()` / `answer()` to the commands, and
 * re-reads whenever the store changes or the current phase ends.
 */
const CSS_HREF = new URL('./quiz-arena.css', import.meta.url).href;
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Fraunces:ital,opsz,wght@1,9..144,400..600&display=swap';
const SOUND_KEY = 'deepsprout-quiz-sound';
const LETTERS = ['A', 'B', 'C', 'D'];
const SHAPE_NAMES = ['Triangle', 'Diamond', 'Circle', 'Square'];
const SHAPES = [
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4.5 29 27.5H3Z"/></svg>',
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2.5 29.5 16 16 29.5 2.5 16Z"/></svg>',
  '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/></svg>',
  '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="3.5"/></svg>'
];
const I = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10m0-10L7 17"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5C4.5 10 9.5 4.5 20 3.5c0 11-5 16-15.5 16Zm0 0c3-5 7.5-8.5 12.5-11"/></svg>',
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2.5 7.5 5 4.5 4.5-7.5 4.5 7.5 5-4.5-2 11.5h-15Z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.4 3.6-8.8.4 1.9 1.4 3 2.5 3.6C12 6.7 13.3 4.6 15 3c.4 3.2 3.5 5.6 3.5 10.8 0 4.1-2.6 7.2-6.5 7.2Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path class="qa-wave" d="M15.5 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"/><path class="qa-mute" d="m16 9.5 5 5m0-5-5 5"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg>'
};
const RING = 2 * Math.PI * 54;

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const num = n => Math.round(n).toLocaleString('en');
const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const hue = v => [...String(v || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 17);
const initials = name => esc((name || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase());
const pad = n => String(n).padStart(2, '0');
const when = ms => new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman'}).format(new Date(ms));
/** Words that rise in one by one. */
const words = (text, base = 0) => esc(text).split(/\s+/).map((w, i) => `<span class="qa-w" style="--w:${base + i}"><span>${w}</span></span>`).join(' ');
function clockUnits(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86400), h = Math.floor(total % 86400 / 3600), m = Math.floor(total % 3600 / 60), s = total % 60;
  if (d) return [[pad(d), 'days'], [pad(h), 'hrs'], [pad(m), 'min'], [pad(s), 'sec']];
  if (h) return [[pad(h), 'hrs'], [pad(m), 'min'], [pad(s), 'sec']];
  return [[pad(m), 'min'], [pad(s), 'sec']];
}

let cssReady;
function ensureCss() {
  if (cssReady) return cssReady;
  if (!document.querySelector(`link[href="${FONT_HREF}"]`)) document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: FONT_HREF}));
  if (document.querySelector(`link[href="${CSS_HREF}"]`)) return (cssReady = Promise.resolve());
  cssReady = new Promise(resolve => {
    const link = Object.assign(document.createElement('link'), {rel: 'stylesheet', href: CSS_HREF});
    link.addEventListener('load', resolve); link.addEventListener('error', resolve);
    document.head.append(link);
    setTimeout(resolve, 1500);
  });
  return cssReady;
}

/* ------------------------------------------------------------------ sound */
/** Small synthesized game sounds; nothing is downloaded. The viewer can mute them (remembered on this device). */
const Sound = {
  ctx: null,
  get on() { try { return localStorage.getItem(SOUND_KEY) !== '0'; } catch { return true; } },
  set on(v) { try { localStorage.setItem(SOUND_KEY, v ? '1' : '0'); } catch { /* preference only */ } },
  tone(freq, dur, {type = 'sine', gain = .05, delay = 0, to = null} = {}) {
    if (!this.on || reduced()) return;
    try {
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + .05);
    } catch { /* audio is optional */ }
  },
  play(name) {
    const T = (f, d, o) => this.tone(f, d, o);
    ({
      tick: () => T(1320, .05, {type: 'square', gain: .018}),
      count: () => { T(523, .16, {type: 'triangle', gain: .07}); T(1046, .12, {gain: .03, delay: .02}); },
      go: () => [523, 659, 784, 1046].forEach((f, i) => T(f, .2, {type: 'triangle', gain: .06, delay: i * .05})),
      whoosh: () => T(240, .35, {type: 'sine', gain: .04, to: 960}),
      lock: () => { T(660, .07, {type: 'triangle', gain: .06}); T(990, .12, {type: 'triangle', gain: .06, delay: .07}); },
      join: () => { T(880, .08, {gain: .04}); T(1320, .1, {gain: .035, delay: .06}); },
      correct: () => [659, 831, 988, 1319].forEach((f, i) => T(f, .25, {type: 'triangle', gain: .065, delay: i * .07})),
      wrong: () => { T(196, .32, {type: 'sawtooth', gain: .035, to: 110}); T(147, .4, {type: 'triangle', gain: .04, delay: .08}); },
      reveal: () => { T(392, .18, {type: 'triangle', gain: .05}); T(784, .3, {type: 'triangle', gain: .05, delay: .12}); },
      fanfare: () => [523, 659, 784, 1046, 784, 1046, 1319].forEach((f, i) => T(f, i === 6 ? .7 : .2, {type: 'triangle', gain: .06, delay: i * .13}))
    })[name]?.();
  }
};

let active = null;
export async function openArena(options) {
  active?.close();
  await ensureCss();
  active = new Arena(options);
  active.open();
  return active;
}
export const closeArena = () => active?.close();

/* Outline glyphs drifting in the background. */
const GLYPHS = [[7, 18, 0, 92, 0], [86, 14, 1, 70, 3], [14, 80, 2, 110, 6], [80, 74, 3, 84, 2], [50, 9, 2, 40, 7], [93, 46, 0, 54, 9], [3, 50, 3, 48, 11], [62, 92, 1, 60, 4]]
  .map(([x, y, s, size, d]) => `<span class="qa-glyph qa-g${s}" style="left:${x}%;top:${y}%;--size:${size}px;--d:-${d * 3}s">${SHAPES[s]}</span>`).join('');

class Arena {
  constructor({mode = 'player', getView, join, answer, subscribe, now, onClose}) {
    Object.assign(this, {mode, getView, joinFn: join, answerFn: answer, subscribeFn: subscribe, nowFn: now, onClose});
    this.offset = 0; this.key = ''; this.view = null; this.frame = 0; this.marks = {}; this.timers = [];
  }

  now() { return Date.now() + this.offset; }

  open() {
    const d = document.createElement('dialog');
    d.className = 'qa'; d.dataset.mode = this.mode;
    d.setAttribute('aria-label', 'Live competition');
    d.innerHTML = `<div class="qa-sky" aria-hidden="true"><i class="qa-orb qa-o1"></i><i class="qa-orb qa-o2"></i><i class="qa-orb qa-o3"></i><i class="qa-orb qa-o4"></i><div class="qa-gridfloor"></div>${GLYPHS}</div>
      <div class="qa-grain" aria-hidden="true"></div><div class="qa-vignette" aria-hidden="true"></div>
      <header class="qa-island"><span class="qa-mark">${I.leaf}</span><span class="qa-island-copy"><small>${this.mode === 'host' ? 'Host screen' : 'Live competition'}</small><strong class="qa-island-title"></strong></span>
        <span class="qa-island-meta" aria-live="off"></span>
        <button type="button" class="qa-icon" data-qa="sound" aria-label="Game sounds" aria-pressed="${Sound.on}">${I.sound}</button>
        <button type="button" class="qa-icon" data-qa="close" aria-label="Close the game">${I.cross}</button></header>
      <main class="qa-stage" tabindex="-1"></main>
      <div class="qa-wipe" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <canvas class="qa-confetti" aria-hidden="true"></canvas><p class="qa-sr" role="status" aria-live="polite"></p>`;
    document.body.append(d);
    this.el = d; this.stage = d.querySelector('.qa-stage');
    d.addEventListener('click', e => this.onClick(e));
    d.addEventListener('submit', e => this.onSubmit(e));
    d.addEventListener('keydown', e => this.onKey(e));
    d.addEventListener('pointermove', e => this.tilt(e));
    d.addEventListener('pointerout', e => { const t = e.target.closest?.('button.qa-tile'); if (t && !t.contains(e.relatedTarget)) ['--rx', '--ry'].forEach(k => t.style.removeProperty(k)); });
    d.addEventListener('close', () => this.cleanup());
    this.unsubscribe = this.subscribeFn?.(() => this.refresh(true));
    document.documentElement.classList.add('qa-locked');
    d.showModal();
    this.stage.focus({preventScroll: true});
    this.wipe();
    this.refresh();
    const loop = () => { this.tick(); this.frame = requestAnimationFrame(loop); };
    this.frame = requestAnimationFrame(loop);
    // Animation frames pause in background tabs; keep the round moving and catch up when the tab returns.
    this.pulse = setInterval(() => this.tick(), 1000);
    this.onVisible = () => { if (document.visibilityState === 'visible') { this.synced = 0; this.refresh(); } };
    document.addEventListener('visibilitychange', this.onVisible);
  }

  close() { if (this.el?.open) this.el.close(); else this.cleanup(); }

  cleanup() {
    if (!this.el) return;
    cancelAnimationFrame(this.frame); clearInterval(this.pulse); document.removeEventListener('visibilitychange', this.onVisible); this.timers.forEach(clearTimeout); this.unsubscribe?.();
    document.documentElement.classList.remove('qa-locked');
    this.el.remove(); this.el = null;
    if (active === this) active = null;
    this.onClose?.();
  }

  /* ---------------------------------------------------------------- data */

  refresh(fromStore = false) {
    if (!this.el) return;
    let view;
    try { view = this.getView(); if (this.nowFn) { this.offset = this.nowFn() - Date.now(); this.synced = Date.now(); } }
    catch (error) { this.swap(`<section class="qa-message"><h1 class="qa-display">Something went wrong</h1><p class="qa-lede">${esc(error.message)}</p></section>`); return; }
    this.view = view;
    if (!view) { this.key = 'missing'; this.swap('<section class="qa-message"><h1 class="qa-display">This round is <em>gone.</em></h1><p class="qa-lede">It may have been removed or changed to another format.</p></section>'); return; }
    this.el.querySelector('.qa-island-title').textContent = view.title;
    const key = this.keyOf(view);
    if (key !== this.key) {
      const first = !this.key;
      this.key = key; this.marks = {};
      if (!first && ['intro', 'preview', 'podium', 'scores'].includes(view.phase.phase)) this.wipe();
      this.swap(this.scene(view));
      this.entered(view);
      this.announce(view);
    } else if (fromStore) this.patch(view);
    this.meta(view);
  }

  keyOf(v) {
    const ph = v.phase, i = ph.index ?? '';
    const mine = this.mode === 'player' && ph.index !== undefined && v.me.answers[ph.index] ? 'a' : '';
    return `${ph.phase}|${i}|${this.mode === 'player' && v.me.joined ? 'in' : 'out'}|${mine}`;
  }

  meta(v) {
    const ph = v.phase, node = this.el.querySelector('.qa-island-meta');
    const parts = [];
    if (ph.index !== undefined) parts.push(`<span class="qa-pill is-q"><b>${pad(ph.index + 1)}</b>/${pad(v.questionCount)}</span>`);
    if (ph.phase === 'lobby') parts.push('<span class="qa-pill is-live is-open"><i></i>Room open</span>');
    else if (!['podium', 'cancelled', 'draft'].includes(ph.phase)) parts.push('<span class="qa-pill is-live"><i></i>Live</span>');
    parts.push(`<span class="qa-pill"><b>${v.players.length}</b> ${v.players.length === 1 ? 'player' : 'players'}</span>`);
    const html = parts.join('');
    if (node.innerHTML !== html) node.innerHTML = html;
  }

  announce(v) {
    const ph = v.phase, sr = this.el.querySelector('.qa-sr');
    sr.textContent = ph.phase === 'preview' ? `Question ${ph.index + 1} of ${v.questionCount}: ${v.question.text}`
      : ph.phase === 'answer' ? (this.mode === 'player' && v.me.answers[ph.index] ? 'Answer locked in.' : 'Answers are open.')
      : ph.phase === 'reveal' ? `Correct answer: ${v.question.options[v.question.answer]}`
      : ph.phase === 'podium' ? `Final results. ${v.standings[0] ? `${v.standings[0].name} wins with ${num(v.standings[0].score)} points.` : ''}`
      : ph.phase === 'intro' ? 'Get ready. The first question is coming.' : '';
  }

  /* -------------------------------------------------------------- scenes */

  wipe() {
    const w = this.el?.querySelector('.qa-wipe');
    if (!w || reduced()) return;
    w.classList.remove('is-on'); void w.offsetWidth; w.classList.add('is-on');
  }

  swap(html) {
    const old = [...this.stage.children];
    const scene = document.createElement('div');
    scene.className = 'qa-scene';
    scene.innerHTML = html;
    old.forEach(n => { n.classList.add('is-leaving'); n.setAttribute('aria-hidden', 'true'); n.inert = true; setTimeout(() => n.remove(), reduced() ? 0 : 500); });
    this.stage.append(scene);
  }

  scene(v) {
    const ph = v.phase.phase;
    if (ph === 'draft') return '<section class="qa-message"><span class="qa-eyebrow">Draft</span><h1 class="qa-display">Not published <em>yet.</em></h1><p class="qa-lede">Publish the round from the workspace to open the room.</p></section>';
    if (ph === 'cancelled') return '<section class="qa-message"><span class="qa-eyebrow">Cancelled</span><h1 class="qa-display">This round was <em>called off.</em></h1><p class="qa-lede">The organizer cancelled it. Nothing was scored.</p></section>';
    return this[{lobby: 'lobby', intro: 'intro', preview: 'preview', answer: 'answering', reveal: 'reveal', scores: 'scores'}[ph] || 'podium'](v);
  }

  cta(label, attrs = '') { return `<button class="qa-cta" ${attrs}><span>${label}</span><span class="qa-cta-icon">${I.arrow}</span></button>`; }

  joinBox(v, compact = false) {
    if (this.mode !== 'player' || v.me.joined) return '';
    if (v.me.blocker) return `<p class="qa-note">${esc(v.me.blocker)}</p>`;
    return `<form class="qa-join${compact ? ' is-compact' : ''}" data-qa-form="join"><label class="qa-consent"><input type="checkbox" name="consent" required><span class="qa-switch" aria-hidden="true"></span><span>Show my name and score on the leaderboard</span></label>
      ${this.cta(compact ? 'Jump in — play the next question' : 'Join the room', 'type="submit"')}<p class="qa-error" role="alert" hidden></p></form>`;
  }

  flip(ms) {
    return clockUnits(ms).map(([digits, label], u) => `<span class="qa-unit"><span class="qa-digits" data-qa-unit="${u}">${[...digits].map(d => `<b><span>${d}</span></b>`).join('')}</span><small>${label}</small></span>`).join('<i class="qa-colon" aria-hidden="true">:</i>');
  }

  lobby(v) {
    const where = v.initiative ? `${esc(v.organizer)} · ${esc(v.initiative.title)}` : esc(v.organizer);
    const player = this.mode === 'player';
    const status = player ? v.me.joined
      ? `<div class="qa-bezel qa-youin"><div class="qa-core"><span class="qa-pulse" aria-hidden="true"></span><div><strong>You’re in the room.</strong><span>Your name is on the board. Stay here — the first question opens by itself.</span></div></div></div>`
      : this.joinBox(v)
      : `<div class="qa-bezel qa-hosthint"><div class="qa-core"><span class="qa-eyebrow is-quiet">How players join</span><p>Explore → My Initiatives → <b>${esc(v.initiative?.title || 'their initiative')}</b> → Competitions → <em>${esc(v.title)}</em></p><small>Put this screen on the projector. It runs the whole round by itself.</small></div></div>`;
    return `<section class="qa-lobby">
      <div class="qa-lobby-copy">
        <span class="qa-eyebrow"><i class="qa-dot"></i>${where}</span>
        <h1 class="qa-display">${words(v.title)}</h1>
        ${v.description ? `<p class="qa-lede">${esc(v.description)}</p>` : ''}
        <div class="qa-facts"><span><b>${v.questionCount}</b>questions</span><span><b>4</b>colors</span><span><b>1,000</b>pts max each</span></div>
        ${status}
      </div>
      <div class="qa-bezel qa-clock"><div class="qa-core">
        <span class="qa-clock-glow" aria-hidden="true"></span>
        <span class="qa-eyebrow is-quiet">Kick-off in</span>
        <div class="qa-flip" role="timer" aria-label="Time until the round starts" data-qa-flip>${this.flip(v.startAt - this.now())}</div>
        <time>${esc(when(v.startAt))}</time>
        <div class="qa-shape-row" aria-hidden="true">${SHAPES.map((s, i) => `<span class="qa-t${i}" style="--k:${i}">${s}</span>`).join('')}</div>
      </div></div>
      <div class="qa-room">
        <div class="qa-room-head"><span class="qa-room-count"><b data-qa-pcount>${v.players.length}</b> in the room</span><span class="qa-room-hint">${v.players.length ? 'Names appear the moment someone joins' : 'Waiting for the first player…'}</span></div>
        <ul class="qa-chips" data-qa-chips>${v.players.map((p, i) => this.chip(p, i, v)).join('')}</ul>
      </div>
    </section>`;
  }

  chip(p, i, v, fresh = false) {
    const me = this.mode === 'player' && p.id === v.me.personId;
    return `<li class="qa-chip${me ? ' is-me' : ''}${fresh ? ' is-fresh' : ''}" data-id="${esc(p.id)}" style="--h:${hue(p.name)};--i:${Math.min(i, 14)};--bob:-${(hue(p.id) % 7) * .37}s"><span class="qa-avatar">${initials(p.name)}</span><span>${esc(p.name)}</span>${me ? '<em>you</em>' : ''}</li>`;
  }

  intro(v) {
    return `<section class="qa-intro"><span class="qa-eyebrow">Get <em>ready</em></span><h1 class="qa-display is-center">${words(v.title)}</h1>
      <div class="qa-count" aria-hidden="true"><span class="qa-count-ring"></span><span class="qa-count-stage" data-qa-big>${this.introFace(v)}</span></div>
      <p class="qa-lede is-center">${v.questionCount} questions · the faster you answer, the more you score</p>
      ${this.mode === 'player' && !v.me.joined ? this.joinBox(v, true) : ''}</section>`;
  }

  introLeft(v) { return Math.max(0, Math.ceil((v.phase.endsAt - this.now()) / 1000)); }
  introFace(v) {
    const left = this.introLeft(v);
    if (left > 3) return `<span class="qa-assemble">${SHAPES.map((s, i) => `<i class="qa-t${i}" style="--k:${i}">${s}</i>`).join('')}</span>`;
    return `<b class="qa-num">${left || 'Go'}</b><i class="qa-shock"></i><i class="qa-shock is-late"></i>`;
  }

  preview(v) {
    const q = v.question, total = v.phase.endsAt - v.phase.startsAt, elapsed = Math.max(0, this.now() - v.phase.startsAt);
    return `<section class="qa-preview"><span class="qa-ghost" aria-hidden="true">${pad(q.index + 1)}</span>
      <span class="qa-eyebrow">Question ${q.index + 1} of ${v.questionCount} · ${q.seconds} seconds</span>
      <h1 class="qa-q-hero">${words(q.text)}</h1>
      <div class="qa-readline" aria-hidden="true"><i style="animation-duration:${total}ms;animation-delay:-${elapsed}ms"></i></div>
      <p class="qa-hint">${q.options.length} answers coming up — get your fingers ready</p></section>`;
  }

  timer(v) {
    const total = v.phase.endsAt - v.phase.startsAt, elapsed = Math.max(0, this.now() - v.phase.startsAt);
    return `<div class="qa-timer" role="timer" aria-label="Seconds left"><svg viewBox="0 0 128 128" aria-hidden="true"><defs><linearGradient id="qa-ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9f7c8"/><stop offset=".55" stop-color="#7fd39b"/><stop offset="1" stop-color="#f2c14e"/></linearGradient></defs><circle class="qa-timer-track" cx="64" cy="64" r="54"/><circle class="qa-timer-bar" cx="64" cy="64" r="54" style="stroke-dasharray:${RING};animation-duration:${total}ms;animation-delay:-${elapsed}ms"/></svg><strong data-qa-sec>${Math.ceil((total - elapsed) / 1000)}</strong><small>sec</small></div>`;
  }

  tiles(v, {interactive = false, reveal = false, chosen = null} = {}) {
    const q = v.question;
    return `<div class="qa-tiles${reveal ? ' is-reveal' : ''}" data-count="${q.options.length}">${q.options.map((o, i) => {
      const state = reveal ? (i === q.answer ? ' is-correct' : ' is-wrong') : '';
      const mine = chosen === i ? ' is-chosen' : '';
      const core = `<span class="qa-tile-core"><span class="qa-tile-shape">${SHAPES[i]}</span><span class="qa-tile-text">${esc(o)}</span>${reveal ? `<span class="qa-tile-mark">${i === q.answer ? I.check : I.cross}</span>` : `<kbd aria-hidden="true">${i + 1}</kbd>`}</span><span class="qa-tile-sheen" aria-hidden="true"></span>${mine && reveal ? '<span class="qa-tile-you">Your pick</span>' : ''}`;
      return interactive
        ? `<button type="button" class="qa-tile qa-t${i}" data-qa-choice="${i}" style="--i:${i}" aria-label="Answer ${LETTERS[i]} (${SHAPE_NAMES[i]}): ${esc(o)}">${core}</button>`
        : `<div class="qa-tile qa-t${i}${state}${mine}" style="--i:${i}">${core}</div>`;
    }).join('')}</div>`;
  }

  meter(v) {
    const ids = new Set(v.answeredIds);
    return `<div class="qa-meter" aria-hidden="true">${v.players.slice(0, 40).map(p => `<i class="${ids.has(p.id) ? 'is-on' : ''}" data-meter="${esc(p.id)}" style="--h:${hue(p.name)}"></i>`).join('')}</div>`;
  }

  answering(v) {
    const q = v.question, player = this.mode === 'player';
    const mine = player ? v.me.answers[q.index] : null;
    if (player && mine) {
      return `<section class="qa-lockin"><div class="qa-lock-orb qa-t${mine.choice}"><span class="qa-lock-ring"></span><span class="qa-lock-ring is-2"></span><span class="qa-tile-shape">${SHAPES[mine.choice]}</span></div>
        <h1 class="qa-display is-center">Locked <em>in.</em></h1><p class="qa-lede is-center">${esc(q.options[mine.choice])}</p>
        <div class="qa-bezel qa-waitbar"><div class="qa-core"><span class="qa-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Answer revealed in <b data-qa-sec>${Math.ceil((v.phase.endsAt - this.now()) / 1000)}</b>s</span><span class="qa-sep"></span><span><b data-qa-answered>${v.answeredCount}</b> of ${v.players.length} answered</span></div></div></section>`;
    }
    const canPlay = player && v.me.joined;
    return `<section class="qa-answer">
      <div class="qa-bezel qa-qcard"><div class="qa-core"><span class="qa-qindex">${pad(q.index + 1)}</span><h1 class="qa-q">${esc(q.text)}</h1></div></div>
      <div class="qa-hud">${this.timer(v)}
        ${player ? `<div class="qa-hud-stat"><span class="qa-eyebrow is-quiet">${canPlay ? 'Worth right now' : 'Watching'}</span><b data-qa-worth>${canPlay ? '1,000' : '—'}</b><small>${canPlay ? 'points — it drops every second' : 'Join to score points'}</small></div>`
          : `<div class="qa-hud-stat"><span class="qa-eyebrow is-quiet">Answers in</span><b><span data-qa-answered>${v.answeredCount}</span><i>/${v.players.length}</i></b>${this.meter(v)}</div>`}
      </div>
      ${this.tiles(v, {interactive: canPlay})}
      ${player && !v.me.joined ? this.joinBox(v, true) : ''}
      <p class="qa-error qa-float-error" role="alert" hidden></p></section>`;
  }

  verdict(v) {
    const q = v.question, mine = v.me.answers[q.index];
    const me = v.standings.find(r => r.personId === v.me.personId);
    const kind = !mine ? 'missed' : mine.correct ? 'correct' : 'wrong';
    const title = {correct: 'Correct!', wrong: 'Not this time', missed: 'Too slow!'}[kind];
    const sub = kind === 'correct' ? (mine.ms < 3000 ? `Lightning fast — ${(mine.ms / 1000).toFixed(1)}s` : `Answered in ${(mine.ms / 1000).toFixed(1)}s`)
      : kind === 'wrong' ? `The answer was “${esc(q.options[q.answer])}”` : 'The timer ran out before you answered';
    const streak = me?.streak > 1 ? `<span class="qa-streak">${I.flame}${me.streak} in a row</span>` : '';
    return `<div class="qa-verdict is-${kind}"><span class="qa-verdict-burst" aria-hidden="true"></span><span class="qa-stamp">${kind === 'correct' ? I.check : I.cross}</span>
      <div class="qa-verdict-copy"><strong>${title}</strong><small>${sub}</small></div>
      <span class="qa-gain" data-qa-from="0" data-qa-to="${mine?.points || 0}">+0</span>${streak}</div>`;
  }

  reveal(v) {
    const q = v.question, player = this.mode === 'player' && v.me.joined;
    const max = Math.max(1, ...v.distribution);
    const bars = `<div class="qa-dist" aria-label="How players answered">${q.options.map((_, i) => `<div class="qa-bar qa-t${i}${i === q.answer ? ' is-correct' : ''}" style="--i:${i};--h:${Math.max(4, v.distribution[i] / max * 100)}%"><b data-qa-from="0" data-qa-to="${v.distribution[i]}">0</b><span class="qa-bar-col"><span></span></span><span class="qa-bar-foot">${SHAPES[i]}</span></div>`).join('')}</div>`;
    const chosen = player ? v.me.answers[q.index]?.choice ?? null : null;
    return `<section class="qa-reveal${player ? ' is-player' : ''}">
      ${player ? this.verdict(v) : `<div class="qa-bezel qa-qcard is-small"><div class="qa-core"><span class="qa-qindex">${pad(q.index + 1)}</span><h1 class="qa-q">${esc(q.text)}</h1></div></div>${bars}`}
      ${this.tiles(v, {reveal: true, chosen})}
    </section>`;
  }

  board(v, rows, limit = 5) {
    const prevIndex = new Map(v.previous.map((r, i) => [r.personId, i]));
    const prevRank = new Map(v.previous.map(r => [r.personId, r.rank]));
    const top = rows.slice(0, limit);
    const meRow = this.mode === 'player' ? rows.find(r => r.personId === v.me.personId) : null;
    if (meRow && !top.includes(meRow)) top.push(meRow);
    const lead = Math.max(1, rows[0]?.score || 1), first = !v.previous.some(r => r.score > 0);
    return `<ol class="qa-board">${top.map((r, i) => {
      const from = !first && prevIndex.has(r.personId) ? Math.min(6, Math.max(-6, prevIndex.get(r.personId) - i)) : 0;
      const before = v.previous.find(p => p.personId === r.personId)?.score ?? 0;
      const moved = !first && prevRank.has(r.personId) ? prevRank.get(r.personId) - r.rank : 0;
      const me = meRow && r.personId === meRow.personId;
      return `<li class="qa-row${me ? ' is-me' : ''}${r.rank === 1 ? ' is-first' : ''}" style="--from:${from};--i:${i};--h:${hue(r.name)};--pct:${Math.max(.04, r.score / lead)}">
        <span class="qa-row-bar" aria-hidden="true"></span><span class="qa-rank">${r.rank}</span><span class="qa-avatar">${initials(r.name)}</span>
        <span class="qa-name">${esc(r.name)}${me ? ' <em>you</em>' : ''}</span>
        ${moved ? `<span class="qa-move ${moved > 0 ? 'is-up' : 'is-down'}">${moved > 0 ? I.up : I.down}${Math.abs(moved)}</span>` : ''}
        ${r.streak > 1 ? `<span class="qa-row-streak" title="Answer streak">${I.flame}${r.streak}</span>` : ''}
        ${r.last?.points ? `<span class="qa-delta">+${num(r.last.points)}</span>` : ''}
        <strong class="qa-score" data-qa-from="${before}" data-qa-to="${r.score}">${num(before)}</strong></li>`;
    }).join('')}</ol>`;
  }

  standing(v) {
    if (this.mode !== 'player' || !v.me.joined) return '';
    const rows = v.standings, i = rows.findIndex(r => r.personId === v.me.personId);
    if (i < 0) return '';
    const me = rows[i];
    if (i === 0) return `<p class="qa-standing is-lead">${I.crown}<span>You’re leading${rows[1] ? ` by <b>${num(me.score - rows[1].score)}</b>` : ''}. Keep it up!</span></p>`;
    const ahead = rows[i - 1];
    return `<p class="qa-standing"><span>You’re <b>${ordinal(me.rank)}</b> · just <b>${num(ahead.score - me.score)}</b> points behind ${esc(ahead.name)}</span></p>`;
  }

  scores(v) {
    return `<section class="qa-scores"><span class="qa-eyebrow">Leaderboard · after question ${v.phase.index + 1} of ${v.questionCount}</span><h1 class="qa-display is-center">Who’s <em>ahead?</em></h1>
      ${v.standings.length ? this.board(v, v.standings) : '<p class="qa-lede is-center">No answers yet — the next question is on its way.</p>'}
      ${this.standing(v)}<p class="qa-next"><span class="qa-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Next question in <b data-qa-sec>${Math.ceil((v.phase.endsAt - this.now()) / 1000)}</b>s</span></p></section>`;
  }

  podium(v) {
    const rows = v.standings, [first, second, third] = rows;
    const settled = this.now() - v.phase.startsAt > 15000;
    const step = (r, place) => `<div class="qa-step qa-step-${place}${r ? '' : ' is-empty'}">
        <div class="qa-step-person">${r ? `${place === 1 ? `<span class="qa-rays" aria-hidden="true"></span><span class="qa-crown">${I.crown}</span>` : ''}<span class="qa-avatar" style="--h:${hue(r.name)}">${initials(r.name)}</span><strong>${esc(r.name)}</strong><span class="qa-step-score" data-qa-from="0" data-qa-to="${r.score}">0</span><small>${r.correct}/${v.questionCount} correct</small>` : '<small>—</small>'}</div>
        <div class="qa-step-block"><span class="qa-step-shine" aria-hidden="true"></span><b>${place}</b></div></div>`;
    const me = this.mode === 'player' ? rows.find(r => r.personId === v.me.personId) : null;
    const rest = rows.slice(3);
    return `<section class="qa-final${settled ? ' is-settled' : ''}"><div class="qa-beams" aria-hidden="true"><i></i><i></i></div>
      <span class="qa-eyebrow">Final results · ${esc(v.title)}</span>
      <h1 class="qa-display is-center">${first ? `${words(first.name.split(' ')[0])} <em>takes it!</em>` : 'Round <em>complete</em>'}</h1>
      ${rows.length ? `<div class="qa-podium">${step(second, 2)}${step(first, 1)}${step(third, 3)}</div>` : '<p class="qa-lede is-center">Nobody played this round.</p>'}
      ${me ? `<div class="qa-bezel qa-myresult"><div class="qa-core"><strong>You finished ${ordinal(me.rank)} <span>of ${rows.length}</span></strong><small>${me.correct}/${v.questionCount} correct · ${num(me.score)} points</small></div></div>`
        : this.mode === 'player' ? '<p class="qa-note">You didn’t play this round.</p>' : ''}
      ${rest.length ? `<ol class="qa-rest">${rest.slice(0, 12).map((r, i) => `<li style="--i:${i}"><span class="qa-rank">${r.rank}</span><span class="qa-avatar" style="--h:${hue(r.name)}">${initials(r.name)}</span><span class="qa-name">${esc(r.name)}</span><span class="qa-rest-correct">${r.correct}/${v.questionCount}</span><b>${num(r.score)}</b></li>`).join('')}</ol>` : ''}
      <button type="button" class="qa-ghost-btn" data-qa="close">Close the results</button></section>`;
  }

  /* ---------------------------------------------------- motion & updates */

  entered(v) {
    this.timers.forEach(clearTimeout); this.timers = [];
    const scene = this.stage.lastElementChild, ph = v.phase.phase, player = this.mode === 'player';
    if (ph === 'preview') Sound.play('whoosh');
    if (ph === 'scores') { Sound.play('whoosh'); this.later(() => this.countUp(scene, '.qa-score', 1000), reduced() ? 0 : 700); }
    if (ph === 'answer' && player && v.me.answers[v.phase.index]) Sound.play('lock');
    if (ph === 'reveal') {
      this.later(() => this.countUp(scene, '.qa-bar b, .qa-gain', 900), reduced() ? 0 : 450);
      const mine = player && v.me.joined ? v.me.answers[v.phase.index] : undefined;
      if (player && v.me.joined) {
        Sound.play(mine?.correct ? 'correct' : 'wrong');
        if (mine?.correct) this.later(() => this.confetti('pop'), 250);
      } else Sound.play('reveal');
    }
    if (ph === 'podium') {
      const settled = scene.querySelector('.qa-final.is-settled');
      this.later(() => this.countUp(scene, '.qa-step-score', 1400), settled || reduced() ? 0 : 2300);
      if (!settled && v.standings.length) this.later(() => { this.confetti('finale'); Sound.play('fanfare'); }, 2600);
    }
  }

  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }

  countUp(scene, selector, duration) {
    const nodes = [...scene.querySelectorAll(selector)];
    if (!nodes.length) return;
    const start = performance.now();
    const run = t => {
      const k = reduced() ? 1 : Math.min(1, (t - start) / duration), ease = 1 - Math.pow(1 - k, 4);
      nodes.forEach(n => { const a = Number(n.dataset.qaFrom), b = Number(n.dataset.qaTo); n.textContent = (n.classList.contains('qa-gain') ? '+' : '') + num(a + (b - a) * ease); });
      if (k < 1 && scene.isConnected) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  patch(v) {
    const scene = this.stage.lastElementChild;
    if (!scene) return;
    const chips = scene.querySelector('[data-qa-chips]');
    if (chips) {
      const have = new Set([...chips.children].map(n => n.dataset.id));
      let added = 0;
      v.players.forEach(p => { if (!have.has(p.id)) { chips.insertAdjacentHTML('beforeend', this.chip(p, 0, v, true)); added++; } });
      if (added) Sound.play('join');
      const count = scene.querySelector('[data-qa-pcount]'); if (count) count.textContent = v.players.length;
      const hint = scene.querySelector('.qa-room-hint'); if (hint && v.players.length) hint.textContent = 'Names appear the moment someone joins';
    }
    scene.querySelectorAll('[data-qa-answered]').forEach(n => { if (n.textContent !== String(v.answeredCount)) { n.textContent = v.answeredCount; n.classList.remove('is-bump'); void n.offsetWidth; n.classList.add('is-bump'); } });
    const ids = new Set(v.answeredIds);
    scene.querySelectorAll('[data-meter]').forEach(n => n.classList.toggle('is-on', ids.has(n.dataset.meter)));
  }

  /** Keep timers, flip clock, live answers and "worth now" moving. */
  tick() {
    const v = this.view;
    if (!v || !this.el) return;
    // Re-sync with the demo clock once a second (it can be moved from the workspace's demo panel),
    // and re-read so scheduled demo players join and answer as it happens.
    if (this.nowFn && Date.now() - (this.synced || 0) > 1000) {
      this.synced = Date.now();
      try { this.offset = this.nowFn() - Date.now(); } catch { /* keep the last offset */ }
      if (['lobby', 'answer', 'intro'].includes(v.phase.phase)) {
        try { const next = this.getView(); if (next) { if (this.keyOf(next) !== this.key) { this.refresh(); return; } this.view = next; this.patch(next); this.meta(next); } } catch { /* next tick */ }
      }
    }
    const t = this.now(), ph = this.view.phase;
    if (ph.endsAt && ph.endsAt !== Infinity && t >= ph.endsAt) { this.refresh(); return; }
    const scene = this.stage.lastElementChild;
    if (!scene) return;
    const set = (sel, text, mark) => { if (this.marks[mark] === text) return false; this.marks[mark] = text; scene.querySelectorAll(sel).forEach(n => { n.textContent = text; }); return true; };
    if (ph.phase === 'lobby') this.flipTo(scene, ph.endsAt - t);
    if (['answer', 'scores'].includes(ph.phase)) {
      const left = Math.max(0, Math.ceil((ph.endsAt - t) / 1000));
      if (set('[data-qa-sec]', String(left), 'sec') && ph.phase === 'answer') {
        const urgent = left <= 5 && left > 0;
        scene.querySelector('.qa-timer')?.classList.toggle('is-urgent', urgent);
        this.el.classList.toggle('is-urgent', urgent);
        if (urgent && !(this.mode === 'player' && this.view.me.answers[ph.index])) Sound.play('tick');
      }
      if (ph.phase === 'answer') {
        const total = ph.endsAt - ph.startsAt, worth = Math.round(1000 * (1 - Math.min(1, (t - ph.startsAt) / total) / 2));
        set('[data-qa-worth]', num(worth), 'worth');
      }
    } else this.el.classList.remove('is-urgent');
    if (ph.phase === 'intro') {
      const left = this.introLeft(this.view), face = left > 3 ? 'shapes' : String(left);
      if (this.marks.face !== face) {
        const stage = scene.querySelector('[data-qa-big]');
        if (stage && this.marks.face !== undefined) { stage.innerHTML = this.introFace(this.view); Sound.play(left === 0 ? 'go' : 'count'); }
        this.marks.face = face;
      }
    }
  }

  flipTo(scene, ms) {
    const units = clockUnits(ms), key = units.map(u => u[0]).join(':');
    if (this.marks.flip === key) return;
    const box = scene.querySelector('[data-qa-flip]');
    if (!box) return;
    if (box.querySelectorAll('.qa-digits').length !== units.length) { box.innerHTML = this.flip(ms); this.marks.flip = key; return; }
    units.forEach(([digits], u) => {
      const slots = box.querySelectorAll(`[data-qa-unit="${u}"] b`);
      [...digits].forEach((d, k) => { const slot = slots[k]; if (slot && slot.textContent !== d) slot.innerHTML = `<span class="is-roll">${d}</span>`; });
    });
    this.marks.flip = key;
  }

  /** Answer tiles lean toward the pointer. */
  tilt(e) {
    if (reduced()) return;
    const tile = e.target.closest?.('button.qa-tile');
    if (!tile) return;
    const r = tile.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    tile.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`); tile.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
    tile.style.setProperty('--mx', `${((x + .5) * 100).toFixed(1)}%`); tile.style.setProperty('--my', `${((y + .5) * 100).toFixed(1)}%`);
  }

  confetti(kind = 'finale') {
    const canvas = this.el?.querySelector('.qa-confetti');
    if (!canvas || reduced()) return;
    const ctx = canvas.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
    const colors = ['#ff5a4e', '#4d8bff', '#ffc73a', '#2fd27f', '#f7e7b0', '#cfe8c2', '#ffffff'];
    const parts = [];
    const burst = (x, y, angle, spread, count, power) => {
      for (let i = 0; i < count; i++) {
        const a = angle + (Math.random() - 0.5) * spread, v = (power * 0.5 + Math.random() * power * 0.7) * dpr;
        parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: (6 + Math.random() * 8) * dpr, h: (3 + Math.random() * 5) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, c: colors[i % colors.length], kind: Math.random() < .25 ? 'dot' : Math.random() < .2 ? 'ribbon' : 'rect', wob: Math.random() * 10});
      }
    };
    if (kind === 'pop') burst(W / 2, H * 0.24, -Math.PI / 2, Math.PI * 1.2, 90, 16);
    else {
      burst(0, H, -Math.PI / 3.2, 0.6, 130, 30); burst(W, H, -Math.PI + Math.PI / 3.2, 0.6, 130, 30);
      burst(W / 2, H * 0.3, -Math.PI / 2, Math.PI * 1.7, 90, 16);
      this.later(() => { burst(W * .25, H, -Math.PI / 2.4, .5, 60, 26); burst(W * .75, H, -Math.PI + Math.PI / 2.4, .5, 60, 26); }, 700);
      for (let i = 0; i < 120; i++) parts.push({x: Math.random() * W, y: -Math.random() * H * .8, vx: (Math.random() - .5) * 2 * dpr, vy: (1 + Math.random() * 2) * dpr, w: 7 * dpr, h: 4 * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .2, c: colors[i % colors.length], kind: 'rect', wob: Math.random() * 10, slow: true});
    }
    const start = performance.now();
    const draw = t => {
      if (!this.el) return;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of parts) {
        if (p.slow) p.vy = Math.min(p.vy + .02 * dpr, 2.6 * dpr); else { p.vy += 0.42 * dpr; p.vx *= 0.985; p.vy *= 0.985; }
        p.x += p.vx + Math.sin((t / 260) + p.wob) * 0.8 * dpr; p.y += p.vy; p.r += p.vr;
        if (p.y < H + 40) alive++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.kind === 'dot') { ctx.beginPath(); ctx.arc(0, 0, p.h * .8, 0, Math.PI * 2); ctx.fill(); }
        else if (p.kind === 'ribbon') ctx.fillRect(-p.w, -1.2 * dpr, p.w * 2, 2.4 * dpr);
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, Math.max(dpr, p.h * Math.abs(Math.cos(p.r * 2))));
        ctx.restore();
      }
      if (alive && t - start < (kind === 'pop' ? 3000 : 9000)) requestAnimationFrame(draw); else ctx.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(draw);
  }

  /* --------------------------------------------------------------- input */

  async choose(choice) {
    const v = this.view;
    if (this.mode !== 'player' || !v?.me.joined || v.phase.phase !== 'answer' || v.me.answers[v.phase.index] || this.busy) return;
    this.busy = true;
    const tiles = this.stage.lastElementChild?.querySelector('.qa-tiles');
    tiles?.querySelector(`[data-qa-choice="${choice}"]`)?.classList.add('is-pressed');
    tiles?.classList.add('has-pick');
    try { await this.answerFn(v.phase.index, choice); }
    catch (error) { const n = this.stage.lastElementChild?.querySelector('.qa-float-error'); if (n) { n.textContent = error.message; n.hidden = false; } tiles?.classList.remove('has-pick'); }
    finally { this.busy = false; this.later(() => this.refresh(), reduced() ? 0 : 280); }
  }

  onClick(e) {
    if (e.target === this.el) return;
    const choice = e.target.closest('[data-qa-choice]');
    if (choice) { this.choose(Number(choice.dataset.qaChoice)); return; }
    const sound = e.target.closest('[data-qa="sound"]');
    if (sound) { Sound.on = !Sound.on; sound.setAttribute('aria-pressed', String(Sound.on)); if (Sound.on) Sound.play('join'); return; }
    if (e.target.closest('[data-qa="close"]')) this.close();
  }

  async onSubmit(e) {
    const form = e.target.closest('[data-qa-form="join"]');
    if (!form) return;
    e.preventDefault();
    const error = form.querySelector('.qa-error');
    try { await this.joinFn(form.elements.consent.checked); Sound.play('join'); this.refresh(); }
    catch (x) { error.textContent = x.message; error.hidden = false; }
  }

  onKey(e) {
    if (e.target.matches?.('input, textarea')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4 && this.view?.phase.phase === 'answer' && n <= (this.view.question?.options.length || 0)) { e.preventDefault(); this.choose(n - 1); }
  }
}
