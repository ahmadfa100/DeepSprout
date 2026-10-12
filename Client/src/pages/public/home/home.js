(() => {
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const toast = document.getElementById('home-toast');
  let toastTimer;
  const announce = message => { toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 4000); };
  const goalDialog = document.getElementById('goal-dialog');
  const goalInput = document.getElementById('goal-input');
  const reasonInput = document.getElementById('reason-input');
  const renderGoal = () => {
    const goal = read('deepsprout-home-goal', read('deepsprout-dashboard-goal', { title: 'Spend less time scrolling', reason: 'I want to feel more present, focused, and in control of my time.' }));
    document.getElementById('goal-title').textContent = goal.title;
    document.getElementById('hero-goal').textContent = goal.title;
    document.getElementById('goal-reason').textContent = goal.reason;
    goalInput.value = goal.title;
    reasonInput.value = goal.reason;
  };
  document.getElementById('edit-goal').addEventListener('click', () => goalDialog.showModal());
  document.getElementById('goal-form').addEventListener('submit', event => {
    event.preventDefault();
    const title = goalInput.value.trim();
    const reason = reasonInput.value.trim();
    if (!title || !reason) return;
    save('deepsprout-home-goal', { title, reason });
    renderGoal(); goalDialog.close(); announce('Your goal was saved on this device.');
  });
  const missionDialog = document.getElementById('mission-dialog');
  const timeInput = document.getElementById('screen-free-time');
  const missionButton = document.getElementById('mission-button');
  const renderMission = () => {
    const time = read('deepsprout-screen-free-time', null);
    if (!time) return;
    timeInput.value = time;
    missionButton.firstChild.textContent = 'Edit mission ';
    document.getElementById('mission-title').textContent = `Your screen-free time is ${new Date(`2000-01-01T${time}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  };
  missionButton.addEventListener('click', () => missionDialog.showModal());
  document.getElementById('mission-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!timeInput.value) return;
    save('deepsprout-screen-free-time', timeInput.value);
    renderMission(); missionDialog.close(); announce('Your evening rule was saved on this device.');
  });
  document.querySelectorAll('.home-dialog [data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('.home-dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  const shieldTime = read('deepsprout-shield-time', '19:00');
  document.getElementById('shield-time').textContent = new Date(`2000-01-01T${shieldTime}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  renderGoal(); renderMission();
})();
