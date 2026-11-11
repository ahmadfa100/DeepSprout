/**
 * Attendance, one experience for the Supervisor and the Institution
 * Representative (supervisor/attendance and organization/attendance).
 *
 * The page asks for attendance the way each session needs it:
 *   In person → a full-screen check-in screen with a rotating QR. Students
 *               scan it with their own phone and are checked in at once.
 *   Online    → drag and drop the meeting report (Zoom, Google Meet, Teams,
 *               CSV or Excel). Names, emails, join and leave times are read
 *               in the browser and matched to the roster.
 *   Hybrid    → both, each participant by the mode they registered for.
 * Staff can still add a student by hand, record a reasoned exception, review
 * unclear report rows and handle excuses, all on the same session page.
 *
 * Browser demo: records live in local storage, not a database. Report files
 * are parsed locally; only rows, the file name and a SHA-256 fingerprint are kept.
 */
import * as u from '../../ui.js';
import {esc, nameOf, emailOf, emptyState, fmtDate, repInitiatives} from '../institution/common.js';
import {assignedSessions, institutionSessions, sessionRef, sessionSummary, roleFor, buildPreview, requiredMinutes, methodLabel, addCandidates, usesQR, usesImport, importsFor, windowOf, rulesFor, venueCode, venueSlot, VENUE_SLOT_MS, selfCheckinPath} from '../../attendance/model.js';
import {readReport} from '../../attendance/report.js';
import {today, confirmedInMode, modeCapacity, activeGrantsFor} from '../../initiative-rules.js';
import {meetingUrl} from '../../session-access.js';
import {nowMs} from '../../domain.js';
import {dispatch, demoEnabled} from '../../store.js';
import {renderExcuses} from '../institution/operations.js';

const wizard = new Map();
const seenArrivals = new Map();
const MODE_ICON = {'Online':'globe', 'In-person':'pin', 'Hybrid':'hybrid'};
const STATUS_CLASS = {'Present':'present', 'Late':'late', 'Absent':'absent', 'Needs Review':'review', 'Not Recorded':'none'};
const optsFor = ctx => ctx.route.area === 'organization' ? {role:'representative', base:'organization/attendance'} : {role:'supervisor', base:'supervisor/attendance'};

const clock = (ms, tz) => ms == null ? '—' : new Date(ms).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:tz});
const stamp = (at, tz = 'Asia/Amman') => at ? new Date(at).toLocaleString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:tz}) : '—';
const kb = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const inTime = ms => { const min = Math.max(1, Math.round(ms / 60000)); if (min < 60) return `${min} min`; const h = Math.floor(min / 60), r = min % 60; if (h < 48) return r ? `${h} h ${r} min` : `${h} h`; return `${Math.round(h / 24)} days`; };
export const statusChip = (status, label = status) => `<span class="ac-status is-${STATUS_CLASS[status] || 'none'}">${esc(label)}</span>`;
const modeBadge = format => `<span class="ac-mode is-${esc(String(format).toLowerCase().replace(/[^a-z]/g, ''))}">${u.icon(MODE_ICON[format] || 'calendar')}${esc(format === 'In-person' ? 'In person' : format)}</span>`;
const chip = ({label, tone}) => `<span class="ac-chip is-${esc(tone)}">${esc(label)}</span>`;
const parentLine = ref => `<span class="ac-parent">${u.icon(ref.kind === 'initiative' ? 'nodes' : 'mountain')}${ref.kind === 'initiative' ? 'Initiative' : 'Outdoor Activity'} · ${esc(ref.parent.title)}</span>`;
const placeOf = ref => ref.format === 'Online' ? 'Online meeting' : ref.format === 'Hybrid' ? `${ref.ss.venue || ref.parent.venue || 'Venue'} · online` : ref.ss.venue || ref.parent.venue || 'Venue';
const whenOf = ss => `${fmtDate(ss.date)} · ${ss.time}–${ss.endTime || ss.time}`;

/** Attendance ring: one arc per status, drawn in order, with the verified count in the middle. */
function ring(c, size = 120, label = true) {
  const r = 42, segs = [['present', c.present], ['late', c.late], ['review', c.review], ['absent', c.absent]];
  let offset = 0;
  const arcs = c.total ? segs.filter(([, n]) => n).map(([cls, n], i) => { const len = n / c.total * 100, arc = `<circle class="is-${cls}" cx="50" cy="50" r="${r}" pathLength="100" stroke-dasharray="${len.toFixed(2)} 100" stroke-dashoffset="${(-offset).toFixed(2)}" style="--d:${i * 120}ms"/>`; offset += len; return arc; }).join('') : '';
  const pct = c.total ? Math.round(c.verified / c.total * 100) : 0;
  return `<span class="ac-ring" style="--size:${size}px" role="img" aria-label="${esc(`${c.verified} of ${c.total} verified`)}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ac-ring-track" cx="50" cy="50" r="${r}"/>${arcs}</svg>${label ? `<span class="ac-ring-label"><b data-count="${c.verified}">${c.verified}</b><small>of ${c.total}</small></span>` : `<span class="ac-ring-pct">${pct}%</span>`}</span>`;
}
const legend = c => `<ul class="ac-legend">${[['present', 'Present', c.present], ['late', 'Late', c.late], ['review', 'Needs review', c.review], ['none', 'Not recorded', c.notRecorded], ['absent', 'Absent', c.absent]].map(([cls, l, n]) => `<li class="is-${cls}"><i aria-hidden="true"></i>${esc(l)}<b>${n}</b></li>`).join('')}</ul>`;

/** The one thing to do next for a session, decided by its format, time and evidence. */
function nextStep(m, o) {
  const ss = m.ref.ss, detail = `${o.base}/${ss.id}`, w = m.window, inPerson = m.entries.some(e => e.mode === 'In-person');
  if (!m.live) return {label:'View record', href:detail, icon:'history', tone:'quiet'};
  if (usesQR(m.ref.format) && inPerson && w.state === 'open') return {label:'Open check-in screen', action:'ac-screen', session:ss.id, icon:'qr', tone:'primary'};
  if (m.reviews.length) return {label:`Review ${plural(m.reviews.length, 'row')}`, href:`${detail}?focus=exceptions`, icon:'search', tone:'attention'};
  if (m.awaitingReport && w.started) return {label:'Upload meeting report', href:`${detail}?focus=take`, icon:'upload', tone:'primary'};
  if (m.excuses.length) return {label:plural(m.excuses.length, 'excuse'), href:`${detail}?focus=exceptions`, icon:'mail', tone:'attention'};
  if (w.state === 'closed' && m.live && m.counts.notRecorded) return {label:'Finalize attendance', href:`${detail}?focus=finalize`, icon:'flag', tone:'secondary'};
  if (w.state === 'early') return {label:usesQR(m.ref.format) && inPerson ? 'Prepare check-in' : 'Open session', href:detail, icon:'arrow', tone:'quiet'};
  return {label:'Open session', href:detail, icon:'arrow', tone:'quiet'};
}
const stepButton = (st, extra = '') => st.action
  ? `<button type="button" class="ac-next is-${st.tone}${extra}" data-action="${st.action}" data-session="${esc(st.session)}">${u.icon(st.icon)}<span>${esc(st.label)}</span></button>`
  : `<a class="ac-next is-${st.tone}${extra}" href="${u.href(st.href)}">${u.icon(st.icon)}<span>${esc(st.label)}</span></a>`;

/* =============================================================== overview */

export function renderAttendanceCenter(ctx) {
  const {s, person:p, route:r} = ctx, o = optsFor(ctx), rep = o.role === 'representative';
  const items = (rep ? institutionSessions(s, p.id) : assignedSessions(s, p.id)).map(ref => sessionSummary(s, ref, p.id)).sort((a, b) => a.window.start - b.window.start);
  const view = rep && ['record', 'excuses'].includes(r.query.get('view')) ? r.query.get('view') : 'sessions';
  const waiting = items.reduce((n, m) => n + m.excuses.length, 0);
  const head = `<header class="ac-pagehead iw-reveal"><div><p class="eyebrow">${rep ? 'INSTITUTION' : 'SUPERVISOR'} · ATTENDANCE</p><h1>${rep ? 'Attendance & excuses' : 'Attendance'}</h1><p class="iw-lead">${rep ? 'Check students in, read meeting reports and decide on excuses for every session your institution runs.' : 'Check students in, read meeting reports and handle exceptions for the sessions you supervise.'}</p></div></header>`;
  const sections = rep
    ? [['sessions', 'Sessions', o.base, items.length], ['record', 'Attendance record', `${o.base}?view=record`, 0], ['excuses', 'Excuses', `${o.base}?view=excuses`, waiting]]
    : [['sessions', 'Sessions', o.base, items.length], ['excuses', 'Excuses', 'supervisor/excuses', waiting]];
  const nav = `<nav class="ac-seg iw-reveal" aria-label="Attendance sections">${sections.map(([key, label, path, n]) => `<a href="${u.href(path)}" ${key === view ? 'aria-current="page"' : ''}>${esc(label)}${n ? `<span>${n}</span>` : ''}</a>`).join('')}</nav>`;
  if (view !== 'sessions') return head + nav + `<div class="ac-embed">${renderExcuses(ctx, {role:'rep', initiatives:repInitiatives(s, p.id), embed:view})}</div>`;
  if (!items.length) return head + nav + emptyState(rep ? 'No sessions take attendance yet.' : 'No sessions assigned to you yet.', rep ? 'Published sessions of your initiatives and Outdoor Activities appear here.' : 'Sessions appear here when an Institution Representative assigns you to them.');

  const filter = ['attention', 'completed'].includes(r.query.get('filter')) ? r.query.get('filter') : 'all';
  const attention = items.filter(x => x.needsAttention), completed = items.filter(x => x.completed);
  const shown = filter === 'attention' ? attention : filter === 'completed' ? completed : items;
  const spot = items.find(m => m.live && m.window.state === 'open') || items.find(m => m.live && m.window.state === 'early') || attention.at(-1);
  const filters = `<div class="ac-toolbar iw-reveal"><div class="ac-filters" role="group" aria-label="Show">${[['all', 'All sessions', items.length], ['attention', 'Needs attention', attention.length], ['completed', 'Completed', completed.length]].map(([key, label, n]) => `<a class="ac-pill${key === filter ? ' is-on' : ''}" href="${u.href(key === 'all' ? o.base : `${o.base}?filter=${key}`)}" ${key === filter ? 'aria-current="true"' : ''}>${esc(label)}<span>${n}</span></a>`).join('')}</div><label class="ac-search">${u.icon('search')}<span class="sr-only">Search sessions</span><input type="search" data-filter="search" placeholder="Search sessions"></label></div>`;
  if (!shown.length) return head + nav + (spot ? spotlight(ctx, spot, o) : '') + filters + `<div class="ac-calm iw-reveal">${u.icon('check')}<div><strong>${filter === 'attention' ? 'Nothing needs your attention.' : 'No completed sessions yet.'}</strong><p>${filter === 'attention' ? 'Live sessions, reports to upload, rows to review and excuses appear here.' : 'A session is completed once its attendance is finalized and nothing is waiting.'}</p></div></div>`;
  const day = today(s), groups = [
    ['Today', shown.filter(x => x.window.state === 'open' || x.ref.ss.date === day)],
    ['Coming up', shown.filter(x => x.window.state === 'early' && x.ref.ss.date !== day)],
    ['Earlier', shown.filter(x => x.window.state === 'closed' && x.ref.ss.date !== day).reverse()]
  ].filter(([, list]) => list.length);
  return head + nav + (spot ? spotlight(ctx, spot, o) : '') + filters
    + groups.map(([title, list]) => `<section class="ac-group iw-reveal"><h2 class="ac-group-title">${esc(title)}<span>${list.length}</span></h2><div class="ac-list">${list.map(m => row(m, o)).join('')}</div></section>`).join('');
}

function spotlight(ctx, m, o) {
  const {ref, counts:c, window:w} = m, ss = ref.ss, tz = ref.tz, t = nowMs(ctx.s);
  const live = w.state === 'open', st = nextStep(m, o);
  const lead = live ? `<p class="ac-live is-on"><i aria-hidden="true"></i>${w.end > t ? 'Happening now' : 'Check-in still open'} · closes ${esc(clock(w.closes, tz))}</p>`
    : w.state === 'early' ? `<p class="ac-live"><i aria-hidden="true"></i>Next up · check-in opens in ${esc(inTime(w.opens - t))}</p>`
    : `<p class="ac-live is-warn"><i aria-hidden="true"></i>Waiting for you</p>`;
  const how = usesQR(ref.format) && usesImport(ref.format) ? 'Students in the room scan the check-in screen. Online students come from the meeting report.' : usesQR(ref.format) ? 'Students scan the check-in screen with their phone as they arrive.' : 'Upload the meeting report when it ends. Names and minutes are read for you.';
  return `<section class="ac-spot${live ? ' is-live' : ''} iw-reveal" aria-label="Spotlight session">
    <span class="ac-spot-glow" aria-hidden="true"></span>
    <div class="ac-spot-copy">${lead}<h2><a href="${u.href(`${o.base}/${ss.id}`)}">${esc(ss.title)}</a></h2>
      <p class="ac-spot-meta">${parentLine(ref)}${modeBadge(ref.format)}<span>${u.icon('clock')}${esc(whenOf(ss))}</span><span>${u.icon(ref.format === 'Online' ? 'globe' : 'pin')}${esc(placeOf(ref))}</span></p>
      <p class="ac-spot-how">${esc(how)}</p>
      <div class="ac-spot-actions">${stepButton(st, ' is-big')}${st.href === `${o.base}/${ss.id}` ? '' : `<a class="ac-next is-quiet" href="${u.href(`${o.base}/${ss.id}`)}">${u.icon('arrow')}<span>Session details</span></a>`}</div></div>
    <div class="ac-spot-ring">${ring(c, 148)}${legend(c)}</div></section>`;
}

function row(m, o) {
  const {ref, counts:c} = m, ss = ref.ss, d = new Date(`${ss.date}T12:00:00`), st = nextStep(m, o);
  const state = c.total ? [`${c.verified} verified`, c.review ? `${c.review} to review` : '', c.notRecorded ? `${c.notRecorded} not recorded` : '', c.absent ? `${c.absent} absent` : ''].filter(Boolean).join(' · ') : 'Nobody registered yet';
  const flags = [...m.sources.map(chip), m.finalized ? chip({label:'Finalized', tone:'positive'}) : '', m.exceptions ? chip({label:plural(m.exceptions, 'open item'), tone:'attention'}) : ''].join('');
  return `<article class="ac-row${m.needsAttention ? ' is-attention' : ''}${m.window.state === 'open' && m.live ? ' is-live' : ''}" data-search="${esc(`${ss.title} ${ref.parent.title} ${ref.format}`)}">
    <time class="ac-date" datetime="${esc(ss.date)}"><b>${d.getDate()}</b><span>${esc(d.toLocaleDateString('en-GB', {month:'short'}))}</span></time>
    <div class="ac-row-main">${parentLine(ref)}<h3><a href="${u.href(`${o.base}/${ss.id}`)}">${esc(ss.title)}</a></h3><p class="ac-meta">${modeBadge(ref.format)}<span>${u.icon('clock')}${esc(`${ss.time}–${ss.endTime || ss.time}`)}</span></p></div>
    <div class="ac-row-ring">${ring(c, 54, false)}<div><strong>${esc(state)}</strong><span class="ac-row-flags">${flags}</span></div></div>
    ${stepButton(st)}
  </article>`;
}

/* ================================================================ session */

export function renderSessionAttendance(ctx, sessionId) {
  const {s, person:p, route:r} = ctx, o = optsFor(ctx), ref = sessionRef(s, sessionId), role = ref ? roleFor(s, ref, p.id) : null;
  const back = `<a class="ac-back iw-reveal" href="${u.href(o.base)}">${u.icon('arrow')}All sessions</a>`;
  if (!ref || !role || (o.role === 'supervisor' && role !== 'supervisor')) return back + emptyState('This session is not in your attendance scope.', o.role === 'supervisor' ? 'You can open attendance only for sessions you are assigned to. Records you made stay attributed to you.' : 'Only sessions of your own institution appear here.');
  if (o.role === 'supervisor') { ctx.localUI.supCtx = `${ref.kind}:${ref.parent.id}`; if (ref.kind === 'initiative') ctx.localUI.initiativeId = ref.parent.id; }
  if (r.tail === 'screen') return renderScreen(ctx, ref, o);
  const m = sessionSummary(s, ref, p.id);
  return back + hero(ctx, ref, m) + takeSection(ctx, ref, m, o) + peopleSection(ctx, ref, m, role) + exceptionsSection(ctx, ref, m, role) + finalizeSection(ctx, ref, m) + historySection(ctx, ref, m);
}

function hero(ctx, ref, m) {
  const ss = ref.ss, w = m.window, t = nowMs(ctx.s), c = m.counts;
  const state = !m.live ? {cls:'', text:'Read only · this session or its activity is closed'}
    : w.state === 'early' ? {cls:'', text:`Check-in opens in ${inTime(w.opens - t)} · ${stamp(w.opens, ref.tz)}`}
    : w.state === 'open' ? {cls:' is-on', text:w.end > t ? `Live now · check-in closes ${clock(w.closes, ref.tz)}` : `Session ended · check-in closes ${clock(w.closes, ref.tz)}`}
    : m.finalized ? {cls:' is-done', text:m.finalized.at ? `Finalized ${stamp(m.finalized.at, ref.tz)}` : 'Attendance was closed earlier'}
    : {cls:' is-warn', text:'Check-in closed · finalize when the evidence is complete'};
  return `<section class="ac-hero iw-reveal">
    <span class="ac-hero-art" aria-hidden="true"><i></i><i></i></span>
    <div class="ac-hero-copy"><p class="eyebrow">${ref.kind === 'initiative' ? 'INITIATIVE SESSION' : 'OUTDOOR ACTIVITY SESSION'}</p><h1>${esc(ss.title)}</h1>${parentLine(ref)}
      <ul class="ac-facts"><li>${modeBadge(ref.format)}</li><li>${u.icon('calendar')}${esc(whenOf(ss))}</li><li>${u.icon(ref.format === 'Online' ? 'globe' : 'pin')}${esc(placeOf(ref))}</li></ul>
      <p class="ac-live${state.cls}"><i aria-hidden="true"></i>${esc(state.text)}</p></div>
    <div class="ac-hero-ring">${ring(c, 150)}${legend(c)}</div>
  </section>`;
}

/* ---- Take attendance: chosen by the session's format */

function takeSection(ctx, ref, m, o) {
  const qr = usesQR(ref.format), report = usesImport(ref.format), online = m.entries.filter(e => e.mode === 'Online'), inPerson = m.entries.filter(e => e.mode === 'In-person');
  const lead = qr && report ? 'This is a hybrid session. Students in the room check in on the screen; online students are read from the meeting report. Nobody gets two records.'
    : qr ? `Students check themselves in by scanning the check-in screen. Arrivals after ${rulesFor(ref.ss).lateAfterMinutes} minutes are recorded as Late.`
    : 'After the session, drop the participant report from your meeting platform. DeepSprout reads the names, emails and minutes and records attendance.';
  const parts = [];
  if (qr) parts.push(`${qr && report ? `<h3 class="ac-modehead">${modeBadge('In-person')}<span>${plural(inPerson.length, 'student')} in the room</span></h3>` : ''}${checkInBlock(ctx, ref, m, inPerson)}`);
  if (report) parts.push(`${qr && report ? `<h3 class="ac-modehead">${modeBadge('Online')}<span>${plural(online.length, 'student')} online</span></h3>` : ''}${importBlock(ctx, ref, m)}`);
  return `<section class="ac-section ac-take iw-reveal" id="take"><div class="ac-section-head"><span class="ac-step-no">1</span><div><h2>Take attendance</h2><p>${esc(lead)}</p></div></div>${parts.join('')}</section>`;
}

const qrSvg = text => { try { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({cellSize:8, margin:0, scalable:true}); } catch { return ''; } };
const checkinUrl = (ref, code) => `${location.origin}${location.pathname}#/${selfCheckinPath(ref, code)}`;
const prettyCode = code => code ? `${code.slice(0, 3)} ${code.slice(3)}` : '';

function arrivals(ctx, ref, m, limit = 6) {
  const {s} = ctx, list = m.entries.filter(e => e.mode === 'In-person' && e.record && e.record.status !== 'Absent').sort((a, b) => String(b.record.at || b.record.created).localeCompare(String(a.record.at || a.record.created)));
  const seen = seenArrivals.get(ref.ss.id), fresh = new Set(seen ? list.filter(e => !seen.has(e.personId)).map(e => e.personId) : []);
  seenArrivals.set(ref.ss.id, new Set(list.map(e => e.personId)));
  return {list, html:list.slice(0, limit).map(e => `<li class="${fresh.has(e.personId) ? 'is-new' : ''}">${u.avatar(nameOf(s, e.personId))}<span><strong>${esc(nameOf(s, e.personId))}</strong><small>${esc(methodLabel(e.record.method))}</small></span><span class="ac-arr-time">${statusChip(e.record.status)}<small>${esc(clock(Date.parse(e.record.at || e.record.created), ref.tz))}</small></span></li>`).join('')};
}

function checkInBlock(ctx, ref, m, inPerson) {
  const w = m.window, open = m.live && w.state === 'open', id = ref.ss.id, t = nowMs(ctx.s);
  const checked = inPerson.filter(e => e.record && e.record.status !== 'Absent').length;
  const screenReady = Boolean(ref.ss.checkinScreen?.secret);
  const code = open && screenReady ? venueCode(ref.ss, venueSlot(ctx.s)) : null;
  const visual = open && screenReady
    ? `<div class="ac-qr-live" data-venue-qr="${esc(id)}" data-kind="${esc(ref.kind)}">${qrSvg(checkinUrl(ref, code))}</div><span class="ac-qr-timer" data-venue-timer><i></i></span><small class="ac-qr-code">Code <b data-venue-code>${esc(prettyCode(code))}</b></small>`
    : `<div class="ac-qr-idle">${u.icon('qr')}<span></span></div><small class="ac-qr-code">${!m.live ? 'Check-in is closed' : w.state === 'early' ? `Opens in ${esc(inTime(w.opens - t))}` : open ? 'Ready when you are' : 'Check-in closed'}</small>`;
  const scan = open && typeof window !== 'undefined' && 'BarcodeDetector' in window ? u.button('Scan a student’s pass', 'ac-scan', {session:id}, 'button quiet small') : '';
  const arr = arrivals(ctx, ref, m);
  const cta = !m.live || w.state === 'closed' ? '' : `<button type="button" class="button primary ac-cta" data-action="ac-screen" data-session="${esc(id)}">${u.icon('expand')}${open ? 'Open check-in screen' : 'Preview check-in screen'}</button>`;
  return `<div class="ac-qrcard">
    <div class="ac-qr-visual">${visual}</div>
    <div class="ac-qr-copy"><h3>Check-in screen</h3><p>Show it on a projector, TV or tablet at the entrance. Students scan it with their phone camera and are checked in instantly. The code changes every ${VENUE_SLOT_MS / 1000} seconds, so a photo sent to someone at home stops working.</p>
      <div class="ac-qr-actions">${cta}${chip(!m.live ? {label:'Read only', tone:'neutral'} : open ? {label:'Check-in open', tone:'positive'} : w.state === 'early' ? {label:`Opens ${clock(w.opens, ref.tz)}`, tone:'neutral'} : {label:'Check-in closed', tone:'neutral'})}</div>
      <details class="ac-more" ${ctx.localUI.acMore === id ? 'open' : ''}><summary>Other ways to check someone in</summary>
        <form class="ac-checkin" data-form="ac-checkin" data-session="${esc(id)}"><label class="field"><span>Booking code from the student’s pass</span><input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="DS-XXXX-XX" required ${open ? '' : 'disabled'}></label><div class="actions"><button class="button secondary small" ${open ? '' : 'disabled'}>Check in</button>${scan}</div><p class="form-error" role="alert"></p></form>
        <video class="ac-scanner" hidden playsinline muted></video>
        ${m.live && w.state !== 'early' ? `<p class="ac-muted">Phone dead or no pass? ${u.button('Mark someone present by hand', 'ac-exception', {session:id}, 'text-link ac-link-button')} with a reason.</p>` : ''}
      </details></div>
    <div class="ac-arrivals"><div class="ac-arrivals-head"><h4>Arrivals</h4><span class="ac-count"><b>${checked}</b> / ${inPerson.length}</span></div>
      <span class="ac-bar" aria-hidden="true"><i style="--w:${inPerson.length ? checked / inPerson.length * 100 : 0}%"></i></span>
      ${arr.list.length ? `<ul class="ac-arr-list">${arr.html}</ul>${arr.list.length > 6 ? `<button type="button" class="text-link ac-link-button" data-action="ac-jump" data-target="people">See all ${arr.list.length}</button>` : ''}` : `<p class="ac-arr-empty">${u.icon('people')}${inPerson.length ? 'Nobody has checked in yet.' : 'No in-person registrations.'}</p>`}</div>
  </div>`;
}

/* ---- Meeting report import (drag and drop → extracted people → confirm) */

const PLATFORMS = ['Zoom', 'Google Meet', 'Microsoft Teams', 'Excel / CSV'];
function steps(current) {
  return `<ol class="ac-steps" aria-label="Import steps">${['Drop the report', 'Check who we found', 'Confirm'].map((label, i) => `<li class="${i + 1 < current ? 'is-done' : i + 1 === current ? 'is-current' : ''}" ${i + 1 === current ? 'aria-current="step"' : ''}><span>${i + 1 < current ? u.icon('check') : i + 1}</span>${esc(label)}</li>`).join('')}</ol>`;
}
function importBlock(ctx, ref, m) {
  const {s, person:p} = ctx, id = ref.ss.id, st = wizard.get(id) || {step:1}, {scheduled, required, rules} = requiredMinutes(s, ref);
  const url = meetingUrl(ref.ss.meeting || ''), platform = /zoom\.us/i.test(url) ? 'Zoom' : /meet\.google/i.test(url) ? 'Google Meet' : /teams\./i.test(url) ? 'Microsoft Teams' : '';
  const rulesLine = `Counts as attended: at least ${rules.minimumPercent}% of the session (${required} of ${scheduled} min). Late: joined more than ${rules.lateAfterMinutes} min after the start. Shorter attendance goes to review, never straight to Absent.`;
  const last = m.imports[0];
  const lastLine = last ? `<p class="ac-muted ac-last">${u.icon('history')}Last report: ${esc(last.fileName)} · ${esc(stamp(last.at, ref.tz))} · ${esc(nameOf(s, last.actorId))}</p>` : '';
  const shell = (step, inner) => `<div class="ac-import" aria-labelledby="ac-import-${esc(id)}"><div class="ac-import-head"><div><h3 id="ac-import-${esc(id)}">Meeting report</h3><p>${platform ? `${esc(platform)} meeting · ` : ''}DeepSprout is not connected to meeting platforms yet, so export the participant report and drop it here.${url ? ` <a class="text-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open the meeting</a>` : ''}</p></div></div>${steps(step)}${inner}</div>`;
  if (!m.live) return shell(1, `<p class="ac-muted">Reports are closed for this session.</p>${lastLine}`);
  if (!m.window.started) return shell(1, `<div class="ac-drop is-disabled" aria-disabled="true"><span class="ac-drop-art">${u.icon('clock')}</span><strong>Available once the session starts</strong><small>The report exists only after people have joined.</small></div><p class="ac-muted">${esc(rulesLine)}</p>`);
  if (st.step === 'done') {
    const res = st.result;
    return shell(4, `<div class="ac-done" role="status"><span class="ac-done-mark" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l7 7 15-16"/></svg></span><div><strong>Report imported</strong><p>${esc(`${plural(res.recorded, 'attendance record')} created${res.reviews ? ` · ${plural(res.reviews, 'row')} waiting for review` : ''}.`)} Participants and reports are updated.</p><div class="actions"><button type="button" class="button quiet small" data-action="ac-jump" data-target="people">See participants</button>${res.reviews ? '<button type="button" class="button quiet small" data-action="ac-jump" data-target="exceptions">Review rows</button>' : ''}${u.button('Import another report', 'ac-import-reset', {session:id}, 'button quiet small')}</div></div></div>`);
  }
  if (st.step === 2 || st.step === 3) {
    const pv = buildPreview(s, ref, st.parsed.records, p.id), k = pv.counts;
    const fileLine = `<div class="ac-file">${u.icon('form')}<div><strong>${esc(st.file.name)}</strong><small>${esc(`${st.parsed.source} · ${plural(k.rows, 'row')} · ${kb(st.file.size)}`)}</small></div>${u.button('Use another file', 'ac-import-reset', {session:id}, 'button quiet small')}</div>`;
    const alerts = [...pv.errors.map(e => `<li class="is-critical">${u.icon('alert')}${esc(e)}</li>`), ...pv.warnings.map(e => `<li>${u.icon('info')}${esc(e)}</li>`)].join('');
    if (st.step === 3 && !pv.errors.length) {
      const missing = pv.missing.map(pid => nameOf(s, pid));
      return shell(3, `${fileLine}<div class="ac-confirm"><h4>Ready to record</h4><ul>
        <li class="is-ok">${u.icon('check')}<span><b>${plural(k.ready, 'attendance record')}</b> will be created (${k.present} Present, ${k.late} Late).</span></li>
        <li>${u.icon('search')}<span><b>${plural(k.review + k.conflict + k.unmatched, 'row')}</b> will wait for review. Nothing is guessed.</span></li>
        <li>${u.icon('history')}<span><b>${plural(k.duplicate, 'row')}</b> already recorded will not change.${k.ignored ? ` ${plural(k.ignored, 'staff row')} ignored.` : ''}</span></li>
        <li>${u.icon('people')}<span>${missing.length ? `${esc(missing.join(', '))} ${missing.length === 1 ? 'is' : 'are'} registered online but not in this report. ${st.complete ? 'Because this is the complete report, finalizing will record them Absent.' : 'They stay Not Recorded.'}` : 'Every registered online student appears in this report.'}</span></li></ul>
        <div class="actions">${u.button('Back', 'ac-import-step', {session:id, step:2}, 'button quiet')}${u.button('Confirm and record', 'ac-import-confirm', {session:id}, 'button primary')}</div></div>`);
    }
    const label = {ready:'Will record', review:'Needs review', conflict:'Conflict', duplicate:'Already recorded', unmatched:'Not on roster', ignored:'Staff'};
    const tone = {ready:'present', review:'review', conflict:'review', duplicate:'none', unmatched:'review', ignored:'none'};
    const found = pv.rows.map((x, i) => {
      const pct = x.minutes == null ? 0 : Math.min(100, x.minutes / scheduled * 100), need = required / scheduled * 100;
      const status = x.status === 'ready' ? statusChip(x.outcome, `${label.ready} · ${x.outcome}`) : statusChip(tone[x.status] === 'review' ? 'Needs Review' : 'Not Recorded', label[x.status]);
      return `<li class="ac-found-row is-${x.status}" style="--i:${Math.min(i, 14)}">${u.avatar(x.name || x.email || '?')}<div class="ac-found-who"><strong>${esc(x.name || x.email || 'Unnamed row')}</strong><small>${esc(x.email || 'No email in the report')}${x.personId ? ` · ${x.matchType === 'name' ? 'name match' : 'matched'}: ${esc(nameOf(s, x.personId))}` : ''}</small></div>
        <div class="ac-found-time"><span class="ac-minbar" style="--p:${pct.toFixed(1)}%;--need:${need.toFixed(1)}%" aria-hidden="true"><i></i><b></b></span><small>${x.minutes == null ? 'No duration' : `${Math.round(x.minutes)} min`} · ${esc(clock(x.joinedAt, ref.tz))}–${esc(clock(x.leftAt, ref.tz))}${x.rowsMerged > 1 ? ` · ${x.rowsMerged} joins merged` : ''}</small></div>
        <div class="ac-found-result">${status}<small>${esc(x.reason)}</small></div></li>`;
    }).join('');
    const tiles = [['Will record', k.ready, 'present'], ['To review', k.review + k.conflict, 'review'], ['Not on roster', k.unmatched, 'review'], ['Already recorded', k.duplicate, 'none'], ['Missing from report', k.missing, 'none']];
    return shell(2, `${fileLine}${alerts ? `<ul class="ac-alerts">${alerts}</ul>` : ''}
      <p class="ac-found-lead">We read <b>${plural(pv.rows.length, 'person', 'people')}</b> from ${plural(k.rows, 'row')} and matched them to this session’s roster.</p>
      <div class="ac-tiles">${tiles.map(([t, n, cls]) => `<div class="ac-tile is-${cls}"><b>${n}</b><span>${esc(t)}</span></div>`).join('')}</div>
      <ul class="ac-found" aria-label="People found in the report">${found}</ul>
      <p class="ac-muted">${esc(rulesLine)}</p>
      <label class="ac-check"><input type="checkbox" data-action="ac-import-complete" data-session="${esc(id)}" ${st.complete ? 'checked' : ''}><span><strong>This is the complete participant report</strong><small>Only then can finalizing record registered online students missing from it as Absent. Leave it unticked for partial exports.</small></span></label>
      <div class="actions">${u.button('Back', 'ac-import-reset', {session:id}, 'button quiet')}${pv.errors.length ? '<button type="button" class="button primary" disabled>Continue</button>' : u.button('Continue', 'ac-import-step', {session:id, step:3}, 'button primary')}</div>`);
  }
  const error = st.error ? `<p class="ac-error" role="alert">${u.icon('alert')}${esc(st.error)}</p>` : '';
  return shell(1, `<div class="ac-drop${st.busy ? ' is-busy' : ''}" data-drop-import="${esc(id)}">
      <input type="file" id="ac-file-${esc(id)}" class="ac-file-input" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-action="ac-import-file" data-session="${esc(id)}" ${st.busy ? 'disabled' : ''}>
      <span class="ac-drop-art" aria-hidden="true"><i class="ac-doc is-a"></i><i class="ac-doc is-b"></i><i class="ac-doc is-c">${u.icon('upload')}</i></span>
      ${st.busy ? '<strong>Reading the report…</strong><small>Finding names, emails, join and leave times.</small><span class="ac-scanline" aria-hidden="true"></span>' : `<strong class="ac-drop-pointer">Drop the participant report here</strong><strong class="ac-drop-touch">Choose the participant report</strong><span class="ac-platforms">${PLATFORMS.map(x => `<span>${esc(x)}</span>`).join('')}</span><label for="ac-file-${esc(id)}" class="button secondary">${u.icon('upload')}Browse files</label><small>.xlsx or .csv · up to 5 MB · read on this device</small>`}
    </div>${error}<p class="ac-muted">${esc(rulesLine)}</p>${lastLine}<p class="ac-muted">Want to try it? ${u.button('Download a sample report for this session', 'ac-import-sample', {session:id}, 'text-link ac-link-button')} (fictional rows built from this roster).</p>`);
}

/* ---- Participants */

function peopleSection(ctx, ref, m, role) {
  const {s} = ctx, canAct = m.live, started = m.window.state !== 'early', c = m.counts, id = ref.ss.id;
  const add = canAct ? `<button type="button" class="button secondary ac-add" data-action="ac-add" data-session="${esc(id)}">${u.icon('userplus')}Add a student</button>` : '';
  const head = `<div class="ac-section-head is-row"><span class="ac-step-no">2</span><div><h2>Participants <span class="ac-h-count">${c.total}</span></h2><p>Everyone registered for this session and how their attendance was verified.</p></div>${add}</div>`;
  if (!m.entries.length) return `<section class="ac-section iw-reveal" id="people">${head}<div class="ac-calm">${u.icon('people')}<div><strong>Nobody is registered for this session yet.</strong><p>${canAct ? 'If a student came without registering, add them; they must already be accepted into the initiative or hold a confirmed booking.' : 'Registered participants appear here.'}</p></div></div></section>`;
  const chips = [['', 'All', c.total], ['Present', 'Present', c.present], ['Late', 'Late', c.late], ['Needs Review', 'Needs review', c.review], ['Not Recorded', 'Not recorded', c.notRecorded], ['Absent', 'Absent', c.absent]].filter(([v, , n]) => !v || n);
  const toolbar = `<div class="ac-toolbar is-people"><div class="ac-filters" role="group" aria-label="Filter by attendance">${chips.map(([v, l, n]) => `<button type="button" class="ac-pill${v ? ` is-${STATUS_CLASS[v]}` : ' is-on'}" data-action="ac-filter" data-value="${esc(v)}" aria-pressed="${v ? 'false' : 'true'}">${v ? '<i aria-hidden="true"></i>' : ''}${esc(l)}<span>${n}</span></button>`).join('')}</div><select data-filter="status" hidden aria-hidden="true" tabindex="-1"><option value=""></option>${Object.keys(STATUS_CLASS).map(x => `<option>${x}</option>`).join('')}</select><label class="ac-search">${u.icon('search')}<span class="sr-only">Search participants</span><input type="search" data-filter="search" placeholder="Search by name or email"></label></div>`;
  const cards = m.entries.map((e, i) => {
    const rec = e.record, ev = rec?.evidence;
    const how = rec ? `${esc(methodLabel(rec.method))}${ev?.minutes != null ? ` · ${esc(`${ev.minutes} min`)}` : ''} · ${esc(stamp(rec.at || rec.created, ref.tz))}` : e.review ? esc(e.review.reason) : e.mode === 'Online' ? 'Waiting for the meeting report' : started ? 'Not checked in yet' : 'Check-in not open yet';
    const extra = e.addedBy ? `<small class="ac-added">${u.icon('userplus')}Added by ${esc(nameOf(s, e.addedBy))} · ${esc(e.addedReason)}</small>` : rec?.reason && !ev ? `<small class="ac-added">${esc(rec.reason)}</small>` : '';
    const action = !canAct ? '' : rec ? (role === 'supervisor' ? u.button('Correct', 'ac-correct', {session:id, person:e.personId}, 'button quiet small') : '') : e.review ? u.button('Review', 'ac-review', {id:e.review.id}, 'button quiet small') : started ? u.button('Mark present', 'ac-exception', {session:id, person:e.personId}, 'button quiet small') : '';
    return `<article class="ac-person is-${STATUS_CLASS[e.status] || 'none'}" style="--i:${Math.min(i, 16)}" data-search="${esc(`${nameOf(s, e.personId)} ${emailOf(s, e.personId)}`)}" data-status="${esc(e.status)}">
      <span class="ac-person-av">${u.avatar(nameOf(s, e.personId))}<i aria-hidden="true"></i></span>
      <div class="ac-person-main"><strong>${esc(nameOf(s, e.personId))}</strong><small>${esc(emailOf(s, e.personId))}</small><span class="ac-person-how">${modeBadge(e.mode)}<span>${how}</span></span>${extra}</div>
      <div class="ac-person-side">${statusChip(e.status)}${action}</div></article>`;
  }).join('');
  return `<section class="ac-section iw-reveal" id="people">${head}${toolbar}<div class="ac-people">${cards}</div><p class="ac-muted ac-foot">${u.icon('shield')}Attendance comes from evidence: a check-in, a matched report row or a reasoned exception. Registration is not attendance, and attendance is not completion.</p></section>`;
}

/* ---- Excuses & reviews */

function exceptionsSection(ctx, ref, m, role) {
  const {s, person:p} = ctx;
  const reviewCard = rv => `<article class="ac-review"><header><div><strong>${esc(rv.name || rv.email || 'Report row')}</strong><small>${esc(rv.email || 'No email in report')} · line ${esc((rv.lines || []).join(', '))}</small></div>${statusChip('Needs Review', {unmatched:'Not on roster', conflict:'Conflict', review:'Needs review'}[rv.type] || 'Needs review')}</header>
    <p>${esc(rv.reason)}</p><dl class="ac-evidence"><div><dt>Joined</dt><dd>${esc(clock(rv.joinedAt, ref.tz))}</dd></div><div><dt>Left</dt><dd>${esc(clock(rv.leftAt, ref.tz))}</dd></div><div><dt>Minutes</dt><dd>${rv.minutes ?? '—'}</dd></div>${rv.personId || rv.suggestedPersonId ? `<div><dt>Probably</dt><dd>${esc(nameOf(s, rv.personId || rv.suggestedPersonId))}</dd></div>` : ''}</dl>
    ${m.live ? `<div class="actions">${u.button('Resolve', 'ac-review', {id:rv.id}, 'button primary small')}</div>` : ''}</article>`;
  const excuses = ref.kind === 'initiative' ? (s.excuses || []).filter(e => e.sessionId === ref.ss.id).sort((a, b) => String(b.created).localeCompare(String(a.created))) : [];
  const supervised = ref.kind === 'initiative' && activeGrantsFor(s, ref.parent.id, 'supervisor').length > 0;
  const excuseCard = e => {
    const a = (s.sessionAttendance || []).find(x => x.id === e.attendanceId);
    const canRecommend = role === 'supervisor' && ['Submitted', 'Info Requested', 'Recommended'].includes(e.status);
    const canDecide = role === 'representative' && !['Accepted', 'Rejected'].includes(e.status) && (e.status === 'Recommended' || !supervised);
    const state = e.status === 'Recommended' ? (role === 'representative' ? 'Waiting for your decision' : 'With the Representative') : e.status === 'Submitted' ? (role === 'supervisor' ? 'Waiting for your review' : 'With the Supervisor') : e.status === 'Info Requested' ? 'Waiting for the student' : e.status;
    return `<article class="ac-excuse is-${esc(String(e.status).toLowerCase().replace(/\s+/g, '-'))}"><header>${u.avatar(nameOf(s, e.personId))}<div><strong>${esc(nameOf(s, e.personId))}</strong><small>Sent ${esc(fmtDate(e.created))} · attendance ${esc(a?.status || 'Absent')}</small></div><span class="ac-chip is-${e.status === 'Accepted' ? 'positive' : e.status === 'Rejected' ? 'neutral' : 'attention'}">${esc(state)}</span></header>
      <blockquote>${esc(e.reason)}</blockquote>
      ${e.attachment ? `<div class="ac-attach">${u.icon('form')}<div><strong>${esc(e.attachment.name)}</strong><small>${esc(e.attachment.type)} · ${(e.attachment.size / 1024).toFixed(0)} KB · restricted to this initiative’s staff</small></div>${e.attachment.id ? u.button('Open', 'excuse-evidence', {id:e.id}, 'button quiet small') : ''}</div>` : ''}
      <ol class="ac-chain"><li class="is-done"><span>Student</span></li><li class="${e.recommendation ? 'is-done' : 'is-now'}"><span>Supervisor${e.recommendation ? ` · ${esc(e.recommendation.decision)}` : ''}</span></li><li class="${e.decision ? 'is-done' : e.recommendation ? 'is-now' : ''}"><span>Representative${e.decision ? ` · ${esc(e.decision.decision)}` : ''}</span></li></ol>
      ${e.recommendation ? `<p class="ac-note"><b>Supervisor:</b> ${esc(e.recommendation.note)}</p>` : ''}${e.decision ? `<p class="ac-note"><b>Decision:</b> ${esc(e.decision.reason)}</p>` : ''}
      ${canRecommend ? `<div class="actions">${u.button(e.recommendation ? 'Update recommendation' : 'Recommend', 'excuse-recommend', {id:e.id}, 'button primary small')}</div>` : ''}
      ${canDecide ? `<div class="actions">${u.button('Accept excuse', 'excuse-decide', {id:e.id, decision:'Accepted'}, 'button primary small')}${u.button('Reject', 'excuse-decide', {id:e.id, decision:'Rejected'}, 'button quiet small')}</div>` : ''}</article>`;
  };
  const reviews = m.reviews.length ? `<div class="ac-cards">${m.reviews.map(reviewCard).join('')}</div>` : `<p class="ac-calm-line">${u.icon('check')}No report rows need review.</p>`;
  const excuseHtml = ref.kind !== 'initiative' ? `<p class="ac-calm-line">${u.icon('info')}Excuses are handled for Initiative sessions.</p>` : excuses.length ? `<div class="ac-cards">${excuses.map(excuseCard).join('')}</div>` : `<p class="ac-calm-line">${u.icon('mail')}No excuses for this session. Students recorded Absent can explain from their own page.</p>`;
  const open = m.reviews.length + excuses.filter(e => !['Accepted', 'Rejected'].includes(e.status)).length;
  return `<section class="ac-section iw-reveal" id="exceptions"><div class="ac-section-head"><span class="ac-step-no">3</span><div><h2>Excuses & reviews ${open ? `<span class="ac-h-count is-attention">${open}</span>` : ''}</h2><p>Unclear report rows, and students explaining an absence. ${role === 'representative' ? 'The Supervisor recommends; you decide.' : 'You recommend; the Representative decides.'} An accepted excuse never turns Absent into Present.</p></div></div>
    <div class="ac-split"><div><h3 class="ac-subhead">${u.icon('search')}Report rows to review<span>${m.reviews.length}</span></h3>${reviews}</div><div><h3 class="ac-subhead">${u.icon('mail')}Excuses<span>${excuses.length}</span></h3>${excuseHtml}</div></div></section>`;
}

function finalizeSection(ctx, ref, m) {
  const w = m.window;
  if (!m.live || w.state !== 'closed' || !m.counts.notRecorded) return '';
  return `<section class="ac-finalize iw-reveal" id="finalize">${u.icon('flag')}<div><h2>${m.finalized ? 'Some students are still Not Recorded' : 'Finish attendance'}</h2><p>Finalizing records Absent only where the evidence is complete: the check-in screen ran for the whole window, or a complete meeting report was imported. Anyone uncertain stays Not Recorded.</p></div>${u.button(m.finalized ? 'Finalize again' : 'Finalize attendance', 'ac-finalize', {session:ref.ss.id}, 'button primary')}</section>`;
}

function historySection(ctx, ref, m) {
  const {s} = ctx, id = ref.ss.id, tz = ref.tz, events = [];
  for (const l of (s.attendanceLog || []).filter(x => x.sessionId === id)) events.push({at:l.at, actor:l.actorId, type:l.type, title:l.text, detail:[l.summary, l.reason].filter(Boolean).join(' · ')});
  for (const e of m.entries) {
    const r = e.record;
    if (!r) continue;
    if (!r.importId && !/finalized/i.test(String(r.method)) && r.method !== 'close-out' && r.method !== 'venue-qr') events.push({at:r.at || r.created, actor:r.actorId, type:'record', title:`${nameOf(s, e.personId)} · ${r.history?.length ? r.history[0].from : r.status}`, detail:[methodLabel(String(r.method).replace(/ · corrected$/, '')), r.reason].filter(Boolean).join(' · ')});
    for (const h of r.history || []) events.push({at:h.at, actor:h.actorId, type:'correction', title:`${nameOf(s, e.personId)} · ${h.from} → ${h.to}`, detail:h.reason});
  }
  if (ref.kind === 'initiative' && ref.ss.closedOut && !ref.ss.attendanceFinalized) for (const h of (ref.ss.history || []).filter(x => /Attendance closed/.test(x.change || ''))) events.push({at:h.at, actor:h.actorId, type:'finalize', title:h.change, detail:'Earlier close-out'});
  events.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const icons = {import:'form', record:'check', correction:'edit', review:'search', 'roster-add':'userplus', finalize:'flag', screen:'qr'};
  const imports = importsFor(s, id);
  const importList = imports.length ? `<ul class="ac-imports">${imports.map(x => `<li>${u.icon('form')}<div><strong>${esc(x.fileName)}</strong><small title="${esc(x.fingerprint)}">${esc(x.source)} · ${x.counts.rows} rows · ${x.recordIds.length} recorded · ${x.reviewIds.length} to review${x.complete ? ' · complete report' : ''} · SHA-256 ${esc(String(x.fingerprint).slice(0, 10))}…</small></div><small>${esc(stamp(x.at, tz))}<br>${esc(nameOf(s, x.actorId))}</small></li>`).join('')}</ul>` : '';
  const timeline = events.length ? `<ol class="ac-timeline">${events.map(ev => `<li class="is-${esc(ev.type)}"><span class="ac-timeline-dot">${u.icon(icons[ev.type] || 'history')}</span><div><strong>${esc(ev.title)}</strong>${ev.detail ? `<p>${esc(ev.detail)}</p>` : ''}<small>${esc(stamp(ev.at, tz))} · ${esc(nameOf(s, ev.actor))}</small></div></li>`).join('')}</ol>` : '<p class="ac-muted">No attendance activity yet.</p>';
  return `<details class="ac-history iw-reveal" id="history"><summary>${u.icon('history')}<span>History & imports</span><small>${plural(events.length, 'event')}${imports.length ? ` · ${plural(imports.length, 'report')}` : ''}</small></summary><div class="ac-history-body">${importList}${timeline}<p class="ac-muted">${u.icon('shield')}The same report file cannot be imported twice; rows already recorded are never duplicated.</p></div></details>`;
}

/* ======================================================== check-in screen */

function renderScreen(ctx, ref, o) {
  const {s} = ctx, ss = ref.ss, m = sessionSummary(s, ref, ctx.person.id), w = m.window, t = nowMs(s);
  const inPerson = m.entries.filter(e => e.mode === 'In-person'), here = inPerson.filter(e => e.record && e.record.status !== 'Absent');
  const ready = Boolean(ss.checkinScreen?.secret), open = m.live && w.state === 'open' && ready;
  const code = open ? venueCode(ss, venueSlot(s)) : null, lateAt = w.start + rulesFor(ss).lateAfterMinutes * 60000;
  const arr = arrivals(ctx, ref, m, 8);
  const org = (s.organizations || []).find(x => x.id === ref.parent.ownerId);
  const left = open
    ? `<div class="ac-screen-qr" data-venue-qr="${esc(ss.id)}" data-kind="${esc(ref.kind)}">${qrSvg(checkinUrl(ref, code))}</div><span class="ac-qr-timer is-big" data-venue-timer><i></i></span><p class="ac-screen-scan">Scan with your phone camera to check in</p><p class="ac-screen-code">No camera? Open DeepSprout → Check in, and type <b data-venue-code>${esc(prettyCode(code))}</b></p>`
    : `<div class="ac-screen-wait">${u.icon(w.state === 'closed' || !m.live ? 'check' : 'clock')}</div><p class="ac-screen-scan">${!m.live || w.state === 'closed' ? 'Check-in has closed' : !ready ? 'Start the check-in screen' : 'Check-in opens soon'}</p><p class="ac-screen-code">${w.state === 'early' && m.live ? `Opens at <b>${esc(clock(w.opens, ref.tz))}</b> · in ${esc(inTime(w.opens - t))}` : !ready && m.live && w.state === 'open' ? u.button('Start check-in', 'ac-screen', {session:ss.id}, 'button primary') : `${here.length} of ${inPerson.length} checked in`}</p>`;
  const sim = demoEnabled && open ? (() => { const left2 = inPerson.filter(e => !e.record); return left2.length ? `<details class="ac-screen-demo"><summary>Development demo</summary><label><span>Simulate a student scanning</span><select name="ac-sim">${left2.map(e => `<option value="${esc(e.personId)}">${esc(nameOf(s, e.personId))}</option>`).join('')}</select></label>${u.button('Scan as this student', 'ac-sim-scan', {session:ss.id}, 'button quiet small')}<small>Or open the student link in another browser: ${esc(checkinUrl(ref, code))}</small></details>` : ''; })() : '';
  return `<div class="ac-screen" data-screen="${esc(ss.id)}" role="region" aria-label="Check-in screen">
    <header class="ac-screen-top"><span class="ac-screen-brand"><img src="assets/brand/floral-mark.png" alt="">${esc(org?.name || 'DeepSprout')}</span><span class="ac-screen-tools">${u.button('Full screen', 'ac-fullscreen', {}, 'button quiet small')}<a class="button quiet small" href="${u.href(`${o.base}/${ss.id}`)}">${u.icon('close')}Close</a></span></header>
    <div class="ac-screen-body">
      <section class="ac-screen-left">${left}</section>
      <section class="ac-screen-right"><p class="eyebrow">${esc(ref.parent.title)}</p><h1>${esc(ss.title)}</h1><p class="ac-screen-when">${esc(whenOf(ss))} · ${esc(placeOf(ref))}</p>
        <div class="ac-screen-count"><b>${here.length}</b><span>of ${inPerson.length}<br>checked in</span></div>
        <span class="ac-bar is-big" aria-hidden="true"><i style="--w:${inPerson.length ? here.length / inPerson.length * 100 : 0}%"></i></span>
        <p class="ac-screen-late">${open ? (t < lateAt ? `${u.icon('clock')}On time until ${esc(clock(lateAt, ref.tz))}` : `${u.icon('clock')}Arrivals now count as Late`) : ''}</p>
        ${arr.list.length ? `<ul class="ac-arr-list is-screen" aria-live="polite">${arr.html}</ul>` : `<p class="ac-arr-empty is-screen">${u.icon('people')}Arrivals appear here.</p>`}
      </section>
    </div>${sim}
  </div>`;
}

/* =========================================================== interactions */

async function loadFile(ctx, sessionId, file) {
  const ref = sessionRef(ctx.s, sessionId);
  if (!ref || !file) return;
  wizard.set(sessionId, {step:1, busy:true});
  ctx.render();
  try {
    const [parsed] = await Promise.all([readReport(file, ref.tz, ref.ss.date), new Promise(done => setTimeout(done, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900))]);
    wizard.set(sessionId, {step:2, file:{name:file.name, size:file.size, kind:parsed.kind}, parsed, complete:false});
  } catch (error) {
    wizard.set(sessionId, {step:1, error:error.message});
  }
  ctx.render();
}
function sampleReport(ctx, ref) {
  const {s} = ctx, w = windowOf(s, ref), entries = sessionSummary(s, ref, ctx.person.id).entries.filter(e => e.mode === 'Online');
  const fmt = ms => { const d = new Date(ms), parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:ref.tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true}).formatToParts(d).map(x => [x.type, x.value])); return `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second} ${parts.dayPeriod}`; };
  const min = 60000, len = w.end - w.start, rows = [];
  const add = (name, email, join, leave) => rows.push([name, email, fmt(join), fmt(leave), String(Math.round((leave - join) / min)), email ? 'No' : 'Yes']);
  add(nameOf(s, ctx.person.id), emailOf(s, ctx.person.id), w.start - 8 * min, w.end + 2 * min);
  entries.forEach((e, i) => {
    const name = nameOf(s, e.personId), email = emailOf(s, e.personId);
    if (i % 4 === 0) { add(name, email, w.start - 2 * min, w.start + len / 2); add(name, email, w.start + len / 2 + 3 * min, w.end); }
    else if (i % 4 === 1) add(name, email, w.start + 15 * min, w.end);
    else if (i % 4 === 2) add(name, email, w.start + 4 * min, w.start + Math.round(len / 3));
    else add(name, '', w.start + 1 * min, w.end - 1 * min);
  });
  add('Guest (Phone)', 'guest.caller@example.com', w.start + 6 * min, w.end - 10 * min);
  u.exportCSV(`sample-zoom-participants-${ref.ss.id}.csv`, ['Name (Original Name)', 'User Email', 'Join Time', 'Leave Time', 'Duration (Minutes)', 'Guest'], rows);
}
function personOptions(s, entries) { return entries.map(e => [e.personId, `${nameOf(s, e.personId)} · ${e.mode === 'In-person' ? 'in person' : 'online'}`]); }

export function centerAction(action, target, ctx) {
  const d = target.dataset, s = ctx.s, o = optsFor(ctx);
  if (!action.startsWith('ac-')) return false;
  const ref = d.session ? sessionRef(s, d.session) : null;
  if (action === 'ac-import-file') return true;
  if (action === 'ac-jump') { document.getElementById(d.target)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'}); return true; }
  if (action === 'ac-filter') {
    const root = document.getElementById('people'), select = root?.querySelector('select[data-filter=status]');
    if (select) { select.value = d.value || ''; root.querySelectorAll('[data-action=ac-filter]').forEach(b => { const on = b === target; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); }); u.applyFilters(root); }
    return true;
  }
  if (action === 'ac-screen') {
    dispatch('attendance.screen.open', {sessionId:d.session});
    ctx.go(`${o.base}/${d.session}/screen`);
    return true;
  }
  if (action === 'ac-fullscreen') {
    const el = document.querySelector('[data-screen]');
    if (document.fullscreenElement) document.exitFullscreen?.(); else el?.requestFullscreen?.().catch(() => u.toast('Full screen is not available in this browser.', true));
    return true;
  }
  if (action === 'ac-sim-scan') {
    const pid = document.querySelector('[name=ac-sim]')?.value, me = ctx.person.id;
    if (!pid) return true;
    const code = venueCode(ref.ss, venueSlot(s));
    try { dispatch('demo.signin', {personId:pid}); const res = dispatch('attendance.self.checkin', {sessionId:ref.ss.id, code}); u.toast(`${nameOf(s, pid)} checked in · ${res.status}`); }
    catch (error) { u.toast(error.message, true); }
    finally { dispatch('demo.signin', {personId:me}); }
    ctx.render(); return true;
  }
  if (action === 'ac-import-reset') { wizard.delete(d.session); ctx.render(); return true; }
  if (action === 'ac-import-step') { const st = wizard.get(d.session); if (st) { st.step = Number(d.step); ctx.render(); } return true; }
  if (action === 'ac-import-complete') { const st = wizard.get(d.session); if (st) st.complete = target.checked; return true; }
  if (action === 'ac-import-sample') { sampleReport(ctx, ref); return true; }
  if (action === 'ac-import-confirm') {
    const st = wizard.get(d.session);
    const res = ctx.run('attendance.import.apply', {sessionId:d.session, fileName:st.file.name, fileSize:st.file.size, fileKind:st.file.kind, fingerprint:st.parsed.fingerprint, source:st.parsed.source, complete:st.complete, records:st.parsed.records}, 'Attendance report imported.');
    wizard.set(d.session, {step:'done', result:res});
    ctx.render(); return true;
  }
  if (action === 'ac-add') {
    const list = addCandidates(s, ref, ctx.person.id), eligible = list.filter(x => x.eligible), w = windowOf(s, ref);
    const seats = mode => Math.max(0, modeCapacity(ref.ss, mode) - confirmedInMode(s, ref.ss, mode));
    const modeField = ref.format === 'Hybrid' ? `<fieldset class="ac-seg-field"><legend>Attends</legend>${(ref.kind === 'initiative' ? [['In-person', `In person · ${seats('In-person')} left`], ['Online', `Online · ${seats('Online')} left`]] : [['In-person', 'In person'], ['Online', 'Online']]).map(([v, l], i) => `<label><input type="radio" name="mode" value="${v}" ${i ? '' : 'checked'} required><span>${esc(l)}</span></label>`).join('')}</fieldset>` : '';
    const markField = w.state === 'early' ? `<p class="ac-muted">${u.icon('clock')}Check-in has not opened yet, so they are added as Not Recorded.</p>` : `<fieldset class="ac-seg-field"><legend>Attendance</legend>${[['Present', 'Here now · Present'], ['Late', 'Here · Late'], ['', 'Add only']].map(([v, l], i) => `<label><input type="radio" name="status" value="${v}" ${i ? '' : 'checked'}><span>${esc(l)}</span></label>`).join('')}</fieldset>`;
    const who = ref.kind === 'initiative' ? `students accepted into ${ref.parent.title}` : `people with a confirmed booking for ${ref.parent.title}`;
    const options = list.length ? `<div class="ac-pick" role="radiogroup" aria-label="Eligible students">${list.map(x => `<label class="ac-pick-row${x.eligible ? '' : ' is-disabled'}" data-pick="${esc(`${x.name} ${x.email}`.toLowerCase())}"><input type="radio" name="personId" value="${esc(x.personId)}" ${x.eligible ? '' : 'disabled'} required>${u.avatar(x.name)}<span><strong>${esc(x.name)}</strong><small>${esc(x.email)}</small></span><em>${esc(x.why)}</em></label>`).join('')}</div>` : `<div class="ac-calm">${u.icon('people')}<div><strong>Everyone eligible is already on this list.</strong><p>Only ${esc(who)} can be added. New people apply or book first.</p></div></div>`;
    u.modal('Add a student to this session', `<p class="ac-muted">You can add ${esc(who)}. Places and eligibility are checked again when you save.</p>${list.length > 5 ? `<label class="ac-search is-dialog">${u.icon('search')}<input type="search" data-ac-pick-search placeholder="Find by name or email" autocomplete="off" aria-label="Find a student"></label>` : ''}${options}${eligible.length ? modeField + markField + u.area('reason', 'Why are you adding them? (kept in the history)', '', true) : ''}`, v => {
      ctx.run('attendance.participant.add', {sessionId:ref.ss.id, personId:v.personId, mode:v.mode, status:v.status, reason:v.reason}, v.status ? `Student added · ${v.status}.` : 'Student added · attendance Not Recorded.');
      ctx.render();
    }, 'Add student', {wide:true});
    document.querySelector('#dialog-body [data-ac-pick-search]')?.addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); document.querySelectorAll('#dialog-body [data-pick]').forEach(n => { n.hidden = Boolean(q) && !n.dataset.pick.includes(q); }); });
    return true;
  }
  if (action === 'ac-exception') {
    const entries = sessionSummary(s, ref, ctx.person.id).entries.filter(e => !e.record);
    if (!entries.length) { u.toast('Everyone on this list already has an attendance record.'); return true; }
    const chosen = entries.find(e => e.personId === d.person);
    u.modal('Mark present by hand', `<p class="ac-muted">Use this when a check-in can’t be captured, for example a phone that won’t scan. Your name, the time and the reason are kept.</p>${chosen ? `<input type="hidden" name="personId" value="${esc(chosen.personId)}"><div class="ac-pick-row is-static">${u.avatar(nameOf(s, chosen.personId))}<span><strong>${esc(nameOf(s, chosen.personId))}</strong><small>${esc(chosen.mode === 'In-person' ? 'In person' : 'Online')}</small></span></div>` : u.select('personId', 'Student', personOptions(s, entries), '', true)}<fieldset class="ac-seg-field"><legend>Record as</legend>${[['Present', 'Present'], ['Late', 'Late']].map(([v, l], i) => `<label><input type="radio" name="status" value="${v}" ${i ? '' : 'checked'} required><span>${l}</span></label>`).join('')}</fieldset>${u.area('reason', 'Reason and how you confirmed they were there', '', true)}`, v => {
      const status = ctx.run('attendance.exception', {sessionId:ref.ss.id, ...v}, 'Recorded.');
      u.toast(`Recorded by hand · ${status}`); ctx.render();
    }, 'Record');
    return true;
  }
  if (action === 'ac-correct') {
    const entry = sessionSummary(s, ref, ctx.person.id).entries.find(e => e.personId === d.person);
    u.modal('Correct attendance', `<p class="ac-muted">${esc(nameOf(s, entry.personId))} is recorded <strong>${esc(entry.record.status)}</strong> (${esc(methodLabel(entry.record.method))}). The original record, your name and the reason are kept.</p><fieldset class="ac-seg-field"><legend>Correct to</legend>${['Present', 'Late', 'Absent'].filter(x => x !== entry.record.status).map((x, i) => `<label><input type="radio" name="status" value="${x}" ${i ? '' : 'checked'} required><span>${x}</span></label>`).join('')}</fieldset>${u.area('reason', 'Reason', '', true)}`, v => {
      ctx.run('attendance.correct', {sessionId:ref.ss.id, personId:entry.personId, ...v}, 'Attendance corrected with history.'); ctx.render();
    }, 'Save correction');
    return true;
  }
  if (action === 'ac-review') {
    const rv = (s.attendanceReviews || []).find(x => x.id === d.id), rref = sessionRef(s, rv.sessionId), entries = sessionSummary(s, rref, ctx.person.id).entries;
    const fixed = rv.personId, candidates = entries.filter(e => !e.record || e.personId === fixed), suggested = rv.personId || rv.suggestedPersonId || '';
    const decision = ['Present', 'Late'].includes(rv.proposed) ? rv.proposed : '';
    u.modal('Resolve a report row', `<dl class="ac-evidence is-dialog"><div><dt>Report row</dt><dd>${esc(rv.name || '—')}<small>${esc(rv.email || 'no email')}</small></dd></div><div><dt>Joined · left</dt><dd>${esc(`${clock(rv.joinedAt, rref.tz)} · ${clock(rv.leftAt, rref.tz)}`)}</dd></div><div><dt>Minutes</dt><dd>${rv.minutes ?? '—'}</dd></div></dl><p class="ac-muted">${esc(rv.reason)}</p>
      ${fixed ? `<input type="hidden" name="personId" value="${esc(fixed)}"><p>Student: <strong>${esc(nameOf(s, fixed))}</strong></p>` : candidates.length ? u.select('personId', 'Registered student', [['', 'Choose who this row belongs to'], ...personOptions(s, candidates)], suggested) : '<p class="ac-muted">No unrecorded student is left on the list. Add the student first, or keep this row as Not Recorded.</p>'}
      <fieldset class="ac-seg-field"><legend>Outcome</legend>${[['Present', 'Present'], ['Late', 'Late'], ['Not Recorded', 'Keep Not Recorded']].map(([v, l]) => `<label><input type="radio" name="decision" value="${v}" ${v === decision ? 'checked' : ''} required><span>${esc(l)}</span></label>`).join('')}</fieldset>
      ${u.area('reason', 'Note (kept in the history)', '', true)}`, v => {
      if (v.decision !== 'Not Recorded' && !v.personId) throw new Error('Choose the registered student this row belongs to.');
      ctx.run('attendance.review.resolve', {id:rv.id, ...v}, 'Review resolved.'); ctx.render();
    }, 'Resolve');
    return true;
  }
  if (action === 'ac-finalize') {
    const m = sessionSummary(s, ref, ctx.person.id), open = m.entries.filter(e => !e.record && !e.review), inPerson = open.filter(e => e.mode === 'In-person'), online = open.filter(e => e.mode === 'Online');
    const complete = importsFor(s, ref.ss.id).some(x => x.complete);
    u.modal('Finalize attendance', `<p class="ac-muted">Absent is recorded only where the evidence is complete. Anything uncertain stays Not Recorded, and corrections stay possible with a reason.</p><ul class="ac-final">
      ${inPerson.length ? `<li>${modeBadge('In-person')}<div><strong>${plural(inPerson.length, 'student')} without a check-in</strong>${u.checkbox('inPersonCheckInRan', 'Check-in was available for the whole check-in window', false, 'yes')}<small>Ticked: they are recorded Absent. Unticked: they stay Not Recorded.</small></div></li>` : ''}
      ${online.length ? `<li>${modeBadge('Online')}<div><strong>${plural(online.length, 'student')} not in a report</strong><small>${complete ? 'A complete report was imported, so they will be recorded Absent.' : 'No complete report was imported, so they stay Not Recorded.'}</small></div></li>` : ''}
      ${m.reviews.length ? `<li>${u.icon('search')}<div><strong>${plural(m.reviews.length, 'row')} in review</strong><small>They stay in review until resolved.</small></div></li>` : ''}
      ${!open.length && !m.reviews.length ? `<li>${u.icon('check')}<div><strong>Every student has an attendance record.</strong></div></li>` : ''}</ul>`, v => {
      const res = ctx.run('attendance.finalize', {sessionId:ref.ss.id, inPersonCheckInRan:v.inPersonCheckInRan === 'yes'}, 'Attendance finalized.');
      u.toast(`Attendance finalized · ${res.absent} Absent · ${res.notRecorded} Not Recorded`); ctx.render();
    }, 'Finalize attendance');
    return true;
  }
  if (action === 'ac-scan') {
    const video = document.querySelector('.ac-scanner');
    if (scanStream) { stopScan(video); return true; }
    navigator.mediaDevices?.getUserMedia({video:{facingMode:'environment'}}).then(stream => {
      scanStream = stream; video.srcObject = stream; video.hidden = false; video.play();
      const detector = new window.BarcodeDetector({formats:['qr_code']});
      const tick = async () => { if (!scanStream) return; try { const codes = await detector.detect(video); if (codes[0]) { stopScan(video); const form = document.querySelector('[data-form=ac-checkin]'); form.elements.code.value = codes[0].rawValue; form.dataset.method = 'qr'; form.requestSubmit(); return; } } catch {} requestAnimationFrame(tick); };
      tick();
    }).catch(() => u.toast('Camera unavailable. Type the booking code instead.', true));
    return true;
  }
  return false;
}
let scanStream = null;
function stopScan(video) { scanStream?.getTracks().forEach(t => t.stop()); scanStream = null; if (video) video.hidden = true; }

export function centerSubmit(form, ctx) {
  if (form.dataset.form !== 'ac-checkin') return false;
  ctx.localUI.acMore = form.dataset.session;
  const method = form.dataset.method === 'qr' ? 'qr' : 'code';
  delete form.dataset.method;
  const status = ctx.run('attendance.checkin', {sessionId:form.dataset.session, code:form.elements.code.value, method}, 'Checked in.');
  u.toast(`Check-in recorded · ${status}`); ctx.render();
  setTimeout(() => document.querySelector('[data-form=ac-checkin] [name=code]')?.focus(), 60);
  return true;
}
export function centerChange(target, ctx) {
  if (target.dataset.action === 'ac-import-file') { loadFile(ctx, target.dataset.session, target.files?.[0]); return true; }
  if (target.dataset.action === 'ac-import-complete') { const st = wizard.get(target.dataset.session); if (st) st.complete = target.checked; return true; }
  return false;
}

/* Live parts: the rotating QR, its countdown, and the window clock. */
let ticker = null, lastSlot = null, lastState = null;
function tick(ctx) {
  const nodes = document.querySelectorAll('[data-venue-qr]');
  if (!nodes.length) { clearInterval(ticker); ticker = null; return; }
  const s = ctx.s, t = nowMs(s), slot = venueSlot(s), left = 1 - (t % VENUE_SLOT_MS) / VENUE_SLOT_MS;
  document.querySelectorAll('[data-venue-timer] i').forEach(i => i.style.setProperty('--left', left.toFixed(3)));
  const ref = sessionRef(s, nodes[0].dataset.venueQr), state = ref ? windowOf(s, ref).state : null;
  if (lastState && state !== lastState) { lastState = state; ctx.render(); return; }
  lastState = state;
  if (slot === lastSlot && nodes[0].firstElementChild) return;
  lastSlot = slot;
  const code = ref && venueCode(ref.ss, slot);
  if (!code) return;
  nodes.forEach(n => { n.classList.remove('is-turn'); void n.offsetWidth; n.innerHTML = qrSvg(checkinUrl(ref, code)); n.classList.add('is-turn'); });
  document.querySelectorAll('[data-venue-code]').forEach(n => { n.textContent = prettyCode(code); });
}
let keyBound = false;
/** Bind drag-and-drop, the live QR and the screen's Escape key after each render. */
export function mountCenter(ctx) {
  for (const zone of document.querySelectorAll('[data-drop-import]')) {
    const over = on => e => { e.preventDefault(); zone.classList.toggle('is-over', on); };
    zone.addEventListener('dragenter', over(true));
    zone.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('is-over'); });
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('is-over'); const file = e.dataTransfer.files?.[0]; if (file) loadFile(ctx, zone.dataset.dropImport, file); });
  }
  if (!document.querySelector('.ac-scanner')) stopScan(null);
  clearInterval(ticker); ticker = null; lastSlot = null; lastState = null;
  if (document.querySelector('[data-venue-qr]')) { tick(ctx); ticker = setInterval(() => tick(ctx), 250); }
  const focus = ctx.route.query.get('focus');
  if (focus && !ctx.localUI.acFocused?.[location.hash]) { (ctx.localUI.acFocused ||= {})[location.hash] = true; requestAnimationFrame(() => document.getElementById(focus)?.scrollIntoView({block:'start'})); }
  if (!keyBound) { keyBound = true; document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('[data-screen]') && !document.querySelector('dialog[open]') && !document.fullscreenElement) { const close = document.querySelector('.ac-screen-tools a'); if (close) location.hash = close.getAttribute('href'); } }); }
}
