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

  const paintOutdoorActivities=()=>{
    const r=window.DeepSproutRepo,host=$('provider-outdoors-list');if(!r||!host)return;
    const items=r.selectors.exploreOutdoorActivities(r.read(),r.me()?.id).slice(0,3);$('provider-outdoors').hidden=!items.length;
    host.innerHTML=items.map(e=>`<a class="event-card" data-experience-id="${esc(e.id)}" href="${r.selectors.activityBookingLink(e.id)}"><img class="event-image" src="${esc(e.image)}" alt=""><div class="event-body"><span class="event-kind">${esc(e.kindLabel||e.type)}</span><strong>${esc(e.title)}</strong><p>Organized by ${esc(e.organizer)} · ${esc(e.city)} · ${esc(e.start)}</p><span>${e.canBook?`${e.remaining} places available`:'Booking unavailable'}</span></div></a>`).join('');
  };
  window.addEventListener('deepsprout:repo-ready',paintOutdoorActivities);window.addEventListener('deepsprout:repo',paintOutdoorActivities);paintOutdoorActivities();

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

    const usage = account.browserUsage(7);
    if (usage.available) {
      $('space-shield-title').textContent = `${plural(usage.sites.length, 'site')} · ${(usage.totalSeconds/60).toFixed(2)} observed minutes`;
      $('space-shield-note').textContent = 'Browser-observed local records · partial coverage over the last 7 device-calendar days. Open Shield to verify current connection.';
    } else {
      $('space-shield-title').textContent = 'No browser usage data available.';
      $('space-shield-note').textContent = 'Connect the optional extension and choose sites to observe. Missing time is unknown.';
    }

    // The same model and policy as My Garden: four small practice-type trees,
    // grown from the journal's valid practices and Coach-approved tasks.
    const paintGarden = () => {
      const journal = account.practiceGarden();
      const policy = journal.policy;
      const repo = window.DeepSproutRepo, me = repo?.me();
      const shared = repo && me && repo.selectors.hasPersonalGarden(repo.read(), me.id) ? repo.selectors.personalGardenEffects(repo.read(), me.id) : [];  // Invited Students: Group Garden only until upgrade (D12).
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

  /* ------------------------------------------- Journey Level 1 (Onboarding 2.0) */

  // A motivational starting point after the six questions: a preliminary Week 1 proposal built only
  // from the person's own answers. No usage data, scores or percentages are invented; nothing is active.
  const SETUP_LABELS = {
    apps: { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube / Shorts', facebook: 'Facebook', x: 'X', snapchat: 'Snapchat', other: 'other apps' },
    scroll: { 'under-60': 'less than 1 hour', '60-120': '1–2 hours', '120-240': '2–4 hours', 'over-240': 'more than 4 hours', 'under-30': 'under 30 minutes', '30-60': '30–60 minutes', '120-180': '2–3 hours', 'over-180': 'more than 3 hours' },
    moments: { 'before-bed': 'before bed', morning: 'in the morning', 'study-work': 'during study or work', bored: 'when boredom hits', 'late-night': 'late at night', evening: 'in the evening', afternoon: 'in the afternoon' }
  };
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SHORT_ACTIVITY = { 'walking-sports': 'Walk or move', 'reading-learning': 'Read or learn', 'drawing-creativity': 'Draw or make', 'friends-family': 'Time together', hobbies: 'Hobby time', other: 'Offline time' };

  function renderLevelZero(account) {
    const profile = account.profile();
    const setup = profile.setup || {};
    const draft = account.preview() || {};
    const minutes = Number(setup.dailyMinutes) || Number(draft.commitment?.durationMinutes) || Number(draft.minutes) || 10;
    const activity = draft.commitment?.title || `${minutes} minutes of something offline`;
    const practices = Math.min(5, Math.max(2, Number(draft.days) || 3));
    const slots = Array.from({ length: practices }, (_, i) => Math.round(i * 6 / practices));
    const start = account.today || new Date();
    // The days rotate through the activities the person said they would love more time for.
    const chosen = (setup.makeTimeFor || []).map(key => SHORT_ACTIVITY[key]).filter(Boolean);
    const rotation = chosen.length ? chosen : ['Offline time'];
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(start); date.setDate(date.getDate() + offset);
      const practice = slots.includes(offset) && offset !== 6;
      return `<li class="${offset === 0 ? 'is-first' : ''}"><b>${offset === 0 ? 'Day 1' : WEEKDAYS[date.getDay()]}</b><span>${esc(rotation[offset % rotation.length])}</span><small>${minutes} min, offline</small><small>${offset === 6 ? '+ short weekly review' : practice ? `+ ${Math.min(15, minutes)}-min practice` : 'Nothing else'}</small></li>`;
    }).join('');
    const apps = (setup.distracting || []).map(key => SETUP_LABELS.apps[key] || key);
    const moment = SETUP_LABELS.moments[setup.peakTime];
    const scroll = SETUP_LABELS.scroll[setup.baselineMinutes];
    const reasons = [
      `<li><strong>Your goal</strong>${esc(profile.goal?.label || '')}</li>`,
      moment ? `<li><strong>Your tricky moment</strong>Scrolling takes over ${esc(moment)}. Week 1 keeps one small offline thing ready for that time.</li>` : '',
      apps.length ? `<li><strong>Apps you named</strong>${esc(apps.join(', '))}. Digital Shield can help in a supported desktop browser; it cannot block phone apps.</li>` : '',
      scroll ? `<li><strong>Your estimate</strong>About ${esc(scroll)} of scrolling a day — self-reported, not measured.</li>` : ''
    ].join('');
    $('week-eyebrow').textContent = 'Journey Level 1 · New Beginning';
    $('week-heading').textContent = 'Your first week, ready when you are';
    $('week-sub').textContent = 'A gentle Week 1 proposal built from your six answers. Nothing has started yet.';
    const chip = $('goal-chip');
    chip.textContent = profile.goal?.label || '';
    chip.hidden = !profile.goal;
    $('week-active').hidden = true;
    const host = $('week-empty');
    host.hidden = false;
    host.classList.add('is-level-zero');
    host.innerHTML = `<div class="level0">
      <div class="level0-main">
        <div class="level0-head"><span class="level0-badge" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M20 34V21"/><path d="M20 23c-8 0-12-5-12-12 8 0 12 5 12 12Z"/><path d="M20 20c0-7 5-11 12-11 0 7-5 11-12 11Z"/></svg></span>
          <div><h3 id="level0-title">Week 1 proposal</h3><p>${minutes} minutes a day for ${esc(rotation.map(a => a.toLowerCase()).join(', '))}, starting with <b>${esc(activity.charAt(0).toLowerCase() + activity.slice(1))}</b>. Plus ${practices} short practices across the week.</p></div></div>
        <ol class="level0-days" aria-labelledby="level0-title">${days}</ol>
        <div class="level0-actions"><a class="week-cta" href="src/pages/member/onboarding/starting-point.html">Review &amp; activate Week 1 <span aria-hidden="true">→</span></a><a class="level0-link" href="src/pages/member/onboarding/onboarding.html?step=setup">Change my answers</a></div>
      </div>
      <aside class="level0-side" aria-label="Your starting point">
        <dl class="level0-status"><div><dt>Journey level</dt><dd>Level 1 · New Beginning</dd></div><div><dt>Assessment status</dt><dd>${account.checkIns().some(item => item.latest) ? 'Optional Lab results available' : 'Not established yet'}</dd></div><div><dt>Plan</dt><dd>Not active — you choose when it starts</dd></div></dl>
        <ul class="level0-why">${reasons}</ul>
        <p class="level0-note">Level 1 marks the beginning of your journey; it is not a measure of attention, ability or wellbeing. Optional check-ins live in the <a href="src/pages/member/lab/lab.html">Lab</a>.</p>
      </aside>
    </div>`;
  }

  function renderWeek(account) {
    const fmt = Account.format;
    const plan = account.plan();
    const section = document.querySelector('.week-section');
    section.setAttribute('aria-busy', 'false');
    $('week-active').hidden = !plan;
    $('week-empty').hidden = Boolean(plan);

    if (!plan && account.profile().setup && account.profile().goal) { renderLevelZero(account); return; }
    if (!plan) {
      // The genuine empty state: three steps, each showing its real status.
      const profile = account.profile();
      const done = {
        setup: Boolean(profile.goal),
        checkin: account.checkInWindow().baselineDone,
        plan: false
      };
      const steps = [
        ['setup', 'Answer six quick questions', 'Your goal, the apps that pull you in, the time you have.', 'src/pages/member/onboarding/onboarding.html'],
        ['story', 'Watch a short story', 'How attention drifts, and the way back.', 'hero-reels-lab.html?flow=onboarding'],
        ['plan', 'Review your Week 1 proposal', 'You choose when it starts. No assessment needed.', 'src/pages/member/onboarding/starting-point.html']
      ];
      done.story = false;
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
      $('week-heading').textContent = 'Three small steps to begin';
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
