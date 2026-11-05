ALTER TABLE evidence.GroupGarden WITH CHECK ADD CONSTRAINT FK_GroupGarden_OperationalGroup_IndependentGroupId_ProgramId
FOREIGN KEY (IndependentGroupId,ProgramId) REFERENCES coach.OperationalGroup(Id,ProgramId);
-- BATCH
CREATE OR ALTER TRIGGER evidence.TR_EvidenceEvent_Immutable
ON evidence.EvidenceEvent AFTER UPDATE, DELETE
AS BEGIN THROW 56001, 'Evidence event is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER evidence.TR_EvidenceEvent_Invalidation
ON evidence.EvidenceEvent AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN evidence.EvidenceEvent prior ON prior.Id=i.InvalidatesEventId
        WHERE prior.Validity<>N'Accepted')
        THROW 56002, 'Only an accepted source event can be invalidated', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER evidence.TR_RewardPolicyVersion_Immutable
ON evidence.RewardPolicyVersion AFTER UPDATE, DELETE
AS BEGIN THROW 56003, 'Reward policy version is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER evidence.TR_PersonalRewardEntry_Immutable
ON evidence.PersonalRewardEntry AFTER UPDATE, DELETE
AS BEGIN THROW 56004, 'Personal reward entry is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER evidence.TR_PersonalRewardEntry_Reversal
ON evidence.PersonalRewardEntry AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN evidence.PersonalRewardEntry prior ON prior.Id=i.ReversesEntryId
        WHERE prior.EntryKind<>N'Grant')
        THROW 56005, 'Reversal must refer to a grant', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER evidence.TR_GroupRewardEntry_Immutable
ON evidence.GroupRewardEntry AFTER UPDATE, DELETE
AS BEGIN THROW 56006, 'Group reward entry is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER evidence.TR_GroupRewardEntry_Reversal
ON evidence.GroupRewardEntry AFTER INSERT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN evidence.GroupRewardEntry prior ON prior.Id=i.ReversesEntryId
        WHERE prior.EntryKind<>N'Grant')
        THROW 56007, 'Reversal must refer to a grant', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER evidence.TR_GroupGarden_OwnerImmutable
ON evidence.GroupGarden AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
      WHERE ISNULL(i.InitiativeId,-1)<>ISNULL(d.InitiativeId,-1)
         OR ISNULL(i.IndependentGroupId,-1)<>ISNULL(d.IndependentGroupId,-1)
         OR ISNULL(i.ProgramId,-1)<>ISNULL(d.ProgramId,-1))
        THROW 56008, 'Group Garden owner is immutable', 1;
END;
