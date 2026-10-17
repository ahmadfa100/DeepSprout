/**
 * System Journey storyboard. One list of declared steps feeds both modes
 * (Overview shows the steps flagged `overview`), so the two can never
 * disagree. Each step declares its whole scene: who is visible and where,
 * which connections exist, which one carries the event and in what direction,
 * the status change it produces, its note and its on-demand details.
 *
 * Content follows DeepSprout.md v4.0 (sections cited per step). Operational
 * caps come from initiative-rules.js and the offer window from the demo
 * settings, so this walkthrough is not a second source of business rules.
 */
import { MAX_SEATS, MAX_SUPERVISORS } from '../initiative-rules.js';
import { offerHours } from '../domain.js';
import { chapters as storyboard } from './journey-chapters.js';

/** The cast: small neutral figures for people, quiet tiles for records. */
export const ACTORS = {
  rep: { kind: 'person', tone: 'forest', label: 'Institution Representative', short: 'Representative' },
  coach: { kind: 'person', tone: 'sage', label: 'Coach' },
  supervisor: { kind: 'person', tone: 'slate', label: 'Supervisor' },
  student: { kind: 'person', tone: 'clay', label: 'Student' },
  individual: { kind: 'person', tone: 'clay', label: 'Individual' },
  applicant: { kind: 'person', tone: 'plum', label: 'Applicant' },
  provider: { kind: 'person', tone: 'ochre', label: 'Outdoor Provider', short: 'Provider' },
  admin: { kind: 'person', tone: 'ink', label: 'Platform Admin', short: 'Admin' },
  visitor: { kind: 'person', tone: 'plum', label: 'Visitor' },
  initiative: { kind: 'object', glyph: 'initiative', label: 'Initiative' },
  institution: { kind: 'object', glyph: 'flag', label: 'Institution' },
  explore: { kind: 'object', glyph: 'globe', label: 'Explore' },
  website: { kind: 'object', glyph: 'globe', label: 'Public website', short: 'Website' },
  application: { kind: 'object', glyph: 'doc', label: 'Application' },
  invitation: { kind: 'object', glyph: 'envelope', label: 'Invitation' },
  identity: { kind: 'object', glyph: 'key', label: 'One identity', short: 'Identity' },
  grant: { kind: 'object', glyph: 'lock', label: 'Scoped grant', short: 'Grant' },
  session: { kind: 'object', glyph: 'calendar', label: 'Session' },
  group: { kind: 'object', glyph: 'group', label: 'Group' },
  program: { kind: 'object', glyph: 'book', label: 'Coach Program', short: 'Program' },
  assignment: { kind: 'object', glyph: 'doc', label: 'Assignment' },
  submission: { kind: 'object', glyph: 'edit', label: 'Submission' },
  experience: { kind: 'object', glyph: 'mountain', label: 'Experience' },
  camp: { kind: 'object', glyph: 'mountain', label: 'Camp' },
  seat: { kind: 'object', glyph: 'seat', label: 'Seat' },
  waitlist: { kind: 'object', glyph: 'clock', label: 'Waiting List', short: 'Waitlist' },
  qr: { kind: 'object', glyph: 'qr', label: 'Booking QR', short: 'QR' },
  attendance: { kind: 'object', glyph: 'check', label: 'Attendance' },
  excuse: { kind: 'object', glyph: 'bubble', label: 'Excuse' },
  report: { kind: 'object', glyph: 'chart', label: 'Report' },
  insights: { kind: 'object', glyph: 'chart', label: 'Insights' },
  garden: { kind: 'object', glyph: 'leaf', label: 'Personal Garden', short: 'Garden' },
  groupGarden: { kind: 'object', glyph: 'leaf', label: 'Group Garden' },
  lab: { kind: 'object', glyph: 'flask', label: 'Lab' },
  plan: { kind: 'object', glyph: 'map', label: 'Recovery Plan', short: 'Plan' },
  practice: { kind: 'object', glyph: 'book', label: 'Practice' },
  routine: { kind: 'object', glyph: 'flower', label: 'Offline Routine', short: 'Routine' },
  shield: { kind: 'object', glyph: 'shield', label: 'Digital Shield', short: 'Shield' },
  community: { kind: 'object', glyph: 'bubble', label: 'Community' },
  catalog: { kind: 'object', glyph: 'layers', label: 'Catalog & policies', short: 'Catalog' },
  cms: { kind: 'object', glyph: 'edit', label: 'Content Studio', short: 'Content' },
  audit: { kind: 'object', glyph: 'doc', label: 'Audit log', short: 'Audit' },
  notice: { kind: 'object', glyph: 'bell', label: 'Notification', short: 'Notice' },
  entitlement: { kind: 'object', glyph: 'scale', label: 'Entitlement' },
  partnership: { kind: 'object', glyph: 'arrow', label: 'Partnership' },
  completion: { kind: 'object', glyph: 'flag', label: 'Completion' },
  rabbit: { kind: 'object', glyph: 'rabbit', label: 'Rabbit' },
  birdhouse: { kind: 'object', glyph: 'birdhouse', label: 'Birdhouse' },
  flower: { kind: 'object', glyph: 'flower', label: 'Flower' },
  workspace: { kind: 'object', glyph: 'layers', label: 'Workspace' },
  setup: { kind: 'object', glyph: 'spark', label: 'Bimo + quick setup', short: 'Setup' },
  starting: { kind: 'object', glyph: 'chart', label: 'Your Starting Point', short: 'Starting Point' }
};

const actorOf = id => ACTORS[id.split('.')[0]];
const STAGE_MID = 286; // vertical centre of the 560-unit stage, leaving room for status chips above

/** Turn one declared step into the scene the engine draws. */
function sceneOf(step, chapter) {
  const at = { ...chapter.layout, ...step.at };
  const labels = { ...chapter.labels, ...step.labels };
  const subs = { ...chapter.subs, ...step.subs };
  const nodes = step.show.map(id => {
    const actor = actorOf(id);
    if (!actor) throw new Error(`Journey: unknown actor "${id}" in ${step.id}`);
    if (!at[id]) throw new Error(`Journey: no position for "${id}" in ${step.id}`);
    const label = labels[id] || actor.label;
    return { id, kind: actor.kind, tone: actor.tone, glyph: actor.glyph, label, short: labels[id] ? (step.shorts?.[id] || chapter.shorts?.[id] || label) : actor.short || label, sub: subs[id] || '', x: at[id][0], y: at[id][1], dim: (step.dim || []).includes(id) };
  });
  // Centre the cast vertically on the stage. Positions alone decide the shift,
  // so consecutive steps with the same cast keep exactly the same places.
  const top = Math.min(...nodes.map(n => n.y)) - 40, bottom = Math.max(...nodes.map(n => n.y)) + 62;
  const shift = Math.round((STAGE_MID - (top + bottom) / 2) / 10) * 10;
  nodes.forEach(n => { n.y += shift; });
  // In rows of three or more, narrow screens drop sub-labels so neighbours never collide.
  nodes.forEach(n => { n.crowded = nodes.filter(m => Math.abs(m.y - n.y) < 30).length >= 3; n.chip = Boolean(step.status?.[n.id]); });
  const edge = text => { const [path, shape] = text.split(':'), [from, to] = path.split('>'); return { key: path, from, to, shape: shape || 'auto' }; };
  const edges = (step.edges || []).map(edge);
  // Flow syntax: "a>b" travels a → b; "<a>b" travels b → a along the same line; "@glyph" sets that flow's token.
  const flows = (step.flows || []).map(text => { const [body, token] = text.split('@'), reverse = body.startsWith('<'), e = edge(reverse ? body.slice(1) : body); return { ...e, reverse, token }; });
  for (const e of [...edges, ...flows]) for (const end of [e.from, e.to]) if (!step.show.includes(end)) throw new Error(`Journey: edge ${e.key} uses hidden "${end}" in ${step.id}`);
  for (const f of flows) if (!edges.some(e => e.key === f.key)) throw new Error(`Journey: flow ${f.key} is not a declared edge in ${step.id}`);
  for (const id of [...(step.focus || []), ...Object.keys(step.status || {})]) if (!step.show.includes(id)) throw new Error(`Journey: "${id}" is not visible in ${step.id}`);
  return { id: step.id, nodes, edges, flows, sequence: Boolean(step.sequence), token: step.token || 'envelope', focus: step.focus || flows.map(f => (f.reverse ? f.from : f.to)), status: step.status || {} };
}

/** Plain-language description of a scene for the SVG's accessible name. */
function altOf(scene) {
  const names = scene.nodes.map(n => n.label + (scene.status[n.id] ? ` (${[].concat(scene.status[n.id]).map(v => v.replace(/^!/, '')).join(' → ')})` : ''));
  const moves = scene.flows.map(f => { const a = scene.nodes.find(n => n.id === (f.reverse ? f.to : f.from)), b = scene.nodes.find(n => n.id === (f.reverse ? f.from : f.to)); return `${a.label} to ${b.label}`; });
  return `Shows ${names.join(', ')}.${moves.length ? ` Highlighted path: ${moves.join('; ')}.` : ''}`;
}

export function buildJourney(s) {
  const facts = { seats: MAX_SEATS, supervisors: MAX_SUPERVISORS, offerHours: offerHours(s || { settings: {} }) };
  const chapters = storyboard(facts);
  const steps = chapters.flatMap(chapter => chapter.steps.map(step => {
    const scene = sceneOf(step, chapter);
    return { overview: false, simulated: '', spec: [], scenarios: [], ...step, chapter: chapter.id, scene, alt: altOf(scene) };
  }));
  const byId = new Map(steps.map(step => [step.id, step]));
  const chapterOf = step => chapters.find(c => c.id === step.chapter);
  // Horizontal extent of a chapter's cast, for fitting narrow screens.
  const boundsCache = new Map();
  const bounds = chapterId => {
    if (!boundsCache.has(chapterId)) {
      const xs = steps.filter(s => s.chapter === chapterId).flatMap(s => s.scene.nodes.map(n => n.x));
      const min = Math.min(...xs) - 130, max = Math.max(...xs) + 130, w = Math.max(560, max - min), mid = (min + max) / 2;
      boundsCache.set(chapterId, { x: Math.round(mid - w / 2), w: Math.round(w) });
    }
    return boundsCache.get(chapterId);
  };
  return { chapters: chapters.map(({ steps: _, ...c }) => c), steps, byId, chapterOf, bounds, facts };
}
