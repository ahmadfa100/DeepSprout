import {goals,mutate,uid} from './store.js';
import {esc,date,badge,button,section,field,select,textarea,table,row,openDialog,confirmAction,toast,contentHeader,bars} from './ui.js';
const person=(data,id)=>data.users.find(u=>u.id===id)?.name||'Unknown user';
function plans(data) {
  const rows=data.plans.map(p=>row([esc(p.id),esc(person(data,p.userId)),esc(p.goal),badge(p.status),date(p.start),esc(p.stage),`<div class="mini-progress"><i style="width:${p.progress}%"></i></div>${p.progress}%`],{status:p.status}));
  return contentHeader('RECOVERY OPERATIONS','Recovery plans','Rules and eligible activities shape a plan; the simulator uses deterministic demo rules.',button('Open Plan Simulator','plan-simulator','','primary'))+
    `<div class="two-col">${section('Supported recovery goals',`<div class="tag-list">${goals.map(g=>`<span>${esc(g)}</span>`).join('')}</div><p class="muted">Rule version 1.0 · plan stages: Assess, Reset, Rebuild, Deepen, Independence.</p>`)}${section('Plan configuration',`<dl class="settings-list"><div><dt>Activity source</dt><dd>Published, plan-eligible records</dd></div><div><dt>Schedule</dt><dd>Short daily sessions and a weekly review</dd></div><div><dt>Rule version</dt><dd>1.0 · demo configuration</dd></div></dl>`)}</div>`+
    section('Plan templates',`<div class="card-grid">${data.planTemplates.map(t=>`<article class="item-card"><p class="eyebrow">RULE ${esc(t.ruleVersion)} · ${esc(t.status)}</p><h3>${esc(t.name)}</h3><p>${esc(t.goal)} · up to ${t.dailyLimit} daily activit${t.dailyLimit===1?'y':'ies'} · review ${esc(t.reviewDay)}</p>${button('Edit template','plan-template-edit',t.id)}</article>`).join('')}</div><div class="dialog-link-actions">${button('Create template','plan-template-create','','primary')}</div>`)+
    section('Active and paused plans',table(['Plan ID','User','Goal','Status','Started','Stage','Progress'],rows,[{key:'status',label:'Status',options:['active','paused']}]))+
    `<p class="footnote">This screen does not run an AI engine or ASP.NET service. Plan records and progress are fictional demo data.</p>`;
}
function simulator(data) {
  const eligible=data.activities.filter(a=>a.status==='published'&&a.planEligible);
  openDialog('Plan Simulator',`<p class="footnote">Simulation only. Rule version 1.0 selects matching published activities, then adds a weekly review.</p>${select('Example goal','goal',goals,goals[0])}${select('Assessment profile','profile',['Starting gently','Frequent distraction','Ready for deeper practice'],'Starting gently')}${select('Preference','preference',['Short daily steps','Offline first','Structured focus'],'Short daily steps')}${field('Available minutes per day','minutes',15,'number','required min="5" max="120"')}<fieldset><legend>Eligible activities</legend><div class="check-grid">${eligible.map(a=>`<label class="check"><input type="checkbox" name="activities" value="${a.id}" checked>${esc(a.name)}</label>`).join('')}</div></fieldset><div id="plan-result"></div>`,form=>{
    const goal=form.get('goal'),profile=form.get('profile'),preference=form.get('preference'),minutes=Number(form.get('minutes'));
    const template=data.planTemplates.find(t=>t.goal===goal&&t.status==='active');
    const chosen=eligible.filter(a=>form.getAll('activities').includes(a.id)&&a.goals.includes(goal)&&a.minutes<=minutes);
    const priority=a=>preference==='Offline first'&&a.category==='Offline Life'?0:preference==='Structured focus'&&a.category==='Meaningful Practice'?0:profile==='Frequent distraction'&&a.category==='Digital Protection & Habit Control'?0:1;
    const daily=chosen.filter(a=>['Assigned','On Demand'].includes(a.mode)).sort((a,b)=>priority(a)-priority(b)||a.minutes-b.minutes).slice(0,Math.min(template?.dailyLimit||1,profile==='Starting gently'?1:2));
    const triggered=chosen.filter(a=>a.mode==='Triggered');
    const weekly=chosen.filter(a=>a.mode==='Scheduled Review');
    const list=items=>items.length?`<ul>${items.map(a=>`<li><strong>${esc(a.name)}</strong> · ${a.minutes} min</li>`).join('')}</ul>`:'<p>No matching activity in this mode.</p>';
    document.getElementById('plan-result').innerHTML=`<div class="result-panel"><p class="eyebrow">DEMO PLAN PREVIEW · RULE ${esc(template?.ruleVersion||'1.0')}</p><h3>${esc(goal)} · ${esc(profile)}</h3><p>Template: ${esc(template?.name||'Default gentle plan')} · preference: ${esc(preference)} · ${minutes} minutes per day.</p><h4>Daily practice</h4>${list(daily)}<h4>Triggered support</h4>${list(triggered)}<h4>Review on ${esc(template?.reviewDay||'Sunday')}</h4>${list(weekly)}<p class="footnote">Only selected, published, goal-matched activities within the time limit are included. Triggered support appears when relevant; review is weekly.</p></div>`;
    toast('Simulation generated from local rules.');
  },'Generate preview',true);
}
function templateEditor(data,id) {
  const template=data.planTemplates.find(t=>t.id===id);
  openDialog(template?'Edit plan template':'Create plan template',`${field('Template name','name',template?.name||'','text','required maxlength="80"')}${select('Recovery goal','goal',goals,template?.goal||goals[0])}${field('Maximum daily activities','dailyLimit',template?.dailyLimit||1,'number','required min="1" max="3"')}${select('Weekly review day','reviewDay',['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],template?.reviewDay||'Sunday')}${field('Rule version','ruleVersion',template?.ruleVersion||'1.0','text','required pattern="[0-9]+\\.[0-9]+"')}${select('Status','status',['active','inactive'],template?.status||'active')}<p class="footnote">The simulator uses this template. Existing member plans are not rewritten.</p>`,form=>{
    const values={name:String(form.get('name')).trim(),goal:form.get('goal'),dailyLimit:Number(form.get('dailyLimit')),reviewDay:form.get('reviewDay'),ruleVersion:String(form.get('ruleVersion')).trim(),status:form.get('status')};
    if(template)Object.assign(template,values);else data.planTemplates.push({id:uid('pt'),...values});
    mutate(data,'Plan Template Updated',values.name,`Rule version ${values.ruleVersion} saved.`);toast('Plan template saved.');window.dispatchEvent(new Event('admin-refresh'));
  });
}
function assessments(data) {
  const rows=data.assessments.map(a=>row([`<button class="link-button" data-action="assessment-detail" data-id="${a.id}">${esc(a.name)}</button>`,esc(a.version),`${a.minutes} min`,String(a.completions),badge(a.status),button('Manage','assessment-detail',a.id)],{status:a.status}));
  return contentHeader('RECOVERY OPERATIONS','Assessments','Four core assessments and their content versions.')+section('Assessment library',table(['Assessment','Version','Duration','Completions','Status','Action'],rows,[{key:'status',label:'Status',options:['active','inactive']}]))+`<p class="footnote">These are digital habit and attention activities, not medical diagnoses. Scoring rules and comparative baselines are not editable in this demo.</p>`;
}
function assessmentDetail(data,id) {
  const a=data.assessments.find(x=>x.id===id);if(!a)return;
  openDialog(a.name,`<div class="detail-grid"><p><strong>Version</strong><span>${esc(a.version)}</span></p><p><strong>Duration</strong><span>${a.minutes} minutes</span></p><p><strong>Completions</strong><span>${a.completions}</span></p><p><strong>Status</strong><span>${esc(a.status)}</span></p></div>${textarea('Instructions','instructions',a.instructions,'required maxlength="400" rows="3"')}${textarea('Content prompts (one per line)','questions',a.questions.join('\n'),'required rows="5"')}${select('Status','status',['active','inactive'],a.status)}<div class="version-history"><strong>Content version history</strong><p>v${esc(a.version)} · Current</p>${(a.history||[]).map(h=>`<p>v${esc(h.version)} · ${date(h.time)} · ${esc(h.summary)}</p>`).join('')}</div><p class="warning">Changing instructions or questions creates a new content version. Results across versions may not be directly comparable.</p>`,form=>{
    const questions=String(form.get('questions')).split('\n').map(s=>s.trim()).filter(Boolean);if(!questions.length){toast('Add at least one content prompt.');return false;}
    confirmAction('Save a new assessment content version? Comparisons across versions may change.',()=>{a.history??=[];a.history.unshift({version:a.version,time:new Date().toISOString(),summary:'Previous instructions and prompts'});a.instructions=String(form.get('instructions')).trim();a.questions=questions;a.status=form.get('status');const parts=a.version.split('.');a.version=`${parts[0]}.${Number(parts[1]||0)+1}`;mutate(data,'Assessment Version Updated',a.name,`Content version ${a.version} saved; scoring unchanged.`);toast('Assessment content version saved.');window.dispatchEvent(new Event('admin-refresh'));});
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
  openDialog('Garden rule preview',`<div class="garden-preview"><span class="garden-emoji" aria-hidden="true">${r.effect==='Small flower'?'🌼':r.effect==='Young sprout'?'🌱':'○'}</span><div><p class="eyebrow">MOCK EVENT</p><h3>${esc(r.event)}</h3><p><strong>Effect:</strong> ${esc(r.effect)}</p><p><strong>Why:</strong> ${esc(r.reason)}</p><p><strong>Eligibility:</strong> ${esc(r.condition)} · limit ${esc(r.limit)}</p></div></div><div class="dialog-link-actions">${button('Edit structured rule','garden-edit',id)}</div>${select('Rule status','status',['active','inactive'],r.status)}<p class="footnote">Preview only; no growth event is awarded.</p>`,form=>{if(r.status!==form.get('status')){r.status=form.get('status');mutate(data,'Garden Rule Updated',r.name,`Status set to ${r.status}.`);toast('Rule status updated.');window.dispatchEvent(new Event('admin-refresh'));}},'Save status');
}
function gardenEditor(data,id) {
  const r=data.gardenRules.find(x=>x.id===id);if(!r)return;
  const personal=r.event==='Personal To-Do checked';
  openDialog('Edit Garden rule',`${field('Rule name','name',r.name,'text','required maxlength="80"')}${field('Triggering event','event',r.event,'text','required maxlength="100"')}${select('Evidence type','evidence',['In-platform recorded','Self-reported offline','None'],r.evidence)}${select('Growth effect','effect',personal?['No growth']:['No growth','Small flower','Young sprout','Decorative leaf'],r.effect)}${field('Eligibility condition','condition',r.condition,'text','required maxlength="140"')}${select('Repeat limit','limit',personal?['0']:['0','1/day','1/week'],r.limit)}${textarea('Why this rule exists','reason',r.reason,'required maxlength="240" rows="2"')}<p class="warning">Personal To-Do clicks cannot generate growth. Larger milestones should use recorded evidence and a repeat limit.</p>`,form=>{
    const effect=form.get('effect'),evidence=form.get('evidence'),limit=form.get('limit'),event=String(form.get('event')).trim();
    if((event==='Personal To-Do checked'&&(effect!=='No growth'||limit!=='0'))||(effect!=='No growth'&&evidence==='None')||(effect==='Young sprout'&&(evidence!=='In-platform recorded'||limit!=='1/week'))){toast('This rule conflicts with Garden eligibility safeguards.');return false;}
    Object.assign(r,{name:String(form.get('name')).trim(),event,evidence,effect,condition:String(form.get('condition')).trim(),limit,reason:String(form.get('reason')).trim()});
    const parts=r.version.split('.');r.version=`${parts[0]}.${Number(parts[1]||0)+1}`;
    mutate(data,'Garden Rule Updated',r.name,`Structured rule version ${r.version} saved.`);toast('Garden rule saved.');window.dispatchEvent(new Event('admin-refresh'));
  });
}
export function renderOperations(route,data){return ({plans,assessments,shield,garden})[route]?.(data);}
export function operationsAction(action,id,data){
  if(action==='plan-simulator')simulator(data);
  else if(action==='plan-template-create')templateEditor(data);
  else if(action==='plan-template-edit')templateEditor(data,id);
  else if(action==='assessment-detail')assessmentDetail(data,id);
  else if(action==='shield-preset-create')presetEditor(data);
  else if(action==='shield-preset-edit')presetEditor(data,id);
  else if(action==='shield-preset-preview'){const p=data.shield.presets.find(x=>x.id===id);openDialog('Blocked page preview',`<div class="blocked-preview"><span>🌿</span><h3>A moment to pause</h3><p>${esc(p.message)}</p><small>This is a design preview. No site is blocked.</small></div>`,()=>{},'Close');}
  else if(action==='shield-category-add')openDialog('Add suggested category',field('Category name','name','','text','required maxlength="50"'),form=>{const value=String(form.get('name')).trim();if(!data.shield.categories.some(c=>c.toLowerCase()===value.toLowerCase())){data.shield.categories.push(value);mutate(data,'Shield Category Added',value,'Added suggested distraction category.');window.dispatchEvent(new Event('admin-refresh'));}});
  else if(action==='shield-category-remove')confirmAction('Remove this suggested category?',()=>{const value=data.shield.categories.splice(Number(id),1)[0];mutate(data,'Shield Category Removed',value,'Removed suggested category.');window.dispatchEvent(new Event('admin-refresh'));});
  else if(action==='garden-preview')gardenPreview(data,id);
  else if(action==='garden-edit')gardenEditor(data,id);
}
