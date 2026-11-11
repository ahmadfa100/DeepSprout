/**
 * Demo data for the Coach task cycle: tasks for one group, for chosen
 * students and for every group Karim coaches, with sample files (generated
 * on demand by shared/sample-files.js), submissions waiting for review, a
 * revision request and evaluated approvals.
 *
 * Additive and idempotent: each record is added once, only when its group
 * and people exist, and nothing already there is changed. Dates follow the
 * demo clock, so the board always has something due soon and something late.
 */
import {clockDay, nowMs} from '../domain.js';
import {practiceTypeOf} from '../initiative-rules.js';
import {assignmentDefinition} from '../activity-contract.js';

export const COACH_TASK_DEMO_VERSION = 1;

const day = (s, n) => { const d = new Date(`${clockDay(s)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const at = (s, hoursAgo) => new Date(nowMs(s) - hoursAgo * 36e5).toISOString();
const file = (id, name, extra = {}) => ({id:`sample-${id}`, name, type:/\.pdf$/.test(name) ? 'application/pdf' : 'image/png', size:extra.size || 184000, sample:true, ...extra});

const WORKSHEET = `Step 1. For two days, notice each moment you open a short-video app without deciding to.
Step 2. Write down where you were, what you were doing just before, and how you felt.
Step 3. Circle the two triggers that came up most often.
Step 4. For each one, write one small thing you could do instead - a glass of water, two pages of a book, a message to a friend.
Bring the sheet (or a photo of it) back with a sentence about what surprised you.`;
const PLAYLIST = `A focus playlist is a short, repeatable start signal - not background noise.
1. Choose 3 to 5 tracks without lyrics, about 25 minutes in total.
2. Use the same order every time, so the first track tells your brain "we are starting".
3. Put your phone in another room before you press play.
4. When the playlist ends, stop and write one line about what you finished.
Send back your track list and one line about your first session.`;

export function addCoachTaskDemo(s) {
  if ((s.coachTaskDemoVersion || 0) >= COACH_TASK_DEMO_VERSION) return false;
  const people = new Set((s.people || []).map(p => p.id));
  const groups = (s.groups || []).filter(g => g.parentType === 'initiative' && g.coachId === 'p-karim' && !['Archived', 'Completed', 'Closed'].includes(g.status));
  const byId = id => groups.find(g => g.id === id);
  const catalog = title => (s.activityCatalog || []).some(a => a.title === title && a.status === 'Published');
  s.coachTaskDemoVersion = COACH_TASK_DEMO_VERSION;
  if (!groups.length || !catalog('Practical Micro-Challenge')) return true;

  const task = (id, g, fields) => {
    if (s.assignments.some(a => a.id === id)) return null;
    const record = {id, ownerId:'p-karim', groupId:g.id, studentId:null, initiativeId:g.initiativeId, programId:null,
      ...assignmentDefinition(s, fields.activity), practiceType:practiceTypeOf(fields.activity), evidence:'', start:day(s, -3), required:true,
      review:'Coach review', status:'Active', recipientIds:[...g.memberIds], created:at(s, 72), version:1, history:[], attachments:[], demo:true, ...fields};
    s.assignments.push(record);
    return record;
  };
  const submit = (id, a, studentId, fields) => {
    if (!a || !people.has(studentId) || s.submissions.some(x => x.id === id)) return;
    const g = s.groups.find(x => x.id === a.groupId);
    if (!g?.memberIds.includes(studentId)) return;
    const base = {id, assignmentId:a.id, studentId, text:'', file:'', files:[], status:'Submitted', submitted:at(s, 20), feedback:'', history:[], attempt:1,
      assignmentVersion:1, activityReference:structuredClone(a.definitionSnapshot || null), instructionsSnapshot:a.instructions};
    const sub = {...base, ...fields};
    sub.file = sub.files.map(f => f.name).join(', ');
    if (sub.status !== 'Submitted') { sub.reviewedBy = 'p-karim'; sub.reviewedAt ||= at(s, 6); sub.history.push({decision:sub.status, evaluation:sub.evaluation || null, feedback:sub.feedback, internalNote:'', actorId:'p-karim', created:sub.reviewedAt, attempt:sub.attempt, assignmentVersion:1}); }
    s.submissions.push(sub);
  };

  // 1 · One task sent to every group Karim coaches, with a worksheet and an example image.
  const batch = groups.length > 1 ? {id:'batch-demo-triggers', kind:'all-groups', size:groups.length} : null;
  const triggers = {};
  for (const g of groups) {
    triggers[g.id] = task(`a-demo-triggers-${g.id}`, g, {title:'Map your scroll triggers', activity:'Practical Micro-Challenge',
      instructions:'Use the worksheet for two days. Each time you open a short-video app without deciding to, note where you were and what came just before. Then circle your two biggest triggers.',
      evidence:'A reflection, a file or both', due:day(s, 4),
      attachments:[file('trigger-sheet', 'Scroll trigger worksheet.pdf', {body:WORKSHEET, size:46000}), file('trigger-example', 'Example trigger map.png', {caption:'Example: evenings, bed, after messages', hue:150})],
      ...(batch ? {batch} : {})});
  }
  const ta = triggers['g-today-a'], tf = triggers['g-maya-focus'];
  submit('sub-demo-triggers-noor', ta, 'p-noor', {text:'Most of my scrolling starts in bed after the last message of the day, and in the bus. I circled “bed” and “waiting”. Instead I will keep a book on the pillow and download two podcast episodes for the bus.',
    files:[file('noor-map', 'My trigger map.png', {caption:'Noor · bed + bus are my two triggers', hue:120, size:612000})], submitted:at(s, 5)});
  submit('sub-demo-triggers-rania', ta, 'p-rania', {text:'I noticed I open the app every time I feel stuck on homework. My two triggers: a hard maths question and waiting for food. I tried writing the question down first, and it worked twice out of three.',
    files:[file('rania-sheet', 'Rania trigger worksheet.pdf', {body:'Day 1: 6 openings. 4 while stuck on maths, 2 waiting for food.\nDay 2: 3 openings. Wrote the question down first - it helped twice.\nMy swap: write the question, then ask a friend.', size:52000})],
    submitted:at(s, 30), status:'Approved', reviewedAt:at(s, 8), evaluation:{rating:5, criteria:{followed:'Excellent', reflection:'Excellent', evidence:'Solid'}},
    feedback:'This is exactly the kind of noticing that changes habits. Writing the question down first is a brilliant swap — keep it for one more week.'});
  submit('sub-demo-triggers-lina', tf, 'p-maya-lina', {text:'My triggers are the first five minutes after I sit at my desk and the moment I finish a task. I attached my sheet.',
    files:[file('lina-sheet', 'Lina - trigger worksheet.pdf', {body:'Desk start: 5 times\nTask finished: 4 times\nOther: 2 times\nSwap: open my notebook before my laptop.', size:41000})], submitted:at(s, 14)});
  submit('sub-demo-triggers-nader', tf, 'p-maya-nader', {text:'I scroll when I am bored.', submitted:at(s, 40), status:'Needs Revision', reviewedAt:at(s, 26),
    evaluation:{rating:2, criteria:{followed:'Getting there', reflection:'Getting there', evidence:'Getting there'}},
    feedback:'Thanks for starting! Can you use the worksheet for one more day and note where you were each time? A photo of the sheet is perfect.'});

  // 2 · A task for two chosen students only, with a route image.
  const gA = byId('g-today-a');
  if (gA && ['p-noor', 'p-rania'].every(id => gA.memberIds.includes(id)))
    task('a-demo-walk', gA, {title:'Pair walk: 20 minutes, no phones', activity:'Practical Micro-Challenge', audience:'students', recipientIds:['p-noor', 'p-rania'],
      instructions:'Walk together for twenty minutes with both phones left at home. Notice three things you would normally miss. Afterwards, each of you writes two sentences.',
      evidence:'A short written reflection', due:day(s, 2), start:day(s, -1), required:false,
      attachments:[file('walk-route', 'Suggested walking route.png', {caption:'Suggested route · park loop, about 20 minutes', hue:95})]});

  // 3 · A whole-group task with a guide; one waiting review, one late.
  const gF = byId('g-maya-focus');
  if (gF && catalog('Protected Work')) {
    const playlist = task('a-demo-playlist', gF, {title:'Build your focus playlist', activity:'Protected Work',
      instructions:'Make a 25-minute playlist with no lyrics and use it as the start signal for one focus session. Phone in another room.',
      evidence:'A document or PDF', due:day(s, 1), attachments:[file('playlist-guide', 'Focus playlist guide.pdf', {body:PLAYLIST, size:38000})]});
    submit('sub-demo-playlist-yara', playlist, 'p-maya-yara', {text:'Five piano tracks, 26 minutes. I finished my history summary before the last track — first time in weeks.',
      files:[file('yara-list', 'Yara - focus playlist.pdf', {body:'1. Morning rain (piano)\n2. Slow river\n3. Quiet library\n4. Soft keys\n5. Last light\nTotal: 26 minutes.\nFirst session: finished my history summary.', size:29000})], submitted:at(s, 3)});
    task('a-demo-basil', gF, {title:'Catch up: your first focus window', activity:'Protected Work', studentId:'p-maya-basil', recipientIds:['p-maya-basil'],
      instructions:'You missed the first session, so here is a short version: ten minutes, one small task, phone face down. Tell me how it went.',
      evidence:'A short written reflection', due:day(s, -2), start:day(s, -6)});
  }
  return true;
}
