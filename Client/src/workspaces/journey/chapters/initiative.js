/* Chapter 2 · Institution and Initiative creation (§15, §15.2, §18, §21.4 B). */
const stage = (n, name) => `Stage ${n} · ${name}`;

export default f => ({
  id: 'initiative', n: 2, title: 'Institution and Initiative creation', short: 'Initiatives',
  layout: { rep: [200, 150], initiative: [500, 150], explore: [800, 150], institution: [500, 110], session: [200, 410], program: [400, 410], experience: [600, 410], group: [400, 410], coach: [600, 410], supervisor: [800, 410], application: [350, 410], completion: [650, 410], admin: [800, 410] },
  subs: { rep: 'Verified' },
  steps: [
    {
      id: 'init-rep', overview: true,
      title: 'A verified Representative acts for an Institution',
      summary: 'The Institution is a verified entity, not a login. Its approved Representative is the person who builds and publishes the Institution’s Initiatives.',
      brief: 'An approved Representative builds and publishes Initiatives for a verified Institution.',
      show: ['rep', 'institution'],
      at: { rep: [300, 270], institution: [700, 270] },
      edges: ['rep>institution'],
      status: { rep: 'Approved', institution: 'Verified' },
      note: { kind: 'info', title: 'Entity and person', text: 'Admin verified the Institution and the Representative’s authority once (Chapter 1). Ordinary Initiatives need no further Admin approval.' },
      details: {
        what: 'The starting point: an approved Representative for a verified Institution.',
        who: 'Institution Representative.',
        changed: 'Nothing in this step.',
        visible: `The Institution workspace: dashboard with accepted seats (of ${f.seats} per Initiative), active Supervisors (of ${f.supervisors}), applications, sessions and alerts.`,
        rules: ['The Institution is a governed entity, not a human login (§1.2).', 'Approved Representatives publish ordinary Initiatives without per-Initiative Admin review (D17).', 'Admin keeps later moderation, unpublishing and suspension (§15).'],
        where: ['organization/dashboard', 'organization/settings', 'admin/organizations']
      },
      spec: ['§15', '§19', 'D17', 'D18'], scenarios: ['B', 'F']
    },
    {
      id: 'init-stage-1',
      title: 'Stage 1 · Basic information',
      summary: 'The Representative starts a Draft with a title, topic, objective, short summary, dates and time zone. The owner resolves automatically to the verified Institution.',
      show: ['rep', 'initiative'],
      edges: ['rep>initiative'], flows: ['rep>initiative'], token: 'edit',
      subs: { initiative: stage(1, 'Basic info') },
      status: { initiative: 'Draft' },
      note: { kind: 'event', title: 'Draft started', text: 'A versioned Initiative Draft now exists. Drafts are never visible in Explore.' },
      details: {
        what: 'The Initiative Builder created a Draft.',
        who: 'Institution Representative.',
        changed: 'A new Initiative record in Draft, version 1, owned by the Institution.',
        visible: 'Only the Institution’s Representative (and later its authorized staff).',
        rules: ['Required: title, topic, objective, short summary, start/end and time zone (§15.2).', 'End must be after start; no unsupported medical claims.', 'The draft saves at every stage.'],
        fails: ['A blocker names the exact field and how to fix it.'],
        where: ['organization/initiatives']
      },
      spec: ['§15.2 stage 1'], scenarios: ['B']
    },
    {
      id: 'init-stage-2',
      title: 'Stage 2 · Audience, coverage, capacity and cost',
      summary: `The Representative sets who can apply, where it runs, its participation modes and its capacity, from 1 to ${f.seats} accepted students. It is Free or Paid with a disclosed price.`,
      show: ['rep', 'initiative'],
      edges: ['rep>initiative'], flows: ['rep>initiative'], token: 'edit',
      subs: { initiative: stage(2, 'Audience & cost') },
      status: { initiative: 'Draft' },
      note: { kind: 'info', title: `Capacity up to ${f.seats}`, text: `Each Initiative has its own cap of ${f.seats} accepted students. Pending and queued applicants never use a seat.` },
      details: {
        what: 'Public terms were added to the Draft.',
        who: 'Institution Representative.',
        changed: 'Draft revised with audience, age and consent rules, jurisdiction, coverage (separate from the Institution’s address), modes, capacity, application window and cost.',
        visible: 'Still only the Representative.',
        rules: [`Capacity must be between 1 and ${f.seats} accepted students per Initiative (D28).`, 'Coverage is separate from headquarters; city preference is never a security gate (§11.1).', 'Paid requires a positive disclosed price and currency.'],
        fails: ['A capacity above the cap is refused with the field highlighted.'],
        where: ['organization/initiatives']
      },
      simulated: 'Payment for a Paid Initiative is simulated in Phase 1: there is no charge, refund or payment integration.',
      spec: ['§11.1', '§15.2 stage 2', 'D28'], scenarios: ['B']
    },
    {
      id: 'init-stage-3',
      title: 'Stage 3 · Content, sessions and linked components',
      summary: 'The Initiative gains components: sessions, awareness content, identified surveys, competitions, and optional links to an independent Coach Program or a Provider Experience.',
      show: ['rep', 'initiative', 'session', 'program', 'experience'],
      edges: ['rep>initiative', 'initiative>session', 'initiative>program', 'initiative>experience'], flows: ['initiative>session', 'initiative>program', 'initiative>experience'], token: 'layers',
      subs: { initiative: stage(3, 'Components'), program: 'Coach-owned', experience: 'Provider-owned' },
      status: { initiative: 'Draft', session: 'Draft', program: 'Link requested', experience: 'Link requested' },
      note: { kind: 'info', title: 'Components keep their owners', text: 'A linked Coach Program or Provider Experience is requested, not copied. It becomes an active component only after its owner accepts (Chapter 9).' },
      details: {
        what: 'Components were attached to the Initiative Draft.',
        who: 'Institution Representative.',
        changed: 'Session drafts (with mode, venue or link, capacity, registration window, attendance and completion policy) and pending link requests.',
        visible: 'The Representative; the counterpart Coach or Provider sees the link request.',
        rules: ['Each component keeps its own lifecycle (§15.2 stage 3).', 'Session seats are a separate pool from Initiative admission (§15.3).', 'An external link requires counterpart agreement; pending links never show as active public components (§18).', 'Internal structured work stays inside the Initiative; it never creates a redundant Program (D19).'],
        where: ['organization/initiatives', 'organization/sessions', 'organization/partners']
      },
      spec: ['§15.2 stage 3', '§18', 'D19', 'D39'], scenarios: ['B', 'F']
    },
    {
      id: 'init-stage-4',
      title: 'Stage 4 · Team and groups',
      summary: 'The Representative invites Coaches and Supervisors by email and sketches internal groups. Staffing never blocks publication.',
      show: ['rep', 'initiative', 'group', 'coach', 'supervisor'],
      edges: ['rep>initiative', 'initiative>group', 'initiative>coach', 'initiative>supervisor'], flows: ['initiative>coach', 'initiative>supervisor'], token: 'envelope',
      subs: { initiative: stage(4, 'Team & groups'), group: 'Internal group' },
      status: { initiative: 'Draft', coach: 'Pending', supervisor: 'Pending' },
      note: { kind: 'caution', title: 'Publication can come first', text: 'An Initiative may publish and enroll before any Supervisor accepts. Sessions that need attendance show “Needs Supervisor” until one is active.' },
      details: {
        what: 'Staff invitations and preliminary groups were added.',
        who: 'Institution Representative.',
        changed: 'Pending staff invitations scoped to this Initiative; preliminary internal groups.',
        visible: 'Recipients see invitation previews; staff list shows Pending.',
        rules: [`Up to ${f.supervisors} active Supervisors per Initiative (D28).`, 'Pending invitations do not grant access (Chapter 3).', 'Missing active Supervisor disables attendance only; it is not a publish blocker (D38).', 'No approved cap on group count or Coach-to-student ratio.'],
        where: ['organization/team', 'organization/initiatives']
      },
      spec: ['§15.2 stage 4', 'D28', 'D38'], scenarios: ['B', 'C']
    },
    {
      id: 'init-stage-5',
      title: 'Stage 5 · Rules, forms, consent and completion',
      summary: 'The Representative publishes the rules people will rely on: admission and waitlist, identified forms, absence and excuse policy, completion criteria and safety and privacy text.',
      show: ['rep', 'initiative', 'application', 'completion'],
      edges: ['rep>initiative', 'initiative>application', 'initiative>completion'], flows: ['initiative>application', 'initiative>completion'], token: 'doc',
      labels: { application: 'Application form', completion: 'Completion rule' },
      shorts: { application: 'Form', completion: 'Completion' },
      subs: { initiative: stage(5, 'Rules'), application: 'Identified, versioned' },
      status: { initiative: 'Draft' },
      note: { kind: 'caution', title: 'Rules are explicit', text: 'Completion can never be inferred from a check-in or an accepted excuse. Any makeup or waiver must be written into the published policy.' },
      details: {
        what: 'Rules and forms were attached to the Draft.',
        who: 'Institution Representative.',
        changed: 'Versioned form definitions and policy text on the Initiative.',
        visible: 'Applicants will see these rules before applying.',
        rules: ['Phase-1 forms and surveys are identified; there is no anonymous survey option (D41).', 'Session booking is distinct from admission (§15.2 stage 5).', 'A response stays pinned to the form version it answered.'],
        where: ['organization/forms', 'organization/initiatives']
      },
      spec: ['§15.2 stage 5', '§15.4', 'D36', 'D41'], scenarios: ['B']
    },
    {
      id: 'init-publish', overview: true,
      title: 'Stage 6 · Preview and publish to Explore',
      summary: 'The Representative previews exactly what an Individual will see and publishes. The Initiative appears in regular Individual Explore, with no per-Initiative Admin approval.',
      brief: 'Publishing puts the Initiative in regular Individual Explore, without per-Initiative Admin approval.',
      show: ['rep', 'initiative', 'explore'],
      edges: ['rep>initiative', 'initiative>explore'], flows: ['initiative>explore'], token: 'globe',
      subs: { initiative: stage(6, 'Publish') },
      status: { initiative: ['Draft', 'Published'] },
      note: { kind: 'event', title: 'Initiative published', text: 'The Initiative is now visible in Explore and on eligible Home cards. Later changes to date, cost, capacity, venue or eligibility create a new version and notify affected people.' },
      details: {
        what: 'The Initiative moved from Draft to Published.',
        who: 'Institution Representative.',
        changed: 'Initiative Draft → Published; a stable public version and source ID.',
        visible: 'Regular Individual Explore and Home; Platform Admin oversight lists it.',
        rules: ['Publication checks verified Institution and Representative, valid dates, eligibility and consent, at least one ready public component where appropriate, lawful ownership and capacity (§15.2).', 'It does not require Supervisor acceptance (D38) or Admin approval (D17).', 'Drafts stay hidden from Explore.'],
        fails: ['A publish blocker names the missing field; the Initiative stays Draft.', 'Admin can later unpublish or suspend; new actions stop and existing participants are notified (§21.3).'],
        where: ['organization/initiatives', 'explore.html', 'admin/initiatives']
      },
      spec: ['§15.2 stage 6', '§21.3', '§21.4 B', 'D17', 'D38'], scenarios: ['B', 'F']
    },
    {
      id: 'init-terms',
      title: 'Six things that are easy to confuse',
      summary: 'An Institution owns Initiatives. An Initiative contains internal Groups and Sessions, and may link to an independently owned Coach Program or Provider Experience.',
      show: ['institution', 'initiative', 'group', 'session', 'program', 'experience'],
      at: { institution: [500, 100], initiative: [500, 260], group: [200, 430], session: [400, 430], program: [600, 430], experience: [800, 430] },
      subs: { group: 'One parent only', session: 'Own seat pool', program: 'Coach-owned link', experience: 'Provider-owned link' },
      edges: ['institution>initiative', 'initiative>group', 'initiative>session', 'initiative>program', 'initiative>experience'],
      dim: ['program', 'experience'],
      focus: [],
      note: { kind: 'info', title: 'Ownership stays clear', text: 'Every Group has exactly one parent: an Initiative or an independent Coach Program, never both. Linked resources keep their own owner, seats and records.' },
      details: {
        what: 'A map of the structural terms, without any event.',
        who: 'Not applicable.',
        changed: 'Nothing.',
        visible: 'Not applicable.',
        rules: ['Institution: verified entity with approved Representatives.', 'Initiative: Institution-owned project, awareness or structured.', 'Internal Group: operational cohort inside one Initiative.', 'Session: scheduled online, in-person or hybrid meeting with its own registration and seats.', 'Coach Program: independently Coach-owned pathway; linking does not transfer ownership.', 'Provider Experience: Provider-owned trip, outing or camp; Provider keeps bookings and safety.'],
        where: ['organization/initiatives', 'organization/partners', 'admin/programs', 'admin/experiences']
      },
      spec: ['§2.1', '§13.1', '§15', '§18', 'D19', 'D40'], scenarios: ['B', 'F']
    }
  ]
});
