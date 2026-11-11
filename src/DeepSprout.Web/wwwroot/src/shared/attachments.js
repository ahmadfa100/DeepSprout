/**
 * Excuse evidence and Coach task files for the Phase-1 browser demo.
 *
 * Files live in IndexedDB (`deepsprout-attachments`), not in the operational
 * localStorage graph, which only keeps a small reference {id, name, type,
 * size}. Access is decided by the `initiative.excuse.evidence` command (the
 * student, the initiative's active Supervisors and its Representative), and
 * every opening is logged on the excuse record.
 *
 * Demo limitation, stated plainly in the UI: this is storage in ONE browser
 * profile on ONE device. It is not encrypted, not shared across devices, and
 * anyone with access to this browser's developer tools could read it.
 */
const DB = 'deepsprout-attachments', STORE = 'files';
export const RULES = {types:['application/pdf','image/jpeg','image/png'], extensions:['pdf','jpg','jpeg','png'], maxBytes:2 * 1024 * 1024};
/** Coach task files and student submissions: documents, PDFs and images. Checked by extension, because browsers report office types unevenly. */
export const TASK_RULES = {extensions:['pdf','doc','docx','ppt','pptx','xls','xlsx','txt','png','jpg','jpeg','webp'], maxBytes:5 * 1024 * 1024, maxFiles:5, label:'PDF, Word, PowerPoint, Excel, text or image'};
export const TASK_ACCEPT = TASK_RULES.extensions.map(x => `.${x}`).join(',');

function open() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('This browser cannot store attachments (IndexedDB unavailable).')); return; }
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, {keyPath:'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Attachment storage could not be opened.'));
  });
}
const run = (mode, fn) => open().then(db => new Promise((resolve, reject) => {
  const tx = db.transaction(STORE, mode), store = tx.objectStore(STORE), request = fn(store);
  tx.oncomplete = () => { db.close(); resolve(request?.result); };
  tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('Attachment storage failed.')); };
}));

/** Explain why a file is not acceptable, or return ''. */
export function validate(file, rules = RULES) {
  if (!file) return '';
  const ext = String(file.name).split('.').pop().toLowerCase();
  if (rules.types ? !rules.types.includes(file.type) || !rules.extensions.includes(ext) : !rules.extensions.includes(ext)) return rules.label ? `“${file.name}” can’t be added. Use a ${rules.label} file.` : 'Attach a PDF, JPG or PNG file.';
  if (!file.size) return `“${file.name}” is empty.`;
  if (file.size > rules.maxBytes) return `“${file.name}” is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${Math.round(rules.maxBytes / 1048576)} MB.`;
  return '';
}
/** Check a whole selection of task files before anything is stored. */
export function validateTaskFiles(files) {
  const list = [...(files || [])];
  if (list.length > TASK_RULES.maxFiles) return `Add up to ${TASK_RULES.maxFiles} files.`;
  for (const file of list) { const problem = validate(file, TASK_RULES); if (problem) return problem; }
  return '';
}
/** Store task files and return their small references, or store nothing if one fails. */
export async function saveTaskFiles(files, {ownerId, purpose = 'task'} = {}) {
  const list = [...(files || [])];
  const problem = validateTaskFiles(list);
  if (problem) throw new Error(problem);
  const refs = [];
  try { for (const file of list) refs.push(await save(file, {ownerId, purpose, rules:TASK_RULES})); }
  catch (error) { await Promise.all(refs.map(r => remove(r.id).catch(() => {}))); throw error; }
  return refs;
}
export async function save(file, {ownerId, purpose = 'excuse', rules = RULES} = {}) {
  const problem = validate(file, rules);
  if (problem) throw new Error(problem);
  const id = `att-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  await run('readwrite', store => store.put({id, blob:file, name:file.name, type:file.type, size:file.size, ownerId, purpose, created:new Date().toISOString()}));
  return {id, name:file.name, type:file.type, size:file.size};
}
export const read = id => run('readonly', store => store.get(id)).then(record => record || null);
/** Open a task file reference: the stored file, or a generated sample for demo records. */
export async function openRef(ref) {
  const record = ref?.id ? await read(ref.id).catch(() => null) : null;
  if (record) return record;
  if (ref?.sample) { const {sampleFile} = await import('./sample-files.js'); return sampleFile(ref); }
  return null;
}
export const remove = id => run('readwrite', store => store.delete(id));
