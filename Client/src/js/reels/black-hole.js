import {clamp,mix,smooth} from './story-math.js';

// The gravitational climax as one pure function of scroll: story progress p (stages 5–6)
// and exit progress q (collapse.js phases). Nothing accumulates, so reversing restores it.
// Radii are in world-height units around CORE; the shader, the void and the captures share them.
export function holeFrame(p,q=0){
 const form=smooth(.70,.86,p),shape=smooth(.78,1,p);
 const capture=smooth(0,.36,q),horizon=smooth(.36,.58,q),swallow=smooth(.56,.70,q);
 // Emergence → attraction → capture → event horizon → darkness. The last term outgrows the
 // viewport so the shadow itself becomes the void.
 const radius=form*(.02+.04*shape)+.05*shape+.04*capture+.04*horizon+1.45*swallow*swallow;
 return {
  form,shape,capture,horizon,swallow,radius,
  // Disk light arrives after the shadow, and leaves before the dark covers the frame.
  disk:smooth(.74,.92,p)*(1-smooth(.56,.67,q)),
  // The purple storm cools into deep charcoal; a little of it stays, bent by the lens.
  dark:clamp(smooth(.80,1,p)*.8+capture*.15+horizon*.05),
  // Camera elevation above the disk plane, as sin(inclination): slightly lower as it approaches.
  tilt:mix(.24,.17,clamp(shape*.4+capture*.6)),
  // Scroll-driven spin: orbital phase advances with gravity, not with the clock.
  spin:p*1.6+q*q*9,
  // Warm re-lighting of cards, chips and ribbons as darkness arrives.
  warm:smooth(.76,.95,p),
  phase:q>=.70?'void':q>=.56?'darkness':q>=.36?'horizon':q>0?'capture':p>=.86?'attraction':p>=.70?'emergence':'storm',
 };
}
