using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class RecoveryActivityModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<RecoveryJourney>(e =>
        {
            e.ToTable("RecoveryJourney", "recovery", t =>
            {
                t.HasCheckConstraint("CK_RecoveryJourney_Status", "[Status] IN (N'Active',N'Archived')");
                t.HasCheckConstraint("CK_RecoveryJourney_Level", "[JourneyLevel]>=1");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.Property(x => x.Status).HasMaxLength(24);
            e.Property(x => x.JourneyLevel).HasDefaultValue(1);
            e.HasIndex(x => x.PersonId).IsUnique().HasFilter("[Status]=N'Active'");
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<RecoveryCycle>(e =>
        {
            e.ToTable("RecoveryCycle", "recovery", t =>
            {
                t.HasCheckConstraint("CK_RecoveryCycle_Dates", "[EndLocalDate] IS NULL OR ([StartLocalDate] IS NOT NULL AND [EndLocalDate]>=[StartLocalDate])");
                t.HasCheckConstraint("CK_RecoveryCycle_Status", "[Status] IN (N'Draft',N'Preview',N'Active',N'ReviewDue',N'Ended',N'Reviewed',N'Paused',N'Cancelled')");
                t.HasCheckConstraint("CK_RecoveryCycle_No", "[CycleNo]>0");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(32); e.Property(x => x.TimeZoneId).HasMaxLength(80);
            e.HasIndex(x => new { x.JourneyId, x.CycleNo }).IsUnique();
            e.HasIndex(x => x.JourneyId).IsUnique().HasFilter("[Status] IN (N'Active',N'ReviewDue')");
            e.HasOne<RecoveryJourney>().WithMany().HasForeignKey(x => new { x.JourneyId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<PlanRevision>(e =>
        {
            e.ToTable("PlanRevision", "recovery", t =>
            {
                t.HasCheckConstraint("CK_PlanRevision_No", "[RevisionNo]>0");
                t.HasCheckConstraint("CK_PlanRevision_Status", "[Status] IN (N'Draft',N'Accepted',N'Superseded')");
                t.HasCheckConstraint("CK_PlanRevision_Accepted", "([Status]=N'Draft' AND [AcceptedAtUtc] IS NULL) OR ([Status] IN (N'Accepted',N'Superseded') AND [AcceptedAtUtc] IS NOT NULL)");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.CycleId });
            e.Property(x => x.GoalCode).HasMaxLength(64); e.Property(x => x.PolicyVersion).HasMaxLength(64);
            e.Property(x => x.Reason).HasMaxLength(500); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.CycleId, x.RevisionNo }).IsUnique();
            e.HasIndex(x => new { x.CycleId, x.EffectiveFromLocalDate });
            e.HasOne<RecoveryCycle>().WithMany().HasForeignKey(x => x.CycleId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<PracticeDefinition>(e =>
        {
            e.ToTable("PracticeDefinition", "activity", t =>
            {
                t.HasCheckConstraint("CK_PracticeDefinition_Type", "[PracticeType] IN (N'Depth Practice',N'Listening & Recall',N'Practical Micro-Challenge',N'Protected Work')");
                t.HasCheckConstraint("CK_PracticeDefinition_Status", "[Status] IN (N'Draft',N'Published',N'Retired')");
            });
            e.HasKey(x => x.Id); e.Property(x => x.Code).HasMaxLength(64);
            e.Property(x => x.PracticeType).HasMaxLength(40); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.Code).IsUnique();
        });
        m.Entity<PracticeVersion>(e =>
        {
            e.ToTable("PracticeVersion", "activity", t =>
            {
                t.HasCheckConstraint("CK_PracticeVersion_No", "[VersionNo]>0");
                t.HasCheckConstraint("CK_PracticeVersion_Tier", "[DifficultyTier]>0 AND ([EstimatedMinutes] IS NULL OR [EstimatedMinutes]>0)");
            });
            e.HasKey(x => x.Id); e.Property(x => x.ContentRef).HasMaxLength(300);
            e.Property(x => x.EvidenceTier).HasMaxLength(32); e.Property(x => x.ValidationVersion).HasMaxLength(64);
            e.HasIndex(x => new { x.DefinitionId, x.VersionNo }).IsUnique();
            e.HasIndex(x => new { x.DefinitionId, x.DifficultyTier });
            e.HasOne<PracticeDefinition>().WithMany().HasForeignKey(x => x.DefinitionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ScheduledAction>(e =>
        {
            e.ToTable("ScheduledAction", "recovery", t =>
            {
                t.HasCheckConstraint("CK_ScheduledAction_Practice", "[ActionKind]<>N'Practice' OR [PracticeVersionId] IS NOT NULL");
                t.HasCheckConstraint("CK_ScheduledAction_Status", "[Status] IN (N'Due',N'Completed',N'Missed',N'Rescheduled',N'Cancelled')");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.Property(x => x.ActionKind).HasMaxLength(32); e.Property(x => x.Status).HasMaxLength(32);
            e.HasIndex(x => new { x.CycleId, x.LocalDate, x.Status });
            e.HasOne<RecoveryCycle>().WithMany().HasForeignKey(x => new { x.CycleId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<PlanRevision>().WithMany().HasForeignKey(x => new { x.PlanRevisionId, x.CycleId })
                .HasPrincipalKey(x => new { x.Id, x.CycleId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<PracticeVersion>().WithMany().HasForeignKey(x => x.PracticeVersionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<PracticeAttempt>().WithMany().HasForeignKey(x => new { x.CompletedAttemptId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<PracticeAttempt>(e =>
        {
            e.ToTable("PracticeAttempt", "activity", t =>
            {
                t.HasCheckConstraint("CK_PracticeAttempt_Status", "[Status] IN (N'Started',N'Paused',N'Submitted',N'Completed',N'Invalid')");
                t.HasCheckConstraint("CK_PracticeAttempt_Validity", "([Status] IN (N'Started',N'Paused',N'Submitted') AND [Valid] IS NULL) OR ([Status]=N'Completed' AND [Valid]=1 AND [EndedAtUtc] IS NOT NULL) OR ([Status]=N'Invalid' AND [Valid]=0 AND [EndedAtUtc] IS NOT NULL)");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.OutcomeCode).HasMaxLength(40);
            e.HasIndex(x => new { x.PersonId, x.StartedAtUtc });
            e.HasIndex(x => x.EvidenceEventId).IsUnique().HasFilter("[EvidenceEventId] IS NOT NULL");
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<PracticeVersion>().WithMany().HasForeignKey(x => x.PracticeVersionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ScheduledAction>().WithMany().HasForeignKey(x => new { x.ScheduledActionId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => new { x.EvidenceEventId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.SubjectPersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<WeeklyReview>(e =>
        {
            e.ToTable("WeeklyReview", "recovery", t => t.HasCheckConstraint("CK_WeeklyReview_Week", "[WeekNo]>0"));
            e.HasKey(x => x.Id); e.Property(x => x.ManageabilityCode).HasMaxLength(40);
            e.Property(x => x.FitCode).HasMaxLength(40); e.Property(x => x.DecisionCode).HasMaxLength(40);
            e.HasIndex(x => new { x.CycleId, x.WeekNo }).IsUnique();
            e.HasOne<RecoveryCycle>().WithMany().HasForeignKey(x => x.CycleId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<PlanRevision>().WithMany().HasForeignKey(x => new { x.PlanRevisionId, x.CycleId })
                .HasPrincipalKey(x => new { x.Id, x.CycleId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<PracticeProgressionDecision>(e =>
        {
            e.ToTable("PracticeProgressionDecision", "activity", t =>
            {
                t.HasCheckConstraint("CK_PracticeProgressionDecision_Tiers", "[FromTier]>0 AND [ToTier]>0");
                t.HasCheckConstraint("CK_PracticeProgressionDecision_Decision", "[DecisionCode] IN (N'Accepted',N'Stayed',N'SteppedDown')");
            });
            e.HasKey(x => x.Id); e.Property(x => x.PracticeType).HasMaxLength(40);
            e.Property(x => x.PolicyVersion).HasMaxLength(64); e.Property(x => x.DecisionCode).HasMaxLength(32);
            e.HasIndex(x => new { x.PersonId, x.PracticeType, x.DecidedAtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<OfflineRoutine>(e =>
        {
            e.ToTable("OfflineRoutine", "activity", t => t.HasCheckConstraint("CK_OfflineRoutine_Status", "[Status] IN (N'Active',N'Paused',N'Archived')"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.Property(x => x.Title).HasMaxLength(160); e.Property(x => x.ScheduleRule).HasMaxLength(200);
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<RoutineCheckIn>(e =>
        {
            e.ToTable("RoutineCheckIn", "activity", t => t.HasCheckConstraint("CK_RoutineCheckIn_State", "[State] IN (N'Done',N'Skipped')"));
            e.HasKey(x => x.Id); e.Property(x => x.State).HasMaxLength(16);
            e.HasIndex(x => new { x.RoutineId, x.LocalDate }).IsUnique();
            e.HasOne<OfflineRoutine>().WithMany().HasForeignKey(x => new { x.RoutineId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => new { x.EvidenceEventId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.SubjectPersonId }).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
