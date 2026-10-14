/**
 * Activities — focused practices, run in a full-screen focus mode.
 *
 * Finishing a practice logs it once in the shared journey state; that single
 * record is what the Roadmap, Garden and Home count. The offline routine
 * checklist lives in offline-routine.js.
 */
const sessions = {
  quick: { title: 'Quick Session', minutes: 5, description: 'Five focused minutes on one thing. Phone face down.' },
  today: { title: 'Depth Practice', minutes: 12, description: 'Read one passage without switching away, then check what stayed with you.' },
  depth: { title: 'Depth Practice', minutes: 20, description: 'Settle into a longer reading session and let your attention stretch.' },
  listening: { title: 'Listening & Recall', minutes: 12, description: 'Listen to something once, without replaying it, then write down the main ideas.' },
  challenge: { title: 'Practical Micro-Challenge', minutes: 15, description: 'Choose one small task to summarise, organise, or make — and finish it.' },
  protected: { title: 'Protected Work', minutes: 25, description: 'One block on your own task. Digital Shield can keep the feeds away while you work.' },
  stillness: { title: 'Screen-free Pause', minutes: 8, description: 'Put the phone in another room and sit with no input for a few minutes.' },
  attention: { title: 'Attention Exercise', minutes: 10, description: 'One intentional task at a time. When your mind drifts, bring it back.' },
  offline: { title: 'Offline Quest', minutes: 10, description: 'Step away from the screen and do one real-world thing.' },
  goals: { title: 'One Intention', minutes: 8, description: 'Choose one small intention and give it your full attention.' },
  reset: { title: 'Screen Reset', minutes: 5, description: 'Pause, breathe, and come back to your day on purpose.' }
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
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const writeStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The page still works when local storage is unavailable. */ }
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
  label.textContent = `This week: ${adherence.completed} of ${adherence.due} due practices · measured`;
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
  const key = focus === 'stillness' ? 'protected' : 'depth';
  document.getElementById('up-next-title').textContent = sessions[key].title;
  document.getElementById('up-next-note').textContent = 'Nothing is scheduled today. Optional — only if you want to.';
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

/* --------------------------------------------------------------- focus mode */

const sessionDialog = document.getElementById('session-dialog');
const timerDisplay = document.getElementById('session-timer');
const timerToggle = document.getElementById('timer-toggle');
const sessionFeedback = document.getElementById('session-feedback');
const ring = document.getElementById('session-ring');
const RING = 2 * Math.PI * 96;
let currentSession = 'today';
let sessionMinutes = sessions.today.minutes;
let remainingSeconds = sessionMinutes * 60;
let timerInterval = null;
let endTime = 0;
let sessionCompleted = false;

const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const renderTimer = () => {
  timerDisplay.textContent = formatTime(remainingSeconds);
  const total = sessionMinutes * 60;
  ring.style.strokeDasharray = `${RING}`;
  ring.style.strokeDashoffset = `${RING * (1 - remainingSeconds / total)}`;
};
const setToggle = running => {
  timerToggle.innerHTML = `<svg><use href="#${running ? 'i-pause' : 'i-play'}"/></svg><span>${running ? 'Pause' : remainingSeconds < sessionMinutes * 60 && remainingSeconds > 0 ? 'Resume' : 'Start'}</span>`;
  sessionDialog.classList.toggle('is-running', running);
};
const stopTimer = () => {
  clearInterval(timerInterval);
  timerInterval = null;
  setToggle(false);
};
const completeSession = ({ timerFinished = false } = {}) => {
  if (sessionCompleted) return;
  sessionCompleted = true;
  stopTimer();
  const total = sessionMinutes * 60;
  const elapsedMinutes = Math.max(1, Math.round((total - remainingSeconds) / 60));
  remainingSeconds = 0;
  renderTimer();
  // In-app practices are scored by the app, not self-reported: a session only
  // counts when its timer actually ran to the end.
  const type = TYPE_BY_SESSION[currentSession];
  account?.mutate({
    type: 'attempt.add',
    attempt: {
      activityType: type || 'other',
      title: sessions[currentSession]?.title || 'Practice',
      valid: Boolean(type) && timerFinished,
      outcome: timerFinished ? `Timed session finished · ${sessionMinutes} min` : `Ended after ${elapsedMinutes} min`,
      invalidReason: !type ? 'Not a scored practice type' : timerFinished ? '' : 'Ended before the timer finished',
      minutes: timerFinished ? sessionMinutes : elapsedMinutes
    }
  });
  sessionDialog.classList.add('is-complete');
  sessionFeedback.textContent = !type
    ? 'Recorded in your history. This session is not a scored practice type, so it does not change a level.'
    : timerFinished
      ? 'Recorded and counted. It now shows on your roadmap and in Insights.'
      : 'Recorded, but not counted: the timer hadn’t finished. Run the full session for it to count.';
  updateProgress();
  renderUpNext();
};
const tickTimer = () => {
  remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  renderTimer();
  if (remainingSeconds === 0) completeSession({ timerFinished: true });
};
function openSession(key) {
  const session = sessions[key] || sessions.today;
  stopTimer();
  currentSession = sessions[key] ? key : 'today';
  // Started for today's scheduled practice? Run the length the plan set for it.
  const due = account?.schedule().find(day => day.isToday && day.action?.kind === 'practice'
    && day.action.activityType === TYPE_BY_SESSION[currentSession] && day.state !== 'completed');
  sessionMinutes = due ? due.action.minutes : session.minutes;
  remainingSeconds = sessionMinutes * 60;
  sessionCompleted = false;
  sessionDialog.classList.remove('is-complete');
  document.getElementById('session-title').textContent = session.title;
  document.getElementById('session-description').textContent = session.description;
  sessionFeedback.textContent = '';
  renderTimer();
  setToggle(false);
  if (typeof sessionDialog.showModal === 'function') sessionDialog.showModal();
  else sessionDialog.setAttribute('open', '');
}

document.querySelectorAll('[data-session]').forEach(button => button.addEventListener('click', () => openSession(button.dataset.session)));
timerToggle.addEventListener('click', () => {
  if (timerInterval) { tickTimer(); stopTimer(); return; }
  if (remainingSeconds === 0) {
    remainingSeconds = sessionMinutes * 60;
    sessionCompleted = false;
    sessionDialog.classList.remove('is-complete');
    renderTimer();
  }
  endTime = Date.now() + remainingSeconds * 1000;
  timerInterval = setInterval(tickTimer, 250);
  setToggle(true);
});
document.getElementById('timer-reset').addEventListener('click', () => {
  stopTimer();
  remainingSeconds = sessionMinutes * 60;
  sessionCompleted = false;
  sessionDialog.classList.remove('is-complete');
  renderTimer();
  setToggle(false);
});
document.getElementById('complete-session').addEventListener('click', () => completeSession({ timerFinished: remainingSeconds === 0 }));
document.getElementById('session-close').addEventListener('click', () => sessionDialog.close());
sessionDialog.addEventListener('close', stopTimer);

/* ----------------------------------------------------------------- startup */

renderSaved();
const requestedSession = new URLSearchParams(window.location.search).get('session');
const openRequested = () => {
  if (requestedSession && Object.prototype.hasOwnProperty.call(sessions, requestedSession)) openSession(requestedSession);
};
Account?.load().then(loaded => {
  account = loaded;
  updateProgress();
  renderUpNext();
  openRequested();
  window.addEventListener('deepsprout:account', () => { updateProgress(); renderUpNext(); });
}).catch(() => {
  document.getElementById('weekly-plan-count').textContent = 'Your progress couldn’t be loaded';
  openRequested();
});

// Show published Admin demo activities without changing the built-in practices.
try {
  const shared = JSON.parse(localStorage.getItem('deepsprout-admin-demo-v1'));
  const published = Array.isArray(shared?.activities) ? shared.activities.filter(activity => activity.status === 'published') : [];
  if (published.length) {
    const host = document.createElement('section');
    host.className = 'block admin-activity-section';
    const heading = document.createElement('h2');
    heading.textContent = 'More activities to explore';
    const note = document.createElement('p');
    note.textContent = 'Published from the local DeepSprout Admin demo. Completion tracking for these is not connected yet.';
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
      card.append(summary, description, instructions);
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
