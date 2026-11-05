using DeepSprout.Domain;
using Microsoft.EntityFrameworkCore;

namespace DeepSprout.Infrastructure;

internal static class ProviderOperationsModelConfiguration
{
    internal static void Apply(ModelBuilder m)
    {
        m.Entity<ProviderStaffInvitation>(e =>
        {
            e.ToTable("ProviderStaffInvitation", "provider", t => t.HasCheckConstraint("CK_ProviderStaffInvitation_Status", "[Status] IN (N'Pending',N'Accepted',N'Expired',N'Revoked')"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.ExperienceId });
            e.Property(x => x.NormalizedEmail).HasMaxLength(320); e.Property(x => x.TokenHash).HasMaxLength(64);
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.ExperienceId, x.NormalizedEmail }).IsUnique().HasFilter("[Status]=N'Pending'");
            e.HasOne<Experience>().WithMany().HasForeignKey(x => x.ExperienceId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.InvitedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProviderStaffAppointment>(e =>
        {
            e.ToTable("ProviderStaffAppointment", "provider", t =>
            {
                t.HasCheckConstraint("CK_ProviderStaffAppointment_Status", "[Status] IN (N'Active',N'Revoked')");
                t.HasCheckConstraint("CK_ProviderStaffAppointment_Revoked", "([Status]=N'Active' AND [RevokedAtUtc] IS NULL) OR ([Status]=N'Revoked' AND [RevokedAtUtc] IS NOT NULL)");
            });
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.ExperienceId });
            e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.ExperienceId, x.PersonId }).IsUnique().HasFilter("[Status]=N'Active'");
            e.HasIndex(x => new { x.PersonId, x.Status });
            e.HasOne<ProviderStaffInvitation>().WithMany().HasForeignKey(x => new { x.InvitationId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProviderAppointmentSession>(e =>
        {
            e.ToTable("ProviderAppointmentSession", "provider"); e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.AppointmentId, x.SessionId }).IsUnique();
            e.HasOne<ProviderStaffAppointment>().WithMany().HasForeignKey(x => new { x.AppointmentId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ExperienceSession>().WithMany().HasForeignKey(x => new { x.SessionId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProviderCohort>(e =>
        {
            e.ToTable("ProviderCohort", "provider", t => t.HasCheckConstraint("CK_ProviderCohort_Status", "[Status] IN (N'Active',N'Closed')"));
            e.HasKey(x => x.Id); e.HasAlternateKey(x => new { x.Id, x.ExperienceId });
            e.Property(x => x.Name).HasMaxLength(160); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.ExperienceId, x.Status });
            e.HasOne<ProviderStaffAppointment>().WithMany().HasForeignKey(x => new { x.SupervisorAppointmentId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProviderCohortMember>(e =>
        {
            e.ToTable("ProviderCohortMember", "provider"); e.HasKey(x => x.Id);
            e.HasIndex(x => x.BookingId).IsUnique().HasFilter("[LeftAtUtc] IS NULL");
            e.HasIndex(x => new { x.CohortId, x.LeftAtUtc });
            e.HasOne<ProviderCohort>().WithMany().HasForeignKey(x => new { x.CohortId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ExperienceBooking>().WithMany().HasForeignKey(x => new { x.BookingId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProviderAttendance>(e =>
        {
            e.ToTable("ProviderAttendance", "provider", t => t.HasCheckConstraint("CK_ProviderAttendance_Status", "[Status] IN (N'Present',N'Late',N'Absent',N'NotRecorded')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24); e.Property(x => x.Method).HasMaxLength(24);
            e.HasIndex(x => new { x.BookingId, x.SessionId }).IsUnique(); e.HasIndex(x => new { x.SessionId, x.Status });
            e.HasOne<ExperienceBooking>().WithMany().HasForeignKey(x => new { x.BookingId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ExperienceSession>().WithMany().HasForeignKey(x => new { x.SessionId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.RecordedByPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => x.EvidenceEventId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProviderAttendanceCorrection>(e =>
        {
            e.ToTable("ProviderAttendanceCorrection", "provider", t => t.HasCheckConstraint("CK_ProviderAttendanceCorrection_Status", "[OldStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded') AND [NewStatus] IN (N'Present',N'Late',N'Absent',N'NotRecorded')"));
            e.HasKey(x => x.Id); e.Property(x => x.OldStatus).HasMaxLength(24); e.Property(x => x.NewStatus).HasMaxLength(24);
            e.Property(x => x.Reason).HasMaxLength(1000); e.HasIndex(x => new { x.AttendanceId, x.CorrectedAtUtc });
            e.HasOne<ProviderAttendance>().WithMany().HasForeignKey(x => x.AttendanceId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.CorrectedByPersonId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<CampCompletion>(e =>
        {
            e.ToTable("CampCompletion", "provider", t => t.HasCheckConstraint("CK_CampCompletion_Status", "[Status] IN (N'Pending',N'Completed',N'NotMet',N'Corrected')"));
            e.HasKey(x => x.Id); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => x.BookingId).IsUnique(); e.HasIndex(x => new { x.Status, x.EvaluatedAtUtc });
            e.HasOne<ExperienceBooking>().WithMany().HasForeignKey(x => new { x.BookingId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ExperienceRevision>().WithMany().HasForeignKey(x => new { x.RuleRevisionId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.EvaluatorPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<EvidenceEvent>().WithMany().HasForeignKey(x => x.EvidenceEventId).OnDelete(DeleteBehavior.NoAction);
        });
        m.Entity<ProviderIncident>(e =>
        {
            e.ToTable("ProviderIncident", "provider", t => t.HasCheckConstraint("CK_ProviderIncident_Status", "[Status] IN (N'Open',N'Reviewed',N'Closed')"));
            e.HasKey(x => x.Id); e.HasIndex(x => x.PublicId).IsUnique(); e.Property(x => x.PublicId).HasDefaultValueSql("NEWID()");
            e.Property(x => x.Summary).HasMaxLength(2000); e.Property(x => x.Status).HasMaxLength(24);
            e.HasIndex(x => new { x.ExperienceId, x.OccurredAtUtc });
            e.HasOne<Experience>().WithMany().HasForeignKey(x => x.ExperienceId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ExperienceBooking>().WithMany().HasForeignKey(x => new { x.BookingId, x.ExperienceId })
                .HasPrincipalKey(x => new { x.Id, x.ExperienceId }).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<Person>().WithMany().HasForeignKey(x => x.ReportedByPersonId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<SecureFile>().WithMany().HasForeignKey(x => x.FileId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
