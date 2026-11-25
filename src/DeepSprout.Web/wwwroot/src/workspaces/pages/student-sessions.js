import * as u from '../ui.js';
import {card,emptyState,esc,head,pill} from './institution/common.js';
import {sessionRequest,sessionMode,sessionModes,sessionWhen,modeSeats,registerSession,cancelSessionRegistration} from '../session-api.js';
import {attendanceRequest,attendanceLabel,participantAttendance,bindParticipantAttendance} from '../attendance-api.js';

const path = (initiative,id) => 'student/sessions'+(id ? '/'+id : '')+'?initiative='+encodeURIComponent(initiative);
export async function load(selected,id) {
  if (!selected) return {sessions:[],registrations:[],attendance:[]};
  const initiative = selected.initiativeId;
  const [sessions,registrations,attendance] = await Promise.all([
    selected.canAccess ? sessionRequest('/student/'+initiative) : [],
    sessionRequest('/mine?initiative='+initiative),attendanceRequest('/mine?initiative='+initiative)
  ]);
  let detail = null;
  if (id) {
    if (!sessions.some(row=>row.id === id) && !registrations.some(row=>row.session.id === id))
      throw new Error('This session is unavailable to your account.');
    detail = await sessionRequest('/discover/'+id);
  }
  return {sessions,registrations,attendance,detail};
}

export function render(data,picker,selected) {
  const initiative = selected?.initiativeId;
  const header = head({eyebrow:selected?.title || 'INITIATIVE SESSIONS',title:'Session schedule',meta:picker});
  if (!selected) return header+emptyState('No sessions available','Your Initiative schedule appears after admission.');
  const detail = data.detail;
  if (detail) {
    const {session,registration} = detail;
    const record = data.attendance.find(row=>row.registrationId === registration?.id);
    const available = sessionModes(session).filter(row=>row.remaining !== 0);
    const canRegister = detail.eligible && session.registrationState === 'Open' &&
      (!registration || registration.status === 'Cancelled');
    return `<p class="breadcrumbs">${u.link('Session schedule',path(initiative),'text-link')} / ${esc(session.title)}</p>`+
      head({eyebrow:session.initiative+' · '+session.organizer,title:session.title,meta:pill(session.registrationState)})+
      card('Session details',`<p>${esc(sessionWhen(session))}</p><p>${esc(sessionMode(session.mode))}${session.venue ? ' · '+esc(session.venue) : ''}</p>
        <p>${esc(modeSeats(session))}</p>${session.cancelReason ? '<p>'+esc(session.cancelReason)+'</p>' : ''}
        ${detail.meetingLink ? `<a class="button quiet" href="${esc(detail.meetingLink)}" target="_blank" rel="noopener noreferrer">Join online</a>` : ''}`)+
      card('Your registration',(registration ? `<p>${pill(registration.status)} · ${esc(sessionMode(registration.mode))}</p>` : '')+
        (registration?.canCancel ? u.button('Cancel registration','live-student-session-cancel',{},'button quiet') : '')+
        (canRegister ? `<form data-form="live-student-session-register" data-request-id="${crypto.randomUUID()}">
          ${u.select('mode','Participation mode',available.map(row=>[row.mode,sessionMode(row.mode)]),available[0]?.mode)}
          ${u.checkbox('consent',detail.consent)}<p class="form-error" role="alert"></p>
          <button class="button primary" type="submit">Register for this session</button></form>` :
          !detail.eligible && !registration ? '<p>Current Initiative admission is required.</p>' : ''))+
      (record && record.attendanceRequired ? card('Attendance and excuse',
        '<div data-live-participant-attendance>'+participantAttendance(record,'button quiet')+'</div>') : '');
  }
  const active = new Map(data.registrations.filter(row=>row.registration.status !== 'Cancelled').map(row=>[row.session.id,row.registration]));
  return header+card('Sessions',data.sessions.length ? u.table(['Session','When','Mode','Status'],data.sessions.map(row=>({
    search:row.title,cells:[u.link(row.title,path(initiative,row.id),'iw-row-link'),esc(sessionWhen(row)),
      esc(sessionMode(row.mode)),pill(active.get(row.id)?.status || row.registrationState)]
  }))) : '<p class="iw-muted">No sessions available in your current schedule.</p>')+
    card('Registration history',data.registrations.length ? u.table(['Session','Mode','Status'],data.registrations.map(({session,registration})=>({
      cells:[u.link(session.title,path(initiative,session.id),'iw-row-link'),esc(sessionMode(registration.mode)),pill(registration.status)]
    }))) : '<p class="iw-muted">You haven’t registered for a session yet.</p>');
}

export function progress(data,selected,picker) {
  return head({eyebrow:selected?.title || 'INITIATIVE',title:'My attendance',meta:picker})+
    card('Session attendance',data.attendance.length ? u.table(['Session','Mode','Registration','Attendance'],
      data.attendance.map(row=>({cells:[u.link(row.title,path(selected.initiativeId,row.sessionId),'iw-row-link'),
        esc(sessionMode(row.mode)),pill(row.registrationStatus),esc(attendanceLabel(row.status,row.excuse?.status))]}))) :
      '<p class="iw-muted">Attendance appears for your registered sessions.</p>');
}

export function mount(data,ctx) {
  const registration = data?.detail?.registration;
  const row = data?.attendance.find(item=>item.registrationId === registration?.id);
  bindParticipantAttendance(document.querySelector('[data-live-participant-attendance]'),row,()=>ctx.render());
}

export async function submit(form,ctx) {
  const button = form.querySelector('[type=submit]');
  const error = form.querySelector('[role=alert]');
  const {session} = ctx.staffData.sessions.detail;
  button.disabled = true;
  error.textContent = '';
  try {
    await registerSession(session,form.elements.mode.value,form.elements.consent.checked,form.dataset.requestId);
    await ctx.render();
    u.toast('Registration saved.');
  } catch (failure) { error.textContent = failure.message; }
  finally { button.disabled = false; }
}

export function cancel(ctx) {
  const {session,registration} = ctx.staffData.sessions.detail;
  u.confirm('Cancel your registration?','This releases your place and keeps the registration in your history.',async ()=>{
    await cancelSessionRegistration(session.id,registration.id);
    await ctx.render();
  });
}
