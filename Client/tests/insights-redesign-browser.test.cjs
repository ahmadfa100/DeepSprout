const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const url = process.env.INSIGHTS_URL || 'http://127.0.0.1:5501/Client/src/pages/member/insights/insights.html';
const shots = process.env.SHOTS_DIR || '/private/tmp/deepsprout-insights-redesign';

(async () => {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url);
    await page.locator('#insights[aria-busy="false"]').waitFor();
    assert.equal(await page.locator('.ins-section-nav a').count(), 5);
    assert.match(await page.locator('#ins-snapshot').innerText(), /17 Jan 2026/);
    assert.match(await page.locator('#glance-grid').innerText(), /4 of 5/);
    assert.match(await page.locator('#glance-grid').innerText(), /No data/);
    assert.equal(await page.locator('#checkins-body tbody tr').count(), 4);
    assert.equal(await page.locator('#checkins-body tbody tr').first().locator('.ins-assessment-score').innerText(), '19');
    await page.screenshot({ path: `${shots}/desktop.png`, fullPage: true, animations: 'disabled' });

    await page.locator('[data-period="7"]').click();
    assert.equal(await page.locator('[data-period="7"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#usage-body').innerText(), /No browser usage data available/);
    await page.locator('[data-period="28"]').click();
    assert.equal(await page.locator('[data-period="28"]').getAttribute('aria-pressed'), 'true');
    await page.locator('.ins-section-nav a[href="#adherence"]').click();
    assert.equal(new URL(page.url()).hash, '#adherence');
    await page.locator('.ins-section-nav a[href="#adherence"][aria-current="location"]').waitFor();
    await page.locator('#adherence .ins-detail-disclosure summary').click();
    assert.equal(await page.locator('#adherence .ins-detail-disclosure').getAttribute('open'), '');
    assert.equal(await page.locator('.ins-days .ins-day').count(), 7);
    console.log('PASS source-backed summary, assessment rows, period selector, navigation, and schedule disclosure');

    for (const width of [1024, 768]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `No overflow at ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await page.locator('#insights[aria-busy="false"]').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.equal(await page.locator('.ins-assessment-table tbody tr').first().evaluate(row => getComputedStyle(row).display), 'grid');
    await page.locator('.ins-assessment-details summary').click();
    assert.equal(await page.locator('.ins-assessment-details .ins-range').count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.locator('#checkins').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}/mobile-assessments.png`, animations: 'disabled' });
    await page.screenshot({ path: `${shots}/mobile-full.png`, fullPage: true, animations: 'disabled' });
    assert.deepEqual(errors, []);
    console.log('PASS mobile layout without horizontal overflow or page errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
