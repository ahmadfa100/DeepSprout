using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using DeepSprout.Infrastructure.V5;

namespace DeepSprout.Web.Services;

internal static class InstitutionAccess
{
    internal static IQueryable<Organization> VerifiedInstitutions(DeepSproutV5DbContext db, long personId) =>
        from membership in db.Set<OrganizationMember>()
        join org in db.Set<Organization>() on membership.OrganizationId equals org.Id
        where membership.PersonId == personId && membership.Status == "Active" && membership.RevokedAtUtc == null
            && org.Kind == "Institution" && org.Status == "Verified"
            && db.Set<Person>().Any(person => person.Id == personId && person.Status == "Active")
            && db.Set<ApplicationUser>().Any(user => user.PersonId == personId && user.EmailConfirmed)
        select org;
}
