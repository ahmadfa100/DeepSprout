// Explicit phase boundaries. All narrative state is a pure function of scroll.
export const clamp = (n, min=0, max=1) => Math.min(max,Math.max(min,n));
export const mix = (a,b,p) => a+(b-a)*p;
export const ease = (a,b,p) => {const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
export const PHASES = Object.freeze({discovery:[0,.15],attraction:[.15,.4],capture:[.4,.75],release:[.75,1]});
export function storyState(progress) {
 const p=clamp(progress),gravity=clamp((p-.18)/.82),release=ease(.75,1,gravity);
 return {progress:p,gravity,release,world:1-ease(.10,.25,p),dark:ease(.12,.26,p),
  message:ease(.06,.17,gravity)*(1-ease(.61,.78,gravity)),
  phase:p<.18?'peace':gravity<.15?'discovery':gravity<.4?'attraction':gravity<.75?'capture':'release'};
}
// Authored placements, not random orbits. Left side is reserved for typography.
export const CARD_LAYOUT = Object.freeze([
 [.54,.19,-9,.65,-140], [.88,.28,12,.94,60], [.96,.75,16,1.12,120],
 [.55,.82,-14,.8,-30], [.37,.73,-20,.53,-220], [.79,.11,8,.42,-320],
 [.91,.51,-6,.47,-240], [.30,.13,18,.36,-340],
]);
export function cardPose(index, gravity, mobile=false) {
 const [x,y,rotation,scale,z]=CARD_LAYOUT[index];
 const pull=ease(.14+index*.014,.61+index*.023,gravity),orbit=pull*pull*.9;
 const cx=mobile?.5:.68,cy=mobile?.57:.50;
 const sx=mobile?[.12,.82,.94,.20][index%4]:x,sy=mobile?[.48,.48,.83,.86][index%4]:y;
 const dx=sx-cx,dy=sy-cy,radial=1-pull;
 return {x:cx+(dx*Math.cos(orbit)-dy*Math.sin(orbit))*radial,
  y:cy+(dx*Math.sin(orbit)+dy*Math.cos(orbit))*radial,
  z:z*(1-pull)-pull*260,scale:scale*(1-pull*.95),rotate:rotation+pull*37,
  tilt:mix(index%2?18:-18,65,pull),stretch:1+Math.sin(pull*Math.PI)*.25,
  opacity:ease(.01,.09+index*.012,gravity)*(1-ease(.68,.97,pull))*(index>4?.55:.85),pull};
}
