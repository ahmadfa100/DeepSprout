CREATE OR ALTER TRIGGER provider.TR_ProviderStaffAppointment_Eligibility
ON provider.ProviderStaffAppointment AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ProviderStaffInvitation v ON v.Id=i.InvitationId
       WHERE i.Status=N'Active' AND (i.AcceptedAtUtc IS NULL OR v.ExpiresAtUtc<=i.AcceptedAtUtc
          OR NOT EXISTS (SELECT 1 FROM iam.PersonEmail e WHERE e.PersonId=i.PersonId
            AND e.NormalizedEmail=v.NormalizedEmail AND e.Status=N'Verified')))
       THROW 63001, 'Provider appointment requires unexpired invitation and verified matching email', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER provider.TR_ProviderAppointmentSession_Active
ON provider.ProviderAppointmentSession AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ProviderStaffAppointment a ON a.Id=i.AppointmentId
       WHERE a.Status<>N'Active')
       THROW 63002, 'Session assignment requires active Provider appointment', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER provider.TR_ProviderCohort_Supervisor
ON provider.ProviderCohort AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ProviderStaffAppointment a ON a.Id=i.SupervisorAppointmentId
       WHERE i.Status=N'Active' AND a.Status<>N'Active')
       THROW 63003, 'Active cohort requires active supervisor appointment', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER provider.TR_ProviderCohortMember_Booking
ON provider.ProviderCohortMember AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ExperienceBooking b ON b.Id=i.BookingId
       WHERE i.LeftAtUtc IS NULL AND b.Status NOT IN (N'Confirmed',N'CheckedIn'))
       THROW 63004, 'Active cohort member requires confirmed booking', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.BookingId<>d.BookingId OR i.CohortId<>d.CohortId OR i.ExperienceId<>d.ExperienceId)
       THROW 63005, 'Cohort member identity is immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER provider.TR_ProviderAttendance_Ownership
ON provider.ProviderAttendance AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ExperienceBooking b ON b.Id=i.BookingId
       JOIN evidence.EvidenceEvent ev ON ev.Id=i.EvidenceEventId WHERE ev.SubjectPersonId<>b.PersonId)
       THROW 63006, 'Provider attendance evidence belongs to another person', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE NOT EXISTS (
       SELECT 1 FROM provider.ProviderAppointmentSession ps
       JOIN provider.ProviderStaffAppointment a ON a.Id=ps.AppointmentId
       WHERE ps.SessionId=i.SessionId AND ps.ExperienceId=i.ExperienceId
         AND a.PersonId=i.RecordedByPersonId AND a.Status=N'Active'))
       THROW 63007, 'Attendance recorder must be assigned to this Experience Session', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER provider.TR_ProviderAttendanceCorrection_Immutable
ON provider.ProviderAttendanceCorrection AFTER UPDATE, DELETE
AS BEGIN THROW 63008, 'Provider attendance correction is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER provider.TR_CampCompletion_EvidenceOwner
ON provider.CampCompletion AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.ExperienceBooking b ON b.Id=i.BookingId
       JOIN evidence.EvidenceEvent ev ON ev.Id=i.EvidenceEventId WHERE ev.SubjectPersonId<>b.PersonId)
       THROW 63009, 'Camp completion evidence belongs to another person', 1;
END;
