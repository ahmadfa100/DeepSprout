using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EvidenceLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "evidence");

            migrationBuilder.CreateTable(
                name: "EvidenceEvent",
                schema: "evidence",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EventPublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    SourceContext = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    SourceKey = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    SubjectPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Provenance = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    SourceVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    Validity = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    InvalidatesEventId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EvidenceEvent", x => x.Id);
                    table.UniqueConstraint("AK_EvidenceEvent_Id_SubjectPersonId", x => new { x.Id, x.SubjectPersonId });
                    table.CheckConstraint("CK_EvidenceEvent_Validity", "([Validity]=N'Accepted' AND [InvalidatesEventId] IS NULL) OR ([Validity]=N'Invalidates' AND [InvalidatesEventId] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_EvidenceEvent_EvidenceEvent_InvalidatesEventId_SubjectPersonId",
                        columns: x => new { x.InvalidatesEventId, x.SubjectPersonId },
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumns: new[] { "Id", "SubjectPersonId" });
                    table.ForeignKey(
                        name: "FK_EvidenceEvent_Person_SubjectPersonId",
                        column: x => x.SubjectPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "GroupGarden",
                schema: "evidence",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: true),
                    IndependentGroupId = table.Column<long>(type: "bigint", nullable: true),
                    ProgramId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupGarden", x => x.Id);
                    table.CheckConstraint("CK_GroupGarden_Owner", "([InitiativeId] IS NOT NULL AND [IndependentGroupId] IS NULL AND [ProgramId] IS NULL) OR ([InitiativeId] IS NULL AND [IndependentGroupId] IS NOT NULL AND [ProgramId] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_GroupGarden_CoachProgram_ProgramId",
                        column: x => x.ProgramId,
                        principalSchema: "coach",
                        principalTable: "CoachProgram",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupGarden_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RewardPolicyVersion",
                schema: "evidence",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PolicyCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    VersionNo = table.Column<int>(type: "int", nullable: false),
                    RuleRef = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RewardPolicyVersion", x => x.Id);
                    table.CheckConstraint("CK_RewardPolicyVersion_No", "[VersionNo]>0");
                });

            migrationBuilder.CreateTable(
                name: "GroupRewardEntry",
                schema: "evidence",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EvidenceEventId = table.Column<long>(type: "bigint", nullable: false),
                    GroupGardenId = table.Column<long>(type: "bigint", nullable: false),
                    PolicyVersionId = table.Column<long>(type: "bigint", nullable: false),
                    EffectCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    EntryKind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Units = table.Column<short>(type: "smallint", nullable: false),
                    ReversesEntryId = table.Column<long>(type: "bigint", nullable: true),
                    DecidedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupRewardEntry", x => x.Id);
                    table.UniqueConstraint("AK_GroupRewardEntry_Id_GroupGardenId", x => new { x.Id, x.GroupGardenId });
                    table.CheckConstraint("CK_GroupRewardEntry_Kind", "([EntryKind]=N'Grant' AND [ReversesEntryId] IS NULL) OR ([EntryKind]=N'Reversal' AND [ReversesEntryId] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_GroupRewardEntry_EvidenceEvent_EvidenceEventId",
                        column: x => x.EvidenceEventId,
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupRewardEntry_GroupGarden_GroupGardenId",
                        column: x => x.GroupGardenId,
                        principalSchema: "evidence",
                        principalTable: "GroupGarden",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupRewardEntry_GroupRewardEntry_ReversesEntryId_GroupGardenId",
                        columns: x => new { x.ReversesEntryId, x.GroupGardenId },
                        principalSchema: "evidence",
                        principalTable: "GroupRewardEntry",
                        principalColumns: new[] { "Id", "GroupGardenId" });
                    table.ForeignKey(
                        name: "FK_GroupRewardEntry_RewardPolicyVersion_PolicyVersionId",
                        column: x => x.PolicyVersionId,
                        principalSchema: "evidence",
                        principalTable: "RewardPolicyVersion",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PersonalRewardEntry",
                schema: "evidence",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EvidenceEventId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    PolicyVersionId = table.Column<long>(type: "bigint", nullable: false),
                    EffectCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    EntryKind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Units = table.Column<short>(type: "smallint", nullable: false),
                    ReversesEntryId = table.Column<long>(type: "bigint", nullable: true),
                    DecidedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonalRewardEntry", x => x.Id);
                    table.UniqueConstraint("AK_PersonalRewardEntry_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_PersonalRewardEntry_Kind", "([EntryKind]=N'Grant' AND [ReversesEntryId] IS NULL) OR ([EntryKind]=N'Reversal' AND [ReversesEntryId] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_PersonalRewardEntry_EvidenceEvent_EvidenceEventId_PersonId",
                        columns: x => new { x.EvidenceEventId, x.PersonId },
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumns: new[] { "Id", "SubjectPersonId" });
                    table.ForeignKey(
                        name: "FK_PersonalRewardEntry_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PersonalRewardEntry_PersonalRewardEntry_ReversesEntryId_PersonId",
                        columns: x => new { x.ReversesEntryId, x.PersonId },
                        principalSchema: "evidence",
                        principalTable: "PersonalRewardEntry",
                        principalColumns: new[] { "Id", "PersonId" });
                    table.ForeignKey(
                        name: "FK_PersonalRewardEntry_RewardPolicyVersion_PolicyVersionId",
                        column: x => x.PolicyVersionId,
                        principalSchema: "evidence",
                        principalTable: "RewardPolicyVersion",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EvidenceEvent_EventPublicId",
                schema: "evidence",
                table: "EvidenceEvent",
                column: "EventPublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EvidenceEvent_InvalidatesEventId",
                schema: "evidence",
                table: "EvidenceEvent",
                column: "InvalidatesEventId",
                unique: true,
                filter: "[InvalidatesEventId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_EvidenceEvent_InvalidatesEventId_SubjectPersonId",
                schema: "evidence",
                table: "EvidenceEvent",
                columns: new[] { "InvalidatesEventId", "SubjectPersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_EvidenceEvent_SourceContext_SourceKey_SourceVersion",
                schema: "evidence",
                table: "EvidenceEvent",
                columns: new[] { "SourceContext", "SourceKey", "SourceVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EvidenceEvent_SubjectPersonId_OccurredAtUtc",
                schema: "evidence",
                table: "EvidenceEvent",
                columns: new[] { "SubjectPersonId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_GroupGarden_IndependentGroupId",
                schema: "evidence",
                table: "GroupGarden",
                column: "IndependentGroupId",
                unique: true,
                filter: "[IndependentGroupId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_GroupGarden_InitiativeId",
                schema: "evidence",
                table: "GroupGarden",
                column: "InitiativeId",
                unique: true,
                filter: "[InitiativeId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_GroupGarden_ProgramId",
                schema: "evidence",
                table: "GroupGarden",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupRewardEntry_EvidenceEventId_GroupGardenId_EffectCode",
                schema: "evidence",
                table: "GroupRewardEntry",
                columns: new[] { "EvidenceEventId", "GroupGardenId", "EffectCode" },
                unique: true,
                filter: "[EntryKind]=N'Grant'");

            migrationBuilder.CreateIndex(
                name: "IX_GroupRewardEntry_GroupGardenId_DecidedAtUtc",
                schema: "evidence",
                table: "GroupRewardEntry",
                columns: new[] { "GroupGardenId", "DecidedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_GroupRewardEntry_PolicyVersionId",
                schema: "evidence",
                table: "GroupRewardEntry",
                column: "PolicyVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupRewardEntry_ReversesEntryId",
                schema: "evidence",
                table: "GroupRewardEntry",
                column: "ReversesEntryId",
                unique: true,
                filter: "[ReversesEntryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_GroupRewardEntry_ReversesEntryId_GroupGardenId",
                schema: "evidence",
                table: "GroupRewardEntry",
                columns: new[] { "ReversesEntryId", "GroupGardenId" });

            migrationBuilder.CreateIndex(
                name: "IX_PersonalRewardEntry_EvidenceEventId_PersonId_EffectCode",
                schema: "evidence",
                table: "PersonalRewardEntry",
                columns: new[] { "EvidenceEventId", "PersonId", "EffectCode" },
                unique: true,
                filter: "[EntryKind]=N'Grant'");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalRewardEntry_PersonId_DecidedAtUtc",
                schema: "evidence",
                table: "PersonalRewardEntry",
                columns: new[] { "PersonId", "DecidedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PersonalRewardEntry_PolicyVersionId",
                schema: "evidence",
                table: "PersonalRewardEntry",
                column: "PolicyVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalRewardEntry_ReversesEntryId",
                schema: "evidence",
                table: "PersonalRewardEntry",
                column: "ReversesEntryId",
                unique: true,
                filter: "[ReversesEntryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalRewardEntry_ReversesEntryId_PersonId",
                schema: "evidence",
                table: "PersonalRewardEntry",
                columns: new[] { "ReversesEntryId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_RewardPolicyVersion_PolicyCode_VersionNo",
                schema: "evidence",
                table: "RewardPolicyVersion",
                columns: new[] { "PolicyCode", "VersionNo" },
                unique: true);

            foreach (var batch in ModuleSql.Batches("EvidenceGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GroupRewardEntry",
                schema: "evidence");

            migrationBuilder.DropTable(
                name: "PersonalRewardEntry",
                schema: "evidence");

            migrationBuilder.DropTable(
                name: "GroupGarden",
                schema: "evidence");

            migrationBuilder.DropTable(
                name: "EvidenceEvent",
                schema: "evidence");

            migrationBuilder.DropTable(
                name: "RewardPolicyVersion",
                schema: "evidence");
        }
    }
}
