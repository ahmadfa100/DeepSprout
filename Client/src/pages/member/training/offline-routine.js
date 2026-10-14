/**
 * My Offline Routine — a light personal checklist (spec 7.4).
 *
 * Type and press Enter to add, tap a suggestion, tick it off, skip it, or open
 * a row to change its days, pause it or remove it — all in place, no pop-ups.
 * Every tick is a self-report: nothing here is verified, and creating items
 * earns nothing on its own.
 */
(() => {
  const DS = window.DeepSprout;
  if (!DS) return;
  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ORDER = [1, 2, 3, 4, 5, 6, 0];

  const $ = id => document.getElementById(id);
  const list = $('routine-list');
  const weekStrip = $('routine-week');
  const input = $('routine-input');
  const escape = value => String(value).replace(/[&<>"']/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  let openId = null;
  let freshId = null;
  let undoTimer = null;

  /** The seven days of the current week, Monday first. */
  const weekDates = () => {
    const today = new Date();
    const start = DS.addDays(today, -((today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, offset) => DS.addDays(start, offset));
  };
  const dayLabel = days => (days.length === 7 ? 'Every day'
    : days.length === 5 && [1, 2, 3, 4, 5].every(day => days.includes(day)) ? 'Weekdays'
      : ORDER.filter(day => days.includes(day)).map(day => DAY_NAMES[day].slice(0, 3)).join(', '));

  /* -------------------------------------------------------------- rendering */

  function renderWeek() {
    const items = DS.get().routine;
    const todayKey = DS.dayKey();
    weekStrip.replaceChildren(...weekDates().map((date, index) => {
      const key = DS.dayKey(date);
      const scheduled = items.filter(item => DS.routineScheduledToday(item, date));
      const done = scheduled.filter(item => item.log[key] === 'done').length;
      const future = DS.daysBetween(new Date(), date) > 0;
      const cell = document.createElement('div');
      cell.className = 'routine-day-cell';
      cell.style.setProperty('--fill', scheduled.length ? done / scheduled.length : 0);
      if (key === todayKey) cell.classList.add('is-today');
      if (!scheduled.length) cell.classList.add('is-empty-day');
      else if (future) cell.classList.add('is-future');
      else if (done === scheduled.length) cell.classList.add('is-full');
      const label = !scheduled.length ? 'nothing scheduled' : future ? 'not due yet' : `${done} of ${scheduled.length} done`;
      cell.innerHTML = `<span class="routine-day-letter">${DAY_LETTERS[date.getDay()]}</span><span class="routine-day-bar" aria-hidden="true"><i></i></span><span class="visually-hidden">${DAY_NAMES[date.getDay()]}: ${label}</span>`;
      cell.title = `${DAY_NAMES[date.getDay()]} — ${label}`;
      cell.style.setProperty('--i', index);
      return cell;
    }));
  }

  function renderIdeas() {
    const existing = DS.get().routine.map(item => item.title.toLowerCase());
    const ideas = DS.ROUTINE_IDEAS.filter(idea => !existing.includes(idea.title.toLowerCase()));
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

  function renderList() {
    const items = DS.get().routine;
    $('routine-empty').hidden = items.length > 0;
    const todayKey = DS.dayKey();

    list.replaceChildren(...items.map(item => {
      const status = item.log[todayKey];
      const scheduled = DS.routineScheduledToday(item);
      const weekCount = weekDates().filter(date => item.log[DS.dayKey(date)] === 'done').length;
      const row = document.createElement('li');
      row.className = 'routine-item';
      row.dataset.id = item.id;
      if (item.paused) row.classList.add('is-paused');
      if (status === 'done') row.classList.add('is-done');
      if (status === 'skipped') row.classList.add('is-skipped');
      if (item.id === openId) row.classList.add('is-open');
      if (item.id === freshId) row.classList.add('is-fresh');

      const tick = document.createElement('button');
      tick.type = 'button';
      tick.className = 'routine-tick';
      tick.setAttribute('aria-pressed', String(status === 'done'));
      tick.setAttribute('aria-label', `Mark "${item.title}" as done today`);
      tick.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
      tick.disabled = item.paused || !scheduled;
      tick.addEventListener('click', () => {
        const nowDone = DS.get().routine.find(entry => entry.id === item.id)?.log[DS.dayKey()] !== 'done';
        DS.logRoutine(item.id, nowDone ? 'done' : null);
        render();
        if (nowDone) burst(list.querySelector(`[data-id="${item.id}"] .routine-tick`));
      });

      const body = document.createElement('button');
      body.type = 'button';
      body.className = 'routine-body';
      body.setAttribute('aria-expanded', String(item.id === openId));
      const state = item.paused ? '<span class="routine-tag">Paused</span>'
        : !scheduled ? '<span class="routine-tag is-quiet">Not today</span>'
          : status === 'skipped' ? '<span class="routine-tag is-skip">Skipped today</span>' : '';
      body.innerHTML = `<strong>${escape(item.title)}</strong>
        <span class="routine-meta"><span>${dayLabel(item.days)}</span><span aria-hidden="true">·</span><span>${weekCount} this week</span>${state}</span>`;
      body.addEventListener('click', () => { openId = openId === item.id ? null : item.id; render(); });

      const panel = document.createElement('div');
      panel.className = 'routine-panel';
      if (item.id === openId) {
        panel.innerHTML = `<p class="routine-panel-label">Repeat on</p>
          <div class="routine-day-picker" role="group" aria-label="Days for ${escape(item.title)}">${ORDER.map(day =>
            `<button type="button" class="routine-day-toggle" data-day="${day}" aria-pressed="${item.days.includes(day)}" aria-label="${DAY_NAMES[day]}">${DAY_LETTERS[day]}</button>`).join('')}</div>
          <div class="routine-panel-actions">
            ${scheduled && !item.paused ? `<button type="button" data-act="skip"><svg><use href="#i-minus"/></svg>${status === 'skipped' ? 'Undo skip' : 'Skip today'}</button>` : ''}
            <button type="button" data-act="pause"><svg><use href="#${item.paused ? 'i-play' : 'i-pause'}"/></svg>${item.paused ? 'Resume' : 'Pause'}</button>
            <button type="button" data-act="remove" class="is-danger"><svg><use href="#i-trash"/></svg>Remove</button>
          </div>`;
        panel.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => {
          const current = new Set(DS.get().routine.find(entry => entry.id === item.id).days);
          const day = Number(button.dataset.day);
          current.has(day) ? current.delete(day) : current.add(day);
          // Keep at least one day — an item scheduled on no day is just noise.
          if (!current.size) return;
          DS.updateRoutine(item.id, { days: [...current] });
          render();
        }));
        panel.querySelector('[data-act="skip"]')?.addEventListener('click', () => {
          DS.logRoutine(item.id, status === 'skipped' ? null : 'skipped');
          render();
        });
        panel.querySelector('[data-act="pause"]').addEventListener('click', () => {
          DS.updateRoutine(item.id, { paused: !item.paused });
          render();
        });
        panel.querySelector('[data-act="remove"]').addEventListener('click', () => remove(item));
      }

      row.append(tick, body, panel);
      return row;
    }));
    freshId = null;
  }

  function renderToday() {
    const items = DS.get().routine;
    const due = items.filter(item => DS.routineScheduledToday(item));
    const done = due.filter(item => DS.routineDoneToday(item)).length;
    $('routine-ring-count').textContent = `${done}/${due.length}`;
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
    window.dispatchEvent(new Event('deepsprout:routine'));
  };

  /* ------------------------------------------------------------- the actions */

  function add(title, hint = 'Your own.') {
    const clean = title.trim().replace(/\s+/g, ' ');
    if (!clean) { input.focus(); return; }
    if (DS.get().routine.some(item => item.title.toLowerCase() === clean.toLowerCase())) {
      input.value = '';
      flash('That one is already on your list.');
      return;
    }
    freshId = DS.addRoutine({ title: clean, hint });
    input.value = '';
    render();
  }

  function remove(item) {
    const snapshot = JSON.parse(JSON.stringify(DS.get().routine.find(entry => entry.id === item.id)));
    const index = DS.get().routine.findIndex(entry => entry.id === item.id);
    DS.removeRoutine(item.id);
    openId = null;
    render();
    flash(`Removed “${item.title}”.`, () => {
      DS.update(state => { state.routine.splice(index, 0, snapshot); });
      render();
    });
  }

  function flash(message, undo) {
    const bar = $('routine-undo');
    $('routine-undo-text').textContent = message;
    const button = $('routine-undo-button');
    button.hidden = !undo;
    button.onclick = () => { bar.hidden = true; undo?.(); };
    bar.hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { bar.hidden = true; }, 6000);
  }

  /** A small burst of leaves when something is ticked off. */
  function burst(target) {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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

  render();
})();
