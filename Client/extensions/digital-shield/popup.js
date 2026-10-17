const send=command=>chrome.runtime.sendMessage({protocol:1,id:crypto.randomUUID(),command});
send('popup').then(r=>{
 document.getElementById('status').textContent=r.ok?`Installed · v${r.info.version} · ${r.personId?'Connected to '+r.personId:'Not connected'}`:r.error;
 document.getElementById('capability-status').textContent=r.error|| (r.protection?`Protection ${r.protection.status} · ${r.protection.domains.join(', ')} · expiry ${new Date(r.protection.expiresAt).toLocaleTimeString()}`:'No active protection session.');
 document.getElementById('popup-observation').textContent=r.reminder?.enabled?`Shared reminder enabled · ${r.reminder.thresholdSeconds} seconds · ${r.period?.observedSeconds>0?r.period.observedSeconds.toFixed(1)+' eligible seconds observed · '+r.period.reminderState:'No browser usage data available.'}`:'Usage observation disabled / not configured.';
 document.getElementById('popup-sync').textContent=r.syncPending?'Sync Pending · local records retained until DeepSprout acknowledges them.':'Last returned records acknowledged, or no account paired.';
});
document.getElementById('code').onclick=async()=>{const r=await send('code');document.getElementById('pairing').value=r.code||'';document.getElementById('message').textContent=r.ok?'Code expires in five minutes and can be used once.':r.error;};
