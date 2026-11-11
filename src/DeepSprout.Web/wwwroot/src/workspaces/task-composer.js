/**
 * Live summary for the Coach's “Assign a task” composer: who the task goes
 * to, when it is due and how many files travel with it. Reads the form's own
 * controls, so the summary can never disagree with what is sent.
 */
import {esc, icon, fmtDay} from '../shared/task-kit.js';

const doc = typeof document === 'undefined' ? null : document;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function update(root) {
  let data = {groups:{}};
  try { data = JSON.parse(root.dataset.composer || '{}'); } catch { /* keep defaults */ }
  const form = root.closest('form') || root;
  const audience = form.querySelector('[name=audience]:checked')?.value || 'group';
  const due = form.querySelector('[name=due]')?.value;
  const files = form.querySelector('[name=attachments]')?.files?.length || 0;
  let who = '', ready = true;
  if (audience === 'group') {
    const g = data.groups[form.querySelector('[name=groupId]')?.value];
    ready = Boolean(g);
    who = g ? `Goes to <b>${plural(g.count, 'student')}</b> in ${esc(g.name)}` : 'Choose a group';
  } else if (audience === 'students') {
    const n = form.querySelector('[name=studentIds]')?.selectedOptions.length || 0;
    ready = n > 0;
    who = n ? `Goes to <b>${plural(n, 'chosen student')}</b>` : 'Choose at least one student';
  } else {
    const picked = [...form.querySelectorAll('[name=groupIds]:checked')].map(x => data.groups[x.value]).filter(Boolean);
    ready = picked.length > 0;
    who = picked.length ? `Goes to <b>${plural(picked.reduce((n, g) => n + g.count, 0), 'student')}</b> in ${plural(picked.length, 'group')}` : 'Choose at least one group';
  }
  const bits = [who, due ? `due ${esc(fmtDay(due))}` : '', files ? plural(files, 'file') : ''].filter(Boolean).join(' · ');
  const summary = form.querySelector('[data-tc-summary]');
  if (summary) { summary.innerHTML = `${icon(ready ? 'send' : 'clock')}<span>${bits}</span>`; summary.classList.toggle('is-incomplete', !ready); }
}

if (doc) {
  const handle = e => { const root = e.target.closest?.('form')?.querySelector('[data-composer]'); if (root) update(root); };
  doc.addEventListener('change', handle);
  doc.addEventListener('input', handle);
}
