/**
 * Development demo scenario: the Supervisor's view of a busy initiative.
 *
 * Builds on the busy-initiative scenario and adds what a Supervisor works
 * with: a second Coach (Yara) on Circle B, fresh Coach reports from both
 * Coaches, upcoming sessions, a longer initiative so the timeline has a
 * future, and two Supervisor meetings. Signs in as the Supervisor (Hala).
 */
import {busyInitiative} from './busy-initiative.js';
import {groupMetrics} from '../commands/initiative.js';

const T = (date, time = '10:00') => `${date}T${time}:00+03:00`;

export function supervisorDemo(s) {
  busyInitiative(s);
  const i = s.initiatives.find(x => x.id === 'i-today');
  i.end = '2026-11-30';

  // A second Coach, invited by the Representative, now coaching Circle B.
  const yara = s.people.find(p => p.id === 'p-yara');
  if (yara && !yara.workspaces.includes('mentor')) yara.workspaces.push('mentor');
  s.staffInvites.push({id:'sinv-yara', token:'staff-yara-today', initiativeId:'i-today', institutionId:'org-horizon', role:'coach', email:'yara@demo.example', name:'Yara Haddad', message:'Coach Circle B for Start Today.', status:'Accepted', created:T('2026-10-20', '09:00'), expires:T('2026-10-27', '09:00'), sends:1, invitedBy:'p-maya', acceptedBy:'p-yara', history:[]});
  s.grants.push({id:'grant-yara', personId:'p-yara', role:'coach', scopeType:'initiative', scopeId:'i-today', institutionId:'org-horizon', status:'Active', inviteId:'sinv-yara', acceptedAt:T('2026-10-21', '11:00'), revokedAt:null, history:[]});
  const circleA = s.groups.find(g => g.id === 'g-today-a'), circleB = s.groups.find(g => g.id === 'g-today-b');
  circleB.coachId = 'p-yara';
  circleB.coachHistory = [...(circleB.coachHistory || []), {coachId:'p-yara', from:T('2026-10-21', '12:00'), to:null, actorId:'p-maya'}];

  // Circle B's first task, with one submission waiting for Yara.
  const base = s.assignments.find(a => a.id === 'a-today-step');
  s.assignments.push({...base, id:'a-today-map', ownerId:'p-yara', groupId:'g-today-b', title:'Map one distracting moment', activity:'Practical Micro-Challenge', instructions:'Notice one moment this week when you reached for your phone without deciding to. Write what happened just before.', start:'2026-10-26', due:'2026-11-06', created:T('2026-10-26'), version:1});
  s.submissions.push({id:'sub-sup-tariq', assignmentId:'a-today-map', studentId:'p-tariq', text:'It happened right after I opened my study notes. I think I reach for the phone when a task feels big.', file:'', status:'Submitted', submitted:T('2026-10-31', '20:10'), feedback:'', history:[], attempt:1, assignmentVersion:1, activityReference:null, instructionsSnapshot:''});

  // Upcoming sessions, so the timeline and schedule have a future.
  const intro = s.sessions.find(x => x.id === 's-intro');
  s.sessions.push(
    {...structuredClone(intro), id:'s-momentum', title:'Keeping momentum', description:'A check-in on what helped and what got in the way.', date:'2026-11-09', time:'17:00', endTime:'18:00', format:'Online', venue:'', supervisorIds:['p-hala'], status:'Published', closedOut:false},
    {...structuredClone(intro), id:'s-closing', title:'Closing circle', description:'Share one thing you finished and one you will start next.', date:'2026-11-28', time:'16:00', endTime:'17:30', format:'In-person', supervisorIds:['p-hala'], status:'Published', closedOut:false}
  );

  // Fresh Coach reports from both Coaches, waiting for the Supervisor.
  const report = (id, g, author, from, to, observations, concerns, recommendations, at) => s.coachReports.push({id, groupId:g.id, initiativeId:'i-today', authorId:author, period:{from, to}, metrics:groupMetrics(s, g, from, to), observations, concerns, recommendations, status:'Submitted', created:T(at, '18:00'), submitted:T(at, '18:00')});
  report('coach-report-karim-2', circleA, 'p-karim', '2026-10-25', '2026-11-01', 'Noor sent the second task early. Rania’s first task is waiting for my review. The group is calmer about starting.', 'Dana still has not sent the first task and missed one session.', 'A short call with Dana this week; pair her with Noor.', '2026-11-01');
  report('coach-report-yara-1', circleB, 'p-yara', '2026-10-21', '2026-11-01', 'Circle B met for the first time with me. Tariq sent his first task; Hiba is still settling in.', 'Hiba missed two sessions; her excuse is still open.', 'Allow Hiba a late start on the first task.', '2026-11-01');

  // Two meetings the Supervisor already scheduled.
  s.supervisorMeetings = [
    {id:'meeting-coaches', initiativeId:'i-today', organizerId:'p-hala', title:'Coaches check-in', audience:'coaches', coachId:null, date:'2026-11-04', time:'10:00', minutes:30, format:'Online', place:'Video call', note:'Quick round: each group in two minutes.', status:'Scheduled', created:T('2026-11-01')},
    {id:'meeting-karim', initiativeId:'i-today', organizerId:'p-hala', title:'1:1 with Karim about Dana', audience:'coach', coachId:'p-karim', date:'2026-11-05', time:'12:30', minutes:20, format:'Online', place:'Video call', note:'', status:'Scheduled', created:T('2026-11-01')}
  ];
  if (circleA && !circleA.memberIds.includes('p-dana')) circleA.memberIds.push('p-dana');
  s.session.personId = 'p-hala';
  return s;
}
