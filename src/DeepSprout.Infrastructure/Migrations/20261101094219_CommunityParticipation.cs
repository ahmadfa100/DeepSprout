using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CommunityParticipation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "community");

            migrationBuilder.CreateTable(
                name: "JointGoal",
                schema: "community",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    CreatorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    TargetLocalDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JointGoal", x => x.Id);
                    table.CheckConstraint("CK_JointGoal_Status", "[Status] IN (N'Active',N'Completed',N'Closed')");
                    table.ForeignKey(
                        name: "FK_JointGoal_Person_CreatorPersonId",
                        column: x => x.CreatorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Post",
                schema: "community",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    AuthorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    SharedEvidenceEventId = table.Column<long>(type: "bigint", nullable: true),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Post", x => x.Id);
                    table.CheckConstraint("CK_Post_Published", "[Status]<>N'Published' OR [PublishedAtUtc] IS NOT NULL");
                    table.CheckConstraint("CK_Post_Status", "[Status] IN (N'Draft',N'Published',N'Hidden',N'Removed')");
                    table.ForeignKey(
                        name: "FK_Post_EvidenceEvent_SharedEvidenceEventId_AuthorPersonId",
                        columns: x => new { x.SharedEvidenceEventId, x.AuthorPersonId },
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumns: new[] { "Id", "SubjectPersonId" });
                    table.ForeignKey(
                        name: "FK_Post_Person_AuthorPersonId",
                        column: x => x.AuthorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JointGoalMember",
                schema: "community",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GoalId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JointGoalMember", x => x.Id);
                    table.UniqueConstraint("AK_JointGoalMember_GoalId_PersonId", x => new { x.GoalId, x.PersonId });
                    table.CheckConstraint("CK_JointGoalMember_Status", "[Status] IN (N'Invited',N'Active',N'Left')");
                    table.ForeignKey(
                        name: "FK_JointGoalMember_JointGoal_GoalId",
                        column: x => x.GoalId,
                        principalSchema: "community",
                        principalTable: "JointGoal",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JointGoalMember_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Bookmark",
                schema: "community",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PostId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bookmark", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Bookmark_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Bookmark_Post_PostId",
                        column: x => x.PostId,
                        principalSchema: "community",
                        principalTable: "Post",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Comment",
                schema: "community",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PostId = table.Column<long>(type: "bigint", nullable: false),
                    AuthorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comment", x => x.Id);
                    table.CheckConstraint("CK_Comment_Status", "[Status] IN (N'Published',N'Hidden',N'Removed')");
                    table.ForeignKey(
                        name: "FK_Comment_Person_AuthorPersonId",
                        column: x => x.AuthorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Comment_Post_PostId",
                        column: x => x.PostId,
                        principalSchema: "community",
                        principalTable: "Post",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Reaction",
                schema: "community",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PostId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    ReactionCode = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reaction", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reaction_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Reaction_Post_PostId",
                        column: x => x.PostId,
                        principalSchema: "community",
                        principalTable: "Post",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JointGoalCheckIn",
                schema: "community",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GoalId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JointGoalCheckIn", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JointGoalCheckIn_JointGoalMember_GoalId_PersonId",
                        columns: x => new { x.GoalId, x.PersonId },
                        principalSchema: "community",
                        principalTable: "JointGoalMember",
                        principalColumns: new[] { "GoalId", "PersonId" });
                });

            migrationBuilder.CreateTable(
                name: "ContentReport",
                schema: "community",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PostId = table.Column<long>(type: "bigint", nullable: true),
                    CommentId = table.Column<long>(type: "bigint", nullable: true),
                    ReporterPersonId = table.Column<long>(type: "bigint", nullable: false),
                    ReasonCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentReport", x => x.Id);
                    table.CheckConstraint("CK_ContentReport_Status", "[Status] IN (N'Submitted',N'Reviewing',N'Resolved')");
                    table.CheckConstraint("CK_ContentReport_Target", "([PostId] IS NOT NULL AND [CommentId] IS NULL) OR ([PostId] IS NULL AND [CommentId] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_ContentReport_Comment_CommentId",
                        column: x => x.CommentId,
                        principalSchema: "community",
                        principalTable: "Comment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ContentReport_Person_ReporterPersonId",
                        column: x => x.ReporterPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ContentReport_Post_PostId",
                        column: x => x.PostId,
                        principalSchema: "community",
                        principalTable: "Post",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ModerationDecision",
                schema: "community",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReportId = table.Column<long>(type: "bigint", nullable: false),
                    ModeratorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Decision = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DecidedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModerationDecision", x => x.Id);
                    table.CheckConstraint("CK_ModerationDecision_Decision", "[Decision] IN (N'Hide',N'Dismiss',N'Remove',N'Restore')");
                    table.ForeignKey(
                        name: "FK_ModerationDecision_ContentReport_ReportId",
                        column: x => x.ReportId,
                        principalSchema: "community",
                        principalTable: "ContentReport",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ModerationDecision_Person_ModeratorPersonId",
                        column: x => x.ModeratorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Bookmark_PersonId_CreatedAtUtc",
                schema: "community",
                table: "Bookmark",
                columns: new[] { "PersonId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookmark_PostId_PersonId",
                schema: "community",
                table: "Bookmark",
                columns: new[] { "PostId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Comment_AuthorPersonId",
                schema: "community",
                table: "Comment",
                column: "AuthorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_Comment_PostId_CreatedAtUtc",
                schema: "community",
                table: "Comment",
                columns: new[] { "PostId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentReport_CommentId",
                schema: "community",
                table: "ContentReport",
                column: "CommentId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentReport_PostId",
                schema: "community",
                table: "ContentReport",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentReport_ReporterPersonId",
                schema: "community",
                table: "ContentReport",
                column: "ReporterPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentReport_Status_CreatedAtUtc",
                schema: "community",
                table: "ContentReport",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_JointGoal_CreatorPersonId_Status",
                schema: "community",
                table: "JointGoal",
                columns: new[] { "CreatorPersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_JointGoal_PublicId",
                schema: "community",
                table: "JointGoal",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JointGoalCheckIn_GoalId_LocalDate",
                schema: "community",
                table: "JointGoalCheckIn",
                columns: new[] { "GoalId", "LocalDate" });

            migrationBuilder.CreateIndex(
                name: "IX_JointGoalCheckIn_GoalId_PersonId",
                schema: "community",
                table: "JointGoalCheckIn",
                columns: new[] { "GoalId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_JointGoalMember_PersonId_Status",
                schema: "community",
                table: "JointGoalMember",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ModerationDecision_ModeratorPersonId",
                schema: "community",
                table: "ModerationDecision",
                column: "ModeratorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ModerationDecision_ReportId_DecidedAtUtc",
                schema: "community",
                table: "ModerationDecision",
                columns: new[] { "ReportId", "DecidedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Post_AuthorPersonId_CreatedAtUtc",
                schema: "community",
                table: "Post",
                columns: new[] { "AuthorPersonId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Post_PublicId",
                schema: "community",
                table: "Post",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Post_SharedEvidenceEventId_AuthorPersonId",
                schema: "community",
                table: "Post",
                columns: new[] { "SharedEvidenceEventId", "AuthorPersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_Post_Status_PublishedAtUtc",
                schema: "community",
                table: "Post",
                columns: new[] { "Status", "PublishedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Reaction_PersonId_CreatedAtUtc",
                schema: "community",
                table: "Reaction",
                columns: new[] { "PersonId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Reaction_PostId_PersonId_ReactionCode",
                schema: "community",
                table: "Reaction",
                columns: new[] { "PostId", "PersonId", "ReactionCode" },
                unique: true);

            foreach (var batch in ModuleSql.Batches("CommunityGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Bookmark",
                schema: "community");

            migrationBuilder.DropTable(
                name: "JointGoalCheckIn",
                schema: "community");

            migrationBuilder.DropTable(
                name: "ModerationDecision",
                schema: "community");

            migrationBuilder.DropTable(
                name: "Reaction",
                schema: "community");

            migrationBuilder.DropTable(
                name: "JointGoalMember",
                schema: "community");

            migrationBuilder.DropTable(
                name: "ContentReport",
                schema: "community");

            migrationBuilder.DropTable(
                name: "JointGoal",
                schema: "community");

            migrationBuilder.DropTable(
                name: "Comment",
                schema: "community");

            migrationBuilder.DropTable(
                name: "Post",
                schema: "community");
        }
    }
}
