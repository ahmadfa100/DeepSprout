/* Chapter 9 · Partnerships, governance and ecosystem integrity (§18–§20, §21.3, §23, §25 F, D14–D17, D40). */
// Coach · Representative · Supervisor · Provider, so every staffing link joins neighbours.
const eco = { admin: [500, 110], coach: [150, 290], rep: [383, 290], supervisor: [617, 290], provider: [850, 290], student: [150, 450], individual: [617, 450] };
const ecoShow = Object.keys(eco);
const ecoLabels = { rep: 'Representative', provider: 'Provider', individual: 'Individual', student: 'Invited Student', admin: 'Platform Admin' };
const ecoShorts = { student: 'Student', admin: 'Admin' };

export default f => ({
  id: 'governance', n: 9, title: 'Partnerships, governance and ecosystem integrity', short: 'Governance',
  layout: { rep: [200, 270], partnership: [500, 270], provider: [800, 270], initiative: [250, 420], experience: [750, 420], explore: [500, 120], admin: [500, 120], program: [500, 420], catalog: [250, 420], cms: [500, 420], community: [750, 420], attendance: [500, 120], notice: [300, 420], audit: [700, 420], individual: [500, 120], entitlement: [300, 420], grant: [700, 420] },
  steps: [
    {
      id: 'gov-link', overview: true,
      title: 'An Institution links a Provider’s Experience',
      summary: 'The Representative asks a Provider to link its Experience as an Initiative component. The link is active only after the Provider accepts the purpose, dates and data-sharing scope.',
      brief: 'Partnerships link independently owned resources only after the other owner accepts.',
      show: ['rep', 'partnership', 'provider'],
      edges: ['rep>partnership', 'partnership>provider'], flows: ['rep>partnership@envelope', '<partnership>provider@check'], sequence: true,
      status: { partnership: ['Pending', 'Accepted'] },
      note: { kind: 'event', title: 'Partnership accepted', text: 'The Provider still owns the Experience’s seats, bookings, safety information and attendance. The Institution receives only the agreed projections.' },
      details: {
        what: 'A partnership request was accepted by its counterpart.',
        who: 'Representative (request); Provider (acceptance).',
        changed: 'Partnership Pending → Accepted, with counterparty, resource, purpose, dates and disclosure scope.',
        visible: 'Both partner workspaces; the Initiative can now present the Experience as a component.',
        rules: ['Links require counterpart acceptance and permitted data-sharing terms (§18).', 'Pending links never appear as active public components.', 'Cross-tenant reads and writes are denied unless the grant explicitly covers them.'],
        fails: ['A declined request stays Declined with a reason; nothing is shared.'],
        where: ['organization/partners', 'provider/partnerships']
      },
      spec: ['§18', 'D40'], scenarios: ['F']
    },
    {
      id: 'gov-linked-explore',
      title: 'One listing, two contexts, one owner',
      summary: 'Explore presents the linked Experience inside the Initiative’s context. Booking still happens against the Provider’s original Experience, so bookings and capacity are never copied.',
      show: ['explore', 'initiative', 'experience'],
      subs: { initiative: 'Institution context', experience: 'Provider owns bookings' },
      edges: ['initiative>explore', 'experience>explore'], flows: ['initiative>explore', 'experience>explore'], token: 'globe',
      status: { experience: 'Linked' },
      note: { kind: 'info', title: 'No copied bookings', text: 'The same underlying booking and reward source ID appear in both reports. Unlinking stops future presentation, not past participation.' },
      details: {
        what: 'A linked component was published in Explore.',
        who: 'Representative (Initiative) and Provider (Experience).',
        changed: 'Public presentation of the linked component.',
        visible: 'Regular Individual Explore.',
        rules: ['Provider retains independent booking and safety ownership (D40).', 'Linked Provider registrations are not broadly visible to Institution staff (§18).'],
        where: ['explore.html', 'organization/partners', 'provider/partnerships']
      },
      spec: ['§18', '§21.3', 'D40'], scenarios: ['F', 'D']
    },
    {
      id: 'gov-oversight', overview: true,
      title: 'Platform Admin governs; owners operate',
      summary: 'Platform Admin oversees published Initiatives, Programs and Experiences, but does not run their bookings, tasks or attendance.',
      brief: 'Admin governs resources; owners keep operating them.',
      show: ['admin', 'initiative', 'program', 'experience'],
      at: { initiative: [250, 420], program: [500, 420], experience: [750, 420] },
      edges: ['admin>initiative', 'admin>program', 'admin>experience'], flows: ['admin>initiative', 'admin>program', 'admin>experience'], token: 'shield',
      note: { kind: 'info', title: 'Oversight, not takeover', text: 'Admin sees owner, status, version and source for each resource, and can unpublish or suspend under governance. It never edits private participant work.' },
      details: {
        what: 'The resource governance view.',
        who: 'Platform Admin.',
        changed: 'Nothing in this step.',
        visible: 'Admin Initiatives, Groups & programs, and Experiences screens.',
        rules: ['No routine takeover of bookings or task authorship (§19).', 'One conceptual Platform Admin; the partner Admin is the migration destination (D14).'],
        where: ['admin/initiatives', 'admin/programs', 'admin/experiences']
      },
      spec: ['§19', 'D14'], scenarios: ['F']
    },
    {
      id: 'gov-suspend',
      title: 'Suspending a resource',
      summary: 'Admin suspends or unpublishes a resource with a reason. New actions stop at once; existing history, notices and audit stay, and affected people are notified.',
      show: ['admin', 'experience', 'explore'],
      at: { admin: [500, 120], experience: [300, 420], explore: [700, 420] },
      edges: ['admin>experience', 'experience>explore:under'], flows: ['admin>experience'], token: 'cross',
      status: { experience: ['Published', '!Suspended'], explore: '!Booking disabled' },
      note: { kind: 'event', title: 'Resource suspended', text: 'The listing’s booking button is disabled for new people. Confirmed participants keep their records and receive a notice.' },
      details: {
        what: 'A published resource was suspended under governance.',
        who: 'Platform Admin, with a reason.',
        changed: 'Resource → Suspended (or Unpublished); audit entry; affected-person notices.',
        visible: 'Owner workspace, Explore and participants’ registrations.',
        rules: ['Admin actions stop future public eligibility and preserve history, audit and notices (§19).', 'Suspended resources stop new admissions but preserve historical participation evidence (§15).'],
        where: ['admin/experiences', 'admin/initiatives', 'admin/audit', 'explore.html']
      },
      spec: ['§15', '§19', '§21.3', '§21.4 J'], scenarios: ['F']
    },
    {
      id: 'gov-content',
      title: 'Catalogs, content and moderation',
      summary: 'Admin maintains the versioned practice catalog and policies, publishes approved content regions through Content Studio, and moderates reported Community content.',
      show: ['admin', 'catalog', 'cms', 'community'],
      edges: ['admin>catalog', 'admin>cms', 'admin>community'], flows: ['admin>catalog', 'admin>cms', 'admin>community'], token: 'edit',
      subs: { catalog: 'Versioned', cms: 'Preview → publish', community: 'Reasoned moderation' },
      note: { kind: 'info', title: 'Versioned and reversible', text: 'Drafts and previews have no public effect. Publishing and rollback are versioned and audited, and earlier records keep the version they were made under.' },
      details: {
        what: 'Admin’s content governance responsibilities.',
        who: 'Platform Admin.',
        changed: 'New catalog, policy or content versions; moderation decisions with reasons.',
        visible: 'Only the explicit target pages named for each publication.',
        rules: ['A published catalog activity or policy cannot silently rewrite records made under an earlier version (§23.2).', 'Content Studio edits only allowlisted regions (§19).', 'Moderation keeps report, reason and appeal (§19).'],
        where: ['admin/activity-catalog', 'admin/policies', 'admin/cms', 'admin/moderation']
      },
      spec: ['§19', '§21.3', '§23.2'], scenarios: ['F']
    },
    {
      id: 'gov-audit',
      title: 'Every change leaves a notice and an audit trail',
      summary: 'A state change notifies the people it affects and records an audit event: actor, capacity used, resource, old and new state, source IDs, time and reason.',
      show: ['attendance', 'notice', 'audit'],
      labels: { attendance: 'Any state change' }, shorts: { attendance: 'Change' },
      edges: ['attendance>notice', 'attendance>audit'], flows: ['attendance>notice@bell', 'attendance>audit@doc'],
      note: { kind: 'info', title: 'Notices point to the real record', text: 'A notice links to the authorized record and removes stale action buttons after the state changes.' },
      details: {
        what: 'The notification and audit side-effects of any mutation.',
        who: 'The acting user; the system records the effects.',
        changed: 'Notification and Audit Event records.',
        visible: 'Recipients see notices; owners and Admin see the audit trail.',
        rules: ['Failures leave the original record unchanged or create a traceable compensating transition (§23.3).', 'Browser-local logs are inspectable demo records, not tamper-resistant evidence (§23.3).'],
        where: ['admin/audit', 'admin/system', 'mentor/notifications']
      },
      simulated: 'Notices are local previews; no email or SMS is sent.',
      spec: ['§23.3', '§22.2'], scenarios: ['F']
    },
    {
      id: 'gov-entitlement',
      title: 'Plans are not permissions',
      summary: 'A subscription or entitlement decides which capabilities and limits apply. It never grants a role. Prices are not set, and payments are simulated.',
      show: ['individual', 'entitlement', 'grant'],
      labels: { entitlement: 'Plan / entitlement', grant: 'Role grant' }, shorts: { entitlement: 'Plan', grant: 'Grant' },
      subs: { entitlement: 'Capabilities & limits', grant: 'What you may act on' },
      edges: ['individual>entitlement', 'individual>grant'],
      status: { entitlement: 'Proposed tiers', grant: 'Issued separately' },
      focus: [],
      note: { kind: 'caution', title: 'Paying never grants a role', text: 'A paying user does not become Admin, and the basic recovery path, official reassessment and earned growth are never locked behind Plus.' },
      details: {
        what: 'The separation between commercial access and authorization.',
        who: 'Not applicable.',
        changed: 'Nothing.',
        visible: 'Admin Plans & entitlements shows proposed tiers without prices.',
        rules: ['Role/workspace decides what an actor may do; entitlement decides included capability and limits (§20).', 'Proposed tiers are not a signed price list; prices are not set (§20.1).', `The approved operational caps (${f.seats} accepted students, ${f.supervisors} active Supervisors per Initiative) are not commercial quotas (§20.6).`],
        where: ['admin/entitlements', 'pricing.html']
      },
      simulated: 'All prices and payments in the static demo are illustrative.',
      spec: ['§20', '§20.6', 'D15'], scenarios: ['F']
    },
    {
      id: 'eco-governance', overview: true,
      title: 'Ecosystem · governance',
      summary: 'Platform Admin verifies Institutions and their Representatives, Outdoor Providers and independent Coaches. It does not approve Institution-invited staff or individual Initiatives.',
      brief: 'Admin verifies the partners who apply; it does not approve each Initiative or invited staff.',
      show: ecoShow, at: eco, labels: ecoLabels, shorts: ecoShorts,
      edges: ['admin>rep', 'admin>coach', 'admin>provider'], flows: ['admin>rep', 'admin>coach', 'admin>provider'], token: 'shield',
      note: { kind: 'info', title: 'Governance relationships', text: 'Admin’s links stop at verification and oversight. Day-to-day authority lives with each owner.' },
      details: {
        what: 'The governance layer of the whole ecosystem.',
        who: 'Platform Admin.',
        changed: 'Nothing; overview.',
        visible: 'Admin workspace.',
        rules: ['Admin verifies Institution/Representative, Provider and independent Coach (D17).', 'No separate Admin approval for Institution-invited Coaches or Supervisors (D21, D22).'],
        where: ['admin/organizations', 'admin/providers', 'admin/mentor-applications']
      },
      spec: ['§19', 'D17', 'D21', 'D22'], scenarios: ['F']
    },
    {
      id: 'eco-staffing',
      title: 'Ecosystem · staffing and scope',
      summary: 'Representatives appoint Initiative Coaches and Supervisors. Providers appoint their own session Supervisors. Every appointment is scoped and revocable.',
      show: ecoShow, at: eco, labels: ecoLabels, shorts: ecoShorts,
      edges: ['rep>coach', 'rep>supervisor', 'provider>supervisor'], flows: ['rep>coach', 'rep>supervisor', 'provider>supervisor'], token: 'envelope',
      note: { kind: 'info', title: 'Staffing relationships', text: 'One person can hold an Initiative grant and a Provider appointment at once, acting under whichever scope they select.' },
      details: {
        what: 'Who appoints whom.',
        who: 'Representatives and Providers.',
        changed: 'Nothing; overview.',
        visible: 'Team & Groups; Supervisors & staff.',
        rules: [`Up to ${f.supervisors} active Supervisors per Initiative (D28).`, 'Only the Representative revokes Initiative staff (D30).', 'Provider Supervisors see only assigned Provider resources (§16).'],
        where: ['organization/team', 'provider/supervisors']
      },
      spec: ['§13', '§16', '§17', 'D28', 'D30'], scenarios: ['B', 'D']
    },
    {
      id: 'eco-participation',
      title: 'Ecosystem · participation',
      summary: 'Individuals apply to Initiatives and book Provider Experiences. Invited Students join Coach groups. Each participation is a separate record held by its owner.',
      show: ecoShow, at: eco, labels: ecoLabels, shorts: ecoShorts,
      edges: ['individual>rep', 'individual>provider', 'student>coach'], flows: ['individual>rep', 'individual>provider', 'student>coach'], token: 'doc',
      note: { kind: 'info', title: 'Participation relationships', text: 'Application, session registration, Provider booking and group membership are distinct records, with the same IDs seen by the person and by the owner.' },
      details: {
        what: 'How people take part.',
        who: 'Individuals and Invited Students.',
        changed: 'Nothing; overview.',
        visible: 'My Initiatives, My Registrations, My Tasks and the owners’ queues.',
        rules: ['Application/registration/withdrawal use the same IDs in owner and person views (REG-13).', 'An Invited Student may later upgrade under the same identity (§14).'],
        where: ['explore.html', 'organization/participants', 'provider/registrations', 'mentor/students']
      },
      spec: ['§11.2', '§14', '§15.3', '§16'], scenarios: ['B', 'D', 'E']
    },
    {
      id: 'eco-evidence', overview: true,
      title: 'Ecosystem · evidence and reporting',
      summary: 'Coaches report to Supervisors, and Supervisors to Representatives. Every report is computed from the original records, and private personal data never enters it.',
      brief: 'Reports flow upward from original records, without private personal data.',
      show: ['admin', 'coach', 'rep', 'supervisor', 'provider'], at: eco, labels: ecoLabels, shorts: ecoShorts,
      edges: ['coach>supervisor:under', 'supervisor>rep'], flows: ['coach>supervisor', 'supervisor>rep'], sequence: true, token: 'chart',
      note: { kind: 'info', title: 'One connected, permissioned system', text: 'Shared identity, permissions, evidence, rewards, reporting, notifications and audit connect every workspace, and each domain keeps an explicit owner.' },
      details: {
        what: 'The reporting layer of the ecosystem.',
        who: 'Coaches, Supervisors and Representatives.',
        changed: 'Nothing; overview.',
        visible: 'Reports pages under each authorized workspace; Admin platform reports.',
        rules: ['Coach Reports → Supervisor Insights/Summary → Representative Reports (D34).', 'Partner staff cannot read unrelated personal data (PRIV-18).', 'Missing data is neutral; no false zeros (§23.2).'],
        where: ['mentor/reports', 'supervisor/reports', 'organization/reports', 'admin/reports']
      },
      spec: ['§1.3', '§15.4', '§23', 'D34'], scenarios: ['B', 'C', 'F']
    }
  ]
});
