using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Services;

internal static class InitiativeWork
{
    internal const string AssignmentResource = "task.Assignment";
    internal const string RecipientResource = "task.AssignmentRecipient";
    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    internal static string Version(byte[] bytes) => Convert.ToBase64String(bytes);
    internal static DateTime? Utc(DateTime? time) => time.HasValue ? DateTime.SpecifyKind(time.Value, DateTimeKind.Utc) : null;

    internal static Task<Initiative?> Lock(DeepSproutV5DbContext db, Guid id, CancellationToken ct) =>
        InitiativeTerms.Lock(db, id).AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == id, ct);

    internal sealed class AssignmentRow
    {
        public required Assignment Task { get; init; }
        public required OperationalGroup Team { get; init; }
        public required Initiative Initiative { get; init; }
        public required string Author { get; init; }
    }

    internal static IQueryable<AssignmentRow> Assignments(DeepSproutV5DbContext db) =>
        from task in db.Set<Assignment>().AsNoTracking()
        join team in db.Set<OperationalGroup>().AsNoTracking() on task.GroupId equals team.Id
        join initiative in db.Set<Initiative>().AsNoTracking() on team.InitiativeId equals (long?)initiative.Id
        join person in db.Set<Person>().AsNoTracking() on task.AuthorPersonId equals person.Id
        where team.ProgramId == null
        select new AssignmentRow { Task = task, Team = team, Initiative = initiative, Author = person.DisplayName };

    internal sealed record Terms(int RevisionNo, string Title, string Instructions, DateTime? StartsAtUtc, DateTime? DueAtUtc,
        bool IsRequired, bool AllowLate, string? Reason, DateTime? ChangedAtUtc);

    internal static Terms Snapshot(Assignment row, string? reason = null, DateTime? now = null) =>
        new(row.RevisionNo, row.Title, row.Instructions, Utc(row.StartsAtUtc), Utc(row.DueAtUtc), row.IsRequired, row.AllowLate, reason, Utc(now));

    internal static List<Terms> History(Assignment row) => Read<List<Terms>>(row.HistoryJson) ?? [];

    internal static T? Read<T>(string? json)
    {
        if (json is null) return default;
        try { return JsonSerializer.Deserialize<T>(json, Json); }
        catch (JsonException) { return default; }
    }

    internal static Task<bool> Supervisor(DeepSproutV5DbContext db, long actor, long initiative, DateTime now, CancellationToken ct) =>
        InitiativeStaffAccess.Active(db, actor, "Supervisor", now).AnyAsync(row => row.InitiativeId == initiative, ct);

    internal static bool CanRespond(Assignment row, AssignmentRecipient recipient, DateTime now) =>
        row.Status == "Published" && row.ReviewMode == "CoachReview" && row.PracticeVersionId == null &&
        recipient.Status is "Assigned" or "InProgress" or "NeedsRevision" &&
        (!row.StartsAtUtc.HasValue || row.StartsAtUtc <= now) && (row.AllowLate || !row.DueAtUtc.HasValue || row.DueAtUtc >= now);

    internal static void Audit(DeepSproutV5DbContext db, string resource, long id, long actor, string capacity, string action,
        string? before, string after, string? reason, DateTime now, object? details = null) =>
        InitiativeGroupRecords.Audit(db, resource, id, actor, capacity, action, before, after, reason, now, details);
}
