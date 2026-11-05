/**
 * The nine chapters of the System Journey. Coordinates use a 1000 × 560
 * stage; people stand on a coarse grid (x 100–900, rows near y 120 / 270 /
 * 410) so labels never crowd. `f` carries live facts (seat and Supervisor
 * caps, offer window) from the shared rules instead of restating them.
 */
import entry from './chapters/entry.js';
import initiative from './chapters/initiative.js';
import staffInvitation from './chapters/staff.js';
import admission from './chapters/admission.js';
import operations from './chapters/operations.js';
import provider from './chapters/provider.js';
import coaching from './chapters/coaching.js';
import personal from './chapters/personal.js';
import governance from './chapters/governance.js';

export function chapters(f) {
  return [entry(f), initiative(f), staffInvitation(f), admission(f), operations(f), provider(f), coaching(f), personal(f), governance(f)];
}
