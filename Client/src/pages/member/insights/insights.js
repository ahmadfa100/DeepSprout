/**
 * Insights.
 *
 * Every figure on this page comes from DeepSproutAccount, which computes it
 * from the account's raw records. Nothing here is a literal number, and an
 * absent measurement is never drawn as zero: it gets its own state (hatched,
 * "no data", or an empty-state message).
 */
(() => {
  const Account = window.DeepSproutAccount;
  const root = document.body.dataset.root || '../../../../';
  const fmt = Account.format;
  const NAMES = Account.NAMES;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  const num = value => `<span class="ins-num">${esc(value)}</span>`;
  const plural = (count, one, many = `${one}s`) => (count === 1 ? one : many);
  const href = path => `${root}${path}`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const BADGE_ICONS = {
    measured: 'i-gauge',
    'self-reported': 'i-pencil',
    'organiser-confirmed': 'i-badge',
    'supervisor-confirmed': 'i-eye'
  };
  const badge = provenance =>
    `<span class="ins-badge" data-kind="${provenance.id}" title="${esc(provenance.label)}">${icon(BADGE_ICONS[provenance.id])}${esc(provenance.label)}</span>`;

  const button = (label, url, { quiet = false, iconName = 'i-arrow' } = {}) =>
    `<a class="ins-button${quiet ? ' is-quiet' : ''}" href="${url}">${esc(label)}${icon(iconName)}</a>`;

  const empty = (message, action) =>
    `<div class="ins-empty"><p>${message}</p>${action || ''}</div>`;

  const TYPE_ICONS = { depth: 'i-book', listening: 'i-headphones', practical: 'i-pencil', 'protected-work': 'i-shield' };
  const DAY_STATE_LABELS = {
    completed: 'Completed',
    missed: 'Missed',
    rest: 'Planned rest day',
    'not-due': 'Not due yet',
    none: 'Nothing scheduled'
  };

  let account;
  let period = 14;

  /* ------------------------------------------------------------ periods */

  /** 7 and 14 are the last N days; 28 is the plan cycle (or the last 28 days without one). */
  const usageFor = days => (days === 28 ? account.usageCycle() || account.usage(28) : account.usage(days));

  const renderCoverage = () => {
    const usage = usageFor(period);
    const target = $('ins-coverage');
    if (!usage.connected) {
      target.innerHTML = 'No browser data yet · the Chrome extension isn’t connected';
      return;
    }
    const future = usage.days.filter(day => day.state === 'future').length;
    const ticks = usage.days.map(day => `<i data-state="${day.state}"></i>`).join('');
    target.innerHTML = `<span class="ins-coverage-ticks" aria-hidden="true">${ticks}</span>
      <span>Browser data available for <strong>${usage.covered} of ${usage.total} days</strong>${future ? ` · ${future} not reached yet` : ''}</span>`;
  };

  const setPeriod = days => {
    period = days;
    document.querySelectorAll('.ins-period button').forEach((item, index) => {
      const selected = Number(item.dataset.period) === days;
      item.setAttribute('aria-pressed', String(selected));
      if (selected) item.parentElement.style.setProperty('--index', index);
    });
    renderCoverage();
    updateUsagePeriod();
  };

  /* ---------------------------------------------------------- at a glance */

  const renderGlance = () => {
    const plan = account.plan();
    const profile = account.profile();
    const cards = [];

    if (plan && profile.goal) {
      const weeks = plan.direction.map(entry => `<i class="${entry.status === 'complete' ? 'is-done' : entry.status === 'current' ? 'is-current' : ''}"></i>`).join('');
      cards.push(`<article class="ins-glance-card">
        <div class="ins-glance-top"><span class="ins-glance-label">Your goal</span></div>
        <p class="ins-glance-goal">${esc(profile.goal.label)}</p>
        <p class="ins-glance-sub">Week ${plan.week} of ${plan.weeks} · day ${plan.day} of ${plan.lengthDays}</p>
        <div class="ins-weeks" style="--weeks:${plan.weeks}" aria-hidden="true">${weeks}</div>
      </article>`);
    } else {
      cards.push(`<article class="ins-glance-card"><div class="ins-glance-top"><span class="ins-glance-label">Your goal</span></div>
        ${empty('No goal yet. You choose one during setup.', button('Start setup', href('src/pages/member/onboarding/onboarding.html'), { quiet: true }))}</article>`);
    }

    const adherence = plan ? account.adherence() : null;
    if (adherence && adherence.due) {
      const pips = account.schedule()
        .filter(day => day.action?.kind === 'practice')
        .map(day => `<i class="ins-day-mark" data-state="${day.state}"></i>`).join('');
      cards.push(`<article class="ins-glance-card">
        <div class="ins-glance-top"><span class="ins-glance-label">Plan adherence</span>${badge(adherence.provenance)}</div>
        <div class="ins-glance-figure">${num(adherence.completed)}<span>of ${adherence.due} due ${plural(adherence.due, 'practice')} this week</span></div>
        <div class="ins-pips" aria-hidden="true">${pips}</div>
      </article>`);
    } else {
      cards.push(`<article class="ins-glance-card"><div class="ins-glance-top"><span class="ins-glance-label">Plan adherence</span></div>
        ${empty(plan ? 'Nothing is due yet this week.' : 'No active plan yet, so nothing is due.')}</article>`);
    }

    const routine = account.routine();
    // Past check-ins are history: they stay visible even after an item is deleted.
    if (routine.primary || routine.monthDays) {
      cards.push(`<article class="ins-glance-card">
        <div class="ins-glance-top"><span class="ins-glance-label">Your routine</span>${badge(routine.provenance)}</div>
        <div class="ins-glance-figure">${num(routine.monthDays)}<span>${plural(routine.monthDays, 'day')} this month</span></div>
        <p class="ins-glance-sub">${routine.primary ? esc(routine.primary.title) : 'From items you have since removed'}</p>
      </article>`);
    } else {
      cards.push(`<article class="ins-glance-card"><div class="ins-glance-top"><span class="ins-glance-label">Your routine</span></div>
        ${empty('No offline routine yet.', button('Add one', href('src/pages/member/training/training.html#offline-routine'), { quiet: true }))}</article>`);
    }
    $('glance-grid').innerHTML = cards.join('');
  };

  /* ------------------------------------------------------- plan adherence */

  const shortTitle = day => {
    if (!day.action) return 'Nothing scheduled';
    if (day.action.kind === 'rest') return 'Rest day';
    if (day.action.kind === 'review') return 'Weekly review';
    return day.action.type?.title || 'Practice';
  };

  const renderAdherence = () => {
    const plan = account.plan();
    if (!plan) {
      $('adherence-body').innerHTML = empty(
        `Your plan starts after your first ${NAMES.checkIn.toLowerCase()}. Until then there is nothing scheduled, so nothing is counted.`,
        button(`Go to ${NAMES.checkIn}`, href('src/pages/member/lab/lab.html')));
      return;
    }
    const days = account.schedule();
    const adherence = account.adherence();
    const reviews = account.reviews();
    const range = `${fmt.date(days[0].date)} – ${fmt.date(days[6].date)}`;
    $('adherence-meta').innerHTML = `<span class="ins-caption">Week ${plan.week} of ${plan.weeks} · ${range}</span>${badge(adherence.provenance)}`;

    const tiles = days.map((day, index) => {
      const label = `${fmt.date(day.date, { weekday: true })} · ${shortTitle(day)} · ${DAY_STATE_LABELS[day.state]}${day.isToday ? ' · today' : ''}`;
      return `<li class="ins-day${day.isToday ? ' is-today' : ''}">
        <span class="ins-day-mark" data-state="${day.state}" style="--i:${index}" role="img" aria-label="${esc(label)}"></span>
        <span class="ins-day-name">${fmt.weekday(day.date)} ${day.date.getDate()}</span>
        <span class="ins-day-what">${esc(shortTitle(day))}</span>
        ${day.isToday ? '<span class="ins-day-today">Today</span>' : ''}
      </li>`;
    }).join('');

    const legend = Object.entries(DAY_STATE_LABELS)
      .map(([state, label]) => `<li><span class="ins-day-mark" data-state="${state}" aria-hidden="true"></span>${label}</li>`).join('');

    const restNote = adherence.restDays
      ? ` The rest ${plural(adherence.restDays, 'day is', 'days are')} not counted.`
      : '';
    const formula = adherence.due
      ? `${num(adherence.completed)} ÷ ${num(adherence.due)} due this week.${restNote}`
      : 'Nothing has been due yet this week.';

    const adjustment = reviews.lastAdjustment
      ? `<li>Last adjustment: <strong>${fmt.date(reviews.lastAdjustment.on)} — ${esc(reviews.lastAdjustment.label.toLowerCase())}</strong></li>`
      : '<li>No plan adjustments yet.</li>';
    const nextReview = reviews.nextDue ? ` · next due ${fmt.date(reviews.nextDue, { weekday: true })}` : '';

    $('adherence-body').innerHTML = `
      <ol class="ins-days" aria-label="This week's schedule">${tiles}</ol>
      <ul class="ins-legend" aria-label="Legend">${legend}</ul>
      <div class="ins-adherence-foot">
        <p class="ins-formula">${formula}</p>
        <ul class="ins-facts">
          <li>Weekly reviews: <strong>${reviews.completed} of ${reviews.expected} completed</strong>${nextReview}</li>
          ${adjustment}
          <li><a class="ins-link" href="${href('src/pages/member/recovery-plan/recovery-plan.html#history')}">Roadmap → History${icon('i-arrow')}</a></li>
        </ul>
      </div>`;
  };

  /* -------------------------------------------------------- digital usage */

  let usageCells = [];

  const describeDay = (day, limit, methodLabel) => {
    const when = `${fmt.date(day.date, { weekday: true })}${day.partial ? ' · so far today' : ''}`;
    if (day.state === 'measured') {
      const position = day.overBy
        ? `${day.overBy} min over your limit`
        : `${limit - day.minutes} min under your limit`;
      return { title: when, body: `${fmt.duration(day.minutes)} on selected sites · ${position} · ${methodLabel}` };
    }
    if (day.state === 'future') return { title: when, body: 'Not reached yet' };
    return { title: when, body: day.reason || 'No browser data' };
  };

  const renderUsage = () => {
    const usage = account.usageCycle() || account.usage(28);
    if (!usage.connected) {
      $('usage-body').innerHTML = empty(
        'No browser data yet. The Chrome extension isn’t connected, so nothing has been measured — and nothing is shown as zero.',
        button('Connect the extension', href('src/pages/member/shield/shield.html')));
      $('usage-meta').innerHTML = '';
      renderPhone();
      return;
    }
    $('usage-meta').innerHTML = badge(usage.provenance);
    const weeks = Math.ceil(usage.days.length / 7);
    const start = usage.days[0].date;

    let grid = '<span aria-hidden="true"></span>';
    for (let week = 0; week < weeks; week++) {
      const from = usage.days[week * 7].date;
      const to = usage.days[Math.min(usage.days.length, week * 7 + 7) - 1].date;
      grid += `<span class="ins-grid-colhead" aria-hidden="true"><b>W${week + 1}</b>${from.getDate()}–${to.getDate()}</span>`;
    }
    for (let row = 0; row < 7; row++) {
      grid += `<span class="ins-grid-rowhead" aria-hidden="true">${fmt.weekday(Account.addDays(start, row))}</span>`;
      for (let week = 0; week < weeks; week++) {
        const day = usage.days[week * 7 + row];
        if (!day) { grid += '<span></span>'; continue; }
        const text = describeDay(day, usage.limit, usage.methodLabel);
        grid += `<button type="button" class="ins-cell${day.isToday ? ' is-today' : ''}" tabindex="-1"
          data-key="${day.key}" data-state="${day.state}"${day.band ? ` data-band="${day.band}"` : ''}
          style="--i:${week * 3 + row}" aria-label="${esc(`${text.title} — ${text.body}`)}"
          data-title="${esc(text.title)}" data-body="${esc(text.body)}"></button>`;
      }
    }

    const tableRows = usage.days.map(day => {
      const text = describeDay(day, usage.limit, usage.methodLabel);
      return `<tr><th scope="row">${esc(text.title)}</th><td>${day.state === 'measured' ? esc(fmt.duration(day.minutes)) : 'No data'}</td><td>${esc(text.body)}</td></tr>`;
    }).join('');

    const ramp = ['under', 'within', 'near'].map(band => `<i class="ins-cell" data-band="${band}" data-state="measured"></i>`).join('');
    $('usage-body').innerHTML = `
      <div class="ins-usage">
        <div>
          <div class="ins-grid-wrap">
            <div class="ins-grid" id="usage-grid" role="group" aria-label="Daily time on selected sites, one square per day of the cycle. Use arrow keys to move between days." style="--weeks:${weeks}">${grid}</div>
          </div>
          <div class="ins-scale">
            <div class="ins-scale-row"><strong>Lighter is better.</strong><span class="ins-scale-ramp" aria-hidden="true">less ←${ramp}→ more</span></div>
            <div class="ins-scale-row">
              <span>Your limit: ${usage.limit} minutes</span>
              <span class="ins-key"><i class="ins-cell" data-band="over" data-state="measured" aria-hidden="true"></i>Over your limit</span>
              <span class="ins-key"><i class="ins-cell" data-state="no-data" aria-hidden="true"></i>No data</span>
              <span class="ins-key"><i class="ins-cell" data-state="future" aria-hidden="true"></i>Not yet reached</span>
            </div>
          </div>
        </div>
        <ul class="ins-usage-lines" id="usage-lines"></ul>
      </div>
      <div class="ins-visually-hidden"><table>
        <caption>Minutes on selected sites per day, ${fmt.date(usage.days[0].date)} to ${fmt.date(usage.days[usage.days.length - 1].date)}</caption>
        <thead><tr><th scope="col">Day</th><th scope="col">Time</th><th scope="col">Detail</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table></div>`;

    usageCells = [...document.querySelectorAll('#usage-grid .ins-cell')];
    const firstMeasured = usageCells.findIndex(cell => cell.classList.contains('is-today'));
    (usageCells[firstMeasured] || usageCells[0]).tabIndex = 0;
    bindGrid();
    renderPhone();
    renderUsageLines(usage);
    updateUsagePeriod();
  };

  /**
   * The period selector drives the coverage line and dims grid squares outside
   * the period. The three summary lines describe the grid itself — the whole
   * cycle — so they always match what the 28 squares show.
   */
  const updateUsagePeriod = () => {
    if (!usageCells.length) return;
    const inPeriod = new Set(usageFor(period).days.map(day => day.key));
    usageCells.forEach(cell => cell.classList.toggle('is-out', !inPeriod.has(cell.dataset.key)));
  };

  const renderUsageLines = usage => {
    // A scope note, not a data display: the domains in one quiet line.
    const sites = usage.sites.map(esc).join(' · ');
    const average = usage.averageMinutes === null
      ? `<li><span class="ins-big">No measured days yet</span><small>Nothing is averaged without data.</small></li>`
      : `<li><span class="ins-big">Average ${num(fmt.duration(usage.averageMinutes))} per day</span><small>across ${usage.covered} covered ${plural(usage.covered, 'day')} of ${usage.total}</small></li>`;
    $('usage-lines').innerHTML = `${average}
      <li><span class="ins-big">You passed your limit (${usage.limit} min) on ${num(usage.overLimitDays)} ${plural(usage.overLimitDays, 'day')}</span><small>${usage.start ? 'this cycle so far' : `in the last ${usage.total} days`}</small></li>
      <li class="ins-scope">Measuring ${sites} — <a href="${href('src/pages/member/shield/shield.html')}">Edit →</a></li>`;
  };

  const renderPhone = () => {
    const phone = account.phoneScreenTime();
    const box = $('phone-box');
    if (!phone) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `${icon('i-phone')}
      <div><span class="ins-caption">Phone screen time</span><div>${num(fmt.duration(phone.minutesPerDay))} <span class="ins-caption">a day</span></div></div>
      <p>You entered this yourself on ${fmt.date(phone.on)} — not combined with the above; the two are measured differently.</p>
      ${badge(phone.provenance)}`;
  };

  /* Tooltip: hover, keyboard focus and tap all show it. */
  const tooltip = $('ins-tooltip');
  let tipFor = null;
  const showTip = cell => {
    tipFor = cell;
    tooltip.innerHTML = `<b>${esc(cell.dataset.title)}</b>${esc(cell.dataset.body)}`;
    tooltip.hidden = false;
    const box = cell.getBoundingClientRect();
    const tip = tooltip.getBoundingClientRect();
    const x = Math.max(8, Math.min(innerWidth - tip.width - 8, box.left + box.width / 2 - tip.width / 2));
    const above = box.top - tip.height - 10;
    const y = above > 8 ? above : box.bottom + 10;
    tooltip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    requestAnimationFrame(() => tooltip.classList.add('is-shown'));
  };
  const hideTip = () => {
    tipFor = null;
    tooltip.classList.remove('is-shown');
    tooltip.hidden = true;
  };

  const bindGrid = () => {
    const grid = $('usage-grid');
    const weeks = Number(grid.style.getPropertyValue('--weeks')) || 4;
    usageCells.forEach((cell, index) => {
      cell.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') showTip(cell); });
      cell.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') hideTip(); });
      cell.addEventListener('focus', () => showTip(cell));
      cell.addEventListener('blur', hideTip);
      cell.addEventListener('click', () => (tipFor === cell ? hideTip() : showTip(cell)));
      cell.addEventListener('keydown', event => {
        const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: weeks, ArrowUp: -weeks };
        if (event.key === 'Escape') { hideTip(); return; }
        if (!(event.key in moves)) return;
        event.preventDefault();
        const next = usageCells[index + moves[event.key]];
        if (!next) return;
        cell.tabIndex = -1;
        next.tabIndex = 0;
        next.focus();
      });
    });
    addEventListener('scroll', () => { if (tipFor && document.activeElement !== tipFor) hideTip(); }, { passive: true });
  };

  /* ------------------------------------------------------------- training */

  const renderTraining = () => {
    const types = account.training();
    if (!types.some(type => type.level)) {
      $('training-body').innerHTML = empty(`Training levels are set after your first ${NAMES.checkIn.toLowerCase()}. No level is shown until one is earned or chosen.`);
      $('training-note').textContent = '';
      return;
    }
    $('training-meta').innerHTML = badge(types[0].provenance);
    let order = 0;
    $('training-body').innerHTML = types.map(type => {
      const notches = [];
      for (let step = 1; step <= type.maxLevel; step++) {
        notches.push(`<span class="ins-notch${step <= type.level ? ' is-on' : ''}" style="--i:${order++}"></span>`);
        if (step < type.maxLevel) notches.push(`<span class="ins-notch-link" style="--fill:${step < type.level ? 1 : 0}"></span>`);
      }
      const ticks = Array.from({ length: type.required }, (_, index) => `<i class="${index < type.validAtLevel ? 'is-on' : ''}"></i>`).join('');
      const progress = type.atMax
        ? 'Top level reached.'
        : type.eligible
          ? `Requirement met — level ${type.level + 1} is ready when you are.`
          : `${type.validAtLevel} of ${type.required} valid attempts to unlock the next level`;
      const last = type.lastAttempt
        ? `Last attempt ${fmt.date(type.lastAttempt.on)} · ${type.lastAttempt.valid ? esc(type.lastAttempt.outcome) : `not counted: ${esc(type.lastAttempt.invalidReason || type.lastAttempt.outcome)}`}`
        : 'No attempts yet.';
      return `<article class="ins-skill">
        <div class="ins-skill-head">
          <span class="ins-skill-icon">${icon(TYPE_ICONS[type.id] || 'i-book')}</span>
          <div><h3>${esc(type.title)}</h3><small>${esc(type.levelReason)}</small></div>
        </div>
        <div class="ins-level-line"><span>Level ${num(type.level)} <span class="ins-caption">of ${type.maxLevel}</span></span></div>
        <div class="ins-notches" role="img" aria-label="Level ${type.level} of ${type.maxLevel}">${notches.join('')}</div>
        <div class="ins-attempts"><div class="ins-ticks" aria-hidden="true">${ticks}</div><span>${progress}</span></div>
        <p class="ins-last">${last}</p>
        ${type.verificationNote ? `<p class="ins-note">${icon('i-info')}<span>${esc(type.verificationNote)}</span></p>` : ''}
      </article>`;
    }).join('');
    $('training-note').textContent = 'Each practice type has its own level. Progress in one never moves another.';
  };

  /* ------------------------------------------------------------ check-ins */

  const position = (value, scale) => ((value - scale.min) / (scale.max - scale.min)) * 100;
  const scaleValue = (value, scale) => `${value}${scale.unit}`;

  /** Tick spacing chosen per instrument, so the four axes visibly differ. */
  const tickStep = scale => {
    const span = scale.max - scale.min;
    if (scale.unit === '%') return 10;
    // The finest friendly step that divides the range exactly, with at most 12 ticks.
    return [1, 2, 4, 5, 10].find(step => span % step === 0 && span / step <= 12) || 1;
  };

  const axis = instrument => {
    const { scale } = instrument;
    const step = tickStep(scale);
    const ticks = [];
    for (let value = scale.min; value <= scale.max; value += step) {
      const major = scale.unit === '%' ? value % 50 === 0 : true;
      ticks.push(`<i style="left:${position(value, scale)}%"${major ? ' class="is-major"' : ''}></i>`);
    }
    const lower = scale.direction === 'lower';
    const marks = [];
    if (instrument.comparison) {
      const from = instrument.comparison.from;
      const to = instrument.comparison.to;
      const a = position(from.score, scale);
      const b = position(to.score, scale);
      marks.push(`<span class="ins-axis-bar" style="left:${Math.min(a, b)}%;width:${Math.abs(b - a)}%"></span>`);
      // Labels open away from each other so close values never collide.
      const baseSide = a <= b ? 'is-left' : 'is-right';
      const latestSide = a <= b ? 'is-right' : 'is-left';
      marks.push(`<span class="ins-axis-mark is-base ${baseSide}" style="left:${a}%"><b class="ins-num">${esc(scaleValue(from.score, scale))}</b><small>${fmt.date(from.on)}</small></span>`);
      marks.push(`<span class="ins-axis-mark is-latest ${latestSide}" style="left:${b}%"><b class="ins-num">${esc(scaleValue(to.score, scale))}</b><small>${fmt.date(to.on)}</small></span>`);
    } else if (instrument.latest) {
      marks.push(`<span class="ins-axis-mark is-latest" style="left:${position(instrument.latest.score, scale)}%"><b class="ins-num">${esc(scaleValue(instrument.latest.score, scale))}</b></span>`);
    }
    const label = instrument.comparison
      ? `${instrument.title}: ${NAMES.baseline} ${scaleValue(instrument.comparison.from.score, scale)} on ${fmt.date(instrument.comparison.from.on, { year: true })}, latest ${scaleValue(instrument.comparison.to.score, scale)} on ${fmt.date(instrument.comparison.to.on, { year: true })}, on a scale from ${scaleValue(scale.min, scale)} to ${scaleValue(scale.max, scale)}, ${scale.direction} is better.`
      : `${instrument.title}: ${scaleValue(instrument.latest.score, scale)} on a scale from ${scaleValue(scale.min, scale)} to ${scaleValue(scale.max, scale)}, ${scale.direction} is better.`;
    const self = instrument.provenance.id === 'self-reported';
    return `<div class="ins-axis${lower ? ' is-lower' : ''}${self ? ' is-self' : ''}" role="img" aria-label="${esc(label)}">
      <div class="ins-axis-track">${ticks.join('')}${marks.join('')}</div>
      <div class="ins-axis-ends"><span class="${lower ? 'is-better' : ''}">${esc(scaleValue(scale.min, scale))}</span><span class="${lower ? '' : 'is-better'}">${esc(scaleValue(scale.max, scale))}</span></div>
      <p class="ins-axis-better">${lower ? '← lower is better' : 'higher is better →'}</p>
    </div>`;
  };

  const renderCheckIns = () => {
    const instruments = account.checkIns();
    const due = account.checkInWindow();
    const anyComparison = instruments.some(item => item.comparison);
    $('checkins-eyebrow').textContent = `${NAMES.checkIn} results`;
    $('checkins-title').textContent = anyComparison ? `Since ${NAMES.baseline}` : `${NAMES.baseline[0].toUpperCase()}${NAMES.baseline.slice(1)}`;

    if (due.state === 'baseline-needed') {
      $('checkins-title').textContent = 'Not measured yet';
      $('checkins-meta').innerHTML = '';
      $('checkins-window').innerHTML = '';
      $('checkins-body').innerHTML = empty(
        `You haven’t taken your first ${NAMES.checkIn.toLowerCase()} yet. Each result appears here once it has been measured — nothing is estimated.`,
        button(`Start your ${NAMES.checkIn.toLowerCase()}`, href('src/pages/member/lab/lab.html')));
      return;
    }

    const baselineDate = instruments.find(item => item.baseline)?.baseline.on;
    $('checkins-meta').innerHTML = baselineDate ? `<span class="ins-caption">${NAMES.baseline[0].toUpperCase()}${NAMES.baseline.slice(1)} · ${fmt.date(baselineDate, { year: true })}</span>` : '';

    const tasks = due.tasks.map(task => task.title).join(' and ');
    const kind = due.kind === 'full' ? 'full check' : 'short check';
    const windowHtml = {
      upcoming: `<div class="ins-window">
          <div><p>Your next ${NAMES.checkIn.toLowerCase()} in ${num(due.daysUntilOpen)} ${plural(due.daysUntilOpen, 'day')}</p>
          <p class="ins-window-tasks">${kind[0].toUpperCase()}${kind.slice(1)}: ${esc(tasks)} · about ${due.minutes} minutes · window ${fmt.date(due.opens)} – ${fmt.date(due.closes)}</p></div>
          <span class="ins-button" role="link" aria-disabled="true">${icon('i-lock')}Re-check opens ${fmt.date(due.opens, { year: true })}</span>
        </div>`,
      open: `<div class="ins-window is-open">
          <div><p><strong>Your ${NAMES.checkIn.toLowerCase()} window is open</strong> until ${fmt.date(due.closes, { weekday: true })}.</p>
          <p class="ins-window-tasks">We’ll repeat ${esc(tasks)}. It takes about ${due.minutes} minutes.</p></div>
          ${button(`Start ${NAMES.checkIn.toLowerCase()}`, href('src/pages/member/lab/lab.html'))}
        </div>`,
      late: `<div class="ins-window is-open">
          <div><p><strong>Your ${NAMES.checkIn.toLowerCase()} window closed</strong> on ${fmt.date(due.closes)}.</p>
          <p class="ins-window-tasks">You can still take it — ${esc(tasks)}, about ${due.minutes} minutes. The result will be marked late.</p></div>
          ${button(`Start ${NAMES.checkIn.toLowerCase()}`, href('src/pages/member/lab/lab.html'))}
        </div>`,
      done: `<div class="ins-window"><p>This cycle’s ${NAMES.checkIn.toLowerCase()} is done.</p></div>`
    }[due.state] || '';
    $('checkins-window').innerHTML = windowHtml;

    $('checkins-body').innerHTML = instruments.map(item => {
      if (!item.latest) {
        return `<article class="ins-range"><div class="ins-range-meta"><h3>${esc(item.title)}</h3><small>${esc(item.kind)}</small></div>
          <p class="ins-range-status">Not measured yet.</p></article>`;
      }
      let status;
      if (item.comparison) {
        const [baseShape, latestShape] = item.provenance.id === 'self-reported' ? ['dashed ring', 'ring'] : ['hollow', 'solid'];
        status = `${NAMES.baseline[0].toUpperCase()}${NAMES.baseline.slice(1)} (${baseShape}) ${fmt.date(item.comparison.from.on, { year: true })} · ${NAMES.latest} (${latestShape}) ${fmt.date(item.comparison.to.on, { year: true })}${item.comparison.to.late ? ' · taken late' : ''}`;
      } else if (anyComparison) {
        const dueNow = (due.state === 'open' || due.state === 'late') && due.tasks.some(task => task.id === item.id);
        status = `Last measured: cycle ${item.lastMeasuredCycle}${dueNow ? ' · repeated in the check-in that is open now' : item.nextMeasured ? ` · next at the end of cycle ${item.nextMeasured.cycle}` : ''}`;
      } else if (item.nextMeasured) {
        const opens = fmt.date(item.nextMeasured.opens, { year: true });
        const inNextCheck = due.opens && item.nextMeasured.opens.getTime() === due.opens.getTime();
        const windowOpen = due.state === 'open' || due.state === 'late';
        status = inNextCheck && windowOpen
          ? 'No comparison yet — this task is repeated in the check-in that is open now'
          : inNextCheck
          ? `No comparison yet — first re-check available ${opens}`
          : `No comparison yet — measured again at the end of cycle ${item.nextMeasured.cycle}, from ${opens}`;
      } else {
        status = 'No comparison yet.';
      }
      return `<article class="ins-range">
        <div class="ins-range-meta">
          <h3>${esc(item.title)}</h3>
          <small>${esc(item.kind)}</small>
          <div>${badge(item.provenance)}</div>
        </div>
        <div class="ins-range-axis">${axis(item)}<p class="ins-range-status">${status}</p></div>
      </article>`;
    }).join('');
  };

  /* ---------------------------------------------------- beyond the screen */

  const renderBeyond = () => {
    const routine = account.routine();
    const cards = [];

    if (routine.primary || routine.monthDays) {
      const today = account.today;
      const first = new Date(today.getFullYear(), today.getMonth(), 1, 12);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0, 12);
      const done = new Set(account.routineDays(first, today));
      const offset = (first.getDay() + 6) % 7;
      const dots = [];
      for (let blank = 0; blank < offset; blank++) dots.push('<i class="is-blank"></i>');
      for (let day = 1; day <= last.getDate(); day++) {
        const key = Account.keyOf(new Date(today.getFullYear(), today.getMonth(), day, 12));
        const cls = done.has(key) ? 'is-done' : key > account.todayKey ? 'is-future' : '';
        dots.push(`<i class="${cls}" style="--i:${day}"></i>`);
      }
      cards.push(`<article class="ins-beyond-card">
        <header><h3>Offline routine</h3>${badge(routine.provenance)}</header>
        <div class="ins-glance-figure">${num(routine.monthDays)}<span>${plural(routine.monthDays, 'day')} in ${today.toLocaleDateString('en-GB', { month: 'long' })}${routine.primary ? ` · ${esc(routine.primary.title)}` : ''}</span></div>
        <div class="ins-month" role="img" aria-label="${esc(`Routine ticked on ${routine.monthDays} ${plural(routine.monthDays, 'day')} this month`)}">${dots.join('')}</div>
        <p>Each tick is your own report. It is never graded.</p>
      </article>`);
    } else {
      cards.push(`<article class="ins-beyond-card"><header><h3>Offline routine</h3></header>
        ${empty('No routine yet.', button('Add a routine item', href('src/pages/member/training/training.html#offline-routine'), { quiet: true }))}</article>`);
    }

    const initiatives = account.initiatives();
    if (initiatives.registered) {
      const items = initiatives.items.map(item => `<li>${esc(item.opportunity?.title)} · ${esc(item.opportunity?.organizer)}${item.opportunity?.verified ? '' : ' · <em>demo listing</em>'}</li>`).join('');
      cards.push(`<article class="ins-beyond-card">
        <header><h3>Initiatives</h3>${badge(initiatives.provenance)}</header>
        <div class="ins-counts">
          <div class="ins-count">${num(initiatives.registered)}<small>registered</small></div>
          <div class="ins-count">${num(initiatives.attended)}<small>attended</small></div>
          <div class="ins-count">${num(initiatives.completed)}<small>completed</small></div>
        </div>
        <p>Registering is not attending, and attending is not completing. The organiser confirms the last two.</p>
        <ul class="ins-facts">${items}</ul>
      </article>`);
    } else {
      cards.push(`<article class="ins-beyond-card"><header><h3>Initiatives</h3></header>
        ${empty('You haven’t joined an initiative yet.', button('Browse initiatives', href('src/pages/member/explore/explore.html'), { quiet: true }))}</article>`);
    }

    const experiences = account.experiences();
    cards.push(`<article class="ins-beyond-card">
      <header><h3>Outdoor experiences</h3>${experiences.registered ? badge(experiences.provenance) : ''}</header>
      ${experiences.registered
        ? `<div class="ins-counts"><div class="ins-count">${num(experiences.registered)}<small>registered</small></div><div class="ins-count">${num(experiences.attended)}<small>attended</small></div><div class="ins-count">${num(experiences.completed)}<small>completed</small></div></div>`
        : `<p>None yet.</p>${button('Find an experience', href('src/pages/member/explore/explore.html'), { quiet: true, iconName: 'i-compass' })}`}
    </article>`);

    $('beyond-body').innerHTML = cards.join('');
  };

  /* ------------------------------------------------------------ next steps */

  const renderNext = () => {
    const steps = account.nextSteps(root);
    $('next-body').innerHTML = steps.length
      ? steps.map(step => `<li class="ins-step"><p>${esc(step.reason)}</p>${button(step.action, step.href)}</li>`).join('')
      : `<li>${empty('Nothing needs your attention right now.')}</li>`;
  };

  /* ------------------------------------------------------------- motion */

  const enableReveal = () => {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    document.body.classList.add('ins-motion');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(section => observer.observe(section));
  };

  /* -------------------------------------------------------------- start */

  document.querySelectorAll('.ins-period button').forEach(item =>
    item.addEventListener('click', () => setPeriod(Number(item.dataset.period))));

  Account.load().then(loaded => {
    account = loaded;
    renderGlance();
    renderAdherence();
    renderUsage();
    renderTraining();
    renderCheckIns();
    renderBeyond();
    renderNext();
    setPeriod(period);
    enableReveal();
    $('insights').setAttribute('aria-busy', 'false');
  }).catch(() => {
    $('insights').setAttribute('aria-busy', 'false');
    $('ins-coverage').textContent = 'No data loaded.';
    const error = $('ins-error');
    error.hidden = false;
    error.textContent = 'We couldn’t load your data, so nothing is shown rather than zeros. If you opened this file directly from disk, serve the Client folder locally (see README) and reload.';
    document.querySelectorAll('.ins-section').forEach(section => { section.hidden = true; });
  });
})();
