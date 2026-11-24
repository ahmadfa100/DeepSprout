using System.Globalization;
using System.Net.Mail;
using System.Text.Json;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/institutions")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class InstitutionsController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    private const string ApprovalBlocked = "Approval is unavailable until email ownership and Institution evidence can be verified under an approved policy.";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly string[] Required = ["entityName", "institutionType", "sector", "founded",
        "registrationNumber", "issuingAuthority", "description", "country", "governorate", "city",
        "officialEmail", "phone", "representative", "position", "repPhone", "authority"];
    private static readonly string[] Optional = ["parentBody", "goals", "size", "areasServed", "address", "website", "social"];
    private static readonly HashSet<string> Audiences = ["Under 12", "12–14", "15–17", "18–24", "25 and older", "Parents & educators"];
    private static readonly HashSet<string> Types = ["School", "University / college", "Youth center", "Public library",
        "Non-profit / NGO", "Community center", "Sports club", "Cultural center", "Training center", "Other"];
    private static readonly HashSet<string> Sectors = ["Government / public", "Private", "Non-profit / civil society",
        "Semi-government", "International organization", "Community or volunteer group"];
    private IQueryable<VerificationCase> Cases => db.Set<VerificationCase>().Where(row => row.Kind == "Institution");

    public sealed record ApplicationInput(Guid RequestId, Dictionary<string, string?>? Fields, string[]? AudienceAges,
        bool Declaration, string? ExpectedVersion);
    public sealed record DecisionInput(string? Decision, string? Reason, string? Version);
    private sealed record Claim(Dictionary<string, string> Fields, string[] AudienceAges, DateTime DeclaredAtUtc);

    [HttpGet("applications")]
    public async Task<IActionResult> MyApplications(CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var rows = await Cases.AsNoTracking().Where(row => row.ApplicantPersonId == actor)
            .OrderByDescending(row => row.Id).ToListAsync(ct);
        return Ok(rows.Select(Summary));
    }

    [HttpGet("applications/{id:guid}")]
    public async Task<IActionResult> MyApplication(Guid id, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var row = await Cases.AsNoTracking().SingleOrDefaultAsync(x => x.PublicId == id && x.ApplicantPersonId == actor, ct);
        return row is null ? NotFound() : Ok(await Detail(row, showAdminNames: false, ct));
    }

    [HttpPost("applications")]
    [RequestSizeLimit(49152)]
    public Task<IActionResult> Submit(ApplicationInput input, CancellationToken ct) => Save(null, input, ct);

    [HttpPut("applications/{id:guid}")]
    [RequestSizeLimit(49152)]
    public Task<IActionResult> Resubmit(Guid id, ApplicationInput input, CancellationToken ct) => Save(id, input, ct);

    private async Task<IActionResult> Save(Guid? id, ApplicationInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var error = Validate(input, now, out var claim);
        if (error is not null) return BadRequest(error);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var person = await LockPerson(actor, ct);
        if (person is not { Status: "Active" }) return Unauthorized();
        var own = Cases.Where(row => row.ApplicantPersonId == actor);
        var row = id is { } existingId
            ? await LockCase(existingId).SingleOrDefaultAsync(x => x.ApplicantPersonId == actor, ct)
            : null;
        var before = row?.Status;
        if (id.HasValue)
        {
            if (row is null) return NotFound();
            if (row.Status == "Submitted" && SameClaim(ReadClaim(row), claim)) return Ok(Summary(row));
            if (row.Status != "MoreInfo" || input.ExpectedVersion != Convert.ToBase64String(row.RowVersion))
                return Conflict("This application changed. Open its current status before editing.");
        }
        else
        {
            // Serializing on the Person prevents two submissions from creating duplicate cases.
            var existing = await db.Set<VerificationCase>().AsNoTracking().SingleOrDefaultAsync(x => x.PublicId == input.RequestId, ct);
            if (existing is not null)
                return existing.ApplicantPersonId == actor && existing.Kind == "Institution" && SameClaim(ReadClaim(existing), claim)
                    ? Ok(Summary(existing)) : Conflict("This submission reference is already in use.");
        }
        var rowId = row?.Id ?? 0;
        var candidates = await own.AsNoTracking().Where(x => x.Id != rowId && x.Status != "Rejected").ToListAsync(ct);
        if (candidates.Any(x => SameInstitution(ReadClaim(x), claim)))
            return Conflict("An application for this Institution already exists. Open its status to continue.");

        var org = row is null ? new Organization { Kind = "Institution", Status = "Applied", CreatedAtUtc = now }
            : await db.Set<Organization>().SingleAsync(x => x.Id == row.OrganizationId, ct);
        if (org.Status != "Applied") return Conflict("This Institution cannot receive application updates.");
        org.Name = claim.Fields["entityName"];
        org.CountryCode = claim.Fields["country"];
        org.HeadquartersCity = claim.Fields["city"];
        org.OfficialContactEmail = claim.Fields["officialEmail"];
        // Keep the representative's direct contact and declarations in the private verification case.
        org.ProfileJson = JsonSerializer.Serialize(claim.Fields.Where(item =>
            item.Key is "institutionType" or "sector" or "description" or "website").ToDictionary(), Json);
        if (row is null)
        {
            db.Add(org);
            await db.SaveChangesAsync(ct);
            row = new VerificationCase { PublicId = input.RequestId, Kind = "Institution", OrganizationId = org.Id,
                ApplicantPersonId = actor, CreatedAtUtc = now };
            db.Add(row);
        }
        var previousClaim = row.ClaimJson;
        row.Status = "Submitted";
        row.ClaimJson = JsonSerializer.Serialize(claim, Json);
        row.SubmittedAtUtc = now;
        row.DecidedByPersonId = null;
        row.DecidedAtUtc = null;
        row.DecisionReason = null;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        { return Conflict("This submission reference is already in use."); }
        AddAudit(row, actor, "Individual", before, id.HasValue ? "Resubmitted" : "Submitted", null,
            previousClaim, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(Summary(row));
    }

    [HttpGet("verification")]
    public async Task<IActionResult> Queue([FromQuery] bool decided, [FromQuery] int page, CancellationToken ct)
    {
        if (await PersonalRecords.PlatformAdminId(db, User, ct) is null) return Forbid();
        if (page < 0 || page > 10000) return BadRequest("Invalid page.");
        var cases = Cases.AsNoTracking().Where(row => decided
            ? row.Status != "Submitted" && row.Status != "MoreInfo"
            : row.Status == "Submitted" || row.Status == "MoreInfo");
        var rows = await (from row in cases
                          join person in db.Set<Person>() on row.ApplicantPersonId equals person.Id
                          orderby row.Id descending
                          select new { Case = row, ApplicantName = person.DisplayName })
            .Skip(page * 30).Take(31).ToListAsync(ct);
        return Ok(new { items = rows.Take(30).Select(row => QueueItem(row.Case, row.ApplicantName)),
            hasMore = rows.Count > 30 });
    }

    [HttpGet("verification/{id:guid}")]
    public async Task<IActionResult> Review(Guid id, CancellationToken ct)
    {
        if (await PersonalRecords.PlatformAdminId(db, User, ct) is null) return Forbid();
        var row = await Cases.AsNoTracking().SingleOrDefaultAsync(x => x.PublicId == id, ct);
        if (row is null) return NotFound();
        var person = await db.Set<Person>().AsNoTracking().SingleAsync(x => x.Id == row.ApplicantPersonId, ct);
        var user = await db.Set<ApplicationUser>().AsNoTracking().SingleOrDefaultAsync(x => x.PersonId == person.Id, ct);
        return Ok(new { application = await Detail(row, showAdminNames: true, ct), applicant = new { name = person.DisplayName,
            person.Status, email = user?.Email, verified = user?.EmailConfirmed == true }, approvalBlocked = ApprovalBlocked });
    }

    [HttpPost("verification/{id:guid}")]
    public async Task<IActionResult> Decide(Guid id, DecisionInput input, CancellationToken ct)
    {
        if (await PersonalRecords.PlatformAdminId(db, User, ct) is not { } actor) return Forbid();
        if (input.Decision is not ("Approved" or "Rejected" or "MoreInfo") ||
            string.IsNullOrWhiteSpace(input.Reason) || input.Reason.Length > 1000)
            return BadRequest("Choose a decision and provide a reason of up to 1,000 characters.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await LockPerson(actor, ct) is not { PlatformRole: "Admin", Status: "Active" }) return Forbid();
        var row = await LockCase(id).SingleOrDefaultAsync(ct);
        if (row is null) return NotFound();
        if (row.ApplicantPersonId == actor) return Forbid();
        if (input.Version != Convert.ToBase64String(row.RowVersion) || row.Status is not ("Submitted" or "MoreInfo") ||
            row.Status == input.Decision)
            return Conflict("The application has already changed. Reload it before making a decision.");

        if (input.Decision == "Approved") return Conflict(ApprovalBlocked);
        var org = await db.Set<Organization>().SingleAsync(x => x.Id == row.OrganizationId, ct);
        if (org.Status != "Applied") return Conflict("This Institution is no longer awaiting verification.");
        var now = PersonalRecords.Now(clock);
        var before = row.Status;
        row.Status = input.Decision;
        row.DecidedByPersonId = actor;
        row.DecidedAtUtc = now;
        row.DecisionReason = input.Reason.Trim();
        if (row.Status == "Rejected") org.Status = "Closed";
        AddAudit(row, actor, "Admin", before, "Decision", row.DecisionReason, null, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(Summary(row));
    }

    [HttpGet("mine")]
    [HttpGet("mine/{id:guid}")]
    public async Task<IActionResult> MyInstitutions(Guid? id, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var members = from membership in db.Set<OrganizationMember>().AsNoTracking()
                      join org in db.Set<Organization>().AsNoTracking() on membership.OrganizationId equals org.Id
                      where membership.PersonId == actor && membership.Status == "Active" && membership.RevokedAtUtc == null &&
                        org.Kind == "Institution" && org.Status == "Verified" &&
                        db.Set<ApplicationUser>().Any(user => user.PersonId == actor && user.EmailConfirmed)
                      select org;
        if (id.HasValue)
        {
            var org = await members.SingleOrDefaultAsync(x => x.PublicId == id, ct);
            return org is null ? NotFound() : Ok(InstitutionView(org));
        }
        return Ok((await members.OrderBy(x => x.Name).ToListAsync(ct)).Select(InstitutionView));
    }

    private static object InstitutionView(Organization org) => new { id = org.PublicId, org.Name, org.Status,
        org.CountryCode, org.HeadquartersCity, org.OfficialContactEmail };

    private Task<Person?> LockPerson(long id, CancellationToken ct) => db.Set<Person>()
        .FromSqlInterpolated($"SELECT * FROM [iam].[Person] WITH (UPDLOCK) WHERE [Id] = {id}").SingleOrDefaultAsync(ct);

    private IQueryable<VerificationCase> LockCase(Guid id) => db.Set<VerificationCase>()
        .FromSqlInterpolated($"SELECT * FROM [org].[VerificationCase] WITH (UPDLOCK) WHERE [PublicId] = {id} AND [Kind] = 'Institution'");

    private object Summary(VerificationCase row) => new { id = row.PublicId, row.Status,
        name = ReadClaim(row)?.Fields.GetValueOrDefault("entityName") ?? "Institution application",
        row.SubmittedAtUtc, row.DecidedAtUtc, row.DecisionReason, version = Convert.ToBase64String(row.RowVersion) };

    private object QueueItem(VerificationCase row, string applicantName)
    {
        var fields = ReadClaim(row)?.Fields;
        return new { summary = Summary(row), applicantName, details = new {
            institutionType = fields?.GetValueOrDefault("institutionType"),
            sector = fields?.GetValueOrDefault("sector"),
            city = fields?.GetValueOrDefault("city"),
            description = fields?.GetValueOrDefault("description"),
            position = fields?.GetValueOrDefault("position")
        } };
    }

    private async Task<object> Detail(VerificationCase row, bool showAdminNames, CancellationToken ct)
    {
        var history = await (from audit in db.Set<AuditEvent>().AsNoTracking()
            join person in db.Set<Person>() on audit.ActorPersonId equals (long?)person.Id into actors
            from person in actors.DefaultIfEmpty()
            where audit.ResourceKind == "org.VerificationCase" && audit.ResourceId == row.Id
            orderby audit.Id
            select new { audit.Action, audit.BeforeStatus, audit.AfterStatus, audit.Reason, audit.AtUtc,
                actor = !showAdminNames && audit.ActorCapacity == "Admin" ? "Platform Admin" :
                    person == null ? null : person.DisplayName }).ToListAsync(ct);
        var organizationStatus = await db.Set<Organization>().Where(x => x.Id == row.OrganizationId)
            .Select(x => x.Status).SingleAsync(ct);
        return new { summary = Summary(row), claim = ReadClaim(row), organizationStatus, history };
    }

    private void AddAudit(VerificationCase row, long actor, string capacity, string? before, string action,
        string? reason, string? previousClaim, DateTime now) => db.Add(new AuditEvent {
        ActorPersonId = actor, ActorCapacity = capacity, ResourceKind = "org.VerificationCase", ResourceId = row.Id,
        Action = action, BeforeStatus = before, AfterStatus = row.Status, Reason = reason, DetailJson = previousClaim,
        AtUtc = now, CreatedAtUtc = now
    });

    private static Claim? ReadClaim(VerificationCase row)
    {
        try { return JsonSerializer.Deserialize<Claim>(row.ClaimJson, Json) is { Fields: not null, AudienceAges: not null } claim ? claim : null; }
        catch (JsonException) { return null; }
    }

    private static bool SameInstitution(Claim? saved, Claim next) => saved is not null &&
        new[] { "country", "registrationNumber", "issuingAuthority" }.All(key =>
            string.Equals(saved.Fields.GetValueOrDefault(key), next.Fields[key], StringComparison.OrdinalIgnoreCase));

    private static bool SameClaim(Claim? saved, Claim next) => saved is not null &&
        saved.Fields.Count == next.Fields.Count && next.Fields.All(field => saved.Fields.GetValueOrDefault(field.Key) == field.Value) &&
        saved.AudienceAges.Order(StringComparer.Ordinal).SequenceEqual(next.AudienceAges.Order(StringComparer.Ordinal));

    private static string? Validate(ApplicationInput input, DateTime now, out Claim claim)
    {
        var fields = new Dictionary<string, string>();
        var ages = input.AudienceAges ?? [];
        claim = new Claim(fields, ages, now);
        if (input.RequestId == Guid.Empty || !input.Declaration || input.Fields is null)
            return "Complete the application and confirm the declaration.";
        foreach (var key in Required.Concat(Optional))
        {
            var value = input.Fields.GetValueOrDefault(key)?.Trim() ?? "";
            var max = key switch { "description" or "goals" => 2000, "officialEmail" => 254,
                "entityName" or "city" => 120, "phone" or "repPhone" => 40, _ => 200 };
            if (value.Length > max || (Required.Contains(key) && value.Length == 0))
                return $"Check the {key} field. The maximum is {max} characters.";
            if (value.Length > 0) fields[key] = value;
        }

        var country = fields["country"].ToUpperInvariant();
        if (country.Length != 2 || !CultureInfo.GetCultures(CultureTypes.SpecificCultures)
            .Any(culture => new RegionInfo(culture.Name).TwoLetterISORegionName == country))
            return "Enter a two-letter country code, for example JO.";
        fields["country"] = country;
        if (!MailAddress.TryCreate(fields["officialEmail"], out var email) || email.Address != fields["officialEmail"])
            return "Enter a valid official email.";
        if (!int.TryParse(fields["founded"], out var year) || year < 1900 || year > now.Year)
            return "Enter a valid year founded.";
        if (!Types.Contains(fields["institutionType"]) || !Sectors.Contains(fields["sector"]))
            return "Choose an Institution type and sector.";
        if (fields["authority"] is not ("head" or "appointed" or "letter" or "delegated") ||
            ages.Length == 0 || ages.Length > Audiences.Count || ages.Distinct().Count() != ages.Length ||
            ages.Any(age => !Audiences.Contains(age)))
            return "Choose a valid Representative authority and at least one audience.";
        return null;
    }
}
