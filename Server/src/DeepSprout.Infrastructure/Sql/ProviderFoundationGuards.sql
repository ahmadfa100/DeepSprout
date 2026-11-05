CREATE OR ALTER TRIGGER provider.TR_ExperienceRevision_Immutable
ON provider.ExperienceRevision AFTER UPDATE, DELETE
AS BEGIN THROW 62001, 'Experience revision is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER provider.TR_Experience_Capacity
ON provider.Experience AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.ProviderId<>d.ProviderId)
       THROW 62002, 'Experience Provider is immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Capacity<
       (SELECT COUNT_BIG(*) FROM provider.ExperienceBooking b WHERE b.ExperienceId=i.Id
          AND b.Status IN (N'Confirmed',N'CheckedIn',N'Completed') AND b.CapacityReleasedAtUtc IS NULL)
       +(SELECT COUNT_BIG(*) FROM provider.SeatOffer o WHERE o.ExperienceId=i.Id AND o.Status=N'Offered'))
       THROW 62003, 'Experience capacity cannot shrink below live claims', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER provider.TR_ExperienceBooking_Capacity
ON provider.ExperienceBooking AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.ExperienceId<>d.ExperienceId OR i.PersonId<>d.PersonId OR i.RevisionId<>d.RevisionId)
       THROW 62004, 'Booking owner and pinned revision are immutable', 1;
    IF EXISTS (SELECT 1 FROM provider.Experience e WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT ExperienceId FROM inserted) i ON i.ExperienceId=e.Id
       WHERE (SELECT COUNT_BIG(*) FROM provider.ExperienceBooking b WHERE b.ExperienceId=e.Id
          AND b.Status IN (N'Confirmed',N'CheckedIn',N'Completed') AND b.CapacityReleasedAtUtc IS NULL)
       +(SELECT COUNT_BIG(*) FROM provider.SeatOffer o WHERE o.ExperienceId=e.Id AND o.Status=N'Offered')>e.Capacity)
       THROW 62005, 'Experience capacity exceeded', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER provider.TR_SeatOffer_Capacity
ON provider.SeatOffer AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.ExperienceId<>d.ExperienceId OR i.BookingId<>d.BookingId)
       THROW 62006, 'Seat offer owner is immutable', 1;
    IF EXISTS (SELECT 1 FROM provider.Experience e WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT ExperienceId FROM inserted) i ON i.ExperienceId=e.Id
       WHERE (SELECT COUNT_BIG(*) FROM provider.ExperienceBooking b WHERE b.ExperienceId=e.Id
          AND b.Status IN (N'Confirmed',N'CheckedIn',N'Completed') AND b.CapacityReleasedAtUtc IS NULL)
       +(SELECT COUNT_BIG(*) FROM provider.SeatOffer o WHERE o.ExperienceId=e.Id AND o.Status=N'Offered')>e.Capacity)
       THROW 62005, 'Experience capacity exceeded', 1;
END;
-- BATCH
CREATE OR ALTER PROCEDURE provider.BookConfirmed
    @ExperienceId bigint,@PersonId bigint,@Mode nvarchar(20),@BookingId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Capacity int,@Claims bigint,@RevisionId bigint;
        SELECT @Capacity=Capacity FROM provider.Experience WITH (UPDLOCK,HOLDLOCK)
          WHERE Id=@ExperienceId AND Status IN (N'Published',N'Active');
        IF @Capacity IS NULL THROW 62007, 'Published Experience not found', 1;
        SELECT @Claims=(SELECT COUNT_BIG(*) FROM provider.ExperienceBooking
             WHERE ExperienceId=@ExperienceId AND Status IN (N'Confirmed',N'CheckedIn',N'Completed') AND CapacityReleasedAtUtc IS NULL)
             +(SELECT COUNT_BIG(*) FROM provider.SeatOffer WHERE ExperienceId=@ExperienceId AND Status=N'Offered');
        IF @Claims>=@Capacity THROW 62005, 'Experience capacity exceeded', 1;
        SELECT TOP(1) @RevisionId=Id FROM provider.ExperienceRevision WHERE ExperienceId=@ExperienceId ORDER BY RevisionNo DESC;
        IF @RevisionId IS NULL THROW 62008, 'Published Experience revision not found', 1;
        INSERT provider.ExperienceBooking(ExperienceId,PersonId,RevisionId,Status,Mode,BookedAtUtc)
          VALUES(@ExperienceId,@PersonId,@RevisionId,N'Confirmed',@Mode,SYSUTCDATETIME());
        SET @BookingId=CAST(SCOPE_IDENTITY() AS bigint);
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;
