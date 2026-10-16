import {institutionApproved,providerApproved,clockDay} from '../domain.js';
import {initiativeOfResource} from '../initiative-rules.js';
import {id,now,requireThat,find,textRequired,numberIn,dates,audit} from '../domain.js';
import {normalizeInitiative} from '../migrate.js';
import {isRepresentative,MAX_SEATS} from '../initiative-rules.js';
/** Publication blockers for the six-step builder (master §15.2). A missing Supervisor is a warning, never a blocker. */
export function publishBlockers(s,i){const out=[],add=(step,field,message)=>out.push({step,field,message});
 if(!String(i.title||'').trim())add(0,'title','Add a title');if(!i.topic)add(0,'topic','Choose a topic');if(!String(i.objective||'').trim())add(0,'objective','Describe the primary objective');if(!String(i.summary||'').trim())add(0,'summary','Write a short public summary');
 if(!i.start||!i.end)add(0,'start','Set start and end dates');else if(i.end<i.start)add(0,'end','The end date must follow the start date');if(!i.timezone)add(0,'timezone','Choose a time zone');
 if(!String(i.audience||'').trim())add(1,'audience','Describe the intended audience');if(i.minAge!==undefined&&i.maxAge&&Number(i.maxAge)<Number(i.minAge))add(1,'maxAge','Maximum age must be at least the minimum age');
 if(!String(i.consent||'').trim())add(1,'consent','State the consent participants agree to');if(!String(i.coverage||'').trim())add(1,'coverage','Describe the geographic eligibility');
 if(!(i.modes||[]).length)add(1,'modes','Choose at least one participation mode');if((i.modes||[]).some(m=>m!=='Online')&&!String(i.venue||'').trim())add(1,'venue','Add a venue for in-person or hybrid participation');
 const cap=Number(i.capacity);if(!Number.isInteger(cap)||cap<1||cap>MAX_SEATS)add(1,'capacity',`Capacity must be 1–${MAX_SEATS} accepted students`);
 if(i.registrationOpen&&i.registrationClose&&i.registrationClose<i.registrationOpen)add(1,'registrationClose','Registration must close after it opens');if(i.registrationClose&&i.end&&i.registrationClose>i.end)add(1,'registrationClose','Registration must close before the initiative ends');
 if(i.cost?.type==='Paid'&&(!(Number(i.cost.price)>0)||!i.cost.currency))add(1,'price','A paid initiative needs a positive price and currency');
 if(!(i.components||[]).length)add(2,'components','Add at least one component');(i.components||[]).forEach((c,n)=>{if(!String(c.title||'').trim())add(2,`title-${n}`,`Component ${n+1} needs a title`);if(c.type==='Session'&&!c.resourceId&&(!c.date||!c.time||!c.endTime||c.endTime<=c.time))add(2,`date-${n}`,`Session “${c.title||n+1}” needs a date and valid times`);if(c.type==='Session'&&!c.resourceId&&c.format&&c.format!=='Online'&&!String(c.venue||i.venue||'').trim())add(2,`venue-${n}`,`Session “${c.title||n+1}” needs a venue`);if(['Mentor Program','Competition'].includes(c.type)&&!c.resourceId)add(2,`resource-${n}`,`Choose the linked ${c.type.toLowerCase()} for “${c.title||n+1}”`);});
 if(!String(i.policies?.completion||i.completion||'').trim())add(4,'completion','State the completion criteria');
 return out;}
export function institutionCommand(s,action,p,actor) {
  const org=s.organizations.find(x=>x.memberIds.includes(actor));
  const own=(list,key)=>{const r=find(list,key);requireThat(r.ownerId===org?.id,'This resource belongs to another institution.');return r;};
  if(action==='organization.initiative.save'){const old=p.id?own(s.initiatives,p.id):null;requireThat(!old||old.status==='Draft','Published initiatives change through a versioned update, not the draft builder.');requireThat(isRepresentative(s,{ownerId:org.id},actor),'Only the Institution Representative can create initiatives.');const {id:_ignore,status:_status,...fields}=p;const record=normalizeInitiative({...(old||{}),...fields,title:textRequired(p.title,'Initiative title'),ownerId:org.id,status:'Draft',version:old?.version||1});if(record.capacity!==undefined&&record.capacity!=='')record.capacity=Number(record.capacity);if(old){Object.assign(old,record);old.history.push({version:old.version,at:now(),actorId:actor,change:'Draft saved'});}else s.initiatives.push({...record,id:id('initiative'),created:now(),history:[{version:1,at:now(),actorId:actor,change:'Draft created'}]});return old?.id||s.initiatives.at(-1).id;}
  if(action==='organization.initiative.publish'){const i=own(s.initiatives,p.id);requireThat(isRepresentative(s,i,actor),'Only the Institution Representative can publish.');requireThat(i.status==='Draft','Only a draft can be published.');const blockers=publishBlockers(s,i);requireThat(!blockers.length,`Fix before publishing: ${blockers.map(b=>b.message).join(' · ')}`);i.status='Published';i.registrationState='Open';i.publishedAt=now();i.history.push({version:i.version,at:now(),actorId:actor,change:'Published',reason:p.reason||'Initial publication'});for(const c of i.components){if(c.resourceId)continue;if(c.type==='Session'){const sid=id('session'),format=c.format||'Online',cap=Number(c.capacity||20);s.sessions.push({id:sid,ownerId:org.id,initiativeId:i.id,title:c.title,description:c.description||i.summary,agenda:c.agenda||'',speaker:c.speaker||find(s.people,actor).name,date:c.date||i.start,time:c.time||'17:00',endTime:c.endTime||'18:00',timezone:i.timezone||'Asia/Amman',format,venue:format==='Online'?'':(c.venue||i.venue||org.city),meeting:format==='In-person'?'':(c.meeting||'Protected meeting link shared with confirmed registrants'),capacity:cap,onlineCapacity:format==='In-person'?0:cap,inPersonCapacity:format==='Online'?0:cap,status:c.publish===false?'Draft':'Published',eligibility:'Accepted participants of this initiative',instructions:c.instructions||'Read the participation notes before registering.',attendancePolicy:'Factual attendance by an assigned active Supervisor.',attendanceRequired:c.attendanceRequired!==false,supervisorIds:(c.supervisorIds||[]).filter(pid=>(s.grants||[]).some(g=>g.personId===pid&&g.scopeId===i.id&&g.role==='supervisor'&&g.status==='Active')),checkInPolicy:{mode:'window',before:30,after:30},registrationOpen:i.registrationOpen||'',registrationClose:c.date||i.start,completionRule:c.completionRule||'Attendance only',history:[{at:now(),actorId:actor,change:'Created from the initiative builder'}],closedOut:false});c.resourceId=sid;}if(c.type==='Survey or Quiz'){const fid=id('form');s.forms.push({id:fid,ownerId:org.id,initiativeId:i.id,title:c.title,purpose:c.purpose||'Survey',anonymous:false,status:'Draft',version:1,questions:[],versions:[]});c.resourceId=fid;}}return;}
  if(action==='organization.initiative.duplicate'){const i=structuredClone(own(s.initiatives,p.id));i.id=id('initiative');i.title+=' · revision';i.version=1;i.status='Draft';i.registrationState='Open';i.components=i.components.map(c=>({...c,resourceId:['Mentor Program','Competition'].includes(c.type)?c.resourceId:undefined}));i.history=[{version:1,at:now(),actorId:actor,change:`Draft duplicated from ${p.id}`}];delete i.publishedAt;delete i.completedAt;s.initiatives.push(i);return i.id;}
  if(action==='organization.session.save'){const old=p.id?own(s.sessions,p.id):null;requireThat(!old||old.status==='Draft','Duplicate or create a new session to change a published schedule.');if(p.initiativeId)own(s.initiatives,p.initiativeId);const record={...p,title:textRequired(p.title,'Session title'),speaker:textRequired(p.speaker,'Facilitator'),capacity:numberIn(p.capacity,1,1000,'Capacity'),ownerId:org.id,status:'Draft'};requireThat(p.date&&p.time&&p.endTime>p.time,'Choose a valid date and time interval.');requireThat(p.format==='Online'||p.venue,'Add a venue for in-person participation.');if(old)Object.assign(old,record);else s.sessions.push({...record,id:id('session')});return old?.id||s.sessions.at(-1).id;}
  if(action==='organization.session.publish'){const ss=own(s.sessions,p.id);requireThat(ss.status==='Draft','This session is already published.');ss.status='Published';return;}
  if(action==='organization.form.save'){const old=p.id?own(s.forms,p.id):null;requireThat(!old||old.status==='Draft','Create a revision for a published form.');const record={...p,anonymous:false,title:textRequired(p.title,'Form title'),ownerId:org.id,status:'Draft',version:old?.version||1};if(old)Object.assign(old,record);else s.forms.push({...record,id:id('form'),versions:[]});return old?.id||s.forms.at(-1).id;}
  if(action==='organization.form.publish'){const f=own(s.forms,p.id);requireThat(f.status==='Draft'&&f.questions.length,'Add questions to a draft before publishing.');requireThat(f.questions.every(q=>q.label&&(!['Single choice','Multiple choice'].includes(q.type)||q.options.length>1)),'Each question needs a label; choices need at least two options.');f.status='Published';f.versions.push({version:f.version,questions:structuredClone(f.questions),created:now()});return;}
  if(action==='organization.form.revise'){const f=structuredClone(own(s.forms,p.id));f.id=id('form');f.version++;f.status='Draft';f.sourceId=p.id;s.forms.push(f);return f.id;}
  if(action==='organization.form.close'){own(s.forms,p.id).status='Closed';return;}
  if(action==='organization.competition.save'){const old=p.id?own(s.competitions,p.id):null;const record={...p,title:textRequired(p.title,'Competition title'),rules:textRequired(p.rules,'Rules'),ownerId:org.id,status:p.status||'Draft',resultsPublished:false};dates(p.open,p.deadline);requireThat(p.criteria.length&&p.judgeIds.length,'Add criteria and assigned judges.');if(old)Object.assign(old,record);else s.competitions.push({...record,id:id('competition')});return;}
  if(action==='organization.entry.judge'){const e=find(s.entries,p.id),c=own(s.competitions,e.competitionId);requireThat(c.judgeIds.includes(actor),'You are not an assigned judge.');requireThat(c.criteria.every(k=>p.scores[k]!==undefined),'Evaluate every criterion.');e.scores=Object.fromEntries(c.criteria.map(k=>[k,numberIn(p.scores[k],1,5,k)]));e.feedback=textRequired(p.feedback,'Feedback');e.status='Reviewed';return;}
  if(action==='organization.competition.results'){const c=own(s.competitions,p.id),entries=s.entries.filter(x=>x.competitionId===c.id);requireThat(entries.length&&entries.every(x=>x.status==='Reviewed'),'Review all submitted entries before publishing results.');c.resultsPublished=true;return;}
  if(action==='organization.team.save'){const old=p.id?find(s.team,p.id):null;requireThat(!old||old.ownerId===org.id,'This team member belongs to another institution.');const record={...p,name:textRequired(p.name,'Name'),email:textRequired(p.email,'Email'),ownerId:org.id,scope:p.scope||org.name,capability:p.capability||'Report Viewer',status:old?.status||'Invited'};if(old)Object.assign(old,record);else s.team.push({...record,id:id('team')});return;}
  if(action==='organization.team.revoke'){const t=find(s.team,p.id);requireThat(t.ownerId===org.id&&t.personId!==actor,'You cannot revoke your own owner access.');t.status='Revoked';return;}
  if(action==='organization.partnership.request'){
    const i=own(s.initiatives,p.initiativeId),provider=find(s.providers,p.providerId);requireThat(institutionApproved(s,org.id)&&providerApproved(s,provider.id),'Both partners must be active and approved.');requireThat(!s.partnerships.some(x=>x.initiativeId===i.id&&x.providerId===provider.id&&['Requested','Accepted','Active'].includes(x.status)),'An active request already exists.');
    const part={id:id('partnership'),ownerId:org.id,initiativeId:i.id,providerId:provider.id,purpose:textRequired(p.purpose,'Collaboration purpose'),proposedComponent:p.proposedComponent||'Linked Outdoor Experience',start:p.start||'',end:p.end||'',role:p.role||'Independent operator',scope:'Aggregate attendance and completion only',status:'Requested',experienceId:null,created:now(),history:[{actorId:actor,at:now(),from:null,to:'Requested',reason:p.purpose}]};s.partnerships.push(part);return part.id;
  }
  if(action==='organization.partnership.end'||action==='provider.partnership.end'){
    const part=find(s.partnerships,p.id);if(action.startsWith('organization'))requireThat(part.ownerId===org.id,'This partnership belongs to another institution.');else requireThat(s.providers.some(x=>x.id===part.providerId&&x.memberIds.includes(actor)),'This partnership belongs to another provider.');requireThat(['Requested','Accepted','Active'].includes(part.status),'This partnership has ended.');(part.history||=[]).push({actorId:actor,at:now(),from:part.status,to:'Ended',experienceId:part.experienceId,reason:p.reason||'Partnership ended by authorized partner'});part.status='Ended';part.endedAt=now();return;
  }
  if(action==='provider.partnership.accept'||action==='provider.partnership.decline'||action==='provider.partnership.link'){
    const part=find(s.partnerships,p.id);requireThat(s.providers.some(x=>x.id===part.providerId&&x.memberIds.includes(actor)),'This request is outside your provider.');const before=part.status,previousExperienceId=part.experienceId;
    requireThat(providerApproved(s,part.providerId)&&institutionApproved(s,part.ownerId),'Both partners must be active and approved.');
    if(action.endsWith('link')){requireThat(['Accepted','Active'].includes(part.status),'Accept the partnership first.');const e=find(s.experiences,p.experienceId);requireThat(e.ownerId===part.providerId&&['Published','Active'].includes(e.status)&&e.end>=clockDay(s,e.timezone),'Choose your own active published experience.');part.experienceId=e.id;part.status='Active';}else{requireThat(part.status==='Requested','This request has already been processed.');part.status=action.endsWith('accept')?'Accepted':'Declined';}
    (part.history||=[]).push({actorId:actor,at:now(),from:before,to:part.status,previousExperienceId,experienceId:part.experienceId,reason:p.reason||'Authorized partnership decision'});return;
  }
  if(action==='participant.form.respond'){return respondToForm(s,find(s.forms,p.formId),p.answers,actor,p);}
  if(action==='participant.competition.enter'){return enterCompetition(s,find(s.competitions,p.competitionId),p.text,actor,p);}
  return false;
}

/** One identified response engine for partner Participant and regular Individual pages (D41). */
export function respondToForm(s,f,answers={},actor,p={}){
  participationGuard(s,f,actor,p,'form');
  requireThat(f.status==='Published','This form is closed.');
  for(const q of f.questions){const answer=answers[q.id];requireThat(!q.required||(Array.isArray(answer)?answer.length:typeof answer==='string'&&answer.trim()),`Answer: ${q.label}`);if(answer&&q.type==='Single choice')requireThat(q.options.includes(answer),'Choose a listed option.');if(answer&&q.type==='Multiple choice')requireThat(Array.isArray(answer)&&answer.every(x=>q.options.includes(x)),'Choose listed options.');if(answer&&q.type==='Rating')numberIn(answer,1,5,q.label);if(answer&&q.type==='Number')requireThat(Number.isFinite(Number(answer)),`${q.label} must be a number.`);if(answer&&q.type==='Date')requireThat(/^\d{4}-\d{2}-\d{2}$/.test(answer),`${q.label} must be a date.`);}
  requireThat(!s.responses.some(x=>x.formId===f.id&&x.personId===actor)||f.allowMultiple,'You already responded to this form version.');
  const record={id:id('response'),formId:f.id,version:f.version,consent:{version:f.version||1,at:now()},personId:actor,answers,submitted:now()};s.responses.push(record);return record.id;
}
/** One competition entry engine; the Institution judges the same entry. */
export function enterCompetition(s,c,text,actor,p={}){
  participationGuard(s,c,actor,p,'competition');
  requireThat(c.status==='Published','This competition is not open.');
  requireThat(!s.entries.some(x=>x.competitionId===c.id&&x.personId===actor),'You already submitted an entry.');
  const entry={id:id('entry'),competitionId:c.id,version:c.version||1,consent:{version:c.version||1,at:now()},personId:actor,text:textRequired(text,'Your entry'),status:'Submitted',created:now(),scores:{},feedback:''};requireThat(entry.text.length<=4000,'Keep your entry under 4,000 characters.');s.entries.push(entry);return entry.id;
}

function participationGuard(s,r,actor,p,kind){
  const person=find(s.people,actor), initiative=initiativeOfResource(s,r.id,r.initiativeId);
  requireThat(person.status==='Active'&&person.verified,'An active verified identity is required.');
  requireThat(!r.initiativeId||initiative?.id===r.initiativeId,'This resource has a conflicting Initiative scope.');
  if(initiative){
    requireThat(institutionApproved(s,initiative.ownerId),'This resource needs an active approved Institution and Initiative.');
    requireThat(!r.ownerId||r.ownerId===initiative.ownerId,'This resource belongs to another Institution.');
    requireThat(initiative.status==='Published'||kind==='form'&&initiative.status==='Completed','This Initiative is not accepting participation.');
    const registration=kind==='form'&&/registration/i.test(r.purpose||'');
    const admission=s.admissions.find(a=>a.initiativeId===initiative.id&&a.personId===actor&&(['Accepted',...(kind==='form'?['Completed']:[]),...(registration?['Pending','Queued','Offered']:[])].includes(a.status)));
    requireThat(admission,registration?'Apply to this initiative first.':'This resource is for accepted participants of this initiative.');
    requireThat(admission.consent?.at&&admission.consent.version,'Participation consent is required.');
  }else{
    // The existing builder also publishes independent Institution resources.
    // They have no admission parent; publication admits active verified participants.
    requireThat(!r.initiativeId&&institutionApproved(s,r.ownerId),'This resource needs an active approved Institution and Initiative.');
  }
  if(p.version!==undefined)requireThat(Number(p.version)===Number(r.version||1),'This resource changed. Reload before responding.');
  const day=clockDay(s),open=r.open||r.registrationOpen,close=r.deadline||r.close||r.registrationClose;
  requireThat(!open||day>=open,'This resource is not open yet.');requireThat(!close||day<=close,'The submission deadline has passed.');
  if(kind==='competition'||r.consentRequired)requireThat(p.consent===true,'Confirm the resource consent before continuing.');
}
