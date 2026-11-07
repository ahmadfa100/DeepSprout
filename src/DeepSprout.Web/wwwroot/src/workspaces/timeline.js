/**
 * One Operational Timeline for every partner workspace.
 *
 * `timelineEvents(s, scope)` projects events from the ORIGINAL records
 * (resource history, applications, staff grants, sessions, attendance,
 * excuses, tasks, submissions, reviews, reports, bookings, completions,
 * governance decisions). Event IDs are derived from the source record and
 * history index, so the same fact has the same ID in every workspace that may
 * see it — there is no separate timeline store.
 *
 * Three kinds are never mixed: `past` (it happened), `pending` (someone in
 * this scope must act) and `upcoming` (scheduled, not yet happened).
 *
 * Scopes: organization (one Institution), supervisor (active grants and
 * accepted activity appointments), coach (own groups only), admin
 * (governance records only — never participants' private work).
 * Personal Lab, Shield and Recovery records are not in this graph and are
 * never projected.
 */
import {esc, icon, href, date} from './ui.js';
import {clockDay, nowMs} from './domain.js';

const nameOf = (s, pid) => pid === 'system' ? 'DeepSprout' : s.people.find(p => p.id === pid)?.name || 'Someone';
const dayOf = at => !at ? '' : /^\d{4}-\d{2}-\d{2}$/.test(at) ? at : new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Amman'}).format(new Date(at));

/** Category → icon, label. One visual vocabulary everywhere. */
export const CATEGORIES = {
  resource:['sparkle','Resource'], admission:['people','Application'], staff:['nodes','Team'], session:['calendar','Session'],
  attendance:['check','Attendance'], excuse:['mail','Excuse'], task:['form','Task'], review:['edit','Review'], report:['chart','Report'],
  booking:['ticket','Booking'], completion:['flag','Completion'], governance:['shield','Governance']
};

/** Resolve the scope's resources once. */
export function scopeFor(s, role, personId) {
  const org = s.organizations.find(o => o.memberIds.includes(personId));
  if (role === 'organization') {
    const initiativeIds = s.initiatives.filter(i => i.ownerId === org?.id).map(i => i.id);
    return {role, personId, initiativeIds, activityIds:s.experiences.filter(e => e.ownerId === org?.id).map(e => e.id), groupIds:s.groups.filter(g => g.parentType === 'initiative' && initiativeIds.includes(g.initiativeId)).map(g => g.id), institutionId:org?.id};
  }
  if (role === 'supervisor') {
    const initiativeIds = (s.grants || []).filter(g => g.personId === personId && g.role === 'supervisor' && g.status === 'Active').map(g => g.scopeId);
    const appts = (s.appointments || []).filter(a => a.personId === personId && a.status === 'Accepted');
    return {role, personId, initiativeIds, activityIds:appts.map(a => a.experienceId), sessionIds:appts.flatMap(a => a.sessionIds), groupIds:s.groups.filter(g => g.parentType === 'initiative' && initiativeIds.includes(g.initiativeId)).map(g => g.id)};
  }
  if (role === 'mentor') {
    const groupIds = s.groups.filter(g => (g.parentType === 'initiative' ? g.coachId === personId && (s.grants || []).some(x => x.personId === personId && x.role === 'coach' && x.status === 'Active' && x.scopeId === g.initiativeId) : g.ownerId === personId)).map(g => g.id);
    return {role, personId, groupIds, initiativeIds:[], activityIds:[], coachInitiativeIds:[...new Set(s.groups.filter(g => groupIds.includes(g.id) && g.initiativeId).map(g => g.initiativeId))]};
  }
  return {role:'admin', personId, initiativeIds:s.initiatives.map(i => i.id), activityIds:s.experiences.map(e => e.id)};
}

export function timelineEvents(s, scope) {
  const out = [], push = e => out.push({when:'past', ...e});
  const day = clockDay(s), now = nowMs(s);
  const inI = id => (scope.initiativeIds || []).includes(id), inA = id => (scope.activityIds || []).includes(id), inG = id => (scope.groupIds || []).includes(id);
  const iTitle = id => s.initiatives.find(i => i.id === id)?.title || 'Initiative';
  const aTitle = id => s.experiences.find(e => e.id === id)?.title || 'Outdoor Activity';
  const orgPath = scope.role === 'organization', supPath = scope.role === 'supervisor';
  const governance = scope.role === 'admin';

  /* Initiatives — resource lifecycle (all roles that see the resource; admin sees governance changes) */
  for (const i of s.initiatives.filter(i => inI(i.id))) (i.history || []).forEach((h, n) => {
    if (governance && !/Published|Suspend|Cancel|Archiv|Restor|Unpublish|Complet/i.test(h.change || '')) return;
    push({id:`initiative:${i.id}:h${n}`, at:h.at, category:governance && /Suspend|Unpublish|Restor/i.test(h.change) ? 'governance' : 'resource', actor:h.actorId, title:`${h.change || 'Updated'} · ${i.title}`, text:h.reason || '', status:/Published/.test(h.change) ? 'Published' : /Cancel/.test(h.change) ? 'Cancelled' : '', link:orgPath ? `organization/initiatives/${i.id}` : governance ? `admin/initiatives` : ''});
  });
  /* Outdoor Activities — lifecycle */
  for (const e of s.experiences.filter(e => inA(e.id))) {
    if (e.publishedAt && !(e.history || []).some(h => /Published/.test(h.change))) push({id:`activity:${e.id}:published`, at:e.publishedAt, category:'resource', actor:'system', title:`Published · ${e.title}`, status:'Published', link:orgPath ? `organization/activities/${e.id}` : ''});
    (e.history || []).forEach((h, n) => {
      if (governance && !/Published|Suspend|Cancel|Archiv|Restor|Unpublish|Complet|Ownership/i.test(h.change || '')) return;
      push({id:`activity:${e.id}:h${n}`, at:h.at, category:/Suspend|Unpublish|Ownership/i.test(h.change) ? 'governance' : 'resource', actor:h.actorId, title:`${h.change} · ${e.title}`, text:h.reason || '', status:/Published/.test(h.change) ? 'Published' : /Cancel|Archiv/.test(h.change) ? 'Archived' : '', link:orgPath ? `organization/activities/${e.id}?tab=history` : governance ? 'admin/activities' : ''});
    });
  }
  if (!governance) {
    /* Applications (Initiative admission) */
    const appLabel = {Pending:'applied', Accepted:'was admitted', Rejected:'was not admitted', Queued:'joined the waiting list', Offered:'was offered a seat', Withdrawn:'withdrew', Suspended:'was suspended', Removed:'was removed', Completed:'completed the initiative', Declined:'declined a seat', Expired:'let a seat offer expire'};
    for (const a of (s.admissions || []).filter(a => inI(a.initiativeId) && scope.role !== 'mentor')) {
      (a.history || []).forEach((h, n) => push({id:`admission:${a.id}:h${n}`, at:h.at, category:'admission', actor:h.actorId, subject:a.personId, title:`${nameOf(s, a.personId)} ${appLabel[h.to] || `→ ${h.to}`}`, text:`${iTitle(a.initiativeId)}${h.reason && h.reason !== 'Application submitted' && !/^Migrated/.test(h.reason) ? ` · ${h.reason}` : ''}`, status:h.to, link:orgPath ? `organization/participants?initiative=${a.initiativeId}` : supPath ? `supervisor/applications?initiative=${a.initiativeId}` : ''}));
      if (a.status === 'Pending') push({id:`admission:${a.id}:pending`, when:'pending', at:a.created, category:'admission', subject:a.personId, title:`Review ${nameOf(s, a.personId)}’s application`, text:`${iTitle(a.initiativeId)} · ${a.code || ''}`, status:'Pending', link:orgPath ? `organization/participants?initiative=${a.initiativeId}&status=pending` : `supervisor/applications?initiative=${a.initiativeId}`});
    }
    /* Staff appointments and invitations */
    for (const g of (s.grants || []).filter(g => inI(g.scopeId) && (scope.role !== 'mentor'))) (g.history || []).forEach((h, n) => push({id:`grant:${g.id}:h${n}`, at:h.at, category:'staff', actor:h.actorId, subject:g.personId, title:`${nameOf(s, g.personId)} · ${g.role === 'coach' ? 'Coach' : 'Supervisor'} ${/accept/i.test(h.change) ? 'joined' : /revok/i.test(h.change) ? 'access revoked' : h.change.toLowerCase()}`, text:iTitle(g.scopeId), status:/accept/i.test(h.change) ? 'Active' : /revok/i.test(h.change) ? 'Revoked' : '', link:orgPath ? `organization/team?initiative=${g.scopeId}` : ''}));
    if (orgPath) for (const inv of (s.staffInvites || []).filter(x => inI(x.initiativeId) && x.status === 'Pending')) push({id:`invite:${inv.id}:pending`, when:'pending', at:inv.created, category:'staff', title:`Invitation awaiting ${inv.name || inv.email}`, text:`${inv.role === 'coach' ? 'Coach' : 'Supervisor'} · ${iTitle(inv.initiativeId)} · expires ${date(inv.expires)} · grants nothing until accepted`, status:'Invited', link:`organization/team?initiative=${inv.initiativeId}`});
    for (const ap of (s.appointments || []).filter(a => inA(a.experienceId) && scope.role === 'organization')) (ap.history || []).forEach((h, n) => push({id:`appointment:${ap.id}:h${n}`, at:h.at, category:'staff', actor:h.actorId, subject:ap.personId, title:`${ap.personId ? nameOf(s, ap.personId) : ap.email} · Supervisor ${/accept/i.test(h.change) ? 'appointment accepted' : h.change.toLowerCase()}`, text:aTitle(ap.experienceId), status:/accept/i.test(h.change) ? 'Active' : /revok/i.test(h.change) ? 'Revoked' : '', link:`organization/activities/${ap.experienceId}?tab=staff`}));
    /* Sessions: history (reschedules, cancellations) and upcoming schedule */
    const sessionsInScope = scope.role === 'mentor' ? s.sessions.filter(x => (scope.coachInitiativeIds || []).includes(x.initiativeId)) : s.sessions.filter(x => inI(x.initiativeId));
    for (const ss of sessionsInScope) {
      (ss.history || []).forEach((h, n) => { if (/Created from/.test(h.change || '')) return; push({id:`session:${ss.id}:h${n}`, at:h.at, category:'session', actor:h.actorId, title:`${h.change} · ${ss.title}`, text:h.reason || '', link:orgPath ? `organization/sessions/${ss.id}` : ''}); });
      if (ss.status === 'Published' && ss.date >= day) push({id:`session:${ss.id}:scheduled`, when:'upcoming', at:`${ss.date}T${ss.time || '09:00'}:00+03:00`, category:'session', title:ss.title, text:`${iTitle(ss.initiativeId)} · ${ss.time}–${ss.endTime} · ${ss.format || ''}`, status:(ss.attendanceRequired && !(ss.supervisorIds || []).length && orgPath) ? 'Needs Supervisor' : 'Upcoming', link:orgPath ? `organization/sessions/${ss.id}` : supPath ? `supervisor/attendance?initiative=${ss.initiativeId}` : ''});
    }
    for (const ss of s.experienceSessions.filter(x => inA(x.experienceId) && (!scope.sessionIds || scope.sessionIds.includes(x.id)))) {
      const e = s.experiences.find(x => x.id === ss.experienceId);
      if (['Published','Active'].includes(e?.status) && ss.date >= day) push({id:`activity-session:${ss.id}:scheduled`, when:'upcoming', at:`${ss.date}T${ss.time || '09:00'}:00+03:00`, category:'session', title:ss.title, text:`${e.title} · ${ss.time}–${ss.endTime} · ${ss.venue || e.venue || ''}`, status:s.appointments.some(a => a.experienceId === e.id && a.status === 'Accepted' && a.sessionIds.includes(ss.id)) ? 'Upcoming' : 'Needs Supervisor', link:orgPath ? `organization/activities/${e.id}?tab=schedule` : `supervisor/attendance?resource=${e.id}&session=${ss.id}`});
    }
    /* Attendance — one event per session and recorder per day (counts, not names) */
    if (scope.role !== 'mentor') {
      const batches = new Map();
      for (const a of (s.sessionAttendance || []).filter(a => inI(a.initiativeId))) { const k = `ia:${a.sessionId}:${a.actorId}:${dayOf(a.at)}`; const b = batches.get(k) || {at:a.at, sessionId:a.sessionId, actorId:a.actorId, list:[], kind:'initiative'}; b.list.push(a); if (a.at > b.at) b.at = a.at; batches.set(k, b); }
      for (const a of (s.attendance || []).filter(a => inA(a.experienceId))) { const k = `oa:${a.sessionId}:${a.actorId}:${dayOf(a.created)}`; const b = batches.get(k) || {at:a.created, sessionId:a.sessionId, actorId:a.actorId, list:[], kind:'activity', experienceId:a.experienceId}; b.list.push(a); if (a.created > b.at) b.at = a.created; batches.set(k, b); }
      for (const [k, b] of batches) {
        const title = b.kind === 'initiative' ? s.sessions.find(x => x.id === b.sessionId)?.title : s.experienceSessions.find(x => x.id === b.sessionId)?.title;
        const present = b.list.filter(x => ['Present','Late'].includes(x.status)).length, absent = b.list.filter(x => x.status === 'Absent').length;
        push({id:`attendance:${k}`, at:b.at, category:'attendance', actor:b.actorId, title:`Attendance recorded · ${title || 'Session'}`, text:`${present} present or late · ${absent} absent · recorded by ${nameOf(s, b.actorId)}`, link:orgPath ? (b.kind === 'activity' ? `organization/activities/${b.experienceId}?tab=attendance&session=${b.sessionId}` : 'organization/attendance') : ''});
      }
      /* Excuses: student → Supervisor recommends → Representative decides */
      for (const x of (s.excuses || []).filter(x => inI(x.initiativeId))) {
        (x.history || []).forEach((h, n) => push({id:`excuse:${x.id}:h${n}`, at:h.at, category:'excuse', actor:h.actorId, subject:x.personId, title:`Excuse ${String(h.change).toLowerCase()} · ${nameOf(s, x.personId)}`, text:`${s.sessions.find(ss => ss.id === x.sessionId)?.title || 'Session'} · attendance stays factual`, status:h.change, link:orgPath ? 'organization/attendance' : supPath ? 'supervisor/excuses' : ''}));
        if (x.status === 'Submitted' && supPath) push({id:`excuse:${x.id}:pending-sup`, when:'pending', at:x.created, category:'excuse', subject:x.personId, title:`Recommend on ${nameOf(s, x.personId)}’s excuse`, text:s.sessions.find(ss => ss.id === x.sessionId)?.title || '', status:'Pending', link:'supervisor/excuses'});
        if (x.status === 'Recommended' && orgPath) push({id:`excuse:${x.id}:pending-rep`, when:'pending', at:x.created, category:'excuse', subject:x.personId, title:`Decide ${nameOf(s, x.personId)}’s excuse`, text:`Supervisor recommended · ${s.sessions.find(ss => ss.id === x.sessionId)?.title || ''}`, status:'Recommended', link:'organization/attendance'});
      }
      /* Bookings and completions for Outdoor Activities */
      for (const b of s.bookings.filter(b => inA(b.experienceId) && orgPath)) {
        const hist = b.history || [];
        if (!hist.length) push({id:`booking:${b.id}:created`, at:b.created, category:'booking', subject:b.personId, title:`${nameOf(s, b.personId)} booked · ${aTitle(b.experienceId)}`, status:b.status === 'Waitlisted' ? 'Waitlisted' : 'Confirmed', link:`organization/activities/${b.experienceId}?tab=bookings`});
        hist.forEach((h, n) => push({id:`booking:${b.id}:h${n}`, at:h.at, category:'booking', actor:h.actorId, subject:b.personId, title:`${nameOf(s, b.personId)} · ${h.change || h.to} · ${aTitle(b.experienceId)}`, text:h.reason || '', status:h.to || h.change, link:`organization/activities/${b.experienceId}?tab=bookings`}));
        if (b.status === 'Pending Approval') push({id:`booking:${b.id}:pending`, when:'pending', at:b.created, category:'booking', subject:b.personId, title:`Approve ${nameOf(s, b.personId)}’s booking`, text:aTitle(b.experienceId), status:'Pending Approval', link:`organization/activities/${b.experienceId}?tab=bookings`});
      }
      for (const c of (s.providerCompletions || []).filter(c => inA(c.experienceId))) (c.history || []).forEach((h, n) => { if (!h.at) return; push({id:`completion:${c.id}:h${n}`, at:h.at, category:'completion', actor:h.actorId, subject:c.personId, title:`Completion ${String(h.to).toLowerCase()} · ${nameOf(s, c.personId)}`, text:aTitle(c.experienceId), status:h.to, link:orgPath ? `organization/activities/${c.experienceId}?tab=completion` : 'supervisor/evaluations'}); });
    }
    /* Tasks, submissions, reviews — only inside the scope's groups */
    const groupScope = scope.role === 'mentor' ? scope.groupIds : (scope.groupIds || []);
    for (const a of s.assignments.filter(a => groupScope.includes(a.groupId))) {
      const g = s.groups.find(x => x.id === a.groupId), path = scope.role === 'mentor' ? `mentor/assignments` : orgPath ? `organization/team?tab=groups&initiative=${a.initiativeId}` : '';
      if (a.created) push({id:`assignment:${a.id}:created`, at:a.created, category:'task', actor:a.ownerId, title:`Task assigned · ${a.title}`, text:`${g?.name || 'Group'} · due ${date(a.due)}`, link:path});
      if (a.status === 'Active' && a.due && a.due >= day) push({id:`assignment:${a.id}:due`, when:'upcoming', at:`${a.due}T23:59:00+03:00`, category:'task', title:`Due · ${a.title}`, text:g?.name || '', status:'Upcoming', link:path});
      for (const sub of s.submissions.filter(x => x.assignmentId === a.id)) {
        const subPath = scope.role === 'mentor' ? `mentor/reviews` : path;
        push({id:`submission:${sub.id}:a${sub.attempt || 1}`, at:sub.submitted, category:'task', actor:sub.studentId, subject:sub.studentId, title:`${nameOf(s, sub.studentId)} submitted${(sub.attempt || 1) > 1 ? ` attempt ${sub.attempt}` : ''} · ${a.title}`, status:'Submitted', link:subPath});
        (sub.history || []).forEach((h, n) => { if (h.decision) push({id:`submission:${sub.id}:r${n}`, at:h.created, category:'review', actor:h.actorId, subject:sub.studentId, title:`${h.decision} · ${nameOf(s, sub.studentId)} · ${a.title}`, text:scope.role === 'mentor' ? (h.feedback || '') : '', status:h.decision, link:subPath}); });
        if (sub.status === 'Submitted' && scope.role === 'mentor') push({id:`submission:${sub.id}:pending`, when:'pending', at:sub.submitted, category:'review', subject:sub.studentId, title:`Review ${nameOf(s, sub.studentId)}’s work`, text:`${a.title} · attempt ${sub.attempt || 1}`, status:'Submitted', link:`mentor/reviews`});
      }
    }
    /* Coach reports and Supervisor summaries */
    for (const r of (s.coachReports || []).filter(r => r.status === 'Submitted' && (scope.role === 'mentor' ? r.authorId === scope.personId : inI(r.initiativeId)))) push({id:`coach-report:${r.id}`, at:r.submitted, category:'report', actor:r.authorId, title:`Coach report submitted · ${s.groups.find(g => g.id === r.groupId)?.name || 'Group'}`, text:`${date(r.period?.from)} – ${date(r.period?.to)}`, status:'Submitted report', link:scope.role === 'mentor' ? 'mentor/reports' : orgPath ? 'organization/reports' : 'supervisor/reports'});
    for (const r of (s.supervisorSummaries || []).filter(r => inI(r.initiativeId) && scope.role !== 'mentor')) push({id:`supervisor-summary:${r.id}`, at:r.submitted, category:'report', actor:r.authorId, title:`Supervisor summary submitted · ${iTitle(r.initiativeId)}`, text:`${date(r.period?.from)} – ${date(r.period?.to)}`, status:'Submitted report', link:orgPath ? 'organization/reports' : 'supervisor/reports'});
    for (const r of (s.closingReports || []).filter(r => inA(r.experienceId) && scope.role !== 'mentor')) push({id:`closing-report:${r.id}`, at:r.created, category:'report', actor:r.supervisorId, title:`Closing report · ${aTitle(r.experienceId)}`, status:'Submitted report', link:orgPath ? `organization/activities/${r.experienceId}?tab=reports` : 'supervisor/reports'});
  } else {
    /* Governance: Institution verification, account and moderation decisions */
    for (const a of s.applications.filter(a => a.type === 'organization')) {
      push({id:`application:${a.id}:submitted`, at:a.submitted, category:'governance', title:`Institution application · ${a.name}`, text:`Representative ${a.details?.representative || nameOf(s, a.personId)}`, status:'Submitted', link:`admin/organizations`});
      (a.history || a.decisions || []).forEach((h, n) => push({id:`application:${a.id}:h${n}`, at:h.at || h.created, category:'governance', actor:h.actorId, title:`${h.to || h.status || h.change} · ${a.name}`, text:h.reason || '', status:h.to || h.status || '', link:'admin/organizations'}));
      if (['Submitted','Pending Verification'].includes(a.status)) push({id:`application:${a.id}:pending`, when:'pending', at:a.updated || a.submitted, category:'governance', title:`Verify ${a.name}`, text:'Institution and Representative authority', status:'Pending', link:'admin/organizations'});
    }
    for (const m of (s.moderation || []).filter(m => m.status === 'Open')) push({id:`moderation:${m.id}:pending`, when:'pending', at:m.created || '', category:'governance', title:`Moderate reported ${String(m.type || 'post').toLowerCase()}`, text:m.reason || '', status:'Pending', link:'admin/moderation'});
    for (const x of (s.audit || []).filter(x => /^admin\./.test(x.action || '')).slice(0, 60)) push({id:`audit:${x.id}`, at:x.created, category:'governance', actor:x.actorId, title:humanAction(x.action), text:`${x.resource || ''}${x.reason ? ` · ${x.reason}` : ''}`, link:''});
  }
  // Pending first by age, upcoming by date, past newest first. Drop undated past events rather than guess.
  return {
    pending:out.filter(e => e.when === 'pending').sort((a, b) => String(a.at).localeCompare(String(b.at))),
    upcoming:out.filter(e => e.when === 'upcoming' && Date.parse(e.at) >= now - 3600000).sort((a, b) => String(a.at).localeCompare(String(b.at))),
    past:out.filter(e => e.when === 'past' && e.at && Date.parse(e.at) <= now + 60000).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  };
}
const humanAction = action => String(action).replace(/^admin\./, '').split('.').map((w, i) => i ? w : w[0].toUpperCase() + w.slice(1)).join(' ');

const timeOf = at => String(at).includes('T') ? new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Amman', hour:'2-digit', minute:'2-digit'}).format(new Date(at)) : '';
const dayLabel = (at, today) => { const d = dayOf(at); if (d === today) return 'Today'; const y = new Date(Date.parse(`${today}T12:00:00+03:00`) - 86400000); if (d === dayOf(y.toISOString())) return 'Yesterday'; return new Intl.DateTimeFormat('en-GB', {weekday:'short', day:'numeric', month:'short', timeZone:'Asia/Amman'}).format(new Date(`${d}T12:00:00+03:00`)); };
const tone = status => /Accept|Admitted|Active|Published|Approved|Complet|Present|Confirmed|Recommended|Submitted report/i.test(status || '') ? 'positive' : /Reject|Revok|Cancel|Absent|Expired|Declin|Needs Supervisor|Remov|Suspend|Archiv|Withdraw/i.test(status || '') ? 'critical' : status ? 'attention' : 'neutral';

function item(s, e, today, {compact}) {
  const [glyph, label] = CATEGORIES[e.category] || ['leaf', 'Update'];
  const t = e.when === 'past' ? timeOf(e.at) : e.when === 'upcoming' ? `${dayLabel(e.at, today)}${timeOf(e.at) && !/23:59/.test(e.at) ? ` · ${timeOf(e.at)}` : ''}` : e.at ? `waiting since ${date(e.at)}` : 'waiting';
  const details = !compact && (e.text || e.actor || e.link);
  const head = `<span class="tl-node is-${e.category}" aria-hidden="true">${icon(glyph)}</span><div class="tl-body"><div class="tl-meta"><span class="tl-kind">${esc(label)}</span>${t ? `<time datetime="${esc(e.at)}">${esc(t)}</time>` : ''}</div><p class="tl-title">${esc(e.title)}</p>${e.status ? `<span class="ds-chip is-${tone(e.status)}"><i aria-hidden="true"></i>${esc(e.status)}</span>` : ''}</div>`;
  if (!details) return `<li class="tl-item is-${e.when}" data-event-id="${esc(e.id)}">${e.link ? `<a class="tl-row" href="${href(e.link)}">${head}</a>` : `<div class="tl-row">${head}</div>`}</li>`;
  return `<li class="tl-item is-${e.when}" data-event-id="${esc(e.id)}"><details class="tl-row"><summary>${head}</summary><div class="tl-detail">${e.text ? `<p>${esc(e.text)}</p>` : ''}<dl>${e.actor ? `<div><dt>By</dt><dd>${esc(nameOf(s, e.actor))}</dd></div>` : ''}<div><dt>${e.when === 'past' ? 'Recorded' : e.when === 'upcoming' ? 'Scheduled' : 'Since'}</dt><dd>${esc(date(e.at))}${timeOf(e.at) && !/23:59/.test(e.at) ? ` · ${esc(timeOf(e.at))}` : ''}</dd></div><div><dt>Source</dt><dd><code>${esc(e.id.split(':').slice(0, 2).join(':'))}</code></dd></div></dl>${e.link ? `<a class="text-link" href="${href(e.link)}">Open the source record</a>` : ''}</div></details></li>`;
}

/**
 * Render the shared timeline. `lanes` picks which kinds appear; `limit` caps
 * history (with a count of what is hidden). Past events are grouped by day.
 */
export function renderTimeline(s, data, {lanes = ['pending','upcoming','past'], limit = 10, compact = false, headers = true, emptyText = 'Activity will appear here as records change.'} = {}) {
  const today = clockDay(s);
  const lane = (key, title, list, note) => !list.length ? '' : `<section class="tl-lane is-${key}">${headers ? `<header><h3>${title}</h3><span class="ds-count">${list.length}</span>${note ? `<small>${note}</small>` : ''}</header>` : ''}<ol class="tl-list">${list.map(e => item(s, e, today, {compact})).join('')}</ol></section>`;
  const pending = lanes.includes('pending') ? lane('pending', 'Needs action', data.pending.slice(0, 6), data.pending.length > 6 ? `+${data.pending.length - 6} more in their queues` : '') : '';
  const upcoming = lanes.includes('upcoming') ? lane('upcoming', 'Coming up', data.upcoming.slice(0, 5), 'Scheduled · not yet happened') : '';
  let history = '';
  if (lanes.includes('past') && data.past.length) {
    const shown = data.past.slice(0, limit), days = new Map();
    for (const e of shown) { const d = dayOf(e.at); if (!days.has(d)) days.set(d, []); days.get(d).push(e); }
    history = `<section class="tl-lane is-past"><header><h3>History</h3><span class="ds-count">${data.past.length}</span><small>Recorded facts · newest first · Asia/Amman</small></header>${[...days].map(([d, list]) => `<div class="tl-day"><p class="tl-day-label">${esc(dayLabel(d, today))}</p><ol class="tl-list">${list.map(e => item(s, e, today, {compact})).join('')}</ol></div>`).join('')}${data.past.length > limit ? `<p class="tl-more">${data.past.length - limit} earlier event${data.past.length - limit === 1 ? '' : 's'} not shown.</p>` : ''}</section>`;
  }
  const body = pending + upcoming + history;
  return `<div class="tl ${compact ? 'is-compact' : ''}">${body || `<p class="ds-chart-empty">${icon('history')}${esc(emptyText)}</p>`}</div>`;
}
