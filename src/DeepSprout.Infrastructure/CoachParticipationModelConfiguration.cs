using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class CoachParticipationModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<InitiativeGroupPlacement>(e =>
        {
            e.ToTable("InitiativeGroupPlacement", "coach", t => t.HasCheckConstraint("CK_InitiativeGroupPlacement_Times", "[EndedAtUtc] IS NULL OR [EndedAtUtc]>=[StartedAtUtc]"));
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.InitiativeId, x.MembershipId }).IsUnique().HasFilter("[EndedAtUtc] IS NULL");
            e.HasOne<OperationalGroup>().WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<InitiativeMembership>().WithMany().HasForeignKey(x => new { x.MembershipId, x.InitiativeId })
                .HasPrincipalKey(x => new { x.Id, x.InitiativeId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.MovedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProgramGroupMembership>(e =>
        {
            e.ToTable("ProgramGroupMembership", "coach", t => t.HasCheckConstraint("CK_ProgramGroupMembership_Status", "[Status] IN (N'Active',N'Left',N'Removed',N'Completed')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.GroupId, x.PersonId }).IsUnique();
            e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasIndex(x => new { x.PersonId, x.ProgramId });
            e.HasOne<OperationalGroup>().WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<CoachProgram>().WithMany().HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProgramCompletion>(e =>
        {
            e.ToTable("ProgramCompletion", "coach", t => t.HasCheckConstraint("CK_ProgramCompletion_Status", "[Status] IN (N'Pending',N'Completed',N'NotMet',N'Corrected')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.ProgramId, x.PersonId }).IsUnique();
            e.HasIndex(x => new { x.ProgramId, x.Status });
            e.HasOne<CoachProgram>().WithMany().HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ProgramRevision>().WithMany().HasForeignKey(x => new { x.ProgramRevisionId, x.ProgramId })
                .HasPrincipalKey(x => new { x.Id, x.ProgramId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.EvaluatorPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => new { x.EvidenceEventId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.SubjectPersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<GroupCoachAssignment>(e =>
        {
            e.ToTable("GroupCoachAssignment", "coach", t => t.HasCheckConstraint("CK_GroupCoachAssignment_Times", "[ToUtc] IS NULL OR [ToUtc]>=[FromUtc]"));
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.GroupId, x.CoachPersonId }).IsUnique().HasFilter("[ToUtc] IS NULL");
            e.HasIndex(x => new { x.CoachPersonId, x.ToUtc });
            e.HasOne<OperationalGroup>().WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.CoachPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.AssignedByPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<InitiativeStaffAppointment>().WithMany().HasForeignKey(x => x.InitiativeAppointmentId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProgramGroupInvitation>(e =>
        {
            e.ToTable("ProgramGroupInvitation", "coach", t => t.HasCheckConstraint("CK_ProgramGroupInvitation_Status", "[Status] IN (N'Pending',N'Accepted',N'Declined',N'Expired',N'Revoked')"));
            e.HasKey(x => x.Id); e.Property(x => x.NormalizedEmail).HasMaxLength(320);
            e.Property(x => x.TokenHash).HasMaxLength(64); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.GroupId, x.NormalizedEmail }).IsUnique().HasFilter("[Status]=N'Pending'");
            e.HasOne<OperationalGroup>().WithMany().HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
