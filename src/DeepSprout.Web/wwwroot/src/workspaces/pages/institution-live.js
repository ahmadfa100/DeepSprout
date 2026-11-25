import * as u from '../ui.js';
import * as institution from '../institution-application.js';
import {renderConsole} from './admin/console.js';
import * as initiatives from './initiative-live.js';

const e = u.esc;
const applicationPath = 'auth/application/organization';
const statusPath = 'auth/application-status';

async function request(path, method='GET', body) {
  const headers = {Accept:'application/json'};
  if (method !== 'GET') {
    const session = await fetch('/account/session', {cache:'no-store',redirect:'manual'});
    if (!session.ok) throw new Error('Sign in again to continue.');
    headers.RequestVerificationToken = (await session.json()).requestToken;
    headers['Content-Type'] = 'application/json';
  }
  const result = await fetch('/api/institutions/'+path, {method,headers,cache:'no-store',
    body:body === undefined ? undefined : JSON.stringify(body)});
  if (!result.ok) {
    const type = result.headers.get('content-type') || '';
    const message = {401:'Sign in again to continue.',403:'Platform Admin access is required.',
      404:'This record is not available to your account.'}[result.status];
    throw new Error(message || (result.status < 500 && type.includes('text/plain') ? await result.text() :
      'Institution data could not be saved or loaded. Try again.'));
  }
  return result.json();
}

function summaryView(summary, claim, applicant) {
  const details = claim ? {...claim.fields,audienceAges:claim.audienceAges} : {};
  return {id:summary.id, version:summary.version, type:'organization', personId:summary.id,
    name:summary.name, details, files:[], email:details.officialEmail,
    status:summary.status === 'MoreInfo' ? 'Needs More Info' : summary.status,
    submitted:summary.submittedAtUtc, updated:summary.decidedAtUtc,
    declaration:claim ? {text:institution.DECLARATION,at:claim.declaredAtUtc} : null,
    applicant};
}

export async function load(route) {
  try {
    if (route.area === 'admin') {
      if (route.id) {
        const {application,applicant,approvalBlocked} = await request('verification/'+encodeURIComponent(route.id));
        const entry = summaryView(application.summary,application.claim,applicant);
        entry.organizationStatus = application.organizationStatus;
        entry.messages = application.history.map(row=>({text:row.reason ? row.afterStatus+' · '+row.reason : row.action,
          created:row.atUtc, actorName:row.actor || 'Historical record'}));
        return {entry,approvalBlocked};
      }
      const {items,hasMore} = await request('verification?'+new URLSearchParams({
        decided:String(route.query.get('tab') === 'decided'), page:String(pageNumber(route))
      }));
      return {items:items.map(row=>({...summaryView(row.summary,null,{name:row.applicantName}),details:row.details})),hasMore};
    }
    if (route.area === 'organization') {
      const id = route.page === 'settings' ? route.id : route.query.get('institution');
      if (!id) return {error:'Choose an Institution from Application status.'};
      const profile = await request('mine/'+encodeURIComponent(id));
      return route.page === 'settings' ? {profile} : await initiatives.load(route,profile);
    }
    if (route.id === 'organization' && route.page === 'application') {
      return route.tail ? {detail:await request('applications/'+encodeURIComponent(route.tail))} : {};
    }
    const [application,institutions] = await Promise.all([
      request(route.id ? 'applications/'+encodeURIComponent(route.id) : 'applications'),
      request('mine')
    ]);
    return route.id ? {detail:application,institutions} : {items:application,institutions};
  } catch (error) { return {error:error.message}; }
}

function pageNumber(route) {
  return Math.max(0,Number.parseInt(route.query.get('page'),10) || 0);
}

function history(rows) {
  return rows.length ? `<ol class="ad-timeline">${rows.map(row=>`<li><time>${e(u.date(row.atUtc))}</time><div>
    <strong>${e(row.afterStatus)} · ${e(row.actor || 'Historical record')}</strong><p>${e(row.reason || row.action)}</p>
  </div></li>`).join('')}</ol>` : '<p>No decisions or notes are recorded.</p>';
}

export function render(ctx) {
  const {institutionData:data,route} = ctx;
  if (data.error) return u.header('INSTITUTIONS','Institution records')+`<p class="panel form-error" role="alert">${e(data.error)}</p>`;
  if (route.area === 'admin') {
    const items = data.entry ? [data.entry] : data.items;
    const people = items.map(row=>({id:row.id,name:row.applicant?.name || row.details.representative || 'Representative',
      ...row.applicant}));
    const view = renderConsole({...ctx,s:{applications:items,people},institutionLive:true});
    if (data.entry) return view;
    const page = pageNumber(route), link = 'admin/organizations?tab='+(route.query.get('tab') === 'decided' ? 'decided' : 'waiting')+'&page=';
    return view+`<div class="actions">${page ? u.link('Previous page',link+(page-1)) : ''}${data.hasMore ? u.link('Next page',link+(page+1)) : ''}</div>`;
  }
  if (route.area === 'organization') {
    if (route.page !== 'settings') return initiatives.render(ctx);
    const org = data.profile;
    return u.header('INSTITUTION PROFILE',org.name,'',
      u.link('Initiatives',initiatives.workspacePath(org.id,'organization/initiatives'),'button primary')+
      '<a class="button quiet" href="/workspaces.html?partner=live#/auth/application-status">Application status</a>')
      +u.section('Institution details',`<dl class="preview-facts"><div><dt>Status</dt><dd>${e(org.status)}</dd></div>
        <div><dt>Country</dt><dd>${e(org.countryCode)}</dd></div><div><dt>City</dt><dd>${e(org.headquartersCity || '')}</dd></div>
        <div><dt>Official email</dt><dd>${e(org.officialContactEmail || '')}</dd></div></dl>`);
  }
  if (route.page === 'application') {
    const detail = data.detail;
    if (detail && detail.summary.status !== 'MoreInfo') return u.header('INSTITUTION APPLICATION','This application cannot be edited','',u.link('Open status',statusPath+'/'+detail.summary.id));
    const saved = detail?.claim;
    const entry = {details:saved ? {...saved.fields,audienceAges:saved.audienceAges} : {country:'JO'}};
    return `<div class="auth-intro"><p class="eyebrow">INSTITUTION APPLICATION</p><h1>Introduce your institution.</h1><p>Apply using the account you signed in with. Your request stays pending until verification is available.</p></div>
      <div class="auth-form"><form class="panel" data-form="live-institution" data-id="${e(detail?.summary.id || '')}">
      ${detail?.summary.decisionReason ? u.note(detail.summary.decisionReason) : ''}
      ${institution.formMarkup(entry,null,true)}<p class="form-error" role="alert"></p><div class="actions">
      <button class="button primary">Review application</button>${u.link('Application status',statusPath)}
      </div></form></div>`;
  }
  const detail = data.detail;
  const workspaceLinks = data.institutions.map(org=>u.link(org.name,initiatives.workspacePath(org.id,'organization/dashboard'))).join('');
  if (detail) {
    const view = summaryView(detail.summary,detail.claim);
    const edit = detail.summary.status === 'MoreInfo' ? u.link('Update application',applicationPath+'/'+view.id,'button primary') : '';
    return u.header('APPLICATION STATUS',view.name,view.status+' · Institution '+detail.organizationStatus,u.link('All applications',statusPath)+edit)+
      u.section('History',history(detail.history))+ (detail.claim ? u.section('Submitted application',institution.reviewMarkup(view,true)) : '')+
      (workspaceLinks ? u.section('Your Institutions',workspaceLinks) : '');
  }
  return u.header('APPLICATION STATUS','Your Institution applications','',u.link('Register an Institution',applicationPath,'button primary'))+
    u.section('Applications',data.items.length ? `<ul class="action-list">${data.items.map(row=>`<li>
      <strong>${e(row.name)}</strong><span>${e(row.status)}</span>${u.link('View application',statusPath+'/'+row.id)}</li>`).join('')}</ul>` :
      '<p>You have no submitted applications.</p>')+(workspaceLinks ? u.section('Your Institutions',workspaceLinks) : '');
}

export function submit(form,ctx) {
  if (ctx.route.area === 'organization' && ctx.route.page === 'reports') return initiatives.submit(form,ctx);
  if (form.dataset.form !== 'live-institution' || !institution.groupsValid(form)) return;
  const {details} = institution.collect(form);
  const {audienceAges,...fields} = details;
  const id = form.dataset.id;
  const key = form.dataset.requestId ||= crypto.randomUUID();
  u.modal('Review your application',institution.reviewMarkup({details},true)+
    `<label><input name="declare" type="checkbox" required> ${e(institution.DECLARATION)}</label>`,
    async values=>{
      if (!values.declare) throw new Error('Confirm the declaration before submitting.');
      const saved = await request('applications'+(id?'/'+id:''),id?'PUT':'POST',
        {requestId:key,fields,audienceAges,declaration:true,expectedVersion:ctx.institutionData.detail?.summary.version});
      ctx.go(statusPath+'/'+saved.id);
    },'Submit application',{wide:true});
}

export function change(target,ctx) {
  if (ctx.route.area === 'organization' && ctx.institutionData?.profile && ctx.route.page !== 'settings')
    return initiatives.change(target,ctx);
}

export function drop(detail,ctx) {
  if (ctx.route.page === 'team' && ctx.institutionData.groups) return initiatives.drop(detail,ctx);
}

export function action(action,target,ctx) {
  if (ctx.route.area === 'organization' && ctx.institutionData?.profile && ctx.route.page !== 'settings')
    return initiatives.action(action,target,ctx);
  if (action !== 'application-decide') return;
  const entry = ctx.institutionData.entry;
  const decision = target.dataset.status === 'Needs More Info' ? 'MoreInfo' : target.dataset.status;
  u.modal(decision === 'MoreInfo' ? 'Request more information' : 'Reject application',
    u.area('reason','Decision reason','',true),
    async values=>{
      await request('verification/'+entry.id,'POST',{decision,reason:values.reason,version:entry.version});
      await ctx.render();
    },'Save decision');
}
