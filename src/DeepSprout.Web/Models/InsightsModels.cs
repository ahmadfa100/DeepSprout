namespace DeepSprout.Web.Models;

public sealed record IndividualInsights(DateOnly Today, InsightsCurrentCycle? Current, InsightsCycle[] History,
    InsightsCycleComparison? Comparison, InsightsPractice[] Practices, InsightsRoutine Routine,
    int MaxLevel, int RequiredExamples, int RequiredDays);

public sealed record InsightsCurrentCycle(InsightsCycle Cycle, int Day, InsightsWeek Week, DateOnly? NextReviewOn,
    DateOnly? LastPlanChangeOn);

public sealed record InsightsCycle(Guid CycleId, int Number, string Kind, string Status, string? Goal,
    DateOnly StartsOn, DateOnly EndsOn, int DetailedWeeks, InsightsAdherence Adherence, int ReportedRoutineDays,
    InsightsWeeklyReview[] Reviews);

public sealed record InsightsWeek(int Number, DateOnly StartsOn, DateOnly EndsOn, bool Detailed,
    InsightsAdherence Adherence, InsightsDay[] Days);

public sealed record InsightsAdherence(int Scheduled, int Due, int Completed, int Missed, int Unavailable)
{
    public decimal? CompletionRate => Due == 0 ? null : (decimal)Completed / Due;
}

public sealed record InsightsDay(DateOnly Date, string? Title, string? ActivityType, string State);
public sealed record InsightsWeeklyReview(int Week, string Decision, DateOnly RecordedOn, string? Manageability, string? Fit);
public sealed record InsightsCycleComparison(int EarlierCycle, int LaterCycle, InsightsAdherence Earlier, InsightsAdherence Later);

public sealed record InsightsPractice(string ActivityType, PracticeLevel? Progress, int ValidAttempts,
    int RewardEligibleAttempts, InsightsScore? Latest, InsightsScore? ComparableEarlier);

public sealed record InsightsScore(DateOnly Date, short Level, RecoveryPracticeResult Result);
public sealed record InsightsRoutine(string? ActiveTitle, DateOnly MonthStartsOn, DateOnly[] DoneDays, DateOnly[] SkippedDays);
