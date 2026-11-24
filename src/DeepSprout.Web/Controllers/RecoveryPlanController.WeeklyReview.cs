using System.Security.Cryptography;
using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Web.Models;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

public sealed partial class RecoveryPlanController
{
    [HttpPost("weekly-review/preview")]
    [RequestSizeLimit(2048)]
    public Task<IActionResult> PreviewWeek(RecoveryReviewInput input, CancellationToken ct) => ReviewWeek(input, false, ct);

    [HttpPost("weekly-review")]
    [RequestSizeLimit(2048)]
    public Task<IActionResult> ConfirmWeek(RecoveryReviewInput input, CancellationToken ct) => ReviewWeek(input, true, ct);

    private async Task<IActionResult> ReviewWeek(RecoveryReviewInput input, bool confirm, CancellationToken ct)
    {
        var continuing = input.Choice == "continue";
        if (input.Week is < 1 or > 4 || input.CycleId == Guid.Empty ||
            input.Choice is not ("accept" or "keep" or "adjust" or "continue") ||
            input.ProposalToken is { Length: not 64 } ||
            (continuing ? input.Manageable is not null || input.Fit is not null :
                input.Manageable is not ("too-light" or "about-right" or "a-stretch" or "too-much") ||
                input.Fit is not ("good-fit" or "mixed" or "poor-fit")))
            return BadRequest("Choose valid review answers and a decision.");
        if (input.Choice == "adjust" ? input.Adjustment is not { Days: >= 1 and <= 5, Minutes: 5 or 10 or 15 or 20 }
                || input.Adjustment.ActivityType is null || !RecoveryPlanRules.PracticeSlots.ContainsKey(input.Adjustment.ActivityType)
                : input.Adjustment is not null)
            return BadRequest("Choose an approved practice, frequency, and time preference.");
        if (input is { Choice: "keep", Manageable: "too-much" })
            return BadRequest("Choose the lighter proposal or adjust the schedule.");

        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await PersonalRecords.Lock(db, personId, ct) is null) return NotFound();
        var cycle = await db.Set<RecoveryCycle>().SingleOrDefaultAsync(item =>
            item.PersonId == personId && item.PublicId == input.CycleId, ct);
        if (cycle is null) return NotFound();

        var reviewed = await db.Set<WeeklyReview>().SingleOrDefaultAsync(item =>
            item.CycleId == cycle.Id && item.WeekNo == input.Week, ct);
        var previousContinuation = reviewed?.DecisionCode == "AutoContinued";
        if (reviewed is not null && (!previousContinuation || continuing))
        {
            if (!confirm) return Conflict("This decision is already saved.");
            return Ok(await Receipt(cycle, reviewed, ct));
        }
        var now = PersonalRecords.Now(clock);
        if (confirm) EndIfDue(cycle, now);
        if (cycle.Status is not ("Active" or "ReviewDue" or "Ended") || cycle.StartLocalDate is null ||
            cycle.EndLocalDate is null || cycle.ActivatedAtUtc is null)
            return Conflict("This cycle is unavailable for Weekly Review.");
        if (cycle.Kind == "Maintenance" && input.Adjustment?.Days > RecoveryPlanRules.MaintenancePracticeDays)
            return BadRequest("Maintenance supports one practice day each week.");

        var accepted = await db.Set<PlanRevision>()
            .SingleOrDefaultAsync(item => item.CycleId == cycle.Id && item.Status == "Accepted", ct);
        var plan = RecoveryPlanRules.Read(accepted?.PlanJson);
        if (accepted is null || plan is null) return Conflict("This plan has no reviewable preferences.");

        var today = RecoveryPlanRules.Today(now, cycle.TimeZoneId);
        var actions = await SavedActions(cycle, today, ct);
        var windows = await ReviewWindows(cycle, plan, actions, reviewed is null ? [] : [reviewed], today, ct);
        var window = windows.SingleOrDefault(item => item.Week == input.Week);
        if (window is null || window.Status is not ("Due" or "Overdue" or "Continued"))
            return Conflict("This weekly review is not open yet.");
        if (continuing && !window.CanContinue)
            return Conflict("Conservative continuation is available after a missed review when days remain to schedule.");

        var action = await db.Set<ScheduledAction>().SingleAsync(item => item.CycleId == cycle.Id &&
            item.PersonId == personId && item.ActionKind == "WeeklyReview" && item.LocalDate == window.DueOn &&
            item.Status == "Due", ct);
        // Use the pace associated with the reviewed week, even after later revisions.
        var sourceJson = await db.Set<PlanRevision>().Where(item => item.Id == action.PlanRevisionId && item.CycleId == cycle.Id)
            .Select(item => item.PlanJson).SingleAsync(ct);
        var previous = RecoveryPlanRules.Read(sourceJson)?.Preferences ?? plan.Preferences;
        var reasons = new List<string>();
        var preferences = ReviewPreferences(previous, input, window.Evidence, reasons);
        var nextWeek = previousContinuation ? null : WeekToSchedule(cycle, plan, input.Week, today, actions);
        var levels = await catalog.Levels(personId, await catalog.History(personId, ct), ct);
        var nextDays = Array.Empty<RecoveryPreviewDay>();
        var nextSchedule = Array.Empty<RecoveryNextDay>();
        var nextStart = nextWeek.HasValue ? cycle.StartLocalDate.Value.AddDays((nextWeek.Value - 1) * 7) : today;
        var effective = nextStart > today ? nextStart : today;
        long? routineId = null;
        if (nextWeek.HasValue)
        {
            nextDays = RecoveryPlanRules.Create(plan.Setup, plan.CycleDays, plan.Version + 1, preferences).WeekOne
                .Where(day => nextStart.AddDays(day.Offset) >= effective && nextStart.AddDays(day.Offset) <= cycle.EndLocalDate)
                .ToArray();
            var published = await catalog.Published(ct);
            var available = published.Where(exercise => exercise.Level == levels[exercise.Type].Level)
                .Select(exercise => exercise.Type).ToHashSet();
            if (nextDays.Any(day => day.ActivityType is { } type && !available.Contains(type)))
            {
                reasons.Add("Some practice content is unavailable. Those slots stay free.");
                nextDays = nextDays.Select(day => day.ActivityType is { } type && !available.Contains(type)
                    ? day with { ActivityType = null } : day).ToArray();
            }

            routineId = await db.Set<ScheduledAction>().Where(item => item.CycleId == cycle.Id &&
                item.PersonId == personId && item.RoutineId != null).OrderBy(item => item.Id)
                .Select(item => item.RoutineId).FirstOrDefaultAsync(ct);
            var routine = await db.Set<OfflineRoutine>().SingleOrDefaultAsync(item => item.Id == routineId &&
                item.PersonId == personId && item.Status == "Active", ct);
            var rule = routine is null ? null : RoutineRecords.Initial(routine);
            nextSchedule = nextDays.SelectMany(day =>
            {
                var date = nextStart.AddDays(day.Offset);
                var entries = new List<RecoveryNextDay>();
                if (day.ActivityType is { } type) entries.Add(new(date, "practice", type, levels[type].Level));
                else if (!day.Review) entries.Add(new(date, "rest", null, null));
                if (day.Review) entries.Add(new(date, "review", null, null));
                if (rule is not null && RoutineRecords.Includes(rule, date, rule.From))
                    entries.Add(new(date, "routine", null, null));
                return entries;
            }).ToArray();
            if (effective > nextStart) reasons.Add("Only remaining dates are included. Earlier dates stay as recorded.");
        }
        else
        {
            reasons.Add(today > cycle.EndLocalDate || input.Week == 4
                ? "There are no further dates to schedule in this cycle."
                : "A schedule is already saved for the eligible week. It stays in place.");
        }

        var token = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(new
        {
            cycle.PublicId, accepted.Id, today, input.Week, input.Choice, input.Manageable, input.Fit,
            preferences, nextSchedule, window.Evidence, routineId
        }, RecoveryPlanRules.Json)));
        if (!confirm) return Ok(new RecoveryReviewPreview(preferences, nextSchedule, reasons.ToArray(), nextWeek, token, window.Evidence));
        if (input.ProposalToken is not null && input.ProposalToken != token)
            return Conflict("The schedule or its evidence changed. Preview it again before saving.");

        PlanRevision? revision = null;
        if (nextWeek.HasValue)
        {
            var exercises = await PracticeVersions(plan with { WeekOne = nextDays }, personId, now, ct, nextWeek.Value, levels,
                includeUnavailable: false);
            if (exercises is null) return Conflict("Practice availability changed. Preview the schedule again.");
            var updated = plan with { Version = plan.Version + 1, Preferences = preferences,
                Weeks = plan.Weeks.Select(week => week.Number == nextWeek ? week with { Detailed = true } : week).ToArray() };
            accepted.Status = "Superseded";
            await db.SaveChangesAsync(ct);
            revision = new PlanRevision
            {
                CycleId = cycle.Id, RevisionNo = accepted.RevisionNo + 1, ChangeKind = continuing ? "Return" : "WeeklyReview",
                Status = "Accepted", GoalCode = accepted.GoalCode, PolicyVersion = cycle.PolicyVersion,
                Reason = string.Join(' ', reasons), EffectiveFromLocalDate = effective, CreatedAtUtc = now, AcceptedAtUtc = now,
                PlanJson = JsonSerializer.Serialize(updated, RecoveryPlanRules.Json)
            };
            db.Add(revision);
            await db.SaveChangesAsync(ct);
            foreach (var entry in nextSchedule.Where(entry => entry.Kind != "rest"))
            {
                db.Add(new ScheduledAction
                {
                    CycleId = cycle.Id, PersonId = personId, PlanRevisionId = revision.Id,
                    ActionKind = entry.Kind switch { "practice" => "Practice", "review" => "WeeklyReview", _ => "Routine" },
                    LocalDate = entry.Date, Status = "Due", CreatedAtUtc = now,
                    PracticeVersionId = entry.Kind == "practice" ? exercises[entry.Date.DayNumber - nextStart.DayNumber] : null,
                    RoutineId = entry.Kind == "routine" ? routineId : null
                });
            }
        }

        var priorDecision = reviewed?.DecisionCode;
        if (reviewed is null)
        {
            reviewed = new WeeklyReview { CycleId = cycle.Id, WeekNo = (byte)input.Week, CreatedAtUtc = now };
            db.Add(reviewed);
        }
        reviewed.ResultingRevisionId = revision?.Id ?? reviewed.ResultingRevisionId;
        reviewed.ManageabilityCode = input.Manageable;
        reviewed.FitCode = input.Fit;
        reviewed.DecisionCode = input.Choice switch
        {
            "continue" => "AutoContinued", "keep" => "KeepPace", "adjust" => "Adjust", _ => "AcceptNext"
        };
        reviewed.ReviewedAtUtc = now;
        if (!continuing) action.Status = "Completed";
        await db.SaveChangesAsync(ct);
        db.Add(PersonalRecords.Audit(personId, nameof(WeeklyReview), reviewed.Id,
            continuing ? "WeeklyReviewContinued" : "WeeklyReviewConfirmed",
            new { Before = priorDecision, reviewed.DecisionCode, reviewed.ManageabilityCode, reviewed.FitCode,
                PreviousPreferences = previous, Preferences = preferences, Reasons = reasons, Evidence = window.Evidence,
                TargetWeek = nextWeek, EffectiveOn = nextWeek.HasValue ? effective : (DateOnly?)null, Scheduled = nextSchedule.Count(entry => entry.Kind != "rest") }, now));
        await db.SaveChangesAsync(ct);
        var result = await Receipt(cycle, reviewed, ct);
        await transaction.CommitAsync(ct);
        return Ok(result);
    }

    private static int? WeekToSchedule(RecoveryCycle cycle, RecoveryPlanDocument plan, int week, DateOnly today,
        RecoverySavedAction[] actions)
    {
        var start = cycle.StartLocalDate!.Value;
        if (cycle.Status is not ("Active" or "ReviewDue")) return null;
        var next = Math.Max(week + 1, (today.DayNumber - start.DayNumber) / 7 + 1);
        if (today > cycle.EndLocalDate || next > plan.Weeks.Length || plan.Weeks[next - 1].Detailed) return null;
        var from = start.AddDays((next - 1) * 7);
        return actions.Any(action => action.Date >= from && action.Date < from.AddDays(7) &&
            action.Status is not ("Cancelled" or "Rescheduled" or "Excluded")) ? null : next;
    }

    private async Task<RecoveryReviewWindow[]> ReviewWindows(RecoveryCycle cycle, RecoveryPlanDocument? plan,
        RecoverySavedAction[] actions, WeeklyReview[] saved, DateOnly today, CancellationToken ct, bool includeBrowser = true)
    {
        if (cycle.ActivatedAtUtc is null || cycle.StartLocalDate is not { } start || cycle.EndLocalDate is not { } end)
            return [];
        var checks = await db.Set<RoutineCheckIn>().AsNoTracking().Where(item => item.PersonId == cycle.PersonId &&
            item.LocalDate >= start && item.LocalDate <= end && item.LocalDate <= today).ToListAsync(ct);
        var browser = includeBrowser ? await (from period in db.Set<BrowserUsagePeriod>().AsNoTracking()
                             join installation in db.Set<ExtensionInstallation>() on period.InstallationId equals installation.Id
                             where period.PersonId == cycle.PersonId && installation.PersonId == cycle.PersonId &&
                                period.TimeZoneId == cycle.TimeZoneId && period.LocalDate >= start && period.LocalDate <= end &&
                                period.LocalDate <= today && period.CoverageSeconds > 0 && period.ObservedSeconds <= period.CoverageSeconds &&
                                period.ReceivedAtUtc >= installation.PairedAtUtc &&
                                (installation.RevokedAtUtc == null || period.ReceivedAtUtc <= installation.RevokedAtUtc)
                             orderby period.LocalDate descending, period.ReceivedAtUtc descending, period.Id descending
                             select new RecoveryReviewBrowser(period.LocalDate, period.ObservedSeconds, period.CoverageSeconds))
            .ToListAsync(ct) : [];
        var reviewable = cycle.Status is "Active" or "ReviewDue" or "Ended";
        var count = Math.Min(4, (end.DayNumber - start.DayNumber + 7) / 7);
        return Enumerable.Range(1, count).Select(number =>
        {
            var from = start.AddDays((number - 1) * 7);
            var due = from.AddDays(6);
            var opens = due.AddDays(-1);
            var reviewed = saved.SingleOrDefault(item => item.WeekNo == number);
            var hasReview = actions.Any(item => item.Kind == "WeeklyReview" && item.Date == due && item.Status == "Due");
            var status = reviewed?.DecisionCode switch
            {
                "AutoContinued" => reviewable && hasReview ? "Continued" : "Unavailable",
                not null => "Reviewed",
                _ => !reviewable || !hasReview ? "Unavailable" : today < opens ? "Upcoming" : today <= due ? "Due" : "Overdue"
            };
            var week = actions.Where(item => item.Date >= from && item.Date <= due &&
                item.Status is not ("Cancelled" or "Rescheduled")).ToArray();
            var practices = week.Where(item => item.Kind == "Practice" && !item.Optional).Select(item =>
            {
                var result = item.Status == "Completed" && item.Date <= today ? item.Result : null;
                var state = item.Status == "Excluded" ? "Excluded" : result is not null ? "Completed" :
                    !item.ScoreSupported || item.Status == "Completed" ? "Unavailable" :
                    item.Status == "Missed" ? "Missed" : item.Date > today ? "Upcoming" :
                    item.Draft is not null ? "Partial" : "Due";
                return new RecoveryReviewPractice(item.Id, item.Date, item.ActivityType, item.Level, item.Title, state,
                    result?.EvidenceTier ?? (state == "Unavailable" ? "No reliable result" : "Recovery Plan schedule"), result);
            }).ToArray();
            var routine = week.Where(item => item.Kind == "Routine" && item.RoutineId is not null).ToArray();
            var reports = checks.Where(check => routine.Any(item =>
                item.Date == check.LocalDate && item.RoutineId == $"sql-routine-{check.RoutineId}")).ToArray();
            var evidence = new RecoveryReviewEvidence(
                practices.Count(item => item.Status != "Excluded"),
                practices.Count(item => item.Status is "Completed" or "Missed" or "Partial" or "Due"),
                practices.Count(item => item.Status == "Completed"), practices.Count(item => item.Status == "Missed"),
                practices.Count(item => item.Status == "Unavailable"), practices,
                new RecoveryReviewRoutine(routine.Select(item => item.Date).Distinct().Count(),
                    reports.Where(item => item.State == "Done").Select(item => item.LocalDate).Distinct().Count(),
                    reports.Where(item => item.State == "Skipped").Select(item => item.LocalDate).Distinct().Count()),
                browser.FirstOrDefault(period => period.Date >= from && period.Date <= due));
            return new RecoveryReviewWindow(number, opens, due, status,
                plan?.Weeks.Any(item => item.Number == number && item.Detailed) == true || week.Length > 0,
                status == "Overdue" && plan is not null && WeekToSchedule(cycle, plan, number, today, actions).HasValue, evidence);
        }).ToArray();
    }

    private static RecoveryPreferences ReviewPreferences(RecoveryPreferences previous, RecoveryReviewInput input,
        RecoveryReviewEvidence evidence, List<string> reasons)
    {
        var preferences = previous;
        if (input.Choice == "adjust" && input.Adjustment is { } adjustment)
        {
            reasons.Add("Uses the practice type, frequency and time you chose.");
            return preferences with { Minutes = adjustment.Minutes, ActivityTypes = [adjustment.ActivityType],
                PracticeDays = new[] { 0, 2, 4, 1, 3 }.Take(adjustment.Days).Order().ToArray() };
        }
        if (input.Choice == "keep")
        {
            reasons.Add("Keeps your previous practice days and time preference.");
            return preferences;
        }
        if (input.Choice == "continue")
            reasons.Add("Conservative continuation keeps your time preference and adds no missed backlog. You can still answer the review.");
        if (input.Manageable == "too-much" || evidence.Missed >= 2 && (input.Manageable == "a-stretch" || input.Choice == "continue"))
        {
            preferences = preferences with { PracticeDays = previous.PracticeDays.Take((previous.PracticeDays.Length + 1) / 2).ToArray() };
            reasons.Add(input.Manageable == "too-much" ? "Your manageability answer suggests fewer practice days."
                : "Several due practices were missed, so fewer practice days are proposed.");
        }
        if (input.Fit == "poor-fit")
        {
            var alternatives = RecoveryPlanRules.PracticeSlots.Keys.Except(previous.ActivityTypes).ToArray();
            preferences = preferences with { ActivityTypes = alternatives.Length > 0 ? alternatives : previous.ActivityTypes.Reverse().ToArray() };
            reasons.Add("Your fit answer suggests trying other approved practices.");
        }
        else if (input.Fit == "mixed")
        {
            var stronger = evidence.Practices.Where(row => row.Result?.Score >= PracticeCatalog.PassingScore &&
                    row.ActivityType is not null && previous.ActivityTypes.Contains(row.ActivityType))
                .OrderByDescending(row => row.Result!.Score).Select(row => row.ActivityType!).Distinct().ToArray();
            if (stronger.Length > 0 && previous.ActivityTypes.Length > 1)
            {
                preferences = preferences with { ActivityTypes = stronger.Concat(previous.ActivityTypes).Distinct().ToArray() };
                reasons.Add("Starts with the practice types supported by your stronger recorded answers.");
            }
        }
        if (reasons.Count == 0)
            reasons.Add("Keeps your practice load steady. Difficulty follows your saved practice choices.");
        return preferences;
    }

    private async Task<RecoveryReviewResult> Receipt(RecoveryCycle cycle, WeeklyReview review, CancellationToken ct)
    {
        var revision = await db.Set<PlanRevision>().SingleOrDefaultAsync(item =>
            item.Id == review.ResultingRevisionId && item.CycleId == cycle.Id, ct);
        var snapshot = (await ReviewSnapshots(cycle.PersonId, [review.Id], ct)).GetValueOrDefault(review.Id);
        var scheduled = snapshot?.Scheduled ?? (revision is null ? 0 : await db.Set<ScheduledAction>()
            .CountAsync(item => item.PlanRevisionId == revision.Id && item.CycleId == cycle.Id, ct));
        return new(SavedReview(review, cycle.TimeZoneId, revision, snapshot), scheduled);
    }

    private async Task<Dictionary<long, ReviewSnapshot?>> ReviewSnapshots(long personId, long[] reviewIds, CancellationToken ct)
    {
        if (reviewIds.Length == 0) return [];
        var rows = await db.Set<AuditEvent>().Where(item => item.ActorPersonId == personId &&
                item.ResourceKind == nameof(WeeklyReview) && reviewIds.Contains(item.ResourceId) &&
                (item.Action == "WeeklyReviewContinued" || item.Action == "WeeklyReviewConfirmed"))
            .OrderByDescending(item => item.Id).Select(item => new { item.ResourceId, item.DetailJson }).ToListAsync(ct);
        return rows.GroupBy(item => item.ResourceId).ToDictionary(group => group.Key,
            group => JsonSerializer.Deserialize<ReviewSnapshot>(group.First().DetailJson!, RecoveryPlanRules.Json));
    }

    private static RecoverySavedReview SavedReview(WeeklyReview review, string zone, PlanRevision? revision, ReviewSnapshot? snapshot) =>
        new($"sql-review-{review.Id}", review.WeekNo,
            review.DecisionCode switch { "KeepPace" => "keep", "Adjust" => "adjust", "AcceptNext" => "accept", _ => "auto" },
            RecoveryPlanRules.Today(DateTime.SpecifyKind(review.ReviewedAtUtc, DateTimeKind.Utc), zone),
            revision is null ? null : $"sql-revision-{revision.Id}", revision?.EffectiveFromLocalDate, revision?.RevisionNo,
            DateTime.SpecifyKind(review.ReviewedAtUtc, DateTimeKind.Utc),
            snapshot is null ? revision?.Reason : string.Join(' ', snapshot.Reasons), snapshot?.Evidence);

    private sealed record ReviewSnapshot(string[] Reasons, RecoveryReviewEvidence Evidence, int Scheduled, RecoveryPreferences? Preferences);
}
