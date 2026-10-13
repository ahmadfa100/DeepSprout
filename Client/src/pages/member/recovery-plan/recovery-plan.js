const readStored = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const writeStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The controls still work for this visit. */ }
};

const infoDialog = document.getElementById('info-dialog');
const infoExtra = document.getElementById('info-extra');
function showInfo(eyebrow, title, description, items = []) {
  document.getElementById('info-eyebrow').textContent = eyebrow;
  document.getElementById('info-title').textContent = title;
  document.getElementById('info-description').textContent = description;
  infoExtra.replaceChildren();
  if (items.length) {
    const list = document.createElement('div');
    list.className = 'rp-dialog-list';
    items.forEach(item => {
      const row = document.createElement('span');
      row.textContent = item;
      list.append(row);
    });
    infoExtra.append(list);
  }
  infoDialog.showModal();
}
const baselineDialog = document.getElementById('baseline-dialog');
document.querySelectorAll('[data-open-baseline]').forEach(button => button.addEventListener('click', () => baselineDialog.showModal()));
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
[infoDialog, baselineDialog].forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));
const focusChoices = {
  depth: ['Deeper focus and reading', 'Begin with a short Depth Training session. Keep your phone out of reach and read one page at a time.'],
  stillness: ['Calmer, quieter moments', 'Try Stillness Practice for a few minutes. Give yourself a gentle pause.'],
  offline: ['More time away from screens', 'Choose an Offline Quest. A short walk or a conversation is enough to begin.']
};
document.querySelectorAll('[data-focus]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.focus;
  writeStored('deepsprout-recovery-focus', key);
  baselineDialog.close();
  showInfo('FOCUS UPDATED', focusChoices[key][0], focusChoices[key][1]);
}));
if (new URLSearchParams(location.search).get('setup') === '1') {
  window.addEventListener('load', () => baselineDialog.showModal(), { once: true });
}

const weekDetails = [
  ['Build Awareness', 'Notice your patterns and make small, conscious choices about screen time.'],
  ['Build Consistency', 'Repeat the practices that help you feel calmer and more focused.'],
  ['Strengthen & Adapt', 'Stretch your focus gradually and adjust your routine to fit real life.'],
  ['Review & Continue', 'Reflect on your progress and choose the habits you want to carry forward.']
];
document.querySelectorAll('[data-week]').forEach(button => button.addEventListener('click', () => {
  const number = Number(button.dataset.week);
  const [title, description] = weekDetails[number - 1];
  showInfo(`WEEK ${number} OF 4`, title, description);
}));
document.getElementById('full-plan').addEventListener('click', () => showInfo(
  'YOUR 28-DAY JOURNEY', 'A gentle path, week by week',
  'Each week has a focus. Future weeks open as you move through the journey.',
  weekDetails.map(([title], index) => `Week ${index + 1} · ${title}`)
));
document.getElementById('view-goals').addEventListener('click', () => {
  const count = Object.values(goals).filter(Boolean).length;
  showInfo('THIS WEEK', `${count} of 4 goals completed`, 'Tap a goal in the checklist to update your progress on this device.');
});

const tabs = [...document.querySelectorAll('[data-tab]')];
function activateTab(name) {
  tabs.forEach(tab => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('is-active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
}
tabs.forEach(tab => tab.addEventListener('click', () => {
  const name = tab.dataset.tab;
  activateTab(name);
  if (name === 'overview') window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'week') document.getElementById('week').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (name === 'adjust') baselineDialog.showModal();
  if (name === 'history') showInfo('YOUR HISTORY', 'Your journey so far', 'Your completed days and goals are saved on this device.', [
    `${completedDays.length} completed days recorded`,
    `${Object.values(goals).filter(Boolean).length} weekly goals completed`
  ]);
}));

const goalKeys = ['focus', 'stillness', 'attention', 'shorts'];
const defaults = { focus: true, stillness: true, attention: false, shorts: false };
const savedGoals = readStored('deepsprout-recovery-goals', defaults);
const goals = Object.fromEntries(goalKeys.map(key => [key, typeof savedGoals?.[key] === 'boolean' ? savedGoals[key] : defaults[key]]));
function renderGoals() {
  document.querySelectorAll('[data-goal]').forEach(row => row.setAttribute('aria-pressed', String(goals[row.dataset.goal])));
  document.getElementById('goals-count').textContent = `${Object.values(goals).filter(Boolean).length}/4`;
}
renderGoals();
document.querySelectorAll('[data-goal]').forEach(row => row.addEventListener('click', () => {
  goals[row.dataset.goal] = !goals[row.dataset.goal];
  writeStored('deepsprout-recovery-goals', goals);
  renderGoals();
}));

const dayKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = new Date();
today.setHours(12, 0, 0, 0);
const initialCompleted = Array.from({ length: 4 }, (_, offset) => {
  const date = new Date(today);
  date.setDate(date.getDate() - offset - 1);
  return dayKey(date);
});
const savedDays = readStored('deepsprout-recovery-completed-days', initialCompleted);
const completedDays = Array.isArray(savedDays) ? savedDays.filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day)).slice(0, 28) : initialCompleted;
const offlineDone = readStored('deepsprout-recovery-offline-done', false) === true;
const offlineButton = document.getElementById('offline-complete');
offlineButton.setAttribute('aria-pressed', String(offlineDone));
offlineButton.textContent = offlineDone ? 'Done ✓' : 'Mark as done';
offlineButton.addEventListener('click', () => {
  const done = offlineButton.getAttribute('aria-pressed') !== 'true';
  offlineButton.setAttribute('aria-pressed', String(done));
  offlineButton.textContent = done ? 'Done ✓' : 'Mark as done';
  writeStored('deepsprout-recovery-offline-done', done);
});
function renderProgress() {
  const count = completedDays.length;
  document.getElementById('progress-count').textContent = `${count} / 28`;
  document.getElementById('cycle-day').textContent = `Day ${Math.min(28, count + 1)} of 28`;
  document.querySelector('.rp-progress-ring').style.background = `conic-gradient(#1b8559 0 ${count / 28 * 360}deg,#ebeded ${count / 28 * 360}deg 360deg)`;
}
renderProgress();
let weekOffset = 0;
let selectedDate = new Date(today);
const calendar = document.getElementById('calendar');
const dateLabel = date => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
function renderCalendar() {
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() + 6) % 7 + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  document.getElementById('week-range').textContent = `${dateLabel(monday)} – ${dateLabel(sunday)}`;
  document.getElementById('selected-date').textContent = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  calendar.replaceChildren();
  for (let index = 0; index < 7; index++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = dayKey(date);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rp-day';
    button.setAttribute('aria-label', date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    if (key === dayKey(selectedDate)) { button.classList.add('is-selected'); button.setAttribute('aria-current', 'date'); }
    if (completedDays.includes(key)) button.classList.add('is-complete');
    const weekday = document.createElement('span');
    weekday.textContent = date.toLocaleDateString('en-US', { weekday: 'short' });
    const number = document.createElement('span');
    if (completedDays.includes(key) && key !== dayKey(selectedDate)) {
      number.innerHTML = '<svg><use href="#rp-check"/></svg>';
    } else number.textContent = date.getDate();
    button.append(weekday, number);
    button.addEventListener('click', () => { selectedDate = date; renderCalendar(); });
    calendar.append(button);
  }
}
document.getElementById('previous-week').addEventListener('click', () => { weekOffset--; renderCalendar(); });
document.getElementById('next-week').addEventListener('click', () => { weekOffset++; renderCalendar(); });
renderCalendar();
