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
[Route("api/personal-garden")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class PersonalGardenController(DeepSproutV5DbContext db, PracticeCatalog catalog, TimeProvider clock) : ControllerBase
{
    // Preserve the four-tree Garden's existing values. The legacy points-based release
    // describes a different Garden and cannot be applied to these stages.
    private static readonly GardenPolicy Policy = new([1, 3, 7, 12],
        ["Not started", "Sprout", "Sapling", "Young tree", "Full tree"], [3, 10, 21], 3, 1);

    private static readonly (string Id, string Title)[] Trees =
    [
        ("depth", "Depth Practice"),
        ("listening", "Listening & Recall"),
        ("visual-observation", "Visual Observation & Analysis"),
        ("digital-judgment", "Reasoning & Digital Judgment")
    ];

    [HttpGet]
    public async Task<ActionResult<PersonalGardenState>> Read(CancellationToken ct)
    {
        if (await PersonalRecords.PersonId(db, User, ct) is not { } personId) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        if (await PersonalRecords.Lock(db, personId, ct) is null) return NotFound();

        var now = PersonalRecords.Now(clock);
        var today = PracticeCatalog.LocalDate(now);
        var earned = (await catalog.ScoredHistory(personId, today, now, ct)).Where(item => item.Result.RewardEligible)
            .Select(item => new TreeEvidence(item.Record.Exercise!.Type,
                new GardenSource($"attempt:{item.Record.Attempt.Id}", item.Record.Date, item.Result.Title,
                    $"{item.Result.CorrectCount} of {item.Result.QuestionCount} correct", item.Result.EvidenceTier,
                    item.Result.ContentVersion)));
        var approved = await ApprovedAssignments(personId, now, ct);
        var treeEvidence = earned.Concat(approved).DistinctBy(item => item.Source.Key).ToArray();
        var trees = Trees.Select(tree =>
        {
            var sources = treeEvidence.Where(item => item.Type == tree.Id).Select(item => item.Source)
                .OrderBy(item => item.On).ThenBy(item => item.Key).ToArray();
            return new GardenTree(tree.Id, tree.Title, Policy.TreeSteps.Count(step => sources.Length >= step), sources);
        }).ToArray();

        var routineDays = await (from check in db.Set<RoutineCheckIn>().AsNoTracking()
                                join routine in db.Set<OfflineRoutine>() on check.RoutineId equals routine.Id
                                where check.PersonId == personId && routine.PersonId == personId &&
                                    check.State == "Done" && check.LocalDate <= today && check.RecordedAtUtc <= now
                                select check.LocalDate).Distinct().OrderBy(day => day).ToArrayAsync(ct);
        var flowers = Policy.FlowerAt.Where(threshold => routineDays.Length >= threshold).Select(threshold =>
            new GardenSource($"routine-flower:{threshold}", routineDays[threshold - 1], "Offline Routine",
                $"{threshold} self-reported routine days", "Self-reported")).ToArray();

        var attendance = await VerifiedAttendance(personId, now, ct);
        var rabbits = attendance.Take(Policy.MaxRabbits).Select(item =>
            new GardenSource($"attendance:{item.Id}", PracticeCatalog.LocalDate(item.RecordedAt), item.Title,
                $"{item.Status} · {item.Method}", item.Source)).ToArray();
        var birdhouses = await CampCompletions(personId, now, attendance, ct);

        await transaction.CommitAsync(ct);
        return new PersonalGardenState(trees, routineDays, flowers, rabbits, birdhouses, Policy);
    }

    private async Task<TreeEvidence[]> ApprovedAssignments(long personId, DateTime now, CancellationToken ct)
    {
        var rows = await (from recipient in db.Set<AssignmentRecipient>().AsNoTracking()
                          join assignment in db.Set<Assignment>() on recipient.AssignmentId equals assignment.Id
                          join teachingGroup in db.Set<OperationalGroup>() on assignment.GroupId equals teachingGroup.Id
                          join version in db.Set<PracticeVersion>() on assignment.PracticeVersionId equals (long?)version.Id
                          join definition in db.Set<PracticeDefinition>() on version.DefinitionId equals definition.Id
                          join submission in db.Set<SubmissionAttempt>() on recipient.Id equals submission.RecipientId
                          join decision in db.Set<ReviewDecision>() on submission.Id equals decision.AttemptId
                          where recipient.PersonId == personId && recipient.Status == "Approved" &&
                            assignment.ReviewMode == "CoachReview" && teachingGroup.InitiativeId != null &&
                            (assignment.Status == "Published" || assignment.Status == "Closed" ||
                                assignment.Status == "Cancelled" && assignment.CancelledAtUtc > decision.DecidedAtUtc) &&
                            submission.AttemptNo == recipient.LastAttemptNo && decision.Decision == "Approved" &&
                            decision.ReviewerPersonId != personId && decision.DecidedAtUtc >= submission.SubmittedAtUtc &&
                            decision.DecidedAtUtc <= now && !db.Set<ReviewDecision>().Any(next => next.SupersedesId == decision.Id) &&
                            db.Set<StaffAppointment>().Any(staff => staff.InitiativeId == teachingGroup.InitiativeId &&
                                staff.Role == "Coach" && staff.PersonId == decision.ReviewerPersonId &&
                                (staff.Id == teachingGroup.CoachStaffAppointmentId && teachingGroup.CoachAssignedAtUtc <= decision.DecidedAtUtc ||
                                    assignment.AuthorPersonId == decision.ReviewerPersonId) &&
                                (staff.Status == "Active" || staff.Status == "Revoked" && staff.EndedAtUtc != null) &&
                                staff.AcceptedAtUtc <= decision.DecidedAtUtc &&
                                (staff.EndedAtUtc == null || staff.EndedAtUtc >= decision.DecidedAtUtc))
                          orderby decision.DecidedAtUtc, decision.Id
                          select new { recipient.Id, assignment.Title, version.ContentJson, Definition = definition,
                              submission.PracticeAttemptId, VersionId = version.Id, decision.DecidedAtUtc }).ToArrayAsync(ct);
        var linkedIds = rows.Where(row => row.PracticeAttemptId.HasValue).Select(row => row.PracticeAttemptId!.Value).ToArray();
        var linked = await db.Set<PracticeAttempt>().AsNoTracking().Where(item => item.PersonId == personId &&
            linkedIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, ct);
        var evidence = new List<TreeEvidence>();
        foreach (var row in rows)
        {
            var exercise = PracticeExercise.Read(row.ContentJson);
            if (!PracticeCatalog.MatchesDefinition(exercise, row.Definition)) continue;
            if (row.PracticeAttemptId is { } link &&
                (!linked.TryGetValue(link, out var attempt) || attempt.PracticeVersionId != row.VersionId ||
                    attempt.Source != "Assignment" || attempt.Status != "Completed" || attempt.Valid != true ||
                    attempt.EndedAtUtc is null || attempt.EndedAtUtc > row.DecidedAtUtc)) continue;
            var key = row.PracticeAttemptId is { } id ? $"attempt:{id}" : $"assignment:{row.Id}";
            evidence.Add(new TreeEvidence(exercise!.Type, new GardenSource(key,
                PracticeCatalog.LocalDate(row.DecidedAtUtc), row.Title, "Approved submission",
                "Coach-approved task", exercise.ContentVersion)));
        }
        // Review snapshots can share an attempt, and each recipient earns at most one effect.
        return evidence.DistinctBy(item => item.Source.Key).ToArray();
    }

    private Task<AttendanceEvidence[]> VerifiedAttendance(long personId, DateTime now, CancellationToken ct) =>
        (from attendance in db.Set<Attendance>().AsNoTracking()
         join session in db.Set<Session>() on attendance.SessionId equals session.Id
         let ownerId = session.InitiativeId != null
             ? db.Set<Initiative>().Where(item => item.Id == session.InitiativeId).Select(item => (long?)item.InstitutionId).FirstOrDefault()
             : db.Set<Experience>().Where(item => item.Id == session.ExperienceId).Select(item => (long?)item.OrganizationId).FirstOrDefault()
         let supervisor = db.Set<SessionDuty>().Any(duty => duty.SessionId == session.Id &&
            duty.AssignedAtUtc <= attendance.RecordedAtUtc &&
            (duty.RevokedAtUtc == null || duty.RevokedAtUtc > attendance.RecordedAtUtc) &&
            (duty.Status == "Active" || duty.Status == "Revoked" && duty.RevokedAtUtc != null) &&
            db.Set<StaffAppointment>().Any(staff => staff.Id == duty.StaffAppointmentId &&
                staff.PersonId == attendance.RecordedByPersonId && staff.Role == "Supervisor" &&
                (staff.InitiativeId == session.InitiativeId && session.InitiativeId != null ||
                    staff.ExperienceId == session.ExperienceId && session.ExperienceId != null) &&
                (staff.Status == "Active" || staff.Status == "Revoked" && staff.EndedAtUtc != null) &&
                staff.AcceptedAtUtc <= attendance.RecordedAtUtc &&
                (staff.EndedAtUtc == null || staff.EndedAtUtc >= attendance.RecordedAtUtc)))
         let representative = db.Set<OrganizationMember>().Any(member => member.OrganizationId == ownerId &&
            member.PersonId == attendance.RecordedByPersonId && member.GrantedAtUtc <= attendance.RecordedAtUtc &&
            (member.Status == "Active" && member.RevokedAtUtc == null || member.RevokedAtUtc > attendance.RecordedAtUtc))
         where attendance.PersonId == personId && attendance.RecordedByPersonId != personId &&
            (attendance.Status == "Present" || attendance.Status == "Late") &&
            !string.IsNullOrWhiteSpace(attendance.Method) &&
            attendance.RecordedAtUtc <= now && session.AttendanceRequired &&
            (session.Status == "Published" || session.Status == "Completed" ||
                session.Status == "Cancelled" && session.CancelledAtUtc > attendance.RecordedAtUtc) &&
            db.Set<Organization>().Any(owner => owner.Id == ownerId && owner.Kind == "Institution" && owner.Status != "Applied") &&
            (supervisor || representative) &&
            (session.InitiativeId != null && db.Set<SessionRegistration>().Any(registration =>
                registration.Id == attendance.RegistrationId && registration.PersonId == personId &&
                registration.SessionId == session.Id && registration.RegisteredAtUtc <= attendance.RecordedAtUtc &&
                (registration.Status == "Confirmed" || registration.Status == "Cancelled" &&
                    registration.CancelledAtUtc > attendance.RecordedAtUtc)) ||
             session.ExperienceId != null && db.Set<ExperienceBooking>().Any(booking =>
                booking.Id == attendance.BookingId && booking.PersonId == personId &&
                booking.ExperienceId == session.ExperienceId && booking.BookedAtUtc <= attendance.RecordedAtUtc &&
                (booking.ConfirmedAtUtc == null || booking.ConfirmedAtUtc <= attendance.RecordedAtUtc) &&
                (booking.Status == "Confirmed" || booking.Status == "Cancelled" &&
                    booking.ConfirmedAtUtc != null && booking.CancelledAtUtc > attendance.RecordedAtUtc)))
         orderby attendance.RecordedAtUtc, attendance.Id
         select new AttendanceEvidence(attendance.Id, attendance.BookingId, session.Title, attendance.Status,
             attendance.Method!, attendance.RecordedAtUtc,
             supervisor ? "Supervisor-confirmed attendance" : "Institution-confirmed attendance")).ToArrayAsync(ct);

    private async Task<GardenSource[]> CampCompletions(long personId, DateTime now, AttendanceEvidence[] attendance,
        CancellationToken ct)
    {
        var rows = await (from completion in db.Set<Completion>().AsNoTracking()
                          join booking in db.Set<ExperienceBooking>() on completion.BookingId equals (long?)booking.Id
                          join experience in db.Set<Experience>() on booking.ExperienceId equals experience.Id
                          join revision in db.Set<ExperienceRevision>() on booking.RevisionId equals revision.Id
                          join organization in db.Set<Organization>() on experience.OrganizationId equals organization.Id
                          where completion.PersonId == personId && booking.PersonId == personId &&
                            completion.Kind == "Camp" && completion.Status == "Completed" &&
                            completion.EvaluatorPersonId != null && completion.EvaluatorPersonId != personId &&
                            completion.EvaluatedAtUtc != null && completion.EvaluatedAtUtc <= now &&
                            booking.ConfirmedAtUtc != null && booking.ConfirmedAtUtc <= completion.EvaluatedAtUtc &&
                            (booking.Status == "Confirmed" || booking.Status == "Cancelled" &&
                                booking.CancelledAtUtc > completion.EvaluatedAtUtc) &&
                            experience.Kind == "Camp" && organization.Kind == "Institution" && organization.Status != "Applied" &&
                            revision.ExperienceId == experience.Id && revision.PublishedAtUtc <= completion.EvaluatedAtUtc &&
                            revision.CompletionRuleRef.Trim() != "" &&
                            (db.Set<StaffAppointment>().Any(staff => staff.ExperienceId == experience.Id &&
                                staff.PersonId == completion.EvaluatorPersonId && staff.Role == "Supervisor" &&
                                (staff.Status == "Active" || staff.Status == "Revoked" && staff.EndedAtUtc != null) &&
                                staff.AcceptedAtUtc <= completion.EvaluatedAtUtc &&
                                (staff.EndedAtUtc == null || staff.EndedAtUtc >= completion.EvaluatedAtUtc)) ||
                             db.Set<OrganizationMember>().Any(member => member.OrganizationId == organization.Id &&
                                member.PersonId == completion.EvaluatorPersonId && member.GrantedAtUtc <= completion.EvaluatedAtUtc &&
                                (member.Status == "Active" && member.RevokedAtUtc == null || member.RevokedAtUtc > completion.EvaluatedAtUtc)))
                          orderby completion.EvaluatedAtUtc, completion.Id
                          select new { ExperienceId = experience.Id, BookingId = booking.Id, revision.Title,
                              revision.RevisionNo, EvaluatedAt = completion.EvaluatedAtUtc!.Value }).ToArrayAsync(ct);
        return rows.Where(row => attendance.Any(item => item.BookingId == row.BookingId && item.RecordedAt <= row.EvaluatedAt))
            .DistinctBy(row => row.ExperienceId).Take(Policy.MaxBirdhouses)
            .Select(row => new GardenSource($"camp:{row.ExperienceId}", PracticeCatalog.LocalDate(row.EvaluatedAt), row.Title,
                $"Completed under published criteria · version {row.RevisionNo}", "Institution-verified camp completion")).ToArray();
    }

    private sealed record TreeEvidence(string Type, GardenSource Source);
    private sealed record AttendanceEvidence(long Id, long? BookingId, string Title, string Status, string Method,
        DateTime RecordedAt, string Source);
}
