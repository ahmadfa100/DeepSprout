/**
 * The weekly review (spec 5.5): show what is recorded, ask two simple
 * questions, explain the recommendation, and let the user decide. Skipping is
 * a conservative continuation, never an increase in load.
 *
 * Everything shown comes from the account record (DeepSproutAccount). Saving
 * records the review — and the adjustment it chose — on the account, so Home,
 * Roadmap, Insights and the notification bell all move on together.
 */
(() => {
  if (window.DeepSproutPersonal?.denied()) { try { window.DeepSproutPersonal.requireAccess(); } catch {} return; }
  const Account = window.DeepSproutAccount;
  if (!Account) return;
  const fmt = Account.format;
  const stages = [...document.querySelectorAll('.wr-stage')];
  const $ = id => document.getElementById(id);
  const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

  const show = stage => {
    stages.forEach(section => { section.hidden = section.dataset.stage !== stage; });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

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
  const LABELS = {
    continue: 'Same pace, same practices',
    lighter: 'Lighter week ahead',
    more: 'One more practice added',
    swap: 'Practice types swapped',
    'keep-pace': 'Current pace kept',
    adjust: 'Adjusting it yourself'
  };
  const TEXT = {
    continue: 'Keep the same pace next week, with the same kind of practices.',
    lighter: 'Lighten next week: fewer or shorter practices, same goal.',
    more: 'Add one more practice next week, if you want it.',
    swap: 'Keep the pace but swap the practice types for ones that suit you better.'
  };

  Account.load().then(account => {
    const plan = account.plan();

    /* ------------------------------------------------------ nothing due yet */

    if (!plan) {
      $('none-text').textContent = 'You do not have an active plan yet. A review becomes due at the end of each plan week.';
      show('none');
      return;
    }

    const week = plan.week;
    const reviews = account.reviews();
    const alreadyReviewed = reviews.history.some(review => review.week === week);
    const forced = new URLSearchParams(location.search).get('force') === '1';
    const daysToDue = reviews.nextDue ? Account.daysBetween(account.today, reviews.nextDue) : null;

    if (alreadyReviewed && !forced) {
      $('none-text').textContent = `Week ${week} has already been reviewed. The next review is due at the end of week ${Math.min(plan.weeks, week + 1)}. You are on day ${plan.day} of ${plan.lengthDays}.`;
      show('none');
      return;
    }
    // A review opens the day before it is due, and stays open once due.
    if (daysToDue !== null && daysToDue > 1 && !forced) {
      $('none-text').textContent = `Your week ${week} review is due ${fmt.date(reviews.nextDue, { weekday: true })}, ${fmt.relativeDays(daysToDue)}. It opens the day before.`;
      show('none');
      return;
    }

    /* ----------------------------------------------------- what was recorded */

    const days = account.schedule(week);
    const practiceDays = days.filter(day => day.action?.kind === 'practice');
    const adherence = account.adherence(week);
    const dates = account.weekDates(week);
    const routine = {
      done: account.routineDays(dates[0], dates[6]).length,
      scheduled: account.routineScheduledDays(dates[0], dates[6]).length
    };
    const elapsed = days.filter(day => day.key <= account.todayKey).map(day => account.usageDay(day.date));
    const measured = elapsed.filter(day => day.state === 'measured');
    const usageAverage = measured.length ? measured.reduce((sum, day) => sum + day.minutes, 0) / measured.length : null;
    const overLimit = measured.filter(day => day.band === 'over').length;

    const dueWhen = daysToDue === 0 ? 'due today' : daysToDue === 1 ? 'due tomorrow' : 'overdue';
    $('review-eyebrow').textContent = `Week ${week} review · ${dueWhen} · day ${plan.day} of ${plan.lengthDays}`;

    const STATE = {
      completed: ['done', 'i-check'],
      missed: ['missed', 'i-minus'],
      'not-due': ['unknown', 'i-question'],
      rest: ['done', 'i-check']
    };
    const row = (state, icon, title, note) => {
      const item = document.createElement('li');
      item.dataset.state = state;
      item.innerHTML = `<span class="wr-mark"><svg><use href="#${icon}"/></svg></span>
        <span class="wr-ledger-body"><strong></strong><small></small></span>`;
      item.querySelector('strong').textContent = title;
      item.querySelector('small').textContent = note;
      return item;
    };

    const ledger = days.filter(day => day.action && day.action.kind !== 'review').map(day => {
      const label = day.isToday ? 'Today' : fmt.weekday(day.date);
      if (day.action.kind === 'rest') return row('done', 'i-check', `${label} · Rest day`, 'Planned rest. Not counted, and not a missed day.');
      const [state, icon] = STATE[day.state] || STATE['not-due'];
      const title = `${label} · ${day.action.type?.title || 'Practice'}`;
      const note = day.state === 'completed' ? `Completed · ${day.attempt.outcome} · measured`
        : day.state === 'missed' ? 'Due, with nothing recorded against it.'
          : 'Not due yet.';
      return row(state, icon, title, note);
    });
    ledger.push(row(routine.done ? 'done' : 'unknown', routine.done ? 'i-check' : 'i-question', 'Offline routine',
      routine.scheduled
        ? `${routine.done} of ${routine.scheduled} scheduled days ticked off — self-reported.`
        : 'Nothing was scheduled. That is unknown, not zero.'));
    ledger.push(row(measured.length ? 'done' : 'unknown', measured.length ? 'i-check' : 'i-question', 'Browser usage',
      measured.length
        ? `Measured on ${measured.length} of ${elapsed.length} days so far: average ${fmt.duration(usageAverage)}, over your ${account.usage(7).limit}-minute limit on ${plural(overLimit, 'day')}.`
        : 'No browser data for this week — the extension did not report, so this period was not observed.'));
    $('ledger').replaceChildren(...ledger);

    /* -------------------------------------------------------- the questions */

    const answers = { manageable: null, fit: null };
    let outcome = null;

    const renderQuestion = (key, containerId) => {
      const container = $(containerId);
      container.replaceChildren(...QUESTIONS[key].map(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choice';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', String(answers[key] === option.value));
        button.innerHTML = `<span class="mark"><svg><use href="#i-check"/></svg></span><span><strong></strong><small></small></span>`;
        button.querySelector('strong').textContent = option.label;
        button.querySelector('small').textContent = option.note;
        button.addEventListener('click', () => {
          answers[key] = option.value;
          renderQuestion(key, containerId);
          renderRecommendation();
        });
        return button;
      }));
    };

    /** A suggestion from the recorded week plus the two answers. */
    const recommend = () => {
      const why = [];
      let suggestion = 'continue';
      if (adherence.due) why.push(`${adherence.completed} of ${adherence.due} due practices completed, ${adherence.missed} with nothing recorded. Measured.`);
      why.push(routine.done
        ? `Your offline routine was ticked off on ${plural(routine.done, 'day')} — a self-report.`
        : 'No offline routine days were ticked off this week.');
      if (answers.manageable === 'too-much' || (adherence.missed >= 2 && answers.manageable === 'a-stretch')) {
        suggestion = 'lighter';
        why.push('You said the load was hard to manage, so the suggestion is to reduce it rather than repeat it.');
      } else if (answers.manageable === 'too-light' && adherence.missed === 0) {
        suggestion = 'more';
        why.push('Everything due was completed and you had room, so one more practice is available if you want it.');
      } else {
        why.push('Keeping the same pace is the default. Nothing increases unless you choose it.');
      }
      if (answers.fit === 'poor-fit') {
        why.push('You said the activities did not fit, so next week swaps the practice types rather than changing the amount.');
        if (suggestion === 'more') suggestion = 'swap';
      }
      return { suggestion, text: TEXT[suggestion], why };
    };

    const renderRecommendation = () => {
      const ready = answers.manageable && answers.fit;
      const { suggestion, text, why } = recommend();
      $('rec-text').textContent = ready ? text : 'Answer the two questions above and a suggestion appears here, with the reason behind it.';
      $('rec-why').replaceChildren(...(ready ? why : []).map(reason => {
        const item = document.createElement('li');
        item.textContent = reason;
        return item;
      }));
      if (!ready) {
        $('outcome-options').replaceChildren();
        $('save-review').disabled = true;
        $('save-note').textContent = 'Answer both questions to continue.';
        return;
      }
      const options = [
        { value: suggestion, label: 'Accept next week', note: text },
        { value: 'keep-pace', label: 'Keep my current pace', note: 'Repeat this week exactly as it was. Safe at any point in the cycle.' },
        { value: 'adjust', label: 'Let me adjust it myself', note: 'Saves the review, then opens the plan so you can change future days.' }
      ].filter((option, index) => !(suggestion === 'continue' && index === 1));
      const container = $('outcome-options');
      container.replaceChildren(...options.map(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wr-option';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', String(outcome === option.value));
        button.innerHTML = `<span class="mark"><svg><use href="#i-check"/></svg></span><span><strong></strong><small></small></span>`;
        button.querySelector('strong').textContent = option.label;
        button.querySelector('small').textContent = option.note;
        button.addEventListener('click', () => { outcome = option.value; renderRecommendation(); });
        return button;
      }));
      container.setAttribute('role', 'radiogroup');
      container.setAttribute('aria-label', 'What should next week look like');
      $('save-review').disabled = !outcome;
      $('save-note').textContent = outcome ? 'Saved as a plan revision with the reason and date.' : 'Choose what next week should look like.';
    };

    /* ----------------------------------------------------------- the summary */

    const summary = $('cycle-summary');
    [
      ['Cycle', `${plan.cycleNumber} · ${plan.lengthDays} days`],
      ['Week', `${week} of ${plan.weeks}`],
      ['Practices due', String(adherence.due)],
      ['Completed', String(adherence.completed)],
      ['Nothing recorded', String(adherence.missed)],
      ['Routine days', routine.scheduled ? `${routine.done} of ${routine.scheduled}` : '—']
    ].forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      summary.append(dt, dd);
    });

    /* ---------------------------------------------------------------- saving */

    $('save-review').addEventListener('click', () => {
      if (!outcome) return;
      const label = LABELS[outcome];
      account.mutate({
        type: 'review.add',
        review: {
          week,
          completedOn: account.todayKey,
          answers: { manageable: answers.manageable, fit: answers.fit },
          outcome,
          adjustment: { on: account.todayKey, label, detail: TEXT[outcome] || 'Your current pace continues.' }
        }
      });
      $('saved-text').textContent = `Week ${week} is recorded: ${adherence.completed} of ${adherence.due} due practices completed. ${label}.`;
      const revision = $('revision-summary');
      revision.replaceChildren();
      [
        ['Week reviewed', `Week ${week}`],
        ['Outcome', label],
        ['Felt', QUESTIONS.manageable.find(option => option.value === answers.manageable).label],
        ['Activity fit', QUESTIONS.fit.find(option => option.value === answers.fit).label],
        ['Recorded', fmt.date(account.today, { weekday: true, year: true })]
      ].forEach(([term, value]) => {
        const dt = document.createElement('dt');
        dt.textContent = term;
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
  }).catch(() => {
    $('none-text').textContent = 'Your review couldn’t be loaded, so nothing is shown rather than an empty week that isn’t true.';
    show('none');
  });
})();
