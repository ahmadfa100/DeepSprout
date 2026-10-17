(() => {
 const access=window.DeepSproutPersonal;if(access.denied()){try{access.requireAccess();}catch{}return;}
 const personId=access.subject(),bridge=window.DeepSproutShield,$=id=>document.getElementById(id);
 const sites=['instagram.com','youtube.com','tiktok.com'];
 for(const group of ['protection','reminder'])for(const site of sites){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.name=group+'-site';input.value=site;input.checked=site!=='tiktok.com';label.append(input,document.createTextNode(site));$(group+'-sites').append(label);}
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
 function render(){const v=bridge.view(),s=v.snapshot;
  $('connection-state').textContent=v.state;
  $('connection-detail').textContent=v.info?`Extension ${v.info.version} · ${v.info.scope} · Person ${v.personId}. Local demonstration; no cross-device authentication.`:'Use Chrome 120+ and the Installation Guide. Availability requires an actual extension reply.';
  $('bridge-message').textContent=v.error||'';
  $('disconnect-extension').disabled=!v.connected;
  for(const id of ['start-protection','save-reminder'])$(id).disabled=!v.connected||v.state==='Sync Pending';
  $('stop-protection').disabled=!v.connected||s?.protection?.status!=='Active';
  $('protection-state').textContent=s?.protection?`${s.protection.status} · ${(s.protection.domains||[]).join(', ')} · ${s.error||(s.protection.status==='Active'?'Whole-domain navigation rules verified by the extension.':'No active session.')}`:v.connected?'Configured locally · selected sites and duration are applied only after Start Protection. No active session.':'Connect to verify protection state. Previous page timers are not enforcement evidence.';
  if(s?.protection&&protectionPopulated!==s.protection.id){protectionPopulated=s.protection.id;document.querySelectorAll('input[name=protection-site]').forEach(i=>{i.checked=s.protection.domains.includes(i.value);});if(s.protection.durationSeconds>=60)$('protection-duration').value=s.protection.durationSeconds/60;}
  const seconds=s?.protection?.status==='Active'?Math.max(0,Math.ceil((s.protection.expiresAt-Date.now())/1000)):null;
  $('protection-countdown').textContent=seconds===null?'':seconds?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} remaining`:'Expiry reached · awaiting extension confirmation';
  const r=s?.reminder,period=s?.periods?.find(p=>p.key===s.currentPeriodKey);
  $('reminder-state').textContent=r?.enabled?`Reminder Active · ${thresholdLabel(r.thresholdSeconds)} shared across ${r.domains.join(', ')}`:v.connected?r?'Configured · observation disabled.':'Not configured / observation disabled.':'Connect to verify reminder state.';
  $('reminder-usage').textContent=period?.observedSeconds>0?`${(Object.values(period.seconds).reduce((a,b)=>a+b,0)/60).toFixed(2)} eligible minutes · ${period.day} · ${period.timezone} · ${period.reminderState}`:'No browser usage data available.';
  $('reminder-coverage').textContent=period?`Partial coverage: ${period.observedSeconds.toFixed(1)} seconds with eligible context. ${period.gaps} excluded or uncertain intervals. Last observation ${period.lastObservation?new Date(period.lastObservation).toLocaleString():'none'}. Last verified reply ${new Date(s.observedAt).toLocaleTimeString()}. Missing intervals remain unknown.`:'';
  if(r&&populated!==r.revision){populated=r.revision;if(r.thresholdSeconds>=60)$('reminder-threshold').value=r.thresholdSeconds/60;$('reminder-enabled').checked=r.enabled;document.querySelectorAll('input[name=reminder-site]').forEach(i=>{i.checked=r.domains.includes(i.value);});}
  $('shield-history').replaceChildren(...(s?.history||[]).slice(-20).reverse().map(h=>{const li=document.createElement('li');li.textContent=`${new Date(h.at).toLocaleString()} · ${h.type} · ${h.personId} · ${h.detail||''}`;return li;}));
 }
 window.addEventListener('deepsprout:shield',render);render();setInterval(render,1000);
})();
