(() => {
  const form = document.getElementById('shield-form');
  const time = document.getElementById('shield-time');
  const apps = [...form.querySelectorAll('[name="app"]')];
  try {
    time.value = JSON.parse(localStorage.getItem('deepsprout-shield-time')) || '19:00';
    const selected = JSON.parse(localStorage.getItem('deepsprout-shield-apps'));
    if (Array.isArray(selected)) apps.forEach(input => { input.checked = selected.includes(input.value); });
  } catch {}
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      localStorage.setItem('deepsprout-shield-time', JSON.stringify(time.value));
      localStorage.setItem('deepsprout-shield-apps', JSON.stringify(apps.filter(input => input.checked).map(input => input.value)));
      document.getElementById('save-message').textContent = 'Preferences saved on this device.';
    } catch { document.getElementById('save-message').textContent = 'This browser could not save your preferences.'; }
  });
})();
