import {mentorship} from './data/mentorship.js';
import {institution} from './data/institution.js';
import {outdoor} from './data/outdoor.js';
import {platform} from './data/platform.js';
import {mentorshipCommand} from './commands/mentorship.js';
import {institutionCommand} from './commands/institution.js';
import {initiativeCommand} from './commands/initiative.js';
import {outdoorCommand} from './commands/outdoor.js';
import {platformCommand} from './commands/platform.js';
import {id,now,nowMs,setClockOffset,requireThat,find,textRequired,expireOffers,audit} from './domain.js';
import {migrate} from './migrate.js';
import {expireInitiativeOffers} from './commands/initiative.js';

export const STORAGE_KEY='deepsprout-ecosystem-demo-v1';
export const BACKUP_KEY=`${STORAGE_KEY}:backup:schema-1`;
export const demoEnabled=typeof location==='undefined'||location.protocol==='file:'||['localhost','127.0.0.1','[::1]'].includes(location.hostname);
let memory;
export function seed(){const s=structuredClone({...mentorship,...institution,...outdoor,...platform});s.people.forEach(p=>{if(p.verified&&!p.workspaces.includes('participant'))p.workspaces.push('participant');});s.organizations=[{...s.organization,memberIds:['p-maya']}];s.providers=[{...s.provider,memberIds:['p-sami']}];for(const key of ['sessions','forms','competitions','team','partnerships'])s[key].forEach(x=>x.ownerId=s.organization.id);s.otpChallenges=[];migrate(s);return s;}
function persist(s){memory=s;try{globalThis.localStorage?.setItem(STORAGE_KEY,JSON.stringify(s));}catch{} }
/** Keep one untouched copy of a schema-1 graph before it is first upgraded. */
function backup(raw){try{if(raw&&!globalThis.localStorage?.getItem(BACKUP_KEY))globalThis.localStorage?.setItem(BACKUP_KEY,raw);}catch{}}
export function read(){
  let s,raw=null;
  try{raw=globalThis.localStorage?.getItem(STORAGE_KEY)||null;s=JSON.parse(raw||'null');}catch{}
  let changed=false;
  if(s?.schema===1){backup(raw);changed=migrate(s);}
  else if(s?.schema===2)migrate(s);
  else{s=memory||seed();changed=!memory;}
  setClockOffset(s.clock?.offsetMs);
  if(expireOffers(s))changed=true;
  if(expireInitiativeOffers(s))changed=true;
  if(changed)persist(s);
  memory=s;return structuredClone(s);
}
/** @returns {import('./models').Person|null} */
export function person(s=read()){return s.people.find(x=>x.id===s.session.personId)||null;}
export function orgFor(s=read()){return s.organizations.find(x=>x.memberIds.includes(s.session.personId));}
export function providerFor(s=read()){return s.providers.find(x=>x.memberIds.includes(s.session.personId));}
export const activeGrants=(s,personId,role)=>(s.grants||[]).filter(g=>g.personId===personId&&g.status==='Active'&&(!role||g.role===role)&&s.initiatives.some(i=>i.id===g.scopeId&&!['Cancelled','Archived'].includes(i.status)));
/** A full Individual (regular member pages) or a verified partner participant. */
export const canActAsIndividual=p=>Boolean(p&&p.status==='Active'&&(p.individual||p.workspaces.includes('participant')));
export function workspaces(s=read()){
  const p=person(s);if(!p||p.status!=='Active')return [];
  const approved=type=>s.applications.some(a=>a.personId===p.id&&a.type===type&&a.status==='Approved');
  return p.workspaces.filter(w=>{
    if(w==='supervisor')return s.appointments.some(a=>a.personId===p.id&&['Invited','Accepted'].includes(a.status))||activeGrants(s,p.id,'supervisor').length>0;
    if(w==='mentor')return approved('mentor')||activeGrants(s,p.id,'coach').length>0;
    if(w==='organization')return approved('organization')&&s.organizations.some(o=>o.memberIds.includes(p.id));
    if(w==='provider')return approved('provider');
    return true;
  });
}
export function inviteState(s,token){const inv=s.invitations.find(x=>x.token===token);if(!inv)return 'Invalid';const g=s.groups.find(x=>x.id===inv.groupId);if(inv.status==='Revoked')return 'Revoked';if(Date.parse(inv.expires)<nowMs(s))return 'Expired';if(!g||g.status!=='Open')return 'Closed';if(g.memberIds.includes(s.session.personId))return 'Already joined';if(s.memberships.some(x=>x.groupId===g.id&&x.personId===s.session.personId&&x.status==='Pending'))return 'Pending approval';if(inv.uses>=inv.limit)return 'Exhausted';if(g.memberIds.length>=g.capacity)return 'Group full';return 'Valid';}
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function dispatch(action,p={}) {
  const s=read(),actor=s.session.personId;
  if(action==='demo.signin'){requireThat(demoEnabled,'Demo identities are available only in local development.');find(s.people,p.personId);s.session.personId=p.personId;persist(s);return p.personId;}
  if(action==='auth.logout'){s.session.personId=null;persist(s);return;}
  if(action==='demo.clock'){requireThat(demoEnabled,'The demo clock is a local development control.');s.clock||={offsetMs:0};if(p.reset)s.clock.offsetMs=0;else if(p.at){const at=Date.parse(p.at);requireThat(Number.isFinite(at),'Choose a valid demo date and time.');s.clock.offsetMs=at-Date.now();}else{const hours=Number(p.hours);requireThat(Number.isFinite(hours)&&Math.abs(hours)<=24*60,'Choose a clock change of at most 60 days.');s.clock.offsetMs+=hours*3600000;}setClockOffset(s.clock.offsetMs);expireOffers(s);expireInitiativeOffers(s);persist(s);return s.clock.offsetMs;}
  if(action==='demo.reset'){requireThat(demoEnabled,'Reset is available only in local development.');const fresh=seed();if(p.keepClock)fresh.clock={...s.clock};setClockOffset(fresh.clock?.offsetMs);persist(fresh);return;}
  if(action==='demo.application-status'){requireThat(demoEnabled,'Application scenarios are local development controls.');const application=find(s.applications,p.id);requireThat(application.personId===actor,'Preview only the current applicant’s application.');if(['Draft','Submitted'].includes(p.status)){application.status=p.status;application.updated=now();audit(s,actor,'Development application scenario',application.name,p.status);}else platformCommand(s,'admin.application.decide',{...p,reason:'Development application scenario'},actor);persist(s);return;}
  if(action==='demo.scenario'){requireThat(demoEnabled,'Scenarios are available only in local development.');const fresh=seed();if(p.name==='empty-mentor'){fresh.groups=fresh.groups.filter(g=>g.parentType==='initiative');fresh.programs=[];fresh.assignments=fresh.assignments.filter(a=>a.initiativeId);fresh.submissions=[];fresh.invitations=[];fresh.session.personId='p-maya';}else if(p.name==='empty-organization'){fresh.initiatives=[];fresh.sessions=[];fresh.forms=[];fresh.responses=[];fresh.enrollments=[];fresh.sessionRegistrations=[];fresh.competitions=[];fresh.partnerships=[];fresh.admissions=[];fresh.grants=[];fresh.staffInvites=[];fresh.sessionAttendance=[];fresh.groups=fresh.groups.filter(g=>g.parentType!=='initiative');fresh.assignments=fresh.assignments.filter(a=>!a.initiativeId);fresh.session.personId='p-maya';}else if(p.name==='empty-provider'){fresh.experiences=[];fresh.experienceSessions=[];fresh.bookings=[];fresh.appointments=[];fresh.cohorts=[];fresh.session.personId='p-sami';}else if(p.name==='unassigned-supervisor'){fresh.appointments=[];fresh.cohorts=[];fresh.session.personId='p-sami';}else if(p.name==='revision'){fresh.submissions[0].status='Needs Revision';fresh.submissions[0].feedback='Please describe the small step you actually tried.';fresh.session.personId='p-noor';}else if(p.name==='pending'){const pp={id:'p-applicant',name:'Dana Awad',email:'dana@demo.example',workspaces:[],status:'Active',verified:true};fresh.people.push(pp);fresh.applications.push({id:'app-dana',personId:pp.id,type:'mentor',name:pp.name,email:pp.email,status:'Pending Verification',submitted:now(),updated:now(),details:{title:'Community mentor',specialization:'Digital wellbeing',years:'3',bio:'Supporting practical group journeys.'},files:[],messages:[]});fresh.session.personId=pp.id;}else if(p.name==='offer'){fresh.bookings[1].status='Cancelled';fresh.bookings[2].status='Seat Offered';fresh.offers.push({id:'offer-demo',bookingId:'b-rania',experienceId:'e-reset',personId:'p-rania',status:'Offered',created:now(),expires:new Date(Date.now()+15*60000).toISOString()});fresh.session.personId='p-sami';}else fresh.session.personId='p-maya';persist(fresh);return;}
  if(action==='auth.account'){const name=textRequired(p.name,'Name'),email=textRequired(p.email,'Email').toLowerCase();requireThat(EMAIL.test(email),'Enter a valid email address.');requireThat(p.consent,'Accept the demo terms before continuing.');let pp=s.people.find(x=>x.email.toLowerCase()===email);if(pp){requireThat(p.existing,'Choose the existing-account option to reuse this demo identity.');requireThat(pp.status==='Active','This demo account is suspended.');}else{pp={id:id('person'),name,email,workspaces:[],status:'Active',verified:false};s.people.push(pp);}s.session.personId=pp.id;persist(s);return pp.id;}
  if(action==='auth.otp'){const email=textRequired(p.email||person(s)?.email,'Email');s.otpChallenges.push({id:id('otp'),email,token:p.token||'',expires:nowMs(s)+5*60000,used:false});persist(s);return;}
  if(action==='auth.verify'||action==='auth.join'){const email=p.email||person(s)?.email,challenge=s.otpChallenges.filter(x=>x.email===email&&!x.used).at(-1);requireThat(challenge&&challenge.expires>nowMs(s),'The demo code expired. Request another code.');requireThat(p.code==='246810','Use the demonstrated code: 246810.');if(action==='auth.join'){requireThat(challenge.token===p.token,'Request a code for this invitation.');requireThat(inviteState(s,p.token)==='Valid','This invitation is no longer available.');const inv=s.invitations.find(x=>x.token===p.token);requireThat(!inv.email||inv.email.toLowerCase()===email.toLowerCase(),'Use the email named in this invitation.');const g=find(s.groups,inv.groupId);let pp=s.people.find(x=>x.email.toLowerCase()===email.toLowerCase());if(!pp){pp={id:id('person'),name:textRequired(p.name,'Name'),email,workspaces:['student','participant'],status:'Active',verified:true};s.people.push(pp);}requireThat(pp.status==='Active','This demo identity is suspended.');if(!pp.workspaces.includes('student'))pp.workspaces.push('student');pp.verified=true;s.session.personId=pp.id;requireThat(!g.memberIds.includes(pp.id),'You have already joined this group.');if(g.approval)s.memberships.push({id:id('membership'),groupId:g.id,personId:pp.id,status:'Pending'});else g.memberIds.push(pp.id);inv.uses++;}else{requireThat(actor,'Create or reuse an account first.');person(s).verified=true;if(!person(s).workspaces.includes('participant'))person(s).workspaces.push('participant');}challenge.used=true;persist(s);return;}
  // Regular Individual registration and sign-in on the same canonical people.
  if(action==='member.register'){
    const name=textRequired(p.name,'Full name'),email=textRequired(p.email,'Email').toLowerCase();
    requireThat(EMAIL.test(email),'Enter a valid email address.');requireThat(p.consent,'Agree to the terms before continuing.');
    requireThat(!s.people.some(x=>x.email.toLowerCase()===email),'An account with this email already exists on this device. Log in instead.');
    const pp={id:id('person'),name,email,workspaces:[],status:'Active',verified:true,individual:true,created:now()};pp.journal=`person:${pp.id}`;
    s.people.push(pp);s.session.personId=pp.id;audit(s,pp.id,'Individual account created',name,'Simulated verification · no password stored');persist(s);return pp.id;
  }
  if(action==='member.signin'){
    const email=textRequired(p.email,'Email').toLowerCase(),pp=s.people.find(x=>x.email.toLowerCase()===email);
    requireThat(pp,'No account uses this email on this device. Register first.');requireThat(pp.status==='Active','This account is suspended.');
    s.session.personId=pp.id;persist(s);return pp.id;
  }
  requireThat(actor&&person(s)?.status==='Active','Choose an active demo identity or complete partner account entry.');
  const area=action.split('.')[0];if(['mentor','student','organization','provider','supervisor','admin','participant'].includes(area))requireThat(workspaces(s).includes(area),`The current demo identity has no active ${area} workspace.`);
  if(area==='member')requireThat(canActAsIndividual(person(s)),'This identity has no full Individual account yet.');
  if(area==='provider'){const provider=providerFor(s);requireThat(provider?.status==='Approved','The provider is not active.');let eid=p.experienceId;if(p.id&&action.startsWith('provider.experience'))eid=p.id;if(p.sessionId)eid=find(s.experienceSessions,p.sessionId).experienceId;if(p.id&&action.startsWith('provider.booking'))eid=find(s.bookings,p.id).experienceId;if(p.id&&action.startsWith('provider.offer'))eid=find(s.offers,p.id).experienceId;if(p.id&&action.startsWith('provider.appointment'))eid=find(s.appointments,p.id).experienceId;if(p.appointmentId)eid=find(s.appointments,p.appointmentId).experienceId;if(p.id&&action==='provider.attendance.correct')eid=find(s.attendance,p.id).experienceId;if(eid)requireThat(find(s.experiences,eid).ownerId===provider.id,'This experience belongs to another provider.');s.provider=provider;}
  if(area==='organization')requireThat(orgFor(s)?.status==='Approved','The institution is not active.');
  let result;
  for(const handler of [platformCommand,mentorshipCommand,initiativeCommand,institutionCommand,outdoorCommand]){result=handler(s,action,p,actor);if(result!==false)break;}
  requireThat(result!==false,'This action is unavailable.');
  if(!['mentor.review','builder.save','student.focus.save','account.notice.read','member.notice.read'].includes(action)&&!action.includes('attendance'))audit(s,actor,action,p.id||p.title||p.name||p.experienceId||p.initiativeId||'Workspace',p.reason||'');
  persist(s);return result;
}
export function snapshotForTests(s){persist(structuredClone(s));}
