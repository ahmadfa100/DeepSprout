/**
 * Seeded live quiz competitions for Start Today: one scheduled round made by
 * the Representative and one finished warm-up made by the Supervisor, so the
 * lobby and the podium are both visible in the demo. Added once, never over
 * a record with the same id.
 */
import {quizPoints, SAMPLE_QUESTIONS} from '../competition-rules.js';

const q = (list) => list.map((x, i) => ({id: `q${i + 1}`, ...structuredClone(x)}));
const answer = (question, choice, ms) => {
  const correct = choice === question.answer;
  return {choice, ms, correct, points: quizPoints(correct, ms, question.seconds * 1000), at: '2026-10-14T17:03:00+03:00'};
};

export function addQuizDemo(s) {
  if (s.quizDemoVersion === 1) return false;
  s.competitions ||= []; s.entries ||= [];
  const today = (s.initiatives || []).find(i => i.id === 'i-today');
  if (!today) { s.quizDemoVersion = 1; return true; }
  const ownerId = today.ownerId;
  const warmQuestions = q([
    {text: 'What is the smallest useful first step for a postponed task?', options: ['Plan the whole project', 'Open the file and write one line', 'Wait for motivation', 'Tidy the entire room'], answer: 1, seconds: 20},
    {text: 'Which setting helps most during a 25-minute focus block?', options: ['Do Not Disturb on', 'Sound on for every app', 'Auto-play videos', 'Five open chats'], answer: 0, seconds: 20},
    {text: 'A friend says “I’ll start tomorrow” again. What could you suggest?', options: ['Start next month instead', 'Pick a two-minute version for today', 'Make the goal bigger', 'Ignore it'], answer: 1, seconds: 20},
    {text: 'What turns “study more” into a clear goal?', options: ['Study a lot', 'Never stop studying', 'Read chapter 3 before 6 pm', 'Study when possible'], answer: 2, seconds: 20}
  ]);
  const add = c => { if (!s.competitions.some(x => x.id === c.id)) s.competitions.push(c); };
  add({id: 'c-quiz-live', format: 'Quiz', topic: 'Live quiz', title: 'Focus Sprint Live Quiz', description: 'Five quick questions about starting, focusing and coming back after a distraction. Faster correct answers score more.',
    initiativeId: today.id, ownerId, status: 'Published', version: 1, startAt: '2026-10-16T15:00:00.000Z', questions: q(SAMPLE_QUESTIONS),
    createdBy: 'p-maya', createdRole: 'Representative', created: '2026-10-13T09:00:00+03:00', announced: '2026-10-13T09:00:00+03:00'});
  add({id: 'c-quiz-warmup', format: 'Quiz', topic: 'Live quiz', title: 'Warm-up Round: Small Steps', description: 'A four-question warm-up the Supervisor ran with the group after the first meeting.',
    initiativeId: today.id, ownerId, status: 'Published', version: 1, startAt: '2026-10-14T14:00:00.000Z', questions: warmQuestions,
    createdBy: 'p-hala', createdRole: 'Supervisor', created: '2026-10-12T10:00:00+03:00', announced: '2026-10-12T10:00:00+03:00'});
  const played = (pid, picks) => ({id: `entry-warmup-${pid}`, competitionId: 'c-quiz-warmup', version: 1, consent: {version: 1, at: '2026-10-14T16:55:00+03:00'}, personId: pid, status: 'Completed', created: '2026-10-14T16:55:00+03:00',
    answers: Object.fromEntries(picks.map(([choice, ms], i) => [i, answer(warmQuestions[i], choice, ms)]))});
  for (const e of [played('p-noor', [[1, 3200], [0, 5100], [3, 9000], [2, 2500]]), played('p-rania', [[1, 4100], [1, 7000], [1, 6000], [2, 3900]])])
    if (!s.entries.some(x => x.id === e.id) && (s.people || []).some(p => p.id === e.personId)) s.entries.push(e);
  s.quizDemoVersion = 1;
  return true;
}
