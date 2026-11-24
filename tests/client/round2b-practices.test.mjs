import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture,page,baselines} from './helpers/personal-fixture.mjs';
import {dispatch,read,snapshotForTests} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {assignmentDefinition,deprecatedPractice} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/activity-contract.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../../src/DeepSprout.Web/wwwroot/src/data/practices.json',import.meta.url)));
async function activated(){const f=fixture(),pid=f.register('Round Two B'),a=await page(f.storage).DeepSproutAccount.load();a.setDemoClock('2026-10-16T12:00:00+03:00');baselines(a);a.mutate({type:'plan.activate',commitment:{title:'Walk outside'},schedule:[{date:'2026-10-19',activityType:'depth',minutes:3},{date:'2026-10-20',activityType:'listening',minutes:3}]});return {f,pid,a};}
const content=(a,type='depth')=>a.practiceDefinitions(type).find(d=>d.access.allowed);
const answer=d=>({answers:d.questions.map(q=>q.answer)});
function complete(a,d){const r=a.beginPractice(d.id);return a.submitPractice(r.id,answer(d));}
test('2B-1 catalog has exactly four executable families, difficulty-specific content, media and complete version metadata',()=>{
 assert.deepEqual([...new Set(catalog.definitions.map(d=>d.practiceType))].sort(),['depth','digital-judgment','listening','visual-observation']);assert.equal(new Set(catalog.definitions.map(d=>d.id)).size,36);
 for(const family of ['visual-observation','digital-judgment'])for(const level of [1,2,3])assert.equal(catalog.definitions.filter(d=>d.practiceType===family&&d.level===level).length,3);
 for(const d of catalog.definitions){for(const k of ['id','version','contentVersion','level','goalTags','estimatedMinutes','instructions','responseMethod','validationVersion','accessibilityModes','repetition','rewardPolicyVersion'])assert.ok(d[k]);assert.equal(deprecatedPractice(d),false);assert.ok(d.questions.length>=4);for(const q of d.questions)assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);if(d.audio){const bytes=fs.readFileSync(new URL('../../src/DeepSprout.Web/wwwroot/'+d.audio,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.ok(bytes.length>10000);}}
});
test('2B-1 assignment pins approved ID/version/instructions before catalog edits and rejects old taxonomy',()=>{const f=fixture();let s=read();const original=assignmentDefinition(s,'Depth Practice');s.activityCatalog[0].description='Future replacement';s.activityCatalog[0].version=2;assert.notEqual(original.definitionSnapshot.description,s.activityCatalog[0].description);assert.equal(original.activityVersion,1);for(const name of ['Stillness & Reflection','Intentional Pause','Quiet Break','Evening Stillness','Weekly Reflection'])assert.equal(deprecatedPractice({name}),true);s.activityCatalog.push({id:'bad',title:'Quiet Break',version:1,status:'Published'});assert.throws(()=>assignmentDefinition(s,'Quiet Break'),/approved/);snapshotForTests(s);dispatch('demo.signin',{personId:'p-leen'});assert.throws(()=>dispatch('admin.catalog.save',{collection:'activityCatalog',id:'bad',description:'Old content',status:'Published'}),/Retired/);assert.throws(()=>assignmentDefinition(read(),'Protected Work'),/approved/);assert.equal(assignmentDefinition(read(),'Reasoning & Digital Judgment').definitionSnapshot.practiceType,'digital-judgment');});
test('2B-2 four Level 1s, actual Depth scoring, incomplete refusal, draft/reload, snapshot and double-save integrity',async()=>{
 const {a,f}=await activated();assert.deepEqual(Array.from(a.training(),t=>t.level),[1,1,1,1]);const d=content(a),r=a.beginPractice(d.id);assert.throws(()=>a.submitPractice(r.id,{}),/every question/);a.progressPractice(r.id,'save',{responses:answer(d)});const b=await page(f.storage).DeepSproutAccount.load();assert.equal(b.practiceHistory()[0].responses.answers.length,4);const recorded=b.submitPractice(r.id,{answers:[d.questions[0].answer,...d.questions.slice(1).map(q=>(q.answer+1)%4)]});assert.equal(recorded.score,.25);assert.equal(recorded.progressionEligible,false);assert.equal(recorded.valid,true);assert.equal(recorded.definitionSnapshot.content,d.content);d.content='Edited outside original';assert.notEqual(recorded.definitionSnapshot.content,d.content);assert.throws(()=>b.submitPractice(r.id,answer(recorded.definitionSnapshot)),/already recorded/);assert.equal(b.practiceGarden().types.find(t=>t.id==='depth').sources.length,1);
});
test('2B-2 interrupted and timer-only fake attempts cannot earn a source; quota failure leaves retryable original attempt',async()=>{const {a,f}=await activated(),d=content(a),r=a.beginPractice(d.id);a.progressPractice(r.id,'interrupt');assert.throws(()=>a.submitPractice(r.id,answer(d)),/ended/);const fake=a.mutate({type:'attempt.add',attempt:{id:'fake',activityType:'depth',valid:true,outcome:'Timer finished'}});assert.equal(fake.attempt.valid,false);assert.equal(a.practiceGarden().types[0].sources.length,0);const retry=a.beginPractice(d.id);f.fail('*');assert.throws(()=>a.submitPractice(retry.id,answer(d)),/saved/);assert.equal(a.practiceHistory().find(r=>r.id===retry.id).status,'Started');f.fail('');assert.equal(a.submitPractice(retry.id,answer(d)).status,'Completed');assert.equal(a.practiceHistory().filter(r=>r.id===retry.id).length,1);});
test('2B-2 listening requires observed playback; transcript changes conditions and retains truthful classification',async()=>{const {a}=await activated(),d=content(a,'listening'),r=a.beginPractice(d.id);assert.throws(()=>a.submitPractice(r.id,answer(d)),/audio playback/);a.progressPractice(r.id,'audio-start');assert.throws(()=>a.progressPractice(r.id,'audio-progress',{seconds:90}),/Seeking/);for(let seconds=1;seconds<=Math.ceil(d.audioDurationSeconds);seconds++)a.progressPractice(r.id,'audio-progress',{seconds});a.progressPractice(r.id,'audio-end',{duration:d.audioDurationSeconds});const result=a.submitPractice(r.id,answer(d));assert.match(result.evidenceTier,/in-app playback observed/);assert.equal(result.audioVersion,d.audioVersion);assert.ok(result.definitionSnapshot.audioVersion);a.setDemoClock('2026-10-17T12:00:00+03:00');const another=content(a,'listening'),transcript=a.beginPractice(another.id,{mode:'transcript'});assert.match(a.submitPractice(transcript.id,answer(another)).evidenceTier,/transcript recall/);});
test('Interactive attempts require original responses and only a passing score earns a reward',async()=>{
  const {a,f}=await activated(), d=content(a,'visual-observation'), r=a.beginPractice(d.id);
  assert.throws(()=>a.progressPractice(r.id,'answer',{question:0,answer:0}),/study/i);
  assert.throws(()=>a.submitPractice(r.id,answer(d)),/every question/);
  a.progressPractice(r.id,'observe');
  assert.throws(()=>a.progressPractice(r.id,'answer',{question:1,answer:0}),/current question/);
  a.progressPractice(r.id,'answer',{question:0,answer:d.questions[0].answer});
  a.progressPractice(r.id,'pause');
  const b=await page(f.storage).DeepSproutAccount.load();
  assert.deepEqual(Array.from(b.practiceHistory()[0].responses.answers),[d.questions[0].answer]);
  assert.throws(()=>b.progressPractice(r.id,'answer',{question:1,answer:0}),/unavailable/);
  b.progressPractice(r.id,'resume');
  for (let i=1;i<4;i++) b.progressPractice(r.id,'answer',{question:i,answer:(d.questions[i].answer+1)%4});
  const done=b.submitPractice(r.id,answer(d));
  assert.equal(done.score,.25);
  assert.equal(done.rewardEligible,false);
  assert.equal(b.practiceGarden().types.find(t=>t.id==='practical').sources.length,0);
  assert.equal(done.correctCount,1);
  assert.throws(()=>b.submitPractice(r.id),/already recorded/);
});
test('2B-3 three distinct scored examples across three days unlock only their own type; stay, explicit next and down preserve history',async()=>{const {a}=await activated();for(let n=0;n<3;n++){a.setDemoClock(`2026-10-${16+n}T12:00:00+03:00`);complete(a,content(a));if(n<2)assert.equal(a.training()[0].eligible,false);}assert.equal(a.training()[0].eligible,true);assert.equal(a.training()[1].eligible,false);a.decidePracticeLevel('depth','stay');assert.equal(a.training()[0].eligible,true);a.decidePracticeLevel('depth','next');assert.deepEqual(Array.from(a.training(),t=>t.level),[2,1,1,1]);assert.equal(a.training()[0].eligible,false);a.decidePracticeLevel('depth','down');assert.equal(a.training()[0].level,1);assert.equal(a.practiceHistory().filter(r=>r.status==='Completed').length,3);assert.equal(a.exportRecord().levelEvents.filter(e=>e.activityType==='depth').length,4);});
test('2B-3 daily optional load and repeat cooldown apply, scheduled core remains available without duplicate growth',async()=>{const {a}=await activated();a.configurePractices({optionalDaily:1});const first=content(a),done=complete(a,first);assert.throws(()=>a.beginPractice(first.id),/limit|cooldown/);a.setDemoClock('2026-10-17T12:00:00+03:00');assert.equal(a.practiceAccess(first.id).allowed,false);const d=content(a,'listening');if(d) {const r=a.beginPractice(d.id,{mode:'transcript'});a.submitPractice(r.id,answer(d));}
 // Test a scheduled date from the actual activated plan after consuming the optional budget.
 const action=a.exportRecord().scheduledActions.find(x=>x.kind==='practice'&&x.date>'2026-10-17');a.setDemoClock(action.date+'T12:00:00+03:00');const unrelated=content(a,action.activityType==='depth'?'listening':'depth');const r=a.beginPractice(unrelated.id,{mode:unrelated.practiceType==='listening'?'transcript':'standard'});a.submitPractice(r.id,answer(unrelated));const core=content(a,action.activityType);assert.ok(core.access.core);assert.equal(core.access.allowed,true);assert.equal(a.practiceGarden().types.reduce((n,t)=>n+t.sources.filter(s=>s.key==='attempt:'+done.id).length,0),1);
});
test('2B-3 source correction is attributed, does not erase original attempt, and withdraws only its eligible tree effect',async()=>{const {a}=await activated(),d=content(a),done=complete(a,d);a.correctPractice(done.id,'I recorded this under the wrong conditions.');assert.equal(a.practiceGarden().types[0].sources.length,0);assert.equal(a.practiceHistory().find(r=>r.id===done.id).status,'Completed');assert.equal(a.exportRecord().practiceCorrections[0].actor,done.personId);assert.throws(()=>a.correctPractice(done.id,'Again'),/already/);assert.equal(a.practiceGarden().types.length,4);});
test('2B-3 per-Person journal ownership, stale tab and same-ID Student upgrade preserve assigned history',async()=>{const {a,f,pid}=await activated();const d=content(a),r=a.beginPractice(d.id);const b=await page(f.storage).DeepSproutAccount.load();b.progressPractice(r.id,'save',{responses:answer(d)});assert.throws(()=>a.submitPractice(r.id,answer(d)),/another tab/);dispatch('demo.signin',{personId:'p-noor'});assert.throws(()=>b.practiceHistory(),/identity|changed|person|session/i);const before=JSON.stringify(read().submissions);dispatch('account.upgrade',{consent:true});const upgraded=await page(f.storage).DeepSproutAccount.load();assert.equal(upgraded.id,'person:p-noor');assert.equal(upgraded.practiceHistory().length,0);assert.equal(JSON.stringify(read().submissions),before);dispatch('demo.signin',{personId:pid});assert.equal((await page(f.storage).DeepSproutAccount.load()).practiceHistory()[0].id,r.id);});
test('2B-1 both Coach contexts create real version-pinned assignments; catalog edits preserve instructions through submission and upgrade',()=>{
 const f=fixture();dispatch('demo.signin',{personId:'p-maya'});const program=dispatch('mentor.program.save',{title:'Pinned Program',description:'Practice version snapshot',purpose:'Learn with the original source',start:'2026-10-16',end:'2026-10-30',activities:['Depth Practice'],stages:[{id:'version-stage',title:'Read',objective:'Read the original source.',date:'2026-10-20'}],newGroups:[{name:'First pinned group'}]});dispatch('mentor.program.publish',{id:program});const independent=dispatch('mentor.assignment.create',{groupId:'g-fresh',activity:'Depth Practice',title:'Original reading assignment',instructions:'Read the original version and explain one relationship.',due:'2026-10-25'});dispatch('demo.signin',{personId:'p-karim'});const institutional=dispatch('mentor.assignment.create',{groupId:'g-today-a',activity:'Depth Practice',title:'Original institutional reading',instructions:'Explain the original source in your own words.',due:'2026-10-25'});
 dispatch('demo.signin',{personId:'p-leen'});dispatch('admin.catalog.save',{collection:'activityCatalog',id:'activity-0',description:'A future changed definition',status:'Published'});
 dispatch('demo.signin',{personId:'p-maya'});const lateGroup=dispatch('mentor.group.save',{programId:program,name:'Later pinned group',purpose:'Original material'});assert.equal(read().assignments.find(a=>a.groupId===lateGroup).activityVersion,1,'Program publication keeps its content reference even for later groups');
 const records=read().assignments.filter(a=>[independent,institutional].includes(a.id));assert.equal(records.length,2);for(const r of records){assert.equal(r.activityId,'activity-0');assert.equal(r.activityVersion,1);assert.equal(r.definitionSnapshot.version,1);assert.notEqual(r.definitionSnapshot.description,'A future changed definition');}
 dispatch('demo.signin',{personId:'p-noor'});dispatch('member.task.submit',{assignmentId:independent,text:'I read the original version and can explain the shared relationship.'});const sub=read().submissions.find(s=>s.assignmentId===independent);assert.equal(sub.activityReference.version,1);assert.equal(sub.instructionsSnapshot,records.find(a=>a.id===independent).instructions);dispatch('account.upgrade',{consent:true});assert.equal(read().submissions.find(s=>s.id===sub.id).activityReference.version,1);
});
test('Each new family advances independently after three eligible examples on three days',async()=>{
  const {a,f}=await activated();
  for(const type of ['visual-observation','digital-judgment']){
    for (let level=1;level<=2;level++){
      for(let example=0;example<3;example++){
        const day=16+(level-1)*3+example;
        a.setDemoClock('2026-10-'+day+'T12:00:00+03:00');
        const d=content(a,type),run=a.beginPractice(d.id);
        assert.equal(d.level,level);
        if(type==='visual-observation')a.progressPractice(run.id,'observe');
        d.questions.forEach((item,question)=>a.progressPractice(run.id,'answer',{question,answer:item.answer}));
        assert.equal(a.submitPractice(run.id).score,1);
        assert.equal(a.training().find(t=>t.id===type).eligible,example===2);
      }
      a.decidePracticeLevel(type,'next');
      assert.equal(a.training().find(t=>t.id===type).level,level+1);
    }
  }
  const restored=await page(f.storage).DeepSproutAccount.load();
  assert.deepEqual(Array.from(restored.training(),t=>t.level),[1,1,3,3]);
  for(const slot of ['practical','protected-work'])assert.equal(restored.practiceGarden().types.find(t=>t.id===slot).sources.length,6);
});

test('A stored retired Roadmap slot can be completed with its replacement while legacy rewards stay attributed',async()=>{
  const {a,f,pid}=await activated(), key='deepsprout-account-changes-v1:person:'+pid;
  const events=JSON.parse(f.storage.getItem(key));
  const scheduled=events.find(e=>e.type==='plan.activate').recoveryTransaction.actions.find(a=>a.kind==='practice');
  scheduled.activityType='practical';
  events.push({type:'attempt.add',attempt:{id:'old-practice',activityType:'practical',valid:true,on:'2026-10-17',outcome:'Challenge finished'}});
  events.push({type:'practice.start',run:{id:'retired-draft',personId:pid,activityType:'practical',on:'2026-10-17',status:'Started',
    definitionSnapshot:{practiceType:'practical',responseMethod:'artifact-description'},responses:{artifact:'Original draft'},observedSeconds:0,transitions:[]}});
  f.storage.setItem(key,JSON.stringify(events));
  const current=await page(f.storage).DeepSproutAccount.load();
  current.setDemoClock(scheduled.date+'T12:00:00+03:00');
  assert.equal(current.schedule().find(day=>day.isToday).action.activityType,'visual-observation');
  assert.throws(()=>current.submitPractice('retired-draft'),/retired/);
  current.progressPractice('retired-draft','interrupt');
  assert.equal(current.practiceHistory().find(run=>run.id==='retired-draft').responses.artifact,'Original draft');
  const d=content(current,'visual-observation'),r=current.beginPractice(d.id);
  assert.equal(r.scheduledActionId,scheduled.id);
  current.progressPractice(r.id,'observe');
  d.questions.forEach((q,question)=>current.progressPractice(r.id,'answer',{question,answer:q.answer}));
  const result=current.submitPractice(r.id);
  assert.equal(current.schedule().find(day=>day.isToday).attempt.id,result.id);
  assert.equal(current.training().find(t=>t.id==='visual-observation').validAtLevel,1);
  const sources=current.practiceGarden().types.find(t=>t.id==='practical').sources;
  assert.deepEqual(Array.from(sources,s=>s.activityType),['practical','visual-observation']);
  assert.equal(sources.find(s=>s.key==='attempt:old-practice').title,'Practical Micro-Challenge');
});
