const form = document.getElementById('login-form');
const email = document.getElementById('email');
const password = document.getElementById('password');
const passwordToggle = document.querySelector('.password-toggle');
const toast = document.getElementById('auth-toast');
const dialog = document.getElementById('auth-dialog');
let toastTimer;

const showToast = message => {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 6500);
};
const setError = (input, message) => {
  input.setAttribute('aria-invalid', String(Boolean(message)));
  document.getElementById(`${input.id}-error`).textContent = message;
};
const validate = () => {
  const value = email.value.trim();
  setError(email, !value ? 'Please enter your email address.' : email.validity.typeMismatch ? 'Please enter a valid email address.' : '');
  setError(password, password.value ? '' : 'Please enter your password.');
  const firstInvalid = form.querySelector('[aria-invalid="true"]');
  firstInvalid?.focus();
  return !firstInvalid;
};
[email, password].forEach(input => input.addEventListener('input', () => {
  if (input.getAttribute('aria-invalid') === 'true') setError(input, '');
}));
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!validate()) return;
  showToast('This login preview is not connected to an account service. Your credentials were not sent or saved.');
});
passwordToggle.addEventListener('click', () => {
  const showing = password.type === 'password';
  password.type = showing ? 'text' : 'password';
  passwordToggle.setAttribute('aria-pressed', String(showing));
  passwordToggle.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
  password.focus();
});
const openInfo = (title, message) => {
  document.getElementById('dialog-title').textContent = title;
  document.getElementById('dialog-message').textContent = message;
  dialog.showModal();
};
document.querySelectorAll('[data-auth-action]').forEach(button => button.addEventListener('click', () => {
  const action = button.dataset.authAction;
  if (action === 'forgot') openInfo('Forgot your password?', 'Password reset is not connected yet. No email will be sent from this preview.');
  else if (action === 'signup') openInfo('A new beginning', 'Account registration is not connected yet. You can explore the DeepSprout pages from the Home link below.');
  else openInfo(`Continue with ${action}`, `${action} sign-in is not connected yet in this preview.`);
}));
document.querySelectorAll('[data-auth-info]').forEach(button => button.addEventListener('click', () => {
  const label = button.dataset.authInfo;
  openInfo(label, `${label} information is not available in this client preview yet.`);
}));
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.querySelector('.dialog-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
