(() => {
  const motion = window.DeepSproutMotion;
  const growth = window.DeepSproutGrowth;
  const main = document.getElementById('story-main');
  if (!motion || !growth || !main || !window.gsap || !window.ScrollTrigger) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();

  const stageStops = [
    ['#discover', 3], ['#how', 4], ['#experience', 5],
    ['#progress', 6], ['#start', 7]
  ];
  const syncStageAtCurrentScroll = () => {
    let stage = 0;
    const noise = document.getElementById('noise');
    if (noise) {
      const noiseBounds = noise.getBoundingClientRect();
      if (noiseBounds.top <= innerHeight * .7) stage = 1;
      if (noiseBounds.bottom <= innerHeight * .45) stage = 2;
    }
    stageStops.forEach(([selector, value]) => {
      if (document.querySelector(selector)?.getBoundingClientRect().top <= innerHeight * .65) stage = value;
    });
    growth.setGrowthStage(stage);
  };

  media.add({
    desktop: '(min-width: 1024px)',
    tablet: '(min-width: 768px) and (max-width: 1023px)',
    mobile: '(max-width: 767px)',
    reduceMotion: '(prefers-reduced-motion: reduce)'
  }, context => {
    const { desktop, tablet, mobile, reduceMotion } = context.conditions;
    if (reduceMotion) {
      syncStageAtCurrentScroll();
      return;
    }

    // TODO: Replace whole-image mascot motion with layered head, eyes, arms, legs, and sprout assets when exported.
    const heroEntrance = gsap.timeline({ defaults: { ease: 'power2.out' } });
    heroEntrance.fromTo('.hero-art', { autoAlpha: .74, scale: 1.07 }, { autoAlpha: 1, scale: 1.025, duration: 1.15 });
    heroEntrance.fromTo('.hero-eyebrow,.hero h1,.hero-lead,.hero-actions,.hero-notes',
      { autoAlpha: 0, y: 19 }, { autoAlpha: 1, y: 0, duration: .66, stagger: .12 }, .12);
    if (desktop) heroEntrance.fromTo('.floating-note', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .8 }, .65);

    if (desktop || tablet) {
      const ambient = gsap.timeline({ paused: true, repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
      ambient.to('.hero-art', { y: -3, duration: 7.5 }, 0)
        .to('.cloud-distant', { x: 4, y: -2, duration: 8.5 }, 0)
        .to('.cloud-near', { x: -3, y: 2, duration: 7.3 }, 0)
        .to('.hero-sun-glow', { opacity: .52, duration: 8 }, 0)
        .to('.hero-foreground-leaf.leaf-a', { rotation: -36, duration: 6.4 }, 0)
        .to('.hero-foreground-leaf.leaf-b', { rotation: 19, duration: 7.8 }, 0);
      ScrollTrigger.create({
        trigger: '.hero', start: 'top bottom', end: 'bottom top',
        onEnter: () => ambient.play(), onEnterBack: () => ambient.play(),
        onLeave: () => ambient.pause(), onLeaveBack: () => ambient.pause()
      });
    }

    const fragments = gsap.utils.toArray('.noise-fragment');
    const noiseCard = document.querySelector('.noise-card');
    const seed = document.querySelector('.noise-seed');
    const sprout = document.querySelector('.noise-sprout');
    const ring = document.querySelector('.noise-ground-ring');
    gsap.set(seed, { autoAlpha: 0, scale: .3, y: -125, rotation: -26 });
    gsap.set(sprout, { autoAlpha: 0, scale: .12, transformOrigin: '50% 100%' });
    gsap.set(ring, { autoAlpha: 0, scale: .4 });
    gsap.set('.noise-world', { autoAlpha: 0, clipPath: 'circle(0% at 50% 72%)', scale: 1.13 });
    gsap.set('.noise-soil', { autoAlpha: .4, scaleX: .65 });
    const noiseToSeed = gsap.timeline({
      scrollTrigger: {
        trigger: '.noise-scene', start: mobile ? 'top 78%' : 'top top',
        end: mobile ? 'bottom 25%' : 'bottom bottom', scrub: mobile ? .38 : .7,
        onUpdate: self => growth.setGrowthStage(self.progress > .7 ? 2 : 1),
        onLeaveBack: () => growth.setGrowthStage(0)
      }, defaults: { ease: 'power2.out' }
    });
    noiseToSeed.fromTo(fragments,
      { autoAlpha: .48, x: i => (i % 2 ? -22 : 19), y: i => (i % 3 ? 14 : -16) },
      { autoAlpha: 1, x: 0, y: 0, duration: .22, stagger: .025 }, 0)
      .to(fragments, { autoAlpha: 0, x: i => (i % 2 ? -37 : 42), y: i => (i % 3 ? -29 : 37), scale: .72, duration: .23, stagger: .018 }, .27)
      .to('.noise-feed', { autoAlpha: 0, scale: .08, y: 115, rotation: -11, duration: .31, ease: 'power3.in' }, .39)
      .to(noiseCard, { autoAlpha: 0, scale: .1, y: 56, rotation: -8, duration: .29, ease: 'power3.in' }, .4)
      .to(seed, { autoAlpha: 1, scale: 1, y: -82, duration: .18 }, .51)
      .to(seed, { y: 0, rotation: 7, duration: .18, ease: 'power3.in' }, .66)
      .to('.noise-soil', { autoAlpha: 1, scaleX: 1, duration: .18 }, .76)
      .to(ring, { autoAlpha: .75, scale: 1, duration: .2 }, .77)
      .to('.noise-world', { autoAlpha: 1, clipPath: 'circle(135% at 50% 72%)', scale: 1, duration: .43, ease: 'power2.inOut' }, .76)
      .to('.noise-scene', { backgroundColor: '#f5f9ec', duration: .34 }, .77)
      .to('.noise-core', { backgroundColor: '#eaf5df', borderColor: '#b8d8ab', duration: .34 }, .77)
      .to('.noise-copy h2,.noise-copy>p:not(.section-kicker)', { color: '#25443b', duration: .31 }, .79)
      .to('.noise-copy h2 em,.noise-copy .section-kicker,.noise-caption', { color: '#24885d', duration: .31 }, .79)
      .to(seed, { autoAlpha: 0, scale: .48, y: 30, duration: .14 }, .84)
      .to(sprout, { autoAlpha: 1, scale: 1.28, duration: .38, ease: 'power3.out' }, .89)
      .to(ring, { autoAlpha: .3, scale: 1.4, duration: .31 }, .95);

    gsap.fromTo('.trail-growth', { strokeDashoffset: 1000 }, {
      strokeDashoffset: 0, ease: 'none', scrollTrigger: {
        trigger: main, start: 'top top', end: 'bottom bottom', scrub: .6
      }
    });
    stageStops.forEach(([selector, stage]) => ScrollTrigger.create({
      trigger: selector, start: 'top 65%',
      onEnter: () => growth.setGrowthStage(stage),
      onEnterBack: () => growth.setGrowthStage(stage),
      onLeaveBack: () => growth.setGrowthStage(stage - 1)
    }));

    document.querySelectorAll('.feature-card').forEach(card => {
      ScrollTrigger.create({
        trigger: card, start: 'top 83%', once: true,
        onEnter: () => card.classList.add('is-story-active')
      });
    });

    const stem = document.querySelector('.journey-stem>span');
    gsap.fromTo(stem, { scaleY: 0 }, {
      scaleY: 1, ease: 'none', scrollTrigger: {
        trigger: '.steps', start: 'top 72%', end: 'bottom 33%', scrub: .45
      }
    });
    gsap.fromTo('.journey-guide', { y: 0 }, {
      y: () => Math.max(0, document.querySelector('.steps').offsetHeight - (mobile ? 112 : 130)),
      ease: 'none', scrollTrigger: {
        trigger: '.steps', start: 'top 72%', end: 'bottom 33%', scrub: .45,
        invalidateOnRefresh: true
      }
    });
    document.querySelectorAll('.step').forEach(step => ScrollTrigger.create({
      trigger: step, start: 'top 73%', end: 'bottom 32%',
      onToggle: self => step.classList.toggle('is-current', self.isActive)
    }));

    ScrollTrigger.create({
      trigger: '.experience', start: 'top 72%', once: true,
      onEnter: () => document.querySelector('.experience')?.classList.add('is-story-active')
    });

    const finalTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: '.final-cta', start: mobile ? 'top 85%' : 'top 78%',
        end: mobile ? 'center 50%' : 'center 43%', scrub: .65
      }, defaults: { ease: 'power2.out' }
    });
    gsap.set('.final-art', { clipPath: 'circle(15% at 56% 67%)', scale: 1.06 });
    gsap.set('.final-seed', { autoAlpha: 0, y: -62, scale: .7 });
    gsap.set('.final-seed-ring', { autoAlpha: 0, scale: .5 });
    gsap.set('.final-sprout', { autoAlpha: 0, scaleY: .12, scaleX: .7 });
    finalTimeline.to('.final-seed', { autoAlpha: 1, y: 0, scale: 1, duration: .4 }, 0)
      .to('.final-seed-ring', { autoAlpha: .6, scale: 1.2, duration: .3 }, .37)
      .to('.final-seed', { autoAlpha: 0, y: 28, scale: .4, duration: .24 }, .55)
      .to('.final-seed-ring', { autoAlpha: 0, scale: 1.7, duration: .34 }, .62)
      .to('.final-sprout', { autoAlpha: 1, scaleY: 1, scaleX: 1, duration: .42, ease: 'power3.out' }, .67)
      .to('.final-art', { clipPath: 'circle(135% at 56% 67%)', scale: 1, duration: .82, ease: 'power2.inOut' }, .28);

    syncStageAtCurrentScroll();
  });

  // One refresh after fonts and the non-lazy hero artwork settle; ScrollTrigger handles later resizes.
  const fontReady = document.fonts?.ready || Promise.resolve();
  fontReady.then(() => {
    if (document.readyState === 'complete') ScrollTrigger.refresh();
    else window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }).catch(() => {});
})();
