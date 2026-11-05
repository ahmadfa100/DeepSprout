# DeepSprout v5 — Functionality Preservation Matrix (Section D)

Labels: **FULLY PRESERVED** · **PRESERVED WITH SIMPLER IMPLEMENTATION** · **BEHAVIOR CHANGED — OWNER REVIEW REQUIRED**.
Journeys come from the current pages (`Client/src/pages/member/*`, `Client/src/workspaces/pages/*`, `commands/*`, `js/data/account.js`), checked against the v4 workflow map only where the pages do not decide.

**Result: 52 journeys. 29 fully preserved, 21 preserved with a simpler implementation, 2 flagged for owner review (rows 11 and 17; row 18 shares item 1). No journey is removed.**

## 1. Journeys

| # | Journey (screen / command) | v5 tables | Label | How it works in v5 |
|---|---|---|---|---|
| 1 | Register, verify email, sign in, lockout | `Person`, `OtpChallenge`, `ConsentRecord` | PRESERVED WITH SIMPLER IMPLEMENTATION | Password hash and failed-login counter are columns of `Person` (no separate credential table). |
| 2 | One identity, Workspace Switcher | `Person`, `OrganizationMember`, `StaffAppointment`, `GroupMembership` | FULLY PRESERVED | Workspaces are computed from active rows. |
| 3 | Partner application (Coach / Institution / Provider), "needs more info" thread | `VerificationCase`, `Organization`, `SecureFile` | FULLY PRESERVED | The thread (`Application.messages` in the Client) is `MessagesJson`. |
| 4 | Onboarding: Meet Bimo → Setup → Starting Point | `IndividualProfile`, `ContentRelease` | FULLY PRESERVED | |
| 5 | Four baseline assessments, pause/resume | `AssessmentAttempt`, `InstrumentVersion` | PRESERVED WITH SIMPLER IMPLEMENTATION | Responses are saved into `ResponsesJson`; score into `ScoresJson`/`PrimaryScore`. |
| 6 | Weekly reassessment window, "missed" state | `AssessmentAttempt` (`WindowKey`) | PRESERVED WITH SIMPLER IMPLEMENTATION | Window is computed (`checkInWindow()`); window length is still an open policy. |
| 7 | Compare results; "not comparable" across scoring versions | `AssessmentAttempt.ScoringVersion`, `InstrumentVersion` | PRESERVED WITH SIMPLER IMPLEMENTATION | Compare only equal `ScoringVersion`. Re-scoring overwrites (see owner item 3). |
| 8 | Recovery plan: preview, activate, This Week, Adjust, History | `RecoveryCycle`, `PlanRevision`, `ScheduledAction` | FULLY PRESERVED | |
| 9 | Weekly Review (incl. auto-continue when missed) | `WeeklyReview` | FULLY PRESERVED | |
| 10 | Browse and run practices; tier up/down | `PracticeDefinition`, `PracticeAttempt` | PRESERVED WITH SIMPLER IMPLEMENTATION | Level-up/down is `ResultingTier` + `ProgressionOutcome` on the attempt. |
| 11 | Practice History keeps showing what was done after a catalog edit | `PracticeAttempt.Title/PracticeVersionNo` | **BEHAVIOR CHANGED — OWNER REVIEW REQUIRED** | See owner item 2: old practice *content* is not retained, only title, version number and outcome. |
| 12 | Offline routine and daily Done/Skipped | `OfflineRoutine`, `RoutineCheckIn` | FULLY PRESERVED | |
| 13 | Digital Shield pairing, Sync Pending, Start Protection | `ExtensionInstallation`, `ProtectionSession`, `ConsentRecord` | FULLY PRESERVED | |
| 14 | Shield reminder threshold and site list | `IndividualProfile.ShieldSettingsJson` | PRESERVED WITH SIMPLER IMPLEMENTATION | One settings document; no setting history (no screen shows it). |
| 15 | Insights: Digital Habits incl. "By website" | `BrowserUsagePeriod.DomainsJson` | PRESERVED WITH SIMPLER IMPLEMENTATION | Aggregated per person over 7/14/28 days in C#. |
| 16 | Insights: Plan & Practice, Assessments, Offline Life, Next Steps | existing tables | FULLY PRESERVED | All computed, as today. |
| 17 | Personal Garden: four trees, bounded flower/rabbit/birdhouse | computed from `PracticeAttempt`, `RoutineCheckIn`, `WeeklyReview`, `Attendance`, `Completion` | **BEHAVIOR CHANGED — OWNER REVIEW REQUIRED** | Derived on read, as the Client already does. Difference from v4: no frozen policy per grant; see owner item 1. |
| 18 | Group Garden: one per initiative; one per independent-coach group | computed from `ReviewDecision` (Approved), `Attendance`, `Completion` | PRESERVED WITH SIMPLER IMPLEMENTATION | Same sources as v4's ledger, read directly. Same note as 17. |
| 19 | Garden Rules editor (Admin) | `ContentRelease` target `garden.rules` | FULLY PRESERVED | Matches `data.catalog.gardenPolicy`. |
| 20 | Initiative Builder: draft, preview, publish, update with reason, reschedule | `Initiative`, `InitiativeRevision` | FULLY PRESERVED | |
| 21 | Initiative "Version & decision history" tab | `InitiativeRevision`, `AuditEvent` | PRESERVED WITH SIMPLER IMPLEMENTATION | Decisions read from the audit timeline. |
| 22 | Apply / approve / reject / suspend / restore / remove / block / withdraw | `InitiativeApplication`, `AuditEvent`, `Notification` | FULLY PRESERVED | One row, 13 statuses, one transaction per transition. |
| 23 | Application History timeline with reasons | `AuditEvent` by resource | PRESERVED WITH SIMPLER IMPLEMENTATION | |
| 24 | Waitlist, 24 h seat offer, decline/expire, next in queue | `InitiativeApplication` | FULLY PRESERVED | |
| 25 | Capacity up to 135, three active supervisors | `InitiativeRevision.Capacity` CHECK, `StaffAppointment`, `SeatService` | PRESERVED WITH SIMPLER IMPLEMENTATION | Lock + count in C# instead of safety-net triggers (owner item 4). |
| 26 | Withdrawal rule: allowed only before start − 120 h; boundary refused | `InitiativeApplication.WithdrawalCutoffAtUtc` | FULLY PRESERVED | |
| 27 | Cancel initiative permanently; all open applications ended and notified | `Initiative`, `InitiativeApplication`, `Notification` | FULLY PRESERVED | |
| 28 | Reapply after Withdrawn / Removed while enrollment is open; no rejoin of an ended or cancelled initiative | `InitiativeApplication` (`AttemptNo`) | FULLY PRESERVED | New row `AttemptNo + 1`. Live-row unique index; Blocked stays live until lifted. Rules in the application service (owner decisions). |
| 29 | Notify participant when a representative removes them | `Notification`, `OutboxMessage` | FULLY PRESERVED | Template `initiative.membership.removed`, reason in `ParamsJson`, email via outbox. |
| 30 | One effective Accepted/Suspended membership across initiatives | unique index on `InitiativeApplication(PersonId)` | FULLY PRESERVED | Kept in SQL Server. |
| 31 | Coach Program Builder, publish, groups, invitation by email | `CoachProgram`, `OperationalGroup`, `GroupMembership` | PRESERVED WITH SIMPLER IMPLEMENTATION | Published content is one JSON document. |
| 32 | Group capacity and coach approval of a joiner (`Pending`) | `OperationalGroup.Capacity/RequiresApproval`, `GroupMembership` | FULLY PRESERVED | Found in the pages; v4 lacked it. |
| 33 | Coach allocation and "Coach handover history" | `OperationalGroup.CoachPersonId`, `AuditEvent` | PRESERVED WITH SIMPLER IMPLEMENTATION | |
| 34 | Assignments: create, reschedule keeps earlier version, cancel keeps submissions | `Assignment`, `AssignmentRecipient` | PRESERVED WITH SIMPLER IMPLEMENTATION | `HistoryJson` + recipient `AssignedRevisionNo`. |
| 35 | Submit / resubmit; review with private note and student feedback | `SubmissionAttempt`, `ReviewDecision` | FULLY PRESERVED | `PrivateNote` never in a student DTO. Reviewer is always a person. |
| 36 | Coach / supervisor reports, Report inbox | `OperationalReport` | FULLY PRESERVED | |
| 37 | Invited student, then upgrade to Individual | `Person`, `GroupMembership`, `IndividualProfile` | FULLY PRESERVED | |
| 38 | Sessions: create, publish, reschedule, cancel; supervisor assignment; "Needs Supervisor" | `Session`, `SessionDuty` | PRESERVED WITH SIMPLER IMPLEMENTATION | Reschedule history in `AuditEvent`. |
| 39 | Register for a session, remote/on-site, QR/typed code | `SessionRegistration` | FULLY PRESERVED | |
| 40 | Attendance, closeout, and "Correction history" | `Attendance`, `AuditEvent` | PRESERVED WITH SIMPLER IMPLEMENTATION | Corrections write before/after and a mandatory reason to the audit log in the same transaction. |
| 41 | Absence excuse → recommendation → decision | `AbsenceExcuse` | FULLY PRESERVED | |
| 42 | Completion of initiative / program / camp | `Completion` | FULLY PRESERVED | |
| 43 | Provider Builder, publish, change notices | `Experience`, `ExperienceRevision` | FULLY PRESERVED | |
| 44 | Booking, approval-required booking (`Pending`), waitlist, 24 h offer | `ExperienceBooking` | FULLY PRESERVED | Approval state found in the pages; v4 lacked it. |
| 45 | Cohorts: capacity, join by token, one cohort per booking, supervisor limited to own cohort | `ProviderCohort`, `ExperienceBooking.CohortId`, `StaffAppointment.CanManageCohorts` | PRESERVED WITH SIMPLER IMPLEMENTATION | Moves recorded in `AuditEvent`. |
| 46 | Safety incidents | `ProviderIncident`, `SecureFile` | FULLY PRESERVED | |
| 47 | Forms, surveys, registration forms; versioned identified responses | `Form`, `FormVersion`, `FormResponse` | PRESERVED WITH SIMPLER IMPLEMENTATION | Questions and answers are JSON; per-option counts in C#. |
| 48 | Competitions: entries, judging, ranking, results | `Form`, `FormResponse`, `CompetitionJudgment` | PRESERVED WITH SIMPLER IMPLEMENTATION | Ranking computed from judgments. |
| 49 | Community: posts, comments, reactions, bookmarks, Share Achievement | `Post`, `Comment`, `PostInteraction` | FULLY PRESERVED | |
| 50 | Report content, moderation, hide / restore | `ContentReport`, `Post/Comment.Status`, `AuditEvent` | PRESERVED WITH SIMPLER IMPLEMENTATION | |
| 51 | Notifications and reliable emails | `Notification`, `OutboxMessage` | FULLY PRESERVED | |
| 52 | Admin: partner approval, Content Studio, Garden Rules, audit, governance (suspend/unpublish), platform roles | `VerificationCase`, `ContentRelease`, `AuditEvent`, `Person.PlatformRole` | PRESERVED WITH SIMPLER IMPLEMENTATION | One platform role per person (see owner item 5; the Client has a single Admin console). |

## 2. Owner decisions respected

| Owner decision | Where enforced |
|---|---|
| One identity across workspaces | `Person` only; no per-workspace account tables. |
| One effective Accepted/Suspended membership across initiatives | Filtered unique index (SQL Server). |
| Capacity ≤ 135; three active supervisors | CHECK on `InitiativeRevision.Capacity`; `SeatService` under an `UPDLOCK` on `Initiative` for both. |
| 120-hour withdrawal boundary | Computed from start time; stored per application; extended, never shortened, on reschedule. |
| Reapply after Withdrawn / Removed when eligible and enrollment is open | New row (`AttemptNo + 1`); service rule; unique index allows one live row. |
| Notification when a representative removes a participant | Same transaction as the status change. |
| No rejoin of an ended or permanently cancelled initiative | Service rule checking `Initiative.Status`, `ApplicationClosesAtUtc` and a prior `Completed` row. |
| Joint Goals excluded; commercial and standalone sessions deferred | No tables (9 DEFER rows carried). |
| Garden derives from legitimate accomplishments | Computed from source rows; no manual "grow" input exists. |
| AI cannot authorize rewards, attendance or approvals | `ReviewDecision.ReviewerPersonId` and `Attendance.RecordedByPersonId` are NOT NULL; no AI-written column exists on those tables. |

## 3. Items needing your explicit review

Items 1 and 2 carry the two BEHAVIOR CHANGED labels. Items 3–5 are implementation choices with a visible effect that you should still approve.

1. **Garden is derived with no frozen policy.** If an Admin edits Garden Rules (thresholds), existing gardens re-evaluate immediately. The Client already behaves this way. Because "no punitive decay" is a product rule, either (a) accept re-evaluation, or (b) apply a rule that thresholds may only be lowered or added, never raised, once live.
2. **Old practice content is not retained.** Attempts and History keep title, version number and outcome; a task keeps a snapshot of its practice. A past attempt can no longer re-open the exact original prompt. If you need that, restore `PracticeVersion` (+1 table, 58 total).
3. **Lab re-scoring overwrites.** An attempt stores one score set with its scoring version; an earlier score set is not kept. Comparisons across scoring versions are still blocked.
4. **No capacity triggers.** Seat and supervisor limits are protected by one service, a row lock and a mandatory parallel-race test, not by database triggers. If you prefer belt-and-braces, add one safety-net trigger on each of `InitiativeApplication`, `ExperienceBooking`, `SessionRegistration` (3 triggers; no table change).
5. **Single platform role.** `Person.PlatformRole` is one of Admin / Moderator / ContentEditor (or none). A person cannot hold two platform roles at once. The pages show one Admin console only, so no current behavior is lost.
