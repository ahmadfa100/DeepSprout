# DeepSprout database architecture

**Status (8 November 2026): approved.** DeepSprout's target database is the **v5 lean design: 58 application tables in 18 schemas**, one SQL Server database, one EF Core context (`DeepSproutV5DbContext`). The product owner approved this design; do not reopen the table count and do not return to the older 129-table M1 model. SQL Server system objects and framework tables (`__EFMigrationsHistory`, any future ASP.NET Core Identity tables) are not application tables and are not counted.

Current revision: **v5-lean-2**, which applies Onboarding 2.0 and the [4 November v4.1 decisions](../p0-target-v4.1.md) inside the same 58 tables.

## Read in this order

| Document | What it answers |
|---|---|
| [Persistence contract](persistence-contract.md) | Where each UI workflow keeps its data today, which of the 58 tables it maps to, the Onboarding 2.0 setup-answer contract and the browser-state → database mapping |
| [EF Core adoption](efcore-v5-adoption.md) | The V5 EF Core model, its two migrations, how to create a new database, how to adopt `DeepSprout_V5_Demo`, rollback, and the verification evidence |
| [v5 lean design](v5-lean-design/README.md) | The table inventory, data dictionary, ERDs, generator and the executable SQL script |
| [Historical M1 database](historical-m1-validation-database.md) | What `DeepSprout_Validation` and the 129-table EF code are, and why they are kept only for history |

## The 58 tables

`R` marks a table retired by v4.1. It keeps its history readable; the application role cannot insert, change or delete its rows.

| Schema | Tables | Domain |
|---|---|---|
| `iam` | Person, OtpChallenge, ConsentRecord | One identity per person across all workspaces; email codes; consent history |
| `org` | Organization, OrganizationMember, VerificationCase, StaffAppointment | Institutions (the only organization kind), their Representatives, Admin verification, invitation-only Coach/Supervisor appointments |
| `personal` | IndividualProfile | Individual workspace and journey: onboarding stage, Journey Level, versioned setup answers, preferences, Shield settings |
| `lab` | InstrumentVersion, AssessmentAttempt | Optional Lab assessments and their versioned results |
| `recovery` | RecoveryCycle, PlanRevision, ScheduledAction, WeeklyReview | Recovery cycles, plan preview and explicit activation, scheduled actions, weekly reviews |
| `activity` | PracticeDefinition, PracticeVersion, PracticeAttempt, OfflineRoutine, RoutineCheckIn | Meaningful Practice and the offline routine |
| `shield` | ExtensionInstallation, ProtectionSession, BrowserUsagePeriod | Digital Shield installation, protection sessions, observed browser usage |
| `institution` | Initiative, InitiativeRevision, InitiativeApplication | Initiatives, published terms, applications, admission and waiting list |
| `coach` | CoachProgram `R`, OperationalGroup, GroupMembership | Initiative groups, their Coach and members (independent programs retired) |
| `task` | Assignment, AssignmentRecipient, SubmissionAttempt, ReviewDecision, OperationalReport | Assignments, submissions, reviews, Coach and Supervisor reports |
| `session` | Session, SessionDuty, SessionRegistration, Attendance, AbsenceExcuse, Completion | Sessions, registration, attendance, excuses and completion |
| `provider` | Experience, ExperienceRevision, ExperienceBooking, ProviderCohort, ProviderIncident | Institution-owned outdoor activities, trips and camps: terms, bookings and waiting list, cohorts, incidents |
| `forms` | Form, FormVersion, FormResponse, CompetitionJudgment | Forms, surveys and competitions |
| `community` | Post, Comment, PostInteraction, ContentReport | Community posts and moderation |
| `partnership` | PartnershipLink `R` | Historical cross-owner links (out of scope since v4.1) |
| `governance` | ContentRelease | Admin-published content and Garden rules |
| `ops` | AuditEvent, Notification, OutboxMessage | Insert-only audit history, notifications, reliable email outbox |
| `files` | SecureFile | Private files reached through their owning record |

The `provider` schema keeps its approved table names; since v4.1 its rows are owned by an Institution (`provider.Experience.OrganizationId`). Final entity and route names for outdoor activities are still an open v4.1 item.

## Where things live

| Artifact | Path |
|---|---|
| Source of truth (edit this) | `v5-lean-design/generator/model.mjs` |
| Generated dictionary, inventory, ERDs, `schema.json` | `v5-lean-design/` (`node generator/build.mjs`) |
| Executable SQL script (schema, demo data, queries) | `v5-lean-design/submission/DeepSprout-v5-FULL-Database.sql` (`node generator/emit-sql.mjs`) |
| Negative and behaviour tests (40, rolled back) | `v5-lean-design/submission/DeepSprout-v5-NEGATIVE-TESTS.sql` |
| EF Core model | `src/DeepSprout.Domain/V5/`, `src/DeepSprout.Infrastructure/V5/` (`node generator/emit-efcore.mjs`) |
| EF Core migrations | `src/DeepSprout.Infrastructure/V5/Migrations/` |
| Adopt an existing v5 database | `v5-lean-design/submission/adopt-v5-baseline.sql` |
| Reviewable upgrade script for `DeepSprout_V5_Demo` | `v5-lean-design/submission/DeepSprout-v5-UPGRADE-lean1-to-lean2.sql` |

To change the schema: edit `model.mjs` (and `generator/sql/seed.sql` if demo rows are affected), run `build.mjs`, `emit-sql.mjs` and `emit-efcore.mjs`, add an EF migration for the V5 context, and run the negative tests on a fresh database. Adding a business table needs explicit product-owner approval.

## Databases on the development server

| Database | Role |
|---|---|
| `DeepSprout_V5_Demo` | The approved design with fictional demo data, built from the hand-written script (v5-lean-1). Not yet adopted into EF migrations or upgraded to v5-lean-2; both steps are prepared and tested on copies (see [EF Core adoption](efcore-v5-adoption.md)). |
| `DeepSprout_Validation` | Historical 129-table M1 database with validation fixtures only. Kept untouched; not the target. |

## Rules that must not be broken

- 58 application tables. A requirement that seems to need a new table is first mapped to existing tables, columns, JSON contracts or `ops.AuditEvent`; if it truly does not fit, document the conflict and ask the owner.
- Never delete history to fit a new rule. Retire a concept by freezing its rows (permissions) and refusing new ones (constraints and services).
- No page reads or writes SQL Server yet. Do not describe browser-local data as stored in the database.
