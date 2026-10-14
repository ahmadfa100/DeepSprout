/**
 * The weekly review (spec 5.5): show what is recorded, ask one or two simple
 * questions, explain the recommendation, and let the user decide. Skipping is
 * a conservative continuation, never an increase in load.
 */
(() => {
  const DS = window.DeepSprout;
  const stages = [...document.querySelectorAll('.wr-stage')];

  const show = stage => {
    stages.forEach(section => { section.hidden = section.dataset.stage !== stage; });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const state = DS.get();
  const plan = state.plan;

  /* -------------------------------------------------------- nothing due yet */

  if (!plan || plan.status !== 'active') {
    document.getElementById('none-text').textContent = plan
      ? 'Your plan is not currently running, so there is nothing to review.'
      : 'You do not have an active plan yet. A review becomes due at the end of each plan week.';
    show('none');
    return;
  }

  const week = DS.cycleWeek();
  const day = DS.cycleDay();
  const alreadyReviewed = state.reviews.some(review => review.week === week);
  const forced = new URLSearchParams(location.search).get('force') === '1';

  if (alreadyReviewed && !forced) {
    document.getElementById('none-text').textContent =
      `Week ${week} has already been reviewed. The next one becomes due at the end of week ${Math.min(4, week + 1)} — you are on day ${day} of ${plan.cycleLength}.`;
    show('none');
    return;
  }

  /* ------------------------------------------------------- what was recorded */

  /** Build the week's ledger from the plan's week-one schedule and the activity log. */
  function buildLedger() {
    const schedule = plan.weekOne || [];
    const start = new Date(plan.startDate);

    return schedule.map((entry, offset) => {
      const date = DS.addDays(start, offset);
      const inFuture = DS.daysBetween(new Date(), date) > 0;
      const logged = DS.activityOn(date);
      // Label from the actual date: the schedule's own labels were written at
      // activation, so "Today" would still read "Today" a week later.
      entry = {
        ...entry,
        label: DS.dayKey(date) === DS.dayKey()
          ? 'Today'
          : DS.formatDate(date, { weekday: 'short' })
      };

      if (entry.kind === 'review') {
        return { ...entry, state: 'unknown', note: 'This review. Nothing is recorded for it until you finish.' };
      }
      if (entry.kind === 'rest') {
        return { ...entry, state: 'done', note: 'Nothing was scheduled. A rest day is not a missed day.' };
      }
      if (inFuture) {
        return { ...entry, state: 'unknown', note: 'Not due yet.' };
      }
      if (logged.length) {
        return { ...entry, state: 'done', note: `Completed · ${logged[0].evidence === 'verified' ? 'recorded by the activity' : 'self-reported'}.` };
      }
      return { ...entry, state: 'missed', note: 'Due, with nothing recorded against it.' };
    });
  }

  const ledger = buildLedger();
  const dueCount = ledger.filter(entry => entry.kind === 'practice').length;
  const doneCount = ledger.filter(entry => entry.kind === 'practice' && entry.state === 'done').length;
  const missedCount = ledger.filter(entry => entry.kind === 'practice' && entry.state === 'missed').length;

  const routineDays = state.routine.reduce((total, item) =>
    total + Object.values(item.log || {}).filter(value => value === 'done').length, 0);

  document.getElementById('review-eyebrow').textContent = `Week ${week} review · day ${day} of ${plan.cycleLength}`;

  const ICONS = { done: 'i-check', missed: 'i-minus', unknown: 'i-question' };

  document.getElementById('ledger').replaceChildren(
    ...ledger.map(entry => {
      const item = document.createElement('li');
      item.dataset.state = entry.state;
      item.innerHTML = `<span class="wr-mark"><svg><use href="#${ICONS[entry.state]}"/></svg></span>
        <span class="wr-ledger-body"><strong>${entry.label} · ${entry.title}</strong><small>${entry.note}</small></span>`;
      return item;
    }),
    (() => {
      const item = document.createElement('li');
      item.dataset.state = routineDays ? 'done' : 'unknown';
      item.innerHTML = `<span class="wr-mark"><svg><use href="#${routineDays ? 'i-check' : 'i-question'}"/></svg></span>
        <span class="wr-ledger-body"><strong>Offline routine</strong>
        <small>${routineDays ? `${routineDays} day${routineDays === 1 ? '' : 's'} ticked off — self-reported.` : 'Nothing ticked off. That is unknown, not zero.'}</small></span>`;
      return item;
    })(),
    (() => {
      const item = document.createElement('li');
      item.dataset.state = 'unknown';
      item.innerHTML = `<span class="wr-mark"><svg><use href="#i-question"/></svg></span>
        <span class="wr-ledger-body"><strong>Browser usage</strong>
        <small>No browser usage data available — the extension is not connected, so this period was not observed.</small></span>`;
      return item;
    })()
  );

  /* ----------------------------------------------------------- the questions */

  const answers = { manageable: null, fit: null };

  const QUESTIONS = {
    manageable: [
      { value: 'too-light', label: 'Too light', note: 'I had room for more.' },
      { value: 'about-right', label: 'About right', note: 'It fitted my week.' },
      { value: 'a-stretch', label: 'A stretch', note: 'I managed, but only just.' },
      { value: 'too-much', label: 'Too much', note: 'It was not realistic.' }
    ],
    fit: [
      { value: 'good-fit', label: 'Yes, they fitted', note: 'The activities suited me.' },
      { value: 'mixed', label: 'Some did', note: 'Mixed — some worked, some did not.' },
      { value: 'poor-fit', label: 'Not really', note: "I'd rather do something else." }
    ]
  };

  function renderQuestion(key, containerId) {
    const container = document.getElementById(containerId);
    container.replaceChildren(...QUESTIONS[key].map(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(answers[key] === option.value));
      button.innerHTML = `<span class="mark"><svg><use href="#i-check"/></svg></span>
        <span><strong>${option.label}</strong><small>${option.note}</small></span>`;
      button.addEventListener('click', () => {
        answers[key] = option.value;
        renderQuestion(key, containerId);
        renderRecommendation();
      });
      return button;
    }));
  }

  /* -------------------------------------------------------- recommendation */

  let outcome = null;

  /** Derive a suggestion from the recorded week plus the two answers. */
  function recommend() {
    const why = [];
    let suggestion = 'continue';

    if (dueCount) {
      why.push(`${doneCount} of ${dueCount} scheduled practices completed, ${missedCount} with nothing recorded.`);
    }
    why.push(routineDays
      ? `Your offline routine was ticked off on ${routineDays} day${routineDays === 1 ? '' : 's'} — a self-report.`
      : 'No offline routine days were ticked off this week.');

    if (answers.manageable === 'too-much' || (missedCount >= 2 && answers.manageable === 'a-stretch')) {
      suggestion = 'lighter';
      why.push('You said the load was hard to manage, so the suggestion is to reduce it rather than repeat it.');
    } else if (answers.manageable === 'too-light' && missedCount === 0) {
      suggestion = 'more';
      why.push('Everything scheduled was completed and you had room, so one more practice is available if you want it.');
    } else {
      why.push('Keeping the same pace is the default. Nothing increases unless you choose it.');
    }

    if (answers.fit === 'poor-fit') {
      why.push('You said the activities did not fit, so next week swaps the practice types rather than changing the amount.');
      suggestion = suggestion === 'more' ? 'swap' : suggestion;
    }

    const TEXT = {
      continue: 'Keep the same pace next week, with the same kind of practices.',
      lighter: 'Lighten next week: fewer scheduled practices, same goal.',
      more: 'Add one more practice next week, if you want it.',
      swap: 'Keep the pace but swap the practice types for ones that suit you better.'
    };

    return { suggestion, text: TEXT[suggestion], why };
  }

  function renderRecommendation() {
    const ready = answers.manageable && answers.fit;
    const { suggestion, text, why } = recommend();

    document.getElementById('rec-text').textContent = ready
      ? text
      : 'Answer the two questions above and a suggestion appears here, with the reason behind it.';

    document.getElementById('rec-why').replaceChildren(...(ready ? why : []).map(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      return item;
    }));

    if (!ready) {
      document.getElementById('outcome-options').replaceChildren();
      document.getElementById('save-review').disabled = true;
      document.getElementById('save-note').textContent = 'Answer both questions to continue.';
      return;
    }

    const OPTIONS = [
      {
        value: suggestion,
        label: 'Accept next week',
        note: text
      },
      {
        value: 'keep-pace',
        label: 'Keep my current pace',
        note: 'Repeat this week exactly as it was. Safe at any point in the cycle.'
      },
      {
        value: 'adjust',
        label: 'Let me adjust it myself',
        note: 'Saves the review, then opens the plan so you can change future days.'
      }
    ];

    // When the engine already suggests keeping pace, do not offer it twice.
    const options = suggestion === 'continue' ? OPTIONS.slice(1) : OPTIONS;
    if (suggestion === 'continue') options[0] = { ...options[0], label: 'Accept next week', note: text };

    const container = document.getElementById('outcome-options');
    container.replaceChildren(...options.map(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wr-option';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(outcome === option.value));
      button.innerHTML = `<span class="mark"><svg><use href="#i-check"/></svg></span>
        <span><strong>${option.label}</strong><small>${option.note}</small></span>`;
      button.addEventListener('click', () => {
        outcome = option.value;
        renderRecommendation();
      });
      return button;
    }));
    container.setAttribute('role', 'radiogroup');
    container.setAttribute('aria-label', 'What should next week look like');

    document.getElementById('save-review').disabled = !outcome;
    document.getElementById('save-note').textContent = outcome
      ? 'Saved as a plan revision with the reason and date.'
      : 'Choose what next week should look like.';
  }

  /* ------------------------------------------------------------- the summary */

  const summary = document.getElementById('cycle-summary');
  [
    ['Cycle', `${plan.cycleNumber} · ${plan.cycleLength} days`],
    ['Week', `${week} of 4`],
    ['Practices due', String(dueCount)],
    ['Completed', String(doneCount)],
    ['Nothing recorded', String(missedCount)],
    ['Routine days', String(routineDays)]
  ].forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    summary.append(dt, dd);
  });

  /* ------------------------------------------------------------------ saving */

  document.getElementById('save-review').addEventListener('click', () => {
    if (!outcome) return;
    DS.recordReview({
      outcome,
      manageable: answers.manageable,
      fit: answers.fit,
      due: dueCount,
      completed: doneCount,
      missed: missedCount,
      routineDays
    });

    const LABELS = {
      continue: 'Same pace, same practices',
      lighter: 'Lighter week ahead',
      more: 'One more practice added',
      swap: 'Practice types swapped',
      'keep-pace': 'Current pace kept',
      adjust: 'Adjusting it yourself'
    };

    document.getElementById('saved-text').textContent =
      `Week ${week} is recorded: ${doneCount} of ${dueCount} practices completed. ${LABELS[outcome]}.`;

    const revision = document.getElementById('revision-summary');
    revision.replaceChildren();
    [
      ['Week reviewed', `Week ${week}`],
      ['Outcome', LABELS[outcome]],
      ['Felt', QUESTIONS.manageable.find(option => option.value === answers.manageable).label],
      ['Activity fit', QUESTIONS.fit.find(option => option.value === answers.fit).label],
      ['Recorded', DS.formatDate(new Date(), { month: 'long', day: 'numeric' })]
    ].forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      revision.append(dt, dd);
    });

    show('saved');
    if (outcome === 'adjust') {
      window.setTimeout(() => { location.href = '../recovery-plan/recovery-plan.html#adjust'; }, 1600);
    }
  });

  renderQuestion('manageable', 'q1');
  renderQuestion('fit', 'q2');
  renderRecommendation();
  show('review');
})();
