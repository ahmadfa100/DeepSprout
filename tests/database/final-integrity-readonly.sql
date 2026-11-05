SET NOCOUNT ON;
IF DB_NAME() <> N'DeepSprout_Validation' OR CONVERT(nvarchar(128),SERVERPROPERTY('ServerName')) <> N'DESKTOP-A4AL2KR'
    THROW 51000, 'Read-only integrity query targets only the authorized validation server/database', 1;
SELECT CONVERT(nvarchar(128),SERVERPROPERTY('ServerName')) AS ServerName,DB_NAME() AS DatabaseName,
       CONVERT(nvarchar(128),SERVERPROPERTY('ProductVersion')) AS ProductVersion;
SELECT s.name AS SchemaName,COUNT(*) AS TargetTables FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
  WHERE t.name<>N'__EFMigrationsHistory' GROUP BY s.name ORDER BY s.name;
SELECT (SELECT COUNT(*) FROM sys.tables WHERE name<>N'__EFMigrationsHistory') AS TargetTables,
       (SELECT COUNT(*) FROM dbo.__EFMigrationsHistory) AS AppliedMigrations,
       (SELECT COUNT(*) FROM sys.foreign_keys) AS ForeignKeys,
       (SELECT COUNT(*) FROM (SELECT fk.object_id FROM sys.foreign_keys fk JOIN sys.foreign_key_columns c ON c.constraint_object_id=fk.object_id GROUP BY fk.object_id HAVING COUNT(*)>1) q) AS CompositeForeignKeys,
       (SELECT COUNT(*) FROM sys.check_constraints) AS CheckConstraints,
       (SELECT COUNT(*) FROM sys.indexes WHERE is_unique=1 AND is_hypothetical=0 AND index_id>0) AS UniqueIndexes,
       (SELECT COUNT(*) FROM sys.columns WHERE system_type_id=189) AS RowVersionColumns,
       (SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) AS BadForeignKeys,
       (SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) AS BadChecks;
SELECT MigrationId FROM dbo.__EFMigrationsHistory ORDER BY MigrationId;
