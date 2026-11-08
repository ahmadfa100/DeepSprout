BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    IF OBJECT_ID(N'iam.PersonEmail', N'U') IS NOT NULL THROW 51100, 'This is the historical 129-table M1 database. The V5 context must not migrate it.', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    IF EXISTS (SELECT 1 FROM org.StaffAppointment WHERE Status = N'Requested' OR RequestedByPersonId IS NOT NULL) THROW 51110, 'Self-requested staff appointments exist. Resolve them before v5-lean-2 (v4.1 removed self-request).', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    IF EXISTS (SELECT 1 FROM org.StaffAppointment WHERE NormalizedEmail IS NULL OR TokenHash IS NULL OR ExpiresAtUtc IS NULL OR InvitedByPersonId IS NULL OR InvitedAtUtc IS NULL) THROW 51111, 'Staff appointments without a complete email invitation exist. Resolve them before v5-lean-2.', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    IF EXISTS (SELECT 1 FROM personal.IndividualProfile WHERE (SetupAnswersJson IS NULL AND SetupAnswersVersion IS NOT NULL) OR (SetupAnswersJson IS NOT NULL AND (SetupAnswersVersion IS NULL OR SetupAnswersVersion < 1 OR LEFT(LTRIM(SetupAnswersJson), 1) <> N'{'))) THROW 51112, 'Setup answers without a valid version, or not stored as a JSON object, exist. Assign their version before v5-lean-2.', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    IF EXISTS (SELECT 1 FROM recovery.PlanRevision WHERE (Status = N'Draft' AND AcceptedAtUtc IS NOT NULL) OR (Status <> N'Draft' AND AcceptedAtUtc IS NULL)) THROW 51113, 'Plan revisions with an inconsistent acceptance time exist. Resolve them before v5-lean-2.', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [provider].[Experience] DROP CONSTRAINT [FK_Experience_ProviderId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [org].[StaffAppointment] DROP CONSTRAINT [FK_StaffAppointment_RequestedByPersonId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [org].[VerificationCase] DROP CONSTRAINT [CK_VerificationCase_Kind];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [org].[VerificationCase] DROP CONSTRAINT [CK_VerificationCase_Subject];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    DROP INDEX [IX_StaffAppointment_RequestedByPersonId] ON [org].[StaffAppointment];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [org].[StaffAppointment] DROP CONSTRAINT [CK_StaffAppointment_Invited];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [org].[StaffAppointment] DROP CONSTRAINT [CK_StaffAppointment_Status];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [org].[Organization] DROP CONSTRAINT [CK_Organization_Kind];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [personal].[IndividualProfile] DROP CONSTRAINT [CK_IndividualProfile_Stage];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    INSERT ops.AuditEvent (ResourceKind, ResourceId, Action, BeforeStatus, AfterStatus, Reason, DetailJson, AtUtc) SELECT N'Organization', Id, N'v5-lean-2.ProviderToInstitution', N'Provider', N'Institution', N'v4.1: Institutions own outdoor activities', N'{"column":"Kind"}', SYSUTCDATETIME() FROM org.Organization WHERE Kind = N'Provider';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    UPDATE org.Organization SET Kind = N'Institution' WHERE Kind = N'Provider';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    INSERT ops.AuditEvent (ResourceKind, ResourceId, Action, BeforeStatus, AfterStatus, Reason, DetailJson, AtUtc) SELECT N'VerificationCase', Id, N'v5-lean-2.ProviderToInstitution', N'Provider', N'Institution', N'v4.1: Institution verification only', N'{"column":"Kind"}', SYSUTCDATETIME() FROM org.VerificationCase WHERE Kind = N'Provider';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    UPDATE org.VerificationCase SET Kind = N'Institution' WHERE Kind = N'Provider';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[org].[StaffAppointment]') AND [c].[name] = N'RequestedByPersonId');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [org].[StaffAppointment] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [org].[StaffAppointment] DROP COLUMN [RequestedByPersonId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC sp_rename N'[provider].[Experience].[ProviderId]', N'OrganizationId', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC sp_rename N'[provider].[Experience].[IX_Experience_ProviderId]', N'IX_Experience_OrganizationId', 'INDEX';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [personal].[IndividualProfile] ADD [JourneyLevel] int NOT NULL DEFAULT (1);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC(N'ALTER TABLE [org].[VerificationCase] ADD CONSTRAINT [CK_VerificationCase_Kind] CHECK (Kind IN (''Institution'',''Coach''))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC(N'ALTER TABLE [org].[VerificationCase] ADD CONSTRAINT [CK_VerificationCase_Subject] CHECK ((Kind = ''Coach'' AND OrganizationId IS NULL) OR (Kind = ''Institution'' AND OrganizationId IS NOT NULL))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC(N'ALTER TABLE [org].[StaffAppointment] ADD CONSTRAINT [CK_StaffAppointment_Invited] CHECK (NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL AND ExpiresAtUtc IS NOT NULL AND InvitedByPersonId IS NOT NULL AND InvitedAtUtc IS NOT NULL)');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC(N'ALTER TABLE [org].[StaffAppointment] ADD CONSTRAINT [CK_StaffAppointment_Status] CHECK (Status IN (''Pending'',''Active'',''Declined'',''Expired'',''Cancelled'',''Revoked''))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC(N'ALTER TABLE [recovery].[PlanRevision] ADD CONSTRAINT [CK_PlanRevision_Accepted] CHECK ((Status = ''Draft'' AND AcceptedAtUtc IS NULL) OR (Status IN (''Accepted'',''Superseded'') AND AcceptedAtUtc IS NOT NULL))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC(N'ALTER TABLE [org].[Organization] ADD CONSTRAINT [CK_Organization_Kind] CHECK (Kind IN (''Institution''))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC(N'ALTER TABLE [personal].[IndividualProfile] ADD CONSTRAINT [CK_IndividualProfile_JourneyLevel] CHECK (JourneyLevel >= 1)');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC(N'ALTER TABLE [personal].[IndividualProfile] ADD CONSTRAINT [CK_IndividualProfile_SetupAnswers] CHECK ((SetupAnswersJson IS NULL AND SetupAnswersVersion IS NULL) OR (SetupAnswersJson IS NOT NULL AND SetupAnswersVersion IS NOT NULL AND SetupAnswersVersion >= 1 AND LEFT(LTRIM(SetupAnswersJson), 1) = N''{''))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    EXEC(N'ALTER TABLE [personal].[IndividualProfile] ADD CONSTRAINT [CK_IndividualProfile_Stage] CHECK (OnboardingStage IN (''Started'',''QuickSetup'',''Story'',''Home'',''Activated'',''TourDone'',''Introduced'',''Setup'',''Baselines'',''Results'',''Preview''))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    ALTER TABLE [provider].[Experience] ADD CONSTRAINT [FK_Experience_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [org].[Organization] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    IF DATABASE_PRINCIPAL_ID(N'ds_app') IS NOT NULL BEGIN DENY INSERT, UPDATE, DELETE ON [coach].[CoachProgram] TO [ds_app]; DENY INSERT, UPDATE, DELETE ON [partnership].[PartnershipLink] TO [ds_app]; END
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108112954_V5Lean2Onboarding2AndV41'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261108112954_V5Lean2Onboarding2AndV41', N'10.0.0');
END;

COMMIT;
GO

