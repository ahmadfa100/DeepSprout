(() => {
  const page = document.body.dataset.page || 'home';
  const root = document.body.dataset.root || '../../../../';
  const paths = {
    home: 'index.html', recovery: 'recovery-plan.html', training: 'training.html',
    garden: 'garden.html', insights: 'insights.html', pricing: 'pricing.html', login: 'login.html'
  };
  const labels = {
    home: 'Home', recovery: 'Recovery Plan', training: 'Training',
    garden: 'Garden', insights: 'Insights', pricing: 'Pricing', login: 'Log in'
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
    if (page === 'login') {
      footerMount.outerHTML = `<footer class="site-footer ds-auth-footer"><a class="ds-auth-footer-brand" href="${root}index.html"><img src="${root}assets/auth/deepsprout-floral-mark.png" alt=""><span><strong>DeepSprout</strong><small>A calmer, stronger you</small></span></a><nav aria-label="Footer navigation"><a href="${root}index.html#how">About</a><button type="button" data-auth-info="Privacy">Privacy</button><button type="button" data-auth-info="Terms">Terms</button><button type="button" data-auth-info="Contact">Contact</button></nav><div class="ds-auth-footer-social"><button type="button" data-auth-info="GitHub" aria-label="DeepSprout on GitHub"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.21.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.64-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.32.68.94.68 1.9v2.81c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg></button><button type="button" data-auth-info="LinkedIn" aria-label="DeepSprout on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.4 2H3.6C2.72 2 2 2.72 2 3.6v16.8c0 .88.72 1.6 1.6 1.6h16.8c.88 0 1.6-.72 1.6-1.6V3.6c0-.88-.72-1.6-1.6-1.6ZM8 18.6H5V9h3v9.6ZM6.5 7.7a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Zm12.1 10.9h-3v-4.67c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.75h-3V9h2.88v1.31h.04c.4-.76 1.38-1.55 2.84-1.55 3.04 0 3.6 2 3.6 4.6v5.24Z"/></svg></button></div><div class="ds-auth-footer-signoff"><svg viewBox="0 0 24 30" aria-hidden="true"><path d="M3 25C3 11 9 4 21 2c-1 11-5 20-18 23Zm0 0c3-9 8-14 14-18" fill="#86c864" stroke="#173f39" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Grow together.</span></div></footer>`;
    } else {
      footerMount.outerHTML = `<footer class="site-footer ds-footer"><div class="ds-footer-inner">${brand}<nav aria-label="Footer navigation">${navLinks}</nav><span class="ds-footer-note">Grow at your own pace. ${sprout}</span></div><div class="ds-footer-bottom"><span>© ${new Date().getFullYear()} DeepSprout</span><span>Made for more mindful days.</span></div></footer>`;
    }
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
