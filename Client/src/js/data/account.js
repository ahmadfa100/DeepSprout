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
  const SCRIPT_URL = document.currentScript?.src
    || document.querySelector('script[src*="js/data/account.js"]')?.src
    || location.href;
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

  /* ------------------------------------------------------------- changes */

  /**
   * The JSON is the seeded record; anything the user does on top of it
   * (ticking a routine day, editing or deleting an item, finishing a practice)
   * is stored as an event list per account and replayed at load. Resetting
   * the changes returns the account to exactly its seeded story.
   */
  const changesKey = choice => `deepsprout-account-changes-v1:${choice}`;
  const readChanges = choice => {
    try { const list = JSON.parse(localStorage.getItem(changesKey(choice))); return Array.isArray(list) ? list : []; }
    catch { return []; }
  };
  const writeChanges = (choice, list) => {
    try { localStorage.setItem(changesKey(choice), JSON.stringify(list)); } catch { /* kept for this visit */ }
  };

  /** A routine item's schedule as dated versions, so an edit never rewrites the past. */
  const scheduleOf = item => (item.schedule?.length
    ? item.schedule
    : [{ from: item.createdOn, days: item.days || [], recurrence: item.recurrence || 'weekly', paused: Boolean(item.paused) }]);

  const applyChange = (data, event) => {
    const item = event.id ? data.routine.find(entry => entry.id === event.id) : null;
    switch (event.type) {
      case 'routine.add':
        data.routine.push({
          id: event.id, title: event.title, hint: event.hint || '', createdOn: event.on, removedOn: null, checkIns: [],
          days: event.days, recurrence: event.recurrence || 'weekly', paused: false,
          schedule: [{ from: event.on, days: event.days, recurrence: event.recurrence || 'weekly', paused: false }]
        });
        break;
      case 'routine.update': {
        if (!item) break;
        if (event.title) item.title = event.title;
        const versions = scheduleOf(item).slice();
        const latest = versions[versions.length - 1];
        const next = {
          from: event.on,
          days: event.days || latest.days,
          recurrence: event.recurrence || latest.recurrence,
          paused: typeof event.paused === 'boolean' ? event.paused : latest.paused
        };
        if (latest.from === event.on) versions[versions.length - 1] = next;
        else versions.push(next);
        item.schedule = versions;
        Object.assign(item, { days: next.days, recurrence: next.recurrence, paused: next.paused });
        break;
      }
      case 'routine.remove':
        // The item stops being scheduled. Its check-ins stay as history.
        if (item && !item.removedOn) item.removedOn = event.on;
        break;
      case 'routine.log': {
        if (!item) break;
        item.checkIns = item.checkIns.filter(entry => entry.date !== event.date);
        if (event.status) item.checkIns.push({ date: event.date, status: event.status });
        item.checkIns.sort((a, b) => a.date.localeCompare(b.date));
        break;
      }
      case 'attempt.add':
        data.activityAttempts.push(event.attempt);
        break;
      case 'review.add':
        if (!data.weeklyReviews.some(review => review.week === event.review.week)) data.weeklyReviews.push(event.review);
        break;
      case 'assessment.add':
        data.assessmentAttempts.push(event.attempt);
        break;
      case 'setup.save':
        data.user.goal = event.goal;
        data.user.setup = event.setup;
        if (!data.user.registeredOn) data.user.registeredOn = event.on;
        break;
      case 'profile.update':
        if (typeof event.name === 'string') data.user.name = event.name;
        if (typeof event.email === 'string') data.user.email = event.email;
        break;
      case 'registration.add':
        data.registrations = data.registrations.filter(entry => entry.opportunityId !== event.registration.opportunityId || entry.status !== 'cancelled');
        if (!data.registrations.some(entry => entry.opportunityId === event.registration.opportunityId)) data.registrations.push(event.registration);
        break;
      case 'registration.cancel': {
        const entry = data.registrations.find(item => item.opportunityId === event.opportunityId && item.status !== 'cancelled');
        // Cancelling releases the place; attendance already recorded stays.
        if (entry) { entry.status = 'cancelled'; entry.cancelledOn = event.on; }
        break;
      }
      case 'plan.adjust':
        (data.planAdjustments ||= []).push({ on: event.on, label: event.label, detail: event.detail });
        break;
      default: break;
    }
  };

  const createAccount = (seed, choice, catalogue = { listings: [] }) => {
    const data = JSON.parse(JSON.stringify(seed));
    data.planAdjustments ||= [];
    const changes = readChanges(choice);
    changes.forEach(event => applyChange(data, event));
    const today = data.account.asOf ? parse(data.account.asOf) : parse(keyOf(new Date()));
    const todayKey = keyOf(today);
    // Listings carry dates relative to the account's today, so every story stays coherent.
    data.timezone = catalogue.timezone || '';
    data.opportunities = (catalogue.listings || []).map(listing => ({
      ...listing,
      startDate: keyOf(addDays(today, listing.startsInDays)),
      endDate: keyOf(addDays(today, listing.endsInDays ?? listing.startsInDays)),
      components: (listing.components || []).map(component => ({ ...component, date: keyOf(addDays(today, component.inDays)) }))
    }));
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
      const adjustments = [...data.weeklyReviews.filter(review => review.adjustment).map(review => review.adjustment), ...data.planAdjustments]
        .sort((a, b) => a.on.localeCompare(b.on));
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

    /** Is this routine item scheduled on this date — by the schedule version in force that day? */
    const routineScheduledOn = (item, date) => {
      const key = keyOf(date);
      if (key < item.createdOn) return false;
      if (item.removedOn && key >= item.removedOn) return false;
      const version = scheduleOf(item).filter(entry => entry.from <= key).pop();
      if (!version || version.paused || !version.days.includes(date.getDay())) return false;
      if (version.recurrence === 'biweekly') return Math.floor(daysBetween(parse(item.createdOn), date) / 7) % 2 === 0;
      return true;
    };

    /** 'done' · 'skipped' · null — the user's own report for that day. */
    const routineStatusOn = (item, date) => item.checkIns.find(entry => entry.date === keyOf(date))?.status || null;

    /** Distinct days with at least one routine item ticked done, in [from, to]. Removed items still count: history is kept. */
    const routineDays = (from, to) => {
      const fromKey = keyOf(from);
      const toKey = keyOf(to);
      const done = new Set();
      data.routine.forEach(item => item.checkIns.forEach(entry => {
        if (entry.status === 'done' && entry.date >= fromKey && entry.date <= toKey) done.add(entry.date);
      }));
      return [...done].sort();
    };

    /** Days in [from, to] on which at least one routine item was scheduled. */
    const routineScheduledDays = (from, to) => range(from, daysBetween(from, to) + 1)
      .filter(date => data.routine.some(item => routineScheduledOn(item, date)));

    const routine = () => {
      const items = activeRoutine().map(item => ({ ...item, ...scheduleOf(item).slice(-1)[0], from: undefined }));
      const current = plan();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1, 12);
      const thisWeek = current ? weekDates(current.week) : [];
      return {
        provenance: PROVENANCE['self-reported'],
        items,
        primary: items.find(item => !item.paused) || items[0] || null,
        monthDays: routineDays(monthStart, today).length,
        week: current
          ? { done: routineDays(thisWeek[0], thisWeek[6]).length, scheduled: routineScheduledDays(thisWeek[0], thisWeek[6]).length }
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
      const repeated = checkInTasks(current.cycleNumber).tasks;
      const done = repeated.every(task => data.assessmentAttempts.some(entry => entry.official && entry.definitionId === task.id && entry.cycle === target));
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
     * Whether an attempt on this instrument, taken now, is OFFICIAL or a
     * PRACTICE ROUND. Practice rounds are allowed any time and are never stored.
     *   official — the starting point, or a task repeated inside (or after a
     *              missed) end-of-cycle window that has not been taken yet
     *   practice — everything else
     */
    const checkInMode = id => {
      const due = checkInWindow();
      const attempts = officialAttempts(id);
      if (!attempts.length) {
        return { mode: 'official', kind: 'baseline', cycle: plan()?.cycleNumber || 1, late: false };
      }
      if ((due.state === 'open' || due.state === 'late') && due.tasks.some(task => task.id === id)) {
        const cycle = plan().cycleNumber + 1;
        if (!attempts.some(attempt => attempt.cycle === cycle)) {
          return { mode: 'official', kind: 'recheck', cycle, late: due.state === 'late' };
        }
      }
      return { mode: 'practice', kind: 'practice', cycle: null, late: false, opens: due.opens };
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
      const kindOfExperience = id => byId(data.opportunities, id)?.kind === 'experience';
      const entries = [...data.experienceRegistrations, ...data.registrations.filter(entry => kindOfExperience(entry.opportunityId))]
        .filter(entry => entry.status !== 'cancelled' && entry.status !== 'waitlisted');
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

      if (!data.user.goal) {
        steps.push({
          id: 'setup',
          title: 'Answer a few setup questions',
          reason: 'Your goal, your hardest times and the days you have decide what your plan asks of you.',
          action: 'Start your journey',
          href: href('src/pages/member/onboarding/onboarding.html')
        });
      } else if (due.state === 'baseline-needed') {
        steps.push({
          id: 'baseline',
          title: `Your starting ${NAMES.checkIn.toLowerCase()}`,
          reason: `You have not taken your starting ${NAMES.checkIn.toLowerCase()} yet. Your plan is built from it.`,
          action: `Start your ${NAMES.checkIn.toLowerCase()}`,
          href: href('src/pages/member/lab/lab.html')
        });
      } else if (due.state === 'open' || due.state === 'late') {
        steps.push({
          id: 'check-in',
          title: due.state === 'late' ? `Your ${NAMES.checkIn.toLowerCase()} — late` : `Your ${NAMES.checkIn.toLowerCase()} window is open`,
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
            title: `Week ${current.week} review · due ${format.relativeDays(days)}`,
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
          title: `${type.title}: level ${type.level + 1} is open`,
          reason: `Your valid ${type.title} attempts at level ${type.level} meet the requirement for level ${type.level + 1}.`,
          action: `Try level ${type.level + 1}`,
          href: href('src/pages/member/training/training.html#training-types')
        });
      } else if (closest) {
        const left = closest.required - closest.validAtLevel;
        steps.push({
          id: `level-${closest.id}`,
          title: `${closest.title}: ${closest.validAtLevel} of ${closest.required} toward level ${closest.level + 1}`,
          reason: `${left} more valid ${closest.title} ${left === 1 ? 'attempt' : 'attempts'} at level ${closest.level} will meet the requirement for level ${closest.level + 1}. You have ${closest.validAtLevel} of ${closest.required}.`,
          action: `Start ${closest.title}`,
          href: href('src/pages/member/training/training.html#training-types')
        });
      }

      if (!shieldUsage.connected) {
        steps.push({
          id: 'extension',
          title: 'No browser data yet',
          reason: 'There is no browser data yet because the Chrome extension is not connected. Nothing about screen time is shown until it is.',
          action: 'Connect the extension',
          href: href('src/pages/member/shield/shield.html')
        });
      } else if (current) {
        const overThisWeek = schedule().map(day => usageDay(day.date)).filter(day => day.band === 'over');
        if (overThisWeek.length >= 2) {
          steps.push({
            id: 'limit',
            title: `Over your limit on ${overThisWeek.length} days this week`,
            reason: `You passed your ${limit}-minute limit on ${overThisWeek.length} days this week (${overThisWeek.map(day => format.date(day.date, { weekday: true })).join(', ')}).`,
            action: 'Review limit and sites',
            href: href('src/pages/member/shield/shield.html')
          });
        }
      }

      if (!activeRoutine().length) {
        steps.push({
          id: 'routine',
          title: 'Start an offline routine',
          reason: 'You have no offline routine yet. One small item you can tick off is enough to start.',
          action: 'Add a routine item',
          href: href('src/pages/member/training/training.html#offline-routine')
        });
      }

      return steps.slice(0, 3);
    };

    /* ---- explore: listings with places, dates and the user's own status */

    const KIND_LABELS = { initiative: 'Initiative', session: 'Session', experience: 'Experience', competition: 'Competition' };
    const registrationFor = id => data.registrations.find(entry => entry.opportunityId === id && entry.status !== 'cancelled') || null;
    const listing = item => {
      const mine = registrationFor(item.id);
      const holding = mine && (mine.status === 'confirmed' || mine.status === 'pending') ? 1 : 0;
      const taken = item.registered + holding;
      const remaining = item.capacity === null ? null : Math.max(0, item.capacity - taken);
      return {
        ...item,
        kindLabel: KIND_LABELS[item.kind] || item.kind,
        start: parse(item.startDate),
        end: parse(item.endDate),
        timezone: data.timezone,
        remaining,
        full: remaining === 0 && !holding,
        ongoing: item.startDate <= todayKey && item.endDate >= todayKey,
        past: item.endDate < todayKey,
        mine: mine ? { ...mine, registeredOn: parse(mine.registeredOn) } : null,
        components: item.components.map(component => ({ ...component, date: parse(component.date) }))
      };
    };
    const listings = () => data.opportunities.map(listing);
    const listingById = id => { const item = byId(data.opportunities, id); return item ? listing(item) : null; };
    /** What registering would do right now: confirm, ask the organiser, or join the waiting list. */
    const registrationOutcome = id => {
      const item = listingById(id);
      if (!item) return null;
      if (item.full) return 'waitlisted';
      return item.approval === 'organiser' ? 'pending' : 'confirmed';
    };

    /* ---- garden: one plant, grown only from qualifying records */

    /**
     * Every record that grows the plant, oldest first. Each counts once:
     * a valid practice, a routine day (capped per plan week), a completed
     * weekly review, an organiser-confirmed attendance.
     */
    const growthSteps = () => {
      const policy = data.catalog.gardenPolicy;
      const steps = [];
      data.activityAttempts.filter(attempt => attempt.valid && activityType(attempt.activityType)).forEach(attempt => steps.push({
        on: attempt.on, kind: 'practice', title: activityType(attempt.activityType).title, detail: attempt.outcome,
        source: 'Measured by the app', why: 'A valid practice adds one growth step.'
      }));
      const perWeek = new Map();
      data.routine.forEach(item => item.checkIns.filter(entry => entry.status === 'done').forEach(entry => {
        const week = data.plan ? Math.floor(daysBetween(parse(data.plan.startDate), parse(entry.date)) / 7) : entry.date.slice(0, 7);
        const count = perWeek.get(week) || 0;
        if (count >= policy.routineDaysPerWeek) return;
        perWeek.set(week, count + 1);
        steps.push({ on: entry.date, kind: 'routine', title: item.title, detail: 'Offline routine ticked', source: 'Self-reported', why: `A routine day adds one growth step (up to ${policy.routineDaysPerWeek} a week).` });
      }));
      data.weeklyReviews.forEach(review => steps.push({
        on: review.completedOn, kind: 'review', title: `Week ${review.week} review`, detail: 'Weekly review completed',
        source: 'Your plan', why: 'A completed weekly review adds one growth step.'
      }));
      data.registrations.forEach(entry => entry.attendance.filter(item => item.confirmedBy === 'organiser').forEach(item => steps.push({
        on: item.on, kind: 'attended', title: item.component, detail: byId(data.opportunities, entry.opportunityId)?.title || '',
        source: 'Organiser-confirmed', why: 'Attendance confirmed by the organiser adds one growth step.'
      })));
      return steps.filter(step => step.on <= todayKey).sort((a, b) => a.on.localeCompare(b.on));
    };

    const garden = () => {
      const policy = data.catalog.gardenPolicy;
      const steps = growthSteps();
      const count = steps.length;
      const stages = policy.stages;
      const stageIndex = stages.reduce((found, stage, index) => (count >= stage.from ? index : found), 0);
      const next = stages[stageIndex + 1] || null;
      const firstReview = data.weeklyReviews.slice().sort((a, b) => a.completedOn.localeCompare(b.completedOn))[0];
      const companion = policy.companion.unlock === 'first-weekly-review' && firstReview && firstReview.completedOn <= todayKey
        ? { ...policy.companion, on: parse(firstReview.completedOn), why: 'Unlocked by your first completed weekly review.' }
        : null;
      // Achievements: dated milestones from the policy, oldest first. A rule
      // names either the nth step of one kind or the step that reached a stage.
      const stageFrom = id => stages.find(stage => stage.id === id)?.from;
      // `slot` is the rule's place in the policy, so a tree's spot never shifts.
      const rules = policy.achievements || [];
      const achievements = rules.map((rule, order) => {
        const step = rule.stage
          ? (stageFrom(rule.stage) > 0 ? steps[stageFrom(rule.stage) - 1] : null)
          : steps.filter(item => item.kind === rule.kind)[rule.count - 1];
        return step ? { rule, step, order } : null;
      }).filter(Boolean)
        .sort((a, b) => a.step.on.localeCompare(b.step.on) || a.order - b.order)
        .map(({ rule, step }) => ({
          id: rule.id, slot: rules.indexOf(rule), title: rule.title, tree: rule.tree, why: rule.why,
          earnedBy: [step.title, step.detail].filter(Boolean).join(' · '), on: parse(step.on)
        }));
      const last = steps[steps.length - 1] || null;
      const quiet = last ? daysBetween(parse(last.on), today) : null;
      // Vitality is a reversible surface effect: it never touches the earned stage.
      const { fullWithinDays, lowestAfterDays } = policy.vitality;
      const vitality = quiet === null ? 1 : quiet <= fullWithinDays ? 1
        : Math.max(0.55, 1 - 0.45 * Math.min(1, (quiet - fullWithinDays) / (lowestAfterDays - fullWithinDays)));
      return {
        steps, count, stages, stageIndex, stage: stages[stageIndex], next,
        toNext: next ? next.from - count : 0,
        companion,
        achievements,
        vitality,
        recent: last ? { ...last, on: parse(last.on) } : null,
        policy: { routineDaysPerWeek: policy.routineDaysPerWeek, note: policy.note }
      };
    };

    /* ---- history: everything recorded, newest first, each with its source */

    const history = () => {
      const events = [];
      const typeTitle = id => activityType(id)?.title || 'Practice';
      if (data.plan) events.push({ on: data.plan.activatedOn, kind: 'plan', title: 'Plan started', note: data.user.goal?.label || '' });
      data.weeklyReviews.forEach(review => {
        events.push({ on: review.completedOn, kind: 'review', title: `Week ${review.week} reviewed`, note: 'Your answers' });
        if (review.adjustment) events.push({ on: review.adjustment.on, kind: 'adjust', title: `Plan adjusted — ${review.adjustment.label.toLowerCase()}`, note: review.adjustment.detail });
      });
      data.planAdjustments.forEach(entry => events.push({ on: entry.on, kind: 'adjust', title: `Plan adjusted — ${entry.label.toLowerCase()}`, note: entry.detail || '' }));
      data.activityAttempts.forEach(attempt => events.push({
        on: attempt.on, kind: attempt.valid ? 'practice' : 'invalid', title: attempt.title || typeTitle(attempt.activityType),
        note: attempt.valid ? `${attempt.outcome} · measured` : `Not counted: ${attempt.invalidReason || attempt.outcome}`
      }));
      data.routine.forEach(item => {
        item.checkIns.forEach(entry => events.push({
          on: entry.date, kind: entry.status === 'done' ? 'routine' : 'skipped', title: item.title,
          note: entry.status === 'done' ? 'Offline routine · self-reported' : 'Routine skipped · self-reported'
        }));
        if (item.removedOn) events.push({ on: item.removedOn, kind: 'removed', title: item.title, note: 'Removed from your routine. Past check-ins are kept.' });
      });
      data.assessmentAttempts.filter(attempt => attempt.official).forEach(attempt => events.push({
        on: attempt.on, kind: 'baseline', title: `${definition(attempt.definitionId)?.title} check`,
        note: `${attempt.cycle === 1 ? 'Starting point' : `Cycle ${attempt.cycle}`} · measured${attempt.late ? ' · late' : ''}`
      }));
      return events.sort((a, b) => b.on.localeCompare(a.on));
    };

    /**
     * Record something the user did. Dates are the account's "today", so the
     * seeded demo stays coherent with its own clock.
     */
    const mutate = event => {
      const full = { ...event, on: event.on || todayKey, at: new Date().toISOString() };
      if (full.type === 'routine.add') {
        full.id = `r-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      }
      if (full.type === 'routine.log') full.date ||= todayKey;
      if (full.type === 'attempt.add') {
        const type = activityType(full.attempt.activityType);
        const level = type ? (training().find(entry => entry.id === type.id)?.level || null) : null;
        const due = full.attempt.valid
          ? data.scheduledActions.find(action => action.date === todayKey && action.kind === 'practice'
            && action.activityType === full.attempt.activityType && !validAttemptFor(action.id))
          : null;
        full.attempt = { id: `a-${Date.now().toString(36)}`, scheduledActionId: due?.id || null, level, on: todayKey, ...full.attempt };
      }
      applyChange(data, full);
      changes.push(full);
      writeChanges(choice, changes);
      window.dispatchEvent(new CustomEvent('deepsprout:account', { detail: full }));
      return full;
    };

    return {
      id: choice,
      changeCount: () => changes.length,
      history,
      mutate,
      /** Practice attempts recorded on one date, valid or not. */
      attemptsOn: date => data.activityAttempts.filter(attempt => attempt.on === keyOf(date))
        .map(attempt => ({ ...attempt, type: activityType(attempt.activityType) })),
      routineScheduledOn,
      routineStatusOn,
      routineScheduledDays,
      weekDates,
      label: data.account.label,
      seeded: data.account.seeded,
      asOf: data.account.asOf ? parse(data.account.asOf) : null,
      asOfNote: data.account.asOfNote,
      today,
      todayKey,
      /** The full record as it stands now (seed plus changes) — for "show my data". */
      exportRecord: () => JSON.parse(JSON.stringify(data)),
      profile: () => ({
        email: data.user.email || '',
        setup: data.user.setup ? { ...data.user.setup } : null,
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
      checkInMode,
      checkInPolicy: () => ({ ...data.catalog.checkInPolicy }),
      garden,
      listings,
      listingById,
      registrationOutcome,
      allRegistrations: () => data.registrations.map(entry => ({ ...entry, listing: listingById(entry.opportunityId) })),
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
  const load = (refresh = false) => {
    if (refresh) pending = null;
    if (pending) return pending;
    const choice = readChoice();
    const url = new URL(`../../data/${ACCOUNTS[choice]}`, SCRIPT_URL);
    const listingsUrl = new URL('../../data/listings.json', SCRIPT_URL);
    const json = target => Promise.resolve()
      .then(() => fetch(target, { cache: 'no-cache' }))
      .then(response => {
        if (!response.ok) throw new Error(`Account data could not be loaded (${response.status}).`);
        return response.json();
      });
    pending = Promise.all([json(url), json(listingsUrl).catch(() => ({ listings: [] }))])
      .then(([data, catalogue]) => createAccount(data, choice, catalogue));
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

  // Display names live in ONE constant. Any element marked data-name="checkIn"
  // (etc.) shows the current wording, so a rename is a one-line change.
  const applyNames = (scope = document) => scope.querySelectorAll('[data-name]').forEach(node => {
    if (NAMES[node.dataset.name]) node.textContent = NAMES[node.dataset.name];
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => applyNames());
  else applyNames();

  window.DeepSproutAccount = {
    applyNames,
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
    /** Forget every change made on top of the seeded record, for this account. */
    resetChanges: () => { try { localStorage.removeItem(changesKey(readChoice())); } catch { /* ignore */ } },
    devMode
  };
})();
