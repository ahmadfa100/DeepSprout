CREATE OR ALTER PROCEDURE institution.CreateSeatOffer
    @ApplicationId bigint,@ActorPersonId bigint,@ExpiresAtUtc datetime2(3),@OfferId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @InitiativeId bigint,@InstitutionId bigint,@Capacity smallint,@InitiativeStatus nvarchar(24),
                @ApplicationStatus nvarchar(24),@ApplicationPublicId uniqueidentifier,@Now datetime2(3)=SYSUTCDATETIME();
        SELECT @InitiativeId=InitiativeId FROM institution.InitiativeApplication WHERE Id=@ApplicationId;
        IF @InitiativeId IS NULL THROW 64005, 'Application not found', 1;
        SELECT @InstitutionId=InstitutionId,@Capacity=Capacity,@InitiativeStatus=Status
          FROM institution.Initiative WITH (UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
        IF @InitiativeStatus<>N'Published' THROW 64006, 'Initiative is not published', 1;
        IF NOT EXISTS (SELECT 1 FROM institution.RepresentativeMembership
            WHERE InstitutionId=@InstitutionId AND PersonId=@ActorPersonId AND Status=N'Active' AND RevokedAtUtc IS NULL)
          AND NOT EXISTS (SELECT 1 FROM institution.InitiativeStaffAppointment
            WHERE InitiativeId=@InitiativeId AND PersonId=@ActorPersonId AND Role=N'Supervisor' AND Status=N'Active')
            THROW 64007, 'Actor has no seat-offer authority', 1;
        IF @ExpiresAtUtc IS NULL OR @ExpiresAtUtc<=@Now THROW 64008, 'Offer expiry must be in the future', 1;
        SELECT @ApplicationStatus=Status,@ApplicationPublicId=PublicId
          FROM institution.InitiativeApplication WITH (UPDLOCK,HOLDLOCK) WHERE Id=@ApplicationId;
        IF @ApplicationStatus NOT IN (N'Pending',N'Queued') THROW 64009, 'Application cannot receive a new offer', 1;
        IF (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership WHERE InitiativeId=@InitiativeId AND CapacityReleasedAtUtc IS NULL)
          +(SELECT COUNT_BIG(*) FROM institution.InitiativeSeatOffer WHERE InitiativeId=@InitiativeId AND Status=N'Offered')>=@Capacity
            THROW 64003, 'Initiative capacity exceeded by active memberships and offers', 1;
        UPDATE institution.InitiativeApplication SET Status=N'Offered',UpdatedAtUtc=@Now WHERE Id=@ApplicationId;
        INSERT institution.InitiativeSeatOffer(InitiativeId,ApplicationId,Status,OfferedAtUtc,ExpiresAtUtc)
          VALUES(@InitiativeId,@ApplicationId,N'Offered',@Now,@ExpiresAtUtc);
        SET @OfferId=CAST(SCOPE_IDENTITY() AS bigint);
        INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,AtUtc,CorrelationId)
          VALUES(@ActorPersonId,N'Application',@ApplicationPublicId,N'SeatOffered',@ApplicationStatus,N'Offered',@Now,NEWID());
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;
