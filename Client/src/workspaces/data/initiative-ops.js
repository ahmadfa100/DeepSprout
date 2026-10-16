/**
 * Schema-2 seed for the connected Institution cycle.
 *
 * Every record is fictional and every count shown in the workspaces is derived
 * from these originals. The migration in `migrate.js` adds the same records to
 * an existing schema-1 browser graph only when their parents still exist.
 */
export const SCHEMA = 3;

/** Canonical people added in schema 2. `individual` = full Individual capability. */
export const people = [
  {id:'p-ahmad',name:'Ahmad Saleh',email:'ahmad@demo.example',workspaces:[],status:'Active',verified:true,individual:true,journal:'demo'},
  {id:'p-hala',name:'Hala Mansour',email:'hala@demo.example',workspaces:['supervisor'],status:'Active',verified:true,individual:true},
  {id:'p-karim',name:'Karim Odeh',email:'karim@demo.example',workspaces:['mentor'],status:'Active',verified:true,individual:true},
  {id:'p-yara',name:'Yara Haddad',email:'yara@demo.example',workspaces:[],status:'Active',verified:true,individual:true},
  {id:'p-zaid',name:'Zaid Qasem',email:'zaid@demo.example',workspaces:[],status:'Active',verified:true,individual:true}
];

/** Existing seed people who are full Individuals as well as partner participants. */
export const individualIds = ['p-maya','p-omar','p-rania','p-sami','p-leen'];

/** Fields the schema-2 Initiative contract adds to the seeded `Start Today` record. */
export const startTodayPatch = {
  timezone:'Asia/Amman',
  cover:{image:'assets/home-redesign/forest-hike.jpg',alt:'Young people walking together along a woodland trail'},
  operatingMode:'structured',
  primaryMode:'Hybrid',
  venue:'Horizon Youth Center, Amman',
  onlineDetails:'A protected meeting link is shared with confirmed session registrants.',
  requirements:'Willingness to try one small weekly step and share brief reflections with a Coach.',
  cost:{type:'Free',price:0,currency:'JOD'},
  withdrawal:'You can withdraw at any time from My Initiatives. Your submitted work stays in your history.',
  policies:{
    admission:'Every application is reviewed once by the Representative or an active Supervisor.',
    waitlist:true,offerHours:24,
    discipline:'Respectful participation is expected. The Representative may suspend, remove or block participation with a recorded reason.',
    attendance:'Factual attendance is recorded by an active Supervisor for each session.',
    excuse:'A missed session can be explained. The Supervisor recommends and the Representative decides. An accepted excuse never changes factual attendance.',
    makeup:'Not configured for this initiative.',
    completion:'Attend at least one session and complete one Coach-reviewed task.',
    privacy:'Staff see participation records for this initiative only. Personal Lab, Shield and Recovery data are never shared.',
    notifications:'Status changes appear in your DeepSprout notifications. No email is sent in this demo.'
  },
  registrationState:'Open',
  history:[{version:1,at:'2026-10-14T09:00:00+03:00',actorId:'p-maya',change:'Published',reason:'Initial publication'}],
  publishedAt:'2026-10-14T09:00:00+03:00'
};

export const sessions = [
  {id:'s-kickoff',initiativeId:'i-today',ownerId:'org-horizon',title:'Kick-off circle',description:'Meet your group and choose a first small step.',agenda:'Welcome · What gets in the way · Choosing one first step',speaker:'Maya Haddad',date:'2026-10-14',time:'18:00',endTime:'19:00',timezone:'Asia/Amman',format:'Online',venue:'',meeting:'Protected demo meeting room',capacity:40,onlineCapacity:40,inPersonCapacity:0,status:'Published',eligibility:'Accepted Start Today participants',instructions:'Join with your camera on if you are comfortable.',attendancePolicy:'Online roster verification by the assigned Supervisor.',attendanceRequired:true,supervisorIds:['p-hala'],registrationOpen:'2026-10-10',registrationClose:'2026-10-14',completionRule:'Attendance only',history:[],closedOut:true},
  {id:'s-workshop',initiativeId:'i-today',ownerId:'org-horizon',title:'Hands-on planning workshop',description:'Turn one postponed task into a realistic plan with peers.',agenda:'Short talk · Pair planning · Commitments',speaker:'Maya Haddad',date:'2026-10-25',time:'16:00',endTime:'18:00',timezone:'Asia/Amman',format:'In-person',venue:'Horizon Youth Center, Hall 2, Amman',meeting:'',capacity:20,onlineCapacity:0,inPersonCapacity:20,status:'Published',eligibility:'Accepted Start Today participants',instructions:'Bring a notebook. Arrive ten minutes early for check-in.',attendancePolicy:'QR check-in or booking code at the door; manual exceptions need a reason.',attendanceRequired:true,supervisorIds:[],registrationOpen:'2026-10-14',registrationClose:'2026-10-24',completionRule:'Attend the full workshop',history:[]}
];

export const sessionPatches = {'s-intro':{supervisorIds:['p-hala'],attendanceRequired:true,agenda:'A practical conversation · Q&A',registrationOpen:'2026-10-14',registrationClose:'2026-10-17',completionRule:'Attendance only',history:[],ownerId:'org-horizon'}};

export const sessionRegistrations = [
  {id:'sr-noor-kickoff',sessionId:'s-kickoff',personId:'p-noor',mode:'Online',status:'Confirmed',code:'DS-KICK-N0R1',attendance:'Recorded',completion:'Pending',created:'2026-10-12T10:00:00+03:00'}
];

export const grants = [
  {id:'grant-hala',personId:'p-hala',role:'supervisor',scopeType:'initiative',scopeId:'i-today',institutionId:'org-horizon',status:'Active',inviteId:'sinv-hala',acceptedAt:'2026-10-13T12:00:00+03:00',revokedAt:null,history:[{at:'2026-10-13T12:00:00+03:00',actorId:'p-hala',change:'Accepted invitation'}]},
  {id:'grant-karim',personId:'p-karim',role:'coach',scopeType:'initiative',scopeId:'i-today',institutionId:'org-horizon',status:'Active',inviteId:'sinv-karim',acceptedAt:'2026-10-13T13:00:00+03:00',revokedAt:null,history:[{at:'2026-10-13T13:00:00+03:00',actorId:'p-karim',change:'Accepted invitation'}]}
];

export const staffInvites = [
  {id:'sinv-hala',token:'staff-hala-today',initiativeId:'i-today',institutionId:'org-horizon',role:'supervisor',email:'hala@demo.example',name:'Hala Mansour',message:'Join Start Today as a Supervisor.',status:'Accepted',created:'2026-10-12T09:00:00+03:00',expires:'2026-10-19T09:00:00+03:00',sends:1,invitedBy:'p-maya',acceptedBy:'p-hala',history:[]},
  {id:'sinv-karim',token:'staff-karim-today',initiativeId:'i-today',institutionId:'org-horizon',role:'coach',email:'karim@demo.example',name:'Karim Odeh',message:'Coach Circle A for Start Today.',status:'Accepted',created:'2026-10-12T09:05:00+03:00',expires:'2026-10-19T09:05:00+03:00',sends:1,invitedBy:'p-maya',acceptedBy:'p-karim',history:[]}
];

export const groups = [
  {id:'g-today-a',parentType:'initiative',initiativeId:'i-today',ownerId:'org-horizon',name:'Circle A · First steps',purpose:'Small weekly steps with Coach feedback.',description:'An internal Start Today group.',capacity:135,enrollment:'Allocation',approval:false,status:'Open',created:'2026-10-13',memberIds:['p-noor','p-rania'],programId:null,coachId:'p-karim',coachHistory:[{coachId:'p-karim',from:'2026-10-13T13:10:00+03:00',to:null,actorId:'p-maya'}],memberHistory:[{personId:'p-noor',action:'Allocated',at:'2026-10-13T13:10:00+03:00',actorId:'p-maya'},{personId:'p-rania',action:'Allocated',at:'2026-10-13T13:12:00+03:00',actorId:'p-hala'}]},
  {id:'g-today-b',parentType:'initiative',initiativeId:'i-today',ownerId:'org-horizon',name:'Circle B · Steady pace',purpose:'A second circle for later admissions.',description:'No Coach allocated yet.',capacity:135,enrollment:'Allocation',approval:false,status:'Open',created:'2026-10-13',memberIds:[],programId:null,coachId:null,coachHistory:[],memberHistory:[]}
];

export const assignments = [
  {id:'a-today-step',ownerId:'p-karim',groupId:'g-today-a',initiativeId:'i-today',title:'Name and try one small first step',activity:'Practical Micro-Challenge',instructions:'Pick a task you have been postponing. Write the smallest possible first step, try it for ten minutes, and describe what happened.',evidence:'A short written reflection.',start:'2026-10-14',due:'2026-10-22',required:true,review:'Coach review',status:'Active',created:'2026-10-14T10:00:00+03:00',version:1}
];

export const admissions = [
  {id:'adm-noor',code:'APP-N00R14',initiativeId:'i-today',personId:'p-noor',status:'Accepted',answers:{age:22,motivation:'I want to stop postponing my writing.'},consent:{text:'Agree to respectful participation.',version:1,at:'2026-10-14T08:00:00+03:00'},mode:'Online',groupId:'g-today-a',created:'2026-10-14T08:00:00+03:00',updated:'2026-10-14T08:00:00+03:00',legacyEnrollmentId:'en-noor',history:[{at:'2026-10-14T08:00:00+03:00',actorId:'p-noor',from:null,to:'Pending',reason:'Application submitted'},{at:'2026-10-14T08:00:00+03:00',actorId:'system',from:'Pending',to:'Accepted',reason:'Migrated from the earlier automatic enrollment record'}]},
  {id:'adm-rania',code:'APP-RAN1A5',initiativeId:'i-today',personId:'p-rania',status:'Accepted',answers:{age:24,motivation:'Learning to start before I feel ready.'},consent:{text:'Agree to respectful participation.',version:1,at:'2026-10-14T11:00:00+03:00'},mode:'In-person',groupId:'g-today-a',created:'2026-10-14T11:00:00+03:00',updated:'2026-10-14T12:30:00+03:00',history:[{at:'2026-10-14T11:00:00+03:00',actorId:'p-rania',from:null,to:'Pending',reason:'Application submitted'},{at:'2026-10-14T12:30:00+03:00',actorId:'p-hala',from:'Pending',to:'Accepted',reason:'Eligible · seat available'}]},
  {id:'adm-omar',code:'APP-0MAR27',initiativeId:'i-today',personId:'p-omar',status:'Pending',answers:{age:27,motivation:'I want a group that keeps me accountable.'},consent:{text:'Agree to respectful participation.',version:1,at:'2026-10-15T09:20:00+03:00'},mode:'Online',groupId:null,created:'2026-10-15T09:20:00+03:00',updated:'2026-10-15T09:20:00+03:00',history:[{at:'2026-10-15T09:20:00+03:00',actorId:'p-omar',from:null,to:'Pending',reason:'Application submitted'}]}
];

export const sessionAttendance = [
  {id:'att-noor-kickoff',sessionId:'s-kickoff',registrationId:'sr-noor-kickoff',initiativeId:'i-today',personId:'p-noor',status:'Present',method:'online-verified',reason:'',actorId:'p-hala',at:'2026-10-14T18:05:00+03:00',history:[]}
];

export const empty = {excuses:[],coachReports:[],supervisorSummaries:[],initiativeBlocks:[],completions:[]};
