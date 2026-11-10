
using DeepSprout.Domain.V5;
using DeepSprout.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure.V5;

public sealed partial class DeepSproutV5DbContext(
    DbContextOptions<DeepSproutV5DbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<long>, long>(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        V5ModelConfiguration.Apply(modelBuilder);

        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.HasOne<Person>()
                .WithOne()
                .HasForeignKey<ApplicationUser>(user => user.PersonId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
