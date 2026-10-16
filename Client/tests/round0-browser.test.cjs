const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:8896';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/workspaces.html');
  const command=(action,p={})=>page.evaluate(async({action,p})=>(await import('/src/workspaces/store.js')).dispatch(action,p),{action,p});
  await command('demo.clock',{at:'2026-10-15T09:00:00+03:00'});
  const a=await command('member.register',{name:'Round A',email:'round.a@browser.test',consent:true});
  await page.goto(base+'/src/pages/member/profile/profile.html');await page.waitForFunction(()=>document.getElementById('name')?.value==='Round A');
  assert(await page.locator('#email').getAttribute('readonly')!==null);
  await page.locator('#name').fill('Round A Updated');await page.locator('#save-account').click();
  await page.waitForFunction(()=>document.getElementById('profile-name')?.textContent==='Round A Updated');await page.reload();
  await page.waitForFunction(()=>document.getElementById('name')?.value==='Round A Updated');
  await page.evaluate(()=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='deepsprout-ecosystem-demo-v1')throw new DOMException('Full','QuotaExceededError');return __setItem.call(this,k,v);};});
  await page.locator('#name').fill('Unsaved name');await page.locator('#save-account').click();await page.getByText(/Your changes could not be saved/).first().waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('deepsprout-ecosystem-demo-v1')).people.find(p=>p.id===JSON.parse(localStorage.getItem('deepsprout-ecosystem-demo-v1')).session.personId).name),'Round A Updated');
  await page.evaluate(()=>Storage.prototype.setItem=__setItem);
  await page.evaluate(async()=>{window.__journal=await DeepSproutAccount.load();DeepSproutPersonal.save('round0-test','saved');});
  const tab=await context.newPage();await tab.goto(base+'/workspaces.html');
  const b=await tab.evaluate(async()=> (await import('/src/workspaces/store.js')).dispatch('member.register',{name:'Round B',email:'round.b@browser.test',consent:true}));
  await page.getByRole('heading',{name:/identity changed/}).waitFor();
  assert.match(await page.evaluate(()=>{try{__journal.mutate({type:'routine.add',title:'Forbidden'});return 'BAD';}catch(e){return e.message;}}),/identity changed/);
  await tab.goto(base+'/src/pages/member/onboarding/onboarding.html');
  assert.equal(await tab.evaluate(()=>DeepSprout.get().onboarding.planActivated),false);
  assert.notEqual(a,b);
  await page.goto(base+'/workspaces.html');
  const limited=await page.evaluate(async()=>{const m=await import('/src/workspaces/store.js'),s=m.read(),p=s.people.find(p=>p.workspaces.includes('student'));p.individual=false;delete p.journal;s.session.personId=p.id;m.snapshotForTests(s);return p.id;});
  for(const route of ['lab/lab.html','shield/shield.html','recovery-plan/recovery-plan.html','garden/garden.html']){
   await page.goto(base+'/src/pages/member/'+route);await page.getByRole('heading',{name:/Upgrade to an Individual/}).waitFor();
   assert.match(await page.evaluate(async()=>{try{await DeepSproutAccount.load();return 'BAD';}catch(e){return e.message;}}),/Individual/);
   assert.equal(await page.locator('#personal-access-notice a').getAttribute('href'),base+'/workspaces.html#/student');
  }
  await page.goto(base+'/workspaces.html');await command('account.upgrade',{consent:true});
  await page.goto(base+'/src/pages/member/lab/lab.html');
  assert.equal(await page.evaluate(async()=>(await DeepSproutAccount.load()).id),`person:${limited}`);
  await page.goto(base+'/workspaces.html');await command('demo.reset');await command('demo.clock',{at:'2026-10-15T09:00:00+03:00'});await command('demo.signin',{personId:'p-maya'});
  const aid=await command('mentor.assignment.create',{groupId:'g-fresh',title:'Round 0 history task',activity:'Depth Practice',instructions:'Own earlier work',due:'2026-10-20'});
  await command('mentor.assignment.cancel',{id:aid,reason:'Replaced safely'});await command('demo.signin',{personId:'p-noor'});await command('account.upgrade',{consent:true});
  await page.goto(base+'/src/pages/member/training/training.html#assigned');
  await page.waitForFunction(()=>!!document.querySelector('[data-assigned-filter]'));
  assert.equal(await page.locator(`[data-task="${aid}"]`).count(),0);
  await page.locator('[data-assigned-filter=all]').click();await page.locator(`[data-task="${aid}"]`).waitFor();
  assert.match(await page.locator(`[data-task="${aid}"]`).innerText(),/Cancelled/);
  await page.reload();await page.locator('[data-assigned-filter=all]').click();await page.locator(`[data-task="${aid}"]`).waitFor();
  await page.goto(base+'/workspaces.html');await command('demo.signin',{personId:'p-maya'});await command('mentor.member.remove',{groupId:'g-fresh',personId:'p-noor'});await command('demo.signin',{personId:'p-noor'});
  await page.goto(base+`/workspaces.html#/student/tasks/${aid}`);await page.getByRole('heading',{name:'Round 0 history task'}).waitFor();assert.equal(await page.locator('[data-form=student-submit]').count(),0);
  // A failed registration must keep the form and the last persisted graph.
  await page.goto(base+'/register.html');await page.locator('[data-path=individual]').click();await page.locator('[data-entry-continue]').click();await page.locator('#register-form:visible').waitFor();
  await page.locator('#full-name').fill('Cannot save');await page.locator('#email').fill('failed@browser.test');await page.locator('#password').fill('demo-password');await page.locator('#confirm-password').fill('demo-password');await page.locator('#terms').check();
  await page.evaluate(()=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='deepsprout-ecosystem-demo-v1')throw new DOMException('Full','QuotaExceededError');return __setItem.call(this,k,v);};});
  await page.locator('#register-form button[type=submit]').click();await page.locator('#email-error').filter({hasText:/could not be saved/}).waitFor();
  assert(await page.locator('#register-form').isVisible());assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('deepsprout-ecosystem-demo-v1')).people.some(p=>p.email==='failed@browser.test')),false);await page.evaluate(()=>Storage.prototype.setItem=__setItem);
  // A valid returning seeded Individual follows their real active journal.
  await page.goto(base+'/src/pages/auth/login/login.html');await page.locator('#email').fill('ahmad@demo.example');await page.locator('#password').fill('demo-password');await page.locator('#login-form button[type=submit]').click();await page.waitForURL(base+'/index.html');
  assert.equal(await page.evaluate(async()=>(await DeepSproutAccount.load()).id),'demo');
  await page.goto(base+'/src/pages/member/shield/shield.html');await page.locator('#shield-time').fill('20:15');
  await page.evaluate(()=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('deepsprout-account-changes-v1:'))throw new DOMException('Full','QuotaExceededError');return __setItem.call(this,k,v);};});
  const shieldBefore=await page.evaluate(async()=>(await DeepSproutAccount.load()).changeCount());
  await page.locator('[form=shield-form][type=submit]').click();await page.locator('#save-message').filter({hasText:/could not save/}).waitFor();assert.equal(await page.evaluate(async()=>(await DeepSproutAccount.load()).changeCount()),shieldBefore);
  await page.evaluate(()=>Storage.prototype.setItem=__setItem);await page.locator('[form=shield-form][type=submit]').click();await page.locator('#save-message').filter({hasText:/Preferences saved/}).waitFor();await page.reload();assert.equal(await page.locator('#shield-time').inputValue(),'20:15');
  await page.goto(base+'/src/pages/member/recovery-plan/recovery-plan.html');await page.locator('#tab-adjust').click();await page.getByText('More time away from screens',{exact:true}).click();
  const recoveryBefore=await page.evaluate(async()=>(await DeepSproutAccount.load()).changeCount());
  await page.evaluate(()=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('deepsprout-account-changes-v1:'))throw new DOMException('Full','QuotaExceededError');return __setItem.call(this,k,v);};});
  await page.locator('#adjust-form button[type=submit]').click();await page.locator('#save-note').filter({hasText:/could not be saved/}).waitFor();assert.equal(await page.evaluate(async()=>(await DeepSproutAccount.load()).changeCount()),recoveryBefore);
  await page.evaluate(()=>Storage.prototype.setItem=__setItem);await page.locator('#adjust-form button[type=submit]').click();await page.locator('#save-note').filter({hasText:/Saved/}).waitFor();await page.reload();await page.locator('#tab-adjust').click();assert(await page.locator('[name=focus][value=offline]').isChecked());
  assert.deepEqual(errors,[]);
  console.log('round0-browser: PASS — canonical profile/reload, two identities/cross-tab stale write, four limited routes/upgrade, cancelled and former-membership history/reload; failed registration/profile saves and seeded login; final page-error check reached');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
