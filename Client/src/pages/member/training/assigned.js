/**
 * Activities → Assigned — Coach tasks from Institution Initiative groups and
 * independent Coach groups, read from the SAME Assignment, Submission and
 * Review records the Coach, Supervisor and Representative see. Nothing here
 * is copied into the personal journal; personal practice logging stays in
 * the practice cards below.
 */
(() => {
  const host = document.getElementById('assigned-list');
  if (!host) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const fmt = iso => iso ? new Date(String(iso).length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const PRACTICE_SESSION = { depth: 'depth', listening: 'listening', practical: 'challenge', 'protected-work': 'protected' };
  const TONE = { Assigned: 'todo', 'In Progress': 'progress', Submitted: 'waiting', 'Needs Revision': 'revise', Approved: 'done', Rejected: 'rejected' };
  const open = new Set();
  let filter = 'active';

  const repo = () => window.DeepSproutRepo;
  function card(t) {
    const tone = TONE[t.status] || 'todo';
    const canSubmit = t.actionable;
    const expanded = open.has(t.id);
    const history = t.submission?.history || [];
    return `<article class="as-card is-${tone}${t.overdue ? ' is-overdue' : ''}" data-task="${esc(t.id)}">
      <header class="as-head">
        <span class="as-type" aria-hidden="true"><svg><use href="#${{ depth: 'i-book', listening: 'i-headphones', practical: 'i-pencil', 'protected-work': 'i-timer' }[t.practiceType] || 'i-sprout'}"/></svg></span>
        <div><p class="as-context">${esc(t.context.type === 'initiative' ? 'Initiative' : 'Coach program')} · ${esc(t.context.title)} · ${esc(t.groupName)}</p><h3>${esc(t.title)}</h3><p class="as-meta">${esc(t.activity)} · Coach ${esc(t.coach)} · due ${esc(fmt(t.due))}${t.required ? '' : ' · optional'}</p></div>
        <span class="as-status">${esc(t.overdue ? `${t.status} · overdue` : t.status)}</span>
      </header>
      ${t.locked ? `<p class="as-note">${esc(t.cancelReason || t.lockedReason)}</p>` : ''}
      ${t.submission?.feedback && t.submission.status !== 'Submitted' ? `<blockquote class="as-feedback"><strong>Coach feedback</strong>${esc(t.submission.feedback)}</blockquote>` : ''}
      <div class="as-actions">
        <button type="button" class="as-link" data-toggle="${esc(t.id)}" aria-expanded="${expanded}">${expanded ? 'Hide details' : canSubmit ? (t.status === 'Assigned' ? 'Start task' : t.status === 'In Progress' ? 'Continue' : 'Revise & resubmit') : 'Details & history'}</button>
        ${PRACTICE_SESSION[t.practiceType] ? `<button type="button" class="as-link is-quiet" data-practice="${PRACTICE_SESSION[t.practiceType]}">Open the matching practice timer</button>` : ''}
      </div>
      <div class="as-body" ${expanded ? '' : 'hidden'}>
        <p class="as-instructions">${esc(t.instructions)}</p>
        ${t.evidence ? `<p class="as-meta"><strong>Evidence:</strong> ${esc(t.evidence)}</p>` : ''}
        ${canSubmit ? `<form class="as-form" data-submit="${esc(t.id)}"><label><span>${t.status === 'Needs Revision' || t.status === 'Rejected' ? 'Your revised reflection' : 'What did you do, and what did you notice?'}</span><textarea name="text" rows="4" required>${esc(t.status === 'Needs Revision' ? '' : '')}</textarea></label><label class="as-file"><span>Attachment (optional — only its name is kept in this demo)</span><input type="file" name="file"></label><p class="as-error" role="alert" hidden></p><button class="as-button">${t.submission ? 'Resubmit for review' : 'Submit for review'}</button></form>` : ''}
        ${t.status === 'Submitted' ? '<p class="as-note">Submitted. Your Coach reviews it — you’ll see Approved, Needs revision or Rejected here.</p>' : ''}
        ${t.submission ? `<ol class="as-history">${[...history, { text: t.submission.text, status: t.submission.status, feedback: t.submission.feedback, created: t.submission.submitted }].map((h, n) => `<li><span>Attempt ${n + 1} · ${esc(fmt(h.created))}</span><p>${esc(h.text || '')}</p>${h.status && h.status !== 'Submitted' ? `<small>${esc(h.status)}${h.feedback ? ` — ${esc(h.feedback)}` : ''}</small>` : ''}</li>`).join('')}</ol>` : ''}
      </div>
    </article>`;
  }
  function render() {
    const r = repo();
    if (!r) return;
    const me = r.me();
    const section = document.getElementById('assigned');
    if (!me) { section.hidden = true; return; }
    const tasks = r.selectors.assignedTasks(r.read(), me.id);
    section.hidden = !tasks.length && !location.hash.includes('assigned');
    const active = tasks.filter(t => t.actionable);
    const shown = filter === 'active' ? active : tasks;
    document.getElementById('assigned-count').textContent = tasks.length ? `${tasks.filter(t => t.actionable).length} to do · ${tasks.filter(t => t.status === 'Submitted').length} with your Coach · ${tasks.filter(t => t.status === 'Approved').length} approved` : '';
    document.querySelectorAll('[data-assigned-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.assignedFilter === filter)));
    host.innerHTML = tasks.length ? (shown.length ? shown.map(card).join('') : '<p class="as-empty">Everything assigned to you is reviewed. Switch to “Own history” to see earlier work.</p>')
      : '<p class="as-empty">No Coach has assigned you a task yet. When you join an initiative group or a Coach program, tasks appear here.</p>';
  }
  document.addEventListener('click', event => {
    const t = event.target.closest('[data-toggle],[data-practice],[data-assigned-filter]');
    if (!t) return;
    if (t.dataset.assignedFilter) { filter = t.dataset.assignedFilter; render(); return; }
    if (t.dataset.practice) { document.querySelector(`.practice-start[data-session="${t.dataset.practice}"]`)?.click(); return; }
    const id = t.dataset.toggle;
    if (open.has(id)) open.delete(id); else {
      open.add(id);
      const task = repo().selectors.assignedTasks(repo().read(), repo().me().id).find(x => x.id === id);
      if (task?.status === 'Assigned' && !task.locked) { try { repo().run('member.task.start', { id }); } catch { /* starting is a convenience */ } }
    }
    render();
    host.querySelector(`[data-task="${CSS.escape(id)}"] textarea`)?.focus();
  });
  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-submit]');
    if (!form) return;
    event.preventDefault();
    const error = form.querySelector('.as-error');
    try {
      repo().run('member.task.submit', { assignmentId: form.dataset.submit, text: form.elements.text.value, file: form.elements.file.files?.[0]?.name || '' });
      open.add(form.dataset.submit);
      render();
    } catch (e) { error.textContent = e.message; error.hidden = false; }
  });
  const start = () => { render(); window.addEventListener('deepsprout:repo', render); if (location.hash === '#assigned') document.getElementById('assigned')?.scrollIntoView({ block: 'start' }); };
  if (window.DeepSproutRepo) start(); else window.addEventListener('deepsprout:repo-ready', start, { once: true });
})();
