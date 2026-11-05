namespace DeepSprout.Domain;

public sealed class EvidenceEvent : Record
{
    public Guid EventPublicId { get; set; }
    public string SourceContext { get; set; } = "";
    public string SourceKey { get; set; } = "";
    public long SubjectPersonId { get; set; }
    public string Kind { get; set; } = "";
    public string Provenance { get; set; } = "";
    public string SourceVersion { get; set; } = "";
    public DateTime OccurredAtUtc { get; set; }
    public string Validity { get; set; } = "Accepted";
    public long? InvalidatesEventId { get; set; }
}

public sealed class RewardPolicyVersion : Record
{
    public string PolicyCode { get; set; } = "";
    public int VersionNo { get; set; }
    public string RuleRef { get; set; } = "";
    public DateTime PublishedAtUtc { get; set; }
}

public sealed class GroupGarden : MutableRecord
{
    public long? InitiativeId { get; set; }
    public long? IndependentGroupId { get; set; }
    public long? ProgramId { get; set; }
    public string Status { get; set; } = "Active";
}

public sealed class PersonalRewardEntry : Record
{
    public long EvidenceEventId { get; set; }
    public long PersonId { get; set; }
    public long PolicyVersionId { get; set; }
    public string EffectCode { get; set; } = "";
    public string EntryKind { get; set; } = "Grant";
    public short Units { get; set; }
    public long? ReversesEntryId { get; set; }
    public DateTime DecidedAtUtc { get; set; }
}

public sealed class GroupRewardEntry : Record
{
    public long EvidenceEventId { get; set; }
    public long GroupGardenId { get; set; }
    public long PolicyVersionId { get; set; }
    public string EffectCode { get; set; } = "";
    public string EntryKind { get; set; } = "Grant";
    public short Units { get; set; }
    public long? ReversesEntryId { get; set; }
    public DateTime DecidedAtUtc { get; set; }
}
