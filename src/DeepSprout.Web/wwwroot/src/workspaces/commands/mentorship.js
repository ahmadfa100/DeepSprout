import {assignmentDefinition} from '../activity-contract.js';
import {taskBlockReason,institutionApproved,id,now,nowMs,clockDay,requireThat,find,textRequired,numberIn,dates,ownGroup,ownProgram,reward,audit,notify} from '../domain.js';
import {isActiveCoach,practiceTypeOf} from '../initiative-rules.js';
import {requireIndependentCoach,isProgramGroup,programOf,programGroups,syncProgramGroups,normalizeProgram,invitationStatus,completionStatus,programMetrics,isEmail,PROGRAM_BUILDABLE,DEFAULT_COMPLETION} from '../coach-rules.js';

/**
 * One assignment engine for both parents (master §13.1): an independent
 * Coach Program group (owner must hold independent Coach approval), or an
 * Institution Initiative group whose current Coach holds an active Initiative
 * grant. The two authorities are checked separately and never substitute for
 * each other.
 */
export function groupAuthority(s,actor,groupId){
  const g=find(s.groups,groupId);
  if(g.parentType==='initiative'){const i=find(s.initiatives,g.initiativeId);requireThat(i.status==='Published'&&institutionApproved(s,i.ownerId),'This Initiative or Institution is not active.');requireThat(g.coachId===actor&&isActiveCoach(s,g.initiativeId,actor),'Only the Coach currently assigned to this Initiative group can do this.');return g;}
  requireIndependentCoach(s,actor);
  return ownGroup(s,actor,groupId);
}
const memberOK=(s,g,actor)=>{if(!g.memberIds.includes(actor))return false;if(g.parentType!=='initiative')return true;const a=s.admissions?.find(x=>x.initiativeId===g.initiativeId&&x.personId===actor);return a?.status==='Accepted';};
/** A Program group's work is open while its Program is Published or Paused and the group is not closed. */
function programWorkOpen(s,g){
  if(!isProgramGroup(g))return;
  requireIndependentCoach(s,g.ownerId);
  const pr=programOf(s,g);
  requireThat(pr&&['Published','Paused'].includes(pr.status),'This Program is not running, so this task cannot change.');
  requireThat(!['Archived','Completed','Closed'].includes(g.status),'This group has ended. Your earlier work stays in your history.');
}
/** Where a person reads their tasks: the regular Individual Activities page, or the limited Student workspace. */
const taskLink=(s,pid,assignmentId)=>s.people.find(p=>p.id===pid)?.individual?'src/pages/member/training/training.html#assigned':`workspaces.html#/student/tasks${assignmentId?`/${assignmentId}`:''}`;
const recipients=(g,a)=>a.studentId?[a.studentId]:g.memberIds;

export function startTask(s,p,actor){const a=find(s.assignments,p.id),g=find(s.groups,a.groupId);requireThat(a.status==='Active'&&memberOK(s,g,actor)&&(!a.studentId||a.studentId===actor),'This task is outside your membership.');programWorkOpen(s,g);requireThat(!taskBlockReason(s,a,g,actor),taskBlockReason(s,a,g,actor));s.taskDrafts[`${actor}:${a.id}`]={status:'In Progress',text:s.taskDrafts[`${actor}:${a.id}`]?.text||'',started:now()};}
export function submitTask(s,p,actor){
  const a=find(s.assignments,p.assignmentId),g=find(s.groups,a.groupId);
  requireThat(g.status!=='Archived'&&a.status==='Active'&&memberOK(s,g,actor)&&(!a.studentId||a.studentId===actor),'This task is no longer assigned to you.');
  programWorkOpen(s,g);
  requireThat(!taskBlockReason(s,a,g,actor),taskBlockReason(s,a,g,actor));
  const existing=s.submissions.find(x=>x.assignmentId===a.id&&x.studentId===actor);
  requireThat(!existing||['Needs Revision','Rejected'].includes(existing.status),'This task is already submitted.');
  const text=textRequired(p.text,'Your reflection');
  if(existing){existing.history.push({text:existing.text,status:existing.status,feedback:existing.feedback,created:existing.submitted,attempt:existing.attempt||1,assignmentVersion:existing.assignmentVersion||1,activityReference:structuredClone(existing.activityReference||null),instructionsSnapshot:existing.instructionsSnapshot||a.instructions});Object.assign(existing,{text,file:p.file||'',status:'Submitted',submitted:now(),attempt:(existing.attempt||1)+1,assignmentVersion:a.version||1,activityReference:structuredClone(a.definitionSnapshot||null),instructionsSnapshot:a.instructions});}
  else s.submissions.push({id:id('submission'),assignmentId:a.id,studentId:actor,text,file:p.file||'',status:'Submitted',submitted:now(),feedback:'',history:[],attempt:1,assignmentVersion:a.version||1,activityReference:structuredClone(a.definitionSnapshot||null),instructionsSnapshot:a.instructions});
  delete s.taskDrafts[`${actor}:${a.id}`];
  const reviewer=g.parentType==='initiative'?g.coachId:(g.ownerId||a.ownerId);
  if(reviewer)notify(s,reviewer,`New submission for “${a.title}”.`,'workspaces.html#/mentor/reviews','review');
}

/** Accept a valid invitation for an already verified person (shared by OTP join and signed-in accept). */
export function acceptInvitation(s,inv,pp){
  const g=find(s.groups,inv.groupId);
  requireThat(!g.memberIds.includes(pp.id),'You have already joined this group.');
  requireThat(!(s.memberships||[]).some(m=>m.groupId===g.id&&m.personId===pp.id&&m.status==='Pending'),'Your place is already awaiting Coach approval.');
  requireThat(pp.status==='Active','This demo identity is suspended.');
  if(!pp.workspaces.includes('student'))pp.workspaces.push('student');
  pp.verified=true;
  const pending=Boolean(g.approval);
  s.memberships.push({id:id('membership'),groupId:g.id,programId:g.programId||null,personId:pp.id,status:pending?'Pending':'Active',inviteId:inv.id,created:now(),history:[{at:now(),actorId:pp.id,change:pending?'Accepted invitation · awaiting Coach approval':'Accepted invitation · joined'}]});
  if(!pending)g.memberIds.push(pp.id);
  inv.uses++;
  if(inv.email){inv.status='Accepted';inv.acceptedBy=pp.id;inv.acceptedAt=now();}
  (inv.history||=[]).push({at:now(),actorId:pp.id,change:pending?'Accepted · awaiting approval':'Accepted'});
  const coach=g.ownerId;
  notify(s,coach,`${pp.name} ${pending?'asked to join':'joined'} “${g.name}”.`,`workspaces.html#/mentor/groups/${g.id}?tab=members`,'membership');
  return g;
}

/** Materialize one task per Program stage × selected activity for one group, exactly once per key. */
function materialize(s,pr,g){
  if(pr.status!=='Published')return 0;
  let created=0;
  for(const stage of pr.stages)for(const activity of pr.activities){
    const key=`${pr.id}:${stage.id}:${activity}:${g.id}`;
    if(s.assignments.some(a=>a.sourceKey===key))continue;
    s.assignments.push({id:id('assignment'),ownerId:pr.ownerId,groupId:g.id,programId:pr.id,stageId:stage.id,sourceKey:key,recipientIds:[...g.memberIds],title:`${stage.title} · ${activity}`,...(pr.activityDefinitions?.find(d=>d.title===activity)?.reference||assignmentDefinition(s,activity)),activity,practiceType:practiceTypeOf(activity),instructions:stage.objective,evidence:'Written reflection; self-reported until Coach review.',start:pr.start,due:stage.date,required:pr.required!==false,review:pr.review||'Coach review',status:'Active',version:1,programVersion:pr.version,created:now(),history:[]});
    created++;
  }
  if(created)for(const pid of g.memberIds)notify(s,pid,`${created} new task(s) in “${pr.title}”.`,taskLink(s,pid,''),'task');
  return created;
}
const history=(record,actor,change,extra={})=>{(record.history||=[]).push({at:now(),actorId:actor,change,...extra});};
const PROGRAM_FIELDS=['title','description','purpose','focus','duration','audience','eligibility','start','end','stages','activities','required','review','consentPolicy','invitationPolicy','completion'];
function programRecord(p){
  const r={};for(const key of PROGRAM_FIELDS)if(p[key]!==undefined)r[key]=p[key];
  r.title=textRequired(p.title,'Program title');
  if(r.duration!==undefined)r.duration=Number(r.duration)||0;
  if(r.completion){const percent=Number(r.completion.percent);r.completion={rule:r.completion.rule==='percent-required'?'percent-required':'all-required',percent:r.completion.rule==='percent-required'?numberIn(percent,1,100,'Completion share'):100};}
  if(r.invitationPolicy)r.invitationPolicy={expiryDays:numberIn(r.invitationPolicy.expiryDays??14,1,90,'Invitation expiry (days)')};
  return r;
}
function createGroup(s,actor,pr,p){
  const capacity=numberIn(p.capacity??12,1,500,'Capacity');
  const g={id:id('group'),ownerId:actor,parentType:'program',programId:pr.id,name:textRequired(p.name,'Group name'),purpose:textRequired(p.purpose||pr.purpose||'',`Purpose of ${p.name||'the group'}`),description:p.description||'',capacity,enrollment:p.enrollment||'Invitation',approval:!!p.approval,memberIds:[],status:'Open',created:clockDay(s),history:[{at:now(),actorId:actor,change:`Created under Program “${pr.title}”`}]};
  s.groups.push(g);return g;
}
const EMAIL_DAYS=days=>days*86400000;

export function mentorshipCommand(s,action,p,actor) {
  /* ---------------------------------------------------------- groups */
  if(action==='mentor.group.save') {
    requireIndependentCoach(s,actor);
    const old=p.id?ownGroup(s,actor,p.id):null;
    requireThat(!old||isProgramGroup(old),'Institution groups are managed by the Institution.');
    const pr=ownProgram(s,actor,textRequired(p.programId||'','Parent Program'));
    requireThat(PROGRAM_BUILDABLE.includes(pr.status),'Choose one of your Draft, Published or Paused Programs as the parent.');
    if(!old){const g=createGroup(s,actor,pr,p);syncProgramGroups(s);materialize(s,pr,g);return g.id;}
    const capacity=numberIn(p.capacity,1,500,'Capacity');requireThat(capacity>=old.memberIds.length,'Capacity cannot be below the current membership.');
    const moved=Boolean(old.programId)&&old.programId!==pr.id,attached=old.programId!==pr.id;
    if(moved){
      requireThat(!s.assignments.some(a=>a.groupId===old.id&&s.submissions.some(x=>x.assignmentId===a.id)),'This group already has submitted work under its Program, so it cannot move to another Program.');
      for(const a of s.assignments.filter(a=>a.groupId===old.id&&a.status==='Active'&&a.programId&&a.programId!==pr.id)){a.status='Cancelled';a.cancelReason='Group moved to another Program';a.cancelledAt=now();}
    }
    Object.assign(old,{name:textRequired(p.name,'Group name'),purpose:textRequired(p.purpose,'Purpose'),description:p.description||'',capacity,enrollment:p.enrollment||'Invitation',approval:!!p.approval,programId:pr.id,parentType:'program'});
    history(old,actor,attached?`Attached to Program “${pr.title}”`:'Details updated');
    syncProgramGroups(s);if(attached)materialize(s,pr,old);
    return old.id;
  }
  if(action==='mentor.group.archive') {
    requireIndependentCoach(s,actor);const g=ownGroup(s,actor,p.id);requireThat(g.status!=='Archived','This group is already archived.');
    g.status='Archived';history(g,actor,'Archived',{reason:p.reason||''});
    for(const inv of s.invitations.filter(i=>i.groupId===g.id&&invitationStatus(s,i)==='Active')){inv.status='Revoked';history(inv,actor,'Revoked · group archived');}
    return;
  }
  if(action==='mentor.member.remove') {
    requireIndependentCoach(s,actor);const g=ownGroup(s,actor,p.groupId);requireThat(g.memberIds.includes(p.personId),'This person is not a current member.');
    for(const a of s.assignments.filter(a=>a.groupId===g.id&&(!a.studentId||a.studentId===p.personId))){a.recipientIds=[...new Set([...(a.recipientIds||[]),p.personId])];}
    g.memberIds=g.memberIds.filter(x=>x!==p.personId);
    const m=s.memberships.find(x=>x.groupId===g.id&&x.personId===p.personId&&['Active','Approved'].includes(x.status));
    if(m){m.status='Removed';history(m,actor,'Removed by Coach',{reason:p.reason||''});}else s.memberships.push({id:id('membership'),groupId:g.id,programId:g.programId||null,personId:p.personId,status:'Removed',created:now(),history:[{at:now(),actorId:actor,change:'Removed by Coach',reason:p.reason||''}]});
    history(g,actor,'Member removed');notify(s,p.personId,`You are no longer a member of “${g.name}”. Your submitted work and reviews stay in your history.`,'','membership');
    return;
  }
  if(action==='mentor.member.approve'||action==='mentor.member.decline') {
    requireIndependentCoach(s,actor);const m=find(s.memberships,p.id),g=ownGroup(s,actor,m.groupId);requireThat(m.status==='Pending','This request has already been decided.');
    if(action==='mentor.member.approve'){requireThat(g.memberIds.length<g.capacity,'This group is full.');m.status='Approved';if(!g.memberIds.includes(m.personId))g.memberIds.push(m.personId);history(m,actor,'Approved by Coach');notify(s,m.personId,`Welcome to “${g.name}”. Your Coach approved your place.`,taskLink(s,m.personId,''),'membership');}
    else{m.status='Declined';history(m,actor,'Declined by Coach',{reason:p.reason||''});notify(s,m.personId,`Your request to join “${g.name}” was not approved.`,'','membership');}
    return;
  }

  /* ----------------------------------------------------- invitations */
  if(action==='mentor.invite.create') {
    requireIndependentCoach(s,actor);const g=ownGroup(s,actor,p.groupId);
    requireThat(isProgramGroup(g)&&g.programId,'Attach this group to one of your Programs first.');
    const pr=find(s.programs,g.programId);
    requireThat(pr.status==='Published','Publish the Program before inviting students. Publishing never admits anyone by itself.');
    requireThat(g.status==='Open','Open the group before inviting participants.');
    const email=textRequired(p.email||'','Recipient email').toLowerCase();requireThat(isEmail(email),'Enter a valid recipient email.');
    requireThat(!s.invitations.some(i=>i.groupId===g.id&&(i.email||'').toLowerCase()===email&&invitationStatus(s,i)==='Active'),'An active invitation already exists for this email. Resend it instead.');
    const existing=s.people.find(x=>x.email.toLowerCase()===email);
    requireThat(!existing||!g.memberIds.includes(existing.id),'This person is already a member of the group.');
    const expires=p.expires?new Date(p.expires+'T23:59:00+03:00').toISOString():new Date(nowMs(s)+EMAIL_DAYS(pr.invitationPolicy?.expiryDays||14)).toISOString();
    requireThat(Date.parse(expires)>nowMs(s),'Choose a future expiry date.');
    const invite={id:id('invite'),token:id('join'),groupId:g.id,programId:pr.id,email,expires,limit:1,uses:0,status:'Active',invitedBy:actor,created:now(),history:[{at:now(),actorId:actor,change:'Created · copyable demo link (no email is sent)'}]};
    s.invitations.push(invite);
    if(existing)notify(s,existing.id,`${s.people.find(x=>x.id===actor)?.name||'A Coach'} invited you to “${g.name}” (${pr.title}).`,`workspaces.html#/join/${invite.token}`,'invitation');
    return invite.token;
  }
  if(action==='mentor.invite.resend') {
    requireIndependentCoach(s,actor);const old=find(s.invitations,p.id),g=ownGroup(s,actor,old.groupId),pr=find(s.programs,g.programId);
    requireThat(['Active','Expired'].includes(invitationStatus(s,old)),'Only an active or expired invitation can be resent.');
    requireThat(pr.status==='Published'&&g.status==='Open','The Program and group must be open to resend.');
    old.status='Replaced';history(old,actor,'Replaced by a resent invitation');
    const invite={...structuredClone(old),id:id('invite'),token:id('join'),uses:0,status:'Active',created:now(),expires:new Date(nowMs(s)+EMAIL_DAYS(pr.invitationPolicy?.expiryDays||14)).toISOString(),replaces:old.id,history:[{at:now(),actorId:actor,change:'Resent · new link, earlier link no longer works'}]};
    delete invite.acceptedBy;s.invitations.push(invite);return invite.token;
  }
  if(action==='mentor.invite.revoke') {
    const i=find(s.invitations,p.id),g=find(s.groups,i.groupId);requireIndependentCoach(s,actor);ownGroup(s,actor,g.id);
    requireThat(['Active','Expired','Exhausted'].includes(invitationStatus(s,i)),'This invitation is no longer active.');
    i.status='Revoked';i.revokedAt=now();history(i,actor,'Revoked',{reason:p.reason||''});return;
  }

  /* -------------------------------------------------------- programs */
  if(action==='mentor.program.save') {
    requireIndependentCoach(s,actor);
    const old=p.id?ownProgram(s,actor,p.id):null;requireThat(!old||old.status==='Draft','Use “Edit future details” to change a published Program.');
    const record=programRecord(p);
    let pr;
    if(old){Object.assign(old,record);normalizeProgram(old);history(old,actor,'Draft saved');pr=old;}
    else{pr=normalizeProgram({...record,id:id('program'),ownerId:actor,status:'Draft',version:1,created:now(),history:[{at:now(),actorId:actor,change:'Draft created'}]});s.programs.push(pr);}
    for(const ng of (p.newGroups||[]).filter(x=>x&&String(x.name||'').trim()))createGroup(s,actor,pr,ng);
    syncProgramGroups(s);
    return pr.id;
  }
  if(action==='mentor.program.publish') {
    requireIndependentCoach(s,actor);
    const pr=ownProgram(s,actor,p.id);requireThat(pr.status==='Draft','Only a draft can be published.');dates(pr.start,pr.end);
    requireThat(pr.stages.length&&pr.activities.length,'Add a stage and an activity before publishing.');
    requireThat(pr.stages.every(x=>x.title?.trim()&&x.objective?.trim()&&x.date>=pr.start&&x.date<=pr.end),'Each stage needs a title, objective and date within the program.');
    requireThat(pr.activities.every(t=>s.activityCatalog.some(c=>c.title===t&&c.status==='Published')),'Choose only approved, published activities.');
    pr.status='Published';pr.publishedAt=now();history(pr,actor,'Published',{version:pr.version});(pr.history.at(-1)).published=now();
    pr.activityDefinitions ||= pr.activities.map(title=>({title,reference:assignmentDefinition(s,title)}));
    for(const g of programGroups(s,pr)){if(g.status==='Draft')g.status='Open';materialize(s,pr,g);}
    return;
  }
  if(action==='mentor.program.update') {
    requireIndependentCoach(s,actor);
    const pr=ownProgram(s,actor,p.id);requireThat(['Published','Paused'].includes(pr.status),'Only a running Program has future details to edit.');
    const before={},changed=[];
    for(const key of ['description','purpose','audience','eligibility','consentPolicy'])if(p[key]!==undefined&&String(p[key])!==String(pr[key]??'')){before[key]=pr[key]??'';pr[key]=String(p[key]);changed.push(key);}
    if(p.end&&p.end!==pr.end){requireThat(p.end>=pr.end&&p.end>=clockDay(s),'The end date can only move later, and not into the past.');before.end=pr.end;pr.end=p.end;changed.push('end');}
    const added=[];
    for(const st of (p.newStages||[]).filter(x=>x&&String(x.title||'').trim())){
      requireThat(st.objective?.trim()&&st.date>=clockDay(s)&&st.date<=pr.end,'A new stage needs an objective and a future date within the Program.');
      const stage={id:id('stage'),title:st.title.trim(),objective:st.objective.trim(),date:st.date,addedInVersion:pr.version+1};pr.stages.push(stage);added.push(stage.title);
    }
    requireThat(changed.length||added.length,'Nothing changed.');
    pr.version++;history(pr,actor,'Future details updated',{version:pr.version,fields:changed,stagesAdded:added,before});
    if(added.length&&pr.status==='Published')for(const g of programGroups(s,pr))materialize(s,pr,g);
    return pr.version;
  }
  if(action==='mentor.program.pause'||action==='mentor.program.resume') {
    requireIndependentCoach(s,actor);const pr=ownProgram(s,actor,p.id);
    if(action==='mentor.program.pause'){requireThat(pr.status==='Published','Only a published Program can be paused.');pr.status='Paused';history(pr,actor,'Paused',{reason:textRequired(p.reason||'','Pause reason')});}
    else{requireThat(pr.status==='Paused','Only a paused Program can resume.');pr.status='Published';history(pr,actor,'Resumed');for(const g of programGroups(s,pr))materialize(s,pr,g);}
    for(const g of programGroups(s,pr))for(const pid of g.memberIds)notify(s,pid,`“${pr.title}” was ${pr.status==='Paused'?'paused by your Coach. No new tasks or invitations until it resumes.':'resumed by your Coach.'}`,taskLink(s,pid,''),'program');
    return;
  }
  if(action==='mentor.program.complete') {
    requireIndependentCoach(s,actor);const pr=ownProgram(s,actor,p.id);requireThat(['Published','Paused'].includes(pr.status),'Only a published or paused Program can be completed.');
    const groups=programGroups(s,pr);
    const waiting=s.submissions.filter(x=>x.status==='Submitted'&&s.assignments.some(a=>a.id===x.assignmentId&&groups.some(g=>g.id===a.groupId)));
    requireThat(!waiting.length,`Review the ${waiting.length} submission(s) still awaiting review before finalizing completion.`);
    let done=0,total=0;
    for(const g of groups)for(const pid of g.memberIds){
      total++;
      if(s.programCompletions.some(c=>c.programId===pr.id&&c.groupId===g.id&&c.personId===pid))continue;
      const st=completionStatus(s,pr,g,pid);if(st.eligible)done++;
      s.programCompletions.push({id:id('completion'),programId:pr.id,groupId:g.id,personId:pid,status:st.eligible?'Completed':'Not completed',approved:st.approved,required:st.required,needed:st.needed,rule:{...(pr.completion||DEFAULT_COMPLETION)},programVersion:pr.version,decidedBy:actor,at:now()});
      notify(s,pid,`“${pr.title}” is complete. Your status: ${st.eligible?'Completed':'Not completed'} (${st.approved}/${st.required} required tasks approved).`,s.people.find(x=>x.id===pid)?.individual?'src/pages/member/insights/insights.html#beyond':'workspaces.html#/student/progress','program');
    }
    for(const g of groups){if(g.status!=='Archived')g.status='Completed';history(g,actor,'Program completed');for(const inv of s.invitations.filter(i=>i.groupId===g.id&&invitationStatus(s,i)==='Active')){inv.status='Revoked';history(inv,actor,'Revoked · Program completed');}}
    pr.status='Completed';pr.completedAt=now();history(pr,actor,'Completed',{summary:`${done} of ${total} student(s) met the completion rule`});
    return {completed:done,total};
  }
  if(action==='mentor.program.cancel') {
    requireIndependentCoach(s,actor);const pr=ownProgram(s,actor,p.id);requireThat(['Draft','Published','Paused'].includes(pr.status),'This Program has already ended.');
    const reason=textRequired(p.reason||'','Cancellation reason');
    for(const g of programGroups(s,pr)){
      for(const a of s.assignments.filter(a=>a.groupId===g.id&&a.status==='Active')){a.status='Cancelled';a.cancelReason=`Program cancelled: ${reason}`;a.cancelledAt=now();}
      for(const inv of s.invitations.filter(i=>i.groupId===g.id&&invitationStatus(s,i)==='Active')){inv.status='Revoked';history(inv,actor,'Revoked · Program cancelled');}
      if(g.status!=='Archived')g.status='Closed';history(g,actor,'Program cancelled',{reason});
      for(const pid of g.memberIds)notify(s,pid,`“${pr.title}” was cancelled by your Coach. Reason: ${reason}. Your submitted work stays in your history.`,taskLink(s,pid,''),'program');
    }
    pr.status='Cancelled';pr.cancelReason=reason;pr.cancelledAt=now();history(pr,actor,'Cancelled',{reason});
    return;
  }
  if(action==='mentor.program.archive') {
    requireIndependentCoach(s,actor);const pr=ownProgram(s,actor,p.id);requireThat(['Draft','Completed','Cancelled'].includes(pr.status),'Complete or cancel a running Program before archiving it.');
    for(const g of programGroups(s,pr)){g.status='Archived';history(g,actor,'Archived with its Program');}
    pr.previousStatus=pr.status;pr.status='Archived';pr.archivedAt=now();history(pr,actor,'Archived');return;
  }
  if(action==='mentor.program.duplicate') {
    requireIndependentCoach(s,actor);const pr=ownProgram(s,actor,p.id);
    const copy=structuredClone(pr);
    Object.assign(copy,{id:id('program'),title:`${pr.title} · revision`,status:'Draft',version:pr.version+1,groupIds:[],revisionOf:pr.id,created:now(),history:[{at:now(),actorId:actor,change:`Draft revision of “${pr.title}” · groups stay with the original Program`}]});
    for(const key of ['publishedAt','completedAt','cancelledAt','cancelReason','archivedAt','previousStatus'])delete copy[key];
    delete copy.activityDefinitions;
    copy.stages=copy.stages.map(st=>({...st,id:id('stage')}));
    s.programs.push(copy);return copy.id;
  }

  /* ------------------------------------------------------ assignments */
  if(action==='mentor.assignment.create') {
    const g=groupAuthority(s,actor,p.groupId);
    requireThat(!['Archived','Completed','Closed'].includes(g.status),'Archived groups cannot receive assignments.');
    if(isProgramGroup(g)){requireThat(g.programId,'Attach this group to one of your Programs first.');requireThat(find(s.programs,g.programId).status==='Published','Assign work only while the Program is published (not draft, paused, completed or cancelled).');}
    requireThat(s.activityCatalog.some(x=>x.title===p.activity&&x.status==='Published'),'Choose a published activity.');
    if(p.studentId)requireThat(g.memberIds.includes(p.studentId),'Choose a current member of this group.');
    if(p.start&&p.due)requireThat(p.due>=p.start,'The due date must follow the start date.');
    const record={id:id('assignment'),ownerId:actor,groupId:g.id,studentId:p.studentId||null,
      initiativeId:g.parentType==='initiative'?g.initiativeId:p.initiativeId||null,programId:isProgramGroup(g)?g.programId:p.programId||null,
      ...assignmentDefinition(s,p.activity),activity:p.activity,practiceType:practiceTypeOf(p.activity),title:textRequired(p.title,'Title'),instructions:textRequired(p.instructions,'Instructions'),
      evidence:p.evidence||'',start:p.start||'',due:textRequired(p.due,'Due date'),required:p.required!==false,review:p.review||'Coach review',
      status:'Active',recipientIds:p.studentId?[p.studentId]:[...g.memberIds],created:now(),version:1,history:[]};
    s.assignments.push(record);
    for(const pid of recipients(g,record))notify(s,pid,`New task: ${record.title} · due ${record.due}.`,taskLink(s,pid,record.id),'task');
    return record.id;
  }
  if(action==='mentor.assignment.reschedule') {
    const a=find(s.assignments,p.id),g=groupAuthority(s,actor,a.groupId);programWorkOpen(s,g);requireThat(a.status==='Active','Only an active task can be rescheduled.');
    const due=textRequired(p.due||'','New due date');requireThat(due>=clockDay(s),'Choose a due date from today onward.');if(a.start)requireThat(due>=a.start,'The due date must follow the start date.');
    const reason=textRequired(p.reason||'','Reason');
    a.history.push({version:a.version||1,due:a.due,at:now(),actorId:actor,change:`Rescheduled to ${due}`,reason});a.version=(a.version||1)+1;a.due=due;
    for(const pid of recipients(g,a).filter(pid=>!s.submissions.some(x=>x.assignmentId===a.id&&x.studentId===pid&&x.status==='Approved')))notify(s,pid,`“${a.title}” is now due ${due}. Reason: ${reason}`,taskLink(s,pid,a.id),'task');
    return a.version;
  }
  if(action==='mentor.assignment.cancel') {
    const a=find(s.assignments,p.id),g=groupAuthority(s,actor,a.groupId);
    programWorkOpen(s,g);
    const reason=textRequired(p.reason,'Cancellation reason');
    requireThat(a.status==='Active','This task is no longer active.');
    a.status='Cancelled';a.cancelReason=reason;a.cancelledAt=now();(a.history||=[]).push({version:a.version||1,at:now(),actorId:actor,change:'Cancelled',reason:p.reason||''});
    for(const pid of recipients(g,a).filter(pid=>!s.submissions.some(x=>x.assignmentId===a.id&&x.studentId===pid&&x.status==='Approved')))notify(s,pid,`“${a.title}” was cancelled.${p.reason?` Reason: ${p.reason}`:''} Earlier work stays in your history.`,taskLink(s,pid,a.id),'task');
    return;
  }

  /* ---------------------------------------------------------- reviews */
  if(action==='mentor.review') {
    const sub=find(s.submissions,p.id),a=find(s.assignments,sub.assignmentId),g=find(s.groups,a.groupId);
    requireThat((g.parentType==='initiative'?g.coachId:g.ownerId)===actor,'This review is outside your groups.');
    groupAuthority(s,actor,g.id);
    requireThat(!taskBlockReason(s,a,g,sub.studentId,{window:false}),taskBlockReason(s,a,g,sub.studentId,{window:false}));
    requireThat(sub.status==='Submitted','This submission has already been reviewed.');
    requireThat(['Approved','Needs Revision','Rejected'].includes(p.decision),'Choose a review decision.');
    if(p.decision!=='Approved')textRequired(p.feedback,'Feedback');
    sub.status=p.decision;sub.feedback=p.feedback||'Your work has been approved. Thank you for taking this small step.';sub.internalNote=String(p.internalNote||'').trim();sub.reviewedBy=actor;sub.reviewedAt=now();
    sub.history.push({decision:p.decision,feedback:sub.feedback,internalNote:sub.internalNote,actorId:actor,created:now(),attempt:sub.attempt||1,assignmentVersion:sub.assignmentVersion||a.version||1});
    if(p.decision==='Approved')reward(s,sub.id,sub.studentId,a.groupId,a.title,g.parentType==='initiative'?'Coach-reviewed Initiative task':'Coach-reviewed Program task',g.parentType==='initiative'?{initiativeId:g.initiativeId}:{programId:g.programId||null});
    notify(s,sub.studentId,`${a.title}: ${p.decision}.`,taskLink(s,sub.studentId,a.id),'review');
    audit(s,actor,p.decision,a.title,sub.feedback);return;
  }

  /* ---------------------------------------------------------- reports */
  if(action==='mentor.report.save') {
    requireIndependentCoach(s,actor);const pr=ownProgram(s,actor,p.programId);
    const groupId=p.groupId||'';if(groupId)requireThat(programGroups(s,pr).some(g=>g.id===groupId),'Choose a group of this Program.');
    requireThat(p.from&&p.to&&p.to>=p.from,'Choose a reporting period with the end on or after the start.');
    if(p.submit)textRequired(p.observations||'','Observations');
    const metrics=programMetrics(s,pr,{groupId,from:p.from,to:p.to});delete metrics.trend;
    const old=p.id?find(s.coachReports,p.id):null;
    const record={parentType:'program',programId:pr.id,groupId:groupId||null,authorId:actor,period:{from:p.from,to:p.to},metrics,observations:String(p.observations||'').trim(),concerns:String(p.concerns||'').trim(),recommendations:String(p.recommendations||'').trim(),status:p.submit?'Submitted':'Draft',updated:now()};
    if(p.submit)record.submitted=now();
    if(old){requireThat(old.authorId===actor&&old.status==='Draft','A finalized report is read-only.');Object.assign(old,record);return old.id;}
    const r={id:id('creport'),created:now(),...record};s.coachReports.push(r);return r.id;
  }

  /* --------------------------------------- optional Initiative link */
  if(action==='mentor.program.link.propose') {
    requireIndependentCoach(s,actor);const pr=ownProgram(s,actor,p.programId);requireThat(['Published','Paused'].includes(pr.status),'Only a running Program can be linked.');
    const i=find(s.initiatives,p.initiativeId);requireThat(['Published','Active'].includes(i.status),'Choose a published Initiative.');
    requireThat(!s.programLinks.some(l=>l.programId===pr.id&&l.initiativeId===i.id&&['Proposed','Active'].includes(l.status)),'This Program already has a proposed or active link to that Initiative.');
    const link={id:id('plink'),programId:pr.id,initiativeId:i.id,institutionId:i.ownerId,coachId:actor,status:'Proposed',shares:'Aggregate counts only: students, tasks, submissions, approvals and completion. No names, submitted text, feedback or private data.',note:String(p.note||'').trim(),created:now(),history:[{at:now(),actorId:actor,change:'Proposed by Coach'}]};
    s.programLinks.push(link);
    for(const pid of s.organizations.find(o=>o.id===i.ownerId)?.memberIds||[])notify(s,pid,`A Coach proposed linking the Program “${pr.title}” to ${i.title}.`,'workspaces.html#/organization/partners','partnership');
    return link.id;
  }
  if(action==='mentor.program.link.end') {
    requireIndependentCoach(s,actor);const l=find(s.programLinks,p.id);requireThat(l.coachId===actor,'This link belongs to another Coach.');requireThat(['Proposed','Active'].includes(l.status),'This link has already ended.');
    l.status='Ended';history(l,actor,'Ended by Coach',{reason:p.reason||''});return;
  }
  if(action==='organization.program.link.decide') {
    const l=find(s.programLinks,p.id),org=s.organizations.find(o=>o.memberIds.includes(actor));
    requireThat(org&&l.institutionId===org.id,'This link belongs to another Institution.');
    if(p.decision==='End'){requireThat(['Proposed','Active'].includes(l.status),'This link has already ended.');l.status='Ended';history(l,actor,'Ended by Institution',{reason:p.reason||''});notify(s,l.coachId,'An Institution ended the link to your Program. Your Program, groups and records are unchanged.','workspaces.html#/mentor/programs','partnership');return;}
    requireThat(l.status==='Proposed','This link has already been decided.');requireThat(['Active','Declined'].includes(p.decision),'Choose Accept or Decline.');
    l.status=p.decision;history(l,actor,p.decision==='Active'?'Accepted by Institution':'Declined by Institution',{reason:p.reason||''});
    notify(s,l.coachId,`Your Program link was ${p.decision==='Active'?'accepted':'declined'}. Ownership and records stay with you.`,`workspaces.html#/mentor/programs/${l.programId}?tab=link`,'partnership');
    return;
  }

  if(action==='student.task.start') {startTask(s,p,actor);return;}
  if(action==='student.submit') {submitTask(s,p,actor);return;}
  return false;
}
