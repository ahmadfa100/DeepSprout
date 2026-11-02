/**
 * Development demo scenario: a busy "Start Today" initiative.
 *
 * Loaded only through Development demo → Load scenario. It extends the
 * default seed (which the tests rely on) with fictional students, attendance,
 * excuses in every state, reviewed work and staff reports, so every
 * Representative page shows realistic content. Records follow the shapes the
 * commands create.
 */
import {groupMetrics,initiativeMetrics} from '../commands/initiative.js';

const T = (day, time = '10:00') => `2026-10-${String(day).padStart(2, '0')}T${time}:00+03:00`;
const STUDENTS = [
  ['p-dana','Dana Qasem','dana',23,'Online','I keep planning and never starting. I want a small push.'],
  ['p-tariq','Tariq Nabil','tariq',21,'In-person','My studies slip when I wait for the perfect moment.'],
  ['p-hiba','Hiba Saad','hiba',26,'Online','I want people around me who are also learning to begin.'],
  ['p-yousef','Yousef Amin','yousef',19,'In-person','I would like help turning big goals into first steps.'],
  ['p-lama','Lama Odeh','lama',24,'Online','A friend joined last season and it helped her a lot.'],
  ['p-sara','Sara Fayez','sara',29,'In-person','I want to practise starting before I feel ready.']
];

export function busyInitiative(s) {
  for (const [id, name, handle] of STUDENTS) if (!s.people.some(p => p.id === id)) s.people.push({id, name, email:`${handle}@demo.example`, workspaces:['participant'], status:'Active', verified:true, individual:true});

  // Applications: four accepted, two pending (Omar is already pending in the seed).
  const status = {'p-dana':'Accepted','p-tariq':'Accepted','p-hiba':'Accepted','p-yousef':'Accepted','p-lama':'Pending','p-sara':'Pending'};
  STUDENTS.forEach(([pid, , handle, age, mode, motivation], n) => {
    const at = T(15 + (n % 4), '09:30'), accepted = status[pid] === 'Accepted';
    s.admissions.push({id:`adm-${handle}`, code:`APP-${handle.slice(0, 4).toUpperCase()}${20 + n}`, initiativeId:'i-today', personId:pid, status:status[pid], answers:{age, motivation}, consent:{text:'Agree to respectful participation.', version:1, at}, mode, groupId:null, created:at, updated:at, flags:[],
      history:[{at, actorId:pid, from:null, to:'Pending', reason:'Application submitted'}, ...(accepted ? [{at:T(16 + (n % 3), '12:00'), actorId:'p-hala', from:'Pending', to:'Accepted', reason:'Eligible · seat available'}] : [])]});
  });

  // Groups: Dana joins Circle A; Tariq and Hiba form Circle B (still without a Coach); Yousef waits for a group.
  const circleA = s.groups.find(g => g.id === 'g-today-a'), circleB = s.groups.find(g => g.id === 'g-today-b');
  const place = (g, pid) => { g.memberIds.push(pid); const a = s.admissions.find(x => x.personId === pid && x.initiativeId === 'i-today'); if (a) a.groupId = g.id; g.memberHistory.push({personId:pid, action:'Allocated', at:T(17, '13:00'), actorId:'p-maya'}); };
  place(circleA, 'p-dana'); place(circleB, 'p-tariq'); place(circleB, 'p-hiba');

  // Session registrations and factual attendance (Kick-off on 14 Oct, small-step session on 18 Oct).
  const rows = [
    ['s-kickoff','p-dana','Present'], ['s-kickoff','p-tariq','Late'], ['s-kickoff','p-hiba','Absent'], ['s-kickoff','p-yousef','Absent'],
    ['s-intro','p-noor','Present'], ['s-intro','p-rania','Present'], ['s-intro','p-dana','Absent'], ['s-intro','p-tariq','Present'], ['s-intro','p-hiba','Absent']
  ];
  const att = {};
  rows.forEach(([sessionId, pid, st], n) => {
    const ss = s.sessions.find(x => x.id === sessionId);
    if (!ss) return;
    const regId = `sr-busy-${n}`, day = sessionId === 's-kickoff' ? 14 : 18;
    s.sessionRegistrations.push({id:regId, sessionId, personId:pid, mode:ss.format === 'In-person' ? 'In-person' : 'Online', status:'Confirmed', code:`DS-BUSY-${n}`, attendance:'Recorded', completion:'Pending', created:T(day - 1)});
    const record = {id:`att-busy-${n}`, sessionId, registrationId:regId, initiativeId:'i-today', personId:pid, status:st, method:st === 'Absent' ? 'close-out' : 'online-verified', reason:st === 'Absent' ? 'Not checked in when attendance closed' : '', actorId:'p-hala', at:T(day, '19:05'), history:[]};
    s.sessionAttendance.push(record); att[`${sessionId}:${pid}`] = record;
  });

  // Excuses in each state the Representative meets.
  const excuse = (key, pid, reason, st, extra = {}) => {
    const a = att[key]; if (!a) return;
    const created = T(Number(a.at.slice(8, 10)) + 1, '09:00');
    s.excuses.push({id:`excuse-${pid}-${a.sessionId}`, attendanceId:a.id, sessionId:a.sessionId, initiativeId:'i-today', personId:pid, reason, attachment:null, status:st, recommendation:null, decision:null, created, history:[{at:created, actorId:pid, change:'Submitted'}], ...extra});
  };
  const rec = (decision, note, day) => ({recommendation:{decision, note, actorId:'p-hala', at:T(day, '11:00')}});
  excuse('s-kickoff:p-hiba', 'p-hiba', 'I had a university exam that ran late and could not join online in time.', 'Recommended', {...rec('Accept', 'The exam timetable confirms the clash. I recommend accepting.', 16), history:[{at:T(15, '09:00'), actorId:'p-hiba', change:'Submitted'}, {at:T(16, '11:00'), actorId:'p-hala', change:'Supervisor recommendation: Accept'}]});
  excuse('s-kickoff:p-yousef', 'p-yousef', 'My bus was cancelled and I had no connection to join online.', 'Submitted');
  excuse('s-intro:p-dana', 'p-dana', 'Family emergency — I let the group know in advance.', 'Accepted', {...rec('Accept', 'She messaged the group before the session.', 19), decision:{decision:'Accepted', reason:'Informed the group in advance.', actorId:'p-maya', at:T(20, '10:00'), withoutRecommendation:false}, history:[{at:T(19, '09:00'), actorId:'p-dana', change:'Submitted'}, {at:T(19, '11:00'), actorId:'p-hala', change:'Supervisor recommendation: Accept'}, {at:T(20, '10:00'), actorId:'p-maya', change:'Final decision: Accepted'}]});
  excuse('s-intro:p-hiba', 'p-hiba', 'I was unwell.', 'Info Requested', {...rec('More information', 'Could you share a little more about what happened?', 20), history:[{at:T(19, '09:00'), actorId:'p-hiba', change:'Submitted'}, {at:T(20, '11:00'), actorId:'p-hala', change:'Supervisor recommendation: More information'}]});

  // Coach-reviewed work on Circle A's task.
  const task = s.assignments.find(a => a.id === 'a-today-step');
  const sub = (pid, st, text, day, feedback = '') => s.submissions.push({id:`sub-busy-${pid}`, assignmentId:task.id, studentId:pid, text, file:'', status:st, submitted:T(day, '20:00'), feedback, history:[], attempt:1, assignmentVersion:1, activityReference:null, instructionsSnapshot:task.instructions, ...(st === 'Approved' ? {reviewed:T(day + 1, '10:00'), reviewerId:'p-karim'} : {})});
  if (task) {
    sub('p-noor', 'Approved', 'I wrote the first paragraph of my story for ten minutes. It felt easier than I expected.', 17, 'Lovely, concrete step. Keep the ten-minute rule.');
    sub('p-rania', 'Submitted', 'I opened my CV file and fixed the first section.', 21);
  }

  // A second, current task so the Coach sees open work next to the overdue one.
  if (task) {
    s.assignments.push({...task, id:'a-today-protect', title:'Protect ten minutes for one task', activity:'Protected Work', instructions:'Choose one task. Silence your phone, set a ten-minute timer and work only on that task. Write two lines on what helped.', evidence:'Two lines: what you worked on and what helped.', start:'2026-10-28', due:'2026-11-09', required:false, created:T(28, '10:00')});
    s.submissions.push({id:'sub-busy-protect-noor', assignmentId:'a-today-protect', studentId:'p-noor', text:'I worked on my story with the phone in the kitchen. The timer made it feel small enough to start.', file:'', status:'Submitted', submitted:T(30, '19:30'), feedback:'', history:[], attempt:1, assignmentVersion:1, activityReference:null, instructionsSnapshot:'Choose one task. Silence your phone, set a ten-minute timer and work only on that task. Write two lines on what helped.'});
  }

  // The team's written reports.
  if (circleA) s.coachReports.push({id:'coach-report-busy', groupId:circleA.id, initiativeId:'i-today', authorId:'p-karim', period:{from:'2026-10-14', to:'2026-10-24'}, metrics:groupMetrics(s, circleA, '2026-10-14', '2026-10-24'), observations:'Circle A is warm and engaged. Noor finished the first task; Rania is close. Dana missed one session for a family reason.', concerns:'Dana has not submitted the first task yet.', recommendations:'Pair Dana with Noor for the next task.', status:'Submitted', created:T(24, '18:00'), submitted:T(24, '18:00')});
  const initiative = s.initiatives.find(i => i.id === 'i-today');
  if (initiative) s.supervisorSummaries.push({id:'sup-summary-busy', initiativeId:'i-today', authorId:'p-hala', period:{from:'2026-10-14', to:'2026-10-25'}, metrics:initiativeMetrics(s, initiative, '2026-10-14', '2026-10-25'), coachReportIds:['coach-report-busy'], summary:'Attendance is good in Circle A. Circle B still needs a Coach, and two excuses are waiting.', issues:'Circle B has no Coach; Yousef is not in a group yet.', recommendations:'Assign a Coach to Circle B this week and place Yousef.', status:'Submitted', submitted:T(25, '20:00')});
  s.session.personId = 'p-maya';
  return s;
}
