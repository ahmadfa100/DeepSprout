using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RestoreHistoricalTimeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.AddColumn<DateTime>(
                name: "EndsAtUtc",
                schema: "commercial",
                table: "Subscription",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartsAtUtc",
                schema: "commercial",
                table: "Subscription",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RetentionUntilUtc",
                schema: "files",
                table: "SecureFile",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "JoinedAtUtc",
                schema: "coach",
                table: "ProgramGroupMembership",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAtUtc",
                schema: "commercial",
                table: "PlanVersion",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RotatedAtUtc",
                schema: "iam",
                table: "PasswordCredential",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAtUtc",
                schema: "institution",
                table: "InitiativeRevision",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "GrantedAtUtc",
                schema: "iam",
                table: "GlobalGrant",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveFromUtc",
                schema: "commercial",
                table: "EntitlementAllocation",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveToUtc",
                schema: "commercial",
                table: "EntitlementAllocation",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Subscription_Window",
                schema: "commercial",
                table: "Subscription",
                sql: "[EndsAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [EndsAtUtc]>[StartsAtUtc])");

            migrationBuilder.CreateIndex(
                name: "IX_PlanVersion_PublishedAtUtc",
                schema: "commercial",
                table: "PlanVersion",
                column: "PublishedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordCredential_RotatedAtUtc",
                schema: "iam",
                table: "PasswordCredential",
                column: "RotatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_EntitlementAllocation_FeatureCode_EffectiveFromUtc_EffectiveToUtc",
                schema: "commercial",
                table: "EntitlementAllocation",
                columns: new[] { "FeatureCode", "EffectiveFromUtc", "EffectiveToUtc" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_EntitlementAllocation_Window",
                schema: "commercial",
                table: "EntitlementAllocation",
                sql: "[EffectiveToUtc] IS NULL OR ([EffectiveFromUtc] IS NOT NULL AND [EffectiveToUtc]>[EffectiveFromUtc])");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Subscription_Window",
                schema: "commercial",
                table: "Subscription");

            migrationBuilder.DropIndex(
                name: "IX_PlanVersion_PublishedAtUtc",
                schema: "commercial",
                table: "PlanVersion");

            migrationBuilder.DropIndex(
                name: "IX_PasswordCredential_RotatedAtUtc",
                schema: "iam",
                table: "PasswordCredential");

            migrationBuilder.DropIndex(
                name: "IX_EntitlementAllocation_FeatureCode_EffectiveFromUtc_EffectiveToUtc",
                schema: "commercial",
                table: "EntitlementAllocation");

            migrationBuilder.DropCheckConstraint(
                name: "CK_EntitlementAllocation_Window",
                schema: "commercial",
                table: "EntitlementAllocation");

            migrationBuilder.DropColumn(
                name: "EndsAtUtc",
                schema: "commercial",
                table: "Subscription");

            migrationBuilder.DropColumn(
                name: "StartsAtUtc",
                schema: "commercial",
                table: "Subscription");

            migrationBuilder.DropColumn(
                name: "RetentionUntilUtc",
                schema: "files",
                table: "SecureFile");

            migrationBuilder.DropColumn(
                name: "JoinedAtUtc",
                schema: "coach",
                table: "ProgramGroupMembership");

            migrationBuilder.DropColumn(
                name: "PublishedAtUtc",
                schema: "commercial",
                table: "PlanVersion");

            migrationBuilder.DropColumn(
                name: "RotatedAtUtc",
                schema: "iam",
                table: "PasswordCredential");

            migrationBuilder.DropColumn(
                name: "PublishedAtUtc",
                schema: "institution",
                table: "InitiativeRevision");

            migrationBuilder.DropColumn(
                name: "GrantedAtUtc",
                schema: "iam",
                table: "GlobalGrant");

            migrationBuilder.DropColumn(
                name: "EffectiveFromUtc",
                schema: "commercial",
                table: "EntitlementAllocation");

            migrationBuilder.DropColumn(
                name: "EffectiveToUtc",
                schema: "commercial",
                table: "EntitlementAllocation");
        }
    }
}
