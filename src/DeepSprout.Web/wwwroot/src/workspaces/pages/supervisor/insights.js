/**
 * Supervisor insights on the shared design system. Scope is the Supervisor's
 * active Initiative grant (sessions, groups, excuses) or accepted Outdoor
 * Activity appointments. Attendance facts stay factual: an accepted excuse
 * never turns Absent into Present, and attendance is not completion.
 */
import * as u from '../../ui.js';
import * as ds from '../../ds.js';
import {sessionRoster} from '../../../shared/selectors.js';
import {summary} from '../institution/common.js';
import {clockDay} from '../../domain.js';
import {timelineEvents, renderTimeline, scopeFor} from '../../timeline.js';

const ATT = [{key:'present', label:'Present', tone:'good'}, {key:'late', label:'Late', tone:'warning'}, {key:'absent', label:'Absent', tone:'critical'}, {key:'none', label:'Not recorded', tone:'muted'}];
const TASK = [{key:'approved', label:'Approved', tone:'good'}, {key:'submitted', label:'Awaiting review', tone:'s2'}, {key:'revision', label:'Needs revision', tone:'warning'}, {key:'open', label:'Not submitted', tone:'muted'}];

/** Attendance facts per started session, from the confirmed roster. */
export function attendanceRows(s, sessions) {
  const day = clockDay(s);
  return sessions.filter(ss => ss.status === 'Published' && ss.attendanceRequired !== false && ss.date <= day).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(-8).map(ss => {
    const roster = sessionRoster(s, ss), v = {present:0, late:0, absent:0, none:0};
    for (const r of roster) { const st = r.attendance?.status; if (st === 'Present') v.present++; else if (st === 'Late') v.late++; else if (st === 'Absent') v.absent++; else v.none++; }
    return {label:ss.title, sub:`${u.date(ss.date)} · ${roster.length} confirmed`, values:v};
  });
}
/** Task state per group, counted per (student × assignment). */
export function taskRows(s, groups) {
  return groups.map(g => {
    const v = {approved:0, submitted:0, revision:0, open:0};
    for (const a of s.assignments.filter(a => a.groupId === g.id && a.status === 'Active')) for (const pid of g.memberIds.filter(pid => !a.studentId || a.studentId === pid)) {
      const sub = s.submissions.find(x => x.assignmentId === a.id && x.studentId === pid);
      if (!sub) v.open++; else if (sub.status === 'Approved') v.approved++; else if (sub.status === 'Needs Revision') v.revision++; else if (sub.status === 'Submitted') v.submitted++; else v.open++;
    }
    return {label:g.name, sub:`${g.memberIds.length} student${g.memberIds.length === 1 ? '' : 's'}`, values:v};
  });
}

export function supervisorInsights(ctx, i) {
  const {s} = ctx, sum = summary(s, i);
  const att = attendanceRows(s, sum.sessions), tasks = taskRows(s, sum.groups);
  const ex = (s.excuses || []).filter(x => x.initiativeId === i.id);
  const exParts = [{label:'Waiting for you', value:ex.filter(x => x.status === 'Submitted').length, tone:'warning'}, {label:'Recommended · with Representative', value:ex.filter(x => x.status === 'Recommended').length, tone:'s2'}, {label:'Accepted', value:ex.filter(x => x.status === 'Accepted').length, tone:'good'}, {label:'Not accepted', value:ex.filter(x => ['Declined', 'Rejected'].includes(x.status)).length, tone:'critical'}, {label:'More information asked', value:ex.filter(x => x.status === 'Info Requested').length, tone:'muted'}];
  const totals = att.reduce((t, r) => { for (const k of Object.keys(r.values)) t[k] = (t[k] || 0) + r.values[k]; return t; }, {});
  return `<div class="ds-grid is-2-1">${ds.panel({title:'Attendance by session', eyebrow:'FACTUAL RECORDS · STARTED SESSIONS', actions:u.link('Attendance', `supervisor/attendance?initiative=${i.id}`, 'text-link'), body:ds.stackBars({title:'Attendance by session', rows:att, parts:ATT, summary:att.length ? `${totals.present || 0} present, ${totals.late || 0} late, ${totals.absent || 0} absent and ${totals.none || 0} not yet recorded across the last ${att.length} session${att.length === 1 ? '' : 's'}. Excuses never change these facts.` : '', empty:'No attendance-bearing session has started yet.'})})}
    ${ds.panel({title:'Excuses', eyebrow:'YOU RECOMMEND · THE REPRESENTATIVE DECIDES', actions:u.link('Excuses', `supervisor/excuses?initiative=${i.id}`, 'text-link'), body:ds.donut({title:'Excuses by state', parts:exParts, center:{value:ex.length, label:'excuses'}, summary:'An accepted excuse is a decision, not attendance.'})})}</div>`
    + ds.panel({title:'Task progress by group', eyebrow:'COACH-ASSIGNED WORK · EVERY STUDENT × TASK', actions:u.link('Coaches & students', 'supervisor/coaches', 'text-link'), body:ds.stackBars({title:'Task progress by group', rows:tasks, parts:TASK, summary:tasks.length ? 'Counts one cell per student and active task. Reviews are the Coach’s; you see states, not submitted work.' : '', empty:'No groups yet.'})});
}

/** The shared timeline in the Supervisor's scope: their grants and accepted appointments only. */
export function supervisorTimeline(ctx, {initiativeId = null} = {}) {
  const {s, person:p} = ctx, scope = scopeFor(s, 'supervisor', p.id);
  if (initiativeId) { scope.initiativeIds = scope.initiativeIds.filter(id => id === initiativeId); scope.groupIds = s.groups.filter(g => g.initiativeId === initiativeId).map(g => g.id); }
  return ds.panel({title:'Operational timeline', eyebrow:'SHARED TIMELINE · YOUR ASSIGNMENTS ONLY', body:renderTimeline(s, timelineEvents(s, scope), {limit:8, emptyText:'Records from your assignments will appear here.'})});
}
