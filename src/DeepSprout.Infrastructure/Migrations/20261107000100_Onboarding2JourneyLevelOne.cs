using DeepSprout.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DeepSprout.Infrastructure.Migrations;

[DbContext(typeof(DeepSproutDbContext))]
[Migration("20261107000100_Onboarding2JourneyLevelOne")]
public sealed class Onboarding2JourneyLevelOne : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");

        migrationBuilder.AddColumn<int>(
            name: "SetupVersion", schema: "personal", table: "IndividualProfile",
            type: "int", nullable: true);
        migrationBuilder.AddColumn<string>(
            name: "SetupAnswersJson", schema: "personal", table: "IndividualProfile",
            type: "nvarchar(max)", nullable: true);
        migrationBuilder.AddColumn<int>(
            name: "JourneyLevel", schema: "recovery", table: "RecoveryJourney",
            type: "int", nullable: false, defaultValue: 1);

        // Only the obsolete starting value is normalized. Earned values, plan
        // revisions, assessment attempts, identities and relationships remain.
        migrationBuilder.Sql("EXEC(N'UPDATE recovery.RecoveryJourney SET JourneyLevel=1 WHERE JourneyLevel=0');");
        migrationBuilder.Sql("ALTER TABLE personal.IndividualProfile DROP CONSTRAINT CK_IndividualProfile_Stage;");
        migrationBuilder.Sql("ALTER TABLE personal.IndividualProfile ADD CONSTRAINT CK_IndividualProfile_Stage CHECK (OnboardingStage IN (N'Started',N'Setup',N'QuickSetup',N'Story',N'Home',N'Baselines',N'Preview',N'Activated',N'TourDone'));");
        migrationBuilder.Sql("EXEC(N'ALTER TABLE personal.IndividualProfile ADD CONSTRAINT CK_IndividualProfile_SetupAnswers CHECK (SetupAnswersJson IS NULL OR (ISJSON(SetupAnswersJson)=1 AND SetupVersion>0))');");
        migrationBuilder.Sql("EXEC(N'ALTER TABLE recovery.RecoveryJourney ADD CONSTRAINT CK_RecoveryJourney_Level CHECK (JourneyLevel>=1)');");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Migration targets only DeepSprout_Validation', 1;");
        migrationBuilder.Sql("IF EXISTS (SELECT 1 FROM personal.IndividualProfile WHERE SetupAnswersJson IS NOT NULL OR OnboardingStage IN (N'QuickSetup',N'Story',N'Home')) OR EXISTS (SELECT 1 FROM recovery.RecoveryJourney WHERE JourneyLevel>1) THROW 51001, 'Back up and migrate new onboarding or earned level data before rollback', 1;");
        migrationBuilder.Sql("ALTER TABLE recovery.RecoveryJourney DROP CONSTRAINT CK_RecoveryJourney_Level;");
        migrationBuilder.Sql("ALTER TABLE personal.IndividualProfile DROP CONSTRAINT CK_IndividualProfile_SetupAnswers;");
        migrationBuilder.Sql("ALTER TABLE personal.IndividualProfile DROP CONSTRAINT CK_IndividualProfile_Stage;");
        migrationBuilder.Sql("ALTER TABLE personal.IndividualProfile ADD CONSTRAINT CK_IndividualProfile_Stage CHECK (OnboardingStage IN (N'Started',N'Setup',N'Baselines',N'Preview',N'Activated',N'TourDone'));");
        migrationBuilder.DropColumn("JourneyLevel", "recovery", "RecoveryJourney");
        migrationBuilder.DropColumn("SetupAnswersJson", "personal", "IndividualProfile");
        migrationBuilder.DropColumn("SetupVersion", "personal", "IndividualProfile");
    }
}
