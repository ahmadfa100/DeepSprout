CREATE OR ALTER TRIGGER commercial.TR_PlanVersion_Immutable
ON commercial.PlanVersion AFTER UPDATE, DELETE
AS BEGIN THROW 66001, 'Plan version is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER commercial.TR_PlanFeature_Immutable
ON commercial.PlanFeature AFTER UPDATE, DELETE
AS BEGIN THROW 66002, 'Plan feature version is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER commercial.TR_Subscription_Payer
ON commercial.Subscription AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE ISNULL(i.PersonPayerId,-1)<>ISNULL(d.PersonPayerId,-1)
          OR ISNULL(i.InstitutionPayerId,-1)<>ISNULL(d.InstitutionPayerId,-1)
          OR ISNULL(i.ProviderPayerId,-1)<>ISNULL(d.ProviderPayerId,-1)
          OR i.PlanVersionId<>d.PlanVersionId)
       THROW 66003, 'Subscription payer and pinned plan are immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER commercial.TR_EntitlementAllocation_Beneficiary
ON commercial.EntitlementAllocation AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE ISNULL(i.PersonId,-1)<>ISNULL(d.PersonId,-1)
          OR ISNULL(i.InstitutionId,-1)<>ISNULL(d.InstitutionId,-1)
          OR ISNULL(i.ProviderId,-1)<>ISNULL(d.ProviderId,-1)
          OR ISNULL(i.SubscriptionId,-1)<>ISNULL(d.SubscriptionId,-1)
          OR i.FeatureCode<>d.FeatureCode)
       THROW 66004, 'Entitlement beneficiary and feature are immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.LimitValue IS NOT NULL AND
       (SELECT COALESCE(SUM(CONVERT(bigint,l.Quantity)),0) FROM commercial.UsageLedger l WHERE l.AllocationId=i.Id)>i.LimitValue)
       THROW 66005, 'Entitlement limit cannot shrink below recorded usage', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER commercial.TR_UsageLedger_Guard
ON commercial.UsageLedger AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted) THROW 66006, 'Usage ledger is append-only', 1;
    IF EXISTS (SELECT 1 FROM commercial.EntitlementAllocation a WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT AllocationId FROM inserted) i ON i.AllocationId=a.Id
       CROSS APPLY (SELECT COALESCE(SUM(CONVERT(bigint,l.Quantity)),0) AS Used
          FROM commercial.UsageLedger l WHERE l.AllocationId=a.Id) total
       WHERE total.Used<0 OR (a.LimitValue IS NOT NULL AND total.Used>a.LimitValue))
       THROW 66007, 'Entitlement usage outside allocation range', 1;
END;
-- BATCH
CREATE OR ALTER PROCEDURE commercial.RecordUsage
    @AllocationId bigint,@SourceKey nvarchar(160),@Quantity int,@EntryId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Limit int,@Used bigint,@Exists bit=0;
        SELECT @Limit=LimitValue,@Exists=1 FROM commercial.EntitlementAllocation WITH (UPDLOCK,HOLDLOCK) WHERE Id=@AllocationId;
        IF @Exists=0 THROW 66008, 'Entitlement allocation not found', 1;
        IF @Quantity=0 OR @SourceKey IS NULL OR LEN(TRIM(@SourceKey))=0 THROW 66009, 'Usage source and nonzero quantity required', 1;
        SELECT @Used=COALESCE(SUM(CONVERT(bigint,Quantity)),0) FROM commercial.UsageLedger WHERE AllocationId=@AllocationId;
        IF @Used+@Quantity<0 OR (@Limit IS NOT NULL AND @Used+@Quantity>@Limit)
            THROW 66007, 'Entitlement usage outside allocation range', 1;
        INSERT commercial.UsageLedger(AllocationId,SourceKey,Quantity,RecordedAtUtc)
          VALUES(@AllocationId,@SourceKey,@Quantity,SYSUTCDATETIME());
        SET @EntryId=CAST(SCOPE_IDENTITY() AS bigint);
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;
