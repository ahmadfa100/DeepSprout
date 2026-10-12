(() => {
  const mount = document.querySelector('[data-auth-footer]');
  if (!mount) return;
  const root = document.body.dataset.root || '../../../../';

  mount.outerHTML = `<footer class="auth-footer">
    <div class="auth-footer-inner">
      <div class="auth-footer-top">
        <div class="auth-footer-about">
          <a class="auth-footer-mark" href="${root}index.html" aria-label="DeepSprout home"><img src="${root}assets/brand/floral-mark.png" alt=""></a>
          <div class="auth-footer-about-copy">
            <a class="auth-footer-name" href="${root}index.html">DeepSprout</a>
            <p>Helping you reduce distraction,<br>build better habits, and grow a calmer,<br>stronger you.</p>
            <div class="auth-footer-social" aria-label="Social links">
              <button type="button" data-auth-info="GitHub" aria-label="DeepSprout on GitHub"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.21.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.64-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.58 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.32.68.94.68 1.9v2.81c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg></button>
              <button type="button" data-auth-info="LinkedIn" aria-label="DeepSprout on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 2H3.6C2.72 2 2 2.72 2 3.6v16.8c0 .88.72 1.6 1.6 1.6h16.8c.88 0 1.6-.72 1.6-1.6V3.6c0-.88-.72-1.6-1.6-1.6ZM8 18.6H5V9h3v9.6ZM6.5 7.7a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Zm12.1 10.9h-3v-4.67c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.75h-3V9h2.88v1.31h.04c.4-.76 1.38-1.55 2.84-1.55 3.04 0 3.6 2 3.6 4.6v5.24Z"/></svg></button>
              <button type="button" data-auth-info="YouTube" aria-label="DeepSprout on YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.1a2.9 2.9 0 0 0-2-2.1C17.8 4.5 12 4.5 12 4.5s-5.8 0-7.6.5a2.9 2.9 0 0 0-2 2.1A30.5 30.5 0 0 0 2 12a30.5 30.5 0 0 0 .4 4.9 2.9 2.9 0 0 0 2 2.1c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.9 2.9 0 0 0 2-2.1A30.5 30.5 0 0 0 22 12a30.5 30.5 0 0 0-.4-4.9ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg></button>
              <button type="button" data-auth-info="X" aria-label="DeepSprout on X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-7.5L5.5 22H2.3l7.3-8.5L2 2h6.3l4.3 6.8L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z"/></svg></button>
            </div>
          </div>
        </div>
        <nav class="auth-footer-column" aria-label="Product links"><h2>Product</h2><a href="${root}src/pages/public/landing/home.html#discover">Features</a><a href="${root}src/pages/public/landing/home.html#how">How it works</a><a href="${root}pricing.html">For Individuals</a><button type="button" data-auth-info="For Mentors">For Mentors</button></nav>
        <nav class="auth-footer-column" aria-label="Resources"><h2>Resources</h2><button type="button" data-auth-info="Privacy Policy">Privacy Policy</button><button type="button" data-auth-info="Terms of Service">Terms of Service</button><button type="button" data-auth-info="Contact">Contact</button><button type="button" data-auth-info="Help & Support">Help &amp; Support</button></nav>
      </div>
      <div class="auth-footer-bottom"><p>© 2025 DeepSprout. All rights reserved by <button type="button" data-auth-info="Ahmad">Ahmad.</button> <svg class="external-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4h8v8m0-8-9 9M19 13v6H5V5h6"/></svg></p><span class="auth-footer-signoff"><svg viewBox="0 0 28 32" aria-hidden="true"><path d="M3 29C3 13 11 5 25 3c-1 14-8 23-22 26Zm0 0c5-9 11-15 18-19"/></svg>Grow together.</span></div>
    </div>
  </footer>`;
})();
