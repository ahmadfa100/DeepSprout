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
  const trust = item => (item.listing === 'verified'
    ? `<span class="ex-trust is-verified" title="The organiser is verified by DeepSprout">${icon('i-shield-check')}Verified</span>`
    : '<span class="ex-trust is-demo" title="Sample content for this preview">Demo listing</span>');
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
    const place = places(item);
    const mine = item.mine;
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
          ${mine ? statusChip(mine.status) : ''}
        </div>
      </div>`;
  }

  function renderGrid() {
    const items = account.listings().filter(item => !item.past);
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
    $('ex-hero-meta').innerHTML = `<span>${icon('i-compass')}${items.length} listings</span><span>${icon('i-shield-check')}${items.filter(item => item.listing === 'verified').length} from verified organisers</span>${registered ? `<span>${icon('i-check')}${registered} you’re registered for</span>` : ''}`;
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
    current = account.listingById(id);
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
    if (location.hash === '#my-registrations') $('my-registrations').scrollIntoView({ block: 'start' });
    window.addEventListener('deepsprout:account', () => { renderGrid(); renderMine(); });
  }).catch(() => {
    $('ex-count').textContent = 'Listings couldn’t be loaded, so none are shown.';
  });
})();
