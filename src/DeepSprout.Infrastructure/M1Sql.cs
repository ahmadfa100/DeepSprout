using System.Reflection;

namespace DeepSprout.Infrastructure;

internal static class M1Sql
{
    internal static IEnumerable<string> Batches()
    {
        using var stream = typeof(M1Sql).Assembly.GetManifestResourceStream("DeepSprout.Infrastructure.Sql.M1Commands.sql")
            ?? throw new InvalidOperationException("M1 SQL resource is missing.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd().Split("-- BATCH", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    internal static string Reschedule()
    {
        using var stream = typeof(M1Sql).Assembly.GetManifestResourceStream("DeepSprout.Infrastructure.Sql.M1Reschedule.sql")
            ?? throw new InvalidOperationException("M1 reschedule SQL resource is missing.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    internal static string ApprovalWithDeniedAudit()
    {
        using var stream = typeof(M1Sql).Assembly.GetManifestResourceStream("DeepSprout.Infrastructure.Sql.M1ApprovalDenialAudit.sql")
            ?? throw new InvalidOperationException("M1 approval-audit SQL resource is missing.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    internal static IEnumerable<string> CancellationBatches() => Read("M1Cancellation.sql")
        .Split("-- BATCH", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    internal static string RescheduleV2() => Read("M1RescheduleV2.sql");
    internal static string ApprovalV2() => Read("M1ApprovalV2.sql");

    private static string Read(string file)
    {
        using var stream = typeof(M1Sql).Assembly.GetManifestResourceStream($"DeepSprout.Infrastructure.Sql.{file}")
            ?? throw new InvalidOperationException($"M1 SQL resource {file} is missing.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
