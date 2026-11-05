using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class LabAndIndividualProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "lab");

            migrationBuilder.EnsureSchema(
                name: "personal");

            migrationBuilder.CreateTable(
                name: "AssessmentInstrument",
                schema: "lab",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssessmentInstrument", x => x.Id);
                    table.CheckConstraint("CK_AssessmentInstrument_Status", "[Status] IN (N'Draft',N'Published',N'Retired')");
                });

            migrationBuilder.CreateTable(
                name: "AssessmentWindow",
                schema: "lab",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    WindowKey = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PolicyVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    OpensAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ClosesAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssessmentWindow", x => x.Id);
                    table.UniqueConstraint("AK_AssessmentWindow_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_AssessmentWindow_Interval", "[ClosesAtUtc]>[OpensAtUtc]");
                    table.CheckConstraint("CK_AssessmentWindow_Status", "[Status] IN (N'Open',N'Closed',N'Used')");
                    table.ForeignKey(
                        name: "FK_AssessmentWindow_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InstrumentVersion",
                schema: "lab",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InstrumentId = table.Column<long>(type: "bigint", nullable: false),
                    VersionNo = table.Column<int>(type: "int", nullable: false),
                    ContentRef = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    ScoringVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ProtocolVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ComparabilityGroup = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstrumentVersion", x => x.Id);
                    table.UniqueConstraint("AK_InstrumentVersion_Id_InstrumentId", x => new { x.Id, x.InstrumentId });
                    table.CheckConstraint("CK_InstrumentVersion_No", "[VersionNo]>0");
                    table.ForeignKey(
                        name: "FK_InstrumentVersion_AssessmentInstrument_InstrumentId",
                        column: x => x.InstrumentId,
                        principalSchema: "lab",
                        principalTable: "AssessmentInstrument",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AssessmentAttempt",
                schema: "lab",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    InstrumentId = table.Column<long>(type: "bigint", nullable: false),
                    InstrumentVersionId = table.Column<long>(type: "bigint", nullable: false),
                    WindowId = table.Column<long>(type: "bigint", nullable: true),
                    Kind = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    FinishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    ValidityCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    AccessibilityMode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssessmentAttempt", x => x.Id);
                    table.UniqueConstraint("AK_AssessmentAttempt_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_AssessmentAttempt_Finished", "([Status] IN (N'Started',N'Paused') AND [FinishedAtUtc] IS NULL) OR ([Status] IN (N'Submitted',N'Valid',N'Invalid') AND [FinishedAtUtc] IS NOT NULL AND [FinishedAtUtc]>=[StartedAtUtc])");
                    table.CheckConstraint("CK_AssessmentAttempt_Status", "[Status] IN (N'Started',N'Paused',N'Submitted',N'Valid',N'Invalid')");
                    table.ForeignKey(
                        name: "FK_AssessmentAttempt_AssessmentInstrument_InstrumentId",
                        column: x => x.InstrumentId,
                        principalSchema: "lab",
                        principalTable: "AssessmentInstrument",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AssessmentAttempt_AssessmentWindow_WindowId_PersonId",
                        columns: x => new { x.WindowId, x.PersonId },
                        principalSchema: "lab",
                        principalTable: "AssessmentWindow",
                        principalColumns: new[] { "Id", "PersonId" });
                    table.ForeignKey(
                        name: "FK_AssessmentAttempt_InstrumentVersion_InstrumentVersionId_InstrumentId",
                        columns: x => new { x.InstrumentVersionId, x.InstrumentId },
                        principalSchema: "lab",
                        principalTable: "InstrumentVersion",
                        principalColumns: new[] { "Id", "InstrumentId" });
                    table.ForeignKey(
                        name: "FK_AssessmentAttempt_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AssessmentResponse",
                schema: "lab",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttemptId = table.Column<long>(type: "bigint", nullable: false),
                    ItemKey = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    TrialNo = table.Column<int>(type: "int", nullable: false),
                    ResponseText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResponseNumber = table.Column<decimal>(type: "decimal(12,4)", nullable: true),
                    LatencyMs = table.Column<int>(type: "int", nullable: true),
                    RecordedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssessmentResponse", x => x.Id);
                    table.CheckConstraint("CK_AssessmentResponse_Latency", "[LatencyMs] IS NULL OR [LatencyMs]>=0");
                    table.CheckConstraint("CK_AssessmentResponse_Trial", "[TrialNo]>0");
                    table.ForeignKey(
                        name: "FK_AssessmentResponse_AssessmentAttempt_AttemptId",
                        column: x => x.AttemptId,
                        principalSchema: "lab",
                        principalTable: "AssessmentAttempt",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AssessmentScore",
                schema: "lab",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttemptId = table.Column<long>(type: "bigint", nullable: false),
                    ScoringVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    MetricCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Value = table.Column<decimal>(type: "decimal(12,4)", nullable: false),
                    Comparable = table.Column<bool>(type: "bit", nullable: false),
                    ComputedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssessmentScore", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssessmentScore_AssessmentAttempt_AttemptId",
                        column: x => x.AttemptId,
                        principalSchema: "lab",
                        principalTable: "AssessmentAttempt",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "IndividualProfile",
                schema: "personal",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    GoalCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    PreferredTimeZone = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    PreferenceVersion = table.Column<int>(type: "int", nullable: false),
                    ConsentVersion = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    OnboardingStage = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    LastAssessmentAttemptId = table.Column<long>(type: "bigint", nullable: true),
                    OnboardingCompletedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IndividualProfile", x => x.Id);
                    table.CheckConstraint("CK_IndividualProfile_Stage", "[OnboardingStage] IN (N'Started',N'Setup',N'Baselines',N'Preview',N'Activated',N'TourDone')");
                    table.ForeignKey(
                        name: "FK_IndividualProfile_AssessmentAttempt_LastAssessmentAttemptId_PersonId",
                        columns: x => new { x.LastAssessmentAttemptId, x.PersonId },
                        principalSchema: "lab",
                        principalTable: "AssessmentAttempt",
                        principalColumns: new[] { "Id", "PersonId" });
                    table.ForeignKey(
                        name: "FK_IndividualProfile_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentAttempt_InstrumentId",
                schema: "lab",
                table: "AssessmentAttempt",
                column: "InstrumentId");

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentAttempt_InstrumentVersionId_InstrumentId",
                schema: "lab",
                table: "AssessmentAttempt",
                columns: new[] { "InstrumentVersionId", "InstrumentId" });

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentAttempt_PersonId_InstrumentId",
                schema: "lab",
                table: "AssessmentAttempt",
                columns: new[] { "PersonId", "InstrumentId" },
                unique: true,
                filter: "[Kind]=N'Baseline' AND [Status]=N'Valid'");

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentAttempt_PersonId_InstrumentId_FinishedAtUtc",
                schema: "lab",
                table: "AssessmentAttempt",
                columns: new[] { "PersonId", "InstrumentId", "FinishedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentAttempt_PublicId",
                schema: "lab",
                table: "AssessmentAttempt",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentAttempt_WindowId_PersonId",
                schema: "lab",
                table: "AssessmentAttempt",
                columns: new[] { "WindowId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentInstrument_Code",
                schema: "lab",
                table: "AssessmentInstrument",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentResponse_AttemptId_ItemKey_TrialNo",
                schema: "lab",
                table: "AssessmentResponse",
                columns: new[] { "AttemptId", "ItemKey", "TrialNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentScore_AttemptId",
                schema: "lab",
                table: "AssessmentScore",
                column: "AttemptId");

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentScore_AttemptId_ScoringVersion_MetricCode",
                schema: "lab",
                table: "AssessmentScore",
                columns: new[] { "AttemptId", "ScoringVersion", "MetricCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentWindow_PersonId_OpensAtUtc",
                schema: "lab",
                table: "AssessmentWindow",
                columns: new[] { "PersonId", "OpensAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentWindow_PersonId_WindowKey",
                schema: "lab",
                table: "AssessmentWindow",
                columns: new[] { "PersonId", "WindowKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IndividualProfile_LastAssessmentAttemptId_PersonId",
                schema: "personal",
                table: "IndividualProfile",
                columns: new[] { "LastAssessmentAttemptId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_IndividualProfile_PersonId",
                schema: "personal",
                table: "IndividualProfile",
                column: "PersonId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InstrumentVersion_InstrumentId_PublishedAtUtc",
                schema: "lab",
                table: "InstrumentVersion",
                columns: new[] { "InstrumentId", "PublishedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_InstrumentVersion_InstrumentId_VersionNo",
                schema: "lab",
                table: "InstrumentVersion",
                columns: new[] { "InstrumentId", "VersionNo" },
                unique: true);

            foreach (var batch in ModuleSql.Batches("LabGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssessmentResponse",
                schema: "lab");

            migrationBuilder.DropTable(
                name: "AssessmentScore",
                schema: "lab");

            migrationBuilder.DropTable(
                name: "IndividualProfile",
                schema: "personal");

            migrationBuilder.DropTable(
                name: "AssessmentAttempt",
                schema: "lab");

            migrationBuilder.DropTable(
                name: "AssessmentWindow",
                schema: "lab");

            migrationBuilder.DropTable(
                name: "InstrumentVersion",
                schema: "lab");

            migrationBuilder.DropTable(
                name: "AssessmentInstrument",
                schema: "lab");
        }
    }
}
