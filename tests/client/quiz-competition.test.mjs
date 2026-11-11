/**
 * Live quiz competitions (Kahoot-style): clock-driven phases, speed scoring,
 * Representative and Supervisor authority, join/answer guards and the
 * player read model. Node, in-memory store, demo clock pinned.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {read, dispatch, snapshotForTests} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {quizView} from '../../src/DeepSprout.Web/wwwroot/src/shared/selectors.js';
import {QUIZ, quizPhase, quizPoints, quizSchedule, quizStandings, normalizeQuiz} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/competition-rules.js';

const PIN = '2026-10-15T09:00:00+03:00';
const START = '2026-10-15T10:00:00+03:00';
const as = personId => dispatch('demo.signin', {personId});
const at = iso => dispatch('demo.clock', {at:iso});
const reset = personId => { dispatch('demo.reset'); at(PIN); if (personId) as(personId); };
const edit = fn => { const s = read(); fn(s); snapshotForTests(s); };
const err = fn => { try { fn(); return 'allowed'; } catch (e) { return e.message; } };
const plus = ms => new Date(Date.parse(START) + ms).toISOString();
const QUESTIONS = [
  {text:'Which helps you start?', options:['Wait', 'A tiny first step', 'More tabs', 'Later'], answer:1, seconds:20},
  {text:'Best break?', options:['Short walk', 'Endless feed'], answer:0, seconds:10}
];
const create = (role = 'organization', extra = {}) => dispatch(`${role}.quiz.save`, {title:'Morning quiz', initiativeId:'i-today', startAt:START, questions:QUESTIONS, ...extra});
const openAt = i => quizSchedule({startAt:START, questions:QUESTIONS}).items[i].openAt;

test('rules · phases follow the clock and the last question goes straight to the podium', () => {
  const c = {startAt:START, status:'Published', questions:QUESTIONS};
  const plan = quizSchedule(c), t0 = Date.parse(START);
  assert.equal(quizPhase(c, t0 - 1).phase, 'lobby');
  assert.equal(quizPhase(c, t0 + 1).phase, 'intro');
  assert.deepEqual([quizPhase(c, plan.items[0].previewAt).phase, quizPhase(c, plan.items[0].openAt).phase, quizPhase(c, plan.items[0].closeAt).phase, quizPhase(c, plan.items[0].revealEnd).phase], ['preview', 'answer', 'reveal', 'scores']);
  assert.equal(plan.items[1].scoresEnd, plan.items[1].revealEnd, 'no scoreboard after the final question');
  assert.equal(quizPhase(c, plan.endAt).phase, 'podium');
  assert.equal(plan.endAt - t0, QUIZ.INTRO_MS + 2 * QUIZ.PREVIEW_MS + 30000 + 2 * QUIZ.REVEAL_MS + QUIZ.SCORES_MS);
  assert.equal(quizPhase({...c, status:'Cancelled'}, t0).phase, 'cancelled');
});

test('rules · Kahoot scoring rewards speed; wrong answers score zero; ties share a rank', () => {
  assert.equal(quizPoints(true, 0, 20000), 1000);
  assert.equal(quizPoints(true, 20000, 20000), 500);
  assert.equal(quizPoints(true, 10000, 20000), 750);
  assert.equal(quizPoints(false, 100, 20000), 0);
  const rows = quizStandings({questions:QUESTIONS}, [
    {personId:'a', answers:{0:{points:900, correct:true, ms:4000}}},
    {personId:'b', answers:{0:{points:900, correct:true, ms:4000}}},
    {personId:'c', answers:{}}
  ], id => id, 0);
  assert.deepEqual(rows.map(r => r.rank), [1, 1, 3]);
});

test('builder validation · readable messages for incomplete rounds', () => {
  const base = {title:'Quiz', startAt:START};
  assert.throws(() => normalizeQuiz({...base, questions:[]}), /at least one question/);
  assert.throws(() => normalizeQuiz({...base, questions:[{text:'', options:['a', 'b'], answer:0}]}), /write the question/);
  assert.throws(() => normalizeQuiz({...base, questions:[{text:'Q', options:['a', ''], answer:0}]}), /at least two answers/);
  assert.throws(() => normalizeQuiz({...base, questions:[{text:'Q', options:['a', 'b', '', ''], answer:3}]}), /mark one filled-in answer/);
  const q = normalizeQuiz({...base, questions:[{text:'Q', options:['', 'a', '', 'b'], answer:3, seconds:10}]}).questions[0];
  assert.deepEqual([q.options, q.answer], [['a', 'b'], 1], 'blank answers are dropped and the correct one is kept');
});

test('Representative · creates, edits before the start, cannot edit after; past start rejected', () => {
  reset('p-maya');
  assert.match(err(() => create('organization', {startAt:'2026-10-14T10:00:00+03:00'})), /start time at least one minute from now/);
  const id = create();
  const c = read().competitions.find(x => x.id === id);
  assert.deepEqual([c.format, c.status, c.ownerId, c.createdRole, c.version], ['Quiz', 'Published', 'org-horizon', 'Representative', 1]);
  dispatch('organization.quiz.save', {id, title:'Morning quiz v2', initiativeId:'i-today', startAt:START, questions:QUESTIONS.slice(0, 1)});
  assert.equal(read().competitions.find(x => x.id === id).version, 2, 'question changes bump the version');
  at(plus(1000));
  assert.match(err(() => dispatch('organization.quiz.save', {id, title:'Too late', initiativeId:'i-today', startAt:'2026-10-16T10:00:00+03:00', questions:QUESTIONS})), /already started/);
  // Every round belongs to one Initiative (forms.Form CK_Form_Owner); there is no open-to-all round.
  assert.match(err(() => create('organization', {startAt:'2026-10-20T10:00:00+03:00', initiativeId:null})), /Choose the initiative/);
});

test('Supervisor · only inside an assigned initiative; loses authority when the grant ends; Representative can cancel it', () => {
  reset('p-hala');
  const id = create('supervisor');
  assert.equal(read().competitions.find(x => x.id === id).ownerId, 'org-horizon', 'owned by the initiative’s Institution');
  assert.match(err(() => create('supervisor', {initiativeId:null})), /assigned initiatives/);
  edit(s => s.grants.filter(g => g.personId === 'p-hala' && g.role === 'supervisor').forEach(g => { g.status = 'Revoked'; }));
  assert.match(err(() => create('supervisor')), /not an active Supervisor|no active supervisor workspace/i);
  assert.match(err(() => dispatch('supervisor.quiz.cancel', {id})), /cannot cancel|no active supervisor workspace/i);
  as('p-maya'); dispatch('organization.quiz.cancel', {id});
  assert.equal(read().competitions.find(x => x.id === id).status, 'Cancelled');
  as('p-noor'); assert.match(err(() => dispatch('member.quiz.join', {competitionId:id, consent:true})), /not open/);
});

test('Play · answers only while a question is open, once each, with speed points from the command clock', () => {
  reset('p-maya'); const id = create();
  as('p-noor'); dispatch('member.quiz.join', {competitionId:id, consent:true});
  as('p-rania'); dispatch('member.quiz.join', {competitionId:id, consent:true});
  dispatch('demo.clock', {at:new Date(openAt(0) - 500).toISOString()}); as('p-noor');
  assert.match(err(() => dispatch('member.quiz.answer', {competitionId:id, question:0, choice:1})), /closed/, 'still in preview');
  dispatch('demo.clock', {at:new Date(openAt(0) + 2000).toISOString()}); as('p-noor');
  dispatch('member.quiz.answer', {competitionId:id, question:0, choice:1});
  assert.match(err(() => dispatch('member.quiz.answer', {competitionId:id, question:0, choice:0})), /already answered/);
  assert.match(err(() => dispatch('member.quiz.answer', {competitionId:id, question:1, choice:0})), /closed/, 'cannot answer ahead');
  assert.match(err(() => dispatch('member.quiz.answer', {competitionId:id, question:0, choice:7})), /already answered|Choose one/);
  dispatch('demo.clock', {at:new Date(openAt(0) + 12000).toISOString()}); as('p-rania');
  dispatch('member.quiz.answer', {competitionId:id, question:0, choice:1});
  const entries = read().entries.filter(e => e.competitionId === id);
  const noor = entries.find(e => e.personId === 'p-noor').answers[0], rania = entries.find(e => e.personId === 'p-rania').answers[0];
  assert.ok(noor.correct && rania.correct && noor.points > rania.points, 'the faster correct answer earns more');
  dispatch('demo.clock', {at:new Date(openAt(0) + 21000).toISOString()}); as('p-omar');
  assert.match(err(() => dispatch('member.quiz.join', {competitionId:id, consent:true})), /accepted participants/);
});

test('Read model · hides the correct answer until the reveal; shows distribution and standings after', () => {
  reset('p-maya'); const id = create();
  as('p-noor'); dispatch('member.quiz.join', {competitionId:id, consent:true});
  dispatch('demo.clock', {at:new Date(openAt(0) + 1000).toISOString()}); as('p-noor');
  dispatch('member.quiz.answer', {competitionId:id, question:0, choice:1});
  let v = quizView(read(), id, 'p-noor', openAt(0) + 1500);
  assert.equal(v.phase.phase, 'answer'); assert.equal(v.question.answer, null, 'no answer leak while open');
  assert.equal(v.answeredCount, 1); assert.equal(v.standings[0].score, 0, 'scores count only revealed questions');
  v = quizView(read(), id, 'p-noor', openAt(0) + 21000);
  assert.equal(v.phase.phase, 'reveal'); assert.equal(v.question.answer, 1); assert.deepEqual(v.distribution, [0, 1, 0, 0]);
  assert.ok(v.standings[0].score > 900); assert.equal(v.me.joined, true);
  const host = quizView(read(), id, null, openAt(0) + 21000);
  assert.equal(host.me.blocker, 'Sign in to join this competition.');
});

test('Seeded demo · lobby with waiting players, finished rounds with full podiums, a draft, and demo players that never become people', () => {
  reset();
  const s = read(), now = Date.parse(PIN);
  const live = quizView(s, 'c-quiz-live', 'p-noor', now);
  assert.equal(live.phase.phase, 'lobby'); assert.equal(live.players.length, 6, 'six demo players already waiting');
  const warm = quizView(s, 'c-quiz-warmup', 'p-noor', now);
  assert.equal(warm.phase.phase, 'podium'); assert.equal(warm.createdRole, 'Supervisor');
  assert.equal(warm.standings.length, 7);
  assert.ok(warm.standings.findIndex(r => r.name === 'Noor Khalil') < warm.standings.findIndex(r => r.name === 'Rania Yasin'));
  assert.equal(quizView(s, 'c-quiz-trivia', 'p-noor', now).standings.length, 9);
  assert.equal(s.competitions.find(c => c.id === 'c-quiz-draft').status, 'Draft');
  assert.ok(s.entries.filter(e => e.demo).every(e => e.personId.startsWith('bot-') && !s.people.some(p => p.id === e.personId)));
});

test('Demo players join and answer on schedule: the read model only shows what has happened', () => {
  reset();
  const s = read(), c = s.competitions.find(x => x.id === 'c-quiz-demo');
  assert.ok(c, 'a round starting soon after the demo loads');
  const start = Date.parse(c.startAt), plan = quizSchedule(c);
  assert.ok(quizView(s, c.id, null, start - 175000).players.length < quizView(s, c.id, null, start - 1000).players.length, 'players trickle into the lobby');
  const open = plan.items[0].openAt;
  assert.equal(quizView(s, c.id, null, open + 100).answeredCount, 0, 'nobody answers in the first instant');
  assert.ok(quizView(s, c.id, null, plan.items[0].closeAt - 1).answeredCount >= 6, 'most demo players answer before the timer ends');
  reset('p-maya');
  const id = dispatch('organization.quiz.demo', {initiativeId:'i-today'});
  assert.equal(read().entries.filter(e => e.competitionId === id && e.demo).length, 8);
  as('p-noor'); dispatch('member.quiz.join', {competitionId:id, consent:true});
  as('p-maya'); dispatch('organization.quiz.cancel', {id});
  assert.equal(read().notifications.filter(n => /cancelled by the organizer/.test(n.text) && n.recipientId.startsWith('bot-')).length, 0, 'demo players are never notified');
});
