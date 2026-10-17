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
  const access = window.DeepSproutPersonal;
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
    latest: 'your latest valid check-in'
  };

  /** Evidence provenance. Every figure on a page carries exactly one of these. */
  const PROVENANCE = {
    measured: { id: 'measured', label: 'Measured' },
    'self-reported': { id: 'self-reported', label: 'Self-reported' },
    'organiser-confirmed': { id: 'organiser-confirmed', label: 'Organiser-confirmed' },
    'supervisor-confirmed': { id: 'supervisor-confirmed', label: 'Supervisor-confirmed' }
  };

  // Phase-1 measurement contracts. These identify demo protocols, not calibrated tests.
  const ASSESSMENT_CONTRACTS = {
    'digital-habits': {version:'DH-1.0',protocolVersion:'DH-protocol-1',scoringVersion:'DH-sum-1',variant:'eight-statements-1',difficulty:'self-report',conditions:'untimed-five-point-1'},
    'sustained-attention': {version:'SA-1.0',protocolVersion:'SA-uninterrupted-2',scoringVersion:'SA-hits-1',variant:'24-random-targets-1',difficulty:'standard',conditions:'visual-space-or-tap-1'},
    'inhibitory-control': {version:'IC-1.0',protocolVersion:'IC-uninterrupted-2',scoringVersion:'IC-withhold-1',variant:'40-random-go-nogo-1',difficulty:'standard',conditions:'visual-space-or-tap-1'},
    'depth-challenge': {version:'DC-1.0-a',protocolVersion:'DC-continuous-1',scoringVersion:'DC-five-questions-1',variant:'cost-of-switching-a',difficulty:'Tier 1',conditions:'single-reading-no-return-1'}
  };
  const contractFor = id => ({definitionId:id,...ASSESSMENT_CONTRACTS[id]});
  const validResult = attempt => Boolean(attempt?.official && attempt.valid === true && (attempt.status === 'Completed' || attempt.legacy === true) && /^\d{4}-\d{2}-\d{2}$/.test(attempt.on||'') && Number.isFinite(attempt.score) && (attempt.legacy===true||attempt.validity?.status==='Valid'&&Number.isFinite(Date.parse(attempt.startedAt))&&Number.isFinite(Date.parse(attempt.completedAt))&&Date.parse(attempt.completedAt)>=Date.parse(attempt.startedAt)));
  const matchesContract = (attempt, id) => validResult(attempt) && Object.entries(contractFor(id)).every(([k,v]) => attempt[k] === v);
  const compatible = (a,b) => {
    if(!validResult(a)||!validResult(b))return 'Both results must be valid, completed official attempts.';
    for(const key of ['definitionId','version','protocolVersion','scoringVersion','variant','difficulty','conditions'])if(!a[key]||a[key]!==b[key])return `Comparison unavailable: ${key} differs or was not recorded. Both historical results are retained.`;
    if(a.definitionId!=='digital-habits'&&['presentation','response'].some(key=>!a.measurementContext?.[key]||a.measurementContext[key]==='unrecorded'||a.measurementContext[key]!==b.measurementContext?.[key]))return 'Comparison unavailable: response method or presentation conditions differ or were not recorded.';
    if(a.on>b.on||a.completedAt&&b.completedAt&&Date.parse(a.completedAt)>Date.parse(b.completedAt))return 'Comparison unavailable: result dates are out of order.';
    return null;
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
    const list = JSON.parse(localStorage.getItem(changesKey(choice)) || '[]');
    if (!Array.isArray(list)) throw new Error('The personal journal is invalid; its original data has been preserved.');
    return list;
  };
  const writeChanges = (choice, list) => {
    access.save(changesKey(choice), JSON.stringify(list));
  };

  /** A routine item's schedule as dated versions, so an edit never rewrites the past. */
  const scheduleOf = item => (item.schedule?.length
    ? item.schedule
    : [{ from: item.createdOn, days: item.days || [], recurrence: item.recurrence || 'weekly', paused: Boolean(item.paused) }]);

  const applyChange = (data, event) => {
    if (event.preferences) data.preferences = {...data.preferences, ...event.preferences};
    const item = event.id ? data.routine.find(entry => entry.id === event.id) : null;
    switch (event.type) {
      case 'shield.sync':
        data.browserShield={...(data.browserShield||{}),snapshot:JSON.parse(JSON.stringify(event.snapshot)),syncedAt:event.receivedAt};
        if(event.connection)data.browserShield.connection=JSON.parse(JSON.stringify(event.connection));
        break;
      case 'shield.disconnect':
        if(data.browserShield)data.browserShield.connection=null;
        break;
      case 'routine.add':
        data.routine.push({
          id: event.id, title: event.title, hint: event.hint || '', createdOn: event.on, removedOn: null, checkIns: [],
          days: event.days, recurrence: event.recurrence || 'weekly', paused: false,
          schedule: [{ from: event.on, days: event.days, recurrence: event.recurrence || 'weekly', paused: false }]
        });
        break;
      case 'routine.update': {
        if (!item) break;
        if (event.title){item.title=event.title;item.titleUpdatedOn=event.on;}
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
        if (event.status) item.checkIns.push({ date: event.date, status: event.status, ...(event.titleSnapshot?{title:event.titleSnapshot}:{}) });
        item.checkIns.sort((a, b) => a.date.localeCompare(b.date));
        break;
      }
      case 'practice.start':
        (data.practiceRuns ||= []).push(JSON.parse(JSON.stringify(event.run))); break;
      case 'practice.progress': {
        const run=(data.practiceRuns||[]).find(r=>r.id===event.id);if(run)Object.assign(run,JSON.parse(JSON.stringify(event.patch)));break;
      }
      case 'practice.submit': {
        const run=(data.practiceRuns||[]).find(r=>r.id===event.attempt.id);
        if(run){Object.assign(run,{status:event.attempt.status,endedAt:event.at,transitions:[...run.transitions,{status:'Submitted',at:event.at},{status:event.attempt.status,at:event.at}]});}
        if(!data.activityAttempts.some(a=>a.id===event.attempt.id))data.activityAttempts.push(JSON.parse(JSON.stringify(event.attempt)));
        const scheduled=data.scheduledActions.find(a=>a.id===event.attempt.scheduledActionId);if(scheduled&&event.attempt.valid&&(scheduled.policyVersion!==1||event.attempt.personId===scheduled.personId&&event.attempt.activityType===scheduled.activityType&&event.attempt.on>=scheduled.startsOn&&event.attempt.on<=scheduled.dueOn)){scheduled.completedAttemptId=event.attempt.id;scheduled.completedAt=event.attempt.completedAt;}break;
      }
      case 'practice.level':
        data.levelEvents.push(JSON.parse(JSON.stringify(event.decision)));break;
      case 'practice.policy': data.practicePolicy=JSON.parse(JSON.stringify(event.policy));break;
      case 'practice.correct':
        (data.practiceCorrections ||= []).push(JSON.parse(JSON.stringify(event.correction)));break;
      case 'attempt.add':
        if(!data.activityAttempts.some(a=>a.id===event.attempt.id))data.activityAttempts.push(JSON.parse(JSON.stringify(event.attempt)));
        break;
      case 'review.add':
        if (!event.recoveryTransaction&&!data.weeklyReviews.some(review => review.week === event.review.week)) data.weeklyReviews.push(event.review);
        break;
      case 'assessment.start':
        (data.assessmentRuns ||= []).push(JSON.parse(JSON.stringify(event.run))); break;
      case 'assessment.progress': {
        const run=(data.assessmentRuns||[]).find(r=>r.id===event.id);if(run){run.answers={...event.answers};run.updatedAt=event.at;}break;
      }
      case 'assessment.interrupt': {
        const run=(data.assessmentRuns||[]).find(r=>r.id===event.id);if(run){run.status='Interrupted';run.reason=event.reason;run.endedAt=event.at;}break;
      }
      case 'assessment.add': {
        data.assessmentAttempts.push(event.attempt);
        const run=(data.assessmentRuns||[]).find(r=>r.id===event.attempt.id);if(run){run.status=event.attempt.valid?'Completed':'Invalid';run.endedAt=event.attempt.completedAt;}break;
      }
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
      case 'plan.activate': {
        // First-run activation from Your Starting Point. Applied once; a later
        // replay of the same event never creates a second plan.
        if (data.plan) break;
        data.plan = { id:event.planId,personId:event.personId,policyVersion:event.policyVersion,baselineIds:event.baselineIds,activatedAt:event.at,cycleNumber: 1, startDate: event.on, lengthDays: event.lengthDays || 28, activatedOn: event.on,
          direction: (event.direction || []).map((entry, index) => ({ week: index + 1, title: entry.title, note: entry.note })) };
        if(event.policyVersion===1&&event.planId)for(const type of data.catalog.activityTypes)if(!data.levelEvents.some(e=>e.activityType===type.id))data.levelEvents.push({id:`initial-${event.planId}-${type.id}`,activityType:type.id,level:1,on:event.on,policyVersion:1,sourcePlanId:event.planId,detail:'Introductory demo starting level; no calibrated cognitive inference.'});
        if (event.commitment) data.routine.push({id:`r-plan-${event.on}`, title:event.commitment.title, hint:event.commitment.hint || '', createdOn:event.on, removedOn:null, checkIns:[], schedule:[{from:event.on,days:[0,1,2,3,4,5,6],recurrence:'weekly',paused:false}]});
        if (event.goal) data.user.goal = { id: event.goal, label: event.goalLabel || '', setOn: event.on };
        if(!event.recoveryTransaction)(event.schedule || []).forEach((entry, index) => data.scheduledActions.push({ id: `s-${event.on}-${index}`, date: entry.date, kind: 'practice', activityType: entry.activityType, level: 1, minutes: entry.minutes || 5 }));
        break;
      }
      case 'personal.clock': data.personalClock=event.clock;break;
      case 'lab.policy': data.labPolicy=event.policy;break;
      case 'tour.record': data.productTour={status:event.status,version:1,personId:event.personId,at:event.at};break;
      case 'onboarding.preview': data.onboardingPreview=event.preview;break;
      case 'plan.adjust':
        if(!event.recoveryTransaction)(data.planAdjustments ||= []).push({ on: event.on, label: event.label, detail: event.detail });
        break;
      default: break;
    }
    if(event.recoveryTransaction){
      const tx=JSON.parse(JSON.stringify(event.recoveryTransaction));data.recovery=tx.state;
      for(const patch of tx.updates){const a=data.scheduledActions.find(a=>a.id===patch.id);if(a)Object.assign(a,patch);}
      for(const a of tx.actions)if(!data.scheduledActions.some(old=>old.id===a.id))data.scheduledActions.push(a);
      if(tx.review&&!data.weeklyReviews.some(r=>r.id===tx.review.id))data.weeklyReviews.push(tx.review);
      if(tx.levelDecision)data.levelEvents.push(tx.levelDecision);
      const revision=tx.state.revisions.at(-1);
      if(['recovery.adjust','recovery.reschedule','plan.adjust'].includes(event.type))data.planAdjustments.push({on:event.on,label:event.label||'Future schedule revised',detail:revision.reason,revisionId:revision.id,cycleId:revision.cycleId});
    }
  };

  const createAccount = (seed, choice, catalogue = { listings: [] }, subject, practices) => {
    const data = JSON.parse(JSON.stringify(seed));
    data.planAdjustments ||= [];
    data.assessmentRuns ||= [];
    // Seeded legacy measurements stay historical; missing protocols are never invented.
    data.assessmentAttempts=data.assessmentAttempts.map(a=>({...a,legacy:!a.status,status:a.status||(a.valid===true?'Completed':'Invalid')}));
    const changes = readChanges(choice);
    changes.forEach(event => applyChange(data, event));
    const canonical = access.person();
    if (canonical) { data.user.name = canonical.name; data.user.email = canonical.email; }
    const personalInstant = () => data.personalClock?.at ? new Date(data.personalClock.at) : data.account.asOf ? new Date(`${data.account.asOf}T12:00:00+03:00`) : new Date();
    const personalTimezone=()=>data.personalClock?.timezone||'Asia/Amman';
    const personalDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:personalTimezone(),year:'numeric',month:'2-digit',day:'2-digit'}).format(personalInstant());
    let today = parse(personalDay());
    let todayKey = keyOf(today);
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

    // Recovery state is journal-owned. Snapshots preserve every cycle/week/revision;
    // scheduled actions are never deleted, only attributed future replacements.
    const RECOVERY_DEFAULTS={version:1,cycleDays:28,absenceDays:7,maintenanceDays:1,maxPracticeDays:5};
    const clone=value=>JSON.parse(JSON.stringify(value));
    const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
    const GOALS={'reduce-scrolling':'Spend less time scrolling','intentional-phone':'Use my phone intentionally','offline-time':'Make room for offline life','focus-objective':'Focus on meaningful work'};
    const TYPES=['depth','listening','practical','protected-work'];
    const defaultMix=goal=>goal==='offline-time'?['practical','protected-work']:goal==='focus-objective'?['depth','protected-work','listening']:['practical','protected-work','listening'];
    const recoveryPolicy=()=>({...RECOVERY_DEFAULTS,...data.recovery?.policy});
    const initialPrefs=event=>({days:Math.min(5,Math.max(1,Number(event?.firstRunPlan?.availableDays||data.onboardingPreview?.days||data.user.setup?.availableDays)||3)),minutes:Number(event?.firstRunPlan?.minutes||data.onboardingPreview?.minutes)||5,weekdays:[0,1,2,3,4,5,6],mix:(event?.schedule||data.scheduledActions).some(a=>a.kind!=='rest'&&a.kind!=='review'&&TYPES.includes(a.activityType))?[...new Set((event?.schedule||data.scheduledActions).filter(a=>a.kind!=='rest'&&a.kind!=='review'&&TYPES.includes(a.activityType)).map(a=>a.activityType))]:defaultMix(event?.goal||data.user.goal?.id),goal:event?.goal||data.user.goal?.id,goalLabel:event?.goalLabel||data.user.goal?.label||'Your personal goal',commitment:event?.commitment?.title||data.routine.find(r=>!r.removedOn)?.title||'',routineId:event?`r-plan-${event.on}`:data.routine.find(r=>!r.removedOn)?.id||null});
    const cycleEnd=c=>keyOf(addDays(parse(c.startDate),c.lengthDays-1));
    const cycleWeek=(c,day=personalDay())=>Math.min(Math.ceil(c.lengthDays/7),Math.max(1,Math.floor(daysBetween(parse(c.startDate),parse(day))/7)+1));
    const cyclePrefs=(c,day=personalDay())=>(c.preferenceVersions||[]).filter(v=>v.effectiveOn<=day).at(-1)?.value||c.preferences;
    const recoveryState=()=>{
      if(data.recovery)return clone(data.recovery);
      if(!data.plan)return null;
      const p=data.plan,c={...clone(p),id:p.id||`legacy-cycle:${subject}:${p.startDate}`,personId:subject,legacy:true,status:'Active',mode:'Recovery',preferences:initialPrefs(),preferenceVersions:[],weeks:{},goalLabel:data.user.goal?.label||'',goal:data.user.goal?.id};
      for(let n=1;n<=Math.ceil(c.lengthDays/7);n++){const from=keyOf(addDays(parse(c.startDate),(n-1)*7)),to=keyOf(addDays(parse(from),6)),ids=data.scheduledActions.filter(a=>a.date>=from&&a.date<=to).map(a=>a.id);if(ids.length)c.weeks[n]={number:n,start:from,end:to,actionIds:ids,legacy:true,source:'Original stored schedule; unrecorded obligations are not invented'};}
      return {version:1,personId:subject,journeyId:`journey:${subject}`,activeCycleId:c.id,cycles:[c],revisions:[],policy:RECOVERY_DEFAULTS,lastSeenDay:null,returnNotice:null,legacy:true};
    };
    const activeCycle=state=>{const s=state||recoveryState();return s?.cycles.find(c=>c.id===s.activeCycleId)||null;};
    const cycleActions=c=>data.scheduledActions.filter(a=>a.cycleId===c.id||c.legacy&&!a.cycleId&&a.date>=c.startDate&&a.date<=cycleEnd(c));
    const liveAction=a=>!['Rescheduled','Cancelled'].includes(a.status);
    const actionStarted=id=>(data.practiceRuns||[]).some(r=>r.scheduledActionId===id)||data.activityAttempts.some(a=>a.scheduledActionId===id);
    const reviewedWeek=(c,n)=>data.weeklyReviews.find(r=>r.cycleId===c.id&&r.week===n||c.legacy&&!r.cycleId&&r.week===n);
    const recoveryStatus=c=>!c?null:['Paused','Cancelled','Archived','Reviewed'].includes(c.status)?c.status:personalDay()>cycleEnd(c)?'Cycle Review Due':c.mode==='Maintenance'?'Maintenance':'Active';
    const validatedPrefs=(input,base)=>{
      const p={...clone(base),...clone(input||{})};
      if(!Number.isInteger(Number(p.days))||Number(p.days)<1||Number(p.days)>recoveryPolicy().maxPracticeDays)throw new Error('Choose one to five practice days, leaving room for rest.');p.days=Number(p.days);
      if(![5,10,15].includes(Number(p.minutes)))throw new Error('Choose a 5, 10 or 15 minute time preference.');p.minutes=Number(p.minutes);
      if(!Array.isArray(p.weekdays)||!p.weekdays.length||p.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6))throw new Error('Choose at least one available weekday.');p.weekdays=[...new Set(p.weekdays)];
      if(!Array.isArray(p.mix)||!p.mix.length||p.mix.some(t=>!TYPES.includes(t)))throw new Error('Choose approved personal practice types.');p.mix=[...new Set(p.mix)];
      if(!GOALS[p.goal]&&p.goal!==base.goal)throw new Error('Choose a supported personal goal.');
      if(p.goal!==base.goal)p.goalLabel=GOALS[p.goal];
      if(typeof p.commitment!=='string'||!p.commitment.trim()||p.commitment.length>200)throw new Error('Keep one short personal offline commitment.');p.commitment=p.commitment.trim();return p;
    };
    const makeWeek=(c,n,prefs,revisionId,effectiveOn,provided)=>{
      const start=keyOf(addDays(parse(c.startDate),(n-1)*7)),end=keyOf(addDays(parse(start),6));
      const dates=range(parse(start),7).map(keyOf),available=dates.filter(d=>d>=effectiveOn&&prefs.weekdays.includes(parse(d).getDay())),eligible=available.length>1?available.filter(d=>d!==end):available;
      const preserved=cycleActions(c).filter(a=>liveAction(a)&&a.kind==='practice'&&a.date>=start&&a.date<=end&&(a.date<effectiveOn||actionStarted(a.id))).length,budget=Math.max(0,prefs.days-preserved),count=Math.min(budget,eligible.length);
      const chosen=new Set(Array.from({length:count},(_,i)=>eligible[Math.floor(i*eligible.length/count)]));
      const actions=[];let index=0;
      for(const date of dates){
        if(date<effectiveOn)continue;
        const original=provided?.find(a=>a.date===date&&a.kind!=='rest'&&a.kind!=='review'&&TYPES.includes(a.activityType));
        const type=original?.activityType||prefs.mix[index%prefs.mix.length];
        const practice=provided?!!original:chosen.has(date);
        const level=training().find(t=>t.id===type)?.level||1;
        const base={personId:subject,journeyId:`journey:${subject}`,planId:data.plan?.id||c.planId||c.id,cycleId:c.id,week:n,date,startsOn:date,dueOn:date,required:true,revisionId,policyVersion:1,status:'Scheduled',minutes:prefs.minutes,timeBudgetMinutes:prefs.minutes,estimatedMinutes:null};
        actions.push({...base,id:uid('scheduled'),kind:practice?'practice':date===end?'review':'rest',required:practice||date===end,activityType:practice?type:undefined,level:practice?level:undefined,minutes:practice?(original?.minutes||prefs.minutes):prefs.minutes,selectionPolicy:practice?'approved-current-level-content-v1':undefined});
        if(practice)index++;
        if(date===end&&practice)actions.push({...base,id:uid('review'),kind:'review'});
        actions.push({...base,id:uid('routine-ref'),kind:'routine',required:false,routineId:prefs.routineId,title:prefs.commitment,evidenceTier:'Self-reported'});
      }
      return {week:{id:`week:${c.id}:${n}`,personId:subject,journeyId:`journey:${subject}`,cycleId:c.id,planId:c.planId||data.plan?.id,number:n,start,end,priorVersions:[],actionIds:actions.map(a=>a.id),revisionId,policyVersion:1,source:provided?'Original activation preview':'Versioned future schedule',effectiveOn},actions};
    };
    const evidenceFor=(c,n)=>{
      const actions=cycleActions(c).filter(a=>a.week===n||c.legacy&&a.date>=keyOf(addDays(parse(c.startDate),(n-1)*7))&&a.date<=keyOf(addDays(parse(c.startDate),n*7-1))).filter(liveAction),practicesDue=actions.filter(a=>a.kind==='practice'&&a.date<=personalDay());
      const complete=practicesDue.map(a=>({a,attempt:validAttemptFor(a.id)})),from=parse(keyOf(addDays(parse(c.startDate),(n-1)*7))),to=addDays(from,6);
      return {personId:subject,cycleId:c.id,week:n,scheduled:actions.filter(a=>a.kind==='practice').length,due:practicesDue.length,completed:complete.filter(x=>x.attempt).length,missed:complete.filter(x=>!x.attempt&&x.a.date<personalDay()).length,invalid:data.activityAttempts.filter(a=>!a.valid&&a.on<=personalDay()&&practicesDue.some(d=>d.id===a.scheduledActionId)).map(a=>a.id),attempts:complete.flatMap(x=>x.attempt?[{id:x.attempt.id,scheduledActionId:x.a.id,activityType:x.attempt.activityType,level:x.attempt.level,on:x.attempt.on,score:x.attempt.score??null,evidenceTier:x.attempt.evidenceTier||'Legacy recorded evidence',contentVersion:x.attempt.contentVersion||null}]:[]),attemptIds:complete.flatMap(x=>x.attempt?[x.attempt.id]:[]),actionIds:practicesDue.map(a=>a.id),routine:{done:from>parse(personalDay())?0:routineDays(from,to>parse(personalDay())?parse(personalDay()):to).length,scheduled:routineScheduledDays(from,to).length,evidenceTier:'Self-reported'},lab:{state:checkInWindow().state,note:'Independent weekly eligibility; review does not require an assessment'},shield:shieldEvidence(from,to),levels:training().map(t=>({type:t.id,level:t.level})),coverage:'Only original scheduled actions and linked eligible attempts count; other days have no reliable scheduled evidence.'};
    };
    const weeklyProposal=(number,answers={},adjustments=null)=>{
      const state=recoveryState(),c=activeCycle(state);if(!c)throw new Error('Activate a personal plan first.');
      const n=Number(number),end=keyOf(addDays(parse(c.startDate),n*7-1));if(!Number.isInteger(n)||n<1||n>Math.ceil(c.lengthDays/7))throw new Error('Choose a week in this cycle.');
      const evidence=evidenceFor(c,n),base=cyclePrefs(c,end),proposed=clone(base),why=[`${evidence.completed} of ${evidence.due} due practices completed; ${evidence.missed} missed. ${evidence.routine.done} routine days self-reported.`,evidence.shield.note];
      if(answers.manageable==='too-much'||evidence.missed>=2&&answers.manageable==='a-stretch'){proposed.days=Math.max(1,Math.ceil(base.days/2));why.push('A smaller future load is suggested from your manageability answer and recorded schedule, not a medical inference.');}
      else why.push('Keep a conservative cadence; no difficulty or load increases automatically.');
      if(answers.fit==='poor-fit'){proposed.mix=TYPES.filter(t=>!base.mix.includes(t));if(!proposed.mix.length)proposed.mix=[...base.mix].reverse();why.push('Alternative approved practice types reflect your reported fit.');}
      if(evidence.missed>=2)why.push('Several scheduled practices have no valid completion. Keep pace or preview a smaller future load; no missed backlog is added.');
      const prefs=adjustments?validatedPrefs(adjustments,proposed):proposed;
      return {id:`proposal:${c.id}:${n}:${state.revisions.length}`,personId:subject,journeyId:state.journeyId,cycleId:c.id,week:n,nextWeek:n<Math.ceil(c.lengthDays/7)?n+1:null,ruleVersion:1,sourceRevision:state.revisions.length,answers:clone(answers),evidence,preferences:prefs,previousPreferences:base,why,opensOn:keyOf(addDays(parse(end),-1)),dueOn:end,preview: n<Math.ceil(c.lengthDays/7)?makeWeek(c,n+1,prefs,'preview',keyOf(addDays(parse(end),1))).actions:[]};
    };
    const recoverySnapshot=()=>{
      const state=recoveryState();if(!state)return null;const c=activeCycle(state);
      return {...state,actions:clone(data.scheduledActions),reviews:clone(data.weeklyReviews),current:c,status:recoveryStatus(c),preferences:cyclePrefs(c),currentWeek:cycleWeek(c),cycleEvidence:Array.from({length:Math.ceil(c.lengthDays/7)},(_,i)=>evidenceFor(c,i+1)),evidence:evidenceFor(c,cycleWeek(c)),nextReview:Array.from({length:Math.ceil(c.lengthDays/7)},(_,i)=>i+1).find(n=>!reviewedWeek(c,n))||null};
    };
    const continuationPreview=choice=>{
      const state=recoveryState(),c=activeCycle(state);if(!c?.cycleReview||!['Reviewed','Archived'].includes(c.status))throw new Error('Review this ended cycle first.');
      if(!['next','maintenance'].includes(choice))throw new Error('Choose Next Cycle or Maintenance.');
      const preferences=validatedPrefs({},c.continuationPreferences||cyclePrefs(c));if(choice==='maintenance')preferences.days=Math.min(preferences.days,state.policy.maintenanceDays);
      const next={id:'continuation-preview',personId:subject,planId:c.planId||data.plan?.id,startDate:personalDay(),lengthDays:state.policy.cycleDays,preferences};
      return {choice,preferences,sourceRevision:state.revisions.length,actions:makeWeek(next,1,preferences,'preview',personalDay()).actions,reason:'Continue from your current goal, approved preferences and independent levels. No baseline or earned source resets.'};
    };

    const adjustmentPreview=input=>{
      const s=recoveryState(),c=activeCycle(s);if(!c||!['Active','Maintenance'].includes(recoveryStatus(c)))throw new Error('Adjust an active personal cycle.');
      const effectiveOn=keyOf(addDays(parse(personalDay()),1)),prefs=validatedPrefs(input,cyclePrefs(c));
      const replace=cycleActions(c).filter(a=>liveAction(a)&&a.date>=effectiveOn&&!actionStarted(a.id));
      const weeks=[...new Set(replace.map(a=>a.week||Math.floor(daysBetween(parse(c.startDate),parse(a.date))/7)+1))];
      const actions=weeks.flatMap(n=>makeWeek(c,n,prefs,'preview',effectiveOn).actions);
      return {cycleId:c.id,sourceRevision:s.revisions.length,effectiveOn,preferences:prefs,supersededIds:replace.map(a=>a.id),actions,reason:input.reason||'User requested future adjustment',lowerType:input.lowerType||null};
    };
    const buildRecoveryTransaction=full=>{
      const type=full.type;let state=recoveryState(),c=activeCycle(state),actions=[],updates=[],review=null,levelDecision=null;
      const assert= (condition,message)=>{if(!condition)throw new Error(message);};
      const revision={id:uid('revision'),actorId:subject,personId:subject,at:full.at,on:full.on,effectiveOn:full.on,policyVersion:1,reason:full.reason||type,action:type,decision:full.choice||null,previousVersion:state?.revisions.length||0};
      if(type==='plan.activate'){
        const id=uid('cycle'),prefs=initialPrefs(full);c={id,personId:subject,journeyId:`journey:${subject}`,createdAt:full.at,actorId:subject,initialRevisionId:revision.id,planId:full.planId,startDate:full.on,lengthDays:recoveryPolicy().cycleDays,cycleNumber:1,status:'Active',mode:'Recovery',direction:clone(full.direction||[]),goal:full.goal,goalLabel:full.goalLabel||GOALS[full.goal],preferences:prefs,preferenceVersions:[{effectiveOn:full.on,value:prefs,revisionId:revision.id}],weeks:{},baselineIds:full.baselineIds};
        state={version:1,journeyId:`journey:${subject}`,personId:subject,activeCycleId:id,cycles:[c],revisions:[],policy:recoveryPolicy(),lastSeenDay:full.on,returnNotice:null};
        const detail=makeWeek(c,1,prefs,revision.id,full.on,full.schedule?.length?full.schedule:null);c.weeks[1]=detail.week;actions=detail.actions;
      } else {
        assert(c,'Activate your original plan before changing Recovery.');if(!['recovery.visit','recovery.policy'].includes(type))assert(full.on>=c.startDate,'The personal clock is before this cycle. Restore its current date before changing it.');
        if(full.expectedRevision!==undefined)assert(full.expectedRevision===state.revisions.length,'This preview is stale. Preview the current schedule again.');
        if(type==='recovery.policy'){
          assert(devMode(),'Recovery policy controls are local demo settings.');const p={...recoveryPolicy(),...full.policy,version:1};assert(Number.isInteger(p.cycleDays)&&p.cycleDays>=14&&p.cycleDays<=28&&p.cycleDays%7===0,'Choose a cycle of two to four complete weeks.');assert(Number.isInteger(p.absenceDays)&&p.absenceDays>=7&&p.absenceDays<=30,'Choose an absence threshold of 7–30 days.');assert(Number.isInteger(p.maintenanceDays)&&p.maintenanceDays>=1&&p.maintenanceDays<=2,'Maintenance has one or two practices per week.');p.maxPracticeDays=5;state.policy=p;
        } else if(type==='recovery.visit'){
          if(state.lastSeenDay===full.on&&(c.weeks[cycleWeek(c)]||!['Active','Maintenance'].includes(recoveryStatus(c))))return null;
          if(state.lastSeenDay&&daysBetween(parse(state.lastSeenDay),parse(full.on))>=state.policy.absenceDays&&!state.returnNotice?.pending){const sources=cycleActions(c).filter(a=>a.kind==='practice'&&liveAction(a)&&a.date>state.lastSeenDay&&a.date<full.on);state.returnNotice={id:uid('return'),from:state.lastSeenDay,to:full.on,pending:true,completed:sources.filter(a=>validAttemptFor(a.id)).length,missed:sources.filter(a=>!validAttemptFor(a.id)).length,note:'Unscheduled or unobserved days remain unknown. No missed backlog is assigned.'};}
          state.lastSeenDay=full.on;
          const n=cycleWeek(c);
          if(['Active','Maintenance'].includes(recoveryStatus(c))&&!c.weeks[n]){const detail=makeWeek(c,n,cyclePrefs(c),revision.id,full.on);c.weeks[n]={...detail.week,source:'Conservative continuation after skipped review'};actions=detail.actions;revision.reason='Interim fallback: current week only, same or lower cadence, no fabricated past work or completed review.';}
        } else if(type==='recovery.return'){
          assert(state.returnNotice?.pending,'There is no pending return decision.');assert(['Resume','Adjust'].includes(full.choice),'Choose Resume or Adjust.');state.returnNotice={...state.returnNotice,pending:false,choice:full.choice,actorId:subject,at:full.at};
        } else if(type==='recovery.week.decide'||type==='review.add'){
          assert(['Active','Maintenance','Cycle Review Due'].includes(recoveryStatus(c)),'This cycle is not open for review.');
          const n=Number(full.week||full.review?.week),answers=full.answers||full.review?.answers||{},proposal=weeklyProposal(n,answers);
          assert(full.on>=proposal.opensOn,'This weekly review has not opened yet.');assert(!reviewedWeek(c,n),'This original week is already reviewed.');
          assert(['too-light','about-right','a-stretch','too-much'].includes(answers.manageable)&&['good-fit','mixed','poor-fit'].includes(answers.fit),'Answer both short review questions.');
          const choice=full.choice|| (full.review?.outcome==='keep-pace'?'keep':full.review?.outcome==='adjust'?'adjust':'accept');assert(['accept','keep','adjust'].includes(choice),'Choose Accept, Keep Current Pace or Adjust.');
          const prefs=choice==='keep'?proposal.previousPreferences:choice==='adjust'?validatedPrefs(full.adjustments||{},proposal.preferences):proposal.preferences;
          revision.previousPreferences=clone(proposal.previousPreferences);revision.nextPreferences=clone(prefs);revision.decision=choice;revision.evidence=proposal.evidence;revision.effectiveOn=keyOf(addDays(parse(full.on),1));revision.reason=proposal.why.join(' ');
          review={id:uid('weekly-review'),personId:subject,journeyId:state.journeyId,cycleId:c.id,week:n,answers,decision:choice,chosenPreferences:clone(prefs),outcome:full.review?.outcome||choice,completedOn:full.on,at:full.at,revisionId:revision.id,policyVersion:1,evidence:proposal.evidence,proposal,adjustment:{on:full.on,label:choice==='keep'?'Current pace kept':prefs.days<proposal.previousPreferences.days?'Lighter week ahead':'Next week planned',detail:revision.reason}};
          if(!proposal.nextWeek)c.continuationPreferences=clone(prefs);
          if(proposal.nextWeek&&full.on<keyOf(addDays(parse(c.startDate),proposal.nextWeek*7-1))&&full.on<=cycleEnd(c)){
            const effective=keyOf(addDays(parse(proposal.dueOn),1))>revision.effectiveOn?keyOf(addDays(parse(proposal.dueOn),1)):revision.effectiveOn;
            const replace=cycleActions(c).filter(a=>(a.week||cycleWeek(c,a.date))===proposal.nextWeek&&liveAction(a)&&a.date>=effective&&!actionStarted(a.id));updates=replace.map(a=>({id:a.id,status:'Rescheduled',replacementRevisionId:revision.id,reason:'Reviewed future schedule'}));
            const detail=makeWeek(c,proposal.nextWeek,prefs,revision.id,effective);actions=detail.actions.filter(a=>!cycleActions(c).some(old=>(old.week||cycleWeek(c,old.date))===a.week&&old.date===a.date&&old.kind===a.kind&&liveAction(old)&&!replace.some(x=>x.id===old.id)));c.weeks[proposal.nextWeek]={...detail.week,priorVersions:c.weeks[proposal.nextWeek]?[...(c.weeks[proposal.nextWeek].priorVersions||[]),{...c.weeks[proposal.nextWeek],priorVersions:undefined}]:[],actionIds:[...(c.weeks[proposal.nextWeek]?.actionIds||[]),...actions.map(a=>a.id)]};c.preferenceVersions.push({effectiveOn:effective,value:prefs,revisionId:revision.id});
          }
        } else if(type==='recovery.preview'){
          const preview=adjustmentPreview(full.adjustments||{});assert(full.reason?.trim(),'Explain this future preview.');state.adjustmentDraft={...preview,id:uid('preview'),focus:full.focus||'depth',reason:full.reason.trim(),at:full.at,personId:subject};return {state,actions:[],updates:[],review:null,levelDecision:null};
        } else if(type==='recovery.adjust'||type==='plan.adjust'){
          state.adjustmentDraft=null;
          assert(full.reason?.trim(),'Explain the future change.');const preview=adjustmentPreview(full.adjustments||full.input||{});revision.effectiveOn=preview.effectiveOn;revision.reason=full.reason.trim();revision.previousPreferences=cyclePrefs(c);revision.nextPreferences=preview.preferences;
          updates=preview.supersededIds.map(id=>({id,status:'Rescheduled',replacementRevisionId:revision.id,reason:revision.reason}));
          const affected=[...new Set(preview.actions.map(a=>a.week))];for(const n of affected){const detail=makeWeek(c,n,preview.preferences,revision.id,preview.effectiveOn);const preserved=cycleActions(c).filter(a=>liveAction(a)&&!preview.supersededIds.includes(a.id));actions.push(...detail.actions.filter(a=>!preserved.some(old=>old.date===a.date&&old.kind===a.kind)));c.weeks[n]={...c.weeks[n],priorVersions:c.weeks[n]?[...(c.weeks[n].priorVersions||[]),{...c.weeks[n],priorVersions:undefined}]:[],revisionId:revision.id,actionIds:[...(c.weeks[n]?.actionIds||[]),...actions.filter(a=>a.week===n).map(a=>a.id)]};}
          c.preferenceVersions.push({effectiveOn:preview.effectiveOn,value:preview.preferences,revisionId:revision.id});
          if(preview.lowerType){const current=training().find(t=>t.id===preview.lowerType);assert(current?.level>1,'This practice is already at its introductory level.');levelDecision={id:uid('level'),activityType:current.id,from:current.level,level:current.level-1,choice:'down',excludedAttemptIds:data.activityAttempts.map(a=>a.id),personId:subject,on:full.on,at:full.at,policyVersion:1,detail:'Explicit lower difficulty request from Recovery; earlier attempts preserved.'};for(const a of actions)if(a.activityType===current.id)a.level=current.level-1;}
        } else if(type==='recovery.reschedule'){
          const a=cycleActions(c).find(a=>a.id===full.actionId);assert(a&&a.kind==='practice'&&liveAction(a),'Choose your own current personal scheduled practice; Coach assignments and bookings cannot be edited here.');assert(a.date>full.on&&!actionStarted(a.id),'Only future unstarted obligations can be rescheduled.');assert(full.reason?.trim(),'Give a rescheduling reason.');assert(/^\d{4}-\d{2}-\d{2}$/.test(full.date||'')&&Number.isFinite(parse(full.date).getTime())&&keyOf(parse(full.date))===full.date&&full.date>full.on&&full.date>=c.startDate&&full.date<=cycleEnd(c),'Choose a future date in this cycle.');assert(!cycleActions(c).some(x=>x.kind==='practice'&&liveAction(x)&&x.date===full.date),'There is already a practice on this date.');
          const type=full.activityType||a.activityType;assert(TYPES.includes(type),'Choose an approved practice alternative.');updates=[{id:a.id,status:'Rescheduled',replacementRevisionId:revision.id,reason:full.reason}];const id=uid('scheduled');actions=[{...clone(a),id,originalActionId:a.id,activityType:type,level:training().find(t=>t.id===type)?.level||a.level,date:full.date,startsOn:full.date,dueOn:full.date,week:cycleWeek(c,full.date),revisionId:revision.id,status:'Scheduled'}];revision.effectiveOn=full.date;
        } else if(type==='recovery.lifecycle'){
          assert(['pause','resume','cancel','archive'].includes(full.choice),'Choose a cycle action.');
          if(full.choice==='pause'){assert(['Active','Maintenance'].includes(recoveryStatus(c)),'Only an active cycle can be paused.');c.status='Paused';}
          if(full.choice==='resume'){assert(c.status==='Paused','Only a paused cycle can resume.');c.status='Active';const n=cycleWeek(c);if(full.on<=cycleEnd(c)&&!c.weeks[n]){const detail=makeWeek(c,n,cyclePrefs(c),revision.id,full.on);c.weeks[n]={...detail.week,source:'Resume without missed backlog'};actions=detail.actions;}}
          if(full.choice==='cancel'){assert(['Active','Maintenance','Paused','Cycle Review Due'].includes(recoveryStatus(c)),'This cycle is already closed.');assert(full.reason?.trim(),'Give a cancellation reason.');c.status='Cancelled';updates=cycleActions(c).filter(a=>liveAction(a)&&a.date>=full.on&&!validAttemptFor(a.id)).map(a=>({id:a.id,status:'Cancelled',reason:full.reason,closedAt:full.at}));}
          if(full.choice==='archive'){assert(['Cancelled','Reviewed'].includes(c.status),'Review or cancel before archiving.');c.status='Archived';}
        } else if(type==='recovery.cycle.review'){
          assert(recoveryStatus(c)==='Cycle Review Due','The cycle has not ended or was already reviewed.');assert(full.reflection?.trim(),'Record a short cycle reflection.');c.status='Reviewed';c.cycleReview={id:uid('cycle-review'),personId:subject,journeyId:state.journeyId,cycleId:c.id,revisionId:revision.id,actorId:subject,at:full.at,reflection:full.reflection.trim(),evidence:Array.from({length:Math.ceil(c.lengthDays/7)},(_,i)=>evidenceFor(c,i+1)),policyVersion:1};
        } else if(type==='recovery.continue'){
          assert(['Reviewed','Archived'].includes(c.status)&&c.cycleReview,'Review the ended cycle before choosing its continuation.');assert(!c.continuationId,'This cycle already has a continuation.');assert(['next','maintenance'].includes(full.choice),'Choose Next Cycle or Maintenance.');
          const prefs=validatedPrefs(full.adjustments||{},c.continuationPreferences||cyclePrefs(c));if(full.choice==='maintenance')prefs.days=Math.min(prefs.days,state.policy.maintenanceDays);const id=uid('cycle');c.continuationId=id;c.endedAt=full.at;
          const next={id,personId:subject,journeyId:state.journeyId,createdAt:full.at,actorId:subject,initialRevisionId:revision.id,planId:c.planId||data.plan?.id,startDate:full.on,lengthDays:state.policy.cycleDays,cycleNumber:c.cycleNumber+1,status:'Active',mode:full.choice==='maintenance'?'Maintenance':'Recovery',goal:prefs.goal,goalLabel:prefs.goalLabel,preferences:prefs,preferenceVersions:[{effectiveOn:full.on,value:prefs,revisionId:revision.id}],weeks:{},previousCycleId:c.id,baselineIds:data.plan.baselineIds||[]};
          const detail=makeWeek(next,1,prefs,revision.id,full.on);next.weeks[1]=detail.week;actions=detail.actions;state.cycles.push(next);state.activeCycleId=id;c=next;
        } else throw new Error('Unsupported Recovery command.');
      }
      revision.journeyId=state.journeyId;revision.cycleId=c.id;revision.version=state.revisions.length+1;revision.originalActionIds=updates.map(a=>a.id);revision.actionIds=actions.map(a=>a.id);if(review)revision.reviewId=review.id;state.revisions.push(revision);
      return {state,actions,updates,review,levelDecision};
    };

    /* ---- plan */

    const legacyPlan = () => {
      const raw = data.plan;
      if (!raw) return null;
      const start = parse(raw.startDate);
      const end = addDays(start, raw.lengthDays - 1);
      const day = Math.min(raw.lengthDays, Math.max(1, daysBetween(start, today) + 1));
      const weeks = Math.ceil(raw.lengthDays / 7);
      const week = Math.min(weeks, Math.ceil(day / 7));
      return {
        id:raw.id,personId:raw.personId,policyVersion:raw.policyVersion,activatedAt:raw.activatedAt,
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
          status: entry.week < week ? 'historical' : entry.week === week ? 'current' : 'upcoming'
        }))
      };
    };

    const plan = () => {
      if(!data.recovery)return legacyPlan();
      const state=recoveryState(),c=activeCycle(state),day=Math.min(c.lengthDays,Math.max(1,daysBetween(parse(c.startDate),parse(personalDay()))+1)),week=cycleWeek(c),prefs=cyclePrefs(c);
      return {id:c.planId||data.plan?.id,personId:subject,journeyId:state.journeyId,cycleId:c.id,cycleNumber:c.cycleNumber,policyVersion:1,activatedAt:data.plan?.activatedAt,start:parse(c.startDate),end:parse(cycleEnd(c)),lengthDays:c.lengthDays,day,week,weeks:Math.ceil(c.lengthDays/7),status:recoveryStatus(c),mode:c.mode,goalLabel:prefs.goalLabel||c.goalLabel,goal:prefs.goal,direction:Array.from({length:Math.ceil(c.lengthDays/7)},(_,i)=>({week:i+1,title:c.direction?.[i]?.title||(i===0?'A manageable beginning':i===Math.ceil(c.lengthDays/7)-1?'Review and continue':'Evidence and your choices'),note:c.direction?.[i]?.note||'Personal planning, not a recovery deadline. Difficulty changes only through your independent practice choice.',from:addDays(parse(c.startDate),i*7),to:addDays(parse(c.startDate),i*7+6),detailed:!!c.weeks[i+1],status:i+1<week?'historical':i+1===week?'current':'upcoming'}))};
    };
    const weekDates = week => {
      const current = plan();
      if (!current) return [];
      return range(addDays(current.start, (week - 1) * 7), 7);
    };

    /* ---- schedule and adherence */

    const validAttemptFor = actionId => {
      const action=data.scheduledActions.find(a=>a.id===actionId);if(!action||!liveAction(action))return null;
      return data.activityAttempts.find(a=>a.scheduledActionId===actionId&&a.valid&&a.on<=personalDay()&&(action.policyVersion!==1||a.personId===subject&&a.policyVersion===1&&a.status==='Completed'&&a.activityType===action.activityType&&a.on>=action.startsOn&&a.on<=action.dueOn&&a.definitionSnapshot&&!data.practiceCorrections?.some(c=>c.attemptId===a.id)))||null;
    };
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
        const cycle=activeCycle(),source=data.recovery?cycleActions(cycle):data.scheduledActions,all=source.filter(entry=>entry.date===key&&liveAction(entry)),action=all.find(a=>a.kind==='practice')||all.find(a=>a.kind==='review')||all.find(a=>a.kind==='rest')||source.find(a=>a.date===key&&a.kind==='practice'&&['Rescheduled','Cancelled'].includes(a.status))||null;
        const attempt = action?.kind === 'practice' ? validAttemptFor(action.id) : null;
        let state = 'none';
        if (action?.kind === 'rest') state = 'rest';
        else if (action?.kind === 'practice') {
          if (attempt) state = 'completed';
          else state = key < todayKey ? 'missed' : 'not-due';
        } else if (action?.kind === 'review') {
          const review = cycle?reviewedWeek(cycle,action.week):data.weeklyReviews.find(entry=>entry.week===action.week);
          state = review ? 'completed' : key < todayKey ? 'missed' : 'not-due';
        }
        if(data.recovery){if(action?.status==='Rescheduled')state='rescheduled';else if(action?.status==='Cancelled')state='cancelled';else if(!action)state='unknown';else if(['Paused','Cancelled','Archived'].includes(recoveryStatus(cycle))&&key>=todayKey&&!attempt)state=recoveryStatus(cycle)==='Paused'?'paused':'cancelled';else if(action.kind==='practice'&&!attempt){const run=(data.practiceRuns||[]).find(r=>r.scheduledActionId===action.id);state=key<todayKey?(run?'partial':'missed'):run?'in-progress':key===todayKey?'due':'upcoming';}}
        return {
          actions:all,
          status:({'not-due':key===todayKey?'Due':'Upcoming',none:'No Scheduled Activity',unknown:'Unknown / No Reliable Data','in-progress':'In Progress',partial:'Partial',rest:'Rest',completed:'Completed',missed:'Missed',cancelled:'Cancelled',rescheduled:'Rescheduled',paused:'Paused',due:'Due',upcoming:'Upcoming'})[state],
          date,
          key,
          isToday: key === todayKey,
          state,
          action: action ? { ...action, started:actionStarted(action.id), type: action.activityType ? activityType(action.activityType) : null } : null,
          attempt
        };
      });
    };

    /**
     * Practices completed ÷ practices due so far this week. Rest days and
     * reviews are not counted; a practice is "due" once its day has begun.
     */
    const adherence = week => {
      const days = schedule(week).filter(day => day.action?.kind === 'practice'&&liveAction(day.action));
      const due = days.filter(day => day.key <= todayKey);
      const completed = due.filter(day => day.state === 'completed').length;
      const missed = due.filter(day => ['missed','partial'].includes(day.state)).length;
      return {
        provenance:data.recovery&&!activeCycle()?.legacy?{id:'source-labelled',label:'Linked practice evidence'}:PROVENANCE.measured,
        completed,
        due: due.length,
        missed,
        scheduled: days.length,
        restDays: schedule(week).filter(day => day.state === 'rest').length
      };
    };

    const reviews = () => {
      const current=plan(),cycle=activeCycle(),history=cycle?data.weeklyReviews.filter(r=>r.cycleId===cycle.id||cycle.legacy&&!r.cycleId):data.weeklyReviews;
      const pending=current?data.scheduledActions.filter(a=>a.kind==='review'&&liveAction(a)&&(!a.cycleId||a.cycleId===cycle?.id)&&!history.some(r=>r.week===a.week)).sort((a,b)=>a.date.localeCompare(b.date)):[];
      const nextAction=pending.filter(a=>a.date<personalDay()).at(-1)||pending[0]||null;
      const adjustments=[...history.filter(r=>r.adjustment).map(r=>r.adjustment),...data.planAdjustments].sort((a,b)=>a.on.localeCompare(b.on));
      return {completed:history.length,expected:current?.week||0,nextDue:nextAction?parse(nextAction.date):null,history,lastAdjustment:adjustments.length?{...adjustments.at(-1),on:parse(adjustments.at(-1).on)}:null};
    };

    /* ---- offline routine (self-reported) */

    const activeRoutine = () => data.routine.filter(item => !item.removedOn).map(item=>({...item,title:routineTitleOn(item,parse(personalDay()))}));

    const routineTitleOn=(item,date)=>{
      if(!item)return '';const key=keyOf(date),c=data.recovery?.cycles.find(c=>key>=c.startDate&&key<=cycleEnd(c));
      const version=c?.preferenceVersions?.filter(v=>v.effectiveOn<=key).at(-1),p=version?.value;if(!version||item.titleUpdatedOn&&item.titleUpdatedOn>=version.effectiveOn)return item.title;return p?.routineId===item.id?p.commitment:item.title;
    };

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

    // Real device/browser periods are independent of the personal planning demo clock.
    // Legacy seeded usage remains readable by old consumers; these projections never import it.
    const browserUsage = (days=14) => {
      const s=data.browserShield?.snapshot,now=new Date(),from=keyOf(addDays(now,-(Math.min(62,Math.max(1,days))-1))),to=keyOf(now);
      const periods=clone((s?.periods||[]).filter(p=>p.day>=from&&p.day<=to&&p.observedSeconds>0));
      return {source:'Browser-observed · local extension · active-domain-1',available:periods.length>0,periods,from,to,totalSeconds:periods.reduce((sum,p)=>sum+Object.values(p.seconds).reduce((a,b)=>a+b,0),0),sites:[...new Set(periods.flatMap(p=>Object.keys(p.seconds)))],thresholdSeconds:s?.reminder?.thresholdSeconds||null,configuredSites:s?.reminder?.domains||[],lastSync:data.browserShield?.syncedAt||null,lastObservation:periods.length?Math.max(...periods.map(p=>p.lastObservation)):null,coverage:'Partial coverage. Unfocused, background, idle, restart and unavailable intervals are excluded; missing time is unknown.',comparison:null,comparisonReason:'No comparable complete observation periods are established. Changed selection, settings, timezone or coverage must not imply scrolling reduction.'};
    };
    const shieldEvidence = (from,to) => {
      const usage=browserUsage(62),periods=usage.periods.filter(p=>p.day>=keyOf(from)&&p.day<=keyOf(to));
      return {state:periods.length?'Browser-observed · partial coverage':'No supported live extension evidence',periods,totalSeconds:periods.reduce((sum,p)=>sum+p.observedSeconds,0),source:usage.source,note:periods.length?'Selected-domain activity only; partial coverage. No inferred scrolling reduction or recovery.':data.account.seeded?'Any original seed usage remains demonstration data.':'Missing data is unknown, not zero usage.'};
    };

    const phoneScreenTime = () => {
      const reports = data.selfReports.filter(entry => entry.kind === 'phone-screen-time');
      const latest = reports[reports.length - 1];
      return latest
        ? { provenance: PROVENANCE['self-reported'], minutesPerDay: latest.minutesPerDay, on: parse(latest.on), context: latest.context }
        : null;
    };

    /* ---- training levels, independent per type */

    // Configurable demo defaults. Self-report completion never becomes a measured score.
    const practicePolicy = () => ({...practices.policy,...data.practicePolicy});
    const practiceRuns = () => data.practiceRuns || [];
    const corrected = id => (data.practiceCorrections||[]).some(c=>c.attemptId===id);
    const rewardAttempts = () => [...new Map(data.activityAttempts.filter(a=>a.valid&&a.rewardEligible===true&&a.policyVersion===1&&!corrected(a.id)).map(a=>[a.id,a])).values()];
    const training = () => data.catalog.activityTypes.map(type=>{
      const events=data.levelEvents.filter(e=>e.activityType===type.id);
      const lastDecision=events.filter(e=>e.choice!=='stay').at(-1),level=lastDecision?.level||null,p=practicePolicy();
      const attempts=rewardAttempts().filter(a=>a.activityType===type.id&&a.level===level&&a.on<=personalDay()&&(!lastDecision?.at||a.completedAt>=lastDecision.at)&&a.progressionEligible&&!(lastDecision?.excludedAttemptIds||[]).includes(a.id));
      const distinct=new Set(attempts.map(a=>a.activityId)).size,days=new Set(attempts.map(a=>a.on)).size;
      return {...type,level,maxLevel:p.maxLevel,required:p.distinctToAdvance,validAtLevel:distinct,days,atMax:level>=p.maxLevel,eligible:!!level&&level<p.maxLevel&&distinct>=p.distinctToAdvance&&days>=p.minDaysToAdvance,levelReason:lastDecision?.detail||'',lastAttempt:data.activityAttempts.filter(a=>a.activityType===type.id).at(-1)||null,provenance:{id:'source-labelled',label:'Practice evidence'}};
    });
    const practiceCore = type => data.scheduledActions.find(a=>liveAction(a)&&a.date===personalDay()&&a.kind==='practice'&&a.activityType===type&&(!data.recovery||a.cycleId===data.recovery.activeCycleId||activeCycle()?.legacy&&!a.cycleId)&&(!data.recovery||['Active','Maintenance'].includes(recoveryStatus(activeCycle())))&&!validAttemptFor(a.id));
    const recentContent = id => rewardAttempts().some(a=>a.activityId===id&&a.on<=personalDay()&&daysBetween(parse(a.on),parse(personalDay()))<practicePolicy().rewardCooldownDays);
    const practiceAccess = id => {
      const d=practices.definitions.find(d=>d.id===id),level=d&&training().find(t=>t.id===d.practiceType)?.level,core=d&&practiceCore(d.practiceType);
      const optional=practiceRuns().filter(r=>r.on===personalDay()&&!r.scheduledActionId).length;
      let reason=!d||d.status!=='Published'||d.kind!=='practice'?'Choose a published approved practice.':!level?'Activate your personal plan to initialize these practice levels.':d.level!==level?'Choose content at your current level.':!core&&optional>=practicePolicy().optionalDaily?'Optional practice limit reached today. Scheduled Recovery work remains available.':!core&&recentContent(id)?'Choose different content; this example is inside its reward cooldown.':'';
      return {allowed:!reason,reason,core:core?.id||null,rewardEligible:!!d&&!recentContent(id)};
    };
    const practiceDefinitions = type => practices.definitions.filter(d=>!type||d.practiceType===type).map(d=>({...JSON.parse(JSON.stringify(d)),access:practiceAccess(d.id)}));
    const practiceHistory = () => JSON.parse(JSON.stringify([...data.activityAttempts,...practiceRuns().filter(r=>!data.activityAttempts.some(a=>a.id===r.id))].map(r=>({...r,eligibilityCorrection:(data.practiceCorrections||[]).find(c=>c.attemptId===r.id)||null})))).sort((a,b)=>(b.startedAt||b.on).localeCompare(a.startedAt||a.on));
    /* ---- check-ins (assessments) */

    const officialAttempts = (id,includeFuture=false) => data.assessmentAttempts
      .filter(entry => entry.definitionId === id && validResult(entry) && (includeFuture||entry.on<=personalDay()&&(!entry.completedAt||Date.parse(entry.completedAt)<=personalInstant().getTime())) && (entry.personId===subject||entry.legacy&&data.account.seeded))
      .sort((a, b) => (a.completedAt||a.on).localeCompare(b.completedAt||b.on));

    const baselineResults = () => data.catalog.assessmentDefinitions.map(meta=>({id:meta.id,attempt:officialAttempts(meta.id,true).find(a=>a.personId===subject&&a.kind==='baseline'&&matchesContract(a,meta.id))||null}));
    const baselineComplete = () => baselineResults().every(row=>row.attempt&&Date.parse(row.attempt.completedAt)<=personalInstant().getTime());

    // Interim defaults: three calendar days each week, anchored to the last valid baseline.
    const labPolicy=()=>({version:1,cadenceDays:7,windowDays:3,rotation:['sustained-attention','inhibitory-control','depth-challenge'],...(data.labPolicy||{})});
    const checkInTasks = week => {
      const policy=labPolicy(),ids=['digital-habits',policy.rotation[(Math.max(1,week)-1)%policy.rotation.length]],tasks=ids.map(definition);
      return {kind:'weekly pair',tasks,minutes:tasks.reduce((n,task)=>n+task.minutes,0)};
    };
    const baselineAnchor = () => {
      const current=baselineResults();
      if(current.every(r=>r.attempt))return current.map(r=>r.attempt.on).sort().at(-1);
      if(data.account.seeded&&data.plan&&data.catalog.assessmentDefinitions.every(d=>officialAttempts(d.id).some(a=>a.legacy)))return data.catalog.assessmentDefinitions.map(d=>officialAttempts(d.id)[0].on).sort().at(-1);
      return null;
    };
    const windowFor = week => {
      const anchor=baselineAnchor();if(!anchor)return null;
      const policy=labPolicy(),opens=addDays(parse(anchor),week*7),closes=addDays(opens,policy.windowDays-1);
      return {week,anchor,windowId:`weekly-v${policy.version}:${subject}:${anchor}:${week}`,opens,closes,...checkInTasks(week)};
    };
    const checkInWindow = () => {
      today=parse(personalDay());todayKey=keyOf(today);
      const anchor=baselineAnchor();
      if(!anchor)return {state:'baseline-needed',baselineDone:false,tasks:data.catalog.assessmentDefinitions,minutes:data.catalog.assessmentDefinitions.reduce((n,d)=>n+d.minutes,0),opens:null,closes:null,daysUntilOpen:null};
      const elapsed=daysBetween(parse(anchor),today),week=Math.max(1,Math.floor(elapsed/7)),current=windowFor(week),next=windowFor(week+1);
      const done=current.tasks.every(task=>officialAttempts(task.id).some(a=>a.windowId===current.windowId&&matchesContract(a,task.id)));
      const state=today<current.opens?'upcoming':done?'done':today>current.closes?'missed':'open';
      return {...current,baselineDone:true,state,nextOpens:next.opens,nextWindow:next,daysUntilOpen:Math.max(0,daysBetween(today,state==='done'||state==='missed'?next.opens:current.opens)),policy:labPolicy()};
    };
    const checkInMode = id => {
      if(!baselineResults().find(r=>r.id===id)?.attempt&&!(data.account.seeded&&data.plan&&officialAttempts(id).some(a=>a.legacy)))return {mode:'official',kind:'baseline',cycle:1,windowId:'baseline',late:false};
      const due=checkInWindow();
      if(due.state==='open'&&due.tasks.some(t=>t.id===id)&&!officialAttempts(id).some(a=>a.windowId===due.windowId&&matchesContract(a,id)))return {mode:'official',kind:'recheck',cycle:due.week+1,week:due.week,windowId:due.windowId,late:false};
      return {mode:'practice',kind:'practice',cycle:null,late:false,opens:['done','missed'].includes(due.state)?due.nextOpens:due.opens};
    };
    const nextMeasured = id => {
      if(!baselineAnchor())return null;const due=checkInWindow();
      for(let week=due.week;week<due.week+4;week++){
        const candidate=windowFor(week);
        if(candidate.tasks.some(t=>t.id===id)&&(candidate.closes>=today)&&!officialAttempts(id).some(a=>a.windowId===candidate.windowId&&matchesContract(a,id)))return candidate;
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
        scaleCompatible:Boolean(latest&&matchesContract(latest,entry.id)),
        lastMeasuredCycle: latest?.cycle || null,
        nextMeasured: nextMeasured(entry.id),
        history: data.assessmentAttempts.filter(a=>a.definitionId===entry.id).map(shape),
        comparisonReason:attempts.length>1?compatible(baseline,latest):'No compatible repeat yet. Practice effects can affect task results.',
        comparison: attempts.length > 1 && !compatible(baseline,latest) ? { from: shape(baseline), to: shape(latest) } : null
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
      const shieldUsage = browserUsage(7);

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
      } else if (due.state === 'open') {
        steps.push({
          id: 'check-in',
          title: `Your free weekly ${NAMES.checkIn.toLowerCase()} window is open`,
          reason: `Your ${NAMES.checkIn.toLowerCase()} window is open until ${format.date(due.closes)}: ${due.tasks.map(task => task.title).join(' and ')}, about ${due.minutes} minutes.`,
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

      if (!shieldUsage.available) {
        steps.push({
          id: 'extension',
          title: 'No browser data yet',
          reason: 'There is no browser data yet because the Chrome extension is not connected. Nothing about screen time is shown until it is.',
          action: 'Connect the extension',
          href: href('src/pages/member/shield/shield.html')
        });
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
        source: attempt.evidenceTier || 'Legacy recorded practice', activityId:attempt.activityId||null,contentVersion:attempt.contentVersion||null,policyVersion:attempt.policyVersion||'legacy', why: 'A valid practice adds one growth step.'
      }));
      const perWeek = new Map();
      data.routine.forEach(item => item.checkIns.filter(entry => entry.status === 'done').forEach(entry => {
        const week = data.plan ? Math.floor(daysBetween(parse(data.plan.startDate), parse(entry.date)) / 7) : entry.date.slice(0, 7);
        const count = perWeek.get(week) || 0;
        if (count >= policy.routineDaysPerWeek) return;
        perWeek.set(week, count + 1);
        steps.push({ on: entry.date, kind: 'routine', title: item.title, detail: 'Offline routine ticked', source: 'Self-reported', why: `A routine day adds one growth step (up to ${policy.routineDaysPerWeek} a week).` });
      }));
      data.weeklyReviews.filter(review=>!review.cycleId).forEach(review => steps.push({
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

    /**
     * Personal Garden sources from this private journal (master §9): valid
     * practice attempts per practice type and self-reported routine days.
     * Partner-sourced effects (Coach-approved tasks, Supervisor-confirmed
     * attendance, camp completion) are added by the Garden page from the
     * shared records. Nothing here decays with inactivity.
     */
    const practiceGarden = () => {
      const attempts = [...new Map(data.activityAttempts.filter(a=>a.valid&&a.on<=personalDay()&&!corrected(a.id)&&(a.policyVersion===1?a.rewardEligible===true:!a.validationVersion)).map(a=>[a.id,a])).values()];
      const routineDays = [...new Set(data.routine.flatMap(item => item.checkIns.filter(entry => entry.status === 'done' && entry.date <= todayKey).map(entry => entry.date)))].sort();
      return {
        types: data.catalog.activityTypes.map(type => ({
          id: type.id, title: type.title,
          sources: attempts.filter(attempt => attempt.activityType === type.id).map(attempt => ({
            key: `attempt:${attempt.id || `${attempt.on}-${attempt.activityType}`}`, on: attempt.on, title: attempt.title || type.title, detail: attempt.outcome || 'Valid practice', source: attempt.evidenceTier || 'Legacy recorded practice', activityId:attempt.activityId||null,contentVersion:attempt.contentVersion||null,policyVersion:attempt.policyVersion||'legacy'
          }))
        })),
        routineDays,
        // One set of configurable demo defaults, shared by the Garden page and the Home preview.
        policy: { treeSteps: [1, 3, 7, 12], stageNames: ['Not started', 'Sprout', 'Sapling', 'Young tree', 'Full tree'], flowerAt: [3, 10, 21], maxRabbits: 3 }
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
        note: attempt.valid ? `${attempt.outcome} · ${attempt.evidenceTier || 'Legacy recorded practice'}` : `Not counted: ${attempt.invalidReason || attempt.outcome}`
      }));
      data.routine.forEach(item => {
        item.checkIns.forEach(entry => events.push({
          on: entry.date, kind: entry.status === 'done' ? 'routine' : 'skipped', title: entry.title||item.title,
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
      access.assert(subject);
      if (event.type === 'profile.update' && access.person()) throw new Error('Update your canonical identity through Profile.');
      today=parse(personalDay());todayKey=keyOf(today);
      if(event.recoveryTransaction)throw new Error('Recovery snapshots are computed by the journal command.');
      const full = { ...event, on: event.on || todayKey, at: personalInstant().toISOString() };
      if(full.type==='shield.sync'){
        const s=full.snapshot;
        if(!s||s.personId!==subject||subject==='preview'||!access.person()?.individual||!Number.isSafeInteger(s.sequence)||s.sequence<0||!(/^[a-f0-9]{32}$/).test(s.installationId||'')||s.version!=='0.1.0'||s.policy!=='active-domain-1'||!Number.isFinite(s.observedAt)||Math.abs(Date.now()-s.observedAt)>120000||!Array.isArray(s.periods)||s.periods.length>62||!Array.isArray(s.history)||s.history.length>120||JSON.stringify(s).length>180000)throw new Error('Invalid Person-bound extension evidence.');
        const hosts=['instagram.com','youtube.com','tiktok.com'],validHosts=value=>Array.isArray(value)&&value.length>0&&value.length<=3&&new Set(value).size===value.length&&value.every(d=>hosts.includes(d));
        const number=value=>Number.isFinite(value)&&value>=0&&value<=86400;
        const seenPeriods=new Set();
        for(const p of s.periods){
          if(!p||!/^\d{4}-\d{2}-\d{2}$/.test(p.day)||!p.timezone||p.key!==p.day+'|'+p.timezone||seenPeriods.has(p.key)||!p.seconds||Array.isArray(p.seconds)||Object.keys(p.seconds).some(d=>!hosts.includes(d))||Object.values(p.seconds).some(n=>!number(n))||!number(p.observedSeconds)||Math.abs(Object.values(p.seconds).reduce((a,b)=>a+b,0)-p.observedSeconds)>.01||!Number.isSafeInteger(p.samples)||p.samples<0||!Number.isSafeInteger(p.gaps)||p.gaps<0||!['NotReached','Shown','Acknowledged','Returned','DisplayFailed'].includes(p.reminderState)||!Array.isArray(p.configVersions)||p.configVersions.some(v=>!/^[a-f0-9]{32}$/.test(v)))throw new Error('Invalid browser observation period.');
          try{new Intl.DateTimeFormat('en',{timeZone:p.timezone}).format();if(new Date(p.day+'T12:00:00Z').toISOString().slice(0,10)!==p.day)throw 0;}catch{throw new Error('Invalid observation timezone/date.');}
          if(p.observedSeconds>0&&(!Number.isFinite(p.firstObservation)||!Number.isFinite(p.lastObservation)||p.lastObservation<p.firstObservation||p.lastObservation>s.observedAt+1000))throw new Error('Invalid observation coverage.');
          if(p.triggerConfig&&(!validHosts(p.triggerConfig.domains)||!number(p.triggerConfig.thresholdSeconds)||p.triggerConfig.personId!==subject))throw new Error('Invalid reminder source.');
          seenPeriods.add(p.key);
        }
        if(s.history.some(h=>h.personId!==subject||typeof h.id!=='string'||typeof h.type!=='string'||h.type.length>80||typeof h.detail!=='string'||h.detail.length>1000||!Number.isFinite(h.at)))throw new Error('Invalid attributed Shield history.');
        if(s.reminder&&(!validHosts(s.reminder.domains)||s.reminder.personId!==subject||!Number.isInteger(s.reminder.thresholdSeconds)||s.reminder.thresholdSeconds<5||s.reminder.thresholdSeconds>14400||typeof s.reminder.enabled!=='boolean'||!/^[a-f0-9]{32}$/.test(s.reminder.revision||'')))throw new Error('Invalid reminder configuration.');
        if(s.protection&&(!validHosts(s.protection.domains)||s.protection.personId!==subject||!['Active','Expired','Stopped','Failed'].includes(s.protection.status)||!Number.isFinite(s.protection.startedAt)||!Number.isFinite(s.protection.expiresAt)||s.protection.expiresAt<=s.protection.startedAt||s.protection.expiresAt-s.protection.startedAt>7200000))throw new Error('Invalid protection evidence.');
        if(full.connection&&(!/^[a-f0-9]{32}$/.test(full.connection.token||'')||full.connection.installationId!==s.installationId))throw new Error('Invalid extension connection.');
        if(!full.connection&&data.browserShield?.connection?.installationId!==s.installationId)throw new Error('Pair this extension before accepting evidence.');
        const old=data.browserShield?.snapshot;
        if(old?.installationId===s.installationId&&s.sequence<old.sequence)throw new Error('Stale extension evidence.');
        if(old?.installationId===s.installationId&&s.sequence===old.sequence&&!full.connection)return {type:full.type,unchanged:true};
        full.receivedAt=new Date().toISOString();
      }
      if(['personal.clock','lab.policy'].includes(full.type)){
        if(!devMode())throw new Error('Personal clock and policy controls are local demo settings.');
        if(full.type==='personal.clock'&&full.clock){if(!Number.isFinite(Date.parse(full.clock.at)))throw new Error('Choose a valid personal demo timestamp.');new Intl.DateTimeFormat('en',{timeZone:full.clock.timezone||'Asia/Amman'}).format();}
        if(full.type==='lab.policy'){if(!Number.isInteger(full.policy?.windowDays)||full.policy.windowDays<1||full.policy.windowDays>7)throw new Error('Choose a weekly window of 1–7 days.');full.policy={version:1,cadenceDays:7,windowDays:full.policy.windowDays,rotation:['sustained-attention','inhibitory-control','depth-challenge']};}
      }
      if(full.type==='plan.activate'){
        if(data.plan)throw new Error('This original plan is already active.');
        if(!baselineComplete())throw new Error('Complete all four valid current official baselines before activation.');
        full.goal ||= data.user.goal?.id;
        if(!['reduce-scrolling','intentional-phone','offline-time','focus-objective'].includes(full.goal))throw new Error('Choose your own goal in Quick Setup or the plan preview before activation.');
        if(!full.commitment?.title?.trim())throw new Error('Choose one personal offline commitment before activation.');
        full.planId=`plan-${subject}-${Date.now().toString(36)}`;full.personId=subject;full.policyVersion=1;full.baselineIds=baselineResults().map(row=>row.attempt.id);
      }
      if(full.type==='tour.record'){
        if(!data.plan||!['Completed','Skipped'].includes(full.status))throw new Error('Activate your plan before recording this orientation.');full.personId=subject;
      }
      if(full.type==='assessment.start'){
        const r=full.run,allowed=checkInMode(r.definitionId);
        if(!ASSESSMENT_CONTRACTS[r.definitionId])throw new Error('Unknown assessment.');
        if(r.mode==='official'&&allowed.mode!=='official')throw new Error('This official assessment is already completed or unavailable.');
      }
      if(['assessment.progress','assessment.interrupt'].includes(full.type)){
        const r=data.assessmentRuns.find(r=>r.id===full.id);if(!r||r.personId!==subject||r.status!=='In progress')throw new Error('This attempt cannot be changed. Reload to continue safely.');
      }
      if(full.type==='assessment.add'){
        const a=full.attempt,run=data.assessmentRuns.find(r=>r.id===a.id),allowed=checkInMode(a.definitionId);
        if(data.assessmentAttempts.some(x=>x.id===a.id))throw new Error('This original attempt is already recorded.');
        if(run&&run.status!=='In progress')throw new Error('This timed run was interrupted. Start a new attempt.');
        if(a.official&&run&&run.windowId!==(allowed.windowId||'baseline'))throw new Error('The original official window closed or changed. Restart in the current eligible window; no result was recorded.');
        if(a.official&&allowed.mode!=='official')throw new Error('This official assessment is already completed or its window is unavailable.');
        const contract=contractFor(a.definitionId);
        if(!ASSESSMENT_CONTRACTS[a.definitionId]||a.version!==contract.version)throw new Error('The instrument version is not current. Reload before retrying.');
        const kind=allowed.kind==='baseline'?'baseline':'weekly';
        for(const key of ['protocolVersion','scoringVersion','variant','difficulty','conditions'])if(a[key]!==undefined&&a[key]!==contract[key])throw new Error('The assessment protocol changed. Reload before retrying.');
        const raw=a.raw||{};let reason=a.valid===false?(a.validityReason||'Task validity checks were not met.'):'';
        if(Date.parse(full.at)<Date.parse(run?.startedAt||a.startedAt||full.at))reason='The personal clock moved backwards during this attempt. Restart the measurement.';
        if(!Number.isFinite(a.score)||a.score<0||a.score>(a.definitionId==='digital-habits'?32:a.definitionId==='depth-challenge'?5:100))reason='A complete result inside this instrument’s scale is required.';
        if(a.definitionId==='digital-habits'&&(!raw.answers||Array.from({length:8},(_,i)=>raw.answers['q'+(i+1)]).some(v=>!Number.isInteger(v)||v<0||v>4)))reason='Complete all eight questionnaire answers.';
        if(a.definitionId==='depth-challenge'&&(!Array.isArray(raw.answers)||raw.answers.length!==5||raw.answers.some(v=>!Number.isInteger(v)||v<0||v>3)))reason='Complete the five comprehension questions in one uninterrupted attempt.';
        if(['sustained-attention','inhibitory-control'].includes(a.definitionId)){
          const expected=a.definitionId==='sustained-attention'?24:40;
          if(raw.goTotal+raw.noGoTotal!==expected||!Array.isArray(raw.hits)||!raw.hits.length||raw.hits.some(v=>!Number.isFinite(v)||v<0)||raw.falseAlarms>Math.max(3,expected*.2)||a.definitionId==='inhibitory-control'&&!raw.noGoTotal)reason='The complete timed protocol and usable responses are required; retry this attempt.';
        }
        const methods=[...new Set(raw.inputMethods||[])].sort();const measurementContext=a.definitionId==='digital-habits'?{kind:'untimed-questionnaire'}:{presentation:run?.measurementContext?.presentation||'unrecorded',response:a.definitionId==='depth-challenge'?'untimed-answer-controls':methods.join('+')||'unrecorded'};
        if(a.definitionId!=='digital-habits'&&Object.values(measurementContext).includes('unrecorded'))reason='Measurement presentation and response conditions were not recorded; retry the official interface.';
        full.attempt={...a,...contract,measurementContext,personId:subject,kind,cycle:allowed.cycle||1,windowId:allowed.windowId||'baseline',week:allowed.week||null,labPolicyVersion:1,labPolicy:labPolicy(),startedAt:run?.startedAt||a.startedAt||full.at,completedAt:full.at,on:todayKey,status:reason?'Invalid':'Completed',valid:!reason,validity:{status:reason?'Invalid':'Valid',reason:reason||'Completed current Phase-1 demo protocol',policyVersion:1}};
      }
      if (full.type === 'routine.add') {
        full.id = `r-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      }
      if (full.type === 'routine.log'){full.date ||= todayKey;if(data.recovery)full.titleSnapshot=routineTitleOn(data.routine.find(r=>r.id===full.id),parse(full.date));}
      if(full.type==='attempt.add'){
        if(data.activityAttempts.some(a=>a.id===full.attempt?.id))throw new Error('This original attempt is already recorded.');
        full.attempt={...full.attempt,id:full.attempt?.id||`legacy-${Date.now()}-${Math.random()}`,personId:subject,on:todayKey,valid:false,status:'Invalid',rewardEligible:false,progressionEligible:false,invalidReason:'Use a versioned practice player with actual evidence. Timer-only completion is not valid.'};
      }
      if(full.type==='practice.policy'){
        if(!devMode())throw new Error('Practice policy is a local demo setting.');
        const p={...practicePolicy(),...full.policy,version:1};
        for(const [key,min,max] of [['distinctToAdvance',2,3],['minDaysToAdvance',3,30],['optionalDaily',1,8],['rewardCooldownDays',7,90]])if(!Number.isInteger(p[key])||p[key]<min||p[key]>max)throw new Error('Practice policy exceeds the conservative demo bounds.');
        if(!Number.isFinite(p.scoreToAdvance)||p.scoreToAdvance<.75||p.scoreToAdvance>1)throw new Error('Choose a score threshold from 0.75 to 1.');
        p.maxLevel=3;full.policy=p;
      }
      if(full.type==='practice.start'){
        const d=practices.definitions.find(d=>d.id===full.activityId),gate=practiceAccess(full.activityId);
        if(!gate.allowed)throw new Error(gate.reason);
        if(practiceRuns().some(r=>['Started','Paused'].includes(r.status)))throw new Error('Resume or interrupt your existing practice first.');
        if(!d.accessibilityModes.includes(full.mode||'standard'))throw new Error('Choose a supported accessibility mode.');
        if(d.practiceType==='protected-work'&&(!full.intention?.trim()||full.intention.trim().length<8))throw new Error('Name a real intention of at least eight characters.');
        full.run={id:`practice-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`,personId:subject,activityId:d.id,activityType:d.practiceType,version:d.version,contentVersion:d.contentVersion,audioVersion:d.audioVersion||null,level:d.level,definitionSnapshot:JSON.parse(JSON.stringify(d)),policy:practicePolicy(),policyVersion:1,validationVersion:d.validationVersion,mode:full.mode||'standard',startedAt:full.at,on:todayKey,status:'Started',responses:{},intention:(full.intention||'').trim(),observedSeconds:0,audioSeconds:0,audioComplete:false,audioStarted:false,activeSince:null,scheduledActionId:gate.core,rewardCandidate:gate.rewardEligible,transitions:[{status:'Started',at:full.at}]};
      }
      if(['practice.progress','practice.submit'].includes(full.type)){
        const run=practiceRuns().find(r=>r.id===full.id);
        if(!run||run.personId!==subject||!['Started','Paused'].includes(run.status))throw new Error('This original attempt is ended or already recorded. Start a separate retry.');
        const d=run.definitionSnapshot;
        if(full.type==='practice.progress'){
          const patch={},action=full.action;
          if(action==='recover'){patch.status='Paused';patch.activeSince=null;patch.transitions=[...run.transitions,{status:'Paused',at:full.at,reason:'New page: unobserved offline time excluded.'}];}
          else if(action==='save'){patch.responses=JSON.parse(JSON.stringify(full.responses||{}));}
          else if(action==='pause'||action==='interrupt'){
            patch.status=action==='interrupt'?'Interrupted':'Paused';patch.activeSince=null;
            patch.observedSeconds=run.observedSeconds+(run.activeSince?Math.max(0,Math.min(30,(Date.now()-run.activeSince)/1000)):0);
            patch.transitions=[...run.transitions,{status:patch.status,at:full.at,reason:full.reason||'User left the player'}];
          } else if(action==='resume'){patch.status='Started';patch.activeSince=d.practiceType==='protected-work'?Date.now():null;patch.transitions=[...run.transitions,{status:'Started',at:full.at}];}
          else if(action==='tick'&&d.practiceType==='protected-work'&&run.activeSince){patch.observedSeconds=run.observedSeconds+Math.max(0,Math.min(10,(Date.now()-run.activeSince)/1000));patch.activeSince=Date.now();}
          else if(action==='audio-start'&&d.practiceType==='listening'&&!run.audioStarted){patch.audioStarted=true;}
          else if(action==='audio-progress'&&run.audioStarted){const delta=Number(full.seconds)-run.audioSeconds;if(!Number.isFinite(delta)||delta<0||delta>3)throw new Error('Seeking or replay is not allowed. Restart a separate audio attempt.');patch.audioSeconds=Number(full.seconds);}
          else if(action==='audio-end'&&run.audioStarted&&Number.isFinite(full.duration)&&full.duration>10&&Math.abs(full.duration-d.audioDurationSeconds)<1&&run.audioSeconds>=d.audioDurationSeconds-1){patch.audioComplete=true;}
          else throw new Error('This player transition is unavailable.');
          full.patch=patch;
        } else {
          const r=full.responses||run.responses;let reason='',score=null,evidenceTier='Self-reported',outcome='';
          if(Date.parse(full.at)<Date.parse(run.startedAt))throw new Error('The personal clock moved backwards. Restart this practice.');
          if(d.responseMethod==='choice-questions'){
            if(!Array.isArray(r.answers)||r.answers.length!==d.questions.length||r.answers.some((v,i)=>!Number.isInteger(v)||v<0||v>=d.questions[i].options.length))throw new Error('Answer every question before submitting.');
            score=r.answers.reduce((n,v,i)=>n+(v===d.questions[i].answer?1:0),0)/d.questions.length;
            if(d.practiceType==='listening'&&run.mode==='standard'&&!run.audioComplete)throw new Error('Complete the original audio playback before submitting recall answers.');
            evidenceTier=d.practiceType==='listening'?(run.mode==='transcript'?'System-scored transcript recall (changed conditions)':'System-scored recall; in-app playback observed'):'System-scored comprehension';
            outcome=`${Math.round(score*100)}% correct · ${r.answers.filter((v,i)=>v===d.questions[i].answer).length}/${d.questions.length}`;
          } else {
            if(typeof r.outcome!=='string'||r.outcome.trim().length<20||r.outcome.length>5000)throw new Error('Describe the actual outcome in 20–5000 characters.');
            if(r.confirmed!==true)throw new Error('Confirm that the outcome is your self-report.');
            if(d.practiceType==='practical'&&(typeof r.artifact!=='string'||r.artifact.trim().length<30||r.artifact.length>5000))throw new Error('Provide the requested steps, categories or instructions in 30–5000 characters.');
            if(d.practiceType==='protected-work'&&run.observedSeconds<d.sessionSeconds)reason='The required active in-app session duration was not observed. Retry with a separate attempt.';
            evidenceTier=d.practiceType==='protected-work'?'Observed in-app timer + self-reported outcome':'Self-reported challenge evidence';outcome=reason?'Session ended early':d.practiceType==='practical'?'Challenge reported complete':'Work session recorded';
          }
          const valid=!reason,rewardEligible=valid&&run.rewardCandidate&&!recentContent(d.id);
          full.attempt={...JSON.parse(JSON.stringify(run)),status:valid?'Completed':'Invalid',transitions:[...run.transitions,{status:'Submitted',at:full.at},{status:valid?'Completed':'Invalid',at:full.at}],completedAt:full.at,on:todayKey,responses:JSON.parse(JSON.stringify(r)),score,evidenceTier,outcome,valid,invalidReason:reason,rewardEligible,progressionEligible:rewardEligible&&(score===null||score>=run.policy.scoreToAdvance),minutes:Math.round(run.observedSeconds/60)||d.estimatedMinutes,title:d.title,sourceId:run.id,rewardPolicyVersion:d.rewardPolicyVersion};
        }
      }
      if(full.type==='practice.level'){
        const t=training().find(t=>t.id===full.activityType);
        if(!t?.level||!['next','stay','down'].includes(full.choice))throw new Error('Choose a valid practice level decision.');
        if(full.choice==='next'&&!t.eligible)throw new Error('Complete the required distinct eligible examples across separate days before trying the next level.');
        if(full.choice==='down'&&t.level<=1)throw new Error('Already at the introductory level.');
        full.decision={id:`level-${Date.now()}-${Math.random()}`,activityType:t.id,from:t.level,level:t.level+(full.choice==='next'?1:full.choice==='down'?-1:0),choice:full.choice,excludedAttemptIds:data.activityAttempts.map(a=>a.id),personId:subject,on:todayKey,at:full.at,policyVersion:1,policy:practicePolicy(),detail:full.choice==='stay'?'Chose to stay; no penalty.':full.choice==='next'?'User accepted the next demo difficulty.':'User chose a lower difficulty; original history retained.'};
        // Staying is an attributed decision but must not reset earned eligibility.
        if(full.choice==='stay')delete full.decision.at;
      }
      if(full.type==='practice.correct'){
        const attempt=data.activityAttempts.find(a=>a.id===full.attemptId);
        if(!attempt||!full.reason?.trim())throw new Error('Select an original attempt and provide a correction reason.');
        if(corrected(attempt.id))throw new Error('This source already has a recorded correction.');
        full.correction={id:`correction-${Date.now()}`,attemptId:attempt.id,actor:subject,reason:full.reason.trim(),at:full.at,policyVersion:1,effect:'Withdraw eligibility; preserve original evidence'};
      }
      if(full.type==='plan.activate'||full.type.startsWith('recovery.')||full.type==='review.add'||full.type==='plan.adjust'){full.on=todayKey;full.recoveryTransaction=buildRecoveryTransaction(full);if(full.type==='recovery.visit'&&!full.recoveryTransaction)return {type:full.type,unchanged:true};}
      applyChange(JSON.parse(JSON.stringify(data)), full);
      const latest = readChanges(choice);
      if (JSON.stringify(latest) !== JSON.stringify(changes)) throw new Error('Your journal changed in another tab. Reload before saving.');
      writeChanges(choice, [...changes, full]);
      applyChange(data, full);
      changes.push(full);
      if(full.type==='personal.clock'){today=parse(personalDay());todayKey=keyOf(today);}
      window.dispatchEvent(new CustomEvent('deepsprout:account', { detail: full }));
      return full;
    };

    const assessmentDraft = id => data.assessmentRuns.filter(r=>r.definitionId===id&&r.personId===subject&&r.status==='In progress'&&Object.entries(contractFor(id)).every(([k,v])=>r[k]===v)).at(-1)||null;
    const beginAssessment = (id,{practice=false,context=null}={}) => {
      const allowed=practice?{mode:'practice',kind:'practice'}:checkInMode(id);
      if(!practice&&allowed.mode!=='official')throw new Error('This official assessment is already completed or unavailable. Choose an explicit practice round from Lab.');
      if(practice)return {...contractFor(id),id:'practice',mode:'practice',answers:{},startedAt:new Date().toISOString()};
      const draft=assessmentDraft(id);
      if(draft&&id==='digital-habits'&&draft.mode===allowed.mode&&(draft.windowId||'baseline')===(allowed.windowId||'baseline'))return structuredCloneSafe(draft);
      if(draft)mutate({type:'assessment.interrupt',id:draft.id,reason:'A new attempt replaces an interrupted run; no timed scores are combined.'});
      const run={...contractFor(id),id:`aa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,personId:subject,mode:allowed.mode,kind:allowed.kind,cycle:allowed.cycle||1,windowId:allowed.windowId||'baseline',measurementContext:context,status:'In progress',startedAt:personalInstant().toISOString(),answers:{}};
      mutate({type:'assessment.start',run});return structuredCloneSafe(run);
    };
    function structuredCloneSafe(value){return JSON.parse(JSON.stringify(value));}

    return {
      id: choice,
      changeCount: () => changes.length,
      history,
      mutate,
      /** Practice attempts recorded on one date, valid or not. */
      attemptsOn: date => data.activityAttempts.filter(attempt => attempt.on === keyOf(date))
        .map(attempt => ({ ...attempt, type: activityType(attempt.activityType) })),
      routineScheduledOn,
      routineTitleOn,
      routineStatusOn,
      routineScheduledDays,
      weekDates,
      label: data.account.label,
      seeded: data.account.seeded,
      asOf: data.account.asOf ? parse(data.account.asOf) : null,
      asOfNote: data.account.asOfNote,
      get today(){return parse(personalDay());},
      get todayKey(){return personalDay();},
      personalClock:()=>({at:personalInstant().toISOString(),timezone:personalTimezone(),source:data.personalClock?'Person-bound demo clock':data.account.seeded?'Original seeded story clock':'Device clock',seedAsOf:data.account.asOf||null}),
      setDemoClock:(at,timezone='Asia/Amman')=>mutate({type:'personal.clock',clock:at?{at,timezone}:null}),
      configureLab:policy=>mutate({type:'lab.policy',policy}),
      /** The full record as it stands now (seed plus changes) — for "show my data". */
      exportRecord: () => JSON.parse(JSON.stringify(data)),
      profile: () => ({
        email: data.user.email || '',
        setup: data.user.setup ? { ...data.user.setup } : null,
        name: data.user.name,
        registeredOn: parse(registeredKey),
        goal: data.recovery?{id:cyclePrefs(activeCycle()).goal,label:cyclePrefs(activeCycle()).goalLabel,setOn:parse(data.user.goal?.setOn||personalDay())}:data.user.goal ? { ...data.user.goal, setOn: parse(data.user.goal.setOn) } : null
      }),
      activityType,
      definition,
      plan,
      recovery:recoverySnapshot,
      recoveryPolicy,
      weeklyProposal,
      adjustmentPreview,
      saveRecoveryPreview:(adjustments,reason,focus)=>mutate({type:'recovery.preview',adjustments,reason,focus}),
      continuationPreview,
      reviewWeek:(week,answers,choice,adjustments,expectedRevision)=>mutate({type:'recovery.week.decide',week,answers,choice,adjustments,expectedRevision}),
      adjustRecovery:(adjustments,reason,expectedRevision)=>mutate({type:'recovery.adjust',adjustments,reason,expectedRevision}),
      rescheduleRecovery:(actionId,date,activityType,reason)=>mutate({type:'recovery.reschedule',actionId,date,activityType,reason}),
      visitRecovery:()=>data.plan?mutate({type:'recovery.visit'}):null,
      decideReturn:choice=>mutate({type:'recovery.return',choice}),
      recoveryLifecycle:(choice,reason)=>mutate({type:'recovery.lifecycle',choice,reason}),
      reviewCycle:reflection=>mutate({type:'recovery.cycle.review',reflection}),
      continueRecovery:(choice,adjustments)=>mutate({type:'recovery.continue',choice,adjustments}),
      configureRecovery:policy=>mutate({type:'recovery.policy',policy}),
      schedule,
      adherence,
      reviews,
      routine,
      routineDays,
      usage,
      usageCycle,
      usageDay,
      browserUsage,
      shield: () => clone(data.browserShield||{connection:null,snapshot:null}),
      syncShield: (snapshot,connection) => mutate({type:'shield.sync',snapshot,connection}),
      disconnectShield: () => mutate({type:'shield.disconnect'}),
      phoneScreenTime,
      training,
      practiceDefinitions,
      practiceAccess,
      practiceHistory,
      practicePolicy,
      beginPractice:(activityId,options={})=>mutate({...options,type:'practice.start',activityId}).run,
      progressPractice:(id,action,details={})=>mutate({type:'practice.progress',id,action,...details}),
      submitPractice:(id,responses)=>mutate({type:'practice.submit',id,responses}).attempt,
      decidePracticeLevel:(activityType,choice)=>mutate({type:'practice.level',activityType,choice}),
      configurePractices:policy=>mutate({type:'practice.policy',policy}),
      correctPractice:(attemptId,reason)=>mutate({type:'practice.correct',attemptId,reason}),
      tour:()=>data.productTour?{...data.productTour}:null,
      preview:()=>data.onboardingPreview?JSON.parse(JSON.stringify(data.onboardingPreview)):null,
      baselineResults,
      baselineComplete,
      assessmentDraft: id=>structuredCloneSafe(assessmentDraft(id)),
      beginAssessment,
      saveAssessmentProgress:(id,answers)=>mutate({type:'assessment.progress',id,answers}),
      interruptAssessment:(id,reason)=>mutate({type:'assessment.interrupt',id,reason}),
      checkIns,
      checkInWindow,
      checkInTasks,
      checkInMode,
      checkInPolicy: labPolicy,
      weeklyWindow:windowFor,
      assessmentHistory:id=>JSON.parse(JSON.stringify([...data.assessmentAttempts.filter(a=>a.definitionId===id),...data.assessmentRuns.filter(r=>r.definitionId===id&&!data.assessmentAttempts.some(a=>a.id===r.id))])),
      garden,
      practiceGarden,
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

  /**
   * The canonical person signed in on this device (one session for member and
   * partner pages). Their private journal is keyed by person, never merged into
   * the shared operational graph. The seeded story stays bound to 'demo'.
   */
  const ECOSYSTEM_KEY = 'deepsprout-ecosystem-demo-v1';
  const signedInPerson = access.person;
  const journalOf = access.journal;
  const seedFile = choice => ACCOUNTS[choice] || (String(choice).startsWith('person:') ? ACCOUNTS.empty : null);

  const readChoice = () => {
    access.requireAccess();
    const canonical = journalOf(signedInPerson());
    if (canonical) return canonical;
    const requested = params.get('account');
    if (requested && ACCOUNTS[requested]) {
      try { sessionStorage.setItem(STORE_KEY, requested); } catch { /* not persisted */ }
      return requested;
    }
    const bound = journalOf(signedInPerson());
    if (bound) return bound;
    try {
      const stored = sessionStorage.getItem(STORE_KEY);
      if (stored && ACCOUNTS[stored]) return stored;
    } catch { /* fall through */ }
    return 'demo';
  };

  let pending = null,latestModel=null;
  let pendingSubject = access.subject();

  /** Fetch and model the chosen account. Resolves to the same object for every caller. */
  const load = (refresh = false) => {
    if (refresh) pending = null;
    if (pending) return pending;
    const subject = access.subject();
    pendingSubject = subject;
    let choice;
    try { choice = readChoice(); } catch (error) { return Promise.reject(error); }
    const url = new URL(`../../data/${seedFile(choice)}`, SCRIPT_URL);
    const listingsUrl = new URL('../../data/listings.json', SCRIPT_URL);
    const json = target => Promise.resolve()
      .then(() => fetch(target, { cache: 'no-cache' }))
      .then(response => {
        if (!response.ok) throw new Error(`Account data could not be loaded (${response.status}).`);
        return response.json();
      });
    pending = Promise.all([json(url), json(listingsUrl).catch(() => ({ listings: [] })),json(new URL('../../data/practices.json',SCRIPT_URL))])
      .then(([data, catalogue, practices]) => {
        // A person journal starts from the empty seed but carries the person's own name.
        const person = String(choice).startsWith('person:') ? signedInPerson() : null;
        if (person && !data.user.name) { data.user.name = person.name; data.user.email = person.email; data.account.label = `${person.name} · personal journal`; }
        access.assert(subject);
        const model = createAccount(data, choice, catalogue, subject, practices);
        latestModel=new Proxy(model, {get(target, prop) {
          const value = target[prop];
          if (typeof value !== 'function') { access.assert(subject); return value; }
          return (...args) => { access.assert(subject); return value(...args); };
        }});return latestModel;
      });
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
    assessmentContract:contractFor,
    compatibleAssessments:compatible,
    PROVENANCE,
    format,
    keyOf,
    parse,
    addDays,
    daysBetween,
    load,
    current:()=>{if(latestModel)access.assert(pendingSubject);return latestModel;},
    choose,
    choice: readChoice,
    /** The canonical person this journal belongs to, if someone is signed in. */
    person: signedInPerson,
    /** Forget every change made on top of the seeded record, for this account. */
    resetChanges: () => { access.assert(pendingSubject); localStorage.removeItem(changesKey(readChoice())); },
    devMode
  };
})();
