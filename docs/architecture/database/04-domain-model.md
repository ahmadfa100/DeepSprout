# 04 — Conceptual domain model

## Core identities and value objects

`Person` is an authenticated subject, never an Institution, Provider, or Program. `VerifiedEmail`, `TimeWindow`, `MoneyDisclosure` (not a charge), `ResourceScope`, `EvidenceProvenance`, `AssessmentProtocolVersion`, `RewardEffect`, and `AuditActor` are value objects. An `IndividualProfile` is optional until upgrade; an invited Student remains the same Person. Global Admin permission, Institution representative membership, Initiative/Provider appointments, and Coach ownership are distinct authority facts. Subscription changes capabilities/quotas only after resource authorization succeeds.

## Ownership and lifecycle

`Institution 1—N Initiative`; `Coach(Person) 1—N CoachProgram`; `OperationalGroup` has **exactly one** `InitiativeId` or `ProgramId`. Initiative internal Groups never create a Program. The shared `Assignment` belongs to a Group. `AssignmentRecipient` snapshots each eligible person when published; transfer later changes future Coach access, not authored attempts. Independent Program links and Provider Experience links to Initiative are accepted contracts with original owner unchanged.

`InitiativeApplication` is a request/decision. Acceptance creates `InitiativeMembership` plus an occupied `InitiativeSeat` in one transaction. Pending/queued consume no seat; a valid offer holds a seat; suspension keeps the occupied slot under the interim default. Group placement is separate. An Institution Session may be an Initiative component or stand alone; the latter has its own named Supervisor appointment. `SessionRegistration` reserves a session-mode seat separately, `SessionAttendance` records Present/Late/Absent/NotRecorded fact, and `AbsenceExcuse` records a distinct decision. `InitiativeCompletion` and independent `ProgramCompletion` evaluate their published criteria, not check-in alone.

`ExperienceBooking` is a provider resource claim, with `Queued`/`Confirmed` lifecycle. `SeatOffer` creates a time-limited hold and `ExperienceSeat` marks a slot Held/Occupied/Free. Camp sessions, attendance and completion remain separate. Each owner-specific invitation uses a hashed token plus `OtpChallenge`/verified email before membership or appointment creation. No invitation status itself is an authorization grant.

## Evidence without false equivalence

Lab attempts retain instrument and scoring version; Shield periods retain browser coverage; practice attempts retain content/validation version; offline routine check-ins are self-report; attendance is supervisor-confirmed. These source aggregates publish `EvidenceEvent` with kind, source key, subject, provenance, effective time and source version. No database column named `RecoveryScore` merges them. Insights computes separately labeled measures. Reward policy may consume only eligible source kinds. Personal tree effects use practice type; flower/rabbit/birdhouse use their respective source categories; completion is a history/reporting classification and possible collective milestone only.

## Transitions and transaction boundaries

See [critical workflows](diagrams/critical-workflows.md). The aggregate root owns legal transitions. SQL uniqueness/checks stop impossible duplicate/current states; application services check multirow caps, policy versions, selected grant and deadlines in locked transactions. Outbox writes in the same transaction as the source; projection and notification consumers are idempotent. Historical versions, decisions and corrections append records. Physical deletion is limited to pre-publication drafts with no dependents; published operational facts are archived/retained per policy.
