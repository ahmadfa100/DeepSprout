CREATE OR ALTER TRIGGER coach.TR_CoachProgram_OwnerPublication
ON coach.CoachProgram AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.OwnerPersonId<>d.OwnerPersonId)
        THROW 55001, 'Coach Program owner is immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i WHERE i.Status=N'Published'
        AND NOT EXISTS (SELECT 1 FROM coach.ProgramRevision r WHERE r.ProgramId=i.Id))
        THROW 55002, 'Published Program requires a revision', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER coach.TR_ProgramRevision_Immutable
ON coach.ProgramRevision AFTER UPDATE, DELETE
AS BEGIN THROW 55003, 'Program revision is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER coach.TR_ProgramStage_Immutable
ON coach.ProgramStage AFTER UPDATE, DELETE
AS BEGIN THROW 55004, 'Program stage is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER coach.TR_ProgramStage_ClosedPublication
ON coach.ProgramStage AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN coach.ProgramRevision r ON r.Id=i.ProgramRevisionId
       JOIN coach.CoachProgram p ON p.Id=r.ProgramId WHERE p.Status<>N'Draft')
        THROW 55005, 'Program stages cannot be added after publication', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER coach.TR_OperationalGroup_ParentImmutable
ON coach.OperationalGroup AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
      WHERE ISNULL(i.InitiativeId,-1)<>ISNULL(d.InitiativeId,-1)
         OR ISNULL(i.ProgramId,-1)<>ISNULL(d.ProgramId,-1))
        THROW 55006, 'Operational Group parent cannot change', 1;
END;
