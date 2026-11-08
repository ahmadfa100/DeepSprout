const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = process.env.COMMUNITY_URL || 'http://127.0.0.1:8765/src/pages/member/community/community.html';
  const graphKey = 'deepsprout-ecosystem-demo-v1';
  const roomKey = 'deepsprout-community-quiz-rooms-v2';
  const setPerson = async (id, name) => {
    await page.evaluate(({ graphKey, id, name }) => {
      const graph = JSON.parse(localStorage.getItem(graphKey) || '{}');
      graph.people = [{ id, name, status: 'Active', verified: true, individual: true, workspaces: ['individual'] }];
      graph.session = { personId: id };
      localStorage.setItem(graphKey, JSON.stringify(graph));
    }, { graphKey, id, name });
    await page.reload();
  };
  try {
    await page.goto(url);
    await page.evaluate(() => {
      localStorage.setItem('deepsprout-community-challenges-v1', JSON.stringify({ challenges: [{ id: 'old' }] }));
      localStorage.setItem('deepsprout-community-demo-v1', JSON.stringify({ posts: [{ id: 'old-post', category: 'challenges', title: 'Old', message: 'Old challenge' }] }));
    });
    await setPerson('quiz-a', 'Amina');
    assert.equal(await page.locator('#my-challenges-title').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('deepsprout-community-challenges-v1')), null);
    assert.equal(await page.locator('[name="partners"]').count(), 0);
    await page.locator('#create-challenge').click();
    await page.locator('#challenge-form [name="title"]').fill('Focus Sprint');
    const future = new Date(Date.now() + 86400000);
    await page.locator('#challenge-form [name="date"]').fill(`${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`);
    await page.locator('#challenge-form [name="time"]').fill('16:00');
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'challenge-create-desktop.png') });
    await page.locator('#challenge-form [type="submit"]').click();
    assert.equal(await page.locator('.challenge-room-card').count(), 1);
    assert.match(await page.locator('.challenge-room-card button').innerText(), /Open room/);
    assert.match(await page.locator('#challenge-board').innerText(), /Open seat/);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'challenge-lobby-desktop.png') });
    await page.locator('.cr-close').click();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'challenge-feed-desktop.png') });
    await setPerson('quiz-b', 'Omar');
    await page.locator('[data-filter="challenges"]').click();
    await page.locator('.challenge-room-card button').click();
    await page.locator('[data-cr-action="join"]').click();
    assert.match(await page.locator('#challenge-board').innerText(), /Amina/);
    assert.match(await page.locator('#challenge-board').innerText(), /Omar/);
    assert.equal(await page.locator('[data-cr-action="begin"]').count(), 0);
    assert.equal(await page.locator('.challenge-room-card').count(), 1);
    await page.locator('.cr-close').click();
    await setPerson('quiz-c', 'Leila');
    await page.locator('[data-filter="challenges"]').click();
    assert.equal(await page.locator('.challenge-room-card button').isDisabled(), true);
    assert.equal((await page.evaluate(roomKey => JSON.parse(localStorage.getItem(roomKey))[0].players.length, roomKey)), 2);
    await setPerson('quiz-b', 'Omar');
    await page.evaluate(roomKey => {
      const rooms = JSON.parse(localStorage.getItem(roomKey));
      rooms[0].startAt = new Date(Date.now() - 1000).toISOString();
      localStorage.setItem(roomKey, JSON.stringify(rooms));
    }, roomKey);
    await page.locator('.challenge-room-card button').click();
    await page.locator('[data-cr-action="begin"]').click();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'challenge-question-desktop.png') });
    for (let index = 0; index < 5; index++) {
      await page.locator('[data-cr-choice]').nth([1, 2, 0, 2, 1][index]).click();
      await page.locator('[data-cr-action="next"]').click();
    }
    assert.match(await page.locator('#challenge-board').innerText(), /Waiting for the other player/);
    await page.locator('.cr-close').click();
    await setPerson('quiz-a', 'Amina');
    await page.locator('[data-filter="challenges"]').click();
    await page.locator('.challenge-room-card button').click();
    await page.locator('[data-cr-action="begin"]').click();
    for (let index = 0; index < 5; index++) {
      await page.locator('[data-cr-choice]').nth([1, 2, 0, 2, 1][index]).click();
      await page.locator('[data-cr-action="next"]').click();
    }
    assert.match(await page.locator('#challenge-board').innerText(), /won this round|A tie/);
    assert.equal((await page.evaluate(roomKey => JSON.parse(localStorage.getItem(roomKey))[0].players.length, roomKey)), 2);
    await page.setViewportSize({ width: 390, height: 844 });
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'challenge-result-mobile.png') });
    assert.equal(await page.locator('#challenge-board').evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log('Community quiz flow passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
