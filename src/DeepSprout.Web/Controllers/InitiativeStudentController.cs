using System.Data;
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;
using DeepSprout.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Web.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/initiative-student")]
public sealed class InitiativeStudentController(DeepSproutV5DbContext db, TimeProvider clock) : ControllerBase
{
    public sealed record UpgradeInput(bool AcceptTerms);

    [HttpGet]
    public async Task<IActionResult> Mine([FromQuery] Guid? initiative, CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        var person = await db.Set<Person>().AsNoTracking().SingleOrDefaultAsync(row => row.Id == actor && row.Status == "Active", ct);
        if (person is null) return Unauthorized();
        var now = PersonalRecords.Now(clock);
        var eligible = InitiativeStaffAccess.EligibleInitiatives(db, now);
        var applications = await (from application in db.Set<InitiativeApplication>().AsNoTracking()
                                  join parent in db.Set<Initiative>() on application.InitiativeId equals parent.Id
                                  join terms in db.Set<InitiativeRevision>()
                                     on new { Id = application.TermsRevisionId, application.InitiativeId }
                                     equals new { Id = terms.Id, terms.InitiativeId }
                                  join institution in db.Set<Organization>() on parent.InstitutionId equals institution.Id
                                  where application.PersonId == actor && (application.AcceptedAtUtc != null ||
                                      application.Status == "Accepted" || application.Status == "Suspended")
                                  orderby application.Id descending
                                  select new { application.Id, application.InitiativeId, applicationId = application.PublicId,
                                      initiativeId = parent.PublicId, terms.Title, organizer = institution.Name, application.Status,
                                      canAccess = application.Status == "Accepted" && eligible.Any(row => row.Id == parent.Id) }).ToListAsync(ct);
        var selected = initiative is Guid id ? applications.FirstOrDefault(row => row.initiativeId == id) :
            applications.Find(row => row.canAccess) ?? applications.FirstOrDefault();
        if (initiative.HasValue && selected is null) return NotFound();
        var stage = await db.Set<IndividualProfile>().Where(row => row.PersonId == actor).Select(row => row.OnboardingStage)
            .SingleOrDefaultAsync(ct);
        var admittedIds = applications.Where(row => row.initiativeId == selected?.initiativeId).Select(row => (long?)row.Id).ToArray();
        var placements = selected is null ? null : await (from placement in InitiativeGroupRecords.Placements(db, selected.InitiativeId)
                                                          join team in db.Set<OperationalGroup>() on placement.GroupId equals team.Id
                                                          where admittedIds.Contains(placement.ApplicationId) && placement.PersonId == actor &&
                                                            (placement.Status == "Active" || placement.Status == "Ended" || placement.Status == "Revoked")
                                                          orderby placement.Id descending
                                                          select new { placement.GroupId, placement.ApplicationId, groupId = team.PublicId, name = team.Name,
                                                            placement.Status, placement.StartedAtUtc, placement.EndedAtUtc, placement.EndReason }).ToListAsync(ct);
        object? group = null;
        if (selected?.canAccess == true && placements?.Find(row => row.ApplicationId == selected.Id &&
                row.Status == "Active" && row.EndedAtUtc == null) is { } current)
        {
            group = await InitiativeGroupRecords.Groups(db, selected.InitiativeId).Where(team => team.Id == current.GroupId &&
                team.Status != "Archived" && eligible.Any(parent => parent.Id == team.InitiativeId) &&
                InitiativeGroupRecords.CurrentStudents(db, selected.InitiativeId)
                    .Any(row => row.GroupId == team.Id && row.ApplicationId == selected.Id && row.PersonId == actor))
                .Select(team => new { id = team.PublicId, team.Name, team.Description, team.Status,
                    memberCount = InitiativeGroupRecords.CurrentStudents(db, selected.InitiativeId).Count(row => row.GroupId == team.Id),
                    coach = (from appointment in InitiativeStaffAccess.Active(db, "Coach", now)
                             join coachPerson in db.Set<Person>() on appointment.PersonId equals (long?)coachPerson.Id
                             where appointment.Id == team.CoachStaffAppointmentId && appointment.PersonId == team.CoachPersonId &&
                                 appointment.InitiativeId == team.InitiativeId select coachPerson.DisplayName).FirstOrDefault() }).SingleOrDefaultAsync(ct);
        }
        var enabled = person.IndividualEnabledAtUtc.HasValue && stage is not null;
        var canUpgrade = selected?.canAccess == true && await db.Set<ApplicationUser>().AnyAsync(row => row.PersonId == actor && row.EmailConfirmed, ct);
        return Ok(new
        {
            personId = person.PublicId, person.DisplayName, individualEnabled = enabled,
            canUpgrade, individualUrl = enabled ? Destination(stage) : null,
            memberships = applications.Select(row => new { row.initiativeId, row.applicationId, row.Title, row.organizer, row.Status, row.canAccess }),
            selected = selected is null ? null : new { selected.initiativeId, selected.applicationId, selected.Title, selected.organizer,
                selected.Status, selected.canAccess },
            group,
            history = placements?.Select(row => new { row.groupId, row.name, row.Status,
                startedAtUtc = Utc(row.StartedAtUtc), endedAtUtc = Utc(row.EndedAtUtc), row.EndReason })
        });
    }

    [HttpPost("{initiativeId:guid}/upgrade")]
    public async Task<IActionResult> Upgrade(Guid initiativeId, UpgradeInput input, CancellationToken ct)
    {
        if (!input.AcceptTerms) return BadRequest("Agree to the Terms of Service and Privacy Policy to enable Individual access.");
        if (await PersonalRecords.PersonId(db, User, ct) is not { } actor) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var initiative = await InitiativeTerms.Lock(db, initiativeId).AsNoTracking().SingleOrDefaultAsync(row => row.PublicId == initiativeId, ct);
        var now = PersonalRecords.Now(clock);
        if (initiative is null || !await InitiativeStaffAccess.EligibleInitiatives(db, now).AnyAsync(row => row.Id == initiative.Id, ct))
            return NotFound();
        var application = await db.Set<InitiativeApplication>().AsNoTracking().SingleOrDefaultAsync(row =>
            row.InitiativeId == initiative.Id && row.PersonId == actor && row.Status == "Accepted", ct);
        if (application is null) return NotFound();
        var person = await db.Set<Person>().FromSqlInterpolated($"SELECT * FROM [iam].[Person] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {actor}")
            .SingleOrDefaultAsync(row => row.Status == "Active", ct);
        if (person is null) return Unauthorized();
        var profile = await PersonalRecords.Lock(db, actor, ct);
        if (person.IndividualEnabledAtUtc.HasValue && profile is not null) return Ok(new { url = Destination(profile.OnboardingStage) });
        if (!await db.Set<ApplicationUser>().AnyAsync(row => row.PersonId == actor && row.EmailConfirmed, ct))
            return StatusCode(StatusCodes.Status403Forbidden, "Individual access requires an already confirmed account email.");

        var terms = await db.Set<ConsentRecord>().AsNoTracking().Where(row => row.PersonId == actor && row.PurposeCode == PersonalRecords.TermsPurpose)
            .OrderByDescending(row => row.DecidedAtUtc).FirstOrDefaultAsync(ct);
        if (terms?.Decision != "Accepted" || terms.NoticeVersion != PersonalRecords.TermsNotice)
            db.Add(PersonalRecords.AcceptTerms(actor, now));
        if (profile is null)
        {
            profile = PersonalRecords.NewProfile(actor, now);
            db.Add(profile);
        }
        person.IndividualEnabledAtUtc ??= now;
        db.Add(PersonalRecords.Audit(actor, "iam.Person", actor, "IndividualEnabledFromStudent",
            new { initiativeId, applicationId = application.PublicId }, now));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { url = Destination(profile.OnboardingStage) });
    }

    private static string Destination(string? stage) => PersonalRecords.NeedsOnboarding(stage) ?
        PersonalRecords.OnboardingPath : PersonalRecords.HomePath;
    private static DateTime? Utc(DateTime? value) => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null;
}
