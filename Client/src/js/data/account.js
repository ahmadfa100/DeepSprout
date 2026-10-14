/**
 * DeepSprout account data.
 *
 * The one place a page gets account figures from. It fetches a single JSON
 * record (src/data/demo-account.json or src/data/empty-account.json) and
 * exposes accessors that COMPUTE every derived value — adherence, coverage,
 * averages, over-limit days, levels, check-in eligibility — from the raw
 * records. The JSON holds events, never pre-baked answers, and pages never
 * read the raw JSON directly.
 *
 * Usage:
 *   const account = await DeepSproutAccount.load();
 *   account.adherence().completed   // 4
 *
 * Choose the account with ?account=demo|empty (remembered for the session)
 * or with DeepSproutAccount.choose('empty').
 *
 * Exposed as window.DeepSproutAccount. Load with `defer` before page scripts.
 */
(() => {
  // Loaded once per page: the member layout injects this file when a page
  // does not, so a second copy must not replace the first one's state.
  if (window.DeepSproutAccount) return;
  const SCRIPT_URL = document.currentScript?.src || location.href;
  const STORE_KEY = 'deepsprout-account-choice';
  const ACCOUNTS = {
    demo: 'demo-account.json',
    empty: 'empty-account.json'
  };

  /**
   * Display names. UI wording only — data entities and file names keep their
   * own names (assessments, lab/). Change a label here and every page follows.
   */
  const NAMES = {
    checkIn: 'Check-in',
    checkInPage: 'Your Check-in',
    baseline: 'your starting point',
    latest: 'your latest check-in'
  };

  /** Evidence provenance. Every figure on a page carries exactly one of these. */
  const PROVENANCE = {
    measured: { id: 'measured', label: 'Measured' },
    'self-reported': { id: 'self-reported', label: 'Self-reported' },
    'organiser-confirmed': { id: 'organiser-confirmed', label: 'Organiser-confirmed' },
    'supervisor-confirmed': { id: 'supervisor-confirmed', label: 'Supervisor-confirmed' }
  };

  /* ---------------------------------------------------------------- dates */

  // Calendar days are handled at local noon so a day key never slides across
  // midnight when the browser's time zone changes.
  const parse = key => (key ? new Date(`${key}T12:00:00`) : null);
  const keyOf = date => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
  const addDays = (date, amount) => {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  };
  const daysBetween = (from, to) => Math.round((parse(keyOf(to)) - parse(keyOf(from))) / 86400000);
  const range = (from, count) => Array.from({ length: count }, (_, index) => addDays(from, index));

  const format = {
    /** 72 → "1h 12m", 45 → "45m", 0 → "0m". */
    duration(minutes) {
      const total = Math.round(minutes);
      const hours = Math.floor(total / 60);
      const rest = total % 60;
      if (!hours) return `${rest}m`;
      return rest ? `${hours}h ${rest}m` : `${hours}h`;
    },
    /** "17 Jan", or "17 Jan 2026" with { year: true }, or "Sat 17 Jan" with { weekday: true }. */
    date(value, { year = false, weekday = false } = {}) {
      const date = value instanceof Date ? value : parse(value);
      if (!date) return '';
      const parts = [];
      if (weekday) parts.push(date.toLocaleDateString('en-GB', { weekday: 'short' }));
      parts.push(date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) }));
      return parts.join(' ');
    },
    weekday(value, style = 'short') {
      const date = value instanceof Date ? value : parse(value);
      return date ? date.toLocaleDateString('en-GB', { weekday: style }) : '';
    },
    /** "in 12 days", "tomorrow", "today". */
    relativeDays(days) {
      if (days === 0) return 'today';
      if (days === 1) return 'tomorrow';
      if (days === -1) return 'yesterday';
      return days > 0 ? `in ${days} days` : `${-days} days ago`;
    }
  };

  /* -------------------------------------------------------- account model */

  const createAccount = (data, choice) => {
    const today = data.account.asOf ? parse(data.account.asOf) : parse(keyOf(new Date()));
    const todayKey = keyOf(today);
    // An account with no recorded registration date was created today.
    const registeredKey = data.user.registeredOn || todayKey;
    const byId = (list, id) => list.find(item => item.id === id) || null;
    const activityType = id => byId(data.catalog.activityTypes, id);
    const definition = id => byId(data.catalog.assessmentDefinitions, id);

    /* ---- plan */

    const plan = () => {
      const raw = data.plan;
      if (!raw) return null;
      const start = parse(raw.startDate);
      const end = addDays(start, raw.lengthDays - 1);
      const day = Math.min(raw.lengthDays, Math.max(1, daysBetween(start, today) + 1));
      const weeks = Math.ceil(raw.lengthDays / 7);
      const week = Math.min(weeks, Math.ceil(day / 7));
      return {
        cycleNumber: raw.cycleNumber,
        start,
        end,
        lengthDays: raw.lengthDays,
        day,
        week,
        weeks,
        goalLabel: data.user.goal?.label || '',
        direction: raw.direction.map(entry => ({
          ...entry,
          from: addDays(start, (entry.week - 1) * 7),
          to: addDays(start, entry.week * 7 - 1),
          status: entry.week < week ? 'complete' : entry.week === week ? 'current' : 'upcoming'
        }))
      };
    };

    const weekDates = week => {
      const current = plan();
      if (!current) return [];
      return range(addDays(current.start, (week - 1) * 7), 7);
    };

    /* ---- schedule and adherence */

    const validAttemptFor = actionId =>
      data.activityAttempts.find(attempt => attempt.scheduledActionId === actionId && attempt.valid) || null;

    /**
     * One entry per day of a plan week, each in exactly one state:
     *   completed · missed · rest · not-due · none
     * A practice due today that is not yet done is `not-due`: the day is not over.
     */
    const schedule = week => {
      const current = plan();
      if (!current) return [];
      const target = week || current.week;
      return weekDates(target).map(date => {
        const key = keyOf(date);
        const action = data.scheduledActions.find(entry => entry.date === key) || null;
        const attempt = action?.kind === 'practice' ? validAttemptFor(action.id) : null;
        let state = 'none';
        if (action?.kind === 'rest') state = 'rest';
        else if (action?.kind === 'practice') {
          if (attempt) state = 'completed';
          else state = key < todayKey ? 'missed' : 'not-due';
        } else if (action?.kind === 'review') {
          const review = data.weeklyReviews.find(entry => entry.week === action.week);
          state = review ? 'completed' : key < todayKey ? 'missed' : 'not-due';
        }
        return {
          date,
          key,
          isToday: key === todayKey,
          state,
          action: action ? { ...action, type: action.activityType ? activityType(action.activityType) : null } : null,
          attempt
        };
      });
    };

    /**
     * Practices completed ÷ practices due so far this week. Rest days and
     * reviews are not counted; a practice is "due" once its day has begun.
     */
    const adherence = week => {
      const days = schedule(week).filter(day => day.action?.kind === 'practice');
      const due = days.filter(day => day.key <= todayKey);
      const completed = due.filter(day => day.state === 'completed').length;
      const missed = due.filter(day => day.state === 'missed').length;
      return {
        provenance: PROVENANCE.measured,
        completed,
        due: due.length,
        missed,
        scheduled: days.length,
        restDays: schedule(week).filter(day => day.state === 'rest').length
      };
    };

    const reviews = () => {
      const current = plan();
      const completed = data.weeklyReviews.length;
      const expected = current ? current.week : 0;
      const nextAction = data.scheduledActions.find(entry =>
        entry.kind === 'review' && entry.date >= todayKey && !data.weeklyReviews.some(review => review.week === entry.week));
      const adjustments = data.weeklyReviews.filter(review => review.adjustment).map(review => review.adjustment);
      return {
        completed,
        expected,
        nextDue: nextAction ? parse(nextAction.date) : null,
        lastAdjustment: adjustments.length
          ? { ...adjustments[adjustments.length - 1], on: parse(adjustments[adjustments.length - 1].on) }
          : null,
        history: data.weeklyReviews
      };
    };

    /* ---- offline routine (self-reported) */

    const activeRoutine = () => data.routine.filter(item => !item.removedOn);

    /** Distinct days with at least one routine item ticked done, in [from, to]. */
    const routineDays = (from, to) => {
      const fromKey = keyOf(from);
      const toKey = keyOf(to);
      const done = new Set();
      data.routine.forEach(item => item.checkIns.forEach(entry => {
        if (entry.status === 'done' && entry.date >= fromKey && entry.date <= toKey) done.add(entry.date);
      }));
      return [...done].sort();
    };

    const routine = () => {
      const items = activeRoutine();
      const current = plan();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1, 12);
      const thisWeek = current ? weekDates(current.week) : [];
      const scheduledThisWeek = thisWeek.filter(date =>
        items.some(item => !item.paused && item.days.includes(date.getDay()) && keyOf(date) >= item.createdOn)).length;
      return {
        provenance: PROVENANCE['self-reported'],
        items,
        primary: items[0] || null,
        monthDays: routineDays(monthStart, today).length,
        week: current
          ? { done: routineDays(thisWeek[0], thisWeek[6]).length, scheduled: scheduledThisWeek }
          : null
      };
    };

    /* ---- digital usage (measured by the extension) */

    const shield = data.shield;
    const usageByDay = new Map((shield.dailyUsage || []).map(entry => [entry.date, entry]));
    const limit = shield.policy?.dailyLimitMinutes || null;

    const bands = shield.policy?.bands || null;

    /** Band relative to the user's own limit, using the policy's cut-offs. Lighter is better. */
    const band = minutes => {
      if (!limit || !bands) return 'measured';
      if (minutes > limit) return 'over';
      if (minutes >= limit * bands.nearFrom) return 'near';
      if (minutes >= limit * bands.withinFrom) return 'within';
      return 'under';
    };

    /**
     * The usage state of one calendar day:
     *   measured (with band) · no-data · before-account · future
     */
    const usageDay = date => {
      const key = keyOf(date);
      const connected = shield.extension?.connectedOn || null;
      const base = { date, key, isToday: key === todayKey };
      if (key > todayKey) return { ...base, state: 'future' };
      if (key < registeredKey) return { ...base, state: 'before-account', reason: 'Before you joined' };
      const record = usageByDay.get(key);
      if (!record) {
        const reason = !connected || key < connected
          ? "No browser data · the extension wasn't connected"
          : 'No browser data · the extension did not report this day';
        return { ...base, state: 'no-data', reason };
      }
      return {
        ...base,
        state: 'measured',
        minutes: record.minutes,
        band: band(record.minutes),
        overBy: limit && record.minutes > limit ? record.minutes - limit : 0,
        partial: key === todayKey,
        method: record.method
      };
    };

    const summariseUsage = days => {
      const measured = days.filter(day => day.state === 'measured');
      const total = measured.reduce((sum, day) => sum + day.minutes, 0);
      return {
        covered: measured.length,
        averageMinutes: measured.length ? total / measured.length : null,
        overLimitDays: measured.filter(day => day.band === 'over').length
      };
    };

    /** The last `days` calendar days, ending today. */
    const usage = (days = 14) => {
      const span = range(addDays(today, -(days - 1)), days).map(usageDay);
      return {
        provenance: PROVENANCE.measured,
        connected: Boolean(shield.extension),
        connectedOn: shield.extension ? parse(shield.extension.connectedOn) : null,
        limit,
        bands,
        sites: shield.policy?.sites || [],
        methodLabel: shield.policy?.methodLabel || '',
        days: span,
        total: days,
        ...summariseUsage(span)
      };
    };

    /** Every day of the active cycle (weeks × 7), for the cycle grid. */
    const usageCycle = () => {
      const current = plan();
      if (!current) return null;
      const days = range(current.start, current.lengthDays).map(usageDay);
      return {
        provenance: PROVENANCE.measured,
        connected: Boolean(shield.extension),
        connectedOn: shield.extension ? parse(shield.extension.connectedOn) : null,
        start: current.start,
        weeks: current.weeks,
        limit,
        bands,
        sites: shield.policy?.sites || [],
        methodLabel: shield.policy?.methodLabel || '',
        days,
        total: current.lengthDays,
        ...summariseUsage(days)
      };
    };

    const phoneScreenTime = () => {
      const reports = data.selfReports.filter(entry => entry.kind === 'phone-screen-time');
      const latest = reports[reports.length - 1];
      return latest
        ? { provenance: PROVENANCE['self-reported'], minutesPerDay: latest.minutesPerDay, on: parse(latest.on), context: latest.context }
        : null;
    };

    /* ---- training levels, independent per type */

    const training = () => {
      const policy = data.catalog.trainingPolicy;
      return data.catalog.activityTypes.map(type => {
        const events = data.levelEvents.filter(entry => entry.activityType === type.id).sort((a, b) => a.on.localeCompare(b.on));
        const levelEvent = events[events.length - 1] || null;
        const level = levelEvent?.level || null;
        const attempts = data.activityAttempts.filter(entry => entry.activityType === type.id).sort((a, b) => a.on.localeCompare(b.on));
        const validAtLevel = level
          ? attempts.filter(entry => entry.valid && entry.level === level && entry.on >= levelEvent.on).length
          : 0;
        const last = attempts[attempts.length - 1] || null;
        const atMax = level === policy.maxLevel;
        return {
          ...type,
          level,
          maxLevel: policy.maxLevel,
          required: policy.validAttemptsToUnlock,
          validAtLevel: Math.min(validAtLevel, policy.validAttemptsToUnlock),
          eligible: Boolean(level) && !atMax && validAtLevel >= policy.validAttemptsToUnlock,
          atMax,
          levelReason: levelEvent?.detail || '',
          lastAttempt: last ? { ...last, on: parse(last.on) } : null,
          provenance: PROVENANCE.measured
        };
      });
    };

    /* ---- check-ins (assessments) */

    const officialAttempts = id => data.assessmentAttempts
      .filter(entry => entry.definitionId === id && entry.official && entry.valid)
      .sort((a, b) => a.on.localeCompare(b.on));

    /** Which tasks the check-in that closes `cycleNumber` repeats. */
    const checkInTasks = cycleNumber => {
      const policy = data.catalog.checkInPolicy;
      const full = cycleNumber % policy.fullEveryCycles === 0;
      const ids = full
        ? data.catalog.assessmentDefinitions.map(entry => entry.id)
        : [...policy.always, policy.rotation[(cycleNumber - 1) % policy.rotation.length]];
      const tasks = ids.map(definition);
      return { kind: full ? 'full' : 'short', tasks, minutes: tasks.reduce((sum, task) => sum + task.minutes, 0) };
    };

    /**
     * Eligibility for the check-in at the end of the current cycle:
     *   baseline-needed · upcoming · open · late · done
     * The window is the cycle's last day ± windowDays.
     */
    const checkInWindow = () => {
      const current = plan();
      const baselineDone = data.catalog.assessmentDefinitions.every(entry => officialAttempts(entry.id).length);
      if (!baselineDone || !current) {
        return { state: 'baseline-needed', baselineDone, ...checkInTasks(1), opens: null, closes: null, daysUntilOpen: null };
      }
      const policy = data.catalog.checkInPolicy;
      const opens = addDays(current.end, -policy.windowDays);
      const closes = addDays(current.end, policy.windowDays);
      const target = current.cycleNumber + 1;
      const done = data.assessmentAttempts.some(entry => entry.official && entry.cycle === target);
      let state = 'upcoming';
      if (done) state = 'done';
      else if (today > closes) state = 'late';
      else if (today >= opens) state = 'open';
      return {
        state,
        baselineDone,
        cycleEnd: current.end,
        opens,
        closes,
        daysUntilOpen: Math.max(0, daysBetween(today, opens)),
        ...checkInTasks(current.cycleNumber)
      };
    };

    /**
     * One entry per instrument. `comparison` exists only when the instrument
     * has actually been re-measured; otherwise it is null and the page says
     * when it was last measured.
     */
    /** The first cycle-end check-in, from the current cycle on, that repeats this instrument. */
    const nextMeasured = id => {
      const current = plan();
      if (!current) return null;
      const policy = data.catalog.checkInPolicy;
      for (let cycle = current.cycleNumber; cycle < current.cycleNumber + policy.fullEveryCycles + 1; cycle++) {
        if (checkInTasks(cycle).tasks.some(task => task.id === id)) {
          const cycleEnd = addDays(current.start, (cycle - current.cycleNumber + 1) * current.lengthDays - 1);
          return { cycle, opens: addDays(cycleEnd, -policy.windowDays), closes: addDays(cycleEnd, policy.windowDays) };
        }
      }
      return null;
    };

    const checkIns = () => data.catalog.assessmentDefinitions.map(entry => {
      const attempts = officialAttempts(entry.id);
      const baseline = attempts[0] || null;
      const latest = attempts[attempts.length - 1] || null;
      const shape = attempt => attempt && { ...attempt, on: parse(attempt.on) };
      return {
        ...entry,
        provenance: PROVENANCE[entry.provenance],
        baseline: shape(baseline),
        latest: shape(latest),
        lastMeasuredCycle: latest?.cycle || null,
        nextMeasured: nextMeasured(entry.id),
        comparison: attempts.length > 1 ? { from: shape(baseline), to: shape(latest) } : null
      };
    });

    /* ---- beyond the screen */

    const initiatives = () => {
      const kindOf = id => byId(data.opportunities, id)?.kind;
      const entries = data.registrations.filter(entry => kindOf(entry.opportunityId) === 'initiative' && entry.status !== 'cancelled');
      return {
        provenance: PROVENANCE['organiser-confirmed'],
        registered: entries.length,
        attended: entries.filter(entry => entry.attendance.some(item => item.confirmedBy === 'organiser')).length,
        completed: entries.filter(entry => entry.completion?.confirmedBy === 'organiser').length,
        items: entries.map(entry => ({ ...entry, opportunity: byId(data.opportunities, entry.opportunityId) }))
      };
    };

    const experiences = () => {
      const entries = data.experienceRegistrations.filter(entry => entry.status !== 'cancelled');
      return {
        provenance: PROVENANCE['supervisor-confirmed'],
        registered: entries.length,
        attended: entries.filter(entry => entry.attendance?.length).length,
        completed: entries.filter(entry => entry.completion).length
      };
    };

    /* ---- next steps: each one grounded in a computed fact, at most three */

    const nextSteps = (root = '') => {
      const steps = [];
      const href = path => `${root}${path}`;
      const current = plan();
      const due = checkInWindow();
      const review = reviews();
      const shieldUsage = usage(7);

      if (due.state === 'baseline-needed') {
        steps.push({
          id: 'baseline',
          reason: `You have not taken your starting ${NAMES.checkIn.toLowerCase()} yet. Your plan is built from it.`,
          action: `Start your ${NAMES.checkIn.toLowerCase()}`,
          href: href('src/pages/member/lab/lab.html')
        });
      } else if (due.state === 'open' || due.state === 'late') {
        steps.push({
          id: 'check-in',
          reason: due.state === 'late'
            ? `Your end-of-cycle ${NAMES.checkIn.toLowerCase()} window closed on ${format.date(due.closes)}. You can still take it; the result will be marked late.`
            : `Your ${NAMES.checkIn.toLowerCase()} window is open until ${format.date(due.closes)}: ${due.tasks.map(task => task.title).join(' and ')}, about ${due.minutes} minutes.`,
          action: `Start ${NAMES.checkIn.toLowerCase()}`,
          href: href('src/pages/member/lab/lab.html')
        });
      }

      if (current && review.nextDue) {
        const days = daysBetween(today, review.nextDue);
        if (days <= 1) {
          steps.push({
            id: 'review',
            reason: `Your week ${current.week} review is due ${format.relativeDays(days)}, ${format.date(review.nextDue, { weekday: true })}. Its answers set next week's load.`,
            action: 'Open weekly review',
            href: href('src/pages/member/weekly-review/weekly-review.html')
          });
        }
      }

      const ready = training().filter(type => type.eligible);
      const closest = training()
        .filter(type => type.level && !type.atMax && !type.eligible && type.validAtLevel > 0)
        .sort((a, b) => (b.validAtLevel / b.required) - (a.validAtLevel / a.required))[0];
      if (ready.length) {
        const type = ready[0];
        steps.push({
          id: `level-${type.id}`,
          reason: `Your valid ${type.title} attempts at level ${type.level} meet the requirement for level ${type.level + 1}.`,
          action: `Try level ${type.level + 1}`,
          href: href('src/pages/member/training/training.html#training-types')
        });
      } else if (closest) {
        const left = closest.required - closest.validAtLevel;
        steps.push({
          id: `level-${closest.id}`,
          reason: `${left} more valid ${closest.title} ${left === 1 ? 'attempt' : 'attempts'} at level ${closest.level} will meet the requirement for level ${closest.level + 1}. You have ${closest.validAtLevel} of ${closest.required}.`,
          action: `Start ${closest.title}`,
          href: href('src/pages/member/training/training.html#training-types')
        });
      }

      if (!shieldUsage.connected) {
        steps.push({
          id: 'extension',
          reason: 'There is no browser data yet because the Chrome extension is not connected. Nothing about screen time is shown until it is.',
          action: 'Connect the extension',
          href: href('src/pages/member/shield/shield.html')
        });
      } else if (current) {
        const overThisWeek = schedule().map(day => usageDay(day.date)).filter(day => day.band === 'over');
        if (overThisWeek.length >= 2) {
          steps.push({
            id: 'limit',
            reason: `You passed your ${limit}-minute limit on ${overThisWeek.length} days this week (${overThisWeek.map(day => format.date(day.date, { weekday: true })).join(', ')}).`,
            action: 'Review limit and sites',
            href: href('src/pages/member/shield/shield.html')
          });
        }
      }

      if (!activeRoutine().length) {
        steps.push({
          id: 'routine',
          reason: 'You have no offline routine yet. One small item you can tick off is enough to start.',
          action: 'Add a routine item',
          href: href('src/pages/member/training/training.html#offline-routine')
        });
      }

      return steps.slice(0, 3);
    };

    return {
      id: choice,
      label: data.account.label,
      seeded: data.account.seeded,
      asOf: data.account.asOf ? parse(data.account.asOf) : null,
      asOfNote: data.account.asOfNote,
      today,
      todayKey,
      profile: () => ({
        name: data.user.name,
        registeredOn: parse(registeredKey),
        goal: data.user.goal ? { ...data.user.goal, setOn: parse(data.user.goal.setOn) } : null
      }),
      activityType,
      definition,
      plan,
      schedule,
      adherence,
      reviews,
      routine,
      routineDays,
      usage,
      usageCycle,
      usageDay,
      phoneScreenTime,
      training,
      checkIns,
      checkInWindow,
      checkInTasks,
      initiatives,
      experiences,
      nextSteps
    };
  };

  /* ------------------------------------------------------------- loading */

  const params = new URLSearchParams(location.search);

  const readChoice = () => {
    const requested = params.get('account');
    if (requested && ACCOUNTS[requested]) {
      try { sessionStorage.setItem(STORE_KEY, requested); } catch { /* not persisted */ }
      return requested;
    }
    try {
      const stored = sessionStorage.getItem(STORE_KEY);
      if (stored && ACCOUNTS[stored]) return stored;
    } catch { /* fall through */ }
    return 'demo';
  };

  let pending = null;

  /** Fetch and model the chosen account. Resolves to the same object for every caller. */
  const load = () => {
    if (pending) return pending;
    const choice = readChoice();
    const url = new URL(`../../data/${ACCOUNTS[choice]}`, SCRIPT_URL);
    pending = Promise.resolve()
      .then(() => fetch(url, { cache: 'no-cache' }))
      .then(response => {
        if (!response.ok) throw new Error(`Account data could not be loaded (${response.status}).`);
        return response.json();
      })
      .then(data => createAccount(data, choice));
    return pending;
  };

  /** Switch accounts and reload the page so every figure is re-derived. */
  const choose = choice => {
    if (!ACCOUNTS[choice]) return;
    try { sessionStorage.setItem(STORE_KEY, choice); } catch { /* ignore */ }
    const url = new URL(location.href);
    url.searchParams.set('account', choice);
    location.assign(url);
  };

  /** Dev tools appear on a local server, or anywhere with ?dev=1. */
  const devMode = () => {
    if (params.get('dev') === '1') return true;
    return ['localhost', '127.0.0.1', '', '[::1]'].includes(location.hostname);
  };

  window.DeepSproutAccount = {
    ACCOUNTS: Object.keys(ACCOUNTS),
    NAMES,
    PROVENANCE,
    format,
    keyOf,
    parse,
    addDays,
    daysBetween,
    load,
    choose,
    choice: readChoice,
    devMode
  };
})();
