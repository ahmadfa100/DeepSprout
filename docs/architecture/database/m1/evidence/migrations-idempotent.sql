IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'M1 migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    IF SCHEMA_ID(N'ops') IS NULL EXEC(N'CREATE SCHEMA [ops];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    IF SCHEMA_ID(N'iam') IS NULL EXEC(N'CREATE SCHEMA [iam];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    IF SCHEMA_ID(N'institution') IS NULL EXEC(N'CREATE SCHEMA [institution];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    IF SCHEMA_ID(N'files') IS NULL EXEC(N'CREATE SCHEMA [files];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[Institution] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [Name] nvarchar(200) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CountryCode] char(2) NOT NULL,
        [HeadquartersCity] nvarchar(120) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Institution] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Institution_Status] CHECK ([Status] IN (N'Applied',N'Verified',N'Suspended',N'Closed'))
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [iam].[Person] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [DisplayName] nvarchar(160) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [IndividualEnabled] bit NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Person] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Person_Status] CHECK ([Status] IN (N'Active',N'Suspended',N'Closed'))
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[Initiative] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [InstitutionId] bigint NOT NULL,
        [Title] nvarchar(200) NULL,
        [Mode] nvarchar(24) NULL,
        [Status] nvarchar(24) NOT NULL,
        [Capacity] smallint NULL,
        [TimeZoneId] nvarchar(80) NULL,
        [StartsAtUtc] datetime2(3) NULL,
        [EndsAtUtc] datetime2(3) NULL,
        [WithdrawalCutoffAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Initiative] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_Initiative_Id_InstitutionId] UNIQUE ([Id], [InstitutionId]),
        CONSTRAINT [CK_Initiative_Capacity] CHECK ([Capacity] IS NULL OR [Capacity] BETWEEN 1 AND 135),
        CONSTRAINT [CK_Initiative_Cutoff] CHECK ([WithdrawalCutoffAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [WithdrawalCutoffAtUtc]<[StartsAtUtc])),
        CONSTRAINT [CK_Initiative_End] CHECK ([EndsAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [EndsAtUtc]>[StartsAtUtc])),
        CONSTRAINT [CK_Initiative_Published] CHECK ([Status]<>N'Published' OR ([Title] IS NOT NULL AND [Mode] IS NOT NULL AND [Capacity] IS NOT NULL AND [TimeZoneId] IS NOT NULL AND [StartsAtUtc] IS NOT NULL AND [EndsAtUtc] IS NOT NULL AND [WithdrawalCutoffAtUtc] IS NOT NULL)),
        CONSTRAINT [CK_Initiative_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Closed',N'Completed',N'Cancelled',N'Archived')),
        CONSTRAINT [FK_Initiative_Institution_InstitutionId] FOREIGN KEY ([InstitutionId]) REFERENCES [institution].[Institution] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [ops].[AuditEvent] (
        [Id] bigint NOT NULL IDENTITY,
        [ActorPersonId] bigint NULL,
        [SelectedGrantKind] nvarchar(40) NULL,
        [SelectedGrantId] bigint NULL,
        [ResourceKind] nvarchar(64) NOT NULL,
        [ResourcePublicId] uniqueidentifier NOT NULL,
        [Action] nvarchar(64) NOT NULL,
        [BeforeStatus] nvarchar(40) NULL,
        [AfterStatus] nvarchar(40) NULL,
        [BeforeHash] varbinary(32) NULL,
        [AfterHash] varbinary(32) NULL,
        [Reason] nvarchar(1000) NULL,
        [AtUtc] datetime2(3) NOT NULL,
        [CorrelationId] uniqueidentifier NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_AuditEvent] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AuditEvent_Person_ActorPersonId] FOREIGN KEY ([ActorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [iam].[ConsentRecord] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [PurposeCode] nvarchar(80) NOT NULL,
        [NoticeVersion] nvarchar(64) NOT NULL,
        [Decision] nvarchar(24) NOT NULL,
        [EvidenceRef] nvarchar(300) NULL,
        [DecidedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ConsentRecord] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ConsentRecord_Decision] CHECK ([Decision] IN (N'Accepted',N'Withdrawn')),
        CONSTRAINT [FK_ConsentRecord_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [iam].[GlobalGrant] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [Capability] nvarchar(64) NOT NULL,
        [GrantedByPersonId] bigint NOT NULL,
        [RevokedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_GlobalGrant] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_GlobalGrant_Person_GrantedByPersonId] FOREIGN KEY ([GrantedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_GlobalGrant_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [iam].[OtpChallenge] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NULL,
        [NormalizedEmail] nvarchar(320) NOT NULL,
        [Purpose] nvarchar(32) NOT NULL,
        [CodeHash] varbinary(64) NOT NULL,
        [AttemptCount] smallint NOT NULL,
        [ExpiresAtUtc] datetime2(3) NOT NULL,
        [UsedAtUtc] datetime2(3) NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_OtpChallenge] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_OtpChallenge_Attempts] CHECK ([AttemptCount] >= 0),
        CONSTRAINT [CK_OtpChallenge_Status] CHECK ([Status] IN (N'Issued',N'Used',N'Expired')),
        CONSTRAINT [FK_OtpChallenge_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [iam].[PasswordCredential] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [Hash] varbinary(512) NOT NULL,
        [Algorithm] nvarchar(40) NOT NULL,
        [Parameters] nvarchar(300) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_PasswordCredential] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_PasswordCredential_Status] CHECK ([Status] IN (N'Active',N'Revoked')),
        CONSTRAINT [FK_PasswordCredential_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [iam].[PersonEmail] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [NormalizedEmail] nvarchar(320) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [IsPrimary] bit NOT NULL,
        [VerifiedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_PersonEmail] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_PersonEmail_Status] CHECK ([Status] IN (N'Pending',N'Verified',N'Retired')),
        CONSTRAINT [CK_PersonEmail_Verified] CHECK ([Status] <> N'Verified' OR [VerifiedAtUtc] IS NOT NULL),
        CONSTRAINT [FK_PersonEmail_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[RepresentativeMembership] (
        [Id] bigint NOT NULL IDENTITY,
        [InstitutionId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [GrantedByPersonId] bigint NOT NULL,
        [RevokedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_RepresentativeMembership] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_RepresentativeMembership_Revoked] CHECK (([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)),
        CONSTRAINT [CK_RepresentativeMembership_Status] CHECK ([Status] IN (N'Active',N'Revoked')),
        CONSTRAINT [FK_RepresentativeMembership_Institution_InstitutionId] FOREIGN KEY ([InstitutionId]) REFERENCES [institution].[Institution] ([Id]),
        CONSTRAINT [FK_RepresentativeMembership_Person_GrantedByPersonId] FOREIGN KEY ([GrantedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_RepresentativeMembership_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [files].[SecureFile] (
        [Id] bigint NOT NULL IDENTITY,
        [OwnerPersonId] bigint NULL,
        [Purpose] nvarchar(40) NOT NULL,
        [ObjectKey] nvarchar(300) NOT NULL,
        [MimeType] nvarchar(120) NOT NULL,
        [Bytes] bigint NOT NULL,
        [Sha256] varbinary(32) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_SecureFile] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_SecureFile_Bytes] CHECK ([Bytes] > 0),
        CONSTRAINT [CK_SecureFile_Status] CHECK ([Status] IN (N'Pending',N'Available',N'Quarantined',N'Deleted')),
        CONSTRAINT [FK_SecureFile_Person_OwnerPersonId] FOREIGN KEY ([OwnerPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[InitiativeRevision] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NOT NULL,
        [RevisionNo] int NOT NULL,
        [Summary] nvarchar(1200) NOT NULL,
        [AudienceCode] nvarchar(80) NOT NULL,
        [CoverageCode] nvarchar(120) NULL,
        [CostKind] nvarchar(16) NOT NULL,
        [Price] decimal(19,4) NULL,
        [Currency] char(3) NULL,
        [CompletionPolicyRef] nvarchar(120) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Mode] nvarchar(24) NOT NULL,
        [Capacity] smallint NOT NULL,
        [TimeZoneId] nvarchar(80) NOT NULL,
        [StartsAtUtc] datetime2(3) NOT NULL,
        [EndsAtUtc] datetime2(3) NOT NULL,
        [WithdrawalCutoffAtUtc] datetime2(3) NOT NULL,
        [PublishedSnapshotJson] nvarchar(max) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_InitiativeRevision] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_InitiativeRevision_Id_InitiativeId] UNIQUE ([Id], [InitiativeId]),
        CONSTRAINT [CK_InitiativeRevision_Cost] CHECK (([CostKind]=N'Free' AND [Price] IS NULL AND [Currency] IS NULL) OR ([CostKind]=N'Paid' AND [Price]>0 AND [Currency] IS NOT NULL)),
        CONSTRAINT [CK_InitiativeRevision_Json] CHECK (ISJSON([PublishedSnapshotJson])=1),
        CONSTRAINT [CK_InitiativeRevision_No] CHECK ([RevisionNo]>0),
        CONSTRAINT [CK_InitiativeRevision_Times] CHECK ([Capacity] BETWEEN 1 AND 135 AND [EndsAtUtc]>[StartsAtUtc] AND [WithdrawalCutoffAtUtc]<[StartsAtUtc]),
        CONSTRAINT [FK_InitiativeRevision_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[InitiativeStaffInvitation] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NOT NULL,
        [NormalizedEmail] nvarchar(320) NOT NULL,
        [Role] nvarchar(16) NOT NULL,
        [TokenHash] varbinary(64) NOT NULL,
        [ExpiresAtUtc] datetime2(3) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [InvitedByPersonId] bigint NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeStaffInvitation] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_InitiativeStaffInvitation_Id_InitiativeId_Role] UNIQUE ([Id], [InitiativeId], [Role]),
        CONSTRAINT [CK_InitiativeStaffInvitation_Role] CHECK ([Role] IN (N'Supervisor',N'Coach')),
        CONSTRAINT [CK_InitiativeStaffInvitation_Status] CHECK ([Status] IN (N'Pending',N'Accepted',N'Declined',N'Expired',N'Cancelled',N'Revoked')),
        CONSTRAINT [FK_InitiativeStaffInvitation_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]),
        CONSTRAINT [FK_InitiativeStaffInvitation_Person_InvitedByPersonId] FOREIGN KEY ([InvitedByPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[InstitutionVerificationCase] (
        [Id] bigint NOT NULL IDENTITY,
        [InstitutionId] bigint NOT NULL,
        [ApplicantPersonId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [EvidenceFileId] bigint NULL,
        [DecidedByPersonId] bigint NULL,
        [DecisionReason] nvarchar(1000) NULL,
        [DecidedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InstitutionVerificationCase] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_InstitutionVerificationCase_Status] CHECK ([Status] IN (N'Submitted',N'MoreInfo',N'Approved',N'Rejected')),
        CONSTRAINT [FK_InstitutionVerificationCase_Institution_InstitutionId] FOREIGN KEY ([InstitutionId]) REFERENCES [institution].[Institution] ([Id]),
        CONSTRAINT [FK_InstitutionVerificationCase_Person_ApplicantPersonId] FOREIGN KEY ([ApplicantPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_InstitutionVerificationCase_Person_DecidedByPersonId] FOREIGN KEY ([DecidedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_InstitutionVerificationCase_SecureFile_EvidenceFileId] FOREIGN KEY ([EvidenceFileId]) REFERENCES [files].[SecureFile] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[InitiativeApplication] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [InitiativeId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [TermsRevisionId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [AttemptNo] int NOT NULL,
        [SubmittedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeApplication] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_InitiativeApplication_Id_InitiativeId] UNIQUE ([Id], [InitiativeId]),
        CONSTRAINT [AK_InitiativeApplication_Id_InitiativeId_PersonId] UNIQUE ([Id], [InitiativeId], [PersonId]),
        CONSTRAINT [AK_InitiativeApplication_Id_InitiativeId_TermsRevisionId] UNIQUE ([Id], [InitiativeId], [TermsRevisionId]),
        CONSTRAINT [CK_InitiativeApplication_Attempt] CHECK ([AttemptNo]>0),
        CONSTRAINT [CK_InitiativeApplication_Status] CHECK ([Status] IN (N'Pending',N'Queued',N'Offered',N'Accepted',N'Rejected',N'Withdrawn',N'Blocked')),
        CONSTRAINT [FK_InitiativeApplication_InitiativeRevision_TermsRevisionId_InitiativeId] FOREIGN KEY ([TermsRevisionId], [InitiativeId]) REFERENCES [institution].[InitiativeRevision] ([Id], [InitiativeId]),
        CONSTRAINT [FK_InitiativeApplication_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]),
        CONSTRAINT [FK_InitiativeApplication_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[InitiativeDraft] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NOT NULL,
        [BaseRevisionId] bigint NULL,
        [LastSavedStage] tinyint NOT NULL,
        [Stage1Json] nvarchar(max) NULL,
        [Stage2Json] nvarchar(max) NULL,
        [Stage3Json] nvarchar(max) NULL,
        [Stage4Json] nvarchar(max) NULL,
        [Stage5Json] nvarchar(max) NULL,
        [Stage6Json] nvarchar(max) NULL,
        [Status] nvarchar(24) NOT NULL,
        [UpdatedByPersonId] bigint NOT NULL,
        [PublishedRevisionId] bigint NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeDraft] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_InitiativeDraft_Id_InitiativeId] UNIQUE ([Id], [InitiativeId]),
        CONSTRAINT [CK_InitiativeDraft_Json1] CHECK ([Stage1Json] IS NULL OR ISJSON([Stage1Json])=1),
        CONSTRAINT [CK_InitiativeDraft_Json2] CHECK ([Stage2Json] IS NULL OR ISJSON([Stage2Json])=1),
        CONSTRAINT [CK_InitiativeDraft_Json3] CHECK ([Stage3Json] IS NULL OR ISJSON([Stage3Json])=1),
        CONSTRAINT [CK_InitiativeDraft_Json4] CHECK ([Stage4Json] IS NULL OR ISJSON([Stage4Json])=1),
        CONSTRAINT [CK_InitiativeDraft_Json5] CHECK ([Stage5Json] IS NULL OR ISJSON([Stage5Json])=1),
        CONSTRAINT [CK_InitiativeDraft_Json6] CHECK ([Stage6Json] IS NULL OR ISJSON([Stage6Json])=1),
        CONSTRAINT [CK_InitiativeDraft_Published] CHECK ([Status]<>N'Published' OR [PublishedRevisionId] IS NOT NULL),
        CONSTRAINT [CK_InitiativeDraft_Stage] CHECK ([LastSavedStage] BETWEEN 1 AND 6),
        CONSTRAINT [CK_InitiativeDraft_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Abandoned')),
        CONSTRAINT [FK_InitiativeDraft_InitiativeRevision_BaseRevisionId_InitiativeId] FOREIGN KEY ([BaseRevisionId], [InitiativeId]) REFERENCES [institution].[InitiativeRevision] ([Id], [InitiativeId]),
        CONSTRAINT [FK_InitiativeDraft_InitiativeRevision_PublishedRevisionId_InitiativeId] FOREIGN KEY ([PublishedRevisionId], [InitiativeId]) REFERENCES [institution].[InitiativeRevision] ([Id], [InitiativeId]),
        CONSTRAINT [FK_InitiativeDraft_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]),
        CONSTRAINT [FK_InitiativeDraft_Person_UpdatedByPersonId] FOREIGN KEY ([UpdatedByPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[InitiativeStaffAppointment] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [InvitationId] bigint NOT NULL,
        [Role] nvarchar(16) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [AcceptedAtUtc] datetime2(3) NOT NULL,
        [RevokedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeStaffAppointment] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_InitiativeStaffAppointment_Id_InitiativeId] UNIQUE ([Id], [InitiativeId]),
        CONSTRAINT [CK_InitiativeStaffAppointment_Revoked] CHECK (([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)),
        CONSTRAINT [CK_InitiativeStaffAppointment_Role] CHECK ([Role] IN (N'Supervisor',N'Coach')),
        CONSTRAINT [CK_InitiativeStaffAppointment_Status] CHECK ([Status] IN (N'Active',N'Revoked')),
        CONSTRAINT [FK_InitiativeStaffAppointment_InitiativeStaffInvitation_InvitationId_InitiativeId_Role] FOREIGN KEY ([InvitationId], [InitiativeId], [Role]) REFERENCES [institution].[InitiativeStaffInvitation] ([Id], [InitiativeId], [Role]),
        CONSTRAINT [FK_InitiativeStaffAppointment_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]),
        CONSTRAINT [FK_InitiativeStaffAppointment_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[InitiativeApplicationDecision] (
        [Id] bigint NOT NULL IDENTITY,
        [ApplicationId] bigint NOT NULL,
        [InitiativeId] bigint NOT NULL,
        [DecisionNo] int NOT NULL,
        [Action] nvarchar(24) NOT NULL,
        [ActorPersonId] bigint NOT NULL,
        [Reason] nvarchar(800) NULL,
        [TermsRevisionId] bigint NOT NULL,
        [AtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_InitiativeApplicationDecision] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_InitiativeApplicationDecision_Action] CHECK ([Action] IN (N'Approved',N'Rejected',N'Withdrawn',N'Queued',N'Offered',N'Blocked')),
        CONSTRAINT [FK_InitiativeApplicationDecision_InitiativeApplication_ApplicationId_InitiativeId_TermsRevisionId] FOREIGN KEY ([ApplicationId], [InitiativeId], [TermsRevisionId]) REFERENCES [institution].[InitiativeApplication] ([Id], [InitiativeId], [TermsRevisionId]),
        CONSTRAINT [FK_InitiativeApplicationDecision_Person_ActorPersonId] FOREIGN KEY ([ActorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE TABLE [institution].[InitiativeMembership] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [InitiativeId] bigint NOT NULL,
        [ApplicationId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [AcceptedAtUtc] datetime2(3) NOT NULL,
        [EndedAtUtc] datetime2(3) NULL,
        [CapacityReleasedAtUtc] datetime2(3) NULL,
        [WithdrawalCutoffAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeMembership] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_InitiativeMembership_Id_InitiativeId] UNIQUE ([Id], [InitiativeId]),
        CONSTRAINT [CK_InitiativeMembership_EndRelease] CHECK (([Status] IN (N'Accepted',N'Suspended') AND [EndedAtUtc] IS NULL AND [CapacityReleasedAtUtc] IS NULL) OR ([Status] IN (N'Withdrawn',N'Removed',N'Completed') AND [EndedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc]>=[EndedAtUtc])),
        CONSTRAINT [CK_InitiativeMembership_Status] CHECK ([Status] IN (N'Accepted',N'Suspended',N'Withdrawn',N'Removed',N'Completed')),
        CONSTRAINT [FK_InitiativeMembership_InitiativeApplication_ApplicationId_InitiativeId_PersonId] FOREIGN KEY ([ApplicationId], [InitiativeId], [PersonId]) REFERENCES [institution].[InitiativeApplication] ([Id], [InitiativeId], [PersonId]),
        CONSTRAINT [FK_InitiativeMembership_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]),
        CONSTRAINT [FK_InitiativeMembership_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_AuditEvent_ActorPersonId_AtUtc] ON [ops].[AuditEvent] ([ActorPersonId], [AtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_AuditEvent_ResourceKind_ResourcePublicId_AtUtc] ON [ops].[AuditEvent] ([ResourceKind], [ResourcePublicId], [AtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_ConsentRecord_PersonId_PurposeCode_DecidedAtUtc] ON [iam].[ConsentRecord] ([PersonId], [PurposeCode], [DecidedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_GlobalGrant_GrantedByPersonId] ON [iam].[GlobalGrant] ([GrantedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_GlobalGrant_PersonId_Capability] ON [iam].[GlobalGrant] ([PersonId], [Capability]) WHERE [RevokedAtUtc] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_Initiative_InstitutionId_Status] ON [institution].[Initiative] ([InstitutionId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Initiative_PublicId] ON [institution].[Initiative] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_Initiative_Status_StartsAtUtc] ON [institution].[Initiative] ([Status], [StartsAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_InitiativeApplication_InitiativeId_PersonId] ON [institution].[InitiativeApplication] ([InitiativeId], [PersonId]) WHERE [Status] IN (N''Pending'',N''Queued'',N''Offered'')');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeApplication_InitiativeId_PersonId_AttemptNo] ON [institution].[InitiativeApplication] ([InitiativeId], [PersonId], [AttemptNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeApplication_InitiativeId_Status_SubmittedAtUtc] ON [institution].[InitiativeApplication] ([InitiativeId], [Status], [SubmittedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeApplication_PersonId] ON [institution].[InitiativeApplication] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeApplication_PublicId] ON [institution].[InitiativeApplication] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeApplication_TermsRevisionId_InitiativeId] ON [institution].[InitiativeApplication] ([TermsRevisionId], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeApplicationDecision_ActorPersonId] ON [institution].[InitiativeApplicationDecision] ([ActorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeApplicationDecision_ApplicationId_DecisionNo] ON [institution].[InitiativeApplicationDecision] ([ApplicationId], [DecisionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeApplicationDecision_ApplicationId_InitiativeId_TermsRevisionId] ON [institution].[InitiativeApplicationDecision] ([ApplicationId], [InitiativeId], [TermsRevisionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeApplicationDecision_InitiativeId_AtUtc] ON [institution].[InitiativeApplicationDecision] ([InitiativeId], [AtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeDraft_BaseRevisionId_InitiativeId] ON [institution].[InitiativeDraft] ([BaseRevisionId], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_InitiativeDraft_InitiativeId] ON [institution].[InitiativeDraft] ([InitiativeId]) WHERE [Status] = N''Draft''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeDraft_PublishedRevisionId_InitiativeId] ON [institution].[InitiativeDraft] ([PublishedRevisionId], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeDraft_UpdatedByPersonId] ON [institution].[InitiativeDraft] ([UpdatedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeMembership_ApplicationId] ON [institution].[InitiativeMembership] ([ApplicationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeMembership_ApplicationId_InitiativeId_PersonId] ON [institution].[InitiativeMembership] ([ApplicationId], [InitiativeId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeMembership_InitiativeId_CapacityReleasedAtUtc_Status] ON [institution].[InitiativeMembership] ([InitiativeId], [CapacityReleasedAtUtc], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_InitiativeMembership_PersonId] ON [institution].[InitiativeMembership] ([PersonId]) WHERE [Status] IN (N''Accepted'',N''Suspended'')');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeMembership_PublicId] ON [institution].[InitiativeMembership] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeRevision_InitiativeId_RevisionNo] ON [institution].[InitiativeRevision] ([InitiativeId], [RevisionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_InitiativeStaffAppointment_InitiativeId_PersonId_Role] ON [institution].[InitiativeStaffAppointment] ([InitiativeId], [PersonId], [Role]) WHERE [Status] = N''Active''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeStaffAppointment_InvitationId] ON [institution].[InitiativeStaffAppointment] ([InvitationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeStaffAppointment_InvitationId_InitiativeId_Role] ON [institution].[InitiativeStaffAppointment] ([InvitationId], [InitiativeId], [Role]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeStaffAppointment_PersonId_Status] ON [institution].[InitiativeStaffAppointment] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_InitiativeStaffInvitation_InitiativeId_NormalizedEmail_Role] ON [institution].[InitiativeStaffInvitation] ([InitiativeId], [NormalizedEmail], [Role]) WHERE [Status] = N''Pending''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeStaffInvitation_InvitedByPersonId] ON [institution].[InitiativeStaffInvitation] ([InvitedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InitiativeStaffInvitation_Status_ExpiresAtUtc] ON [institution].[InitiativeStaffInvitation] ([Status], [ExpiresAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Institution_PublicId] ON [institution].[Institution] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_Institution_Status_Name] ON [institution].[Institution] ([Status], [Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InstitutionVerificationCase_ApplicantPersonId] ON [institution].[InstitutionVerificationCase] ([ApplicantPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InstitutionVerificationCase_DecidedByPersonId] ON [institution].[InstitutionVerificationCase] ([DecidedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InstitutionVerificationCase_EvidenceFileId] ON [institution].[InstitutionVerificationCase] ([EvidenceFileId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InstitutionVerificationCase_InstitutionId] ON [institution].[InstitutionVerificationCase] ([InstitutionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_InstitutionVerificationCase_Status_CreatedAtUtc] ON [institution].[InstitutionVerificationCase] ([Status], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_OtpChallenge_NormalizedEmail_Purpose_ExpiresAtUtc] ON [iam].[OtpChallenge] ([NormalizedEmail], [Purpose], [ExpiresAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_OtpChallenge_PersonId] ON [iam].[OtpChallenge] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PasswordCredential_PersonId] ON [iam].[PasswordCredential] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Person_PublicId] ON [iam].[Person] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_Person_Status_Id] ON [iam].[Person] ([Status], [Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_PersonEmail_NormalizedEmail] ON [iam].[PersonEmail] ([NormalizedEmail]) WHERE [Status] = N''Verified''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_PersonEmail_PersonId] ON [iam].[PersonEmail] ([PersonId]) WHERE [IsPrimary] = 1 AND [Status] = N''Verified''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_RepresentativeMembership_GrantedByPersonId] ON [institution].[RepresentativeMembership] ([GrantedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_RepresentativeMembership_InstitutionId_PersonId] ON [institution].[RepresentativeMembership] ([InstitutionId], [PersonId]) WHERE [RevokedAtUtc] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_RepresentativeMembership_PersonId_Status] ON [institution].[RepresentativeMembership] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SecureFile_ObjectKey] ON [files].[SecureFile] ([ObjectKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE INDEX [IX_SecureFile_OwnerPersonId] ON [files].[SecureFile] ([OwnerPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    /* Applied by the EF Core InitialM1 migration after the 19 tables.
       Each separator begins a separate SQL command; no GO directives. */
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'M1 migration targets only DeepSprout_Validation', 1;
    IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name=N'deepsprout_runtime' AND type=N'R')
        CREATE ROLE deepsprout_runtime AUTHORIZATION dbo;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER FUNCTION institution.CanWithdraw(@NowUtc datetime2(3), @CutoffUtc datetime2(3))
    RETURNS bit
    AS
    BEGIN
        RETURN CASE WHEN @NowUtc < @CutoffUtc THEN 1 ELSE 0 END;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER TRIGGER institution.TR_Initiative_PublishedRevision
    ON institution.Initiative AFTER INSERT, UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        IF EXISTS (
            SELECT 1 FROM inserted i WHERE i.Status=N'Published'
            AND NOT EXISTS (SELECT 1 FROM institution.InitiativeRevision r WHERE r.InitiativeId=i.Id)
        ) THROW 51040, 'Published initiative requires a matching revision', 1;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER TRIGGER institution.TR_InitiativeRevision_Immutable
    ON institution.InitiativeRevision AFTER UPDATE, DELETE
    AS
    BEGIN
        THROW 51041, 'Published initiative revisions are immutable', 1;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER TRIGGER institution.TR_InitiativeApplicationDecision_Immutable
    ON institution.InitiativeApplicationDecision AFTER UPDATE, DELETE
    AS
    BEGIN
        THROW 51042, 'Application decisions are append-only', 1;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER TRIGGER ops.TR_AuditEvent_Immutable
    ON ops.AuditEvent AFTER UPDATE, DELETE
    AS
    BEGIN
        THROW 51043, 'Audit events are append-only', 1;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.CreateDraft
        @InstitutionId bigint, @ActorPersonId bigint,
        @InitiativeId bigint OUTPUT, @DraftId bigint OUTPUT
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRAN;
        IF NOT EXISTS (SELECT 1 FROM institution.Institution WHERE Id=@InstitutionId AND Status=N'Verified')
            THROW 51101, 'Institution is not verified', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
            THROW 51102, 'Representative grant is not active', 1;
        INSERT institution.Initiative(InstitutionId,Status) VALUES(@InstitutionId,N'Draft');
        SET @InitiativeId=SCOPE_IDENTITY();
        INSERT institution.InitiativeDraft(InitiativeId,LastSavedStage,Status,UpdatedByPersonId)
            VALUES(@InitiativeId,1,N'Draft',@ActorPersonId);
        SET @DraftId=SCOPE_IDENTITY();
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
            SELECT @ActorPersonId,N'Initiative',PublicId,N'DraftCreated',N'Draft',SYSUTCDATETIME(),NEWID()
            FROM institution.Initiative WHERE Id=@InitiativeId;
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.SaveDraftStage
        @DraftId bigint, @ActorPersonId bigint, @ExpectedRowVersion binary(8),
        @Stage tinyint, @StageJson nvarchar(max)
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        IF @Stage NOT BETWEEN 1 AND 6 OR @StageJson IS NULL OR ISJSON(@StageJson)<>1
            THROW 51103, 'Stage number or JSON invalid', 1;
        BEGIN TRAN;
        DECLARE @InstitutionId bigint, @InitiativeId bigint;
        SELECT @InitiativeId=d.InitiativeId,@InstitutionId=i.InstitutionId
        FROM institution.InitiativeDraft d JOIN institution.Initiative i ON i.Id=d.InitiativeId
        WHERE d.Id=@DraftId AND d.Status=N'Draft';
        IF @InitiativeId IS NULL THROW 51104, 'Active draft not found', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
            THROW 51102, 'Representative grant is not active', 1;
        UPDATE institution.InitiativeDraft SET
            Stage1Json=CASE WHEN @Stage=1 THEN @StageJson ELSE Stage1Json END,
            Stage2Json=CASE WHEN @Stage=2 THEN @StageJson ELSE Stage2Json END,
            Stage3Json=CASE WHEN @Stage=3 THEN @StageJson ELSE Stage3Json END,
            Stage4Json=CASE WHEN @Stage=4 THEN @StageJson ELSE Stage4Json END,
            Stage5Json=CASE WHEN @Stage=5 THEN @StageJson ELSE Stage5Json END,
            Stage6Json=CASE WHEN @Stage=6 THEN @StageJson ELSE Stage6Json END,
            LastSavedStage=CASE WHEN @Stage>LastSavedStage THEN @Stage ELSE LastSavedStage END,
            UpdatedAtUtc=SYSUTCDATETIME(),UpdatedByPersonId=@ActorPersonId
        WHERE Id=@DraftId AND Status=N'Draft' AND RowVersion=@ExpectedRowVersion;
        IF @@ROWCOUNT<>1 THROW 51105, 'Draft rowversion conflict', 1;
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.PublishDraft
        @DraftId bigint, @ActorPersonId bigint, @Title nvarchar(200), @Mode nvarchar(24),
        @Capacity smallint, @TimeZoneId nvarchar(80), @StartsAtUtc datetime2(3), @EndsAtUtc datetime2(3),
        @Summary nvarchar(1200), @AudienceCode nvarchar(80), @CompletionPolicyRef nvarchar(120),
        @RevisionId bigint OUTPUT
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@InstitutionId bigint,@PublicId uniqueidentifier,@RevisionNo int,
                @Snapshot nvarchar(max),@Cutoff datetime2(3);
        SELECT @InitiativeId=i.Id,@InstitutionId=i.InstitutionId,@PublicId=i.PublicId
        FROM institution.InitiativeDraft d
        JOIN institution.Initiative i WITH (UPDLOCK,HOLDLOCK) ON i.Id=d.InitiativeId
        WHERE d.Id=@DraftId AND d.Status=N'Draft' AND i.Status=N'Draft';
        IF @InitiativeId IS NULL THROW 51106, 'Publishable draft not found', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.Institution WHERE Id=@InstitutionId AND Status=N'Verified')
            THROW 51101, 'Institution is not verified', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
            THROW 51102, 'Representative grant is not active', 1;
        IF @Title IS NULL OR TRIM(@Title)=N'' OR @Mode IS NULL OR @Capacity NOT BETWEEN 1 AND 135
           OR @TimeZoneId IS NULL OR @StartsAtUtc IS NULL OR @EndsAtUtc<=@StartsAtUtc
           OR @Summary IS NULL OR @AudienceCode IS NULL OR @CompletionPolicyRef IS NULL
            THROW 51107, 'Required publication terms are incomplete', 1;
        IF EXISTS (SELECT 1 FROM institution.InitiativeDraft WHERE Id=@DraftId
           AND (Stage1Json IS NULL OR Stage2Json IS NULL OR Stage3Json IS NULL
                OR Stage4Json IS NULL OR Stage5Json IS NULL OR Stage6Json IS NULL))
            THROW 51107, 'Six builder stages are incomplete', 1;
        SELECT @Snapshot=(SELECT JSON_QUERY(Stage1Json) AS stage1,JSON_QUERY(Stage2Json) AS stage2,
           JSON_QUERY(Stage3Json) AS stage3,JSON_QUERY(Stage4Json) AS stage4,
           JSON_QUERY(Stage5Json) AS stage5,JSON_QUERY(Stage6Json) AS stage6
           FROM institution.InitiativeDraft WHERE Id=@DraftId FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
        SET @Cutoff=DATEADD(hour,-120,@StartsAtUtc);
        SELECT @RevisionNo=COALESCE(MAX(RevisionNo),0)+1 FROM institution.InitiativeRevision WHERE InitiativeId=@InitiativeId;
        INSERT institution.InitiativeRevision(InitiativeId,RevisionNo,Summary,AudienceCode,CostKind,
            CompletionPolicyRef,Title,Mode,Capacity,TimeZoneId,StartsAtUtc,EndsAtUtc,
            WithdrawalCutoffAtUtc,PublishedSnapshotJson)
        VALUES(@InitiativeId,@RevisionNo,@Summary,@AudienceCode,N'Free',@CompletionPolicyRef,
            @Title,@Mode,@Capacity,@TimeZoneId,@StartsAtUtc,@EndsAtUtc,@Cutoff,@Snapshot);
        SET @RevisionId=SCOPE_IDENTITY();
        UPDATE institution.Initiative SET Title=@Title,Mode=@Mode,Capacity=@Capacity,TimeZoneId=@TimeZoneId,
            StartsAtUtc=@StartsAtUtc,EndsAtUtc=@EndsAtUtc,WithdrawalCutoffAtUtc=@Cutoff,
            Status=N'Published',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@InitiativeId;
        UPDATE institution.InitiativeDraft SET Status=N'Published',PublishedRevisionId=@RevisionId,
            UpdatedByPersonId=@ActorPersonId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@DraftId;
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
            VALUES(@ActorPersonId,N'Initiative',@PublicId,N'Published',N'Draft',N'Published',SYSUTCDATETIME(),NEWID());
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.SubmitApplication
        @InitiativeId bigint,@PersonId bigint,@ApplicationId bigint OUTPUT
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRAN;
        DECLARE @Status nvarchar(24),@TermsRevisionId bigint,@AttemptNo int;
        SELECT @Status=Status FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        IF @Status<>N'Published' OR @Status IS NULL THROW 51201, 'Initiative is not open', 1;
        IF NOT EXISTS (SELECT 1 FROM iam.Person WHERE Id=@PersonId AND Status=N'Active')
            THROW 51202, 'Applicant is not active', 1;
        IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId)
            THROW 51203, 'Rejoining this initiative is not approved', 1;
        IF EXISTS (SELECT 1 FROM institution.InitiativeApplication WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId AND Status=N'Blocked')
            THROW 51204, 'Applicant is blocked', 1;
        IF EXISTS (SELECT 1 FROM institution.InitiativeApplication WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId AND Status IN (N'Pending',N'Queued',N'Offered',N'Accepted'))
            THROW 51205, 'Open or accepted application already exists', 1;
        SELECT @TermsRevisionId=Id FROM institution.InitiativeRevision WHERE InitiativeId=@InitiativeId
            AND RevisionNo=(SELECT MAX(RevisionNo) FROM institution.InitiativeRevision WHERE InitiativeId=@InitiativeId);
        SELECT @AttemptNo=COALESCE(MAX(AttemptNo),0)+1 FROM institution.InitiativeApplication
            WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId;
        INSERT institution.InitiativeApplication(InitiativeId,PersonId,TermsRevisionId,Status,AttemptNo,SubmittedAtUtc)
            VALUES(@InitiativeId,@PersonId,@TermsRevisionId,N'Pending',@AttemptNo,SYSUTCDATETIME());
        SET @ApplicationId=SCOPE_IDENTITY();
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.WithdrawApplication
        @ApplicationId bigint,@ActorPersonId bigint
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@TermsRevisionId bigint,@PublicId uniqueidentifier;
        SELECT @InitiativeId=InitiativeId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        IF @InitiativeId IS NULL THROW 51206, 'Application not found', 1;
        SELECT Id FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        SELECT @TermsRevisionId=TermsRevisionId,@PublicId=PublicId FROM institution.InitiativeApplication
           WHERE Id=@ApplicationId AND PersonId=@ActorPersonId AND Status IN (N'Pending',N'Queued',N'Offered');
        IF @TermsRevisionId IS NULL THROW 51207, 'Only the pending applicant may withdraw', 1;
        UPDATE institution.InitiativeApplication SET Status=N'Withdrawn',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
        INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
            SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,N'Withdrawn',@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
            FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
            VALUES(@ActorPersonId,N'Application',@PublicId,N'Withdrawn',N'Withdrawn',SYSUTCDATETIME(),NEWID());
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.RejectApplication
        @ApplicationId bigint,@ActorPersonId bigint,@Block bit=0
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@InstitutionId bigint,@TermsRevisionId bigint,@PublicId uniqueidentifier,@NewStatus nvarchar(24);
        SELECT @InitiativeId=InitiativeId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        SELECT @InstitutionId=InstitutionId FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        IF @InstitutionId IS NULL THROW 51206, 'Application not found', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
            THROW 51102, 'Representative grant is not active', 1;
        SELECT @TermsRevisionId=TermsRevisionId,@PublicId=PublicId FROM institution.InitiativeApplication
            WHERE Id=@ApplicationId AND Status IN (N'Pending',N'Queued',N'Offered');
        IF @TermsRevisionId IS NULL THROW 51208, 'Application is not pending', 1;
        SET @NewStatus=CASE WHEN @Block=1 THEN N'Blocked' ELSE N'Rejected' END;
        UPDATE institution.InitiativeApplication SET Status=@NewStatus,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
        INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
            SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,@NewStatus,@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
            FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
            VALUES(@ActorPersonId,N'Application',@PublicId,@NewStatus,@NewStatus,SYSUTCDATETIME(),NEWID());
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.ApproveApplication
        @ApplicationId bigint,@ActorPersonId bigint,@MembershipId bigint OUTPUT
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@PersonId bigint,@InstitutionId bigint,@Capacity smallint,
            @Status nvarchar(24),@TermsRevisionId bigint,@Cutoff datetime2(3),@ApplicationPublicId uniqueidentifier;
        SELECT @InitiativeId=InitiativeId,@PersonId=PersonId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        IF @InitiativeId IS NULL THROW 51206, 'Application not found', 1;
        SELECT @InstitutionId=InstitutionId,@Capacity=Capacity,@Status=Status
            FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        IF @Status<>N'Published' THROW 51201, 'Initiative is not open', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
           AND NOT EXISTS (SELECT 1 FROM institution.InitiativeStaffAppointment WHERE InitiativeId=@InitiativeId AND PersonId=@ActorPersonId AND Role=N'Supervisor' AND Status=N'Active')
            THROW 51209, 'Actor has no current admission authority', 1;
        SELECT @Status=Status,@TermsRevisionId=TermsRevisionId,@ApplicationPublicId=PublicId
            FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        IF @Status=N'Accepted'
        BEGIN
            SELECT @MembershipId=Id FROM institution.InitiativeMembership WHERE ApplicationId=@ApplicationId;
            IF @MembershipId IS NULL THROW 51210, 'Accepted application has no membership', 1;
            COMMIT; RETURN;
        END;
        IF @Status NOT IN (N'Pending',N'Queued',N'Offered') THROW 51208, 'Application is not pending', 1;
        IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId)
            THROW 51203, 'Rejoining this initiative is not approved', 1;
        IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE PersonId=@PersonId AND Status IN (N'Accepted',N'Suspended'))
            THROW 51211, 'Person already has an active initiative membership', 1;
        IF (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND CapacityReleasedAtUtc IS NULL)>=@Capacity
            THROW 51212, 'Initiative capacity is full', 1;
        SELECT @Cutoff=WithdrawalCutoffAtUtc FROM institution.InitiativeRevision WHERE Id=@TermsRevisionId AND InitiativeId=@InitiativeId;
        INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc)
            VALUES(@InitiativeId,@ApplicationId,@PersonId,N'Accepted',SYSUTCDATETIME(),@Cutoff);
        SET @MembershipId=SCOPE_IDENTITY();
        UPDATE institution.InitiativeApplication SET Status=N'Accepted',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
        INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
            SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,N'Approved',@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
            FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
            VALUES(@ActorPersonId,N'Application',@ApplicationPublicId,N'Approved',N'Accepted',SYSUTCDATETIME(),NEWID());
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.EndMembership
        @MembershipId bigint,@ActorPersonId bigint,@NewStatus nvarchar(24)
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        IF @NewStatus NOT IN (N'Withdrawn',N'Removed',N'Completed') THROW 51301, 'Invalid end status', 1;
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@InstitutionId bigint,@PersonId bigint,@Status nvarchar(24),
            @Cutoff datetime2(3),@PublicId uniqueidentifier,@Now datetime2(3)=SYSUTCDATETIME();
        SELECT @InitiativeId=InitiativeId FROM institution.InitiativeMembership WHERE Id=@MembershipId;
        SELECT @InstitutionId=InstitutionId FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        SELECT @PersonId=PersonId,@Status=Status,@Cutoff=WithdrawalCutoffAtUtc,@PublicId=PublicId
            FROM institution.InitiativeMembership WHERE Id=@MembershipId;
        IF @PersonId IS NULL THROW 51302, 'Membership not found', 1;
        IF @NewStatus=N'Withdrawn'
        BEGIN
            IF @Status<>N'Accepted' OR @ActorPersonId<>@PersonId OR institution.CanWithdraw(@Now,@Cutoff)<>1
                THROW 51303, 'Voluntary withdrawal is unavailable at or after the pinned cutoff', 1;
        END
        ELSE
        BEGIN
            IF @Status NOT IN (N'Accepted',N'Suspended') THROW 51304, 'Membership is not active', 1;
            IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
                THROW 51102, 'Representative grant is not active', 1;
        END;
        UPDATE institution.InitiativeMembership SET Status=@NewStatus,EndedAtUtc=@Now,CapacityReleasedAtUtc=@Now,UpdatedAtUtc=@Now
            WHERE Id=@MembershipId;
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
            VALUES(@ActorPersonId,N'Membership',@PublicId,@NewStatus,@Status,@NewStatus,@Now,NEWID());
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.SetMembershipSuspension
        @MembershipId bigint,@ActorPersonId bigint,@Suspend bit
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@InstitutionId bigint,@Status nvarchar(24);
        SELECT @InitiativeId=InitiativeId FROM institution.InitiativeMembership WHERE Id=@MembershipId;
        SELECT @InstitutionId=InstitutionId FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
            THROW 51102, 'Representative grant is not active', 1;
        SELECT @Status=Status FROM institution.InitiativeMembership WHERE Id=@MembershipId;
        IF (@Suspend=1 AND @Status<>N'Accepted') OR (@Suspend=0 AND @Status<>N'Suspended')
            THROW 51304, 'Membership transition is invalid', 1;
        UPDATE institution.InitiativeMembership SET Status=CASE WHEN @Suspend=1 THEN N'Suspended' ELSE N'Accepted' END,
            UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@MembershipId;
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.AcceptStaffInvitation
        @InvitationId bigint,@PersonId bigint,@AppointmentId bigint OUTPUT
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@Role nvarchar(16),@Email nvarchar(320),@Status nvarchar(24),@ExpiresAtUtc datetime2(3);
        SELECT @InitiativeId=InitiativeId FROM institution.InitiativeStaffInvitation WHERE Id=@InvitationId;
        IF @InitiativeId IS NULL THROW 51401, 'Invitation not found', 1;
        SELECT Id FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        SELECT @Role=Role,@Email=NormalizedEmail,@Status=Status,@ExpiresAtUtc=ExpiresAtUtc
            FROM institution.InitiativeStaffInvitation WHERE Id=@InvitationId;
        IF @Status<>N'Pending' OR @ExpiresAtUtc<=SYSUTCDATETIME() THROW 51402, 'Invitation unavailable', 1;
        IF NOT EXISTS (SELECT 1 FROM iam.PersonEmail WHERE PersonId=@PersonId AND NormalizedEmail=@Email AND Status=N'Verified')
            THROW 51033, 'Verified email does not match invitation', 1;
        IF @Role=N'Supervisor' AND (SELECT COUNT_BIG(*) FROM institution.InitiativeStaffAppointment
            WHERE InitiativeId=@InitiativeId AND Role=N'Supervisor' AND Status=N'Active')>=3
            THROW 51034, 'Three active supervisors already assigned', 1;
        INSERT institution.InitiativeStaffAppointment(InitiativeId,PersonId,InvitationId,Role,Status,AcceptedAtUtc)
            VALUES(@InitiativeId,@PersonId,@InvitationId,@Role,N'Active',SYSUTCDATETIME());
        SET @AppointmentId=SCOPE_IDENTITY();
        UPDATE institution.InitiativeStaffInvitation SET Status=N'Accepted',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@InvitationId;
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.RevokeStaffAppointment
        @AppointmentId bigint,@ActorPersonId bigint
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRAN;
        DECLARE @InstitutionId bigint;
        SELECT @InstitutionId=i.InstitutionId FROM institution.InitiativeStaffAppointment a
           JOIN institution.Initiative i WITH (UPDLOCK,HOLDLOCK) ON i.Id=a.InitiativeId WHERE a.Id=@AppointmentId;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
            THROW 51102, 'Representative grant is not active', 1;
        UPDATE institution.InitiativeStaffAppointment SET Status=N'Revoked',RevokedAtUtc=SYSUTCDATETIME(),UpdatedAtUtc=SYSUTCDATETIME()
           WHERE Id=@AppointmentId AND Status=N'Active';
        IF @@ROWCOUNT<>1 THROW 51403, 'Active appointment not found', 1;
        COMMIT;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    CREATE OR ALTER PROCEDURE files.ReadSecureFileMetadata
        @FileId bigint,@ActorPersonId bigint
    AS
    BEGIN
        SET NOCOUNT ON;
        IF NOT EXISTS (SELECT 1 FROM files.SecureFile f WHERE f.Id=@FileId AND f.OwnerPersonId=@ActorPersonId)
           AND NOT EXISTS (SELECT 1 FROM iam.GlobalGrant g WHERE g.PersonId=@ActorPersonId
               AND g.Capability=N'InstitutionVerificationReviewer' AND g.RevokedAtUtc IS NULL)
           THROW 51501, 'Secure file access denied', 1;
        SELECT Id,Purpose,MimeType,Bytes,Status FROM files.SecureFile WHERE Id=@FileId;
    END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    DENY INSERT,UPDATE,DELETE ON OBJECT::institution.Initiative TO deepsprout_runtime;
    DENY INSERT,UPDATE,DELETE ON OBJECT::institution.InitiativeDraft TO deepsprout_runtime;
    DENY INSERT,UPDATE,DELETE ON OBJECT::institution.InitiativeRevision TO deepsprout_runtime;
    DENY INSERT,UPDATE,DELETE ON OBJECT::institution.InitiativeApplication TO deepsprout_runtime;
    DENY INSERT,UPDATE,DELETE ON OBJECT::institution.InitiativeApplicationDecision TO deepsprout_runtime;
    DENY INSERT,UPDATE,DELETE ON OBJECT::institution.InitiativeMembership TO deepsprout_runtime;
    DENY INSERT,UPDATE,DELETE ON OBJECT::institution.InitiativeStaffAppointment TO deepsprout_runtime;
    DENY INSERT,UPDATE,DELETE ON OBJECT::ops.AuditEvent TO deepsprout_runtime;
    GRANT EXECUTE ON SCHEMA::institution TO deepsprout_runtime;
    GRANT EXECUTE ON OBJECT::files.ReadSecureFileMetadata TO deepsprout_runtime;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101044926_InitialM1', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101045359_RescheduleInvariant'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'M1 migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101045359_RescheduleInvariant'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.RescheduleInitiative
        @InitiativeId bigint,@ActorPersonId bigint,@NewStartsAtUtc datetime2(3),
        @NewEndsAtUtc datetime2(3),@RevisionId bigint OUTPUT
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        IF @NewStartsAtUtc IS NULL OR @NewEndsAtUtc<=@NewStartsAtUtc
            THROW 51601, 'Invalid rescheduled interval', 1;
        BEGIN TRAN;
        DECLARE @InstitutionId bigint,@Status nvarchar(24),@PublicId uniqueidentifier,
            @PreviousRevisionId bigint,@RevisionNo int,@Cutoff datetime2(3);
        SELECT @InstitutionId=InstitutionId,@Status=Status,@PublicId=PublicId
            FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        IF @Status<>N'Published' OR @Status IS NULL THROW 51602, 'Initiative is not published', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId
            AND PersonId=@ActorPersonId AND Status=N'Active')
            THROW 51102, 'Representative grant is not active', 1;
        SELECT TOP (1) @PreviousRevisionId=Id,@RevisionNo=RevisionNo+1
            FROM institution.InitiativeRevision WHERE InitiativeId=@InitiativeId ORDER BY RevisionNo DESC;
        SET @Cutoff=DATEADD(hour,-120,@NewStartsAtUtc);
        INSERT institution.InitiativeRevision(InitiativeId,RevisionNo,Summary,AudienceCode,CoverageCode,
            CostKind,Price,Currency,CompletionPolicyRef,Title,Mode,Capacity,TimeZoneId,
            StartsAtUtc,EndsAtUtc,WithdrawalCutoffAtUtc,PublishedSnapshotJson)
        SELECT InitiativeId,@RevisionNo,Summary,AudienceCode,CoverageCode,CostKind,Price,Currency,
            CompletionPolicyRef,Title,Mode,Capacity,TimeZoneId,@NewStartsAtUtc,@NewEndsAtUtc,@Cutoff,
            JSON_MODIFY(PublishedSnapshotJson,'$.rescheduledFromRevisionId',@PreviousRevisionId)
        FROM institution.InitiativeRevision WHERE Id=@PreviousRevisionId;
        SET @RevisionId=SCOPE_IDENTITY();
        UPDATE institution.Initiative SET StartsAtUtc=@NewStartsAtUtc,EndsAtUtc=@NewEndsAtUtc,
            WithdrawalCutoffAtUtc=@Cutoff,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@InitiativeId;
        /* Existing membership/application cutoffs and terms IDs remain pinned to their old revision. */
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AtUtc,CorrelationId)
            VALUES(@ActorPersonId,N'Initiative',@PublicId,N'Rescheduled',SYSUTCDATETIME(),NEWID());
        COMMIT;
    END;

END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101045359_RescheduleInvariant'
)
BEGIN
    GRANT EXECUTE ON OBJECT::institution.RescheduleInitiative TO deepsprout_runtime;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101045359_RescheduleInvariant'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101045359_RescheduleInvariant', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101050156_AdmissionDenialAudit'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'M1 migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101050156_AdmissionDenialAudit'
)
BEGIN
    CREATE OR ALTER PROCEDURE institution.ApproveApplication
        @ApplicationId bigint,@ActorPersonId bigint,@MembershipId bigint OUTPUT
    AS
    BEGIN
        SET NOCOUNT ON; SET XACT_ABORT ON;
        BEGIN TRY
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@PersonId bigint,@InstitutionId bigint,@Capacity smallint,
            @Status nvarchar(24),@TermsRevisionId bigint,@Cutoff datetime2(3),@ApplicationPublicId uniqueidentifier;
        SELECT @InitiativeId=InitiativeId,@PersonId=PersonId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        IF @InitiativeId IS NULL THROW 51206, 'Application not found', 1;
        SELECT @InstitutionId=InstitutionId,@Capacity=Capacity,@Status=Status
            FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        IF @Status<>N'Published' THROW 51201, 'Initiative is not open', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
           AND NOT EXISTS (SELECT 1 FROM institution.InitiativeStaffAppointment WHERE InitiativeId=@InitiativeId AND PersonId=@ActorPersonId AND Role=N'Supervisor' AND Status=N'Active')
            THROW 51209, 'Actor has no current admission authority', 1;
        SELECT @Status=Status,@TermsRevisionId=TermsRevisionId,@ApplicationPublicId=PublicId
            FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        IF @Status=N'Accepted'
        BEGIN
            SELECT @MembershipId=Id FROM institution.InitiativeMembership WHERE ApplicationId=@ApplicationId;
            IF @MembershipId IS NULL THROW 51210, 'Accepted application has no membership', 1;
            COMMIT; RETURN;
        END;
        IF @Status NOT IN (N'Pending',N'Queued',N'Offered') THROW 51208, 'Application is not pending', 1;
        IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId)
            THROW 51203, 'Rejoining this initiative is not approved', 1;
        IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE PersonId=@PersonId AND Status IN (N'Accepted',N'Suspended'))
            THROW 51211, 'Person already has an active initiative membership', 1;
        IF (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND CapacityReleasedAtUtc IS NULL)>=@Capacity
            THROW 51212, 'Initiative capacity is full', 1;
        SELECT @Cutoff=WithdrawalCutoffAtUtc FROM institution.InitiativeRevision WHERE Id=@TermsRevisionId AND InitiativeId=@InitiativeId;
        INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc)
            VALUES(@InitiativeId,@ApplicationId,@PersonId,N'Accepted',SYSUTCDATETIME(),@Cutoff);
        SET @MembershipId=SCOPE_IDENTITY();
        UPDATE institution.InitiativeApplication SET Status=N'Accepted',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
        INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
            SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,N'Approved',@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
            FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
            VALUES(@ActorPersonId,N'Application',@ApplicationPublicId,N'Approved',N'Accepted',SYSUTCDATETIME(),NEWID());
        COMMIT;
        END TRY
        BEGIN CATCH
            DECLARE @DeniedError int=ERROR_NUMBER();
            IF XACT_STATE()<>0 ROLLBACK;
            IF @DeniedError=51209
                INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,Reason,AtUtc,CorrelationId)
                    SELECT @ActorPersonId,N'Application',PublicId,N'AdmissionDenied',N'No current admission authority',SYSUTCDATETIME(),NEWID()
                    FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
            THROW;
        END CATCH;
    END;

END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101050156_AdmissionDenialAudit'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101050156_AdmissionDenialAudit', N'10.0.0');
END;

COMMIT;
GO

