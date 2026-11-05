using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CommercialEntitlements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.EnsureSchema(
                name: "commercial");

            migrationBuilder.CreateTable(
                name: "PlanVersion",
                schema: "commercial",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AudienceCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    PlanCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    VersionNo = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(19,4)", nullable: true),
                    Currency = table.Column<string>(type: "char(3)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanVersion", x => x.Id);
                    table.CheckConstraint("CK_PlanVersion_No", "[VersionNo]>0");
                    table.CheckConstraint("CK_PlanVersion_Price", "[Price] IS NULL OR [Price]>=0");
                });

            migrationBuilder.CreateTable(
                name: "PlanFeature",
                schema: "commercial",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanVersionId = table.Column<long>(type: "bigint", nullable: false),
                    FeatureCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    LimitValue = table.Column<int>(type: "int", nullable: true),
                    PeriodCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanFeature", x => x.Id);
                    table.CheckConstraint("CK_PlanFeature_Limit", "[LimitValue] IS NULL OR [LimitValue]>0");
                    table.ForeignKey(
                        name: "FK_PlanFeature_PlanVersion_PlanVersionId",
                        column: x => x.PlanVersionId,
                        principalSchema: "commercial",
                        principalTable: "PlanVersion",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Subscription",
                schema: "commercial",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonPayerId = table.Column<long>(type: "bigint", nullable: true),
                    InstitutionPayerId = table.Column<long>(type: "bigint", nullable: true),
                    ProviderPayerId = table.Column<long>(type: "bigint", nullable: true),
                    PlanVersionId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subscription", x => x.Id);
                    table.CheckConstraint("CK_Subscription_Payer", "(CASE WHEN [PersonPayerId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [InstitutionPayerId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [ProviderPayerId] IS NULL THEN 0 ELSE 1 END)=1");
                    table.CheckConstraint("CK_Subscription_Status", "[Status] IN (N'Proposed',N'Active',N'Expired',N'Cancelled')");
                    table.ForeignKey(
                        name: "FK_Subscription_Institution_InstitutionPayerId",
                        column: x => x.InstitutionPayerId,
                        principalSchema: "institution",
                        principalTable: "Institution",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Subscription_Person_PersonPayerId",
                        column: x => x.PersonPayerId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Subscription_PlanVersion_PlanVersionId",
                        column: x => x.PlanVersionId,
                        principalSchema: "commercial",
                        principalTable: "PlanVersion",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Subscription_Provider_ProviderPayerId",
                        column: x => x.ProviderPayerId,
                        principalSchema: "provider",
                        principalTable: "Provider",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EntitlementAllocation",
                schema: "commercial",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SubscriptionId = table.Column<long>(type: "bigint", nullable: true),
                    PersonId = table.Column<long>(type: "bigint", nullable: true),
                    InstitutionId = table.Column<long>(type: "bigint", nullable: true),
                    ProviderId = table.Column<long>(type: "bigint", nullable: true),
                    FeatureCode = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    LimitValue = table.Column<int>(type: "int", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntitlementAllocation", x => x.Id);
                    table.CheckConstraint("CK_EntitlementAllocation_Beneficiary", "(CASE WHEN [PersonId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [InstitutionId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [ProviderId] IS NULL THEN 0 ELSE 1 END)=1");
                    table.CheckConstraint("CK_EntitlementAllocation_Limit", "[LimitValue] IS NULL OR [LimitValue]>0");
                    table.ForeignKey(
                        name: "FK_EntitlementAllocation_Institution_InstitutionId",
                        column: x => x.InstitutionId,
                        principalSchema: "institution",
                        principalTable: "Institution",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EntitlementAllocation_Person_PersonId",
                        column: x => x.PersonId,
                        principalSchema: "iam",
                        principalTable: "Person",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EntitlementAllocation_Provider_ProviderId",
                        column: x => x.ProviderId,
                        principalSchema: "provider",
                        principalTable: "Provider",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EntitlementAllocation_Subscription_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalSchema: "commercial",
                        principalTable: "Subscription",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UsageLedger",
                schema: "commercial",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AllocationId = table.Column<long>(type: "bigint", nullable: false),
                    SourceKey = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    RecordedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsageLedger", x => x.Id);
                    table.CheckConstraint("CK_UsageLedger_Quantity", "[Quantity]<>0");
                    table.ForeignKey(
                        name: "FK_UsageLedger_EntitlementAllocation_AllocationId",
                        column: x => x.AllocationId,
                        principalSchema: "commercial",
                        principalTable: "EntitlementAllocation",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EntitlementAllocation_InstitutionId_FeatureCode",
                schema: "commercial",
                table: "EntitlementAllocation",
                columns: new[] { "InstitutionId", "FeatureCode" });

            migrationBuilder.CreateIndex(
                name: "IX_EntitlementAllocation_PersonId_FeatureCode",
                schema: "commercial",
                table: "EntitlementAllocation",
                columns: new[] { "PersonId", "FeatureCode" });

            migrationBuilder.CreateIndex(
                name: "IX_EntitlementAllocation_ProviderId_FeatureCode",
                schema: "commercial",
                table: "EntitlementAllocation",
                columns: new[] { "ProviderId", "FeatureCode" });

            migrationBuilder.CreateIndex(
                name: "IX_EntitlementAllocation_SubscriptionId",
                schema: "commercial",
                table: "EntitlementAllocation",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_PlanFeature_PlanVersionId_FeatureCode",
                schema: "commercial",
                table: "PlanFeature",
                columns: new[] { "PlanVersionId", "FeatureCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlanVersion_AudienceCode_PlanCode_VersionNo",
                schema: "commercial",
                table: "PlanVersion",
                columns: new[] { "AudienceCode", "PlanCode", "VersionNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subscription_InstitutionPayerId_Status",
                schema: "commercial",
                table: "Subscription",
                columns: new[] { "InstitutionPayerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Subscription_PersonPayerId_Status",
                schema: "commercial",
                table: "Subscription",
                columns: new[] { "PersonPayerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Subscription_PlanVersionId",
                schema: "commercial",
                table: "Subscription",
                column: "PlanVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscription_ProviderPayerId_Status",
                schema: "commercial",
                table: "Subscription",
                columns: new[] { "ProviderPayerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_UsageLedger_AllocationId_RecordedAtUtc",
                schema: "commercial",
                table: "UsageLedger",
                columns: new[] { "AllocationId", "RecordedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_UsageLedger_AllocationId_SourceKey",
                schema: "commercial",
                table: "UsageLedger",
                columns: new[] { "AllocationId", "SourceKey" },
                unique: true);

            foreach (var batch in ModuleSql.Batches("CommercialGuards.sql")) migrationBuilder.Sql(batch);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlanFeature",
                schema: "commercial");

            migrationBuilder.DropTable(
                name: "UsageLedger",
                schema: "commercial");

            migrationBuilder.DropTable(
                name: "EntitlementAllocation",
                schema: "commercial");

            migrationBuilder.DropTable(
                name: "Subscription",
                schema: "commercial");

            migrationBuilder.DropTable(
                name: "PlanVersion",
                schema: "commercial");
        }
    }
}
