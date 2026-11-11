import test from 'node:test';
import assert from 'node:assert/strict';
import {seed, read, STORAGE_KEY} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {addSamiSupervisorDemo} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/data/sami-supervisor-demo.js';
import {supervisorContexts} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/pages/institution/supervisor-context.js';

test('Sami sample has assigned work and attributable field records', () => {
  const s = seed();
  const contexts = supervisorContexts({s, person:s.people.find(p => p.id === 'p-sami')});
  assert.equal(contexts.filter(c => c.type === 'initiative').length, 1);
  assert.equal(contexts.filter(c => c.type === 'activity').length, 4);
  assert.equal(s.cohorts.filter(c => c.supervisorId === 'p-sami').length, 3);
  assert.equal(s.attendance.filter(a => a.actorId === 'p-sami').length, 5);
  assert.equal(s.evaluations.filter(v => v.actorId === 'p-sami').length, 4);
  assert.ok(s.excuses.some(e => e.id === 'excuse-sami-focus-zain' && e.status === 'Submitted'));
  const sessions = new Set(s.experienceSessions.map(x => x.id));
  const appointments = s.appointments.filter(a => a.personId === 'p-sami' && a.status === 'Accepted');
  for (const ap of appointments)
    for (const id of ap.sessionIds) assert.ok(sessions.has(id), `${ap.id}: ${id}`);
  for (const row of s.attendance.filter(a => a.id.startsWith('att-sami-park-'))) {
    const booking = s.bookings.find(b => b.id === row.bookingId);
    assert.equal(row.personId, booking.personId);
    assert.equal(row.experienceId, booking.experienceId);
  }
  for (const completion of s.providerCompletions.filter(c => c.id.startsWith('pc-sami-park-'))) {
    assert.ok(completion.attendanceIds.every(id => s.attendance.some(a => a.id === id && a.bookingId === completion.bookingId)));
    assert.ok(completion.evaluationIds.every(id => s.evaluations.some(v => v.id === id && v.bookingId === completion.bookingId)));
  }
  assert.equal(addSamiSupervisorDemo(s), false);
});

test('Sami existing browser records gain the sample without losing edits', () => {
  const values = new Map();
  globalThis.localStorage = {getItem:key => values.get(key) ?? null,
    setItem:(key, value) => values.set(key, String(value))};
  const old = seed();
  delete old.samiSupervisorDemoVersion;
  old.session.personId = 'p-sami';
  old.closingReports.find(r => r.id === 'report-sami-park').summary = 'Sami edited this report';
  old.experiences = old.experiences.filter(e => e.id !== 'e-sami-hills');
  values.set(STORAGE_KEY, JSON.stringify(old));
  const upgraded = read();
  assert.equal(upgraded.closingReports.find(r => r.id === 'report-sami-park').summary, 'Sami edited this report');
  assert.ok(upgraded.experiences.some(e => e.id === 'e-sami-hills'));
  assert.equal(upgraded.samiSupervisorDemoVersion, 1);
  assert.ok(values.has(`${STORAGE_KEY}:backup:before-sami-supervisor-demo-v1`));
  assert.equal(read().experiences.length, upgraded.experiences.length);
});
