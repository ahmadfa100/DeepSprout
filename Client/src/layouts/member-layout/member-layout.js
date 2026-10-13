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
    ['insights', 'Insights', 'src/pages/member/insights/insights.html', 'insights.svg'],
    ['community', 'Community', 'src/pages/member/community/community.html', 'community.svg']
  ];
  const links = items.map(([key, label, path, glyph]) =>
    `<a href="${root}${path}"${page === key ? ' aria-current="page"' : ''}>${icon(`icons/${glyph}`)}<span>${label}</span></a>`
  ).join('');
  const headerMount = document.querySelector('[data-site-header]');
  if (headerMount) headerMount.outerHTML = `<header class="member-header" id="top">
    <div class="member-header-inner">
      <a class="member-brand" href="${root}index.html" aria-label="DeepSprout home">${brandLogo}<strong>DeepSprout</strong></a>
      <nav class="member-nav" id="member-nav" aria-label="Member navigation">${links}</nav>
      <div class="member-header-actions">
        <div class="member-notifications"><button class="member-icon-button" type="button" aria-label="Notifications" aria-expanded="false" aria-controls="member-notification-panel">${icon('icons/bell.svg')}<span class="member-alert-dot"></span></button><div class="member-popover" id="member-notification-panel" hidden><strong>Notifications</strong><p>You’re all caught up for now.</p></div></div>
        <details class="member-account"><summary><span class="member-avatar">A</span><span>Ahmad</span>${icon('icons/chevron-down.svg')}</summary><div class="member-account-menu"><a href="${root}index.html">Home</a><a href="${root}login.html">Log in page</a></div></details>
        <button class="member-menu-toggle" type="button" aria-label="Open navigation" aria-controls="member-nav" aria-expanded="false">${icon('icons/menu.svg')}</button>
      </div>
    </div>
  </header>`;
  const footerMount = document.querySelector('[data-site-footer]');
  if (footerMount) footerMount.outerHTML = `<footer class="member-footer"><div class="member-footer-inner">
    <div class="member-footer-grid"><div class="member-footer-about">${brandLogo}<div><strong>DeepSprout</strong><p>Helping you reduce distraction,<br>build better habits, and grow a calmer,<br>stronger you.</p><div class="member-social" aria-label="Social platforms"><span title="GitHub">${icon('icons/github.svg')}</span><span title="LinkedIn">${icon('icons/linkedin.svg')}</span><span title="YouTube">${icon('icons/youtube.svg')}</span><span title="X">${icon('icons/x-social.svg')}</span></div></div></div>
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

})();
