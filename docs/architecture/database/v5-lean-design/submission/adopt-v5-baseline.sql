/* Adopt an existing v5-lean-1 database (for example DeepSprout_V5_Demo, built from the hand-written script)
   into EF Core migrations, without changing any table or row.

   1. Run this script in the database to adopt (it never runs against DeepSprout_Validation).
   2. It verifies that the schema is exactly the approved v5-lean-1 schema (fingerprint of every column,
      CHECK, foreign key and index). On any difference it stops and records nothing.
   3. On a match it records migration 20261108112907_V5Baseline as applied.
   4. Then apply the remaining V5 migrations, after a verified backup:
        set DEEPSPROUT_V5_CONNECTION=<connection string of this database>
        dotnet ef database update --context DeepSproutV5DbContext --project src/DeepSprout.Infrastructure --startup-project src/DeepSprout.Infrastructure
   Rolling back the adoption = deleting the one history row this script inserted. */
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() = N'DeepSprout_Validation' OR OBJECT_ID(N'iam.PersonEmail', N'U') IS NOT NULL
    THROW 51200, 'This is the historical 129-table M1 database. It is not adopted into the V5 migrations.', 1;
DECLARE @adopted bit = 0;
IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NOT NULL
    EXEC sys.sp_executesql N'SELECT @d = CASE WHEN EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N''20261108112907_V5Baseline'') THEN 1 ELSE 0 END', N'@d bit OUTPUT', @d = @adopted OUTPUT;
IF @adopted = 1
BEGIN
    PRINT N'Already adopted: V5Baseline is recorded. Nothing to do.';
    RETURN;
END;

DECLARE @shape nvarchar(max) =
(
    SELECT STRING_AGG(CONVERT(nvarchar(max), x.item), N'|') WITHIN GROUP (ORDER BY x.item)
    FROM (
        SELECT N'C:' + s.name + N'.' + t.name + N'.' + c.name + N':' + ty.name + N':' + CONVERT(nvarchar(10), c.max_length) + N':' + CONVERT(nvarchar(10), c.precision) + N':' + CONVERT(nvarchar(10), c.scale) + N':' + CONVERT(nvarchar(1), c.is_nullable) AS item
        FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id JOIN sys.schemas s ON s.schema_id = t.schema_id JOIN sys.types ty ON ty.user_type_id = c.user_type_id
        WHERE t.is_ms_shipped = 0 AND t.name NOT IN (N'__EFMigrationsHistory', N'sysdiagrams')
        UNION ALL
        SELECT N'K:' + OBJECT_SCHEMA_NAME(k.parent_object_id) + N'.' + k.name + N':' + REPLACE(REPLACE(k.definition, N' ', N''), NCHAR(13) + NCHAR(10), N'')
        FROM sys.check_constraints k
        UNION ALL
        SELECT N'F:' + OBJECT_SCHEMA_NAME(f.parent_object_id) + N'.' + f.name + N':' + OBJECT_SCHEMA_NAME(f.referenced_object_id) + N'.' + OBJECT_NAME(f.referenced_object_id)
        FROM sys.foreign_keys f
        UNION ALL
        SELECT N'I:' + OBJECT_SCHEMA_NAME(i.object_id) + N'.' + i.name + N':' + CONVERT(nvarchar(1), i.is_unique) + N':' + ISNULL(REPLACE(i.filter_definition, N' ', N''), N'')
        FROM sys.indexes i JOIN sys.tables t ON t.object_id = i.object_id
        WHERE i.name IS NOT NULL AND t.is_ms_shipped = 0 AND t.name NOT IN (N'__EFMigrationsHistory', N'sysdiagrams')
    ) AS x
);
DECLARE @fingerprint varbinary(32) = HASHBYTES('SHA2_256', @shape);
DECLARE @expected varbinary(32) = 0x4E7EA1C78201945D95F7FE1C5FFF06AB89BAD15634DC30352C8DA007C5394DE4;
IF @fingerprint IS NULL OR @fingerprint <> @expected
BEGIN
    DECLARE @msg nvarchar(400) = CONCAT(N'Schema is not the approved v5-lean-1 schema (fingerprint ', CONVERT(nvarchar(80), @fingerprint, 1), N'). Nothing was recorded.');
    THROW 51201, @msg, 1;
END;

BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NULL
    CREATE TABLE dbo.__EFMigrationsHistory (MigrationId nvarchar(150) NOT NULL CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY, ProductVersion nvarchar(32) NOT NULL);
INSERT dbo.__EFMigrationsHistory (MigrationId, ProductVersion) VALUES (N'20261108112907_V5Baseline', N'10.0.0');
COMMIT;
PRINT N'Adopted: V5Baseline recorded as applied. Apply the later V5 migrations with dotnet ef database update after a verified backup.';
