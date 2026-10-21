/** Real browser smoke test for a GitHub Pages-style project subpath. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const prefix = '/DeepSprout/';
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp',
  '.woff2':'font/woff2', '.wav':'audio/wav'};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
  const relative = pathname.slice(prefix.length) || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403).end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, {'content-type':types[path.extname(file)] || 'application/octet-stream'});
    fs.createReadStream(file).pipe(response);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true});
  const errors = [];
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({viewport:{width,height:900}, reducedMotion:'reduce'});
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`${width}: ${error.message}`));
      page.on('response', response => {
        if (response.url().startsWith(origin) && response.status() >= 400)
          errors.push(`${width}: ${response.status()} ${response.url()}`);
      });
      await page.goto(origin + prefix + '?preview=1');
      await page.locator('#hero-title').waitFor();
      await page.waitForTimeout(500);
      assert.match(await page.locator('#hero-title').innerText(), /Make room for/);
      assert.equal(await page.locator('.hero-content').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true,
        `${width}px horizontal overflow`);
      if (width === 1440) {
        if (process.env.CAPTURE === '1')
          await page.screenshot({path:path.join(root,'docs/assets/readme/home-preview.png')});
        await page.goto(origin + prefix + 'Client/index.html');
        assert.match(await page.locator('#hero-title').innerText(), /Make room for/);
        await page.goto(origin + prefix + '?preview=1');
        await page.locator('.hero-story-link').click();
        assert.equal(new URL(page.url()).pathname, prefix);
        assert.match(page.url(), /\?preview=1#story-entry$/);
        await page.goto(origin + prefix);
        await page.locator('.ds-nav a').filter({hasText:'Activities'}).click();
        await page.waitForURL(/\/DeepSprout\/Client\/src\/pages\/member\/training\/training\.html$/);
        assert.match(new URL(page.url()).pathname, /\/DeepSprout\/Client\/src\/pages\/member\/training\/training\.html$/);
        await page.goto(origin + prefix + 'Client/workspaces.html#/mentor/dashboard');
        await page.locator('#app').waitFor();
        assert.equal(new URL(page.url()).pathname, prefix + 'Client/workspaces.html');
        assert.match(new URL(page.url()).hash, /^#\/mentor\/dashboard|^#\/auth\/login/);
      }
      await context.close();
      console.log(`PASS ${width}px root homepage and local resources`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS same-page query/hash, member link, partner hash, zero local errors');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
