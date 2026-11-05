using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProviderFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "provider");

            migrationBuilder.CreateTable(
                name: "Provider",
                schema: "provider",
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
                    table.PrimaryKey("PK_Provider", x => x.Id);
                    table.CheckConstraint("CK_Provider_Status", "[Status] IN (N'Applied',N'Approved',N'Suspended',N'Closed')");
                });

            migrationBuilder.CreateTable(
                name: "Experience",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    ProviderId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    TimeZoneId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    StartAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    EndAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Experience", x => x.Id);
                    table.CheckConstraint("CK_Experience_CapacityTimes", "[Capacity]>0 AND [EndAtUtc]>[StartAtUtc]");
                    table.CheckConstraint("CK_Experience_Status", "[Status] IN (N'Draft',N'Published',N'Active',N'Completed',N'Cancelled',N'Archived')");
                    table.ForeignKey(
                        name: "FK_Experience_Provider_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "provider",
                        principalTable: "Provider",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProviderMembership",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProviderId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderMembership", x => x.Id);
                    table.CheckConstraint("CK_ProviderMembership_Revocation", "([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)");
                    table.CheckConstraint("CK_ProviderMembership_Status", "[Status] IN (N'Active',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_ProviderMembership_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderMembership_Provider_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "provider",
                        principalTable: "Provider",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProviderVerificationCase",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProviderId = table.Column<long>(type: "bigint", nullable: false),
                    ApplicantPersonId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    EvidenceFileId = table.Column<long>(type: "bigint", nullable: true),
                    DecidedByPersonId = table.Column<long>(type: "bigint", nullable: true),
                    DecisionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderVerificationCase", x => x.Id);
                    table.CheckConstraint("CK_ProviderVerification_Status", "[Status] IN (N'Submitted',N'MoreInfo',N'Approved',N'Rejected')");
                    table.ForeignKey(
                        name: "FK_ProviderVerificationCase_Person_ApplicantPersonId",
                        column: x => x.ApplicantPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderVerificationCase_Person_DecidedByPersonId",
                        column: x => x.DecidedByPersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderVerificationCase_Provider_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "provider",
                        principalTable: "Provider",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProviderVerificationCase_SecureFile_EvidenceFileId",
                        column: x => x.EvidenceFileId,
                        principalSchema: "files",
                        principalTable: "SecureFile",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ExperienceRevision",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    RevisionNo = table.Column<int>(type: "int", nullable: false),
                    Venue = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    SafetyRef = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    ConsentVersion = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CostKind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(19,4)", nullable: true),
                    Currency = table.Column<string>(type: "char(3)", nullable: true),
                    CompletionRuleRef = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperienceRevision", x => x.Id);
                    table.UniqueConstraint("AK_ExperienceRevision_Id_ExperienceId", x => new { x.Id, x.ExperienceId });
                    table.CheckConstraint("CK_ExperienceRevision_Cost", "([CostKind]=N'Free' AND [Price] IS NULL AND [Currency] IS NULL) OR ([CostKind]=N'Paid' AND [Price]>0 AND [Currency] IS NOT NULL)");
                    table.CheckConstraint("CK_ExperienceRevision_No", "[RevisionNo]>0");
                    table.ForeignKey(
                        name: "FK_ExperienceRevision_Experience_ExperienceId",
                        column: x => x.ExperienceId,
                        principalSchema: "provider",
                        principalTable: "Experience",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ExperienceSession",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    EndsAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperienceSession", x => x.Id);
                    table.UniqueConstraint("AK_ExperienceSession_Id_ExperienceId", x => new { x.Id, x.ExperienceId });
                    table.CheckConstraint("CK_ExperienceSession_Status", "[Status] IN (N'Draft',N'Published',N'Cancelled',N'Closed')");
                    table.CheckConstraint("CK_ExperienceSession_Times", "[EndsAtUtc]>[StartsAtUtc]");
                    table.ForeignKey(
                        name: "FK_ExperienceSession_Experience_ExperienceId",
                        column: x => x.ExperienceId,
                        principalSchema: "provider",
                        principalTable: "Experience",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ExperienceBooking",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    RevisionId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CredentialHash = table.Column<byte[]>(type: "varbinary(32)", maxLength: 32, nullable: true),
                    CapacityReleasedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    BookedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperienceBooking", x => x.Id);
                    table.UniqueConstraint("AK_ExperienceBooking_Id_ExperienceId", x => new { x.Id, x.ExperienceId });
                    table.CheckConstraint("CK_ExperienceBooking_Status", "[Status] IN (N'Queued',N'Offered',N'Confirmed',N'Cancelled',N'CheckedIn',N'Completed',N'Declined')");
                    table.ForeignKey(
                        name: "FK_ExperienceBooking_ExperienceRevision_RevisionId_ExperienceId",
                        columns: x => new { x.RevisionId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ExperienceRevision",
                        principalColumns: new[] { "Id", "ExperienceId" });
                    table.ForeignKey(
                        name: "FK_ExperienceBooking_Experience_ExperienceId",
                        column: x => x.ExperienceId,
                        principalSchema: "provider",
                        principalTable: "Experience",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ExperienceBooking_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SeatOffer",
                schema: "provider",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    ExperienceId = table.Column<long>(type: "bigint", nullable: false),
                    BookingId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    OfferedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    DecisionAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeatOffer", x => x.Id);
                    table.UniqueConstraint("AK_SeatOffer_Id_ExperienceId", x => new { x.Id, x.ExperienceId });
                    table.CheckConstraint("CK_SeatOffer_Status", "[Status] IN (N'Offered',N'Accepted',N'Declined',N'Expired',N'Cancelled')");
                    table.CheckConstraint("CK_SeatOffer_Times", "[ExpiresAtUtc]>[OfferedAtUtc]");
                    table.ForeignKey(
                        name: "FK_SeatOffer_ExperienceBooking_BookingId_ExperienceId",
                        columns: x => new { x.BookingId, x.ExperienceId },
                        principalSchema: "provider",
                        principalTable: "ExperienceBooking",
                        principalColumns: new[] { "Id", "ExperienceId" });
                });

            migrationBuilder.CreateIndex(
                name: "IX_Experience_ProviderId_Status",
                schema: "provider",
                table: "Experience",
                columns: new[] { "ProviderId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Experience_PublicId",
                schema: "provider",
                table: "Experience",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Experience_Status_StartAtUtc",
                schema: "provider",
                table: "Experience",
                columns: new[] { "Status", "StartAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceBooking_ExperienceId_PersonId",
                schema: "provider",
                table: "ExperienceBooking",
                columns: new[] { "ExperienceId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceBooking_ExperienceId_Status_BookedAtUtc",
                schema: "provider",
                table: "ExperienceBooking",
                columns: new[] { "ExperienceId", "Status", "BookedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceBooking_PersonId",
                schema: "provider",
                table: "ExperienceBooking",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceBooking_PublicId",
                schema: "provider",
                table: "ExperienceBooking",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceBooking_RevisionId_ExperienceId",
                schema: "provider",
                table: "ExperienceBooking",
                columns: new[] { "RevisionId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceRevision_ExperienceId_RevisionNo",
                schema: "provider",
                table: "ExperienceRevision",
                columns: new[] { "ExperienceId", "RevisionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceSession_ExperienceId_StartsAtUtc",
                schema: "provider",
                table: "ExperienceSession",
                columns: new[] { "ExperienceId", "StartsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Provider_PublicId",
                schema: "provider",
                table: "Provider",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Provider_Status_Name",
                schema: "provider",
                table: "Provider",
                columns: new[] { "Status", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderMembership_PersonId_Status",
                schema: "provider",
                table: "ProviderMembership",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderMembership_ProviderId_PersonId_Role",
                schema: "provider",
                table: "ProviderMembership",
                columns: new[] { "ProviderId", "PersonId", "Role" },
                unique: true,
                filter: "[RevokedAtUtc] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderVerificationCase_ApplicantPersonId",
                schema: "provider",
                table: "ProviderVerificationCase",
                column: "ApplicantPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderVerificationCase_DecidedByPersonId",
                schema: "provider",
                table: "ProviderVerificationCase",
                column: "DecidedByPersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderVerificationCase_EvidenceFileId",
                schema: "provider",
                table: "ProviderVerificationCase",
                column: "EvidenceFileId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderVerificationCase_ProviderId",
                schema: "provider",
                table: "ProviderVerificationCase",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderVerificationCase_Status_CreatedAtUtc",
                schema: "provider",
                table: "ProviderVerificationCase",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SeatOffer_BookingId",
                schema: "provider",
                table: "SeatOffer",
                column: "BookingId",
                unique: true,
                filter: "[Status]=N'Offered'");

            migrationBuilder.CreateIndex(
                name: "IX_SeatOffer_BookingId_ExperienceId",
                schema: "provider",
                table: "SeatOffer",
                columns: new[] { "BookingId", "ExperienceId" });

            migrationBuilder.CreateIndex(
                name: "IX_SeatOffer_ExperienceId_Status_ExpiresAtUtc",
                schema: "provider",
                table: "SeatOffer",
                columns: new[] { "ExperienceId", "Status", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SeatOffer_PublicId",
                schema: "provider",
                table: "SeatOffer",
                column: "PublicId",
                unique: true);

            foreach (var batch in ModuleSql.Batches("ProviderFoundationGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExperienceSession",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderMembership",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ProviderVerificationCase",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "SeatOffer",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ExperienceBooking",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "ExperienceRevision",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "Experience",
                schema: "provider");

            migrationBuilder.DropTable(
                name: "Provider",
                schema: "provider");
        }
    }
}
