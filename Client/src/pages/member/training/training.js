const sessions = {
  quick: { title: 'Quick Session', minutes: 5, description: 'Five focused minutes to find your rhythm again.' },
  today: { title: 'Depth Practice', minutes: 12, description: 'Continue building your reading endurance, one page at a time.' },
  depth: { title: 'Depth Practice', minutes: 20, description: 'Settle into a longer reading session and let your attention stretch.' },
  listening: { title: 'Listening & Recall', minutes: 12, description: 'Listen to something meaningful, then recall its main ideas without replaying it.' },
  challenge: { title: 'Practical Micro-Challenge', minutes: 15, description: 'Choose one small task to summarize, organize, or create with full attention.' },
  protected: { title: 'Protected Work', minutes: 25, description: 'Focus on one task. You can set up optional site protection in Digital Shield.' },
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

const plannedActivities = readStored('deepsprout-training-weekly-plan', ['depth', 'listening', 'challenge']);
const plannedCount = Array.isArray(plannedActivities) ? plannedActivities.length : 3;
let completedDates = readStored('deepsprout-training-completed-dates', []);
if (!Array.isArray(completedDates)) completedDates = [];
const weekStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return date.getTime();
};
const updateProgress = () => {
  const thisWeek = completedDates.filter(value => Number(value) >= weekStart()).length;
  document.getElementById('weekly-plan-count').textContent = `${plannedCount} ${plannedCount === 1 ? 'activity' : 'activities'} planned`;
  document.getElementById('progress-message').textContent = thisWeek
    ? `${thisWeek} completed this week. Keep going!`
    : 'Keep going. Small steps make a big difference.';
};
updateProgress();

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
  }
  completedDates.push(Date.now());
  writeStored('deepsprout-training-completed-dates', completedDates);
  updateProgress();
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
  saveButton.innerHTML = `<svg><use href="#i-bookmark"/></svg> ${savedSessions.includes(key) ? 'Saved activity' : 'Save this activity'}`;
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
  saveButton.innerHTML = '<svg><use href="#i-bookmark"/></svg> Saved activity';
  sessionFeedback.textContent = 'Saved to your activities.';
});
sessionDialog.addEventListener('close', stopTimer);

const goalDialog = document.getElementById('goal-dialog');
document.querySelector('[data-goal]').addEventListener('click', () => goalDialog.showModal());
goalDialog.querySelectorAll('[data-goal-session]').forEach(button => button.addEventListener('click', () => {
  goalDialog.close();
  openSession(button.dataset.goalSession);
}));

const savedDialog = document.getElementById('saved-dialog');
const savedList = document.getElementById('saved-list');
document.querySelector('[data-saved]').addEventListener('click', () => {
  savedList.replaceChildren();
  if (savedSessions.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'No saved activities yet. Open an activity and tap “Save this activity” to keep it here.';
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

const routineDialog = document.getElementById('routine-dialog');
let routine = readStored('deepsprout-offline-routine', 'Morning Walk');
if (typeof routine !== 'string' || !routine.trim()) routine = 'Morning Walk';
let routineDates = readStored('deepsprout-offline-routine-dates', []);
if (!Array.isArray(routineDates)) routineDates = [];
const routineDoneButton = document.getElementById('routine-done');
const updateRoutine = () => {
  document.getElementById('routine-name').textContent = routine;
  const count = routineDates.filter(value => Number(value) >= weekStart()).length;
  document.getElementById('routine-progress').textContent = `${count} ${count === 1 ? 'time' : 'times'} this week`;
  const today = new Date().setHours(0, 0, 0, 0);
  const doneToday = routineDates.some(value => Number(value) >= today);
  routineDoneButton.disabled = doneToday;
  routineDoneButton.textContent = doneToday ? 'Done today ✓' : 'Mark as done →';
};
updateRoutine();
document.getElementById('manage-routine').addEventListener('click', () => routineDialog.showModal());
routineDialog.querySelectorAll('[data-routine]').forEach(button => button.addEventListener('click', () => {
  if (routine !== button.dataset.routine) {
    routine = button.dataset.routine;
    routineDates = [];
    writeStored('deepsprout-offline-routine', routine);
    writeStored('deepsprout-offline-routine-dates', routineDates);
  }
  updateRoutine();
  routineDialog.close();
}));
routineDoneButton.addEventListener('click', () => {
  routineDates.push(Date.now());
  writeStored('deepsprout-offline-routine-dates', routineDates);
  updateRoutine();
});

[sessionDialog, goalDialog, savedDialog, routineDialog].forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));

const requestedSession = new URLSearchParams(window.location.search).get('session');
if (requestedSession && Object.prototype.hasOwnProperty.call(sessions, requestedSession)) {
  window.addEventListener('load', () => openSession(requestedSession), { once: true });
}

// Show published Admin demo activities without changing the existing training sessions.
try {
  const shared = JSON.parse(localStorage.getItem('deepsprout-admin-demo-v1'));
  const published = Array.isArray(shared?.activities) ? shared.activities.filter(activity => activity.status === 'published') : [];
  if (published.length) {
    const host = document.createElement('section');
    host.className = 'admin-activity-section';
    const heading = document.createElement('h2');
    heading.textContent = 'More activities to explore';
    const note = document.createElement('p');
    note.textContent = 'Published activities from the local DeepSprout Admin demo.';
    const grid = document.createElement('div');
    grid.className = 'admin-activity-grid';
    const details = document.createElement('dialog');
    details.className = 'small-dialog admin-activity-dialog';
    for (const activity of published) {
      const card = document.createElement('article');
      card.className = 'admin-activity-card';
      const category = document.createElement('small');
      category.textContent = activity.category;
      const title = document.createElement('h3');
      title.textContent = activity.name;
      const description = document.createElement('p');
      description.textContent = activity.description;
      const meta = document.createElement('span');
      meta.textContent = `${activity.minutes} min · ${activity.mode}`;
      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = 'View activity →';
      action.addEventListener('click', () => {
        details.replaceChildren();
        const close = document.createElement('button');
        close.type = 'button'; close.className = 'dialog-close'; close.textContent = '×';
        close.setAttribute('aria-label', 'Close activity'); close.addEventListener('click', () => details.close());
        const name = document.createElement('h2'); name.textContent = activity.name;
        const instructions = document.createElement('p'); instructions.textContent = activity.instructions;
        const info = document.createElement('p'); info.textContent = `${activity.category} · ${activity.evidence} · ${activity.completion}`;
        const caveat = document.createElement('p'); caveat.textContent = 'This Admin activity is a content preview. Completion tracking for it is not connected yet.';
        details.append(close,name,instructions,info,caveat); details.showModal();
      });
      card.append(category,title,description,meta,action); grid.append(card);
    }
    host.append(heading,note,grid);
    document.querySelector('.training-types')?.after(host);
    document.body.append(details);
  }
} catch { /* Preserve the original Training page if demo storage is unavailable. */ }
