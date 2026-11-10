/**
 * Workspace menus. An entry is [routeKey, icon, label]; ['§', 'Group label']
 * starts a labelled group in the sidebar. The Outdoor Provider workspace is
 * retired: Institutions organize Outdoor Activities, and `provider/*` routes
 * only explain the change.
 */
export const labels={mentor:'Coach',student:'Invited Student',organization:'Institution',provider:'Outdoor Provider (retired)',supervisor:'Supervisor',admin:'Admin',participant:'Explore opportunities'};
export const defaults={mentor:'dashboard',student:'dashboard',organization:'dashboard',provider:'retired',supervisor:'dashboard',admin:'overview',participant:'discover'};
export const navigation={
 mentor:[['dashboard','home','Dashboard'],['§','Teaching'],['groups','nodes','My Groups'],['students','people','Students'],['assignments','form','Tasks'],['reviews','check','Reviews'],['§','Insight'],['reports','chart','Reports'],['notifications','mail','Notifications'],['profile','settings','Profile & settings']],
 student:[['dashboard','home','My overview'],['group','calendar','Sessions & initiative'],['tasks','form','Tasks & forms'],['progress','check','Attendance'],['garden','leaf','Group Garden'],['notifications','mail','Updates'],['account','settings','Account & upgrade']],
 organization:[['dashboard','home','Dashboard'],['§','Create & run'],['initiatives','nodes','Initiatives'],['activities','mountain','Outdoor Activities'],['sessions','calendar','Sessions & workshops'],['forms','form','Forms & surveys'],['competitions','trophy','Competitions'],['§','People'],['participants','people','Applications'],['bookings','ticket','Bookings & waitlist'],['team','people','Team & Groups'],['attendance','check','Attendance & excuses'],['§','Insight'],['reports','chart','Reports'],['settings','settings','Settings']],
 supervisor:[['dashboard','home','Dashboard'],['§','Today'],['schedule','calendar','Sessions & meetings'],['attendance','check','Attendance'],['excuses','mail','Excuses'],['applications','check','Applications'],['competitions','trophy','Competitions'],['§','People'],['coaches','people','Coaches & students'],['students','nodes','Groups'],['experiences','mountain','Outdoor activities'],['cohorts','people','Activity groups'],['evaluations','form','Completion'],['§','Insight'],['reports','chart','Reports']],
 admin:[['overview','home','Dashboard'],['§','Governance'],['organizations','mail','Requests'],['institutions','nodes','Institutions'],['initiatives','calendar','Initiatives'],['activities','mountain','Outdoor Activities'],['§','Platform'],['users','people','People'],['moderation','shield','Community'],['assessments','edit','Quick Setup'],['system-journey','nodes','System Journey']],
 participant:[['discover','mountain','Explore opportunities'],['registrations','calendar','My Registrations'],['initiatives','nodes','My Initiatives'],['account','settings','My Account']]
};
/** Menu entries only (no group labels). */
export const pagesOf = area => (navigation[area] || []).filter(([key]) => key !== '§');
