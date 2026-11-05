using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SessionOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "session");

            migrationBuilder.CreateTable(
                name: "InitiativeCompletion",
                schema: "session",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    MembershipId = table.Column<long>(type: "bigint", nullable: false),
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
                    table.PrimaryKey("PK_InitiativeCompletion", x => x.Id);
                    table.CheckConstraint("CK_InitiativeCompletion_Status", "[Status] IN (N'Pending',N'Completed',N'NotMet',N'Corrected')");
                    table.ForeignKey(
                        name: "FK_InitiativeCompletion_EvidenceEvent_EvidenceEventId",
                        column: x => x.EvidenceEventId,
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InitiativeCompletion_InitiativeMembership_MembershipId_InitiativeId",
                        columns: x => new { x.MembershipId, x.InitiativeId },
                        principalSchema: "institution",
                        principalTable: "InitiativeMembership",
                        principalColumns: new[] { "Id", "InitiativeId" });
                    table.ForeignKey(
                        name: "FK_InitiativeCompletion_InitiativeRevision_RuleRevisionId_InitiativeId",
                        columns: x => new { x.RuleRevisionId, x.InitiativeId },
                        principalSchema: "institution",
                        principalTable: "InitiativeRevision",
                        principalColumns: new[] { "Id", "InitiativeId" });
                    table.ForeignKey(
                        name: "FK_InitiativeCompletion_Person_EvaluatorPersonId",
                        column: x => x.EvaluatorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Session",
                schema: "session",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    InstitutionId = table.Column<long>(type: "bigint", nullable: false),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    TimeZoneId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    AttendanceRequired = table.Column<bool>(type: "bit", nullable: false),
                    StartAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    EndAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Session", x => x.Id);
                    table.CheckConstraint("CK_Session_Status", "[Status] IN (N'Draft',N'Published',N'Cancelled',N'Completed')");
                    table.CheckConstraint("CK_Session_Times", "[EndAtUtc]>[StartAtUtc]");
                    table.ForeignKey(
                        name: "FK_Session_Initiative_InitiativeId_InstitutionId",
                        columns: x => new { x.InitiativeId, x.InstitutionId },
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumns: new[] { "Id", "InstitutionId" });
                    table.ForeignKey(
                        name: "FK_Session_Institution_InstitutionId",
                        column: x => x.InstitutionId,
                        principalSchema: "institution",
                        principalTable: "Institution",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeSessionDuty",
                schema: "session",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    SessionId = table.Column<long>(type: "bigint", nullable: false),
                    AppointmentId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    AssignedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeSessionDuty", x => x.Id);
                    table.CheckConstraint("CK_InitiativeSessionDuty_Status", "[Status] IN (N'Active',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_InitiativeSessionDuty_InitiativeStaffAppointment_AppointmentId_InitiativeId",
                        columns: x => new { x.AppointmentId, x.InitiativeId },
                        principalSchema: "institution",
                        principalTable: "InitiativeStaffAppointment",
                        principalColumns: new[] { "Id", "InitiativeId" });
                    table.ForeignKey(
                        name: "FK_InitiativeSessionDuty_Session_SessionId",
                        column: x => x.SessionId,
                        principalSchema: "session",
                        principalTable: "Session",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SessionCapacityPool",
                schema: "session",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<long>(type: "bigint", nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionCapacityPool", x => x.Id);
                    table.UniqueConstraint("AK_SessionCapacityPool_Id_SessionId", x => new { x.Id, x.SessionId });
                    table.CheckConstraint("CK_SessionCapacityPool_Capacity", "[Capacity]>0");
                    table.ForeignKey(
                        name: "FK_SessionCapacityPool_Session_SessionId",
                        column: x => x.SessionId,
                        principalSchema: "session",
                        principalTable: "Session",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SessionRevision",
                schema: "session",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<long>(type: "bigint", nullable: false),
                    RevisionNo = table.Column<int>(type: "int", nullable: false),
                    Venue = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ProtectedLinkRef = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CheckInBeforeMinutes = table.Column<short>(type: "smallint", nullable: false),
                    CheckInAfterMinutes = table.Column<short>(type: "smallint", nullable: false),
                    CompletionRuleRef = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionRevision", x => x.Id);
                    table.UniqueConstraint("AK_SessionRevision_Id_SessionId", x => new { x.Id, x.SessionId });
                    table.CheckConstraint("CK_SessionRevision_No", "[RevisionNo]>0");
                    table.CheckConstraint("CK_SessionRevision_Window", "[CheckInBeforeMinutes]>=0 AND [CheckInAfterMinutes]>=0");
                    table.ForeignKey(
                        name: "FK_SessionRevision_Session_SessionId",
                        column: x => x.SessionId,
                        principalSchema: "session",
                        principalTable: "Session",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "StandaloneSessionSupervisorAppointment",
                schema: "session",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    InvitedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    TokenHash = table.Column<byte[]>(type: "varbinary(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    AcceptedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StandaloneSessionSupervisorAppointment", x => x.Id);
                    table.CheckConstraint("CK_StandaloneSupervisor_Status", "[Status] IN (N'Pending',N'Active',N'Revoked',N'Expired')");
                    table.ForeignKey(
                        name: "FK_StandaloneSessionSupervisorAppointment_Person_InvitedByPersonId",
                        column: x => x.InvitedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_StandaloneSessionSupervisorAppointment_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_StandaloneSessionSupervisorAppointment_Session_SessionId",
                        column: x => x.SessionId,
                        principalSchema: "session",
                        principalTable: "Session",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SessionRegistration",
                schema: "session",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    SessionId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    PoolId = table.Column<long>(type: "bigint", nullable: false),
                    SessionRevisionId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CredentialHash = table.Column<byte[]>(type: "varbinary(32)", maxLength: 32, nullable: true),
                    RegisteredAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionRegistration", x => x.Id);
                    table.UniqueConstraint("AK_SessionRegistration_Id_PoolId", x => new { x.Id, x.PoolId });
                    table.UniqueConstraint("AK_SessionRegistration_Id_SessionId_PersonId", x => new { x.Id, x.SessionId, x.PersonId });
                    table.CheckConstraint("CK_SessionRegistration_Status", "[Status] IN (N'Pending',N'Confirmed',N'Cancelled',N'Completed')");
                    table.ForeignKey(
                        name: "FK_SessionRegistration_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SessionRegistration_SessionCapacityPool_PoolId_SessionId",
                        columns: x => new { x.PoolId, x.SessionId },
                        principalSchema: "session",
                        principalTable: "SessionCapacityPool",
                        principalColumns: new[] { "Id", "SessionId" });
                    table.ForeignKey(
                        name: "FK_SessionRegistration_SessionRevision_SessionRevisionId_SessionId",
                        columns: x => new { x.SessionRevisionId, x.SessionId },
                        principalSchema: "session",
                        principalTable: "SessionRevision",
                        principalColumns: new[] { "Id", "SessionId" });
                    table.ForeignKey(
                        name: "FK_SessionRegistration_Session_SessionId",
                        column: x => x.SessionId,
                        principalSchema: "session",
                        principalTable: "Session",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SessionAttendance",
                schema: "session",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RegistrationId = table.Column<long>(type: "bigint", nullable: false),
                    SessionId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
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
                    table.PrimaryKey("PK_SessionAttendance", x => x.Id);
                    table.CheckConstraint("CK_SessionAttendance_Status", "[Status] IN (N'Present',N'Late',N'Absent',N'NotRecorded')");
                    table.ForeignKey(
                        name: "FK_SessionAttendance_EvidenceEvent_EvidenceEventId_PersonId",
                        columns: x => new { x.EvidenceEventId, x.PersonId },
                        principalSchema: "evidence",
                        principalTable: "EvidenceEvent",
                        principalColumns: new[] { "Id", "SubjectPersonId" });
                    table.ForeignKey(
                        name: "FK_SessionAttendance_Person_RecordedByPersonId",
                        column: x => x.RecordedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SessionAttendance_SessionRegistration_RegistrationId_SessionId_PersonId",
                        columns: x => new { x.RegistrationId, x.SessionId, x.PersonId },
                        principalSchema: "session",
                        principalTable: "SessionRegistration",
                        principalColumns: new[] { "Id", "SessionId", "PersonId" });
                });

            migrationBuilder.CreateTable(
                name: "AbsenceExcuse",
                schema: "session",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    AttendanceId = table.Column<long>(type: "bigint", nullable: false),
                    SubmittedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    FileId = table.Column<long>(type: "bigint", nullable: true),
                    Recommendation = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: true),
                    RecommendedByPersonId = table.Column<long>(type: "bigint", nullable: true),
                    Decision = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: true),
                    DecidedByPersonId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbsenceExcuse", x => x.Id);
                    table.CheckConstraint("CK_AbsenceExcuse_Status", "[Status] IN (N'Submitted',N'MoreInfo',N'Recommended',N'Accepted',N'Rejected')");
                    table.ForeignKey(
                        name: "FK_AbsenceExcuse_Person_DecidedByPersonId",
                        column: x => x.DecidedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AbsenceExcuse_Person_RecommendedByPersonId",
                        column: x => x.RecommendedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AbsenceExcuse_Person_SubmittedByPersonId",
                        column: x => x.SubmittedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AbsenceExcuse_SecureFile_FileId",
                        column: x => x.FileId,
                        principalSchema: "files",
                        principalTable: "SecureFile",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AbsenceExcuse_SessionAttendance_AttendanceId",
                        column: x => x.AttendanceId,
                        principalSchema: "session",
                        principalTable: "SessionAttendance",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AttendanceCorrection",
                schema: "session",
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
                    table.PrimaryKey("PK_AttendanceCorrection", x => x.Id);
                    table.CheckConstraint("CK_AttendanceCorrection_Status", "[OldStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded') AND [NewStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded')");
                    table.ForeignKey(
                        name: "FK_AttendanceCorrection_Person_CorrectedByPersonId",
                        column: x => x.CorrectedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AttendanceCorrection_SessionAttendance_AttendanceId",
                        column: x => x.AttendanceId,
                        principalSchema: "session",
                        principalTable: "SessionAttendance",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceExcuse_AttendanceId",
                schema: "session",
                table: "AbsenceExcuse",
                column: "AttendanceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceExcuse_DecidedByPersonId",
                schema: "session",
                table: "AbsenceExcuse",
                column: "DecidedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceExcuse_FileId",
                schema: "session",
                table: "AbsenceExcuse",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceExcuse_PublicId",
                schema: "session",
                table: "AbsenceExcuse",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceExcuse_RecommendedByPersonId",
                schema: "session",
                table: "AbsenceExcuse",
                column: "RecommendedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceExcuse_Status_CreatedAtUtc",
                schema: "session",
                table: "AbsenceExcuse",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceExcuse_SubmittedByPersonId",
                schema: "session",
                table: "AbsenceExcuse",
                column: "SubmittedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceCorrection_AttendanceId_CorrectedAtUtc",
                schema: "session",
                table: "AttendanceCorrection",
                columns: new[] { "AttendanceId", "CorrectedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceCorrection_CorrectedByPersonId",
                schema: "session",
                table: "AttendanceCorrection",
                column: "CorrectedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeCompletion_EvaluatorPersonId",
                schema: "session",
                table: "InitiativeCompletion",
                column: "EvaluatorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeCompletion_EvidenceEventId",
                schema: "session",
                table: "InitiativeCompletion",
                column: "EvidenceEventId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeCompletion_MembershipId",
                schema: "session",
                table: "InitiativeCompletion",
                column: "MembershipId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeCompletion_MembershipId_InitiativeId",
                schema: "session",
                table: "InitiativeCompletion",
                columns: new[] { "MembershipId", "InitiativeId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeCompletion_RuleRevisionId_InitiativeId",
                schema: "session",
                table: "InitiativeCompletion",
                columns: new[] { "RuleRevisionId", "InitiativeId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeCompletion_Status_EvaluatedAtUtc",
                schema: "session",
                table: "InitiativeCompletion",
                columns: new[] { "Status", "EvaluatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeSessionDuty_AppointmentId_InitiativeId",
                schema: "session",
                table: "InitiativeSessionDuty",
                columns: new[] { "AppointmentId", "InitiativeId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeSessionDuty_AppointmentId_Status",
                schema: "session",
                table: "InitiativeSessionDuty",
                columns: new[] { "AppointmentId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeSessionDuty_SessionId_AppointmentId",
                schema: "session",
                table: "InitiativeSessionDuty",
                columns: new[] { "SessionId", "AppointmentId" },
                unique: true,
                filter: "[Status]=N'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_Session_Id_InitiativeId",
                schema: "session",
                table: "Session",
                columns: new[] { "Id", "InitiativeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Session_InitiativeId_InstitutionId",
                schema: "session",
                table: "Session",
                columns: new[] { "InitiativeId", "InstitutionId" });

            migrationBuilder.CreateIndex(
                name: "IX_Session_InitiativeId_StartAtUtc",
                schema: "session",
                table: "Session",
                columns: new[] { "InitiativeId", "StartAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Session_InstitutionId_StartAtUtc",
                schema: "session",
                table: "Session",
                columns: new[] { "InstitutionId", "StartAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Session_PublicId",
                schema: "session",
                table: "Session",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessionAttendance_EvidenceEventId_PersonId",
                schema: "session",
                table: "SessionAttendance",
                columns: new[] { "EvidenceEventId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionAttendance_RecordedByPersonId",
                schema: "session",
                table: "SessionAttendance",
                column: "RecordedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionAttendance_RegistrationId",
                schema: "session",
                table: "SessionAttendance",
                column: "RegistrationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessionAttendance_RegistrationId_SessionId_PersonId",
                schema: "session",
                table: "SessionAttendance",
                columns: new[] { "RegistrationId", "SessionId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionAttendance_SessionId_PersonId",
                schema: "session",
                table: "SessionAttendance",
                columns: new[] { "SessionId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessionAttendance_SessionId_Status",
                schema: "session",
                table: "SessionAttendance",
                columns: new[] { "SessionId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionCapacityPool_SessionId_Mode",
                schema: "session",
                table: "SessionCapacityPool",
                columns: new[] { "SessionId", "Mode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessionRegistration_PersonId",
                schema: "session",
                table: "SessionRegistration",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionRegistration_PoolId_SessionId",
                schema: "session",
                table: "SessionRegistration",
                columns: new[] { "PoolId", "SessionId" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionRegistration_PublicId",
                schema: "session",
                table: "SessionRegistration",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessionRegistration_SessionId_PersonId",
                schema: "session",
                table: "SessionRegistration",
                columns: new[] { "SessionId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessionRegistration_SessionId_Status_PoolId",
                schema: "session",
                table: "SessionRegistration",
                columns: new[] { "SessionId", "Status", "PoolId" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionRegistration_SessionRevisionId_SessionId",
                schema: "session",
                table: "SessionRegistration",
                columns: new[] { "SessionRevisionId", "SessionId" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionRevision_SessionId_RevisionNo",
                schema: "session",
                table: "SessionRevision",
                columns: new[] { "SessionId", "RevisionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StandaloneSessionSupervisorAppointment_InvitedByPersonId",
                schema: "session",
                table: "StandaloneSessionSupervisorAppointment",
                column: "InvitedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_StandaloneSessionSupervisorAppointment_PersonId_Status",
                schema: "session",
                table: "StandaloneSessionSupervisorAppointment",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_StandaloneSessionSupervisorAppointment_SessionId_PersonId",
                schema: "session",
                table: "StandaloneSessionSupervisorAppointment",
                columns: new[] { "SessionId", "PersonId" },
                unique: true,
                filter: "[Status]=N'Active'");

            migrationBuilder.Sql("ALTER TABLE session.InitiativeSessionDuty WITH CHECK ADD CONSTRAINT FK_InitiativeSessionDuty_Session_Initiative FOREIGN KEY (SessionId,InitiativeId) REFERENCES session.Session(Id,InitiativeId);");
            foreach (var batch in ModuleSql.Batches("SessionGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AbsenceExcuse",
                schema: "session");

            migrationBuilder.DropTable(
                name: "AttendanceCorrection",
                schema: "session");

            migrationBuilder.DropTable(
                name: "InitiativeCompletion",
                schema: "session");

            migrationBuilder.DropTable(
                name: "InitiativeSessionDuty",
                schema: "session");

            migrationBuilder.DropTable(
                name: "StandaloneSessionSupervisorAppointment",
                schema: "session");

            migrationBuilder.DropTable(
                name: "SessionAttendance",
                schema: "session");

            migrationBuilder.DropTable(
                name: "SessionRegistration",
                schema: "session");

            migrationBuilder.DropTable(
                name: "SessionCapacityPool",
                schema: "session");

            migrationBuilder.DropTable(
                name: "SessionRevision",
                schema: "session");

            migrationBuilder.DropTable(
                name: "Session",
                schema: "session");
        }
    }
}
