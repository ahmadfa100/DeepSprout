using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Models;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Services;

public sealed class PracticeCatalog(DeepSproutV5DbContext db, IWebHostEnvironment environment)
{
    internal const string Reward = "PracticeScoredReward";
    internal const string Cooldown = "PracticeScoredCooldown";
    internal const string BelowThreshold = "PracticeScoredBelowThreshold";
    internal const int CooldownDays = 7;
    internal const int OptionalDaily = 2;
    internal const int RequiredExamples = 3;
    internal const int RequiredDays = 3;
    internal const short MaxLevel = 3;
    internal const decimal PassingScore = .75m;

    internal async Task<PracticeExercise[]> Published(CancellationToken ct, bool includeUnavailable = false)
    {
        using var stream = environment.WebRootFileProvider.GetFileInfo("src/data/practices.json").CreateReadStream();
        using var catalog = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var unavailable = includeUnavailable ? [] : await db.Set<PracticeDefinition>().Where(item => item.Status != "Published")
            .Select(item => item.Code).ToListAsync(ct);
        return catalog.RootElement.GetProperty("definitions").EnumerateArray()
            .Where(item => item.GetProperty("status").GetString() == "Published")
            .Select(PracticeExercise.Read).OfType<PracticeExercise>()
            .Where(item => !unavailable.Contains(item.Code, StringComparer.OrdinalIgnoreCase)).ToArray();
    }

    internal Task LockCatalog(CancellationToken ct) => db.Database.ExecuteSqlRawAsync(
        "DECLARE @result int; EXEC @result = sys.sp_getapplock @Resource = N'DeepSprout.RecoveryPracticeCatalog', " +
        "@LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000; " +
        "IF @result < 0 THROW 51000, 'The practice catalog is busy. Try again.', 1;", ct);

    internal async Task<PracticeVersion?> Pin(PracticeExercise exercise, DateTime now, CancellationToken ct)
    {
        var definition = await db.Set<PracticeDefinition>().SingleOrDefaultAsync(item => item.Code == exercise.Code, ct);
        var slot = RecoveryPlanRules.PracticeSlots[exercise.Type];
        if (definition is null)
        {
            definition = new PracticeDefinition
            {
                Code = exercise.Code, PracticeType = slot, Title = exercise.Title, Status = "Published", CreatedAtUtc = now
            };
            db.Add(definition);
            await db.SaveChangesAsync(ct);
        }
        if (definition.Status != "Published" || definition.PracticeType != slot) return null;

        var number = exercise.Snapshot.GetProperty("version").GetInt32();
        var version = await db.Set<PracticeVersion>().SingleOrDefaultAsync(item =>
            item.DefinitionId == definition.Id && item.VersionNo == number, ct);
        if (version is null)
        {
            version = new PracticeVersion
            {
                DefinitionId = definition.Id, VersionNo = number, ContentRef = $"src/data/practices.json#{exercise.Code}",
                ContentJson = exercise.Snapshot.GetRawText(), DifficultyTier = exercise.Level,
                EstimatedMinutes = exercise.Snapshot.GetProperty("estimatedMinutes").GetInt16(), EvidenceTier = "SystemScored",
                ValidationVersion = exercise.Snapshot.GetProperty("validationVersion").GetString()!,
                PublishedAtUtc = now, CreatedAtUtc = now
            };
            db.Add(version);
            await db.SaveChangesAsync(ct);
        }
        var pinned = PracticeExercise.Read(version.ContentJson);
        return version.EvidenceTier == "SystemScored" && version.DifficultyTier == exercise.Level &&
            pinned?.Code == exercise.Code && pinned.Type == exercise.Type ? version : null;
    }

    internal async Task<PracticeRecord[]> History(long personId, CancellationToken ct)
    {
        var rows = await (from attempt in db.Set<PracticeAttempt>().AsNoTracking()
                          join version in db.Set<PracticeVersion>() on attempt.PracticeVersionId equals version.Id
                          join definition in db.Set<PracticeDefinition>() on version.DefinitionId equals definition.Id
                          join action in db.Set<ScheduledAction>().Where(item => item.PersonId == personId)
                              on attempt.ScheduledActionId equals (long?)action.Id into actions
                          from action in actions.DefaultIfEmpty()
                          where attempt.PersonId == personId && (attempt.Source == "Plan" || attempt.Source == "OnDemand")
                          orderby attempt.Id descending
                          select new { attempt, version, definition, Date = (DateOnly?)action.LocalDate })
            .ToListAsync(ct);
        return rows.Select(row => new PracticeRecord(row.attempt, PracticeExercise.Read(row.version.ContentJson),
            row.Date ?? LocalDate(row.attempt.EndedAtUtc ?? row.attempt.StartedAtUtc), row.definition, row.version)).ToArray();
    }

    internal async Task<ScoredPracticeRecord[]> ScoredHistory(long personId, DateOnly today, DateTime now, CancellationToken ct)
    {
        var linked = await (from action in db.Set<ScheduledAction>().AsNoTracking()
                            join cycle in db.Set<RecoveryCycle>() on action.CycleId equals cycle.Id
                            join attempt in db.Set<PracticeAttempt>() on action.CompletedAttemptId equals (long?)attempt.Id
                            where action.PersonId == personId && cycle.PersonId == personId && attempt.PersonId == personId &&
                                cycle.ActivatedAtUtc != null && action.ActionKind == "Practice" && action.Status == "Completed" &&
                                attempt.Source == "Plan" && attempt.ScheduledActionId == action.Id &&
                                action.PracticeVersionId == attempt.PracticeVersionId
                            select attempt.Id).ToHashSetAsync(ct);
        return (await History(personId, ct))
            .Where(item => item.Version.EvidenceTier == "SystemScored" && item.Date <= today &&
                (linked.Contains(item.Attempt.Id) || item.Attempt.Source == "OnDemand" && item.Attempt.ScheduledActionId is null) &&
                MatchesDefinition(item.Exercise, item.Definition))
            .Select(item => new { Record = item, Result = item.Exercise!.Result(item.Attempt) })
            .Where(item => item.Result is not null && item.Result.CompletedAt <= now)
            .OrderByDescending(item => item.Result!.CompletedAt).ThenByDescending(item => item.Record.Attempt.Id)
            .Select(item => new ScoredPracticeRecord(item.Record, item.Result!)).ToArray();
    }

    internal static bool MatchesDefinition(PracticeExercise? exercise, PracticeDefinition definition) =>
        exercise is not null && exercise.Code == definition.Code &&
        RecoveryPlanRules.PracticeSlots[exercise.Type] == definition.PracticeType;

    internal async Task<Dictionary<string, PracticeLevel>> Levels(long personId, PracticeRecord[] records, CancellationToken ct)
    {
        var events = await db.Set<AuditEvent>().AsNoTracking().Where(item => item.ActorPersonId == personId &&
            item.ResourceKind == nameof(IndividualProfile) && item.ResourceId == personId && item.Action == "PracticeLevelChosen")
            .OrderByDescending(item => item.Id).Select(item => item.DetailJson).ToListAsync(ct);
        var decisions = events.Select(json => JsonSerializer.Deserialize<PracticeLevelDecision>(json!, RecoveryPlanRules.Json)!).ToArray();
        return RecoveryPlanRules.PracticeSlots.Keys.ToDictionary(type => type, type =>
        {
            var decision = decisions.FirstOrDefault(item => item.Type == type && item.Choice != "stay");
            var level = decision?.Level ?? 1;
            var evidence = records.Where(row => row.Exercise?.Type == type && row.Exercise.Level == level &&
                row.Attempt.Id > (decision?.AfterAttemptId ?? 0) && row.Exercise.Result(row.Attempt)?.ProgressionEligible == true).ToArray();
            return new PracticeLevel(level, evidence.Select(row => row.Exercise!.Code).Distinct().Count(),
                evidence.Select(row => row.Date).Distinct().Count(), decision?.Choice);
        });
    }

    internal static bool RecentlyRewarded(PracticeRecord[] records, string code, DateOnly today) =>
        records.Any(row => row.Exercise?.Code == code && row.Date <= today &&
            row.Date > today.AddDays(-CooldownDays) && row.Attempt.Valid == true &&
            row.Attempt.OutcomeCode is Reward or "DepthScoredReward" or "PracticeTranscriptReward");

    internal static bool OptionalLimit(PracticeRecord[] records, DateOnly today) =>
        records.Count(row => row.Attempt.Source == "OnDemand" && LocalDate(row.Attempt.StartedAtUtc) == today) >= OptionalDaily;

    internal static DateOnly LocalDate(DateTime utc) =>
        RecoveryPlanRules.Today(DateTime.SpecifyKind(utc, DateTimeKind.Utc), RecoveryPlanRules.TimeZone);

    internal async Task<PracticeOverview> Overview(RecoveryCycle cycle, RecoverySavedAction[] actions, DateOnly today, CancellationToken ct)
    {
        var records = await History(cycle.PersonId, ct);
        var levels = await Levels(cycle.PersonId, records, ct);
        var available = cycle.Status == "Active" && cycle.StartLocalDate <= today && cycle.EndLocalDate >= today;
        var limit = OptionalLimit(records, today);
        var catalog = (await Published(ct)).Select(exercise =>
        {
            var core = actions.FirstOrDefault(item => item.Kind == "Practice" && item.ScoreSupported && item.ActivityCode == exercise.Code &&
                item.Status == "Due" && item.Date == today);
            var reason = !available ? "An active plan is required." : core is not null ? "" :
                exercise.Level != levels[exercise.Type].Level ? "Choose content at your current level." :
                limit ? "Optional practice limit reached today. Scheduled practices remain available." :
                RecentlyRewarded(records, exercise.Code, today) ? "This example is inside its reward cooldown." : "";
            return new PracticeListing(exercise.Code, exercise.Type, exercise.Title, exercise.Instructions, exercise.ContentVersion,
                exercise.Level, exercise.Minutes, exercise.Snapshot.GetProperty("goalTags").Deserialize<string[]>()!,
                new PracticeAccess(reason.Length == 0, reason, available ? core?.Id : null), exercise.Key.Length);
        }).ToList();
        // A due action remains playable using its original, pinned version.
        foreach (var action in actions.Where(item => available && item.Kind == "Practice" && item.ScoreSupported &&
            item.Status == "Due" && item.Date == today))
        {
            if (action.ActivityType is not { } type || !levels.ContainsKey(type) || action.ActivityCode is not { } code ||
                action.Level is not { } level) continue;
            var index = catalog.FindIndex(item => item.Id == code);
            var listing = index >= 0 ? catalog[index] : new PracticeListing(code, type, action.Title ?? type,
                "Open your scheduled exercise.", "Scheduled version", level, (short)(action.Minutes ?? 5), [],
                new PracticeAccess(true, "", action.Id));
            if (index < 0) catalog.Add(listing);
            else catalog[index] = listing with { Level = level };
        }
        return new PracticeOverview(levels, catalog.ToArray(), records.Select(row =>
        {
            var attempt = row.Attempt;
            var exercise = row.Exercise;
            var type = exercise?.Type ?? (row.Definition.PracticeType switch
            {
                "DepthPractice" => "depth",
                "ListeningRecall" => "listening",
                "PracticalMicroChallenge" => "practical",
                "ProtectedWork" => "protected-work",
                _ => row.Definition.PracticeType
            });
            return new PracticeHistoryItem(attempt.PublicId, $"sql-attempt-{attempt.Id}", attempt.Status, row.Definition.Code,
                type, exercise?.Title ?? attempt.Title ?? row.Definition.Title,
                exercise?.ContentVersion ?? row.Version.ContentRef, row.Version.DifficultyTier, row.Version.EstimatedMinutes ?? 0, row.Date,
                DateTime.SpecifyKind(attempt.StartedAtUtc, DateTimeKind.Utc),
                attempt.ScheduledActionId is { } action ? $"sql-action-{action}" : null, attempt.Source,
                exercise?.Result(attempt), attempt.OutcomeCode, exercise is null);
        }).ToArray());
    }
}

internal sealed record PracticeRecord(PracticeAttempt Attempt, PracticeExercise? Exercise, DateOnly Date,
    PracticeDefinition Definition, PracticeVersion Version);
internal sealed record ScoredPracticeRecord(PracticeRecord Record, RecoveryPracticeResult Result);
internal sealed record PracticeLevelDecision(string Type, string Choice, short Level, long AfterAttemptId);
