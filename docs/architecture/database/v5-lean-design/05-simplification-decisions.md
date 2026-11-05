# DeepSprout v5 — Simplification Decisions (Section C)

Numbers come from `generator/build.mjs` (see `validation-report.txt`); nothing here is estimated.

| Measure | v4 | v5 | Change |
|---|---:|---:|---:|
| Tables | 87 | **57** | −30 |
| Columns | 1116 | 752 | −364 (−33 %) |
| Foreign keys | 234 (85 composite) | 146 (0 composite) | −88 |
| UNIQUE constraints/indexes | 172 (53 filtered) | 89 (38 filtered) | −83 |
| CHECK constraints | 294 | 102 | −192 |
| Documented SQL guards (triggers + procedures) | 95 | **0** | −95 |
| Tables with RowVersion | 87 | 17 | −70 |
| JSON columns | 28 | 39 | +11 (deliberate, see §6) |
| Tables with 20+ columns | 9 | 7 | −2 |

## 0. How this decision was made: the live pages, not the documents

You asked me to decide from the cycles and pages, because the documents are partly old. Before finalizing, I re-checked every risky merge against the running Client code (`Client/src/js/data/account.js`, `Client/src/workspaces/{models.d.ts,commands/*,pages/*}`, `Client/src/pages/member/*`). What the code showed:

**The code confirmed these simplifications**

| Decision | What the page code does |
|---|---|
| Garden is computed, not a ledger | `account.js` `growthSteps()` / `garden()` / `practiceGarden()` build the Garden on every read from valid practice attempts, routine check-ins, completed weekly reviews and organiser-confirmed attendance. Thresholds come from `data.catalog.gardenPolicy` (so an Admin-edited config, not a table of rewards). A correction removes a source (`!corrected(a.id)`) and the Garden changes by itself. |
| Weekly Lab window is derived | `lab.js` asks `account.checkInWindow()` for `{state:'missed', week, closes}`; no window object is stored. |
| Form answers are one JSON map | `models.d.ts`: `FormResponse.answers: Record<string, string | string[]>`; `FormDefinition` holds `questions[]` and `versions[]` inline. |
| Per-record history is a timeline | Applications, grants, excuses, attendance and groups all carry an inline `history[]`, rendered as timelines (`participants.js` "History", `operations.js` "Correction history", `participants.js` "Coach handover history", `initiatives.js` "Version & decision history"). `AuditEntry` has `actor, action, resource, reason, result`. One audit log read by resource covers all of them. |
| Tasks keep earlier versions | `mentor.js`: "Rescheduling keeps the earlier version; cancelling keeps every submission." Submissions snapshot `instructionsSnapshot`. |
| Cohort membership is an array | `Cohort.memberIds: string[]`; one live cohort per participant. |
| Practice attempts carry their own version | Attempts store `contentVersion` and `policyVersion`; evidence and title live on the attempt. |
| No per-capability Admin model | Only organization-scoped `grants` (coach/supervisor) exist in the Client; there is a single Admin console. |

**The code also showed things v4 missed (now in v5)**

| Found in the pages | v4 | v5 |
|---|---|---|
| Coach groups have `capacity`, `purpose`, `description`, `approval` (a student who accepts an invitation waits as `Pending` for coach approval) | Not modeled | `OperationalGroup.Capacity/Purpose/Description/RequiresApproval`; `GroupMembership` status `Pending` |
| Experiences can require approval (`Booking.status = 'Pending Approval'`, takes no seat until approved) | Booking status list had no Pending | `ExperienceRevision.RequiresApproval`; booking status `Pending` (included in the "one live booking per person" index, excluded from seat count) |
| Cohorts have `capacity`, `description`, and a join `token` (`participant.cohort.join`) | Name/status only | `ProviderCohort.Capacity/Description/JoinTokenHash` |
| Supervisor appointment has `cohortPermission` | Not modeled | `StaffAppointment.CanManageCohorts` |
| Partner applications keep a "more information" message thread (`Application.messages`) | Not modeled | `VerificationCase.MessagesJson` |
| Tasks keep a `definitionSnapshot` of the linked practice | Via the PracticeVersion table | `Assignment.PracticeSnapshotJson` + `PracticeVersionNo` |
| Provider sessions carry completion `criteria` | In SessionRevision | `Session.CompletionRuleRef` |
| Weekly review completion adds a Garden step and unlocks the companion | Not in v4 sources | Included in the derived Garden sources (see the matrix) |

**One of my own v5 drafts was wrong, and the width metrics caught it.** My first v5 draft folded the current terms of an initiative and of an experience into the root tables. That produced two 36-column tables with 30 and 29 nullable columns and a duplicate copy of the terms inside the snapshot JSON. I reverted it: `Initiative` and `Experience` stay narrow roots, and the immutable `InitiativeRevision` / `ExperienceRevision` rows hold the terms, exactly as v4 had it. Same table count, simpler tables. The merge is kept only for `CoachProgram`, where no SQL rule needs the published fields, so they are one `PublishedJson` column.

## 1. Unnecessary tables removed (30)

| Group | v4 tables | How the application gets simpler |
|---|---|---|
| Reward ledger (4) | `EvidenceEvent`, `PersonalRewardEntry`, `GroupRewardEntry`, `RewardPolicyVersion` | Removes the evidence → entry → reversal pipeline, the "grant exactly once" unique index, reversal rows, and the job that keeps them aligned. The Garden service becomes one read-only query set over existing rows, which is what the Client already does. Garden Rules stay editable as a `ContentRelease`. |
| One-to-one splits (5) | `PasswordCredential`, `GlobalGrant`, `ReviewPrivateNote`, `ProviderCohortMember`, `Bookmark` | Fewer joins and entities. `PrivateNote` and `PasswordHash` are simply never selected into a DTO. |
| Child tables for single-writer data (8) | `AssessmentResponse`, `AssessmentScore`, `BrowserUsageDomain`, `FormQuestion`, `FormQuestionOption`, `FormAnswer`, `CompetitionCriterion`, `CompetitionCriterionScore` | Each is data one actor writes once and the app reads as a whole. JSON columns replace nine joins and the "sum equals total" and "option belongs to question" checks. |
| Versions without a reader (7) | `PracticeVersion`, `ProgramRevision`, `AssignmentRevision`, `SessionRevision`, `ShieldConfiguration`, `ShieldSelectedDomain`, `AssessmentWindow` | See §3. |
| Duplicated history (4) | `InitiativeApplicationDecision`, `AttendanceCorrection`, `GroupCoachAssignment`, `ModerationDecision` | One `AuditEvent` timeline replaces four typed logs. The UI already renders timelines from `history[]`; one reusable component reads `AuditEvent` by resource. |
| Derived state (1) | `PracticeProgressionDecision` | Tier change is two columns on the attempt that caused it. |
| Defensive infrastructure (1) | `IdempotencyRecord` | Double submission is stopped by natural keys (see validation strategy). |

## 2. Redundant columns removed (net −364)

| Removed | Why it was redundant |
|---|---|
| `UpdatedAtUtc` on every table | No screen shows it; `AuditEvent` records meaningful changes. |
| `RowVersion` on 70 tables | Only editable/contended tables keep it (17): Initiative, InitiativeApplication, Experience, ExperienceBooking, Session, Attendance, AbsenceExcuse, GroupMembership, StaffAppointment, VerificationCase, AssessmentAttempt, RecoveryCycle, CoachProgram, Form, OperationalReport, ContentReport, ContentRelease. |
| `EvidenceEventId` on 5 tables | The evidence layer is gone. |
| Duplicate owner columns (`InitiativeId`/`ExperienceId`/`ProgramId` repeated on Attendance, SessionDuty, SessionRegistration, GroupMembership, Completion, Form-related rows) | They existed only to build composite ownership FKs. The owner is reached through the parent. |
| Revision pointers (`CurrentRevisionId` on Assignment, Session, CoachProgram) and `*RevisionId` copies on registrations and completions | Replaced by a number or by history in `AuditEvent`. |
| `InstitutionKind`, `ProviderKind` | Composite-FK helpers. The service checks `Organization.Kind`; `Organization.Kind` is a CHECKed column. |
| `…ByPersonId` for secondary actors (`CancelledBy`, `RevokedBy`, `EndedBy`, `ChangedBy`, `DraftUpdatedBy`) | The actor is in the audit row written in the same transaction. |
| Technical metadata (`SourceHash`, `GapCount`, `Sha256`, `RetentionUntilUtc`, `SelectedGrantRef`, `BeforeHash`, `AfterHash`, `CorrelationId`, `ProviderRef`, `LastAttemptAtUtc`, `DecisionNo`, `RuleVersion`) | No screen or rule uses them. Hashes and correlation ids can be re-added to the one table that needs them if an incident ever calls for it. |
| Initiative `WithdrawalCutoffAtUtc` on the revision | Computed (start − 120 h). Each application keeps its own cutoff, because the owner decision lets a reschedule extend, never shorten, an accepted member's cutoff. |

## 3. Revision and history structures

| Object | v4 | v5 | Why |
|---|---|---|---|
| Initiative terms | Initiative + InitiativeRevision + Decision log | Initiative + **InitiativeRevision** (kept) + AuditEvent | Applicants apply on specific terms; the UI has a "Version & decision history" tab. Earned. |
| Experience terms | Experience + ExperienceRevision | same (kept) | Bookers must see what they booked; changes notify them. Earned. |
| Coach program | Program + ProgramRevision | Program with `PublishedJson` | Nothing in SQL filters on those fields; completion keeps its own `BasisJson`. |
| Assignment | Assignment + AssignmentRevision | Assignment (`HistoryJson`, `RevisionNo`) + recipient `AssignedRevisionNo` | Matches the page promise ("rescheduling keeps the earlier version"). |
| Session | Session + SessionRevision | Session + AuditEvent | Registrants are notified; no screen shows session versions. |
| Practice | Definition + Version | Definition (`VersionNo`) + attempt `PracticeVersionNo/Title` + assignment snapshot | The page needs "what was done" and "what the task said", not a catalog of old versions. |
| Instrument | InstrumentVersion | same (kept) | Scores are only comparable under one scoring version. Earned. |
| Plan | PlanRevision | same (kept) | History shows "Plan adjusted". Earned. |
| Form | Form + FormVersion + questions/options | Form + FormVersion (`DefinitionJson`) | Responses must keep their questions; they no longer need FK rows. |
| Shield settings | Versioned configuration + domain rows | One JSON column | Nothing shows setting versions. |

## 4. SQL guards removed or replaced

The 95 v4 guards were: about 36 immutability triggers, 13 owner/scope triggers, 6 capacity "safety nets", 4 transition triggers and about 36 stored-procedure or workflow guards.

| v4 guard family | v5 replacement |
|---|---|
| Immutability triggers (36) | None. No v5 code path edits those rows; `ops.AuditEvent` is protected by `DENY UPDATE, DELETE` for the application login, one statement. |
| Owner/scope triggers and composite FKs (13 + 85) | The command handler loads the parent through the actor's scope and rejects a mismatch. Covered by the ownership scenarios in the validation strategy. |
| Transition triggers (4) and workflow procedures (about 36: `Register`, `RecordAttendance`, `CancelInitiative`, …) | Transactional C# application services with an explicit state-transition table per aggregate. |
| Capacity safety-net triggers (6) | **Not replaced by a trigger.** One `SeatService` is the only writer of seat-affecting statuses; it takes `UPDLOCK` on the parent row (Initiative, Experience, Session), counts, then writes. A parallel-race integration test is mandatory. This is an approval item (see recommendation). |
| Supervisor cap of three | Same `SeatService`-style rule under the Initiative lock, plus the filtered unique index on active appointment per person and role. |

**Still enforced by SQL Server (the critical rules):**

- Unique emails (filtered).
- One live application per person per initiative; **one Accepted/Suspended membership per person across all initiatives**.
- Unique attempt number per person and initiative (`AttemptNo`) so reapplication is a new row.
- One open recovery cycle per person; one accepted plan and one draft per cycle.
- One valid baseline per person and instrument; one valid official attempt per week and instrument.
- One live booking per person and experience; one live session registration; one attendance row per person and session.
- One completion per application / program member / booking.
- Unique submission attempt numbers; unique QR credentials; unique usage-batch sequence per extension installation.
- All status and kind lists (CHECK … IN), owner/scope XOR shapes, initiative capacity 1–135, experience capacity > 0.
- Single-column FKs everywhere; no cascades.

## 5. Redundant status and derived data removed

- Garden growth, decorations and group Garden: computed.
- Current tier per practice type: last completed attempt of that type.
- Weekly window state (open / used / missed): computed from the week key and attempts.
- "Needs Supervisor": no active `SessionDuty`.
- Withdrawal cutoff: start − 120 h; per-application extension stored only where the owner rule requires it.
- Competition ranking: computed from judgments.
- Seat counts: counted, not stored (no counter column to drift).

## 6. JSON, where and why (39 columns)

JSON rose from 28 to 39 because nine child tables became arrays. Rule applied: JSON only when **one actor writes it or it is immutable, it is read as a whole, and nothing needs a FK or uniqueness on its inner parts.**

| Kind | Columns |
|---|---|
| Drafts (editor-owned) | `Initiative/Experience/CoachProgram/Form.DraftJson` |
| Immutable snapshots | `InitiativeRevision.PublishedSnapshotJson`, `ExperienceRevision.PublishedSnapshotJson`, `PlanRevision.PlanJson`, `Completion.BasisJson`, `OperationalReport.MetricsSnapshotJson`, `FormVersion.DefinitionJson`, `Assignment.PracticeSnapshotJson` |
| Single-writer self-contained data | `AssessmentAttempt.ResponsesJson/ScoresJson`, `FormResponse.AnswersJson`, `CompetitionJudgment.ScoresJson`, `BrowserUsagePeriod.DomainsJson`, `IndividualProfile.ShieldSettingsJson` |
| Append-style small lists | `Assignment.HistoryJson`, `VerificationCase.MessagesJson`, `OperationalReport.BodyJson/ReviewJson` |
| Settings and payloads | `Organization.ProfileJson/SettingsJson`, `IndividualProfile.SetupAnswersJson/PreferencesJson`, `OfflineRoutine.ScheduleRuleJson`, `ContentRelease.PayloadJson`, `PartnershipLink.DataSharingScopeJson`, `ProtectionSession.DomainCodesJson`, `OutboxMessage.PayloadJson`, `Notification.ParamsJson`, `AuditEvent.DetailJson`, `Post.SharedAchievementJson`, `InstrumentVersion/PracticeDefinition.ContentJson/RulesJson`, `VerificationCase.ClaimJson` |

EF Core (the project targets `net10.0`) maps these as owned/complex types with `ToJson()`. Where SQL must filter, a headline value is a real column (`AssessmentAttempt.PrimaryScore`, `ScoringVersion`, `WindowKey`).

**Reporting cost, honestly:** form per-option counts and "By website" totals are aggregated in C# over one person's or one form's rows. That is fine for the expected scale (an initiative has at most 135 members; a person has a few hundred usage batches per 28 days). If a survey ever collects tens of thousands of responses, add a table then; no other table changes.

## 7. Wide tables

Tables with 20 or more columns: 9 → 7 (see `appendix-table-width.md`). Improved: `OperationalReport` 23 → 19 (narrative and review text in two JSON columns); `Completion` 20 → 12; `Attendance` 17 → 14; `StaffAppointment` 21 → 19. Still wide and deliberate: `InitiativeRevision` (30, 8 nullable) and `ExperienceRevision` (31, 10 nullable) are immutable term sets; `Session` (25) and `Assignment` (20) absorbed a revision; `InitiativeApplication` (21) is the 13-status lifecycle you asked to keep as one row.

## 8. Why the whole application is simpler, not just the diagram

- **EF Core:** 57 entity types and 57 configurations instead of 87; no composite keys and no owned-FK navigation noise; JSON mapped with `ToJson()`.
- **Migrations:** plain `CREATE TABLE`, filtered unique indexes and CHECK lists. No raw-SQL trigger scripts, no stored-procedure versions to keep in sync with C#.
- **Logic location:** one place for workflow rules (application services), instead of split between C# and 95 SQL objects.
- **Tests:** the suite targets behavior through services and a small set of database-concurrency tests, not one test per constraint.
- **Onboarding another developer:** an entity is a row with a status, a few timestamps and a parent. History is one table. There is nothing to discover in the database that is not visible in code.
