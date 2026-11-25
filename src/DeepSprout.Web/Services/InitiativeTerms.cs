using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Models;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Services;

internal static class InitiativeTerms
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    internal static IQueryable<Initiative> Lock(DeepSproutV5DbContext db, Guid id) =>
        db.Set<Initiative>().FromSqlInterpolated(
            $"SELECT * FROM [institution].[Initiative] WITH (UPDLOCK, HOLDLOCK) WHERE [PublicId] = {id}");

    internal static InitiativeDraft? Read(string? json)
    {
        if (json is null) return null;
        try { return JsonSerializer.Deserialize<InitiativeDraft>(json, Json); }
        catch (JsonException) { return null; }
    }
}
