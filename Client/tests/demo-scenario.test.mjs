import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {fixture,page} from './helpers/personal-fixture.mjs';
import {dispatch,read} from '../src/workspaces/store.js';

// Builds the presentation scenario through the real journal engines and checks
// that every visible figure is backed by an original, internally consistent record.
async function built(){
 const f=fixture();dispatch('demo.signin',{personId:'p-rania'});
 const context=page(f.storage);vm.runInContext(fs.readFileSync(new URL('../src/js/data/demo-scenarios.js',import.meta.url),'utf8'),context);
 const a=await context.DeepSproutAccount.load();const summary=context.DeepSproutDemoScenarios.build(a,'rania-active-journey');
 return {f,a,summary,context};
}

test('Demo · Rania scenario is built only through validated engine events and pins her personal clock',async()=>{
 const {a,summary,context}=await built();
 assert.equal(summary.personId,'p-rania');assert.equal(a.profile().name,'Rania Yasin');
 assert.equal(a.todayKey,'2026-10-16');assert.equal(a.personalClock().source,'Person-bound demo clock');
 assert.equal(context.DeepSproutDemoScenarios.marker('p-rania').scenario,'rania-active-journey');
 const p=a.plan();assert.equal(p.status,'Active');assert.equal(p.week,3);assert.equal(p.day,19);assert.equal(p.personId,'p-rania');
});

test('Demo · four baselines and weekly Lab results satisfy the current instrument contracts and are labelled synthetic',async()=>{
 const {a}=await built();const record=a.exportRecord();
 const baselines=record.assessmentAttempts.filter(x=>x.kind==='baseline');
 assert.deepEqual(baselines.map(x=>x.definitionId).sort(),['depth-challenge','digital-habits','inhibitory-control','sustained-attention']);
 for(const x of record.assessmentAttempts){
  assert.equal(x.valid,true);assert.equal(x.validity.status,'Valid');assert.equal(x.personId,'p-rania');
  const contract=a.exportRecord&&x;for(const key of ['version','protocolVersion','scoringVersion','variant','difficulty','conditions'])assert.ok(contract[key],key);
  assert.ok(x.details.some(d=>d.value==='Synthetic presentation scenario'));
  if(x.definitionId!=='digital-habits')assert.equal(x.measurementContext.presentation,'demo-scenario');
 }
 const weekly=record.assessmentAttempts.filter(x=>x.kind==='weekly');assert.equal(weekly.length,4);
 assert.deepEqual([...new Set(weekly.map(x=>x.windowId))].length,2);
 assert.deepEqual(record.plan.baselineIds.sort(),baselines.map(x=>x.id).sort());
});

test('Demo · completed scheduled practices reference valid original attempts of the right Person, type and day',async()=>{
 const {a}=await built();const record=a.exportRecord();
 const attempts=new Map(record.activityAttempts.map(x=>[x.id,x]));
 const done=a.schedule(1).concat(a.schedule(2),a.schedule(3)).filter(d=>d.state==='completed'&&d.action.kind==='practice');
 assert.ok(done.length>=10,`completed ${done.length}`);
 for(const d of done){const x=attempts.get(d.attempt.id);assert.ok(x,'attempt exists');assert.equal(x.valid,true);assert.equal(x.personId,'p-rania');assert.equal(x.activityType,d.action.activityType);assert.equal(x.on,d.key);assert.equal(x.scheduledActionId,d.action.id);}
 assert.equal(new Set(done.map(d=>d.attempt.id)).size,done.length,'one attempt satisfies one obligation');
 assert.ok(a.schedule(2).some(d=>d.state==='missed'),'the skipped day is recorded as missed, not invented as done');
 const today=a.schedule(3).find(d=>d.key==='2026-10-16');assert.equal(today.action.kind,'practice');assert.notEqual(today.state,'completed');
 for(const x of record.activityAttempts.filter(x=>x.activityType==='listening'))assert.match(x.evidenceTier,/transcript/);
});

test('Demo · reviews reference the right plan, cycle and week; the level change followed configured eligibility',async()=>{
 const {a}=await built();const record=a.exportRecord(),plan=a.plan();
 const history=a.reviews().history;assert.deepEqual(history.map(r=>r.week),[1,2]);
 for(const r of history){assert.equal(r.personId,'p-rania');assert.equal(r.cycleId,plan.cycleId);assert.equal(r.journeyId,plan.journeyId);assert.equal(r.decision,'accept');}
 const depth=a.training().find(t=>t.id==='depth');assert.equal(depth.level,2);
 const decision=record.levelEvents.find(e=>e.activityType==='depth'&&e.choice==='next');assert.ok(decision,'an attributed level decision exists');assert.equal(decision.from,1);
 const before=record.activityAttempts.filter(x=>x.activityType==='depth'&&x.level===1&&x.progressionEligible&&x.on<=decision.on);
 assert.ok(new Set(before.map(x=>x.activityId)).size>=3&&new Set(before.map(x=>x.on)).size>=3,'three distinct examples across separate days before the next level');
 assert.equal(a.training().find(t=>t.id==='protected-work').validAtLevel,0,'no Protected Work timer evidence is fabricated');
});

test('Demo · Garden sources derive from qualifying attempts; Shield has no generated telemetry; operational records are untouched',async()=>{
 const {a}=await built();const record=a.exportRecord(),ids=new Set(record.activityAttempts.filter(x=>x.rewardEligible).map(x=>'attempt:'+x.id));
 const sources=a.practiceGarden().types.flatMap(t=>t.sources);assert.ok(sources.length>=5);
 for(const s of sources)assert.ok(ids.has(s.key),s.key);
 assert.equal(a.browserUsage?.().days?.filter?.(d=>d.minutes>0).length||0,0);
 const s=read();assert.equal(s.bookings.find(b=>b.id==='b-rania').status,'Waitlisted');assert.equal(s.admissions.find(x=>x.id==='adm-rania').status,'Accepted');
});

test('Demo · another Person cannot read the scenario journal and the scenario cannot be built over existing records',async()=>{
 const {f,a,context}=await built();
 assert.throws(()=>context.DeepSproutDemoScenarios.build(a,'rania-active-journey'),/already has records/);
 dispatch('demo.signin',{personId:'p-yara'});assert.throws(()=>a.plan(),/identity|session|changed|person/i);
 const yara=await page(f.storage).DeepSproutAccount.load();assert.equal(yara.plan(),null);assert.equal(yara.exportRecord().activityAttempts.length,0);
});

test('Demo · history labels the self-reported questionnaire honestly and names weekly Lab windows',async()=>{
 const {a}=await built();const checks=a.history().filter(e=>e.kind==='baseline');
 const dh=checks.filter(e=>e.title.startsWith('Digital Habits'));assert.ok(dh.length>=2);
 for(const e of dh)assert.match(e.note,/self-reported/);
 for(const e of checks.filter(e=>!e.title.startsWith('Digital Habits')))assert.match(e.note,/measured/);
 assert.ok(checks.some(e=>/Weekly Lab · week 1/.test(e.note)));assert.ok(checks.some(e=>/^Starting point/.test(e.note)));
});

test('Demo · repeat Lab results tell no improvement story and stay recognisably synthetic',async()=>{
 const {a}=await built();const rows=a.exportRecord().assessmentAttempts;
 const base=Object.fromEntries(rows.filter(x=>x.kind==='baseline').map(x=>[x.definitionId,x.score]));
 for(const x of rows.filter(x=>x.kind==='weekly')){
  const lowerIsBetter=x.definitionId==='digital-habits';
  assert.ok(lowerIsBetter?x.score>=base[x.definitionId]:x.score<=base[x.definitionId],`${x.definitionId} ${base[x.definitionId]} → ${x.score} must not show improvement`);
  assert.ok(x.details.some(d=>d.value==='Synthetic presentation scenario'));
 }
});
