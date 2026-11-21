/**
 * Online meeting setup: one guided pop-up wherever an online meeting is
 * scheduled (Representative sessions, Supervisor meetings).
 *
 *   1. Platform: Google Meet, Zoom or Microsoft Teams, or paste an existing link.
 *   2. Schedule & room: when it happens, the host account and the room rules.
 *   3. Link: DeepSprout generates the link, ID, passcode and invitation.
 *
 * DeepSprout is not connected to Google, Zoom or Microsoft accounts yet. A
 * generated link follows the platform's format but opens no real room; the
 * pop-up says so, and offers the paste path for a live room.
 *
 * The host form keeps two hidden inputs: `meeting` (the URL) and
 * `meetingSetup` (JSON, cleaned by cleanMeetingSetup on save).
 */
import * as u from './ui.js';
import {MEETING_PLATFORMS as P, meetingUrl, parseMeetingLink, formatMeetingId, cleanMeetingSetup} from './session-access.js';

const {esc} = u;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, reduced() ? 0 : ms));

const TIMEZONES = [['Asia/Amman', 'Amman · UTC+3'], ['Asia/Riyadh', 'Riyadh · UTC+3'], ['Asia/Dubai', 'Dubai · UTC+4'], ['Africa/Cairo', 'Cairo · UTC+2'], ['Europe/London', 'London · UTC+0'], ['UTC', 'UTC']];
const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];
const OPENS = [[0, 'At the start time'], [5, '5 minutes early'], [10, '10 minutes early'], [15, '15 minutes early']];
const TAGLINE = {meet:'Runs in the browser. Students need no app.', zoom:'Waiting room, passcode and a participant report.', teams:'Best if your school already uses Microsoft 365.'};
const FEATURES = {meet:['No install', 'Knock to join', 'Up to 100'], zoom:['Waiting room', 'Passcode', 'Reports'], teams:['Lobby', 'Passcode', 'Attendance report']};

/* Room rules. Each label is per platform; a rule a platform lacks is not shown. */
const RULES = {
  lobby:{zoom:['Waiting room', 'You admit each student, so uninvited guests stay out.'], meet:['Students ask to join', 'Only people you admit get in.'], teams:['Lobby', 'Students wait until you or a co-host lets them in.']},
  passcode:{zoom:['Require a passcode', 'Added to the link and to the invitation.']},
  joinEarly:{zoom:['Join before the host', 'Students can enter before you arrive.'], teams:['Join before the organizer', 'Students can enter before you arrive.']},
  muted:{all:['Mics off on entry', 'Students unmute themselves when they speak.']},
  cameraOff:{all:['Cameras off on entry', 'Students turn their camera on when they are ready.']},
  record:{zoom:['Record to the cloud', 'Recording starts with the meeting.'], meet:['Record to Google Drive', 'Recording starts with the meeting. Needs a Google Workspace plan.'], teams:['Record to OneDrive', 'Recording starts with the meeting.']},
  attendance:{zoom:['Keep a participant report', 'After the session, download it from Reports → Usage and upload it in Attendance.'], meet:['Track attendance', 'Google emails the host a sheet after the call. Needs a Google Workspace plan.'], teams:['Attendance report', 'After the session, download it from the meeting’s Attendance tab and upload it in Attendance.']},
  cohosts:{all:['Supervisors as co-hosts', '']}
};
const DEFAULTS = {lobby:true, passcode:true, joinEarly:false, muted:true, cameraOff:false, record:false, attendance:true, cohosts:true};
const rule = (key, platform) => RULES[key][platform] || RULES[key].all;

/* ---------------------------------------------------------------- glyphs */
const GLYPH_PATH = {
  meet:'M3.5 7.5A2.5 2.5 0 0 1 6 5h6.5A2.5 2.5 0 0 1 15 7.5v9a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5Z M15 10l5.5-3.5v11L15 14',
  zoom:'M2.5 8a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3Z M15.5 10.5 21 7v10l-5.5-3.5',
  teams:'M3 6.5h11v3H10v9H7v-9H3Z M18 5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M15.5 12h5v4a2.5 2.5 0 0 1-5 0Z',
  link:'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'
};
export const glyph = (platform, cls = '') => `<span class="ms-glyph is-${esc(platform || 'link')}${cls ? ` ${cls}` : ''}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${GLYPH_PATH[platform] || GLYPH_PATH.link}"/></svg></span>`;

/* ----------------------------------------------------------- generation */
const rand = n => [...crypto.getRandomValues(new Uint32Array(n))];
const letters = n => rand(n).map(x => 'abcdefghijkmnopqrstuvwxyz'[x % 25]).join('');
const digits = n => rand(n).map(x => x % 10).join('');
const token = n => rand(n).map(x => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[x % 56]).join('');
const code = n => rand(n).map(x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');

/** A link in the platform's own format. Demo only: no room exists behind it. */
function generateLink(platform, settings) {
  if (platform === 'meet') { const id = `${letters(3)}-${letters(4)}-${letters(3)}`; return {url:`https://meet.google.com/${id}`, meetingId:id, passcode:''}; }
  if (platform === 'zoom') { const id = `${8 + (rand(1)[0] % 2)}${digits(10)}`, pass = settings.passcode ? code(6) : ''; return {url:`https://zoom.us/j/${id}${pass ? `?pwd=${token(32)}` : ''}`, meetingId:formatMeetingId(id, 'zoom'), passcode:pass}; }
  const id = `${1 + (rand(1)[0] % 9)}${digits(12)}`, pass = token(6);
  return {url:`https://teams.microsoft.com/meet/${id}?p=${pass}`, meetingId:formatMeetingId(id, 'teams'), passcode:pass};
}
const resultKey = st => `${st.platform}|${st.platform === 'zoom' && st.settings.passcode ? 'pass' : ''}`;

/* ---------------------------------------------------------------- time */
const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const toTime = n => { const v = Math.max(0, Math.min(23 * 60 + 59, n)); return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };
export const addMinutes = (time, minutes) => toTime(toMin(time) + Number(minutes || 0));
export const minutesBetween = (a, b) => toMin(b) - toMin(a);
const tzLabel = tz => (TIMEZONES.find(([v]) => v === tz) || [tz, tz])[1];
const dayLabel = date => { const d = new Date(`${date}T12:00`); return Number.isNaN(d.getTime()) ? 'Choose a date' : d.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short', year:'numeric'}); };
const lengthLabel = n => n < 60 ? `${n} min` : n % 60 ? `${Math.floor(n / 60)} h ${n % 60} min` : `${n / 60} ${n === 60 ? 'hour' : 'hours'}`;
const whenLine = w => `${dayLabel(w.date)} · ${w.time}–${addMinutes(w.time, w.minutes)} · ${tzLabel(w.tz)}`;

function invitation(st, link) {
  const name = P[link.platform || st.platform]?.name || 'Online meeting';
  return [st.title || 'Online meeting', `${dayLabel(st.when.date)} · ${st.when.time}–${addMinutes(st.when.time, st.when.minutes)} (${tzLabel(st.when.tz)})`, '', `Join on ${name}`, link.url, link.meetingId ? `Meeting ID: ${link.meetingId}` : '', link.passcode ? `Passcode: ${link.passcode}` : '', st.opensEarly ? `The room opens ${st.opensEarly} minutes early.` : ''].filter((x, i) => x || i === 2).join('\n');
}

async function copy(text, button) {
  try { await navigator.clipboard.writeText(text); }
  catch { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove(); }
  if (!button) return;
  const label = button.querySelector('[data-copy-label]') || button;
  const before = label.textContent;
  button.classList.add('is-copied'); label.textContent = 'Copied';
  setTimeout(() => { button.classList.remove('is-copied'); label.textContent = before; }, 1600);
}

/* ------------------------------------------------- the field in the form */

/** Two hidden inputs and a card: "Set up the meeting", or the ready meeting. */
export function meetingField({url = '', setup = null} = {}) {
  const href = meetingUrl(url), clean = href ? cleanMeetingSetup(setup || {}, href) : null;
  return `<div class="ms-field" data-ms-field><input type="hidden" name="meeting" value="${esc(href)}"><input type="hidden" name="meetingSetup" value="${esc(clean ? JSON.stringify(clean) : '')}"><div class="ms-field-body" data-ms-field-body>${fieldBody(href, clean)}</div></div>`;
}

function fieldBody(href, setup) {
  if (!href) return `<div class="ms-empty">
      <div class="ms-empty-art" aria-hidden="true">${glyph('meet')}${glyph('zoom')}${glyph('teams')}</div>
      <div class="ms-empty-copy"><strong>Set up the online meeting</strong><p>Choose Google Meet, Zoom or Teams, set the time and room rules, and DeepSprout creates the link.</p></div>
      <button type="button" class="button primary ms-empty-cta" data-ms-open>${u.icon('sparkle')}Set up meeting</button>
    </div>`;
  const platform = setup?.platform || parseMeetingLink(href).platform, name = P[platform]?.name || 'Online meeting', s = setup?.settings || {};
  const chips = [s.lobby ? (platform === 'zoom' ? 'Waiting room' : platform === 'teams' ? 'Lobby' : 'Ask to join') : '', setup?.passcode ? 'Passcode' : '', s.muted ? 'Mics off on entry' : '', s.record ? 'Auto-record' : '', s.attendance ? 'Attendance report' : '', setup?.opensEarly ? `Opens ${setup.opensEarly} min early` : ''].filter(Boolean);
  return `<div class="ms-ready">
      <div class="ms-ready-head">${glyph(platform, 'is-lg')}<div><strong>${esc(name)} meeting</strong><span class="ms-ready-tags"><span class="ms-tag is-ok">${u.icon('check')}Link ready</span>${setup?.source === 'generated' ? '<span class="ms-tag is-demo" title="DeepSprout is not connected to this platform yet, so the room will not open.">Demo link</span>' : '<span class="ms-tag">Your own link</span>'}</span></div>
        <div class="ms-ready-actions"><button type="button" class="button quiet small" data-ms-open>${u.icon('edit')}Edit setup</button><button type="button" class="ms-icon-btn" data-ms-remove aria-label="Remove meeting">${u.icon('close')}</button></div></div>
      <div class="ms-linkbox"><code title="${esc(href)}">${esc(href)}</code><button type="button" class="ms-copy" data-ms-copy="${esc(href)}"><span data-copy-label>Copy link</span></button></div>
      ${setup?.meetingId || setup?.passcode ? `<dl class="ms-ids">${setup.meetingId ? `<div><dt>Meeting ID</dt><dd>${esc(setup.meetingId)}</dd></div>` : ''}${setup.passcode ? `<div><dt>Passcode</dt><dd>${esc(setup.passcode)}</dd></div>` : ''}${setup.hostEmail ? `<div><dt>Host</dt><dd>${esc(setup.hostEmail)}</dd></div>` : ''}</dl>` : ''}
      ${chips.length ? `<ul class="ms-chips">${chips.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    </div>`;
}

/**
 * Wires the field. `adapter` connects it to the host form:
 *   when.get() → {date, time, minutes, tz}; when.set(w) writes them back;
 *   title(), hostEmail, cohosts() → names (empty hides the co-host rule).
 */
export function mountMeetingField(field, adapter) {
  if (!field) return;
  field.addEventListener('click', e => {
    if (e.target.closest('[data-ms-open]')) { openMeetingSetup(field, adapter); return; }
    const c = e.target.closest('[data-ms-copy]'); if (c) { copy(c.dataset.msCopy, c); return; }
    if (e.target.closest('[data-ms-remove]')) { setField(field, '', null); u.toast('Meeting removed from this form.'); }
  });
}

function setField(field, href, setup) {
  field.querySelector('[name=meeting]').value = href;
  field.querySelector('[name=meetingSetup]').value = setup ? JSON.stringify(setup) : '';
  const body = field.querySelector('[data-ms-field-body]');
  body.innerHTML = fieldBody(href, setup);
  body.classList.remove('is-swap'); void body.offsetWidth; body.classList.add('is-swap');
  field.classList.remove('is-missing');
}

/** Blocks the host form from saving an online meeting without a link, and points at the field. */
export function guardMeeting(form, field, isOnline) {
  const guard = e => {
    if (!isOnline() || field.querySelector('[name=meeting]').value) return;
    e.preventDefault(); e.stopImmediatePropagation();
    field.classList.remove('is-missing'); void field.offsetWidth; field.classList.add('is-missing');
    field.scrollIntoView({block:'center', behavior:reduced() ? 'auto' : 'smooth'});
    const err = document.getElementById('dialog-error'); if (err) err.textContent = 'Set up the online meeting first. Choose a platform and generate or paste its link.';
  };
  form.addEventListener('submit', guard, true);
  form.closest('dialog')?.addEventListener('close', () => form.removeEventListener('submit', guard, true), {once:true});
}

/* ----------------------------------------------------------- the pop-up */

export function openMeetingSetup(field, adapter) {
  const href = field.querySelector('[name=meeting]').value;
  const current = cleanMeetingSetup(field.querySelector('[name=meetingSetup]').value, href);
  const w = adapter.when.get();
  const st = {
    step:1, title:adapter.title?.() || '', cohosts:adapter.cohosts?.() || [],
    source:current?.source || 'generated', platform:current?.platform || 'meet',
    link:current?.source === 'existing' ? href : '', passcode:current?.source === 'existing' ? current.passcode : '',
    hostEmail:current?.hostEmail || adapter.hostEmail || '', opensEarly:current ? current.opensEarly : 10,
    settings:{...DEFAULTS, ...(current?.settings || {})},
    when:{date:w.date, time:w.time || '17:00', minutes:w.minutes > 0 ? w.minutes : 60, tz:current?.timezone || w.tz || 'Asia/Amman'},
    result:null, busy:false
  };
  if (current?.source === 'generated') { st.result = {url:href, meetingId:current.meetingId, passcode:current.passcode, at:current.generatedAt}; st.result.key = resultKey(st); }

  document.getElementById('ms-dialog')?.remove();
  const dlg = document.createElement('dialog');
  dlg.id = 'ms-dialog'; dlg.className = 'ms-dialog'; dlg.setAttribute('aria-labelledby', 'ms-title');
  dlg.innerHTML = `<div class="ms-shell">
    <header class="ms-head"><div class="ms-head-mark" aria-hidden="true">${u.icon('globe')}</div><div><p class="ms-eyebrow">Online meeting</p><h2 id="ms-title">Set up the meeting</h2>${st.title ? `<p class="ms-sub">${esc(st.title)}</p>` : ''}</div><button type="button" class="ms-x" data-ms="close" aria-label="Close">${u.icon('close')}</button></header>
    <ol class="ms-rail" data-ms-rail></ol>
    <div class="ms-body" data-ms-body></div>
    <p class="ms-error" data-ms-error role="alert"></p>
    <footer class="ms-foot"><button type="button" class="button quiet" data-ms="back"></button><span class="ms-foot-step" data-ms-count></span><button type="button" class="button primary" data-ms="next"></button></footer>
  </div>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => setTimeout(() => dlg.remove(), 0));
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });

  const $ = sel => dlg.querySelector(sel);
  const close = () => { if (reduced()) { dlg.close(); return; } dlg.classList.add('is-leaving'); setTimeout(() => dlg.close(), 180); };
  const error = text => { const n = $('[data-ms-error]'); n.textContent = text || ''; if (text) { n.classList.remove('is-shake'); void n.offsetWidth; n.classList.add('is-shake'); } };
  const names = () => st.source === 'existing' ? ['Link', 'Schedule', 'Review'] : ['Platform', 'Schedule & room', 'Link'];

  function paint(dir = 0) {
    const labels = names();
    $('[data-ms-rail]').innerHTML = labels.map((l, n) => `<li class="${n + 1 < st.step ? 'is-done' : n + 1 === st.step ? 'is-now' : ''}"><span class="ms-rail-dot">${n + 1 < st.step ? u.icon('check') : n + 1}</span><span class="ms-rail-label">${esc(l)}</span></li>`).join('') + `<span class="ms-rail-fill" style="--p:${(st.step - 1) / 2}"></span>`;
    const body = $('[data-ms-body]');
    body.innerHTML = `<div class="ms-pane${dir ? ` is-in-${dir > 0 ? 'next' : 'back'}` : ''}">${st.step === 1 ? paneOne() : st.step === 2 ? paneTwo() : paneThree()}</div>`;
    body.scrollTop = 0;
    $('[data-ms=back]').textContent = st.step === 1 ? 'Cancel' : 'Back';
    $('[data-ms-count]').textContent = `Step ${st.step} of 3`;
    const next = $('[data-ms=next]');
    next.innerHTML = st.step < 3 ? `Continue${u.icon('arrow')}` : `${u.icon('check')}Use this meeting`;
    next.disabled = st.step === 3 && st.source === 'generated' && !st.result;
    error('');
    if (st.step === 1 && st.source === 'existing') linkStatus();
  }

  /* Step 1 · platform or link */
  function paneOne() {
    const source = `<div class="ms-source" role="radiogroup" aria-label="How do you want to add the meeting?">${[['generated', 'sparkle', 'Create a new meeting', 'DeepSprout sets it up and makes the link'], ['existing', 'route', 'Use a link I already have', 'Paste a meeting you created yourself']].map(([v, ic, l, sub]) => `<label class="ms-source-opt"><input type="radio" name="ms-source" value="${v}" ${st.source === v ? 'checked' : ''}><span>${u.icon(ic)}<b>${l}</b><small>${sub}</small></span></label>`).join('')}</div>`;
    if (st.source === 'existing') return `${source}
      <label class="ms-link-field"><span class="ms-label">Meeting link</span><span class="ms-link-input" data-ms-link-wrap>${glyph(parseMeetingLink(st.link).platform)}<input type="url" name="ms-link" value="${esc(st.link)}" placeholder="https://meet.google.com/abc-defg-hij" autocomplete="off" spellcheck="false"></span><small class="ms-link-status" data-ms-link-status aria-live="polite"></small></label>
      <div class="ms-quick"><span>Need to create one first?</span>${Object.entries(P).map(([k, p]) => `<a href="${esc(p.newUrl)}" target="_blank" rel="noopener noreferrer">${glyph(k, 'is-xs')}${k === 'zoom' ? 'Schedule in Zoom' : `New ${esc(p.name)}`}<span aria-hidden="true">↗</span></a>`).join('')}</div>`;
    return `${source}<fieldset class="ms-platforms"><legend class="ms-label">Platform</legend>${Object.entries(P).map(([k, p], n) => `<label class="ms-platform is-${k}" style="--i:${n}"><input type="radio" name="ms-platform" value="${k}" ${st.platform === k ? 'checked' : ''}><span class="ms-platform-card">${glyph(k, 'is-lg')}<span class="ms-check" aria-hidden="true">${u.icon('check')}</span><b>${esc(p.name)}</b><small>${esc(TAGLINE[k])}</small><span class="ms-feat">${FEATURES[k].map(f => `<i>${esc(f)}</i>`).join('')}</span></span></label>`).join('')}</fieldset>`;
  }
  function linkStatus() {
    const input = $('[name=ms-link]'), out = $('[data-ms-link-status]'), wrap = $('[data-ms-link-wrap]');
    if (!input) return;
    const v = input.value.trim(), parsed = parseMeetingLink(v);
    wrap.querySelector('.ms-glyph').outerHTML = glyph(parsed.platform);
    wrap.classList.toggle('is-valid', Boolean(parsed.platform)); wrap.classList.toggle('is-invalid', Boolean(v) && !parsed.platform);
    out.className = `ms-link-status${parsed.platform ? ' is-ok' : v ? ' is-bad' : ''}`;
    out.innerHTML = parsed.platform ? `${u.icon('check')}${esc(P[parsed.platform].name)} link${parsed.meetingId ? ` · ID ${esc(parsed.meetingId)}` : ''}${parsed.passcodeInLink ? ' · passcode included' : ''}` : v ? 'Paste an HTTPS link from Google Meet, Zoom or Microsoft Teams.' : 'We read the platform and meeting ID from the link.';
  }

  /* Step 2 · when, host and room rules */
  function paneTwo() {
    const w = st.when, durations = DURATIONS.includes(Number(w.minutes)) ? DURATIONS : [...DURATIONS, Number(w.minutes)].sort((a, b) => a - b);
    const when = `<section class="ms-block" style="--i:0"><h3>${u.icon('calendar')}When</h3>
      <div class="ms-when"><label><span>Date</span><input type="date" name="ms-date" value="${esc(w.date)}" required></label><label><span>Starts</span><input type="time" name="ms-time" value="${esc(w.time)}" required></label><label><span>Length</span><select name="ms-minutes">${durations.map(n => `<option value="${n}" ${Number(w.minutes) === n ? 'selected' : ''}>${esc(lengthLabel(n))}</option>`).join('')}</select></label><label><span>Time zone</span><select name="ms-tz">${TIMEZONES.map(([v, l]) => `<option value="${v}" ${w.tz === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>
      <p class="ms-when-line" data-ms-when-line>${u.icon('clock')}<span>${esc(whenLine(w))}</span></p></section>`;
    const platform = st.source === 'existing' ? parseMeetingLink(st.link).platform : st.platform, name = P[platform]?.name || 'the platform';
    const host = `<section class="ms-block" style="--i:1"><h3>${u.icon('shield')}Host</h3><div class="ms-grid2">
      ${st.source === 'generated' ? `<label><span>Host account</span><input type="email" name="ms-host" value="${esc(st.hostEmail)}" placeholder="you@school.org" autocomplete="email"><small>The meeting belongs to this ${esc(name)} account, which gets the host controls.</small></label>` : `<label><span>Passcode <em>(optional)</em></span><input type="text" name="ms-passcode" value="${esc(st.passcode)}" maxlength="24" autocomplete="off"><small>${parseMeetingLink(st.link).passcodeInLink ? 'The link already carries it. Add it here to show it in the invitation.' : 'Shown in the invitation for students who join by meeting ID.'}</small></label>`}
      <label><span>Room opens</span><select name="ms-opens">${OPENS.map(([v, l]) => `<option value="${v}" ${st.opensEarly === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><small>Students can enter this long before the start.</small></label></div></section>`;
    if (st.source === 'existing') {
      const check = ['lobby', 'muted', 'attendance'].map(k => rule(k, platform)).filter(Boolean);
      return when + host + `<section class="ms-block ms-checklist" style="--i:2"><h3>${u.icon('check')}Check these in ${esc(name)}</h3><p class="ms-muted">You created this meeting yourself, so its room rules live in ${esc(name)}. We recommend:</p><ul>${check.map(([l, d]) => `<li><b>${esc(l)}</b><small>${esc(d)}</small></li>`).join('')}</ul></section>`;
    }
    const keys = Object.keys(RULES).filter(k => rule(k, platform) && (k !== 'cohosts' || st.cohosts.length));
    const toggles = keys.map(k => { const [l, d] = rule(k, platform); const desc = k === 'cohosts' ? `${st.cohosts.join(', ')} get host controls.` : d; return `<label class="ms-toggle"><input type="checkbox" role="switch" name="ms-rule" value="${k}" ${st.settings[k] ? 'checked' : ''}><span class="ms-switch" aria-hidden="true"></span><span class="ms-toggle-copy"><b>${esc(l)}</b><small>${esc(desc)}</small></span></label>`; }).join('');
    return when + host + `<section class="ms-block" style="--i:2"><h3>${u.icon('settings')}Room rules · ${esc(name)}</h3><div class="ms-toggles">${toggles}</div>${platform === 'teams' ? '<p class="ms-muted">Teams meetings always carry a passcode.</p>' : platform === 'meet' ? '<p class="ms-muted">Google Meet uses a meeting code instead of a passcode.</p>' : ''}</section>`;
  }

  /* Step 3 · generate or review */
  function paneThree() {
    const platform = st.source === 'existing' ? parseMeetingLink(st.link).platform : st.platform, name = P[platform].name;
    const chips = st.source === 'generated' ? Object.keys(RULES).filter(k => rule(k, platform) && st.settings[k] && (k !== 'cohosts' || st.cohosts.length)).map(k => rule(k, platform)[0]) : [];
    const summary = `<div class="ms-summary">${glyph(platform, 'is-xl')}<div><p class="ms-eyebrow">${esc(name)}</p><h3>${esc(st.title || 'Online meeting')}</h3><p>${esc(whenLine(st.when))}</p>${st.source === 'generated' && st.hostEmail ? `<p class="ms-muted">Host · ${esc(st.hostEmail)}</p>` : ''}${chips.length ? `<ul class="ms-chips">${chips.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}</div><button type="button" class="text-link ms-edit-link" data-ms="goto" data-step="2">Edit</button></div>`;
    if (st.source === 'existing') { const p = parseMeetingLink(st.link); return summary + resultCard({url:meetingUrl(st.link), meetingId:p.meetingId, passcode:st.passcode || p.passcode, platform}, false); }
    if (st.result && st.result.key !== resultKey(st)) st.result = null;
    return summary + `<div class="ms-gen" data-ms-gen>${st.result ? resultCard({...st.result, platform}, true) : generator(platform)}</div>`;
  }
  const generator = platform => `<div class="ms-generator"><button type="button" class="ms-generate is-${platform}" data-ms="generate"><span class="ms-generate-shine" aria-hidden="true"></span>${u.icon('sparkle')}<span>Generate ${esc(P[platform].name)} link</span></button><p class="ms-muted">Creates the link, meeting ID${platform === 'meet' ? '' : ' and passcode'}, and an invitation you can send.</p></div>`;
  function resultCard(link, generated) {
    const text = invitation(st, link);
    return `<div class="ms-result">
      <div class="ms-result-head"><span class="ms-ok">${u.icon('check')}</span><div><b>${generated ? 'Your meeting link is ready' : 'Meeting link checked'}</b><small>${generated ? `${esc(P[link.platform].name)} · generated just now` : `${esc(P[link.platform].name)} · from your link`}</small></div></div>
      <div class="ms-linkbox is-reveal"><code>${esc(link.url)}</code><button type="button" class="ms-copy" data-ms="copy" data-copy="${esc(link.url)}"><span data-copy-label>Copy link</span></button></div>
      ${link.meetingId || link.passcode ? `<dl class="ms-ids">${link.meetingId ? `<div><dt>Meeting ID</dt><dd>${esc(link.meetingId)}</dd></div>` : ''}${link.passcode ? `<div><dt>Passcode</dt><dd>${esc(link.passcode)}</dd></div>` : ''}</dl>` : ''}
      <details class="ms-invite"><summary>${u.icon('mail')}Invitation text</summary><pre>${esc(text)}</pre><button type="button" class="ms-copy is-quiet" data-ms="copy" data-copy="${esc(text)}"><span data-copy-label>Copy invitation</span></button></details>
      ${generated ? `<p class="ms-note">${u.icon('info')}<span><b>Demo link.</b> DeepSprout isn’t connected to ${esc(P[link.platform].name)} yet, so this room won’t open. For a live room now, go back to step 1 and choose “Use a link I already have”.</span></p><button type="button" class="text-link ms-regen" data-ms="regenerate">${u.icon('history')}Generate a different link</button>` : ''}
    </div>`;
  }
  async function generate() {
    if (st.busy) return;
    st.busy = true;
    const box = $('[data-ms-gen]'), platform = st.platform;
    const stages = ['Reserving the meeting room', 'Applying the room rules', 'Writing the invitation'];
    box.innerHTML = `<div class="ms-progress" role="status" aria-live="polite">${glyph(platform, 'is-xl ms-orbit')}<ol>${stages.map(x => `<li>${u.icon('check')}<span>${x}</span></li>`).join('')}</ol></div>`;
    const items = box.querySelectorAll('li');
    for (const li of items) { li.classList.add('is-now'); await wait(430); li.classList.replace('is-now', 'is-done'); }
    await wait(160);
    st.result = {...generateLink(platform, st.settings), at:new Date().toISOString()}; st.result.key = resultKey(st);
    st.busy = false;
    if (!dlg.open) return;
    box.innerHTML = resultCard({...st.result, platform}, true);
    $('[data-ms=next]').disabled = false;
    $('[data-ms=next]').classList.add('is-ready');
  }

  function readStep() {
    if (st.step === 1 && st.source === 'existing') st.link = $('[name=ms-link]').value.trim();
    if (st.step === 2) {
      st.when = {date:$('[name=ms-date]').value, time:$('[name=ms-time]').value, minutes:Number($('[name=ms-minutes]').value), tz:$('[name=ms-tz]').value};
      st.opensEarly = Number($('[name=ms-opens]').value);
      if (st.source === 'generated') { st.hostEmail = $('[name=ms-host]').value.trim(); dlg.querySelectorAll('[name=ms-rule]').forEach(x => { st.settings[x.value] = x.checked; }); }
      else st.passcode = $('[name=ms-passcode]').value.trim();
    }
  }
  function validate() {
    if (st.step === 1 && st.source === 'existing' && !parseMeetingLink(st.link).platform) return st.link ? 'This link isn’t from Google Meet, Zoom or Microsoft Teams, or it doesn’t start with https://.' : 'Paste the meeting link to continue.';
    if (st.step === 2) {
      if (!st.when.date || !st.when.time) return 'Choose the date and start time.';
      if (toMin(st.when.time) + st.when.minutes > 23 * 60 + 59) return 'The meeting must end before midnight. Choose an earlier start or a shorter length.';
      if (st.source === 'generated' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(st.hostEmail)) return 'Enter the email of the account that will host the meeting.';
    }
    return '';
  }
  function finish() {
    const platform = st.source === 'existing' ? parseMeetingLink(st.link).platform : st.platform;
    const link = st.source === 'existing' ? {url:meetingUrl(st.link), ...parseMeetingLink(st.link)} : st.result;
    if (!link?.url) { error('Generate the link first.'); return; }
    const setup = cleanMeetingSetup({source:st.source, meetingId:link.meetingId, passcode:st.source === 'existing' ? (st.passcode || link.passcode) : link.passcode, hostEmail:st.source === 'generated' ? st.hostEmail : '', timezone:st.when.tz, opensEarly:st.opensEarly, settings:st.source === 'generated' ? st.settings : {}, generatedAt:st.result?.at || ''}, link.url);
    setup.platform = platform;
    adapter.when.set(st.when);
    setField(field, link.url, setup);
    close();
    u.toast(`${P[platform].name} meeting added. Save the form to keep it.`);
  }

  dlg.addEventListener('click', e => {
    const b = e.target.closest('[data-ms]'); if (!b) return;
    const act = b.dataset.ms;
    if (act === 'close') close();
    else if (act === 'back') { if (st.step === 1) close(); else { readStep(); st.step--; paint(-1); } }
    else if (act === 'next') { readStep(); const msg = validate(); if (msg) { error(msg); return; } if (st.step < 3) { st.step++; paint(1); } else finish(); }
    else if (act === 'goto') { st.step = Number(b.dataset.step); paint(-1); }
    else if (act === 'generate' || act === 'regenerate') { st.result = null; $('[data-ms=next]').disabled = true; generate(); }
    else if (act === 'copy') copy(b.dataset.copy, b);
  });
  dlg.addEventListener('change', e => {
    if (e.target.name === 'ms-source') { if (st.step === 1 && st.source === 'existing') st.link = $('[name=ms-link]')?.value.trim() || st.link; st.source = e.target.value; paint(); if (st.source === 'existing') $('[name=ms-link]')?.focus(); }
    if (e.target.name === 'ms-platform') st.platform = e.target.value;
  });
  dlg.addEventListener('input', e => {
    if (e.target.name === 'ms-link') { linkStatus(); error(''); }
    if (['ms-date', 'ms-time', 'ms-minutes', 'ms-tz'].includes(e.target.name)) $('[data-ms-when-line] span').textContent = whenLine({date:$('[name=ms-date]').value, time:$('[name=ms-time]').value || '00:00', minutes:Number($('[name=ms-minutes]').value), tz:$('[name=ms-tz]').value});
  });
  dlg.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio])')) { e.preventDefault(); $('[data-ms=next]').click(); } });
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });

  paint();
  dlg.showModal();
  requestAnimationFrame(() => dlg.querySelector(st.source === 'existing' ? '[name=ms-link]' : 'input[name=ms-platform]:checked')?.focus());
}
