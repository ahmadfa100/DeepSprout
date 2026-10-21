/* Chapter 5 · Coaching, sessions, attendance and reports (§13.3, §15.4, §17, §17.1, §21.4 E–H). */
export default f => ({
  id: 'operations', n: 5, title: 'Coaching, sessions, attendance and reports', short: 'Coaching & attendance',
  layout: { coach: [200, 270], assignment: [500, 270], student: [800, 270], garden: [350, 450], groupGarden: [650, 450], individual: [200, 270], session: [500, 270], supervisor: [800, 270], qr: [500, 270], attendance: [500, 420], rabbit: [800, 270], rep: [800, 420], completion: [500, 270], insights: [800, 420] },
  labels: { student: 'Student' },
  steps: [
    {
      id: 'ops-assign', overview: true,
      title: 'A Coach assigns an approved practice',
      summary: 'The Coach picks an approved catalog activity, adds instructions and a due window, and assigns it to their group. The task appears wherever the student works.',
      brief: 'A Coach assigns an approved practice; it appears in the student’s own task list.',
      show: ['coach', 'assignment', 'student'],
      edges: ['coach>assignment', 'assignment>student'], flows: ['coach>assignment', 'assignment>student'], sequence: true, token: 'doc',
      status: { assignment: 'Assigned' },
      note: { kind: 'event', title: 'Task assigned', text: 'The same Assignment shows in a limited Student’s My Tasks and in a full Individual’s Activities → Assigned.' },
      details: {
        what: 'A Coach created an Assignment for an assigned group.',
        who: 'Assigned Coach (Initiative or independent Program).',
        changed: 'One Assignment with activity version, instructions, required flag, start/due window and review method.',
        visible: 'Students in that group; the Coach’s queue; Supervisor Insights summaries; Representative reports.',
        rules: ['Coaches see and assign only to their assigned groups (D31).', 'One shared assignment engine for Initiative and Program contexts (§13.1).', 'A student cannot edit the Coach’s underlying assignment (§5.2).'],
        where: ['mentor/assignments', 'student/tasks', 'training.html']
      },
      spec: ['§13.2', '§13.3', '§21.4 E', 'D31'], scenarios: ['C']
    },
    {
      id: 'ops-submit',
      title: 'The student submits their work',
      summary: 'The student completes the task and submits it. Each submission is kept as its own version.',
      show: ['coach', 'assignment', 'student'],
      edges: ['coach>assignment', 'assignment>student'], flows: ['<assignment>student'], token: 'edit',
      status: { assignment: ['Assigned', 'Submitted'] },
      note: { kind: 'event', title: 'Work submitted', text: 'The Coach’s review queue now shows the submission with its evidence and version.' },
      details: {
        what: 'A Submission was recorded against the Assignment.',
        who: 'The student.',
        changed: 'Assignment Assigned → In Progress → Submitted; a versioned Submission.',
        visible: 'The Coach’s Reviews queue; the student’s task history.',
        rules: ['Submission history is immutable; later attempts add versions (D32).', 'Overdue is derived from due time and status, not stored as a judgment (§13.3).'],
        where: ['student/tasks', 'training.html', 'mentor/reviews']
      },
      spec: ['§13.3', 'D32'], scenarios: ['C']
    },
    {
      id: 'ops-revision',
      title: 'Needs revision, then resubmission',
      summary: 'The Coach asks for a revision with feedback for the student. A separate internal note can go to the Supervisor. The student resubmits, and both attempts are kept.',
      show: ['coach', 'assignment', 'student'],
      edges: ['coach>assignment', 'assignment>student'], flows: ['coach>assignment', 'assignment>student'], sequence: true, token: 'bubble',
      status: { assignment: ['Submitted', '!Needs Revision'] },
      note: { kind: 'info', title: 'Two kinds of comment', text: 'Student-facing feedback and Supervisor-only notes are different fields with different readers. Neither becomes a grade or a wellbeing judgment.' },
      details: {
        what: 'The Coach returned the submission for revision.',
        who: 'Assigned Coach.',
        changed: 'Review decision Needs Revision; prior submission preserved; resubmission becomes a new version.',
        visible: 'Student sees feedback; Supervisor sees the internal note in Insights.',
        rules: ['Assigned → In Progress → Submitted → Approved | Needs Revision | Rejected (§13.3).', 'Separate student feedback and internal Supervisor notes (D33).'],
        where: ['mentor/reviews', 'student/tasks']
      },
      spec: ['§13.3', 'D32', 'D33'], scenarios: ['C']
    },
    {
      id: 'ops-approve',
      title: 'The Coach approves the work',
      summary: 'The resubmission is approved. Approved, eligible work is processed once as evidence for the student’s matching practice tree and for the Initiative’s Group Garden.',
      show: ['coach', 'assignment', 'student'],
      edges: ['coach>assignment', 'assignment>student'], flows: ['coach>assignment'], token: 'check',
      status: { assignment: ['Resubmitted', 'Approved'] },
      note: { kind: 'event', title: 'Work approved', text: 'One review decision, one version. Approving again later would not create a second reward.' },
      details: {
        what: 'The Coach approved the resubmitted work.',
        who: 'Assigned Coach.',
        changed: 'Review → Approved; one eligible evidence event with assignment and review IDs.',
        visible: 'Student, Coach, Supervisor Insights and Representative reports.',
        rules: ['Approved eligible evidence is processed once (D11).', 'A system-scored activity may approve under a published validation rule (§13.3).'],
        fails: ['A duplicate approval gives one reward (TASK-09).'],
        where: ['mentor/reviews', 'student/progress']
      },
      spec: ['§13.3', '§9.2', '§25.1 TASK-09', 'D11'], scenarios: ['C']
    },
    {
      id: 'ops-reward',
      title: 'One event, two gardens, counted once',
      summary: 'The approved work can progress the student’s matching practice-type tree in their Personal Garden and add one contribution to the Initiative’s Group Garden.',
      show: ['assignment', 'garden', 'groupGarden'],
      at: { assignment: [500, 130], garden: [300, 420], groupGarden: [700, 420] },
      subs: { garden: 'Matching practice tree', groupGarden: 'Whole Initiative' },
      edges: ['assignment>garden', 'assignment>groupGarden'], flows: ['assignment>garden', 'assignment>groupGarden'], token: 'leaf',
      note: { kind: 'info', title: 'Source-backed growth', text: 'Each reward consumes a unique source event. There is no grow button, and an Invited Student sees only the Group Garden until upgrading.' },
      details: {
        what: 'A reward evaluator applied the approved event to eligible gardens.',
        who: 'Reward rules (no person presses a button).',
        changed: 'One Personal practice-tree progress effect when eligible, and one Initiative-level Group Garden contribution.',
        visible: 'The student’s Personal Garden (full Individuals only) and the Initiative Group Garden for all its members and staff.',
        rules: ['Exactly four Personal trees, one per practice type; no fifth tree (D07, D08).', 'One Group Garden per Institution Initiative across all internal groups (D13).', 'A duplicate source ID is refused (§9.2).'],
        where: ['garden.html', 'organization/group-garden', 'student/garden']
      },
      spec: ['§9.1', '§9.2', '§21.4 H', 'D07', 'D11', 'D13'], scenarios: ['C']
    },
    {
      id: 'ops-session-register',
      title: 'Registering for a session',
      summary: 'An accepted participant registers separately for a session, choosing a mode if it is hybrid. That registration has its own seat pool and status.',
      show: ['individual', 'session'],
      at: { individual: [300, 270], session: [700, 270] },
      labels: { individual: 'Accepted participant' }, shorts: { individual: 'Participant' },
      edges: ['individual>session'], flows: ['individual>session'], token: 'calendar',
      status: { session: ['Requested', 'Confirmed'] },
      note: { kind: 'event', title: 'Session registration confirmed', text: 'A confirmed in-person registration gets a booking QR. Online registrations rely on the participant roster instead.' },
      details: {
        what: 'A Session Registration was confirmed.',
        who: 'The participant.',
        changed: 'Session Registration Confirmed, in the selected mode.',
        visible: 'Participant’s My Registrations and the session roster.',
        rules: ['Session booking is a separate record from admission (D39).', 'Hybrid sessions can have separate capacity per mode (§11.2).'],
        where: ['explore.html', 'organization/sessions']
      },
      spec: ['§11.2', '§15.1', 'D39'], scenarios: ['B']
    },
    {
      id: 'ops-needs-supervisor',
      title: 'No active Supervisor, no attendance',
      summary: 'A session that records attendance needs an active, authorized Supervisor. Until one is assigned, confirmation is disabled and the session shows Needs Supervisor.',
      show: ['session', 'supervisor'],
      at: { session: [500, 140], supervisor: [500, 420] },
      edges: ['session>supervisor'],
      status: { session: '!Needs Supervisor', supervisor: '!Not active' },
      dim: ['supervisor'],
      focus: ['session'],
      note: { kind: 'caution', title: 'Permission required', text: 'Attendance confirmation is unavailable until an active authorized Supervisor is assigned.' },
      details: {
        what: 'A session without an active Supervisor appointment.',
        who: 'Not applicable; the rule blocks confirmation.',
        changed: 'Nothing can be confirmed. An alert appears on the session and the Representative dashboard.',
        visible: 'Representative dashboard and session detail show Needs Supervisor.',
        rules: ['Attendance requires an active authorized Supervisor (D38).', 'The warning returns whenever an appointment lapses or is revoked.', 'Content-only or survey-only Initiatives need no Supervisor (D38).'],
        fails: ['A revoked Supervisor cannot confirm attendance (SUP-06).'],
        where: ['organization/sessions', 'organization/dashboard', 'supervisor/attendance']
      },
      spec: ['§15', '§17.1', '§25.1 SUP-06', 'D38'], scenarios: ['B']
    },
    {
      id: 'ops-qr', overview: true,
      title: 'In person: the Supervisor verifies a booking QR',
      summary: 'The participant shows the QR for their confirmed booking. The assigned Supervisor validates the booking, session, check-in window and their own active appointment, then records attendance.',
      brief: 'The assigned Supervisor validates the participant’s booking QR and records attendance.',
      show: ['individual', 'qr', 'supervisor'],
      labels: { individual: 'Participant' },
      edges: ['individual>qr', 'qr>supervisor'], flows: ['individual>qr', 'qr>supervisor'], sequence: true, token: 'qr',
      status: { individual: ['Confirmed', 'Present'] },
      focus: ['supervisor', 'individual'],
      note: { kind: 'event', title: 'Attendance verified', text: 'The assigned Supervisor verified this Session registration and recorded factual attendance.' },
      details: {
        what: 'Factual attendance was recorded from a validated booking QR.',
        who: 'Active assigned Supervisor.',
        changed: 'Attendance Present (or Late) with method, actor, time and booking reference.',
        visible: 'Participant’s sessions and Insights, owner roster, Supervisor Insights, Representative reports and the reward evaluator.',
        rules: ['QR identifies a specific booking and session, not the person’s login (§16.2).', 'QR is primary for in-person sessions only (D37).', 'A replay or duplicate scan is idempotent (ATT-11).', 'Check-in is not completion, learning or cognitive improvement (§23.2).'],
        fails: ['Invalid or reused code, wrong session, outside the window, or inactive appointment: refused with the reason.'],
        where: ['supervisor/attendance', 'organization/attendance', 'insights.html']
      },
      simulated: 'The QR is rendered locally; signed, non-replayable QR codes are a future backend requirement.',
      spec: ['§16.2', '§17.1', '§23.2', '§25.1 ATT-11', 'D37'], scenarios: ['B', 'D']
    },
    {
      id: 'ops-methods',
      title: 'Typed code, manual exception, online roster',
      summary: 'Without a camera, the Supervisor can type the booking code. A manual check-in is a reasoned exception for a confirmed roster member. Online sessions use roster verification, and hybrid follows the participant’s chosen mode.',
      show: ['supervisor', 'qr', 'attendance', 'session'],
      at: { supervisor: [500, 120], qr: [250, 420], attendance: [500, 420], session: [750, 420] },
      labels: { qr: 'Typed code', attendance: 'Manual exception', session: 'Online roster' },
      shorts: { qr: 'Code', attendance: 'Manual', session: 'Online' },
      subs: { qr: 'Phase-1 fallback', attendance: 'Reason + actor + time', session: 'online-verified' },
      edges: ['supervisor>qr', 'supervisor>attendance', 'supervisor>session'], flows: ['supervisor>qr', 'supervisor>attendance', 'supervisor>session'], token: 'check',
      note: { kind: 'info', title: 'One fact, several methods', text: 'Whatever the method, the result is one factual attendance value with its method recorded. Opening a meeting link alone is not attendance.' },
      details: {
        what: 'The valid attendance methods besides scanning a QR.',
        who: 'Active assigned Supervisor.',
        changed: 'Attendance with method: typed code, manual exception (reason required) or online-verified.',
        visible: 'Same readers as QR attendance.',
        rules: ['Typed or pasted booking code is a valid Phase-1 fallback (D37).', 'Manual check-in requires a reason, actor and timestamp, for a confirmed roster member only (§17.1).', 'Online: confirm from the roster and record online-verified (§17.1).', 'Hybrid: apply the method for the participant’s selected mode.'],
        where: ['supervisor/attendance']
      },
      spec: ['§17.1', '§23.2', 'D37'], scenarios: ['B']
    },
    {
      id: 'ops-rabbit',
      title: 'Eligible attendance may unlock a rabbit',
      summary: 'Confirmed eligible session attendance may unlock a small rabbit in the participant’s Personal Garden. The number of rabbits is bounded by policy.',
      show: ['attendance', 'rabbit'],
      at: { attendance: [300, 270], rabbit: [700, 270] },
      labels: { attendance: 'Confirmed attendance' }, shorts: { attendance: 'Attendance' },
      subs: { rabbit: 'Personal Garden' },
      edges: ['attendance>rabbit'], flows: ['attendance>rabbit'], token: 'leaf',
      note: { kind: 'info', title: 'Bounded decoration', text: 'A rabbit is a small, capped decoration, not one object per check-in. Registering, booking or an accepted excuse never earns one.' },
      details: {
        what: 'The reward evaluator applied a confirmed attendance event.',
        who: 'Reward rules.',
        changed: 'One bounded rabbit effect, referencing session, registration, Supervisor and method.',
        visible: 'The participant’s Personal Garden and its source history.',
        rules: ['Confirmed eligible session attendance → bounded rabbit (D09).', 'Registration, booking, clicking or an accepted excuse grants nothing (§9.1).', 'A correction keeps the original evidence and re-evaluates the reward transparently (§17.1).'],
        where: ['garden.html', 'insights.html']
      },
      spec: ['§9.1', '§9.2', 'D09'], scenarios: ['B']
    },
    {
      id: 'ops-excuse',
      title: 'A student explains an absence',
      summary: 'A student marked Absent submits an excuse for that specific session, with a short explanation and an optional restricted attachment.',
      show: ['student', 'supervisor', 'rep'],
      at: { student: [200, 420], supervisor: [500, 140], rep: [800, 420] },
      edges: ['student>supervisor', 'supervisor>rep', 'rep>student:under'], flows: ['student>supervisor'], token: 'bubble',
      status: { student: 'Absent' },
      note: { kind: 'event', title: 'Excuse submitted', text: 'The excuse is a separate decision record. The student’s factual attendance stays Absent whatever happens next.' },
      details: {
        what: 'An Excuse record was created for one missed session.',
        who: 'The student.',
        changed: 'Excuse Pending; attendance unchanged.',
        visible: 'The Supervisor’s Notes & Excuses queue; the Coach only sees necessary consequences.',
        rules: ['Excuse is a decision record separate from attendance (D36).', 'Attachments have a narrow, restricted scope.'],
        where: ['supervisor/excuses', 'organization/attendance']
      },
      spec: ['§17.1', '§21.4 G', 'D35', 'D36'], scenarios: ['B']
    },
    {
      id: 'ops-excuse-recommend',
      title: 'The Supervisor recommends',
      summary: 'The Supervisor adds context and a recommendation to accept or reject, or asks for more information. The final decision is not theirs.',
      show: ['student', 'supervisor', 'rep'],
      at: { student: [200, 420], supervisor: [500, 140], rep: [800, 420] },
      edges: ['student>supervisor', 'supervisor>rep', 'rep>student:under'], flows: ['supervisor>rep'], token: 'doc',
      status: { student: 'Absent', supervisor: 'Recommends accept' },
      note: { kind: 'info', title: 'Recommendation only', text: 'The Supervisor’s note and recommendation travel to the Representative, who makes the final decision.' },
      details: {
        what: 'A recommendation was attached to the excuse.',
        who: 'Initiative Supervisor.',
        changed: 'Excuse gains a Supervisor note and recommendation.',
        visible: 'Representative’s excuse queue.',
        rules: ['Student excuse → Supervisor recommendation → Representative final decision (D35).'],
        where: ['supervisor/excuses', 'organization/attendance']
      },
      spec: ['§17.1', 'D35'], scenarios: ['B']
    },
    {
      id: 'ops-excuse-decide', overview: true,
      title: 'The Representative decides; Absent stays Absent',
      summary: 'The Representative accepts the excuse with a reason and the student is notified. The display can read “Excused absence”, but the factual status remains Absent.',
      brief: 'The Representative accepts the excuse. The record stays Absent, with no attendance reward.',
      show: ['student', 'supervisor', 'rep'],
      at: { student: [200, 420], supervisor: [500, 140], rep: [800, 420] },
      edges: ['student>supervisor', 'supervisor>rep', 'rep>student:under'], flows: ['rep>student'], token: 'scale',
      status: { student: ['Absent', 'Absent + excused'] },
      note: { kind: 'caution', title: 'An excuse is not attendance', text: 'Accepting an excuse never creates attendance or a rabbit. Any effect on completion must come from a published makeup or waiver policy.' },
      details: {
        what: 'The Representative recorded the final decision.',
        who: 'Institution Representative.',
        changed: 'Excuse → Accepted with reason; attendance remains Absent.',
        visible: 'Student notice; reports count factual attendance and excuse outcomes separately.',
        rules: ['Excused Absence = Absent + accepted excuse, never a presence value (§23.2).', 'Accepted excuse grants no attendance reward (D36, EXC-10).', 'Representative alone finalizes excuses (D35).'],
        where: ['organization/attendance', 'organization/reports']
      },
      spec: ['§17.1', '§23.2', '§25.1 EXC-10', 'D35', 'D36'], scenarios: ['B']
    },
    {
      id: 'ops-completion',
      title: 'Completion follows the published rule',
      summary: 'Initiative completion is decided against its declared criteria, not inferred from a check-in. It appears as Completed in history and Insights and can add an Initiative collective milestone.',
      show: ['student', 'completion', 'groupGarden', 'insights'],
      at: { student: [200, 270], completion: [500, 270], groupGarden: [800, 140], insights: [800, 420] },
      labels: { insights: 'History & Insights' }, shorts: { insights: 'Insights' },
      edges: ['student>completion', 'completion>groupGarden:side', 'completion>insights:side'], flows: ['completion>groupGarden', 'completion>insights'], token: 'flag',
      status: { completion: 'Completed' },
      note: { kind: 'info', title: 'No Personal Garden object', text: 'Initiative and Coach Program completion share one achievement classification. Neither adds a Personal Garden tree or decoration.' },
      details: {
        what: 'A student met the Initiative’s declared completion criteria.',
        who: 'Recorded under the Initiative’s completion policy by authorized staff.',
        changed: 'Completion record; My Initiatives shows Completed.',
        visible: 'Student history and Insights → Offline & Experiences; source-backed milestone in the Initiative Group Garden where applicable.',
        rules: ['Completion is never inferred from a check-in or an accepted excuse (§15.2).', 'Completion adds no Personal Garden object (D10).'],
        where: ['explore.html', 'insights.html', 'organization/group-garden', 'organization/reports']
      },
      spec: ['§9.1', '§15.2 stage 5', 'D10', 'D39'], scenarios: ['B']
    },
    {
      id: 'ops-reports', overview: true,
      title: 'Coach report → Supervisor Insights → Representative report',
      summary: 'Coaches write periodic reports. The Supervisor’s Insights are computed from the original records and add a summary. The Representative’s reports roll these up and can drill into permitted originals.',
      brief: 'Coach reports feed Supervisor Insights, which feed Representative reports.',
      show: ['coach', 'supervisor', 'rep'],
      at: { coach: [200, 270], supervisor: [500, 270], rep: [800, 270] },
      edges: ['coach>supervisor', 'supervisor>rep'], flows: ['coach>supervisor', 'supervisor>rep'], sequence: true, token: 'chart',
      note: { kind: 'event', title: 'Report updated', text: 'A reviewed assignment can contribute to the Coach’s report and the authorized Supervisor’s source-based insights.' },
      details: {
        what: 'Reporting flowed up the Initiative’s chain.',
        who: 'Coach (report), Supervisor (summary), Representative (reports).',
        changed: 'Coach Report and Supervisor Summary versions; counts are computed, interpretation is authored.',
        visible: 'Supervisor Insights tabs; Representative Reports with permitted drilldown and export.',
        rules: ['Counts come from actual records with stated window, denominator and source (§15.4).', 'Coach Reports → Supervisor Insights/Summary → Representative Reports (D34).', 'No private Lab, Shield or Recovery data appears (§23.1).', 'Initiative participation never changes personal Lab scores or Recovery metrics (D46).'],
        where: ['mentor/reports', 'supervisor/reports', 'organization/reports', 'admin/reports']
      },
      spec: ['§15.4', '§17', 'D33', 'D34', 'D46'], scenarios: ['B', 'C']
    }
  ]
});
