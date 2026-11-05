CREATE OR ALTER PROCEDURE institution.RescheduleInitiative
    @InitiativeId bigint,@ActorPersonId bigint,@NewStartsAtUtc datetime2(3),
    @NewEndsAtUtc datetime2(3),@RevisionId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @NewStartsAtUtc IS NULL OR @NewStartsAtUtc<=SYSUTCDATETIME() OR @NewEndsAtUtc IS NULL OR @NewEndsAtUtc<=@NewStartsAtUtc
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
    /* Postponement extends existing rights; advancement cannot shorten them. */
    UPDATE institution.InitiativeMembership
       SET WithdrawalCutoffAtUtc=@Cutoff,UpdatedAtUtc=SYSUTCDATETIME()
     WHERE InitiativeId=@InitiativeId AND Status IN (N'Accepted',N'Suspended')
       AND WithdrawalCutoffAtUtc<@Cutoff;
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,AtUtc,CorrelationId)
        VALUES(@ActorPersonId,N'Initiative',@PublicId,N'Rescheduled',SYSUTCDATETIME(),NEWID());
    COMMIT;
END;
