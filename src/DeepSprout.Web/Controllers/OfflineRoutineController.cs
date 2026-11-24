using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Models;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/offline-routines")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class OfflineRoutineController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<RoutineItem[]>> Read(CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await PersonalRecords.Lock(db, personId, ct) is null) return NotFound();
        var result = await RoutineRecords.Read(db, personId, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    [HttpPost]
    [RequestSizeLimit(4096)]
    public Task<ActionResult<RoutineWriteResult>> Add(RoutineEdit input, CancellationToken ct) => EditRoutine(null, input, ct);

    [HttpPut("{id:long}")]
    [RequestSizeLimit(4096)]
    public Task<ActionResult<RoutineWriteResult>> Edit(long id, RoutineEdit input, CancellationToken ct) => EditRoutine(id, input, ct);

    [HttpDelete("{id:long}")]
    public Task<ActionResult<RoutineWriteResult>> Archive(long id, CancellationToken ct) => EditRoutine(id, null, ct);

    [HttpPut("{id:long}/check-in")]
    [RequestSizeLimit(512)]
    public async Task<ActionResult<RoutineWriteResult>> CheckIn(long id, RoutineCheckInInput input, CancellationToken ct)
    {
        if (input.Status is not (null or "done" or "skipped")) return BadRequest("Choose Done or Skipped.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await PersonalRecords.Lock(db, personId, ct) is null) return NotFound();
        var routine = await db.Set<OfflineRoutine>().SingleOrDefaultAsync(item => item.Id == id && item.PersonId == personId, ct);
        if (routine is null) return NotFound();
        if (routine.Status != "Active") return Conflict("Resume this routine before checking it in.");

        var now = PersonalRecords.Now(clock);
        var today = PracticeCatalog.LocalDate(now);
        var check = await db.Set<RoutineCheckIn>().SingleOrDefaultAsync(item => item.RoutineId == id &&
            item.PersonId == personId && item.LocalDate == today, ct);
        var next = input.Status switch { "done" => "Done", "skipped" => "Skipped", _ => null };
        if (check?.State == next) return Ok(new RoutineWriteResult($"sql-routine-{id}"));
        db.Add(PersonalRecords.Audit(personId, nameof(OfflineRoutine), id, "RoutineCheckInChanged",
            new RoutineRecords.RoutineCheckInChange(today, check?.State, next, routine.Title), now));
        if (next is null)
        {
            db.Remove(check!);
        }
        else if (check is null)
        {
            db.Add(new RoutineCheckIn
            {
                RoutineId = id, PersonId = personId, LocalDate = today, State = next, RecordedAtUtc = now, CreatedAtUtc = now
            });
        }
        else
        {
            check.State = next;
            check.RecordedAtUtc = now;
        }
        var actions = await db.Set<ScheduledAction>().Where(item => item.PersonId == personId && item.RoutineId == id &&
            item.ActionKind == "Routine" && item.LocalDate == today &&
            (item.Status == "Due" || item.Status == "Completed" || item.Status == "Excluded")).ToListAsync(ct);
        foreach (var action in actions) action.Status = next switch
        {
            "Done" => "Completed", "Skipped" => "Excluded", _ => "Due"
        };
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new RoutineWriteResult($"sql-routine-{id}"));
    }

    private async Task<ActionResult<RoutineWriteResult>> EditRoutine(long? id, RoutineEdit? input, CancellationToken ct)
    {
        if (input is not null && (string.IsNullOrWhiteSpace(input.Title) || input.Title.Trim().Length > 160 ||
            input.Hint?.Length > 300 || input.DurationMinutes is < 1 or > 120 ||
            input.Recurrence is not ("weekly" or "biweekly") || input.Days is not { Length: >= 1 and <= 7 } ||
            input.Days.Any(day => day is < 0 or > 6) || input.Days.Distinct().Count() != input.Days.Length))
            return BadRequest("Enter a routine name, valid days, and a supported repeat schedule.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await PersonalRecords.Lock(db, personId, ct) is null) return NotFound();
        var now = PersonalRecords.Now(clock);
        var today = PracticeCatalog.LocalDate(now);
        var routines = db.Set<OfflineRoutine>().Where(item => item.PersonId == personId);
        var routine = id is { } existing ? await routines.SingleOrDefaultAsync(item => item.Id == existing, ct) : null;
        if (id.HasValue && routine is null) return NotFound();
        if (routine?.Status == "Archived")
            return input is null ? Ok(new RoutineWriteResult($"sql-routine-{routine.Id}")) : Conflict("This routine has been archived.");

        if (input is null)
        {
            routine!.Status = "Archived";
            routine.ArchivedAtUtc = now;
            db.Add(PersonalRecords.Audit(personId, nameof(OfflineRoutine), routine.Id, "RoutineArchived",
                new { Date = today, routine.Title }, now));
            await UpdatePlanActions(routine, RoutineRecords.Initial(routine) with { From = today, Paused = true }, now, ct);
        }
        else
        {
            var title = input.Title.Trim();
            var duplicate = await routines.FirstOrDefaultAsync(item => item.Id != id && item.Status != "Archived" && item.Title == title, ct);
            if (duplicate is not null) return id is null ? Ok(new RoutineWriteResult($"sql-routine-{duplicate.Id}")) : Conflict("That routine is already on your list.");
            var before = routine is null ? null : RoutineRecords.Initial(routine);
            var after = new RoutineSchedule(today, title, input.Days.Order().ToArray(), input.Recurrence,
                input.Paused, input.DurationMinutes ?? before?.DurationMinutes);
            var hint = input.Hint?.Trim() ?? routine?.Hint;
            if (before is not null && before.Title == after.Title && before.Recurrence == after.Recurrence &&
                before.Paused == after.Paused && before.DurationMinutes == after.DurationMinutes &&
                before.Days.SequenceEqual(after.Days) && routine!.Hint == hint) return Ok(new RoutineWriteResult($"sql-routine-{routine.Id}"));
            if (routine is null)
            {
                routine = new OfflineRoutine { PersonId = personId, CreatedAtUtc = now };
                db.Add(routine);
            }
            routine.Title = title;
            routine.Hint = hint;
            routine.Status = after.Paused ? "Paused" : "Active";
            routine.ScheduleRuleJson = JsonSerializer.Serialize(
                new RoutineRecords.RoutineRule(after.Days, after.Recurrence, after.DurationMinutes), RecoveryPlanRules.Json);
            if (before is not null)
            {
                db.Add(PersonalRecords.Audit(personId, nameof(OfflineRoutine), routine.Id, "RoutineEdited",
                    new RoutineRecords.RoutineRevision(before, after), now));
                await UpdatePlanActions(routine, after, now, ct);
            }
        }
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new RoutineWriteResult($"sql-routine-{routine.Id}"));
    }

    private async Task UpdatePlanActions(OfflineRoutine routine, RoutineSchedule rule, DateTime now, CancellationToken ct)
    {
        if (!routine.IsInitialCommitment) return;
        var cycles = await db.Set<RecoveryCycle>().Where(cycle => cycle.PersonId == routine.PersonId &&
            cycle.Status == "Active" && cycle.StartLocalDate != null && cycle.EndLocalDate >= rule.From).ToListAsync(ct);
        foreach (var cycle in cycles)
        {
            var rows = await db.Set<ScheduledAction>().Where(item => item.CycleId == cycle.Id && item.PersonId == routine.PersonId &&
                (item.RoutineId == routine.Id || item.ActionKind == "WeeklyReview")).ToListAsync(ct);
            if (!rows.Any(item => item.RoutineId == routine.Id)) continue;
            var checkedDates = await db.Set<RoutineCheckIn>().Where(item => item.PersonId == routine.PersonId &&
                item.RoutineId == routine.Id && item.LocalDate >= rule.From).Select(item => item.LocalDate).ToListAsync(ct);
            var created = PracticeCatalog.LocalDate(routine.CreatedAtUtc);
            foreach (var review in rows.Where(item => item.ActionKind == "WeeklyReview"))
            {
                for (var date = review.LocalDate.AddDays(-6); date <= review.LocalDate; date = date.AddDays(1))
                {
                    if (date < rule.From || date < cycle.StartLocalDate || date > cycle.EndLocalDate || checkedDates.Contains(date)) continue;
                    var row = rows.FirstOrDefault(item => item.RoutineId == routine.Id && item.LocalDate == date &&
                        item.Status is "Due" or "Completed" or "Excluded");
                    var included = RoutineRecords.Includes(rule, date, created);
                    if (row?.Status == "Due" && !included) row.Status = "Cancelled";
                    if (row is null && included)
                    {
                        var action = new ScheduledAction
                        {
                            CycleId = cycle.Id, PersonId = routine.PersonId, PlanRevisionId = review.PlanRevisionId,
                            RoutineId = routine.Id, ActionKind = "Routine", LocalDate = date, Status = "Due", CreatedAtUtc = now
                        };
                        db.Add(action);
                        rows.Add(action);
                    }
                }
            }
        }
    }
}
