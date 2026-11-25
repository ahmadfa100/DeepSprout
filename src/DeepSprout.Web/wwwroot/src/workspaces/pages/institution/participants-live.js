import * as u from '../../ui.js';
import {card,emptyState,esc,head,pill,select,stat,stats,tabs} from './common.js';

const groups = {
  pending:['Pending', ['Pending']],
  accepted:['Accepted', ['Accepted']],
  waitlist:['Waiting list', ['Queued','Offered']],
  suspended:['Suspended', ['Suspended']],
  ended:['Closed & history', ['Rejected','Removed','Blocked','Withdrawn','OfferDeclined','OfferExpired','Cancelled','Completed','BlockLifted']]
};
const labels = {Queued:'Waiting list',OfferDeclined:'Offer declined',OfferExpired:'Offer expired',BlockLifted:'Block lifted'};
const decisions = {approve:'Approve',reject:'Reject',suspend:'Suspend',restore:'Restore',remove:'Remove',block:'Block'};
const code = id => 'APP-'+id.replaceAll('-','').slice(0,12).toUpperCase();
export const queuePath = (id, status = '') => 'organization/participants?initiative='+id+(status ? '&status='+status : '');

export function render(ctx) {
  const {workspacePath:path, institutionData:data, route} = ctx;
  const initiative = data.admissionInitiative;
  const title = 'Applications & Students';
  if (!initiative) return head({eyebrow:'ADMISSIONS',title}) +
    emptyState('No published Initiatives yet.','Publish an Initiative to start receiving applications.',
      u.link('Open Initiatives',path('organization/initiatives'),'button primary'));
  const all = data.applications;
  const counts = Object.fromEntries(Object.entries(groups).map(([key,[,values]]) =>
    [key,all.filter(row=>values.includes(row.application.status)).length]));
  const selected = route.query.get('status');
  const active = Object.hasOwn(groups,selected) ? selected : counts.pending ? 'pending' :
    counts.waitlist ? 'waitlist' : counts.accepted ? 'accepted' : counts.suspended ? 'suspended' : 'ended';
  const [label,statuses] = groups[active];
  const rows = all.filter(row=>statuses.includes(row.application.status)).map(({application:a,applicantName})=>{
    const actions = [];
    const add = kind=>actions.push(u.button(decisions[kind],'live-admission-decision',{id:a.id,kind},
      kind === 'approve' ? 'button primary small' : 'button quiet small'));
    if (a.operational && a.canDecide) {
      if (['Pending','Queued'].includes(a.status)) { add('approve'); add('reject'); }
      if (a.status === 'Accepted') add('suspend');
      if (a.status === 'Suspended') add('restore');
      if (['Accepted','Suspended'].includes(a.status)) add('remove');
      if (!['Blocked','Completed','Cancelled','BlockLifted'].includes(a.status)) add('block');
    }
    actions.push(u.button('Details','live-admission-detail',{id:a.id},'button quiet small'));
    return {search:applicantName+' '+code(a.id),status:a.status,cells:[
      `<div class="iw-person">${u.avatar(applicantName)}<strong>${esc(applicantName)}</strong></div>`,
      `<code class="iw-code">${esc(code(a.id))}</code><small>${esc(u.date(a.submittedAtUtc))} · Attempt ${esc(a.attemptNo)}</small>`,
      esc(a.participationMode === 'InPerson' ? 'In person' : a.participationMode || '—'),
      pill(a.status,labels[a.status] || a.status),`<div class="actions">${actions.join('')}</div>`]};
  });
  const picker = select('live-admission-initiative','Initiative',
    data.initiatives.filter(i=>i.version).map(i=>[i.id,i.title]),initiative.id);
  return head({eyebrow:'ADMISSIONS',title,lead:'Review applications and manage accepted students.',meta:picker})
    + stats([stat(counts.accepted,'Accepted students',{of:initiative.capacity}),
      stat(counts.accepted+counts.suspended,'Seats in use',{hint:'Includes suspended students',of:initiative.capacity}),
      stat(counts.pending,'Pending applications'),stat(initiative.queued,'Waiting list')])
    + tabs(Object.entries(groups).map(([key,[name]])=>[name,path(queuePath(initiative.id,key)),key,counts[key]]),active)
    + card(label, rows.length ? u.filterBar(statuses.length > 1 ? statuses : [])+
      u.table(['Applicant','Application','Mode','Status','Actions'],rows) : '<p class="iw-muted">No applications in this view.</p>');
}

export async function action(action,target,ctx,request) {
  if (!['live-admission-detail','live-admission-decision'].includes(action)) return;
  const path = '/'+ctx.institutionData.admissionInitiative.id+'/'+target.dataset.id;
  if (action === 'live-admission-detail') {
    const record = await request(path);
    const a = record.application;
    const fact = (name,value)=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`;
    const history = record.history.map(row=>`<li><time>${esc(new Date(row.atUtc).toLocaleString())}</time>
      <span><strong>${esc(row.beforeStatus ? row.beforeStatus+' → ' : '')}${esc(row.afterStatus || row.action)}</strong>
        ${row.reason ? '<small>'+esc(row.reason)+'</small>' : ''}</span>
      <small>${esc([row.actor,row.actorCapacity].filter(Boolean).join(' · '))}</small></li>`).join('');
    u.modal('Application details',`<div class="iw-app-applied"><h3>${esc(record.applicantName)}</h3><p>${esc(a.title)} · ${esc(a.organizer)} · ${esc(code(a.id))}</p></div>
      <dl class="preview-facts">${fact('Status',labels[a.status] || a.status)}${fact('Submitted',u.date(a.submittedAtUtc))}
        ${fact('Participation mode',a.participationMode === 'InPerson' ? 'In person' : a.participationMode || '—')}
        ${record.answers ? fact('Declared age',record.answers.age)+fact('Why they applied',record.answers.motivation || 'No motivation shared.') : ''}
        ${fact('Consent · revision '+record.revisionNo,record.consent || 'Recorded')}</dl>
      <h4>Decision history</h4>${history ? '<ol class="iw-history">'+history+'</ol>' : '<p>No decision history was recorded.</p>'}`,
    null,'Close',{readonly:true,wide:true});
    return;
  }
  const row = ctx.institutionData.applications.find(item=>item.application.id === target.dataset.id);
  const kind = target.dataset.kind;
  if (!row || !Object.hasOwn(decisions,kind)) return;
  const title = decisions[kind]+' application';
  const guidance = kind === 'approve' && ctx.institutionData.admissionInitiative.policies?.waitlist
    ? '<p>Eligible applicants join the waiting list when all seats are in use.</p>' : '';
  u.modal(title,`<p>${esc(row.applicantName)} · ${esc(code(row.application.id))}</p>`+guidance+
      u.area('reason',kind === 'approve' ? 'Decision reason (optional)' : 'Decision reason', '', kind !== 'approve'),
    async values=>{
      const result = await request(path+'/'+kind,'POST',{version:row.application.version,reason:values.reason});
      await ctx.render();
      const message = result.status === 'Queued' ? 'Application is on the waiting list.' : 'Application status: '+(labels[result.status] || result.status)+'.';
      u.toast(message);
    },decisions[kind]);
}
