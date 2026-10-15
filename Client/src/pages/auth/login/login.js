const form = document.getElementById('login-form');
const email = document.getElementById('email');
const password = document.getElementById('password');
const passwordToggle = document.querySelector('.password-toggle');
document.getElementById('admin-demo-button').addEventListener('click', () => {
  try { localStorage.setItem('deepsprout-admin-demo-session', 'active'); }
  catch { sessionStorage.setItem('deepsprout-admin-demo-session', 'active'); }
  location.href = '../../../../admin.html#/dashboard';
});
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
  // Not connected to an account service: the password is discarded. The
  // email selects the matching person on this device (demo only).
  const known = window.DeepSproutRepo?.read().people.find(person => person.email.toLowerCase() === email.value.trim().toLowerCase());
  if (window.DeepSproutRepo && !known) { setError(email, 'No account uses this email on this device. Create an account first.'); email.focus(); return; }
  if (known) { window.DeepSproutRepo.run('member.signin', { email: known.email }); try { sessionStorage.removeItem('deepsprout-account-choice'); } catch { /* ignore */ } }
  showToast(`Signed in as ${known?.name || 'this device'} (demo — your password was not checked, sent or saved).`);
  const resume = window.DeepSprout?.onboardingResume('../../../../') || '../../../../index.html';
  setTimeout(() => { location.href = resume; }, 1600);
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
  else openInfo(`Continue with ${action}`, `${action} sign-in is not connected yet in this preview.`);
}));
document.querySelectorAll('[data-auth-info]').forEach(button => button.addEventListener('click', () => {
  const label = button.dataset.authInfo;
  openInfo(label, `${label} information is not available in this client preview yet.`);
}));
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.querySelector('.dialog-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
