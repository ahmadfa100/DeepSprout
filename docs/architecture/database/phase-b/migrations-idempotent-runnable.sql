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
    EXEC(N'CREATE OR ALTER FUNCTION institution.CanWithdraw(@NowUtc datetime2(3), @CutoffUtc datetime2(3))
RETURNS bit
AS
BEGIN
    RETURN CASE WHEN @NowUtc < @CutoffUtc THEN 1 ELSE 0 END;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER institution.TR_Initiative_PublishedRevision
ON institution.Initiative AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted i WHERE i.Status=N''Published''
        AND NOT EXISTS (SELECT 1 FROM institution.InitiativeRevision r WHERE r.InitiativeId=i.Id)
    ) THROW 51040, ''Published initiative requires a matching revision'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER institution.TR_InitiativeRevision_Immutable
ON institution.InitiativeRevision AFTER UPDATE, DELETE
AS
BEGIN
    THROW 51041, ''Published initiative revisions are immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER institution.TR_InitiativeApplicationDecision_Immutable
ON institution.InitiativeApplicationDecision AFTER UPDATE, DELETE
AS
BEGIN
    THROW 51042, ''Application decisions are append-only'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER ops.TR_AuditEvent_Immutable
ON ops.AuditEvent AFTER UPDATE, DELETE
AS
BEGIN
    THROW 51043, ''Audit events are append-only'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.CreateDraft
    @InstitutionId bigint, @ActorPersonId bigint,
    @InitiativeId bigint OUTPUT, @DraftId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM institution.Institution WHERE Id=@InstitutionId AND Status=N''Verified'')
        THROW 51101, ''Institution is not verified'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
        THROW 51102, ''Representative grant is not active'', 1;
    INSERT institution.Initiative(InstitutionId,Status) VALUES(@InstitutionId,N''Draft'');
    SET @InitiativeId=SCOPE_IDENTITY();
    INSERT institution.InitiativeDraft(InitiativeId,LastSavedStage,Status,UpdatedByPersonId)
        VALUES(@InitiativeId,1,N''Draft'',@ActorPersonId);
    SET @DraftId=SCOPE_IDENTITY();
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
        SELECT @ActorPersonId,N''Initiative'',PublicId,N''DraftCreated'',N''Draft'',SYSUTCDATETIME(),NEWID()
        FROM institution.Initiative WHERE Id=@InitiativeId;
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.SaveDraftStage
    @DraftId bigint, @ActorPersonId bigint, @ExpectedRowVersion binary(8),
    @Stage tinyint, @StageJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @Stage NOT BETWEEN 1 AND 6 OR @StageJson IS NULL OR ISJSON(@StageJson)<>1
        THROW 51103, ''Stage number or JSON invalid'', 1;
    BEGIN TRAN;
    DECLARE @InstitutionId bigint, @InitiativeId bigint;
    SELECT @InitiativeId=d.InitiativeId,@InstitutionId=i.InstitutionId
    FROM institution.InitiativeDraft d JOIN institution.Initiative i ON i.Id=d.InitiativeId
    WHERE d.Id=@DraftId AND d.Status=N''Draft'';
    IF @InitiativeId IS NULL THROW 51104, ''Active draft not found'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
        THROW 51102, ''Representative grant is not active'', 1;
    UPDATE institution.InitiativeDraft SET
        Stage1Json=CASE WHEN @Stage=1 THEN @StageJson ELSE Stage1Json END,
        Stage2Json=CASE WHEN @Stage=2 THEN @StageJson ELSE Stage2Json END,
        Stage3Json=CASE WHEN @Stage=3 THEN @StageJson ELSE Stage3Json END,
        Stage4Json=CASE WHEN @Stage=4 THEN @StageJson ELSE Stage4Json END,
        Stage5Json=CASE WHEN @Stage=5 THEN @StageJson ELSE Stage5Json END,
        Stage6Json=CASE WHEN @Stage=6 THEN @StageJson ELSE Stage6Json END,
        LastSavedStage=CASE WHEN @Stage>LastSavedStage THEN @Stage ELSE LastSavedStage END,
        UpdatedAtUtc=SYSUTCDATETIME(),UpdatedByPersonId=@ActorPersonId
    WHERE Id=@DraftId AND Status=N''Draft'' AND RowVersion=@ExpectedRowVersion;
    IF @@ROWCOUNT<>1 THROW 51105, ''Draft rowversion conflict'', 1;
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.PublishDraft
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
    WHERE d.Id=@DraftId AND d.Status=N''Draft'' AND i.Status=N''Draft'';
    IF @InitiativeId IS NULL THROW 51106, ''Publishable draft not found'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.Institution WHERE Id=@InstitutionId AND Status=N''Verified'')
        THROW 51101, ''Institution is not verified'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
        THROW 51102, ''Representative grant is not active'', 1;
    IF @Title IS NULL OR TRIM(@Title)=N'''' OR @Mode IS NULL OR @Capacity NOT BETWEEN 1 AND 135
       OR @TimeZoneId IS NULL OR @StartsAtUtc IS NULL OR @EndsAtUtc<=@StartsAtUtc
       OR @Summary IS NULL OR @AudienceCode IS NULL OR @CompletionPolicyRef IS NULL
        THROW 51107, ''Required publication terms are incomplete'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeDraft WHERE Id=@DraftId
       AND (Stage1Json IS NULL OR Stage2Json IS NULL OR Stage3Json IS NULL
            OR Stage4Json IS NULL OR Stage5Json IS NULL OR Stage6Json IS NULL))
        THROW 51107, ''Six builder stages are incomplete'', 1;
    SELECT @Snapshot=(SELECT JSON_QUERY(Stage1Json) AS stage1,JSON_QUERY(Stage2Json) AS stage2,
       JSON_QUERY(Stage3Json) AS stage3,JSON_QUERY(Stage4Json) AS stage4,
       JSON_QUERY(Stage5Json) AS stage5,JSON_QUERY(Stage6Json) AS stage6
       FROM institution.InitiativeDraft WHERE Id=@DraftId FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
    SET @Cutoff=DATEADD(hour,-120,@StartsAtUtc);
    SELECT @RevisionNo=COALESCE(MAX(RevisionNo),0)+1 FROM institution.InitiativeRevision WHERE InitiativeId=@InitiativeId;
    INSERT institution.InitiativeRevision(InitiativeId,RevisionNo,Summary,AudienceCode,CostKind,
        CompletionPolicyRef,Title,Mode,Capacity,TimeZoneId,StartsAtUtc,EndsAtUtc,
        WithdrawalCutoffAtUtc,PublishedSnapshotJson)
    VALUES(@InitiativeId,@RevisionNo,@Summary,@AudienceCode,N''Free'',@CompletionPolicyRef,
        @Title,@Mode,@Capacity,@TimeZoneId,@StartsAtUtc,@EndsAtUtc,@Cutoff,@Snapshot);
    SET @RevisionId=SCOPE_IDENTITY();
    UPDATE institution.Initiative SET Title=@Title,Mode=@Mode,Capacity=@Capacity,TimeZoneId=@TimeZoneId,
        StartsAtUtc=@StartsAtUtc,EndsAtUtc=@EndsAtUtc,WithdrawalCutoffAtUtc=@Cutoff,
        Status=N''Published'',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@InitiativeId;
    UPDATE institution.InitiativeDraft SET Status=N''Published'',PublishedRevisionId=@RevisionId,
        UpdatedByPersonId=@ActorPersonId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@DraftId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Initiative'',@PublicId,N''Published'',N''Draft'',N''Published'',SYSUTCDATETIME(),NEWID());
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.SubmitApplication
    @InitiativeId bigint,@PersonId bigint,@ApplicationId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRAN;
    DECLARE @Status nvarchar(24),@TermsRevisionId bigint,@AttemptNo int;
    SELECT @Status=Status FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @Status<>N''Published'' OR @Status IS NULL THROW 51201, ''Initiative is not open'', 1;
    IF NOT EXISTS (SELECT 1 FROM iam.Person WHERE Id=@PersonId AND Status=N''Active'')
        THROW 51202, ''Applicant is not active'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId)
        THROW 51203, ''Rejoining this initiative is not approved'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeApplication WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId AND Status=N''Blocked'')
        THROW 51204, ''Applicant is blocked'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeApplication WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId AND Status IN (N''Pending'',N''Queued'',N''Offered'',N''Accepted''))
        THROW 51205, ''Open or accepted application already exists'', 1;
    SELECT @TermsRevisionId=Id FROM institution.InitiativeRevision WHERE InitiativeId=@InitiativeId
        AND RevisionNo=(SELECT MAX(RevisionNo) FROM institution.InitiativeRevision WHERE InitiativeId=@InitiativeId);
    SELECT @AttemptNo=COALESCE(MAX(AttemptNo),0)+1 FROM institution.InitiativeApplication
        WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId;
    INSERT institution.InitiativeApplication(InitiativeId,PersonId,TermsRevisionId,Status,AttemptNo,SubmittedAtUtc)
        VALUES(@InitiativeId,@PersonId,@TermsRevisionId,N''Pending'',@AttemptNo,SYSUTCDATETIME());
    SET @ApplicationId=SCOPE_IDENTITY();
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.WithdrawApplication
    @ApplicationId bigint,@ActorPersonId bigint
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@TermsRevisionId bigint,@PublicId uniqueidentifier;
    SELECT @InitiativeId=InitiativeId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    IF @InitiativeId IS NULL THROW 51206, ''Application not found'', 1;
    SELECT Id FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    SELECT @TermsRevisionId=TermsRevisionId,@PublicId=PublicId FROM institution.InitiativeApplication
       WHERE Id=@ApplicationId AND PersonId=@ActorPersonId AND Status IN (N''Pending'',N''Queued'',N''Offered'');
    IF @TermsRevisionId IS NULL THROW 51207, ''Only the pending applicant may withdraw'', 1;
    UPDATE institution.InitiativeApplication SET Status=N''Withdrawn'',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
    INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
        SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,N''Withdrawn'',@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
        FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Application'',@PublicId,N''Withdrawn'',N''Withdrawn'',SYSUTCDATETIME(),NEWID());
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.RejectApplication
    @ApplicationId bigint,@ActorPersonId bigint,@Block bit=0
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@InstitutionId bigint,@TermsRevisionId bigint,@PublicId uniqueidentifier,@NewStatus nvarchar(24);
    SELECT @InitiativeId=InitiativeId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    SELECT @InstitutionId=InstitutionId FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @InstitutionId IS NULL THROW 51206, ''Application not found'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
        THROW 51102, ''Representative grant is not active'', 1;
    SELECT @TermsRevisionId=TermsRevisionId,@PublicId=PublicId FROM institution.InitiativeApplication
        WHERE Id=@ApplicationId AND Status IN (N''Pending'',N''Queued'',N''Offered'');
    IF @TermsRevisionId IS NULL THROW 51208, ''Application is not pending'', 1;
    SET @NewStatus=CASE WHEN @Block=1 THEN N''Blocked'' ELSE N''Rejected'' END;
    UPDATE institution.InitiativeApplication SET Status=@NewStatus,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
    INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
        SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,@NewStatus,@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
        FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Application'',@PublicId,@NewStatus,@NewStatus,SYSUTCDATETIME(),NEWID());
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.ApproveApplication
    @ApplicationId bigint,@ActorPersonId bigint,@MembershipId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@PersonId bigint,@InstitutionId bigint,@Capacity smallint,
        @Status nvarchar(24),@TermsRevisionId bigint,@Cutoff datetime2(3),@ApplicationPublicId uniqueidentifier;
    SELECT @InitiativeId=InitiativeId,@PersonId=PersonId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    IF @InitiativeId IS NULL THROW 51206, ''Application not found'', 1;
    SELECT @InstitutionId=InstitutionId,@Capacity=Capacity,@Status=Status
        FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @Status<>N''Published'' THROW 51201, ''Initiative is not open'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
       AND NOT EXISTS (SELECT 1 FROM institution.InitiativeStaffAppointment WHERE InitiativeId=@InitiativeId AND PersonId=@ActorPersonId AND Role=N''Supervisor'' AND Status=N''Active'')
        THROW 51209, ''Actor has no current admission authority'', 1;
    SELECT @Status=Status,@TermsRevisionId=TermsRevisionId,@ApplicationPublicId=PublicId
        FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    IF @Status=N''Accepted''
    BEGIN
        SELECT @MembershipId=Id FROM institution.InitiativeMembership WHERE ApplicationId=@ApplicationId;
        IF @MembershipId IS NULL THROW 51210, ''Accepted application has no membership'', 1;
        COMMIT; RETURN;
    END;
    IF @Status NOT IN (N''Pending'',N''Queued'',N''Offered'') THROW 51208, ''Application is not pending'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId)
        THROW 51203, ''Rejoining this initiative is not approved'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE PersonId=@PersonId AND Status IN (N''Accepted'',N''Suspended''))
        THROW 51211, ''Person already has an active initiative membership'', 1;
    IF (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND CapacityReleasedAtUtc IS NULL)>=@Capacity
        THROW 51212, ''Initiative capacity is full'', 1;
    SELECT @Cutoff=WithdrawalCutoffAtUtc FROM institution.InitiativeRevision WHERE Id=@TermsRevisionId AND InitiativeId=@InitiativeId;
    INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc)
        VALUES(@InitiativeId,@ApplicationId,@PersonId,N''Accepted'',SYSUTCDATETIME(),@Cutoff);
    SET @MembershipId=SCOPE_IDENTITY();
    UPDATE institution.InitiativeApplication SET Status=N''Accepted'',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
    INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
        SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,N''Approved'',@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
        FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Application'',@ApplicationPublicId,N''Approved'',N''Accepted'',SYSUTCDATETIME(),NEWID());
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.EndMembership
    @MembershipId bigint,@ActorPersonId bigint,@NewStatus nvarchar(24)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @NewStatus NOT IN (N''Withdrawn'',N''Removed'',N''Completed'') THROW 51301, ''Invalid end status'', 1;
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@InstitutionId bigint,@PersonId bigint,@Status nvarchar(24),
        @Cutoff datetime2(3),@PublicId uniqueidentifier,@Now datetime2(3)=SYSUTCDATETIME();
    SELECT @InitiativeId=InitiativeId FROM institution.InitiativeMembership WHERE Id=@MembershipId;
    SELECT @InstitutionId=InstitutionId FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    SELECT @PersonId=PersonId,@Status=Status,@Cutoff=WithdrawalCutoffAtUtc,@PublicId=PublicId
        FROM institution.InitiativeMembership WHERE Id=@MembershipId;
    IF @PersonId IS NULL THROW 51302, ''Membership not found'', 1;
    IF @NewStatus=N''Withdrawn''
    BEGIN
        IF @Status<>N''Accepted'' OR @ActorPersonId<>@PersonId OR institution.CanWithdraw(@Now,@Cutoff)<>1
            THROW 51303, ''Voluntary withdrawal is unavailable at or after the pinned cutoff'', 1;
    END
    ELSE
    BEGIN
        IF @Status NOT IN (N''Accepted'',N''Suspended'') THROW 51304, ''Membership is not active'', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
            THROW 51102, ''Representative grant is not active'', 1;
    END;
    UPDATE institution.InitiativeMembership SET Status=@NewStatus,EndedAtUtc=@Now,CapacityReleasedAtUtc=@Now,UpdatedAtUtc=@Now
        WHERE Id=@MembershipId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Membership'',@PublicId,@NewStatus,@Status,@NewStatus,@Now,NEWID());
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.SetMembershipSuspension
    @MembershipId bigint,@ActorPersonId bigint,@Suspend bit
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@InstitutionId bigint,@Status nvarchar(24);
    SELECT @InitiativeId=InitiativeId FROM institution.InitiativeMembership WHERE Id=@MembershipId;
    SELECT @InstitutionId=InstitutionId FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
        THROW 51102, ''Representative grant is not active'', 1;
    SELECT @Status=Status FROM institution.InitiativeMembership WHERE Id=@MembershipId;
    IF (@Suspend=1 AND @Status<>N''Accepted'') OR (@Suspend=0 AND @Status<>N''Suspended'')
        THROW 51304, ''Membership transition is invalid'', 1;
    UPDATE institution.InitiativeMembership SET Status=CASE WHEN @Suspend=1 THEN N''Suspended'' ELSE N''Accepted'' END,
        UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@MembershipId;
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.AcceptStaffInvitation
    @InvitationId bigint,@PersonId bigint,@AppointmentId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@Role nvarchar(16),@Email nvarchar(320),@Status nvarchar(24),@ExpiresAtUtc datetime2(3);
    SELECT @InitiativeId=InitiativeId FROM institution.InitiativeStaffInvitation WHERE Id=@InvitationId;
    IF @InitiativeId IS NULL THROW 51401, ''Invitation not found'', 1;
    SELECT Id FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    SELECT @Role=Role,@Email=NormalizedEmail,@Status=Status,@ExpiresAtUtc=ExpiresAtUtc
        FROM institution.InitiativeStaffInvitation WHERE Id=@InvitationId;
    IF @Status<>N''Pending'' OR @ExpiresAtUtc<=SYSUTCDATETIME() THROW 51402, ''Invitation unavailable'', 1;
    IF NOT EXISTS (SELECT 1 FROM iam.PersonEmail WHERE PersonId=@PersonId AND NormalizedEmail=@Email AND Status=N''Verified'')
        THROW 51033, ''Verified email does not match invitation'', 1;
    IF @Role=N''Supervisor'' AND (SELECT COUNT_BIG(*) FROM institution.InitiativeStaffAppointment
        WHERE InitiativeId=@InitiativeId AND Role=N''Supervisor'' AND Status=N''Active'')>=3
        THROW 51034, ''Three active supervisors already assigned'', 1;
    INSERT institution.InitiativeStaffAppointment(InitiativeId,PersonId,InvitationId,Role,Status,AcceptedAtUtc)
        VALUES(@InitiativeId,@PersonId,@InvitationId,@Role,N''Active'',SYSUTCDATETIME());
    SET @AppointmentId=SCOPE_IDENTITY();
    UPDATE institution.InitiativeStaffInvitation SET Status=N''Accepted'',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@InvitationId;
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.RevokeStaffAppointment
    @AppointmentId bigint,@ActorPersonId bigint
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRAN;
    DECLARE @InstitutionId bigint;
    SELECT @InstitutionId=i.InstitutionId FROM institution.InitiativeStaffAppointment a
       JOIN institution.Initiative i WITH (UPDLOCK,HOLDLOCK) ON i.Id=a.InitiativeId WHERE a.Id=@AppointmentId;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
        THROW 51102, ''Representative grant is not active'', 1;
    UPDATE institution.InitiativeStaffAppointment SET Status=N''Revoked'',RevokedAtUtc=SYSUTCDATETIME(),UpdatedAtUtc=SYSUTCDATETIME()
       WHERE Id=@AppointmentId AND Status=N''Active'';
    IF @@ROWCOUNT<>1 THROW 51403, ''Active appointment not found'', 1;
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101044926_InitialM1'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE files.ReadSecureFileMetadata
    @FileId bigint,@ActorPersonId bigint
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM files.SecureFile f WHERE f.Id=@FileId AND f.OwnerPersonId=@ActorPersonId)
       AND NOT EXISTS (SELECT 1 FROM iam.GlobalGrant g WHERE g.PersonId=@ActorPersonId
           AND g.Capability=N''InstitutionVerificationReviewer'' AND g.RevokedAtUtc IS NULL)
       THROW 51501, ''Secure file access denied'', 1;
    SELECT Id,Purpose,MimeType,Bytes,Status FROM files.SecureFile WHERE Id=@FileId;
END;');
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
    EXEC(N'CREATE OR ALTER PROCEDURE institution.RescheduleInitiative
    @InitiativeId bigint,@ActorPersonId bigint,@NewStartsAtUtc datetime2(3),
    @NewEndsAtUtc datetime2(3),@RevisionId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @NewStartsAtUtc IS NULL OR @NewEndsAtUtc<=@NewStartsAtUtc
        THROW 51601, ''Invalid rescheduled interval'', 1;
    BEGIN TRAN;
    DECLARE @InstitutionId bigint,@Status nvarchar(24),@PublicId uniqueidentifier,
        @PreviousRevisionId bigint,@RevisionNo int,@Cutoff datetime2(3);
    SELECT @InstitutionId=InstitutionId,@Status=Status,@PublicId=PublicId
        FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @Status<>N''Published'' OR @Status IS NULL THROW 51602, ''Initiative is not published'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId
        AND PersonId=@ActorPersonId AND Status=N''Active'')
        THROW 51102, ''Representative grant is not active'', 1;
    SELECT TOP (1) @PreviousRevisionId=Id,@RevisionNo=RevisionNo+1
        FROM institution.InitiativeRevision WHERE InitiativeId=@InitiativeId ORDER BY RevisionNo DESC;
    SET @Cutoff=DATEADD(hour,-120,@NewStartsAtUtc);
    INSERT institution.InitiativeRevision(InitiativeId,RevisionNo,Summary,AudienceCode,CoverageCode,
        CostKind,Price,Currency,CompletionPolicyRef,Title,Mode,Capacity,TimeZoneId,
        StartsAtUtc,EndsAtUtc,WithdrawalCutoffAtUtc,PublishedSnapshotJson)
    SELECT InitiativeId,@RevisionNo,Summary,AudienceCode,CoverageCode,CostKind,Price,Currency,
        CompletionPolicyRef,Title,Mode,Capacity,TimeZoneId,@NewStartsAtUtc,@NewEndsAtUtc,@Cutoff,
        JSON_MODIFY(PublishedSnapshotJson,''$.rescheduledFromRevisionId'',@PreviousRevisionId)
    FROM institution.InitiativeRevision WHERE Id=@PreviousRevisionId;
    SET @RevisionId=SCOPE_IDENTITY();
    UPDATE institution.Initiative SET StartsAtUtc=@NewStartsAtUtc,EndsAtUtc=@NewEndsAtUtc,
        WithdrawalCutoffAtUtc=@Cutoff,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@InitiativeId;
    /* Existing membership/application cutoffs and terms IDs remain pinned to their old revision. */
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Initiative'',@PublicId,N''Rescheduled'',SYSUTCDATETIME(),NEWID());
    COMMIT;
END;
');
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
    EXEC(N'CREATE OR ALTER PROCEDURE institution.ApproveApplication
    @ApplicationId bigint,@ActorPersonId bigint,@MembershipId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@PersonId bigint,@InstitutionId bigint,@Capacity smallint,
        @Status nvarchar(24),@TermsRevisionId bigint,@Cutoff datetime2(3),@ApplicationPublicId uniqueidentifier;
    SELECT @InitiativeId=InitiativeId,@PersonId=PersonId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    IF @InitiativeId IS NULL THROW 51206, ''Application not found'', 1;
    SELECT @InstitutionId=InstitutionId,@Capacity=Capacity,@Status=Status
        FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @Status<>N''Published'' THROW 51201, ''Initiative is not open'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
       AND NOT EXISTS (SELECT 1 FROM institution.InitiativeStaffAppointment WHERE InitiativeId=@InitiativeId AND PersonId=@ActorPersonId AND Role=N''Supervisor'' AND Status=N''Active'')
        THROW 51209, ''Actor has no current admission authority'', 1;
    SELECT @Status=Status,@TermsRevisionId=TermsRevisionId,@ApplicationPublicId=PublicId
        FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    IF @Status=N''Accepted''
    BEGIN
        SELECT @MembershipId=Id FROM institution.InitiativeMembership WHERE ApplicationId=@ApplicationId;
        IF @MembershipId IS NULL THROW 51210, ''Accepted application has no membership'', 1;
        COMMIT; RETURN;
    END;
    IF @Status NOT IN (N''Pending'',N''Queued'',N''Offered'') THROW 51208, ''Application is not pending'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId)
        THROW 51203, ''Rejoining this initiative is not approved'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE PersonId=@PersonId AND Status IN (N''Accepted'',N''Suspended''))
        THROW 51211, ''Person already has an active initiative membership'', 1;
    IF (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND CapacityReleasedAtUtc IS NULL)>=@Capacity
        THROW 51212, ''Initiative capacity is full'', 1;
    SELECT @Cutoff=WithdrawalCutoffAtUtc FROM institution.InitiativeRevision WHERE Id=@TermsRevisionId AND InitiativeId=@InitiativeId;
    INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc)
        VALUES(@InitiativeId,@ApplicationId,@PersonId,N''Accepted'',SYSUTCDATETIME(),@Cutoff);
    SET @MembershipId=SCOPE_IDENTITY();
    UPDATE institution.InitiativeApplication SET Status=N''Accepted'',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
    INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
        SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,N''Approved'',@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
        FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Application'',@ApplicationPublicId,N''Approved'',N''Accepted'',SYSUTCDATETIME(),NEWID());
    COMMIT;
    END TRY
    BEGIN CATCH
        DECLARE @DeniedError int=ERROR_NUMBER();
        IF XACT_STATE()<>0 ROLLBACK;
        IF @DeniedError=51209
            INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,Reason,AtUtc,CorrelationId)
                SELECT @ActorPersonId,N''Application'',PublicId,N''AdmissionDenied'',N''No current admission authority'',SYSUTCDATETIME(),NEWID()
                FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        THROW;
    END CATCH;
END;
');
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

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[InitiativeMembership] DROP CONSTRAINT [CK_InitiativeMembership_EndRelease];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[InitiativeMembership] DROP CONSTRAINT [CK_InitiativeMembership_Status];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[InitiativeApplicationDecision] DROP CONSTRAINT [CK_InitiativeApplicationDecision_Action];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[InitiativeApplication] DROP CONSTRAINT [CK_InitiativeApplication_Status];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[InitiativeMembership] ADD [EndReason] nvarchar(40) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[InitiativeApplication] ADD [ClosedAtUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[InitiativeApplication] ADD [ClosedReason] nvarchar(40) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[Initiative] ADD [CancellationReason] nvarchar(800) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[Initiative] ADD [CancelledAtUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[Initiative] ADD [CancelledByPersonId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'ALTER TABLE [institution].[InitiativeMembership] ADD CONSTRAINT [CK_InitiativeMembership_EndRelease] CHECK (([Status] IN (N''Accepted'',N''Suspended'') AND [EndedAtUtc] IS NULL AND [CapacityReleasedAtUtc] IS NULL AND [EndReason] IS NULL) OR ([Status] IN (N''Withdrawn'',N''Removed'',N''Completed'',N''Cancelled'') AND [EndedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc]>=[EndedAtUtc] AND ([Status]<>N''Cancelled'' OR [EndReason]=N''InitiativeCancelled'')))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'ALTER TABLE [institution].[InitiativeMembership] ADD CONSTRAINT [CK_InitiativeMembership_Status] CHECK ([Status] IN (N''Accepted'',N''Suspended'',N''Withdrawn'',N''Removed'',N''Completed'',N''Cancelled''))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'ALTER TABLE [institution].[InitiativeApplicationDecision] ADD CONSTRAINT [CK_InitiativeApplicationDecision_Action] CHECK ([Action] IN (N''Approved'',N''Rejected'',N''Withdrawn'',N''Queued'',N''Offered'',N''Blocked'',N''Cancelled''))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'ALTER TABLE [institution].[InitiativeApplication] ADD CONSTRAINT [CK_InitiativeApplication_Cancelled] CHECK (([Status]=N''Cancelled'' AND [ClosedReason]=N''InitiativeCancelled'' AND [ClosedAtUtc] IS NOT NULL) OR ([Status]<>N''Cancelled'' AND [ClosedReason] IS NULL AND [ClosedAtUtc] IS NULL))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'ALTER TABLE [institution].[InitiativeApplication] ADD CONSTRAINT [CK_InitiativeApplication_Status] CHECK ([Status] IN (N''Pending'',N''Queued'',N''Offered'',N''Accepted'',N''Rejected'',N''Withdrawn'',N''Blocked'',N''Cancelled''))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    CREATE INDEX [IX_Initiative_CancelledByPersonId] ON [institution].[Initiative] ([CancelledByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'ALTER TABLE [institution].[Initiative] ADD CONSTRAINT [CK_Initiative_Cancellation] CHECK (([Status]=N''Cancelled'' AND [CancellationReason] IS NOT NULL AND LEN(TRIM([CancellationReason]))>0 AND [CancelledAtUtc] IS NOT NULL AND [CancelledByPersonId] IS NOT NULL) OR ([Status]<>N''Cancelled'' AND [CancellationReason] IS NULL AND [CancelledAtUtc] IS NULL AND [CancelledByPersonId] IS NULL))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    ALTER TABLE [institution].[Initiative] ADD CONSTRAINT [FK_Initiative_Person_CancelledByPersonId] FOREIGN KEY ([CancelledByPersonId]) REFERENCES [iam].[Person] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE ops.EndMembershipAt
    @MembershipId bigint,@ActorPersonId bigint,@NewStatus nvarchar(24),@NowUtc datetime2(3)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @NewStatus NOT IN (N''Withdrawn'',N''Removed'',N''Completed'') THROW 51301, ''Invalid end status'', 1;
    IF @NowUtc IS NULL THROW 51305, ''Test clock is required'', 1;
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@InstitutionId bigint,@PersonId bigint,@Status nvarchar(24),
        @Cutoff datetime2(3),@PublicId uniqueidentifier;
    SELECT @InitiativeId=InitiativeId FROM institution.InitiativeMembership WHERE Id=@MembershipId;
    SELECT @InstitutionId=InstitutionId FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    SELECT @PersonId=PersonId,@Status=Status,@Cutoff=WithdrawalCutoffAtUtc,@PublicId=PublicId
        FROM institution.InitiativeMembership WHERE Id=@MembershipId;
    IF @PersonId IS NULL THROW 51302, ''Membership not found'', 1;
    IF @NewStatus=N''Withdrawn''
    BEGIN
        IF @Status<>N''Accepted'' OR @ActorPersonId<>@PersonId OR institution.CanWithdraw(@NowUtc,@Cutoff)<>1
            THROW 51303, ''Voluntary withdrawal is unavailable at or after the effective cutoff'', 1;
    END
    ELSE
    BEGIN
        IF @Status NOT IN (N''Accepted'',N''Suspended'') THROW 51304, ''Membership is not active'', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
            THROW 51102, ''Representative grant is not active'', 1;
    END;
    UPDATE institution.InitiativeMembership
       SET Status=@NewStatus,EndReason=CASE @NewStatus WHEN N''Withdrawn'' THEN N''VoluntaryWithdrawal''
           WHEN N''Removed'' THEN N''RepresentativeRemoval'' ELSE N''Completed'' END,
           EndedAtUtc=@NowUtc,CapacityReleasedAtUtc=@NowUtc,UpdatedAtUtc=SYSUTCDATETIME()
     WHERE Id=@MembershipId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Membership'',@PublicId,@NewStatus,@Status,@NewStatus,SYSUTCDATETIME(),NEWID());
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.EndMembership
    @MembershipId bigint,@ActorPersonId bigint,@NewStatus nvarchar(24)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Now datetime2(3)=SYSUTCDATETIME();
    EXEC ops.EndMembershipAt @MembershipId,@ActorPersonId,@NewStatus,@NowUtc=@Now;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.CancelInitiative
    @InitiativeId bigint,@ActorPersonId bigint,@Reason nvarchar(800)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @Reason IS NULL OR LEN(TRIM(@Reason))=0 THROW 51701, ''Cancellation reason is required'', 1;
    BEGIN TRAN;
    DECLARE @InstitutionId bigint,@Status nvarchar(24),@PublicId uniqueidentifier,
            @Now datetime2(3)=SYSUTCDATETIME(),@GrantKind nvarchar(40),@GrantId bigint;
    SELECT @InstitutionId=InstitutionId,@Status=Status,@PublicId=PublicId
      FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @Status IS NULL THROW 51702, ''Initiative not found'', 1;
    IF @Status=N''Cancelled'' THROW 51703, ''Initiative is already cancelled'', 1;
    IF @Status NOT IN (N''Draft'',N''Published'',N''Closed'') THROW 51704, ''Initiative status is not cancellable'', 1;
    SELECT TOP (1) @GrantKind=N''InstitutionRepresentative'',@GrantId=Id
      FROM institution.RepresentativeMembership
      WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'' AND RevokedAtUtc IS NULL;
    IF @GrantId IS NULL
        SELECT TOP (1) @GrantKind=N''GlobalGrant'',@GrantId=Id FROM iam.GlobalGrant
         WHERE PersonId=@ActorPersonId AND Capability=N''InitiativeCancellationAdmin'' AND RevokedAtUtc IS NULL;
    IF @GrantId IS NULL THROW 51705, ''Actor has no cancellation authority'', 1;

    DECLARE @Closed TABLE(Id bigint PRIMARY KEY,PublicId uniqueidentifier,TermsRevisionId bigint,BeforeStatus nvarchar(24));
    UPDATE institution.InitiativeApplication
       SET Status=N''Cancelled'',ClosedReason=N''InitiativeCancelled'',ClosedAtUtc=@Now,UpdatedAtUtc=@Now
       OUTPUT inserted.Id,inserted.PublicId,inserted.TermsRevisionId,deleted.Status INTO @Closed
     WHERE InitiativeId=@InitiativeId AND Status IN (N''Pending'',N''Queued'',N''Offered'');
    INSERT institution.InitiativeApplicationDecision
        (ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,Reason,TermsRevisionId,AtUtc)
      SELECT c.Id,@InitiativeId,ISNULL((SELECT MAX(d.DecisionNo) FROM institution.InitiativeApplicationDecision d
           WHERE d.ApplicationId=c.Id),0)+1,N''Cancelled'',@ActorPersonId,@Reason,c.TermsRevisionId,@Now
        FROM @Closed c;
    INSERT ops.AuditEvent(ActorPersonId,SelectedGrantKind,SelectedGrantId,ResourceKind,ResourcePublicId,
        Action,BeforeStatus,AfterStatus,Reason,AtUtc,CorrelationId)
      SELECT @ActorPersonId,@GrantKind,@GrantId,N''Application'',PublicId,N''InitiativeCancelled'',
             BeforeStatus,N''Cancelled'',@Reason,@Now,NEWID() FROM @Closed;

    DECLARE @Ended TABLE(PublicId uniqueidentifier PRIMARY KEY,BeforeStatus nvarchar(24));
    UPDATE institution.InitiativeMembership
       SET Status=N''Cancelled'',EndReason=N''InitiativeCancelled'',EndedAtUtc=@Now,
           CapacityReleasedAtUtc=@Now,UpdatedAtUtc=@Now
       OUTPUT inserted.PublicId,deleted.Status INTO @Ended
     WHERE InitiativeId=@InitiativeId AND Status IN (N''Accepted'',N''Suspended'');
    INSERT ops.AuditEvent(ActorPersonId,SelectedGrantKind,SelectedGrantId,ResourceKind,ResourcePublicId,
        Action,BeforeStatus,AfterStatus,Reason,AtUtc,CorrelationId)
      SELECT @ActorPersonId,@GrantKind,@GrantId,N''Membership'',PublicId,N''InitiativeCancelled'',
             BeforeStatus,N''Cancelled'',@Reason,@Now,NEWID() FROM @Ended;

    UPDATE institution.Initiative
       SET Status=N''Cancelled'',CancellationReason=@Reason,CancelledAtUtc=@Now,
           CancelledByPersonId=@ActorPersonId,UpdatedAtUtc=@Now WHERE Id=@InitiativeId;
    INSERT ops.AuditEvent(ActorPersonId,SelectedGrantKind,SelectedGrantId,ResourceKind,ResourcePublicId,
        Action,BeforeStatus,AfterStatus,Reason,AtUtc,CorrelationId)
      VALUES(@ActorPersonId,@GrantKind,@GrantId,N''Initiative'',@PublicId,N''Cancelled'',
             @Status,N''Cancelled'',@Reason,@Now,NEWID());
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER institution.TR_Initiative_PublishedRevision
ON institution.Initiative AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Status=N''Published''
        AND NOT EXISTS (SELECT 1 FROM institution.InitiativeRevision r WHERE r.InitiativeId=i.Id))
        THROW 51040, ''Published initiative requires a matching revision'', 1;
    IF EXISTS (SELECT 1 FROM deleted d JOIN inserted i ON i.Id=d.Id WHERE d.Status=N''Cancelled''
       AND (i.Status<>N''Cancelled'' OR i.CancellationReason<>d.CancellationReason
            OR i.CancelledAtUtc<>d.CancelledAtUtc OR i.CancelledByPersonId<>d.CancelledByPersonId))
        THROW 51706, ''Cancelled initiative is permanent'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.RescheduleInitiative
    @InitiativeId bigint,@ActorPersonId bigint,@NewStartsAtUtc datetime2(3),
    @NewEndsAtUtc datetime2(3),@RevisionId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @NewStartsAtUtc IS NULL OR @NewStartsAtUtc<=SYSUTCDATETIME() OR @NewEndsAtUtc IS NULL OR @NewEndsAtUtc<=@NewStartsAtUtc
        THROW 51601, ''Invalid rescheduled interval'', 1;
    BEGIN TRAN;
    DECLARE @InstitutionId bigint,@Status nvarchar(24),@PublicId uniqueidentifier,
        @PreviousRevisionId bigint,@RevisionNo int,@Cutoff datetime2(3);
    SELECT @InstitutionId=InstitutionId,@Status=Status,@PublicId=PublicId
        FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @Status<>N''Published'' OR @Status IS NULL THROW 51602, ''Initiative is not published'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId
        AND PersonId=@ActorPersonId AND Status=N''Active'')
        THROW 51102, ''Representative grant is not active'', 1;
    SELECT TOP (1) @PreviousRevisionId=Id,@RevisionNo=RevisionNo+1
        FROM institution.InitiativeRevision WHERE InitiativeId=@InitiativeId ORDER BY RevisionNo DESC;
    SET @Cutoff=DATEADD(hour,-120,@NewStartsAtUtc);
    INSERT institution.InitiativeRevision(InitiativeId,RevisionNo,Summary,AudienceCode,CoverageCode,
        CostKind,Price,Currency,CompletionPolicyRef,Title,Mode,Capacity,TimeZoneId,
        StartsAtUtc,EndsAtUtc,WithdrawalCutoffAtUtc,PublishedSnapshotJson)
    SELECT InitiativeId,@RevisionNo,Summary,AudienceCode,CoverageCode,CostKind,Price,Currency,
        CompletionPolicyRef,Title,Mode,Capacity,TimeZoneId,@NewStartsAtUtc,@NewEndsAtUtc,@Cutoff,
        JSON_MODIFY(PublishedSnapshotJson,''$.rescheduledFromRevisionId'',@PreviousRevisionId)
    FROM institution.InitiativeRevision WHERE Id=@PreviousRevisionId;
    SET @RevisionId=SCOPE_IDENTITY();
    UPDATE institution.Initiative SET StartsAtUtc=@NewStartsAtUtc,EndsAtUtc=@NewEndsAtUtc,
        WithdrawalCutoffAtUtc=@Cutoff,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@InitiativeId;
    /* Postponement extends existing rights; advancement cannot shorten them. */
    UPDATE institution.InitiativeMembership
       SET WithdrawalCutoffAtUtc=@Cutoff,UpdatedAtUtc=SYSUTCDATETIME()
     WHERE InitiativeId=@InitiativeId AND Status IN (N''Accepted'',N''Suspended'')
       AND WithdrawalCutoffAtUtc<@Cutoff;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Initiative'',@PublicId,N''Rescheduled'',SYSUTCDATETIME(),NEWID());
    COMMIT;
END;
');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.ApproveApplication
    @ApplicationId bigint,@ActorPersonId bigint,@MembershipId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@PersonId bigint,@InstitutionId bigint,@Capacity smallint,
        @Status nvarchar(24),@TermsRevisionId bigint,@Cutoff datetime2(3),@ApplicationPublicId uniqueidentifier;
    SELECT @InitiativeId=InitiativeId,@PersonId=PersonId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    IF @InitiativeId IS NULL THROW 51206, ''Application not found'', 1;
    SELECT @InstitutionId=InstitutionId,@Capacity=Capacity,@Status=Status
        FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @Status<>N''Published'' THROW 51201, ''Initiative is not open'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
       AND NOT EXISTS (SELECT 1 FROM institution.InitiativeStaffAppointment WHERE InitiativeId=@InitiativeId AND PersonId=@ActorPersonId AND Role=N''Supervisor'' AND Status=N''Active'')
        THROW 51209, ''Actor has no current admission authority'', 1;
    SELECT @Status=Status,@TermsRevisionId=TermsRevisionId,@ApplicationPublicId=PublicId
        FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    IF @Status=N''Accepted''
    BEGIN
        SELECT @MembershipId=Id FROM institution.InitiativeMembership WHERE ApplicationId=@ApplicationId;
        IF @MembershipId IS NULL THROW 51210, ''Accepted application has no membership'', 1;
        COMMIT; RETURN;
    END;
    IF @Status NOT IN (N''Pending'',N''Queued'',N''Offered'') THROW 51208, ''Application is not pending'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId)
        THROW 51203, ''Rejoining this initiative is not approved'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE PersonId=@PersonId AND Status IN (N''Accepted'',N''Suspended''))
        THROW 51211, ''Person already has an active initiative membership'', 1;
    IF (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND CapacityReleasedAtUtc IS NULL)>=@Capacity
        THROW 51212, ''Initiative capacity is full'', 1;
    SELECT @Cutoff=WithdrawalCutoffAtUtc FROM institution.InitiativeRevision WHERE Id=@TermsRevisionId AND InitiativeId=@InitiativeId;
    SELECT @Cutoff=CASE WHEN WithdrawalCutoffAtUtc>@Cutoff THEN WithdrawalCutoffAtUtc ELSE @Cutoff END
      FROM institution.Initiative WHERE Id=@InitiativeId;
    INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc)
        VALUES(@InitiativeId,@ApplicationId,@PersonId,N''Accepted'',SYSUTCDATETIME(),@Cutoff);
    SET @MembershipId=SCOPE_IDENTITY();
    UPDATE institution.InitiativeApplication SET Status=N''Accepted'',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
    INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
        SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,N''Approved'',@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
        FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Application'',@ApplicationPublicId,N''Approved'',N''Accepted'',SYSUTCDATETIME(),NEWID());
    COMMIT;
    END TRY
    BEGIN CATCH
        DECLARE @DeniedError int=ERROR_NUMBER();
        IF XACT_STATE()<>0 ROLLBACK;
        IF @DeniedError=51209
            INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,Reason,AtUtc,CorrelationId)
                SELECT @ActorPersonId,N''Application'',PublicId,N''AdmissionDenied'',N''No current admission authority'',SYSUTCDATETIME(),NEWID()
                FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        THROW;
    END CATCH;
END;
');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101053400_CancellationAndWithdrawalRights'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101053400_CancellationAndWithdrawalRights', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    IF SCHEMA_ID(N'lab') IS NULL EXEC(N'CREATE SCHEMA [lab];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    IF SCHEMA_ID(N'personal') IS NULL EXEC(N'CREATE SCHEMA [personal];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE TABLE [lab].[AssessmentInstrument] (
        [Id] bigint NOT NULL IDENTITY,
        [Code] nvarchar(64) NOT NULL,
        [Title] nvarchar(160) NOT NULL,
        [Status] nvarchar(32) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_AssessmentInstrument] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_AssessmentInstrument_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Retired'))
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE TABLE [lab].[AssessmentWindow] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [WindowKey] nvarchar(120) NOT NULL,
        [PolicyVersion] nvarchar(64) NOT NULL,
        [OpensAtUtc] datetime2(3) NOT NULL,
        [ClosesAtUtc] datetime2(3) NOT NULL,
        [Status] nvarchar(32) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_AssessmentWindow] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_AssessmentWindow_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_AssessmentWindow_Interval] CHECK ([ClosesAtUtc]>[OpensAtUtc]),
        CONSTRAINT [CK_AssessmentWindow_Status] CHECK ([Status] IN (N'Open',N'Closed',N'Used')),
        CONSTRAINT [FK_AssessmentWindow_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE TABLE [lab].[InstrumentVersion] (
        [Id] bigint NOT NULL IDENTITY,
        [InstrumentId] bigint NOT NULL,
        [VersionNo] int NOT NULL,
        [ContentRef] nvarchar(300) NOT NULL,
        [ScoringVersion] nvarchar(64) NOT NULL,
        [ProtocolVersion] nvarchar(64) NOT NULL,
        [ComparabilityGroup] nvarchar(64) NULL,
        [PublishedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_InstrumentVersion] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_InstrumentVersion_Id_InstrumentId] UNIQUE ([Id], [InstrumentId]),
        CONSTRAINT [CK_InstrumentVersion_No] CHECK ([VersionNo]>0),
        CONSTRAINT [FK_InstrumentVersion_AssessmentInstrument_InstrumentId] FOREIGN KEY ([InstrumentId]) REFERENCES [lab].[AssessmentInstrument] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE TABLE [lab].[AssessmentAttempt] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [PersonId] bigint NOT NULL,
        [InstrumentId] bigint NOT NULL,
        [InstrumentVersionId] bigint NOT NULL,
        [WindowId] bigint NULL,
        [Kind] nvarchar(24) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [StartedAtUtc] datetime2(3) NOT NULL,
        [FinishedAtUtc] datetime2(3) NULL,
        [ValidityCode] nvarchar(40) NULL,
        [AccessibilityMode] nvarchar(40) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_AssessmentAttempt] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_AssessmentAttempt_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_AssessmentAttempt_Finished] CHECK (([Status] IN (N'Started',N'Paused') AND [FinishedAtUtc] IS NULL) OR ([Status] IN (N'Submitted',N'Valid',N'Invalid') AND [FinishedAtUtc] IS NOT NULL AND [FinishedAtUtc]>=[StartedAtUtc])),
        CONSTRAINT [CK_AssessmentAttempt_Status] CHECK ([Status] IN (N'Started',N'Paused',N'Submitted',N'Valid',N'Invalid')),
        CONSTRAINT [FK_AssessmentAttempt_AssessmentInstrument_InstrumentId] FOREIGN KEY ([InstrumentId]) REFERENCES [lab].[AssessmentInstrument] ([Id]),
        CONSTRAINT [FK_AssessmentAttempt_AssessmentWindow_WindowId_PersonId] FOREIGN KEY ([WindowId], [PersonId]) REFERENCES [lab].[AssessmentWindow] ([Id], [PersonId]),
        CONSTRAINT [FK_AssessmentAttempt_InstrumentVersion_InstrumentVersionId_InstrumentId] FOREIGN KEY ([InstrumentVersionId], [InstrumentId]) REFERENCES [lab].[InstrumentVersion] ([Id], [InstrumentId]),
        CONSTRAINT [FK_AssessmentAttempt_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE TABLE [lab].[AssessmentResponse] (
        [Id] bigint NOT NULL IDENTITY,
        [AttemptId] bigint NOT NULL,
        [ItemKey] nvarchar(80) NOT NULL,
        [TrialNo] int NOT NULL,
        [ResponseText] nvarchar(max) NULL,
        [ResponseNumber] decimal(12,4) NULL,
        [LatencyMs] int NULL,
        [RecordedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_AssessmentResponse] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_AssessmentResponse_Latency] CHECK ([LatencyMs] IS NULL OR [LatencyMs]>=0),
        CONSTRAINT [CK_AssessmentResponse_Trial] CHECK ([TrialNo]>0),
        CONSTRAINT [FK_AssessmentResponse_AssessmentAttempt_AttemptId] FOREIGN KEY ([AttemptId]) REFERENCES [lab].[AssessmentAttempt] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE TABLE [lab].[AssessmentScore] (
        [Id] bigint NOT NULL IDENTITY,
        [AttemptId] bigint NOT NULL,
        [ScoringVersion] nvarchar(64) NOT NULL,
        [MetricCode] nvarchar(64) NOT NULL,
        [Value] decimal(12,4) NOT NULL,
        [Comparable] bit NOT NULL,
        [ComputedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_AssessmentScore] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AssessmentScore_AssessmentAttempt_AttemptId] FOREIGN KEY ([AttemptId]) REFERENCES [lab].[AssessmentAttempt] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE TABLE [personal].[IndividualProfile] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [GoalCode] nvarchar(64) NULL,
        [PreferredTimeZone] nvarchar(80) NOT NULL,
        [PreferenceVersion] int NOT NULL,
        [ConsentVersion] nvarchar(40) NULL,
        [OnboardingStage] nvarchar(40) NOT NULL,
        [LastAssessmentAttemptId] bigint NULL,
        [OnboardingCompletedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_IndividualProfile] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_IndividualProfile_Stage] CHECK ([OnboardingStage] IN (N'Started',N'Setup',N'Baselines',N'Preview',N'Activated',N'TourDone')),
        CONSTRAINT [FK_IndividualProfile_AssessmentAttempt_LastAssessmentAttemptId_PersonId] FOREIGN KEY ([LastAssessmentAttemptId], [PersonId]) REFERENCES [lab].[AssessmentAttempt] ([Id], [PersonId]),
        CONSTRAINT [FK_IndividualProfile_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE INDEX [IX_AssessmentAttempt_InstrumentId] ON [lab].[AssessmentAttempt] ([InstrumentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE INDEX [IX_AssessmentAttempt_InstrumentVersionId_InstrumentId] ON [lab].[AssessmentAttempt] ([InstrumentVersionId], [InstrumentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_AssessmentAttempt_PersonId_InstrumentId] ON [lab].[AssessmentAttempt] ([PersonId], [InstrumentId]) WHERE [Kind]=N''Baseline'' AND [Status]=N''Valid''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE INDEX [IX_AssessmentAttempt_PersonId_InstrumentId_FinishedAtUtc] ON [lab].[AssessmentAttempt] ([PersonId], [InstrumentId], [FinishedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AssessmentAttempt_PublicId] ON [lab].[AssessmentAttempt] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE INDEX [IX_AssessmentAttempt_WindowId_PersonId] ON [lab].[AssessmentAttempt] ([WindowId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AssessmentInstrument_Code] ON [lab].[AssessmentInstrument] ([Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AssessmentResponse_AttemptId_ItemKey_TrialNo] ON [lab].[AssessmentResponse] ([AttemptId], [ItemKey], [TrialNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE INDEX [IX_AssessmentScore_AttemptId] ON [lab].[AssessmentScore] ([AttemptId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AssessmentScore_AttemptId_ScoringVersion_MetricCode] ON [lab].[AssessmentScore] ([AttemptId], [ScoringVersion], [MetricCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE INDEX [IX_AssessmentWindow_PersonId_OpensAtUtc] ON [lab].[AssessmentWindow] ([PersonId], [OpensAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AssessmentWindow_PersonId_WindowKey] ON [lab].[AssessmentWindow] ([PersonId], [WindowKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE INDEX [IX_IndividualProfile_LastAssessmentAttemptId_PersonId] ON [personal].[IndividualProfile] ([LastAssessmentAttemptId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE UNIQUE INDEX [IX_IndividualProfile_PersonId] ON [personal].[IndividualProfile] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE INDEX [IX_InstrumentVersion_InstrumentId_PublishedAtUtc] ON [lab].[InstrumentVersion] ([InstrumentId], [PublishedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InstrumentVersion_InstrumentId_VersionNo] ON [lab].[InstrumentVersion] ([InstrumentId], [VersionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER lab.TR_InstrumentVersion_Immutable
ON lab.InstrumentVersion AFTER UPDATE, DELETE
AS
BEGIN
    THROW 52001, ''Published instrument version is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER lab.TR_AssessmentScore_Immutable
ON lab.AssessmentScore AFTER UPDATE, DELETE
AS
BEGIN
    THROW 52002, ''Assessment score is append-only'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER lab.TR_AssessmentResponse_OpenAttempt
ON lab.AssessmentResponse AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN lab.AssessmentAttempt a ON a.Id=i.AttemptId
        WHERE a.Status NOT IN (N''Started'',N''Paused''))
       OR EXISTS (SELECT 1 FROM deleted d JOIN lab.AssessmentAttempt a ON a.Id=d.AttemptId
        WHERE a.Status NOT IN (N''Started'',N''Paused''))
        THROW 52003, ''Assessment responses are sealed after submission'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER lab.TR_AssessmentAttempt_Transition
ON lab.AssessmentAttempt AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
        WHERE i.Status<>d.Status AND NOT (
          (d.Status=N''Started'' AND i.Status IN (N''Paused'',N''Submitted'',N''Invalid'')) OR
          (d.Status=N''Paused'' AND i.Status IN (N''Started'',N''Submitted'',N''Invalid'')) OR
          (d.Status=N''Submitted'' AND i.Status IN (N''Valid'',N''Invalid''))))
        THROW 52004, ''Unsupported assessment attempt transition'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054044_LabAndIndividualProfile'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101054044_LabAndIndividualProfile', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    IF SCHEMA_ID(N'shield') IS NULL EXEC(N'CREATE SCHEMA [shield];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE TABLE [shield].[ExtensionInstallation] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [InstallationPublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [Status] nvarchar(24) NOT NULL,
        [PairedAtUtc] datetime2(3) NOT NULL,
        [RevokedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ExtensionInstallation] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ExtensionInstallation_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_ExtensionInstallation_Revoked] CHECK (([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL) OR ([Status]<>N'Revoked' AND [RevokedAtUtc] IS NULL)),
        CONSTRAINT [CK_ExtensionInstallation_Status] CHECK ([Status] IN (N'Connected',N'Disconnected',N'Revoked')),
        CONSTRAINT [FK_ExtensionInstallation_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE TABLE [shield].[ShieldConfiguration] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [VersionNo] int NOT NULL,
        [ThresholdMinutes] smallint NULL,
        [ConsentVersion] nvarchar(40) NOT NULL,
        [EffectiveAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ShieldConfiguration] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ShieldConfiguration_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_ShieldConfiguration_Threshold] CHECK ([ThresholdMinutes] IS NULL OR [ThresholdMinutes]>0),
        CONSTRAINT [CK_ShieldConfiguration_Version] CHECK ([VersionNo]>0),
        CONSTRAINT [FK_ShieldConfiguration_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE TABLE [shield].[BrowserUsagePeriod] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [InstallationId] bigint NOT NULL,
        [ConfigurationId] bigint NOT NULL,
        [LocalDate] date NOT NULL,
        [TimeZoneId] nvarchar(80) NOT NULL,
        [ObservedSeconds] int NOT NULL,
        [CoverageSeconds] int NOT NULL,
        [GapCount] int NOT NULL,
        [SequenceNo] bigint NOT NULL,
        [SourceHash] binary(32) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_BrowserUsagePeriod] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_BrowserUsagePeriod_Id_ConfigurationId] UNIQUE ([Id], [ConfigurationId]),
        CONSTRAINT [CK_BrowserUsagePeriod_Counts] CHECK ([ObservedSeconds]>=0 AND [CoverageSeconds]>=0 AND [GapCount]>=0),
        CONSTRAINT [FK_BrowserUsagePeriod_ExtensionInstallation_InstallationId_PersonId] FOREIGN KEY ([InstallationId], [PersonId]) REFERENCES [shield].[ExtensionInstallation] ([Id], [PersonId]),
        CONSTRAINT [FK_BrowserUsagePeriod_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_BrowserUsagePeriod_ShieldConfiguration_ConfigurationId_PersonId] FOREIGN KEY ([ConfigurationId], [PersonId]) REFERENCES [shield].[ShieldConfiguration] ([Id], [PersonId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE TABLE [shield].[ProtectionSession] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [InstallationId] bigint NOT NULL,
        [ConfigurationId] bigint NOT NULL,
        [StartedAtUtc] datetime2(3) NOT NULL,
        [EndsAtUtc] datetime2(3) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [FailureCode] nvarchar(40) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProtectionSession] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProtectionSession_Status] CHECK ([Status] IN (N'Configured',N'Active',N'Ended',N'Failed',N'Disconnected')),
        CONSTRAINT [CK_ProtectionSession_Times] CHECK ([EndsAtUtc]>[StartedAtUtc]),
        CONSTRAINT [FK_ProtectionSession_ExtensionInstallation_InstallationId_PersonId] FOREIGN KEY ([InstallationId], [PersonId]) REFERENCES [shield].[ExtensionInstallation] ([Id], [PersonId]),
        CONSTRAINT [FK_ProtectionSession_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProtectionSession_ShieldConfiguration_ConfigurationId_PersonId] FOREIGN KEY ([ConfigurationId], [PersonId]) REFERENCES [shield].[ShieldConfiguration] ([Id], [PersonId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE TABLE [shield].[ShieldSelectedDomain] (
        [Id] bigint NOT NULL IDENTITY,
        [ConfigurationId] bigint NOT NULL,
        [DomainCode] nvarchar(120) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ShieldSelectedDomain] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ShieldSelectedDomain_ConfigurationId_DomainCode] UNIQUE ([ConfigurationId], [DomainCode]),
        CONSTRAINT [FK_ShieldSelectedDomain_ShieldConfiguration_ConfigurationId] FOREIGN KEY ([ConfigurationId]) REFERENCES [shield].[ShieldConfiguration] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE TABLE [shield].[BrowserUsageDomain] (
        [Id] bigint NOT NULL IDENTITY,
        [UsagePeriodId] bigint NOT NULL,
        [ConfigurationId] bigint NOT NULL,
        [DomainCode] nvarchar(120) NOT NULL,
        [ObservedSeconds] int NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_BrowserUsageDomain] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_BrowserUsageDomain_Seconds] CHECK ([ObservedSeconds]>=0),
        CONSTRAINT [FK_BrowserUsageDomain_BrowserUsagePeriod_UsagePeriodId_ConfigurationId] FOREIGN KEY ([UsagePeriodId], [ConfigurationId]) REFERENCES [shield].[BrowserUsagePeriod] ([Id], [ConfigurationId]),
        CONSTRAINT [FK_BrowserUsageDomain_ShieldSelectedDomain_ConfigurationId_DomainCode] FOREIGN KEY ([ConfigurationId], [DomainCode]) REFERENCES [shield].[ShieldSelectedDomain] ([ConfigurationId], [DomainCode])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_BrowserUsageDomain_ConfigurationId_DomainCode] ON [shield].[BrowserUsageDomain] ([ConfigurationId], [DomainCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_BrowserUsageDomain_UsagePeriodId_ConfigurationId] ON [shield].[BrowserUsageDomain] ([UsagePeriodId], [ConfigurationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE UNIQUE INDEX [IX_BrowserUsageDomain_UsagePeriodId_DomainCode] ON [shield].[BrowserUsageDomain] ([UsagePeriodId], [DomainCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_BrowserUsagePeriod_ConfigurationId_PersonId] ON [shield].[BrowserUsagePeriod] ([ConfigurationId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_BrowserUsagePeriod_InstallationId_LocalDate] ON [shield].[BrowserUsagePeriod] ([InstallationId], [LocalDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_BrowserUsagePeriod_InstallationId_PersonId] ON [shield].[BrowserUsagePeriod] ([InstallationId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE UNIQUE INDEX [IX_BrowserUsagePeriod_InstallationId_SequenceNo] ON [shield].[BrowserUsagePeriod] ([InstallationId], [SequenceNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_BrowserUsagePeriod_PersonId] ON [shield].[BrowserUsagePeriod] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ExtensionInstallation_InstallationPublicId] ON [shield].[ExtensionInstallation] ([InstallationPublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_ExtensionInstallation_PersonId_Status] ON [shield].[ExtensionInstallation] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_ProtectionSession_ConfigurationId_PersonId] ON [shield].[ProtectionSession] ([ConfigurationId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_ProtectionSession_InstallationId_PersonId] ON [shield].[ProtectionSession] ([InstallationId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE INDEX [IX_ProtectionSession_PersonId_StartedAtUtc] ON [shield].[ProtectionSession] ([PersonId], [StartedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ShieldConfiguration_PersonId_VersionNo] ON [shield].[ShieldConfiguration] ([PersonId], [VersionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER shield.TR_ShieldConfiguration_Immutable
ON shield.ShieldConfiguration AFTER UPDATE, DELETE
AS BEGIN THROW 53001, ''Shield configuration is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER shield.TR_BrowserUsagePeriod_Immutable
ON shield.BrowserUsagePeriod AFTER UPDATE, DELETE
AS BEGIN THROW 53002, ''Browser usage period is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER shield.TR_BrowserUsageDomain_Immutable
ON shield.BrowserUsageDomain AFTER UPDATE, DELETE
AS BEGIN THROW 53003, ''Browser usage domain is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER shield.TR_ShieldSelectedDomain_UsedConfiguration
ON shield.ShieldSelectedDomain AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i WHERE EXISTS (SELECT 1 FROM shield.BrowserUsagePeriod p WHERE p.ConfigurationId=i.ConfigurationId)
        OR EXISTS (SELECT 1 FROM shield.ProtectionSession s WHERE s.ConfigurationId=i.ConfigurationId))
       OR EXISTS (SELECT 1 FROM deleted d WHERE EXISTS (SELECT 1 FROM shield.BrowserUsagePeriod p WHERE p.ConfigurationId=d.ConfigurationId)
        OR EXISTS (SELECT 1 FROM shield.ProtectionSession s WHERE s.ConfigurationId=d.ConfigurationId))
        THROW 53004, ''Selected domains are sealed after configuration use'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE shield.IngestUsagePeriod
    @InstallationId bigint,@ConfigurationId bigint,@PersonId bigint,
    @LocalDate date,@TimeZoneId nvarchar(80),@ObservedSeconds int,@CoverageSeconds int,
    @GapCount int,@SequenceNo bigint,@SourceHash varbinary(32),@DomainsJson nvarchar(max),
    @PeriodId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @TimeZoneId IS NULL OR LEN(TRIM(@TimeZoneId))=0 OR @SourceHash IS NULL OR DATALENGTH(@SourceHash)<>32
       OR @DomainsJson IS NULL OR ISJSON(@DomainsJson)<>1
       OR @ObservedSeconds IS NULL OR @ObservedSeconds<0 OR @CoverageSeconds IS NULL OR @CoverageSeconds<0
       OR @GapCount IS NULL OR @GapCount<0 OR @SequenceNo IS NULL OR @SequenceNo<1
        THROW 53010, ''Invalid usage period payload'', 1;
    DECLARE @Domains TABLE(DomainCode nvarchar(120) NOT NULL PRIMARY KEY,ObservedSeconds int NOT NULL);
    INSERT @Domains(DomainCode,ObservedSeconds)
       SELECT DomainCode,ObservedSeconds FROM OPENJSON(@DomainsJson)
           WITH (DomainCode nvarchar(120) ''$.domainCode'',ObservedSeconds int ''$.observedSeconds'');
    IF EXISTS (SELECT 1 FROM @Domains WHERE DomainCode=N'''' OR ObservedSeconds<0)
       OR (SELECT COALESCE(SUM(CONVERT(bigint,ObservedSeconds)),0) FROM @Domains)<>@ObservedSeconds
        THROW 53011, ''Domain totals do not match period'', 1;
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM shield.ExtensionInstallation WITH (UPDLOCK,HOLDLOCK)
        WHERE Id=@InstallationId AND PersonId=@PersonId AND Status=N''Connected'')
        THROW 53012, ''Connected installation owner mismatch'', 1;
    IF NOT EXISTS (SELECT 1 FROM shield.ShieldConfiguration
        WHERE Id=@ConfigurationId AND PersonId=@PersonId)
        THROW 53013, ''Configuration owner mismatch'', 1;
    IF EXISTS (SELECT 1 FROM @Domains d WHERE NOT EXISTS
       (SELECT 1 FROM shield.ShieldSelectedDomain s WHERE s.ConfigurationId=@ConfigurationId AND s.DomainCode=d.DomainCode))
        THROW 53014, ''Domain is not selected in this configuration'', 1;
    INSERT shield.BrowserUsagePeriod(InstallationId,ConfigurationId,PersonId,LocalDate,TimeZoneId,
        ObservedSeconds,CoverageSeconds,GapCount,SequenceNo,SourceHash)
      VALUES(@InstallationId,@ConfigurationId,@PersonId,@LocalDate,@TimeZoneId,
        @ObservedSeconds,@CoverageSeconds,@GapCount,@SequenceNo,@SourceHash);
    SET @PeriodId=SCOPE_IDENTITY();
    INSERT shield.BrowserUsageDomain(UsagePeriodId,ConfigurationId,DomainCode,ObservedSeconds)
       SELECT @PeriodId,@ConfigurationId,DomainCode,ObservedSeconds FROM @Domains;
    COMMIT;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054346_ShieldOwnership'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101054346_ShieldOwnership', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    IF SCHEMA_ID(N'governance') IS NULL EXEC(N'CREATE SCHEMA [governance];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE TABLE [governance].[ContentRelease] (
        [Id] bigint NOT NULL IDENTITY,
        [TargetCode] nvarchar(120) NOT NULL,
        [VersionNo] int NOT NULL,
        [PayloadRef] nvarchar(300) NOT NULL,
        [PublishedByPersonId] bigint NOT NULL,
        [PublishedAtUtc] datetime2(3) NOT NULL,
        [SupersedesId] bigint NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ContentRelease] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ContentRelease_Version] CHECK ([VersionNo]>0),
        CONSTRAINT [FK_ContentRelease_ContentRelease_SupersedesId] FOREIGN KEY ([SupersedesId]) REFERENCES [governance].[ContentRelease] ([Id]),
        CONSTRAINT [FK_ContentRelease_Person_PublishedByPersonId] FOREIGN KEY ([PublishedByPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE TABLE [governance].[GovernanceAction] (
        [Id] bigint NOT NULL IDENTITY,
        [ActorPersonId] bigint NOT NULL,
        [ActionCode] nvarchar(64) NOT NULL,
        [ResourceType] nvarchar(64) NOT NULL,
        [ResourcePublicId] uniqueidentifier NOT NULL,
        [Reason] nvarchar(1000) NOT NULL,
        [AtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_GovernanceAction] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_GovernanceAction_Person_ActorPersonId] FOREIGN KEY ([ActorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE TABLE [ops].[IdempotencyRecord] (
        [Id] bigint NOT NULL IDENTITY,
        [ActorPersonId] bigint NOT NULL,
        [CommandCode] nvarchar(80) NOT NULL,
        [IdempotencyKey] nvarchar(160) NOT NULL,
        [RequestHash] varbinary(32) NOT NULL,
        [ResponseRef] nvarchar(300) NULL,
        [Status] nvarchar(24) NOT NULL,
        [ExpiresAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_IdempotencyRecord] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_IdempotencyRecord_Hash] CHECK (DATALENGTH([RequestHash])=32),
        CONSTRAINT [CK_IdempotencyRecord_Status] CHECK ([Status] IN (N'InProgress',N'Completed',N'Failed')),
        CONSTRAINT [FK_IdempotencyRecord_Person_ActorPersonId] FOREIGN KEY ([ActorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE TABLE [ops].[Notification] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [RecipientPersonId] bigint NOT NULL,
        [EventPublicId] uniqueidentifier NOT NULL,
        [ResourceKind] nvarchar(64) NOT NULL,
        [ResourcePublicId] uniqueidentifier NOT NULL,
        [TemplateCode] nvarchar(80) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [ReadAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Notification] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Notification_Status] CHECK ([Status] IN (N'Pending',N'Ready',N'Read',N'Withdrawn')),
        CONSTRAINT [FK_Notification_Person_RecipientPersonId] FOREIGN KEY ([RecipientPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE TABLE [ops].[OutboxMessage] (
        [Id] bigint NOT NULL IDENTITY,
        [EventPublicId] uniqueidentifier NOT NULL,
        [EventType] nvarchar(120) NOT NULL,
        [PayloadRef] nvarchar(300) NOT NULL,
        [OccurredAtUtc] datetime2(3) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [Attempts] int NOT NULL,
        [NextAttemptAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_OutboxMessage] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_OutboxMessage_Attempts] CHECK ([Attempts]>=0),
        CONSTRAINT [CK_OutboxMessage_Status] CHECK ([Status] IN (N'Pending',N'Delivered',N'DeadLetter'))
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE TABLE [ops].[DeliveryAttempt] (
        [Id] bigint NOT NULL IDENTITY,
        [NotificationId] bigint NOT NULL,
        [Channel] nvarchar(24) NOT NULL,
        [ProviderRef] nvarchar(160) NULL,
        [Outcome] nvarchar(24) NOT NULL,
        [AttemptedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_DeliveryAttempt] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_DeliveryAttempt_Outcome] CHECK ([Outcome] IN (N'Attempted',N'Sent',N'Failed')),
        CONSTRAINT [FK_DeliveryAttempt_Notification_NotificationId] FOREIGN KEY ([NotificationId]) REFERENCES [ops].[Notification] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE INDEX [IX_ContentRelease_PublishedByPersonId] ON [governance].[ContentRelease] ([PublishedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE INDEX [IX_ContentRelease_SupersedesId] ON [governance].[ContentRelease] ([SupersedesId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE INDEX [IX_ContentRelease_TargetCode_PublishedAtUtc] ON [governance].[ContentRelease] ([TargetCode], [PublishedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ContentRelease_TargetCode_VersionNo] ON [governance].[ContentRelease] ([TargetCode], [VersionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE INDEX [IX_DeliveryAttempt_NotificationId_AttemptedAtUtc] ON [ops].[DeliveryAttempt] ([NotificationId], [AttemptedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE INDEX [IX_GovernanceAction_ActorPersonId] ON [governance].[GovernanceAction] ([ActorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE INDEX [IX_GovernanceAction_ResourceType_ResourcePublicId_AtUtc] ON [governance].[GovernanceAction] ([ResourceType], [ResourcePublicId], [AtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_IdempotencyRecord_ActorPersonId_CommandCode_IdempotencyKey] ON [ops].[IdempotencyRecord] ([ActorPersonId], [CommandCode], [IdempotencyKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE INDEX [IX_IdempotencyRecord_ExpiresAtUtc] ON [ops].[IdempotencyRecord] ([ExpiresAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Notification_PublicId] ON [ops].[Notification] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE INDEX [IX_Notification_RecipientPersonId_CreatedAtUtc] ON [ops].[Notification] ([RecipientPersonId], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Notification_RecipientPersonId_EventPublicId_TemplateCode] ON [ops].[Notification] ([RecipientPersonId], [EventPublicId], [TemplateCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_OutboxMessage_EventPublicId] ON [ops].[OutboxMessage] ([EventPublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    CREATE INDEX [IX_OutboxMessage_Status_NextAttemptAtUtc] ON [ops].[OutboxMessage] ([Status], [NextAttemptAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER governance.TR_ContentRelease_Immutable
ON governance.ContentRelease AFTER UPDATE, DELETE
AS BEGIN THROW 54001, ''Content release is immutable; publish a new version'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER governance.TR_GovernanceAction_Immutable
ON governance.GovernanceAction AFTER UPDATE, DELETE
AS BEGIN THROW 54002, ''Governance action is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER ops.TR_DeliveryAttempt_Immutable
ON ops.DeliveryAttempt AFTER UPDATE, DELETE
AS BEGIN THROW 54003, ''Delivery attempt is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER ops.TR_OutboxMessage_Terminal
ON ops.OutboxMessage AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
        WHERE d.Status IN (N''Delivered'',N''DeadLetter'') AND i.Status<>d.Status)
        THROW 54004, ''Terminal outbox status cannot be reopened'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101054654_GovernanceAndOperations'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101054654_GovernanceAndOperations', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    IF SCHEMA_ID(N'coach') IS NULL EXEC(N'CREATE SCHEMA [coach];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE TABLE [coach].[CoachApproval] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [EvidenceFileId] bigint NULL,
        [DecidedByPersonId] bigint NULL,
        [DecisionReason] nvarchar(800) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_CoachApproval] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_CoachApproval_Status] CHECK ([Status] IN (N'Submitted',N'MoreInfo',N'Approved',N'Suspended',N'Rejected')),
        CONSTRAINT [FK_CoachApproval_Person_DecidedByPersonId] FOREIGN KEY ([DecidedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_CoachApproval_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_CoachApproval_SecureFile_EvidenceFileId] FOREIGN KEY ([EvidenceFileId]) REFERENCES [files].[SecureFile] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE TABLE [coach].[CoachProgram] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [OwnerPersonId] bigint NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_CoachProgram] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_CoachProgram_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Paused',N'Completed',N'Archived')),
        CONSTRAINT [FK_CoachProgram_Person_OwnerPersonId] FOREIGN KEY ([OwnerPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE TABLE [coach].[OperationalGroup] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [InitiativeId] bigint NULL,
        [ProgramId] bigint NULL,
        [Name] nvarchar(160) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_OperationalGroup] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_OperationalGroup_Parent] CHECK (([InitiativeId] IS NULL AND [ProgramId] IS NOT NULL) OR ([InitiativeId] IS NOT NULL AND [ProgramId] IS NULL)),
        CONSTRAINT [CK_OperationalGroup_Status] CHECK ([Status] IN (N'Open',N'Closed',N'Archived')),
        CONSTRAINT [FK_OperationalGroup_CoachProgram_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [coach].[CoachProgram] ([Id]),
        CONSTRAINT [FK_OperationalGroup_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE TABLE [coach].[ProgramRevision] (
        [Id] bigint NOT NULL IDENTITY,
        [ProgramId] bigint NOT NULL,
        [RevisionNo] int NOT NULL,
        [Purpose] nvarchar(1200) NOT NULL,
        [RuleRef] nvarchar(120) NOT NULL,
        [PublishedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ProgramRevision] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ProgramRevision_Id_ProgramId] UNIQUE ([Id], [ProgramId]),
        CONSTRAINT [CK_ProgramRevision_No] CHECK ([RevisionNo]>0),
        CONSTRAINT [FK_ProgramRevision_CoachProgram_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [coach].[CoachProgram] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE TABLE [coach].[ProgramStage] (
        [Id] bigint NOT NULL IDENTITY,
        [ProgramRevisionId] bigint NOT NULL,
        [StageNo] smallint NOT NULL,
        [Title] nvarchar(160) NOT NULL,
        [StartsAtUtc] datetime2(3) NULL,
        [EndsAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ProgramStage] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProgramStage_No] CHECK ([StageNo]>0),
        CONSTRAINT [CK_ProgramStage_Times] CHECK ([EndsAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [EndsAtUtc]>[StartsAtUtc])),
        CONSTRAINT [FK_ProgramStage_ProgramRevision_ProgramRevisionId] FOREIGN KEY ([ProgramRevisionId]) REFERENCES [coach].[ProgramRevision] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE INDEX [IX_CoachApproval_DecidedByPersonId] ON [coach].[CoachApproval] ([DecidedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE INDEX [IX_CoachApproval_EvidenceFileId] ON [coach].[CoachApproval] ([EvidenceFileId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE INDEX [IX_CoachApproval_PersonId_Status] ON [coach].[CoachApproval] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE INDEX [IX_CoachProgram_OwnerPersonId_Status] ON [coach].[CoachProgram] ([OwnerPersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CoachProgram_PublicId] ON [coach].[CoachProgram] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_OperationalGroup_Id_InitiativeId] ON [coach].[OperationalGroup] ([Id], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_OperationalGroup_Id_ProgramId] ON [coach].[OperationalGroup] ([Id], [ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE INDEX [IX_OperationalGroup_InitiativeId] ON [coach].[OperationalGroup] ([InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE INDEX [IX_OperationalGroup_ProgramId] ON [coach].[OperationalGroup] ([ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_OperationalGroup_PublicId] ON [coach].[OperationalGroup] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProgramRevision_ProgramId_RevisionNo] ON [coach].[ProgramRevision] ([ProgramId], [RevisionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProgramStage_ProgramRevisionId_StageNo] ON [coach].[ProgramStage] ([ProgramRevisionId], [StageNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER coach.TR_CoachProgram_OwnerPublication
ON coach.CoachProgram AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.OwnerPersonId<>d.OwnerPersonId)
        THROW 55001, ''Coach Program owner is immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Status=N''Published''
        AND NOT EXISTS (SELECT 1 FROM coach.ProgramRevision r WHERE r.ProgramId=i.Id))
        THROW 55002, ''Published Program requires a revision'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER coach.TR_ProgramRevision_Immutable
ON coach.ProgramRevision AFTER UPDATE, DELETE
AS BEGIN THROW 55003, ''Program revision is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER coach.TR_ProgramStage_Immutable
ON coach.ProgramStage AFTER UPDATE, DELETE
AS BEGIN THROW 55004, ''Program stage is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER coach.TR_ProgramStage_ClosedPublication
ON coach.ProgramStage AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.ProgramRevision r ON r.Id=i.ProgramRevisionId
       JOIN coach.CoachProgram p ON p.Id=r.ProgramId WHERE p.Status<>N''Draft'')
        THROW 55005, ''Program stages cannot be added after publication'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER coach.TR_OperationalGroup_ParentImmutable
ON coach.OperationalGroup AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
      WHERE ISNULL(i.InitiativeId,-1)<>ISNULL(d.InitiativeId,-1)
         OR ISNULL(i.ProgramId,-1)<>ISNULL(d.ProgramId,-1))
        THROW 55006, ''Operational Group parent cannot change'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055204_CoachFoundation'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101055204_CoachFoundation', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055459_TriggerCompatibleEfWrites'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055459_TriggerCompatibleEfWrites'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101055459_TriggerCompatibleEfWrites', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    IF SCHEMA_ID(N'evidence') IS NULL EXEC(N'CREATE SCHEMA [evidence];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE TABLE [evidence].[EvidenceEvent] (
        [Id] bigint NOT NULL IDENTITY,
        [EventPublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [SourceContext] nvarchar(40) NOT NULL,
        [SourceKey] nvarchar(160) NOT NULL,
        [SubjectPersonId] bigint NOT NULL,
        [Kind] nvarchar(40) NOT NULL,
        [Provenance] nvarchar(40) NOT NULL,
        [SourceVersion] nvarchar(64) NOT NULL,
        [OccurredAtUtc] datetime2(3) NOT NULL,
        [Validity] nvarchar(24) NOT NULL,
        [InvalidatesEventId] bigint NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_EvidenceEvent] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_EvidenceEvent_Id_SubjectPersonId] UNIQUE ([Id], [SubjectPersonId]),
        CONSTRAINT [CK_EvidenceEvent_Validity] CHECK (([Validity]=N'Accepted' AND [InvalidatesEventId] IS NULL) OR ([Validity]=N'Invalidates' AND [InvalidatesEventId] IS NOT NULL)),
        CONSTRAINT [FK_EvidenceEvent_EvidenceEvent_InvalidatesEventId_SubjectPersonId] FOREIGN KEY ([InvalidatesEventId], [SubjectPersonId]) REFERENCES [evidence].[EvidenceEvent] ([Id], [SubjectPersonId]),
        CONSTRAINT [FK_EvidenceEvent_Person_SubjectPersonId] FOREIGN KEY ([SubjectPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE TABLE [evidence].[GroupGarden] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NULL,
        [IndependentGroupId] bigint NULL,
        [ProgramId] bigint NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_GroupGarden] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_GroupGarden_Owner] CHECK (([InitiativeId] IS NOT NULL AND [IndependentGroupId] IS NULL AND [ProgramId] IS NULL) OR ([InitiativeId] IS NULL AND [IndependentGroupId] IS NOT NULL AND [ProgramId] IS NOT NULL)),
        CONSTRAINT [FK_GroupGarden_CoachProgram_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [coach].[CoachProgram] ([Id]),
        CONSTRAINT [FK_GroupGarden_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE TABLE [evidence].[RewardPolicyVersion] (
        [Id] bigint NOT NULL IDENTITY,
        [PolicyCode] nvarchar(64) NOT NULL,
        [VersionNo] int NOT NULL,
        [RuleRef] nvarchar(300) NOT NULL,
        [PublishedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_RewardPolicyVersion] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_RewardPolicyVersion_No] CHECK ([VersionNo]>0)
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE TABLE [evidence].[GroupRewardEntry] (
        [Id] bigint NOT NULL IDENTITY,
        [EvidenceEventId] bigint NOT NULL,
        [GroupGardenId] bigint NOT NULL,
        [PolicyVersionId] bigint NOT NULL,
        [EffectCode] nvarchar(40) NOT NULL,
        [EntryKind] nvarchar(16) NOT NULL,
        [Units] smallint NOT NULL,
        [ReversesEntryId] bigint NULL,
        [DecidedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_GroupRewardEntry] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_GroupRewardEntry_Id_GroupGardenId] UNIQUE ([Id], [GroupGardenId]),
        CONSTRAINT [CK_GroupRewardEntry_Kind] CHECK (([EntryKind]=N'Grant' AND [ReversesEntryId] IS NULL) OR ([EntryKind]=N'Reversal' AND [ReversesEntryId] IS NOT NULL)),
        CONSTRAINT [FK_GroupRewardEntry_EvidenceEvent_EvidenceEventId] FOREIGN KEY ([EvidenceEventId]) REFERENCES [evidence].[EvidenceEvent] ([Id]),
        CONSTRAINT [FK_GroupRewardEntry_GroupGarden_GroupGardenId] FOREIGN KEY ([GroupGardenId]) REFERENCES [evidence].[GroupGarden] ([Id]),
        CONSTRAINT [FK_GroupRewardEntry_GroupRewardEntry_ReversesEntryId_GroupGardenId] FOREIGN KEY ([ReversesEntryId], [GroupGardenId]) REFERENCES [evidence].[GroupRewardEntry] ([Id], [GroupGardenId]),
        CONSTRAINT [FK_GroupRewardEntry_RewardPolicyVersion_PolicyVersionId] FOREIGN KEY ([PolicyVersionId]) REFERENCES [evidence].[RewardPolicyVersion] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE TABLE [evidence].[PersonalRewardEntry] (
        [Id] bigint NOT NULL IDENTITY,
        [EvidenceEventId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [PolicyVersionId] bigint NOT NULL,
        [EffectCode] nvarchar(40) NOT NULL,
        [EntryKind] nvarchar(16) NOT NULL,
        [Units] smallint NOT NULL,
        [ReversesEntryId] bigint NULL,
        [DecidedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_PersonalRewardEntry] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_PersonalRewardEntry_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_PersonalRewardEntry_Kind] CHECK (([EntryKind]=N'Grant' AND [ReversesEntryId] IS NULL) OR ([EntryKind]=N'Reversal' AND [ReversesEntryId] IS NOT NULL)),
        CONSTRAINT [FK_PersonalRewardEntry_EvidenceEvent_EvidenceEventId_PersonId] FOREIGN KEY ([EvidenceEventId], [PersonId]) REFERENCES [evidence].[EvidenceEvent] ([Id], [SubjectPersonId]),
        CONSTRAINT [FK_PersonalRewardEntry_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_PersonalRewardEntry_PersonalRewardEntry_ReversesEntryId_PersonId] FOREIGN KEY ([ReversesEntryId], [PersonId]) REFERENCES [evidence].[PersonalRewardEntry] ([Id], [PersonId]),
        CONSTRAINT [FK_PersonalRewardEntry_RewardPolicyVersion_PolicyVersionId] FOREIGN KEY ([PolicyVersionId]) REFERENCES [evidence].[RewardPolicyVersion] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE UNIQUE INDEX [IX_EvidenceEvent_EventPublicId] ON [evidence].[EvidenceEvent] ([EventPublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_EvidenceEvent_InvalidatesEventId] ON [evidence].[EvidenceEvent] ([InvalidatesEventId]) WHERE [InvalidatesEventId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE INDEX [IX_EvidenceEvent_InvalidatesEventId_SubjectPersonId] ON [evidence].[EvidenceEvent] ([InvalidatesEventId], [SubjectPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE UNIQUE INDEX [IX_EvidenceEvent_SourceContext_SourceKey_SourceVersion] ON [evidence].[EvidenceEvent] ([SourceContext], [SourceKey], [SourceVersion]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE INDEX [IX_EvidenceEvent_SubjectPersonId_OccurredAtUtc] ON [evidence].[EvidenceEvent] ([SubjectPersonId], [OccurredAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_GroupGarden_IndependentGroupId] ON [evidence].[GroupGarden] ([IndependentGroupId]) WHERE [IndependentGroupId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_GroupGarden_InitiativeId] ON [evidence].[GroupGarden] ([InitiativeId]) WHERE [InitiativeId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE INDEX [IX_GroupGarden_ProgramId] ON [evidence].[GroupGarden] ([ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_GroupRewardEntry_EvidenceEventId_GroupGardenId_EffectCode] ON [evidence].[GroupRewardEntry] ([EvidenceEventId], [GroupGardenId], [EffectCode]) WHERE [EntryKind]=N''Grant''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE INDEX [IX_GroupRewardEntry_GroupGardenId_DecidedAtUtc] ON [evidence].[GroupRewardEntry] ([GroupGardenId], [DecidedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE INDEX [IX_GroupRewardEntry_PolicyVersionId] ON [evidence].[GroupRewardEntry] ([PolicyVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_GroupRewardEntry_ReversesEntryId] ON [evidence].[GroupRewardEntry] ([ReversesEntryId]) WHERE [ReversesEntryId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE INDEX [IX_GroupRewardEntry_ReversesEntryId_GroupGardenId] ON [evidence].[GroupRewardEntry] ([ReversesEntryId], [GroupGardenId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_PersonalRewardEntry_EvidenceEventId_PersonId_EffectCode] ON [evidence].[PersonalRewardEntry] ([EvidenceEventId], [PersonId], [EffectCode]) WHERE [EntryKind]=N''Grant''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE INDEX [IX_PersonalRewardEntry_PersonId_DecidedAtUtc] ON [evidence].[PersonalRewardEntry] ([PersonId], [DecidedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE INDEX [IX_PersonalRewardEntry_PolicyVersionId] ON [evidence].[PersonalRewardEntry] ([PolicyVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_PersonalRewardEntry_ReversesEntryId] ON [evidence].[PersonalRewardEntry] ([ReversesEntryId]) WHERE [ReversesEntryId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE INDEX [IX_PersonalRewardEntry_ReversesEntryId_PersonId] ON [evidence].[PersonalRewardEntry] ([ReversesEntryId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RewardPolicyVersion_PolicyCode_VersionNo] ON [evidence].[RewardPolicyVersion] ([PolicyCode], [VersionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    ALTER TABLE evidence.GroupGarden WITH CHECK ADD CONSTRAINT FK_GroupGarden_OperationalGroup_IndependentGroupId_ProgramId
    FOREIGN KEY (IndependentGroupId,ProgramId) REFERENCES coach.OperationalGroup(Id,ProgramId);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER evidence.TR_EvidenceEvent_Immutable
ON evidence.EvidenceEvent AFTER UPDATE, DELETE
AS BEGIN THROW 56001, ''Evidence event is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER evidence.TR_EvidenceEvent_Invalidation
ON evidence.EvidenceEvent AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN evidence.EvidenceEvent prior ON prior.Id=i.InvalidatesEventId
        WHERE prior.Validity<>N''Accepted'')
        THROW 56002, ''Only an accepted source event can be invalidated'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER evidence.TR_RewardPolicyVersion_Immutable
ON evidence.RewardPolicyVersion AFTER UPDATE, DELETE
AS BEGIN THROW 56003, ''Reward policy version is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER evidence.TR_PersonalRewardEntry_Immutable
ON evidence.PersonalRewardEntry AFTER UPDATE, DELETE
AS BEGIN THROW 56004, ''Personal reward entry is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER evidence.TR_PersonalRewardEntry_Reversal
ON evidence.PersonalRewardEntry AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN evidence.PersonalRewardEntry prior ON prior.Id=i.ReversesEntryId
        WHERE prior.EntryKind<>N''Grant'')
        THROW 56005, ''Reversal must refer to a grant'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER evidence.TR_GroupRewardEntry_Immutable
ON evidence.GroupRewardEntry AFTER UPDATE, DELETE
AS BEGIN THROW 56006, ''Group reward entry is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER evidence.TR_GroupRewardEntry_Reversal
ON evidence.GroupRewardEntry AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN evidence.GroupRewardEntry prior ON prior.Id=i.ReversesEntryId
        WHERE prior.EntryKind<>N''Grant'')
        THROW 56007, ''Reversal must refer to a grant'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER evidence.TR_GroupGarden_OwnerImmutable
ON evidence.GroupGarden AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
      WHERE ISNULL(i.InitiativeId,-1)<>ISNULL(d.InitiativeId,-1)
         OR ISNULL(i.IndependentGroupId,-1)<>ISNULL(d.IndependentGroupId,-1)
         OR ISNULL(i.ProgramId,-1)<>ISNULL(d.ProgramId,-1))
        THROW 56008, ''Group Garden owner is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101055726_EvidenceLedger'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101055726_EvidenceLedger', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    IF SCHEMA_ID(N'activity') IS NULL EXEC(N'CREATE SCHEMA [activity];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    IF SCHEMA_ID(N'recovery') IS NULL EXEC(N'CREATE SCHEMA [recovery];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [activity].[OfflineRoutine] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [Title] nvarchar(160) NOT NULL,
        [ScheduleRule] nvarchar(200) NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_OfflineRoutine] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_OfflineRoutine_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_OfflineRoutine_Status] CHECK ([Status] IN (N'Active',N'Paused',N'Archived')),
        CONSTRAINT [FK_OfflineRoutine_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [activity].[PracticeDefinition] (
        [Id] bigint NOT NULL IDENTITY,
        [Code] nvarchar(64) NOT NULL,
        [PracticeType] nvarchar(40) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_PracticeDefinition] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_PracticeDefinition_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Retired')),
        CONSTRAINT [CK_PracticeDefinition_Type] CHECK ([PracticeType] IN (N'Depth Practice',N'Listening & Recall',N'Practical Micro-Challenge',N'Protected Work'))
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [activity].[PracticeProgressionDecision] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [PracticeType] nvarchar(40) NOT NULL,
        [FromTier] smallint NOT NULL,
        [ToTier] smallint NOT NULL,
        [PolicyVersion] nvarchar(64) NOT NULL,
        [DecisionCode] nvarchar(32) NOT NULL,
        [DecidedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_PracticeProgressionDecision] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_PracticeProgressionDecision_Decision] CHECK ([DecisionCode] IN (N'Accepted',N'Stayed',N'SteppedDown')),
        CONSTRAINT [CK_PracticeProgressionDecision_Tiers] CHECK ([FromTier]>0 AND [ToTier]>0),
        CONSTRAINT [FK_PracticeProgressionDecision_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [recovery].[RecoveryJourney] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonId] bigint NOT NULL,
        [StartedAtUtc] datetime2(3) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_RecoveryJourney] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_RecoveryJourney_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_RecoveryJourney_Status] CHECK ([Status] IN (N'Active',N'Archived')),
        CONSTRAINT [FK_RecoveryJourney_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [activity].[RoutineCheckIn] (
        [Id] bigint NOT NULL IDENTITY,
        [RoutineId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [LocalDate] date NOT NULL,
        [State] nvarchar(16) NOT NULL,
        [EvidenceEventId] bigint NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_RoutineCheckIn] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_RoutineCheckIn_State] CHECK ([State] IN (N'Done',N'Skipped')),
        CONSTRAINT [FK_RoutineCheckIn_EvidenceEvent_EvidenceEventId_PersonId] FOREIGN KEY ([EvidenceEventId], [PersonId]) REFERENCES [evidence].[EvidenceEvent] ([Id], [SubjectPersonId]),
        CONSTRAINT [FK_RoutineCheckIn_OfflineRoutine_RoutineId_PersonId] FOREIGN KEY ([RoutineId], [PersonId]) REFERENCES [activity].[OfflineRoutine] ([Id], [PersonId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [activity].[PracticeVersion] (
        [Id] bigint NOT NULL IDENTITY,
        [DefinitionId] bigint NOT NULL,
        [VersionNo] int NOT NULL,
        [ContentRef] nvarchar(300) NOT NULL,
        [DifficultyTier] smallint NOT NULL,
        [EstimatedMinutes] smallint NULL,
        [EvidenceTier] nvarchar(32) NOT NULL,
        [ValidationVersion] nvarchar(64) NOT NULL,
        [PublishedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_PracticeVersion] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_PracticeVersion_No] CHECK ([VersionNo]>0),
        CONSTRAINT [CK_PracticeVersion_Tier] CHECK ([DifficultyTier]>0 AND ([EstimatedMinutes] IS NULL OR [EstimatedMinutes]>0)),
        CONSTRAINT [FK_PracticeVersion_PracticeDefinition_DefinitionId] FOREIGN KEY ([DefinitionId]) REFERENCES [activity].[PracticeDefinition] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [recovery].[RecoveryCycle] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [JourneyId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [CycleNo] int NOT NULL,
        [Status] nvarchar(32) NOT NULL,
        [StartLocalDate] date NULL,
        [EndLocalDate] date NULL,
        [TimeZoneId] nvarchar(80) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_RecoveryCycle] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_RecoveryCycle_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_RecoveryCycle_Dates] CHECK ([EndLocalDate] IS NULL OR ([StartLocalDate] IS NOT NULL AND [EndLocalDate]>=[StartLocalDate])),
        CONSTRAINT [CK_RecoveryCycle_No] CHECK ([CycleNo]>0),
        CONSTRAINT [CK_RecoveryCycle_Status] CHECK ([Status] IN (N'Draft',N'Preview',N'Active',N'ReviewDue',N'Ended',N'Reviewed',N'Paused',N'Cancelled')),
        CONSTRAINT [FK_RecoveryCycle_RecoveryJourney_JourneyId_PersonId] FOREIGN KEY ([JourneyId], [PersonId]) REFERENCES [recovery].[RecoveryJourney] ([Id], [PersonId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [recovery].[PlanRevision] (
        [Id] bigint NOT NULL IDENTITY,
        [CycleId] bigint NOT NULL,
        [RevisionNo] int NOT NULL,
        [GoalCode] nvarchar(64) NOT NULL,
        [PolicyVersion] nvarchar(64) NOT NULL,
        [EffectiveFromLocalDate] date NOT NULL,
        [Reason] nvarchar(500) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [AcceptedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_PlanRevision] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_PlanRevision_Id_CycleId] UNIQUE ([Id], [CycleId]),
        CONSTRAINT [CK_PlanRevision_Accepted] CHECK (([Status]=N'Draft' AND [AcceptedAtUtc] IS NULL) OR ([Status] IN (N'Accepted',N'Superseded') AND [AcceptedAtUtc] IS NOT NULL)),
        CONSTRAINT [CK_PlanRevision_No] CHECK ([RevisionNo]>0),
        CONSTRAINT [CK_PlanRevision_Status] CHECK ([Status] IN (N'Draft',N'Accepted',N'Superseded')),
        CONSTRAINT [FK_PlanRevision_RecoveryCycle_CycleId] FOREIGN KEY ([CycleId]) REFERENCES [recovery].[RecoveryCycle] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [recovery].[WeeklyReview] (
        [Id] bigint NOT NULL IDENTITY,
        [CycleId] bigint NOT NULL,
        [WeekNo] tinyint NOT NULL,
        [PlanRevisionId] bigint NOT NULL,
        [ManageabilityCode] nvarchar(40) NULL,
        [FitCode] nvarchar(40) NULL,
        [DecisionCode] nvarchar(40) NOT NULL,
        [ReviewedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_WeeklyReview] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_WeeklyReview_Week] CHECK ([WeekNo]>0),
        CONSTRAINT [FK_WeeklyReview_PlanRevision_PlanRevisionId_CycleId] FOREIGN KEY ([PlanRevisionId], [CycleId]) REFERENCES [recovery].[PlanRevision] ([Id], [CycleId]),
        CONSTRAINT [FK_WeeklyReview_RecoveryCycle_CycleId] FOREIGN KEY ([CycleId]) REFERENCES [recovery].[RecoveryCycle] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [activity].[PracticeAttempt] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [PersonId] bigint NOT NULL,
        [PracticeVersionId] bigint NOT NULL,
        [ScheduledActionId] bigint NULL,
        [Status] nvarchar(24) NOT NULL,
        [Valid] bit NULL,
        [OutcomeCode] nvarchar(40) NULL,
        [StartedAtUtc] datetime2(3) NOT NULL,
        [EndedAtUtc] datetime2(3) NULL,
        [EvidenceEventId] bigint NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_PracticeAttempt] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_PracticeAttempt_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_PracticeAttempt_Status] CHECK ([Status] IN (N'Started',N'Paused',N'Submitted',N'Completed',N'Invalid')),
        CONSTRAINT [CK_PracticeAttempt_Validity] CHECK (([Status] IN (N'Started',N'Paused',N'Submitted') AND [Valid] IS NULL) OR ([Status]=N'Completed' AND [Valid]=1 AND [EndedAtUtc] IS NOT NULL) OR ([Status]=N'Invalid' AND [Valid]=0 AND [EndedAtUtc] IS NOT NULL)),
        CONSTRAINT [FK_PracticeAttempt_EvidenceEvent_EvidenceEventId_PersonId] FOREIGN KEY ([EvidenceEventId], [PersonId]) REFERENCES [evidence].[EvidenceEvent] ([Id], [SubjectPersonId]),
        CONSTRAINT [FK_PracticeAttempt_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_PracticeAttempt_PracticeVersion_PracticeVersionId] FOREIGN KEY ([PracticeVersionId]) REFERENCES [activity].[PracticeVersion] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE TABLE [recovery].[ScheduledAction] (
        [Id] bigint NOT NULL IDENTITY,
        [CycleId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [PlanRevisionId] bigint NOT NULL,
        [PracticeVersionId] bigint NULL,
        [LocalDate] date NOT NULL,
        [ActionKind] nvarchar(32) NOT NULL,
        [Status] nvarchar(32) NOT NULL,
        [CompletedAttemptId] bigint NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ScheduledAction] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ScheduledAction_Id_PersonId] UNIQUE ([Id], [PersonId]),
        CONSTRAINT [CK_ScheduledAction_Practice] CHECK ([ActionKind]<>N'Practice' OR [PracticeVersionId] IS NOT NULL),
        CONSTRAINT [CK_ScheduledAction_Status] CHECK ([Status] IN (N'Due',N'Completed',N'Missed',N'Rescheduled',N'Cancelled')),
        CONSTRAINT [FK_ScheduledAction_PlanRevision_PlanRevisionId_CycleId] FOREIGN KEY ([PlanRevisionId], [CycleId]) REFERENCES [recovery].[PlanRevision] ([Id], [CycleId]),
        CONSTRAINT [FK_ScheduledAction_PracticeAttempt_CompletedAttemptId_PersonId] FOREIGN KEY ([CompletedAttemptId], [PersonId]) REFERENCES [activity].[PracticeAttempt] ([Id], [PersonId]),
        CONSTRAINT [FK_ScheduledAction_PracticeVersion_PracticeVersionId] FOREIGN KEY ([PracticeVersionId]) REFERENCES [activity].[PracticeVersion] ([Id]),
        CONSTRAINT [FK_ScheduledAction_RecoveryCycle_CycleId_PersonId] FOREIGN KEY ([CycleId], [PersonId]) REFERENCES [recovery].[RecoveryCycle] ([Id], [PersonId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_OfflineRoutine_PersonId_Status] ON [activity].[OfflineRoutine] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_PlanRevision_CycleId_EffectiveFromLocalDate] ON [recovery].[PlanRevision] ([CycleId], [EffectiveFromLocalDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PlanRevision_CycleId_RevisionNo] ON [recovery].[PlanRevision] ([CycleId], [RevisionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_PracticeAttempt_EvidenceEventId] ON [activity].[PracticeAttempt] ([EvidenceEventId]) WHERE [EvidenceEventId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_PracticeAttempt_EvidenceEventId_PersonId] ON [activity].[PracticeAttempt] ([EvidenceEventId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_PracticeAttempt_PersonId_StartedAtUtc] ON [activity].[PracticeAttempt] ([PersonId], [StartedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_PracticeAttempt_PracticeVersionId] ON [activity].[PracticeAttempt] ([PracticeVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PracticeAttempt_PublicId] ON [activity].[PracticeAttempt] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_PracticeAttempt_ScheduledActionId_PersonId] ON [activity].[PracticeAttempt] ([ScheduledActionId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PracticeDefinition_Code] ON [activity].[PracticeDefinition] ([Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_PracticeProgressionDecision_PersonId_PracticeType_DecidedAtUtc] ON [activity].[PracticeProgressionDecision] ([PersonId], [PracticeType], [DecidedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_PracticeVersion_DefinitionId_DifficultyTier] ON [activity].[PracticeVersion] ([DefinitionId], [DifficultyTier]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PracticeVersion_DefinitionId_VersionNo] ON [activity].[PracticeVersion] ([DefinitionId], [VersionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_RecoveryCycle_JourneyId] ON [recovery].[RecoveryCycle] ([JourneyId]) WHERE [Status] IN (N''Active'',N''ReviewDue'')');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RecoveryCycle_JourneyId_CycleNo] ON [recovery].[RecoveryCycle] ([JourneyId], [CycleNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_RecoveryCycle_JourneyId_PersonId] ON [recovery].[RecoveryCycle] ([JourneyId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RecoveryCycle_PublicId] ON [recovery].[RecoveryCycle] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_RecoveryJourney_PersonId] ON [recovery].[RecoveryJourney] ([PersonId]) WHERE [Status]=N''Active''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_RoutineCheckIn_EvidenceEventId_PersonId] ON [activity].[RoutineCheckIn] ([EvidenceEventId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RoutineCheckIn_RoutineId_LocalDate] ON [activity].[RoutineCheckIn] ([RoutineId], [LocalDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_RoutineCheckIn_RoutineId_PersonId] ON [activity].[RoutineCheckIn] ([RoutineId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_ScheduledAction_CompletedAttemptId_PersonId] ON [recovery].[ScheduledAction] ([CompletedAttemptId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_ScheduledAction_CycleId_LocalDate_Status] ON [recovery].[ScheduledAction] ([CycleId], [LocalDate], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_ScheduledAction_CycleId_PersonId] ON [recovery].[ScheduledAction] ([CycleId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_ScheduledAction_PlanRevisionId_CycleId] ON [recovery].[ScheduledAction] ([PlanRevisionId], [CycleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_ScheduledAction_PracticeVersionId] ON [recovery].[ScheduledAction] ([PracticeVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_WeeklyReview_CycleId_WeekNo] ON [recovery].[WeeklyReview] ([CycleId], [WeekNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    CREATE INDEX [IX_WeeklyReview_PlanRevisionId_CycleId] ON [recovery].[WeeklyReview] ([PlanRevisionId], [CycleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    ALTER TABLE [activity].[PracticeAttempt] ADD CONSTRAINT [FK_PracticeAttempt_ScheduledAction_ScheduledActionId_PersonId] FOREIGN KEY ([ScheduledActionId], [PersonId]) REFERENCES [recovery].[ScheduledAction] ([Id], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER recovery.TR_RecoveryJourney_Owner
ON recovery.RecoveryJourney AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.PersonId<>d.PersonId)
        THROW 57001, ''Recovery Journey person is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER recovery.TR_RecoveryCycle_Owner
ON recovery.RecoveryCycle AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
        WHERE i.JourneyId<>d.JourneyId OR i.PersonId<>d.PersonId)
        THROW 57002, ''Recovery Cycle owner is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER recovery.TR_PlanRevision_AcceptedImmutable
ON recovery.PlanRevision AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
        WHERE d.Status IN (N''Accepted'',N''Superseded'') AND (
          i.CycleId<>d.CycleId OR i.RevisionNo<>d.RevisionNo OR i.GoalCode<>d.GoalCode
          OR i.PolicyVersion<>d.PolicyVersion OR i.EffectiveFromLocalDate<>d.EffectiveFromLocalDate
          OR i.Reason<>d.Reason OR i.AcceptedAtUtc<>d.AcceptedAtUtc
          OR (d.Status=N''Superseded'' AND i.Status<>N''Superseded'')
          OR (d.Status=N''Accepted'' AND i.Status NOT IN (N''Accepted'',N''Superseded''))))
        THROW 57003, ''Accepted plan terms are immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER activity.TR_PracticeVersion_Immutable
ON activity.PracticeVersion AFTER UPDATE, DELETE
AS BEGIN THROW 57004, ''Practice version is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER recovery.TR_ScheduledAction_CompletionLink
ON recovery.ScheduledAction AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN activity.PracticeAttempt a ON a.Id=i.CompletedAttemptId
        WHERE a.ScheduledActionId<>i.Id OR a.ScheduledActionId IS NULL)
        THROW 57005, ''Completed attempt must belong to the scheduled action'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER activity.TR_PracticeAttempt_Schedule
ON activity.PracticeAttempt AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN recovery.ScheduledAction a ON a.Id=i.ScheduledActionId
        WHERE a.ActionKind<>N''Practice'' OR a.PracticeVersionId<>i.PracticeVersionId)
        THROW 57006, ''Practice attempt must match its scheduled practice'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER recovery.TR_WeeklyReview_Immutable
ON recovery.WeeklyReview AFTER UPDATE, DELETE
AS BEGIN THROW 57007, ''Weekly review is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER activity.TR_PracticeProgressionDecision_Immutable
ON activity.PracticeProgressionDecision AFTER UPDATE, DELETE
AS BEGIN THROW 57008, ''Practice progression decision is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101060117_RecoveryAndActivity'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101060117_RecoveryAndActivity', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE TABLE [coach].[GroupCoachAssignment] (
        [Id] bigint NOT NULL IDENTITY,
        [GroupId] bigint NOT NULL,
        [CoachPersonId] bigint NOT NULL,
        [InitiativeAppointmentId] bigint NULL,
        [AssignedByPersonId] bigint NOT NULL,
        [FromUtc] datetime2(3) NOT NULL,
        [ToUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_GroupCoachAssignment] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_GroupCoachAssignment_Times] CHECK ([ToUtc] IS NULL OR [ToUtc]>=[FromUtc]),
        CONSTRAINT [FK_GroupCoachAssignment_InitiativeStaffAppointment_InitiativeAppointmentId] FOREIGN KEY ([InitiativeAppointmentId]) REFERENCES [institution].[InitiativeStaffAppointment] ([Id]),
        CONSTRAINT [FK_GroupCoachAssignment_OperationalGroup_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [coach].[OperationalGroup] ([Id]),
        CONSTRAINT [FK_GroupCoachAssignment_Person_AssignedByPersonId] FOREIGN KEY ([AssignedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_GroupCoachAssignment_Person_CoachPersonId] FOREIGN KEY ([CoachPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE TABLE [coach].[InitiativeGroupPlacement] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NOT NULL,
        [GroupId] bigint NOT NULL,
        [MembershipId] bigint NOT NULL,
        [MovedByPersonId] bigint NOT NULL,
        [StartedAtUtc] datetime2(3) NOT NULL,
        [EndedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeGroupPlacement] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_InitiativeGroupPlacement_Times] CHECK ([EndedAtUtc] IS NULL OR [EndedAtUtc]>=[StartedAtUtc]),
        CONSTRAINT [FK_InitiativeGroupPlacement_InitiativeMembership_MembershipId_InitiativeId] FOREIGN KEY ([MembershipId], [InitiativeId]) REFERENCES [institution].[InitiativeMembership] ([Id], [InitiativeId]),
        CONSTRAINT [FK_InitiativeGroupPlacement_OperationalGroup_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [coach].[OperationalGroup] ([Id]),
        CONSTRAINT [FK_InitiativeGroupPlacement_Person_MovedByPersonId] FOREIGN KEY ([MovedByPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE TABLE [coach].[ProgramCompletion] (
        [Id] bigint NOT NULL IDENTITY,
        [ProgramId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [ProgramRevisionId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [EvaluatorPersonId] bigint NOT NULL,
        [EvidenceEventId] bigint NULL,
        [EvaluatedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProgramCompletion] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProgramCompletion_Status] CHECK ([Status] IN (N'Pending',N'Completed',N'NotMet',N'Corrected')),
        CONSTRAINT [FK_ProgramCompletion_CoachProgram_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [coach].[CoachProgram] ([Id]),
        CONSTRAINT [FK_ProgramCompletion_EvidenceEvent_EvidenceEventId_PersonId] FOREIGN KEY ([EvidenceEventId], [PersonId]) REFERENCES [evidence].[EvidenceEvent] ([Id], [SubjectPersonId]),
        CONSTRAINT [FK_ProgramCompletion_Person_EvaluatorPersonId] FOREIGN KEY ([EvaluatorPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProgramCompletion_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProgramCompletion_ProgramRevision_ProgramRevisionId_ProgramId] FOREIGN KEY ([ProgramRevisionId], [ProgramId]) REFERENCES [coach].[ProgramRevision] ([Id], [ProgramId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE TABLE [coach].[ProgramGroupInvitation] (
        [Id] bigint NOT NULL IDENTITY,
        [GroupId] bigint NOT NULL,
        [NormalizedEmail] nvarchar(320) NOT NULL,
        [TokenHash] varbinary(64) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [ExpiresAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProgramGroupInvitation] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProgramGroupInvitation_Status] CHECK ([Status] IN (N'Pending',N'Accepted',N'Declined',N'Expired',N'Revoked')),
        CONSTRAINT [FK_ProgramGroupInvitation_OperationalGroup_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [coach].[OperationalGroup] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE TABLE [coach].[ProgramGroupMembership] (
        [Id] bigint NOT NULL IDENTITY,
        [ProgramId] bigint NOT NULL,
        [GroupId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProgramGroupMembership] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProgramGroupMembership_Status] CHECK ([Status] IN (N'Active',N'Left',N'Removed',N'Completed')),
        CONSTRAINT [FK_ProgramGroupMembership_CoachProgram_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [coach].[CoachProgram] ([Id]),
        CONSTRAINT [FK_ProgramGroupMembership_OperationalGroup_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [coach].[OperationalGroup] ([Id]),
        CONSTRAINT [FK_ProgramGroupMembership_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_GroupCoachAssignment_AssignedByPersonId] ON [coach].[GroupCoachAssignment] ([AssignedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_GroupCoachAssignment_CoachPersonId_ToUtc] ON [coach].[GroupCoachAssignment] ([CoachPersonId], [ToUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_GroupCoachAssignment_GroupId_CoachPersonId] ON [coach].[GroupCoachAssignment] ([GroupId], [CoachPersonId]) WHERE [ToUtc] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_GroupCoachAssignment_InitiativeAppointmentId] ON [coach].[GroupCoachAssignment] ([InitiativeAppointmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_InitiativeGroupPlacement_GroupId] ON [coach].[InitiativeGroupPlacement] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_InitiativeGroupPlacement_InitiativeId_MembershipId] ON [coach].[InitiativeGroupPlacement] ([InitiativeId], [MembershipId]) WHERE [EndedAtUtc] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_InitiativeGroupPlacement_MembershipId_InitiativeId] ON [coach].[InitiativeGroupPlacement] ([MembershipId], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_InitiativeGroupPlacement_MovedByPersonId] ON [coach].[InitiativeGroupPlacement] ([MovedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_ProgramCompletion_EvaluatorPersonId] ON [coach].[ProgramCompletion] ([EvaluatorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_ProgramCompletion_EvidenceEventId_PersonId] ON [coach].[ProgramCompletion] ([EvidenceEventId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_ProgramCompletion_PersonId] ON [coach].[ProgramCompletion] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProgramCompletion_ProgramId_PersonId] ON [coach].[ProgramCompletion] ([ProgramId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_ProgramCompletion_ProgramId_Status] ON [coach].[ProgramCompletion] ([ProgramId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_ProgramCompletion_ProgramRevisionId_ProgramId] ON [coach].[ProgramCompletion] ([ProgramRevisionId], [ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ProgramGroupInvitation_GroupId_NormalizedEmail] ON [coach].[ProgramGroupInvitation] ([GroupId], [NormalizedEmail]) WHERE [Status]=N''Pending''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProgramGroupMembership_GroupId_PersonId] ON [coach].[ProgramGroupMembership] ([GroupId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_ProgramGroupMembership_PersonId_ProgramId] ON [coach].[ProgramGroupMembership] ([PersonId], [ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_ProgramGroupMembership_PersonId_Status] ON [coach].[ProgramGroupMembership] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    CREATE INDEX [IX_ProgramGroupMembership_ProgramId] ON [coach].[ProgramGroupMembership] ([ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    ALTER TABLE coach.InitiativeGroupPlacement WITH CHECK ADD CONSTRAINT FK_InitiativeGroupPlacement_Group_Initiative FOREIGN KEY (GroupId,InitiativeId) REFERENCES coach.OperationalGroup(Id,InitiativeId);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    ALTER TABLE coach.ProgramGroupMembership WITH CHECK ADD CONSTRAINT FK_ProgramGroupMembership_Group_Program FOREIGN KEY (GroupId,ProgramId) REFERENCES coach.OperationalGroup(Id,ProgramId);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER coach.TR_InitiativeGroupPlacement_Owner
ON coach.InitiativeGroupPlacement AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.OperationalGroup g ON g.Id=i.GroupId
       WHERE g.InitiativeId IS NULL OR g.InitiativeId<>i.InitiativeId)
       THROW 58001, ''Placement group must belong to the same Initiative'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.GroupId<>d.GroupId OR i.InitiativeId<>d.InitiativeId OR i.MembershipId<>d.MembershipId)
       THROW 58002, ''Placement identity is immutable; close and insert a new placement'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER coach.TR_ProgramGroupMembership_Owner
ON coach.ProgramGroupMembership AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.OperationalGroup g ON g.Id=i.GroupId
       WHERE g.ProgramId IS NULL OR g.ProgramId<>i.ProgramId)
       THROW 58003, ''Program membership group must belong to the same Program'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.GroupId<>d.GroupId OR i.ProgramId<>d.ProgramId OR i.PersonId<>d.PersonId)
       THROW 58004, ''Program membership owner is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER coach.TR_GroupCoachAssignment_Owner
ON coach.GroupCoachAssignment AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.OperationalGroup g ON g.Id=i.GroupId
       LEFT JOIN institution.InitiativeStaffAppointment a ON a.Id=i.InitiativeAppointmentId
       WHERE (g.InitiativeId IS NOT NULL AND
              (a.Id IS NULL OR a.InitiativeId<>g.InitiativeId OR a.PersonId<>i.CoachPersonId OR a.Role<>N''Coach'' OR a.Status<>N''Active''))
          OR (g.ProgramId IS NOT NULL AND i.InitiativeAppointmentId IS NOT NULL))
       THROW 58005, ''Coach assignment must match its group and active Initiative appointment'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.GroupId<>d.GroupId OR i.CoachPersonId<>d.CoachPersonId OR
             ISNULL(i.InitiativeAppointmentId,-1)<>ISNULL(d.InitiativeAppointmentId,-1))
       THROW 58006, ''Coach assignment owner is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER coach.TR_ProgramGroupInvitation_Parent
ON coach.ProgramGroupInvitation AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.OperationalGroup g ON g.Id=i.GroupId
       WHERE g.ProgramId IS NULL)
       THROW 58007, ''Program group invitation requires a Program group'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.GroupId<>d.GroupId)
       THROW 58008, ''Program group invitation parent is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093409_CoachParticipation'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101093409_CoachParticipation', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    IF SCHEMA_ID(N'task') IS NULL EXEC(N'CREATE SCHEMA [task];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE TABLE [task].[Assignment] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [GroupId] bigint NOT NULL,
        [AuthorPersonId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Assignment] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Assignment_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Cancelled',N'Closed')),
        CONSTRAINT [FK_Assignment_OperationalGroup_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [coach].[OperationalGroup] ([Id]),
        CONSTRAINT [FK_Assignment_Person_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE TABLE [task].[CoachReport] (
        [Id] bigint NOT NULL IDENTITY,
        [GroupId] bigint NOT NULL,
        [AuthorPersonId] bigint NOT NULL,
        [PeriodStart] date NOT NULL,
        [PeriodEnd] date NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [Narrative] nvarchar(max) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_CoachReport] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_CoachReport_Dates] CHECK ([PeriodEnd]>=[PeriodStart]),
        CONSTRAINT [CK_CoachReport_Status] CHECK ([Status] IN (N'Draft',N'Submitted')),
        CONSTRAINT [FK_CoachReport_OperationalGroup_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [coach].[OperationalGroup] ([Id]),
        CONSTRAINT [FK_CoachReport_Person_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE TABLE [task].[SupervisorReport] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NOT NULL,
        [AuthorPersonId] bigint NOT NULL,
        [PeriodStart] date NOT NULL,
        [PeriodEnd] date NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [Narrative] nvarchar(max) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_SupervisorReport] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_SupervisorReport_Dates] CHECK ([PeriodEnd]>=[PeriodStart]),
        CONSTRAINT [CK_SupervisorReport_Status] CHECK ([Status] IN (N'Draft',N'Submitted')),
        CONSTRAINT [FK_SupervisorReport_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]),
        CONSTRAINT [FK_SupervisorReport_Person_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE TABLE [task].[AssignmentRevision] (
        [Id] bigint NOT NULL IDENTITY,
        [AssignmentId] bigint NOT NULL,
        [RevisionNo] int NOT NULL,
        [PracticeVersionId] bigint NULL,
        [Instructions] nvarchar(max) NOT NULL,
        [ReviewMode] nvarchar(32) NOT NULL,
        [DueAtUtc] datetime2(3) NULL,
        [PublishedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_AssignmentRevision] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_AssignmentRevision_Id_AssignmentId] UNIQUE ([Id], [AssignmentId]),
        CONSTRAINT [CK_AssignmentRevision_No] CHECK ([RevisionNo]>0),
        CONSTRAINT [FK_AssignmentRevision_Assignment_AssignmentId] FOREIGN KEY ([AssignmentId]) REFERENCES [task].[Assignment] ([Id]),
        CONSTRAINT [FK_AssignmentRevision_PracticeVersion_PracticeVersionId] FOREIGN KEY ([PracticeVersionId]) REFERENCES [activity].[PracticeVersion] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE TABLE [task].[AssignmentRecipient] (
        [Id] bigint NOT NULL IDENTITY,
        [AssignmentId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [AssignedRevisionId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [LastAttemptNo] int NOT NULL,
        [AssignedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_AssignmentRecipient] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_AssignmentRecipient_Id_AssignmentId] UNIQUE ([Id], [AssignmentId]),
        CONSTRAINT [CK_AssignmentRecipient_Attempts] CHECK ([LastAttemptNo]>=0),
        CONSTRAINT [CK_AssignmentRecipient_Status] CHECK ([Status] IN (N'Assigned',N'Started',N'Submitted',N'Approved',N'Cancelled')),
        CONSTRAINT [FK_AssignmentRecipient_AssignmentRevision_AssignedRevisionId_AssignmentId] FOREIGN KEY ([AssignedRevisionId], [AssignmentId]) REFERENCES [task].[AssignmentRevision] ([Id], [AssignmentId]),
        CONSTRAINT [FK_AssignmentRecipient_Assignment_AssignmentId] FOREIGN KEY ([AssignmentId]) REFERENCES [task].[Assignment] ([Id]),
        CONSTRAINT [FK_AssignmentRecipient_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE TABLE [task].[SubmissionAttempt] (
        [Id] bigint NOT NULL IDENTITY,
        [RecipientId] bigint NOT NULL,
        [AttemptNo] int NOT NULL,
        [AssignmentRevisionId] bigint NOT NULL,
        [Body] nvarchar(max) NULL,
        [FileId] bigint NULL,
        [AssignmentId] bigint NOT NULL,
        [SubmittedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_SubmissionAttempt] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_SubmissionAttempt_No] CHECK ([AttemptNo]>0),
        CONSTRAINT [FK_SubmissionAttempt_AssignmentRecipient_RecipientId_AssignmentId] FOREIGN KEY ([RecipientId], [AssignmentId]) REFERENCES [task].[AssignmentRecipient] ([Id], [AssignmentId]),
        CONSTRAINT [FK_SubmissionAttempt_AssignmentRevision_AssignmentRevisionId_AssignmentId] FOREIGN KEY ([AssignmentRevisionId], [AssignmentId]) REFERENCES [task].[AssignmentRevision] ([Id], [AssignmentId]),
        CONSTRAINT [FK_SubmissionAttempt_SecureFile_FileId] FOREIGN KEY ([FileId]) REFERENCES [files].[SecureFile] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE TABLE [task].[ReviewDecision] (
        [Id] bigint NOT NULL IDENTITY,
        [AttemptId] bigint NOT NULL,
        [DecisionNo] int NOT NULL,
        [SupersedesId] bigint NULL,
        [ReviewerPersonId] bigint NOT NULL,
        [Decision] nvarchar(24) NOT NULL,
        [Feedback] nvarchar(2000) NULL,
        [RuleVersion] nvarchar(64) NULL,
        [EvidenceEventId] bigint NULL,
        [DecidedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ReviewDecision] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ReviewDecision_Id_AttemptId] UNIQUE ([Id], [AttemptId]),
        CONSTRAINT [CK_ReviewDecision_Decision] CHECK ([Decision] IN (N'Approved',N'NeedsRevision',N'Rejected')),
        CONSTRAINT [CK_ReviewDecision_No] CHECK ([DecisionNo]>0),
        CONSTRAINT [FK_ReviewDecision_EvidenceEvent_EvidenceEventId] FOREIGN KEY ([EvidenceEventId]) REFERENCES [evidence].[EvidenceEvent] ([Id]),
        CONSTRAINT [FK_ReviewDecision_Person_ReviewerPersonId] FOREIGN KEY ([ReviewerPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ReviewDecision_ReviewDecision_SupersedesId_AttemptId] FOREIGN KEY ([SupersedesId], [AttemptId]) REFERENCES [task].[ReviewDecision] ([Id], [AttemptId]),
        CONSTRAINT [FK_ReviewDecision_SubmissionAttempt_AttemptId] FOREIGN KEY ([AttemptId]) REFERENCES [task].[SubmissionAttempt] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE TABLE [task].[ReviewPrivateNote] (
        [Id] bigint NOT NULL IDENTITY,
        [DecisionId] bigint NOT NULL,
        [AuthorPersonId] bigint NOT NULL,
        [Note] nvarchar(max) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ReviewPrivateNote] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReviewPrivateNote_Person_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ReviewPrivateNote_ReviewDecision_DecisionId] FOREIGN KEY ([DecisionId]) REFERENCES [task].[ReviewDecision] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_Assignment_AuthorPersonId] ON [task].[Assignment] ([AuthorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_Assignment_GroupId_Status] ON [task].[Assignment] ([GroupId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Assignment_PublicId] ON [task].[Assignment] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_AssignmentRecipient_AssignedRevisionId_AssignmentId] ON [task].[AssignmentRecipient] ([AssignedRevisionId], [AssignmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AssignmentRecipient_AssignmentId_PersonId] ON [task].[AssignmentRecipient] ([AssignmentId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_AssignmentRecipient_PersonId_Status] ON [task].[AssignmentRecipient] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AssignmentRevision_AssignmentId_RevisionNo] ON [task].[AssignmentRevision] ([AssignmentId], [RevisionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_AssignmentRevision_PracticeVersionId] ON [task].[AssignmentRevision] ([PracticeVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_CoachReport_AuthorPersonId] ON [task].[CoachReport] ([AuthorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_CoachReport_GroupId_PeriodStart] ON [task].[CoachReport] ([GroupId], [PeriodStart]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReviewDecision_AttemptId_DecisionNo] ON [task].[ReviewDecision] ([AttemptId], [DecisionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_ReviewDecision_EvidenceEventId] ON [task].[ReviewDecision] ([EvidenceEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_ReviewDecision_ReviewerPersonId_DecidedAtUtc] ON [task].[ReviewDecision] ([ReviewerPersonId], [DecidedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ReviewDecision_SupersedesId] ON [task].[ReviewDecision] ([SupersedesId]) WHERE [SupersedesId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_ReviewDecision_SupersedesId_AttemptId] ON [task].[ReviewDecision] ([SupersedesId], [AttemptId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_ReviewPrivateNote_AuthorPersonId] ON [task].[ReviewPrivateNote] ([AuthorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_ReviewPrivateNote_DecisionId] ON [task].[ReviewPrivateNote] ([DecisionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_SubmissionAttempt_AssignmentRevisionId_AssignmentId] ON [task].[SubmissionAttempt] ([AssignmentRevisionId], [AssignmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_SubmissionAttempt_FileId] ON [task].[SubmissionAttempt] ([FileId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_SubmissionAttempt_RecipientId_AssignmentId] ON [task].[SubmissionAttempt] ([RecipientId], [AssignmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SubmissionAttempt_RecipientId_AttemptNo] ON [task].[SubmissionAttempt] ([RecipientId], [AttemptNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_SubmissionAttempt_RecipientId_SubmittedAtUtc] ON [task].[SubmissionAttempt] ([RecipientId], [SubmittedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_SupervisorReport_AuthorPersonId] ON [task].[SupervisorReport] ([AuthorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    CREATE INDEX [IX_SupervisorReport_InitiativeId_PeriodStart] ON [task].[SupervisorReport] ([InitiativeId], [PeriodStart]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER task.TR_AssignmentRecipient_Owner
ON task.AssignmentRecipient AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.AssignmentId<>d.AssignmentId OR i.PersonId<>d.PersonId)
       THROW 59001, ''Assignment recipient owner is immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN task.Assignment a ON a.Id=i.AssignmentId
       JOIN coach.OperationalGroup g ON g.Id=a.GroupId
       WHERE NOT EXISTS (SELECT 1 FROM deleted d WHERE d.Id=i.Id)
       AND NOT ((g.InitiativeId IS NOT NULL AND EXISTS (
           SELECT 1 FROM coach.InitiativeGroupPlacement p
           JOIN institution.InitiativeMembership m ON m.Id=p.MembershipId
           WHERE p.GroupId=g.Id AND p.InitiativeId=g.InitiativeId AND p.EndedAtUtc IS NULL
             AND m.PersonId=i.PersonId AND m.Status IN (N''Accepted'',N''Suspended''))
         OR (g.ProgramId IS NOT NULL AND EXISTS (
           SELECT 1 FROM coach.ProgramGroupMembership pm
           WHERE pm.GroupId=g.Id AND pm.ProgramId=g.ProgramId AND pm.PersonId=i.PersonId AND pm.Status=N''Active'')))))
       THROW 59002, ''Recipient is not an active member of the assignment group'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER task.TR_SubmissionAttempt_Guard
ON task.SubmissionAttempt AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted) THROW 59003, ''Submission attempt is append-only'', 1;
    IF EXISTS (SELECT 1 FROM inserted i
       JOIN task.AssignmentRecipient r ON r.Id=i.RecipientId
       LEFT JOIN files.SecureFile f ON f.Id=i.FileId
       WHERE i.AssignmentRevisionId<>r.AssignedRevisionId
          OR (i.FileId IS NOT NULL AND (f.OwnerPersonId IS NULL OR f.OwnerPersonId<>r.PersonId)))
       THROW 59004, ''Submission revision or file owner does not match recipient'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER task.TR_ReviewDecision_Guard
ON task.ReviewDecision AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted) THROW 59005, ''Review decision is append-only'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN task.SubmissionAttempt a ON a.Id=i.AttemptId
       JOIN task.AssignmentRecipient r ON r.Id=a.RecipientId
       JOIN evidence.EvidenceEvent ev ON ev.Id=i.EvidenceEventId
       WHERE ev.SubjectPersonId<>r.PersonId)
       THROW 59006, ''Review evidence must belong to submission recipient'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER task.TR_ReviewPrivateNote_Immutable
ON task.ReviewPrivateNote AFTER UPDATE, DELETE
AS BEGIN THROW 59007, ''Private review note is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER task.TR_AssignmentRevision_Immutable
ON task.AssignmentRevision AFTER UPDATE, DELETE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM deleted WHERE PublishedAtUtc IS NOT NULL)
       THROW 59008, ''Published assignment revision is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE task.SubmitAttempt
    @RecipientId bigint, @PersonId bigint, @Body nvarchar(max)=NULL, @FileId bigint=NULL,
    @AttemptId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @AssignmentId bigint, @RevisionId bigint, @LastNo int;
        SELECT @AssignmentId=r.AssignmentId,@RevisionId=r.AssignedRevisionId,@LastNo=r.LastAttemptNo
        FROM task.AssignmentRecipient r WITH (UPDLOCK,HOLDLOCK)
        JOIN task.Assignment a ON a.Id=r.AssignmentId
        WHERE r.Id=@RecipientId AND r.PersonId=@PersonId
          AND r.Status IN (N''Assigned'',N''Started'',N''Submitted'') AND a.Status=N''Published'';
        IF @AssignmentId IS NULL THROW 59009, ''Recipient is not eligible for submission'', 1;
        UPDATE task.AssignmentRecipient SET LastAttemptNo=@LastNo+1,Status=N''Submitted'',UpdatedAtUtc=SYSUTCDATETIME()
          WHERE Id=@RecipientId;
        INSERT task.SubmissionAttempt(RecipientId,AttemptNo,AssignmentRevisionId,Body,FileId,AssignmentId,SubmittedAtUtc)
          VALUES(@RecipientId,@LastNo+1,@RevisionId,@Body,@FileId,@AssignmentId,SYSUTCDATETIME());
        SET @AttemptId=CAST(SCOPE_IDENTITY() AS bigint);
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101093844_TaskWorkflow'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101093844_TaskWorkflow', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    IF SCHEMA_ID(N'community') IS NULL EXEC(N'CREATE SCHEMA [community];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE TABLE [community].[JointGoal] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [CreatorPersonId] bigint NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [TargetLocalDate] date NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_JointGoal] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_JointGoal_Status] CHECK ([Status] IN (N'Active',N'Completed',N'Closed')),
        CONSTRAINT [FK_JointGoal_Person_CreatorPersonId] FOREIGN KEY ([CreatorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE TABLE [community].[Post] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [AuthorPersonId] bigint NOT NULL,
        [Body] nvarchar(max) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [SharedEvidenceEventId] bigint NULL,
        [PublishedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Post] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Post_Published] CHECK ([Status]<>N'Published' OR [PublishedAtUtc] IS NOT NULL),
        CONSTRAINT [CK_Post_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Hidden',N'Removed')),
        CONSTRAINT [FK_Post_EvidenceEvent_SharedEvidenceEventId_AuthorPersonId] FOREIGN KEY ([SharedEvidenceEventId], [AuthorPersonId]) REFERENCES [evidence].[EvidenceEvent] ([Id], [SubjectPersonId]),
        CONSTRAINT [FK_Post_Person_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE TABLE [community].[JointGoalMember] (
        [Id] bigint NOT NULL IDENTITY,
        [GoalId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_JointGoalMember] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_JointGoalMember_GoalId_PersonId] UNIQUE ([GoalId], [PersonId]),
        CONSTRAINT [CK_JointGoalMember_Status] CHECK ([Status] IN (N'Invited',N'Active',N'Left')),
        CONSTRAINT [FK_JointGoalMember_JointGoal_GoalId] FOREIGN KEY ([GoalId]) REFERENCES [community].[JointGoal] ([Id]),
        CONSTRAINT [FK_JointGoalMember_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE TABLE [community].[Bookmark] (
        [Id] bigint NOT NULL IDENTITY,
        [PostId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Bookmark] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Bookmark_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_Bookmark_Post_PostId] FOREIGN KEY ([PostId]) REFERENCES [community].[Post] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE TABLE [community].[Comment] (
        [Id] bigint NOT NULL IDENTITY,
        [PostId] bigint NOT NULL,
        [AuthorPersonId] bigint NOT NULL,
        [Body] nvarchar(2000) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Comment] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Comment_Status] CHECK ([Status] IN (N'Published',N'Hidden',N'Removed')),
        CONSTRAINT [FK_Comment_Person_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_Comment_Post_PostId] FOREIGN KEY ([PostId]) REFERENCES [community].[Post] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE TABLE [community].[Reaction] (
        [Id] bigint NOT NULL IDENTITY,
        [PostId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [ReactionCode] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Reaction] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Reaction_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_Reaction_Post_PostId] FOREIGN KEY ([PostId]) REFERENCES [community].[Post] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE TABLE [community].[JointGoalCheckIn] (
        [Id] bigint NOT NULL IDENTITY,
        [GoalId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [Body] nvarchar(1000) NOT NULL,
        [LocalDate] date NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_JointGoalCheckIn] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JointGoalCheckIn_JointGoalMember_GoalId_PersonId] FOREIGN KEY ([GoalId], [PersonId]) REFERENCES [community].[JointGoalMember] ([GoalId], [PersonId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE TABLE [community].[ContentReport] (
        [Id] bigint NOT NULL IDENTITY,
        [PostId] bigint NULL,
        [CommentId] bigint NULL,
        [ReporterPersonId] bigint NOT NULL,
        [ReasonCode] nvarchar(40) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ContentReport] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ContentReport_Status] CHECK ([Status] IN (N'Submitted',N'Reviewing',N'Resolved')),
        CONSTRAINT [CK_ContentReport_Target] CHECK (([PostId] IS NOT NULL AND [CommentId] IS NULL) OR ([PostId] IS NULL AND [CommentId] IS NOT NULL)),
        CONSTRAINT [FK_ContentReport_Comment_CommentId] FOREIGN KEY ([CommentId]) REFERENCES [community].[Comment] ([Id]),
        CONSTRAINT [FK_ContentReport_Person_ReporterPersonId] FOREIGN KEY ([ReporterPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ContentReport_Post_PostId] FOREIGN KEY ([PostId]) REFERENCES [community].[Post] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE TABLE [community].[ModerationDecision] (
        [Id] bigint NOT NULL IDENTITY,
        [ReportId] bigint NOT NULL,
        [ModeratorPersonId] bigint NOT NULL,
        [Decision] nvarchar(24) NOT NULL,
        [Reason] nvarchar(1000) NOT NULL,
        [DecidedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ModerationDecision] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ModerationDecision_Decision] CHECK ([Decision] IN (N'Hide',N'Dismiss',N'Remove',N'Restore')),
        CONSTRAINT [FK_ModerationDecision_ContentReport_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [community].[ContentReport] ([Id]),
        CONSTRAINT [FK_ModerationDecision_Person_ModeratorPersonId] FOREIGN KEY ([ModeratorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_Bookmark_PersonId_CreatedAtUtc] ON [community].[Bookmark] ([PersonId], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Bookmark_PostId_PersonId] ON [community].[Bookmark] ([PostId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_Comment_AuthorPersonId] ON [community].[Comment] ([AuthorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_Comment_PostId_CreatedAtUtc] ON [community].[Comment] ([PostId], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_ContentReport_CommentId] ON [community].[ContentReport] ([CommentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_ContentReport_PostId] ON [community].[ContentReport] ([PostId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_ContentReport_ReporterPersonId] ON [community].[ContentReport] ([ReporterPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_ContentReport_Status_CreatedAtUtc] ON [community].[ContentReport] ([Status], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_JointGoal_CreatorPersonId_Status] ON [community].[JointGoal] ([CreatorPersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JointGoal_PublicId] ON [community].[JointGoal] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_JointGoalCheckIn_GoalId_LocalDate] ON [community].[JointGoalCheckIn] ([GoalId], [LocalDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_JointGoalCheckIn_GoalId_PersonId] ON [community].[JointGoalCheckIn] ([GoalId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_JointGoalMember_PersonId_Status] ON [community].[JointGoalMember] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_ModerationDecision_ModeratorPersonId] ON [community].[ModerationDecision] ([ModeratorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_ModerationDecision_ReportId_DecidedAtUtc] ON [community].[ModerationDecision] ([ReportId], [DecidedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_Post_AuthorPersonId_CreatedAtUtc] ON [community].[Post] ([AuthorPersonId], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Post_PublicId] ON [community].[Post] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_Post_SharedEvidenceEventId_AuthorPersonId] ON [community].[Post] ([SharedEvidenceEventId], [AuthorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_Post_Status_PublishedAtUtc] ON [community].[Post] ([Status], [PublishedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE INDEX [IX_Reaction_PersonId_CreatedAtUtc] ON [community].[Reaction] ([PersonId], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Reaction_PostId_PersonId_ReactionCode] ON [community].[Reaction] ([PostId], [PersonId], [ReactionCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER community.TR_Post_Owner
ON community.Post AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.AuthorPersonId<>d.AuthorPersonId)
       THROW 60001, ''Post author is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER community.TR_Comment_Owner
ON community.Comment AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.PostId<>d.PostId OR i.AuthorPersonId<>d.AuthorPersonId)
       THROW 60002, ''Comment owner and post are immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER community.TR_ContentReport_Owner
ON community.ContentReport AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.ReporterPersonId<>d.ReporterPersonId OR ISNULL(i.PostId,-1)<>ISNULL(d.PostId,-1)
          OR ISNULL(i.CommentId,-1)<>ISNULL(d.CommentId,-1))
       THROW 60003, ''Content report target and reporter are immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER community.TR_ModerationDecision_Immutable
ON community.ModerationDecision AFTER UPDATE, DELETE
AS BEGIN THROW 60004, ''Moderation decision is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER community.TR_JointGoalCheckIn_Guard
ON community.JointGoalCheckIn AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted) THROW 60005, ''Joint goal check-in is append-only'', 1;
    IF EXISTS (SELECT 1 FROM inserted i
       JOIN community.JointGoalMember m ON m.GoalId=i.GoalId AND m.PersonId=i.PersonId
       JOIN community.JointGoal g ON g.Id=i.GoalId
       WHERE m.Status<>N''Active'' OR g.Status<>N''Active'')
       THROW 60006, ''Joint goal check-in requires active goal membership'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094219_CommunityParticipation'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101094219_CommunityParticipation', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    IF SCHEMA_ID(N'session') IS NULL EXEC(N'CREATE SCHEMA [session];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[InitiativeCompletion] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NOT NULL,
        [MembershipId] bigint NOT NULL,
        [RuleRevisionId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [EvaluatorPersonId] bigint NOT NULL,
        [EvidenceEventId] bigint NULL,
        [EvaluatedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeCompletion] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_InitiativeCompletion_Status] CHECK ([Status] IN (N'Pending',N'Completed',N'NotMet',N'Corrected')),
        CONSTRAINT [FK_InitiativeCompletion_EvidenceEvent_EvidenceEventId] FOREIGN KEY ([EvidenceEventId]) REFERENCES [evidence].[EvidenceEvent] ([Id]),
        CONSTRAINT [FK_InitiativeCompletion_InitiativeMembership_MembershipId_InitiativeId] FOREIGN KEY ([MembershipId], [InitiativeId]) REFERENCES [institution].[InitiativeMembership] ([Id], [InitiativeId]),
        CONSTRAINT [FK_InitiativeCompletion_InitiativeRevision_RuleRevisionId_InitiativeId] FOREIGN KEY ([RuleRevisionId], [InitiativeId]) REFERENCES [institution].[InitiativeRevision] ([Id], [InitiativeId]),
        CONSTRAINT [FK_InitiativeCompletion_Person_EvaluatorPersonId] FOREIGN KEY ([EvaluatorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[Session] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [InstitutionId] bigint NOT NULL,
        [InitiativeId] bigint NULL,
        [Title] nvarchar(200) NOT NULL,
        [Mode] nvarchar(20) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [TimeZoneId] nvarchar(80) NOT NULL,
        [AttendanceRequired] bit NOT NULL,
        [StartAtUtc] datetime2(3) NOT NULL,
        [EndAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Session] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Session_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Cancelled',N'Completed')),
        CONSTRAINT [CK_Session_Times] CHECK ([EndAtUtc]>[StartAtUtc]),
        CONSTRAINT [FK_Session_Initiative_InitiativeId_InstitutionId] FOREIGN KEY ([InitiativeId], [InstitutionId]) REFERENCES [institution].[Initiative] ([Id], [InstitutionId]),
        CONSTRAINT [FK_Session_Institution_InstitutionId] FOREIGN KEY ([InstitutionId]) REFERENCES [institution].[Institution] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[InitiativeSessionDuty] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NOT NULL,
        [SessionId] bigint NOT NULL,
        [AppointmentId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [AssignedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeSessionDuty] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_InitiativeSessionDuty_Status] CHECK ([Status] IN (N'Active',N'Revoked')),
        CONSTRAINT [FK_InitiativeSessionDuty_InitiativeStaffAppointment_AppointmentId_InitiativeId] FOREIGN KEY ([AppointmentId], [InitiativeId]) REFERENCES [institution].[InitiativeStaffAppointment] ([Id], [InitiativeId]),
        CONSTRAINT [FK_InitiativeSessionDuty_Session_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [session].[Session] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[SessionCapacityPool] (
        [Id] bigint NOT NULL IDENTITY,
        [SessionId] bigint NOT NULL,
        [Mode] nvarchar(20) NOT NULL,
        [Capacity] int NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_SessionCapacityPool] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_SessionCapacityPool_Id_SessionId] UNIQUE ([Id], [SessionId]),
        CONSTRAINT [CK_SessionCapacityPool_Capacity] CHECK ([Capacity]>0),
        CONSTRAINT [FK_SessionCapacityPool_Session_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [session].[Session] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[SessionRevision] (
        [Id] bigint NOT NULL IDENTITY,
        [SessionId] bigint NOT NULL,
        [RevisionNo] int NOT NULL,
        [Venue] nvarchar(300) NULL,
        [ProtectedLinkRef] nvarchar(300) NULL,
        [CheckInBeforeMinutes] smallint NOT NULL,
        [CheckInAfterMinutes] smallint NOT NULL,
        [CompletionRuleRef] nvarchar(120) NOT NULL,
        [PublishedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_SessionRevision] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_SessionRevision_Id_SessionId] UNIQUE ([Id], [SessionId]),
        CONSTRAINT [CK_SessionRevision_No] CHECK ([RevisionNo]>0),
        CONSTRAINT [CK_SessionRevision_Window] CHECK ([CheckInBeforeMinutes]>=0 AND [CheckInAfterMinutes]>=0),
        CONSTRAINT [FK_SessionRevision_Session_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [session].[Session] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[StandaloneSessionSupervisorAppointment] (
        [Id] bigint NOT NULL IDENTITY,
        [SessionId] bigint NOT NULL,
        [PersonId] bigint NULL,
        [NormalizedEmail] nvarchar(320) NOT NULL,
        [InvitedByPersonId] bigint NOT NULL,
        [TokenHash] varbinary(64) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [ExpiresAtUtc] datetime2(3) NOT NULL,
        [AcceptedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_StandaloneSessionSupervisorAppointment] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_StandaloneSupervisor_Status] CHECK ([Status] IN (N'Pending',N'Active',N'Revoked',N'Expired')),
        CONSTRAINT [FK_StandaloneSessionSupervisorAppointment_Person_InvitedByPersonId] FOREIGN KEY ([InvitedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_StandaloneSessionSupervisorAppointment_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_StandaloneSessionSupervisorAppointment_Session_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [session].[Session] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[SessionRegistration] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [SessionId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [PoolId] bigint NOT NULL,
        [SessionRevisionId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CredentialHash] varbinary(32) NULL,
        [RegisteredAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_SessionRegistration] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_SessionRegistration_Id_PoolId] UNIQUE ([Id], [PoolId]),
        CONSTRAINT [AK_SessionRegistration_Id_SessionId_PersonId] UNIQUE ([Id], [SessionId], [PersonId]),
        CONSTRAINT [CK_SessionRegistration_Status] CHECK ([Status] IN (N'Pending',N'Confirmed',N'Cancelled',N'Completed')),
        CONSTRAINT [FK_SessionRegistration_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_SessionRegistration_SessionCapacityPool_PoolId_SessionId] FOREIGN KEY ([PoolId], [SessionId]) REFERENCES [session].[SessionCapacityPool] ([Id], [SessionId]),
        CONSTRAINT [FK_SessionRegistration_SessionRevision_SessionRevisionId_SessionId] FOREIGN KEY ([SessionRevisionId], [SessionId]) REFERENCES [session].[SessionRevision] ([Id], [SessionId]),
        CONSTRAINT [FK_SessionRegistration_Session_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [session].[Session] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[SessionAttendance] (
        [Id] bigint NOT NULL IDENTITY,
        [RegistrationId] bigint NOT NULL,
        [SessionId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [Method] nvarchar(24) NOT NULL,
        [RecordedByPersonId] bigint NOT NULL,
        [EvidenceEventId] bigint NULL,
        [RecordedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_SessionAttendance] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_SessionAttendance_Status] CHECK ([Status] IN (N'Present',N'Late',N'Absent',N'NotRecorded')),
        CONSTRAINT [FK_SessionAttendance_EvidenceEvent_EvidenceEventId_PersonId] FOREIGN KEY ([EvidenceEventId], [PersonId]) REFERENCES [evidence].[EvidenceEvent] ([Id], [SubjectPersonId]),
        CONSTRAINT [FK_SessionAttendance_Person_RecordedByPersonId] FOREIGN KEY ([RecordedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_SessionAttendance_SessionRegistration_RegistrationId_SessionId_PersonId] FOREIGN KEY ([RegistrationId], [SessionId], [PersonId]) REFERENCES [session].[SessionRegistration] ([Id], [SessionId], [PersonId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[AbsenceExcuse] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [AttendanceId] bigint NOT NULL,
        [SubmittedByPersonId] bigint NOT NULL,
        [Reason] nvarchar(1000) NOT NULL,
        [FileId] bigint NULL,
        [Recommendation] nvarchar(24) NULL,
        [RecommendedByPersonId] bigint NULL,
        [Decision] nvarchar(24) NULL,
        [DecidedByPersonId] bigint NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_AbsenceExcuse] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_AbsenceExcuse_Status] CHECK ([Status] IN (N'Submitted',N'MoreInfo',N'Recommended',N'Accepted',N'Rejected')),
        CONSTRAINT [FK_AbsenceExcuse_Person_DecidedByPersonId] FOREIGN KEY ([DecidedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_AbsenceExcuse_Person_RecommendedByPersonId] FOREIGN KEY ([RecommendedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_AbsenceExcuse_Person_SubmittedByPersonId] FOREIGN KEY ([SubmittedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_AbsenceExcuse_SecureFile_FileId] FOREIGN KEY ([FileId]) REFERENCES [files].[SecureFile] ([Id]),
        CONSTRAINT [FK_AbsenceExcuse_SessionAttendance_AttendanceId] FOREIGN KEY ([AttendanceId]) REFERENCES [session].[SessionAttendance] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE TABLE [session].[AttendanceCorrection] (
        [Id] bigint NOT NULL IDENTITY,
        [AttendanceId] bigint NOT NULL,
        [OldStatus] nvarchar(24) NOT NULL,
        [NewStatus] nvarchar(24) NOT NULL,
        [CorrectedByPersonId] bigint NOT NULL,
        [Reason] nvarchar(1000) NOT NULL,
        [CorrectedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_AttendanceCorrection] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_AttendanceCorrection_Status] CHECK ([OldStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded') AND [NewStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded')),
        CONSTRAINT [FK_AttendanceCorrection_Person_CorrectedByPersonId] FOREIGN KEY ([CorrectedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_AttendanceCorrection_SessionAttendance_AttendanceId] FOREIGN KEY ([AttendanceId]) REFERENCES [session].[SessionAttendance] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AbsenceExcuse_AttendanceId] ON [session].[AbsenceExcuse] ([AttendanceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_AbsenceExcuse_DecidedByPersonId] ON [session].[AbsenceExcuse] ([DecidedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_AbsenceExcuse_FileId] ON [session].[AbsenceExcuse] ([FileId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AbsenceExcuse_PublicId] ON [session].[AbsenceExcuse] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_AbsenceExcuse_RecommendedByPersonId] ON [session].[AbsenceExcuse] ([RecommendedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_AbsenceExcuse_Status_CreatedAtUtc] ON [session].[AbsenceExcuse] ([Status], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_AbsenceExcuse_SubmittedByPersonId] ON [session].[AbsenceExcuse] ([SubmittedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_AttendanceCorrection_AttendanceId_CorrectedAtUtc] ON [session].[AttendanceCorrection] ([AttendanceId], [CorrectedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_AttendanceCorrection_CorrectedByPersonId] ON [session].[AttendanceCorrection] ([CorrectedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_InitiativeCompletion_EvaluatorPersonId] ON [session].[InitiativeCompletion] ([EvaluatorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_InitiativeCompletion_EvidenceEventId] ON [session].[InitiativeCompletion] ([EvidenceEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeCompletion_MembershipId] ON [session].[InitiativeCompletion] ([MembershipId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_InitiativeCompletion_MembershipId_InitiativeId] ON [session].[InitiativeCompletion] ([MembershipId], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_InitiativeCompletion_RuleRevisionId_InitiativeId] ON [session].[InitiativeCompletion] ([RuleRevisionId], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_InitiativeCompletion_Status_EvaluatedAtUtc] ON [session].[InitiativeCompletion] ([Status], [EvaluatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_InitiativeSessionDuty_AppointmentId_InitiativeId] ON [session].[InitiativeSessionDuty] ([AppointmentId], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_InitiativeSessionDuty_AppointmentId_Status] ON [session].[InitiativeSessionDuty] ([AppointmentId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_InitiativeSessionDuty_SessionId_AppointmentId] ON [session].[InitiativeSessionDuty] ([SessionId], [AppointmentId]) WHERE [Status]=N''Active''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Session_Id_InitiativeId] ON [session].[Session] ([Id], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_Session_InitiativeId_InstitutionId] ON [session].[Session] ([InitiativeId], [InstitutionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_Session_InitiativeId_StartAtUtc] ON [session].[Session] ([InitiativeId], [StartAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_Session_InstitutionId_StartAtUtc] ON [session].[Session] ([InstitutionId], [StartAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Session_PublicId] ON [session].[Session] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_SessionAttendance_EvidenceEventId_PersonId] ON [session].[SessionAttendance] ([EvidenceEventId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_SessionAttendance_RecordedByPersonId] ON [session].[SessionAttendance] ([RecordedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SessionAttendance_RegistrationId] ON [session].[SessionAttendance] ([RegistrationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_SessionAttendance_RegistrationId_SessionId_PersonId] ON [session].[SessionAttendance] ([RegistrationId], [SessionId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SessionAttendance_SessionId_PersonId] ON [session].[SessionAttendance] ([SessionId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_SessionAttendance_SessionId_Status] ON [session].[SessionAttendance] ([SessionId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SessionCapacityPool_SessionId_Mode] ON [session].[SessionCapacityPool] ([SessionId], [Mode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_SessionRegistration_PersonId] ON [session].[SessionRegistration] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_SessionRegistration_PoolId_SessionId] ON [session].[SessionRegistration] ([PoolId], [SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SessionRegistration_PublicId] ON [session].[SessionRegistration] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SessionRegistration_SessionId_PersonId] ON [session].[SessionRegistration] ([SessionId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_SessionRegistration_SessionId_Status_PoolId] ON [session].[SessionRegistration] ([SessionId], [Status], [PoolId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_SessionRegistration_SessionRevisionId_SessionId] ON [session].[SessionRegistration] ([SessionRevisionId], [SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SessionRevision_SessionId_RevisionNo] ON [session].[SessionRevision] ([SessionId], [RevisionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_StandaloneSessionSupervisorAppointment_InvitedByPersonId] ON [session].[StandaloneSessionSupervisorAppointment] ([InvitedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    CREATE INDEX [IX_StandaloneSessionSupervisorAppointment_PersonId_Status] ON [session].[StandaloneSessionSupervisorAppointment] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_StandaloneSessionSupervisorAppointment_SessionId_PersonId] ON [session].[StandaloneSessionSupervisorAppointment] ([SessionId], [PersonId]) WHERE [Status]=N''Active''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    ALTER TABLE session.InitiativeSessionDuty WITH CHECK ADD CONSTRAINT FK_InitiativeSessionDuty_Session_Initiative FOREIGN KEY (SessionId,InitiativeId) REFERENCES session.Session(Id,InitiativeId);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER session.TR_SessionRevision_Immutable
ON session.SessionRevision AFTER UPDATE, DELETE
AS BEGIN THROW 61001, ''Session revision is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER session.TR_SessionCapacityPool_Capacity
ON session.SessionCapacityPool AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.SessionId<>d.SessionId OR i.Mode<>d.Mode)
       THROW 61002, ''Session capacity pool identity is immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Capacity <
       (SELECT COUNT_BIG(*) FROM session.SessionRegistration r WHERE r.PoolId=i.Id AND r.Status=N''Confirmed''))
       THROW 61003, ''Capacity cannot shrink below confirmed registrations'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER session.TR_SessionRegistration_Capacity
ON session.SessionRegistration AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.SessionId<>d.SessionId OR i.PersonId<>d.PersonId OR i.PoolId<>d.PoolId OR i.SessionRevisionId<>d.SessionRevisionId)
       THROW 61004, ''Session registration identity and pinned revision are immutable'', 1;
    IF EXISTS (SELECT 1 FROM session.SessionCapacityPool p WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT PoolId FROM inserted) i ON i.PoolId=p.Id
       WHERE (SELECT COUNT_BIG(*) FROM session.SessionRegistration r WHERE r.PoolId=p.Id AND r.Status=N''Confirmed'')>p.Capacity)
       THROW 61005, ''Session capacity exceeded'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER session.TR_InitiativeSessionDuty_Active
ON session.InitiativeSessionDuty AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN institution.InitiativeStaffAppointment a ON a.Id=i.AppointmentId
       WHERE i.Status=N''Active'' AND a.Status<>N''Active'')
       THROW 61006, ''Initiative session duty requires active staff appointment'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER session.TR_StandaloneSupervisor_Eligibility
ON session.StandaloneSessionSupervisorAppointment AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN session.Session s ON s.Id=i.SessionId WHERE s.InitiativeId IS NOT NULL)
       THROW 61007, ''Standalone supervisor requires standalone Session'', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Status=N''Active'' AND
       (i.PersonId IS NULL OR i.AcceptedAtUtc IS NULL OR NOT EXISTS (
          SELECT 1 FROM iam.PersonEmail e WHERE e.PersonId=i.PersonId AND e.NormalizedEmail=i.NormalizedEmail AND e.Status=N''Verified'')))
       THROW 61008, ''Active standalone supervisor requires matching verified email'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER session.TR_AttendanceCorrection_Immutable
ON session.AttendanceCorrection AFTER UPDATE, DELETE
AS BEGIN THROW 61009, ''Attendance correction is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER session.TR_AbsenceExcuse_Owner
ON session.AbsenceExcuse AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN session.SessionAttendance a ON a.Id=i.AttendanceId
       LEFT JOIN files.SecureFile f ON f.Id=i.FileId
       WHERE a.Status<>N''Absent'' OR i.SubmittedByPersonId<>a.PersonId
          OR (i.FileId IS NOT NULL AND (f.OwnerPersonId IS NULL OR f.OwnerPersonId<>a.PersonId)))
       THROW 61010, ''Absence excuse requires absent attendance and matching person/file'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER session.TR_InitiativeCompletion_EvidenceOwner
ON session.InitiativeCompletion AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN institution.InitiativeMembership m ON m.Id=i.MembershipId
       JOIN evidence.EvidenceEvent ev ON ev.Id=i.EvidenceEventId WHERE ev.SubjectPersonId<>m.PersonId)
       THROW 61011, ''Initiative completion evidence belongs to another person'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE session.RegisterConfirmed
    @SessionId bigint,@PersonId bigint,@PoolId bigint,@RegistrationId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Capacity int,@Confirmed bigint,@RevisionId bigint;
        SELECT @Capacity=p.Capacity FROM session.SessionCapacityPool p WITH (UPDLOCK,HOLDLOCK)
          JOIN session.Session s ON s.Id=p.SessionId
          WHERE p.Id=@PoolId AND p.SessionId=@SessionId AND s.Status=N''Published'';
        IF @Capacity IS NULL THROW 61012, ''Published Session capacity pool not found'', 1;
        SELECT @Confirmed=COUNT_BIG(*) FROM session.SessionRegistration WHERE PoolId=@PoolId AND Status=N''Confirmed'';
        IF @Confirmed>=@Capacity THROW 61005, ''Session capacity exceeded'', 1;
        SELECT TOP(1) @RevisionId=Id FROM session.SessionRevision WHERE SessionId=@SessionId ORDER BY RevisionNo DESC;
        IF @RevisionId IS NULL THROW 61013, ''Published Session revision not found'', 1;
        INSERT session.SessionRegistration(SessionId,PersonId,PoolId,SessionRevisionId,Status,RegisteredAtUtc)
          VALUES(@SessionId,@PersonId,@PoolId,@RevisionId,N''Confirmed'',SYSUTCDATETIME());
        SET @RegistrationId=CAST(SCOPE_IDENTITY() AS bigint);
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094534_SessionOperations'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101094534_SessionOperations', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    IF SCHEMA_ID(N'provider') IS NULL EXEC(N'CREATE SCHEMA [provider];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE TABLE [provider].[Provider] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [Name] nvarchar(200) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CountryCode] char(2) NOT NULL,
        [HeadquartersCity] nvarchar(120) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Provider] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Provider_Status] CHECK ([Status] IN (N'Applied',N'Approved',N'Suspended',N'Closed'))
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE TABLE [provider].[Experience] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [ProviderId] bigint NOT NULL,
        [Kind] nvarchar(24) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [Capacity] int NOT NULL,
        [TimeZoneId] nvarchar(80) NOT NULL,
        [StartAtUtc] datetime2(3) NOT NULL,
        [EndAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Experience] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Experience_CapacityTimes] CHECK ([Capacity]>0 AND [EndAtUtc]>[StartAtUtc]),
        CONSTRAINT [CK_Experience_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Active',N'Completed',N'Cancelled',N'Archived')),
        CONSTRAINT [FK_Experience_Provider_ProviderId] FOREIGN KEY ([ProviderId]) REFERENCES [provider].[Provider] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE TABLE [provider].[ProviderMembership] (
        [Id] bigint NOT NULL IDENTITY,
        [ProviderId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [Role] nvarchar(32) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [RevokedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProviderMembership] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProviderMembership_Revocation] CHECK (([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)),
        CONSTRAINT [CK_ProviderMembership_Status] CHECK ([Status] IN (N'Active',N'Revoked')),
        CONSTRAINT [FK_ProviderMembership_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProviderMembership_Provider_ProviderId] FOREIGN KEY ([ProviderId]) REFERENCES [provider].[Provider] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE TABLE [provider].[ProviderVerificationCase] (
        [Id] bigint NOT NULL IDENTITY,
        [ProviderId] bigint NOT NULL,
        [ApplicantPersonId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [EvidenceFileId] bigint NULL,
        [DecidedByPersonId] bigint NULL,
        [DecisionReason] nvarchar(1000) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProviderVerificationCase] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProviderVerification_Status] CHECK ([Status] IN (N'Submitted',N'MoreInfo',N'Approved',N'Rejected')),
        CONSTRAINT [FK_ProviderVerificationCase_Person_ApplicantPersonId] FOREIGN KEY ([ApplicantPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProviderVerificationCase_Person_DecidedByPersonId] FOREIGN KEY ([DecidedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProviderVerificationCase_Provider_ProviderId] FOREIGN KEY ([ProviderId]) REFERENCES [provider].[Provider] ([Id]),
        CONSTRAINT [FK_ProviderVerificationCase_SecureFile_EvidenceFileId] FOREIGN KEY ([EvidenceFileId]) REFERENCES [files].[SecureFile] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE TABLE [provider].[ExperienceRevision] (
        [Id] bigint NOT NULL IDENTITY,
        [ExperienceId] bigint NOT NULL,
        [RevisionNo] int NOT NULL,
        [Venue] nvarchar(300) NOT NULL,
        [SafetyRef] nvarchar(300) NOT NULL,
        [ConsentVersion] nvarchar(40) NOT NULL,
        [CostKind] nvarchar(16) NOT NULL,
        [Price] decimal(19,4) NULL,
        [Currency] char(3) NULL,
        [CompletionRuleRef] nvarchar(120) NOT NULL,
        [PublishedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ExperienceRevision] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ExperienceRevision_Id_ExperienceId] UNIQUE ([Id], [ExperienceId]),
        CONSTRAINT [CK_ExperienceRevision_Cost] CHECK (([CostKind]=N'Free' AND [Price] IS NULL AND [Currency] IS NULL) OR ([CostKind]=N'Paid' AND [Price]>0 AND [Currency] IS NOT NULL)),
        CONSTRAINT [CK_ExperienceRevision_No] CHECK ([RevisionNo]>0),
        CONSTRAINT [FK_ExperienceRevision_Experience_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE TABLE [provider].[ExperienceSession] (
        [Id] bigint NOT NULL IDENTITY,
        [ExperienceId] bigint NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Mode] nvarchar(20) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [StartsAtUtc] datetime2(3) NOT NULL,
        [EndsAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ExperienceSession] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ExperienceSession_Id_ExperienceId] UNIQUE ([Id], [ExperienceId]),
        CONSTRAINT [CK_ExperienceSession_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Cancelled',N'Closed')),
        CONSTRAINT [CK_ExperienceSession_Times] CHECK ([EndsAtUtc]>[StartsAtUtc]),
        CONSTRAINT [FK_ExperienceSession_Experience_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE TABLE [provider].[ExperienceBooking] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [ExperienceId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [RevisionId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [Mode] nvarchar(20) NOT NULL,
        [CredentialHash] varbinary(32) NULL,
        [CapacityReleasedAtUtc] datetime2(3) NULL,
        [BookedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ExperienceBooking] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ExperienceBooking_Id_ExperienceId] UNIQUE ([Id], [ExperienceId]),
        CONSTRAINT [CK_ExperienceBooking_Status] CHECK ([Status] IN (N'Queued',N'Offered',N'Confirmed',N'Cancelled',N'CheckedIn',N'Completed',N'Declined')),
        CONSTRAINT [FK_ExperienceBooking_ExperienceRevision_RevisionId_ExperienceId] FOREIGN KEY ([RevisionId], [ExperienceId]) REFERENCES [provider].[ExperienceRevision] ([Id], [ExperienceId]),
        CONSTRAINT [FK_ExperienceBooking_Experience_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]),
        CONSTRAINT [FK_ExperienceBooking_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE TABLE [provider].[SeatOffer] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [ExperienceId] bigint NOT NULL,
        [BookingId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [OfferedAtUtc] datetime2(3) NOT NULL,
        [ExpiresAtUtc] datetime2(3) NOT NULL,
        [DecisionAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_SeatOffer] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_SeatOffer_Id_ExperienceId] UNIQUE ([Id], [ExperienceId]),
        CONSTRAINT [CK_SeatOffer_Status] CHECK ([Status] IN (N'Offered',N'Accepted',N'Declined',N'Expired',N'Cancelled')),
        CONSTRAINT [CK_SeatOffer_Times] CHECK ([ExpiresAtUtc]>[OfferedAtUtc]),
        CONSTRAINT [FK_SeatOffer_ExperienceBooking_BookingId_ExperienceId] FOREIGN KEY ([BookingId], [ExperienceId]) REFERENCES [provider].[ExperienceBooking] ([Id], [ExperienceId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_Experience_ProviderId_Status] ON [provider].[Experience] ([ProviderId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Experience_PublicId] ON [provider].[Experience] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_Experience_Status_StartAtUtc] ON [provider].[Experience] ([Status], [StartAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ExperienceBooking_ExperienceId_PersonId] ON [provider].[ExperienceBooking] ([ExperienceId], [PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ExperienceBooking_ExperienceId_Status_BookedAtUtc] ON [provider].[ExperienceBooking] ([ExperienceId], [Status], [BookedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ExperienceBooking_PersonId] ON [provider].[ExperienceBooking] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ExperienceBooking_PublicId] ON [provider].[ExperienceBooking] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ExperienceBooking_RevisionId_ExperienceId] ON [provider].[ExperienceBooking] ([RevisionId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ExperienceRevision_ExperienceId_RevisionNo] ON [provider].[ExperienceRevision] ([ExperienceId], [RevisionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ExperienceSession_ExperienceId_StartsAtUtc] ON [provider].[ExperienceSession] ([ExperienceId], [StartsAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Provider_PublicId] ON [provider].[Provider] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_Provider_Status_Name] ON [provider].[Provider] ([Status], [Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ProviderMembership_PersonId_Status] ON [provider].[ProviderMembership] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ProviderMembership_ProviderId_PersonId_Role] ON [provider].[ProviderMembership] ([ProviderId], [PersonId], [Role]) WHERE [RevokedAtUtc] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ProviderVerificationCase_ApplicantPersonId] ON [provider].[ProviderVerificationCase] ([ApplicantPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ProviderVerificationCase_DecidedByPersonId] ON [provider].[ProviderVerificationCase] ([DecidedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ProviderVerificationCase_EvidenceFileId] ON [provider].[ProviderVerificationCase] ([EvidenceFileId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ProviderVerificationCase_ProviderId] ON [provider].[ProviderVerificationCase] ([ProviderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_ProviderVerificationCase_Status_CreatedAtUtc] ON [provider].[ProviderVerificationCase] ([Status], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_SeatOffer_BookingId] ON [provider].[SeatOffer] ([BookingId]) WHERE [Status]=N''Offered''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_SeatOffer_BookingId_ExperienceId] ON [provider].[SeatOffer] ([BookingId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE INDEX [IX_SeatOffer_ExperienceId_Status_ExpiresAtUtc] ON [provider].[SeatOffer] ([ExperienceId], [Status], [ExpiresAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SeatOffer_PublicId] ON [provider].[SeatOffer] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_ExperienceRevision_Immutable
ON provider.ExperienceRevision AFTER UPDATE, DELETE
AS BEGIN THROW 62001, ''Experience revision is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_Experience_Capacity
ON provider.Experience AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.ProviderId<>d.ProviderId)
       THROW 62002, ''Experience Provider is immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Capacity<
       (SELECT COUNT_BIG(*) FROM provider.ExperienceBooking b WHERE b.ExperienceId=i.Id
          AND b.Status IN (N''Confirmed'',N''CheckedIn'',N''Completed'') AND b.CapacityReleasedAtUtc IS NULL)
       +(SELECT COUNT_BIG(*) FROM provider.SeatOffer o WHERE o.ExperienceId=i.Id AND o.Status=N''Offered''))
       THROW 62003, ''Experience capacity cannot shrink below live claims'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_ExperienceBooking_Capacity
ON provider.ExperienceBooking AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.ExperienceId<>d.ExperienceId OR i.PersonId<>d.PersonId OR i.RevisionId<>d.RevisionId)
       THROW 62004, ''Booking owner and pinned revision are immutable'', 1;
    IF EXISTS (SELECT 1 FROM provider.Experience e WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT ExperienceId FROM inserted) i ON i.ExperienceId=e.Id
       WHERE (SELECT COUNT_BIG(*) FROM provider.ExperienceBooking b WHERE b.ExperienceId=e.Id
          AND b.Status IN (N''Confirmed'',N''CheckedIn'',N''Completed'') AND b.CapacityReleasedAtUtc IS NULL)
       +(SELECT COUNT_BIG(*) FROM provider.SeatOffer o WHERE o.ExperienceId=e.Id AND o.Status=N''Offered'')>e.Capacity)
       THROW 62005, ''Experience capacity exceeded'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_SeatOffer_Capacity
ON provider.SeatOffer AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.ExperienceId<>d.ExperienceId OR i.BookingId<>d.BookingId)
       THROW 62006, ''Seat offer owner is immutable'', 1;
    IF EXISTS (SELECT 1 FROM provider.Experience e WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT ExperienceId FROM inserted) i ON i.ExperienceId=e.Id
       WHERE (SELECT COUNT_BIG(*) FROM provider.ExperienceBooking b WHERE b.ExperienceId=e.Id
          AND b.Status IN (N''Confirmed'',N''CheckedIn'',N''Completed'') AND b.CapacityReleasedAtUtc IS NULL)
       +(SELECT COUNT_BIG(*) FROM provider.SeatOffer o WHERE o.ExperienceId=e.Id AND o.Status=N''Offered'')>e.Capacity)
       THROW 62005, ''Experience capacity exceeded'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE provider.BookConfirmed
    @ExperienceId bigint,@PersonId bigint,@Mode nvarchar(20),@BookingId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Capacity int,@Claims bigint,@RevisionId bigint;
        SELECT @Capacity=Capacity FROM provider.Experience WITH (UPDLOCK,HOLDLOCK)
          WHERE Id=@ExperienceId AND Status IN (N''Published'',N''Active'');
        IF @Capacity IS NULL THROW 62007, ''Published Experience not found'', 1;
        SELECT @Claims=(SELECT COUNT_BIG(*) FROM provider.ExperienceBooking
             WHERE ExperienceId=@ExperienceId AND Status IN (N''Confirmed'',N''CheckedIn'',N''Completed'') AND CapacityReleasedAtUtc IS NULL)
             +(SELECT COUNT_BIG(*) FROM provider.SeatOffer WHERE ExperienceId=@ExperienceId AND Status=N''Offered'');
        IF @Claims>=@Capacity THROW 62005, ''Experience capacity exceeded'', 1;
        SELECT TOP(1) @RevisionId=Id FROM provider.ExperienceRevision WHERE ExperienceId=@ExperienceId ORDER BY RevisionNo DESC;
        IF @RevisionId IS NULL THROW 62008, ''Published Experience revision not found'', 1;
        INSERT provider.ExperienceBooking(ExperienceId,PersonId,RevisionId,Status,Mode,BookedAtUtc)
          VALUES(@ExperienceId,@PersonId,@RevisionId,N''Confirmed'',@Mode,SYSUTCDATETIME());
        SET @BookingId=CAST(SCOPE_IDENTITY() AS bigint);
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101094901_ProviderFoundation'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101094901_ProviderFoundation', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE TABLE [provider].[CampCompletion] (
        [Id] bigint NOT NULL IDENTITY,
        [ExperienceId] bigint NOT NULL,
        [BookingId] bigint NOT NULL,
        [RuleRevisionId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [EvaluatorPersonId] bigint NOT NULL,
        [EvidenceEventId] bigint NULL,
        [EvaluatedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_CampCompletion] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_CampCompletion_Status] CHECK ([Status] IN (N'Pending',N'Completed',N'NotMet',N'Corrected')),
        CONSTRAINT [FK_CampCompletion_EvidenceEvent_EvidenceEventId] FOREIGN KEY ([EvidenceEventId]) REFERENCES [evidence].[EvidenceEvent] ([Id]),
        CONSTRAINT [FK_CampCompletion_ExperienceBooking_BookingId_ExperienceId] FOREIGN KEY ([BookingId], [ExperienceId]) REFERENCES [provider].[ExperienceBooking] ([Id], [ExperienceId]),
        CONSTRAINT [FK_CampCompletion_ExperienceRevision_RuleRevisionId_ExperienceId] FOREIGN KEY ([RuleRevisionId], [ExperienceId]) REFERENCES [provider].[ExperienceRevision] ([Id], [ExperienceId]),
        CONSTRAINT [FK_CampCompletion_Person_EvaluatorPersonId] FOREIGN KEY ([EvaluatorPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE TABLE [provider].[ProviderAttendance] (
        [Id] bigint NOT NULL IDENTITY,
        [ExperienceId] bigint NOT NULL,
        [BookingId] bigint NOT NULL,
        [SessionId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [Method] nvarchar(24) NOT NULL,
        [RecordedByPersonId] bigint NOT NULL,
        [EvidenceEventId] bigint NULL,
        [RecordedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProviderAttendance] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProviderAttendance_Status] CHECK ([Status] IN (N'Present',N'Late',N'Absent',N'NotRecorded')),
        CONSTRAINT [FK_ProviderAttendance_EvidenceEvent_EvidenceEventId] FOREIGN KEY ([EvidenceEventId]) REFERENCES [evidence].[EvidenceEvent] ([Id]),
        CONSTRAINT [FK_ProviderAttendance_ExperienceBooking_BookingId_ExperienceId] FOREIGN KEY ([BookingId], [ExperienceId]) REFERENCES [provider].[ExperienceBooking] ([Id], [ExperienceId]),
        CONSTRAINT [FK_ProviderAttendance_ExperienceSession_SessionId_ExperienceId] FOREIGN KEY ([SessionId], [ExperienceId]) REFERENCES [provider].[ExperienceSession] ([Id], [ExperienceId]),
        CONSTRAINT [FK_ProviderAttendance_Person_RecordedByPersonId] FOREIGN KEY ([RecordedByPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE TABLE [provider].[ProviderIncident] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [ExperienceId] bigint NOT NULL,
        [BookingId] bigint NULL,
        [ReportedByPersonId] bigint NOT NULL,
        [Summary] nvarchar(2000) NOT NULL,
        [FileId] bigint NULL,
        [Status] nvarchar(24) NOT NULL,
        [OccurredAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProviderIncident] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProviderIncident_Status] CHECK ([Status] IN (N'Open',N'Reviewed',N'Closed')),
        CONSTRAINT [FK_ProviderIncident_ExperienceBooking_BookingId_ExperienceId] FOREIGN KEY ([BookingId], [ExperienceId]) REFERENCES [provider].[ExperienceBooking] ([Id], [ExperienceId]),
        CONSTRAINT [FK_ProviderIncident_Experience_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]),
        CONSTRAINT [FK_ProviderIncident_Person_ReportedByPersonId] FOREIGN KEY ([ReportedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProviderIncident_SecureFile_FileId] FOREIGN KEY ([FileId]) REFERENCES [files].[SecureFile] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE TABLE [provider].[ProviderStaffInvitation] (
        [Id] bigint NOT NULL IDENTITY,
        [ExperienceId] bigint NOT NULL,
        [NormalizedEmail] nvarchar(320) NOT NULL,
        [TokenHash] varbinary(64) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [InvitedByPersonId] bigint NOT NULL,
        [ExpiresAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProviderStaffInvitation] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ProviderStaffInvitation_Id_ExperienceId] UNIQUE ([Id], [ExperienceId]),
        CONSTRAINT [CK_ProviderStaffInvitation_Status] CHECK ([Status] IN (N'Pending',N'Accepted',N'Expired',N'Revoked')),
        CONSTRAINT [FK_ProviderStaffInvitation_Experience_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]),
        CONSTRAINT [FK_ProviderStaffInvitation_Person_InvitedByPersonId] FOREIGN KEY ([InvitedByPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE TABLE [provider].[ProviderAttendanceCorrection] (
        [Id] bigint NOT NULL IDENTITY,
        [AttendanceId] bigint NOT NULL,
        [OldStatus] nvarchar(24) NOT NULL,
        [NewStatus] nvarchar(24) NOT NULL,
        [CorrectedByPersonId] bigint NOT NULL,
        [Reason] nvarchar(1000) NOT NULL,
        [CorrectedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ProviderAttendanceCorrection] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProviderAttendanceCorrection_Status] CHECK ([OldStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded') AND [NewStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded')),
        CONSTRAINT [FK_ProviderAttendanceCorrection_Person_CorrectedByPersonId] FOREIGN KEY ([CorrectedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProviderAttendanceCorrection_ProviderAttendance_AttendanceId] FOREIGN KEY ([AttendanceId]) REFERENCES [provider].[ProviderAttendance] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE TABLE [provider].[ProviderStaffAppointment] (
        [Id] bigint NOT NULL IDENTITY,
        [ExperienceId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [InvitationId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [AcceptedAtUtc] datetime2(3) NOT NULL,
        [RevokedAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProviderStaffAppointment] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ProviderStaffAppointment_Id_ExperienceId] UNIQUE ([Id], [ExperienceId]),
        CONSTRAINT [CK_ProviderStaffAppointment_Revoked] CHECK (([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)),
        CONSTRAINT [CK_ProviderStaffAppointment_Status] CHECK ([Status] IN (N'Active',N'Revoked')),
        CONSTRAINT [FK_ProviderStaffAppointment_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProviderStaffAppointment_ProviderStaffInvitation_InvitationId_ExperienceId] FOREIGN KEY ([InvitationId], [ExperienceId]) REFERENCES [provider].[ProviderStaffInvitation] ([Id], [ExperienceId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE TABLE [provider].[ProviderAppointmentSession] (
        [Id] bigint NOT NULL IDENTITY,
        [ExperienceId] bigint NOT NULL,
        [AppointmentId] bigint NOT NULL,
        [SessionId] bigint NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ProviderAppointmentSession] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProviderAppointmentSession_ExperienceSession_SessionId_ExperienceId] FOREIGN KEY ([SessionId], [ExperienceId]) REFERENCES [provider].[ExperienceSession] ([Id], [ExperienceId]),
        CONSTRAINT [FK_ProviderAppointmentSession_ProviderStaffAppointment_AppointmentId_ExperienceId] FOREIGN KEY ([AppointmentId], [ExperienceId]) REFERENCES [provider].[ProviderStaffAppointment] ([Id], [ExperienceId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE TABLE [provider].[ProviderCohort] (
        [Id] bigint NOT NULL IDENTITY,
        [ExperienceId] bigint NOT NULL,
        [SupervisorAppointmentId] bigint NOT NULL,
        [Name] nvarchar(160) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProviderCohort] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_ProviderCohort_Id_ExperienceId] UNIQUE ([Id], [ExperienceId]),
        CONSTRAINT [CK_ProviderCohort_Status] CHECK ([Status] IN (N'Active',N'Closed')),
        CONSTRAINT [FK_ProviderCohort_ProviderStaffAppointment_SupervisorAppointmentId_ExperienceId] FOREIGN KEY ([SupervisorAppointmentId], [ExperienceId]) REFERENCES [provider].[ProviderStaffAppointment] ([Id], [ExperienceId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE TABLE [provider].[ProviderCohortMember] (
        [Id] bigint NOT NULL IDENTITY,
        [CohortId] bigint NOT NULL,
        [BookingId] bigint NOT NULL,
        [ExperienceId] bigint NOT NULL,
        [JoinedAtUtc] datetime2(3) NOT NULL,
        [LeftAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProviderCohortMember] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProviderCohortMember_ExperienceBooking_BookingId_ExperienceId] FOREIGN KEY ([BookingId], [ExperienceId]) REFERENCES [provider].[ExperienceBooking] ([Id], [ExperienceId]),
        CONSTRAINT [FK_ProviderCohortMember_ProviderCohort_CohortId_ExperienceId] FOREIGN KEY ([CohortId], [ExperienceId]) REFERENCES [provider].[ProviderCohort] ([Id], [ExperienceId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CampCompletion_BookingId] ON [provider].[CampCompletion] ([BookingId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_CampCompletion_BookingId_ExperienceId] ON [provider].[CampCompletion] ([BookingId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_CampCompletion_EvaluatorPersonId] ON [provider].[CampCompletion] ([EvaluatorPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_CampCompletion_EvidenceEventId] ON [provider].[CampCompletion] ([EvidenceEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_CampCompletion_RuleRevisionId_ExperienceId] ON [provider].[CampCompletion] ([RuleRevisionId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_CampCompletion_Status_EvaluatedAtUtc] ON [provider].[CampCompletion] ([Status], [EvaluatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderAppointmentSession_AppointmentId_ExperienceId] ON [provider].[ProviderAppointmentSession] ([AppointmentId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProviderAppointmentSession_AppointmentId_SessionId] ON [provider].[ProviderAppointmentSession] ([AppointmentId], [SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderAppointmentSession_SessionId_ExperienceId] ON [provider].[ProviderAppointmentSession] ([SessionId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderAttendance_BookingId_ExperienceId] ON [provider].[ProviderAttendance] ([BookingId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProviderAttendance_BookingId_SessionId] ON [provider].[ProviderAttendance] ([BookingId], [SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderAttendance_EvidenceEventId] ON [provider].[ProviderAttendance] ([EvidenceEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderAttendance_RecordedByPersonId] ON [provider].[ProviderAttendance] ([RecordedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderAttendance_SessionId_ExperienceId] ON [provider].[ProviderAttendance] ([SessionId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderAttendance_SessionId_Status] ON [provider].[ProviderAttendance] ([SessionId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderAttendanceCorrection_AttendanceId_CorrectedAtUtc] ON [provider].[ProviderAttendanceCorrection] ([AttendanceId], [CorrectedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderAttendanceCorrection_CorrectedByPersonId] ON [provider].[ProviderAttendanceCorrection] ([CorrectedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderCohort_ExperienceId_Status] ON [provider].[ProviderCohort] ([ExperienceId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderCohort_SupervisorAppointmentId_ExperienceId] ON [provider].[ProviderCohort] ([SupervisorAppointmentId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ProviderCohortMember_BookingId] ON [provider].[ProviderCohortMember] ([BookingId]) WHERE [LeftAtUtc] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderCohortMember_BookingId_ExperienceId] ON [provider].[ProviderCohortMember] ([BookingId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderCohortMember_CohortId_ExperienceId] ON [provider].[ProviderCohortMember] ([CohortId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderCohortMember_CohortId_LeftAtUtc] ON [provider].[ProviderCohortMember] ([CohortId], [LeftAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderIncident_BookingId_ExperienceId] ON [provider].[ProviderIncident] ([BookingId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderIncident_ExperienceId_OccurredAtUtc] ON [provider].[ProviderIncident] ([ExperienceId], [OccurredAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderIncident_FileId] ON [provider].[ProviderIncident] ([FileId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProviderIncident_PublicId] ON [provider].[ProviderIncident] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderIncident_ReportedByPersonId] ON [provider].[ProviderIncident] ([ReportedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ProviderStaffAppointment_ExperienceId_PersonId] ON [provider].[ProviderStaffAppointment] ([ExperienceId], [PersonId]) WHERE [Status]=N''Active''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderStaffAppointment_InvitationId_ExperienceId] ON [provider].[ProviderStaffAppointment] ([InvitationId], [ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderStaffAppointment_PersonId_Status] ON [provider].[ProviderStaffAppointment] ([PersonId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ProviderStaffInvitation_ExperienceId_NormalizedEmail] ON [provider].[ProviderStaffInvitation] ([ExperienceId], [NormalizedEmail]) WHERE [Status]=N''Pending''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    CREATE INDEX [IX_ProviderStaffInvitation_InvitedByPersonId] ON [provider].[ProviderStaffInvitation] ([InvitedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_ProviderStaffAppointment_Eligibility
ON provider.ProviderStaffAppointment AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ProviderStaffInvitation v ON v.Id=i.InvitationId
       WHERE i.Status=N''Active'' AND (i.AcceptedAtUtc IS NULL OR v.ExpiresAtUtc<=i.AcceptedAtUtc
          OR NOT EXISTS (SELECT 1 FROM iam.PersonEmail e WHERE e.PersonId=i.PersonId
            AND e.NormalizedEmail=v.NormalizedEmail AND e.Status=N''Verified'')))
       THROW 63001, ''Provider appointment requires unexpired invitation and verified matching email'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_ProviderAppointmentSession_Active
ON provider.ProviderAppointmentSession AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ProviderStaffAppointment a ON a.Id=i.AppointmentId
       WHERE a.Status<>N''Active'')
       THROW 63002, ''Session assignment requires active Provider appointment'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_ProviderCohort_Supervisor
ON provider.ProviderCohort AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ProviderStaffAppointment a ON a.Id=i.SupervisorAppointmentId
       WHERE i.Status=N''Active'' AND a.Status<>N''Active'')
       THROW 63003, ''Active cohort requires active supervisor appointment'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_ProviderCohortMember_Booking
ON provider.ProviderCohortMember AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ExperienceBooking b ON b.Id=i.BookingId
       WHERE i.LeftAtUtc IS NULL AND b.Status NOT IN (N''Confirmed'',N''CheckedIn''))
       THROW 63004, ''Active cohort member requires confirmed booking'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.BookingId<>d.BookingId OR i.CohortId<>d.CohortId OR i.ExperienceId<>d.ExperienceId)
       THROW 63005, ''Cohort member identity is immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_ProviderAttendance_Ownership
ON provider.ProviderAttendance AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ExperienceBooking b ON b.Id=i.BookingId
       JOIN evidence.EvidenceEvent ev ON ev.Id=i.EvidenceEventId WHERE ev.SubjectPersonId<>b.PersonId)
       THROW 63006, ''Provider attendance evidence belongs to another person'', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE NOT EXISTS (
       SELECT 1 FROM provider.ProviderAppointmentSession ps
       JOIN provider.ProviderStaffAppointment a ON a.Id=ps.AppointmentId
       WHERE ps.SessionId=i.SessionId AND ps.ExperienceId=i.ExperienceId
         AND a.PersonId=i.RecordedByPersonId AND a.Status=N''Active''))
       THROW 63007, ''Attendance recorder must be assigned to this Experience Session'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_ProviderAttendanceCorrection_Immutable
ON provider.ProviderAttendanceCorrection AFTER UPDATE, DELETE
AS BEGIN THROW 63008, ''Provider attendance correction is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER provider.TR_CampCompletion_EvidenceOwner
ON provider.CampCompletion AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ExperienceBooking b ON b.Id=i.BookingId
       JOIN evidence.EvidenceEvent ev ON ev.Id=i.EvidenceEventId WHERE ev.SubjectPersonId<>b.PersonId)
       THROW 63009, ''Camp completion evidence belongs to another person'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095150_ProviderOperations'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101095150_ProviderOperations', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    CREATE TABLE [institution].[InitiativeContent] (
        [Id] bigint NOT NULL IDENTITY,
        [InitiativeId] bigint NOT NULL,
        [ContentReleaseId] bigint NOT NULL,
        [SortOrder] smallint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeContent] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_InitiativeContent_Order] CHECK ([SortOrder]>0),
        CONSTRAINT [CK_InitiativeContent_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Removed')),
        CONSTRAINT [FK_InitiativeContent_ContentRelease_ContentReleaseId] FOREIGN KEY ([ContentReleaseId]) REFERENCES [governance].[ContentRelease] ([Id]),
        CONSTRAINT [FK_InitiativeContent_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    CREATE TABLE [institution].[InitiativeSeatOffer] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [ApplicationId] bigint NOT NULL,
        [InitiativeId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [OfferedAtUtc] datetime2(3) NOT NULL,
        [ExpiresAtUtc] datetime2(3) NOT NULL,
        [DecisionAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_InitiativeSeatOffer] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_InitiativeSeatOffer_Id_InitiativeId] UNIQUE ([Id], [InitiativeId]),
        CONSTRAINT [CK_InitiativeSeatOffer_Status] CHECK ([Status] IN (N'Offered',N'Accepted',N'Declined',N'Expired',N'Cancelled')),
        CONSTRAINT [CK_InitiativeSeatOffer_Times] CHECK ([ExpiresAtUtc]>[OfferedAtUtc]),
        CONSTRAINT [FK_InitiativeSeatOffer_InitiativeApplication_ApplicationId_InitiativeId] FOREIGN KEY ([ApplicationId], [InitiativeId]) REFERENCES [institution].[InitiativeApplication] ([Id], [InitiativeId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    CREATE INDEX [IX_InitiativeContent_ContentReleaseId] ON [institution].[InitiativeContent] ([ContentReleaseId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeContent_InitiativeId_SortOrder_ContentReleaseId] ON [institution].[InitiativeContent] ([InitiativeId], [SortOrder], [ContentReleaseId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    CREATE INDEX [IX_InitiativeContent_InitiativeId_Status] ON [institution].[InitiativeContent] ([InitiativeId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_InitiativeSeatOffer_ApplicationId] ON [institution].[InitiativeSeatOffer] ([ApplicationId]) WHERE [Status]=N''Offered''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    CREATE INDEX [IX_InitiativeSeatOffer_ApplicationId_InitiativeId] ON [institution].[InitiativeSeatOffer] ([ApplicationId], [InitiativeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    CREATE INDEX [IX_InitiativeSeatOffer_InitiativeId_Status_ExpiresAtUtc] ON [institution].[InitiativeSeatOffer] ([InitiativeId], [Status], [ExpiresAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_InitiativeSeatOffer_PublicId] ON [institution].[InitiativeSeatOffer] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER institution.TR_InitiativeSeatOffer_Capacity
ON institution.InitiativeSeatOffer AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.ApplicationId<>d.ApplicationId OR i.InitiativeId<>d.InitiativeId
          OR (d.Status IN (N''Accepted'',N''Declined'',N''Expired'',N''Cancelled'') AND i.Status<>d.Status))
       THROW 64001, ''Seat offer owner or terminal status is immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN institution.Initiative a ON a.Id=i.InitiativeId
       JOIN institution.InitiativeApplication app ON app.Id=i.ApplicationId
       WHERE i.Status=N''Offered'' AND (a.Status<>N''Published'' OR app.Status<>N''Offered''))
       THROW 64002, ''Live seat offer requires published Initiative and offered application'', 1;
    IF EXISTS (SELECT 1 FROM institution.Initiative a WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT InitiativeId FROM inserted) i ON i.InitiativeId=a.Id
       WHERE (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership m
             WHERE m.InitiativeId=a.Id AND m.CapacityReleasedAtUtc IS NULL)
         +(SELECT COUNT_BIG(*) FROM institution.InitiativeSeatOffer o
             WHERE o.InitiativeId=a.Id AND o.Status=N''Offered'')>a.Capacity)
       THROW 64003, ''Initiative capacity exceeded by active memberships and offers'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER institution.TR_Initiative_CancelOffers
ON institution.Initiative AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Closed TABLE (PublicId uniqueidentifier,InitiativeId bigint);
    UPDATE o SET Status=N''Cancelled'',DecisionAtUtc=i.CancelledAtUtc,UpdatedAtUtc=i.CancelledAtUtc
       OUTPUT inserted.PublicId,inserted.InitiativeId INTO @Closed
      FROM institution.InitiativeSeatOffer o JOIN inserted i ON i.Id=o.InitiativeId
      JOIN deleted d ON d.Id=i.Id WHERE i.Status=N''Cancelled'' AND d.Status<>N''Cancelled'' AND o.Status=N''Offered'';
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,Reason,AtUtc,CorrelationId)
      SELECT i.CancelledByPersonId,N''InitiativeSeatOffer'',c.PublicId,N''InitiativeCancelled'',N''Offered'',N''Cancelled'',
             i.CancellationReason,i.CancelledAtUtc,NEWID()
        FROM @Closed c JOIN inserted i ON i.Id=c.InitiativeId;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER institution.TR_InitiativeContent_Publish
ON institution.InitiativeContent AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted c JOIN institution.Initiative i ON i.Id=c.InitiativeId
       WHERE c.Status=N''Published'' AND i.Status<>N''Published'')
       THROW 64004, ''Published Initiative content requires published Initiative'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.ApproveApplication
    @ApplicationId bigint,@ActorPersonId bigint,@MembershipId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@PersonId bigint,@InstitutionId bigint,@Capacity smallint,
        @Status nvarchar(24),@TermsRevisionId bigint,@Cutoff datetime2(3),@ApplicationPublicId uniqueidentifier;
    SELECT @InitiativeId=InitiativeId,@PersonId=PersonId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    IF @InitiativeId IS NULL THROW 51206, ''Application not found'', 1;
    SELECT @InstitutionId=InstitutionId,@Capacity=Capacity,@Status=Status
        FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @Status<>N''Published'' THROW 51201, ''Initiative is not open'', 1;
    IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'')
       AND NOT EXISTS (SELECT 1 FROM institution.InitiativeStaffAppointment WHERE InitiativeId=@InitiativeId AND PersonId=@ActorPersonId AND Role=N''Supervisor'' AND Status=N''Active'')
        THROW 51209, ''Actor has no current admission authority'', 1;
    SELECT @Status=Status,@TermsRevisionId=TermsRevisionId,@ApplicationPublicId=PublicId
        FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
    IF @Status=N''Accepted''
    BEGIN
        SELECT @MembershipId=Id FROM institution.InitiativeMembership WHERE ApplicationId=@ApplicationId;
        IF @MembershipId IS NULL THROW 51210, ''Accepted application has no membership'', 1;
        COMMIT; RETURN;
    END;
    IF @Status NOT IN (N''Pending'',N''Queued'',N''Offered'') THROW 51208, ''Application is not pending'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND PersonId=@PersonId)
        THROW 51203, ''Rejoining this initiative is not approved'', 1;
    IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE PersonId=@PersonId AND Status IN (N''Accepted'',N''Suspended''))
        THROW 51211, ''Person already has an active initiative membership'', 1;
    UPDATE institution.InitiativeSeatOffer SET Status=N''Accepted'',DecisionAtUtc=SYSUTCDATETIME(),UpdatedAtUtc=SYSUTCDATETIME()
      WHERE InitiativeId=@InitiativeId AND ApplicationId=@ApplicationId AND Status=N''Offered'';
    IF (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND CapacityReleasedAtUtc IS NULL)
       +(SELECT COUNT_BIG(*) FROM institution.InitiativeSeatOffer WHERE InitiativeId=@InitiativeId AND Status=N''Offered'')>=@Capacity
        THROW 51212, ''Initiative capacity is full'', 1;
    SELECT @Cutoff=WithdrawalCutoffAtUtc FROM institution.InitiativeRevision WHERE Id=@TermsRevisionId AND InitiativeId=@InitiativeId;
    SELECT @Cutoff=CASE WHEN WithdrawalCutoffAtUtc>@Cutoff THEN WithdrawalCutoffAtUtc ELSE @Cutoff END
      FROM institution.Initiative WHERE Id=@InitiativeId;
    INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc)
        VALUES(@InitiativeId,@ApplicationId,@PersonId,N''Accepted'',SYSUTCDATETIME(),@Cutoff);
    SET @MembershipId=SCOPE_IDENTITY();
    UPDATE institution.InitiativeApplication SET Status=N''Accepted'',UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ApplicationId;
    INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,TermsRevisionId,AtUtc)
        SELECT @ApplicationId,@InitiativeId,COALESCE(MAX(DecisionNo),0)+1,N''Approved'',@ActorPersonId,@TermsRevisionId,SYSUTCDATETIME()
        FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@ApplicationId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N''Application'',@ApplicationPublicId,N''Approved'',N''Accepted'',SYSUTCDATETIME(),NEWID());
    COMMIT;
    END TRY
    BEGIN CATCH
        DECLARE @DeniedError int=ERROR_NUMBER();
        IF XACT_STATE()<>0 ROLLBACK;
        IF @DeniedError=51209
            INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,Reason,AtUtc,CorrelationId)
                SELECT @ActorPersonId,N''Application'',PublicId,N''AdmissionDenied'',N''No current admission authority'',SYSUTCDATETIME(),NEWID()
                FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        THROW;
    END CATCH;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095514_InstitutionExtensions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101095514_InstitutionExtensions', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095826_SerializedInitiativeSeatOffers'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095826_SerializedInitiativeSeatOffers'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE institution.CreateSeatOffer
    @ApplicationId bigint,@ActorPersonId bigint,@ExpiresAtUtc datetime2(3),@OfferId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@InstitutionId bigint,@Capacity smallint,@InitiativeStatus nvarchar(24),
                @ApplicationStatus nvarchar(24),@ApplicationPublicId uniqueidentifier,@Now datetime2(3)=SYSUTCDATETIME();
        SELECT @InitiativeId=InitiativeId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        IF @InitiativeId IS NULL THROW 64005, ''Application not found'', 1;
        SELECT @InstitutionId=InstitutionId,@Capacity=Capacity,@InitiativeStatus=Status
          FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        IF @InitiativeStatus<>N''Published'' THROW 64006, ''Initiative is not published'', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership
            WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N''Active'' AND RevokedAtUtc IS NULL)
          AND NOT EXISTS (SELECT 1 FROM institution.InitiativeStaffAppointment
            WHERE InitiativeId=@InitiativeId AND PersonId=@ActorPersonId AND Role=N''Supervisor'' AND Status=N''Active'')
            THROW 64007, ''Actor has no seat-offer authority'', 1;
        IF @ExpiresAtUtc IS NULL OR @ExpiresAtUtc<=@Now THROW 64008, ''Offer expiry must be in the future'', 1;
        SELECT @ApplicationStatus=Status,@ApplicationPublicId=PublicId
          FROM institution.InitiativeApplication WITH (UPDLOCK,HOLDLOCK) WHERE Id=@ApplicationId;
        IF @ApplicationStatus NOT IN (N''Pending'',N''Queued'') THROW 64009, ''Application cannot receive a new offer'', 1;
        IF (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND CapacityReleasedAtUtc IS NULL)
          +(SELECT COUNT_BIG(*) FROM institution.InitiativeSeatOffer WHERE InitiativeId=@InitiativeId AND Status=N''Offered'')>=@Capacity
            THROW 64003, ''Initiative capacity exceeded by active memberships and offers'', 1;
        UPDATE institution.InitiativeApplication SET Status=N''Offered'',UpdatedAtUtc=@Now WHERE Id=@ApplicationId;
        INSERT institution.InitiativeSeatOffer(InitiativeId,ApplicationId,Status,OfferedAtUtc,ExpiresAtUtc)
          VALUES(@InitiativeId,@ApplicationId,N''Offered'',@Now,@ExpiresAtUtc);
        SET @OfferId=CAST(SCOPE_IDENTITY() AS bigint);
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
          VALUES(@ActorPersonId,N''Application'',@ApplicationPublicId,N''SeatOffered'',@ApplicationStatus,N''Offered'',@Now,NEWID());
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101095826_SerializedInitiativeSeatOffers'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101095826_SerializedInitiativeSeatOffers', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    IF SCHEMA_ID(N'partnership') IS NULL EXEC(N'CREATE SCHEMA [partnership];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE TABLE [partnership].[ExperienceLink] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [InitiativeId] bigint NOT NULL,
        [ExperienceId] bigint NOT NULL,
        [RequestedByPersonId] bigint NOT NULL,
        [AcceptedByPersonId] bigint NULL,
        [ScopeVersion] nvarchar(64) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ExperienceLink] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ExperienceLink_AcceptedBy] CHECK ([Status] NOT IN (N'Accepted',N'Active') OR [AcceptedByPersonId] IS NOT NULL),
        CONSTRAINT [CK_ExperienceLink_Status] CHECK ([Status] IN (N'Requested',N'Accepted',N'Active',N'Declined',N'Ended')),
        CONSTRAINT [FK_ExperienceLink_Experience_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]),
        CONSTRAINT [FK_ExperienceLink_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]),
        CONSTRAINT [FK_ExperienceLink_Person_AcceptedByPersonId] FOREIGN KEY ([AcceptedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ExperienceLink_Person_RequestedByPersonId] FOREIGN KEY ([RequestedByPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE TABLE [partnership].[ProgramLink] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [InitiativeId] bigint NOT NULL,
        [ProgramId] bigint NOT NULL,
        [RequestedByPersonId] bigint NOT NULL,
        [AcceptedByPersonId] bigint NULL,
        [ScopeVersion] nvarchar(64) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProgramLink] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ProgramLink_AcceptedBy] CHECK ([Status] NOT IN (N'Accepted',N'Active') OR [AcceptedByPersonId] IS NOT NULL),
        CONSTRAINT [CK_ProgramLink_Status] CHECK ([Status] IN (N'Requested',N'Accepted',N'Active',N'Declined',N'Ended')),
        CONSTRAINT [FK_ProgramLink_CoachProgram_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [coach].[CoachProgram] ([Id]),
        CONSTRAINT [FK_ProgramLink_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]),
        CONSTRAINT [FK_ProgramLink_Person_AcceptedByPersonId] FOREIGN KEY ([AcceptedByPersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_ProgramLink_Person_RequestedByPersonId] FOREIGN KEY ([RequestedByPersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE INDEX [IX_ExperienceLink_AcceptedByPersonId] ON [partnership].[ExperienceLink] ([AcceptedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE INDEX [IX_ExperienceLink_ExperienceId] ON [partnership].[ExperienceLink] ([ExperienceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ExperienceLink_InitiativeId_ExperienceId] ON [partnership].[ExperienceLink] ([InitiativeId], [ExperienceId]) WHERE [Status] IN (N''Requested'',N''Accepted'',N''Active'')');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ExperienceLink_PublicId] ON [partnership].[ExperienceLink] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE INDEX [IX_ExperienceLink_RequestedByPersonId] ON [partnership].[ExperienceLink] ([RequestedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE INDEX [IX_ProgramLink_AcceptedByPersonId] ON [partnership].[ProgramLink] ([AcceptedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ProgramLink_InitiativeId_ProgramId] ON [partnership].[ProgramLink] ([InitiativeId], [ProgramId]) WHERE [Status] IN (N''Requested'',N''Accepted'',N''Active'')');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE INDEX [IX_ProgramLink_ProgramId] ON [partnership].[ProgramLink] ([ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProgramLink_PublicId] ON [partnership].[ProgramLink] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    CREATE INDEX [IX_ProgramLink_RequestedByPersonId] ON [partnership].[ProgramLink] ([RequestedByPersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER partnership.TR_ProgramLink_Ownership
ON partnership.ProgramLink AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.InitiativeId<>d.InitiativeId OR i.ProgramId<>d.ProgramId OR i.RequestedByPersonId<>d.RequestedByPersonId)
       THROW 65001, ''Program link resource identity is immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.CoachProgram p ON p.Id=i.ProgramId
       WHERE i.Status IN (N''Accepted'',N''Active'') AND i.AcceptedByPersonId<>p.OwnerPersonId)
       THROW 65002, ''Program link requires acceptance by Program owner'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER partnership.TR_ExperienceLink_Ownership
ON partnership.ExperienceLink AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.InitiativeId<>d.InitiativeId OR i.ExperienceId<>d.ExperienceId OR i.RequestedByPersonId<>d.RequestedByPersonId)
       THROW 65003, ''Experience link resource identity is immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.Experience e ON e.Id=i.ExperienceId
       WHERE i.Status IN (N''Accepted'',N''Active'') AND NOT EXISTS (
          SELECT 1 FROM provider.ProviderMembership pm WHERE pm.ProviderId=e.ProviderId
            AND pm.PersonId=i.AcceptedByPersonId AND pm.Status=N''Active''))
       THROW 65004, ''Experience link requires acceptance by active Provider member'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100010_PartnershipLinks'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101100010_PartnershipLinks', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    IF SCHEMA_ID(N'commercial') IS NULL EXEC(N'CREATE SCHEMA [commercial];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE TABLE [commercial].[PlanVersion] (
        [Id] bigint NOT NULL IDENTITY,
        [AudienceCode] nvarchar(32) NOT NULL,
        [PlanCode] nvarchar(64) NOT NULL,
        [VersionNo] int NOT NULL,
        [Price] decimal(19,4) NULL,
        [Currency] char(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_PlanVersion] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_PlanVersion_No] CHECK ([VersionNo]>0),
        CONSTRAINT [CK_PlanVersion_Price] CHECK ([Price] IS NULL OR [Price]>=0)
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE TABLE [commercial].[PlanFeature] (
        [Id] bigint NOT NULL IDENTITY,
        [PlanVersionId] bigint NOT NULL,
        [FeatureCode] nvarchar(80) NOT NULL,
        [LimitValue] int NULL,
        [PeriodCode] nvarchar(32) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_PlanFeature] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_PlanFeature_Limit] CHECK ([LimitValue] IS NULL OR [LimitValue]>0),
        CONSTRAINT [FK_PlanFeature_PlanVersion_PlanVersionId] FOREIGN KEY ([PlanVersionId]) REFERENCES [commercial].[PlanVersion] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE TABLE [commercial].[Subscription] (
        [Id] bigint NOT NULL IDENTITY,
        [PersonPayerId] bigint NULL,
        [InstitutionPayerId] bigint NULL,
        [ProviderPayerId] bigint NULL,
        [PlanVersionId] bigint NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Subscription] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Subscription_Payer] CHECK ((CASE WHEN [PersonPayerId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [InstitutionPayerId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [ProviderPayerId] IS NULL THEN 0 ELSE 1 END)=1),
        CONSTRAINT [CK_Subscription_Status] CHECK ([Status] IN (N'Proposed',N'Active',N'Expired',N'Cancelled')),
        CONSTRAINT [FK_Subscription_Institution_InstitutionPayerId] FOREIGN KEY ([InstitutionPayerId]) REFERENCES [institution].[Institution] ([Id]),
        CONSTRAINT [FK_Subscription_Person_PersonPayerId] FOREIGN KEY ([PersonPayerId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_Subscription_PlanVersion_PlanVersionId] FOREIGN KEY ([PlanVersionId]) REFERENCES [commercial].[PlanVersion] ([Id]),
        CONSTRAINT [FK_Subscription_Provider_ProviderPayerId] FOREIGN KEY ([ProviderPayerId]) REFERENCES [provider].[Provider] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE TABLE [commercial].[EntitlementAllocation] (
        [Id] bigint NOT NULL IDENTITY,
        [SubscriptionId] bigint NULL,
        [PersonId] bigint NULL,
        [InstitutionId] bigint NULL,
        [ProviderId] bigint NULL,
        [FeatureCode] nvarchar(80) NOT NULL,
        [LimitValue] int NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_EntitlementAllocation] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_EntitlementAllocation_Beneficiary] CHECK ((CASE WHEN [PersonId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [InstitutionId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [ProviderId] IS NULL THEN 0 ELSE 1 END)=1),
        CONSTRAINT [CK_EntitlementAllocation_Limit] CHECK ([LimitValue] IS NULL OR [LimitValue]>0),
        CONSTRAINT [FK_EntitlementAllocation_Institution_InstitutionId] FOREIGN KEY ([InstitutionId]) REFERENCES [institution].[Institution] ([Id]),
        CONSTRAINT [FK_EntitlementAllocation_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_EntitlementAllocation_Provider_ProviderId] FOREIGN KEY ([ProviderId]) REFERENCES [provider].[Provider] ([Id]),
        CONSTRAINT [FK_EntitlementAllocation_Subscription_SubscriptionId] FOREIGN KEY ([SubscriptionId]) REFERENCES [commercial].[Subscription] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE TABLE [commercial].[UsageLedger] (
        [Id] bigint NOT NULL IDENTITY,
        [AllocationId] bigint NOT NULL,
        [SourceKey] nvarchar(160) NOT NULL,
        [Quantity] int NOT NULL,
        [RecordedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_UsageLedger] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_UsageLedger_Quantity] CHECK ([Quantity]<>0),
        CONSTRAINT [FK_UsageLedger_EntitlementAllocation_AllocationId] FOREIGN KEY ([AllocationId]) REFERENCES [commercial].[EntitlementAllocation] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE INDEX [IX_EntitlementAllocation_InstitutionId_FeatureCode] ON [commercial].[EntitlementAllocation] ([InstitutionId], [FeatureCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE INDEX [IX_EntitlementAllocation_PersonId_FeatureCode] ON [commercial].[EntitlementAllocation] ([PersonId], [FeatureCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE INDEX [IX_EntitlementAllocation_ProviderId_FeatureCode] ON [commercial].[EntitlementAllocation] ([ProviderId], [FeatureCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE INDEX [IX_EntitlementAllocation_SubscriptionId] ON [commercial].[EntitlementAllocation] ([SubscriptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PlanFeature_PlanVersionId_FeatureCode] ON [commercial].[PlanFeature] ([PlanVersionId], [FeatureCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PlanVersion_AudienceCode_PlanCode_VersionNo] ON [commercial].[PlanVersion] ([AudienceCode], [PlanCode], [VersionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE INDEX [IX_Subscription_InstitutionPayerId_Status] ON [commercial].[Subscription] ([InstitutionPayerId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE INDEX [IX_Subscription_PersonPayerId_Status] ON [commercial].[Subscription] ([PersonPayerId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE INDEX [IX_Subscription_PlanVersionId] ON [commercial].[Subscription] ([PlanVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE INDEX [IX_Subscription_ProviderPayerId_Status] ON [commercial].[Subscription] ([ProviderPayerId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE INDEX [IX_UsageLedger_AllocationId_RecordedAtUtc] ON [commercial].[UsageLedger] ([AllocationId], [RecordedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UsageLedger_AllocationId_SourceKey] ON [commercial].[UsageLedger] ([AllocationId], [SourceKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER commercial.TR_PlanVersion_Immutable
ON commercial.PlanVersion AFTER UPDATE, DELETE
AS BEGIN THROW 66001, ''Plan version is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER commercial.TR_PlanFeature_Immutable
ON commercial.PlanFeature AFTER UPDATE, DELETE
AS BEGIN THROW 66002, ''Plan feature version is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER commercial.TR_Subscription_Payer
ON commercial.Subscription AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE ISNULL(i.PersonPayerId,-1)<>ISNULL(d.PersonPayerId,-1)
          OR ISNULL(i.InstitutionPayerId,-1)<>ISNULL(d.InstitutionPayerId,-1)
          OR ISNULL(i.ProviderPayerId,-1)<>ISNULL(d.ProviderPayerId,-1)
          OR i.PlanVersionId<>d.PlanVersionId)
       THROW 66003, ''Subscription payer and pinned plan are immutable'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER commercial.TR_EntitlementAllocation_Beneficiary
ON commercial.EntitlementAllocation AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE ISNULL(i.PersonId,-1)<>ISNULL(d.PersonId,-1)
          OR ISNULL(i.InstitutionId,-1)<>ISNULL(d.InstitutionId,-1)
          OR ISNULL(i.ProviderId,-1)<>ISNULL(d.ProviderId,-1)
          OR ISNULL(i.SubscriptionId,-1)<>ISNULL(d.SubscriptionId,-1)
          OR i.FeatureCode<>d.FeatureCode)
       THROW 66004, ''Entitlement beneficiary and feature are immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.LimitValue IS NOT NULL AND
       (SELECT COALESCE(SUM(CONVERT(bigint,l.Quantity)),0) FROM commercial.UsageLedger l WHERE l.AllocationId=i.Id)>i.LimitValue)
       THROW 66005, ''Entitlement limit cannot shrink below recorded usage'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER commercial.TR_UsageLedger_Guard
ON commercial.UsageLedger AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted) THROW 66006, ''Usage ledger is append-only'', 1;
    IF EXISTS (SELECT 1 FROM commercial.EntitlementAllocation a WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT AllocationId FROM inserted) i ON i.AllocationId=a.Id
       CROSS APPLY (SELECT COALESCE(SUM(CONVERT(bigint,l.Quantity)),0) AS Used
          FROM commercial.UsageLedger l WHERE l.AllocationId=a.Id) total
       WHERE total.Used<0 OR (a.LimitValue IS NOT NULL AND total.Used>a.LimitValue))
       THROW 66007, ''Entitlement usage outside allocation range'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    EXEC(N'CREATE OR ALTER PROCEDURE commercial.RecordUsage
    @AllocationId bigint,@SourceKey nvarchar(160),@Quantity int,@EntryId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Limit int,@Used bigint,@Exists bit=0;
        SELECT @Limit=LimitValue,@Exists=1 FROM commercial.EntitlementAllocation WITH (UPDLOCK,HOLDLOCK) WHERE Id=@AllocationId;
        IF @Exists=0 THROW 66008, ''Entitlement allocation not found'', 1;
        IF @Quantity=0 OR @SourceKey IS NULL OR LEN(TRIM(@SourceKey))=0 THROW 66009, ''Usage source and nonzero quantity required'', 1;
        SELECT @Used=COALESCE(SUM(CONVERT(bigint,Quantity)),0) FROM commercial.UsageLedger WHERE AllocationId=@AllocationId;
        IF @Used+@Quantity<0 OR (@Limit IS NOT NULL AND @Used+@Quantity>@Limit)
            THROW 66007, ''Entitlement usage outside allocation range'', 1;
        INSERT commercial.UsageLedger(AllocationId,SourceKey,Quantity,RecordedAtUtc)
          VALUES(@AllocationId,@SourceKey,@Quantity,SYSUTCDATETIME());
        SET @EntryId=CAST(SCOPE_IDENTITY() AS bigint);
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100238_CommercialEntitlements'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101100238_CommercialEntitlements', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    IF SCHEMA_ID(N'forms') IS NULL EXEC(N'CREATE SCHEMA [forms];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[Competition] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [InitiativeId] bigint NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [RulesVersion] nvarchar(64) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [OpensAtUtc] datetime2(3) NOT NULL,
        [ClosesAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Competition] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Competition_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Closed',N'ResultsPublished')),
        CONSTRAINT [CK_Competition_Window] CHECK ([ClosesAtUtc]>[OpensAtUtc]),
        CONSTRAINT [FK_Competition_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[Form] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [InitiativeId] bigint NOT NULL,
        [Purpose] nvarchar(32) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Form] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Form_Status] CHECK ([Status] IN (N'Draft',N'Published',N'Closed')),
        CONSTRAINT [FK_Form_Initiative_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[CompetitionCriterion] (
        [Id] bigint NOT NULL IDENTITY,
        [CompetitionId] bigint NOT NULL,
        [CriterionCode] nvarchar(80) NOT NULL,
        [Label] nvarchar(300) NOT NULL,
        [RubricVersion] nvarchar(64) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_CompetitionCriterion] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_CompetitionCriterion_Id_CompetitionId_RubricVersion] UNIQUE ([Id], [CompetitionId], [RubricVersion]),
        CONSTRAINT [FK_CompetitionCriterion_Competition_CompetitionId] FOREIGN KEY ([CompetitionId]) REFERENCES [forms].[Competition] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[CompetitionEntry] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [CompetitionId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [EntryNo] int NOT NULL,
        [Body] nvarchar(max) NULL,
        [FileId] bigint NULL,
        [Status] nvarchar(24) NOT NULL,
        [SubmittedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_CompetitionEntry] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_CompetitionEntry_Id_CompetitionId] UNIQUE ([Id], [CompetitionId]),
        CONSTRAINT [CK_CompetitionEntry_No] CHECK ([EntryNo]>0),
        CONSTRAINT [CK_CompetitionEntry_Status] CHECK ([Status] IN (N'Submitted',N'Withdrawn',N'Reviewed')),
        CONSTRAINT [FK_CompetitionEntry_Competition_CompetitionId] FOREIGN KEY ([CompetitionId]) REFERENCES [forms].[Competition] ([Id]),
        CONSTRAINT [FK_CompetitionEntry_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]),
        CONSTRAINT [FK_CompetitionEntry_SecureFile_FileId] FOREIGN KEY ([FileId]) REFERENCES [files].[SecureFile] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[FormVersion] (
        [Id] bigint NOT NULL IDENTITY,
        [FormId] bigint NOT NULL,
        [VersionNo] int NOT NULL,
        [ConsentVersion] nvarchar(40) NOT NULL,
        [OpensAtUtc] datetime2(3) NOT NULL,
        [ClosesAtUtc] datetime2(3) NOT NULL,
        [PublishedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_FormVersion] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_FormVersion_No] CHECK ([VersionNo]>0),
        CONSTRAINT [CK_FormVersion_Window] CHECK ([ClosesAtUtc]>[OpensAtUtc]),
        CONSTRAINT [FK_FormVersion_Form_FormId] FOREIGN KEY ([FormId]) REFERENCES [forms].[Form] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[CompetitionJudgment] (
        [Id] bigint NOT NULL IDENTITY,
        [EntryId] bigint NOT NULL,
        [JudgePersonId] bigint NOT NULL,
        [RubricVersion] nvarchar(64) NOT NULL,
        [Decision] nvarchar(24) NOT NULL,
        [Feedback] nvarchar(2000) NULL,
        [CompetitionId] bigint NOT NULL,
        [DecidedAtUtc] datetime2(3) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_CompetitionJudgment] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_CompetitionJudgment_Id_CompetitionId_RubricVersion] UNIQUE ([Id], [CompetitionId], [RubricVersion]),
        CONSTRAINT [FK_CompetitionJudgment_CompetitionEntry_EntryId_CompetitionId] FOREIGN KEY ([EntryId], [CompetitionId]) REFERENCES [forms].[CompetitionEntry] ([Id], [CompetitionId]),
        CONSTRAINT [FK_CompetitionJudgment_Person_JudgePersonId] FOREIGN KEY ([JudgePersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[FormQuestion] (
        [Id] bigint NOT NULL IDENTITY,
        [FormVersionId] bigint NOT NULL,
        [QuestionKey] nvarchar(80) NOT NULL,
        [Prompt] nvarchar(1000) NOT NULL,
        [QuestionType] nvarchar(32) NOT NULL,
        [Required] bit NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_FormQuestion] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_FormQuestion_Id_FormVersionId] UNIQUE ([Id], [FormVersionId]),
        CONSTRAINT [FK_FormQuestion_FormVersion_FormVersionId] FOREIGN KEY ([FormVersionId]) REFERENCES [forms].[FormVersion] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[FormResponse] (
        [Id] bigint NOT NULL IDENTITY,
        [PublicId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [FormVersionId] bigint NOT NULL,
        [PersonId] bigint NOT NULL,
        [ResponseNo] int NOT NULL,
        [Status] nvarchar(24) NOT NULL,
        [SubmittedAtUtc] datetime2(3) NULL,
        [ConsentAtUtc] datetime2(3) NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_FormResponse] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_FormResponse_Id_FormVersionId] UNIQUE ([Id], [FormVersionId]),
        CONSTRAINT [CK_FormResponse_No] CHECK ([ResponseNo]>0),
        CONSTRAINT [CK_FormResponse_Status] CHECK ([Status] IN (N'Draft',N'Submitted',N'Withdrawn')),
        CONSTRAINT [FK_FormResponse_FormVersion_FormVersionId] FOREIGN KEY ([FormVersionId]) REFERENCES [forms].[FormVersion] ([Id]),
        CONSTRAINT [FK_FormResponse_Person_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[CompetitionCriterionScore] (
        [Id] bigint NOT NULL IDENTITY,
        [JudgmentId] bigint NOT NULL,
        [CriterionId] bigint NOT NULL,
        [Score] decimal(9,4) NOT NULL,
        [CompetitionId] bigint NOT NULL,
        [RubricVersion] nvarchar(64) NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_CompetitionCriterionScore] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CompetitionCriterionScore_CompetitionCriterion_CriterionId_CompetitionId_RubricVersion] FOREIGN KEY ([CriterionId], [CompetitionId], [RubricVersion]) REFERENCES [forms].[CompetitionCriterion] ([Id], [CompetitionId], [RubricVersion]),
        CONSTRAINT [FK_CompetitionCriterionScore_CompetitionJudgment_JudgmentId_CompetitionId_RubricVersion] FOREIGN KEY ([JudgmentId], [CompetitionId], [RubricVersion]) REFERENCES [forms].[CompetitionJudgment] ([Id], [CompetitionId], [RubricVersion])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[FormQuestionOption] (
        [Id] bigint NOT NULL IDENTITY,
        [QuestionId] bigint NOT NULL,
        [OptionCode] nvarchar(120) NOT NULL,
        [Label] nvarchar(300) NOT NULL,
        [SortOrder] smallint NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_FormQuestionOption] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_FormQuestionOption_Id_QuestionId] UNIQUE ([Id], [QuestionId]),
        CONSTRAINT [CK_FormQuestionOption_Order] CHECK ([SortOrder]>0),
        CONSTRAINT [FK_FormQuestionOption_FormQuestion_QuestionId] FOREIGN KEY ([QuestionId]) REFERENCES [forms].[FormQuestion] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[FormAnswer] (
        [Id] bigint NOT NULL IDENTITY,
        [ResponseId] bigint NOT NULL,
        [QuestionId] bigint NOT NULL,
        [TextValue] nvarchar(max) NULL,
        [NumberValue] decimal(18,4) NULL,
        [ChoiceCode] nvarchar(120) NULL,
        [FileId] bigint NULL,
        [FormVersionId] bigint NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_FormAnswer] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_FormAnswer_Id_QuestionId] UNIQUE ([Id], [QuestionId]),
        CONSTRAINT [CK_FormAnswer_OneValue] CHECK ((CASE WHEN [TextValue] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [NumberValue] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [ChoiceCode] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [FileId] IS NULL THEN 0 ELSE 1 END)<=1),
        CONSTRAINT [FK_FormAnswer_FormQuestion_QuestionId_FormVersionId] FOREIGN KEY ([QuestionId], [FormVersionId]) REFERENCES [forms].[FormQuestion] ([Id], [FormVersionId]),
        CONSTRAINT [FK_FormAnswer_FormResponse_ResponseId_FormVersionId] FOREIGN KEY ([ResponseId], [FormVersionId]) REFERENCES [forms].[FormResponse] ([Id], [FormVersionId]),
        CONSTRAINT [FK_FormAnswer_SecureFile_FileId] FOREIGN KEY ([FileId]) REFERENCES [files].[SecureFile] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE TABLE [forms].[FormAnswerChoice] (
        [Id] bigint NOT NULL IDENTITY,
        [AnswerId] bigint NOT NULL,
        [OptionId] bigint NOT NULL,
        [QuestionId] bigint NOT NULL,
        [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [UpdatedAtUtc] datetime2(3) NOT NULL DEFAULT (SYSUTCDATETIME()),
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_FormAnswerChoice] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_FormAnswerChoice_FormAnswer_AnswerId_QuestionId] FOREIGN KEY ([AnswerId], [QuestionId]) REFERENCES [forms].[FormAnswer] ([Id], [QuestionId]),
        CONSTRAINT [FK_FormAnswerChoice_FormQuestionOption_OptionId_QuestionId] FOREIGN KEY ([OptionId], [QuestionId]) REFERENCES [forms].[FormQuestionOption] ([Id], [QuestionId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_Competition_InitiativeId_Status] ON [forms].[Competition] ([InitiativeId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Competition_PublicId] ON [forms].[Competition] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CompetitionCriterion_CompetitionId_CriterionCode_RubricVersion] ON [forms].[CompetitionCriterion] ([CompetitionId], [CriterionCode], [RubricVersion]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_CompetitionCriterionScore_CriterionId_CompetitionId_RubricVersion] ON [forms].[CompetitionCriterionScore] ([CriterionId], [CompetitionId], [RubricVersion]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_CompetitionCriterionScore_JudgmentId_CompetitionId_RubricVersion] ON [forms].[CompetitionCriterionScore] ([JudgmentId], [CompetitionId], [RubricVersion]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CompetitionCriterionScore_JudgmentId_CriterionId] ON [forms].[CompetitionCriterionScore] ([JudgmentId], [CriterionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CompetitionEntry_CompetitionId_PersonId_EntryNo] ON [forms].[CompetitionEntry] ([CompetitionId], [PersonId], [EntryNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_CompetitionEntry_CompetitionId_Status] ON [forms].[CompetitionEntry] ([CompetitionId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_CompetitionEntry_FileId] ON [forms].[CompetitionEntry] ([FileId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_CompetitionEntry_PersonId] ON [forms].[CompetitionEntry] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CompetitionEntry_PublicId] ON [forms].[CompetitionEntry] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_CompetitionJudgment_EntryId_CompetitionId] ON [forms].[CompetitionJudgment] ([EntryId], [CompetitionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CompetitionJudgment_EntryId_JudgePersonId_RubricVersion] ON [forms].[CompetitionJudgment] ([EntryId], [JudgePersonId], [RubricVersion]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_CompetitionJudgment_JudgePersonId] ON [forms].[CompetitionJudgment] ([JudgePersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_Form_InitiativeId_Status] ON [forms].[Form] ([InitiativeId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Form_PublicId] ON [forms].[Form] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_FormAnswer_FileId] ON [forms].[FormAnswer] ([FileId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_FormAnswer_QuestionId_FormVersionId] ON [forms].[FormAnswer] ([QuestionId], [FormVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_FormAnswer_ResponseId_FormVersionId] ON [forms].[FormAnswer] ([ResponseId], [FormVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FormAnswer_ResponseId_QuestionId] ON [forms].[FormAnswer] ([ResponseId], [QuestionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FormAnswerChoice_AnswerId_OptionId] ON [forms].[FormAnswerChoice] ([AnswerId], [OptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_FormAnswerChoice_AnswerId_QuestionId] ON [forms].[FormAnswerChoice] ([AnswerId], [QuestionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_FormAnswerChoice_OptionId_QuestionId] ON [forms].[FormAnswerChoice] ([OptionId], [QuestionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FormQuestion_FormVersionId_QuestionKey] ON [forms].[FormQuestion] ([FormVersionId], [QuestionKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FormQuestionOption_QuestionId_OptionCode] ON [forms].[FormQuestionOption] ([QuestionId], [OptionCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FormQuestionOption_QuestionId_SortOrder] ON [forms].[FormQuestionOption] ([QuestionId], [SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FormResponse_FormVersionId_PersonId_ResponseNo] ON [forms].[FormResponse] ([FormVersionId], [PersonId], [ResponseNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_FormResponse_FormVersionId_Status] ON [forms].[FormResponse] ([FormVersionId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE INDEX [IX_FormResponse_PersonId] ON [forms].[FormResponse] ([PersonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FormResponse_PublicId] ON [forms].[FormResponse] ([PublicId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FormVersion_FormId_VersionNo] ON [forms].[FormVersion] ([FormId], [VersionNo]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_FormVersion_Immutable
ON forms.FormVersion AFTER UPDATE, DELETE
AS BEGIN THROW 67001, ''Form version is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_FormQuestion_Immutable
ON forms.FormQuestion AFTER UPDATE, DELETE
AS BEGIN THROW 67002, ''Form question version is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_FormQuestionOption_Immutable
ON forms.FormQuestionOption AFTER UPDATE, DELETE
AS BEGIN THROW 67003, ''Form option version is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_FormResponse_Guard
ON forms.FormResponse AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.PersonId<>d.PersonId OR i.FormVersionId<>d.FormVersionId
          OR (d.Status IN (N''Submitted'',N''Withdrawn'') AND i.Status<>d.Status))
       THROW 67004, ''Submitted Form response owner and terminal state are immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.FormVersion v ON v.Id=i.FormVersionId
       JOIN forms.Form f ON f.Id=v.FormId
       WHERE i.Status=N''Submitted'' AND NOT EXISTS (SELECT 1 FROM deleted d WHERE d.Id=i.Id AND d.Status=N''Submitted'')
         AND (i.SubmittedAtUtc IS NULL OR i.ConsentAtUtc IS NULL OR f.Status<>N''Published''
              OR SYSUTCDATETIME()<v.OpensAtUtc OR SYSUTCDATETIME()>=v.ClosesAtUtc))
       THROW 67005, ''Form submission requires consent and an open published form version'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.FormQuestion q ON q.FormVersionId=i.FormVersionId AND q.Required=1
       WHERE i.Status=N''Submitted'' AND NOT EXISTS (SELECT 1 FROM deleted d WHERE d.Id=i.Id AND d.Status=N''Submitted'')
         AND NOT EXISTS (SELECT 1 FROM forms.FormAnswer a WHERE a.ResponseId=i.Id AND a.QuestionId=q.Id
             AND (a.TextValue IS NOT NULL OR a.NumberValue IS NOT NULL OR a.ChoiceCode IS NOT NULL
                  OR a.FileId IS NOT NULL OR EXISTS (SELECT 1 FROM forms.FormAnswerChoice c WHERE c.AnswerId=a.Id))))
       THROW 67006, ''Required Form question has no answer'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_FormAnswer_Guard
ON forms.FormAnswer AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted d JOIN forms.FormResponse r ON r.Id=d.ResponseId WHERE r.Status<>N''Draft'')
       THROW 67007, ''Submitted Form answers are immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.FormResponse r ON r.Id=i.ResponseId
       LEFT JOIN files.SecureFile f ON f.Id=i.FileId
       WHERE r.Status<>N''Draft'' OR (i.FileId IS NOT NULL AND (f.OwnerPersonId IS NULL OR f.OwnerPersonId<>r.PersonId))
          OR (i.ChoiceCode IS NOT NULL AND NOT EXISTS (SELECT 1 FROM forms.FormQuestionOption o
               WHERE o.QuestionId=i.QuestionId AND o.OptionCode=i.ChoiceCode)))
       THROW 67008, ''Form answer must be draft, use owned file, and match selected option'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_FormAnswerChoice_Guard
ON forms.FormAnswerChoice AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted d JOIN forms.FormAnswer a ON a.Id=d.AnswerId
       JOIN forms.FormResponse r ON r.Id=a.ResponseId WHERE r.Status<>N''Draft'')
       THROW 67009, ''Submitted Form answer choices are immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.FormAnswer a ON a.Id=i.AnswerId
       JOIN forms.FormResponse r ON r.Id=a.ResponseId
       WHERE r.Status<>N''Draft'' OR a.TextValue IS NOT NULL OR a.NumberValue IS NOT NULL
          OR a.ChoiceCode IS NOT NULL OR a.FileId IS NOT NULL)
       THROW 67010, ''Multiple choice requires an empty draft scalar answer'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_CompetitionCriterion_Immutable
ON forms.CompetitionCriterion AFTER UPDATE, DELETE
AS BEGIN THROW 67011, ''Competition criterion version is immutable'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_CompetitionEntry_Guard
ON forms.CompetitionEntry AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.CompetitionId<>d.CompetitionId OR i.PersonId<>d.PersonId OR i.EntryNo<>d.EntryNo)
       THROW 67012, ''Competition entry owner is immutable'', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.Competition c ON c.Id=i.CompetitionId
       LEFT JOIN files.SecureFile f ON f.Id=i.FileId
       WHERE (i.FileId IS NOT NULL AND (f.OwnerPersonId IS NULL OR f.OwnerPersonId<>i.PersonId))
          OR (NOT EXISTS (SELECT 1 FROM deleted d WHERE d.Id=i.Id) AND
              (c.Status<>N''Published'' OR SYSUTCDATETIME()<c.OpensAtUtc OR SYSUTCDATETIME()>=c.ClosesAtUtc)))
       THROW 67013, ''Competition entry requires open competition and owned file'', 1;
END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_CompetitionJudgment_Immutable
ON forms.CompetitionJudgment AFTER UPDATE, DELETE
AS BEGIN THROW 67014, ''Competition judgment is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    EXEC(N'CREATE OR ALTER TRIGGER forms.TR_CompetitionCriterionScore_Immutable
ON forms.CompetitionCriterionScore AFTER UPDATE, DELETE
AS BEGIN THROW 67015, ''Competition criterion score is append-only'', 1; END;');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101100611_FormsAndCompetitions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101100611_FormsAndCompetitions', N'10.0.0');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [commercial].[Subscription] ADD [EndsAtUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [commercial].[Subscription] ADD [StartsAtUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [files].[SecureFile] ADD [RetentionUntilUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [coach].[ProgramGroupMembership] ADD [JoinedAtUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [commercial].[PlanVersion] ADD [PublishedAtUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [iam].[PasswordCredential] ADD [RotatedAtUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [institution].[InitiativeRevision] ADD [PublishedAtUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [iam].[GlobalGrant] ADD [GrantedAtUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [commercial].[EntitlementAllocation] ADD [EffectiveFromUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    ALTER TABLE [commercial].[EntitlementAllocation] ADD [EffectiveToUtc] datetime2(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    EXEC(N'ALTER TABLE [commercial].[Subscription] ADD CONSTRAINT [CK_Subscription_Window] CHECK ([EndsAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [EndsAtUtc]>[StartsAtUtc]))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    CREATE INDEX [IX_PlanVersion_PublishedAtUtc] ON [commercial].[PlanVersion] ([PublishedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    CREATE INDEX [IX_PasswordCredential_RotatedAtUtc] ON [iam].[PasswordCredential] ([RotatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    CREATE INDEX [IX_EntitlementAllocation_FeatureCode_EffectiveFromUtc_EffectiveToUtc] ON [commercial].[EntitlementAllocation] ([FeatureCode], [EffectiveFromUtc], [EffectiveToUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    EXEC(N'ALTER TABLE [commercial].[EntitlementAllocation] ADD CONSTRAINT [CK_EntitlementAllocation_Window] CHECK ([EffectiveToUtc] IS NULL OR ([EffectiveFromUtc] IS NOT NULL AND [EffectiveToUtc]>[EffectiveFromUtc]))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261101101313_RestoreHistoricalTimeFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261101101313_RestoreHistoricalTimeFields', N'10.0.0');
END;

COMMIT;
GO

