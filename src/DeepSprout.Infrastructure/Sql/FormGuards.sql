CREATE OR ALTER TRIGGER forms.TR_FormVersion_Immutable
ON forms.FormVersion AFTER UPDATE, DELETE
AS BEGIN THROW 67001, 'Form version is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER forms.TR_FormQuestion_Immutable
ON forms.FormQuestion AFTER UPDATE, DELETE
AS BEGIN THROW 67002, 'Form question version is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER forms.TR_FormQuestionOption_Immutable
ON forms.FormQuestionOption AFTER UPDATE, DELETE
AS BEGIN THROW 67003, 'Form option version is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER forms.TR_FormResponse_Guard
ON forms.FormResponse AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.PersonId<>d.PersonId OR i.FormVersionId<>d.FormVersionId
          OR (d.Status IN (N'Submitted',N'Withdrawn') AND i.Status<>d.Status))
       THROW 67004, 'Submitted Form response owner and terminal state are immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.FormVersion v ON v.Id=i.FormVersionId
       JOIN forms.Form f ON f.Id=v.FormId
       WHERE i.Status=N'Submitted' AND NOT EXISTS (SELECT 1 FROM deleted d WHERE d.Id=i.Id AND d.Status=N'Submitted')
         AND (i.SubmittedAtUtc IS NULL OR i.ConsentAtUtc IS NULL OR f.Status<>N'Published'
              OR SYSUTCDATETIME()<v.OpensAtUtc OR SYSUTCDATETIME()>=v.ClosesAtUtc))
       THROW 67005, 'Form submission requires consent and an open published form version', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.FormQuestion q ON q.FormVersionId=i.FormVersionId AND q.Required=1
       WHERE i.Status=N'Submitted' AND NOT EXISTS (SELECT 1 FROM deleted d WHERE d.Id=i.Id AND d.Status=N'Submitted')
         AND NOT EXISTS (SELECT 1 FROM forms.FormAnswer a WHERE a.ResponseId=i.Id AND a.QuestionId=q.Id
             AND (a.TextValue IS NOT NULL OR a.NumberValue IS NOT NULL OR a.ChoiceCode IS NOT NULL
                  OR a.FileId IS NOT NULL OR EXISTS (SELECT 1 FROM forms.FormAnswerChoice c WHERE c.AnswerId=a.Id))))
       THROW 67006, 'Required Form question has no answer', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER forms.TR_FormAnswer_Guard
ON forms.FormAnswer AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted d JOIN forms.FormResponse r ON r.Id=d.ResponseId WHERE r.Status<>N'Draft')
       THROW 67007, 'Submitted Form answers are immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.FormResponse r ON r.Id=i.ResponseId
       LEFT JOIN files.SecureFile f ON f.Id=i.FileId
       WHERE r.Status<>N'Draft' OR (i.FileId IS NOT NULL AND (f.OwnerPersonId IS NULL OR f.OwnerPersonId<>r.PersonId))
          OR (i.ChoiceCode IS NOT NULL AND NOT EXISTS (SELECT 1 FROM forms.FormQuestionOption o
               WHERE o.QuestionId=i.QuestionId AND o.OptionCode=i.ChoiceCode)))
       THROW 67008, 'Form answer must be draft, use owned file, and match selected option', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER forms.TR_FormAnswerChoice_Guard
ON forms.FormAnswerChoice AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted d JOIN forms.FormAnswer a ON a.Id=d.AnswerId
       JOIN forms.FormResponse r ON r.Id=a.ResponseId WHERE r.Status<>N'Draft')
       THROW 67009, 'Submitted Form answer choices are immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.FormAnswer a ON a.Id=i.AnswerId
       JOIN forms.FormResponse r ON r.Id=a.ResponseId
       WHERE r.Status<>N'Draft' OR a.TextValue IS NOT NULL OR a.NumberValue IS NOT NULL
          OR a.ChoiceCode IS NOT NULL OR a.FileId IS NOT NULL)
       THROW 67010, 'Multiple choice requires an empty draft scalar answer', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER forms.TR_CompetitionCriterion_Immutable
ON forms.CompetitionCriterion AFTER UPDATE, DELETE
AS BEGIN THROW 67011, 'Competition criterion version is immutable', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER forms.TR_CompetitionEntry_Guard
ON forms.CompetitionEntry AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Id=i.Id
       WHERE i.CompetitionId<>d.CompetitionId OR i.PersonId<>d.PersonId OR i.EntryNo<>d.EntryNo)
       THROW 67012, 'Competition entry owner is immutable', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN forms.Competition c ON c.Id=i.CompetitionId
       LEFT JOIN files.SecureFile f ON f.Id=i.FileId
       WHERE (i.FileId IS NOT NULL AND (f.OwnerPersonId IS NULL OR f.OwnerPersonId<>i.PersonId))
          OR (NOT EXISTS (SELECT 1 FROM deleted d WHERE d.Id=i.Id) AND
              (c.Status<>N'Published' OR SYSUTCDATETIME()<c.OpensAtUtc OR SYSUTCDATETIME()>=c.ClosesAtUtc)))
       THROW 67013, 'Competition entry requires open competition and owned file', 1;
END;
-- BATCH
CREATE OR ALTER TRIGGER forms.TR_CompetitionJudgment_Immutable
ON forms.CompetitionJudgment AFTER UPDATE, DELETE
AS BEGIN THROW 67014, 'Competition judgment is append-only', 1; END;
-- BATCH
CREATE OR ALTER TRIGGER forms.TR_CompetitionCriterionScore_Immutable
ON forms.CompetitionCriterionScore AFTER UPDATE, DELETE
AS BEGIN THROW 67015, 'Competition criterion score is append-only', 1; END;
