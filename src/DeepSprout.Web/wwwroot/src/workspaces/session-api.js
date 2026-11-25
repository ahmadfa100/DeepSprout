import {workspaceRequest} from './workspace-api.js';

export const sessionRequest = (path,payload,method) => workspaceRequest('/api/initiative-sessions'+path,payload,method);
export const sessionMode = mode => mode === 'InPerson' ? 'In person' : mode;
export const sessionModes = session => (session.mode === 'Hybrid' ? ['Online','InPerson'] : [session.mode]).map(mode => {
  const online = mode === 'Online';
  const capacity = online ? session.onlineCapacity : session.inPersonCapacity;
  const used = online ? session.onlineUsed : session.inPersonUsed;
  return {mode,capacity,used,remaining:capacity === null ? null : Math.max(0,capacity-used)};
});
export const modeSeats = session => sessionModes(session).map(({mode,remaining}) =>
  sessionMode(mode)+': '+(remaining === null ? 'no seat limit' : remaining+' seats left')).join(' · ');

function inZone(value,timeZone,options) {
  const date = new Date(value);
  try { return new Intl.DateTimeFormat('en-GB',{...options,timeZone}).formatToParts(date); }
  catch { return new Intl.DateTimeFormat('en-GB',{...options,timeZone:'UTC'}).formatToParts(date); }
}

export function sessionLocal(value,zone) {
  const parts = inZone(value,zone,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const part = type => parts.find(item=>item.type === type).value;
  return part('year')+'-'+part('month')+'-'+part('day')+'T'+part('hour')+':'+part('minute');
}

export function sessionWhen(session) {
  const options = {dateStyle:'medium',timeStyle:'short'};
  const format = value => inZone(value,session.timeZoneId,options).map(part=>part.value).join('');
  return format(session.startsAtUtc)+' – '+format(session.endsAtUtc)+' ('+session.timeZoneId+')';
}

export const registerSession = (session, mode, consent, requestId) =>
  sessionRequest('/'+session.id+'/register',{mode,consent,requestId,version:session.version});
export const cancelSessionRegistration = (sessionId,registrationId) =>
  sessionRequest('/'+sessionId+'/registrations/'+registrationId+'/cancel',{});
