import test from 'node:test';
import assert from 'node:assert/strict';
import {seed, read, STORAGE_KEY} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {addMayaInstitutionDemo} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/data/maya-institution-demo.js';

test('Maya institution sample has linked records and can be added only once', () => {
  const s = seed();
  assert.equal(s.initiatives.filter(i => i.ownerId === 'org-horizon').length, 4);
  assert.ok(s.admissions.filter(a => a.initiativeId === 'i-maya-focus').length >= 12);
  assert.ok(s.sessionAttendance.filter(a => a.initiativeId === 'i-maya-unplug').length >= 16);
  assert.ok(s.responses.filter(r => r.formId === 'f-maya-focus').length >= 6);
  assert.ok(s.bookings.filter(b => b.experienceId === 'e-maya-city-walk').length >= 5);
  const ids = key => new Set(s[key].map(x => x.id));
  const people = ids('people'), initiatives = ids('initiatives'), sessions = ids('sessions');
  const registrations = ids('sessionRegistrations'), forms = ids('forms'), experiences = ids('experiences');
  for (const a of s.admissions) { assert.ok(people.has(a.personId), a.id); assert.ok(initiatives.has(a.initiativeId), a.id); }
  for (const a of s.sessionAttendance) { assert.ok(registrations.has(a.registrationId), a.id); assert.ok(sessions.has(a.sessionId), a.id); }
  for (const r of s.responses) assert.ok(forms.has(r.formId), r.id);
  for (const b of s.bookings) assert.ok(experiences.has(b.experienceId), b.id);
  for (const r of [...s.coachReports, ...s.supervisorSummaries].filter(r => r.id.includes('maya')))
    assert.ok(Date.parse(r.submitted) <= Date.parse('2026-10-16T10:00:00+03:00'), r.id);
  assert.equal(addMayaInstitutionDemo(s), false);
});

test('existing Maya browser data gains the sample without replacing edits', () => {
  const values = new Map();
  globalThis.localStorage = {getItem:key => values.get(key) ?? null,
    setItem:(key, value) => values.set(key, String(value))};
  const old = seed();
  delete old.institutionDemoVersion;
  old.session.personId = 'p-maya';
  old.initiatives.find(i => i.id === 'i-maya-focus').summary = 'Maya edited this summary';
  old.initiatives = old.initiatives.filter(i => i.id !== 'i-maya-neighbour');
  values.set(STORAGE_KEY, JSON.stringify(old));
  const upgraded = read();
  assert.equal(upgraded.initiatives.find(i => i.id === 'i-maya-focus').summary, 'Maya edited this summary');
  assert.ok(upgraded.initiatives.some(i => i.id === 'i-maya-neighbour'));
  assert.equal(upgraded.institutionDemoVersion, 1);
  assert.ok(values.has(`${STORAGE_KEY}:backup:before-maya-institution-demo-v1`));
  assert.equal(read().initiatives.length, upgraded.initiatives.length);
});
