import {goals,mutate,uid} from './store.js';
import {esc,date,badge,button,section,field,select,textarea,table,row,openDialog,confirmAction,toast,contentHeader,bars} from './ui.js';
const person=(data,id)=>data.users.find(u=>u.id===id)?.name||'Unknown user';
function plans(data) {
  const rows=data.plans.map(p=>row([esc(p.id),esc(person(data,p.userId)),esc(p.goal),badge(p.status),date(p.start),esc(p.stage),`<div class="mini-progress"><i style="width:${p.progress}%"></i></div>${p.progress}%`],{status:p.status}));
  return contentHeader('RECOVERY OPERATIONS','Recovery plans','Rules and eligible activities shape a plan; the simulator uses deterministic demo rules.',button('Open Plan Simulator','plan-simulator','','primary'))+
    `<div class="two-col">${section('Supported recovery goals',`<div class="tag-list">${goals.map(g=>`<span>${esc(g)}</span>`).join('')}</div><p class="muted">Rule version 1.0 · plan stages: Assess, Reset, Rebuild, Deepen, Independence.</p>`)}${section('Plan configuration',`<dl class="settings-list"><div><dt>Activity source</dt><dd>Published, plan-eligible records</dd></div><div><dt>Schedule</dt><dd>Short daily sessions and a weekly review</dd></div><div><dt>Rule version</dt><dd>1.0 · demo configuration</dd></div></dl>`)}</div>`+
    section('Active and paused plans',table(['Plan ID','User','Goal','Status','Started','Stage','Progress'],rows,[{key:'status',label:'Status',options:['active','paused']}]))+
    `<p class="footnote">This screen does not run an AI engine or ASP.NET service. Plan records and progress are fictional demo data.</p>`;
}
function simulator(data) {
  const eligible=data.activities.filter(a=>a.status==='published'&&a.planEligible);
  openDialog('Plan Simulator',`<p class="footnote">Simulation only. Rule version 1.0 selects matching published activities, then adds a weekly review.</p>${select('Example goal','goal',goals,goals[0])}${select('Assessment profile','profile',['Starting gently','Frequent distraction','Ready for deeper practice'],'Starting gently')}${select('Preference','preference',['Short daily steps','Offline first','Structured focus'],'Short daily steps')}${field('Available minutes per day','minutes',15,'number','required min="5" max="120"')}<fieldset><legend>Eligible activities</legend><div class="check-grid">${eligible.map(a=>`<label class="check"><input type="checkbox" name="activities" value="${a.id}" checked>${esc(a.name)}</label>`).join('')}</div></fieldset><div id="plan-result"></div>`,form=>{
    const goal=form.get('goal'),profile=form.get('profile'),minutes=Number(form.get('minutes'));
    const chosen=eligible.filter(a=>form.getAll('activities').includes(a.id)&&a.goals.includes(goal)&&a.minutes<=minutes);
    const ordered=chosen.sort((a,b)=>a.minutes-b.minutes).slice(0,3);
    document.getElementById('plan-result').innerHTML=`<div class="result-panel"><p class="eyebrow">DEMO PLAN PREVIEW · RULE V1.0</p><h3>${esc(goal)} · ${esc(profile)}</h3>${ordered.length?`<ol>${ordered.map(a=>`<li><strong>${esc(a.name)}</strong> · ${a.minutes} min · ${esc(a.mode)}</li>`).join('')}</ol><p>Schedule: one activity per day, with a weekly review. Preference: ${esc(form.get('preference'))}.</p>`:'<p>No selected published activity matches this goal and time. Increase your time or select another goal.</p>'}</div>`;
    toast('Simulation generated from local rules.');
  },'Generate preview',true);
}
function assessments(data) {
  const rows=data.assessments.map(a=>row([`<button class="link-button" data-action="assessment-detail" data-id="${a.id}">${esc(a.name)}</button>`,esc(a.version),`${a.minutes} min`,String(a.completions),badge(a.status),button('Manage','assessment-detail',a.id)],{status:a.status}));
  return contentHeader('RECOVERY OPERATIONS','Assessments','Four core assessments and their content versions.')+section('Assessment library',table(['Assessment','Version','Duration','Completions','Status','Action'],rows,[{key:'status',label:'Status',options:['active','inactive']}]))+`<p class="footnote">These are digital habit and attention activities, not medical diagnoses. Scoring rules and comparative baselines are not editable in this demo.</p>`;
}
function assessmentDetail(data,id) {
  const a=data.assessments.find(x=>x.id===id);if(!a)return;
  openDialog(a.name,`<div class="detail-grid"><p><strong>Version</strong><span>${esc(a.version)}</span></p><p><strong>Duration</strong><span>${a.minutes} minutes</span></p><p><strong>Completions</strong><span>${a.completions}</span></p><p><strong>Status</strong><span>${esc(a.status)}</span></p></div>${textarea('Instructions','instructions',a.instructions,'required maxlength="400" rows="3"')}${textarea('Content prompts (one per line)','questions',a.questions.join('\n'),'required rows="5"')}${select('Status','status',['active','inactive'],a.status)}<p class="warning">Changing instructions or questions creates a new content version. Results across versions may not be directly comparable.</p>`,form=>{
    const questions=String(form.get('questions')).split('\n').map(s=>s.trim()).filter(Boolean);if(!questions.length){toast('Add at least one content prompt.');return;}
    confirmAction('Save a new assessment content version? Comparisons across versions may change.',()=>{a.instructions=String(form.get('instructions')).trim();a.questions=questions;a.status=form.get('status');const parts=a.version.split('.');a.version=`${parts[0]}.${Number(parts[1]||0)+1}`;mutate(data,'Assessment Version Updated',a.name,`Content version ${a.version} saved; scoring unchanged.`);toast('Assessment content version saved.');window.dispatchEvent(new Event('admin-refresh'));});
  },'Save new version');
}
function shield(data) {
  const connected=data.users.filter(u=>u.shield==='Connected').length;
  return contentHeader('RECOVERY OPERATIONS','Digital Shield','Platform defaults and browser extension messaging.')+
    `<div class="two-col">${section('Extension overview',`<dl class="settings-list"><div><dt>Supported browser</dt><dd>Chrome extension concept</dd></div><div><dt>Connected accounts</dt><dd>${connected} demo statuses</dd></div><div><dt>Telemetry</dt><dd>Unavailable</dd></div></dl><p class="warning">${esc(data.shield.warning)} It does not monitor iPhone or Android apps.</p>`)}${section('Suggested site categories',`<div class="tag-list">${data.shield.categories.map((c,i)=>`<span>${esc(c)} <button type="button" data-action="shield-category-remove" data-id="${i}" aria-label="Remove ${esc(c)}">×</button></span>`).join('')}</div>${button('Add category','shield-category-add')}`)}</div>`+
    section('Protection presets',`<div class="card-grid">${data.shield.presets.map(p=>`<article class="item-card"><p class="eyebrow">DEFAULT TEMPLATE</p><h3>${esc(p.name)}</h3><p>Starts at ${esc(p.start)}</p><blockquote>${esc(p.message)}</blockquote>${button('Edit preset','shield-preset-edit',p.id)} ${button('Preview blocked page','shield-preset-preview',p.id)}</article>`).join('')}</div>${button('Create preset','shield-preset-create','','primary')}`)+`<p class="footnote">Each person’s protection preferences remain their own. These templates do not alter existing member settings.</p>`;
}
function presetEditor(data,id) {
  const p=data.shield.presets.find(x=>x.id===id);
  openDialog(p?'Edit protection preset':'Create protection preset',`${field('Preset name','name',p?.name||'','text','required maxlength="60"')}${field('Suggested start time','start',p?.start||'19:00','time','required')}${textarea('Intentional pause message','message',p?.message||'','required maxlength="240" rows="3"')}`,form=>{
    const values={name:String(form.get('name')).trim(),start:form.get('start'),message:String(form.get('message')).trim()};
    if(p)Object.assign(p,values);else data.shield.presets.push({id:uid('sp'),...values});
    mutate(data,'Shield Preset Updated',values.name,'Updated platform default messaging.');toast('Protection preset saved.');window.dispatchEvent(new Event('admin-refresh'));
  });
}
function garden(data) {
  const rows=data.gardenRules.map(r=>row([`<button class="link-button" data-action="garden-preview" data-id="${r.id}">${esc(r.name)}</button>`,esc(r.event),esc(r.evidence),esc(r.effect),esc(r.condition),esc(r.limit),esc(r.version),badge(r.status),button('Preview','garden-preview',r.id)],{status:r.status}));
  return contentHeader('RECOVERY OPERATIONS','Garden rules','Growth reflects eligible participation and documented events.')+section('Growth rules',table(['Rule','Event','Evidence','Effect','Condition','Repeat','Version','Status','Action'],rows,[{key:'status',label:'Status',options:['active','inactive']}]))+`<p class="footnote">The Living Garden is a participation metaphor. Personal To-Do clicks and repeated actions do not automatically generate growth.</p>`;
}
function gardenPreview(data,id) {
  const r=data.gardenRules.find(x=>x.id===id);if(!r)return;
  openDialog('Garden rule preview',`<div class="garden-preview"><span class="garden-emoji" aria-hidden="true">${r.effect==='Small flower'?'🌼':r.effect==='Young sprout'?'🌱':'○'}</span><div><p class="eyebrow">MOCK EVENT</p><h3>${esc(r.event)}</h3><p><strong>Effect:</strong> ${esc(r.effect)}</p><p><strong>Why:</strong> ${esc(r.reason)}</p><p><strong>Eligibility:</strong> ${esc(r.condition)} · limit ${esc(r.limit)}</p></div></div>${select('Rule status','status',['active','inactive'],r.status)}<p class="footnote">Preview only; no growth event is awarded.</p>`,form=>{if(r.status!==form.get('status')){r.status=form.get('status');mutate(data,'Garden Rule Updated',r.name,`Status set to ${r.status}.`);toast('Rule status updated.');window.dispatchEvent(new Event('admin-refresh'));}},'Save status');
}
export function renderOperations(route,data){return ({plans,assessments,shield,garden})[route]?.(data);}
export function operationsAction(action,id,data){
  if(action==='plan-simulator')simulator(data);
  else if(action==='assessment-detail')assessmentDetail(data,id);
  else if(action==='shield-preset-create')presetEditor(data);
  else if(action==='shield-preset-edit')presetEditor(data,id);
  else if(action==='shield-preset-preview'){const p=data.shield.presets.find(x=>x.id===id);openDialog('Blocked page preview',`<div class="blocked-preview"><span>🌿</span><h3>A moment to pause</h3><p>${esc(p.message)}</p><small>This is a design preview. No site is blocked.</small></div>`,()=>{},'Close');}
  else if(action==='shield-category-add')openDialog('Add suggested category',field('Category name','name','','text','required maxlength="50"'),form=>{const value=String(form.get('name')).trim();if(!data.shield.categories.some(c=>c.toLowerCase()===value.toLowerCase())){data.shield.categories.push(value);mutate(data,'Shield Category Added',value,'Added suggested distraction category.');window.dispatchEvent(new Event('admin-refresh'));}});
  else if(action==='shield-category-remove')confirmAction('Remove this suggested category?',()=>{const value=data.shield.categories.splice(Number(id),1)[0];mutate(data,'Shield Category Removed',value,'Removed suggested category.');window.dispatchEvent(new Event('admin-refresh'));});
  else if(action==='garden-preview')gardenPreview(data,id);
}
