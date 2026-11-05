CREATE OR ALTER TRIGGER lab.TR_InstrumentVersion_Immutable
ON lab.InstrumentVersion AFTER UPDATE, DELETE
AS
BEGIN
    THROW 52001, 'Published instrument version is immutable', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER lab.TR_AssessmentScore_Immutable
ON lab.AssessmentScore AFTER UPDATE, DELETE
AS
BEGIN
    THROW 52002, 'Assessment score is append-only', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER lab.TR_AssessmentResponse_OpenAttempt
ON lab.AssessmentResponse AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN lab.AssessmentAttempt a ON a.Id=i.AttemptId
        WHERE a.Status NOT IN (N'Started',N'Paused'))
       OR EXISTS (SELECT 1 FROM deleted d JOIN lab.AssessmentAttempt a ON a.Id=d.AttemptId
        WHERE a.Status NOT IN (N'Started',N'Paused'))
        THROW 52003, 'Assessment responses are sealed after submission', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER lab.TR_AssessmentAttempt_Transition
ON lab.AssessmentAttempt AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
        WHERE i.Status<>d.Status AND NOT (
          (d.Status=N'Started' AND i.Status IN (N'Paused',N'Submitted',N'Invalid')) OR
          (d.Status=N'Paused' AND i.Status IN (N'Started',N'Submitted',N'Invalid')) OR
          (d.Status=N'Submitted' AND i.Status IN (N'Valid',N'Invalid'))))
        THROW 52004, 'Unsupported assessment attempt transition', 1;
END;
