/**
 * Activities → Assigned — Coach tasks from Institution Initiative groups and
 * independent Coach groups, read from the SAME Assignment, Submission and
 * Review records the Coach, Supervisor and Representative see. Nothing here
 * is copied into the personal journal; personal practice logging stays in
 * the practice cards below.
 *
 * The list itself (to-do items, files, drop zone, evaluation) is drawn by the
 * shared task kit (`window.DeepSproutRepo.taskKit`), the same one the Coach
 * and Student workspaces use.
 */
(() => {
  const host = document.getElementById('assigned-list');
  if (!host) return;
  const PRACTICE_SESSION = { depth: 'depth', listening: 'listening', practical: 'challenge', 'protected-work': 'protected' };
  const repo = () => window.DeepSproutRepo;

  function render() {
    const r = repo();
    if (!r) return;
    const me = r.me();
    const section = document.getElementById('assigned');
    if (!me) { section.hidden = true; return; }
    const tasks = r.selectors.assignedTasks(r.read(), me.id);
    section.hidden = !tasks.length && !location.hash.includes('assigned');
    document.getElementById('assigned-count').textContent = tasks.length ? `${tasks.filter(t => t.actionable).length} to do · ${tasks.filter(t => t.status === 'Submitted').length} with your Coach · ${tasks.filter(t => t.status === 'Approved').length} approved` : '';
    const kit = r.taskKit;
    host.innerHTML = kit.todoBoard(tasks, { today: r.today(), criteria: r.review.criteria, levels: r.review.levels, key: 'member-assigned',
      emptyText: 'No Coach has assigned you a task yet. When you join an initiative group or a Coach program, tasks appear here.' });
    // A personal practice that matches the task type sits beside it, never inside it.
    host.querySelectorAll('[data-tk-item]').forEach(item => {
      const t = tasks.find(x => x.id === item.dataset.tkItem), session = PRACTICE_SESSION[t?.practiceType];
      if (session && t.actionable) item.querySelector('.tk-brief')?.insertAdjacentHTML('beforeend', `<button type="button" class="tk-btn is-quiet" data-practice="${session}">Open a separate personal practice</button>`);
    });
  }

  document.addEventListener('click', event => {
    const t = event.target.closest('[data-practice]');
    if (t && host.contains(t)) document.querySelector(`.practice-start[data-session="${t.dataset.practice}"]`)?.click();
  });
  // Opening a task you have not started marks it in progress (a convenience; never required).
  document.addEventListener('toggle', event => {
    const item = event.target.closest?.('[data-tk-item]');
    if (!item || !item.open || !host.contains(item)) return;
    const id = item.dataset.tkItem, task = repo()?.selectors.assignedTasks(repo().read(), repo().me()?.id).find(x => x.id === id);
    if (task?.status === 'Assigned' && !task.locked) { try { repo().run('member.task.start', { id }); } catch { /* starting is a convenience */ } }
    item.querySelector('textarea')?.focus({ preventScroll: true });
  }, true);
  document.addEventListener('submit', async event => {
    const form = event.target.closest('[data-tk-submit]');
    if (!form || !host.contains(form)) return;
    event.preventDefault();
    const error = form.querySelector('.tk-form-error'), button = form.querySelector('button[type=submit]');
    const r = repo(), kit = r.taskKit, text = form.elements.text.value;
    error.textContent = '';
    if (!text.trim() && !form.querySelector('.tk-drop-input')?.files?.length) { error.textContent = 'Write a short reflection or attach a file.'; return; }
    button.disabled = true; form.classList.add('is-sending');
    let files = [];
    try {
      files = await kit.saveFormFiles(form, r.me()?.id, 'submission');
      r.run('member.task.submit', { assignmentId: form.dataset.tkSubmit, text, files });
      kit.openTasks.add(form.dataset.tkSubmit);
      render();
    } catch (e) {
      await Promise.all(files.map(f => r.attachments.remove(f.id).catch(() => {})));
      error.textContent = e.message; button.disabled = false; form.classList.remove('is-sending');
    }
  });
  const start = () => { render(); window.addEventListener('deepsprout:repo', render); if (location.hash === '#assigned') document.getElementById('assigned')?.scrollIntoView({ block: 'start' }); };
  if (window.DeepSproutRepo) start(); else window.addEventListener('deepsprout:repo-ready', start, { once: true });
})();
