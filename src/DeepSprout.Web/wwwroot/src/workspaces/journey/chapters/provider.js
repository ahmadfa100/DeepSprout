/* Chapter 6 · Outdoor Providers, experiences and waiting lists (§16, §16.1–16.3, §21.4 I, D27, D40). */
export default f => {
  const window = `${f.offerHours}-hour`;
  const queue = { experience: [500, 130], individual: [200, 420], 'individual.b': [400, 420], 'individual.c': [600, 420], 'individual.d': [800, 420] };
  return {
    id: 'provider', n: 6, title: 'Outdoor Providers, experiences and waiting lists', short: 'Providers & waitlists',
    layout: { provider: [200, 270], experience: [500, 270], explore: [800, 270], supervisor: [500, 420], session: [800, 420], qr: [500, 270], completion: [500, 140], birdhouse: [300, 420], report: [700, 420], ...queue },
    labels: { individual: 'Participant A', 'individual.b': 'Participant B', 'individual.c': 'Participant C', 'individual.d': 'Participant D', supervisor: 'Provider Supervisor', camp: 'Camp' },
    shorts: { individual: 'A', 'individual.b': 'B', 'individual.c': 'C', 'individual.d': 'D', supervisor: 'Supervisor' },
    steps: [
      {
        id: 'prov-create',
        title: 'An approved Provider builds an Experience',
        summary: 'An approved Outdoor Provider drafts an Experience or Camp: venue, schedule, audience and consent, seat capacity, safety and cancellation terms, sessions and a completion rule.',
        show: ['provider', 'experience'],
        at: { provider: [300, 270], experience: [700, 270] },
        edges: ['provider>experience'], flows: ['provider>experience'], token: 'edit',
        subs: { provider: 'Approved by Admin' },
        status: { experience: 'Draft' },
        note: { kind: 'info', title: 'The Provider owns it', text: 'The Provider owns its Experience, inventory, bookings, safety information, staff, attendance, completion and reports, even when an Institution links to it.' },
        details: {
          what: 'A six-stage builder created an Experience Draft.',
          who: 'Approved Outdoor Provider.',
          changed: 'Experience Draft with venue, timing, audience, capacity, Free/Paid disclosure, terms, sessions and completion rule.',
          visible: 'Only the Provider until publication.',
          rules: ['Stages: identity; audience, venue and safety; dates, booking window and capacity; camp sessions, Supervisor and completion rule; cancellation disclosure and waitlist; validate and publish (§16.3).', 'An Experience is not an Individual’s self-reported offline routine (§16).'],
          fails: ['Invalid dates, missing safety or consent, or an unapproved owner block only the affected action, with a clear reason.'],
          where: ['provider/experiences', 'admin/providers']
        },
        simulated: 'Paid status and refunds are simulated disclosures in Phase 1.',
        spec: ['§16', '§16.3', 'D18', 'D40'], scenarios: ['D']
      },
      {
        id: 'prov-publish', overview: true,
        title: 'Published to Explore',
        summary: 'On publication the Experience appears in regular Explore with its organizer, dates, venue, mode, capacity, eligibility, safety contact and cancellation policy.',
        brief: 'An approved Provider publishes an Experience to the regular Explore.',
        show: ['provider', 'experience', 'explore'],
        at: { experience: [500, 270] },
        edges: ['provider>experience', 'experience>explore'], flows: ['experience>explore'], token: 'globe',
        status: { experience: ['Draft', 'Published'] },
        note: { kind: 'event', title: 'Experience published', text: 'Eligible Individuals can now book it. Drafts, suspended or cancelled Experiences cannot be booked.' },
        details: {
          what: 'The Experience moved from Draft to Published.',
          who: 'Outdoor Provider.',
          changed: 'Experience → Published; a public version.',
          visible: 'Regular Individual Explore; Platform Admin oversight.',
          rules: ['Later changes to venue, time, price or eligibility create an attributed revision and notify booked people (§16.3).'],
          where: ['provider/experiences', 'explore.html', 'admin/experiences']
        },
        spec: ['§16', '§21.3'], scenarios: ['D']
      },
      {
        id: 'prov-book',
        title: 'Participants book until it is full',
        summary: 'Two participants book. With a capacity of two, every seat is now confirmed.',
        show: ['experience', 'individual', 'individual.b'],
        at: queue,
        edges: ['experience>individual', 'experience>individual.b'], flows: ['<experience>individual', '<experience>individual.b'], token: 'seat',
        status: { experience: '2 of 2 seats', individual: 'Confirmed', 'individual.b': 'Confirmed' },
        note: { kind: 'event', title: 'Bookings confirmed', text: 'Each booking is one shared record: the participant sees it in My Registrations and the Provider sees it in Registrations.' },
        details: {
          what: 'Two bookings were confirmed and the Experience reached capacity.',
          who: 'The participants.',
          changed: 'Two Booking records → Confirmed; confirmed + held seats = capacity.',
          visible: 'Participants’ My Registrations; Provider’s Registrations and Overview.',
          rules: ['Confirmed plus active held seats must never exceed capacity (§16.1).', 'Booking requires the stated consent and form fields.'],
          where: ['explore.html', 'provider/registrations']
        },
        spec: ['§16.1', '§16.2'], scenarios: ['D']
      },
      {
        id: 'prov-queue', overview: true,
        title: 'The next person joins the Waiting List',
        summary: 'At full capacity, a new eligible participant is Queued. They have a place in line, not a seat.',
        brief: 'At full capacity, the next person is Queued without a seat.',
        show: ['experience', 'individual', 'individual.b', 'individual.c'],
        at: queue,
        edges: ['experience>individual', 'experience>individual.b', 'experience>individual.c'], flows: ['<experience>individual.c'], token: 'clock',
        status: { experience: 'Full', individual: 'Confirmed', 'individual.b': 'Confirmed', 'individual.c': ['Requested', 'Queued'] },
        note: { kind: 'event', title: 'Added to the Waiting List', text: 'Participant C is first in the queue. Queue ordering exceptions remain an open policy choice.' },
        details: {
          what: 'A booking request was queued because the Experience was full.',
          who: 'Participant C.',
          changed: 'Queue entry Queued with rank.',
          visible: 'Participant’s My Registrations shows Waitlisted; Provider’s Waiting List shows rank.',
          rules: ['At full capacity an eligible participant may enter Queued without a confirmed seat (§16.1).'],
          where: ['explore.html', 'provider/waitlist']
        },
        spec: ['§16.1', 'D27'], scenarios: ['D']
      },
      {
        id: 'prov-cancel',
        title: 'A confirmed participant cancels',
        summary: 'Participant B cancels their confirmed booking. Their seat is released, and the cancellation is kept in history.',
        show: ['experience', 'individual', 'individual.b', 'individual.c'],
        at: queue,
        edges: ['experience>individual', 'experience>individual.b', 'experience>individual.c'], flows: ['<experience>individual.b'], token: 'cross',
        status: { experience: '1 of 2 seats', individual: 'Confirmed', 'individual.b': ['Confirmed', '!Cancelled'], 'individual.c': 'Queued' },
        dim: ['individual.b'],
        focus: ['experience'],
        note: { kind: 'event', title: 'Seat released', text: 'Cancelling a confirmed booking updates both the participant’s and the Provider’s screens and can trigger an offer to the next eligible person.' },
        details: {
          what: 'A confirmed booking was cancelled.',
          who: 'Participant B (or the Provider within policy).',
          changed: 'Booking Confirmed → Cancelled; one seat available.',
          visible: 'Participant B, the Provider’s Registrations and Waiting List.',
          rules: ['Cancellation or an authorized capacity increase releases availability (§16.1).', 'History and notices remain.'],
          where: ['provider/registrations', 'provider/waitlist']
        },
        spec: ['§16.1', '§21.3'], scenarios: ['D']
      },
      {
        id: 'prov-offer', overview: true,
        title: 'The seat is offered to the next in line',
        summary: `Participant C receives a time-limited offer, and the seat is held for them. The demo’s offer window is ${f.offerHours} hours, an interim configurable default.`,
        brief: 'The next eligible queued person receives a time-limited offer, and the seat is held.',
        show: ['experience', 'individual', 'individual.b', 'individual.c'],
        at: queue,
        edges: ['experience>individual', 'experience>individual.b', 'experience>individual.c'], flows: ['experience>individual.c'], token: 'seat',
        status: { experience: 'Seat held', individual: 'Confirmed', 'individual.b': '!Cancelled', 'individual.c': ['Queued', 'Offered'] },
        dim: ['individual.b'],
        note: { kind: 'event', title: 'Seat available', text: `A place has opened. The next eligible waitlisted participant receives a time-limited offer (${window} interim default).` },
        details: {
          what: 'An offer was issued with a held seat.',
          who: 'The Provider or the queue rule.',
          changed: 'Queue entry Queued → Offered; Offer record with deadline; seat held.',
          visible: 'Participant C sees the offer and its countdown; the Provider sees the held seat.',
          rules: [`Interim configurable default: ${window} offer expiry, visibly labeled, not a final commercial policy (§16.1).`, 'Validate identity, eligibility, resource state, booking cutoff, offer deadline and capacity at every transition.'],
          where: ['provider/waitlist', 'explore.html', 'admin/system']
        },
        simulated: 'The offer countdown uses a demo clock that can be advanced; it is not a production background service.',
        spec: ['§16.1', '§26 interim defaults', 'D27'], scenarios: ['D']
      },
      {
        id: 'prov-accept',
        title: 'The offer is accepted',
        summary: 'Participant C accepts before the deadline. The held seat becomes one confirmed booking. Accepting again would change nothing.',
        show: ['experience', 'individual', 'individual.b', 'individual.c'],
        at: queue,
        edges: ['experience>individual', 'experience>individual.b', 'experience>individual.c'], flows: ['<experience>individual.c'], token: 'check',
        status: { experience: '2 of 2 seats', individual: 'Confirmed', 'individual.b': '!Cancelled', 'individual.c': ['Offered', 'Confirmed'] },
        dim: ['individual.b'],
        note: { kind: 'event', title: 'Offer accepted', text: 'Queued → Offered → Accepted. Participant C now holds one confirmed booking.' },
        details: {
          what: 'The offer was accepted within its window.',
          who: 'Participant C.',
          changed: 'Offer → Accepted; Booking → Confirmed.',
          visible: 'Participant C’s My Registrations; Provider Registrations and Waiting List history.',
          rules: ['Repeated accept actions are idempotent or explicitly rejected (§16.1).', 'No expired acceptance and no overbooking (WAIT-14).'],
          where: ['provider/waitlist', 'provider/registrations', 'explore.html']
        },
        spec: ['§16.1', '§25.1 WAIT-14'], scenarios: ['D']
      },
      {
        id: 'prov-expire',
        title: 'Alternate path · the offer expires',
        summary: 'If Participant C had not responded in time, the offer expires and the held seat is released for the next eligible person.',
        show: ['experience', 'individual', 'individual.c', 'individual.d'],
        at: { ...queue, 'individual.c': [500, 420], 'individual.d': [800, 420] },
        edges: ['experience>individual', 'experience>individual.c', 'experience>individual.d'], flows: ['<experience>individual.c'], token: 'clock',
        status: { individual: 'Confirmed', 'individual.c': ['Offered', '!Expired'], 'individual.d': 'Queued' },
        dim: ['individual.c'],
        focus: ['experience'],
        note: { kind: 'exception', title: 'Offer expired', text: 'The previous seat offer expired. The held seat can now be offered to the next eligible participant.' },
        details: {
          what: 'An offer passed its deadline unanswered. Declining has the same effect.',
          who: 'Time-driven (demo clock), or the participant declining.',
          changed: 'Offer → Expired (or Declined); held seat released.',
          visible: 'Participant C sees the expired offer; the Provider’s Waiting List shows the change.',
          rules: ['Decline or expiry releases the seat and re-offers to the next eligible entry (§16.1).', 'An expired offer cannot be confirmed (§21.3).'],
          where: ['provider/waitlist', 'admin/system']
        },
        simulated: 'Expiry is driven by the demo clock’s advance-time control.',
        spec: ['§16.1', '§21.3', '§25.1 WAIT-14', 'D27'], scenarios: ['D']
      },
      {
        id: 'prov-reoffer',
        title: 'Alternate path · the seat is re-offered',
        summary: 'The released seat is offered to Participant D, the next eligible person in the queue, with a new deadline.',
        show: ['experience', 'individual', 'individual.c', 'individual.d'],
        at: { ...queue, 'individual.c': [500, 420], 'individual.d': [800, 420] },
        edges: ['experience>individual', 'experience>individual.c', 'experience>individual.d'], flows: ['experience>individual.d'], token: 'seat',
        status: { individual: 'Confirmed', 'individual.c': '!Expired', 'individual.d': ['Queued', 'Offered'] },
        dim: ['individual.c'],
        note: { kind: 'event', title: 'Seat re-offered', text: 'Participant D now has a held seat and a new time-limited offer. Participant C’s expired offer stays in history.' },
        details: {
          what: 'A new offer was issued to the next eligible queued entry.',
          who: 'The Provider or the queue rule.',
          changed: 'Queue entry D: Queued → Offered; new Offer record and held seat.',
          visible: 'Participant D and the Provider.',
          rules: ['Re-offer follows the same validation as any offer (§16.1).'],
          where: ['provider/waitlist']
        },
        spec: ['§16.1', 'D27'], scenarios: ['D']
      },
      {
        id: 'prov-supervisor',
        title: 'The Provider appoints a Supervisor for named sessions',
        summary: 'A Provider-appointed Supervisor sees only the Experience sessions or cohorts they are assigned to. It confers no Institution authority.',
        show: ['provider', 'supervisor', 'session'],
        at: { provider: [500, 130], supervisor: [300, 420], session: [700, 420] },
        subs: { supervisor: 'Assigned sessions only', session: 'Camp session' },
        edges: ['provider>supervisor', 'supervisor>session'], flows: ['provider>supervisor'], token: 'envelope',
        status: { supervisor: ['Invited', 'Accepted'] },
        note: { kind: 'info', title: 'Narrow scope', text: 'A Provider Supervisor runs check-in and evaluations for assigned sessions. They cannot see unrelated Provider data or any Institution records.' },
        details: {
          what: 'A Provider appointment was accepted.',
          who: 'Outdoor Provider (appointment); the appointee (acceptance).',
          changed: 'Appointment Invited → Accepted, scoped to named sessions or cohorts.',
          visible: 'The appointee’s Supervisor workspace shows only those resources.',
          rules: ['Provider-assigned Supervisor sees only assigned Provider resource or session scope (§16).', 'Neither kind of Supervisor is Platform Admin (§17).'],
          where: ['provider/supervisors', 'supervisor/experiences', 'supervisor/cohorts']
        },
        spec: ['§16', '§17', 'D15'], scenarios: ['D']
      },
      {
        id: 'prov-checkin',
        title: 'Session check-in with a booking QR',
        summary: 'At each camp session, the assigned Supervisor validates the participant’s booking QR or typed code. That records attendance for the session, not completion of the camp.',
        show: ['individual', 'qr', 'supervisor'],
        at: { individual: [200, 270], qr: [500, 270], supervisor: [800, 270] },
        edges: ['individual>qr', 'qr>supervisor'], flows: ['individual>qr', 'qr>supervisor'], sequence: true, token: 'qr',
        status: { individual: ['Confirmed', 'Present'] },
        focus: ['supervisor', 'individual'],
        note: { kind: 'event', title: 'Attendance verified', text: 'Session attendance and camp completion are separate records. One check-in never completes a camp.' },
        details: {
          what: 'Session attendance was recorded for a camp participant.',
          who: 'Assigned Provider Supervisor.',
          changed: 'Attendance Present with method and actor.',
          visible: 'Participant’s registrations and Insights; Provider Attendance and Reports.',
          rules: ['QR identifies a specific booking and session (§16.2).', 'A replay is idempotent; typed code is the camera-free fallback (D37).'],
          where: ['supervisor/attendance', 'provider/attendance']
        },
        simulated: 'QR rendering and validation are local; secure signed QR is a future backend requirement.',
        spec: ['§16.2', '§17.1', 'D37'], scenarios: ['D']
      },
      {
        id: 'prov-complete', overview: true,
        title: 'Verified camp completion',
        summary: 'Completion is judged against the camp’s declared criteria. It is recognized in the participant’s history, may unlock a bounded birdhouse in their Personal Garden, and feeds the Provider’s reports.',
        brief: 'Verified camp completion may unlock a birdhouse and feeds the Provider’s report.',
        show: ['completion', 'birdhouse', 'report'],
        labels: { completion: 'Camp completion', report: 'Provider report' }, shorts: { completion: 'Completion', report: 'Report' },
        subs: { birdhouse: 'Personal Garden' },
        edges: ['completion>birdhouse', 'completion>report'], flows: ['completion>birdhouse', 'completion>report'], token: 'flag',
        status: { completion: 'Verified' },
        note: { kind: 'info', title: 'No Provider Group Garden', text: 'Camps and cohorts have no Group Garden. A camp birdhouse does not imply less scrolling or a better Lab score.' },
        details: {
          what: 'A participant met the camp’s declared completion criteria.',
          who: 'Assigned Provider Supervisor or Provider, under the completion policy.',
          changed: 'Completion record with evidence; one bounded birdhouse effect when eligible.',
          visible: 'Participant’s history and Insights; Provider Evaluations and Reports; an Institution link receives only agreed data.',
          rules: ['Verified eligible camp completion → bounded birdhouse (D09).', 'No Provider camp or cohort Group Garden (D13).', 'Completion is not Lab or cognitive improvement (§16.2, D46).'],
          where: ['provider/evaluations', 'provider/reports', 'garden.html', 'insights.html']
        },
        spec: ['§9.1', '§16.2', '§21.4 I', 'D09', 'D13', 'D46'], scenarios: ['D']
      }
    ]
  };
};
