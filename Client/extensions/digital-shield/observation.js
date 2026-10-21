import {domains} from './policy.js';
export function reminderInput(m) {
  const selected=domains(m.domains),seconds=m.thresholdSeconds;
  if(!Number.isInteger(seconds)||seconds<5||seconds>14400||typeof m.enabled!=='boolean')throw new Error('Choose one shared threshold from 5–14400 seconds (UI: 1–240 minutes).');
  return {domains:selected,thresholdSeconds:seconds,enabled:m.enabled};
}
export const contextEligible = ({active,focused,minimized,idle,domain,selected}) => active===true&&focused===true&&!minimized&&idle==='active'&&!!domain&&selected.includes(domain);
export function localPeriod(at=Date.now(),timezone=Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));
  const pick=type=>parts.find(p=>p.type===type).value;
  const day=`${pick('year')}-${pick('month')}-${pick('day')}`;
  return {key:day+'|'+timezone,day,timezone};
}
/* A sample never resumes elapsed time across workers, tabs, config or local-day boundaries. */
export function eligibleSeconds(previous,current) {
  if(!previous)return {seconds:0,reason:'First observation / restart'};
  for(const k of ['personId','tabId','windowId','domain','periodKey','revision'])if(previous[k]!==current[k])return {seconds:0,reason:'Context or period changed'};
  const wall=current.at-previous.at,mono=current.mono-previous.mono;
  if(wall<=0||mono<=0||Math.abs(wall-mono)>1000)return {seconds:0,reason:'Clock discontinuity'};
  if(wall>2500||mono>2500)return {seconds:0,reason:'Telemetry gap / suspension'};
  return {seconds:Math.min(wall,mono)/1000,reason:null};
}
export function newPeriod(now=Date.now()) {
  return {...localPeriod(now),seconds:{},observedSeconds:0,samples:0,gaps:0,gapReasons:{},firstObservation:null,lastObservation:null,reminderState:'NotReached',configVersions:[],coverage:'Partial browser observation; unknown gaps are excluded'};
}
