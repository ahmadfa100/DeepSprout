using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdmissionDenialAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'M1 migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.Sql(global::DeepSprout.Infrastructure.M1Sql.ApprovalWithDeniedAudit());
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("Admission denial audit is required; downgrade requires a reviewed migration.");
        }
    }
}
