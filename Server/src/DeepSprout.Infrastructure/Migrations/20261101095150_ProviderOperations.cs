using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProviderOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.CreateTable(
                name: "CampCompletion",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    BookingId = table.Column<long>(type: "bigint", nullable: false),
                    RuleRevisionId = table.Column<long>(type: "bigint", nullable: false),
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
                    table.PrimaryKey("PK_CampCompletion", x => x.Id);
                    table.CheckConstraint("CK_CampCompletion_Status", "[Status] IN (N'Pending',N'Completed',N'NotMet',N'Corrected')");
                    table.ForeignKey(
                        name: "FK_CampCompletion_EvidenceEvent_EvidenceEventId",
                        column: x => x.EvidenceEventId,
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CampCompletion_ExperienceBooking_BookingId_ExperienceId",
                        columns: x => new { x.BookingId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ExperienceBooking",
                        principalColumns: new[] { "Id", "ExperienceId" });
                    table.ForeignKey(
                        name: "FK_CampCompletion_ExperienceRevision_RuleRevisionId_ExperienceId",
                        columns: x => new { x.RuleRevisionId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ExperienceRevision",
                        principalColumns: new[] { "Id", "ExperienceId" });
                    table.ForeignKey(
                        name: "FK_CampCompletion_Person_EvaluatorPersonId",
                        column: x => x.EvaluatorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProviderAttendance",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    BookingId = table.Column<long>(type: "bigint", nullable: false),
                    SessionId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Method = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    RecordedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    EvidenceEventId = table.Column<long>(type: "bigint", nullable: true),
                    RecordedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderAttendance", x => x.Id);
                    table.CheckConstraint("CK_ProviderAttendance_Status", "[Status] IN (N'Present',N'Late',N'Absent',N'NotRecorded')");
                    table.ForeignKey(
                        name: "FK_ProviderAttendance_EvidenceEvent_EvidenceEventId",
                        column: x => x.EvidenceEventId,
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderAttendance_ExperienceBooking_BookingId_ExperienceId",
                        columns: x => new { x.BookingId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ExperienceBooking",
                        principalColumns: new[] { "Id", "ExperienceId" });
                    table.ForeignKey(
                        name: "FK_ProviderAttendance_ExperienceSession_SessionId_ExperienceId",
                        columns: x => new { x.SessionId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ExperienceSession",
                        principalColumns: new[] { "Id", "ExperienceId" });
                    table.ForeignKey(
                        name: "FK_ProviderAttendance_Person_RecordedByPersonId",
                        column: x => x.RecordedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProviderIncident",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    BookingId = table.Column<long>(type: "bigint", nullable: true),
                    ReportedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    FileId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderIncident", x => x.Id);
                    table.CheckConstraint("CK_ProviderIncident_Status", "[Status] IN (N'Open',N'Reviewed',N'Closed')");
                    table.ForeignKey(
                        name: "FK_ProviderIncident_ExperienceBooking_BookingId_ExperienceId",
                        columns: x => new { x.BookingId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ExperienceBooking",
                        principalColumns: new[] { "Id", "ExperienceId" });
                    table.ForeignKey(
                        name: "FK_ProviderIncident_Experience_ExperienceId",
                        column: x => x.ExperienceId,
                        principalSchema: "provider",
                        principalTable: "Experience",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderIncident_Person_ReportedByPersonId",
                        column: x => x.ReportedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderIncident_SecureFile_FileId",
                        column: x => x.FileId,
                        principalSchema: "files",
                        principalTable: "SecureFile",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProviderStaffInvitation",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    TokenHash = table.Column<byte[]>(type: "varbinary(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    InvitedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderStaffInvitation", x => x.Id);
                    table.UniqueConstraint("AK_ProviderStaffInvitation_Id_ExperienceId", x => new { x.Id, x.ExperienceId });
                    table.CheckConstraint("CK_ProviderStaffInvitation_Status", "[Status] IN (N'Pending',N'Accepted',N'Expired',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_ProviderStaffInvitation_Experience_ExperienceId",
                        column: x => x.ExperienceId,
                        principalSchema: "provider",
                        principalTable: "Experience",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderStaffInvitation_Person_InvitedByPersonId",
                        column: x => x.InvitedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProviderAttendanceCorrection",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttendanceId = table.Column<long>(type: "bigint", nullable: false),
                    OldStatus = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    NewStatus = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CorrectedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CorrectedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderAttendanceCorrection", x => x.Id);
                    table.CheckConstraint("CK_ProviderAttendanceCorrection_Status", "[OldStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded') AND [NewStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded')");
                    table.ForeignKey(
                        name: "FK_ProviderAttendanceCorrection_Person_CorrectedByPersonId",
                        column: x => x.CorrectedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderAttendanceCorrection_ProviderAttendance_AttendanceId",
                        column: x => x.AttendanceId,
                        principalSchema: "provider",
                        principalTable: "ProviderAttendance",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProviderStaffAppointment",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    InvitationId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    AcceptedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderStaffAppointment", x => x.Id);
                    table.UniqueConstraint("AK_ProviderStaffAppointment_Id_ExperienceId", x => new { x.Id, x.ExperienceId });
                    table.CheckConstraint("CK_ProviderStaffAppointment_Revoked", "([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)");
                    table.CheckConstraint("CK_ProviderStaffAppointment_Status", "[Status] IN (N'Active',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_ProviderStaffAppointment_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderStaffAppointment_ProviderStaffInvitation_InvitationId_ExperienceId",
                        columns: x => new { x.InvitationId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ProviderStaffInvitation",
                        principalColumns: new[] { "Id", "ExperienceId" });
                });

            migrationBuilder.CreateTable(
                name: "ProviderAppointmentSession",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    AppointmentId = table.Column<long>(type: "bigint", nullable: false),
                    SessionId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderAppointmentSession", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderAppointmentSession_ExperienceSession_SessionId_ExperienceId",
                        columns: x => new { x.SessionId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ExperienceSession",
                        principalColumns: new[] { "Id", "ExperienceId" });
                    table.ForeignKey(
                        name: "FK_ProviderAppointmentSession_ProviderStaffAppointment_AppointmentId_ExperienceId",
                        columns: x => new { x.AppointmentId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ProviderStaffAppointment",
                        principalColumns: new[] { "Id", "ExperienceId" });
                });

            migrationBuilder.CreateTable(
                name: "ProviderCohort",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    SupervisorAppointmentId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderCohort", x => x.Id);
                    table.UniqueConstraint("AK_ProviderCohort_Id_ExperienceId", x => new { x.Id, x.ExperienceId });
                    table.CheckConstraint("CK_ProviderCohort_Status", "[Status] IN (N'Active',N'Closed')");
                    table.ForeignKey(
                        name: "FK_ProviderCohort_ProviderStaffAppointment_SupervisorAppointmentId_ExperienceId",
                        columns: x => new { x.SupervisorAppointmentId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ProviderStaffAppointment",
                        principalColumns: new[] { "Id", "ExperienceId" });
                });

            migrationBuilder.CreateTable(
                name: "ProviderCohortMember",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CohortId = table.Column<long>(type: "bigint", nullable: false),
                    BookingId = table.Column<long>(type: "bigint", nullable: false),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    JoinedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    LeftAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderCohortMember", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderCohortMember_ExperienceBooking_BookingId_ExperienceId",
                        columns: x => new { x.BookingId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ExperienceBooking",
                        principalColumns: new[] { "Id", "ExperienceId" });
                    table.ForeignKey(
                        name: "FK_ProviderCohortMember_ProviderCohort_CohortId_ExperienceId",
                        columns: x => new { x.CohortId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ProviderCohort",
                        principalColumns: new[] { "Id", "ExperienceId" });
                });

            migrationBuilder.CreateIndex(
                name: "IX_CampCompletion_BookingId",
                schema: "provider",
                table: "CampCompletion",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CampCompletion_BookingId_ExperienceId",
                schema: "provider",
                table: "CampCompletion",
                columns: new[] { "BookingId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_CampCompletion_EvaluatorPersonId",
                schema: "provider",
                table: "CampCompletion",
                column: "EvaluatorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_CampCompletion_EvidenceEventId",
                schema: "provider",
                table: "CampCompletion",
                column: "EvidenceEventId");

            migrationBuilder.CreateIndex(
                name: "IX_CampCompletion_RuleRevisionId_ExperienceId",
                schema: "provider",
                table: "CampCompletion",
                columns: new[] { "RuleRevisionId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_CampCompletion_Status_EvaluatedAtUtc",
                schema: "provider",
                table: "CampCompletion",
                columns: new[] { "Status", "EvaluatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAppointmentSession_AppointmentId_ExperienceId",
                schema: "provider",
                table: "ProviderAppointmentSession",
                columns: new[] { "AppointmentId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAppointmentSession_AppointmentId_SessionId",
                schema: "provider",
                table: "ProviderAppointmentSession",
                columns: new[] { "AppointmentId", "SessionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAppointmentSession_SessionId_ExperienceId",
                schema: "provider",
                table: "ProviderAppointmentSession",
                columns: new[] { "SessionId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAttendance_BookingId_ExperienceId",
                schema: "provider",
                table: "ProviderAttendance",
                columns: new[] { "BookingId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAttendance_BookingId_SessionId",
                schema: "provider",
                table: "ProviderAttendance",
                columns: new[] { "BookingId", "SessionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAttendance_EvidenceEventId",
                schema: "provider",
                table: "ProviderAttendance",
                column: "EvidenceEventId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAttendance_RecordedByPersonId",
                schema: "provider",
                table: "ProviderAttendance",
                column: "RecordedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAttendance_SessionId_ExperienceId",
                schema: "provider",
                table: "ProviderAttendance",
                columns: new[] { "SessionId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAttendance_SessionId_Status",
                schema: "provider",
                table: "ProviderAttendance",
                columns: new[] { "SessionId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAttendanceCorrection_AttendanceId_CorrectedAtUtc",
                schema: "provider",
                table: "ProviderAttendanceCorrection",
                columns: new[] { "AttendanceId", "CorrectedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAttendanceCorrection_CorrectedByPersonId",
                schema: "provider",
                table: "ProviderAttendanceCorrection",
                column: "CorrectedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCohort_ExperienceId_Status",
                schema: "provider",
                table: "ProviderCohort",
                columns: new[] { "ExperienceId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCohort_SupervisorAppointmentId_ExperienceId",
                schema: "provider",
                table: "ProviderCohort",
                columns: new[] { "SupervisorAppointmentId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCohortMember_BookingId",
                schema: "provider",
                table: "ProviderCohortMember",
                column: "BookingId",
                unique: true,
                filter: "[LeftAtUtc] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCohortMember_BookingId_ExperienceId",
                schema: "provider",
                table: "ProviderCohortMember",
                columns: new[] { "BookingId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCohortMember_CohortId_ExperienceId",
                schema: "provider",
                table: "ProviderCohortMember",
                columns: new[] { "CohortId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCohortMember_CohortId_LeftAtUtc",
                schema: "provider",
                table: "ProviderCohortMember",
                columns: new[] { "CohortId", "LeftAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderIncident_BookingId_ExperienceId",
                schema: "provider",
                table: "ProviderIncident",
                columns: new[] { "BookingId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderIncident_ExperienceId_OccurredAtUtc",
                schema: "provider",
                table: "ProviderIncident",
                columns: new[] { "ExperienceId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderIncident_FileId",
                schema: "provider",
                table: "ProviderIncident",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderIncident_PublicId",
                schema: "provider",
                table: "ProviderIncident",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderIncident_ReportedByPersonId",
                schema: "provider",
                table: "ProviderIncident",
                column: "ReportedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderStaffAppointment_ExperienceId_PersonId",
                schema: "provider",
                table: "ProviderStaffAppointment",
                columns: new[] { "ExperienceId", "PersonId" },
                unique: true,
                filter: "[Status]=N'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderStaffAppointment_InvitationId_ExperienceId",
                schema: "provider",
                table: "ProviderStaffAppointment",
                columns: new[] { "InvitationId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderStaffAppointment_PersonId_Status",
                schema: "provider",
                table: "ProviderStaffAppointment",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderStaffInvitation_ExperienceId_NormalizedEmail",
                schema: "provider",
                table: "ProviderStaffInvitation",
                columns: new[] { "ExperienceId", "NormalizedEmail" },
                unique: true,
                filter: "[Status]=N'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderStaffInvitation_InvitedByPersonId",
                schema: "provider",
                table: "ProviderStaffInvitation",
                column: "InvitedByPersonId");

            foreach (var batch in ModuleSql.Batches("ProviderOperationsGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CampCompletion",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderAppointmentSession",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderAttendanceCorrection",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderCohortMember",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderIncident",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderAttendance",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderCohort",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderStaffAppointment",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderStaffInvitation",
                schema: "provider");
        }
    }
}
