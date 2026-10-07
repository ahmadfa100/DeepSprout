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
}));
terms.addEventListener('change', () => setError(terms, ''));
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!validate()) return;
  toast.textContent = 'Account creation is not connected to a service yet. Your details were not sent or saved.';
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 6500);
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
