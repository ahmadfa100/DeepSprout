/* Isolated relational proof for target patterns beyond M1. NOT EXECUTED here.
   Run ONLY in a new disposable SQL Server database. Tables are intentionally
   small proof fixtures under proof schema, not the full 128-table migration.
   Failed writes are elevated test-principal attacks; runtime DML must be denied. */
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT OFF;
GO
CREATE SCHEMA proof AUTHORIZATION dbo;
GO

CREATE TABLE proof.Initiative(Id bigint NOT NULL PRIMARY KEY, Capacity int NOT NULL CHECK(Capacity>0));
CREATE TABLE proof.Program(Id bigint NOT NULL PRIMARY KEY);
CREATE TABLE proof.Member(
 Id bigint NOT NULL PRIMARY KEY, InitiativeId bigint NOT NULL,
 PersonId bigint NOT NULL, Status nvarchar(20) NOT NULL,
 CONSTRAINT FK_ProofMember_Initiative FOREIGN KEY(InitiativeId) REFERENCES proof.Initiative(Id),
 CONSTRAINT UQ_ProofMember_IdInitiative UNIQUE(Id,InitiativeId)
);
CREATE TABLE proof.GroupRoot(
 Id bigint NOT NULL PRIMARY KEY, InitiativeId bigint NULL, ProgramId bigint NULL,
 CONSTRAINT FK_ProofGroup_Initiative FOREIGN KEY(InitiativeId) REFERENCES proof.Initiative(Id),
 CONSTRAINT FK_ProofGroup_Program FOREIGN KEY(ProgramId) REFERENCES proof.Program(Id),
 CONSTRAINT CK_ProofGroup_Xor CHECK ((InitiativeId IS NOT NULL AND ProgramId IS NULL) OR (InitiativeId IS NULL AND ProgramId IS NOT NULL)),
 CONSTRAINT UQ_ProofGroup_IdInitiative UNIQUE(Id,InitiativeId),
 CONSTRAINT UQ_ProofGroup_IdProgram UNIQUE(Id,ProgramId)
);
CREATE TABLE proof.Placement(
 Id bigint NOT NULL PRIMARY KEY, GroupId bigint NOT NULL, InitiativeId bigint NOT NULL, MemberId bigint NOT NULL,
 CONSTRAINT FK_ProofPlacement_Group FOREIGN KEY(GroupId,InitiativeId) REFERENCES proof.GroupRoot(Id,InitiativeId),
 CONSTRAINT FK_ProofPlacement_Member FOREIGN KEY(MemberId,InitiativeId) REFERENCES proof.Member(Id,InitiativeId)
);
CREATE TABLE proof.ProgramMember(
 Id bigint NOT NULL PRIMARY KEY, GroupId bigint NOT NULL, ProgramId bigint NOT NULL, PersonId bigint NOT NULL,
 CONSTRAINT FK_ProofProgramMember_Group FOREIGN KEY(GroupId,ProgramId) REFERENCES proof.GroupRoot(Id,ProgramId)
);
CREATE TABLE proof.Assignment(Id bigint NOT NULL PRIMARY KEY, GroupId bigint NOT NULL REFERENCES proof.GroupRoot(Id));
CREATE TABLE proof.Revision(
 Id bigint NOT NULL PRIMARY KEY, AssignmentId bigint NOT NULL REFERENCES proof.Assignment(Id),
 CONSTRAINT UQ_ProofRevision_IdAssignment UNIQUE(Id,AssignmentId)
);
CREATE TABLE proof.Recipient(
 Id bigint NOT NULL PRIMARY KEY, AssignmentId bigint NOT NULL REFERENCES proof.Assignment(Id),
 PersonId bigint NOT NULL, RevisionId bigint NOT NULL,
 CONSTRAINT FK_ProofRecipient_Revision FOREIGN KEY(RevisionId,AssignmentId) REFERENCES proof.Revision(Id,AssignmentId),
 CONSTRAINT UQ_ProofRecipient_IdAssignment UNIQUE(Id,AssignmentId)
);
CREATE TABLE proof.Attempt(
 Id bigint NOT NULL PRIMARY KEY, RecipientId bigint NOT NULL, AssignmentId bigint NOT NULL, RevisionId bigint NOT NULL,
 AttemptNo int NOT NULL,
 CONSTRAINT FK_ProofAttempt_Recipient FOREIGN KEY(RecipientId,AssignmentId) REFERENCES proof.Recipient(Id,AssignmentId),
 CONSTRAINT FK_ProofAttempt_Revision FOREIGN KEY(RevisionId,AssignmentId) REFERENCES proof.Revision(Id,AssignmentId),
 CONSTRAINT UQ_ProofAttempt_RecipientNo UNIQUE(RecipientId,AttemptNo)
);
CREATE TABLE proof.Review(
 Id bigint NOT NULL PRIMARY KEY, AttemptId bigint NOT NULL REFERENCES proof.Attempt(Id),
 DecisionNo int NOT NULL, ReviewerId bigint NOT NULL, Decision nvarchar(20) NOT NULL,
 CONSTRAINT UQ_ProofReview_AttemptNo UNIQUE(AttemptId,DecisionNo)
);
CREATE TABLE proof.Registration(Id bigint NOT NULL PRIMARY KEY, SessionId bigint NOT NULL, PersonId bigint NOT NULL,
 CONSTRAINT UQ_ProofRegistration_SessionPerson UNIQUE(SessionId,PersonId));
CREATE TABLE proof.Attendance(Id bigint NOT NULL PRIMARY KEY, RegistrationId bigint NOT NULL UNIQUE REFERENCES proof.Registration(Id),
 Fact nvarchar(20) NOT NULL CONSTRAINT CK_ProofAttendance_Fact CHECK(Fact IN(N'Present',N'Late',N'Absent',N'NotRecorded')));
CREATE TABLE proof.Excuse(Id bigint NOT NULL PRIMARY KEY, AttendanceId bigint NOT NULL UNIQUE REFERENCES proof.Attendance(Id),
 Decision nvarchar(20) NOT NULL CONSTRAINT CK_ProofExcuse_Decision CHECK(Decision IN(N'Accepted',N'Rejected')));
CREATE TABLE proof.AttendanceCorrection(Id bigint NOT NULL PRIMARY KEY, AttendanceId bigint NOT NULL REFERENCES proof.Attendance(Id),
 OldFact nvarchar(20) NOT NULL, NewFact nvarchar(20) NOT NULL, Reason nvarchar(200) NOT NULL);
CREATE TABLE proof.Completion(Id bigint NOT NULL PRIMARY KEY, RegistrationId bigint NOT NULL UNIQUE REFERENCES proof.Registration(Id),
 Outcome nvarchar(20) NOT NULL CONSTRAINT CK_ProofCompletion_Outcome CHECK(Outcome IN(N'Completed',N'NotMet')));

CREATE TABLE proof.AdmissionOffer(
 Id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
 InitiativeId bigint NOT NULL REFERENCES proof.Initiative(Id),
 PersonId bigint NOT NULL, Status nvarchar(20) NOT NULL
  CONSTRAINT CK_ProofAdmissionOffer_Status CHECK(Status IN(N'Offered',N'Expired',N'Accepted',N'Declined')),
 ExpiresAtUtc datetime2(3) NOT NULL
);
CREATE UNIQUE INDEX UX_ProofAdmissionOffer_Active ON proof.AdmissionOffer(InitiativeId,PersonId) WHERE Status=N'Offered';

CREATE TABLE proof.Experience(Id bigint NOT NULL PRIMARY KEY, Capacity int NOT NULL CONSTRAINT CK_ProofExperience_Capacity CHECK(Capacity>0));
CREATE TABLE proof.Booking(
 Id bigint NOT NULL PRIMARY KEY, ExperienceId bigint NOT NULL REFERENCES proof.Experience(Id),
 Status nvarchar(20) NOT NULL CONSTRAINT CK_ProofBooking_Status CHECK(Status IN(N'Queued',N'Offered',N'Confirmed',N'Cancelled')),
 CONSTRAINT UQ_ProofBooking_IdExperience UNIQUE(Id,ExperienceId)
);
CREATE TABLE proof.Offer(
 Id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
 ExperienceId bigint NOT NULL, BookingId bigint NOT NULL,
 Status nvarchar(20) NOT NULL CONSTRAINT CK_ProofOffer_Status CHECK(Status IN(N'Offered',N'Accepted',N'Expired',N'Declined')),
 ExpiresAtUtc datetime2(3) NOT NULL,
 CONSTRAINT FK_ProofOffer_Booking FOREIGN KEY(BookingId,ExperienceId) REFERENCES proof.Booking(Id,ExperienceId)
);
CREATE UNIQUE INDEX UX_ProofOffer_OneLive ON proof.Offer(BookingId) WHERE Status=N'Offered';
CREATE INDEX IX_ProofOffer_Holds ON proof.Offer(ExperienceId,Status,ExpiresAtUtc);

CREATE TABLE proof.Evidence(Id bigint NOT NULL PRIMARY KEY, SourceKey nvarchar(80) NOT NULL UNIQUE);
CREATE TABLE proof.Reward(
 Id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY, EvidenceId bigint NOT NULL REFERENCES proof.Evidence(Id),
 BeneficiaryId bigint NOT NULL, EffectCode nvarchar(40) NOT NULL,
 Kind nvarchar(20) NOT NULL CONSTRAINT CK_ProofReward_Kind CHECK(Kind IN(N'Grant',N'Reversal')),
 ReversesRewardId bigint NULL REFERENCES proof.Reward(Id)
);
CREATE UNIQUE INDEX UX_ProofReward_Grant ON proof.Reward(EvidenceId,BeneficiaryId,EffectCode) WHERE Kind=N'Grant';
CREATE UNIQUE INDEX UX_ProofReward_Reversal ON proof.Reward(ReversesRewardId) WHERE ReversesRewardId IS NOT NULL;

CREATE TABLE proof.ResourceGrant(Id bigint NOT NULL PRIMARY KEY, PersonId bigint NOT NULL, ResourceId bigint NOT NULL,
 Status nvarchar(20) NOT NULL CONSTRAINT CK_ProofGrant_Status CHECK(Status IN(N'Active',N'Revoked')));
GO

CREATE OR ALTER PROCEDURE proof.MakeOffer @BookingId bigint, @ExpiresAtUtc datetime2(3)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @experienceId bigint,@capacity int,@status nvarchar(20);
 BEGIN TRY
  BEGIN TRAN;
  SELECT @experienceId=ExperienceId FROM proof.Booking WHERE Id=@BookingId;
  IF @experienceId IS NULL THROW 53001,'Booking missing',1;
  SELECT @capacity=Capacity FROM proof.Experience WITH(UPDLOCK,HOLDLOCK) WHERE Id=@experienceId;
  SELECT @status=Status FROM proof.Booking WITH(UPDLOCK,HOLDLOCK) WHERE Id=@BookingId;
  IF @status<>N'Queued' OR @ExpiresAtUtc<=SYSUTCDATETIME() THROW 53002,'Booking/expiry invalid',1;
  IF ((SELECT COUNT_BIG(*) FROM proof.Booking WHERE ExperienceId=@experienceId AND Status=N'Confirmed')
      +(SELECT COUNT_BIG(*) FROM proof.Offer WHERE ExperienceId=@experienceId AND Status=N'Offered'))>=@capacity
   THROW 53003,'No numeric capacity for offer hold',1;
  INSERT proof.Offer(ExperienceId,BookingId,Status,ExpiresAtUtc) VALUES(@experienceId,@BookingId,N'Offered',@ExpiresAtUtc);
  UPDATE proof.Booking SET Status=N'Offered' WHERE Id=@BookingId;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE proof.HoldAdmissionOffer @InitiativeId bigint,@PersonId bigint,@ExpiresAtUtc datetime2(3)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @capacity int;
 BEGIN TRY
  BEGIN TRAN;
  SELECT @capacity=Capacity FROM proof.Initiative WITH(UPDLOCK,HOLDLOCK) WHERE Id=@InitiativeId;
  IF @capacity IS NULL OR @ExpiresAtUtc<=SYSUTCDATETIME() THROW 53041,'Initiative/expiry invalid',1;
  IF ((SELECT COUNT_BIG(*) FROM proof.Member WHERE InitiativeId=@InitiativeId AND Status IN(N'Accepted',N'Suspended'))
      +(SELECT COUNT_BIG(*) FROM proof.AdmissionOffer WHERE InitiativeId=@InitiativeId AND Status=N'Offered'))>=@capacity
   THROW 53042,'No Initiative capacity for held offer',1;
  INSERT proof.AdmissionOffer(InitiativeId,PersonId,Status,ExpiresAtUtc)
   VALUES(@InitiativeId,@PersonId,N'Offered',@ExpiresAtUtc);
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE proof.AcceptOffer @OfferId bigint
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @experienceId bigint,@bookingId bigint,@expiry datetime2(3),@status nvarchar(20);
 BEGIN TRY
  BEGIN TRAN;
  SELECT @experienceId=ExperienceId FROM proof.Offer WHERE Id=@OfferId;
  IF @experienceId IS NULL THROW 53011,'Offer missing',1;
  SELECT 1 FROM proof.Experience WITH(UPDLOCK,HOLDLOCK) WHERE Id=@experienceId;
  SELECT @bookingId=BookingId,@expiry=ExpiresAtUtc,@status=Status FROM proof.Offer WITH(UPDLOCK,HOLDLOCK) WHERE Id=@OfferId;
  IF @status<>N'Offered' OR @expiry<=SYSUTCDATETIME() THROW 53012,'Offer expired or decided',1;
  UPDATE proof.Offer SET Status=N'Accepted' WHERE Id=@OfferId;
  UPDATE proof.Booking SET Status=N'Confirmed' WHERE Id=@bookingId AND Status=N'Offered';
  IF @@ROWCOUNT<>1 THROW 53013,'Booking state conflict',1;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE proof.ExpireOffer @OfferId bigint
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @experienceId bigint,@bookingId bigint,@expiry datetime2(3),@status nvarchar(20);
 BEGIN TRY
  BEGIN TRAN;
  SELECT @experienceId=ExperienceId FROM proof.Offer WHERE Id=@OfferId;
  IF @experienceId IS NULL THROW 53021,'Offer missing',1;
  SELECT 1 FROM proof.Experience WITH(UPDLOCK,HOLDLOCK) WHERE Id=@experienceId;
  SELECT @bookingId=BookingId,@expiry=ExpiresAtUtc,@status=Status FROM proof.Offer WITH(UPDLOCK,HOLDLOCK) WHERE Id=@OfferId;
  IF @status<>N'Offered' OR @expiry>SYSUTCDATETIME() THROW 53022,'Offer not due for expiry',1;
  UPDATE proof.Offer SET Status=N'Expired' WHERE Id=@OfferId;
  UPDATE proof.Booking SET Status=N'Queued' WHERE Id=@bookingId AND Status=N'Offered';
  IF @@ROWCOUNT<>1 THROW 53023,'Booking state conflict',1;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE proof.AssertScopedRead @PersonId bigint,@ResourceId bigint
AS
BEGIN
 IF NOT EXISTS(SELECT 1 FROM proof.ResourceGrant WHERE PersonId=@PersonId AND ResourceId=@ResourceId AND Status=N'Active')
  THROW 53031,'Current scoped grant required',1;
 SELECT @ResourceId AS AuthorizedResourceId;
END;
GO

/* Negative and preservation checks. */
DECLARE @future datetime2(3)=DATEADD(hour,1,SYSUTCDATETIME());
INSERT proof.Initiative VALUES(1,1),(2,2);
INSERT proof.Program VALUES(10);
INSERT proof.Member VALUES(101,1,501,N'Accepted'),(102,2,502,N'Accepted');
INSERT proof.GroupRoot VALUES(201,1,NULL),(202,2,NULL),(203,NULL,10);
BEGIN TRY
 INSERT proof.GroupRoot VALUES(204,1,10);
 THROW 53101,'FAIL: group accepted two parents',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53101 THROW; IF ERROR_NUMBER()<>547 THROW; PRINT 'PASS: Group XOR'; END CATCH;
BEGIN TRY
 INSERT proof.Placement VALUES(301,201,1,102);
 THROW 53102,'FAIL: cross-Initiative placement accepted',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53102 THROW; IF ERROR_NUMBER()<>547 THROW; PRINT 'PASS: same-Initiative placement FK'; END CATCH;
INSERT proof.Placement VALUES(302,201,1,101);
BEGIN TRY
 INSERT proof.ProgramMember VALUES(303,201,10,503);
 THROW 53113,'FAIL: Program member assigned to Initiative Group',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53113 THROW; IF ERROR_NUMBER()<>547 THROW; PRINT 'PASS: Program membership same-parent FK'; END CATCH;
INSERT proof.ProgramMember VALUES(304,203,10,503);
INSERT proof.Assignment VALUES(401,201),(402,202);
INSERT proof.Revision VALUES(411,401),(412,402);
INSERT proof.Recipient VALUES(421,401,501,411);
BEGIN TRY
 INSERT proof.Attempt VALUES(431,421,401,412,1);
 THROW 53103,'FAIL: cross-Assignment attempt accepted',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53103 THROW; IF ERROR_NUMBER()<>547 THROW; PRINT 'PASS: attempt revision/recipient same Assignment'; END CATCH;
INSERT proof.Attempt VALUES(432,421,401,411,1);
INSERT proof.Review VALUES(441,432,1,601,N'NeedsRevision');
INSERT proof.Review VALUES(442,432,2,602,N'Approved');
IF (SELECT COUNT(*) FROM proof.Review WHERE AttemptId=432)<>2 THROW 53104,'Review history lost',1;
PRINT 'PASS: review correction preserves prior decision/author';

INSERT proof.Registration VALUES(501,701,501);
INSERT proof.Attendance VALUES(502,501,N'Absent');
INSERT proof.Excuse VALUES(503,502,N'Accepted');
IF (SELECT Fact FROM proof.Attendance WHERE Id=502)<>N'Absent' THROW 53105,'Excuse altered factual attendance',1;
INSERT proof.Completion VALUES(505,501,N'NotMet');
IF (SELECT Outcome FROM proof.Completion WHERE Id=505)<>N'NotMet' THROW 53114,'Excuse fabricated completion',1;
INSERT proof.AttendanceCorrection VALUES(504,502,N'Absent',N'Present',N'Authorized correction example');
IF NOT EXISTS(SELECT 1 FROM proof.AttendanceCorrection WHERE Id=504 AND OldFact=N'Absent') THROW 53106,'Correction history missing',1;
PRINT 'PASS: attendance, excuse, completion/correction are separate facts';

BEGIN TRY
 EXEC proof.HoldAdmissionOffer 1,504,@future;
 THROW 53115,'FAIL: Initiative hold exceeded capacity',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53115 THROW; IF ERROR_NUMBER()<>53042 THROW; PRINT 'PASS: accepted member consumes Initiative capacity before offer'; END CATCH;
EXEC proof.HoldAdmissionOffer 2,504,@future;
BEGIN TRY
 EXEC proof.HoldAdmissionOffer 2,505,@future;
 THROW 53116,'FAIL: second hold exceeded Initiative capacity',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53116 THROW; IF ERROR_NUMBER()<>53042 THROW; PRINT 'PASS: Offered hold consumes Initiative capacity'; END CATCH;

INSERT proof.Experience VALUES(801,1);
INSERT proof.Booking VALUES(811,801,N'Queued'),(812,801,N'Queued');
EXEC proof.MakeOffer 811,@future;
DECLARE @offer1 bigint=(SELECT Id FROM proof.Offer WHERE BookingId=811 AND Status=N'Offered');
BEGIN TRY
 EXEC proof.MakeOffer 812,@future;
 THROW 53107,'FAIL: hold overbooked numeric capacity',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53107 THROW; IF ERROR_NUMBER()<>53003 THROW; PRINT 'PASS: held offer consumes capacity'; END CATCH;
/* Test principal ages the deadline; runtime must not update offer terms directly. */
UPDATE proof.Offer SET ExpiresAtUtc=DATEADD(second,-1,SYSUTCDATETIME()) WHERE Id=@offer1;
BEGIN TRY
 EXEC proof.AcceptOffer @offer1;
 THROW 53108,'FAIL: expired offer accepted',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53108 THROW; IF ERROR_NUMBER()<>53012 THROW; PRINT 'PASS: expired offer cannot be accepted'; END CATCH;
EXEC proof.ExpireOffer @offer1;
EXEC proof.MakeOffer 812,@future;
DECLARE @offer2 bigint=(SELECT Id FROM proof.Offer WHERE BookingId=812 AND Status=N'Offered');
EXEC proof.AcceptOffer @offer2;
IF (SELECT COUNT(*) FROM proof.Booking WHERE ExperienceId=801 AND Status=N'Confirmed')<>1 THROW 53109,'Accept did not confirm exactly one booking',1;
PRINT 'PASS: expiry releases hold and next acceptance confirms once';

INSERT proof.Evidence VALUES(901,N'source-901');
INSERT proof.Reward(EvidenceId,BeneficiaryId,EffectCode,Kind) VALUES(901,501,N'TreeDepth',N'Grant');
DECLARE @grant bigint=SCOPE_IDENTITY();
BEGIN TRY
 INSERT proof.Reward(EvidenceId,BeneficiaryId,EffectCode,Kind) VALUES(901,501,N'TreeDepth',N'Grant');
 THROW 53110,'FAIL: duplicate reward grant accepted',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53110 THROW; IF ERROR_NUMBER()<>2601 AND ERROR_NUMBER()<>2627 THROW; PRINT 'PASS: duplicate grant rejected'; END CATCH;
INSERT proof.Reward(EvidenceId,BeneficiaryId,EffectCode,Kind,ReversesRewardId)
VALUES(901,501,N'TreeDepth',N'Reversal',@grant);
BEGIN TRY
 INSERT proof.Reward(EvidenceId,BeneficiaryId,EffectCode,Kind,ReversesRewardId)
 VALUES(901,501,N'TreeDepth',N'Reversal',@grant);
 THROW 53111,'FAIL: duplicate reversal accepted',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53111 THROW; IF ERROR_NUMBER()<>2601 AND ERROR_NUMBER()<>2627 THROW; PRINT 'PASS: duplicate reversal rejected'; END CATCH;

INSERT proof.ResourceGrant VALUES(1001,601,1,N'Active');
EXEC proof.AssertScopedRead 601,1;
UPDATE proof.ResourceGrant SET Status=N'Revoked' WHERE Id=1001;
BEGIN TRY
 EXEC proof.AssertScopedRead 601,1;
 THROW 53112,'FAIL: revoked grant retained read access',1;
END TRY BEGIN CATCH IF ERROR_NUMBER()=53112 THROW; IF ERROR_NUMBER()<>53031 THROW; PRINT 'PASS: current grant revocation denies read'; END CATCH;

/* Separate two-connection runs are still needed for offer accept-vs-expire,
   last-capacity contention and grant revocation vs a long-lived request.
   This one-session script proves constraints/state paths, not race freedom. */
