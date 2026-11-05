CREATE OR ALTER PROCEDURE ops.EndMembershipAt
    @MembershipId bigint,@ActorPersonId bigint,@NewStatus nvarchar(24),@NowUtc datetime2(3)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @NewStatus NOT IN (N'Withdrawn',N'Removed',N'Completed') THROW 51301, 'Invalid end status', 1;
    IF @NowUtc IS NULL THROW 51305, 'Test clock is required', 1;
    BEGIN TRAN;
    DECLARE @InitiativeId bigint,@InstitutionId bigint,@PersonId bigint,@Status nvarchar(24),
        @Cutoff datetime2(3),@PublicId uniqueidentifier;
    SELECT @InitiativeId=InitiativeId FROM institution.InitiativeMembership WHERE Id=@MembershipId;
    SELECT @InstitutionId=InstitutionId FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    SELECT @PersonId=PersonId,@Status=Status,@Cutoff=WithdrawalCutoffAtUtc,@PublicId=PublicId
        FROM institution.InitiativeMembership WHERE Id=@MembershipId;
    IF @PersonId IS NULL THROW 51302, 'Membership not found', 1;
    IF @NewStatus=N'Withdrawn'
    BEGIN
        IF @Status<>N'Accepted' OR @ActorPersonId<>@PersonId OR institution.CanWithdraw(@NowUtc,@Cutoff)<>1
            THROW 51303, 'Voluntary withdrawal is unavailable at or after the effective cutoff', 1;
    END
    ELSE
    BEGIN
        IF @Status NOT IN (N'Accepted',N'Suspended') THROW 51304, 'Membership is not active', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active')
            THROW 51102, 'Representative grant is not active', 1;
    END;
    UPDATE institution.InitiativeMembership
       SET Status=@NewStatus,EndReason=CASE @NewStatus WHEN N'Withdrawn' THEN N'VoluntaryWithdrawal'
           WHEN N'Removed' THEN N'RepresentativeRemoval' ELSE N'Completed' END,
           EndedAtUtc=@NowUtc,CapacityReleasedAtUtc=@NowUtc,UpdatedAtUtc=SYSUTCDATETIME()
     WHERE Id=@MembershipId;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N'Membership',@PublicId,@NewStatus,@Status,@NewStatus,SYSUTCDATETIME(),NEWID());
    COMMIT;
END;
-- BATCH
CREATE OR ALTER PROCEDURE institution.EndMembership
    @MembershipId bigint,@ActorPersonId bigint,@NewStatus nvarchar(24)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Now datetime2(3)=SYSUTCDATETIME();
    EXEC ops.EndMembershipAt @MembershipId,@ActorPersonId,@NewStatus,@NowUtc=@Now;
END;
-- BATCH
CREATE OR ALTER PROCEDURE institution.CancelInitiative
    @InitiativeId bigint,@ActorPersonId bigint,@Reason nvarchar(800)
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @Reason IS NULL OR LEN(TRIM(@Reason))=0 THROW 51701, 'Cancellation reason is required', 1;
    BEGIN TRAN;
    DECLARE @InstitutionId bigint,@Status nvarchar(24),@PublicId uniqueidentifier,
            @Now datetime2(3)=SYSUTCDATETIME(),@GrantKind nvarchar(40),@GrantId bigint;
    SELECT @InstitutionId=InstitutionId,@Status=Status,@PublicId=PublicId
      FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
    IF @Status IS NULL THROW 51702, 'Initiative not found', 1;
    IF @Status=N'Cancelled' THROW 51703, 'Initiative is already cancelled', 1;
    IF @Status NOT IN (N'Draft',N'Published',N'Closed') THROW 51704, 'Initiative status is not cancellable', 1;
    SELECT TOP (1) @GrantKind=N'InstitutionRepresentative',@GrantId=Id
      FROM institution.RepresentativeMembership
      WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active' AND RevokedAtUtc IS NULL;
    IF @GrantId IS NULL
        SELECT TOP (1) @GrantKind=N'GlobalGrant',@GrantId=Id FROM iam.GlobalGrant
         WHERE PersonId=@ActorPersonId AND Capability=N'InitiativeCancellationAdmin' AND RevokedAtUtc IS NULL;
    IF @GrantId IS NULL THROW 51705, 'Actor has no cancellation authority', 1;

    DECLARE @Closed TABLE(Id bigint PRIMARY KEY,PublicId uniqueidentifier,TermsRevisionId bigint,BeforeStatus nvarchar(24));
    UPDATE institution.InitiativeApplication
       SET Status=N'Cancelled',ClosedReason=N'InitiativeCancelled',ClosedAtUtc=@Now,UpdatedAtUtc=@Now
       OUTPUT inserted.Id,inserted.PublicId,inserted.TermsRevisionId,deleted.Status INTO @Closed
     WHERE InitiativeId=@InitiativeId AND Status IN (N'Pending',N'Queued',N'Offered');
    INSERT institution.InitiativeApplicationDecision
        (ApplicationId,InitiativeId,DecisionNo,Action,ActorPersonId,Reason,TermsRevisionId,AtUtc)
      SELECT c.Id,@InitiativeId,ISNULL((SELECT MAX(d.DecisionNo) FROM institution.InitiativeApplicationDecision d
           WHERE d.ApplicationId=c.Id),0)+1,N'Cancelled',@ActorPersonId,@Reason,c.TermsRevisionId,@Now
        FROM @Closed c;
    INSERT ops.AuditEvent(ActorPersonId,SelectedGrantKind,SelectedGrantId,ResourceKind,ResourcePublicId,
        Action,BeforeStatus,AfterStatus,Reason,AtUtc,CorrelationId)
      SELECT @ActorPersonId,@GrantKind,@GrantId,N'Application',PublicId,N'InitiativeCancelled',
             BeforeStatus,N'Cancelled',@Reason,@Now,NEWID() FROM @Closed;

    DECLARE @Ended TABLE(PublicId uniqueidentifier PRIMARY KEY,BeforeStatus nvarchar(24));
    UPDATE institution.InitiativeMembership
       SET Status=N'Cancelled',EndReason=N'InitiativeCancelled',EndedAtUtc=@Now,
           CapacityReleasedAtUtc=@Now,UpdatedAtUtc=@Now
       OUTPUT inserted.PublicId,deleted.Status INTO @Ended
     WHERE InitiativeId=@InitiativeId AND Status IN (N'Accepted',N'Suspended');
    INSERT ops.AuditEvent(ActorPersonId,SelectedGrantKind,SelectedGrantId,ResourceKind,ResourcePublicId,
        Action,BeforeStatus,AfterStatus,Reason,AtUtc,CorrelationId)
      SELECT @ActorPersonId,@GrantKind,@GrantId,N'Membership',PublicId,N'InitiativeCancelled',
             BeforeStatus,N'Cancelled',@Reason,@Now,NEWID() FROM @Ended;

    UPDATE institution.Initiative
       SET Status=N'Cancelled',CancellationReason=@Reason,CancelledAtUtc=@Now,
           CancelledByPersonId=@ActorPersonId,UpdatedAtUtc=@Now WHERE Id=@InitiativeId;
    INSERT ops.AuditEvent(ActorPersonId,SelectedGrantKind,SelectedGrantId,ResourceKind,ResourcePublicId,
        Action,BeforeStatus,AfterStatus,Reason,AtUtc,CorrelationId)
      VALUES(@ActorPersonId,@GrantKind,@GrantId,N'Initiative',@PublicId,N'Cancelled',
             @Status,N'Cancelled',@Reason,@Now,NEWID());
    COMMIT;
END;
-- BATCH
CREATE OR ALTER TRIGGER institution.TR_Initiative_PublishedRevision
ON institution.Initiative AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Status=N'Published'
        AND NOT EXISTS (SELECT 1 FROM institution.InitiativeRevision r WHERE r.InitiativeId=i.Id))
        THROW 51040, 'Published initiative requires a matching revision', 1;
    IF EXISTS (SELECT 1 FROM deleted d JOIN inserted i ON i.Id=d.Id WHERE d.Status=N'Cancelled'
       AND (i.Status<>N'Cancelled' OR i.CancellationReason<>d.CancellationReason
            OR i.CancelledAtUtc<>d.CancelledAtUtc OR i.CancelledByPersonId<>d.CancelledByPersonId))
        THROW 51706, 'Cancelled initiative is permanent', 1;
END;
