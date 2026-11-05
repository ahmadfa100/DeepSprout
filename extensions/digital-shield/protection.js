import {domains} from './policy.js';
export function protectionInput(m) {
  const selected=domains(m.domains),seconds=m.durationSeconds;
  if(!Number.isInteger(seconds)||seconds<5||seconds>7200)throw new Error('Choose 5–7200 seconds (UI: 1–120 whole minutes).');
  return {domains:selected,durationSeconds:seconds};
}
export const rulesFor = session => session?.status==='Active' ? session.domains.map((domain,i)=>({id:1001+i,priority:1,action:{type:'block'},condition:{requestDomains:[domain],resourceTypes:['main_frame','sub_frame']}})) : [];
export function expiryReason(session,now,monotonicExpired=false) {
  if(session?.status!=='Active')return null;
  if(now<session.lastWall-2000)return 'Clock moved backwards; released conservatively';
  if(now>=session.expiresAt||monotonicExpired)return 'Protection duration elapsed';
  return null;
}
