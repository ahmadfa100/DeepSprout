/**
 * Roadmap — the active plan, read from the shared journey state.
 *
 * Four in-page tabs (Overview, This week, Adjust, History) swap the content
 * of the page itself; nothing opens in a pop-up. Every number shown comes
 * from DeepSprout.stats(), so the page never invents progress.
 */
(() => {
  const DS = window.DeepSprout;
  if (!DS) return;

  const $ = id => document.getElementById(id);
  const readStored = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const writeStored = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* The controls still work for this visit. */ }
  };
  const reducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const icon = name => `<svg><use href="#rp-${name}"/></svg>`;
  const escape = value => String(value).replace(/[&<>"']/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  const SESSIONS = {
    'Depth Practice': ['depth', 'book'],
    'Listening & Recall': ['listening', 'headphones'],
    'Practical Micro-Challenge': ['challenge', 'pencil'],
    'Protected Work': ['protected', 'timer']
  };
  const PREVIEW_WEEKS = [
    { title: 'Notice the pattern', note: 'Build a picture of when feeds pull you in, without changing much yet.' },
    { title: 'Add one alternative', note: 'Put something in the gap the scrolling currently fills.' },
    { title: 'Hold attention longer', note: 'Stretch practices slightly as they start to feel manageable.' },
    { title: 'Decide what to keep', note: 'Review what actually worked and choose what carries on.' }
  ];

  let state = DS.get();
  const plan = state.plan?.status === 'active' ? state.plan : null;
  let stats = DS.stats();
  const weeks = plan?.direction?.length === 4 ? plan.direction : PREVIEW_WEEKS;
  const today = new Date();
  const planStart = plan ? new Date(`${plan.startDate}T12:00:00`) : null;
  const dateOfPlanDay = index => DS.addDays(planStart, index);
  const fmt = (date, options) => DS.formatDate(date, options);

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

  /* ------------------------------------------------------------------ hero */

  if (plan) {
    $('cycle-day').textContent = `Day ${stats.day} of ${stats.cycleLength}`;
    document.querySelector('.rp-hero-description').textContent =
      `A ${stats.cycleLength}-day plan built around one goal: ${stats.goalLabel.toLowerCase()}. One focus per week; the next week is written after your review.`;
    const chip = $('hero-week-chip');
    chip.innerHTML = `${icon('flag')}<span>Week ${stats.week} · <b>${escape(stats.weekTitle)}</b></span>`;
    chip.hidden = false;
  }

  /* ----------------------------------------------------------------- today */

  const countUp = (node, value) => {
    node.textContent = String(value);
    if (reducedMotion || typeof requestAnimationFrame !== 'function' || !Number.isFinite(value) || value < 2) return;
    const start = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - start) / 700);
      node.textContent = String(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  function renderToday() {
    const card = $('today-card');
    if (!plan) {
      card.hidden = true;
      $('empty-plan').hidden = false;
      const next = DS.nextAction('../../../../');
      const link = $('empty-plan-link');
      link.href = next.href;
      link.innerHTML = `${escape(next.label)} ${icon('arrow')}`;
      return;
    }
    const entry = stats.week === 1 ? plan.weekOne?.[stats.day - 1] : null;
    const loggedToday = DS.activityOn(today).length;
    const action = $('today-action');
    const status = $('today-status');
    $('today-kicker').textContent = `Today · Day ${stats.day} · Week ${stats.week}`;
    status.textContent = '';

    if (entry?.kind === 'practice') {
      const [session] = SESSIONS[entry.title] || ['quick'];
      $('today-title').textContent = entry.title;
      $('today-note').textContent = entry.note;
      action.href = `../training/training.html?session=${session}`;
      action.innerHTML = `Start practice ${icon('arrow')}`;
    } else if (entry?.kind === 'review' || DS.reviewDue()) {
      $('today-title').textContent = 'Weekly review';
      $('today-note').textContent = 'A few short questions about the week. Your answers shape what next week asks of you.';
      action.href = '../weekly-review/weekly-review.html';
      action.innerHTML = `Review your week ${icon('arrow')}`;
    } else if (entry?.kind === 'rest') {
      $('today-title').textContent = 'Nothing scheduled today';
      $('today-note').textContent = 'A day off is part of the plan, not a gap in it. Practice anyway only if you want to.';
      action.href = '../training/training.html#training-types';
      action.innerHTML = `Browse activities ${icon('arrow')}`;
    } else {
      const week = weeks[stats.week - 1];
      $('today-title').textContent = week.title;
      $('today-note').textContent = week.note;
      const next = DS.nextAction('../../../../');
      action.href = next.href;
      action.innerHTML = `${escape(next.label)} ${icon('arrow')}`;
    }
    if (loggedToday) status.innerHTML = `${icon('check')} ${loggedToday} logged today`;

    const fraction = stats.day / stats.cycleLength;
    const ring = $('cycle-ring');
    const length = 2 * Math.PI * 52;
    ring.style.strokeDasharray = `${length}`;
    ring.style.strokeDashoffset = `${length}`;
    const fill = () => { ring.style.strokeDashoffset = `${length * (1 - fraction)}`; };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(fill));
    else fill();
    countUp($('ring-day'), stats.day);
    document.querySelector('.rp-today-ring small').textContent = `of ${stats.cycleLength} days`;
  }

  /* ----------------------------------------------------------------- weeks */

  let selectedWeek = stats.week || 1;

  function weekState(number) {
    if (!plan) return 'preview';
    if (number < stats.week) return 'done';
    if (number === stats.week) return 'current';
    return 'upcoming';
  }

  function renderWeeks() {
    document.querySelectorAll('[data-week]').forEach(button => {
      const number = Number(button.dataset.week);
      const kind = weekState(number);
      const record = stats.perWeek[number - 1];
      button.querySelector('span:not(.rp-week-icon)').textContent = weeks[number - 1].title;
      button.querySelector('.rp-week-icon').innerHTML = icon({ done: 'check', current: 'sprout', upcoming: 'lock', preview: 'sprout' }[kind]);
      button.className = `rp-week is-${kind}${number === selectedWeek ? ' is-selected' : ''}`;
      button.setAttribute('aria-pressed', String(number === selectedWeek));
      if (kind === 'current') button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      const opens = plan ? fmt(dateOfPlanDay((number - 1) * 7)) : '';
      button.querySelector('.rp-week-state').textContent = {
        done: `${record.practices + record.routine} things recorded`,
        current: `Now · day ${stats.day}`,
        upcoming: `Opens ${opens}`,
        preview: 'Example focus'
      }[kind];
    });
    const fill = plan ? Math.min(1, (stats.day - 1) / (stats.cycleLength - 1)) : 0;
    $('track-fill').style.transform = `scaleX(${fill})`;
    renderWeekDetail();
  }

  function renderWeekDetail() {
    const number = selectedWeek;
    const week = weeks[number - 1];
    const record = stats.perWeek[number - 1];
    const kind = weekState(number);
    const detail = $('week-detail');
    const range = plan
      ? `${fmt(dateOfPlanDay((number - 1) * 7))} – ${fmt(dateOfPlanDay((number - 1) * 7 + 6))}`
      : 'Dates are set when your plan starts';
    const facts = kind === 'upcoming' || kind === 'preview'
      ? `<p class="rp-detail-hint">${kind === 'preview'
        ? 'This is an example. Your own four focuses are chosen from your goal when you activate a plan.'
        : 'Written in detail after your review of the week before, so it reflects what actually happened.'}</p>`
      : `<ul class="rp-detail-facts">
          <li><strong>${record.practices}</strong><span>practices logged</span></li>
          <li><strong>${record.routine}</strong><span>routine days ticked</span></li>
          <li><strong>${record.reviewed ? 'Done' : kind !== 'current' ? '—' : stats.daysToReview === 0 ? 'Today' : `${stats.daysToReview} day${stats.daysToReview === 1 ? '' : 's'}`}</strong><span>${record.reviewed ? 'week reviewed' : kind !== 'current' ? 'not reviewed' : stats.daysToReview === 0 ? 'review is due' : 'until review'}</span></li>
        </ul>`;
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

  function renderStats() {
    if (plan) {
      countUp($('stat-practices'), stats.practicesThisWeek);
      $('stat-practices-label').textContent = stats.scheduledThisWeek !== null
        ? `of ${stats.scheduledThisWeek} planned practices logged this week`
        : 'practices logged this week';
      countUp($('stat-routine'), stats.routineThisWeek);
      const due = DS.reviewDue();
      $('stat-review').textContent = due || stats.daysToReview === 0 ? 'Today' : `${stats.daysToReview} day${stats.daysToReview === 1 ? '' : 's'}`;
      $('stat-review-label').textContent = due ? 'your weekly review is due' : 'until your weekly review';
      const link = document.querySelector('[data-review-link]');
      link.classList.toggle('is-due', due);
      link.innerHTML = `${due ? 'Review your week' : 'Weekly review'} ${icon('arrow')}`;
    } else {
      countUp($('stat-practices'), stats.totalPractices);
      $('stat-practices-label').textContent = 'practices logged so far';
      countUp($('stat-routine'), stats.totalRoutineDays);
      document.querySelector('#stat-routine + p').textContent = 'offline routine days so far';
      $('stat-review').textContent = '—';
      $('stat-review-label').textContent = 'Reviews begin once your plan is active';
    }
    $('stat-baseline').textContent = `${stats.baselinesDone}/${stats.baselinesTotal}`;
    $('stat-baseline-label').textContent = stats.baselinesDone === stats.baselinesTotal && stats.retestOn
      ? `baseline checks done · retest from ${fmt(stats.retestOn)}`
      : 'baseline checks done';
  }

  /* --------------------------------------------------------------- routine */

  function renderRoutine() {
    const item = state.routine.find(entry => !entry.paused) || state.routine[0];
    const walk = document.querySelector('.rp-walk');
    const tick = $('routine-tick');
    if (!item) { tick.hidden = true; return; }
    walk.querySelector('h3').textContent = item.title;
    const days = item.days.length === 7 ? 'Every day' : `${item.days.length} days a week`;
    $('routine-detail').textContent = item.paused ? 'Paused' : `${days} · self-reported`;
    const scheduled = DS.routineScheduledToday(item);
    tick.hidden = !scheduled;
    const done = DS.routineDoneToday(item);
    tick.setAttribute('aria-pressed', String(done));
    tick.querySelector('span').textContent = done ? 'Done today' : 'Mark done today';
    tick.onclick = () => {
      DS.logRoutine(item.id, DS.routineDoneToday(item) ? null : 'done');
      refresh();
      tick.classList.remove('is-popping');
      void tick.offsetWidth;
      tick.classList.add('is-popping');
    };
  }

  const reminderText = minutes => (Number(minutes) > 0
    ? `A nudge after ${minutes} minutes of scrolling (saved preference).`
    : 'Reminder is off.');

  /* ------------------------------------------------------------- this week */

  let weekOffset = 0;

  function weekStartDate() {
    if (plan) return dateOfPlanDay((stats.week - 1 + weekOffset) * 7);
    const monday = DS.addDays(today, -((today.getDay() + 6) % 7));
    return DS.addDays(monday, weekOffset * 7);
  }
  let selectedDay = DS.dayKey(today);

  function planEntryFor(date) {
    if (!plan) return null;
    const index = DS.daysBetween(planStart, date);
    if (index < 0 || index >= stats.cycleLength) return { kind: 'outside' };
    if (index < 7) return plan.weekOne?.[index] || null;
    return null;
  }

  function renderWeekPanel() {
    const start = weekStartDate();
    const end = DS.addDays(start, 6);
    const planWeek = plan ? stats.week + weekOffset : null;
    $('week-range').textContent = `${fmt(start)} – ${fmt(end)}`;
    $('week-kicker').textContent = plan ? `Week ${planWeek} of 4 · ${weeks[planWeek - 1].title}` : 'This week';
    $('week-title').textContent = weekOffset === 0 || !plan ? 'Your week, day by day' : `Week ${planWeek}, day by day`;
    $('week-note').textContent = plan && planWeek > 1
      ? 'Days in this week are planned after your review of the week before. Anything you log still counts.'
      : 'Select a day to see what is planned and what you recorded.';
    $('previous-week').disabled = plan ? planWeek <= 1 : false;
    $('next-week').disabled = plan ? planWeek >= 4 : false;

    const calendar = $('calendar');
    calendar.replaceChildren(...Array.from({ length: 7 }, (_, offset) => {
      const date = DS.addDays(start, offset);
      const key = DS.dayKey(date);
      const entry = planEntryFor(date);
      const logged = DS.activityOn(date).length;
      const routineDone = state.routine.some(item => item.log?.[key] === 'done');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rp-day';
      button.style.setProperty('--i', offset);
      if (key === DS.dayKey(today)) button.classList.add('is-today');
      if (key === selectedDay) button.classList.add('is-selected');
      if (logged || routineDone) button.classList.add('is-complete');
      if (entry?.kind) button.dataset.kind = entry.kind;
      button.setAttribute('aria-pressed', String(key === selectedDay));
      button.setAttribute('aria-label', `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${logged || routineDone ? ', something recorded' : ''}`);
      button.innerHTML = `<small>${date.toLocaleDateString('en-US', { weekday: 'short' })}</small><strong>${date.getDate()}</strong><i class="rp-day-mark">${logged || routineDone ? icon('check') : ''}</i>`;
      button.addEventListener('click', () => { selectedDay = key; renderWeekPanel(); });
      return button;
    }));
    if (!calendar.querySelector('.is-selected')) {
      selectedDay = DS.dayKey(start);
      calendar.firstElementChild.classList.add('is-selected');
    }
    renderDayDetail(new Date(`${selectedDay}T12:00:00`));
  }

  function renderDayDetail(date) {
    const key = DS.dayKey(date);
    const entry = planEntryFor(date);
    const isToday = key === DS.dayKey(today);
    const future = DS.daysBetween(today, date) > 0;
    const logged = DS.activityOn(date);
    const detail = $('day-detail');

    let planned;
    if (!plan) planned = '<p class="rp-detail-hint">No plan is active yet, so nothing is scheduled. Practices you log still appear here.</p>';
    else if (entry?.kind === 'outside') planned = '<p class="rp-detail-hint">This day is outside your current 28-day cycle.</p>';
    else if (!entry) planned = '<p class="rp-detail-hint">The days of this week are written after your weekly review.</p>';
    else {
      const [session, glyph] = SESSIONS[entry.title] || [null, entry.kind === 'review' ? 'flag' : 'moon'];
      const cta = entry.kind === 'practice' && (isToday || !future)
        ? `<a class="rp-button rp-button-primary rp-button-small" href="../training/training.html?session=${session}">${isToday ? 'Start' : 'Do it now'} ${icon('arrow')}</a>`
        : entry.kind === 'review' && (isToday || !future)
          ? `<a class="rp-button rp-button-primary rp-button-small" href="../weekly-review/weekly-review.html">Open review ${icon('arrow')}</a>`
          : '';
      planned = `<div class="rp-planned is-${entry.kind}">
        <span class="rp-stat-icon ${entry.kind === 'practice' ? 'rp-gold' : entry.kind === 'review' ? 'rp-blue' : 'rp-sage'}">${icon(glyph)}</span>
        <div><small>${entry.kind === 'practice' ? 'Planned practice' : entry.kind === 'review' ? 'Planned' : 'Rest day'}</small><h4>${escape(entry.title)}</h4><p>${escape(entry.note)}</p></div>${cta}</div>`;
    }

    const routineRows = state.routine.filter(item => DS.routineScheduledToday(item, date)).map(item => {
      const status = item.log?.[key];
      const label = status === 'done' ? 'Done' : status === 'skipped' ? 'Skipped' : future ? 'Planned' : 'Not logged';
      return `<li class="is-${status || (future ? 'planned' : 'open')}"><span>${escape(item.title)}</span><b>${label}</b></li>`;
    }).join('');
    const loggedRows = logged.map(entry =>
      `<li class="is-done"><span>${escape(entry.title)}</span><b>${new Date(entry.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</b></li>`).join('');

    detail.innerHTML = `
      <header><h3>${isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}</h3><span>${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span></header>
      ${planned}
      <div class="rp-day-columns">
        <section><h4>Practices logged</h4>${loggedRows ? `<ul class="rp-day-list">${loggedRows}</ul>` : `<p class="rp-detail-hint">${future ? 'Nothing yet — this day has not happened.' : 'None logged.'}</p>`}</section>
        <section><h4>Offline routine</h4>${routineRows ? `<ul class="rp-day-list">${routineRows}</ul>` : '<p class="rp-detail-hint">Nothing on your routine for this day.</p>'}</section>
      </div>`;
    detail.classList.remove('is-entering');
    void detail.offsetWidth;
    detail.classList.add('is-entering');
  }

  $('previous-week').addEventListener('click', () => { weekOffset -= 1; renderWeekPanel(); });
  $('next-week').addEventListener('click', () => { weekOffset += 1; renderWeekPanel(); });

  /* ---------------------------------------------------------------- adjust */

  const form = $('adjust-form');
  const settings = readStored('deepsprout-recovery-settings', {});
  const setRadio = (name, value, fallback) => {
    const input = form.querySelector(`input[name="${name}"][value="${value}"]`)
      || form.querySelector(`input[name="${name}"][value="${fallback}"]`);
    if (input) input.checked = true;
  };
  setRadio('focus', readStored('deepsprout-recovery-focus', 'depth'), 'depth');
  setRadio('days', settings?.days || (plan?.availableDays >= 5 ? (plan.availableDays >= 7 ? '7' : '5') : '3'), '3');
  setRadio('intensity', settings?.intensity, 'gentle');
  setRadio('reminder', readStored('deepsprout-scroll-reminder', 30), '30');
  $('reminder-summary').textContent = reminderText(readStored('deepsprout-scroll-reminder', 30));

  form.addEventListener('submit', event => {
    event.preventDefault();
    const value = name => form.querySelector(`input[name="${name}"]:checked`)?.value;
    const days = value('days');
    writeStored('deepsprout-recovery-focus', value('focus'));
    writeStored('deepsprout-recovery-settings', { days, intensity: value('intensity') });
    writeStored('deepsprout-scroll-reminder', Number(value('reminder')));
    DS.update(next => {
      next.profile.availableDays = days;
      if (next.plan?.status === 'active') {
        next.plan.availableDays = Number(days);
        next.plan.revisions.push({
          at: new Date().toISOString(),
          reason: 'adjusted',
          week: DS.cycleWeek(),
          note: `${days === '7' ? 'Every day' : `${days} days a week`}, ${value('intensity')} intensity`
        });
      }
    });
    $('reminder-summary').textContent = reminderText(value('reminder'));
    const note = $('save-note');
    const focusName = { depth: 'Depth Practice', stillness: 'Protected Work', offline: 'your offline routine' }[value('focus')];
    note.textContent = `Saved. On open days, Activities will suggest ${focusName}.`;
    note.classList.remove('is-visible');
    void note.offsetWidth;
    note.classList.add('is-visible');
    refresh();
  });

  /* --------------------------------------------------------------- history */

  function renderHistory() {
    const events = [];
    if (plan?.activatedAt) events.push({ at: plan.activatedAt, kind: 'plan', title: 'Plan started', note: stats.goalLabel });
    (plan?.revisions || []).filter(entry => entry.reason === 'adjusted')
      .forEach(entry => events.push({ at: entry.at, kind: 'adjust', title: 'Plan adjusted', note: entry.note || '' }));
    state.reviews.forEach(review => events.push({ at: review.at, kind: 'review', title: `Week ${review.week || ''} reviewed`.replace('  ', ' '), note: review.outcome ? `Chose: ${review.outcome}` : '' }));
    state.activityLog.forEach(entry => events.push({ at: entry.at, kind: 'practice', title: entry.title || 'Practice', note: 'Practice logged · self-reported' }));
    state.routine.forEach(item => Object.entries(item.log || {}).forEach(([key, status]) => {
      if (status === 'done' || status === 'skipped') {
        events.push({ at: `${key}T00:00:00`, kind: status === 'done' ? 'routine' : 'skipped', title: item.title, note: status === 'done' ? 'Offline routine · self-reported' : 'Routine skipped' });
      }
    }));
    DS.ASSESSMENTS.forEach(test => {
      const attempt = state.assessments[test.id];
      if (attempt?.completedAt) events.push({ at: attempt.completedAt, kind: 'baseline', title: `${test.title} check`, note: 'Baseline measured in the Lab' });
    });
    events.sort((a, b) => new Date(b.at) - new Date(a.at));

    const list = $('history-list');
    $('history-empty').hidden = events.length > 0;
    let lastDay = '';
    const glyph = { plan: 'flag', adjust: 'sliders', review: 'flag', practice: 'book', routine: 'shoe', skipped: 'shoe', baseline: 'chart' };
    list.innerHTML = events.slice(0, 80).map((event, index) => {
      const day = DS.dayKey(event.at);
      const header = day !== lastDay
        ? `<li class="rp-timeline-day">${new Date(event.at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</li>`
        : '';
      lastDay = day;
      return `${header}<li class="rp-event is-${event.kind}" style="--i:${Math.min(index, 12)}"><span class="rp-event-dot">${icon(glyph[event.kind])}</span><div><strong>${escape(event.title)}</strong><small>${escape(event.note)}</small></div></li>`;
    }).join('');
  }

  /* ------------------------------------------------------------- lifecycle */

  function refresh() {
    state = DS.get();
    stats = DS.stats();
    renderStats();
    renderRoutine();
    renderWeeks();
    renderWeekPanel();
    renderHistory();
  }

  renderToday();
  refresh();

  const params = new URLSearchParams(location.search);
  const requested = params.get('setup') === '1' ? 'adjust' : location.hash.slice(1);
  activate(ALIASES[requested] ? requested : 'overview', { updateHash: Boolean(ALIASES[requested]) });
  if (requested === 'journey') $('journey').scrollIntoView({ block: 'start' });
  window.addEventListener('load', placeIndicator, { once: true });
  if (document.fonts?.ready) document.fonts.ready.then(placeIndicator);
})();
