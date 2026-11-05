/* The m1-e3a8926f52 fixture was inserted before AdmissionDenialAudit migration. */
IF DB_NAME() <> N'DeepSprout_Validation' THROW 51000, 'Wrong validation database', 1;
SET NOCOUNT ON;
SELECT COUNT(*) AS PriorFixtureEmails FROM iam.PersonEmail
WHERE NormalizedEmail LIKE N'm1-e3a8926f52-%@validation.test';
SELECT COUNT(*) AS PriorFixtureMemberships
FROM institution.InitiativeMembership m
JOIN iam.PersonEmail e ON e.PersonId=m.PersonId
WHERE e.NormalizedEmail LIKE N'm1-e3a8926f52-%@validation.test';
