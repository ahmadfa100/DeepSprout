/**
 * Roadmap — the active plan, read from the account record.
 *
 * Four in-page tabs (Overview, This week, Adjust, History) swap the content
 * of the page itself; nothing opens in a pop-up. Every number comes from
 * DeepSproutAccount, which computes it from the account's raw records, so the
 * page never invents progress. The cards here are about THE CURRENT WEEK;
 * cumulative counts live in Insights.
 */
(() => {
  const access = window.DeepSproutPersonal;
  if (access.denied()) { try { access.requireAccess(); } catch {} return; }
  const subject = access.subject();
  const preferenceKey = key => `${key}:person:${subject}`;
  const Account = window.DeepSproutAccount;
  if (!Account) return;

  const $ = id => document.getElementById(id);
  const fmt = Account.format;
  const readStored = (key, fallback) => access.preference(key, fallback, subject);
  const reducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const icon = name => `<svg><use href="#rp-${name}"/></svg>`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const plural = (count, one, many = `${one}s`) => (count === 1 ? one : many);

  /** Activity type → the session the Activities page runs for it, and its icon. */
  const SESSION = { depth: ['depth', 'book'], listening: ['listening', 'headphones'], practical: ['challenge', 'pencil'], 'protected-work': ['protected', 'timer'] };
  const STATE_LABELS = { completed: 'Completed', missed: 'Missed', rest: 'Planned rest day', 'not-due': 'Not due yet', none: 'Nothing scheduled' };
  const PREVIEW_WEEKS = [
    { week: 1, title: 'Notice the pattern', note: 'Build a picture of when feeds pull you in, without changing much yet.' },
    { week: 2, title: 'Add one alternative', note: 'Put something in the gap the scrolling currently fills.' },
    { week: 3, title: 'Hold attention longer', note: 'Stretch practices slightly as they start to feel manageable.' },
    { week: 4, title: 'Decide what to keep', note: 'Review what actually worked and choose what carries on.' }
  ];

  let account = null;
  let plan = null;

  /* ------------------------------------------------------------------ tabs */

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[data-panel]')];
  const indicator = document.querySelector('.rp-tab-indicator');
  const ALIASES = { overview: 'overview', journey: 'overview', week: 'week', adjust: 'adjust', reminder: 'adjust', history: 'history' };
  let activeTab = 'overview';

  const placeIndicator = () => {
    const tab = tabs.find(item => item.dataset.tab === activeTab);
    if (!tab || !indicator) return;
    indicator.style.width = `${tab.offsetWidth}px`;
    indicator.style.transform = `translateX(${tab.offsetLeft}px)`;
  };

  function activate(name, { updateHash = true, focus = false } = {}) {
    activeTab = ALIASES[name] || 'overview';
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === activeTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    panels.forEach(panel => {
      const show = panel.dataset.panel === activeTab;
      if (show && panel.hidden) {
        panel.hidden = false;
        panel.classList.remove('is-entering');
        void panel.offsetWidth;
        panel.classList.add('is-entering');
      } else if (!show) panel.hidden = true;
    });
    placeIndicator();
    if (updateHash && window.history?.replaceState) {
      window.history.replaceState(null, '', `${location.pathname}${location.search.replace(/[?&]setup=1/, '')}#${activeTab}`);
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      activate(tabs[(index + step + tabs.length) % tabs.length].dataset.tab, { focus: true });
    });
  });
  document.querySelectorAll('[data-tab-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    activate(link.dataset.tabLink);
    document.querySelector('.rp-tabs').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }));
  window.addEventListener('resize', placeIndicator);
  window.addEventListener('hashchange', () => {
    const name = location.hash.slice(1);
    if (ALIASES[name]) activate(name, { updateHash: false });
  });

  /* --------------------------------------------------------------- helpers */

  const countUp = (node, value, suffix = '') => {
    node.textContent = `${value}${suffix}`;
    if (reducedMotion || typeof requestAnimationFrame !== 'function' || !Number.isFinite(value) || value < 2) return;
    const start = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - start) / 700);
      node.textContent = `${Math.round(value * (1 - (1 - progress) ** 3))}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const weeks = () => (plan ? plan.direction : PREVIEW_WEEKS);

  /** Routine days done / scheduled in one plan week. Self-reported. */
  const routineWeek = number => {
    const dates = account.weekDates(number);
    if (!dates.length) return { done: 0, scheduled: 0 };
    return {
      done: account.routineDays(dates[0], dates[6]).length,
      scheduled: account.routineScheduledDays(dates[0], dates[6]).length
    };
  };

  /* ------------------------------------------------------------------ hero */

  function renderHero() {
    if (!plan) return;
    $('cycle-day').textContent = `Day ${plan.day} of ${plan.lengthDays}`;
    document.querySelector('.rp-hero-description').textContent =
      `A ${plan.lengthDays}-day plan built around one goal: ${plan.goalLabel.toLowerCase()}. One focus per week; the next week is written after your review.`;
    const chip = $('hero-week-chip');
    chip.innerHTML = `${icon('flag')}<span>Week ${plan.week} of ${plan.weeks} · <b>${escape(plan.direction[plan.week - 1].title)}</b></span>`;
    chip.hidden = false;
  }

  /* ----------------------------------------------------------------- today */

  function renderToday() {
    const card = $('today-card');
    if (!plan) {
      card.hidden = true;
      $('empty-plan').hidden = false;
      return;
    }
    const today = account.schedule().find(day => day.isToday);
    const action = $('today-action');
    const status = $('today-status');
    $('today-kicker').textContent = `Today · ${fmt.date(account.today, { weekday: true })} · Day ${plan.day} · Week ${plan.week}`;
    status.textContent = '';

    if (today?.action?.kind === 'practice') {
      const [session] = SESSION[today.action.activityType] || ['quick'];
      $('today-title').textContent = today.action.type?.title || 'Practice';
      $('today-note').textContent = `${today.action.minutes} minutes · level ${today.action.level}. Scheduled for today.`;
      action.href = `../training/training.html?session=${session}`;
      action.innerHTML = today.state === 'completed' ? `Practise again ${icon('arrow')}` : `Start practice ${icon('arrow')}`;
      if (today.state === 'completed') status.innerHTML = `${icon('check')} Done today · ${escape(today.attempt.outcome)}`;
    } else if (today?.action?.kind === 'review') {
      $('today-title').textContent = 'Weekly review';
      $('today-note').textContent = 'A few short questions about the week. Your answers shape what next week asks of you.';
      action.href = '../weekly-review/weekly-review.html';
      action.innerHTML = `Review your week ${icon('arrow')}`;
    } else if (today?.action?.kind === 'rest') {
      $('today-title').textContent = 'A planned rest day';
      $('today-note').textContent = 'A day off is part of the plan, not a gap in it. Practise anyway only if you want to.';
      action.href = '../training/training.html#training-types';
      action.innerHTML = `Browse activities ${icon('arrow')}`;
    } else {
      const week = plan.direction[plan.week - 1];
      $('today-title').textContent = week.title;
      $('today-note').textContent = week.note;
      const step = account.nextSteps('../../../../')[0];
      if (step) { action.href = step.href; action.innerHTML = `${escape(step.action)} ${icon('arrow')}`; }
    }

    const fraction = plan.day / plan.lengthDays;
    const ring = $('cycle-ring');
    const length = 2 * Math.PI * 52;
    ring.style.strokeDasharray = `${length}`;
    ring.style.strokeDashoffset = `${length}`;
    const fill = () => { ring.style.strokeDashoffset = `${length * (1 - fraction)}`; };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(fill));
    else fill();
    countUp($('ring-day'), plan.day);
    document.querySelector('.rp-today-ring small').textContent = `of ${plan.lengthDays} days`;
  }

  /* ----------------------------------------------------------------- weeks */

  let selectedWeek = 1;

  const weekState = number => {
    if (!plan) return 'preview';
    if (number < plan.week) return 'done';
    if (number === plan.week) return 'current';
    return 'upcoming';
  };

  function renderWeeks() {
    const list = weeks();
    document.querySelectorAll('[data-week]').forEach(button => {
      const number = Number(button.dataset.week);
      const kind = weekState(number);
      button.querySelector('span:not(.rp-week-icon)').textContent = list[number - 1].title;
      button.querySelector('.rp-week-icon').innerHTML = icon({ done: 'check', current: 'sprout', upcoming: 'lock', preview: 'sprout' }[kind]);
      button.className = `rp-week is-${kind}${number === selectedWeek ? ' is-selected' : ''}`;
      button.setAttribute('aria-pressed', String(number === selectedWeek));
      if (kind === 'current') button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      let label = 'Example focus';
      if (kind === 'done') {
        const adherence = account.adherence(number);
        label = `Complete · ${adherence.completed} of ${adherence.due} practices`;
      } else if (kind === 'current') label = `Now · day ${plan.day}`;
      else if (kind === 'upcoming') label = `Opens ${fmt.date(account.weekDates(number)[0])}`;
      button.querySelector('.rp-week-state').textContent = label;
    });
    const fill = plan ? Math.min(1, (plan.day - 1) / (plan.lengthDays - 1)) : 0;
    $('track-fill').style.transform = `scaleX(${fill})`;
    renderWeekDetail();
  }

  function renderWeekDetail() {
    const number = selectedWeek;
    const week = weeks()[number - 1];
    const kind = weekState(number);
    const detail = $('week-detail');
    const dates = plan ? account.weekDates(number) : [];
    const range = plan ? `${fmt.date(dates[0])} – ${fmt.date(dates[6])}` : 'Dates are set when your plan starts';
    let facts;
    if (kind === 'upcoming' || kind === 'preview') {
      facts = `<p class="rp-detail-hint">${kind === 'preview'
        ? 'This is an example. Your own four focuses are chosen from your goal when you activate a plan.'
        : 'Written in detail after your review of the week before, so it reflects what actually happened.'}</p>`;
    } else {
      const adherence = account.adherence(number);
      const routine = routineWeek(number);
      const reviewed = account.reviews().history.some(review => review.week === number);
      const reviewDue = account.reviews().nextDue;
      facts = `<ul class="rp-detail-facts">
          <li><strong>${adherence.completed} of ${adherence.due}</strong><span>due practices · measured</span></li>
          <li><strong>${routine.done} of ${routine.scheduled}</strong><span>routine days · self-reported</span></li>
          <li><strong>${reviewed ? 'Done' : kind === 'current' && reviewDue ? fmt.relativeDays(Account.daysBetween(account.today, reviewDue)).replace(/^./, c => c.toUpperCase()) : 'Not done'}</strong><span>${reviewed ? 'week reviewed' : kind === 'current' ? 'review is due' : 'not reviewed'}</span></li>
        </ul>`;
    }
    detail.innerHTML = `
      <div class="rp-detail-head"><span class="rp-week-badge is-${kind}">Week ${number}</span><small>${range}</small></div>
      <h3>${escape(week.title)}</h3>
      <p>${escape(week.note)}</p>
      ${facts}`;
    detail.classList.remove('is-entering');
    void detail.offsetWidth;
    detail.classList.add('is-entering');
  }

  document.querySelectorAll('[data-week]').forEach(button => button.addEventListener('click', () => {
    selectedWeek = Number(button.dataset.week);
    renderWeeks();
  }));

  /* ----------------------------------------------------------------- stats */

  /** Three cards, all about THIS week. Cumulative counts belong to Insights. */
  function renderStats() {
    const link = document.querySelector('[data-review-link]');
    if (!plan) {
      $('stat-practices').textContent = '—';
      $('stat-practices-label').textContent = 'No plan yet, so nothing is due';
      $('stat-routine').textContent = '—';
      $('stat-routine-label').textContent = 'No routine yet';
      $('stat-review').textContent = '—';
      $('stat-review-label').textContent = 'Reviews begin once your plan is active';
      return;
    }
    const adherence = account.adherence();
    $('stat-practices').textContent = `${adherence.completed} of ${adherence.due}`;
    $('stat-practices-label').textContent = `This week: due ${plural(adherence.due, 'practice')} done`;
    $('stat-practices-source').textContent = adherence.provenance.label;

    const routine = account.routine();
    if (routine.week && routine.week.scheduled) {
      $('stat-routine').textContent = `${routine.week.done} of ${routine.week.scheduled}`;
      $('stat-routine-label').textContent = `Your routine: days this week${routine.primary ? ` · ${routine.primary.title}` : ' · no routine scheduled now'}`;
    } else {
      $('stat-routine').textContent = '—';
      $('stat-routine-label').textContent = 'Your routine: nothing scheduled this week';
    }
    $('stat-routine-source').textContent = routine.provenance.label;

    const reviews = account.reviews();
    const thisWeekDone = reviews.history.some(review => review.week === plan.week);
    if (thisWeekDone) {
      $('stat-review').textContent = 'Done';
      $('stat-review-label').textContent = `Weekly review for week ${plan.week}`;
    } else if (reviews.nextDue) {
      const days = Account.daysBetween(account.today, reviews.nextDue);
      $('stat-review').textContent = `Due ${fmt.weekday(reviews.nextDue, 'long')}`;
      $('stat-review-label').textContent = `Weekly review · ${fmt.date(reviews.nextDue)}, ${fmt.relativeDays(days)}`;
      link.classList.toggle('is-due', days <= 1);
    }
  }

  /* --------------------------------------------------------------- routine */

  function renderRoutine() {
    const routine = account.routine();
    const item = routine.primary;
    const walk = document.querySelector('.rp-walk');
    const tick = $('routine-tick');
    if (!item) {
      tick.hidden = true;
      // Deleted items leave history behind; say so rather than "no routine yet".
      const hadRoutine = account.history().some(event => event.kind === 'routine' || event.kind === 'removed');
      walk.querySelector('h3').textContent = hadRoutine ? 'No routine scheduled' : 'No routine yet';
      $('routine-detail').textContent = hadRoutine
        ? 'Your past check-ins are kept in History. Add something new in Activities.'
        : 'Add one small thing you can do away from a screen.';
      return;
    }
    walk.querySelector('h3').textContent = item.title;
    const days = item.days.length === 7 ? 'Every day'
      : item.days.length === 5 && [1, 2, 3, 4, 5].every(day => item.days.includes(day)) ? 'Weekdays'
        : `${item.days.length} days a week`;
    const scheduled = account.routineScheduledOn(item, account.today);
    $('routine-detail').textContent = item.paused ? 'Paused' : `${days}${item.recurrence === 'biweekly' ? ', every other week' : ''} · self-reported${scheduled ? '' : ' · not scheduled today'}`;
    tick.hidden = !scheduled;
    const done = account.routineStatusOn(item, account.today) === 'done';
    tick.setAttribute('aria-pressed', String(done));
    tick.querySelector('span').textContent = done ? 'Done today' : 'Mark done today';
    tick.onclick = () => {
      account.mutate({ type: 'routine.log', id: item.id, status: done ? null : 'done' });
      tick.classList.remove('is-popping');
      void tick.offsetWidth;
      tick.classList.add('is-popping');
    };
  }

  const reminderText = minutes => (Number(minutes) > 0
    ? `A nudge after ${minutes} minutes of scrolling (saved preference).`
    : 'Reminder is off.');

  /* ------------------------------------------------------------- this week */

  let weekNumber = 1;
  let selectedDay = null;

  function renderWeekPanel() {
    if (!plan) {
      $('week-range').textContent = '';
      $('week-kicker').textContent = 'This week';
      $('week-title').textContent = 'Your week, day by day';
      $('week-note').textContent = 'No plan is active yet, so nothing is scheduled.';
      $('previous-week').disabled = true;
      $('next-week').disabled = true;
      $('calendar').replaceChildren();
      $('day-detail').innerHTML = '<p class="rp-detail-hint">Your days appear here once your plan starts.</p>';
      return;
    }
    const days = account.schedule(weekNumber);
    $('week-range').textContent = `${fmt.date(days[0].date)} – ${fmt.date(days[6].date)}`;
    $('week-kicker').textContent = `Week ${weekNumber} of ${plan.weeks} · ${plan.direction[weekNumber - 1].title}`;
    $('week-title').textContent = weekNumber === plan.week ? 'Your week, day by day' : `Week ${weekNumber}, day by day`;
    $('week-note').textContent = weekNumber > plan.week
      ? 'This week is written in detail after your review of the week before.'
      : 'Select a day to see what was planned and what you recorded.';
    $('previous-week').disabled = weekNumber <= 1;
    $('next-week').disabled = weekNumber >= plan.weeks;

    if (!selectedDay || !days.some(day => day.key === selectedDay)) {
      selectedDay = (days.find(day => day.isToday) || days[0]).key;
    }
    const items = account.routine().items;
    $('calendar').replaceChildren(...days.map((day, offset) => {
      const routineDone = items.some(item => account.routineStatusOn(item, day.date) === 'done');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rp-day';
      button.style.setProperty('--i', offset);
      button.dataset.state = day.state;
      if (day.isToday) button.classList.add('is-today');
      if (day.key === selectedDay) button.classList.add('is-selected');
      if (day.state === 'completed') button.classList.add('is-complete');
      if (day.action?.kind) button.dataset.kind = day.action.kind;
      button.setAttribute('aria-pressed', String(day.key === selectedDay));
      button.setAttribute('aria-label', `${fmt.date(day.date, { weekday: true })}: ${STATE_LABELS[day.state]}${routineDone ? ', routine ticked' : ''}${day.isToday ? ', today' : ''}`);
      button.innerHTML = `<small>${fmt.weekday(day.date)}</small><strong>${day.date.getDate()}</strong><i class="rp-day-mark">${day.state === 'completed' ? icon('check') : ''}</i>`;
      button.addEventListener('click', () => { selectedDay = day.key; renderWeekPanel(); });
      return button;
    }));
    renderDayDetail(days.find(day => day.key === selectedDay));
  }

  function renderDayDetail(day) {
    const detail = $('day-detail');
    const future = day.key > account.todayKey;
    let planned;
    if (!day.action) {
      planned = weekNumber > plan.week
        ? '<p class="rp-detail-hint">The days of this week are written after your weekly review.</p>'
        : '<p class="rp-detail-hint">Nothing was scheduled on this day.</p>';
    } else {
      const kind = day.action.kind;
      const [session, glyph] = kind === 'practice' ? (SESSION[day.action.activityType] || ['quick', 'book']) : [null, kind === 'review' ? 'flag' : 'moon'];
      const title = kind === 'practice' ? day.action.type?.title : kind === 'review' ? 'Weekly review' : 'Rest day';
      const note = kind === 'practice' ? `${day.action.minutes} minutes · level ${day.action.level} · ${STATE_LABELS[day.state].toLowerCase()}`
        : kind === 'review' ? `A few short questions · ${STATE_LABELS[day.state].toLowerCase()}`
          : 'A day off is part of the plan, not a gap in it.';
      const cta = kind === 'practice' && day.isToday && day.state !== 'completed'
        ? `<a class="rp-button rp-button-primary rp-button-small" href="../training/training.html?session=${session}">Start ${icon('arrow')}</a>`
        : kind === 'review' && !future && day.state !== 'completed'
          ? `<a class="rp-button rp-button-primary rp-button-small" href="../weekly-review/weekly-review.html">Open review ${icon('arrow')}</a>`
          : '';
      planned = `<div class="rp-planned is-${kind}">
        <span class="rp-stat-icon ${kind === 'practice' ? 'rp-gold' : 'rp-sage'}">${icon(glyph)}</span>
        <div><small>${kind === 'practice' ? 'Planned practice' : kind === 'review' ? 'Planned' : 'Rest day'}</small><h4>${escape(title)}</h4><p>${escape(note)}</p></div>${cta}</div>`;
    }

    const attempts = account.attemptsOn(day.date).map(attempt =>
      `<li class="is-${attempt.valid ? 'done' : 'open'}"><span>${escape(attempt.type?.title || attempt.title || 'Practice')}</span><b>${attempt.valid ? escape(attempt.outcome) : 'Not counted'}</b></li>`).join('');
    const routineRows = account.routine().items.concat([])
      .filter(item => account.routineScheduledOn(item, day.date) || account.routineStatusOn(item, day.date))
      .map(item => {
        const status = account.routineStatusOn(item, day.date);
        const label = status === 'done' ? 'Done' : status === 'skipped' ? 'Skipped' : future ? 'Planned' : 'Not logged';
        return `<li class="is-${status || (future ? 'planned' : 'open')}"><span>${escape(item.title)}</span><b>${label}</b></li>`;
      }).join('');

    detail.innerHTML = `
      <header><h3>${day.isToday ? 'Today' : day.date.toLocaleDateString('en-GB', { weekday: 'long' })}</h3><span>${day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</span></header>
      ${planned}
      <div class="rp-day-columns">
        <section><h4>Practices · measured</h4>${attempts ? `<ul class="rp-day-list">${attempts}</ul>` : `<p class="rp-detail-hint">${future ? 'Nothing yet — this day has not happened.' : 'None recorded.'}</p>`}</section>
        <section><h4>Offline routine · self-reported</h4>${routineRows ? `<ul class="rp-day-list">${routineRows}</ul>` : '<p class="rp-detail-hint">Nothing on your routine for this day.</p>'}</section>
      </div>`;
    detail.classList.remove('is-entering');
    void detail.offsetWidth;
    detail.classList.add('is-entering');
  }

  $('previous-week').addEventListener('click', () => { weekNumber -= 1; selectedDay = null; renderWeekPanel(); });
  $('next-week').addEventListener('click', () => { weekNumber += 1; selectedDay = null; renderWeekPanel(); });

  /* ---------------------------------------------------------------- adjust */

  const form = $('adjust-form');
  const settings = readStored('deepsprout-recovery-settings', {});
  const setRadio = (name, value, fallback) => {
    const input = form.querySelector(`input[name="${name}"][value="${value}"]`)
      || form.querySelector(`input[name="${name}"][value="${fallback}"]`);
    if (input) input.checked = true;
  };
  setRadio('focus', readStored('deepsprout-recovery-focus', 'depth'), 'depth');
  setRadio('days', settings?.days, '5');
  setRadio('intensity', settings?.intensity, 'gentle');
  setRadio('reminder', readStored('deepsprout-scroll-reminder', 30), '30');
  $('reminder-summary').textContent = reminderText(readStored('deepsprout-scroll-reminder', 30));

  form.addEventListener('submit', event => {
    event.preventDefault();
    const value = name => form.querySelector(`input[name="${name}"]:checked`)?.value;
    const days = value('days');
    try {
      account.mutate({type:plan?'plan.adjust':'preferences.save',
        preferences:{'deepsprout-recovery-focus':value('focus'),'deepsprout-recovery-settings':{days,intensity:value('intensity')},'deepsprout-scroll-reminder':Number(value('reminder'))},
        label:`${days === '7' ? 'Every day' : `${days} days a week`}, ${value('intensity')}`,
        detail:'Applies from next week; this week stays as planned.'});
    } catch (error) { $('save-note').textContent=error.message; return; }
    $('reminder-summary').textContent = reminderText(value('reminder'));
    const note = $('save-note');
    const focusName = { depth: 'Depth Practice', stillness: 'Protected Work', offline: 'your offline routine' }[value('focus')];
    note.textContent = `Saved. On open days, Activities will suggest ${focusName}.${plan ? ' Recorded in your history.' : ''}`;
    note.classList.remove('is-visible');
    void note.offsetWidth;
    note.classList.add('is-visible');
  });

  /* --------------------------------------------------------------- history */

  function renderHistory() {
    const events = account.history();
    const list = $('history-list');
    $('history-empty').hidden = events.length > 0;
    let lastDay = '';
    const glyph = { plan: 'flag', adjust: 'sliders', review: 'flag', practice: 'book', invalid: 'book', routine: 'shoe', skipped: 'shoe', removed: 'shoe', baseline: 'chart' };
    list.innerHTML = events.slice(0, 80).map((event, index) => {
      const header = event.on !== lastDay
        ? `<li class="rp-timeline-day">${escape(fmt.date(event.on, { weekday: true, year: true }))}</li>`
        : '';
      lastDay = event.on;
      return `${header}<li class="rp-event is-${event.kind}" style="--i:${Math.min(index, 12)}"><span class="rp-event-dot">${icon(glyph[event.kind] || 'flag')}</span><div><strong>${escape(event.title)}</strong><small>${escape(event.note)}</small></div></li>`;
    }).join('');
  }

  /* ------------------------------------------------------------- lifecycle */

  function refresh() {
    renderStats();
    renderRoutine();
    renderWeeks();
    renderWeekPanel();
    renderHistory();
  }

  const params = new URLSearchParams(location.search);
  const requested = params.get('setup') === '1' ? 'adjust' : location.hash.slice(1);
  activate(ALIASES[requested] ? requested : 'overview', { updateHash: Boolean(ALIASES[requested]) });
  window.addEventListener('load', placeIndicator, { once: true });
  if (document.fonts?.ready) document.fonts.ready.then(placeIndicator);

  Account.load().then(loaded => {
    account = loaded;
    plan = account.plan();
    selectedWeek = plan?.week || 1;
    weekNumber = plan?.week || 1;
    renderHero();
    renderToday();
    refresh();
    if (requested === 'journey') $('journey').scrollIntoView({ block: 'start' });
    window.addEventListener('deepsprout:account', () => { refresh(); renderToday(); });
  }).catch(() => {
    $('today-card').hidden = true;
    const empty = $('empty-plan');
    empty.hidden = false;
    empty.querySelector('h2').textContent = 'Your roadmap couldn’t be loaded';
    empty.querySelector('p').textContent = 'Nothing is shown rather than made-up progress. If you opened this file directly, serve the Client folder locally and reload.';
  });
})();
