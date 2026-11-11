/*
 * Representative · Outdoor Activity → Attendance tab: a summary per session
 * with a link to the shared session attendance page.
 *
 * Attendance is recorded in one place: Supervisor → Attendance
 * (pages/supervisor/attendance-center.js). This tab shows the same records
 * through the same read model (attendance/model.js), with no write controls,
 * so the Representative never sees a second check-in path.
 */
import * as u from '../../ui.js';
import {esc, nameOf, emailOf, personCell, fmtDate} from './common.js';
import {sessionRef, sessionSummary, methodLabel} from '../../attendance/model.js';
import {statusChip} from '../supervisor/attendance-center.js';

const stamp = (at, tz = 'Asia/Amman') => at ? new Date(at).toLocaleString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:tz}) : '—';
const chip = ({label, tone}) => `<span class="ac-chip is-${esc(tone)}">${esc(label)}</span>`;

function onDuty(s, e, ss) {
  return s.appointments.filter(a => a.experienceId === e.id && a.status === 'Accepted' && (a.sessionIds || []).includes(ss.id) && s.people.some(p => p.id === a.personId && p.status === 'Active')).map(a => a.personId);
}

function sessionCard(ctx, e, ss) {
  const {s, person:p} = ctx, ref = sessionRef(s, ss.id);
  if (!ref) return '';
  const m = sessionSummary(s, ref, p.id), c = m.counts, duty = onDuty(s, e, ss);
  const staff = duty.length ? chip({label:`Supervisor on duty · ${duty.map(id => nameOf(s, id)).join(', ')}`, tone:'positive'}) : chip({label:'Needs Supervisor', tone:'attention'});
  const rows = m.entries.map(x => {
    const rec = x.record;
    return `<tr><td class="ac-cell-person">${personCell(s, x.personId, esc(emailOf(s, x.personId)))}</td><td class="ac-cell-status" data-label="Attendance">${statusChip(x.status)}</td><td class="ac-stack" data-label="Source">${rec ? esc(methodLabel(rec.method)) : x.review ? `<small>${esc(x.review.reason)}</small>` : '<span class="ac-quiet">No evidence yet</span>'}</td><td data-label="Recorded">${esc(rec ? `${stamp(rec.at || rec.created, ref.tz)} · ${nameOf(s, rec.actorId)}` : '—')}</td></tr>`;
  }).join('');
  const table = m.entries.length
    ? `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(`Attendance · ${ss.title}`)}"><table class="ac-table is-cards"><thead><tr><th scope="col">Participant</th><th scope="col">Attendance</th><th scope="col">Verification source</th><th scope="col">Recorded</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : '<p class="ac-muted">No confirmed bookings for this session yet.</p>';
  return `<section class="ac-source iw-reveal"><div class="ac-source-head"><span class="ac-source-icon">${u.icon('calendar')}</span><div><h3>${esc(ss.title)}</h3><p>${esc(`${fmtDate(ss.date)} · ${ss.time}–${ss.endTime || ss.time} · ${ref.format === 'In-person' ? 'In person' : ref.format}`)}</p></div>${staff}</div>
    <div class="ac-hero-status">${m.sources.map(chip).join('')}${m.finalized ? chip({label:'Finalized', tone:'positive'}) : ''}${u.link('Open attendance', `organization/attendance/${ss.id}`, 'button quiet small')}</div>
    <p class="ac-muted">${esc(`${c.verified} verified (${c.present} present · ${c.late} late) · ${c.notRecorded} not recorded · ${c.review} in review · ${c.absent} absent`)}</p>${table}</section>`;
}

export function renderActivityAttendance(ctx, e) {
  const sessions = ctx.s.experienceSessions.filter(x => x.experienceId === e.id).slice().sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const intro = `<div class="ds-section-head"><div><p class="eyebrow">PRESENCE, CLEARLY RECORDED</p><h2>Attendance</h2></div></div>
    <p class="ac-hint iw-reveal">${u.icon('shield')}Participants check in on the session’s check-in screen, or staff record a reasoned exception. Open a session’s attendance to run the screen or add a participant. Missing evidence stays Not Recorded; it is never counted as Absent on its own.</p>`;
  if (!sessions.length) return intro + '<p class="ac-muted">Add a session to the schedule first. Each check-in belongs to a specific session.</p>';
  return intro + `${sessions.map(ss => sessionCard(ctx, e, ss)).join('')}`;
}
