using Microsoft.AspNetCore.Identity;

namespace DeepSprout.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<long>
{
    public long PersonId { get; set; }
}