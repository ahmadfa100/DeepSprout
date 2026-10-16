/**
 * The nine chapters of the System Journey. Coordinates use a 1000 × 560
 * stage; people stand on a coarse grid (x 100–900, rows near y 120 / 270 /
 * 410) so labels never crowd. `f` carries live facts (seat and Supervisor
 * caps, offer window) from the shared rules instead of restating them.
 */
export function chapters(f) {
  return [
    staffInvitation(f)
  ];
}

/* ------------------------------------------------------------ Chapter 3 */

function staffInvitation(f) {
  return {
    id: 'staff', n: 3, title: 'Staff invitation and role activation', short: 'Staff invitations',
    layout: { rep: [500, 120], coach: [300, 400], supervisor: [700, 400], initiative: [500, 400], admin: [880, 120], identity: [500, 400], 'coach.new': [700, 400], 'supervisor.2': [500, 400], 'supervisor.3': [700, 400], 'supervisor.4': [900, 400] },
    subs: { rep: 'Verified Institution' },
    steps: [
      {
        id: 'staff-rep', overview: true,
        title: 'The Representative runs the Initiative',
        summary: 'A verified Institution Representative owns the Initiative and is the only person who can invite or revoke its staff.',
        show: ['rep'],
        note: { kind: 'info', title: 'Representative authority', text: 'Platform Admin verified this Institution and its Representative once. From here the Representative builds, publishes and staffs Initiatives without per-Initiative Admin approval.' },
        details: {
          what: 'Nothing has moved yet. The scene starts with the person who holds Initiative authority: an approved Institution Representative.',
          who: 'Institution Representative, acting in the Institution workspace for an Initiative the Institution owns.',
          changed: 'No record changes in this step.',
          visible: 'The Representative sees their Institution’s Initiatives, staff list, applications, sessions and reports.',
          rules: ['Only the Representative invites or revokes Initiative Coaches and Supervisors (D30).', 'Platform Admin verifies the Institution and the Representative’s authority, not each Initiative (D17).', 'Supervisor is appointed by invitation; there is no public Supervisor signup (§2.2).'],
          where: ['organization/dashboard', 'organization/team', 'admin/organizations']
        },
        spec: ['§15', '§17', 'D17', 'D30'], scenarios: ['B']
      },
      {
        id: 'staff-invite', overview: true,
        title: 'Invitations travel to a Coach and a Supervisor',
        summary: 'The Representative invites a Coach and a Supervisor by email into one named Initiative. Both invitations stay pending until each person accepts.',
        brief: 'The Representative invites a Coach and a Supervisor. Their access stays pending until they accept.',
        show: ['rep', 'coach', 'supervisor'],
        edges: ['rep>coach', 'rep>supervisor'], flows: ['rep>coach', 'rep>supervisor'], token: 'envelope',
        status: { coach: 'Pending', supervisor: 'Pending' },
        note: { kind: 'event', title: 'Invitation sent', text: 'The Representative invited a Coach and a Supervisor to this Initiative. Their access remains pending until they verify their identity and accept.' },
        details: {
          what: 'Two staff invitations were created, each addressed to one email and scoped to one Initiative.',
          who: 'Institution Representative, from Team & Groups or the Initiative Builder’s staffing stage.',
          changed: 'Two Staff Invitation records move to Pending. No grant, roster access or attendance authority exists yet.',
          visible: 'The recipients see an invitation preview; the Representative’s staff list shows both as Pending with their expiry.',
          rules: ['An invitation names one email, one role and one Initiative scope.', 'A pending invitation never grants access or counts as an active appointment.', 'Publication can happen before any Supervisor accepts (D38).'],
          fails: ['A mistyped address simply never matches: the invitation stays Pending and grants nothing.', 'The Representative can resend or cancel a pending invitation.'],
          where: ['organization/team', 'organization/initiatives', 'join.html']
        },
        simulated: 'Email delivery is simulated: the demo shows a local notice and a copyable invitation link instead of sending mail.',
        spec: ['§15.1', '§15.2 stage 4', '§21.4 C', 'D21', 'D22'], scenarios: ['B', 'C']
      },
      {
        id: 'staff-accept', overview: true,
        title: 'Each recipient accepts and gains scoped access',
        summary: 'After signing in with the invited email, each recipient accepts. Their grant becomes active for this Initiative only.',
        show: ['rep', 'coach', 'supervisor'],
        edges: ['rep>coach', 'rep>supervisor'], flows: ['<rep>coach', '<rep>supervisor'], token: 'check',
        status: { coach: ['Pending', 'Accepted'], supervisor: ['Pending', 'Accepted'] },
        note: { kind: 'event', title: 'Access activated', text: 'After verifying the correct email and accepting the invitation, each recipient receives access only to the authorized Initiative. No separate Platform Admin approval is needed.' },
        details: {
          what: 'The Coach and the Supervisor each accepted their invitation. Each now holds an active, Initiative-scoped grant.',
          who: 'The invited people themselves, signed in with the email the invitation was addressed to.',
          changed: 'Invitation Pending → Accepted; a new active Coach grant and a new active Supervisor appointment for this Initiative.',
          visible: 'The Representative’s staff list shows both as Active. The recipients can now switch to the Coach or Supervisor workspace, showing only this Initiative.',
          rules: ['Institution-invited Coaches and Supervisors need no separate Platform Admin approval (D21, D22).', 'Acceptance requires the invited email; an existing person keeps one identity (D23, D45).', `At most ${f.supervisors} active Supervisors per Initiative; pending invitations are tracked separately (D28).`],
          fails: ['Wrong email: the invitation stays Pending and grants nothing.', 'Expired, cancelled or revoked invitations cannot be accepted.'],
          where: ['organization/team', 'supervisor/dashboard', 'mentor/dashboard', 'join.html']
        },
        simulated: 'Sign-in, email matching and OTP are local demonstrations, not production authentication.',
        spec: ['§13', '§17', '§21.3', 'D21', 'D22', 'D23'], scenarios: ['B', 'C']
      },
      {
        id: 'staff-identity',
        title: 'Existing account or new identity',
        summary: 'An existing person signs in and accepts with the same identity. A new person registers, verifies the invited email, then accepts.',
        show: ['coach', 'identity', 'coach.new'],
        at: { coach: [300, 140], 'coach.new': [700, 140], identity: [500, 410] },
        labels: { coach: 'Existing account', 'coach.new': 'New person' },
        subs: { coach: 'Signs in', 'coach.new': 'Registers + verifies email', identity: 'Same person record' },
        edges: ['coach>identity', 'coach.new>identity'], flows: ['coach>identity', 'coach.new>identity'], token: 'key',
        note: { kind: 'info', title: 'One person, one identity', text: 'Accepting an invitation never creates a second account. A new person verifies their email first; an existing person reuses the identity they already have.' },
        details: {
          what: 'Two paths reach the same outcome: one verified identity holding a new scoped grant.',
          who: 'The invited person.',
          changed: 'For a new person: an Identity with a verified email, then the grant. For an existing person: only the new grant.',
          visible: 'The person’s workspace switcher lists the new Initiative scope alongside any Individual or other access they already hold.',
          rules: ['One identity across Individual, Coach, Supervisor and Student access (§1.3, D45).', 'A workspace switcher never grants access by itself; the active grant does (§2.3).'],
          fails: ['Verification code expired or wrong: the invitation remains Pending until a valid verification.', 'Signed in with a different email: acceptance is refused and the invitation remains Pending.'],
          where: ['join.html', 'login.html', 'register.html']
        },
        simulated: 'OTP codes and email verification are simulated in the static demo.',
        spec: ['§2.2', '§14', '§21.4 L', 'D23', 'D45'], scenarios: ['C', 'E']
      },
      {
        id: 'staff-scope',
        title: 'Two roles, two different scopes',
        summary: 'The Supervisor sees every group and student in this Initiative. The Coach sees only the groups and students assigned to them.',
        show: ['coach', 'initiative', 'supervisor'],
        at: { coach: [220, 400], initiative: [500, 160], supervisor: [780, 400] },
        subs: { coach: 'Assigned groups only', supervisor: 'Whole Initiative', initiative: 'One Initiative' },
        edges: ['coach>initiative', 'supervisor>initiative'], flows: ['coach>initiative', 'supervisor>initiative'], token: 'lock',
        focus: ['initiative'],
        note: { kind: 'caution', title: 'Scope is per Initiative', text: 'A Supervisor can approve applications and organize groups, but cannot reject, remove, suspend, restore or block a student. Those decisions stay with the Representative.' },
        details: {
          what: 'Both grants point at the same Initiative but open different windows into it.',
          who: 'Coach and Initiative Supervisor, each acting under their own grant.',
          changed: 'Nothing changes; this step explains what each active grant allows.',
          visible: 'Coach: assigned groups, students, tasks and reviews. Supervisor: all Initiative groups and students, applications, sessions, attendance, excuses and Insights.',
          rules: ['Supervisor may approve a pending application, create or rename groups, allocate accepted students and allocate already-active Coaches (D29).', 'Supervisor cannot Reject, Remove, Suspend, Restore or Block (D26).', 'Coach authors and reviews assigned tasks and writes reports (D31).', 'Neither role can see a student’s private Lab, Shield or Recovery records (§23.1).'],
          fails: ['A Coach opening another group’s roster is denied.', 'A Supervisor attempting a rejection is refused; the action belongs to the Representative.'],
          where: ['mentor/students', 'supervisor/students', 'supervisor/applications']
        },
        spec: ['§13.1', '§17', '§23.1', 'D26', 'D29', 'D31'], scenarios: ['B', 'C']
      },
      {
        id: 'staff-cap', overview: true,
        title: `At most ${f.supervisors} active Supervisors`,
        summary: `An Initiative can have ${f.supervisors} active Supervisors. A further invitation can wait as Pending, but it cannot become active while ${f.supervisors} appointments are active.`,
        brief: `Each Initiative has at most ${f.supervisors} active Supervisors; pending invitations do not count.`,
        show: ['rep', 'supervisor', 'supervisor.2', 'supervisor.3', 'supervisor.4'],
        at: { supervisor: [200, 400], 'supervisor.2': [400, 400], 'supervisor.3': [600, 400], 'supervisor.4': [800, 400] },
        labels: { supervisor: 'Supervisor 1', 'supervisor.2': 'Supervisor 2', 'supervisor.3': 'Supervisor 3', 'supervisor.4': 'Invited' },
        shorts: { supervisor: 'No. 1', 'supervisor.2': 'No. 2', 'supervisor.3': 'No. 3', 'supervisor.4': 'No. 4' },
        edges: ['rep>supervisor', 'rep>supervisor.2', 'rep>supervisor.3', 'rep>supervisor.4'], flows: ['<rep>supervisor.4'], token: 'cross',
        status: { supervisor: 'Active', 'supervisor.2': 'Active', 'supervisor.3': 'Active', 'supervisor.4': ['Pending', '!Refused'] },
        dim: ['supervisor.4'],
        note: { kind: 'caution', title: 'Supervisor limit reached', text: `This Initiative already has ${f.supervisors} active Supervisors. The fourth person’s acceptance is refused until an active appointment ends.` },
        details: {
          what: `A fourth Supervisor tried to accept while ${f.supervisors} appointments were active. The acceptance was refused; the invitation remains Pending.`,
          who: 'The invited fourth person attempted acceptance; the rule is enforced on the appointment record.',
          changed: 'Nothing becomes active. The pending invitation stays visible to the Representative.',
          visible: `The Representative sees “${f.supervisors} of ${f.supervisors} active Supervisors” and the waiting invitation.`,
          rules: [`The cap is ${f.supervisors} active Supervisors per Institution Initiative, not per Institution (D28).`, 'Pending invitations are tracked separately and never counted as active.', 'Revoking or ending an active appointment frees a place.'],
          fails: ['Exceeding the cap is refused rather than silently replacing someone.'],
          where: ['organization/team', 'organization/dashboard']
        },
        spec: ['§15.2 stage 4', '§17', '§25.1 SUP-06', 'D28'], scenarios: ['B']
      },
      {
        id: 'staff-expired',
        title: 'Expired or cancelled invitations grant nothing',
        summary: 'If an invitation expires or the Representative cancels it, it can no longer be accepted. No access was ever granted.',
        show: ['rep', 'supervisor'],
        at: { supervisor: [700, 400] },
        edges: ['rep>supervisor'], flows: ['rep>supervisor'], token: 'clock',
        status: { supervisor: ['Pending', '!Expired'] },
        dim: ['supervisor'],
        note: { kind: 'exception', title: 'Invitation expired', text: 'The invitation passed its expiry before it was accepted. It grants nothing; the Representative can send a new one.' },
        details: {
          what: 'A pending invitation reached its expiry (or was cancelled) before acceptance.',
          who: 'Expiry is time-driven; cancellation is the Representative’s action.',
          changed: 'Invitation Pending → Expired (or Cancelled). No grant was created.',
          visible: 'The Representative’s staff list shows the final state; the recipient’s link shows that the invitation is no longer valid.',
          rules: ['Expired, cancelled, revoked or wrong-email invitations never grant scope (JOIN-01 / STAFF-02).', 'A new invitation is a new record; history of the old one is kept.'],
          where: ['organization/team', 'join.html']
        },
        simulated: 'Invitation expiry follows the local demo clock.',
        spec: ['§21.2', '§25.1 JOIN-01', 'D23'], scenarios: ['B']
      },
      {
        id: 'staff-revoke', overview: true,
        title: 'Revocation ends future access, not history',
        summary: 'The Representative can revoke a Coach or Supervisor. Their future access stops immediately; everything they already recorded stays attributed to them.',
        show: ['rep', 'coach', 'supervisor'],
        edges: ['rep>coach', 'rep>supervisor'], flows: ['rep>supervisor'], token: 'cross',
        status: { coach: 'Active', supervisor: ['Active', '!Revoked'] },
        dim: ['supervisor'],
        note: { kind: 'event', title: 'Appointment revoked', text: 'The Supervisor can no longer open this Initiative’s rosters or confirm attendance. Reviews, attendance records and notes they wrote remain in history.' },
        details: {
          what: 'The Representative revoked an active Supervisor appointment.',
          who: 'Institution Representative only; Supervisors, Coaches and Admin do not revoke Initiative staff (D30).',
          changed: 'Appointment Active → Revoked, with actor, time and reason in the audit trail.',
          visible: 'The former Supervisor sees access ended. If no active Supervisor remains, sessions needing attendance show “Needs Supervisor”.',
          rules: ['Revocation removes future writes and roster access immediately.', 'Authored attendance, notes, reviews and reports are retained and still attributed.', 'Attendance cannot be confirmed by a revoked appointment (SUP-06).'],
          fails: ['A revoked Supervisor trying to confirm attendance is refused and the session keeps its previous state.'],
          where: ['organization/team', 'organization/sessions', 'admin/audit']
        },
        spec: ['§13.1', '§17', '§23.2', 'D30', 'D38'], scenarios: ['B']
      }
    ]
  };
}
