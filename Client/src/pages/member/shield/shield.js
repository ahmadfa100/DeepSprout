(() => {
 const access=window.DeepSproutPersonal;if(access.denied()){try{access.requireAccess();}catch{}return;}
 const personId=access.subject(),bridge=window.DeepSproutShield,$=id=>document.getElementById(id);
 const still=matchMedia('(prefers-reduced-motion: reduce)');
 // Must match SITES in extensions/digital-shield/policy.js.
 const SITE={'instagram.com':'Instagram','youtube.com':'YouTube','tiktok.com':'TikTok','facebook.com':'Facebook','x.com':'X','reddit.com':'Reddit','snapchat.com':'Snapchat','netflix.com':'Netflix','twitch.tv':'Twitch','pinterest.com':'Pinterest'};
 const sites=Object.keys(SITE),DEFAULT=['instagram.com','youtube.com'];
 const iconOf=site=>`../../../../assets/shield/apps/${site.split('.')[0]}.svg`;
 const GROUPS={protection:{max:120,input:'protection-duration',unit:'minutes'},reminder:{max:240,input:'reminder-threshold',unit:'min a day'}};
 const inputs=group=>[...document.querySelectorAll(`input[name=${group}-site]`)];
 const selected=group=>inputs(group).filter(i=>i.checked).map(i=>i.value);
 const icon=(site,cls='')=>{const img=document.createElement('img');img.src=iconOf(site);img.alt='';img.draggable=false;if(cls)img.className=cls;return img;};

 /* ── App picker ───────────────────────────────────────────── */
 for(const group of Object.keys(GROUPS))for(const site of sites){
  const label=document.createElement('label'),input=document.createElement('input'),mark=document.createElement('span'),name=document.createElement('span'),check=document.createElement('span');
  label.className='sh-site';label.dataset.site=site;
  input.type='checkbox';input.name=group+'-site';input.value=site;input.checked=DEFAULT.includes(site);input.setAttribute('aria-label',SITE[site]);
  mark.className='sh-site-mark';mark.setAttribute('aria-hidden','true');mark.append(icon(site));
  name.className='sh-site-name';name.setAttribute('aria-hidden','true');name.textContent=SITE[site];
  check.className='sh-site-check';check.setAttribute('aria-hidden','true');check.innerHTML='<svg viewBox="0 0 24 24"><use href="#sh-check"/></svg>';
  label.append(input,mark,name,check);$(group+'-picker').append(label);
 }
 const setSite=(group,site,on)=>{const input=inputs(group).find(i=>i.value===site);if(input&&input.checked!==on){input.checked=on;input.dispatchEvent(new Event('change',{bubbles:true}));}};

 // A small copy of the icon flies into the basket so the link between the two is obvious.
 function fly(fromEl,group){
  if(still.matches)return;
  const tray=$(group+'-tray'),from=fromEl.getBoundingClientRect(),to=tray.querySelector('.sh-tray-items').getBoundingClientRect();
  const ghost=icon(fromEl.closest('[data-site]').dataset.site,'sh-fly');document.body.append(ghost);
  Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});
  const dx=to.left+Math.min(to.width-40,selected(group).length*52)-from.left,dy=to.top+to.height/2-from.top-from.height/2;
  ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx*.55}px,${dy*.55-40}px) scale(.9)`,opacity:1,offset:.55},{transform:`translate(${dx}px,${dy}px) scale(.7)`,opacity:.2}],{duration:520,easing:'cubic-bezier(.3,.7,.3,1)'}).finished.then(()=>ghost.remove(),()=>ghost.remove());
 }
 document.addEventListener('change',e=>{const input=e.target;if(!input.matches?.('.sh-site input')||!input.checked||input.dataset.quiet)return;fly(input.parentElement.querySelector('.sh-site-mark'),input.name.replace('-site',''));});

 /* ── Drag into the basket (mouse, pen and touch) ──────────── */
 let drag=null;
 const overTray=(group,x,y)=>{const r=$(group+'-tray').getBoundingClientRect();return x>=r.left-12&&x<=r.right+12&&y>=r.top-12&&y<=r.bottom+12;};
 function beginDrag(state,e){
  state.active=true;const mark=state.label.querySelector('.sh-site-mark'),r=mark.getBoundingClientRect();
  state.dx=e.clientX-r.left;state.dy=e.clientY-r.top;
  state.ghost=icon(state.site,'sh-drag-ghost');state.ghost.style.width=state.ghost.style.height=r.width+'px';document.body.append(state.ghost);
  state.label.classList.add('is-lifted');document.body.classList.add('sh-dragging');$(state.group+'-tray').classList.add('is-ready');
  try{state.label.setPointerCapture(e.pointerId);}catch{}
  moveDrag(e);
 }
 function moveDrag(e){
  const d=drag;if(!d?.active)return;
  d.ghost.style.transform=`translate(${e.clientX-d.dx}px,${e.clientY-d.dy}px) rotate(-4deg) scale(1.08)`;
  $(d.group+'-tray').classList.toggle('is-over',overTray(d.group,e.clientX,e.clientY));
 }
 function endDrag(e,cancelled){
  const d=drag;drag=null;if(!d)return;clearTimeout(d.hold);
  if(!d.active)return;
  const tray=$(d.group+'-tray'),hit=!cancelled&&overTray(d.group,e.clientX,e.clientY);
  tray.classList.remove('is-over','is-ready');d.label.classList.remove('is-lifted');document.body.classList.remove('sh-dragging');
  const ghost=d.ghost,home=d.label.querySelector('.sh-site-mark').getBoundingClientRect();
  if(hit){
   const input=inputs(d.group).find(i=>i.value===d.site);
   if(input&&!input.checked){input.dataset.quiet='1';setSite(d.group,d.site,true);delete input.dataset.quiet;}
   tray.classList.remove('is-caught');void tray.offsetWidth;tray.classList.add('is-caught');ghost.remove();
  }else if(still.matches)ghost.remove();
  else ghost.animate([{transform:ghost.style.transform},{transform:`translate(${home.left}px,${home.top}px) scale(1)`}],{duration:260,easing:'ease-out'}).finished.then(()=>ghost.remove(),()=>ghost.remove());
  // The click that follows a real drag must not toggle the checkbox.
  const swallow=ev=>{ev.preventDefault();ev.stopPropagation();};
  d.label.addEventListener('click',swallow,{capture:true,once:true});
  setTimeout(()=>d.label.removeEventListener('click',swallow,{capture:true}),350);
 }
 document.addEventListener('pointerdown',e=>{
  const label=e.target.closest?.('.sh-site');if(!label||e.button>0||drag)return;
  const group=label.querySelector('input').name.replace('-site','');
  drag={label,group,site:label.dataset.site,x:e.clientX,y:e.clientY,active:false,touch:e.pointerType==='touch',armed:e.pointerType!=='touch'};
  // Touch: a short press lifts the icon, so a normal swipe still scrolls the page.
  if(drag.touch){const d=drag;d.hold=setTimeout(()=>{if(drag===d){d.armed=true;beginDrag(d,e);navigator.vibrate?.(8);}},230);}
 });
 document.addEventListener('pointermove',e=>{
  const d=drag;if(!d)return;
  if(!d.active){const moved=Math.hypot(e.clientX-d.x,e.clientY-d.y);if(d.touch&&!d.armed&&moved>8){clearTimeout(d.hold);drag=null;return;}if(d.armed&&moved>6)beginDrag(d,e);return;}
  moveDrag(e);
 });
 document.addEventListener('pointerup',e=>endDrag(e,false));
 document.addEventListener('pointercancel',e=>endDrag(e,true));
 document.addEventListener('touchmove',e=>{if(drag?.active)e.preventDefault();},{passive:false});
 document.addEventListener('dragstart',e=>{if(e.target.closest?.('.sh-site'))e.preventDefault();});

 /* ── Basket contents ──────────────────────────────────────── */
 const trayState={};
 function renderTray(group){
  const chosen=selected(group),key=chosen.join('|');if(trayState[group]===key)return;
  const before=trayState[group]?.split('|')||[];trayState[group]=key;
  $(group+'-count').textContent=chosen.length?`${chosen.length} ${chosen.length===1?'app':'apps'}`:'';
  $(group+'-tray').classList.toggle('is-empty',!chosen.length);
  const items=$(group+'-tray-items');items.replaceChildren();
  if(!chosen.length){const empty=document.createElement('span');empty.className='sh-tray-empty';empty.textContent='Drag apps here, or tap them above';items.append(empty);return;}
  for(const site of chosen){
   const button=document.createElement('button');button.type='button';button.className='sh-tray-site';if(trayState[group]&&before.length&&!before.includes(site))button.classList.add('is-new');
   button.setAttribute('aria-label',`Remove ${SITE[site]} from the ${group==='protection'?'focus':'reminder'} basket`);button.title=`Remove ${SITE[site]}`;
   button.append(icon(site));button.addEventListener('click',()=>setSite(group,site,false));items.append(button);
  }
 }

 /* ── Time dials ───────────────────────────────────────────── */
 const shown={};
 const endsAt=minutes=>new Date(Date.now()+minutes*60000).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
 function dial(group){
  const g=GROUPS[group],raw=Number($(g.input).value),value=Number.isFinite(raw)?Math.min(g.max,Math.max(0,raw)):0,share=value/g.max;
  $(group+'-dial-fill').style.strokeDashoffset=String(100-share*100);
  $(group+'-dial-knob').style.transform=`rotate(${share*360}deg)`;
  $(group+'-dial-note').textContent=group==='protection'?(value?`Ends at ${endsAt(value)}`:'Choose a length'):(value>=60?`${Math.floor(value/60)} h ${value%60?value%60+' min':''}`.trim():'Shared across the basket');
  // The number counts to its new value instead of jumping.
  const out=$(group+'-dial-value'),from=shown[group]??value;shown[group]=value;
  if(still.matches||from===value){out.textContent=String(value);return;}
  const start=performance.now(),tick=now=>{const t=Math.min(1,(now-start)/380),e=1-(1-t)**3;out.textContent=String(Math.round(from+(value-from)*e));if(t<1&&shown[group]===value)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
 }
 function presets(){for(const [attr,id] of [['duration','protection-duration'],['threshold','reminder-threshold']])document.querySelectorAll(`[data-${attr}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attr]===String($(id).value))));}
 function summary(){
  const count=selected('protection').length,m=Number($('protection-duration').value);
  $('protection-summary').textContent=count?`${count} ${count===1?'app':'apps'} blocked for ${m||'—'} ${m===1?'minute':'minutes'}`:'Add at least one app to the basket.';
  renderTray('protection');renderTray('reminder');presets();dial('protection');dial('reminder');
 }
 document.querySelectorAll('[data-duration]').forEach(b=>b.addEventListener('click',()=>{$('protection-duration').value=b.dataset.duration;summary();}));
 document.querySelectorAll('[data-threshold]').forEach(b=>b.addEventListener('click',()=>{$('reminder-threshold').value=b.dataset.threshold;summary();}));
 document.querySelectorAll('[data-nudge]').forEach(b=>b.addEventListener('click',()=>{const input=$(b.dataset.for),step=Number(b.dataset.nudge),now=Number(input.value)||0;const next=step>0?Math.floor(now/5)*5+5:Math.ceil(now/5)*5-5;input.value=String(Math.min(Number(input.max),Math.max(Number(input.min),next)));summary();}));

 // Quick presets only fill the number field; nothing is applied until the person submits.
 const syncButtons=()=>{const v=bridge.view();$('start-protection').disabled=!v.connected||v.state==='Sync Pending'||!selected('protection').length;$('save-reminder').disabled=!v.connected||v.state==='Sync Pending'||!selected('reminder').length;};
 document.addEventListener('change',e=>{if(e.target.closest('#protection-form')||e.target.closest('#reminder-form')){summary();syncButtons();}});
 document.addEventListener('input',e=>{if(e.target.id==='protection-duration'||e.target.id==='reminder-threshold')summary();});

 /* ── Earlier preference (saved only) ──────────────────────── */
 const savedTime=access.preference('deepsprout-shield-time',null,personId);if(savedTime)$('shield-time').value=savedTime;
 $('shield-reminder').checked=!!access.preference('deepsprout-shield-reminder',false,personId);
 $('shield-form').onsubmit=async e=>{e.preventDefault();try{const a=await window.DeepSproutAccount.load();a.mutate({type:'preferences.save',preferences:{'deepsprout-shield-time':$('shield-time').value,'deepsprout-shield-reminder':$('shield-reminder').checked}});$('save-message').textContent='Preferences saved in this browser.';}catch{$('save-message').textContent='This browser could not save your preferences.';}};

 /* ── Extension commands ───────────────────────────────────── */
 async function run(id,fn){$(id).textContent='Checking extension…';try{await fn();$(id).textContent='';}catch(e){$(id).textContent=e.message;}render();}
 $('connect-form').onsubmit=e=>{e.preventDefault();run('bridge-message',()=>bridge.pair($('pairing-code').value));};
 $('refresh-status').onclick=()=>bridge.refresh();
 $('disconnect-extension').onclick=()=>run('bridge-message',()=>bridge.command('disconnect'));
 $('protection-form').onsubmit=e=>{e.preventDefault();run('protection-message',()=>bridge.command('protect',{domains:selected('protection'),durationSeconds:Number($('protection-duration').value)*60}));};
 $('stop-protection').onclick=()=>{if(confirm('Stop this browser protection session early? This explicitly removes its blocking rules.'))run('protection-message',()=>bridge.command('stop',{reason:'User explicitly stopped protection early'}));};
 $('reminder-form').onsubmit=e=>{e.preventDefault();run('reminder-message',()=>bridge.command('reminder',{domains:selected('reminder'),thresholdSeconds:Number($('reminder-threshold').value)*60,enabled:$('reminder-enabled').checked}));};

 /* ── Render from the extension's verified state ───────────── */
 let populated=null,protectionPopulated=null,lastLiveDomains='',lastState='';
 const thresholdLabel=seconds=>seconds<60?`${seconds} sec (short demo interval)`:`${seconds/60} min`;
 const names=domains=>domains.map(d=>SITE[d]||d).join(', ');
 const TONE={'Not Installed':'idle','Unsupported Browser':'error','Installed but Not Connected':'pending','Disconnected':'pending','Sync Pending':'pending','Connected':'ok','Reminder Active':'ok','Protection Expired':'ok','Protection Active':'live','Rule or Permission Failure':'error'};
 const STEP={'Not Installed':'install','Unsupported Browser':'install','Installed but Not Connected':'pair','Disconnected':'pair'};
 const DETAIL={'Not Installed':'Add the DeepSprout Shield extension to Chrome to start.','Unsupported Browser':'Digital Shield works in Chrome 120 or newer on a computer.','Installed but Not Connected':'The extension is installed. Paste a pairing code from its popup to connect.','Disconnected':'The extension stopped answering. Reload it, then refresh or pair again.','Sync Pending':'The extension replied, but your journal has not saved it yet. Refresh to retry.','Rule or Permission Failure':'Chrome refused the blocking rules. Check the extension’s site access, then try again.'};
 function render(){const v=bridge.view(),s=v.snapshot;
  $('connection-state').textContent=v.state;
  const box=$('shield-status');box.dataset.state=TONE[v.state]||'idle';box.dataset.step=v.connected?'use':(STEP[v.state]||'install');
  if(lastState!==v.state){lastState=v.state;box.classList.remove('is-changed');void box.offsetWidth;box.classList.add('is-changed');}
  $('connection-detail').textContent=v.info?`Extension ${v.info.version} · ${v.info.scope}`:DETAIL[v.state]||'Use Chrome 120+ and the installation guide. Status comes from an actual extension reply.';
  $('shield-setup').hidden=v.connected;$('disconnect-extension').hidden=!v.connected;
  $('bridge-message').textContent=v.error||'';$('bridge-message').classList.toggle('is-quiet',v.state==='Not Installed');
  $('disconnect-extension').disabled=!v.connected;
  syncButtons();
  $('stop-protection').disabled=!v.connected||s?.protection?.status!=='Active';$('stop-protection').hidden=$('stop-protection').disabled;
  $('protection-state').textContent=s?.protection?`${s.protection.status} · ${names(s.protection.domains||[])} · ${s.error||(s.protection.status==='Active'?'Whole-domain navigation rules verified by the extension.':'No active session.')}`:v.connected?'No active session. Nothing is blocked until you start.':'Connect the extension to start a session.';
  if(s?.protection&&protectionPopulated!==s.protection.id){protectionPopulated=s.protection.id;inputs('protection').forEach(i=>{i.checked=s.protection.domains.includes(i.value);});if(s.protection.durationSeconds>=60)$('protection-duration').value=s.protection.durationSeconds/60;}
  const seconds=s?.protection?.status==='Active'?Math.max(0,Math.ceil((s.protection.expiresAt-Date.now())/1000)):null;
  $('protection-countdown').textContent=seconds===null?'':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  $('protection-live-phase').textContent=seconds?'remaining':'Awaiting extension confirmation';
  // The live panel appears only after the extension itself reports an Active session.
  const active=s?.protection?.status==='Active';$('protection-live').hidden=!active;$('protection-card').classList.toggle('is-live',active);$('protection-form').hidden=active;
  if(active){
   const total=Math.max(1,(s.protection.expiresAt-s.protection.startedAt)/1000),domains=s.protection.domains||[],key=domains.join('|');
   $('protection-ring').style.strokeDashoffset=String(100-Math.min(1,seconds/total)*100);
   if(key!==lastLiveDomains){lastLiveDomains=key;$('protection-live-icons').replaceChildren(...domains.map(domain=>{const img=icon(domain);img.title=SITE[domain]||domain;return img;}));}
   $('protection-live-sites').textContent=`${domains.length} ${domains.length===1?'app':'apps'} blocked until ${new Date(s.protection.expiresAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
  }
  const r=s?.reminder,period=s?.periods?.find(p=>p.key===s.currentPeriodKey);
  $('reminder-state').textContent=r?.enabled?`Reminder Active · ${thresholdLabel(r.thresholdSeconds)} shared across ${names(r.domains)}`:v.connected?r?'Configured · observation disabled.':'Not configured / observation disabled.':'Connect to verify reminder state.';
  $('reminder-usage').textContent=period?.observedSeconds>0?`${(Object.values(period.seconds).reduce((a,b)=>a+b,0)/60).toFixed(2)} eligible minutes · ${period.day} · ${period.timezone} · ${period.reminderState}`:'No browser usage data available.';
  const used=period?.observedSeconds>0?Object.values(period.seconds).reduce((a,b)=>a+b,0):0;$('reminder-meter').style.setProperty('--value',String(r?.thresholdSeconds?Math.min(1,used/r.thresholdSeconds):0));$('reminder-card').classList.toggle('has-usage',used>0);
  $('reminder-coverage').textContent=period?`Partial coverage: ${period.observedSeconds.toFixed(1)} seconds with eligible context. ${period.gaps} excluded or uncertain intervals. Last observation ${period.lastObservation?new Date(period.lastObservation).toLocaleString():'none'}. Last verified reply ${new Date(s.observedAt).toLocaleTimeString()}. Missing intervals remain unknown.`:'';
  if(r&&populated!==r.revision){populated=r.revision;if(r.thresholdSeconds>=60)$('reminder-threshold').value=r.thresholdSeconds/60;$('reminder-enabled').checked=r.enabled;inputs('reminder').forEach(i=>{i.checked=r.domains.includes(i.value);});}
  summary();
  $('shield-history').replaceChildren(...(s?.history||[]).slice(-20).reverse().map(h=>{const li=document.createElement('li');li.textContent=`${new Date(h.at).toLocaleString()} · ${h.type} · ${h.personId} · ${h.detail||''}`;return li;}));
 }
 window.addEventListener('deepsprout:shield',render);render();summary();setInterval(render,1000);
})();
