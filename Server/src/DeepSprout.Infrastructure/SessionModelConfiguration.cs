using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class SessionModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<Session>(e =>
        {
            e.ToTable("Session", "session", t =>
            {
                t.HasCheckConstraint("CK_Session_Times", "[EndAtUtc]>[StartAtUtc]");
                t.HasCheckConstraint("CK_Session_Status", "[Status] IN (N'Draft',N'Published',N'Cancelled',N'Completed')");
            });
            e.HasKey(x => x.Id); e.HasIndex(x => new { x.Id, x.InitiativeId }).IsUnique().HasFilter(null);
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Title).HasMaxLength(200); e.Property(x => x.Mode).HasMaxLength(20);
            e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.TimeZoneId).HasMaxLength(80);
            e.HasIndex(x => new { x.InstitutionId, x.StartAtUtc }); e.HasIndex(x => new { x.InitiativeId, x.StartAtUtc });
            e.HasOne<Institution>().WithMany().HasForeignKey(x => x.InstitutionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Initiative>().WithMany().HasForeignKey(x => new { x.InitiativeId, x.InstitutionId })
                .HasPrincipalKey(x => new { x.Id, x.InstitutionId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<SessionRevision>(e =>
        {
            e.ToTable("SessionRevision", "session", t =>
            {
                t.HasCheckConstraint("CK_SessionRevision_No", "[RevisionNo]>0");
                t.HasCheckConstraint("CK_SessionRevision_Window", "[CheckInBeforeMinutes]>=0 AND [CheckInAfterMinutes]>=0");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.SessionId });
            e.Property(x => x.Venue).HasMaxLength(300); e.Property(x => x.ProtectedLinkRef).HasMaxLength(300);
            e.Property(x => x.CompletionRuleRef).HasMaxLength(120);
            e.HasIndex(x => new { x.SessionId, x.RevisionNo }).IsUnique();
            e.HasOne<Session>().WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<InitiativeSessionDuty>(e =>
        {
            e.ToTable("InitiativeSessionDuty", "session", t => t.HasCheckConstraint("CK_InitiativeSessionDuty_Status", "[Status] IN (N'Active',N'Revoked')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.SessionId, x.AppointmentId }).IsUnique().HasFilter("[Status]=N'Active'");
            e.HasIndex(x => new { x.AppointmentId, x.Status });
            e.HasOne<Session>().WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<InitiativeStaffAppointment>().WithMany().HasForeignKey(x => new { x.AppointmentId, x.InitiativeId })
                .HasPrincipalKey(x => new { x.Id, x.InitiativeId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<StandaloneSessionSupervisorAppointment>(e =>
        {
            e.ToTable("StandaloneSessionSupervisorAppointment", "session", t => t.HasCheckConstraint("CK_StandaloneSupervisor_Status", "[Status] IN (N'Pending',N'Active',N'Revoked',N'Expired')"));
            e.HasKey(x => x.Id); e.Property(x => x.NormalizedEmail).HasMaxLength(320);
            e.Property(x => x.TokenHash).HasMaxLength(64); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.SessionId, x.PersonId }).IsUnique().HasFilter("[Status]=N'Active'");
            e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<Session>().WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.InvitedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<SessionCapacityPool>(e =>
        {
            e.ToTable("SessionCapacityPool", "session", t => t.HasCheckConstraint("CK_SessionCapacityPool_Capacity", "[Capacity]>0"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.SessionId });
            e.Property(x => x.Mode).HasMaxLength(20); e.HasIndex(x => new { x.SessionId, x.Mode }).IsUnique();
            e.HasOne<Session>().WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<SessionRegistration>(e =>
        {
            e.ToTable("SessionRegistration", "session", t => t.HasCheckConstraint("CK_SessionRegistration_Status", "[Status] IN (N'Pending',N'Confirmed',N'Cancelled',N'Completed')"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.SessionId, x.PersonId });
            e.HasAlternateKey(x => new { x.Id, x.PoolId });
            e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.CredentialHash).HasMaxLength(32);
            e.HasIndex(x => new { x.SessionId, x.PersonId }).IsUnique();
            e.HasIndex(x => new { x.SessionId, x.Status, x.PoolId });
            e.HasOne<Session>().WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SessionCapacityPool>().WithMany().HasForeignKey(x => new { x.PoolId, x.SessionId })
                .HasPrincipalKey(x => new { x.Id, x.SessionId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SessionRevision>().WithMany().HasForeignKey(x => new { x.SessionRevisionId, x.SessionId })
                .HasPrincipalKey(x => new { x.Id, x.SessionId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<SessionAttendance>(e =>
        {
            e.ToTable("SessionAttendance", "session", t => t.HasCheckConstraint("CK_SessionAttendance_Status", "[Status] IN (N'Present',N'Late',N'Absent',N'NotRecorded')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.Method).HasMaxLength(24);
            e.HasIndex(x => x.RegistrationId).IsUnique(); e.HasIndex(x => new { x.SessionId, x.PersonId }).IsUnique();
            e.HasIndex(x => new { x.SessionId, x.Status });
            e.HasOne<SessionRegistration>().WithMany().HasForeignKey(x => new { x.RegistrationId, x.SessionId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.SessionId, x.PersonId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.RecordedByPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => new { x.EvidenceEventId, x.PersonId })
                .HasPrincipalKey(x => new { x.Id, x.SubjectPersonId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<AttendanceCorrection>(e =>
        {
            e.ToTable("AttendanceCorrection", "session", t => t.HasCheckConstraint("CK_AttendanceCorrection_Status", "[OldStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded') AND [NewStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded')"));
            e.HasKey(x => x.Id); e.Property(x => x.OldStatus).HasMaxLength(24); e.Property(x => x.NewStatus).HasMaxLength(24);
            e.Property(x => x.Reason).HasMaxLength(1000); e.HasIndex(x => new { x.AttendanceId, x.CorrectedAtUtc });
            e.HasOne<SessionAttendance>().WithMany().HasForeignKey(x => x.AttendanceId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.CorrectedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<AbsenceExcuse>(e =>
        {
            e.ToTable("AbsenceExcuse", "session", t => t.HasCheckConstraint("CK_AbsenceExcuse_Status", "[Status] IN (N'Submitted',N'MoreInfo',N'Recommended',N'Accepted',N'Rejected')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Reason).HasMaxLength(1000); e.Property(x => x.Recommendation).HasMaxLength(24);
            e.Property(x => x.Decision).HasMaxLength(24); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.AttendanceId).IsUnique(); e.HasIndex(x => new { x.Status, x.CreatedAtUtc });
            e.HasOne<SessionAttendance>().WithMany().HasForeignKey(x => x.AttendanceId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.SubmittedByPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SecureFile>().WithMany().HasForeignKey(x => x.FileId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.RecommendedByPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.DecidedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<InitiativeCompletion>(e =>
        {
            e.ToTable("InitiativeCompletion", "session", t => t.HasCheckConstraint("CK_InitiativeCompletion_Status", "[Status] IN (N'Pending',N'Completed',N'NotMet',N'Corrected')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.MembershipId).IsUnique(); e.HasIndex(x => new { x.Status, x.EvaluatedAtUtc });
            e.HasOne<InitiativeMembership>().WithMany().HasForeignKey(x => new { x.MembershipId, x.InitiativeId })
                .HasPrincipalKey(x => new { x.Id, x.InitiativeId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<InitiativeRevision>().WithMany().HasForeignKey(x => new { x.RuleRevisionId, x.InitiativeId })
                .HasPrincipalKey(x => new { x.Id, x.InitiativeId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.EvaluatorPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => x.EvidenceEventId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
