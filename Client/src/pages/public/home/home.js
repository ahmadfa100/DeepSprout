(() => {
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* The page still works when storage is unavailable. */ }
  };
  const toast = document.getElementById('home-toast');
  let toastTimer;
  const announce = message => {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  };

  const goalDialog = document.getElementById('goal-dialog');
  const goalInput = document.getElementById('goal-input');
  const reasonInput = document.getElementById('reason-input');
  const renderGoal = () => {
    const goal = read('deepsprout-home-goal', read('deepsprout-dashboard-goal', {
      title: 'Spend less time scrolling',
      reason: 'I want to feel more present, focused, and in control of my time.'
    }));
    goalInput.value = goal.title;
    reasonInput.value = goal.reason;
    document.getElementById('goal-summary-title').textContent = goal.title;
    document.getElementById('edit-goal').setAttribute('aria-label', `Edit your goal: ${goal.title}`);
  };
  document.getElementById('edit-goal').addEventListener('click', () => goalDialog.showModal());
  document.getElementById('goal-form').addEventListener('submit', event => {
    event.preventDefault();
    const title = goalInput.value.trim();
    const reason = reasonInput.value.trim();
    if (!title || !reason) return;
    save('deepsprout-home-goal', { title, reason });
    renderGoal();
    goalDialog.close();
    announce('Your goal was saved on this device.');
  });

  const missionDialog = document.getElementById('mission-dialog');
  const timeInput = document.getElementById('screen-free-time');
  const formatTime = time => new Date(`2000-01-01T${time}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const renderMission = () => {
    const time = read('deepsprout-screen-free-time', null);
    if (!time) return;
    timeInput.value = time;
    document.getElementById('mission-summary').textContent = `Screen-free at ${formatTime(time)}.`;
  };
  document.getElementById('mission-feature').addEventListener('click', () => missionDialog.showModal());
  document.getElementById('mission-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!timeInput.value) return;
    save('deepsprout-screen-free-time', timeInput.value);
    renderMission();
    missionDialog.close();
    announce('Your evening rule was saved on this device.');
  });

  const renderProgress = () => {
    const sessions = Math.min(5, Math.max(3, Number(read('deepsprout-training-completed', 3)) || 3));
    const xp = Math.max(0, Number(read('deepsprout-garden-xp', 120)) || 0);
    document.getElementById('training-progress').textContent = `${sessions} of 5`;
    document.getElementById('garden-xp').textContent = String(xp);
  };
  window.addEventListener('storage', () => { renderGoal(); renderMission(); renderProgress(); });

  document.querySelectorAll('.home-dialog [data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('.home-dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  }));
  renderGoal();
  renderMission();
  renderProgress();
})();
