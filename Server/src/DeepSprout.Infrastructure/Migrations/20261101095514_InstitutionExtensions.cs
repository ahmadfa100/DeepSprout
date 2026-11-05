using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InstitutionExtensions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.CreateTable(
                name: "InitiativeContent",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    ContentReleaseId = table.Column<long>(type: "bigint", nullable: false),
                    SortOrder = table.Column<short>(type: "smallint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeContent", x => x.Id);
                    table.CheckConstraint("CK_InitiativeContent_Order", "[SortOrder]>0");
                    table.CheckConstraint("CK_InitiativeContent_Status", "[Status] IN (N'Draft',N'Published',N'Removed')");
                    table.ForeignKey(
                        name: "FK_InitiativeContent_ContentRelease_ContentReleaseId",
                        column: x => x.ContentReleaseId,
                        principalSchema: "governance",
                        principalTable: "ContentRelease",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InitiativeContent_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeSeatOffer",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    ApplicationId = table.Column<long>(type: "bigint", nullable: false),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    OfferedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    DecisionAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeSeatOffer", x => x.Id);
                    table.UniqueConstraint("AK_InitiativeSeatOffer_Id_InitiativeId", x => new { x.Id, x.InitiativeId });
                    table.CheckConstraint("CK_InitiativeSeatOffer_Status", "[Status] IN (N'Offered',N'Accepted',N'Declined',N'Expired',N'Cancelled')");
                    table.CheckConstraint("CK_InitiativeSeatOffer_Times", "[ExpiresAtUtc]>[OfferedAtUtc]");
                    table.ForeignKey(
                        name: "FK_InitiativeSeatOffer_InitiativeApplication_ApplicationId_InitiativeId",
                        columns: x => new { x.ApplicationId, x.InitiativeId },
                        principalSchema: "institution",
                        principalTable: "InitiativeApplication",
                        principalColumns: new[] { "Id", "InitiativeId" });
                });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeContent_ContentReleaseId",
                schema: "institution",
                table: "InitiativeContent",
                column: "ContentReleaseId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeContent_InitiativeId_SortOrder_ContentReleaseId",
                schema: "institution",
                table: "InitiativeContent",
                columns: new[] { "InitiativeId", "SortOrder", "ContentReleaseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeContent_InitiativeId_Status",
                schema: "institution",
                table: "InitiativeContent",
                columns: new[] { "InitiativeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeSeatOffer_ApplicationId",
                schema: "institution",
                table: "InitiativeSeatOffer",
                column: "ApplicationId",
                unique: true,
                filter: "[Status]=N'Offered'");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeSeatOffer_ApplicationId_InitiativeId",
                schema: "institution",
                table: "InitiativeSeatOffer",
                columns: new[] { "ApplicationId", "InitiativeId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeSeatOffer_InitiativeId_Status_ExpiresAtUtc",
                schema: "institution",
                table: "InitiativeSeatOffer",
                columns: new[] { "InitiativeId", "Status", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeSeatOffer_PublicId",
                schema: "institution",
                table: "InitiativeSeatOffer",
                column: "PublicId",
                unique: true);

            foreach (var batch in ModuleSql.Batches("InstitutionExtensionsGuards.sql")) migrationBuilder.Sql(batch);
            foreach (var batch in ModuleSql.Batches("M1ApprovalV3.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InitiativeContent",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "InitiativeSeatOffer",
                schema: "institution");
        }
    }
}
