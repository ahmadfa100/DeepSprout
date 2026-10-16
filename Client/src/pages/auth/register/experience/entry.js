const icons = {
 individual:'<path d="M16 28V14m0 9C5 23 5 12 5 12s11 0 11 11Zm0-5C16 7 28 5 28 5s0 13-12 13Z"/>',
 partner:'<circle cx="16" cy="16" r="4"/><circle cx="5" cy="6" r="3"/><circle cx="28" cy="8" r="3"/><circle cx="25" cy="28" r="3"/><circle cx="5" cy="27" r="3"/><path d="m8 8 5 5m6 0 6-3m-7 10 5 5m-10-5-6 5"/>',
 mentor:'<circle cx="12" cy="10" r="5"/><path d="M3 28v-3a9 9 0 0 1 18 0v3m2-22a5 5 0 0 1 0 10m2 4a8 8 0 0 1 5 8"/>',
 organization:'<path d="M3 12 16 4l13 8H3Zm3 3v12m10-12v12m10-12v12M3 29h26"/>',
 provider:'<path d="m2 28 12-22 8 14 4-7 6 15H2Zm7-13 5 3 4-3"/>'
};
const icon = key => `<svg viewBox="0 0 34 34" aria-hidden="true">${icons[key]}</svg>`;
export function choiceMarkup(partnerBase) {
 return `<div class="register-choice-content">
 <div class="entry-kicker"><span>01</span> YOUR NEXT CHAPTER</div>
 <h1 class="entry-title" tabindex="-1">Where would you<br>like to grow?</h1>
 <p class="entry-intro">A personal journey or a shared purpose.<br>There’s a place for you here.</p>
 <div class="path-options" role="group" aria-label="Choose your registration path">
 ${[['individual','Join as Individual','Personal journey, activities, community and experiences.','A little space for you'],['partner','Join as a Partner','Lead programs, represent an institution or organize experiences.','Make room for others']].map(([key,title,desc,tag])=>`<button type="button" class="path-card" data-path="${key}" aria-pressed="${key==='individual'}"><span class="path-icon">${icon(key)}</span><span class="path-copy"><span class="path-tag">${tag}</span><strong>${title}</strong><span>${desc}</span></span><span class="path-check" aria-hidden="true">✓</span></button>`).join('')}
 </div><button type="button" class="entry-continue" data-entry-continue>Continue as Individual <span aria-hidden="true">↗</span></button>
 <p class="entry-note">Your beginning. Your pace.</p></div>
 <div class="register-partner-content" hidden><button type="button" class="entry-back" data-entry-back>← Change your path</button><div class="entry-kicker"><span>02</span> GROWING TOGETHER</div><h1 class="entry-title" tabindex="-1">Good things grow<br>through connection.</h1><p class="entry-intro">How would you like to contribute?</p><div class="partner-paths">
 ${[['mentor','Mentor / Coach','Guide people. Encourage possibility.'],['organization','Institution Representative','Bring your community together.'],['provider','Outdoor Provider','Create experiences beyond the screen.']].map(([key,title,desc])=>`<a class="path-card partner-path" href="${partnerBase}${key}" data-partner-path="${key}"><span class="path-icon">${icon(key)}</span><span class="path-copy"><strong>${title}</strong><span>${desc}</span></span><span aria-hidden="true">↗</span></a>`).join('')}
 </div><p class="entry-note">Already invited? <a href="${partnerBase.replace('account/','institution-invitation')}">Use your institution invitation</a></p></div>`;
}
export function bindChoices(root, world, {individual, partner, back, initial='individual'}={}) {
 const abort=new AbortController(),opts={signal:abort.signal};let selected=initial;
 const select=mode=>{selected=mode;root.querySelectorAll('[data-path]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.path===mode)));root.querySelector('[data-entry-continue]').innerHTML=`Continue as ${mode==='partner'?'a Partner':'Individual'} <span aria-hidden="true">↗</span>`;world.setMode(mode);};
 root.addEventListener('click',e=>{const card=e.target.closest('[data-path]');if(card)select(card.dataset.path);if(e.target.closest('[data-entry-continue]'))(selected==='individual'?individual:partner)?.();if(e.target.closest('[data-entry-back]'))back?.();},opts);
 root.addEventListener('focusin',e=>{if(e.target.closest('.path-card'))world.signal('card-focus',2);},opts);
 root.querySelectorAll('.path-card').forEach(card=>{
  card.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=card.getBoundingClientRect();card.style.setProperty('--rx',`${-(e.clientY-r.top-r.height/2)/90}deg`);card.style.setProperty('--ry',`${(e.clientX-r.left-r.width/2)/160}deg`);},opts);
  card.addEventListener('pointerenter',()=>world.signal('card-hover',Number(card.dataset.partnerPath==='provider')+2),opts);
  card.addEventListener('pointerleave',()=>{card.style.removeProperty('--rx');card.style.removeProperty('--ry');},opts);
 });
 select(selected);return ()=>abort.abort();
}
