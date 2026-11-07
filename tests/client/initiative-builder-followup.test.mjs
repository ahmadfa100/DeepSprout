import test from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {publishBlockers,institutionCommand} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/commands/institution.js';
import {offerNextSeat,expireInitiativeOffers,initiativeCommand} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/commands/initiative.js';

test('planned component cards do not block publication and can be completed later', () => {
  const s=seed(), i=s.initiatives.find(x=>x.id==='i-today');
  i.components.push({id:'planned-outdoor',type:'Outdoor Activity',title:'',planned:true});
  assert.equal(publishBlockers(s,i).filter(x=>x.step===2).length,0);
  assert.throws(()=>institutionCommand(s,'organization.initiative.component.update',{id:i.id,componentId:'planned-outdoor',title:'Weekend outdoors',activate:true},'p-maya'),/Choose a resource/);
  assert.equal(i.components.at(-1).planned,true,'an invalid activation leaves the card planned');
  const experience=s.experiences.find(x=>x.ownerId===i.ownerId&&!['Archived','Cancelled'].includes(x.status));
  institutionCommand(s,'organization.initiative.component.update',{id:i.id,componentId:'planned-outdoor',title:'Weekend outdoors',resourceId:experience.id,activate:true},'p-maya');
  assert.equal(i.components.at(-1).resourceId,experience.id);
  assert.equal(i.components.at(-1).planned,false);
});

test('manual initiative seat offers stay open until the representative releases them', () => {
  const s=seed(),i=s.initiatives.find(x=>x.id==='i-today');
  s.demoClock='2026-10-15T09:00:00+03:00';
  i.policies.offerManual=true;
  s.admissions=s.admissions.filter(a=>a.initiativeId!==i.id);
  s.admissions.push({id:'queued-test',initiativeId:i.id,personId:'p-omar',status:'Queued',queuedAt:'2026-10-15T08:00:00+03:00',history:[]});
  s.admissions.push({id:'queued-next',initiativeId:i.id,personId:'p-hala',status:'Queued',queuedAt:'2026-10-15T08:05:00+03:00',history:[]});
  i.capacity=1;
  offerNextSeat(s,i);
  const a=s.admissions.find(x=>x.id==='queued-test');
  assert.equal(a.status,'Offered');
  assert.equal(a.offer.expires,'');
  assert.equal(expireInitiativeOffers(s),false);
  assert.equal(a.status,'Offered');
  initiativeCommand(s,'initiative.offer.release',{id:a.id},'p-maya');
  assert.equal(a.status,'Expired');
  assert.equal(s.admissions.find(x=>x.id==='queued-next').status,'Offered');
});
