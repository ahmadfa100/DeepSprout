/**
 * Live quiz competitions (Kahoot-style). Pure rules shared by the commands,
 * the read models and the game screen.
 *
 * The round is driven by the clock, not by a server: every screen computes
 * the same phase from `startAt`, so all players see the same question at the
 * same moment. Phases: lobby → intro → (preview → answer → reveal → scores)
 * per question → podium. The last question skips "scores" and goes straight
 * to the podium.
 */
export const QUIZ = Object.freeze({
  INTRO_MS: 5000,
  PREVIEW_MS: 4000,
  REVEAL_MS: 4500,
  SCORES_MS: 5500,
  MIN_SECONDS: 5,
  MAX_SECONDS: 120,
  SECONDS: [10, 20, 30, 60],
  MAX_QUESTIONS: 30,
  MAX_POINTS: 1000
});

export const isQuiz = c => c?.format === 'Quiz';

/** Absolute timings for each question (epoch ms). */
export function quizSchedule(c) {
  const start = Date.parse(c.startAt);
  const questions = c.questions || [];
  let t = start + QUIZ.INTRO_MS;
  const items = questions.map((q, index) => {
    const previewAt = t, openAt = previewAt + QUIZ.PREVIEW_MS, closeAt = openAt + q.seconds * 1000;
    const revealEnd = closeAt + QUIZ.REVEAL_MS;
    const last = index === questions.length - 1;
    const scoresEnd = last ? revealEnd : revealEnd + QUIZ.SCORES_MS;
    t = scoresEnd;
    return {index, previewAt, openAt, closeAt, revealEnd, scoresEnd};
  });
  return {start, introEnd: start + QUIZ.INTRO_MS, items, endAt: t};
}

/** Where the round is at `now`. `endsAt` is when the current phase ends. */
export function quizPhase(c, now) {
  if (c.status === 'Cancelled') return {phase: 'cancelled'};
  if (c.status === 'Draft') return {phase: 'draft'};
  const plan = quizSchedule(c);
  if (now < plan.start) return {phase: 'lobby', startsAt: plan.start, endsAt: plan.start};
  if (now < plan.introEnd) return {phase: 'intro', startsAt: plan.start, endsAt: plan.introEnd};
  for (const q of plan.items) {
    if (now < q.openAt) return {phase: 'preview', index: q.index, startsAt: q.previewAt, endsAt: q.openAt, openAt: q.openAt};
    if (now < q.closeAt) return {phase: 'answer', index: q.index, startsAt: q.openAt, endsAt: q.closeAt, openAt: q.openAt};
    if (now < q.revealEnd) return {phase: 'reveal', index: q.index, startsAt: q.closeAt, endsAt: q.revealEnd, openAt: q.openAt};
    if (now < q.scoresEnd) return {phase: 'scores', index: q.index, startsAt: q.revealEnd, endsAt: q.scoresEnd, openAt: q.openAt};
  }
  return {phase: 'podium', startsAt: plan.endAt, endsAt: Infinity};
}

/** Simple status label for lists and cards. */
export function quizStatus(c, now) {
  const {phase} = quizPhase(c, now);
  return {draft: 'Draft', cancelled: 'Cancelled', lobby: 'Scheduled', podium: 'Finished'}[phase] || 'Live now';
}

/** Kahoot scoring: a correct answer earns 500–1000 points; quicker earns more. */
export function quizPoints(correct, elapsedMs, limitMs) {
  if (!correct) return 0;
  const ratio = Math.min(1, Math.max(0, elapsedMs / limitMs));
  return Math.round(QUIZ.MAX_POINTS * (1 - ratio / 2));
}

/** The last question whose answer has been revealed (-1 before any). */
export function revealedThrough(c, phase) {
  if (phase.phase === 'podium') return (c.questions || []).length - 1;
  if (phase.phase === 'reveal' || phase.phase === 'scores') return phase.index;
  if (phase.phase === 'preview' || phase.phase === 'answer') return phase.index - 1;
  return -1;
}

/**
 * Ranked players, counting questions 0..through. Ties break on correct
 * answers, then total answer time, then name.
 */
export function quizStandings(c, entries, names, through) {
  const rows = entries.map(e => {
    let score = 0, correct = 0, ms = 0, streak = 0, last = null;
    for (let i = 0; i <= through; i++) {
      const a = e.answers?.[i];
      if (a) { score += a.points; ms += a.ms; if (a.correct) { correct++; streak++; } else streak = 0; } else streak = 0;
      if (i === through) last = a || null;
    }
    return {personId: e.personId, name: names(e.personId), score, correct, ms, streak, last};
  });
  rows.sort((a, b) => b.score - a.score || b.correct - a.correct || a.ms - b.ms || a.name.localeCompare(b.name));
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].score === r.score && rows[i - 1].correct === r.correct ? rows[i - 1].rank : i + 1; });
  return rows;
}

const clean = v => String(v ?? '').trim();

/** Validate and normalize a quiz from the builder. Throws a readable message. */
export function normalizeQuiz(p) {
  const fail = message => { throw new Error(message); };
  const title = clean(p.title);
  if (!title) fail('Give the competition a title.');
  if (title.length > 90) fail('Keep the title under 90 characters.');
  const description = clean(p.description).slice(0, 400);
  const startAt = clean(p.startAt);
  if (!startAt || Number.isNaN(Date.parse(startAt))) fail('Choose a start date and time.');
  const list = Array.isArray(p.questions) ? p.questions : [];
  if (!list.length) fail('Add at least one question.');
  if (list.length > QUIZ.MAX_QUESTIONS) fail(`A round can have up to ${QUIZ.MAX_QUESTIONS} questions.`);
  const questions = list.map((q, n) => {
    const label = `Question ${n + 1}`;
    const text = clean(q.text);
    if (!text) fail(`${label}: write the question.`);
    if (text.length > 160) fail(`${label}: keep the question under 160 characters.`);
    const raw = (q.options || []).map(clean);
    const options = raw.filter(Boolean);
    if (options.length < 2) fail(`${label}: add at least two answers.`);
    if (options.length > 4) fail(`${label}: a question can have up to four answers.`);
    if (options.some(o => o.length > 75)) fail(`${label}: keep each answer under 75 characters.`);
    const answerText = raw[Number(q.answer)];
    if (!answerText) fail(`${label}: mark one filled-in answer as correct.`);
    const seconds = Number(q.seconds) || 20;
    if (seconds < QUIZ.MIN_SECONDS || seconds > QUIZ.MAX_SECONDS) fail(`${label}: the timer must be ${QUIZ.MIN_SECONDS}–${QUIZ.MAX_SECONDS} seconds.`);
    return {id: q.id || `q${n + 1}`, text, options, answer: options.indexOf(answerText), seconds};
  });
  return {title, description, startAt: new Date(Date.parse(startAt)).toISOString(), questions};
}

/** Ready-made questions so a new round never starts from a blank page. */
export const SAMPLE_QUESTIONS = [
  {text: 'Which small change makes a focused reading session easier to start?', options: ['Keep every notification on', 'Choose a specific page goal', 'Switch between several apps', 'Wait until you feel ready'], answer: 1, seconds: 20},
  {text: 'What makes a short break feel restorative?', options: ['Opening an endless feed', 'Checking every new alert', 'A brief walk away from the screen', 'Starting several videos'], answer: 2, seconds: 20},
  {text: 'You want to avoid a distracting app while studying. What helps most?', options: ['Put the phone out of reach', 'Leave the app open', 'Keep refreshing the feed', 'Turn up notification sounds'], answer: 0, seconds: 20},
  {text: 'Which is a clear, achievable goal for one focus session?', options: ['Be productive all day', 'Never get distracted again', 'Finish one chosen page or task', 'Do everything at once'], answer: 2, seconds: 20},
  {text: 'After a distraction, what is a useful next step?', options: ['Give up on the session', 'Notice it and return to the task', 'Scroll until tomorrow', 'Open more tabs'], answer: 1, seconds: 20}
];
