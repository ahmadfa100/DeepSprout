# Historical M1 database (129 tables): `DeepSprout_Validation`

**Status:** history only. The approved target is the [58-table design](README.md). Do not extend the M1 model, do not point new code at it, and do not use it as evidence that a requirement is current.

## What it is

Between 1 and 7 November 2026 a 129-table EF Core model ("M1", from the v2.1 design generations) was implemented and validated in the local database `DeepSprout_Validation` on `DESKTOP-A4AL2KR`. Every row in that database is a validation fixture (names like `recovery-6b391321c9 owner`); it holds no user data.

| Part | Path | Why it is kept |
|---|---|---|
| `DeepSproutDbContext`, 18 configuration files, `Sql/*Guards.sql`, `InitiativeSqlCommands.cs` | `src/DeepSprout.Infrastructure/` | The 24 applied migrations of `DeepSprout_Validation` reference them |
| M1 entity classes | `src/DeepSprout.Domain/*Entities.cs`, `Entities.cs` | Same |
| 24 migrations, last `20261107000100_Onboarding2JourneyLevelOne` | `src/DeepSprout.Infrastructure/Migrations/` | `__EFMigrationsHistory` lists them; removing a file would desynchronise the database from the source |
| SQL validation harness | `tests/DeepSprout.DatabaseValidation/` | Writes fixtures into `DeepSprout_Validation` only |
| Read-only integrity checks | `tests/database/*-readonly.sql` | Safe catalog checks for that database |
| Pre-Onboarding-2.0 backup | `DeepSprout_Validation_before_Onboarding2_20261107.bak` (SQL Server default backup folder) | Verified with `RESTORE VERIFYONLY … WITH CHECKSUM` on 8 November |

Every M1 migration starts with `IF DB_NAME() <> N'DeepSprout_Validation' THROW`, so it cannot run anywhere else. That lock stays: the M1 chain is not a deployment path. The V5 migrations refuse an M1 database (error 51100).

## Retirement plan

The M1 code can be removed when the owner no longer needs `DeepSprout_Validation`. Then, in one change: drop or archive the database after a final backup, delete `src/DeepSprout.Infrastructure/Migrations`, the M1 configuration and guard files, the M1 domain entities, `tests/DeepSprout.DatabaseValidation` and `tests/database/*-readonly.sql`, and remove the `DeepSprout.DatabaseValidation` project from both solution files.

## Onboarding 2.0 on M1 (record of 7 November 2026)

Codex added `JourneyLevel` to `recovery.RecoveryJourney`, `SetupVersion` and `SetupAnswersJson` to `personal.IndividualProfile`, and the stages `QuickSetup`, `Story`, `Home`. Its check `SetupAnswersJson IS NULL OR (ISJSON(SetupAnswersJson)=1 AND SetupVersion>0)` lets answers through with a NULL version (SQL treats `NULL > 0` as unknown, and a CHECK passes unknown), and it accepts JSON arrays. That weakness was **not** carried into the approved design: v5-lean-2 requires answers and version together and a JSON object. The requirements moved to `personal.IndividualProfile` in the 58-table design (see the [persistence contract](persistence-contract.md#3-onboarding-20-contract)).

The original migration note follows unchanged.

**Current product contract (7 November 2026):** Register → Meet Bimo → six quick setup questions → HeroReels story (watch or skip) → Home at Journey Level 1. Home offers a preliminary personalized Week 1 plan. Activation happens only after the person reviews the preview and chooses **Activate my plan**. No Lab assessment is required. The previous eight-question and four-baseline first-run paths, and the automatic weekly Lab pair, are superseded.

### Observed ownership and affected records

| Source | Current behavior | Reconciliation |
| --- | --- | --- |
| `DeepSprout` browser record | Person-bound localStorage mirror for first-run flags, profile and plan | Default `onboarding.journeyLevel` to 1; normalize a stored 0 to 1 on read. Keep any higher value and all other fields. |
| `DeepSproutAccount` browser journal | `setup.save`, `onboarding.preview`, `plan.activate`, assessment and recovery events | Quick Setup v2 keeps the six raw answers and compatible old fields. An older `setup.answers` survives under `setup.previousAnswers` when the person edits answers. `plan.activate` requires a valid goal and offline commitment, never baseline results. Existing plan events and attempts are replayed unchanged. |
| `personal.IndividualProfile` | One row per `PersonId`; old stage constraint includes `Baselines`, `Preview`, `Activated`, `TourDone` | Add nullable `SetupVersion` and JSON `SetupAnswersJson`, and allow `QuickSetup`, `Story`, `Home` stages. Retain old stages and the composite same-person `LastAssessmentAttemptId` relationship for history. No duplicate identity or new setup table. |
| `recovery.RecoveryJourney` | One active journey per person, with related cycles and accepted plan revisions | Add `JourneyLevel` with SQL default 1 and a `>=1` check. Existing rows receive 1; any later level above 1 is preserved. No progression threshold is introduced. |
| `lab.AssessmentAttempt`, responses, scores, windows and instrument versions | Versioned results and historical eligibility windows | No schema deletion or data rewrite. No new automatic weekly window is generated in the browser demo. Optional first official assessments and separate practice rounds remain available. A future reassessment protocol needs separate approval. |
| Recovery cycles, revisions, scheduled actions, routine and Insights | Plan activation and evidence relationships | No relationship changed. Accepted revisions retain their `AcceptedAtUtc`; missing assessments remain unknown and are never converted to a zero or universal recovery score. |

The MVC Individual UI is still a **browser-local demonstration**. Its six answers, plan, Lab attempts and onboarding flags are **not written to SQL Server** by the web app. The EF model changes prepare the SQL schema for a later server-backed implementation; they do not create an API, authentication flow or data sync. The application may run without a connection string. SQL Server database validation uses the isolated `DeepSprout_Validation` database.

### Migration and rollback

`20261107000100_Onboarding2JourneyLevelOne` adds the nullable profile columns, expands the stage check, and adds `RecoveryJourney.JourneyLevel` with a default and check. It has no destructive backfill: existing setup and Lab records, person IDs, plan revisions, and cycles remain. The only compatibility update maps a hypothetical persisted Level 0 journey to 1; repeating it has no further effect. The previous schema had no journey-level column, so existing earned practice difficulty remains in its own evidence rather than being reinterpreted as a journey level.

The migration was applied to the backed-up local **DeepSprout_Validation** database and the Lab and Recovery suites passed; see the [verification report](../../implementation/onboarding2-reconciliation-report.md). Before a rollback, export rows containing new setup answers, new onboarding stages or a journey level above 1. `Down` refuses to discard those rows until they are migrated or backed up, then restores the old stage constraint and removes the added columns. Rolling back the schema never deletes historical Lab tables or assessment rows.

### Measurement rules

- Six answers are personalization inputs. The scrolling answer is a **self-reported estimate**.
- Browser usage is shown only with supported extension observations and coverage.
- Practice completions and offline routine reports keep their own evidence labels.
- Lab results are optional, versioned, and comparable only under compatible protocols.
- No absent measurement becomes zero; no common recovery percentage is derived.

The old Round 2A report and database proposal package remain historical evidence. Their mandatory baseline activation and weekly eligibility statements are superseded by this contract and the current product specification.
