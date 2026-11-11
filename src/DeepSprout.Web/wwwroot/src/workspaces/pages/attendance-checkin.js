/**
 * The participant's own check-in page (student/checkin/<sessionId> and
 * participant/checkin/<sessionId>). Scanning the venue screen opens it with
 * the current code (?c=…), and the check-in is sent at once. Without a camera,
 * the participant types the six-character code shown on the screen.
 */
import * as u from '../ui.js';
import {sessionRef, roster, windowOf} from '../attendance/model.js';

const esc = u.esc;
const clock = (ms, tz) => new Date(ms).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:tz});
const day = (ms, tz) => new Date(ms).toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', timeZone:tz});

function shell(ref, inner, cls = '') {
  const head = ref ? `<p class="eyebrow">${esc(ref.parent.title)}</p><h1>${esc(ref.ss.title)}</h1><p class="ck-when">${esc(`${ref.ss.date ? day(Date.parse(`${ref.ss.date}T12:00:00`), ref.tz) : ''} · ${ref.ss.time}–${ref.ss.endTime || ref.ss.time}`)}${ref.ss.venue ? ` · ${esc(ref.ss.venue)}` : ''}</p>` : '<h1>Check in</h1>';
  return `<section class="ck${cls}"><div class="ck-card"><span class="ck-leaf" aria-hidden="true">${u.icon('qr')}</span>${head}${inner}</div></section>`;
}
const notice = (icon, title, text) => `<div class="ck-notice">${u.icon(icon)}<div><strong>${esc(title)}</strong><p>${esc(text)}</p></div></div>`;

export function renderSelfCheckin(ctx) {
  const {s, person:p, route:r} = ctx, ref = sessionRef(s, r.id);
  if (!ref) return shell(null, notice('alert', 'This session was not found.', 'Scan the check-in screen again, or ask the Supervisor at the venue.'));
  const entry = roster(s, ref, null).find(e => e.personId === p.id), state = ctx.localUI.checkin?.[ref.ss.id] || {};
  if (entry?.record && entry.record.status !== 'Absent') {
    const at = Date.parse(entry.record.at || entry.record.created);
    return shell(ref, `<div class="ck-done${state.fresh ? ' is-fresh' : ''}" role="status"><span class="ck-mark" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-16"/></svg>${Array.from({length:8}, (_, i) => `<i style="--a:${i * 45}deg"></i>`).join('')}</span>
      <h2>${state.fresh ? 'You’re checked in' : 'You’re already checked in'}</h2><p><span class="ac-status is-${entry.record.status === 'Late' ? 'late' : 'present'}">${esc(entry.record.status)}</span> at ${esc(clock(at, ref.tz))}</p><small>${entry.record.status === 'Late' ? 'You arrived after the start. That’s fine — enjoy the session.' : 'Enjoy the session.'}</small></div>`, ' is-success');
  }
  if (!entry) return shell(ref, notice('people', 'You’re not on the list for this session.', 'Only registered participants can check in here. Please speak to the Supervisor at the venue.'));
  if (entry.mode === 'Online') return shell(ref, notice('globe', 'You registered to join online.', 'Your attendance comes from the meeting report, so there is nothing to scan.'));
  const w = windowOf(s, ref);
  if (w.state === 'early') return shell(ref, notice('clock', `Check-in opens at ${clock(w.opens, ref.tz)}.`, 'Scan the screen again when you arrive.'));
  if (w.state === 'closed') return shell(ref, notice('clock', 'Check-in has closed for this session.', 'If you were there, ask the Supervisor to record it with a reason.'));
  const code = (r.query.get('c') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const auto = code && !state.tried;
  const error = state.error ? `<p class="ck-error" role="alert">${u.icon('alert')}${esc(state.error)}</p>` : '';
  if (auto) return shell(ref, `<form data-form="self-checkin" data-session="${esc(ref.ss.id)}" data-auto><input type="hidden" name="code" value="${esc(code)}"><div class="ck-busy" role="status"><span class="ck-spinner" aria-hidden="true"></span>Checking you in…</div></form>`);
  return shell(ref, `${error}<form class="ck-form" data-form="self-checkin" data-session="${esc(ref.ss.id)}"><label for="ck-code">Type the code on the check-in screen</label><input id="ck-code" name="code" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="7" placeholder="ABC 123" required value="${esc(state.error ? '' : code)}"><button class="button primary">Check in</button><small>The code changes every 20 seconds. You can also scan the screen with your camera.</small></form>`);
}

export function selfCheckinSubmit(form, ctx) {
  if (form.dataset.form !== 'self-checkin') return false;
  const sid = form.dataset.session, ui = (ctx.localUI.checkin ||= {});
  try {
    const res = ctx.run('attendance.self.checkin', {sessionId:sid, code:form.elements.code.value}, 'Checked in.');
    ui[sid] = {tried:true, fresh:!res.already};
  } catch (error) {
    ui[sid] = {tried:true, error:error.message};
  }
  ctx.render();
  return true;
}

export function mountSelfCheckin(ctx) {
  if (ctx.route.page !== 'checkin') return;
  const form = document.querySelector('form[data-form=self-checkin][data-auto]');
  if (form) setTimeout(() => form.isConnected && form.requestSubmit(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450);
  const sid = ctx.route.id, st = ctx.localUI.checkin?.[sid];
  if (st?.fresh) setTimeout(() => { st.fresh = false; }, 0);
}
