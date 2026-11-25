using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/initiative-applications")]
public sealed class InitiativeApplicationsController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    private const string Resource = "institution.InitiativeApplication";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly string[] Statuses = ["Pending", "Queued", "Offered", "Accepted", "Suspended",
        "Rejected", "Withdrawn", "OfferDeclined", "OfferExpired", "Removed", "Completed", "Cancelled", "Blocked", "BlockLifted"];
    private static readonly string[] CannotReapply = ["Pending", "Queued", "Offered", "Accepted", "Suspended", "Blocked", "Completed"];
    private static readonly string[] CanWithdraw = ["Pending", "Queued", "Offered", "Accepted", "Suspended"];

    public sealed record ApplyInput(Guid RequestId, int Revision, [Range(1, 120)] int Age, string? Mode,
        [MaxLength(400)] string? Motivation, bool Consent, bool MeetsRequirements);
    public sealed record DecisionInput(string? Version, [MaxLength(800)] string? Reason);
    private sealed record Answers(int Age, string? Motivation, bool MeetsRequirements);
    private sealed class ApplicationRow
    {
        public required InitiativeApplication Application { get; init; }
        public required Initiative Initiative { get; init; }
        public required InitiativeRevision Terms { get; init; }
        public required string Organizer { get; init; }
        public required string ApplicantName { get; init; }
    }

    private IQueryable<ApplicationRow> Rows() =>
        from application in db.Set<InitiativeApplication>().AsNoTracking()
        join initiative in db.Set<Initiative>().AsNoTracking() on application.InitiativeId equals initiative.Id
        join terms in db.Set<InitiativeRevision>().AsNoTracking()
            on new { Id = application.TermsRevisionId, application.InitiativeId } equals new { terms.Id, terms.InitiativeId }
        join institution in db.Set<Organization>().AsNoTracking() on initiative.InstitutionId equals institution.Id
        join person in db.Set<Person>().AsNoTracking() on application.PersonId equals person.Id
        select new ApplicationRow
        {
            Application = application, Initiative = initiative, Terms = terms,
            Organizer = institution.Name, ApplicantName = person.DisplayName
        };

    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] Guid? initiative, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var rows = await Rows().Where(row => row.Application.PersonId == actor &&
                (!initiative.HasValue || row.Initiative.PublicId == initiative.Value))
            .OrderByDescending(row => row.Application.Id).ToListAsync(ct);
        return Ok(rows.Select(row => Summary(row, PersonalRecords.Now(clock))));
    }

    [HttpGet("mine/{id:guid}")]
    public async Task<IActionResult> MyDetail(Guid id, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var row = await Rows().SingleOrDefaultAsync(item => item.Application.PublicId == id && item.Application.PersonId == actor, ct);
        if (row is null) return NotFound();
        return Ok(await Detail(row, representative: false, ct));
    }

    [HttpGet("owned/{initiativeId:guid}")]
    public async Task<IActionResult> Owned(Guid initiativeId, [FromQuery] string[] status, CancellationToken ct)
    {
        if (status.Any(value => !Statuses.Contains(value))) return BadRequest("Choose a supported application status.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var initiative = await db.Set<Initiative>().AsNoTracking().SingleOrDefaultAsync(item => item.PublicId == initiativeId &&
            InstitutionAccess.VerifiedInstitutions(db, actor).Any(org => org.Id == item.InstitutionId), ct);
        if (initiative is null) return NotFound();
        var applications = Rows().Where(row => row.Application.InitiativeId == initiative.Id &&
            InstitutionAccess.VerifiedInstitutions(db, actor).Any(org => org.Id == row.Initiative.InstitutionId));
        if (status.Length > 0) applications = applications.Where(row => status.Contains(row.Application.Status));
        var rows = await applications.OrderBy(row => row.Application.QueuedAtUtc ?? row.Application.SubmittedAtUtc)
            .ThenBy(row => row.Application.Id).ToListAsync(ct);
        var now = PersonalRecords.Now(clock);
        return Ok(rows.Select(row => new { application = Summary(row, now, actor), row.ApplicantName }));
    }

    [HttpGet("owned/{initiativeId:guid}/{id:guid}")]
    public async Task<IActionResult> OwnedDetail(Guid initiativeId, Guid id, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var row = await Rows().SingleOrDefaultAsync(item => item.Application.PublicId == id && item.Initiative.PublicId == initiativeId &&
            InstitutionAccess.VerifiedInstitutions(db, actor).Any(org => org.Id == item.Initiative.InstitutionId), ct);
        if (row is null) return NotFound();
        return Ok(await Detail(row, representative: true, ct));
    }

    [HttpPost("{initiativeId:guid}/apply")]
    public async Task<IActionResult> Apply(Guid initiativeId, ApplyInput input, CancellationToken ct)
    {
        if (input.RequestId == Guid.Empty) return BadRequest("Reload the application form before submitting.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await InitiativeTerms.Lock(db, initiativeId).AsNoTracking().SingleOrDefaultAsync(ct);
        if (initiative is null) return NotFound();
        var person = await db.Set<Person>().AsNoTracking().SingleOrDefaultAsync(item => item.Id == actor &&
            item.Status == "Active" && item.IndividualEnabledAtUtc != null, ct);
        if (person is null) return Forbid();

        var attempts = db.Set<InitiativeApplication>().Where(item => item.InitiativeId == initiative.Id && item.PersonId == actor);
        var retry = await attempts.AsNoTracking().SingleOrDefaultAsync(item => item.PublicId == input.RequestId, ct);
        if (retry is not null) return Ok(Result(retry));
        if (!await db.Set<Organization>().AnyAsync(item => item.Id == initiative.InstitutionId &&
            item.Kind == "Institution" && item.Status == "Verified", ct)) return NotFound();
        var terms = await CurrentTerms(initiative, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative.Status != "Published" || terms is null || terms.EndsAtUtc <= now ||
            terms.ApplicationOpensAtUtc > now || terms.ApplicationClosesAtUtc <= now)
            return Conflict("Applications are closed for this Initiative.");
        if (terms.RevisionNo != input.Revision) return Conflict("The published terms changed. Reopen the Initiative and review them.");
        if (!input.Consent || !input.MeetsRequirements) return BadRequest("Confirm the eligibility requirements and participation consent.");
        if (string.IsNullOrWhiteSpace(InitiativeTerms.Read(terms.PublishedSnapshotJson)?.Consent))
            return Conflict("The published participation consent is unavailable.");
        if (EligibilityError(terms, input.Age, input.Mode) is { } error) return BadRequest(error);
        if (terms.RegistrationFormVersionId.HasValue) return Conflict("This Initiative requires a registration form that is unavailable here.");
        if (await attempts.AnyAsync(item => CannotReapply.Contains(item.Status), ct))
            return Conflict("You already have an application or cannot reapply to this Initiative.");

        var last = await attempts.MaxAsync(item => (int?)item.AttemptNo, ct) ?? 0;
        var application = new InitiativeApplication
        {
            PublicId = input.RequestId, InitiativeId = initiative.Id, PersonId = actor, AttemptNo = last + 1,
            TermsRevisionId = terms.Id, ParticipationMode = input.Mode, Status = "Pending", SubmittedAtUtc = now,
            ConsentAtUtc = now, WithdrawalCutoffAtUtc = Cutoff(terms), CreatedAtUtc = now
        };
        db.Add(application);
        try
        {
            await db.SaveChangesAsync(ct);
            // Phase 3A has a fixed apply form. Keep its answers with the submission event pinned to these terms.
            AddHistory(application, actor, "Individual", "Submitted", null, null, now,
                new Answers(input.Age, input.Motivation?.Trim(), input.MeetsRequirements));
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict("This application was already submitted or its reference is in use. Reload your applications.");
        }
        return Ok(Result(application));
    }

    [HttpPost("mine/{initiativeId:guid}/{id:guid}/withdraw")]
    public async Task<IActionResult> Withdraw(Guid initiativeId, Guid id, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await InitiativeTerms.Lock(db, initiativeId).AsNoTracking().SingleOrDefaultAsync(ct);
        if (initiative is null) return NotFound();
        if (!await db.Set<Person>().AnyAsync(item => item.Id == actor && item.Status == "Active", ct)) return Forbid();
        var application = await db.Set<InitiativeApplication>().SingleOrDefaultAsync(item =>
            item.PublicId == id && item.InitiativeId == initiative.Id && item.PersonId == actor, ct);
        if (application is null) return NotFound();
        if (application.Status == "Withdrawn") return Ok(Result(application));
        var terms = await AppliedTerms(application, ct);
        var now = PersonalRecords.Now(clock);
        if (terms is null || !WithdrawalAllowed(application, initiative, terms, now))
            return Conflict("This application cannot be withdrawn. The withdrawal deadline or an Initiative decision may have closed it.");
        var before = application.Status;
        End(application, "Withdrawn", now);
        await InitiativeGroupRecords.EndForAdmission(db, application, actor, "Individual", now, ct);
        AddHistory(application, actor, "Individual", "Withdrawn", before, "Withdrawn by the applicant.", now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(Result(application));
    }

    [HttpPost("owned/{initiativeId:guid}/{id:guid}/{decision}")]
    public async Task<IActionResult> Decide(Guid initiativeId, Guid id, string decision, DecisionInput input, CancellationToken ct)
    {
        var action = decision;
        if (action is not ("approve" or "reject" or "suspend" or "restore" or "remove" or "block"))
            return NotFound();
        var reason = string.IsNullOrWhiteSpace(input.Reason) ? null : input.Reason.Trim();
        if (action != "approve" && string.IsNullOrEmpty(reason)) return BadRequest("Give a reason for this decision.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
            var initiative = await InitiativeTerms.Lock(db, initiativeId).AsNoTracking().SingleOrDefaultAsync(ct);
            if (initiative is null || !await InstitutionAccess.VerifiedInstitutions(db, actor)
                    .AnyAsync(org => org.Id == initiative.InstitutionId, ct)) return NotFound();
            var application = await db.Set<InitiativeApplication>().SingleOrDefaultAsync(item =>
                item.InitiativeId == initiative.Id && item.PublicId == id, ct);
            if (application is null) return NotFound();
            if (application.PersonId == actor) return Forbid();
            if (Version(application) != input.Version) return Conflict("This application changed. Reload it before deciding.");
            var terms = await CurrentTerms(initiative, ct);
            var now = PersonalRecords.Now(clock);
            if (terms is null || !Operational(initiative, terms, now)) return Conflict("This Initiative is closed for admission decisions.");

            var before = application.Status;
            var after = action switch
            {
                "approve" when before is "Pending" or "Queued" => "Accepted",
                "reject" when before is "Pending" or "Queued" => "Rejected",
                "suspend" when before == "Accepted" => "Suspended",
                "restore" when before == "Suspended" => "Accepted",
                "remove" when before is "Accepted" or "Suspended" => "Removed",
                "block" when before is not ("Blocked" or "Completed" or "Cancelled" or "BlockLifted") => "Blocked",
                _ => null
            };
            if (after is null) return Conflict("This decision is unavailable for the current application status.");
            if (action == "block" && await db.Set<InitiativeApplication>().AnyAsync(item =>
                    item.InitiativeId == initiative.Id && item.PersonId == application.PersonId &&
                    item.AttemptNo > application.AttemptNo, ct))
                return Conflict("Open this applicant’s latest application before blocking.");
            if (action is "approve" or "restore")
            {
                var applicant = await db.Set<Person>().FromSqlInterpolated(
                    $"SELECT * FROM [iam].[Person] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {application.PersonId}")
                    .AsNoTracking().SingleAsync(ct);
                if (applicant.Status != "Active" || action == "approve" && applicant.IndividualEnabledAtUtc is null)
                    return Conflict("The applicant’s Individual account is inactive.");
            }
            if (action == "approve")
            {
                var appliedTerms = await AppliedTerms(application, ct);
                var answers = await SubmittedAnswers(application.Id, ct);
                if (appliedTerms is null || application.ConsentAtUtc == default ||
                    EligibilityError(appliedTerms, answers?.Age, application.ParticipationMode) is { } ||
                    answers?.MeetsRequirements == false)
                    return Conflict("The application has insufficient eligibility or consent information.");
                if (await db.Set<InitiativeApplication>().AnyAsync(item =>
                    item.PersonId == application.PersonId && (item.Status == "Accepted" || item.Status == "Suspended"), ct))
                    return Conflict("This applicant already holds an Initiative seat.");

                // All admission writes take the Initiative lock first. The count and change commit together.
                var used = await db.Set<InitiativeApplication>().CountAsync(item =>
                    item.InitiativeId == initiative.Id && (item.Status == "Accepted" || item.Status == "Suspended"), ct);
                if (used >= Math.Min(135, (int)terms.Capacity))
                {
                    if (!terms.WaitlistEnabled) return Conflict("All student seats are taken. The application stays pending review.");
                    if (before == "Queued") return Ok(Result(application));
                    after = "Queued";
                    application.QueuedAtUtc = now;
                    reason = "Eligible applicant. All student seats are taken.";
                }
                else
                {
                    application.AcceptedAtUtc = now;
                    reason ??= "Eligible applicant. Student seat assigned.";
                }
            }
            if (after is "Removed" or "Rejected" or "Blocked")
            {
                End(application, after, now);
                await InitiativeGroupRecords.EndForAdmission(db, application, actor, "Representative", now, ct);
            }
            else application.Status = after;
            AddHistory(application, actor, "Representative", action, before, reason, now);
            db.Add(new Notification
            {
                RecipientPersonId = application.PersonId, EventPublicId = Guid.NewGuid(), ResourceKind = Resource,
                ResourceId = application.Id, TemplateCode = "initiative.application.decision", Status = "Ready",
                ParamsJson = JsonSerializer.Serialize(new { application = application.PublicId, initiative = initiative.PublicId,
                    status = after, terms.Title, reason }, Json), CreatedAtUtc = now
            });
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Ok(Result(application));
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict("This application changed. Reload it before deciding.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 or 1205 })
        {
            return Conflict("The decision conflicts with another application change. Reload before trying again.");
        }
        catch (SqlException ex) when (ex.Number == 1205)
        {
            return Conflict("The decision conflicts with another application change. Reload before trying again.");
        }
    }

    private Task<InitiativeRevision?> CurrentTerms(Initiative initiative, CancellationToken ct) =>
        db.Set<InitiativeRevision>().AsNoTracking().SingleOrDefaultAsync(item => item.InitiativeId == initiative.Id &&
            item.Id == initiative.CurrentRevisionId, ct);

    private Task<InitiativeRevision?> AppliedTerms(InitiativeApplication application, CancellationToken ct) =>
        db.Set<InitiativeRevision>().AsNoTracking().SingleOrDefaultAsync(item => item.InitiativeId == application.InitiativeId &&
            item.Id == application.TermsRevisionId, ct);

    private static bool Operational(Initiative initiative, InitiativeRevision terms, DateTime now) =>
        (initiative.Status is "Published" or "RegistrationClosed") && terms.EndsAtUtc > now;

    private static DateTime Cutoff(InitiativeRevision terms) => terms.StartsAtUtc.AddDays(-5);

    private static bool WithdrawalAllowed(InitiativeApplication application, Initiative initiative, InitiativeRevision terms, DateTime now) =>
        Operational(initiative, terms, now) && CanWithdraw.Contains(application.Status) &&
        now < (application.WithdrawalCutoffAtUtc ?? Cutoff(terms));

    private static string? EligibilityError(InitiativeRevision terms, int? age, string? mode)
    {
        var draft = InitiativeTerms.Read(terms.PublishedSnapshotJson);
        if (draft?.MinAge is int min && (age is null || age < min) ||
            draft?.MaxAge is int max && (age is null || age > max))
            return "Your age does not meet the published eligibility range.";
        if (mode is not ("Online" or "InPerson") || terms.ParticipationMode != "Hybrid" && mode != terms.ParticipationMode)
            return "Choose a participation mode offered by this Initiative.";
        return null;
    }

    private static void End(InitiativeApplication application, string status, DateTime now)
    {
        application.Status = status;
        // A later block must preserve the original closure on historical attempts.
        application.EndedAtUtc ??= now;
        application.EndReason ??= status;
    }

    private void AddHistory(InitiativeApplication application, long actor, string capacity, string action,
        string? before, string? reason, DateTime now, Answers? answers = null) =>
        db.Add(new AuditEvent
        {
            ActorPersonId = actor, ActorCapacity = capacity, ResourceKind = Resource, ResourceId = application.Id,
            Action = action, BeforeStatus = before, AfterStatus = application.Status, Reason = reason,
            DetailJson = answers is null ? null : JsonSerializer.Serialize(answers, Json), AtUtc = now, CreatedAtUtc = now
        });

    private IQueryable<AuditEvent> History(long id) => db.Set<AuditEvent>().AsNoTracking()
        .Where(item => item.ResourceKind == Resource && item.ResourceId == id);

    private async Task<Answers?> SubmittedAnswers(long id, CancellationToken ct)
    {
        var json = await History(id).Where(item => item.Action == "Submitted").OrderBy(item => item.Id)
            .Select(item => item.DetailJson).FirstOrDefaultAsync(ct);
        if (json is null) return null;
        try { return JsonSerializer.Deserialize<Answers>(json, Json); }
        catch (JsonException) { return null; }
    }

    private async Task<object> Detail(ApplicationRow row, bool representative, CancellationToken ct)
    {
        var history = await (from item in History(row.Application.Id)
                             join person in db.Set<Person>() on item.ActorPersonId equals (long?)person.Id into actors
                             from person in actors.DefaultIfEmpty()
                             orderby item.Id
                             select new { item.BeforeStatus, item.AfterStatus, item.Action, item.Reason, item.ActorCapacity,
                                 actor = representative && person != null ? person.DisplayName : null, item.AtUtc }).ToListAsync(ct);
        var draft = InitiativeTerms.Read(row.Terms.PublishedSnapshotJson);
        return new { application = Summary(row, PersonalRecords.Now(clock)), row.ApplicantName,
            answers = await SubmittedAnswers(row.Application.Id, ct),
            history = history.Select(item => new { item.BeforeStatus, item.AfterStatus, item.Action, item.Reason,
                item.ActorCapacity, item.actor, atUtc = AsUtc(item.AtUtc) }), row.Terms.RevisionNo,
            consent = draft?.Consent, consentAtUtc = AsUtc(row.Application.ConsentAtUtc) };
    }

    private static string Version(InitiativeApplication application) => Convert.ToBase64String(application.RowVersion);

    private static object Result(InitiativeApplication application) =>
        new { id = application.PublicId, application.Status, version = Version(application) };

    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static object Summary(ApplicationRow row, DateTime now, long? representative = null)
    {
        var a = row.Application;
        return new { id = a.PublicId, version = Version(a), initiativeId = row.Initiative.PublicId,
            initiativeStatus = row.Initiative.Status, row.Organizer, row.Terms.Title, a.Status, a.AttemptNo,
            a.ParticipationMode, submittedAtUtc = AsUtc(a.SubmittedAtUtc),
            acceptedAtUtc = a.AcceptedAtUtc is { } accepted ? AsUtc(accepted) : (DateTime?)null,
            queuedAtUtc = a.QueuedAtUtc is { } queued ? AsUtc(queued) : (DateTime?)null,
            canDecide = representative.HasValue && representative.Value != a.PersonId,
            canWithdraw = WithdrawalAllowed(a, row.Initiative, row.Terms, now),
            withdrawalCutoffAtUtc = AsUtc(a.WithdrawalCutoffAtUtc ?? Cutoff(row.Terms)),
            operational = Operational(row.Initiative, row.Terms, now) };
    }
}
