using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class LabModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<AssessmentInstrument>(e =>
        {
            e.ToTable("AssessmentInstrument", "lab", t => t.HasCheckConstraint("CK_AssessmentInstrument_Status", "[Status] IN (N'Draft',N'Published',N'Retired')"));
            e.HasKey(x => x.Id);
            e.Property(x => x.Code).HasMaxLength(64); e.Property(x => x.Title).HasMaxLength(160); e.Property(x => x.Status).HasMaxLength(32);
            e.HasIndex(x => x.Code).IsUnique();
        });
        m.Entity<InstrumentVersion>(e =>
        {
            e.ToTable("InstrumentVersion", "lab", t => t.HasCheckConstraint("CK_InstrumentVersion_No", "[VersionNo]>0"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.InstrumentId });
            e.HasIndex(x => new { x.InstrumentId, x.VersionNo }).IsUnique();
            e.HasIndex(x => new { x.InstrumentId, x.PublishedAtUtc });
            e.Property(x => x.ContentRef).HasMaxLength(300); e.Property(x => x.ScoringVersion).HasMaxLength(64);
            e.Property(x => x.ProtocolVersion).HasMaxLength(64); e.Property(x => x.ComparabilityGroup).HasMaxLength(64);
            e.HasOne<AssessmentInstrument>().WithMany().HasForeignKey(x => x.InstrumentId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<AssessmentWindow>(e =>
        {
            e.ToTable("AssessmentWindow", "lab", t =>
            {
                t.HasCheckConstraint("CK_AssessmentWindow_Interval", "[ClosesAtUtc]>[OpensAtUtc]");
                t.HasCheckConstraint("CK_AssessmentWindow_Status", "[Status] IN (N'Open',N'Closed',N'Used')");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.Property(x => x.WindowKey).HasMaxLength(120); e.Property(x => x.PolicyVersion).HasMaxLength(64);
            e.Property(x => x.Status).HasMaxLength(32);
            e.HasIndex(x => new { x.PersonId, x.WindowKey }).IsUnique();
            e.HasIndex(x => new { x.PersonId, x.OpensAtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<AssessmentAttempt>(e =>
        {
            e.ToTable("AssessmentAttempt", "lab", t =>
            {
                t.HasCheckConstraint("CK_AssessmentAttempt_Status", "[Status] IN (N'Started',N'Paused',N'Submitted',N'Valid',N'Invalid')");
                t.HasCheckConstraint("CK_AssessmentAttempt_Finished", "([Status] IN (N'Started',N'Paused') AND [FinishedAtUtc] IS NULL) OR ([Status] IN (N'Submitted',N'Valid',N'Invalid') AND [FinishedAtUtc] IS NOT NULL AND [FinishedAtUtc]>=[StartedAtUtc])");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Kind).HasMaxLength(24); e.Property(x => x.Status).HasMaxLength(24);
            e.Property(x => x.ValidityCode).HasMaxLength(40); e.Property(x => x.AccessibilityMode).HasMaxLength(40);
            e.HasIndex(x => new { x.PersonId, x.InstrumentId, x.FinishedAtUtc });
            e.HasIndex(x => new { x.PersonId, x.InstrumentId }).IsUnique().HasFilter("[Kind]=N'Baseline' AND [Status]=N'Valid'");
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<AssessmentInstrument>().WithMany().HasForeignKey(x => x.InstrumentId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<InstrumentVersion>().WithMany().HasForeignKey(x => new { x.InstrumentVersionId, x.InstrumentId })
                .HasPrincipalKey(x => new { x.Id, x.InstrumentId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<AssessmentWindow>().WithMany().HasForeignKey(x => new { x.WindowId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<AssessmentResponse>(e =>
        {
            e.ToTable("AssessmentResponse", "lab", t =>
            {
                t.HasCheckConstraint("CK_AssessmentResponse_Trial", "[TrialNo]>0");
                t.HasCheckConstraint("CK_AssessmentResponse_Latency", "[LatencyMs] IS NULL OR [LatencyMs]>=0");
            });
            e.HasKey(x => x.Id); e.Property(x => x.ItemKey).HasMaxLength(80);
            e.Property(x => x.ResponseNumber).HasColumnType("decimal(12,4)");
            e.HasIndex(x => new { x.AttemptId, x.ItemKey, x.TrialNo }).IsUnique();
            e.HasOne<AssessmentAttempt>().WithMany().HasForeignKey(x => x.AttemptId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<AssessmentScore>(e =>
        {
            e.ToTable("AssessmentScore", "lab"); e.HasKey(x => x.Id);
            e.Property(x => x.ScoringVersion).HasMaxLength(64); e.Property(x => x.MetricCode).HasMaxLength(64);
            e.Property(x => x.Value).HasColumnType("decimal(12,4)");
            e.HasIndex(x => new { x.AttemptId, x.ScoringVersion, x.MetricCode }).IsUnique();
            e.HasIndex(x => x.AttemptId);
            e.HasOne<AssessmentAttempt>().WithMany().HasForeignKey(x => x.AttemptId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<IndividualProfile>(e =>
        {
            e.ToTable("IndividualProfile", "personal", t =>
            {
                t.HasCheckConstraint("CK_IndividualProfile_Stage", "[OnboardingStage] IN (N'Started',N'Setup',N'QuickSetup',N'Story',N'Home',N'Baselines',N'Preview',N'Activated',N'TourDone')");
                t.HasCheckConstraint("CK_IndividualProfile_SetupAnswers", "[SetupAnswersJson] IS NULL OR (ISJSON([SetupAnswersJson])=1 AND [SetupVersion]>0)");
            });
            e.HasKey(x => x.Id); e.HasIndex(x => x.PersonId).IsUnique();
            e.Property(x => x.GoalCode).HasMaxLength(64); e.Property(x => x.PreferredTimeZone).HasMaxLength(80);
            e.Property(x => x.ConsentVersion).HasMaxLength(40); e.Property(x => x.OnboardingStage).HasMaxLength(40);
            e.Property(x => x.SetupAnswersJson).HasColumnType("nvarchar(max)");
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<AssessmentAttempt>().WithMany().HasForeignKey(x => new { x.LastAssessmentAttemptId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
