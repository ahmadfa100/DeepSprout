/* The scene owns its own time; native scrolling is never intercepted.
   Scroll reveals the story. Stillness changes its direction. */
(() => {
  const section = document.querySelector('.attention-story');
  const stage = section?.querySelector('.story-stage');
  if (!stage || !window.DeepSproutLoop || !window.gsap || !window.ScrollTrigger) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const CONFIG = Object.freeze({
    speedReference:1800, speedSmoothing:5, calmThreshold:.032,
    stillnessSeconds:1.3, settleSeconds:2.1, releaseSeconds:2,
    invitationStart:.48, fallbackStart:.75, resetBefore:.12,
    maxDelta:.05
  });
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const range = (v, a, b) => smooth((v - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = selector => stage.querySelector(selector);
  const ui = {
    hero:$('.hero-content'), art:$('.hero-art'), wash:$('.hero-wash'), thought:$('.story-thought'),
    pause:$('.pause-invitation'), pauseSecond:$('.pause-invitation small'), ring:$('.stillness-orbit circle'),
    wave:$('.focus-wave'), seed:$('.attention-seed'), seedMessage:$('.seed-message'), soil:$('.story-soil'),
    root:$('.opening-root'), rootPath:$('.opening-root path'), underground:$('.underground-caption'),
    warmth:$('.story-warmth'), number:$('.chapter-number'), name:$('.chapter-name'),
    progress:$('.story-progress>span'), hint:$('.story-scroll-hint'), toggle:$('.motion-toggle')
  };
  const debug = new URLSearchParams(location.search).has('storyDebug');
  let userPaused = false;
  let currentController = null;
  const media = gsap.matchMedia();
  media.add({ desktop:'(min-width:768px)', mobile:'(max-width:767px)', reduced:'(prefers-reduced-motion:reduce)' }, context => {
    const { mobile, reduced } = context.conditions;
    if (reduced) { document.documentElement.classList.remove('story-enabled'); return; }
    document.documentElement.classList.add('story-enabled');
    const loop = new window.DeepSproutLoop(stage, mobile, (mobile || innerWidth < 1024) || (navigator.hardwareConcurrency || 8) <= 4);
    let progress = 0, speed = 0, phase = 0, stillFor = 0, calmTime = -1, elapsed = 0;
    let inView = true, lastTime = 0, raf = 0, lastScene = '', invitationTime = 0;
    let lastScrollY = window.scrollY, lastScrollTime = performance.now(), sampledVelocity = 0;
    const entrance = gsap.fromTo('.hero-eyebrow,.hero h1,.hero-lead,.hero-actions,.hero-notes',
      { opacity:0 }, { opacity:1, duration:1, stagger:.1, ease:'sine.out' });
    const alpha = (el, value) => { el.style.opacity = clamp(value); };
    const setScene = (state, number, name) => {
      if (lastScene === state) return;
      lastScene = state;
      stage.dataset.scene = state;
      ui.number.textContent = number;
      ui.name.textContent = name;
    };
    const startCalm = () => { if (calmTime < 0) { calmTime = 0; window.DeepSproutGrowth?.setGrowthStage(1); } };
    const reset = () => { calmTime = -1; stillFor = 0; invitationTime = 0; };
    const draw = dt => {
      elapsed += dt;
      const stale = (performance.now() - lastScrollTime) / 1000;
      const velocity = Math.abs(sampledVelocity) * Math.exp(-stale * 12);
      const targetSpeed = clamp(velocity / CONFIG.speedReference);
      speed += (targetSpeed - speed) * (1 - Math.exp(-CONFIG.speedSmoothing * dt));
      if (progress < CONFIG.resetBefore && calmTime >= 0) reset();
      const invited = progress >= CONFIG.invitationStart && progress < .86;
      if (invited) invitationTime += dt; else invitationTime = 0;
      if (calmTime < 0 && invited) {
        stillFor = speed < CONFIG.calmThreshold ? stillFor + dt : 0;
        if (stillFor >= CONFIG.stillnessSeconds) startCalm();
      }
      if (progress >= CONFIG.fallbackStart) startCalm();
      if (calmTime >= 0) calmTime += dt;
      // The spatial fallback means fast scrolling / restored scroll positions never strand a scene.
      const fallback = range(progress, .76, .94);
      const calm = Math.max(calmTime < 0 ? 0 : range(calmTime, 0, CONFIG.settleSeconds), fallback);
      const release = Math.max(calmTime < 0 ? 0 : range(calmTime, CONFIG.settleSeconds, CONFIG.settleSeconds + CONFIG.releaseSeconds), fallback);
      const descent = range(progress, .84, 1);
      phase += dt * (.17 + speed * 1.65) * (1 - calm * .98);
      const opening = range(progress, .1, .29);
      alpha(ui.hero, 1 - opening);
      ui.hero.inert = opening > .95;
      ui.hero.style.visibility = opening > .999 ? 'hidden' : 'visible';
      alpha(ui.thought, range(progress, .2, .32) * (1 - range(progress, .48, .56)) * (1 - calm));
      alpha(ui.pause, range(progress, .48, .56) * (1 - range(release, 0, .25)) * (1 - descent));
      alpha(ui.pauseSecond, range(invitationTime, .35, 1));
      ui.pause.querySelector('p').textContent = calm > .1 ? 'There you are.' : 'Don’t scroll.';
      ui.pauseSecond.textContent = calm > .1 ? 'A little stillness changes everything.' : 'Just for a moment.';
      ui.ring.style.strokeDashoffset = 1 - (calm > 0 ? 1 : clamp(stillFor / CONFIG.stillnessSeconds));
      const wave = range(calmTime, 1.6, 3.3);
      alpha(ui.wave, Math.sin(wave * Math.PI) * .65 * (1 - descent));
      ui.wave.style.transform = `scale(${.15 + wave * 6}) rotate(${wave * 18}deg)`;
      const seedVisible = range(release, .18, .65);
      alpha(ui.seed, seedVisible);
      const seedX = loop.width * .5;
      const seedY = loop.height * .47;
      // Ground rises past the seed: a camera follow, rather than a cut to another section.
      ui.seed.style.transform = `translate3d(${seedX-11}px,${seedY-16 + Math.sin(elapsed * 1.2) * 2 * (1-descent)}px,0) rotate(${lerp(-32, 14, descent)}deg) scale(${lerp(1.4, .85, descent)})`;
      alpha(ui.seedMessage, range(release, .45, .9) * (1 - range(descent, 0, .35)));
      ui.soil.style.transform = `translateY(${112 * (1 - descent)}%)`;
      alpha(ui.underground, range(descent, .55, 1));
      alpha(ui.root, range(descent, .55, .8));
      ui.rootPath.style.strokeDashoffset = 1 - range(descent, .62, 1);
      const breeze = Math.sin(elapsed * .6) * (1.7 + speed * 2.2) * (1 - calm * .6);
      ui.art.style.transform = `translate3d(0,${breeze - descent * loop.height * .72}px,0) scale(${1 + opening * .018})`;
      alpha(ui.warmth, .15 + calm * .48);
      ui.progress.style.transform = `scaleX(${progress})`;
      if (descent > .7) setScene('ROOT', '07', 'LET IT TAKE ROOT');
      else if (descent > .02) setScene('DESCENT', '06', 'A SMALL BEGINNING');
      else if (release > .5) setScene('SEED', '05', 'ATTENTION, RECLAIMED');
      else if (calm > .01) setScene('CALM', '04', 'ROOM TO BREATHE');
      else if (progress >= .48) setScene('LOOP', '03', 'THE ENDLESS FEED');
      else if (progress >= .29) setScene('OVERLOADED', '02', 'ONE MORE. AND ONE MORE.');
      else if (progress >= .12) setScene('DISTRACTED', '02', 'THE WORLD GETS LOUDER');
      else setScene('SERENE', '01', 'A QUIETER MORNING');
      const hint = release > .5 ? 'FOLLOW THE SEED' : 'SCROLL GENTLY';
      if (ui.hint.firstChild.textContent.trim() !== hint) ui.hint.firstChild.textContent = `${hint} `;
      loop.render({ progress, phase, speed, calm, release, descent, time:elapsed });
      if (debug) stage.dataset.debug = JSON.stringify({ progress:+progress.toFixed(3), speed:+speed.toFixed(3), stillFor:+stillFor.toFixed(2), calm:+calm.toFixed(2), release:+release.toFixed(2) });
    };
    const tick = now => {
      raf = 0;
      if (document.hidden || !inView || userPaused) return;
      // Quiet scenes and small screens need only 30 visual updates per second.
      if (lastTime && (mobile || progress < .1 || calmTime > 4.1) && now - lastTime < 1000 / 30) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = lastTime ? Math.min(CONFIG.maxDelta, (now - lastTime) / 1000) : 0;
      lastTime = now;
      draw(dt);
      raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf && !document.hidden && inView && !userPaused) { lastTime = 0; raf = requestAnimationFrame(tick); }
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; lastTime = 0; };
    const syncVisibility = () => {
      document.documentElement.classList.toggle('story-offscreen', !inView || document.hidden);
      if (document.hidden || !inView) stop(); else wake();
    };
    const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; syncVisibility(); }, { threshold:0 });
    observer.observe(section);
    const onScroll = () => {
      const now = performance.now();
      const delta = window.scrollY - lastScrollY;
      if (Math.abs(delta) > .3) {
        sampledVelocity = delta / Math.max(.016, (now - lastScrollTime) / 1000);
        lastScrollTime = now;
        lastScrollY = window.scrollY;
      }
    };
    window.addEventListener('scroll', onScroll, { passive:true });
    document.addEventListener('visibilitychange', syncVisibility);
    const trigger = ScrollTrigger.create({
      trigger:section, start:() => `top ${mobile ? 68 : innerWidth <= 1150 ? 68 : 76}px`,
      end:'bottom bottom', onUpdate:self => { progress = self.progress; if (userPaused) draw(0); else wake(); },
      onRefresh:self => { loop.resize(); progress = self.progress; draw(0); }, invalidateOnRefresh:true
    });
    currentController = { pause() { stop(); entrance.pause(); }, resume() { entrance.resume(); wake(); } };
    draw(0); wake();

    const rootSelector = mobile ? '.root-mobile-network' : '.root-network';
    const branches = [...document.querySelectorAll(`${rootSelector} path`)];
    gsap.set(branches, { strokeDasharray:1, strokeDashoffset:1 });
    gsap.to('.root-trunk', { strokeDashoffset:0, ease:'none', scrollTrigger:{ trigger:'.root-world', start:'top 80%', end:'bottom 80%', scrub:.5 } });
    document.querySelectorAll('.feature-card').forEach((card, i) => {
      const branch = branches[i + 1];
      ScrollTrigger.create({ trigger:card, start:'top 85%', once:true, onEnter:() => {
        if (branch) gsap.to(branch, { strokeDashoffset:0, duration:1, ease:'sine.inOut', onComplete:() => card.classList.add('is-rooted') });
        else card.classList.add('is-rooted');
      } });
    });
    gsap.fromTo('.path-open', { strokeDasharray:1, strokeDashoffset:1 }, { strokeDashoffset:0, duration:1.8, ease:'sine.inOut', scrollTrigger:{ trigger:'.how', start:'top 65%', once:true } });
    gsap.fromTo('.journey-stem>span', { scaleY:0 }, { scaleY:1, ease:'none', scrollTrigger:{ trigger:'.steps', start:'top 70%', end:'bottom 60%', scrub:.5 } });
    document.querySelectorAll('.step').forEach(step => ScrollTrigger.create({ trigger:step, start:'top 72%', end:'bottom 40%', toggleClass:'is-current' }));
    return () => {
      stop(); trigger.kill(); entrance.kill(); observer.disconnect(); loop.destroy();
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('scroll', onScroll);
      document.documentElement.classList.remove('story-enabled', 'story-offscreen');
      gsap.killTweensOf(branches);
      Object.values(ui).forEach(el => el?.removeAttribute('style'));
      ui.hero.inert = false;
      document.querySelectorAll('.feature-card').forEach(card => card.classList.add('is-rooted'));
      currentController = null;
    };
  });
  ui.toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    ui.toggle.setAttribute('aria-pressed', String(userPaused));
    ui.toggle.innerHTML = userPaused ? 'Resume motion <span aria-hidden="true">▷</span>' : 'Pause motion <span aria-hidden="true">Ⅱ</span>';
    document.documentElement.classList.toggle('story-paused', userPaused);
    if (userPaused) currentController?.pause(); else currentController?.resume();

  });
  window.addEventListener('pagehide', () => currentController?.pause());
  window.addEventListener('pageshow', () => { if (!userPaused) currentController?.resume(); });
  (document.fonts?.ready || Promise.resolve()).then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once:true });
})();
