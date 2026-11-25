import * as u from '../ui.js';
import {card,emptyState,esc,head,pill,select,stat,stats,tabs} from './institution/common.js';
import * as groups from './institution/groups-live.js';
import {workspaceRequest} from '../workspace-api.js';
import * as work from './coach-work.js';
import * as reports from './reports-live.js';
import {loadGarden,renderLiveGarden} from './institution/garden.js';
import * as sessions from './institution/sessions-live.js';
import * as attendance from './attendance-live.js';
import {attendanceRequest} from '../attendance-api.js';

const login = '/src/pages/auth/login/login.html?returnUrl=%2Faccount%2Fprofile';
const workspace = (role,page,initiative) => (role === 'Coach' ? 'mentor' : 'supervisor')+'/'+page+'?initiative='+encodeURIComponent(initiative);
const date = value => value ? new Date(value).toLocaleString() : '—';
const pagesFor = role => role === 'Coach' ? ['dashboard','groups','assignments','reviews','reports','group-garden'] :
  ['dashboard','students','schedule','attendance','excuses','reports','group-garden'];
export const teamPath = id => 'organization/team?initiative='+encodeURIComponent(id);

export const request = (path,payload) => workspaceRequest('/api/initiative-staff/'+path,payload);

export async function load(route, signedIn) {
  try {
    if (route.area === 'auth' && route.page === 'staff-invitation') {
      if (!signedIn) return {guest:true};
      return {invitation:await respond(route,'inspect')};
    }
    const access = await request('mine');
    if (route.area === 'auth') return {access};
    const role = route.area === 'mentor' ? 'Coach' : 'Supervisor';
    if (!pagesFor(role).includes(route.page))
      return {error:'This page is unavailable in the live staff workspace.'};
    const attendancePage = role === 'Supervisor' && ['attendance','excuses'].includes(route.page);
    const scopes = attendancePage ? await attendanceRequest('/scopes/Supervisor') : access.filter(row=>row.role === role && row.canOpen);
    const selected = route.query.get('initiative');
    const id = selected || scopes[0]?.initiativeId;
    if (!id || !scopes.some(row=>row.initiativeId === id)) {
      const revoked = access.some(row=>row.role === role && row.status === 'Revoked' && (!id || id === row.initiativeId));
      return {error:revoked ? 'This appointment was revoked.' : 'An active appointment for this Initiative is required.'};
    }
    if (attendancePage) {
      const title = scopes.find(row=>row.initiativeId === id).title;
      return {access,scopes,role,id,scope:{initiative:{title}},attendance:await attendance.load(role,id,route.page,route.id)};
    }
    const path = 'scope/'+role+'/'+encodeURIComponent(id);
    const scope = await request(path);
    const group = route.page === 'groups' && route.id ? await request(path+'/groups/'+encodeURIComponent(route.id)) : null;
    const managedGroups = role === 'Supervisor' && route.page === 'students' ? await groups.load(id) : null;
    const assignments = role === 'Coach' && ['assignments','reviews'].includes(route.page) ? await work.load(id) : null;
    const review = role === 'Coach' && route.page === 'reviews' && route.id && route.tail ? await work.review(id,route.id,route.tail) : null;
    const reporting = route.page === 'reports' ? await reports.load(role,id,route.query) : null;
    const attendanceReport = route.page === 'reports' && role === 'Supervisor' ? await attendance.load(role,id,'attendance') : null;
    const garden = route.page === 'group-garden' ? await loadGarden(id,role) : null;
    const schedule = route.page === 'schedule' ? await sessions.load(role,id,route.id) : null;
    return {access,scopes,scope,group,managedGroups,role,id,work:assignments,review,reporting,attendanceReport,garden,schedule};
  } catch (error) { return {error:error.message}; }
}

function respond(route, action) {
  if (!route.id || !route.tail || !route.query.get('token')) throw new Error('This invitation link is incomplete.');
  return request('invitation/'+encodeURIComponent(route.id)+'/'+encodeURIComponent(route.tail)+'/'+action,
    {token:route.query.get('token')});
}

const accessLink = () => u.link('Staff appointments','auth/staff-access','button quiet');
const reloadButton = () => u.button('Refresh invitation','live-staff-refresh',{},'button quiet');

function renderInvitation(data) {
  if (data.guest) return u.header('STAFF INVITATION','Sign in to review your invitation',
    'Use the invited email address and your existing DeepSprout account. After signing in, return here and refresh the invitation.')+
    `<div class="actions"><a class="button primary" href="${login}" target="_blank" rel="noopener">Sign in (opens a new tab)</a>${reloadButton()}</div>`;
  if (data.error) return u.header('STAFF INVITATION','Invitation unavailable')+
    `<p class="panel form-error" role="alert">${esc(data.error)}</p><div class="actions">${reloadButton()}
      <a class="button quiet" href="/account/profile" target="_blank" rel="noopener">Manage signed-in account</a></div>`;
  const row = data.invitation;
  const title = row.status === 'Pending' ? 'Join '+(row.title || 'this Initiative')+' as '+row.role : 'Invitation '+row.status.toLowerCase();
  return u.header('STAFF INVITATION',title)+`<article class="panel staff-invite-card">
    <p class="eyebrow">${esc(row.institution)}</p><h2>${esc(row.title || 'Initiative')}</h2>
    <dl class="preview-facts"><div><dt>Role</dt><dd>${esc(row.role)}</dd></div><div><dt>Status</dt><dd>${pill(row.status)}</dd></div>
    <div><dt>Expires</dt><dd>${esc(date(row.expiresAtUtc))}</dd></div></dl>
    ${row.status === 'Pending' && !row.canRespond ? '<p>This Initiative is closed for staff invitations.</p>' : ''}
    <div class="actions">${row.canRespond ? u.button('Accept as '+row.role,'live-staff-accept',{},'button primary')+
      u.button('Decline','live-staff-decline',{},'button quiet') : ''}
    ${row.canOpen ? u.link('Open my workspace',workspace(row.role,'dashboard',row.initiativeId),'button primary') : ''}
    ${accessLink()}</div></article>`;
}

export function render(ctx) {
  const {route,staffData:data} = ctx;
  if (route.page === 'staff-invitation') return renderInvitation(data);
  if (data.error) return u.header('STAFF ACCESS','Workspace unavailable')+
    `<p class="panel form-error" role="alert">${esc(data.error)}</p>${accessLink()}`;
  if (route.area === 'auth') return u.header('YOUR WORKSPACES','Staff appointments')+card('Your Initiative appointments',
    data.access.length ? `<ul class="iw-mini-list">${data.access.map(row=>`<li><div><strong>${esc(row.title)}</strong>
      <small>${esc(row.institution)} · ${esc(row.role)}</small>
      ${row.revokedReason ? '<p>'+esc(row.revokedReason)+'</p>' : ''}
      ${row.status === 'Pending' ? '<p>Open the link from your Representative to respond.</p>' : ''}
      ${row.status === 'Active' && !row.canOpen ? '<p>This Initiative is closed for staff access.</p>' : ''}
      </div><div>${pill(row.status)}
      ${row.canOpen ? u.link('Open '+row.role+' workspace',workspace(row.role,'dashboard',row.initiativeId),'button quiet small') : ''}</div></li>`).join('')}</ul>` :
    '<p class="iw-muted">Your confirmed Initiative appointments will appear here.</p>');
  const row = data.scope.initiative;
  const groupsPath = workspace(data.role,'groups',data.id);
  const picker = select('live-staff-scope','Initiative',data.scopes.map(item=>[item.initiativeId,item.title]),data.id);
  if (data.attendance) return attendance.render(ctx,data.attendance,data.role,{id:data.id,title:row.title},picker);
  if (data.garden) return renderLiveGarden(data.garden,picker);
  if (data.schedule) return sessions.render(ctx,data.schedule,{id:data.id,title:row.title},picker);
  if (data.work) return work.render(ctx,data,picker);
  if (data.reporting) return reports.render(ctx,data.role,data.id,data.reporting,picker)+
    attendance.summary(ctx,data.attendanceReport,data.role,data.id);
  const header = head({eyebrow:data.role+' · '+row.institution,title:row.title,lead:row.summary,meta:picker,actions:accessLink()});
  if (data.managedGroups) return groups.render(ctx,data.managedGroups,{id:data.id,title:row.title},picker);
  if (data.group) return header + card(data.group.name,pill(data.group.status)+
    [data.group.purpose,data.group.description].filter(Boolean).map(value=>'<p>'+esc(value)+'</p>').join('')+
    u.link('Back to Assigned groups',groupsPath,'button quiet'))+
    card('Student roster',data.group.students.length ?
      u.table(['Student'],data.group.students.map(student=>({cells:[esc(student.name)]}))) :
      '<p class="iw-muted">No active students are placed in this group.</p>');
  if (route.page === 'groups') return header + card('Assigned groups',data.scope.groups.length ?
    u.table(['Group','Status',''],data.scope.groups.map(group=>({cells:[
      esc(group.name),pill(group.status),u.link('Open group',workspace(data.role,'groups/'+group.id,data.id),'button quiet small')]}))) :
    '<p class="iw-muted">You have no assigned groups for this Initiative.</p>');
  return header+stats([stat('Active','Appointment',{hint:data.role}),...(data.role === 'Coach' ?
    [stat(data.scope.groups.length,'Assigned groups',{href:groupsPath})] : [])]);
}

export const navigation = (items,area) => [...items,['group-garden','leaf','Group Garden']]
  .filter(([key])=>pagesFor(area === 'mentor' ? 'Coach' : 'Supervisor').includes(key));
export const navPath = (data,key) => workspace(data.role,key,data.id);

export function change(target,ctx) {
  if (target.name === 'live-staff-scope' && ctx.staffData.scope)
    ctx.go(workspace(ctx.staffData.role,ctx.route.page,target.value));
}

export function drop(detail,ctx) {
  const {managedGroups,id} = ctx.staffData;
  if (managedGroups) return groups.drop(detail,ctx,managedGroups,id);
}

export async function action(action,target,ctx) {
  if (ctx.staffData.attendance && action.startsWith('live-att-')) return attendance.action(action,target,ctx,ctx.staffData.attendance);
  if (ctx.staffData.work && (action.startsWith('live-assignment-') || action === 'live-work-review'))
    return work.action(action,target,ctx,ctx.staffData);
  if (ctx.staffData.reporting && action.startsWith('live-report-'))
    return reports.action(action,target,ctx,ctx.staffData.role,ctx.staffData.id,ctx.staffData.reporting);
  if (action.startsWith('live-group-') && ctx.staffData.managedGroups)
    return groups.action(action,target,ctx,ctx.staffData.managedGroups,{id:ctx.staffData.id,title:ctx.staffData.scope.initiative.title});
  if (action === 'live-staff-refresh') { location.reload(); return; }
  if (action === 'live-staff-accept') {
    target.disabled = true;
    try {
      const row = await respond(ctx.route,'accept');
      ctx.go(workspace(row.role,'dashboard',row.initiativeId));
    } finally { target.disabled = false; }
  }
  if (action === 'live-staff-decline')
    u.confirm('Decline this invitation?','The Representative will see your decision.',async ()=>{
      await respond(ctx.route,'decline');
      await ctx.render();
    });
}

export function submit(form,ctx) {
  if (form.dataset.form === 'live-report-period' && ctx.staffData.reporting) return reports.period(form,ctx);
}

export function renderTeam(ctx) {
  const {institutionData:data,workspacePath:path} = ctx;
  const initiative = data.staffInitiative;
  if (!initiative) return head({eyebrow:'TEAM & GROUPS',title:'Staff & invitations'})+
    emptyState('No published Initiatives yet.','Publish an Initiative before inviting its team.',
      u.link('Open Initiatives',path('organization/initiatives'),'button primary'));
  const {appointments,canInvite} = data.staff;
  const active = appointments.filter(row=>row.appointment.status === 'Active');
  const pending = appointments.filter(row=>row.appointment.status === 'Pending');
  const historical = appointments.filter(row=>!['Active','Pending'].includes(row.appointment.status));
  const initiativePicker = teamPicker(data);
  const invite = role=>u.button('Invite '+role,'live-team-invite',{role},role === 'Supervisor' ? 'button primary' : 'button secondary');
  const list = (rows,empty) => rows.length ? u.table(['Invitee','Role','Status','Dates','Actions'],rows.map(({appointment:a,staffName})=>{
    const controls = [u.button('Details','live-team-details',{id:a.id},'button quiet small')];
    if (a.status === 'Pending') controls.push(u.button('Cancel','live-team-cancel',{id:a.id},'button quiet small'));
    if (a.status === 'Active') controls.push(u.button('Revoke','live-team-revoke',{id:a.id},'button danger small'));
    return {search:staffName || a.email,status:a.status,cells:[
      `<strong>${esc(staffName || a.email)}</strong>${staffName ? '<small>'+esc(a.email)+'</small>' : ''}`,esc(a.role),pill(a.status),
      `<small>${a.acceptedAtUtc ? 'Accepted '+esc(date(a.acceptedAtUtc)) : 'Created '+esc(date(a.invitedAtUtc))}</small>
        ${a.status === 'Pending' ? '<small>Expires '+esc(date(a.expiresAtUtc))+'</small>' : ''}`,
      '<div class="actions">'+controls.join('')+'</div>']};
  })) : '<p class="iw-muted">'+esc(empty)+'</p>';
  return teamTabs(ctx,initiative,'staff')+
    head({eyebrow:'TEAM & GROUPS',title:'Staff & invitations',lead:initiative.title,meta:initiativePicker,
      actions:canInvite ? invite('Supervisor')+invite('Coach') : ''})+
    stats([stat(active.filter(row=>row.appointment.role === 'Supervisor').length,'Active Supervisors',{of:3}),
      stat(active.filter(row=>row.appointment.role === 'Coach').length,'Active Coaches'),stat(pending.length,'Pending invitations')])+
    card('Active staff',list(active,'Nobody has accepted yet.'))+
    card('Pending invitations',list(pending,'There are no pending invitations.'))+
    card('Invitation and appointment history',list(historical,'There are no ended appointments.'));
}

export function teamPicker(data) {
  return select('live-team-initiative','Initiative',data.initiatives.filter(i=>i.version)
    .map(i=>[i.id,i.title]),data.staffInitiative.id);
}

export function teamTabs(ctx, initiative, active) {
  const path = teamPath(initiative.id);
  return tabs([['Staff & invitations',ctx.workspacePath(path),'staff'],
    ['Groups & allocation',ctx.workspacePath(path+'&tab=groups'),'groups']],active);
}

export async function teamAction(action,target,ctx) {
  const initiative = ctx.institutionData.staffInitiative;
  if (!initiative) return;
  const base = 'owned/'+initiative.id;
  if (action === 'live-team-invite') {
    const role = target.dataset.role;
    u.modal('Invite a '+role,`<p>The invitation is scoped to <strong>${esc(initiative.title)}</strong>.</p>`+
      u.field('email','Email address','','email',true,'maxlength="320"'),async values=>{
        const saved = await request(base,{email:values.email,role});
        const url = new URL('/workspaces.html?partner=live&staffInvite=1',location.origin);
        url.hash = '/auth/staff-invitation/'+initiative.id+'/'+saved.id+'?token='+saved.token;
        document.getElementById('workspace-dialog').addEventListener('close',()=>u.modal('Invitation ready to share',
          '<p>Copy the private link and share it with the invited person. The link expires '+esc(date(saved.expiresAtUtc))+'.</p>'+
          u.field('link','Invitation link',url.href,'text',false,'readonly')+
          u.button('Copy link','live-team-copy',{},'button quiet'),null,'Close',{readonly:true}),{once:true});
        await ctx.render();
      },'Create invitation');
  } else if (action === 'live-team-copy') {
    const input = document.querySelector('#workspace-dialog [name=link]');
    if (!input) return;
    input.select();
    try { await navigator.clipboard.writeText(input.value); u.toast('Invitation link copied.'); }
    catch { u.toast('Select and copy the invitation link.',true); }
  } else if (action === 'live-team-details') {
    const {appointment,history} = await request(base+'/'+target.dataset.id);
    u.modal('Appointment history',`<p>${esc(appointment.email)} · ${esc(appointment.role)} · ${esc(appointment.status)}</p>`+
      (history.length ? `<ol class="iw-history">${history.map(row=>`<li><time>${esc(date(row.atUtc))}</time><span>
        <strong>${esc(row.afterStatus || row.action)}</strong>${row.reason ? '<small>'+esc(row.reason)+'</small>' : ''}</span>
        <small>${esc([row.actor,row.actorCapacity].filter(Boolean).join(' · '))}</small></li>`).join('')}</ol>` :
        '<p>There is no recorded decision history.</p>'),null,'Close',{readonly:true,wide:true});
  } else if (action === 'live-team-cancel' || action === 'live-team-revoke') {
    const revoke = action === 'live-team-revoke';
    u.modal(revoke ? 'Revoke access?' : 'Cancel invitation?',
      revoke ? u.area('reason','Reason (shared with the staff member)','',true) :
        '<p>The invited person will no longer be able to accept this link.</p>',
      async values=>{
        await request(base+'/'+target.dataset.id+(revoke ? '/revoke' : '/cancel'),{reason:values.reason});
        await ctx.render();
        u.toast(revoke ? 'Appointment revoked.' : 'Invitation cancelled.');
      },revoke ? 'Revoke access' : 'Cancel invitation');
  }
}
