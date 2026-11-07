// Hand-drawn artwork for the story's opening: a sunrise landscape, an original minimal character
// and the Reel cards. Everything is authored in one 1600 × 900 design space; each piece is its own
// SVG layer so the scene can move a piece without repainting the others.

export const W=1600,H=900;
export const INK='#1d211f';
// The character sits on the rock with the hip here; the head centre is HIP + HEAD.
export const HIP={x:330,y:712},HEAD={x:18,y:-190},NECK={x:16,y:-134},HEAD_R=50;
export const SUN={x:560,y:588,r:58};
// Things that matter, which attention first reaches for: the sun, a flower, the tree, the far path.
export const ANCHORS=[{x:SUN.x,y:SUN.y-6},{x:582,y:808},{x:262,y:176},{x:1046,y:648}];
export const REEL_W=104,REEL_H=184;

const svg=(cls,body,box=`0 0 ${W} ${H}`,extra='')=>`<svg class="${cls}" viewBox="${box}" aria-hidden="true" focusable="false" ${extra}>${body}</svg>`;
const line=`fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round"`;

// A sky glow behind the sun, drawn once as a soft radial gradient.
export const glow=`<div class="dawn-glow"></div>`;

export const sun=svg('dawn-sun',`
 <g class="dawn-sun-rays" stroke="#f1c24f" stroke-width="5" stroke-linecap="round" fill="none">
  <path d="M${SUN.x} ${SUN.y-92}v-34"/><path d="M${SUN.x-62} ${SUN.y-72}l-20-28"/><path d="M${SUN.x+62} ${SUN.y-72}l20-28"/>
  <path d="M${SUN.x-104} ${SUN.y-26}l-32-12"/><path d="M${SUN.x+104} ${SUN.y-26}l32-12"/>
 </g>
 <circle cx="${SUN.x}" cy="${SUN.y}" r="${SUN.r}" fill="#f8d371"/>
 <circle cx="${SUN.x}" cy="${SUN.y}" r="${SUN.r-14}" fill="#fadc8a" opacity=".7"/>`);

const cloudPath='M-110 30C-130 30-138 6-118-2C-124-30-88-44-66-28C-54-62-4-66 10-36C26-56 72-50 78-18C106-24 128 2 110 24C104 32 96 32 88 32Z';
export const CLOUDS=[{x:500,y:300,s:1.12},{x:150,y:398,s:.82},{x:1300,y:150,s:.7}];
export const cloud=i=>svg(`dawn-cloud dawn-cloud-${i}`,`<path d="${cloudPath}" fill="#fdfaf1" stroke="#8f8b80" stroke-width="${(3/CLOUDS[i].s).toFixed(2)}" stroke-linejoin="round" transform="scale(${CLOUDS[i].s})"/><path d="M-60 6c10-8 26-10 40-4" fill="none" stroke="#c9c3b4" stroke-width="${(2.4/CLOUDS[i].s).toFixed(2)}" stroke-linecap="round" transform="scale(${CLOUDS[i].s})"/>`,'-150 -90 300 140','preserveAspectRatio="xMidYMid meet"');

export const birds=svg('dawn-birds',`<g class="dawn-bird" ${line} stroke-width="3"><path d="M0 0q10-9 18 0q8-9 18 0"/></g><g class="dawn-bird" ${line} stroke-width="2.6"><path d="M0 0q8-7 14 0q6-7 14 0"/></g>`,'-10 -20 60 40','overflow="visible"');

// Far and middle hills carry no outlines: distance is atmospheric. The near hill is outlined.
export const land=svg('dawn-land',`
 <path d="M-560 660C-320 628-40 664 300 650C420 606 540 592 640 612C724 628 800 598 890 590C996 580 1086 612 1186 602C1296 592 1404 560 1640 578V1100H-560Z" fill="#e6ecd6"/>
 <path d="M640 612C724 628 800 598 890 590C996 580 1086 612 1186 602C1296 592 1404 560 1640 578" fill="none" stroke="#9fb08a" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
 <g fill="#c9d8ad" stroke="#93a87e" stroke-width="1.8" opacity=".9">
  <path d="M752 640c-6-16 4-28 16-28s20 12 16 28z"/><path d="M786 640c-4-12 3-20 11-20s14 9 11 20z"/>
  <path d="M1142 606c-6-18 4-30 17-30s21 13 17 30z"/><path d="M1290 594c-5-14 3-24 13-24s17 10 13 24z"/>
 </g>
 <path d="M-560 730C-300 708 140 716 420 700C520 660 640 648 760 664C862 678 930 646 1040 654C1162 664 1264 704 1384 686C1472 672 1546 656 1640 664V1100H-560Z" fill="#d6e2bf"/>
 <path d="M760 664C862 678 930 646 1040 654C1162 664 1264 704 1384 686" fill="none" stroke="#86a06f" stroke-width="2.2" stroke-linecap="round" opacity=".45"/>
 <path d="M934 652C902 660 868 668 880 682C896 700 990 700 966 730C940 762 800 760 730 800C676 830 648 868 660 900L650 1100H810L790 900C774 874 790 846 846 826C934 794 1064 780 1036 734C1018 706 944 700 960 682C968 672 966 660 952 652Z" fill="#f5edd6" stroke="#cdbd94" stroke-width="2" stroke-linejoin="round" opacity=".95"/>
 <path d="M1010 1100L1040 900C1140 812 1290 784 1420 792C1500 797 1566 782 1640 760V1100Z" fill="#c4d6a2" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
 <path d="M1180 846c40-18 90-26 140-22" ${line} stroke-width="2.2" opacity=".35"/>`);

// The tree: a leaning trunk from the lower left and one scalloped crown hanging over the top left.
export const tree=svg('dawn-tree',`
 <g class="dawn-trunk">
  <path d="M-50 1100L-30 905C10 770 34 612 66 488C92 386 120 300 176 226L210 246C162 322 142 404 122 502C98 616 94 770 72 905L64 1100Z" fill="#c4935f" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
  <path d="M150 300C204 250 258 222 318 204L326 220C268 242 214 270 168 322Z" fill="#c4935f" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M96 420C70 360 36 318-6 290L-14 304C26 334 58 376 80 436Z" fill="#c4935f" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M92 560c10-60 20-110 40-170M70 760c6-50 12-100 22-150" fill="none" stroke="#9a6d43" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
 </g>
 <g class="dawn-crown">
  <path d="M-90-40C-74-104 0-110 26-80C64-132 146-126 168-92C214-140 304-130 326-96C374-140 462-130 484-94C532-134 618-126 640-86C690-118 782-100 792-58C846-44 842 2 806 18C836 58 788 100 744 88C744 130 690 150 654 126C636 172 576 176 552 144C524 188 456 184 444 152C414 204 340 196 334 162C302 214 236 206 230 170C200 228 132 226 126 184C96 244 30 240 22 200C-12 264-84 252-92 212C-130 196-122 150-96 136C-128 96-120 40-90-40Z" fill="#a9c77d" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round"/>
  <path d="M40 40C80 0 150 6 170 40C210 10 290 20 300 64M420 30C460 0 530 6 550 44M640 20c30-18 70-10 84 18" fill="none" stroke="#c4dc9e" stroke-width="16" stroke-linecap="round" opacity=".75"/>
  <path d="M60 150c30 20 70 22 100 8M360 120c34 18 74 16 104 0M600 96c22 10 50 10 70 0" fill="none" stroke="#8fb066" stroke-width="10" stroke-linecap="round" opacity=".65"/>
 </g>`,`0 0 ${W} ${H}`,'overflow="visible"');

// Foreground: the grassy mound the rock rests in, bushes, flowers and tufts that sway.
export const TUFTS=[[118,792],[472,836],[702,884],[986,892],[1244,862],[1468,852],[560,868],[300,848],[1380,880]];
export const FLOWERS=[[182,864,1],[262,888,.86],[582,812,.92],[640,858,.7]];
const tuft=([x,y],i)=>`<g class="dawn-tuft" data-i="${i}" transform="translate(${x} ${y})"><path d="M0 0c-4-14-12-24-20-30M2 0c0-16 2-30 6-40M4 0c6-12 14-20 24-24" ${line} stroke-width="3"/></g>`;
const flower=([x,y,s],i)=>`<g class="dawn-flower" data-i="${i}" transform="translate(${x} ${y})"><g transform="scale(${s})"><path d="M0 34c-2-16 0-30 4-44" ${line} stroke="#55743f" stroke-width="3.4"/><path d="M2 18c-10-8-22-8-30-2c8 8 20 10 30 2Z" fill="#9cc075" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><g transform="translate(4 -14)" fill="#fffdf7" stroke="${INK}" stroke-width="2.6">${[0,72,144,216,288].map(a=>`<ellipse rx="9" ry="15" transform="rotate(${a}) translate(0 -15)"/>`).join('')}<circle r="9" fill="#f6c443"/></g></g></g>`;
export const foreground=svg('dawn-fore',`
 <path d="M-560 1100V780C-400 752-200 758-60 772C24 744 116 758 176 770C270 790 384 800 474 830C548 854 604 878 660 920L710 1100Z" fill="#bcd48f" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
 <path d="M60 820c50-14 110-10 160 4M330 846c40 6 80 14 114 28" ${line} stroke-width="2.2" opacity=".35"/>
 <path d="M-40 905C-60 840-20 790 30 792C34 752 96 744 116 778C150 760 196 786 186 828C214 846 214 884 196 905Z" fill="#9fbe72" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
 <path d="M30 840c18-10 40-10 56 2M110 812c12-6 28-6 38 4" ${line} stroke="#6f9150" stroke-width="3" opacity=".8"/>
 <path d="M1460 905C1450 856 1490 828 1528 838C1548 806 1606 808 1620 844C1650 850 1660 880 1650 905Z" fill="#a7c47a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
 ${TUFTS.map(tuft).join('')}${FLOWERS.map(flower).join('')}`,`0 0 ${W} ${H}`,'overflow="visible"');

export const butterfly=svg('dawn-butterfly',`<g class="dawn-wings"><path d="M0 0C-10-14-24-14-24-4C-24 6-10 8 0 0Z" fill="#f5b3c8" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M0 0C10-14 24-14 24-4C24 6 10 8 0 0Z" fill="#f5b3c8" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/></g><path d="M0-6v10" ${line} stroke-width="2.6"/>`,'-30 -24 60 40','overflow="visible"');

// Leaves the storm tears from the crown.
export const leaf=svg('dawn-leaf',`<path d="M-12 0C-6-10 6-10 12 0C6 10-6 10-12 0Z" fill="#a9c77d" stroke="${INK}" stroke-width="2.2"/><path d="M-10 0h18" ${line} stroke-width="1.6" opacity=".6"/>`,'-16 -12 32 24','overflow="visible"');

// The character: a round head with no face, a sage sweater, dark trousers, a yellow backpack.
// Groups are posed from the scene; limbs are recomputed as paths so joints stay attached.
export const character=svg('dawn-character',`
 <g transform="translate(${HIP.x} ${HIP.y})">
  <g class="dawn-pack">
   <path d="M-206 64C-214 20-208-34-178-50C-150-64-110-62-96-38C-84-16-82 30-86 64Z" fill="#f2c24e" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
   <path d="M-198-20C-176-38-122-40-98-22L-96 4C-122-12-174-10-200 8Z" fill="#e6ac33" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
   <rect x="-156" y="-4" width="22" height="20" rx="4" fill="#fff3cf" stroke="${INK}" stroke-width="3"/>
   <path d="M-170-50c0-24 34-26 36 0" ${line} stroke-width="3.4"/>
  </g>
  <path class="dawn-rock" d="M-150 34C-152-6-112-24-60-22C2-26 72-20 122-6C162 6 178 40 168 72H-160C-172 62-162 44-150 34Z" fill="#cfccc2" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>
  <path d="M-96-6c36-8 92-6 140 4" ${line} stroke="#f2f0ea" stroke-width="5" opacity=".9"/>
  <g class="dawn-body">
   <g class="dawn-arm-far"><path class="dawn-arm-far-o" ${line} stroke-width="27"/><path class="dawn-arm-far-f" fill="none" stroke="#97b57a" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><circle class="dawn-hand-far" r="10" fill="#f6f3ea" stroke="${INK}" stroke-width="3.2"/></g>
   <g class="dawn-torso">
    <path d="M-30 4C-42-48-36-104-10-128C8-142 36-140 52-126C66-100 62-46 48 4C22 12-8 12-30 4Z" fill="#a9c58c" stroke="${INK}" stroke-width="3.8" stroke-linejoin="round"/>
    <path d="M-26-8C0 0 28 0 44-8" ${line} stroke-width="2.4" opacity=".7"/>
    <path d="M0-131c10 6 22 6 32-1" ${line} stroke-width="3"/>
    <path d="M-14-96c-4 20-4 46 0 70" ${line} stroke="#89a870" stroke-width="3" opacity=".8"/>
   </g>
  </g>
  <g class="dawn-legs"><path class="dawn-leg-o" ${line} stroke-width="34"/><path class="dawn-leg-f" fill="none" stroke="#3b4442" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/><ellipse class="dawn-shoe" rx="23" ry="11" fill="#22282a" stroke="${INK}" stroke-width="3"/></g>
  <g class="dawn-upper">
   <g class="dawn-head"><path d="M-32 0C-34-30-12-50 16-50C44-50 52-26 50 2C48 30 26 50 0 48C-24 46-34 24-32 0Z" transform="translate(${HEAD.x} ${HEAD.y})" fill="#fffdf7" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round"/></g>
   <g class="dawn-arm-near"><path class="dawn-arm-near-o" ${line} stroke-width="28"/><path class="dawn-arm-near-f" fill="none" stroke="#a9c58c" stroke-width="21" stroke-linecap="round" stroke-linejoin="round"/><circle class="dawn-hand-near" r="11" fill="#fffdf7" stroke="${INK}" stroke-width="3.4"/></g>
  </g>
  <g class="dawn-notice" ${line} stroke-width="4"><path d="M0-30v-22"/><path d="M18-20l14-16"/><path d="M28 0l20-6"/></g>
 </g>`,`0 0 ${W} ${H}`,'overflow="visible"');

// Reel cards: soft colour, an outlined phone-shaped frame, a simple doodle, and a feed's chrome.
const PALETTE=['#f6a98f','#c9b8f3','#a4d3ef','#f7d978','#a5dec4','#f6b6d0'];
const DOODLES=[
 `<circle cx="64" cy="66" r="14" fill="#fde6a6" stroke="${INK}" stroke-width="3"/><path d="M14 122l26-34 18 20 14-12 22 26z" fill="#fffaf0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
 `<path d="M50 120C20 98 16 76 30 66c10-7 20-2 20 8c0-10 10-15 20-8c14 10 10 32-20 54z" fill="#fff5f8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
 `<circle cx="50" cy="92" r="26" fill="#fffaf0" stroke="${INK}" stroke-width="3"/><path d="M44 80v24l20-12z" fill="${INK}"/>`,
 `<path d="M30 116c4-22 12-34 20-34s16 12 20 34" fill="#fffaf0" stroke="${INK}" stroke-width="3"/><circle cx="50" cy="70" r="12" fill="#fffaf0" stroke="${INK}" stroke-width="3"/><path d="M26 64l-8-10M74 64l8-10M50 50v-10" ${line} stroke-width="3"/>`,
 `<path d="M18 66h46a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H34l-10 10V98h-6a8 8 0 0 1-8-8V74a8 8 0 0 1 8-8z" fill="#fffaf0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M46 104h32a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-2v8l-8-8H46a6 6 0 0 1-6-6v-10a6 6 0 0 1 6-6z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
 `<path d="M50 62l9 20 22 3-16 15 4 22-19-11-19 11 4-22-16-15 22-3z" fill="#fffaf0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
];
export function reel(i){
 const v=i%6;
 return `<div class="dawn-reel" data-i="${i}" style="--reel:${PALETTE[v]}"><i class="dawn-reel-glow"></i><div class="dawn-reel-face"><svg viewBox="0 0 100 178" aria-hidden="true" focusable="false">
  <circle cx="16" cy="16" r="7" fill="#fffaf0" stroke="${INK}" stroke-width="2.6"/><path d="M28 13h26M28 20h16" ${line} stroke-width="2.6" opacity=".7"/>
  ${DOODLES[(v+Math.floor(i/6))%6]}
  <path d="M86 116c-6-5-8-8-6-11c2-2 5-1 6 1c1-2 4-3 6-1c2 3 0 6-6 11z" fill="${INK}" opacity=".85"/><path d="M80 132h12M80 140h8" ${line} stroke-width="2.6" opacity=".7"/>
  <path d="M10 160h80" ${line} stroke-width="3" opacity=".25"/><path d="M10 160h${18+(i*23)%60}" ${line} stroke-width="3"/>
 </svg></div></div>`;
}

// A paper grain, made once: sparse warm specks on a transparent tile.
export function grainTile(){
 const c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d'),d=g.createImageData(160,160);
 let s=1854;const r=()=>(s=(s*16807)%2147483647)/2147483647;
 for(let i=0;i<d.data.length;i+=4){const v=r();if(v<.32){d.data[i]=96;d.data[i+1]=84;d.data[i+2]=64;d.data[i+3]=Math.round(6+r()*16)}}
 g.putImageData(d,0,0);return c.toDataURL('image/png');
}
