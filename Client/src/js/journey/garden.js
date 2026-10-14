import {ease} from './choreography.js';
// Editable illustrations. Geometry and restrained botanical colours follow the reference art language.
const leaf = 'M0 0C-37-3-55-24-55-52C-24-54 3-35 0 0Z';
const bed = `<ellipse cx="300" cy="397" rx="222" ry="27" fill="#a6b499" opacity=".10"/><path d="M80 324Q80 311 101 306L274 259Q296 252 321 259L504 305Q525 310 524 326L524 349Q523 362 501 368L322 417Q299 423 276 417L100 367Q80 360 80 347Z" fill="url(#jg-bed)" stroke="#a1b08d" stroke-width="1.7"/><path d="M81 324Q79 312 103 306L276 259Q297 253 319 259L502 305Q524 311 522 324Q520 336 498 341L322 389Q299 395 276 389L104 340Q82 334 81 324Z" fill="#e5ead6" stroke="#b1bda0" stroke-width="1.6"/><path d="M108 320L277 274Q298 268 317 273L493 319Q503 322 493 326L318 374Q300 380 281 374L108 327Q98 323 108 320Z" fill="#d5dfc2"/><path d="M88 337L279 390Q300 398 321 390L515 337" fill="none" stroke="#eff3e5" stroke-width="2" opacity=".8"/>`;
const sprout = `<g class="plant-stem"><path d="M0 0Q-5-52 0-106" fill="none" stroke="#64885c" stroke-width="4" stroke-linecap="round" pathLength="1"/></g><g class="plant-leaf leaf-a" transform="translate(-2 -48)"><path d="${leaf}" fill="url(#jg-leaf)" stroke="#69865a" stroke-width="1.8"/><path d="M-2-2Q-22-30-44-43" fill="none" stroke="#8da578" stroke-width="1.3"/></g><g class="plant-leaf leaf-b" transform="translate(-1 -58) scale(-1 1)"><path d="${leaf}" fill="url(#jg-leaf)" stroke="#69865a" stroke-width="1.8"/><path d="M-2-2Q-22-30-44-43" fill="none" stroke="#8da578" stroke-width="1.3"/></g><g class="plant-leaf leaf-c" transform="translate(0 -92) scale(.68 .68)"><path d="${leaf}" fill="#b7c997" stroke="#69865a" stroke-width="2.2"/></g>`;
const flower = `<path d="M0 0Q7-30-2-69" fill="none" stroke="#6d8c62" stroke-width="3" stroke-linecap="round"/><path d="M3-24Q-27-21-29-43Q-7-46 3-24Z" fill="#aabd90" stroke="#6d8c62" stroke-width="1.4"/><g transform="translate(-2 -72)" fill="#c4b2df" stroke="#9886af" stroke-width="1.4"><ellipse cy="-12" rx="10" ry="16"/><ellipse cx="12" cy="-1" rx="16" ry="10" transform="rotate(-20)"/><ellipse cy="12" rx="10" ry="16"/><ellipse cx="-12" cy="-1" rx="16" ry="10" transform="rotate(20)"/><circle r="10" fill="#f0e4bd" stroke="#bdaf83"/></g>`;
const tree = `<path d="M0 0Q-5-49-1-105M-2-55L-29-86M-2-70L23-92" fill="none" stroke="#8b9470" stroke-width="8" stroke-linecap="round"/><path d="M-54-90C-76-95-73-128-51-141C-65-170-38-189-17-182C-4-206 28-200 38-178C66-183 81-157 66-137C83-117 66-91 44-91C29-73 10-81-1-82C-19-67-43-72-54-90Z" fill="url(#jg-tree)" stroke="#6e8b5e" stroke-width="2.1"/><path d="M-38-142Q-34-163-17-164M17-173Q40-171 45-153" fill="none" stroke="#c8d7ae" stroke-width="7" stroke-linecap="round" opacity=".52"/><path d="M-4-85Q-2-123-8-146M-5-117L-27-134M-5-104L25-125" fill="none" stroke="#799969" stroke-width="1.5" opacity=".6"/>`;
const shrub = `<path d="M0 0C-31-1-58-22-56-54C-21-52-1-27 0 0Z" fill="#99b183" stroke="#6d8a5e" stroke-width="1.7"/><path d="M1 0C-9-34 1-61 25-72C43-40 29-15 1 0Z" fill="#afc393" stroke="#6d8a5e" stroke-width="1.7"/><path d="M1 0C17-35 48-41 67-32C59-4 29 8 1 0Z" fill="#becd9d" stroke="#6d8a5e" stroke-width="1.7"/><path d="M0 0L-40-40M0 0L20-54M0 0L49-24" fill="none" stroke="#7e9a6b" stroke-width="1.2"/>`;
const composition = (classes='')=>`${bed}<g class="${classes}tree" transform="translate(385 326)">${tree}</g><g class="${classes}flower" transform="translate(176 337)">${flower}</g><g class="${classes}sprout" transform="translate(286 337)">${sprout}</g><g class="${classes}shrub" transform="translate(352 374) scale(.6)">${shrub}</g><g class="${classes}flowers" transform="translate(210 368) scale(.5)">${flower}</g><g class="${classes}detail" transform="translate(420 361) scale(.28)">${shrub}</g>`;
export function gardenDefinitions(){return `<svg class="journey-illustration-defs" width="0" height="0" aria-hidden="true" style="position:absolute;overflow:hidden"><defs>
 <linearGradient id="jg-leaf" x2=".8" y2="1"><stop stop-color="#bfd19f"/><stop offset="1" stop-color="#8fac79"/></linearGradient>
 <linearGradient id="jg-tree" x2=".6" y2="1"><stop stop-color="#b4ca94"/><stop offset="1" stop-color="#90ad7b"/></linearGradient>
 <linearGradient id="jg-bed" x2="0" y2="1"><stop stop-color="#d6ddc6"/><stop offset="1" stop-color="#bbcbaa"/></linearGradient>
 <symbol id="jg-mature" viewBox="0 0 600 480">${composition()}</symbol>
 <symbol id="jg-floral" viewBox="0 0 600 480">${bed}<g transform="translate(365 340) scale(.84)">${tree}</g><g transform="translate(198 330) scale(1.1)">${flower}</g><g transform="translate(280 352) scale(.9)">${sprout}</g><g transform="translate(389 376) scale(.6)">${flower}</g></symbol>
 <symbol id="jg-leafy" viewBox="0 0 600 480">${bed}<g transform="translate(335 330) scale(1.1)">${tree}</g><g transform="translate(209 340) scale(.85)">${sprout}</g><g transform="translate(374 374) scale(.65)">${shrub}</g><g transform="translate(240 380) scale(.65)">${shrub}</g></symbol>
 </defs></svg>`}
export function staticGardenSVG(){const defs=gardenDefinitions();return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 480">${defs.slice(defs.indexOf('<defs>'),-6)}${composition()}</svg>`}
export function createGarden(panel){
 panel.querySelector('.garden-art').innerHTML=`<svg viewBox="0 0 600 480" role="img" aria-label="An illustrated garden growing from a seed">${composition('growing-')}</svg>`;
 const groups=['tree','flower','sprout','shrub','flowers','detail'].map(name=>panel.querySelector(`.growing-${name}`));
 const baseTransforms=groups.map(el=>el.getAttribute('transform'));
 const art=panel.querySelector('.garden-art'),stem=panel.querySelector('.growing-sprout .plant-stem path');
 const leafGroups=[...panel.querySelectorAll('.growing-sprout .plant-leaf')],leafTransforms=leafGroups.map(el=>el.getAttribute('transform'));
 const achievement=panel.querySelector('.garden-achievement'),streak=panel.querySelector('.garden-streak'),unlocked=panel.querySelector('.garden-unlocked'),week=panel.querySelector('.garden-week');
 function render(t,mobile=false,staticView=false){
  const values=staticView?[1,1,1,1,1,1]:[ease(7.55,8.02,t),ease(7.30,7.63,t),ease(6.96,7.23,t),ease(7.82,8.14,t),ease(7.66,8.02,t),ease(7.84,8.14,t)];
  groups.forEach((g,i)=>{g.setAttribute('transform',`${baseTransforms[i]} scale(${Math.max(.001,values[i])})`);g.style.opacity=values[i]===0?'0':'1'});
  const stemProgress=staticView?1:ease(6.96,7.16,t);stem.style.strokeDasharray='1';stem.style.strokeDashoffset=1-stemProgress;
  leafGroups.forEach((el,i)=>{const p=staticView?1:ease(7.07+i*.12,7.25+i*.12,t);el.setAttribute('transform',`${leafTransforms[i]} scale(${Math.max(.001,p)})`)});
  const orbit=staticView?0:Math.sin(ease(7.04,8.15,t)*Math.PI*2)*(mobile?3:9);
  art.style.transform=`translateX(${orbit}px)`;
  let phase=staticView?4:t<6.96?0:t<7.3?1:t<7.55?2:t<7.82?3:4;
  achievement.textContent=['One completed session. One seed.','A focus session → your first sprout','A mindful break → a flower','A week of practice → a little tree','Small steps. A garden of your own.'][phase];
  streak.textContent=['1 day','1 day','2 days','3 days','3 days'][phase];unlocked.textContent=`${phase} / 4`;week.textContent=`${[20,20,40,60,80][phase]}%`;
  panel.dataset.growth=String(phase);
 }
 return {render};
}
