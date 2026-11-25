import * as u from '../../ui.js';
import {card,emptyState,esc,head,pill,tabs,withInitiative} from './common.js';
import {monthCalendar} from './operations.js';
import {mapUrl} from '../../session-access.js';
import {sessionRequest,sessionMode,sessionModes,sessionLocal,sessionWhen} from '../../session-api.js';

const base = (role,initiative) => '/manage/'+role+'/'+encodeURIComponent(initiative);
export const load = (role,initiative,id) => sessionRequest(base(role,initiative)+(id ? '/'+encodeURIComponent(id) : ''));
const path = (ctx,id) => ctx.route.area+'/'+ctx.route.page+(id ? '/'+id : '');
const scoped = (ctx,initiative,route) => (ctx.workspacePath || (value=>value))(withInitiative(route,initiative));
const stamp = value => new Date(value.endsWith('Z') ? value : value+'Z').toLocaleString();
const seats = session => sessionModes(session).map(({mode,used,capacity}) =>
  sessionMode(mode)+' '+used+(capacity === null ? ' registered' : ' / '+capacity)).join(' · ');

export function render(ctx,data,initiative,picker) {
  const title = ctx.route.area === 'supervisor' ? 'Schedule' : 'Sessions & workshops';
  if (!data) return head({eyebrow:'SESSIONS',title})+emptyState('No published Initiatives','Publish an Initiative to schedule its sessions.');
  const details = id => scoped(ctx,initiative,path(ctx,id));
  if (data.session) {
    const session = data.session;
    const actions = (data.canEdit ? u.button(session.status === 'Draft' ? 'Edit draft' : 'Edit / reschedule','live-session-edit') : '')+
      (data.canEdit && session.status === 'Draft' ? u.button('Publish','live-session-publish',{},'button primary') : '')+
      (data.canEdit ? u.button('Cancel session','live-session-cancel',{},'button danger') : '')+
      (data.canClose ? u.button('Close session','live-session-close',{},'button quiet') : '');
    return `<p class="breadcrumbs">${u.link(title,details(),'text-link')} / ${esc(session.title)}</p>`+
      head({eyebrow:session.initiative+' · '+session.organizer,title:session.title,meta:pill(session.status),actions})+
      `<div class="iw-split">${card('Details',`<dl class="iw-facts">
        <div><dt>When</dt><dd>${esc(sessionWhen(session))}</dd></div><div><dt>Mode</dt><dd>${esc(sessionMode(session.mode))}</dd></div>
        ${session.venue ? `<div><dt>Venue</dt><dd>${esc(session.venue)}<br><a class="text-link" href="${esc(mapUrl(session.venue))}" target="_blank" rel="noopener noreferrer">Open map ↗</a></dd></div>` : ''}
        ${data.meetingLink ? `<div><dt>Online access</dt><dd><a class="text-link" href="${esc(data.meetingLink)}" target="_blank" rel="noopener noreferrer">Open meeting link ↗</a></dd></div>` : ''}
        <div><dt>Seats</dt><dd>${esc(seats(session))}</dd></div>
        <div><dt>Registration</dt><dd>${esc(session.registrationState)} · from publication until the session starts</dd></div></dl>
        ${session.cancelReason ? `<p class="iw-muted">${esc(session.cancelReason)}</p>` : ''}`)}
        ${card('Change history',data.history.length ? `<ol class="iw-history">${data.history.map(entry=>`<li><time>${esc(stamp(entry.atUtc))}</time>
          <span>${esc(entry.action.replace(/([a-z])([A-Z])/g,'$1 $2'))}${entry.reason ? ' · '+esc(entry.reason) : ''}</span>
          <small>${esc(entry.actor)}</small></li>`).join('')}</ol>` : '<p class="iw-muted">No changes recorded.</p>')}</div>`+
      card('Participant registrations',data.roster.length ? u.table(['Participant','Mode','Status','Registered','Cancelled'],data.roster.map(row=>({
        search:row.displayName,cells:[esc(row.displayName),esc(sessionMode(row.mode)),pill(row.status),esc(stamp(row.registeredAtUtc)),
          row.cancelledAtUtc ? esc(stamp(row.cancelledAtUtc)) : '—']
      }))) : '<p class="iw-muted">No registrations yet.</p>');
  }
  const calendar = ctx.route.query.get('view') === 'calendar';
  const sessions = data.sessions.map(session=>{
    const start = sessionLocal(session.startsAtUtc,session.timeZoneId), end = sessionLocal(session.endsAtUtc,session.timeZoneId);
    return {...session,date:start.slice(0,10),time:start.slice(11),endTime:end.slice(11),format:sessionMode(session.mode)};
  });
  return head({eyebrow:initiative.title,title,meta:picker,
    actions:data.canManage ? u.button('Create session','live-session-create',{},'button primary') : ''})+
    tabs([['List',details(),'list'],['Calendar',scoped(ctx,initiative,path(ctx)+'?view=calendar'),'calendar']],calendar ? 'calendar' : 'list')+
    (calendar ? monthCalendar(ctx,initiative,sessions,ctx.route.area === 'organization' ? 'rep' : 'supervisor',{
      detail:details,seats,day:sessionLocal(new Date(),initiative.timezone || sessions[0]?.timeZoneId || 'Asia/Amman').slice(0,10)
    }) :
      card('',sessions.length ? u.table(['Session','When','Mode & seats','Status','Registration'],sessions.map(session=>({
        search:session.title,cells:[u.link(session.title,details(session.id),'iw-row-link'),esc(sessionWhen(session)),
          esc(sessionMode(session.mode))+'<small>'+esc(seats(session))+'</small>',pill(session.status),pill(session.registrationState)]
      }))) : emptyState('No sessions yet','Sessions scheduled for this Initiative will appear here.')));
}

function editForm(session,initiative) {
  const row = session || {};
  const zone = row.timeZoneId || initiative.timezone || 'Asia/Amman';
  const local = value => value ? sessionLocal(value,zone) : '';
  return `<div class="iw-session-intro"><p class="eyebrow">SESSION DETAILS</p><p>Registration opens on publication and closes when the session starts.</p></div>
    ${u.field('title','Session title',row.title,'text',true,'maxlength="200"')}
    <div class="form-grid">${u.field('startsAt','Start',local(row.startsAtUtc),'datetime-local',true)}
      ${u.field('endsAt','End',local(row.endsAtUtc),'datetime-local',true)}</div>
    ${u.field('timeZoneId','Time zone',zone,'text',true,'maxlength="80"')}
    <fieldset class="iw-session-mode"><legend>Where will this session happen?</legend><div class="iw-session-options">
    ${[['Online','Remote'],['InPerson','On-site'],['Hybrid','Hybrid']].map(([mode,label])=>`<label><input type="radio" name="mode" value="${mode}"
      ${(row.mode || 'Online') === mode ? 'checked' : ''}><span><strong>${label}</strong></span></label>`).join('')}</div></fieldset>
    <section class="iw-session-access" data-session-panel="Online">
      ${u.field('meetingLink','Meeting link',row.meetingLink,'url',false,'maxlength="300"')}
      ${u.field('onlineCapacity','Remote seats',row.onlineCapacity ?? 30,'number',false,'min="1" max="1000"')}</section>
    <section class="iw-session-access" data-session-panel="InPerson">
      ${u.field('venue','Venue or street address',row.venue,'text',false,'maxlength="300"')}
      ${u.field('inPersonCapacity','On-site seats (optional)',row.inPersonCapacity ?? '','number',false,'min="1" max="1000"')}</section>
    ${u.checkbox('attendanceRequired','Attendance is required for this session',row.attendanceRequired === true)}
    ${row.status === 'Published' ? u.area('reason','Reason for the change','',false,'maxlength="800"') : ''}`;
}

export async function action(action,ctx,data,initiative) {
  const session = data.session;
  const endpoint = base('Representative',initiative.id);
  if (action === 'live-session-create' || action === 'live-session-edit') {
    const id = session?.id || crypto.randomUUID();
    const record = session ? {...session,meetingLink:data.meetingLink,attendanceRequired:data.attendanceRequired} : null;
    let publish = false;
    u.modal(session?.status === 'Published' ? 'Edit or reschedule session' : session ? 'Edit draft' : 'Create a session',
      editForm(record,initiative),async (values,form)=>{
        const mode = form.elements.mode.value;
        const online = mode !== 'InPerson', inPerson = mode !== 'Online';
        await sessionRequest(endpoint+'/'+id,{title:values.title,mode,timeZoneId:values.timeZoneId,
          startsAt:values.startsAt,endsAt:values.endsAt,meetingLink:online ? values.meetingLink || null : null,
          onlineCapacity:online && values.onlineCapacity ? Number(values.onlineCapacity) : null,venue:inPerson ? values.venue || null : null,
          inPersonCapacity:inPerson && values.inPersonCapacity ? Number(values.inPersonCapacity) : null,
          attendanceRequired:form.elements.attendanceRequired.checked,version:session?.version,reason:values.reason,publish},'PUT');
        if (session) await ctx.render();
        else ctx.go(path(ctx,id)+'?initiative='+initiative.id);
        u.toast(publish ? 'Session published.' : session?.status === 'Published' ? 'Session updated.' : 'Session draft saved.');
      },session?.status === 'Published' ? 'Save changes' : 'Save draft',{wide:true});
    const dialog = document.getElementById('workspace-dialog');
    const form = document.getElementById('dialog-form');
    const sync = () => form.querySelectorAll('[data-session-panel]').forEach(panel=>{
      panel.hidden = form.elements.mode.value !== 'Hybrid' && panel.dataset.sessionPanel !== form.elements.mode.value;
      panel.querySelectorAll('input').forEach(input=>input.disabled=panel.hidden);
    });
    form.addEventListener('change',sync);
    sync();
    const save = document.getElementById('dialog-save');
    const draft = ()=>{publish=false;};
    save.addEventListener('click',draft);
    if (session?.status !== 'Published') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button quiet';
      button.textContent = 'Save & publish';
      button.addEventListener('click',()=>{publish=true;form.requestSubmit(save);});
      save.before(button);
      dialog.addEventListener('close',()=>button.remove(),{once:true});
    }
    dialog.addEventListener('close',()=>{save.removeEventListener('click',draft);form.removeEventListener('change',sync);},{once:true});
    return;
  }
  if (!session) return;
  const decision = action.slice('live-session-'.length);
  const saveDecision = async values=>{
    await sessionRequest(endpoint+'/'+session.id+'/'+decision,{version:session.version,reason:values?.reason});
    await ctx.render();
  };
  if (decision === 'cancel') u.modal('Cancel this session?',u.area('reason','Cancellation reason','',true),saveDecision,'Cancel session');
  if (decision === 'publish') u.confirm('Publish this session?','Accepted participants can register once it is published.',saveDecision,'Publish');
  if (decision === 'close') u.confirm('Close this session?','The schedule and registration history will stay available.',saveDecision,'Close session');
}
