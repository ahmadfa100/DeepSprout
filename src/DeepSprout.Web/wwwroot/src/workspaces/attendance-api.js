import {workspaceRequest} from './workspace-api.js';

export const attendanceRequest = (path,payload,method) => workspaceRequest('/api/initiative-attendance'+path,payload,method);
export const sessionAttendancePath = id => '/sessions/'+encodeURIComponent(id);
export const attendanceLabel = (status,excuse) => status === 'Absent' && excuse === 'Accepted' ? 'Excused Absence' :
  status === 'NotRecorded' ? 'Not Recorded' : status;
export const attendanceTime = value => new Date(value).toLocaleString();
const escape = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const qr = payload => {
  if (!window.qrcode) return '';
  const code = window.qrcode(0,'M');
  code.addData(payload);
  code.make();
  return code.createSvgTag({cellSize:4,margin:12,scalable:true});
};

export function participantAttendance(row,buttonClass) {
  if (!row || row.registrationStatus === 'Cancelled' && row.status === 'NotRecorded') return '';
  const label = attendanceLabel(row.status,row.excuse?.status);
  return `<p><strong data-factual-attendance>${escape(label)}</strong></p>
    ${label === 'Excused Absence' ? '<p>Factual attendance: Absent</p>' : ''}
    ${row.needsSupervisor ? '<p>Needs Supervisor</p>' : ''}
    ${row.attendanceRequired && row.mode === 'InPerson' && row.status === 'NotRecorded' && !row.needsSupervisor ?
      '<p>Check-in window: '+escape(attendanceTime(row.opensAtUtc))+' – '+escape(attendanceTime(row.closesAtUtc))+'</p>' : ''}
    ${row.canIssue ? `<button type="button" class="${buttonClass}" data-issue-attendance>Show check-in pass</button><div data-attendance-pass></div>` : ''}
    ${row.excuse ? `<div><strong>Excuse: ${escape(row.excuse.status)}</strong><p>${escape(row.excuse.reason)}</p>
      ${row.excuse.decisionReason ? '<p>Decision reason: '+escape(row.excuse.decisionReason)+'</p>' : ''}</div>` : ''}
    ${row.canSubmit ? `<form data-attendance-excuse>
      <label class="field ex-field">Reason for absence<textarea name="reason" rows="3" maxlength="1000" required></textarea></label>
      <button type="submit" class="${buttonClass}">Submit excuse</button></form>` : ''}
    <p class="form-error ex-error" data-attendance-error role="alert" hidden></p>`;
}

export function bindParticipantAttendance(host,row,onChanged) {
  if (!host || !row) return;
  const run = async (button,execute) => {
    const error = host.querySelector('[data-attendance-error]');
    if (!error) return;
    error.hidden = true;
    button.disabled = true;
    try { await execute(); }
    catch (failure) { error.textContent = failure.message; error.hidden = false; }
    finally { button.disabled = false; }
  };
  host.querySelector('[data-issue-attendance]')?.addEventListener('click',event=>run(event.currentTarget,async ()=>{
    const result = await attendanceRequest(sessionAttendancePath(row.sessionId)+'/pass',{});
    const pass = host.querySelector('[data-attendance-pass]');
    pass.innerHTML = `<div class="ac-qr-box"><div role="img" aria-label="Check-in QR pass">${qr(result.qrPayload)}</div></div>
      <p>Typed check-in code: <strong data-typed-attendance-code>${escape(result.code)}</strong></p>
      <p>Expires ${escape(attendanceTime(result.expiresAtUtc))}. Show this pass to your Supervisor.</p>`;
  }));
  host.querySelector('[data-attendance-excuse]')?.addEventListener('submit',event=>{
    event.preventDefault();
    const form = event.currentTarget;
    run(form.querySelector('button'),async ()=>{
      await attendanceRequest(sessionAttendancePath(row.sessionId)+'/excuse',{registrationId:row.registrationId,reason:form.elements.reason.value});
      await onChanged();
    });
  });
}
