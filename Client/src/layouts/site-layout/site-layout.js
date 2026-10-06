(() => {
  const page = document.body.dataset.page || 'home';
  const root = document.body.dataset.root || '../../../../';
  const paths = {
    home: 'index.html', recovery: 'recovery-plan.html', training: 'training.html',
    garden: 'garden.html', insights: 'insights.html', pricing: 'pricing.html'
  };
  const labels = {
    home: 'Home', recovery: 'Recovery Plan', training: 'Training',
    garden: 'Garden', insights: 'Insights', pricing: 'Pricing'
  };
  const sprout = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27V14m0 4C8 18 5 14 5 6c8 0 11 4 11 12Zm0-4c0-7 4-11 11-11 0 8-3 12-11 12Z"/></svg>';
  const brand = `<a class="ds-brand" href="${root}index.html" aria-label="DeepSprout home"><span class="ds-brand-mark">${sprout}</span><span class="ds-brand-name">Deep<span>Sprout</span><small>Grow into your best days</small></span></a>`;
  const navLinks = Object.keys(paths).map(key => `<a href="${root}${paths[key]}"${key === page ? ' class="active" aria-current="page"' : ''}>${labels[key]}</a>`).join('');
  const headerMount = document.querySelector('[data-site-header]');
  const footerMount = document.querySelector('[data-site-footer]');
  if (headerMount) {
    const action = page === 'training' ? '<button class="ds-nav-action nav-session" type="button" data-session="quick">Quick session <span aria-hidden="true">↗</span></button>'
      : page === 'recovery' ? '<button class="ds-nav-action" type="button" data-open-baseline>Set your goal <span aria-hidden="true">↗</span></button>'
      : page === 'home' ? '<a class="ds-nav-action" href="#start">Get started <span aria-hidden="true">↗</span></a>' : '';
    headerMount.outerHTML = `<header class="site-header ds-header" id="top"><div class="ds-header-inner">${brand}<nav class="ds-nav" id="site-nav" aria-label="Main navigation">${navLinks}</nav><div class="ds-header-actions">${action}<button class="ds-menu-toggle menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"><span></span><span></span><span></span></button></div></div></header>`;
  }
  if (footerMount) {
    footerMount.outerHTML = `<footer class="site-footer ds-footer"><div class="ds-footer-inner">${brand}<nav aria-label="Footer navigation">${navLinks}</nav><span class="ds-footer-note">Grow at your own pace. ${sprout}</span></div><div class="ds-footer-bottom"><span>© ${new Date().getFullYear()} DeepSprout</span><span>Made for more mindful days.</span></div></footer>`;
  }
  const header = document.querySelector('.ds-header');
  const menu = header?.querySelector('.ds-menu-toggle');
  const nav = header?.querySelector('.ds-nav');
  const closeMenu = () => {
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Open menu');
    nav?.classList.remove('open');
  };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('open', open);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
})();
