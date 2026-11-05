namespace DeepSprout.Domain;

public sealed class ContentRelease : Record
{
    public string TargetCode { get; set; } = "";
    public int VersionNo { get; set; }
    public string PayloadRef { get; set; } = "";
    public long PublishedByPersonId { get; set; }
    public DateTime PublishedAtUtc { get; set; }
    public long? SupersedesId { get; set; }
}

public sealed class GovernanceAction : Record
{
    public long ActorPersonId { get; set; }
    public string ActionCode { get; set; } = "";
    public string ResourceType { get; set; } = "";
    public Guid ResourcePublicId { get; set; }
    public string Reason { get; set; } = "";
    public DateTime AtUtc { get; set; }
}

public sealed class OutboxMessage : MutableRecord
{
    public Guid EventPublicId { get; set; }
    public string EventType { get; set; } = "";
    public string PayloadRef { get; set; } = "";
    public DateTime OccurredAtUtc { get; set; }
    public string Status { get; set; } = "Pending";
    public int Attempts { get; set; }
    public DateTime? NextAttemptAtUtc { get; set; }
}

public sealed class Notification : MutableRecord
{
    public Guid PublicId { get; set; }
    public long RecipientPersonId { get; set; }
    public Guid EventPublicId { get; set; }
    public string ResourceKind { get; set; } = "";
    public Guid ResourcePublicId { get; set; }
    public string TemplateCode { get; set; } = "";
    public string Status { get; set; } = "Pending";
    public DateTime? ReadAtUtc { get; set; }
}

public sealed class DeliveryAttempt : Record
{
    public long NotificationId { get; set; }
    public string Channel { get; set; } = "";
    public string? ProviderRef { get; set; }
    public string Outcome { get; set; } = "Attempted";
    public DateTime AttemptedAtUtc { get; set; }
}

public sealed class IdempotencyRecord : MutableRecord
{
    public long ActorPersonId { get; set; }
    public string CommandCode { get; set; } = "";
    public string IdempotencyKey { get; set; } = "";
    public byte[] RequestHash { get; set; } = [];
    public string? ResponseRef { get; set; }
    public string Status { get; set; } = "InProgress";
    public DateTime ExpiresAtUtc { get; set; }
}
