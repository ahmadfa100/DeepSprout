SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;   -- required by filtered indexes and JSON CHECKs (sqlcmd defaults to OFF; SSMS to ON)
SET ANSI_NULLS ON;
GO

-- PART 1 ---------------------------------------------------------------------------------------------
USE [master];
GO
IF DB_ID(N'DeepSprout_V5_Demo') IS NULL
BEGIN
    CREATE DATABASE [DeepSprout_V5_Demo] COLLATE Latin1_General_100_CI_AS_SC;
    PRINT N'Created database DeepSprout_V5_Demo.';
END
ELSE PRINT N'Database DeepSprout_V5_Demo already exists; it will not be dropped or overwritten.';
GO
USE [DeepSprout_V5_Demo];
GO
-- Safety guard: skip everything when the v5 schema is already installed, or when the database holds other user tables.
IF OBJECT_ID(N'iam.Person', N'U') IS NOT NULL
BEGIN
    PRINT N'v5 schema already installed in DeepSprout_V5_Demo: schema and demo-data parts are skipped (nothing is dropped).';
    SET NOEXEC ON;
END
ELSE IF EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped = 0)
BEGIN
    PRINT N'DeepSprout_V5_Demo contains other user tables: this script refuses to modify it. Use an empty database.';
    SET NOEXEC ON;
END
GO

-- PART 2 ---------------------------------------------------------------------------------------------
-- SCHEMA CREATION. SQL Server 2019+ ; all names are bracketed ; every FK is added after all tables exist.
