import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,dispatch,read,STORAGE_KEY} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';

test('rich demo adds records once and keeps existing partner records and a backup', () => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value)
  };
  const original = seed();
  original.session.personId = 'p-karim';
  original.audit.push({id:'existing-user-audit', action:'Preserve me'});
  data.set(STORAGE_KEY, JSON.stringify(original));
  assert.equal(dispatch('demo.enrich'), true);
  const first = read();
  assert.equal(first.session.personId, 'p-karim');
  assert.ok(first.audit.some(x => x.id === 'existing-user-audit'));
  assert.ok(first.admissions.some(x => x.id === 'adm-dana'));
  assert.ok(first.applications.some(x => x.id === 'app-bright'));
  assert.equal(data.get(`${STORAGE_KEY}:backup:before-rich-demo-v1`), JSON.stringify(original));
  const count = [first.people.length, first.admissions.length, first.applications.length];
  assert.equal(dispatch('demo.enrich'), false);
  const second = read();
  assert.deepEqual([second.people.length, second.admissions.length, second.applications.length], count);
});
