# Appendix — Table width, v4 vs v5

> Generated. v4 counts include CreatedAtUtc/UpdatedAtUtc/RowVersion on every table; v5 removes UpdatedAtUtc everywhere and RowVersion from 70 tables. A table that absorbed others can gain columns.

| v5 table | v4 columns | v5 columns | nullable (v5) | JSON columns |
|---|---:|---:|---:|---:|
| `provider.ExperienceRevision` | 30 | 31 | 10 | 1 |
| `institution.InitiativeRevision` | 31 | 30 | 8 | 1 |
| `session.Session` | 22 | 25 | 11 | 0 |
| `institution.InitiativeApplication` | 22 | 21 | 10 | 0 |
| `provider.ExperienceBooking` | 22 | 21 | 11 | 0 |
| `lab.AssessmentAttempt` | 17 | 20 | 9 | 2 |
| `org.StaffAppointment` | 21 | 19 | 12 | 0 |
| `task.Assignment` | 11 | 19 | 6 | 1 |
| `task.OperationalReport` | 23 | 19 | 10 | 3 |
| `partnership.PartnershipLink` | 20 | 17 | 11 | 1 |
| `recovery.RecoveryCycle` | 17 | 16 | 6 | 0 |
| `activity.PracticeAttempt` | 16 | 16 | 8 | 0 |
| `session.AbsenceExcuse` | 17 | 16 | 8 | 0 |
| `org.VerificationCase` | 15 | 15 | 6 | 2 |
| `coach.OperationalGroup` | 9 | 15 | 8 | 0 |
| `institution.Initiative` | 19 | 14 | 8 | 1 |
| `coach.GroupMembership` | 18 | 14 | 9 | 0 |
| `session.Attendance` | 17 | 14 | 6 | 0 |
| `personal.IndividualProfile` | 14 | 13 | 8 | 3 |
| `recovery.ScheduledAction` | 15 | 13 | 4 | 0 |
| `coach.CoachProgram` | 11 | 13 | 7 | 2 |
| `provider.Experience` | 16 | 13 | 6 | 1 |
| `forms.FormVersion` | 13 | 13 | 2 | 2 |
| `community.ContentReport` | 10 | 13 | 7 | 0 |
| `ops.OutboxMessage` | 16 | 13 | 3 | 1 |
| `iam.Person` | 10 | 12 | 6 | 0 |
| `lab.InstrumentVersion` | 14 | 12 | 3 | 1 |
| `recovery.PlanRevision` | 14 | 12 | 1 | 1 |
| `activity.PracticeVersion` | 12 | 12 | 3 | 2 |
| `shield.ProtectionSession` | 14 | 12 | 2 | 1 |
| `session.Completion` | 20 | 12 | 6 | 1 |
| `provider.ProviderIncident` | 14 | 12 | 4 | 0 |
| `forms.Form` | 13 | 12 | 5 | 1 |
| `forms.FormResponse` | 12 | 12 | 4 | 1 |
| `ops.AuditEvent` | 16 | 12 | 6 | 1 |
| `ops.Notification` | 13 | 12 | 4 | 1 |
| `org.Organization` | 13 | 11 | 4 | 2 |
| `shield.ExtensionInstallation` | 13 | 11 | 2 | 0 |
| `shield.BrowserUsagePeriod` | 13 | 11 | 1 | 1 |
| `session.SessionRegistration` | 15 | 11 | 3 | 0 |
| `iam.OtpChallenge` | 12 | 10 | 2 | 0 |
| `recovery.WeeklyReview` | 11 | 10 | 4 | 0 |
| `provider.ProviderCohort` | 8 | 10 | 3 | 0 |
| `community.Post` | 12 | 10 | 4 | 1 |
| `files.SecureFile` | 14 | 10 | 2 | 0 |
| `org.OrganizationMember` | 12 | 9 | 2 | 0 |
| `activity.OfflineRoutine` | 11 | 9 | 3 | 1 |
| `task.ReviewDecision` | 11 | 9 | 3 | 0 |
| `governance.ContentRelease` | 12 | 9 | 2 | 1 |
| `task.AssignmentRecipient` | 10 | 8 | 0 | 0 |
| `task.SubmissionAttempt` | 11 | 8 | 3 | 0 |
| `session.SessionDuty` | 12 | 8 | 1 | 0 |
| `forms.CompetitionJudgment` | 8 | 8 | 1 | 1 |
| `iam.ConsentRecord` | 8 | 7 | 0 | 0 |
| `activity.RoutineCheckIn` | 10 | 7 | 0 | 0 |
| `activity.PracticeDefinition` | 8 | 6 | 0 | 0 |
| `community.Comment` | 8 | 6 | 0 | 0 |
| `community.PostInteraction` | 5 | 6 | 1 | 0 |

Tables with 20 or more columns among these 58: v4 9, v5 6.
