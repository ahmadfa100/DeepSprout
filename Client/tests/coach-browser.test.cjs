/**
 * Independent Coach cycle — REAL browser test (headless Chrome, isolated
 * context, empty storage, operational clock pinned to 15 Oct 2026 09:00).
 *
 *  C1–C20  the mandatory journey through the actual UI: Partner registration
 *          → Coach application → Admin approval → Program builder → Groups →
 *          private invitation → NEW Invited Student (OTP) → tasks → revision
 *          → approval → progress + Group Garden → Coach report → completion
 *          → Student sees completion → same-identity upgrade → reload.
 *  X1–X9   existing Individual accepts, wrong email, expired/revoked,
 *          unapproved / Institution-only Coach, foreign Coach, duplicates,
 *          Program parent, Institution Coach regression.
 *  plus 390px widths, reduced motion and console errors.
 *
 * One browser session per origin: identities switch with the demo person
 * switch (as()) and pages reload; two tabs never stand for two users.
 *
 *   BASE_URL=http://127.0.0.1:8799 CHROME_PATH=... NODE_PATH=... node tests/coach-browser.test.cjs
 */
const assert = require('node:assert/strict');
let chromium;
try { ({chromium} = require('playwright-core')); } catch { try { ({chromium} = require('playwright')); } catch { console.log('coach-browser: skipped (playwright-core not installed) — NOT a pass'); process.exit(0); } }
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const SHOTS = process.env.SHOTS_DIR || '';
const PIN = '2026-10-15T09:00:00+03:00';
const COACH = {name:'Lina Farah', email:'lina.coach@demo.example'};
const STUDENT = {name:'Sara Nasser', email:'sara.student@demo.example'};
const results = [], errors = [];

async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || undefined, headless:true});
  const context = await browser.newContext({viewport:{width:1360, height:950}});
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(`PAGEERROR ${e.message}`));
  const step = async (id, title, fn) => {
    try { await fn(); results.push({id, title, status:'Pass'}); console.log(`✔ ${id} ${title}`); }
    catch (e) { results.push({id, title, status:'Fail', error:e.message}); console.log(`✖ ${id} ${title}\n   ${e.message}`); if (SHOTS) await page.screenshot({path:`${SHOTS}/coach-fail-${id}.png`, fullPage:true}).catch(() => {}); throw e; }
  };
  const store = (fn, arg) => page.evaluate(async ([src, a]) => { const m = await import('/src/workspaces/store.js'); return new Function('m', 'a', `return (${src})(m, a)`)(m, a); }, [fn.toString(), arg]);
  const rules = (fn, arg) => page.evaluate(async ([src, a]) => { const m = await import('/src/workspaces/coach-rules.js'), st = await import('/src/workspaces/store.js'); return new Function('m', 's', 'a', `return (${src})(m, s, a)`)(m, st.read(), a); }, [fn.toString(), arg]);
  const read = () => store(m => m.read());
  const as = pid => store((m, id) => m.dispatch('demo.signin', {personId:id}), pid);
  const logout = () => store(m => m.dispatch('auth.logout'));
  const clock = iso => store((m, at) => m.dispatch('demo.clock', {at}), iso);
  const ws = async route => { const target = `${BASE}/workspaces.html#/${route}`; if (page.url() === target) await page.reload(); else await page.goto(target); await page.waitForSelector('main#main'); await page.waitForTimeout(350); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(300); };
  const save = async () => { await page.click('#dialog-save'); await page.waitForTimeout(400); const e = await page.textContent('#dialog-error').catch(() => ''); if (e) throw new Error(`Dialog: ${e}`); };
  const closeDialog = async () => { if (await page.locator('#workspace-dialog[open]').count()) { await page.click('#dialog-save'); await page.waitForTimeout(250); } };
  const text = sel => page.textContent(sel);
  const fill = (name, value) => page.fill(`form[data-form=builder] [name="${name}"]`, String(value));
  const next = () => click('[data-action=builder-next]');
  const fresh = async () => { await page.goto(`${BASE}/workspaces.html`); await page.evaluate(() => localStorage.clear()); await page.reload(); await clock(PIN); };
  await fresh();

  let coachId, appId, programId, groupA, groupB, token, studentId, directTask, stageTask, subDirect, subStage;

  // ---------------------------------------------------------------- C1–C3
  await step('C1', 'Join as Partner → Coach/Mentor: new account, simulated OTP, professional application submitted; workspace stays closed', async () => {
    await logout(); await ws('auth/register/partner');
    await page.locator('a.partner-path[href="#/auth/account/mentor"]').first().click(); await page.waitForSelector('[data-form=partner-account]');
    await page.fill('[data-form=partner-account] [name=name]', COACH.name); await page.fill('[data-form=partner-account] [name=email]', COACH.email);
    await page.fill('[data-form=partner-account] [name=password]', 'demo-password-1'); await page.fill('[data-form=partner-account] [name=confirmation]', 'demo-password-1');
    await page.fill('[data-form=partner-account] [name=birthYear]', '1990'); await page.check('[data-form=partner-account] [name=consent]');
    await click('[data-form=partner-account] button.primary'); await page.waitForSelector('[data-form=partner-verify]');
    await page.fill('[data-form=partner-verify] [name=code]', '246810'); await click('[data-form=partner-verify] button.primary');
    await page.waitForSelector('[data-form=application]');
    const details = {title:'Youth focus coach', specialization:'Study habits', years:'4', focus:'Deliberate starting', bio:'I coach small groups of students.', experience:'Four years of school study circles.', topics:'Focus, small starts', phone:'0790000000'};
    for (const [k, v] of Object.entries(details)) await page.fill(`[data-form=application] [name=${k}]`, v);
    await click('[data-form=application] button[value=review]');
    await click('[data-action=application-submit]');
    const s = await read(); const me = s.people.find(p => p.email === COACH.email); coachId = me.id;
    appId = s.applications.find(a => a.personId === coachId && a.type === 'mentor').id;
    assert.equal(s.applications.find(a => a.id === appId).status, 'Submitted');
    await ws('mentor/dashboard'); assert.match(await text('main h1'), /This workspace is unavailable/);
  });
  await step('C2', 'Platform Admin approves the application; the applicant receives a notice', async () => {
    await as('p-leen'); await ws(`admin/mentor-applications/${appId}`);
    await click('[data-action=application-decide][data-status=Approved]'); await save();
    const s = await read(); assert.equal(s.applications.find(a => a.id === appId).status, 'Approved');
    assert.ok(s.notifications.some(n => n.recipientId === coachId && /approved/.test(n.text)));
  });
  await step('C3', 'Coach workspace activates with a first-time Program-first dashboard', async () => {
    await as(coachId); await ws('mentor/dashboard');
    assert.match(await text('main h1'), /Good to see you, Lina/); assert.match(await text('main'), /Build your first Program/);
    assert.match(await text('main'), /INDEPENDENT COACH · APPROVED/i);
  });

  // ---------------------------------------------------------------- C4–C5
  await step('C4', 'Program Builder: basics → groups & schedule → stages → activities & policies → publish (invite-only)', async () => {
    await ws('mentor/programs/new');
    await fill('title', 'Small Steps Lab'); await fill('description', 'Two weeks of small, deliberate starts.'); await fill('purpose', 'Practise starting meaningful work.'); await fill('audience', 'University students');
    await next();
    await fill('start', '2026-10-15'); await fill('end', '2026-10-30');
    await click('[data-action=builder-group-add]'); await fill('group-name-0', 'Circle A'); await fill('group-purpose-0', 'Begin together, gently.');
    await next();
    await click('[data-action=builder-stage-add]'); await fill('title-0', 'Notice and begin'); await fill('objective-0', 'Name one distraction and try one small step.'); await fill('date-0', '2026-10-22');
    await next();
    await page.check('form[data-form=builder] [name=activities][value="Practical Micro-Challenge"]');
    await next(); assert.match(await text('form[data-form=builder]'), /does not admit anyone/);
    await click('[data-action=builder-publish]'); await page.waitForFunction(() => /\/mentor\/programs\/program-/.test(location.hash));
    const s = await read(); const pr = s.programs.find(p => p.title === 'Small Steps Lab'); programId = pr.id;
    assert.equal(pr.status, 'Published'); assert.equal(pr.ownerId, coachId); assert.equal(pr.audience, 'University students');
    groupA = s.groups.find(g => g.programId === programId && g.name === 'Circle A').id;
    stageTask = s.assignments.find(a => a.groupId === groupA && a.programId === programId).id;
    assert.ok(stageTask, 'publication creates the stage task for the group');
  });
  await step('C5', 'Create a second Group from My Groups; it belongs to exactly one Program', async () => {
    await ws('mentor/groups'); await click('[data-action=group-create]');
    await page.selectOption('#dialog-body [name=programId]', programId);
    await page.fill('#dialog-body [name=name]', 'Circle B'); await page.fill('#dialog-body [name=purpose]', 'A quieter evening group.'); await save();
    await page.waitForFunction(() => /\/mentor\/groups\/group-/.test(location.hash));
    const s = await read(); const g = s.groups.find(x => x.name === 'Circle B'); groupB = g.id;
    assert.equal(g.parentType, 'program'); assert.equal(g.programId, programId); assert.ok(!g.initiativeId);
    assert.ok(s.programs.find(p => p.id === programId).groupIds.includes(groupB));
  });

  // ---------------------------------------------------------------- C6–C8
  await step('C6', 'Coach invites a NEW student by email; a copyable private link is shown, no email is sent', async () => {
    await ws(`mentor/groups/${groupA}?tab=invitations`); await click('[data-action=invite-create]');
    await page.fill('#dialog-body [name=email]', STUDENT.email); await save();
    assert.match(await text('#dialog-body'), /No email is sent/); await closeDialog();
    const inv = (await read()).invitations.find(i => i.groupId === groupA && i.email === STUDENT.email); token = inv.token;
    assert.equal(inv.status, 'Active'); assert.equal(inv.limit, 1);
    await ws(`mentor/groups/${groupA}?tab=invitations`); assert.match(await text('main .table-scroll'), new RegExp(STUDENT.email.replace('.', '\\.')));
  });
  await step('C7', 'Invited Student opens the link, verifies the email (simulated OTP) and joins — no assessments required', async () => {
    await logout(); await ws(`join/${token}`);
    assert.match(await text('main'), /Small Steps Lab/); assert.match(await text('main'), /Lina Farah/);
    await page.fill('[data-form=join-email] [name=name]', STUDENT.name); await page.fill('[data-form=join-email] [name=email]', STUDENT.email); await page.check('[data-form=join-email] [name=consent]');
    await click('[data-form=join-email] button.primary'); await page.waitForSelector('[data-form=join-verify]');
    await page.fill('[data-form=join-verify] [name=code]', '246810'); await click('[data-form=join-verify] button.primary');
    await page.waitForFunction(() => location.hash.includes('/student/dashboard'));
    const s = await read(); const p = s.people.find(x => x.email === STUDENT.email); studentId = p.id;
    assert.ok(s.groups.find(g => g.id === groupA).memberIds.includes(studentId)); assert.ok(!p.individual, 'limited Student, not a full Individual');
    assert.equal(s.invitations.find(i => i.token === token).status, 'Accepted');
  });
  await step('C8', 'Student sees their Group (Coach, Program, milestones) and the Program task in My Tasks; Group Garden only', async () => {
    await ws('student/group'); assert.match(await text('main h1'), /Circle A/); assert.match(await text('main'), /Lina Farah/); assert.match(await text('main'), /Group milestones/);
    await ws('student/tasks'); assert.match(await text('main'), /Notice and begin/);
    const nav = await text('aside nav'); assert.match(nav, /Group Garden/); assert.doesNotMatch(nav, /Personal Garden|Lab|Shield|Recovery/);
  });

  // ---------------------------------------------------------------- C9–C13
  await step('C9', 'Coach assigns an approved activity to the group; the Student is notified', async () => {
    await as(coachId); await ws('mentor/assignments'); await click('[data-action=assignment-create]');
    await page.fill('#dialog-body [name=title]', 'Ten protected minutes'); await page.selectOption('#dialog-body [name=groupId]', groupA);
    await page.selectOption('#dialog-body [name=activity]', 'Protected Work'); await page.fill('#dialog-body [name=instructions]', 'Protect ten minutes for one task and describe it.'); await page.fill('#dialog-body [name=due]', '2026-10-28');
    await save();
    const s = await read(); directTask = s.assignments.find(a => a.title === 'Ten protected minutes').id;
    assert.ok(s.notifications.some(n => n.recipientId === studentId && n.link.includes(`/student/tasks/${directTask}`)));
  });
  await step('C10', 'Student starts the task and submits a reflection', async () => {
    await as(studentId); await ws(`student/tasks/${directTask}`);
    await click('[data-action=task-start]'); await page.waitForSelector('.badge:has-text("In Progress")');
    await page.fill('[data-form=student-submit] [name=text]', 'I protected ten minutes and wrote one paragraph.'); await click('[data-form=student-submit] button.primary');
    await page.waitForSelector('.badge:has-text("Submitted")');
    subDirect = (await read()).submissions.find(x => x.assignmentId === directTask && x.studentId === studentId).id;
  });
  await step('C11', 'Coach requests a revision with student-visible feedback and a separate internal note', async () => {
    await as(coachId); await ws(`mentor/reviews/${subDirect}`);
    await click('[data-action=review-decide][data-decision="Needs Revision"]');
    await page.fill('#dialog-body [name=feedback]', 'What interrupted you, and how did you return?'); await page.fill('#dialog-body [name=internalNote]', 'Check workload next week.'); await save();
    assert.equal((await read()).submissions.find(x => x.id === subDirect).status, 'Needs Revision');
  });
  await step('C12', 'Student sees feedback (not the internal note) and resubmits; the first attempt is preserved', async () => {
    await as(studentId); await ws(`student/tasks/${directTask}`);
    assert.match(await text('main'), /What interrupted you/); assert.doesNotMatch(await text('main'), /Check workload next week/);
    await page.fill('[data-form=student-submit] [name=text]', 'A message pulled me away once; I turned notifications off and finished.'); await click('[data-form=student-submit] button.primary');
    await page.waitForSelector('.badge:has-text("Submitted")');
    const sub = (await read()).submissions.find(x => x.id === subDirect); assert.equal(sub.attempt, 2); assert.equal(sub.history.length, 2);
    await ws(`student/tasks/${stageTask}`); await page.fill('[data-form=student-submit] [name=text]', 'Named my distraction and wrote the first line.'); await click('[data-form=student-submit] button.primary');
    await page.waitForSelector('.badge:has-text("Submitted")');
    subStage = (await read()).submissions.find(x => x.assignmentId === stageTask && x.studentId === studentId).id;
  });
  await step('C13', 'Coach reviews every attempt and approves both submissions', async () => {
    await as(coachId); await ws(`mentor/reviews/${subDirect}`);
    assert.match(await text('main'), /Every attempt/); assert.match(await text('main'), /I protected ten minutes/);
    await click('[data-action=review-decide][data-decision=Approved]'); await save();
    await ws(`mentor/reviews/${subStage}`); await click('[data-action=review-decide][data-decision=Approved]'); await save();
    const s = await read(); assert.deepEqual([subDirect, subStage].map(id => s.submissions.find(x => x.id === id).status), ['Approved', 'Approved']);
    assert.equal(s.submissions.find(x => x.id === subDirect).history.length, 3);
  });

  // ---------------------------------------------------------------- C14–C16
  await step('C14', 'Progress updates for the Student and in the Coach roster', async () => {
    await as(studentId); await ws('student/progress');
    assert.match(await text('main .metric-strip'), /2\s*Coach approved/);
    await as(coachId); await ws(`mentor/students?scope=own&program=${programId}`);
    const row = await text('main .table-scroll'); assert.match(row, /Sara Nasser/); assert.match(row, /Small Steps Lab/);
  });
  await step('C15', 'Group Garden advances from source records, once per submission; re-review is impossible', async () => {
    const gg = await rules((m, s, g) => m.programGroupGarden(s, g), groupA);
    assert.equal(gg.count, 2); assert.equal(gg.reached, 3, 'first root, every member, stage quorum');
    const s = await read(); assert.equal(s.rewards.filter(r => [subDirect, subStage].includes(r.sourceId)).length, 2, 'one reward per approved submission');
    await ws(`mentor/reviews/${subDirect}`); assert.equal(await page.locator('[data-action=review-decide]').count(), 0, 'no second decision');
    await as(studentId); await ws('student/garden'); assert.match(await text('main'), /Milestones reached\s*3\/4/); assert.match(await text('main h1'), /Circle A/);
    const gB = await rules((m, s, g) => m.programGroupGarden(s, g), groupB); assert.equal(gB.count, 0, 'Circle B has its own, separate garden');
  });
  await step('C16', 'Coach writes a source-backed report (no Supervisor step) and finalizes it', async () => {
    await as(coachId); await ws(`mentor/reports?scope=own&program=${programId}&from=2026-10-01&to=2026-10-31`);
    assert.match(await text('main'), /NO SUPERVISOR STEP/i);
    await page.fill('[data-form=coach-preport] [name=observations]', 'Sara revised thoughtfully; Circle B starts next week.');
    await click('[data-form=coach-preport] button[value=submit]');
    const r = (await read()).coachReports.find(x => x.programId === programId);
    assert.equal(r.status, 'Submitted'); assert.equal(r.metrics.approved, 2); assert.equal(r.metrics.students, 1);
    assert.match(await text('main'), /Report history/); assert.match(await text('main'), /All groups/);
  });

  // ---------------------------------------------------------------- X checks (before completion)
  await step('X1', 'Existing full Individual accepts an invitation with the same identity and sees tasks in Activities → Assigned', async () => {
    await ws(`mentor/groups/${groupB}?tab=invitations`); await click('[data-action=invite-create]'); await page.fill('#dialog-body [name=email]', 'ahmad@demo.example'); await save(); await closeDialog();
    const t = (await read()).invitations.find(i => i.groupId === groupB && i.email === 'ahmad@demo.example').token;
    const people = (await read()).people.length;
    await as('p-ahmad'); await ws(`join/${t}`); assert.match(await text('main'), /Join with your account/);
    await page.check('main [name=consent]'); await click('[data-action=invite-accept]'); await page.waitForFunction(() => location.hash.includes('/student/dashboard'));
    const s = await read(); assert.equal(s.people.length, people, 'no second identity'); assert.ok(s.groups.find(g => g.id === groupB).memberIds.includes('p-ahmad'));
    await page.goto(`${BASE}/src/pages/member/training/training.html#assigned`, {waitUntil:'load'}); await page.waitForTimeout(900);
    assert.match(await text('#assigned'), /Notice and begin/);
  });
  await step('X2', 'Wrong email cannot claim an invitation (signed-in other account, and OTP with another email)', async () => {
    await as(coachId); const t = await store((m, g) => m.dispatch('mentor.invite.create', {groupId:g, email:'omar@demo.example'}), groupB);
    await as('p-rania'); await ws(`join/${t}`); assert.match(await text('main'), /This invitation is for another email/);
    await logout(); await ws(`join/${t}`);
    await page.fill('[data-form=join-email] [name=name]', 'Intruder'); await page.fill('[data-form=join-email] [name=email]', 'intruder@demo.example'); await page.check('[data-form=join-email] [name=consent]');
    await click('[data-form=join-email] button.primary'); await page.fill('[data-form=join-verify] [name=code]', '246810'); await click('[data-form=join-verify] button.primary');
    assert.match(await text('[data-form=join-verify] .form-error'), /email named in this invitation/);
    assert.equal((await read()).people.filter(p => p.email === 'intruder@demo.example').length, 0);
  });
  await step('X3', 'Revoked and expired invitations grant nothing; resend issues a fresh link', async () => {
    await as(coachId); await ws(`mentor/groups/${groupB}?tab=invitations`);
    const inv = (await read()).invitations.find(i => i.email === 'omar@demo.example');
    await click(`[data-action=invite-revoke][data-id="${inv.id}"]`); await save();
    await logout(); await ws(`join/${inv.token}`); assert.match(await text('main h1'), /revoked or replaced/);
    await as(coachId); const t = await store((m, g) => m.dispatch('mentor.invite.create', {groupId:g, email:'late@demo.example', expires:'2026-10-16'}), groupB);
    await clock('2026-10-17T09:00:00+03:00'); await logout(); await ws(`join/${t}`); assert.match(await text('main h1'), /expired/);
    await as(coachId); await ws(`mentor/groups/${groupB}?tab=invitations`); const late = (await read()).invitations.find(i => i.token === t);
    await click(`[data-action=invite-resend][data-id="${late.id}"]`); await closeDialog();
    const s = await read(); assert.equal(s.invitations.find(i => i.id === late.id).status, 'Replaced'); assert.ok(s.invitations.some(i => i.replaces === late.id && i.status === 'Active'));
    await clock(PIN);
  });
  await step('X4', 'An unapproved applicant cannot open the Coach workspace or publish', async () => {
    const pid = await store(m => { m.dispatch('auth.logout'); m.dispatch('auth.account', {name:'Pending Coach', email:'pending.coach@demo.example', consent:true}); m.dispatch('auth.otp', {email:'pending.coach@demo.example'}); m.dispatch('auth.verify', {email:'pending.coach@demo.example', code:'246810'}); m.dispatch('auth.application.submit', {type:'mentor', details:{title:'x', bio:'y'}}); return m.read().session.personId; });
    await ws('mentor/programs/new'); assert.match(await text('main h1'), /This workspace is unavailable/);
    const err = await store(m => { try { m.dispatch('mentor.program.save', {title:'Nope'}); return ''; } catch (e) { return e.message; } }); assert.match(err, /no active mentor workspace/);
    void pid;
  });
  await step('X5', 'Institution-only Coach (Initiative grant) cannot build or publish independent Programs', async () => {
    await as('p-karim'); await ws('mentor/programs/new'); assert.match(await text('main h1'), /Independent Programs need approval/);
    await ws('mentor/programs'); assert.equal(await page.locator('main a[href="#/mentor/programs/new"]').count(), 0);
    const err = await store(m => { try { m.dispatch('mentor.program.save', {title:'Nope'}); return ''; } catch (e) { return e.message; } }); assert.match(err, /Independent Coach approval/);
  });
  await step('X6', 'A foreign Coach cannot open another Coach’s group, roster or submissions', async () => {
    await as('p-maya');
    await ws(`mentor/groups/${groupA}`); assert.match(await text('main'), /couldn't find/);
    await ws(`mentor/students/${studentId}`); assert.match(await text('main'), /couldn't find/);
    await ws(`mentor/reviews/${subDirect}`); assert.match(await text('main'), /couldn't find/);
    await ws('mentor/students?scope=own'); const roster = await text('main .table-scroll'); assert.match(roster, /Noor Khalil/); assert.doesNotMatch(roster, /Sara Nasser/);
    const err = await store((m, id) => { try { m.dispatch('mentor.review', {id, decision:'Approved'}); return ''; } catch (e) { return e.message; } }, subDirect); assert.match(err, /outside your groups/);
  });
  await step('X7', 'Duplicate join and duplicate review are refused; reward sources stay unique', async () => {
    await as(studentId); await ws(`join/${token}`); assert.match(await text('main h1'), /already part of this circle/);
    const err = await store((m, t) => { try { m.dispatch('auth.invite.accept', {token:t}); return ''; } catch (e) { return e.message; } }, token); assert.ok(err);
    const s = await read(); const keys = s.rewards.map(r => `${r.sourceId}:${r.personId}:${r.effect || ''}`); assert.equal(new Set(keys).size, keys.length);
  });
  await step('X8', 'Each independent Group has exactly one Program parent; Initiative groups keep theirs', async () => {
    const s = await read();
    for (const g of s.groups.filter(x => x.programId === programId)) { assert.equal(g.parentType, 'program'); assert.ok(!g.initiativeId); }
    for (const g of s.groups.filter(x => x.parentType === 'initiative')) { assert.ok(g.initiativeId); assert.ok(!g.programId); }
  });
  await step('X9', 'Institution-invited Coach workflow intact: Initiative group, roster and Coach report', async () => {
    await as('p-karim'); await ws('mentor/groups/g-today-a?tab=members'); assert.match(await text('main'), /Noor Khalil/);
    await ws('mentor/reports?scope=initiative&group=g-today-a&from=2026-10-01&to=2026-12-31'); assert.match(await text('main'), /Submit to Supervisors/);
    await ws('mentor/dashboard'); assert.match(await text('main'), /INSTITUTION-INVITED COACH/i);
  });

  await step('X10', 'One person, two Coach contexts: the scope selector switches between independent Programs and the allocated Initiative group', async () => {
    await as('p-maya'); const t = await store((m, e) => m.dispatch('initiative.staff.invite', {initiativeId:'i-today', role:'coach', email:e}), COACH.email);
    await as(coachId); await ws(`auth/staff-invitation/${t}`); await click('[data-action=staff-accept]');
    await as('p-maya'); await store((m, id) => m.dispatch('initiative.group.coach', {groupId:'g-today-b', coachId:id}), coachId);
    await as(coachId); await ws('mentor/dashboard?scope=own');
    assert.equal(await page.locator('main .iw-contexts .iw-context').count(), 2, 'two context chips');
    assert.match(await text('main'), /INDEPENDENT COACH · APPROVED/i);
    await click('.iw-context[data-scope=initiative]'); await page.waitForTimeout(300);
    assert.match(await text('main'), /INSTITUTION-INVITED COACH/i); assert.match(await text('main'), /Circle B · Steady pace/); assert.doesNotMatch(await text('main .iw-mini-list'), /Circle A/);
    await ws('mentor/groups'); assert.match(await text('main'), /INITIATIVE GROUP/); assert.doesNotMatch(await text('main .grid'), /Small Steps Lab/);
    await click('.iw-context[data-scope=own]'); await page.waitForTimeout(300);
    assert.match(await text('main'), /Small Steps Lab/); assert.doesNotMatch(await text('main'), /Circle B · Steady pace/);
    const refused = await store(m => { try { m.dispatch('mentor.invite.create', {groupId:'g-today-b', email:'x@demo.example'}); return ''; } catch (e) { return e.message; } });
    assert.match(refused, /different Mentor|Attach this group/, 'no private invitations into the Institution group');
    assert.equal((await read()).people.filter(p => p.email === COACH.email).length, 1, 'one Person ID');
  });
  await step('X11', 'An independent Program never becomes public: absent from regular Explore, partner discovery and the Initiative component picker', async () => {
    await as('p-rania'); await page.goto(`${BASE}/src/pages/member/explore/explore.html`, {waitUntil:'load'}); await page.waitForTimeout(1200);
    assert.doesNotMatch(await page.textContent('body'), /Small Steps Lab/);
    await ws('participant/discover'); assert.doesNotMatch(await text('main'), /Small Steps Lab/);
    await ws(`participant/programs/${programId}`); assert.match(await text('main'), /couldn't find/);
    await as('p-maya'); await ws('organization/partners'); assert.doesNotMatch(await text('main'), /Small Steps Lab/);
  });

  // ---------------------------------------------------------------- C17–C20
  await step('C17', 'Coach reviews eligibility and finalizes Program completion', async () => {
    await as(coachId); await ws(`mentor/programs/${programId}?tab=completion`);
    assert.match(await text('main .table-scroll'), /Sara Nasser/); assert.match(await text('main'), /Every required task approved/);
    const personalBefore = await store((m, id) => 0, studentId);
    await click('[data-action=program-complete]'); await save();
    const s = await read(); const pr = s.programs.find(p => p.id === programId);
    assert.equal(pr.status, 'Completed'); const rec = s.programCompletions.find(c => c.programId === programId && c.personId === studentId);
    assert.equal(rec.status, 'Completed'); assert.equal(s.programCompletions.find(c => c.personId === 'p-ahmad').status, 'Not completed');
    const gg = await rules((m, st, g) => m.programGroupGarden(st, g), groupA); assert.ok(gg.completed); assert.equal(gg.reached, 4);
    void personalBefore;
  });
  await step('C18', 'Student sees the Completed status, badge and Program history', async () => {
    await as(studentId); await ws('student/progress'); assert.match(await text('main'), /Completed/); assert.match(await text('main'), /Small Steps Lab/);
    await ws('student/dashboard'); assert.match(await text('main'), /Completed · Small Steps Lab/);
    await ws(`student/tasks/${directTask}`); assert.match(await text('main'), /has ended/);
  });
  await step('C19', 'Student upgrades to a full Individual with the same identity', async () => {
    await ws('student/account'); await click('[data-action=student-upgrade]');
    assert.match(await text('#dialog-body'), /same person ID/); await page.check('#dialog-body [name=consent]');
    await page.click('#dialog-save'); await page.waitForURL(/onboarding\.html/, {timeout:8000});
    const s = await read(); const p = s.people.find(x => x.id === studentId);
    assert.equal(p.individual, true); assert.equal(s.people.filter(x => x.email === STUDENT.email).length, 1); assert.equal(s.session.personId, studentId);
  });
  await step('C20', 'After reload: same Person ID, membership, attempts, reviews, completion; Activities → Assigned and Insights show the history', async () => {
    await page.reload(); await page.waitForTimeout(500);
    const s = await read(); assert.equal(s.session.personId, studentId);
    assert.ok(s.groups.find(g => g.id === groupA).memberIds.includes(studentId));
    const sub = s.submissions.find(x => x.id === subDirect); assert.equal(sub.status, 'Approved'); assert.equal(sub.history.length, 3); assert.equal(sub.attempt, 2);
    assert.equal(s.programCompletions.find(c => c.personId === studentId).status, 'Completed');
    await page.goto(`${BASE}/src/pages/member/training/training.html#assigned`, {waitUntil:'load'});
    await page.waitForFunction(() => /2 approved/.test(document.getElementById('assigned-count')?.textContent || ''), null, {timeout:8000});
    await click('[data-assigned-filter=all]');
    assert.match(await text('#assigned'), /Ten protected minutes/); assert.match(await text('#assigned'), /Approved/);
    await page.goto(`${BASE}/src/pages/member/insights/insights.html`, {waitUntil:'load'}); await page.waitForTimeout(1200);
    assert.match(await text('#beyond-body'), /Coach programs/); assert.match(await text('#beyond-body'), /Small Steps Lab · Lina Farah · Completed/);
    await ws('student/garden'); assert.match(await text('main'), /Personal Garden is separate/);
  });

  // ---------------------------------------------------------------- widths & motion
  for (const [name, route, pid] of [['coach-dash', 'mentor/dashboard', coachId], ['coach-program', `mentor/programs/${programId}`, coachId], ['coach-garden', `mentor/group-garden?group=${groupA}`, coachId], ['student-dash', 'student/dashboard', studentId], ['join', `join/${token}`, null]]) {
    const ctx2 = await browser.newContext({viewport:{width:390, height:844}, storageState:await context.storageState()});
    const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push(`PAGEERROR mobile ${e.message}`));
    await p2.goto(`${BASE}/workspaces.html`); await p2.evaluate(async id => { const m = await import('/src/workspaces/store.js'); if (id) m.dispatch('demo.signin', {personId:id}); else m.dispatch('auth.logout'); }, pid);
    await p2.goto(`${BASE}/workspaces.html#/${route}`); await p2.waitForTimeout(800);
    const overflow = await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    results.push({id:`MOB-${name}`, title:`No horizontal page scroll at 390px (${route.split('?')[0]})`, status:overflow <= 1 ? 'Pass' : 'Fail', error:overflow > 1 ? `${overflow}px` : ''});
    if (SHOTS) await p2.screenshot({path:`${SHOTS}/${name}-390.png`, fullPage:true});
    await ctx2.close();
  }
  const rm = await browser.newContext({viewport:{width:1280, height:900}, reducedMotion:'reduce', storageState:await context.storageState()});
  const p3 = await rm.newPage(); await p3.goto(`${BASE}/workspaces.html`); await p3.evaluate(async id => { const m = await import('/src/workspaces/store.js'); m.dispatch('demo.signin', {personId:id}); }, coachId);
  await p3.goto(`${BASE}/workspaces.html#/mentor/group-garden?group=${groupA}`); await p3.waitForTimeout(500);
  const anim = await p3.evaluate(() => [getComputedStyle(document.querySelector('.iw-reveal')).animationName, getComputedStyle(document.querySelector('.iw-milestones li.is-done > span')).animationName]);
  results.push({id:'RM', title:'Reduced motion: no entrance or milestone animation', status:anim.every(a => a === 'none') ? 'Pass' : 'Fail', error:anim.join(' ')});
  await rm.close();
  if (SHOTS) for (const [name, route, pid] of [['coach-dashboard', 'mentor/dashboard', coachId], ['coach-program-completion', `mentor/programs/${programId}?tab=completion`, coachId], ['coach-reports', `mentor/reports?scope=own&program=${programId}`, coachId], ['coach-garden', `mentor/group-garden?group=${groupA}`, coachId], ['student-progress', 'student/progress', studentId]]) { await as(pid); await ws(route); await page.waitForTimeout(900); await page.screenshot({path:`${SHOTS}/${name}.png`, fullPage:true}); }
  await browser.close();
}
main().then(() => {
  const consoleErrors = errors.filter(e => !/favicon|fonts\.g/.test(e));
  results.push({id:'CONSOLE', title:'No console errors or page exceptions', status:consoleErrors.length ? 'Fail' : 'Pass', error:consoleErrors.slice(0, 4).join(' | ')});
  console.log('\n' + results.map(r => `${r.status.padEnd(4)}  ${r.id.padEnd(16)} ${r.title}${r.error ? `  — ${r.error}` : ''}`).join('\n'));
  console.log(`\n${results.filter(r => r.status === 'Pass').length}/${results.length} passed`);
  process.exit(results.some(r => r.status === 'Fail') ? 1 : 0);
}).catch(e => { console.log('\n' + results.map(r => `${r.status.padEnd(4)}  ${r.id.padEnd(16)} ${r.title}`).join('\n')); console.error('Stopped:', e.message, errors.slice(0, 4)); process.exit(1); });
