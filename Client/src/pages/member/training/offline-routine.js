/**
 * My Offline Routine — a light personal checklist (spec 7.4).
 *
 * Add, tick, skip, EDIT (rename, days, recurrence, pause) and DELETE items.
 * Every tick is the user's own report: nothing here is verified or graded,
 * and creating an item earns nothing on its own.
 *
 * Edits apply from today: past days keep the schedule they had. Deleting an
 * item stops it being scheduled; its past check-ins stay in the history and
 * anything they already earned is untouched. Deletion is always confirmed.
 */
(() => {
  if (window.DeepSproutPersonal?.denied()) { try { window.DeepSproutPersonal.requireAccess(); } catch {} return; }
  const Account = window.DeepSproutAccount;
  if (!Account) return;
  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ORDER = [1, 2, 3, 4, 5, 6, 0];
  const IDEAS = [
    { title: 'Five-minute walk', hint: 'Outside if you can, around the room if you cannot.' },
    { title: 'Read two pages', hint: 'A real book or magazine — anything on paper.' },
    { title: 'Sketch something', hint: 'No skill required. One small drawing is enough.' },
    { title: 'Practise an instrument', hint: 'Even a few minutes counts.' },
    { title: 'Stretch before bed', hint: 'A short wind-down away from a screen.' },
    { title: 'Call or sit with someone', hint: 'A short real conversation.' }
  ];

  const $ = id => document.getElementById(id);
  const list = $('routine-list');
  const weekStrip = $('routine-week');
  const input = $('routine-input');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let account = null;
  let editingId = null;
  let freshId = null;
  let flashTimer = null;

  const dayLabel = (days, recurrence) => {
    const base = days.length === 7 ? 'Every day'
      : days.length === 5 && [1, 2, 3, 4, 5].every(day => days.includes(day)) ? 'Weekdays'
        : ORDER.filter(day => days.includes(day)).map(day => DAY_NAMES[day].slice(0, 3)).join(', ');
    return recurrence === 'biweekly' ? `${base}, every other week` : base;
  };

  /** The seven days of the plan's current week (or the calendar week without a plan). */
  const weekDates = () => {
    const plan = account.plan();
    if (plan) return account.weekDates(plan.week);
    const start = Account.addDays(account.today, -((account.today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, offset) => Account.addDays(start, offset));
  };

  /* -------------------------------------------------------------- rendering */

  function renderWeek() {
    const items = account.routine().items;
    weekStrip.replaceChildren(...weekDates().map((date, index) => {
      const key = Account.keyOf(date);
      const scheduled = items.filter(item => account.routineScheduledOn(item, date));
      const done = scheduled.filter(item => account.routineStatusOn(item, date) === 'done').length;
      const future = key > account.todayKey;
      const cell = document.createElement('div');
      cell.className = 'routine-day-cell';
      cell.style.setProperty('--fill', scheduled.length ? done / scheduled.length : 0);
      cell.style.setProperty('--i', index);
      if (key === account.todayKey) cell.classList.add('is-today');
      if (!scheduled.length) cell.classList.add('is-empty-day');
      else if (future) cell.classList.add('is-future');
      else if (done === scheduled.length) cell.classList.add('is-full');
      const label = !scheduled.length ? 'nothing scheduled' : future ? 'not due yet' : `${done} of ${scheduled.length} done`;
      cell.innerHTML = `<span class="routine-day-letter">${DAY_LETTERS[date.getDay()]}</span><span class="routine-day-bar" aria-hidden="true"><i></i></span><span class="visually-hidden">${DAY_NAMES[date.getDay()]}: ${label}</span>`;
      cell.title = `${DAY_NAMES[date.getDay()]} — ${label}`;
      return cell;
    }));
  }

  function renderIdeas() {
    const existing = account.routine().items.map(item => item.title.toLowerCase());
    const ideas = IDEAS.filter(idea => !existing.includes(idea.title.toLowerCase()));
    const host = $('routine-ideas');
    host.replaceChildren(...ideas.slice(0, 5).map(idea => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'routine-idea';
      chip.title = idea.hint;
      chip.innerHTML = `<svg><use href="#i-plus"/></svg>${escape(idea.title)}`;
      chip.addEventListener('click', () => add(idea.title, idea.hint));
      return chip;
    }));
    host.hidden = !ideas.length;
  }

  function editorFor(item) {
    const form = document.createElement('form');
    form.className = 'routine-editor';
    form.setAttribute('aria-label', `Edit ${item.title}`);
    form.innerHTML = `
      <label class="routine-field"><span>Name</span><input name="title" maxlength="60" required value="${escape(item.title)}"></label>
      <fieldset class="routine-field"><legend>Repeat on</legend>
        <div class="routine-day-picker">${ORDER.map(day =>
          `<button type="button" class="routine-day-toggle" data-day="${day}" aria-pressed="${item.days.includes(day)}" aria-label="${DAY_NAMES[day]}">${DAY_LETTERS[day]}</button>`).join('')}</div>
      </fieldset>
      <div class="routine-editor-row">
        <label class="routine-field"><span>How often</span>
          <select name="recurrence">
            <option value="weekly"${item.recurrence !== 'biweekly' ? ' selected' : ''}>Every week</option>
            <option value="biweekly"${item.recurrence === 'biweekly' ? ' selected' : ''}>Every other week</option>
          </select>
        </label>
        <label class="routine-switch"><input type="checkbox" name="paused"${item.paused ? ' checked' : ''}><span class="routine-switch-track" aria-hidden="true"></span><span>Paused</span></label>
      </div>
      <p class="routine-editor-note">Changes apply from today. Past days keep the record they already have.</p>
      <p class="routine-editor-error" role="alert" hidden>Pick at least one day.</p>
      <div class="routine-editor-actions">
        <button type="button" class="routine-delete" data-act="delete"><svg><use href="#i-trash"/></svg>Delete</button>
        <span>
          <button type="button" class="routine-secondary" data-act="cancel">Cancel</button>
          <button type="submit" class="routine-primary">Save changes</button>
        </span>
      </div>`;
    const days = new Set(item.days);
    form.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => {
      const day = Number(button.dataset.day);
      days.has(day) ? days.delete(day) : days.add(day);
      button.setAttribute('aria-pressed', String(days.has(day)));
    }));
    form.querySelector('[data-act="cancel"]').addEventListener('click', () => { editingId = null; render(); focusRow(item.id); });
    form.querySelector('[data-act="delete"]').addEventListener('click', () => confirmDelete(item));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const fields = form.elements;
      const title = fields.namedItem('title').value.trim().replace(/\s+/g, ' ');
      if (!days.size) { form.querySelector('.routine-editor-error').hidden = false; return; }
      if (!title) { fields.namedItem('title').focus(); return; }
      account.mutate({
        type: 'routine.update', id: item.id, title,
        days: [...days].sort(), recurrence: fields.namedItem('recurrence').value, paused: fields.namedItem('paused').checked
      });
      editingId = null;
      flash(`Saved “${title}”. The change applies from today.`);
      focusRow(item.id);
    });
    form.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); editingId = null; render(); focusRow(item.id); }
    });
    return form;
  }

  function renderList() {
    const items = account.routine().items;
    $('routine-empty').hidden = items.length > 0;
    const dates = weekDates();

    list.replaceChildren(...items.map(item => {
      const status = account.routineStatusOn(item, account.today);
      const scheduled = account.routineScheduledOn(item, account.today);
      const weekCount = dates.filter(date => account.routineStatusOn(item, date) === 'done').length;
      const row = document.createElement('li');
      row.className = 'routine-item';
      row.dataset.id = item.id;
      if (item.paused) row.classList.add('is-paused');
      if (status === 'done') row.classList.add('is-done');
      if (status === 'skipped') row.classList.add('is-skipped');
      if (item.id === editingId) row.classList.add('is-open');
      if (item.id === freshId) row.classList.add('is-fresh');

      const tick = document.createElement('button');
      tick.type = 'button';
      tick.className = 'routine-tick';
      tick.setAttribute('aria-pressed', String(status === 'done'));
      tick.setAttribute('aria-label', `Mark “${item.title}” as done today (your own report)`);
      tick.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
      tick.disabled = item.paused || !scheduled;
      tick.addEventListener('click', () => {
        const nowDone = account.routineStatusOn(item, account.today) !== 'done';
        account.mutate({ type: 'routine.log', id: item.id, status: nowDone ? 'done' : null });
        if (nowDone) burst(list.querySelector(`[data-id="${item.id}"] .routine-tick`));
      });

      const body = document.createElement('div');
      body.className = 'routine-body';
      const tag = item.paused ? '<span class="routine-tag">Paused</span>'
        : !scheduled ? '<span class="routine-tag is-quiet">Not today</span>'
          : status === 'skipped' ? '<span class="routine-tag is-skip">Skipped today</span>' : '';
      body.innerHTML = `<strong>${escape(item.title)}</strong>
        <span class="routine-meta"><span>${escape(dayLabel(item.days, item.recurrence))}</span><span aria-hidden="true">·</span><span>${weekCount} this week</span>${tag}</span>`;

      const actions = document.createElement('div');
      actions.className = 'routine-row-actions';
      if (scheduled && !item.paused) {
        const skip = document.createElement('button');
        skip.type = 'button';
        skip.className = 'routine-icon-button';
        skip.setAttribute('aria-label', status === 'skipped' ? `Undo skip for “${item.title}”` : `Skip “${item.title}” today`);
        skip.title = status === 'skipped' ? 'Undo skip' : 'Skip today';
        skip.innerHTML = '<svg><use href="#i-minus"/></svg>';
        skip.addEventListener('click', () => account.mutate({ type: 'routine.log', id: item.id, status: status === 'skipped' ? null : 'skipped' }));
        actions.append(skip);
      }
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'routine-icon-button';
      edit.dataset.edit = item.id;
      edit.setAttribute('aria-expanded', String(item.id === editingId));
      edit.setAttribute('aria-label', `Edit “${item.title}”`);
      edit.title = 'Edit';
      edit.innerHTML = '<svg><use href="#i-edit"/></svg>';
      edit.addEventListener('click', () => {
        editingId = editingId === item.id ? null : item.id;
        render();
        if (editingId) list.querySelector(`[data-id="${item.id}"] input[name="title"]`)?.focus();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'routine-icon-button is-danger';
      remove.setAttribute('aria-label', `Delete “${item.title}”`);
      remove.title = 'Delete';
      remove.innerHTML = '<svg><use href="#i-trash"/></svg>';
      remove.addEventListener('click', () => confirmDelete(item));
      actions.append(edit, remove);

      row.append(tick, body, actions);
      if (item.id === editingId) row.append(editorFor(item));
      return row;
    }));
    freshId = null;
  }

  function renderToday() {
    const items = account.routine().items;
    const due = items.filter(item => account.routineScheduledOn(item, account.today));
    const done = due.filter(item => account.routineStatusOn(item, account.today) === 'done').length;
    $('routine-ring-count').textContent = due.length ? `${done}/${due.length}` : '—';
    const ring = $('routine-ring');
    const length = 2 * Math.PI * 50;
    ring.style.strokeDasharray = `${length}`;
    ring.style.strokeDashoffset = `${length * (1 - (due.length ? done / due.length : 0))}`;
    $('routine-foot').textContent = !items.length ? 'Start with one thing. Small is fine.'
      : !due.length ? 'Nothing on your list is scheduled for today.'
        : done === due.length ? 'Everything for today is done. Skipped days are fine too — they are recorded as skipped, not as failures.'
          : `${due.length - done} left for today.`;
  }

  const render = () => {
    renderWeek();
    renderIdeas();
    renderList();
    renderToday();
  };

  const focusRow = id => list.querySelector(`[data-id="${id}"] [data-edit]`)?.focus();

  /* ------------------------------------------------------------- the actions */

  function add(title, hint = 'Your own.') {
    const clean = title.trim().replace(/\s+/g, ' ');
    if (!clean) { input.focus(); return; }
    if (account.routine().items.some(item => item.title.toLowerCase() === clean.toLowerCase())) {
      input.value = '';
      flash('That one is already on your list.');
      return;
    }
    const event = account.mutate({ type: 'routine.add', title: clean, hint, days: [0, 1, 2, 3, 4, 5, 6], recurrence: 'weekly' });
    freshId = event.id;
    input.value = '';
    render();
  }

  /* Delete — always confirmed, never one click. */
  const dialog = $('routine-delete-dialog');
  let pendingDelete = null;
  let returnFocus = null;

  function confirmDelete(item) {
    pendingDelete = item;
    returnFocus = document.activeElement;
    const ticks = item.checkIns.filter(entry => entry.status === 'done').length;
    const skips = item.checkIns.filter(entry => entry.status === 'skipped').length;
    $('routine-delete-title').textContent = `Delete “${item.title}”?`;
    $('routine-delete-body').textContent = `It stops being scheduled from today. ${ticks || skips
      ? `Your ${ticks} done ${ticks === 1 ? 'day' : 'days'}${skips ? ` and ${skips} skipped ${skips === 1 ? 'day' : 'days'}` : ''} stay in your history exactly as recorded, and anything they already counted towards is kept.`
      : 'It has no check-ins yet, so no history is affected.'}`;
    dialog.showModal();
    $('routine-delete-cancel').focus();
  }

  $('routine-delete-cancel').addEventListener('click', () => dialog.close('cancel'));
  $('routine-delete-confirm').addEventListener('click', () => dialog.close('delete'));
  dialog.addEventListener('close', () => {
    const item = pendingDelete;
    pendingDelete = null;
    if (dialog.returnValue === 'delete' && item) {
      account.mutate({ type: 'routine.remove', id: item.id });
      editingId = null;
      flash(`Deleted “${item.title}”. Its past check-ins are kept in your history.`);
      input.focus();
    } else {
      returnFocus?.focus?.();
    }
    dialog.returnValue = '';
  });

  function flash(message) {
    const bar = $('routine-undo');
    $('routine-undo-text').textContent = message;
    $('routine-undo-button').hidden = true;
    bar.hidden = false;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { bar.hidden = true; }, 6000);
  }

  /** A small burst of leaves when something is ticked off. */
  function burst(target) {
    if (reducedMotion()) return;
    const host = target?.closest('.routine-item');
    if (!host) return;
    for (let index = 0; index < 7; index += 1) {
      const leaf = document.createElement('span');
      leaf.className = 'routine-leaf';
      leaf.style.setProperty('--a', `${index * (360 / 7) + Math.random() * 20}deg`);
      leaf.style.setProperty('--d', `${26 + Math.random() * 16}px`);
      host.append(leaf);
      setTimeout(() => leaf.remove(), 800);
    }
  }

  $('routine-form').addEventListener('submit', event => {
    event.preventDefault();
    add(input.value);
  });

  Account.load().then(loaded => {
    account = loaded;
    render();
    window.addEventListener('deepsprout:account', render);
  }).catch(() => {
    $('routine-empty').hidden = false;
    $('routine-empty').lastChild.textContent = 'Your routine couldn’t be loaded. Nothing is shown rather than an empty list that isn’t true.';
  });
})();
