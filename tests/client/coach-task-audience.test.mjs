/**
 * Coach tasks — audiences (one group, chosen students, every group), task
 * files, file-only submissions and the review evaluation.
 *
 *   node --test tests/client/coach-task-audience.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {read, dispatch} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/store.js';
import {tasksFor, taskAudience, audienceLabel, cleanEvaluation} from '../../src/DeepSprout.Web/wwwroot/src/workspaces/coach-rules.js';
import {assignedTasks} from '../../src/DeepSprout.Web/wwwroot/src/shared/selectors.js';
import {todoBoard, evaluationView, dueChip} from '../../src/DeepSprout.Web/wwwroot/src/shared/task-kit.js';

const as = personId => dispatch('demo.signin', {personId});
const reset = () => { dispatch('demo.reset'); dispatch('demo.clock', {at:'2026-10-20T09:00:00+03:00'}); as('p-karim'); };
const base = {activity:'Practical Micro-Challenge', instructions:'Try one small step and describe it.', due:'2026-10-27', start:'2026-10-20'};
const ref = (id, name) => ({id, name, type:'application/pdf', size:1200});

test('Chosen students: one task per group, only those students see it', () => {
  reset();
  const ids = dispatch('mentor.assignment.create', {...base, title:'Pair walk', audience:'students', studentIds:['p-noor', 'p-rania'], groupIds:['g-today-a', 'g-maya-focus']});
  const s = read(), a = s.assignments.find(x => x.id === ids);
  assert.equal(typeof ids, 'string', 'both students share one group, so one record');
  assert.equal(a.audience, 'students');
  assert.deepEqual(a.recipientIds, ['p-noor', 'p-rania']);
  const g = s.groups.find(x => x.id === 'g-today-a');
  assert.deepEqual(taskAudience(a, g), ['p-noor', 'p-rania']);
  assert.match(audienceLabel(s, a, g), /2 chosen students/);
  assert.ok(assignedTasks(s, 'p-noor').some(t => t.id === a.id && t.audience === 'chosen'));

  // Across two groups: split by group; a member who was not chosen never sees it.
  const split = dispatch('mentor.assignment.create', {...base, title:'Across groups', audience:'students', studentIds:['p-noor', 'p-maya-lina', 'p-maya-yara'], groupIds:['g-today-a', 'g-maya-focus']});
  const s2 = read();
  assert.equal(split.length, 2);
  const focus = s2.assignments.find(x => split.includes(x.id) && x.groupId === 'g-maya-focus');
  assert.deepEqual(focus.recipientIds, ['p-maya-lina', 'p-maya-yara']);
  const solo = s2.assignments.find(x => split.includes(x.id) && x.groupId === 'g-today-a');
  assert.equal(solo.studentId, 'p-noor', 'a single chosen student is stored like a one-student task');
  assert.equal(tasksFor(s2, s2.groups.find(x => x.id === 'g-maya-focus'), 'p-maya-nader').some(x => x.id === focus.id), false);
  assert.equal(assignedTasks(s2, 'p-rania').some(t => t.id === solo.id), false);
  assert.throws(() => dispatch('mentor.assignment.create', {...base, title:'Bad', audience:'students', studentIds:['p-leen'], groupIds:['g-today-a']}), /current members/);
});

test('All my groups: one copy per group, linked as a batch', () => {
  reset();
  const ids = dispatch('mentor.assignment.create', {...base, title:'Everyone', audience:'all-groups', groupIds:['g-today-a', 'g-maya-focus']});
  const s = read(), list = s.assignments.filter(a => ids.includes(a.id));
  assert.equal(list.length, 2);
  assert.equal(new Set(list.map(a => a.batch.id)).size, 1);
  assert.ok(list.every(a => a.batch.kind === 'all-groups' && a.batch.size === 2));
  assert.match(audienceLabel(s, list[0], null), /all 2 groups/);
  assert.ok(assignedTasks(s, 'p-maya-yara').some(t => ids.includes(t.id) && t.audience === 'all-groups'));
  assert.throws(() => dispatch('mentor.assignment.create', {...base, title:'None', audience:'all-groups', groupIds:[]}), /at least one group/);
});

test('Task files travel with the task; file-only submissions; evaluation is kept and history preserved', () => {
  reset();
  const id = dispatch('mentor.assignment.create', {...base, title:'With files', audience:'group', groupId:'g-today-a', attachments:[ref('att-1', 'Worksheet.pdf'), {name:'no id'}]});
  let s = read();
  assert.deepEqual(s.assignments.find(a => a.id === id).attachments.map(f => f.name), ['Worksheet.pdf'], 'malformed references are dropped');
  assert.throws(() => dispatch('mentor.assignment.create', {...base, title:'Too many', groupId:'g-today-a', attachments:[1, 2, 3, 4, 5, 6].map(n => ref(`a${n}`, `${n}.pdf`))}), /up to 5/);
  assert.equal(assignedTasks(s, 'p-noor').find(t => t.id === id).attachments.length, 1);

  as('p-noor');
  assert.throws(() => dispatch('student.submit', {assignmentId:id, text:'  '}), /reflection/i);
  dispatch('student.submit', {assignmentId:id, text:'', files:[ref('att-noor', 'My map.pdf')]});
  s = read();
  const sub = s.submissions.find(x => x.assignmentId === id && x.studentId === 'p-noor');
  assert.equal(sub.files[0].name, 'My map.pdf');
  assert.equal(sub.file, 'My map.pdf');

  as('p-karim');
  dispatch('mentor.review', {id:sub.id, decision:'Needs Revision', feedback:'Add one sentence.', rating:7, criteria:{followed:'Solid', reflection:'Amazing', other:'Excellent'}});
  s = read();
  let reviewed = s.submissions.find(x => x.id === sub.id);
  assert.deepEqual(reviewed.evaluation, {criteria:{followed:'Solid'}}, 'only whole stars 1–5 and known criteria/levels are kept');

  as('p-noor');
  dispatch('student.submit', {assignmentId:id, text:'I added a sentence about the bus.', files:[]});
  as('p-karim');
  dispatch('mentor.review', {id:sub.id, decision:'Approved', feedback:'', rating:5, criteria:{followed:'Excellent', reflection:'Solid', evidence:'Excellent'}});
  s = read(); reviewed = s.submissions.find(x => x.id === sub.id);
  assert.equal(reviewed.evaluation.rating, 5);
  assert.equal(reviewed.attempt, 2);
  const firstAttempt = reviewed.history.find(h => h.text !== undefined);
  assert.equal(firstAttempt.files[0].name, 'My map.pdf');
  assert.deepEqual(firstAttempt.evaluation, {criteria:{followed:'Solid'}});
  const seen = assignedTasks(s, 'p-noor').find(t => t.id === id);
  assert.equal(seen.submission.evaluation.rating, 5);
  assert.equal(cleanEvaluation({}), null);
});

test('Task kit renders the to-do board, evaluation and due chips', () => {
  reset();
  dispatch('demo.coach-tasks');
  const s = read(), tasks = assignedTasks(s, 'p-rania');
  const html = todoBoard(tasks, {today:'2026-10-20', filter:'all'});
  assert.match(html, /data-tk-board/);
  assert.match(html, /Map your scroll triggers/);
  assert.match(html, /data-task-file/);
  assert.match(html, /tk-seal/);
  assert.match(evaluationView({decision:'Approved', evaluation:{rating:4}, feedback:'Nice'}), /Great work/);
  assert.match(dueChip('2026-10-18', '2026-10-20'), /2 days late/);
  assert.match(dueChip('2026-10-21', '2026-10-20'), /Due tomorrow/);
  // Demo data is added once.
  const count = read().assignments.length;
  dispatch('demo.coach-tasks');
  assert.equal(read().assignments.length, count);
});
