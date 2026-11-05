using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TriggerCompatibleEfWrites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
