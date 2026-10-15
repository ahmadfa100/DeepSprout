import {categories,goals,modes,evidenceTypes,mutate,uid} from './store.js';
import {esc,date,badge,button,section,field,select,textarea,check,table,row,openDialog,confirmAction,toast,contentHeader} from './ui.js';
const nameOf=(data,id)=>data.users.find(u=>u.id===id)?.name||'Unassigned';
const groupOf=(data,id)=>data.groups.filter(g=>g.members.includes(id)).map(g=>g.name).join(', ')||'—';

let memberAccount=null,memberLoading=true;
export function setMemberAccount(account){memberAccount=account;memberLoading=false;}
function memberPreview(){
  if(!memberAccount)return section('Current member preview',`<p class="muted">${memberLoading?'Loading the member account stored in this browser…':'The member preview could not be loaded. Reload this page to try again.'}</p>`);
  const a=memberAccount,p=a.profile(),plan=a.plan(),checks=a.checkIns(),usage=a.usage();
  return section('Current member preview',`<p class="muted">${esc(a.label)} · shared with the member pages in this browser. This account is separate from the sample accounts below.</p><div class="detail-grid">${[['Name / email',`${p.name||'Not set'} · ${p.email||'No email recorded'}`],['Main goal',p.goal?.label||'Not chosen'],['Check-in / assessments',`${checks.filter(c=>c.baseline).length} of ${checks.length} starting tasks recorded`],['Roadmap',plan?`Cycle ${plan.cycleNumber} · day ${plan.day} of ${plan.lengthDays}`:'Not activated'],['Browser usage data',usage.connected?'Sample extension data available':'No extension data'],['Offline routine',`${a.routine().items.length} current items`]].map(([label,value])=>`<p><strong>${label}</strong><span>${esc(value)}</span></p>`).join('')}</div><div class="dialog-link-actions"><a class="button" href="profile.html">Open member profile ↗</a><a class="button" href="recovery-plan.html">Open member roadmap ↗</a><a class="button" href="lab.html">Open member check-in ↗</a></div>`);
}

function users(data) {
  const rows=data.users.map(u=>row([`<button class="link-button" data-action="user-detail" data-id="${u.id}">${esc(u.name)}</button><small>${esc(u.email)}</small>`,badge(u.role),esc(groupOf(data,u.id)),date(u.joined),esc(u.assessment),esc(u.plan),badge(u.status),button('View','user-detail',u.id)],{role:u.role,status:u.status}));
  return contentHeader('MANAGEMENT','Users','Review accounts, group membership, assessment progress, and plan status.')+memberPreview()+section('Sample administration accounts',table(['Name / email','Role','Group','Registered','Assessments','Plan','Status','Action'],rows,[{key:'role',label:'Role',options:['Student','Member','Trainer']},{key:'status',label:'Status',options:['active','paused','archived']}]))+`<p class="footnote">Demo records use fictional names and .test email addresses. Scores and personal evidence are not editable here.</p>`;
}
function userDetail(data,id) {
  const u=data.users.find(x=>x.id===id);if(!u)return;
  const plans=data.plans.filter(p=>p.userId===id);
  openDialog(u.name,`<div class="detail-grid"><p><strong>Email</strong><span>${esc(u.email)}</span></p><p><strong>Role</strong><span>${esc(u.role)}</span></p><p><strong>Registered</strong><span>${date(u.joined)}</span></p><p><strong>Group</strong><span>${esc(groupOf(data,id))}</span></p><p><strong>Assessments</strong><span>${esc(u.assessment)}</span></p><p><strong>Roadmap</strong><span>${esc(plans.map(p=>`${p.goal} · ${p.status}`).join(', ')||'None')}</span></p><p><strong>Digital Shield</strong><span>${esc(u.shield)}</span></p><p><strong>Recent account activity</strong><span>Joined ${date(u.joined)}; ${esc(u.assessment.toLowerCase())} assessment status.</span></p></div>${select('Account status','status',['active','paused','archived'],u.status)}<p class="footnote">Changing status is a local administrative demo action.</p>`,form=>{
    const status=form.get('status');if(status===u.status)return;
    confirmAction(`Change ${u.name}'s account status to ${status}?`,()=>{u.status=status;mutate(data,'Account Status Changed',u.name,`Status set to ${status}.`);toast('Account status updated.');window.dispatchEvent(new Event('admin-refresh'));});
  },'Update status');
}
function groups(data) {
  const rows=data.groups.map(g=>row([`<button class="link-button" data-action="group-detail" data-id="${g.id}">${esc(g.name)}</button><small>${esc(g.code)}</small>`,esc(nameOf(data,g.trainerId)),String(g.members.length),date(g.created),badge(g.status),button('Manage','group-detail',g.id)],{status:g.status}));
  return contentHeader('MANAGEMENT','Groups','Student training groups in a local Admin demo model.',button('Create group','group-create','','primary'))+section('Training groups',table(['Group / code','Trainer','Students','Created','Status','Action'],rows,[{key:'status',label:'Status',options:['active','archived']}]))+`<p class="footnote">These training groups are separate from Community Joint Goals. The current member pages do not have a backend group workflow.</p>`;
}
function groupEditor(data,id) {
  const g=data.groups.find(x=>x.id===id),editing=!!g;
  const trainers=data.users.filter(u=>u.role==='Trainer');
  openDialog(editing?'Edit group':'Create group',`${field('Group name','name',g?.name||'','text','required maxlength="80"')}${field('Identifier','code',g?.code||'','text','required maxlength="20"')}${select('Trainer','trainerId',trainers.map(t=>({value:t.id,label:t.name})),g?.trainerId||trainers[0]?.id)}`,form=>{
    const name=String(form.get('name')).trim(),code=String(form.get('code')).trim();
    if(data.groups.some(other=>other.code.toLowerCase()===code.toLowerCase()&&other.id!==id)){toast('Group identifier already exists.');return false;}
    if(editing){Object.assign(g,{name,code,trainerId:form.get('trainerId')});mutate(data,'Group Modified',name,'Updated group details.');}
    else {data.groups.push({id:uid('g'),name,code,trainerId:form.get('trainerId'),members:[],created:new Date().toISOString().slice(0,10),status:'active'});mutate(data,'Group Created',name,'Created a new student training group.');}
    toast('Group saved.');window.dispatchEvent(new Event('admin-refresh'));
  });
}
function groupDetail(data,id) {
  const g=data.groups.find(x=>x.id===id);if(!g)return;
  const studentOptions=data.users.filter(u=>u.role==='Student');
  openDialog(g.name,`<div class="detail-grid"><p><strong>Identifier</strong><span>${esc(g.code)}</span></p><p><strong>Trainer</strong><span>${esc(nameOf(data,g.trainerId))}</span></p><p><strong>Status</strong><span>${esc(g.status)}</span></p><p><strong>Created</strong><span>${date(g.created)}</span></p></div><div class="dialog-link-actions">${button('Edit details','group-edit',id)}${g.status==='active'?button('Archive group','group-archive',id,'danger'):''}</div><label class="field"><span>Search students</span><input type="search" id="member-search" placeholder="Search students"></label><div class="member-chooser">${studentOptions.map(u=>`<label class="check" data-member-name="${esc(u.name.toLowerCase())}"><input name="member" value="${u.id}" type="checkbox" ${g.members.includes(u.id)?'checked':''}><span>${esc(u.name)} <small>${esc(u.email)}</small></span></label>`).join('')}</div><p class="footnote">Membership is saved when you select Save members.</p>`,form=>{
    g.members=form.getAll('member');mutate(data,'Group Modified',g.name,`Membership updated to ${g.members.length} students.`);toast('Members updated.');window.dispatchEvent(new Event('admin-refresh'));
  },'Save members');
  document.getElementById('member-search').addEventListener('input',e=>document.querySelectorAll('[data-member-name]').forEach(label=>label.hidden=!label.dataset.memberName.includes(e.target.value.toLowerCase())));
}
function activities(data) {
  const rows=data.activities.map(a=>row([`<button class="link-button" data-action="activity-preview" data-id="${a.id}">${esc(a.name)}</button><small>${esc(a.description)}</small>`,`${esc(a.category)}<small>${esc(a.goals.join(', '))}</small>`,`${a.minutes} min<small>${esc(a.mode)}</small>`,a.planEligible?'Eligible':'Excluded',badge(a.status),`<div class="table-actions">${button('Edit','activity-edit',a.id)}${button('Preview','activity-preview',a.id)}</div>`],{category:a.category,status:a.status}));
  return contentHeader('MANAGEMENT','Activities','Manage published resources and the information members see.',button('Create activity','activity-create','','primary'))+section('Activity library',table(['Activity','Category / goals','Duration / mode','Roadmap','Status','Actions'],rows,[{key:'category',label:'Category',options:categories},{key:'status',label:'Publication',options:['draft','published','archived']}]))+`<p class="footnote">Published resources appear in Activities as read-only guides. Built-in timed practices record progress separately; publishing a guide does not add it to a member’s active plan.</p><a class="button" href="training.html" target="_blank" rel="noopener">View member Activities ↗</a>`;
}

function activityEditor(data,id) {
  const a=data.activities.find(x=>x.id===id),editing=!!a;
  openDialog(editing?'Edit activity':'Create activity',`${field('Activity name','name',a?.name||'','text','required maxlength="80"')}${textarea('Description','description',a?.description||'','required maxlength="240" rows="2"')}${textarea('Instructions','instructions',a?.instructions||'','required maxlength="600" rows="3"')}<div class="form-grid">${select('Category','category',categories,a?.category||categories[0])}${field('Estimated minutes','minutes',a?.minutes||10,'number','required min="1" max="180"')}${select('Availability','mode',modes,a?.mode||'On Demand')}${select('Evidence','evidence',evidenceTypes,a?.evidence||evidenceTypes[0])}</div><fieldset><legend>Supported goals</legend><div class="check-grid">${goals.map(g=>`<label class="check"><input type="checkbox" name="goals" value="${esc(g)}" ${a?.goals.includes(g)?'checked':''}>${esc(g)}</label>`).join('')}</div></fieldset>${field('Completion requirement','completion',a?.completion||'','text','required maxlength="100"')}${field('Existing asset path (optional)','image',a?.image||'','text','maxlength="200" placeholder="assets/..."')}${field('Image alt text','alt',a?.alt||'','text','maxlength="140"')}${check('Eligible for Roadmaps','planEligible',a?.planEligible??true)}${check('Eligible for a controlled Garden reward','reward',a?.reward??false)}<p class="footnote">Reward eligibility is a flag; Garden rules still determine actual effects and repeat limits. No arbitrary reward logic is accepted.</p>`,form=>{
    const selected=form.getAll('goals');if(!selected.length){toast('Select at least one supported goal.');return false;}
    const image=String(form.get('image')||'').trim();if(image&&!/^assets\/[a-z0-9/_ .-]+\.(png|jpg|jpeg|webp|svg)$/i.test(image)){toast('Use an existing image under assets/.');return false;}
    const values={name:String(form.get('name')).trim(),description:String(form.get('description')).trim(),instructions:String(form.get('instructions')).trim(),category:form.get('category'),goals:selected,minutes:Number(form.get('minutes')),mode:form.get('mode'),evidence:form.get('evidence'),completion:String(form.get('completion')).trim(),image,alt:String(form.get('alt')||'').trim(),planEligible:form.has('planEligible'),reward:form.has('reward')};
    if(editing){Object.assign(a,values);mutate(data,'Activity Updated',a.name,'Updated structured activity details.');}
    else {data.activities.push({id:uid('a'),...values,status:'draft'});mutate(data,'Activity Created',values.name,'Saved activity as draft.');}
    toast('Activity saved as '+(editing?a.status:'draft')+'.');window.dispatchEvent(new Event('admin-refresh'));
  },editing?'Save changes':'Save draft');
}
function activityPreview(data,id) {
  const a=data.activities.find(x=>x.id===id);if(!a)return;
  openDialog('Activity preview',`<div class="preview-card"><p class="eyebrow">${esc(a.category)}</p><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p><p><strong>Instructions:</strong> ${esc(a.instructions)}</p><div class="meta-line">${esc(a.minutes)} min · ${esc(a.mode)} · ${esc(a.evidence)}</div><p><strong>Goals:</strong> ${esc(a.goals.join(', '))}</p><p><strong>Completion requirement:</strong> ${esc(a.completion)}</p>${a.image?`<img src="${esc(a.image)}" alt="${esc(a.alt)}">`:''}</div><p class="footnote">${a.planEligible?'Eligible for Roadmaps':'Excluded from Roadmaps'} · ${a.reward?'Garden reward eligible':'No Garden reward'} · ${a.status}</p><div class="dialog-link-actions">${a.status==='draft'?button('Publish','activity-publish',a.id,'primary'):''}${a.status!=='archived'?button('Archive','activity-archive',a.id):''}</div>`,()=>{},'Close');
}
export function renderCore(route,data) {return ({users,groups,activities})[route]?.(data);}
export function coreAction(action,id,data) {
  if(action==='user-detail')userDetail(data,id);
  else if(action==='group-create')groupEditor(data);
  else if(action==='group-edit')groupEditor(data,id);
  else if(action==='group-detail')groupDetail(data,id);
  else if(action==='group-archive')confirmAction('Archive this training group?',()=>{const g=data.groups.find(x=>x.id===id);g.status='archived';mutate(data,'Group Modified',g.name,'Archived group.');window.dispatchEvent(new Event('admin-refresh'));});
  else if(action==='activity-create')activityEditor(data);
  else if(action==='activity-edit')activityEditor(data,id);
  else if(action==='activity-preview')activityPreview(data,id);
  else if(['activity-publish','activity-archive'].includes(action))confirmAction(`${action==='activity-publish'?'Publish':'Archive'} this activity?`,()=>{const a=data.activities.find(x=>x.id===id);a.status=action==='activity-publish'?'published':'archived';mutate(data,action==='activity-publish'?'Activity Published':'Activity Archived',a.name,`Status set to ${a.status}.`);document.getElementById('editor-dialog').close();toast(`Activity ${a.status}.`);window.dispatchEvent(new Event('admin-refresh'));});
}
