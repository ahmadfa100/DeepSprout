-- v5-lean-1 baseline DDL (58 tables): PART 2 of the approved DeepSprout-v5-FULL-Database.sql, unchanged.
-- Executed by migration V5Baseline on an empty database. Batches are separated by GO lines.
-- 2.1 Schemas
IF SCHEMA_ID(N'iam') IS NULL EXEC(N'CREATE SCHEMA [iam] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'org') IS NULL EXEC(N'CREATE SCHEMA [org] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'personal') IS NULL EXEC(N'CREATE SCHEMA [personal] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'lab') IS NULL EXEC(N'CREATE SCHEMA [lab] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'recovery') IS NULL EXEC(N'CREATE SCHEMA [recovery] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'activity') IS NULL EXEC(N'CREATE SCHEMA [activity] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'shield') IS NULL EXEC(N'CREATE SCHEMA [shield] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'institution') IS NULL EXEC(N'CREATE SCHEMA [institution] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'coach') IS NULL EXEC(N'CREATE SCHEMA [coach] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'task') IS NULL EXEC(N'CREATE SCHEMA [task] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'session') IS NULL EXEC(N'CREATE SCHEMA [session] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'provider') IS NULL EXEC(N'CREATE SCHEMA [provider] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'forms') IS NULL EXEC(N'CREATE SCHEMA [forms] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'community') IS NULL EXEC(N'CREATE SCHEMA [community] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'partnership') IS NULL EXEC(N'CREATE SCHEMA [partnership] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'governance') IS NULL EXEC(N'CREATE SCHEMA [governance] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'ops') IS NULL EXEC(N'CREATE SCHEMA [ops] AUTHORIZATION dbo;');
IF SCHEMA_ID(N'files') IS NULL EXEC(N'CREATE SCHEMA [files] AUTHORIZATION dbo;');
GO

-- 2.2 Tables: primary keys, defaults, CHECK constraints, plain UNIQUE constraints. Foreign keys are added in 2.3 so circular references (root <-> revision) are safe.
-- (1/58) iam.Person — One identity for every person, in every workspace. Also holds the password hash and the platform-staff role.
CREATE TABLE [iam].[Person] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Person_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [DisplayName] nvarchar(160) NOT NULL,
    [NormalizedEmail] nvarchar(320) NULL,
    [EmailVerifiedAtUtc] datetime2(3) NULL,
    [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_Person_Status] DEFAULT ('Active'),
    [IndividualEnabledAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Person_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [PasswordHash] nvarchar(400) NULL,
    [FailedLoginCount] smallint NOT NULL CONSTRAINT [DF_Person_FailedLoginCount] DEFAULT (0),
    [LockedUntilUtc] datetime2(3) NULL,
    [PlatformRole] nvarchar(16) NULL,
    CONSTRAINT [PK_Person] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Person_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_Person_Status] CHECK (Status IN ('Active','Suspended','Closed')),
    CONSTRAINT [CK_Person_PlatformRole] CHECK (PlatformRole IS NULL OR PlatformRole IN ('Admin','Moderator','ContentEditor'))
);
GO
-- (2/58) iam.OtpChallenge — Short-lived one-time codes for email verification, email change and password reset.
CREATE TABLE [iam].[OtpChallenge] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PersonId] bigint NULL,
    [NormalizedEmail] nvarchar(320) NOT NULL,
    [Purpose] nvarchar(24) NOT NULL,
    [CodeHash] varbinary(64) NOT NULL,
    [AttemptCount] smallint NOT NULL CONSTRAINT [DF_OtpChallenge_AttemptCount] DEFAULT (0),
    [ExpiresAtUtc] datetime2(3) NOT NULL,
    [ConsumedAtUtc] datetime2(3) NULL,
    [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_OtpChallenge_Status] DEFAULT ('Issued'),
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_OtpChallenge_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_OtpChallenge] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_OtpChallenge_Purpose] CHECK (Purpose IN ('SignUp','SignIn','Invitation','EmailChange','Recovery')),
    CONSTRAINT [CK_OtpChallenge_Status] CHECK (Status IN ('Issued','Consumed','Expired','Locked'))
);
GO
-- (3/58) iam.ConsentRecord — What a person agreed to (privacy notice, Digital Shield telemetry), which text version, and when.
CREATE TABLE [iam].[ConsentRecord] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PersonId] bigint NOT NULL,
    [PurposeCode] nvarchar(80) NOT NULL,
    [NoticeVersion] nvarchar(64) NOT NULL,
    [Decision] nvarchar(16) NOT NULL,
    [DecidedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ConsentRecord_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_ConsentRecord] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_ConsentRecord_PersonId_PurposeCode_DecidedAtUtc] UNIQUE ([PersonId], [PurposeCode], [DecidedAtUtc]),
    CONSTRAINT [CK_ConsentRecord_Decision] CHECK (Decision IN ('Accepted','Withdrawn'))
);
GO
-- (4/58) org.Organization — An Institution or a Provider (Kind). Name, status, profile and settings.
CREATE TABLE [org].[Organization] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Organization_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [Kind] nvarchar(16) NOT NULL,
    [Name] nvarchar(200) NOT NULL,
    [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_Organization_Status] DEFAULT ('Applied'),
    [CountryCode] char(2) NOT NULL,
    [HeadquartersCity] nvarchar(120) NULL,
    [OfficialContactEmail] nvarchar(320) NULL,
    [ProfileJson] nvarchar(max) NULL,
    [SettingsJson] nvarchar(max) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Organization_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Organization] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Organization_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_Organization_Kind] CHECK (Kind IN ('Institution','Provider')),
    CONSTRAINT [CK_Organization_Status] CHECK (Status IN ('Applied','Verified','Suspended','Closed')),
    CONSTRAINT [CK_Organization_ProfileJson_IsJson] CHECK ([ProfileJson] IS NULL OR ISJSON([ProfileJson]) = 1),
    CONSTRAINT [CK_Organization_SettingsJson_IsJson] CHECK ([SettingsJson] IS NULL OR ISJSON([SettingsJson]) = 1)
);
GO
-- (5/58) org.OrganizationMember — Which people may act for an organization (representatives, provider members).
CREATE TABLE [org].[OrganizationMember] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [OrganizationId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_OrganizationMember_Status] DEFAULT ('Active'),
    [GrantedByPersonId] bigint NOT NULL,
    [GrantedAtUtc] datetime2(3) NOT NULL,
    [RevokedAtUtc] datetime2(3) NULL,
    [RevokeReason] nvarchar(800) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_OrganizationMember_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_OrganizationMember] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_OrganizationMember_Status] CHECK (Status IN ('Active','Revoked'))
);
GO
-- (6/58) org.VerificationCase — Admin review of a Coach, Institution or Provider application, including "more information" rounds.
CREATE TABLE [org].[VerificationCase] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_VerificationCase_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [Kind] nvarchar(16) NOT NULL,
    [OrganizationId] bigint NULL,
    [ApplicantPersonId] bigint NOT NULL,
    [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_VerificationCase_Status] DEFAULT ('Submitted'),
    [ClaimJson] nvarchar(max) NOT NULL,
    [EvidenceFileId] bigint NULL,
    [SubmittedAtUtc] datetime2(3) NOT NULL,
    [DecidedByPersonId] bigint NULL,
    [DecidedAtUtc] datetime2(3) NULL,
    [DecisionReason] nvarchar(1000) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_VerificationCase_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [MessagesJson] nvarchar(max) NULL,
    CONSTRAINT [PK_VerificationCase] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_VerificationCase_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_VerificationCase_Kind] CHECK (Kind IN ('Institution','Provider','Coach')),
    CONSTRAINT [CK_VerificationCase_Status] CHECK (Status IN ('Submitted','MoreInfo','Approved','Rejected','Suspended')),
    CONSTRAINT [CK_VerificationCase_Subject] CHECK ((Kind = 'Coach' AND OrganizationId IS NULL) OR (Kind IN ('Institution','Provider') AND OrganizationId IS NOT NULL)),
    CONSTRAINT [CK_VerificationCase_ClaimJson_IsJson] CHECK (ISJSON([ClaimJson]) = 1),
    CONSTRAINT [CK_VerificationCase_MessagesJson_IsJson] CHECK ([MessagesJson] IS NULL OR ISJSON([MessagesJson]) = 1)
);
GO
-- (7/58) org.StaffAppointment — Invitation, acceptance and removal of supervisors and coaches for one initiative, or supervisors for one experience.
CREATE TABLE [org].[StaffAppointment] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_StaffAppointment_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [InitiativeId] bigint NULL,
    [ExperienceId] bigint NULL,
    [Role] nvarchar(16) NOT NULL,
    [Status] nvarchar(16) NOT NULL,
    [RequestedByPersonId] bigint NULL,
    [NormalizedEmail] nvarchar(320) NULL,
    [TokenHash] varbinary(64) NULL,
    [ExpiresAtUtc] datetime2(3) NULL,
    [InvitedByPersonId] bigint NULL,
    [InvitedAtUtc] datetime2(3) NULL,
    [PersonId] bigint NULL,
    [AcceptedAtUtc] datetime2(3) NULL,
    [EndedAtUtc] datetime2(3) NULL,
    [EndReason] nvarchar(800) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_StaffAppointment_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [CanManageCohorts] bit NOT NULL CONSTRAINT [DF_StaffAppointment_CanManageCohorts] DEFAULT (0),
    CONSTRAINT [PK_StaffAppointment] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_StaffAppointment_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_StaffAppointment_Scope] CHECK ((InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL)),
    CONSTRAINT [CK_StaffAppointment_Role] CHECK (Role IN ('Supervisor','Coach') AND (ExperienceId IS NULL OR Role = 'Supervisor')),
    CONSTRAINT [CK_StaffAppointment_Status] CHECK (Status IN ('Requested','Pending','Active','Declined','Expired','Cancelled','Revoked')),
    CONSTRAINT [CK_StaffAppointment_Invited] CHECK (Status IN ('Requested','Cancelled') OR (NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL AND ExpiresAtUtc IS NOT NULL AND InvitedByPersonId IS NOT NULL AND InvitedAtUtc IS NOT NULL))
);
GO
-- (8/58) personal.IndividualProfile — The personal (Individual) workspace: onboarding stage, goal, setup answers, preferences, Shield settings.
CREATE TABLE [personal].[IndividualProfile] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PersonId] bigint NOT NULL,
    [OnboardingStage] nvarchar(24) NOT NULL CONSTRAINT [DF_IndividualProfile_OnboardingStage] DEFAULT ('Started'),
    [GoalCode] nvarchar(64) NULL,
    [SetupAnswersJson] nvarchar(max) NULL,
    [SetupAnswersVersion] int NULL,
    [PreferencesJson] nvarchar(max) NULL,
    [PreferredTimeZone] nvarchar(80) NOT NULL,
    [LastAssessmentAttemptId] bigint NULL,
    [JourneyStartedAtUtc] datetime2(3) NULL,
    [OnboardingCompletedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_IndividualProfile_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [ShieldSettingsJson] nvarchar(max) NULL,
    CONSTRAINT [PK_IndividualProfile] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_IndividualProfile_PersonId] UNIQUE ([PersonId]),
    CONSTRAINT [CK_IndividualProfile_Stage] CHECK (OnboardingStage IN ('Started','Introduced','Setup','Baselines','Results','Preview','Activated','TourDone')),
    CONSTRAINT [CK_IndividualProfile_SetupAnswersJson_IsJson] CHECK ([SetupAnswersJson] IS NULL OR ISJSON([SetupAnswersJson]) = 1),
    CONSTRAINT [CK_IndividualProfile_PreferencesJson_IsJson] CHECK ([PreferencesJson] IS NULL OR ISJSON([PreferencesJson]) = 1),
    CONSTRAINT [CK_IndividualProfile_ShieldSettingsJson_IsJson] CHECK ([ShieldSettingsJson] IS NULL OR ISJSON([ShieldSettingsJson]) = 1)
);
GO
-- (9/58) lab.InstrumentVersion — The four assessments (Digital Habits, Sustained Attention, Inhibitory Control, Depth Challenge) with their scoring version.
CREATE TABLE [lab].[InstrumentVersion] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [InstrumentCode] nvarchar(32) NOT NULL,
    [VersionNo] int NOT NULL,
    [Title] nvarchar(160) NOT NULL,
    [ContentRef] nvarchar(300) NOT NULL,
    [ContentJson] nvarchar(max) NULL,
    [ProtocolVersion] nvarchar(64) NOT NULL,
    [ScoringVersion] nvarchar(64) NOT NULL,
    [ComparabilityGroup] nvarchar(64) NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_InstrumentVersion_Status] DEFAULT ('Draft'),
    [PublishedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_InstrumentVersion_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_InstrumentVersion] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_InstrumentVersion_InstrumentCode_VersionNo] UNIQUE ([InstrumentCode], [VersionNo]),
    CONSTRAINT [CK_InstrumentVersion_Instrument] CHECK (InstrumentCode IN ('DigitalHabits','SustainedAttention','InhibitoryControl','DepthChallenge')),
    CONSTRAINT [CK_InstrumentVersion_Status] CHECK (Status IN ('Draft','Published','Retired')),
    CONSTRAINT [CK_InstrumentVersion_ContentJson_IsJson] CHECK ([ContentJson] IS NULL OR ISJSON([ContentJson]) = 1)
);
GO
-- (10/58) lab.AssessmentAttempt — One attempt at an assessment: kind (Baseline / Official / Practice), progress, responses and score.
CREATE TABLE [lab].[AssessmentAttempt] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_AssessmentAttempt_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [PersonId] bigint NOT NULL,
    [InstrumentVersionId] bigint NOT NULL,
    [InstrumentCode] nvarchar(32) NOT NULL,
    [Kind] nvarchar(16) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_AssessmentAttempt_Status] DEFAULT ('Started'),
    [StartedAtUtc] datetime2(3) NOT NULL,
    [LastSavedAtUtc] datetime2(3) NULL,
    [FinishedAtUtc] datetime2(3) NULL,
    [ValidityCode] nvarchar(40) NULL,
    [AccessibilityMode] nvarchar(40) NULL,
    [IsLate] bit NOT NULL CONSTRAINT [DF_AssessmentAttempt_IsLate] DEFAULT (0),
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_AssessmentAttempt_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [WindowKey] nvarchar(40) NULL,
    [ScoringVersion] nvarchar(64) NULL,
    [PrimaryScore] decimal(12,4) NULL,
    [ScoresJson] nvarchar(max) NULL,
    [ResponsesJson] nvarchar(max) NULL,
    CONSTRAINT [PK_AssessmentAttempt] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_AssessmentAttempt_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_AssessmentAttempt_Kind] CHECK (Kind IN ('Baseline','Official','Practice')),
    CONSTRAINT [CK_AssessmentAttempt_Status] CHECK (Status IN ('Started','Paused','Submitted','Valid','Invalid','Abandoned')),
    CONSTRAINT [CK_AssessmentAttempt_Window] CHECK ((Kind = 'Official' AND WindowKey IS NOT NULL) OR (Kind <> 'Official' AND WindowKey IS NULL)),
    CONSTRAINT [CK_AssessmentAttempt_ScoresJson_IsJson] CHECK ([ScoresJson] IS NULL OR ISJSON([ScoresJson]) = 1),
    CONSTRAINT [CK_AssessmentAttempt_ResponsesJson_IsJson] CHECK ([ResponsesJson] IS NULL OR ISJSON([ResponsesJson]) = 1)
);
GO
-- (11/58) recovery.RecoveryCycle — A recovery cycle (about 28 days): Preview → Active → Review → Ended.
CREATE TABLE [recovery].[RecoveryCycle] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_RecoveryCycle_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [PersonId] bigint NOT NULL,
    [CycleNo] int NOT NULL,
    [Kind] nvarchar(16) NOT NULL CONSTRAINT [DF_RecoveryCycle_Kind] DEFAULT ('Standard'),
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_RecoveryCycle_Status] DEFAULT ('Draft'),
    [PolicyVersion] nvarchar(64) NOT NULL,
    [TimeZoneId] nvarchar(80) NOT NULL,
    [StartLocalDate] date NULL,
    [EndLocalDate] date NULL,
    [ActivatedAtUtc] datetime2(3) NULL,
    [EndedAtUtc] datetime2(3) NULL,
    [ReviewedAtUtc] datetime2(3) NULL,
    [NextStepCode] nvarchar(24) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_RecoveryCycle_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    CONSTRAINT [PK_RecoveryCycle] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_RecoveryCycle_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [UQ_RecoveryCycle_PersonId_CycleNo] UNIQUE ([PersonId], [CycleNo]),
    CONSTRAINT [CK_RecoveryCycle_Kind] CHECK (Kind IN ('Standard','Maintenance')),
    CONSTRAINT [CK_RecoveryCycle_Status] CHECK (Status IN ('Draft','Preview','Active','ReviewDue','Paused','Ended','Reviewed','Cancelled')),
    CONSTRAINT [CK_RecoveryCycle_Activated] CHECK (Status IN ('Draft','Preview','Cancelled') OR ActivatedAtUtc IS NOT NULL)
);
GO
-- (12/58) recovery.PlanRevision — The accepted plan and each adjustment of it (Draft → Accepted → Superseded).
CREATE TABLE [recovery].[PlanRevision] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [CycleId] bigint NOT NULL,
    [RevisionNo] int NOT NULL,
    [ChangeKind] nvarchar(24) NOT NULL,
    [GoalCode] nvarchar(64) NOT NULL,
    [PolicyVersion] nvarchar(64) NOT NULL,
    [EffectiveFromLocalDate] date NOT NULL,
    [Reason] nvarchar(500) NOT NULL,
    [PlanJson] nvarchar(max) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_PlanRevision_Status] DEFAULT ('Draft'),
    [AcceptedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_PlanRevision_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_PlanRevision] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_PlanRevision_CycleId_RevisionNo] UNIQUE ([CycleId], [RevisionNo]),
    CONSTRAINT [CK_PlanRevision_ChangeKind] CHECK (ChangeKind IN ('Initial','Preference','Schedule','Load','Goal','WeeklyReview','Return')),
    CONSTRAINT [CK_PlanRevision_Status] CHECK (Status IN ('Draft','Accepted','Superseded')),
    CONSTRAINT [CK_PlanRevision_PlanJson_IsJson] CHECK (ISJSON([PlanJson]) = 1)
);
GO
-- (13/58) recovery.ScheduledAction — A dated, measurable action of the plan (a practice or an offline routine) and whether it was done.
CREATE TABLE [recovery].[ScheduledAction] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [CycleId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [PlanRevisionId] bigint NOT NULL,
    [ActionKind] nvarchar(16) NOT NULL,
    [PracticeVersionId] bigint NULL,
    [RoutineId] bigint NULL,
    [LocalDate] date NOT NULL,
    [IsOptional] bit NOT NULL CONSTRAINT [DF_ScheduledAction_IsOptional] DEFAULT (0),
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_ScheduledAction_Status] DEFAULT ('Due'),
    [CompletedAttemptId] bigint NULL,
    [RescheduledToActionId] bigint NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ScheduledAction_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_ScheduledAction] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_ScheduledAction_Kind] CHECK (ActionKind IN ('Practice','Routine','WeeklyReview','Protection')),
    CONSTRAINT [CK_ScheduledAction_Status] CHECK (Status IN ('Due','Completed','Missed','Rescheduled','Cancelled','Excluded'))
);
GO
-- (14/58) recovery.WeeklyReview — The weekly review decision (and the self-reported phone minutes).
CREATE TABLE [recovery].[WeeklyReview] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [CycleId] bigint NOT NULL,
    [WeekNo] tinyint NOT NULL,
    [ResultingRevisionId] bigint NULL,
    [ManageabilityCode] nvarchar(40) NULL,
    [FitCode] nvarchar(40) NULL,
    [ReportedPhoneMinutesPerDay] smallint NULL,
    [DecisionCode] nvarchar(24) NOT NULL,
    [ReviewedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_WeeklyReview_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_WeeklyReview] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_WeeklyReview_CycleId_WeekNo] UNIQUE ([CycleId], [WeekNo]),
    CONSTRAINT [CK_WeeklyReview_Decision] CHECK (DecisionCode IN ('AcceptNext','KeepPace','Adjust','AutoContinued'))
);
GO
-- (15/58) activity.PracticeDefinition — The catalog of practices (code, type, title, status). Content lives in PracticeVersion.
CREATE TABLE [activity].[PracticeDefinition] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [Code] nvarchar(64) NOT NULL,
    [PracticeType] nvarchar(32) NOT NULL,
    [Title] nvarchar(160) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_PracticeDefinition_Status] DEFAULT ('Draft'),
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_PracticeDefinition_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_PracticeDefinition] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_PracticeDefinition_Code] UNIQUE ([Code]),
    CONSTRAINT [CK_PracticeDefinition_Type] CHECK (PracticeType IN ('DepthPractice','ListeningRecall','PracticalMicroChallenge','ProtectedWork')),
    CONSTRAINT [CK_PracticeDefinition_Status] CHECK (Status IN ('Draft','Published','Deprecated','Retired'))
);
GO
-- (16/58) activity.PracticeVersion — Immutable content of one version of a practice. Plans, attempts and assignments point at the version they used, so the original content can always be re-opened (audit B1; provisional owner assumption restored in the submission).
CREATE TABLE [activity].[PracticeVersion] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [DefinitionId] bigint NOT NULL,
    [VersionNo] int NOT NULL,
    [ContentRef] nvarchar(300) NOT NULL,
    [ContentJson] nvarchar(max) NULL,
    [DifficultyTier] smallint NOT NULL,
    [EstimatedMinutes] smallint NULL,
    [EvidenceTier] nvarchar(24) NOT NULL,
    [ValidationVersion] nvarchar(64) NOT NULL,
    [RulesJson] nvarchar(max) NULL,
    [PublishedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_PracticeVersion_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_PracticeVersion] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_PracticeVersion_DefinitionId_VersionNo] UNIQUE ([DefinitionId], [VersionNo]),
    CONSTRAINT [CK_PracticeVersion_Evidence] CHECK (EvidenceTier IN ('SystemScored','BrowserObserved','SelfReported','Reviewed')),
    CONSTRAINT [CK_PracticeVersion_ContentJson_IsJson] CHECK ([ContentJson] IS NULL OR ISJSON([ContentJson]) = 1),
    CONSTRAINT [CK_PracticeVersion_RulesJson_IsJson] CHECK ([RulesJson] IS NULL OR ISJSON([RulesJson]) = 1)
);
GO
-- (17/58) activity.PracticeAttempt — One run of a practice, with its outcome, score and the resulting tier change.
CREATE TABLE [activity].[PracticeAttempt] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_PracticeAttempt_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [PersonId] bigint NOT NULL,
    [PracticeVersionId] bigint NOT NULL,
    [Source] nvarchar(16) NOT NULL,
    [ScheduledActionId] bigint NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_PracticeAttempt_Status] DEFAULT ('Started'),
    [Valid] bit NULL,
    [OutcomeCode] nvarchar(40) NULL,
    [ScoreValue] decimal(9,4) NULL,
    [StartedAtUtc] datetime2(3) NOT NULL,
    [EndedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_PracticeAttempt_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [Title] nvarchar(160) NULL,
    [ResultingTier] smallint NULL,
    [ProgressionOutcome] nvarchar(12) NULL,
    CONSTRAINT [PK_PracticeAttempt] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_PracticeAttempt_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_PracticeAttempt_Source] CHECK (Source IN ('Plan','OnDemand','Assignment')),
    CONSTRAINT [CK_PracticeAttempt_Status] CHECK (Status IN ('Started','Paused','Submitted','Completed','Invalid','Cancelled')),
    CONSTRAINT [CK_PracticeAttempt_Progression] CHECK (ProgressionOutcome IS NULL OR ProgressionOutcome IN ('Advanced','Stayed','Regressed'))
);
GO
-- (18/58) activity.OfflineRoutine — A routine the person wants to keep away from the screen.
CREATE TABLE [activity].[OfflineRoutine] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PersonId] bigint NOT NULL,
    [Title] nvarchar(160) NOT NULL,
    [Hint] nvarchar(300) NULL,
    [ScheduleRuleJson] nvarchar(400) NULL,
    [IsInitialCommitment] bit NOT NULL CONSTRAINT [DF_OfflineRoutine_IsInitialCommitment] DEFAULT (0),
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_OfflineRoutine_Status] DEFAULT ('Active'),
    [ArchivedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_OfflineRoutine_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_OfflineRoutine] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_OfflineRoutine_Status] CHECK (Status IN ('Active','Paused','Archived')),
    CONSTRAINT [CK_OfflineRoutine_ScheduleRuleJson_IsJson] CHECK ([ScheduleRuleJson] IS NULL OR ISJSON([ScheduleRuleJson]) = 1)
);
GO
-- (19/58) activity.RoutineCheckIn — Done / Skipped for a routine on one local date.
CREATE TABLE [activity].[RoutineCheckIn] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [RoutineId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [LocalDate] date NOT NULL,
    [State] nvarchar(16) NOT NULL,
    [RecordedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_RoutineCheckIn_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_RoutineCheckIn] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_RoutineCheckIn_RoutineId_LocalDate] UNIQUE ([RoutineId], [LocalDate]),
    CONSTRAINT [CK_RoutineCheckIn_State] CHECK (State IN ('Done','Skipped'))
);
GO
-- (20/58) shield.ExtensionInstallation — A browser extension explicitly paired to a person.
CREATE TABLE [shield].[ExtensionInstallation] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PersonId] bigint NOT NULL,
    [InstallationPublicId] uniqueidentifier NOT NULL,
    [BrowserCode] nvarchar(40) NOT NULL,
    [ExtensionVersion] nvarchar(40) NOT NULL,
    [SyncKeyHash] varbinary(64) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_ExtensionInstallation_Status] DEFAULT ('Connected'),
    [PairedAtUtc] datetime2(3) NOT NULL,
    [LastSeenAtUtc] datetime2(3) NULL,
    [RevokedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ExtensionInstallation_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_ExtensionInstallation] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_ExtensionInstallation_InstallationPublicId] UNIQUE ([InstallationPublicId]),
    CONSTRAINT [CK_ExtensionInstallation_Status] CHECK (Status IN ('Connected','Disconnected','Revoked'))
);
GO
-- (21/58) shield.ProtectionSession — A timed website-protection session.
CREATE TABLE [shield].[ProtectionSession] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_ProtectionSession_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [PersonId] bigint NOT NULL,
    [InstallationId] bigint NOT NULL,
    [DomainCodesJson] nvarchar(1000) NOT NULL,
    [LockMode] nvarchar(16) NOT NULL CONSTRAINT [DF_ProtectionSession_LockMode] DEFAULT ('Standard'),
    [StartedAtUtc] datetime2(3) NOT NULL,
    [EndsAtUtc] datetime2(3) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_ProtectionSession_Status] DEFAULT ('Requested'),
    [FailureCode] nvarchar(40) NULL,
    [EndedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ProtectionSession_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_ProtectionSession] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_ProtectionSession_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_ProtectionSession_Status] CHECK (Status IN ('Requested','Active','Expired','Failed','Disconnected','Cancelled')),
    CONSTRAINT [CK_ProtectionSession_LockMode] CHECK (LockMode IN ('Standard','Locked')),
    CONSTRAINT [CK_ProtectionSession_DomainCodesJson_IsJson] CHECK (ISJSON([DomainCodesJson]) = 1)
);
GO
-- (22/58) shield.BrowserUsagePeriod — One batch of browser-usage facts from the extension for one local day, with per-site-family seconds.
CREATE TABLE [shield].[BrowserUsagePeriod] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PersonId] bigint NOT NULL,
    [InstallationId] bigint NOT NULL,
    [LocalDate] date NOT NULL,
    [TimeZoneId] nvarchar(80) NOT NULL,
    [ObservedSeconds] int NOT NULL,
    [CoverageSeconds] int NOT NULL,
    [SequenceNo] bigint NOT NULL,
    [ReceivedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_BrowserUsagePeriod_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [DomainsJson] nvarchar(max) NULL,
    CONSTRAINT [PK_BrowserUsagePeriod] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BrowserUsagePeriod_InstallationId_SequenceNo] UNIQUE ([InstallationId], [SequenceNo]),
    CONSTRAINT [CK_BrowserUsagePeriod_Seconds] CHECK (ObservedSeconds >= 0 AND CoverageSeconds >= 0 AND ObservedSeconds <= 86400 AND CoverageSeconds <= 86400),
    CONSTRAINT [CK_BrowserUsagePeriod_DomainsJson_IsJson] CHECK ([DomainsJson] IS NULL OR ISJSON([DomainsJson]) = 1)
);
GO
-- (23/58) institution.Initiative — The initiative itself: owner organization, lifecycle status, current revision pointer, Builder draft and cancellation.
CREATE TABLE [institution].[Initiative] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Initiative_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [InstitutionId] bigint NOT NULL,
    [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_Initiative_Status] DEFAULT ('Draft'),
    [CurrentRevisionId] bigint NULL,
    [DraftJson] nvarchar(max) NULL,
    [DraftLastSavedStage] tinyint NULL,
    [DraftUpdatedAtUtc] datetime2(3) NULL,
    [FirstPublishedAtUtc] datetime2(3) NULL,
    [CompletedAtUtc] datetime2(3) NULL,
    [CancelledAtUtc] datetime2(3) NULL,
    [CancellationReason] nvarchar(800) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Initiative_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    CONSTRAINT [PK_Initiative] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Initiative_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_Initiative_Status] CHECK (Status IN ('Draft','Published','RegistrationClosed','Suspended','Completed','Cancelled','Archived')),
    CONSTRAINT [CK_Initiative_Published] CHECK (Status IN ('Draft','Cancelled','Archived') OR CurrentRevisionId IS NOT NULL),
    CONSTRAINT [CK_Initiative_DraftJson_IsJson] CHECK ([DraftJson] IS NULL OR ISJSON([DraftJson]) = 1)
);
GO
-- (24/58) institution.InitiativeRevision — Immutable published terms of an initiative (capacity, dates, cost, audience, form). An edit with a reason creates a new row; applications point at the revision they applied on.
CREATE TABLE [institution].[InitiativeRevision] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [InitiativeId] bigint NOT NULL,
    [RevisionNo] int NOT NULL,
    [ChangeKind] nvarchar(16) NOT NULL,
    [ChangeReason] nvarchar(800) NULL,
    [Title] nvarchar(200) NOT NULL,
    [Summary] nvarchar(1200) NOT NULL,
    [TopicCode] nvarchar(64) NOT NULL,
    [OperatingMode] nvarchar(16) NOT NULL,
    [ParticipationMode] nvarchar(16) NOT NULL,
    [AudienceCode] nvarchar(80) NOT NULL,
    [CoverageCode] nvarchar(120) NULL,
    [Capacity] smallint NOT NULL,
    [WaitlistEnabled] bit NOT NULL,
    [OfferHoldHours] smallint NULL,
    [ApplicationOpensAtUtc] datetime2(3) NULL,
    [ApplicationClosesAtUtc] datetime2(3) NULL,
    [TimeZoneId] nvarchar(80) NOT NULL,
    [StartsAtUtc] datetime2(3) NOT NULL,
    [EndsAtUtc] datetime2(3) NOT NULL,
    [CostKind] nvarchar(8) NOT NULL,
    [Price] decimal(19,4) NULL,
    [Currency] char(3) NULL,
    [ConsentNoticeVersion] nvarchar(64) NOT NULL,
    [CompletionPolicyRef] nvarchar(120) NOT NULL,
    [RegistrationFormVersionId] bigint NULL,
    [PublishedSnapshotJson] nvarchar(max) NOT NULL,
    [PublishedByPersonId] bigint NOT NULL,
    [PublishedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_InitiativeRevision_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_InitiativeRevision] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_InitiativeRevision_InitiativeId_RevisionNo] UNIQUE ([InitiativeId], [RevisionNo]),
    CONSTRAINT [CK_InitiativeRevision_ChangeKind] CHECK (ChangeKind IN ('Publish','Reschedule','TermsUpdate')),
    CONSTRAINT [CK_InitiativeRevision_OperatingMode] CHECK (OperatingMode IN ('Awareness','Structured')),
    CONSTRAINT [CK_InitiativeRevision_ParticipationMode] CHECK (ParticipationMode IN ('Online','InPerson','Hybrid')),
    CONSTRAINT [CK_InitiativeRevision_Capacity] CHECK (Capacity BETWEEN 1 AND 135),
    CONSTRAINT [CK_InitiativeRevision_PublishedSnapshotJson_IsJson] CHECK (ISJSON([PublishedSnapshotJson]) = 1)
);
GO
-- (25/58) institution.InitiativeApplication — A person's application to an initiative, its waiting-list offer and its membership, in one row with a status.
CREATE TABLE [institution].[InitiativeApplication] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_InitiativeApplication_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [InitiativeId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [AttemptNo] int NOT NULL,
    [TermsRevisionId] bigint NOT NULL,
    [RegistrationResponseId] bigint NULL,
    [ParticipationMode] nvarchar(16) NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_InitiativeApplication_Status] DEFAULT ('Pending'),
    [SubmittedAtUtc] datetime2(3) NOT NULL,
    [ConsentAtUtc] datetime2(3) NOT NULL,
    [QueuedAtUtc] datetime2(3) NULL,
    [OfferedAtUtc] datetime2(3) NULL,
    [OfferExpiresAtUtc] datetime2(3) NULL,
    [OfferRespondedAtUtc] datetime2(3) NULL,
    [AcceptedAtUtc] datetime2(3) NULL,
    [WithdrawalCutoffAtUtc] datetime2(3) NULL,
    [EndedAtUtc] datetime2(3) NULL,
    [EndReason] nvarchar(32) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_InitiativeApplication_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    CONSTRAINT [PK_InitiativeApplication] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_InitiativeApplication_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [UQ_InitiativeApplication_InitiativeId_PersonId_AttemptNo] UNIQUE ([InitiativeId], [PersonId], [AttemptNo]),
    CONSTRAINT [CK_InitiativeApplication_Status] CHECK (Status IN ('Pending','Queued','Offered','Accepted','Suspended','Rejected','Withdrawn','OfferDeclined','OfferExpired','Removed','Completed','Cancelled','Blocked','BlockLifted'))
);
GO
-- (26/58) coach.CoachProgram — An independent coach program: owner, status, title, draft and the current published content.
CREATE TABLE [coach].[CoachProgram] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_CoachProgram_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [OwnerPersonId] bigint NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_CoachProgram_Status] DEFAULT ('Draft'),
    [DraftJson] nvarchar(max) NULL,
    [DraftUpdatedAtUtc] datetime2(3) NULL,
    [SuspendedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_CoachProgram_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [Title] nvarchar(200) NULL,
    [PublishedJson] nvarchar(max) NULL,
    [PublishedVersionNo] int NULL,
    [PublishedAtUtc] datetime2(3) NULL,
    CONSTRAINT [PK_CoachProgram] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_CoachProgram_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_CoachProgram_Status] CHECK (Status IN ('Draft','Published','Paused','Suspended','Completed','Archived')),
    CONSTRAINT [CK_CoachProgram_DraftJson_IsJson] CHECK ([DraftJson] IS NULL OR ISJSON([DraftJson]) = 1),
    CONSTRAINT [CK_CoachProgram_PublishedJson_IsJson] CHECK ([PublishedJson] IS NULL OR ISJSON([PublishedJson]) = 1)
);
GO
-- (27/58) coach.OperationalGroup — A group under one initiative or one program, with its current coach.
CREATE TABLE [coach].[OperationalGroup] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_OperationalGroup_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [InitiativeId] bigint NULL,
    [ProgramId] bigint NULL,
    [Name] nvarchar(160) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_OperationalGroup_Status] DEFAULT ('Open'),
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_OperationalGroup_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [CoachPersonId] bigint NULL,
    [CoachStaffAppointmentId] bigint NULL,
    [CoachAssignedAtUtc] datetime2(3) NULL,
    [Purpose] nvarchar(300) NULL,
    [Description] nvarchar(1000) NULL,
    [Capacity] smallint NULL,
    [RequiresApproval] bit NOT NULL CONSTRAINT [DF_OperationalGroup_RequiresApproval] DEFAULT (0),
    CONSTRAINT [PK_OperationalGroup] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_OperationalGroup_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_OperationalGroup_Parent] CHECK ((InitiativeId IS NOT NULL AND ProgramId IS NULL) OR (InitiativeId IS NULL AND ProgramId IS NOT NULL)),
    CONSTRAINT [CK_OperationalGroup_Status] CHECK (Status IN ('Open','Closed','Archived')),
    CONSTRAINT [CK_OperationalGroup_Capacity] CHECK (Capacity IS NULL OR (Capacity > 0 AND Capacity <= 500))
);
GO
-- (28/58) coach.GroupMembership — Invitation to, membership in, and placement in a group (program invitation by email, or initiative placement by application).
CREATE TABLE [coach].[GroupMembership] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [GroupId] bigint NOT NULL,
    [ApplicationId] bigint NULL,
    [PersonId] bigint NULL,
    [Status] nvarchar(16) NOT NULL,
    [NormalizedEmail] nvarchar(320) NULL,
    [TokenHash] varbinary(64) NULL,
    [InviteExpiresAtUtc] datetime2(3) NULL,
    [InvitedByPersonId] bigint NULL,
    [StartedAtUtc] datetime2(3) NULL,
    [EndedAtUtc] datetime2(3) NULL,
    [EndReason] nvarchar(24) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_GroupMembership_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    CONSTRAINT [PK_GroupMembership] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_GroupMembership_Status] CHECK (Status IN ('Invited','Pending','Active','Ended','Declined','Expired','Revoked')),
    CONSTRAINT [CK_GroupMembership_Identity] CHECK ((Status = 'Invited' AND PersonId IS NULL AND NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL) OR (Status IN ('Declined','Expired','Revoked') AND (PersonId IS NOT NULL OR (NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL))) OR (Status IN ('Pending','Active','Ended') AND PersonId IS NOT NULL))
);
GO
-- (29/58) task.Assignment — A task a coach gives to a group, with its current text and due date.
CREATE TABLE [task].[Assignment] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Assignment_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [GroupId] bigint NOT NULL,
    [AuthorPersonId] bigint NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Assignment_Status] DEFAULT ('Draft'),
    [CancelledAtUtc] datetime2(3) NULL,
    [CancelReason] nvarchar(800) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Assignment_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [PracticeVersionId] bigint NULL,
    [Instructions] nvarchar(max) NOT NULL,
    [ReviewMode] nvarchar(16) NOT NULL,
    [IsRequired] bit NOT NULL,
    [StartsAtUtc] datetime2(3) NULL,
    [DueAtUtc] datetime2(3) NULL,
    [AllowLate] bit NOT NULL CONSTRAINT [DF_Assignment_AllowLate] DEFAULT (0),
    [RevisionNo] int NOT NULL CONSTRAINT [DF_Assignment_RevisionNo] DEFAULT (1),
    [HistoryJson] nvarchar(max) NULL,
    CONSTRAINT [PK_Assignment] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Assignment_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_Assignment_Status] CHECK (Status IN ('Draft','Published','Cancelled','Closed')),
    CONSTRAINT [CK_Assignment_ReviewMode] CHECK (ReviewMode IN ('SystemRule','CoachReview')),
    CONSTRAINT [CK_Assignment_HistoryJson_IsJson] CHECK ([HistoryJson] IS NULL OR ISJSON([HistoryJson]) = 1)
);
GO
-- (30/58) task.AssignmentRecipient — One student's copy of an assignment and its progress state.
CREATE TABLE [task].[AssignmentRecipient] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [AssignmentId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_AssignmentRecipient_Status] DEFAULT ('Assigned'),
    [LastAttemptNo] int NOT NULL CONSTRAINT [DF_AssignmentRecipient_LastAttemptNo] DEFAULT (0),
    [AssignedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_AssignmentRecipient_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [AssignedRevisionNo] int NOT NULL CONSTRAINT [DF_AssignmentRecipient_AssignedRevisionNo] DEFAULT (1),
    CONSTRAINT [PK_AssignmentRecipient] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_AssignmentRecipient_AssignmentId_PersonId] UNIQUE ([AssignmentId], [PersonId]),
    CONSTRAINT [CK_AssignmentRecipient_Status] CHECK (Status IN ('Assigned','InProgress','Submitted','NeedsRevision','Approved','Rejected','Cancelled','Expired'))
);
GO
-- (31/58) task.SubmissionAttempt — Each submission and resubmission by a student (text, file or linked practice).
CREATE TABLE [task].[SubmissionAttempt] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [RecipientId] bigint NOT NULL,
    [AttemptNo] int NOT NULL,
    [Body] nvarchar(max) NULL,
    [FileId] bigint NULL,
    [PracticeAttemptId] bigint NULL,
    [SubmittedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_SubmissionAttempt_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_SubmissionAttempt] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_SubmissionAttempt_RecipientId_AttemptNo] UNIQUE ([RecipientId], [AttemptNo])
);
GO
-- (32/58) task.ReviewDecision — A coach's decision on a submission (Approved / NeedsRevision / Rejected) with feedback and an internal note. A correction is a new row that supersedes the old one.
CREATE TABLE [task].[ReviewDecision] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [AttemptId] bigint NOT NULL,
    [SupersedesId] bigint NULL,
    [ReviewerPersonId] bigint NOT NULL,
    [Decision] nvarchar(16) NOT NULL,
    [Feedback] nvarchar(2000) NULL,
    [DecidedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ReviewDecision_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [PrivateNote] nvarchar(max) NULL,
    CONSTRAINT [PK_ReviewDecision] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_ReviewDecision_Decision] CHECK (Decision IN ('Approved','NeedsRevision','Rejected'))
);
GO
-- (33/58) task.OperationalReport — Coach, initiative-supervisor and provider-supervisor reports; coach reports are reviewed and included in a supervisor report.
CREATE TABLE [task].[OperationalReport] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_OperationalReport_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [Kind] nvarchar(24) NOT NULL,
    [GroupId] bigint NULL,
    [InitiativeId] bigint NULL,
    [ExperienceId] bigint NULL,
    [AuthorPersonId] bigint NOT NULL,
    [PeriodStartDate] date NOT NULL,
    [PeriodEndDate] date NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_OperationalReport_Status] DEFAULT ('Draft'),
    [MetricsSnapshotJson] nvarchar(max) NULL,
    [SubmittedAtUtc] datetime2(3) NULL,
    [IncludedInReportId] bigint NULL,
    [ReviewedByPersonId] bigint NULL,
    [ReviewedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_OperationalReport_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [BodyJson] nvarchar(max) NULL,
    [ReviewJson] nvarchar(max) NULL,
    CONSTRAINT [PK_OperationalReport] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_OperationalReport_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_OperationalReport_Kind] CHECK (Kind IN ('Coach','InitiativeSupervisor','ProviderSupervisor')),
    CONSTRAINT [CK_OperationalReport_Scope] CHECK ((Kind = 'Coach' AND GroupId IS NOT NULL AND ExperienceId IS NULL) OR (Kind = 'InitiativeSupervisor' AND InitiativeId IS NOT NULL AND GroupId IS NULL AND ExperienceId IS NULL) OR (Kind = 'ProviderSupervisor' AND ExperienceId IS NOT NULL AND GroupId IS NULL AND InitiativeId IS NULL)),
    CONSTRAINT [CK_OperationalReport_Status] CHECK (Status IN ('Draft','Submitted')),
    CONSTRAINT [CK_OperationalReport_MetricsSnapshotJson_IsJson] CHECK ([MetricsSnapshotJson] IS NULL OR ISJSON([MetricsSnapshotJson]) = 1),
    CONSTRAINT [CK_OperationalReport_BodyJson_IsJson] CHECK ([BodyJson] IS NULL OR ISJSON([BodyJson]) = 1),
    CONSTRAINT [CK_OperationalReport_ReviewJson_IsJson] CHECK ([ReviewJson] IS NULL OR ISJSON([ReviewJson]) = 1)
);
GO
-- (34/58) session.Session — A session (or meeting) of an initiative or an experience, with time, mode, capacity per mode, venue and check-in window.
CREATE TABLE [session].[Session] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Session_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [InitiativeId] bigint NULL,
    [ExperienceId] bigint NULL,
    [Purpose] nvarchar(16) NOT NULL CONSTRAINT [DF_Session_Purpose] DEFAULT ('Session'),
    [Title] nvarchar(200) NOT NULL,
    [Mode] nvarchar(16) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Session_Status] DEFAULT ('Draft'),
    [TimeZoneId] nvarchar(80) NOT NULL,
    [StartsAtUtc] datetime2(3) NOT NULL,
    [EndsAtUtc] datetime2(3) NOT NULL,
    [AttendanceRequired] bit NOT NULL,
    [OnlineCapacity] int NULL,
    [InPersonCapacity] int NULL,
    [MeetingAudience] nvarchar(16) NULL,
    [MeetingAudiencePersonId] bigint NULL,
    [CancelledAtUtc] datetime2(3) NULL,
    [CancelReason] nvarchar(800) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Session_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [Venue] nvarchar(300) NULL,
    [ProtectedLinkRef] nvarchar(300) NULL,
    [CheckInBeforeMinutes] smallint NOT NULL,
    [CheckInAfterMinutes] smallint NOT NULL,
    [CompletionRuleRef] nvarchar(120) NULL,
    CONSTRAINT [PK_Session] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Session_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_Session_Owner] CHECK ((InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL)),
    CONSTRAINT [CK_Session_Purpose] CHECK (Purpose IN ('Session','Meeting')),
    CONSTRAINT [CK_Session_Mode] CHECK (Mode IN ('Online','InPerson','Hybrid')),
    CONSTRAINT [CK_Session_Status] CHECK (Status IN ('Draft','Published','Cancelled','Completed')),
    CONSTRAINT [CK_Session_Capacity] CHECK ((OnlineCapacity IS NULL OR OnlineCapacity > 0) AND (InPersonCapacity IS NULL OR InPersonCapacity > 0))
);
GO
-- (35/58) session.SessionDuty — Which supervisors are responsible for a session.
CREATE TABLE [session].[SessionDuty] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [SessionId] bigint NOT NULL,
    [StaffAppointmentId] bigint NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_SessionDuty_Status] DEFAULT ('Active'),
    [AssignedByPersonId] bigint NOT NULL,
    [AssignedAtUtc] datetime2(3) NOT NULL,
    [RevokedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_SessionDuty_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_SessionDuty] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_SessionDuty_Status] CHECK (Status IN ('Active','Revoked'))
);
GO
-- (36/58) session.SessionRegistration — A member's registration to a session and the mode (online or on-site).
CREATE TABLE [session].[SessionRegistration] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_SessionRegistration_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [SessionId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [Mode] nvarchar(16) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_SessionRegistration_Status] DEFAULT ('Pending'),
    [RegistrationResponseId] bigint NULL,
    [CredentialHash] varbinary(32) NULL,
    [RegisteredAtUtc] datetime2(3) NOT NULL,
    [CancelledAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_SessionRegistration_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_SessionRegistration] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_SessionRegistration_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_SessionRegistration_Mode] CHECK (Mode IN ('Online','InPerson')),
    CONSTRAINT [CK_SessionRegistration_Status] CHECK (Status IN ('Pending','Confirmed','Cancelled'))
);
GO
-- (37/58) session.Attendance — What actually happened: Present / Late / Absent / NotRecorded, how it was recorded, and the outcome.
CREATE TABLE [session].[Attendance] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [SessionId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [RegistrationId] bigint NULL,
    [BookingId] bigint NULL,
    [Status] nvarchar(16) NOT NULL,
    [Method] nvarchar(24) NULL,
    [MethodReason] nvarchar(800) NULL,
    [RecordedByPersonId] bigint NOT NULL,
    [RecordedAtUtc] datetime2(3) NOT NULL,
    [OutcomeCode] nvarchar(16) NULL,
    [OutcomeNotes] nvarchar(2000) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Attendance_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    CONSTRAINT [PK_Attendance] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Attendance_SessionId_PersonId] UNIQUE ([SessionId], [PersonId]),
    CONSTRAINT [CK_Attendance_Status] CHECK (Status IN ('Present','Late','Absent','NotRecorded')),
    CONSTRAINT [CK_Attendance_Source] CHECK ((RegistrationId IS NOT NULL AND BookingId IS NULL) OR (RegistrationId IS NULL AND BookingId IS NOT NULL))
);
GO
-- (38/58) session.AbsenceExcuse — A student's excuse for an absence, the supervisor's recommendation and the representative's decision.
CREATE TABLE [session].[AbsenceExcuse] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_AbsenceExcuse_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [AttendanceId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [Reason] nvarchar(1000) NOT NULL,
    [FileId] bigint NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_AbsenceExcuse_Status] DEFAULT ('Submitted'),
    [Recommendation] nvarchar(8) NULL,
    [RecommendationNote] nvarchar(1000) NULL,
    [RecommendedByPersonId] bigint NULL,
    [RecommendedAtUtc] datetime2(3) NULL,
    [DecidedByPersonId] bigint NULL,
    [DecisionReason] nvarchar(1000) NULL,
    [DecidedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_AbsenceExcuse_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    CONSTRAINT [PK_AbsenceExcuse] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_AbsenceExcuse_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [UQ_AbsenceExcuse_AttendanceId] UNIQUE ([AttendanceId]),
    CONSTRAINT [CK_AbsenceExcuse_Status] CHECK (Status IN ('Submitted','MoreInfo','Recommended','Accepted','Rejected','Withdrawn'))
);
GO
-- (39/58) session.Completion — Completion of an initiative, a coach program or a provider camp.
CREATE TABLE [session].[Completion] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Completion_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [Kind] nvarchar(16) NOT NULL,
    [PersonId] bigint NOT NULL,
    [ApplicationId] bigint NULL,
    [ProgramId] bigint NULL,
    [BookingId] bigint NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Completion_Status] DEFAULT ('Pending'),
    [EvaluatorPersonId] bigint NULL,
    [EvaluatedAtUtc] datetime2(3) NULL,
    [BasisJson] nvarchar(max) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Completion_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Completion] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Completion_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_Completion_Kind] CHECK (Kind IN ('Initiative','Program','Camp')),
    CONSTRAINT [CK_Completion_Status] CHECK (Status IN ('Pending','Completed','NotMet')),
    CONSTRAINT [CK_Completion_Subject] CHECK ((Kind = 'Initiative' AND ApplicationId IS NOT NULL AND ProgramId IS NULL AND BookingId IS NULL) OR (Kind = 'Program' AND ProgramId IS NOT NULL AND ApplicationId IS NULL AND BookingId IS NULL) OR (Kind = 'Camp' AND BookingId IS NOT NULL AND ApplicationId IS NULL AND ProgramId IS NULL)),
    CONSTRAINT [CK_Completion_BasisJson_IsJson] CHECK ([BasisJson] IS NULL OR ISJSON([BasisJson]) = 1)
);
GO
-- (40/58) provider.Experience — A provider experience or camp: owner provider, kind, lifecycle status, current revision pointer, Builder draft and cancellation.
CREATE TABLE [provider].[Experience] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Experience_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [ProviderId] bigint NOT NULL,
    [Kind] nvarchar(16) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Experience_Status] DEFAULT ('Draft'),
    [CurrentRevisionId] bigint NULL,
    [DraftJson] nvarchar(max) NULL,
    [DraftLastSavedStage] tinyint NULL,
    [DraftUpdatedAtUtc] datetime2(3) NULL,
    [CancelledAtUtc] datetime2(3) NULL,
    [CancellationReason] nvarchar(800) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Experience_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    CONSTRAINT [PK_Experience] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Experience_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_Experience_Kind] CHECK (Kind IN ('Experience','Camp')),
    CONSTRAINT [CK_Experience_Status] CHECK (Status IN ('Draft','Published','Suspended','Completed','Cancelled','Archived')),
    CONSTRAINT [CK_Experience_Published] CHECK (Status IN ('Draft','Archived','Cancelled') OR CurrentRevisionId IS NOT NULL),
    CONSTRAINT [CK_Experience_DraftJson_IsJson] CHECK ([DraftJson] IS NULL OR ISJSON([DraftJson]) = 1)
);
GO
-- (41/58) provider.ExperienceRevision — Immutable published terms of an experience (place, time, price, capacity, eligibility, forms). An edit creates a new row; a booking records the revision it was made on.
CREATE TABLE [provider].[ExperienceRevision] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [ExperienceId] bigint NOT NULL,
    [RevisionNo] int NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Venue] nvarchar(300) NOT NULL,
    [City] nvarchar(120) NULL,
    [TimeZoneId] nvarchar(80) NOT NULL,
    [StartsAtUtc] datetime2(3) NOT NULL,
    [EndsAtUtc] datetime2(3) NOT NULL,
    [BookingOpensAtUtc] datetime2(3) NULL,
    [BookingClosesAtUtc] datetime2(3) NULL,
    [Capacity] int NOT NULL,
    [WaitlistEnabled] bit NOT NULL,
    [OfferHoldHours] smallint NULL,
    [AudienceCode] nvarchar(80) NOT NULL,
    [MinAge] tinyint NULL,
    [MaxAge] tinyint NULL,
    [ConsentNoticeVersion] nvarchar(64) NOT NULL,
    [SafetyRef] nvarchar(300) NOT NULL,
    [CancellationPolicyRef] nvarchar(300) NOT NULL,
    [CostKind] nvarchar(8) NOT NULL,
    [Price] decimal(19,4) NULL,
    [Currency] char(3) NULL,
    [CompletionRuleRef] nvarchar(120) NOT NULL,
    [ParticipantFormVersionId] bigint NULL,
    [ChangeReason] nvarchar(800) NULL,
    [PublishedSnapshotJson] nvarchar(max) NOT NULL,
    [PublishedByPersonId] bigint NOT NULL,
    [PublishedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ExperienceRevision_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RequiresApproval] bit NOT NULL CONSTRAINT [DF_ExperienceRevision_RequiresApproval] DEFAULT (0),
    CONSTRAINT [PK_ExperienceRevision] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_ExperienceRevision_ExperienceId_RevisionNo] UNIQUE ([ExperienceId], [RevisionNo]),
    CONSTRAINT [CK_ExperienceRevision_Capacity] CHECK (Capacity > 0),
    CONSTRAINT [CK_ExperienceRevision_PublishedSnapshotJson_IsJson] CHECK (ISJSON([PublishedSnapshotJson]) = 1)
);
GO
-- (42/58) provider.ExperienceBooking — A person's booking, waiting-list offer and confirmation for an experience, in one row with a status.
CREATE TABLE [provider].[ExperienceBooking] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_ExperienceBooking_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [ExperienceId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [RevisionId] bigint NOT NULL,
    [Status] nvarchar(16) NOT NULL,
    [Mode] nvarchar(16) NULL,
    [ConsentAtUtc] datetime2(3) NOT NULL,
    [ParticipantResponseId] bigint NULL,
    [QueuedAtUtc] datetime2(3) NULL,
    [OfferedAtUtc] datetime2(3) NULL,
    [OfferExpiresAtUtc] datetime2(3) NULL,
    [OfferRespondedAtUtc] datetime2(3) NULL,
    [ConfirmedAtUtc] datetime2(3) NULL,
    [CancelledAtUtc] datetime2(3) NULL,
    [CancelReason] nvarchar(800) NULL,
    [CredentialHash] varbinary(32) NULL,
    [BookedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ExperienceBooking_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [CohortId] bigint NULL,
    CONSTRAINT [PK_ExperienceBooking] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_ExperienceBooking_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_ExperienceBooking_Status] CHECK (Status IN ('Pending','Queued','Offered','Confirmed','Cancelled','OfferDeclined','OfferExpired','Rejected'))
);
GO
-- (43/58) provider.ProviderCohort — A cohort (group) of confirmed bookings under one supervisor.
CREATE TABLE [provider].[ProviderCohort] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [ExperienceId] bigint NOT NULL,
    [SupervisorAppointmentId] bigint NOT NULL,
    [Name] nvarchar(160) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_ProviderCohort_Status] DEFAULT ('Active'),
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ProviderCohort_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [Description] nvarchar(500) NULL,
    [Capacity] smallint NULL,
    [JoinTokenHash] varbinary(64) NULL,
    CONSTRAINT [PK_ProviderCohort] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_ProviderCohort_Status] CHECK (Status IN ('Active','Closed')),
    CONSTRAINT [CK_ProviderCohort_Capacity] CHECK (Capacity IS NULL OR (Capacity > 0 AND Capacity <= 500))
);
GO
-- (44/58) provider.ProviderIncident — A safety incident reported by provider staff and its resolution.
CREATE TABLE [provider].[ProviderIncident] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_ProviderIncident_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [ExperienceId] bigint NOT NULL,
    [SessionId] bigint NULL,
    [BookingId] bigint NULL,
    [ReportedByPersonId] bigint NOT NULL,
    [Summary] nvarchar(2000) NOT NULL,
    [FileId] bigint NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_ProviderIncident_Status] DEFAULT ('Open'),
    [OccurredAtUtc] datetime2(3) NOT NULL,
    [ResolutionNote] nvarchar(2000) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ProviderIncident_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_ProviderIncident] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_ProviderIncident_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_ProviderIncident_Status] CHECK (Status IN ('Open','Reviewed','Closed'))
);
GO
-- (45/58) forms.Form — A registration form, survey or competition owned by an initiative or an experience.
CREATE TABLE [forms].[Form] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Form_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [InitiativeId] bigint NULL,
    [ExperienceId] bigint NULL,
    [Purpose] nvarchar(16) NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_Form_Status] DEFAULT ('Draft'),
    [CurrentVersionId] bigint NULL,
    [DraftJson] nvarchar(max) NULL,
    [ResultsPublishedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Form_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    CONSTRAINT [PK_Form] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Form_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_Form_Owner] CHECK ((InitiativeId IS NOT NULL AND ExperienceId IS NULL) OR (InitiativeId IS NULL AND ExperienceId IS NOT NULL)),
    CONSTRAINT [CK_Form_Purpose] CHECK (Purpose IN ('Registration','Survey','Quiz','Feedback','Competition')),
    CONSTRAINT [CK_Form_Status] CHECK (Status IN ('Draft','Published','Closed','ResultsPublished','Archived')),
    CONSTRAINT [CK_Form_Published] CHECK (Status IN ('Draft','Archived') OR CurrentVersionId IS NOT NULL),
    CONSTRAINT [CK_Form_DraftJson_IsJson] CHECK ([DraftJson] IS NULL OR ISJSON([DraftJson]) = 1)
);
GO
-- (46/58) forms.FormVersion — A published, immutable version of a form. Responses point at the version they answered.
CREATE TABLE [forms].[FormVersion] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [FormId] bigint NOT NULL,
    [VersionNo] int NOT NULL,
    [ConsentNoticeVersion] nvarchar(64) NOT NULL,
    [OpensAtUtc] datetime2(3) NOT NULL,
    [ClosesAtUtc] datetime2(3) NOT NULL,
    [AllowMultipleResponses] bit NOT NULL CONSTRAINT [DF_FormVersion_AllowMultipleResponses] DEFAULT (0),
    [RulesText] nvarchar(max) NULL,
    [EntryPolicyJson] nvarchar(max) NULL,
    [PublishedByPersonId] bigint NOT NULL,
    [PublishedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_FormVersion_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [DefinitionJson] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_FormVersion] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_FormVersion_FormId_VersionNo] UNIQUE ([FormId], [VersionNo]),
    CONSTRAINT [CK_FormVersion_EntryPolicyJson_IsJson] CHECK ([EntryPolicyJson] IS NULL OR ISJSON([EntryPolicyJson]) = 1),
    CONSTRAINT [CK_FormVersion_DefinitionJson_IsJson] CHECK (ISJSON([DefinitionJson]) = 1)
);
GO
-- (47/58) forms.FormResponse — One person's response (or competition entry) to a form version, with all answers.
CREATE TABLE [forms].[FormResponse] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_FormResponse_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [FormVersionId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [ResponseNo] int NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_FormResponse_Status] DEFAULT ('Draft'),
    [ConsentAtUtc] datetime2(3) NULL,
    [SubmittedAtUtc] datetime2(3) NULL,
    [WithdrawnAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_FormResponse_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [AnswersJson] nvarchar(max) NULL,
    CONSTRAINT [PK_FormResponse] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_FormResponse_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [UQ_FormResponse_FormVersionId_PersonId_ResponseNo] UNIQUE ([FormVersionId], [PersonId], [ResponseNo]),
    CONSTRAINT [CK_FormResponse_Status] CHECK (Status IN ('Draft','Submitted','Withdrawn')),
    CONSTRAINT [CK_FormResponse_AnswersJson_IsJson] CHECK ([AnswersJson] IS NULL OR ISJSON([AnswersJson]) = 1)
);
GO
-- (48/58) forms.CompetitionJudgment — A judge's decision and criterion scores for one competition entry.
CREATE TABLE [forms].[CompetitionJudgment] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [ResponseId] bigint NOT NULL,
    [JudgePersonId] bigint NOT NULL,
    [Decision] nvarchar(16) NOT NULL,
    [Feedback] nvarchar(2000) NULL,
    [DecidedAtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_CompetitionJudgment_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [ScoresJson] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_CompetitionJudgment] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_CompetitionJudgment_ResponseId_JudgePersonId] UNIQUE ([ResponseId], [JudgePersonId]),
    CONSTRAINT [CK_CompetitionJudgment_Decision] CHECK (Decision IN ('Scored','Disqualified','Abstained')),
    CONSTRAINT [CK_CompetitionJudgment_ScoresJson_IsJson] CHECK (ISJSON([ScoresJson]) = 1)
);
GO
-- (49/58) community.Post — A community post.
CREATE TABLE [community].[Post] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Post_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [AuthorPersonId] bigint NOT NULL,
    [TopicCode] nvarchar(40) NULL,
    [Body] nvarchar(max) NOT NULL,
    [ImageFileId] bigint NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Post_Status] DEFAULT ('Draft'),
    [PublishedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Post_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [SharedAchievementJson] nvarchar(1000) NULL,
    CONSTRAINT [PK_Post] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Post_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_Post_Status] CHECK (Status IN ('Draft','Published','Hidden','Removed')),
    CONSTRAINT [CK_Post_SharedAchievementJson_IsJson] CHECK ([SharedAchievementJson] IS NULL OR ISJSON([SharedAchievementJson]) = 1)
);
GO
-- (50/58) community.Comment — A comment under a post.
CREATE TABLE [community].[Comment] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PostId] bigint NOT NULL,
    [AuthorPersonId] bigint NOT NULL,
    [Body] nvarchar(2000) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Comment_Status] DEFAULT ('Published'),
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Comment_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Comment] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_Comment_Status] CHECK (Status IN ('Published','Hidden','Removed'))
);
GO
-- (51/58) community.PostInteraction — A reaction or a bookmark of one person on one post.
CREATE TABLE [community].[PostInteraction] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PostId] bigint NOT NULL,
    [PersonId] bigint NOT NULL,
    [ReactionCode] nvarchar(24) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_PostInteraction_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [Kind] nvarchar(12) NOT NULL CONSTRAINT [DF_PostInteraction_Kind] DEFAULT ('Reaction'),
    CONSTRAINT [PK_PostInteraction] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_PostInteraction_PostId_PersonId_Kind_ReactionCode] UNIQUE ([PostId], [PersonId], [Kind], [ReactionCode]),
    CONSTRAINT [CK_PostInteraction_Kind] CHECK (Kind IN ('Reaction','Bookmark')),
    CONSTRAINT [CK_PostInteraction_Code] CHECK ((Kind = 'Reaction' AND ReactionCode IS NOT NULL) OR (Kind = 'Bookmark' AND ReactionCode IS NULL))
);
GO
-- (52/58) community.ContentReport — A report of a post or comment, and the moderator's resolution. Hide/restore actions without a report are recorded in AuditEvent.
CREATE TABLE [community].[ContentReport] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PostId] bigint NULL,
    [CommentId] bigint NULL,
    [ReporterPersonId] bigint NOT NULL,
    [ReasonCode] nvarchar(40) NOT NULL,
    [Details] nvarchar(1000) NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_ContentReport_Status] DEFAULT ('Submitted'),
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ContentReport_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    [ResolvedByPersonId] bigint NULL,
    [Resolution] nvarchar(16) NULL,
    [ResolutionReason] nvarchar(1000) NULL,
    [ResolvedAtUtc] datetime2(3) NULL,
    CONSTRAINT [PK_ContentReport] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_ContentReport_Target] CHECK ((PostId IS NOT NULL AND CommentId IS NULL) OR (PostId IS NULL AND CommentId IS NOT NULL)),
    CONSTRAINT [CK_ContentReport_Status] CHECK (Status IN ('Submitted','Reviewing','Resolved')),
    CONSTRAINT [CK_ContentReport_Resolution] CHECK (Resolution IN ('Hide','Remove','Restore','Dismiss'))
);
GO
-- (53/58) partnership.PartnershipLink — A link between an initiative and a coach program or provider experience, without moving ownership.
CREATE TABLE [partnership].[PartnershipLink] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_PartnershipLink_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [InitiativeId] bigint NOT NULL,
    [ProgramId] bigint NULL,
    [ExperienceId] bigint NULL,
    [Purpose] nvarchar(800) NULL,
    [DataSharingScopeJson] nvarchar(max) NULL,
    [StartsOnLocalDate] date NULL,
    [EndsOnLocalDate] date NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_PartnershipLink_Status] DEFAULT ('Requested'),
    [RequestedByPersonId] bigint NOT NULL,
    [RespondedByPersonId] bigint NULL,
    [RespondedAtUtc] datetime2(3) NULL,
    [EndedAtUtc] datetime2(3) NULL,
    [EndedByPersonId] bigint NULL,
    [EndReason] nvarchar(800) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_PartnershipLink_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_PartnershipLink] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_PartnershipLink_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [CK_PartnershipLink_Target] CHECK ((ProgramId IS NOT NULL AND ExperienceId IS NULL) OR (ProgramId IS NULL AND ExperienceId IS NOT NULL)),
    CONSTRAINT [CK_PartnershipLink_Status] CHECK (Status IN ('Requested','Accepted','Declined','Ended')),
    CONSTRAINT [CK_PartnershipLink_Scope] CHECK (DataSharingScopeJson IS NULL OR ISJSON(DataSharingScopeJson) = 1),
    CONSTRAINT [CK_PartnershipLink_DataSharingScopeJson_IsJson] CHECK ([DataSharingScopeJson] IS NULL OR ISJSON([DataSharingScopeJson]) = 1)
);
GO
-- (54/58) governance.ContentRelease — Admin-edited content with draft and published versions. Also stores the Garden Rules.
CREATE TABLE [governance].[ContentRelease] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [TargetCode] nvarchar(120) NOT NULL,
    [VersionNo] int NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_ContentRelease_Status] DEFAULT ('Draft'),
    [PayloadJson] nvarchar(max) NOT NULL,
    [PublishedByPersonId] bigint NULL,
    [PublishedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_ContentRelease_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [RowVersion] rowversion NOT NULL,
    CONSTRAINT [PK_ContentRelease] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_ContentRelease_TargetCode_VersionNo] UNIQUE ([TargetCode], [VersionNo]),
    CONSTRAINT [CK_ContentRelease_Status] CHECK (Status IN ('Draft','Published','Superseded')),
    CONSTRAINT [CK_ContentRelease_PayloadJson_IsJson] CHECK (ISJSON([PayloadJson]) = 1)
);
GO
-- (55/58) ops.AuditEvent — The one history log: who did what to which row, with before/after status, reason and details. Timelines in the UI are read from it.
CREATE TABLE [ops].[AuditEvent] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [ActorPersonId] bigint NULL,
    [ActorCapacity] nvarchar(24) NULL,
    [ResourceKind] nvarchar(64) NOT NULL,
    [Action] nvarchar(64) NOT NULL,
    [BeforeStatus] nvarchar(40) NULL,
    [AfterStatus] nvarchar(40) NULL,
    [Reason] nvarchar(1000) NULL,
    [DetailJson] nvarchar(max) NULL,
    [AtUtc] datetime2(3) NOT NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_AuditEvent_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [ResourceId] bigint NOT NULL,
    CONSTRAINT [PK_AuditEvent] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [CK_AuditEvent_DetailJson_IsJson] CHECK ([DetailJson] IS NULL OR ISJSON([DetailJson]) = 1)
);
GO
-- (56/58) ops.Notification — An in-app notification to one person (for example "you were removed from the initiative").
CREATE TABLE [ops].[Notification] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_Notification_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [RecipientPersonId] bigint NOT NULL,
    [EventPublicId] uniqueidentifier NOT NULL,
    [TemplateCode] nvarchar(80) NOT NULL,
    [ResourceKind] nvarchar(64) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Notification_Status] DEFAULT ('Ready'),
    [ReadAtUtc] datetime2(3) NULL,
    [EmailOutboxMessageId] bigint NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Notification_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [ResourceId] bigint NULL,
    [ParamsJson] nvarchar(2000) NULL,
    CONSTRAINT [PK_Notification] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Notification_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [UQ_Notification_RecipientPersonId_EventPublicId_TemplateCode] UNIQUE ([RecipientPersonId], [EventPublicId], [TemplateCode]),
    CONSTRAINT [CK_Notification_Status] CHECK (Status IN ('Pending','Ready','Read','Withdrawn')),
    CONSTRAINT [CK_Notification_ParamsJson_IsJson] CHECK ([ParamsJson] IS NULL OR ISJSON([ParamsJson]) = 1)
);
GO
-- (57/58) ops.OutboxMessage — Emails waiting to be sent reliably (OTP, invitations, removal notices).
CREATE TABLE [ops].[OutboxMessage] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [EventPublicId] uniqueidentifier NOT NULL,
    [EventType] nvarchar(120) NOT NULL,
    [Channel] nvarchar(16) NOT NULL CONSTRAINT [DF_OutboxMessage_Channel] DEFAULT ('Internal'),
    [PayloadJson] nvarchar(max) NOT NULL,
    [OccurredAtUtc] datetime2(3) NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_OutboxMessage_Status] DEFAULT ('Pending'),
    [Attempts] int NOT NULL CONSTRAINT [DF_OutboxMessage_Attempts] DEFAULT (0),
    [NextAttemptAtUtc] datetime2(3) NULL,
    [LastError] nvarchar(1000) NULL,
    [DeliveredAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_OutboxMessage_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [DedupKey] nvarchar(160) NOT NULL,
    CONSTRAINT [PK_OutboxMessage] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_OutboxMessage_EventPublicId_DedupKey] UNIQUE ([EventPublicId], [DedupKey]),
    CONSTRAINT [CK_OutboxMessage_Channel] CHECK (Channel IN ('Internal','Email')),
    CONSTRAINT [CK_OutboxMessage_Status] CHECK (Status IN ('Pending','Delivered','DeadLetter')),
    CONSTRAINT [CK_OutboxMessage_PayloadJson_IsJson] CHECK (ISJSON([PayloadJson]) = 1)
);
GO
-- (58/58) files.SecureFile — Every uploaded private file (verification proofs, excuses, incident files, submissions, post images).
CREATE TABLE [files].[SecureFile] (
    [Id] bigint IDENTITY(1,1) NOT NULL,
    [PublicId] uniqueidentifier NOT NULL CONSTRAINT [DF_SecureFile_PublicId] DEFAULT (NEWSEQUENTIALID()),
    [OwnerPersonId] bigint NULL,
    [Purpose] nvarchar(32) NOT NULL,
    [ObjectKey] nvarchar(300) NOT NULL,
    [MimeType] nvarchar(120) NOT NULL,
    [Bytes] bigint NOT NULL,
    [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_SecureFile_Status] DEFAULT ('Pending'),
    [DeletedAtUtc] datetime2(3) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_SecureFile_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_SecureFile] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_SecureFile_PublicId] UNIQUE ([PublicId]),
    CONSTRAINT [UQ_SecureFile_ObjectKey] UNIQUE ([ObjectKey]),
    CONSTRAINT [CK_SecureFile_Purpose] CHECK (Purpose IN ('VerificationEvidence','ExcuseAttachment','SubmissionAttachment','FormAnswer','IncidentAttachment','PostImage')),
    CONSTRAINT [CK_SecureFile_Status] CHECK (Status IN ('Pending','Available','Quarantined','Deleted'))
);
GO

-- 2.3 Foreign keys (single-column; all added after every table exists)
ALTER TABLE [iam].[OtpChallenge] ADD CONSTRAINT [FK_OtpChallenge_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [iam].[ConsentRecord] ADD CONSTRAINT [FK_ConsentRecord_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [org].[OrganizationMember] ADD CONSTRAINT [FK_OrganizationMember_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [org].[Organization] ([Id]);
ALTER TABLE [org].[OrganizationMember] ADD CONSTRAINT [FK_OrganizationMember_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [org].[OrganizationMember] ADD CONSTRAINT [FK_OrganizationMember_GrantedByPersonId] FOREIGN KEY ([GrantedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [org].[VerificationCase] ADD CONSTRAINT [FK_VerificationCase_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [org].[Organization] ([Id]);
ALTER TABLE [org].[VerificationCase] ADD CONSTRAINT [FK_VerificationCase_ApplicantPersonId] FOREIGN KEY ([ApplicantPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [org].[VerificationCase] ADD CONSTRAINT [FK_VerificationCase_DecidedByPersonId] FOREIGN KEY ([DecidedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [org].[VerificationCase] ADD CONSTRAINT [FK_VerificationCase_EvidenceFileId] FOREIGN KEY ([EvidenceFileId]) REFERENCES [files].[SecureFile] ([Id]);
ALTER TABLE [org].[StaffAppointment] ADD CONSTRAINT [FK_StaffAppointment_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]);
ALTER TABLE [org].[StaffAppointment] ADD CONSTRAINT [FK_StaffAppointment_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]);
ALTER TABLE [org].[StaffAppointment] ADD CONSTRAINT [FK_StaffAppointment_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [org].[StaffAppointment] ADD CONSTRAINT [FK_StaffAppointment_RequestedByPersonId] FOREIGN KEY ([RequestedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [org].[StaffAppointment] ADD CONSTRAINT [FK_StaffAppointment_InvitedByPersonId] FOREIGN KEY ([InvitedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [personal].[IndividualProfile] ADD CONSTRAINT [FK_IndividualProfile_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [personal].[IndividualProfile] ADD CONSTRAINT [FK_IndividualProfile_LastAssessmentAttemptId] FOREIGN KEY ([LastAssessmentAttemptId]) REFERENCES [lab].[AssessmentAttempt] ([Id]);
ALTER TABLE [lab].[AssessmentAttempt] ADD CONSTRAINT [FK_AssessmentAttempt_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [lab].[AssessmentAttempt] ADD CONSTRAINT [FK_AssessmentAttempt_InstrumentVersionId] FOREIGN KEY ([InstrumentVersionId]) REFERENCES [lab].[InstrumentVersion] ([Id]);
ALTER TABLE [recovery].[RecoveryCycle] ADD CONSTRAINT [FK_RecoveryCycle_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [recovery].[PlanRevision] ADD CONSTRAINT [FK_PlanRevision_CycleId] FOREIGN KEY ([CycleId]) REFERENCES [recovery].[RecoveryCycle] ([Id]);
ALTER TABLE [recovery].[ScheduledAction] ADD CONSTRAINT [FK_ScheduledAction_CycleId] FOREIGN KEY ([CycleId]) REFERENCES [recovery].[RecoveryCycle] ([Id]);
ALTER TABLE [recovery].[ScheduledAction] ADD CONSTRAINT [FK_ScheduledAction_PlanRevisionId] FOREIGN KEY ([PlanRevisionId]) REFERENCES [recovery].[PlanRevision] ([Id]);
ALTER TABLE [recovery].[ScheduledAction] ADD CONSTRAINT [FK_ScheduledAction_PracticeVersionId] FOREIGN KEY ([PracticeVersionId]) REFERENCES [activity].[PracticeVersion] ([Id]);
ALTER TABLE [recovery].[ScheduledAction] ADD CONSTRAINT [FK_ScheduledAction_RoutineId] FOREIGN KEY ([RoutineId]) REFERENCES [activity].[OfflineRoutine] ([Id]);
ALTER TABLE [recovery].[ScheduledAction] ADD CONSTRAINT [FK_ScheduledAction_CompletedAttemptId] FOREIGN KEY ([CompletedAttemptId]) REFERENCES [activity].[PracticeAttempt] ([Id]);
ALTER TABLE [recovery].[ScheduledAction] ADD CONSTRAINT [FK_ScheduledAction_RescheduledToActionId] FOREIGN KEY ([RescheduledToActionId]) REFERENCES [recovery].[ScheduledAction] ([Id]);
ALTER TABLE [recovery].[ScheduledAction] ADD CONSTRAINT [FK_ScheduledAction_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [recovery].[WeeklyReview] ADD CONSTRAINT [FK_WeeklyReview_CycleId] FOREIGN KEY ([CycleId]) REFERENCES [recovery].[RecoveryCycle] ([Id]);
ALTER TABLE [recovery].[WeeklyReview] ADD CONSTRAINT [FK_WeeklyReview_ResultingRevisionId] FOREIGN KEY ([ResultingRevisionId]) REFERENCES [recovery].[PlanRevision] ([Id]);
ALTER TABLE [activity].[PracticeVersion] ADD CONSTRAINT [FK_PracticeVersion_DefinitionId] FOREIGN KEY ([DefinitionId]) REFERENCES [activity].[PracticeDefinition] ([Id]);
ALTER TABLE [activity].[PracticeAttempt] ADD CONSTRAINT [FK_PracticeAttempt_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [activity].[PracticeAttempt] ADD CONSTRAINT [FK_PracticeAttempt_PracticeVersionId] FOREIGN KEY ([PracticeVersionId]) REFERENCES [activity].[PracticeVersion] ([Id]);
ALTER TABLE [activity].[PracticeAttempt] ADD CONSTRAINT [FK_PracticeAttempt_ScheduledActionId] FOREIGN KEY ([ScheduledActionId]) REFERENCES [recovery].[ScheduledAction] ([Id]);
ALTER TABLE [activity].[OfflineRoutine] ADD CONSTRAINT [FK_OfflineRoutine_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [activity].[RoutineCheckIn] ADD CONSTRAINT [FK_RoutineCheckIn_RoutineId] FOREIGN KEY ([RoutineId]) REFERENCES [activity].[OfflineRoutine] ([Id]);
ALTER TABLE [activity].[RoutineCheckIn] ADD CONSTRAINT [FK_RoutineCheckIn_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [shield].[ExtensionInstallation] ADD CONSTRAINT [FK_ExtensionInstallation_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [shield].[ProtectionSession] ADD CONSTRAINT [FK_ProtectionSession_InstallationId] FOREIGN KEY ([InstallationId]) REFERENCES [shield].[ExtensionInstallation] ([Id]);
ALTER TABLE [shield].[ProtectionSession] ADD CONSTRAINT [FK_ProtectionSession_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [shield].[BrowserUsagePeriod] ADD CONSTRAINT [FK_BrowserUsagePeriod_InstallationId] FOREIGN KEY ([InstallationId]) REFERENCES [shield].[ExtensionInstallation] ([Id]);
ALTER TABLE [shield].[BrowserUsagePeriod] ADD CONSTRAINT [FK_BrowserUsagePeriod_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [institution].[Initiative] ADD CONSTRAINT [FK_Initiative_InstitutionId] FOREIGN KEY ([InstitutionId]) REFERENCES [org].[Organization] ([Id]);
ALTER TABLE [institution].[Initiative] ADD CONSTRAINT [FK_Initiative_CurrentRevisionId] FOREIGN KEY ([CurrentRevisionId]) REFERENCES [institution].[InitiativeRevision] ([Id]);
ALTER TABLE [institution].[InitiativeRevision] ADD CONSTRAINT [FK_InitiativeRevision_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]);
ALTER TABLE [institution].[InitiativeRevision] ADD CONSTRAINT [FK_InitiativeRevision_RegistrationFormVersionId] FOREIGN KEY ([RegistrationFormVersionId]) REFERENCES [forms].[FormVersion] ([Id]);
ALTER TABLE [institution].[InitiativeRevision] ADD CONSTRAINT [FK_InitiativeRevision_PublishedByPersonId] FOREIGN KEY ([PublishedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [institution].[InitiativeApplication] ADD CONSTRAINT [FK_InitiativeApplication_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]);
ALTER TABLE [institution].[InitiativeApplication] ADD CONSTRAINT [FK_InitiativeApplication_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [institution].[InitiativeApplication] ADD CONSTRAINT [FK_InitiativeApplication_TermsRevisionId] FOREIGN KEY ([TermsRevisionId]) REFERENCES [institution].[InitiativeRevision] ([Id]);
ALTER TABLE [institution].[InitiativeApplication] ADD CONSTRAINT [FK_InitiativeApplication_RegistrationResponseId] FOREIGN KEY ([RegistrationResponseId]) REFERENCES [forms].[FormResponse] ([Id]);
ALTER TABLE [coach].[CoachProgram] ADD CONSTRAINT [FK_CoachProgram_OwnerPersonId] FOREIGN KEY ([OwnerPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [coach].[OperationalGroup] ADD CONSTRAINT [FK_OperationalGroup_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]);
ALTER TABLE [coach].[OperationalGroup] ADD CONSTRAINT [FK_OperationalGroup_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [coach].[CoachProgram] ([Id]);
ALTER TABLE [coach].[OperationalGroup] ADD CONSTRAINT [FK_OperationalGroup_CoachPersonId] FOREIGN KEY ([CoachPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [coach].[OperationalGroup] ADD CONSTRAINT [FK_OperationalGroup_CoachStaffAppointmentId] FOREIGN KEY ([CoachStaffAppointmentId]) REFERENCES [org].[StaffAppointment] ([Id]);
ALTER TABLE [coach].[GroupMembership] ADD CONSTRAINT [FK_GroupMembership_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [coach].[OperationalGroup] ([Id]);
ALTER TABLE [coach].[GroupMembership] ADD CONSTRAINT [FK_GroupMembership_ApplicationId] FOREIGN KEY ([ApplicationId]) REFERENCES [institution].[InitiativeApplication] ([Id]);
ALTER TABLE [coach].[GroupMembership] ADD CONSTRAINT [FK_GroupMembership_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [coach].[GroupMembership] ADD CONSTRAINT [FK_GroupMembership_InvitedByPersonId] FOREIGN KEY ([InvitedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [task].[Assignment] ADD CONSTRAINT [FK_Assignment_PracticeVersionId] FOREIGN KEY ([PracticeVersionId]) REFERENCES [activity].[PracticeVersion] ([Id]);
ALTER TABLE [task].[Assignment] ADD CONSTRAINT [FK_Assignment_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [coach].[OperationalGroup] ([Id]);
ALTER TABLE [task].[Assignment] ADD CONSTRAINT [FK_Assignment_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [task].[AssignmentRecipient] ADD CONSTRAINT [FK_AssignmentRecipient_AssignmentId] FOREIGN KEY ([AssignmentId]) REFERENCES [task].[Assignment] ([Id]);
ALTER TABLE [task].[AssignmentRecipient] ADD CONSTRAINT [FK_AssignmentRecipient_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [task].[SubmissionAttempt] ADD CONSTRAINT [FK_SubmissionAttempt_RecipientId] FOREIGN KEY ([RecipientId]) REFERENCES [task].[AssignmentRecipient] ([Id]);
ALTER TABLE [task].[SubmissionAttempt] ADD CONSTRAINT [FK_SubmissionAttempt_PracticeAttemptId] FOREIGN KEY ([PracticeAttemptId]) REFERENCES [activity].[PracticeAttempt] ([Id]);
ALTER TABLE [task].[SubmissionAttempt] ADD CONSTRAINT [FK_SubmissionAttempt_FileId] FOREIGN KEY ([FileId]) REFERENCES [files].[SecureFile] ([Id]);
ALTER TABLE [task].[ReviewDecision] ADD CONSTRAINT [FK_ReviewDecision_AttemptId] FOREIGN KEY ([AttemptId]) REFERENCES [task].[SubmissionAttempt] ([Id]);
ALTER TABLE [task].[ReviewDecision] ADD CONSTRAINT [FK_ReviewDecision_SupersedesId] FOREIGN KEY ([SupersedesId]) REFERENCES [task].[ReviewDecision] ([Id]);
ALTER TABLE [task].[ReviewDecision] ADD CONSTRAINT [FK_ReviewDecision_ReviewerPersonId] FOREIGN KEY ([ReviewerPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [task].[OperationalReport] ADD CONSTRAINT [FK_OperationalReport_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [coach].[OperationalGroup] ([Id]);
ALTER TABLE [task].[OperationalReport] ADD CONSTRAINT [FK_OperationalReport_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]);
ALTER TABLE [task].[OperationalReport] ADD CONSTRAINT [FK_OperationalReport_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]);
ALTER TABLE [task].[OperationalReport] ADD CONSTRAINT [FK_OperationalReport_IncludedInReportId] FOREIGN KEY ([IncludedInReportId]) REFERENCES [task].[OperationalReport] ([Id]);
ALTER TABLE [task].[OperationalReport] ADD CONSTRAINT [FK_OperationalReport_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [task].[OperationalReport] ADD CONSTRAINT [FK_OperationalReport_ReviewedByPersonId] FOREIGN KEY ([ReviewedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[Session] ADD CONSTRAINT [FK_Session_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]);
ALTER TABLE [session].[Session] ADD CONSTRAINT [FK_Session_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]);
ALTER TABLE [session].[Session] ADD CONSTRAINT [FK_Session_MeetingAudiencePersonId] FOREIGN KEY ([MeetingAudiencePersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[SessionDuty] ADD CONSTRAINT [FK_SessionDuty_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [session].[Session] ([Id]);
ALTER TABLE [session].[SessionDuty] ADD CONSTRAINT [FK_SessionDuty_StaffAppointmentId] FOREIGN KEY ([StaffAppointmentId]) REFERENCES [org].[StaffAppointment] ([Id]);
ALTER TABLE [session].[SessionDuty] ADD CONSTRAINT [FK_SessionDuty_AssignedByPersonId] FOREIGN KEY ([AssignedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[SessionRegistration] ADD CONSTRAINT [FK_SessionRegistration_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [session].[Session] ([Id]);
ALTER TABLE [session].[SessionRegistration] ADD CONSTRAINT [FK_SessionRegistration_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[SessionRegistration] ADD CONSTRAINT [FK_SessionRegistration_RegistrationResponseId] FOREIGN KEY ([RegistrationResponseId]) REFERENCES [forms].[FormResponse] ([Id]);
ALTER TABLE [session].[Attendance] ADD CONSTRAINT [FK_Attendance_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [session].[Session] ([Id]);
ALTER TABLE [session].[Attendance] ADD CONSTRAINT [FK_Attendance_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[Attendance] ADD CONSTRAINT [FK_Attendance_RegistrationId] FOREIGN KEY ([RegistrationId]) REFERENCES [session].[SessionRegistration] ([Id]);
ALTER TABLE [session].[Attendance] ADD CONSTRAINT [FK_Attendance_BookingId] FOREIGN KEY ([BookingId]) REFERENCES [provider].[ExperienceBooking] ([Id]);
ALTER TABLE [session].[Attendance] ADD CONSTRAINT [FK_Attendance_RecordedByPersonId] FOREIGN KEY ([RecordedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[AbsenceExcuse] ADD CONSTRAINT [FK_AbsenceExcuse_AttendanceId] FOREIGN KEY ([AttendanceId]) REFERENCES [session].[Attendance] ([Id]);
ALTER TABLE [session].[AbsenceExcuse] ADD CONSTRAINT [FK_AbsenceExcuse_FileId] FOREIGN KEY ([FileId]) REFERENCES [files].[SecureFile] ([Id]);
ALTER TABLE [session].[AbsenceExcuse] ADD CONSTRAINT [FK_AbsenceExcuse_RecommendedByPersonId] FOREIGN KEY ([RecommendedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[AbsenceExcuse] ADD CONSTRAINT [FK_AbsenceExcuse_DecidedByPersonId] FOREIGN KEY ([DecidedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[AbsenceExcuse] ADD CONSTRAINT [FK_AbsenceExcuse_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[Completion] ADD CONSTRAINT [FK_Completion_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [session].[Completion] ADD CONSTRAINT [FK_Completion_ApplicationId] FOREIGN KEY ([ApplicationId]) REFERENCES [institution].[InitiativeApplication] ([Id]);
ALTER TABLE [session].[Completion] ADD CONSTRAINT [FK_Completion_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [coach].[CoachProgram] ([Id]);
ALTER TABLE [session].[Completion] ADD CONSTRAINT [FK_Completion_BookingId] FOREIGN KEY ([BookingId]) REFERENCES [provider].[ExperienceBooking] ([Id]);
ALTER TABLE [session].[Completion] ADD CONSTRAINT [FK_Completion_EvaluatorPersonId] FOREIGN KEY ([EvaluatorPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [provider].[Experience] ADD CONSTRAINT [FK_Experience_ProviderId] FOREIGN KEY ([ProviderId]) REFERENCES [org].[Organization] ([Id]);
ALTER TABLE [provider].[Experience] ADD CONSTRAINT [FK_Experience_CurrentRevisionId] FOREIGN KEY ([CurrentRevisionId]) REFERENCES [provider].[ExperienceRevision] ([Id]);
ALTER TABLE [provider].[ExperienceRevision] ADD CONSTRAINT [FK_ExperienceRevision_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]);
ALTER TABLE [provider].[ExperienceRevision] ADD CONSTRAINT [FK_ExperienceRevision_ParticipantFormVersionId] FOREIGN KEY ([ParticipantFormVersionId]) REFERENCES [forms].[FormVersion] ([Id]);
ALTER TABLE [provider].[ExperienceRevision] ADD CONSTRAINT [FK_ExperienceRevision_PublishedByPersonId] FOREIGN KEY ([PublishedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [provider].[ExperienceBooking] ADD CONSTRAINT [FK_ExperienceBooking_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]);
ALTER TABLE [provider].[ExperienceBooking] ADD CONSTRAINT [FK_ExperienceBooking_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [provider].[ExperienceBooking] ADD CONSTRAINT [FK_ExperienceBooking_RevisionId] FOREIGN KEY ([RevisionId]) REFERENCES [provider].[ExperienceRevision] ([Id]);
ALTER TABLE [provider].[ExperienceBooking] ADD CONSTRAINT [FK_ExperienceBooking_ParticipantResponseId] FOREIGN KEY ([ParticipantResponseId]) REFERENCES [forms].[FormResponse] ([Id]);
ALTER TABLE [provider].[ExperienceBooking] ADD CONSTRAINT [FK_ExperienceBooking_CohortId] FOREIGN KEY ([CohortId]) REFERENCES [provider].[ProviderCohort] ([Id]);
ALTER TABLE [provider].[ProviderCohort] ADD CONSTRAINT [FK_ProviderCohort_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]);
ALTER TABLE [provider].[ProviderCohort] ADD CONSTRAINT [FK_ProviderCohort_SupervisorAppointmentId] FOREIGN KEY ([SupervisorAppointmentId]) REFERENCES [org].[StaffAppointment] ([Id]);
ALTER TABLE [provider].[ProviderIncident] ADD CONSTRAINT [FK_ProviderIncident_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]);
ALTER TABLE [provider].[ProviderIncident] ADD CONSTRAINT [FK_ProviderIncident_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [session].[Session] ([Id]);
ALTER TABLE [provider].[ProviderIncident] ADD CONSTRAINT [FK_ProviderIncident_BookingId] FOREIGN KEY ([BookingId]) REFERENCES [provider].[ExperienceBooking] ([Id]);
ALTER TABLE [provider].[ProviderIncident] ADD CONSTRAINT [FK_ProviderIncident_ReportedByPersonId] FOREIGN KEY ([ReportedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [provider].[ProviderIncident] ADD CONSTRAINT [FK_ProviderIncident_FileId] FOREIGN KEY ([FileId]) REFERENCES [files].[SecureFile] ([Id]);
ALTER TABLE [forms].[Form] ADD CONSTRAINT [FK_Form_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]);
ALTER TABLE [forms].[Form] ADD CONSTRAINT [FK_Form_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]);
ALTER TABLE [forms].[Form] ADD CONSTRAINT [FK_Form_CurrentVersionId] FOREIGN KEY ([CurrentVersionId]) REFERENCES [forms].[FormVersion] ([Id]);
ALTER TABLE [forms].[FormVersion] ADD CONSTRAINT [FK_FormVersion_FormId] FOREIGN KEY ([FormId]) REFERENCES [forms].[Form] ([Id]);
ALTER TABLE [forms].[FormVersion] ADD CONSTRAINT [FK_FormVersion_PublishedByPersonId] FOREIGN KEY ([PublishedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [forms].[FormResponse] ADD CONSTRAINT [FK_FormResponse_FormVersionId] FOREIGN KEY ([FormVersionId]) REFERENCES [forms].[FormVersion] ([Id]);
ALTER TABLE [forms].[FormResponse] ADD CONSTRAINT [FK_FormResponse_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [forms].[CompetitionJudgment] ADD CONSTRAINT [FK_CompetitionJudgment_ResponseId] FOREIGN KEY ([ResponseId]) REFERENCES [forms].[FormResponse] ([Id]);
ALTER TABLE [forms].[CompetitionJudgment] ADD CONSTRAINT [FK_CompetitionJudgment_JudgePersonId] FOREIGN KEY ([JudgePersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [community].[Post] ADD CONSTRAINT [FK_Post_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [community].[Post] ADD CONSTRAINT [FK_Post_ImageFileId] FOREIGN KEY ([ImageFileId]) REFERENCES [files].[SecureFile] ([Id]);
ALTER TABLE [community].[Comment] ADD CONSTRAINT [FK_Comment_PostId] FOREIGN KEY ([PostId]) REFERENCES [community].[Post] ([Id]);
ALTER TABLE [community].[Comment] ADD CONSTRAINT [FK_Comment_AuthorPersonId] FOREIGN KEY ([AuthorPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [community].[PostInteraction] ADD CONSTRAINT [FK_PostInteraction_PostId] FOREIGN KEY ([PostId]) REFERENCES [community].[Post] ([Id]);
ALTER TABLE [community].[PostInteraction] ADD CONSTRAINT [FK_PostInteraction_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [community].[ContentReport] ADD CONSTRAINT [FK_ContentReport_ResolvedByPersonId] FOREIGN KEY ([ResolvedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [community].[ContentReport] ADD CONSTRAINT [FK_ContentReport_PostId] FOREIGN KEY ([PostId]) REFERENCES [community].[Post] ([Id]);
ALTER TABLE [community].[ContentReport] ADD CONSTRAINT [FK_ContentReport_CommentId] FOREIGN KEY ([CommentId]) REFERENCES [community].[Comment] ([Id]);
ALTER TABLE [community].[ContentReport] ADD CONSTRAINT [FK_ContentReport_ReporterPersonId] FOREIGN KEY ([ReporterPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [partnership].[PartnershipLink] ADD CONSTRAINT [FK_PartnershipLink_InitiativeId] FOREIGN KEY ([InitiativeId]) REFERENCES [institution].[Initiative] ([Id]);
ALTER TABLE [partnership].[PartnershipLink] ADD CONSTRAINT [FK_PartnershipLink_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [coach].[CoachProgram] ([Id]);
ALTER TABLE [partnership].[PartnershipLink] ADD CONSTRAINT [FK_PartnershipLink_ExperienceId] FOREIGN KEY ([ExperienceId]) REFERENCES [provider].[Experience] ([Id]);
ALTER TABLE [partnership].[PartnershipLink] ADD CONSTRAINT [FK_PartnershipLink_RequestedByPersonId] FOREIGN KEY ([RequestedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [partnership].[PartnershipLink] ADD CONSTRAINT [FK_PartnershipLink_RespondedByPersonId] FOREIGN KEY ([RespondedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [partnership].[PartnershipLink] ADD CONSTRAINT [FK_PartnershipLink_EndedByPersonId] FOREIGN KEY ([EndedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [governance].[ContentRelease] ADD CONSTRAINT [FK_ContentRelease_PublishedByPersonId] FOREIGN KEY ([PublishedByPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [ops].[AuditEvent] ADD CONSTRAINT [FK_AuditEvent_ActorPersonId] FOREIGN KEY ([ActorPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [ops].[Notification] ADD CONSTRAINT [FK_Notification_RecipientPersonId] FOREIGN KEY ([RecipientPersonId]) REFERENCES [iam].[Person] ([Id]);
ALTER TABLE [ops].[Notification] ADD CONSTRAINT [FK_Notification_EmailOutboxMessageId] FOREIGN KEY ([EmailOutboxMessageId]) REFERENCES [ops].[OutboxMessage] ([Id]);
ALTER TABLE [files].[SecureFile] ADD CONSTRAINT [FK_SecureFile_OwnerPersonId] FOREIGN KEY ([OwnerPersonId]) REFERENCES [iam].[Person] ([Id]);
GO

-- 2.4 Filtered unique indexes ("one live X") and query indexes
CREATE UNIQUE NONCLUSTERED INDEX [UX_Person_NormalizedEmail_1] ON [iam].[Person] ([NormalizedEmail]) WHERE NormalizedEmail IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_OtpChallenge_NormalizedEmail_Purpose] ON [iam].[OtpChallenge] ([NormalizedEmail], [Purpose]) WHERE Status = 'Issued';
CREATE NONCLUSTERED INDEX [IX_OtpChallenge_PersonId] ON [iam].[OtpChallenge] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_ConsentRecord_PersonId_PurposeCode_DecidedAtUtc] ON [iam].[ConsentRecord] ([PersonId], [PurposeCode], [DecidedAtUtc]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_OrganizationMember_OrganizationId_PersonId_1] ON [org].[OrganizationMember] ([OrganizationId], [PersonId]) WHERE Status = 'Active';
CREATE NONCLUSTERED INDEX [IX_OrganizationMember_PersonId] ON [org].[OrganizationMember] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_OrganizationMember_GrantedByPersonId] ON [org].[OrganizationMember] ([GrantedByPersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_VerificationCase_OrganizationId_1] ON [org].[VerificationCase] ([OrganizationId]) WHERE OrganizationId IS NOT NULL AND Status IN ('Submitted','MoreInfo');
CREATE UNIQUE NONCLUSTERED INDEX [UX_VerificationCase_ApplicantPersonId_2] ON [org].[VerificationCase] ([ApplicantPersonId]) WHERE Kind = 'Coach' AND Status IN ('Submitted','MoreInfo','Approved','Suspended');
CREATE NONCLUSTERED INDEX [IX_VerificationCase_DecidedByPersonId] ON [org].[VerificationCase] ([DecidedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_VerificationCase_EvidenceFileId] ON [org].[VerificationCase] ([EvidenceFileId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_StaffAppointment_InitiativeId_NormalizedEmail_Role_1] ON [org].[StaffAppointment] ([InitiativeId], [NormalizedEmail], [Role]) WHERE InitiativeId IS NOT NULL AND Status = 'Pending';
CREATE UNIQUE NONCLUSTERED INDEX [UX_StaffAppointment_ExperienceId_NormalizedEmail_2] ON [org].[StaffAppointment] ([ExperienceId], [NormalizedEmail]) WHERE ExperienceId IS NOT NULL AND Status = 'Pending';
CREATE UNIQUE NONCLUSTERED INDEX [UX_StaffAppointment_InitiativeId_PersonId_Role_3] ON [org].[StaffAppointment] ([InitiativeId], [PersonId], [Role]) WHERE InitiativeId IS NOT NULL AND Status = 'Active';
CREATE UNIQUE NONCLUSTERED INDEX [UX_StaffAppointment_ExperienceId_PersonId_4] ON [org].[StaffAppointment] ([ExperienceId], [PersonId]) WHERE ExperienceId IS NOT NULL AND Status = 'Active';
CREATE UNIQUE NONCLUSTERED INDEX [UX_StaffAppointment_TokenHash_5] ON [org].[StaffAppointment] ([TokenHash]) WHERE TokenHash IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_StaffAppointment_InitiativeId_Role] ON [org].[StaffAppointment] ([InitiativeId], [Role]) WHERE Status = 'Active';
CREATE NONCLUSTERED INDEX [IX_StaffAppointment_PersonId] ON [org].[StaffAppointment] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_StaffAppointment_RequestedByPersonId] ON [org].[StaffAppointment] ([RequestedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_StaffAppointment_InvitedByPersonId] ON [org].[StaffAppointment] ([InvitedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_IndividualProfile_LastAssessmentAttemptId] ON [personal].[IndividualProfile] ([LastAssessmentAttemptId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_AssessmentAttempt_PersonId_InstrumentCode_1] ON [lab].[AssessmentAttempt] ([PersonId], [InstrumentCode]) WHERE Kind = 'Baseline' AND Status = 'Valid';
CREATE UNIQUE NONCLUSTERED INDEX [UX_AssessmentAttempt_PersonId_InstrumentCode_WindowKey_2] ON [lab].[AssessmentAttempt] ([PersonId], [InstrumentCode], [WindowKey]) WHERE Kind = 'Official' AND Status = 'Valid';
CREATE NONCLUSTERED INDEX [IX_AssessmentAttempt_InstrumentVersionId] ON [lab].[AssessmentAttempt] ([InstrumentVersionId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_RecoveryCycle_PersonId_1] ON [recovery].[RecoveryCycle] ([PersonId]) WHERE Status IN ('Draft','Preview','Active','ReviewDue','Paused');
CREATE UNIQUE NONCLUSTERED INDEX [UX_PlanRevision_CycleId_1] ON [recovery].[PlanRevision] ([CycleId]) WHERE Status = 'Accepted';
CREATE UNIQUE NONCLUSTERED INDEX [UX_PlanRevision_CycleId_2] ON [recovery].[PlanRevision] ([CycleId]) WHERE Status = 'Draft';
CREATE UNIQUE NONCLUSTERED INDEX [UX_ScheduledAction_CompletedAttemptId_1] ON [recovery].[ScheduledAction] ([CompletedAttemptId]) WHERE CompletedAttemptId IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_ScheduledAction_PersonId_LocalDate] ON [recovery].[ScheduledAction] ([PersonId], [LocalDate]);
CREATE NONCLUSTERED INDEX [IX_ScheduledAction_CycleId] ON [recovery].[ScheduledAction] ([CycleId]);
CREATE NONCLUSTERED INDEX [IX_ScheduledAction_PlanRevisionId] ON [recovery].[ScheduledAction] ([PlanRevisionId]);
CREATE NONCLUSTERED INDEX [IX_ScheduledAction_PracticeVersionId] ON [recovery].[ScheduledAction] ([PracticeVersionId]);
CREATE NONCLUSTERED INDEX [IX_ScheduledAction_RoutineId] ON [recovery].[ScheduledAction] ([RoutineId]);
CREATE NONCLUSTERED INDEX [IX_ScheduledAction_RescheduledToActionId] ON [recovery].[ScheduledAction] ([RescheduledToActionId]);
CREATE NONCLUSTERED INDEX [IX_WeeklyReview_ResultingRevisionId] ON [recovery].[WeeklyReview] ([ResultingRevisionId]);
CREATE NONCLUSTERED INDEX [IX_PracticeAttempt_PersonId_StartedAtUtc] ON [activity].[PracticeAttempt] ([PersonId], [StartedAtUtc]);
CREATE NONCLUSTERED INDEX [IX_PracticeAttempt_PracticeVersionId] ON [activity].[PracticeAttempt] ([PracticeVersionId]);
CREATE NONCLUSTERED INDEX [IX_PracticeAttempt_ScheduledActionId] ON [activity].[PracticeAttempt] ([ScheduledActionId]);
CREATE NONCLUSTERED INDEX [IX_OfflineRoutine_PersonId] ON [activity].[OfflineRoutine] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_RoutineCheckIn_PersonId] ON [activity].[RoutineCheckIn] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_ExtensionInstallation_PersonId] ON [shield].[ExtensionInstallation] ([PersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_ProtectionSession_InstallationId_1] ON [shield].[ProtectionSession] ([InstallationId]) WHERE Status IN ('Requested','Active');
CREATE NONCLUSTERED INDEX [IX_ProtectionSession_PersonId] ON [shield].[ProtectionSession] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_BrowserUsagePeriod_PersonId_LocalDate] ON [shield].[BrowserUsagePeriod] ([PersonId], [LocalDate]);
CREATE NONCLUSTERED INDEX [IX_Initiative_InstitutionId] ON [institution].[Initiative] ([InstitutionId]);
CREATE NONCLUSTERED INDEX [IX_Initiative_CurrentRevisionId] ON [institution].[Initiative] ([CurrentRevisionId]);
CREATE NONCLUSTERED INDEX [IX_InitiativeRevision_RegistrationFormVersionId] ON [institution].[InitiativeRevision] ([RegistrationFormVersionId]);
CREATE NONCLUSTERED INDEX [IX_InitiativeRevision_PublishedByPersonId] ON [institution].[InitiativeRevision] ([PublishedByPersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_InitiativeApplication_InitiativeId_PersonId_1] ON [institution].[InitiativeApplication] ([InitiativeId], [PersonId]) WHERE Status IN ('Pending','Queued','Offered','Accepted','Suspended','Blocked');
CREATE UNIQUE NONCLUSTERED INDEX [UX_InitiativeApplication_PersonId_2] ON [institution].[InitiativeApplication] ([PersonId]) WHERE Status IN ('Accepted','Suspended');
CREATE NONCLUSTERED INDEX [IX_InitiativeApplication_InitiativeId] ON [institution].[InitiativeApplication] ([InitiativeId]) WHERE Status IN ('Offered','Accepted','Suspended');
CREATE NONCLUSTERED INDEX [IX_InitiativeApplication_InitiativeId_QueuedAtUtc] ON [institution].[InitiativeApplication] ([InitiativeId], [QueuedAtUtc]) WHERE Status = 'Queued';
CREATE NONCLUSTERED INDEX [IX_InitiativeApplication_TermsRevisionId] ON [institution].[InitiativeApplication] ([TermsRevisionId]);
CREATE NONCLUSTERED INDEX [IX_InitiativeApplication_RegistrationResponseId] ON [institution].[InitiativeApplication] ([RegistrationResponseId]);
CREATE NONCLUSTERED INDEX [IX_CoachProgram_OwnerPersonId] ON [coach].[CoachProgram] ([OwnerPersonId]);
CREATE NONCLUSTERED INDEX [IX_OperationalGroup_InitiativeId] ON [coach].[OperationalGroup] ([InitiativeId]);
CREATE NONCLUSTERED INDEX [IX_OperationalGroup_ProgramId] ON [coach].[OperationalGroup] ([ProgramId]);
CREATE NONCLUSTERED INDEX [IX_OperationalGroup_CoachPersonId] ON [coach].[OperationalGroup] ([CoachPersonId]);
CREATE NONCLUSTERED INDEX [IX_OperationalGroup_CoachStaffAppointmentId] ON [coach].[OperationalGroup] ([CoachStaffAppointmentId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_GroupMembership_GroupId_PersonId_1] ON [coach].[GroupMembership] ([GroupId], [PersonId]) WHERE Status IN ('Pending','Active');
CREATE UNIQUE NONCLUSTERED INDEX [UX_GroupMembership_ApplicationId_2] ON [coach].[GroupMembership] ([ApplicationId]) WHERE ApplicationId IS NOT NULL AND Status = 'Active';
CREATE UNIQUE NONCLUSTERED INDEX [UX_GroupMembership_GroupId_NormalizedEmail_3] ON [coach].[GroupMembership] ([GroupId], [NormalizedEmail]) WHERE Status = 'Invited';
CREATE UNIQUE NONCLUSTERED INDEX [UX_GroupMembership_TokenHash_4] ON [coach].[GroupMembership] ([TokenHash]) WHERE TokenHash IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_GroupMembership_PersonId] ON [coach].[GroupMembership] ([PersonId]) WHERE Status = 'Active';
CREATE NONCLUSTERED INDEX [IX_GroupMembership_InvitedByPersonId] ON [coach].[GroupMembership] ([InvitedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_Assignment_PracticeVersionId] ON [task].[Assignment] ([PracticeVersionId]);
CREATE NONCLUSTERED INDEX [IX_Assignment_GroupId] ON [task].[Assignment] ([GroupId]);
CREATE NONCLUSTERED INDEX [IX_Assignment_AuthorPersonId] ON [task].[Assignment] ([AuthorPersonId]);
CREATE NONCLUSTERED INDEX [IX_AssignmentRecipient_PersonId_Status] ON [task].[AssignmentRecipient] ([PersonId], [Status]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_SubmissionAttempt_PracticeAttemptId_1] ON [task].[SubmissionAttempt] ([PracticeAttemptId]) WHERE PracticeAttemptId IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_SubmissionAttempt_FileId] ON [task].[SubmissionAttempt] ([FileId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_ReviewDecision_SupersedesId_1] ON [task].[ReviewDecision] ([SupersedesId]) WHERE SupersedesId IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX [UX_ReviewDecision_AttemptId_2] ON [task].[ReviewDecision] ([AttemptId]) WHERE SupersedesId IS NULL;
CREATE NONCLUSTERED INDEX [IX_ReviewDecision_ReviewerPersonId] ON [task].[ReviewDecision] ([ReviewerPersonId]);
CREATE NONCLUSTERED INDEX [IX_OperationalReport_InitiativeId_Kind_PeriodEndDate] ON [task].[OperationalReport] ([InitiativeId], [Kind], [PeriodEndDate]);
CREATE NONCLUSTERED INDEX [IX_OperationalReport_ExperienceId_PeriodEndDate] ON [task].[OperationalReport] ([ExperienceId], [PeriodEndDate]) WHERE ExperienceId IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_OperationalReport_GroupId] ON [task].[OperationalReport] ([GroupId]);
CREATE NONCLUSTERED INDEX [IX_OperationalReport_IncludedInReportId] ON [task].[OperationalReport] ([IncludedInReportId]);
CREATE NONCLUSTERED INDEX [IX_OperationalReport_AuthorPersonId] ON [task].[OperationalReport] ([AuthorPersonId]);
CREATE NONCLUSTERED INDEX [IX_OperationalReport_ReviewedByPersonId] ON [task].[OperationalReport] ([ReviewedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_Session_InitiativeId_StartsAtUtc] ON [session].[Session] ([InitiativeId], [StartsAtUtc]) WHERE InitiativeId IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_Session_ExperienceId_StartsAtUtc] ON [session].[Session] ([ExperienceId], [StartsAtUtc]) WHERE ExperienceId IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_Session_MeetingAudiencePersonId] ON [session].[Session] ([MeetingAudiencePersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_SessionDuty_SessionId_StaffAppointmentId_1] ON [session].[SessionDuty] ([SessionId], [StaffAppointmentId]) WHERE Status = 'Active';
CREATE NONCLUSTERED INDEX [IX_SessionDuty_StaffAppointmentId] ON [session].[SessionDuty] ([StaffAppointmentId]);
CREATE NONCLUSTERED INDEX [IX_SessionDuty_AssignedByPersonId] ON [session].[SessionDuty] ([AssignedByPersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_SessionRegistration_SessionId_PersonId_1] ON [session].[SessionRegistration] ([SessionId], [PersonId]) WHERE Status IN ('Pending','Confirmed');
CREATE UNIQUE NONCLUSTERED INDEX [UX_SessionRegistration_CredentialHash_2] ON [session].[SessionRegistration] ([CredentialHash]) WHERE CredentialHash IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_SessionRegistration_SessionId_Mode] ON [session].[SessionRegistration] ([SessionId], [Mode]) WHERE Status IN ('Pending','Confirmed');
CREATE NONCLUSTERED INDEX [IX_SessionRegistration_PersonId] ON [session].[SessionRegistration] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_SessionRegistration_RegistrationResponseId] ON [session].[SessionRegistration] ([RegistrationResponseId]);
CREATE NONCLUSTERED INDEX [IX_Attendance_PersonId] ON [session].[Attendance] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_Attendance_RegistrationId] ON [session].[Attendance] ([RegistrationId]);
CREATE NONCLUSTERED INDEX [IX_Attendance_BookingId] ON [session].[Attendance] ([BookingId]);
CREATE NONCLUSTERED INDEX [IX_Attendance_RecordedByPersonId] ON [session].[Attendance] ([RecordedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_AbsenceExcuse_FileId] ON [session].[AbsenceExcuse] ([FileId]);
CREATE NONCLUSTERED INDEX [IX_AbsenceExcuse_RecommendedByPersonId] ON [session].[AbsenceExcuse] ([RecommendedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_AbsenceExcuse_DecidedByPersonId] ON [session].[AbsenceExcuse] ([DecidedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_AbsenceExcuse_PersonId] ON [session].[AbsenceExcuse] ([PersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_Completion_ApplicationId_1] ON [session].[Completion] ([ApplicationId]) WHERE ApplicationId IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX [UX_Completion_ProgramId_PersonId_2] ON [session].[Completion] ([ProgramId], [PersonId]) WHERE ProgramId IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX [UX_Completion_BookingId_3] ON [session].[Completion] ([BookingId]) WHERE BookingId IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_Completion_PersonId_Kind] ON [session].[Completion] ([PersonId], [Kind]);
CREATE NONCLUSTERED INDEX [IX_Completion_EvaluatorPersonId] ON [session].[Completion] ([EvaluatorPersonId]);
CREATE NONCLUSTERED INDEX [IX_Experience_ProviderId] ON [provider].[Experience] ([ProviderId]);
CREATE NONCLUSTERED INDEX [IX_Experience_CurrentRevisionId] ON [provider].[Experience] ([CurrentRevisionId]);
CREATE NONCLUSTERED INDEX [IX_ExperienceRevision_ParticipantFormVersionId] ON [provider].[ExperienceRevision] ([ParticipantFormVersionId]);
CREATE NONCLUSTERED INDEX [IX_ExperienceRevision_PublishedByPersonId] ON [provider].[ExperienceRevision] ([PublishedByPersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_ExperienceBooking_ExperienceId_PersonId_1] ON [provider].[ExperienceBooking] ([ExperienceId], [PersonId]) WHERE Status IN ('Pending','Queued','Offered','Confirmed');
CREATE UNIQUE NONCLUSTERED INDEX [UX_ExperienceBooking_CredentialHash_2] ON [provider].[ExperienceBooking] ([CredentialHash]) WHERE CredentialHash IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_ExperienceBooking_ExperienceId] ON [provider].[ExperienceBooking] ([ExperienceId]) WHERE Status IN ('Offered','Confirmed');
CREATE NONCLUSTERED INDEX [IX_ExperienceBooking_ExperienceId_QueuedAtUtc] ON [provider].[ExperienceBooking] ([ExperienceId], [QueuedAtUtc]) WHERE Status = 'Queued';
CREATE NONCLUSTERED INDEX [IX_ExperienceBooking_PersonId] ON [provider].[ExperienceBooking] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_ExperienceBooking_RevisionId] ON [provider].[ExperienceBooking] ([RevisionId]);
CREATE NONCLUSTERED INDEX [IX_ExperienceBooking_ParticipantResponseId] ON [provider].[ExperienceBooking] ([ParticipantResponseId]);
CREATE NONCLUSTERED INDEX [IX_ExperienceBooking_CohortId] ON [provider].[ExperienceBooking] ([CohortId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_ProviderCohort_JoinTokenHash_1] ON [provider].[ProviderCohort] ([JoinTokenHash]) WHERE JoinTokenHash IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_ProviderCohort_ExperienceId] ON [provider].[ProviderCohort] ([ExperienceId]);
CREATE NONCLUSTERED INDEX [IX_ProviderCohort_SupervisorAppointmentId] ON [provider].[ProviderCohort] ([SupervisorAppointmentId]);
CREATE NONCLUSTERED INDEX [IX_ProviderIncident_ExperienceId] ON [provider].[ProviderIncident] ([ExperienceId]);
CREATE NONCLUSTERED INDEX [IX_ProviderIncident_SessionId] ON [provider].[ProviderIncident] ([SessionId]);
CREATE NONCLUSTERED INDEX [IX_ProviderIncident_BookingId] ON [provider].[ProviderIncident] ([BookingId]);
CREATE NONCLUSTERED INDEX [IX_ProviderIncident_ReportedByPersonId] ON [provider].[ProviderIncident] ([ReportedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_ProviderIncident_FileId] ON [provider].[ProviderIncident] ([FileId]);
CREATE NONCLUSTERED INDEX [IX_Form_InitiativeId] ON [forms].[Form] ([InitiativeId]);
CREATE NONCLUSTERED INDEX [IX_Form_ExperienceId] ON [forms].[Form] ([ExperienceId]);
CREATE NONCLUSTERED INDEX [IX_Form_CurrentVersionId] ON [forms].[Form] ([CurrentVersionId]);
CREATE NONCLUSTERED INDEX [IX_FormVersion_PublishedByPersonId] ON [forms].[FormVersion] ([PublishedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_FormResponse_FormVersionId] ON [forms].[FormResponse] ([FormVersionId]) WHERE Status = 'Submitted';
CREATE NONCLUSTERED INDEX [IX_FormResponse_PersonId] ON [forms].[FormResponse] ([PersonId]);
CREATE NONCLUSTERED INDEX [IX_CompetitionJudgment_JudgePersonId] ON [forms].[CompetitionJudgment] ([JudgePersonId]);
CREATE NONCLUSTERED INDEX [IX_Post_PublishedAtUtc] ON [community].[Post] ([PublishedAtUtc]) WHERE Status = 'Published';
CREATE NONCLUSTERED INDEX [IX_Post_AuthorPersonId] ON [community].[Post] ([AuthorPersonId]);
CREATE NONCLUSTERED INDEX [IX_Post_ImageFileId] ON [community].[Post] ([ImageFileId]);
CREATE NONCLUSTERED INDEX [IX_Comment_PostId_CreatedAtUtc] ON [community].[Comment] ([PostId], [CreatedAtUtc]);
CREATE NONCLUSTERED INDEX [IX_Comment_AuthorPersonId] ON [community].[Comment] ([AuthorPersonId]);
CREATE NONCLUSTERED INDEX [IX_PostInteraction_PersonId] ON [community].[PostInteraction] ([PersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_ContentReport_PostId_ReporterPersonId_1] ON [community].[ContentReport] ([PostId], [ReporterPersonId]) WHERE PostId IS NOT NULL AND Status <> 'Resolved';
CREATE UNIQUE NONCLUSTERED INDEX [UX_ContentReport_CommentId_ReporterPersonId_2] ON [community].[ContentReport] ([CommentId], [ReporterPersonId]) WHERE CommentId IS NOT NULL AND Status <> 'Resolved';
CREATE NONCLUSTERED INDEX [IX_ContentReport_ResolvedByPersonId] ON [community].[ContentReport] ([ResolvedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_ContentReport_ReporterPersonId] ON [community].[ContentReport] ([ReporterPersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_PartnershipLink_InitiativeId_ProgramId_1] ON [partnership].[PartnershipLink] ([InitiativeId], [ProgramId]) WHERE ProgramId IS NOT NULL AND Status IN ('Requested','Accepted');
CREATE UNIQUE NONCLUSTERED INDEX [UX_PartnershipLink_InitiativeId_ExperienceId_2] ON [partnership].[PartnershipLink] ([InitiativeId], [ExperienceId]) WHERE ExperienceId IS NOT NULL AND Status IN ('Requested','Accepted');
CREATE NONCLUSTERED INDEX [IX_PartnershipLink_ProgramId] ON [partnership].[PartnershipLink] ([ProgramId]);
CREATE NONCLUSTERED INDEX [IX_PartnershipLink_ExperienceId] ON [partnership].[PartnershipLink] ([ExperienceId]);
CREATE NONCLUSTERED INDEX [IX_PartnershipLink_RequestedByPersonId] ON [partnership].[PartnershipLink] ([RequestedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_PartnershipLink_RespondedByPersonId] ON [partnership].[PartnershipLink] ([RespondedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_PartnershipLink_EndedByPersonId] ON [partnership].[PartnershipLink] ([EndedByPersonId]);
CREATE UNIQUE NONCLUSTERED INDEX [UX_ContentRelease_TargetCode_1] ON [governance].[ContentRelease] ([TargetCode]) WHERE Status = 'Draft';
CREATE NONCLUSTERED INDEX [IX_ContentRelease_PublishedByPersonId] ON [governance].[ContentRelease] ([PublishedByPersonId]);
CREATE NONCLUSTERED INDEX [IX_AuditEvent_ActorPersonId_AtUtc] ON [ops].[AuditEvent] ([ActorPersonId], [AtUtc]);
CREATE NONCLUSTERED INDEX [IX_AuditEvent_ResourceKind_ResourceId_AtUtc] ON [ops].[AuditEvent] ([ResourceKind], [ResourceId], [AtUtc]);
CREATE NONCLUSTERED INDEX [IX_Notification_RecipientPersonId_CreatedAtUtc] ON [ops].[Notification] ([RecipientPersonId], [CreatedAtUtc]) WHERE Status IN ('Ready','Read');
CREATE NONCLUSTERED INDEX [IX_Notification_EmailOutboxMessageId] ON [ops].[Notification] ([EmailOutboxMessageId]);
CREATE NONCLUSTERED INDEX [IX_OutboxMessage_NextAttemptAtUtc] ON [ops].[OutboxMessage] ([NextAttemptAtUtc]) WHERE Status = 'Pending';
CREATE NONCLUSTERED INDEX [IX_SecureFile_OwnerPersonId] ON [files].[SecureFile] ([OwnerPersonId]);
GO

-- 2.5 Insert-only history. The application role may read and write everything except UPDATE/DELETE on these tables (no triggers).
IF DATABASE_PRINCIPAL_ID(N'ds_app') IS NULL CREATE ROLE [ds_app];
GO
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[iam] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[org] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[personal] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[lab] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[recovery] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[activity] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[shield] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[institution] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[coach] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[task] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[session] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[provider] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[forms] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[community] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[partnership] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[governance] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[ops] TO [ds_app];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[files] TO [ds_app];
DENY UPDATE, DELETE ON [ops].[AuditEvent] TO [ds_app];
DENY UPDATE, DELETE ON [iam].[ConsentRecord] TO [ds_app];
DENY UPDATE, DELETE ON [forms].[FormVersion] TO [ds_app];
DENY UPDATE, DELETE ON [activity].[PracticeVersion] TO [ds_app];
DENY UPDATE, DELETE ON [provider].[ExperienceRevision] TO [ds_app];
DENY UPDATE, DELETE ON [institution].[InitiativeRevision] TO [ds_app];
DENY UPDATE, DELETE ON [shield].[BrowserUsagePeriod] TO [ds_app];
DENY UPDATE, DELETE ON [task].[SubmissionAttempt] TO [ds_app];
IF DATABASE_PRINCIPAL_ID(N'ds_app_demo') IS NULL CREATE USER [ds_app_demo] WITHOUT LOGIN;
IF IS_ROLEMEMBER(N'ds_app', N'ds_app_demo') <> 1 ALTER ROLE [ds_app] ADD MEMBER [ds_app_demo];
GO


