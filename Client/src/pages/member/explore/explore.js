/**
 * Explore — listings from the platform catalogue, registrations on the account.
 *
 * Honest throughout: registering for an initiative does NOT book its
 * sessions; attending is not completing; a full listing offers the waiting
 * list instead of pretending there is room. Every place count and date is
 * computed by DeepSproutAccount.
 *
 * Motion (transform and opacity only, all off under reduced motion):
 *  - a three-layer hero moving at different speeds on scroll
 *  - cards entering, staggered, as they reach the viewport
 *  - the grid animating between filter states (FLIP via the Web Animations API)
 *  - the detail sheet growing out of the card that opened it
 */
(() => {
  const Account = window.DeepSproutAccount;
  if (!Account) return;
  const fmt = Account.format;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  const media = query => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const reduced = () => media('(prefers-reduced-motion: reduce)');
  const root = document.body.dataset.root || '../../../../';
  const KIND_ICON = { initiative: 'i-flag', session: 'i-calendar', experience: 'i-tent', competition: 'i-trophy' };
  const STATUS = {
    confirmed: { label: 'Confirmed', icon: 'i-check' },
    pending: { label: 'Pending', icon: 'i-hourglass' },
    waitlisted: { label: 'Waitlisted', icon: 'i-clock' },
    cancelled: { label: 'Cancelled', icon: 'i-x' }
  };

  // Live Institution records, read through the shared bridge (never copied).
  const Repo = () => window.DeepSproutRepo || null;
  const APP_STATUS = {
    Pending: { label: 'Pending review', icon: 'i-hourglass', tone: 'pending' },
    Accepted: { label: 'Accepted', icon: 'i-check', tone: 'confirmed' },
    Queued: { label: 'Waiting list', icon: 'i-clock', tone: 'waitlisted' },
    Offered: { label: 'Seat offered', icon: 'i-ticket', tone: 'offered' },
    Suspended: { label: 'Suspended', icon: 'i-info', tone: 'warning' },
    Rejected: { label: 'Not accepted', icon: 'i-x', tone: 'cancelled' },
    Removed: { label: 'Removed', icon: 'i-x', tone: 'cancelled' },
    Blocked: { label: 'Blocked', icon: 'i-x', tone: 'cancelled' },
    Withdrawn: { label: 'Withdrawn', icon: 'i-x', tone: 'cancelled' },
    Declined: { label: 'Offer declined', icon: 'i-x', tone: 'cancelled' },
    Expired: { label: 'Offer expired', icon: 'i-clock', tone: 'cancelled' },
    Completed: { label: 'Completed', icon: 'i-check', tone: 'complete' },
    Closed: { label: 'Closed', icon: 'i-x', tone: 'cancelled' }
  };
  const appChip = status => { const s = APP_STATUS[status] || { label: status, icon: 'i-info', tone: 'pending' }; return `<span class="ex-status" data-status="${s.tone}">${icon(s.icon)}${esc(s.label)}</span>`; };
  const liveById = id => {
    const repo = Repo();
    if (!repo) return null;
    const card = repo.selectors.exploreInitiatives(repo.read(), repo.me()?.id).find(item => item.id === id)
      || repo.selectors.myInitiatives(repo.read(), repo.me()?.id).map(entry => entry.initiative).find(item => item.id === id);
    return card ? toItem(card) : null;
  };
  function toItem(card) {
    const start = Account.parse(card.start); const end = Account.parse(card.end);
    return {
      ...card, start, end, startDate: card.start, endDate: card.end, startTime: card.sessions[0]?.time || '',
      city: card.organizerCity, listing: 'live', eligibility: `${card.audience}${card.minAge || card.maxAge ? ` · ages ${card.minAge || 0}–${card.maxAge || 'any'}` : ''}`,
      remaining: card.seatsLeft, past: false,
      objectives: card.objective ? [card.objective] : [], commitment: card.policies.completion || card.withdrawal || ''
    };
  }
  const liveItems = () => { const repo = Repo(); if (!repo) return []; return repo.selectors.exploreInitiatives(repo.read(), repo.me()?.id).map(toItem); };
  const countdown = iso => { const ms = Date.parse(iso) - (Repo()?.nowMs() || Date.now()); if (ms <= 0) return 'expired'; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return h ? `${h} h ${m} min left` : `${m} min left`; };
  const qrSvg = code => { try { const qr = window.qrcode(0, 'M'); qr.addData(code); qr.make(); return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch { return ''; } };

  let account = null;
  const filters = { kind: 'all', mode: 'all' };

  /* -------------------------------------------------------------- helpers */

  const when = item => {
    const sameDay = item.startDate === item.endDate;
    if (item.kind === 'initiative' || item.kind === 'competition' || !sameDay) {
      return `${fmt.date(item.start)} – ${fmt.date(item.end, { year: true })}`;
    }
    return `${fmt.date(item.start, { weekday: true, year: true })} · ${item.startTime}`;
  };
  const where = item => (item.mode === 'online' ? 'Online'
    : item.mode === 'hybrid' ? `${item.city} or online` : item.venue);
  const places = item => {
    if (item.capacity === null) return { text: 'Open — no limit on places', full: false };
    if (item.full) return { text: 'Full — waiting list open', full: true };
    return { text: `${item.remaining} of ${item.capacity} places left`, full: false };
  };
  // Live listings come from a verified Institution's published record. Fixture
  // listings are static preview samples and say so, whatever organiser they name.
  const trust = item => (item.listing === 'live'
    ? `<span class="ex-trust is-verified is-live" title="Published by an Institution verified by DeepSprout">${icon('i-shield-check')}Verified institution</span>`
    : '<span class="ex-trust is-demo" title="Static sample listing in this preview — not a live record">Sample listing</span>');
  const statusChip = status => `<span class="ex-status" data-status="${status}">${icon(STATUS[status].icon)}${STATUS[status].label}</span>`;
  const reference = (item, on) => {
    let hash = 0;
    for (const char of `${item.id}|${account.id}|${on}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return `DS-${hash.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
  };

  /* ------------------------------------------------------------- the grid */

  const grid = $('ex-grid');
  let cards = new Map();

  function cardHtml(item) {
    const place = item.listing === 'live' ? livePlaces(item) : places(item);
    const mine = item.listing === 'live' ? null : item.mine;
    return `${item.image ? `<div class="ex-card-media"><img src="${root}${item.image}" alt="${esc(item.imageAlt || '')}" loading="lazy"></div>` : ''}
      <div class="ex-card-band"><span class="ex-kind">${icon(KIND_ICON[item.kind])}${esc(item.kindLabel)}</span>${trust(item)}</div>
      <div class="ex-card-body">
        <h3>${esc(item.title)}</h3>
        <p class="ex-organiser">Run by ${esc(item.organizer)}</p>
        <ul class="ex-facts">
          <li>${icon('i-calendar')}<span>${esc(when(item))}</span></li>
          <li>${icon(item.mode === 'online' ? 'i-globe' : item.mode === 'hybrid' ? 'i-compass' : 'i-pin')}<span>${esc(where(item))}</span></li>
          <li>${icon('i-users')}<span class="ex-places${place.full ? ' is-full' : ''}">${esc(place.text)}</span></li>
        </ul>
        <p class="ex-reveal">${esc(item.summary)}</p>
        <div class="ex-card-foot">
          <button type="button" class="ex-card-link" data-open="${item.id}" aria-label="${esc(`View ${item.title}`)}">View details ${icon('i-arrow')}</button>
          ${mine ? statusChip(mine.status) : ''}${item.listing === 'live' && item.mine ? appChip(item.mine.status) : ''}
        </div>
      </div>`;
  }

  function livePlaces(item) {
    if (item.registration !== 'Open') return { text: item.registration === 'Opens soon' ? `Applications open ${fmt.date(Account.parse(item.registrationOpen))}` : 'Applications closed', full: false };
    if (item.full) return { text: item.waitlist ? `All ${item.capacity} seats taken — waiting list open` : 'All seats taken', full: true };
    return { text: `${item.seatsLeft} of ${item.capacity} student seats left`, full: false };
  }

  function renderGrid() {
    const items = [...liveItems(), ...account.listings().filter(item => !item.past)];
    const seen = new Set();
    items.forEach((item, index) => {
      let card = cards.get(item.id);
      if (!card) {
        card = document.createElement('article');
        card.className = 'ex-card';
        card.dataset.id = item.id;
        card.style.setProperty('--delay', `${(index % 3) * 90}ms`);
        grid.append(card);
        cards.set(item.id, card);
        observeCard(card);
      }
      card.dataset.kind = item.kind;
      card.dataset.mode = item.mode;
      card.innerHTML = cardHtml(item);
      seen.add(item.id);
    });
    cards.forEach((card, id) => { if (!seen.has(id)) { card.remove(); cards.delete(id); } });
    applyFilters(false);
    const registered = account.allRegistrations().filter(entry => entry.status !== 'cancelled').length;
    const live = items.filter(item => item.listing === 'live').length;
    $('ex-hero-meta').innerHTML = `<span>${icon('i-compass')}${items.length} listings</span><span>${icon('i-shield-check')}${live} live from verified institutions</span>${registered ? `<span>${icon('i-check')}${registered} you’re registered for</span>` : ''}`;
  }

  const matches = card => (filters.kind === 'all' || card.dataset.kind === filters.kind)
    && (filters.mode === 'all' || card.dataset.mode === filters.mode);

  /** Show the cards that match; animate the change (FLIP) unless motion is reduced. */
  function applyFilters(animate = true) {
    const all = [...cards.values()];
    const before = new Map(all.filter(card => !card.hidden).map(card => [card, card.getBoundingClientRect()]));
    const leaving = all.filter(card => !card.hidden && !matches(card));
    const entering = all.filter(card => card.hidden && matches(card));
    const finish = () => {
      all.forEach(card => { card.hidden = !matches(card); });
      const shown = all.filter(card => !card.hidden);
      $('ex-count').textContent = `${shown.length} ${shown.length === 1 ? 'listing' : 'listings'}${filters.kind !== 'all' || filters.mode !== 'all' ? ' match these filters' : ''}`;
      const empty = $('ex-empty');
      empty.hidden = shown.length > 0;
      if (!shown.length) {
        const kind = filters.kind === 'all' ? 'listings' : `${filters.kind}s`;
        const mode = filters.mode === 'all' ? '' : ` ${{ online: 'online', 'in-person': 'in person', hybrid: 'in a hybrid format' }[filters.mode]}`;
        $('ex-empty-text').textContent = `No ${kind}${mode} right now. Nothing is shown in their place.`;
      }
      if (!animate || reduced()) return;
      shown.forEach(card => {
        const first = before.get(card);
        const last = card.getBoundingClientRect();
        if (first) {
          const dx = first.left - last.left; const dy = first.top - last.top;
          if (dx || dy) card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
        } else {
          card.animate([{ opacity: 0, transform: 'scale(.94) translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 80 + entering.indexOf(card) * 50, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        }
      });
    };
    if (!animate || reduced() || !leaving.length) { finish(); return; }
    Promise.all(leaving.map(card => card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 180, easing: 'ease-in' }).finished))
      .then(finish, finish);
  }

  const setFilter = (group, value) => {
    filters[group] = value;
    document.querySelectorAll(`[data-${group}]`).forEach(button => button.setAttribute('aria-pressed', String(button.dataset[group] === value)));
    applyFilters(true);
  };
  document.querySelectorAll('[data-kind]').forEach(button => button.addEventListener('click', () => setFilter('kind', button.dataset.kind)));
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setFilter('mode', button.dataset.mode)));
  $('ex-clear').addEventListener('click', () => { setFilter('kind', 'all'); setFilter('mode', 'all'); });

  /* Staggered entrance as cards reach the viewport. */
  let observer = null;
  function observeCard(card) {
    if (!observer) { card.classList.add('is-in'); return; }
    observer.observe(card);
  }
  if ('IntersectionObserver' in window && !reduced()) {
    document.body.classList.add('ex-motion');
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }), { threshold: 0.12 });
  }

  /* -------------------------------------------------------- my registrations */

  function renderMine() {
    const list = $('ex-mine-list');
    const entries = account.allRegistrations().filter(entry => entry.listing)
      .sort((a, b) => (a.status === 'cancelled') - (b.status === 'cancelled') || a.listing.startDate.localeCompare(b.listing.startDate));
    if (!entries.length) {
      list.innerHTML = '<li><p class="ex-mine-empty">You haven’t registered for anything yet. When you do, it appears here with its real status.</p></li>';
      return;
    }
    list.innerHTML = entries.map(entry => {
      const item = entry.listing;
      const attended = entry.attendance?.length ? ` · attended ${entry.attendance.length} ${entry.attendance.length === 1 ? 'part' : 'parts'} (organiser-confirmed)` : '';
      return `<li class="ex-mine-item${entry.status === 'cancelled' ? ' is-cancelled' : ''}">
        <div><strong>${esc(item.title)}</strong><small>${esc(item.kindLabel)} · ${esc(when(item))} · ${esc(where(item))}${entry.reference ? ` · ${esc(entry.reference)}` : ''}${esc(attended)}</small></div>
        <div class="ex-mine-actions">${statusChip(entry.status)}<button type="button" class="ex-card-link" data-open="${item.id}" aria-label="${esc(`View ${item.title}`)}">View</button></div>
      </li>`;
    }).join('');
  }

  /* -------------------------------------------------------------- the sheet */

  const sheet = $('ex-sheet');
  const panel = $('ex-sheet-panel');
  const body = $('ex-sheet-body');
  let openedFrom = null;
  let current = null;
  let draft = {};

  function openSheet(id, origin) {
    current = liveById(id) || account.listingById(id);
    if (!current) return;
    openedFrom = origin || null;
    draft = {};
    showDetail();
    sheet.showModal();
    $('ex-sheet-close').focus();
    if (reduced() || !origin) return;
    // Grow out of the card: start at the card's box, end at the sheet's.
    const from = origin.closest('.ex-card, .ex-mine-item')?.getBoundingClientRect();
    const to = panel.getBoundingClientRect();
    if (!from) return;
    panel.animate([
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, opacity: 0.4 },
      { transform: 'none', opacity: 1 }
    ], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
    body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 160, fill: 'backwards' });
  }

  function closeSheet() {
    const done = () => { sheet.close(); openedFrom?.focus?.(); };
    if (reduced()) { done(); return; }
    panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(24px)' }], { duration: 200, easing: 'ease-in' }).finished.then(done, done);
  }
  $('ex-sheet-close').addEventListener('click', closeSheet);
  sheet.addEventListener('cancel', event => { event.preventDefault(); closeSheet(); });
  sheet.addEventListener('click', event => { if (event.target === sheet) closeSheet(); });

  const view = html => {
    body.innerHTML = `<div class="ex-view">${html}</div>`;
    body.scrollTop = 0;
  };
  const steps = stage => `<ol class="ex-steps" aria-label="Registration steps">${['Your details', 'Review', 'Done'].map((label, index) =>
    `<li class="${index < stage ? 'is-done' : index === stage ? 'is-now' : ''}"${index === stage ? ' aria-current="step"' : ''}>${label}</li>`).join('')}</ol>`;

  function showDetail() {
    if (current?.listing === 'live') { showLiveDetail(); return; }
    const item = current;
    const place = places(item);
    const outcome = account.registrationOutcome(item.id);
    const mine = item.mine;
    const parts = item.components.length
      ? `<h3>Its parts — each registered separately</h3><ul class="ex-parts">${item.components.map(part =>
        `<li><span>${esc(part.title)}<br><small>${esc(part.type)}</small></span><small>${esc(fmt.date(part.date, { weekday: true }))}</small></li>`).join('')}</ul>`
      : '';
    let action;
    if (mine) {
      action = `${statusChip(mine.status)}<span class="ex-muted">You registered ${esc(fmt.date(mine.registeredOn))}${mine.reference ? ` · ${esc(mine.reference)}` : ''}</span>
        ${item.past ? '' : '<button type="button" class="ex-button is-danger" data-act="cancel">Cancel registration</button>'}`;
    } else if (item.past) {
      action = '<span class="ex-muted">This has finished.</span>';
    } else {
      const label = outcome === 'waitlisted' ? 'Join the waiting list' : outcome === 'pending' ? 'Request a place' : item.kind === 'initiative' ? 'Join the initiative' : item.kind === 'competition' ? 'Enter the competition' : 'Register';
      action = `<button type="button" class="ex-button" data-act="start">${esc(label)} ${icon('i-arrow')}</button>
        <span class="ex-muted">${outcome === 'waitlisted' ? 'No place is held until one opens.' : outcome === 'pending' ? 'The organiser confirms places.' : 'Confirmed straight away.'}</span>`;
    }
    view(`${item.image ? `<div class="ex-sheet-media"><img src="${root}${item.image}" alt="${esc(item.imageAlt || '')}"></div>` : '<div style="height:var(--space-22)"></div>'}
      <div class="ex-card-band" style="padding:0">${`<span class="ex-kind">${icon(KIND_ICON[item.kind])}${esc(item.kindLabel)}</span>`}${trust(item)}</div>
      <h2 id="sheet-title">${esc(item.title)}</h2>
      <p class="ex-muted">Run by ${esc(item.organizer)}${item.listing === 'verified' ? ' · organiser verified by DeepSprout' : ' · sample listing in this preview'}</p>
      <p>${esc(item.summary)}</p>
      <ul class="ex-detail-grid">
        <li><b>When</b><span>${esc(when(item))}</span></li>
        <li><b>Time zone</b><span>${esc(item.timezone)}</span></li>
        <li><b>Where</b><span>${esc(item.mode === 'online' ? 'Online — link on your registration' : item.mode === 'hybrid' ? `${item.venue}, or online` : item.venue)}</span></li>
        <li><b>Places</b><span>${esc(place.text)}</span></li>
        <li><b>Who can join</b><span>${esc(item.eligibility)}</span></li>
        <li><b>Confirmation</b><span>${item.approval === 'organiser' ? 'The organiser approves places' : 'Automatic'}</span></li>
      </ul>
      <h3>What it’s for</h3>
      <ul>${item.objectives.map(objective => `<li>${esc(objective)}</li>`).join('')}</ul>
      ${parts}
      <div class="ex-commit"><p><strong>What registering commits you to.</strong> ${esc(item.commitment)}</p></div>
      <div class="ex-sheet-actions">${action}</div>`);
    body.querySelector('[data-act="start"]')?.addEventListener('click', showForm);
    const cancel = body.querySelector('[data-act="cancel"]');
    cancel?.addEventListener('click', () => {
      // Two steps, inline: never a one-click destructive action.
      if (cancel.dataset.armed !== '1') {
        cancel.dataset.armed = '1';
        cancel.textContent = 'Yes, cancel — release my place';
        cancel.insertAdjacentHTML('afterend', '<button type="button" class="ex-button is-quiet" data-act="keep">Keep it</button>');
        body.querySelector('[data-act="keep"]').addEventListener('click', showDetail);
        body.querySelector('[data-act="keep"]').focus();
        return;
      }
      account.mutate({ type: 'registration.cancel', opportunityId: item.id });
      current = account.listingById(item.id);
      showDetail();
    });
  }

  function showForm() {
    const item = current;
    const outcome = account.registrationOutcome(item.id);
    const profile = account.profile();
    view(`<div style="height:var(--space-22)"></div>
      <p class="ex-eyebrow">${outcome === 'waitlisted' ? 'Waiting list' : 'Registration'}</p>
      <h2 id="sheet-title">${esc(item.title)}</h2>
      ${steps(0)}
      <form class="ex-form" id="ex-form" novalidate>
        <label class="ex-field"><span>Your name</span><input name="name" autocomplete="name" required value="${esc(draft.name ?? profile.name ?? '')}"></label>
        <label class="ex-field"><span>Email for updates</span><input name="email" type="email" autocomplete="email" required value="${esc(draft.email ?? profile.email ?? '')}" placeholder="you@example.com"></label>
        ${item.mode === 'hybrid' ? `<label class="ex-field"><span>How will you join?</span><select name="attend"><option value="in-person"${draft.attend === 'online' ? '' : ' selected'}>In person — ${esc(item.venue)}</option><option value="online"${draft.attend === 'online' ? ' selected' : ''}>Online</option></select></label>` : ''}
        ${item.kind === 'experience' ? `<label class="ex-field"><span>Anything the organiser should know (optional)</span><textarea name="note" rows="3" placeholder="Access needs, dietary needs…">${esc(draft.note || '')}</textarea></label>` : ''}
        <label class="ex-consent"><input type="checkbox" name="consent"${draft.consent ? ' checked' : ''} required><span>I understand what this ${outcome === 'waitlisted' ? 'waiting-list place' : 'registration'} commits me to: ${esc(item.commitment)}</span></label>
        <p class="ex-error" id="ex-form-error" role="alert" hidden></p>
        <div class="ex-sheet-actions">
          <button type="button" class="ex-button is-quiet" data-act="back">${icon('i-back')} Back</button>
          <button type="submit" class="ex-button">Review ${icon('i-arrow')}</button>
        </div>
      </form>`);
    const form = $('ex-form');
    form.elements.namedItem('name').focus();
    body.querySelector('[data-act="back"]').addEventListener('click', showDetail);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const fields = form.elements;
      draft = {
        name: fields.namedItem('name').value.trim(),
        email: fields.namedItem('email').value.trim(),
        attend: fields.namedItem('attend')?.value,
        note: fields.namedItem('note')?.value.trim(),
        consent: fields.namedItem('consent').checked
      };
      const error = $('ex-form-error');
      const problem = !draft.name ? 'Add your name.' : !/^\S+@\S+\.\S+$/.test(draft.email) ? 'Add an email address the organiser can reach.' : !draft.consent ? 'Tick the box to confirm you understand what this commits you to.' : '';
      if (problem) { error.textContent = problem; error.hidden = false; return; }
      showReview();
    });
  }

  function showReview() {
    const item = current;
    const outcome = account.registrationOutcome(item.id);
    const rows = [
      ['What', `${item.kindLabel}: ${item.title}`],
      ['Run by', item.organizer],
      ['When', `${when(item)} · ${item.timezone}`],
      ['Where', draft.attend === 'online' || item.mode === 'online' ? 'Online' : item.venue],
      ['Name', draft.name],
      ['Email', draft.email],
      ['Result', outcome === 'waitlisted' ? 'Waiting list — no place held yet' : outcome === 'pending' ? 'Request sent to the organiser — pending' : 'Confirmed straight away']
    ];
    if (draft.note) rows.push(['Note to organiser', draft.note]);
    view(`<div style="height:var(--space-22)"></div>
      <p class="ex-eyebrow">Review</p>
      <h2 id="sheet-title">Check before you confirm</h2>
      ${steps(1)}
      <dl class="ex-review">${rows.map(([term, value]) => `<div><dt>${esc(term)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
      ${item.kind === 'initiative' ? '<div class="ex-commit"><p><strong>Joining does not book its sessions.</strong> Each talk, workshop and trip asks you separately.</p></div>' : ''}
      <div class="ex-sheet-actions">
        <button type="button" class="ex-button is-quiet" data-act="edit">${icon('i-back')} Edit details</button>
        <button type="button" class="ex-button" data-act="confirm">${outcome === 'waitlisted' ? 'Join the waiting list' : outcome === 'pending' ? 'Send my request' : 'Confirm registration'} ${icon('i-check')}</button>
      </div>`);
    body.querySelector('[data-act="edit"]').addEventListener('click', showForm);
    body.querySelector('[data-act="confirm"]').addEventListener('click', confirmRegistration);
  }

  function confirmRegistration() {
    const item = current;
    const status = account.registrationOutcome(item.id);
    const ref = reference(item, account.todayKey);
    account.mutate({
      type: 'registration.add',
      registration: {
        opportunityId: item.id, registeredOn: account.todayKey, status, reference: ref,
        attend: draft.attend || item.mode, note: draft.note || '', attendance: [], completion: null
      }
    });
    current = account.listingById(item.id);
    showDone(status, ref);
  }

  function calendarLink(item, ref) {
    const stamp = date => date.replace(/-/g, '');
    const [hours, minutes] = item.startTime.split(':');
    const start = `${stamp(item.startDate)}T${hours}${minutes}00`;
    const end = item.durationMinutes
      ? `DURATION:PT${item.durationMinutes}M`
      : `DTEND;VALUE=DATE:${stamp(Account.keyOf(Account.addDays(item.end, 1)))}`;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DeepSprout//Explore//EN', 'BEGIN:VEVENT',
      `UID:${ref}@deepsprout`, `DTSTAMP:${stamp(account.todayKey)}T000000Z`, `DTSTART;TZID=Asia/Amman:${start}`, end,
      `SUMMARY:${item.title}`, `LOCATION:${item.mode === 'online' ? 'Online' : item.venue}`,
      `DESCRIPTION:Booking reference ${ref}. Run by ${item.organizer}.`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  }

  function showDone(status, ref) {
    const item = current;
    const title = { confirmed: item.kind === 'initiative' ? 'You’ve joined' : item.kind === 'competition' ? 'You’re entered' : 'You’re registered', pending: 'Request sent', waitlisted: 'You’re on the waiting list' }[status];
    const next = [];
    if (status === 'pending') next.push(`The organiser reviews requests and confirms places. It isn’t a booking until they do — you’ll see it change to Confirmed in My registrations.`);
    if (status === 'waitlisted') next.push('No place is held yet. If one opens you’re offered it in order, and have 24 hours to accept.');
    if (item.kind === 'initiative') next.push('Joining does not book its sessions. Each part has its own registration, capacity and date.');
    if (item.mode !== 'in-person' && status === 'confirmed') next.push('The online link appears on your registration an hour before it starts.');
    if (item.mode !== 'online' && status === 'confirmed') next.push(`Arrive ten minutes early at ${item.venue}.`);
    if (item.kind === 'competition') next.push(`Submit your entry before ${fmt.date(item.end, { weekday: true })}. Entering is not winning.`);
    next.push('Attendance is confirmed by the organiser on the day — and attending is not the same as completing.');
    view(`<div class="ex-done">
      ${steps(2)}
      <span class="ex-done-mark" data-status="${status}">${icon(status === 'confirmed' ? 'i-check' : status === 'pending' ? 'i-hourglass' : 'i-clock')}</span>
      <h2 id="sheet-title">${esc(title)}</h2>
      <p>${esc(item.title)} · ${esc(when(item))}</p>
      <div>${statusChip(status)}</div>
      <div class="ex-ref" aria-label="${esc(`Booking reference ${ref}`)}">${esc(ref)}</div>
      <dl class="ex-review">
        <div><dt>When</dt><dd>${esc(when(item))} · ${esc(item.timezone)}</dd></div>
        <div><dt>Where</dt><dd>${esc(draft.attend === 'online' || item.mode === 'online' ? 'Online' : item.venue)}</dd></div>
        <div><dt>Run by</dt><dd>${esc(item.organizer)}</dd></div>
      </dl>
      <h3>What happens next</h3>
      <ul class="ex-next">${next.map(line => `<li>${icon('i-arrow')}<span>${esc(line)}</span></li>`).join('')}</ul>
      <div class="ex-sheet-actions">
        ${status === 'confirmed' ? `<a class="ex-button is-quiet" href="${calendarLink(item, ref)}" download="${esc(item.id)}.ics">${icon('i-download')} Add to calendar</a>` : ''}
        <button type="button" class="ex-button" data-act="mine">See my registrations ${icon('i-arrow')}</button>
      </div>
    </div>`);
    body.querySelector('[data-act="mine"]').addEventListener('click', () => {
      closeSheet();
      setTimeout(() => $('my-registrations').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }), 220);
    });
  }

  /* ------------------------------------------- live Institution Initiatives */

  const costText = item => item.cost?.type === 'Paid' ? `${item.cost.price} ${item.cost.currency} · payment is simulated in this demo — nothing is charged` : 'Free';
  const modesText = item => item.modes.join(' · ');
  const liveRun = (action, payload) => Repo().run(action, payload);
  const signInNote = () => `<p class="ex-muted">You need a DeepSprout account to apply. <a class="ex-inline-link" href="${root}login.html">Log in</a> or <a class="ex-inline-link" href="${root}register.html">create an account</a>.</p>`;

  function showLiveDetail() {
    const item = current;
    const repo = Repo();
    const me = repo?.me();
    const mine = item.mine;
    const place = livePlaces(item);
    let action;
    if (mine && !['Withdrawn', 'Rejected', 'Declined', 'Expired'].includes(mine.status)) {
      action = `${appChip(mine.status)}<span class="ex-muted">Application <strong class="ex-code">${esc(mine.code)}</strong>${mine.position ? ` · position ${mine.position} on the waiting list` : ''}</span>
        <button type="button" class="ex-button is-quiet" data-act="my-initiatives">Open in My Initiatives ${icon('i-arrow')}</button>`;
    } else if (!me || !repo.canAct()) {
      action = signInNote();
    } else if (item.registration !== 'Open') {
      action = `<span class="ex-muted">${item.registration === 'Opens soon' ? `Applications open on ${esc(fmt.date(Account.parse(item.registrationOpen), { year: true }))}.` : 'Applications are closed for this initiative.'}</span>`;
    } else {
      action = `<button type="button" class="ex-button" data-act="apply">${item.full ? 'Apply — waiting list' : 'Apply to join'} ${icon('i-arrow')}</button>
        <span class="ex-muted">${item.full ? 'All seats are taken. Eligible applicants wait in order and are offered a seat when one opens.' : 'The institution reviews every application once.'}</span>`;
      if (mine) action += `<span class="ex-muted">Your previous application ${esc(mine.code)} is ${esc(APP_STATUS[mine.status]?.label.toLowerCase() || mine.status)}.</span>`;
    }
    const sessions = item.sessions.filter(ss => ss.status === 'Published');
    view(`<div data-live-view="detail">${item.image ? `<div class="ex-sheet-media"><img src="${root}${item.image}" alt="${esc(item.imageAlt || '')}"></div>` : '<div style="height:var(--space-22)"></div>'}
      <div class="ex-card-band" style="padding:0"><span class="ex-kind">${icon('i-flag')}Initiative · ${esc(item.topic)}</span>${trust(item)}</div>
      <h2 id="sheet-title">${esc(item.title)}</h2>
      <p class="ex-muted">Run by ${esc(item.organizer)} · Institution verified by DeepSprout · version ${item.version}</p>
      <p class="ex-lead-text">${esc(item.summary)}</p>
      <ul class="ex-detail-grid">
        <li><b>When</b><span>${esc(when(item))}</span></li>
        <li><b>Time zone</b><span>${esc(item.timezone)}</span></li>
        <li><b>How</b><span>${esc(modesText(item))}</span></li>
        <li><b>Where</b><span>${esc([item.venue, item.modes.includes('Online') ? 'online' : ''].filter(Boolean).join(' · ') || 'Online')}</span></li>
        <li><b>Who can join</b><span>${esc(item.eligibility)}</span></li>
        <li><b>Eligible area</b><span>${esc(item.coverage || item.country)}</span></li>
        <li><b>Seats</b><span>${esc(place.text)}</span></li>
        <li><b>Cost</b><span>${esc(costText(item))}</span></li>
        <li><b>Applications</b><span>${esc(item.registration)}${item.registrationClose ? ` · close ${esc(fmt.date(Account.parse(item.registrationClose)))}` : ''}</span></li>
      </ul>
      <h3>What it’s for</h3><p>${esc(item.objective)}</p>
      ${item.description ? `<p>${esc(item.description)}</p>` : ''}
      ${item.requirements ? `<h3>What it asks of you</h3><p>${esc(item.requirements)}</p>` : ''}
      <h3>Its parts — each joined separately</h3>
      <ul class="ex-parts">${item.components.map(part => `<li><span>${esc(part.title)}<br><small>${esc(part.type)}</small></span></li>`).join('')}${sessions.map(ss => `<li><span>${esc(ss.title)}<br><small>Session · ${esc(ss.format)}</small></span><small>${esc(fmt.date(Account.parse(ss.date), { weekday: true }))} · ${esc(ss.time)}</small></li>`).join('')}</ul>
      <div class="ex-commit"><p><strong>Joining is not booking.</strong> Accepted students register for each session separately. Attendance is confirmed by a Supervisor on the day, and completion follows the published criteria: ${esc(item.policies.completion || 'see the institution’s rules')}.</p></div>
      <details class="ex-policy"><summary>Participation rules &amp; privacy</summary><dl class="ex-review">
        ${[['Admission', item.policies.admission], ['Waiting list', item.waitlist ? `Seats are offered in order and held for ${item.offerHours} hours (configurable demo default).` : 'No waiting list.'], ['Withdrawal', item.withdrawal], ['Attendance', item.policies.attendance], ['Excuses', item.policies.excuse], ['Conduct', item.policies.discipline], ['Privacy', item.policies.privacy], ['Notices', item.policies.notifications]].filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl></details>
      <div class="ex-sheet-actions">${action}</div></div>`);
    body.querySelector('[data-act="apply"]')?.addEventListener('click', showLiveForm);
    body.querySelector('[data-act="my-initiatives"]')?.addEventListener('click', () => { closeSheet(); setTimeout(() => $('my-initiatives').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }), 220); });
  }

  function showLiveForm() {
    const item = current;
    const me = Repo().me();
    view(`<div style="height:var(--space-22)"></div>
      <p class="ex-eyebrow">Application</p>
      <h2 id="sheet-title">${esc(item.title)}</h2>
      ${steps(0)}
      <form class="ex-form" id="ex-live-form" novalidate>
        <p class="ex-muted">Applying as <strong>${esc(me.name)}</strong> · ${esc(me.email)}</p>
        <label class="ex-field"><span>Your age</span><input name="age" type="number" inputmode="numeric" min="1" max="120" required value="${esc(draft.age || '')}"><small>${esc(item.eligibility)}</small></label>
        ${item.modes.length > 1 ? `<label class="ex-field"><span>How would you mostly take part?</span><select name="mode">${item.modes.map(m => `<option${draft.mode === m ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>` : ''}
        <label class="ex-field"><span>Why would you like to join? (optional)</span><textarea name="motivation" rows="3" maxlength="400">${esc(draft.motivation || '')}</textarea></label>
        ${item.cost?.type === 'Paid' ? `<div class="ex-commit"><p><strong>Paid initiative · ${esc(item.cost.price)} ${esc(item.cost.currency)}.</strong> Payment is simulated in this demo. No card is requested and nothing is charged.</p></div>` : ''}
        <label class="ex-consent"><input type="checkbox" name="consent"${draft.consent ? ' checked' : ''} required><span>${esc(item.consent || 'I agree to the participation terms.')}</span></label>
        <p class="ex-error" id="ex-form-error" role="alert" hidden></p>
        <div class="ex-sheet-actions">
          <button type="button" class="ex-button is-quiet" data-act="back">${icon('i-back')} Back</button>
          <button type="submit" class="ex-button">Review ${icon('i-arrow')}</button>
        </div>
      </form>`);
    const form = $('ex-live-form');
    form.elements.namedItem('age').focus();
    body.querySelector('[data-act="back"]').addEventListener('click', showLiveDetail);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const f = form.elements;
      draft = { age: f.namedItem('age').value, mode: f.namedItem('mode')?.value || item.modes[0], motivation: f.namedItem('motivation').value.trim(), consent: f.namedItem('consent').checked };
      const age = Number(draft.age);
      const problem = !age ? 'Add your age so eligibility can be checked.'
        : (item.minAge && age < item.minAge) || (item.maxAge && age > item.maxAge) ? `This initiative is for ages ${item.minAge || 0}–${item.maxAge || 'any'}.`
        : !draft.consent ? 'Tick the consent box to continue.' : '';
      const error = $('ex-form-error');
      if (problem) { error.textContent = problem; error.hidden = false; return; }
      showLiveReview();
    });
  }

  function showLiveReview() {
    const item = current;
    const rows = [['Initiative', item.title], ['Institution', item.organizer], ['When', `${when(item)} · ${item.timezone}`], ['Your age', draft.age], ['Main mode', draft.mode], ['Cost', costText(item)],
      ['What happens', item.full ? 'Eligible applicants join the waiting list in order' : 'The Representative or a Supervisor reviews your application once']];
    if (draft.motivation) rows.push(['Why you’re joining', draft.motivation]);
    view(`<div style="height:var(--space-22)"></div>
      <p class="ex-eyebrow">Review</p>
      <h2 id="sheet-title">Check before you apply</h2>
      ${steps(1)}
      <dl class="ex-review">${rows.map(([term, value]) => `<div><dt>${esc(term)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
      <p class="ex-error" id="ex-live-error" role="alert" hidden></p>
      <div class="ex-sheet-actions">
        <button type="button" class="ex-button is-quiet" data-act="edit">${icon('i-back')} Edit</button>
        <button type="button" class="ex-button" data-act="confirm">Submit application ${icon('i-check')}</button>
      </div>`);
    body.querySelector('[data-act="edit"]').addEventListener('click', showLiveForm);
    body.querySelector('[data-act="confirm"]').addEventListener('click', event => {
      event.currentTarget.disabled = true;
      try {
        const appId = liveRun('member.application.submit', { initiativeId: item.id, age: Number(draft.age), mode: draft.mode, motivation: draft.motivation, consent: draft.consent });
        current = liveById(item.id) || current;
        showLiveDone(appId);
      } catch (error) {
        const node = $('ex-live-error'); node.textContent = error.message; node.hidden = false; event.currentTarget.disabled = false;
      }
    });
  }

  function showLiveDone(appId) {
    const item = current;
    const app = Repo().read().admissions.find(entry => entry.id === appId);
    view(`<div class="ex-done">
      ${steps(2)}
      <span class="ex-done-mark" data-status="pending">${icon('i-hourglass')}</span>
      <h2 id="sheet-title">Application sent</h2>
      <p>${esc(item.title)} · ${esc(item.organizer)}</p>
      <div>${appChip(app.status)}</div>
      <div class="ex-ref" aria-label="${esc(`Application ID ${app.code}`)}">${esc(app.code)}</div>
      <h3>What happens next</h3>
      <ul class="ex-next">
        <li>${icon('i-arrow')}<span>The Representative or an active Supervisor reviews this same application once. You’ll see the decision in My Initiatives.</span></li>
        <li>${icon('i-arrow')}<span>${item.full ? 'Seats are full right now: if you are eligible you join the waiting list and are offered a seat in order.' : `Pending applications don’t hold a seat. ${item.seatsLeft} of ${item.capacity} seats are open now.`}</span></li>
        <li>${icon('i-arrow')}<span>Once accepted, you register for each session separately and your Coach’s tasks appear in Activities → Assigned.</span></li>
      </ul>
      <div class="ex-sheet-actions"><button type="button" class="ex-button" data-act="my-initiatives">See My Initiatives ${icon('i-arrow')}</button></div>
    </div>`);
    body.querySelector('[data-act="my-initiatives"]').addEventListener('click', () => { closeSheet(); setTimeout(() => $('my-initiatives').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }), 220); });
  }

  /* ---------------------------------------------------------- My Initiatives */

  const openDetails = new Set();
  const flash = new Map();   // admission id → last success message, shown after re-render
  const fmtWhen = iso => fmt.date(Account.parse(String(iso).slice(0, 10)), { year: true });
  function questionHtml(formId, q) {
    const name = `q-${q.id}`, req = q.required ? ' required' : '', label = `<span>${esc(q.label)}${q.required ? ' *' : ''}</span>`;
    if (q.type === 'Long text') return `<label class="ex-field">${label}<textarea name="${name}" rows="3"${req}></textarea></label>`;
    if (q.type === 'Single choice') return `<label class="ex-field">${label}<select name="${name}"${req}><option value="">Choose an answer</option>${q.options.map(o => `<option>${esc(o)}</option>`).join('')}</select></label>`;
    if (q.type === 'Multiple choice') return `<fieldset class="ex-field ex-choices"><legend>${esc(q.label)}${q.required ? ' *' : ''}</legend>${q.options.map(o => `<label><input type="checkbox" name="${name}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</fieldset>`;
    if (q.type === 'Rating') return `<fieldset class="ex-field ex-rating"><legend>${esc(q.label)}${q.required ? ' *' : ''}</legend>${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="${name}" value="${n}"${req}><span>${n}</span></label>`).join('')}</fieldset>`;
    const type = q.type === 'Number' ? 'number' : q.type === 'Date' ? 'date' : 'text';
    return `<label class="ex-field">${label}<input type="${type}" name="${name}"${req}>${q.type === 'File preview' ? '<small>Type the file name — files are not uploaded on forms in this demo.</small>' : ''}</label>`;
  }
  function formsBlock(entry) {
    if (!entry.forms.length) return '';
    return `<h4>Forms &amp; surveys</h4><ul class="ex-form-list">${entry.forms.map(f => `<li class="ex-session"><div class="ex-session-head"><div><strong>${esc(f.title)}</strong><small>${esc(f.purpose)} · version ${f.version} · identified — the institution sees your name with your answers</small></div><div class="ex-mine-actions">${f.response ? `<span class="ex-status" data-status="confirmed">${icon('i-check')}Submitted ${esc(fmtWhen(f.response.submitted))}</span>` : f.canRespond ? `<button type="button" class="ex-button ex-small" data-form-open="${f.id}">Answer</button>` : `<span class="ex-muted">${f.status !== 'Published' ? 'Closed' : f.permitted ? 'Not open' : 'For accepted participants'}</span>`}</div></div>
      ${f.response ? `<details class="ex-policy"><summary>Your answers (version ${f.response.version})</summary><dl class="ex-review">${f.questions.map(q => `<div><dt>${esc(q.label)}</dt><dd>${esc([].concat(f.response.answers[q.id] ?? '—').join(', '))}</dd></div>`).join('')}</dl></details>` : ''}
      <form class="ex-form ex-inline-form" data-form-respond="${f.id}" hidden>${f.questions.map(q => questionHtml(f.id, q)).join('')}<p class="ex-error" role="alert" hidden></p><div class="ex-sheet-actions"><button class="ex-button ex-small">Submit answers</button><button type="button" class="ex-button is-quiet ex-small" data-form-cancel="${f.id}">Cancel</button></div></form></li>`).join('')}</ul>`;
  }
  function competitionsBlock(entry) {
    if (!entry.competitions.length) return '';
    return `<h4>Competitions</h4><ul class="ex-form-list">${entry.competitions.map(c => `<li class="ex-session"><div class="ex-session-head"><div><strong>${esc(c.title)}</strong><small>${esc(c.topic || '')} · entries ${esc(fmtWhen(c.open))} – ${esc(fmtWhen(c.deadline))}</small></div><div class="ex-mine-actions">${c.entry ? `<span class="ex-status" data-status="${c.resultsPublished ? 'complete' : 'pending'}">${esc(c.resultsPublished ? 'Results published' : c.entry.status === 'Reviewed' ? 'Reviewed · results pending' : 'Entry submitted')}</span>` : c.canEnter ? `<button type="button" class="ex-button ex-small" data-entry-open="${c.id}">Enter</button>` : `<span class="ex-muted">${!c.windowOpen ? 'Submission window closed' : 'For accepted participants'}</span>`}</div></div>
      <details class="ex-policy"><summary>Rules &amp; judging criteria</summary><p>${esc(c.rules)}</p><p class="ex-muted">${esc(c.eligibility || '')}</p><ul>${c.criteria.map(k => `<li>${esc(k)}</li>`).join('')}</ul></details>
      ${c.entry ? `<div class="ex-excuse"><p><strong>Your entry</strong> · ${esc(fmtWhen(c.entry.created))}</p><p>${esc(c.entry.text)}</p>${c.resultsPublished ? `<p><strong>Feedback:</strong> ${esc(c.entry.feedback || '—')}</p><ul>${Object.entries(c.entry.scores || {}).map(([k, v]) => `<li>${esc(k)}: ${esc(v)}/5</li>`).join('')}</ul>` : '<p class="ex-muted">Scores and feedback appear here when the institution publishes results.</p>'}</div>` : ''}
      <form class="ex-form ex-inline-form" data-entry-form="${c.id}" hidden><label class="ex-field"><span>Your original entry</span><textarea name="text" rows="5" maxlength="4000" required></textarea><small>No sensitive personal information. Entering is not winning, and it adds nothing to your Garden.</small></label><p class="ex-error" role="alert" hidden></p><div class="ex-sheet-actions"><button class="ex-button ex-small">Submit entry</button><button type="button" class="ex-button is-quiet ex-small" data-entry-cancel="${c.id}">Cancel</button></div></form></li>`).join('')}</ul>`;
  }
  const sessionWhen = ss => `${fmt.date(Account.parse(ss.date), { weekday: true, year: true })} · ${ss.time}–${ss.endTime} (${ss.timezone || 'Asia/Amman'})`;
  const ATTEND_TONE = { Present: 'confirmed', Late: 'pending', Absent: 'cancelled', 'Excused Absence': 'waitlisted', Registered: 'pending', 'Not registered': 'cancelled' };
  const attendChip = label => `<span class="ex-status" data-status="${ATTEND_TONE[label] || 'pending'}">${esc(label)}</span>`;

  function statusMessage(entry) {
    const a = entry.admission;
    const last = [...(a.history || [])].reverse().find(h => h.reason);
    switch (a.status) {
      case 'Pending': return 'Waiting for one review by the Representative or an active Supervisor. Pending applications don’t hold a seat.';
      case 'Queued': return `You’re eligible and on the waiting list${a.position ? ` — position ${a.position}` : ''}. You’ll be offered a seat when one opens.`;
      case 'Offered': return `A seat is held for you. Accept before it expires (<span data-countdown="${esc(a.offer.expires)}">${esc(countdown(a.offer.expires))}</span>).`;
      case 'Accepted': return entry.group ? `You’re in ${esc(entry.group.name)}${entry.group.coach ? ` with Coach ${esc(entry.group.coach)}` : ' · Coach to be assigned'}.` : 'You’re accepted. Your group will be assigned by the institution.';
      case 'Suspended': return `Participation is suspended. ${esc(last?.reason || '')} Your history is kept.`;
      case 'Completed': return 'Completed — recorded in your participation history.';
      case 'Rejected': case 'Removed': case 'Blocked': return esc(last?.reason ? `Reason: ${last.reason}` : 'The institution recorded a decision.');
      default: return esc(last?.reason || '');
    }
  }

  function sessionBlock(entry, ss) {
    const accepted = entry.admission.status === 'Accepted';
    const reg = ss.registration?.status === 'Confirmed' ? ss.registration : null;
    let actions = '';
    if (ss.status === 'Cancelled') actions = `<span class="ex-muted">Cancelled${ss.cancelReason ? ` — ${esc(ss.cancelReason)}` : ''}</span>`;
    else if (ss.attendance) {
      actions = attendChip(ss.display);
      if (ss.attendance.status === 'Absent' && !ss.excuse && accepted) actions += `<button type="button" class="ex-button is-quiet ex-small" data-excuse="${ss.attendance.id}">Explain this absence</button>`;
    } else if (reg) {
      actions = `${attendChip('Registered')}<button type="button" class="ex-button is-quiet ex-small" data-session-cancel="${reg.id}">Cancel registration</button>`;
    } else if (accepted && ss.open) {
      const modes = ss.format === 'Hybrid' ? ['In-person', 'Online'] : [ss.format];
      actions = `<label class="ex-inline-field"><span class="visually-hidden">Mode</span><select data-mode-for="${ss.id}">${modes.map(m => `<option value="${m}"${(m === 'Online' ? ss.seats.online : ss.seats.inPerson) < 1 ? ' disabled' : ''}>${m} · ${m === 'Online' ? ss.seats.online : ss.seats.inPerson} left</option>`).join('')}</select></label><button type="button" class="ex-button ex-small" data-session-register="${ss.id}">Register</button>`;
    } else actions = `<span class="ex-muted">${accepted ? 'Registration closed' : 'For accepted students'}</span>`;
    const credential = reg && !ss.attendance ? (reg.mode === 'In-person'
      ? `<div class="ex-qr"><div class="ex-qr-code" role="img" aria-label="${esc(`QR code for booking ${reg.code}`)}">${qrSvg(reg.code)}</div><div><p class="ex-eyebrow">Booking credential</p><strong class="ex-code">${esc(reg.code)}</strong><p class="ex-muted">Show this QR (or read out the code) to the Supervisor at ${esc(ss.venue)}. It identifies this booking only — it is not proof of anything else.</p></div></div>`
      : `<p class="ex-muted">${icon('i-globe')} Online · ${esc(ss.meeting || 'The meeting link is shared with confirmed registrants.')} A Supervisor confirms attendance from the roster — opening the link alone doesn’t count.</p>`) : '';
    const excuse = ss.excuse ? `<div class="ex-excuse"><p><strong>Your explanation</strong> · ${esc(fmt.date(Account.parse(ss.excuse.created.slice(0, 10))))}</p><p>${esc(ss.excuse.reason)}</p>${ss.excuse.attachment?.id ? `<p><button type="button" class="ex-inline-link ex-link-button" data-evidence="${ss.excuse.id}">View your attachment (${esc(ss.excuse.attachment.name)})</button></p>` : ''}${ss.excuse.recommendationNote ? `<p class="ex-muted">Request from your Supervisor: ${esc(ss.excuse.recommendationNote)}</p>` : ''}
      <ol class="ex-steps ex-steps-compact" aria-label="Excuse progress"><li class="is-done">Submitted</li><li class="${ss.excuse.recommendation ? 'is-done' : 'is-now'}">Supervisor review</li><li class="${ss.excuse.decision ? 'is-done' : ss.excuse.recommendation ? 'is-now' : ''}">Final decision</li></ol>
      ${ss.excuse.status === 'Info Requested' ? `<form class="ex-form" data-excuse-respond="${ss.excuse.id}"><label class="ex-field"><span>Your Supervisor asked for more information</span><textarea name="text" rows="2" required></textarea></label><button class="ex-button ex-small">Send</button></form>` : ''}
      ${ss.excuse.decision ? `<p>${attendChip(ss.excuse.status === 'Accepted' ? 'Excused Absence' : 'Absent')} ${esc(ss.excuse.decision.reason)}</p><p class="ex-muted">Factual attendance stays “Absent”. An accepted excuse is a separate decision and never counts as attendance.</p>` : ''}</div>` : '';
    return `<li class="ex-session"><div class="ex-session-head"><div><strong>${esc(ss.title)}</strong><small>${esc(sessionWhen(ss))} · ${esc(ss.format)}${ss.venue ? ` · ${esc(ss.venue)}` : ''}</small></div><div class="ex-mine-actions">${actions}</div></div>${credential}${excuse}<div class="ex-excuse-slot" data-slot="${ss.attendance?.id || ''}"></div></li>`;
  }

  function renderMyInitiatives() {
    const host = $('ex-my-initiatives');
    if (!host) return;
    const repo = Repo();
    const me = repo?.me();
    if (!repo || !me) { host.innerHTML = `<p class="ex-mine-empty">Sign in to see initiatives you have applied to.</p>`; return; }
    const entries = repo.selectors.myInitiatives(repo.read(), me.id);
    $('my-initiatives-who').textContent = `Signed in as ${me.name}`;
    if (!entries.length) { host.innerHTML = '<p class="ex-mine-empty">No initiative applications yet. When you apply, the institution’s decision and your sessions appear here — from the same record the institution sees.</p>'; return; }
    host.innerHTML = entries.map(entry => {
      const a = entry.admission, item = entry.initiative;
      const live = ['Pending', 'Queued', 'Offered', 'Accepted', 'Suspended'].includes(a.status);
      const tasks = entry.tasks;
      const open = openDetails.has(a.id) || entries.length === 1 || a.status === 'Offered';
      return `<article class="ex-initiative${live ? '' : ' is-ended'}" data-admission="${a.id}">
        <header class="ex-initiative-head">
          ${item.image ? `<img src="${root}${item.image}" alt="" loading="lazy">` : `<span class="ex-initiative-mark">${icon('i-flag')}</span>`}
          <div><p class="ex-eyebrow">${esc(item.organizer)}</p><h3>${esc(item.title)}</h3><small>Application <strong class="ex-code">${esc(a.code)}</strong> · applied ${esc(fmt.date(Account.parse(a.created.slice(0, 10)), { year: true }))}</small></div>
          <div class="ex-initiative-status">${appChip(a.status)}${item.status !== 'Published' && item.status !== 'Completed' ? `<span class="ex-status" data-status="warning">Initiative ${esc(item.status.toLowerCase())}</span>` : ''}</div>
        </header>
        <p class="ex-initiative-message">${statusMessage(entry)}</p>${flash.has(a.id) ? `<p class="ex-flash" role="status">${icon('i-check')}${esc(flash.get(a.id))}</p>` : ''}
        ${a.status === 'Offered' ? `<div class="ex-sheet-actions"><button type="button" class="ex-button" data-offer-accept="${a.id}">Accept seat ${icon('i-check')}</button><button type="button" class="ex-button is-quiet" data-offer-decline="${a.id}">Decline</button></div>` : ''}
        <details class="ex-initiative-body" data-details="${a.id}"${open ? ' open' : ''}><summary>Sessions, tasks and history</summary>
          ${entry.sessions.length ? `<h4>Sessions</h4><ol class="ex-session-list">${entry.sessions.map(ss => sessionBlock(entry, ss)).join('')}</ol>` : '<p class="ex-muted">No published sessions yet.</p>'}
          <h4>Coach tasks</h4>${tasks.length ? `<p>${tasks.filter(t => t.status === 'Approved').length} of ${tasks.length} approved · ${tasks.filter(t => ['Assigned', 'In Progress', 'Needs Revision'].includes(t.status)).length} to do. <a class="ex-inline-link" href="${root}src/pages/member/training/training.html#assigned">Open Activities → Assigned</a></p>` : '<p class="ex-muted">No tasks assigned yet.</p>'}
          ${formsBlock(entry)}${competitionsBlock(entry)}
          ${entry.completion ? `<p class="ex-complete">${icon('i-check')} ${entry.completion.status} · ${esc(fmt.date(Account.parse(entry.completion.at.slice(0, 10)), { year: true }))}. Completion is recorded in your history and Insights; it doesn’t add a Garden object.</p>` : ''}
          <h4>Decision history</h4><ol class="ex-history">${a.history.map(h => `<li><span>${esc(fmt.date(Account.parse(String(h.at).slice(0, 10))))}</span><span>${esc(h.to || '')}${h.reason ? ` — ${esc(h.reason)}` : ''}</span></li>`).join('')}</ol>
          ${live ? `<div class="ex-sheet-actions"><button type="button" class="ex-button is-danger ex-small" data-withdraw="${a.id}">Withdraw from this initiative</button></div>` : ''}
        </details>
        <p class="ex-error" role="alert" hidden></p>
      </article>`;
    }).join('');
  }

  function liveAction(node, run, success = '') {
    const card = node.closest('.ex-initiative');
    const error = node.closest('form')?.querySelector('.ex-error') || card?.querySelector(':scope > .ex-error');
    try { if (success && card) flash.set(card.dataset.admission, success); run(); }
    catch (e) { if (card) flash.delete(card.dataset.admission); if (error) { error.textContent = e.message; error.hidden = false; error.focus?.(); } else window.alert?.(e.message); return false; }
    return true;
  }
  document.addEventListener('toggle', event => { const id = event.target.dataset?.details; if (id) { if (event.target.open) openDetails.add(id); else openDetails.delete(id); } }, true);
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-form-open],[data-form-cancel],[data-entry-open],[data-entry-cancel],[data-evidence]');
    if (opener) {
      const card = opener.closest('.ex-initiative'); if (card) openDetails.add(card.dataset.admission);
      const toggle = (selector, show) => { const f = card.querySelector(selector); f.hidden = !show; if (show) f.querySelector('input,textarea,select')?.focus(); };
      if (opener.dataset.formOpen) toggle(`[data-form-respond="${opener.dataset.formOpen}"]`, true);
      if (opener.dataset.formCancel) toggle(`[data-form-respond="${opener.dataset.formCancel}"]`, false);
      if (opener.dataset.entryOpen) toggle(`[data-entry-form="${opener.dataset.entryOpen}"]`, true);
      if (opener.dataset.entryCancel) toggle(`[data-entry-form="${opener.dataset.entryCancel}"]`, false);
      if (opener.dataset.evidence) Repo().openEvidence(opener.dataset.evidence).then(record => { const url = URL.createObjectURL(record.blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000); }, e => liveAction(opener, () => { throw e; }));
      return;
    }
    const t = event.target.closest('[data-session-register],[data-session-cancel],[data-offer-accept],[data-offer-decline],[data-withdraw],[data-excuse]');
    if (!t) return;
    const card = t.closest('.ex-initiative'); if (card) openDetails.add(card.dataset.admission);
    if (t.dataset.sessionRegister) liveAction(t, () => liveRun('member.session.register', { sessionId: t.dataset.sessionRegister, mode: card.querySelector(`[data-mode-for="${t.dataset.sessionRegister}"]`)?.value, consent: true }), 'Session booked. Your booking credential is below.');
    if (t.dataset.sessionCancel) liveAction(t, () => liveRun('member.session.cancel', { id: t.dataset.sessionCancel }));
    if (t.dataset.offerAccept) liveAction(t, () => liveRun('member.offer.accept', { id: t.dataset.offerAccept }), 'Seat accepted. You are now an accepted participant.');
    if (t.dataset.offerDecline) liveAction(t, () => liveRun('member.offer.decline', { id: t.dataset.offerDecline }));
    if (t.dataset.withdraw) {
      if (t.dataset.armed !== '1') { t.dataset.armed = '1'; t.textContent = 'Yes, withdraw — release my seat'; return; }
      liveAction(t, () => liveRun('member.application.withdraw', { id: t.dataset.withdraw }));
    }
    if (t.dataset.excuse) {
      const slot = card.querySelector(`[data-slot="${t.dataset.excuse}"]`);
      slot.innerHTML = `<form class="ex-form ex-excuse" data-excuse-form="${t.dataset.excuse}">
        <label class="ex-field"><span>Briefly explain why you missed this session</span><textarea name="reason" rows="3" maxlength="600" required></textarea><small>Seen by the initiative’s Supervisor and Representative only.</small></label>
        <label class="ex-field"><span>Supporting document (optional · PDF, JPG or PNG · up to 2 MB)</span><input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"><small>Stored only in this browser for the demo and shown only to you, this initiative’s Supervisors and its Representative. It is not encrypted production storage.</small></label>
        <div class="ex-sheet-actions"><button class="ex-button ex-small">Send explanation</button></div></form>`;
      slot.querySelector('textarea').focus();
    }
  });
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (form.dataset.excuseForm) {
      event.preventDefault();
      const file = form.elements.attachment.files?.[0];
      const error = form.querySelector('.ex-error') || form.insertAdjacentElement('beforeend', Object.assign(document.createElement('p'), { className: 'ex-error', role: 'alert' }));
      const problem = file ? Repo().attachments.validate(file) : '';
      if (problem) { error.textContent = problem; error.hidden = false; return; }
      const button = form.querySelector('button'); button.disabled = true; button.textContent = file ? 'Saving attachment…' : 'Sending…';
      let meta = null;
      try { if (file) meta = await Repo().attachments.save(file, { ownerId: Repo().me()?.id }); }
      catch (e) { error.textContent = e.message; error.hidden = false; button.disabled = false; button.textContent = 'Send explanation'; return; }
      const ok = liveAction(form, () => liveRun('member.excuse.submit', { attendanceId: form.dataset.excuseForm, reason: form.elements.reason.value, attachment: meta }), 'Explanation sent to the Supervisor for a recommendation.');
      if (!ok) { if (meta) Repo().attachments.remove(meta.id).catch(() => {}); button.disabled = false; button.textContent = 'Send explanation'; }
    }
    if (form.dataset.excuseRespond) { event.preventDefault(); liveAction(form, () => liveRun('member.excuse.respond', { id: form.dataset.excuseRespond, text: form.elements.text.value }), 'Information sent to your Supervisor.'); }
    if (form.dataset.formRespond) {
      event.preventDefault();
      const answers = {};
      [...new FormData(form).entries()].forEach(([key, value]) => { const qid = key.slice(2); if (form.querySelectorAll(`[name="${key}"][type=checkbox]`).length) answers[qid] = [...(answers[qid] || []), value]; else answers[qid] = value; });
      liveAction(form, () => liveRun('member.form.respond', { formId: form.dataset.formRespond, answers }), 'Answers submitted. The institution sees them with your name, pinned to this form version.');
    }
    if (form.dataset.entryForm) { event.preventDefault(); liveAction(form, () => liveRun('member.competition.enter', { competitionId: form.dataset.entryForm, text: form.elements.text.value }), 'Entry submitted. You will see the outcome here when results are published.'); }
  });

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open]');
    if (opener) openSheet(opener.dataset.open, opener);
  });

  /* ------------------------------------------------------- hero parallax */

  const layers = [...document.querySelectorAll('.ex-hero-layer[data-depth]')];
  let ticking = false;
  const parallax = () => {
    ticking = false;
    const y = Math.min(window.scrollY, 700);
    layers.forEach(layer => { layer.style.transform = `translate3d(0, ${(y * Number(layer.dataset.depth)).toFixed(1)}px, 0)`; });
  };
  if (!reduced() && media('(min-width: 761px)')) {
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
  }

  /* ---------------------------------------------------------------- start */

  Account.load().then(loaded => {
    account = loaded;
    renderGrid();
    renderMine();
    renderMyInitiatives();
    if (location.hash === '#my-registrations') $('my-registrations').scrollIntoView({ block: 'start' });
    if (location.hash === '#my-initiatives') $('my-initiatives').scrollIntoView({ block: 'start' });
    window.addEventListener('deepsprout:account', () => { renderGrid(); renderMine(); });
    // Another workspace (or tab) changed a shared record: re-read, never cache.
    window.addEventListener('deepsprout:repo', () => {
      renderGrid(); renderMyInitiatives();
      if (sheet.open && current?.listing === 'live' && body.querySelector('[data-live-view="detail"]')) { current = liveById(current.id) || current; showLiveDetail(); }
    });
    setInterval(() => document.querySelectorAll('[data-countdown]').forEach(node => { node.textContent = countdown(node.dataset.countdown); }), 30000);
  }).catch(() => {
    $('ex-count').textContent = 'Listings couldn’t be loaded, so none are shown.';
  });
})();
