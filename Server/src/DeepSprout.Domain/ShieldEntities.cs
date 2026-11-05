namespace DeepSprout.Domain;

public sealed class ExtensionInstallation : MutableRecord
{
    public long PersonId { get; set; }
    public Guid InstallationPublicId { get; set; }
    public string Status { get; set; } = "Connected";
    public DateTime PairedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
}

public sealed class ShieldConfiguration : Record
{
    public long PersonId { get; set; }
    public int VersionNo { get; set; }
    public short? ThresholdMinutes { get; set; }
    public string ConsentVersion { get; set; } = "";
    public DateTime EffectiveAtUtc { get; set; }
}

public sealed class ShieldSelectedDomain : Record
{
    public long ConfigurationId { get; set; }
    public string DomainCode { get; set; } = "";
}

public sealed class ProtectionSession : MutableRecord
{
    public long PersonId { get; set; }
    public long InstallationId { get; set; }
    public long ConfigurationId { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }
    public string Status { get; set; } = "Configured";
    public string? FailureCode { get; set; }
}

public sealed class BrowserUsagePeriod : Record
{
    public long PersonId { get; set; }
    public long InstallationId { get; set; }
    public long ConfigurationId { get; set; }
    public DateOnly LocalDate { get; set; }
    public string TimeZoneId { get; set; } = "";
    public int ObservedSeconds { get; set; }
    public int CoverageSeconds { get; set; }
    public int GapCount { get; set; }
    public long SequenceNo { get; set; }
    public byte[] SourceHash { get; set; } = [];
}

public sealed class BrowserUsageDomain : Record
{
    public long UsagePeriodId { get; set; }
    public long ConfigurationId { get; set; }
    public string DomainCode { get; set; } = "";
    public int ObservedSeconds { get; set; }
}
