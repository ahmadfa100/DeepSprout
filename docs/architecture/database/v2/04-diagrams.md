# 04 — Context map, simplified master ERD and detailed relationship views

These diagrams describe the **128-table complete target** at a readable level. An arrow in an ERD denotes an actual proposed FK, not authorization. Some composite FK columns and supporting records are omitted for space and are normative in [the target dictionary](03-target-dictionary.md). The old diagrams in `../diagrams/` remain historical, including their seat tables. The `files.SecureFile` move and removed projection/Submission/slot tables are reflected here.

## 1. Platform context map

```mermaid
flowchart LR
  IAM[Identity and scoped grants] --> Institution[Institution and Initiative]
  IAM --> Personal[Individual Lab Recovery Activity Shield]
  IAM --> Coach[Independent Coach Program and Groups]
  IAM --> Provider[Provider Experience]
  Institution --> Groups[Operational Groups]
  Coach --> Groups
  Groups --> Tasks[Shared Assignments and Reviews]
  Institution --> Sessions[Sessions Attendance Excuses]
  Provider --> Booking[Booking Waitlist Attendance]
  Institution --> Links[Accepted Partnerships]
  Provider --> Links
  Coach --> Links
  Personal --> Evidence[Evidence and Rewards]
  Tasks --> Evidence
  Sessions --> Evidence
  Booking --> Evidence
  Evidence --> Garden[Personal and Group Garden views]
  IAM --> Security[Audit Files Outbox]
  Institution --> Security
  Provider --> Security
```

## 2. Simplified master ERD

```mermaid
erDiagram
  Person ||--o{ InitiativeApplication : submits
  Person ||--o{ InitiativeMembership : holds
  Institution ||--o{ Initiative : owns
  Initiative ||--o{ InitiativeRevision : publishes
  Initiative ||--o{ InitiativeApplication : receives
  InitiativeApplication ||--o{ InitiativeApplicationDecision : records
  InitiativeApplication ||--o| InitiativeMembership : admits
  Initiative ||--o{ OperationalGroup : contains
  CoachProgram ||--o{ OperationalGroup : contains
  OperationalGroup ||--o{ Assignment : issues
  Assignment ||--o{ AssignmentRecipient : assigns
  AssignmentRecipient ||--o{ SubmissionAttempt : receives
  SubmissionAttempt ||--o{ ReviewDecision : decided_by
  Initiative ||--o{ Session : includes
  Session ||--o{ SessionRegistration : registers
  SessionRegistration ||--o| SessionAttendance : observes
  Provider ||--o{ Experience : owns
  Experience ||--o{ ExperienceBooking : books
  ExperienceBooking ||--o{ SeatOffer : offered
  Person ||--o{ EvidenceEvent : subject
  EvidenceEvent ||--o{ PersonalRewardEntry : grants
  EvidenceEvent ||--o{ GroupRewardEntry : grants
  GroupGarden ||--o{ GroupRewardEntry : receives
```

`OperationalGroup` has XOR Initiative/CoachProgram ownership; the two lines mean alternatives, not dual ownership. One Person may have many **historical** memberships, but the filtered unique index permits at most one in `Accepted`/`Suspended` state.

## 3. Identity and resource-scoped authorization

```mermaid
erDiagram
  Person ||--o{ PersonEmail : verifies
  Person ||--o| PasswordCredential : authenticates
  Person ||--o{ GlobalGrant : platform_authority
  Person ||--o{ ConsentRecord : decides
  Institution ||--o{ RepresentativeMembership : authorizes
  Person ||--o{ RepresentativeMembership : holds
  Initiative ||--o{ InitiativeStaffInvitation : invites
  InitiativeStaffInvitation ||--o| InitiativeStaffAppointment : yields
  Person ||--o{ InitiativeStaffAppointment : holds
  Provider ||--o{ ProviderMembership : authorizes
  Person ||--o{ ProviderMembership : holds
  Experience ||--o{ ProviderStaffAppointment : scopes
  Person ||--o{ ProviderStaffAppointment : holds
```

Grant lookup uses the exact resource and active status each time. An invitation is not a grant. Revocation stops future reads/writes while existing authored facts retain their Person IDs.

## 4. Institution, admission and membership

```mermaid
erDiagram
  Institution ||--o{ InstitutionVerificationCase : verified_by
  Institution ||--o{ Initiative : owns
  Initiative ||--o{ InitiativeRevision : has_published_terms
  Initiative ||--o{ InitiativeApplication : receives
  Person ||--o{ InitiativeApplication : submits
  InitiativeRevision ||--o{ InitiativeApplication : terms_pinned
  InitiativeApplication ||--o{ InitiativeApplicationDecision : history
  InitiativeApplication ||--o| InitiativeMembership : admitted_as
  InitiativeApplication ||--o{ InitiativeSeatOffer : receives
  Initiative ||--o{ InitiativeMembership : scopes
  Person ||--o{ InitiativeMembership : participates
  Initiative ||--o{ InitiativeStaffAppointment : appoints
```

Application/decision/offer/membership all carry InitiativeId where necessary for same-parent composite FKs. Membership also pins PersonId to the same Application. `CapacityReleasedAtUtc IS NULL` rows and active offers consume capacity. Application attempts are distinct; policy determines if a new attempt may be submitted.

## 5. Coach, Groups and Assignments

```mermaid
erDiagram
  CoachProgram ||--o{ ProgramRevision : publishes
  ProgramRevision ||--o{ ProgramStage : defines
  Initiative ||--o{ OperationalGroup : owns_alternative
  CoachProgram ||--o{ OperationalGroup : owns_alternative
  OperationalGroup ||--o{ InitiativeGroupPlacement : places
  InitiativeMembership ||--o{ InitiativeGroupPlacement : placed
  OperationalGroup ||--o{ ProgramGroupMembership : enrolls
  OperationalGroup ||--o{ GroupCoachAssignment : assigns
  OperationalGroup ||--o{ Assignment : issues
  Assignment ||--o{ AssignmentRevision : versions
  Assignment ||--o{ AssignmentRecipient : recipients
  AssignmentRecipient ||--o{ SubmissionAttempt : attempts
  SubmissionAttempt ||--o{ ReviewDecision : decisions
  ReviewDecision ||--o{ ReviewPrivateNote : private_notes
  OperationalGroup ||--o{ CoachReport : reports
  Initiative ||--o{ SupervisorReport : summarizes
```

AssignmentRecipient absorbs old Submission current state; Attempts and Reviews stay immutable. Group parent XOR and placement composite FKs prevent cross-Initiative/Program moves. Transfer changes placement/responsibility, not author IDs.

## 6. Sessions, factual attendance and excuses

```mermaid
erDiagram
  Initiative ||--o{ Session : contains_optional
  Institution ||--o{ Session : owns
  Session ||--o{ SessionRevision : versions
  Session ||--o{ SessionCapacityPool : divides_modes
  SessionCapacityPool ||--o{ SessionRegistration : allocates
  SessionRevision ||--o{ SessionRegistration : terms_pinned
  InitiativeStaffAppointment ||--o{ InitiativeSessionDuty : authorizes
  Session ||--o{ InitiativeSessionDuty : requires
  SessionRegistration ||--o| SessionAttendance : factual_record
  SessionAttendance ||--o{ AttendanceCorrection : corrected_by
  SessionAttendance ||--o| AbsenceExcuse : explained_by
  InitiativeMembership ||--o| InitiativeCompletion : evaluated
```

The Session's Initiative FK is nullable for stand-alone sessions. Stand-alone Supervisor authority is a conditional table until the product confirms that workflow. Accepted excuse leaves attendance `Absent`; completion uses published criteria separately. Registration count under a locked Pool enforces mode capacity.

## 7. Provider, booking and held offers

```mermaid
erDiagram
  Provider ||--o{ ProviderVerificationCase : verified_by
  Provider ||--o{ Experience : owns
  Experience ||--o{ ExperienceRevision : versions
  Experience ||--o{ ExperienceSession : schedules
  Experience ||--o{ ExperienceBooking : books
  ExperienceRevision ||--o{ ExperienceBooking : terms_pinned
  ExperienceBooking ||--o{ SeatOffer : held_offer
  Experience ||--o{ ProviderStaffAppointment : scopes
  ProviderStaffAppointment ||--o{ ProviderAppointmentSession : covers
  ExperienceSession ||--o{ ProviderAppointmentSession : covered_by
  ExperienceBooking ||--o{ ProviderAttendance : attends
  ExperienceSession ||--o{ ProviderAttendance : observes
  ProviderAttendance ||--o{ ProviderAttendanceCorrection : corrects
  ExperienceBooking ||--o| CampCompletion : completes
```

The Booking and Offer both carry ExperienceId for same-parent FKs. Count confirmed claims plus live Offered holds under the Experience row lock. Provider cohort/incident records are conditional on safety policy and do not own a Garden.

## 8. Individual, Lab, Recovery, Activities and Shield

```mermaid
erDiagram
  Person ||--o| IndividualProfile : sets_up
  Person ||--o{ AssessmentAttempt : takes
  AssessmentInstrument ||--o{ InstrumentVersion : publishes
  InstrumentVersion ||--o{ AssessmentAttempt : pins
  AssessmentAttempt ||--o{ AssessmentResponse : answers
  AssessmentAttempt ||--o{ AssessmentScore : scored_by
  Person ||--o{ RecoveryJourney : begins
  RecoveryJourney ||--o{ RecoveryCycle : cycles
  RecoveryCycle ||--o{ PlanRevision : versions
  PlanRevision ||--o{ ScheduledAction : schedules
  PracticeDefinition ||--o{ PracticeVersion : publishes
  PracticeVersion ||--o{ PracticeAttempt : executed_as
  Person ||--o{ PracticeAttempt : performs
  Person ||--o{ PracticeProgressionDecision : progresses
  Person ||--o{ ShieldConfiguration : chooses
  ShieldConfiguration ||--o{ ShieldSelectedDomain : selects
  ExtensionInstallation ||--o{ BrowserUsagePeriod : observes
  BrowserUsagePeriod ||--o{ BrowserUsageDomain : breaks_down
```

Onboarding fields are in IndividualProfile. RecoveryJourney is retained with one active journey per Person and archived history. AI may explain these source facts through an authorized projection; it never creates PlanRevision/Score/Reward.

## 9. Evidence, Rewards and Garden

```mermaid
erDiagram
  Person ||--o{ EvidenceEvent : subject
  EvidenceEvent ||--o{ PersonalRewardEntry : source
  EvidenceEvent ||--o{ GroupRewardEntry : source
  RewardPolicyVersion ||--o{ PersonalRewardEntry : rule
  RewardPolicyVersion ||--o{ GroupRewardEntry : rule
  Person ||--o{ PersonalRewardEntry : beneficiary
  Initiative ||--o| GroupGarden : collective_owner
  OperationalGroup ||--o| GroupGarden : independent_owner
  GroupGarden ||--o{ GroupRewardEntry : beneficiary
```

The two Garden owner relationships are XOR, with composite `(IndependentGroupId,ProgramId)` pointing to a CoachProgram-owned Group. Four personal trees and bounded decorations are query results from the personal ledger, by PracticeType and effect. No Garden-state cache is authoritative.

## 10. Security, files, audit and outbox

```mermaid
erDiagram
  Person ||--o{ AuditEvent : acts
  Person ||--o{ SecureFile : may_own
  SecureFile ||--o{ InstitutionVerificationCase : evidence
  SecureFile ||--o{ SubmissionAttempt : attachment
  SecureFile ||--o{ AbsenceExcuse : restricted_attachment
  Person ||--o{ IdempotencyRecord : commands
  Person ||--o{ Notification : recipient
  Notification ||--o{ DeliveryAttempt : delivery_history
```

`AuditEvent.ResourceKind/ResourcePublicId` and Outbox event references are metadata, not generic ownership FKs. File download authorization resolves the actual owning case/attempt/excuse and current grant. Outbox is written with a domain transaction for external delivery.

## Critical states

```mermaid
stateDiagram-v2
  [*] --> Pending: apply
  Pending --> Withdrawn: student withdraws
  Pending --> Rejected: Representative rejects
  Pending --> Accepted: Rep or active Supervisor approves
  Pending --> Queued: capacity policy
  Queued --> Offered: serialized hold
  Offered --> Accepted: accept before expiry
  Offered --> Queued: decline or processed expiry
  Accepted --> Suspended: Representative
  Suspended --> Accepted: Representative restores
  Accepted --> Withdrawn: student before cutoff
  Accepted --> Removed: Representative
  Accepted --> Completed: criteria
```

`Accepted` here denotes application/membership transition shorthand; the SQL tables keep distinct application and membership rows. An attempted second effective Initiative membership must fail, including concurrent approvals.
