import {read,isDemo,endDemo} from './store.js';
import {esc,renderTable,sortTable} from './ui.js';
import {renderCore,coreAction} from './core.js';
import {renderOperations,operationsAction} from './operations.js';
import {renderPlatform,platformAction,platformChange} from './platform.js';

if(!isDemo())location.replace('login.html');
const nav=[
  ['Overview',[['dashboard','◫','Dashboard']]],
  ['Management',[['users','♙','Users'],['groups','◎','Groups'],['activities','✦','Activities'],['plans','▦','Recovery Plans'],['assessments','◇','Assessments'],['shield','⬡','Digital Shield'],['garden','❀','Garden Rules']]],
  ['Platform',[['content','▤','Content Studio'],['community','◌','Community'],['reports','▥','Reports & Analytics']]],
  ['System',[['settings','⚙','Settings'],['audit','≡','Audit Log']]]
];
const labels=Object.fromEntries(nav.flatMap(group=>group[1].map(item=>[item[0],item[2]])));
let collapsed=localStorage.getItem('deepsprout-admin-sidebar-collapsed')==='true';
let drawer=false;
const app=document.getElementById('app');
function route(){const name=location.hash.replace(/^#\/?/,'').split('/')[0];return labels[name]?name:'dashboard';}
function render(){
  if(!isDemo())return;
  const data=read(),current=route(),pending=data.community.reports.filter(r=>r.status==='pending').length;
  const content=renderCore(current,data)||renderOperations(current,data)||renderPlatform(current,data)||'';
  document.title=`${labels[current]} — DeepSprout Admin`;
  app.innerHTML=`<div class="admin-shell ${collapsed?'collapsed':''} ${drawer?'drawer-open':''}"><div class="drawer-shade" data-action="drawer-close"></div><aside class="sidebar" aria-label="Admin navigation"><a class="brand" href="#/dashboard"><img src="assets/brand/floral-mark.png" alt=""><span><strong>DeepSprout</strong><small>ADMIN WORKSPACE</small></span></a><button class="collapse" type="button" data-action="sidebar-toggle" aria-label="${collapsed?'Expand':'Collapse'} sidebar">${collapsed?'→':'←'}</button><nav>${nav.map(([group,items])=>`<div class="nav-group"><p>${esc(group)}</p>${items.map(([key,icon,label])=>`<a href="#/${key}" class="${current===key?'active':''}" ${current===key?'aria-current="page"':''} title="${esc(label)}"><span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-text">${esc(label)}</span>${key==='community'&&pending?`<b>${pending}</b>`:''}</a>`).join('')}</div>`).join('')}</nav><div class="side-bottom"><a href="#/settings" class="admin-person"><span class="avatar">${esc(data.settings.adminName[0]||'A')}</span><span class="nav-text"><strong>${esc(data.settings.adminName)}</strong><small>Super Admin · Demo</small></span></a><button type="button" class="logout" data-action="logout"><span class="nav-icon" aria-hidden="true">↪</span><span class="nav-text">Log out</span></button></div></aside><div class="main-wrap"><header class="topbar"><div class="top-left"><button type="button" class="mobile-menu icon-button" data-action="drawer-toggle" aria-label="Open admin menu">☰</button><div><div class="breadcrumb"><a href="#/dashboard">Admin</a><span>›</span>${esc(labels[current])}</div><strong>${esc(labels[current])}</strong></div></div><div class="top-actions"><span class="demo-pill">● Demo Mode</span><a class="view-site" href="index.html" target="_blank" rel="noopener">View website ↗</a><a class="alert-button" href="#/community" aria-label="${pending} pending community reports" title="Pending reports">♧${pending?`<b>${pending}</b>`:''}</a><a class="top-avatar" href="#/settings" aria-label="Admin profile">${esc(data.settings.adminName[0]||'A')}</a></div></header><main class="admin-content" id="main-content">${content}</main><footer class="admin-footer"><span>DeepSprout · Frontend development demo</span><span>Local browser data · No backend authorization</span></footer></div></div>`;
  renderTable(app);
}
window.addEventListener('hashchange',()=>{drawer=false;const dialog=document.getElementById('editor-dialog');if(dialog.open)dialog.close();render();window.scrollTo(0,0);});
window.addEventListener('admin-refresh',render);
document.addEventListener('click',event=>{
  const close=event.target.closest('[data-close]');if(close){document.getElementById('editor-dialog').close();return;}
  const sort=event.target.closest('[data-sort]');if(sort){sortTable(sort);return;}
  const step=event.target.closest('[data-page-step]');if(step){const panel=step.closest('.panel');panel.dataset.page=Math.max(0,Number(panel.dataset.page||0)+Number(step.dataset.pageStep));renderTable(app);return;}
  const target=event.target.closest('[data-action]');if(!target)return;
  const {action,id}=target.dataset;
  if(action==='logout'){endDemo();location.href='login.html';return;}
  if(action==='drawer-toggle'){drawer=!drawer;render();return;}
  if(action==='drawer-close'){drawer=false;render();return;}
  if(action==='sidebar-toggle'){collapsed=!collapsed;localStorage.setItem('deepsprout-admin-sidebar-collapsed',String(collapsed));render();return;}
  if(action.startsWith('group-')||action.startsWith('user-')||action.startsWith('activity-')){coreAction(action,id,read());return;}
  if(action.startsWith('plan-')||action.startsWith('assessment-')||action.startsWith('shield-')||action.startsWith('garden-')){operationsAction(action,id,read());return;}
  platformAction(action,id,read());
});
document.addEventListener('input',event=>{if(event.target.matches('[data-table-search]')){event.target.closest('.panel').dataset.page='0';renderTable(app);}});
document.addEventListener('change',event=>{if(event.target.matches('[data-table-filter]')){event.target.closest('.panel').dataset.page='0';renderTable(app);}else platformChange(event.target);});
document.getElementById('editor-dialog').addEventListener('click',e=>{if(e.target.id==='editor-dialog')e.target.close();});
if(isDemo())render();
