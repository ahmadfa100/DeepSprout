/* DeepSprout / Gate 0: Creates ONLY a new, isolated validation database if absent.
   Does NOT drop databases or alter CourseHubDB.
   Review the database name before executing. Run in SSMS as an authorized account.
*/
USE [master];
GO
SET NOCOUNT ON;
IF DB_ID(N'DeepSprout_Validation') IS NULL
BEGIN
    PRINT N'Creating isolated database DeepSprout_Validation';
    EXEC (N'CREATE DATABASE [DeepSprout_Validation]');
END
ELSE
BEGIN
    PRINT N'DeepSprout_Validation already exists: no changes made.';
END;
GO
SELECT name, state_desc, compatibility_level, is_read_committed_snapshot_on
FROM sys.databases
WHERE name = N'DeepSprout_Validation';
