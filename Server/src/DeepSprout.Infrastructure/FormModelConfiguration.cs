using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class FormModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<Form>(e =>
        {
            e.ToTable("Form", "forms", t => t.HasCheckConstraint("CK_Form_Status", "[Status] IN (N'Draft',N'Published',N'Closed')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Purpose).HasMaxLength(32); e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.InitiativeId, x.Status });
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<FormVersion>(e =>
        {
            e.ToTable("FormVersion", "forms", t =>
            {
                t.HasCheckConstraint("CK_FormVersion_No", "[VersionNo]>0");
                t.HasCheckConstraint("CK_FormVersion_Window", "[ClosesAtUtc]>[OpensAtUtc]");
            });
            e.HasKey(x => x.Id); e.Property(x => x.ConsentVersion).HasMaxLength(40);
            e.HasIndex(x => new { x.FormId, x.VersionNo }).IsUnique();
            e.HasOne<Form>().WithMany().HasForeignKey(x => x.FormId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<FormQuestion>(e =>
        {
            e.ToTable("FormQuestion", "forms"); e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.FormVersionId });
            e.Property(x => x.QuestionKey).HasMaxLength(80); e.Property(x => x.Prompt).HasMaxLength(1000);
            e.Property(x => x.QuestionType).HasMaxLength(32);
            e.HasIndex(x => new { x.FormVersionId, x.QuestionKey }).IsUnique();
            e.HasOne<FormVersion>().WithMany().HasForeignKey(x => x.FormVersionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<FormQuestionOption>(e =>
        {
            e.ToTable("FormQuestionOption", "forms", t => t.HasCheckConstraint("CK_FormQuestionOption_Order", "[SortOrder]>0"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.QuestionId });
            e.Property(x => x.OptionCode).HasMaxLength(120); e.Property(x => x.Label).HasMaxLength(300);
            e.HasIndex(x => new { x.QuestionId, x.OptionCode }).IsUnique();
            e.HasIndex(x => new { x.QuestionId, x.SortOrder }).IsUnique();
            e.HasOne<FormQuestion>().WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<FormResponse>(e =>
        {
            e.ToTable("FormResponse", "forms", t =>
            {
                t.HasCheckConstraint("CK_FormResponse_No", "[ResponseNo]>0");
                t.HasCheckConstraint("CK_FormResponse_Status", "[Status] IN (N'Draft',N'Submitted',N'Withdrawn')");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.FormVersionId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.FormVersionId, x.PersonId, x.ResponseNo }).IsUnique();
            e.HasIndex(x => new { x.FormVersionId, x.Status });
            e.HasOne<FormVersion>().WithMany().HasForeignKey(x => x.FormVersionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<FormAnswer>(e =>
        {
            e.ToTable("FormAnswer", "forms", t => t.HasCheckConstraint("CK_FormAnswer_OneValue", "(CASE WHEN [TextValue] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [NumberValue] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [ChoiceCode] IS NULL THEN 0 ELSE 1 END)+(CASE WHEN [FileId] IS NULL THEN 0 ELSE 1 END)<=1"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.QuestionId });
            e.Property(x => x.NumberValue).HasColumnType("decimal(18,4)"); e.Property(x => x.ChoiceCode).HasMaxLength(120);
            e.HasIndex(x => new { x.ResponseId, x.QuestionId }).IsUnique();
            e.HasOne<FormResponse>().WithMany().HasForeignKey(x => new { x.ResponseId, x.FormVersionId })
                .HasPrincipalKey(x => new { x.Id, x.FormVersionId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<FormQuestion>().WithMany().HasForeignKey(x => new { x.QuestionId, x.FormVersionId })
                .HasPrincipalKey(x => new { x.Id, x.FormVersionId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SecureFile>().WithMany().HasForeignKey(x => x.FileId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<FormAnswerChoice>(e =>
        {
            e.ToTable("FormAnswerChoice", "forms"); e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.AnswerId, x.OptionId }).IsUnique();
            e.HasOne<FormAnswer>().WithMany().HasForeignKey(x => new { x.AnswerId, x.QuestionId })
                .HasPrincipalKey(x => new { x.Id, x.QuestionId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<FormQuestionOption>().WithMany().HasForeignKey(x => new { x.OptionId, x.QuestionId })
                .HasPrincipalKey(x => new { x.Id, x.QuestionId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<Competition>(e =>
        {
            e.ToTable("Competition", "forms", t =>
            {
                t.HasCheckConstraint("CK_Competition_Window", "[ClosesAtUtc]>[OpensAtUtc]");
                t.HasCheckConstraint("CK_Competition_Status", "[Status] IN (N'Draft',N'Published',N'Closed',N'ResultsPublished')");
            });
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Title).HasMaxLength(200); e.Property(x => x.RulesVersion).HasMaxLength(64);
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => new { x.InitiativeId, x.Status });
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<CompetitionCriterion>(e =>
        {
            e.ToTable("CompetitionCriterion", "forms"); e.HasKey(x => x.Id);
            e.HasAlternateKey(x => new { x.Id, x.CompetitionId, x.RubricVersion });
            e.Property(x => x.CriterionCode).HasMaxLength(80); e.Property(x => x.Label).HasMaxLength(300);
            e.Property(x => x.RubricVersion).HasMaxLength(64);
            e.HasIndex(x => new { x.CompetitionId, x.CriterionCode, x.RubricVersion }).IsUnique();
            e.HasOne<Competition>().WithMany().HasForeignKey(x => x.CompetitionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<CompetitionEntry>(e =>
        {
            e.ToTable("CompetitionEntry", "forms", t =>
            {
                t.HasCheckConstraint("CK_CompetitionEntry_No", "[EntryNo]>0");
                t.HasCheckConstraint("CK_CompetitionEntry_Status", "[Status] IN (N'Submitted',N'Withdrawn',N'Reviewed')");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.CompetitionId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.CompetitionId, x.PersonId, x.EntryNo }).IsUnique();
            e.HasIndex(x => new { x.CompetitionId, x.Status });
            e.HasOne<Competition>().WithMany().HasForeignKey(x => x.CompetitionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SecureFile>().WithMany().HasForeignKey(x => x.FileId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<CompetitionJudgment>(e =>
        {
            e.ToTable("CompetitionJudgment", "forms"); e.HasKey(x => x.Id);
            e.HasAlternateKey(x => new { x.Id, x.CompetitionId, x.RubricVersion });
            e.Property(x => x.RubricVersion).HasMaxLength(64); e.Property(x => x.Decision).HasMaxLength(24);
            e.Property(x => x.Feedback).HasMaxLength(2000);
            e.HasIndex(x => new { x.EntryId, x.JudgePersonId, x.RubricVersion }).IsUnique();
            e.HasOne<CompetitionEntry>().WithMany().HasForeignKey(x => new { x.EntryId, x.CompetitionId })
                .HasPrincipalKey(x => new { x.Id, x.CompetitionId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.JudgePersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<CompetitionCriterionScore>(e =>
        {
            e.ToTable("CompetitionCriterionScore", "forms"); e.HasKey(x => x.Id);
            e.Property(x => x.RubricVersion).HasMaxLength(64); e.Property(x => x.Score).HasColumnType("decimal(9,4)");
            e.HasIndex(x => new { x.JudgmentId, x.CriterionId }).IsUnique();
            e.HasOne<CompetitionJudgment>().WithMany().HasForeignKey(x => new { x.JudgmentId, x.CompetitionId, x.RubricVersion })
                .HasPrincipalKey(x => new { x.Id, x.CompetitionId, x.RubricVersion }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<CompetitionCriterion>().WithMany().HasForeignKey(x => new { x.CriterionId, x.CompetitionId, x.RubricVersion })
                .HasPrincipalKey(x => new { x.Id, x.CompetitionId, x.RubricVersion }).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
