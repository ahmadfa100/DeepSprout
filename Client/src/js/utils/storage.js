/**
 * DeepSprout shared demo state.
 *
 * Every member page reads and writes one object so the individual cycle stays
 * connected: onboarding collects a goal, the Lab records assessment attempts,
 * plan activation writes commitments, and Home / Recovery Plan / Garden read
 * the same record. Nothing here talks to a server; this is device-local demo
 * state for the client preview.
 *
 * Exposed as window.DeepSprout. Load with `defer` before the page script.
 */
(() => {
  const KEY = 'deepsprout-user-v1';

  const blank = () => ({
    version: 1,
    createdAt: null,
    profile: {
      name: '',
      email: '',
      goal: '',
      distracting: [],
      peakTime: '',
      baselineMinutes: '',
      devices: [],
      offlineInterests: [],
      availableDays: '',
      protection: ''
    },
    onboarding: {
      bimoSeen: false,
      introSeen: false,
      setupDone: false,
      resultsSeen: false,
      planActivated: false,
      tourSeen: false
    },
    // One entry per instrument, keyed by assessment id. Each attempt keeps the
    // instrument version and a timestamp so results stay comparable later.
    assessments: {},
    plan: null,
    routine: [],
    activityLog: [],
    registrations: [],
    reviews: []
  });

  const isPlainObject = value =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  /** Fill in anything a stored record is missing, so older state still renders. */
  const withDefaults = (stored, defaults) => {
    if (!isPlainObject(stored)) return defaults;
    const merged = { ...defaults };
    Object.keys(defaults).forEach(key => {
      const value = stored[key];
      if (isPlainObject(defaults[key])) merged[key] = withDefaults(value, defaults[key]);
      else if (Array.isArray(defaults[key])) merged[key] = Array.isArray(value) ? value : defaults[key];
      else if (value !== undefined) merged[key] = value;
    });
    // Keep keys a newer page added that this version does not know about.
    Object.keys(stored).forEach(key => {
      if (!(key in merged)) merged[key] = stored[key];
    });
    return merged;
  };

  let cache = null;

  const read = () => {
    if (cache) return cache;
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(KEY)); }
    catch { stored = null; }
    cache = withDefaults(stored, blank());
    return cache;
  };

  const write = state => {
    cache = state;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { /* The page still works for this visit without persistence. */ }
    return state;
  };

  /**
   * Apply a mutation to the state and persist it.
   *
   * Re-reads from storage first so a write made in another tab (or by another
   * script on this page) is not clobbered by a stale cached copy.
   */
  const update = mutate => {
    cache = null;
    const state = read();
    mutate(state);
    if (!state.createdAt) state.createdAt = new Date().toISOString();
    return write(state);
  };

  const reset = () => {
    try {
      localStorage.removeItem(KEY);
      // Clear the per-page keys the earlier pages wrote directly.
      Object.keys(localStorage)
        .filter(key => key.startsWith('deepsprout-'))
        .forEach(key => localStorage.removeItem(key));
    } catch { /* ignore */ }
    cache = null;
    return read();
  };

  /* ---------------------------------------------------------------- dates */

  const dayKey = (date = new Date()) => {
    const local = new Date(date);
    return [
      local.getFullYear(),
      String(local.getMonth() + 1).padStart(2, '0'),
      String(local.getDate()).padStart(2, '0')
    ].join('-');
  };

  const addDays = (date, amount) => {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  };

  const daysBetween = (from, to) => {
    const start = new Date(from);
    const end = new Date(to);
    start.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);
    return Math.round((end - start) / 86400000);
  };

  const formatDate = (value, options = { month: 'short', day: 'numeric' }) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', options);
  };

  /* ----------------------------------------------------------- assessments */

  const ASSESSMENTS = [
    { id: 'digital-habits', title: 'Digital Habits', kind: 'Self-report questionnaire', minutes: 4 },
    { id: 'sustained-attention', title: 'Sustained Attention', kind: 'Timed response task', minutes: 4 },
    { id: 'inhibitory-control', title: 'Inhibitory Control', kind: 'Go / no-go task', minutes: 3 },
    { id: 'depth-challenge', title: 'Depth Challenge', kind: 'Reading comprehension', minutes: 6 }
  ];

  /** Days before a completed instrument may be formally retaken. */
  const RETEST_WINDOW_DAYS = 28;

  const assessmentAttempt = id => read().assessments[id] || null;

  const saveAssessment = (id, attempt) => update(state => {
    const previous = state.assessments[id];
    state.assessments[id] = {
      ...attempt,
      id,
      completedAt: new Date().toISOString(),
      attemptNumber: (previous?.attemptNumber || 0) + 1,
      previous: previous ? { completedAt: previous.completedAt, summary: previous.summary } : null
    };
  });

  const assessmentsComplete = () => {
    const stored = read().assessments;
    return ASSESSMENTS.every(item => stored[item.id]?.completedAt);
  };

  const nextAssessment = () => {
    const stored = read().assessments;
    return ASSESSMENTS.find(item => !stored[item.id]?.completedAt) || null;
  };

  /** Completed instruments are retestable once the eligibility window passes. */
  const retestEligible = id => {
    const attempt = assessmentAttempt(id);
    if (!attempt?.completedAt) return false;
    return daysBetween(attempt.completedAt, new Date()) >= RETEST_WINDOW_DAYS;
  };

  /* ------------------------------------------------------------------ plan */

  const GOALS = {
    'reduce-scrolling': 'Spend less time on short-video feeds',
    'intentional-phone': 'Use my phone more intentionally',
    'offline-time': 'Make room for offline interests',
    'focus-objective': 'Support a specific focus objective'
  };

  const goalLabel = () => {
    const state = read();
    return state.plan?.goalLabel || GOALS[state.profile.goal] || 'Spend less time on short-video feeds';
  };

  /** Day 1..28 of the active cycle, or null when no plan is active. */
  const cycleDay = () => {
    const plan = read().plan;
    if (!plan?.startDate) return null;
    const elapsed = daysBetween(plan.startDate, new Date());
    return Math.min(plan.cycleLength || 28, Math.max(1, elapsed + 1));
  };

  const cycleWeek = () => {
    const day = cycleDay();
    return day === null ? null : Math.min(4, Math.ceil(day / 7));
  };

  /** A review becomes due on the last day of each plan week. */
  const reviewDue = () => {
    const state = read();
    if (!state.plan || state.plan.status !== 'active') return false;
    const day = cycleDay();
    if (day === null) return false;
    const week = cycleWeek();
    const reviewed = state.reviews.some(review => review.week === week);
    return !reviewed && day % 7 === 0;
  };

  const activatePlan = plan => update(state => {
    state.plan = {
      cycleNumber: (state.plan?.cycleNumber || 0) + 1,
      cycleLength: 28,
      startDate: dayKey(),
      status: 'active',
      activatedAt: new Date().toISOString(),
      revisions: [],
      ...plan
    };
    state.onboarding.planActivated = true;
  });

  const recordReview = review => update(state => {
    state.reviews.push({ ...review, at: new Date().toISOString(), week: cycleWeek() });
    if (state.plan) {
      state.plan.revisions.push({
        at: new Date().toISOString(),
        reason: review.outcome,
        week: cycleWeek()
      });
    }
  });

  /* --------------------------------------------------------------- routine */

  const ROUTINE_IDEAS = [
    { title: 'Five-minute walk', hint: 'Outside if you can, around the room if you cannot.' },
    { title: 'Read two pages', hint: 'A real book or magazine — anything on paper.' },
    { title: 'Sketch something', hint: 'No skill required. One small drawing is enough.' },
    { title: 'Practise an instrument', hint: 'Even a few minutes counts.' },
    { title: 'Stretch before bed', hint: 'A short wind-down away from a screen.' },
    { title: 'Call or sit with someone', hint: 'A short real conversation.' }
  ];

  const addRoutine = item => {
    const id = `routine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    update(state => {
      state.routine.push({
        id,
        title: item.title,
        hint: item.hint || '',
        days: Array.isArray(item.days) ? item.days : [1, 2, 3, 4, 5, 6, 0],
        paused: false,
        createdAt: new Date().toISOString(),
        log: {}
      });
    });
    return id;
  };

  const updateRoutine = (id, changes) => update(state => {
    const item = state.routine.find(entry => entry.id === id);
    if (item) Object.assign(item, changes);
  });

  const removeRoutine = id => update(state => {
    state.routine = state.routine.filter(entry => entry.id !== id);
  });

  /** Mark one routine item for one day: 'done', 'skipped' or cleared. */
  const logRoutine = (id, status, date = new Date()) => update(state => {
    const item = state.routine.find(entry => entry.id === id);
    if (!item) return;
    const key = dayKey(date);
    if (!status) delete item.log[key];
    else item.log[key] = status;
  });

  const routineScheduledToday = (item, date = new Date()) =>
    !item.paused && item.days.includes(new Date(date).getDay());

  const routineDoneToday = (item, date = new Date()) => item.log[dayKey(date)] === 'done';

  /* -------------------------------------------------------------- activity */

  const logActivity = entry => update(state => {
    state.activityLog.unshift({
      id: `act-${Date.now()}`,
      at: new Date().toISOString(),
      evidence: 'self-reported',
      ...entry
    });
    state.activityLog = state.activityLog.slice(0, 120);
  });

  const activityOn = date => {
    const key = dayKey(date);
    return read().activityLog.filter(entry => dayKey(entry.at) === key);
  };

  /* --------------------------------------------------------- registrations */

  const register = (opportunity, status = 'confirmed') => update(state => {
    const existing = state.registrations.find(entry => entry.opportunityId === opportunity.id);
    if (existing) { existing.status = status; return; }
    state.registrations.push({
      opportunityId: opportunity.id,
      title: opportunity.title,
      kind: opportunity.kind,
      organizer: opportunity.organizer,
      date: opportunity.date,
      mode: opportunity.mode,
      status,
      at: new Date().toISOString()
    });
  });

  const registrationFor = id =>
    read().registrations.find(entry => entry.opportunityId === id) || null;

  const cancelRegistration = id => update(state => {
    const entry = state.registrations.find(item => item.opportunityId === id);
    if (entry) entry.status = 'cancelled';
  });

  /* ------------------------------------------------------------ next action */

  /**
   * The single most relevant next step, used by the Home hero and by the
   * "continue" buttons across the member pages (spec section 8).
   */
  const nextAction = (root = '') => {
    const state = read();
    const path = suffix => `${root}${suffix}`;

    if (!state.onboarding.bimoSeen) {
      return { label: 'Start your journey', href: path('src/pages/member/onboarding/onboarding.html'), why: 'Start your first run' };
    }
    if (!state.onboarding.setupDone) {
      return { label: 'Finish your setup', href: path('src/pages/member/onboarding/onboarding.html'), why: 'A few quick questions left' };
    }
    if (!assessmentsComplete()) {
      const next = nextAssessment();
      return {
        label: 'Continue your assessments',
        href: path(`src/pages/member/lab/assessment.html?test=${next.id}`),
        why: `${next.title} is next`
      };
    }
    if (!state.onboarding.planActivated) {
      return { label: 'Build my recovery plan', href: path('src/pages/member/onboarding/starting-point.html'), why: 'Your results are ready' };
    }
    if (reviewDue()) {
      return { label: 'Review your week', href: path('src/pages/member/weekly-review/weekly-review.html'), why: `Week ${cycleWeek()} is wrapping up` };
    }
    const routineLeft = state.routine.filter(item => routineScheduledToday(item) && !routineDoneToday(item));

    // Only claim a practice is due when today's plan actually schedules one.
    // Days with nothing required are a valid part of a plan (spec 5.4).
    const todaysEntry = state.plan.weekOne?.[(cycleDay() || 1) - 1];
    if (todaysEntry?.kind === 'practice' && !activityOn(new Date()).length) {
      return {
        label: "Continue today's activity",
        href: path('src/pages/member/training/training.html#training-types'),
        why: `${todaysEntry.title} is scheduled`
      };
    }
    if (routineLeft.length) {
      return { label: 'Log your offline routine', href: path('src/pages/member/training/training.html#offline-routine'), why: routineLeft[0].title };
    }
    if (todaysEntry?.kind === 'rest') {
      return { label: 'Explore activities', href: path('src/pages/member/training/training.html#training-types'), why: 'Nothing is scheduled today — that is by design' };
    }
    return { label: 'Explore activities', href: path('src/pages/member/training/training.html#training-types'), why: "Today's commitments are done" };
  };

  /* ----------------------------------------------------------------- stats */

  /**
   * The numbers the member pages are allowed to show. Everything here is
   * counted from records the user actually made on this device — practices
   * logged, routine days ticked, reviews and baselines completed. There is no
   * screen-time figure because nothing in this build measures screen time.
   */
  const stats = () => {
    const state = read();
    const plan = state.plan?.status === 'active' ? state.plan : null;
    const day = plan ? cycleDay() : null;
    const week = plan ? cycleWeek() : null;
    const routineDone = state.routine.flatMap(item =>
      Object.entries(item.log || {}).filter(([, status]) => status === 'done').map(([key]) => key));

    // Plan-week boundaries, as day keys, so "this week" means week N of the plan.
    const weekRange = number => {
      if (!plan) return null;
      const start = addDays(new Date(`${plan.startDate}T12:00:00`), (number - 1) * 7);
      return { from: dayKey(start), to: dayKey(addDays(start, 6)) };
    };
    const inRange = (key, range) => Boolean(range) && key >= range.from && key <= range.to;

    const perWeek = [1, 2, 3, 4].map(number => {
      const range = weekRange(number);
      const practices = state.activityLog.filter(entry => inRange(dayKey(entry.at), range)).length;
      const routine = routineDone.filter(key => inRange(key, range)).length;
      return { week: number, practices, routine, reviewed: state.reviews.some(review => review.week === number) };
    });
    const current = week ? perWeek[week - 1] : null;
    const baselines = ASSESSMENTS.filter(item => state.assessments[item.id]?.completedAt);
    const firstBaseline = baselines
      .map(item => state.assessments[item.id].completedAt)
      .sort()[0];

    return {
      hasPlan: Boolean(plan),
      day,
      week,
      cycleLength: plan?.cycleLength || 28,
      goalLabel: goalLabel(),
      weekTitle: plan?.direction?.[(week || 1) - 1]?.title || '',
      // Only week one is planned day by day; later weeks are written at review.
      scheduledThisWeek: plan && week === 1
        ? (plan.weekOne || []).filter(entry => entry.kind === 'practice').length
        : null,
      practicesThisWeek: current?.practices || 0,
      routineThisWeek: current?.routine || 0,
      totalPractices: state.activityLog.length,
      totalRoutineDays: routineDone.length,
      reviewsDone: state.reviews.length,
      daysToReview: plan ? Math.max(0, week * 7 - day) : null,
      baselinesDone: baselines.length,
      baselinesTotal: ASSESSMENTS.length,
      retestOn: firstBaseline ? addDays(new Date(firstBaseline), RETEST_WINDOW_DAYS) : null,
      perWeek
    };
  };

  /** Where a returning user should land when resuming the first run. */
  const onboardingResume = (root = '') => {
    const state = read();
    if (state.onboarding.planActivated) return `${root}index.html`;
    return nextAction(root).href;
  };

  window.DeepSprout = {
    KEY,
    ASSESSMENTS,
    GOALS,
    ROUTINE_IDEAS,
    RETEST_WINDOW_DAYS,
    get: read,
    update,
    reset,
    dayKey,
    addDays,
    daysBetween,
    formatDate,
    assessmentAttempt,
    saveAssessment,
    assessmentsComplete,
    nextAssessment,
    retestEligible,
    goalLabel,
    cycleDay,
    cycleWeek,
    reviewDue,
    activatePlan,
    recordReview,
    addRoutine,
    updateRoutine,
    removeRoutine,
    logRoutine,
    routineScheduledToday,
    routineDoneToday,
    logActivity,
    activityOn,
    register,
    registrationFor,
    cancelRegistration,
    nextAction,
    stats,
    onboardingResume
  };
})();
