/** Profile and settings, read from the account record, plus demo controls. */
(() => {
  const Account = window.DeepSproutAccount;
  const root = document.body.dataset.root || '../../../../';
  let account = null;
  const PREFS_KEY = 'deepsprout-preferences';
  const readPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } };
  const writePrefs = value => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(value)); } catch { /* this visit only */ } };

  /* ---------------------------------------------------------------- account */

  function renderAccount() {
    const profile = account.profile();
    const plan = account.plan();
    document.getElementById('name').value = profile.name || '';
    document.getElementById('email').value = profile.email || '';
    document.getElementById('profile-name').textContent = profile.name || 'Your account';
    document.getElementById('avatar').textContent = (profile.name || 'Y').trim().charAt(0).toUpperCase();
    document.getElementById('profile-state').textContent = plan
      ? `Cycle ${plan.cycleNumber}, day ${plan.day} of ${plan.lengthDays} · ${plan.goalLabel}`
      : 'No plan is active yet. Your first run sets your goal and your starting point.';
  }

  document.getElementById('save-account').addEventListener('click', () => {
    account.mutate({
      type: 'profile.update',
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim()
    });
    renderAccount();
    const saved = document.getElementById('account-saved');
    saved.textContent = 'Saved to this account.';
    window.setTimeout(() => { saved.textContent = ''; }, 3000);
  });

  /* ---------------------------------------------------------- setup answers */

  const LABELS = {
    distracting: {
      instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube / Shorts',
      x: 'X', facebook: 'Facebook', snapchat: 'Snapchat', other: 'Something else'
    },
    peakTime: {
      morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
      'late-night': 'Late at night', unsure: 'Varies / not sure'
    },
    baselineMinutes: {
      'under-30': 'Under 30 minutes', '30-60': '30 – 60 minutes', '60-120': '1 – 2 hours',
      '120-180': '2 – 3 hours', 'over-180': 'More than 3 hours', unsure: 'Not sure'
    },
    devices: {
      'chrome-desktop': 'Chrome on a computer', 'other-desktop': 'Another desktop browser',
      phone: 'Mostly phone', tablet: 'Tablet'
    },
    offlineInterests: {
      walking: 'Walking', sport: 'Sport', reading: 'Reading on paper', drawing: 'Drawing',
      music: 'Music', cooking: 'Cooking', people: 'Friends and family', quiet: 'Quiet time'
    },
    protection: { gentle: 'Gentle', balanced: 'Balanced', firm: 'Firm' }
  };

  const describe = (key, value) => {
    if (Array.isArray(value)) {
      if (!value.length) return null;
      return value.map(entry => LABELS[key]?.[entry] || entry).join(', ');
    }
    if (!value) return null;
    if (key === 'goal') return account.profile().goal?.label || null;
    if (key === 'availableDays') return `${value} day${value === '1' ? '' : 's'} a week`;
    return LABELS[key]?.[value] || value;
  };

  function renderAnswers() {
    const profile = account.profile().setup || {};
    const rows = [
      ['Main goal', describe('goal', account.profile().goal ? 'goal' : null)],
      ['Most distracting', describe('distracting', profile.distracting)],
      ['Usually scrolls', describe('peakTime', profile.peakTime)],
      ['Self-reported daily time', describe('baselineMinutes', profile.baselineMinutes)],
      ['Browses on', describe('devices', profile.devices)],
      ['Enjoys offline', describe('offlineInterests', profile.offlineInterests)],
      ['Days available', describe('availableDays', profile.availableDays)],
      ['Protection intensity', describe('protection', profile.protection)]
    ];

    const list = document.getElementById('setup-answers');
    list.replaceChildren();
    rows.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      if (value) dd.textContent = value;
      else { dd.textContent = 'Not answered'; dd.className = 'is-empty'; }
      list.append(dt, dd);
    });
  }

  /* -------------------------------------------------------------- the journey */

  function renderJourney() {
    const names = Account.NAMES;
    const baseline = account.checkIns().filter(entry => entry.baseline).length;
    const plan = account.plan();
    const steps = [
      { done: Boolean(account.profile().setup), title: 'Personal setup', note: 'Eight quick questions.', href: `${root}src/pages/member/onboarding/onboarding.html?step=setup` },
      { done: baseline === 4, title: `Starting ${names.checkIn.toLowerCase()}`, note: `${baseline} of 4 tasks recorded.`, href: `${root}src/pages/member/lab/lab.html` },
      { done: Boolean(plan), title: 'Plan activated', note: plan ? `Cycle ${plan.cycleNumber} is running — day ${plan.day} of ${plan.lengthDays}.` : 'Your 28-day cycle starts here.', href: `${root}src/pages/member/recovery-plan/recovery-plan.html` }
    ];
    document.getElementById('journey-list').replaceChildren(...steps.map(step => {
      const item = document.createElement('li');
      if (step.done) item.classList.add('is-done');
      item.innerHTML = `<span class="pr-step-mark"><svg><use href="#i-check"/></svg></span>
        <span><strong>${step.title}</strong><small>${step.note}</small>
        <a href="${step.href}">${step.done ? 'Open' : 'Continue here'}</a></span>`;
      return item;
    }));
  }

  /* ------------------------------------------------------------- preferences */

  const TOGGLES = [
    { key: 'reminders', title: 'Activity reminders', note: 'A nudge on days with something scheduled. Never for days off.' },
    { key: 'reviewNudge', title: 'Weekly review reminder', note: 'One reminder when a review is due. Skipping it keeps your current pace.' },
    { key: 'shieldPrompt', title: 'Usage reminder prompt', note: 'The "you have reached your limit" prompt, once per day period.' },
    { key: 'communityDigest', title: 'Community digest', note: 'A short weekly summary instead of live notifications.' }
  ];

  function renderToggles() {
    const stored = readPrefs();
    const container = document.getElementById('toggles');
    container.replaceChildren(...TOGGLES.map(toggle => {
      const on = stored[toggle.key] !== false;
      const row = document.createElement('div');
      row.className = 'pr-toggle';
      row.innerHTML = `<span class="pr-toggle-body"><strong>${toggle.title}</strong><small>${toggle.note}</small></span>`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pr-switch';
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', `${toggle.title}: ${on ? 'on' : 'off'}`);
      button.addEventListener('click', () => {
        writePrefs({ ...readPrefs(), [toggle.key]: !on });
        renderToggles();
      });
      row.append(button);
      return row;
    }));
  }

  /* ----------------------------------------------------------- demo controls */

  const dataDialog = document.getElementById('data-dialog');
  document.getElementById('export-data').addEventListener('click', () => {
    document.getElementById('data-output').textContent = JSON.stringify(account.exportRecord(), null, 2);
    dataDialog.showModal();
  });

  const resetDialog = document.getElementById('reset-dialog');
  document.getElementById('reset-demo').addEventListener('click', () => resetDialog.showModal());
  document.getElementById('confirm-reset').addEventListener('click', () => {
    Account.resetChanges();
    location.href = `${root}index.html`;
  });

  [dataDialog, resetDialog].forEach(dialog => {
    dialog.querySelectorAll('[data-close-dialog]').forEach(button =>
      button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  });

  renderToggles();
  Account.load().then(loaded => {
    account = loaded;
    renderAccount();
    renderAnswers();
    renderJourney();
  }).catch(() => {
    document.getElementById('profile-state').textContent = 'Your account couldn’t be loaded.';
  });
})();
