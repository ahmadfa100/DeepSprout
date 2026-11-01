/* Run AFTER 001 in a disposable SQL Server database, as migration/test principal.
   NOT EXECUTED in this checkout. Expected failures are caught and printed.
   This validates the M1 admission slice only, not all 128 target tables.
   In production, app commands must use restricted runtime principal/procedures. */
SET NOCOUNT ON;
DECLARE @now datetime2(3)=SYSUTCDATETIME();
DECLARE @rep bigint,@p1 bigint,@p2 bigint,@p3 bigint,@p4 bigint,@p5 bigint;
DECLARE @i1 bigint,@i2 bigint,@r1 bigint,@r2 bigint,@a1 bigint,@a2 bigint,@a3 bigint,@a4 bigint,@m1 bigint;
DECLARE @probe uniqueidentifier=NEWID();

INSERT iam.Person(DisplayName,Status) VALUES (N'Representative',N'Active'); SET @rep=SCOPE_IDENTITY();
INSERT iam.Person(DisplayName,Status) VALUES (N'Student One',N'Active'); SET @p1=SCOPE_IDENTITY();
INSERT iam.Person(DisplayName,Status) VALUES (N'Student Two',N'Active'); SET @p2=SCOPE_IDENTITY();
INSERT iam.Person(DisplayName,Status) VALUES (N'Supervisor One',N'Active'); SET @p3=SCOPE_IDENTITY();
INSERT iam.Person(DisplayName,Status) VALUES (N'Supervisor Two',N'Active'); SET @p4=SCOPE_IDENTITY();
INSERT iam.Person(DisplayName,Status) VALUES (N'Supervisor Three',N'Active'); SET @p5=SCOPE_IDENTITY();
DECLARE @p6 bigint;
INSERT iam.Person(DisplayName,Status) VALUES (N'Supervisor Four',N'Active'); SET @p6=SCOPE_IDENTITY();

INSERT iam.PersonEmail(PersonId,NormalizedEmail,Status,VerifiedAtUtc,IsPrimary)
VALUES (@p3,N'sup1@example.invalid',N'Verified',@now,1),
       (@p4,N'sup2@example.invalid',N'Verified',@now,1),
       (@p5,N'sup3@example.invalid',N'Verified',@now,1),
       (@p6,N'sup4@example.invalid',N'Verified',@now,1);

INSERT institution.Institution(Name,Status,CountryCode) VALUES (N'Test Institution',N'Verified','JO');
DECLARE @org bigint=SCOPE_IDENTITY();
INSERT institution.RepresentativeMembership(InstitutionId,PersonId,Status,GrantedByPersonId)
VALUES (@org,@rep,N'Active',@rep);

BEGIN TRY
 INSERT institution.Initiative(InstitutionId,Title,Mode,Status,Capacity,TimeZoneId)
 VALUES(@org,N'Invalid cap',N'Online',N'Draft',136,N'Asia/Amman');
 THROW 52013,'FAIL: Initiative cap 136 accepted',1;
END TRY BEGIN CATCH
 IF ERROR_NUMBER()=52013 THROW;
 IF ERROR_NUMBER()<>547 THROW;
 PRINT 'PASS: SQL CHECK rejects Initiative capacity 136';
END CATCH;

/* Capacity 1 makes the race boundary easy to inspect. The production maximum is
   separately enforced by CK_Initiative_Capacity (1..135). The chosen cutoff below
   is only an example of the unresolved 120-hour interpretation. */
INSERT institution.Initiative(InstitutionId,Title,Mode,Status,Capacity,TimeZoneId,StartsAtUtc,EndsAtUtc,WithdrawalCutoffAtUtc)
VALUES(@org,N'Initiative A',N'Online',N'Published',1,N'Asia/Amman',DATEADD(day,10,@now),DATEADD(day,20,@now),DATEADD(day,5,@now));
SET @i1=SCOPE_IDENTITY();
INSERT institution.Initiative(InstitutionId,Title,Mode,Status,Capacity,TimeZoneId,StartsAtUtc,EndsAtUtc,WithdrawalCutoffAtUtc)
VALUES(@org,N'Initiative B',N'Online',N'Published',1,N'Asia/Amman',DATEADD(day,4,@now),DATEADD(day,14,@now),DATEADD(day,-1,@now));
SET @i2=SCOPE_IDENTITY();
INSERT institution.InitiativeRevision(InitiativeId,RevisionNo,Summary,AudienceCode,CostKind,CompletionPolicyRef,PublishedAtUtc)
VALUES(@i1,1,N'Published terms A',N'General',N'Free',N'policy-test',@now); SET @r1=SCOPE_IDENTITY();
INSERT institution.InitiativeRevision(InitiativeId,RevisionNo,Summary,AudienceCode,CostKind,CompletionPolicyRef,PublishedAtUtc)
VALUES(@i2,1,N'Published terms B',N'General',N'Free',N'policy-test',@now); SET @r2=SCOPE_IDENTITY();

INSERT institution.InitiativeApplication(InitiativeId,PersonId,AttemptNo,TermsRevisionId,Status,SubmittedAtUtc)
VALUES(@i1,@p1,1,@r1,N'Pending',@now); SET @a1=SCOPE_IDENTITY();
INSERT institution.InitiativeApplication(InitiativeId,PersonId,AttemptNo,TermsRevisionId,Status,SubmittedAtUtc)
VALUES(@i1,@p2,1,@r1,N'Pending',@now); SET @a2=SCOPE_IDENTITY();
INSERT institution.InitiativeApplication(InitiativeId,PersonId,AttemptNo,TermsRevisionId,Status,SubmittedAtUtc)
VALUES(@i2,@p1,1,@r2,N'Pending',@now); SET @a3=SCOPE_IDENTITY();

EXEC institution.ApproveApplication @a1,@rep,@probe;
SELECT @m1=Id FROM institution.InitiativeMembership WHERE ApplicationId=@a1;
IF @m1 IS NULL THROW 52001,'Approval did not create membership',1;
IF (SELECT COUNT(*) FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@a1 AND Action=N'Approved')<>1
 THROW 52002,'Approval decision missing',1;
PRINT 'PASS: one approval creates membership and append-only decision';

BEGIN TRY
 EXEC institution.ApproveApplication @a2,@rep,@probe;
 THROW 52003,'FAIL: second person exceeded Initiative capacity',1;
END TRY BEGIN CATCH
 IF ERROR_NUMBER()=52003 THROW;
 IF ERROR_NUMBER()<>51007 THROW;
 PRINT 'PASS: capacity one rejects second accepted student';
END CATCH;

BEGIN TRY
 EXEC institution.ApproveApplication @a3,@rep,@probe;
 THROW 52004,'FAIL: one person obtained two effective memberships',1;
END TRY BEGIN CATCH
 IF ERROR_NUMBER()=52004 THROW;
 IF ERROR_NUMBER()<>51006 AND ERROR_NUMBER()<>2601 AND ERROR_NUMBER()<>2627 THROW;
 PRINT 'PASS: second Initiative cannot accept same effective student';
END CATCH;

/* Direct DML proves the filtered unique index, independently of the procedure.
   It is executed only by this elevated disposable test principal. */
BEGIN TRY
 INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc)
 VALUES(@i2,@a3,@p1,N'Accepted',@now,DATEADD(day,-1,@now));
 THROW 52005,'FAIL: filtered unique index allowed two effective memberships',1;
END TRY BEGIN CATCH
 IF ERROR_NUMBER()=52005 THROW;
 IF ERROR_NUMBER()<>2601 AND ERROR_NUMBER()<>2627 THROW;
 PRINT 'PASS: filtered unique index blocks direct second effective membership';
END CATCH;

/* Wrong application/person pairing fails composite FK even if each Person exists. */
BEGIN TRY
 INSERT institution.InitiativeMembership(InitiativeId,ApplicationId,PersonId,Status,AcceptedAtUtc,WithdrawalCutoffAtUtc)
 VALUES(@i2,@a3,@p2,N'Accepted',@now,DATEADD(day,-1,@now));
 THROW 52006,'FAIL: membership detached from application person',1;
END TRY BEGIN CATCH
 IF ERROR_NUMBER()=52006 THROW;
 IF ERROR_NUMBER()<>547 THROW;
 PRINT 'PASS: composite FK binds membership to application person and Initiative';
END CATCH;

EXEC institution.WithdrawAcceptedMembership @m1,@p1,@probe;
IF EXISTS (SELECT 1 FROM institution.InitiativeMembership WHERE Id=@m1 AND (Status<>N'Withdrawn' OR EndedAtUtc IS NULL OR CapacityReleasedAtUtc IS NULL))
 THROW 52007,'Precutoff withdrawal did not end/release claim',1;
IF (SELECT COUNT(*) FROM institution.InitiativeApplicationDecision WHERE ApplicationId=@a1 AND Action=N'Approved')<>1
 THROW 52008,'Application approval decision was overwritten',1;
IF NOT EXISTS(SELECT 1 FROM ops.AuditEvent a JOIN institution.InitiativeMembership m
 ON a.ResourcePublicId=m.PublicId WHERE m.Id=@m1 AND a.ResourceKind=N'InitiativeMembership'
 AND a.Action=N'WithdrawMembership' AND a.BeforeStatus=N'Accepted' AND a.AfterStatus=N'Withdrawn')
 THROW 52015,'Membership withdrawal history missing',1;
PRINT 'PASS: voluntary pre-cutoff withdrawal ends claim; application decision and membership audit remain';

EXEC institution.ApproveApplication @a2,@rep,@probe;
PRINT 'PASS: released claim permits next eligible approval';
EXEC institution.ApproveApplication @a3,@rep,@probe;
DECLARE @m3 bigint=(SELECT Id FROM institution.InitiativeMembership WHERE ApplicationId=@a3);
BEGIN TRY
 EXEC institution.WithdrawAcceptedMembership @m3,@p1,@probe;
 THROW 52009,'FAIL: late voluntary withdrawal succeeded',1;
END TRY BEGIN CATCH
 IF ERROR_NUMBER()=52009 THROW;
 IF ERROR_NUMBER()<>51023 THROW;
 PRINT 'PASS: cutoff prevents late ordinary voluntary withdrawal';
END CATCH;

/* A Pending application can be withdrawn regardless of Initiative start date. */
INSERT institution.InitiativeApplication(InitiativeId,PersonId,AttemptNo,TermsRevisionId,Status,SubmittedAtUtc)
VALUES(@i2,@p2,1,@r2,N'Pending',@now); SET @a4=SCOPE_IDENTITY();
EXEC institution.WithdrawPendingApplication @a4,@p2,@probe;
IF NOT EXISTS(SELECT 1 FROM institution.InitiativeApplication WHERE Id=@a4 AND Status=N'Withdrawn')
 THROW 52010,'Pending withdrawal failed',1;
PRINT 'PASS: Pending application withdrawal is independent of five-day cutoff';

CREATE USER proof_runtime WITHOUT LOGIN;
ALTER ROLE deepsprout_runtime ADD MEMBER proof_runtime;
EXECUTE AS USER = 'proof_runtime';
IF HAS_PERMS_BY_NAME('institution.InitiativeMembership','OBJECT','INSERT')<>0
 THROW 52014,'FAIL: runtime role can bypass capacity procedure',1;
REVERT;
PRINT 'PASS: runtime role lacks direct INSERT on capacity-bearing membership';

DECLARE @s1 bigint,@s2 bigint,@s3 bigint,@s4 bigint;
INSERT institution.InitiativeStaffInvitation(InitiativeId,NormalizedEmail,[Role],TokenHash,ExpiresAtUtc,Status,InvitedByPersonId)
VALUES(@i1,N'sup1@example.invalid',N'Supervisor',0x01,DATEADD(day,2,@now),N'Pending',@rep); SET @s1=SCOPE_IDENTITY();
INSERT institution.InitiativeStaffInvitation(InitiativeId,NormalizedEmail,[Role],TokenHash,ExpiresAtUtc,Status,InvitedByPersonId)
VALUES(@i1,N'sup2@example.invalid',N'Supervisor',0x02,DATEADD(day,2,@now),N'Pending',@rep); SET @s2=SCOPE_IDENTITY();
INSERT institution.InitiativeStaffInvitation(InitiativeId,NormalizedEmail,[Role],TokenHash,ExpiresAtUtc,Status,InvitedByPersonId)
VALUES(@i1,N'sup3@example.invalid',N'Supervisor',0x03,DATEADD(day,2,@now),N'Pending',@rep); SET @s3=SCOPE_IDENTITY();
INSERT institution.InitiativeStaffInvitation(InitiativeId,NormalizedEmail,[Role],TokenHash,ExpiresAtUtc,Status,InvitedByPersonId)
VALUES(@i1,N'sup4@example.invalid',N'Supervisor',0x04,DATEADD(day,2,@now),N'Pending',@rep); SET @s4=SCOPE_IDENTITY();
EXEC institution.AcceptSupervisorInvitation @s1,@p3,@probe;
EXEC institution.AcceptSupervisorInvitation @s2,@p4,@probe;
EXEC institution.AcceptSupervisorInvitation @s3,@p5,@probe;
BEGIN TRY
 EXEC institution.AcceptSupervisorInvitation @s4,@p6,@probe;
 THROW 52011,'FAIL: fourth active Supervisor accepted',1;
END TRY BEGIN CATCH
 IF ERROR_NUMBER()=52011 THROW;
 IF ERROR_NUMBER()<>51034 THROW;
 PRINT 'PASS: fourth active Supervisor denied';
END CATCH;
BEGIN TRY
 EXEC institution.AcceptSupervisorInvitation @s4,@p1,@probe;
 THROW 52012,'FAIL: wrong-email invitation accepted',1;
END TRY BEGIN CATCH
 IF ERROR_NUMBER()=52012 THROW;
 IF ERROR_NUMBER()<>51033 AND ERROR_NUMBER()<>51034 THROW;
 PRINT 'PASS: wrong-email acceptance denied (also at three-person cap)';
END CATCH;

/* Exact approved Initiative cap: 135 approvals succeed; the 136th remains
   Pending. This is sequential, not the separate two-connection race gate. */
DECLARE @i135 bigint,@r135 bigint,@n int=1,@student135 bigint,@app135 bigint;
INSERT institution.Initiative(InstitutionId,Title,Mode,Status,Capacity,TimeZoneId,StartsAtUtc,EndsAtUtc,WithdrawalCutoffAtUtc)
VALUES(@org,N'Exact cap 135',N'Online',N'Published',135,N'Asia/Amman',DATEADD(day,10,@now),DATEADD(day,20,@now),DATEADD(day,5,@now));
SET @i135=SCOPE_IDENTITY();
INSERT institution.InitiativeRevision(InitiativeId,RevisionNo,Summary,AudienceCode,CostKind,CompletionPolicyRef,PublishedAtUtc)
VALUES(@i135,1,N'Published terms',N'General',N'Free',N'policy-test',@now);
SET @r135=SCOPE_IDENTITY();
WHILE @n<=135
BEGIN
 INSERT iam.Person(DisplayName,Status) VALUES(CONCAT(N'Cap student ',@n),N'Active');
 SET @student135=SCOPE_IDENTITY();
 INSERT institution.InitiativeApplication(InitiativeId,PersonId,AttemptNo,TermsRevisionId,Status,SubmittedAtUtc)
 VALUES(@i135,@student135,1,@r135,N'Pending',@now);
 SET @app135=SCOPE_IDENTITY();
 EXEC institution.ApproveApplication @app135,@rep,@probe;
 SET @n+=1;
END;
INSERT iam.Person(DisplayName,Status) VALUES(N'Cap student 136',N'Active');
SET @student135=SCOPE_IDENTITY();
INSERT institution.InitiativeApplication(InitiativeId,PersonId,AttemptNo,TermsRevisionId,Status,SubmittedAtUtc)
VALUES(@i135,@student135,1,@r135,N'Pending',@now);
SET @app135=SCOPE_IDENTITY();
BEGIN TRY
 EXEC institution.ApproveApplication @app135,@rep,@probe;
 THROW 52016,'FAIL: 136th accepted student passed cap',1;
END TRY BEGIN CATCH
 IF ERROR_NUMBER()=52016 THROW;
 IF ERROR_NUMBER()<>51007 THROW;
 PRINT 'PASS: 135 accepted, 136th rejected by locked count';
END CATCH;
IF (SELECT COUNT(*) FROM institution.InitiativeMembership WHERE InitiativeId=@i135 AND CapacityReleasedAtUtc IS NULL)<>135
 THROW 52017,'Exact 135 capacity count mismatch',1;

/* A real concurrency check needs two SQL connections: with capacity 1, start
   ApproveApplication for two Pending people at the same moment. One commits,
   the other gets 51007. For cross-Initiative same-person approval, one commits
   and the other gets 51006 or 2601/2627. For Supervisor fourth-vs-third,
   one commits and the other gets 51034. Do not call this single-session proof
   a concurrency test. */
