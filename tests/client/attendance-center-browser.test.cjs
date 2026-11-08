/**
 * Attendance Management Center — REAL browser test (Playwright + Chrome).
 *
 * Fresh isolated storage, demo clock pinned. Covers the acceptance workflows:
 * sessions-first overview and filters, Online import (file chooser and
 * drag-and-drop, .csv and .xlsx), preview, one confirmation, duplicate
 * protection, Add Participant, review resolution, In-person QR check-in,
 * Hybrid separation, finalize without premature Absent, excuse
 * recommendation, Institution and participant views, phone width and
 * console errors.
 *
 *   BASE_URL=http://127.0.0.1:8799 CHROME_PATH=... SHOTS_DIR=... node tests/client/attendance-center-browser.test.cjs
 */
const assert = require('node:assert/strict');
let chromium;
try { ({chromium} = require('playwright-core')); } catch { try { ({chromium} = require('playwright')); } catch { console.log('attendance-center-browser: skipped (playwright-core not installed) — NOT a pass'); process.exit(2); } }
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const SHOTS = process.env.SHOTS_DIR || '';
const PIN = '2026-10-15T09:00:00+03:00';
const results = [], errors = [];

const ROWS = [
  ['Noor Khalil', 'noor@demo.example', '10/20/2026 05:58:00 PM', '10/20/2026 06:30:00 PM', '32', 'No'],
  ['Noor Khalil', 'noor@demo.example', '10/20/2026 06:33:00 PM', '10/20/2026 07:00:00 PM', '27', 'No'],
  ['Rania Yasin', 'rania@demo.example', '10/20/2026 06:15:00 PM', '10/20/2026 07:00:00 PM', '45', 'No'],
  ['Dana Qasem', 'dana@demo.example', '10/20/2026 06:05:00 PM', '10/20/2026 06:25:00 PM', '20', 'No'],
  ['Tariq (Tariq Nabil)', '', '10/20/2026 06:01:00 PM', '10/20/2026 06:59:00 PM', '58', 'Yes'],
  ['Phone guest', 'guest.caller@example.com', '10/20/2026 06:06:00 PM', '10/20/2026 06:50:00 PM', '44', 'Yes']
];
const HEAD = ['Name (Original Name)', 'User Email', 'Join Time', 'Leave Time', 'Duration (Minutes)', 'Guest'];
const CSV = Buffer.from([HEAD, ...ROWS].map(r => r.map(v => `"${v}"`).join(',')).join('\r\n'));

async function main() {
  const {buildXlsx} = await import('./helpers/xlsx-fixture.mjs');
  const XLSX = buildXlsx([HEAD, ...ROWS]);
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || undefined, headless:true});
  const context = await browser.newContext({viewport:{width:1360, height:950}});
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(`PAGEERROR ${page.url()} ${e.stack}`));
  const step = async (id, title, fn) => {
    try { await fn(); results.push({id, title, status:'Pass'}); console.log(`✔ ${id} ${title}`); }
    catch (e) { results.push({id, title, status:'Fail', error:e.message}); console.log(`✖ ${id} ${title}\n   ${e.message}`); if (SHOTS) await page.screenshot({path:`${SHOTS}/ac-fail-${id}.png`, fullPage:true}).catch(() => {}); throw e; }
  };
  const store = (fn, arg) => page.evaluate(async ([src, a]) => { const m = await import('/src/workspaces/store.js'); return new Function('m', 'a', `return (${src})(m, a)`)(m, a); }, [fn.toString(), arg]);
  const read = () => store(m => m.read());
  const as = pid => store((m, id) => m.dispatch('demo.signin', {personId:id}), pid);
  const clock = iso => store((m, at) => m.dispatch('demo.clock', {at}), iso);
  const ws = async route => { const target = `${BASE}/workspaces.html#/${route}`; if (page.url() === target) await page.reload(); else await page.goto(target); await page.waitForSelector('main#main'); await page.waitForTimeout(350); };
  const click = async sel => { await page.click(sel); await page.waitForTimeout(300); };
  const save = async () => { await page.click('#dialog-save'); await page.waitForTimeout(400); const e = await page.textContent('#dialog-error').catch(() => ''); if (e) throw new Error(`Dialog: ${e}`); };
  const text = sel => page.textContent(sel);
  const shot = async name => { if (SHOTS) await page.screenshot({path:`${SHOTS}/${name}.png`, fullPage:true}); };
  const rowStatus = async name => (await page.locator('.ac-table.is-roster tbody tr', {hasText:name}).locator('.ac-status').first().textContent()).trim();
  const noOverflow = async label => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(o <= 1, `${label}: horizontal overflow ${o}px`); };

  await page.goto(`${BASE}/workspaces.html`);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await store(m => m.dispatch('demo.scenario', {name:'busy-initiative'})); await clock(PIN);
  const ids = await store(m => {
    m.dispatch('demo.signin', {personId:'p-maya'});
    const mk = f => { const id = m.dispatch('initiative.session.save', {initiativeId:'i-today', speaker:'Maya Haddad', time:'18:00', endTime:'19:00', supervisorIds:['p-hala'], ...f}); m.dispatch('initiative.session.publish', {id}); return id; };
    const online = mk({title:'Online focus clinic', date:'2026-10-20', format:'Online', meeting:'https://zoom.us/j/123456789', onlineCapacity:20});
    const room = mk({title:'Hall planning circle', date:'2026-10-20', time:'20:00', endTime:'21:00', format:'In-person', venue:'Hall 2', address:'2 Demo Street, Amman', inPersonCapacity:20});
    const hidden = mk({title:'Session without a Supervisor', date:'2026-10-21', format:'Online', meeting:'https://zoom.us/j/123456789', onlineCapacity:20, supervisorIds:[]});
    for (const pid of ['p-noor', 'p-rania', 'p-dana', 'p-tariq', 'p-hiba']) { m.dispatch('demo.signin', {personId:pid}); m.dispatch('member.session.register', {sessionId:online, mode:'Online', consent:true}); }
    for (const pid of ['p-noor', 'p-rania']) { m.dispatch('demo.signin', {personId:pid}); m.dispatch('member.session.register', {sessionId:room, mode:'In-person', consent:true}); }
    return {online, room, hidden};
  });
  await clock('2026-10-20T19:10:00+03:00'); await as('p-hala');

  await step('A1', 'Attendance starts with assigned sessions (no scanner, no roster); filters and search work; unassigned sessions are not listed', async () => {
    await ws('supervisor/attendance');
    assert.equal((await text('main h1')).trim(), 'Attendance');
    assert.match(await text('main .iw-lead'), /Manage attendance, imports, and exceptions\./);
    assert.equal(await page.locator('[data-form=ac-checkin], .ac-table.is-roster, .ac-drop').count(), 0, 'overview has no QR scanner, roster or upload');
    const main = await text('main');
    for (const t of ['All Sessions', 'Needs Attention', 'Completed', 'Online focus clinic', 'Hall planning circle', 'Start with one small step']) assert.match(main, new RegExp(t));
    assert.doesNotMatch(main, /Session without a Supervisor/);
    const row = page.locator('.ac-row', {hasText:'Online focus clinic'});
    assert.match(await row.textContent(), /Online/); assert.match(await row.textContent(), /Report import/); assert.match(await row.textContent(), /Awaiting attendance report/); assert.match(await row.textContent(), /Open session details/);
    await shot('ac-overview');
    await click('nav.iw-tabs a:has-text("Needs Attention")'); assert.match(page.url(), /view=attention/);
    assert.ok(await page.locator('.ac-row', {hasText:'Online focus clinic'}).count());
    await ws('supervisor/attendance'); await page.fill('main input[data-filter=search]', 'hall'); await page.waitForTimeout(200);
    assert.equal(await page.locator('.ac-row:not([hidden])').count(), 1, 'search narrows the list');
  });

  await step('A2', 'Online session details show the honest integration status and report import, not in-person QR check-in', async () => {
    await ws(`supervisor/attendance/${ids.online}`);
    assert.match(await text('main h1'), /Online focus clinic/);
    for (const t of ['Verified', 'Not recorded', 'Needs review', 'Meeting integration', 'Not connected', 'Attendance report import', 'Drag and drop the attendance report here', 'Browse files']) assert.match(await text('main'), new RegExp(t));
    assert.equal(await page.locator('[data-form=ac-checkin]').count(), 0, 'no QR check-in for an online session');
    await shot('ac-online-upload');
  });

  await step('A3', 'Uploading a CSV shows a real matching preview: merged rejoins, Present/Late, review, unmatched, missing', async () => {
    await page.setInputFiles(`#ac-file-${ids.online}`, {name:'zoom-participants.csv', mimeType:'text/csv', buffer:CSV});
    await page.waitForSelector('.ac-preview'); await page.waitForTimeout(200);
    const t = await text('.ac-import');
    assert.match(t, /zoom-participants\.csv/); assert.match(t, /Zoom/);
    assert.match(await text('.ac-tile.is-present'), /2/);
    const row = name => page.locator('.ac-preview tbody tr', {hasText:name}).textContent();
    assert.match(await row('noor@demo.example'), /Will record Present/); assert.match(await row('noor@demo.example'), /2 rows merged/);
    assert.match(await row('rania@demo.example'), /Will record Late/);
    assert.match(await row('dana@demo.example'), /Needs review/);
    assert.match(await row('Tariq'), /Name match only/);
    assert.match(await row('guest.caller@example.com'), /Unmatched/);
    assert.equal((await read()).sessionAttendance.filter(a => a.sessionId === ids.online).length, 0, 'preview writes nothing');
    await shot('ac-online-preview');
  });

  await step('A4', 'One confirmation records eligible attendance and keeps unresolved rows for review', async () => {
    await click('[data-action=ac-import-step][data-step="3"]');
    assert.match(await text('.ac-confirm'), /2 attendance records/);
    await shot('ac-online-confirm');
    await click('[data-action=ac-import-confirm]');
    assert.match(await text('.ac-done'), /Import complete/);
    const s = await read(), recs = s.sessionAttendance.filter(a => a.sessionId === ids.online);
    assert.deepEqual(recs.map(a => `${a.personId}:${a.status}:${a.method}`).sort(), ['p-noor:Present:report-import', 'p-rania:Late:report-import']);
    assert.equal(s.attendanceReviews.filter(r => r.sessionId === ids.online && r.status === 'Open').length, 3);
    await ws(`supervisor/attendance/${ids.online}?tab=participants`);
    assert.equal(await rowStatus('Noor Khalil'), 'Present'); assert.equal(await rowStatus('Rania Yasin'), 'Late'); assert.equal(await rowStatus('Dana Qasem'), 'Needs Review'); assert.equal(await rowStatus('Hiba Saad'), 'Not Recorded');
    assert.match(await text('.ac-table.is-roster'), /Report import/);
    assert.equal(await page.locator('.ac-table.is-roster button:text-is("Present"), .ac-table.is-roster button:text-is("Absent")').count(), 0, 'no per-participant Present/Absent buttons');
    await shot('ac-online-participants');
  });

  await step('A5', 'Re-importing the same file is refused; a re-export dropped as .xlsx creates no duplicates', async () => {
    await ws(`supervisor/attendance/${ids.online}`);
    assert.match(await text('.ac-import'), /Import complete/, 'the finished import stays visible until a new one starts');
    await click('[data-action=ac-import-reset]');
    await page.setInputFiles(`#ac-file-${ids.online}`, {name:'zoom-participants.csv', mimeType:'text/csv', buffer:CSV});
    await page.waitForSelector('.ac-preview');
    assert.match(await text('.ac-tile.is-present'), /0/); assert.match(await text('.ac-preview'), /Already recorded/);
    await click('[data-action=ac-import-step][data-step="3"]'); await click('[data-action=ac-import-confirm]');
    assert.match(await text('#workspace-toast'), /already imported/);
    const before = (await read()).sessionAttendance.length;
    await click('[data-action=ac-import-reset]');
    await page.evaluate(async ({id, bytes}) => {
      const file = new File([new Uint8Array(bytes)], 'zoom-participants.xlsx', {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const dt = new DataTransfer(); dt.items.add(file);
      const zone = document.querySelector(`[data-drop-import="${id}"]`);
      for (const type of ['dragenter', 'dragover', 'drop']) zone.dispatchEvent(new DragEvent(type, {bubbles:true, cancelable:true, dataTransfer:dt}));
    }, {id:ids.online, bytes:[...XLSX]});
    await page.waitForSelector('.ac-preview');
    assert.match(await text('.ac-file'), /zoom-participants\.xlsx/);
    await click('[data-action=ac-import-step][data-step="3"]'); await click('[data-action=ac-import-confirm]');
    assert.match(await text('.ac-done'), /0 attendance records created/);
    const s = await read();
    assert.equal(s.sessionAttendance.length, before, 'no new attendance records'); assert.equal(s.attendanceImports.filter(x => x.sessionId === ids.online).length, 2);
  });

  await step('A6', 'Add Participant: focused modal, eligible people only, reason required; the roster updates without marking Present', async () => {
    await ws(`supervisor/attendance/${ids.online}?tab=participants`);
    await click('[data-action=ac-add]');
    assert.match(await text('#dialog-body'), /does not mark them present/);
    assert.equal(await page.locator('#dialog-body input[name=personId][value="p-lama"]').isDisabled(), true, 'pending applicant cannot be chosen');
    await page.check('#dialog-body input[name=personId][value="p-yousef"]');
    await page.fill('#dialog-body [name=reason]', 'Joined by phone; registered with the front desk.');
    await save();
    assert.equal(await rowStatus('Yousef Amin'), 'Not Recorded');
    assert.match(await page.locator('.ac-table.is-roster tbody tr', {hasText:'Yousef Amin'}).textContent(), /Added by Hala Mansour/);
  });

  await step('A7', 'Excuses & exceptions: a name-only row is resolved with a note; history records the import and the review', async () => {
    await ws(`supervisor/attendance/${ids.online}?tab=exceptions`);
    assert.match(await text('main'), /Phone guest/);
    await click('.ac-review:has-text("Tariq") [data-action=ac-review]');
    await page.selectOption('#dialog-body [name=personId]', 'p-tariq');
    await page.check('#dialog-body input[name=decision][value="Present"]');
    await page.fill('#dialog-body [name=reason]', 'Display name matches his registration.'); await save();
    assert.equal((await read()).sessionAttendance.find(a => a.sessionId === ids.online && a.personId === 'p-tariq').method, 'review-resolved');
    await ws(`supervisor/attendance/${ids.online}?tab=history`);
    const h = await text('main');
    assert.match(h, /zoom-participants\.csv/); assert.match(h, /SHA-256/); assert.match(h, /Zoom report imported/); assert.match(h, /Tariq Nabil · Present/); assert.match(h, /added to the roster/);
    await shot('ac-online-history');
  });

  await step('A8', 'Finalizing without a complete report never records missing participants as Absent', async () => {
    await clock('2026-10-20T19:31:00+03:00');
    await ws(`supervisor/attendance/${ids.online}`);
    await click('[data-action=ac-finalize]');
    assert.match(await text('#dialog-body'), /No complete report was imported, so they stay Not Recorded/);
    await save();
    await ws(`supervisor/attendance/${ids.online}?tab=participants`);
    assert.equal(await rowStatus('Hiba Saad'), 'Not Recorded'); assert.equal(await rowStatus('Dana Qasem'), 'Needs Review');
  });

  await step('A9', 'In-person session: QR check-in records Present automatically, rejects replays; no report import', async () => {
    await clock('2026-10-20T20:04:00+03:00');
    await ws(`supervisor/attendance/${ids.room}`);
    assert.equal(await page.locator('.ac-import').count(), 0, 'no report import for an in-person session');
    assert.match(await text('main'), /QR check-in/); assert.match(await text('main'), /Check-in open/);
    const code = (await read()).sessionRegistrations.find(r => r.sessionId === ids.room && r.personId === 'p-noor').code;
    await page.fill('[data-form=ac-checkin] [name=code]', code); await click('[data-form=ac-checkin] button.primary');
    await page.fill('[data-form=ac-checkin] [name=code]', code); await click('[data-form=ac-checkin] button.primary');
    assert.match(await text('[data-form=ac-checkin] .form-error'), /Already checked in/);
    assert.match(await text('.ac-progress'), /1 of 2 in-person participants checked in/);
    const rec = (await read()).sessionAttendance.find(a => a.sessionId === ids.room && a.personId === 'p-noor');
    assert.equal(rec.status, 'Present'); assert.equal(rec.method, 'booking-code');
    await shot('ac-inperson');
    const qr = await page.evaluate(c => { const q = window.qrcode(0, 'M'); q.addData(c); q.make(); return q.getModuleCount(); }, code);
    assert.ok(qr >= 21, 'booking QR encodes with the bundled generator');
  });

  await step('A10', 'Hybrid session separates verification by participation mode', async () => {
    await ws('supervisor/attendance/s-intro');
    assert.equal(await page.locator('.ac-mode-group').count(), 2);
    assert.match(await text('.ac-mode-group:nth-of-type(1)'), /report import/); assert.match(await text('main'), /QR check-in/);
    await shot('ac-hybrid');
  });

  await step('A11', 'Supervisor recommends on an excuse in the session; the Representative keeps the final decision', async () => {
    await clock('2026-10-20T21:31:00+03:00');
    await ws(`supervisor/attendance/${ids.room}`); await click('[data-action=ac-finalize]');
    await page.check('#dialog-body input[name=inPersonCheckInRan]'); await save();
    const att = (await read()).sessionAttendance.find(a => a.sessionId === ids.room && a.personId === 'p-rania');
    assert.equal(att.status, 'Absent');
    await as('p-rania'); await store((m, id) => m.dispatch('member.excuse.submit', {attendanceId:id, reason:'My bus broke down on the way.'}), att.id); await as('p-hala');
    await ws(`supervisor/attendance/${ids.room}?tab=exceptions`);
    assert.match(await text('main'), /My bus broke down/); assert.equal(await page.locator('main button:has-text("Accept excuse")').count(), 0, 'no final decision for the Supervisor');
    await click('[data-action=excuse-recommend]'); await page.selectOption('#dialog-body [name=decision]', 'Accept'); await page.fill('#dialog-body [name=note]', 'Transport issue confirmed by the driver.'); await save();
    assert.match(await text('main'), /With the Representative/);
    await as('p-maya'); await store((m, id) => m.dispatch('initiative.excuse.decide', {id, decision:'Accepted', reason:'Transport issue.'}), (await read()).excuses.find(e => e.attendanceId === att.id).id);
    assert.equal((await read()).sessionAttendance.find(a => a.id === att.id).status, 'Absent', 'accepted excuse keeps the fact Absent');
  });

  await step('A12', 'Changes appear in the Institution session roster and the participant’s own view', async () => {
    await ws(`organization/sessions/${ids.online}`);
    assert.match(await text('main'), /Report import/); assert.match(await text('main'), /Reviewed import/);
    await as('p-noor'); await store(m => { if (!m.person().individual) m.dispatch('account.upgrade', {consent:true}); });
    await page.goto(`${BASE}/src/pages/member/explore/explore.html#my-initiatives`, {waitUntil:'load'}); await page.waitForSelector('#ex-my-initiatives'); await page.waitForTimeout(700);
    const mine = await text('#ex-my-initiatives');
    assert.match(mine, /Online focus clinic/); assert.match(mine, /Present/);
    await as('p-hala');
  });

  await step('A13', 'Phone width: overview and details fit without horizontal scrolling', async () => {
    await page.setViewportSize({width:390, height:844});
    await ws('supervisor/attendance'); await noOverflow('overview'); await shot('ac-mobile-overview');
    await ws(`supervisor/attendance/${ids.online}`); await noOverflow('details'); await shot('ac-mobile-details');
    await ws(`supervisor/attendance/${ids.online}?tab=participants`); await noOverflow('participants');
    await page.setViewportSize({width:1360, height:950});
  });

  await step('A14', 'No console errors', async () => { assert.deepEqual(errors, []); });
  await browser.close();
}
main().then(() => { console.log(`\n${results.filter(r => r.status === 'Pass').length}/${results.length} passed`); }).catch(async e => { console.log(`\n${results.filter(r => r.status === 'Pass').length}/${results.length} passed before failure`); if (errors.length) console.log('Console errors:\n' + errors.join('\n')); process.exitCode = 1; });
