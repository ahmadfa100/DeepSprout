/**
 * Demo presenter. Signs in prepared demonstration identities and restores the
 * synthetic presentation scenario through the real journal engines.
 *
 * Restoring touches ONLY the scenario person's own private keys
 * (`…:person:p-rania`), after saving them to a dated backup key and after an
 * explicit confirmation. Other people's journals are never read or changed.
 */
(() => {
  const root = '../../../';
  const status = document.getElementById('dp-status');
  const dialog = document.getElementById('dp-dialog');
  const params = new URLSearchParams(location.search);
  const local = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const say = (message, tone = '') => { status.textContent = message; status.dataset.tone = tone; };

  const INDIVIDUALS = [
    {person: 'p-rania', role: 'Individual · presentation journey', scenario: 'rania-active-journey', go: 'index.html',
      points: ['Week 3 of an active Recovery Plan', 'Four valid baselines · weekly Lab', 'Depth Level 2 · Practical ready to advance', 'Accepted Initiative · waiting-list place']},
    {person: 'p-ahmad', role: 'Individual · original seeded story', go: 'index.html',
      points: ['Frozen on Sat 17 Jan 2026, day 13', 'Legacy records shown honestly as legacy', 'Two Initiative registrations']},
    {fresh: true, role: 'Fresh first run', go: 'register.html',
      points: ['Register → Bimo → four assessments', 'Activation from an empty journal', 'Independent of the prepared journeys']}
  ];
  const PARTNERS = [
    ['p-maya', 'Institution Representative · Coach', 'Start Today initiative, admissions, sessions and groups'],
    ['p-hala', 'Initiative Supervisor', 'Attendance and excuses for Start Today sessions'],
    ['p-karim', 'Independent Coach', 'Programs, assignments and reviews'],
    ['p-sami', 'Outdoor Provider · Supervisor', 'Weekend Nature Reset bookings and waiting list'],
    ['p-noor', 'Invited Student · Participant', 'Coach tasks, booking credential and attendance'],
    ['p-leen', 'Platform Admin', 'Partner applications and platform governance']
  ];

  const withRepo = () => new Promise(resolve => {
    if (window.DeepSproutRepo) return resolve(window.DeepSproutRepo);
    window.addEventListener('deepsprout:repo-ready', () => resolve(window.DeepSproutRepo), {once: true});
  });
  const personKeys = id => Object.keys(localStorage).filter(k => k.startsWith('deepsprout-') && k.endsWith(`:person:${id}`) && !k.includes(':backup'));

  const confirmDialog = (title, body, action) => new Promise(resolve => {
    dialog.querySelector('#dp-dialog-title').textContent = title;
    dialog.querySelector('#dp-dialog-body').innerHTML = body;
    dialog.querySelector('#dp-dialog-confirm').textContent = action;
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {once: true});
    dialog.showModal();
  });

  const enter = async (personId, go) => {
    const repo = await withRepo();
    if (personId) repo.signInAs(personId); else repo.signOut();
    try { sessionStorage.removeItem('deepsprout-account-choice'); } catch { /* ignore */ }
    if (!personId) try { sessionStorage.setItem('deepsprout-account-choice', 'empty'); } catch { /* ignore */ }
    location.href = root + go;
  };

  /* -------------------------------------------------- scenario restore */
  async function restoreScenario(entry) {
    const repo = await withRepo();
    const person = repo.read().people.find(p => p.id === entry.person);
    const keys = personKeys(entry.person);
    const ok = await confirmDialog(`Restore ${person.name}’s presentation journey?`,
      `<p>This rebuilds ${esc(person.name.split(' ')[0])}’s private journal from the scenario, through the real assessment, practice and Recovery engines.</p>
      <ul><li>${keys.length ? `Her current private records (${keys.length} key${keys.length === 1 ? '' : 's'}) are saved to a dated backup, then replaced.` : 'She has no private records on this device yet.'}</li>
      <li>Her shared Initiative admission and waiting-list place are not changed.</li>
      <li>No other person’s journal is read or changed.</li></ul>
      ${local ? '<label class="dp-check"><input type="checkbox" id="dp-pin-clock" checked> Also pin the shared demo clock to Fri 16 Oct 2026, 10:00 (all roles)</label>' : ''}`,
      'Restore journey');
    if (!ok) return;
    const pin = local && document.getElementById('dp-pin-clock')?.checked;
    try {
      if (keys.length) {
        const backup = Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]));
        localStorage.setItem(`deepsprout-demo-backup-v1:${entry.person}:${new Date().toISOString()}`, JSON.stringify(backup));
        keys.forEach(k => localStorage.removeItem(k));
      }
      window.DeepSproutDemoScenarios.forget(entry.person);
      if (pin) repo.run('demo.clock', {at: window.DeepSproutDemoScenarios.get(entry.scenario).clock});
      repo.signInAs(entry.person);
      try { sessionStorage.removeItem('deepsprout-account-choice'); } catch { /* ignore */ }
    } catch (error) { say(`Nothing was rebuilt: ${error.message}`, 'error'); return; }
    // Build on a fresh page load so the journal binds to the newly signed-in person.
    location.href = `?build=${encodeURIComponent(entry.scenario)}&dev=1`;
  }

  async function buildPending() {
    const id = params.get('build');
    if (!id) return false;
    history.replaceState(null, '', location.pathname);
    const scenario = window.DeepSproutDemoScenarios.get(id);
    try {
      if (!scenario) throw new Error('Unknown scenario.');
      say('Building the journey through the real engines…');
      const account = await window.DeepSproutAccount.load(true);
      const summary = window.DeepSproutDemoScenarios.build(account, id, {onStep: step => say(`Building · ${step}`)});
      say(`${summary.name}’s journey is ready: ${summary.events} journal events, personal clock ${new Date(summary.clock).toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}.`, 'ok');
    } catch (error) {
      say(`The journey could not be built: ${error.message} Nothing partial is presented as complete — restore again.`, 'error');
    }
    return true;
  }

  /* -------------------------------------------------- render */
  async function render() {
    const repo = await withRepo();
    const s = repo.read(), me = repo.me();
    const name = id => s.people.find(p => p.id === id)?.name || id;
    const mark = id => window.DeepSproutDemoScenarios.marker(id);

    document.getElementById('dp-individuals').innerHTML = INDIVIDUALS.map((entry, index) => {
      const ready = entry.scenario ? mark(entry.person) : null;
      const title = entry.fresh ? 'New person' : name(entry.person);
      const state = entry.scenario ? (ready ? `<span class="dp-pill is-ok">Ready · built ${esc(new Date(ready.builtAt).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}))}</span>` : '<span class="dp-pill is-warn">Restore once before presenting</span>') : entry.fresh ? '<span class="dp-pill">Empty journal</span>' : '<span class="dp-pill">Seeded</span>';
      return `<article class="dp-card${index === 0 ? ' is-lead' : ''}${me?.id === entry.person ? ' is-current' : ''}">
        <div class="dp-card-top"><span class="dp-avatar" aria-hidden="true">${esc(title.charAt(0))}</span><div><p class="dp-role">${esc(entry.role)}</p><h3>${esc(title)}</h3></div>${state}</div>
        <ul class="dp-points">${entry.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="dp-actions">
          ${entry.fresh ? `<button type="button" class="dp-btn dp-btn-primary" data-enter="" data-go="${entry.go}">Sign out and register</button>`
            : `<button type="button" class="dp-btn dp-btn-primary" data-enter="${entry.person}" data-go="${entry.go}"${entry.scenario && !ready ? ' disabled' : ''}>Enter as ${esc(title.split(' ')[0])}</button>`}
          ${entry.scenario ? `<button type="button" class="dp-btn dp-btn-quiet" data-restore="${entry.person}">${ready ? 'Restore journey' : 'Prepare journey'}</button>` : ''}
        </div>
      </article>`;
    }).join('');

    document.getElementById('dp-partners').innerHTML = PARTNERS.map(([id, role, note]) => `<article class="dp-card dp-card-small${me?.id === id ? ' is-current' : ''}">
      <p class="dp-role">${esc(role)}</p><h3>${esc(name(id))}</h3><p class="dp-note">${esc(note)}</p>
      <button type="button" class="dp-btn dp-btn-line" data-enter="${id}" data-go="workspaces.html#/auth/workspaces">Open workspace</button></article>`).join('');

    document.getElementById('dp-resets').innerHTML = `
      <article class="dp-card dp-card-small"><h3>Ahmad’s seeded story</h3><p class="dp-note">Removes changes made on top of the original seeded record.</p><button type="button" class="dp-btn dp-btn-line" data-reset="ahmad">Restore seeded story</button></article>
      <article class="dp-card dp-card-small"><h3>Shared partner records</h3><p class="dp-note">Returns initiatives, bookings, attendance and reviews to the original seed. Private journals are kept.</p><button type="button" class="dp-btn dp-btn-line" data-reset="shared"${local ? '' : ' disabled'}>Reset shared records</button></article>`;
    if (!local) say('Identity switching works here; the shared demo clock and shared reset need the local preview server (python3 Client/serve.py).');
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.enter !== undefined) return enter(button.dataset.enter, button.dataset.go);
    if (button.dataset.restore) return restoreScenario(INDIVIDUALS.find(e => e.person === button.dataset.restore));
    if (button.dataset.reset === 'ahmad') {
      const key = 'deepsprout-account-changes-v1:demo';
      const count = (() => { try { return JSON.parse(localStorage.getItem(key) || '[]').length; } catch { return 0; } })();
      if (!await confirmDialog('Restore Ahmad’s seeded story?', `<p>${count ? `${count} change${count === 1 ? '' : 's'} made on top of the seeded record will be saved to a dated backup, then removed.` : 'There are no changes on top of the seeded record.'}</p>`, 'Restore story')) return;
      if (count) { localStorage.setItem(`deepsprout-demo-backup-v1:p-ahmad:${new Date().toISOString()}`, localStorage.getItem(key)); localStorage.removeItem(key); }
      say('Ahmad’s seeded story is restored.', 'ok');
    }
    if (button.dataset.reset === 'shared') {
      if (!await confirmDialog('Reset shared partner records?', '<p>Every Initiative, booking, admission, attendance and review created during a demonstration returns to the original seed for all roles. Private personal journals are kept.</p>', 'Reset shared records')) return;
      try { (await withRepo()).run('demo.reset', {}); say('Shared records are back to the original seed.', 'ok'); } catch (error) { say(error.message, 'error'); }
      render();
    }
  });

  (async () => {
    await withRepo();
    if (window.DeepSproutRepo.me()) window.DeepSprout?.bind();
    await buildPending();
    render();
  })();
})();
