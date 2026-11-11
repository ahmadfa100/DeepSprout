/** Fictional, additive operational records for Sami Nasser's Supervisor view. */

const ORG = 'org-horizon';
const stamp = (day, time = '10:00') => `${day}T${time}:00+03:00`;
const add = (s, key, row) => {
  s[key] ||= [];
  if (!s[key].some(item => item.id === row.id)) s[key].push(row);
};

const PARK_STUDENTS = ['p-maya-lina','p-maya-nader','p-maya-yara','p-maya-basil','p-maya-dima'];
const HILL_STUDENTS = ['p-maya-farah','p-maya-malik','p-maya-aya','p-maya-rami','p-maya-salma','p-maya-hussein'];

function appointment(s, id, experienceId, sessionIds, day) {
  add(s, 'appointments', {id, experienceId, personId:'p-sami', email:'sami@demo.example',
    invitedBy:'p-maya', sessionIds, scope:'Attendance, evaluations and activity groups',
    cohortPermission:true, status:'Accepted', acceptedAt:stamp(day, '12:00'),
    history:[{at:stamp(day, '09:00'), actorId:'p-maya',
      change:'Appointment issued by the Representative · simulated delivery'},
      {at:stamp(day, '12:00'), actorId:'p-sami', change:'Accepted'}]});
}

export function addSamiSupervisorDemo(s) {
  if (!s.people?.some(p => p.id === 'p-sami') ||
      !s.organizations?.some(o => o.id === ORG) ||
      !s.experiences?.some(e => e.id === 'e-dana' && e.ownerId === ORG) ||
      !s.initiatives?.some(i => i.id === 'i-maya-focus' && i.ownerId === ORG)) return false;
  const before = Object.values(s).filter(Array.isArray).reduce((n, list) => n + list.length, 0);
  const walkBase = s.experiences.find(e => e.id === 'e-dana');
  const campBase = s.experiences.find(e => e.id === 'e-reset');

  // A finished assignment gives Sami genuine attendance, evaluation and report history.
  const parkSession = {id:'es-sami-park', experienceId:'e-sami-park',
    title:'Notice the park together', date:'2026-09-26', time:'09:00', endTime:'11:00',
    venue:'Horizon Youth Center entrance',
    description:'A guided walk, observation pauses and a closing conversation.',
    criteria:'Attend the walk and take part in the closing reflection.',
    closedBy:[{actorId:'p-sami', at:stamp('2026-09-26', '11:30')}]};
  add(s, 'experienceSessions', parkSession);
  const parkRule = {kind:'all-required', version:1, minimum:1,
    requiredSessionIds:[parkSession.id], conditions:''};
  add(s, 'experiences', {...structuredClone(walkBase), id:'e-sami-park', ownerId:ORG,
    title:'Park Observation Morning', kind:'Walk', category:'Urban nature walk',
    description:'A completed small-group walk focused on noticing a familiar place.',
    objective:'Spend a morning outdoors and name one detail you had not noticed before.',
    venue:'Horizon Youth Center entrance', address:'Fictional demonstration address, Amman',
    city:'Amman', meetingPoint:'Main entrance', transport:'Meet at the centre.',
    start:'2026-09-26', end:'2026-09-26', capacity:12, minAge:18, maxAge:30,
    registrationOpen:'2026-09-01', registrationClose:'2026-09-25',
    safety:'Stay with the group and wear comfortable walking shoes.',
    completion:'Attend the walk and closing reflection.', completionRule:parkRule,
    status:'Completed', cover:'assets/home-redesign/forest-hike.jpg',
    coverAlt:'A group walking outdoors', version:1, history:[]});
  appointment(s, 'ap-sami-park', 'e-sami-park', [parkSession.id], '2026-09-10');
  add(s, 'cohorts', {id:'co-sami-park', experienceId:'e-sami-park',
    supervisorId:'p-sami', name:'Park Circle',
    description:'The five participants in the completed observation walk.',
    capacity:12, memberIds:PARK_STUDENTS, status:'Archived', token:'sami-park-circle'});
  const park = s.experiences.find(e => e.id === 'e-sami-park');
  for (const [index, personId] of PARK_STUDENTS.entries()) {
    const bookingId = `b-sami-park-${personId}`;
    const present = index < 4, completed = index < 3;
    const booking = {id:bookingId, experienceId:park.id, personId,
      status:completed ? 'Completed' : present ? 'Checked In' : 'Confirmed',
      created:stamp('2026-09-12'), credential:`DS-PARK-${index + 1}`, eligible:true,
      ...(completed ? {completedAt:stamp('2026-09-26', '12:00')} : {})};
    add(s, 'bookings', booking);
    const attendanceId = `att-sami-park-${personId}`;
    add(s, 'attendance', {id:attendanceId, experienceId:park.id, bookingId,
      sessionId:parkSession.id, personId, status:present ? 'Present' : 'Absent',
      method:present ? 'Manual check-in' : 'Marked absent', gardenPolicyVersion:1,
      reason:'Fictional paper roster', actorId:'p-sami',
      created:stamp('2026-09-26', '11:15'), history:[]});
    if (!present) continue;
    const evaluationId = `ev-sami-park-${personId}`;
    add(s, 'evaluations', {id:evaluationId, bookingId, experienceId:park.id,
      sessionId:parkSession.id, personId,
      status:completed ? 'Completed' : 'Needs follow-up',
      notes:completed ? 'Joined the walk and shared an observation.' :
        'Joined the walk; a closing reflection is still needed.',
      actorId:'p-sami', created:stamp('2026-09-26', '11:45'), history:[],
      resourceVersion:1, criterion:parkSession.criteria});
    if (completed) add(s, 'providerCompletions', {
      id:`pc-sami-park-${personId}`, bookingId, experienceId:park.id, personId,
      status:'Completed', resourceVersion:1, policyVersion:1,
      rule:structuredClone(parkRule), attendanceIds:[attendanceId],
      evaluationIds:[evaluationId], qualifyingSessionIds:[parkSession.id],
      actorId:'p-sami', created:stamp('2026-09-26', '12:00'),
      updated:stamp('2026-09-26', '12:00'), history:[]});
  }
  add(s, 'closingReports', {id:'report-sami-park', experienceId:park.id,
    supervisorId:'p-sami', summary:'Four participants joined the walk. Three completed the closing reflection.',
    exceptions:'One participant was absent; one needs a follow-up reflection.',
    status:'Submitted', created:stamp('2026-09-27', '10:00')});

  // An upcoming two-session activity gives Sami bookings, a cohort and future duty.
  const hillSessions = [
    {id:'es-sami-hills-walk', experienceId:'e-sami-hills', title:'Hillside walk',
      date:'2026-11-12', time:'08:30', endTime:'11:00',
      venue:'Amman hillside meeting point', description:'Gentle guided walk with rest stops.',
      criteria:'Attend the guided walk.'},
    {id:'es-sami-hills-circle', experienceId:'e-sami-hills', title:'Reflection circle',
      date:'2026-11-19', time:'17:00', endTime:'18:00',
      venue:'Horizon Youth Center, Amman',
      description:'Share one small offline practice to keep.',
      criteria:'Join the closing reflection.'}
  ];
  for (const session of hillSessions) add(s, 'experienceSessions', session);
  add(s, 'experiences', {...structuredClone(campBase), id:'e-sami-hills', ownerId:ORG,
    title:'Hillside Reset', kind:'Camp', category:'Guided walking',
    description:'Two gentle sessions combining an outdoor walk and a follow-up reflection.',
    objective:'Spend time outside and turn one observation into a repeatable offline habit.',
    venue:'Amman hillside meeting point', address:'Fictional demonstration venue, Amman',
    city:'Amman', meetingPoint:'Marked trail entrance',
    transport:'Shared minibus from Horizon Youth Center.',
    start:'2026-11-12', end:'2026-11-19', capacity:5, minAge:18, maxAge:30,
    registrationOpen:'2026-10-10', registrationClose:'2026-11-10',
    safety:'Stay with the group, bring water and wear closed walking shoes.',
    completion:'Attend both sessions and complete the closing reflection.',
    completionRule:{kind:'all-required', version:1, minimum:2,
      requiredSessionIds:hillSessions.map(ss => ss.id), conditions:''},
    status:'Published', cover:'assets/home-redesign/sunset-overlook.jpg',
    coverAlt:'A hillside overlook', version:1, history:[]});
  appointment(s, 'ap-sami-hills', 'e-sami-hills', hillSessions.map(ss => ss.id), '2026-10-14');
  add(s, 'cohorts', {id:'co-sami-hills', experienceId:'e-sami-hills',
    supervisorId:'p-sami', name:'Hillside Circle',
    description:'A small group preparing for the hillside sessions.',
    capacity:5, memberIds:HILL_STUDENTS.slice(0, 5),
    status:'Active', token:'sami-hills-circle'});
  HILL_STUDENTS.forEach((personId, index) => add(s, 'bookings', {
    id:`b-sami-hills-${personId}`, experienceId:'e-sami-hills', personId,
    status:index < 5 ? 'Confirmed' : 'Waitlisted',
    created:stamp('2026-10-15', '09:00'),
    credential:index < 5 ? `DS-HILLS-${index + 1}` : '', eligible:true}));

  // Institution duty stays separate from every Outdoor Activity appointment.
  add(s, 'staffInvites', {id:'sinv-sami-focus', token:'staff-sami-focus',
    initiativeId:'i-maya-focus', institutionId:ORG, role:'supervisor',
    email:'sami@demo.example', name:'Sami Nasser',
    message:'Supervise the next Make Space for Focus sessions.', status:'Accepted',
    created:stamp('2026-10-14', '09:00'), expires:stamp('2026-10-21', '09:00'),
    sends:1, invitedBy:'p-maya', acceptedBy:'p-sami', history:[]});
  add(s, 'grants', {id:'grant-sami-focus', personId:'p-sami', role:'supervisor',
    scopeType:'initiative', scopeId:'i-maya-focus', institutionId:ORG,
    status:'Active', inviteId:'sinv-sami-focus',
    acceptedAt:stamp('2026-10-15', '12:00'), revokedAt:null, history:[]});
  const sessionBase = s.sessions.find(ss => ss.id === 's-maya-focus-2');
  if (sessionBase) add(s, 'sessions', {...structuredClone(sessionBase),
    id:'s-sami-focus-checkin', title:'Focus circle check-in',
    description:'Review first focus attempts and help each person choose a next step.',
    date:'2026-11-14', time:'16:00', endTime:'17:00',
    capacity:6, inPersonCapacity:6, onlineCapacity:0,
    supervisorIds:['p-sami'], registrationOpen:'2026-10-16',
    registrationClose:'2026-11-13', closedOut:false, history:[]});
  for (const [index, personId] of PARK_STUDENTS.slice(0, 4).entries())
    add(s, 'sessionRegistrations', {id:`sr-sami-focus-${personId}`,
      sessionId:'s-sami-focus-checkin', personId, mode:'In-person',
      status:'Confirmed', code:`DS-SAMI-FOCUS-${index + 1}`,
      attendance:'Not attended', completion:'Pending',
      created:stamp('2026-10-16', '09:00')});
  const absent = s.sessionAttendance.find(a => a.id === 'att-maya-focus-p-maya-zain');
  if (absent) add(s, 'excuses', {id:'excuse-sami-focus-zain', attendanceId:absent.id,
    sessionId:absent.sessionId, initiativeId:'i-maya-focus', personId:absent.personId,
    reason:'A university appointment overlapped the first group session.',
    attachment:null, status:'Submitted', recommendation:null, decision:null,
    created:stamp('2026-10-16', '08:30'),
    history:[{at:stamp('2026-10-16', '08:30'), actorId:absent.personId, change:'Submitted'}]});
  add(s, 'supervisorMeetings', {id:'meeting-sami-focus-coach',
    initiativeId:'i-maya-focus', organizerId:'p-sami',
    title:'Focus Circle Coach check-in', audience:'coach', coachId:'p-karim',
    date:'2026-10-20', time:'11:00', minutes:30, format:'Online',
    place:'Demo meeting room', note:'Review the first task and students needing a smaller start.',
    status:'Scheduled', created:stamp('2026-10-16', '09:00')});
  add(s, 'supervisorMeetings', {id:'meeting-sami-focus-group',
    initiativeId:'i-maya-focus', organizerId:'p-sami',
    title:'Before the next focus session', audience:'everyone', coachId:null,
    date:'2026-11-05', time:'17:00', minutes:30, format:'Online',
    place:'Demo meeting room', note:'Share one focus window that felt possible.',
    status:'Scheduled', created:stamp('2026-10-16', '09:10')});

  const after = Object.values(s).filter(Array.isArray).reduce((n, list) => n + list.length, 0);
  return after > before;
}
