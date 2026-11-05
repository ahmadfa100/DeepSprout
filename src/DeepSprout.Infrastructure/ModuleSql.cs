namespace DeepSprout.Infrastructure;

internal static class ModuleSql
{
    internal static IEnumerable<string> Batches(string file)
    {
        using var stream = typeof(ModuleSql).Assembly.GetManifestResourceStream($"DeepSprout.Infrastructure.Sql.{file}")
            ?? throw new InvalidOperationException($"SQL resource {file} is missing.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd().Split("-- BATCH", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}
