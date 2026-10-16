import {createLivingWorld} from './living-world.js';
import {choiceMarkup,bindChoices} from './entry.js';
let world, unbind, fieldEvents, currentRoute;
const enabled = r => r.area === 'auth' && ['register','account','verify','application','institution-invitation'].includes(r.page);
export function registrationMarkup(partner=false) {
  return `<section class="entry-shell" aria-label="Join DeepSprout" data-partner="${partner}">${choiceMarkup('#/auth/account/')}</section>`;
}
export function syncRegistrationExperience(route) {
  currentRoute=route;unbind?.();unbind=null;fieldEvents?.abort();fieldEvents=null;
  if(!enabled(route)){world?.destroy();world=null;document.body.classList.remove('living-register');return;}
  document.body.classList.add('living-register');
  document.getElementById('main').tabIndex=-1;
  const partner=route.page!=='register'||route.id==='partner';
  if(!world){const host=document.createElement('aside');host.className='registration-world';document.body.prepend(host);world=createLivingWorld(host,partner?'partner':'individual');}
  world.setMode(partner?'partner':'individual');
  fieldEvents=new AbortController();
  const form=document.querySelector('.auth-form form,form.auth-form');
  if(form){
    form.addEventListener('invalid',event=>event.target.setAttribute('aria-invalid','true'),{signal:fieldEvents.signal,capture:true});
    form.addEventListener('input',event=>{if(!event.target.matches('input,textarea,select'))return;event.target.removeAttribute('aria-invalid');event.target.dataset.valid=String(event.target.validity.valid&&event.target.value.length>0);},{signal:fieldEvents.signal});
  }
  const shell=document.querySelector('.entry-shell');
  if(shell){shell.querySelector('.register-choice-content').hidden=partner;shell.querySelector('.register-partner-content').hidden=!partner;
    unbind=bindChoices(shell,world,{initial:partner?'partner':'individual',individual:()=>{location.href='src/pages/auth/register/register.html#individual';},partner:()=>{location.hash='/auth/register/partner';},back:()=>{location.hash='/auth/register';}});
  }
}
export function registrationFeedback(kind){world?.signal(kind);}
window.addEventListener('pagehide',()=>{unbind?.();fieldEvents?.abort();world?.destroy();world=null;});
window.addEventListener('pageshow',e=>{if(e.persisted&&currentRoute)syncRegistrationExperience(currentRoute);});
