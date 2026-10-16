/**
 * Runs one check-in task end to end.
 *
 * An attempt is OFFICIAL only when the account allows it: the starting point,
 * or a task repeated inside the end-of-cycle window (or late, after a missed
 * window). Anything else is a PRACTICE ROUND: allowed any time, clearly
 * labelled, and never stored or compared. Only a finished run is saved; a
 * partial run is discarded (spec 4.4 / 4.5).
 */
(() => {
  if (window.DeepSproutPersonal?.denied()) { try { window.DeepSproutPersonal.requireAccess(); } catch {} return; }
  const Account = window.DeepSproutAccount;
  let account = null;
  let mode = { mode: 'practice', kind: 'practice' };
  const INSTRUMENTS = window.DeepSproutAssessments;
  const params = new URLSearchParams(location.search);
  const id = params.get('test');
  const onboardingFlow = params.get('flow') === 'onboarding';
  const instrument = INSTRUMENTS[id];

  if (!instrument) { location.replace('lab.html'); return; }

  const stages = [...document.querySelectorAll('.as-stage')];
  const barMeter = document.getElementById('bar-meter');
  const barStep = document.getElementById('bar-step');

  const showStage = (name, { step = '', progress = 0 } = {}) => {
    stages.forEach(stage => { stage.hidden = stage.dataset.stage !== name; });
    barStep.textContent = step;
    barMeter.style.width = `${Math.round(progress * 100)}%`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  document.getElementById('bar-title').textContent = instrument.title;

  /* ------------------------------------------------------------ intro stage */

  document.getElementById('intro-kind').textContent = instrument.kind;
  document.getElementById('intro-title').textContent = instrument.intro.heading;
  document.getElementById('intro-body').textContent = instrument.intro.body;
  document.getElementById('intro-icon').className = `badge-icon as-intro-mark ${instrument.tone}`;
  document.getElementById('intro-icon').innerHTML = `<svg><use href="#${instrument.icon}"/></svg>`;
  document.getElementById('intro-points').replaceChildren(...instrument.intro.points.map(point => {
    const item = document.createElement('li');
    item.textContent = point;
    return item;
  }));
  document.getElementById('intro-records').textContent = instrument.records;
  document.getElementById('intro-caveat').textContent = instrument.evidence === 'verified'
    ? 'A task result reflects one attempt on one day. Tiredness, interruptions and practice all move it.'
    : 'These answers are stored as self-reports. They are never combined with the timed task results.';

  const begin = document.getElementById('begin-button');
  const banner = document.getElementById('mode-banner');
  begin.disabled = true;
  document.getElementById('begin-button').addEventListener('click', start);
  showStage('intro', { step: instrument.kind });

  Account.load().then(loaded => {
    account = loaded;
    const allowed = account.checkInMode(id);
    // ?mode=practice always runs a practice round, even when an official attempt is open.
    mode = params.get('mode') === 'practice' ? { ...allowed, mode: 'practice', kind: 'practice' } : allowed;
    const names = Account.NAMES;
    if (mode.mode === 'practice') {
      banner.hidden = false;
      banner.textContent = 'Practice round — this does not count towards your results';
      begin.innerHTML = 'Start practice round <svg><use href="#i-arrow"/></svg>';
      if (allowed.mode === 'practice' && allowed.opens) {
        document.getElementById('intro-caveat').textContent = `Your next official ${names.checkIn.toLowerCase()} opens ${Account.format.date(allowed.opens, { weekday: true, year: true })}. Practice as often as you like until then — it is never recorded.`;
      }
    } else if (mode.kind === 'recheck') {
      banner.hidden = false;
      banner.dataset.kind = 'official';
      banner.textContent = mode.late
        ? `Official ${names.checkIn.toLowerCase()} — taken after the window closed, so the result will be marked late`
        : `Official ${names.checkIn.toLowerCase()} — this result is compared with ${names.baseline}`;
    }
    begin.disabled = false;
  }).catch(() => {
    banner.hidden = false;
    banner.textContent = 'Your account couldn’t be loaded, so this run is a practice round and will not be recorded.';
    begin.disabled = false;
  });

  /* --------------------------------------------------------------- quitting */

  const quitDialog = document.getElementById('quit-dialog');
  document.getElementById('quit-button').addEventListener('click', () => {
    pauseTask();
    quitDialog.showModal();
  });
  quitDialog.querySelectorAll('[data-close-dialog]').forEach(button =>
    button.addEventListener('click', () => { quitDialog.close(); resumeTask(); }));

  /* ------------------------------------------------------------------ start */

  function start() {
    if (id === 'digital-habits') startSurvey();
    else if (id === 'depth-challenge') startPassage();
    else startTask();
  }

  /* ------------------------------------------- instrument 1: questionnaire */

  const surveyAnswers = {};

  function startSurvey() {
    const form = document.getElementById('survey-form');
    form.replaceChildren(...instrument.items.map((item, position) => {
      const wrapper = document.createElement('fieldset');
      wrapper.className = 'as-item';
      wrapper.style.border = '1px solid var(--line)';
      wrapper.style.margin = '0';

      const legend = document.createElement('legend');
      legend.className = 'as-item-text';
      legend.textContent = `${position + 1}. ${item.text}`;

      const scale = document.createElement('div');
      scale.className = 'as-scale';
      scale.setAttribute('role', 'radiogroup');
      scale.setAttribute('aria-label', item.text);

      instrument.scale.forEach((label, value) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', 'false');
        button.textContent = label;
        button.addEventListener('click', () => {
          surveyAnswers[item.id] = value;
          [...scale.children].forEach((sibling, siblingValue) =>
            sibling.setAttribute('aria-checked', String(siblingValue === value)));
          updateSurveyProgress();
        });
        scale.append(button);
      });

      wrapper.append(legend, scale);
      return wrapper;
    }));

    updateSurveyProgress();
    showStage('survey', { step: `0 of ${instrument.items.length} answered`, progress: 0 });
  }

  function updateSurveyProgress() {
    const done = Object.keys(surveyAnswers).length;
    const total = instrument.items.length;
    document.getElementById('survey-progress').textContent = `${done} of ${total} answered`;
    document.getElementById('survey-submit').disabled = done < total;
    barStep.textContent = `${done} of ${total} answered`;
    barMeter.style.width = `${(done / total) * 100}%`;
  }

  document.getElementById('survey-submit').addEventListener('click', () => {
    const values = instrument.items.map(item => surveyAnswers[item.id]);
    const score = values.reduce((sum, value) => sum + value, 0);
    const frequent = values.filter(value => value >= 3).length;
    const strongest = instrument.items[values.indexOf(Math.max(...values))];

    finish({
      summary: [
        { label: 'Items answered', value: `${values.length} of ${instrument.items.length}` },
        { label: 'Rated "often" or more', value: `${frequent} of ${values.length}` },
        { label: 'Strongest self-report', value: strongest.text.replace(/^I /, '').replace(/\.$/, '') }
      ],
      score,
      raw: { answers: { ...surveyAnswers }, scale: instrument.scale },
      lead: 'Your answers are recorded as self-reports. They describe how you see your own week — they are not a score and not a measurement.',
      caveat: 'Self-reports are useful for choosing what to work on. They are kept separate from the three timed tasks and are never averaged with them.'
    });
  });

  /* ------------------------------------- instruments 2 & 3: the timed tasks */

  let taskTimers = [];
  let taskPaused = false;
  let awaitingResponse = false;
  let stimulusKind = null;
  let stimulusShownAt = 0;
  let trial = 0;
  const taskRecord = { hits: [], omissions: 0, falseAlarms: 0, commissions: 0, noGoTotal: 0, goTotal: 0 };

  const arena = document.getElementById('arena');
  const arenaShape = document.getElementById('arena-shape');
  const arenaLabel = document.getElementById('arena-label');
  const taskFeedback = document.getElementById('task-feedback');
  const taskProgress = document.getElementById('task-progress');

  const later = (fn, delay) => { taskTimers.push(window.setTimeout(fn, delay)); };
  const clearTimers = () => { taskTimers.forEach(window.clearTimeout); taskTimers = []; };
  const pauseTask = () => { taskPaused = true; clearTimers(); };
  const resumeTask = () => {
    if (!taskPaused) return;
    taskPaused = false;
    if (!document.querySelector('[data-stage="task"]').hidden) nextTrial();
  };

  function startTask() {
    document.getElementById('task-title').textContent = instrument.title;
    document.getElementById('task-instruction').textContent = id === 'sustained-attention'
      ? 'Respond the moment the green circle appears. Nothing else needs an action.'
      : 'Respond to the green circle. Do nothing when the amber square appears.';
    showStage('task', { step: 'Get ready', progress: 0 });
    arenaLabel.hidden = false;
    arenaLabel.textContent = 'Starting in 3…';
    let count = 3;
    const tick = () => {
      count -= 1;
      if (count > 0) { arenaLabel.textContent = `Starting in ${count}…`; later(tick, 900); }
      else { arenaLabel.textContent = 'Watch the box'; later(nextTrial, 900); }
    };
    later(tick, 900);
    document.addEventListener('keydown', onKey);
  }

  function nextTrial() {
    if (taskPaused) return;
    if (trial >= instrument.trials) { endTask(); return; }
    trial += 1;
    taskProgress.textContent = `Signal ${trial} of ${instrument.trials}`;
    barMeter.style.width = `${(trial / instrument.trials) * 100}%`;
    barStep.textContent = `Signal ${trial} of ${instrument.trials}`;

    const gap = id === 'sustained-attention'
      ? instrument.minGap + Math.random() * (instrument.maxGap - instrument.minGap)
      : instrument.gapMs + Math.random() * 350;

    arenaShape.hidden = true;
    arena.classList.remove('is-hit', 'is-error');
    arena.classList.add('is-armed');
    arenaLabel.hidden = false;
    arenaLabel.textContent = '';
    awaitingResponse = false;
    stimulusKind = null;

    later(showStimulus, gap);
  }

  function showStimulus() {
    if (taskPaused) return;
    // In go/no-go the first two trials are always "go", so the no-go signals
    // land against an established habit of responding.
    const isNoGo = id === 'inhibitory-control'
      && trial > 2
      && Math.random() < instrument.noGoRatio;

    stimulusKind = isNoGo ? 'nogo' : 'go';
    if (isNoGo) taskRecord.noGoTotal += 1; else taskRecord.goTotal += 1;

    arenaShape.className = `as-arena-shape ${stimulusKind}`;
    arenaShape.hidden = false;
    arenaLabel.hidden = true;
    awaitingResponse = true;
    stimulusShownAt = performance.now();

    later(() => {
      if (!awaitingResponse) return;
      awaitingResponse = false;
      arenaShape.hidden = true;
      if (stimulusKind === 'go') {
        taskRecord.omissions += 1;
        flash('Missed', false);
      } else {
        flash('Held back', true);
      }
      nextTrial();
    }, instrument.stimulusMs);
  }

  function respond() {
    if (taskPaused || document.querySelector('[data-stage="task"]').hidden) return;
    if (!awaitingResponse) {
      // A press with nothing on screen: an early response, not a hit.
      if (trial > 0 && trial <= instrument.trials) {
        taskRecord.falseAlarms += 1;
        flash('Too early', false);
      }
      return;
    }
    awaitingResponse = false;
    clearTimers();
    arenaShape.hidden = true;

    if (stimulusKind === 'go') {
      taskRecord.hits.push(Math.round(performance.now() - stimulusShownAt));
      arena.classList.add('is-hit');
      flash(`${Math.round(performance.now() - stimulusShownAt)} ms`, true);
    } else {
      taskRecord.commissions += 1;
      arena.classList.add('is-error');
      flash('That one was amber', false);
    }
    later(nextTrial, 420);
  }

  function flash(message, good) {
    taskFeedback.textContent = message;
    taskFeedback.className = good ? 'is-good' : 'is-bad';
    later(() => { taskFeedback.textContent = ''; }, 700);
  }

  function onKey(event) {
    if (event.code !== 'Space') return;
    if (document.querySelector('[data-stage="task"]').hidden) return;
    event.preventDefault();
    respond();
  }
  arena.addEventListener('click', respond);

  function endTask() {
    clearTimers();
    document.removeEventListener('keydown', onKey);
    arenaShape.hidden = true;
    arena.classList.remove('is-armed', 'is-hit', 'is-error');

    const times = taskRecord.hits;
    const mean = times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : null;
    const spread = times.length > 1
      ? Math.round(Math.sqrt(times.reduce((sum, value) => sum + (value - mean) ** 2, 0) / times.length))
      : null;

    // An attempt with excessive early responses is recorded but flagged, rather
    // than silently treated as a clean measurement.
    const sloppy = taskRecord.falseAlarms > Math.max(3, instrument.trials * 0.2);

    if (id === 'sustained-attention') {
      finish({
        summary: [
          { label: 'Targets detected', value: `${times.length} of ${taskRecord.goTotal}` },
          { label: 'Missed targets', value: String(taskRecord.omissions) },
          { label: 'Early responses', value: String(taskRecord.falseAlarms) },
          { label: 'Average reaction time', value: mean === null ? 'Not available' : `${mean} ms` },
          { label: 'Steadiness (spread)', value: spread === null ? 'Not available' : `±${spread} ms` }
        ],
        score: taskRecord.goTotal ? Math.round((times.length / taskRecord.goTotal) * 100) : 0,
        raw: { ...taskRecord, meanRt: mean, sdRt: spread },
        valid: !sloppy,
        lead: 'Your responses to the targets were recorded. Reaction time and steadiness are reported separately — a fast average with a wide spread is a different picture from a slower, even one.',
        caveat: sloppy
          ? 'This attempt had a high number of early responses, so the reaction times are flagged as less reliable. A later attempt will give a cleaner reading.'
          : 'One attempt on one day. Tiredness and interruptions move these numbers, and repeating the task tends to improve them on its own.'
      });
      return;
    }

    finish({
      summary: [
        { label: 'Correct responses', value: `${times.length} of ${taskRecord.goTotal}` },
        { label: 'Missed go signals', value: String(taskRecord.omissions) },
        { label: 'Responded on a hold signal', value: `${taskRecord.commissions} of ${taskRecord.noGoTotal}` },
        { label: 'Average reaction time', value: mean === null ? 'Not available' : `${mean} ms` }
      ],
      score: taskRecord.noGoTotal ? Math.round(((taskRecord.noGoTotal - taskRecord.commissions) / taskRecord.noGoTotal) * 100) : 0,
      raw: { ...taskRecord, meanRt: mean, sdRt: spread },
      valid: !sloppy,
      lead: 'Responding quickly and holding back are recorded as two different things. Fast responses with several hold-signal errors is a familiar pattern, not a failure.',
      caveat: sloppy
        ? 'This attempt had a high number of early responses, so it is flagged as less reliable.'
        : 'Response-control tasks are sensitive to practice. A second attempt usually looks better for that reason alone.'
    });
  }

  /* ------------------------------------------ instrument 4: depth challenge */

  let readingStartedAt = 0;
  let quizIndex = 0;
  const quizAnswers = [];

  function startPassage() {
    document.getElementById('passage-tier').textContent = `${instrument.difficulty} · passage ${instrument.version}`;
    document.getElementById('passage-title').textContent = instrument.passageTitle;
    document.getElementById('passage-body').replaceChildren(...instrument.passage.map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    readingStartedAt = performance.now();
    showStage('passage', { step: 'Reading', progress: .2 });
  }

  document.getElementById('passage-done').addEventListener('click', () => {
    readingStartedAt = performance.now() - readingStartedAt;
    renderQuizQuestion();
  });

  function renderQuizQuestion() {
    const question = instrument.questions[quizIndex];
    document.getElementById('quiz-count').textContent = `Question ${quizIndex + 1} of ${instrument.questions.length}`;
    document.getElementById('quiz-title').textContent = question.text;

    const options = document.getElementById('quiz-options');
    options.replaceChildren(...question.options.map((label, position) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(quizAnswers[quizIndex] === position));
      button.innerHTML = `<span class="mark"><svg><use href="#i-check"/></svg></span><span><strong>${label}</strong></span>`;
      button.addEventListener('click', () => {
        quizAnswers[quizIndex] = position;
        [...options.children].forEach((sibling, siblingIndex) =>
          sibling.setAttribute('aria-checked', String(siblingIndex === position)));
        document.getElementById('quiz-next').disabled = false;
      });
      return button;
    }));

    document.getElementById('quiz-next').disabled = quizAnswers[quizIndex] === undefined;
    document.getElementById('quiz-next').innerHTML = quizIndex === instrument.questions.length - 1
      ? 'Finish <svg><use href="#i-arrow"/></svg>'
      : 'Next <svg><use href="#i-arrow"/></svg>';

    showStage('quiz', {
      step: `Question ${quizIndex + 1} of ${instrument.questions.length}`,
      progress: .2 + .8 * (quizIndex / instrument.questions.length)
    });
  }

  document.getElementById('quiz-next').addEventListener('click', () => {
    if (quizIndex < instrument.questions.length - 1) {
      quizIndex += 1;
      renderQuizQuestion();
      return;
    }
    const correct = instrument.questions.reduce(
      (total, question, position) => total + (quizAnswers[position] === question.answer ? 1 : 0), 0);
    const seconds = Math.round(readingStartedAt / 1000);
    const words = instrument.passage.join(' ').split(/\s+/).length;

    finish({
      summary: [
        { label: 'Questions correct', value: `${correct} of ${instrument.questions.length}` },
        { label: 'Reading time', value: `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s` },
        { label: 'Passage', value: `${instrument.difficulty} · ${words} words` }
      ],
      score: correct,
      raw: { correct, total: instrument.questions.length, readingSeconds: seconds, answers: [...quizAnswers] },
      lead: 'Accuracy and reading time are recorded together. Reading quickly and answering poorly is a different result from reading slowly and answering well.',
      caveat: 'Comparisons only hold between passages of the same difficulty tier. A different passage is a different task.'
    });
  });

  /* ----------------------------------------------------------------- finish */

  function finish({ summary, raw, lead, caveat, valid = true, score }) {
    const official = mode.mode === 'official' && account;
    const names = Account.NAMES;
    if (official) {
      account.mutate({
        type: 'assessment.add',
        attempt: {
          id: `aa-${Date.now().toString(36)}`,
          definitionId: id,
          official: true,
          cycle: mode.cycle,
          on: account.todayKey,
          late: Boolean(mode.late),
          valid,
          score,
          version: instrument.version,
          details: summary,
          raw
        }
      });
    }

    document.getElementById('result-title').textContent = official
      ? `${instrument.title} recorded${mode.late ? ' · marked late' : ''}.`
      : 'Practice round finished — not recorded.';
    document.getElementById('result-lead').textContent = official
      ? lead
      : 'This run did not count towards your results. It is not stored, and it is never compared with anything.';
    document.getElementById('result-caveat').textContent = caveat;

    const rows = document.getElementById('result-rows');
    rows.replaceChildren();
    summary.forEach(entry => {
      const dt = document.createElement('dt');
      dt.textContent = entry.label;
      const dd = document.createElement('dd');
      dd.textContent = entry.value;
      rows.append(dt, dd);
    });
    const dt = document.createElement('dt');
    dt.textContent = 'Instrument version';
    const dd = document.createElement('dd');
    dd.textContent = instrument.version;
    rows.append(dt, dd);

    const actions = document.getElementById('result-actions');
    actions.replaceChildren();
    // The next official task still to take, if any (starting point or an open window).
    const next = official ? account.checkIns().find(entry => entry.id !== id && account.checkInMode(entry.id).mode === 'official') : null;
    if (next) {
      const continueButton = document.createElement('a');
      continueButton.className = 'btn btn-primary';
      continueButton.href = `assessment.html?test=${next.id}${onboardingFlow ? '&flow=onboarding' : ''}`;
      continueButton.innerHTML = `Next: ${next.title} <svg><use href="#i-arrow"/></svg>`;
      actions.append(continueButton);
      const pause = document.createElement('a');
      pause.className = 'btn btn-ghost';
      pause.href = 'lab.html';
      pause.innerHTML = `<svg><use href="#i-pause"/></svg> Continue later`;
      actions.append(pause);
    } else {
      const results = document.createElement('a');
      results.className = 'btn btn-primary';
      // The four baselines lead to Your Starting Point and plan activation (D04).
      const baseline = official && (onboardingFlow || mode.cycle === 1);
      results.href = baseline ? '../onboarding/starting-point.html' : '../insights/insights.html#checkins';
      results.innerHTML = `${baseline ? 'See your starting point' : official ? 'See your results' : 'Your results'} <svg><use href="#i-arrow"/></svg>`;
      actions.append(results);
      const back = document.createElement('a');
      back.className = 'btn btn-ghost';
      back.href = 'lab.html';
      back.textContent = `Back to ${names.checkInPage}`;
      actions.append(back);
    }

    showStage('result', { step: official ? 'Recorded' : 'Practice round · not recorded', progress: 1 });
  }
})();
