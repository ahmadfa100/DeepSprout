CREATE OR ALTER TRIGGER session.TR_SessionRevision_Immutable
ON session.SessionRevision AFTER UPDATE, DELETE
AS BEGIN THROW 61001, 'Session revision is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER session.TR_SessionCapacityPool_Capacity
ON session.SessionCapacityPool AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.SessionId<>d.SessionId OR i.Mode<>d.Mode)
       THROW 61002, 'Session capacity pool identity is immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Capacity <
       (SELECT COUNT_BIG(*) FROM session.SessionRegistration r WHERE r.PoolId=i.Id AND r.Status=N'Confirmed'))
       THROW 61003, 'Capacity cannot shrink below confirmed registrations', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER session.TR_SessionRegistration_Capacity
ON session.SessionRegistration AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.SessionId<>d.SessionId OR i.PersonId<>d.PersonId OR i.PoolId<>d.PoolId OR i.SessionRevisionId<>d.SessionRevisionId)
       THROW 61004, 'Session registration identity and pinned revision are immutable', 1;
    IF EXISTS (SELECT 1 FROM session.SessionCapacityPool p WITH (UPDLOCK,HOLDLOCK)
       JOIN (SELECT DISTINCT PoolId FROM inserted) i ON i.PoolId=p.Id
       WHERE (SELECT COUNT_BIG(*) FROM session.SessionRegistration r WHERE r.PoolId=p.Id AND r.Status=N'Confirmed')>p.Capacity)
       THROW 61005, 'Session capacity exceeded', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER session.TR_InitiativeSessionDuty_Active
ON session.InitiativeSessionDuty AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN institution.InitiativeStaffAppointment a ON a.Id=i.AppointmentId
       WHERE i.Status=N'Active' AND a.Status<>N'Active')
       THROW 61006, 'Initiative session duty requires active staff appointment', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER session.TR_StandaloneSupervisor_Eligibility
ON session.StandaloneSessionSupervisorAppointment AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN session.Session s ON s.Id=i.SessionId WHERE s.InitiativeId IS NOT NULL)
       THROW 61007, 'Standalone supervisor requires standalone Session', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Status=N'Active' AND
       (i.PersonId IS NULL OR i.AcceptedAtUtc IS NULL OR NOT EXISTS (
          SELECT 1 FROM iam.PersonEmail e WHERE e.PersonId=i.PersonId AND e.NormalizedEmail=i.NormalizedEmail AND e.Status=N'Verified')))
       THROW 61008, 'Active standalone supervisor requires matching verified email', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER session.TR_AttendanceCorrection_Immutable
ON session.AttendanceCorrection AFTER UPDATE, DELETE
AS BEGIN THROW 61009, 'Attendance correction is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER session.TR_AbsenceExcuse_Owner
ON session.AbsenceExcuse AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN session.SessionAttendance a ON a.Id=i.AttendanceId
       LEFT JOIN files.SecureFile f ON f.Id=i.FileId
       WHERE a.Status<>N'Absent' OR i.SubmittedByPersonId<>a.PersonId
          OR (i.FileId IS NOT NULL AND (f.OwnerPersonId IS NULL OR f.OwnerPersonId<>a.PersonId)))
       THROW 61010, 'Absence excuse requires absent attendance and matching person/file', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER session.TR_InitiativeCompletion_EvidenceOwner
ON session.InitiativeCompletion AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN institution.InitiativeMembership m ON m.Id=i.MembershipId
       JOIN evidence.EvidenceEvent ev ON ev.Id=i.EvidenceEventId WHERE ev.SubjectPersonId<>m.PersonId)
       THROW 61011, 'Initiative completion evidence belongs to another person', 1;
END;
-- BATCH
CREATE OR ALTER PROCEDURE session.RegisterConfirmed
    @SessionId bigint,@PersonId bigint,@PoolId bigint,@RegistrationId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @Capacity int,@Confirmed bigint,@RevisionId bigint;
        SELECT @Capacity=p.Capacity FROM session.SessionCapacityPool p WITH (UPDLOCK,HOLDLOCK)
          JOIN session.Session s ON s.Id=p.SessionId
          WHERE p.Id=@PoolId AND p.SessionId=@SessionId AND s.Status=N'Published';
        IF @Capacity IS NULL THROW 61012, 'Published Session capacity pool not found', 1;
        SELECT @Confirmed=COUNT_BIG(*) FROM session.SessionRegistration WHERE PoolId=@PoolId AND Status=N'Confirmed';
        IF @Confirmed>=@Capacity THROW 61005, 'Session capacity exceeded', 1;
        SELECT TOP(1) @RevisionId=Id FROM session.SessionRevision WHERE SessionId=@SessionId ORDER BY RevisionNo DESC;
        IF @RevisionId IS NULL THROW 61013, 'Published Session revision not found', 1;
        INSERT session.SessionRegistration(SessionId,PersonId,PoolId,SessionRevisionId,Status,RegisteredAtUtc)
          VALUES(@SessionId,@PersonId,@PoolId,@RevisionId,N'Confirmed',SYSUTCDATETIME());
        SET @RegistrationId=CAST(SCOPE_IDENTITY() AS bigint);
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;
