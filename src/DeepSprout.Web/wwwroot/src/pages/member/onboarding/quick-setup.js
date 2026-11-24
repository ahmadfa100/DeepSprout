/**
 * Onboarding 2.0: Meet Azm → six questions → "You're ready to begin" → the story → Home.
 *
 * Answers and progress come from the signed-in person's server profile.
 */
(() => {
  const account = window.DeepSproutAccount;
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

  let state;
  let answers = {};
  let index = 0;
  let scene = 'meet';
  let writes = Promise.resolve();

  const answered = q => Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : Boolean(answers[q.id]);

  function persist(action, data) {
    const write = writes.then(async () => {
      state = await account.writeQuickSetup(state, action, data);
    });
    writes = write.catch(() => {});
    return write;
  }

  function saveAnswer(question, finish = false) {
    return persist('answers', { question: question.id, answer: answers[question.id], finish });
  }

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
      const selected = answers[q.id];
      $('qs-saved').textContent = '';
      if (!answered(q)) return;
      saveAnswer(q).then(() => {
        if (QUESTIONS[index] === q && answers[q.id] === selected) $('qs-saved').textContent = 'Saved';
      }, error => {
        if (QUESTIONS[index] === q && answers[q.id] === selected) $('qs-error').textContent = error.message;
      });
    }));
    $('qs-saved').textContent = '';
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
    $('qs-question').querySelector('fieldset').disabled = true;
    const finish = index === TOTAL - 1;
    $('qs-error').textContent = '';
    try {
      await saveAnswer(q, finish);
      $('qs-saved').textContent = 'Saved';
      setProgress(index + 1);
      if (finish) {
        try {
          account.mirrorQuickSetup(await account.load(), state);
        } catch {
          window.DeepSproutPersonal.failure('Your answers are saved. Reload to refresh your Week 1 preview.');
        }
        await wait(reduced() ? 0 : 520);
        showReady();
      } else {
        await leaveQuestion(1);
        index += 1;
        renderQuestion(1);
        focusTitle();
      }
    } catch (error) {
      $('qs-error').textContent = error.message;
    } finally {
      $('qs-question').querySelector('fieldset').disabled = false;
      busy = false;
    }
  }

  async function back() {
    if (busy) return;
    if (index === 0) { show('meet', -1); return; }
    busy = true;
    await leaveQuestion(-1);
    index -= 1;
    setProgress(index);
    $('qs-error').textContent = '';
    renderQuestion(-1);
    focusTitle();
    busy = false;
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const focusTitle = () => $('q-title')?.focus({ preventScroll: true });

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

  async function start() {
    if (busy || !state) return;
    busy = true;
    showMeetError('');
    try {
      await persist('start');
      show('questions', 1);
    } catch (error) {
      showMeetError(error.message);
    } finally {
      busy = false;
    }
  }

  $('meet-begin').addEventListener('click', start);
  $('meet-skip').addEventListener('click', start);
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

  function showReady() {
    if (state.stage !== 'Story') {
      $('qs-returning').hidden = false;
      $('ready-title').textContent = 'Welcome back.';
      document.querySelector('.qs-ready-lead em').textContent = 'Your setup is saved. Watch the short story again, or head straight to Home.';
    }
    show('ready', 0);
  }

  function showMeetError(message) {
    $('meet-error').textContent = message;
    $('meet-error').hidden = !message;
  }

  async function resume() {
    $('meet-begin').disabled = $('meet-skip').disabled = true;
    try {
      state = await account.quickSetup();
      if (!state) throw new Error('Sign in to an Individual account to load your setup.');
      if (state.displayName) $('meet-hello').textContent = `Welcome, ${state.displayName.split(' ')[0]}`;
      const stored = state.answers || {};
      for (const question of QUESTIONS) {
        const options = question.options.map(([value]) => value);
        const value = stored[question.id];
        if (question.type === 'multi' && Array.isArray(value)) {
          answers[question.id] = value.filter(item => options.includes(item));
        } else if (options.includes(value)) {
          answers[question.id] = value;
        }
      }

      const editing = new URLSearchParams(location.search).get('step') === 'setup';
      if (editing) {
        show('questions', 1);
      } else if (state.setupComplete) {
        showReady();
      } else if (state.stage === 'QuickSetup' || state.answers) {
        const firstUnanswered = state.answersVersion === 2 ? QUESTIONS.findIndex(question => !answered(question)) : 0;
        index = firstUnanswered < 0 ? TOTAL - 1 : firstUnanswered;
        show('questions', 0);
      }
      $('meet-begin').disabled = $('meet-skip').disabled = false;
    } catch (error) {
      showMeetError(error.message);
    }
  }

  resume();
})();
