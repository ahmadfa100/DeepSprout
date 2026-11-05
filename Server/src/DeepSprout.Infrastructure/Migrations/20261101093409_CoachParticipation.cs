using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CoachParticipation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.CreateTable(
                name: "GroupCoachAssignment",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GroupId = table.Column<long>(type: "bigint", nullable: false),
                    CoachPersonId = table.Column<long>(type: "bigint", nullable: false),
                    InitiativeAppointmentId = table.Column<long>(type: "bigint", nullable: true),
                    AssignedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    FromUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ToUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupCoachAssignment", x => x.Id);
                    table.CheckConstraint("CK_GroupCoachAssignment_Times", "[ToUtc] IS NULL OR [ToUtc]>=[FromUtc]");
                    table.ForeignKey(
                        name: "FK_GroupCoachAssignment_InitiativeStaffAppointment_InitiativeAppointmentId",
                        column: x => x.InitiativeAppointmentId,
                        principalSchema: "institution",
                        principalTable: "InitiativeStaffAppointment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupCoachAssignment_OperationalGroup_GroupId",
                        column: x => x.GroupId,
                        principalSchema: "coach",
                        principalTable: "OperationalGroup",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupCoachAssignment_Person_AssignedByPersonId",
                        column: x => x.AssignedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupCoachAssignment_Person_CoachPersonId",
                        column: x => x.CoachPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeGroupPlacement",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    GroupId = table.Column<long>(type: "bigint", nullable: false),
                    MembershipId = table.Column<long>(type: "bigint", nullable: false),
                    MovedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    EndedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeGroupPlacement", x => x.Id);
                    table.CheckConstraint("CK_InitiativeGroupPlacement_Times", "[EndedAtUtc] IS NULL OR [EndedAtUtc]>=[StartedAtUtc]");
                    table.ForeignKey(
                        name: "FK_InitiativeGroupPlacement_InitiativeMembership_MembershipId_InitiativeId",
                        columns: x => new { x.MembershipId, x.InitiativeId },
                        principalSchema: "institution",
                        principalTable: "InitiativeMembership",
                        principalColumns: new[] { "Id", "InitiativeId" });
                    table.ForeignKey(
                        name: "FK_InitiativeGroupPlacement_OperationalGroup_GroupId",
                        column: x => x.GroupId,
                        principalSchema: "coach",
                        principalTable: "OperationalGroup",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InitiativeGroupPlacement_Person_MovedByPersonId",
                        column: x => x.MovedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProgramCompletion",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProgramId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    ProgramRevisionId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    EvaluatorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    EvidenceEventId = table.Column<long>(type: "bigint", nullable: true),
                    EvaluatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgramCompletion", x => x.Id);
                    table.CheckConstraint("CK_ProgramCompletion_Status", "[Status] IN (N'Pending',N'Completed',N'NotMet',N'Corrected')");
                    table.ForeignKey(
                        name: "FK_ProgramCompletion_CoachProgram_ProgramId",
                        column: x => x.ProgramId,
                        principalSchema: "coach",
                        principalTable: "CoachProgram",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProgramCompletion_EvidenceEvent_EvidenceEventId_PersonId",
                        columns: x => new { x.EvidenceEventId, x.PersonId },
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumns: new[] { "Id", "SubjectPersonId" });
                    table.ForeignKey(
                        name: "FK_ProgramCompletion_Person_EvaluatorPersonId",
                        column: x => x.EvaluatorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProgramCompletion_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProgramCompletion_ProgramRevision_ProgramRevisionId_ProgramId",
                        columns: x => new { x.ProgramRevisionId, x.ProgramId },
                        principalSchema: "coach",
                        principalTable: "ProgramRevision",
                        principalColumns: new[] { "Id", "ProgramId" });
                });

            migrationBuilder.CreateTable(
                name: "ProgramGroupInvitation",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GroupId = table.Column<long>(type: "bigint", nullable: false),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    TokenHash = table.Column<byte[]>(type: "varbinary(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgramGroupInvitation", x => x.Id);
                    table.CheckConstraint("CK_ProgramGroupInvitation_Status", "[Status] IN (N'Pending',N'Accepted',N'Declined',N'Expired',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_ProgramGroupInvitation_OperationalGroup_GroupId",
                        column: x => x.GroupId,
                        principalSchema: "coach",
                        principalTable: "OperationalGroup",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProgramGroupMembership",
                schema: "coach",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProgramId = table.Column<long>(type: "bigint", nullable: false),
                    GroupId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgramGroupMembership", x => x.Id);
                    table.CheckConstraint("CK_ProgramGroupMembership_Status", "[Status] IN (N'Active',N'Left',N'Removed',N'Completed')");
                    table.ForeignKey(
                        name: "FK_ProgramGroupMembership_CoachProgram_ProgramId",
                        column: x => x.ProgramId,
                        principalSchema: "coach",
                        principalTable: "CoachProgram",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProgramGroupMembership_OperationalGroup_GroupId",
                        column: x => x.GroupId,
                        principalSchema: "coach",
                        principalTable: "OperationalGroup",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProgramGroupMembership_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_GroupCoachAssignment_AssignedByPersonId",
                schema: "coach",
                table: "GroupCoachAssignment",
                column: "AssignedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupCoachAssignment_CoachPersonId_ToUtc",
                schema: "coach",
                table: "GroupCoachAssignment",
                columns: new[] { "CoachPersonId", "ToUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_GroupCoachAssignment_GroupId_CoachPersonId",
                schema: "coach",
                table: "GroupCoachAssignment",
                columns: new[] { "GroupId", "CoachPersonId" },
                unique: true,
                filter: "[ToUtc] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_GroupCoachAssignment_InitiativeAppointmentId",
                schema: "coach",
                table: "GroupCoachAssignment",
                column: "InitiativeAppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeGroupPlacement_GroupId",
                schema: "coach",
                table: "InitiativeGroupPlacement",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeGroupPlacement_InitiativeId_MembershipId",
                schema: "coach",
                table: "InitiativeGroupPlacement",
                columns: new[] { "InitiativeId", "MembershipId" },
                unique: true,
                filter: "[EndedAtUtc] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeGroupPlacement_MembershipId_InitiativeId",
                schema: "coach",
                table: "InitiativeGroupPlacement",
                columns: new[] { "MembershipId", "InitiativeId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeGroupPlacement_MovedByPersonId",
                schema: "coach",
                table: "InitiativeGroupPlacement",
                column: "MovedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramCompletion_EvaluatorPersonId",
                schema: "coach",
                table: "ProgramCompletion",
                column: "EvaluatorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramCompletion_EvidenceEventId_PersonId",
                schema: "coach",
                table: "ProgramCompletion",
                columns: new[] { "EvidenceEventId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProgramCompletion_PersonId",
                schema: "coach",
                table: "ProgramCompletion",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramCompletion_ProgramId_PersonId",
                schema: "coach",
                table: "ProgramCompletion",
                columns: new[] { "ProgramId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgramCompletion_ProgramId_Status",
                schema: "coach",
                table: "ProgramCompletion",
                columns: new[] { "ProgramId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProgramCompletion_ProgramRevisionId_ProgramId",
                schema: "coach",
                table: "ProgramCompletion",
                columns: new[] { "ProgramRevisionId", "ProgramId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProgramGroupInvitation_GroupId_NormalizedEmail",
                schema: "coach",
                table: "ProgramGroupInvitation",
                columns: new[] { "GroupId", "NormalizedEmail" },
                unique: true,
                filter: "[Status]=N'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramGroupMembership_GroupId_PersonId",
                schema: "coach",
                table: "ProgramGroupMembership",
                columns: new[] { "GroupId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgramGroupMembership_PersonId_ProgramId",
                schema: "coach",
                table: "ProgramGroupMembership",
                columns: new[] { "PersonId", "ProgramId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProgramGroupMembership_PersonId_Status",
                schema: "coach",
                table: "ProgramGroupMembership",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProgramGroupMembership_ProgramId",
                schema: "coach",
                table: "ProgramGroupMembership",
                column: "ProgramId");

            migrationBuilder.Sql("ALTER TABLE coach.InitiativeGroupPlacement WITH CHECK ADD CONSTRAINT FK_InitiativeGroupPlacement_Group_Initiative FOREIGN KEY (GroupId,InitiativeId) REFERENCES coach.OperationalGroup(Id,InitiativeId);");
            migrationBuilder.Sql("ALTER TABLE coach.ProgramGroupMembership WITH CHECK ADD CONSTRAINT FK_ProgramGroupMembership_Group_Program FOREIGN KEY (GroupId,ProgramId) REFERENCES coach.OperationalGroup(Id,ProgramId);");
            foreach (var batch in ModuleSql.Batches("CoachParticipationGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GroupCoachAssignment",
                schema: "coach");

            migrationBuilder.DropTable(
                name: "InitiativeGroupPlacement",
                schema: "coach");

            migrationBuilder.DropTable(
                name: "ProgramCompletion",
                schema: "coach");

            migrationBuilder.DropTable(
                name: "ProgramGroupInvitation",
                schema: "coach");

            migrationBuilder.DropTable(
                name: "ProgramGroupMembership",
                schema: "coach");
        }
    }
}
