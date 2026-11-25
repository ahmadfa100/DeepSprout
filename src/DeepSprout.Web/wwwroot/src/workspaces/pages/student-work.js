import * as kit from '../../shared/task-kit.js';
import {workspaceRequest} from '../workspace-api.js';

const api = '/api/initiative-work/mine';
const statusLabel = value => ({InProgress:'In Progress',NeedsRevision:'Needs Revision'}[value] || value);
export const load = (initiative, id) => {
  const query = new URLSearchParams();
  if (initiative) query.set('initiative',initiative);
  if (id) query.set('id',id);
  return workspaceRequest(api+(query.size ? '?'+query : ''));
};

function card(task) {
  const {terms} = task;
  const attempts = task.attempts.map(row => {
    const review = row.reviews.at(-1);
    return {id:task.id+':'+row.attemptNo, text:row.body, attempt:row.attemptNo, submitted:row.submittedAtUtc,
      created:row.submittedAtUtc, status:statusLabel(review?.decision || 'Submitted'),
      feedback:review?.feedback, reviewedAt:review?.decidedAtUtc};
  });
  const submission = attempts.at(-1);
  if (submission) submission.history = attempts.slice(0,-1);
  const time = value => new Date(value).toLocaleString();
  const schedule = [terms.startsAtUtc ? 'Opens '+time(terms.startsAtUtc) : '',
    terms.dueAtUtc ? 'Due '+time(terms.dueAtUtc) : '',
    terms.allowLate ? 'Late responses allowed while the assignment is open.' : ''].filter(Boolean).join(' · ');
  return {id:task.id, title:terms.title, instructions:terms.instructions, due:terms.dueAtUtc?.slice(0,10),
    required:terms.isRequired, status:statusLabel(task.status), groupName:task.groupName, coach:task.author,
    activity:'Initiative assignment', audience:'you', actionable:task.canWork,
    canStart:task.canWork && task.status === 'Assigned', overdue:task.overdue, submission, textOnly:true, schedule,
    locked:!task.canWork, lockedReason:['Assigned','InProgress','NeedsRevision','Cancelled','Expired'].includes(task.status) ?
      task.cancelReason || 'This assignment is read-only until its schedule and group access allow work.' : ''};
}

export function render(tasks, key = 'live-student-work', detail = false) {
  return kit.todoBoard(tasks.map(card), {today:new Date().toISOString().slice(0,10),key,
    ...(detail ? {open:new Set(tasks.map(task=>task.id)),filter:'all'} : {}),
    formAttrs:'data-form="live-work-submit"',emptyText:'No Initiative assignments are available for this account.'});
}

export function save(task, step, body) {
  return workspaceRequest(`${api}/${task.initiativeId}/${task.id}/${step}`,
    {expectedAttemptNo:task.lastAttemptNo,revisionNo:task.terms.revisionNo,body});
}

export function mountActivities(host) {
  const section = document.getElementById('assigned');
  const count = document.getElementById('assigned-count');
  let tasks = [];
  const refresh = async () => {
    try {
      tasks = await load();
      section.hidden = !tasks.length && location.hash !== '#assigned';
      count.textContent = tasks.length ? tasks.length+' Initiative assignment(s)' : '';
      host.innerHTML = render(tasks,'live-individual-work');
    } catch {
      section.hidden = false;
      count.textContent = '';
      host.innerHTML = '<p class="form-error" role="alert">Assignments could not be loaded. Refresh to try again.</p>';
    }
  };
  const change = async (target, id, step, body) => {
    const task = tasks.find(row=>row.id === id);
    if (!task) return;
    const targetItem = target.closest('[data-tk-item]');
    target.disabled = true;
    try { await save(task,step,body); kit.openTasks.add(id); await refresh(); }
    catch (error) {
      let message = targetItem.querySelector('.tk-form-error');
      if (!message) {
        message = document.createElement('p');
        message.className = 'tk-form-error';
        message.setAttribute('role','alert');
        target.after(message);
      }
      message.textContent = error.message;
      target.disabled = false;
    }
  };
  host.addEventListener('submit',event=>{
    const form = event.target.closest('[data-tk-submit]');
    if (!form) return;
    event.preventDefault();
    change(form.querySelector('[type=submit]'),form.dataset.tkSubmit,'submit',form.elements.text.value);
  });
  host.addEventListener('click',event=>{
    const start = event.target.closest('[data-action=live-task-start]');
    if (start) change(start,start.dataset.id,'start');
  });
  window.addEventListener('hashchange',()=>{
    if (location.hash === '#assigned') { section.hidden = false; section.scrollIntoView({block:'start'}); }
  });
  if (location.hash === '#assigned') section.hidden = false;
  host.innerHTML = '<p role="status">Loading assignments…</p>';
  refresh().then(()=>{ if (location.hash === '#assigned') section.scrollIntoView({block:'start'}); });
}
