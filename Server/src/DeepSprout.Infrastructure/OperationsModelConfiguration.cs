using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class OperationsModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<ContentRelease>(e =>
        {
            e.ToTable("ContentRelease", "governance", t => t.HasCheckConstraint("CK_ContentRelease_Version", "[VersionNo]>0"));
            e.HasKey(x => x.Id); e.Property(x => x.TargetCode).HasMaxLength(120); e.Property(x => x.PayloadRef).HasMaxLength(300);
            e.HasIndex(x => new { x.TargetCode, x.VersionNo }).IsUnique();
            e.HasIndex(x => new { x.TargetCode, x.PublishedAtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PublishedByPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ContentRelease>().WithMany().HasForeignKey(x => x.SupersedesId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<GovernanceAction>(e =>
        {
            e.ToTable("GovernanceAction", "governance"); e.HasKey(x => x.Id);
            e.Property(x => x.ActionCode).HasMaxLength(64); e.Property(x => x.ResourceType).HasMaxLength(64);
            e.Property(x => x.Reason).HasMaxLength(1000);
            e.HasIndex(x => new { x.ResourceType, x.ResourcePublicId, x.AtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ActorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<OutboxMessage>(e =>
        {
            e.ToTable("OutboxMessage", "ops", t =>
            {
                t.HasCheckConstraint("CK_OutboxMessage_Status", "[Status] IN (N'Pending',N'Delivered',N'DeadLetter')");
                t.HasCheckConstraint("CK_OutboxMessage_Attempts", "[Attempts]>=0");
            });
            e.HasKey(x => x.Id); e.HasIndex(x => x.EventPublicId).IsUnique();
            e.Property(x => x.EventType).HasMaxLength(120); e.Property(x => x.PayloadRef).HasMaxLength(300);
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.Status, x.NextAttemptAtUtc });
        });
        m.Entity<Notification>(e =>
        {
            e.ToTable("Notification", "ops", t => t.HasCheckConstraint("CK_Notification_Status", "[Status] IN (N'Pending',N'Ready',N'Read',N'Withdrawn')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.ResourceKind).HasMaxLength(64); e.Property(x => x.TemplateCode).HasMaxLength(80);
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.RecipientPersonId, x.EventPublicId, x.TemplateCode }).IsUnique();
            e.HasIndex(x => new { x.RecipientPersonId, x.CreatedAtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.RecipientPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<DeliveryAttempt>(e =>
        {
            e.ToTable("DeliveryAttempt", "ops", t => t.HasCheckConstraint("CK_DeliveryAttempt_Outcome", "[Outcome] IN (N'Attempted',N'Sent',N'Failed')"));
            e.HasKey(x => x.Id); e.Property(x => x.Channel).HasMaxLength(24);
            e.Property(x => x.ProviderRef).HasMaxLength(160); e.Property(x => x.Outcome).HasMaxLength(24);
            e.HasIndex(x => new { x.NotificationId, x.AttemptedAtUtc });
            e.HasOne<Notification>().WithMany().HasForeignKey(x => x.NotificationId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<IdempotencyRecord>(e =>
        {
            e.ToTable("IdempotencyRecord", "ops", t =>
            {
                t.HasCheckConstraint("CK_IdempotencyRecord_Status", "[Status] IN (N'InProgress',N'Completed',N'Failed')");
                t.HasCheckConstraint("CK_IdempotencyRecord_Hash", "DATALENGTH([RequestHash])=32");
            });
            e.HasKey(x => x.Id); e.Property(x => x.CommandCode).HasMaxLength(80);
            e.Property(x => x.IdempotencyKey).HasMaxLength(160); e.Property(x => x.RequestHash).HasMaxLength(32);
            e.Property(x => x.ResponseRef).HasMaxLength(300); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.ActorPersonId, x.CommandCode, x.IdempotencyKey }).IsUnique();
            e.HasIndex(x => x.ExpiresAtUtc);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ActorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
