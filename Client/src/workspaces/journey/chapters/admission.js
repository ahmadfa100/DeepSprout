/* Chapter 4 · Participants and admission (§11, §15.3, §21.4 D, §23, D25–D29). */
export default f => ({
  id: 'admission', n: 4, title: 'Participants and admission', short: 'Admission',
  layout: { individual: [200, 270], explore: [500, 270], initiative: [800, 270], application: [500, 140], rep: [250, 420], supervisor: [750, 420], applicant: [700, 420], group: [250, 270], 'group.b': [750, 270], student: [500, 270], session: [800, 140], experience: [800, 420] },
  labels: { individual: 'Individual', 'group.b': 'Group B', group: 'Group A' },
  steps: [
    {
      id: 'adm-discover', overview: true,
      title: 'An Individual finds the Initiative in Explore',
      summary: 'Published Initiatives appear in regular Explore with topic, Institution, audience, mode, dates and the components involved. Drafts never appear.',
      brief: 'Published Initiatives appear in the regular Individual Explore.',
      show: ['individual', 'explore', 'initiative'],
      edges: ['individual>explore', 'explore>initiative'], flows: ['individual>explore', 'explore>initiative'], sequence: true, token: 'globe',
      status: { initiative: 'Published' },
      note: { kind: 'info', title: 'Discovery, not enrolment', text: 'Finding an Initiative changes nothing. A preferred city is only a discovery preference; online Initiatives may be open beyond it.' },
      details: {
        what: 'An Individual opened the Initiative’s detail page from Explore.',
        who: 'Individual.',
        changed: 'No record changes.',
        visible: 'Explore shows only published listings; mock or demo listings are labeled as such.',
        rules: ['Explore filters by kind, mode (online, in-person, hybrid), topic, date, location and availability (§11.1).', 'Headquarters, coverage, venue and the user’s preferred city are separate fields.', 'Joining an Initiative does not book its sessions (§11.2).'],
        where: ['explore.html', 'index.html']
      },
      spec: ['§11.1', '§11.2', '§21.1'], scenarios: ['B']
    },
    {
      id: 'adm-apply', overview: true,
      title: 'The Individual applies once',
      summary: 'The Individual submits one application with the required identified form and consent. My Initiatives shows it as Pending. A pending application holds no seat.',
      brief: 'The Individual applies once and sees Pending. Pending holds no seat.',
      show: ['individual', 'application'],
      at: { individual: [250, 270], application: [750, 270] },
      edges: ['individual>application'], flows: ['individual>application'], token: 'doc',
      status: { application: 'Pending' },
      note: { kind: 'event', title: 'Application submitted', text: 'One Application record now exists. The same record will appear in the Representative’s and the Supervisor’s queues.' },
      details: {
        what: 'An application was submitted for one Initiative.',
        who: 'The Individual (or an eligible invited person).',
        changed: 'One Application in Pending, pinned to the form version and consent given.',
        visible: 'The applicant’s My Initiatives; the Representative’s Applications & Students; the active Initiative Supervisor’s Applications queue.',
        rules: ['One person applies once per Initiative (§15.3).', 'Phase-1 forms are identified; sensitive answers have narrow readers (§15.4).', 'Joining an Initiative does not force the personal four assessments (§14).'],
        fails: ['Applying again while Pending, Accepted, Suspended or Blocked is refused.', 'An application outside the window or eligibility rules is refused with the reason.'],
        where: ['explore.html', 'organization/participants', 'supervisor/applications']
      },
      spec: ['§14', '§15.3', '§15.4', '§21.4 D'], scenarios: ['B']
    },
    {
      id: 'adm-shared-queue',
      title: 'One record, two reviewers',
      summary: 'The Representative and the active Initiative Supervisor see the same application. Either of them can carry out the single final approval.',
      show: ['application', 'rep', 'supervisor'],
      edges: ['application>rep', 'application>supervisor'], flows: ['application>rep', 'application>supervisor'], token: 'doc',
      status: { application: 'Pending' },
      note: { kind: 'info', title: 'Same Application ID', text: 'Neither reviewer has a copy. Both queues read one Application record, so a decision by one is immediately visible to the other.' },
      details: {
        what: 'The pending application surfaced in both authorized queues.',
        who: 'Read by the Representative and the active Initiative Supervisor.',
        changed: 'Nothing.',
        visible: 'Both reviewers see eligibility, consent, allowed responses and the decision log.',
        rules: ['Representative and active Supervisor see the same Application record (D25).', 'Only an active Supervisor appointment for this Initiative qualifies.'],
        where: ['organization/participants', 'supervisor/applications']
      },
      spec: ['§15.3', '§17', 'D25'], scenarios: ['B']
    },
    {
      id: 'adm-approve', overview: true,
      title: 'An authorized reviewer approves',
      summary: `The Supervisor rechecks identity, eligibility, Initiative state and the seat count, then approves. The participant now holds one of the Initiative’s ${f.seats} accepted seats.`,
      brief: 'An authorized reviewer approves; the participant takes one accepted seat.',
      show: ['application', 'rep', 'supervisor'],
      edges: ['application>rep', 'application>supervisor'], flows: ['<application>supervisor'], token: 'check',
      status: { application: ['Pending', 'Accepted'] },
      note: { kind: 'event', title: 'Application approved', text: 'An authorized reviewer approved the application. The participant now occupies one accepted Initiative seat.' },
      details: {
        what: 'The application moved from Pending to Accepted.',
        who: 'Active Initiative Supervisor (the Representative could equally have done it).',
        changed: 'Application Pending → Accepted; one Initiative Membership and one accepted seat.',
        visible: 'The participant’s My Initiatives shows Accepted; both queues update; the student enters the unallocated group pool.',
        rules: [`At most ${f.seats} accepted students per Initiative (D28).`, 'Approval is one operation on one record (D25).', 'A concurrent duplicate approval yields one membership and one seat (ADMIT-03).'],
        fails: [`The ${f.seats + 1}th approval is refused or queued; the application stays unchanged (CAP-05).`, 'If the Initiative is closed or suspended, approval is refused.'],
        where: ['organization/participants', 'supervisor/applications', 'explore.html']
      },
      spec: ['§15.3', '§21.3', '§25.1 ADMIT-03 / CAP-05', 'D25', 'D28'], scenarios: ['B']
    },
    {
      id: 'adm-once',
      title: 'Two approvals still mean one seat',
      summary: 'If the Representative and the Supervisor approve at the same moment, the second approval changes nothing. There is one membership and one seat.',
      show: ['application', 'rep', 'supervisor'],
      edges: ['application>rep', 'application>supervisor'], flows: ['<application>rep', '<application>supervisor'], token: 'check',
      status: { application: 'Accepted · 1 seat' },
      note: { kind: 'info', title: 'Idempotent approval', text: 'Approval is checked against the record’s current state. A repeated approval is acknowledged without creating a second membership or seat.' },
      details: {
        what: 'Two approvals arrived for the same application.',
        who: 'Representative and Supervisor.',
        changed: 'Only the first approval changes state; the second is recorded as already accepted.',
        visible: 'Both reviewers see one Accepted application.',
        rules: ['One person, one Initiative, one accepted seat (§22.2).', 'Production enforces this with transactions; the static demo checks it locally (§22.1).'],
        where: ['organization/participants', 'supervisor/applications']
      },
      simulated: 'True concurrent races need the future backend; the static demo checks state before writing.',
      spec: ['§15.3', '§22.2', '§25.1 ADMIT-03', 'D25'], scenarios: ['B']
    },
    {
      id: 'adm-authority',
      title: 'Only the Representative rejects or disciplines',
      summary: 'A Supervisor can approve but cannot reject, remove, suspend, restore or block. Those decisions belong to the Representative, with a reason and a notice.',
      show: ['application', 'rep', 'supervisor'],
      edges: ['application>rep', 'application>supervisor'], flows: ['<application>supervisor@cross'],
      status: { supervisor: '!Cannot reject', rep: 'Decides' },
      dim: ['supervisor'],
      focus: ['rep'],
      note: { kind: 'caution', title: 'Permission required', text: 'The Supervisor’s rejection attempt is refused and the application is unchanged. Discipline stays with the Representative; only Platform Admin can issue a platform-wide ban.' },
      details: {
        what: 'A Supervisor tried to reject an application and was refused.',
        who: 'Initiative Supervisor (attempt); Representative (authority).',
        changed: 'Nothing; a refused command leaves the record unchanged and explains the valid next action.',
        visible: 'The Supervisor sees why the action is unavailable.',
        rules: ['Representative alone Rejects, Removes, Suspends, Restores or Blocks within an Initiative (D26).', 'A student can Withdraw themselves.', 'Only Platform Admin issues a platform-wide ban.'],
        fails: ['Supervisor Reject, Remove, Suspend, Restore or Block is denied (ADMIT-04).'],
        where: ['organization/participants', 'supervisor/applications']
      },
      spec: ['§15.3', '§23.1', '§25.1 ADMIT-04', 'D26'], scenarios: ['B']
    },
    {
      id: 'adm-full', overview: true,
      title: 'When every seat is taken',
      summary: `Once ${f.seats} students are accepted, a new applicant can be queued. Queued and pending people never count as seated.`,
      brief: `At ${f.seats} accepted students the Initiative is full; newcomers can be queued.`,
      show: ['initiative', 'individual', 'applicant'],
      at: { initiative: [500, 130], individual: [300, 420], applicant: [700, 420] },
      labels: { individual: 'Accepted student', applicant: 'New applicant' }, shorts: { individual: 'Accepted', applicant: 'Applicant' },
      edges: ['initiative>individual', 'initiative>applicant'], flows: ['initiative>applicant'], token: 'clock',
      status: { initiative: `${f.seats} / ${f.seats} seats`, individual: 'Accepted', applicant: ['Pending', 'Queued'] },
      note: { kind: 'caution', title: 'Initiative full', text: 'The new applicant is Queued. They hold no seat, and they can see their place in My Initiatives.' },
      details: {
        what: 'A pending application was queued because the Initiative was at capacity.',
        who: 'Representative or Supervisor (queue decision); capacity check on the Initiative.',
        changed: 'Application Pending → Queued.',
        visible: 'Applicant’s My Initiatives; both reviewers’ queues.',
        rules: ['Pending → Accepted | Rejected | Queued | Withdrawn (§15.3).', 'Pending and queued applicants do not consume seats (D28).', 'Each Initiative has its own separate limit.'],
        where: ['organization/participants', 'organization/dashboard', 'explore.html']
      },
      spec: ['§15.3', '§25.1 CAP-05', 'D28'], scenarios: ['B']
    },
    {
      id: 'adm-offer',
      title: 'A freed seat is offered, then held',
      summary: 'When a seat frees up, the next queued applicant receives an offer. While the offer is valid, that seat counts as held. If it expires, the seat is released.',
      show: ['initiative', 'individual', 'applicant'],
      at: { initiative: [500, 130], individual: [300, 420], applicant: [700, 420] },
      labels: { individual: 'Withdrawn student', applicant: 'Queued applicant' }, shorts: { individual: 'Withdrawn', applicant: 'Queued' },
      edges: ['initiative>individual', 'initiative>applicant'], flows: ['initiative>applicant'], token: 'seat',
      status: { individual: '!Withdrawn', applicant: ['Queued', 'Offered'], initiative: 'Seat held' },
      dim: ['individual'],
      note: { kind: 'event', title: 'Seat offered', text: 'The queued applicant can accept within the offer window. Until then the seat is held for them, so nobody else can take it.' },
      details: {
        what: 'A student withdrew; the next queued applicant received an offer.',
        who: 'The student (withdrawal); the Representative or Supervisor or the queue rule (offer).',
        changed: 'Membership Accepted → Withdrawn; Application Queued → Offered with a held seat.',
        visible: 'The applicant sees the offer and its deadline; reviewers see the held seat.',
        rules: ['Queued → Offered → Accepted | Declined | Expired (§15.3).', 'An offered seat counts as held while valid; expired offers release it.', 'Suspension, by contrast, keeps the seat under the interim default.'],
        fails: ['An expired offer cannot be accepted; the seat is released for the next eligible applicant.'],
        where: ['organization/participants', 'explore.html']
      },
      simulated: 'Offer expiry follows the local demo clock.',
      spec: ['§15.3', '§23.2'], scenarios: ['B']
    },
    {
      id: 'adm-groups',
      title: 'Accepted students are allocated to groups',
      summary: 'The Representative or Supervisor creates internal groups, places accepted students in them and allocates Coaches who are already active.',
      show: ['supervisor', 'group', 'group.b'],
      at: { supervisor: [500, 120], group: [300, 420], 'group.b': [700, 420] },
      edges: ['supervisor>group', 'supervisor>group.b'], flows: ['supervisor>group', 'supervisor>group.b'], token: 'group',
      subs: { group: 'Coach: active', 'group.b': 'Coach: active' },
      note: { kind: 'info', title: 'Groups live inside the Initiative', text: 'Internal groups belong to this Initiative. One Group Garden covers the whole Initiative across all its groups.' },
      details: {
        what: 'Groups were created and accepted students allocated.',
        who: 'Representative or active Initiative Supervisor (D29).',
        changed: 'Group records and Group Memberships, with allocation history.',
        visible: 'The allocated Coach sees their group’s roster; students see My Group.',
        rules: ['Only already-active Coaches can be allocated (§17).', 'Group count and size have no approved numeric cap (§13.1).', 'Each Group has exactly one parent (D19).'],
        where: ['organization/team', 'supervisor/students', 'mentor/groups']
      },
      spec: ['§13.1', '§17', 'D19', 'D29'], scenarios: ['B', 'C']
    },
    {
      id: 'adm-transfer',
      title: 'Moving a student keeps their seat and history',
      summary: 'Transferring a student to another group changes who is responsible from now on. They keep one seat, and their earlier work and reviews stay attributed.',
      show: ['group', 'student', 'group.b'],
      edges: ['group>student', 'student>group.b'], flows: ['student>group.b'], token: 'arrow',
      status: { student: ['Group A', 'Group B'] },
      dim: ['group'],
      note: { kind: 'info', title: 'Handover, not erasure', text: 'Group B’s Coach takes over future tasks. Group A’s Coach keeps authorship of past reviews; the student is notified.' },
      details: {
        what: 'An accepted student was transferred between internal groups.',
        who: 'Representative or Supervisor.',
        changed: 'Group Membership ends in A and starts in B, with a handover record.',
        visible: 'Both Coaches, the student, and Initiative reports.',
        rules: ['One accepted student occupies one seat regardless of transfer (§13.1).', 'Transfer preserves prior reviews, submissions and rewards (GROUP-07).'],
        where: ['supervisor/students', 'organization/team', 'mentor/students']
      },
      spec: ['§13.1', '§25.1 GROUP-07', 'D29'], scenarios: ['B']
    },
    {
      id: 'adm-discipline',
      title: 'Suspension, removal, blocking and withdrawal',
      summary: 'The Representative may suspend, remove or block a student with a reason and notice. A student may withdraw. A suspended student keeps the seat under the interim default.',
      show: ['rep', 'student'],
      at: { rep: [500, 130], student: [500, 420] },
      edges: ['rep>student'], flows: ['rep>student'], token: 'scale',
      status: { student: ['Accepted', '!Suspended'] },
      note: { kind: 'caution', title: 'Reasoned and recorded', text: 'Suspension keeps the seat and all historical work until a policy or authorized action changes it. Removal and blocking also preserve history.' },
      details: {
        what: 'The Representative suspended an accepted student.',
        who: 'Institution Representative only.',
        changed: 'Membership Accepted → Suspended, with reason, actor, time and notice.',
        visible: 'The student is notified; reviewers see the new state.',
        rules: ['Accepted → Suspended | Removed | Withdrawn | Completed; Suspended → Accepted (Restore) | Removed (§15.3).', 'Blocked is an Initiative-specific reapplication prohibition.', 'Interim configurable default: suspension retains the seat; it is never silently re-offered.'],
        where: ['organization/participants', 'admin/users']
      },
      spec: ['§15.3', '§23.2', 'D26'], scenarios: ['B']
    },
    {
      id: 'adm-separate', overview: true,
      title: 'Admission is not a session booking',
      summary: 'Being accepted into an Initiative does not reserve its sessions or a linked Provider Experience. Each of those has its own registration and its own seats.',
      brief: 'Admission does not book sessions or linked Experiences; each has its own registration.',
      show: ['individual', 'initiative', 'session', 'experience'],
      at: { individual: [200, 270], initiative: [500, 270], session: [800, 140], experience: [800, 420] },
      edges: ['individual>initiative', 'initiative>session:side', 'initiative>experience:side'],
      status: { individual: 'Accepted', session: 'Book separately', experience: 'Book separately' },
      focus: [],
      note: { kind: 'caution', title: 'Separate records', text: 'Initiative membership, session registration, Provider booking, attendance, excuse decision, completion and Garden reward are all different facts.' },
      details: {
        what: 'A map of what admission does and does not include.',
        who: 'Not applicable.',
        changed: 'Nothing.',
        visible: 'My Initiatives shows admission; My Registrations shows bookings.',
        rules: ['Joining an Initiative does not book every constituent event (§11.2).', 'Session registration and Provider booking are separate records and seat pools (§15.3).', 'Attendance does not always equal completion (D39).'],
        where: ['explore.html', 'organization/sessions', 'provider/registrations']
      },
      spec: ['§11.2', '§15.3', '§23.2', 'D39'], scenarios: ['B', 'D']
    }
  ]
});
