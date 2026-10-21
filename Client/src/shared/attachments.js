/**
 * Excuse evidence files for the Phase-1 browser demo.
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
export function validate(file) {
  if (!file) return '';
  const ext = String(file.name).split('.').pop().toLowerCase();
  if (!RULES.types.includes(file.type) || !RULES.extensions.includes(ext)) return 'Attach a PDF, JPG or PNG file.';
  if (!file.size) return 'This file is empty.';
  if (file.size > RULES.maxBytes) return `This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 2 MB.`;
  return '';
}
export async function save(file, {ownerId, purpose = 'excuse'} = {}) {
  const problem = validate(file);
  if (problem) throw new Error(problem);
  const id = `att-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  await run('readwrite', store => store.put({id, blob:file, name:file.name, type:file.type, size:file.size, ownerId, purpose, created:new Date().toISOString()}));
  return {id, name:file.name, type:file.type, size:file.size};
}
export const read = id => run('readonly', store => store.get(id)).then(record => record || null);
export const remove = id => run('readwrite', store => store.delete(id));
