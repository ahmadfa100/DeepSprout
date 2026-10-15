const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:1536,height:1024}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>localStorage.setItem('deepsprout-admin-demo-session','active'));
  await page.clock.install({time:new Date('2026-10-15T12:00:00+03:00')});
  await page.goto(base+'/admin.html#/dashboard');await page.locator('.dashboard').waitFor();
  assert.equal(await page.locator('.dashboard-kpi').count(),4);
  assert.equal(await page.locator('.sidebar nav a').count(),10);
  const metrics=await page.evaluate(async()=>{
   const {dashboardMetrics}=await import('/src/admin/dashboard.js');const {read}=await import('/src/admin/store.js');
   const data=read(),now=new Date('2026-10-15T12:00:00+03:00');
   return {all:dashboardMetrics(data,'all',now),recent:dashboardMetrics(data,'30',now),crossYear:dashboardMetrics({...data,users:[{joined:'2025-12-30',status:'active'},{joined:'2026-01-02',status:'paused'},{joined:'2026-02-20',status:'active'}]},'30',new Date('2026-01-15T12:00:00'))};
  });
  assert.equal(metrics.all.total,10);assert.equal(metrics.all.active,9);assert.equal(metrics.all.completions,40);assert.equal(metrics.recent.completions,24);
  assert.equal(metrics.all.statuses.reduce((n,s)=>n+s.value,0),10);
  assert.equal(metrics.crossYear.monthly.reduce((n,m)=>n+m.value,0),2);assert.equal(metrics.crossYear.monthly.length,2);
  await page.locator('#dashboard-period').selectOption('180');assert.equal(await page.locator('.dashboard-kpi').nth(2).locator('strong').innerText(),'40');
  await page.locator('#dashboard-period').selectOption('all');assert.equal(await page.locator('.dashboard-kpi').nth(2).locator('strong').innerText(),'40');
  const before=await page.locator('.main-wrap').boundingBox();await page.locator('.sidebar-toggle').click();
  const after=await page.locator('.main-wrap').boundingBox();assert(after.width>before.width);assert.equal(await page.locator('.nav-text').first().isVisible(),false);
  await page.reload();assert(await page.locator('.admin-shell').evaluate(el=>el.classList.contains('collapsed')));
  await page.locator('.sidebar-toggle').click();
  await page.locator('#admin-notifications summary').click();assert(await page.locator('.popover-body').first().isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('#admin-notifications').getAttribute('open'),null);
  await page.locator('#admin-profile summary').click();await page.locator('#admin-profile a').click();await page.locator('h1').filter({hasText:'Settings'}).waitFor();
  for(const route of ['users','activities','plans','assessments','shield','content','subscriptions','reports','settings','groups','garden','community','audit']){
   await page.goto(base+'/admin.html#/'+route);await page.locator('h1').waitFor();assert(!/undefined/.test(await page.locator('h1').innerText()),route);
  }
  await page.goto(base+'/admin.html#/dashboard');await page.locator('[data-action="activity-create"]').first().click();await page.locator('#editor-dialog[open]').waitFor();await page.locator('#editor-dialog [data-close]').first().click();
  await page.locator('#dashboard-period').selectOption('30');await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'/tmp/deepsprout-admin-desktop.png',fullPage:true});
  for(const width of [1024,768,390,320]){
   await page.setViewportSize({width,height:900});
   await page.waitForFunction(()=>document.querySelector('.sidebar').inert===matchMedia('(max-width:880px)').matches);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow at '+width);
   if(width<=880){
    assert(await page.locator('.sidebar').evaluate(el=>el.inert));await page.locator('.sidebar-toggle').click();assert.equal(await page.locator('.sidebar').evaluate(el=>el.inert),false);
    assert(await page.locator('.main-wrap').evaluate(el=>el.inert));await page.keyboard.press('Escape');assert.equal(await page.locator('.main-wrap').evaluate(el=>el.inert),false);
    await page.locator('.sidebar-toggle').click();await page.locator('.sidebar a[href="#/users"]').click();await page.locator('h1').filter({hasText:'Users'}).waitFor();assert(await page.locator('.sidebar').evaluate(el=>el.inert));await page.goto(base+'/admin.html#/dashboard');
   }
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/deepsprout-admin-mobile.png',fullPage:true});
  // Empty-data states remain honest and do not invent queues or division-by-zero rates.
  await page.evaluate(async()=>{const {read,write}=await import('/src/admin/store.js');const data=read();for(const key of ['users','plans','activities','assessments','events','activityCompletions'])data[key]=[];data.content.draft=null;data.community.reports=[];write(data);window.dispatchEvent(new Event('admin-refresh'));});
  assert(await page.getByText("You're all caught up",{exact:true}).isVisible());assert.equal(await page.locator('.dashboard-kpi strong').first().innerText(),'0');
  await page.locator('#admin-notifications summary').click();assert(await page.getByText('No administrative notifications. You’re all caught up.').isVisible());
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('Admin dashboard: data definitions, year boundaries, filters, 13 routes, dialogs, sidebar persistence, popovers, four responsive widths and empty states passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
