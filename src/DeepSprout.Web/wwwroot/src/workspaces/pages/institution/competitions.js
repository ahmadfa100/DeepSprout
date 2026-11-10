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
import {quizView} from '../../../shared/competition-view.js';

const SHAPES = ['▲', '◆', '●', '■'];
const ENDED = ['Cancelled', 'Archived', 'Completed'];
const TONE = {Scheduled: 'is-scheduled', 'Live now': 'is-live', Finished: 'is-finished', Cancelled: 'is-cancelled', Draft: 'is-draft'};

function scopeOf(ctx, role, initiatives = []) {
  const {s, person: p} = ctx;
  if (role === 'supervisor') {
    const ids = new Set(initiatives.map(i => i.id));
    return {initiatives: initiatives.filter(i => !ENDED.includes(i.status)), list: s.competitions.filter(c => isQuiz(c) && ids.has(c.initiativeId))};
  }
  const org = representativeOrg(s, p.id) || s.organizations.find(o => o.memberIds.includes(p.id));
  return {initiatives: s.initiatives.filter(i => i.ownerId === org?.id && !ENDED.includes(i.status)), list: s.competitions.filter(c => c.ownerId === org?.id)};
}

const chip = label => `<span class="qz-chip ${TONE[label] || ''}">${label === 'Live now' ? '<i aria-hidden="true"></i>' : ''}${u.esc(label)}</span>`;
const when = iso => new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman'}).format(new Date(iso));
const minutes = c => Math.max(1, Math.round((quizSchedule(c).endAt - quizSchedule(c).start) / 60000));

/** Returns HTML, or null for a written-entry competition so the caller can show its earlier view. */
export function renderCompetitions(ctx, {role, initiatives = [], base}) {
  const {s, route: r} = ctx, scope = scopeOf(ctx, role, initiatives), now = nowMs(s);
  if (r.id) {
    const c = scope.list.find(x => x.id === r.id);
    if (!c) return u.missing('competition');
    if (!isQuiz(c)) return null;
    return detail(ctx, c, {role, base, now});
  }
  const sorted = scope.list.slice().sort((a, b) => String(b.startAt || b.deadline || '').localeCompare(String(a.startAt || a.deadline || '')));
  const canCreate = scope.initiatives.length || role === 'organization';
  const intro = role === 'supervisor'
    ? 'Run a live quiz for the students of this initiative. At the start time everyone answers the same question together; quicker correct answers score more.'
    : 'Schedule a live quiz for an initiative. At the start time everyone answers the same question together; quicker correct answers score more.';
  return u.header('LIVE QUIZ COMPETITIONS', 'Competitions', intro, canCreate ? u.button('Create competition', 'quiz-create') : '')
    + `<ol class="qz-how" aria-label="How a round works"><li><b>1</b><span><strong>Build the round</strong>Write questions with up to four answers and a timer each.</span></li><li><b>2</b><span><strong>Players join the room</strong>Accepted participants join from Explore → My Initiatives.</span></li><li><b>3</b><span><strong>Play live</strong>Open the host screen; questions, scoreboard and podium run by themselves.</span></li></ol>`
    + (sorted.length ? `<div class="qz-grid">${sorted.map(c => card(ctx, c, base, now)).join('')}</div>`
      : u.empty('No competitions yet.', 'Create the first live quiz — sample questions are ready to edit.', canCreate ? u.button('Create competition', 'quiz-create') : '', false));
}

function card(ctx, c, base, now) {
  const {s} = ctx;
  if (!isQuiz(c)) return `<article class="qz-card is-legacy"><div class="qz-card-top">${chip(c.resultsPublished ? 'Finished' : 'Written entries')}</div><h2>${u.esc(c.title)}</h2><p>Earlier written-entry format · deadline ${u.date(c.deadline)}</p><div class="qz-card-meta"><span>${s.entries.filter(e => e.competitionId === c.id).length} entries</span></div>${u.link('Open', `${base}/${c.id}`, 'button quiet small')}</article>`;
  const label = quizStatus(c, now), players = s.entries.filter(e => e.competitionId === c.id).length;
  const initiative = s.initiatives.find(i => i.id === c.initiativeId);
  return `<article class="qz-card">
    <div class="qz-card-top">${chip(label)}<span class="qz-card-by">${u.esc(c.createdRole || 'Representative')} · ${u.esc(nameOf(s, c.createdBy))}</span></div>
    <h2>${u.esc(c.title)}</h2><p>${u.esc(initiative ? initiative.title : 'Open to all verified participants')}</p>
    <div class="qz-card-meta"><span>${u.icon('calendar')}${u.esc(when(c.startAt))}</span><span>${u.icon('form')}${c.questions.length} questions · ~${minutes(c)} min</span><span>${u.icon('people')}${players} ${players === 1 ? 'player' : 'players'}</span></div>
    <div class="actions">${u.link('Open', `${base}/${c.id}`, 'button quiet small')}${c.status === 'Published' ? u.button(label === 'Finished' ? 'Show podium' : 'Host screen', 'quiz-host', {id: c.id}, 'button primary small') : ''}</div>
  </article>`;
}

function detail(ctx, c, {role, base, now}) {
  const {s} = ctx, phase = quizPhase(c, now), label = quizStatus(c, now);
  const entries = s.entries.filter(e => e.competitionId === c.id);
  const initiative = s.initiatives.find(i => i.id === c.initiativeId);
  const standings = quizStandings(c, entries, pid => nameOf(s, pid), revealedThrough(c, phase));
  const editable = c.status === 'Draft' || (c.status === 'Published' && phase.phase === 'lobby');
  const actions = [
    c.status === 'Published' ? u.button(phase.phase === 'podium' ? 'Show the podium' : 'Open host screen', 'quiz-host', {id: c.id}) : '',
    editable ? u.button('Edit round', 'quiz-edit', {id: c.id}, 'button quiet') : '',
    c.status !== 'Cancelled' && phase.phase !== 'podium' ? u.button('Cancel round', 'quiz-cancel', {id: c.id}, 'button quiet') : ''
  ].join('');
  const players = phase.phase === 'lobby'
    ? (entries.length ? `<ul class="qz-roster">${entries.map(e => `<li>${u.avatar(nameOf(s, e.personId))}<span>${u.esc(nameOf(s, e.personId))}</span><small>joined ${u.esc(when(e.created))}</small></li>`).join('')}</ul>`
      : `<div class="iw-calm">${u.icon('people')}<div><strong>Nobody has joined yet.</strong><p>Accepted participants were notified. They join from Explore → My Initiatives.</p></div></div>`)
    : (standings.length ? u.table(['Rank', 'Player', 'Correct', 'Points'], standings.map(row => ({search: row.name, cells: [`<b>${row.rank}</b>`, u.esc(row.name), `${row.correct} / ${c.questions.length}`, `<b>${row.score.toLocaleString('en')}</b>`]})))
      : `<div class="iw-calm">${u.icon('people')}<div><strong>Nobody played this round.</strong><p>Results appear here as players answer.</p></div></div>`);
  return crumbs('Competitions', base)
    + u.header('LIVE QUIZ', c.title, `${initiative ? initiative.title : 'Open to all verified participants'} · created by ${nameOf(s, c.createdBy)} (${c.createdRole || 'Representative'})`, chip(label))
    + `<div class="qz-facts"><div><small>Starts</small><b>${u.esc(when(c.startAt))}</b></div><div><small>Round length</small><b>~${minutes(c)} minutes</b></div><div><small>Questions</small><b>${c.questions.length}</b></div><div><small>${phase.phase === 'lobby' ? 'In the room' : 'Players'}</small><b>${entries.length}</b></div></div>`
    + `<div class="actions qz-actions">${actions}</div>`
    + `<div class="two-col">${u.section(phase.phase === 'lobby' ? 'Players in the room' : phase.phase === 'podium' ? 'Final results' : 'Live results', players)}${u.section('Questions', `<ol class="qz-questions">${c.questions.map((q, i) => `<li><div class="qz-q-head"><b>${i + 1}</b><strong>${u.esc(q.text)}</strong><small>${q.seconds}s</small></div><ul>${q.options.map((o, k) => `<li class="qz-o qz-o${k}${k === q.answer ? ' is-correct' : ''}"><span aria-hidden="true">${SHAPES[k]}</span>${u.esc(o)}${k === q.answer ? ' <em>correct</em>' : ''}</li>`).join('')}</ul></li>`).join('')}</ol>`)}</div>`
    + u.note('Scoring: a correct answer earns 500–1,000 points — the faster, the more. Wrong or missed answers earn 0. Rounds and results are saved in this browser only.');
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
  const options = role === 'supervisor' ? scope.initiatives.map(i => [i.id, i.title]) : [['', 'Open to all verified participants'], ...scope.initiatives.map(i => [i.id, i.title])];
  const chosen = c?.initiativeId ?? (role === 'supervisor' ? ctx.localUI.initiativeId || options[0]?.[0] : options[1]?.[0] || '');
  const questions = c ? c.questions : SAMPLE_QUESTIONS;
  qid = 0;
  return u.field('title', 'Competition name', c?.title || '', 'text', true, 'maxlength="90" placeholder="e.g. Focus Sprint Live Quiz"')
    + u.area('description', 'Short description (optional)', c?.description || '')
    + `<label class="field"><span>Who can play</span><select name="initiativeId" ${role === 'supervisor' ? 'required' : ''}>${options.map(([v, l]) => `<option value="${u.esc(v)}" ${v === chosen ? 'selected' : ''}>${u.esc(l)}</option>`).join('')}</select></label>`
    + `<div class="form-grid">${u.field('date', 'Start date', `${local.year}-${local.month}-${local.day}`, 'date', true)}${u.field('time', 'Start time (Amman)', `${local.hour}:${local.minute}`, 'time', true)}</div>`
    + `<div class="qb" data-quiz-builder><div class="qb-head"><strong>Questions</strong><span>${c ? 'Edit the round.' : 'Sample questions are filled in — edit, remove or add your own.'}</span></div><ol class="qb-list">${questions.map((q, i) => questionBlock(q, i)).join('')}</ol>
      <button type="button" class="button quiet" data-qb-add>${u.icon('plus')}Add question</button></div>`
    + `<label class="field"><span>Publication</span><select name="status"><option value="Published" ${c?.status !== 'Draft' ? 'selected' : ''}>Publish — open the lobby and notify players</option><option value="Draft" ${c?.status === 'Draft' ? 'selected' : ''}>Save as draft</option></select></label>`;
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

export function openHost(id) {
  return import('../../../shared/quiz-arena.js').then(({openArena}) => openArena({
    mode: 'host',
    getView: () => { const s = read(); return quizView(s, id, null, nowMs(s)); },
    now: () => nowMs(read()),
    subscribe: fn => { const on = e => { if (e.key === 'deepsprout-ecosystem-demo-v1') fn(); }; window.addEventListener('storage', on); return () => window.removeEventListener('storage', on); }
  }));
}

export function competitionAction(action, target, ctx, {role, initiatives = [], base}) {
  if (!['quiz-create', 'quiz-edit', 'quiz-host', 'quiz-cancel'].includes(action)) return false;
  const d = target.dataset, c = d.id ? ctx.s.competitions.find(x => x.id === d.id) : null;
  if (action === 'quiz-host') { openHost(d.id); return true; }
  if (action === 'quiz-cancel') {
    u.confirm('Cancel this round?', 'Players who joined are told it was cancelled. The round cannot be restarted; create a new one instead.', () => { ctx.run(`${role}.quiz.cancel`, {id: d.id}, 'Round cancelled.'); ctx.render(); });
    return true;
  }
  const scope = scopeOf(ctx, role, initiatives);
  if (role === 'supervisor' && !scope.initiatives.length) throw new Error('You need an active Initiative assignment to create a competition.');
  u.modal(c ? 'Edit live quiz' : 'Create a live quiz', builder(ctx, {role, c, initiatives}), (v, form) => {
    const id = ctx.run(`${role}.quiz.save`, {...collect(form, v), id: c?.id}, v.status === 'Draft' ? 'Draft saved.' : c ? 'Round updated.' : 'Round published. Players can join the room now.');
    ctx.go(`${base}/${id}`);
  }, c ? 'Save changes' : 'Create round', {wide: true});
  bindBuilder();
  return true;
}

/* ------------------------------------------- partner Participant route */

export function renderParticipantQuiz(ctx, c) {
  const {s, person: p} = ctx, view = quizView(s, c.id, p.id, nowMs(s));
  const button = view.phase.phase === 'podium' ? 'See the podium' : view.me.joined ? 'Open the game' : view.me.blocker ? '' : 'Join the room';
  return crumbs('Explore opportunities', 'participant/discover') + u.header('LIVE QUIZ', c.title, `${view.organizer}${view.initiative ? ` · ${view.initiative.title}` : ''}`, chip(view.label))
    + `<div class="qz-facts"><div><small>Starts</small><b>${u.esc(when(c.startAt))}</b></div><div><small>Questions</small><b>${c.questions.length}</b></div><div><small>In the room</small><b>${view.players.length}</b></div></div>`
    + u.section('How it works', `<p>${u.esc(c.description || 'Answer each question before the timer runs out. Quicker correct answers score more.')}</p>${view.me.blocker && !view.me.joined && view.phase.phase !== 'podium' ? u.note(view.me.blocker) : ''}<div class="actions">${button ? u.button(button, 'quiz-play', {id: c.id}) : ''}</div>`);
}

export function openPlayer(id, ctx, prefix = 'participant') {
  return import('../../../shared/quiz-arena.js').then(({openArena}) => openArena({
    mode: 'player',
    getView: () => { const s = read(); return quizView(s, id, s.session.personId, nowMs(s)); },
    now: () => nowMs(read()),
    join: consent => ctx.run(`${prefix}.quiz.join`, {competitionId: id, consent, version: read().competitions.find(c => c.id === id)?.version || 1}, 'You joined the room.'),
    answer: (question, choice) => ctx.run(`${prefix}.quiz.answer`, {competitionId: id, question, choice}, 'Answer locked in.'),
    subscribe: fn => { const on = e => { if (e.key === 'deepsprout-ecosystem-demo-v1') fn(); }; window.addEventListener('storage', on); return () => window.removeEventListener('storage', on); },
    onClose: () => ctx.render()
  }));
}
