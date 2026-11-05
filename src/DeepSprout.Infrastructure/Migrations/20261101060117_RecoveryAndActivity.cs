using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RecoveryAndActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "activity");

            migrationBuilder.EnsureSchema(
                name: "recovery");

            migrationBuilder.CreateTable(
                name: "OfflineRoutine",
                schema: "activity",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    ScheduleRule = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OfflineRoutine", x => x.Id);
                    table.UniqueConstraint("AK_OfflineRoutine_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_OfflineRoutine_Status", "[Status] IN (N'Active',N'Paused',N'Archived')");
                    table.ForeignKey(
                        name: "FK_OfflineRoutine_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PracticeDefinition",
                schema: "activity",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PracticeType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PracticeDefinition", x => x.Id);
                    table.CheckConstraint("CK_PracticeDefinition_Status", "[Status] IN (N'Draft',N'Published',N'Retired')");
                    table.CheckConstraint("CK_PracticeDefinition_Type", "[PracticeType] IN (N'Depth Practice',N'Listening & Recall',N'Practical Micro-Challenge',N'Protected Work')");
                });

            migrationBuilder.CreateTable(
                name: "PracticeProgressionDecision",
                schema: "activity",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    PracticeType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FromTier = table.Column<short>(type: "smallint", nullable: false),
                    ToTier = table.Column<short>(type: "smallint", nullable: false),
                    PolicyVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    DecisionCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    DecidedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PracticeProgressionDecision", x => x.Id);
                    table.CheckConstraint("CK_PracticeProgressionDecision_Decision", "[DecisionCode] IN (N'Accepted',N'Stayed',N'SteppedDown')");
                    table.CheckConstraint("CK_PracticeProgressionDecision_Tiers", "[FromTier]>0 AND [ToTier]>0");
                    table.ForeignKey(
                        name: "FK_PracticeProgressionDecision_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RecoveryJourney",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecoveryJourney", x => x.Id);
                    table.UniqueConstraint("AK_RecoveryJourney_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_RecoveryJourney_Status", "[Status] IN (N'Active',N'Archived')");
                    table.ForeignKey(
                        name: "FK_RecoveryJourney_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RoutineCheckIn",
                schema: "activity",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoutineId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    State = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    EvidenceEventId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoutineCheckIn", x => x.Id);
                    table.CheckConstraint("CK_RoutineCheckIn_State", "[State] IN (N'Done',N'Skipped')");
                    table.ForeignKey(
                        name: "FK_RoutineCheckIn_EvidenceEvent_EvidenceEventId_PersonId",
                        columns: x => new { x.EvidenceEventId, x.PersonId },
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumns: new[] { "Id", "SubjectPersonId" });
                    table.ForeignKey(
                        name: "FK_RoutineCheckIn_OfflineRoutine_RoutineId_PersonId",
                        columns: x => new { x.RoutineId, x.PersonId },
                        principalSchema: "activity",
                        principalTable: "OfflineRoutine",
                        principalColumns: new[] { "Id", "PersonId" });
                });

            migrationBuilder.CreateTable(
                name: "PracticeVersion",
                schema: "activity",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DefinitionId = table.Column<long>(type: "bigint", nullable: false),
                    VersionNo = table.Column<int>(type: "int", nullable: false),
                    ContentRef = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    DifficultyTier = table.Column<short>(type: "smallint", nullable: false),
                    EstimatedMinutes = table.Column<short>(type: "smallint", nullable: true),
                    EvidenceTier = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ValidationVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PracticeVersion", x => x.Id);
                    table.CheckConstraint("CK_PracticeVersion_No", "[VersionNo]>0");
                    table.CheckConstraint("CK_PracticeVersion_Tier", "[DifficultyTier]>0 AND ([EstimatedMinutes] IS NULL OR [EstimatedMinutes]>0)");
                    table.ForeignKey(
                        name: "FK_PracticeVersion_PracticeDefinition_DefinitionId",
                        column: x => x.DefinitionId,
                        principalSchema: "activity",
                        principalTable: "PracticeDefinition",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RecoveryCycle",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    JourneyId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    CycleNo = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    StartLocalDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndLocalDate = table.Column<DateOnly>(type: "date", nullable: true),
                    TimeZoneId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecoveryCycle", x => x.Id);
                    table.UniqueConstraint("AK_RecoveryCycle_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_RecoveryCycle_Dates", "[EndLocalDate] IS NULL OR ([StartLocalDate] IS NOT NULL AND [EndLocalDate]>=[StartLocalDate])");
                    table.CheckConstraint("CK_RecoveryCycle_No", "[CycleNo]>0");
                    table.CheckConstraint("CK_RecoveryCycle_Status", "[Status] IN (N'Draft',N'Preview',N'Active',N'ReviewDue',N'Ended',N'Reviewed',N'Paused',N'Cancelled')");
                    table.ForeignKey(
                        name: "FK_RecoveryCycle_RecoveryJourney_JourneyId_PersonId",
                        columns: x => new { x.JourneyId, x.PersonId },
                        principalSchema: "recovery",
                        principalTable: "RecoveryJourney",
                        principalColumns: new[] { "Id", "PersonId" });
                });

            migrationBuilder.CreateTable(
                name: "PlanRevision",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CycleId = table.Column<long>(type: "bigint", nullable: false),
                    RevisionNo = table.Column<int>(type: "int", nullable: false),
                    GoalCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PolicyVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    EffectiveFromLocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    AcceptedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanRevision", x => x.Id);
                    table.UniqueConstraint("AK_PlanRevision_Id_CycleId", x => new { x.Id, x.CycleId });
                    table.CheckConstraint("CK_PlanRevision_Accepted", "([Status]=N'Draft' AND [AcceptedAtUtc] IS NULL) OR ([Status] IN (N'Accepted',N'Superseded') AND [AcceptedAtUtc] IS NOT NULL)");
                    table.CheckConstraint("CK_PlanRevision_No", "[RevisionNo]>0");
                    table.CheckConstraint("CK_PlanRevision_Status", "[Status] IN (N'Draft',N'Accepted',N'Superseded')");
                    table.ForeignKey(
                        name: "FK_PlanRevision_RecoveryCycle_CycleId",
                        column: x => x.CycleId,
                        principalSchema: "recovery",
                        principalTable: "RecoveryCycle",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "WeeklyReview",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CycleId = table.Column<long>(type: "bigint", nullable: false),
                    WeekNo = table.Column<byte>(type: "tinyint", nullable: false),
                    PlanRevisionId = table.Column<long>(type: "bigint", nullable: false),
                    ManageabilityCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    FitCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    DecisionCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyReview", x => x.Id);
                    table.CheckConstraint("CK_WeeklyReview_Week", "[WeekNo]>0");
                    table.ForeignKey(
                        name: "FK_WeeklyReview_PlanRevision_PlanRevisionId_CycleId",
                        columns: x => new { x.PlanRevisionId, x.CycleId },
                        principalSchema: "recovery",
                        principalTable: "PlanRevision",
                        principalColumns: new[] { "Id", "CycleId" });
                    table.ForeignKey(
                        name: "FK_WeeklyReview_RecoveryCycle_CycleId",
                        column: x => x.CycleId,
                        principalSchema: "recovery",
                        principalTable: "RecoveryCycle",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PracticeAttempt",
                schema: "activity",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    PracticeVersionId = table.Column<long>(type: "bigint", nullable: false),
                    ScheduledActionId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Valid = table.Column<bool>(type: "bit", nullable: true),
                    OutcomeCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    StartedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    EndedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    EvidenceEventId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PracticeAttempt", x => x.Id);
                    table.UniqueConstraint("AK_PracticeAttempt_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_PracticeAttempt_Status", "[Status] IN (N'Started',N'Paused',N'Submitted',N'Completed',N'Invalid')");
                    table.CheckConstraint("CK_PracticeAttempt_Validity", "([Status] IN (N'Started',N'Paused',N'Submitted') AND [Valid] IS NULL) OR ([Status]=N'Completed' AND [Valid]=1 AND [EndedAtUtc] IS NOT NULL) OR ([Status]=N'Invalid' AND [Valid]=0 AND [EndedAtUtc] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_PracticeAttempt_EvidenceEvent_EvidenceEventId_PersonId",
                        columns: x => new { x.EvidenceEventId, x.PersonId },
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumns: new[] { "Id", "SubjectPersonId" });
                    table.ForeignKey(
                        name: "FK_PracticeAttempt_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PracticeAttempt_PracticeVersion_PracticeVersionId",
                        column: x => x.PracticeVersionId,
                        principalSchema: "activity",
                        principalTable: "PracticeVersion",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ScheduledAction",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CycleId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    PlanRevisionId = table.Column<long>(type: "bigint", nullable: false),
                    PracticeVersionId = table.Column<long>(type: "bigint", nullable: true),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ActionKind = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CompletedAttemptId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduledAction", x => x.Id);
                    table.UniqueConstraint("AK_ScheduledAction_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_ScheduledAction_Practice", "[ActionKind]<>N'Practice' OR [PracticeVersionId] IS NOT NULL");
                    table.CheckConstraint("CK_ScheduledAction_Status", "[Status] IN (N'Due',N'Completed',N'Missed',N'Rescheduled',N'Cancelled')");
                    table.ForeignKey(
                        name: "FK_ScheduledAction_PlanRevision_PlanRevisionId_CycleId",
                        columns: x => new { x.PlanRevisionId, x.CycleId },
                        principalSchema: "recovery",
                        principalTable: "PlanRevision",
                        principalColumns: new[] { "Id", "CycleId" });
                    table.ForeignKey(
                        name: "FK_ScheduledAction_PracticeAttempt_CompletedAttemptId_PersonId",
                        columns: x => new { x.CompletedAttemptId, x.PersonId },
                        principalSchema: "activity",
                        principalTable: "PracticeAttempt",
                        principalColumns: new[] { "Id", "PersonId" });
                    table.ForeignKey(
                        name: "FK_ScheduledAction_PracticeVersion_PracticeVersionId",
                        column: x => x.PracticeVersionId,
                        principalSchema: "activity",
                        principalTable: "PracticeVersion",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ScheduledAction_RecoveryCycle_CycleId_PersonId",
                        columns: x => new { x.CycleId, x.PersonId },
                        principalSchema: "recovery",
                        principalTable: "RecoveryCycle",
                        principalColumns: new[] { "Id", "PersonId" });
                });

            migrationBuilder.CreateIndex(
                name: "IX_OfflineRoutine_PersonId_Status",
                schema: "activity",
                table: "OfflineRoutine",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanRevision_CycleId_EffectiveFromLocalDate",
                schema: "recovery",
                table: "PlanRevision",
                columns: new[] { "CycleId", "EffectiveFromLocalDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PlanRevision_CycleId_RevisionNo",
                schema: "recovery",
                table: "PlanRevision",
                columns: new[] { "CycleId", "RevisionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAttempt_EvidenceEventId",
                schema: "activity",
                table: "PracticeAttempt",
                column: "EvidenceEventId",
                unique: true,
                filter: "[EvidenceEventId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAttempt_EvidenceEventId_PersonId",
                schema: "activity",
                table: "PracticeAttempt",
                columns: new[] { "EvidenceEventId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAttempt_PersonId_StartedAtUtc",
                schema: "activity",
                table: "PracticeAttempt",
                columns: new[] { "PersonId", "StartedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAttempt_PracticeVersionId",
                schema: "activity",
                table: "PracticeAttempt",
                column: "PracticeVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAttempt_PublicId",
                schema: "activity",
                table: "PracticeAttempt",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAttempt_ScheduledActionId_PersonId",
                schema: "activity",
                table: "PracticeAttempt",
                columns: new[] { "ScheduledActionId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_PracticeDefinition_Code",
                schema: "activity",
                table: "PracticeDefinition",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PracticeProgressionDecision_PersonId_PracticeType_DecidedAtUtc",
                schema: "activity",
                table: "PracticeProgressionDecision",
                columns: new[] { "PersonId", "PracticeType", "DecidedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PracticeVersion_DefinitionId_DifficultyTier",
                schema: "activity",
                table: "PracticeVersion",
                columns: new[] { "DefinitionId", "DifficultyTier" });

            migrationBuilder.CreateIndex(
                name: "IX_PracticeVersion_DefinitionId_VersionNo",
                schema: "activity",
                table: "PracticeVersion",
                columns: new[] { "DefinitionId", "VersionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryCycle_JourneyId",
                schema: "recovery",
                table: "RecoveryCycle",
                column: "JourneyId",
                unique: true,
                filter: "[Status] IN (N'Active',N'ReviewDue')");

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryCycle_JourneyId_CycleNo",
                schema: "recovery",
                table: "RecoveryCycle",
                columns: new[] { "JourneyId", "CycleNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryCycle_JourneyId_PersonId",
                schema: "recovery",
                table: "RecoveryCycle",
                columns: new[] { "JourneyId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryCycle_PublicId",
                schema: "recovery",
                table: "RecoveryCycle",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryJourney_PersonId",
                schema: "recovery",
                table: "RecoveryJourney",
                column: "PersonId",
                unique: true,
                filter: "[Status]=N'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_RoutineCheckIn_EvidenceEventId_PersonId",
                schema: "activity",
                table: "RoutineCheckIn",
                columns: new[] { "EvidenceEventId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_RoutineCheckIn_RoutineId_LocalDate",
                schema: "activity",
                table: "RoutineCheckIn",
                columns: new[] { "RoutineId", "LocalDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoutineCheckIn_RoutineId_PersonId",
                schema: "activity",
                table: "RoutineCheckIn",
                columns: new[] { "RoutineId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledAction_CompletedAttemptId_PersonId",
                schema: "recovery",
                table: "ScheduledAction",
                columns: new[] { "CompletedAttemptId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledAction_CycleId_LocalDate_Status",
                schema: "recovery",
                table: "ScheduledAction",
                columns: new[] { "CycleId", "LocalDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledAction_CycleId_PersonId",
                schema: "recovery",
                table: "ScheduledAction",
                columns: new[] { "CycleId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledAction_PlanRevisionId_CycleId",
                schema: "recovery",
                table: "ScheduledAction",
                columns: new[] { "PlanRevisionId", "CycleId" });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledAction_PracticeVersionId",
                schema: "recovery",
                table: "ScheduledAction",
                column: "PracticeVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReview_CycleId_WeekNo",
                schema: "recovery",
                table: "WeeklyReview",
                columns: new[] { "CycleId", "WeekNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyReview_PlanRevisionId_CycleId",
                schema: "recovery",
                table: "WeeklyReview",
                columns: new[] { "PlanRevisionId", "CycleId" });

            migrationBuilder.AddForeignKey(
                name: "FK_PracticeAttempt_ScheduledAction_ScheduledActionId_PersonId",
                schema: "activity",
                table: "PracticeAttempt",
                columns: new[] { "ScheduledActionId", "PersonId" },
                principalSchema: "recovery",
                principalTable: "ScheduledAction",
                principalColumns: new[] { "Id", "PersonId" });

            foreach (var batch in ModuleSql.Batches("RecoveryActivityGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PlanRevision_RecoveryCycle_CycleId",
                schema: "recovery",
                table: "PlanRevision");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledAction_RecoveryCycle_CycleId_PersonId",
                schema: "recovery",
                table: "ScheduledAction");

            migrationBuilder.DropForeignKey(
                name: "FK_PracticeAttempt_PracticeVersion_PracticeVersionId",
                schema: "activity",
                table: "PracticeAttempt");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledAction_PracticeVersion_PracticeVersionId",
                schema: "recovery",
                table: "ScheduledAction");

            migrationBuilder.DropForeignKey(
                name: "FK_PracticeAttempt_ScheduledAction_ScheduledActionId_PersonId",
                schema: "activity",
                table: "PracticeAttempt");

            migrationBuilder.DropTable(
                name: "PracticeProgressionDecision",
                schema: "activity");

            migrationBuilder.DropTable(
                name: "RoutineCheckIn",
                schema: "activity");

            migrationBuilder.DropTable(
                name: "WeeklyReview",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "OfflineRoutine",
                schema: "activity");

            migrationBuilder.DropTable(
                name: "RecoveryCycle",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "RecoveryJourney",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "PracticeVersion",
                schema: "activity");

            migrationBuilder.DropTable(
                name: "PracticeDefinition",
                schema: "activity");

            migrationBuilder.DropTable(
                name: "ScheduledAction",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "PlanRevision",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "PracticeAttempt",
                schema: "activity");
        }
    }
}
