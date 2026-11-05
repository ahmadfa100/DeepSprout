/* DeepSprout / Gate 0: READ ONLY. Run in SSMS on your SQL Server.
   Does not create, modify, or drop databases. Safe on master or CourseHubDB.
*/
SET NOCOUNT ON;
SELECT
    @@SERVERNAME AS ServerName,
    CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(128)) AS ProductVersion,
    CAST(SERVERPROPERTY('ProductLevel') AS nvarchar(128)) AS ProductLevel,
    CAST(SERVERPROPERTY('Edition') AS nvarchar(128)) AS Edition,
    CAST(SERVERPROPERTY('EngineEdition') AS int) AS EngineEdition,
    DB_NAME() AS CurrentDatabase,
    ORIGINAL_LOGIN() AS OriginalLogin,
    SYSDATETIMEOFFSET() AS ServerClockWithOffset,
    SYSUTCDATETIME() AS ServerUtcClock;

SELECT
    name AS DatabaseName,
    state_desc AS DatabaseState,
    compatibility_level AS CompatibilityLevel,
    is_read_committed_snapshot_on AS ReadCommittedSnapshotOn,
    snapshot_isolation_state_desc AS SnapshotIsolationState,
    recovery_model_desc AS RecoveryModel
FROM sys.databases
WHERE name IN (N'master', N'CourseHubDB', N'DeepSprout_Validation', N'DeepSprout_Dev')
ORDER BY name;

SELECT
    CAST(HAS_PERMS_BY_NAME(NULL, 'SERVER', 'CREATE ANY DATABASE') AS int) AS CanCreateAnyDatabase,
    CAST(IS_SRVROLEMEMBER('dbcreator') AS int) AS IsDbCreator,
    CAST(IS_SRVROLEMEMBER('sysadmin') AS int) AS IsSysadmin;
