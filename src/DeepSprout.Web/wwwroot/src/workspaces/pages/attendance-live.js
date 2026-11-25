import * as u from '../ui.js';
import {card,emptyState,esc,head,pill,stat,stats,tabs} from './institution/common.js';
import {attendanceRequest,attendanceLabel,attendanceTime,sessionAttendancePath} from '../attendance-api.js';
import {sessionMode,sessionWhen} from '../session-api.js';

export const load = (role,id,view,session) => attendanceRequest('/'+role+'/'+encodeURIComponent(id)+
  (view === 'excuses' ? '/excuses' : session ? '/'+encodeURIComponent(session) : ''));
const area = role => role === 'Representative' ? 'organization' : 'supervisor';
const routePath = (ctx,role,id,page,session) => (ctx.workspacePath || (path=>path))(
  area(role)+'/'+page+(session ? '/'+session : '')+'?initiative='+encodeURIComponent(id));
const displayStatus = (status,excuse) => `<span class="ac-status is-${status === 'NotRecorded' ? 'none' : esc(status.toLowerCase())}">${esc(attendanceLabel(status,excuse))}</span>`;
const methods = {QrScan:'QR check-in',BookingCode:'Typed code',OnlineRoster:'Online roster',ManualException:'Manual exception',Correction:'Correction'};

export function summary(ctx,data,role,id) {
  if (!data) return '';
  const rows = data.filter(row=>row.attendanceRequired);
  return card('Session attendance and excuses',rows.length ? u.table(['Session','Present','Late','Absent','Not recorded','Excused','Excuses pending','Excuses rejected'],
    rows.map(row=>({cells:[u.link(row.title,routePath(ctx,role,id,'attendance',row.id),'iw-row-link'),
      row.present,row.late,row.absent,row.notRecorded,row.excused,row.excusesPending,row.excusesRejected]}))) :
    '<p class="iw-muted">Attendance reports appear here for scheduled Sessions that require attendance.</p>');
}

export function render(ctx,data,role,initiative,picker) {
  const view = ctx.route.page;
  const title = view === 'excuses' ? 'Excuses' : 'Attendance';
  if (!initiative) return head({eyebrow:'INITIATIVE',title})+emptyState('No Initiatives available','Choose an authorized Initiative.');
  const path = (page,session) => routePath(ctx,role,initiative.id,page,session);
  const navigation = tabs([['Attendance',path('attendance'),'attendance'],['Excuses',path('excuses'),'excuses']],view);
  if (view === 'excuses') return head({eyebrow:initiative.title,title,meta:picker})+navigation+excuses(data);
  if (!data.session) return head({eyebrow:initiative.title,title,meta:picker})+navigation+summary(ctx,data,role,initiative.id);
  const {session,roster,canRecord,canVerify,canAssign} = data;
  const hasOnSite = session.mode !== 'Online';
  const statRows = [['Present','present'],['Late','late'],['Absent','absent'],['Not recorded','notRecorded'],['Excused','excused']];
  return head({eyebrow:session.initiative,title:session.title,lead:sessionWhen(session),meta:picker})+navigation+
    stats(statRows.map(([label,key])=>stat(data.summary[key],label)))+
    (data.summary.needsSupervisor ? card('Needs Supervisor','<p>Assign an active Initiative Supervisor to confirm attendance.</p>') : '')+
    (canAssign ? card('Responsible Supervisors',data.supervisors.length ? `<ul class="iw-mini-list">${data.supervisors.map(row=>
      `<li><strong>${esc(row.displayName)}</strong>${u.button(row.assigned ? 'Remove duty' : 'Assign duty','live-att-duty',
        {id:row.id,active:!row.assigned},'button quiet small')}</li>`).join('')}</ul>` :
      '<p>No active Initiative Supervisor is available.</p>') : '')+
    (hasOnSite && canRecord ? card('In-person check-in',
      `<p>${canVerify ? 'Scan a participant’s pass on a supported camera, or enter its typed code.' : 'This check-in window is closed.'}</p>
        ${canVerify ? u.button('Validate QR or code','live-att-code',{},'button primary') : ''}`) : '')+
    card('Confirmed roster',roster.length ? u.table(['Participant','Mode','Attendance','Method','Actions'],roster.map(row=>({
      search:row.displayName,cells:[esc(row.displayName),esc(sessionMode(row.mode)),displayStatus(row.status,row.excuseStatus),
        esc(methods[row.method] || row.method || '—'),rowActions(row,data)]
    }))) : '<p>No confirmed registrations.</p>');
}

function rowActions(row,data) {
  const buttons = [];
  if (data.canRecord && row.canVerifyParticipant) {
    const editable = !row.version || row.status === 'NotRecorded';
    if (editable && row.mode === 'Online' && data.canVerify) buttons.push(u.button('Verify online','live-att-record',{id:row.registrationId,method:'Online'},'button primary small'));
    if (editable && data.canRecordManual) buttons.push(u.button('Record manually','live-att-record',{id:row.registrationId,method:'Manual'},'button quiet small'));
    if (row.version) buttons.push(u.button('Correct','live-att-record',{id:row.registrationId,method:'Correct'},'button quiet small'));
  }
  if (row.history.length) buttons.push(u.button('History','live-att-history',{id:row.registrationId},'button quiet small'));
  return `<div class="actions">${buttons.join('')}</div>`;
}

function excuses(rows) {
  return '<section class="iw-excuse-zone iw-reveal"><div class="iw-card-head"><h2>Excuse requests</h2></div>'+
    (rows.length ? `<div class="iw-excuses">${rows.map(row=>`<article class="iw-excuse"><header><div><strong>${esc(row.displayName)}</strong>
      <p>${esc(row.title)}</p></div><div class="actions">${displayStatus(row.attendance,row.status)}${pill(row.status)}</div></header>
      <blockquote>${esc(row.reason)}</blockquote><ol class="iw-chain">
      <li class="is-done"><span>Student</span><small>${esc(attendanceTime(row.createdAtUtc))}</small></li>
      <li class="${row.recommendation ? 'is-done' : 'is-now'}"><span>Supervisor</span><small>${row.recommendation ?
        esc(row.recommendation+' · '+row.recommender+' · '+attendanceTime(row.recommendedAtUtc)) : 'Recommendation pending'}</small></li>
      <li class="${row.decidedAtUtc ? 'is-done' : ''}"><span>Representative</span><small>${row.decidedAtUtc ?
        esc(row.decisionMaker+' · '+attendanceTime(row.decidedAtUtc)) : 'Final decision pending'}</small></li></ol>
      ${row.recommendationNote ? '<p><strong>Supervisor note:</strong> '+esc(row.recommendationNote)+'</p>' : ''}
      ${row.decisionReason ? '<p><strong>Decision reason:</strong> '+esc(row.decisionReason)+'</p>' : ''}
      <div class="actions">${row.canRecommend ? u.button('Recommend','live-att-recommend',{id:row.id},'button primary small') : ''}
      ${row.canDecide ? u.button('Accept excuse','live-att-decide',{id:row.id,decision:'Accepted'},'button primary small')+
        u.button('Reject excuse','live-att-decide',{id:row.id,decision:'Rejected'},'button quiet small') : ''}</div></article>`).join('')}</div>` :
      '<p class="iw-muted">No excuse requests.</p>')+'</section>';
}

export function action(action,target,ctx,data) {
  const getRow = () => data.roster.find(row=>row.registrationId === target.dataset.id);
  const request = (path,payload,method) => attendanceRequest(sessionAttendancePath(data.session.id)+path,payload,method);
  const finish = async () => { await ctx.render(); u.toast('Saved.'); };
  if (action === 'live-att-duty') return request('/duty/'+target.dataset.id,{active:target.dataset.active==='true'},'PUT').then(finish);
  if (action === 'live-att-code') {
    const camera = 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;
    u.modal('Validate QR or code',u.field('credential','QR pass or typed code','','text',true,'maxlength="2048" autocomplete="off"')+
      (camera ? '<button class="button quiet" type="button" data-start-camera>Scan with camera</button><video class="ac-scanner" muted playsinline hidden></video><p data-camera-error role="alert"></p>' : ''),
      async values=>{ await request('/check-in',{credential:values.credential}); await finish(); },'Confirm check-in');
    if (camera) bindCamera(document.getElementById('workspace-dialog'));
    return;
  }
  if (action === 'live-att-history') {
    const row = getRow();
    return u.modal('Attendance history',`<ol class="iw-history">${row.history.map(entry=>`<li>
      <time>${esc(attendanceTime(entry.atUtc))}</time><span>${esc(entry.beforeStatus ? attendanceLabel(entry.beforeStatus)+' → ' : '')}
      ${esc(attendanceLabel(entry.afterStatus))}${entry.reason ? '<small>'+esc(entry.reason)+'</small>' : ''}</span><small>${esc(entry.actor)}</small></li>`).join('')}</ol>`,
      null,'Close',{readonly:true});
  }
  if (action === 'live-att-record') {
    const row = getRow(), method = target.dataset.method;
    const states = ['Present','Late',...(data.canRecordAbsence ? ['Absent'] : []),...(method === 'Correct' ? ['NotRecorded'] : [])]
      .filter(status=>method !== 'Correct' || status !== row.status);
    return u.modal(method === 'Correct' ? 'Correct attendance' : method === 'Online' ? 'Verify online attendance' : 'Record manual attendance',
      '<p>'+esc(row.displayName)+'</p>'+u.select('status','Factual status',states.map(status=>[status,attendanceLabel(status)]))+
      (method !== 'Online' ? u.area('reason','Reason','',true) : ''),
      async values=>{ await request('/registrations/'+row.registrationId+'/record',{...values,method,version:row.version}); await finish(); },'Save attendance');
  }
  const row = data.find(item=>item.id === target.dataset.id);
  const recommending = action === 'live-att-recommend';
  u.modal(recommending ? 'Your recommendation' : 'Final excuse decision',
    (recommending ? u.select('decision','Recommendation',['Accept','Reject']) :
      '<p>'+esc(target.dataset.decision === 'Accepted' ? 'Accept this excuse.' : 'Reject this excuse.')+'</p>')+
    u.area('reason',recommending ? 'Supervisor note' : 'Decision reason','',true),async values=>{
      await attendanceRequest(sessionAttendancePath(row.sessionId)+'/excuses/'+row.id+'/'+(recommending ? 'recommend' : 'decide'),
        {decision:recommending ? values.decision : target.dataset.decision,reason:values.reason,version:row.version});
      await finish();
    },recommending ? 'Send recommendation' : 'Save final decision');
}

function bindCamera(dialog) {
  let stream, closed = false;
  const video = dialog.querySelector('video');
  const stop = () => { stream?.getTracks().forEach(track=>track.stop()); stream = null; video.hidden = true; };
  dialog.addEventListener('close',()=>{closed=true;stop();},{once:true});
  dialog.querySelector('[data-start-camera]').addEventListener('click',async event=>{
    const button = event.currentTarget;
    if (stream) { stop(); return; }
    button.disabled = true;
    try {
      const detector = new window.BarcodeDetector({formats:['qr_code']});
      const opened = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      if (closed) { opened.getTracks().forEach(track=>track.stop()); return; }
      stream = opened;
      video.srcObject = stream; video.hidden = false;
      await video.play();
      const frame = async () => {
        if (!stream) return;
        try {
          const [result] = await detector.detect(video);
          if (result && stream === opened) {
            stop();
            dialog.querySelector('[name=credential]').value = result.rawValue;
            return;
          }
        } catch { /* The next video frame may be readable. */ }
        if (stream === opened) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    } catch {
      stop();
      dialog.querySelector('[data-camera-error]').textContent = 'Camera unavailable. Enter the typed check-in code.';
    } finally { button.disabled = false; }
  });
}
