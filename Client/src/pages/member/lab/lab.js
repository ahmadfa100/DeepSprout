/** Lab hub: status of the four instruments, retest eligibility and results. */
(() => {
  const DS = window.DeepSprout;
  const INSTRUMENTS = window.DeepSproutAssessments;
  const grid = document.getElementById('lab-grid');
  const dialog = document.getElementById('detail-dialog');

  const completedCount = () =>
    DS.ASSESSMENTS.filter(item => DS.assessmentAttempt(item.id)?.completedAt).length;

  function renderStatus() {
    const done = completedCount();
    const total = DS.ASSESSMENTS.length;
    document.getElementById('lab-meter').style.width = `${(done / total) * 100}%`;
    document.getElementById('lab-meter-caption').textContent =
      `${done} of ${total} assessments completed`;

    const note = document.getElementById('lab-status-note');
    const actions = document.getElementById('lab-actions');
    actions.replaceChildren();

    if (done === 0) {
      note.textContent = 'Nothing recorded yet. Your baseline is the set of four first attempts.';
    } else if (done < total) {
      note.textContent = 'Partial progress is not a baseline. Finish all four before comparing anything.';
    } else {
      const next = DS.ASSESSMENTS.map(item => DS.assessmentAttempt(item.id))
        .reduce((latest, attempt) => (!latest || attempt.completedAt > latest.completedAt ? attempt : latest), null);
      note.textContent = `Baseline complete. Last attempt recorded ${DS.formatDate(next.completedAt, { month: 'long', day: 'numeric' })}. Formal retests open ${DS.RETEST_WINDOW_DAYS} days after each attempt.`;
    }

    const pending = DS.nextAssessment();
    if (pending) {
      const start = document.createElement('a');
      start.className = 'btn btn-primary';
      start.href = `assessment.html?test=${pending.id}`;
      start.innerHTML = `${done === 0 ? 'Start' : 'Continue'} with ${pending.title} <svg><use href="#i-arrow"/></svg>`;
      actions.append(start);
    } else {
      const results = document.createElement('a');
      results.className = 'btn btn-primary';
      results.href = '../onboarding/starting-point.html';
      results.innerHTML = 'View your starting point <svg><use href="#i-arrow"/></svg>';
      actions.append(results);
    }
    const insights = document.createElement('a');
    insights.className = 'btn btn-ghost';
    insights.href = '../insights/insights.html';
    insights.innerHTML = 'Compare in Insights <svg><use href="#i-chart"/></svg>';
    actions.append(insights);
  }

  function resultRows(attempt, instrument) {
    const rows = [];
    (attempt.summary || []).forEach(entry => rows.push([entry.label, entry.value]));
    rows.push(['Instrument version', instrument.version]);
    rows.push(['Recorded', DS.formatDate(attempt.completedAt, { month: 'short', day: 'numeric', year: 'numeric' })]);
    return rows;
  }

  function renderCards() {
    grid.replaceChildren(...DS.ASSESSMENTS.map(meta => {
      const instrument = INSTRUMENTS[meta.id];
      const attempt = DS.assessmentAttempt(meta.id);
      const card = document.createElement('article');
      card.className = 'card lab-card';

      const head = document.createElement('div');
      head.className = 'card-head';
      head.innerHTML = `<span class="badge-icon ${instrument.tone}"><svg><use href="#${instrument.icon}"/></svg></span>
        <div><h3>${instrument.title}</h3><p class="lab-kind">${instrument.kind}</p></div>`;

      const blurb = document.createElement('p');
      blurb.textContent = instrument.blurb;

      const meta_row = document.createElement('div');
      meta_row.className = 'lab-meta';
      const status = attempt
        ? `<span class="pill"><svg><use href="#i-check"/></svg> Completed</span>`
        : `<span class="pill open">Not taken yet</span>`;
      meta_row.innerHTML = `${status}
        <span class="pill neutral"><svg><use href="#i-clock"/></svg> ~${instrument.minutes} min</span>
        <span class="evidence" data-kind="${instrument.evidence}">${instrument.evidence === 'verified' ? 'Task-measured' : 'Self-reported'}</span>`;

      card.append(head, blurb, meta_row);

      if (attempt) {
        const result = document.createElement('div');
        result.className = 'lab-result';
        const list = document.createElement('dl');
        resultRows(attempt, instrument).slice(0, 3).forEach(([label, value]) => {
          const dt = document.createElement('dt');
          dt.textContent = label;
          const dd = document.createElement('dd');
          dd.textContent = value;
          list.append(dt, dd);
        });
        result.append(list);
        card.append(result);
      }

      const actions = document.createElement('div');
      actions.className = 'lab-card-actions';

      if (!attempt) {
        const start = document.createElement('a');
        start.className = 'btn btn-primary';
        start.href = `assessment.html?test=${meta.id}`;
        start.innerHTML = `Take it <svg><use href="#i-arrow"/></svg>`;
        actions.append(start);
      } else {
        const details = document.createElement('button');
        details.type = 'button';
        details.className = 'btn btn-ghost';
        details.textContent = 'See full result';
        details.addEventListener('click', () => openDetail(instrument, attempt));
        actions.append(details);

        if (DS.retestEligible(meta.id)) {
          const retest = document.createElement('a');
          retest.className = 'btn btn-primary';
          retest.href = `assessment.html?test=${meta.id}&mode=retest`;
          retest.innerHTML = `Retake <svg><use href="#i-arrow"/></svg>`;
          actions.append(retest);
        } else {
          const days = DS.RETEST_WINDOW_DAYS - DS.daysBetween(attempt.completedAt, new Date());
          const locked = document.createElement('span');
          locked.className = 'lab-locked';
          locked.textContent = `Formal retest opens in ${Math.max(1, days)} day${days === 1 ? '' : 's'}`;
          actions.append(locked);
        }
      }

      card.append(actions);
      return card;
    }));
  }

  function openDetail(instrument, attempt) {
    document.getElementById('detail-eyebrow').textContent = instrument.kind;
    document.getElementById('detail-title').textContent = instrument.title;
    const body = document.getElementById('detail-body');
    body.replaceChildren();

    const summary = document.createElement('p');
    summary.textContent = instrument.records;
    body.append(summary);

    const list = document.createElement('dl');
    resultRows(attempt, instrument).forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      list.append(dt, dd);
    });
    body.append(list);

    const note = document.createElement('p');
    note.className = 'card-note';
    note.textContent = attempt.attemptNumber > 1
      ? `Attempt ${attempt.attemptNumber}. Earlier attempts are kept, but comparisons only hold when the instrument version matches.`
      : 'This is your baseline attempt. A comparison needs a second eligible attempt on the same instrument version.';
    body.append(note);

    if (attempt.caveat) {
      const caveat = document.createElement('p');
      caveat.className = 'card-note';
      caveat.textContent = attempt.caveat;
      body.append(caveat);
    }

    dialog.showModal();
  }

  dialog.querySelectorAll('[data-close-dialog]').forEach(button =>
    button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  renderStatus();
  renderCards();
})();
