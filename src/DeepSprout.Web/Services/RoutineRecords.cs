using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Models;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Services;

internal static class RoutineRecords
{
    internal static RoutineSchedule Initial(OfflineRoutine routine)
    {
        var created = PracticeCatalog.LocalDate(routine.CreatedAtUtc);
        if (routine.ScheduleRuleJson is not { } json)
            return new(created, routine.Title, [], "weekly", routine.Status == "Paused", null);
        var rule = JsonSerializer.Deserialize<RoutineRule>(json, RecoveryPlanRules.Json)!;
        return new(created, routine.Title, rule.Days ?? [], rule.Recurrence ?? "weekly", routine.Status == "Paused", rule.Minutes);
    }

    internal static bool Includes(RoutineSchedule schedule, DateOnly date, DateOnly created) =>
        !schedule.Paused && date >= created && schedule.Days.Contains((int)date.DayOfWeek) &&
        (schedule.Recurrence != "biweekly" || (date.DayNumber - created.DayNumber) / 7 % 2 == 0);

    internal static async Task<RoutineItem[]> Read(DeepSproutV5DbContext db, long personId, CancellationToken ct)
    {
        var routines = await db.Set<OfflineRoutine>().AsNoTracking().Where(item => item.PersonId == personId)
            .OrderByDescending(item => item.IsInitialCommitment).ThenBy(item => item.Id).ToListAsync(ct);
        var checks = await db.Set<RoutineCheckIn>().AsNoTracking().Where(item => item.PersonId == personId)
            .OrderBy(item => item.LocalDate).ToListAsync(ct);
        var events = await db.Set<AuditEvent>().AsNoTracking().Where(item => item.ActorPersonId == personId &&
            item.ResourceKind == nameof(OfflineRoutine) && (item.Action == "RoutineEdited" || item.Action == "RoutineCheckInChanged"))
            .OrderBy(item => item.Id).Select(item => new { item.ResourceId, item.Action, item.DetailJson }).ToListAsync(ct);
        return routines.Select(routine =>
        {
            var history = events.Where(item => item.ResourceId == routine.Id && item.Action == "RoutineEdited")
                .Select(item => JsonSerializer.Deserialize<RoutineRevision>(item.DetailJson!, RecoveryPlanRules.Json)!).ToArray();
            var titles = events.Where(item => item.ResourceId == routine.Id && item.Action == "RoutineCheckInChanged")
                .Select(item => JsonSerializer.Deserialize<RoutineCheckInChange>(item.DetailJson!, RecoveryPlanRules.Json)!)
                .GroupBy(item => item.Date).ToDictionary(group => group.Key, group => group.Last().Title);
            var schedule = history.Length == 0 ? [Initial(routine)] : new[] { history[0].Before }.Concat(history.Select(item => item.After)).ToArray();
            return new RoutineItem($"sql-routine-{routine.Id}", routine.Title, routine.Hint,
                PracticeCatalog.LocalDate(routine.CreatedAtUtc),
                routine.ArchivedAtUtc is { } archived ? PracticeCatalog.LocalDate(archived) : null,
                routine.IsInitialCommitment, schedule,
                checks.Where(item => item.RoutineId == routine.Id).Select(item => new RoutineDay(item.LocalDate,
                    item.State.ToLowerInvariant(), titles.GetValueOrDefault(item.LocalDate) ??
                    schedule.LastOrDefault(entry => entry.From <= item.LocalDate)?.Title ?? routine.Title))
                    .ToArray());
        }).ToArray();
    }

    internal sealed record RoutineRule(int[] Days, string Recurrence, int? Minutes);
    internal sealed record RoutineRevision(RoutineSchedule Before, RoutineSchedule After);
    internal sealed record RoutineCheckInChange(DateOnly Date, string? Before, string? After, string Title);
}
