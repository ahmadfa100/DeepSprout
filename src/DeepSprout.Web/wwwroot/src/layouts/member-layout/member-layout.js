(() => {
  const root = document.body.dataset.root || '../../../../';
  const page = document.body.dataset.page || 'home';
  const asset = path => `${root}assets/home-kit/${path}`;
  const icon = (path, alt = '') => `<img src="${asset(path)}" alt="${alt}">`;
  const brandLogo = `<img src="${root}assets/brand/logo.png" alt="">`;
  const items = [
    ['recovery', 'Roadmap', 'src/pages/member/recovery-plan/recovery-plan.html', 'route.svg'],
    ['training', 'Activities', 'src/pages/member/training/training.html', 'activities.svg'],
    ['shield', 'Digital Shield', 'src/pages/member/shield/shield.html', 'shield-plus.svg'],
    ['garden', 'Garden', 'src/pages/member/garden/garden.html', 'sprout.svg'],
    ['insights', 'Insights', 'src/pages/member/insights/insights.html', 'insights.svg'],
    ['explore', 'Explore', 'src/pages/member/explore/explore.html', 'plant.svg'],
    ['community', 'Community', 'src/pages/member/community/community.html', 'community.svg'],
    ['pricing', 'Pricing', 'pricing.html', 'calendar.svg']
  ];
  // Display names come from ONE constant (Account.NAMES); a label written as a
  // name key is filled from it, so renaming "Check-in" is a one-line change.
  const NAMES = window.DeepSproutAccount?.NAMES || {};
  const links = items.map(([key, label, path, glyph]) => {
    const text = label === 'checkIn' ? `<span data-name="checkIn">${NAMES.checkIn || ''}</span>` : `<span>${label}</span>`;
    return `<a href="${root}${path}"${page === key ? ' aria-current="page"' : ''}>${icon(`icons/${glyph}`)}${text}</a>`;
  }).join('');
  // Name and notice come from the account record once it loads (see
  // showAccountName below). Until then the header stays neutral, so it never
  // shows another source's name or next step first.
  const displayName = 'Your account';
  const initial = 'Y';
  const notice = '<strong>Notifications</strong><p>Loading…</p>';

  const headerMount = document.querySelector('[data-site-header]');
  if (headerMount) headerMount.outerHTML = `<header class="member-header" id="top">
    <div class="member-header-inner">
      <a class="member-brand" href="${root}index.html" aria-label="DeepSprout home">${brandLogo}<strong>DeepSprout</strong></a>
      <nav class="member-nav" id="member-nav" aria-label="Member navigation">${links}</nav>
      <div class="member-header-actions">
        <div class="member-notifications"><button class="member-icon-button" type="button" aria-label="Notifications" aria-expanded="false" aria-controls="member-notification-panel">${icon('icons/bell.svg')}<span class="member-alert-dot" hidden></span></button><div class="member-popover" id="member-notification-panel" hidden>${notice}</div></div>
        <details class="member-account"><summary><span class="member-avatar">${initial}</span><span>${displayName}</span>${icon('icons/chevron-down.svg')}</summary><div class="member-account-menu"><a href="${root}index.html">Home</a><a href="${root}src/pages/member/profile/profile.html">Profile &amp; settings</a><a class="member-review-link" href="${root}src/pages/member/recovery-plan/recovery-plan.html#adjust">${icon('icons/calendar.svg')}<span>Weekly Review &amp; Plan Adjustments</span><span class="member-review-due" hidden>Due</span></a><a href="${root}src/pages/member/explore/explore.html#my-registrations">My registrations</a><a href="${root}src/pages/member/lab/lab.html">Lab &amp; check-ins</a><a href="#product-guide" data-tour-replay>Help &amp; product guide</a><a href="${root}src/pages/member/onboarding/onboarding.html">Replay first run</a><a href="${root}login.html">Log in page</a></div></details>
        <button class="member-menu-toggle" type="button" aria-label="Open navigation" aria-controls="member-nav" aria-expanded="false">${icon('icons/menu.svg')}</button>
      </div>
    </div>
  </header>`;
  // Footer: working links only, grouped by what they are for. One brand
  // element — a single growth line ending in a leaf.
  const footerLink = (path, label) => `<a href="${root}${path}">${label}</a>`;
  const footerMount = document.querySelector('[data-site-footer]');
  if (footerMount) footerMount.outerHTML = `<footer class="member-footer">
    <div class="member-footer-inner">
      <svg class="member-footer-vine" viewBox="0 0 1180 40" preserveAspectRatio="none" aria-hidden="true">
        <path class="vine-line" d="M0 32 H1080 C1110 32 1124 26 1134 16"/>
        <path class="vine-leaf" d="M1134 16 C1138 4 1152 0 1166 2 C1166 16 1154 24 1134 16 Z"/>
      </svg>
      <div class="member-footer-grid">
        <div class="member-footer-brand">
          <a class="member-footer-logo" href="${root}index.html">${brandLogo}<strong>DeepSprout</strong></a>
          <p>Helping you reduce distraction, build better habits, and make room for what you care about.</p>
        </div>
        <nav aria-label="Your plan"><h2>Your plan</h2>${footerLink('src/pages/member/recovery-plan/recovery-plan.html', 'Roadmap')}${footerLink('src/pages/member/training/training.html', 'Activities')}${footerLink('src/pages/member/shield/shield.html', 'Digital Shield')}${footerLink('src/pages/member/insights/insights.html', 'Insights')}</nav>
        <nav aria-label="Beyond the screen"><h2>Beyond the screen</h2>${footerLink('src/pages/member/garden/garden.html', 'Garden')}${footerLink('src/pages/member/explore/explore.html', 'Explore')}${footerLink('src/pages/member/community/community.html', 'Community')}${footerLink('src/pages/member/weekly-review/weekly-review.html', 'Weekly review')}</nav>
        <nav aria-label="DeepSprout"><h2>DeepSprout</h2>${footerLink('src/pages/public/landing/home.html#discover', 'Features')}${footerLink('hero-reels-lab.html', 'How it works')}${footerLink('pricing.html', 'Plans &amp; pricing')}${footerLink('src/pages/member/profile/profile.html', 'Profile &amp; settings')}</nav>
      </div>
      <div class="member-footer-bottom">
        <span>© 2026 DeepSprout. Created by <a class="member-founder" href="https://ahmad-personal-website.netlify.app/" target="_blank" rel="noopener noreferrer">Ahmad<span class="visually-hidden"> (opens in a new tab)</span> ${icon('icons/external-link.svg')}</a></span>
        <span class="member-footer-sign">Grow together.</span>
      </div>
    </div>
  </footer>`;
  const vine = document.querySelector('.member-footer-vine');
  if (vine && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    vine.classList.add('is-waiting');
    const watch = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      vine.classList.remove('is-waiting');
      watch.disconnect();
    }, { threshold: 0.4 });
    watch.observe(vine);
  }
  const header = document.querySelector('.member-header');
  const toggle = header?.querySelector('.member-menu-toggle');
  const nav = header?.querySelector('.member-nav');
  const closeNav = () => { nav?.classList.remove('open'); toggle?.setAttribute('aria-expanded', 'false'); toggle?.setAttribute('aria-label', 'Open navigation'); };
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
  const noticeButton = header?.querySelector('.member-notifications .member-icon-button');
  const noticePanel = header?.querySelector('#member-notification-panel');
  noticeButton?.addEventListener('click', () => {
    const open = noticePanel.hidden;
    noticePanel.hidden = !open;
    noticeButton.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeNav();
    if (noticePanel) noticePanel.hidden = true;
    noticeButton?.setAttribute('aria-expanded', 'false');
    header?.querySelector('.member-account')?.removeAttribute('open');
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.member-notifications') && noticePanel) { noticePanel.hidden = true; noticeButton?.setAttribute('aria-expanded', 'false'); }
  });
  // Dev-only switch between the seeded demo account and an empty one. It
  // appears on a local server or with ?dev=1, and shows the demo clock so an
  // audience is never misled about which date the figures are "as of".
  const mountDevSwitch = Account => {
    if (!Account?.devMode()) return;
    Account.load().then(account => {
      const fmt = Account.format;
      const plan = account.plan();
      const personal=account.personalClock();
      const clock=`${fmt.date(account.today,{weekday:true,year:true})}${plan?` · day ${plan.day}`:''} · ${personal.source}${personal.seedAsOf?` · original story ${personal.seedAsOf}`:''}`;
      const option = (id, title, note) => `<label class="dev-switch-option"><input type="radio" name="dev-account" value="${id}"${account.id === id ? ' checked' : ''}><span><strong>${title}</strong><small>${note}</small></span></label>`;
      // A journal produced by the presenter's scenario builder is synthetic too.
      const scenario = (() => { try { return JSON.parse(localStorage.getItem('deepsprout-demo-scenarios-v1') || '{}')[Account.person()?.id] || null; } catch { return null; } })();
      const shell = document.createElement('div');
      shell.className = 'dev-switch';
      shell.innerHTML = `<button class="dev-switch-pill" type="button" aria-expanded="false" aria-controls="dev-switch-panel"><span class="dev-switch-dot" aria-hidden="true"></span><span>Demo</span><b>${account.seeded ? 'Seeded' : scenario ? 'Scenario' : 'Empty'}</b></button>
        <div class="dev-switch-panel" id="dev-switch-panel" role="group" aria-label="Demo data" hidden>
          <p class="dev-switch-eyebrow">Dev only · demo data</p>
          <fieldset class="dev-switch-options" data-active="${account.id}"><legend class="visually-hidden">Account</legend><span class="dev-switch-thumb" aria-hidden="true"></span>
            ${option('demo', 'Ahmad', 'Seeded story')}${option('empty', 'New account', 'Nothing recorded')}
          </fieldset>
          <p class="dev-switch-clock"><span>Clock</span>${clock}</p>
          <p class="dev-switch-note">${scenario ? `Synthetic presentation scenario, built ${fmt.date(scenario.builtAt.slice(0, 10), {year: true})} through the real engines. Restore it from the presenter page.` : account.asOfNote}</p>
          <button type="button" class="dev-switch-reset" hidden>Reset demo changes</button>
        </div>`;
      document.body.append(shell);
      const pill = shell.querySelector('.dev-switch-pill');
      const panel = shell.querySelector('.dev-switch-panel');
      const setOpen = open => {
        panel.hidden = !open;
        pill.setAttribute('aria-expanded', String(open));
        shell.classList.toggle('is-open', open);
      };
      pill.addEventListener('click', () => setOpen(panel.hidden));
      shell.querySelectorAll('input[name="dev-account"]').forEach(input => input.addEventListener('change', () => {
        shell.querySelector('.dev-switch-options').dataset.active = input.value;
        // Let the thumb finish its slide before the page reloads.
        setTimeout(() => Account.choose(input.value), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
      }));
      const reset = shell.querySelector('.dev-switch-reset');
      const showReset = () => {
        const count = account.changeCount();
        reset.hidden = !count;
        reset.textContent = `Reset demo changes (${count})`;
      };
      showReset();
      window.addEventListener('deepsprout:account', showReset);
      reset.addEventListener('click', () => { Account.resetChanges(); location.reload(); });
      document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { setOpen(false); pill.focus(); } });
      document.addEventListener('click', event => { if (!shell.contains(event.target)) setOpen(false); });
    }).catch(() => { /* The switch is a dev convenience; a page without data still renders. */ });
  };
  // The header shows the account the page's figures come from, so the name
  // and the data never disagree.
  const showAccountName = Account => Account.load().then(account => {
    const name = account.profile().name?.trim() || 'Your account';
    const summary = document.querySelector('.member-account summary');
    if (!summary) return;
    summary.querySelector('.member-avatar').textContent = name.charAt(0).toUpperCase();
    summary.querySelector('.member-avatar + span').textContent = name;

    // The bell shows the same computed next step the pages show.
    const panel = document.querySelector('#member-notification-panel');
    const dot = document.querySelector('.member-alert-dot');
    const step = account.nextSteps(root).find(item => item.id !== 'review');
    if (!panel) return;
    panel.replaceChildren();
    const title = document.createElement('strong');
    const text = document.createElement('p');
    if (step) {
      title.textContent = 'Next for you';
      text.textContent = step.reason;
      const link = document.createElement('a');
      link.className = 'member-popover-link';
      link.href = step.href;
      link.textContent = `${step.action} →`;
      panel.append(title, text, link);
    } else {
      title.textContent = 'Notifications';
      text.textContent = 'You’re all caught up for now.';
      panel.append(title, text);
    }
    if (dot) dot.hidden = !step;
    paintPersonalReview(account);
    if (!step && panel.querySelector('.member-plan-notice')) { title.remove(); text.remove(); }
  }).catch(() => { /* Keep the generic label when the data cannot load. */ });

  // Personal plan notices live beside the existing bell. Their calendar-day
  // state is scoped to the same person key used by Profile preferences.
  const personalKey = (name, subject) => `${name}:person:${subject}`;
  const readPersonal = key => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
  const savePersonal = (key, value) => { try { (window.DeepSproutPersonal?.save || localStorage.setItem.bind(localStorage))(key, JSON.stringify(value)); } catch { /* storage unavailable: keep the page usable */ } };
  const dayValue = key => { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || ''); return match ? Date.UTC(+match[1], +match[2] - 1, +match[3]) / 86400000 : NaN; };
  const paintPersonalReview = account => {
    const menuLink = document.querySelector('.member-review-link');
    const panel = document.querySelector('#member-notification-panel');
    if (!menuLink || !panel) return;
    const reviewPath = `${root}src/pages/member/weekly-review/weekly-review.html`;
    const adjustPath = `${root}src/pages/member/recovery-plan/recovery-plan.html#adjust`;
    const state = account.recovery();
    const active = !!account.plan() && state && ['Active', 'Maintenance', 'Cycle Review Due'].includes(state.status);
    let due = false, reviewHref = reviewPath;
    if (active && state.nextReview) {
      try { const proposal = account.weeklyProposal(state.nextReview); due = account.todayKey >= proposal.dueOn; reviewHref += `?week=${state.nextReview}`; } catch { /* no eligible review */ }
    }
    menuLink.href = due ? reviewHref : adjustPath;
    menuLink.querySelector('.member-review-due').hidden = !due;
    const subject = window.DeepSproutPersonal?.subject?.() || account.exportRecord().user?.id || account.id;
    const noticeKey = personalKey('deepsprout-plan-notices-v1', subject);
    const prefs = readPersonal(personalKey('deepsprout-preferences', subject));
    const saved = readPersonal(noticeKey);
    const reminderEnabled = prefs.reminders !== false;
    const reviewEnabled = prefs.reviewNudge !== false;
    const daysSinceStart = active ? dayValue(account.todayKey) - dayValue(state.current?.startDate) : 0;
    const lastDay = saved.lastReminderOn || state?.current?.startDate;
    const reminderReady = active && reminderEnabled && daysSinceStart >= 4 && dayValue(account.todayKey) - dayValue(lastDay) >= 4;
    if (reminderReady && !due) { saved.lastReminderOn = account.todayKey; saved.reminder = { id: `plan-check:${account.todayKey}`, read: false, dismissed: false }; savePersonal(noticeKey, saved); }
    if (due && reviewEnabled) {
      const id = `weekly-review:${state.current?.id}:${state.nextReview}`;
      if (saved.review?.id !== id) { saved.review = { id, read: false, dismissed: false }; saved.lastReminderOn = account.todayKey; savePersonal(noticeKey, saved); }
    } else if (saved.review) { delete saved.review; savePersonal(noticeKey, saved); }
    panel.querySelector('.member-plan-notice')?.remove();
    const notice = due && reviewEnabled ? saved.review : !due && reminderEnabled ? saved.reminder : null;
    if (notice && !notice.dismissed) {
      const formal = due && reviewEnabled;
      const block = document.createElement('div'); block.className = 'member-plan-notice';
      block.innerHTML = `<strong>${formal ? 'Your weekly review is ready' : 'Time for a quick plan check-in?'}</strong><p>${formal ? 'Take a quick look at your week and help shape what comes next.' : 'See how your activities are going. You can adjust your plan if something isn’t working for you.'}</p><div><a href="${formal ? reviewHref : adjustPath}">${formal ? 'Start Weekly Review' : 'Review My Plan'}</a><button type="button" aria-label="Dismiss ${formal ? 'weekly review notice' : 'plan check-in reminder'}">Dismiss</button></div>`;
      panel.prepend(block);
      const markRead = () => { notice.read = true; savePersonal(noticeKey, saved); paintPersonalReview(account); };
      block.querySelector('a').addEventListener('click', markRead);
      block.querySelector('button').addEventListener('click', () => { notice.dismissed = true; notice.read = true; savePersonal(noticeKey, saved); paintPersonalReview(account); });
    }
    const dot = document.querySelector('.member-alert-dot');
    if (dot && notice && !notice.read && !notice.dismissed) dot.hidden = false;
    // The dashboard is the first safe place to introduce this feature.
    const coachKey = personalKey('deepsprout-plan-guide-v1', subject);
    const coach = document.querySelector('.member-plan-coach');
    if (page !== 'home' || !active || readPersonal(coachKey).acknowledged) { coach?.remove(); return; }
    if (coach) return;
    const anchor = document.querySelector('.member-header-actions');
    const guide = document.createElement('aside'); guide.className = 'member-plan-coach'; guide.setAttribute('aria-label', 'Find your weekly review and plan adjustments');
    guide.innerHTML = '<strong>Your plan can adapt with you.</strong><p>Open your profile menu to find Weekly Review &amp; Plan Adjustments whenever you want to check your progress or make a change.</p><button type="button">Got it</button>';
    anchor.append(guide);
    guide.querySelector('button').addEventListener('click', () => { savePersonal(coachKey, { acknowledged: true }); guide.remove(); });
  };

  const withAccount = Account => {
    if (!Account) return;
    Account.applyNames(document.querySelector('.member-header') || document);
    showAccountName(Account);
    if(!document.querySelector('script[src*="data/product-tour.js"]')){const tour=document.createElement('script');tour.src=`${root}src/js/data/product-tour.js`;document.head.append(tour);}
    // Any change on the account (a review saved, a name edited) updates the header too.
    window.addEventListener('deepsprout:account', () => showAccountName(Account));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) showAccountName(Account); });
    mountDevSwitch(Account);
  };

  /* ------------------------------------------------ one identity, one bell
     The canonical person (shared with the partner workspaces) and their
     operational notices: application decisions, tasks, reviews, sessions,
     excuses. Notices are local and visible only; no email is sent. */
  const withRepo = callback => {
    if (window.DeepSproutRepo) { callback(window.DeepSproutRepo); return; }
    window.addEventListener('deepsprout:repo-ready', () => callback(window.DeepSproutRepo), { once: true });
    if (!document.querySelector('script[src*="shared/member-bridge.js"]')) {
      const bridge = document.createElement('script');
      bridge.type = 'module';
      bridge.src = `${root}src/shared/member-bridge.js`;
      document.head.append(bridge);
    }
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const linkFor = href => (href ? (/^(https?:|#)/.test(href) ? href : `${root}${href}`) : '');
  const paintIdentity = repo => {
    const me = repo.me();
    const menu = document.querySelector('.member-account-menu');
    const summary = document.querySelector('.member-account summary');
    if (!menu || !summary) return;
    menu.querySelector('.member-identity')?.remove();
    const block = document.createElement('div');
    block.className = 'member-identity';
    const people = repo.individuals();
    const links = repo.workspaceLinks();
    block.innerHTML = `${me ? `<p class="member-identity-who"><small>Signed in as</small><strong>${escapeHtml(me.name)}</strong><span>${escapeHtml(me.email)}</span></p>` : '<p class="member-identity-who"><strong>Not signed in</strong></p>'}
      <a href="${root}src/pages/member/explore/explore.html#my-initiatives">My Initiatives</a><a href="${root}src/pages/member/training/training.html#assigned">Assigned tasks</a>
      ${links.map(link => `<a href="${root}${link.href}">${escapeHtml(link.label)} workspace</a>`).join('')}
      <details class="member-identity-switch"><summary>Switch person (demo)</summary><div>${people.map(p => `<button type="button" data-person="${escapeHtml(p.id)}"${me?.id === p.id ? ' aria-current="true"' : ''}>${escapeHtml(p.name)}</button>`).join('')}<button type="button" data-signout>Sign out on this device</button></div><small>Local demonstration identities — not real authentication.</small></details>`;
    menu.prepend(block);
    if (me) { summary.querySelector('.member-avatar').textContent = me.name.charAt(0).toUpperCase(); summary.querySelector('.member-avatar + span').textContent = me.name.split(' ')[0]; }
    block.querySelectorAll('[data-person]').forEach(button => button.addEventListener('click', () => {
      repo.signInAs(button.dataset.person);
      try { sessionStorage.removeItem('deepsprout-account-choice'); } catch { /* ignore */ }
      location.reload();
    }));
    block.querySelector('[data-signout]')?.addEventListener('click', () => {
      repo.signOut();
      try { sessionStorage.setItem('deepsprout-account-choice', 'empty'); } catch { /* ignore */ }
      location.reload();
    });
  };
  const paintNotices = repo => {
    const panel = document.querySelector('#member-notification-panel');
    const dot = document.querySelector('.member-alert-dot');
    if (!panel) return;
    panel.querySelector('.member-notices')?.remove();
    const notices = repo.notifications().slice(0, 6);
    if (!notices.length) return;
    const unread = notices.filter(n => !n.read);
    const list = document.createElement('div');
    list.className = 'member-notices';
    list.innerHTML = `<strong>Updates${unread.length ? ` · ${unread.length} new` : ''}</strong><ul>${notices.map(n => `<li class="${n.read ? '' : 'is-unread'}">${n.link ? `<a href="${escapeHtml(linkFor(n.link))}">${escapeHtml(n.text)}</a>` : `<span>${escapeHtml(n.text)}</span>`}<small>${escapeHtml(new Date(n.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</small></li>`).join('')}</ul>${unread.length ? '<button type="button" class="member-notices-read">Mark all as read</button>' : ''}<p class="member-notices-note">Shown in DeepSprout only — no email is sent in this demo.</p>`;
    panel.prepend(list);
    if (dot && unread.length) dot.hidden = false;
    list.querySelector('.member-notices-read')?.addEventListener('click', () => { unread.forEach(n => { try { repo.run('member.notice.read', { id: n.id }); } catch { /* not mine */ } }); paintNotices(repo); });
  };
  /* ------------------------------------------- My initiative (portal)
     Shown only when this Individual holds an Accepted place in a live
     initiative. Opens the Student initiative dashboard with a short
     transition; the dashboard plays the matching arrival. */
  const portalMark = '<svg class="ds-portal-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-9M12 15C6 15 3 11 3 5c6 0 9 3 9 10Zm0-3c0-6 3-9 9-9 0 6-3 9-9 9Z"/></svg>';
  const openPortal = (repo, link) => event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    try { repo.ensureSession(); } catch { /* the dashboard asks the person to sign in */ }
    try { sessionStorage.setItem('deepsprout-initiative-portal', JSON.stringify({ title: link.dataset.title, org: link.dataset.org })); } catch { /* arrival simply skips the animation */ }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    const box = link.getBoundingClientRect();
    const portal = document.createElement('div');
    portal.className = 'ds-portal is-leaving';
    portal.setAttribute('aria-hidden', 'true');
    portal.style.setProperty('--x', `${box.left + box.width / 2}px`);
    portal.style.setProperty('--y', `${box.top + box.height / 2}px`);
    portal.innerHTML = `<div class="ds-portal-inner">${portalMark}<span class="ds-portal-eyebrow">My initiative</span><strong>${escapeHtml(link.dataset.title)}</strong><small>${escapeHtml(link.dataset.org)}</small></div>`;
    document.body.append(portal);
    setTimeout(() => { location.href = link.href; }, 980);
  };
  const paintInitiative = repo => {
    const actions = document.querySelector('.member-header-actions');
    if (!actions) return;
    let entry = null;
    try {
      const me = repo.me();
      entry = me && repo.selectors.myInitiatives(repo.read(), me.id).find(e => e.admission.status === 'Accepted' && !['Cancelled', 'Archived'].includes(e.initiative.status));
    } catch { /* no initiative data on this device */ }
    let link = actions.querySelector('.member-initiative');
    if (!entry) { link?.remove(); return; }
    if (!link) {
      link = document.createElement('a');
      link.className = 'member-initiative';
      actions.prepend(link);
      link.addEventListener('click', openPortal(repo, link));
    }
    link.href = `${root}workspaces.html#/student/dashboard`;
    link.dataset.title = entry.initiative.title;
    link.dataset.org = entry.initiative.organizer || entry.group?.name || '';
    link.setAttribute('aria-label', `Open my initiative dashboard: ${entry.initiative.title}`);
    link.innerHTML = `<span class="member-initiative-dot" aria-hidden="true"></span><svg class="member-initiative-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-9M12 15C6 15 3 11 3 5c6 0 9 3 9 10Zm0-3c0-6 3-9 9-9 0 6-3 9-9 9Z"/></svg><span class="member-initiative-label"><small>My initiative</small><strong>${escapeHtml(entry.initiative.title)}</strong></span><svg class="member-initiative-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>`;
  };
  if (!document.querySelector('link[href*="initiative-portal.css"]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${root}src/styles/initiative-portal.css`;
    document.head.append(css);
  }
  // Returning with the browser's back button restores a page frozen mid-transition.
  window.addEventListener('pageshow', event => { if (event.persisted) document.querySelectorAll('.ds-portal').forEach(node => node.remove()); });

  withRepo(repo => {
    const paint = () => { paintIdentity(repo); paintNotices(repo); paintInitiative(repo); };
    paint();
    window.addEventListener('deepsprout:repo', paint);
    window.addEventListener('deepsprout:account', () => setTimeout(paint, 0));
    // The personal next-step bell repaints after the journal loads; paint again on top of it.
    const later = () => window.DeepSproutAccount?.load().then(() => setTimeout(paint, 0), () => {});
    if (window.DeepSproutAccount) later(); else setTimeout(later, 300);
  });

  // Pages that read account data load account.js themselves, BEFORE this
  // layout script. Only inject it when no copy is on the page at all.
  const accountScript = document.querySelector('script[src*="js/data/account.js"]');
  if (window.DeepSproutAccount) withAccount(window.DeepSproutAccount);
  else if (accountScript) accountScript.addEventListener('load', () => withAccount(window.DeepSproutAccount));
  else {
    const script = document.createElement('script');
    script.src = `${root}src/js/data/account.js`;
    script.addEventListener('load', () => withAccount(window.DeepSproutAccount));
    document.head.append(script);
  }

})();
