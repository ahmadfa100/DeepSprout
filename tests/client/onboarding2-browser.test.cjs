const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:8899';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Asia/Amman' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { if (!/ViewTransition opt-in disabled/.test(error.message)) errors.push(error.message); });
  try {
    await page.goto(`${base}/src/pages/member/onboarding/onboarding.html?account=empty`);
    await page.locator('#meet-begin').click();
    const choices = ['reduce-scrolling', 'instagram', '60-120', 'before-bed', 'walking-sports', '10'];
    for (let i = 0; i < choices.length; i++) {
      await page.locator(`#qs-question input[value="${choices[i]}"]`).locator('..').click();
      if (i === 2) {
        await page.reload();
        await page.locator('#q-step').getByText('Question 3 of 6').waitFor({state:'attached'});
        assert.equal(await page.locator('#qs-question input[value="60-120"]').isChecked(), true);
      }
      await page.locator('#qs-next').click();
    }
    await page.locator('.qs-ready:not([hidden])').waitFor();
    const initial = await page.evaluate(async () => {
      const account = await window.DeepSproutAccount.load();
      return { setup: account.profile().setup, preview: account.preview(), plan: account.plan(), level: window.DeepSprout.get().onboarding.journeyLevel, lab: account.checkInWindow().state, attempts: account.exportRecord().assessmentAttempts.length };
    });
    assert.equal(initial.setup.version, 2);
    assert.equal(Object.keys(initial.setup.answers).length, 6);
    assert.equal(initial.level, 1);
    assert.equal(initial.plan, null);
    assert.equal(initial.lab, 'optional');
    assert.equal(initial.attempts, 0);
    assert.match(initial.preview.source, /Quick Setup v2/);

    await page.locator('#ready-story').click();
    await page.waitForURL('**/hero-reels-lab.html?flow=onboarding');
    await page.locator('.dawn-skip').click();
    await page.waitForURL('**/index.html');
    await page.locator('.level0-status').waitFor();
    assert.match(await page.locator('.level0-status').innerText(), /Level 1/);
    assert.match(await page.locator('#week-empty').innerText(), /self-reported/);

    await page.goto(`${base}/src/pages/member/lab/lab.html`);
    assert.match(await page.locator('#ci-window').innerText(), /optional/i);
    assert.match(await page.locator('#ci-window').innerText(), /No weekly reassessment/);
    assert.match(await page.locator('#ci-schedule-title').innerText(), /Optional assessments/);

    await page.goto(`${base}/src/pages/member/insights/insights.html`);
    assert.match(await page.locator('#checkins-body').innerText(), /optional Lab assessment/);

    await page.goto(`${base}/src/pages/member/recovery-plan/recovery-plan.html`);
    assert.match(await page.locator('#empty-plan').innerText(), /six quick setup questions/i);

    await page.goto(`${base}/src/pages/member/onboarding/starting-point.html`);
    await page.locator('.sp-stage[data-stage="preview"]:visible').waitFor();
    const before = await page.evaluate(async () => (await window.DeepSproutAccount.load()).plan());
    assert.equal(before, null);
    assert.match(await page.locator('#preview-reason').innerText(), /Journey Level 1/);
    await page.locator('#activate').click();
    await page.locator('.sp-stage[data-stage="done"]:visible').waitFor();
    const active = await page.evaluate(async () => {
      const account = await window.DeepSproutAccount.load();
      return { plan: account.plan(), baselineIds: account.exportRecord().plan.baselineIds, attempts: account.exportRecord().assessmentAttempts.length };
    });
    assert.ok(active.plan);
    assert.deepEqual(active.baselineIds, []);
    assert.equal(active.attempts, 0);
    await page.reload();
    assert.ok(await page.evaluate(async () => (await window.DeepSproutAccount.load()).plan()));
    await page.goto(`${base}/src/pages/member/profile/profile.html`);
    assert.match(await page.locator('#journey-list').innerText(), /Journey Level 1/);
    await page.goto(`${base}/src/pages/member/onboarding/onboarding.html`);
    assert.match(await page.locator('#ready-title').innerText(), /Welcome back/);
    await page.evaluate(() => {
      const key = 'deepsprout-user-v1:person:preview';
      const state = JSON.parse(localStorage.getItem(key));
      state.onboarding.journeyLevel = 0;
      localStorage.setItem(key, JSON.stringify(state));
    });
    await page.reload();
    assert.equal(await page.evaluate(() => window.DeepSprout.get().onboarding.journeyLevel), 1);
    assert.ok(await page.evaluate(async () => (await window.DeepSproutAccount.load()).plan()));

    const legacyContext = await browser.newContext({ reducedMotion: 'reduce' });
    const legacyPage = await legacyContext.newPage();
    await legacyPage.goto(`${base}/index.html?account=empty`);
    await legacyPage.evaluate(() => {
      const answers = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`old-question-${index + 1}`, `answer-${index + 1}`]));
      localStorage.setItem('deepsprout-ecosystem-demo-v1', JSON.stringify({ people: [{ id: 'p-legacy', name: 'Legacy User', email: 'legacy@example.test', verified: true, individual: true, status: 'Active' }], session: { personId: 'p-legacy' } }));
      localStorage.setItem('deepsprout-account-changes-v1:person:p-legacy', JSON.stringify([{ type: 'setup.save', on: '2026-10-01', goal: { id: 'reduce-scrolling', label: 'Spend less time on Reels and Shorts' }, setup: { version: 1, answers, availableDays: '3', offlineInterests: ['walking'] } }]));
    });
    await legacyPage.goto(`${base}/src/pages/member/onboarding/onboarding.html`);
    assert.match(await legacyPage.locator('#ready-title').innerText(), /Welcome back/);
    assert.equal(await legacyPage.evaluate(async () => Object.keys((await window.DeepSproutAccount.load()).profile().setup.answers).length), 8);
    await legacyContext.close();
    assert.deepEqual(errors, []);
    console.log('Onboarding 2.0 browser: PASS (six answers, resume, story skip, Level 1, optional Lab, explicit activation, persistence)');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
