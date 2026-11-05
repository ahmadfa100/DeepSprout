import {VERSION, POLICY, appURL, isPerson, envelope,siteOf} from './policy.js';
import {protectionInput,rulesFor,expiryReason} from './protection.js';
import {reminderInput,localPeriod,newPeriod,eligibleSeconds,contextEligible} from './observation.js';
let expiryTimer=null,mono=null;
let lastSample=null;
const random = () => [...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');
let queue = Promise.resolve();
const serial = fn => { const next = queue.then(fn); queue = next.catch(()=>{}); return next; };
async function read() {
  const {shield} = await chrome.storage.local.get('shield');
  return shield || {version:1,installationId:random(),sequence:0,owners:{},binding:null,pairing:null,error:null};
}
const save = s => chrome.storage.local.set({shield:s});
const publicInfo = () => ({version:VERSION,policy:POLICY,capabilities:['manual-domain-protection','shared-active-site-reminder'],browser:'Chrome MV3',scope:'Whole selected domains in this browser profile only'});
function history(s,personId,type,detail) {
  const owner=s.owners[personId];if(!owner)return;
  owner.history.push({id:random(),personId,type,detail,at:Date.now()});owner.history=owner.history.slice(-120);s.sequence++;
}
async function installRules(session) {
  if(session?.status==='Active'&&!await chrome.permissions.contains({origins:session.domains.map(d=>`*://*.${d}/*`)}))throw new Error('Selected-site access was denied. Restore extension site access in Chrome.');
  const desired=rulesFor(session),actual=await chrome.declarativeNetRequest.getDynamicRules();
  if(JSON.stringify(actual.slice().sort((a,b)=>a.id-b.id))!==JSON.stringify(desired))await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:actual.map(r=>r.id),addRules:desired});
  const confirmed=await chrome.declarativeNetRequest.getDynamicRules();
  if(confirmed.length!==desired.length||desired.some(r=>!confirmed.some(c=>c.id===r.id&&c.action.type==='block'&&c.condition.requestDomains?.[0]===r.condition.requestDomains[0])))throw new Error('Chrome did not confirm the expected protection rules.');
}
async function release(s,reason,status='Expired') {
  await installRules(null);
  if(s.protection?.status==='Active'){s.protection.status=status;s.protection.endedAt=Date.now();history(s,s.protection.personId,status,reason);}
  mono=null;clearTimeout(expiryTimer);await chrome.alarms.clear('shield-expiry');
}
async function reconcile(s) {
  const p=s.protection,now=Date.now();
  try {
    const expired=expiryReason(p,now,!!(mono&&mono.id===p?.id&&performance.now()>=mono.end));
    if(expired)await release(s,expired);
    else {
      await installRules(p);
      if(p?.status==='Active'){
        p.lastWall=now;
        if(!mono||mono.id!==p.id)mono={id:p.id,end:performance.now()+Math.max(0,p.expiresAt-now)};
        await chrome.alarms.create('shield-expiry',{when:p.expiresAt});
        clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>serial(async()=>{const next=await read();await reconcile(next);await save(next);}),Math.max(1,Math.min(p.expiresAt-now,mono.end-performance.now())));
      }
    }
    if(p?.status!=='Failed')s.error=null;
  }catch(e){s.error='Rule or Permission Failure: '+e.message;if(p?.status==='Active'){p.status='Failed';history(s,p.personId,'Failed',s.error);}try{await installRules(null);}catch{} }
}
function authenticate(s,m,sender) {
  const b=s.binding;
  if (!b || !isPerson(m.personId) || m.personId!==b.personId || typeof m.token!=='string' || m.token!==b.token || new URL(sender.url).origin!==b.origin) throw new Error('Not connected to this Person. Pair from the extension popup.');
  return s.owners[b.personId];
}
function periodFor(owner) {
  const key=localPeriod().key;
  let p=owner.periods.find(p=>p.key===key);
  if(!p){p=newPeriod();owner.periods.push(p);owner.periods=owner.periods.slice(-62);}
  return p;
}
function gap(s,reason) {
  if(!lastSample)return;
  const owner=s.owners[lastSample.personId],p=owner?.periods.find(p=>p.key===lastSample.periodKey);
  if(p){p.gaps++;p.gapReasons[reason]=(p.gapReasons[reason]||0)+1;s.sequence++;}
  lastSample=null;
}
async function observe(s,sender) {
  if(!s.binding||!sender.tab||sender.frameId!==0)return {observed:false};
  const owner=s.owners[s.binding.personId],config=owner.reminder;
  if(!config?.enabled)return {observed:false};
  const tab=await chrome.tabs.get(sender.tab.id),domain=siteOf(tab.url),window=await chrome.windows.get(tab.windowId),idle=await chrome.idle.queryState(15);
  if(!contextEligible({active:tab.active,focused:window.focused,minimized:window.state==='minimized',idle,domain,selected:config.domains})||siteOf(sender.url)!==domain){if(lastSample?.tabId===tab.id){gap(s,idle!=='active'?'Idle / locked':'Inactive / unsupported context');await save(s);}return {observed:false};}
  const p=periodFor(owner),current={personId:owner.personId,tabId:tab.id,windowId:tab.windowId,domain,periodKey:p.key,revision:config.revision,at:Date.now(),mono:performance.now()},delta=eligibleSeconds(lastSample,current);
  if(delta.reason){p.gaps++;p.gapReasons[delta.reason]=(p.gapReasons[delta.reason]||0)+1;}
  else {p.seconds[domain]=(p.seconds[domain]||0)+delta.seconds;p.observedSeconds+=delta.seconds;p.samples++;p.firstObservation ||= current.at;p.lastObservation=current.at;}
  lastSample=current;
  if(!p.configVersions.includes(config.revision))p.configVersions.push(config.revision);
  s.sequence++;await save(s);
  const total=config.domains.reduce((sum,d)=>sum+(p.seconds[d]||0),0);
  if(total>=config.thresholdSeconds&&p.reminderState==='NotReached'){
    // Persist before opening, so a worker retry cannot repeatedly interrupt.
    p.reminderState='Shown';p.triggeredAt=Date.now();p.triggerConfig={...config};history(s,owner.personId,'Reminder shown',`${p.day}: ${total.toFixed(2)} eligible seconds`);await save(s);
    try{const tab=await chrome.tabs.create({url:chrome.runtime.getURL('reminder.html'),active:true});s.notice={personId:owner.personId,periodKey:p.key,tabId:tab.id};await save(s);}catch(e){p.reminderState='DisplayFailed';history(s,owner.personId,'Reminder display failed',e.message);await save(s);}
  }
  return {observed:delta.seconds>0};
}
function notice(s,sender) {
  const n=s.notice;
  if(!n||n.personId!==s.binding?.personId||sender.tab?.id!==n.tabId||!sender.url?.startsWith(chrome.runtime.getURL('reminder.html')))throw new Error('No current reminder belongs to this tab/account.');
  const owner=s.owners[n.personId],p=owner.periods.find(p=>p.key===n.periodKey);
  if(!p||p.key!==localPeriod().key||p.reminderState!=='Shown')throw new Error('This reminder period ended or was already acknowledged.');
  return {owner,p};
}
async function handle(m,sender) {
  if (!envelope(m) || sender.id!==chrome.runtime.id || sender.tab?.incognito || sender.frameId && sender.frameId!==0) throw new Error('Malformed or unsupported message.');
  const internal=sender.url?.startsWith(chrome.runtime.getURL('')) && !sender.tab?.incognito;
  if(m.command==='observe'){
    if(!sender.tab||!siteOf(sender.url)||sender.frameId!==0)throw new Error('Observation context denied.');
    return observe(await read(),sender);
  }
  if (!internal && !appURL(sender.url)) throw new Error('Origin denied. Use the documented local DeepSprout address.');
  const s=await read();
  await reconcile(s);await save(s);
  const currentOwner=s.binding&&s.owners[s.binding.personId];
  if(currentOwner){
    const config=currentOwner.reminder,observationError=config?.enabled&&!await chrome.permissions.contains({origins:config.domains.map(d=>`*://*.${d}/*`)})?'Observation permission denied; restore selected-site access in Chrome.':null;
    if((currentOwner.observationError||null)!==observationError){currentOwner.observationError=observationError;s.sequence++;await save(s);}
  }
  if (m.command==='hello') return {info:publicInfo()};
  if (internal && m.command==='popup') return {info:publicInfo(),personId:s.binding?.personId||null,error:s.error||currentOwner?.observationError,protection:s.protection||null,reminder:currentOwner?.reminder||null,period:currentOwner?.periods.find(p=>p.key===localPeriod().key)||null,syncPending:!!currentOwner&&currentOwner.acknowledged<s.sequence};
  if (internal && m.command==='code') {s.pairing={code:random(),expiresAt:Date.now()+300000};await save(s);return {code:s.pairing.code,expiresAt:s.pairing.expiresAt};}
  if(internal&&['notice','continue','return'].includes(m.command)){
    const {owner,p}=notice(s,sender);
    if(m.command==='notice')return {seconds:Object.values(p.seconds).reduce((a,b)=>a+b,0),domains:p.triggerConfig.domains,day:p.day,timezone:p.timezone,coverage:p.coverage};
    p.reminderState=m.command==='continue'?'Acknowledged':'Returned';p.acknowledgedAt=Date.now();history(s,owner.personId,m.command==='continue'?'Continue Anyway':'Back to DeepSprout',p.key);await save(s);
    // This branch never changes protection rules or rewards.
    if(m.command==='return')await chrome.tabs.create({url:owner.origin+'/src/pages/member/recovery-plan/recovery-plan.html',active:true});
    return {acknowledged:true};
  }
  if (m.command==='pair' && !internal) {
    if(!isPerson(m.personId)||typeof m.code!=='string'||!s.pairing||m.code!==s.pairing.code||Date.now()>s.pairing.expiresAt)throw new Error('Pairing code is invalid or expired. Create a new code in the extension popup.');
    if(!s.owners[m.personId]&&Object.keys(s.owners).length>=20)throw new Error('This demonstration profile already has 20 owners. Use a separate profile rather than deleting another Person’s data.');
    gap(s,'Explicit account pairing');
    if(s.protection?.status==='Active'&&s.protection.personId!==m.personId)await release(s,'Explicit pairing switched the active Person','Stopped');
    if(s.protection&&s.protection.personId!==m.personId){s.protection=null;s.error=null;}
    s.binding={personId:m.personId,token:random(),origin:new URL(sender.url).origin,connectedAt:Date.now()};s.pairing=null;
    s.owners[m.personId] ||= {personId:m.personId,periods:[],history:[],acknowledged:0};
    s.owners[m.personId].origin=s.binding.origin;
    history(s,m.personId,'Account paired','Explicit popup code; observation belongs only to this active Person/origin.');
    s.sequence++;await save(s);return {token:s.binding.token,info:publicInfo(),snapshot:snapshot(s)};
  }
  if(internal)throw new Error('Unsupported popup command.');
  const owner=authenticate(s,m,sender);
  if(m.command==='reminder'){
    const config=reminderInput(m);
    if(config.enabled&&!await chrome.permissions.contains({origins:config.domains.map(d=>`*://*.${d}/*`)}))throw new Error('Selected-site observation permission denied. Restore site access in Chrome.');
    gap(s,'Reminder configuration changed');owner.reminder={...config,revision:random(),at:Date.now(),personId:owner.personId};history(s,owner.personId,'Reminder configured',`${config.domains.join(', ')}; ${config.thresholdSeconds}s shared; ${config.enabled?'enabled':'disabled'}`);await save(s);return {info:publicInfo(),snapshot:snapshot(s)};
  }
  if(m.command==='protect'){
    const config=protectionInput(m);
    if(s.protection?.status==='Active')throw new Error('Explicitly stop the active protection session before replacing it.');
    const now=Date.now();s.protection={...config,id:random(),personId:owner.personId,startedAt:now,expiresAt:now+config.durationSeconds*1000,lastWall:now,status:'Active'};
    // Persist intent before native installation. Status is only returned after native confirmation.
    history(s,owner.personId,'Protection requested',`${config.domains.join(', ')}; ${config.durationSeconds}s; expires ${new Date(s.protection.expiresAt).toISOString()}`);await save(s);await reconcile(s);
    if(!s.error)history(s,owner.personId,'Protection Active',config.domains.join(', '));
    try{await save(s);}catch(e){await installRules(null);throw e;}
    return {info:publicInfo(),snapshot:snapshot(s)};
  }
  if(m.command==='stop'){
    if(!s.protection||s.protection.personId!==owner.personId||s.protection.status!=='Active')throw new Error('No active protection session owned by this Person.');
    if(typeof m.reason!=='string'||m.reason.length<5||m.reason.length>200)throw new Error('An explicit early-stop reason is required.');
    await release(s,m.reason,'Stopped');await save(s);return {info:publicInfo(),snapshot:snapshot(s)};
  }
  if(m.command==='status')return {info:publicInfo(),snapshot:snapshot(s)};
  if(m.command==='ack'){if(!Number.isSafeInteger(m.sequence)||m.sequence<0||m.sequence>s.sequence)throw new Error('Invalid acknowledgement.');owner.acknowledged=Math.max(owner.acknowledged,m.sequence);await save(s);return {acknowledged:owner.acknowledged};}
  if(m.command==='disconnect'){gap(s,'Account disconnected');history(s,owner.personId,'Account disconnected','Observation paused. Any active manual protection retains its disclosed expiry.');s.binding=null;await save(s);return {disconnected:true};}
  throw new Error('Unsupported command.');
}
function snapshot(s) { const o=s.owners[s.binding.personId];return {installationId:s.installationId,sequence:s.sequence,personId:o.personId,version:VERSION,policy:POLICY,connectedAt:s.binding.connectedAt,observedAt:Date.now(),currentPeriodKey:localPeriod().key,periods:o.periods,history:o.history,protection:s.protection?.personId===o.personId?s.protection:null,reminder:o.reminder||null,acknowledged:o.acknowledged,error:s.error||o.observationError||null}; }
chrome.runtime.onMessage.addListener((m,sender,reply)=>{serial(()=>handle(m,sender)).then(value=>reply({ok:true,...value}),e=>reply({ok:false,error:e.message}));return true;});
const wake=()=>serial(async()=>{const s=await read();await reconcile(s);await save(s);});
const interrupt=reason=>serial(async()=>{const s=await read();gap(s,reason);await reconcile(s);await save(s);});
chrome.runtime.onInstalled.addListener(wake);
chrome.runtime.onStartup.addListener(wake);
chrome.alarms.onAlarm.addListener(wake);
chrome.tabs.onUpdated.addListener((_id,change)=>{if(change.url||change.status==='loading')interrupt('Tab navigation');});
chrome.tabs.onActivated.addListener(()=>interrupt('Active tab changed'));
chrome.tabs.onRemoved.addListener(()=>interrupt('Tab closed'));
chrome.windows.onFocusChanged.addListener(()=>interrupt('Window focus changed'));
chrome.windows.onBoundsChanged.addListener(w=>{if(w.state==='minimized')interrupt('Window minimized');});
chrome.idle.setDetectionInterval(15);
chrome.idle.onStateChanged.addListener(()=>interrupt('Idle state changed'));
chrome.permissions.onRemoved.addListener(()=>interrupt('Permission removed'));
