/**
 * Home — live cards and real numbers from the shared journey state, plus the
 * scroll-driven "how it works" journey that Bimo walks along.
 */
(() => {
  const DS = window.DeepSprout;
  const Art = window.GardenArt;
  const $ = id => document.getElementById(id);
  const reducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const readStored = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const STAGES = [['Seed', 0], ['Sprout', 1], ['Sapling', 2], ['Tree', 4], ['Blossom', 6]];
  const stageFor = count => STAGES.reduce((stage, [, from], index) => (count >= from ? index : stage), 0);
  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

  /* ---------------------------------------------------------- the spaces */

  function renderSpaces(stats) {
    if (stats.hasPlan) {
      $('space-roadmap-title').textContent = `Week ${stats.week} · ${stats.weekTitle}`;
      $('space-roadmap-note').textContent = `Day ${stats.day} of ${stats.cycleLength}. ${stats.daysToReview === 0
        ? 'Your weekly review is due today.'
        : `Next review in ${plural(stats.daysToReview, 'day')}.`}`;
      document.querySelectorAll('.mini-node').forEach(node => {
        const index = Number(node.dataset.node);
        node.classList.toggle('is-done', index < stats.week - 1);
        node.classList.toggle('is-current', index === stats.week - 1);
      });
    } else {
      document.querySelector('.mini-node[data-node="0"]').classList.add('is-current');
    }

    const next = DS.nextAction('');
    const today = $('space-today');
    today.href = next.href;
    $('space-today-title').textContent = next.label;
    $('space-today-note').textContent = next.why;
    today.classList.toggle('is-done', /done|by design/.test(next.why));

    const apps = readStored('deepsprout-shield-apps', null);
    const time = readStored('deepsprout-shield-time', null);
    if (Array.isArray(apps) && apps.length) {
      $('space-shield-title').textContent = `${plural(apps.length, 'app')} in your focus basket`;
      $('space-shield-note').textContent = typeof time === 'string'
        ? `Focus time planned from ${new Date(`2000-01-01T${time}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
        : 'Plan when to put them away.';
    }

    const count = stats.hasPlan ? stats.perWeek[stats.week - 1].practices + stats.perWeek[stats.week - 1].routine
      : stats.totalPractices + stats.totalRoutineDays;
    const stage = stageFor(count);
    $('space-garden-title').textContent = count ? `${STAGES[stage][0]} · ${plural(count, 'thing')} logged` : 'A seed, ready to grow';
    $('space-garden-note').textContent = stage < 4
      ? `${STAGES[stage + 1][1] - count} more to reach ${STAGES[stage + 1][0].toLowerCase()}.`
      : 'In full blossom this week.';
    if (Art) $('mini-garden').innerHTML = `${Art.defs}${Art.tile(250, 250, 2)}<g class="mini-plant" style="transform-origin:250px 254px">${Art.plant(stage, 250, 254, 2)}</g>`;
  }

  /* ------------------------------------------------------------ your week */

  function renderWeek(stats) {
    const state = DS.get();
    $('week-grid').hidden = !stats.hasPlan;
    $('week-empty').hidden = stats.hasPlan;
    if (!stats.hasPlan) {
      const steps = {
        setup: state.onboarding.setupDone,
        lab: DS.assessmentsComplete(),
        plan: state.onboarding.planActivated
      };
      document.querySelectorAll('.start-steps [data-step]').forEach(item => item.classList.toggle('is-done', steps[item.dataset.step]));
      $('start-lab-note').textContent = stats.baselinesDone
        ? `${stats.baselinesDone} of ${stats.baselinesTotal} done — attention, response control, reading depth, habits.`
        : 'Attention, response control, reading depth, habits.';
      const next = DS.nextAction('');
      $('start-cta').href = next.href;
      $('start-cta').innerHTML = `${next.label} <span aria-hidden="true">→</span>`;
      $('week-sub').textContent = 'Three steps before your plan begins. Your numbers appear here once it does.';
      return;
    }
    const chip = $('goal-chip');
    chip.textContent = `Goal · ${stats.goalLabel}`;
    chip.hidden = false;
    $('ws-day').textContent = `Day ${stats.day}`;
    $('ws-day-note').textContent = `of ${stats.cycleLength} · week ${stats.week}`;
    const ring = $('ws-day-ring');
    const length = 2 * Math.PI * 18;
    ring.style.strokeDasharray = `${length}`;
    ring.style.strokeDashoffset = `${length * (1 - stats.day / stats.cycleLength)}`;
    $('ws-practices').textContent = stats.practicesThisWeek;
    $('ws-practices-note').textContent = stats.scheduledThisWeek !== null
      ? `of ${stats.scheduledThisWeek} planned practices this week`
      : 'practices logged this week';
    $('ws-routine').textContent = stats.routineThisWeek;
    const due = DS.reviewDue() || stats.daysToReview === 0;
    $('ws-review').textContent = due ? 'Today' : plural(stats.daysToReview, 'day');
    $('ws-review-note').textContent = due ? 'your weekly review is due' : 'until your weekly review';
  }

  /* -------------------------------------------------------------- closing */

  function renderClosing() {
    const cta = $('closing-cta');
    if (!cta) return;
    const next = DS.nextAction('');
    cta.href = next.href;
    cta.innerHTML = `${next.label} <span aria-hidden="true">→</span>`;
  }

  const render = () => {
    if (!DS) return;
    const stats = DS.stats();
    renderSpaces(stats);
    renderWeek(stats);
    renderClosing();
  };
  render();
  window.addEventListener('storage', render);

  /* --------------------------------------------------- reveal on scroll */

  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold: .15 });
    document.querySelectorAll('.space-card, .week-section, .outside-section, .event-card, .story-card').forEach((node, index) => {
      node.classList.add('reveal-up');
      node.style.setProperty('--reveal-delay', `${(index % 4) * 90}ms`);
      observer.observe(node);
    });
  }

  /* ------------------------------------------------------------ the journey */

  const track = document.querySelector('.journey-track');
  const route = $('journey-route');
  if (!track || !route || typeof route.getTotalLength !== 'function') return;
  const world = document.querySelector('.journey-world');
  const walked = document.querySelector('.jp-walked');
  const bimo = $('journey-bimo');
  const stops = [...document.querySelectorAll('.stop')];
  const cards = [...document.querySelectorAll('.stop-card')];
  const VIEW = { w: 1200, h: 420 };
  let length = 0;
  try { length = route.getTotalLength(); } catch { length = 0; }
  if (!length) return;

  if (Art) {
    $('journey-garden').innerHTML = `${Art.defs}${Art.tile(450, 250, 4)}${Art.flowerBed(450, 250, 4)}<g class="journey-tree" style="transform-origin:450px 254px">${Art.plant(4, 450, 254, 4)}</g>`;
  }

  // Place each stop on the route itself, at its share of the path's length.
  stops.forEach(stop => {
    const point = route.getPointAtLength(Number(stop.dataset.at) * length);
    stop.style.setProperty('--x', `${(point.x / VIEW.w) * 100}%`);
    stop.style.setProperty('--y', `${(point.y / VIEW.h) * 100}%`);
  });
  walked.style.strokeDasharray = `${length}`;

  const staticLayout = () => reducedMotion || window.innerWidth <= 760;
  let walking;
  let frame = 0;
  let lastProgress = -1;

  function update() {
    frame = 0;
    if (staticLayout()) {
      world.classList.add('is-static');
      [...stops, ...cards].forEach(node => node.classList.add('is-reached'));
      walked.style.strokeDashoffset = '0';
      return;
    }
    world.classList.remove('is-static');
    const rect = track.getBoundingClientRect();
    const travel = Math.max(1, track.offsetHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -rect.top / travel));
    walked.style.strokeDashoffset = `${length * (1 - progress)}`;
    const point = route.getPointAtLength(progress * length);
    bimo.style.left = `${(point.x / VIEW.w) * 100}%`;
    bimo.style.top = `${(point.y / VIEW.h) * 100}%`;
    stops.forEach((stop, index) => {
      const reached = progress >= Number(stop.dataset.at) - .025;
      stop.classList.toggle('is-reached', reached);
      cards[index]?.classList.toggle('is-reached', reached);
    });
    if (progress !== lastProgress) {
      bimo.classList.add('is-walking');
      bimo.classList.toggle('is-back', progress < lastProgress);
      clearTimeout(walking);
      walking = setTimeout(() => bimo.classList.remove('is-walking'), 180);
      lastProgress = progress;
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
})();
