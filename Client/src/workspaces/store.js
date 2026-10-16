import {normalizeProviderData} from './provider-rules.js';
import {mentorship} from './data/mentorship.js';
import {institution} from './data/institution.js';
import {outdoor} from './data/outdoor.js';
import {platform} from './data/platform.js';
import {mentorshipCommand,acceptInvitation} from './commands/mentorship.js';
import {isIndependentCoach,invitationStatus} from './coach-rules.js';
import {institutionCommand} from './commands/institution.js';
import {initiativeCommand} from './commands/initiative.js';
import {outdoorCommand} from './commands/outdoor.js';
import {platformCommand} from './commands/platform.js';
import {id,now,nowMs,setClockOffset,requireThat,find,textRequired,expireOffers,audit,notify as notifyPerson} from './domain.js';
import {migrate} from './migrate.js';
import {expireInitiativeOffers} from './commands/initiative.js';

export const STORAGE_KEY='deepsprout-ecosystem-demo-v1';
export const BACKUP_KEY=`${STORAGE_KEY}:backup:schema-1`;
const backupKey=version=>`${STORAGE_KEY}:backup:schema-${version}`;
export const demoEnabled=typeof location==='undefined'||location.protocol==='file:'||['localhost','127.0.0.1','[::1]'].includes(location.hostname);
let memory;
export function seed(){const s=structuredClone({...mentorship,...institution,...outdoor,...platform});s.people.forEach(p=>{if(p.verified&&!p.workspaces.includes('participant'))p.workspaces.push('participant');});s.organizations=[{...s.organization,memberIds:['p-maya']}];s.providers=[{...s.provider,memberIds:['p-sami']}];for(const key of ['sessions','forms','competitions','team','partnerships'])s[key].forEach(x=>x.ownerId=s.organization.id);s.otpChallenges=[];migrate(s);normalizeProviderData(s);return s;}
function persist(s){
  try{globalThis.localStorage?.setItem(STORAGE_KEY,JSON.stringify(s));}
  catch{setClockOffset(memory?.clock?.offsetMs);throw new Error('Your changes could not be saved. Free device storage or allow storage, then try again.');}
  memory=structuredClone(s);
}
/** Keep one untouched copy of a schema-1 graph before it is first upgraded. */
function backup(raw,version=1){if(raw&&!globalThis.localStorage?.getItem(backupKey(version))){try{globalThis.localStorage?.setItem(backupKey(version),raw);}catch{throw new Error('Migration paused: the original data backup could not be saved. Free device storage and try again.');}}}
export function read(){
  let s,raw=null;
  try{raw=globalThis.localStorage?.getItem(STORAGE_KEY)||null;s=JSON.parse(raw||'null');}catch{throw new Error('Stored data could not be read. Allow device storage or restore a valid backup.');}
  if(s && ![1,2,3,4].includes(s.schema))throw new Error('This data version is not supported. The original has been preserved.');
  let changed=false;
  if(s?.schema===1){backup(raw);changed=migrate(s);}
  else if(s?.schema===2){backup(raw,2);changed=migrate(s);}else if(s?.schema===3){backup(raw,3);changed=migrate(s);}else if(s?.schema===4)migrate(s);
  else{s=memory||seed();changed=!memory;}
  if(s.providerDataVersion!==1){if(raw){try{const key=`${STORAGE_KEY}:backup:provider-v1`;if(!globalThis.localStorage?.getItem(key))globalThis.localStorage?.setItem(key,raw);}catch{throw new Error('Provider migration paused: the original backup could not be saved.');}}if(normalizeProviderData(s))changed=true;}
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
/**
 * What an invitation link means for the current session person. Wrong-email,
 * expired, revoked, replaced, declined, already-used or closed links grant
 * nothing; the strings are stable UI states.
 */
export function inviteState(s,token){
  const inv=s.invitations.find(x=>x.token===token);if(!inv)return 'Invalid';
  const g=s.groups.find(x=>x.id===inv.groupId),me=s.session.personId;
  if(['Revoked','Replaced'].includes(inv.status))return 'Revoked';
  if(inv.status==='Declined')return 'Declined';
  if(g&&me&&g.memberIds.includes(me))return 'Already joined';
  if(g&&me&&s.memberships.some(x=>x.groupId===g.id&&x.personId===me&&x.status==='Pending'))return 'Pending approval';
  if(inv.status==='Accepted')return 'Accepted';
  if(Date.parse(inv.expires)<nowMs(s))return 'Expired';
  const pr=g&&g.parentType!=='initiative'?s.programs.find(x=>x.id===g.programId):null;
  if(!g||g.status!=='Open'||(g.parentType!=='initiative'&&(!pr||pr.status!=='Published'||!isIndependentCoach(s,g.ownerId))))return 'Closed';
  if(inv.uses>=inv.limit)return 'Exhausted';
  if(g.memberIds.length>=g.capacity)return 'Group full';
  return 'Valid';
}
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function dispatch(action,p={}) {
  const s=read(),actor=s.session.personId;
  if(action==='demo.signin'){requireThat(demoEnabled,'Demo identities are available only in local development.');find(s.people,p.personId);s.session.personId=p.personId;persist(s);return p.personId;}
  if(action==='auth.logout'){s.session.personId=null;persist(s);return;}
  if(action==='demo.clock'){requireThat(demoEnabled,'The demo clock is a local development control.');s.clock||={offsetMs:0};if(p.reset)s.clock.offsetMs=0;else if(p.at){const at=Date.parse(p.at);requireThat(Number.isFinite(at),'Choose a valid demo date and time.');s.clock.offsetMs=at-Date.now();}else{const hours=Number(p.hours);requireThat(Number.isFinite(hours)&&Math.abs(hours)<=24*60,'Choose a clock change of at most 60 days.');s.clock.offsetMs+=hours*3600000;}setClockOffset(s.clock.offsetMs);expireOffers(s);expireInitiativeOffers(s);persist(s);return s.clock.offsetMs;}
  if(action==='demo.reset'){requireThat(demoEnabled,'Reset is available only in local development.');const fresh=seed();if(p.keepClock)fresh.clock={...s.clock};setClockOffset(fresh.clock?.offsetMs);persist(fresh);return;}
  if(action==='demo.application-status'){requireThat(demoEnabled,'Application scenarios are local development controls.');const application=find(s.applications,p.id);requireThat(application.personId===actor,'Preview only the current applicant’s application.');if(['Draft','Submitted'].includes(p.status)){application.status=p.status;application.updated=now();audit(s,actor,'Development application scenario',application.name,p.status);}else platformCommand(s,'admin.application.decide',{...p,reason:'Development application scenario'},actor);persist(s);return;}
  if(action==='demo.scenario'){requireThat(demoEnabled,'Scenarios are available only in local development.');const fresh=seed();if(p.name==='empty-mentor'){fresh.groups=fresh.groups.filter(g=>g.parentType==='initiative');fresh.programs=[];fresh.assignments=fresh.assignments.filter(a=>a.initiativeId);fresh.submissions=[];fresh.invitations=[];fresh.session.personId='p-maya';}else if(p.name==='empty-organization'){fresh.initiatives=[];fresh.sessions=[];fresh.forms=[];fresh.responses=[];fresh.enrollments=[];fresh.sessionRegistrations=[];fresh.competitions=[];fresh.partnerships=[];fresh.admissions=[];fresh.grants=[];fresh.staffInvites=[];fresh.sessionAttendance=[];fresh.groups=fresh.groups.filter(g=>g.parentType!=='initiative');fresh.assignments=fresh.assignments.filter(a=>!a.initiativeId);fresh.session.personId='p-maya';}else if(p.name==='empty-provider'){fresh.experiences=[];fresh.experienceSessions=[];fresh.bookings=[];fresh.appointments=[];fresh.cohorts=[];fresh.session.personId='p-sami';}else if(p.name==='unassigned-supervisor'){fresh.appointments=[];fresh.cohorts=[];fresh.session.personId='p-sami';}else if(p.name==='revision'){fresh.submissions[0].status='Needs Revision';fresh.submissions[0].feedback='Please describe the small step you actually tried.';fresh.session.personId='p-noor';}else if(p.name==='pending'){const pp={id:'p-applicant',name:'Dana Awad',email:'dana@demo.example',workspaces:[],status:'Active',verified:true};fresh.people.push(pp);fresh.applications.push({id:'app-dana',personId:pp.id,type:'mentor',name:pp.name,email:pp.email,status:'Pending Verification',submitted:now(),updated:now(),details:{title:'Community mentor',specialization:'Digital wellbeing',years:'3',bio:'Supporting practical group journeys.'},files:[],messages:[]});fresh.session.personId=pp.id;}else if(p.name==='offer'){fresh.bookings[1].status='Cancelled';fresh.bookings[2].status='Seat Offered';fresh.offers.push({id:'offer-demo',bookingId:'b-rania',experienceId:'e-reset',personId:'p-rania',status:'Offered',created:now(),expires:new Date(nowMs(fresh)+(fresh.settings.providerOfferHours||24)*3600000).toISOString()});fresh.session.personId='p-sami';}else fresh.session.personId='p-maya';persist(fresh);return;}
  if(action==='auth.account'){const name=textRequired(p.name,'Name'),email=textRequired(p.email,'Email').toLowerCase();requireThat(EMAIL.test(email),'Enter a valid email address.');requireThat(p.consent,'Accept the demo terms before continuing.');let pp=s.people.find(x=>x.email.toLowerCase()===email);if(pp){requireThat(p.existing,'Choose the existing-account option to reuse this demo identity.');requireThat(pp.status==='Active','This demo account is suspended.');}else{pp={id:id('person'),name,email,workspaces:[],status:'Active',verified:false};s.people.push(pp);}s.session.personId=pp.id;persist(s);return pp.id;}
  if(action==='auth.otp'){const email=textRequired(p.email||person(s)?.email,'Email');s.otpChallenges.push({id:id('otp'),email,token:p.token||'',expires:nowMs(s)+5*60000,used:false});persist(s);return;}
  if(action==='auth.verify'||action==='auth.join'){const email=p.email||person(s)?.email,challenge=s.otpChallenges.filter(x=>x.email===email&&!x.used).at(-1);requireThat(challenge&&challenge.expires>nowMs(s),'The demo code expired. Request another code.');requireThat(p.code==='246810','Use the demonstrated code: 246810.');if(action==='auth.join'){requireThat(challenge.token===p.token,'Request a code for this invitation.');requireThat(inviteState(s,p.token)==='Valid','This invitation is no longer available.');const inv=s.invitations.find(x=>x.token===p.token);requireThat(!inv.email||inv.email.toLowerCase()===email.toLowerCase(),'Use the email named in this invitation.');let pp=s.people.find(x=>x.email.toLowerCase()===email.toLowerCase());requireThat(!pp||pp.status==='Active','This demo identity is suspended.');if(!pp){pp={id:id('person'),name:textRequired(p.name,'Name'),email:email.toLowerCase(),workspaces:['student','participant'],status:'Active',verified:true,created:now()};s.people.push(pp);}acceptInvitation(s,inv,pp);s.session.personId=pp.id;}else{requireThat(actor,'Create or reuse an account first.');person(s).verified=true;if(!person(s).workspaces.includes('participant'))person(s).workspaces.push('participant');}challenge.used=true;persist(s);return;}
  // A signed-in, verified person accepts or declines a private Coach invitation addressed to their own email.
  if(action==='auth.invite.accept'||action==='auth.invite.decline'){
    const pp=person(s);requireThat(pp,'Sign in with the invited account first.');requireThat(pp.status==='Active','This demo identity is suspended.');
    const inv=s.invitations.find(x=>x.token===p.token);requireThat(inv,'This invitation link is not valid.');
    requireThat(!inv.email||inv.email.toLowerCase()===pp.email.toLowerCase(),'This invitation was sent to a different email. Sign in with that account instead.');
    if(action==='auth.invite.decline'){requireThat(inv.email&&invitationStatus(s,inv)==='Active','This invitation can no longer be declined.');inv.status='Declined';inv.declinedAt=now();(inv.history||=[]).push({at:now(),actorId:pp.id,change:'Declined'});const g=find(s.groups,inv.groupId);notifyPerson(s,g.ownerId,`${pp.name} declined the invitation to “${g.name}”.`,`workspaces.html#/mentor/groups/${g.id}?tab=invitations`);persist(s);return;}
    requireThat(pp.verified,'Verify your email first.');requireThat(inviteState(s,p.token)==='Valid','This invitation is no longer available.');
    const g=acceptInvitation(s,inv,pp);persist(s);return g.id;
  }
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
  if(action==='member.profile.update'){
    const pp=person(s);requireThat(pp?.status==='Active'&&pp.individual,'An active Individual account is required.');
    pp.name=textRequired(p.name,'Display name');
    // Email remains verified and immutable here; changing it requires a future verification flow.
    requireThat(!p.email||p.email.toLowerCase()===pp.email.toLowerCase(),'Your verified email cannot be changed here.');
    audit(s,actor,'Display name updated',pp.name);persist(s);return pp.id;
  }
  requireThat(actor&&person(s)?.status==='Active','Choose an active demo identity or complete partner account entry.');
  const area=action.split('.')[0];if(['mentor','student','organization','provider','supervisor','admin','participant'].includes(area))requireThat(workspaces(s).includes(area),`The current demo identity has no active ${area} workspace.`);
  if(area==='member')requireThat(canActAsIndividual(person(s)),'This identity has no full Individual account yet.');
  if(area==='provider'){const provider=providerFor(s);requireThat(provider?.status==='Approved','The provider is not active.');let eid=p.experienceId;if(p.id&&action.startsWith('provider.experience'))eid=p.id;if(p.sessionId)eid=find(s.experienceSessions,p.sessionId).experienceId;if(p.id&&action.startsWith('provider.booking'))eid=find(s.bookings,p.id).experienceId;if(p.id&&action.startsWith('provider.offer'))eid=find(s.offers,p.id).experienceId;if(p.id&&action.startsWith('provider.appointment'))eid=find(s.appointments,p.id).experienceId;if(p.bookingId)eid=find(s.bookings,p.bookingId).experienceId;if(p.appointmentId)eid=find(s.appointments,p.appointmentId).experienceId;if(p.id&&action==='provider.attendance.correct')eid=find(s.attendance,p.id).experienceId;if(eid)requireThat(find(s.experiences,eid).ownerId===provider.id,'This experience belongs to another provider.');s.provider=provider;}
  if(area==='organization')requireThat(orgFor(s)?.status==='Approved','The institution is not active.');
  let result;
  for(const handler of [platformCommand,mentorshipCommand,initiativeCommand,institutionCommand,outdoorCommand]){result=handler(s,action,p,actor);if(result!==false)break;}
  requireThat(result!==false,'This action is unavailable.');
  if(!['mentor.review','builder.save','student.focus.save','account.notice.read','member.notice.read'].includes(action)&&!action.includes('attendance'))audit(s,actor,action,p.id||p.title||p.name||p.experienceId||p.initiativeId||'Workspace',p.reason||'');
  persist(s);return result;
}
export function snapshotForTests(s){persist(structuredClone(s));}
