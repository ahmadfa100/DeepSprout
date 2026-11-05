using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class InstitutionExtensionsModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<InitiativeContent>(e =>
        {
            e.ToTable("InitiativeContent", "institution", t =>
            {
                t.HasCheckConstraint("CK_InitiativeContent_Status", "[Status] IN (N'Draft',N'Published',N'Removed')");
                t.HasCheckConstraint("CK_InitiativeContent_Order", "[SortOrder]>0");
            });
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.InitiativeId, x.SortOrder, x.ContentReleaseId }).IsUnique();
            e.HasIndex(x => new { x.InitiativeId, x.Status });
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ContentRelease>().WithMany().HasForeignKey(x => x.ContentReleaseId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<InitiativeSeatOffer>(e =>
        {
            e.ToTable("InitiativeSeatOffer", "institution", t =>
            {
                t.HasCheckConstraint("CK_InitiativeSeatOffer_Status", "[Status] IN (N'Offered',N'Accepted',N'Declined',N'Expired',N'Cancelled')");
                t.HasCheckConstraint("CK_InitiativeSeatOffer_Times", "[ExpiresAtUtc]>[OfferedAtUtc]");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.InitiativeId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.ApplicationId).IsUnique().HasFilter("[Status]=N'Offered'");
            e.HasIndex(x => new { x.InitiativeId, x.Status, x.ExpiresAtUtc });
            e.HasOne<InitiativeApplication>().WithMany().HasForeignKey(x => new { x.ApplicationId, x.InitiativeId })
                .HasPrincipalKey(x => new { x.Id, x.InitiativeId }).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
