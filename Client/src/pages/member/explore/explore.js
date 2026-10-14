/** Explore: filter listings, open a detail view, and register or join a waitlist. */
(() => {
  const DS = window.DeepSprout;
  const ALL = window.DeepSproutOpportunities;

  const KINDS = {
    initiative: { label: 'Initiative', icon: 'i-globe', tone: '' },
    session: { label: 'Session', icon: 'i-users', tone: 'sky' },
    outdoor: { label: 'Outdoor experience', icon: 'i-pin', tone: 'gold' },
    camp: { label: 'Camp', icon: 'i-tent', tone: 'lilac' },
    competition: { label: 'Competition', icon: 'i-trophy', tone: 'coral' }
  };

  const MODE_LABEL = { online: 'Online', 'in-person': 'In person', hybrid: 'Online or in person' };

  const filters = { kind: 'all', mode: 'all', search: '', openOnly: false };

  const grid = document.getElementById('grid');
  const emptyState = document.getElementById('empty');
  const dialog = document.getElementById('detail-dialog');

  const dateRange = item => {
    const start = DS.formatDate(item.date, { month: 'short', day: 'numeric' });
    if (!item.endDate) return start;
    return `${start} – ${DS.formatDate(item.endDate, { month: 'short', day: 'numeric' })}`;
  };

  /** Spaces left, or null when the listing does not cap places. */
  const seatsLeft = item =>
    item.seats === null || item.seats === undefined ? null : item.seats - (item.seatsTaken || 0);

  function statusPill(item) {
    const registration = DS.registrationFor(item.id);
    if (registration && registration.status !== 'cancelled') {
      const labels = { confirmed: 'Registered', waitlisted: 'On the waiting list' };
      return `<span class="pill"><svg><use href="#i-check"/></svg> ${labels[registration.status] || registration.status}</span>`;
    }
    if (item.status === 'closed') return '<span class="pill neutral">Registration closed</span>';
    if (item.status === 'full') return '<span class="pill gold">Full · waiting list</span>';
    const left = seatsLeft(item);
    if (left !== null && left <= 8) return `<span class="pill coral">${left} place${left === 1 ? '' : 's'} left</span>`;
    return '<span class="pill">Open</span>';
  }

  function matches(item) {
    if (filters.kind !== 'all' && item.kind !== filters.kind) return false;
    if (filters.mode !== 'all' && item.mode !== filters.mode) return false;
    if (filters.openOnly && item.status !== 'open') return false;
    if (!filters.search) return true;
    const haystack = [item.title, item.topic, item.organizer, item.summary, item.city]
      .filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(filters.search);
  }

  function render() {
    const visible = ALL.filter(matches);
    document.getElementById('results-count').textContent =
      `${visible.length} of ${ALL.length} shown`;
    emptyState.hidden = visible.length > 0;

    grid.replaceChildren(...visible.map(item => {
      const kind = KINDS[item.kind];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ex-card';

      const left = seatsLeft(item);
      card.innerHTML = `
        <div class="ex-card-top">
          <span class="badge-icon ${kind.tone}"><svg><use href="#${kind.icon}"/></svg></span>
          <div><h3>${item.title}</h3><p class="ex-organizer">${kind.label} · ${item.organizer}</p></div>
        </div>
        <p>${item.summary}</p>
        <div class="ex-facts">
          <span><svg><use href="#i-calendar"/></svg> ${dateRange(item)}</span>
          <span><svg><use href="#i-pin"/></svg> ${item.city || MODE_LABEL[item.mode]}</span>
          ${left === null ? '' : `<span><svg><use href="#i-users"/></svg> ${left} of ${item.seats} free</span>`}
        </div>
        <div class="ex-card-foot">
          ${statusPill(item)}
          <span class="pill neutral">${MODE_LABEL[item.mode]}</span>
        </div>`;
      card.addEventListener('click', () => openDetail(item));
      return card;
    }));
  }

  /* ------------------------------------------------------------- detail view */

  function openDetail(item) {
    const kind = KINDS[item.kind];
    document.getElementById('detail-kind').textContent = kind.label;
    document.getElementById('detail-title').textContent = item.title;
    document.getElementById('detail-organizer').textContent = `Organised by ${item.organizer}`;
    document.getElementById('detail-summary').textContent = item.summary;

    const facts = document.getElementById('detail-facts');
    const left = seatsLeft(item);
    const rows = [
      ['Dates', dateRange(item)],
      item.time ? ['Time', item.time] : null,
      ['How to take part', MODE_LABEL[item.mode]],
      ['Where', item.coverage],
      ['Who it is for', item.ages],
      left === null ? ['Places', 'No limit published'] : ['Places left', `${left} of ${item.seats}`],
      ['Topic', item.topic]
    ].filter(Boolean);

    facts.replaceChildren();
    rows.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      facts.append(dt, dd);
    });

    const components = document.getElementById('detail-components');
    components.replaceChildren();
    if (item.components?.length) {
      const block = document.createElement('div');
      block.className = 'ex-components';
      const heading = document.createElement('p');
      heading.textContent = 'What it is made of';
      const list = document.createElement('ul');
      item.components.forEach(component => {
        const entry = document.createElement('li');
        entry.innerHTML = `<span class="ex-component-type">${component.type}</span>
          <strong>${component.title}</strong><small>${component.note}</small>`;
        list.append(entry);
      });
      block.append(heading, list);
      components.append(block);
    }

    document.getElementById('detail-note').textContent = item.detail;
    renderDetailActions(item);
    dialog.showModal();
  }

  function renderDetailActions(item) {
    const actions = document.getElementById('detail-actions');
    actions.replaceChildren();
    const registration = DS.registrationFor(item.id);
    const active = registration && registration.status !== 'cancelled';

    if (item.status === 'closed') {
      const note = document.createElement('p');
      note.className = 'card-note';
      note.textContent = 'Registration has closed for this one.';
      actions.append(note);
      return;
    }

    if (active) {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn btn-ghost';
      cancel.textContent = registration.status === 'waitlisted' ? 'Leave the waiting list' : 'Cancel my registration';
      cancel.addEventListener('click', () => {
        DS.cancelRegistration(item.id);
        renderDetailActions(item);
        render();
        renderRegistrations();
      });
      const state = document.createElement('p');
      state.className = 'card-note';
      state.textContent = registration.status === 'waitlisted'
        ? 'You are on the waiting list. A place is offered in order, and an offer expires if it is not taken.'
        : 'You are registered. Attendance is confirmed by the organizer on the day — registering is not attending.';
      actions.append(cancel, state);
      return;
    }

    const full = item.status === 'full';
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn btn-primary';
    action.innerHTML = full
      ? 'Join the waiting list <svg><use href="#i-arrow"/></svg>'
      : 'Register <svg><use href="#i-arrow"/></svg>';
    action.addEventListener('click', () => {
      DS.register(item, full ? 'waitlisted' : 'confirmed');
      renderDetailActions(item);
      render();
      renderRegistrations();
    });
    actions.append(action);
  }

  dialog.querySelectorAll('[data-close-dialog]').forEach(button =>
    button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  /* ----------------------------------------------------------- registrations */

  function renderRegistrations() {
    const list = document.getElementById('registration-list');
    const mine = DS.get().registrations.filter(entry => entry.status !== 'cancelled');

    document.getElementById('registration-count').textContent = mine.length
      ? `${mine.length} commitment${mine.length === 1 ? '' : 's'}`
      : 'None yet';

    if (!mine.length) {
      list.innerHTML = `<div class="empty"><strong>Nothing registered yet</strong>
        <p>When you register for something it appears here, with its own status. Joining an initiative does not book you into its sessions — each part is registered separately.</p></div>`;
      return;
    }

    list.replaceChildren(...mine.map(entry => {
      const item = ALL.find(opportunity => opportunity.id === entry.opportunityId);
      const row = document.createElement('article');
      row.className = 'ex-reg';
      const label = entry.status === 'waitlisted' ? 'On the waiting list' : 'Registered';
      const pillTone = entry.status === 'waitlisted' ? 'gold' : '';
      row.innerHTML = `<span class="badge-icon ${KINDS[entry.kind]?.tone || ''}"><svg><use href="#${KINDS[entry.kind]?.icon || 'i-ticket'}"/></svg></span>
        <div class="ex-reg-body">
          <strong>${entry.title}</strong>
          <small>${entry.organizer} · ${DS.formatDate(entry.date, { month: 'long', day: 'numeric' })}</small>
        </div>
        <span class="pill ${pillTone}">${label}</span>`;

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'btn btn-ghost';
      open.textContent = 'Details';
      open.addEventListener('click', () => item && openDetail(item));
      row.append(open);
      return row;
    }));
  }

  /* ----------------------------------------------------------------- filters */

  document.querySelectorAll('[data-kind]').forEach(chip => chip.addEventListener('click', () => {
    filters.kind = chip.dataset.kind;
    document.querySelectorAll('[data-kind]').forEach(other =>
      other.classList.toggle('is-active', other === chip));
    render();
  }));

  document.querySelectorAll('[data-mode]').forEach(chip => chip.addEventListener('click', () => {
    filters.mode = chip.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(other =>
      other.classList.toggle('is-active', other === chip));
    render();
  }));

  document.getElementById('open-only').addEventListener('change', event => {
    filters.openOnly = event.target.checked;
    render();
  });

  document.getElementById('search').addEventListener('input', event => {
    filters.search = event.target.value.trim().toLowerCase();
    render();
  });

  render();
  renderRegistrations();
})();
