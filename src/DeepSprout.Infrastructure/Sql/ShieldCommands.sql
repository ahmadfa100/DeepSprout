CREATE OR ALTER TRIGGER shield.TR_ShieldConfiguration_Immutable
ON shield.ShieldConfiguration AFTER UPDATE, DELETE
AS BEGIN THROW 53001, 'Shield configuration is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER shield.TR_BrowserUsagePeriod_Immutable
ON shield.BrowserUsagePeriod AFTER UPDATE, DELETE
AS BEGIN THROW 53002, 'Browser usage period is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER shield.TR_BrowserUsageDomain_Immutable
ON shield.BrowserUsageDomain AFTER UPDATE, DELETE
AS BEGIN THROW 53003, 'Browser usage domain is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER shield.TR_ShieldSelectedDomain_UsedConfiguration
ON shield.ShieldSelectedDomain AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i WHERE EXISTS (SELECT 1 FROM shield.BrowserUsagePeriod p WHERE p.ConfigurationId=i.ConfigurationId)
        OR EXISTS (SELECT 1 FROM shield.ProtectionSession s WHERE s.ConfigurationId=i.ConfigurationId))
       OR EXISTS (SELECT 1 FROM deleted d WHERE EXISTS (SELECT 1 FROM shield.BrowserUsagePeriod p WHERE p.ConfigurationId=d.ConfigurationId)
        OR EXISTS (SELECT 1 FROM shield.ProtectionSession s WHERE s.ConfigurationId=d.ConfigurationId))
        THROW 53004, 'Selected domains are sealed after configuration use', 1;
END;
-- BATCH
CREATE OR ALTER PROCEDURE shield.IngestUsagePeriod
    @InstallationId bigint,@ConfigurationId bigint,@PersonId bigint,
    @LocalDate date,@TimeZoneId nvarchar(80),@ObservedSeconds int,@CoverageSeconds int,
    @GapCount int,@SequenceNo bigint,@SourceHash varbinary(32),@DomainsJson nvarchar(max),
    @PeriodId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @TimeZoneId IS NULL OR LEN(TRIM(@TimeZoneId))=0 OR @SourceHash IS NULL OR DATALENGTH(@SourceHash)<>32
       OR @DomainsJson IS NULL OR ISJSON(@DomainsJson)<>1
       OR @ObservedSeconds IS NULL OR @ObservedSeconds<0 OR @CoverageSeconds IS NULL OR @CoverageSeconds<0
       OR @GapCount IS NULL OR @GapCount<0 OR @SequenceNo IS NULL OR @SequenceNo<1
        THROW 53010, 'Invalid usage period payload', 1;
    DECLARE @Domains TABLE(DomainCode nvarchar(120) NOT NULL PRIMARY KEY,ObservedSeconds int NOT NULL);
    INSERT @Domains(DomainCode,ObservedSeconds)
       SELECT DomainCode,ObservedSeconds FROM OPENJSON(@DomainsJson)
           WITH (DomainCode nvarchar(120) '$.domainCode',ObservedSeconds int '$.observedSeconds');
    IF EXISTS (SELECT 1 FROM @Domains WHERE DomainCode=N'' OR ObservedSeconds<0)
       OR (SELECT COALESCE(SUM(CONVERT(bigint,ObservedSeconds)),0) FROM @Domains)<>@ObservedSeconds
        THROW 53011, 'Domain totals do not match period', 1;
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM shield.ExtensionInstallation WITH (UPDLOCK,HOLDLOCK)
        WHERE Id=@InstallationId AND PersonId=@PersonId AND Status=N'Connected')
        THROW 53012, 'Connected installation owner mismatch', 1;
    IF NOT EXISTS (SELECT 1 FROM shield.ShieldConfiguration
        WHERE Id=@ConfigurationId AND PersonId=@PersonId)
        THROW 53013, 'Configuration owner mismatch', 1;
    IF EXISTS (SELECT 1 FROM @Domains d WHERE NOT EXISTS
       (SELECT 1 FROM shield.ShieldSelectedDomain s WHERE s.ConfigurationId=@ConfigurationId AND s.DomainCode=d.DomainCode))
        THROW 53014, 'Domain is not selected in this configuration', 1;
    INSERT shield.BrowserUsagePeriod(InstallationId,ConfigurationId,PersonId,LocalDate,TimeZoneId,
        ObservedSeconds,CoverageSeconds,GapCount,SequenceNo,SourceHash)
      VALUES(@InstallationId,@ConfigurationId,@PersonId,@LocalDate,@TimeZoneId,
        @ObservedSeconds,@CoverageSeconds,@GapCount,@SequenceNo,@SourceHash);
    SET @PeriodId=SCOPE_IDENTITY();
    INSERT shield.BrowserUsageDomain(UsagePeriodId,ConfigurationId,DomainCode,ObservedSeconds)
       SELECT @PeriodId,@ConfigurationId,DomainCode,ObservedSeconds FROM @Domains;
    COMMIT;
END;
