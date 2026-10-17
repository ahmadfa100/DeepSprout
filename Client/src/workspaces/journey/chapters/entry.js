/* Chapter 1 · Platform entry and identity (§2–3, §19, §21.4 A/L). */
export default f => ({
  id: 'entry', n: 1, title: 'Platform entry and identity', short: 'Entry & identity',
  layout: { website: [500, 120], individual: [300, 410], applicant: [700, 410], identity: [500, 410], admin: [500, 410], coach: [500, 120], rep: [250, 120], provider: [750, 120], supervisor: [700, 300], grant: [250, 410], 'grant.2': [500, 410], 'grant.3': [750, 410], workspace: [800, 270] },
  labels: { applicant: 'Partner applicant' },
  shorts: { applicant: 'Partner' },
  steps: [
    {
      id: 'entry-website', overview: true,
      title: 'Two ways in from the public website',
      summary: 'Register offers exactly two choices: Join as Individual for a personal journey, or Join as a Partner to lead programs, represent an institution or organize experiences.',
      brief: 'Register offers two choices: Join as Individual or Join as a Partner.',
      show: ['website', 'individual', 'applicant'],
      edges: ['website>individual', 'website>applicant'], flows: ['website>individual', 'website>applicant'], token: 'arrow',
      note: { kind: 'info', title: 'Two entry intentions', text: 'Join as Individual and Join as a Partner are entry intentions, not lifetime classifications. One person can later hold several authorized roles.' },
      details: {
        what: 'A visitor chose a path on the public Register screen.',
        who: 'Any visitor; no account exists yet.',
        changed: 'Nothing is recorded until the person completes account creation or a partner application.',
        visible: 'Public pages only: landing, How It Works, pricing, help and legal pages.',
        rules: ['Register shows exactly two top-level choices (§3.2).', 'There is no public Register as Admin, no self-issued Supervisor role and no generic Invited Student card (§2.2).', 'Partner is a registration path, not a security role.'],
        where: ['index.html', 'register.html', 'partners.html', 'login.html']
      },
      spec: ['§2.2', '§3.1', '§3.2'], scenarios: ['A']
    },
    {
      id: 'entry-individual',
      title: 'An Individual creates one identity',
      summary: 'Joining as an Individual creates one verified, recoverable identity. Personal setup, Bimo and the four baseline assessments follow (Chapter 8).',
      show: ['individual', 'identity'],
      at: { individual: [300, 270], identity: [700, 270] },
      edges: ['individual>identity'], flows: ['individual>identity'], token: 'key',
      status: { identity: ['New', 'Verified'] },
      note: { kind: 'event', title: 'Account created', text: 'The person now has one identity. Everything they do later, as an Individual or in any role they are granted, hangs off this same record.' },
      details: {
        what: 'A new Individual account was created and its email verified.',
        who: 'The person registering.',
        changed: 'One Person/Identity record with a verified email and onboarding state “not started”.',
        visible: 'Only the person. Their onboarding resumes where they left off on every return.',
        rules: ['One identity, multiple authorized workspaces; never one account per role (§1.3, D45).', 'Normal logout, recovery and login errors exist; OTP for invited students (§3.3).'],
        fails: ['An already-registered email signs in instead of creating a duplicate identity.'],
        where: ['register.html', 'onboarding.html']
      },
      simulated: 'Authentication, email verification and recovery are local demonstrations in the static client.',
      spec: ['§1.3', '§2.2', '§3.3', 'D45'], scenarios: ['A']
    },
    {
      id: 'entry-partner-paths',
      title: 'Partners choose one of three paths',
      summary: 'A partner applicant applies as an independent Coach, an Institution Representative or an Outdoor Provider. Each submits person and entity evidence for review.',
      show: ['applicant', 'rep', 'coach', 'provider'],
      at: { applicant: [500, 120], rep: [250, 410], coach: [500, 410], provider: [750, 410] },
      labels: { coach: 'Independent Coach' }, shorts: { coach: 'Coach' },
      edges: ['applicant>rep', 'applicant>coach', 'applicant>provider'], flows: ['applicant>rep', 'applicant>coach', 'applicant>provider'], token: 'doc',
      status: { rep: 'Submitted', coach: 'Submitted', provider: 'Submitted' },
      note: { kind: 'event', title: 'Applications submitted', text: 'Each application records the person, the entity they act for (Institution or Provider) or their professional capability (Coach), and supporting evidence.' },
      details: {
        what: 'Three kinds of partner application were submitted for review.',
        who: 'The applicants themselves, through Join as a Partner.',
        changed: 'Application records move to Submitted / Pending Verification. No workspace access is granted yet.',
        visible: 'Applicants see their pending status; the Platform Admin verification queues receive the applications.',
        rules: ['Institution Representative: person and organization identity, official contact, type, coverage, representative authority and evidence (§15).', 'Outdoor Provider: entity details and operating responsibility (§16).', 'Independent Coach: professional capability under the verification policy (§13).', 'An Institution-invited Coach does not apply here; they accept an invitation (Chapter 3).'],
        where: ['partners.html', 'admin/organizations', 'admin/providers', 'admin/mentor-applications']
      },
      spec: ['§2.2', '§13', '§15', '§16', '§21.4 A'], scenarios: ['B', 'D', 'E']
    },
    {
      id: 'entry-admin-review',
      title: 'Platform Admin reviews the evidence',
      summary: 'Each application lands in a Platform Admin verification queue. Admin checks the entity and the person’s authority to act for it.',
      show: ['rep', 'coach', 'provider', 'admin'],
      labels: { coach: 'Independent Coach' }, shorts: { coach: 'Coach' },
      edges: ['rep>admin', 'coach>admin', 'provider>admin'], flows: ['rep>admin', 'coach>admin', 'provider>admin'], token: 'doc',
      status: { rep: 'Pending', coach: 'Pending', provider: 'Pending' },
      note: { kind: 'info', title: 'Verification queue', text: 'Platform Admin is a privately provisioned, audited role. It reviews evidence; it does not operate partners’ day-to-day resources.' },
      details: {
        what: 'Applications reached the Admin queues for Institutions, Outdoor Providers and Mentor (Coach) applications.',
        who: 'Platform Admin.',
        changed: 'Nothing yet; the queue shows each application with its evidence and history.',
        visible: 'Platform Admin only. Applicants keep seeing Pending.',
        rules: ['Admin verifies Institutions and Representatives, Provider entities and independent Coaches (§19, D17).', 'Admin may request more information, approve or reject, always with a reason (§19).'],
        where: ['admin/organizations', 'admin/providers', 'admin/mentor-applications']
      },
      spec: ['§19', '§21.4 A', 'D17', 'D47'], scenarios: ['B', 'F']
    },
    {
      id: 'entry-admin-decision', overview: true,
      title: 'Decisions return to each applicant',
      summary: 'Approval enables the matching workspace. A request for more information or a rejection keeps the applicant non-operational, with the reason recorded.',
      brief: 'Admin approval enables a partner workspace; other decisions keep it closed with a reason.',
      show: ['rep', 'coach', 'provider', 'admin'],
      labels: { coach: 'Independent Coach' }, shorts: { coach: 'Coach' },
      edges: ['rep>admin', 'coach>admin', 'provider>admin'], flows: ['<rep>admin', '<coach>admin', '<provider>admin'], token: 'check',
      status: { rep: ['Pending', 'Approved'], coach: ['Pending', '!More info'], provider: ['Pending', 'Approved'] },
      note: { kind: 'event', title: 'Verification decisions', text: 'The Institution Representative and the Outdoor Provider were approved. The Coach was asked for more information and stays non-operational for now.' },
      details: {
        what: 'Admin recorded a decision on each application.',
        who: 'Platform Admin, with a reason and audit entry.',
        changed: 'Application status → Approved / Needs More Info / Rejected. Approval creates the scoped workspace grant.',
        visible: 'Applicants see their decision; approved Representatives and Providers can now open their workspace. Admin queue and audit update.',
        rules: ['An approved Representative later publishes Initiatives without per-Initiative Admin approval (D17).', 'Suspension later disables publication but preserves audit and history.'],
        fails: ['More Info or Reject grants no publication right; the applicant can respond or reapply under policy.'],
        where: ['admin/organizations', 'admin/audit', 'organization/dashboard', 'provider/overview']
      },
      simulated: 'Evidence review is a local demonstration; production requires real institutional proof (D47).',
      spec: ['§19', '§21.3', '§21.4 A', 'D17', 'D47'], scenarios: ['B', 'D', 'F']
    },
    {
      id: 'entry-no-public-roles',
      title: 'Admin and Supervisor are never self-registered',
      summary: 'Platform Admin access is provisioned privately. A Supervisor is appointed by invitation to specific resources. Neither appears as a public signup choice.',
      show: ['website', 'admin', 'supervisor'],
      at: { admin: [300, 400], supervisor: [700, 400] },
      subs: { admin: 'Privately provisioned', supervisor: 'Appointed, never self-issued' },
      dim: ['admin', 'supervisor'],
      status: { admin: '!No public signup', supervisor: '!No public signup' },
      note: { kind: 'caution', title: 'Roles that cannot be claimed', text: 'No email string, browser flag or direct URL grants Admin or Supervisor authority. The demo’s “Continue as Admin” shortcut is a labeled simulation only.' },
      details: {
        what: 'This step shows two roles with no public path in.',
        who: 'Nobody; this is a boundary.',
        changed: 'Nothing.',
        visible: 'Public visitors never see an Admin or Supervisor option.',
        rules: ['Admin is privately provisioned and audited (§3.3, §19).', 'Supervisors are invited by a Representative (Initiative scope) or a Provider (assigned sessions/cohorts) (§17).', 'Continue as Admin (Demo) is permitted only as a clearly labeled simulation (D16).'],
        where: ['login.html', 'organization/team', 'provider/supervisors']
      },
      spec: ['§2.2', '§3.3', '§17', 'D15', 'D16'], scenarios: []
    },
    {
      id: 'entry-account-permission', overview: true,
      title: 'An account is not a permission',
      summary: 'One identity can hold several grants: personal Individual access, a Coach grant, a Representative grant. Each grant is scoped to specific resources.',
      brief: 'One identity can hold several separately scoped grants.',
      show: ['identity', 'grant', 'grant.2', 'grant.3'],
      at: { identity: [500, 120] },
      labels: { grant: 'Individual access', 'grant.2': 'Coach grant', 'grant.3': 'Representative grant' },
      shorts: { grant: 'Individual', 'grant.2': 'Coach', 'grant.3': 'Representative' },
      subs: { grant: 'Own records', 'grant.2': 'Assigned groups', 'grant.3': 'Own Institution' },
      edges: ['identity>grant', 'identity>grant.2', 'identity>grant.3'], flows: ['identity>grant', 'identity>grant.2', 'identity>grant.3'], token: 'lock',
      note: { kind: 'info', title: 'Identity versus authority', text: 'Signing in proves who you are. What you may see or change comes only from active grants to exact resources, checked on every action.' },
      details: {
        what: 'One person record carries three independent, scoped grants.',
        who: 'Grants are issued by the right owner: Admin verification, an accepted invitation or the person’s own Individual registration.',
        changed: 'Nothing new; this is the authorization model.',
        visible: 'The person sees only resources each grant covers. A person holding two roles acts under, and is audited for, the capacity selected.',
        rules: ['Global role (e.g. Admin) ≠ organizational permission (§2.1).', 'Every sensitive action is checked against the active grant to that resource (§2.2, §23.1).', 'Entitlements (plans) are separate from roles: paying never grants a role (§20).'],
        where: ['admin/users']
      },
      spec: ['§2.1', '§2.2', '§23.1', 'D15', 'D45'], scenarios: ['E']
    },
    {
      id: 'entry-switcher',
      title: 'Switching workspace never grants access',
      summary: 'The workspace switcher lists only the workspaces a person’s active grants allow. Choosing one shows that grant’s scope and nothing more.',
      show: ['individual', 'grant', 'workspace'],
      at: { individual: [200, 270], grant: [500, 270], workspace: [800, 270] },
      labels: { individual: 'Signed-in person', grant: 'Active grant', workspace: 'Coach workspace' },
      shorts: { individual: 'Person', grant: 'Grant', workspace: 'Workspace' },
      edges: ['individual>grant', 'grant>workspace'], flows: ['individual>grant', 'grant>workspace'], sequence: true, token: 'lock',
      note: { kind: 'caution', title: 'The grant decides', text: 'If a grant is revoked or expires, the switcher stops offering that workspace and its pages refuse access, while the person’s authored history remains.' },
      details: {
        what: 'A person with an active Coach grant switched into the Coach workspace.',
        who: 'The signed-in person.',
        changed: 'Only the selected capacity for later actions and audit.',
        visible: 'The switcher shows only authorized workspaces.',
        rules: ['A switching UI never itself grants access (§2.3).', 'Revocation stops future access but keeps authored records (§23.2).'],
        fails: ['Opening a workspace URL without a grant shows “This workspace is unavailable”.'],
        where: ['admin/users']
      },
      spec: ['§2.3', '§21.4 L', '§23.1'], scenarios: ['E']
    }
  ]
});
