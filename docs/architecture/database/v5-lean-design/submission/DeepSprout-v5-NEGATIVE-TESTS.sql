/*=====================================================================================================
  DeepSprout v5 -- NEGATIVE / BEHAVIOUR TESTS (optional companion script)
  Run AFTER DeepSprout-v5-FULL-Database.sql, against DeepSprout_V5_Demo only.
  Every test runs inside a transaction that is ALWAYS rolled back, so the demo data is unchanged.
  Result: one row per test with PASS / FAIL. "REJECT" tests expect SQL Server to refuse the statement;
  "ACCEPT" tests expect it to succeed (positive control); "INFO" rows document rules that are NOT enforced
  by SQL and belong to the application services.
=====================================================================================================*/
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
USE [DeepSprout_V5_Demo];
GO
IF OBJECT_ID('tempdb..#r') IS NOT NULL DROP TABLE #r;
CREATE TABLE #r (Id int IDENTITY(1,1), Test nvarchar(120), Expect nvarchar(8), Result nvarchar(8), Detail nvarchar(300));
GO

-- T01 duplicate identity (same normalized e-mail) ----------------------------------------------------
BEGIN TRY BEGIN TRAN;
  INSERT iam.Person (DisplayName, NormalizedEmail) VALUES (N'Duplicate Omar', N'omar.student@example.com');
  ROLLBACK; INSERT #r VALUES (N'T01 duplicate e-mail identity', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T01 duplicate e-mail identity', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T02 second live application of the same person to the same initiative ----------------------------------
BEGIN TRY BEGIN TRAN;
  DECLARE @ini bigint = (SELECT TOP 1 Id FROM institution.Initiative), @p bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'sami.student@example.com'), @rev bigint = (SELECT TOP 1 CurrentRevisionId FROM institution.Initiative);
  INSERT institution.InitiativeApplication (InitiativeId, PersonId, AttemptNo, TermsRevisionId, SubmittedAtUtc, ConsentAtUtc, Status) VALUES (@ini, @p, 2, @rev, SYSUTCDATETIME(), SYSUTCDATETIME(), N'Pending');
  ROLLBACK; INSERT #r VALUES (N'T02 duplicate live application (same initiative)', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T02 duplicate live application (same initiative)', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T03 one Accepted/Suspended membership per person across initiatives ------------------------------------------
BEGIN TRY BEGIN TRAN;
  DECLARE @inst bigint = (SELECT TOP 1 InstitutionId FROM institution.Initiative), @omar bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'omar.student@example.com'), @salim bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'salim.rep@example.com');
  INSERT institution.Initiative (InstitutionId, Status) VALUES (@inst, N'Draft');
  DECLARE @ini2 bigint = SCOPE_IDENTITY();
  INSERT institution.InitiativeRevision (InitiativeId, RevisionNo, ChangeKind, Title, Summary, TopicCode, OperatingMode, ParticipationMode, AudienceCode, Capacity, WaitlistEnabled, TimeZoneId, StartsAtUtc, EndsAtUtc, CostKind, ConsentNoticeVersion, CompletionPolicyRef, PublishedSnapshotJson, PublishedByPersonId, PublishedAtUtc)
  VALUES (@ini2, 1, N'Publish', N'Second initiative', N'x', N'focus', N'Structured', N'Online', N'all', 10, 0, N'UTC', SYSUTCDATETIME(), DATEADD(DAY,30,SYSUTCDATETIME()), N'Free', N'n1', N'c1', N'{}', @salim, SYSUTCDATETIME());
  DECLARE @rev2 bigint = SCOPE_IDENTITY();
  INSERT institution.InitiativeApplication (InitiativeId, PersonId, AttemptNo, TermsRevisionId, SubmittedAtUtc, ConsentAtUtc, Status) VALUES (@ini2, @omar, 1, @rev2, SYSUTCDATETIME(), SYSUTCDATETIME(), N'Accepted');
  ROLLBACK; INSERT #r VALUES (N'T03 second Accepted membership in another initiative', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T03 second Accepted membership in another initiative', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T04 initiative capacity above 135 ------------------------------------------------------------------------
BEGIN TRY BEGIN TRAN;
  DECLARE @ini bigint = (SELECT TOP 1 Id FROM institution.Initiative), @salim bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'salim.rep@example.com');
  INSERT institution.InitiativeRevision (InitiativeId, RevisionNo, ChangeKind, Title, Summary, TopicCode, OperatingMode, ParticipationMode, AudienceCode, Capacity, WaitlistEnabled, TimeZoneId, StartsAtUtc, EndsAtUtc, CostKind, ConsentNoticeVersion, CompletionPolicyRef, PublishedSnapshotJson, PublishedByPersonId, PublishedAtUtc)
  VALUES (@ini, 99, N'TermsUpdate', N'Too big', N'x', N'focus', N'Structured', N'Online', N'all', 136, 0, N'UTC', SYSUTCDATETIME(), DATEADD(DAY,30,SYSUTCDATETIME()), N'Free', N'n1', N'c1', N'{}', @salim, SYSUTCDATETIME());
  ROLLBACK; INSERT #r VALUES (N'T04 initiative capacity 136 (max 135)', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T04 initiative capacity 136 (max 135)', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T05 coach-group capacity 0 and T06 provider-cohort capacity 0 ---------------------------------------------------
BEGIN TRY BEGIN TRAN;
  UPDATE coach.OperationalGroup SET Capacity = 0 WHERE Name = N'Alpha Group';
  ROLLBACK; INSERT #r VALUES (N'T05 coach group capacity 0', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T05 coach group capacity 0', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  UPDATE provider.ProviderCohort SET Capacity = -1;
  ROLLBACK; INSERT #r VALUES (N'T06 provider cohort capacity -1', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T06 provider cohort capacity -1', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T07 second initial review decision for the same submission (audit A4) -------------------------------------------------
BEGIN TRY BEGIN TRAN;
  DECLARE @att bigint = (SELECT TOP 1 AttemptId FROM task.ReviewDecision), @rev bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'rania.coach@example.com');
  INSERT task.ReviewDecision (AttemptId, ReviewerPersonId, Decision, DecidedAtUtc) VALUES (@att, @rev, N'Approved', SYSUTCDATETIME());
  ROLLBACK; INSERT #r VALUES (N'T07 duplicate initial ReviewDecision for one submission', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T07 duplicate initial ReviewDecision for one submission', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T08 a correction that supersedes the first decision is allowed (ACCEPT) ------------------------------------------------
BEGIN TRY BEGIN TRAN;
  DECLARE @d bigint = (SELECT TOP 1 Id FROM task.ReviewDecision ORDER BY Id), @a bigint = (SELECT TOP 1 AttemptId FROM task.ReviewDecision ORDER BY Id), @rev bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'rania.coach@example.com');
  INSERT task.ReviewDecision (AttemptId, SupersedesId, ReviewerPersonId, Decision, DecidedAtUtc) VALUES (@a, @d, @rev, N'NeedsRevision', SYSUTCDATETIME());
  ROLLBACK; INSERT #r VALUES (N'T08 review correction that supersedes the original', N'ACCEPT', N'PASS', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T08 review correction that supersedes the original', N'ACCEPT', N'FAIL', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T09 expired invitation without a PersonId is allowed (ACCEPT, audit A1); an Active member without a person is not ---------------
BEGIN TRY BEGIN TRAN;
  DECLARE @g bigint = (SELECT Id FROM coach.OperationalGroup WHERE Name = N'Program Group 1');
  INSERT coach.GroupMembership (GroupId, NormalizedEmail, TokenHash, Status) VALUES (@g, N'another.invitee@example.com', HASHBYTES('SHA2_512', N'x'), N'Expired');
  ROLLBACK; INSERT #r VALUES (N'T09 expired invitation without PersonId', N'ACCEPT', N'PASS', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T09 expired invitation without PersonId', N'ACCEPT', N'FAIL', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  DECLARE @g bigint = (SELECT Id FROM coach.OperationalGroup WHERE Name = N'Program Group 1');
  INSERT coach.GroupMembership (GroupId, Status) VALUES (@g, N'Active');
  ROLLBACK; INSERT #r VALUES (N'T10 Active group member without a person', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T10 Active group member without a person', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T11 same outbox event + same delivery key is a duplicate; a different recipient key is fine (audit A5) -------------------
BEGIN TRY BEGIN TRAN;
  DECLARE @e uniqueidentifier = (SELECT TOP 1 EventPublicId FROM ops.OutboxMessage WHERE EventType = N'session.rescheduled');
  INSERT ops.OutboxMessage (EventPublicId, DedupKey, EventType, Channel, PayloadJson, OccurredAtUtc) SELECT TOP 1 EventPublicId, DedupKey, EventType, Channel, PayloadJson, OccurredAtUtc FROM ops.OutboxMessage WHERE EventPublicId = @e;
  ROLLBACK; INSERT #r VALUES (N'T11 duplicate outbox (event, recipient key)', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T11 duplicate outbox (event, recipient key)', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  DECLARE @e uniqueidentifier = (SELECT TOP 1 EventPublicId FROM ops.OutboxMessage WHERE EventType = N'session.rescheduled');
  INSERT ops.OutboxMessage (EventPublicId, DedupKey, EventType, Channel, PayloadJson, OccurredAtUtc) VALUES (@e, N'999:session.rescheduled', N'session.rescheduled', N'Email', N'{}', SYSUTCDATETIME());
  ROLLBACK; INSERT #r VALUES (N'T12 same event, third recipient', N'ACCEPT', N'PASS', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T12 same event, third recipient', N'ACCEPT', N'FAIL', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T13 Experience: Cancelled draft without revision allowed (B6); Published without revision rejected --------------------------------
BEGIN TRY BEGIN TRAN;
  DECLARE @prov bigint = (SELECT Id FROM org.Organization WHERE Name = N'Example Outdoor Camps');
  INSERT provider.Experience (OrganizationId, Kind, Status, CancelledAtUtc, CancellationReason) VALUES (@prov, N'Experience', N'Cancelled', SYSUTCDATETIME(), N'Never published');
  ROLLBACK; INSERT #r VALUES (N'T13 cancel an unpublished draft experience', N'ACCEPT', N'PASS', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T13 cancel an unpublished draft experience', N'ACCEPT', N'FAIL', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  DECLARE @prov bigint = (SELECT Id FROM org.Organization WHERE Name = N'Example Outdoor Camps');
  INSERT provider.Experience (OrganizationId, Kind, Status) VALUES (@prov, N'Experience', N'Published');
  ROLLBACK; INSERT #r VALUES (N'T14 Published experience without a revision', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T14 Published experience without a revision', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T15 invalid JSON in a published form definition / usage domains -------------------------------------------------------------------
BEGIN TRY BEGIN TRAN;
  DECLARE @f bigint = (SELECT TOP 1 Id FROM forms.Form), @p bigint = (SELECT TOP 1 Id FROM iam.Person);
  INSERT forms.FormVersion (FormId, VersionNo, ConsentNoticeVersion, OpensAtUtc, ClosesAtUtc, PublishedByPersonId, PublishedAtUtc, DefinitionJson) VALUES (@f, 99, N'n', SYSUTCDATETIME(), SYSUTCDATETIME(), @p, SYSUTCDATETIME(), N'this is not json');
  ROLLBACK; INSERT #r VALUES (N'T15 invalid JSON in FormVersion.DefinitionJson', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T15 invalid JSON in FormVersion.DefinitionJson', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  DECLARE @p bigint = (SELECT TOP 1 PersonId FROM shield.ExtensionInstallation), @i bigint = (SELECT TOP 1 Id FROM shield.ExtensionInstallation);
  INSERT shield.BrowserUsagePeriod (PersonId, InstallationId, LocalDate, TimeZoneId, ObservedSeconds, CoverageSeconds, SequenceNo, ReceivedAtUtc, DomainsJson) VALUES (@p, @i, '2027-01-01', N'UTC', -5, 100, 99, SYSUTCDATETIME(), N'[]');
  ROLLBACK; INSERT #r VALUES (N'T16 negative usage seconds', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T16 negative usage seconds', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T17 duplicate usage batch (idempotency key installation + sequence) -------------------------------------------------------------------
BEGIN TRY BEGIN TRAN;
  INSERT shield.BrowserUsagePeriod (PersonId, InstallationId, LocalDate, TimeZoneId, ObservedSeconds, CoverageSeconds, SequenceNo, ReceivedAtUtc) SELECT TOP 1 PersonId, InstallationId, LocalDate, TimeZoneId, ObservedSeconds, CoverageSeconds, SequenceNo, ReceivedAtUtc FROM shield.BrowserUsagePeriod;
  ROLLBACK; INSERT #r VALUES (N'T17 replayed Shield batch', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T17 replayed Shield batch', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T18 duplicate attendance, T19 dangling FK, T20 duplicate live booking, T21 second valid baseline ---------------------------------------------
BEGIN TRY BEGIN TRAN;
  INSERT session.Attendance (SessionId, PersonId, RegistrationId, Status, RecordedByPersonId, RecordedAtUtc) SELECT TOP 1 SessionId, PersonId, RegistrationId, N'Present', RecordedByPersonId, SYSUTCDATETIME() FROM session.Attendance WHERE RegistrationId IS NOT NULL;
  ROLLBACK; INSERT #r VALUES (N'T18 duplicate attendance (session, person)', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T18 duplicate attendance (session, person)', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  INSERT session.SessionRegistration (SessionId, PersonId, Mode, RegisteredAtUtc) VALUES (999999, 1, N'Online', SYSUTCDATETIME());
  ROLLBACK; INSERT #r VALUES (N'T19 registration for a session that does not exist (FK)', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T19 registration for a session that does not exist (FK)', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  INSERT provider.ExperienceBooking (ExperienceId, PersonId, RevisionId, Status, ConsentAtUtc, BookedAtUtc) SELECT TOP 1 ExperienceId, PersonId, RevisionId, N'Pending', SYSUTCDATETIME(), SYSUTCDATETIME() FROM provider.ExperienceBooking WHERE Status = N'Confirmed';
  ROLLBACK; INSERT #r VALUES (N'T20 second live booking by the same person', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T20 second live booking by the same person', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  INSERT lab.AssessmentAttempt (PersonId, InstrumentVersionId, InstrumentCode, Kind, Status, StartedAtUtc) SELECT TOP 1 PersonId, InstrumentVersionId, InstrumentCode, N'Baseline', N'Valid', SYSUTCDATETIME() FROM lab.AssessmentAttempt WHERE Kind = N'Baseline';
  ROLLBACK; INSERT #r VALUES (N'T21 second valid baseline for the same instrument', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T21 second valid baseline for the same instrument', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T22 one open recovery cycle per person --------------------------------------------------------------------------------------------------------
BEGIN TRY BEGIN TRAN;
  INSERT recovery.RecoveryCycle (PersonId, CycleNo, PolicyVersion, TimeZoneId, Status, ActivatedAtUtc) SELECT TOP 1 PersonId, 2, N'p', N'UTC', N'Active', SYSUTCDATETIME() FROM recovery.RecoveryCycle;
  ROLLBACK; INSERT #r VALUES (N'T22 second open recovery cycle', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T22 second open recovery cycle', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T23 insert-only history: the application role cannot UPDATE/DELETE audit or consent, but can INSERT ------------------------------------------------
BEGIN TRY
  EXECUTE AS USER = N'ds_app_demo';
  UPDATE ops.AuditEvent SET Reason = N'tampered' WHERE Id = (SELECT TOP 1 Id FROM ops.AuditEvent);
  REVERT; INSERT #r VALUES (N'T23 application role UPDATE on AuditEvent', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF USER_NAME() = N'ds_app_demo' REVERT; INSERT #r VALUES (N'T23 application role UPDATE on AuditEvent', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY
  EXECUTE AS USER = N'ds_app_demo';
  DELETE FROM iam.ConsentRecord;
  REVERT; INSERT #r VALUES (N'T24 application role DELETE on ConsentRecord', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF USER_NAME() = N'ds_app_demo' REVERT; INSERT #r VALUES (N'T24 application role DELETE on ConsentRecord', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  EXECUTE AS USER = N'ds_app_demo';
  INSERT ops.AuditEvent (ResourceKind, ResourceId, Action, AtUtc) VALUES (N'Demo', 1, N'Insert', SYSUTCDATETIME());
  REVERT; ROLLBACK; INSERT #r VALUES (N'T25 application role INSERT on AuditEvent', N'ACCEPT', N'PASS', N'accepted');
END TRY BEGIN CATCH IF USER_NAME() = N'ds_app_demo' REVERT; IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T25 application role INSERT on AuditEvent', N'ACCEPT', N'FAIL', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T26 INFO: a cross-resource mismatch is NOT stopped by single-column FKs (attendance person differs from registration person) ---------------------------
BEGIN TRY BEGIN TRAN;
  DECLARE @s bigint = (SELECT TOP 1 SessionId FROM session.Attendance WHERE RegistrationId IS NOT NULL), @reg bigint = (SELECT TOP 1 RegistrationId FROM session.Attendance WHERE RegistrationId IS NOT NULL), @rec bigint = (SELECT TOP 1 RecordedByPersonId FROM session.Attendance), @other bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'sami.student@example.com');
  INSERT session.Attendance (SessionId, PersonId, RegistrationId, Status, RecordedByPersonId, RecordedAtUtc) VALUES (@s, @other, @reg, N'Present', @rec, SYSUTCDATETIME());
  ROLLBACK; INSERT #r VALUES (N'T26 attendance.PersonId <> registration.PersonId', N'INFO', N'INFO', N'SQL accepts it: application rule (handler loads registration through the actor and copies PersonId)');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T26 attendance.PersonId <> registration.PersonId', N'INFO', N'INFO', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T27–T34 Onboarding 2.0: versioned setup answers, Journey Level 1, explicit activation without Lab -----------------------------
BEGIN TRY BEGIN TRAN;
  UPDATE personal.IndividualProfile SET SetupAnswersVersion = NULL WHERE PersonId = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'zaid.new@example.com');
  ROLLBACK; INSERT #r VALUES (N'T27 setup answers without a version', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T27 setup answers without a version', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  UPDATE personal.IndividualProfile SET SetupAnswersJson = N'["reduce-scrolling","instagram"]' WHERE PersonId = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'zaid.new@example.com');
  ROLLBACK; INSERT #r VALUES (N'T28 setup answers stored as a JSON array', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T28 setup answers stored as a JSON array', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  UPDATE personal.IndividualProfile SET SetupAnswersJson = NULL WHERE PersonId = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'zaid.new@example.com');
  ROLLBACK; INSERT #r VALUES (N'T29 setup version without answers', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T29 setup version without answers', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  UPDATE personal.IndividualProfile SET JourneyLevel = 0 WHERE PersonId = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'zaid.new@example.com');
  ROLLBACK; INSERT #r VALUES (N'T30 Journey Level 0', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T30 Journey Level 0', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  INSERT iam.Person (DisplayName, NormalizedEmail, IndividualEnabledAtUtc) VALUES (N'Level test', N'level.test@example.com', SYSUTCDATETIME());
  INSERT personal.IndividualProfile (PersonId, PreferredTimeZone) VALUES (SCOPE_IDENTITY(), N'UTC');
  DECLARE @lvl int = (SELECT JourneyLevel FROM personal.IndividualProfile WHERE Id = SCOPE_IDENTITY()), @stage nvarchar(24) = (SELECT OnboardingStage FROM personal.IndividualProfile WHERE Id = SCOPE_IDENTITY());
  ROLLBACK; INSERT #r VALUES (N'T31 new profile starts at Journey Level 1', N'ACCEPT', CASE WHEN @lvl = 1 AND @stage = N'Started' THEN N'PASS' ELSE N'FAIL' END, CONCAT(N'level ', @lvl, N', stage ', @stage));
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T31 new profile starts at Journey Level 1', N'ACCEPT', N'FAIL', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  DECLARE @z bigint = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'zaid.new@example.com');
  DECLARE @c bigint = (SELECT Id FROM recovery.RecoveryCycle WHERE PersonId = @z AND Status = N'Preview');
  IF EXISTS (SELECT 1 FROM lab.AssessmentAttempt WHERE PersonId = @z) THROW 50001, 'fixture has Lab attempts', 1;
  UPDATE recovery.PlanRevision SET Status = N'Accepted', AcceptedAtUtc = SYSUTCDATETIME() WHERE CycleId = @c AND Status = N'Draft';
  UPDATE recovery.RecoveryCycle SET Status = N'Active', ActivatedAtUtc = SYSUTCDATETIME(), StartLocalDate = CAST(SYSUTCDATETIME() AS date) WHERE Id = @c;
  UPDATE personal.IndividualProfile SET OnboardingStage = N'Activated' WHERE PersonId = @z;
  ROLLBACK; INSERT #r VALUES (N'T32 explicit activation with zero Lab attempts', N'ACCEPT', N'PASS', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T32 explicit activation with zero Lab attempts', N'ACCEPT', N'FAIL', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  UPDATE recovery.PlanRevision SET Status = N'Accepted' WHERE Status = N'Draft' AND CycleId = (SELECT Id FROM recovery.RecoveryCycle WHERE PersonId = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'zaid.new@example.com'));
  ROLLBACK; INSERT #r VALUES (N'T33 plan accepted without an acceptance time', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T33 plan accepted without an acceptance time', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  UPDATE recovery.RecoveryCycle SET Status = N'Active' WHERE PersonId = (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'zaid.new@example.com');
  ROLLBACK; INSERT #r VALUES (N'T34 cycle made Active without an activation time', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T34 cycle made Active without an activation time', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
-- T35–T40 v4.1: Institution-only organizations, invitation-only staff, retired Programs and partnerships ---------------------------------
BEGIN TRY BEGIN TRAN;
  INSERT org.Organization (Kind, Name, CountryCode) VALUES (N'Provider', N'New provider', N'EG');
  ROLLBACK; INSERT #r VALUES (N'T35 new Provider organization', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T35 new Provider organization', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  INSERT org.StaffAppointment (InitiativeId, Role, Status, NormalizedEmail, TokenHash, ExpiresAtUtc, InvitedByPersonId, InvitedAtUtc) VALUES ((SELECT TOP 1 Id FROM institution.Initiative), N'Supervisor', N'Requested', N'self.request@example.com', 0x01, DATEADD(DAY,7,SYSUTCDATETIME()), (SELECT Id FROM iam.Person WHERE NormalizedEmail = N'salim.rep@example.com'), SYSUTCDATETIME());
  ROLLBACK; INSERT #r VALUES (N'T36 Supervisor self-request (Requested)', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T36 Supervisor self-request (Requested)', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  DECLARE @inst bigint = (SELECT Id FROM org.Organization WHERE Name = N'Example Outdoor Camps');
  INSERT provider.Experience (OrganizationId, Kind, Status) VALUES (@inst, N'Camp', N'Draft');
  ROLLBACK; INSERT #r VALUES (N'T37 Institution owns a new outdoor activity', N'ACCEPT', N'PASS', N'accepted');
END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T37 Institution owns a new outdoor activity', N'ACCEPT', N'FAIL', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  EXECUTE AS USER = N'ds_app_demo';
  INSERT coach.CoachProgram (OwnerPersonId, Status) VALUES ((SELECT Id FROM iam.Person WHERE NormalizedEmail = N'rania.coach@example.com'), N'Draft');
  REVERT; ROLLBACK; INSERT #r VALUES (N'T38 application role creates an independent Program', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF USER_NAME() = N'ds_app_demo' REVERT; IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T38 application role creates an independent Program', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY BEGIN TRAN;
  EXECUTE AS USER = N'ds_app_demo';
  UPDATE partnership.PartnershipLink SET Status = N'Ended';
  REVERT; ROLLBACK; INSERT #r VALUES (N'T39 application role changes a retired partnership', N'REJECT', N'FAIL', N'accepted');
END TRY BEGIN CATCH IF USER_NAME() = N'ds_app_demo' REVERT; IF @@TRANCOUNT > 0 ROLLBACK; INSERT #r VALUES (N'T39 application role changes a retired partnership', N'REJECT', N'PASS', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
BEGIN TRY
  EXECUTE AS USER = N'ds_app_demo';
  DECLARE @n int = (SELECT COUNT(*) FROM coach.CoachProgram) + (SELECT COUNT(*) FROM partnership.PartnershipLink);
  REVERT; INSERT #r VALUES (N'T40 retired history stays readable', N'ACCEPT', CASE WHEN @n > 0 THEN N'PASS' ELSE N'FAIL' END, CONCAT(@n, N' historical rows readable'));
END TRY BEGIN CATCH IF USER_NAME() = N'ds_app_demo' REVERT; INSERT #r VALUES (N'T40 retired history stays readable', N'ACCEPT', N'FAIL', LEFT(ERROR_MESSAGE(), 200)); END CATCH;
GO
SELECT Id, Test, Expect, Result, Detail FROM #r ORDER BY Id;
SELECT SUM(CASE WHEN Result = N'PASS' THEN 1 ELSE 0 END) AS Passed, SUM(CASE WHEN Result = N'FAIL' THEN 1 ELSE 0 END) AS Failed, SUM(CASE WHEN Result = N'INFO' THEN 1 ELSE 0 END) AS Info FROM #r;
GO
