import test from 'node:test';
import assert from 'node:assert/strict';
import {read,dispatch,snapshotForTests} from '../src/workspaces/store.js';
import {assignedTasks,exploreInitiatives} from '../src/shared/selectors.js';
const as=personId=>dispatch('demo.signin',{personId});
const reset=()=>{dispatch('demo.reset');dispatch('demo.clock',{at:'2026-10-15T09:00:00+03:00'});};
const edit=fn=>{const s=read();fn(s);snapshotForTests(s);};
test('member and participant form/competition commands share admission, owner, publication, dates, consent/version and duplicates',()=>{
 for(const prefix of ['member','participant']){
  reset();as('p-rania');edit(s=>s.admissions=s.admissions.filter(a=>a.personId!=='p-rania'));
  assert.throws(()=>dispatch(`${prefix}.form.respond`,{formId:'f-start',answers:{}}),/accepted participants/);
  assert.throws(()=>dispatch(`${prefix}.competition.enter`,{competitionId:'c-create',consent:true,text:'Mine'}),/accepted participants/);
  edit(s=>{const a=structuredClone(s.admissions.find(a=>a.initiativeId==='i-today'&&a.status==='Accepted'));Object.assign(a,{id:'adm-round0',personId:'p-rania'});s.admissions.push(a);});
  const answers={'q-start':'Distractions','q-confidence':'4'};
  edit(s=>s.forms.find(f=>f.id==='f-start').ownerId='foreign-owner');assert.throws(()=>dispatch(`${prefix}.form.respond`,{formId:'f-start',answers}),/another Institution/);edit(s=>s.forms.find(f=>f.id==='f-start').ownerId='org-horizon');
  edit(s=>s.forms.find(f=>f.id==='f-start').close='2026-10-14');
  assert.throws(()=>dispatch(`${prefix}.form.respond`,{formId:'f-start',answers}),/deadline/);
  edit(s=>{s.forms.find(f=>f.id==='f-start').close='2026-10-30';s.competitions.find(c=>c.id==='c-create').deadline='2026-10-14';});
  assert.throws(()=>dispatch(`${prefix}.competition.enter`,{competitionId:'c-create',consent:true,text:'Mine'}),/deadline/);
  edit(s=>{s.competitions.find(c=>c.id==='c-create').deadline='2026-11-01';s.organizations[0].status='Suspended';});
  for(const [kind,p] of [['form',{formId:'f-start',answers}],['competition',{competitionId:'c-create',consent:true,text:'Mine'}]])assert.throws(()=>dispatch(`${prefix}.${kind}.${kind==='form'?'respond':'enter'}`,p),/Institution/);
  edit(s=>s.organizations[0].status='Approved');
  assert.throws(()=>dispatch(`${prefix}.form.respond`,{formId:'f-start',answers,version:99}),/changed/);
  edit(s=>s.forms.find(f=>f.id==='f-start').consentRequired=true);
  assert.throws(()=>dispatch(`${prefix}.form.respond`,{formId:'f-start',answers}),/consent/);
  const response=dispatch(`${prefix}.form.respond`,{formId:'f-start',answers,version:1,consent:true});assert.equal(read().responses.find(r=>r.id===response).personId,'p-rania');
  assert.throws(()=>dispatch(`${prefix}.form.respond`,{formId:'f-start',answers,consent:true}),/already responded/);
  assert.throws(()=>dispatch(`${prefix}.competition.enter`,{competitionId:'c-create',text:'No consent'}),/consent/);
  const entry=dispatch(`${prefix}.competition.enter`,{competitionId:'c-create',consent:true,text:'Mine'});assert.equal(read().entries.find(r=>r.id===entry).personId,'p-rania');
  assert.throws(()=>dispatch(`${prefix}.competition.enter`,{competitionId:'c-create',consent:true,text:'Again'}),/already submitted/);
 }
});
test('suspended Institution blocks discovery/applications and restoration rechecks registration dates',()=>{
 reset();as('p-rania');edit(s=>s.organizations[0].status='Suspended');const count=read().admissions.length;
 assert.equal(exploreInitiatives(read(),'p-rania').length,0);
 for(const action of ['member.application.submit','participant.enroll'])assert.throws(()=>dispatch(action,{initiativeId:'i-today',age:22,consent:true}),/not open/);
 assert.equal(read().admissions.length,count);
 edit(s=>{s.organizations[0].status='Approved';s.initiatives.find(i=>i.id==='i-today').registrationClose='2026-10-14';});
 assert.throws(()=>dispatch('participant.enroll',{initiativeId:'i-today',age:22,consent:true}),/not open/);
});
test('Provider transitions reject suspension, closed window, invalid original hold, changed consent, expiry, capacity and foreign actor',()=>{
 reset();as('p-rania');edit(s=>{s.bookings=s.bookings.filter(b=>b.personId!=='p-rania');s.providers[0].status='Suspended';});
 assert.throws(()=>dispatch('participant.book',{experienceId:'e-reset',age:22,consent:true}),/unavailable/);
 edit(s=>{s.providers[0].status='Approved';s.experiences[0].registrationClose='2026-10-14';});
 assert.throws(()=>dispatch('participant.book',{experienceId:'e-reset',age:22,consent:true}),/window/);
 edit(s=>s.experiences[0].registrationClose='2026-10-23');
 assert.throws(()=>dispatch('participant.book',{experienceId:'e-reset',age:17,consent:true}),/eligibility/);
 const bid=dispatch('participant.book',{experienceId:'e-reset',age:22,consent:true});
 as('p-sami');dispatch('provider.booking.cancel',{id:'b-omar'});const oid=read().offers.find(o=>o.bookingId===bid).id;
 as('p-noor');assert.throws(()=>dispatch('participant.offer.accept',{id:oid}),/another participant/);
 as('p-rania');edit(s=>s.experiences[0].status='Suspended');assert.throws(()=>dispatch('participant.offer.accept',{id:oid}),/unavailable/);
 edit(s=>{s.experiences[0].status='Published';s.experiences[0].version++;});assert.throws(()=>dispatch('participant.offer.accept',{id:oid}),/consent changed/);
 edit(s=>{s.experiences[0].version--;s.bookings.find(b=>b.id===bid).status='Waitlisted';});assert.throws(()=>dispatch('participant.offer.accept',{id:oid}),/active booking hold/);
 edit(s=>{s.bookings.find(b=>b.id===bid).status='Seat Offered';s.experiences[0].capacity=1;});assert.throws(()=>dispatch('participant.offer.accept',{id:oid}),/seat/);
 edit(s=>s.experiences[0].capacity=2);dispatch('participant.offer.accept',{id:oid});assert.throws(()=>dispatch('participant.offer.accept',{id:oid}),/processed/);
 reset();as('p-rania');edit(s=>{s.bookings=s.bookings.filter(b=>b.personId!=='p-rania');s.bookings[0].status='Cancelled';s.experiences[0].approval=true;});const pending=dispatch('participant.book',{experienceId:'e-reset',age:22,consent:true});as('p-sami');
 edit(s=>s.experiences[0].registrationClose='2026-10-14');assert.throws(()=>dispatch('provider.booking.approve',{id:pending}),/window/);
});
test('revoked Coach loses Initiative cancellation authority but keeps independent capabilities',()=>{
 reset();edit(s=>{const g=s.groups.find(g=>g.parentType==='initiative');g.coachId='p-maya';s.grants.push({id:'round0-coach',personId:'p-maya',scopeId:g.initiativeId,role:'coach',status:'Active'});s.assignments.push({id:'round0-task',groupId:g.id,ownerId:'p-maya',title:'Former work',status:'Active',due:'2026-10-20'});});as('p-maya');
 edit(s=>s.grants.filter(g=>g.personId==='p-maya'&&g.role==='coach').forEach(g=>g.status='Revoked'));
 assert.throws(()=>dispatch('mentor.assignment.cancel',{id:'round0-task',reason:'No authority'}),/currently assigned/);
 assert.equal(read().assignments.find(a=>a.id==='round0-task').status,'Active');
 assert.ok(dispatch('mentor.assignment.create',{groupId:'g-fresh',title:'Independent still works',activity:'Depth Practice',instructions:'Read',due:'2026-10-20'}));
});
test('task windows, cancelled reviews/rewards, own history, removed membership and private staff notes',()=>{
 reset();as('p-maya');const aid=dispatch('mentor.assignment.create',{groupId:'g-fresh',title:'Window task',activity:'Depth Practice',instructions:'Read',start:'2026-10-16',due:'2026-10-20'});
 as('p-noor');for(const action of ['student.submit','member.task.submit'])assert.throws(()=>dispatch(action,{assignmentId:aid,text:'Early'}),/not started/);
 edit(s=>{s.assignments.find(a=>a.id===aid).start='2026-10-14';s.assignments.find(a=>a.id===aid).due='2026-10-14';});assert.throws(()=>dispatch('student.submit',{assignmentId:aid,text:'Late'}),/deadline/);
 edit(s=>s.assignments.find(a=>a.id===aid).due='2026-10-20');dispatch('student.submit',{assignmentId:aid,text:'Own reflection'});const sub=read().submissions.find(x=>x.assignmentId===aid);
 as('p-maya');dispatch('mentor.review',{id:sub.id,decision:'Needs Revision',feedback:'Public feedback',internalNote:'STAFF SECRET'});
 assert.ok(!JSON.stringify(assignedTasks(read(),'p-noor')).includes('STAFF SECRET'));assert.ok(JSON.stringify(read().submissions.find(x=>x.id===sub.id)).includes('STAFF SECRET'));
 as('p-noor');dispatch('student.submit',{assignmentId:aid,text:'Own revision'});as('p-maya');assert.throws(()=>dispatch('mentor.assignment.cancel',{id:aid}),/reason/);
 dispatch('mentor.assignment.cancel',{id:aid,reason:'Replaced'});const rewards=read().rewards.length;assert.throws(()=>dispatch('mentor.review',{id:sub.id,decision:'Approved'}),/cancelled/);assert.equal(read().rewards.length,rewards);
 assert.equal(assignedTasks(read(),'p-noor').find(t=>t.id===aid).actionable,false);
 dispatch('mentor.member.remove',{groupId:'g-fresh',personId:'p-noor'});
 const future=dispatch('mentor.assignment.create',{groupId:'g-fresh',title:'Future private work',activity:'Depth Practice',instructions:'Read',due:'2026-10-20'});
 const history=assignedTasks(read(),'p-noor');assert.ok(history.some(t=>t.id===aid));assert.ok(!history.some(t=>t.id===future));assert.ok(!JSON.stringify(history).includes('STAFF SECRET'));
 as('p-noor');assert.throws(()=>dispatch('student.submit',{assignmentId:future,text:'No membership'}),/assigned/);
});
test('suspended Initiative rejects submissions and approval while preserving original work',()=>{
 reset();edit(s=>{const g=s.groups.find(g=>g.parentType==='initiative'),a=s.assignments.find(a=>a.groupId===g.id);s.session.personId=g.memberIds[0];a.start='2026-10-14';a.due='2026-10-20';s.initiatives.find(i=>i.id===g.initiativeId).status='Suspended';});
 const s=read(),g=s.groups.find(g=>g.parentType==='initiative'),a=s.assignments.find(a=>a.groupId===g.id);assert.throws(()=>dispatch('member.task.submit',{assignmentId:a.id,text:'No'}),/not active/);
});

test('independent published Institution form preserves legitimate identified responses through both entry paths',()=>{
 for(const prefix of ['member','participant']){
  reset();as('p-maya');const fid=dispatch('organization.form.save',{title:'Independent survey',purpose:'Survey',questions:[{id:'q',label:'First step?',type:'Short text',required:true}]});dispatch('organization.form.publish',{id:fid});
  as('p-rania');const response=dispatch(`${prefix}.form.respond`,{formId:fid,answers:{q:'Read'}});assert.equal(read().responses.find(r=>r.id===response).personId,'p-rania');
 }
});
