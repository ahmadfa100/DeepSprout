/**
 * Onboarding 2.0: Meet Azm → six questions → "You're ready to begin" → the story → Home.
 *
 * Answers are saved after every change (device-local demo state and the personal journal), so a
 * refresh resumes on the same question with the same answers. Finishing records the setup and a
 * preliminary Week 1 proposal; nothing is activated. No cognitive assessment is required.
 */
(() => {
  if (window.DeepSproutPersonal?.denied()) { try { window.DeepSproutPersonal.requireAccess(); } catch {} return; }
  const DS = window.DeepSprout;
  const root = document.body.dataset.root || '../../../../';
  const $ = id => document.getElementById(id);
  const shell = $('qs');
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const QUESTIONS = [
    { id: 'change', type: 'single', title: 'What would you like to change?', options: [
      ['reduce-scrolling', 'Spend less time on Reels and Shorts'],
      ['intentional-phone', 'Use my phone more intentionally'],
      ['offline-time', 'Make more time for real-life activities'],
      ['focus-objective', 'Improve focus on things that matter to me']] },
    { id: 'apps', type: 'multi', title: 'Which apps pull you in the most?', hint: 'Choose all that apply.', options: [
      ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube / Shorts'], ['facebook', 'Facebook'], ['other', 'Other']] },
    { id: 'dailyScroll', type: 'single', title: 'Roughly how much time do you spend scrolling each day?', hint: 'Your own estimate is enough. DeepSprout does not measure this.', options: [
      ['under-60', 'Less than 1 hour'], ['60-120', '1–2 hours'], ['120-240', '2–4 hours'], ['over-240', 'More than 4 hours'], ['unsure', 'I’m not sure']] },
    { id: 'moments', type: 'single', title: 'When does scrolling usually take over?', options: [
      ['before-bed', 'Before bed'], ['morning', 'In the morning'], ['study-work', 'During study or work'], ['bored', 'When I’m bored'], ['unsure', 'It varies / I’m not sure']] },
    { id: 'makeTimeFor', type: 'multi', title: 'What would you love to make more time for?', hint: 'Choose all that apply.', options: [
      ['walking-sports', 'Walking / sports'], ['reading-learning', 'Reading / learning'], ['drawing-creativity', 'Drawing / creativity'], ['friends-family', 'Friends / family'], ['hobbies', 'Personal hobbies'], ['other', 'Other']] },
    { id: 'dailyMinutes', type: 'single', title: 'How much time feels realistic for a small daily activity?', options: [
      ['5', '5 minutes'], ['10', '10 minutes'], ['15', '15 minutes'], ['20', '20 minutes']] }
  ];
  const TOTAL = QUESTIONS.length;

  // Earlier interest keys stay readable by the plan preview, Profile and the activity pages.
  const LEGACY_INTERESTS = { 'walking-sports': ['walking', 'sport'], 'reading-learning': ['reading'], 'drawing-creativity': ['drawing'], 'friends-family': ['people'], hobbies: ['hobbies'], other: ['other'] };
  const COMMITMENTS = {
    'walking-sports': m => ({ title: `A ${m}-minute walk or some movement`, hint: 'Outside if you can, around the room if not.' }),
    'reading-learning': m => ({ title: `${m} minutes of reading, on paper`, hint: 'A book, a magazine, or notes you want to learn.' }),
    'drawing-creativity': m => ({ title: `${m} minutes of drawing or making`, hint: 'No skill required. One small thing is enough.' }),
    'friends-family': m => ({ title: `${m} minutes with someone, phone away`, hint: 'In person or on a call — not a message.' }),
    hobbies: m => ({ title: `${m} minutes on a hobby you enjoy`, hint: 'Something you already like doing.' }),
    other: m => ({ title: `${m} minutes of something offline`, hint: 'Anything away from a screen.' })
  };

  /* ------------------------------------------------------------- state */

  const state = DS.get();
  const saved = state.onboarding.quickSetup || {};
  const answers = { ...(saved.answers || {}) };
  let index = Math.min(TOTAL - 1, Math.max(0, Number(saved.index) || 0));
  let journal = null;
  let scene = 'meet';

  const answered = q => Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : Boolean(answers[q.id]);
  const remember = () => {
    try {
      DS.update(current => {
        current.onboarding.bimoSeen = true;
        current.onboarding.quickSetup = { version: 2, index, answers: JSON.parse(JSON.stringify(answers)), updatedAt: new Date().toISOString() };
      });
      $('qs-saved').textContent = 'Saved';
    } catch (error) { $('qs-error').textContent = error.message; }
  };

  /* ---------------------------------------------------------- progress */

  // The bar shows completed questions: 0 of 6 on the first, 6 of 6 only once the sixth is answered.
  const fill = $('qs-fill');
  function setProgress(done, animate = true) {
    const value = Math.max(0, Math.min(1, done / TOTAL));
    fill.style.transition = animate && !reduced() ? '' : 'none';
    fill.style.transform = `scaleX(${value})`;
    fill.dataset.value = value.toFixed(4);
    if (!animate) { void fill.offsetWidth; fill.style.transition = ''; }
  }

  /* ---------------------------------------------------------- questions */

  function renderQuestion(direction = 0) {
    const q = QUESTIONS[index];
    const host = $('qs-question');
    const name = `q-${q.id}`;
    const multi = q.type === 'multi';
    const value = answers[q.id];
    const options = q.options.map(([v, label], i) => {
      const checked = multi ? (value || []).includes(v) : value === v;
      return `<label class="qs-option" style="--i:${i}"><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${v}"${checked ? ' checked' : ''}><span class="qs-option-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9"/></svg></span><span class="qs-option-label">${label}</span></label>`;
    }).join('');
    host.innerHTML = `<p class="qs-step" id="q-step">Question ${index + 1} of ${TOTAL}</p>
      <fieldset class="qs-fieldset" aria-describedby="q-step${q.hint ? ' q-hint' : ''}">
        <legend class="qs-q-title" id="q-title" tabindex="-1">${q.title}</legend>
        ${q.hint ? `<p class="qs-q-hint" id="q-hint">${q.hint}</p>` : ''}
        <div class="qs-options${q.options.length > 4 ? ' is-many' : ''}">${options}</div>
      </fieldset>`;
    host.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
      if (multi) answers[q.id] = [...host.querySelectorAll('input:checked')].map(i => i.value);
      else answers[q.id] = input.value;
      $('qs-error').textContent = '';
      syncControls();
      remember();
    }));
    $('qs-count').textContent = `Question ${index + 1} of ${TOTAL}`;
    $('qs-back').hidden = false;
    $('qs-back').disabled = false;
    syncControls();
    leaving?.cancel();
    leaving = null;
    if (direction && !reduced()) host.animate([{ opacity: 0, transform: `translateX(${direction * 28}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,.61,.36,1)' });
    return host;
  }

  function syncControls() {
    const q = QUESTIONS[index];
    $('qs-next').setAttribute('aria-disabled', String(!answered(q)));
    $('qs-next').firstChild.textContent = index === TOTAL - 1 ? 'Finish ' : 'Continue ';
  }

  // The outgoing question holds its faded state until the next one has replaced it, then lets go.
  let leaving = null;
  async function leaveQuestion(direction) {
    const host = $('qs-question');
    if (reduced()) return;
    leaving = host.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-direction * 28}px)` }], { duration: 220, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    await leaving.finished.catch(() => {});
  }

  let busy = false;
  async function next() {
    if (busy) return;
    const q = QUESTIONS[index];
    if (!answered(q)) {
      $('qs-error').textContent = q.type === 'multi' ? 'Choose at least one option to continue.' : 'Choose an option to continue.';
      $('qs-question').querySelector('input')?.focus();
      return;
    }
    busy = true;
    setProgress(index + 1);
    if (index === TOTAL - 1) {
      try { await finish(); } catch (error) { $('qs-error').textContent = error.message; setProgress(index); busy = false; return; }
      await wait(reduced() ? 0 : 520);
      busy = false;
      show('ready', 1);
      return;
    }
    await leaveQuestion(1);
    index += 1;
    remember();
    renderQuestion(1);
    focusTitle();
    busy = false;
  }

  async function back() {
    if (busy) return;
    if (index === 0) { show('meet', -1); return; }
    busy = true;
    await leaveQuestion(-1);
    index -= 1;
    setProgress(index);
    remember();
    renderQuestion(-1);
    focusTitle();
    busy = false;
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const focusTitle = () => $('q-title')?.focus({ preventScroll: true });

  /* ------------------------------------------------------------ finish */

  // Records the six answers and a preliminary Week 1 proposal. Nothing is activated here.
  async function finish() {
    const account = journal || await window.DeepSproutAccount.load();
    journal = account;
    const previous = account.profile().setup || {};
    const minutes = Number(answers.dailyMinutes) || 10;
    const interests = [...new Set((answers.makeTimeFor || []).flatMap(key => LEGACY_INTERESTS[key] || [key]))];
    const goal = answers.change;
    const setup = {
      ...previous,
      version: 2,
      previousAnswers: previous.version !== 2 && previous.answers ? JSON.parse(JSON.stringify(previous.answers)) : previous.previousAnswers,
      answeredOn: account.todayKey,
      answers: JSON.parse(JSON.stringify(answers)),
      distracting: answers.apps || [],
      baselineMinutes: answers.dailyScroll || '',
      baselineSource: 'self-reported estimate',
      peakTime: answers.moments || '',
      makeTimeFor: answers.makeTimeFor || [],
      offlineInterests: interests,
      dailyMinutes: minutes
    };
    account.mutate({ type: 'setup.save', goal: { id: goal, label: DS.GOALS[goal] || goal, setOn: account.todayKey }, setup });
    if (!account.plan()) {
      const first = (answers.makeTimeFor || [])[0] || 'other';
      const commitment = { ...(COMMITMENTS[first] || COMMITMENTS.other)(minutes), durationMinutes: minutes };
      const draft = account.preview() || {};
      account.mutate({ type: 'onboarding.preview', preview: { ...draft, goal, days: Number(draft.days) || 3, minutes: Math.min(15, minutes), commitment, source: 'Quick Setup v2 · preliminary proposal' } });
    }
    DS.update(current => {
      Object.assign(current.profile, { goal, distracting: setup.distracting, peakTime: setup.peakTime, baselineMinutes: setup.baselineMinutes, offlineInterests: interests });
      Object.assign(current.onboarding, { bimoSeen: true, introSeen: true, setupDone: true, journeyLevel: Math.max(1, Number(current.onboarding.journeyLevel) || 1) });
      current.onboarding.quickSetup = { version: 2, index: TOTAL - 1, answers: JSON.parse(JSON.stringify(answers)), completedAt: new Date().toISOString() };
    });
  }

  /* ------------------------------------------------------------ scenes */

  function show(next, direction = 1) {
    const from = scene;
    scene = next;
    shell.dataset.step = next;
    document.querySelectorAll('.qs-scene').forEach(section => { section.hidden = section.dataset.scene !== next; });
    const section = document.querySelector(`.qs-scene[data-scene="${next}"]`);
    if (next === 'questions') { renderQuestion(from === 'questions' ? 0 : direction); setProgress(index, from !== 'meet'); }
    if (next === 'ready') setProgress(TOTAL, false);
    if (!reduced() && from !== next) section.animate([{ opacity: 0, transform: `translateY(${direction * 18}px)` }, { opacity: 1, transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.22,.61,.36,1)' });
    window.scrollTo({ top: 0, behavior: 'auto' });
    const heading = section.querySelector('h1, legend');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  }

  $('meet-begin').addEventListener('click', () => { remember(); show('questions', 1); });
  $('meet-skip').addEventListener('click', () => { DS.update(c => { c.onboarding.bimoSeen = true; c.onboarding.introSeen = true; }); show('questions', 1); });
  $('qs-form').addEventListener('submit', event => { event.preventDefault(); next(); });
  $('qs-back').addEventListener('click', back);

  // The story continues in the same warm canvas: copy leaves, the sun rises, then the page changes.
  $('ready-story').addEventListener('click', async () => {
    const target = `${root}hero-reels-lab.html?flow=onboarding`;
    shell.dataset.leaving = 'true';
    await wait(reduced() ? 0 : 900);
    location.href = target;
  });

  /* ------------------------------------------------------------ resume */

  window.DeepSproutAccount.load().then(value => { journal = value; }, error => { $('qs-error').textContent = error.message; });
  const person = window.DeepSproutPersonal?.person?.();
  if (person?.name) $('meet-hello').textContent = `Welcome, ${String(person.name).split(' ')[0]}`;

  const requested = new URLSearchParams(location.search).get('step');
  const progress = DS.get().onboarding;
  if (requested === 'setup') {
    // Changing earlier answers: start from the first question with everything prefilled.
    const setup = progress.quickSetup?.answers;
    if (!setup) {
      const stored = DS.get().profile;
      if (stored.goal && !answers.change) answers.change = stored.goal;
    }
    index = 0;
    show('questions', 1);
  } else if (progress.setupDone) {
    // Completed users are never sent through the questions again.
    $('qs-returning').hidden = false;
    $('ready-title').textContent = 'Welcome back.';
    document.querySelector('.qs-ready-lead em').textContent = 'Your setup is saved. Watch the short story again, or head straight to Home.';
    show('ready', 0);
  } else if (progress.quickSetup || progress.introSeen) {
    show('questions', 0);
  } else {
    show('meet', 0);
  }
})();
