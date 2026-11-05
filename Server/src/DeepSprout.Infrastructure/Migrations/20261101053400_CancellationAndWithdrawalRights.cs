using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CancellationAndWithdrawalRights : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
            migrationBuilder.DropCheckConstraint(
                name: "CK_InitiativeMembership_EndRelease",
                schema: "institution",
                table: "InitiativeMembership");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InitiativeMembership_Status",
                schema: "institution",
                table: "InitiativeMembership");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InitiativeApplicationDecision_Action",
                schema: "institution",
                table: "InitiativeApplicationDecision");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InitiativeApplication_Status",
                schema: "institution",
                table: "InitiativeApplication");

            migrationBuilder.AddColumn<string>(
                name: "EndReason",
                schema: "institution",
                table: "InitiativeMembership",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ClosedAtUtc",
                schema: "institution",
                table: "InitiativeApplication",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClosedReason",
                schema: "institution",
                table: "InitiativeApplication",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                schema: "institution",
                table: "Initiative",
                type: "nvarchar(800)",
                maxLength: 800,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAtUtc",
                schema: "institution",
                table: "Initiative",
                type: "datetime2(3)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "CancelledByPersonId",
                schema: "institution",
                table: "Initiative",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_InitiativeMembership_EndRelease",
                schema: "institution",
                table: "InitiativeMembership",
                sql: "([Status] IN (N'Accepted',N'Suspended') AND [EndedAtUtc] IS NULL AND [CapacityReleasedAtUtc] IS NULL AND [EndReason] IS NULL) OR ([Status] IN (N'Withdrawn',N'Removed',N'Completed',N'Cancelled') AND [EndedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc]>=[EndedAtUtc] AND ([Status]<>N'Cancelled' OR [EndReason]=N'InitiativeCancelled'))");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InitiativeMembership_Status",
                schema: "institution",
                table: "InitiativeMembership",
                sql: "[Status] IN (N'Accepted',N'Suspended',N'Withdrawn',N'Removed',N'Completed',N'Cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InitiativeApplicationDecision_Action",
                schema: "institution",
                table: "InitiativeApplicationDecision",
                sql: "[Action] IN (N'Approved',N'Rejected',N'Withdrawn',N'Queued',N'Offered',N'Blocked',N'Cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InitiativeApplication_Cancelled",
                schema: "institution",
                table: "InitiativeApplication",
                sql: "([Status]=N'Cancelled' AND [ClosedReason]=N'InitiativeCancelled' AND [ClosedAtUtc] IS NOT NULL) OR ([Status]<>N'Cancelled' AND [ClosedReason] IS NULL AND [ClosedAtUtc] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InitiativeApplication_Status",
                schema: "institution",
                table: "InitiativeApplication",
                sql: "[Status] IN (N'Pending',N'Queued',N'Offered',N'Accepted',N'Rejected',N'Withdrawn',N'Blocked',N'Cancelled')");

            migrationBuilder.CreateIndex(
                name: "IX_Initiative_CancelledByPersonId",
                schema: "institution",
                table: "Initiative",
                column: "CancelledByPersonId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Initiative_Cancellation",
                schema: "institution",
                table: "Initiative",
                sql: "([Status]=N'Cancelled' AND [CancellationReason] IS NOT NULL AND LEN(TRIM([CancellationReason]))>0 AND [CancelledAtUtc] IS NOT NULL AND [CancelledByPersonId] IS NOT NULL) OR ([Status]<>N'Cancelled' AND [CancellationReason] IS NULL AND [CancelledAtUtc] IS NULL AND [CancelledByPersonId] IS NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_Initiative_Person_CancelledByPersonId",
                schema: "institution",
                table: "Initiative",
                column: "CancelledByPersonId",
                principalSchema: "iam",
                principalTable: "Person",
                principalColumn: "Id");

            foreach (var batch in M1Sql.CancellationBatches()) migrationBuilder.Sql(batch);
            migrationBuilder.Sql(M1Sql.RescheduleV2());
            migrationBuilder.Sql(M1Sql.ApprovalV2());
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Initiative_Person_CancelledByPersonId",
                schema: "institution",
                table: "Initiative");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InitiativeMembership_EndRelease",
                schema: "institution",
                table: "InitiativeMembership");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InitiativeMembership_Status",
                schema: "institution",
                table: "InitiativeMembership");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InitiativeApplicationDecision_Action",
                schema: "institution",
                table: "InitiativeApplicationDecision");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InitiativeApplication_Cancelled",
                schema: "institution",
                table: "InitiativeApplication");

            migrationBuilder.DropCheckConstraint(
                name: "CK_InitiativeApplication_Status",
                schema: "institution",
                table: "InitiativeApplication");

            migrationBuilder.DropIndex(
                name: "IX_Initiative_CancelledByPersonId",
                schema: "institution",
                table: "Initiative");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Initiative_Cancellation",
                schema: "institution",
                table: "Initiative");

            migrationBuilder.DropColumn(
                name: "EndReason",
                schema: "institution",
                table: "InitiativeMembership");

            migrationBuilder.DropColumn(
                name: "ClosedAtUtc",
                schema: "institution",
                table: "InitiativeApplication");

            migrationBuilder.DropColumn(
                name: "ClosedReason",
                schema: "institution",
                table: "InitiativeApplication");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                schema: "institution",
                table: "Initiative");

            migrationBuilder.DropColumn(
                name: "CancelledAtUtc",
                schema: "institution",
                table: "Initiative");

            migrationBuilder.DropColumn(
                name: "CancelledByPersonId",
                schema: "institution",
                table: "Initiative");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InitiativeMembership_EndRelease",
                schema: "institution",
                table: "InitiativeMembership",
                sql: "([Status] IN (N'Accepted',N'Suspended') AND [EndedAtUtc] IS NULL AND [CapacityReleasedAtUtc] IS NULL) OR ([Status] IN (N'Withdrawn',N'Removed',N'Completed') AND [EndedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc]>=[EndedAtUtc])");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InitiativeMembership_Status",
                schema: "institution",
                table: "InitiativeMembership",
                sql: "[Status] IN (N'Accepted',N'Suspended',N'Withdrawn',N'Removed',N'Completed')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InitiativeApplicationDecision_Action",
                schema: "institution",
                table: "InitiativeApplicationDecision",
                sql: "[Action] IN (N'Approved',N'Rejected',N'Withdrawn',N'Queued',N'Offered',N'Blocked')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_InitiativeApplication_Status",
                schema: "institution",
                table: "InitiativeApplication",
                sql: "[Status] IN (N'Pending',N'Queued',N'Offered',N'Accepted',N'Rejected',N'Withdrawn',N'Blocked')");
        }
    }
}
