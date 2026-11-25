using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Models;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize(Policy = PersonalRecords.IndividualPolicy)]
[Route("api/recovery-plan")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed partial class RecoveryPlanController(DeepSproutV5DbContext db, IAntiforgery antiforgery,
    PracticeCatalog catalog, TimeProvider clock) : ControllerBase
{
    [HttpGet]
    public Task<ActionResult<RecoveryPlanState>> Read(CancellationToken ct) => Update(null, null, ct);

    [HttpPut("preview")]
    [RequestSizeLimit(4096)]
    public Task<ActionResult<RecoveryPlanState>> Edit(RecoveryPlanEdit input, CancellationToken ct)
    {
        if (input.CycleId == Guid.Empty || input.Version < 1)
            return Task.FromResult<ActionResult<RecoveryPlanState>>(BadRequest("Open your plan preview before editing it."));
        var error = RecoveryPlanRules.Validate(input.Preferences);
        return error is null ? Update(input, null, ct) : Task.FromResult<ActionResult<RecoveryPlanState>>(BadRequest(error));
    }

    [HttpPost("activate")]
    [RequestSizeLimit(512)]
    public Task<ActionResult<RecoveryPlanState>> Activate(RecoveryPlanActivation input, CancellationToken ct) =>
        input.CycleId != Guid.Empty && input.Version > 0
            ? Update(null, input, ct)
            : Task.FromResult<ActionResult<RecoveryPlanState>>(BadRequest("Open your plan preview before activating it."));

    private async Task<ActionResult<RecoveryPlanState>> Update(RecoveryPlanEdit? edit,
        RecoveryPlanActivation? activation, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // A separate lock per Individual also serializes activation with Quick Setup edits.
        var profile = await PersonalRecords.Lock(db, personId, ct);
        if (profile is null) return NotFound();

        var cycles = await db.Set<RecoveryCycle>().Where(cycle => cycle.PersonId == profile.PersonId)
            .OrderByDescending(cycle => cycle.CycleNo).ToListAsync(ct);
        var cycle = CurrentCycle(cycles);
        var now = PersonalRecords.Now(clock);
        var reading = edit is null && activation is null;
        var answers = OnboardingController.CompletedAnswers(profile);
        PlanRevision? revision;
        RecoveryPlanDocument? plan;

        if (cycle is null)
        {
            if (!reading) return Conflict("Open your current plan preview first.");
            if (answers is null) return NotFound("Complete Quick Setup to see your plan preview.");
            plan = RecoveryPlanRules.Create(answers.Value, RecoveryPlanRules.CycleDays);
            cycle = new RecoveryCycle
            {
                PersonId = profile.PersonId, CycleNo = 1, Kind = "Standard", Status = "Preview",
                PolicyVersion = RecoveryPlanRules.Policy, TimeZoneId = RecoveryPlanRules.TimeZone, CreatedAtUtc = now
            };
            db.Add(cycle);
            await db.SaveChangesAsync(ct);
            revision = new PlanRevision
            {
                CycleId = cycle.Id, RevisionNo = 1, ChangeKind = "Initial", Status = "Draft",
                GoalCode = plan.Preferences.Goal, PolicyVersion = cycle.PolicyVersion,
                EffectiveFromLocalDate = RecoveryPlanRules.Today(now, cycle.TimeZoneId), CreatedAtUtc = now,
                Reason = "Preliminary Week 1 plan from Quick Setup", PlanJson = JsonSerializer.Serialize(plan, RecoveryPlanRules.Json)
            };
            db.Add(revision);
            await db.SaveChangesAsync(ct);
        }
        else
        {
            var requestedCycle = edit?.CycleId ?? activation?.CycleId;
            if (requestedCycle.HasValue && requestedCycle != cycle.PublicId)
                return Conflict("Open your current plan before making changes.");
            if (EndIfDue(cycle, now)) await db.SaveChangesAsync(ct);
            var draft = cycle.Status == "Preview" && cycle.ActivatedAtUtc is null;
            revision = await db.Set<PlanRevision>().Where(item => item.CycleId == cycle.Id &&
                (draft ? item.Status == "Draft" : item.Status != "Draft"))
                .OrderByDescending(item => item.Status == "Accepted")
                .ThenByDescending(item => item.RevisionNo).FirstOrDefaultAsync(ct);
            plan = RecoveryPlanRules.Read(revision?.PlanJson);

            if (reading && draft && revision is not null && plan is not null && answers is { } updated &&
                (plan.CycleDays != RecoveryPlanRules.CycleDays || !JsonElement.DeepEquals(plan.Setup, updated)))
            {
                plan = RecoveryPlanRules.Create(updated, RecoveryPlanRules.CycleDays, plan.Version + 1,
                    plan.Edited ? plan.Preferences : null);
                revision.GoalCode = plan.Preferences.Goal;
                revision.PlanJson = JsonSerializer.Serialize(plan, RecoveryPlanRules.Json);
                await db.SaveChangesAsync(ct);
            }
            else if (!reading && (edit is not null || cycle.ActivatedAtUtc is null))
            {
                if (!draft || revision is null || plan is null || answers is null)
                    return Conflict("This plan is no longer an editable preview.");
                if (plan.CycleDays != RecoveryPlanRules.CycleDays || (edit?.Version ?? activation?.Version) != plan.Version ||
                    !JsonElement.DeepEquals(plan.Setup, answers.Value))
                    return Conflict("Your plan preview changed. Reload it before confirming.");
                if (cycle.Kind == "Maintenance" &&
                    (edit?.Preferences ?? plan.Preferences).PracticeDays.Length > RecoveryPlanRules.MaintenancePracticeDays)
                    return BadRequest("Maintenance supports one practice day each week.");

                if (edit is not null)
                {
                    var previous = plan;
                    var prefs = edit.Preferences with
                    {
                        PracticeDays = edit.Preferences.PracticeDays.Order().ToArray(),
                        Routine = edit.Preferences.Routine is { } routine ? routine with
                        {
                            Title = routine.Title.Trim(), Days = routine.Days.Order().ToArray()
                        } : null
                    };
                    plan = RecoveryPlanRules.Create(answers.Value, plan.CycleDays, plan.Version + 1, prefs);
                    revision.GoalCode = prefs.Goal;
                    revision.PlanJson = JsonSerializer.Serialize(plan, RecoveryPlanRules.Json);
                    db.Add(PersonalRecords.Audit(profile.PersonId, nameof(PlanRevision), revision.Id, "RecoveryPreviewEdited",
                        new { BeforeVersion = previous.Version, Before = previous.Preferences,
                            AfterVersion = plan.Version, After = prefs }, now));
                }
                else
                {
                    if (plan.Preferences.Routine is null) return BadRequest("Choose an offline routine before activating.");
                    var error = await ActivatePreview(profile, cycle, revision, plan, plan.Preferences.Routine, now, ct);
                    if (error is not null) return Conflict(error);
                }
                await db.SaveChangesAsync(ct);
            }
        }

        var result = await State(cycle, revision, plan, cycles, now, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    private async Task<string?> ActivatePreview(IndividualProfile profile, RecoveryCycle cycle, PlanRevision revision,
        RecoveryPlanDocument plan, RecoveryRoutineChoice commitment, DateTime now, CancellationToken ct)
    {
        var start = RecoveryPlanRules.Today(now, cycle.TimeZoneId);
        var exercises = await PracticeVersions(plan, profile.PersonId, now, ct, includeUnavailable: cycle.CycleNo == 1);
        if (exercises is null) return "A selected practice is currently unavailable. Change your practice choices and try again.";

        var days = commitment.Days.Select(offset => (int)start.AddDays(offset).DayOfWeek).Order().ToArray();
        OfflineRoutine? routine = null;
        if (cycle.CycleNo > 1)
        {
            var candidates = await db.Set<OfflineRoutine>().Where(item => item.PersonId == profile.PersonId &&
                item.IsInitialCommitment && item.Status == "Active" && item.Title == commitment.Title)
                .OrderByDescending(item => item.Id).ToListAsync(ct);
            routine = candidates.FirstOrDefault(item =>
            {
                var rule = RoutineRecords.Initial(item);
                return item.Title == commitment.Title && rule.Recurrence == "weekly" &&
                    rule.DurationMinutes == commitment.Minutes && rule.Days.Order().SequenceEqual(days);
            });
        }
        if (routine is null)
        {
            routine = new OfflineRoutine
            {
                PersonId = profile.PersonId, Title = commitment.Title, IsInitialCommitment = true,
                Status = "Active", CreatedAtUtc = now,
                ScheduleRuleJson = JsonSerializer.Serialize(new { days, minutes = commitment.Minutes, recurrence = "weekly" },
                    RecoveryPlanRules.Json)
            };
            db.Add(routine);
            await db.SaveChangesAsync(ct);
        }

        foreach (var day in plan.WeekOne)
        {
            var date = start.AddDays(day.Offset);
            if (day.ActivityType is not null)
                db.Add(Action("Practice", date, practiceVersionId: exercises[day.Offset]));
            if (day.Routine)
                db.Add(Action("Routine", date, routineId: routine.Id));
            if (day.Review)
                db.Add(Action("WeeklyReview", date));
        }

        revision.Status = "Accepted";
        revision.AcceptedAtUtc = now;
        revision.EffectiveFromLocalDate = start;
        cycle.Status = "Active";
        cycle.ActivatedAtUtc = now;
        cycle.StartLocalDate = start;
        cycle.EndLocalDate = start.AddDays(plan.CycleDays - 1);
        db.Add(PersonalRecords.Audit(profile.PersonId, nameof(RecoveryCycle), cycle.Id, "RecoveryPlanActivated",
            new { cycle.StartLocalDate, cycle.EndLocalDate, PlanRevisionId = revision.Id, plan.Version }, now));
        if (profile.OnboardingStage != "TourDone") profile.OnboardingStage = "Activated";
        profile.OnboardingCompletedAtUtc ??= now;
        return null;

        ScheduledAction Action(string kind, DateOnly date, long? practiceVersionId = null, long? routineId = null) =>
            new()
            {
                CycleId = cycle.Id, PersonId = profile.PersonId, PlanRevisionId = revision.Id,
                ActionKind = kind, LocalDate = date, Status = "Due", CreatedAtUtc = now,
                PracticeVersionId = practiceVersionId, RoutineId = routineId
            };
    }

    private async Task<Dictionary<int, long>?> PracticeVersions(RecoveryPlanDocument plan, long personId,
        DateTime now, CancellationToken ct, int week = 1, Dictionary<string, PracticeLevel>? levels = null,
        bool includeUnavailable = true)
    {
        levels ??= await catalog.Levels(personId, await catalog.History(personId, ct), ct);
        var published = await catalog.Published(ct, includeUnavailable);
        var selected = new Dictionary<int, PracticeExercise>();
        foreach (var group in plan.WeekOne.Where(day => day.ActivityType is not null).GroupBy(day => day.ActivityType!))
        {
            var definitions = published.Where(item => item.Type == group.Key && item.Level == levels[group.Key].Level).ToArray();
            if (definitions.Length == 0) return null;
            var index = week - 1;
            foreach (var day in group) selected[day.Offset] = definitions[index++ % definitions.Length];
        }

        await catalog.LockCatalog(ct);
        var versions = new Dictionary<int, long>();
        foreach (var (offset, exercise) in selected)
        {
            var version = await catalog.Pin(exercise, now, ct);
            if (version is null) return null;
            versions[offset] = version.Id;
        }
        return versions;
    }

    private async Task<RecoverySavedAction[]> SavedActions(RecoveryCycle cycle, DateOnly today, CancellationToken ct)
    {
        var rows = await (from action in db.Set<ScheduledAction>().AsNoTracking()
                          where action.CycleId == cycle.Id && action.PersonId == cycle.PersonId
                          join scheduledRevision in db.Set<PlanRevision>() on action.PlanRevisionId equals scheduledRevision.Id
                          join version in db.Set<PracticeVersion>() on action.PracticeVersionId equals (long?)version.Id into versions
                          from version in versions.DefaultIfEmpty()
                          join definition in db.Set<PracticeDefinition>() on version.DefinitionId equals definition.Id into definitions
                          from definition in definitions.DefaultIfEmpty()
                          join attempt in db.Set<PracticeAttempt>().Where(item => item.PersonId == cycle.PersonId)
                              on action.CompletedAttemptId equals (long?)attempt.Id into attempts
                          from attempt in attempts.DefaultIfEmpty()
                          from draft in db.Set<PracticeAttempt>().Where(item =>
                              item.PersonId == cycle.PersonId && item.ScheduledActionId == action.Id &&
                              item.PracticeVersionId == action.PracticeVersionId && item.Source == "Plan" &&
                              (item.Status == "Started" || item.Status == "Paused"))
                              .OrderByDescending(item => item.Id).Take(1).DefaultIfEmpty()
                          orderby action.LocalDate, action.Id
                          select new { action, definition.Code, Type = definition.PracticeType, Level = (short?)version.DifficultyTier,
                              definition.Title, version.ContentJson, version.EvidenceTier, scheduledRevision.PlanJson, attempt, draft })
            .ToListAsync(ct);
        var minutes = rows.GroupBy(row => row.action.PlanRevisionId).ToDictionary(group => group.Key,
            group => RecoveryPlanRules.Read(group.First().PlanJson)?.Preferences.Minutes);
        return rows.Select(row =>
        {
            var exercise = row.EvidenceTier == "SystemScored" ? PracticeExercise.Read(row.ContentJson) : null;
            var result = row.attempt is { Source: "Plan" } completed && completed.ScheduledActionId == row.action.Id &&
                completed.PracticeVersionId == row.action.PracticeVersionId ? exercise?.Result(completed) : null;
            var draft = row.action.Status == "Due" && row.draft is { } open && exercise is not null
                ? new RecoveryPracticeDraft($"sql-attempt-{open.Id}", open.Status, exercise.Title, exercise.ContentVersion,
                    DateTime.SpecifyKind(open.StartedAtUtc, DateTimeKind.Utc)) : null;
            var status = row.action.Status == "Due" && row.action.LocalDate < today &&
                row.action.ActionKind is "Practice" or "Routine" ? "Missed" : row.action.Status;
            return new RecoverySavedAction($"sql-action-{row.action.Id}", row.action.ActionKind,
                row.action.LocalDate, status, row.action.IsOptional, ActivityType(row.Code, row.Type), row.Code, row.Level,
                row.action.RoutineId is { } routine ? $"sql-routine-{routine}" : null,
                row.action.CompletedAttemptId is { } attempt ? $"sql-attempt-{attempt}" : null,
                minutes[row.action.PlanRevisionId], result, $"sql-revision-{row.action.PlanRevisionId}", row.Title, draft, exercise is not null);
        }).ToArray();
    }

    private async Task<RecoveryPlanState> State(RecoveryCycle cycle, PlanRevision? revision, RecoveryPlanDocument? plan,
        List<RecoveryCycle> cycles, DateTime now, CancellationToken ct)
    {
        var today = RecoveryPlanRules.Today(now, cycle.TimeZoneId);
        var actions = await SavedActions(cycle, today, ct);
        var reviews = await (from review in db.Set<WeeklyReview>().AsNoTracking()
                             where review.CycleId == cycle.Id
                             join resultingRevision in db.Set<PlanRevision>() on review.ResultingRevisionId equals
                                 (long?)resultingRevision.Id into reviewRevisions
                             from resultingRevision in reviewRevisions.DefaultIfEmpty()
                             orderby review.WeekNo
                             select new { review, resultingRevision }).ToListAsync(ct);
        var snapshots = await ReviewSnapshots(cycle.PersonId, reviews.Select(item => item.review.Id).ToArray(), ct);
        var routines = await db.Set<OfflineRoutine>().AsNoTracking()
            .Where(routine => routine.PersonId == cycle.PersonId && db.Set<ScheduledAction>().Any(action =>
                action.CycleId == cycle.Id && action.PersonId == cycle.PersonId && action.RoutineId == routine.Id)).ToListAsync(ct);
        var editable = cycle.Status == "Preview" && plan is not null && cycle.ActivatedAtUtc is null;
        var start = cycle.StartLocalDate ?? (editable ? today : (DateOnly?)null);
        var revisions = await db.Set<PlanRevision>().AsNoTracking().Where(item => item.CycleId == cycle.Id && item.Status != "Draft")
            .OrderBy(item => item.RevisionNo).ToListAsync(ct);
        var changes = revisions.Select(item => new { Item = item, Plan = RecoveryPlanRules.Read(item.PlanJson) })
            .Where(row => row.Plan is not null).Select(row => new RecoveryPlanChange($"sql-revision-{row.Item.Id}",
                row.Item.RevisionNo, row.Item.ChangeKind, row.Item.EffectiveFromLocalDate,
                DateTime.SpecifyKind(row.Item.AcceptedAtUtc ?? row.Item.CreatedAtUtc, DateTimeKind.Utc),
                row.Item.Reason, row.Plan!.Preferences)).ToArray();
        var previous = cycles.Where(item => item.Id != cycle.Id).ToArray();
        var previousIds = previous.Select(item => item.Id).ToArray();
        var cycleReviews = await CycleReviews(cycle.PersonId, cycles.Where(item => item.Status == "Reviewed")
            .Select(item => item.Id).ToArray(), ct);
        var priorGoals = await db.Set<PlanRevision>().AsNoTracking().Where(item => previousIds.Contains(item.CycleId) &&
            item.Status == "Accepted").ToDictionaryAsync(item => item.CycleId, item => item.GoalCode, ct);
        var continuations = Array.Empty<RecoveryContinuationOption>();
        if (cycle.Status == "Reviewed" && cycle.NextStepCode is null && cycles[0].Id == cycle.Id &&
            await ContinuationPreferences(cycle, ct) is { } prior)
        {
            continuations = [new("next", prior.PracticeDays.Length, prior.Minutes),
                new("maintenance", RecoveryPlanRules.MaintenancePracticeDays, prior.Minutes)];
        }
        var reviewWeeks = await ReviewWindows(cycle, plan, actions, reviews.Select(row => row.review).ToArray(), today, ct);
        var cycleReview = cycleReviews.GetValueOrDefault(cycle.Id);
        var finalEvidence = cycleReview?.Evidence ??
            (cycle.Status is "Ended" or "Reviewed" ? await FinalEvidence(cycle, reviewWeeks, ct) : null);
        return new RecoveryPlanState(cycle.PublicId, cycle.CycleNo, cycle.Status, cycle.TimeZoneId, start,
            cycle.EndLocalDate ?? (editable ? start?.AddDays(plan!.CycleDays - 1) : null),
            cycle.ActivatedAtUtc is { } activated ? DateTime.SpecifyKind(activated, DateTimeKind.Utc) : null,
            revision?.GoalCode, editable, plan,
            actions,
            routines.Select(routine => new RecoverySavedRoutine($"sql-routine-{routine.Id}", routine.Title, routine.Hint,
                routine.Status, routine.ScheduleRuleJson is null ? null : JsonSerializer.Deserialize<JsonElement>(routine.ScheduleRuleJson))).ToArray(),
            previous.Select(item => new RecoveryCycleSummary(item.PublicId, item.CycleNo, item.Status,
                item.StartLocalDate, item.EndLocalDate, item.Kind, AsUtc(item.EndedAtUtc),
                priorGoals.GetValueOrDefault(item.Id), cycleReviews.GetValueOrDefault(item.Id))).ToArray(),
            reviews.Select(item => SavedReview(item.review, cycle.TimeZoneId, item.resultingRevision,
                snapshots.GetValueOrDefault(item.review.Id))).ToArray(),
            HttpMethods.IsGet(Request.Method) ? antiforgery.GetAndStoreTokens(HttpContext).RequestToken : null,
            cycles.Any(item => item.ActivatedAtUtc.HasValue) ? await catalog.Overview(cycle, actions, today, ct) : null, today,
            reviewWeeks, changes, cycle.Kind, AsUtc(cycle.EndedAtUtc), cycleReview, finalEvidence, continuations);
    }

    private static RecoveryCycle? CurrentCycle(IEnumerable<RecoveryCycle> newestFirst) =>
        newestFirst.FirstOrDefault(item => item.Status is "Draft" or "Preview" or "Active" or "Paused" or "ReviewDue") ??
        newestFirst.FirstOrDefault();

    private static DateTime? AsUtc(DateTime? value) =>
        value is { } time ? DateTime.SpecifyKind(time, DateTimeKind.Utc) : null;

    private static string? ActivityType(string? code, string? slot)
    {
        if (code?.StartsWith("practice-visual-observation-", StringComparison.Ordinal) == true) return "visual-observation";
        if (code?.StartsWith("practice-digital-judgment-", StringComparison.Ordinal) == true) return "digital-judgment";
        return slot switch
        {
            "DepthPractice" => "depth", "ListeningRecall" => "listening", "PracticalMicroChallenge" => "practical",
            "ProtectedWork" => "protected-work", _ => null
        };
    }
}
