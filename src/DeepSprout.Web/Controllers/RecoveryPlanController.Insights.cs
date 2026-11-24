using DeepSprout.Domain.V5;
using DeepSprout.Web.Models;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

public sealed partial class RecoveryPlanController
{
    [HttpGet("/api/insights")]
    public async Task<ActionResult<IndividualInsights>> ReadInsights(CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await PersonalRecords.Lock(db, personId, ct) is null) return NotFound();

        var cycles = await db.Set<RecoveryCycle>().AsNoTracking().Where(item => item.PersonId == personId)
            .OrderByDescending(item => item.CycleNo).ToArrayAsync(ct);
        var current = CurrentCycle(cycles);
        var zone = current?.TimeZoneId ?? RecoveryPlanRules.TimeZone;
        var now = PersonalRecords.Now(clock);
        var today = RecoveryPlanRules.Today(now, zone);
        var month = new DateOnly(today.Year, today.Month, 1);
        var activated = cycles.Where(item => item.ActivatedAtUtc.HasValue &&
            item.StartLocalDate.HasValue && item.EndLocalDate.HasValue).ToArray();
        var ids = activated.Select(item => item.Id).ToArray();
        var reviews = await db.Set<WeeklyReview>().AsNoTracking().Where(item => ids.Contains(item.CycleId))
            .OrderBy(item => item.WeekNo).ToArrayAsync(ct);
        var revisions = await db.Set<PlanRevision>().AsNoTracking().Where(item =>
            ids.Contains(item.CycleId) && item.Status != "Draft").OrderBy(item => item.RevisionNo).ToArrayAsync(ct);
        var snapshots = await CycleReviews(personId, ids, ct);

        var earliestDate = activated.Select(item => item.StartLocalDate!.Value).Append(month).Min();
        var checkIns = await (from checkIn in db.Set<RoutineCheckIn>().AsNoTracking()
                              join routine in db.Set<OfflineRoutine>() on checkIn.RoutineId equals routine.Id
                              where checkIn.PersonId == personId && routine.PersonId == personId &&
                                  checkIn.LocalDate >= earliestDate && checkIn.LocalDate <= today
                              select new { checkIn.LocalDate, checkIn.State }).Distinct().OrderBy(item => item.LocalDate).ToArrayAsync(ct);
        var activeTitle = await db.Set<OfflineRoutine>().AsNoTracking().Where(item => item.PersonId == personId && item.Status == "Active")
            .OrderByDescending(item => item.IsInitialCommitment).ThenByDescending(item => item.Id)
            .Select(item => item.Title).FirstOrDefaultAsync(ct);
        var routineSummary = new InsightsRoutine(activeTitle, month,
            checkIns.Where(item => item.LocalDate >= month && item.State == "Done").Select(item => item.LocalDate).ToArray(),
            checkIns.Where(item => item.LocalDate >= month && item.State == "Skipped").Select(item => item.LocalDate).ToArray());

        var summaries = new List<InsightsCycle>();
        InsightsCurrentCycle? currentSummary = null;
        foreach (var cycle in activated)
        {
            var start = cycle.StartLocalDate!.Value;
            var end = cycle.EndLocalDate!.Value;
            var cycleToday = RecoveryPlanRules.Today(now, cycle.TimeZoneId);
            var cycleReviews = reviews.Where(item => item.CycleId == cycle.Id).ToArray();
            var cycleRevisions = revisions.Where(item => item.CycleId == cycle.Id).ToArray();
            var accepted = cycleRevisions.LastOrDefault();
            var plan = RecoveryPlanRules.Read(accepted?.PlanJson);
            var isCurrent = cycle.Id == current?.Id;
            var snapshot = snapshots.GetValueOrDefault(cycle.Id)?.Evidence;
            var actions = snapshot is null || isCurrent ? await SavedActions(cycle, cycleToday, ct) : [];
            var weeks = snapshot?.Weeks ??
                await ReviewWindows(cycle, plan, actions, cycleReviews, cycleToday, ct, includeBrowser: false);
            var status = cycleToday > end && cycle.Status is ("Active" or "ReviewDue" or "Paused") ? "Ended" : cycle.Status;
            var summary = new InsightsCycle(cycle.PublicId, cycle.CycleNo, cycle.Kind, status, accepted?.GoalCode, start, end,
                weeks.Count(item => item.Detailed), Adherence(weeks.Select(item => item.Evidence)),
                snapshot?.ReportedRoutineDays ?? checkIns.Count(item => item.State == "Done" && item.LocalDate >= start && item.LocalDate <= end),
                cycleReviews.Select(item => new InsightsWeeklyReview(item.WeekNo, item.DecisionCode,
                    RecoveryPlanRules.Today(DateTime.SpecifyKind(item.ReviewedAtUtc, DateTimeKind.Utc), cycle.TimeZoneId),
                    item.ManageabilityCode, item.FitCode)).ToArray());
            summaries.Add(summary);

            if (!isCurrent || weeks.Length == 0) continue;
            var day = Math.Clamp(cycleToday.DayNumber - start.DayNumber + 1, 1, end.DayNumber - start.DayNumber + 1);
            var week = weeks[Math.Min((day - 1) / 7, weeks.Length - 1)];
            var weekStart = start.AddDays((week.Week - 1) * 7);
            var detailedFrom = cycleRevisions.FirstOrDefault(item =>
                item.EffectiveFromLocalDate >= weekStart && item.EffectiveFromLocalDate <= week.DueOn)?.EffectiveFromLocalDate;
            var dates = Enumerable.Range(0, week.DueOn.DayNumber - weekStart.DayNumber + 1)
                .Select(offset => InsightDay(weekStart.AddDays(offset), detailedFrom, week, actions, cycleToday)).ToArray();
            var nextReview = weeks.LastOrDefault(item => item.Status is "Due" or "Overdue" or "Continued") ??
                weeks.FirstOrDefault(item => item.Status == "Upcoming");
            currentSummary = new(summary, day,
                new InsightsWeek(week.Week, weekStart, week.DueOn, week.Detailed, Adherence([week.Evidence]), dates),
                nextReview?.DueOn, cycleRevisions.LastOrDefault(item => item.ChangeKind != "Initial")?.EffectiveFromLocalDate);
        }

        var practice = await InsightPractice(personId, activated.Length != 0, today, now, ct);
        var comparison = CompareCycles(summaries, activated, revisions);
        await transaction.CommitAsync(ct);
        return new IndividualInsights(today, currentSummary,
            summaries.Where(item => item.CycleId != currentSummary?.Cycle.CycleId).ToArray(), comparison,
            practice, routineSummary, PracticeCatalog.MaxLevel, PracticeCatalog.RequiredExamples, PracticeCatalog.RequiredDays);
    }

    private async Task<InsightsPractice[]> InsightPractice(long personId, bool hasActivated, DateOnly today, DateTime now, CancellationToken ct)
    {
        var valid = await catalog.ScoredHistory(personId, today, now, ct);
        var levels = await catalog.Levels(personId, valid.Select(item => item.Record).ToArray(), ct);
        return RecoveryPlanRules.PracticeSlots.Keys.Select(type =>
        {
            var attempts = valid.Where(item => item.Record.Exercise!.Type == type).ToArray();
            var latest = attempts.FirstOrDefault();
            // Only the same pinned exercise version and evidence conditions support a score comparison.
            var earlier = latest is null ? null : attempts.Skip(1).FirstOrDefault(item =>
                item.Record.Version.Id == latest.Record.Version.Id && item.Result!.EvidenceTier == latest.Result!.EvidenceTier);
            return new InsightsPractice(type, hasActivated ? levels[type] : null, attempts.Length,
                attempts.Count(item => item.Result!.RewardEligible),
                latest is null ? null : new InsightsScore(latest.Record.Date, latest.Record.Version.DifficultyTier, latest.Result!),
                earlier is null ? null : new InsightsScore(earlier.Record.Date, earlier.Record.Version.DifficultyTier, earlier.Result!));
        }).ToArray();
    }

    private static InsightsAdherence Adherence(IEnumerable<RecoveryReviewEvidence> evidence)
    {
        var weeks = evidence.ToArray();
        return new(weeks.Sum(item => item.Scheduled), weeks.Sum(item => item.Due), weeks.Sum(item => item.Completed),
            weeks.Sum(item => item.Missed), weeks.Sum(item => item.Unavailable));
    }

    private static InsightsDay InsightDay(DateOnly date, DateOnly? detailedFrom, RecoveryReviewWindow week,
        RecoverySavedAction[] actions, DateOnly today)
    {
        var practice = week.Evidence.Practices.Where(item => item.Date == date)
            .OrderByDescending(item => item.Status == "Completed").FirstOrDefault();
        if (practice is not null)
            return new(date, practice.Title, practice.ActivityType, practice.Status);
        var review = actions.FirstOrDefault(item => item.Date == date && item.Kind == "WeeklyReview" &&
            item.Status is "Due" or "Completed");
        if (review is not null)
            return new(date, "Weekly review", null, review.Status == "Completed" ? "Completed" : date > today ? "Upcoming" : "Due");
        return week.Detailed && detailedFrom <= date
            ? new(date, "Rest day", null, "Rest")
            : new(date, null, null, "Unavailable");
    }

    private static InsightsCycleComparison? CompareCycles(List<InsightsCycle> summaries, RecoveryCycle[] cycles,
        PlanRevision[] revisions)
    {
        var finished = summaries.Where(item => item.Status is "Ended" or "Reviewed").Take(2).ToArray();
        if (finished.Length < 2) return null;
        var later = finished[0];
        var earlier = finished[1];
        if (earlier.Number + 1 != later.Number || earlier.EndsOn >= later.StartsOn || earlier.Kind != later.Kind ||
            earlier.Goal is null || earlier.Goal != later.Goal ||
            cycles.Single(item => item.PublicId == earlier.CycleId).TimeZoneId !=
                cycles.Single(item => item.PublicId == later.CycleId).TimeZoneId ||
            finished.Any(item => item.EndsOn.DayNumber - item.StartsOn.DayNumber + 1 != RecoveryPlanRules.CycleDays ||
                item.DetailedWeeks != 4 || item.Adherence.Due == 0 ||
                item.Adherence.Due != item.Adherence.Scheduled || item.Adherence.Unavailable != 0 ||
                !HasFullWeekCoverage(item)))
            return null;
        return new(earlier.Number, later.Number, earlier.Adherence, later.Adherence);

        bool HasFullWeekCoverage(InsightsCycle summary)
        {
            var id = cycles.Single(item => item.PublicId == summary.CycleId).Id;
            var effectiveDates = revisions.Where(item => item.CycleId == id).Select(item => item.EffectiveFromLocalDate).ToHashSet();
            return Enumerable.Range(0, 4).All(week => effectiveDates.Contains(summary.StartsOn.AddDays(week * 7)));
        }
    }
}
