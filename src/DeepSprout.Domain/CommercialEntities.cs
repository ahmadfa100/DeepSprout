namespace DeepSprout.Domain;

public sealed class PlanVersion : Record
{
    public string AudienceCode { get; set; } = "";
    public string PlanCode { get; set; } = "";
    public int VersionNo { get; set; }
    public decimal? Price { get; set; }
    public string? Currency { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
}
public sealed class PlanFeature : Record
{
    public long PlanVersionId { get; set; }
    public string FeatureCode { get; set; } = "";
    public int? LimitValue { get; set; }
    public string? PeriodCode { get; set; }
}
public sealed class Subscription : MutableRecord
{
    public long? PersonPayerId { get; set; }
    public long? InstitutionPayerId { get; set; }
    public long? ProviderPayerId { get; set; }
    public long PlanVersionId { get; set; }
    public string Status { get; set; } = "Proposed";
    public DateTime? StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }
}
public sealed class EntitlementAllocation : MutableRecord
{
    public long? SubscriptionId { get; set; }
    public long? PersonId { get; set; }
    public long? InstitutionId { get; set; }
    public long? ProviderId { get; set; }
    public string FeatureCode { get; set; } = "";
    public int? LimitValue { get; set; }
    public DateTime? EffectiveFromUtc { get; set; }
    public DateTime? EffectiveToUtc { get; set; }
}
public sealed class UsageLedger : Record
{
    public long AllocationId { get; set; }
    public string SourceKey { get; set; } = "";
    public int Quantity { get; set; }
    public DateTime RecordedAtUtc { get; set; }
}
