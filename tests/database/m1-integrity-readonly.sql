/* Read-only M1 integrity audit. Execute only against DeepSprout_Validation. */
IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Wrong validation database', 1;
SET NOCOUNT ON;
SELECT DB_NAME() AS DatabaseName, compatibility_level AS CompatibilityLevel,
       is_read_committed_snapshot_on AS ReadCommittedSnapshotOn,
       snapshot_isolation_state_desc AS SnapshotIsolationState
FROM sys.databases WHERE name=DB_NAME();

SELECT COUNT(*) AS M1Tables
FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
WHERE s.name IN (N'iam',N'institution',N'files',N'ops');
SELECT COUNT(*) AS UntrustedOrDisabledForeignKeys FROM sys.foreign_keys
WHERE is_not_trusted=1 OR is_disabled=1;
SELECT COUNT(*) AS UntrustedOrDisabledChecks FROM sys.check_constraints
WHERE is_not_trusted=1 OR is_disabled=1;
SELECT COUNT(*) AS MutableTablesWithRowVersion
FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
WHERE s.name IN (N'iam',N'institution',N'files') AND t.name NOT IN (N'ConsentRecord',N'InitiativeRevision',N'InitiativeApplicationDecision')
AND EXISTS (SELECT 1 FROM sys.columns c WHERE c.object_id=t.object_id AND c.name=N'RowVersion' AND c.system_type_id=189);
SELECT MigrationId,ProductVersion FROM dbo.__EFMigrationsHistory ORDER BY MigrationId;

IF (SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
    WHERE s.name IN (N'iam',N'institution',N'files',N'ops'))<>19
    THROW 51001, 'Expected exactly 19 M1 tables', 1;
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE is_not_trusted=1 OR is_disabled=1)
    THROW 51002, 'Untrusted or disabled foreign key', 1;
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE is_not_trusted=1 OR is_disabled=1)
    THROW 51003, 'Untrusted or disabled check constraint', 1;
IF (SELECT COUNT(*) FROM dbo.__EFMigrationsHistory)<>4
    THROW 51004, 'Expected four applied M1 migrations', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId=N'20261101053400_CancellationAndWithdrawalRights')
    THROW 51005, 'Cancellation and withdrawal-rights migration missing', 1;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Initiative_Cancellation' AND is_disabled=0 AND is_not_trusted=0)
    THROW 51006, 'Cancellation constraint missing or untrusted', 1;
