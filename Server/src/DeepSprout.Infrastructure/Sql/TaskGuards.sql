CREATE OR ALTER TRIGGER task.TR_AssignmentRecipient_Owner
ON task.AssignmentRecipient AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.AssignmentId<>d.AssignmentId OR i.PersonId<>d.PersonId)
       THROW 59001, 'Assignment recipient owner is immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN task.Assignment a ON a.Id=i.AssignmentId
       JOIN coach.OperationalGroup g ON g.Id=a.GroupId
       WHERE NOT EXISTS (SELECT 1 FROM deleted d WHERE d.Id=i.Id)
       AND NOT ((g.InitiativeId IS NOT NULL AND EXISTS (
           SELECT 1 FROM coach.InitiativeGroupPlacement p
           JOIN institution.InitiativeMembership m ON m.Id=p.MembershipId
           WHERE p.GroupId=g.Id AND p.InitiativeId=g.InitiativeId AND p.EndedAtUtc IS NULL
             AND m.PersonId=i.PersonId AND m.Status IN (N'Accepted',N'Suspended'))
         OR (g.ProgramId IS NOT NULL AND EXISTS (
           SELECT 1 FROM coach.ProgramGroupMembership pm
           WHERE pm.GroupId=g.Id AND pm.ProgramId=g.ProgramId AND pm.PersonId=i.PersonId AND pm.Status=N'Active')))))
       THROW 59002, 'Recipient is not an active member of the assignment group', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER task.TR_SubmissionAttempt_Guard
ON task.SubmissionAttempt AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted) THROW 59003, 'Submission attempt is append-only', 1;
    IF EXISTS (SELECT 1 FROM inserted i
       JOIN task.AssignmentRecipient r ON r.Id=i.RecipientId
       LEFT JOIN files.SecureFile f ON f.Id=i.FileId
       WHERE i.AssignmentRevisionId<>r.AssignedRevisionId
          OR (i.FileId IS NOT NULL AND (f.OwnerPersonId IS NULL OR f.OwnerPersonId<>r.PersonId)))
       THROW 59004, 'Submission revision or file owner does not match recipient', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER task.TR_ReviewDecision_Guard
ON task.ReviewDecision AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted) THROW 59005, 'Review decision is append-only', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN task.SubmissionAttempt a ON a.Id=i.AttemptId
       JOIN task.AssignmentRecipient r ON r.Id=a.RecipientId
       JOIN evidence.EvidenceEvent ev ON ev.Id=i.EvidenceEventId
       WHERE ev.SubjectPersonId<>r.PersonId)
       THROW 59006, 'Review evidence must belong to submission recipient', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER task.TR_ReviewPrivateNote_Immutable
ON task.ReviewPrivateNote AFTER UPDATE, DELETE
AS BEGIN THROW 59007, 'Private review note is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER task.TR_AssignmentRevision_Immutable
ON task.AssignmentRevision AFTER UPDATE, DELETE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM deleted WHERE PublishedAtUtc IS NOT NULL)
       THROW 59008, 'Published assignment revision is immutable', 1;
END;
-- BATCH
CREATE OR ALTER PROCEDURE task.SubmitAttempt
    @RecipientId bigint, @PersonId bigint, @Body nvarchar(max)=NULL, @FileId bigint=NULL,
    @AttemptId bigint OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRAN;
        DECLARE @AssignmentId bigint, @RevisionId bigint, @LastNo int;
        SELECT @AssignmentId=r.AssignmentId,@RevisionId=r.AssignedRevisionId,@LastNo=r.LastAttemptNo
        FROM task.AssignmentRecipient r WITH (UPDLOCK,HOLDLOCK)
        JOIN task.Assignment a ON a.Id=r.AssignmentId
        WHERE r.Id=@RecipientId AND r.PersonId=@PersonId
          AND r.Status IN (N'Assigned',N'Started',N'Submitted') AND a.Status=N'Published';
        IF @AssignmentId IS NULL THROW 59009, 'Recipient is not eligible for submission', 1;
        UPDATE task.AssignmentRecipient SET LastAttemptNo=@LastNo+1,Status=N'Submitted',UpdatedAtUtc=SYSUTCDATETIME()
          WHERE Id=@RecipientId;
        INSERT task.SubmissionAttempt(RecipientId,AttemptNo,AssignmentRevisionId,Body,FileId,AssignmentId,SubmittedAtUtc)
          VALUES(@RecipientId,@LastNo+1,@RevisionId,@Body,@FileId,@AssignmentId,SYSUTCDATETIME());
        SET @AttemptId=CAST(SCOPE_IDENTITY() AS bigint);
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        THROW;
    END CATCH
END;
