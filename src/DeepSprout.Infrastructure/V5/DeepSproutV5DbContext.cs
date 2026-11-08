using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace DeepSprout.Infrastructure.V5;

/// <summary>
/// EF Core context for the approved 58-table DeepSprout database (v5 lean design).
/// The model is generated from docs/architecture/database/v5-lean-design/schema.json;
/// see docs/architecture/database/efcore-v5-adoption.md for the migration strategy.
/// The older 129-table <see cref="DeepSproutDbContext"/> remains only for the historical
/// DeepSprout_Validation database.
/// </summary>
public sealed partial class DeepSproutV5DbContext(DbContextOptions<DeepSproutV5DbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder) => V5ModelConfiguration.Apply(modelBuilder);
}

/// <summary>
/// Design-time factory for `dotnet ef ... --context DeepSproutV5DbContext`.
/// It never chooses a database by itself: commands that connect need DEEPSPROUT_V5_CONNECTION.
/// Commands that only read the model (migrations add, migrations script, has-pending-model-changes) work without it.
/// </summary>
public sealed class DeepSproutV5DesignTimeFactory : IDesignTimeDbContextFactory<DeepSproutV5DbContext>
{
    public const string ConnectionVariable = "DEEPSPROUT_V5_CONNECTION";

    public DeepSproutV5DbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable(ConnectionVariable);
        if (string.IsNullOrWhiteSpace(connection))
        {
            // An unreachable placeholder: model-only commands succeed, connecting commands fail fast.
            connection = "Server=tcp:set-DEEPSPROUT_V5_CONNECTION.invalid,1;Database=unset;Connect Timeout=1;Encrypt=True";
        }
        var options = new DbContextOptionsBuilder<DeepSproutV5DbContext>()
            .UseSqlServer(connection)
            .Options;
        return new DeepSproutV5DbContext(options);
    }
}
