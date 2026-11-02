const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:5501/Client';
const recoveryUrl = `${base}/src/pages/member/recovery-plan/recovery-plan.html#adjust`;
const activitiesUrl = `${base}/src/pages/member/training/training.html#offline-routine`;
const shotsDir = process.env.SHOTS_DIR || '/private/tmp/deepsprout-offline-routine-adjust';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Amman', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    fs.mkdirSync(shotsDir, { recursive: true });
    await page.goto(recoveryUrl);
    await page.locator('#adjust-home').waitFor();
    await page.waitForFunction(() => window.DeepSproutAccount?.current()?.routine().primary?.title === '10-minute walk');
    const before = await page.evaluate(() => window.DeepSproutAccount.current().exportRecord());
    const cycleBefore = await page.evaluate(() => window.DeepSproutAccount.current().plan().cycleId);
    await page.locator('#adjust-routine-path').click();
    assert.equal(await page.locator('#routine-current-title').innerText(), '10-minute walk');
    assert.equal(await page.locator('#routine-save').isDisabled(), true);

    await page.locator('#routine-adjust-title').fill('');
    assert.equal(await page.locator('#routine-save').isDisabled(), true);
    assert.equal(await page.locator('#routine-adjust-error').isVisible(), true);
    assert.equal(await page.locator('#routine-toast').isVisible(), false);
    await page.locator('#routine-adjust-title').fill('15-minute reading');
    await page.locator('#routine-adjust-minutes').fill('0');
    assert.equal(await page.locator('#routine-save').isDisabled(), true);
    await page.locator('#routine-adjust-minutes').fill('15');
    assert.equal(await page.locator('#routine-save').isEnabled(), true);

    await page.evaluate(() => {
      window.__routineOriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('deepsprout-account-changes-v1:')) throw new DOMException('Storage is full', 'QuotaExceededError');
        return window.__routineOriginalSetItem.call(this, key, value);
      };
    });
    await page.locator('#routine-save').click();
    await page.locator('#routine-toast.is-error').waitFor();
    assert.equal(await page.locator('#routine-toast-title').innerText(), 'Changes could not be saved');
    assert.equal(await page.locator('#routine-current-title').innerText(), '10-minute walk');
    await page.evaluate(() => { Storage.prototype.setItem = window.__routineOriginalSetItem; delete window.__routineOriginalSetItem; });

    await page.locator('#routine-save').click();
    await page.getByText('Changes saved successfully', { exact: true }).first().waitFor();
    assert.equal(await page.locator('#routine-toast-title').innerText(), 'Changes saved successfully');
    assert.equal(await page.locator('#routine-toast-text').innerText(), 'Your plan has been updated.');
    assert.equal(await page.locator('#routine-save').isDisabled(), true);

    await page.reload();
    await page.locator('#adjust-routine-path').click();
    assert.equal(await page.locator('#routine-current-title').innerText(), '15-minute reading');
    assert.equal(await page.locator('#routine-adjust-minutes').inputValue(), '15');
    await page.locator('#panel-adjust').screenshot({ path: path.join(shotsDir, 'desktop.png') });
    await page.locator('#routine-adjust-title').fill('Unsaved custom activity');
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#tab-history').click();
    assert.equal(await page.locator('#tab-adjust').getAttribute('aria-selected'), 'true');
    await page.locator('#routine-cancel').click();
    assert.equal(await page.locator('#adjust-home').isVisible(), true);
    await page.locator('#adjust-routine-path').click();
    assert.equal(await page.locator('#routine-adjust-title').inputValue(), '15-minute reading');
    const after = await page.evaluate(() => window.DeepSproutAccount.current().exportRecord());
    assert.equal(await page.evaluate(() => window.DeepSproutAccount.current().plan().cycleId), cycleBefore);
    assert.deepEqual(after.activityAttempts, before.activityAttempts);
    assert.deepEqual(after.routine[0].checkIns, before.routine[0].checkIns);
    assert.deepEqual(after.assessmentAttempts, before.assessmentAttempts);
    assert.deepEqual(after.rewards, before.rewards);
    const futureRoutineRefs = before.scheduledActions.filter(action => action.kind === 'routine' && action.date >= '2026-01-17' && !['Rescheduled', 'Cancelled'].includes(action.status));
    assert.ok(futureRoutineRefs.every(original => after.scheduledActions.some(action => action.id === original.id && action.title === '15-minute reading' && action.routineDurationMinutes === 15)));
    assert.ok(after.scheduledActions.filter(action => action.kind === 'routine' && action.date < '2026-01-17').every(action => action.title === '10-minute walk'));

    await page.goto(activitiesUrl);
    await page.waitForFunction(() => document.querySelector('#routine-list')?.textContent?.includes('15-minute reading'));
    assert.match(await page.locator('#routine-list').innerText(), /15-minute reading/);

    await page.goto(recoveryUrl);
    await page.locator('#adjust-routine-path').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);
    await page.locator('#panel-adjust').screenshot({ path: path.join(shotsDir, 'mobile.png') });
    const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1 && element.getBoundingClientRect().width).slice(0, 8).map(element => ({ tag: element.tagName, className: String(element.className).slice(0, 100), right: Math.round(element.getBoundingClientRect().right) })) }));
    assert.equal(overflow.scrollWidth <= overflow.width + 1, true, JSON.stringify(overflow));
    assert.deepEqual(errors, []);
    console.log('PASS invalid input disables Save and shows no success');
    console.log('PASS failed journal write shows error and keeps prior routine');
    console.log('PASS saved 15-minute reading survives refresh and appears in Activities');
    console.log('PASS Cancel discards draft and unsaved tab navigation asks before leaving');
    console.log('PASS cycle, attempts, check-ins, rewards, and past routine actions stay intact');
    console.log('PASS 390px layout has no horizontal overflow and no page errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
