import {createLivingWorld} from './experience/living-world.js';
import {choiceMarkup,bindChoices} from './experience/entry.js';
const entry = document.getElementById('register-entry');
entry.innerHTML = choiceMarkup('../../../../workspaces.html#/auth/account/');
let world, unbindChoices;
function showStep(moveFocus = true) {
  const step = location.hash.slice(1), individual = step === 'individual', partner = step === 'partner';
  entry.hidden = individual;
  entry.querySelector('.register-choice-content').hidden = partner;
  entry.querySelector('.register-partner-content').hidden = !partner;
  document.querySelector('.register-form-content').hidden = !individual;
  world.setMode(partner ? 'partner' : individual ? 'individual' : entry.querySelector('[aria-pressed=true]').dataset.path);
  if (moveFocus) (individual ? document.getElementById('register-title') : entry.querySelector(partner ? '.register-partner-content h1' : '.register-choice-content h1')).focus({preventScroll:true});
}
function mountExperience() {
  const host = document.createElement('aside');host.className = 'registration-world';
  document.querySelector('.register-header').after(host);
  world = createLivingWorld(host, location.hash === '#partner' ? 'partner' : 'individual');
  unbindChoices = bindChoices(entry, world, {initial:location.hash==='#partner'?'partner':'individual',individual:()=>{location.hash='individual';},partner:()=>{location.hash='partner';},back:()=>{location.hash='choose';}});
  showStep(false);
}
mountExperience();
window.addEventListener('hashchange',()=>showStep());
document.getElementById('change-path').addEventListener('click',()=>{location.hash='choose';});
window.addEventListener('pagehide',()=>{world.destroy();unbindChoices();clearTimeout(toastTimer);});
window.addEventListener('pageshow',event=>{if(event.persisted){mountExperience();submitting=false;form.querySelector('[type=submit]').disabled=false;form.removeAttribute('aria-busy');toast.hidden=true;}});

const form = document.getElementById('register-form');
const nameInput = document.getElementById('full-name');
const email = document.getElementById('email');
const password = document.getElementById('password');
const confirmation = document.getElementById('confirm-password');
const terms = document.getElementById('terms');
const toast = document.getElementById('auth-toast');
const dialog = document.getElementById('auth-dialog');
let toastTimer;

const setError = (input, message) => {
  input.setAttribute('aria-invalid', String(Boolean(message)));
  document.getElementById(`${input.id}-error`).textContent = message;
  if (message) { delete input.dataset.valid; world.signal('invalid'); }
};
const validate = () => {
  setError(nameInput, nameInput.value.trim() ? '' : 'Please enter your full name.');
  const address = email.value.trim();
  setError(email, !address ? 'Please enter your email address.' : email.validity.typeMismatch ? 'Please enter a valid email address.' : '');
  setError(password, !password.value ? 'Please create a password.' : password.value.length < 8 ? 'Use at least 8 characters.' : '');
  setError(confirmation, !confirmation.value ? 'Please confirm your password.' : confirmation.value !== password.value ? 'The passwords do not match.' : '');
  setError(terms, terms.checked ? '' : 'Please agree to the terms before continuing.');
  const firstInvalid = form.querySelector('[aria-invalid="true"]');
  firstInvalid?.focus();
  return !firstInvalid;
};
[nameInput, email, password, confirmation].forEach(input => input.addEventListener('input', () => {
  if (input.getAttribute('aria-invalid') === 'true') setError(input, '');
  input.dataset.valid = String(Boolean(input.value.trim()) && input.validity.valid && (input !== password || input.value.length >= 8) && (input !== confirmation || input.value === password.value));
  if (input === password && confirmation.value) confirmation.dataset.valid = String(confirmation.value === password.value);
}));
terms.addEventListener('change', () => setError(terms, ''));
let submitting = false;
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !validate()) return;
  submitting = true;
  const submitButton = form.querySelector('[type=submit]');
  submitButton.disabled = true;form.setAttribute('aria-busy','true');world.signal('submitting');
  await new Promise(resolve => requestAnimationFrame(resolve));
  // No account service is connected. The person is created once in the
  // shared local identity store (the same person partner workspaces use);
  // the password is never stored. An existing email is not merged silently.
  try {
    if (!window.DeepSproutRepo) throw new Error('Registration is unavailable. Please reload and try again.');
    await window.DeepSproutRepo.run('member.register', { name: nameInput.value.trim(), email: email.value.trim(), consent: true });
    try { sessionStorage.removeItem('deepsprout-account-choice'); } catch { /* ignore */ }
  } catch (error) {
    setError(email, error.message);
    email.focus();
    submitting = false;submitButton.disabled = false;form.removeAttribute('aria-busy');world.signal('error');
    return;
  }
  window.DeepSprout?.bind();
  form.removeAttribute('aria-busy');world.signal('local-complete');
  password.value = '';confirmation.value = '';
  toast.textContent = 'No account service is connected yet — your password was not sent or stored. Taking you to the first run…';
  toast.hidden = true;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    location.href = '../../member/onboarding/onboarding.html';
  }, 1400);
});
document.querySelectorAll('.password-toggle').forEach(button => button.addEventListener('click', () => {
  const input = document.getElementById(button.getAttribute('aria-controls'));
  const showing = input.type === 'password';
  input.type = showing ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(showing));
  button.setAttribute('aria-label', `${showing ? 'Hide' : 'Show'} ${input === confirmation ? 'confirmation password' : 'password'}`);
  input.focus();
}));
const openInfo = (title, message) => {
  document.getElementById('dialog-title').textContent = title;
  document.getElementById('dialog-message').textContent = message;
  dialog.showModal();
};
document.querySelectorAll('[data-auth-action]').forEach(button => button.addEventListener('click', () => {
  const provider = button.dataset.authAction;
  openInfo(`Continue with ${provider}`, `${provider} account creation is not connected yet in this preview.`);
}));
document.querySelectorAll('[data-auth-info]').forEach(button => button.addEventListener('click', () => {
  const label = button.dataset.authInfo;
  openInfo(label, `${label} information is not available in this client preview yet.`);
}));
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.querySelector('.dialog-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
