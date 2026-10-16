/**
 * First-run flow: Meet Bimo → Before We Begin → Quick Personal Setup → handoff
 * into the Lab assessments. Each screen writes to the shared demo state so a
 * returning visitor resumes where they stopped.
 */
(() => {
  if (window.DeepSproutPersonal?.denied()) { try { window.DeepSproutPersonal.requireAccess(); } catch {} return; }
  const DS = window.DeepSprout;
  const root = document.body.dataset.root || '../../../../';
  const screens = [...document.querySelectorAll('.ob-screen')];

  const show = step => {
    screens.forEach(screen => { screen.hidden = screen.dataset.step !== step; });
    window.scrollTo({ top: 0, behavior: 'auto' });
    const heading = document.querySelector(`.ob-screen[data-step="${step}"] h1`);
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    if (step === 'setup') renderQuestion();
    if (step === 'handoff') renderHandoff();
  };

  /* ------------------------------------------------- questions (spec 4.3) */

  const questions = [
    {
      id: 'goal',
      type: 'single',
      title: 'What would you most like to change?',
      hint: 'This becomes the goal your plan is built around. You can change it later.',
      why: 'Your goal decides which activities your plan proposes — nothing else here affects it.',
      options: [
        { value: 'reduce-scrolling', label: 'Spend less time on short-video feeds', note: 'Reels, Shorts, TikTok-style feeds.' },
        { value: 'intentional-phone', label: 'Use my phone more intentionally', note: 'Fewer unplanned pickups and drifting sessions.' },
        { value: 'offline-time', label: 'Make room for offline interests', note: 'Protect time for things you already enjoy.' },
        { value: 'focus-objective', label: 'Support a specific focus objective', note: 'Studying, a project, or work that needs real attention.' }
      ]
    },
    {
      id: 'distracting',
      type: 'multi',
      title: 'Which services pull you in the most?',
      hint: 'Pick any that apply. These become the starting list for Digital Shield.',
      why: 'Digital Shield can only act inside a supported browser. Selecting a service here does not block the phone app.',
      options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'youtube', label: 'YouTube / Shorts' },
        { value: 'x', label: 'X' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'snapchat', label: 'Snapchat' },
        { value: 'other', label: 'Something else' }
      ]
    },
    {
      id: 'peakTime',
      type: 'single',
      title: 'When do you usually scroll more than you meant to?',
      hint: 'Your own sense of it is enough.',
      why: 'This can suggest a time for protection. It is a self-report — DeepSprout does not infer it from your behaviour.',
      options: [
        { value: 'morning', label: 'Morning', note: 'Right after waking up.' },
        { value: 'afternoon', label: 'Afternoon', note: 'Breaks and lulls in the day.' },
        { value: 'evening', label: 'Evening', note: 'After the day winds down.' },
        { value: 'late-night', label: 'Late at night', note: 'In bed, later than planned.' },
        { value: 'unsure', label: 'Varies / not sure', note: 'No clear pattern yet.' }
      ]
    },
    {
      id: 'baselineMinutes',
      type: 'single',
      optional: true,
      title: 'Roughly how long do you scroll on a normal day?',
      hint: 'A rough guess. This question is optional.',
      why: 'Stored as a self-reported baseline. It is kept separate from anything the browser extension measures and is never mixed with it.',
      options: [
        { value: 'under-30', label: 'Under 30 minutes' },
        { value: '30-60', label: '30 – 60 minutes' },
        { value: '60-120', label: '1 – 2 hours' },
        { value: '120-180', label: '2 – 3 hours' },
        { value: 'over-180', label: 'More than 3 hours' },
        { value: 'unsure', label: 'I honestly do not know' }
      ]
    },
    {
      id: 'devices',
      type: 'multi',
      title: 'Where do you usually browse?',
      hint: 'Pick any that apply.',
      why: 'Protection and usage measurement work in a supported desktop browser only. Knowing this keeps the Shield instructions honest.',
      options: [
        { value: 'chrome-desktop', label: 'Chrome on a computer', note: 'Digital Shield can protect and measure here.' },
        { value: 'other-desktop', label: 'Another desktop browser', note: 'Protection may not be available yet.' },
        { value: 'phone', label: 'Mostly on my phone', note: 'Phone apps cannot be blocked or measured by DeepSprout.' },
        { value: 'tablet', label: 'Tablet' }
      ]
    },
    {
      id: 'offlineInterests',
      type: 'multi',
      title: 'What do you enjoy away from a screen?',
      hint: 'Pick a few. These shape the offline ideas you are offered.',
      why: 'Used only to suggest relevant offline alternatives. Preferences are stored separately from any assessment result.',
      options: [
        { value: 'walking', label: 'Walking or being outside' },
        { value: 'sport', label: 'Sport or exercise' },
        { value: 'reading', label: 'Reading on paper' },
        { value: 'drawing', label: 'Drawing or making things' },
        { value: 'music', label: 'Music' },
        { value: 'cooking', label: 'Cooking' },
        { value: 'people', label: 'Time with friends or family' },
        { value: 'quiet', label: 'Quiet time on my own' }
      ]
    },
    {
      id: 'availableDays',
      type: 'single',
      title: 'How many days a week can you realistically give this?',
      hint: 'Be honest rather than ambitious — the plan adapts to what you pick.',
      why: 'Prevents an overloaded schedule. Days with nothing scheduled are a normal part of a plan.',
      options: [
        { value: '2', label: '2 days', note: 'A light start.' },
        { value: '3', label: '3 days', note: 'The usual starting point.' },
        { value: '4', label: '4 days' },
        { value: '5', label: '5 days or more', note: 'The plan still keeps rest days.' }
      ]
    },
    {
      id: 'protection',
      type: 'single',
      title: 'How much should DeepSprout step in?',
      hint: 'You stay in control — this only sets the suggested defaults.',
      why: 'Suggests Digital Shield defaults. You still choose when protection starts and what the limit is.',
      options: [
        { value: 'gentle', label: 'Gentle', note: 'A reminder when I pass my own limit.' },
        { value: 'balanced', label: 'Balanced', note: 'Reminders, plus protection when I ask for it.' },
        { value: 'firm', label: 'Firm', note: 'Suggest longer protected sessions by default.' }
      ]
    }
  ];

  let index = 0;
  const answers = {};

  const state = DS.get();
  questions.forEach(question => {
    const stored = state.profile[question.id];
    if (stored !== undefined && stored !== '' && !(Array.isArray(stored) && !stored.length)) {
      answers[question.id] = stored;
    }
  });

  const questionEl = document.getElementById('setup-question');
  const whyEl = document.getElementById('setup-why');
  const railEl = document.getElementById('setup-rail');
  const countEl = document.getElementById('setup-count');
  const savedEl = document.getElementById('setup-saved');
  const nextButton = document.getElementById('setup-next');
  const backButton = document.getElementById('setup-back');
  const skipButton = document.getElementById('setup-skip');

  const answered = question => {
    const value = answers[question.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  };

  const persist = () => DS.update(current => {
    Object.assign(current.profile, answers);
    current.onboarding.bimoSeen = true;
  });

  function renderRail() {
    railEl.replaceChildren(...questions.map((question, position) => {
      const bar = document.createElement('span');
      if (position < index) bar.className = 'is-done';
      else if (position === index) bar.className = 'is-current';
      return bar;
    }));
    countEl.textContent = `Question ${index + 1} of ${questions.length}`;
  }

  function renderQuestion() {
    const question = questions[index];
    renderRail();

    const heading = document.createElement('h2');
    heading.textContent = question.title;
    const hint = document.createElement('p');
    hint.className = 'ob-question-hint';
    hint.textContent = question.hint;

    const grid = document.createElement('div');
    grid.className = `choice-grid${question.type === 'multi' ? ' multi' : ''}`;
    grid.setAttribute('role', question.type === 'multi' ? 'group' : 'radiogroup');
    grid.setAttribute('aria-label', question.title);

    question.options.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.dataset.value = option.value;
      button.innerHTML = `<span class="mark"><svg><use href="#i-check"/></svg></span>
        <span><strong>${option.label}</strong>${option.note ? `<small>${option.note}</small>` : ''}</span>`;
      const selected = question.type === 'multi'
        ? (answers[question.id] || []).includes(option.value)
        : answers[question.id] === option.value;
      button.setAttribute(question.type === 'multi' ? 'aria-pressed' : 'aria-checked', String(selected));
      if (question.type !== 'multi') button.setAttribute('role', 'radio');
      button.addEventListener('click', () => select(question, option.value));
      grid.append(button);
    });

    questionEl.replaceChildren(heading, hint, grid);
    whyEl.textContent = question.why;
    backButton.disabled = index === 0;
    skipButton.hidden = !question.optional && question.type !== 'multi';
    nextButton.disabled = !question.optional && !answered(question);
    nextButton.innerHTML = index === questions.length - 1
      ? 'Finish setup <svg><use href="#i-arrow"/></svg>'
      : 'Continue <svg><use href="#i-arrow"/></svg>';
    savedEl.textContent = '';
  }

  function select(question, value) {
    if (question.type === 'multi') {
      const current = new Set(answers[question.id] || []);
      current.has(value) ? current.delete(value) : current.add(value);
      answers[question.id] = [...current];
      renderQuestion();
      return;
    }
    answers[question.id] = value;
    persist();
    renderQuestion();
    // A single-choice answer advances on its own — one tap, one question.
    window.setTimeout(() => { if (questions[index] === question) advance(); }, 240);
  }

  async function advance() {
    persist();
    if (index === questions.length - 1) {
      // Also record the setup on the account, so Home, Profile and every
      // account-backed page see that it is done.
      try {
      const account = await window.DeepSproutAccount.load();
      account.mutate({
        type: 'setup.save',
        goal: answers.goal ? { id: answers.goal, label: DS.GOALS[answers.goal] || answers.goal, setOn: account.todayKey } : null,
        setup: {
          answeredOn: account.todayKey,
          distracting: answers.distracting || [], peakTime: answers.peakTime || '', baselineMinutes: answers.baselineMinutes || '',
          devices: answers.devices || [], offlineInterests: answers.offlineInterests || [],
          availableDays: answers.availableDays || '', protection: answers.protection || ''
        }
      });
      DS.update(current => { current.onboarding.setupDone = true; current.onboarding.introSeen = true; });
      } catch (error) { savedEl.textContent = error.message; return; }
      show('handoff');
      return;
    }
    index += 1;
    renderQuestion();
    savedEl.textContent = 'Saved on this device.';
  }

  document.getElementById('setup-form').addEventListener('submit', event => {
    event.preventDefault();
    advance();
  });
  backButton.addEventListener('click', () => {
    if (index === 0) return;
    index -= 1;
    renderQuestion();
  });
  skipButton.addEventListener('click', () => {
    delete answers[questions[index].id];
    advance();
  });

  /* ---------------------------------------------------------- handoff view */

  function renderHandoff() {
    const goal = DS.GOALS[answers.goal] || 'a more intentional relationship with your feeds';
    document.getElementById('handoff-goal').textContent = `We'll build your plan around one goal: ${goal.toLowerCase()}.`;
    const next = DS.nextAssessment();
    if (!next) { document.getElementById('handoff-next-title').textContent = 'Your Starting Point'; document.getElementById('handoff-next-note').textContent = 'Your four starting checks are recorded.'; return; }
    document.getElementById('handoff-next-title').textContent = next.title;
    document.getElementById('handoff-next-note').textContent = `${next.kind} · about ${next.minutes} minutes. Your result is recorded on its own — the four assessments are never combined into a single score.`;
  }

  document.getElementById('handoff-start').addEventListener('click', () => {
    const next = DS.nextAssessment();
    location.href = next ? `${root}src/pages/member/lab/assessment.html?test=${next.id}&flow=onboarding` : 'starting-point.html';
  });

  /* -------------------------------------------------------------- plumbing */

  document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => {
    const step = button.dataset.go;
    if (step !== 'meet') DS.update(current => { current.onboarding.bimoSeen = true; });
    if (step === 'setup') DS.update(current => { current.onboarding.introSeen = true; });
    show(step);
  }));

  document.querySelector('[data-skip-intro]').addEventListener('click', () => {
    DS.update(current => {
      current.onboarding.bimoSeen = true;
      current.onboarding.introSeen = true;
    });
    show('setup');
  });

  const privacyDialog = document.getElementById('privacy-dialog');
  document.querySelector('[data-privacy]').addEventListener('click', () => privacyDialog.showModal());
  privacyDialog.querySelectorAll('[data-close-dialog]').forEach(button =>
    button.addEventListener('click', () => privacyDialog.close()));
  privacyDialog.addEventListener('click', event => {
    if (event.target === privacyDialog) privacyDialog.close();
  });

  /* ------------------------------------------------- resume where we left off */

  const requested = new URLSearchParams(location.search).get('step');
  const onboarding = DS.get().onboarding;
  if (requested && screens.some(screen => screen.dataset.step === requested)) {
    if (requested === 'setup') {
      // Resume on the first unanswered question rather than restarting.
      const first = questions.findIndex(question => !question.optional && !answered(question));
      index = first === -1 ? questions.length - 1 : first;
    }
    show(requested);
  } else if (onboarding.setupDone) {
    show('handoff');
  } else if (onboarding.introSeen || onboarding.bimoSeen) {
    const first = questions.findIndex(question => !question.optional && !answered(question));
    index = first === -1 ? 0 : first;
    show(onboarding.introSeen ? 'setup' : 'intro');
  } else {
    show('meet');
  }
})();
