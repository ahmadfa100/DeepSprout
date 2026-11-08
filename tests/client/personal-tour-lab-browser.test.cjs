/**
 * Personal browser checks that outlived the retired four-baseline Round 2A suite, rebuilt on Onboarding 2.0:
 * a registered Individual answers the six questions, activates the Week 1 plan with zero Lab results
 * (a failed save keeps the preview), uses the product tour by keyboard and at 390px, then takes one optional
 * first Lab result and a practice round that is never recorded.
 *   BASE_URL=http://127.0.0.1:8765 CHROME_PATH=... node tests/client/personal-tour-lab-browser.test.cjs
 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:8765';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const context = await browser.newContext({ viewport: { width: 1360, height: 950 }, timezoneId: 'Asia/Amman', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { if (!/ViewTransition opt-in disabled/.test(error.message)) errors.push(error.message); });
  const passed = [];
  const step = async (name, fn) => { await fn(); passed.push(name); console.log('PASS ' + name); };
  const account = fn => page.evaluate(async source => (new Function('a', `return (${source})(a)`))(await window.DeepSproutAccount.load()), fn.toString());
  const journal = () => account(a => a.exportRecord());
  let person, planId;
  try {
    await step('registered Individual answers the six questions and reaches the Week 1 preview without Lab results', async () => {
      await page.goto(`${base}/404.html`);
      person = await page.evaluate(async () => (await import('/src/workspaces/store.js')).dispatch('member.register', { name: 'Tour Lab Person', email: `tour.lab.${Date.now()}@example.test`, consent: true }));
      await page.goto(`${base}/src/pages/member/onboarding/onboarding.html`);
      await page.locator('#meet-begin').click();
      for (const value of ['offline-time', 'tiktok', '120-240', 'bored', 'reading-learning', '10']) {
        await page.locator(`#qs-question input[value="${value}"]`).locator('..').click();
        await page.locator('#qs-next').click();
      }
      await page.locator('.qs-ready:not([hidden])').waitFor();
      await page.goto(`${base}/src/pages/member/onboarding/starting-point.html`);
      await page.locator('.sp-stage[data-stage="preview"]:visible').waitFor();
      const data = await journal();
      assert.equal(data.plan, null);
      assert.equal(data.assessmentAttempts.length, 0);
      assert.equal(await page.evaluate(() => window.DeepSproutPersonal.subject()), person);
    });

    await step('a failed save keeps the preview; activation then creates one Person plan, no Lab links and four starter levels', async () => {
      await page.evaluate(() => { window.__save = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k.startsWith('deepsprout-account-changes-v1:')) throw new DOMException('Full', 'QuotaExceededError'); return window.__save.call(this, k, v); }; });
      await page.locator('#activate').click();
      await page.locator('#personal-save-error').waitFor();
      assert.equal((await journal()).plan, null);
      assert.equal(await page.locator('.sp-stage[data-stage="preview"]').isVisible(), true);
      await page.evaluate(() => { Storage.prototype.setItem = window.__save; });
      await page.locator('#activate').click();
      await page.locator('.sp-stage[data-stage="done"]:visible').waitFor();
      const data = await journal();
      planId = data.plan.id;
      assert.equal(data.plan.personId, person);
      assert.deepEqual(Array.from(data.plan.baselineIds), []);
      assert.equal(data.levelEvents.length, 4);
      assert.ok(data.levelEvents.every(e => e.level === 1));
      await page.locator('#product-tour[open]').waitFor();
      assert.equal(await page.locator('#product-tour h2').evaluate(e => document.activeElement === e), true);
    });

    await step('first-time tour skips with the keyboard, stays dismissed on returning Home, and replays from Help', async () => {
      await page.getByRole('button', { name: 'Skip guide', exact: true }).focus();
      await page.keyboard.press('Enter');
      assert.equal(await account(a => a.tour().status), 'Skipped');
      await page.locator('.sp-done-actions a').first().click();
      await page.waitForURL(`${base}/index.html`);
      await page.waitForFunction(() => window.DeepSproutTour);
      assert.equal(await page.locator('#product-tour').evaluate(e => e.open), false);
      await page.reload();
      await page.waitForFunction(() => window.DeepSproutTour);
      assert.equal(await page.locator('#product-tour').evaluate(e => e.open), false);
      await page.locator('.member-account > summary').click();
      await page.locator('[data-tour-replay]').click();
      await page.locator('#product-tour[open]').waitFor();
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Finish guide', exact: true }).click();
      assert.equal(await account(a => a.tour().status), 'Completed');
      await page.goto(`${base}/src/pages/member/recovery-plan/recovery-plan.html`);
      await page.waitForFunction(() => window.DeepSproutAccount);
      assert.equal((await journal()).plan.id, planId);
    });

    await step('at 390px the guide fits, and Escape saves a Person-bound dismissal', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.member-account > summary').click();
      await page.locator('[data-tour-replay]').click();
      await page.locator('#product-tour[open]').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.equal(await page.locator('#product-tour').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
      await page.keyboard.press('Escape');
      assert.equal(await account(a => a.tour().status), 'Skipped');
      await page.setViewportSize({ width: 1360, height: 950 });
    });

    await step('an optional first Lab result is recorded once; at 390px history fits and a practice round is never recorded', async () => {
      await page.goto(`${base}/src/pages/member/lab/assessment.html?test=digital-habits`);
      await page.locator('#begin-button:enabled').waitFor();
      await page.locator('#begin-button').click();
      const groups = page.locator('.as-scale');
      for (let i = 0; i < await groups.count(); i++) await groups.nth(i).getByRole('radio').nth(2).click();
      await page.locator('#survey-submit').click();
      await page.locator('[data-stage=result]:visible').waitFor();
      assert.equal((await journal()).assessmentAttempts.filter(a => a.valid).length, 1);
      assert.equal((await journal()).plan.id, planId, 'a Lab result never changes the active plan');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/src/pages/member/lab/lab.html`);
      await page.locator('[data-history=digital-habits]').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.equal(await page.locator('#detail-dialog').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
      await page.keyboard.press('Escape');
      await page.locator('[data-assessment=digital-habits] a[href*=mode]').click();
      await page.locator('#begin-button:enabled').waitFor();
      assert.match(await page.locator('#mode-banner').innerText(), /Practice round/);
      const count = (await journal()).assessmentAttempts.length;
      await page.locator('#begin-button').click();
      const practice = page.locator('.as-scale');
      for (let i = 0; i < await practice.count(); i++) await practice.nth(i).getByRole('radio').nth(2).click();
      await page.locator('#survey-submit').click();
      await page.locator('[data-stage=result]:visible').waitFor();
      assert.equal((await journal()).assessmentAttempts.length, count);
      assert.match(await page.locator('#result-title').innerText(), /not recorded/);
    });

    assert.deepEqual(errors, []);
    console.log(`Personal tour and Lab browser: PASS (${passed.length} checks)`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
