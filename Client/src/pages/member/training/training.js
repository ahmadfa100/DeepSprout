document.documentElement.classList.add('js');

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });
  reveals.forEach(item => observer.observe(item));
} else {
  reveals.forEach(item => item.classList.add('visible'));
}

const extraCards = [...document.querySelectorAll('.extra-card')];
const viewAllButton = document.getElementById('view-all');
viewAllButton.addEventListener('click', () => {
  const opening = viewAllButton.getAttribute('aria-expanded') !== 'true';
  viewAllButton.setAttribute('aria-expanded', String(opening));
  viewAllButton.innerHTML = `${opening ? 'Show less' : 'View all'} <svg><use href="#i-arrow"/></svg>`;
  extraCards.forEach(card => { card.hidden = !opening; });
});

const sessions = {
  quick: { title: 'Quick Session', minutes: 5, description: 'Five focused minutes to find your rhythm again.' },
  today: { title: 'Depth Training', minutes: 12, description: 'Continue building your reading endurance, one page at a time.' },
  depth: { title: 'Depth Training', minutes: 20, description: 'Settle into a longer reading session and let your attention stretch.' },
  stillness: { title: 'Stillness Practice', minutes: 8, description: 'Put the screen aside and make room for a calmer mind.' },
  attention: { title: 'Attention Exercises', minutes: 10, description: 'Train your focus with one intentional task at a time.' },
  offline: { title: 'Offline Quest', minutes: 10, description: 'Step away from your screen and notice the world around you.' },
  goals: { title: 'Mindful Goal', minutes: 8, description: 'Choose one small intention and give it your full attention.' },
  reset: { title: 'Screen Reset', minutes: 5, description: 'Pause, breathe, and return to your day with a clearer mind.' }
};

const readStored = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const writeStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The page still works when local storage is unavailable. */ }
};

let completed = Math.min(5, Math.max(3, Number(readStored('deepsprout-training-completed', 3)) || 3));
let savedSessions = readStored('deepsprout-training-saved', []);
if (!Array.isArray(savedSessions)) savedSessions = [];

const progressCard = document.getElementById('progress');
const progressArc = document.querySelector('.progress-ring .arc');
const dayDots = [...document.querySelectorAll('.week-days b')];
const updateProgress = () => {
  document.getElementById('progress-number').innerHTML = `${completed}<small>/5</small>`;
  document.getElementById('progress-message').textContent = completed >= 5 ? 'Goal reached — lovely work!' : 'You’re on track!';
  document.querySelector('.progress-ring').setAttribute('aria-label', `${completed} of 5 training sessions completed`);
  progressArc.style.strokeDashoffset = String(314.16 * (1 - completed / 5));
  dayDots.forEach((dot, index) => {
    dot.classList.toggle('done', index < completed);
    dot.textContent = index < completed ? '✓' : '';
  });
};
requestAnimationFrame(updateProgress);

const sessionDialog = document.getElementById('session-dialog');
const sessionTitle = document.getElementById('session-title');
const sessionDescription = document.getElementById('session-description');
const timerDisplay = document.getElementById('session-timer');
const timerToggle = document.getElementById('timer-toggle');
const sessionFeedback = document.getElementById('session-feedback');
const saveButton = document.getElementById('save-session');
let currentSession = 'today';
let remainingSeconds = sessions.today.minutes * 60;
let timerInterval = null;
let endTime = 0;
let sessionCompleted = false;

const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const renderTimer = () => { timerDisplay.textContent = formatTime(remainingSeconds); };
const stopTimer = () => {
  clearInterval(timerInterval);
  timerInterval = null;
  timerToggle.textContent = 'Start timer';
};
const completeSession = () => {
  if (sessionCompleted) return;
  sessionCompleted = true;
  stopTimer();
  remainingSeconds = 0;
  renderTimer();
  if (completed < 5) {
    completed += 1;
    writeStored('deepsprout-training-completed', completed);
    updateProgress();
  }
  writeStored('deepsprout-garden-xp', Math.max(0, Number(readStored('deepsprout-garden-xp', 120)) || 0) + 20);
  writeStored('deepsprout-garden-sessions', Math.max(0, Number(readStored('deepsprout-garden-sessions', 12)) || 0) + 1);
  sessionFeedback.textContent = 'Well done. Your little step has been counted!';
};
const tickTimer = () => {
  remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  renderTimer();
  if (remainingSeconds === 0) completeSession();
};
const openSession = key => {
  const session = sessions[key] || sessions.today;
  stopTimer();
  currentSession = key;
  remainingSeconds = session.minutes * 60;
  sessionCompleted = false;
  sessionTitle.textContent = session.title;
  sessionDescription.textContent = session.description;
  sessionFeedback.textContent = '';
  saveButton.innerHTML = `<svg><use href="#i-bookmark"/></svg> ${savedSessions.includes(key) ? 'Saved session' : 'Save this session'}`;
  renderTimer();
  sessionDialog.showModal();
};

document.querySelectorAll('[data-session]').forEach(button => button.addEventListener('click', () => openSession(button.dataset.session)));
timerToggle.addEventListener('click', () => {
  if (timerInterval) {
    tickTimer();
    stopTimer();
    return;
  }
  if (remainingSeconds === 0) {
    remainingSeconds = sessions[currentSession].minutes * 60;
    sessionCompleted = false;
    renderTimer();
  }
  endTime = Date.now() + remainingSeconds * 1000;
  timerInterval = setInterval(tickTimer, 250);
  timerToggle.textContent = 'Pause timer';
});
document.getElementById('timer-reset').addEventListener('click', () => {
  stopTimer();
  remainingSeconds = sessions[currentSession].minutes * 60;
  sessionCompleted = false;
  renderTimer();
});
document.getElementById('complete-session').addEventListener('click', completeSession);
saveButton.addEventListener('click', () => {
  if (!savedSessions.includes(currentSession)) {
    savedSessions.push(currentSession);
    writeStored('deepsprout-training-saved', savedSessions);
  }
  saveButton.innerHTML = '<svg><use href="#i-bookmark"/></svg> Saved session';
  sessionFeedback.textContent = 'Saved to your sessions.';
});
sessionDialog.addEventListener('close', stopTimer);

const goalDialog = document.getElementById('goal-dialog');
document.querySelector('[data-goal]').addEventListener('click', () => goalDialog.showModal());
goalDialog.querySelectorAll('[data-goal-session]').forEach(button => button.addEventListener('click', () => {
  goalDialog.close();
  openSession(button.dataset.goalSession);
}));

document.querySelector('[data-stats]').addEventListener('click', () => {
  progressCard.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  progressCard.classList.remove('is-highlighted');
  void progressCard.offsetWidth;
  progressCard.classList.add('is-highlighted');
});

const savedDialog = document.getElementById('saved-dialog');
const savedList = document.getElementById('saved-list');
document.querySelector('[data-saved]').addEventListener('click', () => {
  savedList.replaceChildren();
  if (savedSessions.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'No saved sessions yet. Open a session and tap “Save this session” to keep it here.';
    savedList.append(message);
  } else {
    savedSessions.forEach(key => {
      if (!sessions[key]) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${sessions[key].title} · ${sessions[key].minutes} min`;
      button.addEventListener('click', () => {
        savedDialog.close();
        openSession(key);
      });
      savedList.append(button);
    });
  }
  savedDialog.showModal();
});

[sessionDialog, goalDialog, savedDialog].forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));

const requestedSession = new URLSearchParams(window.location.search).get('session');
if (requestedSession && Object.prototype.hasOwnProperty.call(sessions, requestedSession)) {
  window.addEventListener('load', () => openSession(requestedSession), { once: true });
}
