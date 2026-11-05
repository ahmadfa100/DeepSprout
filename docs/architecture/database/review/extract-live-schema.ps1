param(
    [string]$Server = 'DESKTOP-A4AL2KR',
    [string]$Database = 'DeepSprout_Validation',
    [string]$Output = (Join-Path $PSScriptRoot 'live-schema.json')
)

$ErrorActionPreference = 'Stop'
$connectionString = "Server=$Server;Database=$Database;Integrated Security=True;Encrypt=False;TrustServerCertificate=True;Application Name=DeepSproutReadOnlyCatalogReview"
$connection = [System.Data.SqlClient.SqlConnection]::new($connectionString)
$connection.Open()
try {
    function Read-Rows([string]$sql) {
        $command = $connection.CreateCommand()
        $command.CommandText = "SET NOCOUNT ON; $sql"
        $command.CommandTimeout = 120
        $reader = $command.ExecuteReader()
        $rows = [System.Collections.Generic.List[object]]::new()
        try {
            while ($reader.Read()) {
                $row = [ordered]@{}
                for ($i = 0; $i -lt $reader.FieldCount; $i++) {
                    $value = $reader.GetValue($i)
                    $row[$reader.GetName($i)] = if ($value -is [DBNull]) { $null } else { $value }
                }
                $rows.Add($row)
            }
        } finally { $reader.Close(); $command.Dispose() }
        return ,$rows.ToArray()
    }

    $result = [ordered]@{
        captured_at_utc = [DateTime]::UtcNow.ToString('o')
        server = Read-Rows 'SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName, CONVERT(nvarchar(128),SERVERPROPERTY(''ProductVersion'')) AS ProductVersion, CONVERT(nvarchar(128),SERVERPROPERTY(''Edition'')) AS Edition'
        tables = Read-Rows 'SELECT s.name AS SchemaName,t.name AS TableName,t.object_id AS ObjectId,t.create_date AS CreatedAt,t.modify_date AS ModifiedAt FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE t.is_ms_shipped=0 ORDER BY s.name,t.name'
        columns = Read-Rows @'
SELECT s.name AS SchemaName,t.name AS TableName,c.column_id AS Ordinal,c.name AS ColumnName,
  ty.name AS TypeName,c.max_length AS MaxLength,c.precision AS PrecisionValue,c.scale AS ScaleValue,
  c.is_nullable AS IsNullable,c.is_identity AS IsIdentity,c.is_computed AS IsComputed,
  c.is_rowguidcol AS IsRowGuidCol,dc.definition AS DefaultDefinition,cc.definition AS ComputedDefinition
FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id
JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id
LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id
LEFT JOIN sys.computed_columns cc ON cc.object_id=c.object_id AND cc.column_id=c.column_id
WHERE t.is_ms_shipped=0 ORDER BY s.name,t.name,c.column_id
'@
        key_columns = Read-Rows @'
SELECT s.name AS SchemaName,t.name AS TableName,kc.name AS ConstraintName,kc.type AS ConstraintType,
  ic.key_ordinal AS KeyOrdinal,c.name AS ColumnName
FROM sys.key_constraints kc JOIN sys.tables t ON t.object_id=kc.parent_object_id
JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.index_columns ic ON ic.object_id=t.object_id AND ic.index_id=kc.unique_index_id AND ic.key_ordinal>0
JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
WHERE t.is_ms_shipped=0 ORDER BY s.name,t.name,kc.name,ic.key_ordinal
'@
        foreign_key_columns = Read-Rows @'
SELECT ps.name AS FromSchema,pt.name AS FromTable,fk.name AS ForeignKeyName,
  fkc.constraint_column_id AS Ordinal,pc.name AS FromColumn,rs.name AS ToSchema,rt.name AS ToTable,rc.name AS ToColumn,
  fk.delete_referential_action_desc AS OnDelete,fk.update_referential_action_desc AS OnUpdate,
  fk.is_disabled AS IsDisabled,fk.is_not_trusted AS IsNotTrusted
FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
JOIN sys.tables pt ON pt.object_id=fk.parent_object_id JOIN sys.schemas ps ON ps.schema_id=pt.schema_id
JOIN sys.columns pc ON pc.object_id=pt.object_id AND pc.column_id=fkc.parent_column_id
JOIN sys.tables rt ON rt.object_id=fk.referenced_object_id JOIN sys.schemas rs ON rs.schema_id=rt.schema_id
JOIN sys.columns rc ON rc.object_id=rt.object_id AND rc.column_id=fkc.referenced_column_id
WHERE pt.is_ms_shipped=0 ORDER BY ps.name,pt.name,fk.name,fkc.constraint_column_id
'@
        indexes = Read-Rows @'
SELECT s.name AS SchemaName,t.name AS TableName,i.name AS IndexName,i.is_unique AS IsUnique,
  i.is_primary_key AS IsPrimaryKey,i.is_unique_constraint AS IsUniqueConstraint,i.has_filter AS HasFilter,
  i.filter_definition AS FilterDefinition,i.type_desc AS IndexType,ic.key_ordinal AS KeyOrdinal,
  ic.is_included_column AS IsIncludedColumn,c.name AS ColumnName
FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id JOIN sys.schemas s ON s.schema_id=t.schema_id
LEFT JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
LEFT JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
WHERE t.is_ms_shipped=0 AND i.name IS NOT NULL ORDER BY s.name,t.name,i.name,ic.key_ordinal,c.name
'@
        checks = Read-Rows @'
SELECT s.name AS SchemaName,t.name AS TableName,ck.name AS CheckName,ck.definition AS Definition,
  ck.is_disabled AS IsDisabled,ck.is_not_trusted AS IsNotTrusted
FROM sys.check_constraints ck JOIN sys.tables t ON t.object_id=ck.parent_object_id JOIN sys.schemas s ON s.schema_id=t.schema_id
WHERE t.is_ms_shipped=0 ORDER BY s.name,t.name,ck.name
'@
        triggers = Read-Rows @'
SELECT s.name AS SchemaName,t.name AS TableName,tr.name AS TriggerName,tr.is_disabled AS IsDisabled,
  sm.definition AS Definition
FROM sys.triggers tr JOIN sys.tables t ON t.object_id=tr.parent_id JOIN sys.schemas s ON s.schema_id=t.schema_id
LEFT JOIN sys.sql_modules sm ON sm.object_id=tr.object_id
WHERE t.is_ms_shipped=0 ORDER BY s.name,t.name,tr.name
'@
        migrations = Read-Rows 'SELECT MigrationId,ProductVersion FROM dbo.__EFMigrationsHistory ORDER BY MigrationId'
    }
    $json = ConvertTo-Json -InputObject $result -Depth 12 -Compress
    [System.IO.File]::WriteAllText($Output,$json,[System.Text.UTF8Encoding]::new($false))
    Write-Output "Exported catalog metadata to $Output"
} finally { $connection.Dispose() }
