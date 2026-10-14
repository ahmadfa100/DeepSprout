import {mix} from '../reels/story-math.js';

// The root at the seam between section 4 and the garden, in screen pixels. Section 4 draws it at
// the end of station 7; the garden stage draws the same shape in its own world for its first frame,
// so the two frames are one picture. `entry` is where the garden's seed appears.
export const ROOT={trunk:2,tail:1.6,rootlet:1.1,soil:1.4,soilOpacity:.32,inkOpacity:.85,tailPoints:12};

export function rootShape(entry,height){
 const soil=entry.y-Math.min(150,height*.17),x0=entry.x-8,tail=new Float64Array(ROOT.tailPoints*2);
 for(let i=0;i<ROOT.tailPoints;i++){
  const u=i/(ROOT.tailPoints-1);
  tail[i*2]=mix(x0,entry.x,u)+Math.sin(u*Math.PI*1.6)*7*(1-u);tail[i*2+1]=mix(soil,entry.y,u);
 }
 const at=u=>{const k=Math.round(u*(ROOT.tailPoints-1));return[tail[k*2],tail[k*2+1]]};
 const [ax,ay]=at(.36),[bx,by]=at(.64);
 return{
  top:-40,soil,x0,tail,
  soilLine:[entry.x-120,entry.x+120],
  // Two rootlets, each a short quadratic curve: [start, control, end].
  rootlets:[[ax,ay,ax-10,ay+4,ax-17,ay+15],[bx,by,bx+9,by+3,bx+14,by+12]],
 };
}

// One SVG path string for the tail, mapped through `map(x,y) -> [x,y]`.
export function tailPath(shape,map){
 let d='';
 for(let i=0;i<ROOT.tailPoints;i++){const [x,y]=map(shape.tail[i*2],shape.tail[i*2+1]);d+=`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`}
 return d;
}
export function rootletPath(shape,map){
 return shape.rootlets.map(r=>{const [a,b]=map(r[0],r[1]),[c,d]=map(r[2],r[3]),[e,f]=map(r[4],r[5]);return`M${a.toFixed(2)} ${b.toFixed(2)}Q${c.toFixed(2)} ${d.toFixed(2)} ${e.toFixed(2)} ${f.toFixed(2)}`}).join('');
}
