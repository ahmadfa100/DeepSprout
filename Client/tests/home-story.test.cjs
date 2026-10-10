/* Run against a locally served Client folder. Playwright is test-only, not a site dependency.
   NODE_PATH=/path/to/node_modules CHROME_PATH=/path/to/chrome node tests/home-story.test.cjs */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = `${process.env.BASE_URL || 'http://127.0.0.1:8765'}/src/pages/public/home/home.html?storyDebug`;
(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROME_PATH || undefined });
  const errors = [];
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.locator('.story-stage').getAttribute('data-scene');
  const at = async progress => {
    await page.evaluate(p => {
      const story = ScrollTrigger.getAll().find(t => t.trigger.classList.contains('attention-story'));
      scrollTo(0, story.start + (story.end - story.start) * p);
    }, progress);
  };
  try {
    await page.goto(url);
    await page.waitForFunction(() => document.documentElement.classList.contains('story-enabled'));
    assert.equal(await state(), 'SERENE');
    // Several quick native wheel events must affect velocity, not only position.
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(50);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(120);
    const fast = JSON.parse(await page.locator('.story-stage').getAttribute('data-debug')).speed;
    assert.ok(fast > .03, 'fast scrolling raises filtered speed');
    await at(.61);
    await page.waitForFunction(() => document.querySelector('.story-stage').dataset.scene === 'LOOP');
    await page.waitForFunction(() => document.querySelector('.story-stage').dataset.scene === 'SEED', { timeout:10000 });
    assert.ok(Number(await page.locator('.attention-seed').evaluate(el => getComputedStyle(el).opacity)) > .3);
    assert.equal(await page.locator('.hero-content').evaluate(el => el.inert), true);
    // A reverse scroll resets the story and restores keyboard access to the CTA.
    await at(0); await page.waitForTimeout(150);
    assert.equal(await state(), 'SERENE');
    assert.equal(await page.locator('.hero-content').evaluate(el => el.inert), false);
    // Continuing without stopping always resolves to the root.
    await at(.99); await page.waitForTimeout(150);
    assert.equal(await state(), 'ROOT');
    await page.reload(); await page.waitForTimeout(300);
    assert.equal(await state(), 'ROOT', 'restored mid-page location renders a resolved scene');
    // Resize across the mobile breakpoint: no duplicate nodes or horizontal overflow.
    for (const width of [1024,768,390,1440]) {
      await page.setViewportSize({ width, height:844 }); await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const count = await page.locator('.feed-fragment').count();
      assert.ok(count >= 8 && count <= 12, 'one renderer owns the fragments after resize');
    }
    await at(.4); await page.waitForTimeout(100);
    await page.locator('.motion-toggle').click();
    const transform = await page.locator('.feed-fragment').first().getAttribute('style');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.feed-fragment').first().getAttribute('style'), transform, 'pause stops the render loop');
    await page.locator('.motion-toggle').click();
    await page.emulateMedia({ reducedMotion:'reduce' }); await page.waitForTimeout(200);
    assert.equal(await page.locator('.feed-fragment').count(), 0);
    assert.equal(await page.locator('.story-stage').evaluate(el => getComputedStyle(el).position), 'relative');
    assert.equal(await page.locator('.hero-content').evaluate(el => el.inert), false);
    assert.equal(await page.locator('.story-static-note').isVisible(), true);
    // Existing product interactions remain usable after the story has been bypassed.
    await page.locator('#tab-offline').click();
    const quest = await page.locator('#quest-title').textContent();
    await page.locator('#quest-next').click();
    assert.notEqual(await page.locator('#quest-title').textContent(), quest);
    await page.locator('#tab-focus').click();
    await page.locator('[data-minutes="5"]').click();
    assert.equal(await page.locator('#timer-display').textContent(), '05:00');
    await page.locator('#timer-toggle').click(); await page.waitForTimeout(1100);
    assert.notEqual(await page.locator('#timer-display').textContent(), '05:00');
    await page.locator('#timer-reset').click();
    for (const button of await page.locator('[data-habit]').all()) await button.click();
    assert.equal(await page.locator('#garden-count').textContent(), '3 / 3');
    await page.locator('#start [data-open-check]').click();
    assert.equal(await page.locator('#focus-dialog').evaluate(el => el.open), true);
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion:'no-preference' }); await page.waitForTimeout(200);
    assert.equal(await page.locator('.feed-fragment').count(), 12);
    assert.deepEqual(errors, []);
    const noJS = await browser.newPage({ javaScriptEnabled:false, viewport:{width:390,height:844} });
    await noJS.goto(url);
    assert.equal(await noJS.locator('#hero-title').isVisible(), true);
    assert.equal(await noJS.locator('.story-static-note').isVisible(), true);
    assert.equal(await noJS.locator('.feature-card').count(), 4);
    assert.equal(await noJS.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await noJS.close();
    console.log('PASS: speed, stillness, fallback, reverse, restoration, resize, pause, reduced motion, product controls, no-JS, zero browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
