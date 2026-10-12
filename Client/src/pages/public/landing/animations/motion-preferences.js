(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  window.DeepSproutMotion = {
    reducedMotion,
    finePointer,
    canAnimate: () => Boolean(window.gsap && window.ScrollTrigger) && !reducedMotion.matches
  };
})();
