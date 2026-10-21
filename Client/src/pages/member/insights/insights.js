/**
 * Insights.
 *
 * Every figure on this page comes from DeepSproutAccount, which computes it
 * from the account's raw records. Nothing here is a literal number, and an
 * absent measurement is never drawn as zero: it gets its own state (hatched,
 * "no data", or an empty-state message).
 */
(() => {
  if (window.DeepSproutPersonal?.denied()) { try { window.DeepSproutPersonal.requireAccess(); } catch {} return; }
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

  // Secondary explanations live behind an accessible "?" toggletip, never in the main copy.
  const help = (label, text, title = '') => window.DeepSproutUI ? window.DeepSproutUI.help(label, text, title) : '';
  /** A compact empty state: icon, one line, one action. */
  const compactEmpty = (iconName, title, line, action = '') =>
    `<div class="ds-empty"><span class="ds-empty-icon">${icon(iconName)}</span><p class="ds-empty-copy"><strong>${title}</strong><span>${line}</span></p>${action}</div>`;

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
  const usageFor = days => account.browserUsage(days);

  const renderCoverage = () => {
    const usage=usageFor(period);
    $('ins-coverage').innerHTML=usage.available
      ?`<span class="ins-coverage-ticks" aria-hidden="true">${usageDays(usage).map(day=>`<i data-state="${day.seconds===null?'no-data':'measured'}"></i>`).join('')}</span><span>Browser data on <strong>${usage.periods.length} of ${period}</strong> days</span>${help('browser data coverage',`Partially observed browser periods, ${usage.from} – ${usage.to}, on this device’s calendar (separate from the planning demo clock). ${usage.coverage}`)}`
      :`<span>No browser data yet</span>${help('browser data coverage','No browser usage data available. The Digital Shield extension has not observed the sites you chose in this period. Missing observations are unknown, never zero.')}`;
  };

  const setPeriod = days => {
    period = days;
    document.querySelectorAll('.ins-period button').forEach((item, index) => {
      const selected = Number(item.dataset.period) === days;
      item.setAttribute('aria-pressed', String(selected));
      if (selected) item.parentElement.style.setProperty('--index', index);
    });
    renderCoverage();
    renderUsage();
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
      // Current first-run contract: setup → four starting-point checks → activation.
      $('adherence-body').innerHTML = compactEmpty('i-flag', 'No active Recovery Plan yet',
        'Your week appears here once your plan is active. Until then nothing is scheduled, so nothing is counted.',
        `<a class="ds-btn" data-size="sm" href="${href('src/pages/member/onboarding/onboarding.html')}">Continue setup${icon('i-arrow')}</a>`);
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

  /** One entry per device-calendar day of the period; unobserved days stay null (unknown, not zero). */
  const usageDays = usage => {
    const byDay = new Map(usage.periods.map(p => [p.day, p]));
    const from = Account.parse(usage.from), days = Account.daysBetween(from, Account.parse(usage.to)) + 1;
    return Array.from({ length: days }, (_, index) => {
      const date = Account.addDays(from, index), key = Account.keyOf(date), p = byDay.get(key);
      return { date, key, period: p || null, seconds: p ? Object.values(p.seconds).reduce((a, b) => a + b, 0) : null, isToday: index === days - 1 };
    });
  };
  const minutes = seconds => seconds < 60 ? `${Math.round(seconds)}s` : fmt.duration(seconds / 60);

  const renderUsage = () => {
    const usage=usageFor(period),live=window.DeepSproutShield?.view();
    const threshold=usage.thresholdSeconds===null?null:usage.thresholdSeconds<60?`${usage.thresholdSeconds} seconds (short demo interval)`:`${usage.thresholdSeconds/60} min`;
    usageCells=[];renderCoverage();
    $('usage-meta').innerHTML=`<span class="ds-chip" data-tone="quiet">${icon('i-globe')}Browser-observed</span>${help('how website time is measured',`${usage.source}. Active time on the selected websites in this browser only — not phone apps, not Reels counts, not attention.`)}`;
    if(!usage.available){
      $('usage-body').innerHTML=compactEmpty('i-globe','No browser usage data available','Connect the Digital Shield extension to see time on the sites you choose. Days without data stay unknown — never zero.',`<a class="ds-btn" data-size="sm" href="${href('src/pages/member/shield/shield.html')}">Set up Digital Shield${icon('i-arrow')}</a>`);
      renderPhone();return;
    }
    const days=usageDays(usage),observed=days.filter(d=>d.seconds!==null),max=Math.max(...observed.map(d=>d.seconds),1);
    const band=sec=>{const r=usage.thresholdSeconds?sec/usage.thresholdSeconds:sec/max;return usage.thresholdSeconds&&r>1?'over':r<.4?'under':r<.8?'within':'near';};
    const weeks=Math.ceil(days.length/7);
    // Calendar orientation: seven weekday columns, one row per week of the period.
    let grid='<span aria-hidden="true"></span>'+Array.from({length:7},(_,c)=>`<span class="ins-grid-colhead" aria-hidden="true">${fmt.weekday(Account.addDays(days[0].date,c))}</span>`).join('');
    for(let week=0;week<weeks;week++){
      const a=days[week*7].date,b=days[Math.min(days.length,week*7+7)-1].date;
      grid+=`<span class="ins-grid-rowhead" aria-hidden="true"><b>${a.getDate()}–${b.getDate()}</b></span>`;
      for(let col=0;col<7;col++){
        const day=days[week*7+col];if(!day){grid+='<span></span>';continue;}
        const title=fmt.date(day.date,{weekday:true});
        const body=day.seconds===null?'No browser data — unknown, not zero':`${minutes(day.seconds)} on selected sites${usage.thresholdSeconds?` · ${day.seconds>usage.thresholdSeconds?'over':'within'} your shared reminder`:''}`;
        grid+=`<button type="button" class="ins-cell${day.isToday?' is-today':''}" tabindex="-1" data-key="${day.key}" data-state="${day.seconds===null?'no-data':'measured'}"${day.seconds===null?'':` data-band="${band(day.seconds)}"`} style="--i:${week*7+col}" aria-label="${esc(`${title} — ${body}`)}" data-title="${esc(title)}" data-body="${esc(body)}"></button>`;
      }
    }
    const perSite=usage.sites.map(site=>[site,usage.periods.reduce((n,p)=>n+(p.seconds[site]||0),0)]).sort((a,b)=>b[1]-a[1]);
    const siteBars=perSite.map(([site,sec])=>`<li class="ins-site"><span>${esc(site)}</span><b class="ins-num">${minutes(sec)}</b><span class="ds-meter-track" aria-hidden="true"><span class="ds-meter-fill" style="--value:${(sec/Math.max(usage.totalSeconds,1)).toFixed(3)}"></span></span></li>`).join('');
    const ramp=['under','within','near'].map(b=>`<i class="ins-cell" data-band="${b}" data-state="measured"></i>`).join('');
    const rows=usage.periods.map(p=>`<tr><th scope="row">${esc(p.day)}<br><small>${esc(p.timezone)}</small></th><td>${(p.observedSeconds/60).toFixed(2)} min</td><td>${Object.entries(p.seconds).map(([site,seconds])=>`${esc(site)}: ${(seconds/60).toFixed(2)} min`).join('<br>')}</td><td>Partial · ${p.samples} eligible intervals · ${p.gaps} excluded / uncertain gaps<br>${esc(p.reminderState)} · ${p.configVersions.length} configuration version(s)<br>${Object.entries(p.gapReasons||{}).map(([reason,count])=>`${esc(reason)}: ${count}`).join('; ')}<br>Observed endpoints ${esc(new Date(p.firstObservation).toLocaleTimeString())} – ${esc(new Date(p.lastObservation).toLocaleTimeString())}; unavailable durations are unknown.</td></tr>`).join('');
    $('usage-body').innerHTML=`<div class="ins-usage ins-browser-usage">
        <div>
          <div class="ins-grid-wrap"><div class="ins-grid ins-cal" id="usage-grid" role="group" aria-label="Observed time on selected sites, one square per day. Use arrow keys to move between days." style="--weeks:7">${grid}</div></div>
          <div class="ins-scale">
            <div class="ins-scale-row"><strong>Lighter is less time.</strong><span class="ins-scale-ramp" aria-hidden="true">less ${ramp} more</span></div>
            <div class="ins-scale-row">${usage.thresholdSeconds?`<span class="ins-key"><i class="ins-cell" data-band="over" data-state="measured" aria-hidden="true"></i>Over your reminder</span>`:''}<span class="ins-key"><i class="ins-cell" data-state="no-data" aria-hidden="true"></i>No data</span></div>
          </div>
        </div>
        <ul class="ins-usage-lines">
          <li><span class="ins-big"><span class="ins-num">${minutes(usage.totalSeconds)}</span> observed</span><span class="ins-caption">across ${observed.length} ${plural(observed.length,'day')} with browser data</span></li>
          <li class="ins-sites-li"><span class="ins-caption">By website</span><ul class="ins-sites">${siteBars}</ul></li>
          <li><span class="ins-caption">Shared reminder</span><span>${threshold?`${esc(threshold)} across ${esc(usage.configuredSites.join(', ')||'no sites')}`:'Not set'}</span></li>
          <li class="ins-scope"><a href="${href('src/pages/member/shield/shield.html')}">Digital Shield settings →</a></li>
        </ul>
      </div>
      <details class="ds-disclosure ins-usage-details"><summary>How this was measured</summary><div class="ds-disclosure-body">
        <p>${esc(usage.coverage)}</p>
        <p>Current connection: ${esc(live?.state||'Unverified')} · last successful journal sync ${esc(usage.lastSync||'unknown')} · last observation ${esc(new Date(usage.lastObservation).toLocaleString())}. Historical observations remain available when disconnected. Threshold changes keep their attributed history.</p>
        <p>${esc(usage.comparisonReason)} Domain activity is not Reels consumption, attention, phone Screen Time, Lab improvement or a recovery percentage. Records are local and not server-verified.</p>
        <div class="ins-table-wrap"><table class="ins-usage-table"><caption>Selected-domain browser observations · device calendar</caption><thead><tr><th scope="col">Period</th><th scope="col">Observed</th><th scope="col">Sites</th><th scope="col">Coverage / reminder</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div></details>`;
    usageCells=[...document.querySelectorAll('#usage-grid .ins-cell')];
    (usageCells.find(c=>c.classList.contains('is-today'))||usageCells[0]).tabIndex=0;
    bindGrid();
    renderPhone();
  };

  const renderPhone = () => {
    const phone = account.phoneScreenTime();
    const box = $('phone-box');
    if (!phone) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `${icon('i-phone')}
      <div><span class="ins-caption">Phone screen time</span><div>${num(fmt.duration(phone.minutesPerDay))} <span class="ins-caption">a day</span></div></div>
      <p>Entered by you on ${fmt.date(phone.on)}${help('phone screen time','You entered this yourself. It is never added to the browser figures above — the two are measured differently.')}</p>
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

  /** A short, human label for why a level is what it is; the full reason sits in a toggletip. */
  const levelLabel = type => {
    const reason = type.levelReason || '';
    if (/accepted the next/i.test(reason)) return 'You moved up';
    if (/lower difficulty|step(ped)? down/i.test(reason)) return 'You chose a lighter level';
    if (/stay/i.test(reason)) return 'You chose to stay';
    if (/placed|placement/i.test(reason)) return 'Placed from your starting point';
    if (/introductory|starting level|everyone starts/i.test(reason)) return 'Starting level';
    if (/chose level|preference/i.test(reason)) return 'Your chosen level';
    return reason.length > 42 ? 'Current level' : reason;
  };

  const renderTraining = () => {
    const types = account.training();
    if (!types.some(type => type.level)) {
      $('training-body').innerHTML = compactEmpty('i-book', 'Levels start with your plan', 'Each practice type gets its own level when your plan is active. No level is shown until one is earned or chosen.');
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
          <div><h3>${esc(type.title)}</h3><small>${esc(levelLabel(type))}${type.levelReason ? help(`${type.title} level`, type.levelReason) : ''}</small></div>
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
    if(!instrument.scaleCompatible)return `<div class="ins-axis-legacy"><b class="ins-num">${esc(instrument.latest.score)}</b><span>Earlier version${help(`${instrument.title} result`,`Historical raw result ${instrument.latest.score} · ${instrument.latest.version||'version not recorded'}. The current measurement scale does not apply to this protocol, so no position is drawn.`)}</span></div>`;
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
      if (from.score === to.score) {
        // Same value twice: one mark, both dates, so labels never collide.
        marks.push(`<span class="ins-axis-mark is-latest" style="left:${b}%"><b class="ins-num">${esc(scaleValue(to.score, scale))}</b><small>${fmt.date(from.on)} &amp; ${fmt.date(to.on)} · same</small></span>`);
        return axisMarkup(instrument, scale, ticks, marks, lower);
      }
      marks.push(`<span class="ins-axis-bar" style="left:${Math.min(a, b)}%;width:${Math.abs(b - a)}%"></span>`);
      // Labels open away from each other so close values never collide.
      const baseSide = a <= b ? 'is-left' : 'is-right';
      const latestSide = a <= b ? 'is-right' : 'is-left';
      marks.push(`<span class="ins-axis-mark is-base ${baseSide}" style="left:${a}%"><b class="ins-num">${esc(scaleValue(from.score, scale))}</b><small>${fmt.date(from.on)}</small></span>`);
      marks.push(`<span class="ins-axis-mark is-latest ${latestSide}" style="left:${b}%"><b class="ins-num">${esc(scaleValue(to.score, scale))}</b><small>${fmt.date(to.on)}</small></span>`);
    } else if (instrument.latest) {
      marks.push(`<span class="ins-axis-mark is-latest" style="left:${position(instrument.latest.score, scale)}%"><b class="ins-num">${esc(scaleValue(instrument.latest.score, scale))}</b></span>`);
    }
    return axisMarkup(instrument, scale, ticks, marks, lower);
  };
  const axisMarkup = (instrument, scale, ticks, marks, lower) => {
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

  /** Results produced by the presenter's scenario builder are visibly labelled as demo data. */
  const synthetic = attempt => Boolean(attempt && (attempt.measurementContext?.presentation === 'demo-scenario' || attempt.details?.some(d => d.value === 'Synthetic presentation scenario')));
  const demoChip = '<span class="ds-chip ins-demo-chip" data-tone="warning">Demo scenario</span>';

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
    const anySynthetic = instruments.some(item => item.history.some(synthetic));
    $('checkins-meta').innerHTML = `${anySynthetic ? `${demoChip}${help('demo scenario results', 'These results were created by the presentation scenario builder through the real instrument checks. They are synthetic demonstration data, not a real person’s measurements, and they are not evidence of improvement.')}` : ''}${baselineDate ? `<span class="ins-caption">${NAMES.baseline[0].toUpperCase()}${NAMES.baseline.slice(1)} · ${fmt.date(baselineDate, { year: true })}</span>` : ''}`;

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
      done: `<div class="ins-window"><p>This weekly ${NAMES.checkIn.toLowerCase()} is done. Next window: ${fmt.date(due.nextOpens)}.</p></div>`,
      missed: `<div class="ins-window"><p>The weekly window closed ${fmt.date(due.closes)}. No late backfill under the interim rule. Next free pair opens ${fmt.date(due.nextOpens)}.</p></div>`
    }[due.state] || '';
    $('checkins-window').innerHTML = windowHtml;

    $('checkins-body').innerHTML = instruments.map(item => {
      if (!item.latest) {
        if(!item.comparison&&item.history.filter(a=>a.valid===true).length>1)status=item.comparisonReason;
      return `<article class="ins-range"><div class="ins-range-meta"><h3>${esc(item.title)}</h3><small>${esc(item.kind)}</small></div>
          <p class="ins-range-status">Not measured yet.</p></article>`;
      }
      let status;
      if (item.comparison) {
        const [baseShape, latestShape] = item.provenance.id === 'self-reported' ? ['dashed ring', 'ring'] : ['hollow', 'solid'];
        status = `${NAMES.baseline[0].toUpperCase()}${NAMES.baseline.slice(1)} (${baseShape}) ${fmt.date(item.comparison.from.on, { year: true })} · ${NAMES.latest} (${latestShape}) ${fmt.date(item.comparison.to.on, { year: true })}${item.comparison.to.late ? ' · taken late' : ''}`;
      } else if (anyComparison) {
        const dueNow = (due.state === 'open' || due.state === 'late') && due.tasks.some(task => task.id === item.id);
        status = `Latest valid result: ${fmt.date(item.latest.on,{year:true})}${dueNow?' · included in this weekly window':item.nextMeasured?` · next in week ${item.nextMeasured.week}`:''}`;
      } else if (item.nextMeasured) {
        const opens = fmt.date(item.nextMeasured.opens, { year: true });
        const inNextCheck = due.opens && item.nextMeasured.opens.getTime() === due.opens.getTime();
        const windowOpen = due.state === 'open' || due.state === 'late';
        status = inNextCheck && windowOpen
          ? 'No comparison yet — this task is repeated in the check-in that is open now'
          : inNextCheck
          ? `No comparison yet — first re-check available ${opens}`
          : `No comparison yet — measured again in week ${item.nextMeasured.week}, from ${opens}`;
      } else {
        status = 'No comparison yet.';
      }
      if(!item.comparison&&item.history.filter(a=>a.valid===true).length>1)status=item.comparisonReason;
      return `<article class="ins-range">
        <div class="ins-range-meta">
          <h3>${esc(item.title)}</h3>
          <small>${esc(item.kind)}</small>
          <div>${badge(item.provenance)}${[item.baseline, item.latest].some(synthetic) ? demoChip : ''}</div>
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

    // Verified Institution initiatives: read from the shared records, never copied.
    const repo = window.DeepSproutRepo, me = repo?.me();
    const live = repo && me ? repo.selectors.myInitiatives(repo.read(), me.id) : [];
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
        <ul class="ins-facts">${items}</ul>
        <p class="ins-card-note">Organiser-confirmed${help('initiative counts','Registering is not attending, and attending is not completing. The organiser confirms the last two.')}</p>
      </article>`);
    } else if (!live.length) {
      cards.push(`<article class="ins-beyond-card"><header><h3>Initiatives</h3></header>
        ${empty('You haven’t joined an initiative yet.', button('Browse initiatives', href('src/pages/member/explore/explore.html'), { quiet: true }))}</article>`);
    }

    if (live.length) {
      const sessions = live.flatMap(entry => entry.sessions);
      const attended = sessions.filter(ss => ss.attendance && ss.attendance.status !== 'Absent').length;
      const absent = sessions.filter(ss => ss.attendance?.status === 'Absent').length;
      const excused = sessions.filter(ss => ss.display === 'Excused Absence').length;
      cards.push(`<article class="ins-beyond-card">
        <header><h3>Institution initiatives</h3><span class="ins-badge">Supervisor-confirmed</span></header>
        <div class="ins-counts">
          <div class="ins-count">${num(live.filter(entry => ['Accepted', 'Suspended', 'Completed'].includes(entry.admission.status)).length)}<small>joined</small></div>
          <div class="ins-count">${num(attended)}<small>sessions attended</small></div>
          <div class="ins-count">${num(live.filter(entry => entry.admission.status === 'Completed').length)}<small>completed</small></div>
        </div>
        <ul class="ins-facts">${live.map(entry => `<li>${esc(entry.initiative.title)} · ${esc(entry.initiative.organizer)} · ${esc(entry.admission.status)}</li>`).join('')}</ul>
        <p class="ins-card-note">${absent ? `${absent} recorded ${plural(absent, 'absence')}${excused ? ` · ${excused} excused` : ''}` : 'Attendance by the initiative’s Supervisor'}${help('initiative attendance','Attendance is recorded by the initiative’s Supervisor. An excused absence is a separate decision and never counts as attendance. Completion adds history, not a Garden object, and never changes your Lab or Recovery results.')}</p>
      </article>`);
    }

    // Independent Coach Programs: the same records the Coach and limited Student views read.
    const programs = repo && me ? repo.selectors.programHistoryFor(repo.read(), me.id) : [];
    if (programs.length) {
      cards.push(`<article class="ins-beyond-card" id="coach-programs">
        <header><h3>Coach programs</h3><span class="ins-badge">Coach-reviewed</span></header>
        <div class="ins-counts">
          <div class="ins-count">${num(programs.length)}<small>joined</small></div>
          <div class="ins-count">${num(programs.reduce((n, entry) => n + entry.approved, 0))}<small>tasks approved</small></div>
          <div class="ins-count">${num(programs.filter(entry => entry.completion?.status === 'Completed').length)}<small>completed</small></div>
        </div>
        <ul class="ins-facts">${programs.map(entry => `<li>${esc(entry.program.title)} · ${esc(entry.program.coach)} · ${esc(entry.completion ? entry.completion.status : entry.program.status)}</li>`).join('')}</ul>
        <p class="ins-card-note">From your Coach’s reviews${help('Coach programs','Approved tasks come from your Coach’s reviews. Completing a Program adds history, never a Garden object, and never changes your Lab or Recovery results.')}</p>
      </article>`);
    }

    const providerBookings=repo&&me?repo.selectors.myProviderBookings(repo.read(),me.id):[];
    if(providerBookings.length)cards.push(`<article class="ins-beyond-card" id="provider-experiences">
      <header><h3>Outdoor experiences</h3><span class="ins-badge">Supervisor-confirmed</span></header>
      <div class="ins-counts"><div class="ins-count">${num(providerBookings.length)}<small>${plural(providerBookings.length,'booking')}</small></div><div class="ins-count">${num(providerBookings.reduce((n,b)=>n+b.attendance.filter(a=>['Present','Late'].includes(a.status)).length,0))}<small>sessions attended</small></div><div class="ins-count">${num(providerBookings.filter(b=>b.completion?.status==='Completed').length)}<small>completed</small></div></div>
      <ul class="ins-facts">${providerBookings.map(b=>`<li data-booking-id="${esc(b.id)}"><strong>${esc(b.experience.title)}</strong> · ${esc(b.status)} <span class="ins-ref">Ref ${esc(b.id)}</span>${b.attendance.length?`<p>${b.attendance.map(a=>`${esc(b.experience.sessions.find(ss=>ss.id===a.sessionId)?.title||a.sessionId)}: ${esc(a.status)} <span class="ins-ref">${esc(a.id)}</span>`).join('<br>')}</p>`:''}${b.completion?`<p>Completion: ${esc(b.completion.status)} <span class="ins-ref">${esc(b.completion.id)} · criteria v${b.completion.resourceVersion}</span></p>`:''}</li>`).join('')}</ul>
      <p class="ins-card-note">Original Provider records${help('outdoor experience records','Booking and QR check-in do not award growth. Qualifying attendance and the published Camp criteria supply bounded Garden decorations; corrections stay in the original evidence history.')}</p></article>`);

    const experiences = account.experiences();
    if (!providerBookings.length || experiences.registered) cards.push(`<article class="ins-beyond-card">
      <header><h3>${providerBookings.length ? 'Sample listings' : 'Outdoor experiences'}</h3>${experiences.registered ? badge(experiences.provenance) : ''}</header>
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
  window.addEventListener('deepsprout:shield',()=>{if(account)renderUsage();});
})();
