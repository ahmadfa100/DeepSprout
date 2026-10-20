(() => {
 const access=window.DeepSproutPersonal;if(access.denied()){try{access.requireAccess();}catch{}return;}
 const personId=access.subject(),bridge=window.DeepSproutShield,$=id=>document.getElementById(id);
 const sites=['instagram.com','youtube.com','tiktok.com'];
 const SITE={'instagram.com':{name:'Instagram',mark:'IG'},'youtube.com':{name:'YouTube',mark:'YT'},'tiktok.com':{name:'TikTok',mark:'TT'}};
 for(const group of ['protection','reminder'])for(const site of sites){const label=document.createElement('label'),input=document.createElement('input'),mark=document.createElement('span'),text=document.createElement('span');label.className='sh-site';label.dataset.site=site;input.type='checkbox';input.name=group+'-site';input.value=site;input.checked=site!=='tiktok.com';mark.className='sh-site-mark';mark.setAttribute('aria-hidden','true');mark.textContent=SITE[site].mark;text.className='sh-site-name';text.innerHTML=`<strong>${SITE[site].name}</strong><small>${site}</small>`;label.append(input,mark,text);$(group+'-sites').append(label);}
 // Quick presets only fill the number field; nothing is applied until the person submits.
 document.querySelectorAll('[data-duration]').forEach(b=>b.addEventListener('click',()=>{$('protection-duration').value=b.dataset.duration;summary();}));
 document.querySelectorAll('[data-threshold]').forEach(b=>b.addEventListener('click',()=>{$('reminder-threshold').value=b.dataset.threshold;presets();}));
 const list=items=>items.length<2?items.join(''):`${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;
 function presets(){for(const [attr,id] of [['duration','protection-duration'],['threshold','reminder-threshold']])document.querySelectorAll(`[data-${attr}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[attr]===String($(id).value))));}
 function summary(){const chosen=[...document.querySelectorAll('input[name=protection-site]:checked')].map(i=>SITE[i.value].name),m=Number($('protection-duration').value);$('protection-summary').textContent=chosen.length?`Blocks all of ${list(chosen)} for ${m||'—'} ${m===1?'minute':'minutes'} in this browser.`:'Choose at least one website.';presets();}
 document.addEventListener('change',e=>{if(e.target.closest('#protection-form'))summary();if(e.target.closest('#reminder-form'))presets();});
 document.addEventListener('input',e=>{if(e.target.id==='protection-duration')summary();if(e.target.id==='reminder-threshold')presets();});
 const selected=group=>[...document.querySelectorAll(`input[name=${group}-site]:checked`)].map(i=>i.value);
 const savedTime=access.preference('deepsprout-shield-time',null,personId);if(savedTime)$('shield-time').value=savedTime;
 $('shield-reminder').checked=!!access.preference('deepsprout-shield-reminder',false,personId);
 $('shield-form').onsubmit=async e=>{e.preventDefault();try{const a=await window.DeepSproutAccount.load();a.mutate({type:'preferences.save',preferences:{'deepsprout-shield-time':$('shield-time').value,'deepsprout-shield-reminder':$('shield-reminder').checked}});$('save-message').textContent='Preferences saved in this browser.';}catch{$('save-message').textContent='This browser could not save your preferences.';}};
 async function run(id,fn){$(id).textContent='Checking extension…';try{await fn();$(id).textContent='';}catch(e){$(id).textContent=e.message;}render();}
 $('connect-form').onsubmit=e=>{e.preventDefault();run('bridge-message',()=>bridge.pair($('pairing-code').value));};
 $('refresh-status').onclick=()=>bridge.refresh();
 $('disconnect-extension').onclick=()=>run('bridge-message',()=>bridge.command('disconnect'));
 $('protection-form').onsubmit=e=>{e.preventDefault();run('protection-message',()=>bridge.command('protect',{domains:selected('protection'),durationSeconds:Number($('protection-duration').value)*60}));};
 $('stop-protection').onclick=()=>{if(confirm('Stop this browser protection session early? This explicitly removes its blocking rules.'))run('protection-message',()=>bridge.command('stop',{reason:'User explicitly stopped protection early'}));};
 $('reminder-form').onsubmit=e=>{e.preventDefault();run('reminder-message',()=>bridge.command('reminder',{domains:selected('reminder'),thresholdSeconds:Number($('reminder-threshold').value)*60,enabled:$('reminder-enabled').checked}));};
 let populated=null;
 const thresholdLabel=seconds=>seconds<60?`${seconds} sec (short demo interval)`:`${seconds/60} min`;
 let protectionPopulated=null;
 const TONE={'Not Installed':'idle','Unsupported Browser':'error','Installed but Not Connected':'pending','Disconnected':'pending','Sync Pending':'pending','Connected':'ok','Reminder Active':'ok','Protection Expired':'ok','Protection Active':'live','Rule or Permission Failure':'error'};
 const STEP={'Not Installed':'install','Unsupported Browser':'install','Installed but Not Connected':'pair','Disconnected':'pair'};
 const DETAIL={'Not Installed':'Add the DeepSprout Shield extension to Chrome to start.','Unsupported Browser':'Digital Shield works in Chrome 120 or newer on a computer.','Installed but Not Connected':'The extension is installed. Paste a pairing code from its popup to connect.','Disconnected':'The extension stopped answering. Reload it, then refresh or pair again.','Sync Pending':'The extension replied, but your journal has not saved it yet. Refresh to retry.','Rule or Permission Failure':'Chrome refused the blocking rules. Check the extension’s site access, then try again.'};
 let lastState='';
 function render(){const v=bridge.view(),s=v.snapshot;
  $('connection-state').textContent=v.state;
  const box=$('shield-status');box.dataset.state=TONE[v.state]||'idle';box.dataset.step=v.connected?'use':(STEP[v.state]||'install');
  if(lastState!==v.state){lastState=v.state;box.classList.remove('is-changed');void box.offsetWidth;box.classList.add('is-changed');}
  $('connection-detail').textContent=v.info?`Extension ${v.info.version} · ${v.info.scope}`:DETAIL[v.state]||'Use Chrome 120+ and the installation guide. Status comes from an actual extension reply.';
  $('shield-setup').hidden=v.connected;$('disconnect-extension').hidden=!v.connected;
  $('bridge-message').textContent=v.error||'';$('bridge-message').classList.toggle('is-quiet',v.state==='Not Installed');
  $('disconnect-extension').disabled=!v.connected;
  for(const id of ['start-protection','save-reminder'])$(id).disabled=!v.connected||v.state==='Sync Pending';
  $('stop-protection').disabled=!v.connected||s?.protection?.status!=='Active';$('stop-protection').hidden=$('stop-protection').disabled;
  $('protection-state').textContent=s?.protection?`${s.protection.status} · ${(s.protection.domains||[]).join(', ')} · ${s.error||(s.protection.status==='Active'?'Whole-domain navigation rules verified by the extension.':'No active session.')}`:v.connected?'No active session. Nothing is blocked until you start.':'Connect the extension to start protection.';
  if(s?.protection&&protectionPopulated!==s.protection.id){protectionPopulated=s.protection.id;document.querySelectorAll('input[name=protection-site]').forEach(i=>{i.checked=s.protection.domains.includes(i.value);});if(s.protection.durationSeconds>=60)$('protection-duration').value=s.protection.durationSeconds/60;}
  const seconds=s?.protection?.status==='Active'?Math.max(0,Math.ceil((s.protection.expiresAt-Date.now())/1000)):null;
  $('protection-countdown').textContent=seconds===null?'':seconds?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} remaining`:'Expiry reached · awaiting extension confirmation';
  // The live panel appears only after the extension itself reports an Active session.
  const active=s?.protection?.status==='Active';$('protection-live').hidden=!active;$('protection-card').classList.toggle('is-live',active);$('protection-form').hidden=active;
  if(active){const total=Math.max(1,(s.protection.expiresAt-s.protection.startedAt)/1000);$('protection-ring').style.setProperty('--progress',String(Math.min(1,seconds/total)));$('protection-live-sites').textContent=`${list((s.protection.domains||[]).map(d=>SITE[d]?.name||d))} blocked until ${new Date(s.protection.expiresAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;}
  const r=s?.reminder,period=s?.periods?.find(p=>p.key===s.currentPeriodKey);
  $('reminder-state').textContent=r?.enabled?`Reminder Active · ${thresholdLabel(r.thresholdSeconds)} shared across ${r.domains.join(', ')}`:v.connected?r?'Configured · observation disabled.':'Not configured / observation disabled.':'Connect to verify reminder state.';
  $('reminder-usage').textContent=period?.observedSeconds>0?`${(Object.values(period.seconds).reduce((a,b)=>a+b,0)/60).toFixed(2)} eligible minutes · ${period.day} · ${period.timezone} · ${period.reminderState}`:'No browser usage data available.';
  const used=period?.observedSeconds>0?Object.values(period.seconds).reduce((a,b)=>a+b,0):0;$('reminder-meter').style.setProperty('--value',String(r?.thresholdSeconds?Math.min(1,used/r.thresholdSeconds):0));$('reminder-card').classList.toggle('has-usage',used>0);
  $('reminder-coverage').textContent=period?`Partial coverage: ${period.observedSeconds.toFixed(1)} seconds with eligible context. ${period.gaps} excluded or uncertain intervals. Last observation ${period.lastObservation?new Date(period.lastObservation).toLocaleString():'none'}. Last verified reply ${new Date(s.observedAt).toLocaleTimeString()}. Missing intervals remain unknown.`:'';
  if(r&&populated!==r.revision){populated=r.revision;if(r.thresholdSeconds>=60)$('reminder-threshold').value=r.thresholdSeconds/60;$('reminder-enabled').checked=r.enabled;document.querySelectorAll('input[name=reminder-site]').forEach(i=>{i.checked=r.domains.includes(i.value);});}
  summary();
  $('shield-history').replaceChildren(...(s?.history||[]).slice(-20).reverse().map(h=>{const li=document.createElement('li');li.textContent=`${new Date(h.at).toLocaleString()} · ${h.type} · ${h.personId} · ${h.detail||''}`;return li;}));
 }
 window.addEventListener('deepsprout:shield',render);render();summary();setInterval(render,1000);
})();
