/* DeepSprout / Gate 2: READ ONLY schema-contract smoke checks.
   Run ONLY after the CORRECTED first-slice EF Core migration is applied.
   NO INSERT/UPDATE/DELETE/DROP/ALTER/CREATE is performed.
   WARNING: this script checks a targeted subset, not all 19 tables' complete DDL.
*/
USE [DeepSprout_Validation];
GO
SET NOCOUNT ON;
IF DB_NAME() <> N'DeepSprout_Validation'
BEGIN
    THROW 51000, 'STOP: Select the isolated DeepSprout_Validation database.', 1;
END;

DECLARE @Expected TABLE (SchemaName sysname NOT NULL, TableName sysname NOT NULL, PRIMARY KEY (SchemaName, TableName));
INSERT @Expected (SchemaName, TableName) VALUES
(N'files',N'SecureFile'),
(N'iam',N'ConsentRecord'), (N'iam',N'GlobalGrant'), (N'iam',N'OtpChallenge'),
(N'iam',N'PasswordCredential'), (N'iam',N'Person'), (N'iam',N'PersonEmail'),
(N'institution',N'Initiative'), (N'institution',N'InitiativeDraft'),
(N'institution',N'InitiativeApplication'), (N'institution',N'InitiativeApplicationDecision'),
(N'institution',N'InitiativeMembership'), (N'institution',N'InitiativeRevision'),
(N'institution',N'InitiativeStaffAppointment'), (N'institution',N'InitiativeStaffInvitation'),
(N'institution',N'Institution'), (N'institution',N'InstitutionVerificationCase'),
(N'institution',N'RepresentativeMembership'), (N'ops',N'AuditEvent');

DECLARE @Results TABLE (TestId nvarchar(80), Result nvarchar(10), Detail nvarchar(300));
INSERT @Results
SELECT N'TABLE:'+e.SchemaName+N'.'+e.TableName,
       CASE WHEN t.object_id IS NULL THEN N'FAIL' ELSE N'PASS' END,
       CASE WHEN t.object_id IS NULL THEN N'Missing table' ELSE N'Table exists' END
FROM @Expected e
LEFT JOIN sys.schemas s ON s.name=e.SchemaName
LEFT JOIN sys.tables t ON t.schema_id=s.schema_id AND t.name=e.TableName;

DECLARE @RequiredColumns TABLE (SchemaName sysname, TableName sysname, ColumnName sysname);
INSERT @RequiredColumns VALUES
(N'iam',N'PersonEmail',N'VerifiedAtUtc'),
(N'iam',N'OtpChallenge',N'ExpiresAtUtc'),
(N'iam',N'GlobalGrant',N'RevokedAtUtc'),
(N'iam',N'ConsentRecord',N'DecidedAtUtc'),
(N'institution',N'RepresentativeMembership',N'RevokedAtUtc'),
(N'institution',N'Initiative',N'StartsAtUtc'),
(N'institution',N'Initiative',N'EndsAtUtc'),
(N'institution',N'InitiativeApplication',N'SubmittedAtUtc'),
(N'institution',N'InitiativeMembership',N'EndedAtUtc'),
(N'institution',N'InitiativeStaffInvitation',N'ExpiresAtUtc'),
(N'ops',N'AuditEvent',N'AtUtc'),
(N'institution',N'InitiativeApplicationDecision',N'AtUtc'),
(N'institution',N'InitiativeDraft',N'Stage1Json'),
(N'institution',N'InitiativeDraft',N'Stage2Json'),
(N'institution',N'InitiativeDraft',N'Stage3Json'),
(N'institution',N'InitiativeDraft',N'Stage4Json'),
(N'institution',N'InitiativeDraft',N'Stage5Json'),
(N'institution',N'InitiativeDraft',N'Stage6Json'),
(N'institution',N'InitiativeDraft',N'RowVersion'),
(N'institution',N'InitiativeMembership',N'CapacityReleasedAtUtc'),
(N'institution',N'InitiativeMembership',N'WithdrawalCutoffAtUtc');

INSERT @Results
SELECT N'COLUMN:'+c.SchemaName+N'.'+c.TableName+N'.'+c.ColumnName,
       CASE WHEN sc.column_id IS NULL THEN N'FAIL' ELSE N'PASS' END,
       CASE WHEN sc.column_id IS NULL THEN N'Missing column' ELSE N'Column exists' END
FROM @RequiredColumns c
LEFT JOIN sys.schemas ss ON ss.name=c.SchemaName
LEFT JOIN sys.tables st ON st.schema_id=ss.schema_id AND st.name=c.TableName
LEFT JOIN sys.columns sc ON sc.object_id=st.object_id AND sc.name=c.ColumnName;

INSERT @Results
SELECT N'INDEX:OneActiveInitiativeMembership',
       CASE WHEN EXISTS (
        SELECT 1
        FROM sys.indexes i
        JOIN sys.tables t ON t.object_id=i.object_id
        JOIN sys.schemas s ON s.schema_id=t.schema_id
        JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
        JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
        WHERE s.name=N'institution' AND t.name=N'InitiativeMembership'
          AND i.is_unique=1 AND i.has_filter=1 AND c.name=N'PersonId' AND ic.key_ordinal=1
          AND i.filter_definition LIKE N'%Accepted%'
          AND i.filter_definition LIKE N'%Suspended%'
          AND NOT EXISTS (
            SELECT 1 FROM sys.index_columns ic2
            WHERE ic2.object_id=i.object_id AND ic2.index_id=i.index_id AND ic2.key_ordinal>1)
       ) THEN N'PASS' ELSE N'FAIL' END,
       N'Unique filtered PersonId index for Accepted/Suspended (structural heuristic)';

DECLARE @FKDetails TABLE (ParentSchema sysname, ParentTable sysname, RefSchema sysname, RefTable sysname, LocalColumns nvarchar(max), RemoteColumns nvarchar(max));
;WITH fk_columns AS (
 SELECT fk.object_id, fk.name AS FKName, ps.name AS ParentSchema, pt.name AS ParentTable,
        rs.name AS RefSchema, rt.name AS RefTable,
        STRING_AGG(CONVERT(nvarchar(max),pc.name),N',') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS LocalColumns,
        STRING_AGG(CONVERT(nvarchar(max),rc.name),N',') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS RemoteColumns
 FROM sys.foreign_keys fk
 JOIN sys.tables pt ON pt.object_id=fk.parent_object_id
 JOIN sys.schemas ps ON ps.schema_id=pt.schema_id
 JOIN sys.tables rt ON rt.object_id=fk.referenced_object_id
 JOIN sys.schemas rs ON rs.schema_id=rt.schema_id
 JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
 JOIN sys.columns pc ON pc.object_id=fkc.parent_object_id AND pc.column_id=fkc.parent_column_id
 JOIN sys.columns rc ON rc.object_id=fkc.referenced_object_id AND rc.column_id=fkc.referenced_column_id
 GROUP BY fk.object_id,fk.name,ps.name,pt.name,rs.name,rt.name
)
INSERT @FKDetails (ParentSchema,ParentTable,RefSchema,RefTable,LocalColumns,RemoteColumns)
SELECT ParentSchema,ParentTable,RefSchema,RefTable,LocalColumns,RemoteColumns FROM fk_columns;

INSERT @Results
SELECT N'FK:MembershipMatchesApplicationPersonAndInitiative',
       CASE WHEN EXISTS(SELECT 1 FROM @FKDetails WHERE ParentSchema=N'institution' AND ParentTable=N'InitiativeMembership'
          AND RefSchema=N'institution' AND RefTable=N'InitiativeApplication'
          AND LocalColumns=N'ApplicationId,InitiativeId,PersonId'
          AND RemoteColumns=N'Id,InitiativeId,PersonId') THEN N'PASS' ELSE N'FAIL' END,
       N'Composite FK must prove application, initiative and person match';

INSERT @Results
SELECT N'FK:DecisionMatchesApplicationTermsRevision',
       CASE WHEN EXISTS(SELECT 1 FROM @FKDetails WHERE ParentSchema=N'institution' AND ParentTable=N'InitiativeApplicationDecision'
          AND RefSchema=N'institution' AND RefTable=N'InitiativeApplication'
          AND LocalColumns=N'ApplicationId,InitiativeId,TermsRevisionId'
          AND RemoteColumns=N'Id,InitiativeId,TermsRevisionId') THEN N'PASS' ELSE N'FAIL' END,
       N'Composite FK must match decision with application pinned terms';

SELECT TestId,Result,Detail FROM @Results ORDER BY CASE Result WHEN N'FAIL' THEN 0 ELSE 1 END,TestId;
SELECT Result,COUNT(*) AS TestCount FROM @Results GROUP BY Result;
SELECT COUNT(*) AS ExistingUserTables FROM sys.tables WHERE is_ms_shipped=0;
IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NOT NULL
BEGIN
    SELECT MigrationId, ProductVersion FROM dbo.__EFMigrationsHistory ORDER BY MigrationId;
END
ELSE
BEGIN
    SELECT N'No dbo.__EFMigrationsHistory table detected' AS MigrationHistoryStatus;
END;
-- Note: passing this smoke check is NOT full DB sign-off; negative/concurrency tests are still mandatory.
