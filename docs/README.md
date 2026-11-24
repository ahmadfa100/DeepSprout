# DeepSprout documentation map

Start here. Each question has exactly one current answer; anything not listed as current is history.

## Authority order

1. Latest explicit product-owner decisions: the [4 November v4.1 decision record](architecture/p0-target-v4.1.md) and its 8 November addendum (approved 58-table database).
2. The approved database: [58-table design](architecture/database/README.md).
3. The product specification: [DeepSprout.md](../DeepSprout.md) v4.1, including Onboarding 2.0 (§4).
4. Implemented workflows that agree with 1–3: [current product guide](current-product-guide.md).
5. Everything else (dated reports, design handoffs, validation screenshots) is evidence of what happened at the time, never a requirement.

## Current documents

| Question | Document |
|---|---|
| What should DeepSprout do? | [DeepSprout.md](../DeepSprout.md) (v4.1); decisions in [p0-target-v4.1.md](architecture/p0-target-v4.1.md) |
| What does the running product do, page by page? | [Current product guide](current-product-guide.md) |
| What is the database? | [Database index](architecture/database/README.md): 58 application tables, v5-lean-2 |
| Where does each feature store its data today, and where will it go? | [Persistence contract](architecture/database/persistence-contract.md) |
| What is implemented and what should the backend connect next? | [Backend implementation plan](implementation/backend-start-plan.md) |
| How do accounts, sessions and live Admin authority work? | [Authentication guide](backend/authentication/README.md) |
| What may each role do within its resource? | [Permissions matrix](architecture/permissions-matrix-v4.1.md) |
| What Community server endpoints exist? | [Community server API](implementation/community-server-api.md) |
| What schema would cross-device quiz rooms need? | [Community quiz backend proposal](architecture/community-quiz-backend-proposal.md) (pending owner review) |
| How does EF Core build or adopt the database? | [EF Core adoption](architecture/database/efcore-v5-adoption.md) |
| What are the old 129-table database and EF code? | [Historical M1 database](architecture/database/historical-m1-validation-database.md) |
| How should pages look? | [DESIGN.md](../DESIGN.md) → [DeepSprout-DESIGN.md](../DeepSprout-DESIGN.md); [client design notes](client/README.md) |
| How do I run and test it? | [README](../README.md#run-locally) |
| What must coding agents never do? | [AGENTS.md](../AGENTS.md) |

## Dated implementation records

- [Supervisor Attendance Management Center, 8 November 2026](implementation/attendance-management-center.md), with its canonical route and the 9 November rendering fix
- [Onboarding 2.0 reconciliation, 7 November 2026](implementation/onboarding2-reconciliation-report.md)
- [Partner workspaces v4.1 redesign, 6 November 2026](implementation/partner-workspaces-v41-redesign.md)
- [Client experience, design and validation records](client/README.md), including the HeroReels handoffs and screenshots

Older round reports, cycle audits, phase audits and database design generations (v1–v4, M1 sign-offs, Phase B) were removed on 8 November 2026 because they stated superseded requirements. They remain in Git history before that date.

## What is implemented versus future

| Implemented | Future work |
|---|---|
| The [persistence contract](architecture/database/persistence-contract.md) lists SQL-backed workflows, including signed-in Community posts and Platform Admin moderation. | SQL-backed partner commands. Cross-device Community quiz rooms await schema and transport approval. |
| The approved 58-table V5 model plus Identity framework tables run on disposable SQL Server. The historical M1 model remains separate. | Owner-approved named-database adoption, and any approved import of real browser records. Demo seeds remain separate. |
