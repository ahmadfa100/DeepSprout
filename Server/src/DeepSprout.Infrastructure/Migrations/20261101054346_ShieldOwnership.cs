using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ShieldOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "shield");

            migrationBuilder.CreateTable(
                name: "ExtensionInstallation",
                schema: "shield",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    InstallationPublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    PairedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExtensionInstallation", x => x.Id);
                    table.UniqueConstraint("AK_ExtensionInstallation_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_ExtensionInstallation_Revoked", "([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL) OR ([Status]<>N'Revoked' AND [RevokedAtUtc] IS NULL)");
                    table.CheckConstraint("CK_ExtensionInstallation_Status", "[Status] IN (N'Connected',N'Disconnected',N'Revoked')");
                    table.ForeignKey(
                        name: "FK_ExtensionInstallation_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ShieldConfiguration",
                schema: "shield",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    VersionNo = table.Column<int>(type: "int", nullable: false),
                    ThresholdMinutes = table.Column<short>(type: "smallint", nullable: true),
                    ConsentVersion = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    EffectiveAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShieldConfiguration", x => x.Id);
                    table.UniqueConstraint("AK_ShieldConfiguration_Id_PersonId", x => new { x.Id, x.PersonId });
                    table.CheckConstraint("CK_ShieldConfiguration_Threshold", "[ThresholdMinutes] IS NULL OR [ThresholdMinutes]>0");
                    table.CheckConstraint("CK_ShieldConfiguration_Version", "[VersionNo]>0");
                    table.ForeignKey(
                        name: "FK_ShieldConfiguration_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BrowserUsagePeriod",
                schema: "shield",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    InstallationId = table.Column<long>(type: "bigint", nullable: false),
                    ConfigurationId = table.Column<long>(type: "bigint", nullable: false),
                    LocalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TimeZoneId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ObservedSeconds = table.Column<int>(type: "int", nullable: false),
                    CoverageSeconds = table.Column<int>(type: "int", nullable: false),
                    GapCount = table.Column<int>(type: "int", nullable: false),
                    SequenceNo = table.Column<long>(type: "bigint", nullable: false),
                    SourceHash = table.Column<byte[]>(type: "binary(32)", fixedLength: true, maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BrowserUsagePeriod", x => x.Id);
                    table.UniqueConstraint("AK_BrowserUsagePeriod_Id_ConfigurationId", x => new { x.Id, x.ConfigurationId });
                    table.CheckConstraint("CK_BrowserUsagePeriod_Counts", "[ObservedSeconds]>=0 AND [CoverageSeconds]>=0 AND [GapCount]>=0");
                    table.ForeignKey(
                        name: "FK_BrowserUsagePeriod_ExtensionInstallation_InstallationId_PersonId",
                        columns: x => new { x.InstallationId, x.PersonId },
                        principalSchema: "shield",
                        principalTable: "ExtensionInstallation",
                        principalColumns: new[] { "Id", "PersonId" });
                    table.ForeignKey(
                        name: "FK_BrowserUsagePeriod_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BrowserUsagePeriod_ShieldConfiguration_ConfigurationId_PersonId",
                        columns: x => new { x.ConfigurationId, x.PersonId },
                        principalSchema: "shield",
                        principalTable: "ShieldConfiguration",
                        principalColumns: new[] { "Id", "PersonId" });
                });

            migrationBuilder.CreateTable(
                name: "ProtectionSession",
                schema: "shield",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<long>(type: "bigint", nullable: false),
                    InstallationId = table.Column<long>(type: "bigint", nullable: false),
                    ConfigurationId = table.Column<long>(type: "bigint", nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    EndsAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    FailureCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProtectionSession", x => x.Id);
                    table.CheckConstraint("CK_ProtectionSession_Status", "[Status] IN (N'Configured',N'Active',N'Ended',N'Failed',N'Disconnected')");
                    table.CheckConstraint("CK_ProtectionSession_Times", "[EndsAtUtc]>[StartedAtUtc]");
                    table.ForeignKey(
                        name: "FK_ProtectionSession_ExtensionInstallation_InstallationId_PersonId",
                        columns: x => new { x.InstallationId, x.PersonId },
                        principalSchema: "shield",
                        principalTable: "ExtensionInstallation",
                        principalColumns: new[] { "Id", "PersonId" });
                    table.ForeignKey(
                        name: "FK_ProtectionSession_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProtectionSession_ShieldConfiguration_ConfigurationId_PersonId",
                        columns: x => new { x.ConfigurationId, x.PersonId },
                        principalSchema: "shield",
                        principalTable: "ShieldConfiguration",
                        principalColumns: new[] { "Id", "PersonId" });
                });

            migrationBuilder.CreateTable(
                name: "ShieldSelectedDomain",
                schema: "shield",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConfigurationId = table.Column<long>(type: "bigint", nullable: false),
                    DomainCode = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShieldSelectedDomain", x => x.Id);
                    table.UniqueConstraint("AK_ShieldSelectedDomain_ConfigurationId_DomainCode", x => new { x.ConfigurationId, x.DomainCode });
                    table.ForeignKey(
                        name: "FK_ShieldSelectedDomain_ShieldConfiguration_ConfigurationId",
                        column: x => x.ConfigurationId,
                        principalSchema: "shield",
                        principalTable: "ShieldConfiguration",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BrowserUsageDomain",
                schema: "shield",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UsagePeriodId = table.Column<long>(type: "bigint", nullable: false),
                    ConfigurationId = table.Column<long>(type: "bigint", nullable: false),
                    DomainCode = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ObservedSeconds = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BrowserUsageDomain", x => x.Id);
                    table.CheckConstraint("CK_BrowserUsageDomain_Seconds", "[ObservedSeconds]>=0");
                    table.ForeignKey(
                        name: "FK_BrowserUsageDomain_BrowserUsagePeriod_UsagePeriodId_ConfigurationId",
                        columns: x => new { x.UsagePeriodId, x.ConfigurationId },
                        principalSchema: "shield",
                        principalTable: "BrowserUsagePeriod",
                        principalColumns: new[] { "Id", "ConfigurationId" });
                    table.ForeignKey(
                        name: "FK_BrowserUsageDomain_ShieldSelectedDomain_ConfigurationId_DomainCode",
                        columns: x => new { x.ConfigurationId, x.DomainCode },
                        principalSchema: "shield",
                        principalTable: "ShieldSelectedDomain",
                        principalColumns: new[] { "ConfigurationId", "DomainCode" });
                });

            migrationBuilder.CreateIndex(
                name: "IX_BrowserUsageDomain_ConfigurationId_DomainCode",
                schema: "shield",
                table: "BrowserUsageDomain",
                columns: new[] { "ConfigurationId", "DomainCode" });

            migrationBuilder.CreateIndex(
                name: "IX_BrowserUsageDomain_UsagePeriodId_ConfigurationId",
                schema: "shield",
                table: "BrowserUsageDomain",
                columns: new[] { "UsagePeriodId", "ConfigurationId" });

            migrationBuilder.CreateIndex(
                name: "IX_BrowserUsageDomain_UsagePeriodId_DomainCode",
                schema: "shield",
                table: "BrowserUsageDomain",
                columns: new[] { "UsagePeriodId", "DomainCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BrowserUsagePeriod_ConfigurationId_PersonId",
                schema: "shield",
                table: "BrowserUsagePeriod",
                columns: new[] { "ConfigurationId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_BrowserUsagePeriod_InstallationId_LocalDate",
                schema: "shield",
                table: "BrowserUsagePeriod",
                columns: new[] { "InstallationId", "LocalDate" });

            migrationBuilder.CreateIndex(
                name: "IX_BrowserUsagePeriod_InstallationId_PersonId",
                schema: "shield",
                table: "BrowserUsagePeriod",
                columns: new[] { "InstallationId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_BrowserUsagePeriod_InstallationId_SequenceNo",
                schema: "shield",
                table: "BrowserUsagePeriod",
                columns: new[] { "InstallationId", "SequenceNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BrowserUsagePeriod_PersonId",
                schema: "shield",
                table: "BrowserUsagePeriod",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ExtensionInstallation_InstallationPublicId",
                schema: "shield",
                table: "ExtensionInstallation",
                column: "InstallationPublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExtensionInstallation_PersonId_Status",
                schema: "shield",
                table: "ExtensionInstallation",
                columns: new[] { "PersonId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProtectionSession_ConfigurationId_PersonId",
                schema: "shield",
                table: "ProtectionSession",
                columns: new[] { "ConfigurationId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProtectionSession_InstallationId_PersonId",
                schema: "shield",
                table: "ProtectionSession",
                columns: new[] { "InstallationId", "PersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_ProtectionSession_PersonId_StartedAtUtc",
                schema: "shield",
                table: "ProtectionSession",
                columns: new[] { "PersonId", "StartedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ShieldConfiguration_PersonId_VersionNo",
                schema: "shield",
                table: "ShieldConfiguration",
                columns: new[] { "PersonId", "VersionNo" },
                unique: true);

            foreach (var batch in ModuleSql.Batches("ShieldCommands.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BrowserUsageDomain",
                schema: "shield");

            migrationBuilder.DropTable(
                name: "ProtectionSession",
                schema: "shield");

            migrationBuilder.DropTable(
                name: "BrowserUsagePeriod",
                schema: "shield");

            migrationBuilder.DropTable(
                name: "ShieldSelectedDomain",
                schema: "shield");

            migrationBuilder.DropTable(
                name: "ExtensionInstallation",
                schema: "shield");

            migrationBuilder.DropTable(
                name: "ShieldConfiguration",
                schema: "shield");
        }
    }
}
