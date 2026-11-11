/**
 * Task kit — one look for Coach tasks everywhere they appear: the Coach's
 * pages, the Invited Student workspace and the Individual's Activities →
 * Assigned list. Renderers are pure (task objects come from the
 * `assignedTasks` read model, or the Coach pages' own records); the small
 * document listeners at the bottom add behaviour that needs no page state:
 * the to-do filters, the file drop zone, the star rating, quick feedback and
 * the file viewer.
 *
 * Files are stored in the browser attachment store (see attachments.js); the
 * records only keep {id, name, type, size}.
 */
import * as attachments from './attachments.js';

const doc = typeof document === 'undefined' ? null : document;
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------------------------------------------------------------- icons */

const PATHS = {
  check:'M5 12.5 10 17.5 19.5 7',
  clock:'M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  send:'M4 12 20 4l-5 16-3.5-6.5Z M11.5 13.5 20 4',
  redo:'M4 12a8 8 0 1 0 2.3-5.6 M4 4v4.5h4.5',
  file:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z M14 3v5h5',
  pdf:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z M14 3v5h5 M8.5 15.5h1.2a1.3 1.3 0 0 0 0-2.6H8.5V17 M13 12.9V17h1a2 2 0 0 0 0-4.1Z',
  doc:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z M14 3v5h5 M8.5 12.5h7 M8.5 15.5h7 M8.5 18.5h4',
  sheet:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z M14 3v5h5 M8 12h8v6H8Z M12 12v6 M8 15h8',
  slides:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z M14 3v5h5 M8 12h8v5H8Z',
  image:'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z M4 16l4.5-4.5 4 4 2.5-2.5L20 18 M15.5 9.5a1.5 1.5 0 1 0 0-.01',
  upload:'M12 16V4 M7 9l5-5 5 5 M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  clip:'M20 11.5 12.2 19.3a5 5 0 0 1-7.1-7.1l8.2-8.2a3.3 3.3 0 0 1 4.7 4.7l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4',
  x:'M6 6l12 12 M18 6 6 18',
  down:'M6 9l6 6 6-6',
  download:'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
  person:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  layers:'M12 3 2 8l10 5 10-5Z M2 13l10 5 10-5 M2 17.5l10 5 10-5',
  star:'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z',
  book:'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z M4 19V5 M8 7h7',
  ear:'M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0 M10 9a2 2 0 0 1 4 0',
  pencil:'M4 20h4L19 9l-4-4L4 16Z M13.5 6.5l4 4',
  timer:'M12 8v5l3 2 M9 2h6 M12 4a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  sprout:'M12 21v-9 M12 12C12 7 8 5 4 5c0 4 3 7 8 7Z M12 14c0-4 3-7 8-7 0 4-3 7-8 7'
};
export const icon = (name, cls = '') => `<svg class="tk-icon${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name] || PATHS.sprout}"/></svg>`;
export const practiceIcon = type => ({depth:'book', listening:'ear', practical:'pencil', 'protected-work':'timer'}[type] || 'sprout');

/* ---------------------------------------------------------------- dates */

const day = v => String(v || '').slice(0, 10);
const utc = v => { const [y, m, d] = day(v).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
export const daysBetween = (from, to) => Math.round((utc(to) - utc(from)) / 864e5);
export const fmtDay = v => v ? new Date(`${day(v)}T12:00:00`).toLocaleDateString('en-GB', {day:'numeric', month:'short'}) : '';
export const fmtDate = v => v ? new Date(String(v).length === 10 ? `${v}T12:00:00` : v).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '';

/** A due-date chip whose tone follows urgency. */
export function dueChip(due, today, status = 'Assigned') {
  if (!due) return '';
  if (status === 'Approved') return `<span class="tk-due is-done">${icon('check')}Done</span>`;
  if (status === 'Submitted') return `<span class="tk-due is-sent">${icon('send')}With your Coach</span>`;
  if (status === 'Cancelled') return `<span class="tk-due is-muted">Cancelled</span>`;
  const n = daysBetween(today, due);
  const [tone, text] = n < 0 ? ['is-late', `${plural(-n, 'day')} late`] : n === 0 ? ['is-soon', 'Due today'] : n === 1 ? ['is-soon', 'Due tomorrow'] : n <= 3 ? ['is-soon', `Due in ${n} days`] : ['', `Due ${fmtDay(due)}`];
  return `<span class="tk-due ${tone}" title="Due ${esc(fmtDate(due))}">${icon('clock')}${esc(text)}</span>`;
}

/* ---------------------------------------------------------------- files */

const extOf = name => String(name || '').split('.').pop().toLowerCase();
export function fileKind(ref) {
  const ext = extOf(ref?.name), type = String(ref?.type || '');
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) return 'image';
  if (ext === 'pdf' || type === 'application/pdf') return 'pdf';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
  if (['ppt', 'pptx'].includes(ext)) return 'slides';
  if (['doc', 'docx', 'txt'].includes(ext)) return 'doc';
  return 'file';
}
export const fileSize = n => !n ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const KIND_LABEL = {image:'Image', pdf:'PDF', sheet:'Spreadsheet', slides:'Slides', doc:'Document', file:'File'};

/** One file as a tile that opens the viewer. */
export function fileTile(ref) {
  const kind = fileKind(ref);
  return `<button type="button" class="tk-file is-${kind}" data-task-file="${esc(JSON.stringify(ref))}" aria-label="Open ${esc(ref.name)}">
    <span class="tk-file-icon">${icon(kind === 'file' ? 'file' : kind)}</span>
    <span class="tk-file-text"><b>${esc(ref.name)}</b><small>${esc([KIND_LABEL[kind], fileSize(ref.size)].filter(Boolean).join(' · '))}</small></span>
    <span class="tk-file-open">${icon('download')}</span>
  </button>`;
}
export const fileTiles = (list = [], {cls = ''} = {}) => list.length ? `<div class="tk-files${cls ? ` ${cls}` : ''}">${list.map(fileTile).join('')}</div>` : '';

/** A drop zone over a real multiple file input (the form reads `input.files`). */
export function dropzone({name = 'files', title = 'Drop files here or browse', hint = `${attachments.TASK_RULES.label} · up to ${attachments.TASK_RULES.maxFiles} files, ${Math.round(attachments.TASK_RULES.maxBytes / 1048576)} MB each`, id = ''} = {}) {
  const fid = id || `tk-drop-${name}-${Math.random().toString(36).slice(2, 7)}`;
  return `<div class="tk-dropzone" data-tk-drop>
    <label class="tk-drop" for="${fid}">
      <input id="${fid}" class="tk-drop-input" type="file" name="${esc(name)}" multiple accept="${esc(attachments.TASK_ACCEPT)}">
      <span class="tk-drop-art">${icon('upload')}</span>
      <span class="tk-drop-copy"><b>${esc(title)}</b><small>${esc(hint)}</small></span>
    </label>
    <ul class="tk-picked" aria-live="polite"></ul>
    <p class="tk-drop-error" role="alert" hidden></p>
  </div>`;
}

/* ----------------------------------------------------------- evaluation */

export const RATING_WORDS = ['', 'A start', 'Getting there', 'Good work', 'Great work', 'Outstanding'];
export const starRow = (rating = 0, cls = '') => `<span class="tk-stars-show${cls ? ` ${cls}` : ''}" role="img" aria-label="${rating} of 5 stars">${[1, 2, 3, 4, 5].map(n => `<svg class="${n <= rating ? 'is-on' : ''}" style="--n:${n}" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS.star}"/></svg>`).join('')}</span>`;

/** The evaluation a student (or anyone reading the review) sees. */
export function evaluationView({decision, evaluation, feedback, reviewer = 'Your Coach', at = '', criteria = [], levels = [], fresh = false} = {}) {
  const tone = {Approved:'is-approved', 'Needs Revision':'is-revise', Rejected:'is-rejected'}[decision] || '';
  const seal = {Approved:'Approved', 'Needs Revision':'Revise', Rejected:'Not accepted'}[decision] || decision;
  const crit = evaluation?.criteria ? criteria.filter(([key]) => evaluation.criteria[key]).map(([key, label]) => { const lv = levels.indexOf(evaluation.criteria[key]) + 1; return `<li><span>${esc(label)}</span><span class="tk-level is-lv${lv}" aria-label="${esc(evaluation.criteria[key])}"><i></i><i></i><i></i></span><b>${esc(evaluation.criteria[key])}</b></li>`; }).join('') : '';
  return `<section class="tk-eval ${tone}${fresh ? ' is-fresh' : ''}" aria-label="Coach review">
    <span class="tk-seal" aria-hidden="true"><span>${esc(seal)}</span></span>
    ${evaluation?.rating ? `<div class="tk-eval-score">${starRow(evaluation.rating, 'is-big')}<b>${esc(RATING_WORDS[evaluation.rating])}</b></div>` : ''}
    ${crit ? `<ul class="tk-eval-criteria">${crit}</ul>` : ''}
    ${feedback ? `<blockquote class="tk-eval-quote"><p>${esc(feedback)}</p><footer>${esc(reviewer)}${at ? ` · ${esc(fmtDate(at))}` : ''}</footer></blockquote>` : ''}
  </section>`;
}

/* ------------------------------------------------------------- to-do list */

/** Which tab a student's task sits under. */
export function bucketOf(t) {
  if (t.status === 'Cancelled') return 'closed';
  if (t.status === 'Submitted') return 'waiting';
  if (t.actionable) return 'todo';
  if (['Approved', 'Rejected'].includes(t.status)) return 'done';
  return 'closed';
}
const STATUS_WORD = {Assigned:'To do', 'In Progress':'In progress', Submitted:'With your Coach', 'Needs Revision':'Revise', Approved:'Approved', Rejected:'Not accepted', Cancelled:'Cancelled'};
const AUDIENCE = {you:['person', 'Just for you'], chosen:['people', 'You and a few others'], group:['people', 'Your group'], 'all-groups':['layers', 'Every group']};

function statusMark(t, fresh) {
  const cls = {Assigned:'is-todo', 'In Progress':'is-progress', Submitted:'is-sent', 'Needs Revision':'is-revise', Approved:'is-done', Rejected:'is-rejected', Cancelled:'is-closed'}[t.status] || 'is-todo';
  const inner = t.status === 'Approved' ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="tk-tick" d="M6.5 12.5 10.5 16.5 17.5 8.5"/></svg>` : t.status === 'Submitted' ? icon('send') : t.status === 'Needs Revision' ? icon('redo') : t.status === 'Rejected' ? icon('x') : '';
  return `<span class="tk-mark ${cls}${fresh ? ' is-fresh' : ''}" aria-hidden="true">${inner}</span>`;
}

let seen = null;
const seenSet = () => { if (seen) return seen; try { seen = new Set(JSON.parse(sessionStorage.getItem('tk-celebrated') || '[]')); } catch { seen = new Set(); } return seen; };
function isFresh(t, today) {
  if (t.status !== 'Approved' || !t.submission?.reviewedAt || daysBetween(t.submission.reviewedAt, today) > 3) return false;
  const set = seenSet(), key = t.submission.id + t.submission.reviewedAt;
  if (set.has(key)) return false;
  set.add(key); try { sessionStorage.setItem('tk-celebrated', JSON.stringify([...set].slice(-60))); } catch { /* per-tab nicety only */ }
  return true;
}

/** The expandable to-do item. `opts.form` builds the submission form markup. */
export function todoItem(t, {today, open = false, criteria = [], levels = [], formAttrs = ''} = {}) {
  // data-task / data-toggle / data-submit / .as-instructions are long-standing hooks the browser tests use.
  const bucket = bucketOf(t), fresh = isFresh(t, today), sub = t.submission;
  const [audIcon, audText] = AUDIENCE[t.audience] || AUDIENCE.group;
  const files = (t.attachments || []).length;
  const late = t.overdue && bucket === 'todo';
  const history = sub ? [...(sub.history || []).filter(h => h.text !== undefined || h.files?.length), {text:sub.text, files:sub.files, status:sub.status, created:sub.submitted, attempt:sub.attempt, current:true}] : [];
  const reviewed = sub && sub.status !== 'Submitted' && (sub.feedback || sub.evaluation);
  const form = t.actionable ? `<form class="tk-send" data-tk-submit="${esc(t.id)}" data-submit="${esc(t.id)}" ${formAttrs.replaceAll('{id}', esc(t.id))}>
      <h4>${t.status === 'Needs Revision' || t.status === 'Rejected' ? 'Send a new attempt' : 'Send your work'}</h4>
      <label class="tk-field"><span>${t.status === 'Needs Revision' ? 'What did you change?' : 'What did you do, and what did you notice?'}</span><textarea name="text" rows="4" placeholder="A few honest sentences are enough.">${''}</textarea></label>
      ${dropzone({name:'files', title:'Add a document, PDF or photo'})}
      <p class="tk-form-error form-error" role="alert"></p>
      <div class="tk-send-foot"><small>Write a reflection, attach a file, or both.</small><button class="tk-btn is-primary" type="submit">${icon('send')}<span>${sub ? 'Resubmit for review' : 'Submit for review'}</span></button></div>
    </form>` : '';
  return `<details class="tk-item is-${bucket}${late ? ' is-late' : ''}" data-tk-item="${esc(t.id)}" data-task="${esc(t.id)}" data-bucket="${bucket}" ${open ? 'open' : ''}>
    <summary class="tk-row" data-toggle="${esc(t.id)}">
      ${statusMark(t, fresh)}
      <span class="tk-row-main">
        <span class="tk-row-title">${esc(t.title)}</span>
        <span class="tk-row-meta"><span class="tk-type">${icon(practiceIcon(t.practiceType))}${esc(t.activity)}</span><span>${esc(t.groupName)}</span><span>Coach ${esc(t.coach)}</span>${t.required ? '' : '<span>Optional</span>'}</span>
      </span>
      <span class="tk-row-tags">
        <span class="tk-tag" title="${esc(audText)}">${icon(audIcon)}<span>${esc(audText)}</span></span>
        ${files ? `<span class="tk-tag is-files" title="${plural(files, 'file')} from your Coach">${icon('clip')}<span>${files}</span></span>` : ''}
        ${['In Progress', 'Needs Revision', 'Rejected'].includes(t.status) ? `<span class="tk-status is-${bucket}">${esc(STATUS_WORD[t.status])}</span>` : ''}
        ${dueChip(t.due, today, t.status)}
      </span>
      <span class="tk-chev">${icon('down')}</span>
    </summary>
    <div class="tk-body"><div class="tk-body-inner">
      <div class="tk-brief">
        <h4>What to do</h4>
        <p class="tk-instructions as-instructions">${esc(t.instructions)}</p>
        ${t.evidence ? `<p class="tk-ask">${icon('send')}<span><b>Send back:</b> ${esc(t.evidence)}</span></p>` : ''}
        ${files ? `<h4>From your Coach</h4>${fileTiles(t.attachments)}` : ''}
        ${t.activityId ? `<p class="tk-source">Activity reference ${esc(t.activityId)} · version ${esc(t.activityVersion)}${t.contentVersion ? ` · ${esc(t.contentVersion)}` : ''}</p>` : ''}
        ${t.locked && t.lockedReason ? `<p class="tk-note">${esc(t.cancelReason || t.lockedReason)}</p>` : ''}
        ${(t.changes || []).length ? `<p class="tk-note">${t.changes.map(c => esc(`${c.change}${c.reason ? ` — ${c.reason}` : ''}`)).join(' · ')}</p>` : ''}
      </div>
      <div class="tk-work">
        ${reviewed ? evaluationView({decision:sub.status, evaluation:sub.evaluation, feedback:sub.feedback, reviewer:`Coach ${t.coach}`, at:sub.reviewedAt, criteria, levels, fresh}) : ''}
        ${sub?.status === 'Submitted' ? `<div class="tk-waiting">${icon('send')}<div><b>Sent ${esc(fmtDate(sub.submitted))}</b><p>Coach ${esc(t.coach)} will review it. You’ll see their feedback here.</p></div></div>` : ''}
        ${form}
        ${history.length ? `<h4>${history.length > 1 ? 'Your attempts' : 'What you sent'}</h4><ol class="tk-attempts">${history.map((h, n) => `<li class="${h.current ? 'is-current' : ''}"><span class="tk-attempt-n">${n + 1}</span><div><small>${esc(fmtDate(h.created))}${h.status && !h.current ? ` · ${esc(STATUS_WORD[h.status] || h.status)}` : ''}</small>${h.text ? `<p>${esc(h.text)}</p>` : ''}${fileTiles(h.files || [], {cls:'is-compact'})}</div></li>`).join('')}</ol>` : ''}
      </div>
    </div></div>
  </details>`;
}

let currentFilter = 'todo';
const boards = new Map();
let boardSeq = 0;
/** The whole to-do board: progress, filter tabs and the list (only the chosen tab's items are rendered). */
export function todoBoard(tasks, opts = {}) {
  const {today, open = openTasks, criteria = [], levels = [], formAttrs = '', emptyText = 'No Coach has given you a task yet. When you join a group, tasks appear here.'} = opts;
  const key = opts.key || `b${++boardSeq}`;
  boards.set(key, {tasks, opts:{...opts, key}});
  if (boards.size > 12) boards.delete(boards.keys().next().value);
  if (!tasks.length) return `<div class="tk-board is-empty"><div class="tk-empty">${icon('sprout')}<p>${esc(emptyText)}</p></div></div>`;
  const order = t => [{todo:0, waiting:1, done:2, closed:3}[bucketOf(t)], t.overdue ? 0 : 1, String(t.due)].join('|');
  const list = tasks.slice().sort((a, b) => order(a).localeCompare(order(b)));
  const count = b => list.filter(t => bucketOf(t) === b).length;
  const n = {todo:count('todo'), waiting:count('waiting'), done:count('done'), closed:count('closed')};
  const active = list.filter(t => t.status !== 'Cancelled').length || 1;
  const filter = opts.filter || (currentFilter === 'all' || n[currentFilter] ? currentFilter : n.todo ? 'todo' : n.waiting ? 'waiting' : 'all');
  const shown = list.filter(t => filter === 'all' || bucketOf(t) === filter);
  const late = list.filter(t => t.overdue && bucketOf(t) === 'todo').length;
  const legacy = {todo:'active', all:'all'};
  const tab = (k, label, value) => `<button type="button" role="tab" data-tk-filter="${k}" ${legacy[k] ? `data-assigned-filter="${legacy[k]}"` : ''} aria-selected="${filter === k}">${esc(label)}${value != null ? `<span>${value}</span>` : ''}</button>`;
  return `<div class="tk-board" data-tk-board="${esc(key)}" data-filter="${filter}">
    <div class="tk-progress" aria-label="${n.done} done, ${n.waiting} with your Coach, ${n.todo} to do">
      <div class="tk-progress-copy"><b>${n.todo ? `${plural(n.todo, 'task')} to do` : 'All caught up'}</b><span>${n.done} done · ${n.waiting} with your Coach${late ? ` · <em>${late} late</em>` : ''}</span></div>
      <div class="tk-progress-bar" aria-hidden="true"><i class="is-done" style="--w:${n.done / active * 100}%"></i><i class="is-sent" style="--w:${n.waiting / active * 100}%"></i></div>
    </div>
    <div class="tk-tabs" role="tablist" aria-label="Show tasks">${tab('todo', 'To do', n.todo)}${tab('waiting', 'With your Coach', n.waiting)}${tab('done', 'Done', n.done)}${tab('all', 'All', null)}</div>
    <div class="tk-list">${shown.map((t, i) => todoItem(t, {today, open:open.has(t.id), criteria, levels, formAttrs}).replace('<details ', `<details style="--i:${Math.min(i, 8)}" `)).join('')}</div>
    ${shown.length ? '' : `<p class="tk-none">${esc({todo:'Nothing to do right now.', waiting:'Nothing is waiting for your Coach.', done:'Nothing finished yet.'}[filter] || 'Nothing here yet.')}</p>`}
  </div>`;
}

/* ----------------------------------------------------------- behaviour */

/** Tasks the student has expanded, kept across re-renders. */
export const openTasks = new Set();

/** Redraw one board for another tab, from the tasks it was last drawn with. */
function redraw(board, filter) {
  const entry = boards.get(board.dataset.tkBoard);
  if (!entry) return;
  currentFilter = filter;
  const tmp = doc.createElement('div');
  tmp.innerHTML = todoBoard(entry.tasks, {...entry.opts, filter});
  const next = tmp.firstElementChild; next.classList.add('is-switching');
  board.replaceWith(next);
  next.querySelector(`[data-tk-filter="${filter}"]`)?.focus();
}

/** Read the chosen files of a drop zone. */
const pickedFiles = zone => [...(zone.querySelector('.tk-drop-input')?.files || [])];
function setFiles(zone, files) {
  const input = zone.querySelector('.tk-drop-input');
  try { const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); input.files = dt.files; } catch { /* old browsers: keep the native selection */ }
  input.dispatchEvent(new Event('change', {bubbles:true})); // redraws the list and any live summary
}
function drawPicked(zone) {
  const files = pickedFiles(zone), list = zone.querySelector('.tk-picked'), err = zone.querySelector('.tk-drop-error');
  const problem = attachments.validateTaskFiles(files);
  err.hidden = !problem; err.textContent = problem;
  zone.classList.toggle('has-files', files.length > 0);
  list.innerHTML = files.map((f, i) => { const kind = fileKind({name:f.name, type:f.type}); return `<li class="tk-chip is-${kind}" style="--i:${i}"><span class="tk-file-icon">${icon(kind === 'file' ? 'file' : kind)}</span><span class="tk-chip-text"><b>${esc(f.name)}</b><small>${esc(fileSize(f.size))}</small></span><button type="button" class="tk-chip-x" data-tk-unpick="${i}" aria-label="Remove ${esc(f.name)}">${icon('x')}</button></li>`; }).join('');
}

/** Save a form's chosen files to the attachment store; returns references. */
export async function saveFormFiles(form, ownerId, purpose = 'task') {
  const input = form.querySelector('.tk-drop-input');
  return attachments.saveTaskFiles(input?.files || [], {ownerId, purpose});
}
/** Clear a form's drop zone after a successful send. */
export function clearDrop(form) { form.querySelectorAll('[data-tk-drop]').forEach(z => setFiles(z, [])); }

/* the viewer */
let viewer, viewerUrl;
export async function openFile(ref) {
  const record = await attachments.openRef(ref).catch(() => null);
  if (!viewer) {
    viewer = doc.createElement('dialog');
    viewer.className = 'tk-viewer';
    viewer.setAttribute('aria-labelledby', 'tk-viewer-title');
    viewer.addEventListener('close', () => { if (viewerUrl) URL.revokeObjectURL(viewerUrl); viewerUrl = null; viewer.querySelector('.tk-viewer-body').innerHTML = ''; });
    viewer.addEventListener('click', e => { if (e.target === viewer || e.target.closest('[data-tk-close]')) viewer.close(); });
    viewer.innerHTML = `<div class="tk-viewer-card"><header><span class="tk-file-icon"></span><div><h3 id="tk-viewer-title"></h3><small></small></div><a class="tk-btn" data-tk-download>${icon('download')}<span>Download</span></a><button type="button" class="tk-btn is-icon" data-tk-close aria-label="Close">${icon('x')}</button></header><div class="tk-viewer-body"></div></div>`;
    doc.body.append(viewer);
  }
  const kind = fileKind(ref), body = viewer.querySelector('.tk-viewer-body'), dl = viewer.querySelector('[data-tk-download]');
  viewer.querySelector('.tk-viewer-card > header .tk-file-icon').innerHTML = icon(kind === 'file' ? 'file' : kind);
  viewer.querySelector('h3').textContent = ref.name;
  viewer.querySelector('header small').textContent = [KIND_LABEL[kind], fileSize(ref.sample ? ref.size : record?.size || ref.size), ref.sample ? 'Demo file' : ''].filter(Boolean).join(' · ');
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  if (!record) {
    viewerUrl = null; dl.hidden = true;
    body.innerHTML = `<div class="tk-viewer-empty">${icon('file')}<p><b>This file isn’t in this browser.</b> In this demo, files stay on the device where they were added.</p></div>`;
  } else {
    viewerUrl = URL.createObjectURL(record.blob); dl.hidden = false; dl.href = viewerUrl; dl.download = ref.name;
    body.innerHTML = kind === 'image' ? `<img src="${viewerUrl}" alt="${esc(ref.name)}">`
      : kind === 'pdf' ? `<object data="${viewerUrl}" type="application/pdf" aria-label="${esc(ref.name)}"><div class="tk-viewer-empty">${icon('pdf')}<p>This browser can’t show PDFs here. Use Download.</p></div></object>`
      : `<div class="tk-viewer-empty">${icon(kind)}<p><b>${esc(ref.name)}</b><br>Previews are for PDFs and images. Download it to open.</p></div>`;
  }
  if (!viewer.open) viewer.showModal();
}

if (doc) {
  doc.addEventListener('click', e => {
    const tab = e.target.closest('[data-tk-filter]');
    if (tab) { e.stopPropagation(); redraw(tab.closest('[data-tk-board]'), tab.dataset.tkFilter); return; }
    const file = e.target.closest('[data-task-file]');
    if (file) { e.preventDefault(); try { openFile(JSON.parse(file.dataset.taskFile)); } catch { /* malformed reference */ } return; }
    const unpick = e.target.closest('[data-tk-unpick]');
    if (unpick) { e.preventDefault(); const zone = unpick.closest('[data-tk-drop]'); setFiles(zone, pickedFiles(zone).filter((_, i) => i !== Number(unpick.dataset.tkUnpick))); return; }
    const insert = e.target.closest('[data-tk-insert]');
    if (insert) { const area = insert.closest('form')?.querySelector(insert.dataset.target || 'textarea[name=feedback]'); if (area) { area.value = `${area.value.trim()}${area.value.trim() ? ' ' : ''}${insert.dataset.tkInsert}`; area.dispatchEvent(new Event('input', {bubbles:true})); area.focus(); insert.classList.add('is-used'); } return; }
    const dueBtn = e.target.closest('[data-tk-due]');
    if (dueBtn) { const form = dueBtn.closest('form'), due = form?.querySelector('[name=due]'), start = form?.querySelector('[name=start]')?.value || dueBtn.dataset.today; if (due && start) { const d = new Date(`${start}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + Number(dueBtn.dataset.tkDue)); due.value = d.toISOString().slice(0, 10); due.dispatchEvent(new Event('change', {bubbles:true})); form.querySelectorAll('[data-tk-due]').forEach(b => b.setAttribute('aria-pressed', String(b === dueBtn))); } }
  });
  doc.addEventListener('toggle', e => { const item = e.target.closest?.('[data-tk-item]'); if (!item) return; if (item.open) openTasks.add(item.dataset.tkItem); else openTasks.delete(item.dataset.tkItem); }, true);
  doc.addEventListener('change', e => {
    if (e.target.matches('.tk-drop-input')) { drawPicked(e.target.closest('[data-tk-drop]')); return; }
    if (e.target.matches('.tk-stars-input input')) { const box = e.target.closest('.tk-stars-input'), word = box.querySelector('.tk-stars-word'); if (word) word.textContent = RATING_WORDS[Number(e.target.value)] || ''; box.classList.remove('just-set'); void box.offsetWidth; box.classList.add('just-set'); }
  });
  // Drag files onto a drop zone: merge with what is already chosen.
  doc.addEventListener('dragover', e => { const zone = e.target.closest?.('[data-tk-drop]'); if (!zone || !e.dataTransfer?.types?.includes('Files')) return; e.preventDefault(); zone.classList.add('is-over'); });
  doc.addEventListener('dragleave', e => { const zone = e.target.closest?.('[data-tk-drop]'); if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('is-over'); });
  doc.addEventListener('drop', e => { const zone = e.target.closest?.('[data-tk-drop]'); if (!zone) return; e.preventDefault(); zone.classList.remove('is-over'); setFiles(zone, [...pickedFiles(zone), ...e.dataTransfer.files]); });
}
