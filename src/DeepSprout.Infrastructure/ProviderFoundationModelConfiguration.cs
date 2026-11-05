using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class ProviderFoundationModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<Provider>(e =>
        {
            e.ToTable("Provider", "provider", t => t.HasCheckConstraint("CK_Provider_Status", "[Status] IN (N'Applied',N'Approved',N'Suspended',N'Closed')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Name).HasMaxLength(200); e.Property(x => x.Status).HasMaxLength(24);
            e.Property(x => x.CountryCode).HasColumnType("char(2)"); e.Property(x => x.HeadquartersCity).HasMaxLength(120);
            e.HasIndex(x => new { x.Status, x.Name });
        });
        m.Entity<ProviderVerificationCase>(e =>
        {
            e.ToTable("ProviderVerificationCase", "provider", t => t.HasCheckConstraint("CK_ProviderVerification_Status", "[Status] IN (N'Submitted',N'MoreInfo',N'Approved',N'Rejected')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.DecisionReason).HasMaxLength(1000);
            e.HasIndex(x => new { x.Status, x.CreatedAtUtc });
            e.HasOne<Provider>().WithMany().HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ApplicantPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SecureFile>().WithMany().HasForeignKey(x => x.EvidenceFileId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.DecidedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProviderMembership>(e =>
        {
            e.ToTable("ProviderMembership", "provider", t =>
            {
                t.HasCheckConstraint("CK_ProviderMembership_Status", "[Status] IN (N'Active',N'Revoked')");
                t.HasCheckConstraint("CK_ProviderMembership_Revocation", "([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)");
            });
            e.HasKey(x => x.Id); e.Property(x => x.Role).HasMaxLength(32); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.ProviderId, x.PersonId, x.Role }).IsUnique().HasFilter("[RevokedAtUtc] IS NULL");
            e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<Provider>().WithMany().HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<Experience>(e =>
        {
            e.ToTable("Experience", "provider", t =>
            {
                t.HasCheckConstraint("CK_Experience_CapacityTimes", "[Capacity]>0 AND [EndAtUtc]>[StartAtUtc]");
                t.HasCheckConstraint("CK_Experience_Status", "[Status] IN (N'Draft',N'Published',N'Active',N'Completed',N'Cancelled',N'Archived')");
            });
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Kind).HasMaxLength(24); e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.TimeZoneId).HasMaxLength(80);
            e.HasIndex(x => new { x.ProviderId, x.Status }); e.HasIndex(x => new { x.Status, x.StartAtUtc });
            e.HasOne<Provider>().WithMany().HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ExperienceRevision>(e =>
        {
            e.ToTable("ExperienceRevision", "provider", t =>
            {
                t.HasCheckConstraint("CK_ExperienceRevision_No", "[RevisionNo]>0");
                t.HasCheckConstraint("CK_ExperienceRevision_Cost", "([CostKind]=N'Free' AND [Price] IS NULL AND [Currency] IS NULL) OR ([CostKind]=N'Paid' AND [Price]>0 AND [Currency] IS NOT NULL)");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.ExperienceId });
            e.Property(x => x.Venue).HasMaxLength(300); e.Property(x => x.SafetyRef).HasMaxLength(300);
            e.Property(x => x.ConsentVersion).HasMaxLength(40); e.Property(x => x.CostKind).HasMaxLength(16);
            e.Property(x => x.Price).HasColumnType("decimal(19,4)"); e.Property(x => x.Currency).HasColumnType("char(3)");
            e.Property(x => x.CompletionRuleRef).HasMaxLength(120);
            e.HasIndex(x => new { x.ExperienceId, x.RevisionNo }).IsUnique();
            e.HasOne<Experience>().WithMany().HasForeignKey(x => x.ExperienceId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ExperienceSession>(e =>
        {
            e.ToTable("ExperienceSession", "provider", t =>
            {
                t.HasCheckConstraint("CK_ExperienceSession_Times", "[EndsAtUtc]>[StartsAtUtc]");
                t.HasCheckConstraint("CK_ExperienceSession_Status", "[Status] IN (N'Draft',N'Published',N'Cancelled',N'Closed')");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.ExperienceId });
            e.Property(x => x.Title).HasMaxLength(200); e.Property(x => x.Mode).HasMaxLength(20);
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.ExperienceId, x.StartsAtUtc });
            e.HasOne<Experience>().WithMany().HasForeignKey(x => x.ExperienceId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ExperienceBooking>(e =>
        {
            e.ToTable("ExperienceBooking", "provider", t => t.HasCheckConstraint("CK_ExperienceBooking_Status", "[Status] IN (N'Queued',N'Offered',N'Confirmed',N'Cancelled',N'CheckedIn',N'Completed',N'Declined')"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.ExperienceId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.Mode).HasMaxLength(20);
            e.Property(x => x.CredentialHash).HasMaxLength(32);
            e.HasIndex(x => new { x.ExperienceId, x.PersonId }).IsUnique();
            e.HasIndex(x => new { x.ExperienceId, x.Status, x.BookedAtUtc });
            e.HasOne<Experience>().WithMany().HasForeignKey(x => x.ExperienceId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ExperienceRevision>().WithMany().HasForeignKey(x => new { x.RevisionId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<SeatOffer>(e =>
        {
            e.ToTable("SeatOffer", "provider", t =>
            {
                t.HasCheckConstraint("CK_SeatOffer_Status", "[Status] IN (N'Offered',N'Accepted',N'Declined',N'Expired',N'Cancelled')");
                t.HasCheckConstraint("CK_SeatOffer_Times", "[ExpiresAtUtc]>[OfferedAtUtc]");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.ExperienceId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.HasIndex(x => x.BookingId).IsUnique().HasFilter("[Status]=N'Offered'");
            e.HasIndex(x => new { x.ExperienceId, x.Status, x.ExpiresAtUtc });
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasOne<ExperienceBooking>().WithMany().HasForeignKey(x => new { x.BookingId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
