import * as u from '../../ui.js';
import {esc,head,card,pill,select,stat,stats,emptyState} from './common.js';
import {workspaceRequest} from '../../workspace-api.js';

const path = id => '/api/initiative-groups/manage/'+encodeURIComponent(id);
const date = value => value ? u.date(value) : '';
export const load = id => workspaceRequest(path(id));

export function render(ctx, team, initiative, picker) {
  const {groups,students,coaches,canManage} = team;
  const unplaced = students.filter(student=>!student.groupId);
  const studentsList = (items,current) => items.length ? `<ul class="iw-students">
    ${items.map(student=>`<li class="iw-student"${canManage ? ` draggable="true" data-drag-person="${esc(student.id)}"` : ''}>${u.avatar(student.name)}<span class="iw-student-text"><b>${esc(student.name)}</b></span>
      ${canManage && (current || groups.some(item=>item.status === 'Open')) ?
        u.button(current ? 'Move or remove' : 'Add to group','live-group-place',{id:student.id},'button quiet small') : ''}</li>`).join('')}</ul>` :
    '<p class="iw-muted">No active students here.</p>';
  const create = canManage ? u.button('Create group','live-group-create',{},'button primary') : '';
  return head({eyebrow:'TEAM & GROUPS',title:'Students & Groups',lead:initiative.title,meta:picker,actions:create})
    + stats([stat(students.length,'Accepted students'),stat(groups.length,'Groups'),stat(coaches.length,'Active Coaches'),stat(unplaced.length,'Need a group')])
    + card('Accepted students without a group',`<div ${canManage ? 'data-drop-group="" data-live-group-drop' : ''}>${studentsList(unplaced,false)}</div>`)
    + (groups.length ? `<div class="iw-board">${groups.map(item=>`<article class="iw-gcard iw-reveal" style="--h:${u.hueOf(item.id)}"
      ${canManage && item.status === 'Open' ? `data-drop-group="${esc(item.id)}" data-live-group-drop` : ''}>
      <header><span class="iw-gdot" aria-hidden="true"></span><div class="iw-gtitle"><h3>${esc(item.name)}</h3>
        ${item.purpose ? '<p>'+esc(item.purpose)+'</p>' : ''}</div>
        <span class="iw-gcount" title="Current placements">${esc(item.placements)}${item.capacity ? ' / '+esc(item.capacity) : ''}</span></header>
      <div class="iw-gcoach"><span class="iw-gcoach-label">Coach</span><span>${esc(item.coachName || 'Unassigned')}</span></div>
      <div class="actions">${pill(item.status)}
        ${canManage && item.status !== 'Archived' ? u.button('Edit group','live-group-edit',{id:item.id},'button quiet small') : ''}
        ${canManage && (item.status === 'Open' || item.status === 'Closed' && item.hasCoachAllocation) ?
          u.button(item.hasCoachAllocation ? 'Change Coach' : 'Assign Coach','live-group-coach',{id:item.id},'button quiet small') : ''}
        ${u.button('History','live-group-history',{id:item.id},'button quiet small')}</div>
      ${studentsList(students.filter(student=>student.groupId === item.id),true)}
    </article>`).join('')}</div>` : emptyState('No groups yet.','Create a group before placing accepted students.'));
}

export async function drop({student:studentId,groupId},ctx,team,initiativeId) {
  const student = team.students.find(row=>row.id === studentId);
  if (!team.canManage || !student || student.groupId === groupId) return;
  await workspaceRequest(path(initiativeId)+'/students/'+student.id,{groupId,version:student.version},'PUT');
  await ctx.render();
}

export async function action(action,target,ctx,team,initiative) {
  const base = path(initiative.id);
  const group = team.groups.find(row=>row.id === target.dataset.id);
  const save = async (url, values) => {
    await workspaceRequest(url,values,'PUT');
    await ctx.render();
  };
  if (action === 'live-group-create' || action === 'live-group-edit' && group) {
    const id = group?.id || crypto.randomUUID();
    u.modal(group ? 'Edit group' : 'Create group',
      u.field('name','Group name',group?.name || '','text',true,'maxlength="160"')+
      u.area('purpose','Note for staff',group?.purpose || '')+
      u.area('description','Description shared with students',group?.description || '')+
      u.field('capacity','Capacity (optional)',group?.capacity ?? '','number',false,'min="1" max="500" step="1"')+
      (group ? u.select('status','Group status',['Open','Closed'],group.status) : ''),
      values=>save(base+'/'+id,{...values,status:values.status || 'Open',capacity:values.capacity ? Number(values.capacity) : null,
        version:group?.version ?? null}),group ? 'Save group' : 'Create group');
  } else if (action === 'live-group-place') {
    const student = team.students.find(row=>row.id === target.dataset.id);
    if (!student) return;
    const options = team.groups.filter(row=>row.status === 'Open' && row.id !== student.groupId).map(row=>[row.id,row.name]);
    if (student.groupId) options.unshift(['','Remove from group']);
    u.modal(student.groupId ? 'Move or remove student' : 'Add student to group',`<p>${esc(student.name)}</p>`+
      u.select('group','Destination group',options,options[0]?.[0]),values=>save(base+'/students/'+student.id,
      {groupId:values.group || null,version:student.version}),'Save placement');
  } else if (action === 'live-group-coach' && group) {
    const options = [['','Unassigned'],...(group.status === 'Open' ? team.coaches.map(row=>[row.id,row.name]) : [])];
    u.modal('Allocate Coach',u.select('coach','Coach',options,group.appointmentId || ''),values=>
      save(base+'/'+group.id+'/coach',{appointmentId:values.coach || null,version:group.version}),'Save Coach');
  } else if (action === 'live-group-history' && group) {
    const {audit,periods} = await workspaceRequest(base+'/'+group.id+'/history');
    u.modal('Group history',`<p>${esc(group.name)}</p><h3>Placements</h3>`+
      (periods.length ? u.table(['Student','From','Until','Status'],periods.map(row=>({cells:[
        esc(row.student),esc(date(row.startedAtUtc)),esc(date(row.endedAtUtc)),esc(row.endReason || row.status)]}))) :
        '<p>No placements recorded.</p>')+
      `<h3>Changes</h3>${audit.length ? `<ol class="iw-history">${audit.map(row=>`<li>
        <time>${esc(date(row.atUtc))}</time><span>${esc(row.action)}${row.student ? ' · '+esc(row.student) : ''}
        ${row.reason ? '<small>'+esc(row.reason)+'</small>' : ''}</span>
        <small>${esc([row.actor,row.actorCapacity].filter(Boolean).join(' · '))}</small></li>`).join('')}</ol>` :
        '<p>No changes recorded.</p>'}`,null,'Close',{readonly:true,wide:true});
  }
}
