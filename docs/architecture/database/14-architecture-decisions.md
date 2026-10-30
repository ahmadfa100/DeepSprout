# 14 — Architecture Decision Records

Each ADR is **proposed** pending team review. Accepted product facts cited from `DeepSprout.md` are not themselves reopened.

| ADR | Choice and rationale | Alternatives rejected / cost |
|---|---|---|
| ADR-01 Database topology | One SQL Server database, bounded-context schemas, modular monolith. Keeps FKs and admission/reward transactions local (§§22–23). | Database per workspace duplicates identity and requires distributed consistency. Microservices premature. Cost: disciplined module ownership in one deployment. |
| ADR-02 Identity | One `Person` with verified email and separate scoped memberships/appointments; optional `IndividualProfile`. Upgrade adds capability to same ID (D45). | User table per role or email-only merge risks duplication/impersonation. Cost: authorization query must resolve selected resource scope. |
| ADR-03 Keys | Clustered BIGINT IDENTITY internally; immutable unique GUID for exposed roots. | All GUID clustered causes wider/random insert indexes; public bigint exposes enumeration. Cost: two identifiers and migration alias map. |
| ADR-04 Group parent | One `OperationalGroup` with explicit Initiative XOR CoachProgram FKs and CK, plus parent-specific placement tables (D19). | Institution Program surrogate or generic `ParentType/ParentId` loses business meaning or FK integrity. Cost: two membership paths. |
| ADR-05 Capacity | Numbered slots for Initiative, Experience and Session pools; owner-row lock and unique holder indexes. | Count-then-insert under ordinary isolation races; mutable counter can drift. Cost: more rows and capacity resize routine, acceptable at ≤135 Initiative slots. |
| ADR-06 Shared assignment | Group-scoped Assignment/Revision/Recipient/Submission/Attempt/Decision engine for both parent kinds. | Two engines diverge on reviews/rewards and duplicate work. Cost: permission resolution through Group parent. |
| ADR-07 Evidence and rewards | Original facts → unique EvidenceEvent → immutable reward grant/reversal ledgers → rebuildable Garden projections. | Mutable XP counter or per-workspace reward copies cannot audit correction/deduplication. Cost: idempotent event processor and policy version management. |
| ADR-08 Attendance | Registration, factual Attendance, Excuse and Completion are separate. Authorized correction appends history (D35–D38). | `Excused` as a Present status or QR as completion falsifies facts/rewards. Cost: more joins and explicit UI composition. |
| ADR-09 EF ownership | One DbContext and migration stream initially; module configurations/services; no generic repository. | Multiple contexts/migrations now complicate local cross-context transactions; unbounded eager graph leaks data. Cost: architecture tests enforce module boundaries. |
| ADR-10 Published versions | Immutable published revisions for instruments, plans, activities, assignments, forms and resource terms. | In-place editing rewrites historical consent/assessment/review meaning. Cost: storage and explicit effective revision pointers. |
| ADR-11 Sensitive data | Private personal schemas/query paths and restricted files; server authorization for every resource, optional RLS defense in depth. | One broad UserDetails DTO or RLS-only protection leaks cross-owner data. Cost: purpose-built projections and access audit. |
| ADR-12 Delivery | Domain state + audit + outbox in one transaction; notices/report projections asynchronously idempotent. | Sending email inside the transaction or dual-writing read models loses atomicity. Cost: worker/monitoring and eventual notice visibility. |

**Decision to revisit after measurements:** if a context later requires independent deployment, extract behind its module contract after defining event consistency and ownership. Do not create that distributed complexity before real scale/organizational need.
