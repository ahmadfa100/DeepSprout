/**
 * Four-cycle redesign — command, migration and read-model tests (Node, in-memory store).
 * Covers the Institution-owned Outdoor Activity model, initiative delivery modes,
 * Admin governance effects, Supervisor scope, the Coach assignment loop and the
 * shared Operational Timeline. Browser rendering is covered separately (see the
 * redesign log for the Playwright acceptance run).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {read,dispatch,workspaces,snapshotForTests,seed} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {normalizeActivityData,activityBlockers} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/activity-rules.js';
import {publishBlockers} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/commands/institution.js';
import {exploreInitiatives,exploreOutdoorActivities,myActivityBookings,activityReport} from '../../src/DeepSprout.Web/wwwroot/src/shared/selectors.js';
import {timelineEvents,scopeFor} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/timeline.js';

const as = personId => dispatch('demo.signin', {personId});
const PIN = '2026-10-15T09:00:00+03:00';
const reset = personId => { dispatch('demo.reset'); dispatch('demo.clock', {at:PIN}); if (personId) as(personId); };
const activity = (extra = {}) => ({title:'Sunrise Walk', kind:'Hike', type:'Experience', description:'A slow walk.', objective:'Be outdoors.', venue:'Visitor centre', address:'Demo address', city:'Aqaba', country:'Jordan', audience:'Young adults', minAge:16, eligibility:'Can walk 5 km.', safety:'Bring water.', contact:'Maya · 000', consent:'I read the notes.', start:'2026-10-30', end:'2026-10-30', timezone:'Asia/Amman', registrationOpen:'2026-10-15', registrationClose:'2026-10-29', capacity:1, cost:{type:'Free', price:0, currency:'JOD'}, cancellation:'Cancel before start.', cancellationPolicy:{mode:'before-start'}, completion:'Walk with the group.', completionRule:{kind:'all-required', requiredSessionIds:['ss-1']}, participantForm:{version:1, questions:[]}, waitlist:true, sessions:[{id:'ss-1', title:'Walk', date:'2026-10-30', time:'06:00', endTime:'09:00', format:'In-person', criteria:'Walk the route.', checkInPolicy:{mode:'window', before:30, after:30}}], ...extra});

test('Outdoor Provider is retired: no workspace, registration or provider commands', () => {
  reset();
  const s = read();
  assert.equal(s.providers.length, 0, 'no seeded Provider');
  assert.ok(s.people.every(p => !p.workspaces.includes('provider')), 'no person holds a Provider workspace');
  assert.ok(s.experiences.every(e => s.organizations.some(o => o.id === e.ownerId)), 'every Outdoor Activity is Institution-owned');
  as('p-sami');
  assert.ok(!workspaces().includes('provider') && workspaces().includes('supervisor'), 'Sami keeps only his scoped Supervisor workspace');
  assert.throws(() => dispatch('provider.experience.save', {title:'x'}), /retired/);
  dispatch('auth.account', {name:'New Partner', email:'partner@new.example', consent:true});
  dispatch('auth.otp', {email:'partner@new.example'}); dispatch('auth.verify', {code:'246810'});
  assert.throws(() => dispatch('auth.application.save', {type:'provider', name:'Trail Co', details:{entityName:'Trail Co'}}), /retired/);
});

test('Legacy Provider records are re-homed by explicit mapping or archived, never deleted', () => {
  const legacy = seed();
  legacy.providers = [{id:'prov-trails', name:'Green Trails Collective', status:'Approved', memberIds:['p-sami']}, {id:'prov-orphan', name:'Orphan Outdoors', status:'Approved', memberIds:['p-nobody']}];
  legacy.experiences[0].ownerId = 'prov-trails';
  legacy.experiences.push({...structuredClone(legacy.experiences[1]), id:'e-orphan', ownerId:'prov-orphan', title:'Orphan trip'});
  legacy.offers.push({id:'o-orphan', experienceId:'e-orphan', bookingId:'b-x', personId:'p-omar', status:'Offered', expires:'2026-12-01T00:00:00Z'});
  legacy.people.find(p => p.id === 'p-sami').workspaces.push('provider');
  legacy.activityDataVersion = 1;
  assert.equal(normalizeActivityData(legacy), true);
  const mapped = legacy.experiences.find(e => e.id === 'e-reset'), orphan = legacy.experiences.find(e => e.id === 'e-orphan');
  assert.equal(mapped.ownerId, 'org-horizon'); assert.equal(mapped.legacyOwner.name, 'Green Trails Collective');
  assert.equal(orphan.status, 'Archived'); assert.equal(orphan.ownerId, 'prov-orphan'); assert.match(orphan.archivedReason, /retired/);
  assert.equal(legacy.offers.find(o => o.id === 'o-orphan').status, 'Cancelled', 'held seats on archived records are released');
  assert.ok(legacy.bookings.some(b => b.experienceId === 'e-reset'), 'bookings keep their original activity');
  assert.ok(!legacy.people.find(p => p.id === 'p-sami').workspaces.includes('provider'));
  assert.equal(legacy.migrations.at(-1).kind, 'outdoor-provider-retired');
  assert.equal(normalizeActivityData(legacy), false, 'idempotent');
});

test('Institution creates, publishes and runs an Outdoor Activity end to end', () => {
  reset('p-maya');
  const draft = activity();
  const blockers = activityBlockers(read(), {...draft, title:''}, draft.sessions);
  assert.ok(blockers.some(b => b.field === 'title' && b.step === 0), 'blockers name the field and builder stage');
  const id = dispatch('activity.experience.save', draft);
  assert.equal(read().experiences.find(e => e.id === id).ownerId, 'org-horizon');
  assert.ok(!exploreOutdoorActivities(read(), 'p-ahmad').some(e => e.id === id), 'drafts never reach Explore');
  dispatch('activity.experience.publish', {id});
  const card = exploreOutdoorActivities(read(), 'p-ahmad').find(e => e.id === id);
  assert.ok(card); assert.equal(card.organizer, 'Horizon Youth Center'); assert.equal(card.kind, 'experience'); assert.equal(card.kindLabel, 'Nature walk or hike');
  // capacity 1: second booking waits; cancellation offers the freed seat
  as('p-ahmad'); const b1 = dispatch('member.experience.book', {experienceId:id, version:1, age:23, consent:true, answers:{}, mode:'In-person'});
  as('p-hala'); dispatch('member.experience.book', {experienceId:id, version:1, age:26, consent:true, answers:{}, mode:'In-person'});
  assert.deepEqual(read().bookings.filter(b => b.experienceId === id).map(b => b.status), ['Confirmed', 'Waitlisted']);
  assert.ok(read().notifications.some(n => n.recipientId === 'p-maya' && /Waitlisted booking/.test(n.text)), 'the owning Institution is notified');
  as('p-maya'); dispatch('activity.booking.cancel', {id:b1, reason:'Asked to cancel'});
  assert.deepEqual(read().bookings.filter(b => b.experienceId === id).map(b => b.status), ['Cancelled', 'Seat Offered']);
  // another Institution cannot touch it; the owner cannot fake field attendance
  assert.throws(() => dispatch('activity.attendance', {sessionId:'ss-1', personId:'p-hala', method:'manual', reason:'x'}), /assigned Supervisor/);
  as('p-sami'); assert.throws(() => dispatch('activity.experience.publish', {id}), /Representative/);
  // Supervisor appointment → accept → scoped attendance → completion
  as('p-maya'); const token = dispatch('activity.appoint', {experienceId:id, email:'sami@demo.example', sessionIds:['ss-1']});
  assert.ok(read().appointments.some(a => a.token === token && a.status === 'Invited'), 'pending appointment grants nothing yet');
  as('p-sami'); dispatch('auth.appointment.accept', {token});
  as('p-hala'); dispatch('member.booking.offer.accept', {id:read().offers.find(o => o.experienceId === id && o.status === 'Offered').id});
  dispatch('demo.clock', {at:'2026-10-30T06:10:00+03:00'});
  as('p-sami'); const code = read().bookings.find(b => b.experienceId === id && b.personId === 'p-hala').credential;
  assert.equal(dispatch('supervisor.attendance', {sessionId:'ss-1', credential:code}), 'Present');
  assert.notEqual(read().bookings.find(b => b.experienceId === id && b.personId === 'p-hala').status, 'Completed', 'attendance alone is not completion');
  dispatch('supervisor.evaluate', {sessionId:'ss-1', personId:'p-hala', status:'Completed', notes:'Walked the full route.'});
  assert.equal(read().bookings.find(b => b.experienceId === id && b.personId === 'p-hala').status, 'Completed');
  const rep = activityReport(read(), id);
  assert.equal(rep.present, 1); assert.equal(rep.completed, 1);
  assert.equal(myActivityBookings(read(), 'p-hala').find(b => b.experienceId === id).experience.organizer, 'Horizon Youth Center');
});

test('Initiative delivery mode drives logistics, session formats and Explore modes', () => {
  reset('p-maya');
  const base = {title:'Calm Screens', topic:'Balanced technology use', objective:'o', summary:'s', start:'2026-11-02', end:'2026-11-30', timezone:'Asia/Amman', audience:'a', consent:'c', coverage:'Jordan', country:'Jordan', capacity:30, policies:{completion:'Attend three of four.'}, components:[{id:'c1', type:'Session', title:'Evening', date:'2026-11-04', time:'18:00', endTime:'19:00', format:'Online'}]};
  const online = publishBlockers(read(), {...base, deliveryMode:'Online', platform:'', onlineDetails:''});
  assert.ok(online.some(b => b.field === 'platform' && b.step === 1), 'Online needs a meeting platform');
  assert.ok(!online.some(b => b.field === 'onlineDetails'), 'Optional link instructions do not block publication');
  const mismatch = publishBlockers(read(), {...base, deliveryMode:'In-person', modes:['In-person'], venue:'Hall'});
  assert.ok(mismatch.some(b => b.field === 'format-0'), 'an Online session cannot sit inside a Face-to-Face initiative');
  const id = dispatch('organization.initiative.save', {...base, deliveryMode:'Hybrid', venue:'Horizon hall', platform:'Google Meet', onlineDetails:'Link 24 h before.'});
  assert.deepEqual(read().initiatives.find(i => i.id === id).modes, ['Online', 'In-person', 'Hybrid']);
  dispatch('organization.initiative.publish', {id});
  const card = exploreInitiatives(read(), 'p-ahmad').find(c => c.id === id);
  assert.equal(card.deliveryMode, 'Hybrid'); assert.equal(card.organizer, 'Horizon Youth Center');
});

test('Admin suspension hides an Outdoor Activity from Explore, notifies everyone and keeps records', () => {
  reset('p-leen');
  assert.ok(exploreOutdoorActivities(read(), 'p-ahmad').some(e => e.id === 'e-dana'));
  assert.throws(() => dispatch('admin.resource.status', {collection:'experiences', id:'e-dana', status:'Suspended', reason:''}), /Reason/);
  dispatch('admin.resource.status', {collection:'experiences', id:'e-dana', status:'Suspended', reason:'Route closed by authorities'});
  assert.ok(!exploreOutdoorActivities(read(), 'p-ahmad').some(e => e.id === 'e-dana'), 'hidden from Explore');
  assert.ok(read().bookings.filter(b => b.experienceId === 'e-dana').length === 2, 'bookings kept');
  assert.ok(read().notifications.some(n => n.recipientId === 'p-omar' && /suspended/.test(n.text)), 'booked participant notified');
  assert.ok(read().notifications.some(n => n.recipientId === 'p-maya' && /suspended/.test(n.text)), 'Institution notified');
  as('p-ahmad'); assert.throws(() => dispatch('member.experience.book', {experienceId:'e-dana', version:1, age:22, consent:true, answers:{}}), /unavailable/);
  as('p-leen'); dispatch('admin.resource.status', {collection:'experiences', id:'e-dana', status:'Published', reason:'Route reopened'});
  assert.ok(exploreOutdoorActivities(read(), 'p-ahmad').some(e => e.id === 'e-dana'), 'restored');
  assert.ok(read().experiences.find(e => e.id === 'e-dana').history.some(h => /Platform Admin: Suspended/.test(h.change) && h.reason === 'Route closed by authorities'), 'governance decision is in the resource history');
});

test('Coach loop: assign → submit → revision → resubmit → approve, with scoped timelines', () => {
  reset('p-karim');
  const aid = dispatch('mentor.assignment.create', {groupId:'g-today-a', title:'One calm evening', activity:'Protected Work', instructions:'Protect twenty minutes.', due:'2026-10-25'});
  as('p-noor'); dispatch('student.submit', {assignmentId:aid, text:'Phone in a drawer for twenty minutes.'});
  let sub = read().submissions.find(x => x.assignmentId === aid);
  as('p-karim'); dispatch('mentor.review', {id:sub.id, decision:'Needs Revision', feedback:'What helped most?'});
  as('p-noor'); dispatch('student.submit', {assignmentId:aid, text:'The drawer helped; so did telling a friend.'});
  as('p-karim'); sub = read().submissions.find(x => x.assignmentId === aid); dispatch('mentor.review', {id:sub.id, decision:'Approved', feedback:'Clear and honest.'});
  const s = read();
  assert.equal(s.submissions.find(x => x.assignmentId === aid).status, 'Approved');
  const coach = timelineEvents(s, scopeFor(s, 'mentor', 'p-karim'));
  const rep = timelineEvents(s, scopeFor(s, 'organization', 'p-maya'));
  const ids = list => new Set(list.past.map(e => e.id));
  const reviewIds = coach.past.filter(e => e.category === 'review').map(e => e.id);
  assert.equal(reviewIds.length, 2, 'both review decisions recorded');
  assert.ok(reviewIds.every(id => ids(rep).has(id)), 'the Representative sees the same event IDs (one source, no copies)');
  assert.ok(rep.past.filter(e => e.category === 'review').every(e => !e.text), 'Coach feedback text stays in the Coach view');
  assert.ok(!coach.past.some(e => e.category === 'admission' || e.category === 'booking'), 'Coach sees no applications or bookings');
  // a Coach without a grant sees nothing from this initiative
  const stranger = timelineEvents(s, scopeFor(s, 'mentor', 'p-omar'));
  assert.equal(stranger.past.length + stranger.pending.length, 0);
});

test('Supervisor scope follows active grants; revocation ends future access', () => {
  reset('p-maya');
  let s = read(); const grant = s.grants.find(g => g.personId === 'p-hala' && g.role === 'supervisor');
  assert.ok(scopeFor(s, 'supervisor', 'p-hala').initiativeIds.includes('i-today'));
  assert.ok(timelineEvents(s, scopeFor(s, 'supervisor', 'p-hala')).past.length > 0);
  dispatch('initiative.staff.revoke', {id:grant.id, reason:'Role change'});
  s = read();
  assert.equal(scopeFor(s, 'supervisor', 'p-hala').initiativeIds.length, 0, 'revoked grant gives no scope');
  assert.ok(timelineEvents(s, scopeFor(s, 'organization', 'p-maya')).past.some(e => e.id.startsWith(`grant:${grant.id}`) && e.status === 'Revoked'), 'revocation is attributable history');
  // Upcoming schedule and history are never mixed
  const t = timelineEvents(s, scopeFor(s, 'organization', 'p-maya'));
  assert.ok(t.upcoming.every(e => e.when === 'upcoming') && t.past.every(e => e.when === 'past'));
});
