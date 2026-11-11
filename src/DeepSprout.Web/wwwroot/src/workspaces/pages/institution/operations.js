/**
 * Sessions, factual attendance and the excuse chain.
 * Representative: schedules sessions, assigns Supervisor duty, sees rosters
 * and makes the final excuse decision. Supervisors run attendance in the
 * Attendance Center (pages/supervisor/attendance-center.js) and recommend on
 * excuses.
 */
import * as u from '../../ui.js';
import {esc,nameOf,pill,head,stats,stat,card,personCell,emptyState,summary,initiativeSwitcher,withInitiative,fmtDate,sessionWhen,tabs,picker} from './common.js';
import {needsSupervisor,assignedActiveSupervisors,activeGrantsFor,representativesOf,isActiveSupervisor,confirmedInMode,modeCapacity,today,checkInWindow,windowMessage} from '../../initiative-rules.js';
import {mapUrl,meetingUrl} from '../../session-access.js';
import {methodLabel} from '../../attendance/model.js';

const pickInitiative = (ctx, initiatives) => { const i = initiatives.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives.find(x => x.status === 'Published') || initiatives[0]; if (i) ctx.localUI.initiativeId = i.id; return i; };
const roster = (s, ss) => s.sessionRegistrations.filter(r => r.sessionId === ss.id && r.status === 'Confirmed');
const attendanceFor = (s, r) => (s.sessionAttendance || []).find(a => a.registrationId === r.id);

function supervisorChip(s, ss) {
  if (!ss.attendanceRequired) return pill('Open', 'No attendance');
  const names = assignedActiveSupervisors(s, ss).map(pid => nameOf(s, pid));
  return names.length ? `<span class="iw-duty">${u.icon('shield')}${esc(names.join(', '))}</span>` : pill('Needs Supervisor');
}
function seatsText(s, ss) {
  const parts = [];
  if (ss.format !== 'In-person') parts.push(`${confirmedInMode(s, ss, 'Online')}/${modeCapacity(ss, 'Online')} online`);
  if (ss.format !== 'Online') parts.push(`${confirmedInMode(s, ss, 'In-person')}/${modeCapacity(ss, 'In-person')} in person`);
  return parts.join(' · ');
}

/** A real month grid: sessions sit on their day; the month's agenda below keeps actions on one row. */
function monthCalendar(ctx, i, sessions, role) {
  const {s, route:r} = ctx, day = today(s);
  const month = /^\d{4}-\d{2}$/.test(r.query.get('month') || '') ? r.query.get('month') : ((sessions.find(x => x.date >= day) || sessions.at(-1))?.date || day).slice(0, 7);
  const [y, m] = month.split('-').map(Number), first = new Date(Date.UTC(y, m - 1, 1)), lead = (first.getUTCDay() + 6) % 7, count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const shift = n => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
  const nav = n => withInitiative(`${r.area}/${r.page}?view=calendar&month=${shift(n)}`, i);
  const title = first.toLocaleDateString('en-GB', {month:'long', year:'numeric', timeZone:'UTC'});
  const inMonth = sessions.filter(x => x.date.startsWith(month));
  const cells = [];
  for (let n = 0; n < lead; n++) cells.push('<div class="iw-cal-cell is-out" aria-hidden="true"></div>');
  for (let d = 1; d <= count; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`, list = inMonth.filter(x => x.date === date);
    cells.push(`<div class="iw-cal-cell${date === day ? ' is-today' : ''}${list.length ? ' has-events' : ''}"><span class="iw-cal-num">${d}</span>${list.map(ss => `<a class="iw-cal-event${needsSupervisor(s, ss) ? ' is-warning' : ''}${ss.status === 'Cancelled' ? ' is-cancelled' : ''}" href="${u.href(`${r.area}/${r.page}/${ss.id}`)}" title="${esc(`${ss.title} · ${ss.time}–${ss.endTime}`)}"><b>${esc(ss.time)}</b> ${esc(ss.title)}</a>`).join('')}</div>`);
  }
  while (cells.length % 7) cells.push('<div class="iw-cal-cell is-out" aria-hidden="true"></div>');
  const agenda = inMonth.map(ss => {
    const acts = [];
    if (role === 'rep' && ss.status === 'Draft') acts.push(u.button('Publish', 'session-publish', {id:ss.id}, 'button primary small'));
    if (role === 'rep' && ss.status !== 'Cancelled') acts.push(u.button('Edit', 'session-edit', {id:ss.id}, 'button quiet small'));
    if (ss.status !== 'Cancelled' && ss.attendanceRequired) acts.push(u.button(needsSupervisor(s, ss) ? 'Assign supervisor' : 'Change supervisor', 'session-assign', {id:ss.id}, needsSupervisor(s, ss) ? 'button primary small' : 'button quiet small'));
    const dt = new Date(ss.date + 'T12:00');
    return `<li class="iw-agenda-row${needsSupervisor(s, ss) ? ' is-warning' : ''}"><time><b>${dt.getDate()}</b><span>${esc(dt.toLocaleDateString('en-GB', {weekday:'short'}))}</span></time><div class="iw-agenda-main"><a class="iw-agenda-title" href="${u.href(`${r.area}/${r.page}/${ss.id}`)}">${esc(ss.title)}</a><p>${esc(ss.time)}–${esc(ss.endTime)} · ${esc(ss.format)}${ss.venue ? ` · ${esc(ss.venue)}` : ''}</p><div class="iw-agenda-meta">${pill(ss.status)}${supervisorChip(s, ss)}<small>${esc(seatsText(s, ss))}</small></div></div><div class="actions">${acts.join('')}</div></li>`;
  }).join('');
  return `<section class="iw-card iw-cal iw-reveal" aria-label="${esc(title)}"><header class="iw-cal-head"><h2>${esc(title)}</h2><div class="iw-cal-nav"><a class="button quiet small" href="${u.href(nav(-1))}" aria-label="Previous month">‹</a><a class="button quiet small" href="${u.href(withInitiative(`${r.area}/${r.page}?view=calendar&month=${day.slice(0, 7)}`, i))}">Today</a><a class="button quiet small" href="${u.href(nav(1))}" aria-label="Next month">›</a></div></header>
    <div class="iw-cal-grid" role="presentation">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<div class="iw-cal-dow">${d}</div>`).join('')}${cells.join('')}</div></section>
    <section class="iw-card iw-reveal"><div class="iw-card-head"><h2>${inMonth.length ? `${inMonth.length} ${inMonth.length === 1 ? 'session' : 'sessions'} in ${esc(first.toLocaleDateString('en-GB', {month:'long', timeZone:'UTC'}))}` : `No sessions in ${esc(title)}`}</h2></div>${inMonth.length ? `<ol class="iw-agenda-list">${agenda}</ol>` : '<p class="iw-muted">Use the arrows to see other months, or create a session.</p>'}</section>`;
}

/* ------------------------------------------------------- Representative */

export function renderSessions(ctx, {role, initiatives}) {
  const {s, route:r} = ctx;
  if (r.id) return renderSessionDetail(ctx, r.id, role, initiatives);
  const i = pickInitiative(ctx, initiatives);
  if (!i) return head({eyebrow:'SESSIONS & WORKSHOPS', title:'Sessions & workshops'}) + emptyState('No initiative yet.', 'Sessions belong to an initiative.', role === 'rep' ? u.link('Create an initiative', 'organization/initiatives/new', 'button primary') : '');
  const sessions = s.sessions.filter(x => x.initiativeId === i.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const calendar = r.query.get('view') === 'calendar';
  const sum = summary(s, i);
  const actionsFor = ss => {
    const out = [];
    if (role === 'rep' && ss.status === 'Draft') out.unshift(u.button('Publish', 'session-publish', {id:ss.id}, 'button primary small'));
    if (role === 'rep' && ss.status !== 'Cancelled') out.push(u.button('Edit', 'session-edit', {id:ss.id}, 'button quiet small'));
    if (ss.status !== 'Cancelled' && ss.attendanceRequired) out.push(u.button(needsSupervisor(s, ss) ? 'Assign supervisor' : 'Change supervisor', 'session-assign', {id:ss.id}, needsSupervisor(s, ss) ? 'button primary small' : 'button quiet small'));
    return `<div class="actions">${out.join('')}</div>`;
  };
  const list = calendar
    ? monthCalendar(ctx, i, sessions, role)
    : `<div class="iw-card iw-reveal">${sessions.length ? u.table(['Session','When','Mode & seats','Supervisor','Status','Actions'], sessions.map(ss => ({search:ss.title, status:ss.status, cells:[`<a class="iw-row-link" href="${u.href(`${r.area}/${r.page}/${ss.id}`)}">${esc(ss.title)}</a><small>${esc(ss.speaker || '')}</small>`, `${esc(sessionWhen(ss))}<small>${esc(ss.timezone || 'Asia/Amman')}</small>`, `${esc(ss.format)}<small>${esc(seatsText(s, ss))}</small>`, supervisorChip(s, ss), `${pill(ss.status)}${ss.closedOut ? '<small>Attendance closed</small>' : ''}`, actionsFor(ss)]}))) : emptyState('No sessions yet.', 'Add an online, in-person or hybrid session. Session registration is separate from initiative membership.', role === 'rep' ? u.button('Create session', 'session-create', {initiative:i.id}) : '')}</div>`;
  return head({eyebrow:role === 'rep' ? 'TIME TOGETHER' : 'SUPERVISOR · SCHEDULE', title:role === 'rep' ? 'Sessions & workshops' : 'Schedule', lead:'Plan sessions, see who is coming, and make sure each one has a Supervisor to take attendance.', meta:initiativeSwitcher(ctx, initiatives, i), actions:role === 'rep' ? u.button('Create session', 'session-create', {initiative:i.id}) : ''})
    + (sum.needsSupervisor.length ? `<div class="iw-banner is-warning iw-reveal">${u.icon('shield')}<div><strong>${sum.needsSupervisor.length} session${sum.needsSupervisor.length === 1 ? '' : 's'} need${sum.needsSupervisor.length === 1 ? 's' : ''} a Supervisor.</strong><p>Attendance confirmation is disabled until an active Supervisor is assigned. ${sum.supervisors.length ? 'Assign duty from the session row.' : 'Invite a Supervisor from Team & Groups first.'}</p></div>${role === 'rep' && !sum.supervisors.length ? u.link('Invite a Supervisor', withInitiative('organization/team', i), 'button quiet small') : ''}</div>` : '')
    + tabs([['List', withInitiative(`${r.area}/${r.page}`, i), 'list'], ['Calendar', withInitiative(`${r.area}/${r.page}?view=calendar`, i), 'calendar']], calendar ? 'calendar' : 'list') + list;
}

export function renderSessionDetail(ctx, id, role, initiatives) {
  const {s, route:r} = ctx;
  const ss = s.sessions.find(x => x.id === id && initiatives.some(i => i.id === x.initiativeId));
  if (!ss) return u.missing('session');
  const i = s.initiatives.find(x => x.id === ss.initiativeId);
  const regs = roster(s, ss);
  const rows = regs.map(reg => { const a = attendanceFor(s, reg); const ex = a ? (s.excuses || []).find(e => e.attendanceId === a.id) : null; return {search:nameOf(s, reg.personId), cells:[personCell(s, reg.personId), esc(reg.mode), `<code class="iw-code">${esc(reg.code)}</code>`, a ? `${pill(a.status)}<small>${esc(methodLabel(a.method))} · ${esc(nameOf(s, a.actorId))}</small>` : pill('Not Recorded', 'Not recorded'), ex ? pill(ex.status === 'Accepted' ? 'Excused' : ex.status, ex.status === 'Accepted' ? 'Excused absence' : `Excuse: ${ex.status}`) : '<small>—</small>']}; });
  return `<p class="breadcrumbs">${u.link(role === 'rep' ? 'Sessions & workshops' : 'Schedule', withInitiative(`${r.area}/${r.page}`, i), 'text-link')} / ${esc(ss.title)}</p>`
    + head({eyebrow:`${i.title.toUpperCase()} · SESSION`, title:ss.title, lead:ss.description || '', meta:`${pill(ss.status)} ${supervisorChip(s, ss)}`, actions:[role === 'rep' && ss.status === 'Draft' ? u.button('Publish', 'session-publish', {id:ss.id}) : '', role === 'rep' && ss.status !== 'Cancelled' ? u.button('Edit / reschedule', 'session-edit', {id:ss.id}, 'button quiet') : '', ss.status !== 'Cancelled' && ss.attendanceRequired ? u.button('Assign supervisor', 'session-assign', {id:ss.id}, 'button quiet') : '', role === 'rep' && ['Draft','Published'].includes(ss.status) ? u.button('Cancel session', 'session-cancel', {id:ss.id}, 'button danger') : '', role === 'supervisor' && (ss.supervisorIds || []).includes(ctx.person.id) && ss.status === 'Published' ? u.link('Open attendance', `supervisor/attendance/${ss.id}`, 'button primary') : ''].join('')})
    + (needsSupervisor(s, ss) ? `<div class="iw-banner is-warning iw-reveal">${u.icon('shield')}<div><strong>Needs Supervisor</strong><p>Attendance confirmation is disabled for this session until an active Supervisor is assigned.</p></div></div>` : '')
    + `<div class="iw-split">${card('Details', `<dl class="iw-facts"><div><dt>When</dt><dd>${esc(sessionWhen(ss))} · ${esc(ss.timezone || 'Asia/Amman')}</dd></div><div><dt>Mode</dt><dd>${esc(ss.format)}</dd></div>${ss.venue ? `<div><dt>Venue</dt><dd>${esc(ss.venue)}${ss.address && ss.address !== ss.venue ? `<br>${esc(ss.address)}` : ''}<br><a class="text-link" href="${esc(mapUrl(ss.address || ss.venue))}" target="_blank" rel="noopener noreferrer">Open map ↗</a></dd></div>` : ''}${ss.format !== 'In-person' ? `<div><dt>Online access</dt><dd>${meetingUrl(ss.meeting) ? `<a class="text-link" href="${esc(meetingUrl(ss.meeting))}" target="_blank" rel="noopener noreferrer">Open meeting link ↗</a>` : esc(ss.meeting || 'Shared with confirmed registrants')}</dd></div>` : ''}<div><dt>Seats</dt><dd>${esc(seatsText(s, ss))}</dd></div><div><dt>Registration window</dt><dd>${esc(ss.registrationOpen ? fmtDate(ss.registrationOpen) : 'Now')} – ${esc(fmtDate(ss.registrationClose || ss.date))}</dd></div><div><dt>Agenda</dt><dd>${esc(ss.agenda || '—')}</dd></div><div><dt>Completion rule</dt><dd>${esc(ss.completionRule || 'Attendance only')}</dd></div><div><dt>Check-in window</dt><dd>${esc(windowMessage(checkInWindow(s, ss)))}</dd></div></dl>${ss.cancelReason ? `<p class="iw-muted">Cancelled: ${esc(ss.cancelReason)}</p>` : ''}`)}
      ${card('Change history', `<ol class="iw-history">${(ss.history || []).map(h => `<li><time>${esc(fmtDate(h.at))}</time><span>${esc(h.change)}${h.reason ? ` · ${esc(h.reason)}` : ''}</span><small>${esc(nameOf(s, h.actorId))}</small></li>`).join('') || '<li><span>No changes recorded.</span></li>'}</ol>`)}</div>`
    + card(`Confirmed roster · ${regs.length}`, regs.length ? u.table(['Participant','Mode','Booking code','Factual attendance','Excuse'], rows) : '<p class="iw-muted">No confirmed registrations yet. Accepted students register from My Initiatives.</p>', {extra:role === 'rep' ? '<small class="iw-muted">Read-only: attendance is recorded by the assigned Supervisor.</small>' : ''});
}

function sessionForm(ctx, ss, initiativeId) {
  const i = ctx.s.initiatives.find(x => x.id === initiativeId);
  const supervisors = activeGrantsFor(ctx.s, initiativeId, 'supervisor');
  const hosts = new Map();
  const addHosts = (ids, role, description) => ids.forEach(pid => {
    const person = ctx.s.people.find(p => p.id === pid && p.status === 'Active');
    if (!person) return;
    const existing = hosts.get(person.name);
    if (existing) { if (!existing.tags.includes(role)) existing.tags.push(role); return; }
    hosts.set(person.name, {value:person.name, label:person.name, sub:description, tags:[role], person:true});
  });
  addHosts(representativesOf(ctx.s, i), 'representative', 'Institution representative');
  addHosts(supervisors.map(g => g.personId), 'supervisor', 'Supervisor · this initiative');
  addHosts(activeGrantsFor(ctx.s, initiativeId, 'coach').map(g => g.personId), 'coach', 'Coach · this initiative');
  const selectedHost = ss.speaker || ctx.person.name;
  if (ss.speaker && !hosts.has(ss.speaker)) hosts.set(ss.speaker, {value:ss.speaker, label:ss.speaker, sub:'Previously selected host', tags:[], person:true});
  const hostPicker = picker({attrs:'name="speaker" required', value:selectedHost, label:'Host / facilitator', options:[...hosts.values()], search:true, searchLabel:'Search people…', filters:[['representative','Representative'],['supervisor','Supervisor'],['coach','Coach']], none:'No people match this search.'});
  const selected = ss.format === 'In-person' || (ss.format === 'Hybrid' && ss.venue) ? 'In-person' : 'Online';
  return `<div class="iw-session-intro"><p class="eyebrow">SESSION DETAILS</p><p>Choose how students will join. Their local confirmation preview will include only the relevant map or meeting link.</p></div>
    ${u.field('title', 'Session title', ss.title || '', 'text', true)}<div class="field iw-session-host"><span>Host / facilitator <span class="required">*</span></span>${hostPicker}<small>Choose a representative, Supervisor or Coach for this initiative.</small></div>${u.area('description', 'Short description', ss.description || '')}${u.area('agenda', 'Agenda', ss.agenda || '')}
    <div class="form-grid">${u.field('date', 'Date', ss.date || i.start, 'date', true)}${u.field('time', 'Start', ss.time || '17:00', 'time', true)}${u.field('endTime', 'End', ss.endTime || '18:00', 'time', true)}${u.field('registrationOpen', 'Registration opens', ss.registrationOpen || i.registrationOpen || '', 'date')}${u.field('registrationClose', 'Registration closes', ss.registrationClose || '', 'date')}</div>
    <fieldset class="iw-session-mode"><legend>Where will this session happen?</legend><div class="iw-session-options">
      <label><input type="radio" name="format" value="Online" ${selected === 'Online' ? 'checked' : ''}><span><strong>Remote</strong><small>Share a Google Meet or Zoom link</small></span></label>
      <label><input type="radio" name="format" value="In-person" ${selected === 'In-person' ? 'checked' : ''}><span><strong>On-site</strong><small>Show the address and map</small></span></label>
    </div></fieldset>
    <section class="iw-session-access" data-session-panel="Online" aria-label="Remote access">${u.field('meeting', 'Google Meet or Zoom link', meetingUrl(ss.meeting), 'url', false, 'placeholder="https://meet.google.com/..."')}<div class="form-grid">${u.field('onlineCapacity', 'Remote seats', ss.onlineCapacity || 30, 'number', false, 'min="1"')}</div><p class="iw-session-hint">The student preview will show this link after the session is published and when a booking is confirmed.</p></section>
    <section class="iw-session-access" data-session-panel="In-person" aria-label="On-site location">${u.field('venue', 'Venue name', ss.venue || i.venue || '', 'text', false, 'placeholder="Horizon Youth Center"')}${u.field('address', 'Street address or map location', ss.address || '', 'text', false, 'placeholder="Choose a point on the map or enter an address"')}<div class="form-grid">${u.field('inPersonCapacity', 'On-site seats', ss.inPersonCapacity || 20, 'number', false, 'min="1"')}</div><div class="iw-session-map"><div class="iw-session-map-head"><div><strong>Choose the meeting point</strong><small>Choose a city, drag to move, then click to place the pin</small></div><a data-session-map-link href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">View in Google Maps ↗</a></div><label class="iw-session-map-city">Jump to city <select data-session-map-city>${[['Amman',31.9539,35.9106],['Irbid',32.5568,35.8469],['Zarqa',32.0728,36.088],['As-Salt',32.0392,35.7272],['Mafraq',32.3429,36.208],['Jerash',32.2819,35.8993],['Ajloun',32.3326,35.7517],['Madaba',31.7167,35.7939],['Karak',31.1853,35.7047],['Tafilah',30.8338,35.6161],['Ma’an',30.194,35.734],['Aqaba',29.5267,35.0078]].map(([city,lat,lon]) => `<option value="${lat},${lon}">${city}</option>`).join('')}</select></label><div class="iw-session-map-canvas" data-session-map role="button" tabindex="0" aria-label="Choose meeting point on map"><div class="iw-session-map-tiles"></div><span class="iw-session-map-pin" aria-hidden="true" hidden>${u.icon('pin')}</span><div class="iw-session-map-controls"><button type="button" data-map-zoom="1" aria-label="Zoom in">+</button><button type="button" data-map-zoom="-1" aria-label="Zoom out">−</button></div></div><p class="iw-session-map-status" data-session-map-status role="status">Choose a point on the map, or type a street address above.</p><small class="iw-session-map-credit">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>. Google Maps opens separately for viewing.</small></div></section>
    ${u.field('completionRule', 'Completion rule', ss.completionRule || 'Attendance only')}
    ${u.checkbox('attendanceRequired', 'This session records attendance (needs an active Supervisor)', ss.attendanceRequired !== false)}
    <fieldset class="iw-fieldset"><legend>Check-in window policy</legend><div class="form-grid">${u.select('checkInMode', 'Policy', [['window','Window around the session'],['anytime','Any time (explicit exception)']], ss.checkInPolicy?.mode || 'window')}${u.field('checkInBefore', 'Opens · minutes before start', ss.checkInPolicy?.before ?? 30, 'number', false, 'min="0" max="240"')}${u.field('checkInAfter', 'Closes · minutes after end', ss.checkInPolicy?.after ?? 30, 'number', false, 'min="0" max="720"')}</div><small class="iw-muted">QR, code and online roster check-in work only inside the window. After it closes, the Supervisor can still record a reasoned manual exception or a correction.</small></fieldset>
    ${supervisors.length ? `<fieldset class="iw-fieldset"><legend>Responsible Supervisor(s)</legend>${supervisors.map(g => u.checkbox('supervisorIds', nameOf(ctx.s, g.personId), (ss.supervisorIds || []).includes(g.personId), g.personId)).join('')}</fieldset>` : '<p class="iw-muted">No active Supervisor yet — the session will show “Needs Supervisor” until one is assigned.</p>'}
    ${ss.status === 'Published' ? u.area('reason', 'Reason for the change (sent to registrants if the time or place moves)', '') : ''}`;
}
function syncSessionAccess(form) {
  const mode = form.querySelector('input[name="format"]:checked')?.value || 'Online';
  form.querySelectorAll('[data-session-panel]').forEach(panel => {
    const active = panel.dataset.sessionPanel === mode;
    panel.hidden = !active;
    panel.querySelectorAll('input').forEach(input => { input.disabled = !active; input.required = active && ['meeting','venue','address'].includes(input.name); });
  });
  const link = form.querySelector('[data-session-map-link]');
  const address = form.elements.address?.value.trim();
  if (link) { link.href = mapUrl(address || 'Amman, Jordan'); link.hidden = !address; }
}
const mapPoint = (lat, lon, zoom) => { const scale = 256 * 2 ** zoom; return [(lon + 180) / 360 * scale, (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * scale]; };
const mapCoords = (x, y, zoom) => { const scale = 256 * 2 ** zoom; return [(180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - 2 * y / scale))), x / scale * 360 - 180]; };
function mountSessionMap(form) {
  const map = form.querySelector('[data-session-map]');
  const address = form.elements.address;
  const match = address.value.trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  let lat = match ? Number(match[1]) : 31.9539, lon = match ? Number(match[2]) : 35.9106, zoom = 12;
  let pin = match ? [lat, lon] : null, drag = null, dragged = false;
  const paint = () => {
    const tiles = map.querySelector('.iw-session-map-tiles'), [cx, cy] = mapPoint(lat, lon, zoom);
    tiles.replaceChildren(); tiles.style.transform = '';
    for (let y = Math.floor(cy / 256) - 1; y <= Math.floor(cy / 256) + 1; y++) for (let x = Math.floor(cx / 256) - 2; x <= Math.floor(cx / 256) + 2; x++) {
      const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.src = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
      img.style.left = `calc(50% + ${Math.round(x * 256 - cx)}px)`; img.style.top = `calc(50% + ${Math.round(y * 256 - cy)}px)`; tiles.append(img);
    }
    const marker = map.querySelector('.iw-session-map-pin'); marker.hidden = !pin;
    if (pin) { const [px, py] = mapPoint(pin[0], pin[1], zoom); marker.style.left = `calc(50% + ${Math.round(px - cx)}px)`; marker.style.top = `calc(50% + ${Math.round(py - cy)}px)`; }
  };
  const select = (dx = 0, dy = 0) => {
    const [cx, cy] = mapPoint(lat, lon, zoom); pin = mapCoords(cx + dx, cy + dy, zoom);
    address.value = `${pin[0].toFixed(5)}, ${pin[1].toFixed(5)}`;
    form.querySelector('[data-session-map-status]').textContent = `Meeting point selected · ${address.value}`;
    address.dispatchEvent(new Event('input', {bubbles:true})); paint();
  };
  map.addEventListener('click', e => { if (e.target.closest('[data-map-zoom]')) return; if (dragged) { dragged = false; return; } const r = map.getBoundingClientRect(); select(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2); });
  map.addEventListener('keydown', e => { if (e.target !== map || !['Enter',' '].includes(e.key)) return; e.preventDefault(); select(); });
  map.addEventListener('pointerdown', e => { if (e.target.closest('[data-map-zoom]')) return; drag = {id:e.pointerId, x:e.clientX, y:e.clientY, lat, lon}; map.setPointerCapture(e.pointerId); });
  map.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; map.querySelector('.iw-session-map-tiles').style.transform = `translate(${e.clientX - drag.x}px, ${e.clientY - drag.y}px)`; });
  map.addEventListener('pointerup', e => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 5) { const [cx, cy] = mapPoint(drag.lat, drag.lon, zoom); [lat, lon] = mapCoords(cx - dx, cy - dy, zoom); dragged = true; setTimeout(() => { dragged = false; }, 0); } drag = null; paint(); });
  map.addEventListener('pointercancel', () => { drag = null; paint(); });
  map.querySelectorAll('[data-map-zoom]').forEach(button => button.addEventListener('click', () => { zoom = Math.max(8, Math.min(17, zoom + Number(button.dataset.mapZoom))); paint(); }));
  form.querySelector('[data-session-map-city]').addEventListener('change', e => { [lat, lon] = e.target.value.split(',').map(Number); paint(); map.focus(); });
  address.addEventListener('input', () => { const m = address.value.trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/); if (m && Math.abs(Number(m[1])) <= 85 && Math.abs(Number(m[2])) <= 180) { pin = [Number(m[1]), Number(m[2])]; [lat, lon] = pin; paint(); } else if (pin) { pin = null; paint(); } });
  if (pin) form.querySelector('[data-session-map-status]').textContent = `Meeting point selected · ${address.value}`;
  paint();
}
export function sessionAction(action, target, ctx) {
  const d = target.dataset, s = ctx.s;
  if (action === 'session-create' || action === 'session-edit') {
    const ss = s.sessions.find(x => x.id === d.id) || {};
    const initiativeId = ss.initiativeId || d.initiative || ctx.localUI.initiativeId;
    u.modal(ss.id ? 'Edit or reschedule session' : 'Create a session', sessionForm(ctx, ss, initiativeId), (v, f) => {
      const id = ctx.run('initiative.session.save', {...v, id:ss.id, initiativeId, attendanceRequired:f.elements.attendanceRequired.checked, supervisorIds:[...f.querySelectorAll('input[name="supervisorIds"]:checked')].map(x => x.value)}, ss.id ? 'Session updated. Registrants are notified of access changes.' : 'Session saved as a draft.');
      if (f.dataset.sessionIntent === 'publish') ctx.run('initiative.session.publish', {id}, 'Session published. Accepted students have a local notice and email preview.');
      ctx.go(`${ctx.route.area}/sessions/${id}`);
    }, ss.status === 'Published' ? 'Save changes' : 'Save & publish', {wide:true});
    const form = document.getElementById('dialog-form');
    const dialog = document.getElementById('workspace-dialog');
    form.dataset.sessionIntent = ss.status === 'Published' ? 'save' : 'publish';
    if (ss.status !== 'Published') {
      const publish = document.getElementById('dialog-save');
      const choosePublish = () => { form.dataset.sessionIntent = 'publish'; };
      publish.addEventListener('click', choosePublish);
      const draft = document.createElement('button'); draft.type = 'button'; draft.className = 'button quiet'; draft.textContent = 'Save draft';
      draft.addEventListener('click', () => { form.dataset.sessionIntent = 'draft'; form.requestSubmit(publish); });
      publish.before(draft);
      dialog.addEventListener('close', () => { draft.remove(); publish.removeEventListener('click', choosePublish); delete form.dataset.sessionIntent; }, {once:true});
    }
    form.onchange = () => syncSessionAccess(form);
    form.oninput = event => { if (event.target.name === 'address') syncSessionAccess(form); };
    syncSessionAccess(form);
    mountSessionMap(form);
    return true;
  }
  if (action === 'session-publish') { ctx.run('initiative.session.publish', {id:d.id}, 'Session published. Accepted students have a local notice and email preview.'); ctx.render(); return true; }
  if (action === 'session-cancel') { u.modal('Cancel this session?', `<p>Registrants are notified. Existing registrations and attendance stay in history.</p>${u.area('reason', 'Reason', '', true)}`, v => { ctx.run('initiative.session.cancel', {id:d.id, reason:v.reason}, 'Session cancelled and registrants notified.'); ctx.render(); }, 'Cancel session'); return true; }
  if (action === 'session-assign') {
    const ss = s.sessions.find(x => x.id === d.id), sups = activeGrantsFor(s, ss.initiativeId, 'supervisor');
    u.modal('Responsible Supervisor', sups.length ? `<p>Only active Supervisors of this initiative can confirm attendance.</p><fieldset class="iw-fieldset">${sups.map(g => u.checkbox('supervisorIds', nameOf(s, g.personId), (ss.supervisorIds || []).includes(g.personId), g.personId)).join('')}</fieldset>` : '<p>No active Supervisor has accepted an invitation for this initiative yet. Invite one from Team & Groups.</p>', (v, f) => { ctx.run('initiative.session.assign', {id:ss.id, supervisorIds:[...f.querySelectorAll('input[name="supervisorIds"]:checked')].map(x => x.value)}, 'Supervisor duty updated.'); ctx.render(); }, 'Save duty');
    return true;
  }
  return false;
}

/* ---------------------------------------------------------- Excuses */

export function renderExcuses(ctx, {role, initiatives, embed = null}) {
  const {s, route:r} = ctx;
  const i = pickInitiative(ctx, initiatives);
  if (!i) return head({eyebrow:'EXCUSES', title:role === 'rep' ? 'Attendance & excuses' : 'Notes & excuses'}) + emptyState('No initiative in your scope.', 'Excuses belong to a specific missed session.');
  const all = (s.excuses || []).filter(e => e.initiativeId === i.id).sort((a, b) => String(b.created).localeCompare(String(a.created)));
  const waiting = role === 'rep' ? all.filter(e => e.status === 'Recommended' || (e.status === 'Submitted' && !activeGrantsFor(s, i.id, 'supervisor').length)) : all.filter(e => e.status === 'Submitted');
  const sum = summary(s, i);
  const item = e => {
    const ss = s.sessions.find(x => x.id === e.sessionId), a = s.sessionAttendance.find(x => x.id === e.attendanceId);
    const canRecommend = role === 'supervisor' && ['Submitted','Info Requested','Recommended'].includes(e.status) && isActiveSupervisor(s, i.id, ctx.person.id);
    const canDecide = role === 'rep' && !['Accepted','Rejected'].includes(e.status) && (e.status === 'Recommended' || !activeGrantsFor(s, i.id, 'supervisor').length);
    return `<article class="iw-excuse iw-reveal"><header>${personCell(s, e.personId, `${esc(ss?.title || 'Session')} · ${esc(fmtDate(ss?.date))}`)}<div class="actions">${pill(a?.status || 'Absent', `Attendance: ${a?.status || 'Absent'}`)}${e.status === 'Recommended' ? pill('Pending', role === 'rep' ? 'Waiting for your decision' : 'With the Representative') : e.status === 'Submitted' ? pill('Pending', role === 'rep' ? 'Waiting for Supervisor' : 'Waiting for your review') : pill(e.status)}</div></header>
      <blockquote>${esc(e.reason)}</blockquote>${e.attachment ? `<div class="iw-evidence">${u.icon('form')}<div><strong>${esc(e.attachment.name)}</strong><small>${esc(e.attachment.type)} · ${(e.attachment.size / 1024).toFixed(0)} KB · restricted to this initiative’s Supervisors and Representative${e.evidenceLog?.length ? ` · opened ${e.evidenceLog.length}×` : ''}</small></div>${e.attachment.id ? u.button('Open attachment', 'excuse-evidence', {id:e.id}, 'button quiet small') : '<small>File name only (earlier record)</small>'}</div>` : ''}
      <ol class="iw-chain"><li class="is-done"><span>Student</span><small>${esc(fmtDate(e.created))}</small></li><li class="${e.recommendation ? 'is-done' : 'is-now'}"><span>Supervisor</span><small>${e.recommendation ? `${esc(e.recommendation.decision)} · ${esc(nameOf(s, e.recommendation.actorId))}` : 'Recommendation pending'}</small></li><li class="${e.decision ? 'is-done' : e.recommendation ? 'is-now' : ''}"><span>Representative</span><small>${e.decision ? `${esc(e.decision.decision)} · ${esc(nameOf(s, e.decision.actorId))}` : 'Final decision pending'}</small></li></ol>
      ${e.recommendation ? `<p><strong>Supervisor note:</strong> ${esc(e.recommendation.note)}</p>` : ''}${e.decision ? `<p><strong>Decision:</strong> ${esc(e.decision.reason)}</p>` : ''}
      <div class="actions">${canRecommend ? u.button(e.recommendation ? 'Update recommendation' : 'Recommend', 'excuse-recommend', {id:e.id}, 'button primary small') : ''}${canDecide ? u.button('Accept excuse', 'excuse-decide', {id:e.id, decision:'Accepted'}, 'button primary small') + u.button('Reject excuse', 'excuse-decide', {id:e.id, decision:'Rejected'}, 'button quiet small') : ''}</div></article>`;
  };
  const supervised = activeGrantsFor(s, i.id, 'supervisor').length > 0;
  const withSupervisor = role === 'rep' ? all.filter(e => ['Submitted','Info Requested'].includes(e.status) && supervised) : [];
  const tab = r.query.get('tab') || 'queue';
  const shown = tab === 'queue' ? waiting : tab === 'review' ? withSupervisor : all;
  const recorded = sum.attendance, attended = recorded.filter(x => x.status !== 'Absent').length, absences = recorded.filter(x => x.status === 'Absent').length;
  const rate = recorded.length ? Math.round(attended / recorded.length * 100) : null;
  const flow = `<ol class="iw-flow iw-reveal" aria-label="How excuses work"><li class="${role === 'rep' ? '' : ''}"><span>1</span><div><b>Student explains</b><small>For a session recorded as absent</small></div></li><li class="${role === 'supervisor' ? 'is-you' : ''}"><span>2</span><div><b>Supervisor reviews</b><small>Recommends accept or reject</small></div></li><li class="${role === 'rep' ? 'is-you' : ''}"><span>3</span><div><b>${role === 'rep' ? 'You decide' : 'Representative decides'}</b><small>Accepted = excused absence</small></div></li></ol>`;
  // Students × sessions: what actually happened, at a glance.
  const day = today(s), past = sum.sessions.filter(x => x.status !== 'Cancelled' && x.date <= day).sort((a, b) => a.date.localeCompare(b.date));
  const students = s.admissions.filter(a => a.initiativeId === i.id && ['Accepted','Suspended','Completed'].includes(a.status)).map(a => a.personId);
  const cell = (pid, ss) => {
    const a = recorded.find(x => x.personId === pid && x.sessionId === ss.id);
    if (!a) return '<td><span class="iw-att is-none" title="Not registered">—</span></td>';
    const ex = all.find(e => e.attendanceId === a.id), excused = ex?.status === 'Accepted';
    const label = excused ? 'Excused' : a.status, cls = excused ? 'is-excused' : `is-${a.status.toLowerCase()}`;
    return `<td><span class="iw-att ${cls}" title="${esc(`${label}${ex && !excused ? ` · excuse ${ex.status.toLowerCase()}` : ''}`)}">${esc(label)}${ex && !excused && !['Rejected'].includes(ex.status) ? '<i aria-label="Excuse in progress"></i>' : ''}</span></td>`;
  };
  const grid = past.length && students.length ? `<section class="iw-card iw-reveal"><div class="iw-card-head"><div><h2>Attendance record</h2><p class="iw-muted">Recorded by Supervisors at each session.</p></div><div class="iw-att-legend"><span class="iw-att is-present">Present</span><span class="iw-att is-late">Late</span><span class="iw-att is-absent">Absent</span><span class="iw-att is-excused">Excused</span></div></div><div class="table-scroll"><table class="iw-att-table"><thead><tr><th scope="col">Student</th>${past.map(ss => `<th scope="col"><a href="${u.href(`${role === 'rep' ? 'organization/attendance' : 'supervisor/attendance'}/${ss.id}`)}">${esc(ss.title)}</a><small>${esc(fmtDate(ss.date))}</small></th>`).join('')}</tr></thead><tbody>${students.map(pid => `<tr><th scope="row">${personCell(s, pid)}</th>${past.map(ss => cell(pid, ss)).join('')}</tr>`).join('')}</tbody></table></div></section>` : '';
  const emptyCopy = tab === 'queue' ? [role === 'rep' ? 'You’re all caught up.' : 'Nothing to review.', role === 'rep' ? (withSupervisor.length ? `${withSupervisor.length} ${withSupervisor.length === 1 ? 'excuse is' : 'excuses are'} still with your Supervisor. They reach you after a recommendation.` : 'Excuses reach you after a Supervisor has reviewed them.') : 'New explanations from students appear here.'] : tab === 'review' ? ['Nothing with the Supervisor.', 'Excuses waiting for a Supervisor recommendation appear here.'] : ['No excuses yet.', 'When a student explains a missed session, it appears here.'];
  const stats4 = stats([stat(rate === null ? '—' : `${rate}%`, 'Attendance rate', {hint:`${attended} of ${recorded.length} records present or late`}), stat(absences, 'Absences'), stat(all.filter(e => e.status === 'Accepted').length, 'Excused'), stat(waiting.length, role === 'rep' ? 'Waiting for your decision' : 'Waiting for your review', {tone:waiting.length ? 'attention' : ''})]);
  const zone = `<section class="iw-excuse-zone iw-reveal"><div class="iw-card-head"><h2>Excuses</h2></div>${flow}`
    + tabs([[role === 'rep' ? 'Needs your decision' : 'Needs your review', withInitiative(`${r.area}/${r.page}?${embed ? 'view=excuses&' : ''}tab=queue`, i), 'queue', waiting.length], ...(role === 'rep' ? [['With Supervisor', withInitiative(`${r.area}/${r.page}?${embed ? 'view=excuses&' : ''}tab=review`, i), 'review', withSupervisor.length]] : []), ['All excuses', withInitiative(`${r.area}/${r.page}?${embed ? 'view=excuses&' : ''}tab=all`, i), 'all', all.length]], tab)
    + (shown.length ? `<div class="iw-excuses">${shown.map(item).join('')}</div>` : `<div class="iw-calm">${u.icon('check')}<div><strong>${esc(emptyCopy[0])}</strong><p>${esc(emptyCopy[1])}</p></div></div>`)
    + `<p class="iw-footnote">${u.icon('shield')}An accepted excuse shows as an excused absence. The attendance record itself stays “Absent” and never earns attendance rewards.</p></section>`;
  if (embed) return `<div class="ac-embed-bar iw-reveal">${initiativeSwitcher(ctx, initiatives, i)}</div>` + stats4 + (embed === 'record' ? (grid || `<div class="iw-calm iw-reveal">${u.icon('calendar')}<div><strong>No attendance yet.</strong><p>Sessions that have taken place appear here, one column each.</p></div></div>`) : zone);
  return head({eyebrow:role === 'rep' ? 'ATTENDANCE' : 'SUPERVISOR · NOTES & EXCUSES', title:role === 'rep' ? 'Attendance & excuses' : 'Notes & excuses', lead:role === 'rep' ? 'See who attended each session, and decide on excuses for missed ones.' : 'Review students’ explanations for missed sessions and recommend a decision.', meta:initiativeSwitcher(ctx, initiatives, i)})
    + stats([stat(rate === null ? '—' : `${rate}%`, 'Attendance rate', {hint:`${attended} of ${recorded.length} records present or late`}), stat(absences, 'Absences'), stat(all.filter(e => e.status === 'Accepted').length, 'Excused'), stat(waiting.length, role === 'rep' ? 'Waiting for your decision' : 'Waiting for your review', {tone:waiting.length ? 'attention' : ''})])
    + (role === 'rep' ? grid : '')
    + `<section class="iw-excuse-zone iw-reveal"><div class="iw-card-head"><h2>Excuses</h2></div>${flow}`
    + tabs([[role === 'rep' ? 'Needs your decision' : 'Needs your review', withInitiative(`${r.area}/${r.page}?${embed ? 'view=excuses&' : ''}tab=queue`, i), 'queue', waiting.length], ...(role === 'rep' ? [['With Supervisor', withInitiative(`${r.area}/${r.page}?${embed ? 'view=excuses&' : ''}tab=review`, i), 'review', withSupervisor.length]] : []), ['All excuses', withInitiative(`${r.area}/${r.page}?${embed ? 'view=excuses&' : ''}tab=all`, i), 'all', all.length]], tab)
    + (shown.length ? `<div class="iw-excuses">${shown.map(item).join('')}</div>` : `<div class="iw-calm">${u.icon('check')}<div><strong>${esc(emptyCopy[0])}</strong><p>${esc(emptyCopy[1])}</p></div></div>`)
    + `<p class="iw-footnote">${u.icon('shield')}An accepted excuse shows as an excused absence. The attendance record itself stays “Absent” and never earns attendance rewards.</p></section>`;
}
export function excuseAction(action, target, ctx) {
  const d = target.dataset;
  if (action === 'excuse-evidence') {
    const ref = ctx.run('initiative.excuse.evidence', {id:d.id}, 'Restricted attachment opened · access recorded.');
    import('../../../shared/attachments.js').then(m => m.read(ref.id)).then(record => {
      if (!record) { u.modal('Attachment unavailable', '<p>This file is not stored in this browser. Attachments live only on the device where the student added them (Phase-1 demo storage).</p>', () => {}, 'Done'); return; }
      const url = URL.createObjectURL(record.blob);
      const view = record.type === 'application/pdf' ? `<object class="iw-evidence-view" data="${url}" type="application/pdf" aria-label="${esc(record.name)}"><p>PDF preview unavailable. <a href="${url}" download="${esc(record.name)}">Download</a></p></object>` : `<img class="iw-evidence-view" src="${url}" alt="${esc(`Excuse attachment ${record.name}`)}">`;
      u.modal(record.name, `${view}<p class="iw-muted">Restricted evidence · demo browser storage, not production-secure. <a class="text-link" href="${url}" download="${esc(record.name)}">Download</a></p>`, () => URL.revokeObjectURL(url), 'Done');
    }, () => u.toast('Attachment storage is not available in this browser.', true));
    return true;
  }
  if (action === 'excuse-recommend') { u.modal('Your recommendation', `${u.select('decision', 'Recommendation', ['Accept','Reject','More information'])}${u.area('note', 'Supervisor note (seen by the Representative; a “More information” note is sent to the student)', '', true)}`, v => { ctx.run('initiative.excuse.recommend', {id:d.id, ...v}, 'Recommendation sent to the Representative.'); ctx.render(); }, 'Send recommendation'); return true; }
  if (action === 'excuse-decide') { u.modal(`${d.decision === 'Accepted' ? 'Accept' : 'Reject'} this excuse?`, `<p>${d.decision === 'Accepted' ? 'The student will see “Excused Absence”. Factual attendance stays Absent and no attendance reward is created.' : 'The absence stays unexcused. The student sees your reason.'}</p>${u.area('reason', 'Reason (shared with the student)', '', true)}`, v => { ctx.run('initiative.excuse.decide', {id:d.id, decision:d.decision, reason:v.reason}, 'Final decision recorded and the student notified.'); ctx.render(); }, d.decision === 'Accepted' ? 'Accept excuse' : 'Reject excuse'); return true; }
  return false;
}
