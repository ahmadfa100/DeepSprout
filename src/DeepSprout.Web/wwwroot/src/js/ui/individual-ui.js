/**
 * DeepSprout — Individual experience behaviours.
 *
 * 1. Toggletips. `<button class="ds-help" data-help="…">` opens one shared
 *    bubble. Click, Enter/Space and tap toggle it; Escape, a second click or a
 *    click elsewhere close it. The text is announced through a polite live
 *    region, so screen-reader users hear it without a focus change.
 * 2. Reveal. Elements with `data-reveal` fade up once when they enter the
 *    viewport. Content is visible immediately with reduced motion, without
 *    IntersectionObserver, and before this script runs.
 *
 * Exposed as window.DeepSproutUI. Load with `defer`.
 */
(() => {
  if (window.DeepSproutUI) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  // jsdom and very old engines have no matchMedia: treat them as reduced motion.
  const reduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : {matches: true};

  /* ------------------------------------------------------------ toggletip */
  let panel, live, owner = null;
  const ensure = () => {
    if (panel) return;
    panel = document.createElement('div');
    panel.className = 'ds-help-panel';
    panel.id = 'ds-help-panel';
    panel.hidden = true;
    live = document.createElement('div');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    panel.append(live);
    document.body.append(panel);
  };
  const place = button => {
    const box = button.getBoundingClientRect(), tip = panel.getBoundingClientRect();
    const x = Math.max(12, Math.min(innerWidth - tip.width - 12, box.left + box.width / 2 - tip.width / 2));
    const below = box.bottom + 10, above = box.top - tip.height - 10;
    const y = below + tip.height < innerHeight - 8 || above < 8 ? below : above;
    panel.style.setProperty('--x', `${Math.round(x)}px`);
    panel.style.setProperty('--y', `${Math.round(y)}px`);
  };
  const close = ({restore = false} = {}) => {
    if (!owner) return;
    owner.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    panel.hidden = true;
    live.textContent = '';
    if (restore) owner.focus();
    owner = null;
  };
  const open = button => {
    ensure();
    if (owner && owner !== button) close();
    owner = button;
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-controls', 'ds-help-panel');
    panel.hidden = false;
    const title = button.dataset.helpTitle;
    // Re-set the text so the live region announces it each time it opens.
    live.innerHTML = '';
    requestAnimationFrame(() => {
      live.innerHTML = `${title ? `<strong>${esc(title)}</strong>` : ''}${esc(button.dataset.help)}`;
      place(button);
      panel.classList.add('is-open');
    });
  };
  document.addEventListener('click', event => {
    const button = event.target.closest('.ds-help[data-help]');
    if (button) { event.preventDefault(); owner === button ? close() : open(button); return; }
    if (owner && !event.target.closest('.ds-help-panel')) close();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && owner) close({restore: true}); });
  addEventListener('resize', () => owner && place(owner));
  addEventListener('scroll', () => owner && place(owner), {passive: true});

  /** Markup for a help button. `label` names what it explains. */
  const help = (label, text, title = '') =>
    `<button type="button" class="ds-help" aria-expanded="false" aria-label="About ${esc(label)}" data-help="${esc(text)}"${title ? ` data-help-title="${esc(title)}"` : ''}><span aria-hidden="true">?</span></button>`;

  /* --------------------------------------------------------------- reveal */
  let observer = null;
  const reveal = (scope = document) => {
    const items = [...scope.querySelectorAll('[data-reveal]:not(.is-in)')];
    if (reduced.matches || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return; }
    document.documentElement.classList.add('ds-motion');
    observer ||= new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }), {rootMargin: '0px 0px -8% 0px', threshold: .08});
    items.forEach(el => observer.observe(el));
  };

  window.DeepSproutUI = {help, reveal, closeHelp: close, esc};
})();
