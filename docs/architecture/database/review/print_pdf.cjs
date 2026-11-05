const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../../../node_modules/playwright'));

(async () => {
  const input = path.join(__dirname, 'DeepSprout-Database-Study-Guide-AR-EN.html');
  const output = path.join(__dirname, 'DeepSprout-Database-Study-Guide-AR-EN.pdf');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    await page.goto('file:///' + input.replace(/\\/g, '/'), { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: output, format: 'A4', preferCSSPageSize: true, printBackground: true,
      displayHeaderFooter: true, headerTemplate: '<div></div>',
      footerTemplate: '<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#687f6b;text-align:center">DeepSprout Database Study Guide · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      timeout: 120000,
    });
    console.log(output);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
