/**
 * Your Starting Point → Building Your Plan → Plan Preview → Activate.
 *
 * The preview is generated from the setup answers; only week one is written
 * out in detail, because the later weeks depend on what actually happens
 * (spec 5.1). Nothing is committed until Activate is pressed.
 */
(() => {
  if (window.DeepSproutPersonal?.denied()) { try { window.DeepSproutPersonal.requireAccess(); } catch {} return; }
  const DS = window.DeepSprout;
  const INSTRUMENTS = window.DeepSproutAssessments;
  // The four official baselines are recorded in the personal journal
  // (DeepSproutAccount) by the assessment page. Read them from there first;
  // the older first-run store is only a fallback for earlier local data.
  let journal = null;
  const baselineAttempt = definitionId => {const a=journal?.baselineResults().find(row=>row.id===definitionId)?.attempt;return a?{...a,summary:a.details||[]}:null;};
  const baselinesComplete = () => Boolean(journal?.baselineComplete());
  const stages = [...document.querySelectorAll('.sp-stage')];

  const show = stage => {
    stages.forEach(section => { section.hidden = section.dataset.stage !== stage; });
    window.scrollTo({ top: 0, behavior: 'auto' });
    const heading = document.querySelector(`.sp-stage[data-stage="${stage}"] h1`);
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  };

  /* --------------------------------------------------------------- results */

  function renderResults() {
    const grid = document.getElementById('result-grid');
    grid.replaceChildren(...DS.ASSESSMENTS.map(meta => {
      const instrument = INSTRUMENTS[meta.id];
      const attempt = baselineAttempt(meta.id);
      const card = document.createElement('article');
      card.className = 'card sp-result-card';

      const head = document.createElement('div');
      head.className = 'card-head';
      head.innerHTML = `<span class="badge-icon ${instrument.tone}"><svg><use href="#${instrument.icon}"/></svg></span>
        <div><h3>${instrument.title}</h3><p class="sp-kind">${instrument.kind}</p></div>`;
      card.append(head);

      if (!attempt) {
        const missing = document.createElement('p');
        missing.className = 'sp-result-missing';
        const previous=journal?.exportRecord().assessmentAttempts.filter(a=>a.definitionId===meta.id).at(-1);
        missing.textContent = (previous?`The last attempt is ${previous.status||'not compatible with the current protocol'} and does not meet this baseline. Retry; its original history stays in Lab. `:'Not taken yet. ')+ ' Nothing is shown here rather than a zero — an unmeasured result is unknown, not low.';
        card.append(missing);
        const link = document.createElement('a');
        link.className = 'btn btn-ghost';
        link.style.marginTop = '16px';
        link.href = `../lab/assessment.html?test=${meta.id}&flow=onboarding`;
        link.innerHTML = 'Take it now <svg><use href="#i-arrow"/></svg>';
        card.append(link);
        return card;
      }

      const list = document.createElement('dl');
      attempt.summary.forEach(entry => {
        const dt = document.createElement('dt');
        dt.textContent = entry.label;
        const dd = document.createElement('dd');
        dd.textContent = entry.value;
        list.append(dt, dd);
      });
      card.append(list);

      const evidence = document.createElement('span');
      evidence.className = 'evidence';
      evidence.dataset.kind = instrument.evidence;
      evidence.textContent = instrument.evidence === 'verified'
        ? `Task-measured · ${instrument.version}`
        : `Self-reported · ${instrument.version}`;
      card.append(evidence);

      if (attempt.valid === false) {
        const flag = document.createElement('p');
        flag.className = 'card-note';
        flag.textContent = attempt.caveat;
        card.append(flag);
      }
      return card;
    }));
  }

  /* ------------------------------------------------------- plan generation */

  const PRACTICES = {
    depth: { title: 'Depth Practice', icon: 'i-book', note: 'Read a short passage, then answer questions about it.' },
    listening: { title: 'Listening & Recall', icon: 'i-headphones', note: 'Listen to a short clip, then recall what it said.' },
    visual: { title: 'Visual Observation & Analysis', icon: 'i-shapes', note: 'Study a scene and answer questions about its details and patterns.' },
    judgment: { title: 'Reasoning & Digital Judgment', icon: 'i-evidence', note: 'Open the sources and decide what a fictional claim can support.' }
  };

  const DIRECTIONS = {
    'reduce-scrolling': [
      ['Notice the pattern', 'Build a picture of when feeds pull you in, without changing much yet.'],
      ['Add one alternative', 'Put something in the gap the scrolling currently fills.'],
      ['Hold attention longer', 'Stretch practices slightly as they start to feel manageable.'],
      ['Decide what to keep', 'Review what actually worked and choose what carries on.']
    ],
    'intentional-phone': [
      ['See the pickups', 'Notice the unplanned opens rather than trying to stop them.'],
      ['Put a gap in', 'Introduce one deliberate pause between reaching and opening.'],
      ['Protect one block', 'Hold one part of the day for something you chose.'],
      ['Decide what to keep', 'Review what held, and what was unrealistic.']
    ],
    'offline-time': [
      ['Choose the thing', 'Settle on an offline activity you genuinely want time for.'],
      ['Make it regular', 'Give it a predictable slot rather than hoping for a gap.'],
      ['Protect the slot', 'Use the time you reclaimed for it, deliberately.'],
      ['Decide what to keep', 'Review whether the time actually went where you wanted.']
    ],
    'focus-objective': [
      ['Define the work', 'Name the thing that needs real attention.'],
      ['Protect one session', 'One block of focused work, supported rather than policed.'],
      ['Extend gradually', 'Lengthen the block only when the shorter one holds.'],
      ['Decide what to keep', 'Review what helped the work, not just the timer.']
    ]
  };

  const PRACTICE_MIX = {
    'reduce-scrolling': ['visual', 'judgment', 'visual'],
    'intentional-phone': ['judgment', 'visual', 'judgment'],
    'offline-time': ['listening', 'visual', 'listening'],
    'focus-objective': ['depth', 'judgment', 'visual']
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let goal = DS.get().profile.goal || 'reduce-scrolling';
  let days = Number(DS.get().profile.availableDays) || 3;
  let commitment = null;
  let minutes=5;
  const Account = window.DeepSproutAccount;
  const types = {depth:'depth',listening:'listening','visual-observation':'visual','digital-judgment':'judgment'};
  let server, saving = false;
  function useSavedPreview() {
    const prefs = server.plan.preferences;
    document.getElementById('plan-days').disabled = server.kind === 'Maintenance';
    ({goal,minutes} = prefs);
    days = prefs.practiceDays.length;
    commitment = prefs.routine;
    document.getElementById('plan-days').value = String(days);
    document.getElementById('plan-minutes').value = String(minutes);
  }

  async function savePreview(changes = {}) {
    if (server?.canEdit) {
      if (saving) return false;
      saving = true;
      document.getElementById('activate').disabled = true;
      document.getElementById('activate-note').textContent = 'Saving your preview…';
      try {
        server = await Account.writeRecovery(server, {...server.plan.preferences,...changes});
        return true;
      } catch (error) {
        window.DeepSproutPersonal.failure(error.message);
        return false;
      } finally {
        saving = false;
        useSavedPreview();
        renderPreview();
        renderCommitments();
      }
    }
    if (!journal) return false;
    const previous = journal.preview() || {goal:journal.profile().goal?.id || 'reduce-scrolling',
      days:Number(journal.profile().setup?.availableDays) || 3,minutes:5,commitment:null};
    try {
      journal.mutate({type:'onboarding.preview',preview:{goal,days,minutes,commitment}});
      return true;
    } catch (error) {
      ({goal,days,minutes,commitment} = previous);
      document.getElementById('plan-days').value = String(days);
      document.getElementById('plan-minutes').value = String(minutes);
      window.DeepSproutPersonal.failure(error.message);
      return false;
    }
  }

  /** Spread the week's practices across the seven days rather than bunching them. */
  function practiceDays(count) {
    const slots = [];
    const step = 6 / count;
    for (let index = 0; index < count; index += 1) slots.push(Math.round(index * step));
    return slots;
  }

  function buildWeekOne() {
    if (server?.canEdit) return server.plan.weekOne.map(day => {
      const date = DS.addDays(Account.parse(server.startsOn), day.offset);
      const label = day.offset === 0 ? 'Day 1' : WEEKDAYS[date.getDay()];
      const practice = PRACTICES[types[day.activityType]];
      if (practice) return {label,title:practice.title,kind:'practice',icon:practice.icon,minutes,
        note:`${minutes} minutes · ${practice.note}${day.review ? ' Also planned: Weekly review.' : ''}`};
      if (day.review) return {label,title:'Weekly review',kind:'review',note:'A few short questions at the end of Week 1.'};
      return {label,title:'Nothing else scheduled',kind:'rest',
        note:day.routine ? 'Your offline commitment is planned.' : 'Space for a day off.'};
    });
    const interests=journal?.profile().setup?.offlineInterests||DS.get().profile.offlineInterests||[];
    const base=PRACTICE_MIX[goal]||PRACTICE_MIX['reduce-scrolling'];
    const mix=goal==='reduce-scrolling'&&interests.includes('reading')?['visual','depth','judgment']:goal==='offline-time'&&interests.includes('music')?['listening','visual','listening']:base;
    const practiceCount = Math.min(5,Math.max(2,days));
    const slots = practiceDays(practiceCount);
    const start = journal?.today||new Date();

    return Array.from({ length: 7 }, (_, offset) => {
      const date = DS.addDays(start, offset);
      const label = offset === 0 ? 'Today' : WEEKDAYS[date.getDay()];
      const slotIndex = slots.indexOf(offset);

      if (offset === 6) {
        return { label, title: 'Weekly review', note: 'A few short questions to review the week. Adaptive scheduling is not connected yet.', kind: 'review' };
      }
      if (slotIndex !== -1) {
        const practice = PRACTICES[mix[slotIndex % mix.length]];
        return { label, title: practice.title, note: `${minutes} minutes · ${practice.note}`, minutes,kind: 'practice', icon: practice.icon };
      }
      return { label, title: 'Nothing scheduled', note: 'A day off is part of the plan, not a gap in it.', kind: 'rest' };
    });
  }

  function renderPreview() {
    document.getElementById('goal-card-text').textContent = DS.GOALS[goal];

    const directions = server?.canEdit ? server.plan.weeks.map(week => [week.title,week.note]) : DIRECTIONS[goal] || DIRECTIONS['reduce-scrolling'];
    document.getElementById('roadmap').replaceChildren(...directions.map(([title, note], index) => {
      const item = document.createElement('li');
      item.innerHTML = `<span class="sp-week-tag">W${index + 1}</span>
        <span><strong>${title}</strong><small>${note}</small></span>`;
      return item;
    }));

    const week = buildWeekOne();
    document.getElementById('week-list').replaceChildren(...week.map(entry => {
      const item = document.createElement('li');
      if (entry.kind === 'rest') item.className = 'is-rest';
      item.innerHTML = `<span class="sp-day">${entry.label}</span>
        <span class="sp-week-body"><strong>${entry.title}</strong><small>${entry.note}</small></span>`;
      return item;
    }));

    const practiceCount = week.filter(entry => entry.kind === 'practice').length;
    document.getElementById('week-note').textContent =
      `${practiceCount} practice${practiceCount === 1 ? '' : 's'} this week, plus your offline routine on the days you choose. Only week one is detailed. Later-week adaptation is not implemented in this preview.`;

    const profile = {...DS.get().profile,...journal?.profile().setup};
    const sites = (profile.distracting || []).length;
    document.getElementById('shield-text').textContent = sites
      ? `You named ${sites} service${sites === 1 ? '' : 's'} that pull you in. Digital Shield currently demonstrates site protection and reminders. No extension is connected, so this preview cannot block or measure those services. Your choices remain preferences.`
      : 'Digital Shield is a local prototype of site protection and reminders. No extension is connected and phone apps cannot be blocked or measured.';

    document.getElementById('preview-reason').textContent=`Your ${DS.GOALS[goal].toLowerCase()} goal, selected practices, ${days} available days and ${minutes}-minute preference shape Week 1. Lab assessments are optional.`;
    document.getElementById('back-to-results').hidden=!baselinesComplete();
    const summary = document.getElementById('plan-summary');
    summary.replaceChildren();
    [
      ['Cycle length', `${server?.plan?.cycleDays || 28} days · ${directions.length} weeks`],
      ['Starts on activation', DS.formatDate(server?.startsOn ? Account.parse(server.startsOn) : journal?.today || new Date(), { weekday: 'short', month: 'short', day: 'numeric' })],
      ['Practices in week 1', String(practiceCount)],
      ['Offline commitment', commitment ? commitment.title : 'Not chosen yet'],
      ['Weekly review', 'End of each week']
    ].forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      summary.append(dt, dd);
    });

    const activate = document.getElementById('activate');
    activate.disabled = !commitment || saving;
    document.getElementById('activate-note').textContent = commitment
      ? 'Activating starts day 1 and saves your first week.'
      : 'Choose one offline commitment to continue.';
    renderServerControls();
  }

  function renderServerControls() {
    if (!server?.canEdit) return;
    const prefs = server.plan.preferences;
    const headings = Array.from({length:7}, (_, offset) => [offset, `Day ${offset + 1}`]);
    const controls = [
      ['preview-activities',Object.entries(types).map(([type,key]) => [type,PRACTICES[key].title]),prefs.activityTypes,'Practice choices',
        values => savePreview({activityTypes:values})],
      ['preview-days',headings,prefs.practiceDays,'Week 1 practice days',values => savePreview({practiceDays:values})],
      ['preview-routine-days',headings,prefs.routine?.days,'Offline routine days',values => savePreview({routine:{...commitment,days:values}})]
    ];
    for (const [id,options,selected,title,save] of controls) {
      const field = document.getElementById(id);
      field.hidden = !selected;
      if (!selected) continue;
      const legend = document.createElement('legend');
      legend.textContent = title;
      field.replaceChildren(legend,...options.map(([value,label]) => {
        const choice = document.createElement('label');
        const checkbox = document.createElement('input');
          const oneDay = server.kind==='Maintenance' && id==='preview-days';
          checkbox.type = oneDay?'radio':'checkbox';
          if(oneDay)checkbox.name='maintenance-day';
        checkbox.checked = selected.includes(value);
        checkbox.onchange = () => {
            const next = oneDay?[value]:checkbox.checked?[...selected,value]:selected.filter(item=>item!==value);
          save(next);
        };
        choice.append(checkbox, ' ', label);
        return choice;
      }));
    }
  }

  /* ----------------------------------------------------- offline commitment */

  function commitmentOptions() {
    const interests = journal?.profile().setup?.offlineInterests || DS.get().profile.offlineInterests || [];
    const byInterest = {
      walking: { title: 'A five-minute walk', hint: 'Outside if you can, around the room if not.' },
      sport: { title: 'Ten minutes of movement', hint: 'Whatever counts as moving for you today.' },
      reading: { title: 'Read two pages on paper', hint: 'A real book or magazine.' },
      drawing: { title: 'Sketch one small thing', hint: 'No skill required.' },
      music: { title: 'Play something for five minutes', hint: 'Practice or just play.' },
      cooking: { title: 'Make one thing properly', hint: 'Without a screen propped up nearby.' },
      people: { title: 'One real conversation', hint: 'In person or on a call — not a message.' },
      quiet: { title: 'Ten minutes with no screen', hint: 'Sitting, stretching, or nothing at all.' },
      hobbies: { title: 'Time on a hobby you enjoy', hint: 'Something you already like doing.' }
    };

    // The Quick Setup proposal (if any) comes first, so the preliminary suggestion is visible and changeable.
    const candidate = commitment || server?.plan?.suggestedRoutine;
    const proposed = candidate && !Object.values(byInterest).some(item => item.title === candidate.title) ? [candidate] : [];
    const matched = interests.map(key => byInterest[key]).filter(Boolean);
    const fallback = DS.ROUTINE_IDEAS.filter(idea =>
      !matched.some(match => match.title === idea.title));
    return [...proposed, ...matched, ...fallback].slice(0, 6);
  }

  function renderCommitments() {
    const grid = document.getElementById('commitment-grid');
    grid.replaceChildren(...commitmentOptions().map(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(commitment?.title === option.title));
      button.innerHTML = '<span class="mark"><svg><use href="#i-check"/></svg></span><span><strong></strong><small></small></span>';
      button.querySelector('strong').textContent = option.title;
      button.querySelector('small').textContent = option.hint || '';
      button.addEventListener('click', async () => {
        commitment = option;
        if (!await savePreview({routine:routineChoice(option)})) return;
        renderCommitments();
        renderPreview();
      });
      return button;
    }));
  }

  const routineChoice = option => ({title:option.title,minutes:option.minutes || server?.plan?.suggestedRoutine.minutes || minutes,
    days:option.days || [0,1,2,3,4,5,6]});

  document.getElementById('add-custom').addEventListener('click', async () => {
    const input = document.getElementById('custom-routine');
    const title = input.value.trim();
    if (!title) { input.focus(); return; }
    commitment = { title, hint: 'Your own commitment.' };
    if (!await savePreview({routine:routineChoice(commitment)})) return;
    input.value = '';
    renderCommitments();
    renderPreview();
    document.getElementById('activate').focus();
  });

  /* ------------------------------------------------------------- goal change */

  const goalDialog = document.getElementById('goal-dialog');
  document.getElementById('change-goal').addEventListener('click', () => {
    const options = document.getElementById('goal-options');
    options.replaceChildren(...Object.entries(DS.GOALS).map(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(value === goal));
      button.innerHTML = `<span class="mark"><svg><use href="#i-check"/></svg></span><span><strong>${label}</strong></span>`;
      button.addEventListener('click', async () => {
        goal = value;
        if (!await savePreview({goal,activityTypes:[...new Set(PRACTICE_MIX[goal])].map(key => Object.keys(types).find(type => types[type] === key))})) return;
        goalDialog.close();
        renderPreview();
      });
      return button;
    }));
    goalDialog.showModal();
  });
  goalDialog.querySelectorAll('[data-close-dialog]').forEach(button =>
    button.addEventListener('click', () => goalDialog.close()));
  goalDialog.addEventListener('click', event => {
    if (event.target === goalDialog) goalDialog.close();
  });

  document.getElementById('plan-days').addEventListener('change', async event => {
    days = Number(event.target.value);
    if (!await savePreview({practiceDays:practiceDays(days)})) return;
    renderPreview();
  });

  document.getElementById('plan-minutes').addEventListener('change',async event=>{minutes=Number(event.target.value);if(await savePreview({minutes}))renderPreview();});

  /* ---------------------------------------------------------- the transition */

  document.getElementById('to-building').addEventListener('click', () => {
    if(!baselinesComplete())return;
    show('building');
    const steps = [...document.querySelectorAll('[data-build]')];
    let position = 0;
    const advance = () => {
      if (position > 0) steps[position - 1].classList.replace('is-active', 'is-done');
      if (position === steps.length) {
        DS.update(state => { state.onboarding.resultsSeen = true; });
        renderPreview();
        renderCommitments();
        show('preview');
        return;
      }
      steps[position].classList.add('is-active');
      position += 1;
      window.setTimeout(advance, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:620);
    };
    advance();
  });

  document.getElementById('back-to-results').addEventListener('click', () => show('results'));

  /* ------------------------------------------------------------- activation */

  document.getElementById('activate').addEventListener('click', async () => {
    if (!commitment || saving) return;

    if (server?.canEdit) {
      saving = true;
      document.getElementById('activate').disabled = true;
      document.getElementById('activate-note').textContent = 'Activating your plan…';
      try {
        const active = await Account.writeRecovery(server);
        document.getElementById('done-day').textContent = `Day 1 of ${active.plan.cycleDays}`;
        document.getElementById('done-lead').textContent = `Your first week is saved, including your offline commitment, “${active.plan.preferences.routine.title}”.`;
        show('done');
        Account.load(true).then(() => {
          if(active.cycleNumber===1)window.DeepSproutTour?.open();
        }, () => {});
      } catch (error) {
        window.DeepSproutPersonal.failure(error.message);
        document.getElementById('activate-note').textContent = error.message;
        document.getElementById('activate').disabled = false;
      } finally { saving = false; }
      return;
    }

    const week = buildWeekOne();
    // Activation is the person's explicit choice here; the four baselines are optional (Onboarding 2.0).
    if (!journal) return;
    const firstRunPlan = {policyVersion:1,minutes,goal, goalLabel:DS.GOALS[goal], availableDays:days, weekOne:week, commitment:commitment.title};
    // The same plan in the personal journal that Home and Roadmap read.
    try {
    if (!journal.plan()) {
      const typeOf = { 'Depth Practice': 'depth', 'Listening & Recall': 'listening', 'Visual Observation & Analysis': 'visual-observation', 'Reasoning & Digital Judgment': 'digital-judgment' };
      const today = journal.today;
      journal.mutate({ type: 'plan.activate', goal, goalLabel: DS.GOALS[goal], lengthDays: 28, firstRunPlan, commitment,
        direction: (DIRECTIONS[goal] || DIRECTIONS['reduce-scrolling']).map(([title, note]) => ({ title, note })),
        schedule: week.map((entry, offset) => ({kind:entry.kind,date:window.DeepSproutAccount.keyOf(DS.addDays(today,offset)),activityType:typeOf[entry.title],minutes:entry.minutes})) });

    }
    if (!DS.get().routine.length) DS.addRoutine({title:commitment.title,hint:commitment.hint});
    DS.update(state => { state.plan = {...firstRunPlan, startDate:journal.todayKey, cycleLength:28}; state.onboarding.planActivated = true; });
    } catch (error) { window.DeepSproutPersonal.failure(error.message); return; }
    document.getElementById('done-day').textContent = 'Day 1 of 28';
    document.getElementById('done-lead').textContent =
      `Your goal is to ${DS.GOALS[goal].toLowerCase()}, with ${week.filter(entry => entry.kind === 'practice').length} practices and "${commitment.title}" this week. Day 1 starts today.`;
    show('done');window.DeepSproutTour?.open();
  });

  /* ------------------------------------------------------------------ entry */

  const start = () => {
  renderResults();
  document.getElementById('to-building').disabled=!baselinesComplete();
  document.getElementById('plan-days').value = String(Math.min(5, Math.max(2, days)));

  // The original journal plan is authoritative; a legacy first-run mirror is not activation.
  // Nothing is shown until the journal says which stage applies.
  stages.forEach(section => { section.hidden = true; });
  };
  start();
  // Refresh once the personal journal (where the baselines are recorded) has loaded.
  Account?.load().then(loaded => { journal = loaded;server=journal.serverRecovery();const draft=journal.preview();goal=draft?.goal||journal.profile().goal?.id||goal;days=draft?.days||Number(journal.profile().setup?.availableDays)||days;minutes=draft?.minutes||5;commitment=draft?.commitment||null;document.getElementById('plan-days').value=String(days);document.getElementById('plan-minutes').value=String(minutes);renderResults();document.getElementById('to-building').disabled=!baselinesComplete();
    const active=journal.plan();
    if(active){document.getElementById('done-day').textContent=`Day ${active.day} of ${active.lengthDays}`;document.getElementById('done-lead').textContent='Your personal plan is already saved.';show('done');}
    else if(server?.canEdit){
      document.querySelectorAll('[data-server-only]').forEach(option => {option.hidden=false;});
      useSavedPreview();renderPreview();renderCommitments();show('preview');
    }
    else if(journal.serverAuthenticated()){
      if(!server) location.replace('onboarding.html?step=setup');
      else {show('results');window.DeepSproutPersonal.failure('Open your Roadmap to see your saved cycle.');}
    }
    // Without optional Lab results, the Week 1 preview opens directly.
    else if(!baselinesComplete()||DS.get().onboarding.resultsSeen){renderPreview();renderCommitments();show('preview');}
    else show('results'); },error=>{show('results');window.DeepSproutPersonal.failure(error.message);});
})();
