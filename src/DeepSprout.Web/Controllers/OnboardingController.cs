using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/onboarding")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class OnboardingController(DeepSproutV5DbContext db, IAntiforgery antiforgery, TimeProvider clock) : ControllerBase
{
    private const int AnswersVersion = 2;
    private const string Change = "change";
    private const string LastQuestion = "dailyMinutes";
    private static readonly Dictionary<string, string[]> Options = new()
    {
        [Change] = ["reduce-scrolling", "intentional-phone", "offline-time", "focus-objective"],
        ["apps"] = ["instagram", "tiktok", "youtube", "facebook", "other"],
        ["dailyScroll"] = ["under-60", "60-120", "120-240", "over-240", "unsure"],
        ["moments"] = ["before-bed", "morning", "study-work", "bored", "unsure"],
        ["makeTimeFor"] = ["walking-sports", "reading-learning", "drawing-creativity", "friends-family", "hobbies", "other"],
        [LastQuestion] = ["5", "10", "15", "20"]
    };

    [HttpGet]
    public async Task<ActionResult<QuickSetupState>> Read(CancellationToken ct)
    {
        var actor = await FindActor(ct);
        if (actor is null) return Unauthorized();
        var profile = await db.Set<IndividualProfile>().AsNoTracking()
            .SingleOrDefaultAsync(profile => profile.PersonId == actor.PersonId, ct);
        if (profile is null) return NotFound();
        return State(profile, actor, antiforgery.GetAndStoreTokens(HttpContext).RequestToken);
    }

    [HttpPost("start")]
    public Task<ActionResult<QuickSetupState>> Start(CancellationToken ct) =>
        Update((profile, _, now) =>
        {
            if (!SetupComplete(profile)) profile.OnboardingStage = "QuickSetup";
            profile.JourneyStartedAtUtc ??= now;
            return null;
        }, ct);

    [HttpPut("answers")]
    [RequestSizeLimit(4096)]
    public async Task<ActionResult<QuickSetupState>> Save(QuickSetupAnswer input, CancellationToken ct)
    {
        if (!TryNormalize(input.Question, input.Answer, out var value))
            return BadRequest("Choose an approved answer for this question.");
        if (input.Finish && input.Question != LastQuestion)
            return BadRequest("Finish on the last question.");

        return await Update((profile, actor, now) =>
        {
            var answers = profile.SetupAnswersVersion == AnswersVersion && profile.SetupAnswersJson is not null
                ? JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(profile.SetupAnswersJson)!
                : new Dictionary<string, JsonElement>();
            var changed = !answers.TryGetValue(input.Question, out var previous) || !JsonElement.DeepEquals(previous, value);
            answers[input.Question] = value;
            if (input.Finish && !Options.Keys.All(question =>
                    answers.TryGetValue(question, out var answer) && TryNormalize(question, answer, out _)))
                return "Answer all six questions before finishing Quick Setup.";

            var beforeStage = profile.OnboardingStage;
            if (!SetupComplete(profile)) profile.OnboardingStage = input.Finish ? "Story" : "QuickSetup";
            profile.JourneyStartedAtUtc ??= now;

            if (changed)
            {
                if (profile.SetupAnswersJson is not null)
                {
                    db.Set<AuditEvent>().Add(new AuditEvent
                    {
                        ActorPersonId = actor.PersonId,
                        ActorCapacity = "Individual",
                        ResourceKind = nameof(IndividualProfile),
                        ResourceId = profile.Id,
                        Action = "QuickSetupAnswersUpdated",
                        BeforeStatus = beforeStage,
                        AfterStatus = profile.OnboardingStage,
                        DetailJson = JsonSerializer.Serialize(new
                        {
                            previousAnswersVersion = profile.SetupAnswersVersion,
                            previousAnswers = JsonSerializer.Deserialize<JsonElement>(profile.SetupAnswersJson)
                        }),
                        AtUtc = now,
                        CreatedAtUtc = now
                    });
                }
                profile.SetupAnswersJson = JsonSerializer.Serialize(answers);
                profile.SetupAnswersVersion = AnswersVersion;
                if (answers.TryGetValue(Change, out var goal)) profile.GoalCode = goal.GetString();
            }
            return null;
        }, ct);
    }

    [HttpPost("home")]
    public Task<ActionResult<QuickSetupState>> ArriveHome(CancellationToken ct) =>
        Update((profile, _, now) =>
        {
            if (profile.OnboardingStage == "Story")
            {
                profile.OnboardingStage = "Home";
                profile.OnboardingCompletedAtUtc ??= now;
            }
            return null;
        }, ct);

    private async Task<ActionResult<QuickSetupState>> Update(
        Func<IndividualProfile, Actor, DateTime, string?> update, CancellationToken ct)
    {
        var actor = await FindActor(ct);
        if (actor is null) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Serialize this person's writes so the audit always captures the actual prior answers.
        var profile = await db.Set<IndividualProfile>()
            .FromSqlInterpolated($"SELECT * FROM [personal].[IndividualProfile] WITH (UPDLOCK) WHERE [PersonId] = {actor.PersonId}")
            .SingleOrDefaultAsync(ct);
        if (profile is null) return NotFound();
        var error = update(profile, actor, clock.GetUtcNow().UtcDateTime);
        if (error is not null) return BadRequest(error);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return State(profile, actor);
    }

    private Task<Actor?> FindActor(CancellationToken ct)
    {
        if (!long.TryParse(User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var userId))
            return Task.FromResult<Actor?>(null);
        return (from user in db.Set<ApplicationUser>()
                join person in db.Set<Person>() on user.PersonId equals person.Id
                where user.Id == userId && person.Status == "Active"
                select new Actor(person.Id, person.PublicId, person.DisplayName, user.Email ?? "")).SingleOrDefaultAsync(ct);
    }

    private static QuickSetupState State(IndividualProfile profile, Actor actor, string? requestToken = null) =>
        new($"server-{actor.PublicId:N}", actor.DisplayName, actor.Email, profile.OnboardingStage, profile.JourneyLevel,
            profile.SetupAnswersVersion, profile.SetupAnswersJson is null
                ? null : JsonSerializer.Deserialize<JsonElement>(profile.SetupAnswersJson),
            SetupComplete(profile), requestToken);

    internal static bool SetupComplete(IndividualProfile profile) =>
        profile.OnboardingCompletedAtUtc.HasValue || profile.OnboardingStage is "Story" or "Home" or "Activated" or "TourDone";

    internal static JsonElement? CompletedAnswers(IndividualProfile profile)
    {
        if (!SetupComplete(profile) || profile.SetupAnswersVersion != AnswersVersion || profile.SetupAnswersJson is null)
            return null;
        var answers = JsonSerializer.Deserialize<JsonElement>(profile.SetupAnswersJson);
        return answers.ValueKind == JsonValueKind.Object && Options.Keys.All(question =>
            answers.TryGetProperty(question, out var value) && TryNormalize(question, value, out _))
            ? answers : null;
    }

    private static bool TryNormalize(string question, JsonElement answer, out JsonElement normalized)
    {
        normalized = answer;
        if (string.IsNullOrEmpty(question) || !Options.TryGetValue(question, out var options)) return false;
        if (question is not ("apps" or "makeTimeFor"))
            return answer.ValueKind == JsonValueKind.String && options.Contains(answer.GetString());
        if (answer.ValueKind != JsonValueKind.Array || answer.GetArrayLength() == 0 ||
            answer.GetArrayLength() > options.Length) return false;

        var selected = new HashSet<string>();
        foreach (var item in answer.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.String) return false;
            var option = item.GetString()!;
            if (!options.Contains(option) || !selected.Add(option)) return false;
        }
        normalized = JsonSerializer.SerializeToElement(options.Where(selected.Contains));
        return true;
    }

    private sealed record Actor(long PersonId, Guid PublicId, string DisplayName, string Email);
}
