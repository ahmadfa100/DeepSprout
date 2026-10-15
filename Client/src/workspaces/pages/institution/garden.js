/**
 * The single Group Garden of an Institution Initiative — one collective scene
 * fed by every accepted student's qualifying source events across all
 * internal groups. No per-student trees, no per-group gardens, no manual
 * growth. Milestone thresholds are configurable demo defaults.
 */
import * as u from '../../ui.js';
import {esc,head,stats,stat,card,emptyState,initiativeSwitcher,fmtDate} from './common.js';
import {initiativeGarden,GROUP_MILESTONES} from '../../../shared/selectors.js';

export function collectiveScene(stage, completed) {
  const show = n => stage >= n ? '' : ' hidden';
  return `<svg class="iw-garden-svg" viewBox="0 0 640 360" role="img" aria-label="${esc(`Shared garden at stage ${stage} of 5${completed ? ', initiative completed' : ''}`)}">
    <defs><radialGradient id="gg-sky" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#fffef8"/><stop offset="1" stop-color="#f1f4e8"/></radialGradient><linearGradient id="gg-leaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9dbb7d"/><stop offset="1" stop-color="#5f8a57"/></linearGradient></defs>
    <rect width="640" height="360" rx="28" fill="url(#gg-sky)"/>
    <ellipse cx="320" cy="300" rx="230" ry="34" fill="#e3ead6"/><ellipse cx="320" cy="296" rx="160" ry="20" fill="#d6e0c4"/>
    <g class="gg-stage gg-1"${show(0)}><path d="M300 292q20-14 40 0" fill="#b49a73"/></g>
    <g class="gg-stage gg-sprout"${show(1)}><path d="M320 292v-34" stroke="#5f8a57" stroke-width="5" stroke-linecap="round"/><path d="M320 270c-18 0-26-12-24-22 14 0 24 8 24 22Z M320 262c16-2 24-14 22-24-14 2-22 10-22 24Z" fill="url(#gg-leaf)"/></g>
    <g class="gg-stage gg-trunk"${show(2)}><path d="M314 292c4-50 2-90 6-120h8c2 34 2 72 6 120Z" fill="#8a6a48"/><path d="M322 214c-24-12-42-10-56-2M324 196c20-14 40-14 54-4" stroke="#8a6a48" stroke-width="6" stroke-linecap="round" fill="none"/></g>
    <g class="gg-stage gg-canopy"${show(2)}><circle cx="324" cy="168" r="46" fill="#8fb173"/><circle cx="282" cy="186" r="30" fill="#a4c287"/><circle cx="366" cy="184" r="32" fill="#7ea463"/></g>
    <g class="gg-stage gg-canopy-2"${show(3)}><circle cx="300" cy="140" r="38" fill="#9dbd80"/><circle cx="352" cy="138" r="40" fill="#86ab6a"/><circle cx="252" cy="200" r="22" fill="#b1cc95"/><circle cx="396" cy="204" r="24" fill="#93b577"/></g>
    <g class="gg-stage gg-companions"${show(4)}><path d="M190 296v-40" stroke="#7b5c3f" stroke-width="5"/><circle cx="190" cy="248" r="24" fill="#a7c58c"/><path d="M452 296v-46" stroke="#7b5c3f" stroke-width="5"/><circle cx="452" cy="244" r="26" fill="#94b679"/></g>
    <g class="gg-stage gg-bloom"${show(5)}><g fill="#e8b765"><circle cx="292" cy="128" r="5"/><circle cx="350" cy="120" r="5"/><circle cx="372" cy="170" r="5"/><circle cx="276" cy="176" r="5"/><circle cx="326" cy="150" r="5"/></g></g>
    ${completed ? '<g class="gg-ribbon"><rect x="236" y="24" width="168" height="34" rx="17" fill="#173e35"/><text x="320" y="46" text-anchor="middle" fill="#fffef9" font-size="14" font-family="Georgia, serif">Initiative completed</text></g>' : ''}
  </svg>`;
}

export function renderInitiativeGarden(ctx, {initiatives, role}) {
  const {s} = ctx;
  const i = initiatives.find(x => x.id === (ctx.route.query.get('initiative') || ctx.localUI.initiativeId)) || initiatives[0];
  if (!i) return head({eyebrow:'GROUP GARDEN', title:'Group Garden'}) + emptyState('No initiative garden in your scope.', role === 'coach' ? 'An Initiative group you coach shares its initiative’s garden.' : 'Each Institution Initiative has one shared Group Garden.');
  ctx.localUI.initiativeId = i.id;
  const g = initiativeGarden(s, i.id);
  return head({eyebrow:`GROUP GARDEN · ${g.owner.toUpperCase()}`, title:i.title, lead:'One shared garden for the whole initiative, across all its groups. It grows only from approved Coach-reviewed tasks and Supervisor-confirmed attendance — never from joining, clicking or an accepted excuse.', meta:initiativeSwitcher(ctx, initiatives, i)})
    + stats([stat(g.count, 'Qualifying contributions'), stat(g.contributors, 'Contributing students'), stat(g.byKind.tasks, 'Approved tasks'), stat(g.byKind.attendance, 'Confirmed attendance'), stat(`${g.stage}/5`, 'Collective stage')])
    + `<div class="iw-split is-garden"><div class="iw-garden iw-reveal" data-stage="${g.stage}">${collectiveScene(g.stage, Boolean(g.completedMilestone))}<p class="iw-garden-caption">${g.next ? `${g.next.at - g.count} more qualifying contribution${g.next.at - g.count === 1 ? '' : 's'} to “${esc(g.next.title)}”.` : 'Every collective milestone reached.'}</p></div>
      ${card('Collective milestones', `<ol class="iw-milestones">${GROUP_MILESTONES.map(m => `<li class="${g.count >= m.at ? 'is-done' : ''}"><span>${esc(m.at)}</span><div><strong>${esc(m.title)}</strong><small>${esc(m.note)}</small></div></li>`).join('')}${g.completedMilestone ? `<li class="is-done is-final"><span>✓</span><div><strong>${esc(g.completedMilestone.title)}</strong><small>${g.completedMilestone.completedStudents} student(s) completed · ${esc(fmtDate(g.completedMilestone.on))}</small></div></li>` : ''}</ol><p class="iw-muted">Thresholds are configurable demo defaults, not final policy. Each source record counts once.</p>`, {eyebrow:'SOURCE-BACKED'})}</div>`
    + card('Recent contributions', g.recent.length ? `<ul class="iw-mini-list">${g.recent.map(c => `<li><span>${esc(c.kind)}${c.group ? ` · ${esc(c.group)}` : ''}</span><time>${esc(fmtDate(c.on))}</time></li>`).join('')}</ul>` : '<p class="iw-muted">The first contribution is still ahead.</p>', {extra:`<small class="iw-muted">${g.groups.length} group(s) · contributor identities are not shown here</small>`});
}
