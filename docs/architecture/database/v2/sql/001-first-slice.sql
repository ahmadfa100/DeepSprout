/* DeepSprout v2 M1 — run ONLY in a new disposable SQL Server database.
   18 tables. NOT EXECUTED in the repository environment.
   SQL Server 2019+; assumes dbo owns these schemas. A migration principal runs DDL.
   This is a database proof slice. Eligibility, verified owner onboarding, age/consent
   and the precise five-day interpretation remain release gates. */
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
GO
CREATE SCHEMA iam AUTHORIZATION dbo;
GO
CREATE SCHEMA files AUTHORIZATION dbo;
GO
CREATE SCHEMA institution AUTHORIZATION dbo;
GO
CREATE SCHEMA ops AUTHORIZATION dbo;
GO

CREATE TABLE iam.Person (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Person PRIMARY KEY,
 PublicId uniqueidentifier NOT NULL CONSTRAINT DF_Person_PublicId DEFAULT NEWID(),
 DisplayName nvarchar(160) NOT NULL,
 Status nvarchar(24) NOT NULL CONSTRAINT CK_Person_Status CHECK (Status IN (N'Active',N'Suspended',N'Closed')),
 IndividualEnabled bit NOT NULL CONSTRAINT DF_Person_Individual DEFAULT 0,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Person_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Person_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT UQ_Person_PublicId UNIQUE (PublicId)
);
CREATE TABLE iam.PersonEmail (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_PersonEmail PRIMARY KEY,
 PersonId bigint NOT NULL CONSTRAINT FK_PersonEmail_Person REFERENCES iam.Person(Id),
 NormalizedEmail nvarchar(320) NOT NULL,
 Status nvarchar(24) NOT NULL CONSTRAINT CK_PersonEmail_Status CHECK (Status IN (N'Pending',N'Verified',N'Retired')),
 VerifiedAtUtc datetime2(3) NULL,
 IsPrimary bit NOT NULL CONSTRAINT DF_PersonEmail_Primary DEFAULT 0,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_PersonEmail_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_PersonEmail_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT CK_PersonEmail_Verified CHECK ((Status=N'Verified' AND VerifiedAtUtc IS NOT NULL) OR (Status<>N'Verified'))
);
CREATE UNIQUE INDEX UX_PersonEmail_Verified ON iam.PersonEmail(NormalizedEmail) WHERE Status=N'Verified';
CREATE UNIQUE INDEX UX_PersonEmail_Primary ON iam.PersonEmail(PersonId) WHERE IsPrimary=1 AND Status=N'Verified';
CREATE INDEX IX_PersonEmail_Person ON iam.PersonEmail(PersonId,Status);

CREATE TABLE iam.PasswordCredential (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_PasswordCredential PRIMARY KEY,
 PersonId bigint NOT NULL CONSTRAINT FK_PasswordCredential_Person REFERENCES iam.Person(Id),
 Hash varbinary(512) NOT NULL, Algorithm nvarchar(40) NOT NULL,
 Parameters nvarchar(300) NOT NULL, RotatedAtUtc datetime2(3) NOT NULL,
 Status nvarchar(24) NOT NULL CONSTRAINT CK_PasswordCredential_Status CHECK (Status IN (N'Active',N'Revoked')),
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_PasswordCredential_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_PasswordCredential_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT UQ_PasswordCredential_Person UNIQUE(PersonId)
);
CREATE TABLE iam.OtpChallenge (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_OtpChallenge PRIMARY KEY,
 PersonId bigint NULL CONSTRAINT FK_OtpChallenge_Person REFERENCES iam.Person(Id),
 NormalizedEmail nvarchar(320) NOT NULL, Purpose nvarchar(32) NOT NULL,
 CodeHash varbinary(64) NOT NULL, ExpiresAtUtc datetime2(3) NOT NULL,
 UsedAtUtc datetime2(3) NULL, AttemptCount smallint NOT NULL CONSTRAINT DF_OtpChallenge_Attempts DEFAULT 0,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_OtpChallenge_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_OtpChallenge_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT CK_OtpChallenge_Attempts CHECK (AttemptCount>=0)
);
CREATE INDEX IX_OtpChallenge_Lookup ON iam.OtpChallenge(NormalizedEmail,Purpose,ExpiresAtUtc);
CREATE TABLE iam.GlobalGrant (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_GlobalGrant PRIMARY KEY,
 PersonId bigint NOT NULL CONSTRAINT FK_GlobalGrant_Person REFERENCES iam.Person(Id),
 Capability nvarchar(64) NOT NULL,
 GrantedByPersonId bigint NOT NULL CONSTRAINT FK_GlobalGrant_Grantor REFERENCES iam.Person(Id),
 GrantedAtUtc datetime2(3) NOT NULL, RevokedAtUtc datetime2(3) NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_GlobalGrant_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_GlobalGrant_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL
);
CREATE UNIQUE INDEX UX_GlobalGrant_Active ON iam.GlobalGrant(PersonId,Capability) WHERE RevokedAtUtc IS NULL;
CREATE TABLE iam.ConsentRecord (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_ConsentRecord PRIMARY KEY,
 PersonId bigint NOT NULL CONSTRAINT FK_ConsentRecord_Person REFERENCES iam.Person(Id),
 PurposeCode nvarchar(80) NOT NULL, NoticeVersion nvarchar(64) NOT NULL,
 Decision nvarchar(24) NOT NULL CONSTRAINT CK_ConsentRecord_Decision CHECK (Decision IN (N'Accepted',N'Withdrawn')),
 DecidedAtUtc datetime2(3) NOT NULL, EvidenceRef nvarchar(300) NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_ConsentRecord_Created DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_ConsentRecord_Purpose ON iam.ConsentRecord(PersonId,PurposeCode,DecidedAtUtc DESC);

CREATE TABLE files.SecureFile (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_SecureFile PRIMARY KEY,
 OwnerPersonId bigint NULL CONSTRAINT FK_SecureFile_Person REFERENCES iam.Person(Id),
 Purpose nvarchar(40) NOT NULL, ObjectKey nvarchar(300) NOT NULL,
 MimeType nvarchar(120) NOT NULL, Bytes bigint NOT NULL, Sha256 varbinary(32) NOT NULL,
 Status nvarchar(24) NOT NULL CONSTRAINT CK_SecureFile_Status CHECK (Status IN (N'Pending',N'Available',N'Quarantined',N'Deleted')),
 RetentionUntilUtc datetime2(3) NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_SecureFile_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_SecureFile_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT UQ_SecureFile_ObjectKey UNIQUE(ObjectKey),
 CONSTRAINT CK_SecureFile_Bytes CHECK (Bytes>0)
);

CREATE TABLE institution.Institution (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Institution PRIMARY KEY,
 PublicId uniqueidentifier NOT NULL CONSTRAINT DF_Institution_PublicId DEFAULT NEWID(),
 Name nvarchar(200) NOT NULL, Status nvarchar(24) NOT NULL
  CONSTRAINT CK_Institution_Status CHECK (Status IN (N'Applied',N'Verified',N'Suspended',N'Closed')),
 CountryCode char(2) NOT NULL, HeadquartersCity nvarchar(120) NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Institution_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Institution_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT UQ_Institution_PublicId UNIQUE(PublicId)
);
CREATE TABLE institution.InstitutionVerificationCase (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InstitutionVerificationCase PRIMARY KEY,
 InstitutionId bigint NOT NULL CONSTRAINT FK_InstitutionVerificationCase_Institution REFERENCES institution.Institution(Id),
 ApplicantPersonId bigint NOT NULL CONSTRAINT FK_InstitutionVerificationCase_Applicant REFERENCES iam.Person(Id),
 Status nvarchar(24) NOT NULL CONSTRAINT CK_InstitutionVerificationCase_Status CHECK (Status IN (N'Submitted',N'MoreInfo',N'Approved',N'Rejected')),
 EvidenceFileId bigint NULL CONSTRAINT FK_InstitutionVerificationCase_File REFERENCES files.SecureFile(Id),
 DecidedByPersonId bigint NULL CONSTRAINT FK_InstitutionVerificationCase_Decider REFERENCES iam.Person(Id),
 DecisionReason nvarchar(1000) NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InstitutionVerificationCase_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InstitutionVerificationCase_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL
);
CREATE INDEX IX_InstitutionVerificationCase_Queue ON institution.InstitutionVerificationCase(Status,CreatedAtUtc);
CREATE TABLE institution.RepresentativeMembership (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_RepresentativeMembership PRIMARY KEY,
 InstitutionId bigint NOT NULL CONSTRAINT FK_RepresentativeMembership_Institution REFERENCES institution.Institution(Id),
 PersonId bigint NOT NULL CONSTRAINT FK_RepresentativeMembership_Person REFERENCES iam.Person(Id),
 Status nvarchar(24) NOT NULL CONSTRAINT CK_RepresentativeMembership_Status CHECK (Status IN (N'Active',N'Revoked')),
 GrantedByPersonId bigint NOT NULL CONSTRAINT FK_RepresentativeMembership_Grantor REFERENCES iam.Person(Id),
 RevokedAtUtc datetime2(3) NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_RepresentativeMembership_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_RepresentativeMembership_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT CK_RepresentativeMembership_Revocation CHECK ((Status=N'Active' AND RevokedAtUtc IS NULL) OR (Status=N'Revoked' AND RevokedAtUtc IS NOT NULL))
);
CREATE UNIQUE INDEX UX_RepresentativeMembership_Active ON institution.RepresentativeMembership(InstitutionId,PersonId) WHERE Status=N'Active';
CREATE INDEX IX_RepresentativeMembership_Person ON institution.RepresentativeMembership(PersonId,Status);

CREATE TABLE institution.Initiative (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Initiative PRIMARY KEY,
 PublicId uniqueidentifier NOT NULL CONSTRAINT DF_Initiative_PublicId DEFAULT NEWID(),
 InstitutionId bigint NOT NULL CONSTRAINT FK_Initiative_Institution REFERENCES institution.Institution(Id),
 Title nvarchar(200) NOT NULL, Mode nvarchar(24) NOT NULL,
 Status nvarchar(24) NOT NULL CONSTRAINT CK_Initiative_Status CHECK (Status IN (N'Draft',N'Published',N'Closed',N'Completed',N'Cancelled',N'Archived')),
 Capacity smallint NOT NULL, TimeZoneId nvarchar(80) NOT NULL,
 StartsAtUtc datetime2(3) NULL, EndsAtUtc datetime2(3) NULL,
 WithdrawalCutoffAtUtc datetime2(3) NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Initiative_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Initiative_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT UQ_Initiative_PublicId UNIQUE(PublicId),
 CONSTRAINT UQ_Initiative_IdInstitution UNIQUE(Id,InstitutionId),
 CONSTRAINT CK_Initiative_Capacity CHECK (Capacity BETWEEN 1 AND 135),
 CONSTRAINT CK_Initiative_Time CHECK ((StartsAtUtc IS NULL AND EndsAtUtc IS NULL) OR (StartsAtUtc IS NOT NULL AND EndsAtUtc IS NOT NULL AND EndsAtUtc>StartsAtUtc)),
 CONSTRAINT CK_Initiative_PublishedTime CHECK (Status<>N'Published' OR (StartsAtUtc IS NOT NULL AND WithdrawalCutoffAtUtc IS NOT NULL)),
 CONSTRAINT CK_Initiative_Cutoff CHECK (WithdrawalCutoffAtUtc IS NULL OR (StartsAtUtc IS NOT NULL AND WithdrawalCutoffAtUtc<StartsAtUtc))
);
CREATE INDEX IX_Initiative_InstitutionStatus ON institution.Initiative(InstitutionId,Status);
CREATE TABLE institution.InitiativeRevision (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InitiativeRevision PRIMARY KEY,
 InitiativeId bigint NOT NULL CONSTRAINT FK_InitiativeRevision_Initiative REFERENCES institution.Initiative(Id),
 RevisionNo int NOT NULL, Summary nvarchar(1200) NOT NULL,
 AudienceCode nvarchar(80) NOT NULL, CoverageCode nvarchar(120) NULL,
 CostKind nvarchar(16) NOT NULL CONSTRAINT CK_InitiativeRevision_CostKind CHECK (CostKind IN (N'Free',N'Paid')),
 Price decimal(19,4) NULL, Currency char(3) NULL,
 CompletionPolicyRef nvarchar(120) NOT NULL, PublishedAtUtc datetime2(3) NOT NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeRevision_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_InitiativeRevision_OwnerNo UNIQUE(InitiativeId,RevisionNo),
 CONSTRAINT UQ_InitiativeRevision_IdOwner UNIQUE(Id,InitiativeId),
 CONSTRAINT CK_InitiativeRevision_RevisionNo CHECK (RevisionNo>0),
 CONSTRAINT CK_InitiativeRevision_Cost CHECK ((CostKind=N'Free' AND Price IS NULL AND Currency IS NULL) OR (CostKind=N'Paid' AND Price IS NOT NULL AND Price>0 AND Currency IS NOT NULL))
);
CREATE TABLE institution.InitiativeApplication (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InitiativeApplication PRIMARY KEY,
 PublicId uniqueidentifier NOT NULL CONSTRAINT DF_InitiativeApplication_PublicId DEFAULT NEWID(),
 InitiativeId bigint NOT NULL CONSTRAINT FK_InitiativeApplication_Initiative REFERENCES institution.Initiative(Id),
 PersonId bigint NOT NULL CONSTRAINT FK_InitiativeApplication_Person REFERENCES iam.Person(Id),
 AttemptNo int NOT NULL, TermsRevisionId bigint NOT NULL,
 Status nvarchar(24) NOT NULL CONSTRAINT CK_InitiativeApplication_Status CHECK (Status IN (N'Pending',N'Queued',N'Offered',N'Accepted',N'Rejected',N'Withdrawn',N'Blocked')),
 SubmittedAtUtc datetime2(3) NOT NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeApplication_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeApplication_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT UQ_InitiativeApplication_PublicId UNIQUE(PublicId),
 CONSTRAINT UQ_InitiativeApplication_Attempt UNIQUE(InitiativeId,PersonId,AttemptNo),
 CONSTRAINT UQ_InitiativeApplication_IdOwner UNIQUE(Id,InitiativeId),
 CONSTRAINT UQ_InitiativeApplication_IdOwnerPerson UNIQUE(Id,InitiativeId,PersonId),
 CONSTRAINT CK_InitiativeApplication_Attempt CHECK (AttemptNo>0),
 CONSTRAINT FK_InitiativeApplication_Terms FOREIGN KEY(TermsRevisionId,InitiativeId)
  REFERENCES institution.InitiativeRevision(Id,InitiativeId)
);
CREATE UNIQUE INDEX UX_InitiativeApplication_Open ON institution.InitiativeApplication(InitiativeId,PersonId)
 WHERE Status IN (N'Pending',N'Queued',N'Offered');
CREATE INDEX IX_InitiativeApplication_Queue ON institution.InitiativeApplication(InitiativeId,Status,SubmittedAtUtc);

CREATE TABLE institution.InitiativeApplicationDecision (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InitiativeApplicationDecision PRIMARY KEY,
 ApplicationId bigint NOT NULL, InitiativeId bigint NOT NULL,
 DecisionNo int NOT NULL, Action nvarchar(24) NOT NULL
  CONSTRAINT CK_InitiativeApplicationDecision_Action CHECK (Action IN (N'Approved',N'Rejected',N'Withdrawn',N'Queued',N'Offered',N'Blocked')),
 ActorPersonId bigint NOT NULL CONSTRAINT FK_InitiativeApplicationDecision_Actor REFERENCES iam.Person(Id),
 Reason nvarchar(800) NULL, AtUtc datetime2(3) NOT NULL,
 TermsRevisionId bigint NOT NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeApplicationDecision_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_InitiativeApplicationDecision_No UNIQUE(ApplicationId,DecisionNo),
 CONSTRAINT FK_InitiativeApplicationDecision_Application FOREIGN KEY(ApplicationId,InitiativeId)
  REFERENCES institution.InitiativeApplication(Id,InitiativeId),
 CONSTRAINT FK_InitiativeApplicationDecision_Terms FOREIGN KEY(TermsRevisionId,InitiativeId)
  REFERENCES institution.InitiativeRevision(Id,InitiativeId)
);
CREATE INDEX IX_InitiativeApplicationDecision_History ON institution.InitiativeApplicationDecision(InitiativeId,AtUtc);

CREATE TABLE institution.InitiativeMembership (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InitiativeMembership PRIMARY KEY,
 PublicId uniqueidentifier NOT NULL CONSTRAINT DF_InitiativeMembership_PublicId DEFAULT NEWID(),
 InitiativeId bigint NOT NULL, ApplicationId bigint NOT NULL, PersonId bigint NOT NULL,
 Status nvarchar(24) NOT NULL CONSTRAINT CK_InitiativeMembership_Status CHECK (Status IN (N'Accepted',N'Suspended',N'Completed',N'Withdrawn',N'Removed')),
 AcceptedAtUtc datetime2(3) NOT NULL, EndedAtUtc datetime2(3) NULL,
 CapacityReleasedAtUtc datetime2(3) NULL, WithdrawalCutoffAtUtc datetime2(3) NOT NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeMembership_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeMembership_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT UQ_InitiativeMembership_PublicId UNIQUE(PublicId),
 CONSTRAINT UQ_InitiativeMembership_Application UNIQUE(ApplicationId),
 CONSTRAINT UQ_InitiativeMembership_OwnerPerson UNIQUE(InitiativeId,PersonId),
 CONSTRAINT UQ_InitiativeMembership_IdOwner UNIQUE(Id,InitiativeId),
 CONSTRAINT FK_InitiativeMembership_Application FOREIGN KEY(ApplicationId,InitiativeId,PersonId)
  REFERENCES institution.InitiativeApplication(Id,InitiativeId,PersonId),
 CONSTRAINT FK_InitiativeMembership_Initiative FOREIGN KEY(InitiativeId) REFERENCES institution.Initiative(Id),
 CONSTRAINT FK_InitiativeMembership_Person FOREIGN KEY(PersonId) REFERENCES iam.Person(Id),
 CONSTRAINT CK_InitiativeMembership_End CHECK ((Status IN (N'Accepted',N'Suspended') AND EndedAtUtc IS NULL AND CapacityReleasedAtUtc IS NULL)
  OR (Status IN (N'Completed',N'Withdrawn',N'Removed') AND EndedAtUtc IS NOT NULL)),
 CONSTRAINT CK_InitiativeMembership_Release CHECK (CapacityReleasedAtUtc IS NULL OR (EndedAtUtc IS NOT NULL AND CapacityReleasedAtUtc>=EndedAtUtc))
);
CREATE UNIQUE INDEX UX_InitiativeMembership_OneEffective ON institution.InitiativeMembership(PersonId)
 WHERE Status IN (N'Accepted',N'Suspended');
CREATE INDEX IX_InitiativeMembership_Capacity ON institution.InitiativeMembership(InitiativeId,CapacityReleasedAtUtc,Status);

CREATE TABLE institution.InitiativeStaffInvitation (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InitiativeStaffInvitation PRIMARY KEY,
 InitiativeId bigint NOT NULL CONSTRAINT FK_InitiativeStaffInvitation_Initiative REFERENCES institution.Initiative(Id),
 NormalizedEmail nvarchar(320) NOT NULL, [Role] nvarchar(16) NOT NULL
  CONSTRAINT CK_InitiativeStaffInvitation_Role CHECK ([Role] IN (N'Supervisor',N'Coach')),
 TokenHash varbinary(64) NOT NULL, ExpiresAtUtc datetime2(3) NOT NULL,
 Status nvarchar(24) NOT NULL CONSTRAINT CK_InitiativeStaffInvitation_Status CHECK (Status IN (N'Pending',N'Accepted',N'Declined',N'Expired',N'Cancelled',N'Revoked')),
 InvitedByPersonId bigint NOT NULL CONSTRAINT FK_InitiativeStaffInvitation_Inviter REFERENCES iam.Person(Id),
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeStaffInvitation_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeStaffInvitation_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT UQ_InitiativeStaffInvitation_IdOwner UNIQUE(Id,InitiativeId)
);
CREATE UNIQUE INDEX UX_InitiativeStaffInvitation_Pending ON institution.InitiativeStaffInvitation(InitiativeId,NormalizedEmail,[Role]) WHERE Status=N'Pending';
CREATE TABLE institution.InitiativeStaffAppointment (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_InitiativeStaffAppointment PRIMARY KEY,
 InitiativeId bigint NOT NULL, PersonId bigint NOT NULL,
 InvitationId bigint NOT NULL, [Role] nvarchar(16) NOT NULL
  CONSTRAINT CK_InitiativeStaffAppointment_Role CHECK ([Role] IN (N'Supervisor',N'Coach')),
 Status nvarchar(24) NOT NULL CONSTRAINT CK_InitiativeStaffAppointment_Status CHECK (Status IN (N'Active',N'Revoked')),
 AcceptedAtUtc datetime2(3) NOT NULL, RevokedAtUtc datetime2(3) NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeStaffAppointment_Created DEFAULT SYSUTCDATETIME(),
 UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_InitiativeStaffAppointment_Updated DEFAULT SYSUTCDATETIME(),
 RowVersion rowversion NOT NULL,
 CONSTRAINT FK_InitiativeStaffAppointment_Initiative FOREIGN KEY(InitiativeId) REFERENCES institution.Initiative(Id),
 CONSTRAINT FK_InitiativeStaffAppointment_Person FOREIGN KEY(PersonId) REFERENCES iam.Person(Id),
 CONSTRAINT FK_InitiativeStaffAppointment_Invitation FOREIGN KEY(InvitationId,InitiativeId)
  REFERENCES institution.InitiativeStaffInvitation(Id,InitiativeId),
 CONSTRAINT UQ_InitiativeStaffAppointment_IdOwner UNIQUE(Id,InitiativeId),
 CONSTRAINT UQ_InitiativeStaffAppointment_Invitation UNIQUE(InvitationId),
 CONSTRAINT CK_InitiativeStaffAppointment_Revocation CHECK ((Status=N'Active' AND RevokedAtUtc IS NULL) OR (Status=N'Revoked' AND RevokedAtUtc IS NOT NULL))
);
CREATE UNIQUE INDEX UX_InitiativeStaffAppointment_Active ON institution.InitiativeStaffAppointment(InitiativeId,PersonId,[Role]) WHERE Status=N'Active';
CREATE INDEX IX_InitiativeStaffAppointment_Person ON institution.InitiativeStaffAppointment(PersonId,Status);

CREATE TABLE ops.AuditEvent (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditEvent PRIMARY KEY,
 ActorPersonId bigint NULL CONSTRAINT FK_AuditEvent_Actor REFERENCES iam.Person(Id),
 SelectedGrantKind nvarchar(40) NULL, SelectedGrantId bigint NULL,
 ResourceKind nvarchar(64) NOT NULL, ResourcePublicId uniqueidentifier NOT NULL,
 Action nvarchar(64) NOT NULL, BeforeStatus nvarchar(40) NULL, AfterStatus nvarchar(40) NULL,
 BeforeHash varbinary(32) NULL, AfterHash varbinary(32) NULL,
 Reason nvarchar(1000) NULL, AtUtc datetime2(3) NOT NULL,
 CorrelationId uniqueidentifier NOT NULL,
 CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_AuditEvent_Created DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_AuditEvent_Resource ON ops.AuditEvent(ResourceKind,ResourcePublicId,AtUtc);
CREATE INDEX IX_AuditEvent_Actor ON ops.AuditEvent(ActorPersonId,AtUtc);
GO

/* The runtime principal must not insert/update capacity rows directly. Stored
   procedures below are the only runtime write path for these first-slice facts.
   Migration/test principal retains DDL/DML for isolated validation. */
CREATE ROLE deepsprout_runtime AUTHORIZATION dbo;
DENY INSERT, UPDATE, DELETE ON OBJECT::institution.InitiativeMembership TO deepsprout_runtime;
DENY INSERT, UPDATE, DELETE ON OBJECT::institution.InitiativeApplicationDecision TO deepsprout_runtime;
DENY INSERT, UPDATE, DELETE ON OBJECT::institution.InitiativeStaffAppointment TO deepsprout_runtime;
GO

CREATE OR ALTER PROCEDURE institution.ApproveApplication
 @ApplicationId bigint, @ActorPersonId bigint,
 @CorrelationId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @initiativeId bigint, @personId bigint, @institutionId bigint,
         @capacity smallint, @status nvarchar(24), @terms bigint,
         @applicationPublicId uniqueidentifier,
         @membershipPublicId uniqueidentifier, @cutoff datetime2(3), @now datetime2(3);
 BEGIN TRY
  BEGIN TRAN;
  SELECT @initiativeId=InitiativeId, @personId=PersonId
   FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
  IF @initiativeId IS NULL THROW 51001, 'Application not found', 1;
  SELECT @institutionId=InstitutionId, @capacity=Capacity, @status=Status,
         @cutoff=WithdrawalCutoffAtUtc
   FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@initiativeId;
  IF @status<>N'Published' OR @cutoff IS NULL THROW 51002, 'Initiative not published', 1;
  IF NOT EXISTS (
    SELECT 1 FROM institution.RepresentativeMembership r WITH (UPDLOCK,HOLDLOCK)
    WHERE r.InstitutionId=@institutionId AND r.PersonId=@ActorPersonId AND r.Status=N'Active'
    UNION ALL
    SELECT 1 FROM institution.InitiativeStaffAppointment a WITH (UPDLOCK,HOLDLOCK)
    WHERE a.InitiativeId=@initiativeId AND a.PersonId=@ActorPersonId
      AND a.[Role]=N'Supervisor' AND a.Status=N'Active'
  ) THROW 51003, 'Actor lacks approval scope', 1;
  SELECT @status=Status,@terms=TermsRevisionId,@applicationPublicId=PublicId
   FROM institution.InitiativeApplication WITH (UPDLOCK,HOLDLOCK)
   WHERE Id=@ApplicationId;
  SET @now=SYSUTCDATETIME();
  IF @status<>N'Pending' THROW 51004, 'Application is not Pending', 1;
  IF NOT EXISTS (SELECT 1 FROM iam.Person WITH (UPDLOCK,HOLDLOCK) WHERE Id=@personId AND Status=N'Active')
   THROW 51005, 'Person inactive', 1;
  IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE PersonId=@personId AND Status IN (N'Accepted',N'Suspended'))
   THROW 51006, 'Person already has effective Initiative membership', 1;
  IF (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership WHERE InitiativeId=@initiativeId AND CapacityReleasedAtUtc IS NULL)>=@capacity
   THROW 51007, 'Initiative capacity full', 1;
  /* M1 has no offer flow. M3 admission must include Offered hold count. */
  INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc)
   VALUES(@initiativeId,@ApplicationId,@personId,N'Accepted',@now,@cutoff);
  SELECT @membershipPublicId=PublicId FROM institution.InitiativeMembership WHERE ApplicationId=@ApplicationId;
  UPDATE institution.InitiativeApplication SET Status=N'Accepted',UpdatedAtUtc=@now WHERE Id=@ApplicationId;
  INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,AtUtc,TermsRevisionId)
   VALUES(@ApplicationId,@initiativeId,1,N'Approved',@ActorPersonId,@now,@terms);
  INSERT ops.AuditEvent(ActorPersonId,SelectedGrantKind,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
   VALUES(@ActorPersonId,N'Initiative',N'InitiativeApplication',@applicationPublicId,N'ApproveApplication',N'Pending',N'Accepted',@now,@CorrelationId);
  INSERT ops.AuditEvent(ActorPersonId,SelectedGrantKind,ResourceKind,ResourcePublicId,Action,AfterStatus,AtUtc,CorrelationId)
   VALUES(@ActorPersonId,N'Initiative',N'InitiativeMembership',@membershipPublicId,N'CreateMembership',N'Accepted',@now,@CorrelationId);
  COMMIT;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK;
  THROW;
 END CATCH
END;
GO
GRANT EXECUTE ON OBJECT::institution.ApproveApplication TO deepsprout_runtime;
GO

CREATE OR ALTER PROCEDURE institution.WithdrawPendingApplication
 @ApplicationId bigint, @ActorPersonId bigint, @CorrelationId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @initiativeId bigint,@personId bigint,@terms bigint,@applicationPublicId uniqueidentifier,@now datetime2(3);
 BEGIN TRY
  BEGIN TRAN;
  SELECT @initiativeId=InitiativeId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
  IF @initiativeId IS NULL THROW 51011, 'Pending application not owned by actor', 1;
  SELECT @initiativeId=Id FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@initiativeId;
  SELECT @personId=PersonId,@terms=TermsRevisionId,@applicationPublicId=PublicId
   FROM institution.InitiativeApplication WITH (UPDLOCK,HOLDLOCK)
   WHERE Id=@ApplicationId AND Status=N'Pending';
  IF @initiativeId IS NULL OR @personId<>@ActorPersonId THROW 51011, 'Pending application not owned by actor', 1;
  SET @now=SYSUTCDATETIME();
  UPDATE institution.InitiativeApplication SET Status=N'Withdrawn',UpdatedAtUtc=@now WHERE Id=@ApplicationId;
  INSERT institution.InitiativeApplicationDecision(ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,AtUtc,TermsRevisionId)
   VALUES(@ApplicationId,@initiativeId,1,N'Withdrawn',@ActorPersonId,@now,@terms);
  INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
   VALUES(@ActorPersonId,N'InitiativeApplication',@applicationPublicId,N'WithdrawApplication',N'Pending',N'Withdrawn',@now,@CorrelationId);
  COMMIT;
 END TRY
 BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
GO
GRANT EXECUTE ON OBJECT::institution.WithdrawPendingApplication TO deepsprout_runtime;
GO

CREATE OR ALTER PROCEDURE institution.WithdrawAcceptedMembership
 @MembershipId bigint, @ActorPersonId bigint, @CorrelationId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @initiativeId bigint,@personId bigint,
  @cutoff datetime2(3),@status nvarchar(24),@membershipPublicId uniqueidentifier,
  @now datetime2(3);
 BEGIN TRY
  BEGIN TRAN;
  SELECT @initiativeId=InitiativeId FROM institution.InitiativeMembership WHERE Id=@MembershipId;
  IF @initiativeId IS NULL THROW 51021, 'Membership not found', 1;
  SELECT @initiativeId=Id FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@initiativeId;
  SELECT @personId=PersonId,@cutoff=WithdrawalCutoffAtUtc,@status=Status,
         @membershipPublicId=PublicId
   FROM institution.InitiativeMembership WITH (UPDLOCK,HOLDLOCK) WHERE Id=@MembershipId;
  SET @now=SYSUTCDATETIME();
  IF @personId<>@ActorPersonId OR @status<>N'Accepted' THROW 51022, 'Actor cannot voluntarily withdraw membership', 1;
  IF @now>=@cutoff THROW 51023, 'Voluntary withdrawal cutoff passed', 1;
  UPDATE institution.InitiativeMembership
   SET Status=N'Withdrawn',EndedAtUtc=@now,CapacityReleasedAtUtc=@now,UpdatedAtUtc=@now WHERE Id=@MembershipId;
  INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
   VALUES(@ActorPersonId,N'InitiativeMembership',@membershipPublicId,N'WithdrawMembership',N'Accepted',N'Withdrawn',@now,@CorrelationId);
  COMMIT;
 END TRY
 BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
GO
GRANT EXECUTE ON OBJECT::institution.WithdrawAcceptedMembership TO deepsprout_runtime;
GO

CREATE OR ALTER PROCEDURE institution.AcceptSupervisorInvitation
 @InvitationId bigint, @ActorPersonId bigint, @CorrelationId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @initiativeId bigint,@email nvarchar(320),@status nvarchar(24),@expires datetime2(3),
 @publicId uniqueidentifier,@now datetime2(3);
 BEGIN TRY
  BEGIN TRAN;
  SELECT @initiativeId=InitiativeId FROM institution.InitiativeStaffInvitation WHERE Id=@InvitationId;
  IF @initiativeId IS NULL THROW 51031, 'Invitation not found', 1;
  SELECT @publicId=PublicId FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@initiativeId;
  SELECT @email=NormalizedEmail,@status=Status,@expires=ExpiresAtUtc
   FROM institution.InitiativeStaffInvitation WITH (UPDLOCK,HOLDLOCK)
   WHERE Id=@InvitationId AND [Role]=N'Supervisor';
  IF NOT EXISTS (SELECT 1 FROM iam.PersonEmail WITH (UPDLOCK,HOLDLOCK) WHERE PersonId=@ActorPersonId AND NormalizedEmail=@email AND Status=N'Verified')
   THROW 51033, 'Invitation email does not match verified person', 1;
  SET @now=SYSUTCDATETIME();
  IF @status IS NULL OR @status<>N'Pending' OR @expires<=@now THROW 51032, 'Supervisor invitation not valid', 1;
  IF (SELECT COUNT_BIG(*) FROM institution.InitiativeStaffAppointment WHERE InitiativeId=@initiativeId AND [Role]=N'Supervisor' AND Status=N'Active')>=3
   THROW 51034, 'Three active Supervisors already appointed', 1;
  INSERT institution.InitiativeStaffAppointment(InitiativeId,PersonId,InvitationId,[Role],Status,AcceptedAtUtc)
   VALUES(@initiativeId,@ActorPersonId,@InvitationId,N'Supervisor',N'Active',@now);
  UPDATE institution.InitiativeStaffInvitation SET Status=N'Accepted',UpdatedAtUtc=@now WHERE Id=@InvitationId;
  INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
   VALUES(@ActorPersonId,N'Initiative',@publicId,N'AcceptSupervisorInvitation',N'Pending',N'Active',@now,@CorrelationId);
  COMMIT;
 END TRY
 BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
GO
GRANT EXECUTE ON OBJECT::institution.AcceptSupervisorInvitation TO deepsprout_runtime;
GO
