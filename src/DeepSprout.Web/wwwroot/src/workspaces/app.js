import {syncRegistrationExperience,registrationFeedback} from '../pages/auth/register/experience/workspace-entry.js';
import {read,person,workspaces,dispatch,demoEnabled,activeGrants,initiativeStudent,orgFor} from './store.js';
import {labels,defaults,navigation} from './navigation.js';
import * as ui from './ui.js';
import {mountPickers} from './picker.js';
import {renderAccount,commonAction,renderNotifications} from './shared.js';
import {nowMs} from './domain.js';
import {mountMotion} from './ds.js';
// The Razor view links workspace-styles.css, the single list of workspace stylesheets. A server still running an
// older compiled view may lack that link while serving these newer modules, so add it rather than render unstyled.
if(![...document.querySelectorAll('link[rel="stylesheet"]')].some(link=>new URL(link.href,location.href).pathname.endsWith('/src/workspaces/workspace-styles.css'))){const l=document.createElement('link');l.rel='stylesheet';l.href='/src/workspaces/workspace-styles.css';document.head.append(l);}
const workspaceOptionLabel=area=>({student:'Student · Initiative',participant:'Explore · Opportunities & bookings'})[area]||`${labels[area]} workspace`;
/** Supervisors see only the menu items their kinds of assignment can use (routes stay reachable and explain themselves). */
function navFor(area,s,p){
 if(area!=='supervisor')return navigation[area]||[];
 const initiative=(s.grants||[]).some(g=>g.personId===p.id&&g.role==='supervisor'&&g.status==='Active'),activity=(s.appointments||[]).some(a=>a.personId===p.id&&['Accepted','Invited'].includes(a.status));
 const inst=['applications','students','coaches','excuses'],outdoor=['experiences','cohorts','evaluations'];
 return navigation.supervisor.filter(([key])=>key==='§'||((initiative||!inst.includes(key))&&(activity||!outdoor.includes(key))));
}
/** Sidebar markup: labelled groups, with empty groups dropped. */
function navMarkup(items,area,page){
 const out=[];items.forEach(([key,icon,label],i)=>{if(key==='§'){const next=items[i+1];if(next&&next[0]!=='§')out.push(`<p class="nav-group">${ui.esc(icon)}</p>`);return;}out.push(`<a href="${ui.href(`${area}/${key}`)}" ${page===key?'aria-current="page"':''}>${ui.icon(icon)}<span>${label}</span></a>`);});
 return out.join('');
}
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Purposeful entrance: staggered reveal and count-up of real values. Skipped under reduced motion. */
function animateIn(root,refresh=false){const items=[...root.querySelectorAll('.iw-reveal')];items.forEach((el,i)=>el.style.setProperty('--i',Math.min(i,10)));if(refresh||reducedMotion())return;root.querySelectorAll('[data-count]').forEach(node=>{const target=Number(node.dataset.count);if(!Number.isFinite(target)||target<=0||target>100000)return;const start=performance.now(),dur=650;const tick=t=>{const k=Math.min(1,(t-start)/dur),eased=1-Math.pow(1-k,3);node.textContent=String(Math.round(target*eased));if(k<1)requestAnimationFrame(tick);};node.textContent='0';requestAnimationFrame(tick);});}
/** Arrival half of the "My initiative" transition started in the Individual app. */
function portalArrival(){let data=null;try{data=JSON.parse(sessionStorage.getItem('deepsprout-initiative-portal')||'null');sessionStorage.removeItem('deepsprout-initiative-portal');}catch{}if(!data||reducedMotion())return;const o=document.createElement('div');o.className='ds-portal is-arriving';o.setAttribute('aria-hidden','true');o.innerHTML=`<div class="ds-portal-inner"><svg class="ds-portal-mark" viewBox="0 0 24 24"><path d="M12 21v-9M12 15C6 15 3 11 3 5c6 0 9 3 9 10Zm0-3c0-6 3-9 9-9 0 6-3 9-9 9Z"/></svg><span class="ds-portal-eyebrow">My initiative</span><strong>${ui.esc(data.title||'')}</strong><small>${ui.esc(data.org||'')}</small></div>`;document.body.append(o);setTimeout(()=>o.remove(),1300);}
const app=document.getElementById('app');
export const localUI={};
let generation=0,drawer=false,currentModule,currentContext,lastView='';
const sidebarScroll=new Map();
// Re-rendering the same view after an action keeps the page still: no entrance
// animation, same scroll position, and focus returns to the control used.
const KEYS=['action','id','person','group','kind','initiative','tab','mode'];
function focusKey(){let el=document.activeElement;const pk=el?.closest?.('[data-picker]');if(pk)el=pk.querySelector('select.iw-picker-native');if(!el||!app.contains(el)||!el.dataset)return null;const parts=KEYS.filter(k=>el.dataset[k]!=null).map(k=>`[data-${k}="${CSS.escape(el.dataset[k])}"]`);if(el.name&&!parts.length)parts.push(`[name="${CSS.escape(el.name)}"]`);return parts.length?el.tagName.toLowerCase()+parts.join(''):null;}
const modules={auth:()=>import('./pages/auth.js'),join:()=>import('./pages/auth.js'),mentor:()=>import('./pages/mentor.js'),student:()=>import('./pages/student.js'),organization:()=>import('./pages/organization.js'),provider:()=>import('./pages/retired-provider.js'),supervisor:()=>import('./pages/supervisor.js'),admin:()=>import('./pages/admin.js'),participant:()=>import('./pages/participant.js')};
export function route(){const [pathname,search='']=location.hash.replace(/^#\/?/,'').split('?'),parts=pathname.split('/').filter(Boolean);return {area:parts[0]||'auth',page:parts[1]||(parts[0]?'': 'register'),id:parts[2],tail:parts[3],query:new URLSearchParams(search),path:pathname};}
function go(path){drawer=false;location.hash=ui.href(path);}
function run(action,p={},message='Saved in the local demo.'){const result=dispatch(action,p);ui.toast(message);return result;}
function demoPanel(s){if(!demoEnabled)return '';return `<details class="demo-panel"><summary>Development demo · identity, scenarios & reset</summary><div class="demo-panel-content"><p>All people and operational records are fictional. Identity selection is a local development helper. Reset affects only these partner workspaces.</p><div class="form-grid">${ui.select('demo-identity','Provisioned demo identity',s.people.map(p=>[p.id,`${p.name} · ${[...(p.individual?['Individual']:[]),...workspaces({...s,session:{...s.session,personId:p.id}}).map(w=>labels[w])].join(' + ')||'Applicant'}`]),s.session.personId)}${ui.select('demo-scenario','Load scenario',[['connected','Connected ecosystem'],['busy-initiative','Institution with a busy initiative'],['individual-initiative','Individual (Ahmad) in an initiative'],['supervisor-demo','Supervisor with coach reports and meetings'],['admin-demo','Admin with requests and reports'],['empty-mentor','Coach with no groups'],['empty-organization','Institution with no initiatives'],['empty-outdoor','Institution with no Outdoor Activities'],['unassigned-supervisor','Supervisor with no assignments'],['revision','Student needing revision'],['pending','Applicant pending verification'],['offer','Outdoor Activity with an active seat offer']])}</div><div class="actions">${ui.button('Switch identity','demo-identity',{},'button quiet')}${ui.button('Add rich demo data','demo-enrich',{},'button quiet')}${ui.button('Load scenario','demo-scenario',{},'button quiet')}${ui.button('Reset partner demo data','demo-reset',{},'button quiet')}${ui.link('Partner entry','auth/register','text-link')}</div><div class="demo-clock"><p><strong>Demo clock</strong> · ${ui.esc(new Date(nowMs(s)).toLocaleString('en-GB',{timeZone:'Asia/Amman',dateStyle:'medium',timeStyle:'short'}))} (Asia/Amman)${s.clock?.story?' · starts at the seeded story date':''}</p><div class="actions">${ui.button('+1 hour','demo-clock',{hours:1},'button quiet small')}${ui.button('+24 hours','demo-clock',{hours:24},'button quiet small')}${ui.button('+7 days','demo-clock',{hours:168},'button quiet small')}${ui.button('Use real time','demo-clock',{reset:1},'button quiet small')}</div><div class="actions"><label class="sr-only" for="demo-date">Demo date and time</label><input id="demo-date" type="datetime-local" value="${new Date(nowMs(s)+3*3600000).toISOString().slice(0,16)}">${ui.button('Set demo date','demo-clock-set',{},'button quiet small')}</div><small>Moves offer and invitation expiry together. It never changes recorded history.</small></div>${ui.note('Local state simulates permissions, verification, QR check-in and capacity. It cannot enforce production authentication or cross-device concurrency.')}</div></details>`;}
/** The organization/role identity that heads the sidebar, so the workspace always says whose it is. */
function sidebarIdentity(area,s,p){
 if(area==='organization'){const org=orgFor(s);return org?`<div class="ws-identity"><span class="ws-identity-mark" aria-hidden="true">${ui.esc(org.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</span><div><strong>${ui.esc(org.name)}</strong><small>${org.status==='Approved'?'Verified institution':ui.esc(org.status)}</small></div></div>`:'';}
 const role={supervisor:'Scoped Supervisor',mentor:'Institution-invited Coach',admin:'Platform governance',student:'Invited student',participant:'Opportunities & bookings'}[area];
 return role?`<div class="ws-identity">${ui.avatar(p.name)}<div><strong>${ui.esc(p.name)}</strong><small>${ui.esc(role)}</small></div></div>`:'';
}
export async function render(){
 const previousSidebar=app.querySelector('.sidebar');
 if(previousSidebar&&currentContext)sidebarScroll.set(`${currentContext.person.id}:${currentContext.route.area}`,previousSidebar.scrollTop);
 currentModule?.unmount?.();
 const version=++generation,r=route(),s=read(),p=person(s),publicArea=['auth','join'].includes(r.area);
 if(r.area!=='auth')syncRegistrationExperience(r);
 if(!modules[r.area]){app.innerHTML=`<main id="main" class="main">${ui.missing()}</main>`;return;}
 if(!publicArea&&!p){go('auth/login');return;}
 if(r.area==='provider'){const module=await modules.provider();if(version!==generation)return;app.innerHTML=`<main id="main" class="auth-wrap" tabindex="-1">${module.render({s,person:p,route:r,ui})}</main>`;document.title='Outdoor Provider retired — DeepSprout';return;}
 if(!publicArea&&!workspaces(s).includes(r.area)&&!(r.area==='supervisor'&&p.workspaces.includes('supervisor'))&&!(r.area==='student'&&initiativeStudent(s,p))){app.innerHTML=`<main id="main" class="auth-wrap">${ui.header('WORKSPACE ACCESS','This workspace is unavailable.','The current demo identity has no active membership or approved application for this workspace.')}${ui.link('Choose an available workspace','auth/workspaces')}${demoPanel(s)}</main>`;return;}
 const module=await modules[r.area]();if(version!==generation)return;
 const view=location.hash,refresh=view===lastView,keep=refresh?{y:scrollY,focus:focusKey()}:null;lastView=view;
 const ctx={s,person:p,route:r,go,run,render,ui,localUI};currentModule=module;currentContext=ctx;
 let content;
 if(!publicArea&&(r.page==='account'||(['profile','settings'].includes(r.page)&&!['organization','admin'].includes(r.area))))content=renderAccount(ctx);
 else if(r.page==='notifications')content=renderNotifications(ctx);
 else content=module.render(ctx);
 content=content??ui.missing();
 if(publicArea){app.innerHTML=`<div class="auth-scene" aria-hidden="true"></div><main id="main" data-route="${ui.esc(r.path)}" class="auth-wrap"><div class="auth-top"><a class="brand" href="index.html"><img src="assets/brand/floral-mark.png" alt=""><span>DeepSprout</span></a><div class="actions"><span class="demo-dot">Frontend demonstration</span>${ui.link('Demo sign in','auth/login','button quiet')}</div></div>${content}${demoPanel(s)}<p class="auth-foot">Fictional local demonstration · no emails, uploads, payments or real verification<br>© 2026 DeepSprout · ${ui.link('Help & privacy','auth/help','text-link')} · <a class="text-link" href="index.html">Home</a></p></main>`;}
 else{/* A Coach exists only by institution invitation: list the Coach workspace only for someone holding an active Coach role. */const available=workspaces(s).filter(w=>w!=='mentor'||w===r.area||activeGrants(s,p.id,'coach').length);if(!available.includes(r.area))available.unshift(r.area);const items=navFor(r.area,s,p),pageLabel=items.find(x=>x[0]===r.page)?.[2]||{create:'Create new',account:'Account',notifications:'Notifications'}[r.page]||'Details';app.innerHTML=`<div class="shell ${ui.esc(r.area)} ${drawer?'drawer-open':''}"><button class="mobile-shade" data-action="drawer-close" aria-label="Close navigation"></button><aside class="sidebar" ${matchMedia('(max-width:900px)').matches&&!drawer?'inert':''} aria-label="${labels[r.area]} navigation"><a class="brand" href="${ui.href(`${r.area}/${defaults[r.area]}`)}"><img src="assets/brand/floral-mark.png" alt=""><span>DeepSprout<small>GROW, TOGETHER</small></span></a>${sidebarIdentity(r.area,s,p)}<p class="eyebrow workspace-label">${labels[r.area]} WORKSPACE</p><nav>${navMarkup(items,r.area,r.page)}</nav><div class="sidebar-bottom"><a class="text-link" href="${p.individual?'index.html':ui.href('student/account')}">${p.individual?'Open my Individual app':'Upgrade to Individual'}</a><a class="text-link" href="${p.individual?'src/pages/member/explore/explore.html':ui.href('participant/discover')}">${p.individual?'Regular Explore':'Explore opportunities'}</a><p>Fictional records · local demo</p></div></aside><div class="shell-content"><header class="topbar"><button type="button" class="icon-button mobile-menu" data-action="drawer-open" aria-label="Open navigation" aria-expanded="${drawer}">${ui.icon('menu')}</button><nav class="context" aria-label="Breadcrumb"><a href="${ui.href(`${r.area}/${defaults[r.area]}`)}">${ui.esc(labels[r.area])}</a><span aria-hidden="true">/</span><span aria-current="page">${ui.esc(pageLabel)}</span></nav><div class="actions"><span class="demo-dot">Demo mode</span><label class="sr-only" for="workspace-switch">Current workspace</label><select id="workspace-switch" class="workspace-select">${available.map(w=>`<option value="${w}" ${w===r.area?'selected':''}>${ui.esc(workspaceOptionLabel(w))}</option>`).join('')}</select><a href="${ui.href(`${r.area}/account`)}" class="person-line" aria-label="Account for ${ui.esc(p.name)}">${ui.avatar(p.name)}<strong>${ui.esc(p.name.split(' ')[0])}</strong></a>${ui.button('Sign out','logout',{},'button quiet small')}</div></header><main id="main" data-route="${ui.esc(r.path)}" data-page="${ui.esc(r.page)}" class="main" tabindex="-1">${content}${demoPanel(s)}</main></div></div>`;app.querySelector('.sidebar').scrollTop=sidebarScroll.get(`${p.id}:${r.area}`)||0;}
 document.title=`${document.querySelector('h1')?.textContent||labels[r.area]} — DeepSprout`;
 syncRegistrationExperience(r);
 if(r.area==='student')portalArrival();
 app.classList.toggle('is-refresh',refresh);
 module.mount?.(ctx);mountPickers(app);ui.applyFilters(app);animateIn(app,refresh);mountMotion(app,{refresh});
 if(keep){scrollTo(0,keep.y);if(keep.focus){const f=app.querySelector(keep.focus);(f?.matches('.iw-picker-native')?f.parentElement.querySelector('.iw-picker-trigger'):f)?.focus({preventScroll:true});}}
}
/**
 * Page-to-page motion: a short, content-only View Transition (the shell stays
 * put) between different views. Same-view re-renders, reduced motion and
 * browsers without the API render directly. Navigation is never blocked.
 */
function navigate(){
 const after=()=>{if(!document.getElementById('workspace-dialog').open)document.getElementById('main')?.focus({preventScroll:true});window.scrollTo(0,0);};
 const sameArea=lastView.split('/')[1]===location.hash.split('/')[1];
 if(!document.startViewTransition||reducedMotion()||location.hash===lastView){render().then(after);return;}
 document.documentElement.dataset.nav=sameArea?'within':'across';
 const t=document.startViewTransition(()=>render());
 t.updateCallbackDone.then(after,after);t.finished.finally(()=>delete document.documentElement.dataset.nav);
}
ui.bindDialog();
const mapWorld=(lat,lon,zoom)=>{const scale=256*2**zoom;return [(lon+180)/360*scale,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*scale];};
const mapLatLon=(x,y,zoom)=>{const scale=256*2**zoom;return [(180/Math.PI)*Math.atan(Math.sinh(Math.PI*(1-2*y/scale))),x/scale*360-180];};
function paintBuilderMap(map){
 const zoom=Number(map.dataset.zoom),lat=Number(map.dataset.lat),lon=Number(map.dataset.lon),[cx,cy]=mapWorld(lat,lon,zoom),tiles=map.querySelector('.builder-map-tiles');
 tiles.replaceChildren();tiles.style.transform='';
 for(let y=Math.floor(cy/256)-1;y<=Math.floor(cy/256)+1;y++)for(let x=Math.floor(cx/256)-2;x<=Math.floor(cx/256)+2;x++){const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;img.style.left=`calc(50% + ${Math.round(x*256-cx)}px)`;img.style.top=`calc(50% + ${Math.round(y*256-cy)}px)`;tiles.append(img);}
 const pin=map.querySelector('.builder-map-pin'),address=map.closest('.builder-place').querySelector('[name^="address"]')?.value.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
 if(pin&&address){const [px,py]=mapWorld(Number(address[1]),Number(address[2]),zoom);pin.style.left=`calc(50% + ${Math.round(px-cx)}px)`;pin.style.top=`calc(50% + ${Math.round(py-cy)}px)`;}
}
function selectBuilderMapPoint(map,dx=0,dy=0){
 const zoom=Number(map.dataset.zoom),[cx,cy]=mapWorld(Number(map.dataset.lat),Number(map.dataset.lon),zoom),[lat,lon]=mapLatLon(cx+dx,cy+dy,zoom),place=map.closest('.builder-place'),coordinates=`${lat.toFixed(5)}, ${lon.toFixed(5)}`;
 place.querySelector('[name^="venue"]').value=`Pinned place · ${coordinates}`;place.querySelector('[name^="address"]').value=coordinates;
 const city=place.querySelector('[name^="mapCenter"]')?.value||'';
 place.querySelector('.builder-place-selected').innerHTML=`<strong>Place selected</strong><span>${city ? `${city} · ` : ''}${coordinates}</span>`;
 place.querySelector('[data-action="builder-map-use-center"]').textContent='Move pin here';
 let pin=map.querySelector('.builder-map-pin');if(!pin){pin=document.createElement('span');pin.className='builder-map-pin';pin.setAttribute('aria-hidden','true');pin.textContent='●';map.append(pin);}pin.style.left=`calc(50% + ${Math.round(dx)}px)`;pin.style.top=`calc(50% + ${Math.round(dy)}px)`;
}
let mapDrag=null;
// Actions inside the shared dialog (it lives outside #app) use the same handler.
const onAction=async e=>{const target=e.target.closest('[data-action]');if(!target)return;const a=target.dataset.action;try{
 if(a==='drawer-open'||a==='drawer-close'){drawer=a==='drawer-open';await render();if(drawer)app.querySelector('.sidebar nav a')?.focus();else app.querySelector('.mobile-menu')?.focus();return;}
 if(a==='logout'){run('auth.logout',{},'Signed out of the local demo.');go('auth/login');return;}
 if(a==='demo-identity'){run('demo.signin',{personId:document.querySelector('[name="demo-identity"]').value},'Demo identity changed.');go('auth/workspaces');await render();return;}
 if(a==='demo-clock-set'){const value=document.getElementById('demo-date').value;run('demo.clock',{at:`${value}:00+03:00`},'Demo date set (Asia/Amman). Records created now carry this date.');await render();return;}
 if(a==='demo-clock'){run('demo.clock',target.dataset.reset?{reset:true}:{hours:Number(target.dataset.hours)},target.dataset.reset?'Demo clock now follows real time.':`Demo clock moved ${target.dataset.hours} h. Expired offers and invitations were reconciled.`);await render();return;}
 if(a==='demo-enrich'){const added=dispatch('demo.enrich');ui.toast(added?'Fictional sample records added. Your existing records were kept.':'Rich demo records are already loaded.');await render();return;}
 if(a==='demo-reset'||a==='demo-scenario'){ui.confirm(a==='demo-reset'?'Reset partner demo data?':'Load a different demo scenario?','This replaces local partner-workspace progress. Individual and existing Admin data stay intact.',()=>{const scenario=a==='demo-reset'?'':document.querySelector('[name="demo-scenario"]').value;run(a==='demo-reset'?'demo.reset':'demo.scenario',a==='demo-reset'?{}:{name:scenario});for(const key of Object.keys(localUI))delete localUI[key];go(scenario==='admin-demo'?'admin/overview':scenario==='supervisor-demo'?'supervisor/dashboard':scenario==='offer'||scenario==='empty-outdoor'?'organization/activities':'auth/workspaces');render();});return;}
 if(a==='builder-choice-select'){
  const root=target.closest('[data-builder-choice]'),select=root.querySelector('select');
  select.value=target.dataset.value;
  if(select.name.startsWith('mapCenter')){const place=root.closest('.builder-place');if(place){place.querySelector('[name^="venue"]').value='';place.querySelector('[name^="address"]').value='';}}
  root.querySelector('.b-choice-current').innerHTML=target.querySelector('.b-choice-option-inner').innerHTML;
  root.querySelectorAll('.b-choice-option').forEach(option=>{const chosen=option===target;option.classList.toggle('is-selected',chosen);option.setAttribute('aria-current',String(chosen));});
  root.open=false;select.dispatchEvent(new Event('change',{bubbles:true}));return;
 }
 if(a==='builder-map-zoom'){const map=target.closest('.builder-map-shell').querySelector('.builder-map');map.dataset.zoom=String(Math.max(8,Math.min(16,Number(map.dataset.zoom)+Number(target.dataset.delta))));paintBuilderMap(map);return;}
 if(a==='builder-map-use-center'){selectBuilderMapPoint(target.closest('.builder-place').querySelector('.builder-map'));return;}
 if(a==='builder-map-select'){if(target.dataset.dragged){delete target.dataset.dragged;return;}const rect=target.getBoundingClientRect();selectBuilderMapPoint(target,e.detail?e.clientX-rect.left-rect.width/2:0,e.detail?e.clientY-rect.top-rect.height/2:0);return;}
 if(commonAction(a,target,currentContext))return;
 await currentModule?.action?.(a,target,currentContext);
 }catch(error){ui.toast(error.message,true);}};
app.addEventListener('click',onAction);document.getElementById('workspace-dialog').addEventListener('click',onAction);
document.addEventListener('click',e=>{document.querySelectorAll('.b-choice[open]').forEach(menu=>{if(!menu.contains(e.target))menu.open=false;});});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.b-choice[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary')?.focus();});});
app.addEventListener('submit',async e=>{e.preventDefault();e.target.dataset.submitter=e.submitter?.value||'';if(e.submitter?.value!=='draft'&&!e.target.reportValidity())return;try{registrationFeedback('submitting');await currentModule?.submit?.(e.target,currentContext);registrationFeedback('local-complete');}catch(error){registrationFeedback('error');const errorNode=e.target.querySelector('.form-error');if(errorNode){errorNode.textContent=error.message;errorNode.id||=`workspace-form-error-${generation}`;errorNode.tabIndex=-1;e.target.setAttribute('aria-describedby',errorNode.id);errorNode.focus();}else ui.toast(error.message,true);}});
app.addEventListener('change',e=>{if(e.target.id==='workspace-switch'){go(`${e.target.value}/${defaults[e.target.value]}`);return;}if(e.target.matches('[data-filter]'))ui.applyFilters(app);currentModule?.change?.(e.target,currentContext);});
app.addEventListener('pointerdown',e=>{if(e.target.closest('[data-create] input[name^="create-"]'))(localUI.create ||= {}).beforeChoiceScroll=window.scrollY;});
app.addEventListener('pointerdown',e=>{const map=e.target.closest('.builder-map');if(!map)return;mapDrag={map,id:e.pointerId,x:e.clientX,y:e.clientY,lat:Number(map.dataset.lat),lon:Number(map.dataset.lon)};map.setPointerCapture(e.pointerId);});
app.addEventListener('pointermove',e=>{if(!mapDrag||e.pointerId!==mapDrag.id)return;mapDrag.map.querySelector('.builder-map-tiles').style.transform=`translate(${e.clientX-mapDrag.x}px,${e.clientY-mapDrag.y}px)`;});
app.addEventListener('pointerup',e=>{if(!mapDrag||e.pointerId!==mapDrag.id)return;const {map,x,y,lat,lon}=mapDrag,dx=e.clientX-x,dy=e.clientY-y;if(Math.hypot(dx,dy)>4){const zoom=Number(map.dataset.zoom),[cx,cy]=mapWorld(lat,lon,zoom),[nextLat,nextLon]=mapLatLon(cx-dx,cy-dy,zoom);map.dataset.lat=String(nextLat);map.dataset.lon=String(nextLon);map.dataset.dragged='1';}paintBuilderMap(map);mapDrag=null;});
app.addEventListener('keydown',e=>{if(e.target.matches('[data-create] input[name^="create-"]'))(localUI.create ||= {}).beforeChoiceScroll=window.scrollY;});
app.addEventListener('input',e=>{if(e.target.matches('[data-filter]'))ui.applyFilters(app);currentModule?.input?.(e.target,currentContext);});
app.addEventListener('keydown',e=>{if(e.target.matches('.builder-map')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click();}});
window.addEventListener('hashchange',navigate);
window.addEventListener('resize',()=>{const sidebar=app.querySelector('.sidebar');if(sidebar)sidebar.inert=matchMedia('(max-width:900px)').matches&&!drawer;});
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&drawer&&!document.getElementById('workspace-dialog').open){drawer=false;render().then(()=>app.querySelector('.mobile-menu')?.focus());}});
window.addEventListener('storage',e=>{if(e.key==='deepsprout-ecosystem-demo-v1')render();});
let offerSignature='';setInterval(()=>{const signature=read().offers.map(o=>o.id+o.status).join('|');if(signature!==offerSignature){offerSignature=signature;if(['waitlist','bookings'].includes(currentContext?.route.page)||currentContext?.route.query.get('tab')==='waitlist')render();}},10000);
render();
