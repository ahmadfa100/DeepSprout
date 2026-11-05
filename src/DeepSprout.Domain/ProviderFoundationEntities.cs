namespace DeepSprout.Domain;

public sealed class Provider : MutableRecord
{
    public Guid PublicId { get; set; }
    public string Name { get; set; } = "";
    public string Status { get; set; } = "Applied";
    public string CountryCode { get; set; } = "";
    public string? HeadquartersCity { get; set; }
}
public sealed class ProviderVerificationCase : MutableRecord
{
    public long ProviderId { get; set; }
    public long ApplicantPersonId { get; set; }
    public string Status { get; set; } = "Submitted";
    public long? EvidenceFileId { get; set; }
    public long? DecidedByPersonId { get; set; }
    public string? DecisionReason { get; set; }
}
public sealed class ProviderMembership : MutableRecord
{
    public long ProviderId { get; set; }
    public long PersonId { get; set; }
    public string Role { get; set; } = "";
    public string Status { get; set; } = "Active";
    public DateTime? RevokedAtUtc { get; set; }
}
public sealed class Experience : MutableRecord
{
    public Guid PublicId { get; set; }
    public long ProviderId { get; set; }
    public string Kind { get; set; } = "";
    public string Title { get; set; } = "";
    public string Status { get; set; } = "Draft";
    public int Capacity { get; set; }
    public string TimeZoneId { get; set; } = "";
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
}
public sealed class ExperienceRevision : Record
{
    public long ExperienceId { get; set; }
    public int RevisionNo { get; set; }
    public string Venue { get; set; } = "";
    public string SafetyRef { get; set; } = "";
    public string ConsentVersion { get; set; } = "";
    public string CostKind { get; set; } = "Free";
    public decimal? Price { get; set; }
    public string? Currency { get; set; }
    public string CompletionRuleRef { get; set; } = "";
    public DateTime PublishedAtUtc { get; set; }
}
public sealed class ExperienceSession : MutableRecord
{
    public long ExperienceId { get; set; }
    public string Title { get; set; } = "";
    public string Mode { get; set; } = "";
    public string Status { get; set; } = "Draft";
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }
}
public sealed class ExperienceBooking : MutableRecord
{
    public Guid PublicId { get; set; }
    public long ExperienceId { get; set; }
    public long PersonId { get; set; }
    public long RevisionId { get; set; }
    public string Status { get; set; } = "Queued";
    public string Mode { get; set; } = "";
    public byte[]? CredentialHash { get; set; }
    public DateTime? CapacityReleasedAtUtc { get; set; }
    public DateTime BookedAtUtc { get; set; }
}
public sealed class SeatOffer : MutableRecord
{
    public Guid PublicId { get; set; }
    public long ExperienceId { get; set; }
    public long BookingId { get; set; }
    public string Status { get; set; } = "Offered";
    public DateTime OfferedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? DecisionAtUtc { get; set; }
}
