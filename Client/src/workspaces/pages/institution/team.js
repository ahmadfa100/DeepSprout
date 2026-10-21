/**
 * Team & Groups for the Representative: scoped staff invitations (no
 * Platform Admin approval), the per-Initiative three-active-Supervisor limit,
 * revocation with reason, and the Initiative's groups.
 */
import * as u from '../../ui.js';
import {esc,nameOf,pill,head,stats,stat,card,personCell,tabs,emptyState,summary,initiativeSwitcher,withInitiative,fmtDate} from './common.js';
import {renderGroups} from './participants.js';
import {staffFor} from '../../../shared/selectors.js';
import {MAX_SUPERVISORS} from '../../initiative-rules.js';

export const inviteLink = token => { const url = new URL('workspaces.html', location.href); url.hash = `/auth/staff-invitation/${token}`; return url.href; };

export function renderTeam(ctx, initiatives) {
  const {s, route:r} = ctx;
  const i = initiatives.find(x => x.id === (r.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives.find(x => x.status === 'Published') || initiatives[0];
  if (!i) return head({eyebrow:'TEAM & GROUPS', title:'Team & Groups'}) + emptyState('Create an initiative first.', 'Supervisors and Coaches are invited to a specific initiative.', u.link('Create an initiative', 'organization/initiatives/new', 'button primary'));
  ctx.localUI.initiativeId = i.id;
  const tab = r.query.get('tab') || 'staff';
  const nav = tabs([['Staff & invitations', withInitiative('organization/team?tab=staff', i), 'staff'], ['Groups & allocation', withInitiative('organization/team?tab=groups', i), 'groups']], tab);
  if (tab === 'groups') return nav + renderGroups(ctx, {role:'rep', initiatives});
  const staff = staffFor(s, i.id), sum = summary(s, i);
  const requests = (s.staffRequests || []).filter(x => x.initiativeId === i.id && x.status === 'Open');
  const grantRow = g => ({search:g.name, cells:[personCell(s, g.personId, esc(s.people.find(p => p.id === g.personId)?.email || '')), pill('Active', g.role === 'coach' ? 'Coach' : 'Supervisor'), `<small>Accepted ${esc(fmtDate(g.acceptedAt))}</small>`, g.role === 'coach' ? esc(s.groups.filter(x => x.initiativeId === i.id && x.coachId === g.personId).map(x => x.name).join(', ') || 'No group yet') : esc(s.sessions.filter(x => x.initiativeId === i.id && (x.supervisorIds || []).includes(g.personId)).length + ' session duty'), u.button('Revoke', 'staff-revoke', {id:g.id}, 'button quiet small')]});
  const inviteRow = x => ({search:x.email, status:x.effectiveStatus, cells:[`<strong>${esc(x.name || x.email)}</strong><small>${esc(x.email)}</small>`, pill(x.role === 'coach' ? 'Coach' : 'Supervisor'), `${pill(x.effectiveStatus)}<small>${x.effectiveStatus === 'Pending' ? `expires ${esc(fmtDate(x.expires))}` : x.acceptedBy ? `by ${esc(nameOf(s, x.acceptedBy))}` : ''}</small>`, `<small>Sent ${esc(fmtDate(x.created))}${x.sends > 1 ? ` · resent ${x.sends - 1}×` : ''}</small>`, `<div class="actions">${['Pending','Expired'].includes(x.effectiveStatus) ? u.button('Copy link', 'staff-copy', {token:x.token}, 'button quiet small') + u.button('Resend', 'staff-resend', {id:x.id}, 'button quiet small') : ''}${x.effectiveStatus === 'Pending' ? u.button('Cancel', 'staff-cancel', {id:x.id}, 'button quiet small') : ''}</div>`]});
  const revoked = (s.grants || []).filter(g => g.scopeId === i.id && g.status === 'Revoked');
  return nav + head({eyebrow:'THE PEOPLE WHO RUN IT', title:'Staff & invitations', lead:'Invite Supervisors and Coaches by email into this initiative only. They accept with a matching, verified identity — no separate Platform Admin approval, and no access to anything else.', meta:initiativeSwitcher(ctx, initiatives, i), actions:u.button('Invite Supervisor', 'staff-invite', {role:'supervisor', initiative:i.id}, 'button primary') + u.button('Invite Coach', 'staff-invite', {role:'coach', initiative:i.id}, 'button secondary')})
    + stats([stat(staff.supervisors.length, 'Active Supervisors', {of:MAX_SUPERVISORS, hint:'Per-initiative limit · pending invites don’t count', tone:staff.supervisors.length >= MAX_SUPERVISORS ? 'attention' : ''}), stat(staff.coaches.length, 'Active Coaches', {hint:'No numeric limit'}), stat(staff.invites.filter(x => x.effectiveStatus === 'Pending').length, 'Pending invitations'), stat(sum.needsSupervisor.length, 'Sessions needing a Supervisor', {href:withInitiative('organization/sessions', i), tone:sum.needsSupervisor.length ? 'attention' : ''})])
    + (requests.length ? card('Staffing requests from Supervisors', `<ul class="iw-attention">${requests.map(x => `<li class="is-attention"><span class="iw-dot"></span><div><strong>${esc(nameOf(s, x.actorId))} requests a ${esc(x.role)}</strong><p>${esc(x.note)}</p></div>${u.button(`Invite ${x.role}`, 'staff-invite', {role:x.role, initiative:i.id}, 'button quiet small')}</li>`).join('')}</ul>`) : '')
    + card('Active staff', staff.supervisors.length + staff.coaches.length ? u.table(['Person','Role','Since','Responsibility',''], [...staff.supervisors, ...staff.coaches].map(grantRow)) : '<p class="iw-muted">Nobody has accepted yet. The initiative can still be published and receive applications; sessions show “Needs Supervisor” until a Supervisor is active.</p>', {eyebrow:'SCOPED TO THIS INITIATIVE'})
    + card('Invitations', staff.invites.length ? u.table(['Invitee','Role','Status','Delivery',''], staff.invites.slice().reverse().map(inviteRow)) : '<p class="iw-muted">No invitations yet.</p>', {extra:'<small class="iw-muted">Delivery is simulated: copy the link to share it. No email is sent.</small>'})
    + (revoked.length ? card('Ended appointments', `<ul class="iw-mini-list">${revoked.map(g => `<li><span>${esc(nameOf(s, g.personId))} · ${esc(g.role)}</span><small>Revoked ${esc(fmtDate(g.revokedAt))} · ${esc(g.reason || '')}</small></li>`).join('')}</ul><p class="iw-muted">Work they authored stays attributed to them.</p>`) : '');
}

export function teamAction(action, target, ctx) {
  const d = target.dataset, s = ctx.s;
  if (action === 'staff-invite') {
    const i = s.initiatives.find(x => x.id === d.initiative);
    const role = d.role === 'coach' ? 'Coach' : 'Supervisor';
    u.modal(`Invite a ${role}`, `<p>The invitation is scoped to <strong>${esc(i.title)}</strong>. ${role === 'Supervisor' ? `Up to ${MAX_SUPERVISORS} Supervisors can be active at once; extra acceptances wait until a place is free.` : 'Coaches see only the group(s) you allocate to them.'}</p>${u.field('email', 'Email address', '', 'email', true)}${u.field('name', 'Name (optional)', '')}${u.area('message', 'Personal note (optional)', '')}<div class="iw-preview"><p class="eyebrow">WHAT THEY WILL SEE</p><p><strong>${esc(i.title)}</strong> invites you to join as ${role}. Sign in or create an account with the invited email to accept.</p></div>`, v => {
      const token = ctx.run('initiative.staff.invite', {initiativeId:i.id, role:d.role, ...v}, 'Invitation created.');
      // Open the follow-up only after the first dialog has fully closed.
      setTimeout(() => u.modal('Invitation ready to share', `<p>Delivery is simulated in this demo — share this link with ${esc(v.email)}. Only an account verified with that email can accept it.</p>${u.field('link', 'Invitation link', inviteLink(token), 'text', false, 'readonly')}`, () => ctx.render(), 'Done'), 60);
    }, 'Create invitation');
    return true;
  }
  if (action === 'staff-copy') { const link = inviteLink(d.token); navigator.clipboard?.writeText(link).then(() => u.toast('Invitation link copied.'), () => u.modal('Invitation link', u.field('link', 'Link', link, 'text', false, 'readonly'), () => {}, 'Done')); return true; }
  if (action === 'staff-resend') { ctx.run('initiative.staff.resend', {id:d.id}, 'Invitation renewed for 7 days (simulated delivery).'); ctx.render(); return true; }
  if (action === 'staff-cancel') { u.confirm('Cancel this invitation?', 'The link will stop working. You can invite the person again later.', () => { ctx.run('initiative.staff.cancel', {id:d.id}, 'Invitation cancelled.'); ctx.render(); }); return true; }
  if (action === 'staff-revoke') {
    const g = s.grants.find(x => x.id === d.id);
    u.modal(`End ${nameOf(s, g.personId)}’s appointment?`, `<p>They immediately lose access to this initiative’s roster and actions. ${g.role === 'coach' ? 'Their groups become “No Coach” until you reallocate them.' : 'Sessions they were responsible for return to “Needs Supervisor”.'} Their earlier reviews, attendance records and reports stay attributed to them.</p>${u.area('reason', 'Reason (shared with them)', '', true)}`, v => { ctx.run('initiative.staff.revoke', {id:g.id, reason:v.reason}, 'Appointment ended.'); ctx.render(); }, 'Revoke access');
    return true;
  }
  return false;
}
