/**
 * Home — live cards and real numbers from the shared journey state, plus the
 * scroll-driven "how it works" journey that Bimo walks along.
 */
(() => {
  const Account = window.DeepSproutAccount;
  const Art = window.GardenArt;
  const $ = id => document.getElementById(id);
  const reducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const STATE_LABELS = { completed: 'Completed', missed: 'Missed', rest: 'Planned rest day', 'not-due': 'Not due yet', none: 'Nothing scheduled' };

  /* ---------------------------------------------------------- the spaces */

  function renderSpaces(account) {
    const fmt = Account.format;
    const plan = account.plan();
    const reviews = account.reviews();
    if (plan) {
      const week = plan.direction[plan.week - 1];
      $('space-roadmap-title').textContent = `Week ${plan.week} · ${week.title}`;
      const toReview = reviews.nextDue ? Account.daysBetween(account.today, reviews.nextDue) : null;
      $('space-roadmap-note').textContent = `Day ${plan.day} of ${plan.lengthDays}.${toReview === null ? '' : ` Weekly review ${fmt.relativeDays(toReview)}.`}`;
      document.querySelectorAll('.mini-node').forEach(node => {
        const index = Number(node.dataset.node);
        node.classList.toggle('is-done', index < plan.week - 1);
        node.classList.toggle('is-current', index === plan.week - 1);
      });
    } else {
      document.querySelector('.mini-node[data-node="0"]')?.classList.add('is-current');
    }

    const step = account.nextSteps('')[0];
    const today = $('space-today');
    if (step) {
      today.href = step.href;
      $('space-today-title').textContent = step.action;
      $('space-today-note').textContent = step.title;
    }

    const usage = account.usage(7);
    if (usage.connected) {
      $('space-shield-title').textContent = `${plural(usage.sites.length, 'site')} · ${usage.limit}-minute limit`;
      $('space-shield-note').textContent = usage.overLimitDays
        ? `Passed it on ${plural(usage.overLimitDays, 'day')} in the last 7. Measured by the extension.`
        : 'Within your limit every measured day in the last 7.';
    } else {
      $('space-shield-title').textContent = 'Not connected yet';
      $('space-shield-note').textContent = 'Connect the Chrome extension to measure the sites you choose.';
    }

    // The same model and policy as My Garden: four small practice-type trees,
    // grown from the journal's valid practices and Coach-approved tasks.
    const paintGarden = () => {
      const journal = account.practiceGarden();
      const policy = journal.policy;
      const repo = window.DeepSproutRepo, me = repo?.me();
      const shared = repo && me ? repo.selectors.personalGardenEffects(repo.read(), me.id) : [];
      const trees = journal.types.map(type => {
        const n = type.sources.length + shared.filter(e => e.effect === 'tree' && e.type === type.id).length;
        return { title: type.title, n, stage: policy.treeSteps.filter(step => n >= step).length };
      });
      const records = trees.reduce((sum, tree) => sum + tree.n, 0);
      const growing = trees.filter(tree => tree.stage > 0).length;
      $('space-garden-title').textContent = records ? `${growing} of 4 trees growing · ${plural(records, 'qualifying record')}` : 'Four places, ready to grow';
      $('space-garden-note').textContent = trees.map(tree => `${tree.title.split(' ')[0]}: ${policy.stageNames[tree.stage].toLowerCase()}`).join(' · ');
      const spots = [[250, 228], [305, 254], [195, 254], [250, 280]];
      if (Art) $('mini-garden').innerHTML = `${Art.defs}${Art.tile(250, 250, 2)}${trees.map((tree, index) => {
        const [x, y] = spots[index];
        return `<g class="mini-plant" transform="translate(${x} ${y}) scale(.42) translate(${-x} ${-y})">${Art.plant(tree.stage, x, y, index + 2)}</g>`;
      }).join('')}`;
    };
    paintGarden();
    window.addEventListener('deepsprout:repo-ready', paintGarden, { once: true });
  }

  /* ------------------------------------------------------------ your week */

  const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';

  function renderWeek(account) {
    const fmt = Account.format;
    const plan = account.plan();
    const section = document.querySelector('.week-section');
    section.setAttribute('aria-busy', 'false');
    $('week-active').hidden = !plan;
    $('week-empty').hidden = Boolean(plan);

    if (!plan) {
      // The genuine empty state: three steps, each showing its real status.
      const profile = account.profile();
      const done = {
        setup: Boolean(profile.goal),
        checkin: account.checkInWindow().baselineDone,
        plan: false
      };
      const steps = [
        ['setup', 'Answer a few setup questions', 'Your goal, your hardest times, the days you have.', 'src/pages/member/onboarding/onboarding.html'],
        ['checkin', `Take your starting ${Account.NAMES.checkIn.toLowerCase()}`, 'Four short tasks: habits, attention, response control, reading depth.', 'src/pages/member/lab/lab.html'],
        ['plan', 'Activate your four-week plan', 'Built from your answers and your starting point.', 'src/pages/member/onboarding/starting-point.html']
      ];
      const current = steps.find(([id]) => !done[id]);
      $('start-steps').innerHTML = steps.map(([id, title, note], index) => {
        const state = done[id] ? 'is-done' : id === current?.[0] ? 'is-current' : '';
        const tag = done[id] ? 'Done' : state ? 'Start here' : 'Then';
        return `<li class="${state}"><span>${done[id] ? check : index + 1}</span><strong>${esc(title)}</strong><small>${esc(note)}</small><em>${tag}</em></li>`;
      }).join('');
      const cta = $('start-cta');
      if (current) {
        cta.href = current[3];
        cta.innerHTML = `${current[0] === 'setup' ? 'Start your journey' : esc(current[1])} <span aria-hidden="true">→</span>`;
      }
      $('week-eyebrow').textContent = 'Getting started';
      $('week-heading').textContent = 'Three steps before your plan begins';
      $('week-sub').textContent = 'Your week appears here once your plan is active. Nothing is estimated before then.';
      $('goal-chip').hidden = true;
      return;
    }

    const goal = account.profile().goal;
    const days = account.schedule();
    const adherence = account.adherence();
    const routine = account.routine();
    const reviews = account.reviews();
    const week = plan.direction[plan.week - 1];
    $('week-eyebrow').textContent = `Week ${plan.week} of ${plan.weeks} · day ${plan.day}`;
    $('week-heading').textContent = 'Your week so far';
    $('week-sub').textContent = `${week.title} · ${fmt.date(days[0].date)} – ${fmt.date(days[6].date)}`;
    const chip = $('goal-chip');
    chip.textContent = goal.label;
    chip.hidden = false;

    // One primary thing: the next action, with its reason.
    const step = account.nextSteps('')[0];
    const today = days.find(day => day.isToday);
    const todayLine = today?.action?.kind === 'practice'
      ? `<p class="week-today">${today.state === 'completed' ? `<i>${check}</i>` : ''}<span>Today · <b>${esc(today.action.type?.title)}</b> — ${today.state === 'completed' ? 'done' : 'not done yet'}</span></p>`
      : today ? `<p class="week-today"><span>Today · <b>${esc(STATE_LABELS[today.state])}</b></span></p>` : '';
    $('week-next').innerHTML = step
      ? `<p class="week-next-kicker">Next for you</p><h3 id="week-next-title">${esc(step.title)}</h3><p>${esc(step.reason)}</p><a class="week-cta" href="${step.href}">${esc(step.action)} <span aria-hidden="true">→</span></a>${todayLine}`
      : `<p class="week-next-kicker">Next for you</p><h3 id="week-next-title">You’re up to date</h3><p>Nothing needs your attention right now.</p>${todayLine}`;

    $('week-days').innerHTML = days.map((day, index) => {
      const what = !day.action ? 'Nothing scheduled' : day.action.kind === 'rest' ? 'Rest day' : day.action.kind === 'review' ? 'Review' : day.action.type?.skill || 'Practice';
      return `<li class="week-day${day.isToday ? ' is-today' : ''}"><span class="week-day-mark" data-state="${day.state}" style="--i:${index}" role="img" aria-label="${esc(`${fmt.date(day.date, { weekday: true })} · ${what} · ${STATE_LABELS[day.state]}${day.isToday ? ' · today' : ''}`)}"></span><b>${fmt.weekday(day.date)} ${day.date.getDate()}</b><small>${esc(what)}</small></li>`;
    }).join('');

    const reviewFact = reviews.nextDue
      ? { value: fmt.relativeDays(Account.daysBetween(account.today, reviews.nextDue)).replace(/^./, c => c.toUpperCase()), label: `weekly review · ${fmt.date(reviews.nextDue, { weekday: true })}` }
      : { value: `${reviews.completed} of ${reviews.expected}`, label: 'weekly reviews done' };
    $('week-facts').innerHTML = `
      <li><a class="week-fact" href="src/pages/member/recovery-plan/recovery-plan.html#week"><strong>${adherence.completed} of ${adherence.due}</strong><span>due practices done</span><em>${adherence.provenance.label}</em></a></li>
      <li><a class="week-fact" href="src/pages/member/training/training.html#offline-routine"><strong>${routine.week ? `${routine.week.done} of ${routine.week.scheduled}` : '—'}</strong><span>${routine.primary ? `days · ${esc(routine.primary.title)}` : routine.week?.done ? 'days · no routine scheduled now' : 'no routine yet'}</span><em class="is-self">${routine.provenance.label}</em></a></li>
      <li><a class="week-fact" href="src/pages/member/weekly-review/weekly-review.html"><strong>${esc(reviewFact.value)}</strong><span>${esc(reviewFact.label)}</span></a></li>`;
  }

  /* -------------------------------------------------------------- closing */

  function renderClosing(account) {
    const cta = $('closing-cta');
    const step = account.nextSteps('')[0];
    if (!cta || !step) return;
    cta.href = step.href;
    cta.innerHTML = `${esc(step.action)} <span aria-hidden="true">→</span>`;
  }

  if (Account) {
    Account.load().then(account => {
      const render = () => { renderSpaces(account); renderWeek(account); renderClosing(account); };
      render();
      window.addEventListener('deepsprout:account', render);
    }).catch(() => {
      document.querySelector('.week-section')?.setAttribute('aria-busy', 'false');
      $('week-sub').textContent = 'Your week couldn’t be loaded, so nothing is shown rather than zeros.';
    });
  }

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
