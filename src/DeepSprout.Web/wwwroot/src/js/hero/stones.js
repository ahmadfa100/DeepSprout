export const STONES = [
 {x:1100,y:122,s:1.1,dx:-18,dy:-40,r:-8,delay:.48},
 {x:1034,y:226,s:.96,dx:-35,dy:10,r:7,delay:.65},
 {x:1170,y:224,s:.98,dx:31,dy:-15,r:-6,delay:.79},
 {x:916,y:330,s:.94,dx:-27,dy:26,r:-10,delay:.58},
 {x:1040,y:337,s:.98,dx:9,dy:37,r:8,delay:.88},
 {x:1165,y:337,s:.95,dx:-16,dy:32,r:-5,delay:.98},
 {x:1290,y:326,s:.99,dx:32,dy:19,r:9,delay:.74},
];
export function createStones(mount) {
 mount.innerHTML=`<svg class="world-layer stones-layer" viewBox="0 0 1600 1000" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="seed-stone" x1=".2" y1="0" x2=".7" y2="1"><stop stop-color="#eee3bd"/><stop offset=".43" stop-color="#b6b59c"/><stop offset="1" stop-color="#858979"/></linearGradient><radialGradient id="seed-aura"><stop stop-color="#d7f18f" stop-opacity=".66"/><stop offset="1" stop-color="#d7f18f" stop-opacity="0"/></radialGradient></defs>${STONES.map((s,i)=>`<g transform="translate(${s.x} ${s.y}) scale(${s.s})"><g class="stone" data-stone="${i}" data-depth="${i%3}"><ellipse class="stone-aura" rx="85" ry="68" fill="url(#seed-aura)" opacity="0"/><g class="stone-idle"><path d="M-56 18C-59-8-24-53-2-52C23-54 53-17 58 11C68 44 23 47-7 46C-41 46-58 38-56 18Z" fill="url(#seed-stone)" stroke="#707968" stroke-width="2.6"/><path d="M-47 0Q-25-43-4-44Q16-46 39-16L26-19Q6-40-7-33Q-26-33-38-5Z" fill="#fff5d7" opacity=".72"/><path d="M-53 24Q-24 13-13 32Q18 44 56 20Q54 47-8 44Q-44 44-53 24Z" fill="#727d6a" opacity=".45"/><path d="M-30 9Q-16-1-5 6M21-13L33-8L32 7" fill="none" stroke="#bbc197" stroke-width="7" opacity=".34" stroke-linecap="round"/><g class="stone-vein" fill="none" stroke="#d6e8ac" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M0 26V1M0 19Q-20 18-20-4Q-1-3 0 19ZM0 13Q1-8 20-13Q24 9 0 19Z" transform="rotate(${[0,-16,14,-8,0,25,-16][i]})"/></g></g></g></g>`).join('')}</svg>`;
 return [...mount.querySelectorAll('.stone')];
}
