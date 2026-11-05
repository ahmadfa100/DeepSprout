CREATE OR ALTER TRIGGER partnership.TR_ProgramLink_Ownership
ON partnership.ProgramLink AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.InitiativeId<>d.InitiativeId OR i.ProgramId<>d.ProgramId OR i.RequestedByPersonId<>d.RequestedByPersonId)
       THROW 65001, 'Program link resource identity is immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.CoachProgram p ON p.Id=i.ProgramId
       WHERE i.Status IN (N'Accepted',N'Active') AND i.AcceptedByPersonId<>p.OwnerPersonId)
       THROW 65002, 'Program link requires acceptance by Program owner', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER partnership.TR_ExperienceLink_Ownership
ON partnership.ExperienceLink AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.InitiativeId<>d.InitiativeId OR i.ExperienceId<>d.ExperienceId OR i.RequestedByPersonId<>d.RequestedByPersonId)
       THROW 65003, 'Experience link resource identity is immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN provider.Experience e ON e.Id=i.ExperienceId
       WHERE i.Status IN (N'Accepted',N'Active') AND NOT EXISTS (
          SELECT 1 FROM provider.ProviderMembership pm WHERE pm.ProviderId=e.ProviderId
            AND pm.PersonId=i.AcceptedByPersonId AND pm.Status=N'Active'))
       THROW 65004, 'Experience link requires acceptance by active Provider member', 1;
END;
