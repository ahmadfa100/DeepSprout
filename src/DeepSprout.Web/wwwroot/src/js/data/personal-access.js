/** Canonical subject boundary shared by first-run state and private journals. */
(() => {
  if (window.DeepSproutPersonal) return;
  const graphKey = 'deepsprout-ecosystem-demo-v1';
  const person = () => {
    const graph = JSON.parse(localStorage.getItem(graphKey) || 'null');
    return graph?.people?.find(p => p.id === graph.session?.personId) || null;
  };
  const subject = () => person()?.id || 'preview';
  const journal = p => !p ? null : p.id==='p-ahmad' && p.journal==='demo' ? 'demo' : p.individual ? `person:${p.id}` : null;
  const failure = message => {
    let notice = document.getElementById('personal-save-error');
    if (!notice && document.body) {
      notice = document.createElement('p'); notice.id = 'personal-save-error';
      notice.setAttribute('role', 'alert');
      notice.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:10000;background:#fff7e5;color:#493d29;padding:16px;border:1px solid #b7a984;border-radius:12px';
      document.body.append(notice);
    }
    if (notice) notice.textContent = message;
  };
  const denied = () => {
    const p = person(); return p && (p.status !== 'Active' || !p.verified || !p.individual);
  };
  const block = message => {
    const render = () => {
      const main = document.querySelector('main');
      if (main) { main.hidden = true; main.inert = true; }
      let notice = document.getElementById('personal-access-notice');
      if (!notice) { notice = document.createElement('section'); notice.id = 'personal-access-notice'; notice.setAttribute('role','alert'); notice.style.cssText='padding:48px;max-width:720px;margin:auto'; document.body.append(notice); }
      notice.replaceChildren();
      const title = document.createElement('h1'); title.textContent = message;
      const link = document.createElement('a');
      link.href = new URL('../../../workspaces.html#/student', document.querySelector('script[src*="personal-access.js"]').src).href;
      link.textContent = 'Return to your workspace to upgrade or continue your Coach work';
      notice.append(title, link);
      if (/Reload/.test(message)) { const reload=document.createElement('button');reload.textContent='Reload this page';reload.onclick=()=>location.reload();notice.append(reload); }

    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, {once:true}); else render();
  };
  const requireAccess = () => {
    if (denied()) { block('Upgrade to an Individual account to open your personal journey.'); throw new Error('An active Individual account is required.'); }
  };
  const assert = expected => {
    if (subject() !== expected) {
      block('Your signed-in identity changed. Reload this page to continue.');
      throw new Error('Your signed-in identity changed. Reload before saving.');
    }
    requireAccess();
  };
  const save = (key, value) => {
    try { localStorage.setItem(key, value); document.getElementById('personal-save-error')?.remove(); }
    catch { const message = 'Your changes could not be saved. Free device storage or allow storage, then try again.'; failure(message); throw new Error(message); }
  };
  const preference = (key, fallback, expected = subject()) => {
    assert(expected);
    const choice = journal(person()) || new URLSearchParams(location.search).get('account') || sessionStorage.getItem('deepsprout-account-choice') || 'demo';
    const events = JSON.parse(localStorage.getItem(`deepsprout-account-changes-v1:${choice}`) || '[]');
    const event = events.slice().reverse().find(event => Object.hasOwn(event.preferences || {},key));
    return event ? event.preferences[key] : JSON.parse(localStorage.getItem(`${key}:person:${expected}`) || 'null') ?? fallback;
  };
  let loadedSubject = subject();
  const changed = () => {
    if (loadedSubject !== subject() && /\/member\//.test(location.pathname)) block('Your signed-in identity changed. Reload this page to continue.');
  };
  window.addEventListener('storage', event => { if (event.key === graphKey || event.key === null) changed(); });
  window.addEventListener('deepsprout:repo', changed);
  window.addEventListener('error', event => { if (/saved|identity changed/.test(event.message)) failure(event.message); });
  window.DeepSproutPersonal = {person, subject, journal, preference, requireAccess, assert, save, failure, denied, rebind: () => { loadedSubject = subject(); }};
})();
