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

function load(page, { search = '', clock = false, patchAccount = null } = {}) {
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
  window.HTMLDialogElement.prototype.close = function (value) {
    this.open = false;
    if (value !== undefined) this.returnValue = value;
    this.dispatchEvent(new window.Event('close'));
  };
  // The account data is fetched; serve it from disk, optionally patched.
  window.fetch = async url => {
    const target = new URL(url, window.location.href);
    const file = path.join(root, decodeURIComponent(target.pathname));
    if (!fs.existsSync(file)) return { ok: false, status: 404, json: async () => ({}) };
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (patchAccount && /account\.json$/.test(file)) patchAccount(data);
    return { ok: true, status: 200, json: async () => data };
  };
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

/** Wait for a page's account data to load and its first render to finish. */
const settled = async window => {
  await window.DeepSproutAccount.load();
  await new Promise(resolve => setTimeout(resolve, 0));
};
const clearAccountChanges = () => [...store.keys()]
  .filter(key => key.startsWith('deepsprout-account-changes'))
  .forEach(key => store.delete(key));

check('the offline routine edits and deletes without rewriting history', async () => {
  clearAccountChanges();
  const window = load('src/pages/member/training/training.html', { search: '?account=demo' });
  await settled(window);
  const document = window.document;
  const account = await window.DeepSproutAccount.load();

  assert.equal(document.querySelectorAll('.routine-item').length, 1, 'the seeded routine item should be listed');
  const monthDays = account.routine().monthDays;
  const routineEvents = account.history().filter(event => event.kind === 'routine').length;

  // Edit: rename, add a day, change recurrence.
  document.querySelector('[data-edit]').click();
  const form = document.querySelector('.routine-editor');
  form.elements.namedItem('title').value = 'Walk outside';
  form.querySelector('[data-day="6"]').click();
  form.elements.namedItem('recurrence').value = 'biweekly';
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  assert.equal(document.querySelector('.routine-body strong').textContent, 'Walk outside');
  assert.equal(account.routine().items[0].recurrence, 'biweekly');
  const week1 = account.weekDates(1);
  assert.equal(account.routineScheduledDays(week1[0], week1[6]).length, 5, 'an edit must not change past weeks');

  // Delete is never one click: the first click only opens the dialog.
  document.querySelector('.routine-icon-button.is-danger').click();
  const dialog = document.getElementById('routine-delete-dialog');
  assert.equal(dialog.open, true, 'delete must ask first');
  assert.equal(document.querySelectorAll('.routine-item').length, 1, 'nothing is deleted before confirming');
  assert.match(document.getElementById('routine-delete-body').textContent, /stay in your history/);
  document.getElementById('routine-delete-cancel').click();
  assert.equal(document.querySelectorAll('.routine-item').length, 1, 'cancel keeps the item');

  document.querySelector('.routine-icon-button.is-danger').click();
  document.getElementById('routine-delete-confirm').click();
  assert.equal(document.querySelectorAll('.routine-item').length, 0, 'confirming removes it from the list');
  assert.equal(account.routine().monthDays, monthDays, 'past routine days must still count');
  assert.equal(account.history().filter(event => event.kind === 'routine').length, routineEvents, 'past check-ins stay in history');
  assert.equal(account.history().some(event => event.kind === 'removed'), true, 'the removal itself is recorded');
  clearAccountChanges();
});

check('the roadmap shows the current week from the account, not cumulative counts', async () => {
  clearAccountChanges();
  const window = load('src/pages/member/recovery-plan/recovery-plan.html', { search: '?account=demo' });
  await settled(window);
  const document = window.document;
  const seed = JSON.parse(read('src/data/demo-account.json'));

  assert.equal(document.getElementById('cycle-day').textContent, 'Day 13 of 28');
  assert.equal(document.getElementById('stat-practices').textContent, '4 of 5');
  assert.equal(document.getElementById('stat-practices-source').textContent, 'Measured', 'in-app practices are measured, never self-reported');
  assert.equal(document.getElementById('stat-routine').textContent, '3 of 5');
  assert.equal(document.getElementById('stat-routine-source').textContent, 'Self-reported');
  assert.match(document.getElementById('stat-review').textContent, /Sunday/);
  assert.equal(document.getElementById('stat-baseline'), null, 'baseline checks belong on the check-in page, not the plan');
  assert.equal(document.querySelectorAll('.rp-stat').length, 3, 'exactly three current-week cards');
  const weekTitles = [...document.querySelectorAll('[data-week] span:not(.rp-week-icon)')].map(node => node.textContent);
  assert.equal(weekTitles.join(' | '), seed.plan.direction.map(entry => entry.title).join(' | '));
  assert.match(document.querySelector('[data-week="1"]').className, /is-done/);
  assert.match(document.querySelector('[data-week="2"]').className, /is-current/);
  assert.match(document.querySelector('.ds-hero-art img').getAttribute('src'), /Bimo_Roadmap-Page\.png$/);
});

check('home shows the real week when active and the three steps only when empty', async () => {
  clearAccountChanges();
  let window = load('index.html', { search: '?account=demo' });
  await settled(window);
  assert.equal(window.document.getElementById('week-active').hidden, false);
  assert.equal(window.document.getElementById('week-empty').hidden, true, 'onboarding steps must not show for an active account');
  assert.match(window.document.getElementById('week-facts').textContent, /4 of 5/);

  // On a planned rest day, Home must not claim a practice is due.
  window = load('index.html', { search: '?account=demo', patchAccount: data => { data.account.asOf = '2026-01-14'; } });
  await settled(window);
  const next = window.document.getElementById('week-next').textContent;
  assert.match(next, /Planned rest day/);
  assert.equal(/not done yet/.test(next), false, 'a rest day is not an outstanding obligation');

  window = load('index.html', { search: '?account=empty' });
  await settled(window);
  assert.equal(window.document.getElementById('week-active').hidden, true);
  assert.equal(window.document.getElementById('week-empty').hidden, false);
  assert.equal(window.document.querySelectorAll('#start-steps li').length, 3);
  assert.match(window.document.querySelector('#start-steps li').className, /is-current/);
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
