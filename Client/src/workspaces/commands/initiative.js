/**
 * Connected Institution Initiative operations (schema 2).
 *
 * Every handler names the authority it requires and checks it here, in the
 * command — never only by hiding a button. One original record per action:
 * Application (`admissions`), staff grant, Initiative group, session
 * registration, factual attendance, excuse, Coach report and Supervisor
 * summary. Reports, Explore cards and Gardens are derived from these.
 */
import {institutionApproved,id,now,nowMs,clockISO,requireThat,find,textRequired,numberIn,notify} from '../domain.js';
import {displayCode,bookingCode} from '../migrate.js';
import {MAX_SUPERVISORS,SEATED,REAPPLY_BLOCKED,seatCap,seatsUsed,queue,activeGrantsFor,isActiveSupervisor,isActiveCoach,isRepresentative,representativesOf,registrationState,sessionRegistrationOpen,modeCapacity,confirmedInMode,assignedActiveSupervisors,today} from '../initiative-rules.js';
import {startTask,submitTask} from './mentorship.js';
import {respondToForm,enterCompetition} from './institution.js';
import {assertWindow,checkInWindow,initiativeOfResource,canViewExcuseEvidence,ATTACHMENT_RULES} from '../initiative-rules.js';

const HOUR = 3600000;
const LIVE = ['Published'];
const CLOSED_INITIATIVE = ['Cancelled','Archived','Suspended','Completed'];

/* ------------------------------------------------------------ helpers */

const initiativeOf = (s, key) => find(s.initiatives, key);
const personOf = (s, key) => find(s.people, key);
function requireRep(s, initiative, actor) { requireThat(isRepresentative(s, initiative, actor), 'Only the Institution Representative can do this.'); }
function requireRepOrSupervisor(s, initiative, actor) {
  requireThat(isRepresentative(s, initiative, actor) || isActiveSupervisor(s, initiative.id, actor), 'Only the Representative or an active Supervisor of this initiative can do this.');
}
function requireOperational(initiative, s) { requireThat(institutionApproved(s,initiative.ownerId),'The Institution is not active.'); requireThat(!CLOSED_INITIATIVE.includes(initiative.status), `This initiative is ${initiative.status.toLowerCase()}; new operational actions are disabled.`); }
function history(record, actor, from, to, reason = '') { (record.history ||= []).push({at:now(), actorId:actor, from, to, reason}); record.updated = now(); }
const staffAndRep = (s, initiative) => [...new Set([...representativesOf(s, initiative), ...activeGrantsFor(s, initiative.id, 'supervisor').map(g => g.personId)])];
function noticeAll(s, ids, text, link) { for (const pid of new Set(ids)) notify(s, pid, text, link); }
const memberLink = 'src/pages/member/explore/explore.html#my-initiatives';

/** Move the next eligible queued applicant to a held Offer while seats allow. */
export function offerNextSeat(s, initiative) {
  if (!institutionApproved(s,initiative.ownerId) || registrationState(s,initiative)!=='Open' || !initiative.policies?.waitlist || initiative.status !== 'Published') return;
  while (seatsUsed(s, initiative.id) < seatCap(initiative)) {
    const next = queue(s, initiative.id)[0];
    if (!next) return;
    const hours = Number(initiative.policies.offerHours || s.settings.initiativeOfferHours || 24);
    next.offer = {id:id('offer'), created:clockISO(s), expires:new Date(nowMs(s) + hours * HOUR).toISOString(), hours, status:'Offered'};
    history(next, 'system', 'Queued', 'Offered', `Seat offered · held for ${hours} hours`);
    next.status = 'Offered';
    notify(s, next.personId, `A seat opened in ${initiative.title}. Accept within ${hours} hours to keep it.`, memberLink, 'offer');
  }
}
/** Reconcile expired offers on read (demo clock aware), then re-offer. */
export function expireInitiativeOffers(s) {
  let changed = false;
  for (const a of (s.admissions || []).filter(x => x.status === 'Offered' && Date.parse(x.offer?.expires || 0) <= nowMs(s))) {
    a.status = 'Expired'; a.offer.status = 'Expired'; history(a, 'system', 'Offered', 'Expired', 'Offer was not accepted in time');
    notify(s, a.personId, 'Your offered seat expired and was released to the next person on the waiting list.', memberLink, 'offer');
    const initiative = s.initiatives.find(i => i.id === a.initiativeId);
    if (initiative) offerNextSeat(s, initiative);
    changed = true;
  }
  return changed;
}

function eligibleAge(initiative, age) {
  const n = Number(age);
  requireThat(Number.isFinite(n) && n > 0, 'Enter your age to confirm eligibility.');
  requireThat(n >= Number(initiative.minAge || 0) && (!initiative.maxAge || n <= Number(initiative.maxAge)), `This initiative is for ages ${initiative.minAge || 0}–${initiative.maxAge || 'any'}.`);
  return n;
}
function removeFromGroups(s, initiativeId, personId, actor, action) {
  for (const g of s.groups.filter(x => x.parentType === 'initiative' && x.initiativeId === initiativeId && x.memberIds.includes(personId))) {
    for(const a of s.assignments.filter(a=>a.groupId===g.id&&(!a.studentId||a.studentId===personId)))a.recipientIds=[...new Set([...(a.recipientIds||[]),personId])];
    g.memberIds = g.memberIds.filter(x => x !== personId);
    (g.memberHistory ||= []).push({personId, action, at:now(), actorId:actor});
  }
}

/* ----------------------------------------------------------- handlers */

export function initiativeCommand(s, action, p, actor) {
  /* ---- Applications: one original record seen by Individual, Rep and Supervisor */
  if (action === 'member.application.submit' || action === 'participant.enroll') {
    const initiative = initiativeOf(s, p.initiativeId);
    requireThat(registrationState(s, initiative) === 'Open', 'Applications are not open for this initiative.');
    requireThat(p.consent, 'Confirm the participation terms and consent before applying.');
    requireThat(!(s.initiativeBlocks || []).some(b => b.initiativeId === initiative.id && b.personId === actor && b.active !== false), 'You cannot apply to this initiative. Contact the institution for details.');
    const age = eligibleAge(initiative, p.age);
    const existing = s.admissions.find(a => a.initiativeId === initiative.id && a.personId === actor && REAPPLY_BLOCKED.includes(a.status));
    requireThat(!existing, existing ? `You already have an application (${existing.code} · ${existing.status}).` : '');
    const modes = initiative.modes || [];
    const mode = p.mode && modes.includes(p.mode) ? p.mode : initiative.primaryMode || modes[0] || 'Online';
    const record = {id:id('adm'), initiativeId:initiative.id, personId:actor, status:'Pending', answers:{age, motivation:String(p.motivation || '').trim()}, consent:{text:initiative.consent || '', version:initiative.version || 1, at:now()}, mode, groupId:null, created:now(), updated:now(), history:[]};
    record.code = displayCode('APP', record.id);
    history(record, actor, null, 'Pending', 'Application submitted');
    s.admissions.push(record);
    const full = seatsUsed(s, initiative.id) >= seatCap(initiative);
    noticeAll(s, staffAndRep(s, initiative), `New application ${record.code} for ${initiative.title}${full ? ' · seats are currently full' : ''}.`, `workspaces.html#/organization/participants?initiative=${initiative.id}`);
    notify(s, actor, `Application ${record.code} received for ${initiative.title}. It is pending review.`, memberLink);
    return record.id;
  }
  if (action === 'initiative.application.approve') {
    const a = find(s.admissions, p.id), initiative = initiativeOf(s, a.initiativeId);
    requireRepOrSupervisor(s, initiative, actor);
    requireThat(a.status !== 'Accepted', 'This application has already been approved. No second seat was used.');
    requireThat(a.status === 'Pending', `Only a pending application can be approved (current: ${a.status}).`);
    requireOperational(initiative, s);
    eligibleAge(initiative, a.answers?.age);
    if (seatsUsed(s, initiative.id) >= seatCap(initiative)) {
      requireThat(initiative.policies?.waitlist, `All ${seatCap(initiative)} seats are taken and the waiting list is off.`);
      a.queuedAt = now(); history(a, actor, 'Pending', 'Queued', 'Eligible · all seats taken'); a.status = 'Queued';
      notify(s, a.personId, `Your application ${a.code} is eligible. All seats are taken, so you are on the waiting list.`, memberLink);
      return 'Queued';
    }
    history(a, actor, 'Pending', 'Accepted', p.reason || 'Eligible · seat available'); a.status = 'Accepted'; a.decidedBy = actor;
    for (const f of (a.flags || []).filter(x => !x.resolved)) Object.assign(f, {resolved:true, resolvedBy:actor, resolvedAt:now(), resolution:'Application approved'});
    notify(s, a.personId, `You were accepted into ${initiative.title}.`, memberLink);
    return 'Accepted';
  }
  if (action === 'initiative.application.reject') {
    const a = find(s.admissions, p.id), initiative = initiativeOf(s, a.initiativeId);
    requireRep(s, initiative, actor);
    requireThat(['Pending','Queued'].includes(a.status), 'Only a pending or queued application can be rejected.');
    const reason = textRequired(p.reason, 'Reason');
    history(a, actor, a.status, 'Rejected', reason); a.status = 'Rejected';
    for (const f of (a.flags || []).filter(x => !x.resolved)) Object.assign(f, {resolved:true, resolvedBy:actor, resolvedAt:now(), resolution:'Application rejected'});
    notify(s, a.personId, `Your application ${a.code} to ${initiative.title} was not accepted. Reason: ${reason}`, memberLink);
    return;
  }
  if (['initiative.participant.suspend','initiative.participant.restore','initiative.participant.remove','initiative.participant.block'].includes(action)) {
    const a = find(s.admissions, p.id), initiative = initiativeOf(s, a.initiativeId), kind = action.split('.').at(-1);
    requireRep(s, initiative, actor);
    const reason = textRequired(p.reason, 'Reason');
    const allowed = {suspend:['Accepted'], restore:['Suspended'], remove:['Accepted','Suspended'], block:['Pending','Queued','Offered','Accepted','Suspended','Rejected','Withdrawn','Removed','Declined','Expired']}[kind];
    requireThat(allowed.includes(a.status), `This action is not available for a ${a.status.toLowerCase()} participant.`);
    const to = {suspend:'Suspended', restore:'Accepted', remove:'Removed', block:'Blocked'}[kind];
    const wasSeated = SEATED.includes(a.status) || a.status === 'Offered';
    history(a, actor, a.status, to, reason); a.status = to;
    if (kind === 'block') (s.initiativeBlocks ||= []).push({id:id('block'), initiativeId:initiative.id, personId:a.personId, reason, actorId:actor, at:now(), active:true});
    if (['remove','block'].includes(kind)) { removeFromGroups(s, initiative.id, a.personId, actor, kind === 'block' ? 'Blocked' : 'Removed'); a.groupId = null; }
    const verb = {suspend:'suspended', restore:'restored', remove:'removed', block:'blocked from reapplying'}[kind];
    notify(s, a.personId, `Your participation in ${initiative.title} was ${verb}. Reason: ${reason}`, memberLink);
    if (wasSeated && !SEATED.includes(to)) offerNextSeat(s, initiative);
    return;
  }
  if (action === 'member.application.withdraw') {
    const a = find(s.admissions, p.id), initiative = initiativeOf(s, a.initiativeId);
    requireThat(a.personId === actor, 'This application belongs to someone else.');
    requireThat(['Pending','Queued','Offered','Accepted','Suspended'].includes(a.status), 'There is no active participation to withdraw.');
    const wasSeated = SEATED.includes(a.status) || a.status === 'Offered';
    history(a, actor, a.status, 'Withdrawn', p.reason || 'Withdrawn by the student'); a.status = 'Withdrawn';
    removeFromGroups(s, initiative.id, actor, actor, 'Withdrew'); a.groupId = null;
    noticeAll(s, staffAndRep(s, initiative), `${personOf(s, actor).name} withdrew from ${initiative.title} (${a.code}).`, `workspaces.html#/organization/participants?initiative=${initiative.id}`);
    if (wasSeated) offerNextSeat(s, initiative);
    return;
  }
  if (action === 'member.offer.accept' || action === 'member.offer.decline') {
    const a = find(s.admissions, p.id), initiative = initiativeOf(s, a.initiativeId);
    requireThat(a.personId === actor, 'This offer belongs to someone else.');
    requireThat(a.status === 'Offered', a.status === 'Expired' ? 'This offer has expired. The seat was released.' : 'There is no open seat offer.');
    requireThat(Date.parse(a.offer.expires) > nowMs(s), 'This offer has expired. The seat was released.');
    if (action.endsWith('accept')) { requireOperational(initiative, s); a.offer.status = 'Accepted'; history(a, actor, 'Offered', 'Accepted', 'Accepted the offered seat'); a.status = 'Accepted'; }
    else { a.offer.status = 'Declined'; history(a, actor, 'Offered', 'Declined', 'Declined the offered seat'); a.status = 'Declined'; offerNextSeat(s, initiative); }
    noticeAll(s, staffAndRep(s, initiative), `${personOf(s, actor).name} ${action.endsWith('accept') ? 'accepted' : 'declined'} an offered seat in ${initiative.title}.`, `workspaces.html#/organization/participants?initiative=${initiative.id}`);
    return;
  }

  if (action === 'initiative.application.flag') {
    const a = find(s.admissions, p.id), initiative = initiativeOf(s, a.initiativeId);
    requireThat(isActiveSupervisor(s, initiative.id, actor), 'Only an active Supervisor can flag an application for the Representative.');
    requireThat(['Pending','Queued'].includes(a.status), 'Only an undecided application can be flagged.');
    const note = textRequired(p.note, 'What needs the Representative’s attention');
    (a.flags ||= []).push({id:id('flag'), actorId:actor, note, at:now(), resolved:false});
    noticeAll(s, representativesOf(s, initiative), `${personOf(s, actor).name} flagged application ${a.code} for your attention: ${note}`, `workspaces.html#/organization/participants?initiative=${initiative.id}&status=flagged`);
    return;
  }
  if (action === 'initiative.application.flag.resolve') {
    const a = find(s.admissions, p.id), initiative = initiativeOf(s, a.initiativeId); requireRep(s, initiative, actor);
    for (const f of (a.flags || []).filter(x => !x.resolved)) Object.assign(f, {resolved:true, resolvedBy:actor, resolvedAt:now(), resolution:String(p.note || 'Reviewed')});
    return;
  }

  /* ---- Identified forms and competitions from regular Individual pages (same engines, same records) */
  if (action === 'member.form.respond') {
    return respondToForm(s,find(s.forms,p.formId),p.answers||{},actor,p);
  }
  if (action === 'member.competition.enter') {
    return enterCompetition(s,find(s.competitions,p.competitionId),p.text,actor,p);
  }
  /** Restricted evidence: returns the attachment reference only to permitted readers, and audits the access. */
  if (action === 'initiative.excuse.evidence') {
    const excuse = find(s.excuses, p.id);
    requireThat(canViewExcuseEvidence(s, excuse, actor), 'This attachment is restricted to the student, the initiative’s Supervisors and its Representative.');
    requireThat(excuse.attachment?.id, 'No stored attachment for this excuse.');
    (excuse.evidenceLog ||= []).push({actorId:actor, at:now()});
    return {...excuse.attachment};
  }

  /* ---- Staff: scoped invitations and grants (no Platform Admin approval) */
  if (action === 'initiative.staff.invite') {
    const initiative = initiativeOf(s, p.initiativeId); requireRep(s, initiative, actor); requireOperational(initiative, s);
    requireThat(['supervisor','coach'].includes(p.role), 'Choose Supervisor or Coach.');
    const email = textRequired(p.email, 'Email').toLowerCase();
    requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email address.');
    requireThat(!s.staffInvites.some(x => x.initiativeId === initiative.id && x.role === p.role && x.email === email && x.status === 'Pending'), 'An invitation for this email and role is already pending.');
    const existing = s.people.find(x => x.email.toLowerCase() === email);
    requireThat(!existing || !activeGrantsFor(s, initiative.id, p.role).some(g => g.personId === existing.id), 'This person already holds that role in this initiative.');
    const invite = {id:id('sinv'), token:id('staff'), initiativeId:initiative.id, institutionId:initiative.ownerId, role:p.role, email, name:String(p.name || '').trim(), message:String(p.message || '').trim(), status:'Pending', created:now(), expires:new Date(nowMs(s) + 7 * 24 * HOUR).toISOString(), sends:1, invitedBy:actor, history:[{at:now(), actorId:actor, change:'Invitation created · simulated delivery'}]};
    s.staffInvites.push(invite);
    if (existing) notify(s, existing.id, `${initiative.title}: you were invited as ${p.role === 'coach' ? 'a Coach' : 'a Supervisor'}. Open the invitation to accept.`, `workspaces.html#/auth/staff-invitation/${invite.token}`, 'invite');
    return invite.token;
  }
  if (action === 'initiative.staff.resend' || action === 'initiative.staff.cancel') {
    const invite = find(s.staffInvites, p.id), initiative = initiativeOf(s, invite.initiativeId); requireRep(s, initiative, actor);
    const expired = invite.status === 'Pending' && Date.parse(invite.expires) <= nowMs(s);
    if (action.endsWith('resend')) {
      requireThat(['Pending','Expired'].includes(invite.status) || expired, 'Only a pending or expired invitation can be resent.');
      invite.status = 'Pending'; invite.sends = (invite.sends || 1) + 1; invite.expires = new Date(nowMs(s) + 7 * 24 * HOUR).toISOString();
      invite.history.push({at:now(), actorId:actor, change:'Resent · new 7-day expiry (simulated delivery)'});
    } else {
      requireThat(invite.status === 'Pending', 'Only a pending invitation can be cancelled.');
      invite.status = 'Cancelled'; invite.history.push({at:now(), actorId:actor, change:'Cancelled'});
    }
    return;
  }
  if (action === 'initiative.staff.accept' || action === 'initiative.staff.decline' || action === 'auth.institution.invite') {
    const token = p.token || p.code;
    const invite = s.staffInvites.find(x => x.token === token);
    requireThat(invite, 'No valid staff invitation matches this link.');
    const me = personOf(s, actor), initiative = initiativeOf(s, invite.initiativeId);
    requireThat(invite.status === 'Pending', `This invitation is ${invite.status.toLowerCase()} and grants nothing.`);
    requireThat(Date.parse(invite.expires) > nowMs(s), 'This invitation has expired. Ask the Representative to resend it.');
    requireThat(me.email.toLowerCase() === invite.email, `This invitation was sent to ${invite.email}. Sign in with that email — a different account cannot accept it.`);
    requireThat(me.verified, 'Verify your email before accepting a staff invitation.');
    if (action === 'initiative.staff.decline') { invite.status = 'Declined'; invite.history.push({at:now(), actorId:actor, change:'Declined'}); noticeAll(s, representativesOf(s, initiative), `${me.name} declined the ${invite.role} invitation for ${initiative.title}.`, `workspaces.html#/organization/team?initiative=${initiative.id}`); return; }
    requireOperational(initiative, s);
    if (invite.role === 'supervisor') requireThat(activeGrantsFor(s, initiative.id, 'supervisor').length < MAX_SUPERVISORS, `${initiative.title} already has ${MAX_SUPERVISORS} active Supervisors. The invitation stays pending until a place is free.`);
    requireThat(!activeGrantsFor(s, initiative.id, invite.role).some(g => g.personId === actor), 'You already hold this role in this initiative.');
    const grant = {id:id('grant'), personId:actor, role:invite.role, scopeType:'initiative', scopeId:initiative.id, institutionId:initiative.ownerId, status:'Active', inviteId:invite.id, acceptedAt:now(), revokedAt:null, history:[{at:now(), actorId:actor, change:'Accepted invitation'}]};
    s.grants.push(grant);
    invite.status = 'Accepted'; invite.acceptedBy = actor; invite.history.push({at:now(), actorId:actor, change:'Accepted'});
    const workspace = invite.role === 'coach' ? 'mentor' : 'supervisor';
    if (!me.workspaces.includes(workspace)) me.workspaces.push(workspace);
    noticeAll(s, representativesOf(s, initiative), `${me.name} accepted the ${invite.role} invitation for ${initiative.title}.`, `workspaces.html#/organization/team?initiative=${initiative.id}`);
    return grant.id;
  }
  if (action === 'initiative.staff.revoke') {
    const grant = find(s.grants, p.id), initiative = initiativeOf(s, grant.scopeId); requireRep(s, initiative, actor);
    requireThat(grant.status === 'Active', 'This appointment is not active.');
    const reason = textRequired(p.reason, 'Reason');
    grant.status = 'Revoked'; grant.revokedAt = now(); grant.revokedBy = actor; grant.reason = reason; grant.history.push({at:now(), actorId:actor, change:'Revoked', reason});
    for (const g of s.groups.filter(x => x.initiativeId === initiative.id && x.coachId === grant.personId && grant.role === 'coach')) {
      g.coachId = null; const open = (g.coachHistory || []).find(h => h.coachId === grant.personId && !h.to); if (open) open.to = now();
    }
    if (grant.role === 'supervisor') for (const ss of s.sessions.filter(x => x.initiativeId === initiative.id && (x.supervisorIds || []).includes(grant.personId))) {
      ss.supervisorIds = ss.supervisorIds.filter(x => x !== grant.personId); (ss.history ||= []).push({at:now(), actorId:actor, change:`Supervisor appointment ended (${personOf(s, grant.personId).name})`});
    }
    notify(s, grant.personId, `Your ${grant.role} appointment for ${initiative.title} ended. Your earlier work stays attributed to you. Reason: ${reason}`, '', 'access');
    return;
  }
  if (action === 'initiative.staff.request') {
    const initiative = initiativeOf(s, p.initiativeId);
    requireThat(isActiveSupervisor(s, initiative.id, actor), 'Only an active Supervisor can request staff.');
    const note = textRequired(p.note, 'Request details');
    (s.staffRequests ||= []).push({id:id('staffreq'), initiativeId:initiative.id, role:p.role || 'coach', note, actorId:actor, status:'Open', created:now()});
    noticeAll(s, representativesOf(s, initiative), `${personOf(s, actor).name} requested additional ${p.role || 'coach'} staffing for ${initiative.title}: ${note}`, `workspaces.html#/organization/team?initiative=${initiative.id}`);
    return;
  }

  /* ---- Groups: one parent (the Initiative); Rep or active Supervisor */
  if (action === 'initiative.group.save') {
    const initiative = initiativeOf(s, p.initiativeId); requireRepOrSupervisor(s, initiative, actor); requireOperational(initiative, s);
    const name = textRequired(p.name, 'Group name');
    if (p.id) {
      const g = find(s.groups, p.id); requireThat(g.initiativeId === initiative.id, 'This group belongs to another initiative.');
      Object.assign(g, {name, purpose:String(p.purpose || g.purpose || '')}); return g.id;
    }
    const g = {id:id('group'), parentType:'initiative', initiativeId:initiative.id, ownerId:initiative.ownerId, name, purpose:String(p.purpose || ''), description:'', capacity:135, enrollment:'Allocation', approval:false, status:'Open', created:now().slice(0, 10), memberIds:[], programId:null, coachId:null, coachHistory:[], memberHistory:[]};
    s.groups.push(g); return g.id;
  }
  if (action === 'initiative.group.allocate') {
    const initiative = initiativeOf(s, p.initiativeId); requireRepOrSupervisor(s, initiative, actor); requireOperational(initiative, s);
    const a = s.admissions.find(x => x.initiativeId === initiative.id && x.personId === p.personId);
    requireThat(a && a.status === 'Accepted', 'Only an accepted student can be allocated to a group.');
    const from = s.groups.find(g => g.initiativeId === initiative.id && g.parentType === 'initiative' && g.memberIds.includes(p.personId));
    if (from && from.id === p.groupId) return from.id;
    if (from) { from.memberIds = from.memberIds.filter(x => x !== p.personId); from.memberHistory.push({personId:p.personId, action:'Transferred out', at:now(), actorId:actor, toGroupId:p.groupId || null}); }
    if (p.groupId) {
      const g = find(s.groups, p.groupId); requireThat(g.initiativeId === initiative.id && g.parentType === 'initiative', 'Choose a group in this initiative.');
      g.memberIds.push(p.personId); g.memberHistory.push({personId:p.personId, action:from ? 'Transferred in' : 'Allocated', at:now(), actorId:actor, fromGroupId:from?.id || null});
      a.groupId = g.id;
      notify(s, p.personId, `You were ${from ? 'moved' : 'added'} to ${g.name} in ${initiative.title}.`, memberLink);
    } else a.groupId = null;
    return;
  }
  if (action === 'initiative.group.coach') {
    const g = find(s.groups, p.groupId), initiative = initiativeOf(s, g.initiativeId); requireRepOrSupervisor(s, initiative, actor); requireOperational(initiative, s);
    if (p.coachId) requireThat(isActiveCoach(s, initiative.id, p.coachId), 'Choose a Coach who has accepted an invitation to this initiative.');
    if (g.coachId === (p.coachId || null)) return;
    const open = (g.coachHistory ||= []).find(h => !h.to); if (open) open.to = now();
    const previous = g.coachId; g.coachId = p.coachId || null;
    if (g.coachId) g.coachHistory.push({coachId:g.coachId, from:now(), to:null, actorId:actor, handoverFrom:previous || null});
    if (g.coachId) notify(s, g.coachId, `You now coach ${g.name} in ${initiative.title}.`, `workspaces.html#/mentor/groups/${g.id}`);
    if (previous) notify(s, previous, `${g.name} was handed over to another Coach. Your earlier reviews stay attributed to you.`, '');
    return;
  }

  /* ---- Sessions: registration is separate from Initiative membership */
  if (action === 'initiative.session.save') {
    const initiative = initiativeOf(s, p.initiativeId); requireRep(s, initiative, actor); requireOperational(initiative, s);
    const title = textRequired(p.title, 'Session title'), speaker = textRequired(p.speaker, 'Host / facilitator');
    requireThat(p.date && p.time && p.endTime && p.endTime > p.time, 'Choose a date and a valid start and end time.');
    requireThat(['Online','In-person','Hybrid'].includes(p.format), 'Choose online, in-person or hybrid.');
    requireThat(p.format === 'Online' || String(p.venue || '').trim(), 'Add a venue for in-person or hybrid participation.');
    const onlineCapacity = p.format === 'In-person' ? 0 : numberIn(p.onlineCapacity, 1, 1000, 'Online seats');
    const inPersonCapacity = p.format === 'Online' ? 0 : numberIn(p.inPersonCapacity, 1, 1000, 'In-person seats');
    if (p.registrationOpen && p.registrationClose) requireThat(p.registrationClose >= p.registrationOpen, 'Registration must close after it opens.');
    const supervisorIds = (p.supervisorIds || []).filter(pid => isActiveSupervisor(s, initiative.id, pid));
    const fields = {initiativeId:initiative.id, ownerId:initiative.ownerId, title, speaker, description:String(p.description || ''), agenda:String(p.agenda || ''), date:p.date, time:p.time, endTime:p.endTime, timezone:p.timezone || initiative.timezone || 'Asia/Amman', format:p.format, venue:String(p.venue || ''), meeting:String(p.meeting || ''), onlineCapacity, inPersonCapacity, capacity:onlineCapacity + inPersonCapacity, registrationOpen:p.registrationOpen || '', registrationClose:p.registrationClose || p.date, attendanceRequired:p.attendanceRequired !== false, completionRule:String(p.completionRule || 'Attendance only'), instructions:String(p.instructions || ''), eligibility:'Accepted participants of this initiative', supervisorIds, checkInPolicy:p.checkInMode === 'anytime' ? {mode:'anytime', before:0, after:0} : {mode:'window', before:numberIn(p.checkInBefore ?? 30, 0, 240, 'Minutes before start'), after:numberIn(p.checkInAfter ?? 30, 0, 720, 'Minutes after end')}};
    if (p.id) {
      const ss = find(s.sessions, p.id); requireThat(ss.initiativeId === initiative.id, 'This session belongs to another initiative.');
      requireThat(ss.status !== 'Cancelled', 'A cancelled session cannot be edited.');
      const moved = ss.status === 'Published' && (ss.date !== fields.date || ss.time !== fields.time || ss.venue !== fields.venue || ss.format !== fields.format);
      if (ss.status === 'Published') requireThat(fields.onlineCapacity >= confirmedInMode(s, ss, 'Online') && fields.inPersonCapacity >= confirmedInMode(s, ss, 'In-person'), 'Seats cannot drop below confirmed registrations.');
      const before = `${ss.date} ${ss.time} · ${ss.format} · ${ss.venue}`;
      Object.assign(ss, fields); (ss.history ||= []).push({at:now(), actorId:actor, change:moved ? `Rescheduled from ${before}` : 'Details updated', reason:p.reason || ''});
      if (moved) noticeAll(s, s.sessionRegistrations.filter(r => r.sessionId === ss.id && r.status === 'Confirmed').map(r => r.personId), `${ss.title} changed: now ${ss.date} ${ss.time} · ${ss.format}${ss.venue ? ` · ${ss.venue}` : ''}.`, memberLink);
      return ss.id;
    }
    const ss = {...fields, id:id('session'), status:'Draft', history:[{at:now(), actorId:actor, change:'Created'}], closedOut:false};
    s.sessions.push(ss);
    const component = (initiative.components ||= []).find(c => c.type === 'Session' && !c.resourceId && c.title === title);
    if (component) component.resourceId = ss.id;
    return ss.id;
  }
  if (action === 'initiative.session.publish' || action === 'organization.session.publish') {
    const ss = find(s.sessions, p.id), initiative = ss.initiativeId ? initiativeOf(s, ss.initiativeId) : null;
    if (initiative) requireRep(s, initiative, actor); else return false;
    requireThat(ss.status === 'Draft', 'This session is already published.');
    ss.status = 'Published'; ss.history.push({at:now(), actorId:actor, change:'Published'});
    return;
  }
  if (action === 'initiative.session.cancel') {
    const ss = find(s.sessions, p.id), initiative = initiativeOf(s, ss.initiativeId); requireRep(s, initiative, actor);
    requireThat(['Draft','Published'].includes(ss.status), 'This session cannot be cancelled.');
    const reason = textRequired(p.reason, 'Reason');
    ss.status = 'Cancelled'; ss.cancelReason = reason; ss.history.push({at:now(), actorId:actor, change:'Cancelled', reason});
    noticeAll(s, s.sessionRegistrations.filter(r => r.sessionId === ss.id && r.status === 'Confirmed').map(r => r.personId), `${ss.title} was cancelled. Reason: ${reason}`, memberLink);
    return;
  }
  if (action === 'initiative.session.assign') {
    const ss = find(s.sessions, p.id), initiative = initiativeOf(s, ss.initiativeId); requireRepOrSupervisor(s, initiative, actor);
    const ids = [...new Set(p.supervisorIds || [])];
    requireThat(ids.every(pid => isActiveSupervisor(s, initiative.id, pid)), 'Only active Supervisors of this initiative can be assigned.');
    ss.supervisorIds = ids; ss.history.push({at:now(), actorId:actor, change:`Supervisor duty: ${ids.map(pid => personOf(s, pid).name).join(', ') || 'none — Needs Supervisor'}`});
    for (const pid of ids) notify(s, pid, `You are the responsible Supervisor for ${ss.title} (${ss.date} ${ss.time}).`, `workspaces.html#/supervisor/attendance?session=${ss.id}`);
    return;
  }
  if (['member.session.register','participant.session.register'].includes(action)) {
    const ss = find(s.sessions, p.sessionId);
    requireThat(ss.status === 'Published', 'This session is not open for registration.');
    requireThat(p.consent, 'Confirm the session participation terms.');
    if (ss.initiativeId) {
      const initiative = initiativeOf(s, ss.initiativeId); requireOperational(initiative, s);
      const a = s.admissions.find(x => x.initiativeId === initiative.id && x.personId === actor);
      requireThat(a?.status === 'Accepted', 'Only accepted participants of this initiative can register for its sessions.');
    }
    requireThat(sessionRegistrationOpen(s, ss), 'Registration for this session is closed.');
    requireThat(!s.sessionRegistrations.some(x => x.personId === actor && x.sessionId === ss.id && x.status !== 'Cancelled'), 'You are already registered for this session.');
    const mode = ss.format === 'Hybrid' ? p.mode : ss.format;
    requireThat(['Online','In-person'].includes(mode), 'Choose a participation mode.');
    requireThat(confirmedInMode(s, ss, mode) < modeCapacity(ss, mode), 'This participation mode is full.');
    const r = {id:id('session-registration'), sessionId:ss.id, personId:actor, mode, status:'Confirmed', attendance:'Not attended', completion:'Pending', created:now()};
    r.code = bookingCode(r.id);
    s.sessionRegistrations.push(r);
    return r.id;
  }
  if (['member.session.cancel','participant.session.cancel'].includes(action)) {
    const r = find(s.sessionRegistrations, p.id);
    requireThat(r.personId === actor, 'This registration belongs to another participant.');
    requireThat(r.completion !== 'Completed' && !(s.sessionAttendance || []).some(x => x.registrationId === r.id), 'Attendance is already recorded, so this registration cannot be cancelled.');
    requireThat(r.status === 'Confirmed', 'This registration is not active.');
    r.status = 'Cancelled'; r.cancelledAt = now();
    return;
  }

  /* ---- Factual attendance: active, assigned Supervisor only */
  if (action === 'initiative.attendance.record' || action === 'organization.session.attend') {
    const ss = find(s.sessions, p.sessionId || find(s.sessionRegistrations, p.id).sessionId);
    if (!ss.initiativeId) return false;
    const initiative = initiativeOf(s, ss.initiativeId);
    requireThat(isActiveSupervisor(s, initiative.id, actor), 'Attendance is confirmed by an active Supervisor of this initiative.');
    requireThat((ss.supervisorIds || []).includes(actor), 'You are not the assigned Supervisor for this session. Ask for the duty to be assigned first.');
    requireThat(ss.status === 'Published', 'Attendance can be recorded only for a published, not cancelled, session.');
    requireOperational(initiative, s);
    const method = p.method || (p.code ? 'code' : 'manual');
    assertWindow(s, ss, method);
    let r;
    if (method === 'qr' || method === 'code') {
      const code = textRequired(p.code, 'Booking code').toUpperCase().replace(/\s+/g, '');
      r = s.sessionRegistrations.find(x => x.code === code);
      requireThat(r, 'This code does not match any booking.');
      requireThat(r.sessionId === ss.id, 'This booking is for a different session.');
      requireThat(r.mode === 'In-person', 'QR and booking codes are used for in-person participation only. Use the online roster.');
    } else r = find(s.sessionRegistrations, p.registrationId || p.id);
    requireThat(r.sessionId === ss.id && r.status === 'Confirmed', 'Only a confirmed registration for this session can be recorded.');
    const existing = s.sessionAttendance.find(x => x.registrationId === r.id);
    if (existing) throw new Error(existing.status === 'Absent' ? 'This participant is already recorded Absent. Use a correction with a reason.' : `Already checked in (${existing.status}, ${existing.method}). No duplicate attendance was recorded.`);
    const status = method === 'absent' ? 'Absent' : p.status === 'Late' ? 'Late' : 'Present';
    if (method === 'online') requireThat(r.mode === 'Online', 'Online roster verification is for online participants.');
    const reason = method === 'manual' ? textRequired(p.reason, 'Manual check-in reason') : String(p.reason || '');
    const stored = {qr:'qr', code:'booking-code', online:'online-verified', manual:'manual-exception', absent:'roster'}[method] || method;
    s.sessionAttendance.push({id:id('att'), sessionId:ss.id, registrationId:r.id, initiativeId:initiative.id, personId:r.personId, status, method:stored, reason, actorId:actor, at:now(), history:[]});
    r.attendance = 'Recorded';
    return status;
  }
  if (action === 'initiative.attendance.closeout') {
    const ss = find(s.sessions, p.sessionId), initiative = initiativeOf(s, ss.initiativeId);
    requireThat(isActiveSupervisor(s, initiative.id, actor) && (ss.supervisorIds || []).includes(actor), 'Only the assigned active Supervisor can close attendance.');
    requireThat(checkInWindow(s, ss).started, 'Attendance can be closed only after the session has started.');
    let count = 0;
    for (const r of s.sessionRegistrations.filter(x => x.sessionId === ss.id && x.status === 'Confirmed' && !s.sessionAttendance.some(a => a.registrationId === x.id))) {
      s.sessionAttendance.push({id:id('att'), sessionId:ss.id, registrationId:r.id, initiativeId:initiative.id, personId:r.personId, status:'Absent', method:'close-out', reason:'Not checked in when attendance closed', actorId:actor, at:now(), history:[]});
      r.attendance = 'Recorded'; count++;
      notify(s, r.personId, `You were recorded absent from ${ss.title}. You can submit an excuse from My Initiatives.`, memberLink, 'attendance');
    }
    ss.closedOut = true; ss.history.push({at:now(), actorId:actor, change:`Attendance closed · ${count} recorded Absent`});
    return count;
  }
  if (action === 'initiative.attendance.correct') {
    const record = find(s.sessionAttendance, p.id), ss = find(s.sessions, record.sessionId);
    requireThat(isActiveSupervisor(s, record.initiativeId, actor) && (ss.supervisorIds || []).includes(actor), 'Only the assigned active Supervisor can correct attendance.');
    requireThat(['Present','Late','Absent'].includes(p.status) && p.status !== record.status, 'Choose a different factual status.');
    const reason = textRequired(p.reason, 'Correction reason');
    record.history.push({at:now(), actorId:actor, from:record.status, to:p.status, reason, method:record.method});
    record.status = p.status; record.method = `${record.method} · corrected`; record.correctedAt = now();
    return;
  }

  /* ---- Excuses: Student → Supervisor recommendation → Representative decision */
  if (action === 'member.excuse.submit') {
    const record = find(s.sessionAttendance, p.attendanceId);
    requireThat(record.personId === actor, 'You can only explain your own absence.');
    requireThat(record.status === 'Absent', 'An excuse can be submitted only for a session recorded Absent.');
    requireThat(!s.excuses.some(x => x.attendanceId === record.id), 'An excuse for this session was already submitted.');
    const reason = textRequired(p.reason, 'Short explanation'); requireThat(reason.length <= 600, 'Keep the explanation under 600 characters.');
    let attachment = null;
    if (p.attachment?.name) {
      const type = String(p.attachment.type || ''), size = Number(p.attachment.size || 0), ext = String(p.attachment.name).split('.').pop().toLowerCase();
      requireThat(ATTACHMENT_RULES.types.includes(type) && ATTACHMENT_RULES.extensions.includes(ext), 'Attach a PDF, JPG or PNG file.');
      requireThat(size > 0 && size <= ATTACHMENT_RULES.maxBytes, 'The attachment must be smaller than 2 MB.');
      attachment = {id:p.attachment.id || null, name:String(p.attachment.name).slice(0, 120), type, size, storage:p.attachment.id ? 'browser-indexeddb' : 'name-only', note:p.attachment.id ? 'Stored in this browser only (demo); restricted to you, the Supervisors and the Representative of this initiative.' : 'File name only'};
    }
    const excuse = {id:id('excuse'), attendanceId:record.id, sessionId:record.sessionId, initiativeId:record.initiativeId, personId:actor, reason, attachment, status:'Submitted', recommendation:null, decision:null, created:now(), history:[{at:now(), actorId:actor, change:'Submitted'}]};
    s.excuses.push(excuse);
    const initiative = initiativeOf(s, record.initiativeId), ss = find(s.sessions, record.sessionId);
    noticeAll(s, [...new Set([...(ss.supervisorIds || []), ...activeGrantsFor(s, initiative.id, 'supervisor').map(g => g.personId)])], `${personOf(s, actor).name} explained an absence from ${ss.title}.`, `workspaces.html#/supervisor/excuses?initiative=${initiative.id}`);
    return excuse.id;
  }
  if (action === 'initiative.excuse.recommend') {
    const excuse = find(s.excuses, p.id), initiative = initiativeOf(s, excuse.initiativeId);
    requireThat(isActiveSupervisor(s, initiative.id, actor), 'Only an active Supervisor of this initiative can recommend.');
    requireThat(['Submitted','Info Requested','Recommended'].includes(excuse.status), 'This excuse already has a final decision.');
    requireThat(['Accept','Reject','More information'].includes(p.decision), 'Choose a recommendation.');
    const note = textRequired(p.note, 'Supervisor note');
    excuse.recommendation = {decision:p.decision, note, actorId:actor, at:now()};
    excuse.status = p.decision === 'More information' ? 'Info Requested' : 'Recommended';
    excuse.history.push({at:now(), actorId:actor, change:`Supervisor recommendation: ${p.decision}`});
    if (p.decision === 'More information') notify(s, excuse.personId, `Your Supervisor asked for more information about your excuse: ${note}`, memberLink, 'excuse');
    else noticeAll(s, representativesOf(s, initiative), `An excuse is ready for your final decision (${initiative.title}).`, `workspaces.html#/organization/attendance?initiative=${initiative.id}`);
    return;
  }
  if (action === 'member.excuse.respond') {
    const excuse = find(s.excuses, p.id);
    requireThat(excuse.personId === actor && excuse.status === 'Info Requested', 'There is no open information request.');
    excuse.reason = `${excuse.reason}\n\nAdded: ${textRequired(p.text, 'Additional information')}`;
    excuse.status = 'Submitted'; excuse.history.push({at:now(), actorId:actor, change:'Added information'});
    return;
  }
  if (action === 'initiative.excuse.decide') {
    const excuse = find(s.excuses, p.id), initiative = initiativeOf(s, excuse.initiativeId); requireRep(s, initiative, actor);
    requireThat(!['Accepted','Rejected'].includes(excuse.status), 'This excuse already has a final decision.');
    requireThat(excuse.status === 'Recommended' || !activeGrantsFor(s, initiative.id, 'supervisor').length, 'Wait for the Supervisor recommendation before deciding.');
    requireThat(['Accepted','Rejected'].includes(p.decision), 'Choose Accept or Reject.');
    const reason = textRequired(p.reason, 'Decision reason');
    excuse.decision = {decision:p.decision, reason, actorId:actor, at:now(), withoutRecommendation:excuse.status !== 'Recommended'};
    excuse.status = p.decision; excuse.history.push({at:now(), actorId:actor, change:`Final decision: ${p.decision}`});
    const ss = find(s.sessions, excuse.sessionId);
    notify(s, excuse.personId, p.decision === 'Accepted' ? `Your excuse for ${ss.title} was accepted. It shows as an excused absence; attendance stays recorded as Absent.` : `Your excuse for ${ss.title} was not accepted. Reason: ${reason}`, memberLink, 'excuse');
    return;
  }

  /* ---- Reports: counts come from records; people add interpretation */
  if (action === 'initiative.coach.report') {
    const g = find(s.groups, p.groupId); requireThat(g.parentType === 'initiative', 'Coach reports here are for Initiative groups.');
    requireThat(isActiveCoach(s, g.initiativeId, actor) && g.coachId === actor, 'Only the Coach currently assigned to this group can report on it.');
    requireThat(p.from && p.to && p.to >= p.from, 'Choose a valid reporting period.');
    const report = {id:p.id || id('coach-report'), groupId:g.id, initiativeId:g.initiativeId, authorId:actor, period:{from:p.from, to:p.to}, metrics:groupMetrics(s, g, p.from, p.to), observations:String(p.observations || '').trim(), concerns:String(p.concerns || '').trim(), recommendations:String(p.recommendations || '').trim(), status:p.submit ? 'Submitted' : 'Draft', created:now(), submitted:p.submit ? now() : null};
    if (p.submit) textRequired(report.observations, 'Observations');
    const old = p.id ? find(s.coachReports, p.id) : null;
    if (old) { requireThat(old.authorId === actor && old.status === 'Draft', 'A submitted report is read-only.'); Object.assign(old, report, {created:old.created}); } else s.coachReports.push(report);
    if (p.submit) noticeAll(s, activeGrantsFor(s, g.initiativeId, 'supervisor').map(x => x.personId), `${personOf(s, actor).name} submitted a Coach report for ${g.name}.`, `workspaces.html#/supervisor/reports?initiative=${g.initiativeId}`);
    return report.id;
  }
  if (action === 'initiative.supervisor.summary') {
    const initiative = initiativeOf(s, p.initiativeId);
    requireThat(isActiveSupervisor(s, initiative.id, actor), 'Only an active Supervisor can submit a summary.');
    requireThat(p.from && p.to && p.to >= p.from, 'Choose a valid reporting period.');
    const coachReportIds = s.coachReports.filter(r => r.initiativeId === initiative.id && r.status === 'Submitted' && r.period.to >= p.from && r.period.from <= p.to).map(r => r.id);
    const summary = {id:id('sup-summary'), initiativeId:initiative.id, authorId:actor, period:{from:p.from, to:p.to}, metrics:initiativeMetrics(s, initiative, p.from, p.to), coachReportIds, summary:textRequired(p.summary, 'Summary'), issues:String(p.issues || '').trim(), recommendations:String(p.recommendations || '').trim(), status:'Submitted', submitted:now()};
    s.supervisorSummaries.push(summary);
    noticeAll(s, representativesOf(s, initiative), `${personOf(s, actor).name} submitted a Supervisor summary for ${initiative.title}.`, `workspaces.html#/organization/reports?initiative=${initiative.id}`);
    return summary.id;
  }

  /* ---- Initiative lifecycle beyond Draft/Publish */
  if (action === 'initiative.registration.close' || action === 'initiative.registration.open') {
    const initiative = initiativeOf(s, p.id); requireRep(s, initiative, actor);
    requireThat(initiative.status === 'Published', 'Registration can change only on a published initiative.');
    initiative.registrationState = action.endsWith('close') ? 'Closed' : 'Open';
    initiative.history.push({version:initiative.version, at:now(), actorId:actor, change:`Registration ${initiative.registrationState.toLowerCase()}`, reason:p.reason || ''});
    return;
  }
  if (action === 'initiative.update') {
    const initiative = initiativeOf(s, p.id); requireRep(s, initiative, actor);
    requireThat(initiative.status === 'Published', 'Only a published initiative is updated this way; edit drafts in the builder.');
    const reason = textRequired(p.reason, 'Reason for the change');
    const allowed = ['title','summary','description','objective','start','end','venue','onlineDetails','capacity','registrationOpen','registrationClose','minAge','maxAge','withdrawal','requirements'];
    const changes = Object.fromEntries(Object.entries(p.changes || {}).filter(([k, v]) => allowed.includes(k) && v !== undefined && String(v) !== String(initiative[k] ?? '')));
    requireThat(Object.keys(changes).length, 'Change at least one field.');
    if ('capacity' in changes) { const cap = numberIn(changes.capacity, 1, 135, 'Accepted-student capacity'); requireThat(cap >= seatsUsed(s, initiative.id), `Capacity cannot drop below the ${seatsUsed(s, initiative.id)} seats already taken.`); changes.capacity = cap; }
    const start = changes.start || initiative.start, end = changes.end || initiative.end; requireThat(end >= start, 'The end date must follow the start date.');
    const before = Object.fromEntries(Object.keys(changes).map(k => [k, initiative[k]]));
    Object.assign(initiative, changes); initiative.version = (initiative.version || 1) + 1;
    initiative.history.push({version:initiative.version, at:now(), actorId:actor, change:`Updated ${Object.keys(changes).join(', ')}`, reason, before, after:changes});
    noticeAll(s, s.admissions.filter(a => a.initiativeId === initiative.id && ['Pending','Queued','Offered','Accepted','Suspended'].includes(a.status)).map(a => a.personId), `${initiative.title} was updated (${Object.keys(changes).join(', ')}). ${reason}`, memberLink);
    if ('capacity' in changes) offerNextSeat(s, initiative);
    return initiative.version;
  }
  if (action === 'initiative.complete') {
    const initiative = initiativeOf(s, p.id); requireRep(s, initiative, actor);
    requireThat(initiative.status === 'Published', 'Only a published initiative can be completed.');
    const notCompleted = new Set(p.notCompletedIds || []);
    initiative.status = 'Completed'; initiative.completedAt = now(); initiative.registrationState = 'Closed';
    initiative.history.push({version:initiative.version, at:now(), actorId:actor, change:'Completed', reason:p.reason || initiative.policies?.completion || ''});
    for (const a of s.admissions.filter(x => x.initiativeId === initiative.id)) {
      if (a.status === 'Accepted') {
        const met = !notCompleted.has(a.id);
        if (met) { history(a, actor, 'Accepted', 'Completed', 'Met the published completion criteria'); a.status = 'Completed'; }
        a.completion = met ? 'Completed' : 'Not completed';
        s.completions.push({id:id('completion'), initiativeId:initiative.id, personId:a.personId, admissionId:a.id, status:met ? 'Completed' : 'Not completed', criteria:initiative.policies?.completion || '', actorId:actor, at:now()});
        notify(s, a.personId, met ? `${initiative.title} is complete. It now shows as Completed in your history.` : `${initiative.title} has ended. Your participation history stays available.`, memberLink);
      } else if (['Pending','Queued','Offered'].includes(a.status)) { history(a, actor, a.status, 'Closed', 'Initiative completed before a decision'); a.status = 'Closed'; notify(s, a.personId, `${initiative.title} has ended, so your application closed.`, memberLink); }
    }
    return;
  }
  if (action === 'initiative.cancel' || action === 'organization.initiative.cancel') {
    const initiative = initiativeOf(s, p.id); requireRep(s, initiative, actor);
    requireThat(!['Cancelled','Archived','Completed'].includes(initiative.status), 'This initiative can no longer be cancelled.');
    const reason = action === 'organization.initiative.cancel' ? String(p.reason || 'Cancelled by the Representative') : textRequired(p.reason, 'Cancellation reason');
    initiative.previousStatus = initiative.status; initiative.status = 'Cancelled'; initiative.cancelReason = reason; initiative.registrationState = 'Closed';
    initiative.history.push({version:initiative.version, at:now(), actorId:actor, change:'Cancelled', reason});
    noticeAll(s, s.admissions.filter(a => a.initiativeId === initiative.id && ['Pending','Queued','Offered','Accepted','Suspended'].includes(a.status)).map(a => a.personId), `${initiative.title} was cancelled. Your history is kept. Reason: ${reason}`, memberLink);
    return;
  }
  if (action === 'initiative.archive' || action === 'organization.initiative.archive') {
    const initiative = initiativeOf(s, p.id); requireRep(s, initiative, actor);
    requireThat(['Completed','Cancelled','Draft','Published'].includes(initiative.status), 'This initiative cannot be archived.');
    initiative.previousStatus = initiative.status; initiative.status = 'Archived'; initiative.registrationState = 'Closed';
    initiative.history.push({version:initiative.version, at:now(), actorId:actor, change:'Archived', reason:p.reason || ''});
    return;
  }
  if (action === 'organization.initiative.close') { return initiativeCommand(s, 'initiative.registration.close', p, actor); }

  /* ---- Individual work on the shared assignment engine */
  if (action === 'member.task.start') { startTask(s, p, actor); return; }
  if (action === 'member.task.submit') { submitTask(s, p, actor); return; }
  if (action === 'member.notice.read') { const n = find(s.notifications, p.id); requireThat((n.recipientId || n.actorId) === actor, 'This notice belongs to someone else.'); n.read = true; return; }
  return false;
}

/* --------------------------------------------- source-derived metrics */

const inPeriod = (value, from, to) => { const day = String(value || '').slice(0, 10); return (!from || day >= from) && (!to || day <= to); };
export function groupMetrics(s, g, from, to) {
  const assignments = s.assignments.filter(a => a.groupId === g.id && a.status !== 'Cancelled');
  const subs = s.submissions.filter(x => assignments.some(a => a.id === x.assignmentId));
  const periodSubs = subs.filter(x => inPeriod(x.submitted, from, to));
  const expected = assignments.reduce((n, a) => n + (a.studentId ? 1 : g.memberIds.length), 0);
  const overdue = assignments.filter(a => a.due < (to || '9999')).reduce((n, a) => n + (a.studentId ? [a.studentId] : g.memberIds).filter(pid => !subs.some(x => x.assignmentId === a.id && x.studentId === pid && x.status === 'Approved') && !subs.some(x => x.assignmentId === a.id && x.studentId === pid && x.status === 'Submitted')).length, 0);
  return {members:g.memberIds.length, assignments:assignments.length, expectedSubmissions:expected, submitted:periodSubs.length, approved:periodSubs.filter(x => x.status === 'Approved').length, needsRevision:periodSubs.filter(x => x.status === 'Needs Revision').length, rejected:periodSubs.filter(x => x.status === 'Rejected').length, awaitingReview:subs.filter(x => x.status === 'Submitted').length, overdue};
}
export function initiativeMetrics(s, initiative, from, to) {
  const admissions = s.admissions.filter(a => a.initiativeId === initiative.id);
  const attendance = s.sessionAttendance.filter(a => a.initiativeId === initiative.id && inPeriod(a.at, from, to));
  const excuses = s.excuses.filter(e => e.initiativeId === initiative.id && inPeriod(e.created, from, to));
  const groups = s.groups.filter(g => g.parentType === 'initiative' && g.initiativeId === initiative.id);
  const subs = s.submissions.filter(x => s.assignments.some(a => a.id === x.assignmentId && groups.some(g => g.id === a.groupId)) && inPeriod(x.submitted, from, to));
  return {accepted:admissions.filter(a => a.status === 'Accepted').length, pending:admissions.filter(a => a.status === 'Pending').length, queued:admissions.filter(a => ['Queued','Offered'].includes(a.status)).length, present:attendance.filter(a => a.status === 'Present').length, late:attendance.filter(a => a.status === 'Late').length, absent:attendance.filter(a => a.status === 'Absent').length, excusesAccepted:excuses.filter(e => e.status === 'Accepted').length, excusesRejected:excuses.filter(e => e.status === 'Rejected').length, excusesOpen:excuses.filter(e => !['Accepted','Rejected'].includes(e.status)).length, submissions:subs.length, approved:subs.filter(x => x.status === 'Approved').length, groups:groups.length};
}
