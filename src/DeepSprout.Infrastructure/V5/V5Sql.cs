using System.Reflection;
using System.Text.RegularExpressions;

namespace DeepSprout.Infrastructure.V5;

/// <summary>SQL used by the V5 migrations: embedded scripts split into GO batches, and shared guards.</summary>
internal static partial class V5Sql
{
    /// <summary>The 129-table M1 database (DeepSprout_Validation) has iam.PersonEmail; the 58-table design does not.</summary>
    public const string RefuseHistoricalM1Database =
        "IF OBJECT_ID(N'iam.PersonEmail', N'U') IS NOT NULL THROW 51100, 'This is the historical 129-table M1 database. The V5 context must not migrate it.', 1;";

    public static IReadOnlyList<string> Batches(string fileName)
    {
        var assembly = typeof(V5Sql).Assembly;
        var resource = $"{typeof(V5Sql).Namespace}.Sql.{fileName}";
        using var stream = assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"Embedded SQL resource {resource} is missing.");
        using var reader = new StreamReader(stream);
        return GoLine().Split(reader.ReadToEnd())
            .Select(batch => batch.Trim())
            .Where(batch => batch.Length > 0 && !IsCommentOnly(batch))
            .ToList();
    }

    private static bool IsCommentOnly(string batch) =>
        batch.Split('\n').All(line => line.Trim().Length == 0 || line.TrimStart().StartsWith("--", StringComparison.Ordinal));

    [GeneratedRegex(@"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase)]
    private static partial Regex GoLine();
}
