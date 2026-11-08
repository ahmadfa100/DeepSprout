using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.V5.Migrations
{
    /// <summary>
    /// v5-lean-1 to v5-lean-2: Onboarding 2.0 (Journey Level 1, versioned setup answers, new stages, explicit plan acceptance)
    /// and the 4 November v4.1 decisions (Institution-only organizations and outdoor-activity ownership, invitation-only staff,
    /// retired independent Programs and partnerships). No table is added or dropped and no row is deleted. Up refuses to run
    /// when existing rows would violate a new rule; Provider-to-Institution conversions are recorded in ops.AuditEvent so
    /// Down restores exactly those rows.
    /// </summary>
    public partial class V5Lean2Onboarding2AndV41 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(V5Sql.RefuseHistoricalM1Database);
            // Refuse instead of guessing: these rows need a person's review before the stricter rules apply.
            migrationBuilder.Sql("IF EXISTS (SELECT 1 FROM org.StaffAppointment WHERE Status = N'Requested' OR RequestedByPersonId IS NOT NULL) THROW 51110, 'Self-requested staff appointments exist. Resolve them before v5-lean-2 (v4.1 removed self-request).', 1;");
            migrationBuilder.Sql("IF EXISTS (SELECT 1 FROM org.StaffAppointment WHERE NormalizedEmail IS NULL OR TokenHash IS NULL OR ExpiresAtUtc IS NULL OR InvitedByPersonId IS NULL OR InvitedAtUtc IS NULL) THROW 51111, 'Staff appointments without a complete email invitation exist. Resolve them before v5-lean-2.', 1;");
            migrationBuilder.Sql("IF EXISTS (SELECT 1 FROM personal.IndividualProfile WHERE (SetupAnswersJson IS NULL AND SetupAnswersVersion IS NOT NULL) OR (SetupAnswersJson IS NOT NULL AND (SetupAnswersVersion IS NULL OR SetupAnswersVersion < 1 OR LEFT(LTRIM(SetupAnswersJson), 1) <> N'{'))) THROW 51112, 'Setup answers without a valid version, or not stored as a JSON object, exist. Assign their version before v5-lean-2.', 1;");
            migrationBuilder.Sql("IF EXISTS (SELECT 1 FROM recovery.PlanRevision WHERE (Status = N'Draft' AND AcceptedAtUtc IS NOT NULL) OR (Status <> N'Draft' AND AcceptedAtUtc IS NULL)) THROW 51113, 'Plan revisions with an inconsistent acceptance time exist. Resolve them before v5-lean-2.', 1;");

            migrationBuilder.DropForeignKey(
                name: "FK_Experience_ProviderId",
                schema: "provider",
                table: "Experience");

            migrationBuilder.DropForeignKey(
                name: "FK_StaffAppointment_RequestedByPersonId",
                schema: "org",
                table: "StaffAppointment");

            migrationBuilder.DropCheckConstraint(
                name: "CK_VerificationCase_Kind",
                schema: "org",
                table: "VerificationCase");

            migrationBuilder.DropCheckConstraint(
                name: "CK_VerificationCase_Subject",
                schema: "org",
                table: "VerificationCase");

            migrationBuilder.DropIndex(
                name: "IX_StaffAppointment_RequestedByPersonId",
                schema: "org",
                table: "StaffAppointment");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StaffAppointment_Invited",
                schema: "org",
                table: "StaffAppointment");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StaffAppointment_Status",
                schema: "org",
                table: "StaffAppointment");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Organization_Kind",
                schema: "org",
                table: "Organization");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IndividualProfile_Stage",
                schema: "personal",
                table: "IndividualProfile");

            // v4.1: Institutions own outdoor activities. Re-home former Provider rows and keep an audit trail for Down.
            migrationBuilder.Sql("INSERT ops.AuditEvent (ResourceKind, ResourceId, Action, BeforeStatus, AfterStatus, Reason, DetailJson, AtUtc) SELECT N'Organization', Id, N'v5-lean-2.ProviderToInstitution', N'Provider', N'Institution', N'v4.1: Institutions own outdoor activities', N'{\"column\":\"Kind\"}', SYSUTCDATETIME() FROM org.Organization WHERE Kind = N'Provider';");
            migrationBuilder.Sql("UPDATE org.Organization SET Kind = N'Institution' WHERE Kind = N'Provider';");
            migrationBuilder.Sql("INSERT ops.AuditEvent (ResourceKind, ResourceId, Action, BeforeStatus, AfterStatus, Reason, DetailJson, AtUtc) SELECT N'VerificationCase', Id, N'v5-lean-2.ProviderToInstitution', N'Provider', N'Institution', N'v4.1: Institution verification only', N'{\"column\":\"Kind\"}', SYSUTCDATETIME() FROM org.VerificationCase WHERE Kind = N'Provider';");
            migrationBuilder.Sql("UPDATE org.VerificationCase SET Kind = N'Institution' WHERE Kind = N'Provider';");

            migrationBuilder.DropColumn(
                name: "RequestedByPersonId",
                schema: "org",
                table: "StaffAppointment");

            migrationBuilder.RenameColumn(
                name: "ProviderId",
                schema: "provider",
                table: "Experience",
                newName: "OrganizationId");

            migrationBuilder.RenameIndex(
                name: "IX_Experience_ProviderId",
                schema: "provider",
                table: "Experience",
                newName: "IX_Experience_OrganizationId");

            migrationBuilder.AddColumn<int>(
                name: "JourneyLevel",
                schema: "personal",
                table: "IndividualProfile",
                type: "int",
                nullable: false,
                defaultValueSql: "1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_VerificationCase_Kind",
                schema: "org",
                table: "VerificationCase",
                sql: "Kind IN ('Institution','Coach')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_VerificationCase_Subject",
                schema: "org",
                table: "VerificationCase",
                sql: "(Kind = 'Coach' AND OrganizationId IS NULL) OR (Kind = 'Institution' AND OrganizationId IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StaffAppointment_Invited",
                schema: "org",
                table: "StaffAppointment",
                sql: "NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL AND ExpiresAtUtc IS NOT NULL AND InvitedByPersonId IS NOT NULL AND InvitedAtUtc IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StaffAppointment_Status",
                schema: "org",
                table: "StaffAppointment",
                sql: "Status IN ('Pending','Active','Declined','Expired','Cancelled','Revoked')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PlanRevision_Accepted",
                schema: "recovery",
                table: "PlanRevision",
                sql: "(Status = 'Draft' AND AcceptedAtUtc IS NULL) OR (Status IN ('Accepted','Superseded') AND AcceptedAtUtc IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Organization_Kind",
                schema: "org",
                table: "Organization",
                sql: "Kind IN ('Institution')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IndividualProfile_JourneyLevel",
                schema: "personal",
                table: "IndividualProfile",
                sql: "JourneyLevel >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IndividualProfile_SetupAnswers",
                schema: "personal",
                table: "IndividualProfile",
                sql: "(SetupAnswersJson IS NULL AND SetupAnswersVersion IS NULL) OR (SetupAnswersJson IS NOT NULL AND SetupAnswersVersion IS NOT NULL AND SetupAnswersVersion >= 1 AND LEFT(LTRIM(SetupAnswersJson), 1) = N'{')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IndividualProfile_Stage",
                schema: "personal",
                table: "IndividualProfile",
                sql: "OnboardingStage IN ('Started','QuickSetup','Story','Home','Activated','TourDone','Introduced','Setup','Baselines','Results','Preview')");

            migrationBuilder.AddForeignKey(
                name: "FK_Experience_OrganizationId",
                schema: "provider",
                table: "Experience",
                column: "OrganizationId",
                principalSchema: "org",
                principalTable: "Organization",
                principalColumn: "Id");

            // v4.1: retired history stays readable; the application role can no longer change it.
            migrationBuilder.Sql("IF DATABASE_PRINCIPAL_ID(N'ds_app') IS NOT NULL BEGIN DENY INSERT, UPDATE, DELETE ON [coach].[CoachProgram] TO [ds_app]; DENY INSERT, UPDATE, DELETE ON [partnership].[PartnershipLink] TO [ds_app]; END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(V5Sql.RefuseHistoricalM1Database);
            // Rolling back must not discard Onboarding 2.0 progress. Export or migrate it first.
            migrationBuilder.Sql("IF EXISTS (SELECT 1 FROM personal.IndividualProfile WHERE JourneyLevel > 1 OR OnboardingStage IN (N'QuickSetup', N'Story', N'Home')) THROW 51120, 'Profiles with Onboarding 2.0 stages or a Journey Level above 1 exist. Back them up and migrate them before rolling back v5-lean-2.', 1;");
            migrationBuilder.Sql("IF DATABASE_PRINCIPAL_ID(N'ds_app') IS NOT NULL BEGIN REVOKE INSERT, UPDATE, DELETE ON [coach].[CoachProgram] FROM [ds_app]; REVOKE INSERT, UPDATE, DELETE ON [partnership].[PartnershipLink] FROM [ds_app]; END");

            migrationBuilder.DropForeignKey(
                name: "FK_Experience_OrganizationId",
                schema: "provider",
                table: "Experience");

            migrationBuilder.DropCheckConstraint(
                name: "CK_VerificationCase_Kind",
                schema: "org",
                table: "VerificationCase");

            migrationBuilder.DropCheckConstraint(
                name: "CK_VerificationCase_Subject",
                schema: "org",
                table: "VerificationCase");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StaffAppointment_Invited",
                schema: "org",
                table: "StaffAppointment");

            migrationBuilder.DropCheckConstraint(
                name: "CK_StaffAppointment_Status",
                schema: "org",
                table: "StaffAppointment");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PlanRevision_Accepted",
                schema: "recovery",
                table: "PlanRevision");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Organization_Kind",
                schema: "org",
                table: "Organization");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IndividualProfile_JourneyLevel",
                schema: "personal",
                table: "IndividualProfile");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IndividualProfile_SetupAnswers",
                schema: "personal",
                table: "IndividualProfile");

            migrationBuilder.DropCheckConstraint(
                name: "CK_IndividualProfile_Stage",
                schema: "personal",
                table: "IndividualProfile");

            migrationBuilder.DropColumn(
                name: "JourneyLevel",
                schema: "personal",
                table: "IndividualProfile");

            migrationBuilder.RenameColumn(
                name: "OrganizationId",
                schema: "provider",
                table: "Experience",
                newName: "ProviderId");

            migrationBuilder.RenameIndex(
                name: "IX_Experience_OrganizationId",
                schema: "provider",
                table: "Experience",
                newName: "IX_Experience_ProviderId");

            // Restore exactly the rows that Up re-homed, from its audit trail, and record the rollback.
            migrationBuilder.Sql("UPDATE o SET Kind = N'Provider' FROM org.Organization o WHERE EXISTS (SELECT 1 FROM ops.AuditEvent a WHERE a.ResourceKind = N'Organization' AND a.ResourceId = o.Id AND a.Action = N'v5-lean-2.ProviderToInstitution');");
            migrationBuilder.Sql("UPDATE v SET Kind = N'Provider' FROM org.VerificationCase v WHERE EXISTS (SELECT 1 FROM ops.AuditEvent a WHERE a.ResourceKind = N'VerificationCase' AND a.ResourceId = v.Id AND a.Action = N'v5-lean-2.ProviderToInstitution');");
            migrationBuilder.Sql("INSERT ops.AuditEvent (ResourceKind, ResourceId, Action, BeforeStatus, AfterStatus, Reason, AtUtc) SELECT a.ResourceKind, a.ResourceId, N'v5-lean-2.RollbackToProvider', N'Institution', N'Provider', N'v5-lean-2 rolled back', SYSUTCDATETIME() FROM ops.AuditEvent a WHERE a.Action = N'v5-lean-2.ProviderToInstitution';");

            migrationBuilder.AddColumn<long>(
                name: "RequestedByPersonId",
                schema: "org",
                table: "StaffAppointment",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_VerificationCase_Kind",
                schema: "org",
                table: "VerificationCase",
                sql: "Kind IN ('Institution','Provider','Coach')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_VerificationCase_Subject",
                schema: "org",
                table: "VerificationCase",
                sql: "(Kind = 'Coach' AND OrganizationId IS NULL) OR (Kind IN ('Institution','Provider') AND OrganizationId IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_StaffAppointment_RequestedByPersonId",
                schema: "org",
                table: "StaffAppointment",
                column: "RequestedByPersonId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StaffAppointment_Invited",
                schema: "org",
                table: "StaffAppointment",
                sql: "Status IN ('Requested','Cancelled') OR (NormalizedEmail IS NOT NULL AND TokenHash IS NOT NULL AND ExpiresAtUtc IS NOT NULL AND InvitedByPersonId IS NOT NULL AND InvitedAtUtc IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_StaffAppointment_Status",
                schema: "org",
                table: "StaffAppointment",
                sql: "Status IN ('Requested','Pending','Active','Declined','Expired','Cancelled','Revoked')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Organization_Kind",
                schema: "org",
                table: "Organization",
                sql: "Kind IN ('Institution','Provider')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_IndividualProfile_Stage",
                schema: "personal",
                table: "IndividualProfile",
                sql: "OnboardingStage IN ('Started','Introduced','Setup','Baselines','Results','Preview','Activated','TourDone')");

            migrationBuilder.AddForeignKey(
                name: "FK_Experience_ProviderId",
                schema: "provider",
                table: "Experience",
                column: "ProviderId",
                principalSchema: "org",
                principalTable: "Organization",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_StaffAppointment_RequestedByPersonId",
                schema: "org",
                table: "StaffAppointment",
                column: "RequestedByPersonId",
                principalSchema: "iam",
                principalTable: "Person",
                principalColumn: "Id");
        }
    }
}
