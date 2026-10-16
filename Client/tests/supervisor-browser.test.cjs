/**
 * Supervisor cycle + Institution priority gaps — REAL browser test.
 *
 * Fresh isolated context (empty storage), operational clock pinned. Covers:
 *  S1  identified form + competition from the regular Individual pages
 *  S2  a NEW Institution Supervisor end to end (invite → new account → OTP
 *      → accept → approve → flag → group → duty → window → QR check-in →
 *      close → excuse with a real stored attachment → recommend → Rep
 *      decides → summary), with restricted evidence viewing
 *  S3  a NEW Provider Supervisor end to end (email appointment → new account
 *      → accept → scoped desk → QR code / manual Late → close → evaluate →
 *      closing report seen by the Provider → revoke), participant QR
 *  S4  multi-context switching for one person, out-of-scope pages
 *  plus mobile width, reduced motion and console errors.
 *
 *   BASE_URL=http://127.0.0.1:8799 CHROME_PATH=... NODE_PATH=... node tests/supervisor-browser.test.cjs
 */
const assert = require('node:assert/strict');
let chromium;
try { ({chromium} = require('playwright-core')); } catch { try { ({chromium} = require('playwright')); } catch { console.log('supervisor-browser: skipped (playwright-core not installed) — NOT a pass'); process.exit(0); } }
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const SHOTS = process.env.SHOTS_DIR || '';
const PIN = '2026-10-15T09:00:00+03:00';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const results = [], errors = [];

async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || undefined, headless:true});
  const context = await browser.newContext({viewport:{width:1360, height:950}});
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(`PAGEERROR ${e.message}`));
  page.on('popup', p => p.close().catch(() => {}));
  const step = async (id, title, fn) => {
    try { await fn(); results.push({id, title, status:'Pass'}); console.log(`✔ ${id} ${title}`); }
    catch (e) { results.push({id, title, status:'Fail', error:e.message}); console.log(`✖ ${id} ${title}\n   ${e.message}`); if (SHOTS) await page.screenshot({path:`${SHOTS}/sup-fail-${id}.png`, fullPage:true}).catch(() => {}); throw e; }
  };
  const store = (fn, arg) => page.evaluate(async ([src, a]) => { const m = await import('/src/workspaces/store.js'); return new Function('m', 'a', `return (${src})(m, a)`)(m, a); }, [fn.toString(), arg]);
  const read = () => store(m => m.read());
  const as = pid => store((m, id) => m.dispatch('demo.signin', {personId:id}), pid);
  const clock = iso => store((m, at) => m.dispatch('demo.clock', {at}), iso);
  const ws = async route => { const target = `${BASE}/workspaces.html#/${route}`; if (page.url() === target) await page.reload(); else await page.goto(target); await page.waitForSelector('main#main'); await page.waitForTimeout(350); };
  const member = async hash => { await page.goto(`${BASE}/src/pages/member/explore/explore.html${hash || ''}`, {waitUntil:'load'}); await page.waitForSelector('#ex-my-initiatives'); await page.waitForTimeout(600); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(300); };
  const save = async () => { await page.click('#dialog-save'); await page.waitForTimeout(400); const e = await page.textContent('#dialog-error').catch(() => ''); if (e) throw new Error(`Dialog: ${e}`); };
  const text = sel => page.textContent(sel);
  const fresh = async () => { await page.goto(`${BASE}/workspaces.html`); await page.evaluate(() => localStorage.clear()); await page.evaluate(() => new Promise(r => { const q = indexedDB.deleteDatabase('deepsprout-attachments'); q.onsuccess = q.onerror = q.onblocked = () => r(); })); await page.reload(); await clock(PIN); };
  await fresh();

  // ---------------------------------------------------------------- S1
  await step('S1a', 'Accepted Individual answers the identified survey from My Initiatives; it persists; Representative sees it with identity', async () => {
    await as('p-rania'); await member('#my-initiatives');
    await click('[data-form-open="f-start"]');
    await page.selectOption('[data-form-respond="f-start"] [name="q-q-start"]', 'Distractions');
    await page.click('[data-form-respond="f-start"] input[name="q-q-confidence"][value="4"] + span');
    await click('[data-form-respond="f-start"] button.ex-button');
    assert.match(await text('#ex-my-initiatives'), /Answers submitted/);
    await page.reload(); await page.waitForTimeout(700);
    assert.match(await text('#ex-my-initiatives'), /Submitted/);
    await as('p-maya'); await ws('organization/forms/f-start/responses');
    assert.match(await text('main .table-scroll'), /Rania Yasin/); assert.match(await text('main .table-scroll'), /Distractions/);
  });
  await step('S1b', 'Competition entry from My Initiatives → Representative judges and publishes → Individual sees permitted results', async () => {
    await as('p-rania'); await member('#my-initiatives');
    await click('[data-entry-open="c-create"]'); await page.fill('[data-entry-form="c-create"] textarea', 'I wrote the first line of a letter I had avoided for months.'); await click('[data-entry-form="c-create"] button.ex-button');
    assert.match(await text('#ex-my-initiatives'), /Entry submitted/);
    await as('p-maya'); await ws('organization/competitions/c-create');
    await click('[data-action=entry-judge]');
    for (const i of [0, 1, 2]) await page.fill(`#dialog-body [name=score-${i}]`, '4');
    await page.fill('#dialog-body [name=feedback]', 'Honest and specific.'); await save();
    await click('[data-action=competition-results]');
    await as('p-rania'); await member('#my-initiatives');
    assert.match(await text('#ex-my-initiatives'), /Results published/); assert.match(await text('#ex-my-initiatives'), /Honest and specific/);
  });

  // ---------------------------------------------------------------- S2
  let supLink, newSup, attId;
  await step('S2a', 'Representative invites a NEW Supervisor; new account + OTP + accept; scoped workspace without Admin approval', async () => {
    await as('p-maya'); await ws('organization/team?initiative=i-today');
    await click('[data-action=staff-invite][data-role=supervisor]'); await page.fill('#dialog-body [name=email]', 'new.sup@demo.example'); await save();
    await page.waitForSelector('#dialog-body [name=link]'); supLink = await page.inputValue('#dialog-body [name=link]'); await save();
    await store(m => m.dispatch('auth.logout')); await page.goto(supLink); await page.waitForTimeout(500);
    await page.fill('[data-form=staff-new] [name=name]', 'Nadia Supervisor'); await page.check('[data-form=staff-new] input[name=consent]'); await click('[data-form=staff-new] button');
    await page.fill('[data-form=staff-verify] [name=code]', '246810'); await click('[data-form=staff-verify] button');
    await click('[data-action=staff-accept]');
    assert.match(page.url(), /supervisor\/dashboard/); assert.match(await text('main'), /Steady hands, Nadia/);
    newSup = (await read()).people.find(p => p.email === 'new.sup@demo.example').id;
  });
  await step('S2b', 'Supervisor approves an eligible application, flags another for the Representative, creates a group and allocates', async () => {
    await as('p-zaid'); await store(m => m.dispatch('member.application.submit', {initiativeId:'i-today', age:22, consent:true}));
    const zid = (await read()).admissions.find(a => a.personId === 'p-zaid').id;
    await as(newSup); await ws('supervisor/applications?initiative=i-today&status=pending');
    assert.equal(await page.locator('[data-action=app-decide][data-kind=reject]').count(), 0, 'no Reject for Supervisors');
    await click('[data-action=app-approve][data-id="adm-omar"]');
    await click(`[data-action=app-flag][data-id="${zid}"]`); await page.fill('#dialog-body [name=note]', 'Applied twice last year — please decide.'); await save();
    await ws('supervisor/students?initiative=i-today'); await click('[data-action=group-create]'); await page.fill('#dialog-body [name=name]', 'Circle C · Evenings'); await save();
    const gid = (await read()).groups.find(g => g.name === 'Circle C · Evenings').id;
    await page.selectOption('select[data-action=allocate][data-person="p-omar"]', gid); await page.waitForTimeout(400);
    assert.ok((await read()).groups.find(g => g.id === gid).memberIds.includes('p-omar'));
    await as('p-maya'); await ws('organization/participants?initiative=i-today&status=flagged');
    assert.match(await text('main .table-scroll'), /Zaid Qasem/); assert.match(await text('main .table-scroll'), /Flagged/);
  });
  await step('S2c', 'Duty assigned; window enforced before the session; QR code check-in inside the window; replay rejected; close-out', async () => {
    await as('p-rania'); await member('#my-initiatives'); await page.selectOption('[data-mode-for="s-workshop"]', 'In-person'); await click('[data-session-register="s-workshop"]');
    assert.equal(await page.locator('.ex-qr-code svg').count() >= 1, true);
    await as('p-noor'); await store(m => m.dispatch('member.session.register', {sessionId:'s-workshop', mode:'In-person', consent:true}));
    const code = (await read()).sessionRegistrations.find(r => r.sessionId === 's-workshop' && r.personId === 'p-rania').code;
    await as(newSup); await ws('supervisor/schedule/s-workshop'); await click('[data-action=session-assign]'); await page.check(`#dialog-body input[name=supervisorIds][value="${newSup}"]`); await save();
    await ws('supervisor/attendance?session=s-workshop');
    assert.match(await text('main'), /Check-in not open yet/); assert.equal(await page.locator('[data-form=checkin] button.primary').isDisabled(), true);
    await clock('2026-10-25T16:05:00+03:00'); await page.reload(); await page.waitForTimeout(500);
    await page.fill('[data-form=checkin] [name=code]', code); await click('[data-form=checkin] button.primary');
    await page.fill('[data-form=checkin] [name=code]', code); await click('[data-form=checkin] button.primary');
    assert.match(await text('[data-form=checkin] .form-error'), /Already checked in/);
    await click('[data-action=att-closeout]'); await save();
    const s = await read();
    assert.equal(s.sessionAttendance.find(a => a.sessionId === 's-workshop' && a.personId === 'p-rania').status, 'Present');
    attId = s.sessionAttendance.find(a => a.sessionId === 's-workshop' && a.personId === 'p-noor').id;
  });
  await step('S2d', 'Excuse with a real stored attachment: invalid file refused, PNG saved; Supervisor and Representative open it; Coach cannot', async () => {
    await as('p-noor'); await member('#my-initiatives');
    await click(`[data-excuse="${attId}"]`); await page.fill(`[data-excuse-form="${attId}"] textarea`, 'I had a fever that evening.');
    await page.setInputFiles(`[data-excuse-form="${attId}"] input[name=attachment]`, {name:'virus.exe', mimeType:'application/octet-stream', buffer:Buffer.from('MZ')});
    await click(`[data-excuse-form="${attId}"] button`); assert.match(await text(`[data-excuse-form="${attId}"] .ex-error`), /PDF, JPG or PNG/);
    await page.setInputFiles(`[data-excuse-form="${attId}"] input[name=attachment]`, {name:'clinic-note.png', mimeType:'image/png', buffer:PNG});
    await click(`[data-excuse-form="${attId}"] button`); await page.waitForTimeout(600);
    assert.match(await text('#ex-my-initiatives'), /View your attachment \(clinic-note.png\)/);
    await page.reload(); await page.waitForTimeout(700); assert.match(await text('#ex-my-initiatives'), /clinic-note.png/, 'reference persists after reload');
    await as(newSup); await ws('supervisor/excuses?initiative=i-today');
    await click('[data-action=excuse-evidence]'); await page.waitForSelector('#dialog-body img.iw-evidence-view'); await page.click('[data-dialog-close]');
    await click('[data-action=excuse-recommend]'); await page.fill('#dialog-body [name=note]', 'Note attached; first absence.'); await save();
    await as('p-maya'); await ws('organization/attendance?initiative=i-today');
    await click('[data-action=excuse-evidence]'); await page.waitForSelector('#dialog-body img.iw-evidence-view'); await page.click('[data-dialog-close]');
    await click('[data-action=excuse-decide][data-decision=Accepted]'); await page.fill('#dialog-body [name=reason]', 'Medical note accepted.'); await save();
    const ex = (await read()).excuses.find(e => e.attendanceId === attId);
    assert.equal(ex.evidenceLog.length, 2); assert.equal((await read()).sessionAttendance.find(a => a.id === attId).status, 'Absent');
    await as('p-karim'); assert.match(await store((m, id) => { try { m.dispatch('initiative.excuse.evidence', {id}); return 'allowed'; } catch (e) { return e.message; } }, ex.id), /restricted/);
    await as('p-noor'); await member('#my-initiatives'); assert.match(await text('#ex-my-initiatives'), /Excused Absence/);
  });
  await step('S2e', 'Supervisor submits an Insights summary; the Representative sees the original', async () => {
    await as(newSup); await ws('supervisor/reports?initiative=i-today');
    await page.fill('[data-form=supervisor-summary] [name=summary]', 'Workshop ran well; one excused absence; Circle C started.'); await click('[data-form=supervisor-summary] button');
    await as('p-maya'); await ws('organization/reports?initiative=i-today'); await click('[data-action=report-open][data-kind=summary]');
    assert.match(await text('#dialog-body'), /Circle C started/); await page.click('[data-dialog-close]');
  });

  // ---------------------------------------------------------------- S3
  let apLink, lead;
  await step('S3a', 'Provider appoints a NEW Supervisor by email; participant booking shows a rendered QR', async () => {
    await clock(PIN);
    await as('p-sami'); await ws('provider/supervisors');
    await click('[data-action=supervisor-appoint]'); await page.fill('#dialog-body [name=email]', 'field.lead@demo.example');
    const boxes = page.locator('#dialog-body input[name=sessionIds]'); for (let i = 1; i < await boxes.count(); i++) await boxes.nth(i).uncheck();
    await page.uncheck('#dialog-body input[name=cohortPermission]'); await save();
    await page.waitForSelector('#dialog-body [name=link]'); apLink = await page.inputValue('#dialog-body [name=link]'); await save();
    await as('p-noor'); await ws('participant/bookings/b-noor'); assert.equal(await page.locator('.booking-qr svg').count(), 1);
  });
  await step('S3b', 'Wrong identity cannot accept; new account + OTP accepts; dashboard shows the Provider context only', async () => {
    await as('p-zaid'); await page.goto(apLink); await page.waitForTimeout(400); assert.match(await text('main'), /different person/);
    await click('[data-action=staff-signout]');
    await page.fill('[data-form=staff-new] [name=name]', 'Field Lead'); await page.check('[data-form=staff-new] input[name=consent]'); await click('[data-form=staff-new] button');
    await page.fill('[data-form=staff-verify] [name=code]', '246810'); await click('[data-form=staff-verify] button');
    await click('[data-action=appt-accept]');
    assert.match(page.url(), /supervisor\/dashboard/); assert.match(await text('main'), /Weekend Nature Reset/);
    lead = (await read()).people.find(p => p.email === 'field.lead@demo.example').id;
    assert.equal(await page.locator('.sidebar nav a', {hasText:'Notes & Excuses'}).count(), 0, 'Provider-only Supervisor sidebar hides Initiative-only items');
    await ws('supervisor/applications'); assert.match(await text('main'), /Initiative assignment/, 'no Institution authority from a Provider appointment');
  });
  await step('S3c', 'Provider desk: window, typed code, replay, manual Late with reason, close-out; out-of-scope session absent', async () => {
    await ws('supervisor/attendance?mode=provider&resource=e-reset'); assert.match(await text('main'), /Check-in not open yet/);
    assert.equal(await page.locator('[data-action=pdesk-session] option').count(), 1, 'only the assigned session is listed');
    await clock('2026-10-24T09:05:00+03:00'); await page.reload(); await page.waitForTimeout(500);
    await page.fill('[data-form=provider-checkin] [name=code]', 'ds-noor-24'); await click('[data-form=provider-checkin] button.primary');
    await page.fill('[data-form=provider-checkin] [name=code]', 'DS-NOOR-24'); await click('[data-form=provider-checkin] button.primary');
    assert.match(await text('[data-form=provider-checkin] .form-error'), /Already checked in/);
    await click('[data-action=pdesk-late][data-person="p-omar"]'); await page.fill('#dialog-body [name=reason]', 'Ticket on a flat phone; ID checked.'); await save();
    await click('[data-action=pdesk-closeout]'); await save();
    const att = (await read()).attendance.filter(a => a.sessionId === 'es-walk');
    assert.deepEqual(att.map(a => `${a.personId}:${a.status}`).sort(), ['p-noor:Present', 'p-omar:Late']);
  });
  await step('S3d', 'Evaluation against declared criteria; closing report visible to the Provider owner', async () => {
    await ws('supervisor/evaluations?mode=provider&resource=e-reset'); await click('[data-action=evaluate][data-person="p-noor"]'); await page.fill('#dialog-body [name=notes]', 'Completed the full guided walk.'); await save();
    await ws('supervisor/reports?mode=provider&resource=e-reset'); await page.fill('[data-form=closing-report] [name=summary]', 'Walk delivered; one late arrival with a verified reason.'); await click('[data-form=closing-report] button');
    await as('p-sami'); await ws('provider/reports?resource=e-reset'); assert.match(await text('main'), /one late arrival with a verified reason/);
    assert.equal((await read()).evaluations.find(e => e.sessionId === 'es-walk' && e.personId === 'p-noor').status, 'Completed');
    // The Provider owner's own views read the same Late/Present records (no stale 'not arrived').
    await ws('provider/attendance?resource=e-reset&session=es-walk');
    const rows = await page.locator('.attendance-person').allInnerTexts();
    assert.ok(rows.some(t => /Noor Khalil/.test(t) && /Present/.test(t)) && rows.some(t => /Omar Saleh/.test(t) && /Late/.test(t)), rows.join(' | '));
    assert.equal(await page.locator('[data-action=attendance-manual]').count(), 0, 'no manual check-in offered for already-recorded people');
    await ws('provider/reports?resource=e-reset');
    const attended = await page.evaluate(() => [...document.querySelectorAll('main tbody tr')].map(r => [...r.cells].map(c => c.textContent.trim())).filter(c => /Noor Khalil|Omar Saleh/.test(c[0])).map(c => `${c[0]}:${c[2]}`));
    assert.deepEqual(attended.sort(), ['Noor Khalil:1', 'Omar Saleh:1'], 'Late counts as attended in Provider reports');
  });
  await step('S3e', 'Provider revokes with a reason; Supervisor loses access; history stays attributed', async () => {
    await ws('provider/supervisors'); const ap = (await read()).appointments.find(a => a.personId === lead).id;
    await click(`[data-action=appointment-revoke-reason][data-id="${ap}"]`); await page.fill('#dialog-body [name=reason]', 'Season ended'); await save();
    await as(lead); await ws('supervisor/dashboard'); assert.match(await text('main'), /Ended appointments/); assert.match(await text('main'), /Season ended/);
    assert.match(await store(m => { try { m.dispatch('supervisor.attendance', {sessionId:'es-walk', personId:'p-noor', method:'manual', reason:'x'}); return 'allowed'; } catch (e) { return e.message; } }), /appointment|workspace/);
    assert.ok((await read()).attendance.some(a => a.actorId === lead));
  });

  // ---------------------------------------------------------------- S4
  await step('S4', 'One person, two contexts: Hala switches between Initiative and Provider duty; each page uses the selected scope', async () => {
    await as('p-sami'); const token = await store(m => m.dispatch('provider.appoint', {experienceId:'e-reset', email:'hala@demo.example', sessionIds:['es-circle'], cohortPermission:false}));
    await as('p-hala'); await store((m, t) => m.dispatch('auth.appointment.accept', {token:t}), token);
    await ws('supervisor/dashboard'); assert.equal(await page.locator('.iw-context').count(), 2, `contexts: ${await page.locator('.iw-context').allInnerTexts()}`);
    await click('.iw-context.is-provider'); assert.match(page.url(), /mode=provider/);
    await ws('supervisor/attendance?mode=provider&resource=e-reset'); assert.match(await text('main h1'), /Attendance desk/); assert.match(await text('main'), /PROVIDER APPOINTMENT/i);
    await click('.iw-context.is-initiative'); await ws('supervisor/excuses?initiative=i-today'); assert.match(await text('main h1'), /Notes & excuses/);
    await ws('supervisor/evaluations?initiative=i-today'); assert.match(await text('main'), /Provider appointment/);
  });

  if (SHOTS) {
    for (const [name, route, pid] of [['m-sup-dash', 'supervisor/dashboard', 'p-hala'], ['m-sup-pdesk', 'supervisor/attendance?mode=provider&resource=e-reset', 'p-hala'], ['m-sup-excuses', 'supervisor/excuses?initiative=i-today', 'p-hala']]) {
      const ctx2 = await browser.newContext({viewport:{width:390, height:844}, storageState:await context.storageState()});
      const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push(`PAGEERROR mobile ${e.message}`));
      await p2.goto(`${BASE}/workspaces.html`); await p2.evaluate(async id => { const m = await import('/src/workspaces/store.js'); m.dispatch('demo.signin', {personId:id}); }, pid);
      await p2.goto(`${BASE}/workspaces.html#/${route}`); await p2.waitForTimeout(800);
      const overflow = await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      results.push({id:`MOB-${name}`, title:`No horizontal page scroll at 390px (${route})`, status:overflow <= 1 ? 'Pass' : 'Fail', error:overflow > 1 ? `${overflow}px` : ''});
      await p2.screenshot({path:`${SHOTS}/${name}.png`, fullPage:true}); await ctx2.close();
    }
    const rm = await browser.newContext({viewport:{width:1280, height:900}, reducedMotion:'reduce', storageState:await context.storageState()});
    const p3 = await rm.newPage(); await p3.goto(`${BASE}/workspaces.html`); await p3.evaluate(async () => { const m = await import('/src/workspaces/store.js'); m.dispatch('demo.signin', {personId:'p-hala'}); });
    await p3.goto(`${BASE}/workspaces.html#/supervisor/dashboard`); await p3.waitForTimeout(500);
    const anim = await p3.evaluate(() => [getComputedStyle(document.querySelector('.iw-reveal')).animationName, getComputedStyle(document.querySelector('.iw-context')).transitionDuration]);
    results.push({id:'RM', title:'Reduced motion: no entrance animation or context transition', status:anim[0] === 'none' && /^0s/.test(anim[1]) ? 'Pass' : 'Fail', error:anim.join(' ')});
    await rm.close();
  }
  await browser.close();
}
main().then(() => {
  const consoleErrors = errors.filter(e => !/favicon|fonts\.g/.test(e));
  results.push({id:'CONSOLE', title:'No console errors or page exceptions', status:consoleErrors.length ? 'Fail' : 'Pass', error:consoleErrors.slice(0, 4).join(' | ')});
  console.log('\n' + results.map(r => `${r.status.padEnd(4)}  ${r.id.padEnd(14)} ${r.title}${r.error ? `  — ${r.error}` : ''}`).join('\n'));
  process.exit(results.some(r => r.status === 'Fail') ? 1 : 0);
}).catch(e => { console.log('\n' + results.map(r => `${r.status.padEnd(4)}  ${r.id.padEnd(14)} ${r.title}`).join('\n')); console.error('Stopped:', e.message, errors.slice(0, 4)); process.exit(1); });
