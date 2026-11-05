using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class CommercialModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<PlanVersion>(e =>
        {
            e.ToTable("PlanVersion", "commercial", t =>
            {
                t.HasCheckConstraint("CK_PlanVersion_No", "[VersionNo]>0");
                t.HasCheckConstraint("CK_PlanVersion_Price", "[Price] IS NULL OR [Price]>=0");
            });
            e.HasKey(x => x.Id); e.Property(x => x.AudienceCode).HasMaxLength(32);
            e.Property(x => x.PlanCode).HasMaxLength(64); e.Property(x => x.Price).HasColumnType("decimal(19,4)");
            e.Property(x => x.Currency).HasColumnType("char(3)");
            e.HasIndex(x => new { x.AudienceCode, x.PlanCode, x.VersionNo }).IsUnique();
            e.HasIndex(x => x.PublishedAtUtc);
        });
        m.Entity<PlanFeature>(e =>
        {
            e.ToTable("PlanFeature", "commercial", t => t.HasCheckConstraint("CK_PlanFeature_Limit", "[LimitValue] IS NULL OR [LimitValue]>0"));
            e.HasKey(x => x.Id); e.Property(x => x.FeatureCode).HasMaxLength(80);
            e.Property(x => x.PeriodCode).HasMaxLength(32);
            e.HasIndex(x => new { x.PlanVersionId, x.FeatureCode }).IsUnique();
            e.HasOne<PlanVersion>().WithMany().HasForeignKey(x => x.PlanVersionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<Subscription>(e =>
        {
            e.ToTable("Subscription", "commercial", t =>
            {
                t.HasCheckConstraint("CK_Subscription_Payer", "(CASE WHEN [PersonPayerId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [InstitutionPayerId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [ProviderPayerId] IS NULL THEN 0 ELSE 1 END)=1");
                t.HasCheckConstraint("CK_Subscription_Status", "[Status] IN (N'Proposed',N'Active',N'Expired',N'Cancelled')");
                t.HasCheckConstraint("CK_Subscription_Window", "[EndsAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [EndsAtUtc]>[StartsAtUtc])");
            });
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.PersonPayerId, x.Status });
            e.HasIndex(x => new { x.InstitutionPayerId, x.Status });
            e.HasIndex(x => new { x.ProviderPayerId, x.Status });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonPayerId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Institution>().WithMany().HasForeignKey(x => x.InstitutionPayerId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Provider>().WithMany().HasForeignKey(x => x.ProviderPayerId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<PlanVersion>().WithMany().HasForeignKey(x => x.PlanVersionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<EntitlementAllocation>(e =>
        {
            e.ToTable("EntitlementAllocation", "commercial", t =>
            {
                t.HasCheckConstraint("CK_EntitlementAllocation_Beneficiary", "(CASE WHEN [PersonId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [InstitutionId] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [ProviderId] IS NULL THEN 0 ELSE 1 END)=1");
                t.HasCheckConstraint("CK_EntitlementAllocation_Limit", "[LimitValue] IS NULL OR [LimitValue]>0");
                t.HasCheckConstraint("CK_EntitlementAllocation_Window", "[EffectiveToUtc] IS NULL OR ([EffectiveFromUtc] IS NOT NULL AND [EffectiveToUtc]>[EffectiveFromUtc])");
            });
            e.HasKey(x => x.Id); e.Property(x => x.FeatureCode).HasMaxLength(80);
            e.HasIndex(x => new { x.PersonId, x.FeatureCode });
            e.HasIndex(x => new { x.InstitutionId, x.FeatureCode });
            e.HasIndex(x => new { x.ProviderId, x.FeatureCode });
            e.HasIndex(x => new { x.FeatureCode, x.EffectiveFromUtc, x.EffectiveToUtc });
            e.HasOne<Subscription>().WithMany().HasForeignKey(x => x.SubscriptionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Institution>().WithMany().HasForeignKey(x => x.InstitutionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Provider>().WithMany().HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<UsageLedger>(e =>
        {
            e.ToTable("UsageLedger", "commercial", t => t.HasCheckConstraint("CK_UsageLedger_Quantity", "[Quantity]<>0"));
            e.HasKey(x => x.Id); e.Property(x => x.SourceKey).HasMaxLength(160);
            e.HasIndex(x => new { x.AllocationId, x.SourceKey }).IsUnique();
            e.HasIndex(x => new { x.AllocationId, x.RecordedAtUtc });
            e.HasOne<EntitlementAllocation>().WithMany().HasForeignKey(x => x.AllocationId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
