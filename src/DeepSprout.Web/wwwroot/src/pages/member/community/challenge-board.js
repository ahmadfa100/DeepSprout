/** Two-person, browser-local quiz rooms. No server or cross-device transport exists yet. */
(() => {
  const KEY = 'deepsprout-community-quiz-rooms-v2';
  const QUESTIONS = [
    { text: 'Which small change can make a focused reading session easier to start?', options: ['Keep every notification on', 'Choose a specific page goal', 'Switch between several apps', 'Wait until you feel perfectly ready'], answer: 1 },
    { text: 'What is a practical way to make a short break feel restorative?', options: ['Open an endless feed', 'Check every new alert', 'Take a brief walk away from the screen', 'Start several videos at once'], answer: 2 },
    { text: 'You want to avoid a distracting app during study. What helps most?', options: ['Put the phone out of reach', 'Leave the app open', 'Keep refreshing the feed', 'Turn up notification sounds'], answer: 0 },
    { text: 'What is a clear, achievable goal for a focus session?', options: ['Be productive all day', 'Never get distracted again', 'Finish one chosen page or task', 'Do everything at once'], answer: 2 },
    { text: 'After a distraction, what is a useful next step?', options: ['Give up on the session', 'Notice it and return to the chosen task', 'Scroll until tomorrow', 'Open more tabs'], answer: 1 }
  ];
  const QUESTION_MS = 15000;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const identity = () => {
    const person = window.DeepSproutPersonal?.person();
    return { id: person?.id || 'preview', name: person?.name || 'You' };
  };
  const read = () => {
    try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const write = rooms => {
    window.DeepSproutPersonal?.assert(window.DeepSproutPersonal.subject());
    localStorage.setItem(KEY, JSON.stringify(rooms));
    renderFeed();
    window.dispatchEvent(new Event('deepsprout:challenge-change'));
  };
  const formatStart = value => new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
  const formatShort = value => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  const remaining = start => {
    const diff = Math.max(0, new Date(start).getTime() - Date.now());
    if (!diff) return 'Starting time has arrived';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.ceil((diff % 3600000) / 60000);
    return days ? `Starts in ${days} ${days === 1 ? 'day' : 'days'}${hours ? `, ${hours} hr` : ''}` : hours ? `Starts in ${hours} hr ${minutes} min` : `Starts in ${minutes} min`;
  };
  const member = room => room.players.find(player => player.id === identity().id);
  const status = room => room.players.every(player => player.finishedAt) ? 'Finished' : room.players.length < 2 ? 'One seat open' : Date.now() < new Date(room.startAt).getTime() ? 'Ready to begin' : 'Round open';

  const host = document.createElement('div');
  host.id = 'challenge-feed';
  host.className = 'challenge-feed';
  document.querySelector('#feed')?.prepend(host);
  function renderFeed() {
    host.innerHTML = read().slice().reverse().map(room => {
      const mine = member(room);
      const label = mine ? 'Open room' : room.players.length < 2 ? 'Join room' : 'Room full';
      return `<article class="challenge-room-card" data-id="${esc(room.id)}" data-category="challenges" data-search="${esc(`${room.title} ${room.players.map(p => p.name).join(' ')} challenge quiz`)}">
        <div class="challenge-room-top"><span class="challenge-room-kicker"><i aria-hidden="true"></i> THE CHALLENGE ROOM</span><span class="challenge-room-status">${status(room)}</span></div>
        <h2>${esc(room.title)}</h2><p class="challenge-room-time"><svg aria-hidden="true"><use href="#icon-calendar"/></svg>${esc(formatShort(room.startAt))}</p>
        <div class="challenge-room-foot"><span class="challenge-room-seats"><svg aria-hidden="true"><use href="#icon-people"/></svg>${room.players.length} / 2 seats</span><button type="button" data-open-challenge="${esc(room.id)}" ${!mine && room.players.length === 2 ? 'disabled' : ''}>${label}<svg aria-hidden="true"><use href="#icon-arrow"/></svg></button></div>
      </article>`;
    }).join('');
  }

  const dialog = document.createElement('dialog');
  dialog.id = 'challenge-board';
  dialog.className = 'cr-dialog';
  dialog.setAttribute('aria-labelledby', 'cr-title');
  document.body.append(dialog);
  let openId = null;
  let timer = null;
  const get = id => read().find(room => room.id === id);
  const note = '<p class="cr-local-note">Rooms and results are saved on this browser only. Live play and notifications across devices need a connected service.</p>';
  const close = () => { clearInterval(timer); timer = null; openId = null; dialog.close(); };
  const action = (name, label, extra = '') => `<button type="button" class="cr-action" data-cr-action="${name}" ${extra}>${label}<svg aria-hidden="true"><use href="#icon-arrow"/></svg></button>`;

  function lobby(room, player) {
    const canJoin = !player && room.players.length < 2;
    const due = Date.now() >= new Date(room.startAt).getTime();
    return `<div class="cr-lobby"><div class="cr-clock"><span class="cr-clock-orbit" aria-hidden="true"></span><small>${due ? 'SCHEDULED TIME' : 'COUNTING DOWN'}</small><strong>${esc(remaining(room.startAt))}</strong><time datetime="${esc(room.startAt)}">${esc(formatStart(room.startAt))}</time></div>
      <div class="cr-lobby-side"><p class="cr-label">THE ROOM</p><div class="cr-seats"><span class="cr-seat is-taken"><b>01</b><strong>${esc(room.players[0].name)}</strong><small>Creator</small></span><span class="cr-seat ${room.players[1] ? 'is-taken' : ''}"><b>02</b><strong>${esc(room.players[1]?.name || 'Open seat')}</strong><small>${room.players[1] ? 'Joined' : 'Waiting for a player'}</small></span></div>
      <p class="cr-lobby-copy">Five questions. Four choices each. Correct answers earn points; quicker answers earn more.</p>
      ${canJoin ? action('join', 'Join this challenge') : player && room.players.length === 2 && due ? action('begin', player.questionStartedAt || player.answers.length ? 'Continue round' : 'Enter the challenge') : `<p class="cr-wait">${!player ? 'This room is full.' : room.players.length < 2 ? 'Waiting for one more person to join.' : 'Both players are in. The round opens at the scheduled time.'}</p>`}</div></div>${note}`;
  }
  function question(room, player) {
    const index = player.answers.length;
    const question = QUESTIONS[index];
    const answered = player.questionStartedAt && player.pendingChoice !== undefined;
    const left = Math.max(0, Math.ceil((QUESTION_MS - (Date.now() - new Date(player.questionStartedAt).getTime())) / 1000));
    return `<div class="cr-game"><div class="cr-progress"><span>QUESTION ${index + 1} / ${QUESTIONS.length}</span><span>${player.answers.reduce((total, item) => total + item.points, 0).toLocaleString()} POINTS</span></div><div class="cr-progress-track"><i style="--progress:${(index / QUESTIONS.length) * 100}%"></i></div>
      <div class="cr-question-stage"><div class="cr-question-top"><span class="cr-question-number">0${index + 1}</span><span class="cr-timer" aria-live="off">${answered ? 'Answered' : `${left}s left`}</span></div><h3>${esc(question.text)}</h3></div>
      <div class="cr-options">${question.options.map((option, choice) => `<button type="button" class="cr-option cr-option-${choice}${answered ? choice === question.answer ? ' is-correct' : choice === player.pendingChoice ? ' is-wrong' : '' : ''}" data-cr-choice="${choice}" ${answered ? 'disabled' : ''}><b>${['A', 'B', 'C', 'D'][choice]}</b><span>${esc(option)}</span></button>`).join('')}</div>
      ${answered ? `<div class="cr-answer-feedback" role="status"><strong>${player.pendingChoice === question.answer ? 'Correct answer.' : 'The correct answer is highlighted.'}</strong>${action('next', index === QUESTIONS.length - 1 ? 'See the finish' : 'Next question')}</div>` : '<p class="cr-answer-help">Choose an answer before the timer runs out.</p>'}</div>${note}`;
  }
  function finish(room, player) {
    const me = room.players.find(p => p.id === player.id);
    const other = room.players.find(p => p.id !== player.id);
    const score = p => p.answers.reduce((total, answer) => total + answer.points, 0);
    const both = room.players.every(p => p.finishedAt);
    const result = both ? score(me) === score(other) ? 'A tie — well played.' : score(me) > score(other) ? 'You won this round.' : `${other.name} won this round.` : 'Your round is complete.';
    return `<div class="cr-finish"><div class="cr-finish-mark" aria-hidden="true">✦</div><p class="cr-label">ROUND COMPLETE</p><h3>${esc(result)}</h3><p>${both ? 'The winner is decided by correct answers and response time.' : 'Waiting for the other player to finish. Their score appears here when they do.'}</p><div class="cr-scoreboard">${room.players.map(p => `<div class="cr-score${p.id === player.id ? ' is-me' : ''}"><span>${esc(p.name)}${p.id === player.id ? ' · you' : ''}</span><strong>${p.finishedAt ? score(p).toLocaleString() : 'Playing'}</strong></div>`).join('')}</div><p class="cr-score-note">Correct answer: 1,000 points + up to 500 speed points. Incorrect or timed out: 0.</p></div>${note}`;
  }
  function render() {
    const room = get(openId);
    if (!room) return close();
    const player = member(room);
    const playing = player && !player.finishedAt && player.questionStartedAt;
    dialog.innerHTML = `<div class="cr-shell"><header class="cr-header"><div><p class="cr-label">DEEPSPROUT / COMMUNITY CHALLENGE</p><h2 id="cr-title">${esc(room.title)}</h2></div><button type="button" class="cr-close" data-cr-action="close" aria-label="Close challenge">×</button></header>${player?.finishedAt ? finish(room, player) : playing ? question(room, player) : lobby(room, player)}</div>`;
    clearInterval(timer);
    timer = setInterval(() => {
      if (!dialog.open) return;
      const current = get(openId);
      const active = current && member(current);
      if (!current) return close();
      if (active?.questionStartedAt && active.pendingChoice === undefined && !active.finishedAt) {
        const left = Math.max(0, Math.ceil((QUESTION_MS - (Date.now() - new Date(active.questionStartedAt).getTime())) / 1000));
        const clock = dialog.querySelector('.cr-timer'); if (clock) clock.textContent = `${left}s left`;
        if (!left) answer(null);
      } else if (!active?.questionStartedAt && !active?.finishedAt) {
        const clock = dialog.querySelector('.cr-clock strong'); if (clock) clock.textContent = remaining(current.startAt);
        if (Date.now() >= new Date(current.startAt).getTime() && current.players.length === 2 && active && !dialog.querySelector('[data-cr-action="begin"]')) render();
      }
    }, 500);
  }
  function open(id) { if (!get(id)) return; openId = id; render(); if (!dialog.open) dialog.showModal(); }
  function mutatePlayer(change) {
    const rooms = read(); const room = rooms.find(item => item.id === openId); const player = room?.players.find(item => item.id === identity().id);
    if (!room || !player) return;
    change(room, player);
    write(rooms); render();
  }
  function answer(choice) {
    mutatePlayer((_room, player) => {
      if (!player.questionStartedAt || player.pendingChoice !== undefined || player.finishedAt) return;
      const index = player.answers.length;
      const elapsed = Math.min(QUESTION_MS, Math.max(0, Date.now() - new Date(player.questionStartedAt).getTime()));
      player.pendingChoice = choice;
      player.pendingMs = elapsed;
      player.pendingPoints = choice === QUESTIONS[index].answer ? 1000 + Math.round(500 * (1 - elapsed / QUESTION_MS)) : 0;
    });
  }
  dialog.addEventListener('click', event => {
    if (event.target === dialog) { close(); return; }
    const choice = event.target.closest('[data-cr-choice]');
    if (choice) { answer(Number(choice.dataset.crChoice)); return; }
    const actionName = event.target.closest('[data-cr-action]')?.dataset.crAction;
    if (actionName === 'close') close();
    if (actionName === 'join') {
      const rooms = read(); const room = rooms.find(item => item.id === openId); const person = identity();
      if (!room || room.players.length >= 2 || room.players.some(p => p.id === person.id)) return render();
      room.players.push({ ...person, answers: [], questionStartedAt: null, finishedAt: null });
      try { write(rooms); render(); window.dispatchEvent(new CustomEvent('deepsprout:challenge-joined', { detail: { title: room.title, startAt: room.startAt } })); }
      catch { showError('Could not join this room. Check browser storage and try again.'); }
    }
    if (actionName === 'begin') mutatePlayer((room, player) => {
      if (room.players.length !== 2 || Date.now() < new Date(room.startAt).getTime()) return;
      if (!player.questionStartedAt) player.questionStartedAt = new Date().toISOString();
    });
    if (actionName === 'next') mutatePlayer((_room, player) => {
      if (player.pendingChoice === undefined) return;
      player.answers.push({ choice: player.pendingChoice, ms: player.pendingMs, points: player.pendingPoints });
      delete player.pendingChoice; delete player.pendingMs; delete player.pendingPoints;
      if (player.answers.length === QUESTIONS.length) { player.finishedAt = new Date().toISOString(); player.questionStartedAt = null; }
      else player.questionStartedAt = new Date().toISOString();
    });
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  const showError = message => { let line = dialog.querySelector('.cr-error'); if (!line) { line = document.createElement('p'); line.className = 'cr-error'; line.setAttribute('role', 'alert'); dialog.querySelector('.cr-shell')?.append(line); } line.textContent = message; };
  document.addEventListener('click', event => { const button = event.target.closest('[data-open-challenge]'); if (button) open(button.dataset.openChallenge); });
  window.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    try {
      const previous = JSON.parse(event.oldValue || '[]');
      const joined = read().find(room => room.players.length === 2 && previous.find(old => old.id === room.id)?.players.length === 1 && room.players.some(player => player.id === identity().id));
      if (joined) window.dispatchEvent(new CustomEvent('deepsprout:challenge-joined', { detail: { title: joined.title, startAt: joined.startAt } }));
    } catch { /* The room still refreshes if an older browser value is malformed. */ }
    const room = openId && get(openId);
    if (room && dialog.open) render();
    renderFeed();
    window.dispatchEvent(new Event('deepsprout:challenge-change'));
  });
  window.DeepSproutChallenges = {
    add({ title, startAt }) {
      const start = new Date(startAt);
      if (!title?.trim() || Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) throw new Error('Choose a future start time.');
      const rooms = read();
      const id = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      rooms.push({ id, title: title.trim(), startAt: start.toISOString(), createdAt: new Date().toISOString(), players: [{ ...identity(), answers: [], questionStartedAt: null, finishedAt: null }] });
      write(rooms); return id;
    },
    open,
    exists: id => Boolean(get(id)),
    formatStart
  };
  renderFeed();
})();
