using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialM1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'M1 migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "ops");

            migrationBuilder.EnsureSchema(
                name: "iam");

            migrationBuilder.EnsureSchema(
                name: "institution");

            migrationBuilder.EnsureSchema(
                name: "files");

            migrationBuilder.CreateTable(
                name: "Institution",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CountryCode = table.Column<string>(type: "char(2)", nullable: false),
                    HeadquartersCity = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Institution", x => x.Id);
                    table.CheckConstraint("CK_Institution_Status", "[Status] IN (N'Applied',N'Verified',N'Suspended',N'Closed')");
                });

            migrationBuilder.CreateTable(
                name: "Person",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    DisplayName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    IndividualEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Person", x => x.Id);
                    table.CheckConstraint("CK_Person_Status", "[Status] IN (N'Active',N'Suspended',N'Closed')");
                });

            migrationBuilder.CreateTable(
                name: "Initiative",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    InstitutionId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Mode = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Capacity = table.Column<short>(type: "smallint", nullable: true),
                    TimeZoneId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    EndsAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    WithdrawalCutoffAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Initiative", x => x.Id);
                    table.UniqueConstraint("AK_Initiative_Id_InstitutionId", x => new { x.Id, x.InstitutionId });
                    table.CheckConstraint("CK_Initiative_Capacity", "[Capacity] IS NULL OR [Capacity] BETWEEN 1 AND 135");
                    table.CheckConstraint("CK_Initiative_Cutoff", "[WithdrawalCutoffAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [WithdrawalCutoffAtUtc]<[StartsAtUtc])");
                    table.CheckConstraint("CK_Initiative_End", "[EndsAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [EndsAtUtc]>[StartsAtUtc])");
                    table.CheckConstraint("CK_Initiative_Published", "[Status]<>N'Published' OR ([Title] IS NOT NULL AND [Mode] IS NOT NULL AND [Capacity] IS NOT NULL AND [TimeZoneId] IS NOT NULL AND [StartsAtUtc] IS NOT NULL AND [EndsAtUtc] IS NOT NULL AND [WithdrawalCutoffAtUtc] IS NOT NULL)");
                    table.CheckConstraint("CK_Initiative_Status", "[Status] IN (N'Draft',N'Published',N'Closed',N'Completed',N'Cancelled',N'Archived')");
                    table.ForeignKey(
                        name: "FK_Initiative_Institution_InstitutionId",
                        column: x => x.InstitutionId,
                        principalSchema: "institution",
                        principalTable: "Institution",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "AuditEvent",
                schema: "ops",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActorPersonId = table.Column<long>(type: "bigint", nullable: true),
                    SelectedGrantKind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    SelectedGrantId = table.Column<long>(type: "bigint", nullable: true),
                    ResourceKind = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ResourcePublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    BeforeStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    AfterStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    BeforeHash = table.Column<byte[]>(type: "varbinary(32)", maxLength: 32, nullable: true),
                    AfterHash = table.Column<byte[]>(type: "varbinary(32)", maxLength: 32, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    AtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CorrelationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditEvent", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditEvent_Person_ActorPersonId",
                        column: x => x.ActorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ConsentRecord",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    PurposeCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    NoticeVersion = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Decision = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    EvidenceRef = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    DecidedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsentRecord", x => x.Id);
                    table.CheckConstraint("CK_ConsentRecord_Decision", "[Decision] IN (N'Accepted',N'Withdrawn')");
                    table.ForeignKey(
                        name: "FK_ConsentRecord_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "GlobalGrant",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Capability = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    GrantedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GlobalGrant", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GlobalGrant_Person_GrantedByPersonId",
                        column: x => x.GrantedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GlobalGrant_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OtpChallenge",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CodeHash = table.Column<byte[]>(type: "varbinary(64)", maxLength: 64, nullable: false),
                    AttemptCount = table.Column<short>(type: "smallint", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UsedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OtpChallenge", x => x.Id);
                    table.CheckConstraint("CK_OtpChallenge_Attempts", "[AttemptCount] >= 0");
                    table.CheckConstraint("CK_OtpChallenge_Status", "[Status] IN (N'Issued',N'Used',N'Expired')");
                    table.ForeignKey(
                        name: "FK_OtpChallenge_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PasswordCredential",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Hash = table.Column<byte[]>(type: "varbinary(512)", maxLength: 512, nullable: false),
                    Algorithm = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Parameters = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordCredential", x => x.Id);
                    table.CheckConstraint("CK_PasswordCredential_Status", "[Status] IN (N'Active',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_PasswordCredential_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PersonEmail",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    VerifiedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonEmail", x => x.Id);
                    table.CheckConstraint("CK_PersonEmail_Status", "[Status] IN (N'Pending',N'Verified',N'Retired')");
                    table.CheckConstraint("CK_PersonEmail_Verified", "[Status] <> N'Verified' OR [VerifiedAtUtc] IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_PersonEmail_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RepresentativeMembership",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InstitutionId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    GrantedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepresentativeMembership", x => x.Id);
                    table.CheckConstraint("CK_RepresentativeMembership_Revoked", "([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)");
                    table.CheckConstraint("CK_RepresentativeMembership_Status", "[Status] IN (N'Active',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_RepresentativeMembership_Institution_InstitutionId",
                        column: x => x.InstitutionId,
                        principalSchema: "institution",
                        principalTable: "Institution",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RepresentativeMembership_Person_GrantedByPersonId",
                        column: x => x.GrantedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RepresentativeMembership_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SecureFile",
                schema: "files",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerPersonId = table.Column<long>(type: "bigint", nullable: true),
                    Purpose = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ObjectKey = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    MimeType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Bytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256 = table.Column<byte[]>(type: "varbinary(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecureFile", x => x.Id);
                    table.CheckConstraint("CK_SecureFile_Bytes", "[Bytes] > 0");
                    table.CheckConstraint("CK_SecureFile_Status", "[Status] IN (N'Pending',N'Available',N'Quarantined',N'Deleted')");
                    table.ForeignKey(
                        name: "FK_SecureFile_Person_OwnerPersonId",
                        column: x => x.OwnerPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeRevision",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    RevisionNo = table.Column<int>(type: "int", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(1200)", maxLength: 1200, nullable: false),
                    AudienceCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    CoverageCode = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    CostKind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(19,4)", nullable: true),
                    Currency = table.Column<string>(type: "char(3)", nullable: true),
                    CompletionPolicyRef = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Capacity = table.Column<short>(type: "smallint", nullable: false),
                    TimeZoneId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    EndsAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    WithdrawalCutoffAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    PublishedSnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeRevision", x => x.Id);
                    table.UniqueConstraint("AK_InitiativeRevision_Id_InitiativeId", x => new { x.Id, x.InitiativeId });
                    table.CheckConstraint("CK_InitiativeRevision_Cost", "([CostKind]=N'Free' AND [Price] IS NULL AND [Currency] IS NULL) OR ([CostKind]=N'Paid' AND [Price]>0 AND [Currency] IS NOT NULL)");
                    table.CheckConstraint("CK_InitiativeRevision_Json", "ISJSON([PublishedSnapshotJson])=1");
                    table.CheckConstraint("CK_InitiativeRevision_No", "[RevisionNo]>0");
                    table.CheckConstraint("CK_InitiativeRevision_Times", "[Capacity] BETWEEN 1 AND 135 AND [EndsAtUtc]>[StartsAtUtc] AND [WithdrawalCutoffAtUtc]<[StartsAtUtc]");
                    table.ForeignKey(
                        name: "FK_InitiativeRevision_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeStaffInvitation",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    TokenHash = table.Column<byte[]>(type: "varbinary(64)", maxLength: 64, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    InvitedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeStaffInvitation", x => x.Id);
                    table.UniqueConstraint("AK_InitiativeStaffInvitation_Id_InitiativeId_Role", x => new { x.Id, x.InitiativeId, x.Role });
                    table.CheckConstraint("CK_InitiativeStaffInvitation_Role", "[Role] IN (N'Supervisor',N'Coach')");
                    table.CheckConstraint("CK_InitiativeStaffInvitation_Status", "[Status] IN (N'Pending',N'Accepted',N'Declined',N'Expired',N'Cancelled',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_InitiativeStaffInvitation_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InitiativeStaffInvitation_Person_InvitedByPersonId",
                        column: x => x.InvitedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InstitutionVerificationCase",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InstitutionId = table.Column<long>(type: "bigint", nullable: false),
                    ApplicantPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    EvidenceFileId = table.Column<long>(type: "bigint", nullable: true),
                    DecidedByPersonId = table.Column<long>(type: "bigint", nullable: true),
                    DecisionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    DecidedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstitutionVerificationCase", x => x.Id);
                    table.CheckConstraint("CK_InstitutionVerificationCase_Status", "[Status] IN (N'Submitted',N'MoreInfo',N'Approved',N'Rejected')");
                    table.ForeignKey(
                        name: "FK_InstitutionVerificationCase_Institution_InstitutionId",
                        column: x => x.InstitutionId,
                        principalSchema: "institution",
                        principalTable: "Institution",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InstitutionVerificationCase_Person_ApplicantPersonId",
                        column: x => x.ApplicantPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InstitutionVerificationCase_Person_DecidedByPersonId",
                        column: x => x.DecidedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InstitutionVerificationCase_SecureFile_EvidenceFileId",
                        column: x => x.EvidenceFileId,
                        principalSchema: "files",
                        principalTable: "SecureFile",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeApplication",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    TermsRevisionId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    AttemptNo = table.Column<int>(type: "int", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeApplication", x => x.Id);
                    table.UniqueConstraint("AK_InitiativeApplication_Id_InitiativeId", x => new { x.Id, x.InitiativeId });
                    table.UniqueConstraint("AK_InitiativeApplication_Id_InitiativeId_PersonId", x => new { x.Id, x.InitiativeId, x.PersonId });
                    table.UniqueConstraint("AK_InitiativeApplication_Id_InitiativeId_TermsRevisionId", x => new { x.Id, x.InitiativeId, x.TermsRevisionId });
                    table.CheckConstraint("CK_InitiativeApplication_Attempt", "[AttemptNo]>0");
                    table.CheckConstraint("CK_InitiativeApplication_Status", "[Status] IN (N'Pending',N'Queued',N'Offered',N'Accepted',N'Rejected',N'Withdrawn',N'Blocked')");
                    table.ForeignKey(
                        name: "FK_InitiativeApplication_InitiativeRevision_TermsRevisionId_InitiativeId",
                        columns: x => new { x.TermsRevisionId, x.InitiativeId },
                        principalSchema: "institution",
                        principalTable: "InitiativeRevision",
                        principalColumns: new[] { "Id", "InitiativeId" });
                    table.ForeignKey(
                        name: "FK_InitiativeApplication_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InitiativeApplication_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeDraft",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    BaseRevisionId = table.Column<long>(type: "bigint", nullable: true),
                    LastSavedStage = table.Column<byte>(type: "tinyint", nullable: false),
                    Stage1Json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Stage2Json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Stage3Json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Stage4Json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Stage5Json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Stage6Json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    UpdatedByPersonId = table.Column<long>(type: "bigint", nullable: false),
                    PublishedRevisionId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeDraft", x => x.Id);
                    table.UniqueConstraint("AK_InitiativeDraft_Id_InitiativeId", x => new { x.Id, x.InitiativeId });
                    table.CheckConstraint("CK_InitiativeDraft_Json1", "[Stage1Json] IS NULL OR ISJSON([Stage1Json])=1");
                    table.CheckConstraint("CK_InitiativeDraft_Json2", "[Stage2Json] IS NULL OR ISJSON([Stage2Json])=1");
                    table.CheckConstraint("CK_InitiativeDraft_Json3", "[Stage3Json] IS NULL OR ISJSON([Stage3Json])=1");
                    table.CheckConstraint("CK_InitiativeDraft_Json4", "[Stage4Json] IS NULL OR ISJSON([Stage4Json])=1");
                    table.CheckConstraint("CK_InitiativeDraft_Json5", "[Stage5Json] IS NULL OR ISJSON([Stage5Json])=1");
                    table.CheckConstraint("CK_InitiativeDraft_Json6", "[Stage6Json] IS NULL OR ISJSON([Stage6Json])=1");
                    table.CheckConstraint("CK_InitiativeDraft_Published", "[Status]<>N'Published' OR [PublishedRevisionId] IS NOT NULL");
                    table.CheckConstraint("CK_InitiativeDraft_Stage", "[LastSavedStage] BETWEEN 1 AND 6");
                    table.CheckConstraint("CK_InitiativeDraft_Status", "[Status] IN (N'Draft',N'Published',N'Abandoned')");
                    table.ForeignKey(
                        name: "FK_InitiativeDraft_InitiativeRevision_BaseRevisionId_InitiativeId",
                        columns: x => new { x.BaseRevisionId, x.InitiativeId },
                        principalSchema: "institution",
                        principalTable: "InitiativeRevision",
                        principalColumns: new[] { "Id", "InitiativeId" });
                    table.ForeignKey(
                        name: "FK_InitiativeDraft_InitiativeRevision_PublishedRevisionId_InitiativeId",
                        columns: x => new { x.PublishedRevisionId, x.InitiativeId },
                        principalSchema: "institution",
                        principalTable: "InitiativeRevision",
                        principalColumns: new[] { "Id", "InitiativeId" });
                    table.ForeignKey(
                        name: "FK_InitiativeDraft_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InitiativeDraft_Person_UpdatedByPersonId",
                        column: x => x.UpdatedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeStaffAppointment",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    InvitationId = table.Column<long>(type: "bigint", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    AcceptedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeStaffAppointment", x => x.Id);
                    table.UniqueConstraint("AK_InitiativeStaffAppointment_Id_InitiativeId", x => new { x.Id, x.InitiativeId });
                    table.CheckConstraint("CK_InitiativeStaffAppointment_Revoked", "([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)");
                    table.CheckConstraint("CK_InitiativeStaffAppointment_Role", "[Role] IN (N'Supervisor',N'Coach')");
                    table.CheckConstraint("CK_InitiativeStaffAppointment_Status", "[Status] IN (N'Active',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_InitiativeStaffAppointment_InitiativeStaffInvitation_InvitationId_InitiativeId_Role",
                        columns: x => new { x.InvitationId, x.InitiativeId, x.Role },
                        principalSchema: "institution",
                        principalTable: "InitiativeStaffInvitation",
                        principalColumns: new[] { "Id", "InitiativeId", "Role" });
                    table.ForeignKey(
                        name: "FK_InitiativeStaffAppointment_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InitiativeStaffAppointment_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeApplicationDecision",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApplicationId = table.Column<long>(type: "bigint", nullable: false),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    DecisionNo = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    ActorPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(800)", maxLength: 800, nullable: true),
                    TermsRevisionId = table.Column<long>(type: "bigint", nullable: false),
                    AtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeApplicationDecision", x => x.Id);
                    table.CheckConstraint("CK_InitiativeApplicationDecision_Action", "[Action] IN (N'Approved',N'Rejected',N'Withdrawn',N'Queued',N'Offered',N'Blocked')");
                    table.ForeignKey(
                        name: "FK_InitiativeApplicationDecision_InitiativeApplication_ApplicationId_InitiativeId_TermsRevisionId",
                        columns: x => new { x.ApplicationId, x.InitiativeId, x.TermsRevisionId },
                        principalSchema: "institution",
                        principalTable: "InitiativeApplication",
                        principalColumns: new[] { "Id", "InitiativeId", "TermsRevisionId" });
                    table.ForeignKey(
                        name: "FK_InitiativeApplicationDecision_Person_ActorPersonId",
                        column: x => x.ActorPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "InitiativeMembership",
                schema: "institution",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    InitiativeId = table.Column<long>(type: "bigint", nullable: false),
                    ApplicationId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    AcceptedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    EndedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CapacityReleasedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    WithdrawalCutoffAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitiativeMembership", x => x.Id);
                    table.UniqueConstraint("AK_InitiativeMembership_Id_InitiativeId", x => new { x.Id, x.InitiativeId });
                    table.CheckConstraint("CK_InitiativeMembership_EndRelease", "([Status] IN (N'Accepted',N'Suspended') AND [EndedAtUtc] IS NULL AND [CapacityReleasedAtUtc] IS NULL) OR ([Status] IN (N'Withdrawn',N'Removed',N'Completed') AND [EndedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc]>=[EndedAtUtc])");
                    table.CheckConstraint("CK_InitiativeMembership_Status", "[Status] IN (N'Accepted',N'Suspended',N'Withdrawn',N'Removed',N'Completed')");
                    table.ForeignKey(
                        name: "FK_InitiativeMembership_InitiativeApplication_ApplicationId_InitiativeId_PersonId",
                        columns: x => new { x.ApplicationId, x.InitiativeId, x.PersonId },
                        principalSchema: "institution",
                        principalTable: "InitiativeApplication",
                        principalColumns: new[] { "Id", "InitiativeId", "PersonId" });
                    table.ForeignKey(
                        name: "FK_InitiativeMembership_Initiative_InitiativeId",
                        column: x => x.InitiativeId,
                        principalSchema: "institution",
                        principalTable: "Initiative",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_InitiativeMembership_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvent_ActorPersonId_AtUtc",
                schema: "ops",
                table: "AuditEvent",
                columns: new[] { "ActorPersonId", "AtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEvent_ResourceKind_ResourcePublicId_AtUtc",
                schema: "ops",
                table: "AuditEvent",
                columns: new[] { "ResourceKind", "ResourcePublicId", "AtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ConsentRecord_PersonId_PurposeCode_DecidedAtUtc",
                schema: "iam",
                table: "ConsentRecord",
                columns: new[] { "PersonId", "PurposeCode", "DecidedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_GlobalGrant_GrantedByPersonId",
                schema: "iam",
                table: "GlobalGrant",
                column: "GrantedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_GlobalGrant_PersonId_Capability",
                schema: "iam",
                table: "GlobalGrant",
                columns: new[] { "PersonId", "Capability" },
                unique: true,
                filter: "[RevokedAtUtc] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Initiative_InstitutionId_Status",
                schema: "institution",
                table: "Initiative",
                columns: new[] { "InstitutionId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Initiative_PublicId",
                schema: "institution",
                table: "Initiative",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Initiative_Status_StartsAtUtc",
                schema: "institution",
                table: "Initiative",
                columns: new[] { "Status", "StartsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplication_InitiativeId_PersonId",
                schema: "institution",
                table: "InitiativeApplication",
                columns: new[] { "InitiativeId", "PersonId" },
                unique: true,
                filter: "[Status] IN (N'Pending',N'Queued',N'Offered')");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplication_InitiativeId_PersonId_AttemptNo",
                schema: "institution",
                table: "InitiativeApplication",
                columns: new[] { "InitiativeId", "PersonId", "AttemptNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplication_InitiativeId_Status_SubmittedAtUtc",
                schema: "institution",
                table: "InitiativeApplication",
                columns: new[] { "InitiativeId", "Status", "SubmittedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplication_PersonId",
                schema: "institution",
                table: "InitiativeApplication",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplication_PublicId",
                schema: "institution",
                table: "InitiativeApplication",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplication_TermsRevisionId_InitiativeId",
                schema: "institution",
                table: "InitiativeApplication",
                columns: new[] { "TermsRevisionId", "InitiativeId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplicationDecision_ActorPersonId",
                schema: "institution",
                table: "InitiativeApplicationDecision",
                column: "ActorPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplicationDecision_ApplicationId_DecisionNo",
                schema: "institution",
                table: "InitiativeApplicationDecision",
                columns: new[] { "ApplicationId", "DecisionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplicationDecision_ApplicationId_InitiativeId_TermsRevisionId",
                schema: "institution",
                table: "InitiativeApplicationDecision",
                columns: new[] { "ApplicationId", "InitiativeId", "TermsRevisionId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeApplicationDecision_InitiativeId_AtUtc",
                schema: "institution",
                table: "InitiativeApplicationDecision",
                columns: new[] { "InitiativeId", "AtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeDraft_BaseRevisionId_InitiativeId",
                schema: "institution",
                table: "InitiativeDraft",
                columns: new[] { "BaseRevisionId", "InitiativeId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeDraft_InitiativeId",
                schema: "institution",
                table: "InitiativeDraft",
                column: "InitiativeId",
                unique: true,
                filter: "[Status] = N'Draft'");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeDraft_PublishedRevisionId_InitiativeId",
                schema: "institution",
                table: "InitiativeDraft",
                columns: new[] { "PublishedRevisionId", "InitiativeId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeDraft_UpdatedByPersonId",
                schema: "institution",
                table: "InitiativeDraft",
                column: "UpdatedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeMembership_ApplicationId",
                schema: "institution",
                table: "InitiativeMembership",
                column: "ApplicationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeMembership_ApplicationId_InitiativeId_PersonId",
                schema: "institution",
                table: "InitiativeMembership",
                columns: new[] { "ApplicationId", "InitiativeId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeMembership_InitiativeId_CapacityReleasedAtUtc_Status",
                schema: "institution",
                table: "InitiativeMembership",
                columns: new[] { "InitiativeId", "CapacityReleasedAtUtc", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeMembership_PersonId",
                schema: "institution",
                table: "InitiativeMembership",
                column: "PersonId",
                unique: true,
                filter: "[Status] IN (N'Accepted',N'Suspended')");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeMembership_PublicId",
                schema: "institution",
                table: "InitiativeMembership",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeRevision_InitiativeId_RevisionNo",
                schema: "institution",
                table: "InitiativeRevision",
                columns: new[] { "InitiativeId", "RevisionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeStaffAppointment_InitiativeId_PersonId_Role",
                schema: "institution",
                table: "InitiativeStaffAppointment",
                columns: new[] { "InitiativeId", "PersonId", "Role" },
                unique: true,
                filter: "[Status] = N'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeStaffAppointment_InvitationId",
                schema: "institution",
                table: "InitiativeStaffAppointment",
                column: "InvitationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeStaffAppointment_InvitationId_InitiativeId_Role",
                schema: "institution",
                table: "InitiativeStaffAppointment",
                columns: new[] { "InvitationId", "InitiativeId", "Role" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeStaffAppointment_PersonId_Status",
                schema: "institution",
                table: "InitiativeStaffAppointment",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeStaffInvitation_InitiativeId_NormalizedEmail_Role",
                schema: "institution",
                table: "InitiativeStaffInvitation",
                columns: new[] { "InitiativeId", "NormalizedEmail", "Role" },
                unique: true,
                filter: "[Status] = N'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeStaffInvitation_InvitedByPersonId",
                schema: "institution",
                table: "InitiativeStaffInvitation",
                column: "InvitedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_InitiativeStaffInvitation_Status_ExpiresAtUtc",
                schema: "institution",
                table: "InitiativeStaffInvitation",
                columns: new[] { "Status", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Institution_PublicId",
                schema: "institution",
                table: "Institution",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Institution_Status_Name",
                schema: "institution",
                table: "Institution",
                columns: new[] { "Status", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_InstitutionVerificationCase_ApplicantPersonId",
                schema: "institution",
                table: "InstitutionVerificationCase",
                column: "ApplicantPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_InstitutionVerificationCase_DecidedByPersonId",
                schema: "institution",
                table: "InstitutionVerificationCase",
                column: "DecidedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_InstitutionVerificationCase_EvidenceFileId",
                schema: "institution",
                table: "InstitutionVerificationCase",
                column: "EvidenceFileId");

            migrationBuilder.CreateIndex(
                name: "IX_InstitutionVerificationCase_InstitutionId",
                schema: "institution",
                table: "InstitutionVerificationCase",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_InstitutionVerificationCase_Status_CreatedAtUtc",
                schema: "institution",
                table: "InstitutionVerificationCase",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_OtpChallenge_NormalizedEmail_Purpose_ExpiresAtUtc",
                schema: "iam",
                table: "OtpChallenge",
                columns: new[] { "NormalizedEmail", "Purpose", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_OtpChallenge_PersonId",
                schema: "iam",
                table: "OtpChallenge",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordCredential_PersonId",
                schema: "iam",
                table: "PasswordCredential",
                column: "PersonId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Person_PublicId",
                schema: "iam",
                table: "Person",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Person_Status_Id",
                schema: "iam",
                table: "Person",
                columns: new[] { "Status", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_PersonEmail_NormalizedEmail",
                schema: "iam",
                table: "PersonEmail",
                column: "NormalizedEmail",
                unique: true,
                filter: "[Status] = N'Verified'");

            migrationBuilder.CreateIndex(
                name: "IX_PersonEmail_PersonId",
                schema: "iam",
                table: "PersonEmail",
                column: "PersonId",
                unique: true,
                filter: "[IsPrimary] = 1 AND [Status] = N'Verified'");

            migrationBuilder.CreateIndex(
                name: "IX_RepresentativeMembership_GrantedByPersonId",
                schema: "institution",
                table: "RepresentativeMembership",
                column: "GrantedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_RepresentativeMembership_InstitutionId_PersonId",
                schema: "institution",
                table: "RepresentativeMembership",
                columns: new[] { "InstitutionId", "PersonId" },
                unique: true,
                filter: "[RevokedAtUtc] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_RepresentativeMembership_PersonId_Status",
                schema: "institution",
                table: "RepresentativeMembership",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_SecureFile_ObjectKey",
                schema: "files",
                table: "SecureFile",
                column: "ObjectKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SecureFile_OwnerPersonId",
                schema: "files",
                table: "SecureFile",
                column: "OwnerPersonId");

            foreach (var batch in global::DeepSprout.Infrastructure.M1Sql.Batches())
                migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'M1 migration targets only DeepSprout_Validation', 1;");
            foreach (var name in new[] {
                "institution.CreateDraft", "institution.SaveDraftStage", "institution.PublishDraft",
                "institution.SubmitApplication", "institution.WithdrawApplication", "institution.RejectApplication",
                "institution.ApproveApplication", "institution.EndMembership", "institution.SetMembershipSuspension",
                "institution.AcceptStaffInvitation", "institution.RevokeStaffAppointment", "files.ReadSecureFileMetadata"
            }) migrationBuilder.Sql($"DROP PROCEDURE IF EXISTS {name};");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS institution.CanWithdraw;");
            migrationBuilder.Sql("DROP ROLE IF EXISTS deepsprout_runtime;");
            migrationBuilder.DropTable(
                name: "AuditEvent",
                schema: "ops");

            migrationBuilder.DropTable(
                name: "ConsentRecord",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "GlobalGrant",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "InitiativeApplicationDecision",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "InitiativeDraft",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "InitiativeMembership",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "InitiativeStaffAppointment",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "InstitutionVerificationCase",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "OtpChallenge",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "PasswordCredential",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "PersonEmail",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "RepresentativeMembership",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "InitiativeApplication",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "InitiativeStaffInvitation",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "SecureFile",
                schema: "files");

            migrationBuilder.DropTable(
                name: "InitiativeRevision",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "Person",
                schema: "iam");

            migrationBuilder.DropTable(
                name: "Initiative",
                schema: "institution");

            migrationBuilder.DropTable(
                name: "Institution",
                schema: "institution");
        }
    }
}
