using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class PartnershipModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<ProgramLink>(e =>
        {
            e.ToTable("ProgramLink", "partnership", t =>
            {
                t.HasCheckConstraint("CK_ProgramLink_Status", "[Status] IN (N'Requested',N'Accepted',N'Active',N'Declined',N'Ended')");
                t.HasCheckConstraint("CK_ProgramLink_AcceptedBy", "[Status] NOT IN (N'Accepted',N'Active') OR [AcceptedByPersonId] IS NOT NULL");
            });
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.ScopeVersion).HasMaxLength(64); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.InitiativeId, x.ProgramId }).IsUnique().HasFilter("[Status] IN (N'Requested',N'Accepted',N'Active')");
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<CoachProgram>().WithMany().HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.RequestedByPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.AcceptedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ExperienceLink>(e =>
        {
            e.ToTable("ExperienceLink", "partnership", t =>
            {
                t.HasCheckConstraint("CK_ExperienceLink_Status", "[Status] IN (N'Requested',N'Accepted',N'Active',N'Declined',N'Ended')");
                t.HasCheckConstraint("CK_ExperienceLink_AcceptedBy", "[Status] NOT IN (N'Accepted',N'Active') OR [AcceptedByPersonId] IS NOT NULL");
            });
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.ScopeVersion).HasMaxLength(64); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.InitiativeId, x.ExperienceId }).IsUnique().HasFilter("[Status] IN (N'Requested',N'Accepted',N'Active')");
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Experience>().WithMany().HasForeignKey(x => x.ExperienceId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.RequestedByPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.AcceptedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
