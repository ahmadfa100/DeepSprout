/**
 * DeepSprout presentation scenarios.
 *
 * Builds a ready-to-present personal journal by driving the REAL journal
 * engines (setup, the four official baseline instruments, plan activation,
 * versioned practice players, routine logs, weekly Lab and weekly reviews) on
 * the Person-bound demo clock. Nothing here writes a record directly: every
 * attempt, review, level decision and Garden source is produced and validated
 * by DeepSproutAccount exactly as it is for a person using the pages.
 *
 * The results are SYNTHETIC demonstration evidence. They are marked so in three
 * places: assessment details, the measurement context ("demo-scenario"), and
 * the scenario register below, which the member layout reads to label pages.
 * Browser telemetry is never generated: Digital Shield stays "No data" until a
 * real extension observes usage.
 *
 * Exposed as window.DeepSproutDemoScenarios. Requires account.js.
 */
(() => {
  if (window.DeepSproutDemoScenarios) return;
  const REGISTER_KEY = 'deepsprout-demo-scenarios-v1';
  const VERSION = 1;
  const SOURCE = {label: 'Source', value: 'Synthetic presentation scenario'};

  // Day-by-day story. Every practice the engine scheduled that day is completed
  // unless "skip" leaves it to be recorded as missed; "extra" is an optional
  // practice the person chose; "lab" completes the weekly Lab pair.
  const RANIA_DAYS = [
    ['2026-09-28', {walk: true}],
    ['2026-09-29', {walk: true}],
    ['2026-09-30', {}],
    ['2026-10-01', {walk: true}],
    ['2026-10-02', {walk: true, extra: 'depth'}],
    ['2026-10-03', {walk: true}],
    ['2026-10-04', {review: {manageable: 'about-right', fit: 'good-fit'}, decision: 'accept'}],
    ['2026-10-05', {walk: true, lab: true}],
    ['2026-10-06', {walk: true}],
    ['2026-10-07', {levelUp: 'depth'}],
    ['2026-10-08', {skip: true, walk: 'skipped'}],
    ['2026-10-09', {walk: true}],
    ['2026-10-10', {walk: true}],
    ['2026-10-11', {review: {manageable: 'about-right', fit: 'good-fit'}, decision: 'accept'}],
    ['2026-10-12', {walk: true, lab: true}],
    ['2026-10-13', {walk: true}],
    ['2026-10-14', {}],
    ['2026-10-15', {walk: true}]
  ];

  const SCENARIOS = {
    'rania-active-journey': {
      id: 'rania-active-journey',
      personId: 'p-rania',
      title: 'Active personal journey',
      summary: 'Week 3 of an activated Recovery Plan: four valid baselines, two weekly reviews, two weekly Lab pairs, a Depth level-up, a missed day, an offline routine and Garden growth — plus her original Start Today admission and Weekend Nature Reset waiting-list place.',
      clock: '2026-10-16T10:00:00+03:00',
      start: '2026-09-28',
      goal: {id: 'reduce-scrolling', label: 'Spend less time on short-video feeds'},
      commitment: 'A 10-minute walk outside',
      firstWeek: [['2026-09-28', 'depth'], ['2026-09-30', 'practical'], ['2026-10-01', 'listening'], ['2026-10-03', 'depth']],
      days: RANIA_DAYS
    }
  };

  const readRegister = () => {
    try { const value = JSON.parse(localStorage.getItem(REGISTER_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; }
    catch { return {}; }
  };
  const writeRegister = value => localStorage.setItem(REGISTER_KEY, JSON.stringify(value));

  // Instrument responses inside each protocol's valid range. Scores follow the
  // instrument scale; they are illustrative synthetic values, not norms.
  const BASELINE = {
    'digital-habits': {score: 18, raw: {answers: {q1: 3, q2: 2, q3: 3, q4: 2, q5: 3, q6: 2, q7: 1, q8: 2}}},
    'sustained-attention': {score: 83, raw: {hits: Array.from({length: 20}, (_, i) => 386 + (i % 5) * 21), goTotal: 24, noGoTotal: 0, omissions: 4, commissions: 0, falseAlarms: 1, inputMethods: ['keyboard']}},
    'inhibitory-control': {score: 70, raw: {hits: Array.from({length: 27}, (_, i) => 352 + (i % 4) * 24), goTotal: 30, noGoTotal: 10, omissions: 3, commissions: 3, falseAlarms: 3, inputMethods: ['keyboard']}},
    'depth-challenge': {score: 4, raw: {answers: [0, 1, 2, 2, 0], readingSeconds: 142}}
  };
  // Weekly Lab values are deliberately mixed (one equal, two slightly lower,
  // one slightly higher-is-worse): the scenario must not tell an improvement
  // story. Repeat measurements are not evidence of recovery.
  const WEEKLY = [
    {'digital-habits': {score: 18, raw: {answers: {q1: 3, q2: 3, q3: 2, q4: 2, q5: 3, q6: 2, q7: 1, q8: 2}}}, 'sustained-attention': {score: 79, raw: {hits: Array.from({length: 19}, (_, i) => 391 + (i % 5) * 22), goTotal: 24, noGoTotal: 0, omissions: 5, commissions: 0, falseAlarms: 1, inputMethods: ['keyboard']}}},
    {'digital-habits': {score: 19, raw: {answers: {q1: 3, q2: 3, q3: 3, q4: 2, q5: 3, q6: 2, q7: 1, q8: 2}}}, 'inhibitory-control': {score: 70, raw: {hits: Array.from({length: 27}, (_, i) => 355 + (i % 4) * 23), goTotal: 30, noGoTotal: 10, omissions: 3, commissions: 3, falseAlarms: 3, inputMethods: ['keyboard']}}}
  ];
  const PRACTICAL = {
    artifact: '1. Cleared the desk surface. 2. Sorted the papers into keep, scan and recycle. 3. Moved the phone charger to the hallway shelf.',
    outcome: 'The desk is clear and my phone now charges outside the bedroom overnight.',
    confirmed: true
  };

  function recordAssessment(account, id, entry) {
    const run = account.beginAssessment(id, {context: {presentation: 'demo-scenario'}});
    const attempt = account.mutate({type: 'assessment.add', attempt: {id: run.id, definitionId: id, official: true, version: run.version, valid: true, score: entry.score, details: [SOURCE], raw: entry.raw}}).attempt;
    if (!attempt.valid) throw new Error(`${id}: ${attempt.validity?.reason || 'invalid result'}`);
    return attempt;
  }

  function practise(account, type, used) {
    const options = account.practiceDefinitions(type).filter(d => d.access.allowed);
    const definition = options.find(d => !used.has(d.id)) || options[0];
    if (!definition) throw new Error(`No ${type} practice is available on this day.`);
    used.add(definition.id);
    // Listening uses the transcript accessibility mode: no audio is played by
    // this builder, so it must not claim observed in-app playback.
    const run = account.beginPractice(definition.id, type === 'listening' ? {mode: 'transcript'} : {});
    const responses = definition.responseMethod === 'choice-questions' ? {answers: definition.questions.map(q => q.answer)} : PRACTICAL;
    const attempt = account.submitPractice(run.id, responses);
    if (!attempt.valid) throw new Error(`${type}: ${attempt.invalidReason}`);
    return attempt;
  }

  /**
   * Build a scenario into the CURRENTLY SIGNED-IN person's empty journal.
   * The caller signs the person in and confirms replacement beforehand.
   */
  function build(account, scenarioId, {onStep = () => {}} = {}) {
    const s = SCENARIOS[scenarioId];
    if (!s) throw new Error('Unknown demo scenario.');
    const person = account.profile();
    if (window.DeepSproutAccount.person()?.id !== s.personId) throw new Error(`Sign in as the scenario person (${s.personId}) first.`);
    if (account.changeCount()) throw new Error('This journal already has records. Clear it through the presenter page first.');
    const at = (day, hour = 10) => account.setDemoClock(`${day}T${String(hour).padStart(2, '0')}:00:00+03:00`);
    const used = new Set();

    at(s.start, 9);
    onStep('Setup and four baseline instruments');
    account.mutate({type: 'setup.save', goal: s.goal, setup: {availableDays: '4', offlineInterests: ['walking', 'reading']}});
    for (const id of Object.keys(BASELINE)) recordAssessment(account, id, BASELINE[id]);
    onStep('Recovery Plan activation');
    account.mutate({type: 'plan.activate', goal: s.goal.id, commitment: {title: s.commitment}, firstRunPlan: {availableDays: 4, minutes: 5}, schedule: s.firstWeek.map(([date, activityType]) => ({date, activityType, minutes: 5}))});
    // She has already been through the five-step product guide, so Home opens directly.
    account.mutate({type: 'tour.record', status: 'Completed'});

    let lab = 0;
    for (const [day, todo] of s.days) {
      at(day, todo.review ? 18 : 10);
      account.visitRecovery();
      onStep(`Journey · ${day}`);
      const due = account.schedule().filter(x => x.key === day && x.action.kind === 'practice' && x.state !== 'completed');
      if (!todo.skip) for (const row of due) practise(account, row.action.activityType, used);
      if (todo.extra) practise(account, todo.extra, used);
      if (todo.levelUp) {
        const t = account.training().find(t => t.id === todo.levelUp);
        if (t?.eligible) account.decidePracticeLevel(todo.levelUp, 'next');
      }
      if (todo.lab) {
        const set = WEEKLY[lab++];
        const tasks = account.checkInWindow().tasks.map(t => t.id);
        if (!tasks.every(id => set[id])) throw new Error(`Weekly Lab tasks changed: ${tasks.join(', ')}`);
        for (const id of tasks) recordAssessment(account, id, set[id]);
      }
      const routine = account.routine().items[0];
      if (todo.walk && routine) account.mutate({type: 'routine.log', id: routine.id, status: todo.walk === 'skipped' ? 'skipped' : 'done'});
      if (todo.review) {
        const week = account.plan().week;
        const proposal = account.weeklyProposal(week, todo.review);
        account.reviewWeek(week, todo.review, todo.decision, null, proposal.sourceRevision);
      }
    }
    account.setDemoClock(s.clock);
    account.visitRecovery();
    const summary = {scenario: s.id, version: VERSION, personId: s.personId, name: person.name, builtAt: new Date().toISOString(), clock: s.clock, events: account.changeCount()};
    const register = readRegister();
    register[s.personId] = summary;
    writeRegister(register);
    return summary;
  }

  window.DeepSproutDemoScenarios = {
    REGISTER_KEY,
    VERSION,
    list: () => Object.values(SCENARIOS).map(({days, firstWeek, ...rest}) => ({...rest})),
    get: id => SCENARIOS[id] || null,
    /** The register entry when this person's journal was produced by a scenario. */
    marker: personId => readRegister()[personId] || null,
    forget: personId => { const register = readRegister(); delete register[personId]; writeRegister(register); },
    build
  };
})();
