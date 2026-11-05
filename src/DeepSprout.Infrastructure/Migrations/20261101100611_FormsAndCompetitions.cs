using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FormsAndCompetitions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "forms");

            migrationBuilder.CreateTable(
                name: "Competition",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RulesVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    OpensAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ClosesAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Competition", x => x.Id);
                    table.CheckConstraint("CK_Competition_Status", "[Status] IN (N'Draft',N'Published',N'Closed',N'ResultsPublished')");
                    table.CheckConstraint("CK_Competition_Window", "[ClosesAtUtc]>[OpensAtUtc]");
                    table.ForeignKey(
                        name: "FK_Competition_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Form",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Form", x => x.Id);
                    table.CheckConstraint("CK_Form_Status", "[Status] IN (N'Draft',N'Published',N'Closed')");
                    table.ForeignKey(
                        name: "FK_Form_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CompetitionCriterion",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompetitionId = table.Column<long>(type: "bigint", nullable: false),
                    CriterionCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    RubricVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompetitionCriterion", x => x.Id);
                    table.UniqueConstraint("AK_CompetitionCriterion_Id_CompetitionId_RubricVersion", x => new { x.Id, x.CompetitionId, x.RubricVersion });
                    table.ForeignKey(
                        name: "FK_CompetitionCriterion_Competition_CompetitionId",
                        column: x => x.CompetitionId,
                        principalSchema: "forms",
                        principalTable: "Competition",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CompetitionEntry",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    CompetitionId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    EntryNo = table.Column<int>(type: "int", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FileId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompetitionEntry", x => x.Id);
                    table.UniqueConstraint("AK_CompetitionEntry_Id_CompetitionId", x => new { x.Id, x.CompetitionId });
                    table.CheckConstraint("CK_CompetitionEntry_No", "[EntryNo]>0");
                    table.CheckConstraint("CK_CompetitionEntry_Status", "[Status] IN (N'Submitted',N'Withdrawn',N'Reviewed')");
                    table.ForeignKey(
                        name: "FK_CompetitionEntry_Competition_CompetitionId",
                        column: x => x.CompetitionId,
                        principalSchema: "forms",
                        principalTable: "Competition",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CompetitionEntry_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CompetitionEntry_SecureFile_FileId",
                        column: x => x.FileId,
                        principalSchema: "files",
                        principalTable: "SecureFile",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FormVersion",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FormId = table.Column<long>(type: "bigint", nullable: false),
                    VersionNo = table.Column<int>(type: "int", nullable: false),
                    ConsentVersion = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    OpensAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ClosesAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormVersion", x => x.Id);
                    table.CheckConstraint("CK_FormVersion_No", "[VersionNo]>0");
                    table.CheckConstraint("CK_FormVersion_Window", "[ClosesAtUtc]>[OpensAtUtc]");
                    table.ForeignKey(
                        name: "FK_FormVersion_Form_FormId",
                        column: x => x.FormId,
                        principalSchema: "forms",
                        principalTable: "Form",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CompetitionJudgment",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EntryId = table.Column<long>(type: "bigint", nullable: false),
                    JudgePersonId = table.Column<long>(type: "bigint", nullable: false),
                    RubricVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Decision = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Feedback = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CompetitionId = table.Column<long>(type: "bigint", nullable: false),
                    DecidedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompetitionJudgment", x => x.Id);
                    table.UniqueConstraint("AK_CompetitionJudgment_Id_CompetitionId_RubricVersion", x => new { x.Id, x.CompetitionId, x.RubricVersion });
                    table.ForeignKey(
                        name: "FK_CompetitionJudgment_CompetitionEntry_EntryId_CompetitionId",
                        columns: x => new { x.EntryId, x.CompetitionId },
                        principalSchema: "forms",
                        principalTable: "CompetitionEntry",
                        principalColumns: new[] { "Id", "CompetitionId" });
                    table.ForeignKey(
                        name: "FK_CompetitionJudgment_Person_JudgePersonId",
                        column: x => x.JudgePersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FormQuestion",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FormVersionId = table.Column<long>(type: "bigint", nullable: false),
                    QuestionKey = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Prompt = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    QuestionType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Required = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormQuestion", x => x.Id);
                    table.UniqueConstraint("AK_FormQuestion_Id_FormVersionId", x => new { x.Id, x.FormVersionId });
                    table.ForeignKey(
                        name: "FK_FormQuestion_FormVersion_FormVersionId",
                        column: x => x.FormVersionId,
                        principalSchema: "forms",
                        principalTable: "FormVersion",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FormResponse",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    FormVersionId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    ResponseNo = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    ConsentAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormResponse", x => x.Id);
                    table.UniqueConstraint("AK_FormResponse_Id_FormVersionId", x => new { x.Id, x.FormVersionId });
                    table.CheckConstraint("CK_FormResponse_No", "[ResponseNo]>0");
                    table.CheckConstraint("CK_FormResponse_Status", "[Status] IN (N'Draft',N'Submitted',N'Withdrawn')");
                    table.ForeignKey(
                        name: "FK_FormResponse_FormVersion_FormVersionId",
                        column: x => x.FormVersionId,
                        principalSchema: "forms",
                        principalTable: "FormVersion",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FormResponse_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CompetitionCriterionScore",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JudgmentId = table.Column<long>(type: "bigint", nullable: false),
                    CriterionId = table.Column<long>(type: "bigint", nullable: false),
                    Score = table.Column<decimal>(type: "decimal(9,4)", nullable: false),
                    CompetitionId = table.Column<long>(type: "bigint", nullable: false),
                    RubricVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompetitionCriterionScore", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompetitionCriterionScore_CompetitionCriterion_CriterionId_CompetitionId_RubricVersion",
                        columns: x => new { x.CriterionId, x.CompetitionId, x.RubricVersion },
                        principalSchema: "forms",
                        principalTable: "CompetitionCriterion",
                        principalColumns: new[] { "Id", "CompetitionId", "RubricVersion" });
                    table.ForeignKey(
                        name: "FK_CompetitionCriterionScore_CompetitionJudgment_JudgmentId_CompetitionId_RubricVersion",
                        columns: x => new { x.JudgmentId, x.CompetitionId, x.RubricVersion },
                        principalSchema: "forms",
                        principalTable: "CompetitionJudgment",
                        principalColumns: new[] { "Id", "CompetitionId", "RubricVersion" });
                });

            migrationBuilder.CreateTable(
                name: "FormQuestionOption",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuestionId = table.Column<long>(type: "bigint", nullable: false),
                    OptionCode = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    SortOrder = table.Column<short>(type: "smallint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormQuestionOption", x => x.Id);
                    table.UniqueConstraint("AK_FormQuestionOption_Id_QuestionId", x => new { x.Id, x.QuestionId });
                    table.CheckConstraint("CK_FormQuestionOption_Order", "[SortOrder]>0");
                    table.ForeignKey(
                        name: "FK_FormQuestionOption_FormQuestion_QuestionId",
                        column: x => x.QuestionId,
                        principalSchema: "forms",
                        principalTable: "FormQuestion",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FormAnswer",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResponseId = table.Column<long>(type: "bigint", nullable: false),
                    QuestionId = table.Column<long>(type: "bigint", nullable: false),
                    TextValue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NumberValue = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    ChoiceCode = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    FileId = table.Column<long>(type: "bigint", nullable: true),
                    FormVersionId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormAnswer", x => x.Id);
                    table.UniqueConstraint("AK_FormAnswer_Id_QuestionId", x => new { x.Id, x.QuestionId });
                    table.CheckConstraint("CK_FormAnswer_OneValue", "(CASE WHEN [TextValue] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [NumberValue] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [ChoiceCode] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [FileId] IS NULL THEN 0 ELSE 1 END)<=1");
                    table.ForeignKey(
                        name: "FK_FormAnswer_FormQuestion_QuestionId_FormVersionId",
                        columns: x => new { x.QuestionId, x.FormVersionId },
                        principalSchema: "forms",
                        principalTable: "FormQuestion",
                        principalColumns: new[] { "Id", "FormVersionId" });
                    table.ForeignKey(
                        name: "FK_FormAnswer_FormResponse_ResponseId_FormVersionId",
                        columns: x => new { x.ResponseId, x.FormVersionId },
                        principalSchema: "forms",
                        principalTable: "FormResponse",
                        principalColumns: new[] { "Id", "FormVersionId" });
                    table.ForeignKey(
                        name: "FK_FormAnswer_SecureFile_FileId",
                        column: x => x.FileId,
                        principalSchema: "files",
                        principalTable: "SecureFile",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FormAnswerChoice",
                schema: "forms",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AnswerId = table.Column<long>(type: "bigint", nullable: false),
                    OptionId = table.Column<long>(type: "bigint", nullable: false),
                    QuestionId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormAnswerChoice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FormAnswerChoice_FormAnswer_AnswerId_QuestionId",
                        columns: x => new { x.AnswerId, x.QuestionId },
                        principalSchema: "forms",
                        principalTable: "FormAnswer",
                        principalColumns: new[] { "Id", "QuestionId" });
                    table.ForeignKey(
                        name: "FK_FormAnswerChoice_FormQuestionOption_OptionId_QuestionId",
                        columns: x => new { x.OptionId, x.QuestionId },
                        principalSchema: "forms",
                        principalTable: "FormQuestionOption",
                        principalColumns: new[] { "Id", "QuestionId" });
                });

            migrationBuilder.CreateIndex(
                name: "IX_Competition_InitiativeId_Status",
                schema: "forms",
                table: "Competition",
                columns: new[] { "InitiativeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Competition_PublicId",
                schema: "forms",
                table: "Competition",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionCriterion_CompetitionId_CriterionCode_RubricVersion",
                schema: "forms",
                table: "CompetitionCriterion",
                columns: new[] { "CompetitionId", "CriterionCode", "RubricVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionCriterionScore_CriterionId_CompetitionId_RubricVersion",
                schema: "forms",
                table: "CompetitionCriterionScore",
                columns: new[] { "CriterionId", "CompetitionId", "RubricVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionCriterionScore_JudgmentId_CompetitionId_RubricVersion",
                schema: "forms",
                table: "CompetitionCriterionScore",
                columns: new[] { "JudgmentId", "CompetitionId", "RubricVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionCriterionScore_JudgmentId_CriterionId",
                schema: "forms",
                table: "CompetitionCriterionScore",
                columns: new[] { "JudgmentId", "CriterionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionEntry_CompetitionId_PersonId_EntryNo",
                schema: "forms",
                table: "CompetitionEntry",
                columns: new[] { "CompetitionId", "PersonId", "EntryNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionEntry_CompetitionId_Status",
                schema: "forms",
                table: "CompetitionEntry",
                columns: new[] { "CompetitionId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionEntry_FileId",
                schema: "forms",
                table: "CompetitionEntry",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionEntry_PersonId",
                schema: "forms",
                table: "CompetitionEntry",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionEntry_PublicId",
                schema: "forms",
                table: "CompetitionEntry",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionJudgment_EntryId_CompetitionId",
                schema: "forms",
                table: "CompetitionJudgment",
                columns: new[] { "EntryId", "CompetitionId" });

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionJudgment_EntryId_JudgePersonId_RubricVersion",
                schema: "forms",
                table: "CompetitionJudgment",
                columns: new[] { "EntryId", "JudgePersonId", "RubricVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompetitionJudgment_JudgePersonId",
                schema: "forms",
                table: "CompetitionJudgment",
                column: "JudgePersonId");

            migrationBuilder.CreateIndex(
                name: "IX_Form_InitiativeId_Status",
                schema: "forms",
                table: "Form",
                columns: new[] { "InitiativeId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Form_PublicId",
                schema: "forms",
                table: "Form",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswer_FileId",
                schema: "forms",
                table: "FormAnswer",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswer_QuestionId_FormVersionId",
                schema: "forms",
                table: "FormAnswer",
                columns: new[] { "QuestionId", "FormVersionId" });

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswer_ResponseId_FormVersionId",
                schema: "forms",
                table: "FormAnswer",
                columns: new[] { "ResponseId", "FormVersionId" });

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswer_ResponseId_QuestionId",
                schema: "forms",
                table: "FormAnswer",
                columns: new[] { "ResponseId", "QuestionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswerChoice_AnswerId_OptionId",
                schema: "forms",
                table: "FormAnswerChoice",
                columns: new[] { "AnswerId", "OptionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswerChoice_AnswerId_QuestionId",
                schema: "forms",
                table: "FormAnswerChoice",
                columns: new[] { "AnswerId", "QuestionId" });

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswerChoice_OptionId_QuestionId",
                schema: "forms",
                table: "FormAnswerChoice",
                columns: new[] { "OptionId", "QuestionId" });

            migrationBuilder.CreateIndex(
                name: "IX_FormQuestion_FormVersionId_QuestionKey",
                schema: "forms",
                table: "FormQuestion",
                columns: new[] { "FormVersionId", "QuestionKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormQuestionOption_QuestionId_OptionCode",
                schema: "forms",
                table: "FormQuestionOption",
                columns: new[] { "QuestionId", "OptionCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormQuestionOption_QuestionId_SortOrder",
                schema: "forms",
                table: "FormQuestionOption",
                columns: new[] { "QuestionId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormResponse_FormVersionId_PersonId_ResponseNo",
                schema: "forms",
                table: "FormResponse",
                columns: new[] { "FormVersionId", "PersonId", "ResponseNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormResponse_FormVersionId_Status",
                schema: "forms",
                table: "FormResponse",
                columns: new[] { "FormVersionId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_FormResponse_PersonId",
                schema: "forms",
                table: "FormResponse",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_FormResponse_PublicId",
                schema: "forms",
                table: "FormResponse",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormVersion_FormId_VersionNo",
                schema: "forms",
                table: "FormVersion",
                columns: new[] { "FormId", "VersionNo" },
                unique: true);

            foreach (var batch in ModuleSql.Batches("FormGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CompetitionCriterionScore",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "FormAnswerChoice",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "CompetitionCriterion",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "CompetitionJudgment",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "FormAnswer",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "FormQuestionOption",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "CompetitionEntry",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "FormResponse",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "FormQuestion",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "Competition",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "FormVersion",
                schema: "forms");

            migrationBuilder.DropTable(
                name: "Form",
                schema: "forms");
        }
    }
}
