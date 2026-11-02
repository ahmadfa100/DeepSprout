/**
 * Development demo scenario: the platform owner's view.
 *
 * Loaded only through Development demo → Load scenario. Adds institution
 * requests in every state, a second approved institution with initiatives in
 * each phase, completed students, and community posts/reports waiting for the
 * Admin, then signs in as the Admin (Leen). All people are fictional.
 */
const P = (id, name, handle, extra = {}) => ({id, name, email:`${handle}@demo.example`, workspaces:[], status:'Active', verified:true, individual:true, ...extra});

const REQUESTS = [
  {id:'app-bright', rep:P('p-rami', 'Rami Haddad', 'rami'), name:'Bright Minds Academy', email:'office@brightminds.example', status:'Submitted', submitted:'2026-10-31', files:['registration-certificate.pdf', 'board-letter.pdf'],
    details:{institutionType:'Private school', city:'Amman', country:'Jordan', phone:'+962 6 555 0142', website:'brightminds.example', position:'Head of Student Life', representative:'Rami Haddad', size:'About 450 students aged 15–18', founded:'2011',
      description:'We want to run short focus and study-habit initiatives for our senior students, with weekly small-group coaching after school.', goals:'Help students study without constant phone interruptions before their final exams.'}},
  {id:'app-reads', rep:P('p-salma', 'Salma Odeh', 'salma'), name:'Amman Reads Library', email:'hello@ammanreads.example', status:'Submitted', submitted:'2026-11-01', files:['library-license.pdf'],
    details:{institutionType:'Public library', city:'Amman', country:'Jordan', phone:'+962 6 555 0199', website:'ammanreads.example', position:'Community programs lead', representative:'Salma Odeh', size:'Around 1,200 young members', founded:'1998',
      description:'A reading-first initiative: guided “slow reading” evenings and a month-long book challenge for young adults.', goals:'Bring young people back to long-form reading and real conversations about books.'}},
  {id:'app-zarqa', rep:P('p-khaled', 'Khaled Nasser', 'khaled'), name:'Zarqa Volunteers Network', email:'team@zarqavolunteers.example', status:'Needs More Info', submitted:'2026-10-27', files:[],
    details:{institutionType:'Non-profit', city:'Zarqa', country:'Jordan', phone:'+962 5 555 0110', position:'Coordinator', representative:'Khaled Nasser', size:'60 active volunteers',
      description:'Outdoor clean-up days and community projects that replace screen time with shared work.', goals:'Give young people regular offline volunteering in their neighbourhood.'},
    messages:[{actorId:'p-leen', text:'Please attach your registration document so we can verify the network.', created:'2026-10-29T10:00:00+03:00'}]},
  {id:'app-quick', rep:P('p-dina', 'Dina Faris', 'dina'), name:'QuickGrowth Agency', email:'sales@quickgrowth.example', status:'Rejected', submitted:'2026-10-20', files:[],
    details:{institutionType:'Marketing agency', city:'Amman', country:'Jordan', position:'Sales manager', representative:'Dina Faris',
      description:'We would like to promote our social media growth packages to young people on the platform.', goals:'Reach new customers.'},
    messages:[{actorId:'p-leen', text:'DeepSprout initiatives must serve young people’s wellbeing. Commercial promotion is not accepted.', created:'2026-10-22T12:00:00+03:00'}]}
];

const STUDENTS = [['p-lara', 'Lara Khoury'], ['p-adam', 'Adam Saeed'], ['p-maher', 'Maher Ali'], ['p-jana', 'Jana Mousa'], ['p-tala', 'Tala Hamdan'], ['p-faris', 'Faris Odeh'], ['p-reem', 'Reem Nasser'], ['p-ziad', 'Ziad Kamal']];

const POSTS = [
  {id:'post-demo-phone', title:'One week with my phone in a drawer', message:'I kept my phone in a drawer every evening this week. The first two days were hard, then I finished a whole book. Sharing in case it helps someone start.', author:'Tala Hamdan', category:'Progress', created:'2026-11-01T18:20:00+03:00'},
  {id:'post-demo-question', title:'How do you stay focused while studying?', message:'I lose focus every ten minutes. What small rules actually worked for you?', author:'Adam Saeed', category:'Questions', created:'2026-11-02T07:40:00+03:00'}
];
const REPORTS = [
  {id:'report-demo-1', postId:'omar-reading', reason:'Spam or advertising: the post links to a paid course in the comments.', reporter:'Lara Khoury', created:'2026-11-01T21:10:00+03:00'},
  {id:'report-demo-2', postId:'lina-win', reason:'Privacy concern: it mentions a friend by full name without asking.', reporter:'Jana Mousa', created:'2026-11-02T08:05:00+03:00'}
];

export function adminDemo(s) {
  const add = p => { if (!s.people.some(x => x.id === p.id)) s.people.push(p); };
  for (const r of REQUESTS) {
    add(r.rep);
    s.applications.push({id:r.id, personId:r.rep.id, type:'organization', name:r.name, email:r.email, status:r.status, submitted:r.submitted, updated:r.messages?.at(-1)?.created?.slice(0, 10) || r.submitted, details:r.details, files:r.files, messages:r.messages || []});
  }

  // A second approved institution with an initiative in each phase.
  add(P('p-rula', 'Rula Mansour', 'rula', {workspaces:['organization']}));
  STUDENTS.forEach(([id, name]) => add(P(id, name, id.slice(2), {workspaces:['participant']})));
  s.applications.push({id:'app-irbid', personId:'p-rula', type:'organization', name:'Irbid Youth Hub', email:'hello@irbidhub.example', status:'Approved', submitted:'2026-08-20', updated:'2026-08-24', details:{institutionType:'Youth center', city:'Irbid', country:'Jordan', representative:'Rula Mansour', position:'Director', description:'Workshops and clubs for young people in north Jordan.'}, files:['hub-registration.pdf'], messages:[{actorId:'p-leen', text:'Verified registration and representative.', created:'2026-08-24T11:00:00+03:00'}]});
  s.organizations.push({id:'org-irbid', name:'Irbid Youth Hub', type:'Youth center', description:'Workshops and clubs for young people in north Jordan.', country:'Jordan', governorate:'Irbid', city:'Irbid', email:'hello@irbidhub.example', phone:'+962 2 555 0170', representative:'Rula Mansour', position:'Director', website:'', status:'Approved', memberIds:['p-rula']});
  const base = s.initiatives.find(i => i.id === 'i-today');
  const initiative = (id, title, topic, start, end, status, objective) => ({...structuredClone(base), id, ownerId:'org-irbid', title, topic, objective, summary:objective, start, end, registrationOpen:start, registrationClose:end, status, components:[], teamIds:[], version:1});
  s.initiatives.push(
    initiative('i-detox', 'Digital Detox Week', 'Screen-time balance', '2026-09-06', '2026-09-13', 'Completed', 'Seven days of small offline challenges with a closing reflection circle.'),
    initiative('i-summer', 'Summer Reading Camp', 'Reading', '2026-08-01', '2026-08-20', 'Cancelled', 'A three-week reading camp. Cancelled when the venue closed for repairs.'),
    initiative('i-focus', 'Focus Lab', 'Study focus', '2026-11-20', '2026-12-10', 'Published', 'Three weeks of study sessions that practise one protected hour a day.')
  );
  STUDENTS.forEach(([pid], n) => {
    s.admissions.push({id:`adm-detox-${n}`, code:`APP-DTX${10 + n}`, initiativeId:'i-detox', personId:pid, status:n < 6 ? 'Completed' : 'Accepted', answers:{}, consent:{text:'Agree to respectful participation.', version:1, at:'2026-09-01T10:00:00+03:00'}, mode:'In-person', groupId:null, created:'2026-09-01T10:00:00+03:00', updated:'2026-09-13T18:00:00+03:00', flags:[], history:[]});
    s.completions.push({id:`completion-detox-${n}`, initiativeId:'i-detox', personId:pid, admissionId:`adm-detox-${n}`, status:n < 6 ? 'Completed' : 'Not completed', criteria:'Attend the closing circle', actorId:'p-rula', at:'2026-09-13T19:00:00+03:00'});
  });
  s.grants.push({id:'grant-rula-sup', personId:'p-rula', role:'supervisor', scopeType:'initiative', scopeId:'i-focus', institutionId:'org-irbid', status:'Active', acceptedAt:'2026-10-20T10:00:00+03:00', history:[]});

  // Earlier Admin decisions, so Decision history tells the same story as the requests.
  s.audit.push(
    {id:'audit-demo-irbid', actorId:'p-leen', action:'Application Approved', resource:'Irbid Youth Hub', reason:'Verified registration and representative.', result:'Institution workspace opened', created:'2026-08-24T11:00:00+03:00'},
    {id:'audit-demo-quick', actorId:'p-leen', action:'Application Rejected', resource:'QuickGrowth Agency', reason:'Commercial promotion is not accepted.', result:'Applicant notified', created:'2026-10-22T12:00:00+03:00'},
    {id:'audit-demo-zarqa', actorId:'p-leen', action:'Application Needs More Info', resource:'Zarqa Volunteers Network', reason:'Please attach your registration document.', result:'Applicant notified', created:'2026-10-29T10:00:00+03:00'}
  );
  seedCommunity();
  s.session.personId = 'p-leen';
  return s;
}

/** Community: two posts waiting for approval and two open reports (separate browser store). Safe to repeat. */
export function seedCommunity() {
  if (typeof localStorage !== 'undefined') {
    try {
      const key = 'deepsprout-community-demo-v1', data = JSON.parse(localStorage.getItem(key) || '{}');
      // Add only what is missing, so the Admin's earlier decisions survive a second visit.
      data.posts = [...(data.posts || []), ...POSTS.filter(p => !(data.posts || []).some(x => x.id === p.id))];
      data.moderation = {...Object.fromEntries(POSTS.map(p => [p.id, 'pending'])), ...(data.moderation || {})};
      data.reports = [...(data.reports || []), ...REPORTS.filter(r => !(data.reports || []).some(x => x.id === r.id)).map(r => ({...r, status:'pending'}))];
      localStorage.setItem(key, JSON.stringify(data));
    } catch { /* the workspace demo still loads without the community store */ }
  }
}
