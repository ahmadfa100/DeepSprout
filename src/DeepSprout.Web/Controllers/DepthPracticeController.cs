using System.Buffers.Binary;
using System.Security.Cryptography;
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
[Authorize(Policy = PersonalRecords.IndividualPolicy)]
[Route("api/activities")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class DepthPracticeController(DeepSproutV5DbContext db, PracticeCatalog catalog, TimeProvider clock) : ControllerBase
{
    [HttpGet("depth/{actionId:long}/attempt")]
    public Task<ActionResult<DepthPracticeAttemptState>> ReadDepth(long actionId, CancellationToken ct) =>
        Execute("read", ct, actionId: actionId, depthOnly: true);

    [HttpPost("depth/{actionId:long}/attempt")]
    public Task<ActionResult<DepthPracticeAttemptState>> BeginDepth(long actionId, CancellationToken ct) =>
        Execute("start", ct, actionId: actionId, depthOnly: true);

    [HttpPut("depth/{actionId:long}/attempt/answers")]
    [RequestSizeLimit(512)]
    public Task<ActionResult<DepthPracticeAttemptState>> SaveDepth(long actionId, DepthPracticeAnswers input, CancellationToken ct) =>
        Execute("answers", ct, actionId: actionId, answers: input.Answers, depthOnly: true);

    [HttpPost("depth/{actionId:long}/attempt/pause")]
    public Task<ActionResult<DepthPracticeAttemptState>> PauseDepth(long actionId, CancellationToken ct) =>
        Execute("pause", ct, actionId: actionId, depthOnly: true);

    [HttpPost("depth/{actionId:long}/attempt/submit")]
    [RequestSizeLimit(512)]
    public Task<ActionResult<DepthPracticeAttemptState>> SubmitDepth(long actionId, DepthPracticeAnswers input, CancellationToken ct) =>
        Execute("submit", ct, actionId: actionId, answers: input.Answers, depthOnly: true);

    [HttpPost("attempts")]
    [RequestSizeLimit(1024)]
    public Task<ActionResult<DepthPracticeAttemptState>> Start(PracticeStart input, CancellationToken ct) =>
        input.RequestId == Guid.Empty || input.Mode is not ("standard" or "transcript") ||
        (input.ActionId.HasValue ? input.ActionId <= 0 || input.Code is not null : input.Code is not { Length: > 0 and <= 64 })
            ? Task.FromResult<ActionResult<DepthPracticeAttemptState>>(BadRequest("Choose a valid practice and access mode."))
            : Execute("start", ct, actionId: input.ActionId, start: input);

    [HttpGet("attempts/{id:guid}")]
    public Task<ActionResult<DepthPracticeAttemptState>> Read(Guid id, CancellationToken ct) =>
        Execute("read", ct, id: id);

    [HttpPut("attempts/{id:guid}/answers")]
    [RequestSizeLimit(512)]
    public Task<ActionResult<DepthPracticeAttemptState>> Save(Guid id, DepthPracticeAnswers input, CancellationToken ct) =>
        Execute("answers", ct, id: id, answers: input.Answers);

    [HttpPost("attempts/{id:guid}/answer")]
    [RequestSizeLimit(512)]
    public Task<ActionResult<DepthPracticeAttemptState>> Answer(Guid id, PracticeSelection input, CancellationToken ct) =>
        Execute("answer", ct, id: id, selection: input);

    [HttpPost("attempts/{id:guid}/submit")]
    [RequestSizeLimit(512)]
    public Task<ActionResult<DepthPracticeAttemptState>> Submit(Guid id, DepthPracticeAnswers input, CancellationToken ct) =>
        Execute("submit", ct, id: id, answers: input.Answers);

    [HttpPost("attempts/{id:guid}/{command:regex(^(resume|pause|interrupt|observe|audio-start|audio-finish)$)}")]
    public Task<ActionResult<DepthPracticeAttemptState>> Change(Guid id, string command, CancellationToken ct) =>
        Execute(command, ct, id: id);

    [HttpPost("levels")]
    [RequestSizeLimit(512)]
    public async Task<ActionResult<PracticeLevel>> ChooseLevel(PracticeLevelChoice input, CancellationToken ct)
    {
        if (input.Type is null || !RecoveryPlanRules.PracticeSlots.ContainsKey(input.Type) ||
            input.Choice is not ("next" or "stay" or "down") || input.Level is < 1 or > PracticeCatalog.MaxLevel)
            return BadRequest("Choose a valid practice level decision.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await PersonalRecords.Lock(db, personId, ct) is null) return NotFound();
        if (!await db.Set<RecoveryCycle>().AnyAsync(item => item.PersonId == personId && item.ActivatedAtUtc != null, ct))
            return Conflict("Activate your plan to choose practice levels.");

        var history = await catalog.History(personId, ct);
        var current = (await catalog.Levels(personId, history, ct))[input.Type];
        if (input.Level != current.Level) return Conflict("Your practice level changed. Reload before choosing again.");
        if (input.Choice == "next" && !current.Eligible || input.Choice == "down" && current.Level == 1)
            return Conflict("This difficulty choice is unavailable.");
        if (input.Choice == "stay" && !current.Eligible)
            return Conflict("The next difficulty is not available yet.");
        var next = (short)(current.Level + (input.Choice == "next" ? 1 : input.Choice == "down" ? -1 : 0));
        db.Add(PersonalRecords.Audit(personId, nameof(IndividualProfile), personId, "PracticeLevelChosen",
            new PracticeLevelDecision(input.Type, input.Choice, next, history.FirstOrDefault()?.Attempt.Id ?? 0),
            PersonalRecords.Now(clock)));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return next == current.Level ? current : new PracticeLevel(next, 0, 0, input.Choice);
    }

    private async Task<ActionResult<DepthPracticeAttemptState>> Execute(string command, CancellationToken ct,
        Guid? id = null, long? actionId = null, PracticeStart? start = null, int?[]? answers = null,
        PracticeSelection? selection = null, bool depthOnly = false)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await PersonalRecords.Lock(db, personId, ct) is null) return NotFound();
        var owned = db.Set<PracticeAttempt>().Where(item => item.PersonId == personId &&
            (item.Source == "Plan" || item.Source == "OnDemand"));
        var requestedId = id ?? (start is null ? null : ScopedRequestId(personId, start.RequestId));
        var attempt = requestedId is { } publicId
            ? await owned.SingleOrDefaultAsync(item => item.PublicId == publicId, ct) : null;
        if (id.HasValue && attempt is null) return NotFound();
        if (start is not null && attempt is not null && attempt.ScheduledActionId != actionId)
            return Conflict("That start request already belongs to another practice.");

        actionId ??= attempt?.ScheduledActionId;
        var scheduled = actionId is null ? null : await (from action in db.Set<ScheduledAction>()
            join cycle in db.Set<RecoveryCycle>() on action.CycleId equals cycle.Id
            where action.Id == actionId && action.PersonId == personId && cycle.PersonId == personId &&
                action.ActionKind == "Practice" && cycle.ActivatedAtUtc != null
            select new { Action = action, Cycle = cycle }).SingleOrDefaultAsync(ct);
        if (actionId.HasValue && scheduled is null) return NotFound();

        var now = PersonalRecords.Now(clock);
        var today = scheduled is null ? PracticeCatalog.LocalDate(now) : RecoveryPlanRules.Today(now, scheduled.Cycle.TimeZoneId);
        var versionId = scheduled?.Action.PracticeVersionId ?? attempt?.PracticeVersionId;
        var version = versionId.HasValue ? await db.Set<PracticeVersion>().FindAsync([versionId.Value], ct) : null;
        if (actionId.HasValue && version is null || attempt is not null && attempt.PracticeVersionId != version?.Id)
            return NotFound();
        var exercise = PracticeExercise.Read(version?.ContentJson);
        if (version is not null && (exercise is null || version.EvidenceTier != "SystemScored" ||
            depthOnly && exercise.Type != "depth")) return NotFound();
        if (start?.Code is { } code && exercise is not null && code != exercise.Code)
            return Conflict("That start request already belongs to another practice.");
        if (attempt is null && scheduled is not null)
        {
            var completed = scheduled.Action.CompletedAttemptId;
            attempt = await owned.Where(item => item.Source == "Plan" && item.ScheduledActionId == actionId &&
                item.PracticeVersionId == versionId && (item.Id == completed || item.Status == "Started" || item.Status == "Paused"))
                .OrderByDescending(item => item.Id == completed).ThenByDescending(item => item.Id).FirstOrDefaultAsync(ct);
        }

        var progress = attempt is null ? null : await LoadProgress(attempt, exercise!.Key.Length, ct);
        if (command == "read") return attempt is null ? NotFound() : State(attempt, progress!, exercise!);
        if (attempt?.Status == "Completed" && command is ("start" or "resume" or "submit" or "pause"))
        {
            if (command == "submit" && (answers is null || !progress!.Answers.SequenceEqual(answers)))
                return Conflict("This attempt already has a saved submission.");
            return State(attempt, progress!, exercise!);
        }
        if (attempt?.Status == "Cancelled" && command is ("start" or "interrupt"))
            return State(attempt, progress!, exercise!);
        if (scheduled is not null && (scheduled.Cycle.Status != "Active" || scheduled.Action.Status != "Due" ||
            scheduled.Action.LocalDate != today || !(scheduled.Cycle.StartLocalDate <= today && today <= scheduled.Cycle.EndLocalDate)))
            return Conflict("This scheduled practice is unavailable today.");
        if (scheduled is null && attempt is not null && PracticeCatalog.LocalDate(attempt.StartedAtUtc) != today &&
            command is not "interrupt")
            return Conflict("This attempt expired. Start a new example to try again.");
        if (scheduled is null && command is not ("read" or "interrupt") &&
            !await db.Set<RecoveryCycle>().AnyAsync(item => item.PersonId == personId && item.Status == "Active" &&
                item.ActivatedAtUtc != null && item.StartLocalDate <= today && item.EndLocalDate >= today, ct))
            return Conflict("An active plan is required for optional practice.");

        if (command == "start" && attempt is null)
        {
            if (scheduled is null)
            {
                var history = await catalog.History(personId, ct);
                var definitions = await catalog.Published(ct);
                exercise = definitions.SingleOrDefault(item => item.Code == start!.Code);
                if (exercise is null) return NotFound("Choose a published approved practice.");
                var level = (await catalog.Levels(personId, history, ct))[exercise.Type].Level;
                if (exercise.Level != level) return Conflict("Choose an example at your current difficulty.");
                if (history.Any(row => row.Exercise?.Code == exercise.Code && row.Attempt.Source == "OnDemand" &&
                    row.Date == today && row.Attempt.Status is "Started" or "Paused"))
                    return Conflict("Resume or end the original attempt before starting this example again.");
                if (PracticeCatalog.OptionalLimit(history, today)) return Conflict("The optional practice limit has been reached today.");
                if (PracticeCatalog.RecentlyRewarded(history, exercise.Code, today))
                    return Conflict("Choose a different example during this exercise's reward cooldown.");
                if (await db.Set<ScheduledAction>().AnyAsync(item => item.PersonId == personId && item.LocalDate == today &&
                    item.Status == "Due" && item.PracticeVersionId != null &&
                    db.Set<PracticeVersion>().Any(pinned => pinned.Id == item.PracticeVersionId &&
                        db.Set<PracticeDefinition>().Any(definition => definition.Id == pinned.DefinitionId && definition.Code == exercise.Code)), ct))
                    return Conflict("Open the scheduled copy of this example.");
                await catalog.LockCatalog(ct);
                version = await catalog.Pin(exercise, now, ct);
                if (version is null) return Conflict("This practice is currently unavailable.");
                exercise = PracticeExercise.Read(version.ContentJson)!;
            }
            if (exercise is null || start?.Mode == "transcript" && exercise.Type != "listening")
                return BadRequest("Choose an access mode supported by this practice.");
            attempt = new PracticeAttempt
            {
                PublicId = requestedId ?? Guid.NewGuid(), PersonId = personId, ScheduledActionId = actionId,
                PracticeVersionId = version!.Id, Source = scheduled is null ? "OnDemand" : "Plan",
                Status = "Started", Title = exercise.Title, StartedAtUtc = now, CreatedAtUtc = now
            };
            db.Add(attempt);
            await db.SaveChangesAsync(ct);
            progress = new(new int?[exercise.Key.Length], start?.Mode ?? "standard");
            Record("PracticeStarted");
        }
        else
        {
            if (attempt is null || progress is null || exercise is null) return Conflict("Start the practice first.");
            if (attempt.Status is not ("Started" or "Paused")) return Conflict("This attempt is closed.");
            if (command is "start" or "resume")
            {
                if (start is not null && start.Mode != progress.Mode)
                    return Conflict("Resume in the original access mode or end this attempt.");
                if (attempt.Status == "Paused")
                {
                    attempt.Status = "Started";
                    Record("PracticeResumed");
                }
            }
            else if (command == "interrupt")
            {
                attempt.Status = "Cancelled";
                attempt.EndedAtUtc = now;
                Record("PracticeInterrupted");
            }
            else if (command == "pause")
            {
                if (attempt.Status != "Paused")
                {
                    attempt.Status = "Paused";
                    // An unfinished playback period cannot earn credit after a pause.
                    if (!progress.AudioReady) progress = progress with { AudioStartedAt = null };
                    Record("PracticePaused");
                }
            }
            else
            {
                if (attempt.Status != "Started") return Conflict("Resume your practice before answering.");
                switch (command)
                {
                    case "observe":
                        if (exercise.Type != "visual-observation") return BadRequest("This practice has no observation scene.");
                        if (!progress.Observed)
                        {
                            progress = progress with { Observed = true };
                            Record("PracticeObservationOpened");
                        }
                        break;
                    case "audio-start":
                    case "audio-finish":
                        if (exercise.Type != "listening" || progress.Mode != "standard")
                            return BadRequest("This attempt does not use audio playback.");
                        if (progress.AudioReady) break;
                        if (command == "audio-start")
                        {
                            if (progress.AudioStartedAt is null)
                            {
                                progress = progress with { AudioStartedAt = now };
                                Record("PracticeAudioStarted");
                            }
                        }
                        else
                        {
                            if (progress.AudioStartedAt is not { } began || (now - began).TotalSeconds < exercise.AudioDuration - 0.25)
                                return Conflict("Finish the original audio playback before submitting.");
                            progress = progress with { AudioReady = true };
                            Record("PracticeAudioReady");
                        }
                        break;
                    case "answer":
                        if (!exercise.Interactive || selection is not { Question: { } index, Answer: { } option } ||
                            index < 0 || index >= exercise.Key.Length || option < 0 || option >= exercise.Questions[index].Options.Length)
                            return BadRequest("Choose a valid question and answer.");
                        if (exercise.Type == "visual-observation" && !progress.Observed)
                            return Conflict("Open the observation scene first.");
                        if (progress.Answers[index] == option) break;
                        if (Array.IndexOf(progress.Answers, null) != index)
                            return Conflict("Answers must be checked in order and cannot be changed after feedback.");
                        progress.Answers[index] = option;
                        Record("PracticeAnswerChecked");
                        break;
                    case "answers":
                    case "submit":
                        if (answers is null || answers.Length != exercise.Key.Length || answers.Where((answer, index) =>
                            answer.HasValue ? answer.Value < 0 || answer.Value >= exercise.Questions[index].Options.Length :
                            command == "submit").Any())
                            return BadRequest(command == "submit" ? "Choose a valid answer for every question." : "Check your draft answers.");
                        if (exercise.Interactive && (command != "submit" || !progress.Answers.SequenceEqual(answers)))
                            return Conflict("Check every answer in order before submitting the practice.");
                        if (command == "answers")
                        {
                            if (!progress.Answers.SequenceEqual(answers))
                            {
                                progress = progress with { Answers = answers };
                                Record("PracticeDraftSaved");
                            }
                            break;
                        }
                        if (exercise.Type == "listening" && progress.Mode == "standard" && !progress.AudioReady)
                            return Conflict("Finish the audio playback or use a separate transcript attempt.");
                        progress = progress with { Answers = answers };
                        var recent = PracticeCatalog.RecentlyRewarded(await catalog.History(personId, ct), exercise.Code, today);
                        var score = Math.Round(answers.Where((answer, index) => answer == exercise.Key[index]).Count() /
                            (decimal)exercise.Key.Length, 4);
                        attempt.ScoreValue = score;
                        attempt.Valid = true;
                        attempt.Status = "Completed";
                        attempt.EndedAtUtc = now;
                        attempt.OutcomeCode = exercise.Type == "depth" ? (recent ? "DepthScoredCooldown" : "DepthScoredReward") :
                            progress.Mode == "transcript" ? (recent ? "PracticeTranscriptCooldown" : "PracticeTranscriptReward") :
                            exercise.Interactive && score < PracticeCatalog.PassingScore ? PracticeCatalog.BelowThreshold :
                            recent ? PracticeCatalog.Cooldown : PracticeCatalog.Reward;
                        if (scheduled is not null)
                        {
                            scheduled.Action.Status = "Completed";
                            scheduled.Action.CompletedAttemptId = attempt.Id;
                        }
                        Record("PracticeAnswersSubmitted");
                        break;
                }
            }
        }
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return State(attempt, progress!, exercise!);

        void Record(string action) =>
            db.Add(PersonalRecords.Audit(personId, nameof(PracticeAttempt), attempt!.Id, action, progress!, now));
    }

    private async Task<PracticeDraft> LoadProgress(PracticeAttempt attempt, int count, CancellationToken ct)
    {
        var record = await db.Set<AuditEvent>().Where(entry => entry.ActorPersonId == attempt.PersonId &&
            entry.ResourceKind == nameof(PracticeAttempt) && entry.ResourceId == attempt.Id &&
            (entry.Action.StartsWith("Practice") || entry.Action == "DepthDraftSaved" || entry.Action == "DepthAnswersSubmitted"))
            .OrderByDescending(entry => entry.Id).Select(entry => new { entry.Action, entry.DetailJson }).FirstOrDefaultAsync(ct);
        if (record?.DetailJson is not { } json) return new(new int?[count]);
        if (record.Action.StartsWith("Depth", StringComparison.Ordinal)) return new(JsonSerializer.Deserialize<int?[]>(json)!);
        return JsonSerializer.Deserialize<PracticeDraft>(json, RecoveryPlanRules.Json)!;
    }

    private static DepthPracticeAttemptState State(PracticeAttempt attempt, PracticeDraft progress, PracticeExercise exercise)
    {
        var definition = System.Text.Json.Nodes.JsonNode.Parse(exercise.Snapshot.GetRawText())!.AsObject();
        definition.Remove("questions");
        if (exercise.Type == "listening" && progress.Mode == "standard") definition.Remove("content");
        var completed = attempt.Status == "Completed";
        var questions = exercise.Questions.Select((question, index) => completed ||
            exercise.Interactive && progress.Answers[index].HasValue ? question :
            question with { Answer = null, Explanation = null, Sources = null }).ToArray();
        return new(attempt.PublicId, attempt.Status, exercise.Title, exercise.Instructions,
            exercise.Type == "listening" && progress.Mode == "standard" ? "" : exercise.Content, exercise.ContentVersion,
            exercise.Level, questions, progress.Answers, exercise.Result(attempt), definition, progress.Mode,
            progress.Observed, progress.AudioReady);
    }

    private static Guid ScopedRequestId(long personId, Guid requestId)
    {
        Span<byte> input = stackalloc byte[24];
        BinaryPrimitives.WriteInt64LittleEndian(input, personId);
        requestId.TryWriteBytes(input[8..]);
        return new Guid(SHA256.HashData(input).AsSpan(0, 16));
    }

    private sealed record PracticeDraft(int?[] Answers, string Mode = "standard", bool Observed = false,
        DateTime? AudioStartedAt = null, bool AudioReady = false);
}
