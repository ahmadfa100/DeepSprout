using System.Text.Json.Serialization;

namespace DeepSprout.Web.Models;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RoutineEdit(string Title, int[] Days, string Recurrence, bool Paused, int? DurationMinutes, string? Hint);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RoutineCheckInInput([property: JsonRequired] string? Status);
public sealed record RoutineWriteResult(string Id);

public sealed record RoutineSchedule(DateOnly From, string Title, int[] Days, string Recurrence, bool Paused, int? DurationMinutes);
public sealed record RoutineDay(DateOnly Date, string Status, string Title);
public sealed record RoutineItem(string Id, string Title, string? Hint, DateOnly CreatedOn, DateOnly? RemovedOn,
    bool InitialCommitment, RoutineSchedule[] Schedule, RoutineDay[] CheckIns);
