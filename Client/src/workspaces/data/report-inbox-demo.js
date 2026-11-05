/** Fictional report documents for previewing the Institution inbox. */
import {groupMetrics, initiativeMetrics} from '../commands/initiative.js';

export function addReportInboxDemo(s) {
  const initiative = s.initiatives.find(i => i.id === 'i-today' && i.ownerId === 'org-horizon');
  const group = s.groups.find(g => g.id === 'g-today-a' && g.initiativeId === initiative?.id);
  if (!initiative || !group) return false;

  const coach = {
    id:'coach-report-preview', groupId:group.id, initiativeId:initiative.id,
    authorId:'p-karim', period:{from:'2026-10-14',to:'2026-10-20'},
    metrics:groupMetrics(s,group,'2026-10-14','2026-10-20'),
    observations:'Sample narrative: the group used the first session to choose manageable tasks. The next check-in will focus on what participants tried.',
    concerns:'Sample narrative: a few participants may need a clearer first step before the next task.',
    recommendations:'Sample recommendation: offer one short example and invite participants to choose their own ten-minute action.',
    status:'Submitted', created:'2026-10-21T14:00:00+03:00', submitted:'2026-10-21T14:00:00+03:00', sample:true
  };
  const summaries = [
    {
      id:'supervisor-report-preview-1', initiativeId:initiative.id, authorId:'p-hala',
      period:{from:'2026-10-14',to:'2026-10-20'},
      metrics:initiativeMetrics(s,initiative,'2026-10-14','2026-10-20'),
      coachReportIds:[coach.id],
      summary:'Sample summary: the opening sessions established a practical starting point. The attached Coach report describes the first group check-in.',
      issues:'Sample issue: review group staffing before the next workshop so each circle has a clear point of contact.',
      recommendations:'Sample next step: confirm the workshop roster and share a short preparation note with participants.',
      status:'Submitted',submitted:'2026-10-21T16:30:00+03:00',sample:true
    },
    {
      id:'supervisor-report-preview-2', initiativeId:initiative.id, authorId:'p-hala',
      period:{from:'2026-10-21',to:'2026-10-28'},
      metrics:initiativeMetrics(s,initiative,'2026-10-21','2026-10-28'),
      coachReportIds:[],
      summary:'Sample summary: the team prepared the next session and reviewed the participation records available for this period.',
      issues:'',
      recommendations:'Sample next step: continue checking attendance and task reviews against their original records.',
      status:'Submitted',submitted:'2026-10-29T11:15:00+03:00',sample:true
    }
  ];
  if (!s.coachReports.some(r => r.id === coach.id)) s.coachReports.push(coach);
  for (const report of summaries) if (!s.supervisorSummaries.some(r => r.id === report.id)) s.supervisorSummaries.push(report);
  return true;
}
