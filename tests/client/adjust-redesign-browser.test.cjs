const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:5501/Client';
const url = `${base}/src/pages/member/recovery-plan/recovery-plan.html#adjust`;
const shotsDir = process.env.SHOTS_DIR || '/private/tmp/deepsprout-adjust-redesign';

(async () => {
  fs.mkdirSync(shotsDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Amman', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const current = () => page.evaluate(() => {
    const account = window.DeepSproutAccount.current();
    const recovery = account.recovery();
    return { record: account.exportRecord(), recovery, training: account.training(), today: account.todayKey };
  });
  const save = async () => {
    assert.equal(await page.locator('#save-plan').isEnabled(), true);
    await page.locator('#save-plan').click();
    await page.locator('#save-plan').getByText('Changes saved successfully').waitFor();
    assert.equal(await page.locator('#routine-toast-title').innerText(), 'Changes saved successfully');
  };
  try {
    await page.goto(url);
    await page.waitForFunction(() => Boolean(window.DeepSproutAccount?.current()?.recovery()));
    assert.equal(await page.locator('#adjust-home').isVisible(), true);
    assert.equal(await page.locator('#adjust-home h2').innerText(), 'Make your plan work for you.');
    assert.equal(await page.locator('[data-adjust-path]').count(), 4);
    assert.equal(await page.locator('#adjust-form').isVisible(), false);
    await page.locator('#adjust-home').screenshot({ path: path.join(shotsDir, 'desktop-home.png') });
    const before = await current();
    const cycleId = before.recovery.current.id;
    const past = before.record.scheduledActions.filter(action => action.date <= before.today);

    await page.locator('#adjust-schedule-path').click();
    assert.equal(await page.locator('#adjust-form').isVisible(), true);
    assert.equal(await page.locator('#adjust-home').isVisible(), false);
    assert.equal(await page.locator('#save-plan').isDisabled(), true);
    const oldMinutes = Number(await page.locator('#adjust-minutes').inputValue());
    const nextMinutes = oldMinutes === 15 ? 10 : 15;
    await page.locator('#adjust-minutes').selectOption(String(nextMinutes));
    assert.match(await page.locator('#adjust-preview-title').innerText(), new RegExp(`${nextMinutes} minutes`));
    await page.locator('#adjust-form').screenshot({ path: path.join(shotsDir, 'desktop-schedule.png') });

    await page.evaluate(() => {
      window.__adjustOriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('deepsprout-account-changes-v1:')) throw new DOMException('Storage is full', 'QuotaExceededError');
        return window.__adjustOriginalSetItem.call(this, key, value);
      };
    });
    await page.locator('#save-plan').click();
    await page.locator('#routine-toast.is-error').waitFor();
    assert.equal(await page.locator('#routine-toast-title').innerText(), 'Changes could not be saved');
    assert.equal((await current()).recovery.revisions.length, before.recovery.revisions.length);
    await page.evaluate(() => { Storage.prototype.setItem = window.__adjustOriginalSetItem; delete window.__adjustOriginalSetItem; });
    await save();
    await page.reload();
    await page.waitForFunction(minutes => document.querySelector('#adjust-summary-minutes')?.textContent === `${minutes} minutes`, nextMinutes);
    const afterSchedule = await current();
    assert.equal(afterSchedule.recovery.current.preferenceVersions.at(-1).value.minutes, nextMinutes);
    assert.equal(afterSchedule.recovery.revisions.at(-1).nextPreferences.minutes, nextMinutes);
    console.log('PASS schedule save, failed-save state, refresh persistence');

    await page.locator('#adjust-difficulty-path').click();
    const eligible = (await current()).training.find(type => type.level > 1);
    assert.ok(eligible, 'Seed data should include an eligible level');
    await page.locator(`[name="lowerType"][value="${eligible.id}"]`).locator('..').click();
    assert.match(await page.locator('#adjust-preview-title').innerText(), /Level \d+ → Level \d+/);
    await save();
    const afterDifficulty = await current();
    assert.equal(afterDifficulty.training.find(type => type.id === eligible.id).level, eligible.level - 1);
    assert.equal(afterDifficulty.recovery.current.preferenceVersions.at(-1).value.minutes, nextMinutes);
    console.log('PASS difficulty lowers one level and preserves pending schedule change');

    await page.locator('#adjust-back').click();
    await page.locator('#adjust-mix-path').click();
    const checks = page.locator('[name="mix"]');
    const values = await checks.evaluateAll(nodes => nodes.map(node => ({ value: node.value, checked: node.checked })));
    const toToggle = values.find(item => !item.checked) || values.find(item => item.checked);
    assert.ok(toToggle);
    await page.locator(`[name="mix"][value="${toToggle.value}"]`).locator('..').click();
    await save();
    const afterMix = await current();
    assert.equal(afterMix.recovery.current.preferenceVersions.at(-1).value.mix.includes(toToggle.value), !toToggle.checked);
    assert.equal(afterMix.recovery.current.preferenceVersions.at(-1).value.minutes, nextMinutes);
    console.log('PASS practice mix persists alongside schedule and level changes');

    await page.locator('#adjust-back').click();
    await page.locator('#adjust-goal-path').click();
    const goals = await page.locator('[name="goal"]').evaluateAll(nodes => nodes.map(node => ({ value: node.value, checked: node.checked })));
    const targetGoal = goals.find(goal => !goal.checked);
    await page.locator(`[name="goal"][value="${targetGoal.value}"]`).locator('..').click();
    await save();
    await page.reload();
    await page.waitForFunction(goal => window.DeepSproutAccount?.current()?.recovery()?.current?.preferenceVersions?.at(-1)?.value?.goal === goal, targetGoal.value);
    const after = await current();
    assert.equal(after.recovery.current.id, cycleId);
    assert.equal(after.recovery.current.preferenceVersions.at(-1).value.minutes, nextMinutes);
    assert.equal(after.recovery.current.preferenceVersions.at(-1).value.goal, targetGoal.value);
    assert.deepEqual(after.recovery.current.preferenceVersions.at(-1).value.mix, targetGoal.value === 'offline-time' ? ['practical', 'protected-work'] : targetGoal.value === 'focus-objective' ? ['depth', 'protected-work', 'listening'] : ['practical', 'protected-work', 'listening']);
    assert.deepEqual(after.record.scheduledActions.filter(action => action.date <= before.today), past);
    assert.deepEqual(after.record.activityAttempts, before.record.activityAttempts);
    assert.deepEqual(after.record.assessmentAttempts, before.record.assessmentAttempts);
    assert.deepEqual(after.record.rewards, before.record.rewards);
    assert.deepEqual(after.record.routine.map(item => item.checkIns), before.record.routine.map(item => item.checkIns));
    assert.equal(after.recovery.revisions.length, before.recovery.revisions.length + 4);
    console.log('PASS goal save, same cycle, future-only revisions, historical evidence intact');

    await page.locator('#adjust-schedule-path').click();
    await page.locator('#adjust-minutes').selectOption(String(oldMinutes));
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#tab-history').click();
    assert.equal(await page.locator('#tab-adjust').getAttribute('aria-selected'), 'true');
    await page.locator('#adjust-cancel').click();
    assert.equal(await page.locator('#adjust-home').isVisible(), true);
    assert.equal((await current()).recovery.current.preferenceVersions.at(-1).value.minutes, nextMinutes);
    console.log('PASS Cancel discards edits and tab navigation warns on unsaved changes');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#adjust-home').screenshot({ path: path.join(shotsDir, 'mobile-home.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.locator('#adjust-routine-path').click();
    await page.locator('#routine-adjust-form').screenshot({ path: path.join(shotsDir, 'mobile-routine.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log('PASS 390px home and routine editor have no horizontal overflow or page errors');

    const emptyContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, timezoneId: 'Asia/Amman', reducedMotion: 'reduce' });
    const emptyPage = await emptyContext.newPage();
    emptyPage.on('pageerror', error => errors.push(error.message));
    await emptyPage.goto(`${base}/workspaces.html`);
    await emptyPage.evaluate(async () => (await import(new URL('./src/workspaces/store.js', location.href))).dispatch('demo.signin', { personId: 'p-maya' }));
    await emptyPage.goto(url);
    await emptyPage.waitForFunction(() => document.querySelector('#adjust-summary-goal')?.textContent !== 'Loading…');
    assert.equal(await emptyPage.locator('#adjust-summary-goal').innerText(), 'No active plan yet');
    await emptyPage.locator('#adjust-home').screenshot({ path: path.join(shotsDir, 'desktop-empty-plan.png') });
    for (const pathName of ['schedule', 'difficulty', 'mix']) {
      await emptyPage.locator(`[data-adjust-path="${pathName}"]`).click();
      assert.equal(await emptyPage.locator('#adjust-unavailable-title').innerText(), 'Start your plan first');
      assert.match(await emptyPage.locator('#adjust-unavailable-description').innerText(), /no active Recovery Plan/i);
      if (pathName === 'schedule') await emptyPage.locator('#adjust-unavailable').screenshot({ path: path.join(shotsDir, 'desktop-empty-plan-action.png') });
      await emptyPage.locator('#adjust-unavailable-back').click();
    }
    await emptyPage.locator('#adjust-goal-path').click();
    assert.equal(await emptyPage.locator('#adjust-unavailable-link').getAttribute('href'), '../onboarding/onboarding.html');
    await emptyPage.locator('#adjust-unavailable-link').click();
    assert.match(emptyPage.url(), /\/onboarding\/onboarding\.html/);
    assert.deepEqual(errors, []);
    console.log('PASS empty-plan cards explain the prerequisite and lead to the working start flow');
    await emptyContext.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
