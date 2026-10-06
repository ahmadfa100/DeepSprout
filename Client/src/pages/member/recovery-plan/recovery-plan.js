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

const readStored = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const writeStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The page remains usable when local storage is unavailable. */ }
};

const focusChoices = {
  depth: {
    title: 'Build Your Depth Endurance',
    description: 'Increase your reading duration while maintaining comprehension.',
    next: 'Begin with a short Depth Training session. Keep your phone out of reach and read one page at a time.',
    session: 'depth'
  },
  stillness: {
    title: 'Protect Your Quiet Moments',
    description: 'Make a little space each day to pause, breathe, and settle your mind.',
    next: 'Try Stillness Practice for a few minutes. Let the session be a pause, not another thing to perfect.',
    session: 'stillness'
  },
  offline: {
    title: 'Make Room for Real Life',
    description: 'Spend intentional time away from your screen and reconnect with your surroundings.',
    next: 'Choose an Offline Quest. A short walk, a conversation, or noticing something outside is enough to begin.',
    session: 'offline'
  }
};
let selectedFocus = readStored('deepsprout-recovery-focus', 'depth');
if (!focusChoices[selectedFocus]) selectedFocus = 'depth';
const focusTitle = document.getElementById('focus-title');
const focusDescription = document.getElementById('focus-description');
const renderFocus = () => {
  focusTitle.textContent = focusChoices[selectedFocus].title;
  focusDescription.textContent = focusChoices[selectedFocus].description;
};
renderFocus();

const infoDialog = document.getElementById('info-dialog');
const infoEyebrow = document.getElementById('info-eyebrow');
const infoTitle = document.getElementById('info-title');
const infoDescription = document.getElementById('info-description');
const infoExtra = document.getElementById('info-extra');
const showInfo = (eyebrow, title, description) => {
  infoEyebrow.textContent = eyebrow;
  infoTitle.textContent = title;
  infoDescription.textContent = description;
  infoExtra.replaceChildren();
  infoDialog.showModal();
};
const addTrainingLink = key => {
  const link = document.createElement('a');
  link.className = 'button primary';
  link.href = `../training/training.html?session=${encodeURIComponent(key)}`;
  link.textContent = 'Start this practice →';
  infoExtra.append(link);
};

const baselineDialog = document.getElementById('baseline-dialog');
document.querySelectorAll('[data-open-baseline]').forEach(button => button.addEventListener('click', () => baselineDialog.showModal()));
document.querySelectorAll('[data-focus]').forEach(button => button.addEventListener('click', () => {
  selectedFocus = button.dataset.focus;
  writeStored('deepsprout-recovery-focus', selectedFocus);
  renderFocus();
  baselineDialog.close();
  const focus = focusChoices[selectedFocus];
  showInfo('YOUR PLAN IS READY', focus.title, focus.next);
  addTrainingLink(focus.session);
}));

const methodDetails = {
  personal: ['PERSONALIZED PLAN', 'Made around your life', 'Your focus choice shapes the next suggested practice. Return to “Build my plan” whenever your needs change.'],
  habits: ['BETTER HABITS', 'Small steps add up', 'Try short practices throughout the week, mark the goals you complete, and watch your progress grow.']
};
document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.method;
  if (key === 'baseline') { baselineDialog.showModal(); return; }
  showInfo(...methodDetails[key]);
}));

const phases = {
  assess: ['PHASE 1 OF 5', 'Assess', 'Notice your screen habits and find a clear starting point. Awareness gives every next step a purpose.'],
  reset: ['PHASE 2 OF 5', 'Reset', 'Reduce a few distractions and create space for the activities you want more of.'],
  rebuild: ['PHASE 3 OF 5 · CURRENT', 'Rebuild', 'Practice focus consistently. Short, repeatable sessions help your attention grow stronger.'],
  deepen: ['PHASE 4 OF 5', 'Deepen', 'Gradually stretch your abilities while keeping the routine manageable.'],
  independence: ['PHASE 5 OF 5', 'Independence', 'Carry your habits forward with confidence and adjust your plan as life changes.']
};
document.querySelectorAll('[data-phase]').forEach(button => button.addEventListener('click', () => showInfo(...phases[button.dataset.phase])));
document.getElementById('focus-details').addEventListener('click', () => {
  const focus = focusChoices[selectedFocus];
  showInfo('YOUR CURRENT FOCUS', focus.title, focus.next);
  addTrainingLink(focus.session);
});

const goalKeys = ['focus', 'stillness', 'attention', 'shorts', 'review'];
const defaultGoals = { focus: true, stillness: true, attention: true, shorts: false, review: false };
const storedGoals = readStored('deepsprout-recovery-goals', defaultGoals);
const goals = Object.fromEntries(goalKeys.map(key => [key, typeof storedGoals?.[key] === 'boolean' ? storedGoals[key] : defaultGoals[key]]));
const goalRows = [...document.querySelectorAll('[data-goal]')];
const goalCount = document.getElementById('goals-count');
const renderGoals = () => {
  goalRows.forEach(row => {
    const done = goals[row.dataset.goal];
    row.classList.toggle('is-done', done);
    row.setAttribute('aria-pressed', String(done));
  });
  goalCount.textContent = `${Object.values(goals).filter(Boolean).length}/5`;
};
renderGoals();
goalRows.forEach(row => row.addEventListener('click', () => {
  goals[row.dataset.goal] = !goals[row.dataset.goal];
  writeStored('deepsprout-recovery-goals', goals);
  renderGoals();
}));
document.getElementById('weekly-details').addEventListener('click', () => {
  const count = Object.values(goals).filter(Boolean).length;
  showInfo('THIS WEEK', `${count} of 5 goals selected`, 'Your weekly goals keep the journey practical. Tap a goal in the list to mark it as part of your current routine.');
  const bar = document.createElement('div');
  bar.className = 'info-progress';
  const fill = document.createElement('span');
  fill.style.width = `${count * 20}%`;
  bar.append(fill);
  const caption = document.createElement('p');
  caption.className = 'info-caption';
  caption.textContent = count === 5 ? 'All five goals are part of your routine.' : `${5 - count} more to explore whenever you feel ready.`;
  infoExtra.append(bar, caption);
});

[baselineDialog, infoDialog].forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));

if (new URLSearchParams(window.location.search).get('setup') === '1') {
  window.addEventListener('load', () => baselineDialog.showModal(), { once: true });
}
