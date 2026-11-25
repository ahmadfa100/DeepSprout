let personalSubject;
const personalKey = key => `${key}:person:${personalSubject}`;
/**
 * Activities — focused practices, run in a full-screen focus mode.
 *
 * Finishing a practice logs it once in the shared journey state; that single
 * record is what the Roadmap, Garden and Home count. The offline routine
 * checklist lives in offline-routine.js.
 */
const sessions = {
  today:{title:'Depth Practice'},depth:{title:'Depth Practice'},listening:{title:'Listening & Recall'},visual:{title:'Visual Observation & Analysis'},judgment:{title:'Reasoning & Digital Judgment'}
};
const PRACTICE_GUIDES = {
  depth: {
    heading: 'Read, then reflect',
    steps: ['Read the passage at your own pace.', 'Answer the questions using what you understood.', 'Submit to save your attempt and see the result.'],
    hint: 'The passage stays visible while you answer. Focus on meaning, not speed.'
  },
  listening: {
    heading: 'Listen, then recall',
    steps: ['Choose audio or the accessible transcript before starting.', 'Listen once or read the transcript, then answer from memory.', 'Submit your answers to save the attempt.'],
    hint: 'For audio, check your volume first. You cannot seek or replay within the same attempt.'
  }
};
const SESSION_BY_TITLE = {
  'Depth Practice': 'depth', 'Listening & Recall': 'listening',
  'Visual Observation & Analysis': 'visual', 'Reasoning & Digital Judgment': 'judgment'
};
const ICON_BY_SESSION = { depth: 'i-book', listening: 'i-headphones', visual: 'i-shapes', judgment: 'i-evidence' };

const Account = window.DeepSproutAccount;
let account = null;
/** Session key → the practice type it is scored as. Other sessions are not a training type. */
const TYPE_BY_SESSION = { today: 'depth', depth: 'depth', listening: 'listening', visual: 'visual-observation', judgment: 'digital-judgment', challenge: 'visual-observation', protected: 'digital-judgment' };
const SESSION_BY_TYPE = { depth: 'depth', listening: 'listening', 'visual-observation': 'visual', 'digital-judgment': 'judgment' };
const readStored = (key, fallback) => {
  return window.DeepSproutPersonal.preference(key, fallback, personalSubject);
};
const writeStored = (key, value) => {
  window.DeepSproutPersonal.assert(personalSubject);
  window.DeepSproutPersonal.save(personalKey(key), JSON.stringify(value));
};

/* --------------------------------------------------------------- progress */

const updateProgress = () => {
  if (!account) return;
  const plan = account.plan();
  const label = document.getElementById('weekly-plan-count');
  const message = document.getElementById('progress-message');
  if (!plan) {
    label.textContent = 'No plan yet — practise freely';
    message.hidden = true;
    return;
  }
  const adherence = account.adherence();
  label.textContent = `This week: ${adherence.completed} of ${adherence.due} due practices · recorded evidence`;
  const today = account.attemptsOn(account.today).filter(attempt => attempt.valid).length;
  message.hidden = !today;
  message.textContent = today ? `${today} done today` : '';
};

/* Up next: the practice the roadmap schedules for today, if there is one. */
const renderUpNext = () => {
  const card = document.getElementById('up-next');
  const plan = account?.plan();
  if (!plan) { card.hidden = true; return; }
  const today = account.schedule().find(day => day.isToday);
  if (today?.action?.kind === 'review') { card.hidden = true; return; }
  const kicker = document.getElementById('up-next-kicker');
  const icon = card.querySelector('.up-next-icon use');
  card.hidden = false;

  if (today?.action?.kind === 'practice') {
    const key = SESSION_BY_TYPE[today.action.activityType] || 'quick';
    const done = today.state === 'completed';
    card.classList.toggle('is-done', done);
    kicker.textContent = done ? `Done today · ${today.attempt.outcome}` : `Today on your roadmap · Day ${plan.day}`;
    document.getElementById('up-next-title').textContent = today.action.type?.title || sessions[key].title;
    document.getElementById('up-next-note').textContent = `${today.action.minutes} minutes · level ${today.action.level}`;
    icon.setAttribute('href', `#${ICON_BY_SESSION[key] || 'i-bolt'}`);
    const code = today.action.activityCode;
    card.href = `?session=${key}${code ? '&practice=' + encodeURIComponent(code) : ''}`;
    card.onclick = event => { event.preventDefault(); openSession(key,code); };
    return;
  }

  // Nothing scheduled today: suggest from the focus chosen on the Roadmap's Adjust tab.
  card.classList.remove('is-done');
  const focus = readStored('deepsprout-recovery-focus', 'depth');
  kicker.textContent = today?.action?.kind === 'rest' ? 'Planned rest day · optional' : 'Open day · suggested by your focus';
  if (focus === 'offline') {
    document.getElementById('up-next-title').textContent = 'Your offline routine';
    document.getElementById('up-next-note').textContent = 'Nothing is scheduled today. Tick off something real instead.';
    icon.setAttribute('href', '#i-walk');
    card.href = '#offline-routine';
    card.onclick = null;
    return;
  }
  const suggestion=account.practiceDefinitions().find(d=>d.access.allowed&&d.goalTags.includes(account.profile().goal?.id))||account.practiceDefinitions().find(d=>d.access.allowed);
  if(!suggestion){card.hidden=true;return;}
  const key = SESSION_BY_TYPE[suggestion.practiceType];
  document.getElementById('up-next-title').textContent = sessions[key].title;
  document.getElementById('up-next-note').textContent = `${suggestion.title} · Level ${suggestion.level} · optional`;
  icon.setAttribute('href', `#${ICON_BY_SESSION[key]}`);
  card.href = `?session=${key}`;
  card.onclick = event => { event.preventDefault(); openSession(key); };
};

/* ------------------------------------------------------------- saved items */

let savedSessions = [];
const renderSaved = () => {
  document.querySelectorAll('[data-save]').forEach(button => {
    const saved = savedSessions.includes(button.dataset.save);
    button.setAttribute('aria-pressed', String(saved));
    button.closest('.practice-card').classList.toggle('is-saved', saved);
  });
  const line = document.getElementById('saved-line');
  const names = savedSessions.filter(key => sessions[key]).map(key => sessions[key].title);
  line.hidden = !names.length;
  line.textContent = names.length ? `Saved: ${names.join(' · ')}` : '';
};
document.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', () => {
  if (!personalSubject) return;
  const key = button.dataset.save;
  const next = savedSessions.includes(key) ? savedSessions.filter(item => item !== key) : [...savedSessions, key];
  writeStored('deepsprout-training-saved', next);
  savedSessions = next;
  renderSaved();
  button.classList.remove('is-popping');
  void button.offsetWidth;
  button.classList.add('is-popping');
}));

/* Four distinct players share only their journal and dialog shell. */
const sessionDialog=document.getElementById('session-dialog');
const byId=id=>document.getElementById(id);
const player=document.getElementById('practice-player');
const feedback=document.getElementById('session-feedback');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const renderPracticeGuide=type=>{
 const guide=PRACTICE_GUIDES[type];
 return `<aside class="practice-guide" aria-label="Before you start"><p class="practice-guide-label">Before you start</p><h3>${esc(guide.heading)}</h3><ol>${guide.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="practice-guide-hint"><strong>Helpful hint</strong> ${esc(guide.hint)}</p></aside>`;
};
const renderPracticeHint=type=>`<p class="practice-in-session-hint"><strong>Helpful hint:</strong> ${esc(PRACTICE_GUIDES[type].hint)}</p>`;
const interactive = window.DeepSproutInteractivePractice;
const familyTitle = type => account.activityType(type)?.title || 'Practice';
let selectedType='depth', preferredDefinition=null, run=null;
let pendingAnswers = Promise.resolve();
let startingPractice = false;
const fail=error=>{feedback.textContent=error.message;feedback.setAttribute('role','alert');};
const safely=fn=>{try{fn();}catch(error){fail(error);}};
const latestRun=()=>account.practiceHistory().find(r=>r.id===run?.id);
const responses=()=>({answers:[...player.querySelectorAll('fieldset')].map(f=>Number(f.querySelector('input:checked')?.value??-1))});

function serverRun(state, previous = {}) {
  return {...previous,activityType:state.definition.practiceType,level:state.level,status:state.status,
    attemptId:state.attemptId,mode:state.mode,audioComplete:state.audioReady,
    definitionSnapshot:{...state.definition,questions:state.questions},
    responses:{answers:state.definition.practiceType === 'visual-observation' || state.definition.practiceType === 'digital-judgment'
      ? state.answers.filter(answer => answer !== null) : state.answers,observed:state.observed}};
}

async function startSavedPractice(send, previous, control) {
  if (startingPractice) return;
  startingPractice = true;
  if (control) control.disabled = true;
  try {
    const state = await send();
    if (!sessionDialog.open || (control && !control.isConnected)) {
      account = await Account.load(true);
      refreshPracticePage();
      return;
    }
    run = serverRun(state, previous);
    if (state.result) await finishPractice(state.result);
    else renderPlayer();
  } catch (error) { fail(error); }
  finally {
    startingPractice = false;
    if (control) control.disabled = false;
  }
}

function chooseContent(focus = false) {
  player.onchange = player.onclick = null;
  run = null;
  feedback.textContent = '';
  byId('session-title').textContent = familyTitle(selectedType);
  byId('session-description').textContent = 'Choose an example at your current level.';
  sessionDialog.dataset.family = selectedType;
  const level = account.training().find(t => t.id === selectedType)?.level;
  const defs = account.practiceDefinitions(selectedType).filter(d => d.level === level || d.access.core);
  const preferred = preferredDefinition || defs.find(definition => definition.access.core)?.id;
  if (preferred) defs.sort((a,b) => Number(b.id === preferred) - Number(a.id === preferred));
  const saved = account.serverAuthenticated();
  const draft = account.practiceHistory().find(item => ['Started','Paused'].includes(item.status) &&
    (!saved || item.server && item.activityType === selectedType && item.on === account.todayKey));
  const canResume = draft && !!SESSION_BY_TYPE[draft.activityType];
  const resume = () => {
    if (saved) return startSavedPractice(() => account.serverPractice(draft.attemptId,'resume'), draft,
      player.querySelector('[data-resume],#resume-practice'));
    safely(() => {
      run = draft;
      selectedType = run.activityType;
      preferredDefinition = null;
      if (interactive.types[run.activityType] && run.status === 'Paused') account.progressPractice(run.id, 'resume');
      renderPlayer();
    });
  };
  const interrupt = async () => {
    try {
      if (saved) {
        await account.serverPractice(draft.attemptId,'interrupt');
        account = await Account.load(true);
      } else account.progressPractice(draft.id, 'interrupt');
      chooseContent(true);
      feedback.textContent = 'Attempt ended. You can see the saved responses in History.';
      refreshPracticePage();
    } catch (error) { fail(error); }
  };
  const requests = new Map();
  const start = (id, mode = 'standard') => {
    if (saved) {
      const listing = defs.find(item => item.id === id), key = id + ':' + mode;
      if (!requests.has(key)) requests.set(key, crypto.randomUUID());
      return startSavedPractice(() => account.startServerPractice(listing,mode,requests.get(key)), {},
        [...player.querySelectorAll('[data-definition],#begin-practice')].find(button => !button.dataset.definition || button.dataset.definition === id));
    }
    safely(() => {
      run = account.beginPractice(id, { mode });
      renderPlayer();
      renderPracticeSummary();
    });
  };
  if (interactive.types[selectedType]) {
    interactive.intro({ root: player, type: selectedType, level, definitions: defs, draft, draftName: draft && familyTitle(draft.activityType), canResume, start, resume, interrupt, focus });
    return;
  }
  player.innerHTML = renderPracticeGuide(selectedType) + (draft ? '<p>You have an unfinished <strong>' + esc(familyTitle(draft.activityType)) + '</strong> attempt.</p>' + (canResume ? '<button type="button" id="resume-practice">Resume original attempt</button>' : '') + '<button type="button" id="interrupt-practice">End draft and choose a new attempt</button>' : '') + '<label>Example<select id="practice-definition">' + defs.map(d => '<option value="' + esc(d.id) + '">' + esc(d.title) + ' ? Level ' + d.level + (d.access.allowed ? '' : ' ? ' + esc(d.access.reason)) + '</option>').join('') + '</select></label><div id="practice-preview"></div>';
  const select = byId('practice-definition');
  function preview() {
    const d = defs.find(d => d.id === select.value);
    byId('practice-preview').innerHTML = d ? '<p>' + esc(d.instructions) + '</p><p class="practice-meta">About ' + d.estimatedMinutes + ' min ? <span class="ph-ref">' + esc(d.contentVersion) + '</span></p>' + (selectedType === 'listening' ? '<label>Access mode<select id="practice-mode"><option value="standard">Audio playback + recall</option><option value="transcript">Accessible transcript recall ? changed conditions</option></select></label>' : '') + '<p>' + esc(d.access.reason) + '</p><button type="button" id="begin-practice" ' + (!d.access.allowed || draft ? 'disabled' : '') + '>Start this example</button>' : '<p>Activate your personal plan to initialize Level 1, then return here.</p>';
    const button = byId('begin-practice');
    if (d?.access.core && button && saved) {
      button.disabled = !d.access.allowed;
      button.textContent = draft?.scheduledActionId === d.access.core ? 'Resume scheduled practice' : 'Open scheduled practice';
      if (draft?.scheduledActionId === d.access.core) {
        button.onclick = resume;
        return;
      }
    }
    button?.addEventListener('click', () => start(d.id, byId('practice-mode')?.value));
  }
  select.addEventListener('change', preview);
  preview();
  byId('resume-practice')?.addEventListener('click', resume);
  byId('interrupt-practice')?.addEventListener('click', interrupt);
}

function refreshPracticePage() { renderPracticeSummary(); updateProgress(); renderUpNext(); }

function showPracticeResult(result) {
  player.onchange = null;
  player.innerHTML = '<div class="pr-result" data-status="done"><span class="pr-mark" aria-hidden="true"><svg><use href="#i-check"/></svg></span><h3>Completed · ' + esc(result.outcome) + '</h3><p class="pr-tier">' + esc(result.evidenceTier) + '</p><p>Original responses and content are saved in History.</p><p class="pr-garden" data-eligible="' + result.rewardEligible + '"><svg aria-hidden="true"><use href="#i-sprout"/></svg>' + (result.rewardEligible ? 'Eligible source for this practice-type tree.' : 'No new tree growth from this attempt.') + '</p><div class="pr-actions"><button type="button" id="retry-practice">Choose another example / retry</button><button type="button" class="pr-done" id="practice-done">Back to Activities</button></div></div>';
  byId('retry-practice').onclick = () => chooseContent();
  byId('practice-done').onclick = () => byId('session-close').click();
  byId('practice-done').focus();
}

async function finishPractice(result) {
  run = null;
  showPracticeResult({...result,outcome:`${result.correctCount} of ${result.questionCount} correct`});
  account = await Account.load(true);
  refreshPracticePage();
}

function bindServerAnswers() {
  const active = run, id = active.attemptId;
  pendingAnswers = Promise.resolve();
  const save = () => {
    const answers = responses().answers.map(answer => answer < 0 ? null : answer);
    pendingAnswers = pendingAnswers.catch(() => {}).then(() => account.serverPractice(id,'answers',{answers},true));
    pendingAnswers.then(() => { if (run === active) feedback.textContent = 'Draft saved.'; },
      error => { if (run === active) fail(error); });
  };
  player.onchange = save;
  byId('save-practice').onclick = save;
  const form = byId('practice-answers'), submit = byId('complete-session'), pause = byId('end-practice');
  const busy = value => { submit.disabled = pause.disabled = byId('save-practice').disabled = value; };
  submit.onclick = async () => {
    if (!form.reportValidity()) return;
    const answers = responses().answers;
    busy(true);
    try {
      await pendingAnswers.catch(() => {});
      const state = await account.serverPractice(id,'submit',{answers});
      if (form.isConnected && sessionDialog.open) await finishPractice(state.result);
      else {
        account = await Account.load(true);
        refreshPracticePage();
      }
    } catch (error) {
      if (form.isConnected) { fail(error); busy(false); }
    }
  };
  pause.textContent = 'Pause attempt';
  pause.onclick = async () => {
    busy(true);
    try {
      await pendingAnswers;
      await account.serverPractice(id,'pause');
      account = await Account.load(true);
      if (form.isConnected && sessionDialog.open) {
        chooseContent(true);
        feedback.textContent = active.scheduledActionId || account.practiceHistory().find(item => item.attemptId === id)?.scheduledActionId
          ? 'Attempt paused. Open the scheduled practice to resume.' : 'Attempt paused. Resume it when you are ready.';
      }
      refreshPracticePage();
    } catch (error) { if (form.isConnected) { fail(error); busy(false); } }
  };

  const audio = byId('practice-audio');
  if (!audio) return;
  let playbackStart, position = 0, resuming = false;
  if (active.audioComplete) audio.controls = false;
  audio.onplay = () => {
    if (active.audioComplete) { audio.pause(); return; }
    if (!playbackStart) {
      audio.pause();
      playbackStart = account.serverPractice(id,'audio-start').then(() => {
        if (audio.isConnected && sessionDialog.open) return audio.play();
      }).catch(error => { playbackStart = null; fail(error); });
    }
  };
  audio.onratechange = () => { if (audio.playbackRate !== 1) audio.playbackRate = 1; };
  audio.ontimeupdate = () => { if (!audio.seeking) position = audio.currentTime; };
  audio.onseeking = () => {
    if (!resuming && Math.abs(audio.currentTime - position) > 1) {
      resuming = true;
      audio.currentTime = position;
      resuming = false;
    }
  };
  audio.onended = async () => {
    try {
      await playbackStart;
      await account.serverPractice(id,'audio-finish');
      active.audioComplete = true;
      if (audio.isConnected) byId('audio-status').textContent = 'Original playback completed. Answer the recall questions.';
    } catch (error) { fail(error); }
  };
  audio.onerror = () => fail(new Error('Audio could not load. Retry the audio or choose transcript mode.'));
  byId('audio-retry').onclick = async () => {
    try {
      await pendingAnswers;
      await account.serverPractice(id,'interrupt');
      account = await Account.load(true);
      chooseContent();
      refreshPracticePage();
    } catch (error) { fail(error); }
  };
}

function renderPlayer() {
  player.onchange = player.onclick = null;
  run = run.attemptId ? run : latestRun() || run;
  feedback.textContent = '';
  const d = run.definitionSnapshot, r = run.responses || {};
  byId('session-title').textContent = familyTitle(run.activityType);
  sessionDialog.dataset.family = run.activityType;
  if (interactive.types[run.activityType]) {
    const active = run;
    pendingAnswers = Promise.resolve();
    byId('session-description').textContent = run.activityType === 'visual-observation' ? 'Study the composition at your own pace.' : 'Examine sources and evaluate the fictional claim.';
    interactive.play({
      root: player, attempt: run,
      progress(action, details) {
        if (active.attemptId) {
          pendingAnswers = account.serverPractice(active.attemptId,action,details,true).then(state => {
            const saved = serverRun(state, active);
            if (run?.attemptId === active.attemptId) run = saved;
            return saved;
          });
          return pendingAnswers;
        }
        account.progressPractice(run.id, action, details);
        return latestRun();
      },
      async submit(current) {
        if (!active.attemptId) return account.submitPractice(run.id);
        const state = await account.serverPractice(active.attemptId,'submit',{answers:current.responses.answers});
        account = await Account.load(true);
        if (run?.attemptId === active.attemptId) run = null;
        return {...serverRun(state),...state.result,requiredScore:account.practicePolicy().scoreToAdvance};
      },
      getLevel: () => account.training().find(t => t.id === active.activityType),
      onDone: refreshPracticePage, onRetry: () => chooseContent(true), onClose: () => byId('session-close').click(), fail
    });
    return;
  }
  byId('session-description').textContent = 'Follow the activity below, then submit your response.';
  const passage = '<article class="practice-passage" tabindex="0"><h3>' + esc(d.title) + '</h3><p>' + esc(d.content) + '</p></article>';
  const body = d.practiceType === 'depth' ? passage : run.mode === 'transcript' ? '<p><strong>Accessible transcript mode. Changed measurement conditions; this is not verified audio recall.</strong></p>' + passage : '<p>One playback, no seeking or replay. Audio may be paused.</p><audio id="practice-audio" controls preload="metadata" src="../../../../' + esc(d.audio) + '"></audio><p id="audio-status">' + (run.audioComplete ? 'Original playback completed.' : 'Listen from start to finish before submitting.') + '</p><button type="button" id="audio-retry">Interrupt and retry audio</button>';
  player.innerHTML = '<p class="practice-meta">' + esc(d.title) + ' ? Level ' + run.level + ' ? ' + esc(run.status) + '</p>' + renderPracticeHint(run.activityType) + '<p>' + esc(d.instructions) + '</p>' + body + '<form id="practice-answers">' + d.questions.map((q,i) => '<fieldset><legend>' + (i+1) + '. ' + esc(q.prompt) + '</legend>' + q.options.map((option,j) => '<label class="practice-option"><input type="radio" name="answer-' + i + '" value="' + j + '" ' + (r.answers?.[i] === j ? 'checked' : '') + ' required>' + esc(option) + '</label>').join('') + '</fieldset>').join('') + '</form><div class="practice-actions"><button type="button" id="save-practice">Save draft</button><button type="button" id="complete-session">Submit evidence</button><button type="button" id="end-practice">Interrupt attempt</button></div>';
  if (run.attemptId) {
    bindServerAnswers();
    return;
  }
  const save = message => safely(() => { account.progressPractice(run.id, 'save', { responses: responses() }); feedback.textContent = message; });
  player.onchange = () => save('Draft saved to your personal journal.');
  byId('save-practice').onclick = () => save('Draft saved.');
  byId('complete-session').onclick = () => safely(() => {
    const result = account.submitPractice(run.id, responses());
    showPracticeResult(result);
    refreshPracticePage();
  });
  byId('end-practice').onclick = () => safely(() => { account.progressPractice(run.id, 'interrupt'); chooseContent(); renderPracticeSummary(); });
 const audio=byId('practice-audio');
 if(audio){
  let starting=false;
  audio.addEventListener('ratechange',()=>{if(audio.playbackRate!==1){audio.playbackRate=1;feedback.textContent='Original playback speed is required for this attempt.';}});
  audio.addEventListener('play',()=>safely(()=>{const r=latestRun();if(r.audioComplete){audio.pause();throw new Error('Playback is complete. For another listen, start a separate retry.');}if(!r.audioStarted)account.progressPractice(r.id,'audio-start');starting=true;}));
  audio.addEventListener('seeking',()=>{const r=latestRun();if(Math.abs(audio.currentTime-r.audioSeconds)>1){audio.pause();audio.currentTime=r.audioSeconds;feedback.textContent='Seeking is disabled for this recall attempt.';}});
  audio.addEventListener('timeupdate',()=>{if(!starting)return;safely(()=>{account.progressPractice(run.id,'audio-progress',{seconds:audio.currentTime});});});
  audio.addEventListener('ended',()=>safely(()=>{account.progressPractice(run.id,'audio-end',{duration:audio.duration});if(latestRun().audioComplete)byId('audio-status').textContent='Original playback completed. Answer the recall questions.';}));
  audio.addEventListener('error',()=>{feedback.textContent='Audio could not load. Retry the asset or choose a separate transcript attempt; no verified audio result will be invented.';});
  if(run.audioStarted&&!run.audioComplete){account.progressPractice(run.id,'interrupt',{reason:'Audio player was reloaded; partial playbacks are not combined.'});audio.controls=false;feedback.textContent='Interrupted audio requires a separate retry. Original progress is preserved.';byId('complete-session').disabled=true;}
  byId('audio-retry').onclick=()=>safely(()=>{if(['Started','Paused'].includes(latestRun().status))account.progressPractice(run.id,'interrupt');chooseContent();renderPracticeSummary();});
 }
}
function openSession(key, preferred = null) {
  if (!account) return;
  const type = TYPE_BY_SESSION[key];
  if (!type) return;
  selectedType = type;
  preferredDefinition = preferred;
  chooseContent();
  if (!sessionDialog.open) sessionDialog.showModal();
  if (interactive.types[type]) player.querySelector('h3')?.focus({ preventScroll: true });
}
document.querySelectorAll('[data-session]').forEach(button => button.addEventListener('click', () => openSession(button.dataset.session)));
function pauseLeaving(closing = false) {
  if (run?.attemptId) {
    player.querySelector('audio')?.pause();
    if (!closing) return;
    const id = run.attemptId;
    run = null;
    return pendingAnswers.catch(() => {}).then(() => account.serverPractice(id,'pause',undefined,true));
  }
  const draft = run && latestRun();
  if (draft?.status === 'Started') safely(() => {
    if (draft.activityType === 'listening' && draft.audioStarted && !draft.audioComplete) {
      account.progressPractice(draft.id, 'interrupt', { reason: 'Audio interrupted; separate retry required.' });
    } else if (closing && interactive.types[draft.activityType]) account.progressPractice(draft.id, 'pause');
  });
  player.querySelector('audio')?.pause();
}
byId('session-close').onclick = () => sessionDialog.close();
sessionDialog.addEventListener('close', async () => {
  try {
    const paused = pauseLeaving(true);
    if (paused) {
      await paused;
      account = await Account.load(true);
    }
    if (account) refreshPracticePage();
  } catch (error) {
    const status = document.getElementById('weekly-plan-count');
    if (status) status.textContent = error.message;
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseLeaving(); });
window.addEventListener('pagehide', () => pauseLeaving(true)?.catch(() => {}));
const FAMILY = {
  depth: {icon:'i-book',tone:'amber',noun:'Reading + questions',steps:['Read the passage','Answer the questions','Evidence is saved']},
  listening: {icon:'i-headphones',tone:'sky',noun:'Playback + recall',steps:['Listen once','Answer from memory','Evidence is saved']},
  'visual-observation': {icon:'i-shapes',tone:'fern',noun:'Visual analysis',steps:['Study the scene','Answer four questions','Review the details']},
  'digital-judgment': {icon:'i-evidence',tone:'linen',noun:'Evidence evaluation',steps:['Read the claim','Compare the sources','Review the reasoning']},
  practical: {icon:'i-pencil',tone:'lilac'}, 'protected-work': {icon:'i-timer',tone:'peach'}
};
const helpTip=(label,text)=>window.DeepSproutUI?window.DeepSproutUI.help(label,text):'';
const dayLabel=key=>{const d=new Date(`${key}T12:00:00`);return Number.isNaN(d.getTime())?esc(key):d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});};
/** For You: one actionable recommendation, chosen from what the engine allows today. */
function renderForYou(){
 const pick=document.getElementById('foryou-pick');if(!pick)return;
 const plan=account.plan(),goal=account.profile().goal,today=account.schedule().find(d=>d.isToday);
 const scheduledType=today?.action?.kind==='practice'&&today.state!=='completed'?today.action.activityType:null;
 const allowed=account.practiceDefinitions().filter(d=>d.access.allowed&&(d.access.core||d.level===account.training().find(t=>t.id===d.practiceType)?.level));
 const byGoal=allowed.filter(d=>d.goalTags.includes(goal?.id));
 const d=(scheduledType&&allowed.find(d=>d.practiceType===scheduledType&&d.access.core))||byGoal.find(d=>d.practiceType!==scheduledType)||byGoal[0]||allowed[0]||null;
 document.getElementById('practice-suggestion').textContent=d?`${sessions[SESSION_BY_TYPE[d.practiceType]].title} · ${d.title} · Level ${d.level}`:'';
 if(!d){
  pick.dataset.family='none';
  pick.innerHTML=`<div class="fy-empty"><span class="fy-empty-icon" aria-hidden="true"><svg><use href="#i-sprout"/></svg></span><div><h3>${plan?'Nothing more to start today':'Recommendations start with your plan'}</h3><p>${plan?'Your scheduled work is done or resting. Tick something off your offline routine instead.':'Activate your Recovery Plan and each practice starts at its own level.'}</p></div><a class="ds-btn" data-size="sm" href="${plan?'#offline-routine':'../recovery-plan/recovery-plan.html'}">${plan?'Open my routine':'Go to Recovery Plan'}<svg><use href="#i-arrow"/></svg></a></div>`;
  return;
 }
 const scheduled=d.practiceType===scheduledType,f=FAMILY[d.practiceType];
 const why=scheduled?`Scheduled on your plan today · day ${plan.day}`:goal?`Optional · good for “${goal.label}”`:'Optional practice';
 pick.dataset.family=d.practiceType;
 pick.innerHTML=`<div class="fy-art tone-${f.tone}" aria-hidden="true"><svg class="practice-glyph" viewBox="0 0 32 32"><use href="#${f.icon}"/></svg></div>
  <div class="fy-copy">
   <p class="fy-why">${scheduled?'<span class="fy-live" aria-hidden="true"></span>':''}${esc(why)}</p>
   <h3>${esc(d.title)}</h3>
   <p class="fy-family">${esc(sessions[SESSION_BY_TYPE[d.practiceType]].title)} · Level ${d.level}</p>
   <p class="fy-instructions">${esc(d.instructions)}</p>
   <ol class="fy-steps">${f.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>
   <div class="fy-foot"><span class="fy-meta"><svg><use href="#i-clock"/></svg>About ${d.estimatedMinutes} min · ${esc(f.noun)}</span><button type="button" class="ds-btn fy-start">${scheduled?'Start today’s practice':'Start'}<svg><use href="#i-arrow"/></svg></button></div>
  </div>`;
 pick.querySelector('.fy-start').onclick=()=>openSession(SESSION_BY_TYPE[d.practiceType], d.id);
}
function renderPracticeSummary(){
 const policy=account.practicePolicy();
 document.getElementById('practice-levels').innerHTML=account.training().map(t=>{
  const f=FAMILY[t.id]||FAMILY.depth,title=sessions[SESSION_BY_TYPE[t.id]].title;
  const seg=Array.from({length:t.required},(_,i)=>`<i class="${i<t.validAtLevel?'is-on':''}"></i>`).join('');
  const status=!t.level?'Starts when your plan is active':t.atMax?'Top level reached':t.eligible?`Ready for Level ${t.level+1}`:`${t.validAtLevel} of ${t.required} examples · ${t.days} of ${policy.minDaysToAdvance} days`;
  const actions=[t.eligible?`<button type="button" class="ds-btn" data-size="sm" data-level-type="${t.id}" data-choice="next">Try Level ${t.level+1}</button><button type="button" class="ds-btn" data-variant="secondary" data-size="sm" data-level-type="${t.id}" data-choice="stay">Stay at ${t.level}</button>`:'',t.level>1?`<button type="button" class="lv-down" data-level-type="${t.id}" data-choice="down">Step down to ${t.level-1}</button>`:''].join('');
  return `<article class="lv tone-${f.tone}${t.eligible?' is-ready':''}" data-family="${t.id}">
   <span class="lv-icon" aria-hidden="true"><svg><use href="#${f.icon}"/></svg></span>
   <div class="lv-main"><h3>${esc(title)}</h3><p class="lv-level">${t.level?`Level <b>${t.level}</b> <span>of ${t.maxLevel}</span>`:'<span>Not started</span>'}</p>
    <div class="lv-seg" role="img" aria-label="${esc(`${t.validAtLevel} of ${t.required} distinct examples at this level, on ${t.days} of ${policy.minDaysToAdvance} separate days`)}">${seg}</div>
    <p class="lv-status">${esc(status)}</p></div>
   ${actions?`<div class="lv-actions">${actions}</div>`:''}
  </article>`;}).join('');
 const history=account.practiceHistory();
 const item=a=>{const type=a.activityType,f=FAMILY[type]||FAMILY.depth,status=a.status||(a.valid?'Legacy completed':'Legacy invalid'),tone=/Completed/.test(status)?'done':/Invalid|Interrupted/.test(status)?'warn':'quiet';
  return `<details class="ph-item tone-${f.tone}"><summary><span class="ph-date">${dayLabel(a.on)}</span><span class="ph-dot" aria-hidden="true"><svg><use href="#${f.icon}"/></svg></span><span class="ph-title"><strong>${esc(a.title||a.definitionSnapshot?.title||familyTitle(type))}</strong><small>${esc(familyTitle(type))}${a.level?` · Level ${a.level}`:''}${a.outcome?` · ${esc(a.outcome)}`:''}</small></span><span class="ph-status" data-tone="${tone}">${esc(status)}</span></summary>
   <div class="ph-body"><dl><div><dt>Evidence</dt><dd>${esc(a.evidenceTier||'Legacy recorded evidence; no current validation claim')}</dd></div><div><dt>Content</dt><dd>${esc(a.contentVersion||'Historical content version not recorded')}</dd></div><div><dt>Record</dt><dd class="ph-ref">${esc(a.id)}</dd></div>${a.intention?`<div><dt>Intention</dt><dd>${esc(a.intention)}</dd></div>`:''}${a.invalidReason?`<div><dt>Not counted</dt><dd>${esc(a.invalidReason)}</dd></div>`:''}${a.eligibilityCorrection?`<div><dt>Eligibility withdrawn</dt><dd>${esc(a.eligibilityCorrection.reason)} · ${esc(a.eligibilityCorrection.actor)} · ${esc(a.eligibilityCorrection.at)}</dd></div>`:''}</dl>
   ${a.definitionSnapshot?`<details class="ph-sub"><summary>Original content &amp; instructions</summary><p>${esc(a.definitionSnapshot.instructions)}</p><p>${esc(a.definitionSnapshot.content)}</p><p>${esc(a.definitionSnapshot.questions?.map(q=>q.prompt).join(' • ')||'')}</p></details>`:''}
   <details class="ph-sub"${a.server&&!a.legacy?` data-server-history="${esc(a.attemptId)}"`:''}><summary>Recorded responses</summary>${a.server&&!a.legacy?'<div aria-live="polite">Open to load the saved exercise and answers.</div>':a.server?'<p>This historical entry has no compatible response snapshot.</p>':interactive.types[type]&&a.definitionSnapshot ? interactive.reviewAnswers(a) : `<pre>${esc(JSON.stringify(a.responses||{},null,2))}</pre>`}</details></div></details>`;};
 const first=history.slice(0,6),rest=history.slice(6);
 document.getElementById('practice-history').innerHTML=history.length?`<div class="ph-list">${first.map(item).join('')}</div>${rest.length?`<div class="ph-list" id="practice-history-more" hidden>${rest.map(item).join('')}</div><button type="button" class="ds-link ph-more" aria-expanded="false" aria-controls="practice-history-more">Show ${rest.length} earlier ${rest.length===1?'attempt':'attempts'}</button>`:''}`:`<div class="ds-empty"><span class="ds-empty-icon" aria-hidden="true"><svg><use href="#i-chart"/></svg></span><p class="ds-empty-copy"><strong>No attempts yet</strong><span>Completed, invalid and interrupted attempts appear here with their original evidence.</span></p></div>`;
 document.querySelectorAll('[data-server-history]').forEach(details => {
  details.ontoggle = async () => {
   if (!details.open || details.dataset.loaded) return;
   const body = details.querySelector('div');
   body.textContent = 'Loading saved answers?';
   try {
    const state = await account.serverPractice(details.dataset.serverHistory, 'read');
    if (!state) throw new Error('The saved attempt could not be found.');
    const original = serverRun(state);
    const answers = '<ol>' + state.questions.map((question,index) =>
      '<li><strong>' + esc(question.prompt) + '</strong><p>' + esc(question.options[state.answers[index]]) + '</p></li>').join('') + '</ol>';
    body.innerHTML = '<p>' + esc(state.content) + '</p>' +
      (interactive.types[original.activityType] ? interactive.reviewAnswers(original) : answers);
    details.dataset.loaded = 'true';
   } catch (error) { body.textContent = error.message; }
  };
 });
 const more=document.querySelector('.ph-more');if(more)more.onclick=()=>{const list=byId('practice-history-more'),open=list.hidden;list.hidden=!open;more.setAttribute('aria-expanded',String(open));more.textContent=open?'Show fewer':`Show ${rest.length} earlier ${rest.length===1?'attempt':'attempts'}`;};
 renderForYou();renderCardLevels();
}
/** Each Browse card shows the person's own level for that family. */
function renderCardLevels(){
 const map=TYPE_BY_SESSION;
 document.querySelectorAll('.practice-card[data-card]').forEach(card=>{const t=account.training().find(t=>t.id===map[card.dataset.card]);let chip=card.querySelector('.practice-level');if(!t?.level){chip?.remove();return;}if(!chip){chip=document.createElement('span');chip.className='practice-level';card.querySelector('.practice-art').append(chip);}chip.textContent=t.eligible?`Level ${t.level} · ready for ${t.level+1}`:`Your level ${t.level}`;});
}
document.getElementById('practice-levels').onclick=async event=>{
 const button=event.target.closest('[data-choice]');
 if (!button) return;
 const {levelType,choice}=button.dataset;
 button.disabled=true;
 try {
  if (account.serverAuthenticated()) {
   await account.chooseServerLevel(levelType,choice,account.training().find(item=>item.id===levelType).level);
   account=await Account.load(true);
  } else account.decidePracticeLevel(levelType,choice);
  refreshPracticePage();
 } catch (error) {
  document.getElementById('weekly-plan-count').textContent=error.message;
  button.disabled=false;
 }
};

/* ----------------------------------------------------------------- startup */

const params = new URLSearchParams(window.location.search);
const requestedSession = params.get('session');
const openRequested = () => {
  if (requestedSession && Object.hasOwn(TYPE_BY_SESSION, requestedSession)) openSession(requestedSession,params.get('practice'));
};
Account?.load().then(loaded => {
  account = loaded;
  personalSubject = window.DeepSproutPersonal.subject();
  const saved = readStored('deepsprout-training-saved', []);
  savedSessions = Array.isArray(saved) ? saved : [];
  renderSaved();
  if(account.plan())account.visitRecovery();
  // Recover a crashed/closed page without adding any unseen timer duration.
  for (const r of account.practiceHistory()) if (!r.server && interactive.types[r.activityType] && r.status === 'Started') account.progressPractice(r.id, 'recover');
  updateProgress();
  renderUpNext();
  renderPracticeSummary();
  openRequested();
  window.addEventListener('deepsprout:account', () => { updateProgress(); renderUpNext(); });
}).catch(() => {
  if (window.DeepSproutPersonal?.denied()) { try { window.DeepSproutPersonal.requireAccess(); } catch {} return; }
  document.getElementById('weekly-plan-count').textContent = 'Your progress couldn’t be loaded';
  openRequested();
});

// Show published Admin demo activities without changing the built-in practices.
try {
  const shared = JSON.parse(localStorage.getItem('deepsprout-admin-demo-v1'));
  const published = Array.isArray(shared?.activities) ? shared.activities.filter(activity => activity.status === 'published' && !/stillness|intentional pause|quiet break|weekly reflection|ink room|pause.*notice|just be|setback review|activity reflection/i.test(`${activity.name} ${activity.category}`)) : [];
  if (published.length) {
    const host = document.createElement('section');
    host.className = 'block admin-activity-section';
    const heading = document.createElement('h2');
    heading.textContent = 'Published informational guides';
    const note = document.createElement('p');
    note.textContent = 'Published activity guides. Read the instructions here; these guides do not record a timed practice or change your roadmap.';
    const grid = document.createElement('div');
    grid.className = 'admin-activity-grid';
    for (const activity of published) {
      const card = document.createElement('details');
      card.className = 'admin-activity-card';
      const summary = document.createElement('summary');
      const category = document.createElement('small');
      category.textContent = activity.category;
      const title = document.createElement('strong');
      title.textContent = activity.name;
      const meta = document.createElement('span');
      meta.textContent = `${activity.minutes} min · ${activity.mode}`;
      summary.append(category, title, meta);
      const description = document.createElement('p');
      description.textContent = activity.description;
      const instructions = document.createElement('p');
      instructions.textContent = activity.instructions;
      const details = document.createElement('p');
      details.textContent = `Goals: ${(activity.goals || []).join(', ')}. Completion: ${activity.completion || 'Not specified'}. Evidence: ${activity.evidence || 'None'}.`;
      card.append(summary, description, instructions, details);
      if (/^assets\/[a-z0-9/_ .-]+\.(png|jpe?g|webp|svg)$/i.test(activity.image || '')) {
        const image = document.createElement('img');
        image.src = '../../../../' + activity.image;
        image.alt = activity.alt || '';
        image.style.cssText = 'max-width:100%;max-height:180px;object-fit:contain';
        card.append(image);
      }
      grid.append(card);
    }
    host.append(heading, note, grid);
    document.getElementById('training-types').after(host);
  }
} catch { /* Keep the built-in page if demo storage is unavailable. */ }

// Sections rise into view as they are reached.
if ('IntersectionObserver' in window && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  }), { threshold: .12 });
  document.querySelectorAll('.block, .shield-band').forEach(node => {
    node.classList.add('js-reveal');
    observer.observe(node);
  });
}

function renderOptionalShield(){const target=document.getElementById('practice-shield-status'),v=window.DeepSproutShield?.view();if(target)target.textContent=`Optional extension support: ${v?.state||'Unverified'}.`;}
window.addEventListener('deepsprout:shield',renderOptionalShield);renderOptionalShield();
