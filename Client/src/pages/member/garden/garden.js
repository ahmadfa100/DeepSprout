document.documentElement.classList.add('js');

const readStored = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const writeStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Garden remains usable without local storage. */ }
};

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -20px 0px' });
  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('visible'));
}

const today = () => new Date().toLocaleDateString('en-CA');
const waterButton = document.getElementById('water-garden');
const waterFeedback = document.getElementById('water-feedback');
const scene = document.querySelector('.garden-scene');
const renderProgress = () => {
  const xp = Math.max(0, Number(readStored('deepsprout-garden-xp', 120)) || 0);
  const sessions = Math.max(0, Number(readStored('deepsprout-garden-sessions', 12)) || 0);
  const level = 3 + Math.floor(xp / 200);
  const progress = xp % 200;
  document.getElementById('level-label').textContent = `Level ${level}`;
  document.getElementById('level-progress').textContent = `${progress} / 200 XP`;
  document.getElementById('level-fill').style.width = `${progress / 2}%`;
  document.querySelector('.level-track').setAttribute('aria-valuenow', String(progress));
  document.getElementById('sessions-count').textContent = String(sessions);
  document.getElementById('plants-count').textContent = String(3 + Math.floor(xp / 200));
  document.getElementById('xp-count').textContent = String(xp);
  document.getElementById('milestone-text').textContent = `Unlock a new plant at ${Math.ceil((xp + 1) / 200) * 200} XP`;
  const watered = readStored('deepsprout-garden-water-date', '') === today();
  waterButton.disabled = watered;
  waterButton.innerHTML = `<svg><use href="#i-water"/></svg> ${watered ? 'Watered today' : 'Water your garden'}`;
};
renderProgress();

waterButton.addEventListener('click', () => {
  if (readStored('deepsprout-garden-water-date', '') === today()) return;
  writeStored('deepsprout-garden-water-date', today());
  writeStored('deepsprout-garden-xp', Number(readStored('deepsprout-garden-xp', 120)) + 10);
  renderProgress();
  waterFeedback.textContent = '+10 XP · Your garden is growing!';
  scene.classList.remove('watered');
  void scene.offsetWidth;
  scene.classList.add('watered');
  window.setTimeout(() => scene.classList.remove('watered'), 1400);
});
window.addEventListener('storage', renderProgress);

const plots = {
  depth: ['Depth Endurance', 'Every focused reading session gives this tree stronger roots. Give yourself a few undisturbed minutes today.', 'depth'],
  curiosity: ['Learning & Curiosity', 'New ideas flower when you make space to explore. Open a reading session and follow one interesting thought.', 'today'],
  consistency: ['Consistency', 'Small, repeated actions make a garden thrive. Return for one short session whenever you can.', 'quick'],
  offline: ['Offline Recovery', 'Step away from the screen and notice what is happening around you. This plot celebrates those restorative pauses.', 'offline'],
  regulation: ['Digital Self-Regulation', 'A mindful pause before opening another app gives you room to choose what matters.', 'reset']
};
const plotDialog = document.getElementById('plot-dialog');
document.querySelectorAll('[data-plot]').forEach(button => button.addEventListener('click', () => {
  const [title, description, session] = plots[button.dataset.plot];
  document.getElementById('plot-title').textContent = title;
  document.getElementById('plot-description').textContent = description;
  document.getElementById('plot-action').href = `../training/training.html?session=${encodeURIComponent(session)}`;
  plotDialog.showModal();
}));
plotDialog.addEventListener('click', event => {
  if (event.target === plotDialog) plotDialog.close();
});
