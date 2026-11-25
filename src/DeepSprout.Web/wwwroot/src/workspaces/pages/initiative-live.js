import * as u from '../ui.js';
import {initiativeBuilder} from '../builders/initiative.js';
import {builderAction} from '../builders/engine.js';
import {modesFor} from '../commands/institution.js';
import {renderDashboard,renderInitiativeDetail,renderInitiativeList} from './institution/initiatives.js';
import {renderCreate,createAction,createChange} from './institution/create.js';
import * as admissions from './institution/participants-live.js';
import * as staff from './staff-live.js';
import * as groups from './institution/groups-live.js';
import * as reports from './reports-live.js';
import {select} from './institution/common.js';
import {loadGarden,renderLiveGarden} from './institution/garden.js';
import * as sessions from './institution/sessions-live.js';
import * as attendance from './attendance-live.js';

export function workspacePath(institution, path) {
  return path+(path.includes('?') ? '&' : '?')+'institution='+encodeURIComponent(institution);
}

async function request(path, method='GET', body, api='/api/initiatives/owned') {
  const headers = {Accept:'application/json'};
  if (method !== 'GET') {
    const session = await fetch('/account/session', {cache:'no-store',redirect:'manual'});
    if (!session.ok) throw new Error('Sign in again to continue.');
    headers.RequestVerificationToken = (await session.json()).requestToken;
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(api+path,{method,headers,cache:'no-store',
    body:body === undefined ? undefined : JSON.stringify(body)});
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sign in again to continue.');
    if (response.status === 403) throw new Error('This decision is unavailable to your account.');
    if (response.status === 404) throw new Error('This Initiative or Institution is unavailable to your account.');
    const type = response.headers.get('content-type') || '';
    if (response.status < 500 && type.includes('text/plain')) throw new Error(await response.text());
    if (response.status < 500 && type.includes('json')) {
      const problem = await response.json();
      if (typeof problem === 'string') throw new Error(problem);
      if (response.status === 400) throw new Error(Object.values(problem.errors || {}).flat().join(' ') || 'Check the form fields and try again.');
    }
    throw new Error('Initiative data could not be loaded or saved. Try again.');
  }
  return response.json();
}

const admissionRequest = (path,method,body)=>request(path,method,body,'/api/initiative-applications/owned');
const selection = id => '?institution='+encodeURIComponent(id);
const entry = item => ({
  ...item.draft, title:item.title || item.draft?.title || 'Untitled initiative', id:item.id, ownerId:item.institutionId,
  status:item.status, version:item.revision, modes:modesFor(item.draft?.deliveryMode), cancelReason:item.cancellationReason,
  admissionLive:true,
  accepted:item.accepted, suspended:item.suspended, pending:item.pending, queued:item.queued,
  discoverable:item.discoverable,
  applicationWindow:{NotPublished:'Not published',Closed:'Closed',Upcoming:'Scheduled',InWindow:'Within application window'}[item.registration],
  history:item.savedAt ? [{at:item.savedAt}] : []
});

export async function load(route, profile) {
  if (route.page === 'initiatives' && route.id && route.id !== 'new') {
    const revision = route.query.get('revision');
    const record = await request('/'+encodeURIComponent(route.id)+(revision ? '?revision='+encodeURIComponent(revision) : ''));
    if (record.initiative.institutionId !== profile.id) throw new Error('This Initiative belongs to a different Institution.');
    return {profile,record};
  }
  if (route.page === 'initiatives' && route.id === 'new') return {profile};
  const initiatives = (await request(selection(profile.id))).map(entry);
  if (['attendance','excuses'].includes(route.page)) {
    const published = initiatives.filter(item=>item.version);
    const id = route.query.get('initiative');
    const attendanceInitiative = id ? published.find(item=>item.id === id) : published[0];
    if (id && !attendanceInitiative) return {profile,error:'This Initiative is unavailable to your Institution.'};
    return {profile,initiatives,attendanceInitiative,attendance:attendanceInitiative ?
      await attendance.load('Representative',attendanceInitiative.id,route.page,route.id) : null};
  }
  if (route.page === 'sessions') {
    const published = initiatives.filter(item=>item.version);
    const id = route.query.get('initiative');
    const sessionInitiative = id ? published.find(item=>item.id === id) :
      published.find(item=>['Published','RegistrationClosed'].includes(item.status)) || published[0];
    if (id && !sessionInitiative) return {profile,error:'This Initiative is unavailable to your Institution.'};
    return {profile,initiatives,sessionInitiative,schedule:sessionInitiative ?
      await sessions.load('Representative',sessionInitiative.id,route.id) : null};
  }
  if (route.page === 'group-garden') {
    const published = initiatives.filter(item=>item.version);
    const id = route.query.get('initiative');
    const selected = id ? published.find(item=>item.id === id) : published[0];
    if (id && !selected) return {profile,error:'This Initiative is unavailable to your Institution.'};
    return {profile,initiatives,garden:selected ? await loadGarden(selected.id,'Representative') : null};
  }
  if (route.page === 'reports') {
    const published = initiatives.filter(item=>item.version);
    const id = route.query.get('initiative');
    const initiative = id ? published.find(item=>item.id === id) :
      published.find(item=>item.status === 'Published') || published[0];
    if (id && !initiative) return {profile,error:'This Initiative is unavailable to your Institution.'};
    const [reporting,attendanceReport] = await (initiative ? Promise.all([
      reports.load('Representative',initiative.id,route.query),attendance.load('Representative',initiative.id,'attendance')]) : [null,null]);
    return {profile,initiatives,reportInitiative:initiative,reporting,attendanceReport};
  }
  if (route.page === 'team') {
    const published = initiatives.filter(item=>item.version);
    const id = route.query.get('initiative');
    const staffInitiative = id ? published.find(item=>item.id === id) :
      published.find(item=>['Published','RegistrationClosed'].includes(item.status)) || published[0];
    if (id && !staffInitiative) return {profile,error:'This Initiative is unavailable to your Institution.'};
    if (route.query.get('tab') === 'groups')
      return {profile,initiatives,staffInitiative,groups:staffInitiative ? await groups.load(staffInitiative.id) : null};
    return {profile,initiatives,staffInitiative,staff:staffInitiative ? await staff.request('owned/'+staffInitiative.id) : null};
  }
  if (route.page !== 'participants') return {profile,initiatives};
  const published = initiatives.filter(item=>item.version);
  const id = route.query.get('initiative');
  const admissionInitiative = id ? published.find(item=>item.id === id) :
    published.find(item=>item.status === 'Published') || published[0];
  if (id && !admissionInitiative) return {profile,error:'This Initiative is unavailable to your Institution.'};
  const applications = admissionInitiative ? await admissionRequest('/'+admissionInitiative.id) : [];
  return {profile,initiatives,admissionInitiative,applications};
}

function builderContext(ctx) {
  const org = ctx.institutionData.profile;
  const path = value=>workspacePath(org.id, value);
  const s = {initiatives:ctx.institutionData.initiatives || [], experiences:[], competitions:[], programs:[],
    builderDrafts:{}, admissions:[], sessions:[], groups:[], grants:[], assignments:[], submissions:[], people:[]};
  return {...ctx,s,liveInstitution:{...org,city:org.headquartersCity},workspacePath:path,
    go:value=>ctx.go(path(value)), saveInitiative:(draft,publish)=>save(ctx, path, draft, publish)};
}

export function render(ctx) {
  const scoped = builderContext(ctx);
  const {route:r,institutionData:data} = scoped;
  if (r.page === 'dashboard') return renderDashboard(scoped,data.initiatives);
  if (r.page === 'participants') return admissions.render(scoped);
  if (['attendance','excuses'].includes(r.page)) {
    const picker = data.attendanceInitiative ? select('live-attendance-initiative','Initiative',data.initiatives.filter(item=>item.version)
      .map(item=>[item.id,item.title]),data.attendanceInitiative.id) : '';
    return attendance.render(scoped,data.attendance,'Representative',data.attendanceInitiative,picker);
  }
  if (r.page === 'sessions') {
    const picker = data.sessionInitiative ? select('live-session-initiative','Initiative',data.initiatives.filter(item=>item.version)
      .map(item=>[item.id,item.title]),data.sessionInitiative.id) : '';
    return sessions.render(scoped,data.schedule,data.sessionInitiative,picker);
  }
  if (r.page === 'group-garden') {
    const picker = data.garden ? select('live-garden-initiative','Initiative',data.initiatives.filter(item=>item.version)
      .map(item=>[item.id,item.title]),data.garden.initiativeId) : '';
    return renderLiveGarden(data.garden,picker);
  }
  if (r.page === 'reports') {
    if (!data.reporting) return u.header('INSTITUTION REPORTS','Reports from your supervisors','There are no published Initiatives to report on.');
    const picker = select('live-report-initiative','Initiative',data.initiatives.filter(item=>item.version)
      .map(item=>[item.id,item.title]),data.reportInitiative.id);
    return reports.render(scoped,'Representative',data.reportInitiative.id,data.reporting,picker)+
      attendance.summary(scoped,data.attendanceReport,'Representative',data.reportInitiative.id);
  }
  if (r.page === 'team') {
    if (data.groups) return staff.teamTabs(scoped,data.staffInitiative,'groups')+
      groups.render(scoped,data.groups,data.staffInitiative,staff.teamPicker(data));
    return staff.renderTeam(scoped);
  }
  if (r.page === 'create') return renderCreate(scoped);
  if (!r.id) return renderInitiativeList(scoped,data.initiatives);
  if (r.id === 'new') return initiativeBuilder(scoped);
  const item = entry(data.record.initiative);
  if (r.tail === 'edit' && !r.query.has('revision') && ['Draft','Published'].includes(item.status))
    return initiativeBuilder(scoped,{...item,title:data.record.initiative.draft?.title || ''});
  return renderInitiativeDetail(scoped,item);
}

async function save(ctx, path, draft, publish) {
  const record = ctx.institutionData.record?.initiative;
  if (record?.status === 'Published' && !publish) {
    await ctx.render();
    return;
  }
  const id = record?.id || (draft.requestId ||= crypto.randomUUID());
  const version = draft.serverVersion;
  // The old form represents an unset age as an empty string.
  const details = {...draft,minAge:draft.minAge === '' ? null : draft.minAge,
    maxAge:draft.maxAge === '' ? null : draft.maxAge};
  if (publish) {
    const revising = record?.status === 'Published';
    const published = await request('/'+id+(revising ? '/revise' : '/publish'),'POST',
      revising ? {draft:details,version,reason:draft.revisionReason} : {version});
    delete ctx.localUI.initiativeBuilder;
    ctx.go(path('organization/initiatives/'+id));
    u.toast(published.discoverable ? 'Published to regular Explore.' : 'Initiative published.');
    return;
  }

  const saved = await request('/'+id+'/draft'+selection(ctx.institutionData.profile.id),'PUT',
    {draft:details,stage:draft.step,version});
  draft.serverVersion = saved.version;
  draft.savedAt = saved.savedAt;
  if (!record) ctx.go(path('organization/initiatives/'+id+'/edit'));
  else await ctx.render();
}

export async function action(action,target,ctx) {
  const scoped = builderContext(ctx);
  if (ctx.institutionData.attendance && action.startsWith('live-att-'))
    return attendance.action(action,target,scoped,ctx.institutionData.attendance);
  if (ctx.route.page === 'sessions' && ctx.institutionData.schedule && action.startsWith('live-session-'))
    return sessions.action(action,scoped,ctx.institutionData.schedule,ctx.institutionData.sessionInitiative);
  if (ctx.route.page === 'participants') return admissions.action(action,target,scoped,admissionRequest);
  if (ctx.route.page === 'reports' && ctx.institutionData.reporting)
    return reports.action(action,target,scoped,'Representative',ctx.institutionData.reportInitiative.id,ctx.institutionData.reporting);
  if (ctx.route.page === 'team') return ctx.institutionData.groups ?
    groups.action(action,target,scoped,ctx.institutionData.groups,ctx.institutionData.staffInitiative) : staff.teamAction(action,target,scoped);
  if (createAction(action,target,scoped)) return;
  if (target.closest('[data-form=builder]')) {
    await builderAction(action,target,scoped);
    return;
  }
  const record = ctx.institutionData.record?.initiative;
  if (!record || ctx.route.query.has('revision')) return;
  const path = '/'+record.id;
  const change = (destination,reason) => request(path+destination,'POST',{version:record.version,reason});
  if (action === 'initiative-cancel') {
    u.modal('Cancel this initiative?',u.area('reason','Cancellation reason','',true),async values=>{
      await change('/status/Cancelled',values.reason);
      await ctx.render();
    },'Cancel initiative');
    return;
  }
  if (action === 'initiative-archive') {
    u.confirm('Archive this initiative?', 'It leaves Explore. Published revisions stay in the Institution history.',async ()=>{
      await change('/status/Archived');
      await ctx.render();
    });
    return;
  }
  const transitions = {'initiative-reg-open':'/status/Published','initiative-reg-close':'/status/RegistrationClosed'};
  if (transitions[action]) {
    await change(transitions[action]);
    await ctx.render();
  }
}

export function change(target,ctx) {
  if (target.name === 'live-attendance-initiative') {
    builderContext(ctx).go('organization/'+ctx.route.page+'?initiative='+encodeURIComponent(target.value));
    return;
  }
  if (target.name === 'live-session-initiative') {
    builderContext(ctx).go('organization/sessions?initiative='+encodeURIComponent(target.value));
    return;
  }
  if (ctx.route.page === 'group-garden' && target.name === 'live-garden-initiative') {
    builderContext(ctx).go('organization/group-garden?initiative='+encodeURIComponent(target.value));
    return;
  }
  if (ctx.route.page === 'reports' && target.name === 'live-report-initiative') {
    builderContext(ctx).go('organization/reports?initiative='+encodeURIComponent(target.value));
    return;
  }
  if (ctx.route.page === 'team' && target.name === 'live-team-initiative') {
    builderContext(ctx).go(staff.teamPath(target.value)+(ctx.route.query.get('tab') === 'groups' ? '&tab=groups' : ''));
    return;
  }
  if (ctx.route.page === 'participants' && target.name === 'live-admission-initiative') {
    const scoped = builderContext(ctx);
    scoped.go(admissions.queuePath(target.value));
    return;
  }
  const scoped = builderContext(ctx);
  if (createChange(target,scoped)) return;
  const form = target.closest('[data-form=builder]');
  const active = ctx.localUI.activeBuilder;
  const redraw = ['deliveryMode','topic','country','coverImage','platform','offerManual'];
  if (!form || !active || !(redraw.includes(target.name) || target.name?.startsWith('format-') ||
      target.name?.startsWith('mapCenter'))) return;
  active.config.capture(active.draft,u.formValues(form),form);
  ctx.render();
}

export function submit(form,ctx) {
  if (form.dataset.form === 'live-report-period') return reports.period(form,builderContext(ctx));
}

export function drop(detail,ctx) {
  const {groups:team,staffInitiative} = ctx.institutionData;
  if (team && staffInitiative) return groups.drop(detail,ctx,team,staffInitiative.id);
}
