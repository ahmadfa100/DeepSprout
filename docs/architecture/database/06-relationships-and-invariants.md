# 06 — Relationships and invariants

## Invariants enforced by SQL

1. One `Person` per normalized verified email: filtered unique index on active `PersonEmail.NormalizedEmail`; one primary verified email per person. Never merge unverified people solely by email.
2. `OperationalGroup` has `(InitiativeId IS NULL) <> (ProgramId IS NULL)`. Separate placement tables require an Initiative membership for Initiative groups and a Program group membership for independent groups. Composite parent keys prevent cross-Initiative placement.
3. Unique `(InitiativeId,PersonId)` in `InitiativeApplication` and `InitiativeMembership`; one active slot association per offer/membership; `InitiativeSeat.SlotNo` is 1–135 and unique per Initiative. Draft capacity edits cannot remove occupied/held slots.
4. Unique active Supervisor grant cannot duplicate a `(InitiativeId,PersonId,Role)` appointment. The three-active cap requires a transaction, not a row-level check; pending invites do not count.
5. Session `SessionCapacityPool` is tied to a declared participation mode; unique current `SessionSeat` registration allocation; attendance unique `(SessionId,PersonId)` factual row, with append-only `AttendanceCorrection`.
6. Experience `ExperienceSeat` has exactly one current holder: either active `SeatOfferId` or confirmed `ExperienceBookingId`, or neither. Unique current offer/booking across slots. Capacity is the count of slots, not an unchecked frontend number.
7. Unique `(AssignmentId,PersonId)` recipient, `(AssignmentRecipientId)` submission, `(SubmissionId,AttemptNo)` and one decision per attempt. A new submission attempt follows NeedsRevision; old attempts/decisions remain.
8. Versioned published definitions and response/attempt references cannot be deleted while referenced. `FormResponse` always has `PersonId` in Phase 1.
9. `PersonalRewardEntry` and `GroupRewardEntry` each have one issuance per `(EvidenceEventId,BeneficiaryId,EffectCode)`, independent of policy version; correction is a linked compensating entry, not deletion. No Provider Group Garden.

## Invariants enforced by services plus transaction

Eligibility, consent, actual active grant, verified invite email, offer expiry, queue ordering, attendance window/method, Supervisor scope, published rules, completion criteria, reward eligibility/caps and entitlement usage require cross-row/context checks. They run inside the same SQL transaction where a result changes authoritative state. SQL checks cannot safely express time-dependent eligibility or actor permissions. A deterministic clock abstraction supplies UTC instant and resource time zone for tests; client time never decides expiry.

## Referential and deletion policy

Required FKs use `NO ACTION`/restrict for published or historical records; no cascade from Person, Institution, Program, Initiative, Experience, Session or version to operational history. Junction/ephemeral draft children may cascade only while owner remains unpublished and has no evidence. Personal erasure is a governed anonymization/deletion workflow after legal/retention review, not a cascade. File blobs are referenced by opaque object key and deleted through controlled retention jobs after reference checks. All financial/legal retention choices remain open.

## Reporting relationships

Reports join authoritative membership, registration, attendance, excuse, completion, assignment/review and evidence records. `ReportSnapshot` stores definition version, filter/population, source watermark and generated time, never replaces original facts. Group Garden counts eligible source IDs from one Initiative or one independent Group. Cross-owner Program/Experience links produce scoped projections with original IDs; they do not clone memberships, bookings or reward sources.
