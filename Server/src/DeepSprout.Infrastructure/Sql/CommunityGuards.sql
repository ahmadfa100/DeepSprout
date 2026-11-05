CREATE OR ALTER TRIGGER community.TR_Post_Owner
ON community.Post AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id WHERE i.AuthorPersonId<>d.AuthorPersonId)
       THROW 60001, 'Post author is immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER community.TR_Comment_Owner
ON community.Comment AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.PostId<>d.PostId OR i.AuthorPersonId<>d.AuthorPersonId)
       THROW 60002, 'Comment owner and post are immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER community.TR_ContentReport_Owner
ON community.ContentReport AFTER UPDATE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.ReporterPersonId<>d.ReporterPersonId OR ISNULL(i.PostId,-1)<>ISNULL(d.PostId,-1)
          OR ISNULL(i.CommentId,-1)<>ISNULL(d.CommentId,-1))
       THROW 60003, 'Content report target and reporter are immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER community.TR_ModerationDecision_Immutable
ON community.ModerationDecision AFTER UPDATE, DELETE
AS BEGIN THROW 60004, 'Moderation decision is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER community.TR_JointGoalCheckIn_Guard
ON community.JointGoalCheckIn AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted) THROW 60005, 'Joint goal check-in is append-only', 1;
    IF EXISTS (SELECT 1 FROM inserted i
       JOIN community.JointGoalMember m ON m.GoalId=i.GoalId AND m.PersonId=i.PersonId
       JOIN community.JointGoal g ON g.Id=i.GoalId
       WHERE m.Status<>N'Active' OR g.Status<>N'Active')
       THROW 60006, 'Joint goal check-in requires active goal membership', 1;
END;
