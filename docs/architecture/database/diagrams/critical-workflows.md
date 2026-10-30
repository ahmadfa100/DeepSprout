# Critical state machines and transaction sequences

These diagrams describe proposed server behavior. Guards include active selected grant, published version and server time; every accepted transition records audit/outbox.

## Application, membership and invitation

```mermaid
stateDiagram-v2
  [*] --> ApplicationPending : submit identified application
  ApplicationPending --> ApplicationAccepted : Rep or active Supervisor approves + slot
  ApplicationPending --> ApplicationQueued : no seat / policy
  ApplicationPending --> ApplicationRejected : Representative reason
  ApplicationPending --> ApplicationWithdrawn : applicant
  ApplicationQueued --> ApplicationOffered : hold free slot
  ApplicationOffered --> ApplicationAccepted : accept before expiry
  ApplicationOffered --> ApplicationQueued : decline or expiry, if policy permits
  ApplicationAccepted --> MembershipAccepted : create membership on same transaction
  MembershipAccepted --> MembershipSuspended : Representative
  MembershipSuspended --> MembershipAccepted : Representative restore
  MembershipAccepted --> MembershipCompleted : published criteria
  MembershipAccepted --> MembershipRemoved : Representative
  MembershipAccepted --> MembershipWithdrawn : participant
  MembershipSuspended --> MembershipRemoved : Representative
```

```mermaid
stateDiagram-v2
  [*] --> Pending : send hashed email invite
  Pending --> Accepted : verified matching Person + valid token
  Pending --> Declined : recipient
  Pending --> Expired : server time
  Pending --> Cancelled : owner
  Accepted --> Revoked : authorized owner
  Accepted --> [*] : membership or appointment exists
```

An invitation status is not a grant. A valid acceptance transaction creates the scoped appointment/membership exactly once. Pending invitations do not consume the three active Initiative Supervisor places.

## Assignment, booking, attendance, Recovery and reward

```mermaid
stateDiagram-v2
  [*] --> Assigned : publish recipient snapshot
  Assigned --> InProgress : student starts
  InProgress --> Submitted : attempt 1
  Submitted --> NeedsRevision : Coach decision
  NeedsRevision --> Submitted : new attempt
  Submitted --> Approved : Coach or published system rule
  Submitted --> Rejected : Coach reason
  Assigned --> Cancelled : authorized future cancellation
  Approved --> Corrected : authorized superseding decision
```

```mermaid
stateDiagram-v2
  [*] --> Queued : capacity full
  Queued --> Offered : one slot held
  Offered --> Confirmed : accept before expiry
  Offered --> Declined : decline
  Offered --> Expired : server expiry
  Declined --> Queued : configured requeue
  Expired --> Queued : configured requeue
  Confirmed --> Cancelled : cancellation policy
  Confirmed --> CheckedIn : authorized check-in
  CheckedIn --> Completed : published criteria verified
```

`SeatOffer` is its own time-limited record; the booking state above is the participant-facing projection.

```mermaid
stateDiagram-v2
  [*] --> OfferOffered : lock and hold free seat
  OfferOffered --> OfferAccepted : valid acceptance before expiry
  OfferOffered --> OfferDeclined : participant declines
  OfferOffered --> OfferExpired : expiry job wins lock
  OfferOffered --> OfferCancelled : owner cancels
  OfferAccepted --> [*] : held slot becomes confirmed booking
  OfferDeclined --> [*] : release and reoffer
  OfferExpired --> [*] : release and reoffer
  OfferCancelled --> [*] : release and reoffer
```

```mermaid
stateDiagram-v2
  [*] --> NotRecorded
  NotRecorded --> Present : authorized QR/code/manual/online verification
  NotRecorded --> Late : authorized verification
  NotRecorded --> Absent : closeout
  Present --> Corrected : attributed correction
  Late --> Corrected : attributed correction
  Absent --> Corrected : attributed correction
```

```mermaid
stateDiagram-v2
  [*] --> Submitted : missed session explanation
  Submitted --> Recommended : Supervisor
  Submitted --> MoreInfo : Supervisor
  MoreInfo --> Submitted : student adds information
  Recommended --> Accepted : Representative
  Recommended --> Rejected : Representative
```

Excuse is a **separate aggregate**; an accepted excuse plus factual `Absent` displays “Excused Absence” without changing attendance or granting rabbit.

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Preview : generate proposed week 1
  Preview --> Active : valid baselines + offline commitment + acceptance
  Active --> ReviewDue : week boundary
  ReviewDue --> Active : accepted future-only revision / conservative continuation
  Active --> Paused : person choice
  Paused --> Active : resume
  Active --> Ended : cycle end
  Ended --> Reviewed : final review
  Reviewed --> [*] : next cycle or maintenance
```

```mermaid
stateDiagram-v2
  [*] --> Observed : source fact accepted
  Observed --> Evaluated : policy version and eligibility checked
  Evaluated --> Granted : unique personal/group effect
  Evaluated --> Ineligible : reason recorded
  Granted --> Reversed : source corrected or invalidated
  Reversed --> Reassessed : explicit new decision only
```

## Concurrent Initiative approval

```mermaid
sequenceDiagram
  participant R as Rep or Supervisor A
  participant B as Supervisor or Rep B
  participant API as Admission service
  participant DB as SQL Server
  R->>API: Approve(ApplicationId, key A)
  B->>API: Approve(same ApplicationId, key B)
  API->>DB: T1 lock Initiative then free Seat
  DB-->>API: Application Pending, slot free
  API->>DB: Membership + seat occupied + Accepted + audit/outbox
  DB-->>API: commit T1
  API->>DB: T2 lock Initiative/application, reread
  DB-->>API: already Accepted, original MembershipId
  API-->>R: Accepted, original IDs
  API-->>B: same result or safe already-accepted response
```

## Waitlist offer acceptance

```mermaid
sequenceDiagram
  participant P as Participant
  participant J as Expiry job
  participant API as Booking service
  participant DB as SQL Server
  P->>API: Accept(OfferId, idempotency key)
  J->>API: ExpireDueOffers()
  API->>DB: lock Experience → Seat → Offer → Booking
  alt unexpired Offered wins
    DB-->>API: live held slot
    API->>DB: Offer Accepted; Seat holder Booking; Booking Confirmed; outbox
    API-->>P: confirmed original BookingId
  else expiry wins or offer stale
    API->>DB: Offer Expired; clear slot; offer next eligible
    API-->>P: expired/conflict, no confirmed booking
  end
```

## Assignment approval to Garden

```mermaid
sequenceDiagram
  participant C as Scoped Coach
  participant T as Task service
  participant DB as SQL Server
  participant W as Outbox worker
  C->>T: Approve(SubmissionAttemptId)
  T->>DB: transaction: grant check, ReviewDecision, EvidenceEvent, audit/outbox
  DB-->>T: committed original source IDs
  W->>DB: consume EventPublicId idempotently
  DB-->>W: policy version + source provenance
  W->>DB: unique PersonalRewardEntry + eligible GroupRewardEntry
  W->>DB: rebuild four-tree and correct Group Garden projection
```

## Authorized attendance to completion and reporting

```mermaid
sequenceDiagram
  participant S as Active Supervisor
  participant A as Attendance service
  participant DB as SQL Server
  participant C as Completion service
  participant R as Report projection
  S->>A: Verify booking credential / online roster
  A->>DB: transaction: appointment, registration, window, nonce, factual Attendance + event
  DB-->>A: Present/Late original fact
  C->>DB: evaluate published Initiative/Camp rule separately
  DB-->>C: Completion or NotMet with source IDs
  R->>DB: read registration, factual attendance, excuse, completion separately
  R-->>S: source-labeled counts and denominators
```

## Invited Student to full Individual

```mermaid
sequenceDiagram
  participant U as Student
  participant I as Identity service
  participant DB as SQL Server
  participant O as Onboarding service
  U->>I: verify matching email + invite token
  I->>DB: transaction: reuse/create Person, consume invite, create ProgramGroupMembership
  DB-->>U: limited Student scope + Group Garden
  U->>O: opt into full Individual account and consent
  O->>DB: transaction: same PersonId, IndividualProfile + OnboardingProgress
  DB-->>U: same assignments/submissions/reviews + four-baseline journey
```
