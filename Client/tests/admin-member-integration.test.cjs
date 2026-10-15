const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>localStorage.setItem('deepsprout-admin-demo-session','active'));
  await page.goto(base+'/admin.html#/dashboard');await page.locator('.dashboard').waitFor();
  const metrics=await page.evaluate(async()=>{
    const {subscriptionMetrics}=await import('/src/js/config/subscriptions.js');
    const now=new Date('2026-10-15T12:00:00Z');
    return subscriptionMetrics({subscriptions:[
      {status:'active',currency:'USD',startedOn:'2026-10-01',amount:399,interval:'month'},
      {status:'active',currency:'USD',startedOn:'2026-10-01',amount:2999,interval:'year'},
      {status:'cancelled',currency:'USD',startedOn:'2026-10-01',amount:399,interval:'month'},
      {status:'active',currency:'USD',startedOn:'2026-10-16',amount:399,interval:'month'},
      {status:'active',currency:'EUR',startedOn:'2026-10-01',amount:900,interval:'month'},
      {status:'active',currency:'USD',startedOn:'2026-10-01',endsOn:'2026-10-14',amount:399,interval:'month'}
    ],payments:[{currency:'USD',status:'paid',paidOn:'2026-10-10',amount:399,refundedAmount:99},{currency:'USD',status:'failed',paidOn:'2026-10-10',amount:999},{currency:'USD',status:'paid',paidOn:'2026-09-30',amount:399},{currency:'EUR',status:'paid',paidOn:'2026-10-10',amount:900}]},now);
  });
  assert.deepEqual(metrics,{active:2,mrr:649,collected:399,refunded:99});
  await page.goto(base+'/admin.html#/subscriptions');await page.getByText('No subscriptions recorded',{exact:true}).waitFor();
  assert.equal(await page.locator('.kpi strong').nth(1).innerText(),'$0.00');
  await page.evaluate(async()=>{const {read,write}=await import('/src/admin/store.js');const d=read();d.subscriptions=[{id:'test-sub',userId:'u1',planId:'monthly',currency:'USD',amount:399,interval:'month',status:'active',startedOn:'2026-01-01'}];d.payments=[{id:'test-payment',userId:'u1',currency:'USD',amount:399,refundedAmount:0,status:'paid',paidOn:new Date().toISOString()}];write(d);window.dispatchEvent(new Event('admin-refresh'));});
  assert.equal(await page.locator('.kpi strong').first().innerText(),'1');
  assert(await page.locator('tr').filter({hasText:'test-payment'}).isVisible());
  await page.evaluate(async()=>{const {read,write}=await import('/src/admin/store.js');const d=read();d.subscriptions=[];d.payments=[];write(d);});
  await page.goto(base+'/admin.html#/reports');await page.getByRole('heading',{name:'Subscriptions & Revenue',exact:true}).waitFor();
  await page.goto(base+'/src/pages/public/pricing/pricing.html');await page.locator('[data-plan=annual]').click();assert.equal(await page.locator('#dialog-price').innerText(),'$29.99 per year');await page.keyboard.press('Escape');
  // Same account record is visible in the member profile and Admin Users.
  await page.goto(base+'/src/pages/member/profile/profile.html?account=empty');await page.locator('#profile-state').filter({hasText:'No plan'}).waitFor();
  await page.locator('#name').fill('Integration Member');await page.locator('#email').fill('integration@example.test');await page.locator('#save-account').click();
  await page.goto(base+'/admin.html#/users');await page.getByText('Integration Member · integration@example.test',{exact:true}).waitFor();
  assert(await page.getByRole('heading',{name:'Sample administration accounts'}).isVisible());
  const memberTab=await context.newPage();await memberTab.goto(base+'/src/pages/member/profile/profile.html?account=empty');await memberTab.locator('#profile-name').filter({hasText:'Integration Member'}).waitFor();await memberTab.locator('#name').fill('Updated in another tab');await memberTab.locator('#save-account').click();await page.getByText('Updated in another tab · integration@example.test',{exact:true}).waitFor();await memberTab.close();
  // Publish a guide and verify all member-facing fields, then archive it.
  await page.goto(base+'/admin.html#/activities');await page.locator('[data-action=activity-create]').click();
  for(const [key,value] of Object.entries({name:'Integration guide',description:'Shared guide description',instructions:'Read these instructions.',completion:'One reflection',minutes:'7'}))await page.locator(`#editor-dialog [name=${key}]`).fill(value);
  await page.locator('#editor-dialog [name=goals]').first().check();await page.locator('#dialog-submit').click();
  const guide=page.locator('tr').filter({hasText:'Integration guide'});await guide.locator('[data-action=activity-preview]').first().click();await page.locator('[data-action=activity-publish]').click();await page.locator('#dialog-submit').click();
  await page.goto(base+'/src/pages/member/training/training.html');const memberGuide=page.locator('.admin-activity-card').filter({hasText:'Integration guide'});await memberGuide.locator('summary').click();assert(await memberGuide.getByText(/Completion: One reflection/).isVisible());
  await page.goto(base+'/admin.html#/activities');await page.locator('tr').filter({hasText:'Integration guide'}).locator('[data-action=activity-preview]').first().click();await page.locator('[data-action=activity-archive]').click();await page.locator('#dialog-submit').click();
  await page.goto(base+'/src/pages/member/training/training.html');assert.equal(await page.getByText('Integration guide',{exact:true}).count(),0);
  // Member report reaches Admin and a moderation decision changes the member feed.
  await page.goto(base+'/src/pages/member/community/community.html');await page.locator('[data-id=sara-progress] .post-more').click();await page.locator('[data-action=report]').click();
  await page.goto(base+'/admin.html#/community');await page.locator('tr').filter({hasText:'Member requested content review'}).locator('[data-action=report-review]').click();await page.locator('[data-action=report-hide]').click();await page.locator('#dialog-submit').click();
  await page.goto(base+'/src/pages/member/community/community.html');assert.equal(await page.locator('[data-id=sara-progress]').isVisible(),false);
  // Review every member/admin destination at desktop and mobile, including dialogs/tables.
  const admin=['dashboard','users','activities','plans','assessments','shield','content','community','subscriptions','settings','groups','garden','audit'];
  const member=['onboarding/onboarding','onboarding/starting-point','lab/lab','lab/assessment?test=digital-habits','recovery-plan/recovery-plan','training/training','shield/shield','garden/garden','insights/insights','explore/explore','community/community','profile/profile','weekly-review/weekly-review'];
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const route of admin){await page.goto(base+'/admin.html#/'+route);await page.locator('h1').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflow at ${width}`);if(['users','activities'].includes(route)){assert(await page.locator('td').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=15));}}
   if(width===1440||width===390){for(const route of member){const [file,query]=route.split('?');await page.goto(base+'/src/pages/member/'+file+'.html'+(query?'?'+query:''));await page.locator('main').waitFor();await page.waitForTimeout(80);}}
  }
  for(const [route,file] of [['dashboard','dashboard'],['users','users'],['subscriptions','subscriptions']]){
   await page.setViewportSize({width:1536,height:1000});await page.goto(base+'/admin.html#/'+route);await page.locator('h1').waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'/tmp/admin-'+file+'-new.png',fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/admin.html#/dashboard');await page.locator('.dashboard').waitFor();await page.screenshot({path:'/tmp/admin-mobile-new.png',fullPage:true});
  assert.equal(errors.length,0,errors.join('\n'));console.log('Admin/member integration passed: financial boundaries, shared pricing, profile visibility, publish/archive guides, report/moderate/hide, all admin routes at 4 widths, all member pages at desktop/mobile; no JS or asset errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
