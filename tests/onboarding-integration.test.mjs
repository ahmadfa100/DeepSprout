import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rmdir, unlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const web = join(root, 'src', 'DeepSprout.Web');
const database = 'DeepSproutOnboardingTest_' + randomUUID().replaceAll('-', '');
const connection = `Server=localhost;Database=${database};Integrated Security=True;Encrypt=True;TrustServerCertificate=True`;
const register = '/src/pages/auth/register/register.html';
const login = '/src/pages/auth/login/login.html';
const onboarding = '/src/pages/member/onboarding/onboarding.html';
const setup = '/api/onboarding';
const recovery = '/api/recovery-plan';
const password = 'Onboarding-test-123!';
const signingKey = randomUUID() + randomUUID();
const answers = {
  change: 'reduce-scrolling', apps: ['instagram', 'youtube'], dailyScroll: '60-120',
  moments: 'before-bed', makeTimeFor: ['walking-sports'], dailyMinutes: '10'
};
let origin, keys, host, hostOutput = '', migrationStarted = false;

async function sql(query, catalog = database) {
  const { stdout } = await run('sqlcmd', ['-S', 'localhost', '-E', '-C', '-I', '-d', catalog,
    '-b', '-h', '-1', '-W', '-Q', 'SET NOCOUNT ON; ' + query], { cwd: root });
  return stdout.trim();
}

before(async () => {
  const listener = createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  origin = `http://127.0.0.1:${listener.address().port}`;
  await new Promise(resolve => listener.close(resolve));
  keys = await mkdtemp(join(tmpdir(), 'DeepSproutOnboarding-'));
  migrationStarted = true;
  await run('dotnet', ['ef', 'database', 'update', '--no-build',
    '--context', 'DeepSproutV5DbContext', '--project', 'src/DeepSprout.Infrastructure',
    '--startup-project', 'src/DeepSprout.Infrastructure'], {
    cwd: root, timeout: 120_000, env: { ...process.env, DEEPSPROUT_V5_CONNECTION: connection }
  });
  host = spawn('dotnet', [process.env.DEEPSPROUT_TEST_WEB_DLL || 'bin/Debug/net10.0/DeepSprout.Web.dll', '--urls', origin], {
    cwd: web, windowsHide: true, env: {
      ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', DOTNET_ENVIRONMENT: 'Development',
      ConnectionStrings__DeepSprout: connection, DataProtection__KeyDirectory: keys,
      Jwt__Issuer: 'OnboardingIntegration', Jwt__Audience: 'OnboardingIntegration',
      Jwt__SigningKey: signingKey
    }
  });
  for (const stream of [host.stdout, host.stderr]) stream.on('data', data => { hostOutput = (hostOutput + data).slice(-4500); });
  for (let i = 0; i < 80; i++) {
    if (host.exitCode !== null) break;
    const response = await fetch(origin + setup).catch(() => null);
    if (response?.status === 401) return;
    await delay(250);
  }
  assert.fail('Test host did not start.\n' + hostOutput);
});

after(async () => {
  try {
    if (host && host.exitCode === null && host.signalCode === null) {
      const exited = once(host, 'exit');
      host.kill();
      await exited;
    }
    if (migrationStarted) {
      await sql(`IF DB_ID(N'${database}') IS NOT NULL BEGIN
        ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE [${database}];
      END;`, 'master');
    }
  } finally {
    if (keys) {
      for (const file of await readdir(keys)) await unlink(join(keys, file));
      await rmdir(keys);
    }
  }
});

function session() {
  const cookies = new Map();
  let token;
  async function request(path, options = {}) {
    const response = await fetch(origin + path, {
      ...options, redirect: 'manual', headers: {
        Cookie: [...cookies.values()].join('; '), ...options.headers
      }
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';', 1)[0];
      cookies.set(pair.split('=', 1)[0], pair);
    }
    return response;
  }
  return {
    request,
    authCookie: () => cookies.get('DeepSproutAuth'),
    async signIn(name, create = true) {
      const path = create ? register : login;
      const form = await (await request(path)).text();
      const csrf = form.match(/name="__RequestVerificationToken"[^>]+value="([^"]+)"/)?.[1];
      assert.ok(csrf, 'The real Identity form must issue an antiforgery token');
      const body = new URLSearchParams({
        DisplayName: name, Email: `${name}@example.test`, Password: password,
        ConfirmPassword: password, AcceptTerms: 'true', __RequestVerificationToken: csrf
      });
      const response = await request(path, { method: 'POST', body });
      assert.equal(response.status, 302, 'Identity must redirect after authentication');
      return response.headers.get('location');
    },
    async read() {
      const response = await request(setup);
      assert.equal(response.status, 200, await response.clone().text());
      const state = await response.json();
      token = state.requestToken;
      return state;
    },
    write(path, input) {
      return request(setup + '/' + path, {
        method: input ? 'PUT' : 'POST',
        headers: { RequestVerificationToken: token, ...(input && { 'Content-Type': 'application/json' }) },
        body: input ? JSON.stringify(input) : undefined
      });
    },
    save(question, answer, finish = false) {
      return this.write('answers', { question, answer, finish });
    }
  };
}

async function saved(response) {
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}

async function registerBrowser(context, name, email) {
  const registration = await context.request.get(origin + register);
  const csrf = (await registration.text()).match(/name="__RequestVerificationToken"[^>]+value="([^"]+)"/)?.[1];
  assert.ok(csrf);
  const response = await context.request.post(origin + register, { maxRedirects: 0, form: {
    DisplayName: name, Email: email, Password: password, ConfirmPassword: password,
    AcceptTerms: 'true', __RequestVerificationToken: csrf
  } });
  assert.equal(response.status(), 302);
}

async function finishSetup(account, values = answers) {
  await account.read();
  for (const [question, answer] of Object.entries(values))
    await saved(await account.save(question, answer, question === 'dailyMinutes'));
}

function writePlan(account, state, preferences, identity = {}) {
  return account.request(recovery + (preferences ? '/preview' : '/activate'), {
    method: preferences ? 'PUT' : 'POST',
    headers: {'Content-Type':'application/json', RequestVerificationToken:state.requestToken},
    body: JSON.stringify({cycleId:state.cycleId,version:state.plan.version,...(preferences && {preferences}),...identity})
  });
}

async function activateFor(account, activityTypes) {
  await finishSetup(account);
  const preview = await saved(await account.request(recovery));
  const edited = await saved(await writePlan(account, preview, {...preview.plan.preferences,
    activityTypes, practiceDays:[0,2,4], routine:{title:'Walk outside',minutes:5,days:[0,2]}}));
  return saved(await writePlan(account, {...edited,requestToken:preview.requestToken}));
}

async function activateBrowser(context, family) {
  const setupState = await (await context.request.get(origin+setup)).json();
  for (const [question,answer] of Object.entries(answers)) {
    const response = await context.request.put(origin+setup+'/answers', {
      headers:{RequestVerificationToken:setupState.requestToken},data:{question,answer,finish:question==='dailyMinutes'}
    });
    assert.equal(response.status(),200,await response.text());
  }
  const preview = await (await context.request.get(origin+recovery)).json();
  const headers = {RequestVerificationToken:preview.requestToken};
  const edit = await context.request.put(origin+recovery+'/preview',{headers,data:{
    cycleId:preview.cycleId,version:preview.plan.version,preferences:{...preview.plan.preferences,
      activityTypes:[family],routine:{title:'Walk outside',minutes:5,days:[0,2]}}
  }});
  assert.equal(edit.status(),200,await edit.text());
  const edited = await edit.json();
  const response = await context.request.post(origin+recovery+'/activate',{headers,data:{
    cycleId:edited.cycleId,version:edited.plan.version
  }});
  assert.equal(response.status(),200,await response.text());
  return response.json();
}

function command(account, token, path, input, method = 'POST') {
  return account.request(path,{method,headers:{RequestVerificationToken:token,
    ...(input && {'Content-Type':'application/json'})},body:input && JSON.stringify(input)});
}

const communityApi = '/api/community';
const sqlAdmin = loginName => sql(`UPDATE iam.Person SET PlatformRole='Admin'
  WHERE NormalizedEmail=UPPER('${loginName}@example.test')`);
const communityToken = async account => (await saved(await account.request('/account/session'))).requestToken;
const institutionApi = '/api/institutions';
const institutionClaim = (name, number) => ({
  requestId:randomUUID(), declaration:true, audienceAges:['18–24'],
  fields:{entityName:name,institutionType:'School',sector:'Private',founded:'2001',registrationNumber:number,
    issuingAuthority:'School authority',description:'Learning and student support.',country:'JO',governorate:'Amman',
    city:'Amman',officialEmail:'office@example.test',phone:'065501001',representative:'Applicant Name',
    position:'Director',repPhone:'0795501001',authority:'head'}
});

test('Institution applications use one Identity with owner-only access and audited Admin review', async () => {
  const applicant=session(), other=session(), admin=session(), guest=session();
  await applicant.signIn('institution-applicant');
  await other.signIn('institution-other');
  await admin.signIn('institution-admin');
  await sqlAdmin('institution-admin');
  const [token,otherToken,adminToken] = await Promise.all([applicant,other,admin].map(communityToken));
  const submit = (account,csrf,body) => command(account,csrf,institutionApi+'/applications',body);
  const input=institutionClaim('Amman Learning School','S-100');
  assert.equal((await guest.request(institutionApi+'/applications')).status,401);
  assert.equal((await submit(applicant,token,{...input,declaration:false})).status,400);
  assert.equal((await applicant.request(institutionApi+'/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).status,400);
  const duplicates=await Promise.all([1,2].map(()=>submit(applicant,token,input).then(saved)));
  assert.equal(duplicates[0].id,duplicates[1].id);
  const first=duplicates[0], detail=institutionApi+'/applications/'+first.id;
  assert.equal(first.status,'Submitted');
  assert.equal((await submit(applicant,token,{...input,requestId:randomUUID()})).status,409);
  const second=await saved(await submit(other,otherToken,institutionClaim('Irbid Learning School','S-200')));
  assert.equal((await other.request(detail)).status,404);
  assert.equal((await applicant.request(institutionApi+'/applications/'+second.id)).status,404);
  assert.equal((await command(other,otherToken,detail,input,'PUT')).status,404);
  assert.equal((await applicant.request(institutionApi+'/verification')).status,403);
  assert.equal((await other.request(institutionApi+'/verification/'+first.id)).status,403);
  assert.deepEqual(await saved(await applicant.request(institutionApi+'/mine')),[]);
  const review = institutionApi+'/verification/'+first.id;
  const decide=(decision,version)=>command(admin,adminToken,review,{decision,version,reason:'Verification policy check.'});
  const pending = await saved(await admin.request(institutionApi+'/verification'));
  const pendingEntry = pending.items.find(row=>row.summary.id===first.id);
  assert.equal(pendingEntry.applicantName,'institution-applicant');
  assert.equal(pendingEntry.details.description,input.fields.description);
  assert.equal(pendingEntry.details.registrationNumber,undefined);
  assert.equal((await command(other,otherToken,review,{decision:'Rejected',version:first.version,reason:'Wrong actor.'})).status,403);
  assert.equal((await decide('Approved',first.version)).status,409);
  const asked=await saved(await decide('MoreInfo',first.version));
  assert.equal((await decide('MoreInfo',first.version)).status,409);
  const fresh=session();
  await fresh.signIn('institution-applicant',false);
  assert.equal((await saved(await fresh.request(detail))).summary.status,'MoreInfo');
  const revised={...input,requestId:randomUUID(),expectedVersion:asked.version,
    fields:{...input.fields,description:'Updated learning and student support.'}};
  const update=await saved(await command(fresh,await communityToken(fresh),detail,revised,'PUT'));
  assert.equal(update.status,'Submitted');
  assert.equal((await saved(await command(fresh,await communityToken(fresh),detail,revised,'PUT'))).version,update.version);
  assert.equal((await decide('Rejected',asked.version)).status,409);
  const rejected=await saved(await decide('Rejected',update.version));
  assert.equal((await decide('Rejected',rejected.version)).status,409);
  const savedReview = await saved(await admin.request(review));
  assert.deepEqual(savedReview.application.history.map(row=>row.afterStatus),['Submitted','MoreInfo','Submitted','Rejected']);
  assert.equal(savedReview.application.organizationStatus,'Closed');
  assert.equal(savedReview.application.history.at(-1).actor,'institution-admin');
  const applicantStatus = await saved(await fresh.request(detail));
  assert.equal(applicantStatus.summary.status,'Rejected');
  assert.equal(applicantStatus.history.at(-1).actor,'Platform Admin');
  assert.ok((await saved(await admin.request(institutionApi+'/verification?decided=true'))).items
    .some(row=>row.summary.id===first.id && row.summary.status==='Rejected'));
  assert.equal((await saved(await other.request(institutionApi+'/applications/'+second.id))).summary.status,'Submitted');
  assert.equal(await sql("SELECT COUNT(*) FROM iam.Person WHERE NormalizedEmail='INSTITUTION-APPLICANT@EXAMPLE.TEST'"),'1');
});

test('Representative profile checks confirmed Identity, verified Institution and current membership on every request', async () => {
  const one=session(), two=session();
  await one.signIn('institution-rep-one');
  await two.signIn('institution-rep-two');
  await sql(`INSERT org.Organization(Kind,Name,Status,CountryCode)
    VALUES('Institution','Verified North Fixture','Verified','JO'),('Institution','Verified South Fixture','Verified','JO');
    INSERT org.OrganizationMember(OrganizationId,PersonId,Status,GrantedByPersonId,GrantedAtUtc)
    SELECT o.Id,p.Id,'Active',(SELECT Id FROM iam.Person WHERE NormalizedEmail='INSTITUTION-ADMIN@EXAMPLE.TEST'),SYSUTCDATETIME()
    FROM org.Organization o JOIN iam.Person p ON
      (o.Name='Verified North Fixture' AND p.NormalizedEmail='INSTITUTION-REP-ONE@EXAMPLE.TEST') OR
      (o.Name='Verified South Fixture' AND p.NormalizedEmail='INSTITUTION-REP-TWO@EXAMPLE.TEST');`);
  assert.deepEqual(await saved(await one.request(institutionApi+'/mine')),[]);
  // Seed trusted, already-approved membership and confirmation in this disposable fixture only.
  await sql("UPDATE dbo.AspNetUsers SET EmailConfirmed=1 WHERE NormalizedEmail IN ('INSTITUTION-REP-ONE@EXAMPLE.TEST','INSTITUTION-REP-TWO@EXAMPLE.TEST')");
  const [north]=await saved(await one.request(institutionApi+'/mine'));
  const [south]=await saved(await two.request(institutionApi+'/mine'));
  assert.equal(north.name,'Verified North Fixture');
  assert.equal(south.name,'Verified South Fixture');
  assert.equal((await one.request(institutionApi+'/mine/'+south.id)).status,404);
  assert.equal((await two.request(institutionApi+'/mine/'+north.id)).status,404);
  await sql("UPDATE org.Organization SET Status='Suspended' WHERE Name='Verified North Fixture'");
  assert.equal((await one.request(institutionApi+'/mine/'+north.id)).status,404);
  assert.equal((await two.request(institutionApi+'/mine/'+south.id)).status,200);
  await sql("UPDATE org.OrganizationMember SET Status='Revoked',RevokedAtUtc=SYSUTCDATETIME() WHERE OrganizationId=(SELECT Id FROM org.Organization WHERE Name='Verified South Fixture')");
  assert.equal((await two.request(institutionApi+'/mine/'+south.id)).status,404);
  await sql("UPDATE iam.Person SET Status='Suspended' WHERE NormalizedEmail='INSTITUTION-REP-TWO@EXAMPLE.TEST'");
  assert.equal((await two.request(institutionApi+'/mine')).status,401);
});

test('Institution and Admin workspace screens save and reload live SQL application status', async () => {
  const browser=await chromium.launch({headless:true});
  try {
    const member=await browser.newContext({reducedMotion:'reduce'}), admin=await browser.newContext({reducedMotion:'reduce'});
    await registerBrowser(member,'North Applicant','institution-browser@example.test');
    await registerBrowser(admin,'Verification Admin','institution-browser-admin@example.test');
    await sqlAdmin('institution-browser-admin');
    const page=await member.newPage(), review=await admin.newPage();
    const guest=await browser.newPage({reducedMotion:'reduce'});
    await guest.goto(origin+register+'#partner');
    await guest.locator('[data-partner-path=organization]').click();
    await guest.waitForURL(url=>url.pathname===login);
    assert.equal(new URL(guest.url()).searchParams.get('returnUrl'),'/workspaces.html?partner=live');
    await page.goto(origin+'/partners.html');
    await page.getByRole('link',{name:'Register an Institution'}).click();
    const form=page.locator('[data-form=live-institution]');
    const {fields}=institutionClaim('Browser Learning School','S-300');
    for (const [name,value] of Object.entries(fields)) {
      const input=form.locator('[name='+name+']');
      if (['institutionType','sector','authority'].includes(name)) await input.selectOption(value);
      else await input.fill(value);
    }
    await form.getByText('18–24',{exact:true}).click();
    await form.getByRole('button',{name:'Review application'}).click();
    const dialog=page.locator('#workspace-dialog');
    await dialog.locator('[name=declare]').check();
    await dialog.getByRole('button',{name:'Submit application'}).click();
    await page.getByRole('heading',{name:'Browser Learning School'}).waitFor();
    await page.reload();
    await page.getByRole('heading',{name:'Browser Learning School'}).waitFor();
    await review.goto(origin+'/workspaces.html?community=live#/admin/organizations');
    const queueLink=review.getByRole('link',{name:'Browser Learning School'});
    await review.locator('.ad-request').filter({has:queueLink})
      .getByText('Learning and student support.',{exact:true}).waitFor();
    await queueLink.click();
    await review.getByRole('button',{name:'Ask for more information'}).click();
    const decision=review.locator('#workspace-dialog');
    await decision.locator('[name=reason]').fill('Explain who will operate the workspace.');
    await decision.getByRole('button',{name:'Save decision'}).click();
    await review.getByText('Explain who will operate the workspace.').waitFor();
    await page.reload();
    await page.getByText('Explain who will operate the workspace.').waitFor();
    await page.getByRole('link',{name:'Update application'}).waitFor();
    assert.equal(await page.getByText('Your Institutions',{exact:true}).count(),0);
    await page.evaluate(()=>localStorage.setItem('deepsprout-ecosystem-demo-v1',JSON.stringify({
      session:{personId:'fake-admin'},people:[{id:'fake-admin',workspaces:['admin']}]
    })));
    assert.equal((await page.request.get(origin+'/workspaces.html?community=live&demo=1#/admin/organizations')).status(),403);
    assert.equal((await page.request.get(origin+institutionApi+'/verification?demo=1')).status(),403);
  } finally { await browser.close(); }
});

async function submitAccount(account, path, fields) {
  const form = await (await account.request(path)).text();
  const token = form.match(/name="__RequestVerificationToken"[^>]+value="([^"]+)"/)?.[1];
  assert.ok(token);
  return account.request(path, {method:'POST', body:new URLSearchParams({
    __RequestVerificationToken:token, ...fields
  })});
}

test('Identity handles duplicate registration, bad credentials, lockout and safe return URLs', async () => {
  const owner = session();
  const email = 'account-lifecycle@example.test';
  const fields = {DisplayName:'Lifecycle Owner',Email:email,Password:password,ConfirmPassword:password,
    AcceptTerms:'true',PlatformRole:'Admin'};
  const created = await submitAccount(owner,register,fields);
  assert.equal(created.status,302);
  assert.equal((await owner.request('/admin.html')).status,403);
  const duplicate = await submitAccount(session(),register,{...fields,Email:email.toUpperCase()});
  assert.match(await duplicate.text(),/already uses this email/);
  assert.equal(await sql("SELECT COUNT(*) FROM iam.Person WHERE NormalizedEmail='ACCOUNT-LIFECYCLE@EXAMPLE.TEST'"),'1');
  const other = session();
  await other.signIn('account-isolated');
  assert.match(await (await other.request('/account/profile?email='+email)).text(),/account-isolated/);
  const attacker = session();
  for (let i=0;i<5;i++) {
    const bad = await submitAccount(attacker,login,{Email:email,Password:'Wrong-password-123!'});
    assert.match(await bad.text(),/Invalid email or password/);
    assert.equal(attacker.authCookie(),undefined);
  }
  assert.equal((await submitAccount(attacker,login,{Email:email,Password:password})).status,200);
  await sql("UPDATE dbo.AspNetUsers SET LockoutEnd=NULL WHERE NormalizedEmail='ACCOUNT-LIFECYCLE@EXAMPLE.TEST'");
  const fresh = session();
  const response = await submitAccount(fresh,login,{Email:email,Password:password,ReturnUrl:'//example.test/private'});
  assert.equal(response.headers.get('location'),onboarding);
  assert.equal((await fresh.request('/account/profile')).status,200);
});

test('Logout revokes copied sessions and JWT expiration denies a correctly signed expired session', async () => {
  const owner = session(), second = session();
  await owner.signIn('account-signout');
  await second.signIn('account-signout',false);
  const originalCookie = second.authCookie();
  const [header,encoded] = originalCookie.split('=')[1].split('.');
  const payload = JSON.parse(Buffer.from(encoded,'base64url'));
  // Sign only with the key generated by this disposable test host.
  payload.exp = Math.floor(Date.now()/1000)-90;
  payload.nbf = payload.exp-120;
  payload.iat = payload.nbf;
  const body = header+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', signingKey).update(body).digest('base64url');
  assert.equal((await session().request(setup,{headers:{Cookie:'DeepSproutAuth='+body+'.'+signature}})).status,401);
  assert.equal((await owner.request('/account/logout',{method:'POST'})).status,400);
  const token = await communityToken(owner);
  assert.equal((await command(owner,token,'/account/logout')).status,302);
  assert.equal((await owner.request(setup)).status,401);
  assert.equal((await second.request(setup)).status,401);
  assert.equal((await session().request(setup,{headers:{Cookie:originalCookie}})).status,401);
  await second.signIn('account-signout',false);
  assert.equal((await second.request(setup)).status,200);
});

test('Platform Admin entry, revocation and suspension use SQL authority and keep an audit', async () => {
  const guest = session(), admin = session(), member = session();
  await admin.signIn('lifecycle-admin');
  await sqlAdmin('lifecycle-admin');
  await member.signIn('lifecycle-target');
  const id = await sql("SELECT CONVERT(nvarchar(36),PublicId) FROM iam.Person WHERE NormalizedEmail='LIFECYCLE-TARGET@EXAMPLE.TEST'");
  const base = '/api/admin/accounts/'+id+'/';
  assert.equal((await guest.request('/admin.html')).status,302);
  assert.equal((await guest.request(base+'suspend',{method:'POST'})).status,401);
  assert.equal((await member.request('/admin.html')).status,403);
  assert.equal((await member.request('/workspaces.html?community=live&admin=true')).status,403);
  assert.equal((await admin.request('/admin.html')).headers.get('location'),'/workspaces.html?community=live#/admin/moderation');
  assert.equal((await admin.request('/workspaces.html?community=live')).status,200);
  assert.equal(await session().signIn('lifecycle-admin',false),'/admin.html');
  const token = await communityToken(admin);
  const act = (verb, reason='Testing account access.') => command(admin,token,base+verb,{reason});
  assert.equal((await command(member,await communityToken(member),base+'suspend',{reason:'Not allowed.'})).status,403);
  assert.equal((await act('suspend',' ')).status,400);
  assert.equal((await act('revoke-sessions')).status,204);
  assert.equal((await member.request(setup)).status,401);
  await member.signIn('lifecycle-target',false);
  assert.equal((await act('suspend')).status,204);
  assert.equal((await act('suspend')).status,204);
  assert.equal((await member.request(setup)).status,401);
  const failed = await submitAccount(session(),login,{Email:'lifecycle-target@example.test',Password:password});
  assert.match(await failed.text(),/Invalid email or password/);
  assert.equal((await act('restore')).status,204);
  assert.equal((await member.request(setup)).status,401);
  await member.signIn('lifecycle-target',false);
  assert.equal((await member.request(setup)).status,200);
  assert.equal(await sql("SELECT COUNT(*) FROM ops.AuditEvent WHERE ResourceKind='iam.Person' AND ResourceId=(SELECT Id FROM iam.Person WHERE NormalizedEmail='LIFECYCLE-TARGET@EXAMPLE.TEST')"),'3');
  await sql("UPDATE iam.Person SET PlatformRole=NULL WHERE NormalizedEmail='LIFECYCLE-ADMIN@EXAMPLE.TEST'");
  assert.equal((await admin.request('/workspaces.html?community=live')).status,403);
  assert.equal((await admin.request('/api/community/moderation')).status,403);
  assert.equal((await act('suspend')).status,403);
});

test('Community owner revisions, approvals and withdrawal are isolated and preserve SQL audit history', async () => {
  const owner = session(), member = session(), admin = session(), guest = session();
  await owner.signIn('community-owner');
  await member.signIn('community-reader');
  await admin.signIn('community-admin');
  await sqlAdmin('community-admin');
  const [ownerToken, memberToken, adminToken] = await Promise.all([owner,member,admin].map(communityToken));
  const post = {category:'progress', title:'Community lifecycle', message:'A walk after work.', requestId:randomUUID()};
  assert.equal((await guest.request(communityApi+'/posts')).status,401);
  assert.equal((await owner.request(communityApi+'/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(post)})).status,400);
  assert.equal((await command(owner,ownerToken,communityApi+'/posts',{...post,title:'one\ntwo'})).status,400);
  const creates = await Promise.all([1,2].map(() => command(owner,ownerToken,communityApi+'/posts',post)));
  assert.deepEqual(creates.map(response=>response.status).sort(),[200,201],await creates[0].clone().text());
  const [first, retry] = await Promise.all(creates.map(response=>response.json()));
  assert.equal(first.id,retry.id);
  assert.equal((await command(owner,ownerToken,communityApi+'/posts',{...post,requestId:randomUUID()})).status,429);
  const path = communityApi+'/posts/'+first.id, moderation = communityApi+'/moderation/posts/'+first.id;
  const adminDecision = (status, expectedRevision, reportId) => command(admin,adminToken,moderation,
    {status,expectedRevision,reportId,reason:'Review of saved content.'},'PATCH');
  const own = await saved(await owner.request(path));
  assert.equal(own.author,'community-owner');
  assert.equal(own.status,'Draft');
  assert.equal(own.canEdit,true);
  assert.equal((await member.request(path)).status,404);
  assert.equal((await saved(await member.request(communityApi+'/posts?mine=true&personId=1'))).posts.length,0);
  assert.equal((await member.request(communityApi+'/moderation')).status,403);
  assert.equal((await command(member,memberToken,moderation,{status:'Published',reason:'Unauthorized'},'PATCH')).status,403);
  assert.equal((await command(member,memberToken,path,post,'PATCH')).status,404);
  assert.equal((await command(member,memberToken,path,null,'DELETE')).status,404);
  const original = (await saved(await admin.request(moderation))).posts[0];
  assert.equal((await adminDecision('Hidden',original.revision)).status,409);
  const changed = {...post,title:'Community lifecycle revised',message:'A longer walk after work.'};
  assert.equal((await command(owner,ownerToken,path,changed,'PATCH')).status,204);
  assert.equal((await adminDecision('Published',original.revision)).status,409);
  const reviewed = (await saved(await admin.request(moderation))).posts[0];
  assert.equal((await adminDecision('Published',reviewed.revision)).status,204);
  const published = await saved(await member.request(path));
  assert.equal(published.title,changed.title);
  assert.equal(published.own,false);
  assert.equal(published.createdAt,own.createdAt);
  assert.ok(published.publishedAt.endsWith('Z'));
  const matches = await saved(await member.request(communityApi+'/posts?category=progress&search=longer%20walk'));
  assert.equal(matches.posts[0].id,first.id);
  assert.equal((await command(owner,ownerToken,path,{...changed,message:'Edited after approval.'},'PATCH')).status,204);
  assert.equal((await member.request(path)).status,404);
  assert.equal((await adminDecision('Published')).status,204);
  assert.equal((await saved(await member.request(path))).publishedAt,published.publishedAt);
  assert.equal((await command(owner,ownerToken,path,null,'DELETE')).status,204);
  assert.equal((await command(owner,ownerToken,path,null,'DELETE')).status,204);
  assert.equal((await adminDecision('Published')).status,409);
  assert.equal((await member.request(path)).status,404);
  const again = session();
  await again.signIn('community-owner',false);
  assert.equal((await saved(await again.request(path))).status,'Removed');
  const {history} = await saved(await admin.request(moderation));
  assert.deepEqual(history.map(row=>row.action),['Withdraw','Moderate','Edit','Moderate','Edit']);
  assert.equal(history[0].actor,'community-owner');
});

test('Community comments, reports and reactions require a published target and keep each member’s state separate', async () => {
  const writer = session(), reader = session(), admin = session();
  await writer.signIn('community-author');
  await reader.signIn('community-participant');
  await admin.signIn('community-admin',false);
  const [writerToken, readerToken, adminToken] = await Promise.all([writer,reader,admin].map(communityToken));
  const created = await command(writer,writerToken,communityApi+'/posts',
    {category:'tips',title:'Community source records',message:'This post has a conversation.'});
  assert.equal(created.status,201,await created.clone().text());
  const {id} = await created.json();
  const path = communityApi+'/posts/'+id, moderatePath = communityApi+'/moderation/posts/'+id;
  const decide = (route, status, reportId) => command(admin,adminToken,route,{status,reportId,reason:'Evidence checked.'},'PATCH');
  assert.equal((await command(reader,readerToken,path+'/comments',{body:'Draft cannot be commented on.'})).status,404);
  assert.equal((await decide(moderatePath,'Published')).status,204);
  assert.equal((await command(reader,readerToken,path+'/comments',{body:' '.repeat(30)})).status,400);
  const answer = {body:'A real reply.',requestId:randomUUID()};
  const replies = await Promise.all([1,2].map(()=>command(reader,readerToken,path+'/comments',answer).then(saved)));
  assert.deepEqual(replies[0],replies[1]);
  const second = await saved(await command(writer,writerToken,path+'/comments',{body:'A second reply.'}));
  const batch = await saved(await reader.request(path+'/comments?limit=1'));
  assert.equal(batch.comments[0].own,true);
  assert.equal(batch.comments[0].author,'community-participant');
  assert.equal((await saved(await reader.request(path+'/comments?limit=1&after='+batch.next))).comments[0].id,second.id);
  for (const kind of ['like','bookmark']) {
    const reactions = await Promise.all([1,2].map(()=>command(reader,readerToken,path+'/interactions/'+kind,null,'PUT')));
    assert.ok(reactions.every(response=>response.status===204));
  }
  const view = await saved(await writer.request(path));
  assert.deepEqual([view.likes,view.comments,view.liked,view.saved],[1,2,false,false]);
  const fresh = session();
  await fresh.signIn('community-participant',false);
  const linked = await saved(await fresh.request(path));
  assert.deepEqual([linked.liked,linked.saved],[true,true]);

  const report = {reason:'Privacy concern',details:'Please check the text.'};
  const commentPath = communityApi+'/comments/'+replies[0].id;
  assert.equal((await command(reader,readerToken,commentPath+'/reports',report)).status,400);
  const reports = await Promise.all([1,2].map(()=>command(writer,writerToken,commentPath+'/reports',report)));
  assert.deepEqual(reports.map(response=>response.status).sort(),[202,409]);
  assert.equal((await command(reader,readerToken,path+'/reports',report)).status,202);
  const queue = await saved(await admin.request(communityApi+'/moderation?view=reports'));
  const replyReport = queue.reports.find(row=>row.commentId===replies[0].id);
  const postReport = queue.reports.find(row=>row.postId===id && row.commentId===null);
  assert.equal(replyReport.commentBody,answer.body);
  assert.equal(replyReport.post.title,'Community source records');
  assert.equal((await decide(moderatePath,'Hidden',replyReport.id)).status,409);
  const modComment = communityApi+'/moderation/comments/'+replies[0].id;
  const decisions = await Promise.all([1,2].map(()=>decide(modComment,'Hidden',replyReport.id)));
  assert.deepEqual(decisions.map(response=>response.status).sort(),[204,409]);
  assert.equal((await saved(await writer.request(path))).comments,1);
  assert.equal((await decide(modComment,'Published')).status,204);
  assert.equal((await saved(await writer.request(path))).comments,2);
  const reviewed = await saved(await admin.request(communityApi+'/moderation/reports/'+replyReport.id));
  assert.equal(reviewed.reports[0].resolution,'Hide');
  assert.equal(reviewed.history.filter(row=>row.status==='Hidden').length,1);
  assert.equal((await decide(moderatePath,'Hidden',postReport.id)).status,204);
  assert.equal((await reader.request(path)).status,404);
  assert.equal((await reader.request(path+'/comments')).status,404);
  assert.equal((await command(reader,readerToken,path+'/interactions/like',null,'PUT')).status,404);
  assert.equal((await decide(moderatePath,'Published')).status,204);
  assert.equal((await command(reader,readerToken,path+'/interactions/like',null,'DELETE')).status,204);
  const restored = await saved(await reader.request(path));
  assert.deepEqual([restored.likes,restored.comments,restored.saved],[0,2,true]);
});

test('Community feed pagination includes posts sharing a SQL publication timestamp', async () => {
  const reader = session();
  await reader.signIn('community-reader',false);
  await sql(`DECLARE @at datetime2(3)=SYSUTCDATETIME();
    INSERT community.Post(AuthorPersonId,TopicCode,Body,Status,PublishedAtUtc)
    SELECT p.Id,'wins',samples.Title,'Published',@at FROM iam.Person p
    CROSS JOIN (VALUES('Pagination garden A'),('Pagination garden B'),('Pagination garden C')) samples(Title)
    WHERE p.NormalizedEmail='COMMUNITY-OWNER@EXAMPLE.TEST';`);
  const seen = [];
  const query = new URLSearchParams({search:'Pagination garden',category:'wins',limit:'1'});
  const {next: firstCursor} = await saved(await reader.request(communityApi+'/posts?'+query));
  const privateCursor = await sql(`INSERT community.Post(AuthorPersonId,TopicCode,Body,Status)
    OUTPUT CONVERT(nvarchar(36),inserted.PublicId)
    SELECT Id,'wins','Private cursor','Draft' FROM iam.Person WHERE NormalizedEmail='COMMUNITY-OWNER@EXAMPLE.TEST';`);
  assert.equal((await reader.request(communityApi+'/posts/'+privateCursor)).status,404);
  const invalidPage = await saved(await reader.request(communityApi+'/posts?'+new URLSearchParams({
    ...Object.fromEntries(query), before: firstCursor.before, beforeId:privateCursor
  })));
  assert.deepEqual(invalidPage.posts,[]);
  let page;
  do {
    page = await saved(await reader.request(communityApi+'/posts?'+query));
    seen.push(...page.posts.map(row=>row.title));
    if (page.next) for (const [key,value] of Object.entries(page.next)) query.set(key,value);
  } while (page.next && seen.length <= 3);
  assert.deepEqual([...seen].sort(),['Pagination garden A','Pagination garden B','Pagination garden C']);
});

test('Community Member and Admin pages share SQL content and moderation, with quiz rooms kept in the browser', async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const memberContext = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const adminContext = await browser.newContext({reducedMotion:'reduce'});
    const readerContext = await browser.newContext({reducedMotion:'reduce'});
    await registerBrowser(memberContext,'Community Browser','community-browser@example.test');
    await registerBrowser(adminContext,'Admin Browser','community-browser-admin@example.test');
    await registerBrowser(readerContext,'Reader Browser','community-browser-reader@example.test');
    await sqlAdmin('community-browser-admin');
    await memberContext.addInitScript(() => {
      localStorage.setItem('deepsprout-community-demo-v1', JSON.stringify({posts:[
        {id:'browser-only',title:'Demo content stored on this device',message:'Sample',category:'tips'}
      ]}));
    });
    const member = await memberContext.newPage(), reader = await readerContext.newPage(), admin = await adminContext.newPage();
    const errors = [];
    for (const page of [member,reader,admin]) page.on('pageerror',error=>errors.push(error.message));
    const url = origin+'/src/pages/member/community/community.html';
    await member.goto(url);
    await member.getByRole('button',{name:'New Post'}).click();
    const form = member.locator('#compose-form');
    await form.locator('[name=title]').fill('Browser community workflow');
    const body = '<strong data-test-unsafe="true">Support others</strong>';
    await form.locator('[name=message]').fill(body);
    await form.getByRole('button',{name:'Share post'}).click();
    const memberPost = member.locator('.post-card').filter({hasText:'Browser community workflow'});
    await memberPost.getByText('Awaiting approval').waitFor();
    assert.equal(await member.locator('.post-card [data-test-unsafe]').count(),0);
    assert.equal(await member.getByText('Demo content stored on this device').count(),0);
    assert.equal(await member.getByText('Completed my first week of the Roadmap!').count(),0);
    const id = await memberPost.getAttribute('data-id');
    await memberPost.getByRole('button',{name:'More options for post'}).click();
    await memberPost.getByRole('button',{name:'Edit post'}).click();
    await form.locator('[name=message]').fill(body+' Edited draft.');
    await form.getByRole('button',{name:'Save changes'}).click();
    await memberPost.getByText('Edited draft.',{exact:false}).waitFor();
    await reader.goto(url);
    await reader.locator('#post-search').fill('Browser community workflow');
    await reader.locator('#empty-text').getByText('No posts match').waitFor();
    assert.equal(await reader.getByText('Browser community workflow').count(),0);

    await admin.goto(origin+'/admin.html#/community');
    await admin.getByRole('link',{name:'Waiting for approval'}).click();
    const adminPost = admin.locator('.ad-report').filter({hasText:'Browser community workflow'});
    await adminPost.getByText('Community Browser').waitFor();
    assert.equal(await admin.locator('[data-test-unsafe]').count(),0);
    await adminPost.getByRole('button',{name:'Approve'}).click();
    let dialog = admin.locator('#workspace-dialog');
    await dialog.locator('[name=reason]').fill('Approved from Admin browser');
    await dialog.getByRole('button',{name:'Approve',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    await reader.reload();
    const visible = reader.locator('.post-card').filter({hasText:'Browser community workflow'});
    await visible.getByText(body+' Edited draft.',{exact:true}).waitFor();
    await visible.getByRole('button',{name:'Like post'}).click();
    await visible.locator('.like-button[aria-pressed=true]').waitFor();
    await visible.getByRole('button',{name:'Show comments'}).click();
    await visible.getByRole('textbox',{name:'Write a comment'}).fill('A persisted reply.');
    await visible.locator('.comment-form').getByRole('button',{name:'Post'}).click();
    await visible.getByText('Reader Browser: A persisted reply.').waitFor();
    await visible.getByRole('button',{name:'More options for post'}).click();
    await visible.getByRole('button',{name:'Report to moderation'}).click();
    await reader.locator('#report-dialog [name=detail]').fill('Please review this post.');
    await reader.getByRole('button',{name:'Send report'}).click();
    await reader.locator('#toast').getByText('Report sent to Admin for review.').waitFor();

    await admin.getByRole('link',{name:'Reports',exact:true}).click();
    const reported = admin.locator('.ad-report').filter({hasText:'Browser community workflow'});
    await reported.getByRole('button',{name:'Hide post'}).click();
    dialog = admin.locator('#workspace-dialog');
    await dialog.locator('[name=reason]').fill('Hidden from Admin browser');
    await dialog.getByRole('button',{name:'Hide post',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    await reader.reload();
    await reader.locator('#post-search').fill('Browser community workflow');
    await reader.locator('#empty-text').getByText('No posts match').waitFor();
    assert.equal(await visible.count(),0);
    await member.reload();
    await member.getByRole('button',{name:'My posts'}).click();
    await memberPost.getByText('Hidden by moderation').waitFor();
    await admin.getByRole('link',{name:'Decision history'}).click();
    await admin.getByText('Hidden from Admin browser').waitFor();
    await reader.goto(origin+'/workspaces.html#/admin/moderation');
    await reader.getByRole('heading',{name:'Platform Admin access is required.'}).waitFor();
    await reader.goto(url+'#'+id);
    await reader.locator('#toast').getByText('This content is no longer available.').waitFor();

    await member.route('**/api/community/posts?**', route => route.fulfill({status:503,body:'Unavailable'}));
    await member.reload();
    await member.getByText('Community could not complete this request.',{exact:false}).waitFor();
    assert.equal(await member.locator('.post-card').count(),0);
    await member.getByRole('button',{name:'Create a challenge',exact:true}).filter({visible:true}).click();
    const challenge = member.locator('#challenge-form');
    await challenge.locator('[name=title]').fill('Local quiz only');
    await challenge.getByRole('button',{name:'Create room'}).click();
    await member.locator('#challenge-board').getByRole('heading',{name:'Local quiz only'}).waitFor();
    const posts = await memberContext.request.get(origin+communityApi+'/posts?search=Local%20quiz%20only');
    assert.equal((await posts.json()).posts.length,0);
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
  }
});

test('Recovery preview needs the authenticated person’s six saved answers and never activates implicitly', async () => {
  const guest = session();
  assert.equal((await guest.request(recovery)).status, 401);
  assert.equal((await guest.request(recovery + '/activate', {method:'POST'})).status, 401);
  const prep = session();
  await prep.signIn('recovery-preview');
  assert.equal((await prep.request(recovery)).status, 404);
  const setupAnswers = {...answers,change:'offline-time',apps:['instagram','other'],dailyScroll:'unsure',
    moments:'bored',makeTimeFor:['drawing-creativity'],dailyMinutes:'20'};
  await finishSetup(prep, setupAnswers);
  const results = await Promise.all([prep.request(recovery),prep.request(recovery)]);
  const [state, same] = await Promise.all(results.map(saved));
  assert.equal(state.cycleId, same.cycleId);
  assert.equal(state.status, 'Preview');
  assert.equal(state.canEdit, true);
  assert.deepEqual(state.plan.setup, setupAnswers);
  assert.equal(state.plan.cycleDays, 28);
  assert.deepEqual(state.plan.weeks.map(week=>week.detailed), [true,false,false,false]);
  assert.equal(state.plan.weekOne.length, 7);
  assert.equal(state.plan.preferences.goal, 'offline-time');
  assert.equal(state.plan.preferences.minutes, 20);
  assert.deepEqual(state.plan.preferences.activityTypes,['listening','visual-observation']);
  assert.match(state.plan.suggestedRoutine.title,/20 minutes of drawing/);
  assert.equal(state.plan.preferences.routine,null);
  assert.equal(state.activatedAtUtc, null);
  assert.deepEqual(state.actions, []);
  assert.deepEqual(state.routines, []);
  assert.match(await sql(`SELECT c.Status,r.Status,COUNT(a.Id) FROM recovery.RecoveryCycle c
    JOIN recovery.PlanRevision r ON r.CycleId=c.Id LEFT JOIN recovery.ScheduledAction a ON a.CycleId=c.Id
    WHERE c.PublicId='${state.cycleId}' GROUP BY c.Status,r.Status`), /Preview\s+Draft\s+0/);
  assert.equal((await prep.request(recovery + '/activate', {method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({cycleId:state.cycleId,version:state.plan.version})})).status,400);
  assert.equal((await writePlan(prep,state)).status,400);

  await prep.read();
  await saved(await prep.save('dailyMinutes','15'));
  assert.equal((await writePlan(prep,state,state.plan.preferences)).status,409);
  const refreshed = await saved(await prep.request(recovery));
  assert.equal(refreshed.cycleId,state.cycleId);
  assert.equal(refreshed.plan.preferences.minutes,15);
  assert.equal(refreshed.plan.version,state.plan.version+1);
});

test('Recovery activation is atomic, retryable, isolated, and preserves the original schedule and history', async () => {
  const owner = session(), other = session();
  await owner.signIn('recovery-owner');
  await other.signIn('recovery-other');
  await Promise.all([finishSetup(owner),finishSetup(other,{...answers,change:'focus-objective'})]);
  const [original, separate] = await Promise.all([owner.request(recovery).then(saved),other.request(recovery).then(saved)]);
  assert.notEqual(original.cycleId,separate.cycleId);
  assert.equal(separate.plan.preferences.goal,'focus-objective');
  const prefs = {goal:'intentional-phone',minutes:15,activityTypes:['digital-judgment','visual-observation'],
    practiceDays:[6,2,0],routine:{title:' Read on paper ',minutes:12,days:[2,4]}};
  for (const input of [{...prefs,activityTypes:['unknown']},{...prefs,practiceDays:[1,1]},
    {...prefs,minutes:100},{...prefs,routine:{title:' ',minutes:12,days:[1]}}])
    assert.equal((await writePlan(owner,original,input)).status,400);
  assert.equal((await writePlan(owner,original,prefs,{personId:42})).status,400);
  assert.equal((await writePlan(other,{...original,requestToken:separate.requestToken},prefs)).status,409);
  assert.equal((await writePlan(other,{...original,requestToken:separate.requestToken})).status,409);
  const edited = await saved(await writePlan(owner,original,prefs));
  assert.equal(edited.status,'Preview');
  assert.deepEqual(edited.actions,[]);
  assert.deepEqual(edited.plan.preferences.practiceDays,[0,2,6]);
  assert.equal(edited.plan.preferences.routine.title,'Read on paper');
  assert.deepEqual(edited.plan.weekOne.filter(day=>day.activityType).map(day=>[day.offset,day.activityType]),
    [[0,'digital-judgment'],[2,'visual-observation'],[6,'digital-judgment']]);
  assert.equal((await writePlan(owner,original)).status,409);
  const persisted = await saved(await owner.request(recovery));
  assert.deepEqual(persisted.plan,edited.plan);
  const requests = await Promise.all(Array.from({length:4},()=>writePlan(owner,persisted).then(saved)));
  const active = requests[0];
  assert.ok(requests.every(state=>JSON.stringify(state)===JSON.stringify(active)));
  assert.equal(active.status,'Active');
  assert.ok(active.activatedAtUtc);
  assert.equal(active.canEdit,false);
  assert.equal((new Date(active.endsOn)-new Date(active.startsOn))/86400000,27);
  assert.ok(active.actions.every(action=>(new Date(action.date)-new Date(active.startsOn))/86400000<7));
  assert.equal(active.actions.filter(action=>action.kind==='Practice').length,3);
  assert.equal(new Set(active.actions.filter(action=>action.kind==='Practice').map(action=>action.activityCode)).size,3);
  assert.equal(active.actions.filter(action=>action.kind==='Routine').length,2);
  assert.equal(active.actions.filter(action=>action.kind==='WeeklyReview').length,1);
  assert.equal(active.routines[0].title,'Read on paper');
  assert.equal(active.routines[0].schedule.minutes,12);
  assert.equal(await sql(`SELECT COUNT(*) FROM recovery.ScheduledAction a JOIN recovery.RecoveryCycle c ON a.CycleId=c.Id WHERE c.PublicId='${active.cycleId}'`),'6');
  assert.equal(await sql(`SELECT COUNT(*) FROM ops.AuditEvent e JOIN recovery.RecoveryCycle c ON c.Id=e.ResourceId
    WHERE c.PublicId='${active.cycleId}' AND e.ResourceKind='RecoveryCycle' AND e.Action='RecoveryPlanActivated'`),'1');
  assert.match(await sql(`SELECT c.Status,r.Status,p.OnboardingStage,p.JourneyLevel FROM recovery.RecoveryCycle c
    JOIN recovery.PlanRevision r ON r.CycleId=c.Id JOIN personal.IndividualProfile p ON p.PersonId=c.PersonId
    WHERE c.PublicId='${active.cycleId}' AND r.AcceptedAtUtc IS NOT NULL AND c.ActivatedAtUtc IS NOT NULL`), /Active\s+Accepted\s+Activated\s+1/);
  assert.equal(await sql(`SELECT COUNT(*) FROM lab.AssessmentAttempt WHERE PersonId=(SELECT PersonId FROM recovery.RecoveryCycle WHERE PublicId='${active.cycleId}')`),'0');

  const otherNow = await saved(await other.request(recovery));
  assert.equal(otherNow.status,'Preview');
  assert.deepEqual(otherNow.actions,[]);
  const otherDraft = await saved(await writePlan(other,otherNow,{...prefs,activityTypes:['depth','digital-judgment']}));
  const blockedCode = active.actions.find(action=>action.activityType==='digital-judgment').activityCode;
  await sql(`UPDATE activity.PracticeDefinition SET Status='Deprecated' WHERE Code='${blockedCode}'`);
  try {
    assert.equal((await writePlan(other,{...otherDraft,requestToken:otherNow.requestToken})).status,409);
    const afterFailure = await saved(await other.request(recovery));
    assert.equal(afterFailure.status,'Preview');
    assert.deepEqual(afterFailure.actions,[]);
    assert.deepEqual(afterFailure.routines,[]);
    assert.equal(await sql("SELECT COUNT(*) FROM activity.PracticeDefinition WHERE Code='practice-depth-l1-a'"),'0');
  } finally {
    await sql(`UPDATE activity.PracticeDefinition SET Status='Published' WHERE Code='${blockedCode}'`);
  }
  const freshLogin = session();
  await freshLogin.signIn('recovery-owner', false);
  const reloaded = await saved(await freshLogin.request(recovery));
  assert.deepEqual(reloaded.actions,active.actions);
  assert.deepEqual(reloaded.plan,active.plan);
  const completeId = active.actions.find(action=>action.kind==='Practice').id;
  await sql(`UPDATE a SET Status='Completed' FROM recovery.ScheduledAction a JOIN recovery.RecoveryCycle c ON a.CycleId=c.Id
    WHERE c.PublicId='${active.cycleId}' AND CONCAT('sql-action-',a.Id)='${completeId}'`);
  assert.equal((await writePlan(freshLogin,reloaded,{...prefs,minutes:5})).status,409);
  const retained = await saved(await writePlan(freshLogin,reloaded));
  assert.equal(retained.actions.find(action=>action.id===completeId).status,'Completed');
  assert.deepEqual(retained.plan,active.plan);
  await freshLogin.read();
  await saved(await freshLogin.save('change','offline-time'));
  assert.deepEqual((await saved(await freshLogin.request(recovery))).plan,active.plan);
  await sql(`UPDATE recovery.RecoveryCycle SET Status='Ended',EndedAtUtc=SYSUTCDATETIME() WHERE PublicId='${active.cycleId}'`);
  const ended = await saved(await freshLogin.request(recovery));
  assert.equal(ended.cycleId,active.cycleId);
  assert.equal(ended.status,'Ended');
  assert.deepEqual(ended.actions,retained.actions);
});

test('MVC smoke runs against the disposable V5 host', async () => {
  await run(process.execPath, ['tests/mvc-smoke.mjs'], {cwd:root, env:{...process.env, BASE_URL:origin}, timeout:60_000});
});

test('scheduled Depth Practice resumes across sessions and scores the pinned version once', async () => {
  const owner = session(), other = session(), anonymous = session();
  await owner.signIn('scheduled-depth');
  await other.signIn('scheduled-depth-other');
  await Promise.all([finishSetup(owner), finishSetup(other)]);
  const preview = await saved(await owner.request(recovery));
  const prefs = {...preview.plan.preferences, activityTypes:['depth'], practiceDays:[0,2],
    routine:{title:'Read on paper',minutes:5,days:[0]}};
  const edited = await saved(await writePlan(owner,preview,prefs));
  const active = await saved(await writePlan(owner,{...edited,requestToken:preview.requestToken}));
  const [first,future] = active.actions.filter(action=>action.kind==='Practice');
  const path = action => '/api/activities/depth/' + action.id.replace('sql-action-','') + '/attempt';
  const request = (account, token, action=first, suffix='', body, method='POST') =>
    account.request(path(action)+suffix,{method,headers:{RequestVerificationToken:token,
      ...(body && {'Content-Type':'application/json'})},body:body && JSON.stringify(body)});
  assert.equal((await anonymous.request(path(first))).status,401);
  const otherState = await saved(await other.request(recovery));
  assert.equal((await other.request(path(first))).status,404);
  assert.equal((await request(other,otherState.requestToken)).status,404);
  assert.equal((await owner.request(path(first),{method:'POST'})).status,400);
  assert.equal((await request(owner,preview.requestToken,future)).status,409);
  const started = await saved(await request(owner,preview.requestToken));
  assert.equal(started.status,'Started');
  assert.equal(started.questions.length,4);
  assert.ok(started.questions.every(question=>!('answer' in question)));
  assert.equal(started.contentVersion,'practice-depth-l1-a-text-1');
  assert.equal((await request(owner,preview.requestToken,first,'/submit',{answers:[0,1,2],score:1})).status,400);
  assert.equal((await request(owner,preview.requestToken,first,'/submit',{answers:[0,1,2,5]})).status,400);
  assert.equal((await request(owner,preview.requestToken,first,'/submit',{answers:[0,1,2,null]})).status,400);
  assert.equal((await request(owner,preview.requestToken,first,'/submit',{answers:[0,1,2]})).status,400);
  const draft = await saved(await request(owner,preview.requestToken,first,'/answers',{answers:[0,null,2,null]},'PUT'));
  assert.deepEqual(draft.answers,[0,null,2,null]);
  assert.equal((await saved(await request(owner,preview.requestToken,first,'/pause'))).status,'Paused');
  const fresh = session();
  await fresh.signIn('scheduled-depth',false);
  const reloaded = await saved(await fresh.request(recovery));
  assert.deepEqual((await saved(await fresh.request(path(first)))).answers,draft.answers);
  assert.equal((await request(fresh,reloaded.requestToken,first,'/submit',{answers:[0,1,2,3]})).status,409);
  assert.equal((await saved(await request(fresh,reloaded.requestToken))).attemptId,started.attemptId);
  const concurrent = await Promise.all(Array.from({length:3},()=>request(fresh,reloaded.requestToken,first,'/submit',{answers:[0,1,2,0]}).then(saved)));
  assert.ok(concurrent.every(item=>item.attemptId===started.attemptId && item.result.id===concurrent[0].result.id));
  const result = concurrent[0].result;
  assert.equal(result.score,.75);
  assert.equal(result.correctCount,3);
  assert.equal(result.rewardEligible,true);
  assert.equal(result.progressionEligible,true);
  const persisted = await saved(await fresh.request(recovery));
  const completed = persisted.actions.find(action=>action.id===first.id);
  assert.equal(completed.status,'Completed');
  assert.deepEqual(completed.result,result);
  assert.equal(await sql(`SELECT COUNT(*) FROM activity.PracticeAttempt p JOIN recovery.ScheduledAction a
    ON p.ScheduledActionId=a.Id WHERE CONCAT('sql-action-',a.Id)='${first.id}'`),'1');
  assert.match(await sql(`SELECT p.Status,p.ScoreValue,p.OutcomeCode,p.Valid FROM activity.PracticeAttempt p
    JOIN recovery.ScheduledAction a ON a.CompletedAttemptId=p.Id WHERE CONCAT('sql-action-',a.Id)='${first.id}'`),
    /Completed\s+0?\.7500\s+DepthScoredReward\s+1/);
  assert.equal((await other.request(path(first))).status,404);

  // A separate due record for the same version must not earn a second reward.
  await sql(`UPDATE later SET PracticeVersionId=finished.PracticeVersionId,LocalDate=finished.LocalDate
    FROM recovery.ScheduledAction later CROSS JOIN recovery.ScheduledAction finished
    WHERE CONCAT('sql-action-',later.Id)='${future.id}' AND CONCAT('sql-action-',finished.Id)='${first.id}'`);
  await saved(await request(fresh,reloaded.requestToken,future));
  const repeated = await saved(await request(fresh,reloaded.requestToken,future,'/submit',{answers:[0,1,2,3]}));
  assert.equal(repeated.result.score,1);
  assert.equal(repeated.result.rewardEligible,false);
});

test('server practice requests are isolated and difficulty advances after distinct scored evidence and explicit choice', async () => {
  const owner = session(), other = session();
  await owner.signIn('practice-progression');
  await other.signIn('practice-progression-other');
  await Promise.all([activateFor(owner,['visual-observation']),activateFor(other,['listening'])]);
  const initial = await saved(await owner.request(recovery));
  const otherState = await saved(await other.request(recovery));
  const {requestToken:token} = initial;
  const base = '/api/activities';
  const create = (requestId,code) => command(owner,token,base+'/attempts',{requestId,code,mode:'standard'});
  const move = (id,path,data) => command(owner,token,base+'/attempts/'+id+'/'+path,data);
  const level = (choice,current=1) => command(owner,token,base+'/levels',{type:'digital-judgment',choice,level:current});
  assert.equal(initial.activities.levels['digital-judgment'].level,1);
  assert.equal((await level('next')).status,409);
  assert.equal((await create(randomUUID(),'practice-digital-judgment-l2-a')).status,409);
  assert.equal((await create(randomUUID(),'protected-work')).status,404);
  const definitions = JSON.parse(await readFile(join(web,'wwwroot','src','data','practices.json'),'utf8')).definitions
    .filter(exercise => exercise.practiceType === 'digital-judgment' && exercise.level === 1);
  const attemptIds = [];
  for (const [index,exercise] of definitions.entries()) {
    const requestId = randomUUID();
    const [first,duplicate] = await Promise.all([create(requestId,exercise.id).then(saved),create(requestId,exercise.id).then(saved)]);
    const id = first.attemptId;
    assert.equal(duplicate.attemptId,id);
    attemptIds.push(id);
    const key = exercise.questions.map(question=>question.answer);
    assert.ok(first.questions.every(question=>!('answer' in question)));
    assert.equal(first.definition.contentVersion,exercise.contentVersion);
    assert.equal((await other.request(base+'/attempts/'+id)).status,404);
    assert.equal((await command(other,otherState.requestToken,base+'/attempts/'+id+'/submit',{answers:key})).status,404);
    assert.equal((await move(id,'answer',{question:1,answer:key[1]})).status,409);
    assert.equal((await move(id,'submit',{answers:key})).status,409);
    assert.equal((await move(id,'submit',{answers:key,score:1,completed:true})).status,400);
    for (const [question,answer] of key.entries()) {
      const checked = await saved(await move(id,'answer',{question,answer}));
      assert.equal(checked.questions[question].explanation,exercise.questions[question].explanation);
      assert.equal((await move(id,'answer',{question,answer:(answer+1)%4})).status,409);
    }
    const results = await Promise.all([move(id,'submit',{answers:key}).then(saved),move(id,'submit',{answers:key}).then(saved)]);
    assert.deepEqual(results[0].result,results[1].result);
    assert.equal(results[0].result.score,1);
    assert.equal((await create(randomUUID(),exercise.id)).status,409);
    if (index < 2) {
      await sql(`UPDATE activity.PracticeAttempt SET StartedAtUtc=DATEADD(day,-${2-index},StartedAtUtc),
        EndedAtUtc=DATEADD(day,-${2-index},EndedAtUtc) WHERE PublicId='${id}'`);
    }
  }
  const ready = await saved(await owner.request(recovery));
  const judgment = ready.activities.levels['digital-judgment'];
  assert.deepEqual([judgment.level,judgment.validAtLevel,judgment.days,judgment.eligible],[1,3,3,true]);
  assert.equal((await saved(await level('stay'))).level,1);
  assert.equal((await saved(await level('next'))).level,2);
  assert.equal((await level('next')).status,409);
  assert.equal((await create(randomUUID(),definitions[0].id)).status,409);
  const fresh = session();
  await fresh.signIn('practice-progression',false);
  const reloaded = await saved(await fresh.request(recovery));
  assert.equal(reloaded.activities.levels['digital-judgment'].level,2);
  assert.equal(reloaded.activities.levels['visual-observation'].level,1);
  assert.deepEqual(new Set(reloaded.activities.history.map(row=>row.attemptId)),new Set(attemptIds));
  assert.equal((await saved(await fresh.request(base+'/attempts/'+attemptIds[0]))).result.score,1);
});

test('offline routine check-ins and edits persist independently of scored practice', async () => {
  const owner = session(), other = session();
  await owner.signIn('routine-owner');
  await other.signIn('routine-other');
  await activateFor(owner,['depth']);
  const state = await saved(await owner.request(recovery));
  const otherSetup = await other.read();
  const token = state.requestToken, path = '/api/offline-routines';
  const edit = {title:'Read printable pages',days:[0,1,2,3,4,5,6],recurrence:'weekly',paused:false,durationMinutes:10};
  assert.equal((await owner.request(path,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(edit)})).status,400);
  const [first,duplicate] = await Promise.all(Array.from({length:2},()=>command(owner,token,path,edit).then(saved)));
  assert.equal(first.id,duplicate.id);
  const id = first.id.replace('sql-routine-','');
  const itemPath = path+'/'+id;
  const initial = state.routines[0].id.replace('sql-routine-','');
  await saved(await command(owner,token,path+'/'+initial+'/check-in',{status:'done'},'PUT'));
  const planAfterCheck = await saved(await owner.request(recovery));
  assert.ok(planAfterCheck.actions.some(row=>row.routineId===state.routines[0].id && row.status==='Completed' && row.completedAttemptId===null));
  assert.equal((await command(other,otherSetup.requestToken,itemPath+'/check-in',{status:'done'},'PUT')).status,404);
  assert.deepEqual(await saved(await other.request(path)),[]);
  await saved(await command(owner,token,itemPath+'/check-in',{status:'skipped'},'PUT'));
  await Promise.all(Array.from({length:2},()=>command(owner,token,itemPath+'/check-in',{status:'done'},'PUT').then(saved)));
  assert.equal(await sql(`SELECT COUNT(*) FROM activity.RoutineCheckIn WHERE RoutineId=${id}`),'1');
  await sql(`UPDATE activity.RoutineCheckIn SET LocalDate=DATEADD(day,-1,LocalDate) WHERE RoutineId=${id};
    UPDATE activity.OfflineRoutine SET CreatedAtUtc=DATEADD(day,-1,CreatedAtUtc) WHERE Id=${id};`);
  await saved(await command(owner,token,itemPath,{...edit,title:'Read on paper',recurrence:'biweekly',paused:true},'PUT'));
  assert.equal((await command(owner,token,itemPath+'/check-in',{status:'done'},'PUT')).status,409);
  const fresh = session();
  await fresh.signIn('routine-owner',false);
  const freshToken = (await fresh.read()).requestToken;
  const item = (await saved(await fresh.request(path))).find(row=>row.id===first.id);
  assert.equal(item.title,'Read on paper');
  assert.equal(item.schedule.length,2);
  assert.equal(item.schedule.at(-1).paused,true);
  assert.equal(item.checkIns[0].title,edit.title);
  assert.equal(item.checkIns[0].status,'done');
  await saved(await command(fresh,freshToken,itemPath,undefined,'DELETE'));
  const archived = (await saved(await fresh.request(path))).find(row=>row.id===first.id);
  assert.equal(archived.removedOn,state.today);
  assert.deepEqual(archived.checkIns,item.checkIns);
  assert.equal((await saved(await fresh.request(recovery))).activities.history.length,0);
});

test('confirming each Weekly Review saves one week and preserves earlier actions', async () => {
  const owner = session(), other = session();
  await owner.signIn('weekly-schedule');
  await other.signIn('weekly-other');
  await Promise.all([finishSetup(owner),finishSetup(other)]);
  const preview = await saved(await owner.request(recovery));
  const edited = await saved(await writePlan(owner,preview,{...preview.plan.preferences,
    activityTypes:['visual-observation','digital-judgment'],routine:{title:'Walk outside',minutes:5,days:[0,3]}}));
  const active = await saved(await writePlan(owner,{...edited,requestToken:preview.requestToken}));
  const otherState = await saved(await other.request(recovery));
  const review = (account,token,week,confirm=false,change={}) =>
    account.request(recovery+'/weekly-review'+(confirm?'':'/preview'),{method:'POST',
      headers:{RequestVerificationToken:token,'Content-Type':'application/json'},
      body:JSON.stringify({cycleId:active.cycleId,week,manageable:'about-right',fit:'good-fit',choice:'keep',...change})});
  assert.equal((await review(owner,preview.requestToken,1)).status,409);
  assert.equal((await review(owner,preview.requestToken,2,true)).status,409);
  assert.equal((await review(other,otherState.requestToken,1,true)).status,404);
  assert.equal((await review(owner,preview.requestToken,1,true,{choice:'adjust',adjustment:{days:4,minutes:5,activityType:'protected-work'}})).status,400);
  const shift = days => sql(`UPDATE a SET LocalDate=DATEADD(day,-${days},a.LocalDate) FROM recovery.ScheduledAction a
    JOIN recovery.RecoveryCycle c ON c.Id=a.CycleId WHERE c.PublicId='${active.cycleId}';
    UPDATE recovery.RecoveryCycle SET StartLocalDate=DATEADD(day,-${days},StartLocalDate),
      EndLocalDate=DATEADD(day,-${days},EndLocalDate) WHERE PublicId='${active.cycleId}';`);
  await shift(5);
  const original = active.actions.find(action=>action.kind==='Practice');
  await sql(`UPDATE recovery.ScheduledAction SET Status='Completed' WHERE CONCAT('sql-action-',Id)='${original.id}'`);
  const offset = (state,date) => (Date.parse(date)-Date.parse(state.startsOn))/86400000;
  for (let week=1; week<=4; week++) {
    const state = await saved(await owner.request(recovery));
    const proposed = await saved(await review(owner,state.requestToken,week));
    assert.equal(state.reviews.length,week-1);
    assert.ok(state.actions.every(action=>offset(state,action.date)<week*7));
    if (week<4) {
      assert.ok(proposed.actions.length>0);
      assert.ok(proposed.actions.every(action=>offset(state,action.date)>=week*7 && offset(state,action.date)<(week+1)*7));
    } else assert.deepEqual(proposed.actions,[]);
    const next = await Promise.all(Array.from({length:2},()=>review(owner,state.requestToken,week,true).then(saved)));
    assert.deepEqual(next[0],next[1]);
    const after = await saved(await owner.request(recovery));
    assert.equal(after.reviews.length,week);
    assert.equal(after.actions.find(action=>action.id===original.id).status,'Completed');
    assert.equal(after.actions.length,state.actions.length+next[0].scheduled);
    assert.ok(after.actions.filter(action=>action.kind==='Practice').every(action=>
      ['visual-observation','digital-judgment'].includes(action.activityType)));
    if (week<4) {
      assert.equal(after.plan.weeks[week].detailed,true);
      await shift(7);
    }
  }
  assert.match(await sql(`SELECT COUNT(*),SUM(CASE WHEN Status='Accepted' THEN 1 ELSE 0 END)
    FROM recovery.PlanRevision WHERE CycleId=(SELECT Id FROM recovery.RecoveryCycle WHERE PublicId='${active.cycleId}')`),/4\s+1/);
});

async function shiftRecoveryCycle(cycleId, days) {
  await sql(`UPDATE a SET LocalDate=DATEADD(day,-${days},a.LocalDate) FROM recovery.ScheduledAction a
    JOIN recovery.RecoveryCycle c ON c.Id=a.CycleId WHERE c.PublicId='${cycleId}';
    UPDATE r SET EffectiveFromLocalDate=DATEADD(day,-${days},r.EffectiveFromLocalDate) FROM recovery.PlanRevision r
    JOIN recovery.RecoveryCycle c ON c.Id=r.CycleId WHERE c.PublicId='${cycleId}';
    UPDATE recovery.RecoveryCycle SET StartLocalDate=DATEADD(day,-${days},StartLocalDate),
      EndLocalDate=DATEADD(day,-${days},EndLocalDate) WHERE PublicId='${cycleId}';`);
}

function requestReview(account, state, fields, preview = true) {
  return command(account,state.requestToken,recovery+'/weekly-review'+(preview?'/preview':''),
    {cycleId:state.cycleId,week:1,manageable:'about-right',fit:'good-fit',choice:'accept',...fields});
}

test('Weekly Review uses linked SQL evidence, labels unknown evidence, and saves only the confirmed adaptive week', async () => {
  const owner = session(), other = session();
  await owner.signIn('weekly-evidence');
  await other.signIn('weekly-evidence-other');
  await finishSetup(owner);
  const draft = await saved(await owner.request(recovery));
  const edited = await saved(await writePlan(owner,draft,{...draft.plan.preferences,
    activityTypes:['visual-observation','depth'],practiceDays:[0,1,2,6],routine:{title:'Walk outside',minutes:5,days:[0,1]}}));
  await saved(await writePlan(owner,{...edited,requestToken:draft.requestToken}));
  await activateFor(other,['depth']);
  const active = await saved(await owner.request(recovery));
  const otherState = await saved(await other.request(recovery));
  assert.equal((await requestReview(other,{...active,requestToken:otherState.requestToken},{})).status,404);
  const weekOne = active.reviewWeeks[0];
  assert.equal(weekOne.status,'Upcoming');
  assert.equal((Date.parse(weekOne.dueOn)-Date.parse(weekOne.opensOn))/86400000,1);
  assert.equal((Date.parse(weekOne.dueOn)-Date.parse(active.startsOn))/86400000,6);
  assert.equal((await requestReview(owner,active,{})).status,409);
  const [missed,scored,unknown,upcoming] = active.actions.filter(row=>row.kind==='Practice');
  await sql(`UPDATE recovery.ScheduledAction SET LocalDate='${active.today}' WHERE Id=${Number(scored.id.slice(11))};
    UPDATE recovery.ScheduledAction SET Status='Completed' WHERE Id=${Number(unknown.id.slice(11))};`);
  const route = '/api/activities/depth/'+scored.id.slice(11)+'/attempt';
  const attempt = await saved(await command(owner,active.requestToken,route));
  const result = await saved(await command(owner,active.requestToken,route+'/submit',{answers:[0,1,2,3]}));
  const routine = active.routines[0].id.slice(12);
  await saved(await command(owner,active.requestToken,'/api/offline-routines/'+routine+'/check-in',{status:'done'},'PUT'));
  await shiftRecoveryCycle(active.cycleId,4);
  assert.equal((await requestReview(owner,active,{})).status,409);
  await shiftRecoveryCycle(active.cycleId,1);
  await sql(`UPDATE activity.RoutineCheckIn SET LocalDate=DATEADD(day,-5,LocalDate) WHERE RoutineId=${Number(routine)};
    DECLARE @owner bigint = (SELECT PersonId FROM recovery.RecoveryCycle WHERE PublicId='${active.cycleId}');
    DECLARE @other bigint = (SELECT PersonId FROM recovery.RecoveryCycle WHERE PublicId='${otherState.cycleId}');
    INSERT shield.ExtensionInstallation(PersonId, InstallationPublicId, BrowserCode, ExtensionVersion, SyncKeyHash, Status, PairedAtUtc)
      VALUES (@owner, NEWID(), N'chrome', N'0.1.0', 0x01, N'Connected', DATEADD(day,-6,SYSUTCDATETIME()));
    DECLARE @installation bigint = SCOPE_IDENTITY();
    INSERT shield.BrowserUsagePeriod(PersonId, InstallationId, LocalDate, TimeZoneId, ObservedSeconds, CoverageSeconds, SequenceNo, ReceivedAtUtc)
      VALUES (@owner, @installation, '${active.today}', N'Asia/Amman', 120, 300, 1, SYSUTCDATETIME()),
             (@owner, @installation, '${active.today}', N'Asia/Amman', 0, 0, 2, SYSUTCDATETIME()),
             (@other, @installation, '${active.today}', N'Asia/Amman', 240, 300, 3, SYSUTCDATETIME())`);
  const due = await saved(await owner.request(recovery));
  const {evidence} = due.reviewWeeks[0];
  assert.equal(due.reviewWeeks[0].status,'Due');
  assert.deepEqual([evidence.scheduled,evidence.due,evidence.completed,evidence.missed,evidence.unavailable],[4,2,1,1,1]);
  const rows = Object.fromEntries(evidence.practices.map(row=>[row.actionId,row]));
  assert.equal(rows[missed.id].status,'Missed');
  assert.equal(rows[scored.id].result.id,result.result.id);
  assert.equal(rows[scored.id].evidenceTier,'System-scored');
  assert.equal(rows[unknown.id].status,'Unavailable');
  assert.equal(rows[unknown.id].result,null);
  assert.equal(rows[upcoming.id].status,'Upcoming');
  assert.deepEqual(evidence.routine,{scheduledDays:2,doneDays:1,skippedDays:0});
  assert.equal(evidence.browser.observedSeconds,120);
  assert.equal((await saved(await other.request(recovery))).reviewWeeks[0].evidence.browser,null);
  const choices = {choice:'accept',manageable:'too-much',fit:'mixed'};
  const proposed = await saved(await requestReview(owner,due,choices));
  assert.deepEqual(proposed.preferences.activityTypes,['depth','visual-observation']);
  assert.equal(proposed.preferences.practiceDays.length,2);
  assert.equal(proposed.nextWeek,2);
  assert.ok(proposed.reasons.some(reason=>reason.includes('stronger recorded answers')));
  const adjusted = await saved(await requestReview(owner,due,{choice:'adjust',
    adjustment:{days:3,minutes:15,activityType:'listening'}}));
  assert.equal(adjusted.preferences.minutes,15);
  assert.equal(adjusted.actions.filter(row=>row.kind==='practice'&&row.activityType==='listening'&&row.level===1).length,3);
  assert.equal((await requestReview(owner,due,{...choices,choice:'keep'})).status,400);
  assert.equal((await requestReview(owner,due,{...choices,proposalToken:'A'.repeat(64)},false)).status,409);
  assert.deepEqual((await saved(await owner.request(recovery))).actions,due.actions);
  const confirmation = {...choices,proposalToken:proposed.proposalToken};
  const retried = await Promise.all(Array.from({length:2},()=>requestReview(owner,due,confirmation,false).then(saved)));
  assert.deepEqual(retried[0],retried[1]);
  const fresh = session();
  await fresh.signIn('weekly-evidence',false);
  const reloaded = await saved(await fresh.request(recovery));
  assert.deepEqual(reloaded.plan.weeks.map(week=>week.detailed),[true,true,false,false]);
  assert.deepEqual(reloaded.reviews[0].evidence,evidence);
  assert.deepEqual(reloaded.actions.slice(0,due.actions.length).filter(row=>row.kind==='Practice'),
    due.actions.filter(row=>row.kind==='Practice'));
  assert.equal((await saved(await fresh.request(route))).attemptId,attempt.attemptId);
  assert.equal(reloaded.planChanges[0].preferences.practiceDays.length,4);
  assert.equal(reloaded.planChanges[1].preferences.practiceDays.length,2);
  assert.equal(reloaded.planChanges[1].effectiveOn,proposed.actions[0].date);
  assert.equal(await sql(`SELECT COUNT(*) FROM ops.AuditEvent WHERE ResourceKind='WeeklyReview'
    AND ResourceId=${Number(reloaded.reviews[0].id.slice(11))} AND Action='WeeklyReviewConfirmed'`),'1');
});

test('an overdue review can continue conservatively without backfill and stays open for answers', async () => {
  const owner = session();
  await owner.signIn('weekly-return');
  const active = await activateFor(owner,['depth']);
  const before = await saved(await owner.request(recovery));
  const skip = {choice:'continue',manageable:null,fit:null};
  assert.equal((await requestReview(owner,before,skip)).status,409);
  await shiftRecoveryCycle(active.cycleId,15);
  const late = await saved(await owner.request(recovery));
  assert.equal(late.reviewWeeks[0].status,'Overdue');
  assert.equal(late.reviewWeeks[0].canContinue,true);
  assert.equal(late.reviewWeeks[1].status,'Unavailable');
  assert.equal(late.reviewWeeks[1].evidence.missed,0);
  assert.equal(late.reviewWeeks[1].evidence.browser,null);
  assert.ok(late.activities.catalog.some(item=>item.access.allowed&&!item.access.core));
  const proposed = await saved(await requestReview(owner,late,skip));
  assert.equal(proposed.nextWeek,3);
  assert.ok(proposed.actions.every(row=>row.date>=late.today));
  assert.ok(proposed.preferences.practiceDays.length<late.plan.preferences.practiceDays.length);
  const inputs = {...skip,proposalToken:proposed.proposalToken};
  const receipts = await Promise.all(Array.from({length:2},()=>requestReview(owner,late,inputs,false).then(saved)));
  assert.deepEqual(receipts[0],receipts[1]);
  assert.equal(receipts[0].review.decision,'auto');
  const continued = await saved(await owner.request(recovery));
  assert.deepEqual(continued.plan.weeks.map(week=>week.detailed),[true,false,true,false]);
  assert.equal(continued.reviewWeeks[0].status,'Continued');
  assert.equal(continued.reviewWeeks[0].canContinue,false);
  assert.equal(continued.actions.find(row=>row.kind==='WeeklyReview').status,'Due');
  const fresh = session();
  await fresh.signIn('weekly-return',false);
  const back = await saved(await fresh.request(recovery));
  assert.deepEqual(back.actions,continued.actions);
  const formal = await saved(await requestReview(fresh,back,{}));
  assert.deepEqual(formal.actions,[]);
  const recorded = await saved(await requestReview(fresh,back,{proposalToken:formal.proposalToken},false));
  assert.equal(recorded.scheduled,0);
  assert.equal(recorded.review.id,receipts[0].review.id);
  const after = await saved(await fresh.request(recovery));
  assert.equal(after.reviewWeeks[0].status,'Reviewed');
  assert.equal(after.reviews.length,1);
  assert.equal(after.planChanges.length,2);
  assert.equal(after.actions.length,continued.actions.length);
  assert.deepEqual(after.plan.weeks.map(week=>week.detailed),[true,false,true,false]);
  assert.equal(await sql(`SELECT COUNT(*) FROM ops.AuditEvent WHERE ResourceKind='WeeklyReview'
    AND ResourceId=${Number(recorded.review.id.slice(11))} AND Action IN ('WeeklyReviewConfirmed','WeeklyReviewContinued')`),'2');
});


function submitCycleReview(account, state, reflection) {
  return command(account,state.requestToken,recovery+'/cycle-review',{cycleId:state.cycleId,reflection});
}

function continueCycle(account, state, choice='next') {
  return command(account,state.requestToken,recovery+'/continue',{cycleId:state.cycleId,choice});
}

test('Day 28 stays active, Day 29 ends the cycle, and Cycle 2 preserves the four-week evidence and earned level', async () => {
  const owner = session(), other = session();
  await owner.signIn('full-cycle-owner');
  await other.signIn('full-cycle-other');
  await Promise.all([activateFor(owner,['depth']),activateFor(other,['listening'])]);
  const original = await saved(await owner.request(recovery));
  const otherState = await saved(await other.request(recovery));
  assert.equal(original.timeZone,'Asia/Amman');
  assert.equal((Date.parse(original.endsOn)-Date.parse(original.startsOn))/86400000,27);
  for(const [index,week] of original.reviewWeeks.entries())
    assert.equal((Date.parse(week.dueOn)-Date.parse(original.startsOn))/86400000,6+index*7);
  assert.equal((await submitCycleReview(owner,original,'Still active')).status,409);
  assert.equal((await continueCycle(owner,original)).status,409);
  assert.equal((await submitCycleReview(other,{...original,requestToken:otherState.requestToken},'Foreign')).status,404);
  assert.equal((await continueCycle(other,{...original,requestToken:otherState.requestToken})).status,404);

  const firstRoutine = original.routines[0].id;
  await saved(await command(owner,original.requestToken,'/api/offline-routines/'+firstRoutine.slice(12)+'/check-in',{status:'done'},'PUT'));
  const catalog = JSON.parse(await readFile(join(web,'wwwroot','src','data','practices.json'),'utf8')).definitions;
  const attempts = [];
  for(let index=0;index<3;index++) {
    const current = await saved(await owner.request(recovery));
    const action = current.actions.find(item=>item.kind==='Practice'&&item.date===current.today);
    const path = '/api/activities/depth/'+action.id.slice(11)+'/attempt';
    await saved(await command(owner,current.requestToken,path));
    const key = catalog.find(exercise=>exercise.id===action.activityCode).questions.map(question=>question.answer);
    const submitted = await saved(await command(owner,current.requestToken,path+'/submit',{answers:key}));
    attempts.push(submitted.result);
    if(index<2)await shiftRecoveryCycle(original.cycleId,2);
  }
  const progressed = await saved(await owner.request(recovery));
  assert.equal(progressed.activities.levels.depth.eligible,true);
  assert.equal((await saved(await command(owner,progressed.requestToken,'/api/activities/levels',
    {type:'depth',choice:'next',level:1}))).level,2);
  await shiftRecoveryCycle(original.cycleId,1);
  for(let week=1;week<=4;week++){
    const state = await saved(await owner.request(recovery));
    const choice = week===4?{choice:'adjust',adjustment:{days:2,minutes:15,activityType:'depth'}}:{choice:'keep'};
    assert.equal(state.reviewWeeks[week-1].status,'Due');
    assert.deepEqual(state.plan.weeks.map(item=>item.detailed),[1,2,3,4].map(item=>item<=week));
    const proposed = await saved(await requestReview(owner,state,{week,...choice}));
    assert.equal(proposed.nextWeek,week===4?null:week+1);
    assert.ok(proposed.actions.filter(row=>row.kind==='practice').every(row=>row.level===2));
    const recorded = await saved(await requestReview(owner,state,{week,...choice,proposalToken:proposed.proposalToken},false));
    assert.equal(recorded.review.week,week);
    if(week<4) await shiftRecoveryCycle(original.cycleId,week===3?8:7);
  }

  const lastDay = await saved(await owner.request(recovery));
  assert.equal(lastDay.today,lastDay.endsOn);
  assert.equal(lastDay.status,'Active');
  assert.equal(lastDay.endedAtUtc,null);
  assert.equal(lastDay.reviews.length,4);
  assert.equal((await submitCycleReview(owner,lastDay,'A premature review')).status,409);
  assert.equal((await continueCycle(owner,lastDay)).status,409);
  await shiftRecoveryCycle(original.cycleId,1);
  // Keep the original check-in on its corresponding Week 1 date in the shifted fixture.
  await sql(`UPDATE checkin SET LocalDate=c.StartLocalDate FROM activity.RoutineCheckIn checkin
    JOIN recovery.RecoveryCycle c ON c.PersonId=checkin.PersonId WHERE c.PublicId='${original.cycleId}'
    AND checkin.RoutineId=${Number(firstRoutine.slice(12))}`);
  const [ended, retried] = await Promise.all(Array.from({length:2},()=>owner.request(recovery).then(saved)));
  assert.equal(ended.status,'Ended');
  assert.equal(ended.endedAtUtc,retried.endedAtUtc);
  assert.equal(Date.parse(ended.endedAtUtc),Date.parse(ended.today+'T00:00:00+03:00'));
  assert.equal(ended.finalEvidence.weeks.length,4);
  assert.equal(ended.finalEvidence.weeks[0].evidence.completed,3);
  assert.equal(ended.finalEvidence.reportedRoutineDays,1);
  assert.deepEqual(ended.finalEvidence.weeks[0].evidence.practices.map(item=>item.result),attempts);
  assert.equal(ended.finalEvidence.weeks[0].evidence.browser,null);
  assert.equal((await continueCycle(owner,ended)).status,409);
  assert.equal((await submitCycleReview(owner,ended,' ')).status,400);
  const reflection='I want to keep reading at the pace I chose during Week 4.';
  const final = await Promise.all(Array.from({length:2},()=>submitCycleReview(owner,ended,reflection).then(saved)));
  assert.deepEqual(final[0],final[1]);
  assert.deepEqual(final[0].evidence,ended.finalEvidence);
  const reviewed = await saved(await owner.request(recovery));
  assert.equal(reviewed.status,'Reviewed');
  assert.deepEqual(reviewed.cycleReview,final[0]);
  assert.deepEqual(reviewed.continuations.find(item=>item.choice==='next'),{choice:'next',practiceDays:2,minutes:15});
  assert.deepEqual(reviewed.actions,ended.actions);
  const fresh = session();
  await fresh.signIn('full-cycle-owner',false);
  const reloaded = await saved(await fresh.request(recovery));
  assert.equal(reloaded.cycleReview.reflection,reflection);
  const next = await Promise.all(Array.from({length:2},()=>continueCycle(fresh,reloaded).then(saved)));
  assert.deepEqual(next[0],next[1]);
  assert.equal((await continueCycle(fresh,reloaded,'maintenance')).status,409);
  const preview = await saved(await fresh.request(recovery));
  assert.equal(preview.cycleId,next[0].cycleId);
  assert.equal(preview.cycleNumber,2);
  assert.equal(preview.status,'Preview');
  assert.equal(preview.activatedAtUtc,null);
  assert.deepEqual(preview.actions,[]);
  assert.equal(preview.plan.preferences.minutes,15);
  assert.equal(preview.plan.preferences.practiceDays.length,2);
  assert.equal(preview.activities.levels.depth.level,2);
  assert.equal(preview.activities.history.filter(row=>row.result?.score===1).length,3);
  assert.deepEqual(preview.history.find(item=>item.cycleId===ended.cycleId).cycleReview,final[0]);

  const activated = await Promise.all(Array.from({length:2},()=>writePlan(fresh,preview).then(saved)));
  assert.equal(activated[0].cycleId,activated[1].cycleId);
  const cycleTwo = await saved(await fresh.request(recovery));
  assert.equal(cycleTwo.status,'Active');
  assert.equal((Date.parse(cycleTwo.endsOn)-Date.parse(cycleTwo.startsOn))/86400000,27);
  assert.deepEqual(cycleTwo.plan.weeks.map(item=>item.detailed),[true,false,false,false]);
  assert.ok(cycleTwo.actions.every(row=>(Date.parse(row.date)-Date.parse(cycleTwo.startsOn))/86400000<7));
  assert.ok(cycleTwo.actions.filter(row=>row.kind==='Practice').every(row=>row.level===2));
  assert.deepEqual(cycleTwo.history.find(item=>item.cycleId===ended.cycleId).cycleReview,final[0]);
  assert.equal(cycleTwo.activities.levels.depth.level,2);
  const audit = await sql(`SELECT e.Action,COUNT(*) FROM ops.AuditEvent e
    JOIN recovery.RecoveryCycle c ON c.Id=e.ResourceId WHERE c.PublicId='${ended.cycleId}' AND e.ResourceKind='RecoveryCycle'
    AND e.Action IN ('RecoveryCycleEnded','RecoveryCycleReviewed','RecoveryContinuationChosen') GROUP BY e.Action`);
  assert.match(audit,/RecoveryCycleEnded\s+1/);
  assert.match(audit,/RecoveryCycleReviewed\s+1/);
  assert.match(audit,/RecoveryContinuationChosen\s+1/);
  assert.equal(await sql(`SELECT COUNT(*) FROM recovery.RecoveryCycle WHERE PersonId=
    (SELECT PersonId FROM recovery.RecoveryCycle WHERE PublicId='${ended.cycleId}') AND Status='Active'`),'1');
  assert.deepEqual((await saved(await other.request(recovery))).history,[]);
});

test('Maintenance keeps the approved one-day pace and requires its own preview and activation', async () => {
  const owner = session();
  await owner.signIn('maintenance-owner');
  const active = await activateFor(owner,['listening']);
  await shiftRecoveryCycle(active.cycleId,28);
  const ended = await saved(await owner.request(recovery));
  assert.equal(ended.reviewWeeks[1].evidence.scheduled,0);
  assert.equal(ended.reviewWeeks[1].evidence.missed,0);
  await saved(await submitCycleReview(owner,ended,'A lighter week fits my schedule.'));
  await saved(await continueCycle(owner,ended,'maintenance'));
  const preview = await saved(await owner.request(recovery));
  assert.equal(preview.kind,'Maintenance');
  assert.equal(preview.status,'Preview');
  assert.deepEqual(preview.actions,[]);
  assert.equal(preview.plan.preferences.practiceDays.length,1);
  const overLimit = {...preview.plan.preferences,practiceDays:[0,2]};
  assert.equal((await writePlan(owner,preview,overLimit)).status,400);
  await saved(await writePlan(owner,preview));
  await shiftRecoveryCycle(preview.cycleId,5);
  const maintenance = await saved(await owner.request(recovery));
  assert.equal(maintenance.actions.filter(item=>item.kind==='Practice').length,1);
  assert.equal((await requestReview(owner,maintenance,{choice:'adjust',
    adjustment:{days:2,minutes:5,activityType:'listening'}})).status,400);
  const proposed = await saved(await requestReview(owner,maintenance,{choice:'keep'}));
  assert.equal(proposed.actions.filter(item=>item.kind==='practice').length,1);
});


const insightsPath = '/api/insights';

async function scoreInsightPractice(account, state, action, exercise) {
  const base = '/api/activities/attempts';
  const started = await saved(await command(account,state.requestToken,base,{
    requestId:randomUUID(),actionId:Number(action.id.slice(11)),
    mode:exercise.practiceType==='listening'?'transcript':'standard'
  }));
  const attempt = base+'/'+started.attemptId;
  if (exercise.practiceType==='visual-observation') await saved(await command(account,state.requestToken,attempt+'/observe'));
  const answers = exercise.questions.map(question=>question.answer);
  if (['visual-observation','digital-judgment'].includes(exercise.practiceType))
    for (const [question,answer] of answers.entries())
      await saved(await command(account,state.requestToken,attempt+'/answer',{question,answer}));
  const first = await saved(await command(account,state.requestToken,attempt+'/submit',{answers}));
  const retry = await saved(await command(account,state.requestToken,attempt+'/submit',{answers}));
  assert.deepEqual(first.result,retry.result);
  return first.result;
}

test('Insights reports owner-scoped SQL evidence for four practices, linked completions and distinct routine days', async () => {
  const owner = session(), other = session(), anonymous = session();
  await owner.signIn('insights-owner');
  await other.signIn('insights-other');
  assert.equal((await anonymous.request(insightsPath)).status,401);
  const empty = await saved(await other.request(insightsPath));
  assert.equal(empty.current,null);
  assert.equal(empty.comparison,null);
  assert.deepEqual(empty.routine.doneDays,[]);
  assert.ok(empty.practices.every(row=>!row.progress&&!row.latest&&row.validAttempts===0));
  await finishSetup(owner);
  const preview = await saved(await owner.request(recovery));
  const families=['depth','listening','visual-observation','digital-judgment'];
  const edited = await saved(await writePlan(owner,preview,{...preview.plan.preferences,activityTypes:families,
    practiceDays:[0,1,2,3],routine:{title:'Owner Reading Routine',minutes:5,days:[0,1,2,3]}}));
  await saved(await writePlan(owner,{...edited,requestToken:preview.requestToken}));
  const definitions = JSON.parse(await readFile(join(web,'wwwroot','src','data','practices.json'),'utf8')).definitions;

  let result;
  for (const [index,family] of families.entries()) {
    const state = await saved(await owner.request(recovery));
    const action = state.actions.find(row=>row.kind==='Practice'&&row.date===state.today);
    assert.equal(action.activityType,family);
    result = await scoreInsightPractice(owner,state,action,definitions.find(item=>item.id===action.activityCode));
    assert.equal(result.score,1);
    if(index<3)await shiftRecoveryCycle(state.cycleId,1);
  }
  const state = await saved(await owner.request(recovery));
  await saved(await command(owner,state.requestToken,'/api/offline-routines/'+state.routines[0].id.slice(12)+'/check-in',{status:'done'},'PUT'));
  const add = title=>command(owner,state.requestToken,'/api/offline-routines',
    {title,days:[0,1,2,3,4,5,6],recurrence:'weekly',paused:false}).then(saved);
  const extra=await add('Extra done check-in'), skipped=await add('Skipped check-in');
  await saved(await command(owner,state.requestToken,'/api/offline-routines/'+extra.id.slice(12)+'/check-in',{status:'done'},'PUT'));
  await saved(await command(owner,state.requestToken,'/api/offline-routines/'+skipped.id.slice(12)+'/check-in',{status:'skipped'},'PUT'));
  // A second valid-looking attempt against the same action is never canonical.
  const attempt = Number(result.id.slice(12));
  await sql(`INSERT activity.PracticeAttempt(PersonId,PracticeVersionId,Source,ScheduledActionId,Status,Valid,OutcomeCode,
    ScoreValue,StartedAtUtc,EndedAtUtc,Title)
    SELECT PersonId,PracticeVersionId,Source,ScheduledActionId,Status,Valid,OutcomeCode,ScoreValue,StartedAtUtc,EndedAtUtc,Title
    FROM activity.PracticeAttempt WHERE Id=${attempt};
    INSERT recovery.ScheduledAction(CycleId,PersonId,PlanRevisionId,ActionKind,LocalDate,Status)
    SELECT CycleId,PersonId,PlanRevisionId,'Practice',LocalDate,'Completed'
    FROM recovery.ScheduledAction WHERE CompletedAttemptId=${attempt}`);
  const response = await owner.request(insightsPath);
  assert.match(response.headers.get('cache-control'),/no-store/);
  const metrics = await saved(response);
  assert.equal(metrics.current.cycle.number,1);
  assert.equal(metrics.current.week.number,1);
  assert.equal(metrics.current.day,4);
  assert.deepEqual(metrics.current.week.adherence,{scheduled:5,due:4,completed:4,missed:0,unavailable:1,completionRate:1});
  assert.deepEqual(metrics.routine.doneDays,[state.today]);
  assert.deepEqual(metrics.routine.skippedDays,[state.today]);
  assert.equal(metrics.current.cycle.reportedRoutineDays,1);
  for (const row of metrics.practices) {
    assert.equal(row.progress.level,1);
    assert.equal(row.progress.validAtLevel,1);
    assert.equal(row.validAttempts,1);
    assert.equal(row.rewardEligibleAttempts,1);
    assert.equal(row.latest.result.correctCount,4);
    assert.equal(row.comparableEarlier,null);
  }
  assert.match(metrics.practices.find(row=>row.activityType==='listening').latest.result.evidenceTier,/transcript/);
  assert.deepEqual(await saved(await other.request(insightsPath+'?cycleId='+state.cycleId)),empty);
  const fresh = session();
  await fresh.signIn('insights-owner',false);
  assert.deepEqual(await saved(await fresh.request(insightsPath)),metrics);
});

test('Insights compares complete cycles with matching scope and shows saved Weekly Review decisions', async () => {
  const owner = session();
  await owner.signIn('insights-history');
  const active = await activateFor(owner,['depth']);
  const catalog = JSON.parse(await readFile(join(web,'wwwroot','src','data','practices.json'),'utf8')).definitions;
  const scoreFirst = async () => {
    const state = await saved(await owner.request(recovery));
    const action = state.actions.find(item=>item.kind==='Practice'&&item.date===state.today);
    return scoreInsightPractice(owner,state,action,catalog.find(item=>item.id===action.activityCode));
  };
  const finish = async cycle => {
    await shiftRecoveryCycle(cycle,5);
    for(let week=1;week<=4;week++){
      const state=await saved(await owner.request(recovery));
      await saved(await requestReview(owner,state,{week,choice:'keep'},false));
      if(week<4)await shiftRecoveryCycle(cycle,7);
    }
    await shiftRecoveryCycle(cycle,2);
    const ended=await saved(await owner.request(recovery));
    await saved(await submitCycleReview(owner,ended,'Keep the planned cadence.'));
    return await saved(await owner.request(recovery));
  };
  const priorScore = await scoreFirst();
  await finish(active.cycleId);
  const reviewed = await saved(await owner.request(recovery));
  await saved(await continueCycle(owner,reviewed));
  let metrics = await saved(await owner.request(insightsPath));
  assert.equal(metrics.current,null);
  assert.equal(metrics.history.length,1);
  assert.equal(metrics.history[0].reviews.length,4);
  assert.equal(metrics.history[0].reviews[0].decision,'KeepPace');
  assert.equal(metrics.history[0].adherence.missed,11);
  assert.equal(metrics.comparison,null);
  const preview = await saved(await owner.request(recovery));
  const second = await saved(await writePlan(owner,preview));
  const nextScore = await scoreFirst();
  await shiftRecoveryCycle(active.cycleId,28);
  await finish(second.cycleId);
  metrics = await saved(await owner.request(insightsPath));
  assert.equal(metrics.current.cycle.status,'Reviewed');
  assert.equal(metrics.current.week.number,4);
  assert.equal(metrics.current.cycle.reviews.at(-1).manageability,'about-right');
  assert.equal(metrics.history[0].number,1);
  assert.deepEqual([metrics.comparison.earlierCycle,metrics.comparison.laterCycle],[1,2]);
  assert.deepEqual([metrics.comparison.earlier.due,metrics.comparison.later.due],[12,12]);
  const depth = metrics.practices.find(item=>item.activityType==='depth');
  assert.equal(depth.latest.result.id,nextScore.id);
  assert.equal(depth.comparableEarlier.result.id,priorScore.id);
  const initialRevision = `CycleId=(SELECT Id FROM recovery.RecoveryCycle WHERE PublicId='${second.cycleId}') AND RevisionNo=1`;
  await sql(`UPDATE recovery.PlanRevision SET EffectiveFromLocalDate=DATEADD(day,1,EffectiveFromLocalDate) WHERE ${initialRevision}`);
  assert.equal((await saved(await owner.request(insightsPath))).comparison,null);
  await sql(`UPDATE recovery.PlanRevision SET EffectiveFromLocalDate=DATEADD(day,-1,EffectiveFromLocalDate) WHERE ${initialRevision}`);
  // Different goal contracts are not shown as comparable.
  await sql(`UPDATE recovery.PlanRevision SET GoalCode=N'offline-time' WHERE CycleId=(SELECT Id FROM
    recovery.RecoveryCycle WHERE PublicId='${second.cycleId}') AND Status='Accepted'`);
  assert.equal((await saved(await owner.request(insightsPath))).comparison,null);
});

test('the existing Insights UI displays real SQL and never substitutes browser metrics after a failed request', async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});
    await registerBrowser(context,'Insights Browser','insights-browser@example.test');
    const path = origin+'/src/pages/member/insights/insights.html';
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error=>errors.push(error.message));
    await page.goto(path);
    await page.locator('#adherence-body').getByText('No data for a current cycle').waitFor();
    const active = await activateBrowser(context,'depth');
    const action = active.actions.find(item=>item.kind==='Practice');
    const token = (await (await context.request.get(origin+recovery)).json()).requestToken;
    const options = {headers:{RequestVerificationToken:token}};
    const attempt = origin+'/api/activities/depth/'+action.id.slice(11)+'/attempt';
    assert.equal((await context.request.post(attempt,options)).status(),200);
    assert.equal((await context.request.post(attempt+'/submit',{...options,data:{answers:[0,1,2,3]}})).status(),200);
    const routine = active.routines[0].id.slice(12);
    assert.equal((await context.request.put(origin+'/api/offline-routines/'+routine+'/check-in',{...options,data:{status:'done'}})).status(),200);
    await page.reload();
    await page.getByRole('progressbar',{name:'Eligible due practices completed'}).waitFor();
    assert.equal(await page.locator('.ins-week-summary strong').textContent(),'1 of 1');
    await page.locator('[data-practice="depth"]').getByText(/4 of 4 correct/).waitFor();
    await page.locator('#beyond-body').getByText('Self-reported',{exact:true}).first().waitFor();
    assert.match(await page.locator('#ins-snapshot').textContent(),/Saved records/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await page.route('**/api/insights',route=>route.fulfill({status:503,body:'Unavailable'}));
    await page.reload();
    await page.getByRole('alert').filter({hasText:'Your Insights could not be loaded'}).waitFor();
    assert.equal(await page.locator('.ins-week-summary').count(),0);
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
  }
});


const gardenPath = '/api/personal-garden';
const readGarden = account => account.request(gardenPath).then(saved);

test('Personal Garden grows all four trees once, earns flowers from distinct reported dates, and keeps them across cycles', async () => {
  const owner = session(), other = session(), guest = session();
  await owner.signIn('garden-owner');
  await other.signIn('garden-other');
  assert.equal((await guest.request(gardenPath)).status,401);
  const baseline = await readGarden(other);
  const families = ['depth','listening','visual-observation','digital-judgment'];
  assert.deepEqual(baseline.types.map(row=>row.id),families);
  assert.ok(baseline.types.every(row=>row.stage===0 && row.sources.length===0));
  assert.deepEqual([baseline.flowers,baseline.rabbits,baseline.birdhouses],[[],[],[]]);

  await finishSetup(owner);
  const draft = await saved(await owner.request(recovery));
  const edited = await saved(await writePlan(owner,draft,{...draft.plan.preferences,
    activityTypes:families,practiceDays:[0,1,2,3,4],
    routine:{title:'A regular walk',minutes:5,days:[0,1,2,3,4]}}));
  const active = await saved(await writePlan(owner,{...edited,requestToken:draft.requestToken}));
  const examples = JSON.parse(await readFile(join(web,'wwwroot','src','data','practices.json'),'utf8')).definitions;
  const practices = active.actions.filter(row=>row.kind==='Practice');
  const firstId=Number(practices[0].id.slice(11)), repeatedId=Number(practices[4].id.slice(11));
  await sql(`UPDATE recovery.ScheduledAction SET PracticeVersionId=(SELECT PracticeVersionId FROM recovery.ScheduledAction
    WHERE Id=${firstId}) WHERE Id=${repeatedId}`);
  const routineId = active.routines[0].id.slice(12);
  for (let index=0;index<practices.length;index++) {
    const state = await saved(await owner.request(recovery));
    const action = state.actions.find(row=>row.kind==='Practice'&&row.date===state.today);
    const score = await scoreInsightPractice(owner,state,action,examples.find(item=>item.id===action.activityCode));
    assert.equal(score.rewardEligible,index<4);
    const report = {status:index===4?'skipped':'done'};
    await saved(await command(owner,state.requestToken,'/api/offline-routines/'+routineId+'/check-in',report,'PUT'));
    if (index<4){
      await shiftRecoveryCycle(active.cycleId,1);
      await sql(`UPDATE activity.RoutineCheckIn SET LocalDate=DATEADD(day,-1,LocalDate) WHERE RoutineId=${Number(routineId)}`);
    }
  }
  const current = await saved(await owner.request(recovery));
  // A historical retired practice remains a valid historical record, not a replacement tree.
  await sql(`DECLARE @owner bigint = (SELECT PersonId FROM recovery.RecoveryCycle WHERE PublicId='${active.cycleId}');
    INSERT activity.PracticeDefinition(Code,PracticeType,Title,Status)
      VALUES('historic-garden-example','PracticalMicroChallenge','Historic micro challenge','Published');
    DECLARE @definition bigint = SCOPE_IDENTITY();
    DECLARE @legacyContent nvarchar(max)=(SELECT 'practical' AS practiceType, 'choice-questions' AS responseMethod
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
    INSERT activity.PracticeVersion(DefinitionId,VersionNo,ContentRef,ContentJson,DifficultyTier,EvidenceTier,ValidationVersion,PublishedAtUtc)
      VALUES(@definition,1,'legacy',@legacyContent,1,'SystemScored','legacy-1',SYSUTCDATETIME());
    INSERT activity.PracticeAttempt(PersonId,PracticeVersionId,Source,Status,Valid,OutcomeCode,ScoreValue,StartedAtUtc,EndedAtUtc)
      VALUES(@owner,SCOPE_IDENTITY(),'OnDemand','Completed',1,'PracticeScoredReward',1,SYSUTCDATETIME(),SYSUTCDATETIME());
    INSERT activity.OfflineRoutine(PersonId,Title,Status) VALUES(@owner,'Second routine','Active');
    INSERT activity.RoutineCheckIn(RoutineId,PersonId,LocalDate,State,RecordedAtUtc)
      VALUES(SCOPE_IDENTITY(),@owner,DATEADD(day,-1,CONVERT(date,'${current.today}')),'Done',SYSUTCDATETIME());`);
  const [earned,reloaded] = await Promise.all([readGarden(owner),readGarden(owner)]);
  assert.deepEqual(earned,reloaded);
  assert.ok(earned.types.every(row=>row.stage===1 && row.sources.length===1));
  assert.equal(earned.routineDays.length,4);
  assert.deepEqual(earned.flowers.map(row=>[row.key,row.source]),[['routine-flower:3','Self-reported']]);
  assert.deepEqual(earned.policy.treeSteps,[1,3,7,12]);
  assert.deepEqual(earned.policy.flowerAt,[3,10,21]);
  assert.deepEqual(await saved(await other.request(gardenPath+'?cycleId='+active.cycleId)),baseline);

  await shiftRecoveryCycle(active.cycleId,60);
  const aged = await readGarden(owner);
  const shape = state => state.types.map(row=>[row.stage,row.sources.map(source=>source.key)]);
  assert.deepEqual(shape(aged),shape(earned));
  assert.deepEqual(aged.flowers,earned.flowers);
  const ended = await saved(await owner.request(recovery));
  await saved(await submitCycleReview(owner,ended,'Keep my practice history.'));
  await saved(await continueCycle(owner,ended));
  const preview = await saved(await owner.request(recovery));
  await saved(await writePlan(owner,preview));
  const fresh = session();
  await fresh.signIn('garden-owner',false);
  assert.deepEqual(await readGarden(fresh),aged);
});


test('Personal Garden derives bounded decorations and reviewed work from verified SQL sources', async () => {
  const member = session(), other = session(), supervisor = session();
  await member.signIn('garden-attendee');
  await other.signIn('garden-booking-only');
  await supervisor.signIn('garden-supervisor');
  const active = await activateFor(member,['depth']);
  const firstPractice = Number(active.actions.find(item=>item.kind==='Practice').id.slice(11));
  const person = name => `(SELECT Id FROM iam.Person WHERE NormalizedEmail=UPPER('${name}@example.test'))`;
  await sql(`
    DECLARE @now datetime2(3)=SYSUTCDATETIME(), @member bigint=${person('garden-attendee')},
      @other bigint=${person('garden-booking-only')}, @staff bigint=${person('garden-supervisor')};
    INSERT org.Organization(Kind,Name,Status,CountryCode) VALUES('Institution','Garden evidence institution','Verified','JO');
    DECLARE @institution bigint=SCOPE_IDENTITY();
    INSERT provider.Experience(OrganizationId,Kind,Status) VALUES(@institution,'Camp','Draft');
    DECLARE @camp bigint=SCOPE_IDENTITY();
    DECLARE @snapshot nvarchar(max)=(SELECT 'Garden skills camp' AS title FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
    DECLARE @completionBasis nvarchar(max)=(SELECT 4 AS requiredDays FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
    INSERT provider.ExperienceRevision(ExperienceId,RevisionNo,Title,Venue,TimeZoneId,StartsAtUtc,EndsAtUtc,Capacity,WaitlistEnabled,
       AudienceCode,ConsentNoticeVersion,SafetyRef,CancellationPolicyRef,CostKind,CompletionRuleRef,
       PublishedSnapshotJson,PublishedByPersonId,PublishedAtUtc)
    VALUES(@camp,1,'Garden skills camp','Test venue','Asia/Amman',DATEADD(day,-6,@now),DATEADD(day,-1,@now),10,0,
      'public','v1','safety/v1','cancel/v1','Free','completion/required-attendance',@snapshot,@staff,DATEADD(day,-20,@now));
    DECLARE @revision bigint=SCOPE_IDENTITY();
    UPDATE provider.Experience SET Status='Completed',CurrentRevisionId=@revision WHERE Id=@camp;
    INSERT org.StaffAppointment(ExperienceId,Role,Status,NormalizedEmail,TokenHash,ExpiresAtUtc,InvitedByPersonId,InvitedAtUtc,
       PersonId,AcceptedAtUtc)
    VALUES(@camp,'Supervisor','Active','GARDEN-SUPERVISOR@EXAMPLE.TEST',0x0101,DATEADD(day,-15,@now),@staff,DATEADD(day,-20,@now),
      @staff,DATEADD(day,-19,@now));
    DECLARE @appointment bigint=SCOPE_IDENTITY();
    INSERT provider.ExperienceBooking(ExperienceId,PersonId,RevisionId,Status,Mode,ConsentAtUtc,BookedAtUtc,ConfirmedAtUtc)
    VALUES(@camp,@member,@revision,'Confirmed','InPerson',DATEADD(day,-10,@now),DATEADD(day,-10,@now),DATEADD(day,-10,@now));
    DECLARE @booking bigint=SCOPE_IDENTITY();
    INSERT provider.ExperienceBooking(ExperienceId,PersonId,RevisionId,Status,Mode,ConsentAtUtc,BookedAtUtc,ConfirmedAtUtc)
    VALUES(@camp,@other,@revision,'Confirmed','InPerson',DATEADD(day,-10,@now),DATEADD(day,-10,@now),DATEADD(day,-10,@now));
    DECLARE @foreign bigint=SCOPE_IDENTITY();
    DECLARE @sessions TABLE(Id bigint, Title nvarchar(160), Starts datetime2(3));
    INSERT session.Session(ExperienceId,Title,Mode,Status,TimeZoneId,StartsAtUtc,EndsAtUtc,AttendanceRequired,InPersonCapacity,
      CheckInBeforeMinutes,CheckInAfterMinutes)
    OUTPUT inserted.Id, inserted.Title, inserted.StartsAtUtc INTO @sessions
    SELECT @camp,entry.Title,'InPerson','Completed','Asia/Amman',DATEADD(hour,entry.AtHours,@now),
      DATEADD(hour,entry.AtHours+1,@now),1,10,30,15
    FROM (VALUES('Absent session',-120),('Invalid actor',-116),('Foreign booking',-112),
      ('Verified first',-100),('Verified second',-80),('Verified third',-60),('Verified fourth',-40)) AS entry(Title,AtHours);
    INSERT session.SessionDuty(SessionId,StaffAppointmentId,AssignedByPersonId,AssignedAtUtc)
    SELECT Id,@appointment,@staff,DATEADD(day,-8,@now) FROM @sessions;
    INSERT session.Attendance(SessionId,PersonId,BookingId,Status,Method,RecordedByPersonId,RecordedAtUtc)
    SELECT Id,@member,CASE WHEN Title='Foreign booking' THEN @foreign ELSE @booking END,
       CASE WHEN Title='Absent session' THEN 'Absent' WHEN Title='Verified second' THEN 'Late' ELSE 'Present' END,
       'BookingCode',CASE WHEN Title='Invalid actor' THEN @other ELSE @staff END,Starts FROM @sessions;
    INSERT session.Completion(Kind,PersonId,BookingId,Status,BasisJson)
      VALUES('Camp',@member,@booking,'Pending',@completionBasis);
    INSERT session.Completion(Kind,PersonId,BookingId,Status,EvaluatorPersonId,EvaluatedAtUtc,BasisJson)
      VALUES('Camp',@other,@foreign,'Completed',@staff,DATEADD(day,-1,@now),@completionBasis);
    INSERT institution.Initiative(InstitutionId,Status) VALUES(@institution,'Draft');
    DECLARE @initiative bigint=SCOPE_IDENTITY();
    INSERT org.StaffAppointment(InitiativeId,Role,Status,NormalizedEmail,TokenHash,ExpiresAtUtc,InvitedByPersonId,InvitedAtUtc,
      PersonId,AcceptedAtUtc)
    VALUES(@initiative,'Coach','Active','GARDEN-SUPERVISOR@EXAMPLE.TEST',0x0102,DATEADD(day,-8,@now),@staff,
      DATEADD(day,-12,@now),@staff,DATEADD(day,-10,@now));
    DECLARE @coach bigint=SCOPE_IDENTITY();
    INSERT coach.OperationalGroup(InitiativeId,Name,Status,CoachPersonId,CoachStaffAppointmentId,CoachAssignedAtUtc)
    VALUES(@initiative,'Reading group','Open',@staff,@coach,DATEADD(day,-9,@now));
    DECLARE @groupId bigint=SCOPE_IDENTITY();
    INSERT task.Assignment(GroupId,AuthorPersonId,Status,Title,PracticeVersionId,Instructions,ReviewMode,IsRequired)
    SELECT @groupId,@staff,'Published','Reviewed reading assignment',PracticeVersionId,'Complete the passage','CoachReview',1
    FROM recovery.ScheduledAction WHERE Id=${firstPractice};
    DECLARE @assignment bigint=SCOPE_IDENTITY();
    INSERT task.AssignmentRecipient(AssignmentId,PersonId,Status,LastAttemptNo,AssignedAtUtc,AssignedRevisionNo)
    VALUES(@assignment,@member,'Approved',1,DATEADD(day,-5,@now),1);
    INSERT task.SubmissionAttempt(RecipientId,AttemptNo,Body,SubmittedAtUtc)
    VALUES(SCOPE_IDENTITY(),1,'Submitted reading work',DATEADD(day,-4,@now));
    INSERT task.ReviewDecision(AttemptId,ReviewerPersonId,Decision,DecidedAtUtc)
    VALUES(SCOPE_IDENTITY(),@staff,'Approved',DATEADD(day,-3,@now));
  `);
  let garden = await readGarden(member);
  assert.deepEqual(garden.rabbits.map(item=>item.title),['Verified first','Verified second','Verified third']);
  assert.equal(garden.birdhouses.length,0);
  assert.equal(garden.types[0].sources[0].source,'Coach-approved task');
  assert.deepEqual((await readGarden(other)).rabbits,[]);
  assert.deepEqual((await readGarden(other)).birdhouses,[]);
  assert.ok((await readGarden(other)).types.every(item=>item.sources.length===0));
  const complete = evaluator => sql(`UPDATE session.Completion SET Status='Completed', EvaluatedAtUtc=DATEADD(day,-1,SYSUTCDATETIME()),
    EvaluatorPersonId=${person(evaluator)} WHERE Kind='Camp' AND PersonId=${person('garden-attendee')}`);
  await complete('garden-booking-only');
  assert.deepEqual((await readGarden(member)).birdhouses,[]);
  await complete('garden-supervisor');
  garden = await readGarden(member);
  assert.deepEqual(garden.birdhouses.map(item=>item.title),['Garden skills camp']);
  assert.deepEqual(await readGarden(member),garden);
  await sql(`UPDATE org.StaffAppointment SET Status='Revoked',EndedAtUtc=SYSUTCDATETIME()
    WHERE Role='Supervisor' AND PersonId=${person('garden-supervisor')};
    UPDATE session.SessionDuty SET Status='Revoked',RevokedAtUtc=SYSUTCDATETIME()
    WHERE StaffAppointmentId IN (SELECT Id FROM org.StaffAppointment WHERE Role='Supervisor' AND PersonId=${person('garden-supervisor')});`);
  assert.deepEqual(await readGarden(member),garden);
  await sql(`UPDATE session.Completion SET Status='NotMet' WHERE Kind='Camp' AND PersonId=${person('garden-attendee')};
    INSERT task.ReviewDecision(AttemptId,SupersedesId,ReviewerPersonId,Decision,DecidedAtUtc)
      SELECT AttemptId,Id,ReviewerPersonId,'NeedsRevision',SYSUTCDATETIME() FROM task.ReviewDecision
      WHERE ReviewerPersonId=${person('garden-supervisor')} AND Decision='Approved';`);
  const corrected = await readGarden(member);
  assert.deepEqual(corrected.birdhouses,[]);
  assert.deepEqual(corrected.types[0].sources,[]);
  assert.equal(await sql(`SELECT COUNT(*) FROM task.ReviewDecision WHERE ReviewerPersonId=${person('garden-supervisor')}`),'2');
});


test('Home preview and existing Personal Garden show the same saved rewards after refresh', async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});
    await registerBrowser(context,'Garden Browser','garden-browser@example.test');
    const active = await activateBrowser(context,'depth');
    const action = active.actions.find(row=>row.kind==='Practice');
    const headers = {RequestVerificationToken:(await (await context.request.get(origin+recovery)).json()).requestToken};
    const path = origin+'/api/activities/depth/'+action.id.slice(11)+'/attempt';
    assert.equal((await context.request.post(path,{headers})).status(),200);
    assert.equal((await context.request.post(path+'/submit',{headers,data:{answers:[0,1,2,3]}})).status(),200);
    const routine = Number(active.routines[0].id.slice(12));
    const checkIn = await context.request.put(origin+'/api/offline-routines/'+routine+'/check-in',{headers,data:{status:'done'}});
    assert.equal(checkIn.status(),200,await checkIn.text());
    await sql(`INSERT activity.RoutineCheckIn(RoutineId,PersonId,LocalDate,State,RecordedAtUtc)
      SELECT RoutineId,PersonId,DATEADD(day,offset.days,LocalDate),'Done',RecordedAtUtc
      FROM activity.RoutineCheckIn CROSS JOIN (VALUES(-1),(-2)) AS offset(days) WHERE RoutineId=${routine}`);
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const personal = origin+'/src/pages/member/garden/garden.html';
    await page.goto(personal);
    await page.locator('.garden-kind[data-kind="depth"]').getByText('Sprout (1)').waitFor();
    assert.equal(await page.locator('.garden-kind').count(),4);
    const label = await page.locator('#garden-canvas').getAttribute('aria-label');
    assert.match(label,/Depth Practice sprout/);
    assert.match(label,/1 flower/);
    await page.reload();
    await page.locator('.garden-kind[data-kind="depth"]').getByText('Sprout (1)').waitFor();
    assert.equal(await page.locator('#garden-canvas').getAttribute('aria-label'),label);
    await page.goto(origin+'/');
    await page.locator('#space-garden-title').getByText('1 of 4 trees growing · 1 qualifying record').waitFor();
    assert.match(await page.locator('#space-garden-note').textContent(),/Depth: sprout/);
    assert.match(await page.locator('#space-garden-note').textContent(),/1 flower/);
    assert.equal(await page.locator('#mini-garden .mini-plant').count(),4);
    await page.route('**/api/personal-garden',route=>route.fulfill({status:503,body:'Unavailable'}));
    await page.reload();
    await page.locator('#space-garden-title').getByText('Garden unavailable').waitFor();
    assert.equal(await page.locator('#mini-garden .mini-plant').count(),0);
    await page.goto(personal);
    await page.locator('#garden-next[role=alert]').waitFor();
    assert.equal(await page.locator('.garden-kind').count(),0);
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
  }
});


test('Home and Roadmap open the final review, retain History, and require activation in the existing preview', async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({reducedMotion:'reduce'});
    await registerBrowser(context,'Cycle Browser','cycle-browser@example.test');
    const active = await activateBrowser(context,'depth');
    await shiftRecoveryCycle(active.cycleId,28);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error=>errors.push(error.message));
    await page.goto(origin+'/');
    await page.locator('#week-next').getByRole('link',{name:'Review my cycle'}).click();
    await page.locator('#recovery-status-title').getByText(/Ready for final review/).waitFor();
    await page.locator('#cycle-evidence').getByText(/Week 2 · No recorded practice schedule/).waitFor();
    const reflection='My schedule works best with a short reading practice.';
    await page.locator('#cycle-reflection').fill(reflection);
    await page.locator('#review-cycle').click();
    await page.getByText('Your cycle review is saved.').waitFor();
    await page.locator('#next-cycle').click();
    await page.locator('[data-stage="preview"] #activate').waitFor();
    const current = async() => (await context.request.get(origin+recovery)).json();
    const prior = await current();
    assert.equal(prior.cycleNumber,2);
    assert.equal(prior.status,'Preview');
    assert.deepEqual(prior.actions,[]);
    await page.goto(origin+'/src/pages/member/recovery-plan/recovery-plan.html#history');
    await page.locator('#recovery-history').getByText('Recovery cycle 1',{exact:true}).click();
    await page.locator('#recovery-history').getByText(reflection).waitFor();
    await page.goto(origin+'/src/pages/member/onboarding/starting-point.html');
    await page.locator('[data-stage="preview"] #activate').click();
    await page.locator('[data-stage="done"]').waitFor();
    const activated = await current();
    assert.equal(activated.status,'Active');
    assert.equal(activated.cycleNumber,2);
    assert.equal(activated.history[0].cycleReview.reflection,reflection);
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
  }
});


test('Weekly Review offers conservative continuation in the existing UI and Roadmap reloads its schedule', async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext();
    await registerBrowser(context,'Weekly Browser','weekly-browser@example.test');
    const active = await activateBrowser(context,'depth');
    await shiftRecoveryCycle(active.cycleId,7);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const path = origin+'/src/pages/member/weekly-review/weekly-review.html?week=1';
    await page.goto(path);
    await page.getByRole('radio',{name:/Continue without answering/}).click();
    await page.getByText(/Conservative continuation keeps your time preference/).waitFor();
    await page.getByRole('button',{name:'Save continuation'}).click();
    await page.getByRole('heading',{name:'Your next schedule is set.'}).waitFor();
    await page.getByRole('link',{name:'Open my plan'}).click();
    await page.locator('#weekly-review-link').waitFor({state:'visible'});
    await page.reload();
    const weeks = await page.evaluate(async()=> (await window.DeepSproutAccount.load()).plan().direction.map(week=>week.detailed));
    assert.deepEqual(weeks,[true,true,false,false]);
    await page.goto(path);
    await page.getByRole('radio',{name:'About right'}).waitFor();
    assert.equal(await page.getByRole('radio',{name:/Continue without answering/}).count(),0);
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
  }
});


test('Activities and Weekly Review render and save their own SQL records in the browser', async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext();
    await registerBrowser(context,'SQL Activities','sql-activities@example.test');
    const read = async path => {
      const response = await context.request.get(origin+path);
      assert.equal(response.status(),200,await response.text());
      return response.json();
    };
    const setupState = await read(setup);
    for (const [question,answer] of Object.entries(answers)) {
      const response = await context.request.put(origin+setup+'/answers',{
        headers:{RequestVerificationToken:setupState.requestToken},data:{question,answer,finish:question==='dailyMinutes'}
      });
      assert.equal(response.status(),200,await response.text());
    }
    const preview = await read(recovery);
    const headers = {RequestVerificationToken:preview.requestToken};
    const edit = await context.request.put(origin+recovery+'/preview',{headers,data:{
      cycleId:preview.cycleId,version:preview.plan.version,preferences:{...preview.plan.preferences,
        activityTypes:['depth'],routine:{title:'Read on paper',minutes:5,days:[1]}}
    }});
    assert.equal(edit.status(),200,await edit.text());
    const edited = await edit.json();
    const activation = await context.request.post(origin+recovery+'/activate',{headers,data:{
      cycleId:preview.cycleId,version:edited.plan.version
    }});
    assert.equal(activation.status(),200,await activation.text());
    const active = await activation.json();
    const first = active.actions.find(item=>item.kind==='Practice');
    const page = await context.newPage();
    await page.route('**/src/data/practices.json', async route => {
      const response = await route.fetch();
      const catalog = await response.json();
      const example = catalog.definitions.find(item=>item.id===first.activityCode);
      example.content = 'This browser catalog has changed.';
      example.questions.forEach(question=>{ question.answer = 0; });
      await route.fulfill({response,json:catalog});
    });
    const training = origin+'/src/pages/member/training/training.html?session=depth&practice='+first.activityCode;
    await page.goto(training);
    const begin = page.getByRole('button',{name:/^(Open|Resume) scheduled practice$/});
    await begin.click();
    await page.locator('.practice-passage').getByText(/spare pencils/).waitFor();
    const answer = (question,option) => page.locator(`input[name="answer-${question}"][value="${option}"]`);
    await answer(0,0).check();
    await page.getByRole('button',{name:'Pause attempt'}).click();
    await page.getByText('Attempt paused. Open the scheduled practice to resume.').waitFor();
    await page.reload();
    await begin.click();
    await page.waitForFunction(()=>document.querySelector('input[name="answer-0"][value="0"]')?.checked);
    for (const [index,value] of [1,2,0].entries()) await answer(index+1,value).check();
    await page.locator('#complete-session').click();
    await page.getByRole('heading',{name:'Completed · 3 of 4 correct'}).waitFor();
    await page.getByRole('button',{name:'Back to Activities'}).click();
    await page.locator('#practice-history').getByText('The shared shelf').waitFor();
    const growth = await page.evaluate(() => window.DeepSproutAccount.current().practiceGarden().types
      .find(type=>type.id==='depth').sources);
    assert.equal(growth.length,1);
    const savedState = await read(recovery);
    assert.equal(savedState.actions.find(item=>item.id===first.id).result.score,.75);
    await sql(`UPDATE a SET LocalDate=DATEADD(day,-5,a.LocalDate) FROM recovery.ScheduledAction a
      JOIN recovery.RecoveryCycle c ON c.Id=a.CycleId WHERE c.PublicId='${preview.cycleId}';
      UPDATE recovery.RecoveryCycle SET StartLocalDate=DATEADD(day,-5,StartLocalDate),
        EndLocalDate=DATEADD(day,-5,EndLocalDate) WHERE PublicId='${preview.cycleId}';`);
    await page.goto(origin+'/src/pages/member/weekly-review/weekly-review.html?week=1');
    await page.getByRole('radio',{name:'About right'}).click();
    await page.getByRole('radio',{name:'Yes, they fit'}).click();
    await page.getByRole('radio',{name:/Keep Current Pace/}).click();
    await page.locator('#save-review').click();
    await page.getByRole('heading',{name:'Your next schedule is set.'}).waitFor();
    const after = await read(recovery);
    assert.equal(after.reviews.length,1);
    assert.equal(after.actions.find(item=>item.id===first.id).result.id,savedState.actions.find(item=>item.id===first.id).result.id);
  } finally {
    await browser.close();
  }
});

test('the Listening & Recall player uses pinned audio and saves its scheduled score and routine check-in', async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext();
    await registerBrowser(context,'Listening Activity','listening-activity@example.test');
    const active = await activateBrowser(context,'listening');
    const first = active.actions.find(item=>item.kind==='Practice');
    const headers = {RequestVerificationToken:(await (await context.request.get(origin+recovery)).json()).requestToken};
    const start = await context.request.post(origin+'/api/activities/attempts',{headers,data:{
      requestId:randomUUID(),actionId:Number(first.id.replace('sql-action-','')),mode:'standard'
    }});
    assert.equal(start.status(),200,await start.text());
    const state = await start.json();
    const attemptPath = origin+'/api/activities/attempts/'+state.attemptId;
    assert.equal(state.definition.audioVersion,'practice-listening-l1-a-audio-1');
    assert.equal('content' in state.definition,false);
    assert.equal((await context.request.post(attemptPath+'/submit',{headers,data:{answers:[0,1,2,3]}})).status(),409);
    assert.equal((await context.request.post(attemptPath+'/audio-finish',{headers,data:{duration:999}})).status(),409);

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    const training = origin+'/src/pages/member/training/training.html';
    await page.goto(training+'?session=listening&practice='+first.activityCode);
    await page.getByRole('button',{name:'Resume scheduled practice'}).click();
    const audio = page.locator('#practice-audio');
    await audio.evaluate(element=>element.play());
    await page.getByText('Original playback completed. Answer the recall questions.').waitFor({timeout:40_000});
    for (const [index,value] of [0,1,2,3].entries())
      await page.locator(`input[name="answer-${index}"][value="${value}"]`).check();
    await page.locator('#complete-session').click();
    await page.getByRole('heading',{name:'Completed · 4 of 4 correct'}).waitFor();
    await page.getByRole('button',{name:'Back to Activities'}).click();
    await page.locator('#routine-input').fill('Practise an instrument');
    await page.locator('#routine-form').evaluate(form=>form.requestSubmit());
    const row = page.locator('.routine-item').filter({hasText:'Practise an instrument'});
    await row.getByRole('button',{name:/as done today/}).click();
    await row.getByRole('button',{name:/back to To do/}).waitFor();
    await page.reload();
    await row.getByRole('button',{name:/back to To do/}).waitFor();
    const reloaded = await (await context.request.get(origin+recovery)).json();
    assert.equal(reloaded.actions.find(item=>item.id===first.id).result.score,1);
    assert.equal(reloaded.activities.history[0].attemptId,state.attemptId);
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
  }
});


test('anonymous requests and writes without antiforgery are rejected', async () => {
  const guest = session();
  assert.equal((await guest.request(setup)).status, 401);
  assert.equal((await guest.request(setup + '/start', { method: 'POST' })).status, 401);
  const alice = session();
  await alice.signIn('csrf');
  assert.equal((await alice.request(setup + '/start', { method: 'POST' })).status, 400);
});

test('authenticated answers persist, including when separate requests write concurrently', async () => {
  const alice = session();
  await alice.signIn('draft');
  assert.equal((await alice.read()).stage, 'Started');
  assert.equal((await saved(await alice.write('start'))).stage, 'QuickSetup');
  const responses = await Promise.all([alice.save('change', answers.change), alice.save('apps', answers.apps)]);
  for (const response of responses) await saved(response);
  const state = await alice.read();
  assert.equal(state.stage, 'QuickSetup');
  assert.equal(state.answersVersion, 2);
  assert.deepEqual(state.answers, { change: answers.change, apps: answers.apps });
  assert.equal(state.setupComplete, false);
  assert.equal(state.journeyLevel, 1);
});

test('validates every answer and denies finishing with missing answers', async () => {
  const alice = session();
  await alice.signIn('validation');
  await alice.read();
  for (const [question, answer] of Object.entries({
    change: 'invented', apps: ['instagram', 'instagram'], dailyScroll: 120,
    moments: 'always', makeTimeFor: [], dailyMinutes: '25', arbitrary: 'other'
  })) assert.equal((await alice.save(question, answer)).status, 400, question);
  assert.equal((await alice.save('dailyMinutes', '10', true)).status, 400);
  assert.equal((await alice.read()).answers, null);
});

test('uses the authenticated person and isolates another account', async () => {
  const alice = session(), bob = session();
  await alice.signIn('isolation-a');
  await bob.signIn('isolation-b');
  const a = await alice.read(), b = await bob.read();
  assert.notEqual(a.subject, b.subject);
  assert.equal((await alice.write('answers', {
    question: 'change', answer: answers.change, personId: 999
  })).status, 400);
  await saved(await alice.save('change', answers.change));
  assert.equal((await bob.read()).answers, null);
  assert.equal((await alice.read()).answers.change, answers.change);
});

test('resumes in a fresh login and preserves completion, prior answers and attribution on edit', async () => {
  const alice = session();
  await alice.signIn('progress');
  await alice.read();
  for (const [question, answer] of Object.entries(answers).slice(0, 3))
    await saved(await alice.save(question, answer));

  const fresh = session();
  assert.equal(await fresh.signIn('progress', false), onboarding);
  assert.deepEqual((await fresh.read()).answers, Object.fromEntries(Object.entries(answers).slice(0, 3)));
  for (const [question, answer] of Object.entries(answers).slice(3))
    await saved(await fresh.save(question, answer));
  assert.equal((await fresh.read()).stage, 'QuickSetup');
  assert.equal((await saved(await fresh.save('dailyMinutes', '10', true))).stage, 'Story');
  assert.equal((await saved(await fresh.write('home'))).stage, 'Home');
  const where = "p.PersonId = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'PROGRESS@EXAMPLE.TEST')";
  const timestamp = async () => sql(`SELECT CONVERT(varchar(30), OnboardingCompletedAtUtc, 126)
    FROM personal.IndividualProfile p WHERE ${where};`);
  const completedAt = await timestamp();
  assert.match(completedAt, /^\d{4}-\d{2}-\d{2}T/);
  const edited = await saved(await fresh.save('change', 'offline-time'));
  assert.equal(edited.stage, 'Home');
  assert.equal(edited.journeyLevel, 1);
  await saved(await fresh.save('change', 'offline-time'));
  const returning = session();
  await returning.signIn('progress', false);
  assert.deepEqual((await returning.read()).answers, { ...answers, change: 'offline-time' });
  assert.equal(await timestamp(), completedAt);
  assert.equal(await sql(`SELECT COUNT(*) FROM ops.AuditEvent a
    JOIN personal.IndividualProfile p ON a.ResourceId = p.Id AND a.ActorPersonId = p.PersonId
    WHERE ${where} AND p.GoalCode = N'offline-time' AND a.ResourceKind = N'IndividualProfile'
      AND a.Action = N'QuickSetupAnswersUpdated' AND a.BeforeStatus = N'Home' AND a.AfterStatus = N'Home'
      AND JSON_VALUE(a.DetailJson, '$.previousAnswersVersion') = '2'
      AND JSON_VALUE(a.DetailJson, '$.previousAnswers.change') = 'reduce-scrolling'
      AND JSON_VALUE(a.DetailJson, '$.previousAnswers.dailyMinutes') = '10';`), '1');
  assert.equal(await sql(`SELECT COUNT(*) FROM recovery.RecoveryCycle r
    JOIN personal.IndividualProfile p ON p.PersonId = r.PersonId WHERE ${where};`), '0');
});

test('preserves version 1 answers in the audit when moving to version 2', async () => {
  const alice = session();
  await alice.signIn('legacy');
  await alice.read();
  await sql(`UPDATE personal.IndividualProfile
    SET SetupAnswersJson = (SELECT N'legacy answer' AS legacyQuestion FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        SetupAnswersVersion = 1
    WHERE PersonId = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'LEGACY@EXAMPLE.TEST');`);
  assert.deepEqual((await alice.read()).answers, { legacyQuestion: 'legacy answer' });
  await saved(await alice.save('change', answers.change));
  assert.equal(await sql(`SELECT COUNT(*) FROM ops.AuditEvent
    WHERE ActorPersonId = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'LEGACY@EXAMPLE.TEST')
      AND JSON_VALUE(DetailJson, '$.previousAnswersVersion') = '1'
      AND JSON_VALUE(DetailJson, '$.previousAnswers.legacyQuestion') = 'legacy answer';`), '1');
});

test('the browser waits for persistence, resumes, and reaches Home without activating Week 1', async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.goto(origin + register + '#individual');
    await page.locator('[name=DisplayName]').fill('Browser Test');
    await page.locator('[name=Email]').fill('browser@example.test');
    await page.locator('[name=Password]').fill(password);
    await page.locator('[name=ConfirmPassword]').fill(password);
    await page.locator('[name=AcceptTerms]').check();
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**' + onboarding);
    await page.locator('#meet-begin').click();
    await page.route('**/api/onboarding/answers', route => route.fulfill({status: 503}));
    await page.locator('input[value=reduce-scrolling]').locator('..').click();
    await page.locator('#qs-next').click();
    await page.locator('#qs-error').getByText('Your setup could not be saved. Try again.').waitFor();
    await page.waitForFunction(() => !document.querySelector('#qs-question fieldset').disabled);
    assert.equal(await page.locator('#q-step').textContent(), 'Question 1 of 6');
    assert.equal(await page.locator('#qs-saved').textContent(), '');
    await page.unroute('**/api/onboarding/answers');
    await page.locator('#qs-next').click();
    await page.locator('#q-step').getByText('Question 2 of 6').waitFor({ state: 'attached' });
    await page.reload();
    await page.locator('#q-step').getByText('Question 2 of 6').waitFor({ state: 'attached' });
    for (const option of ['instagram', '60-120', 'before-bed', 'walking-sports', '10']) {
      await page.locator(`#qs-question input[value="${option}"]`).locator('..').click();
      await page.locator('#qs-next').click();
    }
    await page.locator('#ready-title').waitFor({ state: 'visible' });
    await page.locator('#ready-story').click();
    await page.waitForURL('**/hero-reels-lab.html?flow=onboarding');
    await page.locator('.dawn-skip').click();
    await page.waitForURL('**/index.html');
    await page.locator('.level0-status').getByText(/Level 1/).waitFor();
    assert.match(await page.locator('#week-empty').innerText(), /self-reported/);
    assert.deepEqual(await page.evaluate(async () => {
      const account = await window.DeepSproutAccount.load();
      const state = await window.DeepSproutAccount.quickSetup();
      return [state.stage, account.plan(), account.checkInWindow().state];
    }), ['Home', null, 'optional']);
    await page.goto(origin + onboarding + '?step=setup');
    await page.locator('input[value=reduce-scrolling]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('input[value=reduce-scrolling]').isChecked(), true);
    await page.goto(origin + '/src/pages/member/onboarding/starting-point.html');
    await page.locator('.sp-stage[data-stage="preview"]:visible').waitFor();
    assert.equal(await page.locator('#activate').isDisabled(),true);
    await page.locator('#commitment-grid button').first().click();
    await page.waitForFunction(() => !document.getElementById('activate').disabled);
    await page.locator('#plan-minutes').selectOption('15');
    await page.waitForFunction(() => document.getElementById('week-list').textContent.includes('15 minutes'));
    await page.locator('#preview-days label').getByText('Day 2', {exact:true}).click();
    await page.waitForFunction(() => document.getElementById('plan-days').value === '4');
    await page.reload();
    await page.locator('.sp-stage[data-stage="preview"]:visible').waitFor();
    assert.equal(await page.locator('#plan-minutes').inputValue(),'15');
    assert.equal(await page.locator('#plan-days').inputValue(),'4');
    await page.locator('#activate').click();
    await page.locator('.sp-stage[data-stage="done"]:visible').waitFor();
    assert.deepEqual(await page.evaluate(async () => {
      const account = await window.DeepSproutAccount.load();
      return account.exportRecord().plan.baselineIds;
    }), []);
    await page.goto(origin + '/src/pages/member/recovery-plan/recovery-plan.html');
    await page.locator('#recovery-status-title').getByText(/Active · Cycle 1/).waitFor();
    assert.match(await page.locator('#today-note').innerText(),/15 minute budget/);
  } finally {
    await browser.close();
  }
});

test('Roadmap, Activities and Digital Shield wait for the signed-in identity', async t => {
  const browser = await chromium.launch(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await registerBrowser(context, 'Member Pages', 'member-pages@example.test');
    const { subject } = await (await context.request.get(origin + setup)).json();
    assert.match(subject, /^server-/);

    const checks = {
      'recovery-plan/recovery-plan.html': async page => {
        await page.locator('#tab-adjust').click();
        await page.locator('#panel-adjust').waitFor();
      },
      'training/training.html': async page => {
        const save = page.locator('[data-save="depth"]');
        assert.equal(await page.locator('[data-save="listening"]').getAttribute('aria-pressed'), 'false');
        await save.click();
        assert.equal(await save.getAttribute('aria-pressed'), 'true');
        assert.deepEqual(await page.evaluate(id => [
          localStorage.getItem(`deepsprout-training-saved:person:${id}`),
          localStorage.getItem('deepsprout-training-saved:person:preview')
        ], subject), ['["depth"]', '["listening"]']);
      },
      'shield/shield.html': async page => {
        await page.waitForFunction(() => !!window.DeepSproutShield?.view().personId);
        assert.equal(await page.evaluate(() => DeepSproutShield.view().personId), subject);
        await page.locator('#legacy-title').click();
        await page.locator('#shield-time').fill('20:15');
        await page.locator('[form=shield-form][type=submit]').click();
        await page.locator('#save-message').getByText('Preferences saved in this browser.').waitFor();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelector('#shield-time').value === '20:15');
      }
    };

    for (const [path, check] of Object.entries(checks)) {
      await t.test(path, async () => {
        const page = await context.newPage();
        page.setDefaultTimeout(5000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => localStorage.setItem('deepsprout-training-saved:person:preview', '["listening"]'));
        let release;
        const pending = new Promise(resolve => { release = resolve; });
        await page.route('**' + setup, async route => { await pending; await route.continue(); });
        try {
          await page.goto(origin + '/src/pages/member/' + path, { waitUntil: 'domcontentloaded' });
          release();
          assert.equal(await page.evaluate(async () => (await DeepSproutAccount.load()).id), `person:${subject}`);
          await check(page);
          assert.equal(await page.locator('main').isVisible(), true);
          assert.equal(await page.locator('#personal-access-notice').count(), 0);
          assert.deepEqual(errors, []);
        } finally {
          release();
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});

test('both interactive practices save real results through the Activities page', async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await registerBrowser(context, 'New Practices', 'new-practices@example.test');
    await activateBrowser(context, 'visual-observation');
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const activities = origin + '/src/pages/member/training/training.html';
    const shot = async (name, locator = page) => {
      if (process.env.DEEPSPROUT_TEST_PRACTICE_SHOTS) {
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect.getTiming().iterations)).map(a => a.finished.catch(() => {})));
        });
        await locator.screenshot({path:join(process.env.DEEPSPROUT_TEST_PRACTICE_SHOTS,name + '.png')});
      }
    };
    await page.goto(activities);
    await page.locator('.practice-card[data-card=visual]').scrollIntoViewIfNeeded();
    await page.locator('#training-types.is-visible').waitFor();
    await shot('activities', page.locator('#training-types'));
    const open = family => page.locator(`[data-session="${family}"].practice-start`).click();
    const answer = async (index, assertCorrect) => {
      await page.locator(`.ip-option:has(input[value="${index}"])`).click();
      await page.getByRole('button',{name:'Check answer'}).click();
      await page.locator('.ip-explanation').waitFor();
      if (assertCorrect) assert.match(await page.locator('.ip-explanation h4').innerText(),/^Correct$/);
    };
    await open('visual');
    await page.getByRole('button',{name:/printmaker/}).click();
    await page.getByRole('table',{name:'Sorting tray'}).waitFor();
    assert.equal(await page.locator('[data-see-questions]').evaluate(button => getComputedStyle(button).backgroundColor), 'rgb(39, 83, 64)');
    for (const viewport of [{width:1024,height:768},{width:768,height:1024}]) {
      await page.setViewportSize(viewport);
      assert.equal(await page.locator('#session-dialog').evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth),true);
    }
    await page.setViewportSize({width:1440,height:900});
    await shot('observation');
    await page.getByText('Read the scene as text').click();
    await page.getByText('sage filled circle · Empty · ochre triangle').waitFor();
    const animated = await page.locator('[data-see-questions]').evaluate(button => {
      button.click();
      return document.querySelector('.ip-observe').getAnimations().some(animation => animation.playState === 'running');
    });
    assert.equal(animated,true);
    await page.locator('#ip-question').waitFor();
    await answer(1,true);
    await page.keyboard.press('Escape');
    await page.locator('#session-dialog').waitFor({state:'hidden'});
    await page.reload();
    await open('visual');
    await page.getByRole('button',{name:'Resume attempt'}).click();
    await page.getByText('Question 2 of 4').waitFor();
    for (const index of [0,2,3]) {
      await answer(index,true);
      await page.locator('[data-next]').click();
    }
    await page.locator('#practice-player').getByText('4 of 4 correct',{exact:true}).waitFor();
    await shot('visual-results');
    await page.getByRole('button',{name:'Back to Activities'}).click();

    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({reducedMotion:'reduce'});
    await open('judgment');
    await page.getByRole('button',{name:/focus trick/}).click();
    await page.locator('[data-source="s1"] summary').focus();
    await page.keyboard.press('Enter');
    await page.getByText(/Nine of the ten volunteers/).waitFor();
    await shot('evidence-mobile');
    assert.equal(await page.locator('#session-dialog').evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth),true);
    for (const index of [0,1,3,0]) {
      await answer(index,false);
      assert.ok(await page.getByText('Relevant to this answer').count());
      await page.locator('[data-next]').click();
    }
    await page.locator('#practice-player').getByText('0 of 4 correct',{exact:true}).waitFor();
    await page.getByText(/75% or higher/).waitFor();
    await page.getByText('Review your answers').click();
    await page.locator('#practice-player').getByText('Correct answer: Nine volunteers reported feeling more focused').waitFor();
    await page.reload();
    const journal = await page.evaluate(async()=>{
      const account=await DeepSproutAccount.load();
      return {attempts:account.practiceHistory().map(a=>[a.activityType,a.score,a.rewardEligible]),
        garden:account.practiceGarden().types.map(type=>type.sources.length), due:account.schedule().find(day=>day.isToday)?.state};
    });
    assert.deepEqual(journal.attempts,[['digital-judgment',0,false],['visual-observation',1,true]]);
    assert.deepEqual(journal.garden,[0,0,1,0]);
    assert.equal(journal.due,'completed');
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
  }
});
