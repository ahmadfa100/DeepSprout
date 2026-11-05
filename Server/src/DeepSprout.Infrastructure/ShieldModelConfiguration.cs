using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class ShieldModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<ExtensionInstallation>(e =>
        {
            e.ToTable("ExtensionInstallation", "shield", t =>
            {
                t.HasCheckConstraint("CK_ExtensionInstallation_Status", "[Status] IN (N'Connected',N'Disconnected',N'Revoked')");
                t.HasCheckConstraint("CK_ExtensionInstallation_Revoked", "([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL) OR ([Status]<>N'Revoked' AND [RevokedAtUtc] IS NULL)");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.HasIndex(x => x.InstallationPublicId).IsUnique(); e.Property(x => x.InstallationPublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ShieldConfiguration>(e =>
        {
            e.ToTable("ShieldConfiguration", "shield", t =>
            {
                t.HasCheckConstraint("CK_ShieldConfiguration_Version", "[VersionNo]>0");
                t.HasCheckConstraint("CK_ShieldConfiguration_Threshold", "[ThresholdMinutes] IS NULL OR [ThresholdMinutes]>0");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.HasIndex(x => new { x.PersonId, x.VersionNo }).IsUnique();
            e.Property(x => x.ConsentVersion).HasMaxLength(40);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ShieldSelectedDomain>(e =>
        {
            e.ToTable("ShieldSelectedDomain", "shield"); e.HasKey(x => x.Id);
            e.HasAlternateKey(x => new { x.ConfigurationId, x.DomainCode });
            e.Property(x => x.DomainCode).HasMaxLength(120);
            e.HasOne<ShieldConfiguration>().WithMany().HasForeignKey(x => x.ConfigurationId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProtectionSession>(e =>
        {
            e.ToTable("ProtectionSession", "shield", t =>
            {
                t.HasCheckConstraint("CK_ProtectionSession_Times", "[EndsAtUtc]>[StartedAtUtc]");
                t.HasCheckConstraint("CK_ProtectionSession_Status", "[Status] IN (N'Configured',N'Active',N'Ended',N'Failed',N'Disconnected')");
            });
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.FailureCode).HasMaxLength(40);
            e.HasIndex(x => new { x.PersonId, x.StartedAtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ExtensionInstallation>().WithMany().HasForeignKey(x => new { x.InstallationId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ShieldConfiguration>().WithMany().HasForeignKey(x => new { x.ConfigurationId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<BrowserUsagePeriod>(e =>
        {
            e.ToTable("BrowserUsagePeriod", "shield", t => t.HasCheckConstraint("CK_BrowserUsagePeriod_Counts", "[ObservedSeconds]>=0 AND [CoverageSeconds]>=0 AND [GapCount]>=0"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.ConfigurationId });
            e.Property(x => x.TimeZoneId).HasMaxLength(80); e.Property(x => x.SourceHash).HasMaxLength(32).IsFixedLength();
            e.HasIndex(x => new { x.InstallationId, x.SequenceNo }).IsUnique();
            e.HasIndex(x => new { x.InstallationId, x.LocalDate });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ExtensionInstallation>().WithMany().HasForeignKey(x => new { x.InstallationId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ShieldConfiguration>().WithMany().HasForeignKey(x => new { x.ConfigurationId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<BrowserUsageDomain>(e =>
        {
            e.ToTable("BrowserUsageDomain", "shield", t => t.HasCheckConstraint("CK_BrowserUsageDomain_Seconds", "[ObservedSeconds]>=0"));
            e.HasKey(x => x.Id); e.Property(x => x.DomainCode).HasMaxLength(120);
            e.HasIndex(x => new { x.UsagePeriodId, x.DomainCode }).IsUnique();
            e.HasOne<BrowserUsagePeriod>().WithMany().HasForeignKey(x => new { x.UsagePeriodId, x.ConfigurationId })
                .HasPrincipalKey(x => new { x.Id, x.ConfigurationId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ShieldSelectedDomain>().WithMany().HasForeignKey(x => new { x.ConfigurationId, x.DomainCode })
                .HasPrincipalKey(x => new { x.ConfigurationId, x.DomainCode }).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
