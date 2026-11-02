/**
 * People picker: a styled dropdown (avatars, search, filters) layered over a
 * real <select>. The select stays the source of truth: forms read it, module
 * `change` handlers receive its change event, and keyboard/test tools can
 * still drive it. Also wires drag-and-drop of student chips onto groups, which
 * simply sets the student's allocation select.
 *
 * Markup comes from `picker()` in pages/institution/common.js.
 */
const open = new Set();
const doc = typeof document === 'undefined' ? null : document; // importable outside a browser
const native = root => root.querySelector('select.iw-picker-native');
const options = root => [...root.querySelectorAll('[role=option]')];

function close(root, focus = false) {
  root.classList.remove('is-open');
  root.querySelector('.iw-picker-trigger')?.setAttribute('aria-expanded', 'false');
  const panel = root.querySelector('.iw-picker-panel'); if (panel) panel.hidden = true;
  open.delete(root);
  if (focus) root.querySelector('.iw-picker-trigger')?.focus();
}
function closeAll(except) { for (const root of [...open]) if (root !== except) close(root); }
function openPicker(root) {
  closeAll(root);
  root.classList.add('is-open'); open.add(root);
  root.querySelector('.iw-picker-trigger').setAttribute('aria-expanded', 'true');
  const panel = root.querySelector('.iw-picker-panel'); panel.hidden = false;
  // Open upwards when there is no room below (not for inline dialog panels).
  if (!root.classList.contains('is-inline')) { const r = root.getBoundingClientRect(); root.classList.toggle('opens-up', innerHeight - r.bottom < 300 && r.top > 320); }
  (root.querySelector('.iw-picker-search') || root.querySelector('[role=option][aria-selected=true]') || options(root)[0])?.focus();
}

/** Re-draw the trigger from the select's current value(s). */
export function syncPicker(root) {
  const select = native(root), multiple = select.multiple, chosen = [...select.selectedOptions].filter(o => o.value);
  options(root).forEach(o => o.setAttribute('aria-selected', String(chosen.some(c => c.value === o.dataset.value))));
  const summary = root.querySelector('.iw-picker-summary');
  if (!summary || root.dataset.static === 'true') return;
  if (!chosen.length) { summary.innerHTML = `<span class="iw-picker-placeholder">${root.dataset.placeholder || 'Choose…'}</span>`; return; }
  if (!multiple) { const o = root.querySelector(`[role=option][data-value="${CSS.escape(chosen[0].value)}"] .iw-opt-body`); summary.innerHTML = o ? o.innerHTML : chosen[0].textContent; return; }
  const avatars = chosen.slice(0, 4).map(c => root.querySelector(`[role=option][data-value="${CSS.escape(c.value)}"] .avatar`)?.outerHTML || '').join('');
  summary.innerHTML = `<span class="iw-avatar-stack">${avatars}</span><span class="iw-picker-count">${chosen.length} ${chosen.length === 1 ? root.dataset.one || 'selected' : root.dataset.many || 'selected'}</span>`;
}

function choose(root, option) {
  const select = native(root), value = option.dataset.value;
  if (select.multiple) {
    const o = [...select.options].find(x => x.value === value); o.selected = !o.selected;
    syncPicker(root); select.dispatchEvent(new Event('change', {bubbles:true}));
    return;
  }
  const changed = select.value !== value;
  select.value = value; syncPicker(root); close(root, true);
  if (changed) select.dispatchEvent(new Event('change', {bubbles:true}));
}

function filter(root) {
  const q = (root.querySelector('.iw-picker-search')?.value || '').trim().toLowerCase();
  const tag = root.querySelector('.iw-picker-filters [aria-pressed=true]')?.dataset.tag || '';
  let shown = 0;
  options(root).forEach(o => { const ok = (!q || o.dataset.search.includes(q)) && (!tag || (o.dataset.tags || '').split('|').includes(tag)); o.hidden = !ok; if (ok) shown++; });
  const none = root.querySelector('.iw-picker-none'); if (none) none.hidden = shown > 0;
}

doc?.addEventListener('click', e => {
  const trigger = e.target.closest('.iw-picker-trigger');
  if (trigger) { const root = trigger.closest('[data-picker]'); root.classList.contains('is-open') ? close(root) : openPicker(root); return; }
  const option = e.target.closest('.iw-picker [role=option]');
  if (option) { choose(option.closest('[data-picker]'), option); return; }
  const chip = e.target.closest('.iw-picker-filters button');
  if (chip) { chip.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === chip))); filter(chip.closest('[data-picker]')); return; }
  if (e.target.closest('.iw-picker-done')) { close(e.target.closest('[data-picker]'), true); return; }
  if (e.target.closest('.iw-picker-clear')) { const root = e.target.closest('[data-picker]'); [...native(root).options].forEach(o => { o.selected = false; }); syncPicker(root); return; }
  if (!e.target.closest('[data-picker]')) closeAll();
});
doc?.addEventListener('input', e => { if (e.target.matches('.iw-picker-search')) filter(e.target.closest('[data-picker]')); });
doc?.addEventListener('keydown', e => {
  const root = e.target.closest?.('[data-picker]'); if (!root) return;
  if (e.key === 'Escape' && root.classList.contains('is-open')) { e.preventDefault(); e.stopPropagation(); close(root, true); return; }
  if (e.key === 'ArrowDown' && !root.classList.contains('is-open') && e.target.matches('.iw-picker-trigger')) { e.preventDefault(); openPicker(root); return; }
  if (!['ArrowDown','ArrowUp'].includes(e.key) || !root.classList.contains('is-open')) return;
  e.preventDefault();
  const list = options(root).filter(o => !o.hidden), at = list.indexOf(document.activeElement);
  (list[e.key === 'ArrowDown' ? Math.min(list.length - 1, at + 1) : Math.max(0, at - 1)] || list[0])?.focus();
}, true);

/* Drag a student chip onto a group card (or back to the waiting strip). */
let dragged = null;
doc?.addEventListener('dragstart', e => {
  const chip = e.target.closest?.('[data-drag-person]'); if (!chip) return;
  dragged = chip.dataset.dragPerson; e.dataTransfer.setData('text/plain', dragged); e.dataTransfer.effectAllowed = 'move';
  chip.classList.add('is-dragging'); document.body.classList.add('iw-dragging');
});
doc?.addEventListener('dragend', e => { e.target.closest?.('[data-drag-person]')?.classList.remove('is-dragging'); document.body.classList.remove('iw-dragging'); document.querySelectorAll('.is-drop-over').forEach(n => n.classList.remove('is-drop-over')); dragged = null; });
doc?.addEventListener('dragover', e => {
  const zone = e.target.closest?.('[data-drop-group]'); if (!zone || !dragged) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.is-drop-over').forEach(n => n !== zone && n.classList.remove('is-drop-over')); zone.classList.add('is-drop-over');
});
doc?.addEventListener('drop', e => {
  const zone = e.target.closest?.('[data-drop-group]'); if (!zone || !dragged) return;
  e.preventDefault(); zone.classList.remove('is-drop-over');
  const select = document.querySelector(`select[data-action=allocate][data-person="${CSS.escape(dragged)}"]`);
  if (select && select.value !== zone.dataset.dropGroup) { select.value = zone.dataset.dropGroup; select.dispatchEvent(new Event('change', {bubbles:true})); }
});

/** Call after content renders (page or dialog). */
export function mountPickers(scope = document) { scope.querySelectorAll('[data-picker]').forEach(syncPicker); }
