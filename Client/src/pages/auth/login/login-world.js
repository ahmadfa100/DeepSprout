/**
 * Login background: the same living network the Individual path of
 * registration uses (register/experience/living-world.js), fixed in its calm
 * Individual mode. Purely presentational: the form, validation and sign-in in
 * login.js are untouched, and the network reads no field values.
 */
import {createLivingWorld} from '../register/experience/living-world.js';

let world = null;
const mount = () => {
  if (world) return;
  const host = document.createElement('aside');
  host.className = 'registration-world';
  document.querySelector('.register-header').after(host);
  world = createLivingWorld(host, 'individual');
};
mount();
window.addEventListener('pagehide', () => { world?.destroy(); world = null; document.querySelector('.registration-world')?.remove(); });
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
