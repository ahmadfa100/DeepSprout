using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CoachFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "coach");

            migrationBuilder.CreateTable(
                name: "CoachApproval",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    EvidenceFileId = table.Column<long>(type: "bigint", nullable: true),
                    DecidedByPersonId = table.Column<long>(type: "bigint", nullable: true),
                    DecisionReason = table.Column<string>(type: "nvarchar(800)", maxLength: 800, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoachApproval", x => x.Id);
                    table.CheckConstraint("CK_CoachApproval_Status", "[Status] IN (N'Submitted',N'MoreInfo',N'Approved',N'Suspended',N'Rejected')");
                    table.ForeignKey(
                        name: "FK_CoachApproval_Person_DecidedByPersonId",
                        column: x => x.DecidedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CoachApproval_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CoachApproval_SecureFile_EvidenceFileId",
                        column: x => x.EvidenceFileId,
                        principalSchema: "files",
                        principalTable: "SecureFile",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CoachProgram",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    OwnerPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoachProgram", x => x.Id);
                    table.CheckConstraint("CK_CoachProgram_Status", "[Status] IN (N'Draft',N'Published',N'Paused',N'Completed',N'Archived')");
                    table.ForeignKey(
                        name: "FK_CoachProgram_Person_OwnerPersonId",
                        column: x => x.OwnerPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OperationalGroup",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: true),
                    ProgramId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationalGroup", x => x.Id);
                    table.CheckConstraint("CK_OperationalGroup_Parent", "([InitiativeId] IS NULL AND [ProgramId] IS NOT NULL) OR ([InitiativeId] IS NOT NULL AND [ProgramId] IS NULL)");
                    table.CheckConstraint("CK_OperationalGroup_Status", "[Status] IN (N'Open',N'Closed',N'Archived')");
                    table.ForeignKey(
                        name: "FK_OperationalGroup_CoachProgram_ProgramId",
                        column: x => x.ProgramId,
                        principalSchema: "coach",
                        principalTable: "CoachProgram",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OperationalGroup_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProgramRevision",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProgramId = table.Column<long>(type: "bigint", nullable: false),
                    RevisionNo = table.Column<int>(type: "int", nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(1200)", maxLength: 1200, nullable: false),
                    RuleRef = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgramRevision", x => x.Id);
                    table.UniqueConstraint("AK_ProgramRevision_Id_ProgramId", x => new { x.Id, x.ProgramId });
                    table.CheckConstraint("CK_ProgramRevision_No", "[RevisionNo]>0");
                    table.ForeignKey(
                        name: "FK_ProgramRevision_CoachProgram_ProgramId",
                        column: x => x.ProgramId,
                        principalSchema: "coach",
                        principalTable: "CoachProgram",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProgramStage",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProgramRevisionId = table.Column<long>(type: "bigint", nullable: false),
                    StageNo = table.Column<short>(type: "smallint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    EndsAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgramStage", x => x.Id);
                    table.CheckConstraint("CK_ProgramStage_No", "[StageNo]>0");
                    table.CheckConstraint("CK_ProgramStage_Times", "[EndsAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [EndsAtUtc]>[StartsAtUtc])");
                    table.ForeignKey(
                        name: "FK_ProgramStage_ProgramRevision_ProgramRevisionId",
                        column: x => x.ProgramRevisionId,
                        principalSchema: "coach",
                        principalTable: "ProgramRevision",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CoachApproval_DecidedByPersonId",
                schema: "coach",
                table: "CoachApproval",
                column: "DecidedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_CoachApproval_EvidenceFileId",
                schema: "coach",
                table: "CoachApproval",
                column: "EvidenceFileId");

            migrationBuilder.CreateIndex(
                name: "IX_CoachApproval_PersonId_Status",
                schema: "coach",
                table: "CoachApproval",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CoachProgram_OwnerPersonId_Status",
                schema: "coach",
                table: "CoachProgram",
                columns: new[] { "OwnerPersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CoachProgram_PublicId",
                schema: "coach",
                table: "CoachProgram",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OperationalGroup_Id_InitiativeId",
                schema: "coach",
                table: "OperationalGroup",
                columns: new[] { "Id", "InitiativeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OperationalGroup_Id_ProgramId",
                schema: "coach",
                table: "OperationalGroup",
                columns: new[] { "Id", "ProgramId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OperationalGroup_InitiativeId",
                schema: "coach",
                table: "OperationalGroup",
                column: "InitiativeId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalGroup_ProgramId",
                schema: "coach",
                table: "OperationalGroup",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationalGroup_PublicId",
                schema: "coach",
                table: "OperationalGroup",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgramRevision_ProgramId_RevisionNo",
                schema: "coach",
                table: "ProgramRevision",
                columns: new[] { "ProgramId", "RevisionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgramStage_ProgramRevisionId_StageNo",
                schema: "coach",
                table: "ProgramStage",
                columns: new[] { "ProgramRevisionId", "StageNo" },
                unique: true);

            foreach (var batch in ModuleSql.Batches("CoachFoundationGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CoachApproval",
                schema: "coach");

            migrationBuilder.DropTable(
                name: "OperationalGroup",
                schema: "coach");

            migrationBuilder.DropTable(
                name: "ProgramStage",
                schema: "coach");

            migrationBuilder.DropTable(
                name: "ProgramRevision",
                schema: "coach");

            migrationBuilder.DropTable(
                name: "CoachProgram",
                schema: "coach");
        }
    }
}
