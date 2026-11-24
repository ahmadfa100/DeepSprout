using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Web.Models;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

public sealed partial class RecoveryPlanController
{
    [HttpPost("cycle-review")]
    [RequestSizeLimit(16_384)]
    public async Task<ActionResult<RecoveryCycleReview>> ReviewCycle(RecoveryCycleReviewInput input, CancellationToken ct)
    {
        var reflection = input.Reflection?.Trim();
        if (input.CycleId == Guid.Empty || reflection is not { Length: >= 1 and <= 2000 })
            return BadRequest("Write a short reflection of up to 2,000 characters.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await PersonalRecords.Lock(db, personId, ct) is null) return NotFound();

        var cycle = await db.Set<RecoveryCycle>().SingleOrDefaultAsync(item =>
            item.PersonId == personId && item.PublicId == input.CycleId, ct);
        if (cycle is null) return NotFound();
        if (cycle.Status == "Reviewed")
        {
            var prior = (await CycleReviews(personId, [cycle.Id], ct)).GetValueOrDefault(cycle.Id);
            return prior is null ? Conflict("This cycle was previously reviewed.") : Ok(prior);
        }
        var now = PersonalRecords.Now(clock);
        var today = RecoveryPlanRules.Today(now, cycle.TimeZoneId);
        EndIfDue(cycle, now);
        if (cycle.Status != "Ended" || cycle.ActivatedAtUtc is null || cycle.EndLocalDate is not { } end || today <= end)
            return Conflict("The final review opens after the last day of the cycle.");

        var revision = await AcceptedPlan(cycle.Id, ct);
        var plan = RecoveryPlanRules.Read(revision?.PlanJson);
        var actions = await SavedActions(cycle, today, ct);
        var weeklyReviews = await db.Set<WeeklyReview>().Where(item => item.CycleId == cycle.Id).ToArrayAsync(ct);
        var weeks = await ReviewWindows(cycle, plan, actions, weeklyReviews, today, ct);
        var review = new RecoveryCycleReview(reflection, now, await FinalEvidence(cycle, weeks, ct));
        cycle.Status = "Reviewed";
        cycle.ReviewedAtUtc = now;
        db.Add(PersonalRecords.Audit(personId, nameof(RecoveryCycle), cycle.Id, "RecoveryCycleReviewed", review, now));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(review);
    }

    [HttpPost("continue")]
    [RequestSizeLimit(1024)]
    public async Task<ActionResult<RecoveryContinuationResult>> ContinueCycle(RecoveryContinuationInput input, CancellationToken ct)
    {
        if (input.CycleId == Guid.Empty || input.Choice is not ("next" or "maintenance"))
            return BadRequest("Choose Next Cycle or Maintenance.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var profile = await PersonalRecords.Lock(db, personId, ct);
        if (profile is null) return NotFound();
        var cycles = await db.Set<RecoveryCycle>().Where(item => item.PersonId == personId)
            .OrderByDescending(item => item.CycleNo).ToListAsync(ct);
        var source = cycles.SingleOrDefault(item => item.PublicId == input.CycleId);
        if (source is null) return NotFound();
        var maintenance = input.Choice == "maintenance";
        var choice = maintenance ? "Maintenance" : "NextCycle";
        var successor = cycles.SingleOrDefault(item => item.CycleNo == source.CycleNo + 1);
        if (successor is not null)
            return source.NextStepCode == choice && successor.Id == cycles[0].Id
                ? Ok(new RecoveryContinuationResult(successor.PublicId))
                : Conflict("A continuation is already saved for this cycle.");
        if (source.Status != "Reviewed" || source.ReviewedAtUtc is null || cycles[0].Id != source.Id ||
            cycles.Any(item => item.Status is "Draft" or "Preview" or "Active" or "ReviewDue" or "Paused"))
            return Conflict("Review the completed cycle before opening another preview.");

        var answers = OnboardingController.CompletedAnswers(profile);
        var prior = await ContinuationPreferences(source, ct);
        if (answers is null || prior is null) return Conflict("Your saved plan preferences are unavailable.");

        var now = PersonalRecords.Now(clock);
        var start = RecoveryPlanRules.Today(now, source.TimeZoneId);
        prior = await CarryRoutine(source, prior, start, ct);
        var levels = await catalog.Levels(personId, await catalog.History(personId, ct), ct);
        var available = (await catalog.Published(ct)).Where(item => item.Level == levels[item.Type].Level)
            .Select(item => item.Type).Distinct().ToArray();
        if (available.Length == 0) return Conflict("No approved personal practices are currently available.");
        var types = prior.ActivityTypes.Where(available.Contains).ToArray();
        if (types.Length == 0)
        {
            types = RecoveryPlanRules.Create(answers.Value, RecoveryPlanRules.CycleDays).Preferences.ActivityTypes
                .Where(available.Contains).ToArray();
            if (types.Length == 0) types = [available[0]];
        }
        var preferences = prior with
        {
            ActivityTypes = types,
            PracticeDays = maintenance ? prior.PracticeDays.Take(RecoveryPlanRules.MaintenancePracticeDays).ToArray() : prior.PracticeDays
        };
        var plan = RecoveryPlanRules.Create(answers.Value, RecoveryPlanRules.CycleDays, preferences: preferences);
        var cycle = new RecoveryCycle
        {
            PersonId = personId, CycleNo = source.CycleNo + 1, Kind = maintenance ? "Maintenance" : "Standard",
            Status = "Preview", PolicyVersion = RecoveryPlanRules.Policy, TimeZoneId = source.TimeZoneId, CreatedAtUtc = now
        };
        source.NextStepCode = choice;
        db.Add(cycle);
        await db.SaveChangesAsync(ct);
        db.Add(new PlanRevision
        {
            CycleId = cycle.Id, RevisionNo = 1, ChangeKind = "Initial", Status = "Draft",
            GoalCode = preferences.Goal, PolicyVersion = cycle.PolicyVersion, EffectiveFromLocalDate = start, CreatedAtUtc = now,
            Reason = "Preliminary plan from the prior cycle's saved preferences and final weekly review.",
            PlanJson = JsonSerializer.Serialize(plan, RecoveryPlanRules.Json)
        });
        db.Add(PersonalRecords.Audit(personId, nameof(RecoveryCycle), source.Id, "RecoveryContinuationChosen",
            new { NextCycleId = cycle.PublicId, Choice = choice }, now));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new RecoveryContinuationResult(cycle.PublicId));
    }

    private bool EndIfDue(RecoveryCycle cycle, DateTime now)
    {
        if (cycle.Status is not ("Active" or "ReviewDue" or "Paused") || cycle.EndLocalDate is not { } end ||
            RecoveryPlanRules.Today(now, cycle.TimeZoneId) <= end) return false;

        var zone = TimeZoneInfo.FindSystemTimeZoneById(cycle.TimeZoneId);
        var boundary = end.AddDays(1).ToDateTime(TimeOnly.MinValue);
        // Some time zones move clocks forward at midnight.
        while (zone.IsInvalidTime(boundary)) boundary = boundary.AddMinutes(1);
        var ended = zone.IsAmbiguousTime(boundary)
            ? new DateTimeOffset(boundary, zone.GetAmbiguousTimeOffsets(boundary).Max()).UtcDateTime
            : TimeZoneInfo.ConvertTimeToUtc(boundary, zone);
        cycle.Status = "Ended";
        cycle.EndedAtUtc = ended;
        db.Add(PersonalRecords.Audit(cycle.PersonId, nameof(RecoveryCycle), cycle.Id, "RecoveryCycleEnded",
            new { cycle.EndLocalDate, cycle.EndedAtUtc }, now));
        return true;
    }

    private Task<PlanRevision?> AcceptedPlan(long cycleId, CancellationToken ct) =>
        db.Set<PlanRevision>().SingleOrDefaultAsync(item => item.CycleId == cycleId && item.Status == "Accepted", ct);

    private async Task<RecoveryCycleEvidence> FinalEvidence(RecoveryCycle cycle, RecoveryReviewWindow[] weeks, CancellationToken ct)
    {
        var practices = (await catalog.History(cycle.PersonId, ct)).Where(item =>
                item.Attempt.Source == "OnDemand" && item.Exercise is not null && item.Attempt.EndedAtUtc.HasValue)
            .Select(item => new
            {
                Date = RecoveryPlanRules.Today(DateTime.SpecifyKind(item.Attempt.EndedAtUtc!.Value, DateTimeKind.Utc), cycle.TimeZoneId),
                item.Exercise!.Type, Result = item.Exercise.Result(item.Attempt)
            })
            .Where(item => item.Date >= cycle.StartLocalDate && item.Date <= cycle.EndLocalDate && item.Result is not null)
            .OrderBy(item => item.Date)
            .Select(item => new RecoveryCyclePractice(item.Date, item.Type, item.Result!)).ToArray();
        var routineDays = await db.Set<RoutineCheckIn>().Where(item => item.PersonId == cycle.PersonId && item.State == "Done" &&
            item.LocalDate >= cycle.StartLocalDate && item.LocalDate <= cycle.EndLocalDate)
            .Select(item => item.LocalDate).Distinct().CountAsync(ct);
        return new(weeks, practices, routineDays);
    }

    private async Task<RecoveryPreferences?> ContinuationPreferences(RecoveryCycle source, CancellationToken ct)
    {
        var accepted = await AcceptedPlan(source.Id, ct);
        var plan = RecoveryPlanRules.Read(accepted?.PlanJson);
        if (plan is null) return null;
        var finalWeek = await db.Set<WeeklyReview>().SingleOrDefaultAsync(item => item.CycleId == source.Id &&
            item.WeekNo == plan.Weeks.Length && item.DecisionCode != "AutoContinued", ct);
        var chosen = finalWeek is null ? null : (await ReviewSnapshots(source.PersonId, [finalWeek.Id], ct))
            .GetValueOrDefault(finalWeek.Id)?.Preferences;
        return chosen is not null && RecoveryPlanRules.Validate(chosen) is null ? chosen : plan.Preferences;
    }

    private async Task<RecoveryPreferences> CarryRoutine(RecoveryCycle source, RecoveryPreferences preferences,
        DateOnly start, CancellationToken ct)
    {
        var routineId = await db.Set<ScheduledAction>().Where(item => item.CycleId == source.Id &&
            item.PersonId == source.PersonId && item.RoutineId != null).OrderBy(item => item.Id)
            .Select(item => item.RoutineId).FirstOrDefaultAsync(ct);
        var routine = await db.Set<OfflineRoutine>().SingleOrDefaultAsync(item =>
            item.Id == routineId && item.PersonId == source.PersonId, ct);
        if (routine is null) return preferences;
        if (routine.Status != "Active") return preferences with { Routine = null };
        var rule = RoutineRecords.Initial(routine);
        if (rule.Recurrence != "weekly") return preferences with { Routine = null };
        var offsets = Enumerable.Range(0, 7).Where(offset => rule.Days.Contains((int)start.AddDays(offset).DayOfWeek)).ToArray();
        return preferences with
        {
            Routine = offsets.Length > 0 ? new RecoveryRoutineChoice(routine.Title,
                rule.DurationMinutes ?? preferences.Routine?.Minutes ?? preferences.Minutes, offsets) : null
        };
    }

    private async Task<Dictionary<long, RecoveryCycleReview?>> CycleReviews(long personId, long[] ids, CancellationToken ct)
    {
        if (ids.Length == 0) return [];
        var rows = await db.Set<AuditEvent>().AsNoTracking().Where(item => item.ActorPersonId == personId &&
            item.ResourceKind == nameof(RecoveryCycle) && item.Action == "RecoveryCycleReviewed" && ids.Contains(item.ResourceId))
            .OrderByDescending(item => item.Id).Select(item => new { item.ResourceId, item.DetailJson }).ToListAsync(ct);
        return rows.GroupBy(item => item.ResourceId).ToDictionary(group => group.Key,
            group => JsonSerializer.Deserialize<RecoveryCycleReview>(group.First().DetailJson!, RecoveryPlanRules.Json));
    }
}
