CREATE OR ALTER TRIGGER recovery.TR_RecoveryJourney_Owner
ON recovery.RecoveryJourney AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.PersonId<>d.PersonId)
        THROW 57001, 'Recovery Journey person is immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER recovery.TR_RecoveryCycle_Owner
ON recovery.RecoveryCycle AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
        WHERE i.JourneyId<>d.JourneyId OR i.PersonId<>d.PersonId)
        THROW 57002, 'Recovery Cycle owner is immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER recovery.TR_PlanRevision_AcceptedImmutable
ON recovery.PlanRevision AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
        WHERE d.Status IN (N'Accepted',N'Superseded') AND (
          i.CycleId<>d.CycleId OR i.RevisionNo<>d.RevisionNo OR i.GoalCode<>d.GoalCode
          OR i.PolicyVersion<>d.PolicyVersion OR i.EffectiveFromLocalDate<>d.EffectiveFromLocalDate
          OR i.Reason<>d.Reason OR i.AcceptedAtUtc<>d.AcceptedAtUtc
          OR (d.Status=N'Superseded' AND i.Status<>N'Superseded')
          OR (d.Status=N'Accepted' AND i.Status NOT IN (N'Accepted',N'Superseded'))))
        THROW 57003, 'Accepted plan terms are immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER activity.TR_PracticeVersion_Immutable
ON activity.PracticeVersion AFTER UPDATE, DELETE
AS BEGIN THROW 57004, 'Practice version is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER recovery.TR_ScheduledAction_CompletionLink
ON recovery.ScheduledAction AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN activity.PracticeAttempt a ON a.Id=i.CompletedAttemptId
        WHERE a.ScheduledActionId<>i.Id OR a.ScheduledActionId IS NULL)
        THROW 57005, 'Completed attempt must belong to the scheduled action', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER activity.TR_PracticeAttempt_Schedule
ON activity.PracticeAttempt AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN recovery.ScheduledAction a ON a.Id=i.ScheduledActionId
        WHERE a.ActionKind<>N'Practice' OR a.PracticeVersionId<>i.PracticeVersionId)
        THROW 57006, 'Practice attempt must match its scheduled practice', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER recovery.TR_WeeklyReview_Immutable
ON recovery.WeeklyReview AFTER UPDATE, DELETE
AS BEGIN THROW 57007, 'Weekly review is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER activity.TR_PracticeProgressionDecision_Immutable
ON activity.PracticeProgressionDecision AFTER UPDATE, DELETE
AS BEGIN THROW 57008, 'Practice progression decision is append-only', 1; END;
