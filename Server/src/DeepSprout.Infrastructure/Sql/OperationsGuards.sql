CREATE OR ALTER TRIGGER governance.TR_ContentRelease_Immutable
ON governance.ContentRelease AFTER UPDATE, DELETE
AS BEGIN THROW 54001, 'Content release is immutable; publish a new version', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER governance.TR_GovernanceAction_Immutable
ON governance.GovernanceAction AFTER UPDATE, DELETE
AS BEGIN THROW 54002, 'Governance action is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER ops.TR_DeliveryAttempt_Immutable
ON ops.DeliveryAttempt AFTER UPDATE, DELETE
AS BEGIN THROW 54003, 'Delivery attempt is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER ops.TR_OutboxMessage_Terminal
ON ops.OutboxMessage AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
        WHERE d.Status IN (N'Delivered',N'DeadLetter') AND i.Status<>d.Status)
        THROW 54004, 'Terminal outbox status cannot be reopened', 1;
END;
