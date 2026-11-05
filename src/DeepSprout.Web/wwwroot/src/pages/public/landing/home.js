document.documentElement.classList.add('js');

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

const tabs = [...document.querySelectorAll('[data-tab]')];
const selectTab = tab => {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
};
tabs.forEach(tab => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[next]);
    tabs[next].focus();
  });
});
selectTab(tabs[0]);

let durationSeconds = 25 * 60;
let remainingSeconds = durationSeconds;
let timerId = null;
let endTime = 0;
const timerDisplay = document.getElementById('timer-display');
const timerToggle = document.getElementById('timer-toggle');
const timerReset = document.getElementById('timer-reset');
const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const renderTimer = () => { timerDisplay.textContent = formatTime(remainingSeconds); };
const stopTimer = () => {
  window.clearInterval(timerId);
  timerId = null;
  timerToggle.innerHTML = 'Start focus <svg><use href="#i-play"/></svg>';
};
const tickTimer = () => {
  remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  renderTimer();
  if (remainingSeconds === 0) {
    stopTimer();
    timerToggle.textContent = 'Session complete ✦';
  }
};
timerToggle.addEventListener('click', () => {
  if (timerId) {
    tickTimer();
    stopTimer();
    return;
  }
  if (remainingSeconds === 0) remainingSeconds = durationSeconds;
  endTime = Date.now() + remainingSeconds * 1000;
  timerId = window.setInterval(tickTimer, 250);
  timerToggle.textContent = 'Pause focus';
});
timerReset.addEventListener('click', () => {
  stopTimer();
  remainingSeconds = durationSeconds;
  renderTimer();
});
document.querySelectorAll('[data-minutes]').forEach(button => button.addEventListener('click', () => {
  stopTimer();
  durationSeconds = Number(button.dataset.minutes) * 60;
  remainingSeconds = durationSeconds;
  renderTimer();
  document.querySelectorAll('[data-minutes]').forEach(item => item.classList.toggle('is-active', item === button));
}));

const breathToggle = document.getElementById('breath-toggle');
const breathOrb = document.querySelector('.breath-orb');
breathToggle.addEventListener('click', () => {
  const running = breathOrb.classList.toggle('is-running');
  breathToggle.textContent = running ? 'Pause breathing' : 'Begin breathing';
});

const quests = [
  ['Take a five-minute walk', "Leave your phone behind and notice three things you haven't seen today."],
  ['Find a little patch of green', 'Step outside and notice the shape, texture, or color of one plant.'],
  ['Share a real conversation', 'Ask someone how their day is going and give them your full attention.'],
  ['Make something with your hands', 'Draw, cook, tidy, or build something small without checking your screen.']
];
let questIndex = 0;
document.getElementById('quest-next').addEventListener('click', () => {
  questIndex = (questIndex + 1) % quests.length;
  document.getElementById('quest-title').textContent = quests[questIndex][0];
  document.getElementById('quest-description').textContent = quests[questIndex][1];
});

const habitButtons = [...document.querySelectorAll('[data-habit]')];
habitButtons.forEach(button => button.addEventListener('click', () => {
  button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
  const done = habitButtons.filter(item => item.getAttribute('aria-pressed') === 'true').length;
  window.DeepSproutGrowth?.setHabitProgress(done, habitButtons.length);
}));

const focusDialog = document.getElementById('focus-dialog');
document.querySelectorAll('[data-open-check]').forEach(button => button.addEventListener('click', () => {
  focusDialog.querySelector('.check-result').textContent = '';
  focusDialog.querySelectorAll('[data-result]').forEach(option => option.classList.remove('selected'));
  focusDialog.showModal();
}));
focusDialog.querySelectorAll('[data-result]').forEach(button => button.addEventListener('click', () => {
  focusDialog.querySelector('.check-result').textContent = button.dataset.result;
  focusDialog.querySelectorAll('[data-result]').forEach(option => option.classList.toggle('selected', option === button));
}));
focusDialog.addEventListener('click', event => {
  if (event.target === focusDialog) focusDialog.close();
});
