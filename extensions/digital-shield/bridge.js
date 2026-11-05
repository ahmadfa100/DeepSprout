/* Isolated-world relay. No privileged external runtime listener or guessed extension ID. */
(() => {
  if (window.top !== window || !['http://127.0.0.1:8897', 'http://localhost:8897'].includes(location.origin)) return;
  const commands = new Set(['hello', 'pair', 'status', 'ack', 'disconnect', 'protect', 'stop', 'reminder']);
  let active = 0;
  window.addEventListener('message', async e => {
    const m = e.data;
    if (e.source !== window || e.origin !== location.origin || m?.channel !== 'deepsprout-shield-request' || !commands.has(m.command) || m.protocol !== 1 || typeof m.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(m.id) || JSON.stringify(m).length > 12000 || active >= 4) return;
    active++;
    let response;
    try { response = await chrome.runtime.sendMessage(m); }
    catch { response = {ok:false,error:'Extension disconnected. Reload the extension, then reload this page.'}; }
    finally { active--; }
    window.postMessage({channel:'deepsprout-shield-response', protocol:1, id:m.id, ...response}, location.origin);
  });
})();
