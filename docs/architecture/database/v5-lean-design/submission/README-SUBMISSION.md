# DeepSprout v5 — SQL Server submission

> **Historical submission:** The [4 November v4.1 P0 target](../../../../architecture/p0-target-v4.1.md) supersedes conflicting ownership and role assumptions. Do not execute this SQL as the current target schema or treat its table count as approved. Review existing database state, source IDs and retention first.

| File | Purpose |
|---|---|
| `DeepSprout-v5-FULL-Database.sql` | **The deliverable.** Creates `DeepSprout_V5_Demo`, then 58 tables, then DEMO ONLY data, then demonstration queries. |
| `DeepSprout-v5-NEGATIVE-TESTS.sql` | Optional. 26 rolled-back tests (constraint rejections). |
| `AUDIT-RESPONSE.md` | Verdict on each audit finding and the corrections applied. |
| `SQL-VALIDATION-RESULTS.md` | What was executed and the actual outcomes, plus what is unverified. |

## Run it (SSMS)

1. Connect to SQL Server 2019 or later where you may create databases.
2. Open `DeepSprout-v5-FULL-Database.sql` and press **F5** to run the whole file. No editing is needed. It takes a few seconds.
3. Then run the `PART 4 — DEMONSTRATION QUERIES` blocks one at a time while presenting.
4. Optional: open and run `DeepSprout-v5-NEGATIVE-TESTS.sql`. The last result grid shows PASS/FAIL.

The script never drops anything. If `DeepSprout_V5_Demo` already holds the v5 schema it only runs the queries. If the database holds other tables it stops touching it. To start over, drop `DeepSprout_V5_Demo` yourself.

Command line: `sqlcmd -S <server> -E -C -b -i DeepSprout-v5-FULL-Database.sql`

## What is in the database

58 tables, 18 schemas, 147 foreign keys, 39 filtered unique indexes, 143 CHECK constraints (including `ISJSON` on every JSON column), 0 triggers, 0 procedures.

| Schema | Tables |
|---|---|
| `iam` | Person, OtpChallenge, ConsentRecord |
| `org` | Organization, OrganizationMember, VerificationCase, StaffAppointment |
| `personal` | IndividualProfile |
| `lab` | InstrumentVersion, AssessmentAttempt |
| `recovery` | RecoveryCycle, PlanRevision, ScheduledAction, WeeklyReview |
| `activity` | PracticeDefinition, **PracticeVersion**, PracticeAttempt, OfflineRoutine, RoutineCheckIn |
| `shield` | ExtensionInstallation, ProtectionSession, BrowserUsagePeriod |
| `institution` | Initiative, InitiativeRevision, InitiativeApplication |
| `coach` | CoachProgram, OperationalGroup, GroupMembership |
| `task` | Assignment, AssignmentRecipient, SubmissionAttempt, ReviewDecision, OperationalReport |
| `session` | Session, SessionDuty, SessionRegistration, Attendance, AbsenceExcuse, Completion |
| `provider` | Experience, ExperienceRevision, ExperienceBooking, ProviderCohort, ProviderIncident |
| `forms` | Form, FormVersion, FormResponse, CompetitionJudgment |
| `community` | Post, Comment, PostInteraction, ContentReport |
| `partnership` | PartnershipLink |
| `governance` | ContentRelease |
| `ops` | AuditEvent, Notification, OutboxMessage |
| `files` | SecureFile |

Design points to explain in a presentation: one identity per person with roles derived from linking rows. Roots point to their current revision, and revisions are immutable. "One live X" rules are filtered unique indexes. History is one insert-only `AuditEvent` table. A database role `ds_app` is denied `UPDATE/DELETE` on history tables instead of using triggers. Capacity and ownership checks live in C# services (see `AUDIT-RESPONSE.md`).

## Demo data

All fictional, DEMO ONLY, `example.com` e-mails, no passwords (`PasswordHash` is NULL, so none can sign in). It covers an Individual (Lab, recovery plan, practices, routines, Shield); students in every membership status (Accepted, Suspended, Offered, Queued, Pending, Withdrawn then reapplied, Rejected); a coach, a representative, an initiative supervisor, a provider and its supervisor; a published initiative with terms (capacity 4, full, one waitlisted); groups with invitations (one expired, one pending approval); a task, submissions and reviews; sessions, registrations, attendance and an excuse; a provider camp with cohort, bookings and an incident; forms, a survey response and a judged competition entry; a community post, a comment, a reaction and a report; notifications, outbox rows (one event to two recipients) and audit history.

## Known limitations

- Concurrency was not tested. Seat races, atomic login counters and duplicate submissions rely on application services (`AUDIT-RESPONSE.md`), which do not exist yet.
- Cross-owner consistency (for example attendance person versus registration person) is an application rule. SQL does not stop it (negative test T26).
- Provisional owner assumptions are listed in `AUDIT-RESPONSE.md`. The "Completed members cannot rejoin" rule needs the owner's confirmation.
- The ERD image was not generated. Mermaid ERDs are in `../04-erd.md`.
- The older hand-written v5 documents (`05`–`08`, `README.md` of this folder) still say 57 tables. This submission supersedes them: 58 tables with `PracticeVersion` restored.
- Regeneration: `node generator/build.mjs` then `node generator/emit-sql.mjs`.
