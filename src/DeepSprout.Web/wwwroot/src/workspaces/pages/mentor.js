import {reportRange} from '../shared.js';
import * as u from '../ui.js';
import {nameOf,crumbs,sharedAction,sharedChange,saveAccount} from '../shared.js';
import {programBuilder} from '../builders/program.js';
import {builderAction} from '../builders/engine.js';
import {isActiveCoach} from '../initiative-rules.js';
import {changeScope,head,pill} from './institution/common.js';
import {clockDay,taskAudience} from '../domain.js';
import {independentStatus,isProgramGroup,programGroups,taskState,PROGRAM_BUILDABLE,REVIEW_CRITERIA,REVIEW_LEVELS,RATING_WORDS} from '../coach-rules.js';
import * as kit from '../../shared/task-kit.js';
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
  +u.table(['Assignment','Group & context','Due','Progress','Review / required','Actions'],list.map(a=>{const g=groups.find(x=>x.id===a.groupId),people=taskAudience(a,g),states=people.map(pid=>taskState(s,a,pid));return {search:a.title+' '+(g?.name||''),status:a.status,cells:[`${u.esc(a.title)}<p class="iw-muted">${u.esc(a.activity)} · v${a.version||1}${a.studentId?` · for ${u.esc(nameOf(s,a.studentId))}`:''}</p>`,`${u.esc(g?.name||'')}<p>${u.esc(g?contextLabel(ctx,g):'')}</p>`,`${u.date(a.due)}${a.status==='Active'&&a.due<today?`<p>${pill('Overdue','Past due')}</p>`:''}`,`${states.filter(x=>x.status==='Approved').length}/${people.length} approved<p class="iw-muted">${states.filter(x=>x.status==='Submitted').length} to review · ${states.filter(x=>x.overdue).length} overdue</p>`,`${u.esc(a.review)}<p>${a.required?'Required':'Optional'}</p>`,`${u.badge(a.status)}${a.cancelReason?`<p class="iw-muted">${u.esc(a.cancelReason)}</p>`:''} ${a.status==='Active'?u.button('Reschedule','assignment-reschedule',{id:a.id},'button quiet small')+u.button('Cancel','assignment-cancel',{id:a.id},'button quiet small'):''}`]};}));
}
function reviewQueue(ctx,scope){const {s}=ctx,groups=coachGroups(ctx),assignments=scopedAssignments(ctx,scope),submissions=scopedSubmissions(ctx,scope);return u.header('A SMALL RESPONSE CAN HELP','Review queue','Read what someone tried, then help them take the next step.')+u.filterBar(['Submitted','Approved','Needs Revision','Rejected'])+u.table(['Student','Assignment & group','Submitted','Attempt','Status','Action'],submissions.map(sub=>{const a=assignments.find(a=>a.id===sub.assignmentId);return {search:nameOf(s,sub.studentId)+' '+a.title,status:sub.status,cells:[u.esc(nameOf(s,sub.studentId)),`${u.esc(a.title)}<p>${u.esc(groups.find(g=>g.id===a.groupId)?.name)}</p>`,u.date(sub.submitted),`#${sub.attempt||1} · task v${sub.assignmentVersion||1}`,u.badge(sub.status),u.link('Open review',`mentor/reviews/${sub.id}`,'button quiet small')]};}));}
/** The review page: the student's work on the left, the evaluation on the right. */
function reviewDetail(ctx){
 const {s,route:r}=ctx,assignments=scopedAssignments(ctx),submissions=scopedSubmissions(ctx),sub=submissions.find(x=>x.id===r.id);if(!sub)return u.missing('review');
 const a=assignments.find(a=>a.id===sub.assignmentId),g=s.groups.find(x=>x.id===a.groupId),name=nameOf(s,sub.studentId),first=name.split(' ')[0],esc=u.esc;
 const open=sub.status==='Submitted',label={Approved:'Approved','Needs Revision':'Revision requested',Rejected:'Not accepted'}[sub.status]||sub.status;
 const queue=submissions.filter(x=>x.status==='Submitted').sort((x,y)=>String(x.submitted).localeCompare(String(y.submitted))),at=queue.findIndex(x=>x.id===sub.id);
 const next=open?queue[at+1]:queue[0];
 const files=sub.files||[],paras=t=>String(t||'').split(/\n+/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('');
 const decisionFor=n=>sub.history.filter(h=>h.decision&&(h.attempt||1)===n).at(-1);
 const earlier=sub.history.filter(h=>h.text!==undefined);
 const attempts=earlier.length?`<section class="rv-history"><h3>Earlier attempts</h3><ol>${earlier.map(h=>{const d=decisionFor(h.attempt||1);return `<li><span class="rv-history-n">${h.attempt||'·'}</span><div><small>${u.date(h.created)}${d?` · ${esc(d.decision)}`:''}</small>${h.text?`<p>${esc(h.text)}</p>`:''}${kit.fileTiles(h.files||[],{cls:'is-compact'})}${d?.evaluation?.rating?kit.starRow(d.evaluation.rating):''}${d?.feedback?`<blockquote>“${esc(d.feedback)}”</blockquote>`:''}</div></li>`;}).join('')}</ol></section>`:'';
 const work=`<article class="rv-paper iw-reveal"><header><span class="rv-paper-tag">${kit.icon('pencil')}Attempt ${sub.attempt||1}</span><time>Sent ${u.date(sub.submitted)}</time></header>
   ${sub.text?`<div class="rv-answer">${paras(sub.text)}</div>`:'<p class="rv-answer is-empty">No written reflection — the work is in the attached files.</p>'}
   ${files.length?`<h4>${kit.icon('clip')}Attached by ${esc(first)}</h4>${kit.fileTiles(files)}`:sub.file?`<p class="cw-file">${u.icon('form')}${esc(sub.file)}</p>`:''}
   <footer>Written by ${esc(first)} · task version ${sub.assignmentVersion||a.version||1}</footer></article>${attempts}`;
 const stars=`<fieldset class="tk-stars-input"><legend>Overall</legend><div class="tk-stars-pick">${[5,4,3,2,1].map(n=>`<input type="radio" id="rv-star-${n}" name="rv-rating" value="${n}"><label for="rv-star-${n}" title="${esc(RATING_WORDS[n])}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/></svg><span class="sr-only">${n} star${n>1?'s':''} · ${esc(RATING_WORDS[n])}</span></label>`).join('')}</div><span class="tk-stars-word" aria-live="polite">Optional</span></fieldset>`;
 const criteria=`<div class="rv-crit">${REVIEW_CRITERIA.map(([k,l,hint])=>`<fieldset class="rv-crit-row"><legend><b>${esc(l)}</b><small>${esc(hint)}</small></legend><div class="rv-seg">${REVIEW_LEVELS.map((lv,i)=>`<label style="--lv:${i+1}"><input type="radio" name="rv-crit-${k}" value="${esc(lv)}"><span>${esc(lv)}</span></label>`).join('')}</div></fieldset>`).join('')}</div>`;
 const panel=open?`<section class="rv-panel iw-reveal" data-rv-eval aria-labelledby="rv-eval-title"><h2 id="rv-eval-title">Your evaluation</h2><p class="rv-sub">${esc(first)} is waiting to hear from you. Rate the work, then choose a decision.</p>
   ${stars}${criteria}
   <div class="rv-decide"><p>Decision</p>${u.button('Approve','review-decide',{id:sub.id,decision:'Approved'},'button primary rv-approve')}${u.button('Ask for a revision','review-decide',{id:sub.id,decision:'Needs Revision'},'button quiet')}${u.button('Not accepted','review-decide',{id:sub.id,decision:'Rejected'},'button quiet rv-reject')}</div>
   <p class="cw-fine">${u.icon('shield')}Your rating is about this piece of work. It never judges anyone’s wellbeing.</p></section>`
  :`<section class="rv-panel is-decided iw-reveal" aria-label="Decision">${kit.evaluationView({decision:sub.status,evaluation:sub.evaluation,feedback:sub.feedback,reviewer:sub.reviewedBy?nameOf(s,sub.reviewedBy):'Coach',at:sub.reviewedAt,criteria:REVIEW_CRITERIA,levels:REVIEW_LEVELS,fresh:ctx.localUI.justReviewed===sub.id})}
   ${sub.internalNote?`<p class="rv-private">${u.icon('shield')}<span><b>Private note for Supervisors</b>${esc(sub.internalNote)}</span></p>`:''}
   ${next?`<a class="rv-next" href="${u.href(`mentor/reviews/${next.id}`)}"><span><small>Next waiting</small><b>${esc(nameOf(s,next.studentId))} · ${esc(assignments.find(x=>x.id===next.assignmentId)?.title||'')}</b></span>${u.icon('arrow')}</a>`:`<p class="rv-done">${kit.icon('check')}Nothing else is waiting for your review.</p>`}</section>`;
 if(ctx.localUI.justReviewed===sub.id)ctx.localUI.justReviewed=null;
 const brief=`<section class="rv-brief iw-reveal"><h3>${kit.icon(kit.practiceIcon(a.practiceType))}What you asked</h3><p class="rv-brief-type">${esc(a.activity)} · due ${u.date(a.due)}</p><p>${esc(a.instructions)}</p>${a.evidence?`<p class="tk-ask">${kit.icon('send')}<span><b>Send back:</b> ${esc(a.evidence)}</span></p>`:''}${kit.fileTiles(a.attachments||[],{cls:'is-compact'})}</section>`;
 return crumbs('Reviews','mentor/reviews')
  +`<header class="rv-head iw-reveal" style="--h:${u.hueOf(g?.id||'')}"><span class="rv-avatar">${u.avatar(name)}</span><div class="rv-head-copy"><p class="rv-group"><span class="iw-gdot"></span>${esc(g?.name||'')}</p><h1>${esc(name)}</h1><p class="rv-task">${esc(a.title)}</p><p class="rv-meta">${pill(open?'Pending':sub.status,open?'Waiting for your review':label)}<span class="cw-when">Sent ${u.date(sub.submitted)}${(sub.attempt||1)>1?` · attempt ${sub.attempt}`:''}</span>${files.length?`<span class="tk-tag is-files">${kit.icon('clip')}<span>${files.length}</span></span>`:''}</p></div>
   ${open&&queue.length>1?`<div class="rv-queue"><small>${at+1} of ${queue.length} waiting</small>${next?`<a class="button quiet small" href="${u.href(`mentor/reviews/${next.id}`)}">Skip to next${u.icon('arrow')}</a>`:''}</div>`:''}</header>`
  +`<div class="rv-layout"><div class="rv-left">${work}</div><div class="rv-right">${panel}${brief}</div></div>`;
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
  // Institution composer: one group, chosen students or every group, with files saved to the browser attachment store first.
  const compose=async(v,f)=>{
   const audience=f.elements.audience?.value||'group',studentIds=[...(f.elements.studentIds?.selectedOptions||[])].map(o=>o.value).filter(Boolean);
   const groupIds=audience==='all-groups'?[...f.querySelectorAll('[name=groupIds]:checked')].map(x=>x.value):groups.map(g=>g.id);
   if(audience==='students'&&!studentIds.length)throw new Error('Choose at least one student.');
   if(audience==='all-groups'&&!groupIds.length)throw new Error('Choose at least one group.');
   const refs=await kit.saveFormFiles(f,ctx.person.id,'task');
   const payload={title:v.title,activity:v.activity,instructions:v.instructions,evidence:v.evidence,start:v.start,due:v.due,required:f.elements.required.checked,review:'Coach review',audience,groupId:v.groupId,groupIds,studentIds,attachments:refs};
   const n=audience==='students'?studentIds.length:0,count=audience==='all-groups'?groupIds.length:0;
   try{ctx.run('mentor.assignment.create',payload,audience==='students'?(n===1?`Task assigned to ${nameOf(s,studentIds[0])}.`:`Task assigned to ${n} students.`):audience==='all-groups'?`Task sent to ${count} groups.`:'Task assigned. Every student in the group can see it now.');}
   catch(error){const m=await import('../../shared/attachments.js');await Promise.all(refs.map(x=>m.remove(x.id).catch(()=>{})));throw error;}
   ctx.render();
  };
  if(!own){u.modal('Assign a task',cw.taskForm(s,groups,d.group||groups[0].id,g=>`${initiativeOfGroup(ctx,g)?.title||''} · ${g.memberIds.length} students`),compose,'Assign task',{wide:true});return;}
  u.modal('Give the group a clear next step',u.field('title','Assignment title','','text',true)+u.select('groupId','Group',groups.map(g=>[g.id,isInst(g)?`${g.name} · ${initiativeOfGroup(ctx,g)?.title}`:`${g.name} · ${s.programs.find(p=>p.id===g.programId)?.title||''}`]),d.group||groups[0].id)+u.select('studentId','Individual member (optional)',[['','Whole group'],...s.people.filter(p=>groups.some(g=>g.memberIds.includes(p.id))).map(p=>[p.id,p.name])])+u.select('activity','Approved activity',s.activityCatalog.filter(a=>a.status==='Published').map(a=>a.title))+u.area('instructions','Instructions','',true)+u.area('evidence','Expected evidence','Short written reflection.')+`<div class="form-grid">${u.field('start','Available from',clockDay(s),'date')}${u.field('due','Due date',new Date(Date.parse(`${clockDay(s)}T12:00:00Z`)+7*864e5).toISOString().slice(0,10),'date',true)}</div>`+u.checkbox('required','Required assignment',true),save,'Create Assignment');return;
 }
 if(action==='assignment-reschedule'){const a=s.assignments.find(x=>x.id===d.id);u.modal('Reschedule future work',`<p>Currently due <strong>${u.date(a?.due)}</strong> (version ${a?.version||1}). Submitted attempts keep the version they answered.</p>`+u.field('due','New due date',a?.due||'','date',true)+u.area('reason','Reason shown to students','',true),v=>{ctx.run('mentor.assignment.reschedule',{id:d.id,...v},'Rescheduled. Students were notified.');ctx.render();},'Reschedule');return;}
 if(action==='assignment-cancel'){u.modal('Cancel this task?',`<p>Students stop seeing it as work to do. Every submission and review stays in history.</p>`+u.area('reason','Reason shown to students','',true),v=>{ctx.run('mentor.assignment.cancel',{id:d.id,reason:v.reason},'Task cancelled.');ctx.render();},'Cancel task');return;}
 if(action==='review-decide'){const sub=s.submissions.find(x=>x.id===d.id),first=nameOf(s,sub?.studentId).split(' ')[0],approve=d.decision==='Approved';
  const title={Approved:`Approve ${first}’s work`,'Needs Revision':'Ask for a revision',Rejected:'Mark as not accepted'}[d.decision];
  const hint={Approved:`${first} will see your message with the approval.`,'Needs Revision':`Say what to change, and one small next step. ${first} can send a new attempt.`,Rejected:`Explain why, kindly. ${first} sees this reason.`}[d.decision];
  const phrases={Approved:['Clear and specific — well done.','You followed the steps closely.','Your evidence shows real effort.','Keep this going next week.'],'Needs Revision':['Add one thing you noticed.','Tell me what got in the way.','Attach a photo or file as evidence.','Try it once more, for ten minutes.'],Rejected:['This answers a different task.','Please follow the instructions first.']}[d.decision]||[];
  const box=document.querySelector('[data-rv-eval]'),rating=Number(box?.querySelector('[name=rv-rating]:checked')?.value)||0;
  const criteria=Object.fromEntries(REVIEW_CRITERIA.map(([k])=>[k,box?.querySelector(`[name="rv-crit-${k}"]:checked`)?.value]).filter(([,v])=>v));
  const recap=rating||Object.keys(criteria).length?`<div class="rv-recap">${rating?`${kit.starRow(rating)}<b>${u.esc(RATING_WORDS[rating])}</b>`:''}${REVIEW_CRITERIA.filter(([k])=>criteria[k]).map(([k,l])=>`<span>${u.esc(l)}: ${u.esc(criteria[k])}</span>`).join('')}</div>`:'<p class="rv-recap is-empty">No rating added. You can still send your decision.</p>';
  u.modal(title,`<div class="rv-dialog is-${d.decision==='Approved'?'approve':d.decision==='Rejected'?'reject':'revise'}"><p class="cw-sub">${u.esc(hint)}</p>${recap}${u.area('feedback',approve?`Message to ${first} (optional)`:`Message to ${first}`,'',!approve)}<div class="rv-phrases" role="group" aria-label="Quick phrases">${phrases.map(p=>`<button type="button" data-tk-insert="${u.esc(p)}">+ ${u.esc(p)}</button>`).join('')}</div>${u.area('internalNote','Private note for Supervisors (optional — the student never sees it)','')}</div>`,v=>{ctx.run('mentor.review',{id:d.id,decision:d.decision,feedback:v.feedback,internalNote:v.internalNote,rating,criteria},approve?`Approved. ${first} can see it now.`:d.decision==='Needs Revision'?`Revision requested. ${first} can see your message.`:'Decision saved.');ctx.localUI.justReviewed=d.id;ctx.render();},approve?'Approve':d.decision==='Needs Revision'?'Send to student':'Save decision');return;}
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
 if(kind==='coach-students-filter'){const group=form.elements.group.value,q=new URLSearchParams();if(group)q.set('group',group);ctx.go(`mentor/students${q.size?`?${q}`:''}`);return;}
 if(kind==='coach-report-scope'){const v=u.formValues(form);ctx.go(`mentor/reports?scope=initiative&group=${v.group}&from=${v.from}&to=${v.to}`);return;}
 if(kind==='coach-report'){const v=u.formValues(form),intent=form.dataset.submitter||'submit';ctx.run('initiative.coach.report',{id:form.dataset.id||undefined,groupId:form.dataset.group,from:form.dataset.from,to:form.dataset.to,...v,submit:intent==='submit'},intent==='submit'?'Report submitted to the initiative’s Supervisors.':'Draft saved.');ctx.render();return;}
 if(kind==='coach-filter'){const v=u.formValues(form),q=new URLSearchParams({scope:'own'});if(v.program)q.set('program',v.program);if(v.group)q.set('group',v.group);if(form.elements.attention?.checked)q.set('attention','1');ctx.go(`mentor/students?${q}`);return;}
 if(kind==='coach-preport-scope'){const v=u.formValues(form);if(v.to<v.from)throw new Error('The end date must follow the start date.');ctx.go(`mentor/reports?scope=own&program=${v.program}&group=${v.group||''}&from=${v.from}&to=${v.to}`);return;}
 if(kind==='coach-preport'){const v=u.formValues(form),intent=form.dataset.submitter||'submit';ctx.run('mentor.report.save',{id:form.dataset.id||undefined,programId:form.dataset.program,groupId:form.dataset.group,from:form.dataset.from,to:form.dataset.to,...v,submit:intent==='submit'},intent==='submit'?'Report finalized and kept with the Program.':'Draft saved.');ctx.render();return;}
 if(kind==='account')saveAccount(form,ctx);if(kind==='report-range')reportRange(form,ctx);
}
export function change(target,ctx){if(changeScope(target,ctx))return;if(target.dataset.action==='coach-garden-group'){ctx.go(`mentor/group-garden?scope=own&group=${target.value}`);return;}sharedChange(target,ctx);}
