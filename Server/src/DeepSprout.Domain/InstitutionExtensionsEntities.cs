namespace DeepSprout.Domain;

public sealed class InitiativeContent : MutableRecord
{
    public long InitiativeId { get; set; }
    public long ContentReleaseId { get; set; }
    public short SortOrder { get; set; }
    public string Status { get; set; } = "Draft";
}
public sealed class InitiativeSeatOffer : MutableRecord
{
    public Guid PublicId { get; set; }
    public long ApplicationId { get; set; }
    public long InitiativeId { get; set; }
    public string Status { get; set; } = "Offered";
    public DateTime OfferedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? DecisionAtUtc { get; set; }
}
