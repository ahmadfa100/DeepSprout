/**
 * Coach insights on the shared design system. Scope: only the groups this
 * Coach currently coaches (and owns, for independent Programs). Counts come
 * from assignments, submissions and review history; personal Lab, Shield and
 * Recovery data are never read.
 */
import * as u from '../../ui.js';
import * as ds from '../../ds.js';
import {clockDay} from '../../domain.js';
import {taskRows} from '../supervisor/insights.js';
import {timelineEvents, renderTimeline, scopeFor} from '../../timeline.js';

const TASK = [{key:'approved', label:'Approved', tone:'good'}, {key:'submitted', label:'Awaiting your review', tone:'s2'}, {key:'revision', label:'Needs revision', tone:'warning'}, {key:'open', label:'Not submitted', tone:'muted'}];

export function coachInsights(ctx, groups) {
  const {s, person:p} = ctx, today = clockDay(s);
  if (!groups.length) return '';
  const ids = new Set(s.assignments.filter(a => groups.some(g => g.id === a.groupId)).map(a => a.id));
  const subs = s.submissions.filter(x => ids.has(x.assignmentId));
  // Every attempt (current + earlier ones kept in history) and every review decision, dated.
  const attempts = subs.flatMap(x => [x.submitted, ...(x.history || []).filter(h => !h.decision && h.created).map(h => h.created)]).filter(Boolean);
  const reviews = subs.flatMap(x => (x.history || []).filter(h => h.decision && h.created).map(h => ({at:h.created, decision:h.decision})));
  const w1 = ds.weeklySeries(attempts, today, 8), w2 = ds.weeklySeries(reviews.map(r => r.at), today, 8);
  const scope = scopeFor(s, 'mentor', p.id); scope.groupIds = scope.groupIds.filter(id => groups.some(g => g.id === id));
  const events = timelineEvents(s, scope);
  return `<div class="ds-grid is-2-1">${ds.panel({title:'Task progress by group', eyebrow:'EVERY STUDENT × ACTIVE TASK', actions:u.link('Tasks', 'mentor/assignments', 'text-link'), body:ds.stackBars({title:'Task progress by group', rows:taskRows(s, groups), parts:TASK, summary:'One cell per student and active task. Approval comes from your review, never from a timer.'})})}
    ${ds.panel({title:'Review outcomes', eyebrow:'YOUR DECISIONS', actions:u.link('Reviews', 'mentor/reviews', 'text-link'), body:ds.donut({title:'Review outcomes', parts:[{label:'Approved', value:reviews.filter(r => r.decision === 'Approved').length, tone:'good'}, {label:'Needs revision', value:reviews.filter(r => r.decision === 'Needs Revision').length, tone:'warning'}, {label:'Not accepted', value:reviews.filter(r => r.decision === 'Rejected').length, tone:'critical'}, {label:'Waiting for you', value:subs.filter(x => x.status === 'Submitted').length, tone:'s2'}], center:{value:reviews.length, label:'reviews'}, summary:'Approved evidence counts once toward the Group Garden; it never also becomes a personal reward.'})})}</div>`
    + `<div class="ds-grid is-2-1">${ds.panel({title:'Submissions and reviews', eyebrow:'WEEKLY · LAST 8 WEEKS', body:ds.trendChart({title:'Submissions and reviews per week', periods:w1.periods, series:[{label:'Submissions (all attempts)', values:w1.values}, {label:'Your reviews', values:w2.values}], summary:`${attempts.length} submission attempt${attempts.length === 1 ? '' : 's'} and ${reviews.length} review decision${reviews.length === 1 ? '' : 's'} in your groups.`, empty:'No submissions or reviews in the last 8 weeks.', height:170})})}
    ${ds.panel({title:'Deadlines & sessions', eyebrow:'SCHEDULED · NOT YET HAPPENED', body:renderTimeline(s, {pending:[], past:[], upcoming:events.upcoming}, {lanes:['upcoming'], compact:true, headers:false, emptyText:'No upcoming deadlines or sessions.'})})}</div>`
    + ds.panel({title:'Your timeline', eyebrow:'SHARED TIMELINE · YOUR GROUPS ONLY', body:renderTimeline(s, {pending:events.pending, upcoming:[], past:events.past}, {lanes:['pending','past'], limit:8, emptyText:'Tasks, submissions and reviews in your groups will appear here.'})});
}
