const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {chromium} = require('playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:8765';

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({acceptDownloads:true});
    const page = await context.newPage();
    await page.goto(`${base}/workspaces.html#/auth/workspaces`);
    await page.evaluate(async () => {
      const store = await import('/src/workspaces/store.js');
      store.dispatch('demo.admin-ready');
    });
    await page.goto(`${base}/workspaces.html#/admin/organizations/app-bright`);
    const documents = page.locator('.ar-docs');
    await documents.waitFor();
    for (const filename of ['registration-certificate.pdf', 'board-letter.pdf']) {
      const link = documents.getByRole('link', {name:`Download sample PDF ${filename}`});
      const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
      assert.equal(download.suggestedFilename(), filename);
      const bytes = await fs.readFile(await download.path());
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
      assert(bytes.length > 1000);
    }
    await page.evaluate(async () => {
      const store = await import('/src/workspaces/store.js');
      const state = store.read();
      state.applications.find(a => a.id === 'app-bright').files.push('name-only.pdf');
      store.snapshotForTests(state);
    });
    await page.reload();
    await page.locator('.ar-docs').waitFor();
    assert.equal(await page.getByRole('link', {name:/name-only\.pdf/}).count(), 0);
    assert(await page.getByText('Name-only entries have no file content stored in this browser demo.').isVisible());
    console.log('PASS seeded PDFs download and name-only entries stay clearly unavailable');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
