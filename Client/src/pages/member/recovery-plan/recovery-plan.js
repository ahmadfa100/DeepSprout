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
      const note = kind === 'practice' ? `${day.action.minutes} minute budget · level ${day.action.level} · ${STATE_LABELS[day.state].toLowerCase()}`
        : kind === 'review' ? `A few short questions · ${STATE_LABELS[day.state].toLowerCase()}`
          : 'A day off is part of the plan, not a gap in it.';
      const cta = kind === 'practice' && day.isToday && !['completed','cancelled','rescheduled','paused'].includes(day.state) && ['Active','Maintenance'].includes(plan.status||'Active')
        ? `<a class="rp-button rp-button-primary rp-button-small" href="../training/training.html?session=${session}">Start ${icon('arrow')}</a>`
        : kind === 'review' && !future && day.state !== 'completed' && ['Active','Maintenance'].includes(plan.status||'Active')
          ? `<a class="rp-button rp-button-primary rp-button-small" href="../weekly-review/weekly-review.html">Open review ${icon('arrow')}</a>`
          : '';
      planned = `<div class="rp-planned is-${kind}">
        <span class="rp-stat-icon ${kind === 'practice' ? 'rp-gold' : 'rp-sage'}">${icon(glyph)}</span>
        <div><small>${kind === 'practice' ? 'Required personal practice' : kind === 'review' ? 'Planned' : 'Rest day'}</small><h4>${escape(title)}</h4><p>${escape(note)}</p></div>${cta}</div>`;
    }

    const additionalReview=day.actions?.find(a=>a.kind==='review'&&day.action?.kind!=='review');if(additionalReview)planned+=`<p>Also scheduled: Weekly Review · ${escape(additionalReview.dueOn||day.key)}. <a href="../weekly-review/weekly-review.html?week=${additionalReview.week}">Open review</a></p>`;
    const attempts = account.attemptsOn(day.date).map(attempt =>
      `<li class="is-${attempt.valid ? 'done' : 'open'}"><span>${escape(attempt.type?.title || attempt.title || 'Practice')}</span><b>${attempt.valid ? escape(attempt.outcome) : 'Not counted'}</b></li>`).join('');
    const routineRows = account.routine().items.concat([])
      .filter(item => account.routineScheduledOn(item, day.date) || account.routineStatusOn(item, day.date))
      .map(item => {
        const status = account.routineStatusOn(item, day.date);
        const label = status === 'done' ? 'Done' : status === 'skipped' ? 'Skipped' : future ? 'Planned' : 'Not logged';
        return `<li class="is-${status || (future ? 'planned' : 'open')}"><span>${escape(account.routineTitleOn(item,day.date))}</span><b>${label}</b></li>`;
      }).join('');

    detail.innerHTML = `
      <header><h3>${day.isToday ? 'Today' : day.date.toLocaleDateString('en-GB', { weekday: 'long' })}</h3><span>${day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</span></header>
      ${planned}
      <div class="rp-day-columns">
        <section><h4>Practices · original evidence</h4>${attempts ? `<ul class="rp-day-list">${attempts}</ul>` : `<p class="rp-detail-hint">${future ? 'Nothing yet — this day has not happened.' : 'None recorded.'}</p>`}</section>
        <section><h4>Offline routine · self-reported</h4>${routineRows ? `<ul class="rp-day-list">${routineRows}</ul>` : '<p class="rp-detail-hint">Nothing on your routine for this day.</p>'}</section>
      </div>`;
    if(day.action?.kind==='practice'&&future&&['Active','Maintenance'].includes(plan.status||'Active')&&!day.action.started&&!['Rescheduled','Cancelled'].includes(day.action.status)){
      const host=document.createElement('form');host.className='rp-reschedule';host.dataset.reschedule=day.action.id;
      host.innerHTML=`<h4>Move this future personal practice</h4><label>New date<input name="date" type="date" min="${Account.keyOf(Account.addDays(account.today,1))}" max="${Account.keyOf(plan.end)}" required></label><label>Alternative<select name="type">${Object.keys(SESSION).map(t=>`<option value="${t}" ${t===day.action.activityType?'selected':''}>${escape(t)}</option>`).join('')}</select></label><label>Reason<input name="reason" maxlength="300" required></label><button>Preview reschedule</button><p role="status"></p>`;
      host.onsubmit=event=>{event.preventDefault();const values={date:host.elements.date.value,type:host.elements.type.value,reason:host.elements.reason.value};host.querySelector('p').textContent=`Preview: ${day.key} → ${values.date}, ${values.type}. Original ID stays in history.`;let b=host.querySelector('[data-confirm-reschedule]');if(!b){b=document.createElement('button');b.type='button';b.dataset.confirmReschedule='';b.textContent='Confirm reschedule';host.append(b);}b.onclick=()=>{try{account.rescheduleRecovery(day.action.id,values.date,values.type,values.reason);}catch(e){host.querySelector('p').textContent=e.message;}};};detail.append(host);
    }
    detail.classList.remove('is-entering');
    void detail.offsetWidth;
    detail.classList.add('is-entering');
  }

  $('previous-week').addEventListener('click', () => { weekNumber -= 1; selectedDay = null; renderWeekPanel(); });
  $('next-week').addEventListener('click', () => { weekNumber += 1; selectedDay = null; renderWeekPanel(); });

  /* ---------------------------------------------------------------- adjust */

  const form=$('adjust-form');let adjustment=null;
  const selection=()=>({goal:$('adjust-goal').value,days:Number($('adjust-days').value),minutes:Number($('adjust-minutes').value),commitment:$('adjust-commitment').value,weekdays:[...form.querySelectorAll('[name=weekday]:checked')].map(b=>Number(b.value)),mix:[...form.querySelectorAll('[name=mix]:checked')].map(b=>b.value),lowerType:$('adjust-lower').value||null});
  function renderAdjustment(){
    const r=account.recovery();if(!r)return;const p=r.adjustmentDraft?.preferences||r.preferences;const focus=r.adjustmentDraft?.focus||readStored('deepsprout-recovery-focus','depth');const radio=form.querySelector(`[name=focus][value="${focus}"]`);if(radio)radio.checked=true;if(r.adjustmentDraft)$('adjust-reason').value=r.adjustmentDraft.reason;
    if(!$('adjust-goal').querySelector(`option[value="${p.goal}"]`)){const o=document.createElement('option');o.value=p.goal;o.textContent=p.goalLabel;$('adjust-goal').append(o);}
    $('adjust-goal').value=p.goal;$('adjust-days').value=p.days;$('adjust-minutes').value=p.minutes;$('adjust-commitment').value=p.commitment;
    $('adjust-weekdays').innerHTML=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,n)=>`<label><input type="checkbox" name="weekday" value="${n}" ${p.weekdays.includes(n)?'checked':''}>${d}</label>`).join('');
    $('adjust-types').innerHTML=account.training().map(t=>`<label><input type="checkbox" name="mix" value="${t.id}" ${p.mix.includes(t.id)?'checked':''}>${escape(t.title)}</label>`).join('');
    $('adjust-lower').innerHTML='<option value="">Keep current independent levels</option>'+account.training().filter(t=>t.level>1).map(t=>`<option value="${t.id}">${escape(t.title)}: ${t.level} → ${t.level-1}</option>`).join('');
  }
  form.addEventListener('change',event=>{if(event.target.name==='focus'){const focus=event.target.value,type={depth:'depth',stillness:'protected-work',offline:'practical'}[focus];form.querySelectorAll('[name=mix]').forEach(b=>b.checked=b.value===type);$('adjust-reason').value=`Prefer ${focus==='offline'?'offline activity':focus==='stillness'?'fewer reflex pickups':'deeper focus'} in eligible future practice`;}});
  form.oninput=()=>{adjustment=null;$('confirm-plan').hidden=true;$('adjust-preview').textContent='Preview again before confirming changed inputs.';};
  form.addEventListener('submit',event=>{event.preventDefault();try{if(!$('adjust-reason').value.trim())throw new Error('Explain this future change.');const input=selection();account.saveRecoveryPreview(input,$('adjust-reason').value,form.querySelector('[name=focus]:checked')?.value);adjustment=account.adjustmentPreview(input);$('adjust-preview').innerHTML=`<li class="rp-preview-head"><strong>Effective ${escape(adjustment.effectiveOn)}</strong><span>${adjustment.supersededIds.length} future unstarted ${adjustment.supersededIds.length===1?'day':'days'} replaced · past work stays intact</span></li>`+adjustment.actions.filter(a=>a.kind!=='routine').map(a=>`<li class="rp-preview-day is-${a.kind}" data-type="${escape(a.activityType||a.kind)}"><span class="rp-preview-date">${escape(fmt.date(a.date,{weekday:true}))}</span><strong>${escape(a.kind==='practice'?(account.training().find(t=>t.id===a.activityType)?.title||a.activityType):a.kind==='rest'?'Rest day':a.kind==='review'?'Weekly review':a.kind)}</strong>${a.kind==='practice'?`<small>Level ${a.level}</small>`:''}</li>`).join('');$('confirm-plan').hidden=false;$('save-note').textContent='Saved preview. Confirm the future revision to apply it; the schedule is unchanged.';}catch(e){$('save-note').textContent=e.message;}});
  $('confirm-plan').onclick=()=>{if(!adjustment)return;try{account.adjustRecovery({...adjustment.preferences,lowerType:adjustment.lowerType},$('adjust-reason').value,adjustment.sourceRevision);adjustment=null;$('confirm-plan').hidden=true;$('save-note').textContent='Future revision saved. Original attempts, past missed work and external obligations were preserved.';renderAdjustment();}catch(e){$('save-note').textContent=e.message;}};
  const recoveryAction=fn=>{try{fn();$('recovery-message').textContent='Saved to your original personal journey.';}catch(e){$('recovery-message').textContent=e.message;}};
  $('return-resume').onclick=()=>recoveryAction(()=>account.decideReturn('Resume'));
  $('return-adjust').onclick=()=>recoveryAction(()=>{account.decideReturn('Adjust');activate('adjust');});
  $('review-cycle').onclick=()=>recoveryAction(()=>account.reviewCycle($('cycle-reflection').value));
  $('next-cycle').onclick=()=>recoveryAction(()=>{account.continueRecovery('next');renderAdjustment();});
  $('maintenance-cycle').onclick=()=>recoveryAction(()=>{account.continueRecovery('maintenance');renderAdjustment();});
  for(const [id,choice]of [['pause-cycle','pause'],['resume-cycle','resume'],['cancel-cycle','cancel'],['archive-cycle','archive']])$(id).onclick=()=>recoveryAction(()=>account.recoveryLifecycle(choice,$('cycle-reason').value));
  $('recovery-clock-form').onsubmit=event=>{event.preventDefault();recoveryAction(()=>{account.setDemoClock($('recovery-clock').value+'T12:00:00+03:00');account.visitRecovery();});};
  function renderRecovery(){
    const r=account.recovery();$('recovery-control').hidden=!r;if(!r)return;
    $('recovery-status-title').textContent=`${r.status} · Cycle ${r.current.cycleNumber}${r.current.mode==='Maintenance'?' · lighter maintenance':''}`;
    $('recovery-status-note').innerHTML=`${r.evidence.due?`${r.evidence.completed} of ${r.evidence.due} due practices done this week`:'Nothing due yet this week'}${window.DeepSproutUI?window.DeepSproutUI.help('this count','Completed practices and elapsed calendar days are reported separately — time passing is never counted as progress. Your history continues across cycles.'):''}`;
    $('recovery-control').dataset.status=r.status;
    const pending=r.returnNotice?.pending;$('recovery-return-summary').textContent=pending?`Welcome back. Since ${r.returnNotice.from}: ${r.returnNotice.completed} completed, ${r.returnNotice.missed} missed scheduled practices. Other days remain unknown. Resume or adjust; no backlog is assigned.`:'';
    $('return-resume').hidden=$('return-adjust').hidden=!pending;
    $('cycle-evidence').hidden=!['Cycle Review Due','Reviewed'].includes(r.status);if(!$('cycle-evidence').hidden){const evidence=r.current.cycleReview?.evidence||r.cycleEvidence;$('cycle-evidence').innerHTML='<h3>This cycle, from recorded sources</h3><ul>'+evidence.map(e=>`<li>Week ${e.week}: ${e.completed}/${e.due} due practices completed · ${e.missed} missed · ${e.routine.done} routine days self-reported${e.scheduled?'':' · No reliable scheduled practice data'}</li>`).join('')+'</ul><p>Lab remains independently eligible. Missing browser evidence is unknown, and the end date is not a recovery result.</p>'; }
    $('continuation-preview').hidden=r.status!=='Reviewed';if(r.status==='Reviewed'){$('continuation-preview').innerHTML='<h3>Your next Week 1, before you choose</h3>'+['next','maintenance'].map(choice=>{const p=account.continuationPreview(choice);return `<details ${choice==='next'?'open':''}><summary>${choice==='next'?'Next Cycle':'Maintenance'} · ${p.preferences.days} practice days · ${p.preferences.minutes} minute budget</summary><p>${escape(p.reason)}</p><ul>${p.actions.filter(a=>a.kind!=='routine').map(a=>`<li>${escape(a.date)} · ${escape(a.kind==='practice'?a.activityType+' · Level '+a.level:a.kind)}</li>`).join('')}</ul></details>`;}).join('');}
    $('cycle-review-area').hidden=r.status!=='Cycle Review Due';$('next-cycle').hidden=$('maintenance-cycle').hidden=r.status!=='Reviewed';$('pause-cycle').hidden=!['Active','Maintenance'].includes(r.status);$('resume-cycle').hidden=r.status!=='Paused';$('archive-cycle').hidden=!['Reviewed','Cancelled'].includes(r.status);$('cancel-cycle').disabled=['Cancelled','Archived','Reviewed'].includes(r.status);
    $('weekly-review-link').hidden=!r.nextReview||account.todayKey<account.weeklyProposal(r.nextReview).opensOn||['Cancelled','Archived','Reviewed','Cycle Review Due'].includes(r.status);$('weekly-review-link').href=`../weekly-review/weekly-review.html?week=${r.nextReview||plan.week}`;
    $('save-plan').disabled=!['Active','Maintenance'].includes(r.status);if($('save-plan').disabled)$('confirm-plan').hidden=true;
    $('recovery-clock').value=account.todayKey;$('today-card').hidden=!['Active','Maintenance'].includes(r.status);
    $('recovery-history').innerHTML=r.cycles.map(c=>`<details><summary>Cycle ${c.cycleNumber} · ${escape(c.mode)} · ${escape(c.status)} · ${escape(c.startDate)}</summary><p>Original goal: ${escape(c.goalLabel||c.preferences.goalLabel)}. ${escape(c.id)}</p><p>${escape(c.cycleReview?.reflection||'No completed cycle review recorded.')}</p><ul>${Array.from({length:Math.ceil(c.lengthDays/7)},(_,i)=>c.weeks[i+1]||{number:i+1,start:'Not detailed',end:'No reliable scheduled data',source:'No historical obligations invented'}).map(w=>`<li>Week ${w.number}: ${escape(w.start)}–${escape(w.end)} · ${escape(w.source||'Original schedule')}</li>`).join('')}</ul>${r.reviews.filter(v=>v.cycleId===c.id||c.legacy&&!v.cycleId).map(v=>`<p>Week ${v.week} review: ${escape(v.decision||v.outcome||'Legacy decision')} · ${v.evidence?`${v.evidence.completed}/${v.evidence.due} due practices · sources ${escape(v.evidence.attemptIds.join(', ')||'none')}`:'Legacy source details unchanged'}</p>`).join('')}</details>`).join('')+`<details><summary>Attributed schedule revisions (${r.revisions.length})</summary>${r.revisions.map(v=>`<details><summary>Revision ${v.version} · ${escape(v.action)}${v.decision?' / '+escape(v.decision):''} · effective ${escape(v.effectiveOn)}</summary><p>${escape(v.id)} · actor ${escape(v.actorId)} · ${escape(v.at)} · ${escape(v.reason)}</p>${v.previousPreferences?`<p>Prior goal ${escape(v.previousPreferences.goalLabel)} / ${v.previousPreferences.days} days → ${escape(v.nextPreferences.goalLabel)} / ${v.nextPreferences.days} days</p>`:''}<ul>${r.actions.filter(a=>[...(v.originalActionIds||[]),...(v.actionIds||[])].includes(a.id)).map(a=>`<li>${escape(a.date)} · ${escape(a.kind)} ${escape(a.activityType||a.title||'')} · ${escape(a.status)} · ${escape(a.id)}${a.completedAttemptId?' · completed source '+escape(a.completedAttemptId):''}</li>`).join('')}</ul></details>`).join('')}</details>`;
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
    renderAdjustment();
    if (requested === 'journey') $('journey').scrollIntoView({ block: 'start' });
    window.addEventListener('deepsprout:account', () => { refresh(); renderToday(); });
  }).catch(() => {
    $('today-card').hidden = true;
    const empty = $('empty-plan');
    empty.hidden = false;
    empty.querySelector('h2').textContent = 'Your roadmap couldn’t be loaded';
    empty.querySelector('p').textContent = 'Nothing is shown rather than made-up progress. If you opened this file directly, serve the Client folder locally and reload.';
  });
  const renderShield=()=>{const v=window.DeepSproutShield?.view();$('recovery-shield-status').innerHTML=`Optional browser support: <strong>${escape(v?.state||'Unverified')}</strong>${window.DeepSproutUI?window.DeepSproutUI.help('browser support','Digital Shield is separate from your scheduled practices. It never completes a practice and does not prove scrolling went down.'):''}`;};
  window.addEventListener('deepsprout:shield',renderShield);renderShield();
})();
