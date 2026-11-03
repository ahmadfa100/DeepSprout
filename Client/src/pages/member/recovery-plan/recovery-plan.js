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
  const STATE_LABELS = { due:'Due',upcoming:'Upcoming','in-progress':'In Progress',partial:'Partial',unknown:'No reliable scheduled data',cancelled:'Cancelled',paused:'Paused',rescheduled:'Rescheduled', completed: 'Completed', missed: 'Missed', rest: 'Planned rest day', 'not-due': 'Not due yet', none: 'Nothing scheduled' };
  const PREVIEW_WEEKS = [
    { week: 1, title: 'Notice the pattern', note: 'Build a picture of when feeds pull you in, without changing much yet.' },
    { week: 2, title: 'Add one alternative', note: 'Put something in the gap the scrolling currently fills.' },
    { week: 3, title: 'Hold attention longer', note: 'Stretch practices slightly as they start to feel manageable.' },
    { week: 4, title: 'Decide what to keep', note: 'Review what actually worked and choose what carries on.' }
  ];

  let account = null;
  let plan = null;
  let adjustMode = null;
  let routineBaseline = null;
  let routineSaving = false;
  let planBaseline = null;
  let planSaving = false;

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
    const nextTab = ALIASES[name] || 'overview';
    if (activeTab === 'adjust' && nextTab !== 'adjust' && (adjustMode === 'routine' ? routineDirty() : adjustDirty()) && !window.confirm('Discard your unsaved changes?')) return false;
    activeTab = nextTab;
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
    return true;
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
    if (ALIASES[name] && activate(name, { updateHash: false }) === false) window.history.replaceState(null, '', `${location.pathname}${location.search}#adjust`);
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
    $('hero-title').innerHTML=`${({2:'Two',3:'Three',4:'Four'})[plan.weeks]||plan.weeks} weeks.<br><em>One clear direction.</em>`;
    $('journey-title').textContent=`Your ${{2:'two',3:'three',4:'four'}[plan.weeks]||plan.weeks} weeks`;
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
      $('today-note').textContent = `${today.action.minutes} minute budget · level ${today.action.level}. Scheduled for today.`;
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
    if (number < plan.week) return 'historical';
    if (number === plan.week) return 'current';
    return 'upcoming';
  };

  function renderWeeks() {
    const list = weeks();
    document.querySelectorAll('[data-week]').forEach(button => {
      const number = Number(button.dataset.week);
      const kind = weekState(number);
      button.hidden=number>list.length;if(button.hidden)return;
      button.querySelector('span:not(.rp-week-icon)').textContent = list[number - 1].title;
      button.querySelector('.rp-week-icon').innerHTML = icon({ done: 'check', current: 'sprout', upcoming: 'lock', preview: 'sprout',historical:'clock' }[kind]);
      // Legacy consumers used is-done for an elapsed period. Visible outcome remains factual.
      button.className = `rp-week is-${kind}${kind==='historical'&&account.recovery()?.current?.legacy?' is-done':''}${number === selectedWeek ? ' is-selected' : ''}`;
      button.dataset.period=kind;
      if(kind==='historical'){const a=account.adherence(number);button.dataset.outcome=!a.due?'no-reliable-data':a.completed===a.due?'all-due-practices-completed':a.completed?'partial':'missed';}
      button.setAttribute('aria-pressed', String(number === selectedWeek));
      if (kind === 'current') button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      let label = 'Example focus';
      if (kind === 'historical') {
        const adherence = account.adherence(number);
        label = `Past week · ${adherence.completed} of ${adherence.due} due practices completed`;
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
          <li><strong>${adherence.completed} of ${adherence.due}</strong><span>due practices · original evidence</span></li>
          <li><strong>${routine.done} of ${routine.scheduled}</strong><span>routine days · self-reported</span></li>
          <li><strong>${reviewed ? 'Done' : kind === 'current' && reviewDue ? fmt.relativeDays(Account.daysBetween(account.today, reviewDue)).replace(/^./, c => c.toUpperCase()) : 'Not done'}</strong><span>${reviewed ? 'week reviewed' : kind === 'current' ? 'review is due' : 'not reviewed'}</span></li>
        </ul>`;
    }
    detail.innerHTML = `
      <div class="rp-week-story"><div class="rp-detail-head"><span class="rp-week-badge is-${kind}">Week ${number}</span><small>${range}</small></div>
        <h3>${escape(week.title)}</h3><p>${escape(week.note)}</p></div>
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
      const note = kind === 'practice' ? `${day.action.minutes} minute budget · Level ${day.action.level}`
        : kind === 'review' ? 'A few short questions'
          : 'A day off is part of the plan, not a gap in it.';
      const cta = kind === 'practice' && day.isToday && !['completed','cancelled','rescheduled','paused'].includes(day.state) && ['Active','Maintenance'].includes(plan.status||'Active')
        ? `<a class="rp-button rp-button-primary rp-button-small" href="../training/training.html?session=${session}">Start ${icon('arrow')}</a>`
        : kind === 'review' && !future && day.state !== 'completed' && ['Active','Maintenance'].includes(plan.status||'Active')
          ? `<a class="rp-button rp-button-primary rp-button-small" href="../weekly-review/weekly-review.html">Open review ${icon('arrow')}</a>`
          : '';
      planned = `<div class="rp-planned is-${kind}">
        <span class="rp-stat-icon ${kind === 'practice' ? 'rp-gold' : 'rp-sage'}">${icon(glyph)}</span>
        <div class="rp-planned-copy"><small>${kind === 'practice' ? 'Required personal practice' : kind === 'review' ? 'Planned review' : 'Space to rest'}</small><h4>${escape(title)}</h4><p>${escape(note)}</p></div>${cta}</div>`;
    }

    const additionalReview=day.actions?.find(a=>a.kind==='review'&&day.action?.kind!=='review');if(additionalReview)planned+=`<p>Also scheduled: Weekly Review · ${escape(additionalReview.dueOn||day.key)}. <a href="../weekly-review/weekly-review.html?week=${additionalReview.week}">Open review</a></p>`;
    const attempts = account.attemptsOn(day.date).map(attempt =>
      `<li class="is-${attempt.valid ? 'done' : 'open'}"><span class="rp-evidence-mark" aria-hidden="true">${icon(attempt.valid ? 'check' : 'book')}</span><span class="rp-evidence-name">${escape(attempt.type?.title || attempt.title || 'Practice')}</span><b>${attempt.valid ? escape(attempt.outcome) : 'Not counted'}</b></li>`).join('');
    const routineRows = account.routine().items.concat([])
      .filter(item => account.routineScheduledOn(item, day.date) || account.routineStatusOn(item, day.date))
      .map(item => {
        const status = account.routineStatusOn(item, day.date);
        const label = status === 'done' ? 'Done' : status === 'skipped' ? 'Skipped' : future ? 'Planned' : 'Not logged';
        return `<li class="rp-routine-entry is-${status || (future ? 'planned' : 'open')}"><span>${escape(account.routineTitleOn(item,day.date))}</span><b>${label}</b></li>`;
      }).join('');

    detail.innerHTML = `
      <header class="rp-day-heading"><p class="rp-kicker">Selected day</p><h3>${day.isToday ? 'Today' : day.date.toLocaleDateString('en-GB', { weekday: 'long' })}</h3><time datetime="${day.key}">${day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</time><span class="rp-day-state is-${day.state}">${escape(STATE_LABELS[day.state] || 'Unrecorded')}</span></header>
      <div class="rp-day-content">${planned}
        <div class="rp-day-columns">
          <section class="rp-day-source"><h4>Practices <span>Original evidence</span></h4>${attempts ? `<ul class="rp-day-list">${attempts}</ul>` : `<p class="rp-detail-hint">${future ? 'Nothing yet — this day has not happened.' : 'None recorded.'}</p>`}</section>
          <section class="rp-day-source"><h4>Offline routine <span>Self-reported</span></h4>${routineRows ? `<ul class="rp-day-list">${routineRows}</ul>` : '<p class="rp-detail-hint">Nothing on your routine for this day.</p>'}</section>
        </div>
      </div>`;
    if(day.action?.kind==='practice'&&future&&['Active','Maintenance'].includes(plan.status||'Active')&&!day.action.started&&!['Rescheduled','Cancelled'].includes(day.action.status)){
      const host=document.createElement('form');host.className='rp-reschedule';host.dataset.reschedule=day.action.id;
      host.innerHTML=`<h4>Move this future personal practice</h4><label>New date<input name="date" type="date" min="${Account.keyOf(Account.addDays(account.today,1))}" max="${Account.keyOf(plan.end)}" required></label><label>Alternative<select name="type">${Object.keys(SESSION).map(t=>`<option value="${t}" ${t===day.action.activityType?'selected':''}>${escape(t)}</option>`).join('')}</select></label><label>Reason<input name="reason" maxlength="300" required></label><button>Preview reschedule</button><p role="status"></p>`;
      host.onsubmit=event=>{event.preventDefault();const values={date:host.elements.date.value,type:host.elements.type.value,reason:host.elements.reason.value};host.querySelector('p').textContent=`Preview: ${day.key} → ${values.date}, ${values.type}. Original ID stays in history.`;let b=host.querySelector('[data-confirm-reschedule]');if(!b){b=document.createElement('button');b.type='button';b.dataset.confirmReschedule='';b.textContent='Confirm reschedule';host.append(b);}b.onclick=()=>{try{account.rescheduleRecovery(day.action.id,values.date,values.type,values.reason);}catch(e){host.querySelector('p').textContent=e.message;}};};detail.querySelector('.rp-day-content').append(host);
    }
    detail.classList.remove('is-entering');
    void detail.offsetWidth;
    detail.classList.add('is-entering');
  }

  $('previous-week').addEventListener('click', () => { weekNumber -= 1; selectedDay = null; renderWeekPanel(); });
  $('next-week').addEventListener('click', () => { weekNumber += 1; selectedDay = null; renderWeekPanel(); });

  /* ---------------------------------------------------------------- adjust */

  const form = $('adjust-form');
  const adjustDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const goalOptions = [
    ['reduce-scrolling', 'Spend less time scrolling'],
    ['intentional-phone', 'Use my phone intentionally'],
    ['offline-time', 'Make room for offline life'],
    ['focus-objective', 'Focus on meaningful work']
  ];
  const adjustCopy = {
    schedule: ['Your schedule', 'Make room for a different week', 'Choose the days and time you can realistically give to practice.', 'My practice availability changed'],
    difficulty: ['Practice level', 'Make one practice more manageable', 'Step down one eligible practice. Your earlier attempts and levels remain in history.', 'I chose a lower practice level'],
    mix: ['Practice types', 'Choose what you want to practice', 'Pick the types that suit you. Only future unstarted days will change.', 'I chose a different practice mix'],
    goal: ['Main goal', 'Choose a new direction', 'The next unstarted schedule will use a practice mix suited to this goal.', 'My main goal changed']
  };
  const latestPlanVersion = () => {
    const versions = account?.recovery()?.current?.preferenceVersions || [];
    const nextDay = account ? Account.keyOf(Account.addDays(account.today, 1)) : '';
    return versions.filter(version => version.effectiveOn <= nextDay).at(-1) || versions[0] || null;
  };
  const latestPlanPrefs = () => latestPlanVersion()?.value || account?.recovery()?.preferences || null;
  const selectedValues = name => [...form.querySelectorAll(`[name="${name}"]:checked`)].map(node => node.value);
  const planDraft = () => {
    if (adjustMode === 'schedule') return { days: Number($('adjust-days').value), minutes: Number($('adjust-minutes').value), weekdays: selectedValues('weekday').map(Number).sort() };
    if (adjustMode === 'difficulty') return { lowerType: form.querySelector('[name="lowerType"]:checked')?.value || null };
    if (adjustMode === 'mix') return { mix: selectedValues('mix').sort() };
    if (adjustMode === 'goal') return { goal: form.querySelector('[name="goal"]:checked')?.value || null };
    return {};
  };
  function adjustDirty() {
    if (!planBaseline || !['schedule', 'difficulty', 'mix', 'goal'].includes(adjustMode)) return false;
    return JSON.stringify(planDraft()) !== JSON.stringify(planBaseline);
  }
  function renderAdjustment() {
    if (!account) return;
    const recovery = account.recovery(), prefs = latestPlanPrefs();
    const adjustable = recovery && ['Active', 'Maintenance'].includes(recovery.status);
    $('adjust-readiness').hidden = Boolean(adjustable);
    if (!adjustable) $('adjust-readiness').textContent = recovery
      ? `This cycle is ${recovery.status.toLowerCase()}. Open a change card to see how to continue before editing the plan.`
      : 'No Recovery Plan is active yet. Open a change card to start your journey; you can still add an offline routine now.';
    if (!recovery || !prefs) {
      $('adjust-summary-goal').textContent = 'No active plan yet';
      $('adjust-summary-days').textContent = '—';
      $('adjust-summary-minutes').textContent = '—';
      $('adjust-summary-routine').textContent = account.routine().primary?.title || 'No activity yet';
      $('adjust-summary-timing').textContent = 'Start a plan to adjust it';
      return;
    }
    $('adjust-summary-goal').textContent = prefs.goalLabel || account.plan()?.goalLabel || 'Your personal goal';
    $('adjust-summary-days').textContent = `${prefs.days} ${prefs.days === 1 ? 'day' : 'days'} each week`;
    $('adjust-summary-minutes').textContent = `${prefs.minutes} minutes`;
    const primaryRoutine = account.routine().primary;
    $('adjust-summary-routine').textContent = primaryRoutine ? `${primaryRoutine.title}${primaryRoutine.paused ? ' · paused' : ''}` : prefs.commitment || 'No activity yet';
    const effectiveOn = latestPlanVersion()?.effectiveOn;
    $('adjust-summary-timing').textContent = effectiveOn && effectiveOn > account.todayKey ? `Saved · begins ${fmt.date(effectiveOn, { month: true, day: true })}` : 'Active now';
  }
  function loadPlanEditor(mode) {
    const prefs = latestPlanPrefs();
    if (!prefs) return;
    planBaseline = null;
    const [kicker, title, description] = adjustCopy[mode];
    $('adjust-editor-kicker').textContent = kicker;
    $('adjust-editor-title').textContent = title;
    $('adjust-editor-description').textContent = description;
    form.querySelectorAll('[data-adjust-editor]').forEach(section => { section.hidden = section.dataset.adjustEditor !== mode; });
    $('adjust-days').value = String(prefs.days);
    $('adjust-minutes').value = String(prefs.minutes);
    $('adjust-weekdays').innerHTML = adjustDayNames.map((label, day) => `<label><input type="checkbox" name="weekday" value="${day}" ${prefs.weekdays.includes(day) ? 'checked' : ''}><span>${label}</span></label>`).join('');
    $('adjust-level-options').innerHTML = account.training().map(type => `<label class="rp-option-row ${type.level <= 1 ? 'is-unavailable' : ''}"><input type="radio" name="lowerType" value="${escape(type.id)}" ${type.level <= 1 ? 'disabled' : ''}><span class="rp-option-mark"></span><span><strong>${escape(type.title)}</strong><small>Level ${type.level} ${type.level > 1 ? `→ Level ${type.level - 1}` : '· already at the introductory level'}</small></span></label>`).join('');
    $('adjust-types').innerHTML = account.training().map(type => `<label class="rp-option-row"><input type="checkbox" name="mix" value="${escape(type.id)}" ${prefs.mix.includes(type.id) ? 'checked' : ''}><span class="rp-option-mark"></span><span><strong>${escape(type.title)}</strong><small>Current level ${type.level}</small></span></label>`).join('');
    $('adjust-goals').innerHTML = goalOptions.map(([id, label]) => `<label class="rp-option-row"><input type="radio" name="goal" value="${id}" ${prefs.goal === id ? 'checked' : ''}><span class="rp-option-mark"></span><span><strong>${label}</strong></span></label>`).join('');
    planBaseline = planDraft();
    $('adjust-error').hidden = true;
    $('save-plan').textContent = 'Save Changes';
    updatePlanPreview();
  }
  function updatePlanPreview() {
    if (!planBaseline || !account) return;
    const draft = planDraft(), changed = adjustDirty(), valid =
      adjustMode === 'schedule' ? draft.weekdays.length > 0 && draft.weekdays.length >= draft.days :
      adjustMode === 'difficulty' ? account.training().some(type => type.id === draft.lowerType && type.level > 1) :
      adjustMode === 'mix' ? draft.mix.length > 0 :
      adjustMode === 'goal' ? goalOptions.some(([id]) => id === draft.goal) : false;
    const error = $('adjust-error');
    error.hidden = true;
    $('adjust-preview').replaceChildren();
    $('adjust-preview-title').textContent = changed ? 'Complete your change' : 'Your plan stays as it is';
    $('adjust-preview-detail').textContent = changed ? '' : 'Select a different option to see what will change.';
    $('adjust-preview-foot').textContent = 'Completed and started activities stay as recorded.';
    let preview = null;
    if (changed && !valid) {
      error.textContent = adjustMode === 'schedule' ? 'Choose enough available weekdays for your practice days.' : 'Choose at least one valid option.';
      error.hidden = false;
    } else if (changed && valid) {
      try {
        preview = account.adjustmentPreview(draft);
        const effective = fmt.date(preview.effectiveOn, { month: true, day: true, year: true });
        const types = account.training();
        $('adjust-preview-title').textContent =
          adjustMode === 'schedule' ? `${draft.days} ${draft.days === 1 ? 'day' : 'days'} · ${draft.minutes} minutes per practice` :
          adjustMode === 'difficulty' ? `${types.find(type => type.id === draft.lowerType).title}: Level ${types.find(type => type.id === draft.lowerType).level} → Level ${types.find(type => type.id === draft.lowerType).level - 1}` :
          adjustMode === 'mix' ? preview.preferences.mix.map(id => types.find(type => type.id === id)?.title || id).join(' · ') :
          preview.preferences.goalLabel;
        $('adjust-preview-detail').textContent = `Effective ${effective}. ${preview.supersededIds.length ? `${preview.supersededIds.length} future unstarted plan entries will be revised.` : 'The next detailed week will use these preferences when it is built.'}`;
        if (adjustMode === 'goal') $('adjust-preview-foot').textContent = `Recommended future mix: ${preview.preferences.mix.map(id => types.find(type => type.id === id)?.title || id).join(', ')}. Earlier work stays recorded.`;
        const actions = preview.actions.filter(action => action.kind === 'practice').slice(0, 5);
        $('adjust-preview').innerHTML = actions.map(action => {
          const title = types.find(type => type.id === action.activityType)?.title || action.activityType;
          const level = adjustMode === 'difficulty' && action.activityType === draft.lowerType ? action.level - 1 : action.level;
          return `<li><span>${escape(fmt.date(action.date, { weekday: true, month: true, day: true }))}</span><strong>${escape(title)}</strong><small>Level ${level} · ${action.minutes} min</small></li>`;
        }).join('');
      } catch (cause) {
        error.textContent = cause.message;
        error.hidden = false;
      }
    }
    $('save-plan').disabled = planSaving || !changed || !valid || !preview;
  }
  function openAdjustEditor(mode, force = false) {
    if (!force && (adjustMode === 'routine' ? routineDirty() : adjustDirty()) && !window.confirm('Discard your unsaved changes?')) return;
    if (planSaving || routineSaving) return;
    const recovery = account?.recovery();
    const unavailable = mode && mode !== 'routine' && (!recovery || !['Active', 'Maintenance'].includes(recovery.status));
    const subject = mode === 'schedule' ? 'schedule' : mode === 'difficulty' ? 'practice level' : mode === 'mix' ? 'practice mix' : 'goal';
    adjustMode = unavailable ? 'unavailable' : mode;
    $('adjust-home').hidden = Boolean(mode);
    $('adjust-unavailable').hidden = !unavailable;
    form.hidden = !mode || mode === 'routine' || unavailable;
    $('routine-adjust-form').hidden = mode !== 'routine';
    if (unavailable) {
      $('adjust-unavailable-title').textContent = recovery ? 'Continue your plan before editing it' : 'Start your plan first';
      $('adjust-unavailable-description').textContent = recovery
        ? `Your cycle is ${recovery.status.toLowerCase()}. Use the journey controls to resume or continue it, then return to adjust your ${subject}.`
        : `There is no active Recovery Plan to adjust. Start your journey to create one, then return here to change your ${subject}.`;
      $('adjust-unavailable-link').href = recovery ? '#overview' : '../onboarding/onboarding.html';
      $('adjust-unavailable-link').firstChild.textContent = recovery ? 'View journey controls ' : 'Start your journey ';
    } else if (mode === 'routine') loadRoutineEditor();
    else if (mode) loadPlanEditor(mode);
    else { planBaseline = null; renderAdjustment(); }
    (unavailable ? $('adjust-unavailable') : mode ? (mode === 'routine' ? $('routine-adjust-form') : form) : $('adjust-home')).scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
  }
  document.querySelectorAll('[data-adjust-path]').forEach(button => button.addEventListener('click', () => openAdjustEditor(button.dataset.adjustPath)));
  $('adjust-goal-path').addEventListener('click', () => openAdjustEditor('goal'));
  $('adjust-unavailable-back').addEventListener('click', () => openAdjustEditor(null));
  $('adjust-unavailable-link').addEventListener('click', event => {
    if (event.currentTarget.getAttribute('href') !== '#overview') return;
    event.preventDefault();
    activate('overview');
    $('recovery-control').scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
  });
  $('adjust-back').addEventListener('click', () => openAdjustEditor(null));
  $('adjust-cancel').addEventListener('click', () => openAdjustEditor(null, true));
  form.addEventListener('input', updatePlanPreview);
  form.addEventListener('change', updatePlanPreview);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (planSaving || !adjustDirty()) return;
    const mode = adjustMode, draft = planDraft();
    let preview;
    try { preview = account.adjustmentPreview(draft); }
    catch (error) { $('adjust-error').textContent = error.message; $('adjust-error').hidden = false; return; }
    if ($('save-plan').disabled) return;
    planSaving = true;
    $('save-plan').disabled = true;
    $('save-plan').textContent = 'Saving...';
    $('adjust-cancel').disabled = true;
    try {
      await new Promise(requestAnimationFrame);
      const beforeLevel = mode === 'difficulty' ? account.training().find(type => type.id === draft.lowerType)?.level : null;
      const saved = account.adjustRecovery(mode === 'difficulty' ? { ...preview.preferences, lowerType: draft.lowerType } : preview.preferences, adjustCopy[mode][3], preview.sourceRevision);
      const reloaded = await Account.load();
      const revision = reloaded.recovery()?.revisions.find(entry => entry.id === saved?.recoveryTransaction?.state?.revisions.at(-1)?.id);
      const latest = reloaded.recovery()?.current?.preferenceVersions?.at(-1);
      if (!revision || !latest || JSON.stringify(latest.value) !== JSON.stringify(preview.preferences) || (mode === 'difficulty' && reloaded.training().find(type => type.id === draft.lowerType)?.level !== beforeLevel - 1)) throw new Error('The saved plan could not be verified. Reload before trying again.');
      account = reloaded;
      planSaving = false;
      $('adjust-cancel').disabled = false;
      renderAdjustment();
      loadPlanEditor(mode);
      refresh();
      $('save-plan').textContent = 'Changes saved successfully';
      $('save-plan').disabled = true;
      routineToast('Changes saved successfully', 'Your plan has been updated.');
      setTimeout(() => { if (adjustMode === mode && !adjustDirty()) $('save-plan').textContent = 'Save Changes'; }, 3500);
    } catch (error) {
      planSaving = false;
      $('adjust-cancel').disabled = false;
      updatePlanPreview();
      routineToast('Changes could not be saved', error.message || 'Your plan was not updated. Please try again.', true);
    }
  });

  /* A focused edit of the same journal-backed routine used by Activities. */
  const routineForm = $('routine-adjust-form');
  const routineDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let routineTouched = false;
  let routineSaveState = 'idle';
  let routineToastTimer = null;
  let routineToastHideTimer = null;
  const routineMinutes = item => item?.durationMinutes ?? (Number(item?.title?.match(/^(\d{1,3})[\s-]*minutes?\b/i)?.[1]) || null);
  const routineDayLabel = days => days.length === 7 ? 'Every day' : days.length === 5 && [1, 2, 3, 4, 5].every(day => days.includes(day)) ? 'Weekdays' : routineDayNames.filter((_, day) => days.includes(day)).join(', ');
  const routineSnapshot = item => item ? { id: item.id, title: item.title, durationMinutes: routineMinutes(item), days: [...item.days].sort(), recurrence: item.recurrence || 'weekly', paused: Boolean(item.paused) } : { id: null, title: '', durationMinutes: null, days: [1, 2, 3, 4, 5], recurrence: 'weekly', paused: false };
  const routineDraft = () => ({
    id: routineBaseline?.id || null,
    title: $('routine-adjust-title').value.trim().replace(/\s+/g, ' '),
    durationMinutes: $('routine-adjust-minutes').value === '' ? null : Number($('routine-adjust-minutes').value),
    days: [...routineForm.querySelectorAll('#routine-adjust-days [aria-pressed="true"]')].map(button => Number(button.dataset.day)).sort(),
    recurrence: $('routine-adjust-recurrence').value,
    paused: $('routine-adjust-paused').checked
  });
  const routineValid = draft => Boolean(draft.title && draft.title.length <= 60 && Number.isInteger(draft.durationMinutes) && draft.durationMinutes >= 1 && draft.durationMinutes <= 180 && draft.days.length && ['weekly', 'biweekly'].includes(draft.recurrence));
  function routineDirty() {
    if (!routineBaseline || adjustMode !== 'routine') return false;
    const draft = routineDraft();
    return draft.title !== routineBaseline.title || draft.durationMinutes !== routineBaseline.durationMinutes || draft.days.join(',') !== routineBaseline.days.join(',') || draft.recurrence !== routineBaseline.recurrence || draft.paused !== routineBaseline.paused;
  }
  function updateRoutinePreview() {
    if (!routineBaseline) return;
    const draft = routineDraft(), valid = routineValid(draft), changed = routineDirty();
    const error = $('routine-adjust-error');
    error.hidden = true;
    if (routineTouched && !valid) {
      error.textContent = !draft.title ? 'Enter an activity name.' : !Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 1 || draft.durationMinutes > 180 ? 'Choose a duration from 1 to 180 minutes.' : 'Choose at least one available day.';
      error.hidden = false;
    }
    $('routine-preview-title').textContent = valid && changed ? draft.title : changed ? 'Complete your changes' : 'No changes yet';
    $('routine-preview-meta').textContent = valid && changed ? `${draft.durationMinutes} minutes · ${routineDayLabel(draft.days)} · ${draft.recurrence === 'biweekly' ? 'every other week' : 'every week'}${draft.paused ? ' · paused' : ''}` : '';
    $('routine-preview-note').textContent = draft.paused && changed ? 'This routine will pause from today. Earlier check-ins, rewards, and your recovery cycle stay as recorded.' : 'Changes apply from today. Completed activities, past self-reports, rewards, and your recovery cycle stay as recorded.';
    routineForm.querySelectorAll('[data-routine-idea]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.routineIdea === draft.title)));
    const save = $('routine-save');
    save.disabled = routineSaving || !valid || !changed;
    if (routineSaveState === 'idle') save.textContent = 'Save Changes';
  }
  function loadRoutineEditor(id) {
    if (!account) return;
    const all = account.routine().items;
    const item = all.find(entry => entry.id === id) || account.routine().primary || all[0] || null;
    routineBaseline = routineSnapshot(item);
    routineTouched = false;
    routineSaveState = 'idle';
    const select = $('routine-item-select');
    select.replaceChildren(...all.map(entry => { const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.title; return option; }));
    if (item) select.value = item.id;
    $('routine-select-wrap').hidden = all.length < 2;
    $('routine-current-title').textContent = item?.title || 'No offline activity yet';
    $('routine-current-meta').textContent = item ? `${routineMinutes(item) ? `${routineMinutes(item)} minutes · ` : ''}${routineDayLabel(item.days)} · ${item.recurrence === 'biweekly' ? 'every other week' : 'every week'}${item.paused ? ' · paused' : ''}` : 'Choose a small activity to begin.';
    $('routine-adjust-title').value = routineBaseline.title;
    $('routine-adjust-minutes').value = routineBaseline.durationMinutes ?? '';
    $('routine-adjust-recurrence').value = routineBaseline.recurrence;
    $('routine-adjust-paused').checked = routineBaseline.paused;
    $('routine-adjust-paused').disabled = !item;
    $('routine-adjust-days').innerHTML = routineDayNames.map((label, day) => `<button type="button" data-day="${day}" aria-pressed="${routineBaseline.days.includes(day)}" aria-label="${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day]}">${label}</button>`).join('');
    $('routine-adjust-error').hidden = true;
    updateRoutinePreview();
  }
  function routineToast(title, message, error = false) {
    const toast = $('routine-toast');
    clearTimeout(routineToastTimer);
    clearTimeout(routineToastHideTimer);
    $('routine-toast-title').textContent = title;
    $('routine-toast-text').textContent = message;
    toast.classList.toggle('is-error', error);
    toast.setAttribute('role', error ? 'alert' : 'status');
    toast.hidden = false;
    toast.classList.remove('is-showing', 'is-leaving');
    void toast.offsetWidth;
    toast.classList.add('is-showing');
    routineToastTimer = setTimeout(() => {
      toast.classList.remove('is-showing');
      toast.classList.add('is-leaving');
      routineToastHideTimer = setTimeout(() => { toast.hidden = true; toast.classList.remove('is-leaving'); }, 250);
    }, 4750);
  }
  $('routine-back').addEventListener('click', () => openAdjustEditor(null));
  $('routine-cancel').addEventListener('click', () => { loadRoutineEditor(); openAdjustEditor(null, true); $('adjust-routine-path').focus(); });
  $('routine-toast-close').addEventListener('click', () => { clearTimeout(routineToastTimer); clearTimeout(routineToastHideTimer); $('routine-toast').hidden = true; });
  $('routine-item-select').addEventListener('change', event => {
    if (routineDirty() && !window.confirm('Discard your unsaved changes to this activity?')) { event.target.value = routineBaseline.id; return; }
    loadRoutineEditor(event.target.value);
  });
  $('routine-adjust-days').addEventListener('click', event => {
    const button = event.target.closest('button[data-day]');
    if (!button) return;
    button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    routineTouched = true; routineSaveState = 'idle'; updateRoutinePreview();
  });
  routineForm.querySelectorAll('[data-routine-idea]').forEach(button => button.addEventListener('click', () => {
    $('routine-adjust-title').value = button.dataset.routineIdea;
    $('routine-adjust-minutes').value = button.dataset.routineMinutes;
    routineTouched = true; routineSaveState = 'idle'; updateRoutinePreview();
  }));
  routineForm.addEventListener('input', () => { routineTouched = true; routineSaveState = 'idle'; updateRoutinePreview(); });
  routineForm.addEventListener('change', () => { routineTouched = true; routineSaveState = 'idle'; updateRoutinePreview(); });
  routineForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (routineSaving) return;
    const draft = routineDraft();
    routineTouched = true;
    updateRoutinePreview();
    if (!routineValid(draft) || !routineDirty()) return;
    routineSaving = true; routineSaveState = 'saving';
    $('routine-save').disabled = true; $('routine-save').textContent = 'Saving...';
    $('routine-cancel').disabled = true;
    try {
      await new Promise(requestAnimationFrame);
      const saved = account.mutate({ type: draft.id ? 'routine.update' : 'routine.add', id: draft.id || undefined, title: draft.title, durationMinutes: draft.durationMinutes, days: draft.days, recurrence: draft.recurrence, paused: draft.paused, source: 'recovery-adjust' });
      const reloaded = await Account.load();
      const persisted = reloaded.routine().items.find(item => item.id === (draft.id || saved.id));
      if (!persisted || persisted.title !== draft.title || Number(persisted.durationMinutes) !== draft.durationMinutes || persisted.days.join(',') !== draft.days.join(',') || persisted.recurrence !== draft.recurrence || Boolean(persisted.paused) !== draft.paused) throw new Error('The saved routine could not be verified. Reload before trying again.');
      routineSaving = false;
      $('routine-cancel').disabled = false;
      loadRoutineEditor(persisted.id);
      renderAdjustment();
      routineSaveState = 'saved';
      $('routine-save').textContent = 'Changes saved successfully';
      $('routine-save').disabled = true;
      routineToast('Changes saved successfully', 'Your plan has been updated.');
      setTimeout(() => { if (routineSaveState === 'saved') { routineSaveState = 'idle'; updateRoutinePreview(); } }, 3500);
    } catch (error) {
      routineSaving = false; routineSaveState = 'idle';
      $('routine-cancel').disabled = false;
      updateRoutinePreview();
      routineToast('Changes could not be saved', error.message || 'Your offline routine was not updated. Please try again.', true);
    }
  });
  window.addEventListener('beforeunload', event => { if ((adjustMode === 'routine' ? routineDirty() : adjustDirty()) && !routineSaving && !planSaving) { event.preventDefault(); event.returnValue = ''; } });

  const recoveryAction=fn=>{try{fn();$('recovery-message').textContent='Saved to your original personal journey.';}catch(e){$('recovery-message').textContent=e.message;}};
  $('return-resume').onclick=()=>recoveryAction(()=>account.decideReturn('Resume'));
  $('return-adjust').onclick=()=>recoveryAction(()=>{account.decideReturn('Adjust');activate('adjust');});
  $('review-cycle').onclick=()=>recoveryAction(()=>account.reviewCycle($('cycle-reflection').value));
  $('next-cycle').onclick=()=>recoveryAction(()=>{account.continueRecovery('next');renderAdjustment();});
  $('maintenance-cycle').onclick=()=>recoveryAction(()=>{account.continueRecovery('maintenance');renderAdjustment();});
  for(const [id,choice]of [['resume-cycle','resume'],['archive-cycle','archive']])$(id).onclick=()=>recoveryAction(()=>account.recoveryLifecycle(choice));
  /** Presentation only: keep source records available without exposing raw IDs in the overview. */
  function renderRecoveryHistory(recovery) {
    const prettyDate=value=>value&&/^\d{4}-\d{2}-\d{2}/.test(value)?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Amman'}).format(new Date(value.slice(0,10)+'T12:00:00+03:00')):'Not recorded';
    const label=value=>({'plan.activate':'Plan created','recovery.visit':'Weekly plan continued','recovery.adjust':'Schedule adjusted','plan.adjust':'Plan adjusted','review.add':'Weekly review','recovery.continue':'New cycle started','routine.update':'Offline routine updated','recovery.lifecycle':'Cycle status updated'}[value]||String(value||'').replace(/[._-]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2'));
    const decision=value=>({accept:'Suggested plan accepted',keep:'Current plan kept',lighter:'A lighter week chosen',skip:'Review skipped'}[value]||'Weekly review recorded');
    const reason=change=>/^Interim fallback:/i.test(change.reason||'')?'The current week continued at the same or a lighter pace.':change.reason===change.action?label(change.action):change.reason||'Saved plan update';
    const reviewFor=(cycle,week)=>recovery.reviews.find(review=>(review.cycleId===cycle.id||cycle.legacy&&!review.cycleId)&&Number(review.week)===Number(week));
    const cycles=[...recovery.cycles].sort((a,b)=>b.cycleNumber-a.cycleNumber);
    const cyclesHTML=cycles.map(cycle=>{
      const weeks=Array.from({length:Math.ceil((cycle.lengthDays||28)/7)},(_,i)=>({number:i+1,...cycle.weeks?.[i+1]}));
      return `<details class="rp-history-cycle" ${cycle.id===recovery.current.id?'open':''}><summary><span class="rp-history-cycle-number">${escape(cycle.cycleNumber)}</span><span class="rp-history-cycle-title"><strong>${cycle.mode==='Maintenance'?'Maintenance':'Recovery'} cycle ${escape(cycle.cycleNumber)}</strong><small>Started ${escape(prettyDate(cycle.startDate))}</small></span><span class="rp-history-status ${cycle.status==='Active'?'is-active':''}">${escape(cycle.status)}</span><svg class="rp-history-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></summary><div class="rp-history-cycle-body"><div class="rp-history-goal"><span>Your goal</span><p>${escape(cycle.goalLabel||cycle.preferences?.goalLabel||'No goal recorded')}</p></div><ol class="rp-history-weeks">${weeks.map(week=>{
        const review=reviewFor(cycle,week.number),hasSchedule=Boolean(week.start&&week.end),current=cycle.id===recovery.current.id&&hasSchedule&&account.todayKey>=week.start&&account.todayKey<=week.end;
        return `<li class="${!hasSchedule?'is-unknown':''}${current?' is-current':''}"><span class="rp-history-week-node">${review?icon('check'):week.number}</span><div><div class="rp-history-week-heading"><h4>Week ${week.number}</h4>${current?'<span class="rp-history-current">Current week</span>':''}${review?'<span class="rp-history-reviewed">Review recorded</span>':''}</div><time>${hasSchedule?`${escape(prettyDate(week.start))} – ${escape(prettyDate(week.end))}`:'Dates not recorded'}</time><p>${review?escape(decision(review.decision||review.outcome)):hasSchedule?'Saved weekly schedule':'No saved schedule for this week.'}${review?.evidence?` · ${escape(review.evidence.completed)} of ${escape(review.evidence.due)} due practices completed`:''}</p></div></li>`;
      }).join('')}</ol>${cycle.cycleReview?.reflection?`<section class="rp-history-reflection"><h4>Cycle reflection</h4><p>${escape(cycle.cycleReview.reflection)}</p></section>`:'<p class="rp-history-review-note">Cycle reflection has not been recorded yet.</p>'}<details class="rp-history-source"><summary>Record details</summary><dl><div><dt>Cycle reference</dt><dd>${escape(cycle.id)}</dd></div>${weeks.filter(w=>w.source).map(w=>`<div><dt>Week ${w.number} schedule source</dt><dd>${escape(w.source)}</dd></div>`).join('')}${recovery.reviews.filter(v=>v.cycleId===cycle.id||cycle.legacy&&!v.cycleId).map(v=>`<div><dt>Week ${escape(v.week)} review</dt><dd>${escape(v.decision||v.outcome||'Previously saved review')}${v.evidence?.attemptIds?.length?` · Attempt references: ${escape(v.evidence.attemptIds.join(', '))}`:''}</dd></div>`).join('')}</dl></details></div></details>`;
    }).join('');
    const revisions=[...recovery.revisions].reverse();
    return `<div class="rp-history-subhead"><h3>Your cycles</h3><span>${cycles.length} ${plural(cycles.length,'cycle')}</span></div>${cyclesHTML}<details class="rp-history-changes"><summary>${icon('sliders')}<span>Plan changes</span><small>${revisions.length}</small></summary>${revisions.length?`<ol>${revisions.map(change=>`<li><span class="rp-history-change-dot"></span><div><header><strong>${escape(label(change.action))}${change.decision?' · '+escape(label(change.decision)):''}</strong><time>Effective ${escape(prettyDate(change.effectiveOn))}</time></header><p>${escape(reason(change))}</p>${change.previousPreferences?`<div class="rp-history-preference-change"><span>${escape(change.previousPreferences.days)} → ${escape(change.nextPreferences.days)} days per week</span><span>${escape(change.previousPreferences.minutes)} → ${escape(change.nextPreferences.minutes)} minutes</span></div>`:''}<details class="rp-history-source"><summary>Record details · version ${escape(change.version)}</summary><dl><div><dt>Revision reference</dt><dd>${escape(change.id)}</dd></div><div><dt>Recorded by</dt><dd>${escape(change.actorId)}</dd></div><div><dt>Recorded at</dt><dd>${escape(change.at)}</dd></div><div><dt>Original reason</dt><dd>${escape(change.reason)}</dd></div>${change.previousPreferences?`<div><dt>Previous goal</dt><dd>${escape(change.previousPreferences.goalLabel)}</dd></div><div><dt>Updated goal</dt><dd>${escape(change.nextPreferences.goalLabel)}</dd></div>`:''}</dl><ul>${recovery.actions.filter(a=>[...(change.originalActionIds||[]),...(change.actionIds||[])].includes(a.id)).map(a=>`<li>${escape(prettyDate(a.date))} · ${escape(a.activityType||a.title||a.kind)} · ${escape(a.status)}<small>${escape(a.id)}${a.completedAttemptId?' · Completed attempt: '+escape(a.completedAttemptId):''}</small></li>`).join('')}</ul></details></div></li>`).join('')}</ol>`:'<p>No plan changes saved yet.</p>'}</details>`;
  }

  function renderRecovery(){
    const r=account.recovery();$('recovery-control').hidden=!r;if(!r)return;
    $('recovery-status-title').textContent=`${r.status} · Cycle ${r.current.cycleNumber}${r.current.mode==='Maintenance'?' · lighter maintenance':''}`;
    $('recovery-status-note').innerHTML=`${r.evidence.due?`${r.evidence.completed} of ${r.evidence.due} due practices done this week`:'Nothing due yet this week'}${window.DeepSproutUI?window.DeepSproutUI.help('this count','Completed practices and elapsed calendar days are reported separately — time passing is never counted as progress. Your history continues across cycles.'):''}`;
    $('recovery-control').dataset.status=r.status;
    const pending=r.returnNotice?.pending;$('recovery-return-summary').textContent=pending?`Welcome back. Since ${r.returnNotice.from}: ${r.returnNotice.completed} completed, ${r.returnNotice.missed} missed scheduled practices. Other days remain unknown. Resume or adjust; no backlog is assigned.`:'';
    $('return-resume').hidden=$('return-adjust').hidden=!pending;
    $('cycle-evidence').hidden=!['Cycle Review Due','Reviewed'].includes(r.status);if(!$('cycle-evidence').hidden){const evidence=r.current.cycleReview?.evidence||r.cycleEvidence;$('cycle-evidence').innerHTML='<h3>This cycle, from recorded sources</h3><ul>'+evidence.map(e=>`<li>Week ${e.week}: ${e.completed}/${e.due} due practices completed · ${e.missed} missed · ${e.routine.done} routine days self-reported${e.scheduled?'':' · No reliable scheduled practice data'}</li>`).join('')+'</ul><p>Lab remains independently eligible. Missing browser evidence is unknown, and the end date is not a recovery result.</p>'; }
    $('continuation-preview').hidden=r.status!=='Reviewed';if(r.status==='Reviewed'){$('continuation-preview').innerHTML='<h3>Your next Week 1, before you choose</h3>'+['next','maintenance'].map(choice=>{const p=account.continuationPreview(choice);return `<details ${choice==='next'?'open':''}><summary>${choice==='next'?'Next Cycle':'Maintenance'} · ${p.preferences.days} practice days · ${p.preferences.minutes} minute budget</summary><p>${escape(p.reason)}</p><ul>${p.actions.filter(a=>a.kind!=='routine').map(a=>`<li>${escape(a.date)} · ${escape(a.kind==='practice'?a.activityType+' · Level '+a.level:a.kind)}</li>`).join('')}</ul></details>`;}).join('');}
    $('cycle-review-area').hidden=r.status!=='Cycle Review Due';$('next-cycle').hidden=$('maintenance-cycle').hidden=r.status!=='Reviewed';$('resume-cycle').hidden=r.status!=='Paused';$('archive-cycle').hidden=!['Reviewed','Cancelled'].includes(r.status);$('recovery-manage').hidden=$('resume-cycle').hidden&&$('archive-cycle').hidden;
    $('weekly-review-link').hidden=!r.nextReview||account.todayKey<account.weeklyProposal(r.nextReview).opensOn||['Cancelled','Archived','Reviewed','Cycle Review Due'].includes(r.status);$('weekly-review-link').href=`../weekly-review/weekly-review.html?week=${r.nextReview||plan.week}`;
    if (adjustMode && adjustMode !== 'routine') updatePlanPreview();
    $('today-card').hidden=!['Active','Maintenance'].includes(r.status);
    $('recovery-history').innerHTML=renderRecoveryHistory(r);
  }

  /* --------------------------------------------------------------- history */

  function renderHistory() {
    const events = account.history();
    const list = $('history-list');
    $('history-empty').hidden = events.length > 0;
    let lastDay = '';
    const glyph = { plan: 'flag', adjust: 'sliders', review: 'flag', practice: 'book', invalid: 'book', routine: 'shoe', skipped: 'shoe', removed: 'shoe', baseline: 'chart' };
    // The latest eight days are shown; earlier days stay one click away.
    let days = 0;
    list.innerHTML = events.slice(0, 80).map((event, index) => {
      if (event.on !== lastDay) days += 1;
      const older = days > 8 ? ' rp-older' : '';
      const header = event.on !== lastDay
        ? `<li class="rp-timeline-day${older}">${escape(fmt.date(event.on, { weekday: true, year: true }))}</li>`
        : '';
      lastDay = event.on;
      return `${header}<li class="rp-event is-${event.kind}${older}" style="--i:${Math.min(index, 12)}"><span class="rp-event-dot">${icon(glyph[event.kind] || 'flag')}</span><div><strong>${escape(event.title)}</strong><small>${escape(event.note)}</small></div></li>`;
    }).join('');
    list.classList.remove('is-expanded');
    let more = $('history-more');
    if (days > 8) {
      if (!more) { more = document.createElement('button'); more.type = 'button'; more.id = 'history-more'; more.className = 'ds-link rp-history-more'; list.after(more); more.onclick = () => { const open = !list.classList.toggle('is-expanded') ? false : true; more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'Show fewer days' : `Show ${days - 8} earlier days`; }; }
      more.hidden = false; more.setAttribute('aria-expanded', 'false'); more.textContent = `Show ${days - 8} earlier days`;
    } else if (more) more.hidden = true;
  }

  /* ------------------------------------------------------------- lifecycle */

  function refresh() {
    const previous=plan?.cycleId;plan=account.plan();if(previous!==plan?.cycleId){selectedWeek=plan?.week||1;weekNumber=plan?.week||1;}
    renderHero();
    renderStats();
    renderRoutine();
    renderWeeks();
    renderWeekPanel();
    renderHistory();
    renderRecovery();
    renderAdjustment();
  }

  const params = new URLSearchParams(location.search);
  const requested = params.get('setup') === '1' ? 'adjust' : location.hash.slice(1);
  activate(ALIASES[requested] ? requested : 'overview', { updateHash: Boolean(ALIASES[requested]) });
  window.addEventListener('load', placeIndicator, { once: true });
  if (document.fonts?.ready) document.fonts.ready.then(placeIndicator);

  Account.load().then(loaded => {
    account = loaded;
    try{account.visitRecovery();}catch(error){$('recovery-message').textContent=error.message;}
    plan = account.plan();
    selectedWeek = plan?.week || 1;
    weekNumber = plan?.week || 1;
    renderHero();
    renderToday();
    refresh();
    if (adjustMode === 'routine') loadRoutineEditor();
    if (requested === 'adjust' || requested === 'reminder') requestAnimationFrame(() => $('panel-adjust').scrollIntoView({ block: 'start', behavior: 'instant' }));
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
