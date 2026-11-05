using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class CommunityModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<Post>(e =>
        {
            e.ToTable("Post", "community", t =>
            {
                t.HasCheckConstraint("CK_Post_Status", "[Status] IN (N'Draft',N'Published',N'Hidden',N'Removed')");
                t.HasCheckConstraint("CK_Post_Published", "[Status]<>N'Published' OR [PublishedAtUtc] IS NOT NULL");
            });
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.Status, x.PublishedAtUtc });
            e.HasIndex(x => new { x.AuthorPersonId, x.CreatedAtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.AuthorPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => new { x.SharedEvidenceEventId, x.AuthorPersonId })
                .HasPrincipalKey(x => new { x.Id, x.SubjectPersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<Comment>(e =>
        {
            e.ToTable("Comment", "community", t => t.HasCheckConstraint("CK_Comment_Status", "[Status] IN (N'Published',N'Hidden',N'Removed')"));
            e.HasKey(x => x.Id); e.Property(x => x.Body).HasMaxLength(2000); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.PostId, x.CreatedAtUtc });
            e.HasOne<Post>().WithMany().HasForeignKey(x => x.PostId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.AuthorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<Reaction>(e =>
        {
            e.ToTable("Reaction", "community"); e.HasKey(x => x.Id);
            e.Property(x => x.ReactionCode).HasMaxLength(24);
            e.HasIndex(x => new { x.PostId, x.PersonId, x.ReactionCode }).IsUnique();
            e.HasIndex(x => new { x.PersonId, x.CreatedAtUtc });
            e.HasOne<Post>().WithMany().HasForeignKey(x => x.PostId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<Bookmark>(e =>
        {
            e.ToTable("Bookmark", "community"); e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.PostId, x.PersonId }).IsUnique();
            e.HasIndex(x => new { x.PersonId, x.CreatedAtUtc });
            e.HasOne<Post>().WithMany().HasForeignKey(x => x.PostId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ContentReport>(e =>
        {
            e.ToTable("ContentReport", "community", t =>
            {
                t.HasCheckConstraint("CK_ContentReport_Target", "([PostId] IS NOT NULL AND [CommentId] IS NULL) OR ([PostId] IS NULL AND [CommentId] IS NOT NULL)");
                t.HasCheckConstraint("CK_ContentReport_Status", "[Status] IN (N'Submitted',N'Reviewing',N'Resolved')");
            });
            e.HasKey(x => x.Id); e.Property(x => x.ReasonCode).HasMaxLength(40); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.Status, x.CreatedAtUtc });
            e.HasOne<Post>().WithMany().HasForeignKey(x => x.PostId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Comment>().WithMany().HasForeignKey(x => x.CommentId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ReporterPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ModerationDecision>(e =>
        {
            e.ToTable("ModerationDecision", "community", t => t.HasCheckConstraint("CK_ModerationDecision_Decision", "[Decision] IN (N'Hide',N'Dismiss',N'Remove',N'Restore')"));
            e.HasKey(x => x.Id); e.Property(x => x.Decision).HasMaxLength(24); e.Property(x => x.Reason).HasMaxLength(1000);
            e.HasIndex(x => new { x.ReportId, x.DecidedAtUtc });
            e.HasOne<ContentReport>().WithMany().HasForeignKey(x => x.ReportId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ModeratorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<JointGoal>(e =>
        {
            e.ToTable("JointGoal", "community", t => t.HasCheckConstraint("CK_JointGoal_Status", "[Status] IN (N'Active',N'Completed',N'Closed')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Title).HasMaxLength(200); e.Property(x => x.Status).HasMaxLength(24);
            e.Property(x => x.TargetLocalDate).HasColumnType("date"); e.HasIndex(x => new { x.CreatorPersonId, x.Status });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.CreatorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<JointGoalMember>(e =>
        {
            e.ToTable("JointGoalMember", "community", t => t.HasCheckConstraint("CK_JointGoalMember_Status", "[Status] IN (N'Invited',N'Active',N'Left')"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.GoalId, x.PersonId }); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<JointGoal>().WithMany().HasForeignKey(x => x.GoalId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<JointGoalCheckIn>(e =>
        {
            e.ToTable("JointGoalCheckIn", "community"); e.HasKey(x => x.Id);
            e.Property(x => x.Body).HasMaxLength(1000); e.Property(x => x.LocalDate).HasColumnType("date");
            e.HasIndex(x => new { x.GoalId, x.LocalDate });
            e.HasOne<JointGoalMember>().WithMany().HasForeignKey(x => new { x.GoalId, x.PersonId })
                .HasPrincipalKey(x => new { x.GoalId, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
