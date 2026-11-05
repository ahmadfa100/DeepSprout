CREATE OR ALTER TRIGGER coach.TR_InitiativeGroupPlacement_Owner
ON coach.InitiativeGroupPlacement AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.OperationalGroup g ON g.Id=i.GroupId
       WHERE g.InitiativeId IS NULL OR g.InitiativeId<>i.InitiativeId)
       THROW 58001, 'Placement group must belong to the same Initiative', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.GroupId<>d.GroupId OR i.InitiativeId<>d.InitiativeId OR i.MembershipId<>d.MembershipId)
       THROW 58002, 'Placement identity is immutable; close and insert a new placement', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER coach.TR_ProgramGroupMembership_Owner
ON coach.ProgramGroupMembership AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.OperationalGroup g ON g.Id=i.GroupId
       WHERE g.ProgramId IS NULL OR g.ProgramId<>i.ProgramId)
       THROW 58003, 'Program membership group must belong to the same Program', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.GroupId<>d.GroupId OR i.ProgramId<>d.ProgramId OR i.PersonId<>d.PersonId)
       THROW 58004, 'Program membership owner is immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER coach.TR_GroupCoachAssignment_Owner
ON coach.GroupCoachAssignment AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.OperationalGroup g ON g.Id=i.GroupId
       LEFT JOIN institution.InitiativeStaffAppointment a ON a.Id=i.InitiativeAppointmentId
       WHERE (g.InitiativeId IS NOT NULL AND
              (a.Id IS NULL OR a.InitiativeId<>g.InitiativeId OR a.PersonId<>i.CoachPersonId OR a.Role<>N'Coach' OR a.Status<>N'Active'))
          OR (g.ProgramId IS NOT NULL AND i.InitiativeAppointmentId IS NOT NULL))
       THROW 58005, 'Coach assignment must match its group and active Initiative appointment', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.GroupId<>d.GroupId OR i.CoachPersonId<>d.CoachPersonId OR
             ISNULL(i.InitiativeAppointmentId,-1)<>ISNULL(d.InitiativeAppointmentId,-1))
       THROW 58006, 'Coach assignment owner is immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER coach.TR_ProgramGroupInvitation_Parent
ON coach.ProgramGroupInvitation AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.OperationalGroup g ON g.Id=i.GroupId
       WHERE g.ProgramId IS NULL)
       THROW 58007, 'Program group invitation requires a Program group', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.GroupId<>d.GroupId)
       THROW 58008, 'Program group invitation parent is immutable', 1;
END;
