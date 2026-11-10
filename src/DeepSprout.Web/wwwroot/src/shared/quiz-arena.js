/**
 * Live quiz arena — the full-screen, Kahoot-style game screen.
 *
 * mode 'player': join the room, answer on the colored tiles, see your
 * verdict, rank and the podium. mode 'host': the projector view for the
 * Representative or Supervisor — live player list, answer counts, answer
 * distribution, scoreboard and podium.
 *
 * The screen never decides timing or points. It reads `getView()` (see
 * competition-view.js), sends `join()` / `answer()` to the commands, and
 * re-reads whenever the store changes or the current phase ends.
 */
const CSS_HREF = new URL('./quiz-arena.css', import.meta.url).href;
const LETTERS = ['A', 'B', 'C', 'D'];
const SHAPE_NAMES = ['Triangle', 'Diamond', 'Circle', 'Square'];
const SHAPES = [
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 29.5 27.5h-27Z"/></svg>',
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2.5 29.5 16 16 29.5 2.5 16Z"/></svg>',
  '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13.5"/></svg>',
  '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3.5" y="3.5" width="25" height="25" rx="3"/></svg>'
];
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 6.5 11 11m0-11-11 11"/></svg>';
const LEAF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20C4 10 9 4 21 3c0 12-5 17-17 17Zm0 0c3-5 8-9 14-12"/></svg>';
const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2.5 7.5 5 4.5 4.5-7.5 4.5 7.5 5-4.5-2 11.5h-15Z"/></svg>';
const FLAME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.4 3.6-8.8.4 1.9 1.4 3 2.5 3.6C12 6.7 13.3 4.6 15 3c.4 3.2 3.5 5.6 3.5 10.8 0 4.1-2.6 7.2-6.5 7.2Z"/></svg>';
const RING = 2 * Math.PI * 52;

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const num = n => Math.round(n).toLocaleString('en');
const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const hue = v => [...String(v || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 17);
const initials = name => esc((name || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase());
const when = ms => new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman'}).format(new Date(ms));
function clock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86400), h = Math.floor(total % 86400 / 3600), m = Math.floor(total % 3600 / 60), s = total % 60;
  const p = x => String(x).padStart(2, '0');
  if (d) return `${d}d ${p(h)}h ${p(m)}m`;
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

let cssReady;
function ensureCss() {
  if (cssReady) return cssReady;
  if (document.querySelector(`link[href="${CSS_HREF}"]`)) return (cssReady = Promise.resolve());
  cssReady = new Promise(resolve => {
    const link = Object.assign(document.createElement('link'), {rel: 'stylesheet', href: CSS_HREF});
    link.addEventListener('load', resolve); link.addEventListener('error', resolve);
    document.head.append(link);
    setTimeout(resolve, 1500);
  });
  return cssReady;
}

let active = null;
export async function openArena(options) {
  active?.close();
  await ensureCss();
  active = new Arena(options);
  active.open();
  return active;
}
export const closeArena = () => active?.close();

/* Soft floating shapes behind every scene (fixed positions keep it calm). */
const BG = [[6, 14, 0, 74, 0], [88, 10, 1, 56, 4], [16, 78, 2, 90, 8], [78, 70, 3, 70, 2], [46, 6, 2, 38, 6], [94, 46, 0, 44, 10], [3, 46, 3, 40, 12], [60, 90, 1, 52, 5], [34, 58, 0, 30, 9], [70, 30, 3, 28, 3]]
  .map(([x, y, s, size, d]) => `<span class="qa-float qa-f${s}" style="left:${x}%;top:${y}%;--size:${size}px;--d:${d}s">${SHAPES[s]}</span>`).join('');

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
    d.innerHTML = `<div class="qa-bg" aria-hidden="true">${BG}</div>
      <header class="qa-top"><div class="qa-brand"><span class="qa-brand-mark">${LEAF}</span><span><strong>DeepSprout</strong><small>${this.mode === 'host' ? 'Host screen' : 'Live competition'}</small></span></div>
      <p class="qa-top-title"></p><div class="qa-top-meta" aria-live="off"></div><button type="button" class="qa-close" data-qa="close" aria-label="Close the game">${CROSS}</button></header>
      <main class="qa-stage"></main><canvas class="qa-confetti" aria-hidden="true"></canvas><p class="qa-sr" role="status" aria-live="polite"></p>`;
    document.body.append(d);
    this.el = d; this.stage = d.querySelector('.qa-stage');
    d.addEventListener('click', e => this.onClick(e));
    d.addEventListener('submit', e => this.onSubmit(e));
    d.addEventListener('keydown', e => this.onKey(e));
    d.addEventListener('close', () => this.cleanup());
    this.unsubscribe = this.subscribeFn?.(() => this.refresh(true));
    document.documentElement.classList.add('qa-locked');
    d.showModal();
    this.stage.tabIndex = -1; this.stage.focus({preventScroll: true});
    this.refresh();
    const loop = () => { this.tick(); this.frame = requestAnimationFrame(loop); };
    this.frame = requestAnimationFrame(loop);
  }

  close() { if (this.el?.open) this.el.close(); else this.cleanup(); }

  cleanup() {
    if (!this.el) return;
    cancelAnimationFrame(this.frame); this.timers.forEach(clearTimeout); this.unsubscribe?.();
    document.documentElement.classList.remove('qa-locked');
    this.el.remove(); this.el = null;
    if (active === this) active = null;
    this.onClose?.();
  }

  /* ---------------------------------------------------------------- data */

  refresh(fromStore = false) {
    if (!this.el) return;
    let view;
    try { view = this.getView(); if (this.nowFn) this.offset = this.nowFn() - Date.now(); }
    catch (error) { this.swap(`<section class="qa-message"><h1>Something went wrong</h1><p>${esc(error.message)}</p></section>`); return; }
    this.view = view;
    if (!view) { this.key = 'missing'; this.swap('<section class="qa-message"><h1>This competition is no longer available.</h1><p>It may have been removed or changed to another format.</p></section>'); return; }
    this.el.querySelector('.qa-top-title').textContent = view.title;
    const key = this.keyOf(view);
    if (key !== this.key) {
      this.key = key; this.marks = {};
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
    const ph = v.phase, node = this.el.querySelector('.qa-top-meta');
    const parts = [];
    if (ph.index !== undefined) parts.push(`<span class="qa-meta-pill">Question ${ph.index + 1} / ${v.questionCount}</span>`);
    parts.push(`<span class="qa-meta-pill"><b>${v.players.length}</b> ${v.players.length === 1 ? 'player' : 'players'}</span>`);
    const html = parts.join('');
    if (node.innerHTML !== html) node.innerHTML = html;
  }

  announce(v) {
    const ph = v.phase, sr = this.el.querySelector('.qa-sr');
    const text = ph.phase === 'preview' ? `Question ${ph.index + 1} of ${v.questionCount}: ${v.question.text}`
      : ph.phase === 'answer' ? (this.mode === 'player' && v.me.answers[ph.index] ? 'Answer locked in.' : 'Answers are open.')
      : ph.phase === 'reveal' ? `Correct answer: ${v.question.options[v.question.answer]}`
      : ph.phase === 'podium' ? `Final results. ${v.standings[0] ? `${v.standings[0].name} wins with ${num(v.standings[0].score)} points.` : ''}`
      : ph.phase === 'intro' ? 'Get ready. The first question is coming.' : '';
    sr.textContent = text;
  }

  /* -------------------------------------------------------------- scenes */

  swap(html) {
    const old = [...this.stage.children];
    const scene = document.createElement('div');
    scene.className = 'qa-scene';
    scene.innerHTML = html;
    old.forEach(n => { n.classList.add('is-leaving'); n.setAttribute('aria-hidden', 'true'); n.inert = true; setTimeout(() => n.remove(), reduced() ? 0 : 420); });
    this.stage.append(scene);
  }

  scene(v) {
    const ph = v.phase.phase;
    if (ph === 'draft') return '<section class="qa-message"><h1>This round is still a draft.</h1><p>Publish it from the workspace to open the lobby.</p></section>';
    if (ph === 'cancelled') return '<section class="qa-message"><h1>This competition was cancelled.</h1><p>The organizer cancelled the round. Nothing was scored.</p></section>';
    if (ph === 'lobby') return this.lobby(v);
    if (ph === 'intro') return this.intro(v);
    if (ph === 'preview') return this.preview(v);
    if (ph === 'answer') return this.answering(v);
    if (ph === 'reveal') return this.reveal(v);
    if (ph === 'scores') return this.scores(v);
    return this.podium(v);
  }

  joinBox(v, compact = false) {
    if (this.mode !== 'player' || v.me.joined) return '';
    if (v.me.blocker) return `<p class="qa-note">${esc(v.me.blocker)}</p>`;
    return `<form class="qa-join${compact ? ' is-compact' : ''}" data-qa-form="join"><label class="qa-consent"><input type="checkbox" name="consent" required><span>Show my name and score on the leaderboard</span></label>
      <button class="qa-cta" type="submit">${compact ? 'Join and play the next question' : 'Join the room'}</button><p class="qa-error" role="alert" hidden></p></form>`;
  }

  lobby(v) {
    const t = this.now();
    const where = v.initiative ? `${esc(v.organizer)} · ${esc(v.initiative.title)}` : esc(v.organizer);
    const player = this.mode === 'player';
    const status = player ? v.me.joined
      ? `<div class="qa-you-in"><span class="qa-pulse" aria-hidden="true"></span><div><strong>You’re in!</strong><span>See your name on screen? Keep this window open — the first question appears by itself at the start time.</span></div></div>`
      : this.joinBox(v)
      : `<div class="qa-host-hint"><strong>How players join</strong><span>Explore → My Initiatives → ${esc(v.initiative?.title || 'their initiative')} → Competitions → <em>${esc(v.title)}</em>. Keep this screen open on the projector; it moves on by itself.</span></div>`;
    return `<section class="qa-lobby">
      <div class="qa-lobby-intro">
        <p class="qa-kicker">${where}</p>
        <h1 class="qa-hero">${esc(v.title)}</h1>
        ${v.description ? `<p class="qa-lede">${esc(v.description)}</p>` : ''}
        <ul class="qa-facts"><li><b>${v.questionCount}</b> questions</li><li><b>4</b> answers each</li><li><b>1,000</b> points max per question</li></ul>
        ${status}
      </div>
      <div class="qa-countdown" role="timer" aria-label="Time until the round starts">
        <span class="qa-orbit" aria-hidden="true"></span><span class="qa-orbit is-inner" aria-hidden="true"></span>
        <small>STARTS IN</small><strong data-qa-count>${clock(v.startAt - t)}</strong><time>${esc(when(v.startAt))}</time>
      </div>
      <div class="qa-players">
        <div class="qa-players-head"><strong><span data-qa-pcount>${v.players.length}</span> in the room</strong><span>${v.players.length ? 'Waiting for the start time' : 'Waiting for the first player…'}</span></div>
        <ul class="qa-chips" data-qa-chips>${v.players.map((p, i) => this.chip(p, i, v)).join('')}</ul>
      </div>
    </section>`;
  }

  chip(p, i, v) {
    const me = this.mode === 'player' && p.id === v.me.personId;
    return `<li class="qa-chip${me ? ' is-me' : ''}" data-id="${esc(p.id)}" style="--h:${hue(p.name)};--i:${Math.min(i, 12)}"><span class="qa-avatar">${initials(p.name)}</span>${esc(p.name)}${me ? '<em>you</em>' : ''}</li>`;
  }

  intro(v) {
    const left = Math.max(1, Math.ceil((v.phase.endsAt - this.now()) / 1000));
    return `<section class="qa-intro"><p class="qa-kicker">Get ready</p><h1 class="qa-hero">${esc(v.title)}</h1>
      <div class="qa-big" aria-hidden="true"><span class="qa-big-ring"></span><b data-qa-big>${Math.min(left, 5)}</b></div>
      <p class="qa-lede">${v.questionCount} questions · answer quickly — correct and fast scores the most.</p>
      ${this.mode === 'player' && !v.me.joined ? this.joinBox(v, true) : ''}</section>`;
  }

  preview(v) {
    const q = v.question, total = v.phase.endsAt - v.phase.startsAt, elapsed = Math.max(0, this.now() - v.phase.startsAt);
    return `<section class="qa-preview"><span class="qa-qnum">Question ${q.index + 1} <i>of ${v.questionCount}</i></span>
      <h1 class="qa-question-big">${esc(q.text)}</h1>
      <div class="qa-readbar" aria-hidden="true"><i style="animation-duration:${total}ms;animation-delay:-${elapsed}ms"></i></div>
      <p class="qa-hint">${q.options.length} answers · ${q.seconds} seconds</p></section>`;
  }

  timer(v) {
    const total = v.phase.endsAt - v.phase.startsAt, elapsed = Math.max(0, this.now() - v.phase.startsAt);
    return `<div class="qa-timer" role="timer" aria-label="Seconds left"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="qa-timer-track" cx="60" cy="60" r="52"/><circle class="qa-timer-bar" cx="60" cy="60" r="52" style="stroke-dasharray:${RING};animation-duration:${total}ms;animation-delay:-${elapsed}ms"/></svg><strong data-qa-sec>${Math.ceil((total - elapsed) / 1000)}</strong></div>`;
  }

  tiles(v, {interactive = false, reveal = false, chosen = null} = {}) {
    const q = v.question;
    return `<div class="qa-tiles${reveal ? ' is-reveal' : ''}" data-count="${q.options.length}">${q.options.map((o, i) => {
      const state = reveal ? (i === q.answer ? ' is-correct' : ' is-wrong') : '';
      const mine = chosen === i ? ' is-chosen' : '';
      const inner = `<span class="qa-shape">${SHAPES[i]}</span><span class="qa-tile-text">${esc(o)}</span>${reveal ? `<span class="qa-tile-mark">${i === q.answer ? CHECK : CROSS}</span>` : ''}${mine && reveal ? '<span class="qa-tile-you">Your answer</span>' : ''}`;
      return interactive
        ? `<button type="button" class="qa-tile qa-t${i}" data-qa-choice="${i}" style="--i:${i}" aria-label="Answer ${LETTERS[i]} (${SHAPE_NAMES[i]}): ${esc(o)}"><kbd aria-hidden="true">${i + 1}</kbd>${inner}</button>`
        : `<div class="qa-tile qa-t${i}${state}${mine}" style="--i:${i}">${inner}</div>`;
    }).join('')}</div>`;
  }

  answering(v) {
    const q = v.question, player = this.mode === 'player';
    const mine = player ? v.me.answers[q.index] : null;
    if (player && mine) {
      return `<section class="qa-locked-scene"><div class="qa-locked-tile qa-t${mine.choice}"><span class="qa-shape">${SHAPES[mine.choice]}</span></div>
        <h1>Answer locked in</h1><p class="qa-lede">${esc(q.options[mine.choice])}</p>
        <div class="qa-wait"><span class="qa-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Waiting for the timer… <b data-qa-sec>${Math.ceil((v.phase.endsAt - this.now()) / 1000)}</b>s</span></div></section>`;
    }
    const canPlay = player && v.me.joined;
    return `<section class="qa-answer">
      <div class="qa-answer-head"><span class="qa-qnum">Question ${q.index + 1} <i>of ${v.questionCount}</i></span><h1 class="qa-question">${esc(q.text)}</h1></div>
      <div class="qa-answer-mid">${this.timer(v)}
        ${player ? `<div class="qa-side-stat"><b>${canPlay ? 'Tap fast' : 'Watching'}</b><span>${canPlay ? 'Up to 1,000 points' : 'Join to score points'}</span></div>`
          : `<div class="qa-side-stat"><b data-qa-answered>${v.answeredCount}</b><span>of ${v.players.length} answered</span></div>`}
      </div>
      ${this.tiles(v, {interactive: canPlay})}
      ${player && !v.me.joined ? this.joinBox(v, true) : ''}
      <p class="qa-error qa-float-error" role="alert" hidden></p></section>`;
  }

  verdict(v) {
    const q = v.question, mine = v.me.answers[q.index];
    const me = v.standings.find(r => r.personId === v.me.personId);
    const kind = !mine ? 'missed' : mine.correct ? 'correct' : 'wrong';
    const title = {correct: 'Correct', wrong: 'Not this time', missed: 'Time’s up'}[kind];
    const icon = kind === 'correct' ? CHECK : CROSS;
    const streak = me?.streak > 1 ? `<span class="qa-streak">${FLAME} Answer streak ${me.streak}</span>` : '';
    return `<div class="qa-verdict is-${kind}"><span class="qa-verdict-icon">${icon}</span><div><strong>${title}</strong>${kind === 'correct' ? `<span class="qa-gain">+${num(mine.points)}</span>` : `<span class="qa-gain is-zero">+0</span>`}</div>${streak}</div>`;
  }

  reveal(v) {
    const q = v.question, player = this.mode === 'player' && v.me.joined;
    const max = Math.max(1, ...v.distribution);
    const bars = `<div class="qa-dist" aria-label="How players answered">${q.options.map((_, i) => `<div class="qa-bar qa-t${i}${i === q.answer ? ' is-correct' : ''}" style="--i:${i}"><b>${v.distribution[i]}</b><span class="qa-bar-col" style="--h:${Math.max(6, v.distribution[i] / max * 100)}%"></span><span class="qa-bar-foot">${SHAPES[i]}${i === q.answer ? CHECK : ''}</span></div>`).join('')}</div>`;
    const chosen = player ? v.me.answers[q.index]?.choice ?? null : null;
    return `<section class="qa-reveal${player ? ' is-player' : ''}">
      <div class="qa-answer-head"><span class="qa-qnum">Question ${q.index + 1} <i>of ${v.questionCount}</i></span><h1 class="qa-question">${esc(q.text)}</h1></div>
      ${player ? this.verdict(v) : bars}
      ${this.tiles(v, {reveal: true, chosen})}
    </section>`;
  }

  board(v, rows, limit = 5) {
    const prevIndex = new Map(v.previous.map((r, i) => [r.personId, i]));
    const top = rows.slice(0, limit);
    const meRow = this.mode === 'player' ? rows.find(r => r.personId === v.me.personId) : null;
    if (meRow && !top.includes(meRow)) top.push(meRow);
    return `<ol class="qa-board">${top.map((r, i) => {
      const from = prevIndex.has(r.personId) ? Math.min(6, Math.max(-6, prevIndex.get(r.personId) - i)) : 0;
      const before = v.previous.find(p => p.personId === r.personId)?.score ?? 0;
      const me = meRow && r.personId === meRow.personId;
      return `<li class="qa-row${me ? ' is-me' : ''}${r.rank === 1 ? ' is-first' : ''}" style="--from:${from};--i:${i};--h:${hue(r.name)}"><span class="qa-rank">${r.rank}</span><span class="qa-avatar">${initials(r.name)}</span><span class="qa-name">${esc(r.name)}${me ? ' <em>you</em>' : ''}</span>${r.last?.points ? `<span class="qa-delta">+${num(r.last.points)}</span>` : ''}${r.streak > 1 ? `<span class="qa-row-streak" title="Answer streak">${FLAME}${r.streak}</span>` : ''}<strong class="qa-score" data-qa-from="${before}" data-qa-to="${r.score}">${num(before)}</strong></li>`;
    }).join('')}</ol>`;
  }

  standing(v) {
    if (this.mode !== 'player' || !v.me.joined) return '';
    const rows = v.standings, i = rows.findIndex(r => r.personId === v.me.personId);
    if (i < 0) return '';
    const me = rows[i];
    if (i === 0) return `<p class="qa-standing is-lead">${CROWN}<span>You’re in the lead${rows[1] ? ` by <b>${num(me.score - rows[1].score)}</b> points` : ''}.</span></p>`;
    const ahead = rows[i - 1];
    return `<p class="qa-standing"><span>You’re in <b>${ordinal(me.rank)}</b> place · <b>${num(ahead.score - me.score)}</b> points behind ${esc(ahead.name)}</span></p>`;
  }

  scores(v) {
    return `<section class="qa-scores"><p class="qa-kicker">Scoreboard</p><h1 class="qa-title">After question ${v.phase.index + 1}</h1>
      ${v.standings.length ? this.board(v, v.standings) : '<p class="qa-lede">No answers yet — the next question is on its way.</p>'}
      ${this.standing(v)}<p class="qa-next"><span class="qa-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Next question in <b data-qa-sec>${Math.ceil((v.phase.endsAt - this.now()) / 1000)}</b>s</span></p></section>`;
  }

  podium(v) {
    const rows = v.standings, [first, second, third] = rows;
    const settled = this.now() - v.phase.startsAt > 15000;
    const step = (r, place) => `<div class="qa-step qa-step-${place}${r ? '' : ' is-empty'}">
        <div class="qa-step-person">${r ? `${place === 1 ? `<span class="qa-crown">${CROWN}</span>` : ''}<span class="qa-avatar" style="--h:${hue(r.name)}">${initials(r.name)}</span><strong>${esc(r.name)}</strong><span class="qa-step-score" data-qa-from="0" data-qa-to="${r.score}">0</span><small>${r.correct} of ${v.questionCount} correct</small>` : '<small>Empty</small>'}</div>
        <div class="qa-step-block"><b>${place}</b></div></div>`;
    const me = this.mode === 'player' ? rows.find(r => r.personId === v.me.personId) : null;
    const rest = rows.slice(3);
    return `<section class="qa-final${settled ? ' is-settled' : ''}"><p class="qa-kicker">Final results</p><h1 class="qa-title">${esc(v.title)}</h1>
      ${rows.length ? `<div class="qa-podium">${step(second, 2)}${step(first, 1)}${step(third, 3)}</div>` : '<p class="qa-lede">Nobody played this round.</p>'}
      ${me ? `<div class="qa-myresult"><strong>You finished ${ordinal(me.rank)} of ${rows.length}</strong><span>${me.correct} of ${v.questionCount} correct · ${num(me.score)} points</span></div>`
        : this.mode === 'player' ? '<p class="qa-note">You didn’t play this round.</p>' : ''}
      ${rest.length ? `<details class="qa-rest"${this.mode === 'host' ? ' open' : ''}><summary>Everyone else (${rest.length})</summary><ol start="4">${rest.map(r => `<li><span class="qa-name">${esc(r.name)}</span><span>${r.correct}/${v.questionCount}</span><b>${num(r.score)}</b></li>`).join('')}</ol></details>` : ''}
      <button type="button" class="qa-cta is-quiet" data-qa="close">Close</button></section>`;
  }

  /* ---------------------------------------------------- motion & updates */

  entered(v) {
    this.timers.forEach(clearTimeout); this.timers = [];
    const scene = this.stage.lastElementChild;
    const ph = v.phase.phase;
    if (ph === 'scores') this.later(() => this.countUp(scene, '.qa-score', 900), reduced() ? 0 : 650);
    if (ph === 'podium') {
      const settled = scene.querySelector('.qa-final.is-settled');
      this.later(() => this.countUp(scene, '.qa-step-score', 1200), settled || reduced() ? 0 : 1900);
      if (!settled && v.standings.length) this.later(() => this.confetti(), 2500);
    }
  }

  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }

  countUp(scene, selector, duration) {
    const nodes = [...scene.querySelectorAll(selector)];
    if (!nodes.length) return;
    const start = performance.now();
    const run = t => {
      const k = reduced() ? 1 : Math.min(1, (t - start) / duration), ease = 1 - Math.pow(1 - k, 3);
      nodes.forEach(n => { const a = Number(n.dataset.qaFrom), b = Number(n.dataset.qaTo); n.textContent = num(a + (b - a) * ease); });
      if (k < 1 && scene.isConnected) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  patch(v) {
    const chips = this.stage.lastElementChild?.querySelector('[data-qa-chips]');
    if (chips) {
      const have = new Set([...chips.children].map(n => n.dataset.id));
      v.players.forEach((p, i) => { if (!have.has(p.id)) chips.insertAdjacentHTML('beforeend', this.chip(p, 0, v)); });
      const count = this.stage.lastElementChild.querySelector('[data-qa-pcount]'); if (count) count.textContent = v.players.length;
    }
    const answered = this.stage.lastElementChild?.querySelector('[data-qa-answered]');
    if (answered && answered.textContent !== String(v.answeredCount)) { answered.textContent = v.answeredCount; answered.classList.remove('is-bump'); void answered.offsetWidth; answered.classList.add('is-bump'); }
  }

  tick() {
    const v = this.view;
    if (!v || !this.el) return;
    // Re-sync with the demo clock once a second (it can be moved from the workspace's demo panel).
    if (this.nowFn && Date.now() - (this.synced || 0) > 1000) { this.synced = Date.now(); try { this.offset = this.nowFn() - Date.now(); } catch { /* keep the last offset */ } }
    const t = this.now(), ph = v.phase;
    if (ph.endsAt && ph.endsAt !== Infinity && t >= ph.endsAt) { this.refresh(); return; }
    const scene = this.stage.lastElementChild;
    if (!scene) return;
    const set = (sel, text, mark) => { if (this.marks[mark] === text) return; this.marks[mark] = text; scene.querySelectorAll(sel).forEach(n => { n.textContent = text; }); return true; };
    if (ph.phase === 'lobby') set('[data-qa-count]', clock(ph.endsAt - t), 'count');
    if (['answer', 'scores'].includes(ph.phase)) {
      const left = Math.max(0, Math.ceil((ph.endsAt - t) / 1000));
      if (set('[data-qa-sec]', String(left), 'sec') && ph.phase === 'answer') scene.querySelector('.qa-timer')?.classList.toggle('is-urgent', left <= 5);
    }
    if (ph.phase === 'intro') {
      const left = String(Math.min(5, Math.max(1, Math.ceil((ph.endsAt - t) / 1000))));
      if (this.marks.big !== left) {
        const big = scene.querySelector('[data-qa-big]');
        if (big && this.marks.big !== undefined) { const next = big.cloneNode(); next.textContent = left; big.replaceWith(next); }
        this.marks.big = left;
      }
    }
  }

  confetti() {
    const canvas = this.el?.querySelector('.qa-confetti');
    if (!canvas || reduced()) return;
    const ctx = canvas.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
    const colors = ['#e2483d', '#2f6fdc', '#e3a21a', '#2e9a5a', '#f3d36b', '#cfe8c2', '#ffffff'];
    const parts = [];
    const burst = (x, y, angle, spread, count, power) => {
      for (let i = 0; i < count; i++) {
        const a = angle + (Math.random() - 0.5) * spread, v = (power * 0.55 + Math.random() * power * 0.6) * dpr;
        parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: (6 + Math.random() * 7) * dpr, h: (3 + Math.random() * 5) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length], round: Math.random() < 0.3, wob: Math.random() * 10});
      }
    };
    burst(0, H * 0.95, -Math.PI / 3, 0.7, 90, 26);
    burst(W, H * 0.95, -Math.PI * 2 / 3, 0.7, 90, 26);
    burst(W / 2, H * 0.32, -Math.PI / 2, Math.PI * 1.6, 70, 15);
    const start = performance.now();
    const draw = t => {
      if (!this.el) return;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of parts) {
        p.vy += 0.42 * dpr; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx + Math.sin((t / 200) + p.wob) * 0.6 * dpr; p.y += p.vy; p.r += p.vr;
        if (p.y < H + 40) alive++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + dpr);
        ctx.restore();
      }
      if (alive && t - start < 6000) requestAnimationFrame(draw); else ctx.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(draw);
  }

  /* --------------------------------------------------------------- input */

  async choose(choice) {
    const v = this.view;
    if (this.mode !== 'player' || !v?.me.joined || v.phase.phase !== 'answer' || v.me.answers[v.phase.index] || this.busy) return;
    this.busy = true;
    const button = this.stage.lastElementChild?.querySelector(`[data-qa-choice="${choice}"]`);
    button?.classList.add('is-pressed');
    try { await this.answerFn(v.phase.index, choice); }
    catch (error) { const n = this.stage.lastElementChild?.querySelector('.qa-float-error'); if (n) { n.textContent = error.message; n.hidden = false; } }
    finally { this.busy = false; this.refresh(); }
  }

  onClick(e) {
    if (e.target === this.el) return;
    const choice = e.target.closest('[data-qa-choice]');
    if (choice) { this.choose(Number(choice.dataset.qaChoice)); return; }
    if (e.target.closest('[data-qa="close"]')) this.close();
  }

  async onSubmit(e) {
    const form = e.target.closest('[data-qa-form="join"]');
    if (!form) return;
    e.preventDefault();
    const error = form.querySelector('.qa-error');
    try { await this.joinFn(form.elements.consent.checked); this.refresh(); }
    catch (x) { error.textContent = x.message; error.hidden = false; }
  }

  onKey(e) {
    if (e.target.matches?.('input, textarea')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4 && this.view?.phase.phase === 'answer' && n <= (this.view.question?.options.length || 0)) { e.preventDefault(); this.choose(n - 1); }
  }
}
