using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TaskWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "task");

            migrationBuilder.CreateTable(
                name: "Assignment",
                schema: "task",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    GroupId = table.Column<long>(type: "bigint", nullable: false),
                    AuthorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assignment", x => x.Id);
                    table.CheckConstraint("CK_Assignment_Status", "[Status] IN (N'Draft',N'Published',N'Cancelled',N'Closed')");
                    table.ForeignKey(
                        name: "FK_Assignment_OperationalGroup_GroupId",
                        column: x => x.GroupId,
                        principalSchema: "coach",
                        principalTable: "OperationalGroup",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Assignment_Person_AuthorPersonId",
                        column: x => x.AuthorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CoachReport",
                schema: "task",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GroupId = table.Column<long>(type: "bigint", nullable: false),
                    AuthorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    PeriodStart = table.Column<DateOnly>(type: "date", nullable: false),
                    PeriodEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Narrative = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoachReport", x => x.Id);
                    table.CheckConstraint("CK_CoachReport_Dates", "[PeriodEnd]>=[PeriodStart]");
                    table.CheckConstraint("CK_CoachReport_Status", "[Status] IN (N'Draft',N'Submitted')");
                    table.ForeignKey(
                        name: "FK_CoachReport_OperationalGroup_GroupId",
                        column: x => x.GroupId,
                        principalSchema: "coach",
                        principalTable: "OperationalGroup",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CoachReport_Person_AuthorPersonId",
                        column: x => x.AuthorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SupervisorReport",
                schema: "task",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    AuthorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    PeriodStart = table.Column<DateOnly>(type: "date", nullable: false),
                    PeriodEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Narrative = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupervisorReport", x => x.Id);
                    table.CheckConstraint("CK_SupervisorReport_Dates", "[PeriodEnd]>=[PeriodStart]");
                    table.CheckConstraint("CK_SupervisorReport_Status", "[Status] IN (N'Draft',N'Submitted')");
                    table.ForeignKey(
                        name: "FK_SupervisorReport_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SupervisorReport_Person_AuthorPersonId",
                        column: x => x.AuthorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AssignmentRevision",
                schema: "task",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssignmentId = table.Column<long>(type: "bigint", nullable: false),
                    RevisionNo = table.Column<int>(type: "int", nullable: false),
                    PracticeVersionId = table.Column<long>(type: "bigint", nullable: true),
                    Instructions = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReviewMode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    DueAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssignmentRevision", x => x.Id);
                    table.UniqueConstraint("AK_AssignmentRevision_Id_AssignmentId", x => new { x.Id, x.AssignmentId });
                    table.CheckConstraint("CK_AssignmentRevision_No", "[RevisionNo]>0");
                    table.ForeignKey(
                        name: "FK_AssignmentRevision_Assignment_AssignmentId",
                        column: x => x.AssignmentId,
                        principalSchema: "task",
                        principalTable: "Assignment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AssignmentRevision_PracticeVersion_PracticeVersionId",
                        column: x => x.PracticeVersionId,
                        principalSchema: "activity",
                        principalTable: "PracticeVersion",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AssignmentRecipient",
                schema: "task",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssignmentId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    AssignedRevisionId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    LastAttemptNo = table.Column<int>(type: "int", nullable: false),
                    AssignedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssignmentRecipient", x => x.Id);
                    table.UniqueConstraint("AK_AssignmentRecipient_Id_AssignmentId", x => new { x.Id, x.AssignmentId });
                    table.CheckConstraint("CK_AssignmentRecipient_Attempts", "[LastAttemptNo]>=0");
                    table.CheckConstraint("CK_AssignmentRecipient_Status", "[Status] IN (N'Assigned',N'Started',N'Submitted',N'Approved',N'Cancelled')");
                    table.ForeignKey(
                        name: "FK_AssignmentRecipient_AssignmentRevision_AssignedRevisionId_AssignmentId",
                        columns: x => new { x.AssignedRevisionId, x.AssignmentId },
                        principalSchema: "task",
                        principalTable: "AssignmentRevision",
                        principalColumns: new[] { "Id", "AssignmentId" });
                    table.ForeignKey(
                        name: "FK_AssignmentRecipient_Assignment_AssignmentId",
                        column: x => x.AssignmentId,
                        principalSchema: "task",
                        principalTable: "Assignment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AssignmentRecipient_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SubmissionAttempt",
                schema: "task",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecipientId = table.Column<long>(type: "bigint", nullable: false),
                    AttemptNo = table.Column<int>(type: "int", nullable: false),
                    AssignmentRevisionId = table.Column<long>(type: "bigint", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FileId = table.Column<long>(type: "bigint", nullable: true),
                    AssignmentId = table.Column<long>(type: "bigint", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubmissionAttempt", x => x.Id);
                    table.CheckConstraint("CK_SubmissionAttempt_No", "[AttemptNo]>0");
                    table.ForeignKey(
                        name: "FK_SubmissionAttempt_AssignmentRecipient_RecipientId_AssignmentId",
                        columns: x => new { x.RecipientId, x.AssignmentId },
                        principalSchema: "task",
                        principalTable: "AssignmentRecipient",
                        principalColumns: new[] { "Id", "AssignmentId" });
                    table.ForeignKey(
                        name: "FK_SubmissionAttempt_AssignmentRevision_AssignmentRevisionId_AssignmentId",
                        columns: x => new { x.AssignmentRevisionId, x.AssignmentId },
                        principalSchema: "task",
                        principalTable: "AssignmentRevision",
                        principalColumns: new[] { "Id", "AssignmentId" });
                    table.ForeignKey(
                        name: "FK_SubmissionAttempt_SecureFile_FileId",
                        column: x => x.FileId,
                        principalSchema: "files",
                        principalTable: "SecureFile",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ReviewDecision",
                schema: "task",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttemptId = table.Column<long>(type: "bigint", nullable: false),
                    DecisionNo = table.Column<int>(type: "int", nullable: false),
                    SupersedesId = table.Column<long>(type: "bigint", nullable: true),
                    ReviewerPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Decision = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Feedback = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RuleVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    EvidenceEventId = table.Column<long>(type: "bigint", nullable: true),
                    DecidedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewDecision", x => x.Id);
                    table.UniqueConstraint("AK_ReviewDecision_Id_AttemptId", x => new { x.Id, x.AttemptId });
                    table.CheckConstraint("CK_ReviewDecision_Decision", "[Decision] IN (N'Approved',N'NeedsRevision',N'Rejected')");
                    table.CheckConstraint("CK_ReviewDecision_No", "[DecisionNo]>0");
                    table.ForeignKey(
                        name: "FK_ReviewDecision_EvidenceEvent_EvidenceEventId",
                        column: x => x.EvidenceEventId,
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReviewDecision_Person_ReviewerPersonId",
                        column: x => x.ReviewerPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReviewDecision_ReviewDecision_SupersedesId_AttemptId",
                        columns: x => new { x.SupersedesId, x.AttemptId },
                        principalSchema: "task",
                        principalTable: "ReviewDecision",
                        principalColumns: new[] { "Id", "AttemptId" });
                    table.ForeignKey(
                        name: "FK_ReviewDecision_SubmissionAttempt_AttemptId",
                        column: x => x.AttemptId,
                        principalSchema: "task",
                        principalTable: "SubmissionAttempt",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ReviewPrivateNote",
                schema: "task",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DecisionId = table.Column<long>(type: "bigint", nullable: false),
                    AuthorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewPrivateNote", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReviewPrivateNote_Person_AuthorPersonId",
                        column: x => x.AuthorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReviewPrivateNote_ReviewDecision_DecisionId",
                        column: x => x.DecisionId,
                        principalSchema: "task",
                        principalTable: "ReviewDecision",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Assignment_AuthorPersonId",
                schema: "task",
                table: "Assignment",
                column: "AuthorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_Assignment_GroupId_Status",
                schema: "task",
                table: "Assignment",
                columns: new[] { "GroupId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Assignment_PublicId",
                schema: "task",
                table: "Assignment",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentRecipient_AssignedRevisionId_AssignmentId",
                schema: "task",
                table: "AssignmentRecipient",
                columns: new[] { "AssignedRevisionId", "AssignmentId" });

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentRecipient_AssignmentId_PersonId",
                schema: "task",
                table: "AssignmentRecipient",
                columns: new[] { "AssignmentId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentRecipient_PersonId_Status",
                schema: "task",
                table: "AssignmentRecipient",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentRevision_AssignmentId_RevisionNo",
                schema: "task",
                table: "AssignmentRevision",
                columns: new[] { "AssignmentId", "RevisionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssignmentRevision_PracticeVersionId",
                schema: "task",
                table: "AssignmentRevision",
                column: "PracticeVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_CoachReport_AuthorPersonId",
                schema: "task",
                table: "CoachReport",
                column: "AuthorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_CoachReport_GroupId_PeriodStart",
                schema: "task",
                table: "CoachReport",
                columns: new[] { "GroupId", "PeriodStart" });

            migrationBuilder.CreateIndex(
                name: "IX_ReviewDecision_AttemptId_DecisionNo",
                schema: "task",
                table: "ReviewDecision",
                columns: new[] { "AttemptId", "DecisionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReviewDecision_EvidenceEventId",
                schema: "task",
                table: "ReviewDecision",
                column: "EvidenceEventId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewDecision_ReviewerPersonId_DecidedAtUtc",
                schema: "task",
                table: "ReviewDecision",
                columns: new[] { "ReviewerPersonId", "DecidedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ReviewDecision_SupersedesId",
                schema: "task",
                table: "ReviewDecision",
                column: "SupersedesId",
                unique: true,
                filter: "[SupersedesId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewDecision_SupersedesId_AttemptId",
                schema: "task",
                table: "ReviewDecision",
                columns: new[] { "SupersedesId", "AttemptId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReviewPrivateNote_AuthorPersonId",
                schema: "task",
                table: "ReviewPrivateNote",
                column: "AuthorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewPrivateNote_DecisionId",
                schema: "task",
                table: "ReviewPrivateNote",
                column: "DecisionId");

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionAttempt_AssignmentRevisionId_AssignmentId",
                schema: "task",
                table: "SubmissionAttempt",
                columns: new[] { "AssignmentRevisionId", "AssignmentId" });

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionAttempt_FileId",
                schema: "task",
                table: "SubmissionAttempt",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionAttempt_RecipientId_AssignmentId",
                schema: "task",
                table: "SubmissionAttempt",
                columns: new[] { "RecipientId", "AssignmentId" });

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionAttempt_RecipientId_AttemptNo",
                schema: "task",
                table: "SubmissionAttempt",
                columns: new[] { "RecipientId", "AttemptNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionAttempt_RecipientId_SubmittedAtUtc",
                schema: "task",
                table: "SubmissionAttempt",
                columns: new[] { "RecipientId", "SubmittedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SupervisorReport_AuthorPersonId",
                schema: "task",
                table: "SupervisorReport",
                column: "AuthorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisorReport_InitiativeId_PeriodStart",
                schema: "task",
                table: "SupervisorReport",
                columns: new[] { "InitiativeId", "PeriodStart" });

            foreach (var batch in ModuleSql.Batches("TaskGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CoachReport",
                schema: "task");

            migrationBuilder.DropTable(
                name: "ReviewPrivateNote",
                schema: "task");

            migrationBuilder.DropTable(
                name: "SupervisorReport",
                schema: "task");

            migrationBuilder.DropTable(
                name: "ReviewDecision",
                schema: "task");

            migrationBuilder.DropTable(
                name: "SubmissionAttempt",
                schema: "task");

            migrationBuilder.DropTable(
                name: "AssignmentRecipient",
                schema: "task");

            migrationBuilder.DropTable(
                name: "AssignmentRevision",
                schema: "task");

            migrationBuilder.DropTable(
                name: "Assignment",
                schema: "task");
        }
    }
}
