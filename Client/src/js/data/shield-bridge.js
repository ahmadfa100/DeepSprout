/* Public-page status is always a fresh extension response, never a stored connected boolean. */
(() => {
  if(window.DeepSproutShield || window.DeepSproutPersonal?.denied())return;
  const access=window.DeepSproutPersonal,personId=access.subject();
  const pending=new Map();
  let account,info=null,snapshot=null,connected=false,installed=false,busy=false,pendingConnection=null,activeConnection=null,invalidated=false;
  let state=/Chrome|Chromium|Edg\//.test(navigator.userAgent)?'Not Installed':'Unsupported Browser',error='';
  const emit=()=>window.dispatchEvent(new CustomEvent('deepsprout:shield',{detail:view()}));
  const view=()=>({state,error,installed,connected,info,snapshot:connected?snapshot:null,personId});
  window.addEventListener('message',e=>{
    if(e.source!==window||e.origin!==location.origin||e.data?.channel!=='deepsprout-shield-response'||e.data.protocol!==1)return;
    const item=pending.get(e.data.id);if(!item)return;pending.delete(e.data.id);clearTimeout(item.timer);e.data.ok?item.resolve(e.data):item.reject(new Error(e.data.error||'Invalid extension response.'));
  });
  function request(command,extra={}) {
    access.assert(personId);
    return new Promise((resolve,reject)=>{
      const id=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Extension did not respond. Reload the extension and this page.'));},2500);
      pending.set(id,{resolve,reject,timer});
      window.postMessage({channel:'deepsprout-shield-request',protocol:1,id,command,personId,...extra},location.origin);
    });
  }
  async function accept(r,connection) {
    access.assert(personId);
    const token=connection?.token||account.shield().connection?.token;
    activeConnection=connection||account.shield().connection;
    // Durable journal first; acknowledgement only after the write succeeds.
    try {account.syncShield(r.snapshot,connection);}
    catch(e){state='Sync Pending';connected=true;snapshot=r.snapshot;error=e.message;emit();throw e;}
    try{await request('ack',{token,sequence:r.snapshot.sequence});}
    catch(e){state='Sync Pending';connected=true;snapshot=r.snapshot;error='Journal saved; extension acknowledgement pending. '+e.message;emit();throw e;}
    pendingConnection=null;snapshot=r.snapshot;connected=true;installed=true;info=r.info;error='';
    state=snapshot.error?'Rule or Permission Failure':snapshot.protection?.status==='Active'?'Protection Active':snapshot.reminder?.enabled?'Reminder Active':snapshot.protection?.status==='Expired'?'Protection Expired':'Connected';
    emit();return view();
  }
  async function refresh() {
    if(busy)return view();busy=true;
    try {
      if(access.subject()!==personId||access.denied()){invalidate();return view();}
      account ||= await window.DeepSproutAccount.load();access.assert(personId);
      const r=await request('hello');installed=true;info=r.info;
      const connection=pendingConnection||account.shield().connection;
      if(!connection){connected=false;state='Installed but Not Connected';error='';emit();return view();}
      return await accept(await request('status',{token:connection.token}),pendingConnection);
    }catch(e){if(state!=='Sync Pending'){connected=false;snapshot=null;state=installed?'Disconnected':state==='Unsupported Browser'?state:'Not Installed';error=e.message;emit();}return view();}
    finally{busy=false;}
  }
  async function pair(code) {
    account ||= await window.DeepSproutAccount.load();
    if(personId==='preview'||!access.person()?.individual)throw new Error('Sign in to an active Individual account before pairing.');
    const r=await request('pair',{code:code.trim()});
    pendingConnection={token:r.token,installationId:r.snapshot.installationId};
    return accept(r,pendingConnection);
  }
  async function command(command,payload={}) {
    account ||= await window.DeepSproutAccount.load();
    const connection=account.shield().connection;if(!connection)throw new Error('Connect the extension first.');
    let r;
    try{r=await request(command,{...payload,token:connection.token});}
    catch(e){if(/did not respond|disconnected|Not connected/i.test(e.message)){connected=false;snapshot=null;state='Disconnected';error=e.message;emit();}else await refresh();throw e;}
    if(command==='disconnect'){
      connected=false;snapshot=null;state='Installed but Not Connected';error='';
      try{account.disconnectShield();}catch(e){state='Sync Pending';error='Extension disconnected; local journal update pending. '+e.message;emit();throw e;}
      emit();return view();
    }
    return accept(r);
  }
  window.DeepSproutShield={refresh,pair,command,view};
  function invalidate(){
    if(invalidated)return;
    if(access.subject()===personId&&!access.denied())return;
    invalidated=true;
    const connection=pendingConnection||activeConnection;
    if(connection)window.postMessage({channel:'deepsprout-shield-request',protocol:1,id:crypto.randomUUID(),command:'disconnect',personId,token:connection.token},location.origin);
    connected=false;snapshot=null;state='Disconnected';error='Identity changed. Reload and pair explicitly with the current Individual.';emit();
  }
  window.addEventListener('deepsprout:repo',invalidate);
  window.addEventListener('storage',e=>{if(e.key==='deepsprout-ecosystem-demo-v1')invalidate();});
  setInterval(()=>{if(access.subject()!==personId||access.denied())invalidate();},1000);
  refresh();
  setInterval(()=>{if(!document.hidden)refresh();},10000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
