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
