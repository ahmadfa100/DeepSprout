import test from 'node:test';
import {baselines} from './helpers/personal-fixture.mjs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {seed, read, dispatch, snapshotForTests, STORAGE_KEY} from '../src/workspaces/store.js';

const files = name => fs.readFileSync(new URL(`../src/${name}`, import.meta.url),'utf8');
function fixture() {
  const values = new Map(); let fail = '';
  const storage = {getItem:k=>values.get(k)||null, setItem(k,v){if(fail==='*'||fail===k)throw new Error('QuotaExceededError');values.set(k,v);},removeItem:k=>values.delete(k)};
  globalThis.localStorage=storage;
  snapshotForTests(seed());
  return {values,storage,fail:key=>{fail=key;}};
}
function page(storage) {
  const listeners = {};
  const context=vm.createContext({console,URL,URLSearchParams,Date,Math,JSON,Promise,localStorage:storage,sessionStorage:{getItem:()=>null,setItem(){}},
    location:{search:'',pathname:'/src/pages/member/lab/lab.html',href:'http://localhost/src/pages/member/lab/lab.html',hostname:'localhost'},
    document:{getElementById:()=>null,readyState:'loading',currentScript:{src:'http://localhost/src/js/data/account.js'},body:null,addEventListener(){},querySelectorAll:()=>[]},
    CustomEvent:class {constructor(type){this.type=type;}},
    addEventListener(type,fn){(listeners[type]||=[]).push(fn);},dispatchEvent(event){for(const fn of listeners[event.type]||[])fn(event);},
    fetch:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../'+new URL(url).pathname.replace(/^\//,''),import.meta.url),'utf8'))})});
  context.window=context;
  for(const name of ['js/data/personal-access.js','js/utils/storage.js','js/data/account.js'])vm.runInContext(files(name),context);
  return context;
}
test('two canonical people retain separate setup and activation after reload; stale reads/writes fail',async()=>{
  const f=fixture();const a=dispatch('member.register',{name:'A',email:'a@round0.test',consent:true});
  const first=page(f.storage);first.DeepSprout.update(s=>{s.onboarding.setupDone=true;s.onboarding.planActivated=true;s.plan={startDate:'2026-10-16'};});
  const journal=await first.DeepSproutAccount.load();journal.mutate({type:'setup.save',setup:{protection:'gentle'}});baselines(journal);journal.mutate({type:'plan.activate',goal:'reduce-scrolling',goalLabel:'A goal',lengthDays:28,commitment:{title:'A walk'}});
  const before=f.values.get(`deepsprout-account-changes-v1:person:${a}`);
  const b=dispatch('member.register',{name:'B',email:'b@round0.test',consent:true});
  const second=page(f.storage);assert.equal(second.DeepSprout.get().onboarding.setupDone,false);assert.equal(second.DeepSprout.get().onboarding.planActivated,false);
  const bJournal=await second.DeepSproutAccount.load();assert.equal(bJournal.profile().name,'B');assert.equal(bJournal.plan(),null);baselines(bJournal);bJournal.mutate({type:'plan.activate',goal:'intentional-phone',goalLabel:'B goal',lengthDays:28,commitment:{title:'B walk'}});
  assert.throws(()=>journal.mutate({type:'routine.add',title:'stale'}),/identity changed/);
  assert.throws(()=>journal.exportRecord(),/identity changed/);
  assert.throws(()=>first.DeepSproutAccount.resetChanges(),/identity changed/);
  assert.equal(f.values.get(`deepsprout-account-changes-v1:person:${a}`),before);
  dispatch('demo.signin',{personId:a});assert.equal(page(f.storage).DeepSprout.get().onboarding.planActivated,true);
  assert.equal((await page(f.storage).DeepSproutAccount.load()).plan().goalLabel,'A goal');
  dispatch('demo.signin',{personId:b});assert.equal((await page(f.storage).DeepSproutAccount.load()).plan().goalLabel,'B goal');
  assert.notEqual(a,b);
});
test('limited Student has no personal journal; upgrade preserves Person and operational history',async()=>{
  const f=fixture(), s=read(), p=s.people.find(p=>p.workspaces.includes('student'));p.individual=false;delete p.journal;s.session.personId=p.id;snapshotForTests(s);
  const before=JSON.stringify(read().submissions);const limited=page(f.storage);
  await assert.rejects(limited.DeepSproutAccount.load(),/Individual/);
  assert.throws(()=>limited.DeepSprout.update(s=>{s.onboarding.planActivated=true;}),/Individual/);
  dispatch('account.upgrade',{consent:true});assert.equal(read().session.personId,p.id);assert.equal(JSON.stringify(read().submissions),before);
  assert.equal((await page(f.storage).DeepSproutAccount.load()).id,`person:${p.id}`);
});
test('known legacy ownership migrates once with backup; ambiguous ownership stays unclaimed',()=>{
  const f=fixture();dispatch('member.register',{name:'A',email:'legacy@round0.test',consent:true});
  const legacy=JSON.stringify({profile:{email:'legacy@round0.test'},onboarding:{setupDone:true},assessments:{original:{completedAt:'2026-01-01'}}});
  f.values.set('deepsprout-user-v1',legacy);
  assert.equal(page(f.storage).DeepSprout.get().onboarding.setupDone,true);
  assert.equal(f.values.get('deepsprout-user-v1:backup:before-person-binding'),legacy);
  const before=JSON.stringify([...f.values]);page(f.storage).DeepSprout.get();assert.equal(JSON.stringify([...f.values]),before);
  dispatch('member.register',{name:'B',email:'other@round0.test',consent:true});assert.equal(page(f.storage).DeepSprout.get().onboarding.setupDone,false);
  assert.equal(f.values.get('deepsprout-user-v1'),legacy);
});
test('failed operational, journal and migration saves preserve last valid data and return errors',async()=>{
  const f=fixture(), before=f.values.get(STORAGE_KEY);f.fail('*');
  assert.throws(()=>dispatch('member.register',{name:'Lost',email:'lost@round0.test',consent:true}),/could not be saved/);assert.equal(f.values.get(STORAGE_KEY),before);
  f.fail('');const pid=dispatch('member.register',{name:'A',email:'save@round0.test',consent:true});const p=page(f.storage), journal=await p.DeepSproutAccount.load();
  f.fail('*');assert.throws(()=>journal.mutate({type:'routine.add',title:'Lost'}),/could not be saved/);assert.equal(journal.changeCount(),0);assert.equal(journal.exportRecord().routine.length,0);
  assert.throws(()=>journal.mutate({type:'preferences.save',preferences:{shield:'unsaved',recovery:'unsaved'}}),/could not be saved/);assert.equal(journal.exportRecord().preferences,undefined);
  const legacy=JSON.stringify({profile:{email:'save@round0.test'},onboarding:{setupDone:true}});f.values.set('deepsprout-user-v1',legacy);
  assert.throws(()=>p.DeepSprout.get(),/could not be saved/);assert.equal(f.values.has(`deepsprout-user-v1:person:${pid}`),false);
  f.fail('');const old=JSON.parse(f.values.get(STORAGE_KEY));old.schema=3;const raw=JSON.stringify(old);f.values.set(STORAGE_KEY,raw);f.fail(`${STORAGE_KEY}:backup:schema-3`);
  assert.throws(()=>read(),/backup could not be saved/);assert.equal(f.values.get(STORAGE_KEY),raw);
});
test('display name is canonical; verified email and unrelated identities cannot change through profile',()=>{
  fixture();const pid=dispatch('member.register',{name:'A',email:'profile@round0.test',consent:true});
  dispatch('member.profile.update',{name:'New name'});assert.equal(read().people.find(p=>p.id===pid).name,'New name');
  assert.throws(()=>dispatch('member.profile.update',{name:'Other',email:'someone@round0.test'}),/verified email/);
  assert.equal(read().people.find(p=>p.id===pid).email,'profile@round0.test');
});

test('operational schema 1 and 3 backups precede idempotent migration and preserve original graph IDs',()=>{
 for(const schema of [1,3]){
  const f=fixture(), s=read();s.schema=schema;
  const original={people:s.people.map(p=>p.id),groups:s.groups.map(g=>g.id),submissions:s.submissions.map(x=>x.id),invitations:s.invitations.map(x=>x.id),attendance:s.attendance.map(x=>x.id)};
  const raw=JSON.stringify(s);f.values.set(STORAGE_KEY,raw);
  const migrated=read();assert.equal(migrated.schema,4);assert.equal(f.values.get(`${STORAGE_KEY}:backup:schema-${schema}`),raw);
  for(const [key,ids] of Object.entries(original))for(const id of ids)assert.ok(migrated[key].some(x=>x.id===id),`${key} ${id}`);
  const persisted=f.values.get(STORAGE_KEY);read();assert.equal(f.values.get(STORAGE_KEY),persisted);assert.equal(f.values.get(`${STORAGE_KEY}:backup:schema-${schema}`),raw);
 }
});

test('a legacy foreign journal alias cannot redirect a canonical Individual to seeded or another person data',async()=>{
 const f=fixture(),pid=dispatch('member.register',{name:'Own journal',email:'alias@round0.test',consent:true}),s=read();s.people.find(p=>p.id===pid).journal='demo';snapshotForTests(s);
 assert.equal((await page(f.storage).DeepSproutAccount.load()).id,`person:${pid}`);
});
