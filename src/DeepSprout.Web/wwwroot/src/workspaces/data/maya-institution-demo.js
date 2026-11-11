/** Additional fictional records for Maya Haddad's Horizon institution demo.
 * Stable IDs and guarded inserts make this safe for an existing browser store.
 */
import {normalizeInitiative} from '../migrate.js';
import {groupMetrics, initiativeMetrics} from '../commands/initiative.js';

const ORG = 'org-horizon';
const at = (date, time = '10:00') => `${date}T${time}:00+03:00`;
const add = (s, key, row) => {
  if (!s[key].some(item => item.id === row.id)) s[key].push(row);
};

const PARTICIPANTS = [
  ['p-maya-lina', 'Lina Barakat', 'lina.barakat', 22],
  ['p-maya-nader', 'Nader Salem', 'nader.salem', 25],
  ['p-maya-yara', 'Yara Masri', 'yara.masri', 20],
  ['p-maya-basil', 'Basil Khoury', 'basil.khoury', 27],
  ['p-maya-dima', 'Dima Rashed', 'dima.rashed', 23],
  ['p-maya-zain', 'Zain Odeh', 'zain.odeh', 19],
  ['p-maya-farah', 'Farah Nasser', 'farah.nasser', 24],
  ['p-maya-malik', 'Malik Hamdan', 'malik.hamdan', 21],
  ['p-maya-aya', 'Aya Darwish', 'aya.darwish', 26],
  ['p-maya-rami', 'Rami Abu Zaid', 'rami.abuzaid', 28],
  ['p-maya-salma', 'Salma Qasem', 'salma.qasem', 20],
  ['p-maya-hussein', 'Hussein Faris', 'hussein.faris', 23]
];

function initiative(base, id, fields) {
  return normalizeInitiative({...structuredClone(base), id, ownerId:ORG, components:[],
    teamIds:['team-maya'], history:[], version:1, ...fields});
}

function admission(s, initiativeId, personId, status, day, groupId = null) {
  const person = s.people.find(p => p.id === personId);
  const id = `adm-maya-${initiativeId}-${personId}`;
  const created = at(day, '09:30');
  add(s, 'admissions', {id, code:`APP-${initiativeId.slice(2, 6).toUpperCase()}-${personId.slice(-4).toUpperCase()}`,
    initiativeId, personId, status, answers:{age:person?.demoAge || 22,
      motivation:'I want to make more room for focused and meaningful time offline.'},
    consent:{text:'Agree to respectful participation.', version:1, at:created},
    mode:'In-person', groupId, created, updated:created, flags:[],
    history:[{at:created, actorId:personId, from:null, to:'Pending', reason:'Application submitted'},
      ...(status === 'Pending' ? [] : [{at:at(day, '14:00'), actorId:'p-maya', from:'Pending',
        to:status === 'Completed' ? 'Accepted' : status,
        reason:status === 'Queued' ? 'Eligible · waiting for a seat' : 'Eligibility and place confirmed'}]),
      ...(status === 'Completed' ? [{at:at('2026-09-30', '18:00'), actorId:'p-maya',
        from:'Accepted', to:'Completed', reason:'Completion criteria met'}] : [])]});
}

function session(s, id, initiativeId, title, date, time, endTime, format, capacity, supervisorIds) {
  add(s, 'sessions', {id, initiativeId, ownerId:ORG, title,
    description:'A guided group session with a practical activity and a short reflection.',
    agenda:'Welcome · Guided practice · Group reflection', speaker:'Maya Haddad', date, time, endTime,
    timezone:'Asia/Amman', format, venue:format === 'Online' ? '' : 'Horizon Youth Center, Amman',
    meeting:format === 'Online' ? 'Protected demo meeting room' : '', capacity,
    onlineCapacity:format === 'Online' ? capacity : 0, inPersonCapacity:format === 'Online' ? 0 : capacity,
    status:'Published', eligibility:'Accepted initiative participants',
    instructions:'Bring a notebook and one small idea to try.',
    attendancePolicy:'An assigned Supervisor records factual attendance.', attendanceRequired:true,
    supervisorIds, registrationOpen:initiativeId === 'i-maya-unplug' ? '2026-08-20' : '2026-10-01',
    registrationClose:date,
    completionRule:'Attend and take part in the reflection.', history:[]});
}

function form(s, id, initiativeId, title, questions) {
  add(s, 'forms', {id, ownerId:ORG, initiativeId, title, purpose:'Survey', anonymous:false,
    status:'Published', version:1, questions, versions:[]});
}

export function addMayaInstitutionDemo(s) {
  if (!s.organizations?.some(o => o.id === ORG && o.memberIds?.includes('p-maya')) ||
      !s.initiatives?.some(i => i.id === 'i-today' && i.ownerId === ORG)) return false;
  const before = Object.values(s).filter(Array.isArray).reduce((n, a) => n + a.length, 0);
  const base = s.initiatives.find(i => i.id === 'i-today');

  for (const [id, name, handle, age] of PARTICIPANTS) add(s, 'people',
    {id, name, email:`${handle}@demo.example`, workspaces:['participant'],
      status:'Active', verified:true, individual:true, demoAge:age});

  add(s, 'initiatives', initiative(base, 'i-maya-unplug', {
    title:'Unplug Together', topic:'Offline connection',
    objective:'Practice simple ways to reconnect with people and places beyond the screen.',
    summary:'Four weeks of small offline experiments, conversation, and shared reflection.',
    description:'An earlier Horizon cohort exploring screen habits and real-world connection.',
    start:'2026-09-03', end:'2026-09-30', registrationOpen:'2026-08-20',
    registrationClose:'2026-09-02', capacity:24, status:'Completed',
    completion:'Attend two sessions and submit one reflection.',
    components:[{id:'cmp-maya-unplug-session', type:'Session', title:'The first offline hour', resourceId:'s-maya-unplug-1'},
      {id:'cmp-maya-unplug-form', type:'Survey or Quiz', title:'What changed?', resourceId:'f-maya-unplug'}]}));
  add(s, 'initiatives', initiative(base, 'i-maya-focus', {
    title:'Make Space for Focus', topic:'Attention and study habits',
    objective:'Help young adults choose a realistic focus routine they can repeat.',
    summary:'A practical cohort with guided sessions, peer circles, and short weekly reflections.',
    description:'Small group practice for students balancing study, work, and online demands.',
    start:'2026-10-14', end:'2026-11-30', registrationOpen:'2026-10-01',
    registrationClose:'2026-10-31', capacity:6, status:'Published',
    completion:'Attend two sessions and try one focused work block.',
    components:[{id:'cmp-maya-focus-session', type:'Session', title:'Find your focus window', resourceId:'s-maya-focus-1'},
      {id:'cmp-maya-focus-form', type:'Survey or Quiz', title:'Your focus starting point', resourceId:'f-maya-focus'}]}));
  add(s, 'initiatives', initiative(base, 'i-maya-neighbour', {
    title:'Neighbourhood Reset', topic:'Community and outdoor time',
    objective:'Invite young people to spend a morning helping their neighbourhood together.',
    summary:'A planned series of community walks and practical outdoor projects.',
    description:'A draft initiative for a later Horizon cohort.',
    start:'2026-12-10', end:'2027-01-21', registrationOpen:'2026-11-25',
    registrationClose:'2026-12-09', capacity:28, status:'Draft', components:[]}));

  for (const [id, role, scopeId] of [
    ['grant-maya-focus-hala', 'supervisor', 'i-maya-focus'],
    ['grant-maya-focus-karim', 'coach', 'i-maya-focus'],
    ['grant-maya-unplug-hala', 'supervisor', 'i-maya-unplug'],
    ['grant-maya-unplug-karim', 'coach', 'i-maya-unplug']]) {
    const personId = role === 'coach' ? 'p-karim' : 'p-hala';
    if (s.people.some(p => p.id === personId)) add(s, 'grants', {id, personId, role,
      scopeType:'initiative', scopeId, institutionId:ORG, status:'Active',
      acceptedAt:at('2026-09-02'), history:[]});
  }

  add(s, 'groups', {id:'g-maya-focus', parentType:'initiative', initiativeId:'i-maya-focus',
    ownerId:ORG, name:'Focus Circle', purpose:'Share small focus experiments and feedback.',
    description:'A guided group for Make Space for Focus.', capacity:15, enrollment:'Allocation',
    approval:false, status:'Open', created:'2026-10-12',
    memberIds:['p-maya-lina','p-maya-nader','p-maya-yara','p-maya-basil'], programId:null,
    coachId:'p-karim', coachHistory:[{coachId:'p-karim', from:at('2026-10-12'), to:null, actorId:'p-maya'}],
    memberHistory:['p-maya-lina','p-maya-nader','p-maya-yara','p-maya-basil'].map(personId =>
      ({personId, action:'Allocated', at:at('2026-10-12'), actorId:'p-maya'}))});
  add(s, 'groups', {id:'g-maya-unplug', parentType:'initiative', initiativeId:'i-maya-unplug',
    ownerId:ORG, name:'Offline Circle', purpose:'Share what each person tried away from screens.',
    description:'The completed Unplug Together cohort.', capacity:24, enrollment:'Allocation',
    approval:false, status:'Closed', created:'2026-09-02',
    memberIds:PARTICIPANTS.slice(0, 8).map(([id]) => id), programId:null,
    coachId:'p-karim', coachHistory:[{coachId:'p-karim', from:at('2026-09-02'), to:null, actorId:'p-maya'}],
    memberHistory:PARTICIPANTS.slice(0, 8).map(([personId]) =>
      ({personId, action:'Allocated', at:at('2026-09-02'), actorId:'p-maya'}))});
  add(s, 'groups', {id:'g-maya-focus-b', parentType:'initiative', initiativeId:'i-maya-focus',
    ownerId:ORG, name:'Focus Circle B', purpose:'A second small focus group.',
    description:'Ready for the next accepted participants.', capacity:15, enrollment:'Allocation',
    approval:false, status:'Open', created:'2026-10-12', memberIds:[], programId:null,
    coachId:null, coachHistory:[], memberHistory:[]});

  const unplug = PARTICIPANTS.slice(0, 8);
  unplug.forEach(([id], n) => {
    admission(s, 'i-maya-unplug', id, n < 6 ? 'Completed' : 'Accepted', '2026-08-25');
    add(s, 'completions', {id:`completion-maya-unplug-${id}`, initiativeId:'i-maya-unplug',
      personId:id, admissionId:`adm-maya-i-maya-unplug-${id}`,
      status:n < 6 ? 'Completed' : 'Not completed',
      criteria:'Attend two sessions and submit one reflection.', actorId:'p-maya',
      at:at('2026-09-30', '18:00')});
  });
  PARTICIPANTS.slice(0, 12).forEach(([id], n) => admission(s, 'i-maya-focus', id,
    n < 6 ? 'Accepted' : n < 10 ? 'Pending' : 'Queued', '2026-10-10',
    n < 4 ? 'g-maya-focus' : null));

  session(s, 's-maya-unplug-1', 'i-maya-unplug', 'The first offline hour',
    '2026-09-05', '16:00', '17:30', 'In-person', 24, ['p-hala']);
  session(s, 's-maya-unplug-2', 'i-maya-unplug', 'People, places and plans',
    '2026-09-19', '16:00', '17:30', 'In-person', 24, ['p-hala']);
  session(s, 's-maya-unplug-3', 'i-maya-unplug', 'What we will keep',
    '2026-09-29', '17:00', '18:00', 'Online', 24, ['p-hala']);
  session(s, 's-maya-focus-1', 'i-maya-focus', 'Find your focus window',
    '2026-10-15', '16:00', '17:30', 'In-person', 30, ['p-hala']);
  session(s, 's-maya-focus-2', 'i-maya-focus', 'Plan a protected work block',
    '2026-11-07', '16:00', '17:30', 'In-person', 30, ['p-hala']);
  session(s, 's-maya-focus-3', 'i-maya-focus', 'Review and adjust',
    '2026-11-21', '17:00', '18:00', 'Online', 30, ['p-hala']);

  for (const [index, [personId]] of unplug.entries()) {
    for (const [n, sessionId] of ['s-maya-unplug-1','s-maya-unplug-2'].entries()) {
      const registrationId = `sr-maya-unplug-${n}-${personId}`;
      add(s, 'sessionRegistrations', {id:registrationId, sessionId, personId, mode:'In-person',
        status:'Confirmed', code:`DS-MAYA-${index + 1}${n + 1}`, attendance:'Recorded',
        completion:'Pending', created:at('2026-09-01')});
      add(s, 'sessionAttendance', {id:`att-maya-unplug-${n}-${personId}`, sessionId,
        registrationId, initiativeId:'i-maya-unplug', personId,
        status:(index === 6 && n === 1) || (index === 7 && n === 0) ? 'Absent' : 'Present',
        method:'manual', reason:'Fictional demo roster', actorId:'p-hala',
        at:at(n ? '2026-09-19' : '2026-09-05', '17:45'), history:[]});
    }
  }
  for (const [index, [personId]] of PARTICIPANTS.slice(0, 6).entries())
    add(s, 'sessionRegistrations', {id:`sr-maya-focus-${personId}`, sessionId:'s-maya-focus-1',
      personId, mode:'In-person', status:'Confirmed', code:`DS-FOCUS-${index + 1}`,
      attendance:'Recorded', completion:'Pending', created:at('2026-10-14')});
  for (const [index, [personId]] of PARTICIPANTS.slice(0, 6).entries())
    add(s, 'sessionAttendance', {id:`att-maya-focus-${personId}`, sessionId:'s-maya-focus-1',
      registrationId:`sr-maya-focus-${personId}`, initiativeId:'i-maya-focus', personId,
      status:index === 5 ? 'Absent' : 'Present', method:'manual',
      reason:'Fictional demo roster', actorId:'p-hala', at:at('2026-10-15', '17:45'), history:[]});

  form(s, 'f-maya-unplug', 'i-maya-unplug', 'What changed?', [
    {id:'q-maya-unplug-change', label:'What felt different during offline time?', type:'Single choice',
      required:true, options:['More present','More connected','Still difficult']},
    {id:'q-maya-unplug-next', label:'How likely are you to repeat it?', type:'Rating', required:true, options:[]}]);
  form(s, 'f-maya-focus', 'i-maya-focus', 'Your focus starting point', [
    {id:'q-maya-focus-block', label:'What interrupts your focus most often?', type:'Single choice',
      required:true, options:['Notifications','Unclear task','Other demands']},
    {id:'q-maya-focus-time', label:'How clear is your next focus block?', type:'Rating', required:true, options:[]}]);
  unplug.forEach(([personId], n) => add(s, 'responses', {id:`res-maya-unplug-${personId}`,
    formId:'f-maya-unplug', version:1, personId, submitted:'2026-09-29',
    answers:{'q-maya-unplug-change':n % 3 === 0 ? 'More connected' : 'More present',
      'q-maya-unplug-next':String(3 + n % 3)}}));
  PARTICIPANTS.slice(0, 6).forEach(([personId], n) => add(s, 'responses',
    {id:`res-maya-focus-${personId}`, formId:'f-maya-focus', version:1, personId,
      submitted:'2026-10-15', answers:{'q-maya-focus-block':n % 2 ? 'Unclear task' : 'Notifications',
        'q-maya-focus-time':String(2 + n % 3)}}));

  const outdoorBase = s.experiences.find(e => e.id === 'e-dana');
  if (outdoorBase) add(s, 'experiences', {...structuredClone(outdoorBase),
    id:'e-maya-city-walk', ownerId:ORG, title:'City Garden Walk', kind:'Walk',
    category:'Urban nature walk',
    description:'A gentle guided walk through nearby gardens with quiet observation stops.',
    objective:'Notice a familiar place with fresh attention and share a small offline intention.',
    venue:'Horizon Youth Center entrance', address:'Fictional demonstration address, Amman',
    city:'Amman', meetingPoint:'Main entrance', transport:'Participants meet at the centre.',
    start:'2026-11-08', end:'2026-11-08', capacity:18, minAge:18, maxAge:30,
    eligibility:'Young adults aged 18–30 who can join a gentle urban walk.',
    registrationOpen:'2026-10-15', registrationClose:'2026-11-06',
    safety:'Stay with the group, carry water and wear comfortable walking shoes.',
    completion:'Attend the walk and closing reflection.',
    cover:'assets/home-redesign/forest-hike.jpg', coverAlt:'A group walking outdoors', version:1});
  add(s, 'experienceSessions', {id:'es-maya-city-walk', experienceId:'e-maya-city-walk',
    title:'Garden route and reflection', date:'2026-11-08', time:'09:00', endTime:'11:30',
    venue:'Horizon Youth Center entrance', description:'Guided walk and a closing circle.',
    criteria:'Attend the walk and share one observation.'});
  for (const [n, [personId]] of PARTICIPANTS.slice(0, 5).entries())
    add(s, 'bookings', {id:`b-maya-city-${personId}`, experienceId:'e-maya-city-walk',
      personId, status:n < 4 ? 'Confirmed' : 'Waitlisted', created:at('2026-10-16', '08:00'),
      credential:n < 4 ? `DS-CITY-${n + 1}` : '', eligible:true});
  add(s, 'appointments', {id:'ap-maya-city-sami', experienceId:'e-maya-city-walk',
    personId:'p-sami', email:'sami@demo.example', invitedBy:'p-maya',
    sessionIds:['es-maya-city-walk'], scope:'Attendance and activity group',
    cohortPermission:true, status:'Accepted', acceptedAt:at('2026-10-15', '12:00'),
    history:[{at:at('2026-10-15', '09:00'), actorId:'p-maya', change:'Appointment issued by the Representative · simulated delivery'},
      {at:at('2026-10-15', '12:00'), actorId:'p-sami', change:'Accepted'}]});

  add(s, 'assignments', {id:'a-maya-focus-window', ownerId:'p-karim', groupId:'g-maya-focus',
    initiativeId:'i-maya-focus', title:'Try one protected focus window', activity:'Protected Work',
    instructions:'Choose one small task, put your phone aside, and work for ten minutes. Describe what helped.',
    evidence:'A short written reflection.', start:'2026-10-15', due:'2026-10-29',
    required:true, review:'Coach review', status:'Active', created:at('2026-10-15'), version:1});
  add(s, 'submissions', {id:'sub-maya-focus-lina', assignmentId:'a-maya-focus-window',
    studentId:'p-maya-lina', text:'I outlined my essay while my phone stayed in another room.',
    file:'', status:'Submitted', submitted:at('2026-10-15', '19:00'), feedback:'',
    history:[], attempt:1, assignmentVersion:1, activityReference:null,
    instructionsSnapshot:'Choose one small task, put your phone aside, and work for ten minutes. Describe what helped.'});

  const focusGroup = s.groups.find(g => g.id === 'g-maya-focus');
  const unplugGroup = s.groups.find(g => g.id === 'g-maya-unplug');
  const focus = s.initiatives.find(i => i.id === 'i-maya-focus');
  const old = s.initiatives.find(i => i.id === 'i-maya-unplug');
  if (focusGroup && focus) add(s, 'coachReports', {id:'coach-report-maya-focus',
    groupId:focusGroup.id, initiativeId:focus.id, authorId:'p-karim',
    period:{from:'2026-10-10', to:'2026-10-15'},
    metrics:groupMetrics(s, focusGroup, '2026-10-10', '2026-10-15'),
    observations:'The group has chosen small, specific focus windows.',
    concerns:'Several participants have yet to try their first work block.',
    recommendations:'Use pairs to help each participant name a ten-minute first step.',
    status:'Submitted', created:at('2026-10-16', '08:00'), submitted:at('2026-10-16', '08:00')});
  if (focus) add(s, 'supervisorSummaries', {id:'supervisor-report-maya-focus',
    initiativeId:focus.id, authorId:'p-hala', period:{from:'2026-10-10', to:'2026-10-15'},
    metrics:initiativeMetrics(s, focus, '2026-10-10', '2026-10-15'),
    coachReportIds:['coach-report-maya-focus'],
    summary:'The focus cohort has begun. Applications and session bookings are being reviewed.',
    issues:'A second circle needs a Coach before participants are allocated.',
    recommendations:'Assign a Coach and follow up on the first reflection task.',
    status:'Submitted', submitted:at('2026-10-16', '09:00')});
  if (unplugGroup && old) add(s, 'coachReports', {id:'coach-report-maya-unplug',
    groupId:unplugGroup.id, initiativeId:old.id, authorId:'p-karim',
    period:{from:'2026-09-03', to:'2026-09-29'},
    metrics:groupMetrics(s, unplugGroup, '2026-09-03', '2026-09-29'),
    observations:'Participants shared concrete ways to spend an hour offline.',
    concerns:'Two participants missed one session each.',
    recommendations:'Offer a make-up reflection before the next cohort.',
    status:'Submitted', created:at('2026-09-30', '10:00'),
    submitted:at('2026-09-30', '10:00')});
  if (old) add(s, 'supervisorSummaries', {id:'supervisor-report-maya-unplug',
    initiativeId:old.id, authorId:'p-hala', period:{from:'2026-09-03', to:'2026-09-30'},
    metrics:initiativeMetrics(s, old, '2026-09-03', '2026-09-30'),
    coachReportIds:['coach-report-maya-unplug'],
    summary:'The first offline cohort completed its sessions and reflections.',
    issues:'Two participants missed one session each.',
    recommendations:'Carry the short reflection format into the next cohort.',
    status:'Submitted', submitted:at('2026-09-30', '19:00')});

  const after = Object.values(s).filter(Array.isArray).reduce((n, a) => n + a.length, 0);
  return after > before;
}
