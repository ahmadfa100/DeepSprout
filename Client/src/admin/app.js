import {renderSubscriptions} from './subscriptions.js';
import {read,isDemo,endDemo} from './store.js';
import {icon} from './icons.js';
import {renderDashboard,attentionItems} from './dashboard.js';
import {esc,renderTable,sortTable} from './ui.js';
import {renderCore,coreAction,setMemberAccount} from './core.js';
import {renderOperations,operationsAction} from './operations.js';
import {renderPlatform,platformAction,platformChange} from './platform.js';

if(!isDemo())location.replace('login.html');
const nav=[
  ['Overview',[['dashboard','dashboard','Dashboard']]],
  ['Management',[['users','user','Users'],['activities','activities','Activities'],['plans','plans','Roadmaps'],['assessments','assessments','Assessments'],['shield','shield','Digital Shield']]],
  ['Publishing',[['content','content','Content'],['community','users','Community']]],
  ['Business',[['subscriptions','billing','Subscriptions & Revenue']]],
  ['System',[['settings','settings','Settings']]]
];
// Legacy destinations remain routable, without appearing in the simplified sidebar.
const labels={...Object.fromEntries(nav.flatMap(group=>group[1].map(item=>[item[0],item[2]]))),groups:'Groups',garden:'Garden Rules',community:'Community',audit:'Audit Log'};
labels.reports=labels.subscriptions;
let period='30';
let collapsed=localStorage.getItem('deepsprout-admin-sidebar-collapsed')==='true';
let drawer=false;
const app=document.getElementById('app');
function route(){const name=location.hash.replace(/^#\/?/,'').split('/')[0];return name==='reports'?'subscriptions':labels[name]?name:'dashboard';}
function render(){
  if(!isDemo())return;
  const data=read(),current=route(),attention=attentionItems(data);
  let seen=[];try{const saved=JSON.parse(localStorage.getItem('deepsprout-admin-notifications-seen')||'[]');seen=Array.isArray(saved)?saved:[];}catch{}
  const unread=attention.filter(item=>!seen.includes(item.key)).length;
  const content=current==='dashboard'?renderDashboard(data,period):current==='subscriptions'?renderSubscriptions(data):renderCore(current,data)||renderOperations(current,data)||renderPlatform(current,data)||'';
  document.title=`${labels[current]} — DeepSprout Admin`;
  app.innerHTML=`<div class="admin-shell ${collapsed?'collapsed':''} ${drawer?'drawer-open':''}"><button class="drawer-shade" data-action="drawer-close" aria-label="Close admin menu" tabindex="-1"></button><aside id="admin-sidebar" class="sidebar" aria-label="Admin navigation"><a class="brand" href="#/dashboard" aria-label="DeepSprout Admin dashboard"><img src="assets/brand/floral-mark.png" alt=""><span><strong>DeepSprout</strong><small>ADMIN PORTAL</small></span></a><button class="drawer-dismiss icon-button" data-action="drawer-close" aria-label="Close admin menu">${icon('close')}</button><nav>${nav.map(([group,items])=>`<div class="nav-group"><p>${esc(group)}</p>${items.map(([key,symbol,label])=>`<a href="#/${key}" class="${current===key?'active':''}" ${current===key?'aria-current="page"':''} aria-label="${esc(label)}" title="${esc(label)}"><span class="nav-icon">${icon(symbol)}</span><span class="nav-text">${esc(label)}</span><span class="nav-tooltip" aria-hidden="true">${esc(label)}</span></a>`).join('')}</div>`).join('')}</nav><div class="side-bottom"><a href="#/settings" class="admin-person" title="Admin profile"><span class="avatar">${esc(data.settings.adminName[0]||'A')}</span><span class="nav-text"><strong>${esc(data.settings.adminName)}</strong><small>Super Admin · Demo</small></span></a><button type="button" class="logout" data-action="logout" aria-label="Log out" title="Log out"><span class="nav-icon">${icon('logout')}</span><span class="nav-text">Log out</span></button></div></aside><div class="main-wrap"><header class="topbar"><div class="top-left"><button type="button" class="icon-button sidebar-toggle" data-action="sidebar-toggle" aria-controls="admin-sidebar" aria-expanded="${matchMedia('(max-width:880px)').matches?drawer:!collapsed}" aria-label="${matchMedia('(max-width:880px)').matches?(drawer?'Close':'Open'):(collapsed?'Expand':'Collapse')} sidebar">${icon('panel')}</button><div class="breadcrumb"><a href="#/dashboard">Admin</a><span>›</span><span>${esc(labels[current])}</span></div></div><div class="top-actions">${isDemo()?'<span class="demo-pill"><i></i> Demo Mode</span>':''}<a class="view-site" href="index.html" target="_blank" rel="noopener">View Website ${icon('external')}</a><details class="header-popover" id="admin-notifications"><summary class="alert-button" aria-label="Notifications${unread?`, ${unread} unread`:''}">${icon('bell')}${unread?`<b>${unread}</b>`:''}</summary><div class="popover-body"><h2>Notifications</h2><p class="muted">Activity and content review queues</p>${attention.map(item=>`<a href="#/${item.route}"><span class="notification-dot ${seen.includes(item.key)?'read':''}" aria-label="${seen.includes(item.key)?'Read':'Unread'}"></span><div><strong>${esc(item.title)}</strong><small>${esc(item.context)}</small></div>${icon('chevron')}</a>`).join('')||'<p class="notification-empty">No administrative notifications. You’re all caught up.</p>'}</div></details><details class="header-popover" id="admin-profile"><summary class="top-avatar" aria-label="Admin profile menu">${esc(data.settings.adminName[0]||'A')}</summary><div class="popover-body profile-popover"><h2>${esc(data.settings.adminName)}</h2><p class="muted">Super Admin · Demo</p><a href="#/settings">${icon('settings')}Profile & settings</a><button data-action="logout">${icon('logout')}Log out</button></div></details></div></header><main class="admin-content" id="main-content">${content}</main><footer class="admin-footer"><span>DeepSprout · Frontend development demo</span><span>Local browser data · No backend authorization</span></footer></div></div>`;
  renderTable(app);
  const sidebar=app.querySelector('.sidebar'),main=app.querySelector('.main-wrap');
  sidebar.inert=matchMedia('(max-width:880px)').matches&&!drawer;
  main.inert=matchMedia('(max-width:880px)').matches&&drawer;
  app.querySelector('#admin-notifications').addEventListener('toggle',event=>{
    if(event.target.open){try{localStorage.setItem('deepsprout-admin-notifications-seen',JSON.stringify(attention.map(item=>item.key)));}catch{}const badge=event.target.querySelector('summary b');if(badge)badge.remove();event.target.querySelector('summary').setAttribute('aria-label','Notifications');}
  });
}
function toggleSidebar(){
  if(matchMedia('(max-width:880px)').matches){drawer=!drawer;render();app.querySelector(drawer?'.drawer-dismiss':'.sidebar-toggle').focus();}
  else{collapsed=!collapsed;localStorage.setItem('deepsprout-admin-sidebar-collapsed',String(collapsed));render();app.querySelector('.sidebar-toggle').focus();}
}
function closeDrawer(){drawer=false;render();app.querySelector('.sidebar-toggle').focus();}
window.addEventListener('hashchange',()=>{const fromDrawer=drawer;drawer=false;const dialog=document.getElementById('editor-dialog');if(dialog.open)dialog.close();render();if(fromDrawer){const main=document.getElementById('main-content');main.tabIndex=-1;main.focus();}window.scrollTo(0,0);});
window.addEventListener('admin-refresh',render);
document.addEventListener('click',event=>{
  const close=event.target.closest('[data-close]');if(close){document.getElementById('editor-dialog').close();return;}
  const sort=event.target.closest('[data-sort]');if(sort){sortTable(sort);return;}
  const step=event.target.closest('[data-page-step]');if(step){const panel=step.closest('.panel');panel.dataset.page=Math.max(0,Number(panel.dataset.page||0)+Number(step.dataset.pageStep));renderTable(app);return;}
  const target=event.target.closest('[data-action]');if(!target)return;
  const {action,id}=target.dataset;
  if(action==='logout'){endDemo();location.href='login.html';return;}
  if(action==='drawer-toggle'){drawer=!drawer;render();return;}
  if(action==='drawer-close'){closeDrawer();return;}
  if(action==='sidebar-toggle'){toggleSidebar();return;}
  if(action.startsWith('group-')||action.startsWith('user-')||action.startsWith('activity-')){coreAction(action,id,read());return;}
  if(action.startsWith('plan-')||action.startsWith('assessment-')||action.startsWith('shield-')||action.startsWith('garden-')){operationsAction(action,id,read());return;}
  platformAction(action,id,read());
});
document.addEventListener('input',event=>{if(event.target.matches('[data-table-search]')){event.target.closest('.panel').dataset.page='0';renderTable(app);}});
document.addEventListener('change',event=>{if(event.target.id==='dashboard-period'){period=event.target.value;render();document.getElementById('dashboard-period').focus();return;}if(event.target.matches('[data-table-filter]')){event.target.closest('.panel').dataset.page='0';renderTable(app);}else platformChange(event.target);});
document.getElementById('editor-dialog').addEventListener('click',e=>{if(e.target.id==='editor-dialog')e.target.close();});
if(isDemo())render();

document.addEventListener('click',event=>{document.querySelectorAll('.header-popover[open]').forEach(popover=>{if(!popover.contains(event.target))popover.open=false;});});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    if(drawer){closeDrawer();return;}
    document.querySelectorAll('.header-popover[open]').forEach(popover=>{popover.open=false;popover.querySelector('summary').focus();});
  }
  if(event.key==='Tab'&&drawer&&!document.getElementById('editor-dialog').open){
    const links=[...app.querySelector('.sidebar').querySelectorAll('a,button')].filter(el=>el.getClientRects().length),first=links[0],last=links.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
matchMedia('(max-width:880px)').addEventListener('change',()=>{drawer=false;render();});

window.DeepSproutAccount?.load().then(account=>{setMemberAccount(account);render();}).catch(()=>{setMemberAccount(null);render();});
window.addEventListener('storage',event=>{if(['deepsprout-admin-demo-v1','deepsprout-community-demo-v1'].includes(event.key)||event.key?.startsWith('deepsprout-account-')){window.DeepSproutAccount?.load(true).then(account=>{setMemberAccount(account);render();}).catch(()=>{});render();}});
