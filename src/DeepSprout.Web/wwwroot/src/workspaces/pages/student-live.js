import * as u from '../ui.js';
import {card,emptyState,esc,head,pill,select} from './institution/common.js';
import {workspaceRequest} from '../workspace-api.js';
import * as work from './student-work.js';
import {loadGarden,renderLiveGarden} from './institution/garden.js';
import * as sessions from './student-sessions.js';

const api = '/api/initiative-student';
export const navPath = (data,key) => 'student/'+key+(data.selected ? '?initiative='+encodeURIComponent(data.selected.initiativeId) : '');
const pages = ['dashboard','group','tasks','garden','account','sessions','progress'];
export const navigation = items => [...items,['sessions','calendar','Session schedule']].filter(([key])=>pages.includes(key))
  .map(item=>item[0] === 'group' ? ['group',item[1],'My Group'] : item);

export async function load(route) {
  try {
    if (!pages.includes(route.page) || route.id && !['tasks','sessions'].includes(route.page))
      return {error:'This page is unavailable in the live Student workspace.'};
    const id = route.query.get('initiative');
    const data = await workspaceRequest(api+(id ? '?initiative='+encodeURIComponent(id) : ''));
    if (route.page === 'tasks') data.tasks = await work.load(id,route.id);
    if (route.page === 'sessions' || route.page === 'progress') data.sessions = await sessions.load(data.selected,route.id);
    if (route.page === 'garden' && data.selected)
      data.garden = await loadGarden(data.selected.initiativeId,'Student');
    return data;
  } catch (error) { return {error:error.message}; }
}

export function render(ctx) {
  const data = ctx.staffData;
  const home = () => u.link('Student overview','student/dashboard','button quiet');
  if (data.error) return head({eyebrow:'STUDENT ACCESS',title:'Workspace unavailable'})+
    `<p class="panel form-error" role="alert">${esc(data.error)}</p>${home()}`;
  const {selected,group} = data;
  const choices = Array.from(new Map(data.memberships.map(row=>[row.initiativeId,row.title])));
  const picker = choices.length > 1 ? select('live-student-initiative','Initiative',choices,selected?.initiativeId) : '';
  if (ctx.route.page === 'garden') return renderLiveGarden(data.garden,picker);
  if (ctx.route.page === 'sessions') return sessions.render(data.sessions,picker,selected);
  if (ctx.route.page === 'progress') return sessions.progress(data.sessions,selected,picker);
  if (ctx.route.page === 'tasks') return head({eyebrow:'INITIATIVE ASSIGNMENTS',title:'My Tasks',meta:picker})+
    work.render(data.tasks,'live-student-work',Boolean(ctx.route.id));
  if (ctx.route.page === 'account') {
    const action = data.individualEnabled ?
      `<a class="button primary" href="${esc(data.individualUrl)}">Continue to Individual</a>` :
      data.canUpgrade ? u.button('Enable Individual access','live-student-upgrade',{},'button primary') : '';
    return head({eyebrow:'YOUR ACCOUNT',title:'Account & upgrade',meta:picker})+
      card(data.displayName,`<p>${data.individualEnabled ? 'Individual access is enabled on this account.' :
        data.canUpgrade ? 'Enable Individual access on this account and continue through setup. Your Initiative and group history stay with you.' :
          'Enabling Individual access requires current Initiative admission and a confirmed account email.'}</p>
        <div class="actions">${action}<a class="button quiet" href="/account/profile">Account security</a></div>`);
  }
  const history = data.history?.length ? card('Your group history',`<ol class="iw-history">${data.history.map(row=>
    `<li><time>${esc(u.date(row.startedAtUtc))}</time><span>${esc(row.name)}</span>
      <small>${esc(row.endReason || row.status)}${row.endedAtUtc ? ' · '+esc(u.date(row.endedAtUtc)) : ''}</small></li>`).join('')}</ol>`) : '';
  if (ctx.route.page === 'group') {
    const body = group ? card(group.name,`<p>${esc(group.description || '')}</p><dl class="preview-facts">
      <div><dt>Coach</dt><dd>${esc(group.coach || 'Unassigned')}</dd></div>
      <div><dt>Active students</dt><dd>${esc(group.memberCount)}</dd></div></dl>`) :
      emptyState('No current group',selected?.canAccess ? 'Your group will appear when you are placed.' : 'Current group access requires active Initiative participation.');
    return head({eyebrow:selected?.title || 'STUDENT',title:'My Group',meta:picker})+body+history;
  }
  const hero = `<section class="hero student-hero"><div><p class="eyebrow">STUDENT WORKSPACE</p>
    <h1>Welcome, ${esc(data.displayName.split(' ')[0])}.</h1>
    ${selected ? `<p>${esc(selected.title)} · ${esc(selected.organizer)}</p>${pill(selected.status)}` : ''}
    </div></section>`;
  if (!selected) return hero + emptyState('No Initiative participation yet','Your Student workspace opens when an Institution accepts your application.');
  return hero + card('Your Initiative',`${picker}<p>${group ? 'Your current group is '+esc(group.name)+'.' :
    selected.canAccess ? 'You have been accepted. Your group will appear when you are placed.' :
      'Your current Initiative access is closed. Your placement history is available below.'}</p>
    <div class="actions">${u.link('My Group',navPath(data,'group'),'button primary')}
    ${u.link('My Tasks',navPath(data,'tasks'),'button quiet')}
    ${u.link('Session schedule',navPath(data,'sessions'),'button quiet')}
    ${selected.canAccess ? u.link('Group Garden',navPath(data,'garden'),'button quiet') : ''}
    ${u.link('Account & upgrade',navPath(data,'account'),'button quiet')}</div>`)+history;
}

export function mount(ctx) {
  if (ctx.route.page === 'sessions') sessions.mount(ctx.staffData.sessions,ctx);
}

export function change(target,ctx) {
  if (target.name === 'live-student-initiative')
    ctx.go('student/'+ctx.route.page+'?initiative='+encodeURIComponent(target.value));
}

export async function action(action,target,ctx) {
  if (action === 'live-student-session-cancel') return sessions.cancel(ctx);
  if (action === 'live-task-start') {
    const task = ctx.staffData.tasks?.find(row=>row.id === target.dataset.id);
    if (task) await work.save(task,'start');
    await ctx.render();
    return;
  }
  if (action !== 'live-student-upgrade' || !ctx.staffData.selected) return;
  u.modal('Enable Individual access',
    u.checkbox('accept','I agree to the Terms of Service and Privacy Policy.'),async (values,form)=>{
      const accepted = form.elements.accept.checked;
      if (!accepted) throw new Error('Agree to the Terms of Service and Privacy Policy to continue.');
      const {url} = await workspaceRequest(api+'/'+ctx.staffData.selected.initiativeId+'/upgrade',{acceptTerms:accepted});
      location.assign(url);
    },'Continue to Individual');
}

export async function submit(form,ctx) {
  if (form.dataset.form === 'live-student-session-register') return sessions.submit(form,ctx);
  if (form.dataset.form !== 'live-work-submit') return;
  const task = ctx.staffData.tasks.find(row=>row.id === form.dataset.tkSubmit);
  if (!task) return;
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  try { await work.save(task,'submit',form.elements.text.value); await ctx.render(); }
  finally { button.disabled = false; }
}
