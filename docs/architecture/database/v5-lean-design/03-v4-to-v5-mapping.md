# DeepSprout v4 (87) → v5 (58) Mapping

> Generated. Every v4 table has exactly one disposition.

## Reconciliation

| | Count |
|---|---:|
| v4 tables | 87 |
| KEEP (survive as a v5 table) | 58 |
| MERGE (folded into another v5 table or column) | 25 |
| REMOVE (no storage; derived or covered by existing keys) | 4 |
| **KEEP + MERGE + REMOVE** | **87** |
| DEFER (from the 129-table database; not in v4, still not built) | 9 |

87 = 58 + 25 + 4. v5 table count = KEEP = **58** (no new table is introduced).

| v4 table | Disposition | v5 destination | Reason |
|---|---|---|---|
| `activity.OfflineRoutine` | **KEEP** | `activity.OfflineRoutine` | Kept. |
| `activity.PracticeAttempt` | **KEEP** | `activity.PracticeAttempt` | Kept. |
| `activity.PracticeDefinition` | **KEEP** | `activity.PracticeDefinition` | Kept. |
| `activity.PracticeProgressionDecision` | **MERGE** | `activity.PracticeAttempt` | Tier change is stored on the attempt that caused it (ResultingTier, ProgressionOutcome). Current tier = last completed attempt of that type; level history = attempts where the outcome changed. |
| `activity.PracticeVersion` | **KEEP** | `activity.PracticeVersion` | Kept. |
| `activity.RoutineCheckIn` | **KEEP** | `activity.RoutineCheckIn` | Kept. |
| `coach.CoachProgram` | **KEEP** | `coach.CoachProgram` | Kept and absorbs columns of merged tables. |
| `coach.GroupCoachAssignment` | **MERGE** | `coach.OperationalGroup` | Group has CoachPersonId and CoachStaffAppointmentId. "Coach handover history" is read from AuditEvent. |
| `coach.GroupMembership` | **KEEP** | `coach.GroupMembership` | Kept. |
| `coach.OperationalGroup` | **KEEP** | `coach.OperationalGroup` | Kept. |
| `coach.ProgramRevision` | **MERGE** | `coach.CoachProgram` | Current published content lives on the program; completion keeps its own frozen BasisJson. |
| `commercial.EntitlementAllocation` | **DEFER** | — | Commercial subscriptions deferred by owner (unchanged from v4) |
| `commercial.PlanFeature` | **DEFER** | — | Commercial subscriptions deferred by owner (unchanged from v4) |
| `commercial.PlanVersion` | **DEFER** | — | Commercial subscriptions deferred by owner (unchanged from v4) |
| `commercial.Subscription` | **DEFER** | — | Commercial subscriptions deferred by owner (unchanged from v4) |
| `commercial.UsageLedger` | **DEFER** | — | Commercial subscriptions deferred by owner (unchanged from v4) |
| `community.Bookmark` | **MERGE** | `community.PostInteraction` | Kind = Bookmark. |
| `community.Comment` | **KEEP** | `community.Comment` | Kept. |
| `community.ContentReport` | **KEEP** | `community.ContentReport` | Kept and absorbs columns of merged tables. |
| `community.JointGoal` | **DEFER** | — | Community Challenge / Joint Goals excluded by owner (unchanged from v4) |
| `community.JointGoalCheckIn` | **DEFER** | — | Community Challenge / Joint Goals excluded by owner (unchanged from v4) |
| `community.JointGoalMember` | **DEFER** | — | Community Challenge / Joint Goals excluded by owner (unchanged from v4) |
| `community.ModerationDecision` | **MERGE** | `community.ContentReport` | Resolution columns on the report; hide/restore history in AuditEvent. |
| `community.Post` | **KEEP** | `community.Post` | Kept. |
| `community.Reaction` | **KEEP** | `community.PostInteraction` | Kept, renamed to community.PostInteraction. |
| `evidence.EvidenceEvent` | **REMOVE** | — | Garden progress is computed from the source rows that already exist (completed practice attempts, routine check-ins, attendance, completions, approved reviews). No separate evidence layer. |
| `evidence.GroupRewardEntry` | **REMOVE** | — | Group Garden is computed on read from approved reviews, session attendance and initiative completion of the group/initiative. |
| `evidence.PersonalRewardEntry` | **REMOVE** | — | Personal Garden is computed on read from legitimate source rows; a correction to a source row corrects the Garden automatically, so reversal rows disappear. |
| `evidence.RewardPolicyVersion` | **MERGE** | `governance.ContentRelease` | Garden Rules are a ContentRelease payload with target garden.rules (Admin keeps the Garden Rules editor). |
| `files.SecureFile` | **KEEP** | `files.SecureFile` | Kept. |
| `forms.CompetitionCriterion` | **MERGE** | `forms.FormVersion` | Criteria are part of the sealed DefinitionJson. |
| `forms.CompetitionCriterionScore` | **MERGE** | `forms.CompetitionJudgment` | Scores become ScoresJson on the judgment; ranking is computed. |
| `forms.CompetitionJudgment` | **KEEP** | `forms.CompetitionJudgment` | Kept. |
| `forms.Form` | **KEEP** | `forms.Form` | Kept. |
| `forms.FormAnswer` | **MERGE** | `forms.FormResponse` | Answers become AnswersJson keyed by question key. Per-option counts are computed in C#. |
| `forms.FormQuestion` | **MERGE** | `forms.FormVersion` | Questions are part of the sealed DefinitionJson. |
| `forms.FormQuestionOption` | **MERGE** | `forms.FormVersion` | Options are part of the sealed DefinitionJson. |
| `forms.FormResponse` | **KEEP** | `forms.FormResponse` | Kept. |
| `forms.FormVersion` | **KEEP** | `forms.FormVersion` | Kept. |
| `governance.ContentRelease` | **KEEP** | `governance.ContentRelease` | Kept. |
| `iam.ConsentRecord` | **KEEP** | `iam.ConsentRecord` | Kept. |
| `iam.GlobalGrant` | **MERGE** | `iam.Person` | Platform staff role (Admin / Moderator / ContentEditor) becomes Person.PlatformRole. OWNER REVIEW: one role per person, no per-capability grant history (history goes to AuditEvent). |
| `iam.OtpChallenge` | **KEEP** | `iam.OtpChallenge` | Kept. |
| `iam.PasswordCredential` | **MERGE** | `iam.Person` | Hash, failed-attempt counter and lock time become 3 columns of Person. The table existed only to allow table-level permission isolation, which one SQL login cannot use. |
| `iam.Person` | **KEEP** | `iam.Person` | Kept. |
| `institution.Initiative` | **KEEP** | `institution.Initiative` | Kept. |
| `institution.InitiativeApplication` | **KEEP** | `institution.InitiativeApplication` | Kept. |
| `institution.InitiativeApplicationDecision` | **MERGE** | `ops.AuditEvent` | Each transition writes an AuditEvent (before/after status, actor, reason) in the same transaction. The Application History timeline reads it. |
| `institution.InitiativeRevision` | **KEEP** | `institution.InitiativeRevision` | Kept. |
| `lab.AssessmentAttempt` | **KEEP** | `lab.AssessmentAttempt` | Kept. |
| `lab.AssessmentResponse` | **MERGE** | `lab.AssessmentAttempt` | Item and trial responses become ResponsesJson on the attempt. One writer (the person taking it); read as a whole to score. |
| `lab.AssessmentScore` | **MERGE** | `lab.AssessmentAttempt` | Metrics become ScoresJson plus PrimaryScore and ScoringVersion on the attempt. Comparison still requires equal ScoringVersion. |
| `lab.AssessmentWindow` | **MERGE** | `lab.AssessmentAttempt` | The weekly window is derived from the ISO week key stored on Official attempts; "Missed" and "Reassessment unavailable" are computed. Window length is still an open policy, so no table is built for it. |
| `lab.InstrumentVersion` | **KEEP** | `lab.InstrumentVersion` | Kept. |
| `ops.AuditEvent` | **KEEP** | `ops.AuditEvent` | Kept. |
| `ops.IdempotencyRecord` | **REMOVE** | — | Duplicate protection comes from natural unique keys and state checks (see validation strategy, "duplicate consequential operations"). |
| `ops.Notification` | **KEEP** | `ops.Notification` | Kept. |
| `ops.OutboxMessage` | **KEEP** | `ops.OutboxMessage` | Kept. |
| `org.Organization` | **KEEP** | `org.Organization` | Kept. |
| `org.OrganizationMember` | **KEEP** | `org.OrganizationMember` | Kept. |
| `org.StaffAppointment` | **KEEP** | `org.StaffAppointment` | Kept. |
| `org.VerificationCase` | **KEEP** | `org.VerificationCase` | Kept. |
| `partnership.PartnershipLink` | **KEEP** | `partnership.PartnershipLink` | Kept. |
| `personal.IndividualProfile` | **KEEP** | `personal.IndividualProfile` | Kept. |
| `provider.Experience` | **KEEP** | `provider.Experience` | Kept. |
| `provider.ExperienceBooking` | **KEEP** | `provider.ExperienceBooking` | Kept. |
| `provider.ExperienceRevision` | **KEEP** | `provider.ExperienceRevision` | Kept. |
| `provider.ProviderCohort` | **KEEP** | `provider.ProviderCohort` | Kept. |
| `provider.ProviderCohortMember` | **MERGE** | `provider.ExperienceBooking` | A confirmed booking has at most one live cohort, so CohortId is a column; moves are written to AuditEvent. |
| `provider.ProviderIncident` | **KEEP** | `provider.ProviderIncident` | Kept. |
| `recovery.PlanRevision` | **KEEP** | `recovery.PlanRevision` | Kept. |
| `recovery.RecoveryCycle` | **KEEP** | `recovery.RecoveryCycle` | Kept. |
| `recovery.ScheduledAction` | **KEEP** | `recovery.ScheduledAction` | Kept. |
| `recovery.WeeklyReview` | **KEEP** | `recovery.WeeklyReview` | Kept. |
| `session.AbsenceExcuse` | **KEEP** | `session.AbsenceExcuse` | Kept. |
| `session.Attendance` | **KEEP** | `session.Attendance` | Kept. |
| `session.AttendanceCorrection` | **MERGE** | `ops.AuditEvent` | Before/after status and outcome plus the mandatory reason are stored in AuditEvent in the same transaction. "Correction history" reads it. |
| `session.Completion` | **KEEP** | `session.Completion` | Kept. |
| `session.Session` | **KEEP** | `session.Session` | Kept and absorbs columns of merged tables. |
| `session.SessionDuty` | **KEEP** | `session.SessionDuty` | Kept. |
| `session.SessionRegistration` | **KEEP** | `session.SessionRegistration` | Kept. |
| `session.SessionRevision` | **MERGE** | `session.Session` | Venue, link and check-in window are columns of the session; each reschedule writes an AuditEvent and notifies registrants. |
| `session.StandaloneSessionSupervisorAppointment` | **DEFER** | — | Standalone sessions deferred by owner (unchanged from v4) |
| `shield.BrowserUsageDomain` | **MERGE** | `shield.BrowserUsagePeriod` | Per-site-family seconds become DomainsJson on the period row, so the "sum equals total" invariant disappears. |
| `shield.BrowserUsagePeriod` | **KEEP** | `shield.BrowserUsagePeriod` | Kept. |
| `shield.ExtensionInstallation` | **KEEP** | `shield.ExtensionInstallation` | Kept. |
| `shield.ProtectionSession` | **KEEP** | `shield.ProtectionSession` | Kept. |
| `shield.ShieldConfiguration` | **MERGE** | `personal.IndividualProfile` | Reminder settings become one JSON column. Settings versions have no screen. |
| `shield.ShieldSelectedDomain` | **MERGE** | `personal.IndividualProfile` | The selected site families are an array inside ShieldSettingsJson. |
| `task.Assignment` | **KEEP** | `task.Assignment` | Kept and absorbs columns of merged tables. |
| `task.AssignmentRecipient` | **KEEP** | `task.AssignmentRecipient` | Kept. |
| `task.AssignmentRevision` | **MERGE** | `task.Assignment` | Current text on the assignment, earlier versions in HistoryJson; each recipient stores AssignedRevisionNo. |
| `task.OperationalReport` | **KEEP** | `task.OperationalReport` | Kept. |
| `task.ReviewDecision` | **KEEP** | `task.ReviewDecision` | Kept and absorbs columns of merged tables. |
| `task.ReviewPrivateNote` | **MERGE** | `task.ReviewDecision` | PrivateNote column. The privacy control is "never select it into a student DTO", the same control the separate table relied on. |
| `task.SubmissionAttempt` | **KEEP** | `task.SubmissionAttempt` | Kept. |
