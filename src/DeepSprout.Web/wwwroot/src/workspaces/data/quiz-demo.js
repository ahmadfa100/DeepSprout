/**
 * Demo data for live quiz competitions.
 *
 * Demo players are clearly marked (`demo: true`, ids starting with `bot-`)
 * and exist only as competition entries — they never become people,
 * applicants or Garden records. Their join time and every answer carry a
 * timestamp; the read model only shows what has "happened" by the demo
 * clock, so in an upcoming round they trickle into the lobby and answer
 * each question live, at different speeds.
 */
import {quizPoints, quizSchedule, SAMPLE_QUESTIONS} from '../competition-rules.js';
import {nowMs} from '../domain.js';

export const DEMO_PLAYERS = [
  {id: 'bot-lina', name: 'Lina Barakat', skill: .9, speed: .45},
  {id: 'bot-sara', name: 'Sara Mahmoud', skill: .82, speed: .6},
  {id: 'bot-yousef', name: 'Yousef Amin', skill: .7, speed: .4},
  {id: 'bot-dana', name: 'Dana Khoury', skill: .76, speed: .75},
  {id: 'bot-tariq', name: 'Tariq Saad', skill: .6, speed: .35},
  {id: 'bot-hiba', name: 'Hiba Nasser', skill: .66, speed: .9},
  {id: 'bot-ziad', name: 'Ziad Fares', skill: .52, speed: .55},
  {id: 'bot-reem', name: 'Reem Jaber', skill: .58, speed: .7}
];

/** Small deterministic random generator, so the demo looks the same every time. */
function random(seedText) {
  let a = [...seedText].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703);
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const iso = ms => new Date(ms).toISOString();
const withIds = list => list.map((q, i) => ({id: `q${i + 1}`, ...structuredClone(q)}));

/** Entries for demo players: staggered joins before the start, timed answers during each question. */
export function demoEntries(c, players, {joinWindowMs = 150000, joinedBefore = null} = {}) {
  const plan = quizSchedule(c), rand = random(c.id);
  return players.map(bot => {
    const joined = joinedBefore ?? plan.start - 8000 - Math.floor(rand() * joinWindowMs);
    const answers = {};
    c.questions.forEach((q, i) => {
      if (rand() < .07) return; // sometimes a player misses a question
      const limit = q.seconds * 1000;
      const ms = Math.min(limit - 400, Math.round(limit * (.12 + rand() * .7 * bot.speed + (rand() < .2 ? .25 : 0))));
      const correct = rand() < bot.skill;
      const wrong = [...q.options.keys()].filter(k => k !== q.answer);
      const choice = correct ? q.answer : wrong[Math.floor(rand() * wrong.length)];
      answers[i] = {choice, ms, correct, points: quizPoints(correct, ms, limit), at: iso(plan.items[i].openAt + ms)};
    });
    return {id: `entry-${c.id}-${bot.id}`, competitionId: c.id, version: c.version || 1, consent: {version: 1, at: iso(joined)}, personId: bot.id, name: bot.name, demo: true,
      status: 'Joined', created: iso(joined), answers};
  });
}

/** Answers for a real (seeded) person in a past round. */
function played(c, personId, picks) {
  const plan = quizSchedule(c);
  return {id: `entry-${c.id}-${personId}`, competitionId: c.id, version: 1, consent: {version: 1, at: iso(plan.start - 300000)}, personId, status: 'Completed', created: iso(plan.start - 300000),
    answers: Object.fromEntries(picks.map(([choice, ms], i) => {
      const q = c.questions[i], correct = choice === q.answer;
      return [i, {choice, ms, correct, points: quizPoints(correct, ms, q.seconds * 1000), at: iso(plan.items[i].openAt + ms)}];
    }))};
}

const SPEED_ROUND = [
  {text: 'You open your phone “just to check the time”. What is the smallest reset?', options: ['Scroll for one minute', 'Lock it and name your next task', 'Open a new app', 'Turn the volume up'], answer: 1, seconds: 15},
  {text: 'Which one is a real focus booster?', options: ['Phone face-down in another room', 'Three tabs of videos', 'Notifications on “just in case”', 'Studying in bed'], answer: 0, seconds: 15},
  {text: 'A 25-minute focus block is called…', options: ['A power nap', 'A Pomodoro', 'A deep dive', 'A screen sprint'], answer: 1, seconds: 15},
  {text: 'Best first move on a task you have been avoiding?', options: ['Plan everything perfectly', 'Wait for motivation', 'Do the two-minute version now', 'Ask for a new deadline'], answer: 2, seconds: 15},
  {text: 'What makes a break restorative?', options: ['A short walk outside', 'Checking every app', 'Auto-playing videos', 'Replying to every chat'], answer: 0, seconds: 15}
];

const TRIVIA = [
  {text: 'Roughly how long does it take to fully refocus after an interruption?', options: ['About 30 seconds', 'About 2 minutes', 'Over 20 minutes', 'It is instant'], answer: 2, seconds: 20},
  {text: 'Which feature is designed to keep you scrolling?', options: ['Infinite feed', 'Page numbers', 'A “done” button', 'A daily limit'], answer: 0, seconds: 20},
  {text: 'Which habit helps sleep the most?', options: ['Screens off an hour before bed', 'Gaming until midnight', 'Phone under the pillow', 'Bright light at night'], answer: 0, seconds: 20},
  {text: '“Phubbing” means…', options: ['Phone + snubbing someone', 'A new phone brand', 'Fast typing', 'A focus app'], answer: 0, seconds: 20},
  {text: 'Grayscale mode can make a phone…', options: ['Faster', 'Less tempting', 'Louder', 'Waterproof'], answer: 1, seconds: 20},
  {text: 'Which is an offline routine idea?', options: ['A 10-minute evening walk', 'Watching shorts in bed', 'Checking feeds at dinner', 'Refreshing email'], answer: 0, seconds: 20},
  {text: 'Single-tasking means…', options: ['Doing one thing at a time', 'Working alone', 'Using one app all day', 'Skipping breaks'], answer: 0, seconds: 20},
  {text: 'What is a “digital sunset”?', options: ['A phone wallpaper', 'A set time when screens go off', 'A night filter', 'A sleep app'], answer: 1, seconds: 20}
];

/** A round that starts soon, with demo players who join and answer by themselves. */
export function demoRound(s, {id, title, ownerId, initiativeId, createdBy, role, startAt}) {
  const c = {id, format: 'Quiz', topic: 'Live quiz', title, description: 'A practice round against eight demo players. Join, then answer faster than them — they play live, at their own speed.',
    initiativeId, ownerId, status: 'Published', version: 1, startAt: iso(startAt), questions: withIds(SPEED_ROUND), demo: true,
    createdBy, createdRole: role, created: iso(startAt - 180000), announced: iso(startAt - 180000)};
  return {competition: c, entries: demoEntries(c, DEMO_PLAYERS, {joinWindowMs: Math.max(20000, startAt - nowMs(s) - 10000)})};
}

export function addQuizDemo(s) {
  if ((s.quizDemoVersion || 0) >= 2) return false;
  s.competitions ||= []; s.entries ||= [];
  const today = (s.initiatives || []).find(i => i.id === 'i-today');
  if (!today) { s.quizDemoVersion = 2; return true; }
  const ownerId = today.ownerId, people = new Set((s.people || []).map(p => p.id));
  const add = c => { if (!s.competitions.some(x => x.id === c.id)) s.competitions.push(c); return s.competitions.find(x => x.id === c.id); };
  const enter = list => list.forEach(e => { if (!s.entries.some(x => x.id === e.id) && (e.demo || people.has(e.personId))) s.entries.push(e); });
  const base = {format: 'Quiz', topic: 'Live quiz', initiativeId: today.id, ownerId, version: 1};

  // 1 · Starts three minutes after the demo loads: demo players trickle in and play live.
  const soon = Math.ceil((nowMs(s) + 180000) / 60000) * 60000;
  if (!s.competitions.some(c => c.id === 'c-quiz-demo')) {
    const {competition, entries} = demoRound(s, {id: 'c-quiz-demo', title: 'Beat the Bots: Speed Round', ownerId, initiativeId: today.id, createdBy: 'p-maya', role: 'Representative', startAt: soon});
    add(competition); enter(entries);
  }

  // 2 · Scheduled for the evening of the story day; six players already waiting.
  const live = add({...base, id: 'c-quiz-live', title: 'Focus Sprint Live Quiz', status: 'Published', startAt: '2026-10-16T15:00:00.000Z',
    description: 'Five quick questions about starting, focusing and coming back after a distraction. Faster correct answers score more.',
    questions: withIds(SAMPLE_QUESTIONS), createdBy: 'p-maya', createdRole: 'Representative', created: '2026-10-13T09:00:00+03:00', announced: '2026-10-13T09:00:00+03:00'});
  enter(demoEntries(live, DEMO_PLAYERS.slice(0, 6), {joinedBefore: Date.parse('2026-10-14T12:00:00+03:00')}).map((e, i) => ({...e, created: iso(Date.parse('2026-10-13T12:00:00+03:00') + i * 5400000), answers: {}})));

  // 3 · Finished warm-up run by the Supervisor.
  const warm = add({...base, id: 'c-quiz-warmup', title: 'Warm-up Round: Small Steps', status: 'Published', startAt: '2026-10-14T14:00:00.000Z',
    description: 'A four-question warm-up the Supervisor ran with the group after the first meeting.',
    questions: withIds([
      {text: 'What is the smallest useful first step for a postponed task?', options: ['Plan the whole project', 'Open the file and write one line', 'Wait for motivation', 'Tidy the entire room'], answer: 1, seconds: 20},
      {text: 'Which setting helps most during a 25-minute focus block?', options: ['Do Not Disturb on', 'Sound on for every app', 'Auto-play videos', 'Five open chats'], answer: 0, seconds: 20},
      {text: 'A friend says “I’ll start tomorrow” again. What could you suggest?', options: ['Start next month instead', 'Pick a two-minute version for today', 'Make the goal bigger', 'Ignore it'], answer: 1, seconds: 20},
      {text: 'What turns “study more” into a clear goal?', options: ['Study a lot', 'Never stop studying', 'Read chapter 3 before 6 pm', 'Study when possible'], answer: 2, seconds: 20}
    ]), createdBy: 'p-hala', createdRole: 'Supervisor', created: '2026-10-12T10:00:00+03:00', announced: '2026-10-12T10:00:00+03:00'});
  // Earlier demo stores used these ids for the two real players.
  s.entries = s.entries.filter(e => !['entry-warmup-p-noor', 'entry-warmup-p-rania'].includes(e.id));
  enter([played(warm, 'p-noor', [[1, 2100], [0, 2600], [3, 9000], [2, 1900]]), played(warm, 'p-rania', [[1, 4100], [1, 7000], [1, 6000], [2, 3900]]), ...demoEntries(warm, DEMO_PLAYERS.slice(1, 6))]);

  // 4 · Last week’s trivia night, eight questions, a full podium.
  const trivia = add({...base, id: 'c-quiz-trivia', title: 'Digital Balance Trivia Night', status: 'Published', startAt: '2026-10-09T16:00:00.000Z',
    description: 'Eight trivia questions about attention, sleep and screens. The whole cohort played after the opening session.',
    questions: withIds(TRIVIA), createdBy: 'p-hala', createdRole: 'Supervisor', created: '2026-10-05T10:00:00+03:00', announced: '2026-10-05T10:00:00+03:00'});
  enter([played(trivia, 'p-noor', [[2, 6100], [0, 3000], [0, 4200], [0, 5000], [1, 7400], [0, 2600], [0, 3100], [3, 9000]]), ...demoEntries(trivia, DEMO_PLAYERS)]);

  // 5 · A Supervisor’s draft, not visible to players yet.
  add({...base, id: 'c-quiz-draft', title: 'Screen-time Myths (draft)', status: 'Draft', startAt: '2026-10-23T15:00:00.000Z',
    description: 'True or false? Six popular myths about phones and focus.',
    questions: withIds([
      {text: 'Myth or fact: checking your phone “quickly” costs no focus.', options: ['Myth', 'Fact'], answer: 0, seconds: 10},
      {text: 'Myth or fact: notifications can raise stress even unopened.', options: ['Myth', 'Fact'], answer: 1, seconds: 10}
    ]), createdBy: 'p-hala', createdRole: 'Supervisor', created: '2026-10-15T08:00:00+03:00'});

  s.quizDemoVersion = 2;
  return true;
}
