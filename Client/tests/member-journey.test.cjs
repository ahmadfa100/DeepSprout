/**
 * Runs the individual cycle end to end in jsdom: onboarding setup, all four
 * assessments, plan activation, the offline routine and the weekly review.
 *
 * Needs jsdom. If it is not installed the test reports that and exits 0, so it
 * never blocks a machine without it:
 *   npm install jsdom   (or NODE_PATH=/tmp/ds-test/node_modules node tests/member-journey.test.cjs)
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch {
  console.log('member-journey: skipped (jsdom not installed)');
  process.exit(0);
}

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

/**
 * Load a page with its own scripts executed, sharing one localStorage across
 * the whole run so state carries between pages like it does in a browser.
 */
const store = new Map();
const storageApi = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  clear: () => store.clear(),
  key: index => [...store.keys()][index] ?? null,
  get length() { return store.size; }
};

// A Proxy so Object.keys(localStorage) lists the stored keys, the way a real
// Storage does — the demo reset relies on enumerating them.
const fakeStorage = new Proxy(storageApi, {
  ownKeys: () => [...store.keys()],
  getOwnPropertyDescriptor: (_target, key) =>
    (store.has(key) ? { value: store.get(key), enumerable: true, configurable: true } : undefined),
  has: (target, key) => key in target || store.has(key),
  get: (target, key) => (key in target ? target[key] : store.get(key))
});

/**
 * Replaces the page's timers with a queue the test drives by hand, so a task
 * built from chained setTimeouts can be stepped through in milliseconds.
 */
function controlClock(window) {
  const queue = [];
  let now = 0;
  let nextId = 1;

  window.setTimeout = (fn, delay = 0) => {
    const id = nextId++;
    queue.push({ id, fn, at: now + delay });
    return id;
  };
  window.clearTimeout = id => {
    const index = queue.findIndex(entry => entry.id === id);
    if (index !== -1) queue.splice(index, 1);
  };
  window.performance.now = () => now;

  return {
    /** Run queued callbacks in time order until none are left or the cap is hit. */
    drain(maxSteps = 5000) {
      let steps = 0;
      while (queue.length && steps < maxSteps) {
        queue.sort((a, b) => a.at - b.at);
        const entry = queue.shift();
        now = Math.max(now, entry.at);
        entry.fn();
        steps += 1;
      }
      return steps;
    },
    /** Run only the callbacks due at or before the next one, then stop. */
    step() {
      if (!queue.length) return false;
      queue.sort((a, b) => a.at - b.at);
      const entry = queue.shift();
      now = Math.max(now, entry.at);
      entry.fn();
      return true;
    },
    advance(ms) { now += ms; },
    get pending() { return queue.length; }
  };
}

function load(page, { search = '', clock = false } = {}) {
  const dir = path.dirname(page);
  const html = read(page);
  const dom = new JSDOM(html, {
    url: `http://localhost/${page}${search}`,
    pretendToBeVisual: true,
    // outside-only gives us window.eval in the page's own context without
    // letting jsdom fetch and run the <script src> tags itself.
    runScripts: 'outside-only'
  });
  const { window } = dom;

  Object.defineProperty(window, 'localStorage', { value: fakeStorage, configurable: true });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};

  const errors = [];
  window.addEventListener('error', event => errors.push(event.message));
  const timers = clock ? controlClock(window) : null;

  // Execute the page's own deferred scripts in order.
  [...window.document.querySelectorAll('script[src]')]
    .map(tag => tag.getAttribute('src'))
    .filter(src => !src.startsWith('http'))
    .forEach(src => {
      const file = path.resolve(root, dir, src);
      if (!fs.existsSync(file)) throw new Error(`${page}: script not found — ${src}`);
      try {
        window.eval(fs.readFileSync(file, 'utf8'));
      } catch (error) {
        throw new Error(`${page} → ${src}: ${error.message}`);
      }
    });

  assert.deepEqual(errors, [], `${page} raised runtime errors`);
  window.__timers = timers;
  return window;
}

const checks = [];
const check = (name, fn) => { checks.push([name, fn]); };

/* ----------------------------------------------------------- the journey */

check('onboarding records the setup answers', () => {
  const window = load('src/pages/member/onboarding/onboarding.html');
  const document = window.document;

  // Meet Bimo → Before We Begin → setup.
  document.querySelector('[data-go="intro"]').click();
  assert.equal(document.querySelector('[data-step="intro"]').hidden, false, 'intro screen should show');

  document.querySelector('[data-go="setup"]').click();
  assert.equal(document.querySelector('[data-step="setup"]').hidden, false, 'setup should show');

  // Answer all eight questions by taking the first option each time.
  for (let step = 0; step < 8; step += 1) {
    const choice = document.querySelector('#setup-question .choice');
    assert.ok(choice, `question ${step + 1} should render options`);
    choice.click();
    if (document.getElementById('setup-next').disabled === false) {
      document.getElementById('setup-form').dispatchEvent(
        new window.Event('submit', { cancelable: true, bubbles: true }));
    }
  }

  const state = window.DeepSprout.get();
  assert.equal(state.onboarding.setupDone, true, 'setup should be marked done');
  assert.equal(state.profile.goal, 'reduce-scrolling', 'first goal option should be stored');
  assert.ok(state.profile.offlineInterests.length, 'offline interests should be stored');
  assert.equal(document.querySelector('[data-step="handoff"]').hidden, false, 'handoff should show');
});

check('each assessment records a distinct attempt', () => {
  // Questionnaire: answer every item, then finish.
  const survey = load('src/pages/member/lab/assessment.html', { search: '?test=digital-habits' });
  survey.document.getElementById('begin-button').click();
  survey.document.querySelectorAll('.as-scale').forEach(scale => scale.children[2].click());
  assert.equal(survey.document.getElementById('survey-submit').disabled, false,
    'finish should unlock once every item is answered');
  survey.document.getElementById('survey-submit').click();

  const habits = survey.DeepSprout.assessmentAttempt('digital-habits');
  assert.ok(habits.completedAt, 'digital habits attempt should be saved');
  assert.equal(habits.version, 'DH-1.0', 'instrument version should be recorded');
  assert.equal(habits.evidence, 'self-reported', 'questionnaire is a self-report');

  // Reading task: read the passage, then answer the five questions.
  const depth = load('src/pages/member/lab/assessment.html', { search: '?test=depth-challenge' });
  depth.document.getElementById('begin-button').click();
  assert.ok(depth.document.getElementById('passage-body').children.length >= 4,
    'passage should render its paragraphs');
  depth.document.getElementById('passage-done').click();

  for (let question = 0; question < 5; question += 1) {
    depth.document.querySelector('#quiz-options .choice').click();
    depth.document.getElementById('quiz-next').click();
  }
  const reading = depth.DeepSprout.assessmentAttempt('depth-challenge');
  assert.ok(reading.completedAt, 'depth challenge attempt should be saved');
  assert.match(reading.summary[0].value, /of 5$/, 'accuracy should be out of five');
  assert.equal(reading.evidence, 'verified', 'the reading task is measured, not self-reported');

  // The two timed tasks are driven by timers; record them directly so the rest
  // of the journey has a complete baseline to work from.
  ['sustained-attention', 'inhibitory-control'].forEach(id => {
    survey.DeepSprout.saveAssessment(id, {
      version: id === 'sustained-attention' ? 'SA-1.0' : 'IC-1.0',
      evidence: 'verified',
      summary: [{ label: 'Average reaction time', value: '408 ms' }],
      valid: true
    });
  });

  assert.equal(survey.DeepSprout.assessmentsComplete(), true, 'all four should now be recorded');
  assert.equal(survey.DeepSprout.nextAssessment(), null, 'nothing should be left to take');
});

check('the sustained attention task scores hits, misses and early responses', () => {
  const window = load('src/pages/member/lab/assessment.html', {
    search: '?test=sustained-attention', clock: true
  });
  const document = window.document;
  const timers = window.__timers;
  const arena = document.getElementById('arena');

  document.getElementById('begin-button').click();

  // Step through the run: respond whenever a target is actually showing, and
  // deliberately press once while the box is empty to produce an early response.
  let earlyResponses = 0;
  let responded = 0;
  for (let step = 0; step < 4000 && timers.pending; step += 1) {
    const shape = document.getElementById('arena-shape');
    if (!shape.hidden) {
      timers.advance(380);           // a plausible reaction time
      arena.click();
      responded += 1;
    } else if (earlyResponses === 0 && responded === 2) {
      arena.click();                 // one press with nothing on screen
      earlyResponses = 1;
    }
    timers.step();
  }
  timers.drain();

  const attempt = window.DeepSprout.assessmentAttempt('sustained-attention');
  assert.ok(attempt, 'the attempt should be recorded');
  assert.equal(attempt.version, 'SA-1.0');
  assert.equal(attempt.raw.falseAlarms, 1, 'the press on an empty box is an early response');
  assert.ok(attempt.raw.hits.length > 15, `expected most targets detected, got ${attempt.raw.hits.length}`);
  assert.equal(attempt.raw.meanRt, 380, 'reaction time should be measured from the stimulus');

  const labels = attempt.summary.map(entry => entry.label);
  assert.ok(labels.includes('Missed targets'), 'misses are reported separately');
  assert.ok(labels.includes('Early responses'), 'early responses are reported separately');
  assert.equal(attempt.summary.some(entry => /%/.test(entry.value)), false,
    'no single percentage score should be produced');
});

check('the go/no-go task separates commission errors from misses', () => {
  const window = load('src/pages/member/lab/assessment.html', {
    search: '?test=inhibitory-control', clock: true
  });
  const document = window.document;
  const timers = window.__timers;
  const arena = document.getElementById('arena');

  document.getElementById('begin-button').click();

  // Respond to every signal, green or amber — the amber ones must be counted
  // as commission errors rather than as hits.
  for (let step = 0; step < 4000 && timers.pending; step += 1) {
    const shape = document.getElementById('arena-shape');
    if (!shape.hidden) {
      timers.advance(300);
      arena.click();
    }
    timers.step();
  }
  timers.drain();

  const attempt = window.DeepSprout.assessmentAttempt('inhibitory-control');
  assert.ok(attempt, 'the attempt should be recorded');
  assert.equal(attempt.version, 'IC-1.0');
  assert.ok(attempt.raw.noGoTotal > 0, 'the run should include hold signals');
  assert.equal(attempt.raw.commissions, attempt.raw.noGoTotal,
    'responding to every signal means every hold signal is a commission error');
  assert.equal(attempt.raw.omissions, 0, 'no go signal was missed');
  assert.equal(attempt.raw.goTotal + attempt.raw.noGoTotal, 40, 'all 40 trials ran');
});

check('a completed baseline is not retestable immediately', () => {
  const window = load('src/pages/member/lab/lab.html');
  assert.equal(window.DeepSprout.retestEligible('digital-habits'), false,
    'a formal retest should not open on the same day');
  assert.equal(window.document.querySelectorAll('.lab-card').length, 4, 'four instrument cards');
  assert.match(window.document.getElementById('lab-meter-caption').textContent, /4 of 4/);
});

check('the plan preview requires an offline commitment before activating', () => {
  const window = load('src/pages/member/onboarding/starting-point.html');
  const document = window.document;

  assert.equal(document.querySelectorAll('.sp-result-card').length, 4,
    'four separate results, never one combined score');
  assert.equal(document.body.textContent.includes('%'), false,
    'no percentage score should appear on the results screen');

  document.getElementById('to-building').click();
  // The build transition is timed; drive it to completion.
  return new Promise(resolve => {
    const waitForPreview = () => {
      if (document.querySelector('[data-stage="preview"]').hidden) {
        setTimeout(waitForPreview, 80);
        return;
      }
      assert.equal(document.getElementById('activate').disabled, true,
        'activation should be blocked until a commitment is chosen');

      document.querySelector('#commitment-grid .choice').click();
      assert.equal(document.getElementById('activate').disabled, false,
        'choosing a commitment should unlock activation');
      assert.ok(document.querySelectorAll('#roadmap li').length === 4, 'four-week roadmap');
      assert.ok(document.querySelectorAll('#week-list li').length === 7, 'week one is seven days');

      document.getElementById('activate').click();

      const state = window.DeepSprout.get();
      assert.equal(state.onboarding.planActivated, true, 'plan should be active');
      assert.equal(state.plan.cycleLength, 28, 'the default cycle is 28 days');
      assert.equal(state.routine.length, 1, 'the commitment becomes a routine item');
      assert.equal(window.DeepSprout.cycleDay(), 1, 'activation starts on day 1');
      resolve();
    };
    waitForPreview();
  });
});

check('the offline routine ticks off as a self-report', () => {
  const window = load('src/pages/member/training/training.html');
  const document = window.document;

  assert.equal(document.querySelectorAll('.routine-item').length, 1,
    'the activation commitment should appear on the checklist');

  const before = window.DeepSprout.get().routine[0];
  assert.equal(window.DeepSprout.routineDoneToday(before), false);

  document.querySelector('.routine-tick').click();
  const after = window.DeepSprout.get().routine[0];
  assert.equal(window.DeepSprout.routineDoneToday(after), true, 'ticking should log the day');

  // Adding another item should not grant anything on its own.
  const activityCount = window.DeepSprout.get().activityLog.length;
  window.DeepSprout.addRoutine({ title: 'Test item', hint: '' });
  assert.equal(window.DeepSprout.get().activityLog.length, activityCount,
    'creating a routine item must not record an activity');
});

check('the recovery plan reflects the activated plan, not its sample one', () => {
  const window = load('src/pages/member/recovery-plan/recovery-plan.html');
  const document = window.document;
  const plan = window.DeepSprout.get().plan;

  assert.equal(document.getElementById('cycle-day').textContent, 'Day 1 of 28',
    'the day counter should follow the real cycle, not the seeded sample');
  assert.match(document.querySelector('.rp-hero-description').textContent,
    new RegExp(plan.goalLabel.toLowerCase().slice(0, 20)),
    'the hero should name the goal the user actually chose');

  // Joined rather than deep-compared: arrays from the jsdom realm and this one
  // have different prototypes, which deepStrictEqual rejects.
  const weekTitles = [...document.querySelectorAll('[data-week] span:not(.rp-week-icon)')]
    .map(node => node.textContent);
  assert.equal(weekTitles.join(' | '), plan.direction.map(entry => entry.title).join(' | '),
    'the four week cards should carry the activated direction');
  assert.equal(weekTitles.includes('Build Awareness'), false,
    'the hardcoded sample week titles should be gone');

  const routine = window.DeepSprout.get().routine[0];
  assert.equal(document.querySelector('.rp-walk h3').textContent, routine.title,
    'the routine card should show the chosen commitment');
  assert.equal(document.querySelector('.rp-walk h3').textContent === 'Morning Walk', false,
    'the hardcoded Morning Walk should be gone');

  const reviewLink = document.querySelector('[data-review-link]');
  assert.ok(reviewLink, 'the weekly review must be reachable by clicking');
  assert.match(reviewLink.getAttribute('href'), /weekly-review\.html$/);
});

check('home does not claim a practice is due on a rest day', () => {
  const window = load('index.html');
  const DS = window.DeepSprout;
  const plan = DS.get().plan;

  // Day 1 schedules a practice, so Home should point at it.
  assert.match(DS.nextAction('').label, /Continue today's activity/);

  // Move the cycle start back so "today" lands on a day with nothing scheduled.
  const restOffset = plan.weekOne.findIndex(entry => entry.kind === 'rest');
  assert.ok(restOffset > 0, 'week one should contain at least one rest day');
  try {
    DS.update(state => {
      state.plan.startDate = DS.dayKey(DS.addDays(new Date(), -restOffset));
    });
    const action = DS.nextAction('');
    assert.equal(/Continue today's activity/.test(action.label), false,
      'a rest day must not be presented as an outstanding obligation');
    assert.equal(/practice is scheduled|is scheduled$/.test(action.why), false,
      'the reason given must not assert a scheduled practice');
  } finally {
    DS.update(state => { state.plan.startDate = DS.dayKey(); });
  }
});

check('the weekly review shows unknown data as unknown', () => {
  const window = load('src/pages/member/weekly-review/weekly-review.html', { search: '?force=1' });
  const document = window.document;

  assert.equal(document.querySelector('[data-stage="review"]').hidden, false,
    'the review should open when forced');

  const ledger = document.getElementById('ledger').textContent;
  assert.match(ledger, /No browser usage data available/,
    'missing browser data must say so rather than show a zero');

  assert.equal(document.getElementById('save-review').disabled, true,
    'saving should wait for both answers');

  document.querySelector('#q1 .choice').click();
  document.querySelector('#q2 .choice').click();
  assert.ok(document.querySelectorAll('#outcome-options .wr-option').length >= 2,
    'outcomes should appear once both questions are answered');

  document.querySelector('#outcome-options .wr-option').click();
  assert.equal(document.getElementById('save-review').disabled, false);
  document.getElementById('save-review').click();

  const state = window.DeepSprout.get();
  assert.equal(state.reviews.length, 1, 'the review should be recorded');
  assert.equal(state.plan.revisions.length, 1, 'a plan revision should be appended');
});

check('explore registers and cancels without touching the plan', () => {
  const window = load('src/pages/member/explore/explore.html');
  const document = window.document;

  const planBefore = JSON.stringify(window.DeepSprout.get().plan);
  assert.ok(document.querySelectorAll('.ex-card').length >= 8, 'listings should render');

  document.querySelector('.ex-card').click();
  document.querySelector('#detail-actions .btn-primary').click();

  const registrations = window.DeepSprout.get().registrations;
  assert.equal(registrations.length, 1, 'one registration should be stored');
  assert.equal(registrations[0].status, 'confirmed');
  assert.equal(JSON.stringify(window.DeepSprout.get().plan), planBefore,
    'registering for an opportunity must not alter the recovery plan');

  // A full listing offers a waiting list rather than a registration.
  const full = window.DeepSproutOpportunities.find(item => item.status === 'full');
  window.DeepSprout.register(full, 'waitlisted');
  assert.equal(window.DeepSprout.registrationFor(full.id).status, 'waitlisted');
});

check('profile reflects the finished journey and can reset it', () => {
  const window = load('src/pages/member/profile/profile.html');
  const document = window.document;

  assert.equal(document.querySelectorAll('.pr-journey li.is-done').length, 5,
    'every journey step should read as done');
  assert.match(document.getElementById('profile-state').textContent, /day 1 of 28/);

  document.getElementById('confirm-reset').click();
  const state = window.DeepSprout.get();
  assert.equal(state.onboarding.planActivated, false, 'reset should clear the plan');
  assert.equal(state.routine.length, 0, 'reset should clear the routine');
  assert.equal(Object.keys(state.assessments).length, 0, 'reset should clear the assessments');
  assert.equal(state.registrations.length, 0, 'reset should clear the registrations');
  assert.equal(store.size, 0, 'reset should leave no deepsprout keys behind');
});

/* --------------------------------------------------------------- the run */

(async () => {
  let failures = 0;
  for (const [name, fn] of checks) {
    try {
      await fn();
      console.log(`  ok   ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`  FAIL ${name}\n       ${error.message}`);
    }
  }
  console.log(failures
    ? `member-journey: ${failures} of ${checks.length} checks failed`
    : `member-journey: ${checks.length} checks passed`);
  process.exit(failures ? 1 : 0);
})();
