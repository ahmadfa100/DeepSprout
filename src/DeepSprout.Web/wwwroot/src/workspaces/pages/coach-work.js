import * as u from '../ui.js';
import {card,esc,head,pill} from './institution/common.js';
import {workspaceRequest} from '../workspace-api.js';

const api = '/api/initiative-work';
export const load = id => workspaceRequest(api+'/coach/'+id);
export const review = (initiative,task,student) => workspaceRequest(api+'/review/'+initiative+'/'+task+'/'+student);
const nav = (page,initiative) => 'mentor/'+page+'?initiative='+encodeURIComponent(initiative);
const label = value => ({InProgress:'In progress',NeedsRevision:'Needs revision'}[value] || value);
const date = value => value ? new Date(value).toLocaleString() : '—';
function local(value) {
  if (!value) return '';
  const when = new Date(value);
  return new Date(when.getTime()-when.getTimezoneOffset()*60000).toISOString().slice(0,16);
}

export function render(ctx, data, picker) {
  if (ctx.route.page === 'reviews') return reviews(data,picker);
  const editable = data.work.groups.some(team=>team.status === 'Open');
  return head({eyebrow:'COACH · INITIATIVE ASSIGNMENTS',title:'Assignments',meta:picker,
    actions:editable ? u.button('Create assignment','live-assignment-create',{},'button primary') : ''})+
    card('Current and historical assignments',data.work.assignments.length ? u.table(['Assignment','Group','Due','Status','Actions'],
      data.work.assignments.map(row=>({cells:[`<strong>${esc(row.terms.title)}</strong><small>Version ${esc(row.terms.revisionNo)} · ${esc(row.author)}</small>`,
        esc(row.groupName),esc(date(row.terms.dueAtUtc)),pill(row.status),
        `<div class="actions">${u.button('Details','live-assignment-detail',{id:row.id},'button quiet small')}
          ${row.canEdit ? u.button('Edit or reschedule','live-assignment-edit',{id:row.id},'button quiet small') : ''}
          ${row.canCancel ? u.button('Cancel','live-assignment-cancel',{id:row.id},'button quiet small') : ''}</div>`]}))) :
      '<p>No assignments in your currently assigned groups.</p>');
}

function reviews(data,picker) {
  const rows = data.work.assignments.flatMap(task=>task.recipients.filter(row=>row.lastAttemptNo).map(row=>({...row,task})));
  const pending = rows.filter(row=>row.status === 'Submitted' && row.task.status === 'Published');
  const table = list => list.length ? u.table(['Student','Assignment','Attempt','Status',''],list.map(row=>({cells:[
    esc(row.student),esc(row.task.terms.title),esc(row.lastAttemptNo),pill(row.status,label(row.status)),
    u.link('Open submission',nav('reviews/'+row.task.id+'/'+row.recipientId,data.id),'button quiet small')]}))) : '<p>No records in this section.</p>';
  return head({eyebrow:'COACH · SUBMISSIONS',title:'Review queue',meta:picker})+
    (data.review ? reviewCard(data.review)+u.link('Back to review queue',nav('reviews',data.id),'button quiet') :
      card('Waiting for a review',table(pending))+card('Previous submissions',table(rows.filter(row=>!pending.includes(row)))));
}

export function reviewCard(row) {
  return card(row.terms.title,`<p>${esc(row.student)} · ${esc(row.groupName)} · ${pill(row.status,label(row.status))}</p>
    <ol class="iw-history">${row.attempts.map(item=>`<li><time>${esc(date(item.submittedAtUtc))}</time>
      <div><strong>Attempt ${esc(item.attemptNo)}</strong><p class="tk-instructions">${esc(item.body || '')}</p>
      ${item.reviews.map(decision=>`<p><strong>${esc(label(decision.decision))} · ${esc(decision.reviewer)}</strong>
        <small>${esc(date(decision.decidedAtUtc))}</small></p>${decision.feedback ? '<p>'+esc(decision.feedback)+'</p>' : ''}
        ${decision.privateNote ? '<p><strong>Restricted note</strong> '+esc(decision.privateNote)+'</p>' : ''}`).join('')}</div></li>`).join('')}</ol>
      ${row.canReview ? `<div class="actions">${[['Approved','Approve'],['NeedsRevision','Request revision'],['Rejected','Reject']].map(([decision,text])=>
        u.button(text,'live-work-review',{decision},decision === 'Approved' ? 'button primary' : 'button quiet')).join('')}</div>` : ''}`);
}

function editor(data, initiative, ctx, existing, selected) {
  const id = existing?.id || crypto.randomUUID();
  const groupId = existing?.groupId || selected;
  const team = data.groups.find(row=>row.id === groupId);
  const eligible = data.students.filter(row=>row.groupId === groupId);
  const terms = existing?.terms;
  u.modal(existing ? 'Edit assignment' : 'Create assignment',`<p>${esc(team?.name)}</p>`+
    u.field('title','Title',terms?.title || '','text',true,'maxlength="200"')+
    u.area('instructions','Instructions and references',terms?.instructions || '',true)+
    u.field('starts','Start date and time',local(terms?.startsAtUtc),'datetime-local')+
    u.field('due','Due date and time',local(terms?.dueAtUtc),'datetime-local',true)+
    u.checkbox('required','Required assignment',terms?.isRequired ?? true)+
    u.checkbox('late','Allow late submissions',terms?.allowLate ?? false)+
    (existing ? u.area('reason','Reason for this change','',true) :
      `<fieldset class="iw-fieldset"><legend>Recipients</legend><p>Choose students or leave all boxes unchecked to assign the whole group.</p>
       ${eligible.map(row=>u.checkbox('recipient',row.name,false,row.id)).join('') || '<p>No eligible students are currently placed in this group.</p>'}</fieldset>`),
    async (values, form)=>{
      const recipients = [...form.querySelectorAll('[name=recipient]:checked')].map(row=>row.value);
      await workspaceRequest(api+'/coach/'+initiative+'/'+id,{groupId,title:values.title,instructions:values.instructions,
        startsAtUtc:values.starts ? new Date(values.starts).toISOString() : null,
        dueAtUtc:new Date(values.due).toISOString(),isRequired:form.elements.required.checked,
        allowLate:form.elements.late.checked,reason:values.reason,
        studentApplicationIds:!existing && recipients.length ? recipients : null,version:existing?.version ?? null},'PUT');
      await ctx.render();
      u.toast('Assignment saved.');
    },existing ? 'Save changes' : 'Publish assignment',{wide:true});
}

export async function action(action,target,ctx,data) {
  const row = data.work?.assignments.find(item=>item.id === target.dataset.id);
  if (action === 'live-assignment-create') {
    const open = data.work.groups.filter(team=>team.status === 'Open').map(team=>[team.id,team.name]);
    if (open.length === 1) { editor(data.work,data.id,ctx,null,open[0][0]); return; }
    u.modal('Choose a group',u.select('group','Group',open,open[0]?.[0],true),values=>{
      document.getElementById('workspace-dialog').addEventListener('close',()=>editor(data.work,data.id,ctx,null,values.group),{once:true});
    },'Continue');
  } else if (action === 'live-assignment-edit' && row) editor(data.work,data.id,ctx,row);
  else if (action === 'live-assignment-detail' && row) {
    u.modal(row.terms.title,`<p class="tk-instructions">${esc(row.terms.instructions)}</p><p>Due ${esc(date(row.terms.dueAtUtc))}</p>
      ${row.cancelReason ? '<p>'+esc(row.cancelReason)+'</p>' : ''}<h3>Version history</h3>
      ${row.history.length ? `<ol class="iw-history">${row.history.map(item=>`<li><time>${esc(date(item.changedAtUtc))}</time>
        <div><strong>Version ${esc(item.revisionNo)} · ${esc(item.title)}</strong><p>${esc(item.instructions)}</p>
        <p>Due ${esc(date(item.dueAtUtc))} · ${esc(item.reason || '')}</p></div></li>`).join('')}</ol>` : '<p>No earlier versions.</p>'}
      <h3>Current recipients</h3>${row.recipients.length ? u.table(['Student','Status'],row.recipients.map(item=>({cells:[
        esc(item.student),esc(label(item.status))]}))) : '<p>No current group recipients.</p>'}`,null,'Close',{readonly:true,wide:true});
  } else if (action === 'live-assignment-cancel' && row) {
    u.modal('Cancel assignment',u.area('reason','Reason','',true),async values=>{
      await workspaceRequest(api+'/coach/'+data.id+'/'+row.id+'/cancel',{version:row.version,reason:values.reason});
      await ctx.render();
    },'Cancel assignment');
  } else if (action === 'live-work-review' && data.review) {
    const item = data.review;
    const decision = target.dataset.decision;
    u.modal(label(decision),u.area('feedback','Feedback to student','',decision !== 'Approved')+
      u.area('privateNote','Restricted note for the reviewing Coach and Initiative Supervisors',''),async values=>{
      await workspaceRequest(api+'/review/'+data.id+'/'+item.id+'/'+item.recipientId,
        {attemptNo:item.lastAttemptNo,decision,feedback:values.feedback,privateNote:values.privateNote});
      await ctx.render();
      u.toast('Review saved.');
    },'Save review');
  }
}
