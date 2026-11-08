using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.V5.Migrations
{
    /// <summary>
    /// Baseline of the approved 58-table design (v5-lean-1). Up runs the approved DDL unchanged
    /// (V5/Sql/V5Baseline.sql), so a new database is identical to one built by DeepSprout-v5-FULL-Database.sql.
    /// An existing v5 database (DeepSprout_V5_Demo) is not migrated by this step: it is adopted by recording this
    /// migration as applied with docs/architecture/database/v5-lean-design/submission/adopt-v5-baseline.sql,
    /// after that script has verified the schema.
    /// </summary>
    public partial class V5Baseline : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(V5Sql.RefuseHistoricalM1Database);
            migrationBuilder.Sql("IF OBJECT_ID(N'iam.Person', N'U') IS NOT NULL OR EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped = 0 AND name NOT IN (N'__EFMigrationsHistory', N'sysdiagrams')) THROW 51101, 'V5Baseline creates the schema only in an empty database. Adopt an existing v5 database with adopt-v5-baseline.sql instead.', 1;");
            foreach (var batch in V5Sql.Batches("V5Baseline.sql"))
            {
                migrationBuilder.Sql(batch);
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rolling back the baseline would drop all 58 tables and their history. Restore from a backup instead.
            migrationBuilder.Sql("THROW 51102, 'V5Baseline cannot be rolled back by a migration. Restore the database from a verified backup.', 1;");
        }
    }
}
