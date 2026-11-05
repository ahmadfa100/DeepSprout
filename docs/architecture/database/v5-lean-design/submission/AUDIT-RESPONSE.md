# Response to the independent audit of the 57-table v5 proposal

Scope: I checked each finding against `schema.json`, `generator/model.mjs` and `build.mjs`. I did not re-read every Client page in this pass. The earlier page-driven review stands. Result: the audit was largely right. Two findings were real defects, one was a design gap, and the rest needed protection in application code rather than a schema change. The corrected model has **58 tables** (57 + `activity.PracticeVersion`). Every correction below is in `generator/model.mjs`. The SQL is regenerated from it.

## Findings

| # | Finding | Verdict | Evidence and correction |
|---|---|---|---|
| 1 / A1 | `CK_GroupMembership_Identity` rejects an Expired/Declined/Revoked invitation with no `PersonId` | **CONFIRMED** | The old check required `PersonId IS NOT NULL` for every status except `Invited`. New check: `Invited` has e-mail + token and no person; `Declined/Expired/Revoked` need a person **or** e-mail + token; `Pending/Active/Ended` need a person. Demo row `old.invitee@example.com` (Expired, no person) and test T09/T10 prove it. |
| 2 / A2 | Coach-group and cohort capacity races | **PARTIALLY VALID** | The capacity columns existed but the lock plan only named initiative, experience and session. Corrections: `OperationalGroup` and `ProviderCohort` get a `RowVersion` and `CHECK (Capacity IS NULL OR Capacity BETWEEN 1 AND 500)` (T05/T06). The rule is documented: `SeatService` takes `UPDLOCK` on the group/cohort row, counts, then writes. A 50-run last-seat race test is mandatory for all five parents. **No SQL race test was run** (see validation file). |
| 3 / A3 | Cross-owner consistency after dropping the 85 composite FKs | **PARTIALLY VALID** | A single-column FK cannot prove, for example, `Attendance.PersonId = Registration.PersonId` (T26 shows SQL accepts the mismatch). No composite FKs were restored. The table below is the application rule: each handler loads the parent through the actor's scope and copies owner columns from it. |
| 4 / A4 | Two initial `ReviewDecision` rows for one submission | **CONFIRMED** | Added `UNIQUE (AttemptId) WHERE SupersedesId IS NULL` (one root per submission). A correction is still allowed through `SupersedesId` (T07 rejected, T08 accepted). That `SupersedesId` belongs to the same attempt remains a handler rule. |
| 5 / A5 | `OutboxMessage` unique on `EventPublicId` blocks fan-out to many recipients | **CONFIRMED** (as documented) | Added `DedupKey` (`<recipientPersonId>:<template>`). Unique is now `(EventPublicId, DedupKey)`. Demo: one `session.rescheduled` event, two recipients (T11 rejected, T12 accepted). Exactly-once delivery still depends on the mail provider's idempotency key. The database only prevents duplicate rows. |
| 6 / A6 | Concurrent failed-login and OTP counting without `RowVersion` | **PARTIALLY VALID** | No schema change. Rule: increment with one atomic statement (`UPDATE iam.Person SET FailedLoginCount = FailedLoginCount + 1, LockedUntilUtc = CASE WHEN FailedLoginCount + 1 >= @max THEN … END WHERE Id = @id`) and the same for `OtpChallenge.AttemptCount`. A `RowVersion` would add retries without adding safety. Parallel-failure test required. |
| 7 / B4 | `AllowMultipleResponses` and concurrent duplicate submits | **PARTIALLY VALID** | `UNIQUE (FormVersionId, PersonId, ResponseNo)` stops two rows with the same number, not `ResponseNo` 1 and 2 when multiple responses are off. The policy lives on the version, so SQL cannot see it from the response row. Rule: the submit service locks the person's response rows for that version and inserts `MAX(ResponseNo)+1` only when the version allows it. `FormResponse` now has a `RowVersion` (draft `AnswersJson` edited in two windows). |
| 8 / B5 | `Assignment.HistoryJson` concurrency and earlier-version preservation | **PARTIALLY VALID** | `Assignment` now has a `RowVersion`, so a stale edit fails instead of overwriting history. Recipients keep `AssignedRevisionNo`, and `HistoryJson` is append-only by rule. |
| 9 / A7 | `AuditEvent` privacy, completeness, immutability | **PARTIALLY VALID** | Immutability is now enforced in SQL without triggers: role `ds_app` is `DENY UPDATE, DELETE` on `ops.AuditEvent` (T23 proves it). Privacy: `DetailJson` must never carry `PrivateNote`, tokens or hashes (the audit DTO is an allow-list). Completeness: a test walks every transition table and expects one audit row each. This is still unverified. |
| 10 | Immutable published `FormVersion`, correct JSON validation | **CONFIRMED** | `ds_app` is denied `UPDATE/DELETE` on `FormVersion`, `PracticeVersion`, `InitiativeRevision`, `ExperienceRevision`, `SubmissionAttempt` and `BrowserUsagePeriod`. Every `*Json` column has `CHECK (ISJSON(col)=1)` (T15). Shape of the JSON is validated by the application's typed DTOs. |
| 11 | `BrowserUsagePeriod.DomainsJson` validation and aggregation | **PARTIALLY VALID** | The column is JSON-checked, and seconds are bounded `0..86400` (T16). The "sum of domains ≤ ObservedSeconds" rule is checked in the batch handler. Aggregation reads the JSON with `OPENJSON` (demo query Q10b). The doc calls the column `DomainsJson`; there is no `DomainJson`. |
| 12 / B7 | `ConsentRecord` history integrity | **PARTIALLY VALID** | `ds_app` is denied `UPDATE/DELETE` (T24). Added `UNIQUE (PersonId, PurposeCode, DecidedAtUtc)`. The current decision is the latest row. Shield intake must refuse batches when the latest `shield.telemetry` decision is `Withdrawn`. That is a service rule. |
| 13 / B6 | Positive capacity on groups and cohorts | **CONFIRMED** | Fixed (T05/T06). |
| 14 / B6 | Experience draft cancellation constraint | **CONFIRMED** | `CK_Experience_Published` rejected `Cancelled` with no revision. It now reads `Status IN ('Draft','Archived','Cancelled') OR CurrentRevisionId IS NOT NULL` (T13, T14). |
| 15 / B8 | Data dictionary parsing error for `StaffAppointment.Role/Status` | **CONFIRMED (documentation only)** | The greedy regex in `build.mjs` swallowed the `AND/OR` tail of the check. It now accepts only a pure quoted list. `schema.json` and the SQL were already correct. |

Other audit items: **B1 PracticeVersion** was restored (58 tables) per the provisional assumption. **B2 Lab re-scoring** stays overwrite-with-audit (an `AuditEvent` with before/after score). **B3 Garden** stays derived. The rule is that live thresholds may be lowered or extended but not raised. **B9 No-AI approvals** rests on the human-only command claims. **A8 / B10** are open: this submission adds a real DDL execution, not the P0 suite.

## Application-level ownership matrix (replaces the 85 composite FKs)

| Row written | Must match | Where checked |
|---|---|---|
| `Attendance` | `PersonId` = registration's/booking's person; `SessionId` = their session | Attendance handler, loads the registration through the session |
| `SessionDuty` | appointment belongs to the session's initiative or experience | Duty handler |
| `ExperienceBooking.CohortId` | cohort's `ExperienceId` = booking's `ExperienceId` | Cohort join handler (also takes the cohort lock) |
| `GroupMembership.ApplicationId` | application's initiative = group's initiative; same person | Placement handler |
| `InitiativeApplication.TermsRevisionId / RegistrationResponseId` | revision belongs to the initiative; response belongs to the person and the registration form | Apply handler |
| `ScheduledAction`, `PlanRevision`, `PracticeAttempt` | same cycle and same person | Recovery handlers |
| `RoutineCheckIn.PersonId`, `ProtectionSession`, `BrowserUsagePeriod` | person = installation/routine owner | Handlers; Shield intake authenticates the installation |
| `SubmissionAttempt.PracticeAttemptId` | attempt belongs to the recipient | Submit handler |

These are the only places a bug can create a cross-owner row. Each needs a negative API test (the T26-style case through the service).

## Provisional owner assumptions applied (labelled, to be confirmed)

Garden is derived from legitimate activity, and thresholds are never raised. `PracticeVersion` is restored. Lab re-scoring replaces the score with an audit row. Capacity is controlled by transactional services and tested for races. One platform role per person. `AuditEvent` is the shared history. Forms and judging scores are JSON. **A person who Completed an initiative may not rejoin it** (needs the owner's confirmation).
