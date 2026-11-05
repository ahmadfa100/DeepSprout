using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PartnershipLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "partnership");

            migrationBuilder.CreateTable(
                name: "ExperienceLink",
                schema: "partnership",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    RequestedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    AcceptedByPersonId = table.Column<long>(type: "bigint", nullable: true),
                    ScopeVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperienceLink", x => x.Id);
                    table.CheckConstraint("CK_ExperienceLink_AcceptedBy", "[Status] NOT IN (N'Accepted',N'Active') OR [AcceptedByPersonId] IS NOT NULL");
                    table.CheckConstraint("CK_ExperienceLink_Status", "[Status] IN (N'Requested',N'Accepted',N'Active',N'Declined',N'Ended')");
                    table.ForeignKey(
                        name: "FK_ExperienceLink_Experience_ExperienceId",
                        column: x => x.ExperienceId,
                        principalSchema: "provider",
                        principalTable: "Experience",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ExperienceLink_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ExperienceLink_Person_AcceptedByPersonId",
                        column: x => x.AcceptedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ExperienceLink_Person_RequestedByPersonId",
                        column: x => x.RequestedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProgramLink",
                schema: "partnership",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    ProgramId = table.Column<long>(type: "bigint", nullable: false),
                    RequestedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    AcceptedByPersonId = table.Column<long>(type: "bigint", nullable: true),
                    ScopeVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgramLink", x => x.Id);
                    table.CheckConstraint("CK_ProgramLink_AcceptedBy", "[Status] NOT IN (N'Accepted',N'Active') OR [AcceptedByPersonId] IS NOT NULL");
                    table.CheckConstraint("CK_ProgramLink_Status", "[Status] IN (N'Requested',N'Accepted',N'Active',N'Declined',N'Ended')");
                    table.ForeignKey(
                        name: "FK_ProgramLink_CoachProgram_ProgramId",
                        column: x => x.ProgramId,
                        principalSchema: "coach",
                        principalTable: "CoachProgram",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProgramLink_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProgramLink_Person_AcceptedByPersonId",
                        column: x => x.AcceptedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProgramLink_Person_RequestedByPersonId",
                        column: x => x.RequestedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceLink_AcceptedByPersonId",
                schema: "partnership",
                table: "ExperienceLink",
                column: "AcceptedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceLink_ExperienceId",
                schema: "partnership",
                table: "ExperienceLink",
                column: "ExperienceId");

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceLink_InitiativeId_ExperienceId",
                schema: "partnership",
                table: "ExperienceLink",
                columns: new[] { "InitiativeId", "ExperienceId" },
                unique: true,
                filter: "[Status] IN (N'Requested',N'Accepted',N'Active')");

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceLink_PublicId",
                schema: "partnership",
                table: "ExperienceLink",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceLink_RequestedByPersonId",
                schema: "partnership",
                table: "ExperienceLink",
                column: "RequestedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramLink_AcceptedByPersonId",
                schema: "partnership",
                table: "ProgramLink",
                column: "AcceptedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramLink_InitiativeId_ProgramId",
                schema: "partnership",
                table: "ProgramLink",
                columns: new[] { "InitiativeId", "ProgramId" },
                unique: true,
                filter: "[Status] IN (N'Requested',N'Accepted',N'Active')");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramLink_ProgramId",
                schema: "partnership",
                table: "ProgramLink",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramLink_PublicId",
                schema: "partnership",
                table: "ProgramLink",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgramLink_RequestedByPersonId",
                schema: "partnership",
                table: "ProgramLink",
                column: "RequestedByPersonId");

            foreach (var batch in ModuleSql.Batches("PartnershipGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExperienceLink",
                schema: "partnership");

            migrationBuilder.DropTable(
                name: "ProgramLink",
                schema: "partnership");
        }
    }
}
