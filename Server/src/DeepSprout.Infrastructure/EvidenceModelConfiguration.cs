using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class EvidenceModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<EvidenceEvent>(e =>
        {
            e.ToTable("EvidenceEvent", "evidence", t => t.HasCheckConstraint("CK_EvidenceEvent_Validity", "([Validity]=N'Accepted' AND [InvalidatesEventId] IS NULL) OR ([Validity]=N'Invalidates' AND [InvalidatesEventId] IS NOT NULL)"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.SubjectPersonId });
            e.HasIndex(x => x.EventPublicId).IsUnique(); e.Property(x => x.EventPublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.SourceContext).HasMaxLength(40); e.Property(x => x.SourceKey).HasMaxLength(160);
            e.Property(x => x.Kind).HasMaxLength(40); e.Property(x => x.Provenance).HasMaxLength(40);
            e.Property(x => x.SourceVersion).HasMaxLength(64); e.Property(x => x.Validity).HasMaxLength(24);
            e.HasIndex(x => new { x.SourceContext, x.SourceKey, x.SourceVersion }).IsUnique();
            e.HasIndex(x => x.InvalidatesEventId).IsUnique().HasFilter("[InvalidatesEventId] IS NOT NULL");
            e.HasIndex(x => new { x.SubjectPersonId, x.OccurredAtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.SubjectPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => new { x.InvalidatesEventId, x.SubjectPersonId })
                .HasPrincipalKey(x => new { x.Id, x.SubjectPersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<RewardPolicyVersion>(e =>
        {
            e.ToTable("RewardPolicyVersion", "evidence", t => t.HasCheckConstraint("CK_RewardPolicyVersion_No", "[VersionNo]>0"));
            e.HasKey(x => x.Id); e.Property(x => x.PolicyCode).HasMaxLength(64); e.Property(x => x.RuleRef).HasMaxLength(300);
            e.HasIndex(x => new { x.PolicyCode, x.VersionNo }).IsUnique();
        });
        m.Entity<GroupGarden>(e =>
        {
            e.ToTable("GroupGarden", "evidence", t => t.HasCheckConstraint("CK_GroupGarden_Owner", "([InitiativeId] IS NOT NULL AND [IndependentGroupId] IS NULL AND [ProgramId] IS NULL) OR ([InitiativeId] IS NULL AND [IndependentGroupId] IS NOT NULL AND [ProgramId] IS NOT NULL)"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.InitiativeId).IsUnique().HasFilter("[InitiativeId] IS NOT NULL");
            e.HasIndex(x => x.IndependentGroupId).IsUnique().HasFilter("[IndependentGroupId] IS NOT NULL");
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<CoachProgram>().WithMany().HasForeignKey(x => x.ProgramId).OnDelete(DeleteBehavior.NoAction);
            // Composite group/program FK is added by the EF migration as SQL;
            // EF alternate keys would make OperationalGroup.ProgramId NOT NULL.
        });
        m.Entity<PersonalRewardEntry>(e =>
        {
            e.ToTable("PersonalRewardEntry", "evidence", t =>
            {
                t.HasCheckConstraint("CK_PersonalRewardEntry_Kind", "([EntryKind]=N'Grant' AND [ReversesEntryId] IS NULL) OR ([EntryKind]=N'Reversal' AND [ReversesEntryId] IS NOT NULL)");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.PersonId });
            e.Property(x => x.EffectCode).HasMaxLength(40); e.Property(x => x.EntryKind).HasMaxLength(16);
            e.HasIndex(x => new { x.EvidenceEventId, x.PersonId, x.EffectCode }).IsUnique().HasFilter("[EntryKind]=N'Grant'");
            e.HasIndex(x => x.ReversesEntryId).IsUnique().HasFilter("[ReversesEntryId] IS NOT NULL");
            e.HasIndex(x => new { x.PersonId, x.DecidedAtUtc });
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => new { x.EvidenceEventId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.SubjectPersonId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<PersonalRewardEntry>().WithMany().HasForeignKey(x => new { x.ReversesEntryId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<RewardPolicyVersion>().WithMany().HasForeignKey(x => x.PolicyVersionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<GroupRewardEntry>(e =>
        {
            e.ToTable("GroupRewardEntry", "evidence", t => t.HasCheckConstraint("CK_GroupRewardEntry_Kind", "([EntryKind]=N'Grant' AND [ReversesEntryId] IS NULL) OR ([EntryKind]=N'Reversal' AND [ReversesEntryId] IS NOT NULL)"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.GroupGardenId });
            e.Property(x => x.EffectCode).HasMaxLength(40); e.Property(x => x.EntryKind).HasMaxLength(16);
            e.HasIndex(x => new { x.EvidenceEventId, x.GroupGardenId, x.EffectCode }).IsUnique().HasFilter("[EntryKind]=N'Grant'");
            e.HasIndex(x => x.ReversesEntryId).IsUnique().HasFilter("[ReversesEntryId] IS NOT NULL");
            e.HasIndex(x => new { x.GroupGardenId, x.DecidedAtUtc });
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => x.EvidenceEventId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<GroupGarden>().WithMany().HasForeignKey(x => x.GroupGardenId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<RewardPolicyVersion>().WithMany().HasForeignKey(x => x.PolicyVersionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<GroupRewardEntry>().WithMany().HasForeignKey(x => new { x.ReversesEntryId, x.GroupGardenId })
                .HasPrincipalKey(x => new { x.Id, x.GroupGardenId }).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
