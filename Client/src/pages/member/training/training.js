const personalSubject = window.DeepSproutPersonal.subject();
const personalKey = key => `${key}:person:${personalSubject}`;
/**
 * Activities — focused practices, run in a full-screen focus mode.
 *
 * Finishing a practice logs it once in the shared journey state; that single
 * record is what the Roadmap, Garden and Home count. The offline routine
 * checklist lives in offline-routine.js.
 */
const sessions = {
  today:{title:'Depth Practice'},depth:{title:'Depth Practice'},listening:{title:'Listening & Recall'},challenge:{title:'Practical Micro-Challenge'},protected:{title:'Protected Work'}
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
  },
  practical: {
    heading: 'Try one real task',
    steps: ['Read the example and choose a small task you can do now.', 'Do the task away from the prompt.', 'Describe your steps and what happened in your own words.'],
    hint: 'A small, honest outcome is enough. Your written result is a self-report.'
  },
  'protected-work': {
    heading: 'Make room for focused work',
    steps: ['Name one specific task you want to work on.', 'Start the local timer and pause it when you finish.', 'Record what you did, then submit your self-report.'],
    hint: 'The timer does not block websites. Turn on Digital Shield separately if you want that support.'
  }
};
const SESSION_BY_TITLE = {
  'Depth Practice': 'depth', 'Listening & Recall': 'listening',
  'Practical Micro-Challenge': 'challenge', 'Protected Work': 'protected'
};
const ICON_BY_SESSION = { depth: 'i-book', listening: 'i-headphones', challenge: 'i-pencil', protected: 'i-timer' };

const Account = window.DeepSproutAccount;
let account = null;
/** Session key → the practice type it is scored as. Other sessions are not a training type. */
const TYPE_BY_SESSION = { today: 'depth', depth: 'depth', listening: 'listening', challenge: 'practical', protected: 'protected-work' };
const SESSION_BY_TYPE = { depth: 'depth', listening: 'listening', practical: 'challenge', 'protected-work': 'protected' };
const readStored = (key, fallback) => {
  return window.DeepSproutPersonal.preference(key, fallback, personalSubject);
};
const writeStored = (key, value) => {
  try { window.DeepSproutPersonal.assert(personalSubject); window.DeepSproutPersonal.save(personalKey(key), JSON.stringify(value)); }
  catch (error) { throw error; }
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
    card.href = `?session=${key}`;
    card.onclick = event => { event.preventDefault(); openSession(key); };
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

let savedSessions = readStored('deepsprout-training-saved', []);
if (!Array.isArray(savedSessions)) savedSessions = [];
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
  const key = button.dataset.save;
  savedSessions = savedSessions.includes(key) ? savedSessions.filter(item => item !== key) : [...savedSessions, key];
  writeStored('deepsprout-training-saved', savedSessions);
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
let selectedType='depth',run=null,heartbeat=null;
const fail=error=>{feedback.textContent=error.message;feedback.setAttribute('role','alert');};
const safely=fn=>{try{fn();}catch(error){fail(error);}};
const latestRun=()=>account.practiceHistory().find(r=>r.id===run?.id);
const responses=()=>({answers:[...player.querySelectorAll('fieldset')].map(f=>Number(f.querySelector('input:checked')?.value??-1)),artifact:player.querySelector('[name=artifact]')?.value||'',outcome:player.querySelector('[name=outcome]')?.value||'',confirmed:!!player.querySelector('[name=confirmed]')?.checked});
const showTimer=()=>{const r=latestRun();if(!r)return;const e=byId('session-timer');if(e)e.textContent=`${Math.floor(r.observedSeconds)} / ${r.definitionSnapshot.sessionSeconds} seconds observed`;};
function stopHeartbeat(){clearInterval(heartbeat);heartbeat=null;}
function startHeartbeat(){stopHeartbeat();heartbeat=setInterval(()=>safely(()=>{const r=latestRun();if(r?.status==='Started'&&r.activeSince){account.progressPractice(r.id,'tick');showTimer();if(latestRun().observedSeconds>=r.definitionSnapshot.sessionSeconds){stopHeartbeat();account.progressPractice(r.id,'pause');showTimer();byId('work-state').textContent='Expected duration reached. Record your actual outcome.';}}}),1000);}
function chooseContent(){
 player.onchange=null;run=null;stopHeartbeat();feedback.textContent='';document.getElementById('session-title').textContent=sessions[SESSION_BY_TYPE[selectedType]].title;
 document.getElementById('session-description').textContent='Choose an example and read the steps before you begin.';
 const level=account.training().find(t=>t.id===selectedType)?.level;
 const defs=account.practiceDefinitions(selectedType).filter(d=>d.level===level);
 const draft=account.practiceHistory().find(r=>['Started','Paused'].includes(r.status));
 player.innerHTML=`${draft?`<p>You have an unfinished ${esc(sessions[SESSION_BY_TYPE[draft.activityType]].title)} attempt with its original content.</p><button type="button" id="resume-practice">Resume original attempt</button><button type="button" id="interrupt-practice">Interrupt & choose a new attempt</button>`:''}<label>Example<select id="practice-definition">${defs.map(d=>`<option value="${esc(d.id)}">${esc(d.title)} · Level ${d.level}${d.access.allowed?'':' · '+esc(d.access.reason)}</option>`).join('')}</select></label><div id="practice-preview"></div>`;
 player.insertAdjacentHTML('afterbegin',renderPracticeGuide(selectedType));
 const preview=()=>{const d=defs.find(d=>d.id===byId('practice-definition').value);byId('practice-preview').innerHTML=d?`<p>${esc(d.instructions)}</p><p class="practice-meta">About ${d.estimatedMinutes} min · <span class="ph-ref">${esc(d.contentVersion)}</span></p>${selectedType==='listening'?'<label>Access mode<select id="practice-mode"><option value="standard">Audio playback + recall</option><option value="transcript">Accessible transcript recall — changed conditions</option></select></label>':''}${selectedType==='protected-work'?'<label>Your real task / intention<input id="practice-intention" minlength="8" maxlength="500" autocomplete="off"></label><p>Local timer only. No website blocking or task-quality verification.</p><p><a href="../shield/shield.html" target="_blank" rel="noopener">Optional browser protection: open Digital Shield</a>. Start any protection separately; this attempt never implies that blocking occurred.</p>':''}<p>${esc(d.access.reason)}</p><button type="button" id="begin-practice" ${!d.access.allowed||draft?'disabled':''}>Start this example</button>`:'<p>Activate your personal plan to initialize Level 1, then return here.</p>';};
 player.querySelector('select').addEventListener('change',preview);preview();
 byId('resume-practice')?.addEventListener('click',()=>safely(()=>{run=draft;renderPlayer();}));
 byId('interrupt-practice')?.addEventListener('click',()=>safely(()=>{account.progressPractice(draft.id,'interrupt');chooseContent();renderPracticeSummary();}));
 player.onclick=beginClick;
}
function beginClick(event){if(event.target.id!=='begin-practice')return;safely(()=>{run=account.beginPractice(byId('practice-definition').value,{mode:byId('practice-mode')?.value||'standard',intention:byId('practice-intention')?.value||''});renderPlayer();renderPracticeSummary();});if(!run)player.onclick=beginClick;}
function renderPlayer(){
 player.onclick=null;stopHeartbeat();run=latestRun()||run;feedback.textContent='';const d=run.definitionSnapshot,r=run.responses||{};
 document.getElementById('session-title').textContent=sessions[SESSION_BY_TYPE[run.activityType]].title;
 document.getElementById('session-description').textContent='Follow the activity below, then submit your response.';
 player.innerHTML=`<p class="practice-meta">${esc(d.title)} · Level ${run.level} · ${esc(run.status)}</p><p>${esc(d.instructions)}</p>${d.practiceType==='depth'?`<article class="practice-passage" tabindex="0"><h3>${esc(d.title)}</h3><p>${esc(d.content)}</p></article>`:''}${d.practiceType==='listening'?(run.mode==='transcript'?`<p><strong>Accessible transcript mode. Changed measurement conditions; this is not verified audio recall.</strong></p><article class="practice-passage" tabindex="0">${esc(d.content)}</article>`:`<p>One playback, no seeking/replay. Audio may be paused. Questions are scored; audible output cannot be verified by the app.</p><audio id="practice-audio" controls preload="metadata" src="../../../../${esc(d.audio)}"></audio><p id="audio-status">${run.audioComplete?'Original playback completed.':'Listen from start to finish before submitting.'}</p><button type="button" id="audio-retry">Interrupt and retry audio</button>`):''}${d.questions?`<form id="practice-answers">${d.questions.map((q,i)=>`<fieldset><legend>${i+1}. ${esc(q.prompt)}</legend>${q.options.map((o,j)=>`<label class="practice-option"><input type="radio" name="answer-${i}" value="${j}" ${r.answers?.[i]===j?'checked':''} required>${esc(o)}</label>`).join('')}</fieldset>`).join('')}</form>`:`<p>${esc(d.content)}</p>${d.practiceType==='protected-work'?`<blockquote>Original intention: ${esc(run.intention)}</blockquote><p id="session-timer" role="timer"></p><p id="work-state">${run.status==='Paused'?'Paused. Resume when ready.':'Start the local timer when ready.'}</p><button type="button" id="timer-toggle">${run.status==='Paused'||!run.activeSince?'Resume / start timer':'Pause timer'}</button>`:`<label>Your steps, categories or revised instructions<textarea name="artifact" minlength="30" maxlength="5000" rows="5">${esc(r.artifact||'')}</textarea></label>`}<label>What actually happened?<textarea name="outcome" minlength="20" maxlength="5000" rows="3">${esc(r.outcome||'')}</textarea></label><label class="practice-option"><input type="checkbox" name="confirmed" ${r.confirmed?'checked':''}>This outcome is my self-report; it has not been independently verified.</label>`}<div class="practice-actions"><button type="button" id="save-practice">Save draft</button><button type="button" id="complete-session">Submit evidence</button><button type="button" id="end-practice">Interrupt attempt</button></div>`;
 player.querySelector('.practice-meta').insertAdjacentHTML('afterend',renderPracticeHint(run.activityType));
 player.onchange=()=>safely(()=>{account.progressPractice(run.id,'save',{responses:responses()});feedback.textContent='Draft saved to your personal journal.';});
 byId('save-practice').onclick=()=>safely(()=>{account.progressPractice(run.id,'save',{responses:responses()});feedback.textContent='Draft saved.';});
 byId('complete-session').onclick=()=>safely(()=>{
  const result=account.submitPractice(run.id,responses());stopHeartbeat();
  const ok=result.status==='Completed';
  player.innerHTML=`<div class="pr-result" data-status="${ok?'done':'invalid'}"><span class="pr-mark" aria-hidden="true"><svg><use href="#${ok?'i-check':'i-x'}"/></svg></span><h3>${esc(result.status)} · ${esc(result.outcome)}</h3><p class="pr-tier">${esc(result.evidenceTier)}</p><p>${esc(result.invalidReason||'Original responses and content are saved in History.')}</p><p class="pr-garden" data-eligible="${result.rewardEligible}"><svg aria-hidden="true"><use href="#i-sprout"/></svg>${result.rewardEligible?'Eligible source for this practice-type tree.':'No new tree growth from this attempt.'}</p><div class="pr-actions"><button type="button" id="retry-practice">Choose another example / retry</button><button type="button" class="pr-done" id="practice-done">Back to Activities</button></div></div>`;
  byId('retry-practice').onclick=chooseContent;byId('practice-done').onclick=()=>byId('session-close').click();feedback.textContent='Saved. No cognitive recovery score is inferred.';renderPracticeSummary();updateProgress();renderUpNext();
 });
 byId('end-practice').onclick=()=>safely(()=>{account.progressPractice(run.id,'interrupt');stopHeartbeat();chooseContent();renderPracticeSummary();});
 byId('timer-toggle')?.addEventListener('click',()=>safely(()=>{const r=latestRun();account.progressPractice(r.id,r.activeSince?'pause':'resume');renderPlayer();}));
 showTimer();if(run.activeSince)startHeartbeat();
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
function openSession(key){
 if(!account)return;
 const type=TYPE_BY_SESSION[key];if(!type){feedback.textContent='Choose one of the four approved practices.';return;}
 selectedType=type;document.getElementById('session-title').textContent=sessions[key].title;
 chooseContent();sessionDialog.showModal?.();if(!sessionDialog.open)sessionDialog.setAttribute('open','');
}
document.querySelectorAll('[data-session]').forEach(b=>b.addEventListener('click',()=>openSession(b.dataset.session)));
const pauseLeaving=()=>{stopHeartbeat();const r=latestRun();if(r&&['Started','Paused'].includes(r.status))safely(()=>{if(r.activityType==='listening'&&r.audioStarted&&!r.audioComplete)account.progressPractice(r.id,'interrupt',{reason:'Audio interrupted; separate retry required.'});else if(r.activeSince)account.progressPractice(r.id,'pause');});player.querySelector('audio')?.pause();};
document.getElementById('session-close').onclick=()=>{pauseLeaving();sessionDialog.close();};
sessionDialog.addEventListener('cancel',pauseLeaving);sessionDialog.addEventListener('close',pauseLeaving);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseLeaving();});window.addEventListener('pagehide',pauseLeaving);
const FAMILY={depth:{icon:'i-book',tone:'amber',noun:'Reading + questions',steps:['Read the passage','Answer the questions','Evidence is saved']},listening:{icon:'i-headphones',tone:'sky',noun:'Playback + recall',steps:['Listen once','Answer from memory','Evidence is saved']},practical:{icon:'i-pencil',tone:'lilac',noun:'Concrete outcome',steps:['Do one small task','Describe your steps','Report the outcome']},'protected-work':{icon:'i-timer',tone:'peach',noun:'Timed work session',steps:['Name a real task','Work under the timer','Record what you did']}};
const helpTip=(label,text)=>window.DeepSproutUI?window.DeepSproutUI.help(label,text):'';
const dayLabel=key=>{const d=new Date(`${key}T12:00:00`);return Number.isNaN(d.getTime())?esc(key):d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});};
let pickDefinition=null;
/** For You: one actionable recommendation, chosen from what the engine allows today. */
function renderForYou(){
 const pick=document.getElementById('foryou-pick');if(!pick)return;
 const plan=account.plan(),goal=account.profile().goal,today=account.schedule().find(d=>d.isToday);
 const scheduledType=today?.action?.kind==='practice'&&today.state!=='completed'?today.action.activityType:null;
 const allowed=account.practiceDefinitions().filter(d=>d.access.allowed&&d.level===account.training().find(t=>t.id===d.practiceType)?.level);
 const byGoal=allowed.filter(d=>d.goalTags.includes(goal?.id));
 const d=(scheduledType&&allowed.find(d=>d.practiceType===scheduledType))||byGoal.find(d=>d.practiceType!==scheduledType)||byGoal[0]||allowed[0]||null;
 pickDefinition=d;
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
 pick.querySelector('.fy-start').onclick=()=>{openSession(SESSION_BY_TYPE[d.practiceType]);const select=byId('practice-definition');if(select&&[...select.options].some(o=>o.value===d.id)){select.value=d.id;select.dispatchEvent(new Event('change'));}};
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
  return `<details class="ph-item tone-${f.tone}"><summary><span class="ph-date">${dayLabel(a.on)}</span><span class="ph-dot" aria-hidden="true"><svg><use href="#${f.icon}"/></svg></span><span class="ph-title"><strong>${esc(a.title||a.definitionSnapshot?.title||sessions[SESSION_BY_TYPE[type]]?.title||'Practice')}</strong><small>${esc(sessions[SESSION_BY_TYPE[type]]?.title||'Practice')}${a.level?` · Level ${a.level}`:''}${a.outcome?` · ${esc(a.outcome)}`:''}</small></span><span class="ph-status" data-tone="${tone}">${esc(status)}</span></summary>
   <div class="ph-body"><dl><div><dt>Evidence</dt><dd>${esc(a.evidenceTier||'Legacy recorded evidence; no current validation claim')}</dd></div><div><dt>Content</dt><dd>${esc(a.contentVersion||'Historical content version not recorded')}</dd></div><div><dt>Record</dt><dd class="ph-ref">${esc(a.id)}</dd></div>${a.intention?`<div><dt>Intention</dt><dd>${esc(a.intention)}</dd></div>`:''}${a.invalidReason?`<div><dt>Not counted</dt><dd>${esc(a.invalidReason)}</dd></div>`:''}${a.eligibilityCorrection?`<div><dt>Eligibility withdrawn</dt><dd>${esc(a.eligibilityCorrection.reason)} · ${esc(a.eligibilityCorrection.actor)} · ${esc(a.eligibilityCorrection.at)}</dd></div>`:''}</dl>
   ${a.definitionSnapshot?`<details class="ph-sub"><summary>Original content &amp; instructions</summary><p>${esc(a.definitionSnapshot.instructions)}</p><p>${esc(a.definitionSnapshot.content)}</p><p>${esc(a.definitionSnapshot.questions?.map(q=>q.prompt).join(' • ')||'')}</p></details>`:''}
   <details class="ph-sub"><summary>Recorded responses</summary><pre>${esc(JSON.stringify(a.responses||{},null,2))}</pre></details></div></details>`;};
 const first=history.slice(0,6),rest=history.slice(6);
 document.getElementById('practice-history').innerHTML=history.length?`<div class="ph-list">${first.map(item).join('')}</div>${rest.length?`<div class="ph-list" id="practice-history-more" hidden>${rest.map(item).join('')}</div><button type="button" class="ds-link ph-more" aria-expanded="false" aria-controls="practice-history-more">Show ${rest.length} earlier ${rest.length===1?'attempt':'attempts'}</button>`:''}`:`<div class="ds-empty"><span class="ds-empty-icon" aria-hidden="true"><svg><use href="#i-chart"/></svg></span><p class="ds-empty-copy"><strong>No attempts yet</strong><span>Completed, invalid and interrupted attempts appear here with their original evidence.</span></p></div>`;
 const more=document.querySelector('.ph-more');if(more)more.onclick=()=>{const list=byId('practice-history-more'),open=list.hidden;list.hidden=!open;more.setAttribute('aria-expanded',String(open));more.textContent=open?'Show fewer':`Show ${rest.length} earlier ${rest.length===1?'attempt':'attempts'}`;};
 renderForYou();renderCardLevels();
}
/** Each Browse card shows the person's own level for that family. */
function renderCardLevels(){
 const map={depth:'depth',listening:'listening',challenge:'practical',protected:'protected-work'};
 document.querySelectorAll('.practice-card[data-card]').forEach(card=>{const t=account.training().find(t=>t.id===map[card.dataset.card]);let chip=card.querySelector('.practice-level');if(!t?.level){chip?.remove();return;}if(!chip){chip=document.createElement('span');chip.className='practice-level';card.querySelector('.practice-art').append(chip);}chip.textContent=t.eligible?`Level ${t.level} · ready for ${t.level+1}`:`Your level ${t.level}`;});
}
document.getElementById('practice-levels').onclick=e=>{const b=e.target.closest('[data-choice]');if(b)safely(()=>{account.decidePracticeLevel(b.dataset.levelType,b.dataset.choice);renderPracticeSummary();});};

/* ----------------------------------------------------------------- startup */

renderSaved();
const requestedSession = new URLSearchParams(window.location.search).get('session');
const openRequested = () => {
  if (requestedSession && Object.prototype.hasOwnProperty.call(sessions, requestedSession)) openSession(requestedSession);
};
Account?.load().then(loaded => {
  account = loaded;
  if(account.plan())account.visitRecovery();
  // Recover a crashed/closed page without adding any unseen timer duration.
  for(const r of account.practiceHistory())if(r.activeSince&&['Started','Paused'].includes(r.status))account.progressPractice(r.id,'recover');
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
