using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace DeepSprout.Infrastructure;

public sealed class DeepSproutDbContext(DbContextOptions<DeepSproutDbContext> options) : DbContext(options)
{
    public DbSet<Person> People => Set<Person>();
    public DbSet<Institution> Institutions => Set<Institution>();
    public DbSet<Initiative> Initiatives => Set<Initiative>();
    public DbSet<InitiativeDraft> InitiativeDrafts => Set<InitiativeDraft>();
    public DbSet<InitiativeRevision> InitiativeRevisions => Set<InitiativeRevision>();
    public DbSet<InitiativeApplication> InitiativeApplications => Set<InitiativeApplication>();
    public DbSet<InitiativeApplicationDecision> InitiativeApplicationDecisions => Set<InitiativeApplicationDecision>();
    public DbSet<InitiativeMembership> InitiativeMemberships => Set<InitiativeMembership>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<AssessmentAttempt> AssessmentAttempts => Set<AssessmentAttempt>();
    public DbSet<IndividualProfile> IndividualProfiles => Set<IndividualProfile>();
    public DbSet<BrowserUsagePeriod> BrowserUsagePeriods => Set<BrowserUsagePeriod>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
    public DbSet<OperationalGroup> OperationalGroups => Set<OperationalGroup>();
    public DbSet<EvidenceEvent> EvidenceEvents => Set<EvidenceEvent>();
    public DbSet<PracticeAttempt> PracticeAttempts => Set<PracticeAttempt>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasDefaultSchema("dbo");
        ConfigureIam(model);
        ConfigureFiles(model);
        ConfigureInstitution(model);
        ConfigureOps(model);
        LabModelConfiguration.Apply(model);
        ShieldModelConfiguration.Apply(model);
        OperationsModelConfiguration.Apply(model);
        CoachFoundationModelConfiguration.Apply(model);
        CoachParticipationModelConfiguration.Apply(model);
        TaskModelConfiguration.Apply(model);
        CommunityModelConfiguration.Apply(model);
        SessionModelConfiguration.Apply(model);
        ProviderFoundationModelConfiguration.Apply(model);
        ProviderOperationsModelConfiguration.Apply(model);
        InstitutionExtensionsModelConfiguration.Apply(model);
        PartnershipModelConfiguration.Apply(model);
        CommercialModelConfiguration.Apply(model);
        FormModelConfiguration.Apply(model);
        EvidenceModelConfiguration.Apply(model);
        RecoveryActivityModelConfiguration.Apply(model);

        foreach (var entity in model.Model.GetEntityTypes())
        {
            var builder = model.Entity(entity.ClrType);
            // SQL Server rejects OUTPUT without INTO when a table has an enabled
            // trigger. Module guards use triggers; keep EF inserts compatible.
            builder.ToTable(table => table.UseSqlOutputClause(false));
            builder.Property(nameof(Record.Id)).ValueGeneratedOnAdd();
            builder.Property(nameof(Record.CreatedAtUtc)).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
            if (typeof(MutableRecord).IsAssignableFrom(entity.ClrType))
            {
                builder.Property(nameof(MutableRecord.UpdatedAtUtc)).HasColumnType("datetime2(3)").HasDefaultValueSql("SYSUTCDATETIME()");
                builder.Property(nameof(MutableRecord.RowVersion)).IsRowVersion();
            }
            foreach (var property in entity.GetProperties().Where(p => p.ClrType == typeof(DateTime) || p.ClrType == typeof(DateTime?)))
                builder.Property(property.Name).HasColumnType("datetime2(3)");
        }
    }

    private static void ConfigureIam(ModelBuilder m)
    {
        m.Entity<Person>(e =>
        {
            e.ToTable("Person", "iam", t => t.HasCheckConstraint("CK_Person_Status", "[Status] IN (N'Active',N'Suspended',N'Closed')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.DisplayName).HasMaxLength(160); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.Status, x.Id });
        });
        m.Entity<PersonEmail>(e =>
        {
            e.ToTable("PersonEmail", "iam", t =>
            {
                t.HasCheckConstraint("CK_PersonEmail_Status", "[Status] IN (N'Pending',N'Verified',N'Retired')");
                t.HasCheckConstraint("CK_PersonEmail_Verified", "[Status] <> N'Verified' OR [VerifiedAtUtc] IS NOT NULL");
            });
            e.HasKey(x => x.Id); e.Property(x => x.NormalizedEmail).HasMaxLength(320); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.NormalizedEmail).IsUnique().HasFilter("[Status] = N'Verified'");
            e.HasIndex(x => x.PersonId).IsUnique().HasFilter("[IsPrimary] = 1 AND [Status] = N'Verified'");
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<PasswordCredential>(e =>
        {
            e.ToTable("PasswordCredential", "iam", t => t.HasCheckConstraint("CK_PasswordCredential_Status", "[Status] IN (N'Active',N'Revoked')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PersonId).IsUnique();
            e.Property(x => x.Hash).HasMaxLength(512); e.Property(x => x.Algorithm).HasMaxLength(40);
            e.Property(x => x.Parameters).HasMaxLength(300); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.RotatedAtUtc);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<OtpChallenge>(e =>
        {
            e.ToTable("OtpChallenge", "iam", t =>
            {
                t.HasCheckConstraint("CK_OtpChallenge_Attempts", "[AttemptCount] >= 0");
                t.HasCheckConstraint("CK_OtpChallenge_Status", "[Status] IN (N'Issued',N'Used',N'Expired')");
            });
            e.HasKey(x => x.Id); e.Property(x => x.NormalizedEmail).HasMaxLength(320); e.Property(x => x.Purpose).HasMaxLength(32);
            e.Property(x => x.CodeHash).HasMaxLength(64); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.NormalizedEmail, x.Purpose, x.ExpiresAtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<GlobalGrant>(e =>
        {
            e.ToTable("GlobalGrant", "iam"); e.HasKey(x => x.Id); e.Property(x => x.Capability).HasMaxLength(64);
            e.HasIndex(x => new { x.PersonId, x.Capability }).IsUnique().HasFilter("[RevokedAtUtc] IS NULL");
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.GrantedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ConsentRecord>(e =>
        {
            e.ToTable("ConsentRecord", "iam", t => t.HasCheckConstraint("CK_ConsentRecord_Decision", "[Decision] IN (N'Accepted',N'Withdrawn')"));
            e.HasKey(x => x.Id); e.Property(x => x.PurposeCode).HasMaxLength(80); e.Property(x => x.NoticeVersion).HasMaxLength(64);
            e.Property(x => x.Decision).HasMaxLength(24); e.Property(x => x.EvidenceRef).HasMaxLength(300);
            e.HasIndex(x => new { x.PersonId, x.PurposeCode, x.DecidedAtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }

    private static void ConfigureFiles(ModelBuilder m)
    {
        m.Entity<SecureFile>(e =>
        {
            e.ToTable("SecureFile", "files", t =>
            {
                t.HasCheckConstraint("CK_SecureFile_Bytes", "[Bytes] > 0");
                t.HasCheckConstraint("CK_SecureFile_Status", "[Status] IN (N'Pending',N'Available',N'Quarantined',N'Deleted')");
            });
            e.HasKey(x => x.Id); e.Property(x => x.Purpose).HasMaxLength(40); e.Property(x => x.ObjectKey).HasMaxLength(300);
            e.Property(x => x.MimeType).HasMaxLength(120); e.Property(x => x.Sha256).HasMaxLength(32); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.ObjectKey).IsUnique();
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.OwnerPersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }

    private static void ConfigureInstitution(ModelBuilder m)
    {
        m.Entity<Institution>(e =>
        {
            e.ToTable("Institution", "institution", t => t.HasCheckConstraint("CK_Institution_Status", "[Status] IN (N'Applied',N'Verified',N'Suspended',N'Closed')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Name).HasMaxLength(200); e.Property(x => x.Status).HasMaxLength(24);
            e.Property(x => x.CountryCode).HasColumnType("char(2)"); e.Property(x => x.HeadquartersCity).HasMaxLength(120);
            e.HasIndex(x => new { x.Status, x.Name });
        });
        m.Entity<InstitutionVerificationCase>(e =>
        {
            e.ToTable("InstitutionVerificationCase", "institution", t => t.HasCheckConstraint("CK_InstitutionVerificationCase_Status", "[Status] IN (N'Submitted',N'MoreInfo',N'Approved',N'Rejected')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.DecisionReason).HasMaxLength(1000);
            e.HasIndex(x => new { x.Status, x.CreatedAtUtc });
            e.HasOne<Institution>().WithMany().HasForeignKey(x => x.InstitutionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ApplicantPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SecureFile>().WithMany().HasForeignKey(x => x.EvidenceFileId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.DecidedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<RepresentativeMembership>(e =>
        {
            e.ToTable("RepresentativeMembership", "institution", t =>
            {
                t.HasCheckConstraint("CK_RepresentativeMembership_Status", "[Status] IN (N'Active',N'Revoked')");
                t.HasCheckConstraint("CK_RepresentativeMembership_Revoked", "([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)");
            });
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.InstitutionId, x.PersonId }).IsUnique().HasFilter("[RevokedAtUtc] IS NULL");
            e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<Institution>().WithMany().HasForeignKey(x => x.InstitutionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.GrantedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        ConfigureInitiative(m);
        ConfigureAdmission(m);
        ConfigureStaff(m);
    }

    private static void ConfigureInitiative(ModelBuilder m)
    {
        m.Entity<Initiative>(e =>
        {
            e.ToTable("Initiative", "institution", t =>
            {
                t.HasCheckConstraint("CK_Initiative_Status", "[Status] IN (N'Draft',N'Published',N'Closed',N'Completed',N'Cancelled',N'Archived')");
                t.HasCheckConstraint("CK_Initiative_Capacity", "[Capacity] IS NULL OR [Capacity] BETWEEN 1 AND 135");
                t.HasCheckConstraint("CK_Initiative_End", "[EndsAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [EndsAtUtc]>[StartsAtUtc])");
                t.HasCheckConstraint("CK_Initiative_Cutoff", "[WithdrawalCutoffAtUtc] IS NULL OR ([StartsAtUtc] IS NOT NULL AND [WithdrawalCutoffAtUtc]<[StartsAtUtc])");
                t.HasCheckConstraint("CK_Initiative_Published", "[Status]<>N'Published' OR ([Title] IS NOT NULL AND [Mode] IS NOT NULL AND [Capacity] IS NOT NULL AND [TimeZoneId] IS NOT NULL AND [StartsAtUtc] IS NOT NULL AND [EndsAtUtc] IS NOT NULL AND [WithdrawalCutoffAtUtc] IS NOT NULL)");
                t.HasCheckConstraint("CK_Initiative_Cancellation", "([Status]=N'Cancelled' AND [CancellationReason] IS NOT NULL AND LEN(TRIM([CancellationReason]))>0 AND [CancelledAtUtc] IS NOT NULL AND [CancelledByPersonId] IS NOT NULL) OR ([Status]<>N'Cancelled' AND [CancellationReason] IS NULL AND [CancelledAtUtc] IS NULL AND [CancelledByPersonId] IS NULL)");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.InstitutionId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Title).HasMaxLength(200); e.Property(x => x.Mode).HasMaxLength(24);
            e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.TimeZoneId).HasMaxLength(80);
            e.Property(x => x.CancellationReason).HasMaxLength(800);
            e.HasIndex(x => new { x.InstitutionId, x.Status }); e.HasIndex(x => new { x.Status, x.StartsAtUtc });
            e.HasOne<Institution>().WithMany().HasForeignKey(x => x.InstitutionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.CancelledByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<InitiativeRevision>(e =>
        {
            e.ToTable("InitiativeRevision", "institution", t =>
            {
                t.HasCheckConstraint("CK_InitiativeRevision_No", "[RevisionNo]>0");
                t.HasCheckConstraint("CK_InitiativeRevision_Cost", "([CostKind]=N'Free' AND [Price] IS NULL AND [Currency] IS NULL) OR ([CostKind]=N'Paid' AND [Price]>0 AND [Currency] IS NOT NULL)");
                t.HasCheckConstraint("CK_InitiativeRevision_Json", "ISJSON([PublishedSnapshotJson])=1");
                t.HasCheckConstraint("CK_InitiativeRevision_Times", "[Capacity] BETWEEN 1 AND 135 AND [EndsAtUtc]>[StartsAtUtc] AND [WithdrawalCutoffAtUtc]<[StartsAtUtc]");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.InitiativeId });
            e.HasIndex(x => new { x.InitiativeId, x.RevisionNo }).IsUnique();
            e.Property(x => x.Summary).HasMaxLength(1200); e.Property(x => x.AudienceCode).HasMaxLength(80);
            e.Property(x => x.CoverageCode).HasMaxLength(120); e.Property(x => x.CostKind).HasMaxLength(16);
            e.Property(x => x.Price).HasColumnType("decimal(19,4)"); e.Property(x => x.Currency).HasColumnType("char(3)");
            e.Property(x => x.CompletionPolicyRef).HasMaxLength(120); e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Mode).HasMaxLength(24); e.Property(x => x.TimeZoneId).HasMaxLength(80);
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<InitiativeDraft>(e =>
        {
            e.ToTable("InitiativeDraft", "institution", t =>
            {
                t.HasCheckConstraint("CK_InitiativeDraft_Stage", "[LastSavedStage] BETWEEN 1 AND 6");
                t.HasCheckConstraint("CK_InitiativeDraft_Status", "[Status] IN (N'Draft',N'Published',N'Abandoned')");
                t.HasCheckConstraint("CK_InitiativeDraft_Published", "[Status]<>N'Published' OR [PublishedRevisionId] IS NOT NULL");
                foreach (var n in Enumerable.Range(1, 6))
                    t.HasCheckConstraint($"CK_InitiativeDraft_Json{n}", $"[Stage{n}Json] IS NULL OR ISJSON([Stage{n}Json])=1");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.InitiativeId });
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.InitiativeId).IsUnique().HasFilter("[Status] = N'Draft'");
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<InitiativeRevision>().WithMany().HasForeignKey(x => new { x.BaseRevisionId, x.InitiativeId }).HasPrincipalKey(x => new { x.Id, x.InitiativeId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<InitiativeRevision>().WithMany().HasForeignKey(x => new { x.PublishedRevisionId, x.InitiativeId }).HasPrincipalKey(x => new { x.Id, x.InitiativeId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.UpdatedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }

    private static void ConfigureAdmission(ModelBuilder m)
    {
        m.Entity<InitiativeApplication>(e =>
        {
            e.ToTable("InitiativeApplication", "institution", t =>
            {
                t.HasCheckConstraint("CK_InitiativeApplication_Attempt", "[AttemptNo]>0");
                t.HasCheckConstraint("CK_InitiativeApplication_Status", "[Status] IN (N'Pending',N'Queued',N'Offered',N'Accepted',N'Rejected',N'Withdrawn',N'Blocked',N'Cancelled')");
                t.HasCheckConstraint("CK_InitiativeApplication_Cancelled", "([Status]=N'Cancelled' AND [ClosedReason]=N'InitiativeCancelled' AND [ClosedAtUtc] IS NOT NULL) OR ([Status]<>N'Cancelled' AND [ClosedReason] IS NULL AND [ClosedAtUtc] IS NULL)");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.InitiativeId });
            e.HasAlternateKey(x => new { x.Id, x.InitiativeId, x.PersonId });
            e.HasAlternateKey(x => new { x.Id, x.InitiativeId, x.TermsRevisionId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24);
            e.Property(x => x.ClosedReason).HasMaxLength(40);
            e.HasIndex(x => new { x.InitiativeId, x.PersonId, x.AttemptNo }).IsUnique();
            e.HasIndex(x => new { x.InitiativeId, x.PersonId }).IsUnique().HasFilter("[Status] IN (N'Pending',N'Queued',N'Offered')");
            e.HasIndex(x => new { x.InitiativeId, x.Status, x.SubmittedAtUtc });
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<InitiativeRevision>().WithMany().HasForeignKey(x => new { x.TermsRevisionId, x.InitiativeId }).HasPrincipalKey(x => new { x.Id, x.InitiativeId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<InitiativeApplicationDecision>(e =>
        {
            e.ToTable("InitiativeApplicationDecision", "institution", t => t.HasCheckConstraint("CK_InitiativeApplicationDecision_Action", "[Action] IN (N'Approved',N'Rejected',N'Withdrawn',N'Queued',N'Offered',N'Blocked',N'Cancelled')"));
            e.HasKey(x => x.Id); e.Property(x => x.Action).HasMaxLength(24); e.Property(x => x.Reason).HasMaxLength(800);
            e.HasIndex(x => new { x.ApplicationId, x.DecisionNo }).IsUnique();
            e.HasIndex(x => new { x.InitiativeId, x.AtUtc });
            e.HasOne<InitiativeApplication>().WithMany().HasForeignKey(x => new { x.ApplicationId, x.InitiativeId, x.TermsRevisionId }).HasPrincipalKey(x => new { x.Id, x.InitiativeId, x.TermsRevisionId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ActorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<InitiativeMembership>(e =>
        {
            e.ToTable("InitiativeMembership", "institution", t =>
            {
                t.HasCheckConstraint("CK_InitiativeMembership_Status", "[Status] IN (N'Accepted',N'Suspended',N'Withdrawn',N'Removed',N'Completed',N'Cancelled')");
                t.HasCheckConstraint("CK_InitiativeMembership_EndRelease", "([Status] IN (N'Accepted',N'Suspended') AND [EndedAtUtc] IS NULL AND [CapacityReleasedAtUtc] IS NULL AND [EndReason] IS NULL) OR ([Status] IN (N'Withdrawn',N'Removed',N'Completed',N'Cancelled') AND [EndedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc] IS NOT NULL AND [CapacityReleasedAtUtc]>=[EndedAtUtc] AND ([Status]<>N'Cancelled' OR [EndReason]=N'InitiativeCancelled'))");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.InitiativeId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24); e.HasIndex(x => x.ApplicationId).IsUnique();
            e.Property(x => x.EndReason).HasMaxLength(40);
            e.HasIndex(x => x.PersonId).IsUnique().HasFilter("[Status] IN (N'Accepted',N'Suspended')");
            e.HasIndex(x => new { x.InitiativeId, x.CapacityReleasedAtUtc, x.Status });
            e.HasOne<InitiativeApplication>().WithMany().HasForeignKey(x => new { x.ApplicationId, x.InitiativeId, x.PersonId }).HasPrincipalKey(x => new { x.Id, x.InitiativeId, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }

    private static void ConfigureStaff(ModelBuilder m)
    {
        m.Entity<InitiativeStaffInvitation>(e =>
        {
            e.ToTable("InitiativeStaffInvitation", "institution", t =>
            {
                t.HasCheckConstraint("CK_InitiativeStaffInvitation_Role", "[Role] IN (N'Supervisor',N'Coach')");
                t.HasCheckConstraint("CK_InitiativeStaffInvitation_Status", "[Status] IN (N'Pending',N'Accepted',N'Declined',N'Expired',N'Cancelled',N'Revoked')");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.InitiativeId, x.Role });
            e.Property(x => x.NormalizedEmail).HasMaxLength(320); e.Property(x => x.Role).HasMaxLength(16);
            e.Property(x => x.TokenHash).HasMaxLength(64); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.InitiativeId, x.NormalizedEmail, x.Role }).IsUnique().HasFilter("[Status] = N'Pending'");
            e.HasIndex(x => new { x.Status, x.ExpiresAtUtc });
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.InvitedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<InitiativeStaffAppointment>(e =>
        {
            e.ToTable("InitiativeStaffAppointment", "institution", t =>
            {
                t.HasCheckConstraint("CK_InitiativeStaffAppointment_Role", "[Role] IN (N'Supervisor',N'Coach')");
                t.HasCheckConstraint("CK_InitiativeStaffAppointment_Status", "[Status] IN (N'Active',N'Revoked')");
                t.HasCheckConstraint("CK_InitiativeStaffAppointment_Revoked", "([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.InitiativeId });
            e.Property(x => x.Role).HasMaxLength(16); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.InvitationId).IsUnique();
            e.HasIndex(x => new { x.InitiativeId, x.PersonId, x.Role }).IsUnique().HasFilter("[Status] = N'Active'");
            e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<InitiativeStaffInvitation>().WithMany().HasForeignKey(x => new { x.InvitationId, x.InitiativeId, x.Role }).HasPrincipalKey(x => new { x.Id, x.InitiativeId, x.Role }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => x.InitiativeId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }

    private static void ConfigureOps(ModelBuilder m)
    {
        m.Entity<AuditEvent>(e =>
        {
            e.ToTable("AuditEvent", "ops"); e.HasKey(x => x.Id);
            e.Property(x => x.SelectedGrantKind).HasMaxLength(40); e.Property(x => x.ResourceKind).HasMaxLength(64);
            e.Property(x => x.Action).HasMaxLength(64); e.Property(x => x.BeforeStatus).HasMaxLength(40);
            e.Property(x => x.AfterStatus).HasMaxLength(40); e.Property(x => x.BeforeHash).HasMaxLength(32);
            e.Property(x => x.AfterHash).HasMaxLength(32); e.Property(x => x.Reason).HasMaxLength(1000);
            e.HasIndex(x => new { x.ResourceKind, x.ResourcePublicId, x.AtUtc });
            e.HasIndex(x => new { x.ActorPersonId, x.AtUtc });
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ActorPersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}

public sealed class DeepSproutDesignTimeFactory : IDesignTimeDbContextFactory<DeepSproutDbContext>
{
    public DeepSproutDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<DeepSproutDbContext>()
            .UseSqlServer("Server=localhost;Database=DeepSprout_Validation;Integrated Security=True;Encrypt=True;TrustServerCertificate=True")
            .Options;
        return new DeepSproutDbContext(options);
    }
}
