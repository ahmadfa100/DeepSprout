using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class CoachFoundationModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<CoachApproval>(e =>
        {
            e.ToTable("CoachApproval", "coach", t => t.HasCheckConstraint("CK_CoachApproval_Status", "[Status] IN (N'Submitted',N'MoreInfo',N'Approved',N'Suspended',N'Rejected')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.DecisionReason).HasMaxLength(800);
            e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SecureFile>().WithMany().HasForeignKey(x => x.EvidenceFileId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.DecidedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<CoachProgram>(e =>
        {
            e.ToTable("CoachProgram", "coach", t => t.HasCheckConstraint("CK_CoachProgram_Status", "[Status] IN (N'Draft',N'Published',N'Paused',N'Completed',N'Archived')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Title).HasMaxLength(200); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.OwnerPersonId, x.Status });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.OwnerPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProgramRevision>(e =>
        {
            e.ToTable("ProgramRevision", "coach", t => t.HasCheckConstraint("CK_ProgramRevision_No", "[RevisionNo]>0"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.ProgramId });
            e.Property(x => x.Purpose).HasMaxLength(1200); e.Property(x => x.RuleRef).HasMaxLength(120);
            e.HasIndex(x => new { x.ProgramId, x.RevisionNo }).IsUnique();
            e.HasOne<CoachProgram>().WithMany().HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProgramStage>(e =>
        {
            e.ToTable("ProgramStage", "coach", t =>
            {
                t.HasCheckConstraint("CK_ProgramStage_No", "[StageNo]>0");
                t.HasCheckConstraint("CK_ProgramStage_Times", "[EndsAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [EndsAtUtc]>[StartsAtUtc])");
            });
            e.HasKey(x => x.Id); e.Property(x => x.Title).HasMaxLength(160);
            e.HasIndex(x => new { x.ProgramRevisionId, x.StageNo }).IsUnique();
            e.HasOne<ProgramRevision>().WithMany().HasForeignKey(x => x.ProgramRevisionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<OperationalGroup>(e =>
        {
            e.ToTable("OperationalGroup", "coach", t =>
            {
                t.HasCheckConstraint("CK_OperationalGroup_Parent", "([InitiativeId] IS NULL AND [ProgramId] IS NOT NULL) OR ([InitiativeId] IS NOT NULL AND [ProgramId] IS NULL)");
                t.HasCheckConstraint("CK_OperationalGroup_Status", "[Status] IN (N'Open',N'Closed',N'Archived')");
            });
            e.HasKey(x => x.Id);
            // EF alternate keys make nullable parent columns required. SQL Server
            // unfiltered unique indexes retain the XOR model and support later FKs.
            e.HasIndex(x => new { x.Id, x.InitiativeId }).IsUnique().HasFilter(null);
            e.HasIndex(x => new { x.Id, x.ProgramId }).IsUnique().HasFilter(null);
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Name).HasMaxLength(160); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.InitiativeId); e.HasIndex(x => x.ProgramId);
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<CoachProgram>().WithMany().HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
