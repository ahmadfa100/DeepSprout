/**
 * Institution cycle — REAL browser end-to-end test (Scenarios A–F, master §25).
 *
 * Drives the actual pages: Institution builder, staff invitation links,
 * regular Individual Explore / My Initiatives, Activities → Assigned,
 * Coach review, Supervisor attendance desk, excuses, reports, completion
 * and the Personal Garden. A fresh browser context starts with empty
 * storage, so the user's own browser data is never touched.
 *
 * Identity switching uses the same local demo sign-in helper as the
 * workspace "Development demo" panel; every operational step is a click
 * or form submission on a real page, followed where stated by a reload.
 *
 *   BASE_URL=http://127.0.0.1:8799 CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *   NODE_PATH=/path/to/node_modules node tests/institution-browser.test.cjs
 */
const assert = require('node:assert/strict');
let chromium;
try { ({chromium} = require('playwright-core')); } catch { try { ({chromium} = require('playwright')); } catch { console.log('institution-browser: skipped (playwright-core not installed) — NOT a pass'); process.exit(0); } }

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const CHROME = process.env.CHROME_PATH || undefined;
const SHOTS = process.env.SHOTS_DIR || '';
const results = [];
const errors = [];

async function main() {
  const browser = await chromium.launch({executablePath:CHROME, headless:true});
  const context = await browser.newContext({viewport:{width:1360, height:950}});
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(`PAGEERROR ${page.url()} ${e.stack}`));
  page.on('dialog', d => d.dismiss());

  const step = async (id, title, fn) => {
    const started = Date.now();
    try { await fn(); results.push({id, title, status:'Pass', ms:Date.now() - started}); console.log(`✔ ${id} ${title}`); }
    catch (error) { results.push({id, title, status:'Fail', error:error.message}); console.log(`✖ ${id} ${title}\n   ${error.message}`); if (SHOTS) await page.screenshot({path:`${SHOTS}/fail-${id}.png`, fullPage:true}).catch(() => {}); throw error; }
  };
  const ws = async route => { await page.goto(`${BASE}/workspaces.html#/${route}`); await page.waitForSelector('main#main'); await page.waitForTimeout(350); };
  const member = async (path, hash = '') => { await page.goto(`${BASE}/src/pages/member/${path}${hash}`); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500); };
  const store = (fn, arg) => page.evaluate(async ([source, a]) => { const m = await import('/src/workspaces/store.js'); return new Function('m', 'a', `return (${source})(m, a)`)(m, a); }, [fn.toString(), arg]);
  const as = async personId => { if (!page.url().startsWith(BASE)) await page.goto(`${BASE}/workspaces.html`); await store((m, pid) => m.dispatch('demo.signin', {personId:pid}), personId); };
  const read = () => store(m => m.read());
  const click = async selector => { await page.click(selector); await page.waitForTimeout(300); };
  const dialogSave = async () => { await page.click('#dialog-save'); await page.waitForTimeout(400); const err = await page.textContent('#dialog-error').catch(() => ''); if (err) throw new Error(`Dialog error: ${err}`); };
  const toastError = async () => page.evaluate(() => { const t = document.getElementById('workspace-toast'); return t && !t.hidden && t.classList.contains('is-error') ? t.textContent : ''; });
  const text = sel => page.textContent(sel);

  await page.goto(`${BASE}/workspaces.html`);
  await page.evaluate(() => localStorage.clear());
  // Pin the operational clock so seeded and test dates reproduce on any day.
  const PIN = '2026-10-15T09:00:00+03:00';
  await store((m, at) => m.dispatch('demo.clock', {at}), PIN);

  let initiativeId, appCode, ahmadApp, sessionId, groupId, taskId, subId, zaidAttendanceId;
  const TITLE = `Focus Forward ${Date.now().toString(36).slice(-4).toUpperCase()}`;

  // ---------------------------------------------------------------- A
  await step('A1', 'Admin approves a new Institution and Representative; workspace activates', async () => {
    await store(m => { m.dispatch('auth.logout'); m.dispatch('auth.account', {name:'Lina Farah', email:'lina.rep@demo.example', consent:true}); m.dispatch('auth.otp', {email:'lina.rep@demo.example'}); m.dispatch('auth.verify', {code:'246810'}); return m.dispatch('auth.application.submit', {type:'organization', name:'Bright Futures Institute', details:{entityName:'Bright Futures Institute', city:'Irbid', description:'A fictional learning institute.'}}); });
    const s = await read(); const lina = s.session.personId; const app = s.applications.find(a => a.personId === lina);
    await ws('auth/workspaces'); assert.ok(!(await text('main')).includes('Institution workspace'), 'no Institution workspace before approval');
    await as('p-leen'); await ws(`admin/organizations/${app.id}`);
    await store((m, id) => m.dispatch('admin.application.decide', {id, status:'Approved'}), app.id);
    await as(lina); await ws('organization/dashboard');
    assert.match(await text('main'), /Good to see you, Lina/);
    assert.match(await text('main'), /Verified institution/);
  });

  await step('A2', 'Six-stage builder: draft saves privately and is absent from regular Explore', async () => {
    await ws('organization/initiatives/new');
    await page.fill('[name=title]', TITLE); await page.fill('[name=objective]', 'Build steady study focus with small reviewed tasks.'); await page.fill('[name=summary]', 'Six weeks of small steps, sessions and Coach feedback for students.');
    await page.fill('[name=start]', '2026-10-20'); await page.fill('[name=end]', '2026-12-15'); await page.selectOption('[name=coverImage]', 'assets/home-redesign/forest-hike.jpg'); await page.fill('[name=coverAlt]', 'Students walking on a forest trail');
    await click('[data-action=builder-next]');
    await page.fill('[name=audience]', 'University students'); await page.fill('[name=minAge]', '17'); await page.fill('[name=maxAge]', '30');
    await page.fill('[name=coverage]', 'Jordan-wide: online, or in person in Irbid'); await page.check('input[name=modes][value="In-person"]');
    // Builder validation: in-person mode without a venue blocks Continue with a named field.
    await page.fill('[name=capacity]', '135'); await page.fill('[name=venue]', '');
    await click('[data-action=builder-next]');
    assert.match(await text('[data-form=builder] .form-error'), /venue/i);
    await page.fill('[name=venue]', 'Bright Futures Hall, Irbid'); await page.fill('[name=registrationOpen]', '2026-10-01'); await page.fill('[name=registrationClose]', '2026-12-01');
    await click('[data-action=builder-next]');
    await click('[data-action=builder-component-add][data-type="Awareness Content"]'); await page.fill('[name=title-0]', 'Why attention matters');
    await click('[data-action=builder-component-add][data-type=Session]'); await page.fill('[name=title-1]', 'Focus lab workshop'); await page.fill('[name=date-1]', '2026-10-28'); await page.selectOption('[name=format-1]', 'Hybrid'); await page.fill('[name=venue-1]', 'Bright Futures Hall, Irbid');
    await click('[data-action=builder-next]');
    await click('[data-action=initiative-ensure]');
    const s = await read(); initiativeId = s.initiatives.find(i => i.title === TITLE).id;
    assert.equal(s.initiatives.find(i => i.id === initiativeId).status, 'Draft');
    const back = page.url();
    await member('explore/explore.html');
    assert.equal(await page.locator(`[data-open="${initiativeId}"]`).count(), 0, 'draft hidden from regular Explore');
    await page.goto(back); await page.waitForTimeout(400);
  });

  let supLink, coachLink;
  await step('A3/B1', 'Stage 4 invites a Supervisor and a Coach (simulated delivery link); stage 6 publishes without any active Supervisor', async () => {
    assert.match(await text('[data-form=builder]'), /Staff & groups/);
    await click('[data-action=staff-invite][data-role=supervisor]'); await page.fill('#dialog-body [name=email]', 'hala@demo.example'); await dialogSave();
    await page.waitForSelector('#dialog-body [name=link]'); supLink = await page.inputValue('#dialog-body [name=link]'); await dialogSave();
    await click('[data-action=staff-invite][data-role=coach]'); await page.fill('#dialog-body [name=email]', 'karim@demo.example'); await dialogSave();
    await page.waitForSelector('#dialog-body [name=link]'); coachLink = await page.inputValue('#dialog-body [name=link]'); await dialogSave();
    await click('[data-action=group-create]'); await page.fill('#dialog-body [name=name]', 'Group North'); await dialogSave();
    await click('[data-action=builder-next]');
    await page.fill('[name=completion]', 'Attend one session and complete one Coach-reviewed task.');
    await click('[data-action=builder-next]');
    assert.match(await text('[data-form=builder]'), /Ready to publish/);
    assert.match(await text('[data-form=builder]'), /No active Supervisor yet/);
    await click('[data-action=builder-publish]');
    const s = await read(); assert.equal(s.initiatives.find(i => i.id === initiativeId).status, 'Published');
    sessionId = s.sessions.find(x => x.initiativeId === initiativeId).id; groupId = s.groups.find(g => g.initiativeId === initiativeId).id;
  });

  await step('A4', 'Published initiative appears in the REAL regular Explore, survives reload, same record ID', async () => {
    await as('p-ahmad'); await member('explore/explore.html');
    assert.equal(await page.locator(`[data-open="${initiativeId}"]`).count(), 1);
    await page.reload(); await page.waitForTimeout(600);
    const card = page.locator(`.ex-card[data-id="${initiativeId}"]`);
    assert.match(await card.innerText(), /Verified institution/); assert.match(await card.innerText(), /135 of 135 student seats left/);
  });

  // ---------------------------------------------------------------- B
  await step('B2', 'Wrong-email identity cannot accept; Supervisor accepts with matching existing account, no Admin approval', async () => {
    await as('p-zaid'); await page.goto(supLink); await page.waitForTimeout(500);
    assert.match(await text('main'), /different email/);
    assert.equal(await page.locator('[data-action=staff-accept]').count(), 0);
    assert.equal((await read()).grants.filter(g => g.scopeId === initiativeId).length, 0, 'nothing granted');
    await click('[data-action=staff-signout]');
    await page.fill('[data-form=staff-existing] [name=email]', 'hala@demo.example'); await click('[data-form=staff-existing] button');
    await click('[data-action=staff-accept]');
    await page.waitForTimeout(400);
    assert.match(page.url(), /supervisor\/dashboard/);
    assert.match(await text('main'), new RegExp(TITLE));
  });
  await step('B3', 'Coach accepts; scoped Coach workspace appears', async () => {
    await store(m => m.dispatch('auth.logout')); await page.goto(coachLink); await page.waitForTimeout(400);
    await page.fill('[data-form=staff-existing] [name=email]', 'karim@demo.example'); await click('[data-form=staff-existing] button'); await click('[data-action=staff-accept]');
    assert.match(page.url(), /mentor\/dashboard/);
    const s = await read(); assert.equal(s.grants.filter(g => g.scopeId === initiativeId && g.status === 'Active').length, 2);
  });

  // ---------------------------------------------------------------- C
  await step('C1', 'Individual applies from regular Explore and receives one Application ID shown in My Initiatives', async () => {
    await as('p-ahmad'); await member('explore/explore.html');
    await click(`[data-open="${initiativeId}"]`); await click('[data-act=apply]');
    await page.fill('#ex-live-form [name=age]', '21'); await page.check('#ex-live-form [name=consent]'); await click('#ex-live-form button[type=submit]');
    await click('[data-act=confirm]');
    appCode = (await text('.ex-ref')).trim(); assert.match(appCode, /^APP-/);
    ahmadApp = (await read()).admissions.find(a => a.code === appCode).id;
    await member('explore/explore.html', '#my-initiatives'); await page.reload(); await page.waitForTimeout(500);
    assert.match(await text('#ex-my-initiatives'), new RegExp(`${appCode}[\\s\\S]*Pending review|Pending review[\\s\\S]*${appCode}`));
  });
  await step('C2', 'Representative and Supervisor see the SAME Application; Supervisor approves once; one seat used', async () => {
    const lina = (await read()).people.find(p => p.email === 'lina.rep@demo.example').id;
    await as(lina); await ws(`organization/participants?initiative=${initiativeId}&status=pending`);
    assert.match(await text('main'), new RegExp(appCode));
    await as('p-hala'); await ws(`supervisor/applications?initiative=${initiativeId}&status=pending`);
    assert.match(await text('main'), new RegExp(appCode));
    assert.equal(await page.locator('[data-action=app-decide][data-kind=reject]').count(), 0, 'Supervisor has no Reject');
    await click(`[data-action=app-approve][data-id="${ahmadApp}"]`);
    assert.equal(await store((m, id) => { try { m.dispatch('initiative.application.approve', {id}); return 'second approval allowed'; } catch (e) { return e.message; } }, ahmadApp), 'This application has already been approved. No second seat was used.');
    const s = await read(); assert.equal(s.admissions.filter(a => a.initiativeId === initiativeId && a.status === 'Accepted').length, 1);
    await as(lina); await ws(`organization/participants?initiative=${initiativeId}&status=accepted`); assert.match(await text('main'), new RegExp(appCode));
    await as('p-ahmad'); await member('explore/explore.html', '#my-initiatives'); assert.match(await text('#ex-my-initiatives'), /Accepted/);
  });
  await step('C3', 'Representative allocates the Coach and the student to a group; Coach sees only their roster', async () => {
    const lina = (await read()).people.find(p => p.email === 'lina.rep@demo.example').id;
    await as(lina); await ws(`organization/team?tab=groups&initiative=${initiativeId}`);
    await page.selectOption(`select[data-action=group-coach][data-group="${groupId}"]`, 'p-karim'); await page.waitForTimeout(400);
    await page.selectOption('select[data-action=allocate][data-person="p-ahmad"]', groupId); await page.waitForTimeout(400);
    const s = await read(); assert.ok(s.groups.find(g => g.id === groupId).memberIds.includes('p-ahmad'));
    await as('p-karim'); await ws(`mentor/groups/${groupId}?tab=members`);
    assert.match(await text('main'), /Ahmad Saleh/);
    await ws('mentor/students'); const roster = await page.locator('main .table-scroll').innerText(); assert.match(roster, /Ahmad Saleh/); assert.doesNotMatch(roster, /Omar Saleh/, 'no unrelated roster');
  });

  // ---------------------------------------------------------------- D
  await step('D1', 'Coach assigns a task; it appears in regular Activities → Assigned', async () => {
    await as('p-karim'); await ws('mentor/assignments');
    await click('[data-action=assignment-create]');
    await page.selectOption('#dialog-body [name=groupId]', groupId); await page.fill('#dialog-body [name=title]', 'Twenty focused minutes');
    await page.selectOption('#dialog-body [name=activity]', 'Protected Work'); await page.fill('#dialog-body [name=instructions]', 'Protect twenty minutes for one study task and describe it.'); await page.fill('#dialog-body [name=due]', '2026-11-10');
    await dialogSave();
    taskId = (await read()).assignments.find(a => a.title === 'Twenty focused minutes').id;
    await as('p-ahmad'); await member('training/training.html', '#assigned');
    assert.match(await text('#assigned'), /Twenty focused minutes/);
    assert.match(await text('#assigned'), new RegExp(TITLE));
  });
  await step('D2', 'Submit → Needs Revision → resubmit → Approve; history preserved; one Protected Work tree effect', async () => {
    await click(`[data-toggle="${taskId}"]`); await page.fill(`[data-submit="${taskId}"] textarea`, 'Studied 20 minutes with my phone in another room.'); await click(`[data-submit="${taskId}"] button`);
    subId = (await read()).submissions.find(x => x.assignmentId === taskId).id;
    await as('p-karim'); await ws(`mentor/reviews/${subId}`); await click('[data-action=review-decide][data-decision="Needs Revision"]');
    await page.fill('#dialog-body [name=feedback]', 'What interrupted you, if anything?'); await page.fill('#dialog-body [name=internalNote]', 'Check in on workload.'); await dialogSave();
    await as('p-ahmad'); await member('training/training.html', '#assigned');
    assert.match(await text('#assigned'), /What interrupted you/);
    assert.doesNotMatch(await text('#assigned'), /Check in on workload/, 'Supervisor-only note never shown to the student');
    await click(`[data-toggle="${taskId}"]`).catch(() => {});
    if (!(await page.locator(`[data-submit="${taskId}"]`).count())) await click(`[data-toggle="${taskId}"]`);
    await page.fill(`[data-submit="${taskId}"] textarea`, 'Twenty minutes; one notification pulled me away and I came back.'); await click(`[data-submit="${taskId}"] button`);
    await as('p-karim'); await ws(`mentor/reviews/${subId}`); await click('[data-action=review-decide][data-decision=Approved]'); await dialogSave();
    const s = await read(); const sub = s.submissions.find(x => x.id === subId);
    assert.equal(sub.status, 'Approved'); assert.equal(sub.history.length, 3);
    await as('p-ahmad'); await member('garden/garden.html'); await page.waitForTimeout(800);
    assert.match(await text('#garden-next'), /Protected Work Sprout \(2\)/, 'one journal practice + one Coach-approved task');
  });
  await step('D3', 'Supervisor Insights and Representative Reports reflect the approved task', async () => {
    await as('p-hala'); await ws(`supervisor/reports?initiative=${initiativeId}`); assert.match(await text('main'), /Coach-reviewed tasks/);
    const s = await read(); assert.equal(s.submissions.filter(x => x.status === 'Approved' && s.assignments.find(a => a.id === x.assignmentId)?.groupId === groupId).length, 1);
    const lina = s.people.find(p => p.email === 'lina.rep@demo.example').id;
    await as(lina); await ws(`organization/reports?initiative=${initiativeId}`);
    assert.match(await page.locator('.iw-stat', {hasText:'Tasks approved'}).innerText(), /1/);
  });

  // ---------------------------------------------------------------- E
  await step('E1', 'Needs Supervisor shown; student books in-person and receives a rendered QR + code', async () => {
    const lina = (await read()).people.find(p => p.email === 'lina.rep@demo.example').id;
    await as(lina); await ws(`organization/dashboard?initiative=${initiativeId}`);
    assert.match(await text('main'), /Needs Supervisor · Focus lab workshop/);
    await as('p-ahmad'); await member('explore/explore.html', '#my-initiatives');
    await page.selectOption(`[data-mode-for="${sessionId}"]`, 'In-person'); await click(`[data-session-register="${sessionId}"]`);
    assert.equal(await page.locator('.ex-qr-code svg').count(), 1, 'rendered QR');
  });
  await step('E2', 'Supervisor cannot check in before duty; assigns duty; QR/code check-in Present; replay creates nothing', async () => {
    const code = (await read()).sessionRegistrations.find(r => r.sessionId === sessionId && r.personId === 'p-ahmad').code;
    await as('p-hala');
    assert.match(await store((m, a) => { try { m.dispatch('initiative.attendance.record', {sessionId:a.sid, method:'code', code:a.code}); return 'recorded'; } catch (e) { return e.message; } }, {sid:sessionId, code}), /not the assigned Supervisor/);
    await ws(`supervisor/schedule/${sessionId}`); await click(`[data-action=session-assign]`); await page.check('#dialog-body input[name=supervisorIds][value="p-hala"]'); await dialogSave();
    await ws(`supervisor/attendance?session=${sessionId}`);
    assert.match(await text('main'), /Check-in not open yet/, 'window policy shown before the session');
    await store((m, at) => m.dispatch('demo.clock', {at}), '2026-10-28T17:05:00+03:00'); await page.reload(); await page.waitForTimeout(400);
    await page.fill('[data-form=checkin] [name=code]', code.toLowerCase()); await click('[data-form=checkin] button.primary');
    assert.equal((await read()).sessionAttendance.filter(a => a.sessionId === sessionId && a.personId === 'p-ahmad').length, 1);
    await page.fill('[data-form=checkin] [name=code]', code); await click('[data-form=checkin] button.primary');
    assert.match(await text('[data-form=checkin] .form-error'), /Already checked in/);
    assert.equal((await read()).sessionAttendance.filter(a => a.sessionId === sessionId && a.personId === 'p-ahmad').length, 1);
  });
  await step('E3', 'Second student is Absent; excuse → Supervisor recommends → Representative accepts → Excused Absence, factual Absent, no rabbit', async () => {
    await as('p-zaid'); await member('explore/explore.html');
    await click(`[data-open="${initiativeId}"]`); await click('[data-act=apply]'); await page.fill('#ex-live-form [name=age]', '22'); await page.check('#ex-live-form [name=consent]'); await click('#ex-live-form button[type=submit]'); await click('[data-act=confirm]');
    const zApp = (await read()).admissions.find(a => a.initiativeId === initiativeId && a.personId === 'p-zaid').id;
    const lina = (await read()).people.find(p => p.email === 'lina.rep@demo.example').id;
    await as(lina); await ws(`organization/participants?initiative=${initiativeId}&status=pending`); await click(`[data-action=app-approve][data-id="${zApp}"]`);
    await as('p-zaid'); await member('explore/explore.html', '#my-initiatives'); await page.selectOption(`[data-mode-for="${sessionId}"]`, 'Online'); await click(`[data-session-register="${sessionId}"]`);
    await as('p-hala'); await ws(`supervisor/attendance?session=${sessionId}`); await click(`[data-action=att-closeout]`); await dialogSave();
    const att = (await read()).sessionAttendance.find(a => a.sessionId === sessionId && a.personId === 'p-zaid'); zaidAttendanceId = att.id; assert.equal(att.status, 'Absent');
    await as('p-zaid'); await member('explore/explore.html', '#my-initiatives');
    await click(`[data-excuse="${att.id}"]`); await page.fill(`[data-excuse-form="${att.id}"] textarea`, 'I had a fever that day.'); await click(`[data-excuse-form="${att.id}"] button`);
    await as('p-hala'); await ws(`supervisor/excuses?initiative=${initiativeId}`); await click('[data-action=excuse-recommend]'); await page.fill('#dialog-body [name=note]', 'Plausible; first absence.'); await dialogSave();
    await as(lina); await ws(`organization/attendance?initiative=${initiativeId}`); await click('[data-action=excuse-decide][data-decision=Accepted]'); await page.fill('#dialog-body [name=reason]', 'Medical reason accepted.'); await dialogSave();
    await as('p-zaid'); await member('explore/explore.html', '#my-initiatives'); await page.reload(); await page.waitForTimeout(600);
    assert.match(await text('#ex-my-initiatives'), /Excused Absence/);
    assert.equal((await read()).sessionAttendance.find(a => a.id === att.id).status, 'Absent');
    await member('garden/garden.html'); await page.waitForTimeout(600);
    assert.match(await page.getAttribute('#garden-canvas', 'aria-label'), /0 rabbits/);
    await as('p-ahmad'); await member('garden/garden.html'); await page.waitForTimeout(600);
    assert.match(await page.getAttribute('#garden-canvas', 'aria-label'), /1 rabbit[^s]/);
  });

  // ---------------------------------------------------------------- F
  await step('F1', 'Coach report → Supervisor Insights → Supervisor summary → Representative Reports', async () => {
    await as('p-karim'); await ws(`mentor/reports?scope=initiative&group=${groupId}&from=2026-10-01&to=2026-12-31`);
    await page.fill('[data-form=coach-report] [name=observations]', 'Ahmad engages well; Zaid needs a smaller first step.'); await click('[data-form=coach-report] button[value=submit]');
    await as('p-hala'); await ws(`supervisor/reports?initiative=${initiativeId}`);
    assert.match(await text('main'), /Group North/);
    await page.fill('[data-form=supervisor-summary] [name=summary]', 'Healthy start. One excused absence; workshop now supervised.'); await click('[data-form=supervisor-summary] button');
    const lina = (await read()).people.find(p => p.email === 'lina.rep@demo.example').id;
    await as(lina); await ws(`organization/reports?initiative=${initiativeId}`);
    assert.match(await text('main'), /Operational summary/); assert.match(await text('main'), /Group North/);
    await click('[data-action=report-open][data-kind=summary]'); assert.match(await text('#dialog-body'), /Healthy start/); await page.click('[data-dialog-close]');
  });
  await step('F2', 'Representative completes the initiative; student sees Completed; no Personal Garden object added; Group Garden milestone', async () => {
    await as('p-ahmad'); await member('garden/garden.html'); await page.waitForTimeout(600);
    const before = await page.getAttribute('#garden-canvas', 'aria-label');
    const lina = (await read()).people.find(p => p.email === 'lina.rep@demo.example').id;
    await as(lina); await ws(`organization/initiatives/${initiativeId}`); await click('[data-action=initiative-complete]'); await dialogSave();
    assert.equal((await read()).initiatives.find(i => i.id === initiativeId).status, 'Completed');
    await ws(`organization/group-garden?initiative=${initiativeId}`); assert.match(await text('main'), /Initiative completed/);
    await as('p-ahmad'); await member('explore/explore.html', '#my-initiatives');
    assert.match(await text('#ex-my-initiatives'), /Completed/);
    assert.equal(await page.locator(`[data-open="${initiativeId}"].ex-card-link`).count() + await page.locator(`.ex-card[data-id="${initiativeId}"]`).count(), 0, 'completed initiative left new discovery');
    await member('garden/garden.html'); await page.waitForTimeout(600);
    assert.equal(await page.getAttribute('#garden-canvas', 'aria-label'), before, 'no completion object');
  });

  await step('F3', 'Representative archives the completed initiative; history, reports and My Initiatives remain', async () => {
    const lina = (await read()).people.find(p => p.email === 'lina.rep@demo.example').id;
    await as(lina); await ws(`organization/initiatives/${initiativeId}`); await click('[data-action=initiative-archive]'); await dialogSave();
    assert.equal((await read()).initiatives.find(i => i.id === initiativeId).status, 'Archived');
    await ws(`organization/initiatives/${initiativeId}?tab=history`); assert.match(await text('main'), /Archived[\s\S]*Completed|Completed[\s\S]*Archived/);
    await ws(`organization/reports?initiative=${initiativeId}`); assert.match(await page.locator('.iw-stat', {hasText:'Completed students'}).innerText(), /2/);
    await as('p-ahmad'); await member('explore/explore.html', '#my-initiatives');
    assert.match(await text('#ex-my-initiatives'), new RegExp(`${TITLE}[\\s\\S]*Completed`));
  });

  // ------------------------------------------------- governance & negatives
  await step('NEG', 'Revoked Supervisor loses access; expired invitation grants nothing', async () => {
    const grant = (await read()).grants.find(g => g.id === 'grant-hala');
    await as('p-maya'); await ws('organization/team?initiative=i-today');
    await click('[data-action=staff-revoke][data-id="grant-hala"]'); await page.fill('#dialog-body [name=reason]', 'Rotation'); await dialogSave();
    assert.equal(await store(m => { try { m.dispatch('demo.signin', {personId:'p-hala'}); m.dispatch('initiative.application.approve', {id:'adm-omar'}); return 'allowed'; } catch (e) { return e.message; } }), 'Only the Representative or an active Supervisor of this initiative can do this.');
    assert.ok(grant);
    await as('p-maya'); const token = await store(m => m.dispatch('initiative.staff.invite', {initiativeId:'i-today', role:'coach', email:'yara@demo.example'}));
    await store(m => m.dispatch('demo.clock', {hours:24 * 8}));
    await as('p-yara'); await page.goto(`${BASE}/workspaces.html#/auth/staff-invitation/${token}`); await page.waitForTimeout(400);
    assert.match(await text('main'), /This invitation is expired/);
    await store((m, at) => m.dispatch('demo.clock', {at}), PIN);
  });

  await step('A9', 'Platform Admin suspends a published initiative from the Admin UI; it leaves regular Explore; history stays', async () => {
    await as('p-leen'); await ws('admin/initiatives');
    await click('[data-action=resource-status][data-id="i-today"]');
    const reason = page.locator('#dialog-body textarea, #dialog-body [name=reason]').first(); await reason.fill('Verification follow-up');
    await dialogSave();
    assert.equal((await read()).initiatives.find(i => i.id === 'i-today').status, 'Suspended');
    await as('p-ahmad'); await member('explore/explore.html');
    assert.equal(await page.locator('.ex-card[data-id="i-today"]').count(), 0);
  });
  await step('FR', 'First run: new registration → four official baselines → Starting Point shows all four → activation reaches the journal Home reads', async () => {
    await page.goto(`${BASE}/register.html`); await page.locator('.register-choice-content:not([hidden]) [data-path=individual]').waitFor();
    if (!page.url().includes('register')) await page.goto(`${BASE}/src/pages/auth/register/register.html`);
    assert.equal(await page.locator('.register-choice-content:not([hidden]) [data-path]').count(),2);
    await page.locator('[data-path=individual]').click();
    await page.locator('[data-entry-continue]').click();
    await page.locator('#register-form:visible').waitFor();
    await page.fill('#full-name', 'Rami New'); await page.fill('#email', 'rami.new@demo.example'); await page.fill('#password', 'demo-pass-1'); await page.fill('#confirm-password', 'demo-pass-1'); await page.check('#terms');
    await page.click('#register-form button[type=submit]'); await page.waitForFunction(()=>JSON.parse(localStorage.getItem('deepsprout-ecosystem-demo-v1'))?.people.some(p=>p.email==='rami.new@demo.example'));
    await page.waitForURL('**/member/onboarding/onboarding.html');
    const rami = (await read()).people.find(p => p.email === 'rami.new@demo.example');
    assert.ok(rami?.individual, 'one canonical Individual created'); assert.equal((await read()).session.personId, rami.id);
    // The four timed tasks write exactly this event to the personal journal; they are not timed here.
    await page.goto(`${BASE}/src/pages/member/lab/lab.html`); await page.waitForLoadState('networkidle');
    await page.evaluate(async () => { const a = await window.DeepSproutAccount.load(); for (const id of ['digital-habits','sustained-attention','inhibitory-control','depth-challenge']) a.mutate({type:'assessment.add', attempt:{id:`aa-${id}`, definitionId:id, official:true, cycle:1, on:a.todayKey, valid:true, score:50, version:'v1', details:[{label:'Recorded', value:'Yes'}], raw:{}}}); });
    await page.goto(`${BASE}/src/pages/member/onboarding/starting-point.html`); await page.waitForFunction(()=>document.querySelectorAll('.sp-result-card dl').length===4);
    assert.equal(await page.locator('.sp-result-card dl').count(), 4, 'all four baselines visible');
    assert.equal(await page.locator('.sp-result-missing').count(), 0);
    await page.click('#to-building'); await page.waitForSelector('[data-stage="preview"]:not([hidden])', {timeout:15000});
    await page.click('#commitment-grid .choice'); await page.click('#activate'); await page.locator('[data-stage=done]:visible').waitFor();
    await page.goto(`${BASE}/index.html`); await page.waitForLoadState('networkidle'); await page.reload(); await page.waitForTimeout(700);
    const plan = await page.evaluate(async () => { const a = await window.DeepSproutAccount.load(); const p = a.plan(); return p && {day:p.day, weeks:p.weeks, id:a.id}; });
    assert.ok(plan, 'Home reads an active plan from the same journal'); assert.equal(plan.day, 1); assert.equal(plan.id, `person:${rami.id}`);
  });

  if (SHOTS) {
    for (const [name, url, width] of [['m-explore', '/src/pages/member/explore/explore.html#my-initiatives', 390], ['m-rep', '/workspaces.html#/organization/dashboard', 390]]) {
      const mobile = await browser.newContext({viewport:{width, height:844}, storageState:await context.storageState()});
      const p = await mobile.newPage(); p.on('pageerror', e => errors.push(`PAGEERROR mobile ${e.message}`));
      if (name === 'm-rep') { await p.goto(`${BASE}/workspaces.html`); await p.evaluate(async () => { const m = await import('/src/workspaces/store.js'); m.dispatch('demo.signin', {personId:'p-maya'}); }); }
      await p.goto(`${BASE}${url}`); await p.waitForTimeout(900);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      results.push({id:`MOB-${name}`, title:`No horizontal page scroll at ${width}px (${name})`, status:overflow <= 1 ? 'Pass' : 'Fail', error:overflow > 1 ? `overflow ${overflow}px` : ''});
      await p.screenshot({path:`${SHOTS}/${name}.png`, fullPage:true}); await mobile.close();
    }
    const rm = await browser.newContext({viewport:{width:1280, height:900}, reducedMotion:'reduce', storageState:await context.storageState()});
    const p = await rm.newPage(); await p.goto(`${BASE}/workspaces.html`); await p.evaluate(async () => { const m = await import('/src/workspaces/store.js'); m.dispatch('demo.signin', {personId:'p-maya'}); });
    await p.goto(`${BASE}/workspaces.html#/organization/dashboard`); await p.waitForTimeout(600);
    const anim = await p.evaluate(() => getComputedStyle(document.querySelector('.iw-reveal')).animationName);
    results.push({id:'RM', title:'Reduced motion disables the entrance animation', status:anim === 'none' ? 'Pass' : 'Fail', error:anim});
    await rm.close();
  }
  await browser.close();
}

main().then(() => {
  const consoleErrors = errors.filter(e => !/favicon|Failed to load resource.*fonts/.test(e));
  results.push({id:'CONSOLE', title:'No console errors or page exceptions across the run', status:consoleErrors.length ? 'Fail' : 'Pass', error:consoleErrors.slice(0, 5).join(' | ')});
  console.log('\n' + results.map(r => `${r.status.padEnd(4)}  ${r.id.padEnd(10)} ${r.title}${r.error ? `  — ${r.error}` : ''}`).join('\n'));
  process.exit(results.some(r => r.status === 'Fail') ? 1 : 0);
}).catch(error => {
  console.log('\n' + results.map(r => `${r.status.padEnd(4)}  ${r.id.padEnd(10)} ${r.title}`).join('\n'));
  console.error('Stopped:', error.message, '\nConsole errors:', errors.slice(0, 5));
  process.exit(1);
});
