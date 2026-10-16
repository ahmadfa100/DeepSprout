/**
 * Member bridge — gives the regular Individual pages (classic deferred
 * scripts) the same operational store and read models the partner
 * workspaces use. It never copies records: every call reads or writes the
 * one browser graph through `store.js` commands.
 *
 * Load it as `<script type="module">` BEFORE the page's deferred scripts;
 * module and deferred scripts run in document order, so
 * `window.DeepSproutRepo` exists when the page script runs. Pages that load
 * it later can wait for the `deepsprout:repo-ready` event.
 *
 * Identity: one session subject for the whole origin. When nobody is signed
 * in, the seeded demo journal (`?account=demo`) is bound to its canonical
 * person, so the seeded story and the operational records agree.
 */
import {read, dispatch, STORAGE_KEY, canActAsIndividual, workspaces} from '../workspaces/store.js';
import * as selectors from './selectors.js';
import {nowMs, clockDay} from '../workspaces/domain.js';
import {labels, defaults} from '../workspaces/navigation.js';
import * as attachments from './attachments.js';

const CHOICE_KEY = 'deepsprout-account-choice';
const listeners = new Set();
const emit = reason => { listeners.forEach(fn => { try { fn(reason); } catch (error) { console.error(error); } }); window.dispatchEvent(new CustomEvent('deepsprout:repo', {detail:{reason}})); };

function accountChoice() {
  const requested = new URLSearchParams(location.search).get('account');
  if (requested) return requested;
  try { return sessionStorage.getItem(CHOICE_KEY) || 'demo'; } catch { return 'demo'; }
}
function boundPerson(s) {
  const signedIn = s.people.find(p => p.id === s.session.personId);
  if (signedIn) return signedIn;
  return accountChoice() === 'demo' ? s.people.find(p => p.journal === 'demo') || null : null;
}

const api = {
  selectors,
  attachments,
  /** Open restricted excuse evidence: the command checks permission and logs the access first. */
  async openEvidence(excuseId) {
    const ref = this.run('initiative.excuse.evidence', {id:excuseId});
    const record = await attachments.read(ref.id).catch(() => null);
    if (!record) throw new Error('This file is no longer available in this browser (attachments are stored on the device where they were added).');
    return record;
  },
  read,
  nowMs: () => nowMs(read()),
  today: () => clockDay(read()),
  /** The canonical person the member pages act for (or null). */
  me() { return boundPerson(read()); },
  canAct() { return canActAsIndividual(this.me()); },
  /** Make the bound demo person the explicit session subject before a write. */
  ensureSession() {
    const s = read();
    if (s.session.personId) return s.session.personId;
    const p = boundPerson(s);
    if (!p) throw new Error('Sign in or register to take part.');
    dispatch('member.signin', {email:p.email});
    return p.id;
  },
  run(action, payload = {}) {
    if (action.startsWith('member.') && !['member.register','member.signin'].includes(action)) this.ensureSession();
    const result = dispatch(action, payload);
    emit(action);
    return result;
  },
  // Demo person switch: a local email sign-in (works off localhost too); never real authentication.
  signInAs(personId) { const p = read().people.find(x => x.id === personId); if (p) dispatch('member.signin', {email:p.email}); emit('identity'); },
  signOut() { dispatch('auth.logout'); emit('identity'); },
  individuals() { return read().people.filter(p => p.status === 'Active' && canActAsIndividual(p)); },
  workspaceLinks() {
    const s = read(), p = boundPerson(s);
    if (!p || s.session.personId !== p.id) return [];
    return workspaces(s).filter(w => w !== 'participant').map(w => ({id:w, label:labels[w], href:`workspaces.html#/${w}/${defaults[w]}`}));
  },
  notifications() {
    const s = read(), p = boundPerson(s);
    if (!p) return [];
    return (s.notifications || []).filter(n => n.recipientId === p.id).slice(0, 30);
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
};

window.DeepSproutRepo = api;
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) emit('external'); });
window.dispatchEvent(new CustomEvent('deepsprout:repo-ready'));
