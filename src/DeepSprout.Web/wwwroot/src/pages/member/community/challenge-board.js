/**
 * Community challenge dashboard (local demo, no backend).
 *
 * A challenge is a structured record in its own storage key, so the
 * community feed / Admin moderation writers never drop it. The board shows:
 * what the challenge is about, who is in it, a day-by-day timeline of
 * check-ins (a short note and an optional photo), and — once it ends — a
 * warm finish: everyone is recognised, the person with the most check-ins
 * "set the pace". Partner check-ins are sample entries for this demo.
 */
(() => {
  const KEY = 'deepsprout-community-challenges-v1';
  const ROOT = document.body.dataset.root || '../../../../';
  const art = name => `${ROOT}assets/community/${name}`;
  const PEOPLE = {
    me: { name: 'You', avatar: '' },
    sara: { name: 'Sara.M', avatar: art('avatar-sara.png') },
    omar: { name: 'Omar_97', avatar: art('avatar-omar.png') },
    lina: { name: 'Lina', avatar: art('avatar-lina.png') },
    yousef: { name: 'Yousef', avatar: art('avatar-yousef.png') }
  };
  const PHOTOS = ['post-recovery.png', 'post-offline.png', 'post-reading.png', 'post-win.png'].map(art);
  const NOTES = [
    'Done before breakfast. Easier than yesterday.',
    'Hard start, but I kept going. Went for a short walk instead.',
    'Read twelve pages with my coffee — no phone in sight.',
    'Left the phone in the other room. Felt calm.',
    'Missed the first ten minutes, then got back on track.',
    'Cooked with my sister instead of scrolling.',
    'Quiet morning. Wrote down three things for today.',
    'Short one today, but it counts.'
  ];
  const DAY = 864e5;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const local = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parse = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => parse(local(new Date()));
  const addDays = (key, n) => local(new Date(parse(key).getTime() + n * DAY));
  const short = key => parse(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  // Stable pseudo-random number in [0,1) for sample partner check-ins.
  const hash = text => { let h = 2166136261; for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };

  /* ---------------------------------------------------------- records */
  const load = () => { try { const data = JSON.parse(localStorage.getItem(KEY) || '{}'); return Array.isArray(data.challenges) ? data.challenges : []; } catch { return []; } };
  const save = list => localStorage.setItem(KEY, JSON.stringify({ challenges: list }));
  const sample = () => {
    const start = addDays(local(today()), -9);
    const mine = [[1, 0, 0], [2, 3, -1], [3, 2, 2], [5, 6, -1], [6, 4, 1], [7, 5, -1]];
    const sara = [[1, 3, 0], [2, 1, -1], [3, 6, -1], [4, 7, 3], [5, 0, -1], [6, 2, 1], [7, 4, 3]];
    const entry = (by, [day, note, photo]) => ({ by, day, note: NOTES[note], photo: photo >= 0 ? PHOTOS[photo] : '', at: addDays(start, day - 1) });
    return { id: 'sample-phone-free', sample: true, title: 'Phone-free mornings', goal: 'No phone for the first hour after waking — read, walk or make breakfast instead.', days: 7, who: 'With a partner', partners: ['sara'], start, checkins: [...mine.map(x => entry('me', x)), ...sara.map(x => entry('sara', x))] };
  };
  const all = () => [...load().slice().reverse(), sample()];
  const find = id => all().find(c => c.id === id);

  const state = ch => {
    const raw = Math.floor((today() - parse(ch.start)) / DAY) + 1;
    const finished = raw > ch.days;
    return { day: Math.min(Math.max(raw, 1), ch.days), finished, end: addDays(ch.start, ch.days - 1) };
  };
  // Sample partner check-ins for a user-made challenge, up to today.
  const partnerCheckins = ch => {
    if (ch.sample) return [];
    const { day, finished } = state(ch);
    const list = [];
    ch.partners.forEach(pid => {
      for (let d = 1; d <= day; d++) {
        const roll = hash(`${ch.id}:${pid}:${d}`);
        if (d === day && !finished ? roll < 0.5 : roll < 0.78) list.push({ by: pid, day: d, note: NOTES[Math.floor(hash(`${pid}${d}${ch.id}`) * NOTES.length)], photo: roll < 0.22 ? PHOTOS[Math.floor(roll * 100) % PHOTOS.length] : '', at: addDays(ch.start, d - 1), sample: true });
      }
    });
    return list;
  };
  const checkinsOf = ch => [...(ch.checkins || []), ...partnerCheckins(ch)];
  const members = ch => ['me', ...(ch.partners || [])];

  /* ---------------------------------------------------------- pieces */
  const avatar = (pid, size = '') => {
    const p = PEOPLE[pid] || PEOPLE.me;
    return p.avatar ? `<img class="cb-avatar ${size}" src="${p.avatar}" alt="">` : `<span class="cb-avatar is-you ${size}" aria-hidden="true">You</span>`;
  };
  const together = ch => members(ch).map(pid => PEOPLE[pid]?.name || 'Friend').join(' & ').replace(/^You & /, 'You & ');
  const statusText = ch => { const s = state(ch); return s.finished ? 'Finished together' : `Day ${s.day} of ${ch.days}`; };

  function finish(ch, counts) {
    const ranked = members(ch).map(pid => ({ pid, n: counts[pid] || 0 })).sort((a, b) => b.n - a.n);
    const total = ranked.reduce((n, r) => n + r.n, 0);
    const solo = ranked.length === 1;
    const top = ranked[0].n;
    const leaders = ranked.filter(r => r.n === top && top > 0);
    const allTied = !solo && leaders.length === ranked.length;
    const line = solo ? `You showed up on ${top} of ${ch.days} days.` : `${total} check-ins between you over ${ch.days} days.`;
    const cards = ranked.map(r => {
      const lead = !solo && !allTied && r.n === top && top > 0;
      const label = solo ? 'You finished' : allTied ? 'In step, all the way' : lead ? 'Set the pace' : 'Kept showing up';
      return `<li class="cb-honour${lead ? ' is-lead' : ''}">${avatar(r.pid, 'is-lg')}<span><small>${label}</small><strong>${esc(PEOPLE[r.pid]?.name)}</strong><em>${r.n} of ${ch.days} days</em></span>${lead ? '<svg class="cb-laurel" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-9M12 15C6 15 3 11 3 5c6 0 9 3 9 10Zm0-3c0-6 3-9 9-9 0 6-3 9-9 9Z"/></svg>' : ''}</li>`;
    }).join('');
    return `<section class="cb-finish" aria-labelledby="cb-finish-title"><p class="cb-eyebrow">The finish line</p><h3 id="cb-finish-title">${solo ? 'You did it.' : 'You finished together.'}</h3><p class="cb-muted">${line}</p><ul class="cb-honours">${cards}</ul></section>`;
  }

  function sideBySide(ch, counts, list) {
    const { day, finished } = state(ch);
    const upto = finished ? ch.days : day;
    return `<section class="cb-panel" aria-labelledby="cb-side-title"><h3 id="cb-side-title">Side by side</h3><ul class="cb-people">${members(ch).map(pid => {
      const days = new Set(list.filter(c => c.by === pid).map(c => c.day));
      return `<li>${avatar(pid)}<div><strong>${esc(PEOPLE[pid]?.name)}</strong><span class="cb-dots" aria-label="${days.size} of ${upto} days so far">${Array.from({ length: ch.days }, (_, i) => `<i class="${days.has(i + 1) ? 'is-on' : i + 1 > upto ? 'is-ahead' : ''}"></i>`).join('')}</span></div><b>${counts[pid] || 0}</b></li>`;
    }).join('')}</ul></section>`;
  }

  function composer(ch, mineToday) {
    if (mineToday) return `<div class="cb-done-today"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>You checked in today. See you tomorrow.</div>`;
    return `<form class="cb-compose" data-checkin="${esc(ch.id)}"><label class="cb-label" for="cb-note">How did today go?</label><textarea id="cb-note" name="note" rows="3" maxlength="280" placeholder="A sentence is enough — what did you do instead?"></textarea><div class="cb-photo-preview" hidden><button type="button" data-photo-clear aria-label="Remove photo">×</button></div><div class="cb-compose-row"><label class="cb-attach"><input type="file" name="photo" accept="image/*" class="sr-only"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>Add a photo</label><button class="cb-checkin" type="submit">Check in for today</button></div><p class="cb-error" role="alert" hidden></p></form>`;
  }

  function timeline(ch, list) {
    const { day, finished, end } = state(ch);
    const last = finished ? ch.days : day;
    const days = [];
    if (!finished) days.push(`<li class="cb-day is-goal"><span class="cb-node" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 21V4m0 0h11l-2 4 2 4H5"/></svg></span><div class="cb-day-head"><strong>Finish line</strong><time>Day ${ch.days} · ${short(end)}</time></div><p class="cb-muted">${ch.days - day} ${ch.days - day === 1 ? 'day' : 'days'} to go.</p></li>`);
    for (let d = last; d >= 1; d--) {
      const entries = list.filter(c => c.day === d).sort((a, b) => (a.by === 'me' ? -1 : b.by === 'me' ? 1 : 0));
      const isToday = !finished && d === day;
      const body = entries.map(c => `<article class="cb-entry">${avatar(c.by, 'is-sm')}<div><p><strong>${esc(PEOPLE[c.by]?.name)}</strong> ${esc(c.note)}</p>${c.photo ? `<button type="button" class="cb-photo" aria-label="Enlarge photo from ${esc(PEOPLE[c.by]?.name)}"><img src="${esc(c.photo)}" alt="Check-in photo from ${esc(PEOPLE[c.by]?.name)}, day ${d}" loading="lazy"></button>` : ''}</div></article>`).join('');
      days.push(`<li class="cb-day${isToday ? ' is-today' : ''}${entries.length ? ' has-entries' : ''}" style="--i:${Math.min(last - d, 8)}"><span class="cb-node" aria-hidden="true">${d}</span><div class="cb-day-head"><strong>${isToday ? 'Today' : `Day ${d}`}</strong><time>${short(addDays(ch.start, d - 1))}</time></div>${isToday ? composer(ch, entries.some(c => c.by === 'me')) : ''}${body || (isToday ? '' : '<p class="cb-muted cb-rest">A quiet day.</p>')}</li>`);
    }
    return `<section class="cb-timeline-wrap" aria-labelledby="cb-timeline-title"><h3 id="cb-timeline-title">Timeline</h3><ol class="cb-timeline">${days.join('')}</ol></section>`;
  }

  /* ---------------------------------------------------------- the board */
  const dialog = document.createElement('dialog');
  dialog.id = 'challenge-board';
  dialog.className = 'cb';
  dialog.setAttribute('aria-labelledby', 'cb-title');
  document.body.append(dialog);
  let pendingPhoto = '';

  function render(id, keepScroll = false) {
    const ch = find(id);
    if (!ch) return;
    const list = checkinsOf(ch);
    const counts = {};
    new Set(list.map(c => `${c.by}:${c.day}`)).forEach(k => { const pid = k.split(':')[0]; counts[pid] = (counts[pid] || 0) + 1; });
    const s = state(ch);
    const progress = Math.round(((s.finished ? ch.days : s.day) / ch.days) * 100);
    const scroll = keepScroll ? ['.cb-sheet', '.cb-body'].map(s => dialog.querySelector(s)?.scrollTop || 0) : [0, 0];
    dialog.dataset.id = ch.id;
    dialog.innerHTML = `<div class="cb-sheet">
      <header class="cb-head">
        <button type="button" class="cb-close" data-cb-close aria-label="Close challenge">×</button>
        <p class="cb-eyebrow">${ch.sample ? 'Sample challenge · ' : ''}${ch.days}-day challenge</p>
        <h2 id="cb-title">${esc(ch.title)}</h2>
        <p class="cb-about"><span>What it’s about</span>${esc(ch.goal)}</p>
        <div class="cb-meta"><span class="cb-stack">${members(ch).map(pid => avatar(pid)).join('')}</span><span><strong>${esc(together(ch))}</strong><small>${short(ch.start)} – ${short(s.end)}</small></span><span class="cb-status${s.finished ? ' is-done' : ''}">${statusText(ch)}</span></div>
        <div class="cb-track" role="img" aria-label="${s.finished ? 'All' : s.day} of ${ch.days} days reached">${Array.from({ length: ch.days }, (_, i) => `<i class="${i < (s.finished ? ch.days : s.day) ? 'is-on' : ''}${!s.finished && i + 1 === s.day ? ' is-now' : ''}" style="--i:${i}"></i>`).join('')}</div>
      </header>
      <div class="cb-body">
        <div class="cb-aside">${s.finished ? finish(ch, counts) : ''}${sideBySide(ch, counts, list)}${!ch.sample ? `<p class="cb-note">Saved on this device. The challenge post appears in the community feed after Admin approval.${ch.partners?.length ? ' Partner check-ins are sample entries in this demo.' : ''}</p>` : ''}${ch.sample ? '<p class="cb-note">A finished sample, so you can see how the end looks.</p>' : ''}</div>
        ${timeline(ch, list)}
      </div>
    </div>`;
    dialog.style.setProperty('--progress', `${progress}%`);
    if (keepScroll) ['.cb-sheet', '.cb-body'].forEach((s, i) => { dialog.querySelector(s).scrollTop = scroll[i]; });
    pendingPhoto = '';
  }

  function open(id) {
    render(id);
    if (!dialog.open) dialog.showModal();
    dialog.classList.toggle('is-calm', reduced());
    dialog.querySelector('.cb-close')?.focus();
  }
  const close = () => { dialog.classList.add('is-closing'); setTimeout(() => { dialog.classList.remove('is-closing'); dialog.close(); }, reduced() ? 0 : 180); };

  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.closest('[data-cb-close]')) return close();
    const photo = event.target.closest('.cb-photo');
    if (photo) photo.classList.toggle('is-open');
    if (event.target.closest('[data-photo-clear]')) {
      pendingPhoto = '';
      const form = event.target.closest('form');
      form.querySelector('.cb-photo-preview').hidden = true;
      form.querySelector('[name="photo"]').value = '';
    }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });

  // Photos are shrunk on this device before they are saved.
  const shrink = file => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * k); canvas.height = Math.round(img.height * k);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be opened as a photo.')); };
    img.src = url;
  });
  const showError = (form, message) => { const node = form.querySelector('.cb-error'); node.textContent = message; node.hidden = !message; };

  dialog.addEventListener('change', async event => {
    if (event.target.name !== 'photo') return;
    const form = event.target.closest('form');
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      pendingPhoto = await shrink(file);
      const preview = form.querySelector('.cb-photo-preview');
      let img = preview.querySelector('img');
      if (!img) { img = document.createElement('img'); img.alt = 'Your photo for today'; preview.prepend(img); }
      img.src = pendingPhoto;
      preview.hidden = false;
      showError(form, '');
    } catch (error) { pendingPhoto = ''; showError(form, error.message); }
  });

  dialog.addEventListener('submit', event => {
    const form = event.target.closest('[data-checkin]');
    if (!form) return;
    event.preventDefault();
    const note = form.querySelector('[name="note"]').value.trim();
    if (!note && !pendingPhoto) { showError(form, 'Write a line or add a photo to check in.'); form.querySelector('textarea').focus(); return; }
    const list = load();
    const record = list.find(c => c.id === form.dataset.checkin);
    if (!record) return;
    const { day } = state(record);
    if ((record.checkins || []).some(c => c.by === 'me' && c.day === day)) return render(record.id, true);
    record.checkins = [...(record.checkins || []), { by: 'me', day, note: note || 'Checked in with a photo.', photo: pendingPhoto, at: local(today()) }];
    try { save(list); }
    catch {
      showError(form, pendingPhoto ? 'This photo is too large to keep on this device. Try a smaller one, or check in without it.' : 'Your check-in could not be saved. Please try again.');
      return;
    }
    render(record.id, true);
    dialog.querySelector('.cb-day.is-today')?.classList.add('just-checked');
    paintList();
    window.dispatchEvent(new CustomEvent('deepsprout:challenge-checkin'));
  });

  /* ---------------------------------------------------------- sidebar list */
  function paintList() {
    const host = document.querySelector('#my-challenge-list');
    if (!host) return;
    host.innerHTML = all().map(ch => {
      const s = state(ch);
      const mineToday = !s.finished && (ch.checkins || []).some(c => c.by === 'me' && c.day === s.day);
      return `<li><button type="button" class="my-challenge" data-open-challenge="${esc(ch.id)}"><span class="cb-stack is-sm">${members(ch).map(pid => avatar(pid, 'is-sm')).join('')}</span><span class="my-challenge-copy"><strong>${esc(ch.title)}</strong><small>${s.finished ? 'Finished together' : `Day ${s.day} of ${ch.days}`}${ch.sample ? ' · sample' : ''}${!s.finished && !mineToday ? ' · check in today' : ''}</small></span><span class="my-challenge-ring" style="--p:${Math.round(((s.finished ? ch.days : s.day) / ch.days) * 100)}" aria-hidden="true"></span><span class="my-challenge-open">Open</span></button></li>`;
    }).join('');
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-challenge]');
    if (trigger) open(trigger.dataset.openChallenge);
  });

  /* ---------------------------------------------------------- API for community.js */
  window.DeepSproutChallenges = {
    people: PEOPLE,
    /** Saves a new challenge and returns its id; throws when storage is full. */
    add({ title, goal, days, who, partners }) {
      const list = load();
      const record = { id: `ch-${Date.now()}`, title, goal, days: Number(days) || 7, who, partners: who === 'Just me' ? [] : partners, start: local(today()), checkins: [], created: new Date().toISOString() };
      list.push(record);
      save(list);
      paintList();
      return record.id;
    },
    open,
    exists: id => Boolean(find(id))
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintList, { once: true }); else paintList();
  window.addEventListener('storage', event => { if (event.key === KEY) paintList(); });
})();
