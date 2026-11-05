const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:5501/Client';
const output = process.env.SHOTS_DIR || '/private/tmp/deepsprout-pricing-mentor';

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Amman', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${base}/src/pages/public/pricing/pricing.html`);
    await page.locator('.hero-art img').waitFor();
    const hero = await page.locator('.hero-art img').evaluate(img => ({ src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight }));
    assert.match(hero.src, /hero-v2\.png$/);
    assert.deepEqual([hero.width, hero.height], [2172, 724]);
    await page.screenshot({ path: path.join(output, 'pricing-desktop.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'pricing-mobile.png'), animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    console.log('PASS supplied pricing image loads at desktop and 390px mobile');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/workspaces.html`);
    await page.evaluate(async () => (await import(new URL('./src/workspaces/store.js', location.href))).dispatch('demo.signin', { personId: 'p-karim' }));
    await page.goto(`${base}/workspaces.html#/mentor/reports`);
    await page.locator('.coach-report-page').waitFor();
    assert.equal(await page.locator('.coach-report-metric').count(), 6);
    assert.match(await page.locator('.coach-report-source-note').innerText(), /No personal Lab, Shield or Recovery data/);
    await page.screenshot({ path: path.join(output, 'mentor-report-desktop.png'), fullPage: true, animations: 'disabled' });

    await page.locator('[data-form="coach-report-scope"] [name="to"]').fill('2026-10-31');
    await page.locator('.coach-report-update').click();
    await page.waitForURL(/to=2026-10-31/);
    await page.locator('[data-form="coach-report"][data-to="2026-10-31"]').waitFor();
    assert.equal(await page.locator('[data-form="coach-report"] [name="observations"]').count(), 1);
    await page.getByRole('button', { name: 'Submit to Supervisors' }).click();
    assert.equal(await page.locator('[data-form="coach-report"] [name="observations"]').evaluate(field => field.validity.valueMissing), true);
    assert.equal(await page.locator('.coach-report-history tbody tr').count(), 0);
    await page.locator('[data-form="coach-report"] [name="observations"]').fill('The group practiced consistently during the selected period.');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.getByText('Draft saved.', { exact: true }).waitFor();
    await page.locator('.coach-report-history .badge').filter({ hasText: 'Draft' }).waitFor();
    await page.reload();
    assert.equal(await page.locator('[data-form="coach-report"] [name="observations"]').inputValue(), 'The group practiced consistently during the selected period.');
    console.log('PASS period update and draft save retain existing report behavior');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'mentor-report-mobile.png'), fullPage: true, animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log('PASS mentor report has no 390px overflow or page errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
