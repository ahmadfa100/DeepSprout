import {id,now,nowMs,requireThat,find,textRequired,numberIn,dates,ownGroup,ownProgram,reward,audit,notify} from '../domain.js';
import {isActiveCoach,practiceTypeOf} from '../initiative-rules.js';
/**
 * One assignment engine for both parents (master §13.1): an independent
 * Coach-owned group, or an Institution Initiative group whose current Coach
 * holds an active Initiative grant.
 */
export function groupAuthority(s,actor,groupId){
  const g=find(s.groups,groupId);
  if(g.parentType==='initiative'){requireThat(g.coachId===actor&&isActiveCoach(s,g.initiativeId,actor),'Only the Coach currently assigned to this Initiative group can do this.');return g;}
  return ownGroup(s,actor,groupId);
}
const memberOK=(s,g,actor)=>{if(!g.memberIds.includes(actor))return false;if(g.parentType!=='initiative')return true;const a=s.admissions?.find(x=>x.initiativeId===g.initiativeId&&x.personId===actor);return a?.status==='Accepted';};
export function startTask(s,p,actor){const a=find(s.assignments,p.id),g=find(s.groups,a.groupId);requireThat(a.status==='Active'&&memberOK(s,g,actor)&&(!a.studentId||a.studentId===actor),'This task is outside your membership.');s.taskDrafts[`${actor}:${a.id}`]={status:'In Progress',text:s.taskDrafts[`${actor}:${a.id}`]?.text||'',started:now()};}
export function submitTask(s,p,actor){const a=find(s.assignments,p.assignmentId),g=find(s.groups,a.groupId);requireThat(g.status!=='Archived'&&a.status==='Active'&&memberOK(s,g,actor)&&(!a.studentId||a.studentId===actor),'This task is no longer assigned to you.');const existing=s.submissions.find(x=>x.assignmentId===a.id&&x.studentId===actor);requireThat(!existing||['Needs Revision','Rejected'].includes(existing.status),'This task is already submitted.');const text=textRequired(p.text,'Your reflection');if(existing){existing.history.push({text:existing.text,status:existing.status,feedback:existing.feedback,created:existing.submitted});Object.assign(existing,{text,file:p.file||'',status:'Submitted',submitted:now(),attempt:(existing.attempt||1)+1});}else s.submissions.push({id:id('submission'),assignmentId:a.id,studentId:actor,text,file:p.file||'',status:'Submitted',submitted:now(),feedback:'',history:[],attempt:1});delete s.taskDrafts[`${actor}:${a.id}`];const reviewer=g.parentType==='initiative'?g.coachId:a.ownerId;if(reviewer)notify(s,reviewer,`New submission for “${a.title}”.`,'workspaces.html#/mentor/reviews','review');}
export function mentorshipCommand(s,action,p,actor) {
  if(action==='mentor.group.save') {
    const old=p.id?ownGroup(s,actor,p.id):null;
    const capacity=numberIn(p.capacity,1,200,'Capacity');requireThat(capacity>=(old?.memberIds.length||0),'Capacity cannot be below the current membership.');
    const record={name:textRequired(p.name,'Group name'),purpose:textRequired(p.purpose,'Purpose'),description:p.description||'',capacity,enrollment:p.enrollment||'Invitation',approval:!!p.approval,programId:p.programId||null};
    if(old)Object.assign(old,record);else s.groups.push({...record,id:id('group'),ownerId:actor,memberIds:[],status:'Open',created:now().slice(0,10)});
    return old?.id||s.groups.at(-1).id;
  }
  if(action==='mentor.group.archive') {ownGroup(s,actor,p.id).status='Archived';return;}
  if(action==='mentor.member.remove') {const g=ownGroup(s,actor,p.groupId);g.memberIds=g.memberIds.filter(x=>x!==p.personId);return;}
  if(action==='mentor.member.approve') {const m=find(s.memberships,p.id),g=ownGroup(s,actor,m.groupId);requireThat(g.memberIds.length<g.capacity,'This group is full.');m.status='Approved';if(!g.memberIds.includes(m.personId))g.memberIds.push(m.personId);return;}
  if(action==='mentor.invite.create') {const g=ownGroup(s,actor,p.groupId);requireThat(g.status==='Open','Open the group before inviting participants.');const invite={id:id('invite'),token:id('join'),groupId:g.id,email:p.email||'',expires:new Date(p.expires+'T23:59:00+03:00').toISOString(),limit:numberIn(p.limit,1,100,'Use limit'),uses:0,status:'Active'};requireThat(Date.parse(invite.expires)>nowMs(s),'Choose a future expiry date.');s.invitations.push(invite);return invite.token;}
  if(action==='mentor.invite.revoke') {const i=find(s.invitations,p.id);ownGroup(s,actor,i.groupId);i.status='Revoked';return;}
  if(action==='mentor.program.save') {
    const old=p.id?ownProgram(s,actor,p.id):null;requireThat(!old||old.status==='Draft','Create a new revision to change a published program.');
    const record={...p,title:textRequired(p.title,'Program title'),ownerId:actor,status:'Draft',version:old?.version||1};
    requireThat((p.groupIds||[]).every(gid=>ownGroup(s,actor,gid)),'Select your own groups.');
    if(old)Object.assign(old,record);else s.programs.push({...record,id:id('program'),history:[]});return old?.id||s.programs.at(-1).id;
  }
  if(action==='mentor.program.publish') {
    const pr=ownProgram(s,actor,p.id);requireThat(pr.status==='Draft','Only a draft can be published.');dates(pr.start,pr.end);requireThat(pr.groupIds.length&&pr.stages.length&&pr.activities.length,'Add a group, a stage and an activity before publishing.');
    requireThat(pr.stages.every(x=>x.title?.trim()&&x.objective?.trim()&&x.date>=pr.start&&x.date<=pr.end),'Each stage needs a title, objective and date within the program.');
    pr.status='Published';pr.history.push({version:pr.version,published:now()});
    for(const gid of pr.groupIds){ownGroup(s,actor,gid).programId=pr.id;for(const stage of pr.stages)for(const activity of pr.activities)s.assignments.push({id:id('assignment'),ownerId:actor,groupId:gid,programId:pr.id,stageId:stage.id,title:`${stage.title} · ${activity}`,activity,instructions:stage.objective,evidence:'Written reflection; self-reported until Mentor review.',due:stage.date,required:pr.required,review:pr.review||'Mentor review',status:'Active'});}return;
  }
  if(action==='mentor.program.duplicate') {const pr=ownProgram(s,actor,p.id);const copy=structuredClone(pr);copy.id=id('program');copy.title=`${pr.title} · revision`;copy.status='Draft';copy.version=pr.version+1;s.programs.push(copy);return copy.id;}
  if(action==='mentor.program.archive'||action==='mentor.program.complete') {ownProgram(s,actor,p.id).status=action.endsWith('archive')?'Archived':'Completed';return;}
  if(action==='mentor.assignment.create') {const g=groupAuthority(s,actor,p.groupId);requireThat(g.status!=='Archived','Archived groups cannot receive assignments.');requireThat(s.activityCatalog.some(x=>x.title===p.activity&&x.status==='Published'),'Choose a published activity.');if(p.studentId)requireThat(g.memberIds.includes(p.studentId),'Choose a current member of this group.');if(p.start&&p.due)requireThat(p.due>=p.start,'The due date must follow the start date.');const record={...p,id:id('assignment'),ownerId:actor,initiativeId:g.parentType==='initiative'?g.initiativeId:p.initiativeId||null,practiceType:practiceTypeOf(p.activity),title:textRequired(p.title,'Title'),instructions:textRequired(p.instructions,'Instructions'),due:textRequired(p.due,'Due date'),status:'Active',created:now(),version:1};s.assignments.push(record);for(const pid of p.studentId?[p.studentId]:g.memberIds)notify(s,pid,`New task: ${record.title} · due ${record.due}.`,'src/pages/member/training/training.html#assigned','task');return record.id;}
  if(action==='mentor.assignment.cancel') {const a=find(s.assignments,p.id),g=find(s.groups,a.groupId);requireThat(a.ownerId===actor||(g.parentType==='initiative'&&g.coachId===actor&&isActiveCoach(s,g.initiativeId,actor)),'This assignment belongs to a different Mentor.');a.status='Cancelled';a.cancelReason=p.reason||'';return;}
  if(action==='mentor.review') {const sub=find(s.submissions,p.id),a=find(s.assignments,sub.assignmentId),g=find(s.groups,a.groupId);requireThat(g.parentType==='initiative'?(g.coachId===actor&&isActiveCoach(s,g.initiativeId,actor)):a.ownerId===actor,'This review is outside your groups.');requireThat(sub.status==='Submitted','This submission has already been reviewed.');requireThat(['Approved','Needs Revision','Rejected'].includes(p.decision),'Choose a review decision.');if(p.decision!=='Approved')textRequired(p.feedback,'Feedback');sub.status=p.decision;sub.feedback=p.feedback||'Your work has been approved. Thank you for taking this small step.';sub.internalNote=String(p.internalNote||'').trim();sub.reviewedBy=actor;sub.reviewedAt=now();sub.history.push({decision:p.decision,feedback:sub.feedback,internalNote:sub.internalNote,actorId:actor,created:now()});if(p.decision==='Approved')reward(s,sub.id,sub.studentId,a.groupId,a.title,g.parentType==='initiative'?'Coach-reviewed Initiative task':'Mentor-reviewed demo assignment',g.parentType==='initiative'?{initiativeId:g.initiativeId}:{});notify(s,sub.studentId,`${a.title}: ${p.decision}.`,'src/pages/member/training/training.html#assigned','review');audit(s,actor,p.decision,a.title,sub.feedback);return;}
  if(action==='student.task.start') {startTask(s,p,actor);return;}
  if(action==='student.submit') {submitTask(s,p,actor);return;}
  return false;
}
