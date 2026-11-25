using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.V5;

namespace DeepSprout.Web.Services;

internal static class InitiativeStaffAccess
{
    internal static IQueryable<Initiative> EligibleInitiatives(DeepSproutV5DbContext db, DateTime now) =>
        from initiative in db.Set<Initiative>()
        join institution in db.Set<Organization>() on initiative.InstitutionId equals institution.Id
        join revision in db.Set<InitiativeRevision>()
            on new { Id = initiative.CurrentRevisionId, InitiativeId = initiative.Id }
            equals new { Id = (long?)revision.Id, revision.InitiativeId }
        where institution.Kind == "Institution" && institution.Status == "Verified" &&
            (initiative.Status == "Published" || initiative.Status == "RegistrationClosed") && revision.EndsAtUtc > now
        select initiative;

    internal static IQueryable<StaffAppointment> Active(DeepSproutV5DbContext db, long personId, string role, DateTime now) =>
        Active(db, role, now).Where(appointment => appointment.PersonId == personId);

    internal static IQueryable<StaffAppointment> Active(DeepSproutV5DbContext db, string role, DateTime now) =>
        from appointment in db.Set<StaffAppointment>()
        join initiative in EligibleInitiatives(db, now) on appointment.InitiativeId equals (long?)initiative.Id
        where appointment.ExperienceId == null && appointment.Status == "Active" && appointment.EndedAtUtc == null &&
            appointment.AcceptedAtUtc != null && appointment.Role == role &&
            db.Set<Person>().Any(person => person.Id == appointment.PersonId && person.Status == "Active")
        select appointment;

    internal static IQueryable<OperationalGroup> CoachGroups(DeepSproutV5DbContext db, long personId, Guid initiativeId, DateTime now) =>
        from assignedGroup in db.Set<OperationalGroup>()
        join appointment in Active(db, personId, "Coach", now) on assignedGroup.CoachStaffAppointmentId equals (long?)appointment.Id
        join initiative in db.Set<Initiative>() on appointment.InitiativeId equals (long?)initiative.Id
        where initiative.PublicId == initiativeId && assignedGroup.InitiativeId == initiative.Id && assignedGroup.ProgramId == null &&
            assignedGroup.CoachPersonId == personId && assignedGroup.Status != "Archived"
        select assignedGroup;
}
