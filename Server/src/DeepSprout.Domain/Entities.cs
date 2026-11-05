namespace DeepSprout.Domain;

public abstract class Record
{
    public long Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public abstract class MutableRecord : Record
{
    public DateTime UpdatedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = [];
}

public sealed class Person : MutableRecord
{
    public Guid PublicId { get; set; }
    public string DisplayName { get; set; } = "";
    public string Status { get; set; } = "Active";
    public bool IndividualEnabled { get; set; }
}

public sealed class PersonEmail : MutableRecord
{
    public long PersonId { get; set; }
    public string NormalizedEmail { get; set; } = "";
    public string Status { get; set; } = "Pending";
    public bool IsPrimary { get; set; }
    public DateTime? VerifiedAtUtc { get; set; }
}

public sealed class PasswordCredential : MutableRecord
{
    public long PersonId { get; set; }
    public byte[] Hash { get; set; } = [];
    public string Algorithm { get; set; } = "";
    public string Parameters { get; set; } = "";
    public string Status { get; set; } = "Active";
    public DateTime? RotatedAtUtc { get; set; }
}

public sealed class OtpChallenge : MutableRecord
{
    public long? PersonId { get; set; }
    public string NormalizedEmail { get; set; } = "";
    public string Purpose { get; set; } = "";
    public byte[] CodeHash { get; set; } = [];
    public short AttemptCount { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }
    public string Status { get; set; } = "Issued";
}

public sealed class GlobalGrant : MutableRecord
{
    public long PersonId { get; set; }
    public string Capability { get; set; } = "";
    public long GrantedByPersonId { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public DateTime? GrantedAtUtc { get; set; }
}

public sealed class ConsentRecord : Record
{
    public long PersonId { get; set; }
    public string PurposeCode { get; set; } = "";
    public string NoticeVersion { get; set; } = "";
    public string Decision { get; set; } = "";
    public string? EvidenceRef { get; set; }
    public DateTime DecidedAtUtc { get; set; }
}

public sealed class SecureFile : MutableRecord
{
    public long? OwnerPersonId { get; set; }
    public string Purpose { get; set; } = "";
    public string ObjectKey { get; set; } = "";
    public string MimeType { get; set; } = "";
    public long Bytes { get; set; }
    public byte[] Sha256 { get; set; } = [];
    public string Status { get; set; } = "Pending";
    public DateTime? RetentionUntilUtc { get; set; }
}

public sealed class Institution : MutableRecord
{
    public Guid PublicId { get; set; }
    public string Name { get; set; } = "";
    public string Status { get; set; } = "Applied";
    public string CountryCode { get; set; } = "";
    public string? HeadquartersCity { get; set; }
}

public sealed class InstitutionVerificationCase : MutableRecord
{
    public long InstitutionId { get; set; }
    public long ApplicantPersonId { get; set; }
    public string Status { get; set; } = "Submitted";
    public long? EvidenceFileId { get; set; }
    public long? DecidedByPersonId { get; set; }
    public string? DecisionReason { get; set; }
    public DateTime? DecidedAtUtc { get; set; }
}

public sealed class RepresentativeMembership : MutableRecord
{
    public long InstitutionId { get; set; }
    public long PersonId { get; set; }
    public string Status { get; set; } = "Active";
    public long GrantedByPersonId { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
}

public sealed class Initiative : MutableRecord
{
    public Guid PublicId { get; set; }
    public long InstitutionId { get; set; }
    public string? Title { get; set; }
    public string? Mode { get; set; }
    public string Status { get; set; } = "Draft";
    public short? Capacity { get; set; }
    public string? TimeZoneId { get; set; }
    public DateTime? StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }
    public DateTime? WithdrawalCutoffAtUtc { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
    public long? CancelledByPersonId { get; set; }
}

public sealed class InitiativeDraft : MutableRecord
{
    public long InitiativeId { get; set; }
    public long? BaseRevisionId { get; set; }
    public byte LastSavedStage { get; set; }
    public string? Stage1Json { get; set; }
    public string? Stage2Json { get; set; }
    public string? Stage3Json { get; set; }
    public string? Stage4Json { get; set; }
    public string? Stage5Json { get; set; }
    public string? Stage6Json { get; set; }
    public string Status { get; set; } = "Draft";
    public long UpdatedByPersonId { get; set; }
    public long? PublishedRevisionId { get; set; }
}

public sealed class InitiativeRevision : Record
{
    public long InitiativeId { get; set; }
    public int RevisionNo { get; set; }
    public string Summary { get; set; } = "";
    public string AudienceCode { get; set; } = "";
    public string? CoverageCode { get; set; }
    public string CostKind { get; set; } = "Free";
    public decimal? Price { get; set; }
    public string? Currency { get; set; }
    public string CompletionPolicyRef { get; set; } = "";
    public string Title { get; set; } = "";
    public string Mode { get; set; } = "";
    public short Capacity { get; set; }
    public string TimeZoneId { get; set; } = "";
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }
    public DateTime WithdrawalCutoffAtUtc { get; set; }
    public string PublishedSnapshotJson { get; set; } = "{}";
    public DateTime? PublishedAtUtc { get; set; }
}

public sealed class InitiativeApplication : MutableRecord
{
    public Guid PublicId { get; set; }
    public long InitiativeId { get; set; }
    public long PersonId { get; set; }
    public long TermsRevisionId { get; set; }
    public string Status { get; set; } = "Pending";
    public int AttemptNo { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
    public string? ClosedReason { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
}

public sealed class InitiativeApplicationDecision : Record
{
    public long ApplicationId { get; set; }
    public long InitiativeId { get; set; }
    public int DecisionNo { get; set; }
    public string Action { get; set; } = "";
    public long ActorPersonId { get; set; }
    public string? Reason { get; set; }
    public long TermsRevisionId { get; set; }
    public DateTime AtUtc { get; set; }
}

public sealed class InitiativeMembership : MutableRecord
{
    public Guid PublicId { get; set; }
    public long InitiativeId { get; set; }
    public long ApplicationId { get; set; }
    public long PersonId { get; set; }
    public string Status { get; set; } = "Accepted";
    public DateTime AcceptedAtUtc { get; set; }
    public DateTime? EndedAtUtc { get; set; }
    public DateTime? CapacityReleasedAtUtc { get; set; }
    public DateTime WithdrawalCutoffAtUtc { get; set; }
    public string? EndReason { get; set; }
}

public sealed class InitiativeStaffInvitation : MutableRecord
{
    public long InitiativeId { get; set; }
    public string NormalizedEmail { get; set; } = "";
    public string Role { get; set; } = "";
    public byte[] TokenHash { get; set; } = [];
    public DateTime ExpiresAtUtc { get; set; }
    public string Status { get; set; } = "Pending";
    public long InvitedByPersonId { get; set; }
}

public sealed class InitiativeStaffAppointment : MutableRecord
{
    public long InitiativeId { get; set; }
    public long PersonId { get; set; }
    public long InvitationId { get; set; }
    public string Role { get; set; } = "";
    public string Status { get; set; } = "Active";
    public DateTime AcceptedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
}

public sealed class AuditEvent : Record
{
    public long? ActorPersonId { get; set; }
    public string? SelectedGrantKind { get; set; }
    public long? SelectedGrantId { get; set; }
    public string ResourceKind { get; set; } = "";
    public Guid ResourcePublicId { get; set; }
    public string Action { get; set; } = "";
    public string? BeforeStatus { get; set; }
    public string? AfterStatus { get; set; }
    public byte[]? BeforeHash { get; set; }
    public byte[]? AfterHash { get; set; }
    public string? Reason { get; set; }
    public DateTime AtUtc { get; set; }
    public Guid CorrelationId { get; set; }
}
