/* Chapter 7 · Independent Coach and Invited Student (§13, §14, §9.1, §21.4 E/L, D12, D19, D24). */
export default f => ({
  id: 'coaching', n: 7, title: 'Independent Coach and Invited Student', short: 'Coach & student',
  layout: { coach: [200, 270], program: [500, 270], group: [500, 270], student: [800, 270], assignment: [500, 270], groupGarden: [800, 270], identity: [500, 270], individual: [800, 270], partnership: [500, 270], initiative: [800, 270], garden: [600, 420], lab: [800, 420], explore: [800, 140] },
  labels: { coach: 'Independent Coach', student: 'Invited Student' },
  shorts: { coach: 'Coach', student: 'Student' },
  steps: [
    {
      id: 'ic-program', overview: true,
      title: 'An independent Coach creates a Program and group',
      summary: 'An approved independent Coach builds an invite-only Program and owns its groups. It is not a public Explore listing.',
      brief: 'An independent Coach owns an invite-only Program and its groups.',
      show: ['coach', 'program', 'group'],
      at: { coach: [200, 270], program: [500, 270], group: [800, 270] },
      edges: ['coach>program', 'program>group'], flows: ['coach>program', 'program>group'], sequence: true, token: 'book',
      status: { program: 'Invite-only' },
      note: { kind: 'info', title: 'Coach-owned', text: 'The Program, its groups, tasks and reviews belong to the Coach. It only reaches Explore if a linked Initiative presents it under agreed terms.' },
      details: {
        what: 'A versioned Program and an operational group were created.',
        who: 'Approved independent Coach.',
        changed: 'Program (draft → published to its invitees), Group with the Program as its only parent.',
        visible: 'The Coach; invited members once they join.',
        rules: ['Independent Programs are invite-only, not public Explore listings (D24).', 'Each Group has exactly one parent: an Initiative or a Program (D19).', 'Program changes after submissions create new versions, never rewriting submitted work (§13.2).'],
        where: ['mentor/programs', 'mentor/groups', 'admin/programs']
      },
      spec: ['§13', '§13.1', 'D19', 'D24'], scenarios: ['E']
    },
    {
      id: 'ic-invite',
      title: 'The Coach invites a student',
      summary: 'The Coach invites a person by email to a specific group. The preview shows the group, the Coach, its purpose and policies, but never other students.',
      show: ['coach', 'group', 'student'],
      edges: ['coach>group', 'group>student'], flows: ['group>student'], token: 'envelope',
      status: { student: 'Invited' },
      note: { kind: 'event', title: 'Invitation sent', text: 'The invitation records the recipient email, token expiry and use limit. Wrong-email, expired, revoked or overused invitations grant nothing.' },
      details: {
        what: 'A group invitation was issued.',
        who: 'Independent Coach.',
        changed: 'Invitation Pending with token expiry, use limit, consent and join rule.',
        visible: 'The recipient’s invitation preview; the group’s Invitations tab.',
        rules: ['Wrong email cannot claim the grant (§13.2).', 'Existing users reuse their identity; new people verify (§14).'],
        fails: ['Expired, revoked, overused, wrong-email or ineligible invitation: no membership.'],
        where: ['mentor/groups', 'join.html']
      },
      simulated: 'Email delivery is simulated; the demo shows a copyable invitation link.',
      spec: ['§13.2', '§14', 'D23'], scenarios: ['E']
    },
    {
      id: 'ic-join',
      title: 'Verify the email, then accept',
      summary: 'A new person enters minimal identity and consent details, verifies the invited email with a one-time code, and accepts. An existing user signs in and accepts.',
      show: ['coach', 'group', 'student'],
      edges: ['coach>group', 'group>student'], flows: ['<group>student'], token: 'key',
      status: { student: ['Invited', 'Member'] },
      note: { kind: 'event', title: 'Joined the group', text: 'The student now has persistent, limited access to this group. No second identity was created.' },
      details: {
        what: 'The invitation was accepted after verification.',
        who: 'The invited person.',
        changed: 'Invitation → Accepted; Group Membership; limited Student access.',
        visible: 'The Coach’s roster; the student’s limited workspace.',
        rules: ['Invited students may use email OTP plus the invitation token (§2.2).', 'No second identity for an existing person (§14).'],
        where: ['join.html', 'student/dashboard', 'mentor/students']
      },
      simulated: 'Token and OTP are local simulations; production requires secure verification.',
      spec: ['§2.2', '§14', '§21.4 L'], scenarios: ['E']
    },
    {
      id: 'ic-limited', overview: true,
      title: 'A deliberately limited workspace',
      summary: 'An Invited Student sees their tasks, group and the authorized Group Garden. There is no Personal Garden, personal Lab, Shield or Recovery Plan until they choose to upgrade.',
      brief: 'An Invited Student has tasks and the Group Garden only, with no personal tools until they upgrade.',
      show: ['student', 'assignment', 'groupGarden', 'garden', 'lab'],
      at: { student: [500, 120], assignment: [200, 420], groupGarden: [400, 420], garden: [600, 420], lab: [800, 420] },
      labels: { assignment: 'My Tasks' },
      edges: ['student>assignment', 'student>groupGarden'], flows: ['student>assignment', 'student>groupGarden'], token: 'lock',
      status: { garden: '!Not yet', lab: '!Not yet' },
      dim: ['garden', 'lab'],
      note: { kind: 'info', title: 'Group Garden only', text: 'Before upgrading, the student sees only the authorized Group Garden. Personal tools are offered on upgrade, never forced.' },
      details: {
        what: 'The scope of the limited Student workspace.',
        who: 'Invited Student.',
        changed: 'Nothing.',
        visible: 'My Dashboard, My Tasks, My Group, Group Garden, assigned Protected Work, My Progress and account/upgrade.',
        rules: ['Invited Student sees only the authorized Group Garden before upgrade (D12).', 'No Personal Garden, personal Lab, Shield or Recovery Plan before upgrade (§14).', 'Students invited by a paying Coach do not need to pay to do assigned work (§20.3).'],
        where: ['student/dashboard', 'student/tasks', 'student/garden']
      },
      spec: ['§9.1', '§14', 'D12'], scenarios: ['E']
    },
    {
      id: 'ic-task',
      title: 'Approved work grows the Program’s Group Garden',
      summary: 'The student completes an assigned task and the Coach approves it (Chapter 5). The approval adds one contribution to this independent group’s own Group Garden.',
      show: ['coach', 'assignment', 'groupGarden'],
      edges: ['coach>assignment', 'assignment>groupGarden'], flows: ['coach>assignment@check', 'assignment>groupGarden@leaf'], sequence: true,
      status: { assignment: ['Submitted', 'Approved'] },
      note: { kind: 'event', title: 'Group Garden contribution', text: 'An independent Coach group has its own Group Garden, owned by its Program, separate from any Initiative’s.' },
      details: {
        what: 'Approved work produced one collective contribution.',
        who: 'Coach (approval); reward rules (contribution).',
        changed: 'Review Approved; one Group Garden contribution with the review ID.',
        visible: 'Group members and the Coach.',
        rules: ['One Group Garden per independent Coach group (D13).', 'Coaches have no grow button (D11).'],
        where: ['mentor/reviews', 'mentor/group-garden', 'student/garden']
      },
      spec: ['§9.1', '§13.3', 'D11', 'D13'], scenarios: ['E', 'C']
    },
    {
      id: 'ic-upgrade', overview: true,
      title: 'Upgrading keeps the same identity',
      summary: 'The student upgrades to a full Individual account. The same identity keeps the group membership, assignments, submissions, reviews and earned history, and gains the personal journey.',
      brief: 'Upgrading to a full Individual keeps the same identity and all earlier work.',
      show: ['student', 'identity', 'individual'],
      at: { student: [200, 270], identity: [500, 270], individual: [800, 270] },
      labels: { individual: 'Full Individual' }, shorts: { individual: 'Individual' },
      edges: ['student>identity', 'identity>individual'], flows: ['student>identity', 'identity>individual'], sequence: true, token: 'key',
      status: { individual: 'Upgraded' },
      note: { kind: 'event', title: 'Upgraded, same identity', text: 'Nothing is copied or lost. The four-assessment personal journey is now offered, and the Group Garden stays a separate destination.' },
      details: {
        what: 'Individual capability was added to an existing Student identity.',
        who: 'The student.',
        changed: 'Same identity gains Individual access and consents; history preserved.',
        visible: 'Their own Individual pages plus the Group Garden as a separate destination.',
        rules: ['Upgrade preserves membership, work and earned history (§14, D12).', 'The personal journey is offered under the same identity (§14).'],
        fails: ['A duplicate identity is prevented (§21.4 L).'],
        where: ['student/account', 'onboarding.html', 'garden.html']
      },
      spec: ['§14', '§21.4 L', 'D12', 'D45'], scenarios: ['E']
    },
    {
      id: 'ic-boundary',
      title: 'Program and Initiative stay separate, even when linked',
      summary: 'An Institution can link an approved independent Coach Program as a component. The Coach keeps ownership of members, tasks and reviews; the Initiative receives only agreed projections.',
      show: ['program', 'partnership', 'initiative'],
      at: { program: [200, 270], partnership: [500, 270], initiative: [800, 270] },
      labels: { program: 'Coach Program', initiative: 'Institution Initiative' }, shorts: { initiative: 'Initiative' },
      subs: { program: 'Coach-owned', initiative: 'Institution-owned' },
      edges: ['program>partnership', 'partnership>initiative'], flows: ['program>partnership', 'partnership>initiative'], sequence: true, token: 'arrow',
      status: { partnership: 'Linked' },
      note: { kind: 'caution', title: 'Ownership does not transfer', text: 'Linking never moves Program groups into the Initiative or duplicates rewards. The same student event keeps one source ID in both reports.' },
      details: {
        what: 'A boundary between two owners.',
        who: 'Coach and Representative, by mutual agreement.',
        changed: 'Partnership Linked with an agreed data scope.',
        visible: 'The Initiative presents the Program as a component; reports receive aggregate or agreed projections.',
        rules: ['A linked independent Program retains its own groups and task records (§13.1).', 'The same student event and reward source ID is reused in both reporting contexts (§18).', 'Unlinking stops future presentation only (§18).'],
        where: ['mentor/programs', 'organization/partners']
      },
      spec: ['§13.1', '§18', 'D19', 'D24'], scenarios: ['E', 'F']
    }
  ]
});
