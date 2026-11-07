/**
 * Former `provider/*` routes. The Outdoor Provider workspace is retired; this
 * page explains where the work moved and links only to destinations the
 * current person can actually open. It grants nothing.
 */
import {workspaces} from '../store.js';
export function render({s, person:p, ui:u}) {
  const canInstitution = p && workspaces(s).includes('organization');
  const isSupervisor = p && (s.appointments || []).some(a => a.personId === p.id && a.status === 'Accepted');
  const archived = (s.experiences || []).filter(e => e.legacyOwner && e.status === 'Archived').length;
  return `<div class="retired-route iw-reveal"><p class="eyebrow">WORKSPACE RETIRED</p><h1>Outdoor Activities now belong to Institutions.</h1>
  <p class="ds-lead">DeepSprout no longer has a separate Outdoor Provider workspace. Verified Institutions create and run their own trips, hikes, camps and outdoor events — including bookings, waiting lists, Supervisor appointments, check-in and completion.</p>
  <ul class="retired-facts"><li>${u.icon('check')}<span>Existing bookings, attendance and completion records keep their original IDs and history.</span></li><li>${u.icon('check')}<span>Supervisor appointments for outdoor sessions continue; they are now issued by the organizing Institution.</span></li>${archived ? `<li>${u.icon('info')}<span>${archived} legacy activit${archived === 1 ? 'y' : 'ies'} without a verified Institution ${archived === 1 ? 'was' : 'were'} archived read-only, never deleted.</span></li>` : ''}</ul>
  <div class="actions">${canInstitution ? u.link('Open Outdoor Activities', 'organization/activities', 'button primary') : ''}${isSupervisor ? u.link('Open my Supervisor workspace', 'supervisor/dashboard', canInstitution ? 'button quiet' : 'button primary') : ''}${u.link('Choose a workspace', 'auth/workspaces', 'button quiet')}<a class="button quiet" href="src/pages/member/explore/explore.html">Browse Outdoor Activities in Explore</a></div></div>`;
}
