using System.Text.Json;
using System.Text.Json.Serialization;

namespace DeepSprout.Web.Models;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RecoveryPlanEdit(Guid CycleId, int Version, RecoveryPreferences Preferences);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RecoveryPlanActivation(Guid CycleId, int Version);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RecoveryPreferences(
    string Goal, int Minutes, string[] ActivityTypes, int[] PracticeDays, RecoveryRoutineChoice? Routine);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RecoveryRoutineChoice(string Title, int Minutes, int[] Days);

public sealed record RecoveryWeek(int Number, string Title, string Note, bool Detailed);

public sealed record RecoveryPreviewDay(int Offset, string? ActivityType, bool Routine, bool Review);

public sealed record RecoveryPlanDocument(
    int Format, int Version, bool Edited, int CycleDays, JsonElement Setup,
    RecoveryPreferences Preferences, RecoveryRoutineChoice SuggestedRoutine, RecoveryWeek[] Weeks, RecoveryPreviewDay[] WeekOne);

public sealed record RecoveryPlanState(
    Guid CycleId, int CycleNumber, string Status, string TimeZone, DateOnly? StartsOn, DateOnly? EndsOn,
    DateTime? ActivatedAtUtc, string? Goal, bool CanEdit, RecoveryPlanDocument? Plan,
    IReadOnlyList<RecoverySavedAction> Actions, IReadOnlyList<RecoverySavedRoutine> Routines,
    IReadOnlyList<RecoveryCycleSummary> History, IReadOnlyList<RecoverySavedReview> Reviews, string? RequestToken,
    PracticeOverview? Activities, DateOnly Today, RecoveryReviewWindow[] ReviewWeeks, RecoveryPlanChange[] PlanChanges,
    string Kind, DateTime? EndedAtUtc, RecoveryCycleReview? CycleReview, RecoveryCycleEvidence? FinalEvidence,
    RecoveryContinuationOption[] Continuations);

public sealed record RecoveryCycleSummary(Guid CycleId, int CycleNumber, string Status, DateOnly? StartsOn, DateOnly? EndsOn,
    string Kind, DateTime? EndedAtUtc, string? Goal, RecoveryCycleReview? CycleReview);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RecoveryCycleReviewInput(Guid CycleId, string Reflection);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RecoveryContinuationInput(Guid CycleId, string Choice);

public sealed record RecoveryCycleReview(string Reflection, DateTime ReviewedAt, RecoveryCycleEvidence Evidence);
public sealed record RecoveryCycleEvidence(RecoveryReviewWindow[] Weeks, RecoveryCyclePractice[] OptionalPractices, int ReportedRoutineDays);
public sealed record RecoveryCyclePractice(DateOnly Date, string ActivityType, RecoveryPracticeResult Result);
public sealed record RecoveryContinuationOption(string Choice, int PracticeDays, int Minutes);
public sealed record RecoveryContinuationResult(Guid CycleId);

public sealed record RecoverySavedAction(
    string Id, string Kind, DateOnly Date, string Status, bool Optional,
    string? ActivityType, string? ActivityCode, short? Level, string? RoutineId, string? CompletedAttemptId,
    int? Minutes, RecoveryPracticeResult? Result, string RevisionId, string? Title, RecoveryPracticeDraft? Draft,
    bool ScoreSupported);

public sealed record RecoverySavedRoutine(string Id, string Title, string? Hint, string Status, JsonElement? Schedule);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RecoveryReviewInput(Guid CycleId, int Week, string? Manageable, string? Fit, string Choice,
    RecoveryReviewAdjustment? Adjustment, string? ProposalToken);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RecoveryReviewAdjustment(int Days, int Minutes, string ActivityType);

public sealed record RecoveryNextDay(DateOnly Date, string Kind, string? ActivityType, int? Level);
public sealed record RecoveryReviewPreview(RecoveryPreferences Preferences, RecoveryNextDay[] Actions, string[] Reasons,
    int? NextWeek, string ProposalToken, RecoveryReviewEvidence Evidence);
public sealed record RecoverySavedReview(string Id, int Week, string Decision, DateOnly CompletedOn, string? RevisionId,
    DateOnly? EffectiveOn, int? RevisionNumber, DateTime RecordedAt, string? Reason, RecoveryReviewEvidence? Evidence);
public sealed record RecoveryReviewResult(RecoverySavedReview Review, int Scheduled);

public sealed record RecoveryReviewWindow(int Week, DateOnly OpensOn, DateOnly DueOn, string Status, bool Detailed,
    bool CanContinue, RecoveryReviewEvidence Evidence);
public sealed record RecoveryReviewEvidence(int Scheduled, int Due, int Completed, int Missed, int Unavailable,
    RecoveryReviewPractice[] Practices, RecoveryReviewRoutine Routine, RecoveryReviewBrowser? Browser);
public sealed record RecoveryReviewPractice(string ActionId, DateOnly Date, string? ActivityType, short? Level,
    string? Title, string Status, string EvidenceTier, RecoveryPracticeResult? Result);
public sealed record RecoveryReviewRoutine(int ScheduledDays, int DoneDays, int SkippedDays);
public sealed record RecoveryReviewBrowser(DateOnly Date, int ObservedSeconds, int CoverageSeconds);
public sealed record RecoveryPlanChange(string Id, int Version, string Kind, DateOnly EffectiveOn, DateTime RecordedAt,
    string Reason, RecoveryPreferences Preferences);
