(() => {
  const root = document.body.dataset.root || '../../../../';
  const page = document.body.dataset.page || 'home';
  const asset = path => `${root}assets/home-kit/${path}`;
  const icon = (path, alt = '') => `<img src="${asset(path)}" alt="${alt}">`;
  const brandLogo = `<img src="${root}src/assets/logo/Image.png" alt="">`;
  const items = [
    ['recovery', 'Roadmap', 'src/pages/member/recovery-plan/recovery-plan.html', 'route.svg'],
    ['training', 'Activities', 'src/pages/member/training/training.html', 'activities.svg'],
    ['shield', 'Digital Shield', 'src/pages/member/shield/shield.html', 'shield-plus.svg'],
    ['garden', 'Garden', 'src/pages/member/garden/garden.html', 'sprout.svg'],
    ['lab', 'Lab', 'src/pages/member/lab/lab.html', 'target.svg'],
    ['insights', 'Insights', 'src/pages/member/insights/insights.html', 'insights.svg'],
    ['explore', 'Explore', 'src/pages/member/explore/explore.html', 'plant.svg'],
    ['community', 'Community', 'src/pages/member/community/community.html', 'community.svg']
  ];
  const links = items.map(([key, label, path, glyph]) =>
    `<a href="${root}${path}"${page === key ? ' aria-current="page"' : ''}>${icon(`icons/${glyph}`)}<span>${label}</span></a>`
  ).join('');
  // The header reads the shared journey state when it is loaded, so the
  // account name and the "what's next" notice stay true to where the user is.
  const state = window.DeepSprout?.get();
  const displayName = state?.profile?.name?.trim() || 'Your account';
  const initial = displayName.charAt(0).toUpperCase();
  const next = window.DeepSprout?.nextAction(root);
  const notice = next
    ? `<strong>Next for you</strong><p>${next.why}</p><a class="member-popover-link" href="${next.href}">${next.label} →</a>`
    : `<strong>Notifications</strong><p>You’re all caught up for now.</p>`;

  const headerMount = document.querySelector('[data-site-header]');
  if (headerMount) headerMount.outerHTML = `<header class="member-header" id="top">
    <div class="member-header-inner">
      <a class="member-brand" href="${root}index.html" aria-label="DeepSprout home">${brandLogo}<strong>DeepSprout</strong></a>
      <nav class="member-nav" id="member-nav" aria-label="Member navigation">${links}</nav>
      <div class="member-header-actions">
        <div class="member-notifications"><button class="member-icon-button" type="button" aria-label="Notifications" aria-expanded="false" aria-controls="member-notification-panel">${icon('icons/bell.svg')}<span class="member-alert-dot"></span></button><div class="member-popover" id="member-notification-panel" hidden>${notice}</div></div>
        <details class="member-account"><summary><span class="member-avatar">${initial}</span><span>${displayName}</span>${icon('icons/chevron-down.svg')}</summary><div class="member-account-menu"><a href="${root}index.html">Home</a><a href="${root}src/pages/member/profile/profile.html">Profile &amp; settings</a><a href="${root}src/pages/member/weekly-review/weekly-review.html">Weekly review</a><a href="${root}src/pages/member/explore/explore.html#my-registrations">My registrations</a><a href="${root}src/pages/member/onboarding/onboarding.html">Replay first run</a><a href="${root}login.html">Log in page</a></div></details>
        <button class="member-menu-toggle" type="button" aria-label="Open navigation" aria-controls="member-nav" aria-expanded="false">${icon('icons/menu.svg')}</button>
      </div>
    </div>
  </header>`;
  const footerMount = document.querySelector('[data-site-footer]');
  if (footerMount) footerMount.outerHTML = `<footer class="member-footer"><div class="member-footer-inner">
    <div class="member-footer-grid"><div class="member-footer-about">${brandLogo}<div><strong>DeepSprout</strong><p>Helping you reduce distraction,<br>build better habits, and make room for<br>what you care about.</p><div class="member-social" aria-label="Social platforms"><span title="GitHub">${icon('icons/github.svg')}</span><span title="LinkedIn">${icon('icons/linkedin.svg')}</span><span title="YouTube">${icon('icons/youtube.svg')}</span><span title="X">${icon('icons/x-social.svg')}</span></div></div></div>
    <nav aria-label="Product links"><strong>Product</strong><a href="${root}src/pages/public/landing/home.html#discover">Features</a><a href="${root}hero-reels-lab.html">How it works</a><a href="${root}pricing.html">For Individuals</a><a href="${root}pricing.html">For Mentors</a></nav>
    <nav aria-label="Resources"><strong>Resources</strong><button type="button" data-member-info="Privacy Policy">Privacy Policy</button><button type="button" data-member-info="Terms of Service">Terms of Service</button><button type="button" data-member-info="Contact">Contact</button><button type="button" data-member-info="Help & Support">Help &amp; Support</button></nav></div>
    <div class="member-footer-bottom"><span>© ${new Date().getFullYear()} DeepSprout. All rights reserved by <a class="member-founder" href="https://ahmad-personal-website.netlify.app/" target="_blank" rel="noopener noreferrer">Ahmad. ${icon('icons/external-link.svg')}</a></span><span>${icon('icons/leaf.svg')} Grow together.</span></div>
  </div></footer>`;
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
  const infoDialog = document.createElement('dialog');
  infoDialog.className = 'member-info-dialog';
  infoDialog.innerHTML = '<button type="button" aria-label="Close">×</button><h2></h2><p>This information is not available in the client preview yet.</p>';
  document.body.append(infoDialog);
  infoDialog.querySelector('button').addEventListener('click', () => infoDialog.close());
  document.querySelectorAll('[data-member-info]').forEach(button => button.addEventListener('click', () => {
    infoDialog.querySelector('h2').textContent = button.dataset.memberInfo;
    infoDialog.showModal();
  }));

  // Dev-only switch between the seeded demo account and an empty one. It
  // appears on a local server or with ?dev=1, and shows the demo clock so an
  // audience is never misled about which date the figures are "as of".
  const mountDevSwitch = Account => {
    if (!Account?.devMode()) return;
    Account.load().then(account => {
      const fmt = Account.format;
      const plan = account.plan();
      const clock = account.asOf
        ? `${fmt.date(account.asOf, { weekday: true, year: true })}${plan ? ` · day ${plan.day}` : ''}`
        : `${fmt.date(account.today, { weekday: true, year: true })} · real date`;
      const option = (id, title, note) => `<label class="dev-switch-option"><input type="radio" name="dev-account" value="${id}"${account.id === id ? ' checked' : ''}><span><strong>${title}</strong><small>${note}</small></span></label>`;
      const shell = document.createElement('div');
      shell.className = 'dev-switch';
      shell.innerHTML = `<button class="dev-switch-pill" type="button" aria-expanded="false" aria-controls="dev-switch-panel"><span class="dev-switch-dot" aria-hidden="true"></span><span>Demo data</span><b>${account.seeded ? 'Seeded' : 'Empty'}</b></button>
        <div class="dev-switch-panel" id="dev-switch-panel" role="group" aria-label="Demo data" hidden>
          <p class="dev-switch-eyebrow">Dev only · demo data</p>
          <fieldset class="dev-switch-options" data-active="${account.id}"><legend class="visually-hidden">Account</legend><span class="dev-switch-thumb" aria-hidden="true"></span>
            ${option('demo', 'Ahmad', 'Seeded story')}${option('empty', 'New account', 'Nothing recorded')}
          </fieldset>
          <p class="dev-switch-clock"><span>Clock</span>${clock}</p>
          <p class="dev-switch-note">${account.asOfNote}</p>
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
    const step = account.nextSteps(root)[0];
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
  }).catch(() => { /* Keep the generic label when the data cannot load. */ });

  const withAccount = Account => {
    if (!Account) return;
    showAccountName(Account);
    mountDevSwitch(Account);
  };

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
