CREATE OR ALTER TRIGGER institution.TR_InitiativeSeatOffer_Capacity
ON institution.InitiativeSeatOffer AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.ApplicationId<>d.ApplicationId OR i.InitiativeId<>d.InitiativeId
          OR (d.Status IN (N'Accepted',N'Declined',N'Expired',N'Cancelled') AND i.Status<>d.Status))
       THROW 64001, 'Seat offer owner or terminal status is immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN institution.Initiative a ON a.Id=i.InitiativeId
       JOIN institution.InitiativeApplication app ON app.Id=i.ApplicationId
       WHERE i.Status=N'Offered' AND (a.Status<>N'Published' OR app.Status<>N'Offered'))
       THROW 64002, 'Live seat offer requires published Initiative and offered application', 1;
    IF EXISTS (SELECT 1 FROM institution.Initiative a WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT InitiativeId FROM inserted) i ON i.InitiativeId=a.Id
       WHERE (SELECT COUNT_BIG(*) FROM institution.InitiativeMembership m
             WHERE m.InitiativeId=a.Id AND m.CapacityReleasedAtUtc IS NULL)
         +(SELECT COUNT_BIG(*) FROM institution.InitiativeSeatOffer o
             WHERE o.InitiativeId=a.Id AND o.Status=N'Offered')>a.Capacity)
       THROW 64003, 'Initiative capacity exceeded by active memberships and offers', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER institution.TR_Initiative_CancelOffers
ON institution.Initiative AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Closed TABLE (PublicId uniqueidentifier,InitiativeId bigint);
    UPDATE o SET Status=N'Cancelled',DecisionAtUtc=i.CancelledAtUtc,UpdatedAtUtc=i.CancelledAtUtc
       OUTPUT inserted.PublicId,inserted.InitiativeId INTO @Closed
      FROM institution.InitiativeSeatOffer o JOIN inserted i ON i.Id=o.InitiativeId
      JOIN deleted d ON d.Id=i.Id WHERE i.Status=N'Cancelled' AND d.Status<>N'Cancelled' AND o.Status=N'Offered';
    INSERT ops.AuditEvent(ActorPersonId,ResourceKind,ResourcePublicId,Action,BeforeStatus,AfterStatus,Reason,AtUtc,CorrelationId)
      SELECT i.CancelledByPersonId,N'InitiativeSeatOffer',c.PublicId,N'InitiativeCancelled',N'Offered',N'Cancelled',
             i.CancellationReason,i.CancelledAtUtc,NEWID()
        FROM @Closed c JOIN inserted i ON i.Id=c.InitiativeId;
END;
-- BATCH
CREATE OR ALTER TRIGGER institution.TR_InitiativeContent_Publish
ON institution.InitiativeContent AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted c JOIN institution.Initiative i ON i.Id=c.InitiativeId
       WHERE c.Status=N'Published' AND i.Status<>N'Published')
       THROW 64004, 'Published Initiative content requires published Initiative', 1;
END;
