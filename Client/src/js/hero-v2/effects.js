const roots=[
 'M1058 722C1051 755 1009 747 992 777S903 794 865 856S768 863 732 941',
 'M1058 722C1067 763 1118 763 1145 798S1242 805 1278 850S1380 886 1437 941',
 'M1058 722C1055 771 1052 791 1030 823S1031 889 1003 941',
 'M1058 722C1024 752 965 738 945 774S839 773 811 820S715 834 666 904L622 941',
 'M1058 722C1106 749 1185 731 1205 765S1302 753 1340 805S1465 807 1500 869L1538 941',
 'M992 777Q986 824 965 853T940 941',
 'M1145 798Q1103 823 1114 873T1148 941',
 'M865 856Q865 895 816 909',
 'M1340 805Q1399 842 1424 824',
 'M945 774Q914 800 874 781',
 'M1030 823Q1069 856 1088 883',
];
export function createEffects(root){
 root.innerHTML=`<svg class="effects-svg" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="v2-bloom"><stop stop-color="#ecffab" stop-opacity=".86"/><stop offset="1" stop-color="#effcb2" stop-opacity="0"/></radialGradient><filter id="v2-root-blur" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="5"/></filter><linearGradient id="v2-energy" x2="0" y2="1"><stop stop-color="#f9ffd1" stop-opacity="0"/><stop offset=".5" stop-color="#f8ffd0"/><stop offset="1" stop-color="#d8f985" stop-opacity="0"/></linearGradient></defs>
 <ellipse class="ground-bloom" cx="1058" cy="756" rx="350" ry="180" fill="url(#v2-bloom)" opacity="0"/>
 <ellipse class="bimo-bloom" cx="1058" cy="546" rx="157" ry="230" fill="url(#v2-bloom)" opacity="0"/>
 <g class="root-shadow" stroke="#c7eb64" stroke-width="11" fill="none" filter="url(#v2-root-blur)" stroke-linecap="round">${roots.map(d=>`<path class="root" d="${d}" pathLength="1"/>`).join('')}</g>
 <g class="root-core" stroke="#f5ffc4" stroke-width="2.4" fill="none" stroke-linecap="round">${roots.map(d=>`<path class="root" d="${d}" pathLength="1"/>`).join('')}</g>
 <path class="energy-thread" d="M1058 14Q1048 179 1058 363T1058 723" stroke="#edffb6" stroke-width="2.8" fill="none" pathLength="1" opacity="0"/>
 <path class="growth-ribbon" d="M1058 14C1161 55 937 95 1058 134S1156 211 1058 250S962 328 1058 367" fill="none" stroke="#f5ffc3" stroke-width="2.2" opacity="0" pathLength="1"/>
 <ellipse class="flow-seed" cx="1058" cy="18" rx="7" ry="40" fill="url(#v2-energy)" opacity="0"/>
 <g class="root-leaves" fill="#b8db51" stroke="#f5ffc4" stroke-width="1.4">${[[984,784,-32],[1136,813,28],[865,861,-48],[1279,855,33],[1030,858,-5],[1187,885,25],[795,898,-44]].map(([x,y,r])=>`<g transform="translate(${x} ${y}) rotate(${r})"><path class="root-leaf" d="M0 0Q-28-9-17-42Q9-29 0 0ZM0 0L-12-29"/></g>`).join('')}</g>
 <g class="growth-leaves">${Array.from({length:15},(_,i)=>{const x=882+(i*73)%355,y=137+(i*97)%575;return `<g transform="translate(${x} ${y})"><g class="growth-leaf"><path d="M0 0Q-18-5-12-27Q5-22 0 0Z" fill="#9dc746" stroke="#6f983a" stroke-width="1"/><path d="M0 0L-10-22" stroke="#d4e884" fill="none"/></g></g>`}).join('')}</g>
 <g class="sparkles" fill="#fcffd3">${Array.from({length:20},(_,i)=>`<path class="sparkle" d="M0-6Q1-1 5 0Q1 1 0 6Q-1 1-5 0Q-1-1 0-6Z" transform="translate(${920+(i*37)%277} ${41+(i*57)%696})"/>`).join('')}</g>
 </svg>`;
}
