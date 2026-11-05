
-- End of install parts. Re-enable execution (it was only switched off if the schema already existed).
SET NOEXEC OFF;
GO
PRINT N'DeepSprout_V5_Demo ready.';
SELECT (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0)            AS [Tables],
       (SELECT COUNT(*) FROM sys.schemas s WHERE EXISTS (SELECT 1 FROM sys.tables t WHERE t.schema_id = s.schema_id)) AS [Schemas],
       (SELECT COUNT(*) FROM sys.foreign_keys)                              AS [ForeignKeys],
       (SELECT COUNT(*) FROM sys.indexes WHERE is_unique = 1 AND has_filter = 1) AS [FilteredUniqueIndexes],
       (SELECT COUNT(*) FROM sys.check_constraints)                         AS [CheckConstraints],
       (SELECT COUNT(*) FROM sys.triggers)                                  AS [Triggers];
GO
