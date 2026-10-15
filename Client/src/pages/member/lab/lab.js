/**
 * Check-in hub. (Data entities and file names keep the "assessment"/"lab"
 * naming; only the display name changes, and it lives in Account.NAMES.)
 *
 * Scheduling rules, all read from the account's check-in policy:
 *  - The starting point is the first official attempt of each task.
 *  - Official re-checks open only at the end of a cycle, ±windowDays.
 *  - Each cycle repeats Digital Habits plus ONE rotating task; every third
 *    cycle is a full check of all four.
 *  - A missed window stays available on return; the result is marked late.
 *  - Practice rounds are open any time and are never stored or compared.
 */
(() => {
  const Account = window.DeepSproutAccount;
  const INSTRUMENTS = window.DeepSproutAssessments;
  if (!Account) return;
  const fmt = Account.format;
  const NAMES = Account.NAMES;
  const $ = id => document.getElementById(id);
  const grid = $('lab-grid');
  const dialog = $('detail-dialog');
  const lower = text => text.toLowerCase();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  const list = items => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0] || '');
  const scoreText = (value, scale) => `${value}${scale.unit}`;
  const rangeText = scale => `${scale.min}–${scale.max}${scale.unit}, ${scale.direction} is better`;

  document.title = `${NAMES.checkIn} — DeepSprout`;

  Account.load().then(account => {
    const due = account.checkInWindow();
    const plan = account.plan();
    const instruments = account.checkIns();
    const nextOfficial = instruments.find(entry => account.checkInMode(entry.id).mode === 'official');

    /* ---------------------------------------------------------- hero actions */

    const actions = $('lab-actions');
    const button = (href, label, kind = 'btn-primary') => `<a class="btn ${kind}" href="${href}">${esc(label)} <svg><use href="#i-arrow"/></svg></a>`;
    if (nextOfficial) {
      actions.innerHTML = button(`assessment.html?test=${nextOfficial.id}`, due.state === 'baseline-needed' ? `Start with ${nextOfficial.title}` : `Continue: ${nextOfficial.title}`)
        + button('../insights/insights.html#checkins', 'Results in Insights', 'btn-ghost');
    } else {
      actions.innerHTML = `<span class="btn btn-primary is-disabled" aria-disabled="true"><svg><use href="#i-lock"/></svg> ${due.opens ? `Your next ${lower(NAMES.checkIn)} in ${plural(due.daysUntilOpen, 'day')}` : 'All done for now'}</span>`
        + button('../insights/insights.html#checkins', 'Results in Insights', 'btn-ghost');
    }

    /* ------------------------------------------------------------ the window */

    const tasks = list(due.tasks.map(task => task.title));
    const windowBox = $('ci-window');
    windowBox.dataset.state = due.state;
    const head = (eyebrow, title) => `<p class="eyebrow">${esc(eyebrow)}</p><h2 id="ci-window-title">${title}</h2>`;
    if (due.state === 'baseline-needed') {
      const remaining = instruments.filter(entry => !entry.latest);
      windowBox.innerHTML = `<div>${head(NAMES.baseline, `Take your starting ${lower(NAMES.checkIn)}`)}
        <p>${esc(list(remaining.map(entry => entry.title)))} · about ${remaining.reduce((sum, entry) => sum + entry.minutes, 0)} minutes in total. Your plan is built from it.</p></div>
        ${nextOfficial ? button(`assessment.html?test=${nextOfficial.id}`, `Start with ${nextOfficial.title}`) : ''}`;
    } else if (due.state === 'upcoming') {
      windowBox.innerHTML = `<div>${head('Next official check', `Your next ${lower(NAMES.checkIn)} in <span class="ci-num">${due.daysUntilOpen}</span> ${due.daysUntilOpen === 1 ? 'day' : 'days'}`)}
        <p>Opens ${esc(fmt.date(due.opens, { weekday: true, year: true }))} and stays open until ${esc(fmt.date(due.closes, { weekday: true }))}. A ${due.kind} check: ${esc(tasks)} · about ${due.minutes} minutes.</p></div>
        <span class="btn btn-primary is-disabled" aria-disabled="true"><svg><use href="#i-lock"/></svg> Opens ${esc(fmt.date(due.opens, { year: true }))}</span>`;
    } else if (due.state === 'open' || due.state === 'late') {
      windowBox.classList.add('is-open');
      windowBox.innerHTML = `<div>${head(due.state === 'late' ? 'Window closed — still available' : 'Your window is open',
        due.state === 'late' ? `Take your ${lower(NAMES.checkIn)} now — it will be marked late` : `It’s time for your ${lower(NAMES.checkIn)}`)}
        <p>We’ll repeat <strong>${esc(tasks)}</strong>. It takes about <strong>${due.minutes} minutes</strong>${due.state === 'late'
          ? `. The window closed on ${esc(fmt.date(due.closes, { weekday: true }))}, so results are flagged as late.`
          : ` and the window is open until ${esc(fmt.date(due.closes, { weekday: true }))}.`}</p></div>
        ${nextOfficial ? button(`assessment.html?test=${nextOfficial.id}`, `Start ${nextOfficial.title}`) : ''}`;
    } else {
      windowBox.innerHTML = `<div>${head('This cycle', `This cycle’s ${lower(NAMES.checkIn)} is done`)}<p>Your next one opens at the end of the next cycle.</p></div>`;
    }

    /* ---------------------------------------------------------- the schedule */

    const timeline = $('ci-timeline');
    if (!plan) {
      timeline.innerHTML = `<li class="ci-step is-now"><b>Starting point</b><span>Before your plan begins — all four tasks once.</span></li>
        <li class="ci-step"><b>End of each cycle</b><span>Digital Habits plus one rotating task, about 5 minutes.</span></li>
        <li class="ci-step"><b>Every third cycle</b><span>A full check of all four tasks.</span></li>`;
    } else {
      const policy = account.checkInPolicy();
      const rows = [`<li class="ci-step is-done"><b>${esc(NAMES.baseline[0].toUpperCase() + NAMES.baseline.slice(1))}</b><span>All four tasks · ${esc(fmt.date(instruments.find(entry => entry.baseline)?.baseline.on, { year: true }))}</span><em>Done</em></li>`];
      for (let offset = 0; offset < 3; offset += 1) {
        const cycle = plan.cycleNumber + offset;
        const end = Account.addDays(plan.start, (offset + 1) * plan.lengthDays - 1);
        const set = account.checkInTasks(cycle);
        const opens = Account.addDays(end, -policy.windowDays);
        const current = offset === 0 ? due.state : 'later';
        rows.push(`<li class="ci-step${offset === 0 ? ' is-now' : ''}${set.kind === 'full' ? ' is-full' : ''}">
          <b>End of cycle ${cycle} · ${set.kind === 'full' ? 'full check' : 'short check'}</b>
          <span>${esc(list(set.tasks.map(task => task.title)))} · about ${set.minutes} min · window ${esc(fmt.date(opens))} – ${esc(fmt.date(Account.addDays(end, policy.windowDays)))}</span>
          <em>${current === 'upcoming' ? `In ${plural(Account.daysBetween(account.today, opens), 'day')}` : current === 'open' ? 'Open now' : current === 'late' ? 'Late — available' : current === 'done' ? 'Done' : 'Later'}</em></li>`);
      }
      timeline.innerHTML = rows.join('');
    }

    /* ------------------------------------------------------------ the tasks */

    grid.replaceChildren(...instruments.map(entry => {
      const instrument = INSTRUMENTS[entry.id];
      const allowed = account.checkInMode(entry.id);
      const card = document.createElement('article');
      card.className = 'card lab-card';
      const measured = entry.latest
        ? entry.comparison
          ? `<dl><dt>${esc(NAMES.baseline)}</dt><dd>${esc(scoreText(entry.comparison.from.score, entry.scale))} · ${esc(fmt.date(entry.comparison.from.on))}</dd>
              <dt>${esc(NAMES.latest)}</dt><dd>${esc(scoreText(entry.comparison.to.score, entry.scale))} · ${esc(fmt.date(entry.comparison.to.on))}${entry.comparison.to.late ? ' · late' : ''}</dd></dl>`
          : `<dl><dt>${esc(NAMES.baseline)}</dt><dd>${esc(scoreText(entry.latest.score, entry.scale))} · ${esc(fmt.date(entry.latest.on, { year: true }))}</dd>
              <dt>Last measured</dt><dd>Cycle ${entry.lastMeasuredCycle}</dd></dl>`
        : '<p class="lab-unmeasured">Not measured yet.</p>';
      const next = entry.nextMeasured
        ? `Next measured: end of cycle ${entry.nextMeasured.cycle}, from ${fmt.date(entry.nextMeasured.opens)}`
        : '';
      card.innerHTML = `<div class="card-head"><span class="badge-icon ${instrument.tone}"><svg><use href="#${instrument.icon}"/></svg></span>
          <div><h3>${esc(entry.title)}</h3><p class="lab-kind">${esc(entry.kind)} · ${esc(rangeText(entry.scale))}</p></div></div>
        <div class="lab-meta"><span class="evidence" data-kind="${entry.provenance.id === 'measured' ? 'verified' : 'self'}">${esc(entry.provenance.label)}</span>
          <span class="pill neutral"><svg><use href="#i-clock"/></svg> ~${entry.minutes} min</span></div>
        <div class="lab-result">${measured}</div>
        <p class="lab-next">${esc(next)}</p>
        <div class="lab-card-actions"></div>`;
      const cardActions = card.querySelector('.lab-card-actions');
      if (allowed.mode === 'official') {
        cardActions.insertAdjacentHTML('beforeend', button(`assessment.html?test=${entry.id}`, allowed.kind === 'baseline' ? 'Take it' : allowed.late ? 'Take it (late)' : 'Take it now'));
      }
      cardActions.insertAdjacentHTML('beforeend', `<a class="btn btn-ghost" href="assessment.html?test=${entry.id}&mode=practice">Practice round</a>`);
      if (entry.latest) {
        const details = document.createElement('button');
        details.type = 'button';
        details.className = 'btn btn-quiet';
        details.textContent = 'Full result';
        details.addEventListener('click', () => openDetail(instrument, entry));
        cardActions.append(details);
      }
      return card;
    }));

    function openDetail(instrument, entry) {
      $('detail-eyebrow').textContent = entry.kind;
      $('detail-title').textContent = entry.title;
      const body = $('detail-body');
      body.replaceChildren();
      const summary = document.createElement('p');
      summary.textContent = instrument.records;
      const rows = document.createElement('dl');
      [...(entry.latest.details || []).map(detail => [detail.label, detail.value]),
        ['Score', `${scoreText(entry.latest.score, entry.scale)} (${rangeText(entry.scale)})`],
        ['Recorded', fmt.date(entry.latest.on, { weekday: true, year: true })]
      ].forEach(([term, value]) => {
        const dt = document.createElement('dt');
        dt.textContent = term;
        const dd = document.createElement('dd');
        dd.textContent = value;
        rows.append(dt, dd);
      });
      const note = document.createElement('p');
      note.className = 'card-note';
      note.textContent = entry.comparison
        ? 'Compared with your starting point because this task was measured again. Repeating a test can raise the score through practice alone.'
        : `No comparison yet. A comparison appears only after this task is measured again at the end of a cycle — practice rounds never count.`;
      body.append(summary, rows, note);
      dialog.showModal();
    }
  }).catch(() => {
    $('ci-window').innerHTML = '<p>Your check-in record couldn’t be loaded. Nothing is shown rather than results that aren’t true.</p>';
  });

  dialog.querySelectorAll('[data-close-dialog]').forEach(close => close.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
})();
