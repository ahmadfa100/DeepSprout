(() => {
  const { gsap } = window;
  const motion = window.DeepSproutMotion;
  const hero = document.querySelector('.hero');
  if (!gsap || !motion || !hero) return;
  const media = gsap.matchMedia();
  media.add('(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
    const scene = hero.querySelector('.hero-scene');
    const art = hero.querySelector('.hero-art');
    const moveX = gsap.quickTo(scene, 'x', { duration: .55, ease: 'power2.out' });
    const moveY = gsap.quickTo(scene, 'y', { duration: .55, ease: 'power2.out' });
    const lean = gsap.quickTo(art, 'x', { duration: .5, ease: 'power2.out' });
    const handleMove = event => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      moveX(x * -8);
      moveY(y * -5);
    };
    const reset = () => { moveX(0); moveY(0); };
    const cta = hero.querySelector('[data-open-check]');
    const leanIn = () => lean(-3);
    const leanOut = () => lean(0);
    hero.addEventListener('pointermove', handleMove, { passive: true });
    hero.addEventListener('pointerleave', reset);
    cta?.addEventListener('pointerenter', leanIn);
    cta?.addEventListener('pointerleave', leanOut);
    return () => {
      hero.removeEventListener('pointermove', handleMove);
      hero.removeEventListener('pointerleave', reset);
      cta?.removeEventListener('pointerenter', leanIn);
      cta?.removeEventListener('pointerleave', leanOut);
      reset();
      leanOut();
    };
  });
})();
