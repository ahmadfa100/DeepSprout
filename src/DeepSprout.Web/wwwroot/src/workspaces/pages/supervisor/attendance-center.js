/**
 * Supervisor · Attendance Management Center.
 *
 * Starts with the sessions assigned to the Supervisor, never with a scanner
 * or a roster. Opening a session shows only the verification tools its
 * format needs: QR check-in in person, report import online, both for a
 * hybrid session. Routine evidence records itself; this page is for
 * monitoring, imports, exceptions, eligible roster additions and excuses.
 *
 * No meeting platform is connected in this demo. Report files are read in the
 * browser; only the parsed rows, the file name and a SHA-256 fingerprint are
 * kept (browser storage, not a database).
 */
import * as u from '../../ui.js';
import {esc, nameOf, emailOf, personCell, emptyState, tabs, fmtDate} from '../institution/common.js';
import {assignedSessions, sessionRef, sessionSummary, roleFor, buildPreview, requiredMinutes, methodLabel, addCandidates, usesQR, usesImport, importsFor, windowOf, rulesFor} from '../../attendance/model.js';
import {readReport} from '../../attendance/report.js';
import {windowMessage, today, confirmedInMode, modeCapacity} from '../../initiative-rules.js';
import {meetingUrl} from '../../session-access.js';
import {nowMs} from '../../domain.js';

const BASE = 'supervisor/attendance';
const wizard = new Map();
const MODE_ICON = {'Online':'globe', 'In-person':'pin', 'Hybrid':'hybrid'};
const STATUS_CLASS = {'Present':'present', 'Late':'late', 'Absent':'absent', 'Needs Review':'review', 'Not Recorded':'none'};

const clock = (ms, tz) => ms == null ? '—' : new Date(ms).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:tz});
const stamp = (at, tz = 'Asia/Amman') => at ? new Date(at).toLocaleString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:tz}) : '—';
const kb = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const statusChip = (status, label = status) => `<span class="ac-status is-${STATUS_CLASS[status] || 'none'}">${esc(label)}</span>`;
const modeBadge = format => `<span class="ac-mode is-${esc(String(format).toLowerCase().replace(/[^a-z]/g, ''))}">${u.icon(MODE_ICON[format] || 'calendar')}${esc(format === 'In-person' ? 'In person' : format)}</span>`;
const chip = ({label, tone}) => `<span class="ac-chip is-${esc(tone)}">${esc(label)}</span>`;
const detailHref = (id, tab) => `${BASE}/${id}${tab ? `?tab=${tab}` : ''}`;
const parentLine = ref => `<span class="ac-parent">${u.icon(ref.kind === 'initiative' ? 'nodes' : 'mountain')}${ref.kind === 'initiative' ? 'Initiative' : 'Outdoor Activity'} · ${esc(ref.parent.title)}</span>`;

function meter(c) {
  if (!c.total) return '<span class="ac-meter is-empty" aria-hidden="true"></span>';
  const seg = (n, cls) => n ? `<i class="is-${cls}" style="--w:${(n / c.total * 100).toFixed(2)}%"></i>` : '';
  return `<span class="ac-meter" aria-hidden="true">${seg(c.present, 'present')}${seg(c.late, 'late')}${seg(c.review, 'review')}${seg(c.absent, 'absent')}${seg(c.notRecorded, 'none')}</span>`;
}
const summaryText = c => c.total ? [`${c.verified} verified`, c.review ? `${c.review} needs review` : '', c.notRecorded ? `${c.notRecorded} not recorded` : '', c.absent ? `${c.absent} absent` : ''].filter(Boolean).join(' · ') : 'No registered participants';

/* --------------------------------------------------------------- overview */

export function renderAttendanceCenter(ctx) {
  const {s, person:p, route:r} = ctx;
  const items = assignedSessions(s, p.id).map(ref => sessionSummary(s, ref, p.id)).sort((a, b) => a.window.start - b.window.start);
  const view = ['attention', 'completed'].includes(r.query.get('view')) ? r.query.get('view') : 'all';
  const attention = items.filter(x => x.needsAttention), completed = items.filter(x => x.completed);
  const head = `<header class="iw-head iw-reveal ac-head"><div class="iw-head-copy"><p class="eyebrow">SUPERVISOR · ${plural(items.length, 'ASSIGNED SESSION').toUpperCase()}</p><h1>Attendance</h1><p class="iw-lead">Manage attendance, imports, and exceptions.</p></div></header>`;
  if (!items.length) return head + emptyState('No sessions assigned to you yet.', 'Sessions and Outdoor Activities appear here when an Institution Representative assigns you to them. Not every session needs a Supervisor: valid check-ins and imported reports record attendance on their own.');
  const shown = view === 'attention' ? attention : view === 'completed' ? completed : items;
  const toolbar = `<div class="ac-toolbar iw-reveal">${tabs([['All Sessions', BASE, 'all', items.length], ['Needs Attention', `${BASE}?view=attention`, 'attention', attention.length], ['Completed', `${BASE}?view=completed`, 'completed', completed.length]], view)}<label class="ac-search">${u.icon('search')}<span class="sr-only">Search sessions</span><input type="search" data-filter="search" placeholder="Search sessions"></label></div>`;
  if (!shown.length) return head + toolbar + `<div class="iw-calm iw-reveal">${u.icon('check')}<div><strong>${view === 'attention' ? 'Nothing needs your attention.' : 'No completed sessions yet.'}</strong><p>${view === 'attention' ? 'Live sessions, reports to import, items to review and excuses will appear here.' : 'A session is completed once its attendance is finalized and nothing is waiting for review.'}</p></div></div>`;
  const day = today(s), groups = [
    ['Today and in progress', shown.filter(x => x.window.state === 'open' || x.ref.ss.date === day)],
    ['Upcoming', shown.filter(x => x.window.state === 'early' && x.ref.ss.date !== day)],
    ['Earlier', shown.filter(x => x.window.state === 'closed' && x.ref.ss.date !== day).reverse()]
  ].filter(([, list]) => list.length);
  return head + toolbar + groups.map(([title, list]) => `<section class="ac-group iw-reveal"><h2 class="ac-group-title">${esc(title)}<span>${list.length}</span></h2><div class="ac-list">${list.map(row).join('')}</div></section>`).join('');
}
function row(m) {
  const {ref, counts:c} = m, ss = ref.ss, d = new Date(`${ss.date}T12:00:00`);
  const exceptions = m.exceptions ? chip({label:plural(m.exceptions, 'pending exception'), tone:'attention'}) : '<span class="ac-quiet">No pending exceptions</span>';
  return `<article class="ac-row${m.needsAttention ? ' is-attention' : ''}" data-search="${esc(`${ss.title} ${ref.parent.title} ${ref.format}`)}">
    <time class="ac-date" datetime="${esc(ss.date)}"><b>${d.getDate()}</b><span>${esc(d.toLocaleDateString('en-GB', {month:'short'}))}</span></time>
    <div class="ac-row-main">${parentLine(ref)}<h3><a href="${u.href(detailHref(ss.id))}">${esc(ss.title)}</a></h3><p class="ac-meta">${modeBadge(ref.format)}<span>${u.icon('clock')}${esc(`${fmtDate(ss.date)} · ${ss.time}–${ss.endTime || ss.time}`)}</span><span>${u.icon('check')}${esc(m.method)}</span></p></div>
    <div class="ac-row-source"><span class="ac-label">Verification</span>${m.sources.map(chip).join('')}${m.finalized ? chip({label:'Finalized', tone:'positive'}) : ''}</div>
    <div class="ac-row-summary"><span class="ac-label">Attendance</span>${meter(c)}<small>${esc(summaryText(c))}</small></div>
    <div class="ac-row-exceptions"><span class="ac-label">Exceptions</span>${exceptions}</div>
    <a class="button quiet small ac-open" href="${u.href(detailHref(ss.id))}" aria-label="${esc(`Open session details: ${ss.title}`)}">Open session details${u.icon('arrow')}</a>
  </article>`;
}

/* ---------------------------------------------------------------- details */

export function renderSessionAttendance(ctx, sessionId) {
  const {s, person:p, route:r} = ctx, ref = sessionRef(s, sessionId);
  const back = `<a class="ac-back iw-reveal" href="${u.href(BASE)}">${u.icon('arrow')}All sessions</a>`;
  if (!ref || roleFor(s, ref, p.id) !== 'supervisor') return back + emptyState('This session is not in your assignments.', 'You can open attendance only for sessions you are assigned to. If your appointment ended, records you made stay attributed to you.');
  ctx.localUI.supCtx = `${ref.kind}:${ref.parent.id}`;
  if (ref.kind === 'initiative') ctx.localUI.initiativeId = ref.parent.id;
  const m = sessionSummary(s, ref, p.id), c = m.counts, ss = ref.ss, w = m.window;
  const tab = ['sources', 'participants', 'exceptions', 'history'].includes(r.query.get('tab')) ? r.query.get('tab') : 'sources';
  const place = ref.format === 'Online' ? 'Online meeting' : ref.format === 'Hybrid' ? `${ss.venue || ref.parent.venue || 'Venue'} · online` : ss.venue || ref.parent.venue || 'Venue';
  const finalize = m.live && w.state === 'closed' && (!m.finalized || c.notRecorded) ? u.button(m.finalized ? 'Finalize again' : 'Finalize attendance', 'ac-finalize', {session:ss.id}, m.finalized ? 'button quiet small' : 'button secondary small') : '';
  const windowNote = !m.live ? 'Attendance is read only: this session or its activity is closed.'
    : w.state === 'early' ? `${usesQR(ref.format) ? `Check-in opens ${stamp(w.opens, ref.tz)}.` : ''} ${usesImport(ref.format) ? 'The attendance report can be imported once the session starts.' : ''}`
    : w.state === 'open' ? (usesQR(ref.format) ? windowMessage(w, ref.tz)
      : w.end >= nowMs(s) ? 'Session in progress. Import the meeting report when it ends.'
      : m.imports.length ? `Report imported.${m.reviews.length ? ' Resolve the open review items.' : ''} Attendance can be finalized after ${stamp(w.closes, ref.tz)}.`
      : 'The session has ended. Import the meeting report to record online attendance.')
    : m.finalized ? `Finalized ${stamp(m.finalized.at, ref.tz)}. Missing evidence stays Not Recorded; corrections keep their history.` : 'Check-in has closed. Finalize when the evidence is complete. Missing evidence is never recorded as Absent on its own.';
  const hero = `<section class="ac-hero iw-reveal">
    <div class="ac-hero-copy"><p class="eyebrow">${ref.kind === 'initiative' ? 'INITIATIVE SESSION' : 'OUTDOOR ACTIVITY SESSION'}</p><h1>${esc(ss.title)}</h1>${parentLine(ref)}
      <ul class="ac-facts"><li>${modeBadge(ref.format)}</li><li>${u.icon('calendar')}${esc(`${fmtDate(ss.date)} · ${ss.time}–${ss.endTime || ss.time}`)}</li><li>${u.icon(ref.format === 'Online' ? 'globe' : 'pin')}${esc(place)}</li><li>${u.icon('check')}${esc(m.method)}</li></ul>
      <div class="ac-hero-status">${m.sources.map(chip).join('')}${m.finalized ? chip({label:'Finalized', tone:'positive'}) : ''}</div></div>
    <dl class="ac-metrics"><div class="is-verified"><dt>Verified</dt><dd><b>${c.verified}</b><small>/ ${c.total}</small></dd><span>${esc(`${c.present} present · ${c.late} late`)}</span></div><div class="is-none"><dt>Not recorded</dt><dd><b>${c.notRecorded}</b></dd><span>No evidence yet</span></div><div class="is-review"><dt>Needs review</dt><dd><b>${c.review}</b></dd><span>${esc(plural(m.reviews.length, 'open item'))}</span></div></dl>
    <div class="ac-window">${u.icon('clock')}<p>${esc(windowNote.trim())}${c.absent ? ` <span class="ac-quiet">${esc(`${c.absent} recorded absent.`)}</span>` : ''}</p>${finalize}</div>
  </section>`;
  const nav = tabs([['Attendance sources', detailHref(ss.id), 'sources'], ['Participants', detailHref(ss.id, 'participants'), 'participants', c.total], ['Excuses & exceptions', detailHref(ss.id, 'exceptions'), 'exceptions', m.exceptions], ['History', detailHref(ss.id, 'history'), 'history']], tab);
  const body = tab === 'participants' ? participantsTab(ctx, ref, m) : tab === 'exceptions' ? exceptionsTab(ctx, ref, m) : tab === 'history' ? historyTab(ctx, ref, m) : sourcesTab(ctx, ref, m);
  return back + hero + nav + `<div class="ac-panel" data-ac-session="${esc(ss.id)}">${body}</div>`;
}

/* ---- A/B. Sources */

function sourcesTab(ctx, ref, m) {
  const online = m.entries.filter(e => e.mode === 'Online'), inPerson = m.entries.filter(e => e.mode === 'In-person');
  const onlineBlock = usesImport(ref.format) ? integrationCard(ref) + importCard(ctx, ref, m) : '';
  const qrBlock = usesQR(ref.format) ? checkInCard(ctx, ref, m, inPerson) : '';
  if (ref.format !== 'Hybrid') return onlineBlock + qrBlock;
  return `<p class="ac-hint iw-reveal">${u.icon('hybrid')}This hybrid session verifies each participant by the mode they registered for, so nobody gets two records.</p>
    <section class="ac-mode-group iw-reveal"><h2>${modeBadge('Online')}<span>${plural(online.length, 'participant')} · report import</span></h2>${onlineBlock}</section>
    <section class="ac-mode-group iw-reveal"><h2>${modeBadge('In-person')}<span>${plural(inPerson.length, 'participant')} · QR check-in</span></h2>${qrBlock}</section>`;
}
function integrationCard(ref) {
  const url = meetingUrl(ref.ss.meeting || ''), platform = /zoom\.us/i.test(url) ? 'Zoom' : /meet\.google/i.test(url) ? 'Google Meet' : /teams\./i.test(url) ? 'Microsoft Teams' : 'your meeting platform';
  return `<section class="ac-source is-compact iw-reveal"><div class="ac-source-head"><span class="ac-source-icon">${u.icon('globe')}</span><div><h3>Meeting integration</h3><p>Not connected</p></div>${chip({label:'Not available yet', tone:'neutral'})}</div>
    <p class="ac-muted">DeepSprout is not connected to ${esc(platform)}, so online participation is not imported automatically. After the session, export the participant report and import it below.${url ? ` <a class="text-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open the meeting link</a>` : ''}</p></section>`;
}
function steps(current) {
  return `<ol class="ac-steps" aria-label="Import steps">${['Upload', 'Preview & match', 'Confirm import'].map((label, i) => `<li class="${i + 1 < current ? 'is-done' : i + 1 === current ? 'is-current' : ''}" ${i + 1 === current ? 'aria-current="step"' : ''}><span>${i + 1 < current ? u.icon('check') : i + 1}</span>${esc(label)}</li>`).join('')}</ol>`;
}
function importCard(ctx, ref, m) {
  const {s, person:p} = ctx, id = ref.ss.id, st = wizard.get(id) || {step:1}, {scheduled, required, rules} = requiredMinutes(s, ref);
  const rulesLine = `Times are read in ${esc(ref.tz)}. Late after ${rules.lateAfterMinutes} min · at least ${rules.minimumPercent}% of the session (${required} of ${scheduled} min) counts as attended. Shorter attendance goes to review, never straight to Absent.`;
  const last = m.imports[0];
  const lastLine = last ? `<p class="ac-muted ac-last">${u.icon('history')}Last import: ${esc(last.fileName)} · ${esc(stamp(last.at, ref.tz))} · ${esc(nameOf(s, last.actorId))}. <a class="text-link" href="${u.href(detailHref(id, 'history'))}">Import history</a></p>` : '';
  const shell = (step, inner) => `<section class="ac-source ac-import iw-reveal" aria-labelledby="ac-import-${esc(id)}"><div class="ac-source-head"><span class="ac-source-icon">${u.icon('form')}</span><div><h3 id="ac-import-${esc(id)}">Attendance report import</h3><p>Excel or CSV export from Zoom, Google Meet, Teams or a similar tool</p></div></div>${steps(step)}${inner}</section>`;
  if (!m.live) return shell(1, `<p class="ac-muted">Imports are closed for this session.</p>${lastLine}`);
  if (!m.window.started) return shell(1, `<div class="ac-drop is-disabled" aria-disabled="true"><span class="ac-drop-art">${u.icon('clock')}</span><strong>Available once the session starts</strong><small>Reports exist only after people have joined.</small></div><p class="ac-muted">${rulesLine}</p>`);
  if (st.step === 'done') {
    const res = st.result;
    return shell(4, `<div class="ac-done" role="status">${u.icon('check')}<div><strong>Import complete</strong><p>${esc(`${plural(res.recorded, 'attendance record')} created${res.reviews ? ` · ${plural(res.reviews, 'row')} waiting for your review` : ''}.`)} Participants and institution reports now show the update.</p><div class="actions">${u.link('View participants', detailHref(id, 'participants'), 'button quiet small')}${res.reviews ? u.link('Review rows', detailHref(id, 'exceptions'), 'button quiet small') : ''}${u.button('Import another report', 'ac-import-reset', {session:id}, 'button quiet small')}</div></div></div>`);
  }
  if (st.step === 2 || st.step === 3) {
    const pv = buildPreview(s, ref, st.parsed.records, p.id), k = pv.counts;
    const fileLine = `<div class="ac-file">${u.icon('form')}<div><strong>${esc(st.file.name)}</strong><small>${esc(`${st.parsed.source} · ${plural(k.rows, 'row')} · ${kb(st.file.size)}`)}</small></div>${u.button('Choose another file', 'ac-import-reset', {session:id}, 'button quiet small')}</div>`;
    const alerts = [...pv.errors.map(e => `<li class="is-critical">${u.icon('alert')}${esc(e)}</li>`), ...pv.warnings.map(e => `<li>${u.icon('info')}${esc(e)}</li>`)].join('');
    if (st.step === 3 && !pv.errors.length) {
      const missing = pv.missing.map(pid => nameOf(s, pid));
      return shell(3, `${fileLine}<div class="ac-confirm"><h4>Confirm this import</h4><ul>
        <li>${u.icon('check')}<span><b>${plural(k.ready, 'attendance record')}</b> will be created (${k.present} Present, ${k.late} Late).</span></li>
        <li>${u.icon('info')}<span><b>${plural(k.review + k.conflict + k.unmatched, 'row')}</b> will wait in Excuses &amp; exceptions for review. Nothing is guessed.</span></li>
        <li>${u.icon('history')}<span><b>${plural(k.duplicate, 'row')}</b> already recorded will not change. ${k.ignored ? `${plural(k.ignored, 'staff row')} ignored.` : ''}</span></li>
        <li>${u.icon('people')}<span>${missing.length ? `${esc(missing.join(', '))} ${missing.length === 1 ? 'is' : 'are'} registered online but not in this report. ${st.complete ? 'Because you marked the report complete, finalizing will record them Absent.' : 'They stay Not Recorded.'}` : 'Every registered online participant appears in this report.'}</span></li></ul>
        <p class="ac-muted">The file name, its fingerprint and these results are kept in the session history. The original file is not stored in this demo.</p>
        <div class="actions">${u.button('Back', 'ac-import-step', {session:id, step:2}, 'button quiet')}${u.button('Confirm import', 'ac-import-confirm', {session:id}, 'button primary')}</div></div>`);
    }
    const label = {ready:'Will record', review:'Needs review', conflict:'Conflict', duplicate:'Already recorded', unmatched:'Unmatched', ignored:'Ignored'};
    const tone = {ready:'present', review:'review', conflict:'review', duplicate:'none', unmatched:'review', ignored:'none'};
    const rows = pv.rows.map(x => `<tr class="is-${x.status}"><td class="ac-cell-person"><strong>${esc(x.name || x.email || 'Unnamed row')}</strong><small>${esc(x.email || 'No email in report')}${x.rowsMerged > 1 ? ` · ${x.rowsMerged} rows merged` : ''}</small></td><td data-label="Matched participant">${x.personId ? personCell(s, x.personId, x.matchType === 'name' ? 'Name match only' : 'Email match') : '<span class="ac-quiet">No registered match</span>'}</td><td data-label="Joined">${esc(clock(x.joinedAt, ref.tz))}</td><td data-label="Left">${esc(clock(x.leftAt, ref.tz))}</td><td data-label="Minutes">${x.minutes == null ? '—' : Math.round(x.minutes)}</td><td class="ac-cell-wide" data-label="Result"><span class="ac-result">${statusChip(tone[x.status] === 'present' ? x.outcome : tone[x.status] === 'review' ? 'Needs Review' : 'Not Recorded', x.status === 'ready' ? `${label.ready} ${x.outcome}` : label[x.status])}<small>${esc(x.reason)}</small></span></td></tr>`).join('');
    const tiles = [['Ready to record', k.ready, 'present', `${k.present} Present · ${k.late} Late`], ['Needs review', k.review, 'review', 'Partial, name-only or mode mismatch'], ['Conflicts', k.conflict, 'review', 'Disagree with a record'], ['Unmatched', k.unmatched, 'review', 'Not on the roster'], ['Already recorded', k.duplicate, 'none', 'No change'], ['Not in report', k.missing, 'none', 'Stay Not Recorded']];
    return shell(2, `${fileLine}${alerts ? `<ul class="ac-alerts">${alerts}</ul>` : ''}
      <div class="ac-tiles">${tiles.map(([t, n, cls, hint]) => `<div class="ac-tile is-${cls}"><b>${n}</b><span>${esc(t)}</span><small>${esc(hint)}</small></div>`).join('')}</div>
      <div class="table-scroll ac-preview" tabindex="0" role="region" aria-label="Import preview"><table class="ac-table is-cards"><thead><tr><th scope="col">Report row</th><th scope="col">Matched participant</th><th scope="col">Joined</th><th scope="col">Left</th><th scope="col">Minutes</th><th scope="col">Result</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="ac-muted">${rulesLine}</p>
      <label class="ac-check"><input type="checkbox" data-action="ac-import-complete" data-session="${esc(id)}" ${st.complete ? 'checked' : ''}><span><strong>This is the complete participant report for the session</strong><small>Only then can finalizing record registered online participants missing from it as Absent. Leave it unticked for partial or uncertain exports.</small></span></label>
      <div class="actions">${u.button('Back', 'ac-import-reset', {session:id}, 'button quiet')}${pv.errors.length ? '<button type="button" class="button primary" disabled>Continue</button>' : u.button('Continue', 'ac-import-step', {session:id, step:3}, 'button primary')}</div>`);
  }
  const error = st.error ? `<p class="ac-error" role="alert">${u.icon('alert')}${esc(st.error)}</p>` : '';
  return shell(1, `<div class="ac-drop${st.busy ? ' is-busy' : ''}" data-drop-import="${esc(id)}">
      <input type="file" id="ac-file-${esc(id)}" class="ac-file-input" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-action="ac-import-file" data-session="${esc(id)}" ${st.busy ? 'disabled' : ''}>
      <span class="ac-drop-art" aria-hidden="true">${u.icon('form')}</span>
      ${st.busy ? '<strong>Reading the report…</strong><small>Matching rows against this session’s roster.</small>' : `<strong class="ac-drop-pointer">Drag and drop the attendance report here</strong><strong class="ac-drop-touch">Choose the attendance report</strong><span class="ac-or">or</span><label for="ac-file-${esc(id)}" class="button secondary">Browse files</label><small>.xlsx or .csv · up to 5 MB</small>`}
    </div>${error}<p class="ac-muted">${rulesLine}</p>${lastLine}<p class="ac-muted">Need a file to try the flow? ${u.button('Download a sample report for this session', 'ac-import-sample', {session:id}, 'text-link ac-link-button')} (fictional rows built from this roster).</p>`);
}
function checkInCard(ctx, ref, m, inPerson) {
  const w = m.window, open = m.live && w.state === 'open', id = ref.ss.id;
  const checked = inPerson.filter(e => e.record && e.record.status !== 'Absent').length, late = rulesFor(ref.ss).lateAfterMinutes;
  const state = !m.live ? {label:'Read only', tone:'neutral'} : open ? {label:'Check-in open', tone:'positive'} : w.state === 'early' ? {label:`Opens ${stamp(w.opens, ref.tz)}`, tone:'neutral'} : {label:'Check-in closed', tone:'neutral'};
  const scan = open && typeof window !== 'undefined' && 'BarcodeDetector' in window ? u.button('Scan with camera', 'ac-scan', {session:id}, 'button quiet') : '';
  return `<section class="ac-source iw-reveal"><div class="ac-source-head"><span class="ac-source-icon">${u.icon('ticket')}</span><div><h3>QR check-in</h3><p>Booking QR or code at the venue</p></div>${chip(state)}</div>
    <p class="ac-muted">Scan the participant’s booking QR, or type its code. A valid check-in records attendance at once: Present, or Late after ${late} minutes. Nobody needs to approve it again.</p>
    <form class="ac-checkin" data-form="ac-checkin" data-session="${esc(id)}" data-scan-target><label class="field"><span>Booking code</span><input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="DS-XXXX-XX" required ${open ? '' : 'disabled'}></label><div class="actions"><button class="button primary" ${open ? '' : 'disabled'}>Check in</button>${scan}</div><p class="form-error" role="alert"></p></form>
    <video class="ac-scanner" hidden playsinline muted></video>
    <div class="ac-progress"><span>${esc(`${checked} of ${inPerson.length} in-person participants checked in`)}</span><span class="ac-meter" aria-hidden="true"><i class="is-present" style="--w:${inPerson.length ? checked / inPerson.length * 100 : 0}%"></i></span></div>
    ${m.live && w.state !== 'early' ? `<p class="ac-muted">Can’t verify a code (dead phone, damaged ticket)? ${u.button('Record a manual exception', 'ac-exception', {session:id}, 'text-link ac-link-button')} with a reason.</p>` : ''}</section>`;
}

/* ---- C. Participants */

function participantsTab(ctx, ref, m) {
  const {s} = ctx, canAct = m.live, started = m.window.state !== 'early';
  const filters = `<div class="ac-toolbar is-roster"><label class="ac-search">${u.icon('search')}<span class="sr-only">Search participants</span><input type="search" data-filter="search" placeholder="Search by name or email"></label><label class="ac-filter"><span class="sr-only">Filter by attendance</span><select data-filter="status"><option value="">All attendance</option>${['Present', 'Late', 'Needs Review', 'Not Recorded', 'Absent'].map(x => `<option>${x}</option>`).join('')}</select></label>${canAct ? u.button('Add participant', 'ac-add', {session:ref.ss.id}, 'button secondary') : ''}</div>`;
  if (!m.entries.length) return filters + emptyState('No one is registered for this session yet.', 'Registered participants appear here. You can add an eligible participant if someone was left off.', canAct ? u.button('Add participant', 'ac-add', {session:ref.ss.id}) : '');
  const rows = m.entries.map(e => {
    const rec = e.record, ev = rec?.evidence;
    const source = rec ? `${esc(methodLabel(rec.method))}${ev?.minutes != null ? ` <small>${esc(`${ev.minutes} min${ev.joinedAt ? ` · joined ${clock(ev.joinedAt, ref.tz)}` : ''}`)}</small>` : ''}${rec.reason && !ev ? ` <small>${esc(rec.reason)}</small>` : ''}` : e.review ? `<small>${esc(e.review.reason)}</small>` : `<span class="ac-quiet">${e.mode === 'Online' ? 'Waiting for the report' : started ? 'No check-in yet' : 'Check-in not open'}</span>`;
    const reg = e.addedBy ? `Added by ${esc(nameOf(s, e.addedBy))}<small>${esc(e.addedReason)}</small>` : `Registered<small>${esc(fmtDate(e.registeredAt))}</small>`;
    const action = !canAct ? '' : rec ? u.button('Correct', 'ac-correct', {session:ref.ss.id, person:e.personId}, 'button quiet small') : e.review ? u.button('Review', 'ac-review', {id:e.review.id}, 'button quiet small') : started ? u.button('Exception', 'ac-exception', {session:ref.ss.id, person:e.personId}, 'button quiet small') : '';
    return `<tr data-search="${esc(`${nameOf(s, e.personId)} ${emailOf(s, e.personId)}`)}" data-status="${esc(e.status)}"><td class="ac-cell-person">${personCell(s, e.personId, esc(emailOf(s, e.personId)))}</td><td data-label="Mode">${modeBadge(e.mode)}</td><td class="ac-stack" data-label="Registration">${reg}</td><td class="ac-cell-status" data-label="Attendance">${statusChip(e.status)}</td><td class="ac-stack" data-label="Source">${source}</td><td data-label="Recorded">${esc(rec ? stamp(rec.at || rec.created, ref.tz) : '—')}</td><td class="ac-actions">${action}</td></tr>`;
  }).join('');
  return filters + `<div class="table-scroll iw-reveal" tabindex="0" role="region" aria-label="Session participants"><table class="ac-table is-roster is-cards"><thead><tr><th scope="col">Participant</th><th scope="col">Mode</th><th scope="col">Registration</th><th scope="col">Attendance</th><th scope="col">Verification source</th><th scope="col">Recorded</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="ac-muted">${u.icon('shield')}Attendance comes from evidence. Present and Late need a valid check-in, a matched report row or a reasoned exception. Registration is not attendance, and attendance is not completion.</p>`;
}

/* ---- D. Excuses & exceptions */

function exceptionsTab(ctx, ref, m) {
  const {s, person:p} = ctx;
  const reviewCard = rv => `<article class="ac-review iw-reveal"><header><div><strong>${esc(rv.name || rv.email || 'Report row')}</strong><small>${esc(rv.email || 'No email in report')} · report line ${esc((rv.lines || []).join(', '))}</small></div>${statusChip('Needs Review', {unmatched:'Unmatched', conflict:'Conflict', review:'Needs review'}[rv.type] || 'Needs review')}</header>
    <p>${esc(rv.reason)}</p><dl class="ac-evidence"><div><dt>Joined</dt><dd>${esc(clock(rv.joinedAt, ref.tz))}</dd></div><div><dt>Left</dt><dd>${esc(clock(rv.leftAt, ref.tz))}</dd></div><div><dt>Minutes</dt><dd>${rv.minutes ?? '—'}</dd></div><div><dt>Suggests</dt><dd>${esc(rv.proposed)}</dd></div>${rv.personId || rv.suggestedPersonId ? `<div><dt>Participant</dt><dd>${esc(nameOf(s, rv.personId || rv.suggestedPersonId))}</dd></div>` : ''}</dl>
    ${m.live ? `<div class="actions">${u.button('Resolve', 'ac-review', {id:rv.id}, 'button primary small')}</div>` : ''}</article>`;
  const reviews = m.reviews.length ? `<div class="ac-reviews">${m.reviews.map(reviewCard).join('')}</div>` : `<div class="iw-calm">${u.icon('check')}<div><strong>No attendance records need review.</strong><p>Unmatched, partial or conflicting report rows appear here after an import.</p></div></div>`;
  let excuses;
  if (ref.kind !== 'initiative') excuses = `<p class="ac-muted">${u.icon('info')}Absence excuses are handled for Initiative sessions. Outdoor Activity excuses are not part of this demo yet.</p>`;
  else {
    const list = (s.excuses || []).filter(e => e.sessionId === ref.ss.id).sort((a, b) => String(b.created).localeCompare(String(a.created)));
    excuses = list.length ? `<div class="iw-excuses">${list.map(e => excuseCard(s, p, ref, e)).join('')}</div>` : `<div class="iw-calm">${u.icon('mail')}<div><strong>No excuses for this session.</strong><p>When a participant recorded Absent explains the absence, it appears here for your recommendation.</p></div></div>`;
  }
  return `<section class="ac-section iw-reveal"><div class="ac-section-head"><h2>Needs review</h2><p>Report rows that could not be recorded with confidence. Resolving one needs a short note.</p></div>${reviews}</section>
    <section class="ac-section iw-reveal"><div class="ac-section-head"><h2>Excuses</h2><p>You recommend. The Institution Representative makes the final decision. An accepted excuse never turns Absent into Present.</p></div>${excuses}</section>`;
}
function excuseCard(s, p, ref, e) {
  const a = (s.sessionAttendance || []).find(x => x.id === e.attendanceId), canRecommend = ['Submitted', 'Info Requested', 'Recommended'].includes(e.status);
  const state = e.status === 'Recommended' ? 'With the Representative' : e.status === 'Submitted' ? 'Waiting for your review' : e.status === 'Info Requested' ? 'Waiting for the student' : e.status;
  return `<article class="iw-excuse"><header>${personCell(s, e.personId, `Submitted ${esc(fmtDate(e.created))}`)}<div class="actions">${statusChip(a?.status || 'Absent', `Attendance: ${a?.status || 'Absent'}`)}<span class="ac-chip is-${e.status === 'Accepted' ? 'positive' : e.status === 'Rejected' ? 'neutral' : 'attention'}">${esc(state)}</span></div></header>
    <blockquote>${esc(e.reason)}</blockquote>
    ${e.attachment ? `<div class="iw-evidence">${u.icon('form')}<div><strong>${esc(e.attachment.name)}</strong><small>${esc(e.attachment.type)} · ${(e.attachment.size / 1024).toFixed(0)} KB · visible to this initiative’s Supervisors and Representative only</small></div>${e.attachment.id ? u.button('Open attachment', 'excuse-evidence', {id:e.id}, 'button quiet small') : '<small>File name only (earlier record)</small>'}</div>` : ''}
    <ol class="iw-chain"><li class="is-done"><span>Student</span><small>${esc(fmtDate(e.created))}</small></li><li class="${e.recommendation ? 'is-done' : 'is-now'}"><span>Supervisor</span><small>${e.recommendation ? `${esc(e.recommendation.decision)} · ${esc(nameOf(s, e.recommendation.actorId))}` : 'Your recommendation'}</small></li><li class="${e.decision ? 'is-done' : e.recommendation ? 'is-now' : ''}"><span>Representative</span><small>${e.decision ? `${esc(e.decision.decision)} · ${esc(nameOf(s, e.decision.actorId))}` : 'Final decision'}</small></li></ol>
    ${e.recommendation ? `<p><strong>Your note:</strong> ${esc(e.recommendation.note)}</p>` : ''}${e.decision ? `<p><strong>Decision:</strong> ${esc(e.decision.reason)}</p>` : ''}
    ${canRecommend && ref.ss && roleFor(s, ref, p.id) === 'supervisor' ? `<div class="actions">${u.button(e.recommendation ? 'Update recommendation' : 'Recommend', 'excuse-recommend', {id:e.id}, 'button primary small')}</div>` : ''}</article>`;
}

/* ---- E. History */

function historyTab(ctx, ref, m) {
  const {s} = ctx, id = ref.ss.id, tz = ref.tz, events = [];
  for (const l of (s.attendanceLog || []).filter(x => x.sessionId === id)) events.push({at:l.at, actor:l.actorId, type:l.type, title:l.text, detail:[l.summary, l.reason].filter(Boolean).join(' · ')});
  for (const e of m.entries) {
    const r = e.record;
    if (!r) continue;
    if (!r.importId && !/finalized/i.test(String(r.method)) && r.method !== 'close-out') events.push({at:r.at || r.created, actor:r.actorId, type:'record', title:`${nameOf(s, e.personId)} · ${r.history?.length ? r.history[0].from : r.status}`, detail:[methodLabel(String(r.method).replace(/ · corrected$/, '')), r.reason].filter(Boolean).join(' · ')});
    for (const h of r.history || []) events.push({at:h.at, actor:h.actorId, type:'correction', title:`${nameOf(s, e.personId)} · ${h.from} → ${h.to}`, detail:h.reason});
  }
  if (ref.kind === 'initiative' && ref.ss.closedOut && !ref.ss.attendanceFinalized) for (const h of (ref.ss.history || []).filter(x => /Attendance closed/.test(x.change || ''))) events.push({at:h.at, actor:h.actorId, type:'finalize', title:h.change, detail:'Earlier close-out'});
  events.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const icons = {import:'form', record:'check', correction:'edit', review:'search', 'roster-add':'plus', finalize:'flag'};
  const imports = importsFor(s, id);
  const importTable = imports.length ? `<div class="table-scroll" tabindex="0" role="region" aria-label="Import history"><table class="ac-table is-cards"><thead><tr><th scope="col">File</th><th scope="col">Source</th><th scope="col">Rows</th><th scope="col">Recorded</th><th scope="col">To review</th><th scope="col">Complete report</th><th scope="col">Imported</th></tr></thead><tbody>${imports.map(x => `<tr><td class="ac-cell-person"><strong>${esc(x.fileName)}</strong><small title="${esc(x.fingerprint)}">${esc(x.fileKind.toUpperCase())} · ${esc(kb(x.fileSize || 0))} · SHA-256 ${esc(String(x.fingerprint).slice(0, 12))}…</small></td><td data-label="Source">${esc(x.source)}</td><td data-label="Rows">${x.counts.rows}</td><td data-label="Recorded">${x.recordIds.length}</td><td data-label="To review">${x.reviewIds.length}</td><td data-label="Complete report">${x.complete ? 'Yes' : 'No'}</td><td class="ac-stack" data-label="Imported">${esc(stamp(x.at, tz))}<small>${esc(nameOf(s, x.actorId))}</small></td></tr>`).join('')}</tbody></table></div><p class="ac-muted">${u.icon('shield')}The same file cannot be imported twice; rows already recorded are never duplicated.</p>` : '<p class="ac-muted">No reports imported for this session.</p>';
  const timeline = events.length ? `<ol class="ac-timeline">${events.map(ev => `<li class="is-${esc(ev.type)}"><span class="ac-timeline-dot">${u.icon(icons[ev.type] || 'history')}</span><div><strong>${esc(ev.title)}</strong>${ev.detail ? `<p>${esc(ev.detail)}</p>` : ''}<small>${esc(stamp(ev.at, tz))} · ${esc(nameOf(s, ev.actor))}</small></div></li>`).join('')}</ol>` : '<p class="ac-muted">No attendance activity yet.</p>';
  return `<section class="ac-section iw-reveal"><div class="ac-section-head"><h2>Report imports</h2></div>${importTable}</section><section class="ac-section iw-reveal"><div class="ac-section-head"><h2>Audit trail</h2><p>Every check-in, import, review, roster change, correction and finalization, with who did it and when.</p></div>${timeline}</section>`;
}

/* ----------------------------------------------------------- interactions */

async function loadFile(ctx, sessionId, file) {
  const ref = sessionRef(ctx.s, sessionId);
  if (!ref || !file) return;
  wizard.set(sessionId, {step:1, busy:true});
  ctx.render();
  try {
    const parsed = await readReport(file, ref.tz, ref.ss.date);
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
  const d = target.dataset, s = ctx.s;
  if (!action.startsWith('ac-')) return false;
  const ref = d.session ? sessionRef(s, d.session) : null;
  if (action === 'ac-import-file') return true;
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
    const list = addCandidates(s, ref, ctx.person.id), eligible = list.filter(x => x.eligible);
    const seats = mode => Math.max(0, modeCapacity(ref.ss, mode) - confirmedInMode(s, ref.ss, mode));
    const modeField = ref.format === 'Hybrid' ? u.select('mode', 'Attends', ref.kind === 'initiative' ? [['Online', `Online · ${seats('Online')} places left`], ['In-person', `In person · ${seats('In-person')} places left`]] : [['In-person', 'In person'], ['Online', 'Online']], 'Online', true) : '';
    const who = ref.kind === 'initiative' ? `accepted participants of ${ref.parent.title}` : `people with a confirmed booking for ${ref.parent.title}`;
    const options = list.length ? `<div class="ac-pick" role="radiogroup" aria-label="Eligible participants">${list.map(x => `<label class="ac-pick-row${x.eligible ? '' : ' is-disabled'}" data-pick="${esc(`${x.name} ${x.email}`.toLowerCase())}"><input type="radio" name="personId" value="${esc(x.personId)}" ${x.eligible ? '' : 'disabled'} required>${u.avatar(x.name)}<span><strong>${esc(x.name)}</strong><small>${esc(x.email)}</small></span><em>${esc(x.why)}</em></label>`).join('')}</div>` : '<p class="ac-muted">Everyone eligible is already on this roster.</p>';
    u.modal('Add a participant', `<p class="ac-muted">You can add ${esc(who)}. Admission, capacity and your assignment are checked again when you save. Adding someone does not mark them present.</p>${list.length > 5 ? `<label class="field"><span>Find a participant</span><input type="search" data-ac-pick-search placeholder="Name or email" autocomplete="off"></label>` : ''}${options}${eligible.length ? modeField + u.area('reason', 'Reason for adding (kept in the audit trail)', '', true) : ''}`, v => {
      ctx.run('attendance.participant.add', {sessionId:ref.ss.id, personId:v.personId, mode:v.mode, reason:v.reason}, 'Participant added · attendance Not Recorded.');
      ctx.render();
    }, 'Add to roster', {wide:true});
    document.querySelector('#dialog-body [data-ac-pick-search]')?.addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); document.querySelectorAll('#dialog-body [data-pick]').forEach(n => { n.hidden = Boolean(q) && !n.dataset.pick.includes(q); }); });
    return true;
  }
  if (action === 'ac-exception') {
    const entries = sessionSummary(s, ref, ctx.person.id).entries.filter(e => !e.record);
    if (!entries.length) { u.toast('Everyone on this roster already has an attendance record.'); return true; }
    const chosen = entries.find(e => e.personId === d.person);
    u.modal('Record a manual exception', `<p class="ac-muted">Use this only when valid evidence cannot be captured, for example a phone that will not open the booking QR. Your name, the time and this reason are kept.</p>${chosen ? `<input type="hidden" name="personId" value="${esc(chosen.personId)}"><p><strong>${esc(nameOf(s, chosen.personId))}</strong> · ${esc(chosen.mode === 'In-person' ? 'in person' : 'online')}</p>` : u.select('personId', 'Participant', personOptions(s, entries), '', true)}${u.select('status', 'Record as', [['Present', 'Present'], ['Late', 'Late']], 'Present', true)}${u.area('reason', 'Reason and how presence was verified', '', true)}`, v => {
      const status = ctx.run('attendance.exception', {sessionId:ref.ss.id, ...v}, 'Manual exception recorded.');
      u.toast(`Manual exception recorded · ${status}`); ctx.render();
    }, 'Record exception');
    return true;
  }
  if (action === 'ac-correct') {
    const entry = sessionSummary(s, ref, ctx.person.id).entries.find(e => e.personId === d.person);
    u.modal('Correct attendance', `<p class="ac-muted">${esc(nameOf(s, entry.personId))} is recorded <strong>${esc(entry.record.status)}</strong> (${esc(methodLabel(entry.record.method))}). The original record, your name and the reason are kept.</p>${u.select('status', 'Correct to', ['Present', 'Late', 'Absent'].filter(x => x !== entry.record.status), '', true)}${u.area('reason', 'Reason', '', true)}`, v => {
      ctx.run('attendance.correct', {sessionId:ref.ss.id, personId:entry.personId, ...v}, 'Attendance corrected with history.'); ctx.render();
    }, 'Save correction');
    return true;
  }
  if (action === 'ac-review') {
    const rv = (s.attendanceReviews || []).find(x => x.id === d.id), rref = sessionRef(s, rv.sessionId), entries = sessionSummary(s, rref, ctx.person.id).entries;
    const fixed = rv.personId, candidates = entries.filter(e => !e.record || e.personId === fixed), suggested = rv.personId || rv.suggestedPersonId || '';
    const decision = ['Present', 'Late'].includes(rv.proposed) ? rv.proposed : '';
    u.modal('Resolve a report row', `<dl class="ac-evidence is-dialog"><div><dt>Report row</dt><dd>${esc(rv.name || '—')}<small>${esc(rv.email || 'no email')}</small></dd></div><div><dt>Joined · left</dt><dd>${esc(`${clock(rv.joinedAt, rref.tz)} · ${clock(rv.leftAt, rref.tz)}`)}</dd></div><div><dt>Minutes</dt><dd>${rv.minutes ?? '—'}</dd></div></dl><p class="ac-muted">${esc(rv.reason)}</p>
      ${fixed ? `<input type="hidden" name="personId" value="${esc(fixed)}"><p>Participant: <strong>${esc(nameOf(s, fixed))}</strong></p>` : candidates.length ? u.select('personId', 'Registered participant', [['', 'Choose who this row belongs to'], ...personOptions(s, candidates)], suggested) : '<p class="ac-muted">No unrecorded participant is left on the roster. Add the participant first, or keep this row as Not Recorded.</p>'}
      <fieldset class="ac-outcomes"><legend>Outcome</legend>${[['Present', 'Present'], ['Late', 'Late'], ['Not Recorded', 'Keep Not Recorded']].map(([v, l]) => `<label><input type="radio" name="decision" value="${v}" ${v === decision ? 'checked' : ''} required><span>${esc(l)}</span></label>`).join('')}</fieldset>
      ${u.area('reason', 'Note (kept in the audit trail)', '', true)}`, v => {
      if (v.decision !== 'Not Recorded' && !v.personId) throw new Error('Choose the registered participant this row belongs to.');
      ctx.run('attendance.review.resolve', {id:rv.id, ...v}, 'Review resolved.'); ctx.render();
    }, 'Resolve');
    return true;
  }
  if (action === 'ac-finalize') {
    const m = sessionSummary(s, ref, ctx.person.id), open = m.entries.filter(e => !e.record && !e.review), inPerson = open.filter(e => e.mode === 'In-person'), online = open.filter(e => e.mode === 'Online');
    const complete = importsFor(s, ref.ss.id).some(x => x.complete);
    u.modal('Finalize attendance', `<p class="ac-muted">Finalizing records Absent only where the evidence is complete. Anything uncertain stays Not Recorded, and corrections remain possible with a reason.</p><ul class="ac-final">
      ${inPerson.length ? `<li>${modeBadge('In-person')}<div><strong>${plural(inPerson.length, 'participant')} without a check-in</strong>${u.checkbox('inPersonCheckInRan', 'QR check-in was available for the whole check-in window', false, 'yes')}<small>Ticked: they are recorded Absent. Unticked: they stay Not Recorded.</small></div></li>` : ''}
      ${online.length ? `<li>${modeBadge('Online')}<div><strong>${plural(online.length, 'participant')} not in a report</strong><small>${complete ? 'A complete report was imported, so they will be recorded Absent.' : 'No complete report was imported, so they stay Not Recorded.'}</small></div></li>` : ''}
      ${m.reviews.length ? `<li>${u.icon('search')}<div><strong>${plural(m.reviews.length, 'row')} in review</strong><small>They stay in review until you resolve them.</small></div></li>` : ''}
      ${!open.length && !m.reviews.length ? `<li>${u.icon('check')}<div><strong>Every participant has an attendance record.</strong></div></li>` : ''}</ul>`, v => {
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
    }).catch(() => u.toast('Camera unavailable. Type or paste the booking code instead.', true));
    return true;
  }
  return false;
}
let scanStream = null;
function stopScan(video) { scanStream?.getTracks().forEach(t => t.stop()); scanStream = null; if (video) video.hidden = true; }

export function centerSubmit(form, ctx) {
  if (form.dataset.form !== 'ac-checkin') return false;
  const method = form.dataset.method === 'qr' ? 'qr' : 'code';
  delete form.dataset.method;
  const status = ctx.run('attendance.checkin', {sessionId:form.dataset.session, code:form.elements.code.value, method}, 'Checked in.');
  u.toast(`Check-in recorded · ${status}`); ctx.render();
  requestAnimationFrame(() => document.querySelector('[data-form=ac-checkin] [name=code]')?.focus());
  return true;
}
export function centerChange(target, ctx) {
  if (target.dataset.action === 'ac-import-file') { loadFile(ctx, target.dataset.session, target.files?.[0]); return true; }
  if (target.dataset.action === 'ac-import-complete') { const st = wizard.get(target.dataset.session); if (st) st.complete = target.checked; return true; }
  return false;
}
/** Bind drag-and-drop on the upload area after each render. */
export function mountCenter(ctx) {
  for (const zone of document.querySelectorAll('[data-drop-import]')) {
    const over = on => e => { e.preventDefault(); zone.classList.toggle('is-over', on); };
    zone.addEventListener('dragenter', over(true));
    zone.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('is-over'); });
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('is-over'); const file = e.dataTransfer.files?.[0]; if (file) loadFile(ctx, zone.dataset.dropImport, file); });
  }
  if (!document.querySelector('.ac-scanner')) stopScan(null);
}
