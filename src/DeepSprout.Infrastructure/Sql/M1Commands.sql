/* Applied by the EF Core InitialM1 migration after the 19 tables.
   Each separator begins a separate SQL command; no GO directives. */
IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'M1 migration targets only DeepSprout_Validation', 1;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name=N'deepsprout_runtime' AND type=N'R')
    CREATE ROLE deepsprout_runtime AUTHORIZATION dbo;
-- BATCH
CREATE OR ALTER FUNCTION institution.CanWithdraw(@NowUtc datetime2(3), @CutoffUtc datetime2(3))
RETURNS bit
AS
BEGIN
    RETURN CASE WHEN @NowUtc < @CutoffUtc THEN 1 ELSE 0 END;
END;
-- BATCH
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
-- BATCH
CREATE OR ALTER TRIGGER institution.TR_InitiativeRevision_Immutable
ON institution.InitiativeRevision AFTER UPDATE, DELETE
AS
BEGIN
    THROW 51041, 'Published initiative revisions are immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER institution.TR_InitiativeApplicationDecision_Immutable
ON institution.InitiativeApplicationDecision AFTER UPDATE, DELETE
AS
BEGIN
    THROW 51042, 'Application decisions are append-only', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER ops.TR_AuditEvent_Immutable
ON ops.AuditEvent AFTER UPDATE, DELETE
AS
BEGIN
    THROW 51043, 'Audit events are append-only', 1;
END;
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
-- BATCH
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
