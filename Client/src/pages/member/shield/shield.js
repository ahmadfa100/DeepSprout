(() => {
  const access = window.DeepSproutPersonal;
  if (access.denied()) { try { access.requireAccess(); } catch {} return; }
  const subject = access.subject();
  const preferenceKey = key => `${key}:person:${subject}`;
  const assetRoot = '../../../../assets/home-kit/icons/';
  const catalog = [
    { name: 'Instagram', image: 'instagram-color.svg' },
    { name: 'YouTube Shorts', image: 'youtube-color.svg' },
    { name: 'TikTok', image: 'tiktok-color.svg' },
    { name: 'Snapchat', glyph: '♟', style: 'snapchat' },
    { name: 'Facebook', glyph: 'f', style: 'facebook' },
    { name: 'X / Twitter', glyph: '𝕏', style: 'x' },
    { name: 'Reddit', glyph: '●', style: 'reddit' },
    { name: 'Discord', glyph: '◉', style: 'discord' },
    { name: 'Netflix', glyph: 'N', style: 'netflix' },
    { name: 'Pinterest', glyph: 'P', style: 'pinterest' },
    { name: 'LinkedIn', glyph: 'in', style: 'linkedin' },
    { name: 'Twitch', glyph: '▣', style: 'twitch' }
  ];
  const form = document.getElementById('shield-form');
  const appGrid = document.getElementById('app-grid');
  const basket = document.getElementById('focus-basket');
  const basketList = document.getElementById('basket-list');
  const basketCount = document.getElementById('basket-count');
  const timeInput = document.getElementById('shield-time');
  const reminderInput = document.getElementById('shield-reminder');
  const customInput = document.getElementById('custom-app-input');
  const inputMessage = document.getElementById('input-message');
  const saveMessage = document.getElementById('save-message');
  const timerDisplay = document.getElementById('focus-time-display');
  const timerCaption = document.getElementById('timer-caption');
  const timerStart = document.getElementById('timer-start');
  const timerReset = document.getElementById('timer-reset');
  const timerRing = document.querySelector('.ring-inner');
  const timerDuration = 25 * 60;
  let timerRemaining = timerDuration;
  let timerDeadline = 0;
  let timerRunning = false;
  let timerInterval = null;
  const selected = new Set(['Instagram', 'YouTube Shorts', 'TikTok']);
  let customApps = [];

  function readSaved(key) {
    return access.preference(key, null, subject);
  }
  const savedTime = readSaved('deepsprout-shield-time');
  if (typeof savedTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(savedTime)) timeInput.value = savedTime;
  const savedApps = readSaved('deepsprout-shield-apps');
  if (Array.isArray(savedApps)) {
    selected.clear();
    savedApps.filter(value => typeof value === 'string').forEach(value => selected.add(value));
  }
  const savedCustom = readSaved('deepsprout-shield-custom-apps');
  if (Array.isArray(savedCustom)) customApps = savedCustom.filter(value => typeof value === 'string').slice(0, 24);
  selected.forEach(name => {
    if (!catalog.some(app => app.name === name) && !customApps.includes(name)) customApps.push(name);
  });
  const savedReminder = readSaved('deepsprout-shield-reminder');
  if (typeof savedReminder === 'boolean') reminderInput.checked = savedReminder;
  try {
    const timerState = JSON.parse(sessionStorage.getItem(preferenceKey('deepsprout-shield-focus-timer')));
    if (timerState && Number.isFinite(timerState.remaining)) {
      timerRemaining = Math.max(0, Math.min(timerDuration, timerState.remaining));
      if (timerState.running && Number.isFinite(timerState.deadline)) {
        timerDeadline = timerState.deadline;
        timerRunning = true;
      }
    }
  } catch {}

  function iconFor(app) {
    const icon = document.createElement('span');
    icon.className = `app-icon ${app.style ? `icon-${app.style}` : ''}`;
    icon.setAttribute('aria-hidden', 'true');
    if (app.image) {
      const image = document.createElement('img');
      image.src = assetRoot + app.image;
      image.alt = '';
      icon.append(image);
    } else icon.textContent = app.glyph || '↗';
    return icon;
  }
  function appFor(name) {
    return catalog.find(app => app.name === name) || { name, glyph: '↗', style: 'custom' };
  }
  function renderCards() {
    appGrid.replaceChildren();
    [...catalog, ...customApps.map(name => appFor(name))].forEach(app => {
      const card = document.createElement('label');
      card.className = 'app-card';
      card.draggable = true;
      card.dataset.app = app.name;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'app';
      checkbox.value = app.name;
      checkbox.checked = selected.has(app.name);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selected.add(app.name); else selected.delete(app.name);
        saveMessage.textContent = '';
        renderBasket();
      });
      const title = document.createElement('span');
      title.className = 'app-name';
      title.textContent = app.name;
      card.append(checkbox, iconFor(app), title);
      card.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', app.name);
        event.dataTransfer.effectAllowed = 'copy';
      });
      if (app.style === 'custom') {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-card-wrap';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'custom-card-remove';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Remove custom website ${app.name}`);
        remove.addEventListener('click', () => {
          customApps = customApps.filter(name => name !== app.name);
          selected.delete(app.name);
          saveMessage.textContent = '';
          renderCards();
          renderBasket();
        });
        wrapper.append(card, remove);
        appGrid.append(wrapper);
      } else appGrid.append(card);
    });
  }
  function renderBasket() {
    basketList.replaceChildren();
    basketCount.innerHTML = `${selected.size} ${selected.size === 1 ? 'app' : 'apps'}<br>in basket`;
    if (!selected.size) {
      const empty = document.createElement('p');
      empty.className = 'basket-empty';
      empty.textContent = 'Choose an app to begin your focus basket.';
      basketList.append(empty);
      return;
    }
    [...catalog.map(app => app.name), ...customApps].filter(name => selected.has(name)).forEach(name => {
      const row = document.createElement('div');
      row.className = 'basket-item';
      const title = document.createElement('span');
      title.className = 'basket-item-name';
      title.textContent = name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'basket-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${name} from basket`);
      remove.addEventListener('click', () => {
        selected.delete(name);
        saveMessage.textContent = '';
        renderCards();
        renderBasket();
      });
      row.append(iconFor(appFor(name)), title, remove);
      basketList.append(row);
    });
  }
  function saveTimerState() {
    try {
      access.assert(subject);
      sessionStorage.setItem(preferenceKey('deepsprout-shield-focus-timer'), JSON.stringify({
        remaining: timerRemaining, deadline: timerDeadline, running: timerRunning
      }));
    } catch {}
  }
  function renderTimer() {
    if (timerRunning) {
      timerRemaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
      if (!timerRemaining) {
        timerRunning = false;
        clearInterval(timerInterval);
        timerInterval = null;
        saveTimerState();
      }
    }
    timerDisplay.textContent = `${String(Math.floor(timerRemaining / 60)).padStart(2, '0')}:${String(timerRemaining % 60).padStart(2, '0')}`;
    timerRing.style.setProperty('--timer-progress', `${timerRemaining / timerDuration * 100}%`);
    timerCaption.textContent = timerRunning ? 'Focus session in progress' : timerRemaining === 0 ? 'Session complete' : timerRemaining < timerDuration ? 'Paused — continue anytime' : 'Ready when you are';
    timerStart.textContent = timerRunning ? 'Pause focus' : timerRemaining < timerDuration && timerRemaining > 0 ? 'Resume focus' : timerRemaining === 0 ? 'Start again' : 'Start focus';
  }
  function startTicker() {
    clearInterval(timerInterval);
    timerInterval = setInterval(renderTimer, 1000);
    renderTimer();
  }
  timerStart.addEventListener('click', () => {
    if (timerRunning) {
      timerRemaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
      timerRunning = false;
      clearInterval(timerInterval);
      timerInterval = null;
    } else {
      if (timerRemaining === 0) timerRemaining = timerDuration;
      timerDeadline = Date.now() + timerRemaining * 1000;
      timerRunning = true;
      startTicker();
    }
    saveTimerState();
    renderTimer();
  });
  timerReset.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerRemaining = timerDuration;
    timerDeadline = 0;
    saveTimerState();
    renderTimer();
  });
  document.addEventListener('visibilitychange', renderTimer);
  if (timerRunning) startTicker(); else renderTimer();

  function updateTime() {
    const [hours, minutes] = timeInput.value.split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return;
    const hour12 = hours % 12 || 12;
    document.getElementById('focus-time-label').textContent = `Today, ${hour12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
    saveMessage.textContent = '';
  }
  timeInput.addEventListener('input', updateTime);
  timeInput.addEventListener('change', updateTime);
  reminderInput.addEventListener('change', () => { saveMessage.textContent = ''; });
  updateTime();
  renderCards();
  renderBasket();

  function addCustom() {
    const raw = customInput.value.trim();
    if (!raw) { inputMessage.textContent = 'Enter an app or website link first.'; return; }
    let name;
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) throw new Error('Invalid website');
      name = url.hostname.replace(/^www\./, '').slice(0, 48);
    } catch { inputMessage.textContent = 'Enter a valid website link, such as example.com.'; return; }
    if (catalog.some(app => app.name.toLowerCase() === name.toLowerCase()) || customApps.includes(name)) {
      selected.add(name);
      inputMessage.textContent = 'This website is already in your list.';
    } else {
      customApps.push(name);
      selected.add(name);
      inputMessage.textContent = `${name} added to your basket. Save preferences to keep it.`;
    }
    customInput.value = '';
    saveMessage.textContent = '';
    renderCards();
    renderBasket();
  }
  document.getElementById('add-custom-app').addEventListener('click', addCustom);
  customInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); addCustom(); }
  });
  customInput.addEventListener('input', () => { inputMessage.textContent = ''; });
  basket.addEventListener('dragover', event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    basket.classList.add('drag-over');
  });
  basket.addEventListener('dragleave', event => {
    if (!basket.contains(event.relatedTarget)) basket.classList.remove('drag-over');
  });
  basket.addEventListener('drop', event => {
    event.preventDefault();
    basket.classList.remove('drag-over');
    const name = event.dataTransfer.getData('text/plain');
    if ([...catalog.map(app => app.name), ...customApps].includes(name)) {
      selected.add(name);
      saveMessage.textContent = '';
      renderCards();
      renderBasket();
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!timeInput.reportValidity()) return;
    try {
      access.assert(subject);
      const account = await window.DeepSproutAccount.load();
      account.mutate({type:'preferences.save',preferences:{
        'deepsprout-shield-time':timeInput.value, 'deepsprout-shield-apps':[...selected],
        'deepsprout-shield-custom-apps':customApps, 'deepsprout-shield-reminder':reminderInput.checked
      }});
      saveMessage.textContent = 'Preferences saved in this browser.';
    } catch { saveMessage.textContent = 'This browser could not save your preferences.'; }
  });

  /* What the extension measures — the same record Insights reads. */
  const Account = window.DeepSproutAccount;
  Account?.load().then(account => {
    const box = document.getElementById('shield-measured');
    const cycle = account.usageCycle() || account.usage(28);
    const fmt = Account.format;
    box.hidden = false;
    if (!cycle.connected) {
      box.innerHTML = `<div><p class="shield-measured-eyebrow">What's measured</p><h2 id="measured-title">Nothing yet — the extension isn't connected</h2>
        <p>Once the Chrome extension is connected it measures time on the sites you choose. Nothing is estimated before then.</p></div>`;
      return;
    }
    box.innerHTML = `<div><p class="shield-measured-eyebrow">What's measured · Measured by the Chrome extension</p>
        <h2 id="measured-title">${cycle.sites.map(site => `<span>${site}</span>`).join(' · ')}</h2>
        <p>Measured since ${fmt.date(cycle.connectedOn, { weekday: true, year: true })}. Your daily limit is <strong>${cycle.limit} minutes</strong>${cycle.overLimitDays ? `, passed on <strong>${cycle.overLimitDays} ${cycle.overLimitDays === 1 ? 'day' : 'days'}</strong> this cycle` : ''}.</p></div>
      <a class="shield-measured-link" href="../insights/insights.html#usage">See the day-by-day grid →</a>`;
  }).catch(() => {});
})();
