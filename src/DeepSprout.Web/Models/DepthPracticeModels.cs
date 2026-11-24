using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using DeepSprout.Domain.V5;
using DeepSprout.Web.Services;

namespace DeepSprout.Web.Models;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record DepthPracticeAnswers(int?[] Answers);

public sealed record DepthQuestion(string Prompt, string[] Options,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? Answer = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Explanation = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string[]? Sources = null);

public sealed record DepthPracticeAttemptState(
    Guid AttemptId, string Status, string Title, string Instructions, string Content, string ContentVersion,
    short Level, DepthQuestion[] Questions, int?[] Answers, RecoveryPracticeResult? Result,
    JsonObject Definition, string Mode, bool Observed, bool AudioReady);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PracticeStart(Guid RequestId, string Mode, string? Code = null, long? ActionId = null);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PracticeSelection(int? Question, int? Answer);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PracticeLevelChoice(string Type, string Choice, short Level);

public sealed record PracticeLevel(short Level, int ValidAtLevel, int Days, string? LastChoice)
{
    public bool Eligible => Level < PracticeCatalog.MaxLevel && ValidAtLevel >= PracticeCatalog.RequiredExamples &&
        Days >= PracticeCatalog.RequiredDays;
}

public sealed record PracticeListing(string Id, string PracticeType, string Title, string Instructions,
    string ContentVersion, short Level, short EstimatedMinutes, string[] GoalTags, PracticeAccess Access, int? QuestionCount = null);
public sealed record PracticeAccess(bool Allowed, string Reason, string? Core);
public sealed record PracticeHistoryItem(Guid AttemptId, string Id, string Status, string ActivityId, string ActivityType,
    string Title, string ContentVersion, short Level, short Minutes, DateOnly On, DateTime StartedAt,
    string? ScheduledActionId, string Source, RecoveryPracticeResult? Result, string? Outcome, bool Legacy);
public sealed record PracticeOverview(
    Dictionary<string, PracticeLevel> Levels, PracticeListing[] Catalog, PracticeHistoryItem[] History);

public sealed record RecoveryPracticeResult(string Id, string Title, string ContentVersion, decimal Score,
    int CorrectCount, int QuestionCount, bool RewardEligible, bool ProgressionEligible, DateTime CompletedAt,
    string EvidenceTier);

public sealed record RecoveryPracticeDraft(string Id, string Status, string Title, string ContentVersion, DateTime StartedAt);

internal sealed record PracticeExercise(string Code, string Type, short Level, string Title, string Instructions,
    string Content, string ContentVersion, DepthQuestion[] Questions, int[] Key, JsonElement Snapshot)
{
    internal bool Interactive => Type is "visual-observation" or "digital-judgment";
    internal short Minutes => Snapshot.GetProperty("estimatedMinutes").GetInt16();
    internal double AudioDuration => Snapshot.GetProperty("audioDurationSeconds").GetDouble();

    internal static PracticeExercise? Read(string? source)
    {
        if (source is null) return null;
        try
        {
            using var document = JsonDocument.Parse(source);
            return Read(document.RootElement);
        }
        catch (Exception error) when (error is JsonException or KeyNotFoundException or InvalidOperationException or FormatException)
        {
            return null; // Older records can reference content outside the current scored catalog.
        }
    }

    internal static PracticeExercise? Read(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Object || !value.TryGetProperty("practiceType", out var family) ||
            family.GetString() is not { } type || !RecoveryPlanRules.PracticeSlots.ContainsKey(type) ||
            !value.TryGetProperty("responseMethod", out var method) || method.GetString() != (type switch
            {
                "visual-observation" => "observation-questions",
                "digital-judgment" => "evidence-questions",
                _ => "choice-questions"
            })) return null;
        var level = value.GetProperty("level").GetInt16();
        if (level is < 1 or > PracticeCatalog.MaxLevel) return null;
        var rows = value.GetProperty("questions").EnumerateArray().ToArray();
        var questions = rows.Select(row => new DepthQuestion(row.GetProperty("prompt").GetString()!,
            row.GetProperty("options").Deserialize<string[]>()!, row.GetProperty("answer").GetInt32(),
            row.TryGetProperty("explanation", out var explanation) ? explanation.GetString() : null,
            row.TryGetProperty("sources", out var sources) ? sources.Deserialize<string[]>() : null)).ToArray();
        var key = rows.Select(row => row.GetProperty("answer").GetInt32()).ToArray();
        if (key.Length == 0 || key.Where((answer, index) => answer < 0 || answer >= questions[index].Options.Length).Any()) return null;
        return new PracticeExercise(value.GetProperty("id").GetString()!, type, level,
            value.GetProperty("title").GetString()!, value.GetProperty("instructions").GetString()!,
            value.TryGetProperty("content", out var content) ? content.GetString() ?? "" : "",
            value.GetProperty("contentVersion").GetString()!, questions, key, value.Clone());
    }

    internal RecoveryPracticeResult? Result(PracticeAttempt? attempt)
    {
        if (attempt is not { Status: "Completed", Valid: true, ScoreValue: { } score, EndedAtUtc: { } end } ||
            score is < 0 or > 1 ||
            attempt.OutcomeCode is not ("DepthScoredReward" or "DepthScoredCooldown" or PracticeCatalog.Reward or
                PracticeCatalog.Cooldown or PracticeCatalog.BelowThreshold or "PracticeTranscriptReward" or "PracticeTranscriptCooldown")) return null;
        var reward = attempt.OutcomeCode is "DepthScoredReward" or PracticeCatalog.Reward or "PracticeTranscriptReward";
        var evidence = attempt.OutcomeCode is "PracticeTranscriptReward" or "PracticeTranscriptCooldown" ? "System-scored transcript recall (changed conditions)"
            : Type == "listening" ? "System-scored recall (playback unverified)" : "System-scored";
        return new RecoveryPracticeResult($"sql-attempt-{attempt.Id}", Title, ContentVersion, score,
            (int)Math.Round(score * Key.Length), Key.Length, reward, reward && score >= PracticeCatalog.PassingScore,
            DateTime.SpecifyKind(end, DateTimeKind.Utc), evidence);
    }
}
