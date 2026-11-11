/**
 * Live quiz competitions in the Institution and Supervisor workspaces.
 * The Representative sees every round of the Institution; a Supervisor sees
 * and creates rounds only inside the Initiative they are working in.
 */
import * as u from '../../ui.js';
import {read} from '../../store.js';
import {nowMs} from '../../domain.js';
import {crumbs, nameOf} from '../../shared.js';
import {representativeOrg} from '../../initiative-rules.js';
import {isQuiz, quizPhase, quizStatus, quizStandings, quizSchedule, revealedThrough, SAMPLE_QUESTIONS, QUIZ} from '../../competition-rules.js';
import {quizView, visibleEntries, playerName} from '../../../shared/competition-view.js';

const SHAPES = ['▲', '◆', '●', '■'];
const SHAPE_SVG = [
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4.5 29 27.5H3Z"/></svg>',
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2.5 29.5 16 16 29.5 2.5 16Z"/></svg>',
  '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/></svg>',
  '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="3.5"/></svg>'
];
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5Z"/></svg>';
const ENDED = ['Cancelled', 'Archived', 'Completed'];
const TONE = {Scheduled: 'is-scheduled', 'Live now': 'is-live', Finished: 'is-finished', Cancelled: 'is-cancelled', Draft: 'is-draft'};
const localDemo = () => location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

function scopeOf(ctx, role, initiatives = []) {
  const {s, person: p} = ctx;
  if (role === 'supervisor') {
    const ids = new Set(initiatives.map(i => i.id));
    return {initiatives: initiatives.filter(i => !ENDED.includes(i.status)), list: s.competitions.filter(c => isQuiz(c) && ids.has(c.initiativeId))};
  }
  const org = representativeOrg(s, p.id) || s.organizations.find(o => o.memberIds.includes(p.id));
  return {initiatives: s.initiatives.filter(i => i.ownerId === org?.id && !ENDED.includes(i.status)), list: s.competitions.filter(c => c.ownerId === org?.id)};
}

const chip = label => `<span class="qz-chip ${TONE[label] || ''}">${['Live now', 'Scheduled'].includes(label) ? '<i aria-hidden="true"></i>' : ''}${u.esc(label)}</span>`;
const when = iso => new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman'}).format(new Date(iso));
const shortWhen = iso => new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman'}).format(new Date(iso));
const minutes = c => Math.max(1, Math.round((quizSchedule(c).endAt - quizSchedule(c).start) / 60000));
const hue = v => [...String(v || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 17);
const initials = name => u.esc((name || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase());
const face = (name, extra = '') => `<span class="qz-face" style="--h:${hue(name)}" ${extra}>${initials(name)}</span>`;
const stack = (names, total) => names.length ? `<span class="qz-stack">${names.slice(0, 5).map(n => face(n, `title="${u.esc(n)}"`)).join('')}${total > 5 ? `<span class="qz-face is-more">+${total - 5}</span>` : ''}</span>` : '';
const cta = (label, action, data = {}, icon = ARROW) => `<button type="button" class="qz-cta" data-action="${action}" ${Object.entries(data).map(([k, v]) => `data-${k}="${u.esc(v)}"`).join(' ')}><span>${u.esc(label)}</span><span class="qz-cta-icon">${icon}</span></button>`;
const glyphs = () => `<span class="qz-glyphs" aria-hidden="true">${SHAPE_SVG.map((s, i) => `<i class="qz-g${i}">${s}</i>`).join('')}</span>`;

/* Countdowns tick in place; when one reaches zero the page re-renders into the new state. */
let lastCtx = null, ticker = 0;
export function countdown(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), s = t % 60, p = x => String(x).padStart(2, '0');
  return d ? `${d}d ${p(h)}h ${p(m)}m` : h ? `${h}h ${p(m)}m ${p(s)}s` : `${p(m)}:${p(s)}`;
}
function ensureTicker(ctx) {
  lastCtx = ctx;
  if (ticker) return;
  ticker = setInterval(() => {
    const nodes = document.querySelectorAll('[data-qz-until]');
    if (!nodes.length) return;
    let now; try { now = nowMs(read()); } catch { return; }
    let crossed = false;
    nodes.forEach(n => { const left = Number(n.dataset.qzUntil) - now; if (left <= 0 && !n.dataset.qzDone) { n.dataset.qzDone = '1'; crossed = true; } n.textContent = countdown(left); });
    if (crossed && !document.querySelector('dialog[open]')) lastCtx?.render();
  }, 1000);
}

function summary(s, c, now) {
  const entries = visibleEntries(s, c.id, now), phase = quizPhase(c, now);
  const names = pid => playerName(s, entries.find(e => e.personId === pid) || {personId: pid});
  const standings = quizStandings(c, entries, names, revealedThrough(c, phase));
  return {entries, phase, label: quizStatus(c, now), standings, start: Date.parse(c.startAt), names: entries.map(e => playerName(s, e))};
}

/** Returns HTML, or null for a written-entry competition so the caller can show its earlier view. */
export function renderCompetitions(ctx, {role, initiatives = [], base}) {
  const {s, route: r} = ctx, scope = scopeOf(ctx, role, initiatives), now = nowMs(s);
  ensureTicker(ctx);
  if (r.id) {
    const c = scope.list.find(x => x.id === r.id);
    if (!c) return u.missing('competition');
    if (!isQuiz(c)) return null;
    return detail(ctx, c, {role, base, now});
  }
  const canCreate = scope.initiatives.length > 0;
  const quizzes = scope.list.filter(isQuiz), legacy = scope.list.filter(c => !isQuiz(c));
  const info = new Map(quizzes.map(c => [c.id, summary(s, c, now)]));
  const order = {'Live now': 0, Scheduled: 1, Draft: 2, Finished: 3, Cancelled: 4};
  const sorted = quizzes.slice().sort((a, b) => {
    const A = info.get(a.id), B = info.get(b.id);
    return (order[A.label] - order[B.label]) || (A.label === 'Finished' ? B.start - A.start : A.start - B.start);
  });
  const spotlight = sorted.find(c => ['Live now', 'Scheduled'].includes(info.get(c.id).label));
  const rest = sorted.filter(c => c !== spotlight);
  const finished = quizzes.filter(c => info.get(c.id).label === 'Finished');
  const reached = new Set(quizzes.flatMap(c => info.get(c.id).entries.map(e => e.personId))).size;
  const best = finished.map(c => info.get(c.id).standings[0]).filter(Boolean).sort((a, b) => b.score - a.score)[0];
  const actions = [
    canCreate && localDemo() ? u.button('Start a demo round', 'quiz-demo', {}, 'button quiet') : '',
    canCreate ? u.button('Create competition', 'quiz-create') : ''
  ].join('');
  const intro = role === 'supervisor'
    ? 'Run a live quiz for the students of this initiative. Everyone answers the same question at the same moment — quicker correct answers score more.'
    : 'Schedule live quizzes inside your initiatives. Everyone answers the same question at the same moment — quicker correct answers score more.';
  return `<div class="qz-page">`
    + u.header('LIVE QUIZ COMPETITIONS', 'Competitions', intro, actions)
    + `<div class="qz-bento">${spotlight ? hero(ctx, spotlight, info.get(spotlight.id), base) : emptyHero(canCreate, role)}
      <aside class="qz-shell qz-stats"><div class="qz-inner">
        <span class="qz-eyebrow">This institution</span>
        <div class="qz-stat"><b>${quizzes.filter(c => c.status === 'Published').length}</b><span>rounds published</span></div>
        <div class="qz-stat"><b>${reached}</b><span>players reached</span></div>
        <div class="qz-stat"><b>${best ? best.score.toLocaleString('en') : '—'}</b><span>${best ? `best score · ${u.esc(best.name)}` : 'best score so far'}</span></div>
        <ol class="qz-how"><li><i class="qz-g0"></i>Build the round</li><li><i class="qz-g1"></i>Players join the room</li><li><i class="qz-g2"></i>Host screen runs it live</li><li><i class="qz-g3"></i>Podium and results</li></ol>
      </div></aside></div>`
    + (rest.length ? `<div class="qz-section-head"><h2>All rounds</h2><span>${quizzes.length} live ${quizzes.length === 1 ? 'quiz' : 'quizzes'}</span></div><div class="qz-grid">${rest.map((c, i) => card(ctx, c, info.get(c.id), base, i)).join('')}</div>` : '')
    + (legacy.length ? `<div class="qz-section-head"><h2>Earlier written-entry competitions</h2><span>Kept readable</span></div><div class="qz-grid">${legacy.map((c, i) => legacyCard(ctx, c, base, i)).join('')}</div>` : '')
    + (!canCreate && role === 'organization' ? u.note('A competition is always part of an initiative. Publish or reopen an initiative first, then create its live quiz.') + u.link('Go to initiatives', 'organization/initiatives', 'button quiet') : '')
    + `</div>`;
}

function emptyHero(canCreate, role) {
  return `<section class="qz-hero is-empty"><div class="qz-hero-body">${glyphs()}<span class="qz-pill">No round scheduled</span><h2>Ready when <em>you are.</em></h2>
    <p>${canCreate ? 'Create a round — sample questions are filled in — or start a demo round to see the whole game in about a minute.' : role === 'supervisor' ? 'Rounds are created inside an initiative you supervise.' : 'Rounds are created inside a running initiative.'}</p>
    <div class="qz-hero-actions">${canCreate ? cta('Create competition', 'quiz-create') : ''}</div></div></section>`;
}

function hero(ctx, c, info, base) {
  const {s} = ctx, initiative = s.initiatives.find(i => i.id === c.initiativeId), live = info.label === 'Live now';
  return `<section class="qz-hero${live ? ' is-live' : ''}">
    <div class="qz-hero-body">${glyphs()}
      <div class="qz-hero-top"><span class="qz-pill">${live ? '<i class="qz-rec"></i>Live now' : '<i class="qz-dot"></i>Up next'}</span><span class="qz-hero-by">${u.esc(c.createdRole || 'Representative')} · ${u.esc(nameOf(s, c.createdBy))}</span></div>
      <h2>${u.esc(c.title)}</h2>
      <p>${u.esc(initiative?.title || '')}${c.description ? ` — ${u.esc(c.description)}` : ''}</p>
      <div class="qz-hero-clock">${live ? `<span class="qz-hero-label">Question in progress</span><b>${info.phase.index !== undefined ? `${info.phase.index + 1} / ${c.questions.length}` : 'Starting'}</b>` : `<span class="qz-hero-label">Kick-off in</span><b data-qz-until="${info.start}">${countdown(info.start - nowMs(s))}</b>`}<small>${u.esc(shortWhen(c.startAt))} · ${c.questions.length} questions · ~${minutes(c)} min</small></div>
      <div class="qz-hero-foot">
        <span class="qz-hero-room">${stack(info.names, info.entries.length)}<span><b>${info.entries.length}</b> in the room</span></span>
        <span class="qz-hero-actions">${cta(live ? 'Open host screen' : 'Launch host screen', 'quiz-host', {id: c.id}, PLAY)}${u.link('Details', `${base}/${c.id}`, 'qz-ghost')}</span>
      </div>
    </div></section>`;
}

function card(ctx, c, info, base, i) {
  const {s} = ctx, initiative = s.initiatives.find(x => x.id === c.initiativeId);
  const body = info.label === 'Finished'
    ? (info.standings.length ? `<div class="qz-mini-podium">${[1, 0, 2].map(k => info.standings[k] ? `<span class="qz-mp qz-mp-${k + 1}" style="--h:${hue(info.standings[k].name)}"><span class="qz-mp-name">${initials(info.standings[k].name)}</span><i></i><small>${k + 1}</small></span>` : '').join('')}</div>
        <p class="qz-winner"><span>Winner</span><b>${u.esc(info.standings[0].name)}</b><em>${info.standings[0].score.toLocaleString('en')} pts</em></p>` : '<p class="qz-muted">Nobody played this round.</p>')
    : info.label === 'Scheduled' ? `<p class="qz-card-clock"><span>Starts in</span><b data-qz-until="${info.start}">${countdown(info.start - nowMs(s))}</b></p>`
    : info.label === 'Draft' ? '<p class="qz-muted">Draft — players can’t see it yet. Publish it from the details page.</p>'
    : info.label === 'Cancelled' ? '<p class="qz-muted">Cancelled. Nothing was scored.</p>' : '';
  return `<article class="qz-card ${TONE[info.label] || ''}" style="--i:${i}"><div class="qz-card-inner">
    <div class="qz-card-top">${chip(info.label)}<span class="qz-card-by">${u.esc(c.createdRole || 'Representative')}</span></div>
    <h3>${u.esc(c.title)}</h3><p class="qz-card-sub">${u.esc(initiative?.title || 'No initiative (earlier round)')} · ${u.esc(shortWhen(c.startAt))} · ${c.questions.length} questions</p>
    ${body}
    <div class="qz-card-foot"><span class="qz-card-meta" title="${info.entries.length} ${info.entries.length === 1 ? 'player' : 'players'}">${info.entries.length ? stack(info.names, info.entries.length) : '<span>No players yet</span>'}</span>
      <span class="qz-card-actions">${c.status === 'Published' && info.label !== 'Cancelled' ? `<button type="button" class="qz-icon-btn" data-action="quiz-host" data-id="${u.esc(c.id)}" aria-label="${info.label === 'Finished' ? 'Show the podium' : 'Open host screen'} for ${u.esc(c.title)}" title="${info.label === 'Finished' ? 'Show the podium' : 'Host screen'}">${PLAY}</button>` : ''}${u.link('Open', `${base}/${c.id}`, 'qz-ghost')}</span></div>
  </div></article>`;
}

function legacyCard(ctx, c, base, i) {
  return `<article class="qz-card is-legacy" style="--i:${i}"><div class="qz-card-inner"><div class="qz-card-top">${chip(c.resultsPublished ? 'Finished' : 'Written entries')}</div><h3>${u.esc(c.title)}</h3><p class="qz-card-sub">Earlier written-entry format · deadline ${u.date(c.deadline)}</p><div class="qz-card-foot"><span class="qz-card-meta"><span>${ctx.s.entries.filter(e => e.competitionId === c.id).length} entries</span></span><span class="qz-card-actions">${u.link('Open', `${base}/${c.id}`, 'qz-ghost')}</span></div></div></article>`;
}

function detail(ctx, c, {role, base, now}) {
  const {s} = ctx, info = summary(s, c, now), phase = info.phase, label = info.label;
  const initiative = s.initiatives.find(i => i.id === c.initiativeId);
  const editable = c.status === 'Draft' || (c.status === 'Published' && phase.phase === 'lobby');
  const lead = Math.max(1, info.standings[0]?.score || 1);
  const actions = [
    c.status === 'Published' && label !== 'Cancelled' ? cta(phase.phase === 'podium' ? 'Show the podium' : 'Open host screen', 'quiz-host', {id: c.id}, PLAY) : '',
    editable ? u.button(c.status === 'Draft' ? 'Edit and publish' : 'Edit round', 'quiz-edit', {id: c.id}, 'button quiet') : '',
    c.status !== 'Cancelled' && phase.phase !== 'podium' ? u.button('Cancel round', 'quiz-cancel', {id: c.id}, 'button quiet') : ''
  ].join('');
  const clock = label === 'Scheduled' ? `<span class="qz-hero-label">Kick-off in</span><b data-qz-until="${info.start}">${countdown(info.start - now)}</b>`
    : label === 'Live now' ? `<span class="qz-hero-label">Live</span><b>${phase.index !== undefined ? `Question ${phase.index + 1} / ${c.questions.length}` : 'Starting'}</b>`
    : label === 'Finished' && info.standings[0] ? `<span class="qz-hero-label">Winner</span><b>${u.esc(info.standings[0].name)}</b>`
    : `<span class="qz-hero-label">${u.esc(label)}</span><b>${label === 'Draft' ? 'Not published' : 'Called off'}</b>`;
  const room = phase.phase === 'lobby' || phase.phase === 'draft'
    ? (info.entries.length ? `<ul class="qz-roster">${info.entries.map((e, i) => `<li style="--i:${i}">${face(playerName(s, e))}<span><b>${u.esc(playerName(s, e))}</b><small>${e.demo ? 'Demo player · ' : ''}joined ${u.esc(shortWhen(e.created))}</small></span></li>`).join('')}</ul>`
      : `<div class="qz-empty">${glyphs()}<strong>Nobody has joined yet.</strong><p>Accepted participants were notified. They join from Explore → My Initiatives.</p></div>`)
    : (info.standings.length ? `${phase.phase === 'podium' ? `<div class="qz-podium">${[1, 0, 2].map(k => info.standings[k] ? `<div class="qz-pod qz-pod-${k + 1}">${face(info.standings[k].name)}<b>${u.esc(info.standings[k].name)}</b><small>${info.standings[k].score.toLocaleString('en')} pts</small><span class="qz-pod-block">${k + 1}</span></div>` : '').join('')}</div>` : ''}
        <ol class="qz-board">${info.standings.map((row, i) => `<li style="--i:${i};--pct:${Math.max(.03, row.score / lead)};--h:${hue(row.name)}"><span class="qz-board-bar" aria-hidden="true"></span><span class="qz-board-rank">${row.rank}</span>${face(row.name)}<span class="qz-board-name">${u.esc(row.name)}</span><span class="qz-board-correct">${row.correct}/${c.questions.length}</span><b>${row.score.toLocaleString('en')}</b></li>`).join('')}</ol>`
      : `<div class="qz-empty">${glyphs()}<strong>Nobody played this round.</strong><p>Results appear here as players answer.</p></div>`);
  return crumbs('Competitions', base)
    + `<div class="qz-page"><section class="qz-hero is-detail${label === 'Live now' ? ' is-live' : ''}"><div class="qz-hero-body">${glyphs()}
        <div class="qz-hero-top">${chip(label)}<span class="qz-hero-by">${u.esc(initiative?.title || 'No initiative (earlier round)')} · created by ${u.esc(nameOf(s, c.createdBy))} (${u.esc(c.createdRole || 'Representative')})</span></div>
        <h1>${u.esc(c.title)}</h1>${c.description ? `<p>${u.esc(c.description)}</p>` : ''}
        <div class="qz-hero-split"><div class="qz-hero-clock">${clock}</div>
          <dl class="qz-hero-facts"><div><dt>Starts</dt><dd>${u.esc(when(c.startAt))}</dd></div><div><dt>Length</dt><dd>~${minutes(c)} min</dd></div><div><dt>Questions</dt><dd>${c.questions.length}</dd></div><div><dt>${phase.phase === 'lobby' ? 'In the room' : 'Players'}</dt><dd>${info.entries.length}</dd></div></dl></div>
        <div class="qz-hero-actions">${actions}</div>
      </div></section>
      <div class="qz-detail-grid">
        <section class="qz-shell"><div class="qz-inner"><div class="qz-panel-head"><h2>${phase.phase === 'lobby' || phase.phase === 'draft' ? 'In the room' : phase.phase === 'podium' ? 'Final results' : 'Live results'}</h2><span>${info.entries.length} ${info.entries.length === 1 ? 'player' : 'players'}</span></div>${room}</div></section>
        <section class="qz-shell"><div class="qz-inner"><div class="qz-panel-head"><h2>Questions</h2><span>${c.questions.length} · only you can see the answers</span></div>
          <ol class="qz-questions">${c.questions.map((q, i) => `<li style="--i:${i}"><div class="qz-q-head"><b>${String(i + 1).padStart(2, '0')}</b><strong>${u.esc(q.text)}</strong><small>${q.seconds}s</small></div>
            <ul class="qz-q-tiles">${q.options.map((o, k) => `<li class="qz-qt qz-qt${k}${k === q.answer ? ' is-correct' : ''}"><span class="qz-qt-shape">${SHAPE_SVG[k]}</span><span>${u.esc(o)}</span>${k === q.answer ? '<em aria-label="Correct answer">✓</em>' : ''}</li>`).join('')}</ul></li>`).join('')}</ol></div></section>
      </div>
      <p class="qz-foot-note">Scoring: a correct answer earns 500–1,000 points — the faster, the more. Wrong or missed answers earn 0. Rounds and results are saved in this browser only.</p></div>`;
}

/* ------------------------------------------------------------ builder */

let qid = 0;
function questionBlock(q = {}, n = 0) {
  const k = ++qid, options = [...(q.options || []), '', '', '', ''].slice(0, 4), answer = Number.isInteger(q.answer) ? q.answer : 0;
  return `<li class="qb-q" data-qb-q="${k}"><div class="qb-q-head"><strong>Question <span data-qb-n>${n + 1}</span></strong>
    <label class="qb-seconds"><span class="sr-only">Timer</span><select name="qs-${k}">${QUIZ.SECONDS.map(sec => `<option value="${sec}" ${Number(q.seconds || 20) === sec ? 'selected' : ''}>${sec} seconds</option>`).join('')}</select></label>
    <button type="button" class="button quiet small" data-qb-remove aria-label="Remove this question">Remove</button></div>
    <label class="field"><span>Question <span class="required">*</span></span><input name="qt-${k}" maxlength="160" required value="${u.esc(q.text || '')}" placeholder="Type the question players will see"></label>
    <fieldset class="qb-options"><legend>Answers — pick the correct one</legend>${options.map((o, i) => `<label class="qb-opt qb-o${i}"><input type="radio" name="qa-${k}" value="${i}" ${i === answer ? 'checked' : ''} aria-label="Mark answer ${i + 1} as correct"><span class="qb-shape" aria-hidden="true">${SHAPES[i]}</span><input name="qo-${k}-${i}" maxlength="75" value="${u.esc(o)}" placeholder="Answer ${i + 1}${i > 1 ? ' (optional)' : ''}" ${i < 2 ? 'required' : ''} aria-label="Answer ${i + 1}"></label>`).join('')}</fieldset></li>`;
}

function builder(ctx, {role, c, initiatives}) {
  const scope = scopeOf(ctx, role, initiatives);
  const start = c ? new Date(c.startAt) : new Date(nowMs(ctx.s) + 3600000);
  const local = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(start).reduce((m, p) => ({...m, [p.type]: p.value}), {});
  // Every round belongs to one Initiative (forms.Form requires an owner): only its
  // accepted participants can join, and they are the ones notified on publish.
  const list = scope.initiatives.slice();
  const current = c?.initiativeId && ctx.s.initiatives.find(i => i.id === c.initiativeId);
  if (current && !list.some(i => i.id === current.id)) list.unshift(current);
  const chosen = c?.initiativeId || (list.some(i => i.id === ctx.localUI.initiativeId) ? ctx.localUI.initiativeId : list.length === 1 ? list[0].id : '');
  const players = i => (ctx.s.admissions || []).filter(a => a.initiativeId === i.id && a.status === 'Accepted').length;
  const pick = i => `<label class="qz-pick-opt"><input type="radio" name="initiativeId" value="${u.esc(i.id)}" required ${i.id === chosen ? 'checked' : ''}><span class="qz-pick-body"><b>${u.esc(i.title)}</b><small>${u.esc(`${u.date(i.start)} – ${u.date(i.end)}`)} · ${players(i)} accepted ${players(i) === 1 ? 'player' : 'players'}</small></span><span class="qz-pick-tick" aria-hidden="true">${u.icon('check')}</span></label>`;
  const step = (n, title, lead, body) => `<section class="qz-step"><header><span>${n}</span><div><h3>${title}</h3>${lead ? `<p>${lead}</p>` : ''}</div></header>${body}</section>`;
  const questions = c ? c.questions : SAMPLE_QUESTIONS;
  qid = 0;
  return step(1, 'Which initiative is this round for?', 'Only accepted participants of this initiative can join the room. They are notified when you publish.',
      `<fieldset class="qz-pick"><legend class="sr-only">Initiative</legend><div class="qz-pick-list">${list.map(pick).join('')}</div>${c && !c.initiativeId ? '<p class="qz-pick-warn">This earlier round had no initiative. Choose one to save it.</p>' : ''}</fieldset>`)
    + step(2, 'Name and time', '',
      u.field('title', 'Competition name', c?.title || '', 'text', true, 'maxlength="90" placeholder="e.g. Focus Sprint Live Quiz"')
      + u.area('description', 'Short description (optional)', c?.description || '')
      + `<div class="form-grid">${u.field('date', 'Start date', `${local.year}-${local.month}-${local.day}`, 'date', true)}${u.field('time', 'Start time (Amman)', `${local.hour}:${local.minute}`, 'time', true)}</div>`)
    + step(3, 'Questions', c ? 'Edit the round.' : 'Sample questions are filled in — edit, remove or add your own.',
      `<div class="qb" data-quiz-builder><ol class="qb-list">${questions.map((q, i) => questionBlock(q, i)).join('')}</ol><button type="button" class="button quiet" data-qb-add>${u.icon('plus')}Add question</button></div>`)
    + step(4, 'Publication', '',
      `<fieldset class="qz-seg"><legend class="sr-only">Publication</legend>${[['Published', 'Publish now', 'Open the lobby and notify players'], ['Draft', 'Save as draft', 'Only your team can see it']].map(([v, t, sub]) => `<label><input type="radio" name="status" value="${v}" ${(c?.status === 'Draft') === (v === 'Draft') ? 'checked' : ''}><span><b>${t}</b><small>${sub}</small></span></label>`).join('')}</fieldset>`);
}

function bindBuilder() {
  const root = document.querySelector('#dialog-body [data-quiz-builder]');
  if (!root) return;
  const renumber = () => root.querySelectorAll('[data-qb-n]').forEach((n, i) => { n.textContent = i + 1; });
  root.addEventListener('click', e => {
    if (e.target.closest('[data-qb-add]')) {
      const list = root.querySelector('.qb-list');
      if (list.children.length >= QUIZ.MAX_QUESTIONS) return u.toast(`A round can have up to ${QUIZ.MAX_QUESTIONS} questions.`, true);
      list.insertAdjacentHTML('beforeend', questionBlock({}, list.children.length));
      list.lastElementChild.querySelector('input[name^="qt-"]').focus();
    }
    const remove = e.target.closest('[data-qb-remove]');
    if (remove) {
      if (root.querySelectorAll('[data-qb-q]').length === 1) return u.toast('A round needs at least one question.', true);
      remove.closest('[data-qb-q]').remove(); renumber();
    }
  });
}

function collect(form, v) {
  const questions = [...form.querySelectorAll('[data-qb-q]')].map(block => {
    const k = block.dataset.qbQ;
    return {text: form.elements[`qt-${k}`].value, seconds: Number(form.elements[`qs-${k}`].value), answer: Number(block.querySelector(`input[name="qa-${k}"]:checked`)?.value ?? -1), options: [0, 1, 2, 3].map(i => form.elements[`qo-${k}-${i}`].value)};
  });
  return {title: v.title, description: v.description, initiativeId: v.initiativeId || null, status: v.status, startAt: `${v.date}T${v.time}:00+03:00`, questions};
}

/* ------------------------------------------------------------ actions */

const storageSubscribe = fn => { const on = e => { if (e.key === 'deepsprout-ecosystem-demo-v1') fn(); }; window.addEventListener('storage', on); return () => window.removeEventListener('storage', on); };

export function openHost(id) {
  return import('../../../shared/quiz-arena.js').then(({openArena}) => openArena({
    mode: 'host',
    getView: () => { const s = read(); return quizView(s, id, null, nowMs(s)); },
    now: () => nowMs(read()),
    subscribe: storageSubscribe,
    onClose: () => lastCtx?.render()
  }));
}

export function competitionAction(action, target, ctx, {role, initiatives = [], base}) {
  if (!['quiz-create', 'quiz-edit', 'quiz-host', 'quiz-cancel', 'quiz-demo'].includes(action)) return false;
  const d = target.dataset, c = d.id ? ctx.s.competitions.find(x => x.id === d.id) : null;
  if (action === 'quiz-host') { openHost(d.id); return true; }
  if (action === 'quiz-cancel') {
    u.confirm('Cancel this round?', 'Players who joined are told it was cancelled. The round cannot be restarted; create a new one instead.', () => { ctx.run(`${role}.quiz.cancel`, {id: d.id}, 'Round cancelled.'); ctx.render(); });
    return true;
  }
  const scope = scopeOf(ctx, role, initiatives);
  if (action === 'quiz-demo') {
    const initiative = scope.initiatives.find(i => i.id === ctx.localUI.initiativeId) || scope.initiatives[0];
    if (!initiative) throw new Error('A demo round needs a running initiative.');
    const id = ctx.run(`${role}.quiz.demo`, {initiativeId: initiative.id}, 'Demo round created — it starts in about a minute. Eight demo players are joining.');
    ctx.go(`${base}/${id}`);
    openHost(id);
    return true;
  }
  if (!c && !scope.initiatives.length) throw new Error(role === 'supervisor' ? 'You need an active Initiative assignment to create a competition.' : 'Publish or reopen an initiative first. Every competition belongs to one.');
  u.modal(c ? 'Edit live quiz' : 'Create a live quiz', builder(ctx, {role, c, initiatives}), (v, form) => {
    const id = ctx.run(`${role}.quiz.save`, {...collect(form, v), id: c?.id}, v.status === 'Draft' ? 'Draft saved.' : c ? 'Round updated.' : 'Round published. Players can join the room now.');
    ctx.go(`${base}/${id}`);
  }, c ? 'Save changes' : 'Create round', {wide: true});
  bindBuilder();
  return true;
}

/* ------------------------------------------- partner Participant route */

export function renderParticipantQuiz(ctx, c) {
  const {s, person: p} = ctx, now = nowMs(s), view = quizView(s, c.id, p.id, now);
  ensureTicker(ctx);
  const button = view.phase.phase === 'podium' ? 'See the podium' : view.me.joined ? 'Open the game' : view.me.blocker ? '' : 'Join the room';
  const clock = view.phase.phase === 'lobby' ? `<span class="qz-hero-label">Kick-off in</span><b data-qz-until="${view.startAt}">${countdown(view.startAt - now)}</b>`
    : view.phase.phase === 'podium' ? `<span class="qz-hero-label">Winner</span><b>${u.esc(view.standings[0]?.name || '—')}</b>` : `<span class="qz-hero-label">Live</span><b>Playing now</b>`;
  return crumbs('Explore opportunities', 'participant/discover')
    + `<div class="qz-page"><section class="qz-hero is-detail"><div class="qz-hero-body">${glyphs()}
      <div class="qz-hero-top">${chip(view.label)}<span class="qz-hero-by">${u.esc(view.organizer)}${view.initiative ? ` · ${u.esc(view.initiative.title)}` : ''}</span></div>
      <h1>${u.esc(c.title)}</h1><p>${u.esc(c.description || 'Answer each question before the timer runs out. Quicker correct answers score more.')}</p>
      <div class="qz-hero-split"><div class="qz-hero-clock">${clock}</div>
        <dl class="qz-hero-facts"><div><dt>Starts</dt><dd>${u.esc(when(c.startAt))}</dd></div><div><dt>Questions</dt><dd>${c.questions.length}</dd></div><div><dt>In the room</dt><dd>${view.players.length}</dd></div></dl></div>
      ${view.me.blocker && !view.me.joined && view.phase.phase !== 'podium' ? `<p class="qz-hero-note">${u.esc(view.me.blocker)}</p>` : ''}
      <div class="qz-hero-actions">${button ? cta(button, 'quiz-play', {id: c.id}, PLAY) : ''}</div>
    </div></section></div>`;
}

export function openPlayer(id, ctx, prefix = 'participant') {
  return import('../../../shared/quiz-arena.js').then(({openArena}) => openArena({
    mode: 'player',
    getView: () => { const s = read(); return quizView(s, id, s.session.personId, nowMs(s)); },
    now: () => nowMs(read()),
    join: consent => ctx.run(`${prefix}.quiz.join`, {competitionId: id, consent, version: read().competitions.find(c => c.id === id)?.version || 1}, 'You joined the room.'),
    answer: (question, choice) => ctx.run(`${prefix}.quiz.answer`, {competitionId: id, question, choice}, 'Answer locked in.'),
    subscribe: storageSubscribe,
    onClose: () => ctx.render()
  }));
}
