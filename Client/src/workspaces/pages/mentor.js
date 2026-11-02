import {reportRange} from '../shared.js';
import * as u from '../ui.js';
import {metrics,nameOf,crumbs,sharedAction,sharedChange,saveAccount} from '../shared.js';
import {programBuilder} from '../builders/program.js';
import {builderAction} from '../builders/engine.js';
import {isActiveCoach} from '../initiative-rules.js';
import {changeScope,head,card,pill} from './institution/common.js';
import {clockDay} from '../domain.js';
import {independentStatus,isProgramGroup,programGroups,taskState,PROGRAM_BUILDABLE} from '../coach-rules.js';
import * as ind from './coach/independent.js';
import * as cw from './coach/invited.js';

/** Independent groups the Coach owns + Initiative groups currently allocated to them under an active grant. */
const coachGroups=ctx=>ctx.s.groups.filter(g=>(isProgramGroup(g)&&g.ownerId===ctx.person.id)||(g.parentType==='initiative'&&g.coachId===ctx.person.id&&isActiveCoach(ctx.s,g.initiativeId,ctx.person.id)));
const isInst=g=>g?.parentType==='initiative';
const initiativeOfGroup=(ctx,g)=>ctx.s.initiatives.find(i=>i.id===g.initiativeId);
/** Assignments in the Coach's scope: own Program groups, or Initiative groups they currently coach. */
const scopedAssignments=(ctx,scope)=>{const gs=coachGroups(ctx).filter(g=>!scope||(scope==='initiative'?isInst(g):!isInst(g)));return ctx.s.assignments.filter(a=>gs.some(g=>g.id===a.groupId));};
const scopedSubmissions=(ctx,scope)=>{const ids=new Set(scopedAssignments(ctx,scope).map(a=>a.id));return ctx.s.submissions.filter(x=>ids.has(x.assignmentId));};
const contextLabel=(ctx,g)=>isInst(g)?`${initiativeOfGroup(ctx,g)?.title||'Initiative'} · Institution`:`${ctx.s.programs.find(p=>p.id===g.programId)?.title||'No Program'} · Independent`;

export function render(ctx){
 const {s,person:p,route:r}=ctx,own=ind.coachScope(ctx)==='own';
 // One path: a Coach is invited by an institution. The independent Program pages stay reachable only by an explicit ?scope=own link.
 if(r.page==='dashboard')return own?ind.dashboard(ctx):cw.dashboard(ctx);
 if(r.page==='groups'&&!r.id)return own?ind.groupsPage(ctx):cw.groupsPage(ctx);
 if(r.page==='groups'&&r.id){const g=coachGroups(ctx).find(x=>x.id===r.id);if(!g)return u.missing('group');return isInst(g)?cw.groupDetail(ctx,g):ind.groupDetail(ctx,g);}
 if(r.page==='students'){
  if(r.id)return ind.studentDetail(ctx,r.id)||cw.studentDetail(ctx,r.id)||u.missing('student');
  return own?ind.studentsPage(ctx):cw.studentsPage(ctx);
 }
 if(r.page==='programs'){
  const programs=ind.ownPrograms(ctx);
  if(r.id==='new'||r.tail==='edit'){
   if(independentStatus(s,p.id)!=='Approved')return head({eyebrow:'PROGRAM BUILDER',title:'Independent Programs need approval.'})+ind.approvalPanel(ctx);
   const old=programs.find(x=>x.id===r.id);if(r.tail==='edit'&&(!old||old.status!=='Draft'))return u.missing('editable draft');return programBuilder(ctx,old);
  }
  if(r.id){const pr=programs.find(x=>x.id===r.id);return pr?ind.programDetail(ctx,pr):u.missing('program');}
  return ind.programsPage(ctx);
 }
 if(r.page==='assignments')return own?assignmentsPage(ctx,'own'):cw.tasksPage(ctx);
 if(r.page==='reviews'){if(r.id)return reviewDetail(ctx);return own?reviewQueue(ctx,'own'):cw.reviewQueue(ctx);}
 if(r.page==='group-garden')return own?ind.gardenPage(ctx):cw.dashboard(ctx);
 if(r.page==='reports')return own?ind.reportsPage(ctx):cw.reportPage(ctx);
 return null;
}

/* ------------------------------------------- shared engine: tasks, reviews */

function assignmentsPage(ctx,scope){
 const {s}=ctx,groups=coachGroups(ctx),list=scopedAssignments(ctx,scope),today=clockDay(s);
 return head({eyebrow:'ONE CLEAR NEXT STEP',title:'Assignments',lead:scope==='own'?'Tasks in your Program groups. Rescheduling keeps the earlier version; cancelling keeps every submission.':'Tasks in the Initiative groups allocated to you.',actions:u.button('Create Assignment','assignment-create')})
  +u.filterBar(['Active','Cancelled'])
  +u.table(['Assignment','Group & context','Due','Progress','Review / required','Actions'],list.map(a=>{const g=groups.find(x=>x.id===a.groupId),people=a.studentId?[a.studentId]:g?.memberIds||[],states=people.map(pid=>taskState(s,a,pid));return {search:a.title+' '+(g?.name||''),status:a.status,cells:[`${u.esc(a.title)}<p class="iw-muted">${u.esc(a.activity)} · v${a.version||1}${a.studentId?` · for ${u.esc(nameOf(s,a.studentId))}`:''}</p>`,`${u.esc(g?.name||'')}<p>${u.esc(g?contextLabel(ctx,g):'')}</p>`,`${u.date(a.due)}${a.status==='Active'&&a.due<today?`<p>${pill('Overdue','Past due')}</p>`:''}`,`${states.filter(x=>x.status==='Approved').length}/${people.length} approved<p class="iw-muted">${states.filter(x=>x.status==='Submitted').length} to review · ${states.filter(x=>x.overdue).length} overdue</p>`,`${u.esc(a.review)}<p>${a.required?'Required':'Optional'}</p>`,`${u.badge(a.status)}${a.cancelReason?`<p class="iw-muted">${u.esc(a.cancelReason)}</p>`:''} ${a.status==='Active'?u.button('Reschedule','assignment-reschedule',{id:a.id},'button quiet small')+u.button('Cancel','assignment-cancel',{id:a.id},'button quiet small'):''}`]};}));
}
function reviewQueue(ctx,scope){const {s}=ctx,groups=coachGroups(ctx),assignments=scopedAssignments(ctx,scope),submissions=scopedSubmissions(ctx,scope);return u.header('A SMALL RESPONSE CAN HELP','Review queue','Read what someone tried, then help them take the next step.')+u.filterBar(['Submitted','Approved','Needs Revision','Rejected'])+u.table(['Student','Assignment & group','Submitted','Attempt','Status','Action'],submissions.map(sub=>{const a=assignments.find(a=>a.id===sub.assignmentId);return {search:nameOf(s,sub.studentId)+' '+a.title,status:sub.status,cells:[u.esc(nameOf(s,sub.studentId)),`${u.esc(a.title)}<p>${u.esc(groups.find(g=>g.id===a.groupId)?.name)}</p>`,u.date(sub.submitted),`#${sub.attempt||1} · task v${sub.assignmentVersion||1}`,u.badge(sub.status),u.link('Open review',`mentor/reviews/${sub.id}`,'button quiet small')]};}));}
function reviewDetail(ctx){
 const {s,route:r}=ctx,assignments=scopedAssignments(ctx),submissions=scopedSubmissions(ctx),sub=submissions.find(x=>x.id===r.id);if(!sub)return u.missing('review');
 const a=assignments.find(a=>a.id===sub.assignmentId),g=s.groups.find(x=>x.id===a.groupId),name=nameOf(s,sub.studentId),first=name.split(' ')[0];
 const attempts=[...sub.history.filter(h=>h.text!==undefined).map(h=>({title:`Attempt ${h.attempt||'earlier'} · ${h.status}`,description:h.text,date:h.created})),{title:`Attempt ${sub.attempt||1} · current`,description:sub.text,date:sub.submitted}],decisions=sub.history.filter(h=>h.decision);
 const open=sub.status==='Submitted',label={Approved:'Approved','Needs Revision':'Revision requested',Rejected:'Not accepted'}[sub.status]||sub.status;
 const decide=open?`<p class="cw-sub">${u.esc(first)} is waiting to hear from you.</p><div class="cw-decide">${u.button('Approve','review-decide',{id:sub.id,decision:'Approved'},'button primary')}${u.button('Ask for a revision','review-decide',{id:sub.id,decision:'Needs Revision'},'button quiet')}${u.button('Not accepted','review-decide',{id:sub.id,decision:'Rejected'},'button quiet')}</div><p class="cw-fine">${u.icon('shield')}Approving confirms the task was done. It never judges anyone’s wellbeing.</p>`
  :`<div class="cw-decided">${pill(sub.status,label)}${sub.feedback?`<p class="cw-quote">“${u.esc(sub.feedback)}”</p>`:'<p class="iw-muted">No message was added.</p>'}${sub.internalNote?`<p class="cw-fine">${u.icon('shield')}Private note for Supervisors: ${u.esc(sub.internalNote)}</p>`:''}</div>`;
 return crumbs('Reviews','mentor/reviews')+head({eyebrow:`${g?.name||''} · REVIEW`.toUpperCase(),title:name,lead:a.title,meta:`${pill(open?'Pending':sub.status,open?'Waiting for your review':label)}<span class="cw-when">Sent ${u.date(sub.submitted)}${(sub.attempt||1)>1?` · attempt ${sub.attempt}`:''}</span>`})
  +`<div class="cw-review-layout"><div>${card('Their answer',`<blockquote class="cw-answer">${u.esc(sub.text)}</blockquote>${sub.file?`<p class="cw-file">${u.icon('form')}${u.esc(sub.file)}</p>`:''}<p class="cw-fine">Written by ${u.esc(first)} · attempt ${sub.attempt||1} · task version ${sub.assignmentVersion||a.version||1}</p>${attempts.length>1?`<h3 class="cw-h3">Every attempt</h3>${u.timeline(attempts)}`:''}${decisions.length?`<h3 class="cw-h3">Earlier decisions</h3>${u.timeline(decisions.map(h=>({title:h.decision,description:h.feedback,date:h.created})))}`:''}`,{eyebrow:'SUBMITTED WORK'})}</div>
  <div>${card(open?'Your decision':'Decision',decide,{cls:open?'cw-decision':''})}${card('The task',`<h3 class="cw-h3 is-first">${u.esc(a.activity)}</h3><p>${u.esc(a.instructions)}</p><dl class="iw-facts cw-facts"><div><dt>Due</dt><dd>${u.date(a.due)}</dd></div><div><dt>They send back</dt><dd>${u.esc(a.evidence||'—')}</dd></div></dl>`,{eyebrow:'WHAT YOU ASKED'})}</div></div>`;
}

/* ------------------------------------------------------------- actions */

function inviteLinkModal(token){const url=new URL('join.html',location.href);url.searchParams.set('token',token);u.modal('Your private invitation link',`${u.note('No email is sent in this demonstration. Copy this link and share it with the invited person yourself.')}${u.field('link','Invitation link',url.href,'text',false,'readonly')}`,()=>{},'Done');}
export async function action(action,target,ctx){const d=target.dataset;if(action==='report-export'&&d.program)action='preport-export';if(builderAction(action,target,ctx)||sharedAction(action,target,ctx))return;
 const {s}=ctx;
 if(action==='coach-scope'){ctx.localUI.coachScope=d.scope;const base=['dashboard','groups','students','programs','assignments','reviews','group-garden','reports'].includes(ctx.route.page)?ctx.route.page:'dashboard';ctx.go(`mentor/${base}?scope=${d.scope}`);return;}
 if(action==='group-create'||action==='group-edit'){
  const g=ind.ownProgramGroups(ctx).find(x=>x.id===d.id);
  if(!g&&!ind.ownPrograms(ctx).some(pr=>PROGRAM_BUILDABLE.includes(pr.status))){u.toast('Build a Program first: every group belongs to one Program.',true);ctx.go('mentor/programs/new');return;}
  ctx.localUI.groupProgram=d.program||'';
  u.modal(g?'Edit your circle':'Create a group',ind.groupForm(ctx,g),(v,f)=>{const gid=ctx.run('mentor.group.save',{...v,id:g?.id,approval:f.elements.approval.checked||v.enrollment==='Approval required'},g?'Group updated.':'Your new circle is ready.');ctx.go(`mentor/groups/${gid}`);ctx.render();},g?'Save group':'Create Group');return;
 }
 if(action==='invite-create'){const g=s.groups.find(x=>x.id===d.group),pr=s.programs.find(x=>x.id===g?.programId),days=pr?.invitationPolicy?.expiryDays||14,def=new Date(Date.parse(clockDay(s)+'T12:00:00+03:00')+days*86400000).toISOString().slice(0,10);u.modal('Invite someone into your circle',u.field('email','Recipient email','','email',true)+u.field('expires','Invitation expires',def,'date',true)+u.note(`One email, one use. The person signs in with this email (or verifies it as a new Invited Student) and accepts. Default expiry follows the Program policy (${days} days). No email is sent.`),v=>{const token=ctx.run('mentor.invite.create',{...v,groupId:d.group},'Invitation created. Copy its private link.');ctx.render();/* open after this dialog has closed */document.getElementById('workspace-dialog').addEventListener('close',()=>setTimeout(()=>inviteLinkModal(token)),{once:true});},'Create invitation');return;}
 if(action==='invite-copy'){const url=new URL('join.html',location.href);url.searchParams.set('token',d.token);try{await navigator.clipboard.writeText(url.href);u.toast('Invitation link copied.');}catch{inviteLinkModal(d.token);}return;}
 if(action==='invite-resend'){const token=ctx.run('mentor.invite.resend',{id:d.id},'A fresh link replaces the earlier one.');ctx.render();inviteLinkModal(token);return;}
 if(action==='assignment-create'){
  const all=coachGroups(ctx).filter(g=>!['Archived','Completed','Closed'].includes(g.status)&&(isInst(g)||s.programs.find(p=>p.id===g.programId)?.status==='Published'));
  const inst=all.filter(isInst),own=ind.coachScope(ctx)==='own'||!inst.length,groups=own?all:inst;
  if(!groups.length){u.toast('You need a group before you can assign a task.',true);return;}
  const save=(v,f)=>{ctx.run('mentor.assignment.create',{...v,studentId:v.studentId||null,required:f.elements.required.checked,review:'Coach review'},v.studentId?`Task assigned to ${nameOf(s,v.studentId)}.`:'Task assigned. Every student in the group can see it now.');ctx.render();};
  if(!own){u.modal('Assign a task',cw.taskForm(s,groups,d.group||groups[0].id,g=>`${initiativeOfGroup(ctx,g)?.title||''} · ${g.memberIds.length} students`),save,'Assign task');return;}
  u.modal('Give the group a clear next step',u.field('title','Assignment title','','text',true)+u.select('groupId','Group',groups.map(g=>[g.id,isInst(g)?`${g.name} · ${initiativeOfGroup(ctx,g)?.title}`:`${g.name} · ${s.programs.find(p=>p.id===g.programId)?.title||''}`]),d.group||groups[0].id)+u.select('studentId','Individual member (optional)',[['','Whole group'],...s.people.filter(p=>groups.some(g=>g.memberIds.includes(p.id))).map(p=>[p.id,p.name])])+u.select('activity','Approved activity',s.activityCatalog.filter(a=>a.status==='Published').map(a=>a.title))+u.area('instructions','Instructions','',true)+u.area('evidence','Expected evidence','Short written reflection.')+`<div class="form-grid">${u.field('start','Available from',clockDay(s),'date')}${u.field('due','Due date',new Date(Date.parse(`${clockDay(s)}T12:00:00Z`)+7*864e5).toISOString().slice(0,10),'date',true)}</div>`+u.checkbox('required','Required assignment',true),save,'Create Assignment');return;
 }
 if(action==='assignment-reschedule'){const a=s.assignments.find(x=>x.id===d.id);u.modal('Reschedule future work',`<p>Currently due <strong>${u.date(a?.due)}</strong> (version ${a?.version||1}). Submitted attempts keep the version they answered.</p>`+u.field('due','New due date',a?.due||'','date',true)+u.area('reason','Reason shown to students','',true),v=>{ctx.run('mentor.assignment.reschedule',{id:d.id,...v},'Rescheduled. Students were notified.');ctx.render();},'Reschedule');return;}
 if(action==='assignment-cancel'){u.modal('Cancel this task?',`<p>Students stop seeing it as work to do. Every submission and review stays in history.</p>`+u.area('reason','Reason shown to students','',true),v=>{ctx.run('mentor.assignment.cancel',{id:d.id,reason:v.reason},'Task cancelled.');ctx.render();},'Cancel task');return;}
 if(action==='review-decide'){const sub=s.submissions.find(x=>x.id===d.id),first=nameOf(s,sub?.studentId).split(' ')[0],approve=d.decision==='Approved';
  const title={Approved:`Approve ${first}’s work`,'Needs Revision':'Ask for a revision',Rejected:'Mark as not accepted'}[d.decision];
  const hint={Approved:`${first} will see your message with the approval.`,'Needs Revision':`Say what to change, and one small next step. ${first} can send a new attempt.`,Rejected:`Explain why, kindly. ${first} sees this reason.`}[d.decision];
  u.modal(title,`<p class="cw-sub">${u.esc(hint)}</p>`+u.area('feedback',approve?`Message to ${first} (optional)`:`Message to ${first}`,'',!approve)+u.area('internalNote','Private note for Supervisors (optional — the student never sees it)',''),v=>{ctx.run('mentor.review',{id:d.id,decision:d.decision,feedback:v.feedback,internalNote:v.internalNote},approve?`Approved. ${first} can see it now.`:d.decision==='Needs Revision'?`Revision requested. ${first} can see your message.`:'Decision saved.');ctx.render();},approve?'Approve':d.decision==='Needs Revision'?'Send to student':'Save decision');return;}
 if(action==='member-decline'){u.modal('Decline this membership request?',u.area('reason','Reason (optional, kept in history)',''),v=>{ctx.run('mentor.member.decline',{id:d.id,reason:v.reason},'Request declined.');ctx.render();},'Decline');return;}
 if(action==='program-pause'){u.modal('Pause this Program?','<p>No new tasks, invitations or joins until you resume. Students can still finish and submit current work, and you can still review it.</p>'+u.area('reason','Reason shown to students','',true),v=>{ctx.run('mentor.program.pause',{id:d.id,reason:v.reason},'Program paused.');ctx.render();},'Pause Program');return;}
 if(action==='program-cancel'){u.modal('Cancel this Program?','<p>Active tasks are cancelled and open invitations revoked. Every submission, review, membership and report is kept and stays readable.</p>'+u.area('reason','Cancellation reason (shown to students)','',true),v=>{ctx.run('mentor.program.cancel',{id:d.id,reason:v.reason},'Program cancelled. History is preserved.');ctx.render();},'Cancel Program');return;}
 if(action==='program-complete'){const pr=s.programs.find(x=>x.id===d.id),roster=programGroups(s,pr).flatMap(g=>g.memberIds);u.confirm('Finalize Program completion?',`Each of the ${roster.length} student(s) receives a final Completed or Not completed record under the declared rule. Groups close to new work. This adds a collective Group Garden milestone and no Personal Garden object.`,()=>{const result=ctx.run('mentor.program.complete',{id:d.id},'Program completed. Records and milestones saved.');ctx.go(`mentor/programs/${d.id}?tab=completion`);ctx.render();return result;});return;}
 if(action==='program-update'){const pr=s.programs.find(x=>x.id===d.id);u.modal('Edit future details',`${u.note('Submitted work and existing tasks never change. New stages add future tasks for every group.')}${u.area('description','Description',pr.description||'')}${u.area('purpose','Objective',pr.purpose||'')}${u.field('audience','Audience',pr.audience||'')}${u.field('eligibility','Eligibility',pr.eligibility||'')}${u.area('consentPolicy','Student consent policy',pr.consentPolicy||'')}${u.field('end','End date (can only move later)',pr.end,'date',true)}<fieldset class="iw-fieldset"><legend>Add a future stage (optional)</legend>${u.field('stageTitle','Stage title','')}${u.area('stageObjective','Objective / milestone','')}${u.field('stageDate','Milestone date','', 'date')}</fieldset>`,v=>{ctx.run('mentor.program.update',{id:d.id,description:v.description,purpose:v.purpose,audience:v.audience,eligibility:v.eligibility,consentPolicy:v.consentPolicy,end:v.end,newStages:v.stageTitle?[{title:v.stageTitle,objective:v.stageObjective,date:v.stageDate}]:[]},'Future details saved as a new version.');ctx.render();},'Save changes');return;}
 if(action==='link-propose'){const options=s.initiatives.filter(i=>['Published','Active'].includes(i.status));u.modal('Propose a link to an Institution Initiative',`${u.select('initiativeId','Initiative',options.map(i=>[i.id,`${i.title} · ${s.organizations.find(o=>o.id===i.ownerId)?.name||''}`]))}${u.area('note','Note to the Institution (optional)','')}${u.note('The Institution sees aggregate counts only. Ownership, groups and records stay with you.')}`,v=>{ctx.run('mentor.program.link.propose',{programId:d.id,...v},'Link proposed to the Institution.');ctx.render();},'Propose link');return;}
 if(action==='preport-export'){const pr=s.programs.find(x=>x.id===d.program);u.exportCSV(`deepsprout-program-${(pr?.title||'report').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.csv`,['Student','Group','Task','Due','State','Attempts','Reviewed'],ind.reportRows(s,pr,d.group));return;}
 const commands={'group-archive':'mentor.group.archive','member-remove':'mentor.member.remove','member-approve':'mentor.member.approve','invite-revoke':'mentor.invite.revoke','program-publish':'mentor.program.publish','program-resume':'mentor.program.resume','program-archive':'mentor.program.archive','program-duplicate':'mentor.program.duplicate','link-end':'mentor.program.link.end'};
 if(commands[action]){const payload={id:d.id,groupId:d.group,personId:d.person};const complete=()=>{const result=ctx.run(commands[action],payload);if(action==='program-duplicate')ctx.go(`mentor/programs/${result}/edit`);else ctx.render();};if(['group-archive','member-remove','invite-revoke','program-archive','link-end'].includes(action))u.confirm('Confirm this change?','Historical participation stays recorded. The affected access or future action will change in this demo.',complete);else complete();}
}
export function submit(form,ctx){
 const kind=form.dataset.form;
 if(kind==='coach-report-scope'){const v=u.formValues(form);ctx.go(`mentor/reports?scope=initiative&group=${v.group}&from=${v.from}&to=${v.to}`);return;}
 if(kind==='coach-report'){const v=u.formValues(form),intent=form.dataset.submitter||'submit';ctx.run('initiative.coach.report',{id:form.dataset.id||undefined,groupId:form.dataset.group,from:form.dataset.from,to:form.dataset.to,...v,submit:intent==='submit'},intent==='submit'?'Report submitted to the initiative’s Supervisors.':'Draft saved.');ctx.render();return;}
 if(kind==='coach-filter'){const v=u.formValues(form),q=new URLSearchParams({scope:'own'});if(v.program)q.set('program',v.program);if(v.group)q.set('group',v.group);if(form.elements.attention?.checked)q.set('attention','1');ctx.go(`mentor/students?${q}`);return;}
 if(kind==='coach-preport-scope'){const v=u.formValues(form);if(v.to<v.from)throw new Error('The end date must follow the start date.');ctx.go(`mentor/reports?scope=own&program=${v.program}&group=${v.group||''}&from=${v.from}&to=${v.to}`);return;}
 if(kind==='coach-preport'){const v=u.formValues(form),intent=form.dataset.submitter||'submit';ctx.run('mentor.report.save',{id:form.dataset.id||undefined,programId:form.dataset.program,groupId:form.dataset.group,from:form.dataset.from,to:form.dataset.to,...v,submit:intent==='submit'},intent==='submit'?'Report finalized and kept with the Program.':'Draft saved.');ctx.render();return;}
 if(kind==='account')saveAccount(form,ctx);if(kind==='report-range')reportRange(form,ctx);
}
export function change(target,ctx){if(changeScope(target,ctx))return;if(target.dataset.action==='coach-garden-group'){ctx.go(`mentor/group-garden?scope=own&group=${target.value}`);return;}sharedChange(target,ctx);}
