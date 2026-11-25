import * as u from '../ui.js';
import {card,esc,head,pill,stat,stats} from './institution/common.js';
import {workspaceRequest} from '../workspace-api.js';
import {review as loadReview,reviewCard} from './coach-work.js';

const base = (role,id) => '/api/initiative-reports/'+role+'/'+encodeURIComponent(id);
const labels = {assignments:'Assignments',assignedTasks:'Assigned tasks',submittedTasks:'Submitted tasks',
  approvedTasks:'Approved tasks',pendingReviews:'Pending reviews',needsRevision:'Needs revision',rejected:'Rejected',
  overdue:'Overdue work',cancelled:'Cancelled'};
const date = value => value ? new Date(value).toLocaleString() : '—';
export function load(role,id,query) {
  const filters = new URLSearchParams();
  for (const key of ['from','to','group']) if (query.get(key)) filters.set(key,query.get(key));
  return workspaceRequest(base(role,id)+(filters.size ? '?'+filters : ''));
}

function narratives(row) {
  const item = row.narrative || {};
  return [['Observations',item.observations],['Issues',item.issues],['Recommendations',item.recommendations],
    ['Supervisor review',row.review?.note],['Correction',row.review?.correction]]
    .filter(([,text])=>text).map(([name,text])=>`<section><h3>${esc(name)}</h3><p class="tk-instructions">${esc(text)}</p></section>`).join('');
}

export function render(ctx, role, id, data, picker) {
  const canWrite = role !== 'Representative' && (role !== 'Coach' || data.groups.length);
  const staff = role !== 'Representative';
  const open = role === 'Representative' ? data.reports.filter(row=>row.kind === 'InitiativeSupervisor') : data.reports;
  const records = data.records?.length ? u.table(['Assignment','Group','Student','Status','Attempts',''],data.records.map(row=>({cells:[
    esc(row.title),esc(row.groupName),esc(row.student),pill(row.status),esc(row.attempts),
    row.attempts ? u.button('View source','live-report-source',{assignment:row.assignmentId,student:row.recipientId},'button quiet small') : ''
  ]}))) : '';
  const list = open.length ? u.table(['Report','Author','Period','Status','Actions'],open.map(row=>({cells:[
    esc(row.kind === 'Coach' ? row.groupName || 'Coach report' : 'Supervisor summary'),esc(row.author),
    esc(row.from+' – '+row.to),pill(row.status),
    `<div class="actions">${u.button('Details','live-report-detail',{id:row.id},'button quiet small')}
      ${row.canEdit ? u.button('Edit draft','live-report-edit',{id:row.id},'button quiet small') : ''}
      ${role === 'Supervisor' && row.kind === 'Coach' && row.status === 'Submitted' && !row.reviewedAtUtc ?
        u.button('Review report','live-report-review',{id:row.id},'button quiet small') : ''}</div>`
  ]}))) : '<p>No reports are available in this Initiative.</p>';
  const heading = role === 'Representative' ? 'Reports from your supervisors' : role === 'Supervisor' ? 'Insights & reports' : 'Coach reports';
  const filters = `<form data-form="live-report-period" class="form-grid">${u.field('from','Period from',data.from,'date',true)}
    ${u.field('to','Period to',data.to,'date',true)}
    ${role === 'Coach' ? u.select('group','Group',[['','All assigned groups'],...data.groups.map(row=>[row.id,row.name])],ctx.route.query.get('group') || '') : ''}
    <div><button class="button quiet" type="submit">Apply period</button></div><p class="form-error" role="alert"></p></form>`;
  return `<div class="${staff ? '' : 'ir'}">`+
    head({eyebrow:role.toUpperCase()+' · INITIATIVE REPORTS',title:heading,meta:picker,
      actions:canWrite ? u.button(role === 'Coach' ? 'Prepare Coach report' : 'Prepare summary','live-report-create',{},'button primary') : ''})+
    card('Reporting period',filters+'<p>Counts cover work assigned during this period, using current SQL statuses.</p>')+
    stats(Object.entries(data.metrics).map(([key,value])=>stat(value,labels[key] || key)))+
    (records ? card('Assignment and review records',records) : '')+
    card(role === 'Representative' ? 'Received Supervisor summaries' : 'Reports',list)+'</div>';
}

function editor(ctx,role,id,data,row) {
  const reportId = row?.id || crypto.randomUUID();
  const candidates = data.reports.filter(item=>item.kind === 'Coach' && item.reviewedAtUtc && !item.isIncluded);
  u.modal(row ? 'Edit report draft' : role === 'Coach' ? 'Prepare Coach report' : 'Prepare Supervisor summary',
    (role === 'Coach' && !row ? u.select('group','Group',data.groups.map(item=>[item.id,item.name]),
      ctx.route.query.get('group') || data.groups[0]?.id,true) : '')+
    u.field('from','Period from',row?.from || data.from,'date',true)+u.field('to','Period to',row?.to || data.to,'date',true)+
    u.area('observations',role === 'Coach' ? 'Observations' : 'Summary',row?.narrative?.observations || '')+
    u.area('issues','Issues',row?.narrative?.issues || '')+u.area('recommendations','Recommendations',row?.narrative?.recommendations || '')+
    (role === 'Supervisor' && candidates.length ? `<fieldset class="iw-fieldset"><legend>Include reviewed Coach reports on submission</legend>
      ${candidates.map(item=>u.checkbox('child',`${item.groupName || 'Coach report'} · ${item.author} · ${item.from} – ${item.to}`,false,item.id)).join('')}</fieldset>` : '')+
    u.checkbox('publish','Submit report now'),async (values,form)=>{
      await workspaceRequest(base(role,id)+'/'+reportId,{from:values.from,to:values.to,groupId:row?.groupId || values.group || null,
        observations:values.observations,issues:values.issues,recommendations:values.recommendations,
        submit:form.elements.publish.checked,version:row?.version ?? null,
        coachReportIds:[...form.querySelectorAll('[name=child]:checked')].map(item=>item.value)},'PUT');
      await ctx.render();
      u.toast('Report saved.');
    },'Save report',{wide:true});
}

export async function action(action,target,ctx,role,id,data) {
  const row = data.reports.find(item=>item.id === target.dataset.id);
  if (action === 'live-report-create') editor(ctx,role,id,data);
  else if (action === 'live-report-edit' && row?.canEdit) editor(ctx,role,id,data,row);
  else if (action === 'live-report-source' && role === 'Supervisor') {
    const details = await loadReview(id,target.dataset.assignment,target.dataset.student);
    u.modal('Original submission record',reviewCard({...details,canReview:false}),null,'Close',{readonly:true,wide:true});
  } else if (action === 'live-report-detail' && row) {
    const children = data.reports.filter(item=>item.includedIn === row.id);
    const snapshot = item => item.snapshot?.metrics ? `<dl class="preview-facts">${Object.entries(item.snapshot.metrics)
      .map(([key,value])=>`<div><dt>${esc(labels[key] || key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
      <p>Snapshot ${esc(date(item.snapshot.asOfUtc))}${item.snapshot.assignmentIds ?
        ' · '+esc(item.snapshot.assignmentIds.length)+' source assignment(s)' : ''}</p>` : '';
    u.modal(row.kind === 'Coach' ? 'Original Coach report' : 'Supervisor summary',`<p>${esc(row.author)} · ${esc(row.from)} – ${esc(row.to)}</p>`+
      narratives(row)+snapshot(row)+
      (children.length ? `<h3>Included Coach reports</h3>${children.map(item=>`<details class="iw-more">
        <summary>${esc(item.groupName || 'Coach report')} · ${esc(item.author)}</summary>
        ${narratives(item)}${snapshot(item)}</details>`).join('')}` : ''),null,'Close',{readonly:true,wide:true});
  } else if (action === 'live-report-review' && row && role === 'Supervisor') {
    u.modal('Review Coach report',narratives(row)+u.area('note','Review note','')+u.area('correction','Correction (optional)',''),
      async values=>{
        await workspaceRequest(base(role,id)+'/'+row.id+'/review',{version:row.version,note:values.note,correction:values.correction});
        await ctx.render();
      },'Save review',{wide:true});
  }
}

export function period(form,ctx) {
  const params = new URLSearchParams(ctx.route.query);
  params.delete('institution');
  for (const key of ['from','to','group']) {
    const value = form.elements[key]?.value;
    if (value) params.set(key,value); else params.delete(key);
  }
  ctx.go(ctx.route.area+'/reports?'+params);
}
