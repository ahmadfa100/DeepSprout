using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class TaskModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<Assignment>(e =>
        {
            e.ToTable("Assignment", "task", t => t.HasCheckConstraint("CK_Assignment_Status", "[Status] IN (N'Draft',N'Published',N'Cancelled',N'Closed')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.GroupId, x.Status });
            e.HasOne<OperationalGroup>().WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.AuthorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<AssignmentRevision>(e =>
        {
            e.ToTable("AssignmentRevision", "task", t => t.HasCheckConstraint("CK_AssignmentRevision_No", "[RevisionNo]>0"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.AssignmentId });
            e.Property(x => x.ReviewMode).HasMaxLength(32); e.HasIndex(x => new { x.AssignmentId, x.RevisionNo }).IsUnique();
            e.HasOne<Assignment>().WithMany().HasForeignKey(x => x.AssignmentId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<PracticeVersion>().WithMany().HasForeignKey(x => x.PracticeVersionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<AssignmentRecipient>(e =>
        {
            e.ToTable("AssignmentRecipient", "task", t =>
            {
                t.HasCheckConstraint("CK_AssignmentRecipient_Attempts", "[LastAttemptNo]>=0");
                t.HasCheckConstraint("CK_AssignmentRecipient_Status", "[Status] IN (N'Assigned',N'Started',N'Submitted',N'Approved',N'Cancelled')");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.AssignmentId });
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.AssignmentId, x.PersonId }).IsUnique();
            e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<Assignment>().WithMany().HasForeignKey(x => x.AssignmentId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<AssignmentRevision>().WithMany().HasForeignKey(x => new { x.AssignedRevisionId, x.AssignmentId })
                .HasPrincipalKey(x => new { x.Id, x.AssignmentId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<SubmissionAttempt>(e =>
        {
            e.ToTable("SubmissionAttempt", "task", t => t.HasCheckConstraint("CK_SubmissionAttempt_No", "[AttemptNo]>0"));
            e.HasKey(x => x.Id); e.HasIndex(x => new { x.RecipientId, x.AttemptNo }).IsUnique();
            e.HasIndex(x => new { x.RecipientId, x.SubmittedAtUtc });
            e.HasOne<AssignmentRecipient>().WithMany().HasForeignKey(x => new { x.RecipientId, x.AssignmentId })
                .HasPrincipalKey(x => new { x.Id, x.AssignmentId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<AssignmentRevision>().WithMany().HasForeignKey(x => new { x.AssignmentRevisionId, x.AssignmentId })
                .HasPrincipalKey(x => new { x.Id, x.AssignmentId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SecureFile>().WithMany().HasForeignKey(x => x.FileId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ReviewDecision>(e =>
        {
            e.ToTable("ReviewDecision", "task", t =>
            {
                t.HasCheckConstraint("CK_ReviewDecision_No", "[DecisionNo]>0");
                t.HasCheckConstraint("CK_ReviewDecision_Decision", "[Decision] IN (N'Approved',N'NeedsRevision',N'Rejected')");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.AttemptId });
            e.Property(x => x.Decision).HasMaxLength(24); e.Property(x => x.Feedback).HasMaxLength(2000);
            e.Property(x => x.RuleVersion).HasMaxLength(64);
            e.HasIndex(x => new { x.AttemptId, x.DecisionNo }).IsUnique();
            e.HasIndex(x => x.SupersedesId).IsUnique().HasFilter("[SupersedesId] IS NOT NULL");
            e.HasIndex(x => new { x.ReviewerPersonId, x.DecidedAtUtc });
            e.HasOne<SubmissionAttempt>().WithMany().HasForeignKey(x => x.AttemptId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ReviewDecision>().WithMany().HasForeignKey(x => new { x.SupersedesId, x.AttemptId })
                .HasPrincipalKey(x => new { x.Id, x.AttemptId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ReviewerPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => x.EvidenceEventId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ReviewPrivateNote>(e =>
        {
            e.ToTable("ReviewPrivateNote", "task"); e.HasKey(x => x.Id);
            e.HasIndex(x => x.DecisionId);
            e.HasOne<ReviewDecision>().WithMany().HasForeignKey(x => x.DecisionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.AuthorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<CoachReport>(e =>
        {
            e.ToTable("CoachReport", "task", t =>
            {
                t.HasCheckConstraint("CK_CoachReport_Dates", "[PeriodEnd]>=[PeriodStart]");
                t.HasCheckConstraint("CK_CoachReport_Status", "[Status] IN (N'Draft',N'Submitted')");
            });
            e.HasKey(x => x.Id); e.Property(x => x.PeriodStart).HasColumnType("date"); e.Property(x => x.PeriodEnd).HasColumnType("date");
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.GroupId, x.PeriodStart });
            e.HasOne<OperationalGroup>().WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.AuthorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<SupervisorReport>(e =>
        {
            e.ToTable("SupervisorReport", "task", t =>
            {
                t.HasCheckConstraint("CK_SupervisorReport_Dates", "[PeriodEnd]>=[PeriodStart]");
                t.HasCheckConstraint("CK_SupervisorReport_Status", "[Status] IN (N'Draft',N'Submitted')");
            });
            e.HasKey(x => x.Id); e.Property(x => x.PeriodStart).HasColumnType("date"); e.Property(x => x.PeriodEnd).HasColumnType("date");
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.InitiativeId, x.PeriodStart });
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.AuthorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
