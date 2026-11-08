# Onboarding 2.0 reconciliation: implementation and verification

> **8 November 2026:** this report covers the historical 129-table M1 database (`DeepSprout_Validation`). The approved target is the [58-table design](../architecture/database/README.md); its Onboarding 2.0 contract (Journey Level 1, versioned setup answers, stages, explicit activation) is in the [persistence contract](../architecture/database/persistence-contract.md#3-onboarding-20-contract). The M1 migration record moved to the [historical M1 note](../architecture/database/historical-m1-validation-database.md).

7 November 2026. This report records the current checkout and the isolated local `DeepSprout_Validation` SQL Server database.

## Implemented

- The served MVC Individual route remains Meet Bimo → six quick questions → HeroReels (watch or skip) → Home. It stores a preliminary Week 1 proposal; only the plan preview's **Activate my plan** control creates a plan.
- Browser first-run state starts at Journey Level 1. A legacy stored Level 0 is read as Level 1 without resetting a plan, earned practice levels, attempts, or history. Profile and Home label this as a journey starting point rather than a cognitive or recovery score.
- Lab assessments remain optional. Previously recorded attempts, versions, scores and window IDs are unchanged. The old automatic weekly window no longer schedules official tasks; no new reassessment policy is inferred. Insights shows missing results as unknown.
- `IndividualProfile` gains nullable versioned JSON setup fields and accepts the new `QuickSetup`, `Story`, and `Home` stages while retaining historical stages and same-person assessment links. `RecoveryJourney` gains a Level 1 default and a positive-level constraint. These are schema preparations; browser answers are **not** synchronized to SQL Server.
- Institution, Supervisor and Coach report sources were inspected for baseline, onboarding and journey-level dependencies; none uses the retired Individual activation guard. The report inbox, form list and Initiative list were opened in Chrome; their operational records and permissions remain separate from private Individual Lab data.
- The read-only System Journey walkthrough, presenter scenario, current product guide and README now describe the six-question route and optional Lab. The presenter keeps four synthetic, optional first Lab attempts and no fabricated weekly reassessment.

## Migration and database evidence

Migration: `20261107000100_Onboarding2JourneyLevelOne`. The generated idempotent SQL is at `artifacts/onboarding2-migration.sql` locally. It was applied to `DeepSprout_Validation` after a verified copy-only backup at SQL Server's default backup location: `DeepSprout_Validation_before_Onboarding2_20261107.bak`. The script was rerun successfully and the migration history contains exactly one row for this ID.

Before migration: 23 migrations, 1,977 people, 3 Individual profiles, 4 recovery journeys, 9 Lab attempts and 4 plan revisions. After migration and validation fixtures: 24 migrations, 1,981 people, 5 recovery journeys, 12 Lab attempts and 5 plan revisions. No original rows were deleted; the validation suites inserted their own fixture people and records. All journey rows have `JourneyLevel >= 1`; no check constraint is untrusted or disabled. The backup was verified with `RESTORE VERIFYONLY ... WITH CHECKSUM`.

Rollback requires exporting or otherwise preserving any rows containing new setup answers, a new onboarding stage, or a journey level above 1. The migration's `Down` blocks a rollback that would discard those values. See the [historical M1 note](../architecture/database/historical-m1-validation-database.md).

## Verification

| Check | Result |
| --- | --- |
| Isolated ASP.NET Core MVC build | PASS, zero warnings/errors |
| EF Core snapshot consistency | PASS, `has-pending-model-changes` reported none |
| New browser walkthrough | PASS: six answers, refresh/resume, story skip, Level 1 Home/Profile, preliminary plan, optional Lab/Insights, explicit activation with zero attempts, plan return, legacy Level 0 mapping, and old eight-answer return |
| Page wiring | PASS, 14 pages |
| Presenter scenario engine | PASS, 8 checks; four optional first Lab attempts, no fabricated weekly pair, identity and evidence ownership preserved |
| Partner UI smoke | PASS: Institution Forms & surveys, Reports from your supervisors, and Initiatives opened without browser errors |
| Report workflow browser check | PASS: Supervisor report form → Institution inbox and full report; search, export, date validation, scope denial, responsive layout and empty state |
| SQL Lab validation | PASS, 0 failures; Home stage/versioned JSON, invalid JSON rejection, historical Lab constraints and ownership |
| SQL Recovery validation | PASS, 0 failures; Level 1 default, Level 0 rejection, existing ownership, plan and evidence constraints |
| Existing `member-journey.test.cjs` | Skipped because this checkout does not have `jsdom` installed; it describes the former assessment-first workflow |

The dated Round 2A browser suite and its weekly-window assertions are historical tests of the former policy. The new browser walkthrough is the acceptance check for the current first-run contract.

## Remaining architecture boundary

The Individual UI uses person-bound browser storage and JSON seed files; SQL Server is a separate validation architecture, not the source of live Individual page data. A future server-backed onboarding API, secure authentication and answer synchronization require separate implementation. Official reassessment policy and any journey progression above Level 1 require separate product decisions.
